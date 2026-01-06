export interface BoxData {
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  name?: string;
}

export type ThemeMode = 'light' | 'dark';

export interface SceneState {
  boxes: BoxData[];
  selectedId: string | null;
  isDragging: boolean;
  isViewMode: boolean; // New state for disabling interactions
  fov: number;
  distortion: number; // 0 to 1 range for lens curvature
  theme: ThemeMode;
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
}