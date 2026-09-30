import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const nav = [["/admin", "Overview"], ["/admin/courses", "Courses"], ["/admin/clients", "Clients"], ["/admin/stats", "Statistics"], ["/admin/live", "Live classes"], ["/admin/promos", "Promo codes"], ["/admin/newsletter", "Newsletter"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <nav className="mb-10 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-4 text-sm">
        {nav.map(([href, label]) => <Link key={href} href={href} className="hover:text-sage-dark">{label}</Link>)}
        <form action="/auth/signout" method="post" className="ml-auto"><button className="text-muted underline">Sign out</button></form>
      </nav>
      {children}
    </div>
  );
}
