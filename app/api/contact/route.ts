import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdmin } from "@/lib/supabase/server";
import { sendEmail, emailShell } from "@/lib/brevo";

const schema = z.object({
  name: z.string().min(1), email: z.string().email(), phone: z.string().optional(),
  subject: z.string().min(1), message: z.string().min(1),
});
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Please fill in the required fields." }, { status: 400 });
  const d = parsed.data;
  await createAdmin().from("contact_messages").insert(d);
  await sendEmail({
    to: process.env.CONTACT_TO_EMAIL ?? "vzoneco@gmail.com", subject: `[Website] ${d.subject}`, replyTo: d.email,
    html: emailShell("New message", `<p><b>${esc(d.name)}</b> (${esc(d.email)}${d.phone ? ", " + esc(d.phone) : ""})</p><p>${esc(d.message).replace(/\n/g, "<br/>")}</p>`),
  });
  return NextResponse.json({ ok: true });
}
