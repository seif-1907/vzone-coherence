"use client";
import { useState, useTransition } from "react";
import { addMeeting } from "@/app/account/actions";

export default function MeetingForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const startsAtISO = new Date(String(f.get("when"))).toISOString(); // browser-local time → UTC
    start(async () => {
      const r = await addMeeting({ title: String(f.get("title")), startsAtISO, duration: Number(f.get("duration")), notes: String(f.get("notes") ?? "") });
      setErr(r.error); if (!r.error) form.reset();
    });
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h3 className="text-lg">Add a meeting</h3>
      <div><label className="label">Title</label><input name="title" required className="input" placeholder="e.g. Session with Vilma" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Date & time</label><input name="when" type="datetime-local" required className="input" /></div>
        <div><label className="label">Minutes</label><input name="duration" type="number" defaultValue={60} min={15} step={15} className="input" /></div>
      </div>
      <div><label className="label">Notes</label><textarea name="notes" rows={2} className="input" /></div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Add to my schedule"}</button>
      <p className="text-xs text-muted">You'll get an email reminder one hour before, and can join the video room from your schedule.</p>
    </form>
  );
}
