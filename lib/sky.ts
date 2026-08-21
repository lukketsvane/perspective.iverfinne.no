/**
 * Where the sun actually is, and what the sky over you is actually doing.
 *
 * The tool's key light has always been two numbers you drag - a bearing and a
 * height above the horizon - and that is the right control for a drawing: you
 * put the light where the drawing needs it. It is the wrong control for a
 * QUESTION, and the question people keep asking of a perspective tool is not
 * "what does 286 degrees at 14 look like", it is "what will this look like
 * here, at four o'clock, in October".
 *
 * So this module answers that one. It is two separate things that only make
 * sense together:
 *
 *   solarPosition   where the sun is, from a place and a moment. Astronomy,
 *                   not a guess - the NOAA low-precision equations, good to a
 *                   hundredth of a degree over any date this tool will see.
 *   sunlight        how bright and how warm that sun is at that height, and
 *                   what the cloud between you and it does to both.
 *
 * IT WAS THREE. The third asked a public forecast what the sky over your own
 * street was really doing, hour by hour, and read the answer back into the
 * cover, the deck and the wind - and the only door into it was the pin that
 * took the device's own fix. With that pin gone the forecast had nothing to
 * ask about but Greenwich, so it went with it, and the weather is one axis
 * somebody sets by hand again. Nothing in this tool now makes a network
 * request or asks the browser where it is.
 *
 * Nothing here touches the store or the scene. It takes numbers and gives
 * numbers back, which is what makes it the one piece of this feature that can
 * be reasoned about on paper.
 */

const RAD = Math.PI / 180;

/**
 * How far off a directional light is placed. It has no bearing on how it
 * lights anything - a directional light is a direction - but it does decide
 * where the shadow camera's near and far planes have to sit around it.
 */
export const SUN_DISTANCE = 60;

/**
 * Where a bearing and a height above the horizon put a light.
 *
 * The scene's own convention, spelled out in SolarPosition below: zero is
 * +Z and ninety is +X, which with -Z read as north makes zero south and
 * ninety east.
 */
export const sunPosition = (azimuth: number, elevation: number): [number, number, number] => {
  const a = azimuth * RAD;
  const e = elevation * RAD;
  const flat = Math.cos(e) * SUN_DISTANCE;
  return [Math.sin(a) * flat, Math.sin(e) * SUN_DISTANCE, Math.cos(a) * flat];
};

/** Days between the Unix epoch and J2000.0, the epoch the equations use. */
const J2000 = 2451545.0;
const UNIX_JULIAN = 2440587.5;

export interface SolarPosition {
  /**
   * The bearing, in the scene's own convention rather than a compass's.
   *
   * The scene is a right-handed Y-up space and the app's `sunPosition` places
   * a light at (sin a, sin e, cos a) - so a bearing of zero puts the sun on
   * +Z and ninety puts it on +X. Calling -Z north and +X east, which is the
   * ordinary way to lay a map into this space, that makes zero SOUTH and
   * ninety EAST. A compass azimuth runs the other way round from the other
   * end, hence the reflection at the bottom of solarPosition: this is not an
   * arbitrary offset, it is the one place the two conventions are reconciled,
   * and getting it wrong puts every shadow in the scene on the wrong side of
   * every object at every hour but noon.
   */
  azimuth: number;
  /** Degrees above the horizon. Negative at night, which is a real answer. */
  elevation: number;
}

/**
 * Where the sun stands over a place at a moment.
 *
 * The NOAA low-precision algorithm, which is a handful of polynomials in days
 * since J2000 and is accurate to about a hundredth of a degree for a century
 * either side of it. Refraction is deliberately not modelled: it lifts the
 * disc about half a degree at the horizon, which matters to a navigator and
 * not at all to where a shadow falls.
 */
