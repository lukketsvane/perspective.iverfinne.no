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
 * So this module answers that one. It is three separate things that only make
 * sense together:
 *
 *   solarPosition   where the sun is, from a place and a moment. Astronomy,
 *                   not a guess - the NOAA low-precision equations, good to a
 *                   hundredth of a degree over any date this tool will see.
 *   sunlight        how bright and how warm that sun is at that height, and
 *                   what the cloud between you and it does to both.
 *   conditions      what the sky over that place is really doing, fetched
 *                   from a public forecast and read hour by hour.
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

/* ------------------------------------------------------------- the weather */

/** What the sky over a place was doing at one hour. */
export interface Conditions {
  /** Fraction of the sky covered, 0 to 1. */
  cover: number;
  /** How high the deck sits, in metres - read off which layer dominates. */
  base: number;
  /** Metres per second at ten metres up. */
  wind: number;
  /** The bearing the wind comes FROM, in the scene's convention. */
  windBearing: number;
  /** The hour these readings describe, in epoch milliseconds. */
  at: number;
}

/**
 * An hourly series for one place, kept so the hours can be read without
 * asking again.
 *
 * A scrub across a day is a hundred changes of hour, and a request per hour
 * would be a hundred requests for a forecast that was already in the first
 * reply. One fetch covers two days back and three forward, which is every
 * moment the panel can reach in one sweep of its date knob.
 */
interface Series {
  latitude: number;
  longitude: number;
  fetchedAt: number;
  hours: Conditions[];
}

let series: Series | null = null;

/** How far a cached series may be from the place being asked about, in degrees. */
const NEAR = 0.25;

/** And how old it may be before it is asked for again. */
export const SERIES_LIFE = 30 * 60 * 1000;

const layerBase = (low: number, mid: number, high: number) => {
  // Whichever deck is thickest is the one you see the underside of.
  if (low >= mid && low >= high) return 900;
  if (mid >= high) return 3200;
  return 7000;
};

/**
 * Ask the forecast what the sky over a place is doing.
 *
 * Open-Meteo, because it needs no key, allows the request straight from a
 * browser, and answers in plain hourly arrays. Everything the tool asks for is
 * a documented core variable - a request for something exotic comes back as a
 * column of nulls rather than an error, which is the sort of failure that
 * looks like a working feature.
 *
 * Nothing here throws for the caller to handle: a sky the network cannot
 * describe is not an error condition, it is a sky you set by hand.
 */
export const fetchConditions = async (
  latitude: number,
  longitude: number
): Promise<boolean> => {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}` +
    '&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_direction_10m' +
    '&wind_speed_unit=ms&past_days=2&forecast_days=3&timezone=UTC';

  const reply = await fetch(url, { headers: { accept: 'application/json' } });
  if (!reply.ok) return false;
  const body = (await reply.json()) as {
    hourly?: {
      time?: string[];
      cloud_cover?: (number | null)[];
      cloud_cover_low?: (number | null)[];
      cloud_cover_mid?: (number | null)[];
      cloud_cover_high?: (number | null)[];
      wind_speed_10m?: (number | null)[];
      wind_direction_10m?: (number | null)[];
    };
  };
  const hourly = body.hourly;
  if (!hourly?.time?.length) return false;

  const number = (column: (number | null)[] | undefined, index: number, fallback: number) => {
    const value = column?.[index];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };

  const hours = hourly.time.map((stamp, index) => {
    const low = number(hourly.cloud_cover_low, index, 0);
    const mid = number(hourly.cloud_cover_mid, index, 0);
    const high = number(hourly.cloud_cover_high, index, 0);
    return {
      cover: Math.min(1, Math.max(0, number(hourly.cloud_cover, index, 0) / 100)),
      base: layerBase(low, mid, high),
      wind: Math.max(0, number(hourly.wind_speed_10m, index, 4)),
      // A meteorological bearing is degrees clockwise from north; the scene
      // counts the other way from south. Same reflection as the sun's.
      windBearing: ((180 - number(hourly.wind_direction_10m, index, 270)) % 360 + 360) % 360,
      // The API is asked for UTC and answers without a zone marker, which
      // Date would otherwise read as local time - a silent error of up to
      // twelve hours, in the one number the whole feature is indexed by.
      at: Date.parse(`${stamp}Z`),
    };
  });

  series = { latitude, longitude, fetchedAt: Date.now(), hours };
  return hours.length > 0;
};

/** Whether the readings held cover this place and are still worth trusting. */
export const haveConditions = (latitude: number, longitude: number, now = Date.now()) =>
  series !== null &&
  Math.abs(series.latitude - latitude) < NEAR &&
  Math.abs(series.longitude - longitude) < NEAR &&
  now - series.fetchedAt < SERIES_LIFE;

/**
 * What the sky was doing at a moment, off the series already held.
 *
 * The nearest hour rather than an interpolation. Cloud cover is not a
 * continuous quantity you can average between two readings and still have
 * something true - half four's eight oktas and half five's two do not make
 * five oktas at five to five, they make a sky that cleared - and the sun moves
 * far more in an hour than the weather does.
 */
export const conditionsAt = (when: number): Conditions | null => {
  if (!series || series.hours.length === 0) return null;
  let nearest = series.hours[0];
  for (const hour of series.hours) {
    if (Math.abs(hour.at - when) < Math.abs(nearest.at - when)) nearest = hour;
  }
  // Past the ends of the series is not "the last hour we have" - it is a
  // moment nothing was fetched for, and saying otherwise would show a Tuesday
  // sky over a Saturday.
  return Math.abs(nearest.at - when) > 90 * 60 * 1000 ? null : nearest;
};

/** Throw away everything held - a different place, or a manual override. */
export const forgetConditions = () => {
  series = null;
};

/* -------------------------------------------------------------- the place */

export interface Place {
  latitude: number;
  longitude: number;
}

/**
 * Where the device thinks it is.
 *
 * A permission prompt, so it is only ever asked for on a press. Low accuracy
 * on purpose: the sun's bearing changes by a degree over sixty miles, and a
 * coarse fix arrives in a second off the network where a fine one spins up the
 * radio and takes half a minute to answer the same question.
 */
export const deviceLocation = (): Promise<Place> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser will not say where it is.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (fix) => resolve({ latitude: fix.coords.latitude, longitude: fix.coords.longitude }),
      (failure) => reject(new Error(failure.message)),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 }
    );
  });
