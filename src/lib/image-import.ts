import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/** Erreur à afficher telle quelle à l'administrateur. */
export class UserError extends Error {}

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 15_000;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

/** Refuse les adresses internes (localhost, réseau privé, métadonnées cloud) : protection SSRF. */
async function assertPublicHttps(url: URL) {
  if (url.protocol !== "https:") throw new UserError("Le lien doit commencer par https://");
  if (url.port && url.port !== "443") throw new UserError("Port non autorisé dans le lien.");
  if (net.isIP(url.hostname)) throw new UserError("Utilisez un nom de site, pas une adresse IP.");
  let addrs: { address: string }[];
  try {
    addrs = await lookup(url.hostname, { all: true });
  } catch {
    throw new UserError(`Site introuvable : ${url.hostname}`);
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new UserError("Ce lien pointe vers une adresse non autorisée.");
  }
}

/** Télécharge une image publique (https) en suivant au plus 3 redirections, avec limites de taille et de durée. */
export async function fetchRemoteImage(rawUrl: string): Promise<{ bytes: Uint8Array; type: string; ext: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new UserError(`Lien invalide : ${rawUrl.slice(0, 80)}`);
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttps(url);

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "image/avif,image/webp,image/*", "User-Agent": "Mozilla/5.0 (compatible; SurpriseEventBot/1.0)" },
      });
    } catch {
      throw new UserError(`Impossible de télécharger l'image : ${url.hostname}`);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new UserError("Redirection invalide.");
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) throw new UserError(`Le site a refusé le téléchargement (erreur ${res.status}) : ${url.hostname}`);

    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = IMAGE_TYPES[type];
    if (!ext) throw new UserError("Ce lien n'est pas une image JPG, PNG, WebP ou AVIF (collez le lien direct de l'image).");

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_IMAGE_BYTES) throw new UserError("Image trop lourde (5 Mo maximum).");

    // Lecture en flux avec plafond, au cas où content-length serait absent ou faux.
    const reader = res.body?.getReader();
    if (!reader) throw new UserError("Réponse vide.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new UserError("Image trop lourde (5 Mo maximum).");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.byteLength;
    }
    if (bytes.byteLength < 512) throw new UserError("Image invalide ou vide.");
    return { bytes, type, ext };
  }
  throw new UserError("Trop de redirections.");
}
