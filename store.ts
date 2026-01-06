import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { BoxData, SceneState } from './types';

// Helper for random range
const rng = (min: number, max: number) => Math.random() * (max - min) + min;

const generateInitialScene = (): BoxData[] => {
  // A small stack of boxes to show scale immediately
  return [
    {
      id: uuidv4(),
      position: [0, 0.25, 0],
      scale: [10, 0.2, 10], // A large floor slab
      rotation: [0, 0, 0],
    },
    {
      id: uuidv4(),
      position: [-2, 2, -2],
      scale: [0.5, 4, 0.5], // A tall pillar
      rotation: [0, 0.2, 0],
    },
    {
      id: uuidv4(),
      position: [2, 1, 2],
      scale: [3, 2, 1], // A blocky mass
      rotation: [0, -0.4, 0],
    }
  ];
};

export const useStore = create<SceneState>((set) => ({
  boxes: generateInitialScene(),
  selectedId: null,
  isDragging: false,
  isViewMode: false,
  fov: 85, // Wider default FOV for perspective drama
  distortion: 0.35, // Stronger initial fisheye
  theme: 'light',

  addBox: (position) =>
    set((state) => {
      // Logic to encourage "slabs" and "pillars" even for manual additions
      const type = Math.random();
      let scale: [number, number, number];
      
      if (type < 0.33) {
        // Slab
        scale = [rng(2, 5), rng(0.1, 0.5), rng(2, 5)];
      } else if (type < 0.66) {
        // Pillar
        scale = [rng(0.3, 0.8), rng(3, 6), rng(0.3, 0.8)];
      } else {
        // Block
        scale = [rng(1, 3), rng(1, 3), rng(1, 3)];
      }

      return {
        boxes: [
          ...state.boxes,
          {
            id: uuidv4(),
            position: [position[0], scale[1]/2, position[2]], // Rest on ground
            scale: scale,
            rotation: [rng(-0.1, 0.1), rng(0, Math.PI), rng(-0.1, 0.1)],
          },
        ],
      };
    }),

  appendBox: (data) => 
    set((state) => ({
      boxes: [
        ...state.boxes,
        {
          id: uuidv4(),
          ...data
        }
      ]
    })),

  updateBox: (id, updates) =>
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBox: (id) =>
    set((state) => ({
      boxes: state.boxes.filter((b) => b.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setBoxes: (boxes) => set({ boxes }),

  selectBox: (id) => set({ selectedId: id }),
  
  setIsDragging: (isDragging) => set({ isDragging }),
  
  setLens: (fov, distortion) => set({ 
    fov: Math.max(10, Math.min(140, fov)),
    distortion: Math.max(0, Math.min(1.5, distortion))
  }),

  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  toggleViewMode: () => set((state) => ({ isViewMode: !state.isViewMode, selectedId: null })),
}));