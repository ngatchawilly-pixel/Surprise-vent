import type { City, OrderStatus, PaymentMethod, PaymentStatus, StockStatus } from "./types";

const nf = new Intl.NumberFormat("fr-FR");

/** 23000 → « 23 000 FCFA » (espaces insécables pour éviter les retours à la ligne). */
export function formatFcfa(amount: number): string {
  return `${nf.format(amount).replace(/\s/g, " ")} FCFA`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Douala",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Douala",
  });
}

export const CITY_LABEL: Record<City, string> = { yaounde: "Yaoundé", douala: "Douala" };

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  delivering: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export const ORDER_STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Non payé",
  pending: "Paiement en cours",
  paid: "Payé",
  failed: "Échec",
  refunded: "Remboursé",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  mtn_momo: "MTN Mobile Money",
  orange_money: "Orange Money",
  card: "Carte bancaire",
  deposit_cod: "Acompte 50 % + solde à la livraison",
  cash_on_delivery: "Paiement à la livraison",
};

export const STOCK_LABEL: Record<StockStatus, string> = {
  available: "Disponible",
  limited: "Stock limité",
  out_of_stock: "Rupture",
};

export const STOCK_STYLE: Record<StockStatus, string> = {
  available: "bg-emerald-50 text-emerald-700",
  limited: "bg-orange-50 text-orange-700",
  out_of_stock: "bg-red-50 text-red-700",
};

/** Numéro camerounais saisi librement → 237XXXXXXXXX (pour wa.me). */
export function toWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 9 ? `237${digits}` : digits;
}

export function whatsappLink(number: string, message?: string): string {
  const base = `https://wa.me/${toWhatsAppNumber(number)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
