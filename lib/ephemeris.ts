/**
 * The rest of the sky: the stars where they really are, and the moon.
 *
 * lib/sky.ts answers where the SUN is from a place and a moment, and what the
 * weather over that place is doing. This is the other half of the same
 * question and it is kept apart for one reason: the sun is a light, and these
 * two are not. Nothing in here casts a shadow anybody draws by. What they are
 * for is the sky itself - which, in a tool about perspective, is not scenery.
 *
 * WHY A REAL SKY MATTERS HERE. The stars are the one thing in the world with
 * no perspective in them at all. Everything else the tool draws converges, gets
 * smaller, has a vanishing point. They do none of it: walk a mile and not one
 * of them moves by a hair, and the whole sphere turns rigidly overhead without
 * any figure in it changing shape. Having a cube with a vanishing point and a
 * sky with none on the same screen is the clearest statement of what
 * perspective IS that this tool can make - and it is only worth anything if the
 * sky is checkable. A field of invented stars is a claim nobody can test.
 *
 * Accuracy: the moon to about a third of a degree, half its own width, by the
 * abridged series in the Astronomical Almanac. The full theory is several
 * hundred terms and buys nothing anybody draws. Its PHASE, which is the part
 * you would actually draw, comes out of the elongation and is right to a per
 * cent.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const wrap = (deg: number) => ((deg % 360) + 360) % 360;
const sinDeg = (deg: number) => Math.sin(deg * RAD);
const cosDeg = (deg: number) => Math.cos(deg * RAD);

/** Julian day from a moment: the number every ephemeris is written against. */
export const julianDay = (at: Date) => at.getTime() / 86400000 + 2440587.5;

export interface Equatorial {
  /** Right ascension, degrees. */
  ra: number;
  /** Declination, degrees. */
  dec: number;
}

/** The sun, to a hundredth of a degree - for the moon's phase, not for light. */
const sunAt = (jd: number): Equatorial => {
  const n = jd - 2451545.0;
  const meanLongitude = wrap(280.46 + 0.9856474 * n);
  const anomaly = wrap(357.528 + 0.9856003 * n);
  const ecliptic = meanLongitude + 1.915 * sinDeg(anomaly) + 0.02 * sinDeg(2 * anomaly);
  const tilt = 23.439 - 0.0000004 * n;
  return {
    ra: wrap(Math.atan2(cosDeg(tilt) * sinDeg(ecliptic), cosDeg(ecliptic)) * DEG),
    dec: Math.asin(sinDeg(tilt) * sinDeg(ecliptic)) * DEG,
  };
};

export interface Moon extends Equatorial {
  /**
   * How much of the disc is lit, 0 at new and 1 at full.
   *
   * This is what you would draw. The rest of the arithmetic decides where it
   * is; this decides what shape it is.
   */
  lit: number;
}

/**
 * The moon, by the abridged series in the Astronomical Almanac.
 *
 * Seven terms of longitude and four of latitude, which is a third of a degree.
 */
export const moonAt = (jd: number): Moon => {
  const t = (jd - 2451545.0) / 36525;
  const longitude =
    218.32 +
    481267.881 * t +
    6.29 * sinDeg(135.0 + 477198.87 * t) -
    1.27 * sinDeg(259.3 - 413335.36 * t) +
    0.66 * sinDeg(235.7 + 890534.22 * t) +
    0.21 * sinDeg(269.9 + 954397.74 * t) -
    0.19 * sinDeg(357.5 + 35999.05 * t) -
    0.11 * sinDeg(186.5 + 966404.03 * t);
  const latitude =
    5.13 * sinDeg(93.3 + 483202.02 * t) +
    0.28 * sinDeg(228.2 + 960400.89 * t) -
    0.28 * sinDeg(318.3 + 6003.15 * t) -
    0.17 * sinDeg(217.6 - 407332.21 * t);

  const tilt = 23.439 - 0.0000004 * (jd - 2451545.0);
  const sinL = sinDeg(longitude);
  const cosL = cosDeg(longitude);
  const sinB = sinDeg(latitude);
  const cosB = cosDeg(latitude);
  const ra = wrap(Math.atan2(sinL * cosDeg(tilt) - (sinB / cosB) * sinDeg(tilt), cosL) * DEG);
  const dec = Math.asin(sinB * cosDeg(tilt) + cosB * sinDeg(tilt) * sinL) * DEG;

  // How far round the sky it has got from the sun. Zero is new, half a turn is
  // full, and the lit fraction is the cosine of the half angle.
  const sun = sunAt(jd);
  const elongation =
    Math.acos(
      Math.max(
        -1,
        Math.min(1, sinDeg(sun.dec) * sinDeg(dec) + cosDeg(sun.dec) * cosDeg(dec) * cosDeg(sun.ra - ra))
      )
    ) * DEG;
  return { ra, dec, lit: (1 - cosDeg(elongation)) / 2 };
};

