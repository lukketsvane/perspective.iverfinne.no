/**
 * The colour of the air, worked out rather than picked.
 *
 * WHY THE SKY IS BLUE, IN THE ONLY FORM THAT IS ANY USE TO A DRAWING: sunlight
 * comes in white, air scatters short wavelengths about sixteen times as
 * strongly as long ones, so a ray of daylight that never came from the sun's
 * direction at all still reaches your eye - and it is blue, because that is
 * the part that got turned. At sunset the direct beam has to cross forty times
 * as much air to reach you, the blue is scattered out of it long before it
 * arrives, and what is left is red. The same one number does both.
 *
 * This is a single-scattering integral: march along a ray, and at each step
 * ask how much sunlight reaches that point and how much of what scatters there
 * survives the trip back. Rayleigh for the molecules, Mie for the dust, their
 * two phase functions, one exponential density profile each.
 *
 * NOTHING HERE DRAWS THE SKY. The dome is Preetham's, in components/Sky.tsx,
 * and it is tuned. This answers the one question the dome cannot be asked
 * because the answer is needed off the screen: what colour is the haze that
 * eats the far end of the picture. That is four directions rather than a
 * million pixels - a few hundred iterations, once, when something changes -
 * and reading it back off the card would mean stalling the whole pipeline to
 * fetch three bytes.
 *
 * (What is left of the BEAM is the same integral asked along one more
 * direction, and it is not here because lib/sky.ts already answers it: its
 * `sunlight` runs the air mass through Kasten and Young and hands back a
 * colour temperature, which is the same physics arriving by the road a
 * photographer would take.)
 */

/** Metres. The earth, and the top of the air. */
const GROUND = 6371000;
const TOP = 6471000;

/**
 * How strongly a metre of sea-level air turns each colour.
 *
 * Blue is scattered about four times as hard as red, which is the whole of
 * why the sky is the colour it is and why the sun sets the colour it does.
 */
const RAYLEIGH: [number, number, number] = [5.5e-6, 13.0e-6, 22.4e-6];
/** Dust, haze and water droplets: colourless, and thrown mostly forwards. */
const MIE = 21e-6;
/** How fast each thins with height, in metres. Dust hugs the ground. */
const RAYLEIGH_HEIGHT = 8000;
const MIE_HEIGHT = 1200;
/** How forward-thrown the Mie lobe is. This is the halo round the sun. */
const MIE_G = 0.758;
/** How bright the sun is, in whatever units make the sky land near one. */
const SUN_POWER = 22;

/** Steps along the view ray, and along the ray back to the sun from each. */
const VIEW_STEPS = 16;
const LIGHT_STEPS = 8;

/** The eye, a person's height up. */
const EYE = 1.7;

type Triple = [number, number, number];

/** A pair of roots is a real crossing only when the far one is further off. */
const hits = (roots: [number, number]) => roots[1] > roots[0];

const shell = (from: Triple, dir: Triple, radius: number): [number, number] => {
  const b = from[0] * dir[0] + from[1] * dir[1] + from[2] * dir[2];
  const c = from[0] * from[0] + from[1] * from[1] + from[2] * from[2] - radius * radius;
  const d = b * b - c;
  if (d < 0) return [1, -1];
  const root = Math.sqrt(d);
  return [-b - root, -b + root];
};

const walk = (from: Triple, dir: Triple, at: number): Triple => [
  from[0] + dir[0] * at,
  from[1] + dir[1] * at,
  from[2] + dir[2] * at,
];

const length3 = (v: Triple) => Math.hypot(v[0], v[1], v[2]);

/** The GLSL above, in TypeScript. Keep them the same. */
export const airLight = (dir: Triple, sun: Triple, air: number): Triple => {
  if (air <= 0) return [0, 0, 0];
  const from: Triple = [0, GROUND + EYE, 0];
  const top = shell(from, dir, TOP);
  if (top[1] <= 0) return [0, 0, 0];
  let far = top[1];
  const earth = shell(from, dir, GROUND);
  if (hits(earth) && earth[0] > 0) far = Math.min(far, earth[0]);

  const gatheredRayleigh: Triple = [0, 0, 0];
  let gatheredMie = 0;
  let depthRayleigh = 0;
  let depthMie = 0;

  for (let i = 0; i < VIEW_STEPS; i++) {
    const near = i / VIEW_STEPS;
    const away = (i + 1) / VIEW_STEPS;
    const start = far * near * near;
    const step = far * away * away - start;
    const at = walk(from, dir, start + step * 0.5);
    const height = length3(at) - GROUND;
    const dRayleigh = Math.exp(-height / RAYLEIGH_HEIGHT) * step;
    const dMie = Math.exp(-height / MIE_HEIGHT) * step;
    depthRayleigh += dRayleigh;
    depthMie += dMie;

    const lit = shell(at, sun, TOP);
    const lightStep = lit[1] / LIGHT_STEPS;
    let along = 0;
    let lightRayleigh = 0;
    let lightMie = 0;
    const shadow = shell(at, sun, GROUND);
    const blocked = hits(shadow) && shadow[0] > 0;
    for (let j = 0; j < LIGHT_STEPS; j++) {
      const lightHeight = length3(walk(at, sun, along + lightStep * 0.5)) - GROUND;
      lightRayleigh += Math.exp(-lightHeight / RAYLEIGH_HEIGHT) * lightStep;
      lightMie += Math.exp(-lightHeight / MIE_HEIGHT) * lightStep;
      along += lightStep;
    }
    if (!blocked) {
      const green = Math.exp(
        -air * (MIE * (lightMie + depthMie) + RAYLEIGH[1] * (lightRayleigh + depthRayleigh))
      );
      for (let k = 0; k < 3; k++) {
        gatheredRayleigh[k] +=
          dRayleigh *
          Math.exp(-air * (MIE * (lightMie + depthMie) + RAYLEIGH[k] * (lightRayleigh + depthRayleigh)));
      }
      gatheredMie += dMie * green;
    }
  }

  const mu = dir[0] * sun[0] + dir[1] * sun[1] + dir[2] * sun[2];
  const rayleighPhase = (3 / (16 * Math.PI)) * (1 + mu * mu);
  const g2 = MIE_G * MIE_G;
  const miePhase =
    ((3 / (8 * Math.PI)) * ((1 - g2) * (mu * mu + 1))) /
    (Math.pow(1 + g2 - 2 * mu * MIE_G, 1.5) * (2 + g2));
  return [0, 1, 2].map(
    (k) => SUN_POWER * air * (rayleighPhase * RAYLEIGH[k] * gatheredRayleigh[k] + miePhase * MIE * gatheredMie)
  ) as Triple;
};

/** A bearing and a height above the horizon, as a unit vector in world axes. */
export const aimVector = (azimuth: number, elevation: number): Triple => {
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  const flat = Math.cos(e);
  return [Math.sin(a) * flat, Math.sin(e), Math.cos(a) * flat];
};
