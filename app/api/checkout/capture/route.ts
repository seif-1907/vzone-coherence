import { NextResponse } from "next/server";
import { createClient, createAdmin } from "@/lib/supabase/server";
import { fulfilOrder } from "@/lib/pricing";
import { capturePayPalOrder } from "@/lib/paypal";
import { sendEmail, emailShell } from "@/lib/brevo";
import { isPrelaunch, launchDate } from "@/lib/launch";

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
    const { data: orderItems } = await db.from("order_items").select("courses(title,slug,launch_at)").eq("order_id", order.id);
    const presaleCourse = (orderItems ?? []).map((item) => item.courses as unknown as { title: string; slug: string; launch_at: string | null }).find((course) => isPrelaunch(course));
    const subject = presaleCourse ? `Your ${presaleCourse.title} pre-launch reservation is confirmed` : "Your V-Zone Coherence purchase";
    const body = presaleCourse
      ? `<p>Your place in <b>${presaleCourse.title}</b> is reserved.</p><p>The full program opens <b>${launchDate(presaleCourse.launch_at!)}</b>. We’ll send another email as soon as your full access is available.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/account">View my programs</a></p>`
      : `<p>Your payment was received and your classes are ready in your account.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/account">Go to my classes</a></p>`;
    await sendEmail({
      to: user.email!, subject, html: emailShell(presaleCourse ? "Your reservation is confirmed" : "Thank you", body),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
