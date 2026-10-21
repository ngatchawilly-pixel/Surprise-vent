import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { Icon } from "@/components/ui/icons";
import { getDeliveryZones, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Finaliser ma commande", robots: { index: false } };

export default async function CheckoutPage() {
  const [zones, settings] = await Promise.all([getDeliveryZones(), getSettings()]);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/panier" className="text-ink-soft hover:text-primary">← Retour au panier</Link>
        <span className="flex items-center gap-2 font-semibold text-primary">
          <Icon name="lock" size={16} /> Finalisation sécurisée
        </span>
      </div>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Finaliser ma commande</h1>
      <CheckoutForm zones={zones} settings={settings} />
    </div>
  );
}
