import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { ProductImage } from "@/components/shop/product-image";
import { Icon, WhatsAppIcon, type IconName } from "@/components/ui/icons";
import { getApprovedReviews, getCategories, getProducts, getSettings } from "@/lib/data";
import { formatFcfa, whatsappLink } from "@/lib/format";

export const revalidate = 60;

const OCCASIONS = [
  { emoji: "❤️", label: "Mon/ma partenaire", hint: "Box Love & surprises", href: "/boutique?categorie=box-cadeaux" },
  { emoji: "🎂", label: "Un anniversaire", hint: "Packs & gâteaux", href: "/boutique?categorie=packs" },
  { emoji: "👩", label: "Maman", hint: "Fleurs & attentions", href: "/boutique?categorie=fleurs" },
  { emoji: "👨", label: "Papa", hint: "Paniers & cadeaux", href: "/boutique?categorie=box-cadeaux" },
  { emoji: "💍", label: "Ma demande en mariage", hint: "Animation & mise en scène", href: "/boutique?categorie=animation" },
  { emoji: "🙏", label: "Demander pardon", hint: "Fleurs & chocolats", href: "/boutique?categorie=chocolats" },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "gift", title: "Choisissez", text: "Parcourez les cadeaux, box et packs, avec les prix affichés." },
  { icon: "sparkle", title: "Personnalisez", text: "Prénom, message, couleur, photo et options live." },
  { icon: "lock", title: "Payez", text: "Mobile Money (MTN, Orange), carte ou acompte." },
  { icon: "truck", title: "Nous livrons", text: "Livraison à Yaoundé et Douala, à la date choisie." },
];

