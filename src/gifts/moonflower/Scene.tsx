import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { SceneProps } from "../types";
import { makeRadialSprite } from "../sprites";
import { useOpeningClock } from "../useOpeningClock";
import { clamp01, easeOutCubic, lerp, mulberry32, smooth } from "../math";

/* ---------- palettes ---------- */
const PALETTES: Record<
  string,
  {
    petal: string;
    throat: string;
    vein: string;
    edge: string;
    anther: string;
    filament: string;
    light: string;
    mote: string;
  }
> = {
  moonlight: {
    petal: "#eef2ff", throat: "#8fa6cd", vein: "#b6c8ef", edge: "#7fccff",
    anther: "#ffe6a3", filament: "#e8eeff", light: "#bcd6ff", mote: "#dbeaff",
  },
  blush: {
    petal: "#ffd3e2", throat: "#c9647f", vein: "#ef9ab8", edge: "#ff8fc0",
    anther: "#ffe9b0", filament: "#ffe4ee", light: "#ffb4d2", mote: "#ffd9e8",
  },
  violet: {
    petal: "#c9b4ff", throat: "#523795", vein: "#8f6fe0", edge: "#a06bff",
    anther: "#ffd98a", filament: "#ded0ff", light: "#a98cff", mote: "#d8c8ff",
  },
};

