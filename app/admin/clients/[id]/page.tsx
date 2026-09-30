import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdmin } from "@/lib/supabase/server";
import { enrollClient, removeClient, unenrollClient } from "../../actions";
import { fmtDuration, fmtDate } from "@/lib/utils";

export default async function Client({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdmin();
  const { data: p } = await db.from("profiles").select("*").eq("id", id).single();
  if (!p) notFound();
  const [{ data: enr }, { data: courses }, { data: stats }, { data: orders }] = await Promise.all([
    db.from("enrollments").select("course_id,source,created_at,courses(title)").eq("user_id", id),
    db.from("courses").select("id,title").order("position"),
    db.from("client_stats").select("*").eq("user_id", id).order("lesson_title"),
    db.from("orders").select("id,total_cents,status,created_at,promo_code").eq("user_id", id).order("created_at", { ascending: false }),
  ]);
  const have = new Set((enr ?? []).map((e) => e.course_id));
  return (
    <div className="space-y-10">
      <div><Link href="/admin/clients" className="text-sm text-muted underline">← Clients</Link><h1 className="mt-2 text-3xl">{p.full_name || p.email}</h1><p className="text-muted">{p.email} · joined {fmtDate(p.created_at)}</p></div>

      <section>
        <h2 className="mb-3 text-2xl">Access</h2>
        <ul className="mb-4 divide-y divide-line rounded-xl border border-line bg-white text-sm">
          {(enr ?? []).map((e) => (
            <li key={e.course_id} className="flex justify-between px-5 py-3"><span>{(e.courses as unknown as { title: string }).title} <span className="text-muted">({e.source})</span></span>
              <form action={unenrollClient.bind(null, id, e.course_id)}><button className="text-red-700 underline">Remove access</button></form></li>
          ))}
          {!(enr ?? []).length && <li className="px-5 py-3 text-muted">No access yet.</li>}
        </ul>
        <form action={enrollClient.bind(null, id)} className="flex gap-3">
          <select name="course_id" className="input !w-auto">{(courses ?? []).filter((c) => !have.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
          <button className="btn">Give access</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-2xl">Video activity</h2>
        <table className="w-full rounded-xl border border-line bg-white text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">Video</th><th className="p-3">Views</th><th className="p-3">Time watched</th></tr></thead>
          <tbody>{(stats ?? []).map((s) => (<tr key={s.lesson_id} className="border-t border-line"><td className="p-3">{s.lesson_title}</td><td className="p-3">{s.view_count}</td><td className="p-3">{fmtDuration(s.total_seconds) || "0s"}</td></tr>))}
            {!(stats ?? []).length && <tr><td className="p-3 text-muted" colSpan={3}>No viewing yet.</td></tr>}</tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 text-2xl">Orders</h2>
        <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
          {(orders ?? []).map((o) => <li key={o.id} className="flex justify-between px-5 py-3"><span>{fmtDate(o.created_at)} {o.promo_code && <span className="text-muted">· {o.promo_code}</span>}</span><span>${(o.total_cents / 100).toFixed(2)} · {o.status}</span></li>)}
          {!(orders ?? []).length && <li className="px-5 py-3 text-muted">No orders.</li>}
        </ul>
      </section>

      <form action={removeClient.bind(null, id)}><button className="text-sm text-red-700 underline">Delete this client and all their data</button></form>
    </div>
  );
}
