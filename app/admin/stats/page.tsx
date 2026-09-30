import { createAdmin } from "@/lib/supabase/server";
import { fmtDuration } from "@/lib/utils";

export default async function Stats() {
  const db = createAdmin();
  const [{ data: courses }, { data: stats }] = await Promise.all([
    db.from("courses").select("id,title").order("position"),
    db.from("lesson_stats").select("*"),
  ]);
  const { data: lessons } = await db.from("lessons").select("id,position").order("position");
  const pos = new Map((lessons ?? []).map((l) => [l.id, l.position]));
  return (
    <>
      <h1 className="mb-2 text-3xl">Statistics</h1>
      <p className="mb-8 text-muted">A "view" is one playback session of at least 5 seconds. Time watched only counts seconds actually played. Click a client for their individual breakdown.</p>
      {(courses ?? []).map((c) => {
        const rows = (stats ?? []).filter((s) => s.course_id === c.id).sort((a, b) => (pos.get(a.lesson_id) ?? 0) - (pos.get(b.lesson_id) ?? 0));
        if (!rows.length) return null;
        return (
          <section key={c.id} className="mb-10">
            <h2 className="mb-3 text-2xl">{c.title}</h2>
            <table className="w-full rounded-xl border border-line bg-white text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">Video</th><th className="p-3">Views</th><th className="p-3">Unique viewers</th><th className="p-3">Total time watched</th><th className="p-3">Avg per view</th></tr></thead>
              <tbody>{rows.map((r) => (<tr key={r.lesson_id} className="border-t border-line"><td className="p-3">{r.title}</td><td className="p-3">{r.view_count}</td><td className="p-3">{r.unique_viewers}</td><td className="p-3">{fmtDuration(r.total_seconds) || "0s"}</td><td className="p-3">{r.view_count ? fmtDuration(Math.round(r.total_seconds / r.view_count)) : "—"}</td></tr>))}</tbody>
            </table>
          </section>
        );
      })}
    </>
  );
}
