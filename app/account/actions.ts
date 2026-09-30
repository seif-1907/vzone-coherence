"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function addMeeting(input: { title: string; startsAtISO: string; duration: number; notes: string }) {
  const { supabase, user } = await me();
  if (!user || !input.title.trim() || isNaN(+new Date(input.startsAtISO))) return { error: "Please add a title and a valid time." };
  const { data, error } = await supabase.from("meetings").insert({
    user_id: user.id, title: input.title.trim(), starts_at: input.startsAtISO,
    duration_minutes: Math.max(15, Math.min(input.duration || 60, 240)), notes: input.notes || null,
  }).select("id,starts_at").single();
  if (error || !data) return { error: error?.message ?? "Could not save." };
  await supabase.from("reminders").insert({ user_id: user.id, kind: "meeting", ref_id: data.id, remind_at: new Date(+new Date(data.starts_at) - 36e5).toISOString() });
  revalidatePath("/account/schedule");
  return { error: null };
}

export async function deleteMeeting(id: string) {
  const { supabase, user } = await me();
  if (!user) return;
  await supabase.from("meetings").delete().eq("id", id).eq("user_id", user.id);
  await supabase.from("reminders").delete().eq("user_id", user.id).eq("kind", "meeting").eq("ref_id", id);
  revalidatePath("/account/schedule");
}

export async function toggleLiveReminder(liveId: string, startsAtISO: string, on: boolean) {
  const { supabase, user } = await me();
  if (!user) return;
  if (on) await supabase.from("reminders").upsert({ user_id: user.id, kind: "live", ref_id: liveId, remind_at: new Date(+new Date(startsAtISO) - 36e5).toISOString(), sent_at: null }, { onConflict: "user_id,kind,ref_id" });
  else await supabase.from("reminders").delete().eq("user_id", user.id).eq("kind", "live").eq("ref_id", liveId);
  revalidatePath("/account/schedule");
}
