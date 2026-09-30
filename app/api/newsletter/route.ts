import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdmin } from "@/lib/supabase/server";
import { addContact } from "@/lib/brevo";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const synced = await addContact(email);
  await createAdmin().from("newsletter_subscribers").upsert({ email, synced_to_brevo: synced });
  return NextResponse.json({ ok: true });
}
