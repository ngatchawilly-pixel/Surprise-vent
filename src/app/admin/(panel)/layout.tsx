import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/actions/auth";
import { Icon, type IconName } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Tableau de bord", icon: "sparkle" },
  { href: "/admin/commandes", label: "Commandes", icon: "package" },
  { href: "/admin/produits", label: "Produits & prix", icon: "gift" },
  { href: "/admin/promotions", label: "Promotions", icon: "heart" },
  { href: "/admin/reglages", label: "Réglages & livraison", icon: "truck" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, name } = await requireAdmin();

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-outline-soft/40 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block">
          <div>
            <p className="font-serif text-lg font-bold text-primary">Surprise évent &amp; haid</p>
            <p className="text-xs text-ink-soft">Administration</p>
          </div>
        </div>
        <nav aria-label="Administration" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-rose hover:text-primary"
            >
              <Icon name={l.icon} size={18} /> {l.label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-rose hover:text-primary">
            <Icon name="arrow" size={18} /> Voir le site
          </Link>
        </nav>
        <div className="hidden border-t border-surface-container p-4 lg:absolute lg:bottom-0 lg:block lg:w-[250px]">
          <p className="truncate text-xs text-ink-soft">{name || user.email}</p>
          <form action={signOut}>
            <button className="mt-2 flex items-center gap-2 text-sm font-semibold text-danger hover:underline">
              <Icon name="logout" size={16} /> Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-5 lg:p-8">{children}</main>
    </div>
  );
}
