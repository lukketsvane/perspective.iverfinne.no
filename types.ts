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
 * How the scene is projected.
 * - 'linear': straight-line rectilinear perspective (1/2/3-point).
 * - 'equidistant': Kim Jung Gi style 5-point curvilinear projection. The default.
 * - 'stereographic': fisheye view with stronger edge expansion.
 * - 'cylindrical': panorama with straight verticals.
 * - 'hyperbolic': Poincaré-like disc projection.
 * - '5-point': the full hemisphere, ceiling and floor points included.
 * - '720-noneuclidean': the whole sphere twice over.
 */
export type PerspectiveMode =
  | 'linear'
  | 'equidistant'
  | 'stereographic'
  | 'cylindrical'
  | 'hyperbolic'
  | '5-point'
  | '720-noneuclidean';

/** How placed models are surfaced: as authored, in white, or as glass with edges. */
export type ModelMaterial = 'original' | 'matte' | 'transparent-outline';

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
 * Where the sun is and how hard it burns.
 *
 * Azimuth is the compass bearing it shines *from*, in degrees clockwise from
 * -Z; elevation is its height above the horizon. Together they place the one
 * light in the scene, which is what decides where every cast shadow falls.
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
  sunEnvironment: boolean;
  showGuides: boolean;
  showCone: boolean;
  modelMaterial: ModelMaterial;
  /** Where the walker stands, and which way it faces. */
  camera: { x: number; z: number; yaw: number; pitch: number };
}

/** A composition kept in the browser, thumbnail and all. */
export interface SavedScene {
  id: string;
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
  isDragging: boolean;
  fov: number;
  perspectiveMode: PerspectiveMode;
  /** Camera height above the ground plane, in metres. This is the horizon line. */
  cameraHeight: number;
  /** Horizon / eye-level line and ground grid. */
  showGuides: boolean;
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
  /** Freeze the walk camera so a framed view stops moving. */
  viewLocked: boolean;
  /** Scenes to step back through. Newest last. */
  undoStack: { boxes: BoxData[]; models: SceneModel[] }[];
  theme: ThemeMode;
  /** Neutral environment/background value, from black (0) to white (255). */
  backgroundGray: number;
  /** The saved scene currently open, so saving again overwrites it. */
  currentSceneId: string | null;
  currentSceneName: string | null;
  sceneHistory: SavedScene[];
  /** Place the toolbar's canonical one-metre reference cube. */
  addCube: (position: [number, number, number]) => void;
  updateBox: (id: string, updates: Partial<BoxData>) => void;
  removeBox: (id: string) => void;
  /** Back to a single reference cube on empty ground. */
  resetScene: () => void;
  selectBox: (id: string | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setLens: (fov: number) => void;
  setPerspectiveMode: (mode: PerspectiveMode) => void;
  setCameraHeight: (height: number) => void;
  toggleGuides: () => void;
  toggleCone: () => void;
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
  toggleViewLock: () => void;
  /** Step back one scene. Destructive actions snapshot themselves. */
  undo: () => void;
  toggleTheme: () => void;
  setBackgroundGray: (value: number) => void;
  /** Write the whole composition to the browser, thumbnail and viewpoint included. */
  saveCurrentScene: (name: string) => Promise<void>;
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
