import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Addon,
  Category,
  DeliveryZone,
  Product,
  ProductDetail,
  Review,
  SiteSettings,
  Variant,
} from "@/lib/types";

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp_number: "237694425725",
  phone_display: "694 425 725",
  lead_days: 2,
  express_fee: 0,
  announcement: "Réservations au minimum 2 jours à l'avance · Livraison à Yaoundé et Douala",
  address_yaounde: "Byemassi, Yaoundé",
  address_douala: "Entrée Bépanda, 4e rue, Douala",
};

const PRODUCT_SELECT = "*, category:categories(slug, name, emoji)";

export type SortKey = "popular" | "price_asc" | "price_desc" | "new";

export interface ProductFilters {
  category?: string;
  q?: string;
  sort?: SortKey;
  packsOnly?: boolean;
  featuredOnly?: boolean;
  limit?: number;
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const db = createPublicClient();
  if (!db) return DEFAULT_SETTINGS;
  const { data } = await db.from("settings").select("key, value");
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of data ?? []) merged[row.key] = row.value;
  return merged as unknown as SiteSettings;
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Category[];
});

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const db = createPublicClient();
  if (!db) return [];

  let query = db.from("products").select(PRODUCT_SELECT).eq("is_active", true);

  if (filters.packsOnly) query = query.eq("is_pack", true);
  if (filters.featuredOnly) query = query.eq("is_featured", true);
  if (filters.category) {
    const { data: cat } = await db
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();
    if (!cat) return [];
    query = query.eq("category_id", cat.id);
  }
  if (filters.q?.trim()) {
    // Échappement des caractères spéciaux du filtre PostgREST.
    const term = filters.q.trim().replace(/[%,()*\\]/g, " ");
    query = query.or(`name.ilike.%${term}%,tagline.ilike.%${term}%,description.ilike.%${term}%`);
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "new":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("sort_order");
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data } = await query;
  return (data ?? []) as Product[];
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const db = createPublicClient();
  if (!db) return null;
  const { data: product } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!product) return null;

  const [{ data: variants }, { data: links }] = await Promise.all([
    db.from("product_variants").select("*").eq("product_id", product.id).order("sort_order"),
    db.from("product_addons").select("addon:addons(*)").eq("product_id", product.id),
  ]);

  const addons = ((links ?? []) as unknown as { addon: Addon | null }[])
    .map((l) => l.addon)
    .filter((a): a is Addon => Boolean(a?.is_active))
    .sort((a, b) => a.sort_order - b.sort_order);

  return { ...(product as Product), variants: (variants ?? []) as Variant[], addons };
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const db = createPublicClient();
  if (!db || !product.category_id) return [];
  const { data } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .order("sort_order")
    .limit(limit);
  return (data ?? []) as Product[];
}

export const getDeliveryZones = cache(async (): Promise<DeliveryZone[]> => {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("delivery_zones")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as DeliveryZone[];
});

export async function getApprovedReviews(limit = 6): Promise<Review[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("reviews")
    .select("id, first_name, city, rating, comment, created_at")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Review[];
}
