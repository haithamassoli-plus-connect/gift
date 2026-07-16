import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { catalog, pick } from "@/gifts/catalog";

export const alt = "A gift for you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts are read lazily on the first image request and cached — NEVER at module
// scope. Next imports this file to resolve the /g/[slug] page's og:image metadata,
// so a top-level read that throws crashes the *page* render (React #441 "Server
// Components render"), not just the image. Keeping the module import side-effect-free
// decouples the page from the OG card entirely. fileURLToPath keeps the path
// module-relative (Vercel traces fonts/ next to this file, not at cwd) while handing
// node:fs a string — some runtimes reject a Web URL instance here.
let fontsPromise: Promise<[Buffer, Buffer]> | null = null;
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(
      fileURLToPath(
        new URL("../../../../fonts/thmanyahsans-Bold.otf", import.meta.url),
      ),
    ),
    readFile(
      fileURLToPath(
        new URL("../../../../fonts/thmanyahsans-Regular.otf", import.meta.url),
      ),
    ),
  ]);
  return fontsPromise;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  let gift = null;
  try {
    gift = await convex.query(api.gifts.getGift, { slug });
  } catch {
    // Convex unreachable — fall through to the generic card, short cache below.
  }

  const lang = gift?.lang ?? "en";
  const ar = lang === "ar";
  const def = gift ? catalog[gift.giftType] : undefined;
  const title = def
    ? pick(lang, def.name, def.nameAr)
    : ar
      ? "هدية لك"
      : "A gift for you";
  const tagline = def
    ? pick(lang, def.tagline, def.taglineAr)
    : ar
      ? "اضغط لفتحها"
      : "Tap to unwrap it.";
  // Same wording as the convex/http.ts og:title, minus the emoji (emoji =
  // runtime twemoji CDN fetch inside satori, crash risk).
  const line: { t: string; hi?: boolean }[] = gift
    ? ar
      ? [
          { t: "هدية من" },
          { t: gift.senderName, hi: true },
          { t: "إلى" },
          { t: gift.recipientName, hi: true },
        ]
      : [
          { t: gift.senderName, hi: true },
          { t: "made" },
          { t: gift.recipientName, hi: true },
          { t: "a gift" },
        ]
    : [{ t: "Someone made you a gift" }];

  const [bold, regular] = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          // RTL for Arabic word order. Do NOT hand-roll bidi by NBSP-joining
          // words: Satori's Arabic shaper crashes (codePointAt of undefined) on
          // some NBSP-joined runs. `direction` lets it shape + order correctly.
          direction: ar ? "rtl" : "ltr",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          padding: 80,
          backgroundColor: "#100b14",
          color: "#e7e5e4",
          fontFamily: "Thmanyah Sans",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 14,
            fontSize: 40,
            fontWeight: 400,
            color: "#d6d3d1",
          }}
        >
          {line.map((c, i) => (
            <div
              key={i}
              style={{ display: "flex", color: c.hi ? "#fda4af" : undefined }}
            >
              {c.t}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 16 ? 72 : 96,
            fontWeight: 700,
            lineHeight: 1.15,
            textAlign: "center",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 400,
            color: "#a8a29e",
          }}
        >
          {tagline}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Thmanyah Sans", data: bold, weight: 700, style: "normal" },
        { name: "Thmanyah Sans", data: regular, weight: 400, style: "normal" },
      ],
      // Success keeps ImageResponse's immutable year-long default (gift fields
      // never change); a missing/failed gift must not be pinned that long.
      ...(gift ? {} : { headers: { "cache-control": "public, max-age=300" } }),
    },
  );
}
