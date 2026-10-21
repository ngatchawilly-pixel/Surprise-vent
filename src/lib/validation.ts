import { z } from "zod";

/** Numéro camerounais : 9 chiffres commençant par 6 (mobile) ou 2 (fixe), préfixe +237 facultatif. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ""))
  .refine((v) => /^(?:\+?237)?[26]\d{8}$/.test(v), "Numéro invalide (ex : 6 94 42 57 25)");

const optionalPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ""))
  .refine((v) => v === "" || /^(?:\+?237)?[26]\d{8}$/.test(v), "Numéro invalide");

const text = (max: number) => z.string().trim().max(max);

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable(),
  quantity: z.number().int().min(1).max(20),
  addon_ids: z.array(z.string().uuid()).max(10),
  customization: z.object({
    recipient_name: text(120).optional(),
    occasion: text(60).optional(),
    message: text(600).optional(),
    color: text(60).optional(),
    photo_path: text(300).optional(),
    amount: z.number().int().min(1000).max(5_000_000).optional(),
  }),
});

export const checkoutSchema = z.object({
  customer: z.object({
    name: text(120).min(2, "Indiquez votre nom"),
    phone: phoneSchema,
    whatsapp: optionalPhone,
    email: z.union([z.literal(""), z.string().trim().email("E-mail invalide").max(160)]),
    anonymous: z.boolean(),
  }),
  recipient: z.object({
    name: text(120).min(2, "Indiquez le nom du destinataire"),
    phone: phoneSchema,
  }),
  delivery: z.object({
    city: z.enum(["yaounde", "douala"]),
    district: text(80).min(1, "Choisissez un quartier"),
    address: text(500).min(5, "Précisez l'adresse ou un repère"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choisissez une date"),
    slot: text(60).optional(),
    express: z.boolean(),
    instructions: text(1000).optional(),
  }),
  payment_method: z.enum(["mtn_momo", "orange_money", "card", "deposit_cod", "cash_on_delivery"]),
  promo_code: text(40).optional(),
  items: z.array(orderItemSchema).min(1, "Votre panier est vide").max(30),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export const trackSchema = z.object({
  number: z.string().trim().min(5).max(30),
  phone: phoneSchema,
});

export const reviewSchema = z.object({
  first_name: text(60).min(1),
  city: text(60).optional(),
  rating: z.number().int().min(1).max(5),
  comment: text(600).min(5),
});
