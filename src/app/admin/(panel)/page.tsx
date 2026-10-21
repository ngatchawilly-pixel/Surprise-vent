import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { STATUS_LABEL, STATUS_STYLE, formatFcfa, ORDER_STATUSES } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Stats {
  sales_today: number;
  sales_month: number;
  orders_total: number;
  urgent: number;
  by_status: Partial<Record<OrderStatus, number>>;
  top_products: { name: string; qty: number; revenue: number }[];
}

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_stats");
  const stats = data as Stats | null;

  if (error || !stats) {
    return <p role="alert" className="rounded-xl bg-error-soft p-4 text-danger">Impossible de charger les statistiques.</p>;
  }

  const cards = [
    { label: "Ventes du jour", value: formatFcfa(stats.sales_today) },
    { label: "Ventes du mois", value: formatFcfa(stats.sales_month) },
    { label: "Commandes (total)", value: String(stats.orders_total) },
    { label: "Urgentes (express)", value: String(stats.urgent), alert: stats.urgent > 0 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-semibold">Tableau de bord</h1>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label} className={`card p-5 ${c.alert ? "!border-danger/40" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.alert ? "text-danger" : "text-primary"}`}>{c.value}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="st">
          <h2 id="st" className="font-serif text-xl font-semibold">Commandes par statut</h2>
          <ul className="mt-4 space-y-2">
            {ORDER_STATUSES.map((s) => (
              <li key={s}>
                <Link href={`/admin/commandes?statut=${s}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-low">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[s]}`}>{STATUS_LABEL[s]}</span>
                  <span className="font-bold">{stats.by_status[s] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6" aria-labelledby="top">
          <h2 id="top" className="font-serif text-xl font-semibold">Produits les plus vendus</h2>
          {stats.top_products.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Aucune vente pour le moment.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {stats.top_products.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                  <span><span className="mr-2 font-bold text-primary">{i + 1}.</span>{p.name}</span>
                  <span className="text-ink-soft">{p.qty} · {formatFcfa(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
