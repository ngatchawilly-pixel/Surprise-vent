import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct, saveProduct } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth";
import type { Addon, Category, Product, Variant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "nouveau";
  const { supabase } = await requireAdmin();

  const [{ data: categories }, { data: addons }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("addons").select("*").order("sort_order"),
  ]);

  let product: Product | null = null;
  let variants: Variant[] = [];
  let linkedAddons: string[] = [];
  if (!isNew) {
    const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    product = data as Product;
    const [{ data: v }, { data: l }] = await Promise.all([
      supabase.from("product_variants").select("*").eq("product_id", id).order("sort_order"),
      supabase.from("product_addons").select("addon_id").eq("product_id", id),
    ]);
    variants = (v ?? []) as Variant[];
    linkedAddons = (l ?? []).map((x) => x.addon_id as string);
  }

  const variantText = variants
    .map((v) => [v.name, v.price, v.description ?? "", v.is_recommended ? "recommandé" : ""].join(" | ").replace(/( \| )+$/, ""))
    .join("\n");

  return (
    <div className="max-w-3xl">
      <Link href="/admin/produits" className="text-sm text-ink-soft hover:text-primary">← Produits</Link>
      <h1 className="mt-2 text-3xl font-semibold">{isNew ? "Nouveau produit" : product!.name}</h1>

      <form action={saveProduct} encType="multipart/form-data" className="card mt-6 space-y-5 p-6">
        <input type="hidden" name="id" value={product?.id ?? ""} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="label">Nom *</label>
            <input id="name" name="name" required minLength={2} className="input" defaultValue={product?.name} />
          </div>
          <div>
            <label htmlFor="slug" className="label">Adresse (slug)</label>
            <input id="slug" name="slug" className="input" defaultValue={product?.slug} placeholder="généré depuis le nom" />
          </div>
          <div>
            <label htmlFor="category_id" className="label">Catégorie</label>
            <select id="category_id" name="category_id" className="input" defaultValue={product?.category_id ?? ""}>
              <option value="">—</option>
              {((categories ?? []) as Category[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tagline" className="label">Accroche</label>
            <input id="tagline" name="tagline" className="input" maxLength={200} defaultValue={product?.tagline ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className="label">Description</label>
            <textarea id="description" name="description" className="input" maxLength={3000} defaultValue={product?.description ?? ""} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="price_mode" className="label">Type de prix</label>
            <select id="price_mode" name="price_mode" className="input" defaultValue={product?.price_mode ?? "fixed"}>
              <option value="fixed">Prix fixe</option>
              <option value="from">À partir de</option>
              <option value="custom_amount">Bouquet d&apos;argent (montant au choix)</option>
            </select>
          </div>
          <div>
            <label htmlFor="base_price" className="label">Prix de base (FCFA) *</label>
            <input id="base_price" name="base_price" type="number" min={0} step={500} required className="input" defaultValue={product?.base_price ?? 0} />
          </div>
          <div>
            <label htmlFor="compare_at_price" className="label">Ancien prix (promo)</label>
            <input id="compare_at_price" name="compare_at_price" type="number" min={0} step={500} className="input" defaultValue={product?.compare_at_price ?? ""} />
          </div>
          <div>
            <label htmlFor="stock" className="label">Stock</label>
            <select id="stock" name="stock" className="input" defaultValue={product?.stock ?? "available"}>
              <option value="available">🟢 Disponible</option>
              <option value="limited">🟠 Stock limité</option>
              <option value="out_of_stock">🔴 Rupture</option>
            </select>
          </div>
          <div>
            <label htmlFor="badge" className="label">Badge</label>
            <input id="badge" name="badge" className="input" maxLength={40} defaultValue={product?.badge ?? ""} placeholder="Best-seller…" />
          </div>
          <div>
            <label htmlFor="sort_order" className="label">Ordre</label>
            <input id="sort_order" name="sort_order" type="number" min={0} className="input" defaultValue={product?.sort_order ?? 100} />
          </div>
        </div>

        <fieldset className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <legend className="sr-only">Options d&apos;affichage</legend>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="h-4 w-4 accent-[var(--color-primary-container)]" /> Visible sur le site</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={product?.is_featured} className="h-4 w-4 accent-[var(--color-primary-container)]" /> Coup de cœur (accueil)</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_pack" defaultChecked={product?.is_pack} className="h-4 w-4 accent-[var(--color-primary-container)]" /> C&apos;est un pack</label>
        </fieldset>

        <div>
          <label htmlFor="composition" className="label">Composition du pack (une ligne par élément)</label>
          <textarea id="composition" name="composition" className="input !min-h-28" defaultValue={product?.composition.join("\n")} />
        </div>

        <div>
          <label htmlFor="variants" className="label">Formules (optionnel)</label>
          <textarea id="variants" name="variants" className="input !min-h-24 font-mono !text-sm" defaultValue={variantText}
            placeholder={"Standard | 25000 | Description courte\nPrestige | 35000 | Description | recommandé"} />
          <p className="mt-1 text-xs text-ink-soft">Une formule par ligne : Nom | Prix | Description | « recommandé ». Le prix de la formule remplace le prix de base.</p>
        </div>

        {(addons ?? []).length > 0 && (
          <fieldset>
            <legend className="label">Options proposées</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {((addons ?? []) as Addon[]).map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="addon_ids" value={a.id} defaultChecked={linkedAddons.includes(a.id)} className="h-4 w-4 accent-[var(--color-primary-container)]" />
                  {a.emoji} {a.name} <span className="text-ink-soft">(+{a.price})</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="label">Photos</legend>
          {product && product.images.length > 0 && (
            <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {product.images.map((src) => (
                <li key={src} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="images_keep" value={src} defaultChecked className="h-4 w-4 accent-[var(--color-primary-container)]" /> Conserver
                  </label>
                </li>
              ))}
            </ul>
          )}
          <input type="file" name="images_new" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="input !py-2.5" aria-label="Ajouter des photos" />
          <p className="mt-1 text-xs text-ink-soft">JPG, PNG, WebP ou AVIF — 5 Mo maximum par photo. La première photo est la photo principale.</p>
        </fieldset>

        <div className="flex flex-wrap gap-3 border-t border-surface-container pt-5">
          <button className="btn btn-primary">Enregistrer</button>
          <Link href="/admin/produits" className="btn btn-ghost">Annuler</Link>
        </div>
      </form>

      {!isNew && (
        <form action={deleteProduct} className="mt-6">
          <input type="hidden" name="id" value={product!.id} />
          <button className="text-sm font-semibold text-danger underline">Supprimer définitivement ce produit</button>
          <p className="text-xs text-ink-soft">Les commandes passées conservent le nom et le prix du produit. Pour le retirer temporairement, décochez « Visible ».</p>
        </form>
      )}
    </div>
  );
}
