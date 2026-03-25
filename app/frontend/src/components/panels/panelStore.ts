import { create } from 'zustand';
import type { PanelId, PanelState, PanelStoreState } from './types';

// --------------------------------
// --- Panel Store ---
// --------------------------------

const BASE_Z = 100;

export const usePanelStore = create<PanelStoreState>((set) => ({
  panels: {},
  topZ: BASE_Z,

  registerPanel: (config) =>
    set((state) => {
      if (state.panels[config.id]) return state;
      const zIndex = state.topZ + 1;
      return {
        panels: { ...state.panels, [config.id]: { ...config, zIndex } },
        topZ: zIndex,
      };
    }),

  updatePanel: (id: PanelId, updates: Partial<Omit<PanelState, 'id'>>) =>
    set((state) => {
      const panel = state.panels[id];
      if (!panel) return state;
      return {
        panels: { ...state.panels, [id]: { ...panel, ...updates } },
      };
    }),

  bringToFront: (id: PanelId) =>
    set((state) => {
      const panel = state.panels[id];
      if (!panel || panel.zIndex === state.topZ) return state;
      const zIndex = state.topZ + 1;
      return {
        panels: { ...state.panels, [id]: { ...panel, zIndex } },
        topZ: zIndex,
      };
    }),

  removePanel: (id: PanelId) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.panels;
      return { panels: rest };
    }),

  setVisible: (id: PanelId, visible: boolean) =>
    set((state) => {
      const panel = state.panels[id];
      if (!panel) return state;
      return {
        panels: { ...state.panels, [id]: { ...panel, visible } },
      };
    }),
}));
