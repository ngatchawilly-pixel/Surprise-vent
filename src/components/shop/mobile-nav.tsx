"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
}

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface-low"
      >
        <Icon name={open ? "close" : "menu"} size={24} />
      </button>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Menu mobile"
          className="absolute inset-x-0 top-full z-40 border-t border-outline-soft/40 bg-surface-cream px-4 pb-6 pt-2 shadow-modal"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-surface-container py-3.5 text-base font-semibold text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
