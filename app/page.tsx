import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: programs } = await supabase.from("courses").select("slug,title,tagline,cover_url,kind").eq("published", true).neq("kind", "live").order("position");
  return (
    <div className="pb-6 pt-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold md:text-4xl">Welcome</h1>
        <p className="mt-1 font-serif text-2xl md:text-3xl">Health begins with coherence.</p>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4">
          {["/images/pose-1.png", "/images/pose-2.png", "/images/pose-3.png"].map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`Vilma training pose ${i + 1}`} className="aspect-[4/5] w-full object-contain" />
          ))}
        </div>
        <p className="mt-10 font-serif text-2xl italic">When the mind, body, breath, and energy work as ONE.</p>
        <hr className="mt-10 border-line" />
      </section>

      <section className="mt-14 space-y-8">
        {(programs ?? []).map((p) => (
          <Link key={p.slug} href={`/programs/${p.slug}`}
            className="flex h-72 flex-col items-center justify-center rounded-xl bg-[#999] bg-cover bg-center px-6 text-center shadow-md transition hover:brightness-95"
            style={p.cover_url ? { backgroundImage: `url(${p.cover_url})` } : undefined}>
            <h2 className="font-serif text-5xl font-bold text-[#c9a227] [text-shadow:0_2px_4px_rgba(0,0,0,0.35)]">{p.title}</h2>
            <p className="mt-3 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">{p.tagline}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
