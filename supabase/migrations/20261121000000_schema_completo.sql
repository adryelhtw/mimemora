-- =====================================================================
-- SCHEMA COMPLETO (substitui as migrations antigas 001 a 004)
-- Projeto novo e sem dados reais: este script APAGA E RECRIA as tabelas do app.
-- Rode uma vez no Supabase > SQL Editor > New query > Run.
-- =====================================================================

-- ---------- limpeza ----------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.contribution_messages, public.contributions, public.participations, public.events, public.profiles cascade;
drop function if exists public.add_ornament(uuid, text, text);
drop function if exists public.add_ornament(uuid, text, text, text, int);
drop function if exists public.handle_new_user();
drop function if exists public.block_update();

-- ---------- PERFIS (1 por conta; sem e-mail, tudo aqui é público) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_username_valid check (
    username ~ '^[a-z0-9_]{3,10}$'
    and username <> all (array['admin','api','app','www','suporte','natal','eventos'])
  ),
  constraint profiles_name_len check (display_name is null or char_length(display_name) between 1 and 40),
  constraint profiles_avatar_valid check (avatar_url is null or avatar_url ~ '^(https://.+|preset:[a-z-]{2,20})$')
);
create index profiles_username_prefix on public.profiles (username text_pattern_ops);

-- ---------- EVENTOS (multi-evento; uma linha por edição anual) ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,            -- ex.: natal-2026
  kind text not null,                   -- ex.: natal, pascoa, halloween
  year int not null,
  name text not null,
  timezone text not null default 'America/Sao_Paulo',
  starts_at timestamptz not null,       -- começa a aceitar árvores e enfeites
  opens_at timestamptz not null,        -- abertura das mensagens
  ends_at timestamptz not null,         -- fim da edição (vira histórico)
  created_at timestamptz not null default now(),
  unique (kind, year),
  constraint events_dates_valid check (starts_at < opens_at and opens_at <= ends_at)
);

-- ---------- ÁRVORES (usuário x edição). Criada uma vez e nunca mais alterada ----------
create table public.participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  config jsonb not null,                -- {model, lights, topper, scene}
  created_at timestamptz not null default now(),
  unique (user_id, event_id),
  constraint participations_config_valid check (
    jsonb_typeof(config) = 'object'
    and coalesce(jsonb_typeof(config -> 'model'), '') = 'string'
    and coalesce(jsonb_typeof(config -> 'lights'), '') = 'string'
    and coalesce(jsonb_typeof(config -> 'topper'), '') = 'string'
    and coalesce(jsonb_typeof(config -> 'scene'), '') = 'string'
    and (config - 'model' - 'lights' - 'topper' - 'scene') = '{}'::jsonb
    and char_length(config ->> 'model') <= 30 and char_length(config ->> 'lights') <= 30
    and char_length(config ->> 'topper') <= 30 and char_length(config ->> 'scene') <= 30
  )
);
create index on public.participations (event_id);

-- ---------- ENFEITES (remetente, lado e posição). Públicos, sem a mensagem ----------
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  item_type text not null check (char_length(item_type) between 1 and 40),
  side text not null check (side in ('frente', 'verso')),
  slot int not null check (slot between 0 and 11),   -- 12 posições por lado
  created_at timestamptz not null default now(),
  unique (participation_id, side, slot),             -- uma posição, um enfeite
  unique (participation_id, sender_id)               -- um enfeite por pessoa por árvore
);
create index on public.contributions (participation_id);

-- ---------- MENSAGENS SECRETAS (tabela separada, protegida por RLS) ----------
create table public.contribution_messages (
  contribution_id uuid primary key references public.contributions (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- ---------- criação automática do perfil no cadastro (Google ou e-mail) ----------
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 40), ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- árvore e enfeite enviados são imutáveis ----------
create function public.block_update() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'immutable' using hint = 'Este registro não pode ser alterado depois de criado.';
end;
$$;
create trigger participations_no_update before update on public.participations for each row execute function public.block_update();
create trigger contributions_no_update before update on public.contributions for each row execute function public.block_update();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.participations enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_messages enable row level security;

-- perfis: leitura pública; cada pessoa edita só o próprio
create policy "perfis são públicos" on public.profiles for select using (true);
create policy "edita o próprio perfil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- eventos: leitura pública, escrita só pelo painel/SQL
create policy "eventos são públicos" on public.events for select using (true);

-- árvores: públicas; cria a própria, uma vez, com username definido e durante a edição
create policy "árvores são públicas" on public.participations for select using (true);
create policy "cria a própria árvore" on public.participations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.username is not null)
    and exists (select 1 from public.events e where e.id = participations.event_id and now() >= e.starts_at and now() < e.ends_at)
  );

-- enfeites: públicos (sem mensagem); inserção só pela função add_ornament; o dono pode remover
create policy "enfeites são públicos" on public.contributions for select using (true);
create policy "dono remove enfeite da própria árvore" on public.contributions for delete to authenticated
  using (exists (select 1 from public.participations p where p.id = contributions.participation_id and p.user_id = (select auth.uid())));

-- MENSAGENS: só o dono da árvore, só depois de opens_at (relógio do servidor)
create policy "dono lê a mensagem após a abertura" on public.contribution_messages for select to authenticated
  using (exists (
    select 1
    from public.contributions c
    join public.participations p on p.id = c.participation_id
    join public.events e on e.id = p.event_id
    where c.id = contribution_messages.contribution_id
      and p.user_id = (select auth.uid())
      and now() >= e.opens_at
  ));

-- permissões explícitas (projetos novos do Supabase não liberam as tabelas automaticamente)
-- O que não está liberado aqui fica bloqueado; as políticas RLS acima refinam o acesso.
revoke all on public.profiles, public.events, public.participations, public.contributions, public.contribution_messages from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.events, public.participations, public.contributions to anon, authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;
grant insert on public.participations to authenticated;
grant delete on public.contributions to authenticated;
grant select on public.contribution_messages to authenticated;

