import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky as SkyDome } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import type { SunState } from '../types';
import { siderealAngle, solarPosition, sunPosition } from '../lib/sky';

/**
 * The sky the scene stands under: air, sun, and a deck of real cloud.
 *
 * There was a sky before this and it was one line of drei's atmosphere driven
 * off the light's two knobs. It was honest about what it was - "deliberately
 * only air and sunlight: no clouds" - and what that produced was a gradient.
 * A gradient is a backdrop. It tells you nothing about the hour, it never
 * changes while you look at it, and the one thing it cannot do is the thing
 * anybody puts a sky behind a building FOR: say what the light will actually
 * be doing.
 *
 * So there is weather in it now, and the weather is the real weather. What is
 * drawn here is three layers deep:
 *
 *   the air      Rayleigh and Mie scattering, from drei, aimed by the sun's
 *                real position rather than by a knob
 *   the deck     a cloud layer at its real height, covering the real fraction
 *                of the sky, drifting on the real wind
 *   the light    which is the Sun component's business, not this file's -
 *                but it is driven from the same place and the same moment,
 *                which is what stops the shadows disagreeing with the sky
 *
 * THE DECK IS NOT A TEXTURE AND NOT A BILLBOARD SYSTEM. The ready-made answer
 * is drei's Clouds, which is sprites and wants a puff image fetched from a
 * CDN - a network dependency inside an app that is meant to open from the home
 * screen on a train. And sprites are the wrong shape for this anyway. What is
 * here is a shader on the inside of a dome, and every pixel of it asks one
 * question: follow this ray out to the height the cloud base is at, and see
 * what is there. That is what makes the deck read as a PLANE overhead - the
 * puffs get smaller and crowd together toward the horizon because they are
 * further away, which is the perspective this whole tool is about, and no
 * arrangement of sprites on a dome will do it.
 */

/** How far out the dome sits. Inside the camera's 2000 m far plane. */
const DOME = 1400;

/** How wide one puff is on the deck, in metres. */
const PUFF = 900;

const CLOUD_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/*
 * The deck.
 *
 * Value noise rather than gradient noise, five octaves of it, and the shape
 * comes out of the COVERAGE THRESHOLD rather than out of the noise: a sky
 * that is a quarter covered is the noise above its top quartile, and the
 * fraction of the field that survives the threshold is the fraction of the
 * sky that is white. That is the one property that makes "sixty per cent
 * cover" mean sixty per cent cover, and it is why the threshold is a
 * smoothstep between two moving edges rather than a constant.
 *
 * The lighting is two samples and a difference. A second reading of the same
 * field, taken a short way toward the sun, is what the light met before it
 * got here - more cloud that way means this puff is in shadow, less means it
 * is the lit face. It is a genuine, if very cheap, self-shadowing, and it is
 * the whole reason the deck has form rather than being a stencil.
 */
/*
 * The deck, the veil above it, and the night behind both.
 *
 * WHAT THE FIELD IS. Value noise, five octaves, and the SHAPE comes out of a
 * coverage threshold rather than out of the noise: a sky that is a quarter
 * covered is the noise above its top quartile, and the fraction of the field
 * that survives the threshold is the fraction of the sky that is white. That
 * is the one property that makes "sixty per cent cover" mean sixty per cent
 * cover, and it is why the threshold is a smoothstep between two moving edges
 * rather than a constant.
 *
 * WHAT WAS WRONG WITH IT. Thresholded noise is a field of round blobs, and a
 * real cloud field is never round. Three things fixed that, and all three are
 * in main below: the field is read at a point that a second, slower field has
 * already moved (so the puffs lean and hook and run together the way wind
 * shear actually leaves them), a fine field is added before the threshold so
 * the outlines are ragged at a scale below the puff, and the light through
 * them is Beer and powder off a sunward path rather than a difference of two
 * samples. Above all of it sits a second deck of cirrus, stretched along the
 * wind, because a sky with no high cloud in it reads as a render.
 */
