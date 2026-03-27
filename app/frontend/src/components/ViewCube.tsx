import * as THREE from "three";
import * as OBC from "@thatopen/components";
import React from "react";
import { useEffect, useState, useCallback } from "react";
import {
  type ViewCubeProps,
  type CubeFace,
  type ArrowDirection,
  FACE_NAMES,
  FACE_QUATERNIONS,
  ADJACENCY,
  ARROW_STYLES,
  FACE_MAP,
} from "./types";

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

async function goToModelView(face: CubeFace, components: OBC.Components) {
  const worlds = components.get(OBC.Worlds);
  const world = worlds.list.values().next().value;
  if (!world?.camera) return;

  const boxer = components.get(OBC.BoundingBoxer);
  boxer.addFromModels();

  const orientation = await boxer.getCameraOrientation(FACE_MAP[face]);
  boxer.dispose();

  const controls = (world.camera as OBC.OrthoPerspectiveCamera).controls;
  controls.setOrbitPoint(
    orientation.target.x,
    orientation.target.y,
    orientation.target.z,
  );
  await controls.setLookAt(
    orientation.position.x,
    orientation.position.y,
    orientation.position.z,
    orientation.target.x,
    orientation.target.y,
    orientation.target.z,
    true,
  );
}

// --------------------------------
// --- Home View ---
// --------------------------------

async function goToHomeView(components: OBC.Components) {
  const worlds = components.get(OBC.Worlds);
  const world = worlds.list.values().next().value;
  if (!world?.camera) return;

  const boxer = components.get(OBC.BoundingBoxer);
  boxer.addFromModels();
  const orientation = await boxer.getCameraOrientation("front");
  boxer.dispose();

  const target = orientation.target;
  const fittedDistance = orientation.position.distanceTo(target);

  // Always place camera at isometric angle (equal front/right/top offset)
  const isoDir = new THREE.Vector3(1, 1, 1).normalize();
  const homePosition = target.clone().addScaledVector(isoDir, fittedDistance);

  const controls = (world.camera as OBC.OrthoPerspectiveCamera).controls;
  controls.setOrbitPoint(target.x, target.y, target.z);
  await controls.setLookAt(
    homePosition.x, homePosition.y, homePosition.z,
    target.x, target.y, target.z,
    true,
  );
}

const ANIM_SPEED = 3; // units per second — full rotation in ~0.33s

function createCubeAnimator(
  group: THREE.Group,
  initialQuat: THREE.Quaternion,
  onAnimationEnd: (face: CubeFace | null) => void,
) {
  const state = {
    active: false,
    startQuat: new THREE.Quaternion(),
    targetQuat: new THREE.Quaternion(),
    progress: 0,
    targetFace: null as CubeFace | null,
  };

  const startRotation = (face: CubeFace) => {
    if (state.active) return;
    state.startQuat.copy(group.quaternion);
    state.targetQuat.copy(FACE_QUATERNIONS[face]);
    state.progress = 0;
    state.targetFace = face;
    state.active = true;
    onAnimationEnd(null); // hide arrows during animation
  };

  const startResetRotation = () => {
    if (state.active) return;
    state.startQuat.copy(group.quaternion);
    state.targetQuat.copy(initialQuat);
    state.progress = 0;
    state.targetFace = null;
    state.active = true;
    onAnimationEnd(null);
  };

  const tick = (delta: number) => {
    if (!state.active) return;
    state.progress += delta * ANIM_SPEED;
    if (state.progress >= 1) {
      state.progress = 1;
      state.active = false;
      group.quaternion.copy(state.targetQuat);
      onAnimationEnd(state.targetFace);
    } else {
      group.quaternion.slerpQuaternions(
        state.startQuat,
        state.targetQuat,
        state.progress,
      );
    }
  };

  return {
    get isActive() {
      return state.active;
    },
    startRotation,
    startResetRotation,
    tick,
  };
}

function ViewCube({ callbacksRef, modelLoaded, homeResetRef }: ViewCubeProps) {
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
        }),
    );

    // Use a group so cube + wireframe rotate together
    const group = new THREE.Group();
    const cube = new THREE.Mesh(geometry, materials);
    group.add(cube);

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    group.add(wireframe);

    // Hover highlight — 70% of face size, transparent blue
    const highlightSize = 2.25 * 0.7;
    const highlightGeo = new THREE.PlaneGeometry(highlightSize, highlightSize);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x78bbf5,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.visible = false;
    highlightMesh.renderOrder = 1;
    group.add(highlightMesh);

    // Start with isometric-ish view
    group.rotation.x = Math.PI / 6;
    group.rotation.y = Math.PI / 4;
    const initialQuat = group.quaternion.clone();
    scene.add(group);
    camera.position.z = 5;

    const animator = createCubeAnimator(group, initialQuat, setCurrentFace);

    // Expose to arrow/reset click handlers
    rotateTo.current = (face: CubeFace) => {
      animator.startRotation(face);
      if (callbacksRef.current) {
        goToModelView(face, callbacksRef.current.components);
      }
    };
    resetRotation.current = () => {
      animator.startResetRotation();
      if (callbacksRef.current) {
        goToHomeView(callbacksRef.current.components);
      }
    };
    if (homeResetRef) {
      homeResetRef.current = resetRotation.current;
    }

    // --------------------------------
    // --- Hover highlight logic ---
    // --------------------------------
    const hoverRaycaster = new THREE.Raycaster();
    const hoverMouse = new THREE.Vector2();
    const HALF_CUBE = 2.25 / 2 + 0.01; // slight offset so highlight sits above face
    const _planeDefault = new THREE.Vector3(0, 0, 1);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      hoverMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      hoverMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      hoverRaycaster.setFromCamera(hoverMouse, camera);
      const hits = hoverRaycaster.intersectObject(cube);

      if (hits.length > 0 && hits[0].face) {
        const normal = hits[0].face.normal;
        highlightMesh.position.set(
          normal.x * HALF_CUBE,
          normal.y * HALF_CUBE,
          normal.z * HALF_CUBE,
        );
        highlightMesh.quaternion.setFromUnitVectors(_planeDefault, normal);
        highlightMesh.visible = true;
      } else {
        highlightMesh.visible = false;
      }
    };

    const handleMouseLeave = () => {
      highlightMesh.visible = false;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    let handleClick: ((e: MouseEvent) => void) | null = null;
    if (modelLoaded && callbacksRef.current) {
      handleClick = (event: MouseEvent) => {
        if (animator.isActive) return;
        const face = selectViewCubeFace(event, camera, cube, container);
        if (face) {
          animator.startRotation(face);
          goToModelView(face, callbacksRef.current!.components);
        }
      };
      container.addEventListener("click", handleClick);
    }

    let lastTime = performance.now();

    const animate = () => {
      requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      animator.tick(delta);
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      rotateTo.current = null;
      resetRotation.current = null;
      if (homeResetRef) homeResetRef.current = null;
      if (handleClick) container.removeEventListener("click", handleClick);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
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
