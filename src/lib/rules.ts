// Règles métier pures (sans I/O) : testables, partagées entre client et serveur.
// La source de vérité des montants reste la fonction SQL create_order().

import type { Product, Variant } from "./types";

const DOUALA_TZ = "Africa/Douala";

/** Date du jour (AAAA-MM-JJ) au Cameroun, indépendamment du fuseau du navigateur. */
export function todayInCameroon(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DOUALA_TZ }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Première date de livraison possible : aujourd'hui + délai (2 jours), ou aujourd'hui en express. */
export function earliestDeliveryDate(leadDays: number, express: boolean, now?: Date): string {
  const today = todayInCameroon(now);
  return express ? today : addDays(today, leadDays);
}

export type LeadTimeCheck = { ok: true } | { ok: false; reason: "past" | "too_soon" };

export function checkLeadTime(
  date: string,
  leadDays: number,
  express: boolean,
  now?: Date,
): LeadTimeCheck {
  const today = todayInCameroon(now);
  if (!date || date < today) return { ok: false, reason: "past" };
  if (!express && date < addDays(today, leadDays)) return { ok: false, reason: "too_soon" };
  return { ok: true };
}

/** Prix unitaire affiché (hors options) pour un produit et une formule donnés. */
export function unitPrice(
  product: Pick<Product, "base_price" | "price_mode">,
  variant: Pick<Variant, "price"> | null,
  customAmount = 0,
): number {
  const base = variant ? variant.price : product.base_price;
  return product.price_mode === "custom_amount" ? base + customAmount : base;
}

export function priceLabel(product: Pick<Product, "price_mode">): string | null {
  if (product.price_mode === "from") return "À partir de";
  if (product.price_mode === "custom_amount") return "Frais de confection";
  return null;
}

export const MIN_CUSTOM_AMOUNT = 1000;
