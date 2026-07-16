import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://gift.assoli.site"),
  title: "Gift — a 3D gift you send as a link",
  description:
    "Make a beautiful animated 3D gift and send it as a link. Free, no accounts.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Gift" },
  openGraph: {
    title: "Someone made you a gift 🎁",
    description: "Tap to unwrap it.",
    type: "website",
    url: "/",
    siteName: "Gift",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "A glass-domed rose — a gift waiting to be unwrapped",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og-image.png"] },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = { themeColor: "#100b14" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* globals.css sizes the app through the #root chain, same as the old SPA mount node. */}
        <div id="root">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
