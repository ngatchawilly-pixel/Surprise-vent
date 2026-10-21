"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

// Chaque action revérifie le rôle admin : un layout ne protège pas les Server Actions.

const intField = (min = 0) => z.coerce.number().int().min(min).max(100_000_000);
const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const refreshCatalog = () => revalidatePath("/", "layout");

// ───────────── Commandes ─────────────

const statusSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"]),
  note: z.string().trim().max(300).optional(),
});

export async function updateOrderStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const p = statusSchema.parse({
    order_id: formData.get("order_id"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order: p.order_id,
    p_status: p.status,
    p_note: p.note ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

const paymentSchema = z.object({
  order_id: z.string().uuid(),
  payment_status: z.enum(["unpaid", "pending", "paid", "failed", "refunded"]),
});

export async function updatePaymentStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const p = paymentSchema.parse({
    order_id: formData.get("order_id"),
    payment_status: formData.get("payment_status"),
  });
  const { data: order, error } = await supabase
    .from("orders")
    .update({ payment_status: p.payment_status })
    .eq("id", p.order_id)
    .select("total, deposit_due, payment_method")
    .single();
  if (error) throw new Error(error.message);

  if (p.payment_status === "paid") {
    await supabase.from("payments").insert({
      order_id: p.order_id,
      method: order.payment_method,
      amount: order.deposit_due > 0 ? order.deposit_due : order.total,
      status: "paid",
      provider: "manual",
    });
  }
  revalidatePath("/admin", "layout");
}

// ───────────── Produits ─────────────

const productSchema = z.object({
  id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80),
  category_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  tagline: z.string().trim().max(200),
  description: z.string().trim().max(3000),
  price_mode: z.enum(["fixed", "from", "custom_amount"]),
  base_price: intField(),
  compare_at_price: z.preprocess(emptyToNull, intField().nullable()),
  badge: z.string().trim().max(40),
  stock: z.enum(["available", "limited", "out_of_stock"]),
  sort_order: intField(),
});

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export async function saveProduct(formData: FormData) {
  const { supabase } = await requireAdmin();

  const p = productSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    category_id: formData.get("category_id"),
    tagline: formData.get("tagline") ?? "",
    description: formData.get("description") ?? "",
    price_mode: formData.get("price_mode"),
    base_price: formData.get("base_price"),
    compare_at_price: formData.get("compare_at_price"),
    badge: formData.get("badge") ?? "",
    stock: formData.get("stock"),
    sort_order: formData.get("sort_order") || 0,
  });

  // Images conservées (ordre du formulaire) + nouvelles images téléversées.
  const images = formData.getAll("images_keep").map(String).filter(Boolean);
  for (const file of formData.getAll("images_new")) {
    if (!(file instanceof File) || file.size === 0) continue;
    const ext = IMAGE_TYPES[file.type];
    if (!ext || file.size > 5 * 1024 * 1024) throw new Error("Image refusée (JPG, PNG, WebP ou AVIF, 5 Mo max).");
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    images.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }

  const composition = String(formData.get("composition") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const row = {
    name: p.name,
    slug: slugify(p.slug || p.name),
    category_id: p.category_id,
    tagline: p.tagline || null,
    description: p.description || null,
    price_mode: p.price_mode,
    base_price: p.base_price,
    compare_at_price: p.compare_at_price && p.compare_at_price > p.base_price ? p.compare_at_price : null,
    badge: p.badge || null,
    stock: p.stock,
    sort_order: p.sort_order,
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
    is_pack: formData.get("is_pack") === "on",
    composition,
    images,
  };

  const query = p.id
    ? supabase.from("products").update(row).eq("id", p.id).select("id").single()
    : supabase.from("products").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) throw new Error(error.code === "23505" ? "Ce nom d'URL (slug) existe déjà." : error.message);

  // Formules : une ligne par formule « Nom | Prix | Description (| recommandé) ».
  const variantLines = String(formData.get("variants") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  await supabase.from("product_variants").delete().eq("product_id", data.id);
  if (variantLines.length) {
    const variants = variantLines.map((line, i) => {
      const [name, price, description, rec] = line.split("|").map((s) => s.trim());
      return {
        product_id: data.id,
        name,
        price: Number.parseInt(price.replace(/\D/g, ""), 10) || 0,
        description: description || null,
        is_recommended: /^(oui|reco|recommand)/i.test(rec ?? ""),
        sort_order: (i + 1) * 10,
      };
    });
    const { error: vErr } = await supabase.from("product_variants").insert(variants);
    if (vErr) throw new Error(vErr.message);
  }

  // Options complémentaires rattachées.
  const addonIds = formData.getAll("addon_ids").map(String);
  await supabase.from("product_addons").delete().eq("product_id", data.id);
  if (addonIds.length) {
    await supabase.from("product_addons").insert(addonIds.map((addon_id) => ({ product_id: data.id, addon_id })));
  }

  refreshCatalog();
  redirect("/admin/produits");
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refreshCatalog();
  redirect("/admin/produits");
}