export const solarPosition = (at: Date, latitude: number, longitude: number): SolarPosition => {
  const days = at.getTime() / 86400000 + UNIX_JULIAN - J2000;

  // The sun's place on the ecliptic: mean anomaly, mean longitude, and the
  // first two terms of the equation of centre that turns one into the other.
  const anomaly = (357.529 + 0.98560028 * days) * RAD;
  const meanLongitude = (280.459 + 0.98564736 * days) * RAD;
  const ecliptic =
    meanLongitude + (1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * RAD;

  // ...turned onto the equator, which is what an observer on a spinning ball
  // needs: right ascension and declination.
  const obliquity = (23.439 - 0.00000036 * days) * RAD;
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(ecliptic), Math.cos(ecliptic));
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(ecliptic));

  // How far the earth has turned since the sun crossed this meridian.
  const siderealHours = 18.697374558 + 24.06570982441908 * days;
  const localSidereal = ((siderealHours % 24) + 24) % 24 + longitude / 15;
  const hourAngle = localSidereal * 15 * RAD - rightAscension;

  const lat = latitude * RAD;
  const elevation =
    Math.asin(
      Math.sin(declination) * Math.sin(lat) +
        Math.cos(declination) * Math.cos(lat) * Math.cos(hourAngle)
    ) / RAD;

  // Measured from due south, running west - the natural output of the two
  // arguments below - and then read back into the scene's bearing.
  const fromSouth =
    Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat)
    ) / RAD;

  return { azimuth: ((-fromSouth % 360) + 360) % 360, elevation };
};

/**
 * How strong and how warm the sun is at a given height, under a given sky.
 *
 * Two effects, and they are separate. The first is the AIR: light at ten
 * degrees has come through five times the atmosphere light at ninety has, so
 * it is dimmer and it is redder, which is the whole of why a low sun looks the
 * way it does. The second is the CLOUD: a covered sky loses most of the direct
 * beam and what is left is neutral rather than warm, because the reddening
 * happens along a path the cloud has already scattered.
 *
 * The numbers are fitted by eye against the tool's own exposure rather than
 * measured in lux - what matters here is that noon reads as noon and six
 * o'clock reads as six o'clock on this renderer, at the intensities the panel
 * already offers.
 */
export const sunlight = (elevation: number, cover: number) => {
  if (elevation <= 0) {
    // Night. Not black: the sky after sunset is a large dim blue source, and a
    // scene with literally no light in it is a scene nobody can check.
    const depth = Math.min(1, -elevation / 12);
    return {
      intensity: 0.5 * (1 - depth * 0.8) * (1 - cover * 0.5),
      temperature: 9500 + depth * 1500,
    };
  }
  // Air mass, the Kasten-Young approximation, normalised so overhead is 1.
  const air =
    1 / (Math.sin(elevation * RAD) + 0.50572 * Math.pow(elevation + 6.07995, -1.6364));
  const clear = Math.max(0, 1.06 * Math.pow(0.72, Math.pow(air, 0.678)));
  // Cloud takes the beam down but never quite out - an overcast day still has
  // a direction to its light, and a scene lit from nowhere reads as a mistake.
  const through = 1 - cover * 0.82;
  return {
    intensity: 11 * clear * through,
    // Redder through more air, and pulled back toward daylight by cloud.
    temperature: (2000 + 4700 * Math.pow(clear, 0.45)) * (1 - cover * 0.25) + cover * 1500,
  };
};

/**
 * WHERE THE STARS ARE, which is a rotation and nothing else.
 *
 * A star field that is a texture pasted on a dome is a wallpaper: it does not
 * turn, it does not know what latitude it is at, and the pole is wherever the
 * artist put it. This tool already knows the place and the moment, so it can
 * do the real thing for the cost of one matrix.
 *
 * The whole of it: the celestial sphere turns once a sidereal day about an
 * axis that points north and stands at an altitude equal to your latitude. So
 * build the rotation that takes the scene's own frame to a frame whose +Y is
 * that axis, spin it by the local sidereal time, and hash the stars in THAT
 * frame. Everything else follows for free and correctly - Polaris sits at your
 * latitude, stars rise in the east and set in the west, the pole is overhead at
 * the pole and on the horizon at the equator, and at Bergen in January the
 * winter sky is the winter sky.
 *
 * Greenwich mean sidereal time is the same polynomial the solar position uses,
 * which is why it is here and not somewhere with its own copy of the epoch.
 */
export const siderealAngle = (at: Date, longitude: number) => {
  const days = at.getTime() / 86400000 + UNIX_JULIAN - J2000;
  const hours = 18.697374558 + 24.06570982441908 * days;
  const local = (((hours % 24) + 24) % 24) + longitude / 15;
  return (local / 24) * Math.PI * 2;
};
