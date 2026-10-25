"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "./Cart";
import { money } from "@/lib/utils";
import { currentPrice, isPrelaunch } from "@/lib/launch";

type C = { id: string; title: string; price_cents: number; presale_price_cents: number | null; launch_at: string | null; currency: string };

export default function CartView() {
  const { ids, remove, clear } = useCart();
  const router = useRouter();
  const [courses, setCourses] = useState<C[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ subtotal: number; discount: number; total: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);
  useEffect(() => {
    if (!ids.length) { setCourses([]); return; }
    createClient().from("courses").select("id,title,price_cents,presale_price_cents,launch_at,currency").in("id", ids).eq("published", true).then(({ data }) => setCourses((data as C[]) ?? []));
  }, [ids]);

  const subtotal = courses.reduce((a, c) => a + currentPrice(c), 0);
  const currency = courses[0]?.currency ?? "USD";
  const total = totals?.total ?? subtotal;

  async function applyPromo() {
    setMsg(null);
    const res = await fetch("/api/promo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseIds: ids, code }) });
    const j = await res.json();
    if (j.error) { setApplied(null); setTotals(null); setMsg(j.error); } else { setApplied(code.trim()); setTotals(j); setMsg(`Code applied. You save ${money(j.discount, currency)}.`); }
  }

  async function createOrder() {
    const res = await fetch("/api/checkout/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseIds: ids, promo: applied }) });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error); throw new Error(j.error); }
    return j.paypalOrderId as string;
  }
  async function onApprove(data: { orderID: string }) {
    const res = await fetch("/api/checkout/capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paypalOrderId: data.orderID }) });
    if (!res.ok) { setMsg((await res.json()).error); return; }
    clear(); router.push("/account?purchased=1");
  }
  async function claimFree() {
    setBusy(true);
    const res = await fetch("/api/checkout/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseIds: ids, promo: applied }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(j.error);
    clear(); router.push("/account?purchased=1");
  }

  if (!ids.length) return <div className="card text-center"><p className="text-muted">Your cart is empty.</p><Link href="/" className="btn mt-5">Browse programs</Link></div>;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">
        {courses.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-5 py-4">
            <div><div className="font-serif text-lg">{c.title}</div>{isPrelaunch(c) && <div className="text-xs text-sage-dark">Pre-launch price</div>}<button onClick={() => remove(c.id)} className="text-xs text-muted underline">Remove</button></div>
            <div>{money(currentPrice(c), c.currency)}</div>
          </li>
        ))}
      </ul>

      <aside className="card space-y-4 self-start">
        <div className="flex gap-2">
          <input className="input" placeholder="Promo code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn-outline" onClick={applyPromo} disabled={!code.trim()}>Apply</button>
        </div>
        {msg && <p className="text-xs text-muted">{msg}</p>}
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal, currency)}</dd></div>
          {totals && totals.discount > 0 && <div className="flex justify-between text-sage-dark"><dt>Promo</dt><dd>−{money(totals.discount, currency)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 font-serif text-xl"><dt>Total</dt><dd>{money(total, currency)}</dd></div>
        </dl>
        {signedIn === false ? (
          <Link href="/login?next=/cart" className="btn w-full">Sign in to check out</Link>
        ) : total === 0 ? (
          <button className="btn w-full" onClick={claimFree} disabled={busy}>Get access</button>
        ) : (
          <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency, intent: "capture" }}>
            {/* key forces a fresh order when the promo changes */}
            <PayPalButtons key={applied ?? "none"} style={{ layout: "vertical", shape: "pill", color: "black" }} createOrder={createOrder} onApprove={onApprove} onError={() => setMsg("PayPal error. Please try again.")} />
          </PayPalScriptProvider>
        )}
      </aside>
    </div>
  );
}
