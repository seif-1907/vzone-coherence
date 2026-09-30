export const money = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

export const fmtDuration = (s?: number | null) => {
  if (!s) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Accepts a Vimeo URL (incl. unlisted ".../123456/abcdef") or a bare id. */
export function parseVimeo(input: string): { id: string; hash: string | null } | null {
  const s = input.trim();
  if (/^\d+$/.test(s)) return { id: s, hash: null };
  const id = s.match(/vimeo\.com\/(?:[a-z]+\/)*(\d+)/i)?.[1];
  if (!id) return null;
  const hash = s.match(/vimeo\.com\/(?:[a-z]+\/)*\d+\/([a-z0-9]+)/i)?.[1] ?? s.match(/[?&]h=([a-z0-9]+)/i)?.[1] ?? null;
  return { id, hash };
}
