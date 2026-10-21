// Abstraction du paiement.
// V1 : transfert Mobile Money manuel, confirmé par l'équipe depuis l'administration.
// Pour brancher un agrégateur (CinetPay, Notch Pay, Flutterwave…), implémenter
// PaymentProvider.createCheckout() côté serveur et appeler le webhook de l'agrégateur
// pour passer orders.payment_status à « paid » (via la clé service_role, jamais côté client).

import type { PaymentMethod, SiteSettings } from "./types";
import { PAYMENT_METHOD_LABEL, formatFcfa } from "./format";

export interface PaymentInstructions {
  title: string;
  steps: string[];
}

export interface PaymentProvider {
  readonly id: string;
  instructions(args: {
    method: PaymentMethod;
    amountDue: number;
    orderNumber: string;
    settings: SiteSettings;
  }): PaymentInstructions | null;
}

export const manualMobileMoney: PaymentProvider = {
  id: "manual",
  instructions({ method, amountDue, orderNumber, settings }) {
    if (method === "cash_on_delivery") {
      return {
        title: "Paiement à la livraison",
        steps: ["Réglez le montant total en main propre à la livraison.", "Notre équipe vous contactera pour confirmer les détails."],
      };
    }
    if (method === "card") {
      return {
        title: "Paiement par carte",
        steps: [`Notre équipe vous envoie un lien de paiement sécurisé sur WhatsApp (${settings.phone_display}).`],
      };
    }
    return {
      title: `Régler ${formatFcfa(amountDue)} par ${PAYMENT_METHOD_LABEL[method]}`,
      steps: [
        `Envoyez ${formatFcfa(amountDue)} au ${settings.phone_display} via ${method === "orange_money" ? "Orange Money" : "MTN Mobile Money"}.`,
        `Indiquez la référence ${orderNumber} dans le motif du transfert.`,
        "Envoyez la capture de confirmation sur WhatsApp : votre commande est confirmée dès réception.",
      ],
    };
  },
};
