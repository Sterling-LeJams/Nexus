import { create } from 'zustand';

type ActiveTool = 'sectionCut' | null;

interface ViewerState {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  activeTool: null,
  setActiveTool: (tool) => set({ activeTool: tool }),
}));
