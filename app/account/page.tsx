import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My classes" };

export default async function Account({ searchParams }: { searchParams: Promise<{ purchased?: string }> }) {
  const profile = await requireUser("/account");
  const { purchased } = await searchParams;
  const supabase = await createClient();

  const { data: enrollments } = await supabase.from("enrollments").select("course_id, courses(id,slug,title,tagline,kind)").eq("user_id", profile.id).order("created_at", { ascending: false });
  const courseIds = (enrollments ?? []).map((e) => e.course_id);
  const [{ data: lessons }, { data: progress }, { data: live }] = await Promise.all([
    courseIds.length ? supabase.from("lessons").select("id,course_id,position,created_at").in("course_id", courseIds).order("position").order("created_at") : Promise.resolve({ data: [] }),
    supabase.from("lesson_progress").select("lesson_id,completed").eq("user_id", profile.id),
    supabase.from("live_classes").select("id,title,starts_at,duration_minutes").gte("starts_at", new Date(Date.now() - 36e5).toISOString()).order("starts_at").limit(5),
  ]);
  const done = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id));

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      {purchased && <div className="mb-8 rounded-xl bg-sage/15 px-5 py-4 text-sage-dark">Thank you! Your classes are ready below.</div>}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-4xl">Hello{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1><p className="text-muted">{profile.email}</p></div>
        <div className="flex gap-3">
          <Link href="/account/schedule" className="btn-outline">My schedule</Link>
          <form action="/auth/signout" method="post"><button className="btn-outline">Sign out</button></form>
        </div>
      </div>

      <h2 className="mb-4 text-2xl">My classes</h2>
      {(enrollments ?? []).length === 0 ? (
        <div className="card text-center"><p className="text-muted">You haven't purchased any classes yet.</p><Link href="/" className="btn mt-5">Browse programs</Link></div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {enrollments!.map((e) => {
            const c = e.courses as unknown as { id: string; slug: string; title: string; tagline: string | null; kind: string };
            const ls = (lessons ?? []).filter((l) => l.course_id === c.id);
            const n = ls.filter((l) => done.has(l.id)).length;
            const next = ls.find((l) => !done.has(l.id)) ?? ls[0];
            return (
              <article key={c.id} className="card">
                <h3 className="text-2xl">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">{c.tagline}</p>
                {ls.length > 0 && (<div className="mt-4"><div className="h-1.5 rounded-full bg-sand"><div className="h-1.5 rounded-full bg-sage" style={{ width: `${(n / ls.length) * 100}%` }} /></div><p className="mt-1 text-xs text-muted">{n} of {ls.length} classes completed</p></div>)}
                <div className="mt-5">{next ? <Link className="btn" href={`/watch/${next.id}`}>{n ? "Continue" : "Start"}</Link> : <span className="text-sm text-muted">{c.kind === "live" ? "See live classes below" : "Content coming soon"}</span>}</div>
              </article>
            );
          })}
        </div>
      )}

      <h2 className="mb-4 mt-14 text-2xl">Upcoming live classes</h2>
      {(live ?? []).length === 0 ? <p className="text-muted">Nothing scheduled right now.</p> : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {live!.map((c) => (<li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{c.title}<span className="ml-3 text-muted">{fmtDate(c.starts_at)}</span></span><Link href={`/live/${c.id}`} className="underline">Join room</Link></li>))}
        </ul>
      )}
    </div>
  );
}
