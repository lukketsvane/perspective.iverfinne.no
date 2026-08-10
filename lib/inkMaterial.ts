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
  varying vec3 vNormalWorld;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    // World space, for the hatching. Every cube face has its own view matrix
    // and shares one world, so this is the only frame all six agree on.
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    // The world normal, by the inverse-transpose, because a box scaled 3 x 1 x 1
    // has honest normals only through it - and the hatch direction is read off
    // this, so a lie here bends every stroke on the object.
    vNormalWorld = transpose(inverse(mat3(modelMatrix))) * normal;
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
  varying vec3 vNormalWorld;

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
   * STROKES THAT FOLLOW THE FORM. One family. No crosshatching.
   *
   * Neither Zorn nor Kim Jung Gi crosshatches, and the difference is not a
   * matter of taste. A lattice of crossing rules is a SCREEN: it has a value
   * and says nothing else, and two of them crossing say nothing twice. What
   * both of them actually do is lay a single family of parallel strokes whose
   * DIRECTION IS DECIDED BY THE FORM - the strokes run round an arm, wrap over
   * a shoulder, turn with a fold - so that the drawing can be read off the
   * line direction alone with every trace of tone removed.
   *
   * The direction that does that is the CROSS-CONTOUR: the way a stroke would
   * run if you laid a thread on the surface and pulled it round. Its axis is
   *
   *     A = normalize(cross(worldNormal, viewDirection))
   *
   * which is the tangent to the silhouette at that point. Ruling planes with
   * that normal cuts the surface in curves running square across it: round a
   * cylinder rather than along it, from rim to rim over a sphere, and along
   * the run of a fold. Because the axis is rebuilt at every fragment from the
   * surface's own normal, the strokes turn wherever the surface turns - which
   * is the entire property that was missing while the planes had one fixed
   * normal for the whole object.
   *
   * Where the surface faces the eye dead-on the cross product vanishes: there
   * is no silhouette direction to be had, and none is wanted - a plane facing
   * you square has no roundness to describe. There the axis blends to a fixed
   * angle to the horizon, which is what a hand does when the form stops
   * telling it anything.
   *
   * (No back quotes anywhere below: this whole shader is one JS template
   * literal and a single one of them ends it in the middle of a comment.)
   */

  /**
   * A stroke of a given WIDTH, with a solid core.
   *
   * Not ruledMark, which ramps smoothly from the centre out and so is only
   * fully black on the line axis - perfect for a hairline and useless for a
   * cut meant to widen until it touches its neighbour. Asked for six pixels it
   * gave a soft six-pixel gradient whose middle was grey, which is why the
   * darkest passages stayed a lattice however far the weight was pushed.
   */
  float hatchMark(float value, float widthSourcePx) {
    float slope = max(fwidth(value), 1e-7);
    float away = abs(fract(value - 0.5) - 0.5) / slope;
    // Not "half": reserved word in GLSL, and using it silently kills the build.
    float arm = max(widthSourcePx * 0.5, 0.1);
    return 1.0 - smoothstep(arm - 0.55, arm + 0.55, away);
  }

  /**
   * One rank of strokes at a given spacing and weight, cut to length.
   *
   * The grain is keyed to where the stroke IS, counted in a fixed grid, so the
   * same physical stroke gets the same number whatever spacing is drawing it -
   * and so that neighbours differ enough for the hash to actually hash. Keyed
   * on the offset in metres instead, neighbours differ by a hundredth, sin()
   * of two inputs that close together returns two nearly equal numbers, and
   * the "random" phase drifts smoothly along the rank instead of scattering:
   * every few strokes lift in the same place and the coincidence marches pale
   * blotches diagonally through the midtones.
   */
  float hatchRank(
    float f, float along, float step, float widthSourcePx, float runPeriod, float closed
  ) {
    if (widthSourcePx < 0.02) return 0.0;
    float v = f / step;
    float id = floor(floor(v + 0.5) * step / 0.005 + 0.5);
    float grainA = fract(sin(id * 12.9898) * 43758.5453);
    float grainB = fract(sin(id * 78.233) * 24634.6345);
    float line = hatchMark(v, widthSourcePx * (0.82 + 0.36 * grainB));
    /*
     * The break period is given in the same units as ALONG, not derived from
     * the spacing.
     *
     * It used to be step * ratio, which is fine while the two coordinates are
     * both metres and nonsense the moment they are not: on the form field the
     * spacing is in facing-ratio units and the run is in metres, so the period
     * came out arbitrary and every stroke was chopped at a random interval.
     * That was most of the scribble.
     */
    if (runPeriod > 1e-6) {
      float t = fract(along / runPeriod + grainA);
      // A long stroke with a short lift, tapered at both ends: a needle enters
      // and leaves the wax. The lift closes as the passage darkens, because an
      // engraver's black is continuous cutting and a gap in it is a white
      // speck - a field of those specks is the lattice look itself.
      line *= mix(smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.95, 1.0, t)), 1.0, closed);
    }
    return line;
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
       * THE STROKES ARE RULED ON THE FORM ITSELF.
       *
       * The quantity is the facing ratio - how squarely the surface meets the
       * eye - which is the same number the contour and the form lines are
       * already built from. Its iso-lines are the curves of constant surface
       * tilt, and those are exactly the lines an engraver cuts:
       *
       *   - on a sphere, rings concentric with the rim;
       *   - on a cylinder, lines running the length of it and crowding towards
       *     both silhouettes;
       *   - over a fold, curves that turn precisely as the fold turns.
       *
       * And the crowding is free and correct: equal steps of tilt are unequal
       * steps on the page wherever the surface swings away, which IS
       * foreshortening, drawn. It is what makes the shading describe the form
       * rather than merely darken it.
       *
       * An earlier attempt ruled world-space planes on an axis rebuilt per
       * fragment from cross(normal, view). The direction was right and the
       * field was not: an axis that rotates across the surface makes
       * dot(position, axis) a non-integrable quantity, and its iso-lines tore
       * into nested hairpins wherever the normal swung. The facing ratio is a
       * true scalar field, so its iso-lines cannot tear.
       */
      float q = facing;
      float dq = max(fwidth(q), 1e-7);

      /*
       * A flat face has no form to follow, so it gets the hand's own angle.
       *
       * On a plane the facing ratio is constant and its derivative is nothing:
       * there is no iso-line to rule and none is wanted. What a hand does on a
       * flat wall is lay parallel strokes at whatever angle it holds the pen,
       * so that is what happens there - world planes, at the knob's angle,
       * built from the fragment's ray and world up so that all six cube faces
       * agree.
       */
      vec3 toEye = vWorldPos - cameraPosition;
      float dist = max(length(toEye), 1e-4);
      vec3 view = toEye / dist;
      vec3 up = abs(view.y) > 0.98 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
      vec3 su = normalize(up - view * dot(up, view));
      vec3 sr = normalize(cross(view, su));
      vec3 planeAxis = su * cos(hatchAngle) + sr * sin(hatchAngle);
      vec3 planeRun = su * -sin(hatchAngle) + sr * cos(hatchAngle);

      float dark = 1.0 - clamp(lambert, 0.0, 1.0);

      /*
       * Spacing, in two ladders that compose.
       *
       * The first holds the strokes at one spacing on the PAGE. For the form
       * field that means counting steps of tilt per source pixel; for the flat
       * field it means metres per source pixel. Both are quantised to powers
       * of two and two neighbouring rungs are crossfaded IN WIDTH, so the line
       * between each pair grows in from nothing and no stroke ever slides.
       *
       * The second is tone, and it is the whole answer to why this material
       * used to read as a wash. Weight alone cannot carry a light passage: a
       * stroke thinner than a page pixel is a grey smear, and a field of grey
       * smears is a gradient, which is precisely what an etching is not. An
       * etcher lightens a passage by cutting FEWER lines, never fainter ones.
       * So the light end doubles the spacing, and doubles it again, and any
       * stroke drawn at all is drawn at a weight you can see.
       */
      /*
       * The light passages are BARE PAPER, not thinner strokes.
       *
       * An earlier version opened the spacing out as the light came up, which
       * is what an etcher does and which looked wrong here for a mechanical
       * reason: the rung changes continuously across a curved surface, so
       * lines died halfway along themselves and a rank of long curves came out
       * as a comb of ragged stubs. One spacing throughout, then; tone is
       * carried by weight between a visible minimum and a merge, and below the
       * threshold there are no strokes at all. Paper is a value.
       */
      float open = 1.0;
      float pagePerSource = radPerSourcePixel / max(radPerSheetPixel, 1e-9);

      /*
       * The form field is ruled at a FIXED number of strokes, not at a spacing
       * worked out per pixel.
       *
       * Working it out per pixel needs the screen derivative of the facing
       * ratio, and on a decimated mesh that derivative jumps at every facet
       * edge - so the level of detail flipped from pixel to pixel and a rank
       * of long curves came out as a scribble. It is also the wrong idea. An
       * engraver ruling a sphere does not measure a gap; they cut a fixed
       * number of lines from the rim to the middle and let the form space
       * them. That is what this is: so many strokes between edge-on and
       * face-on, crowding wherever the surface turns away, which is the
       * foreshortening and the whole point.
       */
      float count = max(240.0 / max(hatchSpacing, 1.0), 4.0);
      float stepQ = 1.0 / count;

      // The flat field keeps its distance ladder: on a plane the spacing IS a
      // distance, and quantising it to powers of two is what holds it to one
      // spacing on the page as the wall recedes.
      float wantM = hatchSpacing * open * radPerSheetPixel * dist;
      float lodM = log2(max(wantM, 1e-5) / 0.01);
      float rungM = floor(lodM);
      float coarseM = 0.01 * exp2(rungM + 1.0);
      float overM = lodM - rungM;

      /*
       * Weight: never below what a pen can draw, and past full into solid.
       *
       * One page pixel is where a line stops being an antialiased suggestion
       * of a line. Above it the weight rides the value, and past its nominal
       * full weight it keeps swelling, so the darkest passages close on
       * themselves instead of staying a lattice.
       */
      float wPage = max(hatchWidth, 1.0) * (0.80 + 0.55 * smoothstep(0.26, 0.74, dark))
        * (1.0 + 1.7 * smoothstep(0.70, 1.0, dark));
      float wMax = clamp(wPage * scale, 0.5, 40.0);
      // How far a stroke runs before the needle lifts, in metres out here.
      float runMetres = hatchLength * radPerSheetPixel * dist;
      float closed = smoothstep(0.74, 0.98, dark);

      /*
       * Where a stroke on the form field breaks.
       *
       * It has to run ALONG the stroke, or the lift chops the line into ticks
       * across it. The iso-lines of the facing ratio run along the silhouette
       * tangent, so that is the direction: cross(normal, view). It rotates
       * across the surface, and here that costs nothing - a break in slightly
       * the wrong place is a break in slightly the wrong place, where the same
       * rotating axis used for the RULING tore the lines into hairpins.
       */
      vec3 Nw = normalize(vNormalWorld);
      vec3 sideDir = cross(Nw, view);
      float grip = length(sideDir);
      vec3 alongDir = grip > 1e-4 ? sideDir / grip : planeRun;

      // Both fields are evaluated - a derivative taken inside branchy control
      // flow is undefined, and every one of these is a derivative - and then
      // one of them is chosen. Chosen, not blended: mixing two coverages is an
      // opacity blend, and an opacity blend is a grey.
      float formInk = hatchRank(
        q, dot(vWorldPos, alongDir), stepQ, wMax, runMetres, closed);
      float fm = dot(vWorldPos, planeAxis);
      float alongM = dot(vWorldPos, planeRun);
      float planeInk = max(
        hatchRank(fm, alongM, coarseM, wMax, runMetres, closed),
        hatchRank(fm, alongM, coarseM * 0.5, wMax * (1.0 - overM), runMetres, closed)
      );

      // Is the form turning enough here to be worth following? Measured as
      // steps of tilt per page pixel: below a thousandth the surface is flat
      // to within the width of the pen.
      float turning = dq * pagePerSource;
      hatchInk = mix(planeInk, formInk, step(0.0016, turning));
      // Nothing at all where the light is: bare paper is a value too.
      hatchInk *= step(0.24, dark);

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

