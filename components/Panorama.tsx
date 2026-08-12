import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fieldOf, stereographicAngle } from '../lib/projection';
import { registerFrameRenderer } from '../lib/capture';
import { sceneRevision } from '../lib/sceneRevision';
import type { PerspectiveMode } from '../types';

/**
 * The curvilinear view: five-point, rendered rather than warped.
 *
 * The scene goes onto the six faces of a cube, and one full-screen pass asks,
 * for every pixel, "what is along this ray" and reads it off the cube. That is
 * what makes the difference between this and a post-process fisheye:
 *
 *  - lines stay smooth, because nothing is resampled from a stretched flat
 *    image
 *  - the field can be the entire 360, because there is a picture in every
 *    direction to read, not just what fitted in a flat frame
 *  - the zenith and the nadir are really there, which is what makes it five
 *    point rather than a bulged two point
 *
 * The projection is equidistant: distance from the centre of the frame is the
 * angle away from where you are looking, the same in every direction. Left,
 * right, up, down and straight ahead all reachable at once - which is the
 * construction Kim Jung Gi rules a page with before he draws a room.
 */
/** What each projection is, to the shader. Equidistant is zero. */
const PROJECTION_MODES: Record<PerspectiveMode, number> = {
  equidistant: 0,
  cylindrical: 2,
  stereographic: 6,
};

const HALF_PI = Math.PI / 2;

/**
 * How far off the axis the corner of the frame may reach before the picture is
 * read off the cube rather than off one flat pass.
 *
 * Sixty degrees. A flat frustum reaching that far is a hundred and twenty
 * degrees across the diagonal - wide, and still a sensible thing to render, its
 * tangent under two. Past it the tangent runs away and the pass would spend
 * most of its pixels on the corners.
 */
const FLAT_LIMIT = Math.PI / 3;

/** A little more frustum than the frame strictly needs, against rounding. */
const MARGIN = 1.02;

/** And a little more resolution than the screen, so the resample is a downsample. */
const SHARPEN = 1.15;

type Sheet =
  | { source: 'cube'; faceSize: number }
  | { source: 'flat'; tanX: number; tanY: number; width: number; height: number };

/**
 * Which source, and how big, for a frame of this shape at this field.
 *
 * Density is how many source pixels are wanted per CSS pixel of frame, and the
 * two branches want different numbers - which is why it is two numbers. A flat
 * pass is one render into one texture, so it can afford to be denser than the
 * glass and should be, since a source denser than its destination is what turns
 * the resample into a downsample. A cube is six of them and lives between
 * frames, so every step up costs four times the video memory; it takes what the
 * canvas actually has and no more.
 *
 * For a picture being taken away, both become however many times larger the
 * picture is. That is the whole of what makes the export sharper: the same
 * sums, asked for a bigger frame, with the cap lifted because it happens once.
 */
