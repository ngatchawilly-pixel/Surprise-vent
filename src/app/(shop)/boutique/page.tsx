import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { Icon, WhatsAppIcon } from "@/components/ui/icons";
import { getCategories, getProducts, getSettings, type SortKey } from "@/lib/data";
import { whatsappLink } from "@/lib/format";

export const metadata: Metadata = {
  title: "Boutique & packs surprises",
  description: "Bouquets d'argent, Box Love, fleurs, gâteaux, ballons et animations live à Yaoundé et Douala.",
};

const SORTS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Plus populaires" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "new", label: "Nouveautés" },
];

type SearchParams = Promise<{ categorie?: string; q?: string; tri?: string }>;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const { categorie, q, tri } = await searchParams;
  const sort = SORTS.some((s) => s.value === tri) ? (tri as SortKey) : "popular";

  const [categories, products, settings] = await Promise.all([
    getCategories(),
    getProducts({ category: categorie, q, sort }),
    getSettings(),
  ]);
  const customizable = categorie === "packs" || categorie === "paniers";
  const active = categories.find((c) => c.slug === categorie);

  const href = (params: { categorie?: string; q?: string; tri?: string }) => {
    const usp = new URLSearchParams();
    if (params.categorie) usp.set("categorie", params.categorie);
    if (params.q) usp.set("q", params.q);
    if (params.tri && params.tri !== "popular") usp.set("tri", params.tri);
    const s = usp.toString();
    return s ? `/boutique?${s}` : "/boutique";
  };

  return (
    <div className="container-page py-10">
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-soft">
        <Link href="/" className="hover:text-primary">Accueil</Link> / <span className="text-ink">Boutique</span>
        {active && <> / <span className="text-ink">{active.name}</span></>}
      </nav>

      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
        {active ? `${active.emoji ?? ""} ${active.name}` : "Boutique & packs surprises"}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        {active?.description ?? "Des cadeaux féeriques livrés à domicile à Yaoundé et Douala. Chaque création peut être personnalisée."}
      </p>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" aria-label="Catégories">
          <li>
            <Link href={href({ q, tri: sort })} className="chip whitespace-nowrap" data-active={!categorie}>
              Tout
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={href({ categorie: c.slug, q, tri: sort })}
                className="chip whitespace-nowrap"
                data-active={categorie === c.slug}
              >
                <span aria-hidden="true">{c.emoji}</span> {c.name}
              </Link>
            </li>
          ))}
        </ul>

        <form action="/boutique" className="flex shrink-0 items-center gap-2">
          {categorie && <input type="hidden" name="categorie" value={categorie} />}
          <label htmlFor="q" className="sr-only">Rechercher</label>
          <input id="q" name="q" defaultValue={q} placeholder="Rechercher…" className="input !min-h-11 w-44" />
          <label htmlFor="tri" className="sr-only">Trier par</label>
          <select id="tri" name="tri" defaultValue={sort} className="input !min-h-11 w-44">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button className="btn btn-outline !min-h-11 !px-4" type="submit">OK</button>
        </form>
      </div>

      {customizable && (
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-gold/30 bg-warn-bg px-5 py-4 sm:flex-row sm:items-center">
          <p className="flex items-start gap-3 text-sm text-warn-ink">
            <Icon name="gift" size={20} className="mt-0.5 shrink-0" />
            <span>
              <strong>Sur mesure :</strong> nous pouvons confectionner votre {categorie === "paniers" ? "panier" : "pack"} en fonction de votre budget et de vos envies.
            </span>
          </p>
          <a
            href={whatsappLink(settings.whatsapp_number, `Bonjour Surprise évent & haid, je souhaite un ${categorie === "paniers" ? "panier" : "pack"} sur mesure. Mon budget est de … FCFA.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-wa-soft shrink-0"
          >
            <WhatsAppIcon size={18} /> Demander un devis
          </a>
        </div>
      )}

      <p className="mt-6 text-sm text-ink-soft" aria-live="polite">
        {products.length} création{products.length > 1 ? "s" : ""}
        {q ? ` pour « ${q} »` : ""}
      </p>

      {products.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="font-serif text-xl">Aucune création ne correspond à votre recherche.</p>
          <Link href="/boutique" className="btn btn-primary mt-5">Voir toute la boutique</Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {products.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 4} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
