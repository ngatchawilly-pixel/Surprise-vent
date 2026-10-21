import type { Metadata } from "next";
import { TrackForm } from "@/components/shop/track-form";

export const metadata: Metadata = { title: "Suivre ma commande", robots: { index: false } };

export default function TrackPage() {
  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-3xl font-semibold sm:text-4xl">Suivre ma commande</h1>
      <p className="mt-2 text-ink-soft">Saisissez votre numéro de commande et le téléphone utilisé lors de la commande.</p>
      <TrackForm />
    </div>
  );
}
