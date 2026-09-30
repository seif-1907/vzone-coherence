import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Sign in" };
export default function Page() {
  return (<div className="mx-auto max-w-5xl px-5 py-16"><h1 className="mb-10 text-center text-4xl">Sign in</h1><Suspense><AuthForm mode="login" /></Suspense></div>);
}
