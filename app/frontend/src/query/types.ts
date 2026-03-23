import type { IfcAPI } from "web-ifc";

// --------------------------------
// --- Level Query types ---
// --------------------------------

export type Level = {
  name: string;
  elevation: number;
};

export type LevelsQuery = (webIfc: IfcAPI, modelId?: number) => Level[];
