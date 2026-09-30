import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
export const metadata: Metadata = { title: "Contact Us" };

export default function Contact() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-center text-4xl">Contact Us</h1>
      <p className="mb-10 mt-5 text-center text-muted">Contact us about anything related to our website or any issues you may face. We'll do our best to get back to you as soon as possible.</p>
      <ContactForm />
    </div>
  );
}
