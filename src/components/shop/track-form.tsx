"use client";

import { useActionState } from "react";
import { trackOrder } from "@/actions/order";
import { OrderSummary } from "./order-summary";

export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrder, undefined);

  return (
    <>
      <form action={action} className="card mt-8 grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <label htmlFor="number" className="label">Numéro de commande</label>
          <input id="number" name="number" className="input" placeholder="CMD-2026-0001" required autoComplete="off" />
        </div>
        <div>
          <label htmlFor="phone" className="label">Téléphone</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" className="input" placeholder="6 94 42 57 25" required autoComplete="tel" />
        </div>
        <button type="submit" className="btn btn-primary sm:col-span-2" disabled={pending}>
          {pending ? "Recherche…" : "Suivre ma commande"}
        </button>
      </form>
      <div aria-live="polite" className="mt-6">
        {state?.error && <p role="alert" className="rounded-xl bg-error-soft p-4 text-sm font-semibold text-danger">{state.error}</p>}
        {state?.order && <OrderSummary order={state.order} />}
      </div>
    </>
  );
}
