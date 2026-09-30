import Link from "next/link";
import { createAdmin } from "@/lib/supabase/server";
import { createCourse } from "../actions";
import { money } from "@/lib/utils";

export default async function Courses() {
  const { data: courses } = await createAdmin().from("courses").select("id,title,kind,price_cents,currency,published,lessons(count)").order("position");
  return (
    <>
      <h1 className="mb-8 text-3xl">Courses</h1>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">
        {(courses ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <Link href={`/admin/courses/${c.id}`} className="font-serif text-lg hover:underline">{c.title}</Link>
            <span className="text-muted">{c.kind} · {money(c.price_cents, c.currency)} · {(c.lessons as unknown as { count: number }[])[0]?.count ?? 0} videos · {c.published ? "published" : "draft"}</span>
          </li>
        ))}
      </ul>
      <form action={createCourse} className="card mt-10 grid gap-3 md:grid-cols-[1fr_140px_120px_auto]">
        <input name="title" required placeholder="New course title" className="input" />
        <select name="kind" className="input"><option value="course">Course</option><option value="live">Live</option><option value="one_to_one">One-to-one</option></select>
        <input name="price" type="number" step="0.01" min="0" placeholder="Price" defaultValue="0" className="input" />
        <button className="btn">Add course</button>
      </form>
    </>
  );
}
