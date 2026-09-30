"use client";
import { useState } from "react";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/contact", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
    setState(res.ok ? "ok" : "err");
    if (res.ok) (e.target as HTMLFormElement).reset();
  }
  return (
    <form onSubmit={submit} className="card space-y-4">
      <div><label className="label">Name *</label><input name="name" required className="input" /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className="label">Email *</label><input name="email" type="email" required className="input" /></div>
        <div><label className="label">Phone number</label><input name="phone" className="input" /></div>
      </div>
      <div><label className="label">Subject *</label><input name="subject" required className="input" /></div>
      <div><label className="label">Question *</label><textarea name="message" required rows={6} className="input" /></div>
      <button className="btn" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Submit"}</button>
      {state === "ok" && <p className="text-sm text-sage-dark">Thank you. We'll get back to you as soon as possible.</p>}
      {state === "err" && <p className="text-sm text-red-700">Something went wrong. Please try again or email vzoneco@gmail.com.</p>}
    </form>
  );
}
