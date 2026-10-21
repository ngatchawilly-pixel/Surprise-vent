-- Données de départ, reprises du cahier des charges (section 9 « Prix de départ »).
-- Tous les prix, frais et textes sont modifiables depuis l'espace administrateur.
-- Les valeurs marquées « à confirmer » sont des hypothèses à valider avec l'entreprise.

insert into public.settings (key, value) values
  ('whatsapp_number',  '"237694425725"'),
  ('phone_display',    '"694 425 725"'),
  ('lead_days',        '2'),
  ('express_fee',      '5000'),   -- à confirmer : supplément « prestation express »
  ('announcement',     '"Réservations au minimum 2 jours à l''avance · Livraison à Yaoundé et Douala"'),
  ('address_yaounde',  '"Byemassi, Yaoundé"'),
  ('address_douala',   '"Entrée Bépanda, 4e rue, Douala"')
on conflict (key) do update set value = excluded.value;

insert into public.categories (slug, name, emoji, description, sort_order) values
  ('fleurs',            'Fleurs',               '💐', 'Fleurs naturelles et synthétiques, bouquets personnalisés.', 10),
  ('bouquets-argent',   'Bouquets d''argent',   '💰', 'Choisissez le montant, la présentation et le message.',       20),
  ('box-cadeaux',       'Box & cadeaux',        '🎁', 'Box Love, paniers surprises, coffrets personnalisés.',        30),
  ('chocolats',         'Chocolats',            '🍫', 'Chocolat seul, fleurs + chocolat, box chocolat.',             40),
  ('gateaux',           'Gâteaux',              '🎂', 'Gâteaux d''anniversaire, Cake Money, gâteaux personnalisés.', 50),
  ('ballons',           'Ballons',              '🎈', 'Bobo ballon, bouquets de ballons, décoration.',               60),
  ('animation',         'Animation',            '🎶', 'Saxophoniste, trompettiste, chanson personnalisée.',          70),
  ('petites-attentions','Petites attentions',   '💌', 'Cartes de vœux, lettres, messages personnalisés.',            80),
  ('packs',             'Packs anniversaire',   '✨', 'Formules tout compris pour un anniversaire réussi.',          90)
on conflict (slug) do nothing;

insert into public.delivery_zones (city, district, fee, is_other, sort_order) values
  ('yaounde', 'Byemassi',  3000, false, 10),
  ('yaounde', 'Bastos',    3000, false, 20),
  ('yaounde', 'Odza',      3000, false, 30),
  ('yaounde', 'Omnisport', 3000, false, 40),
  ('yaounde', 'Mendong',   3000, false, 50),
  ('yaounde', 'Nlongkak',  3000, false, 60),
  ('yaounde', 'Simbock',   3000, false, 70),
  ('yaounde', 'Autres quartiers', 3000, true, 99),
  ('douala',  'Bépanda',   3000, false, 10),
  ('douala',  'Akwa',      3000, false, 20),
  ('douala',  'Bonapriso', 3000, false, 30),
  ('douala',  'Bonamoussadi', 3000, false, 40),
  ('douala',  'Deido',     3000, false, 50),
  ('douala',  'Autres quartiers', 3000, true, 99)
on conflict (city, district) do nothing;

-- Produits
with c as (select slug, id from public.categories)
insert into public.products (category_id, slug, name, tagline, description, price_mode, base_price, badge, is_featured, sort_order)
select c.id, p.slug, p.name, p.tagline, p.description, p.mode::public.price_mode, p.price, p.badge, p.featured, p.ord
from (values
  ('bouquets-argent','bouquet-d-argent','Bouquet d''argent','Le montant que vous choisissez, présenté en bouquet.',
     'Choisissez le montant, la couleur et le message. Les frais de confection s''ajoutent au montant offert.', 'custom_amount', 5000, 'Top vente', true, 10),
  ('fleurs','bouquet-fleurs-synthetiques','Bouquet de fleurs synthétiques','Un bouquet qui dure.',
     'Bouquet de fleurs synthétiques élégant, personnalisable avec une carte de vœux.', 'from', 15000, null, false, 20),
  ('fleurs','rose-naturelle','Rose naturelle','La rose, tout simplement.',
     'Rose naturelle fraîche, vendue à l''unité.', 'fixed', 3000, null, false, 30),
  ('chocolats','fleurs-synthetiques-chocolat','Fleurs synthétiques + chocolat','Fleurs et chocolats réunis.',
     'Bouquet de fleurs synthétiques accompagné de chocolats.', 'from', 25000, null, false, 40),
  ('chocolats','fleurs-naturelles-chocolat','Fleurs naturelles + chocolat','Roses fraîches et chocolats fins.',
     'Bouquet de fleurs naturelles accompagné de chocolats.', 'from', 45000, 'Coup de cœur', true, 50),
  ('box-cadeaux','box-love','Box Love','Une box pour dire « je t''aime ».',
     'Une box personnalisée pour faire plaisir à votre partenaire et créer un souvenir inoubliable.', 'from', 25000, 'Best-seller', true, 60),
  ('gateaux','cake-money','Cake Money','Le gâteau qui cache une surprise.',
     'Gâteau décoré de billets, personnalisable selon l''occasion.', 'from', 40000, null, true, 70),
  ('box-cadeaux','panier-surprise','Panier surprise','Un panier garni, livré avec le sourire.',
     'Panier surprise composé selon l''occasion et le budget.', 'from', 15000, null, false, 80),
  ('ballons','bobo-ballon','Bobo ballon','Un ballon transparent plein de surprises.',
     'Bobo ballon personnalisé avec message et décoration.', 'from', 25000, null, false, 90),
  ('petites-attentions','feu-d-artifice-bougie','Feu d''artifice / bougie','Pour illuminer le gâteau.',
     'Bougie feu d''artifice à ajouter à votre gâteau.', 'fixed', 2000, null, false, 100),
  ('petites-attentions','carte-de-voeux','Carte de vœux','Vos mots, joliment écrits.',
     'Carte de vœux avec votre message personnalisé.', 'fixed', 2000, null, false, 110),
  ('animation','saxophoniste','Saxophoniste','Une sérénade en direct.',
     'Un saxophoniste vient jouer pour votre proche lors de la surprise.', 'fixed', 20000, 'Live', false, 120),
  ('animation','trompettiste','Trompettiste','Une entrée en musique.',
     'Un trompettiste anime votre surprise.', 'fixed', 15000, 'Live', false, 130),
  ('animation','chanson-personnalisee','Chanson personnalisée','Une chanson écrite pour lui ou elle.',
     'Une chanson personnalisée avec le prénom et votre histoire.', 'fixed', 15000, null, false, 140),
  ('gateaux','gateau-anniversaire','Gâteau d''anniversaire','Le classique des fêtes.',
     'Gâteau d''anniversaire personnalisé.', 'from', 12000, null, false, 150),
  ('animation','hotesse-hote','Hôtesse / hôte','Pour accueillir et accompagner la surprise.',
     'Prestation d''hôtesse ou d''hôte pour votre événement.', 'fixed', 5000, null, false, 160)
) as p(cat, slug, name, tagline, description, mode, price, badge, featured, ord)
join c on c.slug = p.cat
on conflict (slug) do nothing;

