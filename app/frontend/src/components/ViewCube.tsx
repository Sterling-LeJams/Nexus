import * as THREE from "three";
import * as OBC from "@thatopen/components";
import React from "react";
import { useEffect, useState, useCallback } from "react";
import type { ViewerCallbacks } from "../viewer/viewer";

type Props = {
  callbacksRef: React.RefObject<ViewerCallbacks | null>;
  modelLoaded: boolean;
};

const FACE_NAMES = ["Right", "Left", "Top", "Bottom", "Front", "Back"] as const;
type CubeFace = (typeof FACE_NAMES)[number];

// Target quaternions: rotation needed so the given face is frontal to camera
const FACE_QUATERNIONS: Record<CubeFace, THREE.Quaternion> = {
  Front: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
  Back: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)),
  Right: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)),
  Left: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
  Top: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
  Bottom: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
};

// From each face, which face is in each arrow direction
const ADJACENCY: Record<CubeFace, { up: CubeFace; down: CubeFace; left: CubeFace; right: CubeFace }> = {
  Front:  { up: "Top",  down: "Bottom", left: "Left",  right: "Right" },
  Back:   { up: "Top",  down: "Bottom", left: "Right", right: "Left" },
  Right:  { up: "Top",  down: "Bottom", left: "Front", right: "Back" },
  Left:   { up: "Top",  down: "Bottom", left: "Back",  right: "Front" },
  Top:    { up: "Back", down: "Front",  left: "Left",  right: "Right" },
  Bottom: { up: "Front", down: "Back",  left: "Left",  right: "Right" },
};

function createFaceTexture(label: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#bfbcb2";
  ctx.fillRect(0, 0, size, size);

  // Text
  ctx.fillStyle = "#000000";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2);

  return new THREE.CanvasTexture(canvas);
}

function selectViewCubeFace(
  event: MouseEvent,
  camera: THREE.PerspectiveCamera,
  cube: THREE.Mesh,
  container: HTMLDivElement,
): CubeFace | null {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersections = raycaster.intersectObject(cube);

  if (intersections.length > 0) {
    const face = intersections[0].face;
    if (face) {
      const faceName = FACE_NAMES[face.materialIndex];
      console.log("ViewCube face clicked:", faceName);
      return faceName;
    }
  }
  return null;
}

async function logCameraOrientations(components: OBC.Components) {
  const boxer = components.get(OBC.BoundingBoxer);
  boxer.addFromModels();
  const faces = ["front", "back", "left", "right", "top", "bottom"] as const;

  for (const face of faces) {
    const orientation = await boxer.getCameraOrientation(face);
    console.log(`Camera orientation [${face}]:`, orientation);
  }
  boxer.dispose();
}

type ArrowDirection = "up" | "down" | "left" | "right";

const ARROW_STYLES: Record<ArrowDirection, React.CSSProperties> = {
  up: {
    position: "absolute",
    top: 18,
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderTop: "14px solid #555",
    cursor: "pointer",
  },
  down: {
    position: "absolute",
    bottom: 18,
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderBottom: "14px solid #555",
    cursor: "pointer",
  },
  left: {
    position: "absolute",
    left: 18,
    top: "50%",
    transform: "translateY(-50%)",
    width: 0,
    height: 0,
    borderTop: "10px solid transparent",
    borderBottom: "10px solid transparent",
    borderLeft: "14px solid #555",
    cursor: "pointer",
  },
  right: {
    position: "absolute",
    right: 18,
    top: "50%",
    transform: "translateY(-50%)",
    width: 0,
    height: 0,
    borderTop: "10px solid transparent",
    borderBottom: "10px solid transparent",
    borderRight: "14px solid #555",
    cursor: "pointer",
  },
};

