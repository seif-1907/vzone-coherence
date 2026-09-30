import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import AddToCart from "@/components/AddToCart";
import { fmtDate, fmtDuration, money } from "@/lib/utils";

export default async function Program({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).eq("published", true).single();
  if (!course) notFound();
  const profile = await getProfile();

  const [{ data: lessons }, { data: docs }, { data: live }, { data: enr }] = await Promise.all([
    supabase.from("lessons").select("id,title,description,duration_seconds,is_preview,position").eq("course_id", course.id).order("position"),
    supabase.from("documents").select("id,title,is_preview").eq("course_id", course.id).eq("is_preview", true),
    course.kind === "live"
      ? supabase.from("live_classes").select("id,title,starts_at,duration_minutes").gte("starts_at", new Date().toISOString()).order("starts_at").limit(10)
      : Promise.resolve({ data: [] as { id: string; title: string; starts_at: string; duration_minutes: number }[] }),
    profile ? supabase.from("enrollments").select("course_id").eq("user_id", profile.id).eq("course_id", course.id) : Promise.resolve({ data: [] }),
  ]);
  const enrolled = (enr ?? []).length > 0;
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
     <div className="rounded-3xl bg-sand px-6 py-10 shadow-md md:px-12">
      <h1 className="text-center font-serif text-5xl font-bold text-navy">{course.title}</h1>
      {course.tagline && <p className="mt-3 text-center text-lg font-medium text-ink/80">{course.tagline}</p>}
      {course.description && <div className="mt-8 space-y-4 text-[15px] leading-7">{course.description.split(/\n{2,}/).map((para: string, i: number) => <p key={i}>{para}</p>)}</div>}
     </div>

      <div className="card mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="font-serif text-3xl">{course.price_cents > 0 ? money(course.price_cents, course.currency) : course.kind === "one_to_one" ? "Apply to work with Vilma" : "Free"}</div>
        {enrolled ? (
          <Link className="btn" href={course.kind === "live" ? "/account" : firstLesson ? `/watch/${firstLesson.id}` : "/account"}>Open my class</Link>
        ) : course.price_cents > 0 ? (
          <AddToCart courseId={course.id} label="Add to cart" />
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
          <h2 className="mb-4 text-2xl">What's inside</h2>
          <ol className="divide-y divide-line rounded-xl border border-line bg-white">
            {lessons!.map((l, i) => (
              <li key={l.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span><span className="mr-3 text-muted">{i + 1}.</span>{l.title}</span>
                <span className="flex items-center gap-3 text-muted">
                  {fmtDuration(l.duration_seconds)}
                  {l.is_preview && <Link href={`/watch/${l.id}`} className="rounded-full bg-sage px-3 py-0.5 text-xs text-white">Free preview</Link>}
                </span>
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
