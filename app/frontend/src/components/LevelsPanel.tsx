import { useEffect, useRef } from "react";
import * as OBC from "@thatopen/components";
import { useViewerStore } from "../store/viewerStore";
import { usePanelStore } from "./panels/panelStore";
import { Panel } from "./panels/Panel";
import type { ViewerCallbacks } from "../viewer/types";

// --------------------------------
// --- Levels Panel ---
// --------------------------------

export const LEVELS_PANEL_ID = "levels";

type LevelsPanelProps = {
  callbacksRef: React.RefObject<ViewerCallbacks | null>;
};

function LevelsPanel({ callbacksRef }: LevelsPanelProps) {
  const { levels, selectedLevel, setSelectedLevel } = useViewerStore();
  const registerPanel = usePanelStore((s) => s.registerPanel);
  const visible = usePanelStore(
    (s) => s.panels[LEVELS_PANEL_ID]?.visible ?? false,
  );

  const mountedRef = useRef(false);

  useEffect(() => {
    registerPanel({
      id: LEVELS_PANEL_ID,
      title: "Levels",
      x: 20,
      y: 120,
      width: 224,
      height: 360,
      minWidth: 180,
      minHeight: 200,
      visible: false,
    });
  }, [registerPanel]);

  // When the panel is closed (by any means), clean up level selection and cut plane
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!visible) {
      setSelectedLevel(null);
      const components = callbacksRef.current?.components;
      if (components) {
        const clipper = components.get(OBC.Clipper);
        clipper.deleteAll();
        clipper.enabled = false;
      }
    }
  }, [visible]);

  const handleLevelClick = (levelName: string) => {
    if (selectedLevel === levelName) {
      setSelectedLevel(null);
      const components = callbacksRef.current?.components;
      if (components) {
        const clipper = components.get(OBC.Clipper);
        clipper.deleteAll();
        clipper.enabled = false;
      }
      return;
    }

    setSelectedLevel(levelName);

    const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);
    const idx = sortedLevels.findIndex((l) => l.name === levelName);
    if (idx === -1) return;

    // Cut just below the level above; for the topmost use a default storey height
    const OFFSET_M = 1.5;
    const DEFAULT_STOREY_HEIGHT = 4;
    const levelAbove = sortedLevels[idx + 1];
    const cutElevation = levelAbove
      ? levelAbove.elevation - OFFSET_M
      : sortedLevels[idx].elevation + DEFAULT_STOREY_HEIGHT;

    callbacksRef.current?.cutAtElevation(cutElevation);
  };

  return (
    <Panel id={LEVELS_PANEL_ID}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {levels.length === 0 ? (
          <p style={{ fontSize: 12, color: "#9ca3af", padding: "4px 8px" }}>
            No levels found in model
          </p>
        ) : (
          [...levels]
            .sort((a, b) => a.elevation - b.elevation)
            .map((level) => (
              <button
                key={level.name}
                onClick={() => handleLevelClick(level.name)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  selectedLevel === level.name
                    ? "bg-blue-500/20 text-blue-800 ring-1 ring-blue-400"
                    : "text-gray-700 hover:bg-white/60"
                }`}
              >
                <span className="font-medium">{level.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {level.elevation.toFixed(2)}m
                </span>
              </button>
            ))
        )}
      </div>
    </Panel>
  );
}

export default LevelsPanel;