const CLOUD_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uCover;
  uniform float uBase;
  uniform float uScale;
  uniform vec2  uDrift;
  uniform vec2  uWindDir;
  uniform vec3  uSun;
  uniform vec3  uLit;
  uniform vec3  uShade;
  uniform float uOpacity;
  uniform float uCirrus;
  uniform float uTime;
  uniform float uDay;

  /* The night, and where the sky is pointing while it happens. */
  uniform mat3  uCelestial;
  uniform float uNight;
  uniform float uDusk;
  uniform float uHaze;

  varying vec3 vWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  /* A hash of a cell of the celestial sphere: one number per star's worth. */
  vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
  }

  float fbm3(vec2 p) {
    float sum = 0.0;
    float weight = 0.5;
    float total = 0.0;
    mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
    for (int octave = 0; octave < 3; octave++) {
      sum += weight * noise(p);
      total += weight;
      p = turn * p;
      weight *= 0.5;
    }
    return sum / total;
  }

  float fbm5(vec2 p) {
    float sum = 0.0;
    float weight = 0.5;
    float total = 0.0;
    mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
    for (int octave = 0; octave < 5; octave++) {
      sum += weight * noise(p);
      total += weight;
      p = turn * p;
      weight *= 0.5;
    }
    return sum / total;
  }

  /*
   * Henyey-Greenstein: the one line of real cloud physics in this file.
   *
   * Light that goes into a water droplet mostly goes on FORWARD. That single
   * fact is the silver lining - the puff between you and the sun has a rim of
   * fire on it and the identical puff behind your shoulder is flat grey - and
   * no amount of tuning a pow(dot) gets the falloff right, because the real
   * one is very narrow at the top and very wide at the bottom.
   */
  float hg(float c, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (12.566371 * pow(1.0 + g2 - 2.0 * g * c, 1.5));
  }

  /* Straight-alpha "over": src laid on top of dst. */
  void over(inout vec3 dst, inout float dstA, vec3 src, float srcA) {
    float a = srcA + dstA * (1.0 - srcA);
    dst = a > 0.0001 ? (src * srcA + dst * dstA * (1.0 - srcA)) / a : src;
    dstA = a;
  }

  /*
   * THE STARS.
   *
   * The direction is turned into the celestial frame by one matrix - see
   * siderealAngle in lib/sky.ts for why that is the whole of the astronomy -
   * and then the sphere is cut into cells, one star to a cell. Which cells
   * get one, how bright it is, what colour and where it sits are all hashes
   * of the cell, so the sky is FIXED: the same stars in the same places every
   * night, turning about the pole as the hours run, standing at the altitude
   * your latitude puts them at.
   *
   * TWO THINGS HERE ARE NOT THE OBVIOUS VERSION, and the obvious version is
   * what a sky with no stars in it looks like.
   *
   * The star is placed in its cell and then PUSHED OUT ONTO THE SPHERE, and
   * what is compared is the angle between two directions. Comparing distance
   * through the grid instead - which is what falls out if you just write
   * length(fract(p) - centre) - means a cell only shows its star when the
   * unit sphere happens to cut it near the middle, and the sphere is a
   * two-dimensional sheet through a three-dimensional lattice: it misses
   * almost every one. That was the bug. There were stars; there were about
   * one per cent of the stars there should have been.
   *
   * And a star is drawn at least a pixel wide. A point light has no size
   * worth drawing, and below a pixel it does not get fainter - it gets
   * UNRELIABLE, lit or not depending on where the sample happened to fall, so
   * the whole sky boils as the head turns. A pixel is the floor.
   */
  float starLayer(vec3 dir, float scale, float keep, float px, float twinkle, out vec3 tint) {
    tint = vec3(1.0);
    vec3 cell = floor(dir * scale);
    vec3 seed = hash33(cell);
    if (seed.x > keep) return 0.0;

    vec3 star = normalize(cell + 0.5 + (seed.yzx - 0.5) * 0.7);
    float near = length(dir - star);
    float radius = px * 1.15;

    vec3 grade = hash33(cell + 19.7);
    // Cubed, so the sky is mostly faint with a few that are not - which is
    // the actual distribution of naked-eye magnitudes, near enough.
    float bright = pow(grade.x, 3.0);
    // Colour by temperature, the way a real one is: most of them yellow-white,
    // the hot ones blue, the old ones orange. Not named "cast": that is a
    // reserved word in GLSL, and a shader that will not compile draws nothing
    // at all rather than drawing something wrong - the same trap "half" and
    // "flat" set elsewhere in this app.
    tint = mix(vec3(1.0, 0.83, 0.67), vec3(0.75, 0.85, 1.0), grade.y);

    float core = smoothstep(radius, 0.0, near);
    // The brightest few get the small bloom the eye itself puts around them,
    // which is the difference between Vega and a white pixel. KEPT TIGHT: at
    // six pixels this was not a bloom, it was a snowfall - every star a soft
    // disc the size of a planet, which is the one thing a star never is.
    float halo = smoothstep(radius * 2.6, 0.0, near) * bright * 0.16;
    float flicker = 1.0 - twinkle * 0.4 * (0.5 + 0.5 * sin(uTime * 2.3 + grade.z * 61.0));
    return (core + halo) * bright * flicker;
  }

  /* The galactic pole, and two axes across the band. See the Milky Way below. */
  const vec3 GAL_POLE = vec3(-0.8676, 0.4555, -0.1986);
  const vec3 GAL_U    = vec3(-0.4440, -0.8900, -0.1016);
  const vec3 GAL_V    = vec3(0.2231, 0.0, -0.9748);

  void main() {
    vec3 ray = normalize(vWorld - cameraPosition);

    /*
     * How wide one pixel is, in radians - and taken HERE, above every branch.
     * A derivative asked for inside a branch that some of the quad's four
     * pixels did not take is undefined, and everything below this line is
     * branches.
     */
    float px = max(length(fwidth(ray)), 1e-5);

    // Below the horizon there is no deck to meet, and a ray running along it
    // meets one at an infinite distance - so both are simply nothing. Nor is
    // there sky down there to put stars in.
    if (ray.y < 0.012) discard;

    /*
     * THE NIGHT, which everything else is laid over.
     *
     * It fades in as the sun goes down rather than switching on, and it is
     * thinned near the horizon where the air is thickest and where, on any
     * real night, a town is.
     */
    vec3 colour = vec3(0.0);
    float alpha = 0.0;
    if (uDusk > 0.001) {
      vec3 celestial = uCelestial * ray;

      /*
       * THE MILKY WAY: a great circle tilted sixty-three degrees to the
       * celestial equator, which it gets for free by being defined in the
       * star frame - it rises and sets with the stars because it is made of
       * them.
       *
       * Its mottling is written as sines of the angle ALONG the band rather
       * than as noise, for one reason: noise on an angle has a seam where the
       * angle wraps, and a seam drawn down the middle of the galaxy is the
       * single most visible artefact this shader could have. Sines close.
       */
      float across = dot(celestial, GAL_POLE);
      float along = atan(dot(celestial, GAL_U), dot(celestial, GAL_V));
      float band = exp(-across * across * 34.0);
      float clouds = 0.52 + 0.48 * sin(along * 2.0 + 0.6) * sin(along * 5.0 + 2.3);
      float lane = (across + 0.035 * sin(along * 3.0 + 1.1)) * 24.0;
      float rift = 1.0 - 0.6 * exp(-lane * lane);
      float milky = band * clouds * rift;

      vec3 tintA, tintB;
      float faint = starLayer(celestial, 34.0, 0.55, px, 1.0, tintA);
      float bright = starLayer(celestial, 11.0, 0.20, px, 0.35, tintB);
      // More of the faint ones along the band, because that is what the band
      // IS: the ones too far off to resolve, seen edge-on through the disc.
      faint *= 1.0 + milky * 2.4;

      vec3 stars = tintA * faint * 0.7 + tintB * bright * 1.45;
      // Thinner low down: more air to look through, and more of everything
      // else. Cloud in the way puts them out, which is most of what an
      // overcast night looks like from underneath.
      stars *= smoothstep(-0.02, 0.30, ray.y) * (1.0 - uCover * 0.8) * uNight;

      /*
       * ...AND THE AIR ITSELF, WHICH IS NEVER BLACK.
       *
       * Two palettes with the darkness between them, because twilight is not
       * a dimmer daylight and night is not a dimmer twilight - they are
       * different colours, and the half hour between them is the best light
       * of the day.
       *
       * This layer takes over from the scattering model AT THE HORIZON rather
       * than fading in over it. The model behind is Preetham's, and Preetham
       * has a cliff: about two degrees under, its sun term goes to zero and
       * the whole dome snaps to a flat grey wash. Everything below is what
       * gets drawn instead of that.
       */
      float low = 1.0 - smoothstep(0.0, 0.55, ray.y);

      // Where the sun went down, which is where the warm band is. Nowhere
      // near the whole horizon: that was the giveaway in the old one.
      float side = 0.0;
      float span = length(ray.xz);
      if (span > 0.0001) side = max(0.0, dot(ray.xz / span, normalize(uSun.xz + vec2(0.0001))));
      float warmBand = pow(side, 2.2) * low * low;

      vec3 deep = mix(vec3(0.011, 0.016, 0.034), vec3(0.028, 0.032, 0.047), low);
      deep += vec3(0.026, 0.018, 0.010) * low * low;
      deep += vec3(0.038, 0.045, 0.060) * milky * 0.22;

      vec3 dusk = mix(vec3(0.030, 0.055, 0.135), vec3(0.105, 0.115, 0.205), low);
      dusk += vec3(0.40, 0.17, 0.07) * warmBand;

      colour = stars + mix(dusk, deep, uNight) * uHaze;
      alpha = clamp(max(length(stars) * 2.2, uHaze * uDusk * 0.97), 0.0, 1.0);
    }

    /*
     * THE HIGH VEIL.
     *
     * Cirrus is ice, eight kilometres up, and it is drawn out into fibres by
     * the shear at that height. The fibres are the whole look of it - a round
     * version reads as smoke - so the field is sampled through a coordinate
     * squashed hard ACROSS the wind and stretched along it.
     */
    if (uCirrus > 0.004) {
      float far = 8200.0 / ray.y;
      vec2 high = (cameraPosition.xz + ray.xz * far) / 5200.0 + uDrift * 0.55;
      vec2 fibre = vec2(dot(high, uWindDir) * 0.32, dot(high, vec2(-uWindDir.y, uWindDir.x)) * 2.6);
      float veil = fbm3(fibre) * 0.75 + noise(fibre * 3.7) * 0.25;
      float edgeHigh = 0.66 - 0.34 * uCirrus;
      float thick = smoothstep(edgeHigh - 0.11, edgeHigh + 0.13, veil);
      thick *= smoothstep(0.015, 0.28, ray.y) * exp(-far * 0.000004);
      float veilA = thick * (0.26 + 0.34 * uCirrus);
      // Ice scatters forward harder than water does - that is the halo you
      // sometimes get round the sun through a veil like this.
      // Lit by whatever is up there to light it, and after dark that is
       // nothing: uLit is floored so that cloud never goes pure black, which
       // is right for a deck read against a bright horizon and wrong for a
       // veil eight kilometres up at two in the morning - it made the night
       // sky look smeared with grey smoke. uDay is the unfloored version.
      vec3 veilC = (uLit * (0.55 + 0.9 * hg(dot(ray, uSun), 0.86)) + uShade * 0.25)
        * (0.10 + 0.90 * uDay);
      over(colour, alpha, veilC, veilA);
    }

    /*
     * THE DECK.
     */
    float reach = uBase / ray.y;
    vec2 hit = (cameraPosition.xz + ray.xz * reach) / uScale + uDrift;

    // Read at a point a slower field has already moved. Two samples of noise,
    // and they are what turn blobs into weather.
    vec2 curl = vec2(noise(hit * 0.42 + 4.7), noise(hit * 0.42 + 19.1)) - 0.5;
    vec2 warped = hit + curl * 1.9;

    float field = fbm5(warped);

    /*
     * Coverage: the field above a threshold, and the threshold is fitted to
     * the field's OWN distribution so that the fraction surviving it is the
     * fraction asked for. Five octaves of value noise pile up around a half
     * with a spread of about a tenth - so a threshold read straight off the
     * cover, which is what this was, put four per cent of cloud in the sky at
     * a quarter cover and ninety at three quarters. The line is measured, and
     * the extra push at the top is what turns a very heavy sky into an
     * actually unbroken one rather than into a ninety-five per cent one with
     * holes.
     */
    float edge = 0.71 - 0.42 * uCover - 0.35 * smoothstep(0.85, 1.0, uCover);

    // A finer field added before the threshold, not after: it eats into the
    // outline without touching the cores, because the cores are far above the
    // line and the outline is sitting on it. That is the ragged fringe.
    float grain = (fbm3(warped * 5.2 + 9.1) - 0.5) * 0.115;
    float density = smoothstep(edge - 0.075, edge + 0.075, field + grain);

    // The deck fades into haze toward the horizon, and thins where it is seen
    // almost edge-on. Without this the far cloud stacks into a hard band.
    density *= smoothstep(0.012, 0.16, ray.y);
    density *= exp(-reach * 0.000035);
    density *= uOpacity;

    if (density > 0.002) {
      /*
       * LIGHT THROUGH IT.
       *
       * Two more readings of the same field, taken along the deck toward the
       * sun: that is what the light met on its way here, and it is a genuine
       * if very cheap optical depth. Beer for how much of it got through,
       * and the powder term for the rest - a cloud is darker where it is deep
       * AND darker where it is thin enough that the light scattered back out
       * before it arrived, which is why the fringe of a cumulus is grey and
       * its shoulder is white.
       */
      vec2 toSun = normalize(uSun.xz + vec2(0.0001));
      float near = fbm3(warped + toSun * 0.34);
      float far = fbm3(warped + toSun * 1.05);

      /*
       * WHICH FACE OF THE PUFF THIS IS. The field read a short way toward the
       * sun, and the difference: more cloud that way and this is the shaded
       * side, less and it is the lit one. It is the cheapest self-shadowing
       * there is and it is the whole reason the deck has form rather than
       * being a stencil.
       */
      float face = clamp((field - near) * 3.4 + 0.60, 0.0, 1.0);

      /*
       * AND WHAT ANOTHER PUFF THREW ACROSS IT. A second reading, a whole
       * puff-width toward the sun: cloud out there is cloud standing between
       * this one and the light, and a deck where the far shadows fall on the
       * near cloud is the difference between a field of weather and a field
       * of identical lit lumps.
       */
      float shadow = 1.0 - 0.42 * smoothstep(edge - 0.02, edge + 0.14, far);

      /*
       * THE POWDER TERM. A cloud is darker at its FRINGE than a hand's-width
       * inside it, which is the one thing everybody paints backwards: light
       * entering a thin edge scatters straight back out before it has been
       * turned around enough times to come at you. Beer's law alone says the
       * thin edge is the brightest part. It is not.
       */
      float thin = 1.0 - exp(-density * 3.4);

      float lit = face * shadow * mix(0.70, 1.0, thin);

      /*
       * ...and the heavier the deck, the less of the sun ever reaches the
       * underside you are standing under. That is not a shading choice: an
       * overcast sky is grey because the light is two thousand feet of water
       * away, and a deck that goes on rendering white at nine tenths cover is
       * drawing a bright day with a lid on it.
       */
      lit *= 1.0 - 0.62 * smoothstep(0.40, 0.95, uCover);

      // The silver rim, from the phase function rather than from a pow(dot):
      // narrow at the top, wide at the bottom, which is the shape of the real
      // thing and not something a power curve can be tuned into.
      float rim = hg(dot(ray, uSun), 0.82) * 0.22 * (1.0 - density * 0.5);

      over(colour, alpha, mix(uShade, uLit, lit) + uLit * rim, density);
    }

    if (alpha <= 0.002) discard;

    gl_FragColor = vec4(colour, alpha);
    #include <colorspace_fragment>
  }
