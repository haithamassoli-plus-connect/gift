import { useState } from "react";
import { GiftPreviewCard } from "../components/GiftPreviewCard";
import { Logo } from "../components/Logo";
import { SiteCredit } from "../components/SiteCredit";
import { registry } from "../gifts/registry";
import { occasions, occasionsById, pick, type Occasion } from "../gifts/catalog";
import { useLang, LangToggle } from "../i18n";

export default function Home() {
  const { lang, t } = useLang();
  const [occasion, setOccasion] = useState<Occasion | null>(null);

  // Derived during render — no effect, no memo (React Compiler handles it).
  const gifts = Object.values(registry).filter(
    (def) => !occasion || occasionsById[def.id]?.includes(occasion),
  );
  const chips = [
    { key: null as Occasion | null, label: t.home.all },
    ...occasions.map((o) => ({ key: o.key as Occasion | null, label: pick(lang, o.label, o.labelAr) })),
  ];

  return (
    <main
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
      className="mx-auto max-w-4xl px-6 py-16"
    >
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <header className="mb-8 text-center">
        <Logo className="mx-auto h-16 w-16" />
        <h1 className="mt-4 font-serif text-6xl tracking-tight text-stone-100 sm:text-7xl">
          {t.home.title}
        </h1>
        <p className="mt-4 text-stone-400">{t.home.subtitle}</p>
        <SiteCredit className="mt-3" />
      </header>

      <div
        role="group"
        aria-label={t.home.filterLabel}
        className="mb-10 flex flex-wrap justify-center gap-2"
      >
        {chips.map((chip) => {
          const selected = occasion === chip.key;
          return (
            <button
              key={chip.key ?? "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => setOccasion(chip.key)}
              className={`rounded-full px-4 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                selected
                  ? "bg-rose-500 text-white"
                  : "border border-white/15 text-stone-300 hover:border-white/30"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 pb-16 sm:grid-cols-2">
        {gifts.map((def) => (
          <GiftPreviewCard key={def.id} def={def} lang={lang} />
        ))}
      </div>
    </main>
  );
}
