"use client";
import { useRouter } from "next/navigation";
import { useCart } from "./Cart";

export default function AddToCart({ courseId, label = "Add to cart", buyNow = false }: { courseId: string; label?: string; buyNow?: boolean }) {
  const { ids, add } = useCart();
  const router = useRouter();
  const inCart = ids.includes(courseId);
  return (
    <button className="btn" onClick={() => { add(courseId); if (buyNow || inCart) router.push("/cart"); }}>
      {inCart ? "View cart" : label}
    </button>
  );
}
