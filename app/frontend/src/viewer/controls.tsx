import * as OBC from "@thatopen/components";
import * as THREE from "three";

const LIGHT_ORB = 0x333333;
const DARK_ORB = 0xffffff;

type OrbitParams = {
  world: OBC.World;
  raycasters: OBC.Raycasters;
  container: HTMLElement;
  isDark: boolean;
};

type OrbitResult = {
  cleanup: () => void;
  updateThemeColor: (dark: boolean) => void;
};

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
