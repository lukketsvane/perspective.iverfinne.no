import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../store';
import { airLight, aimVector, ATMOSPHERE_GLSL, sunThrough, temperatureColor } from '../lib/atmosphere';
import { constellationFigures, starField } from '../lib/starData';
import { aimOf, equatorialToWorld, julianDay, moonAt, sunAt, universalHour, type Standpoint } from '../lib/sky';

/**
 * The world outside, when the sky is switched on.
 *
 * What was here before was drei's Sky: a Preetham gradient driven off the key
 * light's colour temperature, which is a handsome backdrop and stops there. No
 * night, no weather, no stars, no way to be anywhere in particular, and - the
 * one that matters most - nothing between you and the far end of the scene.
 *
 * HOW IT IS PUT TOGETHER, AND WHY IN THAT ORDER.
 *
 * The atmosphere is BAKED. A single-scattering integral is a hundred and
 * twenty-eight samples a pixel; a curvilinear frame renders the scene onto six
 * cube faces, so the honest per-pixel version is that cost six times over,
 * every frame, on a phone. It is also a function of exactly two things - where
 * the sun is and how much air there is - so it is drawn once into a small
 * equirectangular texture whenever either changes, and the dome reads it by
 * direction. Two hundred and fifty-six by a hundred and twenty-eight, which is
 * a degree and a half a texel and far finer than any gradient in the sky.
 *
 * The sharp things are NOT baked, because a degree and a half is much coarser
 * than any of them: the sun's disc is half a degree, the moon's is half a
 * degree, and a star is a point. Those are geometry, in front of the dome.
 *
 * The CLOUD is per pixel, and it is per pixel for a reason that is the whole
 * point of the feature: a deck of cloud is a PLANE, at a height, and the view
 * ray meets it where it meets it. Drawn that way it converges to the horizon
 * exactly the way the floor does, it slides properly as you walk under it, and
 * a low deck races away overhead while a high one lies almost flat. That is
 * the one perspective plane everybody has looked at every day of their life
 * and nobody has ever set a vanishing point on.
 */

/**
 * How far off the dome stands.
 *
 * Inside the camera's two thousand metres so nothing is clipped, and outside
 * the thousand metres of floor the tool lays down, so the floor's own far edge
 * is what you see at the horizon rather than a hole. It is re-centred on the
 * camera every frame, which is what makes it a sky rather than a large object:
 * you cannot walk towards it, and the stars on it never shift.
 */
const DOME = 1600;

const PI = Math.PI;

/** The equirectangular map the atmosphere is baked into. */
const BAKE_WIDTH = 256;
const BAKE_HEIGHT = 128;

/**
 * Turning a direction into a place on that map, and back.
 *
 * Shared as source between the two shaders so the bake and the read cannot
 * drift apart by half a texel and put a seam down the sky.
 */
const EQUIRECT_GLSL = /* glsl */ `
  vec3 directionAt(vec2 uv) {
    float lon = (uv.x * 2.0 - 1.0) * ${PI};
    float lat = (uv.y - 0.5) * ${PI};
    float flat0 = cos(lat);
    return vec3(sin(lon) * flat0, sin(lat), cos(lon) * flat0);
  }

  vec2 placeOf(vec3 dir) {
    return vec2(
      atan(dir.x, dir.z) / ${2 * PI} + 0.5,
      asin(clamp(dir.y, -1.0, 1.0)) / ${PI} + 0.5
    );
  }
`;

/**
 * Value noise, and four octaves of it.
 *
 * Cheap, seamless and entirely sufficient: a cloud deck seen from underneath
 * is a coverage mask, not a volume, and what the eye reads in it is the shape
 * of the holes. The detail term drops the fine octaves out with distance -
 * without it the deck aliases into a shimmering rug about a kilometre out,
 * because the same square of noise ends up under a hundredth of a pixel.
 */
const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 into = fract(p);
    vec2 smoothed = into * into * (3.0 - 2.0 * into);
    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), smoothed.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), smoothed.x),
      smoothed.y
    );
  }

  float fbm(vec2 p, float detail) {
    float sum = 0.0;
    float weight = 0.5;
    float total = 0.0;
    for (int i = 0; i < 4; i++) {
      float keep = i < 2 ? 1.0 : detail;
      sum += noise(p) * weight * keep;
      total += weight * keep;
      p *= 2.03;
      weight *= 0.5;
    }
    return sum / max(total, 1e-4);
  }