export async function toggleProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("products").update({ is_active: active }).eq("id", id);
  refreshCatalog();
}

// ───────────── Promotions ─────────────

const promoSchema = z.object({
  code: z.string().trim().min(3).max(30).transform((v) => v.toUpperCase().replace(/\s+/g, "")),
  label: z.string().trim().min(2).max(80),
  type: z.enum(["percent", "fixed"]),
  value: intField(1),
  min_order: intField(),
  ends_at: z.preprocess(emptyToNull, z.string().nullable()),
});

export async function createPromotion(formData: FormData) {
  const { supabase } = await requireAdmin();
  const p = promoSchema.parse({
    code: formData.get("code"),
    label: formData.get("label"),
    type: formData.get("type"),
    value: formData.get("value"),
    min_order: formData.get("min_order") || 0,
    ends_at: formData.get("ends_at"),
  });
  if (p.type === "percent" && p.value > 100) throw new Error("Un pourcentage ne peut pas dépasser 100.");
  const { error } = await supabase.from("promotions").insert({
    ...p,
    ends_at: p.ends_at ? new Date(`${p.ends_at}T23:59:59+01:00`).toISOString() : null,
  });
  if (error) throw new Error(error.code === "23505" ? "Ce code existe déjà." : error.message);
  revalidatePath("/admin/promotions");
}

export async function togglePromotion(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  await supabase.from("promotions").update({ is_active: formData.get("active") === "true" }).eq("id", id);
  revalidatePath("/admin/promotions");
}

export async function deletePromotion(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  await supabase.from("promotions").delete().eq("id", id);
  revalidatePath("/admin/promotions");
}

// ───────────── Réglages & livraison ─────────────

const settingsSchema = z.object({
  whatsapp_number: z.string().trim().regex(/^\d{9,15}$/, "Numéro WhatsApp : chiffres uniquement, avec l'indicatif (ex : 237694425725)"),
  phone_display: z.string().trim().min(5).max(30),
  lead_days: intField(0),
  express_fee: intField(0),
  announcement: z.string().trim().max(200),
  address_yaounde: z.string().trim().max(200),
  address_douala: z.string().trim().max(200),
});

export async function saveSettings(formData: FormData) {
  const { supabase } = await requireAdmin();
  const s = settingsSchema.parse(Object.fromEntries(formData));
  const rows = Object.entries(s).map(([key, value]) => ({ key, value }));
  const { error } = await supabase.from("settings").upsert(rows);
  if (error) throw new Error(error.message);
  refreshCatalog();
}

export async function saveZoneFees(formData: FormData) {
  const { supabase } = await requireAdmin();
  const ids = formData.getAll("zone_id").map(String);
  for (const id of ids) {
    const fee = intField().parse(formData.get(`fee_${id}`));
    const { error } = await supabase.from("delivery_zones").update({ fee }).eq("id", id);
    if (error) throw new Error(error.message);
  }
  refreshCatalog();
}

export async function addZone(formData: FormData) {
  const { supabase } = await requireAdmin();
  const z2 = z.object({
    city: z.enum(["yaounde", "douala"]),
    district: z.string().trim().min(2).max(60),
    fee: intField(),
  }).parse({ city: formData.get("city"), district: formData.get("district"), fee: formData.get("fee") });
  const { error } = await supabase.from("delivery_zones").insert({ ...z2, sort_order: 50 });
  if (error) throw new Error(error.code === "23505" ? "Ce quartier existe déjà." : error.message);
  refreshCatalog();
}
