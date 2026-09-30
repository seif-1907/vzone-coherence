"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = { ids: string[]; add: (id: string) => void; remove: (id: string) => void; clear: () => void };
const CartCtx = createContext<Ctx>({ ids: [], add: () => {}, remove: () => {}, clear: () => {} });
export const useCart = () => useContext(CartCtx);

export function CartProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem("cart") ?? "[]")); } catch {}
  }, []);
  const save = (next: string[]) => { setIds(next); try { localStorage.setItem("cart", JSON.stringify(next)); } catch {} };
  return (
    <CartCtx.Provider value={{ ids, add: (id) => save([...new Set([...ids, id])]), remove: (id) => save(ids.filter((x) => x !== id)), clear: () => save([]) }}>
      {children}
    </CartCtx.Provider>
  );
}
