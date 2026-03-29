import { create } from 'zustand';
import type { Level } from '../query/types';

// --------------------------------
// --- Active Tool ---
// --------------------------------
type ActiveTool = 'sectionCut' | 'sectionCutCube' | null;

// --------------------------------
// --- Camera Mode ---
// --------------------------------
type CameraMode = 'ortho' | 'perspective';

interface ViewerState {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  levels: Level[];
  setLevels: (levels: Level[]) => void;
  selectedLevel: string | null;
  setSelectedLevel: (name: string | null) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  activeTool: null,
  setActiveTool: (tool) => set({ activeTool: tool }),
  cameraMode: 'perspective',
  setCameraMode: (mode) => set({ cameraMode: mode }),
  levels: [],
  setLevels: (levels) => set({ levels }),
  selectedLevel: null,
  setSelectedLevel: (name) => set({ selectedLevel: name }),
}));
