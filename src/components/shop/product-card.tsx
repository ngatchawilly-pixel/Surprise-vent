import Link from "next/link";
import { formatFcfa, STOCK_LABEL, STOCK_STYLE } from "@/lib/format";
import { priceLabel } from "@/lib/rules";
import type { Product } from "@/lib/types";
import { ProductImage } from "./product-image";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const label = priceLabel(product);
  const soldOut = product.stock === "out_of_stock";

  return (
    <Link
      href={`/boutique/${product.slug}`}
      className="card group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-raised"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-rose">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          emoji={product.category?.emoji}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm">
            {product.badge}
          </span>
        )}
        {product.stock !== "available" && (
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STOCK_STYLE[product.stock]}`}>
            {STOCK_LABEL[product.stock]}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
            {product.category.name}
          </span>
        )}
        <h3 className="font-serif text-lg font-semibold leading-snug text-ink">{product.name}</h3>
        {product.tagline && <p className="line-clamp-2 text-sm text-ink-soft">{product.tagline}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            {label && <span className="block text-[11px] text-ink-soft">{label}</span>}
            <span className="text-lg font-bold text-primary">
              {formatFcfa(product.base_price)}
            </span>
            {product.compare_at_price && (
              <span className="ml-2 text-sm text-ink-soft line-through">
                {formatFcfa(product.compare_at_price)}
              </span>
            )}
          </div>
          <span
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${soldOut ? "bg-surface-high text-ink-soft" : "bg-primary-container text-white"}`}
          >
            {soldOut ? "Indisponible" : "Choisir"}
          </span>
        </div>
      </div>
    </Link>
  );
}