/* ---------- shared GLSL: value noise used to warp the vein pattern ---------- */
const NOISE_GLSL = /* glsl */ `
float mfHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float mfNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mfHash(i), mfHash(i + vec2(1.0, 0.0)), u.x),
             mix(mfHash(i + vec2(0.0, 1.0)), mfHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

/* ---------- procedural petal (also used for the leaves) ---------- */
function buildPetalGeo(): THREE.BufferGeometry {
  const W = 12;
  const H = 18;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let iy = 0; iy <= H; iy++) {
    const v = iy / H;
    for (let ix = 0; ix <= W; ix++) {
      const u = ix / W;
      const su = u * 2 - 1;
      // Narrow at the base, widest around 60% of the length, drawn to a point at the tip.
      const width =
        0.52 * Math.pow(Math.sin(Math.PI * (0.06 + 0.94 * v)), 0.85) * (0.35 + 0.65 * Math.pow(v, 0.45));
      const cup = -0.3 * su * su * (1 - 0.55 * v);
      const curl = 0.22 * v * v;
      const ruffle = 0.03 * Math.sin(su * Math.PI * 2.6) * v * v;
      positions.push(su * width, v, cup + curl + ruffle);
      uvs.push(u, v);
    }
  }
  for (let iy = 0; iy < H; iy++) {
    for (let ix = 0; ix < W; ix++) {
      const a = iy * (W + 1) + ix;
      const b = a + 1;
      const c = a + W + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
const petalGeo = buildPetalGeo();

/* ---------- stem ---------- */
const STEM_BASE_Y = -1.7;
const STEM_TOP_Y = -0.12;
const LEAF_Y = -0.95;

const stemCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, STEM_BASE_Y, 0),
  new THREE.Vector3(0.06, -1.3, 0.03),
  new THREE.Vector3(-0.04, -0.9, -0.03),
  new THREE.Vector3(0.03, -0.5, 0.02),
  new THREE.Vector3(0, STEM_TOP_Y, 0),
]);
const stemGeo = new THREE.TubeGeometry(stemCurve, 48, 0.026, 8);

// The stem sways on the GPU, but the head and leaves ride on it as separate groups, so
// the same curve has to exist on the CPU too. Both sides read these numbers — keep them
// the single source of truth rather than typing the constants into the GLSL by hand.
const SWAY = { ax: 0.055, az: 0.04, fx: 1.05, fz: 0.85, ky: 1.3, kz: 1.1 };
const SWAY_SPAN = STEM_TOP_Y - STEM_BASE_Y;

/** Lateral offset of the stem at height `y` and time `t` — mirrors STEM_SWAY_GLSL. */
function swayAt(y: number, t: number): [number, number] {
  const h = clamp01((y - STEM_BASE_Y) / SWAY_SPAN);
  const w = h * h; // rooted at the base, free at the tip
  return [
    Math.sin(t * SWAY.fx + y * SWAY.ky) * SWAY.ax * w,
    Math.cos(t * SWAY.fz + y * SWAY.kz) * SWAY.az * w,
  ];
}

const STEM_SWAY_GLSL = /* glsl */ `
float h = clamp((transformed.y - (${STEM_BASE_Y.toFixed(3)})) / ${SWAY_SPAN.toFixed(3)}, 0.0, 1.0);
float w = h * h;
transformed.x += sin(uTime * ${SWAY.fx.toFixed(3)} + transformed.y * ${SWAY.ky.toFixed(3)}) * ${SWAY.ax.toFixed(3)} * w;
transformed.z += cos(uTime * ${SWAY.fz.toFixed(3)} + transformed.y * ${SWAY.kz.toFixed(3)}) * ${SWAY.az.toFixed(3)} * w;
`;

/* ---------- stamens: golden-angle disc packing ---------- */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const STAMEN_COUNT = 56;
const STAMEN_RADIUS = 0.009;
const STAMEN_LEN = 0.26;
const STAMEN_SPAN = STAMEN_LEN + STAMEN_RADIUS * 2;
const STAMEN_DISC = 0.32; // ~a third of the head radius, so the cluster reads at gift framing

const stamenGeo = new THREE.CapsuleGeometry(STAMEN_RADIUS, STAMEN_LEN, 3, 6);
stamenGeo.translate(0, STAMEN_SPAN / 2, 0); // base at the origin so h = position.y / span

function buildStamens() {
  const rand = mulberry32(31415);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const matrices: THREE.Matrix4[] = [];
  const phases = new Float32Array(STAMEN_COUNT);
  for (let i = 0; i < STAMEN_COUNT; i++) {
    const f = (i + 0.5) / STAMEN_COUNT;
    const r = Math.sqrt(f) * STAMEN_DISC; // sqrt keeps the disc evenly covered
    const a = i * GOLDEN_ANGLE;
    const tilt = f * 0.55; // outer stamens lean further out
    dir.set(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
    dummy.position.set(Math.cos(a) * r, 0.05 + (1 - f) * 0.06, Math.sin(a) * r);
    dummy.quaternion.setFromUnitVectors(up, dir);
    dummy.scale.setScalar(0.75 + rand() * 0.45);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
    phases[i] = rand() * Math.PI * 2;
  }
  return { matrices, phases };
}
const STAMENS = buildStamens();
stamenGeo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(STAMENS.phases, 1));

/* ---------- petal layout ---------- */
const LAYERS = [
  { count: 5, scale: 0.55, open: 0.62, radial: 0.03, y: 0.02 },
  { count: 7, scale: 0.8, open: 1.02, radial: 0.06, y: 0.0 },
  { count: 9, scale: 1.0, open: 1.35, radial: 0.09, y: -0.02 },
];

interface Petal {
  azimuth: number;
  scale: number;
  closed: number;
  open: number;
  radial: number;
  y: number;
  start: number;
}

const BLOOM_DUR = 1.0;
function buildPetals(): { petals: Petal[]; end: number } {
  const rand = mulberry32(20260714);
  const petals: Petal[] = [];
  const outer = LAYERS.length - 1;
  for (let layer = 0; layer < LAYERS.length; layer++) {
    const spec = LAYERS[layer];
    for (let i = 0; i < spec.count; i++) {
      petals.push({
        azimuth: (i / spec.count) * Math.PI * 2 + layer * GOLDEN_ANGLE + (rand() - 0.5) * 0.12,
        scale: spec.scale * (0.96 + rand() * 0.08),
        closed: 0.05 + layer * 0.015 + (rand() - 0.5) * 0.02,
        open: spec.open + (rand() - 0.5) * 0.12,
        radial: spec.radial,
        y: spec.y,
        start: 0.9 + (outer - layer) * 0.55 + i * 0.05 + rand() * 0.06,
      });
    }
  }
  const end = Math.max(...petals.map((p) => p.start)) + BLOOM_DUR + 0.5;
  return { petals, end };
}
const { petals: PETALS, end: OPEN_END } = buildPetals();

/* ---------- pollen motes ---------- */
const MOTE_COUNT = 90;
function buildMotes() {
  const rand = mulberry32(6180);
  const pos = new Float32Array(MOTE_COUNT * 3);
  const speed = new Float32Array(MOTE_COUNT);
  const wobble = new Float32Array(MOTE_COUNT);
  for (let i = 0; i < MOTE_COUNT; i++) {
    const r = Math.sqrt(rand()) * 0.75;
    const a = rand() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -1.5 + rand() * 2.6;
    pos[i * 3 + 2] = Math.sin(a) * r;
    speed[i] = 0.05 + rand() * 0.12;
    wobble[i] = rand() * Math.PI * 2;
  }
  return { pos, speed, wobble };
}
const moteTexture = makeRadialSprite();

/* ---------- materials ---------- */
type Uniforms = Record<string, THREE.IUniform>;

/**
 * Veins + Fresnel rim on top of MeshStandardMaterial. Patching the stock shader keeps
 * three's PBR lighting (the scene's key/rim lights still land) instead of us hand-rolling
 * a lighting model in a raw ShaderMaterial.
 */
function makePetalMat(colors: { petal: string; throat: string; vein: string; edge: string }) {
  const uniforms: Uniforms = {
    uThroat: { value: new THREE.Color(colors.throat) },
    uVein: { value: new THREE.Color(colors.vein) },
    uEdge: { value: new THREE.Color(colors.edge) },
    uGlow: { value: 1 },
  };
  const mat = new THREE.MeshStandardMaterial({
    color: colors.petal,
    roughness: 0.62,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  mat.defines = { USE_UV: "" }; // makes three declare + fill vUv for us
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uThroat;
uniform vec3 uVein;
uniform vec3 uEdge;
uniform float uGlow;
${NOISE_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float mfWarp = mfNoise(vUv * 7.0) * 0.05;
        float mfD = abs(vUv.x - 0.5) + mfWarp;
        float mfMid = smoothstep(0.028, 0.0, mfD);
        float mfFan = fract(mfD * 12.0 - vUv.y * 4.5 + mfWarp * 3.0);
        float mfVein = clamp(mfMid + smoothstep(0.07, 0.0, abs(mfFan - 0.5))
          * smoothstep(0.05, 0.32, vUv.y)
          * smoothstep(0.015, 0.09, mfD) * 0.7, 0.0, 1.0);
        diffuseColor.rgb = mix(uThroat, diffuseColor.rgb, smoothstep(0.0, 0.55, vUv.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, uVein, mfVein * 0.5);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float mfFres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
        totalEmissiveRadiance += uEdge * (mfFres * 0.9 + mfVein * 0.06) * uGlow;`,
      );
  };
  return { mat, uniforms };
}