export default async function HomePage() {
  const [settings, categories, featured, packs, reviews] = await Promise.all([
    getSettings(),
    getCategories(),
    getProducts({ featuredOnly: true, limit: 8 }),
    getProducts({ packsOnly: true, limit: 4 }),
    getApprovedReviews(3),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface-cream">
        <div className="pointer-events-none absolute -right-32 -top-24 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-secondary-fixed/50 via-surface-rose to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-1/2 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-gold-light/30 to-transparent blur-3xl" />

        <div className="container-page relative grid items-center gap-12 py-12 md:py-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-surface-rose px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
              Surprises à Yaoundé &amp; Douala
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-[56px]">
              Transformez vos sentiments en une{" "}
              <em className="text-primary">surprise inoubliable</em> ❤️
            </h1>
            <p className="mt-4 flex items-center gap-3 font-serif text-xl italic text-secondary">
              <span className="h-0.5 w-8 bg-secondary-container" />« Tu choisis l&apos;émotion, nous créons la surprise »
            </p>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
              Bouquets d&apos;argent, roses fraîches, Box Love, gâteaux et animations live — créés sur mesure et
              livrés à <strong>Yaoundé</strong> et <strong>Douala</strong>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/boutique" className="btn btn-primary">
                <Icon name="gift" size={20} /> Découvrir nos cadeaux <Icon name="arrow" size={18} />
              </Link>
              <Link href="/boutique?categorie=packs" className="btn btn-outline">
                Voir les packs
              </Link>
              <a
                href={whatsappLink(settings.whatsapp_number, "Bonjour Surprise évent & haid, je souhaite commander une surprise.")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-wa-soft self-center"
              >
                <WhatsAppIcon size={18} /> {settings.phone_display}
              </a>
            </div>
            <ul className="mt-8 grid max-w-xl gap-3 text-sm text-ink-soft sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <Icon name="shield" size={18} className="text-primary" /> Paiement sécurisé
              </li>
              <li className="flex items-center gap-2">
                <Icon name="truck" size={18} className="text-primary" /> Livraison à domicile
              </li>
              <li className="flex items-center gap-2">
                <Icon name="heart" size={18} className="text-primary" /> Personnalisé
              </li>
            </ul>
          </div>

          <div className="relative lg:col-span-5">
            <div className="grid grid-cols-2 gap-4">
              {(featured.length ? featured.slice(0, 4) : []).map((p, i) => (
                <Link
                  key={p.id}
                  href={`/boutique/${p.slug}`}
                  className={`card overflow-hidden transition-transform hover:-translate-y-1 ${i % 2 ? "translate-y-6" : ""}`}
                >
                  <div className="relative aspect-[4/5]">
                    <ProductImage src={p.images[0]} alt={p.name} emoji={p.category?.emoji} priority={i < 2} sizes="(min-width:1024px) 20vw, 45vw" />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 font-serif text-sm font-semibold">{p.name}</p>
                    <p className="text-sm font-bold text-primary">{formatFcfa(p.base_price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Occasions */}
      <section className="container-page py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Le sélecteur d&apos;émotions</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Je veux faire plaisir à…</h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {OCCASIONS.map((o) => (
            <li key={o.label}>
              <Link
                href={o.href}
                className="card flex h-full flex-col items-center gap-1 p-4 text-center transition-all hover:-translate-y-1 hover:border-primary-container/40 hover:shadow-raised"
              >
                <span className="text-3xl" aria-hidden="true">{o.emoji}</span>
                <span className="text-sm font-bold leading-tight">{o.label}</span>
                <span className="text-xs text-ink-soft">{o.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Collections */}
      {categories.length > 0 && (
        <section className="bg-surface-rose/60 py-14">
          <div className="container-page">
            <h2 className="text-center text-3xl font-semibold sm:text-4xl">Explorez nos collections</h2>
            <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/boutique?categorie=${c.slug}`}
                    className="card group flex h-full flex-col gap-2 p-5 transition-all hover:-translate-y-1 hover:shadow-raised"
                  >
                    <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
                    <span className="font-serif text-lg font-semibold group-hover:text-primary">{c.name}</span>
                    {c.description && <span className="line-clamp-2 text-sm text-ink-soft">{c.description}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Express */}
      <section className="container-page py-10">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-gold/30 bg-warn-bg px-6 py-6 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <Icon name="clock" size={28} className="mt-1 shrink-0 text-warn-ink" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-warn-ink">Réservez au moins {settings.lead_days} jours à l&apos;avance</h2>
              <p className="mt-1 text-sm text-warn-ink/90">
                Chaque création est préparée à la main. Besoin d&apos;une surprise plus tôt ? Une prestation express est
                possible selon disponibilité, avec supplément.
              </p>
            </div>
          </div>
          <a
            href={whatsappLink(settings.whatsapp_number, "Bonjour, je souhaite une prestation express.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-wa-soft shrink-0"
          >
            <WhatsAppIcon size={18} /> Demander l&apos;express
          </a>
        </div>
      </section>

      {/* Packs */}
      {packs.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Nos formules les plus aimées</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Packs signatures &amp; anniversaires</h2>
            </div>
            <Link href="/boutique?categorie=packs" className="hidden text-sm font-semibold text-primary hover:underline sm:block">
              Tous les packs →
            </Link>
          </div>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {packs.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sélection */}
      {featured.length > 0 && (
        <section className="container-page py-10">
          <h2 className="text-3xl font-semibold sm:text-4xl">Nos coups de cœur</h2>
          <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comment ça marche */}
      <section className="container-page py-14">
        <h2 className="text-center text-3xl font-semibold sm:text-4xl">Comment ça marche</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-rose text-primary">
                <Icon name={s.icon} size={22} />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-secondary">Étape {i + 1}</p>
              <h3 className="mt-1 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Avis (uniquement des avis réels validés) */}
      {reviews.length > 0 && (
        <section className="container-page py-6">
          <h2 className="text-center text-3xl font-semibold sm:text-4xl">Ce que nos clients disent</h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="card p-6">
                <p className="text-gold" aria-label={`${r.rating} sur 5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-surface-high">{"★".repeat(5 - r.rating)}</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed">« {r.comment} »</p>
                <p className="mt-4 text-sm font-semibold">
                  {r.first_name}
                  {r.city && <span className="font-normal text-ink-soft"> · {r.city}</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