-- =====================================================================
-- ÚNICO CAMINHO para enviar um enfeite (valida tudo no servidor)
-- =====================================================================
create function public.add_ornament(
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

-- =====================================================================
-- FOTOS DE PERFIL (Storage): leitura pública, cada pessoa escreve só na própria pasta
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2000000, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatar: envia o próprio" on storage.objects;
drop policy if exists "avatar: troca o próprio" on storage.objects;
drop policy if exists "avatar: apaga o próprio" on storage.objects;
create policy "avatar: envia o próprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: troca o próprio" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: apaga o próprio" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =====================================================================
-- EVENTO: NATAL 2026 (abertura 25/12/2026 00:00, America/Sao_Paulo)
-- =====================================================================
insert into public.events (slug, kind, year, name, timezone, starts_at, opens_at, ends_at)
values (
  'natal-2026', 'natal', 2026, 'Natal 2026', 'America/Sao_Paulo',
  timestamp '2026-11-20 00:00:00' at time zone 'America/Sao_Paulo',
  timestamp '2026-12-25 00:00:00' at time zone 'America/Sao_Paulo',
  timestamp '2027-01-01 00:00:00' at time zone 'America/Sao_Paulo'
);

-- =====================================================================
-- ensure_profile + fotos (mesmo conteúdo do patch 20261123)
-- =====================================================================
-- PATCH (não destrutivo). Rode no SQL Editor. É seguro rodar mais de uma vez.
-- 1) Recria o perfil de qualquer conta que ficou sem perfil (ex.: perfis apagados à mão).
-- 2) Cria a função que o site usa para se curar sozinho quando faltar o perfil.
-- 3) Garante o armazenamento das fotos de perfil.

insert into public.profiles (id, display_name, avatar_url)
select u.id,
       nullif(left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), 40), ''),
       case when coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') like 'https://%'
            then coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') end
from auth.users u
on conflict (id) do nothing;

create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  u auth.users;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into u from auth.users where id = v_uid;
  if not found then raise exception 'not_authenticated'; end if;
  insert into public.profiles (id, display_name, avatar_url)
  values (
    v_uid,
    nullif(left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), 40), ''),
    case when coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') like 'https://%'
         then coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') end
  )
  on conflict (id) do nothing;
end;
$$;
revoke all on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2000000, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatar: envia o próprio" on storage.objects;
drop policy if exists "avatar: troca o próprio" on storage.objects;
drop policy if exists "avatar: apaga o próprio" on storage.objects;
drop policy if exists "avatar: lê o próprio" on storage.objects;
create policy "avatar: envia o próprio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: lê o próprio" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: troca o próprio" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: apaga o próprio" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =====================================================================
-- seguir, bloquear, música e imagem de compartilhamento (patch 20261124)
-- =====================================================================
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

-- =====================================================================
-- ajustes de música e seguidores (patch 20261125)
-- =====================================================================
-- PATCH (não destrutivo). Rode no SQL Editor depois do patch 20261124.
-- 1) Listas de "seguindo" e "seguidores" visíveis para quem está logado (menos entre bloqueados).
-- 2) Música do perfil: só YouTube e SoundCloud.

drop policy if exists "follows: vê os próprios" on public.follows;
drop policy if exists "follows: visíveis" on public.follows;
create policy "follows: visíveis" on public.follows for select to authenticated
  using (not public.has_block((select auth.uid()), follower_id) and not public.has_block((select auth.uid()), followee_id));

update public.profiles set music_url = null where music_url ~ 'spotify\.com';
alter table public.profiles drop constraint if exists profiles_music_valid;
alter table public.profiles add constraint profiles_music_valid check (
  music_url is null or (char_length(music_url) <= 300
    and music_url ~ '^https://(www\.|m\.|music\.)?(youtube\.com|youtu\.be|soundcloud\.com)/.+')
);

-- =====================================================================
-- mimos, loja, roleta, presentes, conquistas (patch 20261126)
-- =====================================================================
-- =====================================================================
-- MIMOS, LOJA, ROLETA, PRESENTES, CONQUISTAS, INDICAÇÕES E REVELAÇÃO
-- PATCH não destrutivo: rode no SQL Editor depois dos patches anteriores. Seguro de rodar mais de uma vez.
-- Tudo é configurável por tabelas (itens, prêmios da roleta, conquistas, regras de recompensa) e vale para
-- qualquer evento: o Natal é só a primeira linha de cada catálogo.
-- =====================================================================

-- ---------- utilidades de tempo (servidor manda no relógio) ----------
create or replace function public.today_sp() returns date language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;
create or replace function public.server_now() returns timestamptz language sql stable as $$ select now() $$;

alter table public.events add column if not exists expectation_at timestamptz;   -- começa a fase "expectativa"
update public.events set expectation_at = opens_at - interval '7 days' where expectation_at is null;

-- ---------- carteira de Mimos e extrato (só o banco escreve) ----------
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),               -- nunca negativo
  updated_at timestamptz not null default now()
);
create table if not exists public.ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount <> 0),
  reason text not null,
  ref text not null default '',
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)                                      -- a mesma recompensa nunca é paga duas vezes
);

-- ---------- regras de recompensa (valores ajustáveis sem mexer no código) ----------
create table if not exists public.reward_rules (
  code text primary key,
  amount int not null check (amount >= 0),
  max_per_event int,
  max_total int,
  description text not null,
  active boolean not null default true
);
insert into public.reward_rules (code, amount, max_per_event, max_total, description) values
  ('referral_1', 30, null, 1, 'Primeiro amigo indicado que criou a árvore'),
  ('referral_2', 20, null, 1, 'Segundo amigo indicado que criou a árvore'),
  ('referral_n', 10, null, 18, 'Demais amigos indicados (até 20 indicações pagas no total)'),
  ('tree_created', 10, 1, null, 'Criar a sua árvore de cada evento'),
  ('five_ornaments', 15, 1, null, 'Receber enfeites de 5 pessoas diferentes'),
  ('friend_tree', 5, 10, null, 'Enfeitar a árvore de um amigo (até 10 por evento)')
