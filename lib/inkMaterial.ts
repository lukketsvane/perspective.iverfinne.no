import * as THREE from 'three';

/**
 * Ink: the drawing, rather than the photograph of it.
 *
 * Every other surface in the tool answers "what is this object made of". This
 * one answers "where would the pen go", which is a different question and the
 * only one a perspective study actually needs. It draws three families of line
 * straight out of the surface, per pixel, with no extra geometry at all:
 *
 *  - the contour, wherever the form turns edge-on to the eye. On a smooth
 *    closed shape that locus IS the silhouette, plus every interior edge the
 *    form rolls over - the far rim of an ear, the inside of a nostril, the
 *    crease of a bent elbow. One term, outline and inner line together.
 *  - the form lines, ruled at even steps of the same facing ratio, which wrap
 *    the shape the way the lines of an engraving do.
 *  - the terminator, the single line where the light grazes. On a sculpted
 *    figure this is the most useful mark on the page after the contour: it is
 *    what says which way the light comes from without laying down a wash.
 *
 * WHY IT IS BUILT OUT OF A DOT PRODUCT AND NOT OUT OF PIXELS
 *
 * The scene is never drawn to the screen. It goes onto the six faces of a cube
 * (or onto one flat pass), and a full-screen shader re-projects that source
 * through a curvilinear mapping - see components/Panorama.tsx. Two consequences
 * decide everything here.
 *
 * First, an edge found by comparing neighbouring pixels of the source cannot
 * work: a cube face has no neighbours past its own border, so every one of the
 * twelve seams would gain a false line or lose a true one, and the source's
 * pixels-per-degree varies by two to three times across a single face, so the
 * line weight would breathe and then jump at the seam. The facing ratio has no
 * such problem, because it is a property of the surface at that point and of
 * where the eye is standing - not of the framebuffer. Both vectors below live
 * in view space, and a dot product of two vectors turned by the same matrix is
 * the same number, so all six faces agree exactly.
 *
 * Second - and this is the reason the cube is affordable at all - the cube is
 * only re-drawn when the viewer MOVES, not when they turn. Nothing in this
 * shader depends on which way the head is pointing, only on where it is. So
 * the mode costs nothing extra to look around in.
 *
 * WIDTH
 *
 * A line has to be the same weight everywhere on the finished sheet, at sixty
 * degrees of field and at two hundred and seventy, and in the three-times
 * export. It cannot be a width in metres (a figure across the room would draw
 * with a finer pen than one at arm's length) and it cannot be a width in source
 * pixels (the source is a cube face at one field and a flat pass at another).
 *
 * So it is a width in ANGLE, converted to source pixels per fragment. The
 * conversion needs to know how many radians of view one source pixel covers
 * right here, and that falls out of the derivative of the ray direction - which
 * for a pinhole camera is a function of screen position alone, so it is exact,
 * smooth, and never disturbed by the geometry in front of it.
 *
 * `radPerSheetPixel` is the other half: how many radians one CSS pixel of the
 * finished frame is worth, which is 2 * angularRadius / longestEdge and is what
 * `fieldOf` in lib/projection.ts is already computing. Because the export
 * re-runs the same scene render into a denser source without touching this
 * uniform, an exported line comes out the same weight RELATIVE to the picture
 * and three times better resolved - which is what lib/capture.ts does for the
 * SVG overlays too.
 *
 * WHAT THIS CANNOT DO
 *
 * It cannot know where on the finished sheet a fragment will land, because that
 * needs the head's orientation, and depending on the orientation would
 * invalidate the cube on every frame you turn. So the width is referenced to
 * the density at the middle of the sheet. In equidistant - the default - that
 * density is the same everywhere and the width is exact. In cylindrical the
 * lines thin by 1/cos(pitch) towards the top and bottom; in stereographic they
 * thicken by sec(theta/2)^2 towards the rim, along with everything else that
 * projection magnifies out there.
 */

/**
 * One set of uniforms, shared by every material below.
 *
 * three reads a uniform's value at draw time, so handing the same object to two
 * materials makes them genuinely one setting rather than two that have to be
 * kept in step.
 */
