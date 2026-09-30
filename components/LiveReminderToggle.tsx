"use client";
import { useTransition } from "react";
import { toggleLiveReminder, deleteMeeting } from "@/app/account/actions";

export function LiveReminderToggle({ id, startsAt, on }: { id: string; startsAt: string; on: boolean }) {
  const [p, start] = useTransition();
  return <button disabled={p} className="underline" onClick={() => start(() => toggleLiveReminder(id, startsAt, !on))}>{on ? "Reminder on ✓" : "Remind me"}</button>;
}
export function DeleteMeeting({ id }: { id: string }) {
  const [p, start] = useTransition();
  return <button disabled={p} className="text-muted underline" onClick={() => start(() => deleteMeeting(id))}>Remove</button>;
}
