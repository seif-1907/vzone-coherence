"use client";
import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch("/api/newsletter", { method: "POST", body: JSON.stringify({ email }), headers: { "content-type": "application/json" } });
    setState(res.ok ? "ok" : "err");
    if (res.ok) setEmail("");
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input className="input" type="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn" disabled={state === "busy"}>Join</button>
      </div>
      {state === "ok" && <p className="text-xs text-sage-dark">Thank you. You're on the list.</p>}
      {state === "err" && <p className="text-xs text-red-700">Please check your email and try again.</p>}
    </form>
  );
}
