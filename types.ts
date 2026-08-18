import type { Object3D } from 'three';
import type { OwnMesh } from './lib/assets';

export interface BoxData {
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  name?: string;
  /** How solidly it is drawn. Absent means whatever the scene's default is. */
  surface?: Surface;
  /**
   * How the drawing of it is ruled, if it has been set apart from the page's.
   * Absent - and it is absent for everything until a knob is turned on it - is
   * "drawn with the page's own", which is what keeps a scene of forty boxes on
   * one material rather than forty.
   */
  material?: MaterialSettings;
}

export type ThemeMode = 'light' | 'dark';

/**
 * The instrument in your hand: nothing, the block-out pencil, or the pencil
 * held at arm's length. One at a time, because it is one hand.
 */
export type Instrument = 'none' | 'block' | 'measure';

/**
 * How the scene is projected. Three systems, all of them ones you can draw in.
 *
 * - 'cylindrical': four-point. Verticals stay straight and vertical; horizontals
 *   bow. The panoramic system, and the one to rule a long wall with.
 * - 'equidistant': five-point, and the default. Angle from the centre of the
 *   frame is distance from the centre, evenly, in every direction - which is
 *   what makes a ruled sphere of it and what Kim Jung Gi draws on.
 * - 'stereographic': the conformal one. See `lib/projection.ts`.
 *
 * There used to be two more. 'linear' was straight-line perspective, kept only
 * for a session standing in a real room, and that went with the room. '5-point'
 * was the equidistant sheet opened past the hemisphere - which, once the sheet
 * was cut properly at its own edge, turned out to be the equidistant sheet
 * exactly. Two names for one mapping is one name too many.
 */
export type PerspectiveMode = 'cylindrical' | 'equidistant' | 'stereographic';

/**
 * How solidly one thing in the scene is drawn.
 *
 * Not a look: different questions you can ask of the same object, and the one
 * worth asking changes several times in the course of a study.
 *
 * - 'original': opaque, as the thing is. A box in plain white, a mesh in the
 *   materials its file was authored with. What is behind it is behind it.
 * - 'matte': opaque, plain white, no texture. Photographed skin and fabric is a
 *   lot of information to draw past; stripped out, a figure reads as form and
 *   value only, which is what it is doing in a scene full of white boxes.
 * - 'brush': the drawing itself, and the only question a perspective study
 *   actually asks - where would the pen go. Line where the form turns away
 *   from the eye, the terminator that says which way the light is, and the
 *   blacks spotted in solid. Every other rung answers "what is this made of".
 * - 'marker': the same page with one flat colour laid in the band between the
 *   spotted blacks and the bare paper - ink first, then a marker over it,
 *   which is the order it is really done in. Three values and no fourth.
 * - 'hatch': the etched page. No fill anywhere: the value is built out of
 *   ruled strokes that cross a second and a third time as the light goes out,
 *   and the paper between them does the rest.
 *
 * Three rungs have been taken away over time and all three for the same
 * reason: a rung nobody reaches for is a rung in the way of the next one.
 * 'glass' was translucent and wrote no depth, so the far edges came through
 * the near faces - answered better by the construction cage, which draws
 * through by construction. 'wire' was the twelve edges and nothing else, which
 * is the cage again with the object thrown away. And 'ink' was 'brush' without
 * the blacks: a real stage of a real drawing, and not a thing anybody stops
 * at when the finished page is one tap away.
 *
 * Every box and every placed mesh carries its own, so a scene can have a solid
 * car standing inside a wire box on a floor of inked ones - which is exactly the
 * arrangement a study wants and what a single scene-wide setting could never say.
 */
export type Surface = 'original' | 'matte' | 'brush' | 'marker' | 'hatch';

/**
 * The whole ladder, in order. What the scene-wide control steps through.
 *
 * Ordered by how much has been taken away: everything the file says, then the
 * texture gone, then the light gone too and only the line left, then the object
 * itself.
 */
export const SURFACES: Surface[] = ['original', 'matte', 'brush', 'marker', 'hatch'];

/** What a box steps through: it has no authored material to strip. */
export const BOX_SURFACES: Surface[] = ['original', 'brush', 'marker', 'hatch'];

/**
 * What a mesh steps through: it has no cage to fall back on, so taking its
 * surface away entirely would leave nothing on screen to take hold of again.
 */
export const MESH_SURFACES: Surface[] = ['original', 'matte', 'brush', 'marker', 'hatch'];

/**
 * The nearest rung a given kind of thing can actually draw.
 *
 * The scene-wide control names one rung for everything at once, and each kind
 * answers with the closest thing it has: a box asked for matte is already plain
 * white, and a mesh asked for wire gives you the ink it can do instead of
 * disappearing - which is the honest neighbour, both being line and no surface.
 */
export const nearestSurface = (surface: Surface, rungs: Surface[]): Surface =>
  rungs.includes(surface) ? surface : surface === 'matte' ? 'original' : 'brush';

/**
 * The rung the thing in your hand is actually drawn on. Null when nothing is.
 *
 * Two answers used to be needed for one question - the selection bar worked it
 * out from the box or mesh it already had, and the overlay had no way to ask at
 * all - and they have to agree exactly, because one of them draws the button
 * that opens the page's knobs and the other decides which knobs those are. A
 * button promising hatch over a panel of marker knobs is worse than no button.
 *
 * Its own override first, the scene's default behind it, and whichever of the
 * two comes back is answered on the ladder that kind of thing can actually
 * draw - a box asked for matte is already plain white.
 */
