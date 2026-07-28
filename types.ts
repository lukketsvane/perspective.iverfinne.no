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

export interface SavedScene {
  id: string;
  name: string;
  boxes: BoxData[];
  createdAt: number;
  prompt?: string;
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
  spawnKind: SpawnKind;
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
  setSpawnKind: (kind: SpawnKind) => void;
  toggleTheme: () => void;
  toggleViewMode: () => void; // New action
  saveCurrentScene: (name: string, prompt?: string) => void;
  loadScene: (id: string) => void;
  deleteScene: (id: string) => void;
  setCurrentSceneName: (name: string | null) => void;
  loadHistoryFromStorage: () => void;
}