`;

/** Everything the sky needs to know, worked out once per change. */
interface Moment {
  standpoint: Standpoint;
  /** Where the sun is, by the clock. Not necessarily where the LIGHT is. */
  sun: { azimuth: number; elevation: number };
  moon: { azimuth: number; elevation: number; lit: number };
  /** Equatorial to world, column-major, for the star shaders. */
  sky: number[];
}

export const useSkyMoment = (): Moment => {
  const sky = useStore((state) => state.sky);
  return useMemo(() => {
    const standpoint: Standpoint = {
      latitude: sky.latitude,
      // Kept at Greenwich on purpose. The hour is the SUN's, so the longitude
      // it is kept at cancels out of every sum here to within a rounding -
      // see lib/sky.ts - and a knob whose whole effect is nothing is a knob
      // that costs a row of the panel and teaches a wrong idea.
      longitude: 0,
      day: sky.day,
      hour: sky.hour,
    };
    const jd = julianDay(standpoint.day, universalHour(standpoint));
    const moon = moonAt(jd);
    const moonAim = aimOf(moon, standpoint, jd);
    return {
      standpoint,
      sun: aimOf(sunAt(jd), standpoint, jd),
      moon: { ...moonAim, lit: moon.lit },
      sky: equatorialToWorld(standpoint, jd),
    };
  }, [sky.latitude, sky.day, sky.hour]);
};

/**
 * Where the light in the scene is actually coming from.
 *
 * The clock aims the sun when it is asked to, and the light panel's two knobs
 * are the answer when it is not. Everything downstream - the shadows, the ink
 * shaders' own terminator, the sky - reads the store's sun, so the clock
 * WRITES that rather than shadowing it, and there is only ever one answer to
 * where the light is.
 */
export const ClockSun: React.FC = () => {
  const clock = useStore((state) => state.sky.clock);
  const moment = useSkyMoment();
  const setSun = useStore((state) => state.setSun);
  useEffect(() => {
    if (!clock) return;
    const { azimuth, elevation } = moment.sun;
    const sun = useStore.getState().sun;
    if (Math.abs(sun.azimuth - azimuth) < 0.01 && Math.abs(sun.elevation - elevation) < 0.01) return;
    setSun({ azimuth, elevation });
  }, [clock, moment, setSun]);
  return null;
};

/** A colour worked out on the processor, ready to hand to a light or a fog. */
const asColour = (rgb: [number, number, number], gain = 1) =>
  new THREE.Color(rgb[0] * gain, rgb[1] * gain, rgb[2] * gain);

const luminance = (rgb: [number, number, number]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

/**
 * The three things off the screen that need to know what colour the air is.
 *
 * The fog that eats distance, the light the sky throws into the shadows, and
 * how much of the sky is bright enough to drown the stars. Worked out on the
 * processor from the same integral the shader draws - see lib/atmosphere.ts.
 */
const useAirColours = (air: number, sunAim: { azimuth: number; elevation: number }, cloud: number) =>
  useMemo(() => {
    const sun = aimVector(sunAim.azimuth, sunAim.elevation);
    const overhead = airLight([0, 1, 0], sun, air);
    // The horizon, averaged over four bearings, since a fog has one colour and
    // the sky at sundown plainly does not.
    const round = [0, 90, 180, 270].map((bearing) => airLight(aimVector(bearing, 2), sun, air));
    const horizon: [number, number, number] = [0, 1, 2].map(
      (k) => round.reduce((sum, c) => sum + c[k], 0) / round.length
    ) as [number, number, number];
    const beam = sunThrough(sun, air);
    /*
     * Cloud pushes all of it towards grey. An overcast sky is one big diffuser:
     * the horizon loses its colour, the fill goes up because the whole dome is
     * a light, and the beam goes down because most of it never gets through.
     */
    const grey = (rgb: [number, number, number]): [number, number, number] => {
      const flat = luminance(rgb);
      return [0, 1, 2].map((k) => rgb[k] * (1 - cloud) + flat * cloud * 1.15) as [number, number, number];
    };
    return {
      overhead: grey(overhead),
      horizon: grey(horizon),
      beam,
      /*
       * How much of the catalogue survives the sky behind it.
       *
       * Not physics - a star is still up there at noon and the arithmetic knows
       * it. It is the eye, which cannot open wide enough for a sixth-magnitude
       * star while a blue sky is filling it. The one place it comes out
       * strange is the one place it is right: with the air turned off there is
       * no sky to drown anything, so the stars are out at midday, which is what
       * standing on the moon looks like.
       */
      starlight: Math.max(0, Math.min(1, 1 - 6 * luminance(overhead))),
    };
  }, [air, sunAim.azimuth, sunAim.elevation, cloud]);

/**
 * The atmosphere, baked and then read off a sphere.
 *
 * The bake runs inside the frame loop rather than in an effect, and at the
 * default priority so it lands before the curvilinear pass claims the frame at
 * priority one. It restores the render target itself, because everything after
 * it in the loop assumes the screen.
 */
const Atmosphere: React.FC<{
  air: number;
  cloud: number;
  cloudBase: number;
  sunAim: { azimuth: number; elevation: number };
  starlight: number;
  stars: number;
  skyMatrix: number[];
  horizon: [number, number, number];
  beam: [number, number, number];
  /** The ground's own tone, and the light standing on it. */
  earth: [number, number, number];
  earthLit: [number, number, number];
}> = ({ air, cloud, cloudBase, sunAim, starlight, stars, skyMatrix, horizon, beam, earth, earthLit }) => {
  const { gl, camera } = useThree();

  const bake = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(BAKE_WIDTH, BAKE_HEIGHT, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
      // The sky wraps round; without this the seam behind you is a hard line.
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });
    const material = new THREE.RawShaderMaterial({
      uniforms: {
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        air: { value: 1 },
      },
      vertexShader: /* glsl */ `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec3 sunDir;
        uniform float air;
        varying vec2 vUv;
        ${ATMOSPHERE_GLSL}
        ${EQUIRECT_GLSL}
        void main() {
          gl_FragColor = vec4(airLight(directionAt(vUv), sunDir, air), 1.0);
        }
      `,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    return { target, material, scene, camera: new THREE.Camera() };
  }, []);

  useEffect(
    () => () => {
      bake.target.dispose();
      bake.material.dispose();
    },
    [bake]
  );

  const dome = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      sky: { value: bake.target.texture },
      skyMatrix: { value: new THREE.Matrix3() },
      cloud: { value: 0 },
      cloudBase: { value: 1500 },
      cloudLit: { value: new THREE.Color(1, 1, 1) },
      cloudShade: { value: new THREE.Color(0.5, 0.55, 0.6) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunBeam: { value: new THREE.Color(1, 1, 1) },
      eyeAt: { value: new THREE.Vector2() },
      starlight: { value: 0 },
      milkyWay: { value: 0 },
      airAmount: { value: 1 },
      earthTone: { value: new THREE.Color(0.1, 0.1, 0.1) },
      earthLit: { value: new THREE.Color(0, 0, 0) },
    }),
    [bake]
  );

  // Redrawn when, and only when, one of the two things it depends on moves.
  const drawn = useRef({ azimuth: NaN, elevation: NaN, air: NaN });
  useFrame(() => {
    const was = drawn.current;
    if (was.azimuth !== sunAim.azimuth || was.elevation !== sunAim.elevation || was.air !== air) {
      const [x, y, z] = aimVector(sunAim.azimuth, sunAim.elevation);
      bake.material.uniforms.sunDir.value.set(x, y, z);
      bake.material.uniforms.air.value = air;
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(bake.target);
      gl.render(bake.scene, bake.camera);
      gl.setRenderTarget(previous);
      drawn.current = { azimuth: sunAim.azimuth, elevation: sunAim.elevation, air };
    }
    if (dome.current) dome.current.position.copy(camera.position);
    uniforms.eyeAt.value.set(camera.position.x, camera.position.z);
  });

  useEffect(() => {
    uniforms.skyMatrix.value.fromArray(skyMatrix);
    uniforms.cloud.value = cloud;
    uniforms.cloudBase.value = cloudBase;
    uniforms.starlight.value = starlight;
    uniforms.milkyWay.value = stars * starlight;
    const [x, y, z] = aimVector(sunAim.azimuth, sunAim.elevation);
    uniforms.sunDir.value.set(x, y, z);
    /*
     * What a cloud is lit by and what it is shaded by.
     *
     * Underneath is the shaded side - that is the whole character of a cloud
     * deck seen from the ground - so the base takes the sky's own colour and
     * only the thin edges let the beam through. Both come off the same
     * scattering the dome is drawn from, so an overcast at sundown is orange
     * underneath without anybody saying so.
     */
    uniforms.sunBeam.value.setRGB(beam[0], beam[1], beam[2]);
    uniforms.airAmount.value = air;
    uniforms.earthTone.value.setRGB(earth[0], earth[1], earth[2]);
    uniforms.earthLit.value.setRGB(earthLit[0], earthLit[1], earthLit[2]);
    uniforms.cloudLit.value.setRGB(beam[0], beam[1], beam[2]).multiplyScalar(1.15);
    uniforms.cloudShade.value
      .setRGB(horizon[0], horizon[1], horizon[2])
      .multiplyScalar(0.55)
      .addScalar(0.02);
  }, [uniforms, skyMatrix, cloud, cloudBase, starlight, stars, sunAim, horizon, beam, air, earth, earthLit]);

  return (
    <mesh ref={dome} renderOrder={-1000} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[DOME, 48, 24]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform sampler2D sky;
          uniform mat3 skyMatrix;
          uniform float cloud;
          uniform float cloudBase;
          uniform vec3 cloudLit;
          uniform vec3 cloudShade;
          uniform vec3 sunDir;
          uniform vec3 sunBeam;
          uniform vec2 eyeAt;
          uniform float starlight;
          uniform float milkyWay;
          uniform float airAmount;
          uniform vec3 earthTone;
          uniform vec3 earthLit;
          varying vec3 vDir;

          ${EQUIRECT_GLSL}
          ${NOISE_GLSL}

          /*
           * The galactic pole and the galactic centre, in the same equatorial
           * frame the catalogue is written in. Turned by the same matrix the
           * stars are, so the band lies across them where it really lies -
           * through Cygnus overhead in a northern summer, and down into
           * Sagittarius where the middle of the galaxy is and where the band
           * is brightest and most broken.
           */
          const vec3 GALACTIC_POLE = vec3(-0.8676, -0.1979, 0.4560);
          const vec3 GALACTIC_CENTRE = vec3(-0.0548, -0.8734, -0.4839);

          /*
           * Out, with half a step of noise on it.
           *
           * A screen has two hundred and fifty-six values a channel, and the
           * whole of a twilight sky lives in the bottom twenty of them - so
           * the gradient comes out as a stack of hard rings, and coloured
           * ones, because the three channels step at different places. Half a
           * value of noise per pixel puts the boundary somewhere different
           * along each row and the eye averages it back to the gradient that
           * was there all along. It is the oldest trick in the printing trade
           * and it costs one hash.
           */
          void paint(vec3 colour) {
            gl_FragColor = vec4(colour, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
          }

          void main() {
            vec3 dir = normalize(vDir);
            vec3 colour = texture2D(sky, placeOf(dir)).rgb;

            /*
             * UNDER THE HORIZON THERE IS A WORLD.
             *
             * The scattering knows this already - a ray aimed downwards runs
             * into the ground a few metres away and comes back with nothing in
             * it, which is true and looks like a hole. What is missing is the
             * ground itself: the same tone the tool's own floor is, lit by
             * whatever the beam has left, and veiled by more and more air as
             * the ray flattens out until it is indistinguishable from the sky
             * at the horizon. That last blend is aerial perspective at its
             * limit, and it is why a far enough hill is exactly sky-coloured.
             *
             * The tool's floor covers the first kilometre of this and is drawn
             * properly, with the grid on it and the shadows in it. What this
             * is for is the rest, and for the case where the floor is off.
             */
            if (dir.y < 0.0) {
              vec3 lit = earthTone * earthLit;
              float veil = clamp(1.0 + dir.y * 5.0, 0.0, 1.0);
              veil = veil * veil * clamp(airAmount, 0.0, 1.0);
              vec3 haze = texture2D(sky, placeOf(normalize(vec3(dir.x, 0.035, dir.z)))).rgb;
              colour = mix(lit, haze, veil);
              paint(colour);
              return;
            }

            // The Milky Way, in galactic coordinates: a band about the plane,
            // heaped up towards the middle. Transposing a rotation inverts it.
            if (milkyWay > 0.0) {
              vec3 equatorial = dir * skyMatrix;
              float outOfPlane = dot(equatorial, GALACTIC_POLE);
              float band = exp(-outOfPlane * outOfPlane / 0.012);
              float towards = 0.5 + 0.5 * dot(equatorial, GALACTIC_CENTRE);
              float mottle = 0.55 + 0.75 * fbm(vec2(atan(equatorial.y, equatorial.x) * 3.0, outOfPlane * 14.0), 1.0);
              colour += vec3(0.052, 0.050, 0.062) * band * mottle *
                (0.30 + 1.5 * pow(towards, 3.0)) * milkyWay;
            }

            /*
             * The deck.
             *
             * One plane at one height, met where the ray meets it, which is
             * the entire geometry of a cloudy day: straight up you are looking
             * through the thinnest part of it, and towards the horizon the
             * same ray crosses miles of the stuff and the holes close up. That
             * convergence is not an effect - it is the plane, drawn in
             * perspective, from underneath.
             */
            if (cloud > 0.0 && dir.y > 0.005) {
              float reach = cloudBase / dir.y;
              vec2 at = (eyeAt + dir.xz * reach) / 2400.0;
              float detail = clamp(1.0 - reach / 90000.0, 0.0, 1.0);
              float shape = fbm(at, detail);
              // Cover thickens towards the horizon because the ray is longer.
              float slant = mix(1.0, 1.9, clamp(1.0 - dir.y * 2.6, 0.0, 1.0));
              float thickness = clamp((shape - (1.0 - cloud * 0.92)) * 3.4 * slant, 0.0, 1.0);
              thickness *= smoothstep(0.005, 0.055, dir.y);
              // Thin edges pass the beam; the body of it does not.
              vec3 body = mix(cloudLit, cloudShade, smoothstep(0.0, 0.55, thickness));
              // The silver lining: forward scatter through the thin stuff.
              body += cloudLit * pow(max(dot(dir, sunDir), 0.0), 8.0) * (1.0 - thickness) * 0.6;
              colour = mix(colour, body, thickness);
            }

            paint(colour);
          }
        `}
      />
    </mesh>
  );
};