on conflict (code) do nothing;

-- credita (idempotente) e debita (sem saldo negativo). Funções internas: o site nunca as chama direto.
create or replace function public.grant_mimos(p_user uuid, p_amount int, p_reason text, p_ref text default '', p_event uuid default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_new boolean;
begin
  if p_amount <= 0 then raise exception 'invalid_amount'; end if;
  with ins as (
    insert into public.ledger (user_id, amount, reason, ref, event_id) values (p_user, p_amount, p_reason, coalesce(p_ref, ''), p_event)
    on conflict (user_id, reason, ref) do nothing returning 1
  ) select exists (select 1 from ins) into v_new;
  if v_new then
    insert into public.wallets (user_id, balance) values (p_user, p_amount)
    on conflict (user_id) do update set balance = public.wallets.balance + excluded.balance, updated_at = now();
  end if;
  return v_new;
end; $$;

create or replace function public.spend_mimos(p_user uuid, p_amount int, p_reason text, p_ref text, p_event uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_amount <= 0 then raise exception 'invalid_amount'; end if;
  update public.wallets set balance = balance - p_amount, updated_at = now() where user_id = p_user and balance >= p_amount;
  if not found then raise exception 'insufficient_funds'; end if;
  insert into public.ledger (user_id, amount, reason, ref, event_id) values (p_user, -p_amount, p_reason, p_ref, p_event);
end; $$;

-- paga uma regra respeitando os limites (por evento e total)
create or replace function public.reward(p_user uuid, p_code text, p_ref text, p_event uuid default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare r public.reward_rules; n int;
begin
  select * into r from public.reward_rules where code = p_code and active;
  if not found or r.amount = 0 then return false; end if;
  if r.max_per_event is not null and p_event is not null then
    select count(*) into n from public.ledger where user_id = p_user and reason = p_code and event_id = p_event;
    if n >= r.max_per_event then return false; end if;
  end if;
  if r.max_total is not null then
    select count(*) into n from public.ledger where user_id = p_user and reason = p_code;
    if n >= r.max_total then return false; end if;
  end if;
  return public.grant_mimos(p_user, r.amount, p_code, p_ref, p_event);
end; $$;

create or replace function public.reward_referral(p_referrer uuid, p_referred uuid, p_event uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int; v_code text;
begin
  select count(*) into n from public.ledger where user_id = p_referrer and reason like 'referral\_%';
  v_code := case when n = 0 then 'referral_1' when n = 1 then 'referral_2' else 'referral_n' end;
  return public.reward(p_referrer, v_code, p_referred::text, p_event);
end; $$;

-- ---------- catálogo de itens e inventário ----------
create table if not exists public.items (
  id text primary key,                         -- 'model:dourada', 'frame:geada', 'gift:brilho'
  kind text not null check (kind in ('model','lights','topper','scene','frame','effect','gift')),
  key text not null,                           -- chave usada pelo site (igual ao nome do item no código)
  name text not null,
  tier text not null check (tier in ('inicial','especial','exclusivo')),   -- inicial = grátis; exclusivo = campanhas
  price int not null default 0 check (price >= 0),
  event_kind text,                             -- null = vale em todos os eventos
  available_from timestamptz,
  available_until timestamptz,                 -- itens por período limitado
  duration_days int,                           -- null = permanente
  description text not null default '',
  sort int not null default 0,
  active boolean not null default true,
  unique (kind, key)
);
-- Itens que NÃO estão aqui continuam gratuitos para todos.
insert into public.items (id, kind, key, name, tier, price, event_kind, available_until, duration_days, description, sort) values
  ('model:dourada',    'model',  'dourada',    'Árvore dourada',        'especial', 60, null,    null, null, 'Uma árvore toda dourada, com guirlanda de contas.', 10),
  ('model:aurora',     'model',  'aurora',     'Árvore aurora',         'especial', 60, null,    null, null, 'Degradê de menta, azul e violeta.', 11),
  ('model:solar',      'model',  'solar',      'Árvore pôr do sol',     'especial', 50, null,    null, null, 'Laranja, coral e ameixa.', 12),
  ('model:violeta',    'model',  'violeta',    'Árvore ametista',       'especial', 40, null,    null, null, 'Roxa, delicada e brilhante.', 13),
  ('model:meia-noite', 'model',  'meia-noite', 'Árvore meia-noite',     'especial', 40, null,    null, null, 'Azul profundo com acabamento prateado.', 14),
  ('lights:coloridas', 'lights', 'coloridas',  'Luzes coloridas',       'especial', 25, null,    null, null, 'Pisca-pisca em quatro cores.', 20),
  ('topper:coroa',     'topper', 'coroa',      'Topo coroa',            'especial', 30, null,    null, null, 'Uma coroa dourada com pedras.', 30),
  ('topper:anjo',      'topper', 'anjo',       'Topo anjinho',          'especial', 25, null,    null, null, 'Um anjinho com auréola.', 31),
  ('topper:lua',       'topper', 'lua',        'Topo lua',              'especial', 25, null,    null, null, 'Lua crescente com uma estrelinha.', 32),
  ('scene:praia',      'scene',  'praia',      'Cenário natal na praia','especial', 80, null,    null, null, 'Pôr do sol, mar e palmeira.', 40),
  ('scene:aurora',     'scene',  'aurora',     'Cenário aurora boreal', 'especial', 70, null,    null, null, 'Céu com faixas de luz.', 41),
  ('scene:lareira',    'scene',  'lareira',    'Cenário sala aconchegante','especial',50,null,   null, null, 'Lareira, guirlanda e janela.', 42),
  ('scene:doces',      'scene',  'doces',      'Cenário mundo de doces','especial', 50, null,    null, null, 'Bengalas, pirulito e bolinhas.', 43),
  ('frame:dourada',    'frame',  'dourada',    'Moldura dourada',       'especial', 40, null,    null, 30,   'Anel dourado girando em volta da sua foto. Dura 30 dias.', 50),
  ('frame:geada',      'frame',  'geada',      'Moldura geada',         'especial', 60, 'natal', timestamp '2027-01-01 00:00:00' at time zone 'America/Sao_Paulo', null, 'Brilho gelado com flocos. Só até o fim do Natal 2026; depois de comprada, é sua para sempre.', 51),
  ('frame:coracoes',   'frame',  'coracoes',   'Moldura corações',      'exclusivo',0,  null,    null, null, 'Exclusiva: vem de prêmios raros e presentes misteriosos.', 52),
  ('effect:brilhos',   'effect', 'brilhos',    'Efeito brilhos',        'especial', 50, null,    null, null, 'Faíscas flutuando no seu perfil.', 60),
  ('effect:flocos',    'effect', 'flocos',     'Efeito flocos',         'especial', 40, 'natal', null, 30,   'Neve caindo só no seu perfil. Dura 30 dias.', 61),
  ('effect:aurora',    'effect', 'aurora',     'Efeito aurora',         'exclusivo',0,  null,    null, null, 'Exclusivo: vem de presentes misteriosos.', 62),
  ('gift:brilho',      'gift',   'brilho',     'Brilho Mágico',         'especial', 25, null,    null, 3,    'Envolve a árvore de um amigo com uma luz especial por 3 dias. Seu nome aparece num selo.', 70),
  ('gift:misterioso',  'gift',   'misterioso', 'Presente Misterioso',   'especial', 40, null,    null, null, 'Uma caixa no pé da árvore. Só abre na revelação, com uma surpresa exclusiva.', 71)
on conflict (id) do nothing;

create table if not exists public.user_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.items (id),
  acquired_at timestamptz not null default now(),
  expires_at timestamptz,
  source text not null default 'shop',
  primary key (user_id, item_id)
);

create or replace function public.owns_item(p_uid uuid, p_item text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_items u where u.user_id = p_uid and u.item_id = p_item and (u.expires_at is null or u.expires_at > now()));
$$;

-- a árvore só pode usar itens especiais que o usuário possui (vale também para requisições diretas)
create or replace function public.owns_look(p_uid uuid, p_cfg jsonb) returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from (values ('model', p_cfg ->> 'model'), ('lights', p_cfg ->> 'lights'), ('topper', p_cfg ->> 'topper'), ('scene', p_cfg ->> 'scene')) v (kind, key)
    join public.items i on i.kind = v.kind and i.key = v.key and i.tier <> 'inicial' and i.active
    where not public.owns_item(p_uid, i.id)
  );
$$;

drop policy if exists "cria a própria árvore" on public.participations;
create policy "cria a própria árvore" on public.participations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.username is not null)
    and exists (select 1 from public.events e where e.id = participations.event_id and now() >= e.starts_at and now() < e.ends_at)
    and public.owns_look((select auth.uid()), config)
  );

