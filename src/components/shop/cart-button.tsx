"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { cartCount, cartSubtotal, useCart } from "@/store/cart";
import { formatFcfa } from "@/lib/format";
import { Icon } from "@/components/ui/icons";

const subscribeNothing = () => () => {};

/** Évite l'écart d'hydratation : le panier (localStorage) n'est lu qu'après montage. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

export function CartButton() {
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(lines) : 0;
  const total = hydrated ? cartSubtotal(lines) : 0;

  return (
    <Link
      href="/panier"
      aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}
      className="relative flex min-h-11 items-center gap-2 rounded-full bg-surface-rose px-3 py-2 text-primary transition-colors hover:bg-secondary-fixed"
    >
      <Icon name="bag" size={22} />
      {count > 0 && (
        <>
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white md:hidden">
            {count}
          </span>
          <span className="hidden text-sm font-bold md:inline">
            {count} · {formatFcfa(total)}
          </span>
        </>
      )}
    </Link>
  );
}
