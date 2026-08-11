import type { Backdrop, Surface } from '../types';

/**
 * Pages worth looking at, and a button that deals one.
 *
 * Everything in this tool is a knob, and a tool that is all knobs is a tool
 * nobody ever sees the range of. Most of what it can do lives in combinations:
 * the etched page wants a low raking sun, the toned sheet wants a wash under
 * the line, the marker wants a light mount. Any one of those is a minute of
 * fiddling to find and a second to lose.
 *
 * So these are not "themes". Each is a whole page that somebody would actually
 * draw from - the surface, the sheet, the mount, the light, the pen and the
 * floor, chosen together - and the control deals a different one each time it
 * is pressed. It is the fastest way to learn what the knobs are FOR: you land
 * somewhere good, and then you can see which knob put you there.
 *
 * NOTHING HERE TOUCHES THE VIEW. What you have built, where you are standing,
 * the lens, the projection, the guides, the grid, the cage and the walls are
 * all yours; a page changes only how the thing in front of you is DRAWN.
 *
 * They used to carry a lens and a projection each, and dealing one threw the
 * view away: you would set up a shot, press the button to see it in ink, and
 * get somebody else's 420 degree cylindrical frieze. Those went. The comparison
 * a shuffle is for is the same view drawn many ways, which is only a comparison
 * if the view holds still.
 *
 * FOUR AXES ARRIVED WITH THIS DECK, and half of it could not be built without
 * them: the weight of the form lines and of the terminator, which the pen could
 * count and darken but never thicken; how much colour is in the marker, welded
 * at one chroma so that four marker pages differed only in where they sat on
 * the wheel; and the flat stepped wash under the line, which is the only value
 * in the material no page had ever set and which the entire toned-paper
 * tradition is made of.
 */
export interface Preset {
  /** Never shown - it names the control for a screen reader. */
  name: string;
  surface: Surface;
  /** The mount behind the sheet: a tone, or the sheet itself. */
  backdrop: Backdrop;
  /** The sheet the drawing is made on. */
  paper: number;
  sun: { azimuth: number; elevation: number; intensity: number; temperature: number; shadows: 'off' | 'hard' | 'soft' };
  fill: boolean;
  marker?: { hue: number; high: number; chroma: number };
  hatch?: { angle: number; spacing: number; width: number; length: number };
  /** The hand it is drawn with. Every page that lands on a drawn rung names one. */
  pen?: {
    outline: number;
    formCount: number;
    formStrength: number;
    formWidth: number;
    terminator: number;
    terminatorWidth: number;
  };
  /**
   * The flat tone under the line, for the pages that have one.
   *
   * A page that does not name a wash is left alone, like the pen: it shows only
   * where the pen shows, and every page that lands there names its own.
   */
  wash?: { amount: number; steps: number };
  /**
   * The floor this page composed for itself. Six of them did.
   *
   * They are the light studies - the pages about a cast shadow, which has to
   * land on something - and their tones are chosen against their own paper and
   * their own sun rather than computed: 74 under a bright marker page, 186
   * under an overcast one, which is a range no formula produces.
   *
   * A PAGE WITHOUT ONE STILL STANDS ON A FLOOR. It used to stand on nothing,
   * on the argument that a study of forms in nothing is what the ruling is for
   * and a plane under it is a second value competing with the drawing. The
   * ruling is still there and the argument was not wrong; it was just answering
   * a different question than the one the deck now asks. See `floorFor` in
   * store.ts for the tone an unnamed page gets.
   */
  ground?: { on: boolean; tone: number };
}

