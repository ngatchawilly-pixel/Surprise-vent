// Types du domaine, alignés sur supabase/migrations/0001_schema.sql.

export type City = "yaounde" | "douala";
export type StockStatus = "available" | "limited" | "out_of_stock";
export type PriceMode = "fixed" | "from" | "custom_amount";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod =
  | "mtn_momo"
  | "orange_money"
  | "card"
  | "deposit_cod"
  | "cash_on_delivery";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Variant {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  price: number;
  is_recommended: boolean;
  sort_order: number;
}

export interface Addon {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string | null;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_mode: PriceMode;
  base_price: number;
  compare_at_price: number | null;
  images: string[];
  badge: string | null;
  composition: string[];
  is_pack: boolean;
  /** Le prix inclut déjà le déplacement (packs anniversaire) ; absent tant que la migration 0004 n'est pas appliquée. */
  delivery_included?: boolean;
  stock: StockStatus;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  category?: Pick<Category, "slug" | "name" | "emoji"> | null;
}

export interface ProductDetail extends Product {
  variants: Variant[];
  addons: Addon[];
}

export interface DeliveryZone {
  id: string;
  city: City;
  district: string;
  fee: number;
  is_other: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Review {
  id: string;
  first_name: string;
  city: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

export interface SiteSettings {
  whatsapp_number: string;
  phone_display: string;
  lead_days: number;
  express_fee: number;
  announcement: string;
  address_yaounde: string;
  address_douala: string;
}

export interface Customization {
  recipient_name?: string;
  occasion?: string;
  message?: string;
  color?: string;
  photo_path?: string;
  amount?: number;
}

export interface OrderRow {
  id: string;
  number: string;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp: string | null;
  customer_email: string | null;
  anonymous_sender: boolean;
  recipient_name: string;
  recipient_phone: string;
  city: City;
  district: string;
  address: string;
  delivery_date: string;
  delivery_slot: string | null;
  is_express: boolean;
  instructions: string | null;
  subtotal: number;
  delivery_fee: number;
  express_fee: number;
  discount: number;
  total: number;
  deposit_due: number;
  promo_code: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  customization: Customization;
  addons: { id: string; name: string; price: number }[];
  line_total: number;
}

export interface OrderEventRow {
  id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

/** Vue publique d'une commande (fonctions track_order / order_by_token). */
export interface PublicOrder {
  number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: number;
  deposit_due: number;
  delivery_date: string;
  city: City;
  district: string;
  is_express: boolean;
  payment_method: PaymentMethod;
  items: { name: string; variant: string | null; quantity: number; line_total: number }[];
  events: { status: OrderStatus; note: string | null; at: string }[];
}
