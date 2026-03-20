// View Cube

import React from "react";
import * as THREE from "three";
import type { ViewerCallbacks } from "../viewer/viewer";

export type ViewCubeProps = {
  callbacksRef: React.RefObject<ViewerCallbacks | null>;
  modelLoaded: boolean;
};

export type CubeFace = "Right" | "Left" | "Top" | "Bottom" | "Front" | "Back";

export type ArrowDirection = "up" | "down" | "left" | "right";

export const FACE_NAMES: CubeFace[] = ["Right", "Left", "Top", "Bottom", "Front", "Back"];

// Target quaternions: rotation needed so the given face is frontal to camera
export const FACE_QUATERNIONS: Record<CubeFace, THREE.Quaternion> = {
  Front: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
  Back: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)),
  Right: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)),
  Left: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
  Top: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
  Bottom: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
};

// From each face, which face is in each arrow direction
export const ADJACENCY: Record<CubeFace, { up: CubeFace; down: CubeFace; left: CubeFace; right: CubeFace }> = {
  Front:  { up: "Top",  down: "Bottom", left: "Left",  right: "Right" },
  Back:   { up: "Top",  down: "Bottom", left: "Right", right: "Left" },
  Right:  { up: "Top",  down: "Bottom", left: "Front", right: "Back" },
  Left:   { up: "Top",  down: "Bottom", left: "Back",  right: "Front" },
  Top:    { up: "Back", down: "Front",  left: "Left",  right: "Right" },
  Bottom: { up: "Front", down: "Back",  left: "Left",  right: "Right" },
};

export const ARROW_STYLES: Record<ArrowDirection, React.CSSProperties> = {
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

export const FACE_MAP: Record<
  CubeFace,
  "front" | "back" | "left" | "right" | "top" | "bottom"
> = {
  Front: "front",
  Back: "back",
  Left: "left",
  Right: "right",
  Top: "top",
  Bottom: "bottom",
};
