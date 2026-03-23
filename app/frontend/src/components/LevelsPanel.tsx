import * as OBC from "@thatopen/components";
import { useViewerStore } from "../store/viewerStore";
import type { ViewerCallbacks } from "../viewer/types";

type LevelsPanelProps = {
  callbacksRef: React.RefObject<ViewerCallbacks | null>;
};

function LevelsPanel({ callbacksRef }: LevelsPanelProps) {
  const { levels, levelsOpen, selectedLevel, setSelectedLevel, setLevelsOpen } =
    useViewerStore();

  if (!levelsOpen) return null;

  const clearCut = () => {
    const components = callbacksRef.current?.components;
    if (!components) return;
    const clipper = components.get(OBC.Clipper);
    clipper.deleteAll();
    clipper.enabled = false;
  };

  const handleLevelClick = (levelName: string) => {
    if (selectedLevel === levelName) {
      setSelectedLevel(null);
      clearCut();
      return;
    }

    setSelectedLevel(levelName);

    const sortedLevels = [...levels].sort((a, b) => a.elevation - b.elevation);
    const idx = sortedLevels.findIndex((l) => l.name === levelName);
    if (idx === -1) return;

    // Cut just below the level above the selected one
    const levelAbove = sortedLevels[idx + 1];
    if (levelAbove && callbacksRef.current) {
      callbacksRef.current.cutAtElevation(levelAbove.elevation);
    }
  };

  const handleClose = () => {
    setLevelsOpen(false);
    setSelectedLevel(null);
    clearCut();
  };

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-56">
      <div className="rounded-xl bg-white/50 backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-300/50">
          <span className="text-sm font-semibold text-gray-800">Levels</span>
          <button
            onClick={handleClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-300/50 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Level list */}
        <div className="px-2 py-2 max-h-80 overflow-y-auto">
          {levels.length === 0 ? (
            <p className="text-xs text-gray-500 px-2 py-1">
              No levels found in model
            </p>
          ) : (
            [...levels]
              .sort((a, b) => b.elevation - a.elevation)
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
      </div>
    </div>
  );
}

export default LevelsPanel;