export const inkUniforms = {
  paper: { value: new THREE.Color('#f7f4ef') },
  ink: { value: new THREE.Color('#16130f') },
  /** Direction towards the sun, in world space. */
  lightWorld: { value: new THREE.Vector3(0.4, 0.8, 0.45).normalize() },

  /** Radians of view angle per CSS pixel of the finished frame. */
  radPerSheetPixel: { value: 0.0007 },

  /** Weights, in CSS pixels of the finished frame. */
  contourPx: { value: 1.5 },
  formPx: { value: 0.9 },
  terminatorPx: { value: 1.1 },

  /** How many form lines between edge-on and face-on, and how dark. */
  formCount: { value: 3 },
  formStrength: { value: 0.34 },
  /** The same, ruled on the light instead of on the eye. */
  lightCount: { value: 0 },
  lightStrength: { value: 0.3 },
  terminatorStrength: { value: 0.8 },

  /**
   * The smallest gradient the width correction will believe.
   *
   * Dividing the facing ratio by its own screen-space derivative is what holds
   * the line to one weight whatever the curvature - a finger and a flat back
   * get the same pen. It assumes the derivative is measuring form. On a mesh
   * whose normals are faceted rather than smooth it is measuring the facets
   * instead, and the line smears over the whole surface.
   *
   * Raising this floor walks the behaviour back towards a plain band on the
   * facing ratio: robust against any normals at all, at the price of a line
   * that fattens where the form is flat. 0.002 is the safe default; drop it
   * towards 0.0002 on geometry known to be smooth.
   */
  gradFloor: { value: 0.002 },

  /** A little flat tone under the lines. 0 is bare paper. */
  tone: { value: 0 },
  toneSteps: { value: 3 },
};

const VERTEX = `
  varying vec3 vNormalView;
  varying vec3 vViewPos;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    // The inverse-transpose, so a box scaled unevenly still has honest
    // normals. View space rather than world: a cube face's view matrix turns
    // the normal and the eye vector by the same rotation, and the dot product
    // below does not notice.
    vNormalView = normalMatrix * normal;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = `
  uniform vec3 paper;
  uniform vec3 ink;
  uniform vec3 lightWorld;
  uniform float radPerSheetPixel;
  uniform float contourPx;
  uniform float formPx;
  uniform float terminatorPx;
  uniform float formCount;
  uniform float formStrength;
  uniform float lightCount;
  uniform float lightStrength;
  uniform float terminatorStrength;
  uniform float gradFloor;
  uniform float tone;
  uniform float toneSteps;

  varying vec3 vNormalView;
  varying vec3 vViewPos;

  /**
   * A line of even weight wherever a value crosses zero.
   *
   * Distance to the crossing, measured in source pixels, is the value divided
   * by its own screen-space derivative - the trick the ground and the room are
   * already ruled with. What is different here is the last step: the threshold
   * is not a fixed number of source pixels but however many source pixels the
   * wanted angle is worth at this fragment.
   *
   * floorSlope is the gradient floor in this value's own units, so a ratio
   * ruled at three steps floors three times as high as the same ratio ruled at
   * one - otherwise the guard would mean something different in each family.
   * (No back quotes anywhere below this line: this whole shader is inside a
   * JS template literal, and one of them ends it in the middle of a comment.)
   */
  float mark(float value, float widthSourcePx, float floorSlope) {
    float slope = max(fwidth(value), floorSlope);
    float away = abs(value) / slope;
    return 1.0 - smoothstep(0.0, widthSourcePx, away);
  }

  /** The same, ruled at every whole step of the value rather than at zero. */
  float ruledMark(float value, float widthSourcePx, float floorSlope) {
    float slope = max(fwidth(value), floorSlope);
    float away = abs(fract(value - 0.5) - 0.5) / slope;
    return 1.0 - smoothstep(0.0, widthSourcePx, away);
  }

  void main() {
    vec3 N = normalize(vNormalView);
    // Eye to fragment. For a pinhole camera this direction is a function of the
    // pixel and nothing else, so its derivative is the source's angular density
    // here - exact, and never disturbed by what the geometry is doing.
    vec3 ray = normalize(vViewPos);
    float radPerSourcePixel = max(length(dFdx(ray)), length(dFdy(ray)));

    /** A weight in sheet pixels, said in source pixels. */
    float scale = radPerSheetPixel / max(radPerSourcePixel, 1e-7);
    float contourWidth = clamp(contourPx * scale, 0.35, 24.0);
    float formWidth = clamp(formPx * scale, 0.35, 24.0);
    float terminatorWidth = clamp(terminatorPx * scale, 0.35, 24.0);

    // How squarely the surface faces the eye. Zero is edge-on, which on a
    // smooth closed form is exactly the silhouette and every interior edge the
    // form rolls over. abs(), so a back face reads the same as a front one.
    float facing = abs(dot(N, -ray));

    float contour = mark(facing, contourWidth, gradFloor);

    // Form lines, ruled at even steps of the same ratio. Faded out as the
    // surface comes square on: there the steps are far apart and the
    // derivative goes to nothing, which would ink a blob at every point that
    // happens to face you dead on.
    //
    // Every branch in here is on a uniform, never on anything that varies from
    // fragment to fragment - a derivative taken inside non-uniform control flow
    // is undefined, and these are all derivatives.
    float form = 0.0;
    if (formCount > 0.5) {
      form = ruledMark(facing * formCount, formWidth, gradFloor * formCount)
        * (1.0 - smoothstep(0.78, 0.97, facing))
        * formStrength;
    }

    // The light, in the same space as the normal.
    vec3 L = normalize((viewMatrix * vec4(lightWorld, 0.0)).xyz);
    float lambert = dot(N, L);

    // Where the light grazes: the core shadow, and the one inner line that
    // says which way the sun is.
    float terminator = mark(lambert, terminatorWidth, gradFloor) * terminatorStrength;

    // And optionally the value contours either side of it.
    float wrap = 0.0;
    if (lightCount > 0.5) {
      wrap = ruledMark(max(lambert, 0.0) * lightCount, formWidth, gradFloor * lightCount)
        * lightStrength;
    }

    // Flat quantised tone under the lines, if any is wanted at all.
    float shade = 0.0;
    if (tone > 0.001 && toneSteps > 0.5) {
      float lit = clamp(lambert, 0.0, 1.0);
      shade = (1.0 - floor(lit * toneSteps + 0.5) / toneSteps) * tone;
    }
    vec3 ground = mix(paper, ink, shade * 0.16);

    float pen = clamp(max(max(contour, form), max(terminator, wrap)), 0.0, 1.0);

    gl_FragColor = vec4(mix(ground, ink, pen), 1.0);
    #include <colorspace_fragment>
  }