-- Formules de la Box Love (à confirmer : tarifs des formules supérieures)
insert into public.product_variants (product_id, name, description, price, is_recommended, sort_order)
select p.id, v.name, v.descr, v.price, v.rec, v.ord
from public.products p
join (values
  ('Standard', 'Roses fraîches, chocolats, carte dédicacée.', 25000, false, 10),
  ('Prestige', 'Plus de roses, chocolats Ferrero, mini-parfum, polaroids.', 35000, true, 20),
  ('Royal Luxe', 'Roses d''équateur, grand format, parfum, polaroids.', 48000, false, 30)
) as v(name, descr, price, rec, ord) on true
where p.slug = 'box-love'
  and not exists (select 1 from public.product_variants x where x.product_id = p.id);

-- Packs anniversaire (les packs 5 à 14 sont à saisir depuis l'administration)
insert into public.products (category_id, slug, name, tagline, description, price_mode, base_price, composition, is_pack, badge, sort_order)
select c.id, p.slug, p.name, p.tagline, p.descr, 'fixed', p.price, p.comp, true, p.badge, p.ord
from public.categories c
join (values
  ('pack-1', 'Pack 1 · Panier douceur', 'Un panier complet pour un anniversaire.', 'Panier garni, discours et déplacement inclus.', 23000,
     array['Vin','Jus naturel','Pommes','Chocolat','Yaourt','Carte de vœux','Discours','Déplacement'], 'Best-seller', 210),
  ('pack-2', 'Pack 2 · Bouquet d''argent', 'Bouquet d''argent + discours.', 'Bouquet d''argent de 10 000 FCFA, discours et déplacement.', 23000,
     array['Bouquet d''argent de 10 000 FCFA','Discours','Déplacement'], null, 220),
  ('pack-3', 'Pack 3', 'À composer depuis l''administration.', 'Composition à compléter.', 30000, array[]::text[], null, 230),
  ('pack-4', 'Pack 4 · Grand éclat', 'À composer depuis l''administration.', 'Composition à compléter.', 35000, array[]::text[], null, 240)
) as p(slug, name, tagline, descr, price, comp, badge, ord) on true
where c.slug = 'packs'
on conflict (slug) do nothing;

-- Options complémentaires
insert into public.addons (name, description, emoji, price, sort_order) values
  ('Saxophoniste en direct',  'Interprétation de deux chansons d''amour lors de la remise.', '🎷', 20000, 10),
  ('Chanteur acoustique',     'Guitare et voix douce pour accompagner le déballage.',        '🎵', 15000, 20),
  ('Trompettiste',            'Une entrée en musique pour la surprise.',                      '🎺', 15000, 30),
  ('Hôtesse / hôte',          'Accueil et mise en scène de la remise.',                       '🌹', 5000,  40),
  ('Carte de vœux',           'Carte avec votre message calligraphié.',                       '💌', 2000,  50),
  ('Feu d''artifice / bougie','Pour illuminer le gâteau.',                                    '🎆', 2000,  60)
on conflict do nothing;

insert into public.product_addons (product_id, addon_id)
select p.id, a.id from public.products p cross join public.addons a
where p.slug in ('box-love','bouquet-d-argent','fleurs-naturelles-chocolat','fleurs-synthetiques-chocolat','cake-money','panier-surprise','bobo-ballon','pack-1','pack-2','pack-3','pack-4')
on conflict do nothing;

-- Code promo d'exemple (Octobre Rose, section 25) — désactivé par défaut
insert into public.promotions (code, label, type, value, is_active)
values ('OCTOBREROSE', 'Octobre Rose · -10 %', 'percent', 10, false)
on conflict (code) do nothing;

-- Pour créer le premier administrateur : créez un compte (Authentication > Users),
-- puis exécutez :  update public.profiles set role = 'admin' where id = '<uuid de l''utilisateur>';
