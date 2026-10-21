-- Fonctions métier : création de commande, suivi, code promo, statistiques admin.

-- Numéro de commande : CMD-AAAA-NNNN
create or replace function public.next_order_number()
returns text language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Africa/Douala'))::int;
  n int;
begin
  insert into public.order_counters (year, last) values (y, 1)
  on conflict (year) do update set last = public.order_counters.last + 1
  returning last into n;
  return format('CMD-%s-%s', y, lpad(n::text, 4, '0'));
end $$;

create or replace function public.setting_int(p_key text, p_default int)
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from public.settings where key = p_key), p_default);
$$;

-- Calcul d'une remise à partir d'un code (utilisé par create_order et validate_promo).
create or replace function public._promo_discount(p_code text, p_subtotal int)
returns table (discount int, label text)
language plpgsql stable security definer set search_path = public as $$
declare
  p public.promotions;
begin
  select * into p from public.promotions
   where upper(code) = upper(trim(p_code)) and is_active
     and (starts_at is null or starts_at <= now())
     and (ends_at   is null or ends_at   >= now());
  if not found or p_subtotal < p.min_order then
    return;
  end if;
  discount := case p.type
    when 'percent' then floor(p_subtotal * p.value / 100.0)::int
    else least(p.value, p_subtotal)
  end;
  label := p.label;
  return next;
end $$;

-- Validation publique d'un code promo (ne divulgue rien d'autre que la remise).
create or replace function public.validate_promo(p_code text, p_subtotal int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r record;
begin
  select * into r from public._promo_discount(p_code, p_subtotal);
  if not found then
    return jsonb_build_object('valid', false);
  end if;
  return jsonb_build_object('valid', true, 'discount', r.discount, 'label', r.label);
end $$;

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

  v_total := v_sub - v_disc + v_fee + v_express_fee;
  v_deposit := case v_method
    when 'deposit_cod'     then ceil(v_total / 2.0)::int
    when 'cash_on_delivery' then 0
    else v_total
  end;

  update public.orders
     set subtotal = v_sub, discount = v_disc, total = v_total, deposit_due = v_deposit,
         promo_code = case when v_disc > 0 then upper(trim(payload ->> 'promo_code')) end
   where id = v_id;

  insert into public.order_events (order_id, status, note) values (v_id, 'pending', 'Commande enregistrée');

  return jsonb_build_object(
    'number', v_number, 'token', v_token, 'total', v_total,
    'deposit_due', v_deposit, 'payment_method', v_method
  );
end $$;

grant execute on function public.create_order(jsonb)         to anon, authenticated;
grant execute on function public.validate_promo(text, int)   to anon, authenticated;

-- Vue publique d'une commande (sans coordonnées du destinataire).
create or replace function public._order_json(o public.orders)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'number', o.number, 'status', o.status, 'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'total', o.total, 'deposit_due', o.deposit_due, 'delivery_date', o.delivery_date,
    'city', o.city, 'district', o.district, 'is_express', o.is_express,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'name', product_name, 'variant', variant_name, 'quantity', quantity, 'line_total', line_total)), '[]'::jsonb)
              from public.order_items where order_id = o.id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
                'status', status, 'note', note, 'at', created_at) order by created_at), '[]'::jsonb)
              from public.order_events where order_id = o.id)
  );
$$;

-- Suivi pour un invité : numéro + téléphone du commanditaire.
create or replace function public.track_order(p_number text, p_phone text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  o public.orders;
  digits text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
begin
  select * into o from public.orders where upper(number) = upper(trim(p_number));
  if not found or length(digits) < 8
     or right(regexp_replace(o.customer_phone, '\D', '', 'g'), 9) <> digits then
    return null;
  end if;
  return public._order_json(o);
end $$;

-- Page de confirmation : accès par jeton secret renvoyé à la création.
create or replace function public.order_by_token(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where access_token = p_token;
  if not found then return null; end if;
  return public._order_json(o);
end $$;

grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.order_by_token(uuid)    to anon, authenticated;

-- Statistiques du tableau de bord (admin uniquement).
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Africa/Douala')::date;
  month_start date := date_trunc('month', now() at time zone 'Africa/Douala')::date;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'sales_today',  (select coalesce(sum(total), 0) from public.orders
                      where status <> 'cancelled' and (created_at at time zone 'Africa/Douala')::date = today),
    'sales_month',  (select coalesce(sum(total), 0) from public.orders
                      where status <> 'cancelled' and (created_at at time zone 'Africa/Douala')::date >= month_start),
    'orders_total', (select count(*) from public.orders),
    'by_status',    (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                      from (select status, count(*) n from public.orders group by status) s),
    'urgent',       (select count(*) from public.orders
                      where is_express and status in ('pending', 'confirmed', 'preparing')),
    'top_products', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                        select oi.product_name as name, sum(oi.quantity)::int as qty, sum(oi.line_total)::int as revenue
                          from public.order_items oi join public.orders o on o.id = oi.order_id
                         where o.status <> 'cancelled'
                         group by oi.product_name order by sum(oi.quantity) desc limit 5) t)
  );
end $$;

grant execute on function public.admin_stats() to authenticated;

-- Changement de statut avec journalisation (admin uniquement).
create or replace function public.admin_set_order_status(p_order uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.orders set status = p_status where id = p_order;
  insert into public.order_events (order_id, status, note, created_by) values (p_order, p_status, p_note, auth.uid());
end $$;

grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;