create or replace function public.buy_item(p_item text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); i public.items; v_exp timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into i from public.items where id = p_item and active;
  if not found then raise exception 'item_not_found'; end if;
  if i.kind = 'gift' then raise exception 'use_send_gift'; end if;
  if i.tier <> 'especial' then raise exception 'not_for_sale'; end if;
  if (i.available_from is not null and now() < i.available_from) or (i.available_until is not null and now() >= i.available_until) then raise exception 'not_available'; end if;
  perform pg_advisory_xact_lock(hashtext('buy:' || v_uid::text || i.id));
  if public.owns_item(v_uid, i.id) then raise exception 'already_owned'; end if;
  v_exp := case when i.duration_days is null then null else now() + make_interval(days => i.duration_days) end;
  perform public.spend_mimos(v_uid, i.price, 'purchase', i.id || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'));
  insert into public.user_items (user_id, item_id, expires_at, source) values (v_uid, i.id, v_exp, 'shop')
  on conflict (user_id, item_id) do update set acquired_at = now(), expires_at = excluded.expires_at, source = 'shop';
  return jsonb_build_object('item', i.id, 'expires_at', v_exp);
end; $$;

-- ---------- cosméticos de perfil ----------
alter table public.profiles add column if not exists equipped_frame text;
alter table public.profiles add column if not exists equipped_effect text;

create or replace function public.equip_item(p_kind text, p_key text) returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_key text := nullif(p_key, '');
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('frame', 'effect') then raise exception 'invalid_kind'; end if;
  if v_key is not null and not public.owns_item(v_uid, p_kind || ':' || v_key) then raise exception 'not_owned'; end if;
  if p_kind = 'frame' then update public.profiles set equipped_frame = v_key where id = v_uid;
  else update public.profiles set equipped_effect = v_key where id = v_uid; end if;
end; $$;

-- o que realmente aparece no perfil: só itens que a pessoa tem e que não expiraram
create or replace function public.profile_cosmetics(p_user uuid)
returns table (frame text, effect text) language sql stable security definer set search_path = '' as $$
  select case when public.owns_item(p.id, 'frame:' || p.equipped_frame) then p.equipped_frame end,
         case when public.owns_item(p.id, 'effect:' || p.equipped_effect) then p.equipped_effect end
  from public.profiles p where p.id = p_user and not public.has_block(auth.uid(), p.id);
$$;

-- ---------- indicações ----------
create table if not exists public.referrals (
  referred_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (referred_id <> referrer_id)
);

create or replace function public.claim_referral(p_code text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_ref uuid; v_new boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select id into v_ref from public.profiles where username = lower(btrim(p_code));
  if v_ref is null or v_ref = v_uid then return false; end if;                      -- sem autoindicação
  if public.has_block(v_uid, v_ref) then return false; end if;
  if exists (select 1 from public.participations where user_id = v_uid) then return false; end if;   -- só antes de criar a árvore
  if (select created_at from public.profiles where id = v_uid) < now() - interval '3 days' then return false; end if;
  with ins as (insert into public.referrals (referred_id, referrer_id) values (v_uid, v_ref) on conflict do nothing returning 1)
  select exists (select 1 from ins) into v_new;
  return v_new;
end; $$;

create or replace function public.my_referrals()
returns table (username text, display_name text, avatar_url text, completed boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.username, p.display_name, p.avatar_url, (r.completed_at is not null), r.created_at
  from public.referrals r join public.profiles p on p.id = r.referred_id
  where r.referrer_id = auth.uid() and not public.has_block(auth.uid(), r.referred_id) order by r.created_at desc;
$$;

-- ---------- presentes (Brilho Mágico e Presente Misterioso) ----------
create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('brilho', 'misterioso')),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  participation_id uuid not null references public.participations (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,                          -- brilho: efeito temporário
  opened_at timestamptz,
  reward_item_id text references public.items (id),   -- só é sorteado na abertura: antes disso ninguém sabe o conteúdo
  reward_mimos int,
  unique (participation_id, sender_id, kind)       -- um de cada tipo por pessoa por árvore
);
create index if not exists gifts_participation_idx on public.gifts (participation_id);

create or replace function public.send_gift(p_participation_id uuid, p_kind text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_event_id uuid; v_ev public.events; i public.items; v_exp timestamptz; v_id uuid;
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
  perform pg_advisory_xact_lock(hashtext('gift:' || p_participation_id::text || v_uid::text || p_kind));
  if exists (select 1 from public.gifts where participation_id = p_participation_id and sender_id = v_uid and kind = p_kind) then raise exception 'already_sent'; end if;
  v_exp := case when p_kind = 'brilho' then now() + make_interval(days => coalesce(i.duration_days, 3)) end;
  perform public.spend_mimos(v_uid, i.price, 'gift_' || p_kind, p_participation_id::text, v_ev.id);
  insert into public.gifts (kind, sender_id, participation_id, expires_at) values (p_kind, v_uid, p_participation_id, v_exp) returning id into v_id;
  perform public.check_achievements(v_uid);
  return v_id;
end; $$;

-- abre o presente misterioso: só o dono, só depois de opens_at (relógio do servidor), uma única vez
create or replace function public.open_gift(p_gift uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); g public.gifts; v_owner uuid; v_opens timestamptz; v_item public.items; v_mimos int := 0; v_exp timestamptz;
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
  select i.* into v_item from public.items i
    where i.tier = 'exclusivo' and i.kind in ('frame', 'effect') and i.active and not public.owns_item(v_uid, i.id)
    order by random() limit 1;
  if found then
    v_exp := case when v_item.duration_days is null then null else now() + make_interval(days => v_item.duration_days) end;
    insert into public.user_items (user_id, item_id, expires_at, source) values (v_uid, v_item.id, v_exp, 'gift')
    on conflict (user_id, item_id) do update set expires_at = excluded.expires_at, acquired_at = now(), source = 'gift';
  else
    v_mimos := 20;   -- já tem todos os exclusivos: converte em Mimos
    perform public.grant_mimos(v_uid, v_mimos, 'gift_open', p_gift::text);
  end if;
  update public.gifts set opened_at = now(), reward_item_id = v_item.id, reward_mimos = nullif(v_mimos, 0) where id = p_gift;
  return jsonb_build_object('item_id', v_item.id, 'name', v_item.name, 'mimos', v_mimos);
end; $$;

-- ---------- roleta diária (sorteio no servidor, uma vez por dia em America/Sao_Paulo) ----------
create table if not exists public.roulette_prizes (
  id serial primary key,
  code text not null unique,
  event_kind text,
  kind text not null check (kind in ('mimos', 'item')),
  amount int not null default 0,
  item_id text references public.items (id),
  weight int not null check (weight > 0),               -- chance = weight / soma dos pesos ativos
  label text not null,
  rarity text not null default 'comum' check (rarity in ('comum', 'incomum', 'raro')),
  sort int not null default 0,
  active boolean not null default true,
  available_from timestamptz,
  available_until timestamptz
);
-- Valor médio: ~3 Mimos por giro. Um item de 25 a 80 Mimos leva de 1 a 4 semanas só com a roleta.
insert into public.roulette_prizes (code, kind, amount, item_id, weight, label, rarity, sort) values
  ('m1',  'mimos', 1,  null, 340, '+1 mimo',  'comum',   1),
  ('m2',  'mimos', 2,  null, 280, '+2 mimos', 'comum',   2),
  ('m3',  'mimos', 3,  null, 180, '+3 mimos', 'comum',   3),
  ('m5',  'mimos', 5,  null, 100, '+5 mimos', 'incomum', 4),
  ('m8',  'mimos', 8,  null, 50,  '+8 mimos', 'incomum', 5),
  ('m15', 'mimos', 15, null, 30,  '+15 mimos','raro',    6),
  ('m25', 'mimos', 25, null, 10,  '+25 mimos','raro',    7),
  ('i-frame-coracoes', 'item', 0, 'frame:coracoes', 6, 'Moldura corações', 'raro', 8),
  ('i-effect-brilhos', 'item', 0, 'effect:brilhos', 4, 'Efeito brilhos',    'raro', 9)
on conflict (code) do nothing;

create table if not exists public.roulette_spins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  prize_id int references public.roulette_prizes (id),
  kind text not null, amount int not null default 0, item_id text, label text not null, rarity text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)                              -- uma tentativa por dia
);

create or replace function public.roulette_status() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_day date := public.today_sp(); v_total int; v_last public.roulette_spins; v_prizes jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select coalesce(sum(weight), 0) into v_total from public.roulette_prizes
    where active and (available_from is null or now() >= available_from) and (available_until is null or now() < available_until);
  select * into v_last from public.roulette_spins where user_id = auth.uid() and day = v_day;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', label, 'kind', kind, 'amount', amount, 'rarity', rarity,
           'chance', round(weight::numeric * 100 / nullif(v_total, 0), 1)) order by sort, id), '[]'::jsonb) into v_prizes
    from public.roulette_prizes
    where active and (available_from is null or now() >= available_from) and (available_until is null or now() < available_until);
  return jsonb_build_object(
    'can_spin', v_last.user_id is null,
    'next_at', ((v_day + 1)::timestamp at time zone 'America/Sao_Paulo'),
    'last', case when v_last.user_id is null then null else jsonb_build_object('prize_id', v_last.prize_id, 'kind', v_last.kind, 'amount', v_last.amount, 'item_id', v_last.item_id, 'label', v_last.label, 'rarity', v_last.rarity) end,
    'prizes', v_prizes);