/**
 * The cast shadow, on the etched page, CUT RATHER THAN WASHED.
 *
 * A wash under a drawing made entirely of line is the one thing on the page
 * that is not a line, and it shows: the object is engraved and its shadow is a
 * grey rectangle of nothing. An etcher has no wash either - the shadow on the
 * ground is the same needle, laid in the same ranks, running along the ground
 * rather than over the form.
 *
 * So the ground's shadow catcher is three's own ShadowMaterial with its one
 * line of output rewritten. Everything that makes shadows work - the maps, the
 * cascades, the soft filtering - is inherited untouched; all that changes is
 * that where it wrote a flat alpha it now writes the coverage of a rank of
 * strokes. The strokes are ruled on world planes at the hand's own angle,
 * which is what the flat faces of a box already use, so the shadow and the
 * boxes standing in it are ruled by the same hand.
 *
 * The uniforms are the very objects the ink shader uses, not copies, so the
 * angle and the spacing are one setting across the whole page.
 */
export const HATCH_SHADOW = (() => {
  const material = new THREE.ShadowMaterial({ transparent: true, depthWrite: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.radPerSheetPixel = inkUniforms.radPerSheetPixel;
    shader.uniforms.hatchAngle = inkUniforms.hatchAngle;
    shader.uniforms.hatchSpacing = inkUniforms.hatchSpacing;
    shader.uniforms.hatchWidth = inkUniforms.hatchWidth;
    shader.uniforms.hatchLength = inkUniforms.hatchLength;

    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vGround;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvGround = (modelMatrix * vec4(position, 1.0)).xyz;');

    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        [
          'varying vec3 vGround;',
          'uniform float radPerSheetPixel;',
          'uniform float hatchAngle;',
          'uniform float hatchSpacing;',
          'uniform float hatchWidth;',
          'uniform float hatchLength;',
          'float groundMark(float value, float widthSourcePx) {',
          '  float slope = max(fwidth(value), 1e-7);',
          '  float away = abs(fract(value - 0.5) - 0.5) / slope;',
          '  float arm = max(widthSourcePx * 0.5, 0.1);',
          '  return 1.0 - smoothstep(arm - 0.55, arm + 0.55, away);',
          '}',
          'float groundRank(float f, float along, float step, float w, float runRatio) {',
          '  if (w < 0.02) return 0.0;',
          '  float v = f / step;',
          '  float id = floor(floor(v + 0.5) * step / 0.005 + 0.5);',
          '  float grainA = fract(sin(id * 12.9898) * 43758.5453);',
          '  float grainB = fract(sin(id * 78.233) * 24634.6345);',
          '  float line = groundMark(v, w * (0.82 + 0.36 * grainB));',
          '  if (runRatio > 0.01) {',
          '    float t = fract(along / runRatio + grainA);',
          '    line *= smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.95, 1.0, t));',
          '  }',
          '  return line;',
          '}',
          'void main() {',
        ].join('\n')
      )
      .replace(
        'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
        [
          'vec3 toEye = vGround - cameraPosition;',
          'float dist = max(length(toEye), 1e-4);',
          'vec3 view = toEye / dist;',
          'float radPerSourcePixel = max(length(dFdx(view)), length(dFdy(view)));',
          'float scale = radPerSheetPixel / max(radPerSourcePixel, 1e-7);',
          'vec3 up = abs(view.y) > 0.98 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);',
          'vec3 su = normalize(up - view * dot(up, view));',
          'vec3 sr = normalize(cross(view, su));',
          'vec3 axis = su * cos(hatchAngle) + sr * sin(hatchAngle);',
          'vec3 runDir = su * -sin(hatchAngle) + sr * cos(hatchAngle);',
          'float wantM = hatchSpacing * radPerSheetPixel * dist;',
          'float lod = log2(max(wantM, 1e-5) / 0.01);',
          'float rung = floor(lod);',
          'float coarse = 0.01 * exp2(rung + 1.0);',
          'float over = lod - rung;',
          'float shade = 1.0 - getShadowMask();',
          // The shadow's own value decides the weight, exactly as the form's
          // does on an object: a grazing shadow is a lighter cut.
          'float wPage = max(hatchWidth, 1.0) * (0.80 + 0.9 * shade);',
          'float w = clamp(wPage * scale, 0.5, 40.0);',
          'float f = dot(vGround, axis);',
          'float along = dot(vGround, runDir);',
          'float runRatio = hatchLength * radPerSheetPixel * dist;',
          'float ink = max(',
          '  groundRank(f, along, coarse, w, runRatio),',
          '  groundRank(f, along, coarse * 0.5, w * (1.0 - over), runRatio)',
          ');',
          'gl_FragColor = vec4( color, opacity * ink * step(0.06, shade) );',
        ].join('\n')
      );
  };
  // A material that compiles differently from every other ShadowMaterial needs
  // its own program, and three keys programs on this.
  material.customProgramCacheKey = () => 'hatch-shadow';
  return material;
})();

/** The cut shadow's pen and how hard it is laid. Pushed from the store. */
export const setShadowInk = (hex: string, opacity: number) => {
  HATCH_SHADOW.color.set(hex);
  HATCH_SHADOW.opacity = opacity;
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
