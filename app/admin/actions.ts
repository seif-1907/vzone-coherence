"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import { parseVimeo, slugify } from "@/lib/utils";
import { sendCampaign, emailShell } from "@/lib/brevo";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => Math.round(Number(f.get(k) ?? 0));

// ───────── courses ─────────
export async function createCourse(f: FormData) {
  await requireAdmin();
  const title = s(f, "title");
  const { data, error } = await createAdmin().from("courses").insert({
    title, slug: slugify(title) || `course-${Date.now()}`, kind: s(f, "kind") || "course",
    price_cents: Math.round(Number(f.get("price") || 0) * 100),
  }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(id: string, f: FormData) {
  await requireAdmin();
  const { error } = await createAdmin().from("courses").update({
    title: s(f, "title"), slug: slugify(s(f, "slug")), tagline: s(f, "tagline") || null, description: s(f, "description") || null,
    kind: s(f, "kind"), price_cents: Math.round(Number(f.get("price") || 0) * 100), cover_url: s(f, "cover_url") || null,
    published: f.get("published") === "on", position: n(f, "position"),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  await createAdmin().from("courses").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/admin/courses");
}

// ───────── lessons (videos) ─────────
export async function addLesson(courseId: string, f: FormData) {
  await requireAdmin();
  const v = parseVimeo(s(f, "vimeo"));
  if (!v) throw new Error("That doesn't look like a Vimeo link or id.");
  const db = createAdmin();
  const { data: last } = await db.from("lessons").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { data: lesson, error } = await db.from("lessons").insert({
    course_id: courseId, title: s(f, "title"), description: s(f, "description") || null,
    position: (last?.position ?? 0) + 1, is_preview: f.get("is_preview") === "on",
  }).select("id").single();
  if (error) throw new Error(error.message);
  await db.from("lesson_media").insert({ lesson_id: lesson.id, vimeo_id: v.id, vimeo_hash: v.hash });
  // optional: pull duration from Vimeo
  if (process.env.VIMEO_ACCESS_TOKEN) {
    const r = await fetch(`https://api.vimeo.com/videos/${v.id}?fields=duration`, { headers: { Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}` } }).catch(() => null);
    const j = r?.ok ? await r.json() : null;
    if (j?.duration) await db.from("lessons").update({ duration_seconds: j.duration }).eq("id", lesson.id);
  }
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function toggleLessonPreview(courseId: string, lessonId: string, value: boolean) {
  await requireAdmin();
  await createAdmin().from("lessons").update({ is_preview: value }).eq("id", lessonId);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function moveLesson(courseId: string, lessonId: string, dir: -1 | 1) {
  await requireAdmin();
  const db = createAdmin();
  const { data: ls } = await db.from("lessons").select("id").eq("course_id", courseId).order("position").order("created_at");
  const ids = (ls ?? []).map((l) => l.id);
  const i = ids.indexOf(lessonId), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((id, idx) => db.from("lessons").update({ position: idx + 1 }).eq("id", id)));
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteLesson(courseId: string, lessonId: string) {
  await requireAdmin();
  await createAdmin().from("lessons").delete().eq("id", lessonId);
  revalidatePath(`/admin/courses/${courseId}`);
}

// ───────── documents ─────────
export async function createDocumentUpload(courseId: string, filename: string) {
  await requireAdmin();
  const path = `${courseId}/${crypto.randomUUID()}-${filename.replace(/[^\w.\-]+/g, "_")}`;
  const { data, error } = await createAdmin().storage.from("documents").createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path, token: data.token };
}

export async function registerDocument(courseId: string, input: { path: string; title: string; mime: string; lessonId: string | null; isPreview: boolean; allowDownload: boolean }) {
  await requireAdmin();
  await createAdmin().from("documents").insert({
    course_id: courseId, lesson_id: input.lessonId, title: input.title, storage_path: input.path, mime_type: input.mime,
    is_preview: input.isPreview, allow_download: input.allowDownload,
  });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateDocument(courseId: string, id: string, patch: { is_preview?: boolean; allow_download?: boolean }) {
  await requireAdmin();
  await createAdmin().from("documents").update(patch).eq("id", id);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteDocument(courseId: string, id: string) {
  await requireAdmin();
  const db = createAdmin();
  const { data: d } = await db.from("documents").select("storage_path").eq("id", id).single();
  if (d) await db.storage.from("documents").remove([d.storage_path]);
  await db.from("documents").delete().eq("id", id);
  revalidatePath(`/admin/courses/${courseId}`);
}

// ───────── clients ─────────
export async function addClient(f: FormData) {
  await requireAdmin();
  const email = s(f, "email").toLowerCase(), name = s(f, "name");
  const db = createAdmin();
  const { data: existing } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  let userId = existing?.id;
  if (!userId) {
    // sends the client an email invite to set their password
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, { data: { full_name: name }, redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/account` });
    if (error) throw new Error(error.message);
    userId = data.user.id;
  }
  const courseId = s(f, "course_id");
  if (courseId) await db.from("enrollments").upsert({ user_id: userId, course_id: courseId, source: "manual" }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  revalidatePath("/admin/clients");
}

export async function enrollClient(userId: string, f: FormData) {
  await requireAdmin();
  const courseId = s(f, "course_id");
  if (courseId) await createAdmin().from("enrollments").upsert({ user_id: userId, course_id: courseId, source: "manual" }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  revalidatePath(`/admin/clients/${userId}`);
}

export async function unenrollClient(userId: string, courseId: string) {
  await requireAdmin();
  await createAdmin().from("enrollments").delete().eq("user_id", userId).eq("course_id", courseId);
  revalidatePath(`/admin/clients/${userId}`);
}

export async function removeClient(userId: string) {
  await requireAdmin();
  await createAdmin().auth.admin.deleteUser(userId); // cascades to profile, enrollments, progress
  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

// ───────── live classes ─────────
export async function createLiveClass(f: FormData) {
  await requireAdmin();
  const { error } = await createAdmin().from("live_classes").insert({
    title: s(f, "title"), description: s(f, "description") || null, course_id: s(f, "course_id") || null,
    starts_at: new Date(s(f, "starts_at_iso")).toISOString(), duration_minutes: n(f, "duration") || 60,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/live");
}
export async function deleteLiveClass(id: string) {
  await requireAdmin();
  await createAdmin().from("live_classes").delete().eq("id", id);
  revalidatePath("/admin/live");
}

// ───────── promo codes ─────────
export async function createPromo(f: FormData) {
  await requireAdmin();
  const kind = s(f, "kind"), value = Number(f.get("value") || 0);
  const { error } = await createAdmin().from("promo_codes").insert({
    code: s(f, "code").toUpperCase(),
    percent_off: kind === "percent" ? Math.round(value) : null,
    amount_off_cents: kind === "amount" ? Math.round(value * 100) : null,
    max_uses: s(f, "max_uses") ? n(f, "max_uses") : null,
    expires_at: s(f, "expires") ? new Date(s(f, "expires")).toISOString() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/promos");
}
export async function togglePromo(id: string, active: boolean) {
  await requireAdmin();
  await createAdmin().from("promo_codes").update({ active }).eq("id", id);
  revalidatePath("/admin/promos");
}
export async function deletePromo(id: string) {
  await requireAdmin();
  await createAdmin().from("promo_codes").delete().eq("id", id);
  revalidatePath("/admin/promos");
}

// ───────── newsletter ─────────
export async function sendNewsletter(f: FormData) {
  await requireAdmin();
  const subject = s(f, "subject"), body = s(f, "body");
  const html = emailShell(subject, body.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`).join(""));
  await sendCampaign(subject, html);
  revalidatePath("/admin/newsletter");
}
