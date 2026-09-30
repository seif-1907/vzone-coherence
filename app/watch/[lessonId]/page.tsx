import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import VideoPlayer from "@/components/VideoPlayer";
import DocumentList from "@/components/DocumentList";
import ReminderButton from "@/components/ReminderButton";
import { fmtDuration } from "@/lib/utils";

export default async function Watch({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: lesson } = await supabase.from("lessons").select("*, courses(id,slug,title,published)").eq("id", lessonId).single();
  if (!lesson) notFound();
  const course = lesson.courses as { id: string; slug: string; title: string };

  const [{ data: lessons }, { data: progress }, { data: canWatch }, { data: docs }, { data: reminder }] = await Promise.all([
    supabase.from("lessons").select("id,title,position,is_preview,duration_seconds,created_at").eq("course_id", course.id).order("position").order("created_at"),
    profile ? supabase.from("lesson_progress").select("lesson_id,completed,last_position_seconds").eq("user_id", profile.id) : Promise.resolve({ data: [] }),
    supabase.rpc("can_watch", { p_lesson: lessonId }),
    supabase.from("documents").select("id,title,mime_type,allow_download,lesson_id").eq("course_id", course.id),
    profile ? supabase.from("reminders").select("id").eq("user_id", profile.id).eq("kind", "lesson").eq("ref_id", lessonId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: enr } = profile ? await supabase.from("enrollments").select("course_id").eq("user_id", profile.id).eq("course_id", course.id) : { data: [] };
  const enrolled = (enr ?? []).length > 0 || profile?.role === "admin";

  const done = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id));
  const list = lessons ?? [];
  const idx = list.findIndex((l) => l.id === lessonId);
  const unlocked = (i: number) => enrolled ? (i === 0 || done.has(list[i - 1].id) || profile?.role === "admin" || list[i].is_preview) : list[i].is_preview;
  const next = list[idx + 1];
  const media = canWatch ? (await supabase.from("lesson_media").select("vimeo_id,vimeo_hash").eq("lesson_id", lessonId).maybeSingle()).data : null;
  const startAt = (progress ?? []).find((p) => p.lesson_id === lessonId)?.last_position_seconds ?? 0;
  const visibleDocs = (docs ?? []).filter((d) => !d.lesson_id || d.lesson_id === lessonId);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_340px]">
      <div>
        <Link href={`/programs/${course.slug}`} className="text-sm text-muted underline">← {course.title}</Link>
        <h1 className="mb-6 mt-2 text-3xl">{lesson.title}</h1>

        {canWatch && media ? (
          <>
            <VideoPlayer lessonId={lessonId} vimeoId={media.vimeo_id} vimeoHash={media.vimeo_hash} startAt={startAt} track={!!profile}
              nextHref={next && unlocked(idx + 1) ? `/watch/${next.id}` : null} />
            {lesson.description && <p className="mt-6 whitespace-pre-line text-muted">{lesson.description}</p>}
            {profile && enrolled && <div className="mt-6"><ReminderButton lessonId={lessonId} active={!!reminder} /></div>}
          </>
        ) : (
          <div className="card text-center">
            {!profile ? (<><p className="mb-4">Sign in to watch this class.</p><Link className="btn" href={`/login?next=/watch/${lessonId}`}>Sign in</Link></>)
              : !enrolled ? (<><p className="mb-4">This class is part of {course.title}.</p><Link className="btn" href={`/programs/${course.slug}`}>See the program</Link></>)
              : (<p>Finish the previous class first. Classes unlock in order so you build the practice step by step.</p>)}
          </div>
        )}
        <div className="mt-10"><DocumentList docs={visibleDocs} canDownload={!!profile && enrolled} /></div>
      </div>

      <aside>
        <h3 className="mb-3 text-lg">Classes</h3>
        <ol className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
          {list.map((l, i) => {
            const ok = unlocked(i);
            return (
              <li key={l.id} className={`flex items-center justify-between gap-2 px-4 py-3 ${l.id === lessonId ? "bg-sand" : ""}`}>
                {ok ? <Link href={`/watch/${l.id}`} className="hover:underline">{i + 1}. {l.title}</Link> : <span className="text-muted">🔒 {i + 1}. {l.title}</span>}
                <span className="shrink-0 text-xs text-muted">{done.has(l.id) ? "✓" : fmtDuration(l.duration_seconds)}</span>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
