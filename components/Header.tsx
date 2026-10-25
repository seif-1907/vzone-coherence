"use client";
import Link from "next/link";
import { useCart } from "./Cart";

export default function Header({ user }: { user: { name: string; admin: boolean } | null }) {
  const { ids } = useCart();
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Link href="/" aria-label="The V-Zone Coherence">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-transparent.png" alt="The V-Zone Coherence" className="h-20 w-auto" />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 font-serif text-xl">
            <Link href="/" className="hover:text-sage-dark">V-Zone Coherence</Link>
            <Link href="/about" className="hover:text-sage-dark">About Vilma</Link>
            <Link href="/contact" className="hover:text-sage-dark">Contact Us</Link>
          </nav>
        </div>
        <div className="flex items-center gap-5">
          {ids.length > 0 && <Link href="/cart" className="font-serif text-lg hover:text-sage-dark">Cart ({ids.length})</Link>}
          <Link
            href={user ? (user.admin ? "/admin" : "/account") : "/login"}
            className="rounded-md border border-gold px-5 py-2 font-serif text-xl text-gold transition hover:bg-gold hover:text-white"
          >
            {user ? (user.admin ? "Instructor" : "My classes") : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
