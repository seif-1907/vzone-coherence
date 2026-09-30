import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import JitsiRoom from "@/components/JitsiRoom";
import { fmtDate } from "@/lib/utils";

// /live/<liveClassId>  or  /live/m-<meetingId>
export default async function Live({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireUser(`/live/${id}`);
  const supabase = await createClient();

  const isMeeting = id.startsWith("m-");
  const { data } = isMeeting
    ? await supabase.from("meetings").select("id,title,room,starts_at,duration_minutes").eq("id", id.slice(2)).single()
    : await supabase.from("live_classes").select("id,title,room,starts_at,duration_minutes").eq("id", id).single();
  if (!data) notFound(); // RLS hides classes the client has not purchased

  const start = +new Date(data.starts_at), end = start + data.duration_minutes * 6e4;
  const now = Date.now();
  const joinable = profile.role === "admin" || (now >= start - 15 * 6e4 && now <= end + 30 * 6e4);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link href="/account" className="text-sm text-muted underline">← My account</Link>
      <h1 className="mb-2 mt-2 text-3xl">{data.title}</h1>
      <p className="mb-6 text-sm text-muted">{fmtDate(data.starts_at)} · {data.duration_minutes} min</p>
      {joinable ? (
        <JitsiRoom room={data.room} displayName={profile.full_name ?? profile.email} email={profile.email} isHost={profile.role === "admin"} />
      ) : (
        <div className="card text-center text-muted">{now < start ? "The room opens 15 minutes before the class starts. Come back then." : "This class has ended."}</div>
      )}
    </div>
  );
}
