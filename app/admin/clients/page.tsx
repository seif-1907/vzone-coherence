import Link from "next/link";
import { createAdmin } from "@/lib/supabase/server";
import { addClient } from "../actions";

export default async function Clients() {
  const db = createAdmin();
  const [{ data: clients }, { data: courses }] = await Promise.all([
    db.from("profiles").select("id,email,full_name,created_at,enrollments(count)").eq("role", "client").order("created_at", { ascending: false }),
    db.from("courses").select("id,title").order("position"),
  ]);
  return (
    <>
      <h1 className="mb-8 text-3xl">Clients</h1>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {(clients ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between px-5 py-3">
            <Link href={`/admin/clients/${c.id}`} className="hover:underline"><b>{c.full_name || c.email}</b> <span className="text-muted">{c.full_name ? c.email : ""}</span></Link>
            <span className="text-muted">{(c.enrollments as unknown as { count: number }[])[0]?.count ?? 0} programs</span>
          </li>
        ))}
        {!(clients ?? []).length && <li className="px-5 py-3 text-muted">No clients yet.</li>}
      </ul>
      <form action={addClient} className="card mt-10 grid gap-3 md:grid-cols-2">
        <h3 className="text-lg md:col-span-2">Add a client</h3>
        <input name="name" placeholder="Full name" className="input" />
        <input name="email" type="email" required placeholder="Email" className="input" />
        <select name="course_id" className="input md:col-span-2"><option value="">No program yet</option>{(courses ?? []).map((c) => <option key={c.id} value={c.id}>Give access to {c.title}</option>)}</select>
        <div className="md:col-span-2"><button className="btn">Add and email invite</button></div>
      </form>
    </>
  );
}
