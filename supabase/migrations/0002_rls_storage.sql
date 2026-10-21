-- Sécurité (Row Level Security) et stockage.
-- Principe : le public lit le catalogue ; toute écriture de commande passe par la
-- fonction create_order() (security definer) qui recalcule les prix côté serveur.

alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_variants enable row level security;
alter table public.addons          enable row level security;
alter table public.product_addons  enable row level security;
alter table public.delivery_zones  enable row level security;
alter table public.promotions      enable row level security;
alter table public.settings        enable row level security;
alter table public.order_counters  enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.order_events    enable row level security;
alter table public.payments        enable row level security;
alter table public.reviews         enable row level security;

-- Profils : chacun voit et édite le sien (sans pouvoir changer son rôle).
create policy profiles_select_own on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Catalogue : lecture publique des éléments actifs.
create policy categories_read on public.categories for select using (is_active or public.is_admin());
create policy products_read   on public.products   for select using (is_active or public.is_admin());
create policy variants_read   on public.product_variants for select using (true);
create policy addons_read     on public.addons for select using (is_active or public.is_admin());
create policy product_addons_read on public.product_addons for select using (true);
create policy zones_read      on public.delivery_zones for select using (is_active or public.is_admin());
create policy settings_read   on public.settings for select using (true);

create policy categories_admin on public.categories      for all using (public.is_admin()) with check (public.is_admin());
create policy products_admin   on public.products        for all using (public.is_admin()) with check (public.is_admin());
create policy variants_admin   on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy addons_admin     on public.addons          for all using (public.is_admin()) with check (public.is_admin());
create policy product_addons_admin on public.product_addons for all using (public.is_admin()) with check (public.is_admin());
create policy zones_admin      on public.delivery_zones  for all using (public.is_admin()) with check (public.is_admin());
create policy settings_admin   on public.settings        for all using (public.is_admin()) with check (public.is_admin());

-- Promotions : les codes ne sont jamais lisibles publiquement (validation via validate_promo()).
create policy promotions_admin on public.promotions for all using (public.is_admin()) with check (public.is_admin());

-- Commandes : pas d'écriture publique directe ; un client connecté voit les siennes.
create policy orders_select_own on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy orders_admin      on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy items_select_own  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy items_admin       on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy events_select_own on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy events_admin      on public.order_events for all using (public.is_admin()) with check (public.is_admin());
create policy payments_admin    on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy counters_admin    on public.order_counters for all using (public.is_admin()) with check (public.is_admin());

-- Avis : lecture des avis validés ; dépôt public toujours en attente de modération.
create policy reviews_read   on public.reviews for select using (is_approved or public.is_admin());
create policy reviews_submit on public.reviews for insert with check (is_approved = false);
create policy reviews_admin  on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── Stockage ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images',  'product-images',  true,  5242880,  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('customer-photos', 'customer-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy product_images_read   on storage.objects for select using (bucket_id = 'product-images');
create policy product_images_admin  on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- Photos « souvenir » : dépôt anonyme autorisé, lecture réservée à l'équipe.
create policy customer_photos_upload on storage.objects for insert with check (bucket_id = 'customer-photos');
create policy customer_photos_admin  on storage.objects for select using (bucket_id = 'customer-photos' and public.is_admin());