/**
 * The catalogue, drawn.
 *
 * One instanced quad each, eight and a half thousand of them in one call. A
 * point sprite would have been fewer characters and is the wrong tool: its
 * size is set in device pixels, and this scene is drawn at six different
 * resolutions on six cube faces before it reaches a screen.
 *
 * The size a star is drawn at is not its size. A star has no size - it is a
 * point source, and every disc you have ever seen in a photograph of one is
 * the instrument. What varies with brightness is how much that point spills,
 * so the quad grows slowly, as the fourth root of the flux, while the middle
 * of it grows quickly - which between them keep the total light about
 * proportional to the real thing across the nine magnitudes in the catalogue.
 */
/**
 * How much of the catalogue is worth drawing at this field.
 *
 * Not a budget - a fact about looking. A star is a point source with no size
 * at all, so what decides whether you can pick it out is its flux against the
 * sky behind it, and the wider the field the more sky each pixel is holding.
 * Take in a whole hemisphere at once and the faint end of the catalogue is
 * simply not there; put a long lens on the same patch and it comes back.
 *
 * It matters twice over here, because a curvilinear frame is read off six cube
 * faces and every star is therefore drawn six times. Brightest first in the
 * packing, so this is one number and no sorting.
 */
const starsWorthDrawing = (count: number, field: number) =>
  Math.max(1500, Math.min(count, Math.round((count * 90) / Math.max(field, 90))));

