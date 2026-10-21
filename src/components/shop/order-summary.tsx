import { CITY_LABEL, PAYMENT_STATUS_LABEL, STATUS_LABEL, STATUS_STYLE, formatDate, formatDateTime, formatFcfa } from "@/lib/format";
import type { OrderStatus, PublicOrder } from "@/lib/types";

const FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "delivering", "delivered"];

export function OrderSummary({ order }: { order: PublicOrder }) {
  const cancelled = order.status === "cancelled";
  const currentIdx = FLOW.indexOf(order.status);

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Commande</p>
          <p className="font-serif text-2xl font-semibold">{order.number}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      {!cancelled && (
        <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Avancement de la commande">
          {FLOW.map((s, i) => (
            <li key={s} className="text-center" aria-current={i === currentIdx ? "step" : undefined}>
              <div className={`mx-auto h-1.5 rounded-full ${i <= currentIdx ? "bg-primary-container" : "bg-surface-high"}`} />
              <span className={`mt-1.5 block text-[11px] leading-tight ${i <= currentIdx ? "font-semibold text-primary" : "text-ink-soft"}`}>
                {STATUS_LABEL[s]}
              </span>
            </li>
          ))}
        </ol>
      )}

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-soft">Livraison</dt><dd className="font-semibold">{formatDate(order.delivery_date)}</dd></div>
        <div><dt className="text-ink-soft">Lieu</dt><dd className="font-semibold">{order.district}, {CITY_LABEL[order.city]}</dd></div>
        <div><dt className="text-ink-soft">Paiement</dt><dd className="font-semibold">{PAYMENT_STATUS_LABEL[order.payment_status]}</dd></div>
        {order.is_express && <div><dt className="text-ink-soft">Type</dt><dd className="font-semibold text-primary">Commande express</dd></div>}
      </dl>

      <ul className="mt-5 divide-y divide-surface-container border-y border-surface-container text-sm">
        {order.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-3 py-2.5">
            <span>{it.quantity} × {it.name}{it.variant && <span className="text-ink-soft"> · {it.variant}</span>}</span>
            <span className="font-semibold">{formatFcfa(it.line_total)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between text-lg font-bold">
        <span>Total</span><span className="text-primary">{formatFcfa(order.total)}</span>
      </p>

      {order.events.length > 0 && (
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer font-semibold text-primary">Historique</summary>
          <ul className="mt-2 space-y-1 text-ink-soft">
            {order.events.map((e, i) => (
              <li key={i}>{formatDateTime(e.at)} — {STATUS_LABEL[e.status]}{e.note ? ` (${e.note})` : ""}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
