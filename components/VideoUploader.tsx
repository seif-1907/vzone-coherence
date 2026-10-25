"use client";
import { useState } from "react";
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { createVideoUpload, registerVideo } from "@/app/admin/actions";

const MAX_SIZE = 500 * 1024 * 1024;

function storageEndpoint() {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  return `${url.protocol}//${url.hostname.replace(".supabase.co", ".storage.supabase.co")}/storage/v1/upload/resumable`;
}

export default function VideoUploader({ courseId }: { courseId: string }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get("file") as File;
    if (!file?.size) return;
    if (!file.type.startsWith("video/")) return setErr("Choose a video file (MP4, WebM, or MOV).");
    if (file.size > MAX_SIZE) return setErr("Videos must be 500 MB or smaller.");

    setBusy(true); setErr(null); setProgress(0);
    try {
      const { path, token } = await createVideoUpload(courseId, file.name);
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: storageEndpoint(), chunkSize: 6 * 1024 * 1024, uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          headers: { "x-signature": token },
          metadata: { bucketName: "videos", objectName: path, contentType: file.type, cacheControl: "3600" },
          onError: reject,
          onProgress: (uploaded, total) => setProgress(Math.round((uploaded / total) * 100)),
          onSuccess: () => resolve(),
        });
        upload.findPreviousUploads().then((previous) => {
          if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
          upload.start();
        }).catch(reject);
      });
      await registerVideo(courseId, {
        path, title: String(f.get("title") || file.name), description: String(f.get("description") || ""), mime: file.type,
        isPreview: f.get("is_preview") === "on", coverUrl: String(f.get("cover_url") || ""),
      });
      form.reset(); setProgress(null);
    } catch (x) { setErr((x as Error).message || "Upload failed. Please try again."); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card mt-4 grid gap-3">
      <h3 className="text-lg">Upload a video</h3>
      <input name="file" type="file" accept="video/mp4,video/webm,video/quicktime" required className="input" />
      <input name="title" required placeholder="Video title" className="input" />
      <textarea name="description" rows={5} placeholder="Description shown below the video" className="input" />
      <input name="cover_url" placeholder="Thumbnail image URL (optional—uses the program cover by default)" className="input" />
      <label className="flex gap-2 text-sm"><input type="checkbox" name="is_preview" /> Free preview (anyone can watch)</label>
      {progress != null && <p className="text-sm text-muted">Uploading… {progress}%</p>}
      {err && <p className="text-sm text-red-700">{err}</p>}
      <div><button className="btn" disabled={busy}>{busy ? "Uploading…" : "Upload video"}</button></div>
    </form>
  );
}