const Stars: React.FC<{ gain: number; skyMatrix: number[]; field: number }> = ({ gain, skyMatrix, field }) => {
  const geometry = useMemo(() => {
    const sky = starField();
    const shape = new THREE.InstancedBufferGeometry();
    shape.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)
    );
    shape.setIndex([0, 1, 2, 0, 2, 3]);
    shape.setAttribute('whereStar', new THREE.InstancedBufferAttribute(sky.direction, 3));
    shape.setAttribute('brightness', new THREE.InstancedBufferAttribute(sky.magnitude, 1));
    shape.setAttribute('tint', new THREE.InstancedBufferAttribute(sky.tint, 3));
    shape.instanceCount = sky.count;
    return shape;
  }, []);

  const shown = starsWorthDrawing(starField().count, field);
  geometry.instanceCount = shown;

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      skyMatrix: { value: new THREE.Matrix3() },
      gain: { value: 0 },
      /** The height of whatever is being drawn into, in pixels. */
      frameHeight: { value: 1000 },
    }),
    []
  );

  useEffect(() => {
    uniforms.skyMatrix.value.fromArray(skyMatrix);
    uniforms.gain.value = gain;
  }, [uniforms, skyMatrix, gain]);

  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mesh.current) mesh.current.position.copy(camera.position);
  });

  /*
   * The one thing a shader cannot work out for itself: how many pixels tall
   * the thing it is drawing into is. It differs between the screen and each
   * face of the cube, so it is read per draw rather than set per frame.
   */
  const measure = React.useCallback(
    (renderer: THREE.WebGLRenderer) => {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      uniforms.frameHeight.value = size.y;
    },
    [uniforms]
  );

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      renderOrder={-999}
      frustumCulled={false}
      raycast={() => null}
      onBeforeRender={measure}
    >
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          attribute vec3 whereStar;
          attribute float brightness;
          attribute vec3 tint;
          uniform mat3 skyMatrix;
          uniform float gain;
          uniform float frameHeight;
          varying vec2 vCorner;
          varying vec3 vTint;
          varying float vGlow;

          void main() {
            vec3 aim = skyMatrix * whereStar;
            vec4 middle = modelViewMatrix * vec4(aim * ${DOME}.0, 1.0);
            // Flux against the faintest star in the catalogue: a factor of
            // about sixteen hundred from here to Sirius.
            float flux = pow(10.0, -0.4 * (brightness - 6.5));
            float spread = 0.00055 * pow(flux, 0.24);
            // ...but never smaller than a pixel and a half, or a wide field
            // drops the whole sky between its samples and the stars flicker.
            float perRadian = projectionMatrix[1][1] * frameHeight * 0.5;
            spread = max(spread, 1.6 / max(perRadian, 1.0));
            middle.xy += position.xy * spread * ${DOME}.0;
            gl_Position = projectionMatrix * middle;
            vCorner = position.xy;
            vTint = tint;
            /*
             * ...and nothing at all once it has set.
             *
             * A star at the dome's own radius is over a kilometre out
             * horizontally, which is past the edge of the floor this tool
             * lays down - so without this the whole southern sky came up
             * through the ground, which is a striking picture and not one
             * anybody has ever seen. The narrow band it fades across is
             * roughly where the real thing goes: the last degree above a
             * horizon is where the air puts a star out.
             */
            vGlow = gain * 0.06 * pow(flux, 0.52) * smoothstep(-0.012, 0.022, aim.y);
          }
        `}
        fragmentShader={/* glsl */ `
          varying vec2 vCorner;
          varying vec3 vTint;
          varying float vGlow;
          void main() {
            float out0 = dot(vCorner, vCorner);
            if (out0 > 1.0) discard;
            // A soft core with a little spill, which is what a point source
            // looks like through an eye, a lens or a sheet of paper.
            float core = exp(-out0 * 5.5);
            gl_FragColor = vec4(vTint * vGlow * core, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
};

/**
 * The joining-up.
 *
 * Kept apart from the stars, and off unless asked for, because it is a
 * different kind of thing: the stars are out there and the figures are
 * something people drew on them four thousand years ago. Faint, so that what
 * you read is still the sky with a line through it.
 */
const Figures: React.FC<{ gain: number; skyMatrix: number[] }> = ({ gain, skyMatrix }) => {
  const geometry = useMemo(() => {
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(constellationFigures(), 3));
    return shape;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({ skyMatrix: { value: new THREE.Matrix3() }, gain: { value: 0 } }),
    []
  );
  useEffect(() => {
    uniforms.skyMatrix.value.fromArray(skyMatrix);
    uniforms.gain.value = gain;
  }, [uniforms, skyMatrix, gain]);

  const { camera } = useThree();
  const lines = useRef<THREE.LineSegments>(null);
  useFrame(() => {
    if (lines.current) lines.current.position.copy(camera.position);
  });

  return (
    <lineSegments ref={lines} geometry={geometry} renderOrder={-998} frustumCulled={false} raycast={() => null}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform mat3 skyMatrix;
          varying float vUp;
          void main() {
            vec3 aim = skyMatrix * position;
            vUp = aim.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(aim * ${DOME}.0, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float gain;
          varying float vUp;
          void main() {
            gl_FragColor = vec4(vec3(0.030, 0.038, 0.062) * gain * smoothstep(-0.01, 0.05, vUp), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </lineSegments>
  );
};

/**
 * The sun and the moon: two discs, half a degree across, both of them.
 *
 * That coincidence is the reason eclipses look the way they do and it is worth
 * seeing on a screen once. Neither was here before - the old sky had a bright
 * smear where the sun was and no sun in it, which is a picture you can neither
 * check nor draw the light in from.
 */
const Disc: React.FC<{
  aim: { azimuth: number; elevation: number };
  /** Half a degree, in radians, unless it is being pushed to stay visible. */
  spread: number;
  colour: [number, number, number];
  /** 1 for the sun; the moon's own lit fraction otherwise. */
  lit: number;
  /** Where the light on it comes from, for a moon with a phase. */
  sunDir: [number, number, number];
  halo: number;
}> = ({ aim, spread, colour, lit, sunDir, halo }) => {
  const uniforms = useMemo(
    () => ({
      middle: { value: new THREE.Vector3() },
      spread: { value: 0.005 },
      colour: { value: new THREE.Color() },
      lit: { value: 1 },
      sunDir: { value: new THREE.Vector3() },
      halo: { value: 0 },
      frameHeight: { value: 1000 },
    }),
    []
  );

  useEffect(() => {
    const [x, y, z] = aimVector(aim.azimuth, aim.elevation);
    uniforms.middle.value.set(x, y, z);
    uniforms.spread.value = spread;
    uniforms.colour.value.setRGB(colour[0], colour[1], colour[2]);
    uniforms.lit.value = lit;
    uniforms.sunDir.value.set(sunDir[0], sunDir[1], sunDir[2]);
    uniforms.halo.value = halo;
  }, [uniforms, aim, spread, colour, lit, sunDir, halo]);

  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mesh.current) mesh.current.position.copy(camera.position);
  });

  const measure = React.useCallback(
    (renderer: THREE.WebGLRenderer) => {
      uniforms.frameHeight.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    },
    [uniforms]
  );

  return (
    <mesh ref={mesh} renderOrder={-997} frustumCulled={false} raycast={() => null} onBeforeRender={measure}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform vec3 middle;
          uniform float spread;
          uniform float frameHeight;
          varying vec2 vCorner;
          varying float vSpread;
          void main() {
            vec4 at = modelViewMatrix * vec4(middle * ${DOME}.0, 1.0);
            float perRadian = projectionMatrix[1][1] * frameHeight * 0.5;
            // Four across, at the very least: a half-degree disc in a
            // three-hundred-degree frame is a third of a pixel, and a moon you
            // cannot see is not a moon. Everywhere else this does nothing.
            float wide = max(spread, 2.0 / max(perRadian, 1.0));
            vSpread = wide / max(spread, 1e-6);
            // Room round the edge for the glow, which is drawn in the same quad.
            at.xy += position.xy * wide * 3.0 * ${DOME}.0;
            gl_Position = projectionMatrix * at;
            vCorner = position.xy * 3.0;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 colour;
          uniform float lit;
          uniform vec3 sunDir;
          uniform vec3 middle;
          uniform float halo;
          varying vec2 vCorner;
          varying float vSpread;
          void main() {
            float out0 = length(vCorner);
            float edge = fwidth(out0) * 1.5 + 0.01;
            float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, out0);

            /*
             * The phase, which is the one thing about the moon everybody draws
             * and most people draw wrong. The terminator is not a chord across
             * the disc - it is the edge of the lit hemisphere seen at an
             * angle, so it is half an ellipse, and the horns always point
             * exactly away from the sun however far under the ground the sun
             * has got. Both of those fall out of asking, per pixel, which way
             * that bit of the sphere faces and whether the sun can see it.
             */
            float shade = 1.0;
            if (lit < 0.999) {
              vec3 out1 = normalize(cross(middle, vec3(0.0, 1.0, 0.0)) + vec3(1e-5));
              vec3 up = cross(out1, middle);
              vec3 face = normalize(middle * sqrt(max(0.0, 1.0 - dot(vCorner, vCorner)))
                + out1 * vCorner.x + up * vCorner.y);
              shade = smoothstep(-0.06, 0.10, dot(face, sunDir));
            }

            float glow = halo * exp(-out0 * out0 * 1.6) / max(vSpread, 1.0);
            gl_FragColor = vec4(colour * (disc * shade + glow), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
};

/** Half the sun's angular diameter, in radians. The moon's is the same. */
const HALF_DEGREE = 0.00465;

export const SkyDome: React.FC = () => {
  const sky = useStore((state) => state.sky);
  const sun = useStore((state) => state.sun);
  const field = useStore((state) => state.fov);
  const scene = useThree((state) => state.scene);
  const moment = useSkyMoment();

  /*
   * The light's own bearing, which the clock may or may not be setting. Read
   * from the store either way, so the sky and the shadows can never disagree.
   */
  const sunAim = useMemo(
    () => ({ azimuth: sun.azimuth, elevation: sun.elevation }),
    [sun.azimuth, sun.elevation]
  );
  const air = useAirColours(sky.air, sunAim, sky.cloud);
  /*
   * What the world past the floor is made of.
   *
   * The tool's own floor tone, taken as an albedo: the plane you are standing
   * on and the plain beyond it are the same ground, and having them be two
   * different greys puts a line at a thousand metres that means nothing.
   */
  const floor = useStore((state) => state.ground.tone);
  const earthTone = useMemo(() => {
    const value = new THREE.Color(`rgb(${floor}, ${floor}, ${floor})`);
    return [value.r, value.g, value.b] as [number, number, number];
  }, [floor]);

  /*
   * ...and the light standing on it, worked out the way three would.
   *
   * The floor and the plain past it have to be the same value or there is a
   * ring a kilometre out where one becomes the other. So this is the sum the
   * renderer does for the floor: the lamp's own colour times what the air
   * leaves of the beam times the cosine, plus the sky light from overhead -
   * which at night is the whole of it, and is why the ground does not simply
   * go black the moment the sun sets.
   */
  const earthLit = useMemo(() => {
    const lamp = temperatureColor(sun.temperature);
    const face = Math.max(0, Math.sin((sunAim.elevation * PI) / 180));
    const overhead = asColour(air.overhead, 1.6);
    const fill = sky.skylight * (1.1 + sky.cloud * 1.6);
    const beamGain = sun.intensity * (1 - 0.82 * sky.cloud) * face;
    return [
      lamp.r * air.beam[0] * beamGain + overhead.r * fill,
      lamp.g * air.beam[1] * beamGain + overhead.g * fill,
      lamp.b * air.beam[2] * beamGain + overhead.b * fill,
    ] as [number, number, number];
  }, [sun.temperature, sun.intensity, sunAim.elevation, air.beam, air.overhead, sky.skylight, sky.cloud]);
  const sunDir = useMemo(
    () => aimVector(sunAim.azimuth, sunAim.elevation),
    [sunAim.azimuth, sunAim.elevation]
  );

  /**
   * Aerial perspective: the air between here and the far end of the picture.
   *
   * This is the other perspective, and the tool had none of it. Leonardo's
   * rule - things far off lose their darks first, then their colour, and end
   * as a flat shape the colour of the sky - is the whole of what makes a mile
   * read as a mile in a drawing, and it is not something linear perspective
   * can say.
   *
   * The density is set so the thousand metres of floor this tool lays down
   * shows it plainly at one atmosphere: about half veiled at a kilometre. That
   * is a hazy day rather than a clear one. Genuinely clear air is thinner than
   * any painting of it has ever been, which is why every painter reaches for
   * more; the knob goes up to a wall of white and down to the vacuum, and the
   * range in between is the whole of the subject.
   */
  /*
   * ONE FOG, MUTATED - never a new one.
   *
   * three folds "is there fog" into a material's compile key and compares the
   * fog OBJECT to decide whether that key has moved. Handing it a fresh
   * FogExp2 whenever the colour changed therefore recompiled every material in
   * the scene on every frame of every drag: measured on the software renderer
   * the suite uses, one drag of the air took three and a half minutes. It is
   * the same stall on a phone, just short enough to be mistaken for the sky
   * being expensive - which it is not. The colour and the density are
   * uniforms, and setting them costs nothing.
   */
  const fog = useMemo(() => new THREE.FogExp2(0x000000, 0), []);
  useEffect(() => {
    const previous = scene.fog;
    scene.fog = fog;
    return () => {
      scene.fog = previous;
    };
  }, [scene, fog]);
  useEffect(() => {
    fog.color.setRGB(air.horizon[0], air.horizon[1], air.horizon[2]);
    fog.density = 0.0007 * sky.air;
  }, [fog, air.horizon, sky.air]);

  /*
   * The moon's light, and the sun's absence.
   *
   * A full moon throws about a four hundred thousandth of the sun, which on a
   * screen is nothing - so this is not the real ratio, it is the ratio a
   * night-adapted eye reports, which is the one worth drawing. It fades in as
   * the sun goes down and out again as the moon sets, and it casts no shadow
   * of its own: two shadow maps is twice the cost for a light that in life
   * casts an edge you can barely find.
   */
  const moonUp = Math.max(0, Math.sin((moment.moon.elevation * PI) / 180));
  const sunDown = Math.max(0, Math.min(1, -sunAim.elevation / 6));
  const moonlight = moment.moon.lit * moonUp * sunDown * 0.55;

  return (
    <>
      <Atmosphere
        air={sky.air}
        cloud={sky.cloud}
        cloudBase={sky.cloudBase}
        sunAim={sunAim}
        starlight={air.starlight}
        stars={sky.stars}
        skyMatrix={moment.sky}
        horizon={air.horizon}
        beam={air.beam}
        earth={earthTone}
        earthLit={earthLit}
      />

      {sky.stars > 0 && air.starlight > 0.01 && (
        <Stars gain={sky.stars * air.starlight} skyMatrix={moment.sky} field={field} />
      )}
      {sky.figures && sky.stars > 0 && air.starlight > 0.01 && (
        <Figures gain={sky.stars * air.starlight} skyMatrix={moment.sky} />
      )}

      {/* The sun, if it is up. Its own colour, reddened by whatever air it has
          had to cross - which is why a low sun is orange and why the halo goes
          with it. In a vacuum there is no halo at all and the disc is white. */}
      {sunAim.elevation > -1 && (
        <Disc
          aim={sunAim}
          spread={HALF_DEGREE}
          colour={[air.beam[0] * 34, air.beam[1] * 34, air.beam[2] * 34]}
          lit={1}
          sunDir={sunDir}
          halo={0.5 * sky.air}
        />
      )}

      {moment.moon.elevation > -1 && (
        <Disc
          aim={moment.moon}
          spread={HALF_DEGREE}
          /* Cold, and not very bright: the moon is a lump of dark rock with
             the albedo of worn tarmac, and it only looks white because of what
             it is seen against. */
          colour={[0.85, 0.88, 1.0]}
          lit={moment.moon.lit}
          sunDir={sunDir}
          halo={0.05 * sky.air * air.starlight}
        />
      )}

      {/*
        * The sky as a light.
        *
        * The rest of this tool has no ambient term at all, deliberately: a face
        * turned from the sun is black, and that value separation is the thing
        * being drawn. Outdoors that is a lie, and a well-known one - the blue
        * side of a white box on a sunny day is the sky, and every painter
        * knows the shadow is blue. So it is a light with the sky's own colour
        * over it and the ground's under it, and it is a knob, because how much
        * of it you want is exactly the argument between a study and a picture.
        */}
      {/*
        * Both of these are mounted whether or not they are doing anything, and
        * turned down to nothing instead of taken away. Adding a light to a
        * scene makes every material in it recompile, so a moon that appears
        * when it rises would stutter the frame in the middle of a drag across
        * the hour - which is precisely the drag somebody makes to WATCH it
        * rise. An intensity of zero costs a multiply.
        */}
      <hemisphereLight
        color={asColour(air.overhead, 1.6)}
        groundColor={asColour(air.horizon, 0.35)}
        intensity={sky.skylight * (1.1 + sky.cloud * 1.6)}
      />

      <directionalLight
        position={
          aimVector(moment.moon.azimuth, Math.max(moment.moon.elevation, 1)).map((v) => v * 60) as [
            number,
            number,
            number,
          ]
        }
        color="#b9c6e8"
        intensity={moonlight}
      />
    </>
  );
};
