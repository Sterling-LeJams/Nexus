import * as OBC from "@thatopen/components";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useThemeStore, LIGHT_BG, DARK_BG } from "../store/themeStore";
import { orbit, sectionCut } from "./controls";
import { useViewerStore } from "../store/viewerStore";
import type { Props } from "./types";

function InitViewer({ onInit, onModelLoaded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanupOrbit: (() => void) | null = null;
    let cleanupTheme: (() => void) | null = null;
    let cleanupStoreSub: (() => void) | null = null;
    let cleanupEscape: (() => void) | null = null;
    let sectionCutRef: ReturnType<typeof sectionCut> | null = null;
    let componentsRef: OBC.Components | null = null;
    let workerBlobUrl: string | null = null;

    const init = async () => {
      if (!containerRef.current) return;

      const components = new OBC.Components();
      componentsRef = components;
      const worlds = components.get(OBC.Worlds);
      const world = worlds.create<
        OBC.SimpleScene,
        OBC.SimpleCamera,
        OBC.SimpleRenderer
      >();

      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      const isDark = useThemeStore.getState().isDarkMode;
      world.scene.three.background = new THREE.Color(
        isDark ? DARK_BG : LIGHT_BG,
      );

      const container = containerRef.current!;
      world.renderer = new OBC.SimpleRenderer(components, container);
      world.camera = new OBC.OrthoPerspectiveCamera(components);

      components.init();

      // --- Click-to-Orbit Pivot with Pulsating Orb ---
      const fragments = components.get(OBC.FragmentsManager);
      const raycasters = components.get(OBC.Raycasters);

      const orbitControls = orbit({
        world,
        raycasters,
        container,
        isDark,
      });
      cleanupOrbit = orbitControls.cleanup;

      // --- Section Cut tool ---
      const sc = sectionCut({ world, components, container });
      sectionCutRef = sc;

      // Subscribe to viewerStore to activate/deactivate section cut
      cleanupStoreSub = useViewerStore.subscribe((state) => {
        if (state.activeTool === "sectionCut") {
          sc.activate();
        } else {
          sc.deactivate();
        }
      });

      // Escape key deactivates the active tool
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          useViewerStore.getState().setActiveTool(null);
        }
      };
      window.addEventListener("keydown", onKeyDown);
      cleanupEscape = () => window.removeEventListener("keydown", onKeyDown);

      const updateTheme = (dark: boolean) => {
        world.scene.three.background = new THREE.Color(
          dark ? DARK_BG : LIGHT_BG,
        );
        orbitControls.updateThemeColor(dark);
      };
      cleanupTheme = useThemeStore.subscribe((state) =>
        updateTheme(state.isDarkMode),
      );

      const ifcLoader = components.get(OBC.IfcLoader);

      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: {
          path: "https://unpkg.com/web-ifc@0.0.77/",
          absolute: true,
        },
      });
      if (disposed) return;

      const githubUrl =
        "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      const fetchedUrl = await fetch(githubUrl);
      if (disposed) return;

      const workerBlob = await fetchedUrl.blob();
      if (disposed) return;
      const workerFile = new File([workerBlob], "worker.mjs", {
        type: "text/javascript",
      });

      const workerUrl = URL.createObjectURL(workerFile);
      workerBlobUrl = workerUrl;
      fragments.init(workerUrl);

      world.camera.controls.addEventListener("update", () =>
        fragments.core.update(),
      );

      // Ensures that once the Fragments model is loaded
      // (converted from the IFC in this case),
      // it utilizes the world camera for updates
      // and is added to the scene.
      fragments.list.onItemSet.add(({ value: model }) => {
        model.useCamera(world.camera.three);
        world.scene.three.add(model.object);
        fragments.core.update(true);
        onModelLoaded();
      });

      // Remove z fighting
      fragments.core.models.materials.list.onItemSet.add(
        ({ value: material }) => {
          if (!("isLodMaterial" in material && material.isLodMaterial)) {
            material.polygonOffset = true;
            material.polygonOffsetUnits = 1;
            material.polygonOffsetFactor = Math.random();
          }
        },
      );

      let loadedFileName = "model";

      const loadIfc = async (source: string | File) => {
        let buffer: Uint8Array;
        if (typeof source === "string") {
          const urlName = source.split("/").pop() ?? "model";
          loadedFileName = urlName.replace(/\.ifc$/i, "");
          const file = await fetch(source);
          const data = await file.arrayBuffer();
          buffer = new Uint8Array(data);
        } else {
          loadedFileName = source.name.replace(/\.ifc$/i, "");
          const data = await source.arrayBuffer();
          buffer = new Uint8Array(data);
        }
        await ifcLoader.load(buffer, false, "example", {
          processData: {},
        });
      };

      const downloadFragments = async () => {
        // fragments.list holds all the fragments loaded
        const [model] = fragments.list.values();
        if (!model) return;
        const fragsBuffer = await model.getBuffer(false);
        const file = new File([fragsBuffer], `${loadedFileName}.frag`);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(link.href);
      };

      onInit({
        loadIfc,
        downloadFragments,
        cutAtElevation: sc.cutAtElevation,
        components,
      });
    };

    init();

    return () => {
      disposed = true;
      cleanupOrbit?.();
      cleanupTheme?.();
      cleanupStoreSub?.();
      cleanupEscape?.();
      if (sectionCutRef) sectionCutRef.deactivate();
      if (workerBlobUrl) URL.revokeObjectURL(workerBlobUrl);
      componentsRef?.dispose();
    };
  }, []);

  return (
    <div id="container" className="relative">
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
    </div>
  );
}

export default InitViewer;
