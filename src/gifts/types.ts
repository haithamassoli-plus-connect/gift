import type { FC } from "react";
import type { GiftCatalogEntry } from "./catalog";

export type GiftPhase = "preview" | "sealed" | "opening" | "revealed";

export interface SceneProps {
  variants: Record<string, string>;
  phase: GiftPhase;
  senderName: string;
  recipientName: string;
  message: string;
  onOpenComplete?: () => void;
}

export interface GiftDef extends GiftCatalogEntry {
  Scene: FC<SceneProps>;
}
