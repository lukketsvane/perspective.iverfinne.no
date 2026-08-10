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
  contourPx: { value: 2 },
  formPx: { value: 0.9 },
  terminatorPx: { value: 1.3 },

  /**
   * How many form lines between edge-on and face-on, and how dark.
   *
   * Two, faintly. At three the steps land a few pixels inside the silhouette on
   * a curved form, so what you get is a second lighter line hugging the contour
   * and every edge reads as a tube; at five it is frank mush. Measured, the
   * family was adding a fifth of the ink on the page for that.
   */
  formCount: { value: 2 },
  formStrength: { value: 0.18 },
  /** The same, ruled on the light instead of on the eye. */
  lightCount: { value: 0 },
  lightStrength: { value: 0.3 },
  /**
   * The terminator earns its place where the form lines do not: it is the one
   * mark that says which way the light comes from, and it survives the sun
   * being swung right round.
   */
  terminatorStrength: { value: 1 },

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

  /*
   * The marker.
   *
   * One colour, laid flat, in the band between the spotted blacks and the bare
   * paper - which is exactly what a marker does over an ink drawing. Not a
   * gradient and not a light model: a marker has one value, it either went on
   * or it did not, and the drawing underneath is what carries the form.
   */
  accent: { value: new THREE.Color('#8ed24a') },
  /** Above this much light the paper is left bare. */
  accentHigh: { value: 0.62 },

  /*
   * The hatching.
   *
   * Ruled on the WORLD direction from the eye, not on the screen and not on
   * the surface. Screen space cannot work here for the same reason an edge
   * filter cannot - the scene goes onto six cube faces with no neighbours
   * across a seam - and surface space gives engraving that swims with the
   * object rather than strokes that sit on a sheet. A direction from the eye
   * is shared by every face, and because the projection is equidistant, even
   * angular spacing IS even spacing on the finished page.
   *
   * Two latitudes are used, one about the world Y axis and one about X, and
   * the hatch angle mixes them. Neither wraps, so there is no meridian where
   * the derivative blows up and paints a seam.
   */
  hatchAngle: { value: 0.6 },
  /** Radians between the first layer and the crossing one. */
  hatchCross: { value: 1.15 },
  /** Sheet pixels between neighbouring strokes. */
  hatchSpacing: { value: 6 },
  /** Sheet pixels of stroke weight. */
  hatchWidth: { value: 0.85 },
  /** Sheet pixels from the start of one stroke to the start of the next along
   *  its own run. Zero means an unbroken line. */
  hatchLength: { value: 44 },
};

