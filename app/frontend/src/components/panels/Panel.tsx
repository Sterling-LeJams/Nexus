import React, { useCallback, useEffect, useRef } from 'react';
import { usePanelStore } from './panelStore';
import { useDraggable } from './useDraggable';
import { clampToWindow } from './snap';
import { PanelId, PanelRect, ResizeDirection } from './types';

// --------------------------------
// --- Resize Handle ---
// --------------------------------

const HANDLE_PX = 6;

const HANDLE_POSITIONS: Record<ResizeDirection, React.CSSProperties> = {
  n:  { top: 0,           left: HANDLE_PX,    right: HANDLE_PX,   height: HANDLE_PX, cursor: 'n-resize'  },
  s:  { bottom: 0,        left: HANDLE_PX,    right: HANDLE_PX,   height: HANDLE_PX, cursor: 's-resize'  },
  e:  { right: 0,         top: HANDLE_PX,     bottom: HANDLE_PX,  width:  HANDLE_PX, cursor: 'e-resize'  },
  w:  { left: 0,          top: HANDLE_PX,     bottom: HANDLE_PX,  width:  HANDLE_PX, cursor: 'w-resize'  },
  ne: { top: 0,    right: 0,  width: HANDLE_PX, height: HANDLE_PX, cursor: 'ne-resize' },
  nw: { top: 0,    left: 0,   width: HANDLE_PX, height: HANDLE_PX, cursor: 'nw-resize' },
  se: { bottom: 0, right: 0,  width: HANDLE_PX, height: HANDLE_PX, cursor: 'se-resize' },
  sw: { bottom: 0, left: 0,   width: HANDLE_PX, height: HANDLE_PX, cursor: 'sw-resize' },
};

const ALL_DIRECTIONS: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

interface ResizeHandleProps {
  id: PanelId;
  direction: ResizeDirection;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ id, direction }) => {
  const updatePanel = usePanelStore((s) => s.updatePanel);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const panel = usePanelStore.getState().panels[id];
      if (!panel) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const { x: ox, y: oy, width: ow, height: oh, minWidth, minHeight } = panel;

      const onMove = (mv: PointerEvent) => {
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;

        let x = ox, y = oy, width = ow, height = oh;

        if (direction.includes('e')) {
          width = Math.max(minWidth, ow + dx);
        }
        if (direction.includes('s')) {
          height = Math.max(minHeight, oh + dy);
        }
        if (direction.includes('w')) {
          const newW = Math.max(minWidth, ow - dx);
          x = ox + (ow - newW);
          width = newW;
        }
        if (direction.includes('n')) {
          const newH = Math.max(minHeight, oh - dy);
          y = oy + (oh - newH);
          height = newH;
        }

        const proposed: PanelRect = { x, y, width, height };
        const clamped = clampToWindow(proposed, window.innerWidth, window.innerHeight);
        updatePanel(id, clamped);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [id, direction, updatePanel],
  );

  return (
    <div
      style={{ position: 'absolute', zIndex: 1, ...HANDLE_POSITIONS[direction] }}
      onPointerDown={onPointerDown}
    />
  );
};

// --------------------------------
// --- Panel Component ---
// --------------------------------

export interface PanelProps {
  id: PanelId;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ id, children }) => {
  const panel = usePanelStore((s) => s.panels[id]);
  const bringToFront = usePanelStore((s) => s.bringToFront);
  const setVisible = usePanelStore((s) => s.setVisible);

  const headerRef = useRef<HTMLDivElement>(null);
  useDraggable(id, headerRef);

  if (!panel?.visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: panel.x,
        top: panel.y,
        width: panel.width,
        height: panel.height,
        zIndex: panel.zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a1e',
        border: '1px solid #2e2e36',
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onPointerDown={() => bringToFront(id)}
    >
      {/* Drag handle / title bar */}
      <div
        ref={headerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          height: 36,
          background: '#232328',
          borderBottom: '1px solid #2e2e36',
          cursor: 'grab',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#c9c9d4', letterSpacing: 0.3 }}>
          {panel.title}
        </span>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#6b6b80',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: 3,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setVisible(id, false)}
        >
          ×
        </button>
      </div>

      {/* Scrollable content area */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 12,
          color: '#c9c9d4',
          fontSize: 13,
          userSelect: 'text',
        }}
      >
        {children}
      </div>

      {/* Resize handles — rendered last so they sit on top */}
      {ALL_DIRECTIONS.map((dir) => (
        <ResizeHandle key={dir} id={id} direction={dir} />
      ))}
    </div>
  );
};