export const selectionSurface = (state: {
  boxes: BoxData[];
  models: SceneModel[];
  selectedId: string | null;
  selectedModelId: string | null;
  surface: Surface;
}): Surface | null => {
  const model = state.selectedModelId
    ? state.models.find((m) => m.id === state.selectedModelId)
    : undefined;
  if (model) return nearestSurface(model.surface ?? state.surface, MESH_SURFACES);
  const box = state.selectedId ? state.boxes.find((b) => b.id === state.selectedId) : undefined;
  if (box) return nearestSurface(box.surface ?? state.surface, BOX_SURFACES);
  return null;
};

/**
 * The settings the thing in your hand has of its own, if it has any.
 *
 * Beside `selectionSurface` and asked the same way, for the same reason: the
 * panel reads it to know what to show, and the store writes through it to know
 * what to change. Undefined is not "nothing" but "drawn with the page's", which
 * is what everything is until a knob is turned on it.
 */
export const selectionMaterial = (state: {
  boxes: BoxData[];
  models: SceneModel[];
  selectedId: string | null;
  selectedModelId: string | null;
}): MaterialSettings | undefined =>
  (state.selectedModelId
    ? state.models.find((m) => m.id === state.selectedModelId)
    : state.selectedId
      ? state.boxes.find((b) => b.id === state.selectedId)
      : undefined
  )?.material;

/**
 * Whether a rung has anything to set.
 *
 * All three of the drawn ones now. It was the two that are a family rather than
 * a look - the marker's colour, the hatch's rule - and brush was left out
 * because it had nothing of its own to offer. It has the pen, which it shares
 * with the other two and which nobody could reach at all before; a page whose
 * outline you cannot set is a page missing its most important mark.
 *
 * The two solid rungs still have nothing: 'original' is whatever the file says
 * and 'matte' is that with the texture taken off, and neither is drawn.
 */
export const surfaceHasSettings = (
  surface: Surface | null
): surface is 'brush' | 'marker' | 'hatch' => surface !== null && isSketch(surface);

/**
 * What the button that opens them should say it opens.
 *
 * In one place because two buttons ask it - the tools band of the whole page,
 * the selection bar of the thing in your hand - and a label that disagreed
 * between them would be two names for one panel. Each names what that page has
 * on top of the pen, and brush has only the pen.
 */
export const surfaceSettingsLabel = (surface: 'brush' | 'marker' | 'hatch') =>
  surface === 'hatch'
    ? 'How the hatching is ruled'
    : surface === 'marker'
      ? "The marker's own settings"
      : 'The pen this page is drawn with';

/**
 * A surface read back from something written earlier.
 *
 * A remembered *setting* is already checked against this list on the way in, so
 * a rung that no longer exists is dropped and the default stands. A saved
 * *scene* is not: it comes back through `restoreView` and goes straight into
 * the store, where nothing throws and everything downstream quietly disagrees -
 * the icon lookup comes back undefined and draws an empty button, and the
 * ladder's own step lands on the wrong rung because `indexOf` returned -1.
 *
 * So anything that was written by a version with a different ladder is read
 * through here, the same way the projection is.
 */
export const readSurface = (stored: unknown): Surface =>
  SURFACES.includes(stored as Surface)
    ? (stored as Surface)
    // The two rungs that were taken away both land on the page that replaced
    // them, rather than on the top of the ladder: somebody who was drawing in
    // ink wanted a drawing, not a photograph.
    : 'brush';

/**
 * Whether a rung is one of the drawn ones.
 *
 * Asked in eight places - the page's own tone, the construction colour, the
 * cage, the measures, the lamps' marks, the vanishing points - and it was
 * written out as `surface === 'ink' || surface === 'brush'` in every one of
 * them, which is a list that has to be found and edited each time the ladder
 * changes. It changed, twice.
 */
export const isSketch = (surface: Surface) =>
  surface === 'brush' || surface === 'marker' || surface === 'hatch';

/**
 * How much of the *room's* construction is drawn over the world.
 *
 * 0 nothing, 1 the eye-level line, 2 the curvilinear great circles with it -
 * the sheet a curved perspective is ruled on before anything is drawn. It steps
 * down from everything rather than toggling to nothing, because the useful
 * state is usually "slightly less than this".
 *
 * The ground grid used to be a rung of this. It is two switches of its own now,
 * one per direction: ruling only the lines running away from you, or only the
 * ones running across, is how a floor is actually drawn, and a ladder cannot say
 * it.
 */
export type GuideLevel = 0 | 1 | 2;

/**
 * How much construction is drawn around the thing in your hand.
 *
 * A ladder rather than a switch, because the constructions it steps through
 * are a sequence somebody actually works in rather than four unrelated looks:
 *
 *   0  nothing
 *   1  the rays: its own edges carried out to its own vanishing points
 *   2  ...and the rectangle it stands on, with the diagonals that FIND the
 *      centre of that rectangle - the one construction in perspective that
 *      needs no measurement and is exact at any angle on any sheet
 *   3  ...and the two lines through that centre: the floor under it, in four
 *
 * Two and three are what a viewer is doing when they place a second chair
 * halfway along a table or set a window in the middle of a wall, and until now
 * the tool could show where a thing's points were and not how to divide the
 * span between them.
 */
