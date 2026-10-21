"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { placeOrder } from "@/actions/order";
import { Icon } from "@/components/ui/icons";
import { CITY_LABEL, PAYMENT_METHOD_LABEL, formatFcfa } from "@/lib/format";
import { checkLeadTime, earliestDeliveryDate } from "@/lib/rules";
import { createClient } from "@/lib/supabase/client";
import type { City, DeliveryZone, PaymentMethod, SiteSettings } from "@/lib/types";
import { cartSubtotal, useCart } from "@/store/cart";
import { useHydrated } from "./cart-button";

const SLOTS = ["Matin (9h – 12h)", "Après-midi (12h – 17h)", "Soirée romantique (18h – 21h)"];

const PAYMENTS: { value: PaymentMethod; hint: string }[] = [
  { value: "mtn_momo", hint: "Paiement par transfert MTN Mobile Money" },
  { value: "orange_money", hint: "Paiement par transfert Orange Money" },
  { value: "deposit_cod", hint: "50 % maintenant, le reste à la livraison" },
  { value: "cash_on_delivery", hint: "Vous réglez en main propre à la livraison" },
  { value: "card", hint: "Visa / Mastercard (bientôt disponible)" },
];

interface Props {
  zones: DeliveryZone[];
  settings: SiteSettings;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({ zones, settings }: Props) {
  const hydrated = useHydrated();
  const { lines } = useCart();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [city, setCity] = useState<City>("yaounde");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState(SLOTS[2]);
  const [express, setExpress] = useState(false);
  const [instructions, setInstructions] = useState("");

  const [payment, setPayment] = useState<PaymentMethod>("mtn_momo");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const cityZones = useMemo(() => zones.filter((z) => z.city === city), [zones, city]);
  const zone = cityZones.find((z) => z.district === district) ?? cityZones.find((z) => z.is_other) ?? null;

  const subtotal = cartSubtotal(lines);
  const deliveryFee = zone?.fee ?? 0;
  const expressFee = express ? settings.express_fee : 0;
  const discount = promo ? Math.min(promo.discount, subtotal) : 0;
  const total = subtotal - discount + deliveryFee + expressFee;
  const dueNow = payment === "deposit_cod" ? Math.ceil(total / 2) : payment === "cash_on_delivery" ? 0 : total;

  const minDate = earliestDeliveryDate(settings.lead_days, express);
  const lead = date ? checkLeadTime(date, settings.lead_days, express) : null;
  const tooSoon = lead && !lead.ok;

  async function applyPromo() {
    setPromoError(null);
    const code = promoInput.trim();
    if (!code) return;
    const { data } = await createClient().rpc("validate_promo", { p_code: code, p_subtotal: subtotal });
    if (data?.valid) setPromo({ code: code.toUpperCase(), discount: data.discount, label: data.label });
    else {
      setPromo(null);
      setPromoError("Code promo invalide ou expiré.");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (tooSoon) {
      setErrors({ "delivery.date": "Date trop proche : réservez 2 jours à l'avance ou choisissez « express »." });
      return;
    }
    startTransition(async () => {
      const result = await placeOrder({
        customer: { name, phone, whatsapp, email, anonymous },
        recipient: { name: recipientName, phone: recipientPhone },
        delivery: {
          city,
          district: zone?.district ?? district,
          address,
          date,
          slot,
          express,
          instructions,
        },
        payment_method: payment,
        promo_code: promo?.code,
        items: lines.map((l) => ({
          product_id: l.productId,
          variant_id: l.variantId,
          quantity: l.quantity,
          addon_ids: l.addons.map((a) => a.id),
          customization: l.customization,
        })),
      });
      // En cas de succès, l'action redirige : on n'arrive ici qu'en cas d'erreur.
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  if (!hydrated) return <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface-low" aria-hidden="true" />;

  if (lines.length === 0) {
    return (
      <div className="card mx-auto mt-8 max-w-xl p-10 text-center">
        <p className="font-serif text-xl">Votre panier est vide.</p>
        <Link href="/boutique" className="btn btn-primary mt-5">Choisir un cadeau</Link>
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const inv = (k: string) => (errors[k] ? true : undefined);

  return (
    <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {formError && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-error-soft p-4 text-sm font-semibold text-danger">
            {formError}
          </div>
        )}

        {/* 1 */}
        <section className="card p-6" aria-labelledby="s1">
          <h2 id="s1" className="font-serif text-xl font-semibold">1 · Vos coordonnées</h2>
          <p className="text-sm text-ink-soft">L&apos;expéditeur et commanditaire de la surprise.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="c-name" label="Nom complet *" error={err("customer.name")}>
              <input id="c-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={inv("customer.name")} aria-describedby="c-name-error" />
            </Field>
            <Field id="c-phone" label="Téléphone *" error={err("customer.phone")} hint="Ex : 6 94 42 57 25">
              <input id="c-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={inv("customer.phone")} aria-describedby="c-phone-error" />
            </Field>
            <Field id="c-wa" label="WhatsApp (photos & vidéos de la réaction)" error={err("customer.whatsapp")}>
              <input id="c-wa" className="input" type="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} aria-invalid={inv("customer.whatsapp")} aria-describedby="c-wa-error" />
            </Field>
            <Field id="c-email" label="E-mail (confirmation)" error={err("customer.email")}>
              <input id="c-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={inv("customer.email")} aria-describedby="c-email-error" />
            </Field>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-surface-rose p-4">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-primary-container)]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            <span>
              <span className="block text-sm font-semibold">Garder mon identité secrète</span>
              <span className="block text-xs text-ink-soft">Nous ne dévoilerons jamais votre nom au destinataire.</span>
            </span>
          </label>
        </section>

        {/* 2 */}
        <section className="card p-6" aria-labelledby="s2">
          <h2 id="s2" className="font-serif text-xl font-semibold">2 · Destinataire &amp; livraison</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="r-name" label="Nom du destinataire *" error={err("recipient.name")}>
              <input id="r-name" className="input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} aria-invalid={inv("recipient.name")} aria-describedby="r-name-error" />
            </Field>
            <Field id="r-phone" label="Téléphone joignable le jour J *" error={err("recipient.phone")}>
              <input id="r-phone" className="input" type="tel" inputMode="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} aria-invalid={inv("recipient.phone")} aria-describedby="r-phone-error" />
            </Field>
          </div>

          <fieldset className="mt-5">
            <legend className="label">Ville *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["yaounde", "douala"] as City[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={city === c}
                  onClick={() => {
                    setCity(c);
                    setDistrict("");
                  }}
                  className={`min-h-12 rounded-lg border-2 px-4 text-sm font-semibold transition-colors ${city === c ? "border-primary-container bg-surface-rose text-primary" : "border-surface-container hover:border-outline-soft"}`}
                >
                  <Icon name="pin" size={16} className="mr-1 inline" /> {CITY_LABEL[c]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="label">Quartier *</legend>
            <div className="flex flex-wrap gap-2">
              {cityZones.map((z) => (
                <button key={z.id} type="button" className="chip" aria-pressed={zone?.id === z.id} onClick={() => setDistrict(z.district)}>
                  {z.district}
                </button>
              ))}
            </div>
            {zone && <p className="mt-2 text-xs text-ink-soft">Frais de livraison : {formatFcfa(zone.fee)}</p>}
            {err("delivery.district") && <p role="alert" className="mt-1 text-xs font-semibold text-danger">{err("delivery.district")}</p>}
          </fieldset>

          <div className="mt-5">
            <Field id="d-address" label="Adresse exacte & repère *" error={err("delivery.address")}>
              <textarea id="d-address" className="input !min-h-24" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex : carrefour Acacias, 2e portail blanc à gauche…" aria-invalid={inv("delivery.address")} aria-describedby="d-address-error" />
            </Field>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-surface-low p-4">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-primary-container)]" checked={express} onChange={(e) => setExpress(e.target.checked)} />
            <span>
              <span className="block text-sm font-semibold">
                Commande express {settings.express_fee > 0 && `(+ ${formatFcfa(settings.express_fee)})`}
              </span>
              <span className="block text-xs text-ink-soft">
                Prestation express disponible selon disponibilité. Elle sera signalée comme urgente à l&apos;équipe.
              </span>
            </span>
          </label>

          <div className="mt-4 rounded-xl bg-warn-bg p-4 text-warn-ink">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Icon name="calendar" size={18} /> Règle de confection : {settings.lead_days} jours minimum à l&apos;avance
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field id="d-date" label="Date de livraison *" error={err("delivery.date")}>
                <input id="d-date" type="date" className="input" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={inv("delivery.date") || (tooSoon ? true : undefined)} aria-describedby="d-date-error" />
              </Field>
              <Field id="d-slot" label="Créneau">
                <select id="d-slot" className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>
                  {SLOTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            {tooSoon && (
              <p role="alert" className="mt-3 text-sm font-semibold">
                ⚠️ Cette commande est trop proche de la date souhaitée. Cochez « Commande express » ou contactez-nous au {settings.phone_display}.
              </p>
            )}
          </div>

          <div className="mt-5">
            <Field id="d-instr" label="Instructions discrètes (optionnel)">
              <textarea id="d-instr" className="input !min-h-20" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ex : prétexter une remise de colis…" />
            </Field>
          </div>
        </section>

        {/* 3 */}
        <section className="card p-6" aria-labelledby="s3">
          <h2 id="s3" className="font-serif text-xl font-semibold">3 · Paiement</h2>
          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Mode de paiement</legend>
            {PAYMENTS.map((p) => {
              const disabled = p.value === "card";
              return (
                <label
                  key={p.value}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${payment === p.value ? "border-primary-container bg-surface-rose" : "border-surface-container"}`}
                >
                  <input type="radio" name="payment" className="mt-1 h-5 w-5 accent-[var(--color-primary-container)]" disabled={disabled} checked={payment === p.value} onChange={() => setPayment(p.value)} />
                  <span>
                    <span className="block text-sm font-semibold">{PAYMENT_METHOD_LABEL[p.value]}</span>
                    <span className="block text-xs text-ink-soft">{p.hint}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <p className="mt-3 text-xs text-ink-soft">
            Après validation, vous recevez les instructions de paiement et votre numéro de commande.
          </p>
        </section>
      </div>

      {/* Récapitulatif */}
      <aside className="lg:col-span-5">
        <div className="card p-6 lg:sticky lg:top-32">
          <h2 className="font-serif text-xl font-semibold">Récapitulatif</h2>
          <ul className="mt-4 divide-y divide-surface-container text-sm">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3 py-2.5">
                <span>
                  {l.quantity} × {l.name}
                  {l.variantName && <span className="text-ink-soft"> · {l.variantName}</span>}
                  {l.addons.length > 0 && <span className="block text-xs text-ink-soft">+ {l.addons.map((a) => a.name).join(", ")}</span>}
                </span>
                <span className="shrink-0 font-semibold">{formatFcfa(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <label htmlFor="promo" className="sr-only">Code promo</label>
            <input id="promo" className="input !min-h-11" placeholder="Code promo" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
            <button type="button" className="btn btn-outline !min-h-11 !px-4" onClick={applyPromo}>Appliquer</button>
          </div>
          {promoError && <p role="alert" className="mt-1 text-xs font-semibold text-danger">{promoError}</p>}
          {promo && <p className="mt-1 text-xs font-semibold text-ok">✓ {promo.label}</p>}

          <dl className="mt-4 space-y-2 border-t border-surface-container pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Sous-total</dt><dd>{formatFcfa(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-ok"><dt>Remise</dt><dd>− {formatFcfa(discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-soft">Livraison {zone ? `(${zone.district})` : ""}</dt><dd>{zone ? formatFcfa(deliveryFee) : "—"}</dd></div>
            {expressFee > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Supplément express</dt><dd>{formatFcfa(expressFee)}</dd></div>}
            <div className="flex items-end justify-between border-t border-surface-container pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-2xl font-bold text-primary">{formatFcfa(total)}</dd>
            </div>
            {dueNow !== total && (
              <div className="flex justify-between text-ink-soft"><dt>À régler maintenant</dt><dd className="font-semibold text-ink">{formatFcfa(dueNow)}</dd></div>
            )}
          </dl>
          <p className="mt-2 text-xs text-ink-soft">Le montant final est confirmé par le serveur à la validation.</p>

          <button type="submit" className="btn btn-primary mt-5 w-full" disabled={pending}>
            <Icon name="lock" size={16} /> {pending ? "Validation en cours…" : `Confirmer la commande · ${formatFcfa(total)}`}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-soft">
            <Icon name="shield" size={14} /> Données protégées · Discrétion garantie
          </p>
        </div>
      </aside>
    </form>
  );
}
