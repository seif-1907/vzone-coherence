const API = "https://api.brevo.com/v3";
const headers = () => ({ "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" });
const sender = () => ({ email: process.env.BREVO_SENDER_EMAIL!, name: process.env.BREVO_SENDER_NAME ?? "V-Zone Coherence" });
const enabled = () => !!process.env.BREVO_API_KEY;

/** Add/update a contact in the newsletter list. */
export async function addContact(email: string, name?: string | null) {
  if (!enabled()) return false;
  const res = await fetch(`${API}/contacts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email,
      attributes: name ? { FIRSTNAME: name.split(" ")[0], LASTNAME: name.split(" ").slice(1).join(" ") } : undefined,
      listIds: process.env.BREVO_LIST_ID ? [Number(process.env.BREVO_LIST_ID)] : undefined,
      updateEnabled: true,
    }),
  });
  return res.ok;
}

/** Transactional email (reminders, receipts, contact form). */
export async function sendEmail(opts: { to: string; toName?: string; subject: string; html: string; replyTo?: string }) {
  if (!enabled()) {
    console.log("[brevo disabled] would send:", opts.subject, "→", opts.to);
    return false;
  }
  const res = await fetch(`${API}/smtp/email`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      sender: sender(),
      to: [{ email: opts.to, name: opts.toName }],
      subject: opts.subject,
      htmlContent: opts.html,
      replyTo: opts.replyTo ? { email: opts.replyTo } : undefined,
    }),
  });
  if (!res.ok) console.error("Brevo send failed", res.status, await res.text());
  return res.ok;
}

/** Create and immediately send a newsletter campaign to the whole list. */
export async function sendCampaign(subject: string, html: string) {
  if (!enabled() || !process.env.BREVO_LIST_ID) throw new Error("Brevo is not configured (BREVO_API_KEY / BREVO_LIST_ID)");
  const create = await fetch(`${API}/emailCampaigns`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: `${subject} – ${new Date().toISOString().slice(0, 10)}`,
      subject,
      sender: sender(),
      htmlContent: html,
      recipients: { listIds: [Number(process.env.BREVO_LIST_ID)] },
    }),
  });
  if (!create.ok) throw new Error(`Brevo: ${await create.text()}`);
  const { id } = await create.json();
  const send = await fetch(`${API}/emailCampaigns/${id}/sendNow`, { method: "POST", headers: headers() });
  if (!send.ok) throw new Error(`Brevo: ${await send.text()}`);
}

export const emailShell = (title: string, body: string) => `
<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#2b2b28;line-height:1.6">
<h2 style="font-weight:400;letter-spacing:.04em">${title}</h2>${body}
<hr style="border:none;border-top:1px solid #ddd;margin:32px 0"/>
<p style="font-size:12px;color:#777">The V-Zone Coherence · ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}</p></div>`;