export type SelectionGuide = 0 | 1 | 2 | 3;
export const SELECTION_GUIDES: SelectionGuide[] = [0, 1, 2, 3];

/**
 * Whose things get their construction drawn: nobody's, the selection's, or
 * everybody's.
 *
 * The middle rung is the working default - the cage answers questions about
 * the thing in your hands. The top rung is the scene blocked in whole, which
 * is how a page is actually started: every object boxed before any object is
 * drawn. It is loud, which is why it is a rung you step onto and not a side
 * effect of selecting things.
 */
export type ConstructionLevel = 0 | 1 | 2;

/**
 * How far round the lens is allowed to open.
 *
 * 'human' stops at 210 degrees - about what two eyes actually cover - so the
 * drag never wanders past what a standing person could see and the whole range
 * of the control is spent where sight is. 'sphere' is the tool's usual reach:
 * out to the field where the entire sphere sits on the page with paper round
 * it. 'endless' unlocks three full turns, and in the cylindrical system the
 * sheet REPEATS instead of running out - the same room again and again along
 * one endless band, so a study can be set out on a frieze that never ends.
 */
export type FieldRange = 'human' | 'sphere' | 'endless';

/**
 * What is behind the drawing.
 *
 * The sketch materials draw on a sheet of their own - warm paper, near-black
 * pen - and until now the whole frame was that sheet, so an object drawn on
 * paper stood in a world made of the same paper. They are two decisions. A
 * drawing on white paper mounted on black is the oldest presentation there
 * is, and it is the one that makes the object read: the sheet stays the sheet
 * so the ink is still ink, while the page behind it goes to whatever separates
 * it best.
 *
 * `'paper'` is the old behaviour - the page IS the sheet. A number is a tone
 * of its own, read through the same warm ramp, and everything drawn OVER the
 * page rather than on the sheet follows it: the grid, the guides, the
 * construction, the cast shadow, and the chrome's own light or dark.
 */
export type Backdrop = 'paper' | number;
export const FIELD_RANGES: FieldRange[] = ['human', 'sphere', 'endless'];

/**
 * How much of the room is drawn.
 *
 * 0 nothing, 1 the ruling alone - lines hanging in the air where the walls
 * would be - and 2 the surfaces with it.
 *
 * A rung rather than a second switch. It was one boolean giving walls AND
 * twelve edges together, and the lines are the part that does the teaching: the
 * line where a wall meets the floor is the most informative mark in a room,
 * being the one that says how far away the wall is. You could not have it
 * without three flat greys standing in front of your drawing.
 */
export type RoomLevel = 0 | 1 | 2;

/**
 * Read a room setting written by any version.
 *
 * `true` reads as 2, not 1: it is what the flag used to draw, and nobody's
 * saved composition should come back looking different from how they left it.
 */
export const readRoomLevel = (stored: unknown): RoomLevel =>
  stored === true ? 2 : stored === 1 || stored === 2 ? stored : 0;

/**
 * How big the room is, in metres.
 *
 * The floor is the part worth changing and it is the part you drag: a corridor,
 * a square studio and a wide shallow hall are three different exercises, and
 * which one you are in is decided by these two numbers. The ceiling is not
 * dragged - three metres is a ceiling, and moving it turns out to be the least
 * interesting thing about a room - but it is kept here so a scene saved with a
 * different one comes back with it.
 */
export interface RoomSize {
  /** Across, along X. */
  width: number;
  /** Away, along Z. */
  depth: number;
  height: number;
}

/** As small and as large as the room goes. */
export const ROOM_LIMITS = {
  width: [3, 40] as const,
  depth: [3, 40] as const,
  height: [2, 12] as const,
};

/**
 * Metres that dragging snaps to. 0 is free.
 *
 * The ground grid is ruled at whatever is chosen here, so what you snap to is
 * what you can see to line things up against.
 */
export const SNAP_STEPS = [0, 0.05, 0.25, 1] as const;

/**
 * One step of history.
 *
 * The scene-wide surface is part of it because `cycleSurface` stamps every box
 * and mesh in one move - so without it, one step back put every object's rung
 * where it was and left the control saying something else, and the next object
 * placed arrived on a rung nothing else was on.
 */
export interface HistoryStep {
  boxes: BoxData[];
  models: SceneModel[];
  lamps: LampData[];
  surface?: Surface;
}

/**
 * A lamp standing in the composition.
 *
 * The sun says where the big light comes from; these say where the small ones
 * hang. They are scene objects like the boxes - placed, selected, slid, saved
 * with the composition and taken back by undo - not settings, which is what
 * separates a light EDITOR from a light panel.
 */
export interface LampData {
  id: string;
  /** Where it hangs. The second number is its height off the floor. */
  position: [number, number, number];
  /** A bulb shines every way at once; a spot throws a cone along its aim. */
  kind: 'bulb' | 'spot';
  /** Which way a spot faces, in radians about the vertical axis. */
  aim: number;
  intensity: number;
  /** Colour temperature in kelvin, on the same scale as the sun's. */
  temperature: number;
  /** A lamp you can switch off without losing where it stands. */
  enabled: boolean;
}

