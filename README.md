# Surprise évent & haid — boutique en ligne

Site e-commerce de cadeaux et surprises personnalisées (Yaoundé & Douala).
Cahier des charges : `../Cahier de charges surprise event.md` — périmètre **V1 / MVP** (section 47).
Maquettes : `../stitch_design_interface_application/` (design system « Romantic Opulence »).

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Front | **Next.js (App Router) + React + TypeScript** | SSR/ISR pour le SEO local (« cadeau anniversaire Yaoundé »), pages rapides sur mobile |
| UI | **Tailwind CSS v4** + tokens du design system | Cohérence avec les maquettes Stitch, bundle léger |
| État | Zustand (panier persistant) | Minimal, sans boilerplate |
| Formulaires | Server Actions + **Zod** | Même schéma de validation, sécurité côté serveur |
| Backend | **Supabase** : Postgres, Auth, Storage, RLS, fonctions SQL | Voir ci-dessous |

## Architecture

```
src/
  app/(shop)/      pages publiques (accueil, boutique, produit, panier, commande, suivi, contact)
  app/admin/       espace administrateur (protégé : proxy + requireAdmin + RLS)
  actions/         Server Actions (commande, auth, admin)
  components/      UI (shop/, admin/, ui/)
  lib/
    rules.ts       règles métier pures (règle des 2 jours, prix) — sans I/O
    validation.ts  schémas Zod partagés
    data.ts        lecture du catalogue (server-only, cache ISR 60 s)
    payments.ts    abstraction du paiement (V1 : Mobile Money manuel)
    supabase/      clients navigateur / serveur / public
  store/cart.ts    panier
supabase/
  migrations/      0001 schéma · 0002 RLS + storage · 0003 fonctions métier
  seed.sql         données de départ (prix du cahier des charges)
```

Principes :

- **La base est la source de vérité des montants.** `create_order()` (SQL, `security definer`)
  recalcule prix, options, livraison, express et remise ; le navigateur ne peut pas imposer un prix.
  Elle applique aussi la règle des 2 jours.
- **RLS partout.** Le public lit le catalogue ; `orders`, `payments`, `promotions` ne sont pas
  lisibles publiquement. Le suivi invité passe par `track_order()` (numéro + téléphone) et la page
  de confirmation par un jeton secret (`order_by_token()`).
- **Admin en profondeur** : `proxy.ts` (redirection) → `requireAdmin()` dans le layout *et* dans chaque
  Server Action → politiques RLS (`is_admin()`).
- **Mobile first**, images optimisées (`next/image`, AVIF/WebP), pas de dépendance d'icônes.

## Installation

```bash
npm install
cp .env.example .env.local   # renseigner l'URL et la clé publishable Supabase
npm run dev
```

### Base de données

Dans Supabase → **SQL Editor**, exécuter dans l'ordre : `0001_schema.sql`, `0002_rls_storage.sql`,
`0003_functions.sql`, puis `seed.sql`. Les fonctions de `0003` sont rejouables (`create or replace`).

### Premier administrateur

1. Supabase → **Authentication → Users → Add user** (e-mail + mot de passe).
2. Dans le SQL Editor :
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid de l''utilisateur>';
   ```
3. Se connecter sur `/admin/login`.

## À décider / à compléter avec l'entreprise

Ces valeurs du seed sont des **hypothèses** modifiables dans l'administration :

- Supplément **express** (5 000 FCFA par défaut) ; frais de livraison **3 000 FCFA** pour tous les quartiers.
- Frais de confection du **bouquet d'argent** (5 000 FCFA, ajoutés au montant choisi).
- Tarifs des formules **Box Love** (Prestige 35 000, Royal Luxe 48 000).
- Packs **3 et 4** (composition) et packs **5 à 14** (à saisir).
- Textes légaux (CGV, confidentialité) : à rédiger — non inclus.

## Paiement

V1 : transfert **MTN / Orange Money manuel**. La page de confirmation affiche les instructions, le
client envoie sa preuve sur WhatsApp, l'équipe passe la commande en « Payé » dans l'admin.
Pour un paiement en ligne automatique, choisir un agrégateur (CinetPay, Notch Pay, Flutterwave…),
implémenter `PaymentProvider` (`src/lib/payments.ts`) et un webhook serveur qui met à jour
`orders.payment_status` avec la clé `service_role` (jamais exposée au navigateur).

## Hors périmètre V1 (cahier des charges, version 2)

Comptes clients complets, programme de fidélité, avis déposés par les clients (la table et
l'affichage existent), blog, galerie, calendrier des occasions, notifications WhatsApp/SMS
automatiques, catalogue Facebook, Meta Pixel / Google Analytics (à brancher une fois les identifiants fournis).
