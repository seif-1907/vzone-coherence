import { createAdmin } from "@/lib/supabase/server";
import { currentPrice } from "@/lib/launch";

export type PricedOrder = {
  items: { course_id: string; title: string; price_cents: number }[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  promo: { id: string; code: string } | null;
  error?: string;
};

/** Server-side source of truth for prices and promo codes. Never trust amounts from the browser. */
export async function priceOrder(userId: string, courseIds: string[], promoCode?: string | null): Promise<PricedOrder> {
  const db = createAdmin();
  const empty: PricedOrder = { items: [], subtotal: 0, discount: 0, total: 0, currency: "USD", promo: null };
  if (!courseIds.length) return { ...empty, error: "Your cart is empty." };

  const { data: courses } = await db.from("courses").select("id,title,price_cents,presale_price_cents,launch_at,currency,published").in("id", courseIds);
  const valid = (courses ?? []).filter((c) => c.published);
  if (!valid.length) return { ...empty, error: "These items are no longer available." };

  const { data: owned } = await db.from("enrollments").select("course_id").eq("user_id", userId).in("course_id", courseIds);
  const ownedIds = new Set((owned ?? []).map((o) => o.course_id));
  const items = valid.filter((c) => !ownedIds.has(c.id)).map((c) => ({ course_id: c.id, title: c.title, price_cents: currentPrice(c) }));
  if (!items.length) return { ...empty, error: "You already have access to everything in your cart." };

  const subtotal = items.reduce((a, b) => a + b.price_cents, 0);
  let discount = 0;
  let promo: PricedOrder["promo"] = null;
  if (promoCode?.trim()) {
    const { data: p } = await db.from("promo_codes").select("*").ilike("code", promoCode.trim()).maybeSingle();
    const expired = p?.expires_at && new Date(p.expires_at) < new Date();
    const used = p?.max_uses != null && p.uses >= p.max_uses;
    if (!p || !p.active || expired || used) return { ...empty, items, subtotal, total: subtotal, currency: valid[0].currency, error: "That promo code isn't valid." };
    discount = p.percent_off ? Math.round((subtotal * p.percent_off) / 100) : Math.min(p.amount_off_cents ?? 0, subtotal);
    promo = { id: p.id, code: p.code };
  }
  return { items, subtotal, discount, total: Math.max(0, subtotal - discount), currency: valid[0].currency, promo };
}

/** Mark order paid, grant access, count promo use. Idempotent. */
export async function fulfilOrder(orderId: string, captureId?: string) {
  const db = createAdmin();
  const { data: order } = await db.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.status === "paid") return order;
  const { data: items } = await db.from("order_items").select("course_id,courses(launch_at)").eq("order_id", orderId);
  await db.from("orders").update({ status: "paid", paid_at: new Date().toISOString(), paypal_capture_id: captureId ?? null }).eq("id", orderId);
  const now = new Date().toISOString();
  await db.from("enrollments").upsert(
    (items ?? []).map((i) => {
      const course = i.courses as unknown as { launch_at: string | null } | null;
      return {
        user_id: order.user_id, course_id: i.course_id, source: order.promo_code ? "promo" : "purchase", order_id: orderId,
        // Purchases made after a course has opened do not need a later launch email.
        launch_notified_at: course?.launch_at && course.launch_at <= now ? now : null,
      };
    }),
    { onConflict: "user_id,course_id", ignoreDuplicates: true }
  );
  if (order.promo_code) {
    const { data: p } = await db.from("promo_codes").select("id,uses").ilike("code", order.promo_code).maybeSingle();
    if (p) await db.from("promo_codes").update({ uses: p.uses + 1 }).eq("id", p.id);
  }
  return order;
}
