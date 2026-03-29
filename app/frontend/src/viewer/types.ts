import * as OBC from "@thatopen/components";
import type { SectionCutManager, SectionCutCube } from "./controls";

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

export type { SectionCutManager, SectionCutPlane, SectionCutCube } from "./controls";

// --------------------------------
// --- Viewer types ---
// --------------------------------

export type ViewerCallbacks = {
  loadIfc: (source: string | File) => Promise<void>;
  downloadFragments: () => Promise<void>;
  sectionCutManager: SectionCutManager;
  sectionCutCube: SectionCutCube;
  components: OBC.Components;
};

export type Props = {
  onInit: (callbacks: ViewerCallbacks) => void;
  onModelLoaded: () => void;
};
