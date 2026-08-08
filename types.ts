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
 * Not a look: four different questions you can ask of the same object, and the
 * one worth asking changes several times in the course of a study.
 *
 * - 'original': opaque, as the thing is. A box in plain white, a mesh in the
 *   materials its file was authored with. What is behind it is behind it.
 * - 'matte': opaque, plain white, no texture. Photographed skin and fabric is a
 *   lot of information to draw past; stripped out, a figure reads as form and
 *   value only, which is what it is doing in a scene full of white boxes.
 * - 'glass': translucent, and writing no depth - so the far edges come through
 *   the near faces. This is drawing through, which is how a box is checked: if
 *   the hidden corner is in the wrong place the whole thing is, and on an opaque
 *   box there is nothing to check it against.
 * - 'wire': the twelve edges and nothing else. The construction with the object
 *   taken away.
 *
 * Every box and every placed mesh carries its own, so a scene can have a solid
 * car standing inside a wire box standing on a floor of glass ones - which is
 * exactly the arrangement a study wants and what a single scene-wide setting
 * could never say.
 */
export type Surface = 'original' | 'matte' | 'glass' | 'wire';

/** The whole ladder, in order. What the scene-wide control steps through. */
export const SURFACES: Surface[] = ['original', 'matte', 'glass', 'wire'];

/** What a box steps through: it has no authored material to strip. */
export const BOX_SURFACES: Surface[] = ['original', 'glass', 'wire'];

/**
 * What a mesh steps through: it has no cage to fall back on, so taking its
 * surface away entirely would leave nothing on screen to take hold of again.
 */
export const MESH_SURFACES: Surface[] = ['original', 'matte', 'glass'];

/**
 * The nearest rung a given kind of thing can actually draw.
 *
 * The scene-wide control names one of the four for everything at once, and each
 * kind answers with the closest thing it has: a box asked for matte is already
 * plain white, and a mesh asked for wire gives you the glass it can do instead
 * of disappearing.
 */
export const nearestSurface = (surface: Surface, rungs: Surface[]): Surface =>
  rungs.includes(surface) ? surface : surface === 'matte' ? 'original' : 'glass';

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
}

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
  /** Cast real shadows from the sun. */
  shadows: boolean;
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
  theme: ThemeMode;
  sun: SunState;
  fill?: FillState;
  sunEnvironment: boolean;
  guides: GuideLevel;
  /** Written by a version that had one guides switch instead of levels. */
  showGuides?: boolean;
  gridX?: boolean;
  gridZ?: boolean;
  showCone: boolean;
  /** The default surface for anything placed after the scene comes back. */
  surface?: Surface;
  /** Written by a version whose surface setting was models-only and had two rungs. */
  modelMaterial?: Surface;
  /** Whether the room was standing round the scene, and how big it was. */
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
  /** The 60 degree cone of vision, drawn over the view. */
  showCone: boolean;
  /**
   * The construction drawn around each object: the box it blocks into, the
   * ground it stands on, and the plumb line through it.
   *
   * Separate from `guides`, which is the construction of the *room* - the
   * horizon, the floor and the sheet. This is the construction of the things
   * standing in it, and the two are wanted at different times.
   */
  showConstruction: boolean;
  /**
   * Four walls and a ceiling, standing round the origin.
   *
   * The room is the perspective exercise. A box on open ground shows you its
   * own twelve edges; a room shows you the ones that reach the edge of the
   * frame, which is where a curved projection does its most visible work.
   */
  showRoom: boolean;
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
  /** Freeze the walk camera so a framed view stops moving. */
  viewLocked: boolean;
  /** Scenes to step back through. Newest last. */
  undoStack: { boxes: BoxData[]; models: SceneModel[] }[];
  /** Scenes stepped back out of, to go forward into again. Newest last. */
  redoStack: { boxes: BoxData[]; models: SceneModel[] }[];
  theme: ThemeMode;
  /** Neutral environment/background value, from black (0) to white (255). */
  backgroundGray: number;
  /** The saved scene last opened or written, so the library can mark it. */
  currentSceneId: string | null;
  sceneHistory: SavedScene[];
  /** Meshes the viewer has imported and kept, listed beside the built-in three. */
  ownMeshes: OwnMesh[];
  /** Place the toolbar's canonical one-metre reference cube. */
  addCube: (position: [number, number, number]) => void;
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
  toggleCone: () => void;
  toggleConstruction: () => void;
  toggleRoom: () => void;
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
  /** Turn the selection (box or model) about its own vertical axis. */
  rotateSelection: (radians: number) => void;
  addModel: (model: Omit<SceneModel, 'id'>) => void;
  removeModel: (id: string) => void;
  selectModel: (id: string | null) => void;
  updateModel: (id: string, updates: Partial<Omit<SceneModel, 'id'>>) => void;
  /** Uniform scale on a placed model. */
  scaleModel: (id: string, scale: number) => void;
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
  applyScene: (scene: { boxes: BoxData[]; models: Omit<SceneModel, 'id'>[]; view?: SceneView }) => void;
  /** Remove every placed model whose fileUrl already appears earlier in the list. */
  deduplicateModels: () => void;
}
