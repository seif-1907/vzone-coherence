"use client";
import Player from "@vimeo/player";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = { lessonId: string; vimeoId: string; vimeoHash: string | null; startAt: number; track: boolean; nextHref?: string | null };

// Plays the Vimeo video and reports watch time every 15s (while actually playing) so the
// instructor can see view counts and durations, and so the next lesson unlocks at 90%.
export default function VideoPlayer({ lessonId, vimeoId, vimeoHash, startAt, track, nextHref }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!box.current) return;
    const sessionId = crypto.randomUUID();
    const player = new Player(box.current, {
      url: vimeoHash ? `https://vimeo.com/${vimeoId}/${vimeoHash}` : `https://vimeo.com/${vimeoId}`,
      responsive: true, dnt: true,
    });
    let pending = 0, lastT = -1, position = 0, duration = 0, completedSent = false;

    const flush = (keepalive = false) => {
      if (!track || (pending < 1 && position === 0)) return;
      const body = JSON.stringify({ lessonId, sessionId, seconds: Math.round(pending), position, duration });
      pending = 0;
      fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive })
        .then((r) => r.json()).then((j) => { if (j.completed && !completedSent) { completedSent = true; router.refresh(); } }).catch(() => {});
    };

    player.ready().then(() => { if (startAt > 5) player.setCurrentTime(startAt).catch(() => {}); });
    player.on("timeupdate", (d) => {
      position = d.seconds; duration = d.duration;
      if (lastT >= 0 && d.seconds > lastT && d.seconds - lastT < 2) pending += d.seconds - lastT; // ignore seeks
      lastT = d.seconds;
    });
    player.on("seeked", (d) => { lastT = d.seconds; });
    player.on("pause", () => flush());
    player.on("ended", () => flush());
    const timer = setInterval(() => { if (pending >= 15) flush(); }, 5000);
    const onHide = () => flush(true);
    window.addEventListener("pagehide", onHide);
    return () => { clearInterval(timer); window.removeEventListener("pagehide", onHide); flush(true); player.destroy().catch(() => {}); };
  }, [lessonId, vimeoId, vimeoHash, startAt, track, router]);

  return (
    <div>
      <div ref={box} className="aspect-video w-full overflow-hidden rounded-xl bg-black" />
      {nextHref && <a href={nextHref} className="mt-3 inline-block text-sm underline">Next lesson →</a>}
    </div>
  );
}