end; $$;

create or replace function public.spin_roulette() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_day date := public.today_sp(); v_total int; v_r int; v_acc int := 0;
  p public.roulette_prizes; v_sel public.roulette_prizes; v_amount int := 0; v_item text; v_conv boolean := false; v_exp timestamptz; v_dur int; v_bal int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('spin:' || v_uid::text));
  if exists (select 1 from public.roulette_spins where user_id = v_uid and day = v_day) then raise exception 'already_spun'; end if;
  select coalesce(sum(weight), 0) into v_total from public.roulette_prizes
    where active and (available_from is null or now() >= available_from) and (available_until is null or now() < available_until);
  if v_total = 0 then raise exception 'roulette_unavailable'; end if;
  v_r := 1 + floor(random() * v_total)::int;               -- o sorteio acontece aqui, nunca no navegador
  for p in select * from public.roulette_prizes
      where active and (available_from is null or now() >= available_from) and (available_until is null or now() < available_until)
      order by sort, id loop
    v_acc := v_acc + p.weight; v_sel := p;
    exit when v_r <= v_acc;
  end loop;
  if v_sel.kind = 'mimos' then
    v_amount := v_sel.amount;
    perform public.grant_mimos(v_uid, v_amount, 'roulette', v_day::text);
  elsif public.owns_item(v_uid, v_sel.item_id) then       -- já tem o item: vira Mimos
    v_amount := 15; v_conv := true;
    perform public.grant_mimos(v_uid, v_amount, 'roulette', v_day::text);
  else
    select duration_days into v_dur from public.items where id = v_sel.item_id;
    v_exp := case when v_dur is null then null else now() + make_interval(days => v_dur) end;
    insert into public.user_items (user_id, item_id, expires_at, source) values (v_uid, v_sel.item_id, v_exp, 'roulette')
    on conflict (user_id, item_id) do update set expires_at = excluded.expires_at, acquired_at = now(), source = 'roulette';
    v_item := v_sel.item_id;
  end if;
  insert into public.roulette_spins (user_id, day, prize_id, kind, amount, item_id, label, rarity)
  values (v_uid, v_day, v_sel.id, case when v_conv then 'mimos' else v_sel.kind end, v_amount, v_item, v_sel.label, v_sel.rarity);
  select balance into v_bal from public.wallets where user_id = v_uid;
  return jsonb_build_object('prize_id', v_sel.id, 'kind', case when v_conv then 'mimos' else v_sel.kind end, 'amount', v_amount,
    'item_id', v_item, 'label', v_sel.label, 'rarity', v_sel.rarity, 'converted', v_conv, 'balance', coalesce(v_bal, 0));
