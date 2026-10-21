"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema, trackSchema, type CheckoutInput } from "@/lib/validation";
import type { PublicOrder } from "@/lib/types";

export type ActionResult =
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | { ok: true };

const RPC_ERRORS: Record<string, string> = {
  EMPTY_CART: "Votre panier est vide.",
  LEAD_TIME: "Cette date est trop proche : les réservations se font au minimum 2 jours à l'avance. Choisissez une date plus lointaine ou la prestation express.",
  INVALID_DATE: "La date de livraison est invalide.",
  NO_ZONE: "Nous ne livrons pas encore dans cette zone.",
  PRODUCT_UNAVAILABLE: "Un produit de votre panier n'est plus disponible.",
  OUT_OF_STOCK: "Un produit de votre panier est en rupture de stock.",
  VARIANT_UNAVAILABLE: "Une formule de votre panier n'est plus disponible.",
  INVALID_AMOUNT: "Le montant du bouquet d'argent est invalide.",
};

function flattenIssues(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.map(String).join(".");
    if (!(key in out)) out[key] = i.message;
  }
  return out;
}

/** Valide la commande, la crée via la fonction SQL (prix recalculés côté base) puis redirige. */
export async function placeOrder(input: CheckoutInput): Promise<ActionResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Certains champs sont à corriger.",
      fieldErrors: flattenIssues(parsed.error.issues),
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("create_order", {
    payload: {
      customer: { ...data.customer, email: data.customer.email || null },
      recipient: data.recipient,
      delivery: data.delivery,
      payment_method: data.payment_method,
      promo_code: data.promo_code || null,
      items: data.items,
    },
  });

  if (error || !result) {
    const known = Object.keys(RPC_ERRORS).find((k) => error?.message.includes(k));
    return {
      ok: false,
      error: known ? RPC_ERRORS[known] : "Impossible d'enregistrer la commande pour le moment. Réessayez ou contactez-nous sur WhatsApp.",
    };
  }

  redirect(`/commande/confirmation?t=${(result as { token: string }).token}`);
}

export async function trackOrder(
  _prev: { error?: string; order?: PublicOrder } | undefined,
  formData: FormData,
): Promise<{ error?: string; order?: PublicOrder }> {
  const parsed = trackSchema.safeParse({
    number: formData.get("number"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: "Vérifiez le numéro de commande et le téléphone." };

  const supabase = await createClient();
  const { data } = await supabase.rpc("track_order", {
    p_number: parsed.data.number,
    p_phone: parsed.data.phone,
  });
  if (!data) return { error: "Aucune commande ne correspond à ces informations." };
  return { order: data as PublicOrder };
}