/** Where something at these coordinates stands, from here, right now. */
export interface Aim {
  /**
   * The bearing, in the scene's convention rather than a compass's.
   *
   * Zero is +Z and ninety is +X, and with -Z read as north that makes zero
   * SOUTH - the same reconciliation lib/sky.ts spells out at length for the
   * sun, and the same reason: getting it wrong puts everything in the sky on
   * the opposite side of the meridian at every hour but midnight.
   */
  azimuth: number;
  /** Degrees above the horizon. Negative is under the ground. */
  elevation: number;
}

/**
 * An equatorial position, said as a bearing and a height above the horizon.
 *
 * `sidereal` is which right ascension is currently on the meridian, in
 * radians - lib/sky.ts works it out from the moment and the longitude.
 */
export const aimOf = (at: Equatorial, latitude: number, sidereal: number): Aim => {
  const hourAngle = sidereal * DEG - at.ra;
  const sinDec = sinDeg(at.dec);
  const cosDec = cosDeg(at.dec);
  const sinLat = sinDeg(latitude);
  const cosLat = cosDeg(latitude);
  const east = -cosDec * sinDeg(hourAngle);
  const north = sinDec * cosLat - cosDec * sinLat * cosDeg(hourAngle);
  return {
    // atan2(east, -north): a bearing measured from +Z, which is south.
    azimuth: wrap(Math.atan2(east, -north) * DEG),
    elevation:
      Math.asin(
        Math.max(-1, Math.min(1, sinDec * sinLat + cosDec * cosLat * cosDeg(hourAngle)))
      ) * DEG,
  };
};

/**
 * The rotation that carries the catalogue onto the sky over your head.
 *
 * One 3x3 matrix, so eight thousand stars are turned by the vertex shader for
 * the price of one uniform. It is two turns composed: about the celestial pole
 * by the sidereal time, which is the sky's daily spin, and then by the
 * co-latitude, which is the tilt that puts the pole where it belongs - at your
 * own latitude above the northern horizon.
 *
 * Column-major, ready for THREE.Matrix3.fromArray.
 */
export const equatorialToWorld = (latitude: number, sidereal: number): number[] => {
  const cosSpin = Math.cos(sidereal);
  const sinSpin = Math.sin(sidereal);
  const sinLat = sinDeg(latitude);
  const cosLat = cosDeg(latitude);

  /*
   * Row by row, in world terms. Working in the frame the hour angle is
   * measured in - x on the meridian, z on the pole - the sky's east is that
   * frame's y, up is the pole tilted by the latitude, and north is what is
   * left over. Composing that with the spin gives these nine.
   */
  const row = [
    [-sinSpin, cosSpin, 0],
    [cosLat * cosSpin, cosLat * sinSpin, sinLat],
    // Negated against the obvious form, because north in this scene is -Z.
    [sinLat * cosSpin, sinLat * sinSpin, -cosLat],
  ];
  // Column-major: down each column of the matrix above.
  return [
    row[0][0], row[1][0], row[2][0],
    row[0][1], row[1][1], row[2][1],
    row[0][2], row[1][2], row[2][2],
  ];
};
