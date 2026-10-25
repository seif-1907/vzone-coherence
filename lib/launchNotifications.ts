import { createAdmin } from "@/lib/supabase/server";
import { sendEmail, emailShell } from "@/lib/brevo";

/** Send one release email for every pre-launch enrollment whose course has opened. */
export async function sendLaunchNotifications() {
  const db = createAdmin();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const { data: enrollments } = await db
    .from("enrollments")
    .select("user_id,course_id,courses!inner(title,slug,launch_at),profiles!inner(email,full_name)")
    .is("launch_notified_at", null)
    .neq("source", "manual")
    .not("courses.launch_at", "is", null)
    .lte("courses.launch_at", new Date().toISOString())
    .limit(200);

  let sent = 0;
  for (const enrollment of enrollments ?? []) {
    const course = enrollment.courses as unknown as { title: string; slug: string };
    const profile = enrollment.profiles as unknown as { email: string; full_name: string | null };
    const subject = `${course.title} is now open`;
    const ok = await sendEmail({
      to: profile.email,
      toName: profile.full_name ?? undefined,
      subject,
      html: emailShell(subject, `<p>Your full access is ready.</p><p><a href="${site}/programs/${course.slug}">Start ${course.title}</a></p>`),
    });
    if (ok || !process.env.BREVO_API_KEY) {
      await db.from("enrollments").update({ launch_notified_at: new Date().toISOString() }).eq("user_id", enrollment.user_id).eq("course_id", enrollment.course_id);
      sent++;
    }
  }
  return sent;
}
