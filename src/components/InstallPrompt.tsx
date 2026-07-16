"use client";

import { useEffect, useState } from "react";
import { useLang } from "../i18n";

// Last calendar day we showed the popup (Date.toDateString), so it appears at
// most once a day until installed. See i18n.tsx's gift.lang for the key convention.
const LAST_SHOWN_KEY = "gift.pwa-shown";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __bip?: BIPEvent | null;
  }
}

// Install-to-home-screen nudge. Android/desktop Chromium get the real prompt
// (via the deferred beforeinstallprompt); iOS has no such API, so it gets manual
// Share → Add to Home Screen instructions. Shows at most once a day until installed.
export function InstallPrompt() {
  const { lang, t } = useLang();
  const [mode, setMode] = useState<"none" | "prompt" | "ios">("none");

  useEffect(() => {
    // Minimal SW registration — prerequisite for beforeinstallprompt (see sw.js).
    navigator.serviceWorker?.register("/sw.js").catch(() => {});

    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true; // iOS Safari's non-standard flag
    const today = new Date().toDateString();
    if (standalone || localStorage.getItem(LAST_SHOWN_KEY) === today) return;

    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua)); // iPadOS reports as Mac

    // beforeinstallprompt is captured pre-hydration by the inline script in the
    // layout (window.__bip); on repeat visits it may still arrive later, so we
    // also listen for the 'bip-ready' bridge event.
    const sync = () => {
      const next = window.__bip ? "prompt" : isIOS ? "ios" : "none";
      if (next !== "none") localStorage.setItem(LAST_SHOWN_KEY, today); // shown today
      setMode(next);
    };
    sync();
    const onInstalled = () => setMode("none");
    window.addEventListener("bip-ready", sync);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bip-ready", sync);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "none") return null;

  // Already stamped for today when it was shown, so this just hides it now;
  // refreshing past the popup and dismissing it are equivalent — back tomorrow.
  const dismiss = () => setMode("none");

  const install = async () => {
    const e = window.__bip;
    if (!e) return dismiss();
    await e.prompt();
    window.__bip = null; // a beforeinstallprompt event can only be used once
    setMode("none");
  };

  return (
    <div
      role="dialog"
      aria-label={t.install.title}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#17111c]/95 p-4 text-stone-200 shadow-2xl backdrop-blur sm:inset-x-0"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.install.dismiss}
        className="absolute end-2.5 top-2.5 rounded-full p-1 leading-none text-stone-500 transition hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        ✕
      </button>

      {mode === "prompt" ? (
        <>
          <p className="pe-6 font-semibold">{t.install.title}</p>
          <p className="mt-1 text-sm text-stone-400">{t.install.body}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={install}
              className="rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              {t.install.action}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-4 py-1.5 text-sm text-stone-300 transition hover:text-white"
            >
              {t.install.dismiss}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="pe-6 font-semibold">{t.install.iosTitle}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-400">
            <ShareIcon />
            <span>{t.install.iosBody}</span>
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            {t.install.iosDone}
          </button>
        </>
      )}
    </div>
  );
}

// The iOS Share glyph (box with an up arrow), so users can spot the button.
function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-stone-200"
    >
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}
