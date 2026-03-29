import * as OBC from "@thatopen/components";
import * as THREE from "three";
import { useViewerStore } from "../store/viewerStore";
import type { OrbitParams, OrbitResult } from "./types";

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
    container.removeEventListener("pointerdown", onPointerDown as never, {
      capture: true,
    });
    window.removeEventListener("pointerup", onPointerUp as never);
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

export interface SectionCutPlane {
  id: string;
  source: "level" | "manual";
}

interface SectionCutManagerParams {
  world: OBC.World;
  components: OBC.Components;
  container: HTMLElement;
}

export class SectionCutManager {
  private _clipper: OBC.Clipper;
  private _raycaster: ReturnType<OBC.Raycasters["get"]>;
  private _world: OBC.World;
  private _container: HTMLElement;
  private _planes: SectionCutPlane[] = [];
  private _interactiveMode = false;
  private _isDragging = false;
  private _pointerDownX = 0;
  private _pointerDownY = 0;

  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onClick: (e: MouseEvent) => void;
  private readonly _onDragStart: () => void;
  private readonly _onDragEnd: () => void;

  constructor({ world, components, container }: SectionCutManagerParams) {
    this._world = world;
    this._container = container;
    this._clipper = components.get(OBC.Clipper);
    this._raycaster = components.get(OBC.Raycasters).get(world);

    // One-time visual config
    this._clipper.size = 50;
    this._clipper.material.transparent = true;
    this._clipper.material.opacity = 0.15;
    this._clipper.material.color.set(0x5588ff);
    this._clipper.visible = true;

    this._onPointerDown = (e) => {
      this._pointerDownX = e.clientX;
      this._pointerDownY = e.clientY;
    };
    this._onDragStart = () => {
      this._isDragging = true;
    };
    this._onDragEnd = () => {
      setTimeout(() => {
        this._isDragging = false;
      }, 50);
    };
    this._onClick = (e) => {
      void this._handleClick(e);
    };
  }

  // Called by viewer.tsx store subscription when activeTool → "sectionCut".
  activateInteractive(): void {
    if (this._interactiveMode) return;
    this._interactiveMode = true;
    this._clipper.enabled = true;
    this._clipper.onBeforeDrag.add(this._onDragStart);
    this._clipper.onAfterDrag.add(this._onDragEnd);
    this._container.addEventListener("pointerdown", this._onPointerDown);
    this._container.addEventListener("click", this._onClick);
    this._container.style.cursor = "crosshair";
  }

  // Creates a horizontal clipping plane at the given elevation.
  // Also sets activeTool so the Section Cut button highlights and Escape works.
  // Pass additive=true to keep existing planes.
  cutAtElevation(elevation: number, additive = false): void {
    if (!additive) this._clearAllPlanes();
    this._clipper.enabled = false;
    const id = this._clipper.createFromNormalAndCoplanarPoint(
      this._world,
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, elevation, 0),
    );
    this._clipper.list.get(id)?.controls.setSize(0.3);
    this._planes.push({ id: String(id), source: "level" });
    useViewerStore.getState().setActiveTool("sectionCut");
  }

  // Clears all planes and exits all modes.
  // Called by the store subscription when activeTool → null (Escape),
  // and directly by LevelsPanel when deselecting a level or closing the panel.
  deactivate(): void {
    this._exitInteractiveMode();
    this._clearAllPlanes();
    this._clipper.enabled = false;
    if (useViewerStore.getState().activeTool === "sectionCut") {
      useViewerStore.getState().setActiveTool(null);
    }
  }

  dispose(): void {
    this.deactivate();
  }

  private _exitInteractiveMode(): void {
    if (!this._interactiveMode) return;
    this._interactiveMode = false;
    this._clipper.onBeforeDrag.remove(this._onDragStart);
    this._clipper.onAfterDrag.remove(this._onDragEnd);
    this._container.removeEventListener("pointerdown", this._onPointerDown);
    this._container.removeEventListener("click", this._onClick);
    this._container.style.cursor = "";
    this._isDragging = false;
  }

  private _clearAllPlanes(): void {
    this._clipper.deleteAll();
    this._planes = [];
  }

  private async _handleClick(e: MouseEvent): Promise<void> {
    if (e.button !== 0 || this._isDragging) return;
    const dx = e.clientX - this._pointerDownX;
    const dy = e.clientY - this._pointerDownY;
    if (dx * dx + dy * dy > 25) return;

    const hit = await this._raycaster.castRay();
    if (!hit) return;

    // Don't replace plane if user clicked on the plane mesh itself
    const planeMeshes = [...this._clipper.list.values()].flatMap(
      (p) => p.meshes,
    );
    if (planeMeshes.includes(hit.object as THREE.Mesh)) return;

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

    // Negate so the clip removes geometry behind the surface (matches TOE convention)
    rawNormal.negate();

    // Snap to nearest axis: horizontal for floors/ceilings, vertical for walls
    const absY = Math.abs(rawNormal.y);
    const snappedNormal =
      absY > 0.7
        ? new THREE.Vector3(0, Math.sign(rawNormal.y), 0)
        : rawNormal.clone().setY(0).normalize();

    // Plain click replaces all planes; Shift+click adds alongside existing planes
    if (!e.shiftKey) this._clearAllPlanes();

    const id = this._clipper.createFromNormalAndCoplanarPoint(
      this._world,
      snappedNormal,
      hit.point,
    );
    this._clipper.list.get(id)?.controls.setSize(0.3);
    this._planes.push({ id: String(id), source: "manual" });
  }
}

