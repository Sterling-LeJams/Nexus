import { useRef, useState } from "react";
import * as BUI from "@thatopen/ui";
import InitViewer, { type ViewerCallbacks } from "./viewer";
import { useThemeStore } from "./store/themeStore";
import { usePanelStore } from "./components/panels/panelStore";
import hamburgerIcon from "./assets/hamburger.svg";
import CommandPallete from "./components/CommandPallete";
import Home from "./components/Home";
import Button from "./components/Button";
import ViewCube from "./components/ViewCube";
import ControlFooter from "./components/ControlFooter";
import LevelsPanel from "./components/LevelsPanel";
import MenuPanel, { MENU_PANEL_ID } from "./components/MenuPanel";

BUI.Manager.init();

function App() {
  const callbacksRef = useRef<ViewerCallbacks | null>(null);
  const homeResetRef = useRef<(() => void) | null>(null);

  const [modelLoaded, setModelLoaded] = useState(false);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const toggleMenu = () => {
    const { panels, setVisible } = usePanelStore.getState();
    setVisible(MENU_PANEL_ID, !panels[MENU_PANEL_ID]?.visible);
  };

  return (
    <div className="relative flex items-center justify-center w-screen h-screen">
      <InitViewer
        onInit={(callbacks) => {
          callbacksRef.current = callbacks;
        }}
        onModelLoaded={() => setModelLoaded(true)}
      />

      {/* Hamburger trigger */}
      <div className="absolute top-4 left-4">
        <Button onClick={toggleMenu}>
          <img src={hamburgerIcon} alt="Menu" className="w-5 h-5" />
        </Button>
      </div>

      {/* Theme toggle */}
      <Button onClick={toggleTheme} className="absolute top-4 right-4">
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
      </Button>

      <Home onClick={() => homeResetRef.current?.()} />
      <ViewCube callbacksRef={callbacksRef} modelLoaded={modelLoaded} homeResetRef={homeResetRef} />
      <LevelsPanel callbacksRef={callbacksRef} />
      <MenuPanel
        callbacksRef={callbacksRef}
        modelLoaded={modelLoaded}
        onModelLoad={() => setModelLoaded(true)}
      />
      <ControlFooter />
      <CommandPallete />
    </div>
  );
}

export default App;
