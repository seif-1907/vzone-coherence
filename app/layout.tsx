import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Shell from "@/components/Shell";
import { CartProvider } from "@/components/Cart";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "The V-Zone Coherence", template: "%s · The V-Zone Coherence" },
  description: "Health begins with coherence. When the mind, body, breath, and energy work as ONE.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ data: programs }, profile] = await Promise.all([
    supabase.from("courses").select("slug,title").eq("published", true).order("position"),
    getProfile(),
  ]);
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Baskervville:ital,wght@0,400..700;1,400..700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">
        <CartProvider>
          <Header user={profile ? { name: profile.full_name ?? profile.email, admin: profile.role === "admin" } : null} />
          <Shell programs={programs ?? []}>{children}</Shell>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
