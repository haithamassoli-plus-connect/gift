import { Link } from "react-router";
import { catalog } from "../gifts/catalog";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="font-serif text-6xl tracking-tight text-stone-100">Gift</h1>
        <p className="mt-3 text-stone-400">
          Beautiful 3D gifts you send as a link.
        </p>
      </header>

      <ul className="flex flex-col gap-4">
        {Object.values(catalog).map((gift) => (
          <li key={gift.id}>
            <Link
              to={`/create/${gift.id}`}
              className="block rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-rose-400/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <h2 className="font-serif text-2xl text-stone-100">{gift.name}</h2>
              <p className="mt-1 text-sm text-stone-400">{gift.tagline}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
