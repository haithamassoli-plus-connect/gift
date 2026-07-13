import { lazy } from "react";
import { catalog } from "./catalog";
import type { GiftDef } from "./types";

// One lazy() entry per gift keeps each scene in its own code-split chunk.
const scenes = {
  "eternal-rose": lazy(() => import("./eternal-rose/Scene")),
} as const;

export const registry: Record<string, GiftDef> = Object.fromEntries(
  Object.entries(scenes).map(([id, Scene]) => [id, { ...catalog[id], Scene }]),
);