export const sheetFor = (
  mode: PerspectiveMode,
  spread: number,
  cssWidth: number,
  cssHeight: number,
  density: { flat: number; cube: number },
  faceCap = cssWidth < 700 ? 1024 : 2048
): Sheet => {
  const { halfYaw, halfPitch } = fieldOf(spread, cssWidth, cssHeight);

  /** How far off the axis the corner of the frame reaches. */
  const corner =
    mode === 'cylindrical'
      ? Math.acos(
          Math.max(-1, Math.min(1, Math.cos(Math.min(halfYaw, Math.PI)) * Math.cos(Math.min(halfPitch, HALF_PI))))
        )
      : mode === 'stereographic'
        ? stereographicAngle(Math.hypot(halfYaw, halfPitch), Math.max(halfYaw, halfPitch))
        : Math.hypot(halfYaw, halfPitch);

  if (corner > FLAT_LIMIT) {
    // The picture is read off the cube by angle, so what matters is how many
    // pixels of source there are per degree of view against how many pixels of
    // screen there are to fill.
    /*
     * Off the LONGEST edge, because that is the edge the field follows.
     *
     * It measured the width. On a portrait phone that is short by the aspect
     * ratio - more than a factor of two on a 390 by 844 frame - and the floor
     * below then swallowed the difference, so a phone at a hundred and twenty
     * degrees was drawing about half a source pixel per screen pixel. The
     * picture was being MAGNIFIED, which is the exact failure the flat pass was
     * added to cure, and it started at the field just past where the flat pass
     * hands over.
     *
     * Rounded UP to a power of two, and the floor applied after the rounding
     * rather than before it. Applying it first made the density non-monotonic
     * in the field - as `wanted` crossed 512 the rounding landed on the other
     * side of the floor - so dragging the lens made the picture sharper, then
     * blurrier, then sharper again.
     */
    const wanted =
      (90 / Math.max(spread, 20)) * Math.max(cssWidth, cssHeight) * density.cube * SHARPEN;
    const stepped = 2 ** Math.ceil(Math.log2(Math.max(1, wanted)));
    return { source: 'cube', faceSize: Math.min(faceCap, Math.max(512, stepped)) };
  }

  /*
   * The flat frustum, in tangent units.
   *
   * Every direction the frame asks for lies within `corner` of the axis, and
   * the one furthest out along each screen axis is at the corner itself - so
   * the extents are the frame's own half-angles, scaled by however much the
   * tangent has run ahead of the angle by the time it gets there.
   */
  const cornerRadius = mode === 'cylindrical' ? 0 : Math.hypot(halfYaw, halfPitch);
  const stretch = Math.tan(corner) / Math.max(cornerRadius || corner, 1e-6);
  const tanX = (mode === 'cylindrical' ? Math.tan(halfYaw) : halfYaw * stretch) * MARGIN;
  const tanY =
    (mode === 'cylindrical' ? Math.tan(halfPitch) / Math.cos(halfYaw) : halfPitch * stretch) * MARGIN;

  /*
   * And how many pixels of it.
   *
   * Enough that the middle of the flat render is at least as dense as the
   * middle of the frame: resampling a source denser than its destination is a
   * downsample, which softens nothing and smooths the stair steps a same-size
   * resample would leave. The frame's own half-angles are its density, so the
   * ratio of tangent to angle is the ratio of sizes.
   */
  const cap = (value: number) => Math.max(256, Math.min(4096, Math.round(value)));
  return {
    source: 'flat',
    tanX,
    tanY,
    width: cap(cssWidth * density.flat * (tanX / Math.max(halfYaw, 1e-6))),
    height: cap(cssHeight * density.flat * (tanY / Math.max(halfPitch, 1e-6))),
  };
};

/**
 * What to ask drei for, to get the width you actually wanted on the sheet.
 *
 * `Line2` offsets by `linewidth / resolution` in clip space, and drei sets that
 * resolution to the CANVAS size - while this app never draws to the canvas. The
 * pass is rasterised into a cube face or a flat target and then re-projected,
 * and the exporter runs it all again three times larger. So a width asked for
 * in canvas pixels is that width in none of those places: a box's twelve edges
 * came out a different weight from a mesh's ink contour standing beside it, and
 * changed weight as the field was dragged.
 *
 * Two lines of arithmetic, and the interesting part is that they disagree about
 * which way to go. On the flat pass the answer is within two per cent of one,
 * which is why a fixed 1.5 looked fine at ordinary fields. On the cube it is
 * 4 * halfYaw / PI - so the width has to GROW as the lens opens, because the
 * face stays the same size while the sheet it feeds spreads over more of the
 * world. The face size cancels out entirely, which is what makes this a number
 * and not a table.
 */
export const penScale = (
  mode: PerspectiveMode,
  spread: number,
  cssWidth: number,
  cssHeight: number,
  dpr: number
): number => {
  const { halfYaw } = fieldOf(spread, cssWidth, cssHeight);
  const plan = sheetFor(mode, spread, cssWidth, cssHeight, {
    flat: Math.min(dpr, 2.5) * SHARPEN,
    cube: Math.min(dpr, 2),
  });
  return plan.source === 'cube'
    ? (4 * halfYaw) / Math.PI
    : halfYaw / Math.max(plan.tanX, 1e-6);
};

