/**
 * The colour of the air, worked out rather than picked.
 *
 * WHY THE SKY IS BLUE, IN THE ONLY FORM THAT IS ANY USE TO A DRAWING: sunlight
 * comes in white, air scatters short wavelengths about sixteen times as
 * strongly as long ones, so a ray of daylight that never came from the sun's
 * direction at all still reaches your eye - and it is blue, because that is the
 * part that got turned. At sunset the direct beam has to cross forty times as
 * much air to reach you, the blue is scattered out of it long before it
 * arrives, and what is left is red. The same one number does both.
 *
 * This is a single-scattering integral: march along the view ray, and at each
 * step ask how much sunlight reaches that point and how much of what scatters
 * there survives the trip back. Rayleigh for the molecules, Mie for the dust,
 * their two phase functions, one exponential density profile each. It is the
 * standard cheap model and it is genuinely a MODEL - turn the air off and you
 * get a black sky and an unreddened sun, because there is nothing left to
 * scatter, not because a switch somewhere said "space".
 *
 * WRITTEN TWICE, DELIBERATELY.
 *
 * Once in GLSL, which draws it, and once in TypeScript, which does not. Three
 * things off the screen need to know what colour the air is: the fog that eats
 * distance, the sky light that fills the shadows, and the sun's own colour as
 * it reddens. Those are three directions, not a million pixels - a few hundred
 * iterations, once, when something changes - and reading them back off the GPU
 * would mean stalling the pipeline to fetch six bytes. So the integral is here
 * in both languages, deliberately line for line, and the constants they share
 * are written once and pasted into the shader source. If one changes, change
 * the other; there is nothing else in this file.
 */
import * as THREE from 'three';

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

/**
 * The same numbers again, as a GLSL preamble.
 *
 * Pasted into the shader rather than passed as uniforms: every one of them is
 * a property of air, not a setting, and a uniform is a thing somebody can turn.
 */
export const ATMOSPHERE_GLSL = /* glsl */ `
const float GROUND = ${GROUND}.0;
const float TOP = ${TOP}.0;
const vec3 RAYLEIGH = vec3(${RAYLEIGH[0]}, ${RAYLEIGH[1]}, ${RAYLEIGH[2]});
const float MIE = ${MIE};
const float RAYLEIGH_HEIGHT = ${RAYLEIGH_HEIGHT}.0;
const float MIE_HEIGHT = ${MIE_HEIGHT}.0;
const float MIE_G = ${MIE_G};
const float SUN_POWER = ${SUN_POWER}.0;
const int VIEW_STEPS = ${VIEW_STEPS};
const int LIGHT_STEPS = ${LIGHT_STEPS};
const float EYE = ${EYE};

/**
 * Where a ray enters and leaves a sphere about the origin. Near root first.
 *
 * A ray that misses comes back with the far root BEHIND the near one, which is
 * the one thing that cannot happen to a real pair - so hits() is the test, and
 * it is a named function because reading the near root alone gets it wrong in
 * the one case that matters most. A ray from high in the air toward a sun just
 * under the horizon MISSES the earth, which is exactly the ray that carries
 * twilight; read as a hit, the sky goes black the moment the sun goes down.
 */
vec2 shell(vec3 from, vec3 dir, float radius) {
  float b = dot(from, dir);
  float c = dot(from, from) - radius * radius;
  float d = b * b - c;
  if (d < 0.0) return vec2(1.0, -1.0);
  d = sqrt(d);
  return vec2(-b - d, -b + d);
}

bool hits(vec2 roots) { return roots.y > roots.x; }

/**
 * The light arriving along one direction, out of air of a given thickness.
 *
 * \`air\` is how many sea-level atmospheres there are: one is the real thing,
 * zero is a vacuum, and everything between is a haze knob that behaves.
 */
vec3 airLight(vec3 dir, vec3 sun, float air) {
  if (air <= 0.0) return vec3(0.0);
  vec3 from = vec3(0.0, GROUND + EYE, 0.0);
  vec2 top = shell(from, dir, TOP);
  if (top.y <= 0.0) return vec3(0.0);
  float far = top.y;
  // A ray aimed under the horizon stops in the ground, and what you see along
  // it is only the air between here and there - which is the haze that makes a
  // distant hill pale, and the reason the horizon is the brightest part of a
  // clear sky.
  vec2 earth = shell(from, dir, GROUND);
  if (hits(earth) && earth.x > 0.0) far = min(far, earth.x);

  /*
   * The steps get longer as they go out, rather than being all the same.
   *
   * A ray along the horizon crosses a hundred kilometres of atmosphere, and
   * essentially all of the haze in it is in the first few. Sixteen even steps
   * put the first sample three kilometres up and miss that entirely - which
   * showed as a horizon that got DARKER as the air was thickened, when a
   * thickening horizon is the one thing everybody has seen. Squaring the
   * spacing spends half the samples in the first quarter of the ray.
   */
  vec3 gatheredRayleigh = vec3(0.0);
  float gatheredMie = 0.0;
  float depthRayleigh = 0.0;
  float depthMie = 0.0;

  for (int i = 0; i < VIEW_STEPS; i++) {
    float near = float(i) / float(VIEW_STEPS);
    float away = float(i + 1) / float(VIEW_STEPS);
    float from0 = far * near * near;
    float to0 = far * away * away;
    float step = to0 - from0;
    vec3 at = from + dir * (from0 + step * 0.5);
    float height = length(at) - GROUND;
    float dRayleigh = exp(-height / RAYLEIGH_HEIGHT) * step;
    float dMie = exp(-height / MIE_HEIGHT) * step;
    depthRayleigh += dRayleigh;
    depthMie += dMie;

    // ...and back out along the beam to the sun. A sample the earth stands in
    // front of gets nothing, which is what makes twilight fall rather than
    // linger: after sundown only the high air is still lit.
    vec2 lit = shell(at, sun, TOP);
    float lightStep = lit.y / float(LIGHT_STEPS);
    float along = 0.0;
    float lightRayleigh = 0.0;
    float lightMie = 0.0;
    vec2 shadow = shell(at, sun, GROUND);
    bool blocked = hits(shadow) && shadow.x > 0.0;
    for (int j = 0; j < LIGHT_STEPS; j++) {
      vec3 spot = at + sun * (along + lightStep * 0.5);
      float lightHeight = length(spot) - GROUND;
      lightRayleigh += exp(-lightHeight / RAYLEIGH_HEIGHT) * lightStep;
      lightMie += exp(-lightHeight / MIE_HEIGHT) * lightStep;
      along += lightStep;
    }
    if (!blocked) {
      vec3 through = exp(
        -air * (MIE * (lightMie + depthMie) + RAYLEIGH * (lightRayleigh + depthRayleigh))
      );
      gatheredRayleigh += dRayleigh * through;
      gatheredMie += dMie * through.g;
    }
  }

  float mu = dot(dir, sun);
  float rayleighPhase = 3.0 / (16.0 * 3.14159265) * (1.0 + mu * mu);
  float g2 = MIE_G * MIE_G;
  float miePhase = 3.0 / (8.0 * 3.14159265) * ((1.0 - g2) * (mu * mu + 1.0)) /
    (pow(1.0 + g2 - 2.0 * mu * MIE_G, 1.5) * (2.0 + g2));
  return SUN_POWER * air *
    (rayleighPhase * RAYLEIGH * gatheredRayleigh + miePhase * MIE * gatheredMie);
}

/** What is left of the direct beam by the time it gets here. */
vec3 sunThrough(vec3 sun, float air) {
  vec3 from = vec3(0.0, GROUND + EYE, 0.0);
  // Under the horizon first, and only then the vacuum: with no air there is
  // nothing to dim the beam, so without this a sun that had set went on
  // shining at full strength through the ground.
  vec2 shadow = shell(from, sun, GROUND);
  if (hits(shadow) && shadow.x > 0.0) return vec3(0.0);
  if (air <= 0.0) return vec3(1.0);
  vec2 lit = shell(from, sun, TOP);
  float step = lit.y / float(LIGHT_STEPS * 2);
  float along = 0.0;
  float depthRayleigh = 0.0;
  float depthMie = 0.0;
  for (int j = 0; j < LIGHT_STEPS * 2; j++) {
    float height = length(from + sun * (along + step * 0.5)) - GROUND;
    depthRayleigh += exp(-height / RAYLEIGH_HEIGHT) * step;
    depthMie += exp(-height / MIE_HEIGHT) * step;
    along += step;
  }
  return exp(-air * (RAYLEIGH * depthRayleigh + MIE * depthMie));
}
`;

