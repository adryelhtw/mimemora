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
