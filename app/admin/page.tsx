import { createAdmin } from "@/lib/supabase/server";
import { money } from "@/lib/utils";

export default async function Overview() {
  const db = createAdmin();
  const count = async (t: string) => (await db.from(t).select("*", { count: "exact", head: true })).count ?? 0;
  const [clients, courses, subs, orders, msgs] = await Promise.all([
    (await db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client")).count ?? 0,
    count("courses"), count("newsletter_subscribers"),
    db.from("orders").select("total_cents").eq("status", "paid"), db.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(5),
  ]);
  const revenue = (orders.data ?? []).reduce((a, o) => a + o.total_cents, 0);
  const stat = (label: string, v: string | number) => <div className="card"><div className="text-xs uppercase tracking-wider text-muted">{label}</div><div className="mt-1 font-serif text-3xl">{v}</div></div>;
  return (
    <>
      <h1 className="mb-8 text-3xl">Overview</h1>
      <div className="grid gap-4 md:grid-cols-4">{stat("Clients", clients)}{stat("Programs", courses)}{stat("Newsletter", subs)}{stat("Revenue", money(revenue))}</div>
      <h2 className="mb-3 mt-12 text-2xl">Latest messages</h2>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {(msgs.data ?? []).map((m) => (<li key={m.id} className="px-5 py-3"><b>{m.subject}</b> <span className="text-muted">from {m.name} ({m.email})</span><p className="mt-1 text-muted">{m.message}</p></li>))}
        {!(msgs.data ?? []).length && <li className="px-5 py-3 text-muted">No messages yet.</li>}
      </ul>
    </>
  );
}
