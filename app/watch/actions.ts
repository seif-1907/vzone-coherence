"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const OFFSETS: Record<string, number> = { "1h": 36e5, "1d": 864e5, "3d": 3 * 864e5, "1w": 7 * 864e5 };

export async function setLessonReminder(lessonId: string, when: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (when === "off") await supabase.from("reminders").delete().eq("user_id", user.id).eq("kind", "lesson").eq("ref_id", lessonId);
  else await supabase.from("reminders").upsert(
    { user_id: user.id, kind: "lesson", ref_id: lessonId, remind_at: new Date(Date.now() + (OFFSETS[when] ?? OFFSETS["1d"])).toISOString(), sent_at: null },
    { onConflict: "user_id,kind,ref_id" }
  );
  revalidatePath(`/watch/${lessonId}`);
}