/**
 * A model dropped into the scene from a file.
 *
 * `object` is the loaded three.js object, or null when the file cannot be read
 * in the browser (binary crate USDZ).
 */
export interface SceneModel {
  id: string;
  name: string;
  object: Object3D | null;
  /** Footprint centre on the ground plane. */
  position: [number, number, number];
  rotationY: number;
  /** Uniform multiplier on the file's own size. 1 is as authored. */
  scale: number;
  /** The scale it was placed at - pose-corrected for library figures. */
  baseScale: number;
  /** Bounding box in metres as authored, before `scale`. */
  size: [number, number, number];
  /**
   * Where the geometry comes from: a bundled `/meshes/...` path, or an
   * `asset:<hash>` reference to a file imported into this browser.
   */
  fileUrl: string;
  format: 'usdz' | 'gltf';
  previewSupported: boolean;
  /** How solidly it is drawn. Absent means whatever the scene's default is. */
  surface?: Surface;
  /** How that drawing is ruled, if it has been set apart from the page's. */
  material?: MaterialSettings;
  /**
   * A room rather than an object.
   *
   * Everything about a placed mesh assumes you are standing outside it looking
   * at it: the cage it blocks into, its own three vanishing points, the
   * footprint it stands on. None of that means anything for a mesh you are
   * standing inside, where the box round it is the box round the room and its
   * axes are the world's. So a scene carries none of it.
   */
  kind?: 'object' | 'scene';
  /**
   * Its size is settled: leave it alone.
   *
   * A mesh comes in at the size the file says it is, and for the library three
   * that size is the real thing's - which is the whole reason for drawing
   * against them. Everything else about a placed mesh is meant to be handled:
   * slid along the floor, turned, lifted. Sizing is the one that is usually
   * done once and then only ever done again by accident, because the gesture
   * that turns a thing is the same two fingers that resize it and the two are
   * hard to keep apart on glass.
   *
   * So the size can be pinned on its own, and moving and turning carry on
   * exactly as before.
   */
  lockedScale?: boolean;
}

/**
 * How a cast shadow lands.
 *
 * Not a switch, because "hard" and "soft" are two different drawing decisions
 * rather than two settings of one. A soft edge is a rendering of what light
 * does at a real penumbra; on a sheet you are about to trace it is useless,
 * because you cannot tell which of your lines is the object and which is the
 * edge of its shadow. A hard edge is a shape - one you can lay a pen round and
 * drop as a solid, which is what a page of ink actually does with a shadow.
 *
 * So ink casts when, and only when, the shadow is hard. The mode's objection
 * was never to shadows; it was to soft boundaries.
 */
export type ShadowKind = 'off' | 'hard' | 'soft';

/** The ladder, in order: none, a shape, a rendering. */
export const SHADOW_KINDS: ShadowKind[] = ['off', 'hard', 'soft'];

/**
 * Read a shadow setting written by any version.
 *
 * It was a boolean, and `sun` is stored as one object that passes the settings
 * check on being an object at all - so without this a remembered `true` lands
 * in a string-typed field, every comparison against it is false, and a
 * returning viewer's sun quietly stops casting anything at all. `true` reads as
 * soft, so reloading changes nobody's picture.
 */
export const readShadows = (stored: unknown, fallback: ShadowKind = 'hard'): ShadowKind =>
  stored === true
    ? 'soft'
    : stored === false
      ? 'off'
      : SHADOW_KINDS.includes(stored as ShadowKind)
        ? (stored as ShadowKind)
        : fallback;

/**
 * Where a light is and how hard it burns.
 *
 * Azimuth is the compass bearing it shines *from*, in degrees clockwise from
 * -Z; elevation is its height above the horizon. Together they place it, which
 * is what decides where every cast shadow falls.
 */
export interface SunState {
  azimuth: number;
  elevation: number;
  intensity: number;
  /** Black-body colour temperature used by both the lamp and procedural sky. */
  temperature: number;
  /** How the sun's shadows fall, if at all. */
  shadows: ShadowKind;
}

/**
 * The second light.
 *
 * One hard light is the honest way to read a box - a face turned away from it
 * is genuinely unlit, and that value separation is the thing being drawn. But
 * one light is also a scene where half of everything is a black silhouette, and
 * every photographer, every studio and every overcast sky answers that the same
 * way: a second, softer, cooler light from somewhere else, throwing no shadows
 * of its own. It is off until asked for.
 */
export interface FillState extends SunState {
  enabled: boolean;
}

/**
 * How the marker page is inked, and how the etched one is ruled.
 *
 * Two of the five surface rungs have settings of their own. They are here
 * rather than inside the material because they are part of the picture: a
 * saved scene composed in a forty-five degree hatch at six pixels should come
 * back in a forty-five degree hatch at six pixels, and a value that lives only
 * in a uniform cannot be written down.
 */
export interface MarkerState {
  /** Degrees round the wheel. The reference sheet's marker is a yellow-green. */
  hue: number;
  /**
   * How much colour is in it, 0 to 1.
   *
   * Welded at 0.72 until now, alongside the lightness - and the lightness has a
   * reason to stay welded, since under about 0.3 the stain stops being a stain
   * and competes with the spotted blacks. The saturation had no such reason,
   * and its absence meant the marker rung was a rung with one axis: four pages
   * that differed only in where they sat on the wheel. The greys are the
   * markers most people actually own.
   */
  chroma: number;
  /**
   * How much light there has to be before the paper is left bare.
   *
   * The one number that decides how much of the drawing the marker covers -
   * low leaves a thin rim of colour along the shadow, high floods everything
   * but the highlights.
   */
  high: number;
}

