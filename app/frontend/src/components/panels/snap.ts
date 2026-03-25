import type { PanelRect } from './types';

// --------------------------------
// --- Snap & Collision Logic ---
// --------------------------------

const SNAP_THRESHOLD = 16;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Snaps a proposed rect to window edges and other panel edges.
 * Used during drag to give magnetic snap-to-adjacent behavior.
 */
export const snapRect = (
  rect: PanelRect,
  others: PanelRect[],
  windowW: number,
  windowH: number,
): PanelRect => {
  let { x, y, width, height } = rect;

  // --- Window edge snap ---
  if (x < SNAP_THRESHOLD) x = 0;
  if (y < SNAP_THRESHOLD) y = 0;
  if (x + width > windowW - SNAP_THRESHOLD) x = windowW - width;
  if (y + height > windowH - SNAP_THRESHOLD) y = windowH - height;

  // --- Panel edge snap ---
  for (const other of others) {
    const oRight = other.x + other.width;
    const oBottom = other.y + other.height;

    // My left ↔ other's right
    if (Math.abs(x - oRight) < SNAP_THRESHOLD) x = oRight;
    // My right ↔ other's left
    if (Math.abs(x + width - other.x) < SNAP_THRESHOLD) x = other.x - width;
    // My top ↔ other's bottom
    if (Math.abs(y - oBottom) < SNAP_THRESHOLD) y = oBottom;
    // My bottom ↔ other's top
    if (Math.abs(y + height - other.y) < SNAP_THRESHOLD) y = other.y - height;
  }

  // Enforce window bounds after all snaps
  x = clamp(x, 0, windowW - width);
  y = clamp(y, 0, windowH - height);

  return { x, y, width, height };
};

/**
 * Axis-aligned bounding box overlap test.
 */
const overlaps = (a: PanelRect, b: PanelRect): boolean =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

/**
 * Pushes rect out of any panels it overlaps using minimum displacement.
 * Applied after snapRect to handle cases where snap alone doesn't resolve overlap.
 */
export const resolveCollisions = (
  rect: PanelRect,
  others: PanelRect[],
  windowW: number,
  windowH: number,
): PanelRect => {
  let { x, y, width, height } = rect;

  for (const other of others) {
    const candidate = { x, y, width, height };
    if (!overlaps(candidate, other)) continue;

    // Penetration depth in each axis direction
    const pushRight = other.x + other.width - x;
    const pushLeft  = x + width - other.x;
    const pushDown  = other.y + other.height - y;
    const pushUp    = y + height - other.y;

    const min = Math.min(pushRight, pushLeft, pushDown, pushUp);
    if (min === pushRight) x += pushRight;
    else if (min === pushLeft) x -= pushLeft;
    else if (min === pushDown) y += pushDown;
    else y -= pushUp;
  }

  x = clamp(x, 0, windowW - width);
  y = clamp(y, 0, windowH - height);

  return { x, y, width, height };
};

/**
 * Clamps a rect strictly within window bounds (used during resize).
 */
export const clampToWindow = (
  rect: PanelRect,
  windowW: number,
  windowH: number,
): PanelRect => {
  const x = clamp(rect.x, 0, windowW - rect.width);
  const y = clamp(rect.y, 0, windowH - rect.height);
  return { x, y, width: rect.width, height: rect.height };
};
