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

// Draw a soft radial "blob" straight into a caller's 2D context: solid `inner`
// colour at the centre fading to transparent at radius `r`. Unlike makeRadialSprite
// (which owns a canvas and returns a texture), this paints into an existing canvas
// scenes are already compositing — env maps, foil, lamps. Extracted from per-scene
// copies (identical bodies).
export function radialBlob(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: string,
) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, inner);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
