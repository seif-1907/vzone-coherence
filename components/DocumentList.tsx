"use client";
import { useState } from "react";

type Doc = { id: string; title: string; mime_type: string | null; allow_download: boolean };

export default function DocumentList({ docs, canDownload }: { docs: Doc[]; canDownload: boolean }) {
  const [open, setOpen] = useState<Doc | null>(null);
  if (!docs.length) return null;
  return (
    <div>
      <h3 className="mb-3 text-lg">Documents</h3>
      <ul className="space-y-2 text-sm">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2">
            <span className="truncate">{d.title}</span>
            <span className="flex shrink-0 gap-3">
              <button className="underline" onClick={() => setOpen(d)}>Preview</button>
              {canDownload && d.allow_download && <a className="underline" href={`/api/documents/${d.id}?download=1`}>Download</a>}
            </span>
          </li>
        ))}
      </ul>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4" onClick={() => setOpen(null)}>
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-4 py-2 text-sm"><span>{open.title}</span><button onClick={() => setOpen(null)}>Close ✕</button></div>
            <iframe src={`/api/documents/${open.id}`} className="h-full w-full" title={open.title} />
          </div>
        </div>
      )}
    </div>
  );
}
