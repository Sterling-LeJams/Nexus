import * as OBC from "@thatopen/components";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useThemeStore } from "../store/themeStore";
import { orbit } from "./controls";
import ControlFooter from "../components/ControlFooter";

const LIGHT_BG = 0xd8e0ed;
const DARK_BG = 0x818a99;

// Fragments are That Open Engine own custom file type .frag. That Open Engine does not directly
// support IFC files so first it converts the file to a .frag file.
//
//
// Components are the building blocks of That Open Engine. They consists of two things
//    - Global Availability
//    - Lifecycle Management
// ---
//   That Open Engine Project Structure
//
//   TOE is built around three core abstractions:
//
// 1. Components — the Service Locator / IoC Container
//
// const components = new OBC.Components();
//   The root object.Every TOE system is registered here and retrieved via components.get(SomeClass).It
//   handles lifecycle(init / dispose) for all registered components.
//
//   2. World — Scene + Camera + Renderer bound together
//
// const world = worlds.create<SimpleScene, SimpleCamera, SimpleRenderer>();
// world.scene = new OBC.SimpleScene(components);
// world.renderer = new OBC.SimpleRenderer(components, container);
// world.camera = new OBC.OrthoPerspectiveCamera(components);
// components.init(); // starts the render loop
//   A World is the Three.js rendering context.You need all three(scene, renderer, camera) before calling
// components.init(), which starts the animation / render loop.
//
//   3. FragmentsManager — the model system
//
// const fragments = components.get(OBC.FragmentsManager);
// fragments.init(workerUrl); // spawns a Web Worker for off-thread parsing
//   TOE's native format is .frag (Fragments), not IFC directly. The FragmentsManager runs in a Web Worker
//   to avoid blocking the main thread.
//
//   4. IfcLoader — IFC → Fragments conversion
//
// const ifcLoader = components.get(OBC.IfcLoader);
// await ifcLoader.setup({ wasm: { path: "...", absolute: true } });
// await ifcLoader.load(buffer, false, "example", { ... });
// web - ifc is a WASM library that parses IFC.IfcLoader wraps it: you feed it a Uint8Array of an IFC file
//    and it converts it to a Fragment model, which then fires fragments.list.onItemSet.
//
//   5. Event - driven model loading
//
// fragments.list.onItemSet.add(({ value: model }) => {
//   model.useCamera(world.camera.three);   // LOD system needs the camera
//   world.scene.three.add(model.object);   // add Three.js mesh to scene
//   fragments.core.update(true);           // force re-render
// });
//   Once conversion is done, the Fragment model is added to the scene here reactively.
//
//   ---
//   Data Flow Summary
//
//   IFC file(URL)
//     → fetch → Uint8Array
//       → IfcLoader.load()[WASM parsing via web - ifc]
//         → FragmentsManager produces a Fragment model
//           → onItemSet fires → model added to Three.js scene
//             → render loop(started by components.init()) draws it
//
// ---
//   Key Insight: Why Fragments ?
//
//     IFC files are huge and complex.TOE pre - processes them into.frag(a compact binary format optimized
//   for rendering + instancing).Once you have a.frag file, subsequent loads skip the expensive WASM
//   parsing step entirely — which is what downloadFragments enables: cache the converted model locally.
//

export type ViewerCallbacks = {
  loadIfc: (source: string | File) => Promise<void>;
  downloadFragments: () => Promise<void>;
};

type Props = {
  onInit: (callbacks: ViewerCallbacks) => void;
  onModelLoaded: () => void;
};

function InitViewer({ onInit, onModelLoaded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanupOrbit: (() => void) | null = null;
    let cleanupTheme: (() => void) | null = null;
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

      onInit({ loadIfc, downloadFragments });
    };

    init();

    return () => {
      disposed = true;
      cleanupOrbit?.();
      cleanupTheme?.();
      if (workerBlobUrl) URL.revokeObjectURL(workerBlobUrl);
      componentsRef?.dispose();
    };
  }, []);

  return (
    <div id="container" className="relative">
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
      <ControlFooter />
    </div>
  );
}

export default InitViewer;