end; $$;

-- ---------- revelação ----------
create table if not exists public.reveals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ---------- conquistas (condições objetivas, verificadas aqui; segredos nunca saem do banco) ----------
create table if not exists public.achievements (
  id text primary key,
  event_kind text,                                   -- null = vale em todos os eventos
  name text not null,
  description text not null,
  icon text not null default 'star',
  secret boolean not null default false,
  metric text not null,
  target int not null default 1 check (target > 0),
  reward_mimos int not null default 0,
  reward_item_id text references public.items (id),
  sort int not null default 0,
  active boolean not null default true
);
create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)             -- desbloqueia uma única vez
);
insert into public.achievements (id, event_kind, name, description, icon, secret, metric, target, reward_mimos, sort) values
  ('natal-primeiro',     'natal', 'Primeiro Natal',       'Criar a sua primeira árvore de Natal.',                                  'tree',     false, 'trees',             1,  10, 1),
  ('natal-espirito',     'natal', 'Espírito Natalino',    'Enfeitar a árvore de um amigo.',                                         'ornament', false, 'ornaments_sent',    1,  5,  2),
  ('natal-completa',     'natal', 'Árvore Completa',      'Receber todos os enfeites permitidos na sua árvore.',                    'star',     false, 'tree_full',         24, 30, 3),
  ('natal-anfitriao',    'natal', 'Bom Anfitrião',        'Receber enfeites de 10 pessoas diferentes.',                             'heart',    false, 'received_people',   10, 20, 4),
  ('natal-alegria',      'natal', 'Espalhando Alegria',   'Convidar 5 amigos que criaram a própria árvore.',                        'sparkle',  false, 'referrals',         5,  40, 5),
  ('natal-generoso',     'natal', 'Coração Generoso',     'Enfeitar a árvore de 10 amigos diferentes.',                             'gift',     false, 'friends_decorated', 10, 25, 6),
  ('natal-inesquecivel', 'natal', 'Natal Inesquecível',   'Participar de todas as etapas: criar a árvore, receber e enviar enfeites e viver a revelação.', 'moon', false, 'journey', 1, 50, 7),
  ('segredo-coruja',     'natal', 'Coruja do Natal',      'Enfeitar uma árvore de madrugada, entre 0h e 5h.',                       'moon',     true,  'night_sent',        1,  10, 20),
  ('segredo-misterio',   'natal', 'Mão de Fada',          'Enviar um Presente Misterioso.',                                         'gift',     true,  'misterioso_sent',   1,  10, 21),
  ('segredo-brilho',     'natal', 'Chuva de Estrelas',    'Enviar um Brilho Mágico.',                                               'sparkle',  true,  'brilho_sent',       1,  10, 22),
  ('amigos-3',           null,    'Boa Companhia',        'Seguir 3 pessoas.',                                                      'heart',    false, 'following',         3,  5,  30)