`;

const UP = new THREE.Vector3(0, 1, 0);

const SUNSET = new THREE.Color(1, 0.55, 0.3);
const DUSK = new THREE.Color(0.5, 0.34, 0.34);

/**
 * Cloud read as colour: what the top of a puff is, and what its underside is.
 *
 * Both come off the sun rather than being a fixed white and grey, because that
 * is the whole of what makes an evening sky an evening sky - the deck is lit
 * from the side by a light that is the colour of a coal by then, and its
 * underside is the only part of the picture still holding the blue of the
 * zenith.
 */
const cloudColours = (sun: SunState, cover: number, lit: THREE.Color, shade: THREE.Color) => {
  /*
   * Off the light's own strength and colour, not off where it is in the sky.
   *
   * The deck has to read right under a HAND-SET sun as well as a simulated
   * one, and a hand-set sun has no hour attached to it - somebody who has
   * dragged the key down to a low warm rake has composed an evening whatever
   * the clock says, and the cloud has to agree with it. Strength and colour
   * are the two things both kinds of sun have, and between them they say
   * everything the cloud needs: how much light there is to catch, and what
   * colour it is by the time it gets here.
   */
  const warm = THREE.MathUtils.clamp((5200 - sun.temperature) / 2600, 0, 1);
  const day = THREE.MathUtils.clamp(sun.intensity / 3, 0, 1);
  lit.setRGB(1, 1, 1).lerp(SUNSET, warm * 0.85).multiplyScalar(0.18 + 0.82 * day);
  shade
    .setRGB(0.42, 0.46, 0.56)
    .lerp(DUSK, warm * 0.5)
    .multiplyScalar((1 - cover * 0.3) * (0.15 + 0.85 * day));
};

/**
 * The deck itself.
 *
 * Everything it draws with is written from one frame callback and read out of
 * the store there, rather than passed down as props: the cover, the base and
 * the wind change on a clock of their own - a live sky refreshes itself every
 * few minutes, and a scrubbed one changes while a finger is down - and a
 * material rebuilt on each of those is a stall you can see.
 */
const CloudDeck: React.FC = () => {
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uCover: { value: 0 },
      uBase: { value: 1200 },
      uScale: { value: PUFF },
      uDrift: { value: new THREE.Vector2() },
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uLit: { value: new THREE.Color(1, 1, 1) },
      uShade: { value: new THREE.Color(0.45, 0.5, 0.6) },
      uOpacity: { value: 0 },
      uWindDir: { value: new THREE.Vector2(0, 1) },
      uCirrus: { value: 0 },
      uTime: { value: 0 },
      uDay: { value: 1 },
      uCelestial: { value: new THREE.Matrix3() },
      uNight: { value: 0 },
      uDusk: { value: 0 },
      uHaze: { value: 1 },
    }),
    []
  );

  /* Rebuilt each frame from the place and the moment. See siderealAngle. */
  const pole = useMemo(() => new THREE.Vector3(), []);
  const spin = useMemo(() => new THREE.Quaternion(), []);
  const align = useMemo(() => new THREE.Quaternion(), []);
  const turn = useMemo(() => new THREE.Matrix4(), []);

  useFrame(({ camera }, delta) => {
    const dome = mesh.current;
    if (!dome) return;

    /*
     * The dome rides with the eye.
     *
     * A sky fixed at the origin is a sky you can walk out from under, and the
     * curvilinear pass renders this scene in six directions at once - so "far
     * enough away not to matter" is not available at any radius that also fits
     * inside the far plane. Riding the camera costs one vector copy a frame,
     * and the deck is then genuinely at infinity, which is what it is.
     */
    dome.position.copy(camera.position);

    const { sky, sun } = useStore.getState();
    uniforms.uCover.value = sky.cover;
    uniforms.uBase.value = sky.base;
    // A clear sky is CLEAR. The threshold above still passes a few per cent of
    // the field at a cover of nothing, which is a haze nobody asked for. The
    // dome itself is still drawn: with no cloud in it, it is the night.
    uniforms.uOpacity.value = THREE.MathUtils.smoothstep(sky.cover, 0, 0.05);

    /*
     * Movement, in metres of deck per second: the real wind speed, at the real
     * bearing, over a field measured in puff-widths. A cloud shadow crossing a
     * courtyard at four metres a second is the one thing in this scene that
     * says the picture is a moment rather than a diagram.
     */
    const bearing = (sky.windBearing * Math.PI) / 180;
    uniforms.uDrift.value.x -= (delta * sky.wind * Math.sin(bearing)) / PUFF;
    uniforms.uDrift.value.y -= (delta * sky.wind * Math.cos(bearing)) / PUFF;
    // The way the deck is MOVING, which is the way its fibres lie. The bearing
    // is where the wind comes from, so this is the other end of it.
    uniforms.uWindDir.value.set(-Math.sin(bearing), -Math.cos(bearing));

    /*
     * How much high cloud there is.
     *
     * Not observed - the forecast is asked for the high layer and the answer
     * is spent choosing the deck's height, not kept. What is kept here is the
     * plain fact that a sky with no cirrus in it at all reads as a render:
     * there is nearly always some, and there is more of it when there is more
     * of everything.
     */
    uniforms.uCirrus.value =
      (0.08 + sky.cover * 0.45) * (1 - THREE.MathUtils.smoothstep(sky.cover, 0.55, 0.95));

    /* For the twinkle, which is the only thing in here that wants a clock. */
    uniforms.uTime.value += delta;

    /* How much daylight there is, with no floor under it. See uDay's use. */
    uniforms.uDay.value = THREE.MathUtils.clamp(sun.intensity / 3, 0, 1);

    const [x, y, z] = sunPosition(sun.azimuth, sun.elevation);
    uniforms.uSun.value.set(x, y, z).normalize();
    cloudColours(sun, sky.cover, uniforms.uLit.value, uniforms.uShade.value);

    /*
     * HOW DARK IT IS, AND WHICH WAY THE SKY IS POINTING.
     *
     * The sun's own elevation is clamped above the horizon before it reaches
     * the light - a directional lamp under the floor rakes the whole scene from
     * below - so the night cannot be read off it. It is worked out again here
     * from the place and the moment, which is where it actually lives.
     *
     * Civil twilight to astronomical: nothing at all until the sun is a couple
     * of degrees down, the brightest stars from about six, and the whole sky by
     * eighteen. That is roughly what happens, and it is entirely what it looks
     * like.
     */
    const below = sky.simulate
      ? solarPosition(new Date(sky.time), sky.latitude, sky.longitude).elevation
      : sun.elevation;
    /*
     * Two ramps, not one.
     *
     * uDusk is WHETHER this layer is drawn at all, and it comes up as the sun
     * crosses the horizon, because that is where the model underneath stops
     * being usable. uNight is HOW FAR THROUGH the night it is - which palette,
     * and how many stars - and it runs on to the end of civil twilight.
     */
    uniforms.uDusk.value = THREE.MathUtils.smoothstep(-below, -0.8, 2.5);
    uniforms.uNight.value = THREE.MathUtils.smoothstep(-below, 0, 13);
    uniforms.uHaze.value = 1;

    /*
     * The celestial frame: spin the sky about an axis that points north and
     * stands at the latitude's own altitude. One matrix, and every star is in
     * the right place at the right hour for the right place on earth.
     */
    const lat = (sky.latitude * Math.PI) / 180;
    pole.set(0, Math.sin(lat), -Math.cos(lat)).normalize();
    align.setFromUnitVectors(pole, UP);
    spin.setFromAxisAngle(UP, -siderealAngle(new Date(sky.time), sky.longitude));
    turn.makeRotationFromQuaternion(spin.multiply(align));
    uniforms.uCelestial.value.setFromMatrix4(turn);
  });

  return (
    <mesh ref={mesh} renderOrder={-1} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[DOME, 48, 24]} />
      <shaderMaterial
        vertexShader={CLOUD_VERTEX}
        fragmentShader={CLOUD_FRAGMENT}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * The whole environment: the air, and the deck under it.
 *
 * Aimed by the light's own bearing and height, whether those came off the two
 * knobs or off a place and a moment - the sky does not need to know which, and
 * the fact that it does not is what keeps the simulation from being a separate
 * mode with a separate look.
 */
export const Atmosphere: React.FC = () => {
  /*
   * THE AIR IS AIMED BY THE SUN'S TRUE HEIGHT, NOT BY THE LIGHT'S.
   *
   * The light's elevation is held two degrees above the horizon, for the
   * reason spelled out in sunFromSky: a directional lamp under the floor
   * rakes every surface in the scene from below. That clamp is right for the
   * lamp and catastrophic for the air, because the scattering model reads the
   * sun's height as the whole of the hour - so the sky sat at a permanent
   * two-degree twilight, navy blue at three in the morning, with the stars
   * washed out behind it. It was not that the stars were not drawn. It was
   * that it was never night.
   *
   * HELD AT A DEGREE UNDER, though, and not because of the lamp. Preetham's
   * model has a cliff in it: a little over two degrees below the horizon its
   * sun term reaches zero and the whole dome snaps, in one frame, to a flat
   * featureless grey. Stopping it just above that leaves it showing its
   * lowest, reddest twilight - and by then the deck's own night layer is
   * drawn over the top of it anyway, so what is underneath stops mattering.
   *
   * QUANTISED, and that is not an optimisation, it is what makes this legal
   * at all. The clock moves the moment every animation frame; these are React
   * props, and a prop that changes every frame re-renders the subtree every
   * frame. A quarter of a degree of sun is smaller than any change this model
   * can show, and it turns sixty renders a second into about ten.
   */
  const altitude = useStore((state) =>
    state.sky.simulate
      ? Math.max(
          -1,
          Math.round(
            solarPosition(new Date(state.sky.time), state.sky.latitude, state.sky.longitude)
              .elevation * 4
          ) / 4
        )
      : Math.round(state.sun.elevation * 4) / 4
  );
  const bearing = useStore((state) => Math.round(state.sun.azimuth * 4) / 4);
  const cover = useStore((state) => Math.round(state.sky.cover * 64) / 64);

  // Warm light scatters through a denser-looking atmosphere; heavy cover
  // greys the whole sky down, which is what turbidity does to this model.
  const warmth = useStore(
    (state) => Math.round(THREE.MathUtils.clamp((6500 - state.sun.temperature) / 4700, 0, 1) * 64) / 64
  );
  const energy = useStore(
    (state) => Math.round(THREE.MathUtils.clamp(state.sun.intensity / 8, 0.05, 1) * 64) / 64
  );

  const position = useMemo(() => sunPosition(bearing, altitude), [bearing, altitude]);

  /*
   * AND THE AIR IS DIMMED AS THE SUN CLIMBS.
   *
   * Preetham's model is a radiance, not a picture. Its output at a forty
   * degree sun is several times its output at a fifteen degree one, which is
   * true of the real sky and is exactly why nobody photographs one at noon
   * without stopping down: run through the tone mapper at a fixed exposure it
   * came out as a sheet of white-cyan with the cloud lost in it, and a cloud
   * you cannot see is not a cloud that has been drawn realistically.
   *
   * So the dome carries its own stop. A shader patched once at mount, because
   * the model has no brightness of its own to turn down and re-deriving one
   * from turbidity moves the hue instead of the level. Half a stop at the
   * horizon, near two at midsummer noon - which is roughly what an eye does,
   * and precisely what a photographer would.
   */
  const dome = useRef<React.ComponentRef<typeof SkyDome>>(null);
  const stop = useMemo(() => ({ value: 1 }), []);
  stop.value = 1 / (1 + 0.85 * THREE.MathUtils.smoothstep(altitude, 0, 55));

  useEffect(() => {
    const material = dome.current?.material as THREE.ShaderMaterial | undefined;
    if (!material || material.uniforms.uStop) return;
    material.uniforms.uStop = stop;
    material.fragmentShader = material.fragmentShader
      .replace('varying float vSunfade;', 'varying float vSunfade;\nuniform float uStop;')
      .replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * uStop, 1.0 );');
    material.needsUpdate = true;
  }, [stop]);

  return (
    <>
      <SkyDome
        ref={dome}
        distance={450}
        sunPosition={position}
        turbidity={2 + warmth * 7 + (1 - energy) * 2 + cover * 6}
        rayleigh={0.8 + energy * 2.2}
        mieCoefficient={0.003 + warmth * 0.012}
        mieDirectionalG={0.82 + energy * 0.12}
      />
      <CloudDeck />
    </>
  );
};
