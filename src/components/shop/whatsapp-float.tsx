import { getSettings } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import { Icon } from "@/components/ui/icons";

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
      aria-label="Commander sur WhatsApp"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-whatsapp px-4 py-3.5 text-sm font-bold text-white shadow-raised transition-transform hover:scale-105 sm:bottom-6 sm:right-6 sm:px-5"
    >
      <Icon name="chat" size={22} />
      <span className="hidden sm:inline">Commander sur WhatsApp</span>
    </a>
  );
}
