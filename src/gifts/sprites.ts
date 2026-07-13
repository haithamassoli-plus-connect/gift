import * as THREE from "three";

// Soft round sprite for Points materials (raw points render as squares).
// Shared by any scene with glowing particles: motes, snow, sparks, stars.
export function makeRadialSprite(size = 32, stops: [number, string][] = [
  [0, "rgba(255,255,255,1)"],
  [0.4, "rgba(255,255,255,0.6)"],
  [1, "rgba(255,255,255,0)"],
]): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
