"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, UserError, fetchRemoteImage } from "@/lib/image-import";
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

const MAX_IMAGES = 8;

async function persistProduct(formData: FormData) {
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

  // Images : conservées + fichiers téléversés + images importées depuis un lien (copiées dans notre stockage).
  const images = formData.getAll("images_keep").map(String).filter(Boolean);
  const store = async (bytes: Blob | Uint8Array, type: string, ext: string) => {
    const path = `${crypto.randomUUID()}.${ext}`;
    const body = bytes instanceof Uint8Array ? new Blob([bytes as BlobPart], { type }) : bytes;
    const { error } = await supabase.storage.from("product-images").upload(path, body, { contentType: type });
    if (error) throw new UserError(`Envoi de l'image impossible : ${error.message}`);
    images.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  };

  for (const file of formData.getAll("images_new")) {
    if (!(file instanceof File) || file.size === 0) continue;
    const ext = IMAGE_TYPES[file.type];
    if (!ext) throw new UserError(`« ${file.name} » : format non accepté (JPG, PNG, WebP ou AVIF).`);
    if (file.size > MAX_IMAGE_BYTES) throw new UserError(`« ${file.name} » : image trop lourde (5 Mo maximum).`);
    await store(file, file.type, ext);
  }

  const links = String(formData.get("images_url") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const link of [...new Set(links)]) {
    const { bytes, type, ext } = await fetchRemoteImage(link);
    await store(bytes, type, ext);
  }

  if (images.length > MAX_IMAGES) throw new UserError(`${MAX_IMAGES} photos maximum par produit.`);

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
    // Envoyé seulement si la colonne existe (migration 0004 appliquée) : le formulaire pose le marqueur.
    ...(formData.get("has_delivery_flag") ? { delivery_included: formData.get("delivery_included") === "on" } : {}),
    composition,
    images,
  };

  const query = p.id
    ? supabase.from("products").update(row).eq("id", p.id).select("id").single()
    : supabase.from("products").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) throw new UserError(error.code === "23505" ? "Cette adresse (slug) existe déjà : choisissez-en une autre." : error.message);

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
        price: Number.parseInt((price ?? "").replace(/\D/g, ""), 10) || 0,
        description: description || null,
        is_recommended: /^(oui|reco|recommand)/i.test(rec ?? ""),
        sort_order: (i + 1) * 10,
      };
    });
    const { error: vErr } = await supabase.from("product_variants").insert(variants);
    if (vErr) throw new UserError(`Formules : ${vErr.message}`);
  }

  // Options complémentaires rattachées.
  const addonIds = formData.getAll("addon_ids").map(String);
  await supabase.from("product_addons").delete().eq("product_id", data.id);
  if (addonIds.length) {
    await supabase.from("product_addons").insert(addonIds.map((addon_id) => ({ product_id: data.id, addon_id })));
  }
}

export type FormState = { error?: string } | undefined;

/** Enregistre un produit. Les erreurs attendues (lien d'image invalide, doublon…) reviennent au formulaire. */
export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await persistProduct(formData);
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    if (e instanceof z.ZodError) {
      const fields = [...new Set(e.issues.map((i) => String(i.path[0] ?? "")))].filter(Boolean).join(", ");
      return { error: `Vérifiez les champs suivants : ${fields || "formulaire"}.` };
    }
    throw e;
  }
  refreshCatalog();
  redirect("/admin/produits");
}

/** Copie un produit (photos, formules, options comprises) en brouillon masqué : pratique pour créer un nouveau pack. */
export async function duplicateProduct(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));

  const { data: src, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error || !src) throw new Error("Produit introuvable.");

  const { id: _omitId, created_at: _c, updated_at: _u, category: _cat, ...copy } = src as Record<string, unknown>;
  void _omitId; void _c; void _u; void _cat;
  const baseSlug = slugify(`${src.slug}-copie`);
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { data: taken } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data: created, error: insErr } = await supabase
    .from("products")
    .insert({ ...copy, slug, name: `${src.name} (copie)`, is_active: false, is_featured: false })
    .select("id")
    .single();
  if (insErr || !created) throw new Error(insErr?.message ?? "Duplication impossible.");

  const [{ data: variants }, { data: links }] = await Promise.all([
    supabase.from("product_variants").select("name, description, price, is_recommended, sort_order").eq("product_id", id),
    supabase.from("product_addons").select("addon_id").eq("product_id", id),
  ]);
  if (variants?.length) await supabase.from("product_variants").insert(variants.map((v) => ({ ...v, product_id: created.id })));
  if (links?.length) await supabase.from("product_addons").insert(links.map((l) => ({ addon_id: l.addon_id, product_id: created.id })));

  refreshCatalog();
  redirect(`/admin/produits/${created.id}`);
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
    // « Autres quartiers » n'a pas de champ nom : seul le tarif change.
    const rawName = formData.get(`district_${id}`);
    const patch: { fee: number; district?: string } = { fee };
    if (typeof rawName === "string") {
      patch.district = z.string().trim().min(2).max(60).parse(rawName);
    }
    const { error } = await supabase.from("delivery_zones").update(patch).eq("id", id);
    if (error) throw new Error(error.code === "23505" ? "Deux quartiers ont le même nom dans la même ville." : error.message);
  }
  refreshCatalog();
}

export async function deleteZone(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("delete_id"));
  // Les lignes « Autres quartiers » servent de repli à la commande : on ne les supprime jamais.
  const { error } = await supabase.from("delivery_zones").delete().eq("id", id).eq("is_other", false);
  if (error) throw new Error(error.message);
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

// ───────────── Apparence (couleurs du site) ─────────────

export type ThemeState = { error?: string; saved?: boolean } | undefined;

const themeSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur principale invalide"),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur secondaire invalide"),
  gold: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur dorée invalide"),
});

export async function saveTheme(_prev: ThemeState, formData: FormData): Promise<ThemeState> {
  const { supabase } = await requireAdmin();
  const parsed = themeSchema.safeParse({
    primary: formData.get("primary"),
    secondary: formData.get("secondary"),
    gold: formData.get("gold"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Couleur invalide" };

  const t = parsed.data;
  const { error } = await supabase.from("settings").upsert([
    { key: "theme_primary", value: t.primary.toLowerCase() },
    { key: "theme_secondary", value: t.secondary.toLowerCase() },
    { key: "theme_gold", value: t.gold.toLowerCase() },
  ]);
  if (error) return { error: error.message };
  refreshCatalog();
  return { saved: true };
}

export async function resetTheme(): Promise<void> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("settings").delete().in("key", ["theme_primary", "theme_secondary", "theme_gold"]);
  if (error) throw new Error(error.message);
  refreshCatalog();
}
