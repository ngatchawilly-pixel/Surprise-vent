-- 0004 — Packs « déplacement inclus » + modèle de packs (flyers Pack Anniversaire et Paniers)
-- À exécuter dans Supabase > SQL Editor (rejouable).

alter table public.products
  add column if not exists delivery_included boolean not null default false;

comment on column public.products.delivery_included is
  'Le prix du produit inclut déjà le déplacement : aucun frais de livraison si tout le panier est dans ce cas.';

-- Les 14 packs anniversaire incluent le déplacement (cf. flyer).
update public.products set delivery_included = true
 where is_pack and slug ~ '^pack-[0-9]+$';

-- Création de commande : recalcule TOUS les montants côté serveur.
create or replace function public.create_order(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c        jsonb := payload -> 'customer';
  r        jsonb := payload -> 'recipient';
  d        jsonb := payload -> 'delivery';
  it       jsonb;
  prod     public.products;
  var      public.product_variants;
  zone     public.delivery_zones;
  addon    public.addons;
  v_city   public.city;
  v_method public.payment_method := (payload ->> 'payment_method')::public.payment_method;
  v_date   date := (d ->> 'date')::date;
  v_express boolean := coalesce((d ->> 'express')::boolean, false);
  v_today  date := (now() at time zone 'Africa/Douala')::date;
  v_lead   int  := public.setting_int('lead_days', 2);
  v_qty    int;
  v_unit   int;
  v_addons jsonb;
  v_addon_total int;
  v_amount int;
  v_sub    int := 0;
  v_disc   int := 0;
  v_fee    int;
  v_express_fee int := 0;
  v_total  int;
  v_deposit int;
  v_number text;
  v_id     uuid;
  v_token  uuid;
  v_custom jsonb;
  promo    record;
  aid      text;
  v_all_included boolean := true; -- tous les articles incluent le déplacement
begin
  if jsonb_typeof(payload -> 'items') <> 'array' or jsonb_array_length(payload -> 'items') = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;
  if jsonb_array_length(payload -> 'items') > 30 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;

  v_city := (d ->> 'city')::public.city;

  -- Règle des 2 jours (hors prestation express).
  if v_date is null or v_date < v_today then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
  end if;
  if not v_express and v_date < v_today + v_lead then
    raise exception 'LEAD_TIME' using errcode = 'P0001';
  end if;

  -- Zone de livraison (quartier connu, sinon « autres quartiers » de la ville).
  select * into zone from public.delivery_zones
   where city = v_city and is_active and lower(district) = lower(trim(d ->> 'district'));
  if not found then
    select * into zone from public.delivery_zones where city = v_city and is_active and is_other limit 1;
  end if;
  if not found then
    raise exception 'NO_ZONE' using errcode = 'P0001';
  end if;
  v_fee := zone.fee;
  if v_express then
    v_express_fee := public.setting_int('express_fee', 0);
  end if;

  -- Création de l'en-tête (montants mis à jour plus bas).
  v_number := public.next_order_number();
  insert into public.orders (
    number, user_id,
    customer_name, customer_phone, customer_whatsapp, customer_email, anonymous_sender,
    recipient_name, recipient_phone, city, district, address, delivery_date, delivery_slot,
    is_express, instructions, subtotal, delivery_fee, express_fee, total, payment_method
  ) values (
    v_number, auth.uid(),
    left(trim(c ->> 'name'), 120), left(trim(c ->> 'phone'), 30),
    nullif(left(trim(coalesce(c ->> 'whatsapp', '')), 30), ''),
    nullif(left(trim(coalesce(c ->> 'email', '')), 160), ''),
    coalesce((c ->> 'anonymous')::boolean, false),
    left(trim(r ->> 'name'), 120), left(trim(r ->> 'phone'), 30),
    v_city, zone.district, left(trim(d ->> 'address'), 500), v_date,
    nullif(left(trim(coalesce(d ->> 'slot', '')), 60), ''),
    v_express, nullif(left(trim(coalesce(d ->> 'instructions', '')), 1000), ''),
    0, v_fee, v_express_fee, 0, v_method
  ) returning id, access_token into v_id, v_token;

  for it in select * from jsonb_array_elements(payload -> 'items') loop
    v_qty := greatest(1, least(20, coalesce((it ->> 'quantity')::int, 1)));

    select * into prod from public.products where id = (it ->> 'product_id')::uuid and is_active;
    if not found then raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001'; end if;
    if prod.stock = 'out_of_stock' then raise exception 'OUT_OF_STOCK' using errcode = 'P0001'; end if;
    if not prod.delivery_included then v_all_included := false; end if;

    v_custom := coalesce(it -> 'customization', '{}'::jsonb);
    var := null;
    v_unit := prod.base_price;

    if nullif(it ->> 'variant_id', '') is not null then
      select * into var from public.product_variants
       where id = (it ->> 'variant_id')::uuid and product_id = prod.id;
      if not found then raise exception 'VARIANT_UNAVAILABLE' using errcode = 'P0001'; end if;
      v_unit := var.price;
    end if;

    -- Bouquet d'argent : frais de confection + montant choisi par le client.
    if prod.price_mode = 'custom_amount' then
      v_amount := coalesce((v_custom ->> 'amount')::int, 0);
      if v_amount < 1000 or v_amount > 5000000 then
        raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
      end if;
      v_unit := v_unit + v_amount;
    end if;

    -- Options complémentaires : uniquement celles rattachées au produit.
    v_addons := '[]'::jsonb;
    v_addon_total := 0;
    for aid in select jsonb_array_elements_text(coalesce(it -> 'addon_ids', '[]'::jsonb)) loop
      select a.* into addon from public.addons a
        join public.product_addons pa on pa.addon_id = a.id and pa.product_id = prod.id
       where a.id = aid::uuid and a.is_active;
      if found then
        v_addons := v_addons || jsonb_build_object('id', addon.id, 'name', addon.name, 'price', addon.price);
        v_addon_total := v_addon_total + addon.price;
      end if;
    end loop;
    v_unit := v_unit + v_addon_total;

    insert into public.order_items (
      order_id, product_id, variant_id, product_name, variant_name,
      unit_price, quantity, customization, addons, line_total
    ) values (
      v_id, prod.id, var.id, prod.name, var.name,
      v_unit, v_qty,
      jsonb_strip_nulls(jsonb_build_object(
        'recipient_name', left(coalesce(v_custom ->> 'recipient_name', ''), 120),
        'occasion',       left(coalesce(v_custom ->> 'occasion', ''), 60),
        'message',        left(coalesce(v_custom ->> 'message', ''), 600),
        'color',          left(coalesce(v_custom ->> 'color', ''), 60),
        'photo_path',     nullif(left(coalesce(v_custom ->> 'photo_path', ''), 300), ''),
        'amount',         v_amount
      )),
      v_addons, v_unit * v_qty
    );
    v_sub := v_sub + v_unit * v_qty;
    v_amount := null;
  end loop;

  if nullif(trim(coalesce(payload ->> 'promo_code', '')), '') is not null then
    select * into promo from public._promo_discount(payload ->> 'promo_code', v_sub);
    if found then
      v_disc := promo.discount;
    end if;
  end if;

  -- Packs « déplacement inclus » : pas de frais de livraison si tout le panier est dans ce cas.
  if v_all_included then v_fee := 0; end if;

  v_total := v_sub - v_disc + v_fee + v_express_fee;
  v_deposit := case v_method
    when 'deposit_cod'     then ceil(v_total / 2.0)::int
    when 'cash_on_delivery' then 0
    else v_total
  end;

  update public.orders
     set subtotal = v_sub, discount = v_disc, delivery_fee = v_fee, total = v_total, deposit_due = v_deposit,
         promo_code = case when v_disc > 0 then upper(trim(payload ->> 'promo_code')) end
   where id = v_id;

  insert into public.order_events (order_id, status, note) values (v_id, 'pending', 'Commande enregistrée');

  return jsonb_build_object(
    'number', v_number, 'token', v_token, 'total', v_total,
    'deposit_due', v_deposit, 'payment_method', v_method
  );
end $$;

grant execute on function public.create_order(jsonb) to anon, authenticated;
