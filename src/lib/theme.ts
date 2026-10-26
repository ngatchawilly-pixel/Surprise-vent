// Thème du site : 3 couleurs de base réglables dans l'admin ; les nuances sont dérivées en CSS (color-mix).

export interface Theme {
  primary: string; // boutons, prix, liens
  secondary: string; // accents, étiquettes
  gold: string; // badges premium, étoiles
}

export const DEFAULT_THEME: Theme = {
  primary: "#be123c",
  secondary: "#aa304f",
  gold: "#f59e0b",
};

export interface ThemePreset extends Theme {
  id: string;
  name: string;
  mood: string;
}

/** Palettes prêtes à l'emploi. Toutes vérifiées : texte blanc sur la couleur principale ≥ 4,5:1 (WCAG AA). */
export const THEME_PRESETS: ThemePreset[] = [
  { id: "romantique", name: "Romantique", mood: "L'identité actuelle : amour, anniversaires", ...DEFAULT_THEME },
  { id: "octobre-rose", name: "Octobre Rose", mood: "Campagne rose, féminin et solaire", primary: "#be185d", secondary: "#db2777", gold: "#f59e0b" },
  { id: "bordeaux-or", name: "Bordeaux & Or", mood: "Premium, élégant, événements haut de gamme", primary: "#7f1d3a", secondary: "#9a6b12", gold: "#d4af37" },
  { id: "rose-poudre", name: "Rose poudré", mood: "Doux et raffiné, esprit boutique de fleurs", primary: "#a8456f", secondary: "#c0587f", gold: "#e0a96d" },
  { id: "prune-royale", name: "Prune royale", mood: "Audacieux et festif, mariages et demandes", primary: "#6d28d9", secondary: "#a21caf", gold: "#f59e0b" },
  { id: "emeraude-or", name: "Émeraude & Or", mood: "Luxe discret, cadeaux d'entreprise", primary: "#065f46", secondary: "#0f766e", gold: "#d4a017" },
  { id: "bleu-nuit", name: "Bleu nuit & Champagne", mood: "Chic et rassurant, fêtes du soir", primary: "#1e3a8a", secondary: "#4338ca", gold: "#c9a227" },
  { id: "corail", name: "Corail chaleureux", mood: "Convivial et énergique, fêtes de famille", primary: "#c2410c", secondary: "#be123c", gold: "#f59e0b" },
  { id: "fete-nationale", name: "Fête nationale", mood: "Vert, rouge, jaune du drapeau camerounais", primary: "#007a5e", secondary: "#ce1126", gold: "#fcd116" },
  { id: "noel", name: "Noël", mood: "Rouge et vert de fin d'année", primary: "#b91c1c", secondary: "#166534", gold: "#ca8a04" },
  { id: "noir-or", name: "Noir & Or", mood: "Prestige, minimaliste, très contrasté", primary: "#18181b", secondary: "#52525b", gold: "#d4af37" },
];

export const THEME_KEYS = {
  primary: "theme_primary",
  secondary: "theme_secondary",
  gold: "theme_gold",
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHexColor = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

/** Lit le thème depuis les réglages ; toute valeur invalide retombe sur la valeur par défaut (jamais injectée telle quelle). */
export function themeFromSettings(settings: Record<string, unknown>): Theme {
  const pick = (key: string, fallback: string) => {
    const v = settings[key];
    return isHexColor(v) ? v.toLowerCase() : fallback;
  };
  return {
    primary: pick(THEME_KEYS.primary, DEFAULT_THEME.primary),
    secondary: pick(THEME_KEYS.secondary, DEFAULT_THEME.secondary),
    gold: pick(THEME_KEYS.gold, DEFAULT_THEME.gold),
  };
}

export const isDefaultTheme = (t: Theme) =>
  t.primary === DEFAULT_THEME.primary && t.secondary === DEFAULT_THEME.secondary && t.gold === DEFAULT_THEME.gold;

/** Variables CSS dérivées des 3 couleurs (valeurs déjà validées par isHexColor). */
export function themeVariables(t: Theme): Record<string, string> {
  return {
    "--color-primary-container": t.primary,
    "--color-primary": `color-mix(in srgb, ${t.primary} 78%, #000)`,
    "--color-surface-rose": `color-mix(in srgb, ${t.primary} 5%, #fff)`,
    "--color-secondary": t.secondary,
    "--color-secondary-container": `color-mix(in srgb, ${t.secondary} 55%, #fff)`,
    "--color-secondary-fixed": `color-mix(in srgb, ${t.secondary} 22%, #fff)`,
    "--color-gold": t.gold,
    "--color-gold-light": `color-mix(in srgb, ${t.gold} 35%, #fff)`,
  };
}

/** Feuille de style injectée dans <head> ; vide si le thème est celui d'origine. */
export function themeCss(t: Theme): string {
  if (isDefaultTheme(t)) return "";
  const body = Object.entries(themeVariables(t))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  // html:root > :root en spécificité : l'ordre de chargement des feuilles n'a pas d'importance.
  return `html:root{${body}}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs hexadécimales (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