/**
 * The pen, which every drawn page holds in the same hand.
 *
 * The three drawn rungs differ only in what is laid UNDER the line - a fill of
 * spotted blacks, a flat marker stain, a rank of ruled strokes - and the line
 * itself is one shader and one set of numbers across all three. So these are
 * the page's pen rather than the hatch's or the marker's, and changing them on
 * an etched page changes the brush page too. That is not a leak: it is one
 * hand, and a drawing made with two pens is two drawings.
 *
 * They were fixed constants, which meant the one mark that carries a drawing -
 * the outline - was the one thing about it nobody could set.
 */
export interface PenState {
  /**
   * Sheet pixels of the contour: the silhouette, and every interior edge the
   * form rolls over. Zero lifts it entirely, which on an etched page is the
   * tonal engraving that has no outline at all.
   */
  outline: number;
  /** How many value contours between edge-on and face-on. Zero is none. */
  formCount: number;
  /** How dark those are, against the outline's full weight. */
  formStrength: number;
  /**
   * And how heavy, in sheet pixels.
   *
   * The pen could say how MANY of these there were and how DARK, and never how
   * heavy - a weight for the outline and only a strength for the other two, as
   * though the other two had no weight of their own. Fine and dark is an
   * engraved hairline; heavy and faint is a stick dragged on its side. Below
   * about 0.35 it meets the shader's own clamp and stops changing.
   */
  formWidth: number;
  /**
   * How strongly the terminator is drawn - the line where the light leaves.
   *
   * The one mark that says which way the light comes from, and the one worth
   * being able to lift when the hatching is already saying it.
   */
  terminator: number;
  /**
   * How heavy that edge is, in sheet pixels.
   *
   * More than a thickness on the two rungs that spot their blacks in: the
   * fill's edge sits on the same crossing, and inside the fill the pen draws in
   * PAPER - so the terminator comes out as a paired ink line outside and a
   * white one within, and widening it turns that pair into a drawn core-shadow
   * band. `terminator` is still the off switch; this cannot be taken to none.
   */
  terminatorWidth: number;
}

/**
 * The flat tone under the line.
 *
 * Not a gradient: a stepped plateau keyed to the sun, darkest at the terminator
 * and gone in the highlight. That is what a stopped-out bite, a tone block and
 * a chalk halftone all are, and it is the missing third value between the
 * spotted black and the bare paper. On the etched page it is the only thing
 * that can put a value in the gaps between the strokes, which is why the whole
 * toned-paper tradition was unreachable without it.
 */
export interface WashState {
  /** 0 is bare paper. */
  amount: number;
  /** How many plateaus it is laid in. One is a two-value poster. */
  steps: number;
}

/**
 * One object's own material, whole.
 *
 * A snapshot rather than a patch: the moment you turn a knob with something in
 * your hand, the page's current settings are copied onto it and from then on it
 * is drawn with its own. That is the same shape `surface` already has - a rung,
 * not a nudge to the page's rung - and it is the one that can be read without
 * knowing what the page happened to be when you set it.
 *
 * All three regardless of which rung the thing is on, because the rung is a
 * thing you step through: a box moved from hatch to marker should find the
 * marker settings it had last time rather than the page's.
 */
export interface MaterialSettings {
  pen: PenState;
  marker: MarkerState;
  hatch: HatchState;
  wash: WashState;
}

/**
 * Where one thing in the hand stood when a gesture began.
 *
 * Kind-agnostic on purpose: a box turns on `rotation[1]` and sizes on three
 * sides, a mesh turns on `rotationY` and sizes on one factor, and a lamp does
 * neither - so the snapshot carries whichever of those the thing has and the
 * store puts back whichever it can use.
 */
export interface HeldRow {
  id: string;
  position: [number, number, number];
  /** Its bearing: a box's Y rotation, a mesh's rotationY, a lamp's aim. */
  turn: number;
  /** A box's three sides. */
  boxScale?: [number, number, number];
  /** A mesh's single factor. */
  modelScale?: number;
}

export interface HatchState {
  /** Which way the first layer runs, in degrees. */
  angle: number;
  /** Sheet pixels between neighbouring strokes. */
  spacing: number;
  /** Sheet pixels of stroke weight. */
  width: number;
  /** Sheet pixels from one stroke's start to the next along its own run.
   *  Zero is an unbroken rule. */
  length: number;
  /**
   * How far the second layer turns from the first, in degrees.
   *
   * The crossing is what separates an engraver's near-square lattice from a
   * pen's shallow directional weave, and the third layer takes the lozenge's
   * diagonal from the same number - so one angle places all three passes.
   * Optional on the way IN only: rules written before the crossing existed
   * come back without one, and every reader defaults it.
   */
  cross: number;
}

/**
 * One placed model, written down.
 *
 * Everything here is plain data: the parsed geometry is rebuilt from `fileUrl`
 * on the way back in.
 */
