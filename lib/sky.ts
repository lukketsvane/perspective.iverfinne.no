/**
 * Where the sun, the moon and the stars actually are.
 *
 * Everything in here is arithmetic on a date and a place. Nothing draws; the
 * shaders in components/SkyDome.tsx do that, and they take what this works out.
 *
 * WHY BOTHER BEING RIGHT ABOUT IT.
 *
 * Because the question an illustrator asks about light is never "which way
 * shall I point the lamp". It is "it is four in the afternoon in October and I
 * am facing the fjord - where is the sun, how long are the shadows, and what
 * colour is the light". A bearing knob answers none of that; a date, an hour
 * and a latitude answer all three at once, and they answer them the same way
 * the world does, which means the answer is checkable against a window.
 *
 * It also makes the sun and the stars ONE fact rather than two. Set the clock
 * to three in the morning and the sun is under the horizon because it is under
 * the horizon, and the sky is full of the stars that are really up at that
 * hour, turned to the angle they are really turned to. Nothing here is
 * decorative and nothing had to be kept in step by hand.
 *
 * THE FRAME THE APP DRAWS IN. `sunPosition` in components/Scene.tsx puts a
 * bearing of zero along +Z and a bearing of ninety along +X, with +Y up. So
 * world x is east, world y is up, world z is north, and everything below lands
 * in that frame.
 *
 * Accuracy: the sun to about a hundredth of a degree, the moon to about a
 * third of one - half its own width - which is the standard low-precision pair
 * out of Meeus and the Astronomical Almanac. Both are far finer than anything a
 * drawing can hold, and the moon's PHASE, which is what you would actually
 * draw, comes out of the elongation and is right to a per cent.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Degrees, brought back into 0-360. */
const wrap = (deg: number) => ((deg % 360) + 360) % 360;

const sinDeg = (deg: number) => Math.sin(deg * RAD);
const cosDeg = (deg: number) => Math.cos(deg * RAD);

/** Where the sky is looked at from, and when. */
export interface Standpoint {
  /** Degrees north. Polaris stands this far above the horizon. */
  latitude: number;
  /** Degrees east. */
  longitude: number;
  /** Day of the year, 1 to 366. */
  day: number;
  /**
   * The hour, as the SUN keeps it rather than as a railway does.
   *
   * Twelve is local noon at whatever longitude you have said you are at, so
   * the sun is due south (north, below the equator) and as high as it will get
   * that day. A time zone is an administrative rectangle laid over that, an
   * hour wide and sometimes shifted for the summer, and it would put the sun
   * somewhere slightly else for reasons that have nothing to do with drawing.
   */
  hour: number;
}

/**
 * The year the sky is worked out for.
 *
 * Fixed, and it does not matter: precession moves a star about fifty arc
 * seconds a year, which is a pixel a century. What a year DOES change is the
 * moon, and the moon on the eighteenth of a given August is a real moon on a
 * real night - which is the honest answer to "what phase is it", and better
 * than a phase knob that shows a moon nobody ever saw.
 */
const YEAR = 2026;

/** Days from the start of the year to the start of each month, in a common year. */
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

/** A day of the year said the way a calendar says it. */
export const dateName = (day: number) => {
  const at = Math.max(1, Math.min(365, Math.round(day)));
  let month = 11;
  while (month > 0 && MONTH_START[month] >= at) month--;
  return `${at - MONTH_START[month]}. ${MONTHS[month]}`;
};

