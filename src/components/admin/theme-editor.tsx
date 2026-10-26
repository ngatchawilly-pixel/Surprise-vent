"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { resetTheme, saveTheme } from "@/actions/admin";
import { THEME_PRESETS, contrastRatio, themeVariables, type Theme } from "@/lib/theme";

const FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: "primary", label: "Couleur principale", hint: "Boutons, prix, liens, bandeau" },
  { key: "secondary", label: "Couleur secondaire", hint: "Accents, étiquettes, citations" },
  { key: "gold", label: "Couleur dorée", hint: "Badges premium, étoiles" },
];

function Buttons({ changed }: { changed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <button type="submit" className="btn btn-primary" disabled={pending || !changed}>
        {pending ? "Enregistrement…" : "Enregistrer les couleurs"}
      </button>
      <button type="submit" formAction={resetTheme} formNoValidate className="btn btn-ghost" disabled={pending}>
        Revenir aux couleurs d&apos;origine
      </button>
    </div>
  );
}

export function ThemeEditor({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const [state, action] = useActionState(saveTheme, undefined);

  const changed = (Object.keys(theme) as (keyof Theme)[]).some((k) => theme[k] !== initial[k]);
  const primaryContrast = contrastRatio(theme.primary, "#ffffff");
  const secondaryContrast = contrastRatio(theme.secondary, "#ffffff");

  // L'aperçu applique les mêmes variables que le site, limitées à ce bloc.
  const previewVars = themeVariables(theme) as React.CSSProperties;

  return (
    <form action={action} className="card p-6">
      <h2 className="font-serif text-xl font-semibold">Apparence · couleurs du site</h2>
      <p className="mt-1 text-sm text-ink-soft">Choisissez une palette ou 3 couleurs libres : les nuances (survol, fonds clairs) sont calculées automatiquement.</p>

      <fieldset className="mt-5">
        <legend className="label">Palettes proposées (cliquez pour essayer)</legend>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_PRESETS.map((p) => {
            const active = p.primary === theme.primary && p.secondary === theme.secondary && p.gold === theme.gold;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme({ primary: p.primary, secondary: p.secondary, gold: p.gold })}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${active ? "border-primary-container bg-surface-rose" : "border-surface-container hover:border-outline-soft"}`}
                >
                  <span className="flex shrink-0 -space-x-2" aria-hidden="true">
                    {[p.primary, p.secondary, p.gold].map((c, i) => (
                      <span key={i} className="h-8 w-8 rounded-full ring-2 ring-white" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight">{p.name}{active && " ✓"}</span>
                    <span className="block text-xs leading-snug text-ink-soft">{p.mood}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-ink-soft">Une palette remplit les 3 couleurs ci-dessous : vous pouvez ensuite les ajuster librement. Rien n&apos;est appliqué au site avant « Enregistrer ».</p>
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`theme-${f.key}`} className="label">{f.label}</label>
            <div className="flex items-center gap-3">
              <input
                id={`theme-${f.key}`}
                name={f.key}
                type="color"
                value={theme[f.key]}
                onChange={(e) => setTheme((t) => ({ ...t, [f.key]: e.target.value.toLowerCase() }))}
                className="h-12 w-16 cursor-pointer rounded-lg border-2 border-surface-container bg-white p-1"
              />
              <code className="text-sm font-semibold uppercase">{theme[f.key]}</code>
            </div>
            <p className="mt-1 text-xs text-ink-soft">{f.hint}</p>
          </div>
        ))}
      </div>

      {primaryContrast < 4.5 && (
        <p role="alert" className="mt-4 rounded-lg bg-warn-bg p-3 text-sm font-semibold text-warn-ink">
          ⚠️ La couleur principale est trop claire : le texte blanc des boutons sera difficile à lire (contraste {primaryContrast.toFixed(1)}:1, 4,5 minimum recommandé).
        </p>
      )}
      {secondaryContrast < 3 && (
        <p role="alert" className="mt-3 rounded-lg bg-warn-bg p-3 text-sm font-semibold text-warn-ink">
          ⚠️ La couleur secondaire est très claire : les textes qui l&apos;utilisent seront peu visibles sur fond blanc.
        </p>
      )}

      <div className="mt-6">
        <p className="label">Aperçu</p>
        <div style={previewVars} className="rounded-2xl border border-surface-container p-5" aria-label="Aperçu des couleurs">
          <p className="font-serif text-2xl font-semibold">
            Une <em style={{ color: "var(--color-primary)" }}>surprise inoubliable</em>
          </p>
          <p className="mt-1 font-serif italic" style={{ color: "var(--color-secondary)" }}>« Tu choisis l&apos;émotion, nous créons la surprise »</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--color-primary-container)" }}>Commander</span>
            <span className="rounded-lg border-[1.5px] px-5 py-2.5 text-sm font-semibold" style={{ borderColor: "var(--color-primary-container)", color: "var(--color-primary-container)" }}>Voir les packs</span>
            <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white" style={{ background: "var(--color-primary)" }}>Best-seller</span>
            <span className="rounded-full px-3 py-1 text-xs font-bold uppercase" style={{ background: "var(--color-gold-light)", color: "#5b3a00", border: "1px solid var(--color-gold)" }}>Premium</span>
            <span className="text-lg font-bold" style={{ color: "var(--color-primary-container)" }}>25 000 FCFA</span>
          </div>
          <div className="mt-4 rounded-xl p-3 text-sm" style={{ background: "var(--color-surface-rose)" }}>Fond clair des cartes et des sections</div>
        </div>
      </div>

      <div className="mt-6">
        <Buttons changed={changed} />
        <p role="status" className="mt-3 min-h-5 text-sm font-semibold">
          {state?.saved && <span className="text-ok">✓ Couleurs enregistrées. Le site se met à jour en moins d&apos;une minute.</span>}
          {state?.error && <span className="text-danger">{state.error}</span>}
        </p>
        {changed && !state?.saved && <p className="text-xs text-ink-soft">Modifications non enregistrées.</p>}
      </div>
    </form>
  );
}