/** Club-shaped anther + breathing, both done in the vertex shader (no per-frame CPU work). */
function makeStamenMat(colors: { anther: string; filament: string }) {
  const uniforms: Uniforms = {
    uTime: { value: 0 },
    uGlow: { value: 1 },
    uFilament: { value: new THREE.Color(colors.filament) },
    uAnther: { value: new THREE.Color(colors.anther) },
  };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
attribute float aPhase;
varying float vSH;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vSH = clamp(position.y / ${STAMEN_SPAN.toFixed(4)}, 0.0, 1.0);
        transformed.xz *= 1.0 + smoothstep(0.62, 1.0, vSH) * 1.7;
        transformed.y *= 1.0 + (sin(uTime * 1.5 + aPhase) * 0.5 + 0.5) * 0.13;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uFilament;
uniform vec3 uAnther;
uniform float uGlow;
varying float vSH;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb = mix(uFilament, uAnther, smoothstep(0.6, 0.9, vSH));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uAnther * smoothstep(0.65, 1.0, vSH) * uGlow * 0.7;`,
      );
  };
  return { mat, uniforms };
}

function makeStemMat() {
  const uniforms: Uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ color: "#2f6b3a", roughness: 0.72 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nuniform float uTime;`)
      // ponytail: normals aren't recomputed for the swayed tube — invisible on a stem this
      // thin. Recompute in the shader if it ever reads as flat lighting.
      .replace("#include <begin_vertex>", `#include <begin_vertex>${STEM_SWAY_GLSL}`);
  };
  return { mat, uniforms };
}

