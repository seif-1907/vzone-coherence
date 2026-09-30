import type { Metadata } from "next";
import CartView from "@/components/CartView";
export const metadata: Metadata = { title: "Cart" };
export default function CartPage() {
  return (<div className="mx-auto max-w-5xl px-5 py-16"><h1 className="mb-10 text-4xl">Your cart</h1><CartView /></div>);
}
