import { createPromotion, deletePromotion, togglePromotion } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatFcfa } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Promo {
  id: string;
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  ends_at: string | null;
  is_active: boolean;
}

export default async function PromotionsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
  const promos = (data ?? []) as Promo[];

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-semibold">Promotions &amp; codes promo</h1>

      <form action={createPromotion} className="card mt-6 grid gap-4 p-6 sm:grid-cols-6">
        <h2 className="font-serif text-xl font-semibold sm:col-span-6">Nouveau code</h2>
        <div className="sm:col-span-2"><label htmlFor="code" className="label">Code *</label><input id="code" name="code" required minLength={3} maxLength={30} className="input uppercase" placeholder="OCTOBREROSE" /></div>
        <div className="sm:col-span-4"><label htmlFor="label" className="label">Libellé affiché *</label><input id="label" name="label" required className="input" placeholder="Octobre Rose · -10 %" /></div>
        <div className="sm:col-span-2">
          <label htmlFor="type" className="label">Type</label>
          <select id="type" name="type" className="input"><option value="percent">Pourcentage</option><option value="fixed">Montant (FCFA)</option></select>
        </div>
        <div className="sm:col-span-2"><label htmlFor="value" className="label">Valeur *</label><input id="value" name="value" type="number" min={1} required className="input" /></div>
        <div className="sm:col-span-2"><label htmlFor="min_order" className="label">Commande min. (FCFA)</label><input id="min_order" name="min_order" type="number" min={0} defaultValue={0} className="input" /></div>
        <div className="sm:col-span-3"><label htmlFor="ends_at" className="label">Valable jusqu&apos;au (optionnel)</label><input id="ends_at" name="ends_at" type="date" className="input" /></div>
        <div className="flex items-end sm:col-span-3"><button className="btn btn-primary w-full">Créer le code</button></div>
      </form>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-surface-container text-xs uppercase tracking-wider text-ink-soft">
            <tr><th className="p-3">Code</th><th className="p-3">Remise</th><th className="p-3">Validité</th><th className="p-3">Actif</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {promos.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-ink-soft">Aucun code promo.</td></tr>}
            {promos.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "opacity-60"}>
                <td className="p-3 font-bold">{p.code}<span className="block text-xs font-normal text-ink-soft">{p.label}</span></td>
                <td className="p-3">{p.type === "percent" ? `${p.value} %` : formatFcfa(p.value)}{p.min_order > 0 && <span className="block text-xs text-ink-soft">dès {formatFcfa(p.min_order)}</span>}</td>
                <td className="p-3">{p.ends_at ? `jusqu'au ${formatDate(p.ends_at)}` : "Sans limite"}</td>
                <td className="p-3">
                  <form action={togglePromotion}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(!p.is_active)} />
                    <button className="text-xs font-semibold text-primary underline">{p.is_active ? "Actif · désactiver" : "Inactif · activer"}</button>
                  </form>
                </td>
                <td className="p-3 text-right">
                  <form action={deletePromotion}><input type="hidden" name="id" value={p.id} /><button className="text-xs font-semibold text-danger underline">Supprimer</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
