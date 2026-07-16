"use client";

import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { LangProvider } from "@/i18n";
import { SiteCredit } from "@/components/SiteCredit";
import { InstallPrompt } from "@/components/InstallPrompt";
import Loading from "@/components/Loading";

const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Never fires — the "store" is a constant: false on the server, true on the client.
const emptySubscribe = () => () => {};

export function Providers({ children }: { children: ReactNode }) {
  // ponytail: client-only shell — server HTML is the empty static shell, the
  // app renders after hydration, exactly like the Vite SPA. Per-gift OG tags
  // stay on the Convex crawler rewrite. Removing this gate means making i18n's
  // initialLang and Sent's window.location.origin SSR-safe first.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return null;

  return (
    <ConvexProvider client={client}>
      <LangProvider>
        <Suspense fallback={<Loading />}>{children}</Suspense>
        <footer className="py-8 text-center">
          <SiteCredit />
        </footer>
        <InstallPrompt />
      </LangProvider>
    </ConvexProvider>
  );
}
