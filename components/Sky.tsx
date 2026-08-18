import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky as SkyDome } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import type { SunState } from '../types';
import { sunPosition } from '../lib/sky';

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
const CLOUD_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uCover;
  uniform float uBase;
  uniform float uScale;
  uniform vec2  uDrift;
  uniform vec3  uSun;
  uniform vec3  uLit;
  uniform vec3  uShade;
  uniform float uOpacity;

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

  float fbm(vec2 p) {
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

  void main() {
    vec3 ray = normalize(vWorld - cameraPosition);

    // Below the horizon there is no deck to meet, and a ray running along it
    // meets one at an infinite distance - so both are simply nothing.
    if (ray.y < 0.012) discard;

    float reach = uBase / ray.y;
    vec2 hit = (cameraPosition.xz + ray.xz * reach) / uScale + uDrift;

    float field = fbm(hit);

    /*
     * Coverage: the field above a threshold, and the threshold is fitted to
     * the field's OWN distribution so that the fraction surviving it is the
     * fraction asked for. Five octaves of value noise pile up around a half
     * with a spread of about a tenth - so a threshold read straight off the
     * cover, which is what this was, put four per cent of cloud in the sky at
     * a quarter cover and ninety at three quarters. The line is measured
     * (see the quantiles of fbm), and the extra push at the top is what turns
     * a very heavy sky into an actually unbroken one rather than into a
     * ninety-five per cent one with holes.
     */
    float edge = 0.71 - 0.42 * uCover - 0.35 * smoothstep(0.85, 1.0, uCover);
    float density = smoothstep(edge - 0.045, edge + 0.045, field);

    // The deck fades into haze toward the horizon, and thins where it is seen
    // almost edge-on. Without this the far cloud stacks into a hard band.
    density *= smoothstep(0.012, 0.16, ray.y);
    density *= exp(-reach * 0.000035);

    if (density <= 0.002) discard;

    // What the light met on its way here, a short step toward the sun.
    float toward = fbm(hit + normalize(uSun.xz + vec2(0.0001)) * 0.55);
    float lit = clamp((field - toward) * 3.2 + 0.55, 0.0, 1.0);

    // ...and the silver rim, where you are looking almost straight at the sun
    // through the thin edge of a puff.
    float halo = pow(max(dot(ray, uSun), 0.0), 12.0) * (1.0 - density * 0.55);

    vec3 colour = mix(uShade, uLit, lit) + halo * 0.6;

    gl_FragColor = vec4(colour, density * uOpacity);
    #include <colorspace_fragment>
  }
`;

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
    }),
    []
  );

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
    // the field at a cover of nothing, which is a haze nobody asked for.
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

    const [x, y, z] = sunPosition(sun.azimuth, sun.elevation);
    uniforms.uSun.value.set(x, y, z).normalize();
    cloudColours(sun, sky.cover, uniforms.uLit.value, uniforms.uShade.value);
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
  const sun = useStore((state) => state.sun);
  const cover = useStore((state) => state.sky.cover);

  const position = useMemo(
    () => sunPosition(sun.azimuth, sun.elevation),
    [sun.azimuth, sun.elevation]
  );

  // Warm light scatters through a denser-looking atmosphere; heavy cover
  // greys the whole sky down, which is what turbidity does to this model.
  const warmth = THREE.MathUtils.clamp((6500 - sun.temperature) / 4700, 0, 1);
  const energy = THREE.MathUtils.clamp(sun.intensity / 8, 0.05, 1);

  return (
    <>
      <SkyDome
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
