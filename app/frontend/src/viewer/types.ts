import * as OBC from "@thatopen/components";

// --------------------------------
// --- Orbit types ---
// --------------------------------

export type OrbitParams = {
  world: OBC.World;
  raycasters: OBC.Raycasters;
  container: HTMLElement;
  isDark: boolean;
};

export type OrbitResult = {
  cleanup: () => void;
  updateThemeColor: (dark: boolean) => void;
};

// --------------------------------
// --- Section Cut types ---
// --------------------------------

export interface SectionCutParams {
  world: OBC.World;
  components: OBC.Components;
  container: HTMLElement;
}

export interface SectionCutControls {
  activate: () => void;
  deactivate: () => void;
  cutAtElevation: (elevation: number) => void;
}

// --------------------------------
// --- Viewer types ---
// --------------------------------

export type ViewerCallbacks = {
  loadIfc: (source: string | File) => Promise<void>;
  downloadFragments: () => Promise<void>;
  cutAtElevation: (elevation: number) => void;
  components: OBC.Components;
};

export type Props = {
  onInit: (callbacks: ViewerCallbacks) => void;
  onModelLoaded: () => void;
};
