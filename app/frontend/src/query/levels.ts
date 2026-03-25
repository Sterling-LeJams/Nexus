import type { Level } from "./types";
import type * as FRAGS from "@thatopen/fragments";

// --------------------------------
// --- Levels Query ---
// --------------------------------

const attrValue = (
  attr: FRAGS.ItemAttribute | FRAGS.ItemData[] | undefined,
): unknown => (attr && !Array.isArray(attr) ? attr.value : undefined);

export const queryLevels = async (
  model: FRAGS.FragmentsModel,
): Promise<Level[]> => {
  const cats = await model.getItemsOfCategories([/BUILDINGSTOREY/]);
  const storeyIds = Object.values(cats).flat();
  if (storeyIds.length === 0) return [];

  const storeysData = await model.getItemsData(storeyIds);
  const [, coordHeight] = await model.getCoordinates();

  return storeysData
    .map((s, i) => ({
      name:
        (attrValue(s.Name) as string) ??
        (attrValue(s.LongName) as string) ??
        `Level ${i + 1}`,
      elevation: ((attrValue(s.Elevation) as number) ?? 0) + coordHeight,
    }))
    .sort((a, b) => a.elevation - b.elevation);
};