function ViewCube({ callbacksRef, modelLoaded }: Props) {
  const viewCubeContainer = React.useRef<HTMLDivElement>(null);
  const [currentFace, setCurrentFace] = useState<CubeFace | null>(null);

  // Refs to allow arrow/reset click handlers to trigger rotations from outside useEffect
  const rotateTo = React.useRef<((face: CubeFace) => void) | null>(null);
  const resetRotation = React.useRef<(() => void) | null>(null);

  const handleArrowClick = useCallback(
    (direction: ArrowDirection) => {
      if (!currentFace) return;
      const targetFace = ADJACENCY[currentFace][direction];
      rotateTo.current?.(targetFace);
    },
    [currentFace],
  );

  useEffect(() => {
    const container = viewCubeContainer.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(2.25, 2.25, 2.25);
    const materials = FACE_NAMES.map(
      (name) =>
        new THREE.MeshBasicMaterial({
          map: createFaceTexture(name),
          transparent: true,
          opacity: 0.9,
        })
    );

    // Use a group so cube + wireframe rotate together
    const group = new THREE.Group();
    const cube = new THREE.Mesh(geometry, materials);
    group.add(cube);

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    group.add(wireframe);

    // Start with isometric-ish view
    group.rotation.x = Math.PI / 6;
    group.rotation.y = Math.PI / 4;
    const initialQuat = group.quaternion.clone();
    scene.add(group);
    camera.position.z = 5;

    // Animation state — targetFace is null when resetting to initial position
    const anim = {
      active: false,
      startQuat: new THREE.Quaternion(),
      targetQuat: new THREE.Quaternion(),
      progress: 0,
      targetFace: null as CubeFace | null,
    };

    const ANIM_SPEED = 3; // units per second — full rotation in ~0.33s

    function startRotation(face: CubeFace) {
      if (anim.active) return;
      anim.startQuat.copy(group.quaternion);
      anim.targetQuat.copy(FACE_QUATERNIONS[face]);
      anim.progress = 0;
      anim.targetFace = face;
      anim.active = true;
      setCurrentFace(null); // hide arrows during animation
    }

    function startResetRotation() {
      if (anim.active) return;
      anim.startQuat.copy(group.quaternion);
      anim.targetQuat.copy(initialQuat);
      anim.progress = 0;
      anim.targetFace = null;
      anim.active = true;
      setCurrentFace(null);
    }

    // Expose to arrow/reset click handlers
    rotateTo.current = startRotation;
    resetRotation.current = startResetRotation;

    let handleClick: ((e: MouseEvent) => void) | null = null;
    if (modelLoaded && callbacksRef.current) {
      logCameraOrientations(callbacksRef.current.components);

      handleClick = (event: MouseEvent) => {
        if (anim.active) return;
        const face = selectViewCubeFace(event, camera, cube, container);
        if (face) startRotation(face);
      };
      container.addEventListener("click", handleClick);
    }

    let lastTime = performance.now();

    function animate() {
      requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (anim.active) {
        anim.progress += delta * ANIM_SPEED;
        if (anim.progress >= 1) {
          anim.progress = 1;
          anim.active = false;
          group.quaternion.copy(anim.targetQuat);
          setCurrentFace(anim.targetFace);
        } else {
          group.quaternion.slerpQuaternions(anim.startQuat, anim.targetQuat, anim.progress);
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      rotateTo.current = null;
      resetRotation.current = null;
      if (handleClick) container.removeEventListener("click", handleClick);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [modelLoaded]);

  return (
    <div
      ref={viewCubeContainer}
      id="view-cube"
      className="absolute top-[calc(1rem+15%)] right-10 w-42 h-42"
    >
      {currentFace && (
        <div
          title="Reset view"
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "#555",
            cursor: "pointer",
          }}
          onClick={(e) => {
            e.stopPropagation();
            resetRotation.current?.();
          }}
        />
      )}
      {currentFace &&
        (["up", "down", "left", "right"] as ArrowDirection[]).map((dir) => (
          <div
            key={dir}
            title={ADJACENCY[currentFace][dir]}
            style={ARROW_STYLES[dir]}
            onClick={(e) => {
              e.stopPropagation();
              handleArrowClick(dir);
            }}
          />
        ))}
    </div>
  );
}

export default ViewCube;
