"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { formatFcfa } from "@/lib/format";
import { cartSubtotal, useCart } from "@/store/cart";
import { useHydrated } from "./cart-button";
import { ProductImage } from "./product-image";

export function CartView() {
  const hydrated = useHydrated();
  const { lines, setQuantity, remove } = useCart();

  if (!hydrated) return <div className="mt-8 h-40 animate-pulse rounded-2xl bg-surface-low" aria-hidden="true" />;

  if (lines.length === 0) {
    return (
      <div className="card mt-8 p-10 text-center">
        <p className="text-4xl" aria-hidden="true">🎁</p>
        <p className="mt-3 font-serif text-xl">Votre panier est vide.</p>
        <p className="mt-1 text-ink-soft">Choisissez une surprise à offrir.</p>
        <Link href="/boutique" className="btn btn-primary mt-6">Découvrir nos cadeaux</Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(lines);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-12">
      <ul className="space-y-4 lg:col-span-8">
        {lines.map((l) => (
          <li key={l.key} className="card flex gap-4 p-4">
            <Link href={`/boutique/${l.slug}`} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-rose sm:h-28 sm:w-24">
              <ProductImage src={l.image} alt={l.name} sizes="96px" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/boutique/${l.slug}`} className="font-serif text-lg font-semibold hover:text-primary">{l.name}</Link>
                  {l.variantName && <p className="text-sm text-ink-soft">Formule {l.variantName}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(l.key)}
                  aria-label={`Retirer ${l.name} du panier`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-low hover:text-danger"
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>

              <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
                {l.customization.amount && <li>Montant du bouquet : {formatFcfa(l.customization.amount)}</li>}
                {l.customization.recipient_name && <li>Pour : {l.customization.recipient_name}</li>}
                {l.customization.occasion && <li>Occasion : {l.customization.occasion}</li>}
                {l.customization.color && <li>Couleur : {l.customization.color}</li>}
                {l.customization.message && <li className="line-clamp-1">Message : « {l.customization.message} »</li>}
                {l.customization.photo_path && <li>📷 Photo jointe</li>}
                {l.addons.map((a) => (
                  <li key={a.id}>+ {a.name} ({formatFcfa(a.price)})</li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-surface-high">
                  <button type="button" aria-label="Diminuer la quantité" className="flex h-10 w-10 items-center justify-center hover:bg-surface-low" onClick={() => setQuantity(l.key, l.quantity - 1)}>
                    <Icon name="minus" size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold" aria-live="polite">{l.quantity}</span>
                  <button type="button" aria-label="Augmenter la quantité" className="flex h-10 w-10 items-center justify-center hover:bg-surface-low" onClick={() => setQuantity(l.key, l.quantity + 1)}>
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <p className="font-bold text-primary">{formatFcfa(l.unitPrice * l.quantity)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:col-span-4">
        <div className="card p-6 lg:sticky lg:top-32">
          <h2 className="font-serif text-xl font-semibold">Récapitulatif</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Sous-total</dt><dd className="font-semibold">{formatFcfa(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Livraison</dt><dd className="text-ink-soft">Calculée à l&apos;étape suivante</dd></div>
          </dl>
          <Link href="/commande" className="btn btn-primary mt-6 w-full">
            <Icon name="lock" size={16} /> Passer la commande
          </Link>
          <Link href="/boutique" className="btn btn-ghost mt-2 w-full">Continuer mes achats</Link>
        </div>
      </aside>
    </div>
  );
}
