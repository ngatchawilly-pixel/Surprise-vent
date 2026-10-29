import Link from "next/link";
import { duplicateProduct, toggleProduct } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { STOCK_LABEL, STOCK_STYLE, formatFcfa } from "@/lib/format";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(slug, name, emoji)")
    .order("sort_order");
  const products = (data ?? []) as Product[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Produits &amp; prix</h1>
        <Link href="/admin/produits/nouveau" className="btn btn-primary">+ Nouveau produit</Link>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-surface-container text-xs uppercase tracking-wider text-ink-soft">
            <tr><th className="p-3">Produit</th><th className="p-3">Catégorie</th><th className="p-3">Prix</th><th className="p-3">Stock</th><th className="p-3">Visible</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {products.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "opacity-60"}>
                <td className="p-3 font-semibold">
                  <Link href={`/admin/produits/${p.id}`} className="text-primary hover:underline">{p.name}</Link>
                  {p.is_pack && <span className="ml-2 rounded bg-gold-light px-1.5 py-0.5 text-[10px] font-bold uppercase text-warn-ink">Pack</span>}
                </td>
                <td className="p-3 text-ink-soft">{p.category?.name ?? "—"}</td>
                <td className="p-3 font-semibold">{formatFcfa(p.base_price)}</td>
                <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STOCK_STYLE[p.stock]}`}>{STOCK_LABEL[p.stock]}</span></td>
                <td className="p-3">
                  <form action={toggleProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={String(!p.is_active)} />
                    <button className="text-xs font-semibold text-primary underline" aria-label={p.is_active ? `Masquer ${p.name}` : `Afficher ${p.name}`}>
                      {p.is_active ? "Oui · masquer" : "Non · afficher"}
                    </button>
                  </form>
                </td>
                <td className="whitespace-nowrap p-3 text-right">
                  <Link href={`/admin/produits/${p.id}`} className="btn btn-ghost !min-h-9 !px-3 !py-1">Modifier</Link>
                  <form action={duplicateProduct} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn btn-ghost !min-h-9 !px-3 !py-1" title="Créer une copie masquée à modifier" aria-label={`Dupliquer ${p.name}`}>Dupliquer</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
