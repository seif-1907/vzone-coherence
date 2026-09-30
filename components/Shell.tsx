"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { slug: string; title: string };

// Public pages get the left program menu (as on the current site); app pages use the full width.
const PUBLIC = /^\/($|about|contact|programs|cart|login|signup)/;

function Label({ title }: { title: string }) {
  const parts = title.split(/(LIVE)/);
  return <>{parts.map((p, i) => (p === "LIVE" ? <span key={i} className="text-[#c8102e]">LIVE</span> : p))}</>;
}

export default function Shell({ programs, children }: { programs: Item[]; children: React.ReactNode }) {
  const path = usePathname();
  if (!PUBLIC.test(path)) return <main>{children}</main>;
  return (
    <div className="mx-auto flex max-w-6xl flex-col px-5 md:flex-row">
      <aside className="shrink-0 border-b border-line py-6 md:w-56 md:border-b-0 md:border-r md:py-10 md:pr-6">
        <nav className="flex flex-wrap gap-x-6 gap-y-3 font-serif text-lg font-bold text-sage-dark md:flex-col md:gap-y-5">
          {programs.map((p) => (
            <Link key={p.slug} href={`/programs/${p.slug}`} className="hover:text-ink"><Label title={p.title} /></Link>
          ))}
          {["Retreats", "Book"].map((t) => (
            <span key={t} className="text-gray-300">{t}<span className="block font-sans text-[11px] font-normal italic">(Coming Soon)</span></span>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 md:pl-10">{children}</main>
    </div>
  );
}
