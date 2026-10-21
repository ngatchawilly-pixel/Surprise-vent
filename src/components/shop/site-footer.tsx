import Link from "next/link";
import { getSettings } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import { Icon } from "@/components/ui/icons";

export async function SiteFooter() {
  const s = await getSettings();

  return (
    <footer className="mt-24 border-t border-outline-soft/40 bg-surface-rose">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-xl font-bold text-primary">Surprise évent &amp; haid</p>
          <p className="mt-2 font-serif italic text-secondary">
            « Tu choisis l&apos;émotion, nous créons la surprise. »
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Cadeaux, fleurs, surprises et prestations événementielles à Yaoundé et Douala.
          </p>
        </div>

        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-ink">Nos adresses</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-soft">
            <li className="flex gap-2">
              <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-primary" />
              {s.address_yaounde}
            </li>
            <li className="flex gap-2">
              <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-primary" />
              {s.address_douala}
            </li>
            <li className="flex gap-2">
              <Icon name="phone" size={18} className="mt-0.5 shrink-0 text-primary" />
              <a href={`tel:+${s.whatsapp_number}`} className="hover:text-primary">
                {s.phone_display}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-ink">Commander</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>
              <Link href="/boutique" className="hover:text-primary">
                Boutique
              </Link>
            </li>
            <li>
              <Link href="/boutique?categorie=packs" className="hover:text-primary">
                Packs anniversaire
              </Link>
            </li>
            <li>
              <Link href="/suivi" className="hover:text-primary">
                Suivre ma commande
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-primary">
                Contact &amp; FAQ
              </Link>
            </li>
            <li>
              <a
                href={whatsappLink(s.whatsapp_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-ink">Paiement</h2>
          <p className="mt-4 text-sm text-ink-soft">MTN Mobile Money, Orange Money, carte bancaire.</p>
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-warn-bg px-3 py-2.5 text-xs font-semibold text-warn-ink">
            <Icon name="clock" size={16} className="mt-0.5 shrink-0" />
            Réservation {s.lead_days} jours minimum avant l&apos;événement.
          </p>
        </div>
      </div>
      <div className="border-t border-outline-soft/40 py-5 text-center text-xs text-ink-soft">
        © {new Date().getFullYear()} Surprise évent &amp; haid · Fait avec amour pour Yaoundé &amp; Douala
      </div>
    </footer>
  );
}
