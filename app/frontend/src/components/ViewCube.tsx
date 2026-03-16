import * as THREE from "three";
import React from "react";
import { useEffect } from "react";

function ViewCube() {
  const viewCubeContainer = React.useRef<HTMLDivElement>(null);

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
    const material = new THREE.MeshBasicMaterial({
      color: 0xbfbcb2,
      transparent: true,
      opacity: 0.9,
    });

    // Cube
    const cube = new THREE.Mesh(geometry, material);
    cube.rotation.x = Math.PI / 6;
    cube.rotation.y = Math.PI / 4;
    scene.add(cube);

    // Add wireframe edges
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.rotation.copy(cube.rotation);

    scene.add(wireframe);
    camera.position.z = 5;

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

    animate();

    // ran when ViewCube component unmounts so it doesnt leak memory by leaving the renderer running
    return () => {
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={viewCubeContainer}
      id="view-cube"
      className="absolute top-[calc(1rem+15%)] right-10 w-42 h-42"
    >
      {" "}
      {/* This is where the view cube will be rendered */}
    </div>
  );
}

export default ViewCube;
