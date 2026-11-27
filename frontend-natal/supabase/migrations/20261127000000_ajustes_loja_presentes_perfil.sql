-- PATCH (não destrutivo). Rode no SQL Editor depois do patch 20261126. Seguro de rodar mais de uma vez.
-- Loja enxuta (itens de árvore só valem a partir do Natal 2027), regras dos presentes, conquistas em destaque,
-- "sobre mim" e "data favorita".

-- ============ 1) LOJA: só 4 itens de árvore; os demais voltam a ser gratuitos ============
alter table public.items add column if not exists min_event_year int;     -- item só pode ser usado em eventos desse ano em diante

update public.items set active = false
 where id in ('model:dourada', 'model:aurora', 'model:violeta', 'model:meia-noite', 'lights:coloridas', 'topper:anjo', 'topper:lua',
              'scene:praia', 'scene:aurora', 'scene:lareira');            -- fora do catálogo = gratuitos de novo (itens já comprados continuam registrados)

insert into public.items (id, kind, key, name, tier, price, event_kind, available_until, duration_days, description, sort) values
  ('lights:geladas', 'lights', 'geladas', 'Luzes geladas', 'especial', 25, null, null, null, 'Pisca-pisca em tons de gelo.', 21)
on conflict (id) do nothing;
update public.items set active = true, min_event_year = 2027 where id in ('model:solar', 'lights:geladas', 'topper:coroa', 'scene:doces');

-- a árvore só usa item especial que a pessoa tem E que já vale para o ano do evento (conferido também no banco)
drop policy if exists "cria a própria árvore" on public.participations;
drop function if exists public.owns_look(uuid, jsonb);
create or replace function public.owns_look(p_uid uuid, p_cfg jsonb, p_event uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from (values ('model', p_cfg ->> 'model'), ('lights', p_cfg ->> 'lights'), ('topper', p_cfg ->> 'topper'), ('scene', p_cfg ->> 'scene')) v (kind, key)
    join public.items i on i.kind = v.kind and i.key = v.key and i.tier <> 'inicial' and i.active
    where not public.owns_item(p_uid, i.id)
       or coalesce(i.min_event_year, 0) > coalesce((select e.year from public.events e where e.id = p_event), 0)
  );
$$;
revoke all on function public.owns_look(uuid, jsonb, uuid) from public, anon;
grant execute on function public.owns_look(uuid, jsonb, uuid) to authenticated;
create policy "cria a própria árvore" on public.participations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.username is not null)
    and exists (select 1 from public.events e where e.id = participations.event_id and now() >= e.starts_at and now() < e.ends_at)
    and public.owns_look((select auth.uid()), config, event_id)
  );

-- ============ 2) efeito "flocos" vira "estrelas" ============
insert into public.items (id, kind, key, name, tier, price, event_kind, available_until, duration_days, description, sort) values
  ('effect:estrelas', 'effect', 'estrelas', 'Efeito estrelas', 'especial', 40, 'natal', null, 30, 'Estrelinhas cintilando no seu perfil. Dura 30 dias.', 61)
on conflict (id) do nothing;
update public.user_items set item_id = 'effect:estrelas'
 where item_id = 'effect:flocos' and not exists (select 1 from public.user_items u2 where u2.user_id = public.user_items.user_id and u2.item_id = 'effect:estrelas');
delete from public.user_items where item_id = 'effect:flocos';
update public.profiles set equipped_effect = 'estrelas' where equipped_effect = 'flocos';
update public.items set active = false where id = 'effect:flocos';

-- ============ 3) PRESENTES: regras ============
-- Brilho Mágico: UM por vez em cada árvore (quem tenta durante um brilho ativo recebe aviso e não paga). Dura 3 dias, vale para frente e verso.
-- Presente Misterioso: 1 por pessoa por árvore e no máximo 5 na mesma árvore (as 5 caixas do pé da árvore, visíveis na frente e no verso).
alter table public.gifts drop constraint if exists gifts_participation_id_sender_id_kind_key;
create unique index if not exists gifts_one_box_per_sender on public.gifts (participation_id, sender_id) where kind = 'misterioso';

