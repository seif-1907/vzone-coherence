import { createAdmin } from "@/lib/supabase/server";
import { createPromo, deletePromo, togglePromo } from "../actions";

export default async function Promos() {
  const { data: promos } = await createAdmin().from("promo_codes").select("*").order("created_at", { ascending: false });
  return (
    <>
      <h1 className="mb-8 text-3xl">Promo codes</h1>
      <ul className="mb-10 divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {(promos ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between px-5 py-3">
            <span><b className="font-mono">{p.code}</b> <span className="text-muted">{p.percent_off ? `${p.percent_off}% off` : `$${(p.amount_off_cents / 100).toFixed(2)} off`} · used {p.uses}{p.max_uses ? `/${p.max_uses}` : ""}{p.expires_at ? ` · expires ${new Date(p.expires_at).toLocaleDateString()}` : ""}</span></span>
            <span className="flex gap-4">
              <form action={togglePromo.bind(null, p.id, !p.active)}><button className="underline">{p.active ? "Deactivate" : "Activate"}</button></form>
              <form action={deletePromo.bind(null, p.id)}><button className="text-red-700 underline">Delete</button></form>
            </span>
          </li>
        ))}
        {!(promos ?? []).length && <li className="px-5 py-3 text-muted">No promo codes yet.</li>}
      </ul>
      <form action={createPromo} className="card grid gap-3 md:grid-cols-3">
        <h3 className="text-lg md:col-span-3">New promo code</h3>
        <input name="code" required placeholder="CODE" className="input font-mono uppercase" />
        <select name="kind" className="input"><option value="percent">Percent off</option><option value="amount">Amount off ($)</option></select>
        <input name="value" type="number" step="0.01" min="1" required placeholder="Value" className="input" />
        <input name="max_uses" type="number" min="1" placeholder="Max uses (optional)" className="input" />
        <input name="expires" type="date" className="input" />
        <button className="btn">Create</button>
      </form>
    </>
  );
}
