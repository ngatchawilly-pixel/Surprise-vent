import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { ProductConfigurator } from "@/components/shop/product-configurator";
import { ProductImage } from "@/components/shop/product-image";
import { Icon } from "@/components/ui/icons";
import { getProductBySlug, getRelatedProducts, getSettings } from "@/lib/data";
import { STOCK_LABEL, STOCK_STYLE } from "@/lib/format";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produit introuvable" };
  return {
    title: product.name,
    description: product.tagline ?? product.description?.slice(0, 155),
    openGraph: { images: product.images[0] ? [product.images[0]] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([getSettings(), getRelatedProducts(product)]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? product.tagline,
    image: product.images,
    offers: {
      "@type": "Offer",
      priceCurrency: "XAF",
      price: product.base_price,
      availability:
        product.stock === "out_of_stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-soft">
        <Link href="/" className="hover:text-primary">Accueil</Link> /{" "}
        <Link href="/boutique" className="hover:text-primary">Boutique</Link>
        {product.category && (
          <> / <Link href={`/boutique?categorie=${product.category.slug}`} className="hover:text-primary">{product.category.name}</Link></>
        )}{" "}
        / <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Galerie */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-rose shadow-card">
              <ProductImage src={product.images[0]} alt={product.name} emoji={product.category?.emoji} priority sizes="(min-width:1024px) 40vw, 100vw" />
              {product.badge && (
                <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  {product.badge}
                </span>
              )}
            </div>
            {product.images.length > 1 && (
              <ul className="mt-3 grid grid-cols-4 gap-3">
                {product.images.slice(1, 5).map((src, i) => (
                  <li key={src} className="relative aspect-square overflow-hidden rounded-lg">
                    <ProductImage src={src} alt={`${product.name} — vue ${i + 2}`} sizes="10vw" />
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-5 space-y-3 rounded-xl bg-surface-rose p-5 text-sm text-ink-soft">
              <li className="flex gap-3"><Icon name="gift" size={20} className="shrink-0 text-primary" /> Livraison discrète et soignée, en main propre.</li>
              <li className="flex gap-3"><Icon name="truck" size={20} className="shrink-0 text-primary" /> Livraison à Yaoundé et Douala.</li>
              <li className="flex gap-3"><Icon name="clock" size={20} className="shrink-0 text-primary" /> Réservation {settings.lead_days} jours minimum à l&apos;avance.</li>
            </ul>
          </div>
        </div>

        {/* Détails + configuration */}
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STOCK_STYLE[product.stock]}`}>
              {STOCK_LABEL[product.stock]}
            </span>
            {product.delivery_included && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-rose px-3 py-1 text-xs font-semibold text-primary">
                <Icon name="truck" size={14} /> Déplacement inclus
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          {product.tagline && <p className="mt-2 font-serif text-lg italic text-secondary">{product.tagline}</p>}
          {product.description && <p className="mt-4 leading-relaxed text-ink-soft">{product.description}</p>}

          {product.composition.length > 0 && (
            <div className="mt-5">
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider">Composition</h2>
              <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                {product.composition.map((c) => (
                  <li key={c} className="flex items-center gap-2"><Icon name="check" size={16} className="text-ok" /> {c}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <ProductConfigurator product={product} whatsappNumber={settings.whatsapp_number} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="text-2xl font-semibold">Vous aimerez aussi</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
            {related.map((p) => (
              <li key={p.id}><ProductCard product={p} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
