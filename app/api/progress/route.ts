import { NextResponse } from "next/server";
import { createClient, createAdmin } from "@/lib/supabase/server";

// Called every ~15s while a video plays. `seconds` is the *increment* of watch time since the last call.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { lessonId, sessionId, seconds, position, duration } = await req.json();

  // Only people allowed to watch this lesson (enrolled, in order, or preview) may record progress.
  const { data: allowed } = await supabase.rpc("can_watch", { p_lesson: lessonId });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdmin();
  const inc = Math.max(0, Math.min(Number(seconds) || 0, 60));

  // view session (view count + duration statistics)
  const { data: existing } = await db.from("view_sessions").select("id,seconds_watched").eq("id", sessionId).eq("user_id", user.id).maybeSingle();
  if (existing) {
    await db.from("view_sessions").update({ seconds_watched: existing.seconds_watched + inc, updated_at: new Date().toISOString() }).eq("id", sessionId);
  } else {
    await db.from("view_sessions").insert({ id: sessionId, user_id: user.id, lesson_id: lessonId, seconds_watched: inc });
  }

  // resumable progress + completion (90% of the video reached)
  const { data: prog } = await db.from("lesson_progress").select("*").eq("user_id", user.id).eq("lesson_id", lessonId).maybeSingle();
  const pos = Math.floor(Number(position) || 0);
  const completed = !!prog?.completed || (duration > 0 && pos >= duration * 0.9);
  await db.from("lesson_progress").upsert({
    user_id: user.id, lesson_id: lessonId,
    watched_seconds: (prog?.watched_seconds ?? 0) + inc,
    last_position_seconds: completed && duration && pos >= duration - 2 ? 0 : pos,
    completed, updated_at: new Date().toISOString(),
  });

  if (duration && !prog) await db.from("lessons").update({ duration_seconds: Math.round(duration) }).eq("id", lessonId).is("duration_seconds", null);
  return NextResponse.json({ ok: true, completed });
}