`;

const build = (extra: THREE.ShaderMaterialParameters = {}) => {
  const material = new THREE.ShaderMaterial({
    uniforms: inkUniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    ...extra,
  });
  // Derivatives are core on WebGL2, which is what this runs on - the ground and
  // the room already rule themselves with fwidth and compile. The flag is only
  // what a WebGL1 context would need, and the shipped types no longer name it.
  (material.extensions as unknown as Record<string, boolean>).derivatives = true;
  return material;
};

/** What a sculpted mesh is drawn with. */
export const INK = build();

/**
 * What a box is drawn with.
 *
 * A box has no contour to find - its faces are flat, so the facing ratio is
 * constant across each one and its derivative is zero - and it does not need
 * one, because it already carries its twelve edges as geometry. All this does
 * for a box is lay the same paper under them, offset so the edges sit on top
 * rather than fighting the face for the pixel.
 */
export const INK_BOX = build({ polygonOffset: true, polygonOffsetFactor: 1 });

/**
 * Ink, drawn through.
 *
 * Both sides and no depth written, so the contours of the far side of a form
 * come through the near side - which is what drawing through a glass box does,
 * on something that is not a box. Optional: it is a lot of line.
 */
export const INK_GLASS = build({
  side: THREE.DoubleSide,
  depthWrite: false,
  transparent: true,
});

/** Ink on paper, or chalk on slate. */
export const setInkTheme = (dark: boolean) => {
  inkUniforms.paper.value.set(dark ? '#15171b' : '#f7f4ef');
  inkUniforms.ink.value.set(dark ? '#e9e5dc' : '#16130f');
};

/**
 * How wide a line is, in radians.
 *
 * Both numbers come from `fieldOf`: the field's angular radius follows the
 * longest edge of the frame, so one CSS pixel is worth the same angle on both
 * axes and this is a single number rather than two.
 */
export const setInkScale = (halfYaw: number, cssWidth: number) => {
  inkUniforms.radPerSheetPixel.value = halfYaw / Math.max(cssWidth / 2, 1);
};

/** Which way the sun is, so the terminator knows where to fall. */
export const setInkLight = (x: number, y: number, z: number) => {
  inkUniforms.lightWorld.value.set(x, y, z).normalize();
};