export const PRESETS: Preset[] = [
  {
    // Where the tool opens: line, flat black, and nothing between, mounted so
    // the drawing is the only thing on the screen with a value.
    //
    // The two weights are the ones it has always been drawn at. They are
    // written down now because a page names its whole hand or it inherits
    // whatever the last drag left in the panel.
    name: 'Brush page on black',
    surface: 'brush',
    backdrop: 0,
    paper: 243,
    sun: { azimuth: 40, elevation: 48, intensity: 3.5, temperature: 5600, shadows: 'hard' },
    fill: false,
    pen: { outline: 2, formCount: 2, formStrength: 0.18, formWidth: 0.9, terminator: 1, terminatorWidth: 1.3 },
  },
  {
    // A plate: raking evening light and the whole page built out of the needle.
    // The sun is low because an etched form is read off the turn, and a high
    // sun leaves nothing to turn through.
    //
    // The rule is unbroken and now SAYS so. It used to ask for a lift every 420
    // sheet pixels, which at arm's length is a run longer than the object - so
    // the strokes ran unbroken, the axis read the same at both ends of its
    // travel, and the number could not be got back once the slider was touched.
    name: 'Etched plate',
    surface: 'hatch',
    backdrop: 'paper',
    paper: 243,
    sun: { azimuth: 58, elevation: 22, intensity: 3.2, temperature: 4200, shadows: 'hard' },
    fill: false,
    hatch: { angle: 0, spacing: 11, width: 1.05, length: 0 },
    // Light, because a plate is engraved rather than outlined - the needle
    // makes the edge by stopping.
    pen: { outline: 1.2, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 0.35, terminatorWidth: 1.3 },
  },
  {
    // The same needle held much lighter, on a sheet barely off white: a study
    // where the line is a whisper and the form does all the talking.
    //
    // The fill is off rather than on. On a drawn rung the ink shader takes
    // lambert = dot(N, L) and nothing else, and there is no floor here for the
    // second lamp to reach either - it was a light this page asked for and
    // never once received.
    name: 'Silverpoint',
    surface: 'hatch',
    backdrop: 236,
    paper: 252,
    sun: { azimuth: 120, elevation: 42, intensity: 2.6, temperature: 6200, shadows: 'off' },
    fill: false,
    hatch: { angle: 24, spacing: 17, width: 1.0, length: 0 },
    // A whisper, and the form lines carry it: silverpoint cannot make a heavy
    // mark at all, which is why it is drawn with so many light ones.
    pen: { outline: 0.8, formCount: 3, formStrength: 0.12, formWidth: 0.9, terminator: 0.5, terminatorWidth: 1.3 },
  },
  {
    /*
     * The needle held hard and close, and NO CONTOUR AT ALL.
     *
     * A bank-note ruling: fine enough that the ranks read as value until you
     * put your eye to them, which is the whole trick an engraver is doing. The
     * edge is where the strokes stop - an engraver working in tone lays no line
     * anywhere - and this is the page the outline knob's zero exists for.
     *
     * The weight is 1.0 rather than 0.8 because 0.8 was never drawn: wPage =
     * max(hatchWidth, 1.0) at line 567, so the bottom of that knob is a floor
     * and three pages in this file were sitting under it asking for three
     * different rulings and getting one.
     */
    name: 'Steel engraving',
    surface: 'hatch',
    backdrop: 0,
    paper: 240,
    sun: { azimuth: 214, elevation: 36, intensity: 3.8, temperature: 5200, shadows: 'hard' },
    fill: false,
    hatch: { angle: 62, spacing: 6, width: 1.0, length: 0 },
    pen: { outline: 0, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 0.2, terminatorWidth: 1.3 },
  },
  {
    /*
     * The gouge, against four pages of needle.
     *
     * Two numbers that have never done anything until now. wPage clamps at
     * max(hatchWidth, 1.0), so 0.8, 0.9, 1.0 and 1.05 all drew at one identical
     * weight; at 2.6 the closure term - the 1.0 + 1.7 * smoothstep past dark
     * 0.70 - takes the stroke to about nine sheet pixels against a gap of
     * fifteen, so the darks chip together into solids with no fill under them.
     * That is a relief block: it gets its blacks by cutting less, not by
     * flooding.
     *
     * And length 26, which is the first break in this file anybody will see. At
     * the 300 to 900 the etched pages ask for, the run is longer than the
     * object and 0 means the same thing, so the axis read identically at both
     * ends of its own travel. A needle does not lift. A gouge does, about every
     * seven centimetres out there.
     *
     * Angle 90 rules the flats and the cast shadow and nothing else - on curved
     * form the strokes are ruled on the facing ratio, which has no angle in it -
     * so it is set for the walls. Shadows off: a print stands on nothing.
     */
    name: 'Woodcut',
    surface: 'hatch',
    backdrop: 168,
    paper: 234,
    sun: { azimuth: 328, elevation: 24, intensity: 3.4, temperature: 4400, shadows: 'off' },
    fill: false,
    hatch: { angle: 90, spacing: 15, width: 2.6, length: 26 },
    pen: { outline: 4.5, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 0.3, terminatorWidth: 1.3 },
  },
  {
    /*
     * Bewick's end grain: white strokes on a black block, and the shader was
     * never told to invert anything.
     *
     * Past a relative luminance of 0.179 the sheet stops being paper and inkFor
     * turns the pen to chalk. So this is the etched page with one number moved,
     * and everything else follows.
     *
     * Elevation 58 is deliberately against the convention the other hatch pages
     * keep. They all sit between 22 and 42 because hatchInk *= step(0.24, dark)
     * leaves bare paper wherever lambert > 0.76, and on white a high sun is an
     * empty sheet. On black an empty sheet is a solid block, which is exactly
     * what a white-line vignette is: the cutting crowds only where the form
     * turns away and the rest stays uncut.
     *
     * Honest about what it is not. The strokes are ruled on dark, so they land
     * where the light is not, and a scratchboard artist works the other way
     * round. It is a negative of 'Etched plate' and no page can fix that - it
     * would take inverting dark in the shader, which is not a page's business.
     * At this elevation almost nothing is dark enough to rule at all, so what
     * survives is line describing a turn rather than a tonal statement, and
     * that is what a white-line block actually is.
     *
     * formStrength 0.55 because a white line at 0.2 on black is a grey smudge;
     * the top half of that knob has been unused by the whole deck. Terminator
     * 0: on this sheet it would be the brightest mark on the page and it lands
     * where the block should stay solid.
     */
    name: 'White-line block',
    surface: 'hatch',
    backdrop: 226,
    paper: 18,
    sun: { azimuth: 132, elevation: 58, intensity: 3.0, temperature: 5000, shadows: 'off' },
    fill: false,
    hatch: { angle: 45, spacing: 13, width: 1.4, length: 60 },
    pen: { outline: 2.6, formCount: 3, formStrength: 0.55, formWidth: 0.9, terminator: 0, terminatorWidth: 1.3 },
  },
  {
    /*
     * The strokes carry the dark, the sheet carries the middle, and the flat
     * tone fills the gap between them.
     *
     * Every etched page in the deck sits on white and builds all of its value
     * out of ruling, because a plate has no other value to give. Chalk on
     * Ingres is the opposite problem: the sheet is ALREADY the halftone, so the
     * strokes only have to say where it goes darker. The wash is the one thing
     * in this material that can put a value in the GAPS between strokes - this
     * rung lays no fill under anything at all - and at three steps the plateaus
     * land where a hand would stop one layer and start the next.
     *
     * paper 104 is inside the run between 88 and 128 that no page has ever
     * stood in. The pen falls out of the sheet rather than being chosen: inkFor
     * still picks the near-black at this luminance, but it carries the sheet's
     * hue and one and a half times its saturation into it, so the line comes
     * out a dark warm brown. Nothing had to be told to do that.
     *
     * width 1.6, which is the first ruling in the file genuinely heavier than
     * the needle's. length 34 rather than the 300-900 the others ask for: it
     * breaks where a stick lifts, and it is inside the slider's own range, so a
     * page dealt here survives being touched.
     *
     * Elevation 28 keeps it inside the 22-42 every hatch page lives in -
     * nothing is drawn above lambert 0.76, so a high sun on this rung is an
     * empty sheet. See 'White-line block' for the one page that wants that.
     */
    name: 'Conté on Ingres',
    surface: 'hatch',
    backdrop: 'paper',
    paper: 104,
    sun: { azimuth: 262, elevation: 28, intensity: 3.2, temperature: 4400, shadows: 'off' },
    fill: false,
    hatch: { angle: 20, spacing: 13, width: 1.6, length: 34 },
    wash: { amount: 0.9, steps: 3 },
    pen: { outline: 1, formCount: 2, formStrength: 0.2, formWidth: 0.9, terminator: 0.3, terminatorWidth: 1.3 },
  },
  {
    // Past the crossing at 0.179 the sheet stops being paper and becomes a
    // board, and the pen turns to chalk on its own. Everything inverts and
    // nothing had to be told to.
    //
    // A blunt stick on a rough board, which it said before and could not draw:
    // the wrap is two broad soft bands at 2.6 px, not the engraver's hairline
    // every other page in here was stuck with. Heavy and faint is a different
    // hand from fine and dark, and until formWidth existed only one of them
    // could be asked for.
    name: 'Chalk on slate',
    surface: 'brush',
    backdrop: 10,
    paper: 26,
    sun: { azimuth: 186, elevation: 26, intensity: 4.2, temperature: 5000, shadows: 'hard' },
    fill: false,
    pen: { outline: 2.8, formCount: 2, formStrength: 0.26, formWidth: 2.6, terminator: 1, terminatorWidth: 1.3 },
  },
  {
    /*
     * Late, low and warm, with the mount almost black: most of the page is
     * spotted ink and what is left of the light does all the drawing.
     *
     * And the blacks now have a cut through them. The fill's edge and the
     * terminator are the same lambert = 0 crossing, and inside the fill the pen
     * draws in PAPER (line 646), so the terminator has always come out as a
     * paired mark - ink outside, sheet inside. At the welded 1.3 px that pair
     * is a hairline nobody would call a decision. At 4.2 it is the white
     * channel a gouge leaves between two blacks, which is the whole mark of
     * every strike poster ever pulled, and this is the page with enough black
     * on it for the channel to run anywhere.
     *
     * Not much further, either: past about 5 the white half starts eating the
     * spotted black and the page turns into an outline of itself.
     */
    name: 'Night study',
    surface: 'brush',
    backdrop: 4,
    paper: 214,
    sun: { azimuth: 296, elevation: 13, intensity: 4.6, temperature: 2700, shadows: 'hard' },
    fill: false,
    pen: { outline: 3.6, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 1, terminatorWidth: 4.2 },
  },
  {
    /*
     * NOTAN: the shapes, and nothing else whatsoever.
     *
     * No contour, no form lines, no terminator - only the spotted blacks the
     * brush page lays under its line. What is left is the oldest exercise
     * there is, and the one every composition is judged by: two values, and
     * whether the arrangement reads before anything is described. Take the
     * pen off a brush page entirely and this is what is underneath it.
     *
     * The two weights are written down and reach nothing: at strength 0 there
     * is no mark to be heavy. They are here because the pen is one hand and a
     * page states all of it.
     */
    name: 'Notan',
    surface: 'brush',
    backdrop: 250,
    paper: 250,
    sun: { azimuth: 148, elevation: 34, intensity: 4.0, temperature: 5200, shadows: 'off' },
    fill: false,
    pen: { outline: 0, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 0, terminatorWidth: 1.3 },
  },
  {
    /*
     * The clear line: one heavy even contour and nothing modelled inside it.
     *
     * Hergé's discipline and every animation model sheet since - the whole
     * form carried by an edge of constant weight, with no hatching, no
     * terminator and no interior line to say which way the light is. It is the
     * hardest test of a construction there is, because a wrong box has nothing
     * to hide behind.
     */
    name: 'Clear line',
    surface: 'brush',
    backdrop: 236,
    paper: 250,
    sun: { azimuth: 66, elevation: 52, intensity: 3.2, temperature: 5600, shadows: 'off' },
    fill: false,
    pen: { outline: 5.5, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 0.12, terminatorWidth: 1.3 },
  },
  {
    /*
     * Cross-contour: the wrap, turned all the way up and cut fine.
     *
     * Form lines are ruled at even steps of how squarely the surface meets the
     * eye, so their iso-lines are the curves an engraver actually cuts - rings
     * round a rim, bands wrapping a cylinder. At two, faintly, they are a
     * seasoning. At six and half dark they are the drawing, and the crowding
     * where the form swings away IS the foreshortening.
     *
     * Half a sheet pixel, against 'Chalk on slate' at 2.6. That is the whole
     * argument for the weight being settable: engraved and numerous at one end,
     * a stick dragged on its side at the other, and until now both of them came
     * out at 0.9 and the two pages differed only in how many.
     */
    name: 'Cross-contour',
    surface: 'brush',
    backdrop: 18,
    paper: 246,
    sun: { azimuth: 250, elevation: 44, intensity: 3.0, temperature: 6000, shadows: 'off' },
    fill: false,
    pen: { outline: 1.4, formCount: 6, formStrength: 0.5, formWidth: 0.5, terminator: 0.5, terminatorWidth: 1.3 },
  },
  {
    /*
     * Four values, three of them flat, and not one of them a mark.
     *
     * An aquatint is not a wash. The resin ground is bitten in stages, each
     * stage stopped out at a hard edge, and each stage is one flat plateau -
     * which is exactly what floor(lit * steps + 0.5) / steps makes at line 415,
     * and the one thing on this page nothing else in the file can produce.
     *
     * steps 2 gives three levels across the lit side. With the fill's solid
     * black under the terminator that is four values, which is a Goya plate and
     * not one value more.
     *
     * It is on brush rather than hatch on purpose, though the wash is more
     * NEEDED on hatch: there the strokes already are the tone and a plateau
     * underneath answers a question that has been answered. Here the wash has
     * the whole lit side to itself, which is the only surface it survives on
     * anyway - inside the fill, base = mix(ground, ink, black) with black = 1,
     * so the ground is thrown away entirely.
     *
     * Which is why elevation 44 rather than the raking sun the etched pages
     * want. The wash only draws where lambert is positive, so a low sun leaves
     * it nothing to sit on. A high sun is the wrong instinct here and the right
     * number.
     *
     * Honest about the ceiling: shade is multiplied by a hard-coded 0.16, so
     * amount 1.0 is about an 18 per cent grey. The plateaus are lighter than a
     * real bite and this page cannot fix that from here. The knob is already at
     * its top; the constant is what would have to move.
     */
    name: 'Aquatint',
    surface: 'brush',
    backdrop: 222,
    paper: 249,
    sun: { azimuth: 76, elevation: 44, intensity: 3.4, temperature: 4600, shadows: 'hard' },
    fill: false,
    wash: { amount: 1, steps: 2 },
    pen: { outline: 1.5, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 1, terminatorWidth: 1.3 },
  },
  {
    /*
     * Four values, and only one of them is drawn.
     *
     * steps 2 puts a plateau just above the terminator, a lighter one through
     * the halftone, bare sheet in the light, and the spotted blacks under all
     * of it. Lifting with a kneaded eraser does not make a white - it takes the
     * charcoal off and gives the paper back - so bare paper IS the lifted
     * light, and on a sheet at 136 that is a middle value. That is the whole
     * argument for toned stock, and the one place this material's ceiling stops
     * being a limit: the wash is not being asked to BE the middle here, only to
     * deepen it before the shadow goes solid, which is what a chalk does.
     *
     * White chalk was tried and is not reachable. Nothing in here draws lighter
     * than the sheet - inside the fill the pen swaps to paper, and paper is the
     * top of the range - so trois crayons is not a page this tool can deal, and
     * faking it with a pale stain would put the heightening on the SHADOW side,
     * since the accent band lives below accentHigh. This page does not pretend
     * otherwise.
     *
     * terminatorWidth 3.4 is what makes it charcoal rather than ink: the pen
     * runs in paper inside the fill, so a wide terminator draws a paired band -
     * dark outside, sheet inside - along the core shadow. That is a stumped
     * edge, and terminatorStrength could never reach it, because strength is
     * opacity and this is width.
     *
     * The only drawn page in the deck standing on a floor. Mount at 34 so the
     * sheet reads as a sheet in a dark mat: below the 0.18 chrome flip, and it
     * does not matter that it is also under the 0.1 where the bare-paper
     * catcher zeroes its alpha, because ground.on gives the shadow a real plane
     * to land on. fill off - a second light would lift the cast shadow, and the
     * cast shadow is half of why anybody draws a still life in charcoal.
     */
    name: 'Charcoal, lights lifted',
    surface: 'brush',
    backdrop: 34,
    paper: 136,
    sun: { azimuth: 98, elevation: 36, intensity: 3.8, temperature: 4800, shadows: 'hard' },
    fill: false,
    wash: { amount: 1, steps: 2 },
    pen: { outline: 2.6, formCount: 1, formStrength: 0.24, formWidth: 0.9, terminator: 1, terminatorWidth: 3.4 },
    ground: { on: true, tone: 90 },
  },
  {
    // Ink first, then the marker: the sheet everybody who has seen a Kim Jung
    // Gi page recognises. 0.72 is the chroma the stain was always mixed at -
    // it is a number now rather than a constant in the writer, and this page is
    // the reason it is the default.
    name: 'Green marker',
    surface: 'marker',
    backdrop: 'paper',
    paper: 243,
    sun: { azimuth: 34, elevation: 40, intensity: 3.6, temperature: 5400, shadows: 'hard' },
    fill: false,
    marker: { hue: 88, chroma: 0.72, high: 0.62 },
    // The ink under the marker is the drawing, so it is drawn firmly.
    pen: { outline: 2.4, formCount: 2, formStrength: 0.22, formWidth: 0.9, terminator: 1, terminatorWidth: 1.3 },
  },
  {
    // Red chalk on toned paper, lit late and low: the oldest way of drawing a
    // body there is, and the one the marker pass turns out to be very good at.
    //
    // The sheet was at 250 because nothing in this file had ever stood between
    // 26 and 208, not because anybody draws a sanguine on white. At 158 the
    // stain sits under the sheet the way chalk sits on laid paper, and the
    // paper the marker leaves bare above accentHigh becomes a toned highlight
    // rather than a hole punched in the drawing.
    name: 'Sanguine',
    surface: 'marker',
    backdrop: 196,
    paper: 158,
    sun: { azimuth: 5, elevation: 28, intensity: 3.0, temperature: 3200, shadows: 'hard' },
    fill: false,
    marker: { hue: 16, chroma: 0.72, high: 0.5 },
    // Chalk is form lines. It has almost no edge and a great deal of wrap.
    pen: { outline: 1.1, formCount: 5, formStrength: 0.34, formWidth: 0.9, terminator: 0.9, terminatorWidth: 1.3 },
  },
  {
    /*
     * A marker page standing on its own floor, mounted dark.
     *
     * Every other marker page here floats on bare paper, which is right for a
     * study and wrong for a scene: a stain describing an object and no stain
     * under it puts the object nowhere. A middle floor gives the shadow
     * somewhere to land without competing with the colour.
     */
    name: 'Marker on a floor',
    surface: 'marker',
    backdrop: 12,
    paper: 244,
    sun: { azimuth: 158, elevation: 30, intensity: 3.6, temperature: 4600, shadows: 'hard' },
    fill: false,
    marker: { hue: 32, chroma: 0.72, high: 0.58 },
    pen: { outline: 2.2, formCount: 1, formStrength: 0.2, formWidth: 0.9, terminator: 0.9, terminatorWidth: 1.3 },
    ground: { on: true, tone: 74 },
  },
  {
    /*
     * One drum, one ink, one pass - and the far end of a knob the whole deck
     * uses a third of.
     *
     * marker.high is the lambert above which the paper is left bare. The other
     * marker pages sit between 0.50 and 0.62, where the colour is a band
     * hugging the terminator and most of the form is white: that is a marker
     * being used to SHADE. At 0.92 it floods everything the fill has not
     * already blacked in and what survives is a sliver at the top of the light,
     * which is not shading at all - it is one flat spot ink at full coverage. A
     * duplicator carries one ink at one density and has no halftone worth the
     * name at this size.
     *
     * So the sheet carries three things and only three: the key, the ink, and
     * the paper the ink missed.
     *
     * Hue 338 is the fluorescent pink every one of these machines is bought
     * for, and chroma stays at the welded 0.72 - for once that default is
     * exactly right, because a riso pink is a bright saturated stain and does
     * not want talking down.
     *
     * No terminator: the boundary between key and ink is already the fill's own
     * edge, and a line there draws a white nick that reads as a printing fault.
     * No form lines either - any interior mark would be claiming a second pass
     * through the drum. Outline 2.6, because the key is the only thing holding
     * the ink and a thin one does not survive the impression on this stock.
     */
    name: 'Risograph',
    surface: 'marker',
    backdrop: 214,
    paper: 236,
    sun: { azimuth: 348, elevation: 34, intensity: 3.4, temperature: 5200, shadows: 'hard' },
    fill: false,
    marker: { hue: 338, chroma: 0.72, high: 0.92 },
    pen: { outline: 2.6, formCount: 0, formStrength: 0, formWidth: 0.9, terminator: 0, terminatorWidth: 1.3 },
  },
  {
    /*
     * A cool grey over a tech pen line: the marker rendering a design studio
     * actually produces, and the only marker in the box that is not a colour.
     *
     * Four pages on this rung differed only in where they sat on the wheel,
     * because writeMarker welded the saturation at 0.72 and let nothing but the
     * hue move. Its own comment defends that as what makes the stain read as a
     * marker rather than as paint - which holds for the LIGHTNESS, and that
     * stays welded at 0.58 for exactly that reason, but not for the chroma. The
     * greys are the markers most people own and they were unreachable at every
     * hue. At 0.10 there is just enough blue left to be a cool grey rather than
     * a neutral one; at 0 the hue knob beside it stops meaning anything, which
     * is why the slider does not go there.
     *
     * high 0.84 rather than the 0.50-0.62 the others use, because a marker
     * rendering starts with one pass of the base grey over everything except
     * the planes taking the light. That reserve is the highlight and it is the
     * only white on the sheet.
     *
     * No wash on this rung, and that is not an oversight. The accent covers
     * everything under accentHigh and the tone is largest exactly there, at the
     * terminator, so all that would survive is a sliver above the cut where the
     * quantiser has already rounded it towards 0. The knob would look broken.
     *
     * No floor: at a mount of 140 the bare-paper catcher is well clear of the
     * luminance where its alpha zeroes, so the cast shadow lands on the sheet
     * as the drop shadow these are drawn with.
     */
    name: 'Cool grey marker',
    surface: 'marker',
    backdrop: 140,
    paper: 250,
    sun: { azimuth: 44, elevation: 58, intensity: 3.8, temperature: 5600, shadows: 'hard' },
    fill: false,
    marker: { hue: 212, chroma: 0.1, high: 0.84 },
    pen: { outline: 1.7, formCount: 1, formStrength: 0.24, formWidth: 0.9, terminator: 0.7, terminatorWidth: 1.3 },
  },
  {
    // Not a drawing at all: the objects as objects, lit hard from overhead
    // with a second light to keep the shadow side readable. What the drawn
    // pages are abstractions OF.
    name: 'Noon clay',
    surface: 'original',
    backdrop: 232,
    paper: 232,
    sun: { azimuth: 24, elevation: 72, intensity: 4.4, temperature: 5800, shadows: 'hard' },
    fill: true,
    // A cast shadow wants a plane to fall across - on bare paper it is a grey
    // shape attached to nothing.
    ground: { on: true, tone: 150 },
  },
  {
    /*
     * A lit room: the objects as objects, standing on a floor, in a raking
     * afternoon light with a cool fill behind it.
     *
     * The clay page's opposite number. That one is overhead noon on a bright
     * floor and reads as a photograph; this is late and low, so every form
     * throws a long shadow across the plane and the drawing to be made from it
     * is a drawing of the light.
     */
    name: 'Long shadows',
    surface: 'matte',
    backdrop: 208,
    paper: 208,
    sun: { azimuth: 286, elevation: 14, intensity: 4.8, temperature: 3400, shadows: 'hard' },
    fill: true,
    ground: { on: true, tone: 128 },
  },
  {
    /*
     * A grey day: no cast shadow anywhere, and the forms held apart by nothing
     * but which way they face.
     *
     * The one page here with the sun's shadows OFF while standing on a floor,
     * and that switch is the whole page - off, the floor keeps a contact
     * darkening under everything and nothing else, which is what cloud does.
     * The sky is the source, so there is no direction sharp enough to throw a
     * shape. Tried it on 'soft' first and it read as a hazy afternoon: a
     * penumbra still says where the sun is, and the point here is that nothing
     * does.
     *
     * 'original' rather than matte, and it is the only light page that should
     * be. This is the steadiest, most even light in the set, which makes it the
     * one you could actually read a material under; stripping it to plaster
     * throws away the only page that could. 'Noon clay' next to it is the same
     * rung under a hard key, so the pair is also the answer to what flat light
     * costs you.
     *
     * Eighty-four degrees and only 2.0 - the lowest key in the deck. The ratio
     * matters and the level does not: a key three times its fill is a sunny day
     * at any brightness, and this wants about two, which is as flat as one fill
     * can make it. Nearly overhead rather than at 'Noon clay''s 72 for the same
     * reason - at 72 the four sides of a box separate into a lit pair and a
     * black pair, and under cloud they should sit within a value of each other.
     *
     * The honest limit, since this is the page that runs into it: with one key,
     * one fill and no ambient term anywhere in the renderer, a face pointing
     * away from both still goes to nothing. This is overcast as close as the
     * tool comes, not overcast.
     *
     * The floor is lighter than it looks like it should be because under cloud
     * the ground is the thing pointing straight at the source. It renders about
     * 160 against a 200 mount, which is the right way round.
     */
    name: 'Overcast',
    surface: 'original',
    backdrop: 200,
    paper: 200,
    sun: { azimuth: 128, elevation: 84, intensity: 2.0, temperature: 6900, shadows: 'off' },
    fill: true,
    // No pen, marker or hatch. A lit rung reads none of them, and a page that
    // names a pen it cannot draw with silently restyles anything standing
    // beside it on a drawn rung.
    ground: { on: true, tone: 186 },
  },
  {
    /*
     * One hard lamp in a dark room and nothing else: no fill, so the shadow
     * side of everything is not dark but absent.
     *
     * Every other page about light here switches the fill on to work around the
     * renderer having no ambient term. This is the page that does not. A
     * photoflood a few metres off in a room with black walls, where the drawing
     * is two shapes - the lit one and the cast one - and there is no third
     * value anywhere on the sheet to soften the decision. It is the setup a
     * cast is drawn under, and the reason is that it removes every excuse.
     * 'Overcast' is the other end of the same knob.
     *
     * The mount is 124 and that is not taste. The crossing where the chrome
     * flips and a solid box turns from white to black is a relative luminance
     * of 0.18, which lands at 118 of 255 on a neutral mount - so a room dark
     * enough to be honest about the name is on the wrong side of it and takes
     * the object with it. Six steps of headroom is what this page is: the
     * darkest surround that still leaves a lit form standing in it. Tried it at
     * 8, which is a real page and a different one, and not one to deal onto the
     * cube the tool opens with.
     *
     * The floor is 118 rather than the 40 the room suggests, for the same
     * reason the shadow is the subject: with no fill the cast shape goes to
     * true black wherever it lands, so what it lands on has to be light enough
     * to have lost something. On a floor at 40 the shadow is drawn on a shadow.
     *
     * 3100 because a lamp is a lamp. It is the one thing in this deck that is
     * indoors, and neutral light indoors at night is a lie the page does not
     * need to tell.
     */
    name: 'One lamp',
    surface: 'matte',
    backdrop: 124,
    paper: 124,
    sun: { azimuth: 322, elevation: 44, intensity: 3.4, temperature: 3100, shadows: 'hard' },
    fill: false,
    // No pen, marker or hatch - see 'Overcast'.
    ground: { on: true, tone: 118 },
  },
];

/**
 * Deal a different one.
 *
 * Different, deliberately: a shuffle that can hand you back the page you are
 * already looking at is a shuffle that looks broken half the time it is
 * pressed.
 */
export const nextPreset = (current: string | null): Preset => {
  const pool = PRESETS.filter((p) => p.name !== current);
  return pool[Math.floor(Math.random() * pool.length)] ?? PRESETS[0];
};
