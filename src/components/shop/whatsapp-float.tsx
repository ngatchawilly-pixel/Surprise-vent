import { getSettings } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import { WhatsAppIcon } from "@/components/ui/icons";

/** Bouton flottant compact : pastille ronde, libellé au survol/focus (bureau). */
export async function WhatsAppFloat() {
  const s = await getSettings();
  return (
    <a
      href={whatsappLink(
        s.whatsapp_number,
        "Bonjour Surprise évent & haid, je souhaite avoir plus d'informations concernant la disponibilité et la livraison.",
      )}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className="group fixed bottom-4 right-4 z-40 flex items-center sm:bottom-6 sm:right-6"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none mr-2 hidden origin-right scale-95 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-card transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 md:block"
      >
        Discuter sur WhatsApp
      </span>
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-white shadow-raised ring-4 ring-white/80 transition-transform duration-200 group-hover:scale-105">
        <WhatsAppIcon size={26} />
      </span>
    </a>
  );
}
