import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  CITY_LABEL,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  formatDate,
  formatDateTime,
  formatFcfa,
} from "@/lib/format";
import type { OrderRow, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("orders")
    .select("id, number, customer_name, customer_phone, city, district, delivery_date, is_express, total, status, payment_status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (statut && ORDER_STATUSES.includes(statut as OrderStatus)) query = query.eq("status", statut);

  const { data } = await query;
  const orders = (data ?? []) as OrderRow[];

  return (
    <div>
      <h1 className="text-3xl font-semibold">Commandes</h1>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Filtrer par statut">
        <li><Link href="/admin/commandes" className="chip" data-active={!statut}>Toutes</Link></li>
        {ORDER_STATUSES.map((s) => (
          <li key={s}><Link href={`/admin/commandes?statut=${s}`} className="chip" data-active={statut === s}>{STATUS_LABEL[s]}</Link></li>
        ))}
      </ul>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-surface-container text-xs uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="p-3">N°</th><th className="p-3">Client</th><th className="p-3">Livraison</th>
              <th className="p-3">Montant</th><th className="p-3">Paiement</th><th className="p-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {orders.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-ink-soft">Aucune commande.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-surface-low">
                <td className="p-3 font-semibold">
                  <Link href={`/admin/commandes/${o.id}`} className="text-primary hover:underline">{o.number}</Link>
                  {o.is_express && <span className="ml-2 rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Urgent</span>}
                  <span className="block text-xs font-normal text-ink-soft">{formatDateTime(o.created_at)}</span>
                </td>
                <td className="p-3">{o.customer_name}<span className="block text-xs text-ink-soft">{o.customer_phone}</span></td>
                <td className="p-3">{formatDate(o.delivery_date)}<span className="block text-xs text-ink-soft">{o.district}, {CITY_LABEL[o.city]}</span></td>
                <td className="p-3 font-semibold">{formatFcfa(o.total)}</td>
                <td className="p-3">{PAYMENT_STATUS_LABEL[o.payment_status]}</td>
                <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
