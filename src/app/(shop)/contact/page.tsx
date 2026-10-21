import type { Metadata } from "next";
import { Icon } from "@/components/ui/icons";
import { getSettings } from "@/lib/data";
import { whatsappLink } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact & FAQ",
  description: "Contactez Surprise évent & haid à Yaoundé et Douala. Questions fréquentes sur les commandes et la livraison.",
};

export default async function ContactPage() {
  const s = await getSettings();

  const faq = [
    ["Combien de temps faut-il pour commander ?", `Les réservations sont normalement effectuées au minimum ${s.lead_days} jours à l'avance.`],
    ["Faites-vous des livraisons ?", "Oui, à Yaoundé et à Douala, selon la zone de livraison."],
    ["Puis-je personnaliser mon cadeau ?", "Oui : prénom, message, couleur, photo et options live (saxophoniste, chanteur…)."],
    ["Puis-je choisir le montant d'un bouquet d'argent ?", "Oui, vous choisissez le montant que vous souhaitez offrir."],
    ["Faites-vous des commandes express ?", "Oui, selon disponibilité et avec un supplément."],
    ["Dans quelles villes travaillez-vous ?", "Yaoundé et Douala."],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <div className="container-page py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-semibold sm:text-4xl">Contact &amp; questions fréquentes</h1>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <a href={whatsappLink(s.whatsapp_number)} target="_blank" rel="noopener noreferrer" className="card flex flex-col gap-2 p-6 transition-shadow hover:shadow-raised">
          <Icon name="chat" size={26} className="text-whatsapp" />
          <span className="font-serif text-lg font-semibold">WhatsApp</span>
          <span className="text-sm text-ink-soft">{s.phone_display} — réponse rapide</span>
        </a>
        <div className="card flex flex-col gap-2 p-6">
          <Icon name="pin" size={26} className="text-primary" />
          <span className="font-serif text-lg font-semibold">Yaoundé</span>
          <span className="text-sm text-ink-soft">{s.address_yaounde}</span>
        </div>
        <div className="card flex flex-col gap-2 p-6">
          <Icon name="pin" size={26} className="text-primary" />
          <span className="font-serif text-lg font-semibold">Douala</span>
          <span className="text-sm text-ink-soft">{s.address_douala}</span>
        </div>
      </div>

      <section className="mt-14 max-w-3xl" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-semibold">FAQ</h2>
        <div className="mt-5 divide-y divide-surface-container rounded-2xl border border-surface-container bg-white">
          {faq.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <Icon name="chevron" size={18} className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
