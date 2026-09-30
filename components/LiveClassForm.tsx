"use client";
export default function LiveClassForm({ courses, action }: { courses: { id: string; title: string }[]; action: (f: FormData) => Promise<void> }) {
  return (
    <form
      className="card space-y-3"
      action={action}
      onSubmit={(e) => {
        // convert the browser-local time to UTC before it reaches the server
        const f = e.currentTarget; const v = (f.elements.namedItem("starts_at") as HTMLInputElement).value;
        (f.elements.namedItem("starts_at_iso") as HTMLInputElement).value = new Date(v).toISOString();
      }}
    >
      <h3 className="text-lg">Schedule a live class</h3>
      <input name="title" required placeholder="Title" className="input" />
      <textarea name="description" rows={2} placeholder="Description (optional)" className="input" />
      <div className="grid grid-cols-2 gap-3">
        <input name="starts_at" type="datetime-local" required className="input" />
        <input name="duration" type="number" defaultValue={60} min={15} step={15} className="input" />
      </div>
      <input type="hidden" name="starts_at_iso" />
      <select name="course_id" className="input"><option value="">Open to all signed-in clients</option>{courses.map((c) => <option key={c.id} value={c.id}>Only for buyers of: {c.title}</option>)}</select>
      <button className="btn">Schedule</button>
    </form>
  );
}