export interface SceneInstance {
  name: string;
  fileUrl: string;
  format: 'usdz' | 'gltf';
  position: [number, number, number];
  rotationY: number;
  scale: number;
  baseScale: number;
  size: [number, number, number];
  surface?: Surface;
  /** Its own material, if it was drawn with one rather than the page's. */
  material?: MaterialSettings;
  kind?: 'object' | 'scene';
  lockedScale?: boolean;
}

/**
 * How the scene was being looked at.
 *
 * A composition is a viewpoint as much as it is an arrangement — the whole
 * point of the tool is the view you set up to draw from — so where you were
 * standing, how high your eye was and which projection you were in are saved
 * with the geometry and restored with it.
 */
export interface SceneView {
  cameraHeight: number;
  fov: number;
  perspectiveMode: PerspectiveMode;
  backgroundGray: number;
  /**
   * The page the sheet is mounted on. Absent in scenes saved before the two
   * were separable, which read as `'paper'` - the page IS the sheet, which is
   * exactly what those scenes were composed against.
   */
  backdrop?: Backdrop;
  theme: ThemeMode;
  sun: SunState;
  fill?: FillState;
  sunEnvironment: boolean;
  guides: GuideLevel;
  /** Written by a version that had one guides switch instead of levels. */
  showGuides?: boolean;
  gridX?: boolean;
  gridZ?: boolean;
  /** The default surface for anything placed after the scene comes back. */
  surface?: Surface;
  /*
   * ...AND HOW THAT SURFACE IS RULED.
   *
   * These five were the gap between what the types said and what happened. The
   * comment on MarkerState has always claimed that "a saved scene composed in a
   * forty-five degree hatch at six pixels should come back in a forty-five
   * degree hatch at six pixels, and a value that lives only in a uniform cannot
   * be written down" - and then none of them was written down. They persisted
   * as SETTINGS, which survives a reload and has nothing to do with a scene: a
   * composition saved on one page reopened on whatever page you happened to be
   * on, with its surfaces intact and its rule someone else's.
   *
   * It mattered less when there were two of them. A page now carries a pen, a
   * wash and a floor as well, and a page IS how the thing is drawn - so saving
   * a scene and not saving that is saving half of it.
   *
   * All optional, and all read back through the defaults: a scene written by a
   * version with fewer knobs must not return with an undefined outline and rule
   * nothing.
   */
  marker?: MarkerState;
  hatch?: HatchState;
  pen?: PenState;
  wash?: WashState;
  ground?: { on: boolean; tone: number };
  /** Written by a version whose surface setting was models-only and had two rungs. */
  modelMaterial?: Surface;
  /** Whether the room was standing round the scene, and how big it was. */
  roomLevel?: RoomLevel;
  /** Written by the version that had one switch for the room. */
  showRoom?: boolean;
  room?: RoomSize;
  /** Written by every version before the selection's construction was a ladder. */
  showVanishing?: boolean;
  selectionGuides?: SelectionGuide;
  snapStep: number;
  /** Where the walker stands, and which way it faces. */
  camera: { x: number; z: number; yaw: number; pitch: number };
}

/** A composition kept in the browser, thumbnail and all. */
export interface SavedScene {
  id: string;
  /**
   * What it is called on its card, and what an export of it is filed under.
   *
   * It used to be the minute it was saved and was never drawn, back when every
   * save made a new entry and the thumbnail was the only thing telling four of
   * them apart. Saving writes into the open project now, so a project lasts -
   * and a thing that lasts is a thing you refer to by name.
   */
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Absent in scenes saved before lamps existed. */
  lamps?: LampData[];
  boxes: BoxData[];
  models: SceneInstance[];
  view: SceneView;
  /** Small JPEG of the view at the moment it was saved. */
  thumbnail?: string;
}

