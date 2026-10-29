"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Customization } from "@/lib/types";

export interface CartLine {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  variantId: string | null;
  variantName: string | null;
  /** Prix unitaire affiché (options comprises). Le serveur le recalcule à la commande. */
  unitPrice: number;
  quantity: number;
  /** Le déplacement est compris dans le prix de cet article. */
  deliveryIncluded?: boolean;
  addons: { id: string; name: string; price: number }[];
  customization: Customization;
}

interface CartState {
  lines: CartLine[];
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const lineKey = (l: Omit<CartLine, "key">) =>
  [l.productId, l.variantId ?? "", l.addons.map((a) => a.id).sort().join("+"), JSON.stringify(l.customization)].join("|");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const key = lineKey(line);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.key === key ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, key }] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(20, quantity)) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "sehaid-cart", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
