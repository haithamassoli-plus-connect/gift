// Pure data — imported by both the client and Convex functions (no React here).

export interface VariantDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface GiftCatalogEntry {
  id: string;
  name: string;
  tagline: string;
  variants: VariantDef[];
}

export const NAME_MAX = 40;
export const MESSAGE_MAX = 280;

export const catalog: Record<string, GiftCatalogEntry> = {
  "eternal-rose": {
    id: "eternal-rose",
    name: "Eternal Rose",
    tagline: "A glass-domed rose that blooms just for them",
    variants: [
      {
        key: "petal",
        label: "Petal color",
        options: [
          { value: "red", label: "Crimson" },
          { value: "white", label: "Ivory" },
          { value: "midnight-gold", label: "Midnight Gold" },
        ],
      },
    ],
  },
};
