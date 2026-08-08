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
 * The sheet you are drawing on, from black paper to white.
 *
 * Warm, because paper is. Flat greys are right for the clay - a lit scene with
 * a hue in its background has a colour cast - and wrong for this, which is not
 * a room with a wall behind it but a sheet, and no sheet is neutral.
 *
 * The run between 58 and 88 is deliberately steep. There is no such thing as a
 * mid-value drawing surface: paper is light or the board is dark, and the
 * middle is a place the thumb passes through rather than somewhere to stop.
 * Both ends are what the mode already shipped before this was a control.
 */
const PAPER_RAMP: [number, string][] = [
  [0, '#15171b'],
  [26, '#24262b'],
  [58, '#3a3630'],
  [72, '#4b453c'],
  [88, '#b9aa8f'],
  [128, '#cbbda2'],
  [190, '#eee5d3'],
  [243, '#f7f4ef'],
  [255, '#fffdf8'],
];

const rampLow = new THREE.Color();
const rampHigh = new THREE.Color();

/**
 * The paper at a given setting of the light.
 *
 * Mixed in linear light rather than in sRGB, or the middle of every run comes
 * out muddy - which is the same reason the renderer works in linear and the
 * same mistake as averaging two photographs by their file bytes.
 */
export const paperFor = (gray: number): THREE.Color => {
  const at = Math.max(0, Math.min(255, gray));
  let i = 0;
  while (i < PAPER_RAMP.length - 2 && PAPER_RAMP[i + 1][0] < at) i++;
  const [lowAt, lowHex] = PAPER_RAMP[i];
  const [highAt, highHex] = PAPER_RAMP[i + 1];
  const t = highAt === lowAt ? 0 : (at - lowAt) / (highAt - lowAt);
  rampLow.set(lowHex).convertSRGBToLinear();
  rampHigh.set(highHex).convertSRGBToLinear();
  return rampLow.clone().lerp(rampHigh, t).convertLinearToSRGB();
};

/** Rec. 709 relative luminance, for deciding what can be read against what. */
export const luminance = (colour: THREE.Color) =>
  0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;

const contrast = (a: THREE.Color, b: THREE.Color) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * The pen for a given sheet.
 *
 * Derived rather than chosen. The paper and the pen are one decision with a
 * constraint on it - the line has to be readable - and offering them as two
 * free controls is offering the user a way to make the mode useless. A near
 * black or a chalk, whichever wins; the two are equal at a relative luminance
 * of 0.179, which is exactly where the sheet stops being paper and starts
 * being a board, so this is provably the best any single pen can do.
 */
export const inkFor = (paper: THREE.Color): THREE.Color => {
  const hsl = { h: 0, s: 0, l: 0 };
  // Asked and answered in display terms. three's default working space is
  // linear, where a lightness of 0.045 is a mid grey rather than the near-black
  // it reads as - which drew the whole tool in pencil instead of ink.
  paper.getHSL(hsl, THREE.SRGBColorSpace);
  const pen = new THREE.Color().setHSL(
    hsl.h,
    Math.min(0.6, hsl.s * 1.5 + 0.06),
    0.06,
    THREE.SRGBColorSpace
  );
  const chalk = new THREE.Color().setHSL(
    hsl.h,
    Math.min(0.08, hsl.s * 0.3),
    0.93,
    THREE.SRGBColorSpace
  );
  return contrast(paper, pen) >= contrast(paper, chalk) ? pen : chalk;
};

/** Put the sheet and the pen where the shaders can see them. */
export const setInkPaper = (gray: number) => {
  const paper = paperFor(gray);
  inkUniforms.paper.value.copy(paper);
  inkUniforms.ink.value.copy(inkFor(paper));
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

/**
 * What a construction is ruled in.
 *
 * One place, because there are three of them - the room's sheet, the ground's
 * two axes and the selection's own rays - and a page with a warm grey sheet, a
 * red selection and a green floor axis on it is a page with three inks and one
 * drawing. On the clay it stays the construction red it always was, which has
 * to carry across a lit grey scene.
 */
export const constructionInk = (inkMode: boolean, dark: boolean) =>
  inkMode
    ? `#${inkUniforms.paper.value.clone().lerp(inkUniforms.ink.value, 0.52).getHexString()}`
    : dark
      ? '#ff6a5e'
      : '#e0342a';

/** The pen and the sheet, as hex, for everything drawn outside a shader. */
export const inkHex = () => `#${inkUniforms.ink.value.getHexString()}`;
export const paperHex = () => `#${inkUniforms.paper.value.getHexString()}`;

/**
 * How dark a cast shadow may be laid on the sheet.
 *
 * A flat fill, and a light one: the object's own contour is a full-ink line,
 * and a fill anywhere near that value would put two drawings on the same page.
 * At about 1.4:1 against the paper it reads unambiguously as a plane and can
 * never be mistaken for a line. It fades out entirely as the sheet darkens -
 * on a blackboard you draw the lit parts, and the shadow is bare board.
 */
export const inkShadowAlpha = (gray: number) =>
  0.3 * Math.max(0, Math.min(1, (luminance(paperFor(gray)) - 0.18) / 0.22));

/** Which way the sun is, so the terminator knows where to fall. */
export const setInkLight = (x: number, y: number, z: number) => {
  inkUniforms.lightWorld.value.set(x, y, z).normalize();
};
