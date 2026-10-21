import Link from "next/link";
import { notFound } from "next/navigation";
import { updateOrderStatus, updatePaymentStatus } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth";
import {
  CITY_LABEL,
  ORDER_STATUSES,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  formatDate,
  formatDateTime,
  formatFcfa,
  whatsappLink,
} from "@/lib/format";
import type { OrderEventRow, OrderItemRow, OrderRow, PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound();
  const o = order as OrderRow;

  const [{ data: items }, { data: events }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("order_events").select("*").eq("order_id", id).order("created_at"),
  ]);

  // Liens signés temporaires pour les photos clients (bucket privé).
  const photoUrls: Record<string, string> = {};
  for (const it of (items ?? []) as OrderItemRow[]) {
    const path = it.customization.photo_path;
    if (path) {
      const { data } = await supabase.storage.from("customer-photos").createSignedUrl(path, 3600);
      if (data?.signedUrl) photoUrls[path] = data.signedUrl;
    }
  }

  const wa = o.customer_whatsapp || o.customer_phone;

  return (
    <div className="max-w-5xl">
      <Link href="/admin/commandes" className="text-sm text-ink-soft hover:text-primary">← Commandes</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{o.number}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
        {o.is_express && <span className="rounded bg-danger px-2 py-1 text-xs font-bold uppercase text-white">Urgent · express</span>}
      </div>
      <p className="text-sm text-ink-soft">Créée le {formatDateTime(o.created_at)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="font-serif text-xl font-semibold">Articles</h2>
            <ul className="mt-4 divide-y divide-surface-container">
              {((items ?? []) as OrderItemRow[]).map((it) => (
                <li key={it.id} className="py-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">{it.quantity} × {it.product_name}{it.variant_name && ` · ${it.variant_name}`}</p>
                    <p className="font-semibold">{formatFcfa(it.line_total)}</p>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
                    {it.customization.amount && <li>Montant du bouquet : {formatFcfa(it.customization.amount)}</li>}
                    {it.customization.recipient_name && <li>Prénom : {it.customization.recipient_name}</li>}
                    {it.customization.occasion && <li>Occasion : {it.customization.occasion}</li>}
                    {it.customization.color && <li>Couleur : {it.customization.color}</li>}
                    {it.customization.message && <li>Message : « {it.customization.message} »</li>}
                    {it.addons.map((a) => <li key={a.id}>+ {a.name} ({formatFcfa(a.price)})</li>)}
                    {it.customization.photo_path && (
                      <li>
                        {photoUrls[it.customization.photo_path] ? (
                          <a className="font-semibold text-primary underline" href={photoUrls[it.customization.photo_path]} target="_blank" rel="noopener noreferrer">📷 Voir la photo</a>
                        ) : "📷 Photo (indisponible)"}
                      </li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-surface-container pt-4 text-sm">
              <div className="flex justify-between"><dt>Sous-total</dt><dd>{formatFcfa(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt>Remise {o.promo_code}</dt><dd>− {formatFcfa(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Livraison</dt><dd>{formatFcfa(o.delivery_fee)}</dd></div>
              {o.express_fee > 0 && <div className="flex justify-between"><dt>Express</dt><dd>{formatFcfa(o.express_fee)}</dd></div>}
              <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd className="text-primary">{formatFcfa(o.total)}</dd></div>
              <div className="flex justify-between text-ink-soft"><dt>À régler à la commande</dt><dd>{formatFcfa(o.deposit_due)}</dd></div>
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="font-serif text-xl font-semibold">Livraison</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-ink-soft">Date</dt><dd className="font-semibold">{formatDate(o.delivery_date)}{o.delivery_slot && ` · ${o.delivery_slot}`}</dd></div>
              <div><dt className="text-ink-soft">Ville / quartier</dt><dd className="font-semibold">{CITY_LABEL[o.city]} · {o.district}</dd></div>
              <div className="sm:col-span-2"><dt className="text-ink-soft">Adresse</dt><dd className="font-semibold">{o.address}</dd></div>
              <div><dt className="text-ink-soft">Destinataire</dt><dd className="font-semibold">{o.recipient_name} · {o.recipient_phone}</dd></div>
              {o.instructions && <div className="sm:col-span-2"><dt className="text-ink-soft">Instructions</dt><dd className="font-semibold">{o.instructions}</dd></div>}
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-serif text-xl font-semibold">Client</h2>
            <p className="mt-2 text-sm font-semibold">{o.customer_name}</p>
            <p className="text-sm text-ink-soft">{o.customer_phone}{o.customer_email && ` · ${o.customer_email}`}</p>
            {o.anonymous_sender && <p className="mt-2 rounded bg-warn-bg px-2 py-1 text-xs font-semibold text-warn-ink">Identité à garder secrète</p>}
            <a className="btn btn-whatsapp mt-4 w-full" target="_blank" rel="noopener noreferrer"
               href={whatsappLink(wa, `Bonjour ${o.customer_name}, concernant votre commande ${o.number} chez Surprise évent & haid…`)}>
              Écrire sur WhatsApp
            </a>
          </section>

          <section className="card p-6">
            <h2 className="font-serif text-xl font-semibold">Statut</h2>
            <form action={updateOrderStatus} className="mt-3 space-y-3">
              <input type="hidden" name="order_id" value={o.id} />
              <label htmlFor="status" className="label">Nouveau statut</label>
              <select id="status" name="status" defaultValue={o.status} className="input">
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <input name="note" className="input" placeholder="Note (optionnel)" maxLength={300} aria-label="Note" />
              <button className="btn btn-primary w-full">Mettre à jour</button>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="font-serif text-xl font-semibold">Paiement</h2>
            <p className="mt-1 text-sm text-ink-soft">{PAYMENT_METHOD_LABEL[o.payment_method]}</p>
            <form action={updatePaymentStatus} className="mt-3 space-y-3">
              <input type="hidden" name="order_id" value={o.id} />
              <label htmlFor="pstatus" className="label">État du paiement</label>
              <select id="pstatus" name="payment_status" defaultValue={o.payment_status} className="input">
                {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
              </select>
              <button className="btn btn-outline w-full">Enregistrer</button>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="font-serif text-xl font-semibold">Historique</h2>
            <ul className="mt-3 space-y-2 text-xs text-ink-soft">
              {((events ?? []) as OrderEventRow[]).map((e) => (
                <li key={e.id}>{formatDateTime(e.created_at)} — <strong>{STATUS_LABEL[e.status]}</strong>{e.note && ` (${e.note})`}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
