-- PATCH (não destrutivo). Rode no SQL Editor. É seguro rodar mais de uma vez.
-- Seguir, bloquear (com exclusão de enfeites), música do perfil e imagem de compartilhamento.

-- =========== colunas novas do perfil ===========
alter table public.profiles add column if not exists music_url text;
alter table public.profiles add column if not exists card_url text;
alter table public.profiles drop constraint if exists profiles_music_valid;
alter table public.profiles add constraint profiles_music_valid check (
  music_url is null or (char_length(music_url) <= 300
    and music_url ~ '^https://(www\.|m\.|music\.)?(youtube\.com|youtu\.be|soundcloud\.com|open\.spotify\.com)/.+')
);
alter table public.profiles drop constraint if exists profiles_card_valid;
alter table public.profiles add constraint profiles_card_valid check (card_url is null or card_url ~ '^https://.+');
grant update (username, display_name, avatar_url, music_url, card_url) on public.profiles to authenticated;

-- =========== seguir e bloquear ===========
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
revoke all on public.follows, public.blocks from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select on public.blocks to authenticated;   -- escrita só pelas funções block_user / unblock_user

-- há bloqueio entre os dois, em qualquer direção? (lê a tabela mesmo sem o usuário poder lê-la)
create or replace function public.has_block(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
revoke all on function public.has_block(uuid, uuid) from public;
grant execute on function public.has_block(uuid, uuid) to anon, authenticated;

drop policy if exists "follows: vê os próprios" on public.follows;
drop policy if exists "follows: segue" on public.follows;
drop policy if exists "follows: deixa de seguir" on public.follows;
create policy "follows: vê os próprios" on public.follows for select to authenticated using (follower_id = (select auth.uid()));
create policy "follows: segue" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.has_block(follower_id, followee_id));
create policy "follows: deixa de seguir" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

drop policy if exists "blocks: vê os próprios" on public.blocks;
create policy "blocks: vê os próprios" on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));

-- =========== quem bloqueou não aparece (nem por link, busca ou API) ===========
drop policy if exists "perfis são públicos" on public.profiles;
drop policy if exists "perfis visíveis" on public.profiles;
create policy "perfis visíveis" on public.profiles for select
  using ((select auth.uid()) is null or id = (select auth.uid()) or not public.has_block((select auth.uid()), id));

drop policy if exists "árvores são públicas" on public.participations;
drop policy if exists "árvores visíveis" on public.participations;
create policy "árvores visíveis" on public.participations for select
  using ((select auth.uid()) is null or user_id = (select auth.uid()) or not public.has_block((select auth.uid()), user_id));

-- um enfeite só é visível se a árvore dele for visível (a regra acima vale dentro desta consulta)
drop policy if exists "enfeites são públicos" on public.contributions;
drop policy if exists "enfeites visíveis" on public.contributions;
create policy "enfeites visíveis" on public.contributions for select
  using (exists (select 1 from public.participations p where p.id = contributions.participation_id));

-- =========== funções ===========
-- Quantos enfeites os dois já trocaram (para o aviso antes de bloquear)
create or replace function public.count_exchanged(p_other uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.contributions c join public.participations p on p.id = c.participation_id
  where (c.sender_id = auth.uid() and p.user_id = p_other) or (c.sender_id = p_other and p.user_id = auth.uid());
$$;

-- Bloqueia, apaga PARA SEMPRE todos os enfeites trocados entre os dois (todas as edições) e desfaz o seguir
create or replace function public.block_user(p_target uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_target is null or p_target = v_uid then raise exception 'invalid_target'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then raise exception 'user_not_found'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_target) on conflict do nothing;
  with del as (
    delete from public.contributions c using public.participations p
    where c.participation_id = p.id
      and ((c.sender_id = v_uid and p.user_id = p_target) or (c.sender_id = p_target and p.user_id = v_uid))
    returning 1
  ) select count(*) into v_n from del;
  delete from public.follows where (follower_id = v_uid and followee_id = p_target) or (follower_id = p_target and followee_id = v_uid);
  return v_n;
end;
$$;

create or replace function public.unblock_user(p_target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_target;
end;
$$;

-- Lista de quem eu bloqueei (precisa ignorar a regra de visibilidade para eu poder desbloquear)
create or replace function public.my_blocked()
returns table (id uuid, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid() order by b.created_at desc;
$$;

revoke all on function public.count_exchanged(uuid), public.block_user(uuid), public.unblock_user(uuid), public.my_blocked() from public, anon;
grant execute on function public.count_exchanged(uuid), public.block_user(uuid), public.unblock_user(uuid), public.my_blocked() to authenticated;

-- Enviar enfeite: agora também recusa quando há bloqueio entre os dois
create or replace function public.add_ornament(
  p_participation_id uuid, p_item_type text, p_message text, p_side text, p_slot int
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_event_id uuid;
  v_event public.events;
  v_msg text := btrim(coalesce(p_message, ''));
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and username is not null) then raise exception 'username_required'; end if;
  if p_item_type is null or char_length(p_item_type) not between 1 and 40 then raise exception 'invalid_item'; end if;
  if char_length(v_msg) not between 1 and 500 then raise exception 'invalid_message'; end if;
  if p_side is null or p_side not in ('frente', 'verso') then raise exception 'invalid_side'; end if;
  if p_slot is null or p_slot not between 0 and 11 then raise exception 'invalid_slot'; end if;

  select user_id, event_id into v_owner, v_event_id from public.participations where id = p_participation_id;
  if not found then raise exception 'tree_not_found'; end if;
  select * into v_event from public.events where id = v_event_id;

  if v_owner = v_uid then raise exception 'own_tree'; end if;
  if public.has_block(v_uid, v_owner) then raise exception 'blocked'; end if;
  if now() < v_event.starts_at or now() >= v_event.opens_at then raise exception 'event_closed'; end if;

  perform pg_advisory_xact_lock(hashtext(p_participation_id::text));
  if exists (select 1 from public.contributions where participation_id = p_participation_id and sender_id = v_uid) then
    raise exception 'already_placed';
  end if;

  begin
    insert into public.contributions (participation_id, sender_id, item_type, side, slot)
    values (p_participation_id, v_uid, p_item_type, p_side, p_slot) returning id into v_id;
  exception when unique_violation then
    raise exception 'slot_taken';
  end;

  insert into public.contribution_messages (contribution_id, body) values (v_id, v_msg);
  return v_id;
end;
$$;
revoke all on function public.add_ornament(uuid, text, text, text, int) from public, anon;
grant execute on function public.add_ornament(uuid, text, text, text, int) to authenticated;

-- =========== imagem de compartilhamento (Storage) ===========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cards', 'cards', true, 2000000, array['image/png'])
on conflict (id) do update set public = true, file_size_limit = 2000000, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cards: envia o próprio" on storage.objects;
drop policy if exists "cards: lê o próprio" on storage.objects;
drop policy if exists "cards: apaga o próprio" on storage.objects;
create policy "cards: envia o próprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'cards' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "cards: lê o próprio" on storage.objects for select to authenticated
  using (bucket_id = 'cards' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "cards: apaga o próprio" on storage.objects for delete to authenticated
  using (bucket_id = 'cards' and (storage.foldername(name))[1] = (select auth.uid())::text);
