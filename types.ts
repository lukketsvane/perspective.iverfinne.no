import type { Object3D } from 'three';

export interface BoxData {
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  name?: string;
}

export type ThemeMode = 'light' | 'dark';

/**
 * How the scene is projected. Four systems, all of them ones you can draw in.
 *
 * - 'linear': straight-line rectilinear perspective - one, two and three point.
 * - 'cylindrical': four-point. Verticals stay straight and vertical; horizontals
 *   bow. The panoramic system, and the one to rule a long wall with.
 * - 'equidistant': five-point, and the default. Angle from the centre of the
 *   frame is distance from the centre, evenly, in every direction - which is
 *   what makes a ruled sphere of it and what Kim Jung Gi draws on.
 * - '5-point': the same projection taken to the full hemisphere, so the zenith
 *   and nadir points are both in frame with the four around them.
 */
export type PerspectiveMode = 'linear' | 'cylindrical' | 'equidistant' | '5-point';

/** How placed models are surfaced: as the file authored them, or in white. */
export type ModelMaterial = 'original' | 'matte';

/**
 * How much construction is drawn over the world.
 *
 * 0 nothing, 1 the eye-level line, 2 the ground grid with it, 3 the curvilinear
 * great circles as well - the sheet a curved perspective is ruled on before
 * anything is drawn. It steps down from everything rather than toggling to
 * nothing, because the useful state is usually "slightly less than this".
 */
export type GuideLevel = 0 | 1 | 2 | 3;

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
  /** Written by a version that had one guides switch instead of four levels. */
  showGuides?: boolean;
  showCone: boolean;
  modelMaterial: ModelMaterial;
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
  /** How much construction is drawn: horizon, grid, curvilinear circles. */
  guides: GuideLevel;
  /** The 60 degree cone of vision, drawn over the view. */
  showCone: boolean;
  /** Metres that edits snap to while dragging. 0 is free. */
  snapStep: number;
  models: SceneModel[];
  selectedModelId: string | null;
  /** Replace model materials for reading form. */
  modelMaterial: ModelMaterial;
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
  /**
   * True while the scene should be standing in the real room.
   *
   * Set by the button, cleared by the session ending - including when the
   * device turns out not to do AR at all, so the control never sits lit over a
   * mode that is not running.
   */
  arRequested: boolean;
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
  /** Place the toolbar's canonical one-metre reference cube. */
  addCube: (position: [number, number, number]) => void;
  updateBox: (id: string, updates: Partial<BoxData>) => void;
  removeBox: (id: string) => void;
  /** Back to a single reference cube on empty ground. */
  resetScene: () => void;
  selectBox: (id: string | null) => void;
  setLens: (fov: number) => void;
  setPerspectiveMode: (mode: PerspectiveMode) => void;
  setCameraHeight: (height: number) => void;
  /** Step down through the construction: everything, less, less, none, round. */
  cycleGuides: () => void;
  toggleCone: () => void;
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
  cycleMaterial: () => void;
  toggleSunEnvironment: () => void;
  /** Move the sun, or change how hard it burns. */
  setSun: (sun: Partial<SunState>) => void;
  /** The same, for the fill. */
  setFill: (fill: Partial<FillState>) => void;
  toggleViewLock: () => void;
  setAr: (on: boolean) => void;
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
