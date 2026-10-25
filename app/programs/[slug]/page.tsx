import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import AddToCart from "@/components/AddToCart";
import { fmtDate, fmtDuration, money } from "@/lib/utils";
import { currentPrice, isPrelaunch, launchDate } from "@/lib/launch";

export default async function Program({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).eq("published", true).single();
  if (!course) notFound();
  const profile = await getProfile();

  const [{ data: lessons }, { data: docs }, { data: live }, { data: enr }] = await Promise.all([
    supabase.from("lessons").select("id,title,description,duration_seconds,is_preview,position,cover_url").eq("course_id", course.id).order("position"),
    supabase.from("documents").select("id,title,is_preview").eq("course_id", course.id).eq("is_preview", true),
    course.kind === "live"
      ? supabase.from("live_classes").select("id,title,starts_at,duration_minutes").gte("starts_at", new Date().toISOString()).order("starts_at").limit(10)
      : Promise.resolve({ data: [] as { id: string; title: string; starts_at: string; duration_minutes: number }[] }),
    profile ? supabase.from("enrollments").select("course_id").eq("user_id", profile.id).eq("course_id", course.id) : Promise.resolve({ data: [] }),
  ]);
  const enrolled = (enr ?? []).length > 0;
  const prelaunch = isPrelaunch(course);
  const price = currentPrice(course);
  const launchLabel = course.launch_at ? launchDate(course.launch_at) : null;
  if (course.kind === "live" && (live ?? []).length === 0 && !enrolled) {
    return (
      <div className="py-16">
        <div className="rounded-3xl bg-sand px-6 py-20 text-center shadow-md">
          <h1 className="font-serif text-5xl font-bold text-navy">✨ Coming Soon ✨</h1>
          <p className="mt-6 text-lg">Stay tuned for what's next — something exciting is on the way!</p>
        </div>
      </div>
    );
  }
  const firstLesson = lessons?.[0];

  return (
    <div className="py-10">
     <div className="relative rounded-3xl border border-line bg-white px-6 py-14 text-navy shadow-sm md:px-12">
      <div className="relative mx-auto max-w-3xl text-center">
        {prelaunch && <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#f5c95c]">Pre-launch access</p>}
        <h1 className="font-serif text-5xl font-bold">{course.title}</h1>
        {course.tagline && <p className="mt-3 text-lg font-medium text-muted">{course.tagline}</p>}
        {prelaunch && launchLabel && <p className="mt-6 font-serif text-xl text-[#f5c95c]">Full program opens {launchLabel}</p>}
      </div>
     </div>

      {course.description && <div className="mt-8 rounded-2xl bg-sand px-6 py-8 text-[15px] leading-7 shadow-sm md:px-10">{course.description.split(/\n{2,}/).map((para: string, i: number) => <p key={i} className={i ? "mt-4" : ""}>{para}</p>)}</div>}

      <div className="card mt-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          {prelaunch && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-sage-dark">Special pre-launch price</p>}
          <div className="font-serif text-3xl">{price > 0 ? money(price, course.currency) : course.kind === "one_to_one" ? "Apply to work with Vilma" : "Free"} {prelaunch && <span className="ml-2 text-lg text-muted line-through">{money(course.price_cents, course.currency)}</span>}</div>
          {prelaunch && launchLabel && <p className="mt-2 text-sm text-muted">Reserve your place now. We’ll send your confirmation and full-access notice to the email on your account.</p>}
        </div>
        {enrolled ? (
          prelaunch ? <Link className="btn" href="/account">Your place is reserved</Link> : <Link className="btn" href={course.kind === "live" ? "/account" : firstLesson ? `/watch/${firstLesson.id}` : "/account"}>Open my class</Link>
        ) : price > 0 ? (
          <AddToCart courseId={course.id} label={prelaunch ? "Reserve at pre-launch price" : "Add to cart"} />
        ) : course.kind === "one_to_one" ? (
          <Link className="btn" href="/contact">Apply for Coherence</Link>
        ) : (
          <AddToCart courseId={course.id} label="Get for free" buyNow />
        )}
      </div>

      {course.kind === "live" && (
        <section className="mt-12">
          <h2 className="mb-4 text-2xl">Upcoming live classes</h2>
          {(live ?? []).length === 0 ? <p className="text-muted">No classes scheduled yet. Join the newsletter to hear first.</p> : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {live!.map((c) => (<li key={c.id} className="flex justify-between px-5 py-3 text-sm"><span>{c.title}</span><span className="text-muted">{fmtDate(c.starts_at)} · {c.duration_minutes} min</span></li>))}
            </ul>
          )}
        </section>
      )}

      {(lessons ?? []).length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 className="text-2xl">{prelaunch ? "A first look inside" : "What’s inside"}</h2>{prelaunch && launchLabel && <p className="text-sm text-muted">The full program opens {launchLabel}.</p>}</div>
          <ol className="grid gap-4 md:grid-cols-2">
            {lessons!.map((l, i) => (
              <li key={l.id} className="overflow-hidden rounded-xl border border-line bg-white">
                <div className="relative aspect-video bg-sand bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(20,20,20,.18), rgba(20,20,20,.48)), url(${l.cover_url || course.cover_url || "/images/v-zone-start-cover.png"})` }}>
                  {prelaunch && !(i === 0 && l.is_preview) && <span className="absolute inset-0 flex items-center justify-center bg-navy/55 text-center text-sm font-medium text-white">🔒<br />Coming {launchLabel ?? "soon"}</span>}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span><span className="mr-2 text-muted">{i + 1}.</span>{l.title}</span>
                  <span className="shrink-0 text-xs text-muted">{fmtDuration(l.duration_seconds)}</span>
                </div>
                {prelaunch && i === 0 && l.is_preview && <div className="border-t border-line px-4 py-3"><Link href={`/watch/${l.id}`} className="btn-outline px-4 py-2 text-xs">Watch welcome video</Link></div>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {(docs ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-2xl">Sample documents</h2>
          <ul className="space-y-2 text-sm">
            {docs!.map((d) => (<li key={d.id}><a className="underline" href={`/api/documents/${d.id}`} target="_blank">{d.title}</a></li>))}
          </ul>
        </section>
      )}
    </div>
  );
}
