import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";

// Shared canvas: DPR capped at 2, transparent background, sane mobile defaults.
// Each gift scene sets its own camera via drei's <PerspectiveCamera makeDefault>.
export function GiftCanvas({ children }: { children: ReactNode }) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "manipulation" }}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
