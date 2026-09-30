import { NextResponse } from "next/server";
import { createClient, createAdmin } from "@/lib/supabase/server";

// ?download=1 forces a download; otherwise the file opens inline (preview).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS only returns the row for admins, enrolled clients, or documents flagged as preview.
  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const download = new URL(req.url).searchParams.get("download") === "1";
  if (download && !doc.allow_download) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: p } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
    if (p?.role !== "admin") return NextResponse.json({ error: "Download disabled" }, { status: 403 });
  }
  if (download) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to download" }, { status: 401 });
  }
  const { data } = await createAdmin().storage.from("documents").createSignedUrl(doc.storage_path, 120, download ? { download: doc.title } : undefined);
  if (!data) return NextResponse.json({ error: "File missing" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
