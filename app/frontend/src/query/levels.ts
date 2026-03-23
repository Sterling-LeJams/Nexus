import { IFCBUILDINGSTOREY } from "web-ifc";
import type { IfcAPI } from "web-ifc";
import type { Level } from "./types";

// --------------------------------
// --- Levels Query ---
// --------------------------------

export const queryLevels = (webIfc: IfcAPI, modelId = 0): Level[] => {
  const ids = webIfc.GetLineIDsWithType(modelId, IFCBUILDINGSTOREY);
  const levels: Level[] = [];
  for (let i = 0; i < ids.size(); i++) {
    const line = webIfc.GetLine(modelId, ids.get(i));
    const name = line.Name?.value ?? line.LongName?.value ?? `Level ${i + 1}`;
    const elevation: number = line.Elevation?.value ?? 0;
    levels.push({ name, elevation });
  }
  return levels.sort((a, b) => a.elevation - b.elevation);
};
