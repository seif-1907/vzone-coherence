import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/server";
import { sendEmail, emailShell } from "@/lib/brevo";

// Runs every 15 minutes (see vercel.json). Sends due reminders + a gentle nudge to inactive learners.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createAdmin();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  let sent = 0;

  // 1) explicit reminders (lessons, live classes, meetings)
  const { data: due } = await db.from("reminders").select("*, profiles(email,full_name)").is("sent_at", null).lte("remind_at", new Date().toISOString()).limit(200);
  for (const r of due ?? []) {
    const profile = r.profiles as unknown as { email: string; full_name: string | null };
    let subject = "", body = "";
    if (r.kind === "lesson") {
      const { data: l } = await db.from("lessons").select("id,title,course_id").eq("id", r.ref_id).single();
      subject = `Time to practice: ${l?.title}`; body = `<p>You asked us to remind you about <b>${l?.title}</b>.</p><p><a href="${site}/watch/${l?.id}">Watch now</a></p>`;
    } else if (r.kind === "live") {
      const { data: c } = await db.from("live_classes").select("id,title,starts_at").eq("id", r.ref_id).single();
      subject = `Live class starting soon: ${c?.title}`; body = `<p><b>${c?.title}</b> starts at ${new Date(c!.starts_at).toUTCString()}.</p><p><a href="${site}/live/${c?.id}">Join the class</a></p>`;
    } else {
      const { data: m } = await db.from("meetings").select("id,title,starts_at").eq("id", r.ref_id).single();
      subject = `Meeting reminder: ${m?.title}`; body = `<p><b>${m?.title}</b> starts at ${new Date(m!.starts_at).toUTCString()}.</p><p><a href="${site}/live/m-${m?.id}">Open the room</a></p>`;
    }
    const ok = await sendEmail({ to: profile.email, toName: profile.full_name ?? undefined, subject, html: emailShell(subject, body) });
    if (ok || !process.env.BREVO_API_KEY) { await db.from("reminders").update({ sent_at: new Date().toISOString() }).eq("id", r.id); sent++; }
  }

  // 2) inactivity nudge: enrolled, next lesson unlocked, nothing watched for 5+ days, at most one nudge per 5 days
  const cutoff = new Date(Date.now() - 5 * 864e5).toISOString();
  const { data: enr } = await db.from("enrollments").select("user_id,course_id,created_at,courses(title,kind),profiles(email,full_name)").lte("created_at", cutoff).limit(500);
  for (const e of enr ?? []) {
    const course = e.courses as unknown as { title: string; kind: string };
    if (course.kind !== "course") continue;
    const { data: lessons } = await db.from("lessons").select("id,title").eq("course_id", e.course_id).order("position");
    const ids = (lessons ?? []).map((l) => l.id);
    if (!ids.length) continue;
    const { data: prog } = await db.from("lesson_progress").select("lesson_id,completed,updated_at").eq("user_id", e.user_id).in("lesson_id", ids);
    const done = new Set((prog ?? []).filter((p) => p.completed).map((p) => p.lesson_id));
    const next = (lessons ?? []).find((l) => !done.has(l.id));
    if (!next) continue;
    const last = Math.max(0, ...(prog ?? []).map((p) => +new Date(p.updated_at)));
    if (last && Date.now() - last < 5 * 864e5) continue;
    const { data: recent } = await db.from("reminders").select("id").eq("user_id", e.user_id).eq("kind", "lesson").eq("ref_id", next.id).gte("remind_at", cutoff).maybeSingle();
    if (recent) continue;
    const profile = e.profiles as unknown as { email: string; full_name: string | null };
    await sendEmail({ to: profile.email, subject: `Your next V-Zone class is waiting`, html: emailShell("Continue your practice", `<p>Next up in <b>${course.title}</b>: ${next.title}.</p><p><a href="${site}/watch/${next.id}">Continue</a></p>`) });
    await db.from("reminders").upsert({ user_id: e.user_id, kind: "lesson", ref_id: next.id, remind_at: new Date().toISOString(), sent_at: new Date().toISOString() }, { onConflict: "user_id,kind,ref_id" });
    sent++;
  }
  return NextResponse.json({ sent });
}