export interface SceneState {
  boxes: BoxData[];
  selectedId: string | null;
  fov: number;
  perspectiveMode: PerspectiveMode;
  /** Camera height above the ground plane, in metres. This is the horizon line. */
  cameraHeight: number;
  /** How much of the room's construction is drawn: horizon, curvilinear circles. */
  guides: GuideLevel;
  /**
   * The two families of the ground's ruling, each on its own switch.
   *
   * `gridX` is the lines running along X - the ones that cross your view - and
   * `gridZ` the ones running away from you. Ruling one family at a time is how
   * a floor is drawn: you lay the receding lines to their point, then cross
   * them. Both together is a grid; either alone is the step before it.
   */
  gridX: boolean;
  gridZ: boolean;
  /**
   * The construction drawn around each object: the box it blocks into, the
   * ground it stands on, and the plumb line through it.
   *
   * Separate from `guides`, which is the construction of the *room* - the
   * horizon, the floor and the sheet. This is the construction of the things
   * standing in it, and the two are wanted at different times.
   */
  construction: ConstructionLevel;
  fieldRange: FieldRange;
  backdrop: Backdrop;
  /**
   * Four walls and a ceiling, standing round the origin.
   *
   * The room is the perspective exercise. A box on open ground shows you its
   * own twelve edges; a room shows you the ones that reach the edge of the
   * frame, which is where a curved projection does its most visible work.
   */
  roomLevel: RoomLevel;
  /** How big it is. */
  room: RoomSize;
  /**
   * The selection's own vanishing points, and its edges carried out to them.
   *
   * Its own switch rather than a rung of `guides`, because it answers a
   * different question. The guides are the room's construction - the horizon,
   * the floor, the sheet - and are wanted or not wanted for a whole session.
   * This is the construction of the one thing you are holding, and it is wanted
   * while you work out where that thing's edges run and in the way the moment
   * you have.
   */
  /**
   * How much construction is drawn round the selection. Was a boolean called
   * `showVanishing`, which is still what a stored 1 means.
   */
  selectionGuides: SelectionGuide;
  /** Metres that edits snap to while dragging. 0 is free. */
  snapStep: number;
  models: SceneModel[];
  selectedModelId: string | null;
  /**
   * The surface anything placed from now on is drawn with, and what the
   * scene-wide control stamps onto everything already standing there.
   *
   * Each box and mesh carries its own; this is only where a new one starts.
   */
  surface: Surface;
  /** Use the directional sun to generate a full-frame sky gradient. */
  sunEnvironment: boolean;
  /**
   * The sun. It is the only light in the scene - no ambient, no environment -
   * so a face turned away from it is genuinely unlit, which is what makes a
   * box read as a box.
   */
  sun: SunState;
  /** A second, shadowless light, for when one is too few. */
  fill: FillState;
  /** The marker page's own colour and reach. */
  marker: MarkerState;
  /** How the etched page is ruled. */
  hatch: HatchState;
  /** The pen every drawn page is drawn with. */
  pen: PenState;
  /** The flat tone laid under it. */
  wash: WashState;
  /**
   * A floor under the drawing, and what tone it is.
   *
   * On, and part of the page: a value for the shadows to land in, and a horizon
   * the floor actually meets rather than one the grid implies. Every page the
   * deck deals stands on one - six compose their own tone, the rest take a
   * fixed step under their own sheet (see `floorFor` in store.ts).
   *
   * It was off by default, on the argument that a study of forms standing in
   * nothing is the honest starting point and the ruling says where the ground
   * is without anything painted there. The ruling still does; a page that also
   * has a floor turned out to be the better page.
   */
  ground: { on: boolean; tone: number };
  /**
   * WHICH INSTRUMENT IS IN YOUR HAND, if any.
   *
   * The two things in this tool that arm a mode rather than do something: the
   * block-out pencil, under which a drag on the ground draws a box, and the
   * pencil at arm's length, under which a drag lays a measure in degrees. They
   * are one seat of state rather than two flags because they are one hand -
   * you cannot be holding both, and every site that armed one had to remember
   * to put the other down. Now arming is the whole of it.
   *
   * In the store rather than inside the overlay because the two of them no
   * longer sit together: the pencil is taken off the model shelf, beside the
   * cube it is the by-eye version of, and the measure lives with the lens.
   */
  instrument: Instrument;
  /** Scenes to step back through. Newest last. */
  undoStack: HistoryStep[];
  /** Scenes stepped back out of, to go forward into again. Newest last. */
  redoStack: HistoryStep[];
  theme: ThemeMode;
  /** Neutral environment/background value, from black (0) to white (255). */
  backgroundGray: number;
  /** The saved scene last opened or written, so the library can mark it. */
  currentSceneId: string | null;
  sceneHistory: SavedScene[];
  /**
   * Everything picked up ALONGSIDE the primary, by long press.
   *
   * Ids of boxes, meshes and lamps mixed together, because that is what the
   * gesture knows: the picker answers with an id, and which of the three lists
   * it belongs to is three lookups away. It also means an id that has been
   * deleted, undone away or loaded over is simply not found by anything that
   * reads this - which is what every reader wants and none of them has to
   * write.
   *
   * The three `selected...` fields above still hold the ONE that a drag moves
   * and that the bar reads its numbers from. This is the rest of the hand.
   */
  companions: string[];
  /** Meshes the viewer has imported and kept, listed beside the built-in three. */
  ownMeshes: OwnMesh[];
  lamps: LampData[];
  selectedLampId: string | null;
  /** Hang a lamp near where the viewer is looking. */
  addLamp: (position: [number, number]) => void;
  updateLamp: (id: string, updates: Partial<LampData>) => void;
  removeLamp: (id: string) => void;
  selectLamp: (id: string | null) => void;
  /** Place the toolbar's canonical one-metre reference cube. */
  addCube: (position: [number, number, number]) => void;
  /** Start the block-out gesture's drawn box. */
  beginBlock: (at: [number, number]) => void;
  updateBox: (id: string, updates: Partial<BoxData>) => void;
  removeBox: (id: string) => void;
  /** Empty ground, undoably. The opening object is stood back up on it after. */
  resetScene: () => void;
  /**
   * Stand a model up without writing a history step or selecting it - the
   * opening object, which is where the history begins rather than a first move.
   */
  standObject: (model: Omit<SceneModel, 'id'>) => void;
  selectBox: (id: string | null) => void;
  /** Long press: take another thing into the hand, or put that one back down. */
  toggleCompanion: (id: string) => void;
  /** Everything in hand, out of the scene, in one step back. */
  removeSelection: () => void;
  /** The same height off the floor for everything in hand. */
  liftSelection: (metres: number) => void;
  /** One axis of every box in hand, to the same metres. */
  sizeSelection: (axis: 0 | 1 | 2, metres: number) => void;
  /** Every mesh in hand to the same real height, each scaled by its own size. */
  heightSelection: (metres: number) => void;
  /** Turn everything in hand by the same step, each about its own centre. */
  turnSelection: (step: number) => void;
  /**
   * Carry the rest of the hand along with the primary, by the same amounts.
   *
   * The gesture snapshots where everything stood when the finger landed and
   * hands that back on every frame with one move, one turn and one growth
   * factor - so the arrangement holds its shape however far the drag wanders,
   * which is the one thing a per-frame relative nudge cannot promise: dropped
   * frames and clamped values both make it drift.
   */
  carryCompanions: (
    from: HeldRow[],
    move: [number, number, number],
    turn: number,
    grow: number
  ) => void;
  setLens: (fov: number) => void;
  setPerspectiveMode: (mode: PerspectiveMode) => void;
  setCameraHeight: (height: number) => void;
  /** Step down through the room's construction: everything, less, none, round. */
  cycleGuides: () => void;
  /** One family of the ground's ruling, or the other. */
  /** Both of them, on one seat: none, away, both, across. */
  cycleFloorRuling: () => void;
  cycleConstruction: () => void;
  cycleFieldRange: () => void;
  /** Step the page behind the sheet: the sheet itself, black, white. */
  cycleBackdrop: () => void;
  /** Set the page's own tone, 0 to 255 through the paper ramp. */
  setBackdrop: (value: number) => void;
  /** The page a preset is showing, so the shuffle never deals the same one. */
  presetName: string | null;
  /** Deal a different whole page: surface, sheet, mount, light, lens, furniture. */
  shufflePreset: () => void;
  setMarker: (marker: Partial<MarkerState>) => void;
  setHatch: (hatch: Partial<HatchState>) => void;
  setPen: (pen: Partial<PenState>) => void;
  setWash: (wash: Partial<WashState>) => void;
  /** Tap the floor on and off. */
  toggleGround: () => void;
  /** Drag it from black through to white. */
  setGroundTone: (tone: number) => void;
  /** The same three, aimed at the selection: it takes a copy and keeps it. */
  setSelectionMaterial: (patch: {
    pen?: Partial<PenState>;
    marker?: Partial<MarkerState>;
    hatch?: Partial<HatchState>;
    wash?: Partial<WashState>;
  }) => void;
  /** Give the selection back to the page's own settings. */
  followPageMaterial: () => void;
  cycleRoom: () => void;
  /** Change the floor's two axes, or the ceiling. Clamped to what a room can be. */
  setRoom: (room: Partial<RoomSize>) => void;
  /** Step the construction round the selection: off, rays, diagonals, quarters. */
  cycleSelectionGuides: () => void;
  /** Read the viewer's own shelf back out of the browser. */
  loadOwnMeshes: () => Promise<void>;
  /** Put an imported mesh on it, or leave it there if it already is. */
  rememberMesh: (url: string, name: string) => Promise<void>;
  /** Take one off, and let go of the bytes if nothing else wants them. */
  forgetMesh: (url: string) => Promise<void>;
  /** Step through free, 5 cm, 25 cm, 1 m. */
  cycleSnap: () => void;
  addModel: (model: Omit<SceneModel, 'id'>, quiet?: boolean) => void;
  removeModel: (id: string) => void;
  selectModel: (id: string | null) => void;
  updateModel: (id: string, updates: Partial<Omit<SceneModel, 'id'>>) => void;
  /** Uniform scale on a placed model. Refused while its size is pinned. */
  scaleModel: (id: string, scale: number) => void;
  /** Pin a placed mesh's size, or let it go again. */
  toggleModelLock: (id: string) => void;
  /** Copy whatever is selected, placed clear of the original. */
  /**
   * Step the whole scene to the next surface: the default for what comes next,
   * and everything already standing there with it.
   */
  cycleSurface: () => void;
  /** Step only the selection, through the rungs its own kind can draw. */
  cycleSelectionSurface: () => void;
  toggleSunEnvironment: () => void;
  /** Move the sun, or change how hard it burns. */
  setSun: (sun: Partial<SunState>) => void;
  /** The same, for the fill. */
  setFill: (fill: Partial<FillState>) => void;
  /** Pick an instrument up, or put the one in your hand down with 'none'. */
  setInstrument: (instrument: Instrument) => void;
  /**
   * Draw the line under everything about to change.
   *
   * Called once as a gesture begins - a drag, a turn, a scrub - so the whole of
   * it comes back in one step rather than one step per frame.
   */
  beginChange: () => void;
  /** Step back one scene. */
  undo: () => void;
  /** Step forward again, until the next change closes the way. */
  redo: () => void;
  toggleTheme: () => void;
  setBackgroundGray: (value: number) => void;
  /**
   * Write the whole composition to the browser, thumbnail and viewpoint
   * included - over the open project, or as a new one when asked.
   */
  saveCurrentScene: (asNew?: boolean) => Promise<void>;
  /** Call a saved project something. */
  renameScene: (id: string, name: string) => Promise<void>;
  /** Restore a saved composition, re-fetching every mesh it names. */
  loadScene: (id: string) => Promise<string[]>;
  deleteScene: (id: string) => Promise<void>;
  /** Read the saved scenes back out of the browser on start-up. */
  loadSceneHistory: () => Promise<void>;
  /** Replace the live scene wholesale - used by the JSON importer. */
  applyScene: (scene: { boxes: BoxData[]; models: Omit<SceneModel, 'id'>[]; lamps?: LampData[]; view?: SceneView }) => void;
}
