import { Suspense, useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { GiftCanvas } from "../components/GiftCanvas";
import { registry } from "../gifts/registry";

type Phase = "sealed" | "opening" | "revealed";

export default function GiftView() {
  const { slug } = useParams();
  const gift = useQuery(api.gifts.getGift, slug ? { slug } : "skip");
  const markOpened = useMutation(api.gifts.markOpened);
  const [phase, setPhase] = useState<Phase>("sealed");

  if (gift === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-stone-400">
        Loading…
      </main>
    );
  }

  if (gift === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center text-stone-300">
        This gift link doesn't seem to exist.
      </main>
    );
  }

  const def = registry[gift.giftType];

  if (!def) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-stone-100">
          A gift for {gift.recipientName}
        </h1>
        <p className="whitespace-pre-wrap select-text text-lg leading-relaxed text-stone-200">
          {gift.message}
        </p>
        <p className="text-stone-400">— {gift.senderName}</p>
      </main>
    );
  }

  const unwrap = () => {
    setPhase("opening");
    if (slug) void markOpened({ slug });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="relative min-h-[60vh] flex-1">
        {/* R3F's wrapper uses height:100%, which needs a definite height — inset-0 gives it one. */}
        <div className="absolute inset-0">
        <GiftCanvas>
          <Suspense fallback={null}>
            <def.Scene
              variants={gift.variants}
              phase={phase}
              senderName={gift.senderName}
              recipientName={gift.recipientName}
              message={gift.message}
              onOpenComplete={() => setPhase("revealed")}
            />
          </Suspense>
        </GiftCanvas>
        </div>

        {phase === "sealed" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-transparent to-[#100b14]/80 p-6 text-center">
            <h1 className="font-serif text-4xl text-stone-100">
              A gift for {gift.recipientName}
            </h1>
            <p className="text-stone-400">from {gift.senderName}</p>
            <button
              type="button"
              onClick={unwrap}
              className="pointer-events-auto mt-6 min-h-[52px] rounded-full bg-rose-500 px-8 text-lg font-medium text-white transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Tap to unwrap
            </button>
          </div>
        )}
      </div>

      {phase === "revealed" && (
        <div className="mx-auto w-full max-w-md px-6 py-10">
          <p className="whitespace-pre-wrap select-text text-lg leading-relaxed text-stone-200">
            {gift.message}
          </p>
          <p className="mt-4 text-stone-400">— {gift.senderName}</p>
          <button
            type="button"
            onClick={() => setPhase("opening")}
            className="mt-8 min-h-[48px] rounded-full border border-white/15 px-6 text-sm text-stone-300 transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Replay
          </button>
        </div>
      )}
    </div>
  );
}
