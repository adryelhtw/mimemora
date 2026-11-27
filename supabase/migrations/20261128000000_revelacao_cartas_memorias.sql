-- PATCH (não destrutivo). Rode no SQL Editor do Supabase depois do patch 20261127. Seguro de rodar mais de uma vez.
-- Dia 25 (revelação): revealed_at por usuário/evento, registro individual de cartas abertas, leitura só por funções.
-- Dia 1 (encerramento): memórias com visibilidade própria (pública/privada, padrão privada) por evento.

-- ============ 1) revealed_at e memory_public no registro da árvore (usuário x evento) ============
-- A participação já é "uma linha por usuário e por evento": é o lugar certo para as duas informações.
alter table public.participations add column if not exists revealed_at timestamptz;                  -- 1ª carta aberta pelo dono
alter table public.participations add column if not exists memory_public boolean not null default false;  -- memória pública? (padrão: privada)

-- A árvore continua imutável: só revealed_at (uma vez, de nulo para data) e memory_public podem mudar.
create or replace function public.participations_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'revealed_at' - 'memory_public') is distinct from (to_jsonb(old) - 'revealed_at' - 'memory_public') then
    raise exception 'immutable' using hint = 'Este registro não pode ser alterado depois de criado.';
  end if;
  if old.revealed_at is not null and new.revealed_at is distinct from old.revealed_at then
    raise exception 'immutable' using hint = 'A primeira revelação não pode ser alterada.';
  end if;
  return new;
end;
$$;
drop trigger if exists participations_no_update on public.participations;
create trigger participations_no_update before update on public.participations for each row execute function public.participations_guard();
-- (nenhum UPDATE direto é liberado para o app: as colunas só mudam pelas funções abaixo)

-- ============ 2) cartas abertas pelo dono (uma linha por usuário/evento/enfeite) ============
create table if not exists public.ornament_opens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  decoration_id uuid not null references public.contributions (id) on delete cascade,   -- o enfeite (contributions.id)
  opened_at timestamptz not null default now(),
  primary key (user_id, event_id, decoration_id)                                          -- unicidade
);
create index if not exists ornament_opens_user_event on public.ornament_opens (user_id, event_id);

alter table public.ornament_opens enable row level security;
drop policy if exists "aberturas próprias" on public.ornament_opens;
create policy "aberturas próprias" on public.ornament_opens for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.ornament_opens from anon, authenticated;
grant select on public.ornament_opens to authenticated;     -- escrita só pela função open_letter

-- ============ 3) mensagens: ninguém lê a tabela direto; só as funções abaixo (que conferem tudo no servidor) ============
drop policy if exists "dono lê a mensagem após a abertura" on public.contribution_messages;
revoke select on public.contribution_messages from anon, authenticated;

-- ---------- DONO abre uma carta: confere dono + data, registra revealed_at (1ª vez) e a abertura individual ----------
create or replace function public.open_letter(p_contribution uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_part uuid; v_owner uuid; v_event uuid; v_opens timestamptz; v_ends timestamptz; v_rev timestamptz;
  v_body text; v_first boolean; v_n int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select p.id, p.user_id, p.event_id, e.opens_at, e.ends_at
    into v_part, v_owner, v_event, v_opens, v_ends
    from public.contributions c
    join public.participations p on p.id = c.participation_id
    join public.events e on e.id = p.event_id
   where c.id = p_contribution;
  if not found then raise exception 'letter_not_found'; end if;
  if v_owner <> v_uid then raise exception 'not_owner'; end if;
  if now() < v_opens then raise exception 'not_open_yet'; end if;
  select body into v_body from public.contribution_messages where contribution_id = p_contribution;
  if v_body is null then raise exception 'letter_not_found'; end if;

  if now() < v_ends then
    -- evento em andamento: registra a primeira revelação (uma única vez) e a abertura desta carta (uma única vez)
    update public.participations set revealed_at = now() where id = v_part and revealed_at is null;
    insert into public.ornament_opens (user_id, event_id, decoration_id) values (v_uid, v_event, p_contribution) on conflict do nothing;
    get diagnostics v_n = row_count;
    v_first := v_n > 0;
  else
    -- evento encerrado (memória): somente leitura, nada é gravado
    v_first := not exists (select 1 from public.ornament_opens where user_id = v_uid and event_id = v_event and decoration_id = p_contribution);
  end if;

  select revealed_at into v_rev from public.participations where id = v_part;
  return jsonb_build_object('body', v_body, 'first_time', v_first, 'revealed_at', v_rev);
end; $$;

-- ---------- VISITANTE lê uma carta: nunca grava nada; só depois da revelação do dono (ou, encerrado o evento, se a memória for pública) ----------
create or replace function public.read_letter(p_contribution uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid; v_opens timestamptz; v_ends timestamptz; v_rev timestamptz; v_public boolean; v_body text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select p.user_id, e.opens_at, e.ends_at, p.revealed_at, p.memory_public
    into v_owner, v_opens, v_ends, v_rev, v_public
    from public.contributions c
    join public.participations p on p.id = c.participation_id
    join public.events e on e.id = p.event_id
   where c.id = p_contribution;
  if not found then raise exception 'letter_not_found'; end if;
  if v_owner = v_uid then raise exception 'not_allowed'; end if;          -- o dono usa open_letter
  if public.has_block(v_uid, v_owner) then raise exception 'blocked'; end if;
  if now() < v_opens then raise exception 'not_open_yet'; end if;
  if now() < v_ends then
    if v_rev is null then raise exception 'not_revealed'; end if;          -- o dono ainda não fez a primeira revelação
  elsif not v_public then
    raise exception 'private_memory';                                      -- memória privada
  end if;
  select body into v_body from public.contribution_messages where contribution_id = p_contribution;
  if v_body is null then raise exception 'letter_not_found'; end if;
  return jsonb_build_object('body', v_body);
end; $$;

-- ---------- DONO define a visibilidade da memória deste evento ----------
create or replace function public.set_memory_visibility(p_participation uuid, p_public boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.participations set memory_public = coalesce(p_public, false) where id = p_participation and user_id = auth.uid();
  if not found then raise exception 'tree_not_found'; end if;
end; $$;

revoke all on function public.open_letter(uuid), public.read_letter(uuid), public.set_memory_visibility(uuid, boolean) from public, anon;
grant execute on function public.open_letter(uuid), public.read_letter(uuid), public.set_memory_visibility(uuid, boolean) to authenticated;

-- ============ 4) privacidade por evento no banco: memória privada não aparece para ninguém além do dono ============
-- Depois do fim do evento, a árvore (e, por consequência, enfeites e presentes) só é visível ao dono ou se memory_public = true.
-- Antes do fim, tudo continua como antes (regra de bloqueio incluída).
drop policy if exists "árvores visíveis" on public.participations;
create policy "árvores visíveis" on public.participations for select
  using (
    ((select auth.uid()) is null or user_id = (select auth.uid()) or not public.has_block((select auth.uid()), user_id))
    and (
      user_id = (select auth.uid())
      or memory_public
      or not exists (select 1 from public.events e where e.id = participations.event_id and now() >= e.ends_at)
    )
  );

notify pgrst, 'reload schema';
