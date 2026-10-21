import Link from "next/link";
import { getSettings } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import { Icon } from "@/components/ui/icons";
import { CartButton } from "./cart-button";
import { MobileNav, type NavItem } from "./mobile-nav";

export const NAV: NavItem[] = [
  { href: "/", label: "Accueil" },
  { href: "/boutique", label: "Boutique" },
  { href: "/boutique?categorie=packs", label: "Packs anniversaire" },
  { href: "/boutique?categorie=animation", label: "Nos prestations" },
  { href: "/suivi", label: "Suivre ma commande" },
  { href: "/contact", label: "Contact & FAQ" },
];

export async function SiteHeader() {
  const settings = await getSettings();

  return (
    <header className="sticky top-0 z-50 bg-surface-cream/95 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="bg-primary py-1.5 text-center text-xs font-semibold text-white">
        <div className="container-page truncate">✨ {settings.announcement}</div>
      </div>

      <div className="container-page relative flex h-16 items-center gap-3 md:h-20 md:gap-6">
        <Link href="/" className="flex shrink-0 flex-col leading-none" aria-label="Surprise évent & haid — accueil">
          <span className="font-serif text-lg font-bold tracking-tight text-primary md:text-xl">
            Surprise évent &amp; haid
          </span>
          <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft sm:block">
            Yaoundé &amp; Douala
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-rose hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <form action="/boutique" role="search" className="relative hidden xl:block">
            <label htmlFor="header-search" className="sr-only">
              Rechercher un cadeau
            </label>
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder="Rechercher un cadeau…"
              className="h-11 w-60 rounded-full bg-surface-low pl-10 pr-4 text-sm placeholder:text-ink-soft focus:bg-white"
            />
          </form>
          <a
            href={whatsappLink(
              settings.whatsapp_number,
              "Bonjour Surprise évent & haid, je souhaite passer une commande.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp !hidden !min-h-11 !rounded-full !px-4 md:!inline-flex"
          >
            <Icon name="chat" size={18} />
            WhatsApp
          </a>
          <CartButton />
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
