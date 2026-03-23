import { create } from 'zustand';
import type { Level } from '../query/types';

// --------------------------------
// --- Active Tool ---
// --------------------------------
type ActiveTool = 'sectionCut' | null;

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
  levelsOpen: boolean;
  setLevelsOpen: (open: boolean) => void;
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
  levelsOpen: false,
  setLevelsOpen: (open) => set({ levelsOpen: open }),
  selectedLevel: null,
  setSelectedLevel: (name) => set({ selectedLevel: name }),
}));
