import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { priceOrder } from "@/lib/pricing";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { courseIds, code } = await req.json();
  const priced = await priceOrder(user?.id ?? "00000000-0000-0000-0000-000000000000", courseIds ?? [], code);
  return NextResponse.json({ subtotal: priced.subtotal, discount: priced.discount, total: priced.total, currency: priced.currency, error: priced.error ?? null });
}