// ---------------------------------------------------------------- the same, here

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

/**
 * What is left of the direct beam by the time it gets here.
 *
 * This is the sun's own colour, and it is not a preference: a sun ten degrees
 * up has crossed about five times as much air as one overhead, so the blue is
 * gone out of it and what lands on the side of a box is orange. Multiply the
 * lamp by this and sunset lighting comes out on its own.
 */
export const sunThrough = (sun: Triple, air: number): Triple => {
  const from: Triple = [0, GROUND + EYE, 0];
  const shadow = shell(from, sun, GROUND);
  if (hits(shadow) && shadow[0] > 0) return [0, 0, 0];
  if (air <= 0) return [1, 1, 1];
  const lit = shell(from, sun, TOP);
  const steps = LIGHT_STEPS * 2;
  const step = lit[1] / steps;
  let along = 0;
  let depthRayleigh = 0;
  let depthMie = 0;
  for (let j = 0; j < steps; j++) {
    const height = length3(walk(from, sun, along + step * 0.5)) - GROUND;
    depthRayleigh += Math.exp(-height / RAYLEIGH_HEIGHT) * step;
    depthMie += Math.exp(-height / MIE_HEIGHT) * step;
    along += step;
  }
  return [0, 1, 2].map((k) => Math.exp(-air * (RAYLEIGH[k] * depthRayleigh + MIE * depthMie))) as Triple;
};

/**
 * A black body at a temperature, as a colour.
 *
 * It lives here because it is the same question the rest of this file asks -
 * what colour is this light - and because two things need it: the lamps, and
 * the sun, whose beam is this multiplied by whatever the air leaves of it.
 */
export const temperatureColor = (kelvin: number) => {
  const t = Math.min(12000, Math.max(1000, kelvin)) / 100;
  const red = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const green =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.044792731;
  return new THREE.Color(red / 255, green / 255, blue / 255);
};

/** A bearing and a height above the horizon, as a unit vector in world axes. */
export const aimVector = (azimuth: number, elevation: number): Triple => {
  const a = (azimuth * Math.PI) / 180;
  const e = (elevation * Math.PI) / 180;
  const flat = Math.cos(e);
  return [Math.sin(a) * flat, Math.sin(e), Math.cos(a) * flat];
};
