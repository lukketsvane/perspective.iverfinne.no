import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../store';
import { constellationFigures, starField } from '../lib/starData';
import { equatorialToWorld, julianDay, moonAt, aimOf } from '../lib/ephemeris';
import { siderealAngle, solarPosition, sunPosition } from '../lib/sky';

/**
 * The sky above the weather: the real stars, the real Milky Way, the moon.
 *
 * There were stars before this and they were invented ones - a hash per cell
 * of the celestial sphere, fixed so the same invented stars came back every
 * night. That is the right answer for a backdrop and the wrong one here,
 * because of what a star sky is FOR in a tool about perspective: it is the one
 * thing in the world with none in it. Everything else the tool draws
 * converges, shrinks, has a vanishing point. The stars do none of it - walk a
 * mile and not one moves by a hair, and the whole sphere turns rigidly without
 * any figure in it changing shape.
 *
 * That lesson is only worth anything if the sky is CHECKABLE. Orion has to be
 * Orion - the belt three in a row, Betelgeuse orange at the shoulder, Rigel
 * blue at the knee - because a shape you recognise is a shape you can watch
 * stay the same while the hours run, and a field of invented stars is a claim
 * nobody can test. It also answers a real question an illustrator has: what
 * was over that hill, at that hour, on that night.
 *
 * So it is the catalogue: the Yale Bright Star Catalogue cut at the naked-eye
 * limit, eight and a half thousand of them, at their true right ascension,
 * declination, magnitude and spectral class. See lib/starData.ts.
 *
 * IT IS DRAWN OVER THE DECK, NOT UNDER IT. The night layer in the cloud dome
 * carries an alpha near one - it is the night sky - so anything behind it is
 * behind a curtain. Stars are seen THROUGH the air, so they are added on top
 * of it, and what cloud does to them is done on the processor instead: a knob
 * on the gain rather than a curtain in front.
 */

/** Inside the cloud dome's own radius, which is inside the camera's far plane. */
const DOME = 1300;

/** Half the moon's angular diameter, in radians. The sun's is the same. */
const HALF_DEGREE = 0.00465;

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

