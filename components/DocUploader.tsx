"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createDocumentUpload, registerDocument } from "@/app/admin/actions";

export default function DocUploader({ courseId, lessons }: { courseId: string; lessons: { id: string; title: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const file = f.get("file") as File;
    if (!file?.size) return;
    setBusy(true); setErr(null);
    try {
      const { path, token } = await createDocumentUpload(courseId, file.name);
      const { error } = await createClient().storage.from("documents").uploadToSignedUrl(path, token, file);
      if (error) throw error;
      await registerDocument(courseId, {
        path, title: String(f.get("title") || file.name), mime: file.type, lessonId: String(f.get("lesson") || "") || null,
        isPreview: f.get("preview") === "on", allowDownload: f.get("download") === "on",
      });
      form.reset();
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h3 className="text-lg">Upload a document</h3>
      <input name="file" type="file" required className="input" />
      <input name="title" placeholder="Title (defaults to file name)" className="input" />
      <select name="lesson" className="input"><option value="">Whole course</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="preview" /> Free preview (visible without buying)</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="download" defaultChecked /> Allow clients to download</label>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
    </form>
  );
}
