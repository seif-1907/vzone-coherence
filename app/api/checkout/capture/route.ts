import { NextResponse } from "next/server";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { fulfilOrder } from "@/lib/pricing";
import { capturePayPalOrder } from "@/lib/paypal";
import { sendEmail, emailShell } from "@/lib/brevo";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { paypalOrderId } = await req.json();

  const db = createAdmin();
  const { data: order } = await db.from("orders").select("*").eq("paypal_order_id", paypalOrderId).eq("user_id", user.id).single();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ ok: true });

  try {
    const cap = await capturePayPalOrder(paypalOrderId);
    const paidCents = Math.round(parseFloat(cap.amount ?? "0") * 100);
    if (cap.status !== "COMPLETED" || paidCents < order.total_cents || cap.currency !== order.currency) {
      await db.from("orders").update({ status: "failed" }).eq("id", order.id);
      return NextResponse.json({ error: "Payment was not completed." }, { status: 402 });
    }
    await fulfilOrder(order.id, cap.captureId);
    await sendEmail({
      to: user.email!, subject: "Your V-Zone Coherence purchase",
      html: emailShell("Thank you", `<p>Your payment was received and your classes are ready in your account.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/account">Go to my classes</a></p>`),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
