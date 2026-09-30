import Link from "next/link";
import { createAdmin } from "@/lib/supabase/server";
import { createLiveClass, deleteLiveClass } from "../actions";
import LiveClassForm from "@/components/LiveClassForm";
import { fmtDate } from "@/lib/utils";

export default async function Live() {
  const db = createAdmin();
  const [{ data: classes }, { data: courses }] = await Promise.all([
    db.from("live_classes").select("*, courses(title)").order("starts_at", { ascending: false }).limit(50),
    db.from("courses").select("id,title").eq("kind", "live"),
  ]);
  return (
    <>
      <h1 className="mb-8 text-3xl">Live classes</h1>
      <ul className="mb-10 divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {(classes ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between px-5 py-3">
            <span><b>{c.title}</b> <span className="text-muted">{fmtDate(c.starts_at)} · {c.duration_minutes} min · {(c.courses as unknown as { title: string } | null)?.title ?? "all clients"}</span></span>
            <span className="flex gap-4"><Link href={`/live/${c.id}`} className="underline">Open room</Link>
              <form action={deleteLiveClass.bind(null, c.id)}><button className="text-red-700 underline">Delete</button></form></span>
          </li>
        ))}
        {!(classes ?? []).length && <li className="px-5 py-3 text-muted">No live classes scheduled.</li>}
      </ul>
      <LiveClassForm courses={courses ?? []} action={createLiveClass} />
    </>
  );
}
