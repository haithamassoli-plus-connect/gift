import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Sent() {
  const { statusKey } = useParams();
  const status = useQuery(
    api.gifts.getStatus,
    statusKey ? { statusKey } : "skip",
  );
  const [copied, setCopied] = useState(false);

  if (status === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-stone-400">
        Loading…
      </main>
    );
  }

  if (status === null) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-serif text-3xl text-stone-100">
          This page doesn't exist
        </p>
        <Link
          to="/"
          className="inline-flex min-h-[48px] items-center rounded-full bg-rose-500 px-6 text-white transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          Back home
        </Link>
      </main>
    );
  }

  const shareUrl = `${window.location.origin}/g/${status.slug}`;

  const copy = () => {
    void navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-16">
      <header className="text-center">
        <h1 className="font-serif text-4xl text-stone-100">
          Your gift is ready
        </h1>
        <p className="mt-2 text-stone-400">Share this link with them.</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-stone-200">
        {shareUrl}
      </div>

      <button
        type="button"
        onClick={copy}
        className="min-h-[48px] rounded-full bg-rose-500 px-6 font-medium text-white transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>

      <p className="text-center text-sm">
        {status.openedAt ? (
          <span className="text-emerald-400">Opened ✓</span>
        ) : (
          <span className="text-stone-500">Not opened yet</span>
        )}
      </p>

      <Link
        to="/"
        className="text-center text-sm text-stone-400 underline-offset-4 transition hover:text-stone-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        Make another gift
      </Link>
    </main>
  );
}
