import { NextResponse } from "next/server";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { priceOrder, fulfilOrder } from "@/lib/pricing";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { courseIds, promo } = await req.json();

  const priced = await priceOrder(user.id, courseIds ?? [], promo);
  if (priced.error) return NextResponse.json({ error: priced.error }, { status: 400 });

  const db = createAdmin();
  const { data: order, error } = await db.from("orders").insert({
    user_id: user.id, currency: priced.currency, subtotal_cents: priced.subtotal,
    discount_cents: priced.discount, total_cents: priced.total, promo_code: priced.promo?.code ?? null,
  }).select("id").single();
  if (error || !order) return NextResponse.json({ error: "Could not create order." }, { status: 500 });
  await db.from("order_items").insert(priced.items.map((i) => ({ order_id: order.id, course_id: i.course_id, price_cents: i.price_cents })));

  // 100% discount or free items: no payment needed.
  if (priced.total === 0) {
    await fulfilOrder(order.id);
    return NextResponse.json({ free: true, orderId: order.id });
  }

  try {
    const pp = await createPayPalOrder(priced.total, priced.currency, order.id, priced.items.map((i) => i.title).join(", "));
    await db.from("orders").update({ paypal_order_id: pp.id }).eq("id", order.id);
    return NextResponse.json({ paypalOrderId: pp.id, orderId: order.id });
  } catch (e) {
    await db.from("orders").update({ status: "failed" }).eq("id", order.id);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
