-- PATCH (não destrutivo). Rode no SQL Editor do Supabase depois do patch 20261128. Seguro de rodar mais de uma vez.
-- Encerramento do Natal 2026 e transformação em memórias.
--
-- Calendário (America/Sao_Paulo), controlado só por events.opens_at e events.ends_at (relógio do servidor):
--   20/11 a 24/12  starts_at <= now() < opens_at : criar árvore, enfeitar, enviar Presente Misterioso e Brilho Mágico
--   25/12 a 31/12  opens_at  <= now() < ends_at  : sem árvore/enfeite/presente misterioso novos; Brilho Mágico, cartas e presentes abrem
--   01/01/2027+    now() >= ends_at              : evento encerrado; só leitura de memórias, abrir cartas/presentes pendentes e privacidade
-- Nenhuma data é alterada aqui; nenhuma linha existente é apagada.

-- ============ 1) Criar árvore: só até opens_at (antes valia até ends_at) ============
drop policy if exists "cria a própria árvore" on public.participations;
create policy "cria a própria árvore" on public.participations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.username is not null)
    and exists (select 1 from public.events e where e.id = participations.event_id and now() >= e.starts_at and now() < e.opens_at)
    and public.owns_look((select auth.uid()), config, event_id)
  );

-- ============ 2) Remover enfeite da própria árvore: só enquanto o evento não terminou ============
-- (a memória é imutável; o bloqueio de usuários, que é uma ação de segurança, continua funcionando por block_user)
drop policy if exists "dono remove enfeite da própria árvore" on public.contributions;
create policy "dono remove enfeite da própria árvore" on public.contributions for delete to authenticated
  using (exists (
    select 1 from public.participations p join public.events e on e.id = p.event_id
    where p.id = contributions.participation_id and p.user_id = (select auth.uid()) and now() < e.ends_at
  ));

-- ============ 3) "Revelação concluída": não grava mais depois do fim do evento ============
create or replace function public.mark_reveal_seen(p_event uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.events where id = p_event and now() >= opens_at) then raise exception 'not_open_yet'; end if;
  if not exists (select 1 from public.events where id = p_event and now() < ends_at) then raise exception 'event_closed'; end if;
  if not exists (select 1 from public.participations where user_id = v_uid and event_id = p_event) then raise exception 'tree_not_found'; end if;
  insert into public.reveals (user_id, event_id) values (v_uid, p_event) on conflict do nothing;
  perform public.check_achievements(v_uid);
end; $$;

-- ============ 4) Presentes: regras de datas (send_gift e open_gift) ============
-- send_gift (patch 20261127) já respeita o calendário: Presente Misterioso só antes de opens_at, Brilho Mágico só antes de ends_at.
-- open_gift só exige now() >= opens_at e NÃO olha ends_at: presentes pendentes continuam podendo ser abertos pelo dono depois do fim.
-- Reescrevemos open_gift só para fixar isso por escrito e travar a linha do presente (abertura única, sem corrida).
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
  if now() < v_opens then raise exception 'not_open_yet'; end if;        -- sem teto em ends_at: presente pendente abre mesmo depois de 01/01
  perform pg_advisory_xact_lock(hashtext('open:' || p_gift::text));
  select * into g from public.gifts where id = p_gift for update;          -- relê já com a linha travada
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
  elsif public.owns_item(v_uid, v_sel.item_id) then
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
revoke all on function public.open_gift(uuid) from public, anon;
grant execute on function public.open_gift(uuid) to authenticated;

-- ============ 5) Memórias: quem pode ver uma árvore (mesma regra da policy "árvores visíveis") ============
create or replace function public.memory_visible(p_participation uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.participations p join public.events e on e.id = p.event_id
    where p.id = p_participation
      and (
        p.user_id = (select auth.uid())
        or (
          ((select auth.uid()) is null or not public.has_block((select auth.uid()), p.user_id))
          and (p.memory_public or now() < e.ends_at)
        )
      )
  );
$$;

-- "Presentes recebidos": registros reais de public.gifts. O conteúdo sorteado (reward_*) só vai para o dono da árvore.
create or replace function public.memory_gifts(p_participation uuid)
returns table (id uuid, kind text, sender text, created_at timestamptz, expires_at timestamptz, opened_at timestamptz, reward_label text, reward_mimos int, is_owner boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_owner boolean;
begin
  if not public.memory_visible(p_participation) then return; end if;
  select (p.user_id = (select auth.uid())) into v_owner from public.participations p where p.id = p_participation;
  return query
    select g.id, g.kind, s.username, g.created_at, g.expires_at, g.opened_at,
           case when v_owner then i.name end, case when v_owner then g.reward_mimos end, coalesce(v_owner, false)
    from public.gifts g
    join public.profiles s on s.id = g.sender_id
    left join public.items i on i.id = g.reward_item_id
    where g.participation_id = p_participation
    order by g.created_at, g.id;
end; $$;

-- "Quem iluminou esta árvore?": um registro por pessoa, com a quantidade de Brilhos Mágicos enviados (agrupado de public.gifts).
create or replace function public.memory_glow_givers(p_participation uuid)
returns table (username text, display_name text, avatar_url text, total int, first_at timestamptz, last_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.memory_visible(p_participation) then return; end if;
  return query
    select s.username, s.display_name, s.avatar_url, count(*)::int, min(g.created_at), max(g.created_at)
    from public.gifts g join public.profiles s on s.id = g.sender_id
    where g.participation_id = p_participation and g.kind = 'brilho'
    group by s.id, s.username, s.display_name, s.avatar_url
    order by max(g.created_at) desc, s.username;
end; $$;

revoke all on function public.memory_visible(uuid), public.memory_gifts(uuid), public.memory_glow_givers(uuid) from public;
grant execute on function public.memory_visible(uuid), public.memory_gifts(uuid), public.memory_glow_givers(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