export const Panorama: React.FC<{
  spread: number;
  mode: PerspectiveMode;
  /**
   * Let the cylindrical band repeat past a full turn instead of running out
   * into paper - the same room again and again along one endless frieze. Only
   * the cylinder can promise this: yaw is periodic by construction, so the
   * copies join without a seam. The radial systems keep their edge, which is
   * the whole sphere on the page.
   */
  repeat?: boolean;
  /** The construction's colour. One ink for the whole of it. */
  gridColor: THREE.Color;
  /**
   * The two rungs, separately.
   *
   * The eye level and the six points are what you set a drawing up with and
   * are wanted nearly always; the ruled sphere behind them is a lesson in what
   * the projection is doing and is wanted while you learn it. They used to be
   * one switch, which is why the level between them was empty and nobody
   * stopped there.
   */
  pointStrength: number;
  sheetStrength: number;
  /** The paper the sheet is drawn on, for wherever the sheet is not. */
  surround: THREE.Color;
}> = ({ spread, mode, gridColor, pointStrength, sheetStrength, surround, repeat = false }) => {
  const { gl, scene, camera, size, viewport } = useThree();

  /**
   * Where the picture is read from, and how big it has to be.
   *
   * A cube is the right shape to read a *wide* field off: it has a picture in
   * every direction, so a 360 degree frame has something to show at every pixel
   * of it. It is a poor shape to read a narrow one off. A face spans ninety
   * degrees whatever the lens is doing, so a thirty degree frame is a third of a
   * face stretched across the whole screen - a few hundred pixels of source
   * behind a couple of thousand pixels of glass, which is what made a figure's
   * hair go blocky the moment anybody zoomed in on it. Making the faces bigger
   * is not the answer either: six faces at 4096 is four hundred megabytes of
   * video memory, and most of it is behind you.
   *
   * So a narrow field is read off a single flat render instead - one ordinary
   * perspective pass, wide enough to cover every direction the frame asks for,
   * at the resolution of the screen and a little over. The old objection to
   * warping a flat render does not apply here: it was that a flat frame has no
   * picture past its own edge to bend into view, and that stretching one
   * magnifies every jagged edge in it. Neither is true when the frame is
   * narrower than the source and the source is denser than the screen. It is
   * also one render rather than six.
   *
   * Which leaves only the question of where to change over, and the answer is
   * where a flat frustum stops being a sensible thing to render: about sixty
   * degrees out from the axis, at the corner of the frame. Past that the cube
   * takes it, by which point the cube has enough face to spare.
   */
  const sheet: Sheet = useMemo(
    () =>
      sheetFor(mode, spread, size.width, size.height, {
        // Denser than the glass, deliberately: the canvas runs at a capped
        // pixel ratio to keep sixty frames a second, and the source is what
        // decides whether the picture is magnified or supersampled.
        flat: Math.min(typeof window === 'undefined' ? 2 : window.devicePixelRatio || 1, 2.5) * SHARPEN,
        // Held at 1.5 rather than following the canvas. This is six faces, so
        // its cost is the one that matters, and 1.5 is what it was already
        // getting when the canvas was capped there - raising the canvas to
        // sharpen the picture should not quietly multiply this by six.
        cube: Math.min(viewport.dpr, 1.5),
      }),
    [mode, spread, size.width, size.height, viewport.dpr]
  );

  // Narrowed once, here, so every use below is a plain object or null rather
  // than a discriminated union threaded through five closures and a dep array.
  const wideSheet = sheet.source === 'cube' ? sheet : null;
  const flatSheet = sheet.source === 'flat' ? sheet : null;

  /** The full-screen pass that turns whichever source it is into the picture. */
  const optics = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        panorama: { value: null },
        flatMap: { value: null },
        flatTan: { value: new THREE.Vector2(1, 1) },
        useFlat: { value: false },
        halfYaw: { value: 1 },
        halfPitch: { value: 1 },
        orientation: { value: new THREE.Matrix3() },
        projectionMode: { value: 0 },
        repeatYaw: { value: 0 },
        gridColor: { value: new THREE.Color() },
        /** The eye level and the points: the first rung of the guides. */
        /**
         * Whether to encode the frame for display on the way out.
         *
         * three forces a render target's output colour space to linear for
         * anything that is not an XR target, so the colourspace include below
         * is a no-op on the export path and only on the export path: the live
         * frame goes to the canvas and is converted, the exported one goes to a
         * target and is not. Every PNG this tool has ever written has been in
         * linear light - midtones crushed, ink mass roughly tripled, a muddier
         * and heavier picture than the one on screen.
         *
         * Done here rather than after the readback so the eight-bit
         * quantisation still happens in display space; a lookup table applied
         * to the bytes afterwards would band the darks.
         */
        encodeOutput: { value: 0 },
        pointStrength: { value: 0 },
        /** The ruled sphere behind them: the second. */
        sheetStrength: { value: 0 },
        surround: { value: new THREE.Color() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform samplerCube panorama;
        uniform sampler2D flatMap;
        uniform vec2 flatTan;
        uniform bool useFlat;
        uniform float halfYaw;
        uniform float halfPitch;
        uniform mat3 orientation;
        uniform int projectionMode;
        uniform float repeatYaw;
        uniform vec3 gridColor;
        uniform float encodeOutput;
        uniform float pointStrength;
        uniform float sheetStrength;
        uniform vec3 surround;
        varying vec2 vUv;

        const float PI = 3.14159265359;
        const float HALF_PI = 1.57079632679;
        /** Fifteen degrees, the spacing Kim Jung Gi rules his sphere at. */
        const float SPACING = PI / 12.0;

        /**
         * A line of constant width in *pixels*, wherever the coordinate crosses
         * a multiple of the spacing.
         *
         * Dividing by the screen-space derivative is what keeps it one pixel
         * wide whether the meridians are splayed across the middle of the frame
         * or crowded at the edge of a 360 degree field. It is also what
         * antialiases it: no sampling, no polyline, no stair steps.
         */
        float ruled(float coord, float widthPx) {
          float f = coord / SPACING;
          float d = abs(fract(f - 0.5) - 0.5) / max(fwidth(f), 1e-5);
          return 1.0 - smoothstep(0.0, widthPx, d);
        }

        void main() {
          vec2 clip = vUv * 2.0 - 1.0;
          vec3 direction = vec3(0.0, 0.0, -1.0);

          /*
           * Off the sheet.
           *
           * Every one of these projections covers a bounded piece of the world -
           * a sphere, or a band between the zenith and the nadir - and past its
           * edge there is no direction to ask about at all. That edge used to be
           * off the frame in every field the tool would accept, so what happened
           * beyond it never showed: the radial modes painted flat black and the
           * cylindrical one folded the sky back over itself. Now that the field
           * opens wide enough to bring the whole sheet onto the page, the edge
           * is the most important line in the picture, and what is outside it is
           * paper.
           *
           * The paper goes down the same path as everything else rather than
           * returning early, so it gets the same conversion out of the working
           * space on the way to the screen. Written straight it came out a shade
           * off the background it was supposed to be continuous with - which is
           * the one thing a surround must never be.
           */
          bool offSheet = false;

          if (projectionMode == 2) { // cylindrical
            float yaw = clip.x * halfYaw;
            float pitch = clip.y * halfPitch;
            // A band has a top and a bottom: past the zenith is not more sky.
            // Sideways is different - yaw is periodic, so with the endless
            // range on, past a full turn is simply the room again.
            offSheet = abs(pitch) > HALF_PI || (repeatYaw < 0.5 && abs(yaw) > PI);
            direction = vec3(sin(yaw) * cos(pitch), sin(pitch), -cos(yaw) * cos(pitch));
          } else {
            /*
             * Equidistant, and the five-point sheet, which is the same mapping
             * opened out to the whole hemisphere and beyond: nothing is clipped
             * away at 180, so the zenith and the nadir are both on the page
             * along with the four points around the horizon.
             *
             * Half a turn from the middle of the frame is the far pole, and the
             * whole world is inside it. Five point is cut there too now: it was
             * the one mode left uncut, and past the pole the mapping folds the
             * sphere back through itself, which drew the corners of a wide
             * frame as a mirror of its middle.
             */
            vec2 radial = vec2(clip.x * halfYaw, clip.y * halfPitch);
            float radius = length(radial);

            /*
             * Both radial systems differ in exactly one line: how far off the
             * axis a given distance from the middle of the frame is.
             *
             * Equidistant reads that distance as the angle itself, which is
             * what makes it a ruler. Stereographic reads it as the tangent of
             * the half angle, which is what makes it conformal - every angle in
             * the world is the same angle on the page, at the rim as much as at
             * the centre - and which never reaches half a turn however far out
             * the pixel is, so a stereographic frame has no dead paper in its
             * corners at all.
             */
            float theta = radius;
            if (projectionMode == 6) {
              // Not named "half": that is a reserved word in GLSL ES, and a
              // shader that will not compile draws nothing at all rather than
              // drawing something wrong.
              float field = max(halfYaw, halfPitch);
              float halfField = min(field, 3.1) * 0.5;
              theta = 2.0 * atan(tan(halfField) / max(field, 1e-6) * radius);
            }
            offSheet = theta > PI;

            if (radius > 1e-5) {
              direction = vec3(radial * (sin(theta) / radius), -cos(theta));
            }
          }

          vec3 world = orientation * normalize(direction);

          /*
           * Two ways to ask what is along a ray.
           *
           * Off the cube, by world direction, which works everywhere and is the
           * only thing that works at all past a flat frustum; or out of a single
           * flat render taken along this very axis, which is sharper for as long
           * as one flat frustum can hold the whole frame. The second is a
           * perspective divide and nothing else, because a flat render *is* the
           * tangent of the angle.
           */
          vec4 sampled;
          if (useFlat) {
            float ahead = max(-direction.z, 1e-4);
            vec2 flatUv = vec2(direction.x / ahead / flatTan.x, direction.y / ahead / flatTan.y) * 0.5 + 0.5;
            sampled = texture2D(flatMap, flatUv);
          } else {
            sampled = textureCube(panorama, world);
          }

          gl_FragColor = offSheet ? vec4(surround, 1.0) : sampled;
          #include <colorspace_fragment>

          // The construction sheet, drawn where it belongs - on the sphere,
          // per pixel, rather than sampled into a polyline on top.
          if (!offSheet && max(pointStrength, sheetStrength) > 0.001) {
            float worldYaw = atan(world.x, -world.z);
            float worldPitch = asin(clamp(world.y, -1.0, 1.0));

            /*
             * One family of meridians, and only one.
             *
             * There used to be three, in three colours, all at once: these,
             * plus a set ruled on latitude, plus another set of great circles
             * about the Z axis. Forty-seven curves in red, green and blue over
             * the thing you are trying to draw.
             *
             * The latitude family was not a family of meridians at all -
             * constant latitude gives parallels, concentric rings that converge
             * on nothing, so they were not the image of any set of parallel
             * lines in the world and there was nothing to rule towards. The Z
             * family was honest, but plus and minus Z is whichever way the file
             * happened to be authored, and once you have turned your head it is
             * not an axis of anything you are drawing.
             *
             * These are the ones that survive both tests. Every upright edge in
             * the world runs along one of them, they meet overhead and
             * underfoot, and that meeting is the fifth point - which is the
             * whole thing the sheet is here to show.
             *
             * The pole fade that used to be on all three is gone too: it erased
             * the family over a thirty-five degree disc centred on the pole,
             * which is to say it deleted the crowding that IS the vanishing
             * point and kept the noise everywhere else.
             */
            /*
             * THE WIDTHS ARE IN RENDER PIXELS, and the render is at device
             * resolution or above - so 1.6 here was about half a CSS pixel
             * on a phone, and the construction this tool exists to teach was
             * a thread you had to hunt for over the drawing. These lines are
             * the lesson: they are drawn at the weight of a pencil line laid
             * with a straightedge, clearly over the picture, because reading
             * the form against them is the entire exercise. The meridians
             * stay lighter than the horizon - a ruled sheet supports, the eye
             * level states.
             */
            float verticals = ruled(worldYaw, 2.2) * 0.42;

            // The eye-level ring is the one that matters most
            float horizon =
              (1.0 - smoothstep(0.0, 3.0, abs(worldPitch) / max(fwidth(worldPitch), 1e-5))) * 0.92;

            /*
             * The five points.
             *
             * A curvilinear study is ruled towards them the way a flat one is
             * ruled towards two: the four around you - ahead, behind, left,
             * right - and the two above and below, of which the visible one is
             * the fifth. They are fixed to the world, not to the frame, so they
             * slide as you turn and stay where the room says they are, which is
             * the whole lesson.
             *
             * Each is drawn as a ring at a fixed angular radius, so it is the
             * same size on the page wherever the projection puts it.
             */
            float vp = 0.0;
            for (int axis = 0; axis < 6; axis++) {
              vec3 towards = vec3(0.0);
              if (axis == 0) towards = vec3(0.0, 0.0, -1.0);
              else if (axis == 1) towards = vec3(0.0, 0.0, 1.0);
              else if (axis == 2) towards = vec3(-1.0, 0.0, 0.0);
              else if (axis == 3) towards = vec3(1.0, 0.0, 0.0);
              else if (axis == 4) towards = vec3(0.0, 1.0, 0.0);
              else towards = vec3(0.0, -1.0, 0.0);

              float away = acos(clamp(dot(world, towards), -1.0, 1.0));
              // A ring, and a dot at the point itself - at the same weight as
              // the horizon they punctuate.
              vp = max(vp, 1.0 - smoothstep(0.0, 3.0, abs(away - 0.052) / max(fwidth(away), 1e-5)));
              vp = max(vp, 1.0 - smoothstep(0.0, 1.0, away / max(fwidth(away) * 3.2, 1e-5)));
            }

            /*
             * One ink, for all of it.
             *
             * The three colours were meant to say which family a curve belonged
             * to. With one family left there is nothing to tell apart, and a
             * construction drawn in three saturated hues over a drawing in
             * black competes with the drawing instead of supporting it. A
             * builder rules his sheet in one pencil.
             */
            float ink = max(
              max(horizon, vp * 0.9) * pointStrength,
              verticals * sheetStrength
            );
            gl_FragColor.rgb = mix(gl_FragColor.rgb, gridColor, ink);
          }

          /*
           * Off on the way to the glass, which converts for itself; on for the
           * export, whose target does not.
           *
           * The real sRGB transfer, not a plain 1/2.2 power. The curve has a
           * short linear foot before the exponent and a scale and offset after
           * it, and leaving those out is worth nothing at the ends and seven or
           * eight levels through the middle - which is precisely where a
           * drawing's tone lives.
           */
          if (encodeOutput > 0.5) {
            vec3 c = max(gl_FragColor.rgb, vec3(0.0));
            gl_FragColor.rgb = mix(
              c * 12.92,
              1.055 * pow(c, vec3(0.41666)) - 0.055,
              step(vec3(0.0031308), c)
            );
          }
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    return { material, quadScene, quadCamera: new THREE.Camera() };
  }, []);

  useEffect(() => () => optics.material.dispose(), [optics]);

  /** Six faces of world, for a field too wide for one flat frustum. */
  const cube = useMemo(() => {
    if (!wideSheet) return null;
    /*
     * Mipmapped, like the export's.
     *
     * The reprojection squeezes the source hard towards the rim of a wide field
     * - equidistant compresses tangentially by sin(theta)/theta, so a 512 face
     * at a full turn is minified about sevenfold out there - and bilinear only
     * ever averages two pixels by two. What comes back is sparkle, and on the
     * ground it reads as a smoky aliased dome rather than a set of lines.
     *
     * It costs a third more memory and one mip generation per cube update, and
     * the cube is only rebuilt when you MOVE, so looking around pays nothing.
     */
    const target = new THREE.WebGLCubeRenderTarget(wideSheet.faceSize, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
    });
    return { target, camera: new THREE.CubeCamera(0.05, 2000, target) };
  }, [wideSheet?.faceSize]);

  useEffect(() => () => cube?.target.dispose(), [cube]);

  /** One flat pass, for a field that fits in one. */
  const flat = useMemo(() => {
    if (!flatSheet) return null;
    const target = new THREE.WebGLRenderTarget(flatSheet.width, flatSheet.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      // The same four samples the export takes. This is the path the default
      // ninety-degree field uses, so it is where most people spend most of
      // their time, and it is what takes the staircase off a box's edge.
      samples: 4,
    });
    const camera = new THREE.PerspectiveCamera(
      (2 * Math.atan(flatSheet.tanY) * 180) / Math.PI,
      flatSheet.tanX / flatSheet.tanY,
      0.05,
      2000
    );
    return { target, camera };
  }, [flatSheet?.width, flatSheet?.height, flatSheet?.tanX, flatSheet?.tanY]);

  useEffect(() => () => flat?.target.dispose(), [flat]);

  /**
   * What the source was last drawn for.
   *
   * A cube map is indexed by direction, so turning your head does not
   * invalidate it - only moving does, or the scene itself changing. That is six
   * renders saved on every frame spent looking around, or dragging the sun, or
   * doing anything at all that leaves you standing where you were. A flat pass
   * is aimed rather than indexed, so it has to be redrawn when you turn as well
   * - which is one render a frame while turning, exactly what any ordinary view
   * of a scene costs, and still a sixth of what the cube was costing.
   */
  const drawnAt = useRef({ x: NaN, y: NaN, z: NaN, aim: NaN, revision: -1, source: 0 });

  // Priority above zero, so react-three-fiber hands the frame over instead of
  // drawing the flat view underneath this one.
  useFrame(() => {
    const { halfYaw, halfPitch } = fieldOf(spread, size.width, size.height);
    const uniforms = optics.material.uniforms;
    uniforms.halfYaw.value = halfYaw;
    uniforms.halfPitch.value = halfPitch;
    uniforms.orientation.value.setFromMatrix4(camera.matrixWorld);
    uniforms.projectionMode.value = PROJECTION_MODES[mode] ?? 0;
    uniforms.repeatYaw.value = repeat ? 1 : 0;
    /*
     * Converted, because it is mixed in AFTER the colourspace include above.
     * A three.Color's components are linear; painted straight into a buffer
     * that is already in display space, #8c8378 came out as about #423B2F -
     * roughly twice the weight its own hex says, and the reason the horizon
     * always read hotter than the number suggested.
     */
    uniforms.gridColor.value.copy(gridColor).convertLinearToSRGB();
    uniforms.pointStrength.value = pointStrength;
    uniforms.sheetStrength.value = sheetStrength;
    uniforms.surround.value.copy(surround);
    uniforms.useFlat.value = !!flatSheet;
    uniforms.panorama.value = cube?.target.texture ?? null;
    uniforms.flatMap.value = flat?.target.texture ?? null;
    if (flatSheet) uniforms.flatTan.value.set(flatSheet.tanX, flatSheet.tanY);

    const was = drawnAt.current;
    const moved =
      Math.abs(was.x - camera.position.x) > 1e-4 ||
      Math.abs(was.y - camera.position.y) > 1e-4 ||
      Math.abs(was.z - camera.position.z) > 1e-4;
    // Which way the flat pass was pointing. The cube does not care.
    const aim = flatSheet ? camera.quaternion.x + camera.quaternion.y * 3 + camera.quaternion.w * 7 : 0;
    const source = wideSheet ? wideSheet.faceSize : -(flatSheet!.width + flatSheet!.height / 8192);
    const stale =
      moved ||
      was.revision !== sceneRevision.value ||
      was.source !== source ||
      Math.abs(was.aim - aim) > 1e-5;

    if (stale) {
      if (cube) {
        cube.camera.position.copy(camera.position);
        cube.camera.update(gl, scene);
      } else if (flat) {
        flat.camera.position.copy(camera.position);
        flat.camera.quaternion.copy(camera.quaternion);
        flat.camera.updateMatrixWorld();
        gl.setRenderTarget(flat.target);
        gl.render(scene, flat.camera);
      }
      drawnAt.current = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        aim,
        revision: sceneRevision.value,
        source,
      };
    }

    gl.setRenderTarget(null);
    gl.render(optics.quadScene, optics.quadCamera);
  }, 1);

  /**
   * The same picture, drawn once, as large as it is asked for.
   *
   * Everything above is built for a screen: a source sized to the glass, kept
   * between frames, and a cube capped at what a phone can hold. A picture that
   * is leaving to be drawn from wants none of those compromises and pays for
   * none of them, because it happens once. So the sums are run again at the
   * export's own size - the same sums, with a bigger frame in them - into
   * targets that are thrown away immediately after.
   *
   * Three things make it better than a screenshot of the glass and not one of
   * them is the pixel count on its own. The source is built at the export's
   * density rather than the screen's, so nothing is magnified. It is
   * multisampled, so the edges of the geometry are resolved rather than
   * stepped. And it carries mipmaps with trilinear minification, so where the
   * projection squeezes the source - which it does hard towards the edge of a
   * wide field - the picture is filtered down instead of point-sampled into
   * sparkle.
   */
  useEffect(() => {
    registerFrameRenderer((width, height) => {
      const density = width / Math.max(size.width, 1);
      const plan = sheetFor(mode, spread, size.width, size.height, { flat: density * SHARPEN, cube: density }, 4096);
      const { halfYaw, halfPitch } = fieldOf(spread, size.width, size.height);

      const material = optics.material;
      const held = {
        panorama: material.uniforms.panorama.value,
        flatMap: material.uniforms.flatMap.value,
        useFlat: material.uniforms.useFlat.value,
        flatTan: material.uniforms.flatTan.value.clone(),
      };
      const out = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });

      let source: THREE.WebGLRenderTarget | THREE.WebGLCubeRenderTarget | null = null;
      try {
        material.uniforms.encodeOutput.value = 1;
        if (plan.source === 'cube') {
          const cubeTarget = new THREE.WebGLCubeRenderTarget(plan.faceSize, {
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
            magFilter: THREE.LinearFilter,
          });
          source = cubeTarget;
          const rig = new THREE.CubeCamera(0.05, 2000, cubeTarget);
          rig.position.copy(camera.position);
          rig.update(gl, scene);
          material.uniforms.useFlat.value = false;
          material.uniforms.panorama.value = cubeTarget.texture;
        } else {
          const flatTarget = new THREE.WebGLRenderTarget(plan.width, plan.height, {
            // Four samples resolves the geometry's own edges; the mipmaps
            // handle what the projection does to them afterwards.
            samples: 4,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
            magFilter: THREE.LinearFilter,
          });
          source = flatTarget;
          const rig = new THREE.PerspectiveCamera(
            (2 * Math.atan(plan.tanY) * 180) / Math.PI,
            plan.tanX / plan.tanY,
            0.05,
            2000
          );
          rig.position.copy(camera.position);
          rig.quaternion.copy(camera.quaternion);
          rig.updateMatrixWorld();
          gl.setRenderTarget(flatTarget);
          gl.render(scene, rig);
          material.uniforms.useFlat.value = true;
          material.uniforms.flatMap.value = flatTarget.texture;
          material.uniforms.flatTan.value.set(plan.tanX, plan.tanY);
        }

        material.uniforms.halfYaw.value = halfYaw;
        material.uniforms.halfPitch.value = halfPitch;
        material.uniforms.orientation.value.setFromMatrix4(camera.matrixWorld);
        material.uniforms.projectionMode.value = PROJECTION_MODES[mode] ?? 0;

        gl.setRenderTarget(out);
        gl.render(optics.quadScene, optics.quadCamera);

        const pixels = new Uint8Array(width * height * 4);
        gl.readRenderTargetPixels(out, 0, 0, width, height, pixels);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) return null;
        const image = context.createImageData(width, height);
        // WebGL hands the buffer back bottom row first.
        for (let row = 0; row < height; row++) {
          const from = (height - 1 - row) * width * 4;
          image.data.set(pixels.subarray(from, from + width * 4), row * width * 4);
        }
        context.putImageData(image, 0, 0);
        return canvas;
      } catch (error) {
        console.error('Could not draw the picture at that size:', error);
        return null;
      } finally {
        source?.dispose();
        out.dispose();
        gl.setRenderTarget(null);
        // Put the live frame's uniforms back; the next tick would anyway, but
        // not before the one this was called from has been drawn.
        material.uniforms.panorama.value = held.panorama;
        material.uniforms.flatMap.value = held.flatMap;
        material.uniforms.useFlat.value = held.useFlat;
        material.uniforms.flatTan.value.copy(held.flatTan);
        material.uniforms.encodeOutput.value = 0;
      }
    });
    return () => registerFrameRenderer(null);
  }, [gl, scene, camera, optics, mode, spread, size.width, size.height]);

  // Which source the picture is being read off, and how big it is. A browser
  // test cannot tell a sharp frame from a soft one by looking; it can ask.
  if (import.meta.env.DEV) {
    (window as unknown as { __panorama?: unknown }).__panorama = wideSheet
      ? { source: 'cube', faceSize: wideSheet.faceSize }
      : { source: 'flat', width: flatSheet!.width, height: flatSheet!.height };
  }

  return null;
};
