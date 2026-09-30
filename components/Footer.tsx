import Link from "next/link";
import NewsletterForm from "./NewsletterForm";

const link = "text-[#f5c95c] hover:underline";

export default function Footer() {
  return (
    <footer className="mt-20 bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1fr_2fr_1.3fr]">
        <div>
          <h3 className="mb-3 text-xl">Useful Links</h3>
          <ul className="space-y-1 font-serif text-sm">
            <li><Link className={link} href="/">Home</Link></li>
            <li><Link className={link} href="/about">About Vilma</Link></li>
            <li><Link className={link} href="/contact">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-xl">V-Zone Coherence</h3>
          <p className="font-serif text-sm">Vilma Venus</p>
          <p className="mt-4 max-w-md font-serif text-sm">Your one stop-shop to move in coherence and let strength become embodied.</p>
        </div>
        <div>
          <h3 className="mb-3 text-xl">Connect with us</h3>
          <ul className="space-y-1 font-serif text-sm">
            <li><Link className={link} href="/contact">Contact us</Link></li>
            <li><a className={link} href="mailto:vzoneco@gmail.com">vzoneco@gmail.com</a></li>
          </ul>
          <div className="mt-4 flex gap-3">
            {[["Facebook", "f", "https://www.facebook.com", "#203876"], ["Website", "⌂", "/", "#333"], ["Instagram", "◎", "https://www.instagram.com", "#d6249f"]].map(([l, g, href, c]) => (
              <a key={l} href={href} aria-label={l} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-bold" style={{ color: c }}>{g}</a>
            ))}
          </div>
          <div className="mt-6 text-navy"><NewsletterForm /></div>
          <p className="mt-2 font-serif text-xs text-white/70">Get news and updates from Vilma.</p>
        </div>
      </div>
      <p className="bg-navy-dark py-4 text-center font-serif text-sm text-white/70">Copyright © The V-Zone Coherence {new Date().getFullYear()}</p>
    </footer>
  );
}
