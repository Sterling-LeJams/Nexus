// --------------------------------
// --- Panel System Types ---
// --------------------------------

export type PanelId = string;

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelState extends PanelRect {
  id: PanelId;
  title: string;
  zIndex: number;
  visible: boolean;
  minWidth: number;
  minHeight: number;
}

export interface PanelStoreState {
  panels: Record<PanelId, PanelState>;
  topZ: number;
  registerPanel: (config: Omit<PanelState, 'zIndex'>) => void;
  updatePanel: (id: PanelId, updates: Partial<Omit<PanelState, 'id'>>) => void;
  bringToFront: (id: PanelId) => void;
  removePanel: (id: PanelId) => void;
  setVisible: (id: PanelId, visible: boolean) => void;
}
