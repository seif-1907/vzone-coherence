import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdmin } from "@/lib/supabase/server";
import { addLesson, deleteCourse, deleteDocument, deleteLesson, moveLesson, toggleLessonPreview, updateCourse, updateDocument } from "../../actions";
import DocUploader from "@/components/DocUploader";
import { fmtDuration } from "@/lib/utils";

export default async function EditCourse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdmin();
  const { data: c } = await db.from("courses").select("*").eq("id", id).single();
  if (!c) notFound();
  const [{ data: lessons }, { data: docs }] = await Promise.all([
    db.from("lessons").select("*").eq("course_id", id).order("position").order("created_at"),
    db.from("documents").select("*").eq("course_id", id).order("created_at"),
  ]);

  return (
    <div className="space-y-12">
      <div><Link href="/admin/courses" className="text-sm text-muted underline">← Courses</Link><h1 className="mt-2 text-3xl">{c.title}</h1></div>

      <form action={updateCourse.bind(null, id)} className="card grid gap-3 md:grid-cols-2">
        <div><label className="label">Title</label><input name="title" defaultValue={c.title} className="input" required /></div>
        <div><label className="label">URL slug</label><input name="slug" defaultValue={c.slug} className="input" required /></div>
        <div className="md:col-span-2"><label className="label">Tagline</label><input name="tagline" defaultValue={c.tagline ?? ""} className="input" /></div>
        <div className="md:col-span-2"><label className="label">Description</label><textarea name="description" rows={5} defaultValue={c.description ?? ""} className="input" /></div>
        <div><label className="label">Type</label><select name="kind" defaultValue={c.kind} className="input"><option value="course">Course</option><option value="live">Live</option><option value="one_to_one">One-to-one</option></select></div>
        <div><label className="label">Price ({c.currency})</label><input name="price" type="number" step="0.01" min="0" defaultValue={c.price_cents / 100} className="input" /></div>
        <div><label className="label">Pre-launch price ({c.currency})</label><input name="presale_price" type="number" step="0.01" min="0" defaultValue={c.presale_price_cents != null ? c.presale_price_cents / 100 : ""} placeholder="Optional" className="input" /></div>
        <div><label className="label">Launch date and time</label><input name="launch_at" type="datetime-local" defaultValue={c.launch_at ? c.launch_at.slice(0, 16) : ""} className="input" /></div>
        <div><label className="label">Cover image URL</label><input name="cover_url" defaultValue={c.cover_url ?? ""} className="input" /></div>
        <div><label className="label">Menu order</label><input name="position" type="number" defaultValue={c.position} className="input" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={c.published} /> Published (visible on the site)</label>
        <div className="flex gap-3 md:col-span-2"><button className="btn">Save</button><Link href={`/programs/${c.slug}`} className="btn-outline" target="_blank">View page</Link></div>
      </form>

      <section>
        <h2 className="mb-4 text-2xl">Videos <span className="text-base text-muted">(clients watch them in this order)</span></h2>
        <ol className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
          {(lessons ?? []).map((l, i) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span>{i + 1}. {l.title} <span className="text-muted">{fmtDuration(l.duration_seconds)}</span></span>
              <span className="flex items-center gap-3">
                <form action={moveLesson.bind(null, id, l.id, -1)}><button className="underline" disabled={i === 0}>↑</button></form>
                <form action={moveLesson.bind(null, id, l.id, 1)}><button className="underline" disabled={i === (lessons!.length - 1)}>↓</button></form>
                <form action={toggleLessonPreview.bind(null, id, l.id, !l.is_preview)}><button className={`rounded-full px-3 py-0.5 text-xs ${l.is_preview ? "bg-sage text-white" : "border border-line"}`}>{l.is_preview ? "Preview on" : "Preview off"}</button></form>
                <Link href={`/watch/${l.id}`} className="underline" target="_blank">Watch</Link>
                <form action={deleteLesson.bind(null, id, l.id)}><button className="text-red-700 underline">Remove</button></form>
              </span>
            </li>
          ))}
          {!(lessons ?? []).length && <li className="px-5 py-3 text-muted">No videos yet.</li>}
        </ol>
        <form action={addLesson.bind(null, id)} className="card mt-4 grid gap-3">
          <h3 className="text-lg">Add a video</h3>
          <input name="title" required placeholder="Title" className="input" />
          <input name="vimeo" required placeholder="Vimeo link or ID (e.g. https://vimeo.com/123456789/abcdef1234)" className="input" />
          <textarea name="description" rows={2} placeholder="Description (optional)" className="input" />
          <input name="cover_url" placeholder="Cover image URL (optional)" className="input" />
          <label className="flex gap-2 text-sm"><input type="checkbox" name="is_preview" /> Free preview (anyone can watch)</label>
          <div><button className="btn">Add video</button></div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-2xl">Documents</h2>
        <ul className="mb-4 divide-y divide-line rounded-xl border border-line bg-white text-sm">
          {(docs ?? []).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <a className="underline" href={`/api/documents/${d.id}`} target="_blank">{d.title}</a>
              <span className="flex items-center gap-3">
                <form action={updateDocument.bind(null, id, d.id, { is_preview: !d.is_preview })}><button className={`rounded-full px-3 py-0.5 text-xs ${d.is_preview ? "bg-sage text-white" : "border border-line"}`}>{d.is_preview ? "Preview on" : "Preview off"}</button></form>
                <form action={updateDocument.bind(null, id, d.id, { allow_download: !d.allow_download })}><button className={`rounded-full px-3 py-0.5 text-xs ${d.allow_download ? "bg-sage text-white" : "border border-line"}`}>{d.allow_download ? "Download on" : "Download off"}</button></form>
                <form action={deleteDocument.bind(null, id, d.id)}><button className="text-red-700 underline">Remove</button></form>
              </span>
            </li>
          ))}
          {!(docs ?? []).length && <li className="px-5 py-3 text-muted">No documents yet.</li>}
        </ul>
        <DocUploader courseId={id} lessons={(lessons ?? []).map((l) => ({ id: l.id, title: l.title }))} />
      </section>

      <form action={deleteCourse.bind(null, id)}><button className="text-sm text-red-700 underline">Delete this course (removes videos, documents and client access)</button></form>
    </div>
  );
}
