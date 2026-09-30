"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const next = useSearchParams().get("next") || "/account";
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password"));
    const supabase = createClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
      else window.location.assign(next); // full reload so the new session cookie is sent to the server
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: String(f.get("name")) }, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setErr(error.message);
      else if (data.session) {
        if (f.get("newsletter")) fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
        window.location.assign(next);
      } else setInfo("Check your inbox to confirm your email, then sign in.");
    }
    setBusy(false);
  }
  async function reset() {
    const email = prompt("Your email address:");
    if (!email) return;
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/account` });
    setInfo("If that email exists, a reset link is on its way.");
  }
  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4">
      {mode === "signup" && <div><label className="label">Full name</label><input name="name" required className="input" /></div>}
      <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
      <div><label className="label">Password</label><input name="password" type="password" required minLength={8} className="input" /></div>
      {mode === "signup" && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="newsletter" defaultChecked /> Send me news and updates</label>}
      {err && <p className="text-sm text-red-700">{err}</p>}
      {info && <p className="text-sm text-sage-dark">{info}</p>}
      <button className="btn w-full" disabled={busy}>{mode === "login" ? "Sign in" : "Create account"}</button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (<>New here? <Link className="underline" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link> · <button type="button" onClick={reset} className="underline">Forgot password</button></>)
          : (<>Already have an account? <Link className="underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></>)}
      </p>
    </form>
  );
}
