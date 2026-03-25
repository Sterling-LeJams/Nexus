import { useCallback } from 'react';
import { usePanelStore } from './panelStore';
import type { PanelId, PanelRect } from './types';
import { snapRect, resolveCollisions } from './snap';

// --------------------------------
// --- Drag Hook ---
// --------------------------------

/**
 * Returns a pointerdown handler to attach directly to the drag-handle element.
 * Avoids ref/useEffect timing issues by using React synthetic events instead.
 */
export const useDraggable = (id: PanelId) => {
  const updatePanel = usePanelStore((s) => s.updatePanel);
  const bringToFront = usePanelStore((s) => s.bringToFront);

  return useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      bringToFront(id);

      const panel = usePanelStore.getState().panels[id];
      if (!panel) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const originX = panel.x;
      const originY = panel.y;
      const { width, height } = panel;

      const onMove = (mv: PointerEvent) => {
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;

        const proposed: PanelRect = {
          x: originX + dx,
          y: originY + dy,
          width,
          height,
        };

        const others = Object.values(usePanelStore.getState().panels)
          .filter((p) => p.id !== id && p.visible)
          .map(({ x, y, width: w, height: h }) => ({ x, y, width: w, height: h }));

        const snapped = snapRect(proposed, others, window.innerWidth, window.innerHeight);
        const resolved = resolveCollisions(snapped, others, window.innerWidth, window.innerHeight);

        updatePanel(id, { x: resolved.x, y: resolved.y });
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [id, updatePanel, bringToFront],
  );
};