/** Everything celestial, worked out from the place and the moment. */
const useCelestial = () => {
  const time = useStore((state) => state.sky.time);
  const latitude = useStore((state) => state.sky.latitude);
  const longitude = useStore((state) => state.sky.longitude);
  const simulate = useStore((state) => state.sky.simulate);
  const handSet = useStore((state) => state.sun.elevation);

  return useMemo(() => {
    const at = new Date(time);
    const sidereal = siderealAngle(at, longitude);
    const jd = julianDay(at);
    const moon = moonAt(jd);
    /*
     * How far under the sun is, which is the whole of how dark it is.
     *
     * The same reading the cloud dome takes and for the same reason: the
     * light's own elevation is held above the horizon so a directional lamp
     * does not rake the scene from underneath, so the night cannot be read off
     * it. With the clock off there is no hour to ask, and the hand-set light
     * is all there is.
     */
    const below = simulate ? solarPosition(at, latitude, longitude).elevation : handSet;
    return {
      matrix: equatorialToWorld(latitude, sidereal),
      moon: { ...aimOf(moon, latitude, sidereal), lit: moon.lit },
      /** Nothing at all until the sun is down, everything by the end of twilight. */
      night: THREE.MathUtils.smoothstep(-below, 0, 13),
      below,
    };
  }, [time, latitude, longitude, simulate, handSet]);
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
 * point source, and every disc you have seen in a photograph of one is the
 * instrument. What varies with brightness is how much that point spills, so
 * the quad grows slowly, as the fourth root of the flux, while the middle of
 * it grows quickly - which between them keep the total light about
 * proportional to the real thing across the nine magnitudes in the catalogue.
 */
const Stars: React.FC<{ gain: number; matrix: number[]; field: number }> = ({ gain, matrix, field }) => {
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
  useEffect(() => () => geometry.dispose(), [geometry]);
  geometry.instanceCount = starsWorthDrawing(starField().count, field);

  const uniforms = useMemo(
    () => ({
      sky: { value: new THREE.Matrix3() },
      gain: { value: 0 },
      /** The height of whatever is being drawn into, in pixels. */
      frameHeight: { value: 1000 },
    }),
    []
  );
  useEffect(() => {
    uniforms.sky.value.fromArray(matrix);
    uniforms.gain.value = gain;
  }, [uniforms, matrix, gain]);

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
      uniforms.frameHeight.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    },
    [uniforms]
  );

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      renderOrder={2}
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
          uniform mat3 sky;
          uniform float gain;
          uniform float frameHeight;
          varying vec2 vCorner;
          varying vec3 vTint;
          varying float vGlow;

          void main() {
            vec3 aim = sky * whereStar;
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
             * horizontally, which is past the edge of the floor this tool lays
             * down - so without this the whole southern sky comes up through
             * the ground. The narrow band it fades across is roughly where the
             * real thing goes: the last degree above a horizon is where the
             * air puts a star out.
             */
            vGlow = gain * 0.06 * pow(flux, 0.52) * smoothstep(-0.012, 0.022, aim.y);
          }
        `}
        fragmentShader={/* glsl */ `
          varying vec2 vCorner;
          varying vec3 vTint;
          varying float vGlow;
          void main() {
            float away = dot(vCorner, vCorner);
            if (away > 1.0) discard;
            // A soft core with a little spill, which is what a point source
            // looks like through an eye, a lens or a sheet of paper.
            gl_FragColor = vec4(vTint * vGlow * exp(-away * 5.5), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
};

/**
 * The Milky Way: the stars too far off to resolve, seen edge-on through the
 * disc of our own galaxy.
 *
 * In galactic coordinates, so it lies across the catalogue where it really
 * lies - through Cygnus overhead in a northern summer and down into
 * Sagittarius, where the middle of the galaxy is and where the band is
 * brightest and most broken. Drawn in the same frame as the stars, which is
 * the only way to be sure the band and the stars agree: two frames is two
 * chances to put the galaxy through the wrong constellation.
 */
const MilkyWay: React.FC<{ gain: number; matrix: number[] }> = ({ gain, matrix }) => {
  const uniforms = useMemo(
    () => ({ sky: { value: new THREE.Matrix3() }, gain: { value: 0 } }),
    []
  );
  useEffect(() => {
    uniforms.sky.value.fromArray(matrix);
    uniforms.gain.value = gain;
  }, [uniforms, matrix, gain]);

  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mesh.current) mesh.current.position.copy(camera.position);
  });

  return (
    <mesh ref={mesh} renderOrder={1} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[DOME, 48, 24]} />
      <shaderMaterial
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform mat3 sky;
          uniform float gain;
          varying vec3 vDir;

          /* The galactic pole and centre, in the catalogue's own frame. */
          const vec3 POLE = vec3(-0.8676, -0.1979, 0.4560);
          const vec3 CENTRE = vec3(-0.0548, -0.8734, -0.4839);

          void main() {
            vec3 dir = normalize(vDir);
            if (dir.y < 0.0 || gain <= 0.0) discard;
            // Transposing a rotation inverts it: world back into the catalogue.
            vec3 celestial = dir * sky;
            float across = dot(celestial, POLE);
            float band = exp(-across * across * 34.0);
            /*
             * The mottling is sines of the angle ALONG the band rather than
             * noise, because noise on an angle has a seam where the angle
             * wraps - and a seam down the middle of the galaxy is the single
             * most visible artefact this shader could have. Sines close.
             */
            float along = atan(celestial.z, celestial.x);
            float clouds = 0.52 + 0.48 * sin(along * 2.0 + 0.6) * sin(along * 5.0 + 2.3);
            float lane = (across + 0.035 * sin(along * 3.0 + 1.1)) * 24.0;
            float rift = 1.0 - 0.6 * exp(-lane * lane);
            float towards = 0.5 + 0.5 * dot(celestial, CENTRE);
            float glow = band * clouds * rift * (0.30 + 1.5 * pow(towards, 3.0));
            gl_FragColor = vec4(vec3(0.052, 0.050, 0.062) * glow * gain
              * smoothstep(0.0, 0.16, dir.y), 1.0);
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
 * something people drew on them four thousand years ago. Faint, so what you
 * read is still the sky with a line through it.
 */
const Figures: React.FC<{ gain: number; matrix: number[] }> = ({ gain, matrix }) => {
  const geometry = useMemo(() => {
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(constellationFigures(), 3));
    return shape;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({ sky: { value: new THREE.Matrix3() }, gain: { value: 0 } }), []);
  useEffect(() => {
    uniforms.sky.value.fromArray(matrix);
    uniforms.gain.value = gain;
  }, [uniforms, matrix, gain]);

  const { camera } = useThree();
  const lines = useRef<THREE.LineSegments>(null);
  useFrame(() => {
    if (lines.current) lines.current.position.copy(camera.position);
  });

  return (
    <lineSegments ref={lines} geometry={geometry} renderOrder={3} frustumCulled={false} raycast={() => null}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform mat3 sky;
          varying float vUp;
          void main() {
            vec3 aim = sky * position;
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
 * A disc half a degree across: the moon, or the sun where nothing else is
 * drawing one.
 *
 * That the two are the same size is why eclipses look the way they do, and it
 * is worth seeing on a screen once.
 */
const Disc: React.FC<{
  azimuth: number;
  elevation: number;
  colour: [number, number, number];
  /** 1 for the sun; the moon's own lit fraction otherwise. */
  lit: number;
  sunDir: [number, number, number];
  halo: number;
}> = ({ azimuth, elevation, colour, lit, sunDir, halo }) => {
  const uniforms = useMemo(
    () => ({
      middle: { value: new THREE.Vector3() },
      colour: { value: new THREE.Color() },
      lit: { value: 1 },
      sunDir: { value: new THREE.Vector3() },
      halo: { value: 0 },
      frameHeight: { value: 1000 },
    }),
    []
  );

  useEffect(() => {
    const [x, y, z] = sunPosition(azimuth, elevation);
    uniforms.middle.value.set(x, y, z).normalize();
    uniforms.colour.value.setRGB(colour[0], colour[1], colour[2]);
    uniforms.lit.value = lit;
    uniforms.sunDir.value.set(sunDir[0], sunDir[1], sunDir[2]).normalize();
    uniforms.halo.value = halo;
  }, [uniforms, azimuth, elevation, colour, lit, sunDir, halo]);

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
    <mesh ref={mesh} renderOrder={4} frustumCulled={false} raycast={() => null} onBeforeRender={measure}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform vec3 middle;
          uniform float frameHeight;
          varying vec2 vCorner;
          varying float vStretch;
          void main() {
            vec4 at = modelViewMatrix * vec4(middle * ${DOME}.0, 1.0);
            float perRadian = projectionMatrix[1][1] * frameHeight * 0.5;
            // Four pixels across at the very least: half a degree in a three
            // hundred degree frame is a third of a pixel, and a moon you
            // cannot see is not a moon. Everywhere else this does nothing.
            float wide = max(${HALF_DEGREE}, 2.0 / max(perRadian, 1.0));
            vStretch = wide / ${HALF_DEGREE};
            // Room round the edge for the glow, drawn in the same quad.
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
          varying float vStretch;
          void main() {
            float away = length(vCorner);
            float edge = fwidth(away) * 1.5 + 0.01;
            float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, away);

            /*
             * The phase, which is the one thing about the moon everybody draws
             * and most people draw wrong. The terminator is not a chord across
             * the disc - it is the edge of the lit hemisphere seen at an angle,
             * so it is half an ellipse - and the horns point exactly away from
             * the sun, however far under the ground the sun has got. Both fall
             * out of asking, per pixel, which way that bit of the sphere faces
             * and whether the sun can see it.
             */
            float shade = 1.0;
            if (lit < 0.999) {
              vec3 across = normalize(cross(middle, vec3(0.0, 1.0, 0.0)) + vec3(1e-5));
              vec3 up = cross(across, middle);
              vec3 face = normalize(middle * sqrt(max(0.0, 1.0 - dot(vCorner, vCorner)))
                + across * vCorner.x + up * vCorner.y);
              shade = smoothstep(-0.06, 0.10, dot(face, sunDir));
            }

            float glow = halo * exp(-away * away * 1.6) / max(vStretch, 1.0);
            gl_FragColor = vec4(colour * (disc * shade + glow), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
};

export const Starfield: React.FC = () => {
  const stars = useStore((state) => state.sky.stars);
  const figures = useStore((state) => state.sky.figures);
  const air = useStore((state) => state.sky.air);
  const cover = useStore((state) => state.sky.cover);
  const field = useStore((state) => state.fov);
  const sun = useStore((state) => state.sun);
  const celestial = useCelestial();

  /*
   * HOW MUCH OF THE SKY SURVIVES THE SKY.
   *
   * Not physics - a sixth-magnitude star is up there at noon and the
   * arithmetic knows it. It is the eye, which cannot open wide enough for one
   * while a blue sky is filling it. Three things put them out: daylight, cloud
   * in the way, and nothing else.
   *
   * The one place it comes out strange is the one place it is right. With the
   * air turned off there is no sky to drown anything, so the whole catalogue
   * is out at midday - which is exactly what standing on the moon looks like.
   */
  const airless = 1 - Math.min(1, air);
  const gain = stars * Math.max(celestial.night, airless) * (1 - cover * 0.8);

  const sunDir = useMemo(() => {
    const [x, y, z] = sunPosition(sun.azimuth, sun.elevation);
    const length = Math.hypot(x, y, z) || 1;
    return [x / length, y / length, z / length] as [number, number, number];
  }, [sun.azimuth, sun.elevation]);

  return (
    <>
      {gain > 0.004 && <MilkyWay gain={gain} matrix={celestial.matrix} />}
      {gain > 0.004 && <Stars gain={gain} matrix={celestial.matrix} field={field} />}
      {figures && gain > 0.004 && <Figures gain={gain} matrix={celestial.matrix} />}

      {/* The moon, in its real place, with its real phase. Cold and not very
          bright: it is a lump of dark rock with the albedo of worn tarmac, and
          it only looks white because of what it is seen against. */}
      {celestial.moon.elevation > -1 && (
        <Disc
          azimuth={celestial.moon.azimuth}
          elevation={celestial.moon.elevation}
          colour={[0.85, 0.88, 1.0]}
          lit={celestial.moon.lit}
          sunDir={sunDir}
          halo={0.05 * air * Math.max(celestial.night, airless)}
        />
      )}

      {/*
        * And the sun, but ONLY where nothing else is drawing one.
        *
        * With air in the sky the scattering model draws its own, glare and
        * all. With the air turned off there is no model and no glare - so
        * there would be no sun either, in the one picture where the sun is
        * the whole of the light: a hard white disc on a black sky, which is
        * what it looks like from anywhere without an atmosphere.
        */}
      {air < 0.05 && sun.elevation > -0.6 && (
        <Disc
          azimuth={sun.azimuth}
          elevation={sun.elevation}
          colour={[34, 34, 34]}
          lit={1}
          sunDir={sunDir}
          halo={0}
        />
      )}
    </>
  );
};
