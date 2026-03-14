import { useRef, useState } from "react";
import * as BUI from "@thatopen/ui";
import InitViewer, { type ViewerCallbacks } from "./viewer";
import { defaultIfcExample } from "./types";

BUI.Manager.init();

type MenuState = "idle" | "choose" | "selectIfc";

function App() {
  const callbacksRef = useRef<ViewerCallbacks | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [menu, setMenu] = useState<MenuState>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadExample = async () => {
    if (!callbacksRef.current) return;
    setMenu("idle");
    setLoading(true);
    await callbacksRef.current.loadIfc(defaultIfcExample.filePath);
    setLoading(false);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !callbacksRef.current) return;
    setMenu("idle");
    setLoading(true);
    await callbacksRef.current.loadIfc(file);
    setLoading(false);
  };

  return (
    <div className="relative flex items-center justify-center w-screen h-screen">
      <InitViewer
        onInit={(callbacks) => {
          callbacksRef.current = callbacks;
        }}
        onModelLoaded={() => setModelLoaded(true)}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Control panel */}
      {panelOpen && (
        <div className="absolute top-4 left-4 w-64 rounded-xl bg-gray-900/90 backdrop-blur-sm border border-white/10 shadow-xl text-white">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Nexus
            </p>
            <p className="text-sm font-medium mt-0.5">Controls</p>
          </div>

          <div className="px-4 py-3 flex flex-col gap-2">
            {loading ? (
              <p className="text-sm text-gray-300">Conversion in progress...</p>
            ) : !modelLoaded ? (
              menu === "idle" ? (
                <button
                  onClick={() => setMenu("choose")}
                  className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Load IFC
                </button>
              ) : menu === "choose" ? (
                <>
                  <button
                    onClick={handleLoadExample}
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Load Example IFC
                  </button>
                  <button
                    onClick={() => setMenu("selectIfc")}
                    className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Select IFC
                  </button>
                  <button
                    onClick={() => setMenu("idle")}
                    className="text-xs text-gray-400 hover:text-gray-300 transition-colors mt-1"
                  >
                    Back
                  </button>
                </>
              ) : null
            ) : (
              <button
                onClick={() => callbacksRef.current?.downloadFragments()}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium transition-colors"
              >
                Download Fragments
              </button>
            )}
          </div>
        </div>
      )}

      {/* Select IFC modal */}
      {menu === "selectIfc" && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenu("choose")}
          />
          <div className="relative w-80 rounded-xl bg-gray-900/90 backdrop-blur-sm border border-white/10 shadow-xl text-white">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-sm font-medium">Select IFC Source</p>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium transition-colors"
              >
                Upload from Device
              </button>
              <button
                disabled
                className="w-full rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
              >
                Select from Autodesk Construction Cloud
              </button>
              <button
                onClick={() => setMenu("choose")}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors mt-1"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel toggle button */}
      <button
        onClick={() => setPanelOpen((open) => !open)}
        className="absolute bottom-4 right-4 rounded-full bg-gray-900/90 backdrop-blur-sm border border-white/10 shadow-xl text-white w-10 h-10 flex items-center justify-center hover:bg-gray-700/90 transition-colors"
        title="Toggle settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

export default App;