on conflict (id) do nothing;

create or replace function public.metric_value(p_user uuid, p_metric text) returns int language plpgsql stable security definer set search_path = '' as $$
declare v int := 0;
begin
  case p_metric
    when 'trees' then select count(*) into v from public.participations where user_id = p_user;
    when 'ornaments_sent' then select count(*) into v from public.contributions where sender_id = p_user;
    when 'friends_decorated' then select count(distinct participation_id) into v from public.contributions where sender_id = p_user;
    when 'received_people' then
      select coalesce(max(n), 0) into v from (select count(distinct c.sender_id) n from public.contributions c join public.participations p on p.id = c.participation_id where p.user_id = p_user group by p.id) t;
    when 'tree_full' then
      select coalesce(max(n), 0) into v from (select count(*) n from public.contributions c join public.participations p on p.id = c.participation_id where p.user_id = p_user group by p.id) t;
    when 'referrals' then select count(*) into v from public.referrals where referrer_id = p_user and completed_at is not null;
    when 'night_sent' then select count(*) into v from public.contributions where sender_id = p_user and extract(hour from created_at at time zone 'America/Sao_Paulo') < 5;
    when 'brilho_sent' then select count(*) into v from public.gifts where sender_id = p_user and kind = 'brilho';
    when 'misterioso_sent' then select count(*) into v from public.gifts where sender_id = p_user and kind = 'misterioso';
    when 'following' then select count(*) into v from public.follows where follower_id = p_user;
    when 'journey' then
      select case when exists (select 1 from public.participations where user_id = p_user)
        and exists (select 1 from public.contributions c join public.participations p on p.id = c.participation_id where p.user_id = p_user)
        and exists (select 1 from public.contributions where sender_id = p_user)
        and exists (select 1 from public.reveals where user_id = p_user) then 1 else 0 end into v;
    else v := 0;
  end case;
  return coalesce(v, 0);
end; $$;

create or replace function public.check_achievements(p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare a record; v_new boolean; v_exp timestamptz; v_dur int;
begin
  for a in select * from public.achievements x where x.active
      and not exists (select 1 from public.user_achievements u where u.user_id = p_user and u.achievement_id = x.id) loop
    if public.metric_value(p_user, a.metric) >= a.target then
      with ins as (insert into public.user_achievements (user_id, achievement_id) values (p_user, a.id) on conflict do nothing returning 1)
      select exists (select 1 from ins) into v_new;
      if v_new then
        if a.reward_mimos > 0 then perform public.grant_mimos(p_user, a.reward_mimos, 'achievement', a.id); end if;
        if a.reward_item_id is not null then
          select duration_days into v_dur from public.items where id = a.reward_item_id;
          v_exp := case when v_dur is null then null else now() + make_interval(days => v_dur) end;
          insert into public.user_items (user_id, item_id, expires_at, source) values (p_user, a.reward_item_id, v_exp, 'achievement') on conflict do nothing;
        end if;
      end if;
    end if;
  end loop;
end; $$;

create or replace function public.my_achievements()
returns table (id text, event_kind text, name text, description text, icon text, secret boolean, unlocked boolean, unlocked_at timestamptz, progress int, target int, reward_mimos int)
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
      case when u.user_id is null and a.secret then null else a.reward_mimos end
    from public.achievements a left join public.user_achievements u on u.achievement_id = a.id and u.user_id = auth.uid()
    where a.active order by a.sort, a.id;
end; $$;

create or replace function public.public_achievements(p_user uuid)
returns table (id text, name text, icon text, unlocked_at timestamptz) language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.icon, u.unlocked_at from public.user_achievements u join public.achievements a on a.id = u.achievement_id
  where u.user_id = p_user and not public.has_block(auth.uid(), p_user) order by u.unlocked_at desc limit 12;
$$;

create or replace function public.mark_reveal_seen(p_event uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.events where id = p_event and now() >= opens_at) then raise exception 'not_open_yet'; end if;
  if not exists (select 1 from public.participations where user_id = v_uid and event_id = p_event) then raise exception 'tree_not_found'; end if;
  insert into public.reveals (user_id, event_id) values (v_uid, p_event) on conflict do nothing;
  perform public.check_achievements(v_uid);
end; $$;

-- ---------- ganchos: criar árvore, enfeitar, bloquear ----------
create or replace function public.on_tree_created() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ref uuid;
begin
  perform public.reward(new.user_id, 'tree_created', new.event_id::text, new.event_id);
  select referrer_id into v_ref from public.referrals where referred_id = new.user_id and completed_at is null;
  if found then                                                    -- a indicação só conta depois da árvore criada
    update public.referrals set completed_at = now() where referred_id = new.user_id;
    perform public.reward_referral(v_ref, new.user_id, new.event_id);
    perform public.check_achievements(v_ref);
  end if;
  perform public.check_achievements(new.user_id);
  return new;
end; $$;
drop trigger if exists participations_after_insert on public.participations;
create trigger participations_after_insert after insert on public.participations for each row execute function public.on_tree_created();

create or replace function public.add_ornament(p_participation_id uuid, p_item_type text, p_message text, p_side text, p_slot int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_owner uuid; v_event_id uuid; v_event public.events;
  v_msg text := btrim(coalesce(p_message, '')); v_id uuid;
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
  if exists (select 1 from public.contributions where participation_id = p_participation_id and sender_id = v_uid) then raise exception 'already_placed'; end if;
  begin
    insert into public.contributions (participation_id, sender_id, item_type, side, slot)
    values (p_participation_id, v_uid, p_item_type, p_side, p_slot) returning id into v_id;
  exception when unique_violation then
    raise exception 'slot_taken';
  end;
  insert into public.contribution_messages (contribution_id, body) values (v_id, v_msg);
  -- recompensas (com limites no banco) e conquistas
  perform public.reward(v_uid, 'friend_tree', p_participation_id::text, v_event_id);
  if (select count(distinct sender_id) from public.contributions where participation_id = p_participation_id) >= 5 then
    perform public.reward(v_owner, 'five_ornaments', v_event_id::text, v_event_id);
  end if;
  perform public.check_achievements(v_uid);
  perform public.check_achievements(v_owner);
  return v_id;
end; $$;

-- bloqueio: agora também apaga os presentes trocados entre os dois
create or replace function public.count_exchanged(p_other uuid) returns int language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.contributions c join public.participations p on p.id = c.participation_id
          where (c.sender_id = auth.uid() and p.user_id = p_other) or (c.sender_id = p_other and p.user_id = auth.uid()))::int
       + (select count(*) from public.gifts g join public.participations p on p.id = g.participation_id
          where (g.sender_id = auth.uid() and p.user_id = p_other) or (g.sender_id = p_other and p.user_id = auth.uid()))::int;
$$;

create or replace function public.block_user(p_target uuid) returns int language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_n int; v_g int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_target is null or p_target = v_uid then raise exception 'invalid_target'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then raise exception 'user_not_found'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_target) on conflict do nothing;
  with del as (
    delete from public.contributions c using public.participations p
    where c.participation_id = p.id and ((c.sender_id = v_uid and p.user_id = p_target) or (c.sender_id = p_target and p.user_id = v_uid)) returning 1
  ) select count(*) into v_n from del;
  with delg as (
    delete from public.gifts g using public.participations p
    where g.participation_id = p.id and ((g.sender_id = v_uid and p.user_id = p_target) or (g.sender_id = p_target and p.user_id = v_uid)) returning 1
  ) select count(*) into v_g from delg;
  delete from public.follows where (follower_id = v_uid and followee_id = p_target) or (follower_id = p_target and followee_id = v_uid);
  return v_n + v_g;