/** The hour said the way a clock says it. */
export const clockName = (hour: number) => {
  const total = Math.round(((hour % 24) + 24) % 24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Julian day, from a day of the year and an hour of universal time.
 *
 * The one number every ephemeris is written against: days, counted straight
 * through without months, since noon on the first of January 4713 BC.
 */
export const julianDay = (day: number, universalHour: number) => {
  // 1 January of YEAR at 00:00 UT, by the standard Gregorian sum.
  const a = Math.floor((14 - 1) / 12);
  const y = YEAR + 4800 - a;
  const m = 1 + 12 * a - 3;
  const start =
    1 + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return start - 0.5 + (day - 1) + universalHour / 24;
};

/** Universal time for a standpoint, the hour being the sun's own. */
export const universalHour = (where: Standpoint) => where.hour - where.longitude / 15;

/**
 * Greenwich mean sidereal time, in degrees.
 *
 * Sidereal time is which right ascension is currently overhead - the sky's own
 * clock, which runs about four minutes a day fast against the sun's, because a
 * year's worth of those four minutes is one extra turn.
 */
export const siderealDegrees = (jd: number) => {
  const d = jd - 2451545.0;
  return wrap(280.46061837 + 360.98564736629 * d);
};

export interface Equatorial {
  /** Right ascension, degrees. */
  ra: number;
  /** Declination, degrees. */
  dec: number;
}

/**
 * The sun, to a hundredth of a degree.
 *
 * Mean longitude, mean anomaly, the equation of the centre to two terms, and
 * the obliquity of the ecliptic. Four lines of astronomy that have been the
 * same four lines since Kepler.
 */
export const sunAt = (jd: number): Equatorial => {
  const n = jd - 2451545.0;
  const meanLongitude = wrap(280.46 + 0.9856474 * n);
  const anomaly = wrap(357.528 + 0.9856003 * n);
  const ecliptic = meanLongitude + 1.915 * sinDeg(anomaly) + 0.02 * sinDeg(2 * anomaly);
  const tilt = 23.439 - 0.0000004 * n;
  const ra = wrap(Math.atan2(cosDeg(tilt) * sinDeg(ecliptic), cosDeg(ecliptic)) * DEG);
  const dec = Math.asin(sinDeg(tilt) * sinDeg(ecliptic)) * DEG;
  return { ra, dec };
};

/** The moon, and how far round it has got from the sun. */
export interface Moon extends Equatorial {
  /**
   * How much of the disc is lit, 0 at new and 1 at full.
   *
   * This is what you would draw. The rest of the moon's arithmetic decides
   * where it is; this decides what shape it is.
   */
  lit: number;
}

/**
 * The moon, by the abridged series in the Astronomical Almanac.
 *
 * Seven terms of longitude and four of latitude, which is a third of a degree.
 * The full theory is several hundred terms and buys nothing anybody draws.
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

  // How far round the sky the moon has got from the sun. Zero is new, a
  // half turn is full, and the lit fraction is the cosine half-angle.
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
  /** Compass bearing, degrees, north through east - the app's own convention. */
  azimuth: number;
  /** Degrees above the horizon. Negative is under the ground. */
  elevation: number;
}

/** An equatorial position, said as a bearing and a height above the horizon. */
export const aimOf = (at: Equatorial, where: Standpoint, jd: number): Aim => {
  const hourAngle = siderealDegrees(jd) + where.longitude - at.ra;
  const sinDec = sinDeg(at.dec);
  const cosDec = cosDeg(at.dec);
  const sinLat = sinDeg(where.latitude);
  const cosLat = cosDeg(where.latitude);
  const height = sinDec * sinLat + cosDec * cosLat * cosDeg(hourAngle);
  const north = sinDec * cosLat - cosDec * sinLat * cosDeg(hourAngle);
  const east = -cosDec * sinDeg(hourAngle);
  return {
    azimuth: wrap(Math.atan2(east, north) * DEG),
    elevation: Math.asin(Math.max(-1, Math.min(1, height))) * DEG,
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
export const equatorialToWorld = (where: Standpoint, jd: number): number[] => {
  const spin = (siderealDegrees(jd) + where.longitude) * RAD;
  const cosSpin = Math.cos(spin);
  const sinSpin = Math.sin(spin);
  const sinLat = sinDeg(where.latitude);
  const cosLat = cosDeg(where.latitude);

  /*
   * Row by row, in world terms. Working in the frame the hour angle is
   * measured in - x on the meridian, z on the pole - the sky's east is that
   * frame's y, up is the pole tilted by the latitude, and north is what is
   * left over. Composing that with the spin gives these nine.
   */
  const row = [
    [-sinSpin, cosSpin, 0],
    [cosLat * cosSpin, cosLat * sinSpin, sinLat],
    [-sinLat * cosSpin, -sinLat * sinSpin, cosLat],
  ];
  // Column-major: down each column of the matrix above.
  return [
    row[0][0], row[1][0], row[2][0],
    row[0][1], row[1][1], row[2][1],
    row[0][2], row[1][2], row[2][2],
  ];
};
