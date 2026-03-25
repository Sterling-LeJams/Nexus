import { useEffect, useRef, useState } from "react";
import { usePanelStore } from "./panels/panelStore";
import { Panel } from "./panels/Panel";
import { defaultIfcExample } from "../types";
import type { ViewerCallbacks } from "../viewer/types";

// --------------------------------
// --- Menu Panel ---
// --------------------------------

export const MENU_PANEL_ID = "menu";

type MenuState = "open" | "choose" | "selectIfc";

type MenuPanelProps = {
  callbacksRef: React.RefObject<ViewerCallbacks | null>;
  modelLoaded: boolean;
  onModelLoad: () => void;
};

const btn = (color: string): React.CSSProperties => ({
  width: "100%",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 500,
  color: "#fff",
  background: color,
  border: "none",
  cursor: "pointer",
  textAlign: "left" as const,
});

function MenuPanel({ callbacksRef, modelLoaded, onModelLoad }: MenuPanelProps) {
  const registerPanel = usePanelStore((s) => s.registerPanel);
  const [menu, setMenu] = useState<MenuState>("open");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    registerPanel({
      id: MENU_PANEL_ID,
      title: "Menu",
      x: 20,
      y: 60,
      width: 224,
      height: 160,
      minWidth: 180,
      minHeight: 100,
      visible: false,
    });
  }, [registerPanel]);

  const handleFileUpload = async (
    source?: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!callbacksRef.current) return;
    const input = source
      ? source.target.files?.[0]
      : defaultIfcExample.filePath;
    if (!input) return;
    usePanelStore.getState().setVisible(MENU_PANEL_ID, false);
    setLoading(true);
    await callbacksRef.current.loadIfc(input);
    setLoading(false);
    onModelLoad();
    setMenu("open");
  };

  return (
    <>
      {/* Hidden file input lives here, co-located with the logic that uses it */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      <Panel id={MENU_PANEL_ID}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#374151" }}>
              Conversion in progress...
            </p>
          ) : menu === "open" ? (
            !modelLoaded ? (
              <button
                style={btn("#2563eb")}
                onClick={() => setMenu("choose")}
              >
                Load Model
              </button>
            ) : (
              <button
                style={btn("#059669")}
                onClick={() => callbacksRef.current?.downloadFragments()}
              >
                Download Fragments
              </button>
            )
          ) : menu === "choose" ? (
            <>
              <button
                style={btn("#2563eb")}
                onClick={() => handleFileUpload()}
              >
                Load Example IFC
              </button>
              <button
                style={btn("#4f46e5")}
                onClick={() => setMenu("selectIfc")}
              >
                Select IFC
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: "#6b7280",
                  cursor: "pointer",
                  textAlign: "left",
                  marginTop: 2,
                }}
                onClick={() => setMenu("open")}
              >
                ← Back
              </button>
            </>
          ) : menu === "selectIfc" ? (
            <>
              <button
                style={btn("#2563eb")}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload from Device
              </button>
              <button
                disabled
                style={{
                  ...btn("#374151"),
                  color: "#6b7280",
                  cursor: "not-allowed",
                  opacity: 0.7,
                }}
              >
                Autodesk Construction Cloud
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: "#6b7280",
                  cursor: "pointer",
                  textAlign: "left",
                  marginTop: 2,
                }}
                onClick={() => setMenu("choose")}
              >
                ← Back
              </button>
            </>
          ) : null}
        </div>
      </Panel>
    </>
  );
}

export default MenuPanel;