end; $$;

-- ---------- segurança: RLS e permissões ----------
alter table public.wallets enable row level security;
alter table public.ledger enable row level security;
alter table public.reward_rules enable row level security;
alter table public.items enable row level security;
alter table public.user_items enable row level security;
alter table public.referrals enable row level security;
alter table public.gifts enable row level security;
alter table public.roulette_prizes enable row level security;
alter table public.roulette_spins enable row level security;
alter table public.reveals enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "wallet própria" on public.wallets;
create policy "wallet própria" on public.wallets for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "extrato próprio" on public.ledger;
create policy "extrato próprio" on public.ledger for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "regras visíveis" on public.reward_rules;
create policy "regras visíveis" on public.reward_rules for select to authenticated using (true);
drop policy if exists "catálogo visível" on public.items;
create policy "catálogo visível" on public.items for select to authenticated using (active);
drop policy if exists "inventário próprio" on public.user_items;
create policy "inventário próprio" on public.user_items for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "indicações próprias" on public.referrals;
create policy "indicações próprias" on public.referrals for select to authenticated using (referrer_id = (select auth.uid()) or referred_id = (select auth.uid()));
drop policy if exists "prêmios visíveis" on public.roulette_prizes;
create policy "prêmios visíveis" on public.roulette_prizes for select to authenticated using (active);
drop policy if exists "giros próprios" on public.roulette_spins;
create policy "giros próprios" on public.roulette_spins for select to authenticated using (user_id = (select auth.uid()));
-- presentes: visíveis se a árvore for visível (mesma regra de bloqueio dos enfeites). O conteúdo secreto não existe antes da abertura.
drop policy if exists "presentes visíveis" on public.gifts;
create policy "presentes visíveis" on public.gifts for select to anon, authenticated
  using (exists (select 1 from public.participations p where p.id = gifts.participation_id));

revoke all on public.wallets, public.ledger, public.reward_rules, public.items, public.user_items, public.referrals, public.gifts,
  public.roulette_prizes, public.roulette_spins, public.reveals, public.achievements, public.user_achievements from anon, authenticated;
grant select on public.wallets, public.ledger, public.reward_rules, public.items, public.user_items, public.referrals,
  public.roulette_prizes, public.roulette_spins to authenticated;
grant select on public.gifts to anon, authenticated;
-- achievements, user_achievements e reveals: nenhum acesso direto (só pelas funções, que escondem os segredos)

revoke all on function public.grant_mimos(uuid, int, text, text, uuid), public.spend_mimos(uuid, int, text, text, uuid),
  public.reward(uuid, text, text, uuid), public.reward_referral(uuid, uuid, uuid), public.check_achievements(uuid),
  public.metric_value(uuid, text), public.owns_item(uuid, text) from public, anon, authenticated;

revoke all on function public.buy_item(text), public.equip_item(text, text), public.roulette_status(), public.spin_roulette(),
  public.send_gift(uuid, text), public.open_gift(uuid), public.claim_referral(text), public.my_referrals(),
  public.my_achievements(), public.mark_reveal_seen(uuid), public.owns_look(uuid, jsonb), public.add_ornament(uuid, text, text, text, int),
  public.count_exchanged(uuid), public.block_user(uuid) from public, anon;
grant execute on function public.buy_item(text), public.equip_item(text, text), public.roulette_status(), public.spin_roulette(),
  public.send_gift(uuid, text), public.open_gift(uuid), public.claim_referral(text), public.my_referrals(),
  public.my_achievements(), public.mark_reveal_seen(uuid), public.owns_look(uuid, jsonb), public.add_ornament(uuid, text, text, text, int),
  public.count_exchanged(uuid), public.block_user(uuid) to authenticated;

revoke all on function public.server_now(), public.today_sp(), public.profile_cosmetics(uuid), public.public_achievements(uuid) from public;
grant execute on function public.server_now(), public.today_sp(), public.profile_cosmetics(uuid), public.public_achievements(uuid) to anon, authenticated;

grant update (username, display_name, avatar_url, music_url, card_url) on public.profiles to authenticated;

-- =====================================================================
-- ajustes de loja, presentes e perfil (patch 20261127)
-- =====================================================================
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
