export interface BoxData {
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  name?: string;
}

export type ThemeMode = 'light' | 'dark';

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
  theme: ThemeMode;
  currentSceneName: string | null;
  sceneHistory: SavedScene[];
  addBox: (position: [number, number, number]) => void;
  appendBox: (data: Omit<BoxData, 'id'>) => void;
  updateBox: (id: string, updates: Partial<BoxData>) => void;
  removeBox: (id: string) => void;
  setBoxes: (boxes: BoxData[]) => void;
  selectBox: (id: string | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setLens: (fov: number, distortion: number) => void;
  toggleTheme: () => void;
  toggleViewMode: () => void; // New action
  saveCurrentScene: (name: string, prompt?: string) => void;
  loadScene: (id: string) => void;
  deleteScene: (id: string) => void;
  setCurrentSceneName: (name: string | null) => void;
  loadHistoryFromStorage: () => void;
}