// --------------------------------
// --- Section Cut Cube ---
// --------------------------------

// Face order: 0=xMax, 1=xMin, 2=yMax, 3=yMin, 4=zMax, 5=zMin
const SC_CUBE_MIN_GAP = 0.5;

const CLIP_NORMALS = [
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(0, 0, 1),
];

const DRAG_AXES = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, 1),
];

const FACE_EULERS = [
  new THREE.Euler(0, Math.PI / 2, 0),
  new THREE.Euler(0, -Math.PI / 2, 0),
  new THREE.Euler(-Math.PI / 2, 0, 0),
  new THREE.Euler(Math.PI / 2, 0, 0),
  new THREE.Euler(0, 0, 0),
  new THREE.Euler(0, Math.PI, 0),
];

interface SectionCutCubeParams {
  world: OBC.World;
  components: OBC.Components;
  container: HTMLElement;
}

interface BoxBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

export class SectionCutCube {
  private _clipper: OBC.Clipper;
  private _world: OBC.World;
  private _container: HTMLElement;
  private _planeIds: string[] = [];
  private _isActive = false;

  private _boxGroup: THREE.Group | null = null;
  private _edgesMesh: THREE.LineSegments | null = null;
  private _faceMeshes: THREE.Mesh[] = [];

  private _bounds: BoxBounds = {
    xMin: 0,
    xMax: 1,
    yMin: 0,
    yMax: 1,
    zMin: 0,
    zMax: 1,
  };

  private readonly _raycaster = new THREE.Raycaster();
  private readonly _dragPlane = new THREE.Plane();
  private _dragFaceIndex: number | null = null;
  private _dragStartAxisValue = 0;
  private _dragStartBoundsValue = 0;

  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerMove: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;

  constructor({ world, components, container }: SectionCutCubeParams) {
    this._world = world;
    this._container = container;
    this._clipper = components.get(OBC.Clipper);

    this._onPointerDown = (e) => this._handlePointerDown(e);
    this._onPointerMove = (e) => this._handlePointerMove(e);
    this._onPointerUp = (e) => this._handlePointerUp(e);
  }

  activate(): void {
    if (this._isActive) return;
    this._isActive = true;

    this._clipper.enabled = false;

    const box = this._computeBoundingBox();
    box.expandByScalar(0.5);
    this._bounds = {
      xMin: box.min.x,
      xMax: box.max.x,
      yMin: box.min.y,
      yMax: box.max.y,
      zMin: box.min.z,
      zMax: box.max.z,
    };

    this._createClippingPlanes();
    this._createVisuals();

    this._container.addEventListener("pointerdown", this._onPointerDown, {
      capture: true,
    });
    this._container.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);

