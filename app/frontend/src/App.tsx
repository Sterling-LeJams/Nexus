import { useRef, useState } from "react";
import * as BUI from "@thatopen/ui";
import InitViewer, { type ViewerCallbacks } from "./viewer";
import { defaultIfcExample } from "./types";
import { useThemeStore } from "./store/themeStore";
import hamburgerIcon from "./assets/hamburger.svg";
import CommandPallete from "./components/CommandPallete";

BUI.Manager.init();

type MenuState = "idle" | "open" | "choose" | "selectIfc";

function App() {
  const callbacksRef = useRef<ViewerCallbacks | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<MenuState>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const handleFileUpload = async (
    source?: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!callbacksRef.current) return;
    const input = source
      ? source.target.files?.[0]
      : defaultIfcExample.filePath;
    if (!input) return;
    setMenu("idle");
    setLoading(true);
    await callbacksRef.current.loadIfc(input);
    setLoading(false);
  };

  const menuOpen = menu !== "idle";

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

      {/* Hamburger menu */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <button
          onClick={() => setMenu(menuOpen ? "idle" : "open")}
          className="w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white/70 transition-colors"
        >
          <img src={hamburgerIcon} alt="Menu" className="w-5 h-5" />
        </button>

        {menuOpen && (
          <div className="w-56 rounded-xl bg-white/50 backdrop-blur-sm shadow-lg">
            <div className="px-4 py-3 flex flex-col gap-2">
              {loading ? (
                <p className="text-sm text-gray-700">Conversion in progress...</p>
              ) : menu === "open" ? (
                !modelLoaded ? (
                  <button
                    onClick={() => setMenu("choose")}
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors"
                  >
                    Load Model
                  </button>
                ) : (
                  <button
                    onClick={() => callbacksRef.current?.downloadFragments()}
                    className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition-colors"
                  >
                    Download Fragments
                  </button>
                )
              ) : menu === "choose" ? (
                <>
                  <button
                    onClick={() => handleFileUpload()}
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors"
                  >
                    Load Example IFC
                  </button>
                  <button
                    onClick={() => setMenu("selectIfc")}
                    className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors"
                  >
                    Select IFC
                  </button>
                  <button
                    onClick={() => setMenu("open")}
                    className="text-xs text-gray-400 hover:text-gray-300 transition-colors mt-1"
                  >
                    Back
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-gray-900/90 backdrop-blur-sm border border-white/10 shadow-xl text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
      >
        {isDarkMode ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
            />
          </svg>
        )}
      </button>

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

      <CommandPallete />
    </div>
  );
}

export default App;
