"use client";
import { useEffect, useRef } from "react";

declare global { interface Window { JitsiMeetExternalAPI?: new (domain: string, opts: object) => { dispose: () => void } } }

export default function JitsiRoom({ room, displayName, email, isHost }: { room: string; displayName: string; email: string; isHost: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

  useEffect(() => {
    let api: { dispose: () => void } | undefined;
    const s = document.createElement("script");
    s.src = `https://${domain}/external_api.js`;
    s.async = true;
    s.onload = () => {
      if (!ref.current || !window.JitsiMeetExternalAPI) return;
      api = new window.JitsiMeetExternalAPI(domain, {
        roomName: `vzone-${room}`, parentNode: ref.current, width: "100%", height: "100%",
        userInfo: { displayName, email },
        configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: !isHost, startWithVideoMuted: !isHost, disableDeepLinking: true },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
      });
    };
    document.body.appendChild(s);
    return () => { api?.dispose(); s.remove(); };
  }, [room, displayName, email, isHost, domain]);

  return <div ref={ref} className="h-[75vh] w-full overflow-hidden rounded-xl bg-black" />;
}
