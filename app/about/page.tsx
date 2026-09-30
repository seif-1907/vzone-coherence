import type { Metadata } from "next";
export const metadata: Metadata = { title: "About Vilma" };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl py-10 text-center font-serif text-[17px] leading-8">
      <h1 className="text-5xl text-gold">About Vilma</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/vilma.jpg" alt="Vilma Venus" className="mx-auto mt-6 h-52 w-52 rounded-full object-cover" />
      <div className="mt-8 space-y-5">
        <p><b>Vilma Venus is a woman who moves from coherence.</b><br />Her presence is calm, precise, and deeply embodied.<br />She does not chase transformation — it unfolds naturally around her.</p>
        <p>From the beginning, Vilma carried an intuitive understanding of the human system:<br />that strength is not forced, discipline is not rigid, and power does not come from control — it comes from alignment.</p>
        <blockquote className="mx-auto max-w-xl border-l-4 border-gold bg-[#fffdf5] px-8 py-4 text-left italic md:text-center">
          "Her path unfolded through movement. Through the body. Through the quiet intelligence that reveals itself when effort, awareness, and breath meet."
        </blockquote>
        <p>Over the years, her work refined itself into something unmistakable.<br />Not a technique. Not a philosophy. But a way of being — lived, practiced, embodied.</p>
        <p>Vilma’s approach is rooted in coherence.<br />The mind sharpens through presence. The body strengthens through intelligent effort.<br />Breath organizes rhythm. Energy flows without resistance.</p>
        <p>This coherence does not stay in training — it extends into life.<br />People who work with Vilma recalibrate how they stand, decide, relate, and move forward.<br />Their posture changes. Their pace softens. Their clarity deepens.</p>
        <p>Vilma does not impose transformation.<br />She creates the conditions where it becomes inevitable.<br />Her work is quiet, exact, and deeply grounded.</p>
        <p>It speaks to those who are ready — not to change who they are, but to fully inhabit it.<br />This is not a journey toward something new. It is a return to what was always there.</p>
        <p><b>Vilma Venus lives and works from this place — and invites others to do the same.</b></p>
      </div>
    </div>
  );
}
