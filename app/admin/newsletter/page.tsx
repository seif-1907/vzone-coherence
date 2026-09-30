import { createAdmin } from "@/lib/supabase/server";
import { sendNewsletter } from "../actions";

export default async function Newsletter() {
  const { data: subs, count } = await createAdmin().from("newsletter_subscribers").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(200);
  const brevoOn = !!process.env.BREVO_API_KEY && !!process.env.BREVO_LIST_ID;
  return (
    <>
      <h1 className="mb-8 text-3xl">Newsletter</h1>
      {!brevoOn && <p className="mb-6 rounded-xl bg-amber-100 px-5 py-3 text-sm text-amber-900">Brevo isn't configured yet (BREVO_API_KEY and BREVO_LIST_ID). Sign-ups are still saved here.</p>}
      <form action={sendNewsletter} className="card mb-10 space-y-3">
        <h3 className="text-lg">Send an update to all {count ?? 0} subscribers</h3>
        <input name="subject" required placeholder="Subject" className="input" />
        <textarea name="body" required rows={8} placeholder="Write your message. Leave a blank line between paragraphs." className="input" />
        <button className="btn" disabled={!brevoOn}>Send now</button>
      </form>
      <h2 className="mb-3 text-2xl">Subscribers</h2>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {(subs ?? []).map((s) => <li key={s.email} className="flex justify-between px-5 py-2"><span>{s.email}</span><span className="text-muted">{new Date(s.created_at).toLocaleDateString()}{s.synced_to_brevo ? "" : " · not synced"}</span></li>)}
      </ul>
    </>
  );
}
