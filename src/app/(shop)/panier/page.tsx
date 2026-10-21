import type { Metadata } from "next";
import { CartView } from "@/components/shop/cart-view";

export const metadata: Metadata = { title: "Mon panier", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">Mon panier</h1>
      <CartView />
    </div>
  );
}
