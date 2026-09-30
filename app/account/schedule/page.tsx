import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MeetingForm from "@/components/MeetingForm";
import { LiveReminderToggle, DeleteMeeting } from "@/components/LiveReminderToggle";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My schedule" };

export default async function Schedule() {
  const profile = await requireUser("/account/schedule");
  const supabase = await createClient();
  const since = new Date(Date.now() - 36e5).toISOString();
  const [{ data: live }, { data: meetings }, { data: rem }] = await Promise.all([
    supabase.from("live_classes").select("id,title,starts_at,duration_minutes").gte("starts_at", since).order("starts_at"),
    supabase.from("meetings").select("id,title,notes,starts_at,duration_minutes").eq("user_id", profile.id).gte("starts_at", since).order("starts_at"),
    supabase.from("reminders").select("kind,ref_id").eq("user_id", profile.id).is("sent_at", null),
  ]);
  const on = new Set((rem ?? []).map((r) => `${r.kind}:${r.ref_id}`));
  const items = [
    ...(live ?? []).map((l) => ({ ...l, type: "live" as const, notes: null as string | null })),
    ...(meetings ?? []).map((m) => ({ ...m, type: "meeting" as const })),
  ].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <Link href="/account" className="text-sm text-muted underline">← My account</Link>
      <h1 className="mb-10 mt-2 text-4xl">My schedule</h1>
      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div>
          {items.length === 0 ? <p className="text-muted">Nothing scheduled yet.</p> : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {items.map((i) => (
                <li key={`${i.type}${i.id}`} className="px-5 py-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div><span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${i.type === "live" ? "bg-sage/20 text-sage-dark" : "bg-sand"}`}>{i.type === "live" ? "Live class" : "Meeting"}</span><span className="font-serif text-lg">{i.title}</span>
                      <div className="mt-1 text-muted">{fmtDate(i.starts_at)} · {i.duration_minutes} min</div>{i.notes && <div className="mt-1 text-muted">{i.notes}</div>}</div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Link className="underline" href={i.type === "live" ? `/live/${i.id}` : `/live/m-${i.id}`}>Join room</Link>
                      {i.type === "live" ? <LiveReminderToggle id={i.id} startsAt={i.starts_at} on={on.has(`live:${i.id}`)} /> : <DeleteMeeting id={i.id} />}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <MeetingForm />
      </div>
    </div>
  );
}
