"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { formatFcfa, whatsappLink } from "@/lib/format";
import { MIN_CUSTOM_AMOUNT, priceLabel, unitPrice } from "@/lib/rules";
import { createClient } from "@/lib/supabase/client";
import type { ProductDetail } from "@/lib/types";
import { useCart } from "@/store/cart";

const OCCASIONS = [
  "Anniversaire",
  "Anniversaire de couple",
  "Déclaration d'amour",
  "Excuses",
  "Demande en mariage",
  "Félicitations",
  "Fête spéciale",
  "Autre",
];
const COLORS = ["Rose", "Rouge", "Bleu", "Blanc", "Noir & doré", "Autre"];
const MAX_PHOTO = 8 * 1024 * 1024;

interface Props {
  product: ProductDetail;
  whatsappNumber: string;
}

export function ProductConfigurator({ product, whatsappNumber }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const uid = useId();

  const recommended = product.variants.find((v) => v.is_recommended) ?? product.variants[0] ?? null;
  const [variantId, setVariantId] = useState<string | null>(recommended?.id ?? null);
  const [amount, setAmount] = useState<number>(10000);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const isCustomAmount = product.price_mode === "custom_amount";
  const amountValid = !isCustomAmount || (Number.isFinite(amount) && amount >= MIN_CUSTOM_AMOUNT);
  const soldOut = product.stock === "out_of_stock";

  const selectedAddons = useMemo(
    () => product.addons.filter((a) => addonIds.includes(a.id)),
    [product.addons, addonIds],
  );
  const unit = unitPrice(product, variant, isCustomAmount ? amount : 0) + selectedAddons.reduce((n, a) => n + a.price, 0);
  const total = unit * quantity;

  async function onPhoto(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setPhotoError("Formats acceptés : JPG, PNG ou WebP.");
    if (file.size > MAX_PHOTO) return setPhotoError("Photo trop lourde (8 Mo maximum).");
    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("customer-photos").upload(path, file, { contentType: file.type });
      if (error) throw error;
      setPhotoPath(path);
      setPhotoName(file.name);
    } catch {
      setPhotoError("Le téléversement a échoué. Réessayez ou envoyez la photo sur WhatsApp.");
    } finally {
      setUploading(false);
    }
  }

  function addToCart(): boolean {
    if (!amountValid || soldOut || uploading) return false;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] ?? null,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      unitPrice: unit,
      quantity,
      addons: selectedAddons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
      customization: {
        recipient_name: recipient.trim() || undefined,
        occasion: occasion || undefined,
        message: message.trim() || undefined,
        color: color || undefined,
        photo_path: photoPath ?? undefined,
        amount: isCustomAmount ? amount : undefined,
      },
    });
    return true;
  }

  const label = priceLabel(product);

  return (
    <div className="space-y-6">
      {/* Prix */}
      <div className="rounded-xl bg-surface-rose p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {variant || isCustomAmount ? "Prix total personnalisé" : (label ?? "Prix")}
        </p>
        <p className="mt-1 font-sans text-3xl font-bold text-primary">{formatFcfa(total)}</p>
        {isCustomAmount && (
          <p className="mt-1 text-xs text-ink-soft">
            Frais de confection ({formatFcfa(product.base_price)}) + montant offert.
          </p>
        )}
      </div>

      {/* Formules */}
      {product.variants.length > 0 && (
        <fieldset className="card p-5">
          <legend className="px-1 font-serif text-lg font-semibold">1 · Choisissez la formule</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {product.variants.map((v) => (
              <label
                key={v.id}
                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container ${
                  variantId === v.id ? "border-primary-container bg-surface-rose" : "border-surface-container hover:border-outline-soft"
                }`}
              >
                <input type="radio" name={`${uid}-variant`} className="sr-only" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                {v.is_recommended && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Recommandé
                  </span>
                )}
                <span className="block font-serif text-lg font-semibold">{v.name}</span>
                <span className="block text-sm font-bold text-primary">{formatFcfa(v.price)}</span>
                {v.description && <span className="mt-1 block text-xs text-ink-soft">{v.description}</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Montant bouquet d'argent */}
      {isCustomAmount && (
        <div className="card p-5">
          <label htmlFor={`${uid}-amount`} className="font-serif text-lg font-semibold">
            Montant du bouquet (FCFA)
          </label>
          <input
            id={`${uid}-amount`}
            type="number"
            inputMode="numeric"
            min={MIN_CUSTOM_AMOUNT}
            step={500}
            value={Number.isNaN(amount) ? "" : amount}
            onChange={(e) => setAmount(e.target.valueAsNumber)}
            aria-invalid={!amountValid}
            aria-describedby={`${uid}-amount-help`}
            className="input mt-3"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {[5000, 10000, 20000, 50000, 100000].map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={amount === v} onClick={() => setAmount(v)}>
                {formatFcfa(v)}
              </button>
            ))}
          </div>
          <p id={`${uid}-amount-help`} className={`mt-2 text-xs ${amountValid ? "text-ink-soft" : "text-danger"}`}>
            Minimum {formatFcfa(MIN_CUSTOM_AMOUNT)}.
          </p>
        </div>
      )}

      {/* Personnalisation */}
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-serif text-lg font-semibold">
          {product.variants.length > 0 ? "2" : "1"} · Personnalisation émotionnelle
        </legend>
        <div>
          <label htmlFor={`${uid}-rn`} className="label">Prénom du destinataire</label>
          <input id={`${uid}-rn`} className="input" maxLength={120} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Ex : Carine, Bébé chéri…" />
        </div>
        <div>
          <span className="label">Occasion</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Occasion">
            {OCCASIONS.map((o) => (
              <button key={o} type="button" className="chip" aria-pressed={occasion === o} onClick={() => setOccasion(occasion === o ? "" : o)}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor={`${uid}-msg`} className="label">
            Message sur la carte <span className="font-normal normal-case text-ink-soft">({message.length}/280)</span>
          </label>
          <textarea id={`${uid}-msg`} className="input" maxLength={280} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Les mots qui feront vibrer son cœur…" />
        </div>
        <div>
          <span className="label">Couleur souhaitée</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Couleur">
            {COLORS.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={color === c} onClick={() => setColor(color === c ? "" : c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Photo souvenir (optionnel)</span>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-outline-soft p-4 hover:bg-surface-rose has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container">
            <Icon name="upload" size={22} className="text-primary" />
            <span className="text-sm">
              {uploading ? "Téléversement…" : photoName ? `✓ ${photoName}` : "Importer une photo (JPG, PNG, WebP — 8 Mo max)"}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          {photoError && <p role="alert" className="mt-1 text-xs text-danger">{photoError}</p>}
        </div>
      </fieldset>

      {/* Options */}
      {product.addons.length > 0 && (
        <fieldset className="card p-5">
          <legend className="px-1 font-serif text-lg font-semibold">
            {product.variants.length > 0 ? "3" : "2"} · Effet grand spectacle (options)
          </legend>
          <div className="mt-3 space-y-2">
            {product.addons.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-low p-3.5 has-[:checked]:bg-surface-rose has-[:checked]:ring-2 has-[:checked]:ring-primary-container/40">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-[var(--color-primary-container)]"
                  checked={addonIds.includes(a.id)}
                  onChange={(e) => setAddonIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id)))}
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{a.emoji} {a.name}</span>
                  {a.description && <span className="block text-xs text-ink-soft">{a.description}</span>}
                </span>
                <span className="text-sm font-bold text-primary">+ {formatFcfa(a.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Actions */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="label !mb-0">Quantité</span>
          <div className="flex items-center rounded-lg border border-surface-high">
            <button type="button" aria-label="Diminuer la quantité" className="flex h-11 w-11 items-center justify-center hover:bg-surface-low" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Icon name="minus" size={16} />
            </button>
            <span className="w-10 text-center font-bold" aria-live="polite">{quantity}</span>
            <button type="button" aria-label="Augmenter la quantité" className="flex h-11 w-11 items-center justify-center hover:bg-surface-low" onClick={() => setQuantity((q) => Math.min(20, q + 1))}>
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="btn btn-primary sm:col-span-2"
            disabled={!amountValid || soldOut || uploading}
            onClick={() => {
              if (addToCart()) router.push("/commande");
            }}
          >
            <Icon name="heart" size={18} filled /> {soldOut ? "Indisponible" : `Commander · ${formatFcfa(total)}`}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={!amountValid || soldOut || uploading}
            onClick={() => {
              if (addToCart()) {
                setAdded(true);
                setTimeout(() => setAdded(false), 2500);
              }
            }}
          >
            <Icon name="bag" size={18} /> Ajouter au panier
          </button>
          <a
            className="btn btn-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            href={whatsappLink(
              whatsappNumber,
              `Bonjour Surprise évent & haid, je souhaite commander ${product.name}. Je voudrais avoir plus d'informations concernant la disponibilité et la livraison.`,
            )}
          >
            <Icon name="chat" size={18} /> Sur WhatsApp
          </a>
        </div>

        <p role="status" className="mt-3 min-h-5 text-center text-sm font-semibold text-ok">
          {added && (
            <>
              ✓ Ajouté au panier ·{" "}
              <Link href="/panier" className="underline">Voir le panier</Link>
            </>
          )}
        </p>
        <p className="mt-1 flex items-center justify-center gap-2 text-xs text-ink-soft">
          <Icon name="lock" size={14} /> Paiement sécurisé · Mobile Money, carte
        </p>
      </div>
    </div>
  );
}