const VERTEX = `
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    // World space, for the hatching. Every cube face has its own view matrix
    // and shares one world, so this is the only frame all six agree on.
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
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
  uniform float fill;
  uniform float marker;
  uniform float hatch;
  uniform vec3 accent;
  uniform float accentHigh;
  uniform float hatchAngle;
  uniform float hatchCross;
  uniform float hatchSpacing;
  uniform float hatchWidth;
  uniform float hatchLength;

  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying vec3 vWorldPos;

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

  /**
   * One stroke family, CUT AGAINST THE FORM.
   *
   * This is the whole difference between a hatching material and a hatching
   * filter, so it is worth being exact about.
   *
   * A filter rules strokes on the screen. It cannot describe anything: the
   * lines run dead straight over a sphere, a cliff and a fold alike, and the
   * only thing they carry is a value. Look at any Zorn plate and the opposite
   * is true - you can read the whole form off the line DIRECTION with every
   * trace of tone removed. The strokes bend over a shoulder, run round a
   * cylinder, crowd where the surface swings away and open out where it turns
   * to face you.
   *
   * The mechanism is a burin's: a family of parallel PLANES in the world, cut
   * against the surface. The curve where a plane meets the object is one
   * stroke, so
   *
   *   - on a flat wall the strokes are straight and evenly spaced,
   *   - on a sphere they are circles of latitude, bunching towards the rim,
   *   - over a fold they bend exactly as the fold bends,
   *   - and everywhere they crowd as the surface turns edge-on, because equal
   *     steps in the world are shrinking steps on the page. That crowding IS
   *     foreshortening, drawn, and it is what makes the shading describe
   *     rather than merely darken.
   *
   * (No back quotes anywhere below: this whole shader is one JS template
   * literal and a single one of them ends it in the middle of a comment.)
   */

  /**
   * A stroke of a given WIDTH, with a solid core.
   *
   * Not ruledMark, which ramps smoothly from the centre out and so is only
   * fully black on the line's axis - perfect for a hairline and useless for a
   * cut that is meant to widen until it touches its neighbour. Asked for six
   * pixels it gave a soft six-pixel gradient whose middle was grey, which is
   * why the darkest passages stayed a lattice however far the weight was
   * pushed. Here the width is the width: solid out to half of it, with about a
   * pixel of edge on either side to keep a hairline from crawling.
   */
  float hatchMark(float value, float widthSourcePx) {
    float slope = max(fwidth(value), 1e-7);
    float away = abs(fract(value - 0.5) - 0.5) / slope;
    // Not "half": that is a reserved word in GLSL and the whole fragment
    // shader silently refuses to compile if you use it as a name.
    float arm = max(widthSourcePx * 0.5, 0.15);
    return 1.0 - smoothstep(arm - 0.55, arm + 0.55, away);
  }

  /**
   * One stroke, weighted.
   *
   * TONE IS WEIGHT, NOT OPACITY. A burin cut deeper is a cut wider, and that
   * is the whole of how an engraved passage gets darker: the same lines, in
   * the same places, fatter - until at the bottom they touch and the passage
   * is solid. Nothing here fades. A stroke is either not yet cut (width zero,
   * so genuinely absent) or it is a line at some weight, and the ramp from one
   * to the other is a ramp in width. Fading the ink instead is what makes
   * shading read as a screen laid over a picture rather than as the picture.
   *
   * Two grains of randomness per stroke, keyed on which stroke it is so they
   * are steady as you walk: a little weight either side of the asked-for
   * width, and a shove along its own run so the ends do not line up. Ends in a
   * row is the single loudest tell that a machine drew it - a hand starts each
   * stroke where the last one happened to leave off.
   */
  float hatchStroke(
    float f, float along, float step, float widthSourcePx, float runRatio, float closed
  ) {
    if (widthSourcePx < 0.008) return 0.0;
    float v = f / step;
    /*
     * The grain is keyed to WHERE THE STROKE IS, not to its index in this
     * spacing.
     *
     * The two levels of detail below share every other line, and keying the
     * randomness on the index gave the same physical stroke a different weight
     * and a different phase in each - so the two drawings of it beat against
     * each other and scattered pale blotches through every midtone. A line's
     * offset in metres is the same number whichever rung is drawing it.
     */
    float key = floor(v + 0.5) * step;
    /*
     * ...counted in a fixed grid, so the hash actually hashes.
     *
     * Keyed on the offset in metres directly, neighbouring strokes differ by a
     * hundredth and sin() of two inputs that close together returns two nearly
     * equal numbers - so the "random" phase drifted smoothly along the rank
     * instead of scattering, every few strokes lifted in the same place, and
     * the coincidence read as pale blotches marching diagonally through the
     * midtones. Counted in five-millimetre units the neighbours differ by two
     * or more and the hash decorrelates, while the same physical stroke still
     * gets the same number at either level of detail.
     */
    float id = floor(key / 0.005 + 0.5);
    float grainA = fract(sin(id * 12.9898) * 43758.5453);
    float grainB = fract(sin(id * 78.233) * 24634.6345);
    float line = hatchMark(v, widthSourcePx * (0.78 + 0.44 * grainB));
    if (runRatio > 0.01) {
      float t = fract(along / (step * runRatio) + grainA);
      /*
       * A long stroke with a short lift, tapered at both ends: a needle enters
       * and leaves the wax. Not a dash - a dashed rule reads as stitching.
       *
       * The lift closes as the passage darkens. An engraver's black is
       * continuous cutting; leaving the gaps in it puts a white speck at the
       * end of every stroke, and a field of those specks IS the lattice look
       * that says a machine ruled it.
       */
      float lift = mix(1.0, 0.0, closed);
      line *= mix(1.0, smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.94, 1.0, t)), lift);
    }
    return line;
  }

  /**
   * The family, held to one spacing on the page however far away it is.
   *
   * Planes at a fixed spacing in metres close into solid black as an object
   * recedes, which is what makes naive world-space hatching unusable. An
   * engraver answers that by cutting FEWER lines on the small far thing and
   * more on the big near one - the same decision taken again at every scale -
   * so the spacing is quantised to powers of two of the distance and the two
   * neighbouring rungs are blended. The blend is in WIDTH, like everything
   * else here: the line between each pair grows in from nothing as you walk
   * closer, so no stroke ever appears, slides, or pops.
   */
  float hatchFamily(
    vec3 P, vec3 su, vec3 sr, float angle,
    float wantMetres, float widthSourcePx, float runRatio, float closed
  ) {
    vec3 axis = su * cos(angle) + sr * sin(angle);
    vec3 perp = su * -sin(angle) + sr * cos(angle);
    float f = dot(P, axis);
    float along = dot(P, perp);

    float lod = log2(max(wantMetres, 1e-5) / 0.01);
    float rung = floor(lod);
    float coarse = 0.01 * exp2(rung + 1.0);
    float over = lod - rung;
    return max(
      hatchStroke(f, along, coarse, widthSourcePx, runRatio, closed),
      hatchStroke(f, along, coarse * 0.5, widthSourcePx * (1.0 - over), runRatio, closed)
    );
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

    /*
     * The marker pass.
     *
     * One flat colour in the band between the spotted blacks and the bare
     * paper. A marker has one value: it either went on or it did not, and the
     * ink underneath is what carries the form - so the edge is a hard one,
     * antialiased over its own derivative like the fill's is, and there is no
     * gradient anywhere in it. Three values on the page, which is what the
     * reference sheet has: black, the colour, and white paper.
     */
    if (marker > 0.5) {
      float wash = 1.0 - smoothstep(accentHigh - max(fwidth(lambert), 1e-4) * 1.5,
                                    accentHigh + max(fwidth(lambert), 1e-4) * 1.5,
                                    lambert);
      ground = mix(ground, accent, wash);
    }

    float pen = clamp(max(max(contour, form), max(terminator, wrap)), 0.0, 1.0);

    /*
     * The hatching, in three passes that come in as the light goes out.
     *
     * An etcher does not draw a tone, they draw a number of lines and let the
     * paper between them do the rest - so the value here is carried by which
     * layers are present, not by any wash. The first layer is laid through
     * everything past the half-light; the second crosses it in the shadow; the
     * third crosses again in the darkest passages. Each fades in over its own
     * run rather than switching on, which is the difference between shading
     * and a contour map of the shading.
     */
    float hatchInk = 0.0;
    if (hatch > 0.5) {
      /*
       * The burin's frame: a fixed angle to the horizon, without knowing which
       * way the head is turned.
       *
       * The planes have to be steady while you look around, or the strokes
       * would swim - and worse, the six cube faces the curvilinear view is
       * read off would each rule a different set, seams and all. So the frame
       * is built from the fragment's own ray out of the eye and world up: two
       * things that change when you WALK and not when you turn, which is also
       * exactly what the renderer redraws the cube on.
       */
      vec3 toEye = vWorldPos - cameraPosition;
      float dist = max(length(toEye), 1e-4);
      vec3 d = toEye / dist;
      vec3 up = abs(d.y) > 0.98 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
      vec3 su = normalize(up - d * dot(up, d));
      vec3 sr = normalize(cross(d, su));

      // How far apart the strokes should stand ON THE PAGE, said in metres out
      // here where the surface is.
      float wantMetres = hatchSpacing * radPerSheetPixel * dist;
      float wMax = clamp(hatchWidth * scale, 0.05, 24.0);
      float runRatio = hatchLength / max(hatchSpacing, 0.001);
      float dark = 1.0 - clamp(lambert, 0.0, 1.0);

      /*
       * Three families, and the value is carried by how heavily each is cut.
       *
       * The first runs through the whole shade and does most of the work: it
       * comes in as a hairline where the light begins to go and is at full
       * weight by the time the form has turned properly away. The second
       * crosses it once the first has said all it can, and the third crosses
       * again in the last fifth, where the strokes are wide enough to close
       * on each other and the passage goes solid.
       *
       * The ramps overlap only where an etcher's would. Bands laid on top of
       * each other across the whole midtone is what turns hatching into a
       * woven net - a mechanical screen, which is the opposite of the thing.
       */
      float first = smoothstep(0.05, 0.52, dark);
      float second = smoothstep(0.62, 0.90, dark);
      float third = smoothstep(0.86, 1.0, dark);
      /** How far into continuous cutting the passage has gone. */
      float closed = smoothstep(0.72, 0.98, dark);

      /*
       * ...and past its own full weight, the first family keeps opening up.
       *
       * An engraver's darkest passage is not a lattice, it is nearly solid -
       * the cuts have widened until they meet and the paper between them is
       * gone. Stopping every family at the same maximum weight leaves a woven
       * screen at the bottom of the range instead, which is exactly the look
       * that says a machine made it. So the first family goes on widening
       * after it is nominally full, and at the very bottom the strokes touch.
       */
      float swell = 1.0 + 1.5 * smoothstep(0.70, 1.0, dark);

      hatchInk = hatchFamily(
        vWorldPos, su, sr, hatchAngle, wantMetres, wMax * first * swell, runRatio, closed);
      hatchInk = max(hatchInk, hatchFamily(
        vWorldPos, su, sr, hatchAngle + hatchCross, wantMetres, wMax * second * swell, runRatio, closed));
      hatchInk = max(hatchInk, hatchFamily(
        vWorldPos, su, sr, hatchAngle - hatchCross * 0.5, wantMetres * 0.92, wMax * third, runRatio, closed));

      pen = clamp(max(pen, hatchInk), 0.0, 1.0);
    }

    /*
     * The blacks, spotted in.
     *
     * Everything turned from the sun goes down as solid ink - a shape, not a
     * wash, which is the whole difference between a value study and a
     * brush-and-ink page. The edge is the terminator itself, antialiased over
     * its own derivative so it stays one crisp boundary at every distance;
     * on a flat face the derivative is nothing and the face simply is lit or
     * is ink, which is what a box wants.
     *
     * Inside the fill the pen swaps to paper: a contour or a form line
     * crossing the black runs white, which is how a drawn page keeps its
     * edges alive through a spotted shadow - drawn around, not painted over.
     */
    float black = 0.0;
    if (fill > 0.5) {
      float blackEdge = max(fwidth(lambert), 1e-4);
      black = 1.0 - smoothstep(0.0, blackEdge * 1.5, lambert);
    }

    /*
     * Composited the way a pen works, not the way a photograph does.
     *
     * Both colours are linear here, and mixing them linearly is what a camera
     * would record of a half-covered pixel. It is not what ink does to paper,
     * and it is not what any drawing tool does: a line at forty per cent
     * coverage came out a 22 per cent grey rather than the 36 per cent the
     * number reads as, so every stroke landed a third lighter than asked for.
     *
     * Physically the linear blend is the correct one. This is a sheet that
     * exists to be traced, and the punchier line is the one worth having.
     */
    vec3 base = mix(ground, ink, black);
    vec3 stroke = mix(ink, paper, black);
    vec3 sheet = mix(
      pow(max(base, vec3(0.0)), vec3(0.4545)),
      pow(max(stroke, vec3(0.0)), vec3(0.4545)),
      pen
    );
    gl_FragColor = vec4(pow(sheet, vec3(2.2)), 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Which of the three drawings this material is.
 *
 * One shader and one set of shared uniforms - the paper, the pen, the sun, the
 * weights are all one setting reaching every material at once - and three
 * switches on top of it that are each material's own. They are switches rather
 * than three shaders because everything that makes the line is identical in
 * all three: they differ only in what is laid UNDER the line.
 */
interface Style {
  /** Spot the blacks: everything turned from the sun goes down solid. */
  fill?: boolean;
  /** Lay one flat colour in the band between the blacks and the paper. */
  marker?: boolean;
  /** Build the value out of ruled strokes instead of out of a fill. */
  hatch?: boolean;
}

const build = (style: Style, extra: THREE.ShaderMaterialParameters = {}) => {
  const material = new THREE.ShaderMaterial({
    // A spread, not the object: the shared uniform holders keep their
    // identity - one setInkPaper reaches every material - while the three
    // style switches are this material's own.
    uniforms: {
      ...inkUniforms,
      fill: { value: style.fill ? 1 : 0 },
      marker: { value: style.marker ? 1 : 0 },
      hatch: { value: style.hatch ? 1 : 0 },
    },
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

/** The finished brush page: line, and the blacks spotted in. */
export const BRUSH = build({ fill: true });

/**
 * The same page with a marker over it.
 *
 * Ink first, then one flat colour laid in the band between the spotted blacks
 * and the bare paper - which is the order it is actually done in, and why the
 * colour never has to describe the form. Three values on the page and no
 * fourth.
 */
export const MARKER = build({ fill: true, marker: true });

/**
 * The etched page: no fill at all, and the value is the strokes.
 *
 * Deliberately not `fill`. An etcher's dark is a place where three layers of
 * line have crossed, and laying a solid black under them would be answering
 * the question twice - the whole discipline of the medium is that the paper
 * between the strokes is doing the work.
 */
export const HATCH = build({ hatch: true });

/**
 * What a box is drawn with.
 *
 * A box has no contour to find - its faces are flat, so the facing ratio is
 * constant across each one and its derivative is zero - and it does not need
 * one, because it already carries its twelve edges as geometry. All this does
 * for a box is lay the same paper under them, offset so the edges sit on top
 * rather than fighting the face for the pixel.
 */
export const BRUSH_BOX = build({ fill: true }, { polygonOffset: true, polygonOffsetFactor: 1 });
export const MARKER_BOX = build({ fill: true, marker: true }, { polygonOffset: true, polygonOffsetFactor: 1 });
export const HATCH_BOX = build({ hatch: true }, { polygonOffset: true, polygonOffsetFactor: 1 });


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
 *
 * The dark end is warm-neutral and bottoms out at true black. It used to run
 * #15171b / #24262b - a cool board, chosen because a slate is faintly blue -
 * and every one of those tones reads as NAVY on a screen full of white line
 * work. There is nowhere in this tool where a dark blue is the right answer:
 * a dark sheet should be charcoal, ash and soot, which is what the run below
 * is, and nothing in the app can now land on a colour anybody would call
 * blue.
 */
const PAPER_RAMP: [number, string][] = [
  [0, '#000000'],
  [26, '#1b1a18'],
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
 * The page BEHIND the sheet, and the pen that reads on it.
 *
 * Two tones, not one. The sheet is what an object is drawn on - it decides
 * the object's own paper and its own ink, and it lives in the material's
 * uniforms above. The page is what the sheet is mounted on, and it decides
 * everything drawn OVER the world rather than on an object: the ground's
 * ruling, the guides, the construction, the cast shadow, and whether the
 * chrome is light or dark.
 *
 * They were the same value, so a drawing on warm paper stood in a world made
 * of warm paper - and the oldest presentation there is, white paper on black,
 * could not be had at all. Separated, the ink stays ink and the page goes
 * wherever it separates the drawing best.
 */
const page = { tone: paperFor(243), ink: inkFor(paperFor(243)) };

/**
 * A mount at a given tone: a flat, neutral grey, and black really is black.
 *
 * Not the paper ramp. That ramp is warm on purpose, because no sheet is
 * neutral and a drawing surface has a colour - but a mount is not a sheet. Its
 * whole job is to be the thing the sheet is *not*, and the ramp's own black
 * end is #15171b, a cool board tone, which is a perfectly good drawing board
 * and visibly a dark blue when you asked for black. A mount has no hue to have
 * an opinion about.
 */
export const mountFor = (gray: number): THREE.Color => {
  const v = Math.max(0, Math.min(255, Math.round(gray)));
  return new THREE.Color().setHex((v << 16) | (v << 8) | v);
};

/** Put the page behind the sheet, whatever it is made of, where it can be read. */
export const setPageTone = (tone: THREE.Color) => {
  page.tone = tone.clone();
  page.ink = inkFor(page.tone);
};

/**
 * The marker's colour, and where it stops.
 *
 * A hue rather than a colour, because the value and the saturation are what
 * make it read as a marker rather than as paint - a marker is a light, very
 * saturated stain over a drawing, and the two numbers that hold it there are
 * not choices worth offering.
 */
export const setMarker = (hue: number, high: number) => {
  inkUniforms.accent.value.setHSL(((hue % 360) + 360) % 360 / 360, 0.72, 0.58, THREE.SRGBColorSpace);
  inkUniforms.accentHigh.value = high;
};

/** Everything the hatch is ruled by. Angles in degrees, sizes in sheet pixels. */
export const setHatch = (h: {
  angle: number;
  cross: number;
  spacing: number;
  width: number;
  length: number;
}) => {
  inkUniforms.hatchAngle.value = (h.angle * Math.PI) / 180;
  inkUniforms.hatchCross.value = (h.cross * Math.PI) / 180;
  inkUniforms.hatchSpacing.value = h.spacing;
  inkUniforms.hatchWidth.value = h.width;
  inkUniforms.hatchLength.value = h.length;
};

/** The page's own tone and pen, as hex, for everything outside a shader. */
export const pageHex = () => `#${page.tone.getHexString()}`;
export const pageInkHex = () => `#${page.ink.getHexString()}`;
/** Rec. 709 luminance of the page: what decides light chrome or dark. */
export const pageLuminance = () => luminance(page.tone);

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
    ? `#${page.tone.clone().lerp(page.ink, 0.52).getHexString()}`
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

/**
 * How dark a spotted shadow may be laid on the page.
 *
 * The brush page fills its blacks solid, and its cast shadow is a shape
 * rather than a wash - so it goes down heavy on a light page. On a dark one
 * there is nothing for a dark shape to say: the page is already the shadow,
 * and what reads there is the lit ground, so the shadow fades out entirely
 * rather than becoming a darker black nobody can see.
 */
export const brushShadowAlpha = () =>
  0.82 * Math.max(0, Math.min(1, (pageLuminance() - 0.1) / 0.25));

/** Which way the sun is, so the terminator knows where to fall. */
export const setInkLight = (x: number, y: number, z: number) => {
  inkUniforms.lightWorld.value.set(x, y, z).normalize();
};
