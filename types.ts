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
 * - 'linear': straight-line rectilinear perspective (1/2/3-point). The default.
 * - 'curvilinear': Kim Jung Gi style 5-point curvilinear projection (opt-in).
 */
export type PerspectiveMode = 'linear' | 'curvilinear';

/**
 * The primitive spawned when adding geometry. 'cube' (1x1x1 m) is the default;
 * every other primitive has to be picked by hand.
 */
export type SpawnKind = 'cube' | 'slab' | 'pillar' | 'beam' | 'block';

/**
 * How you are looking at the scene.
 * - 'orbit': the drawing-board view, camera on a leash around a target.
 * - 'walk': first person at your real eye height, walking the scene at 1:1.
 */
export type ViewMode = 'orbit' | 'walk';

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
  /** Bounding box in metres as authored, before `scale`. */
  size: [number, number, number];
  fileUrl: string;
  format: 'usdz' | 'gltf';
  previewSupported: boolean;
}

export interface SavedScene {
  id: string;
  name: string;
  boxes: BoxData[];
  createdAt: number;
  prompt?: string;
}

/** A camera placement a study can ask for. */
export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  /** Bumped on every request, so the same pose can be re-applied. */
  nonce: number;
}

export interface SceneState {
  boxes: BoxData[];
  selectedId: string | null;
  isDragging: boolean;
  isViewMode: boolean; // New state for disabling interactions
  fov: number;
  distortion: number; // 0 to 1 range for lens curvature
  perspectiveMode: PerspectiveMode;
  /** Camera height above the ground plane, in metres. This is the horizon line. */
  cameraHeight: number;
  /** When true the camera holds a level, horizontal gaze at cameraHeight (2-point perspective). */
  lockEyeLevel: boolean;
  /** 1.75 m scale figure, used to read box sizes against a human. */
  showFigure: boolean;
  /** Horizon / eye-level line and ground grid. */
  showGuides: boolean;
  /** The 60 degree cone of vision, drawn over the view. */
  showCone: boolean;
  /** Metres that edits snap to while dragging. 0 is free. */
  snapStep: number;
  spawnKind: SpawnKind;
  /** Orbit (drawing board) or walk (first person, real scale). */
  viewMode: ViewMode;
  /** Live camera behind the scene. Off until asked for, in either view mode. */
  cameraFeed: boolean;
  models: SceneModel[];
  selectedModelId: string | null;
  /** Replace model materials with a plain white matte, for reading form. */
  matteModels: boolean;
  /** Set when a study asks the camera to move; the scene consumes it. */
  cameraPose: CameraPose | null;
  activeStudyId: string | null;
  theme: ThemeMode;
  currentSceneName: string | null;
  sceneHistory: SavedScene[];
  addBox: (position: [number, number, number]) => void;
  appendBox: (data: Omit<BoxData, 'id'>) => void;
  updateBox: (id: string, updates: Partial<BoxData>) => void;
  removeBox: (id: string) => void;
  setBoxes: (boxes: BoxData[]) => void;
  resetScene: () => void;
  selectBox: (id: string | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setLens: (fov: number, distortion?: number) => void;
  setPerspectiveMode: (mode: PerspectiveMode) => void;
  setCameraHeight: (height: number) => void;
  toggleEyeLevelLock: () => void;
  toggleFigure: () => void;
  toggleGuides: () => void;
  toggleCone: () => void;
  setSnapStep: (step: number) => void;
  /** Turn the selection (box or model) about its own vertical axis. */
  rotateSelection: (radians: number) => void;
  setSpawnKind: (kind: SpawnKind) => void;
  setViewMode: (mode: ViewMode) => void;
  /** Load a drill: geometry, eye level, lens and where to stand. */
  loadStudy: (id: string) => void;
  setCameraFeed: (on: boolean) => void;
  addModel: (model: Omit<SceneModel, 'id'>) => void;
  removeModel: (id: string) => void;
  selectModel: (id: string | null) => void;
  updateModel: (id: string, updates: Partial<Omit<SceneModel, 'id'>>) => void;
  /** Uniform scale on a placed model. */
  scaleModel: (id: string, scale: number) => void;
  toggleMatte: () => void;
  toggleTheme: () => void;
  toggleViewMode: () => void; // New action
  saveCurrentScene: (name: string, prompt?: string) => void;
  loadScene: (id: string) => void;
  deleteScene: (id: string) => void;
  setCurrentSceneName: (name: string | null) => void;
  loadHistoryFromStorage: () => void;
}