create or replace function public.send_gift(p_participation_id uuid, p_kind text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_event_id uuid; v_ev public.events; i public.items; v_exp timestamptz; v_id uuid; v_ref text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and username is not null) then raise exception 'username_required'; end if;
  if p_kind not in ('brilho', 'misterioso') then raise exception 'invalid_kind'; end if;
  select user_id, event_id into v_owner, v_event_id from public.participations where id = p_participation_id;
  if not found then raise exception 'tree_not_found'; end if;
  select * into v_ev from public.events where id = v_event_id;
  if v_owner = v_uid then raise exception 'own_tree'; end if;
  if public.has_block(v_uid, v_owner) then raise exception 'blocked'; end if;
  if now() < v_ev.starts_at or (p_kind = 'misterioso' and now() >= v_ev.opens_at) or now() >= v_ev.ends_at then raise exception 'event_closed'; end if;
  select * into i from public.items where id = 'gift:' || p_kind and active;
  if not found then raise exception 'item_not_found'; end if;
  perform pg_advisory_xact_lock(hashtext('gift:' || p_participation_id::text || ':' || p_kind));   -- trava por árvore e tipo
  if p_kind = 'brilho' then
    if exists (select 1 from public.gifts where participation_id = p_participation_id and kind = 'brilho' and expires_at > now()) then raise exception 'glow_active'; end if;
    v_exp := now() + make_interval(days => coalesce(i.duration_days, 3));
    v_ref := p_participation_id::text || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  else
    if exists (select 1 from public.gifts where participation_id = p_participation_id and sender_id = v_uid and kind = 'misterioso') then raise exception 'already_sent'; end if;
    if (select count(*) from public.gifts where participation_id = p_participation_id and kind = 'misterioso') >= 5 then raise exception 'gifts_full'; end if;
    v_ref := p_participation_id::text;
  end if;
  perform public.spend_mimos(v_uid, i.price, 'gift_' || p_kind, v_ref, v_ev.id);
  insert into public.gifts (kind, sender_id, participation_id, expires_at) values (p_kind, v_uid, p_participation_id, v_exp) returning id into v_id;
  perform public.check_achievements(v_uid);
  return v_id;
end; $$;

-- Conteúdo do Presente Misterioso: sorteado só na abertura. Item repetido vira Mimos no lugar.
create table if not exists public.gift_rewards (
  code text primary key,
  kind text not null check (kind in ('item', 'mimos')),
  item_id text references public.items (id),
  amount int not null default 0,
  weight int not null check (weight > 0),
  label text not null,
  active boolean not null default true
);
insert into public.gift_rewards (code, kind, item_id, amount, weight, label) values
  ('item-coracoes', 'item',  'frame:coracoes', 0,  30, 'Moldura corações'),
  ('item-aurora',   'item',  'effect:aurora',  0,  30, 'Efeito aurora'),
  ('mimos-15',      'mimos', null,             15, 25, '15 mimos'),
  ('mimos-30',      'mimos', null,             30, 10, '30 mimos'),
  ('mimos-60',      'mimos', null,             60, 5,  '60 mimos')
on conflict (code) do nothing;
alter table public.gift_rewards enable row level security;          -- sem acesso direto: o conteúdo é surpresa
revoke all on public.gift_rewards from anon, authenticated;
insert into public.reward_rules (code, amount, description) values ('gift_duplicate', 25, 'Mimos recebidos no lugar de um item exclusivo que você já tinha (presente misterioso)')
on conflict (code) do nothing;

create or replace function public.open_gift(p_gift uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); g public.gifts; v_owner uuid; v_opens timestamptz; v_total int; v_r int; v_acc int := 0;
  r public.gift_rewards; v_sel public.gift_rewards; v_amount int := 0; v_conv boolean := false; v_item text; v_name text; v_exp timestamptz; v_dur int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into g from public.gifts where id = p_gift;
  if not found then raise exception 'gift_not_found'; end if;
  select p.user_id, e.opens_at into v_owner, v_opens from public.participations p join public.events e on e.id = p.event_id where p.id = g.participation_id;
  if v_owner <> v_uid then raise exception 'not_owner'; end if;
  if g.kind <> 'misterioso' then raise exception 'not_openable'; end if;
  if now() < v_opens then raise exception 'not_open_yet'; end if;
  perform pg_advisory_xact_lock(hashtext('open:' || p_gift::text));
  select * into g from public.gifts where id = p_gift;
  if g.opened_at is not null then raise exception 'already_opened'; end if;
  select coalesce(sum(weight), 0) into v_total from public.gift_rewards where active;
  if v_total = 0 then raise exception 'roulette_unavailable'; end if;
  v_r := 1 + floor(random() * v_total)::int;
  for r in select * from public.gift_rewards where active order by code loop
    v_acc := v_acc + r.weight; v_sel := r;
    exit when v_r <= v_acc;
  end loop;
  v_name := v_sel.label;
  if v_sel.kind = 'mimos' then
    v_amount := v_sel.amount;
    perform public.grant_mimos(v_uid, v_amount, 'gift_open', p_gift::text);
  elsif public.owns_item(v_uid, v_sel.item_id) then                    -- já tinha o item: ganha Mimos no lugar
    select amount into v_amount from public.reward_rules where code = 'gift_duplicate';
    v_amount := coalesce(v_amount, 25); v_conv := true;
    perform public.grant_mimos(v_uid, v_amount, 'gift_open', p_gift::text);
  else
    select duration_days into v_dur from public.items where id = v_sel.item_id;
    v_exp := case when v_dur is null then null else now() + make_interval(days => v_dur) end;
    insert into public.user_items (user_id, item_id, expires_at, source) values (v_uid, v_sel.item_id, v_exp, 'gift')
    on conflict (user_id, item_id) do update set expires_at = excluded.expires_at, acquired_at = now(), source = 'gift';
    v_item := v_sel.item_id;
  end if;
  update public.gifts set opened_at = now(), reward_item_id = v_item, reward_mimos = nullif(v_amount, 0) where id = p_gift;
  return jsonb_build_object('item_id', v_item, 'name', v_name, 'mimos', v_amount, 'converted', v_conv);
