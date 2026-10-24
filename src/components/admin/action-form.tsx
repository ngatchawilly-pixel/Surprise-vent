"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/actions/admin";

/** Formulaire relié à une Server Action qui renvoie { error } : l'erreur s'affiche en haut du formulaire. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} encType="multipart/form-data" className={className}>
      {state?.error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-error-soft p-4 text-sm font-semibold text-danger">
          {state.error}
        </div>
      )}
      {children}
    </form>
  );
}

export function SubmitButton({ children, pendingLabel = "Enregistrement…" }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
