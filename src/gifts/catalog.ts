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

const opts = (...pairs: [string, string][]) =>
  pairs.map(([value, label]) => ({ value, label }));

export const catalog: Record<string, GiftCatalogEntry> = {
  "eternal-rose": {
    id: "eternal-rose",
    name: "Eternal Rose",
    tagline: "A glass-domed rose that blooms just for them",
    variants: [
      {
        key: "petal",
        label: "Petal color",
        options: opts(["red", "Crimson"], ["white", "Ivory"], ["midnight-gold", "Midnight Gold"]),
      },
    ],
  },
  fireworks: {
    id: "fireworks",
    name: "Fireworks",
    tagline: "Bursts that spell your words across the night",
    variants: [
      {
        key: "palette",
        label: "Palette",
        options: opts(["festival", "Festival"], ["rose-gold", "Rose Gold"], ["neon", "Neon"]),
      },
    ],
  },
  "snow-globe": {
    id: "snow-globe",
    name: "Snow Globe",
    tagline: "A tiny world that swirls when they shake it",
    variants: [
      {
        key: "scene",
        label: "Scene",
        options: opts(["cabin", "Cabin"], ["forest", "Pine Forest"], ["heart", "Heart"]),
      },
      {
        key: "particles",
        label: "Particles",
        options: opts(["snow", "Snow"], ["stardust", "Stardust"]),
      },
    ],
  },
  "birthday-cake": {
    id: "birthday-cake",
    name: "Birthday Cake",
    tagline: "Light the candles, then blow them all out",
    variants: [
      {
        key: "frosting",
        label: "Frosting",
        options: opts(["chocolate", "Chocolate"], ["strawberry", "Strawberry"], ["vanilla", "Vanilla"]),
      },
      {
        key: "candles",
        label: "Candles",
        options: opts(
          ...Array.from({ length: 24 }, (_, i): [string, string] => [String(i + 1), String(i + 1)]),
        ),
      },
    ],
  },
  constellation: {
    id: "constellation",
    name: "Constellation",
    tagline: "A sky that draws itself, just for them",
    variants: [
      {
        key: "shape",
        label: "Shape",
        options: opts(["heart", "Heart"], ["star", "Star"], ["infinity", "Infinity"]),
      },
    ],
  },
  "butterfly-jar": {
    id: "butterfly-jar",
    name: "Butterfly Jar",
    tagline: "Unscrew the lid, set the glow free",
    variants: [
      {
        key: "glow",
        label: "Glow",
        options: opts(["aqua", "Aqua"], ["violet", "Violet"], ["amber", "Amber"]),
      },
    ],
  },
  "lantern-sky": {
    id: "lantern-sky",
    name: "Lantern Sky",
    tagline: "Lanterns rise, carrying your words",
    variants: [
      {
        key: "color",
        label: "Lantern color",
        options: opts(["amber", "Amber"], ["crimson", "Crimson"], ["jade", "Jade"]),
      },
    ],
  },
  "balloon-bunch": {
    id: "balloon-bunch",
    name: "Balloon Bunch",
    tagline: "A bouquet of balloons lifts your note",
    variants: [
      {
        key: "palette",
        label: "Palette",
        options: opts(["warm", "Warm"], ["pastel", "Pastel"], ["gold", "Gold"]),
      },
      {
        key: "count",
        label: "Balloons",
        options: opts(["7", "7"], ["12", "12"], ["20", "20"]),
      },
    ],
  },
  "message-bottle": {
    id: "message-bottle",
    name: "Message in a Bottle",
    tagline: "Washed ashore, corked, and meant for them",
    variants: [
      {
        key: "time",
        label: "Time of day",
        options: opts(["sunset", "Sunset"], ["night", "Night"], ["dawn", "Dawn"]),
      },
    ],
  },
  "music-box": {
    id: "music-box",
    name: "Music Box",
    tagline: "Wind it open for a tiny, twinkling waltz",
    variants: [
      {
        key: "figurine",
        label: "Figurine",
        options: opts(["ballerina", "Ballerina"], ["heart", "Heart"], ["moon", "Moon"]),
      },
    ],
  },
  "golden-locket": {
    id: "golden-locket",
    name: "Golden Locket",
    tagline: "Two names, kept close",
    variants: [
      {
        key: "metal",
        label: "Metal",
        options: opts(["gold", "Gold"], ["silver", "Silver"], ["rose-gold", "Rose Gold"]),
      },
    ],
  },
  aurora: {
    id: "aurora",
    name: "Aurora",
    tagline: "Northern lights with your words woven in",
    variants: [
      {
        key: "palette",
        label: "Palette",
        options: opts(["emerald", "Emerald"], ["magenta", "Magenta"], ["ice", "Ice"]),
      },
    ],
  },
};