end; $$;

-- ============ 4) CONQUISTAS EM DESTAQUE (até 3, escolhidas pela pessoa) ============
alter table public.user_achievements add column if not exists featured_rank smallint check (featured_rank between 1 and 3);
create unique index if not exists user_ach_featured_idx on public.user_achievements (user_id, featured_rank) where featured_rank is not null;

create or replace function public.set_featured_achievements(p_ids text[]) returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_ids text[] := coalesce(p_ids, '{}'); v_id text; n int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(array_length(v_ids, 1), 0) > 3 then raise exception 'too_many'; end if;
  if coalesce(array_length(v_ids, 1), 0) <> (select count(distinct x) from unnest(v_ids) x) then raise exception 'duplicate'; end if;
  if exists (select 1 from unnest(v_ids) x where not exists (select 1 from public.user_achievements u where u.user_id = v_uid and u.achievement_id = x)) then raise exception 'not_unlocked'; end if;
  update public.user_achievements set featured_rank = null where user_id = v_uid;
  foreach v_id in array v_ids loop
    n := n + 1;
    update public.user_achievements set featured_rank = n where user_id = v_uid and achievement_id = v_id;
  end loop;
end; $$;

-- minhas conquistas (agora com a posição em destaque)
drop function if exists public.my_achievements();
create or replace function public.my_achievements()
returns table (id text, event_kind text, name text, description text, icon text, secret boolean, unlocked boolean, unlocked_at timestamptz, progress int, target int, reward_mimos int, featured_rank smallint)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  perform public.check_achievements(auth.uid());
  return query
    select a.id, a.event_kind,
      case when u.user_id is null and a.secret then null else a.name end,
      case when u.user_id is null and a.secret then null else a.description end,
      case when u.user_id is null and a.secret then 'secret' else a.icon end,
      a.secret, (u.user_id is not null), u.unlocked_at,
      case when u.user_id is null and a.secret then null else least(public.metric_value(auth.uid(), a.metric), a.target) end,
      case when u.user_id is null and a.secret then null else a.target end,
      case when u.user_id is null and a.secret then null else a.reward_mimos end,
      u.featured_rank
    from public.achievements a left join public.user_achievements u on u.achievement_id = a.id and u.user_id = auth.uid()
    where a.active order by a.sort, a.id;
end; $$;

-- público: só as conquistas que a pessoa escolheu destacar...
create or replace function public.public_achievements(p_user uuid)
returns table (id text, name text, icon text, unlocked_at timestamptz) language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.icon, u.unlocked_at from public.user_achievements u join public.achievements a on a.id = u.achievement_id
  where u.user_id = p_user and u.featured_rank is not null and not public.has_block(auth.uid(), p_user) order by u.featured_rank;
$$;
-- ...e apenas QUANTAS ela tem no total (sem dizer quais)
create or replace function public.achievement_count(p_user uuid) returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.user_achievements where user_id = p_user and not public.has_block(auth.uid(), p_user);
$$;

-- ============ 5) PERFIL: "sobre mim" e "data favorita" ============
alter table public.profiles add column if not exists about text;
alter table public.profiles add column if not exists favorite_date text;
alter table public.profiles drop constraint if exists profiles_about_valid;
alter table public.profiles add constraint profiles_about_valid check (about is null or char_length(about) between 1 and 60);
alter table public.profiles drop constraint if exists profiles_favdate_valid;
alter table public.profiles add constraint profiles_favdate_valid check (favorite_date is null or favorite_date in
  ('natal','pascoa','halloween','namorados','carnaval','ano-novo','festa-junina','dia-das-maes','dia-dos-pais','dia-das-criancas','aniversario','dia-do-amigo'));
grant update (username, display_name, avatar_url, music_url, card_url, about, favorite_date) on public.profiles to authenticated;

-- ============ permissões ============
revoke all on function public.set_featured_achievements(text[]), public.my_achievements() from public, anon;
grant execute on function public.set_featured_achievements(text[]), public.my_achievements() to authenticated;
revoke all on function public.achievement_count(uuid) from public;
grant execute on function public.achievement_count(uuid) to anon, authenticated;
