import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/shop/clear-cart";
import { OrderSummary } from "@/components/shop/order-summary";
import { Icon } from "@/components/ui/icons";
import { getSettings } from "@/lib/data";
import { formatFcfa, whatsappLink } from "@/lib/format";
import { manualMobileMoney } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import type { PublicOrder } from "@/lib/types";

export const metadata: Metadata = { title: "Commande enregistrée", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  if (!t || !UUID.test(t)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("order_by_token", { p_token: t });
  if (!data) notFound();

  const order = data as PublicOrder;
  const settings = await getSettings();
  const instructions = manualMobileMoney.instructions({
    method: order.payment_method,
    amountDue: order.deposit_due,
    orderNumber: order.number,
    settings,
  });

  return (
    <div className="container-page max-w-3xl py-12">
      <ClearCart />
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-ok">
          <Icon name="check" size={32} />
        </span>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Commande enregistrée 🎉</h1>
        <p className="mt-2 text-ink-soft">
          Merci pour votre commande chez Surprise évent &amp; haid. Nous vous contacterons pour confirmer les détails.
        </p>
      </div>

      {instructions && (
        <section className="mt-8 rounded-2xl border border-gold/40 bg-warn-bg p-6 text-warn-ink" aria-labelledby="pay">
          <h2 id="pay" className="font-serif text-xl font-semibold">{instructions.title}</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            {instructions.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <a
            className="btn btn-whatsapp mt-5"
            target="_blank"
            rel="noopener noreferrer"
            href={whatsappLink(
              settings.whatsapp_number,
              `Bonjour, voici ma confirmation de paiement pour la commande ${order.number} (${formatFcfa(order.deposit_due || order.total)}).`,
            )}
          >
            <Icon name="chat" size={18} /> Envoyer ma confirmation sur WhatsApp
          </a>
        </section>
      )}

      <div className="mt-8">
        <OrderSummary order={order} />
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Conservez votre numéro <strong>{order.number}</strong> pour{" "}
        <Link href="/suivi" className="font-semibold text-primary underline">suivre votre commande</Link>.
      </p>
    </div>
  );
}