    useViewerStore.getState().setActiveTool("sectionCutCube");
  }

  deactivate(): void {
    if (!this._isActive) return;
    this._isActive = false;
    this._container.style.cursor = "";

    this._world.camera.controls!.enabled = true;

    this._container.removeEventListener("pointerdown", this._onPointerDown, {
      capture: true,
    });
    this._container.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);

    this._clipper.deleteAll();
    this._planeIds = [];
    this._dragFaceIndex = null;

    this._removeVisuals();

    this._clipper.enabled = false;

    if (useViewerStore.getState().activeTool === "sectionCutCube") {
      useViewerStore.getState().setActiveTool(null);
    }
  }

  dispose(): void {
    this.deactivate();
  }

  private _createClippingPlanes(): void {
    const b = this._bounds;
    const cx = (b.xMin + b.xMax) / 2;
    const cy = (b.yMin + b.yMax) / 2;
    const cz = (b.zMin + b.zMax) / 2;
    const coplanarPoints = [
      new THREE.Vector3(b.xMax, cy, cz),
      new THREE.Vector3(b.xMin, cy, cz),
      new THREE.Vector3(cx, b.yMax, cz),
      new THREE.Vector3(cx, b.yMin, cz),
      new THREE.Vector3(cx, cy, b.zMax),
      new THREE.Vector3(cx, cy, b.zMin),
    ];

    for (let i = 0; i < 6; i++) {
      const id = this._clipper.createFromNormalAndCoplanarPoint(
        this._world,
        CLIP_NORMALS[i],
        coplanarPoints[i],
      );
      const simplePlane = this._clipper.list.get(id);
      if (simplePlane) {
        simplePlane.visible = false;
        simplePlane.controls.enabled = false;
      }
      this._planeIds.push(String(id));
    }
  }

  private _createVisuals(): void {
    this._boxGroup = new THREE.Group();

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x5588ff });
    this._edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    this._boxGroup.add(this._edgesMesh);

    for (let i = 0; i < 6; i++) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x5588ff,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.copy(FACE_EULERS[i]);
      mesh.userData.faceIndex = i;
      this._faceMeshes.push(mesh);
      this._boxGroup.add(mesh);
    }

    this._world.scene.three.add(this._boxGroup);
    this._updateVisuals();
  }

  private _updateVisuals(): void {
    if (!this._edgesMesh) return;
    const { xMin, xMax, yMin, yMax, zMin, zMax } = this._bounds;
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const cz = (zMin + zMax) / 2;
    const dx = xMax - xMin;
    const dy = yMax - yMin;
    const dz = zMax - zMin;

    this._edgesMesh.position.set(cx, cy, cz);
    this._edgesMesh.scale.set(dx, dy, dz);

    this._faceMeshes[0]?.position.set(xMax, cy, cz);
    this._faceMeshes[1]?.position.set(xMin, cy, cz);
    this._faceMeshes[2]?.position.set(cx, yMax, cz);
    this._faceMeshes[3]?.position.set(cx, yMin, cz);
    this._faceMeshes[4]?.position.set(cx, cy, zMax);
    this._faceMeshes[5]?.position.set(cx, cy, zMin);

    this._faceMeshes[0]?.scale.set(dz, dy, 0.05);
    this._faceMeshes[1]?.scale.set(dz, dy, 0.05);
    this._faceMeshes[2]?.scale.set(dx, dz, 0.05);
    this._faceMeshes[3]?.scale.set(dx, dz, 0.05);
    this._faceMeshes[4]?.scale.set(dx, dy, 0.05);
    this._faceMeshes[5]?.scale.set(dx, dy, 0.05);
  }

  private _removeVisuals(): void {
    if (!this._boxGroup) return;

    this._edgesMesh?.geometry.dispose();
    (this._edgesMesh?.material as THREE.Material | undefined)?.dispose();
    for (const m of this._faceMeshes) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }

    this._world.scene.three.remove(this._boxGroup);
    this._boxGroup = null;
    this._edgesMesh = null;
    this._faceMeshes = [];
  }

  private _getNDC(event: PointerEvent): THREE.Vector2 {
    const rect = this._container.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private _hitTestFaces(event: PointerEvent): number | null {
    const ndc = this._getNDC(event);
    this._raycaster.setFromCamera(ndc, this._world.camera.three);
    const hits = this._raycaster.intersectObjects(this._faceMeshes);
    if (hits.length === 0) return null;
    return (hits[0].object.userData as { faceIndex: number }).faceIndex;
  }

  private _getBoundsValue(fi: number): number {
    const b = this._bounds;
    return [b.xMax, b.xMin, b.yMax, b.yMin, b.zMax, b.zMin][fi];
  }

  private _setBoundsValue(fi: number, v: number): void {
    const b = this._bounds;
    const keys: (keyof BoxBounds)[] = [
      "xMax",
      "xMin",
      "yMax",
      "yMin",
      "zMax",
      "zMin",
    ];
    b[keys[fi]] = v;
  }

  private _clampFace(fi: number, v: number): number {
    const b = this._bounds;
    // Pairs: (0,1)=X, (2,3)=Y, (4,5)=Z. Even index = max face, odd = min face.
    if (fi % 2 === 0) {
      // max face: can't go below opposite min + gap
      const minVal =
        [b.xMin, b.xMin, b.yMin, b.yMin, b.zMin, b.zMin][fi] + SC_CUBE_MIN_GAP;
      return Math.max(v, minVal);
    } else {
      // min face: can't go above opposite max - gap
      const maxVal =
        [b.xMax, b.xMax, b.yMax, b.yMax, b.zMax, b.zMax][fi] - SC_CUBE_MIN_GAP;
      return Math.min(v, maxVal);
    }
  }

  private _getFaceCoplanarPoint(fi: number): THREE.Vector3 {
    const b = this._bounds;
    const cx = (b.xMin + b.xMax) / 2;
    const cy = (b.yMin + b.yMax) / 2;
    const cz = (b.zMin + b.zMax) / 2;
    switch (fi) {
      case 0:
        return new THREE.Vector3(b.xMax, cy, cz);
      case 1:
        return new THREE.Vector3(b.xMin, cy, cz);
      case 2:
        return new THREE.Vector3(cx, b.yMax, cz);
      case 3:
        return new THREE.Vector3(cx, b.yMin, cz);
      case 4:
        return new THREE.Vector3(cx, cy, b.zMax);
      default:
        return new THREE.Vector3(cx, cy, b.zMin);
    }
  }

  private _updateClippingPlane(fi: number): void {
    const id = this._planeIds[fi];
    const simplePlane = this._clipper.list.get(id);
    if (!simplePlane) return;
    simplePlane.three.setFromNormalAndCoplanarPoint(
      CLIP_NORMALS[fi],
      this._getFaceCoplanarPoint(fi),
    );
  }

  private _handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const faceIndex = this._hitTestFaces(event);
    if (faceIndex === null) return;

    event.stopPropagation();
    this._container.style.cursor = "grabbing";

    this._world.camera.controls!.enabled = false;

    const ndc = this._getNDC(event);
    this._raycaster.setFromCamera(ndc, this._world.camera.three);
    const hits = this._raycaster.intersectObjects(this._faceMeshes);
    const hitPoint = hits[0].point;

    const camDir = new THREE.Vector3();
    this._world.camera.three.getWorldDirection(camDir);
    this._dragPlane.setFromNormalAndCoplanarPoint(camDir, hitPoint);

    this._dragFaceIndex = faceIndex;
    this._dragStartAxisValue = hitPoint.dot(DRAG_AXES[faceIndex]);
    this._dragStartBoundsValue = this._getBoundsValue(faceIndex);
  }

  private _handlePointerMove(event: PointerEvent): void {
    if (this._dragFaceIndex === null) {
      const fi = this._hitTestFaces(event);
      this._container.style.cursor = fi !== null ? "grab" : "";
      return;
    }

    const ndc = this._getNDC(event);
    this._raycaster.setFromCamera(ndc, this._world.camera.three);

    const intersect = new THREE.Vector3();
    if (!this._raycaster.ray.intersectPlane(this._dragPlane, intersect)) return;

    const fi = this._dragFaceIndex;
    const newAxisValue = intersect.dot(DRAG_AXES[fi]);
    const delta = newAxisValue - this._dragStartAxisValue;
    const newBoundsValue = this._clampFace(
      fi,
      this._dragStartBoundsValue + delta,
    );

    this._setBoundsValue(fi, newBoundsValue);
    this._updateClippingPlane(fi);
    this._updateVisuals();
  }

  private _handlePointerUp(event: PointerEvent): void {
    if (event.button !== 0 || this._dragFaceIndex === null) return;
    this._dragFaceIndex = null;
    this._world.camera.controls!.enabled = true;
    this._container.style.cursor = "";
  }

  private _computeBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    this._world.scene.three.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        box.expandByObject(object);
      }
    });
    if (box.isEmpty()) {
      box.setFromCenterAndSize(
        new THREE.Vector3(),
        new THREE.Vector3(10, 10, 10),
      );
    }
    return box;
  }
}
