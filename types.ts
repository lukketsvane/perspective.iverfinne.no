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
}

export type ThemeMode = 'light' | 'dark';

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
   * How much light there has to be before the paper is left bare.
   *
   * The one number that decides how much of the drawing the marker covers -
   * low leaves a thin rim of colour along the shadow, high floods everything
   * but the highlights.
   */
  high: number;
}

export interface HatchState {
  /** Which way the first layer runs, in degrees. */
  angle: number;
  /** How far the crossing layers are turned off it, in degrees. */
  cross: number;
  /** Sheet pixels between neighbouring strokes. */
  spacing: number;
  /** Sheet pixels of stroke weight. */
  width: number;
  /** Sheet pixels from one stroke's start to the next along its own run.
   *  Zero is an unbroken rule. */
  length: number;
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
  /** Written by a version whose surface setting was models-only and had two rungs. */
  modelMaterial?: Surface;
  /** Whether the room was standing round the scene, and how big it was. */
  roomLevel?: RoomLevel;
  /** Written by the version that had one switch for the room. */
  showRoom?: boolean;
  room?: RoomSize;
  showVanishing?: boolean;
  snapStep: number;
  /** Where the walker stands, and which way it faces. */
  camera: { x: number; z: number; yaw: number; pitch: number };
}

/** A composition kept in the browser, thumbnail and all. */
export interface SavedScene {
  id: string;
  /** Never drawn - it names the exported file and the accessible control. */
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
  showVanishing: boolean;
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
  /** Freeze the walk camera so a framed view stops moving. */
  viewLocked: boolean;
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
  setLens: (fov: number) => void;
  setPerspectiveMode: (mode: PerspectiveMode) => void;
  setCameraHeight: (height: number) => void;
  /** Step down through the room's construction: everything, less, none, round. */
  cycleGuides: () => void;
  /** One family of the ground's ruling, or the other. */
  toggleGridX: () => void;
  toggleGridZ: () => void;
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
  cycleRoom: () => void;
  /** Change the floor's two axes, or the ceiling. Clamped to what a room can be. */
  setRoom: (room: Partial<RoomSize>) => void;
  toggleVanishing: () => void;
  /** Read the viewer's own shelf back out of the browser. */
  loadOwnMeshes: () => Promise<void>;
  /** Put an imported mesh on it, or leave it there if it already is. */
  rememberMesh: (url: string, name: string) => Promise<void>;
  /** Take one off, and let go of the bytes if nothing else wants them. */
  forgetMesh: (url: string) => Promise<void>;
  /** Step through free, 5 cm, 25 cm, 1 m. */
  cycleSnap: () => void;
  addModel: (model: Omit<SceneModel, 'id'>) => void;
  removeModel: (id: string) => void;
  selectModel: (id: string | null) => void;
  updateModel: (id: string, updates: Partial<Omit<SceneModel, 'id'>>) => void;
  /** Uniform scale on a placed model. Refused while its size is pinned. */
  scaleModel: (id: string, scale: number) => void;
  /** Pin a placed mesh's size, or let it go again. */
  toggleModelLock: (id: string) => void;
  /** Copy whatever is selected, placed clear of the original. */
  duplicateSelection: () => void;
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
  toggleViewLock: () => void;
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
  /** Write the whole composition to the browser, thumbnail and viewpoint included. */
  saveCurrentScene: () => Promise<void>;
  /** Restore a saved composition, re-fetching every mesh it names. */
  loadScene: (id: string) => Promise<string[]>;
  deleteScene: (id: string) => Promise<void>;
  /** Read the saved scenes back out of the browser on start-up. */
  loadSceneHistory: () => Promise<void>;
  /** Replace the live scene wholesale - used by the JSON importer. */
  applyScene: (scene: { boxes: BoxData[]; models: Omit<SceneModel, 'id'>[]; lamps?: LampData[]; view?: SceneView }) => void;
}
