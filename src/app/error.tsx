"use client";
import { useLang } from "@/i18n";
import NotFound from "@/components/NotFound";

// Last-resort boundary for every route. Any uncaught render error — a Convex hiccup,
// a scene that fails to mount, a metadata throw — lands here instead of Next's raw
// "This page couldn't load" screen, reusing the NotFound treatment so a dead link
// and a failed render read as the same branded dead-end. Renders inside Providers
// (it's the layout's child), so useLang is available; "Browse gifts" is the recovery.
export default function Error() {
  const { t } = useLang();
  return <NotFound heading={t.error.heading} copy={t.error.copy} />;
}
