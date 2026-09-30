"use client";
import { useState, useTransition } from "react";
import { setLessonReminder } from "@/app/watch/actions";

export default function ReminderButton({ lessonId, active }: { lessonId: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [when, setWhen] = useState("1d");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {active ? (
        <>
          <span className="text-sage-dark">Reminder set ✓</span>
          <button className="underline" disabled={pending} onClick={() => start(() => setLessonReminder(lessonId, "off"))}>Cancel</button>
        </>
      ) : (
        <>
          <span className="text-muted">Remind me to watch this in</span>
          <select className="input !w-auto !py-1" value={when} onChange={(e) => setWhen(e.target.value)}>
            <option value="1h">1 hour</option><option value="1d">1 day</option><option value="3d">3 days</option><option value="1w">1 week</option>
          </select>
          <button className="btn-outline !px-4 !py-1" disabled={pending} onClick={() => start(() => setLessonReminder(lessonId, when))}>Set</button>
        </>
      )}
    </div>
  );
}