export default function MoonflowerScene({ variants, phase, onOpenComplete }: SceneProps) {
  const palette = PALETTES[variants.petal] ?? PALETTES.moonlight;

  // useMemo is load-bearing: it owns the GPU resources disposed below.
  const petal = useMemo(() => makePetalMat(palette), [palette]);
  const stamen = useMemo(() => makeStamenMat(palette), [palette]);
  const stem = useMemo(() => makeStemMat(), []);
  const leafMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2f6b3a", roughness: 0.75, side: THREE.DoubleSide }),
    [],
  );
  const throatMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.throat, roughness: 0.6 }),
    [palette],
  );
  useEffect(() => {
    return () => {
      petal.mat.dispose();
      stamen.mat.dispose();
      stem.mat.dispose();
      leafMat.dispose();
      throatMat.dispose();
    };
  }, [petal, stamen, stem, leafMat, throatMat]);

  const motes = useMemo(() => buildMotes(), []);

  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leavesRef = useRef<THREE.Group>(null);
  const clusterRef = useRef<THREE.Group>(null);
  const stamenMeshRef = useRef<THREE.InstancedMesh>(null);
  const motesRef = useRef<THREE.Points>(null);
  const moteMatRef = useRef<THREE.PointsMaterial>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const petalRefs = useRef<(THREE.Group | null)[]>([]);

  const { t: tRef, done: completeRef } = useOpeningClock(phase);

  // Per-frame uniform writes go through a ref: the memos above own the materials and their
  // disposal, but the lint only accepts mutation through a *Ref (same shape as aurora).
  const uniformsRef = useRef<{ petal: Uniforms; stamen: Uniforms; stem: Uniforms } | null>(null);
  useEffect(() => {
    uniformsRef.current = { petal: petal.uniforms, stamen: stamen.uniforms, stem: stem.uniforms };
  }, [petal, stamen, stem]);

  useEffect(() => {
    const mesh = stamenMeshRef.current;
    if (!mesh) return;
    for (let i = 0; i < STAMEN_COUNT; i++) mesh.setMatrixAt(i, STAMENS.matrices[i]);
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const elapsed = state.clock.elapsedTime;
    if (phase === "opening") tRef.current += dt;
    const t = tRef.current;

    const u = uniformsRef.current;
    if (u) {
      u.stem.uTime.value = elapsed;
      u.stamen.uTime.value = elapsed;
    }

    // Petals: a closed bud while sealed, staggered outer→inner bloom on opening.
    const staticBloom = phase === "sealed" ? 0 : 1;
    let bloom = staticBloom;
    for (let i = 0; i < PETALS.length; i++) {
      const p = PETALS[i];
      const g = petalRefs.current[i];
      if (!g) continue;
      const pp =
        phase === "opening" ? easeOutCubic(clamp01((t - p.start) / BLOOM_DUR)) : staticBloom;
      g.rotation.x = p.closed + (p.open - p.closed) * pp;
      g.scale.setScalar(p.scale * (0.8 + 0.2 * pp));
    }
    if (phase === "opening") bloom = smooth(clamp01(t / OPEN_END));

    // Stamens stay tucked in the bud and rise as it opens.
    if (clusterRef.current) clusterRef.current.scale.setScalar(0.15 + 0.85 * bloom);

    if (phase === "opening" && t > OPEN_END && !completeRef.current) {
      completeRef.current = true;
      onOpenComplete?.();
    }

    // Head and leaves ride the stem's GPU sway.
    if (headRef.current) {
      const [dx, dz] = swayAt(STEM_TOP_Y, elapsed);
      headRef.current.position.set(dx, STEM_TOP_Y, dz);
      headRef.current.rotation.z = -dx * 1.5;
      headRef.current.rotation.x = dz * 1.5;
    }
    if (leavesRef.current) {
      const [dx, dz] = swayAt(LEAF_Y, elapsed);
      leavesRef.current.position.set(dx, LEAF_Y, dz);
    }

    if (spinRef.current) {
      const speed = phase === "preview" ? 0.22 : phase === "sealed" ? 0.06 : 0.1;
      spinRef.current.rotation.y += dt * speed;
    }

    // Interactive: the whole plant leans toward the pointer.
    if (tiltRef.current) {
      const k = Math.min(1, dt * 3);
      tiltRef.current.rotation.x = lerp(tiltRef.current.rotation.x, state.pointer.y * 0.1, k);
      tiltRef.current.rotation.z = lerp(tiltRef.current.rotation.z, -state.pointer.x * 0.1, k);
    }

    // Glow: an inviting pulse while sealed, steady once open.
    const glow = phase === "sealed" ? 0.55 + Math.sin(elapsed * 2.2) * 0.25 : 0.75;
    if (u) {
      u.petal.uGlow.value = glow;
      u.stamen.uGlow.value = glow;
    }
    if (glowRef.current) glowRef.current.intensity = glow;

    if (motesRef.current && moteMatRef.current) {
      const arr = motesRef.current.geometry.attributes.position;
      const rising = phase === "opening" || phase === "revealed" ? 1.4 : 0.5;
      for (let i = 0; i < MOTE_COUNT; i++) {
        let y = arr.getY(i) + motes.speed[i] * dt * rising;
        if (y > 1.5) y = -1.5;
        arr.setY(i, y);
        arr.setX(i, arr.getX(i) + Math.sin(elapsed * 0.8 + motes.wobble[i]) * dt * 0.03);
      }
      arr.needsUpdate = true;
      const target = phase === "sealed" ? 0.1 : phase === "preview" ? 0.45 : 0.8;
      moteMatRef.current.opacity += (target - moteMatRef.current.opacity) * Math.min(1, dt * 3);
    }
  });

  return (
    <>
      {/* Higher than the rose's camera on purpose: this flower opens flat-faced, so a
          near-horizontal view would hide the stamens and the vein pattern entirely. */}
      <PerspectiveCamera
        makeDefault
        position={[0, 1.45, 3.9]}
        fov={38}
        onUpdate={(c) => c.lookAt(0, -0.4, 0)}
      />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2.5]} intensity={1.15} color="#e8f0ff" />
      <pointLight position={[-2.5, 1, -2]} intensity={0.45} color={palette.light} />
      <pointLight ref={glowRef} position={[0.5, 0.3, 1.2]} intensity={0.75} color={palette.edge} />

      <group ref={tiltRef}>
        <group ref={spinRef}>
          <mesh geometry={stemGeo} material={stem.mat} />

          <group ref={leavesRef} position={[0, LEAF_Y, 0]}>
            <group rotation={[0.3, 0.4, -1.15]} scale={[0.42, 0.6, 0.42]}>
              <mesh geometry={petalGeo} material={leafMat} />
            </group>
            <group rotation={[-0.25, 2.6, 1.2]} scale={[0.36, 0.52, 0.36]}>
              <mesh geometry={petalGeo} material={leafMat} />
            </group>
          </group>

          <group ref={headRef} position={[0, STEM_TOP_Y, 0]}>
            <group scale={0.6}>
              {/* throat */}
              <mesh position={[0, 0.02, 0]}>
                <coneGeometry args={[0.11, 0.16, 16]} />
                <primitive object={throatMat} attach="material" />
              </mesh>

              {PETALS.map((p, i) => (
                <group key={i} rotation={[0, p.azimuth, 0]}>
                  <group
                    ref={(el) => {
                      petalRefs.current[i] = el;
                    }}
                    position={[0, p.y, p.radial]}
                    rotation={[p.closed, 0, 0]}
                    scale={p.scale}
                  >
                    <mesh geometry={petalGeo} material={petal.mat} />
                  </group>
                </group>
              ))}

              <group ref={clusterRef}>
                <instancedMesh
                  ref={stamenMeshRef}
                  args={[stamenGeo, stamen.mat, STAMEN_COUNT]}
                />
              </group>
            </group>
          </group>

          <points ref={motesRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[motes.pos, 3]} />
            </bufferGeometry>
            <pointsMaterial
              ref={moteMatRef}
              map={moteTexture}
              color={palette.mote}
              size={0.055}
              sizeAttenuation
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>
        </group>
      </group>
    </>
  );
}
