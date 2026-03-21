import * as OBC from "@thatopen/components";
import * as THREE from "three";
import type { OrbitParams, OrbitResult, SectionCutParams, SectionCutControls } from "./types";

// --------------------------------
// --- Viewer controls based on user input or behavior for the ControlFooter component
// --------------------------------

// --------------------------------
// --- Orbit ---
// --------------------------------

const LIGHT_ORB = 0x333333;
const DARK_ORB = 0xffffff;

export function orbit({
  world,
  raycasters,
  container,
  isDark,
}: OrbitParams): OrbitResult {
  const raycaster = raycasters.get(world);

  const orbGeometry = new THREE.SphereGeometry(0.15, 24, 24);
  const orbMaterial = new THREE.MeshBasicMaterial({
    color: isDark ? DARK_ORB : LIGHT_ORB,
    transparent: true,
    depthTest: false,
  });
  const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
  orbMesh.renderOrder = 999;
  orbMesh.visible = false;
  world.scene.three.add(orbMesh);

  let orbActive = false;
  let orbAnimTime = 0;
  const timer = new THREE.Timer();
  timer.connect(document);

  world.renderer!.onBeforeUpdate.add(() => {
    timer.update();
    if (!orbActive) return;

    const delta = timer.getDelta();
    orbAnimTime += delta;

    const cyclePos = orbAnimTime % 0.6;

    if (cyclePos < 0.4) {
      const t = cyclePos / 0.4;
      const ease = Math.sin(t * Math.PI);
      const scale = 1.0 + 0.6 * ease;
      orbMesh.scale.setScalar(scale);
    } else {
      orbMesh.scale.setScalar(1.0);
    }
  });

  const onPointerDown = async (event: PointerEvent) => {
    if (event.button !== 0) return;
    const hit = await raycaster.castRay();

    if (!hit) return;
    const { x, y, z } = hit.point;
    world.camera.controls!.setOrbitPoint(x, y, z);
    orbMesh.position.set(x, y, z);
    orbMesh.scale.setScalar(1.0);
    orbMesh.visible = true;
    orbActive = true;
    orbAnimTime = 0;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.button !== 0) return;
    orbMesh.visible = false;
    orbActive = false;
  };

  container.addEventListener("pointerdown", onPointerDown, {
    capture: true,
  });
  window.addEventListener("pointerup", onPointerUp);

  const cleanup = () => {
    container.removeEventListener("pointerdown", onPointerDown as any, {
      capture: true,
    });
    window.removeEventListener("pointerup", onPointerUp as any);
    orbGeometry.dispose();
    orbMaterial.dispose();
    timer.dispose();
    world.scene.three.remove(orbMesh);
  };

  const updateThemeColor = (dark: boolean) => {
    orbMaterial.color.setHex(dark ? DARK_ORB : LIGHT_ORB);
  };

  return { cleanup, updateThemeColor };
}

// --------------------------------
// --- Section Cut ---
// --------------------------------

export function sectionCut({
  world,
  components,
  container,
}: SectionCutParams): SectionCutControls {
  const clipper = components.get(OBC.Clipper);
  const raycaster = components.get(OBC.Raycasters).get(world);

  // Configure visuals once
  clipper.size = 50;
  clipper.material.transparent = true;
  clipper.material.opacity = 0.15;
  clipper.material.color.set(0x5588ff);
  clipper.visible = true;

  let pointerDownX = 0;
  let pointerDownY = 0;
  let isDraggingPlane = false;

  const onPointerDown = (e: PointerEvent) => {
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
  };

  // Suppress clicks during and briefly after a gizmo drag
  const onDragStart = () => {
    isDraggingPlane = true;
  };
  const onDragEnd = () => {
    setTimeout(() => {
      isDraggingPlane = false;
    }, 50);
  };

  const onClick = async (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (isDraggingPlane) return;
    // Ignore drags (threshold: 5px)
    const dx = e.clientX - pointerDownX;
    const dy = e.clientY - pointerDownY;
    if (dx * dx + dy * dy > 25) return;

    const hit = await raycaster.castRay();
    if (!hit) return;

    // Fragment raycasts return `normal` directly (already in world space).
    // Three.js intersections return `face.normal` in object-local space.
    const rawNormal = hit.normal
      ? hit.normal.clone()
      : hit.face
        ? hit.face.normal
            .clone()
            .transformDirection(hit.object.matrixWorld)
            .normalize()
        : null;
    if (!rawNormal) return;

    // Don't replace plane if user clicked on the plane mesh itself
    const planeMeshes = [...clipper.list.values()].flatMap((p) => p.meshes);
    if (planeMeshes.includes(hit.object as THREE.Mesh)) return;

    // Negate so the clip removes geometry behind the surface (matches TOE convention)
    rawNormal.negate();

    // Snap to nearest axis: horizontal for floors/ceilings, vertical for walls
    const absY = Math.abs(rawNormal.y);
    const snappedNormal =
      absY > 0.7
        ? new THREE.Vector3(0, Math.sign(rawNormal.y), 0)
        : rawNormal.clone().setY(0).normalize();

    clipper.deleteAll();
    clipper.createFromNormalAndCoplanarPoint(world, snappedNormal, hit.point);
  };

  const activate = () => {
    clipper.enabled = true;
    clipper.onBeforeDrag.add(onDragStart);
    clipper.onAfterDrag.add(onDragEnd);
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("click", onClick);
    container.style.cursor = "crosshair";
  };

  const deactivate = () => {
    clipper.onBeforeDrag.remove(onDragStart);
    clipper.onAfterDrag.remove(onDragEnd);
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("click", onClick);
    container.style.cursor = "";
    clipper.enabled = false;
    clipper.deleteAll();
    isDraggingPlane = false;
  };

  const cutAtElevation = (elevation: number) => {
    clipper.enabled = true;
    clipper.deleteAll();
    clipper.createFromNormalAndCoplanarPoint(
      world,
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, elevation, 0),
    );
  };

  return { activate, deactivate, cutAtElevation };
}
