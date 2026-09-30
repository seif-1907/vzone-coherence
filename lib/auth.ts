import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = { id: string; email: string; full_name: string | null; role: "client" | "admin" };

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id,email,full_name,role").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

export async function requireUser(next = "/account"): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect(`/login?next=${encodeURIComponent(next)}`);
  return p;
}

export async function requireAdmin(): Promise<Profile> {
  const p = await requireUser("/admin");
  if (p.role !== "admin") redirect("/account");
  return p;
}
