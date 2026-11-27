-- Uma mensagem só fica pública depois que o dono da árvore abre sua carta.
-- O horário oficial continua sendo validado pelo relógio do banco (events.opens_at).

alter table public.contribution_messages
  add column if not exists opened_at timestamptz;

-- Leitura direta continua restrita ao dono da árvore e só depois da abertura oficial.
drop policy if exists "dono lê a mensagem após a abertura" on public.contribution_messages;
create policy "dono lê as próprias mensagens após a abertura" on public.contribution_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.contributions c
      join public.participations p on p.id = c.participation_id
      join public.events e on e.id = p.event_id
      where c.id = contribution_messages.contribution_id
        and p.user_id = (select auth.uid())
        and now() >= e.opens_at
    )
  );

-- O dono registra a primeira abertura da carta. A data não pode ser alterada depois.
create or replace function public.open_own_letter(p_contribution uuid)
returns table (first_open boolean, body text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_first boolean;
  v_body text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select (cm.opened_at is null), cm.body
    into v_first, v_body
  from public.contribution_messages cm
  join public.contributions c on c.id = cm.contribution_id
  join public.participations p on p.id = c.participation_id
  join public.events e on e.id = p.event_id
  where c.id = p_contribution
    and p.user_id = v_uid
    and now() >= e.opens_at
  for update of cm;

  if not found then raise exception 'letter_not_available'; end if;

  update public.contribution_messages cm
    set opened_at = coalesce(cm.opened_at, now())
  where cm.contribution_id = p_contribution;

  return query select v_first, v_body;
end;
$$;

-- Visitantes só recebem mensagens cuja carta o dono já abriu.
-- A função também valida opens_at, então não há vazamento antes do dia 25.
create or replace function public.public_opened_letters(p_participation uuid)
returns table (
  id uuid,
  item_type text,
  side text,
  sender_username text,
  body text,
  opened_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.item_type, c.side, s.username, cm.body, cm.opened_at
  from public.participations p
  join public.events e on e.id = p.event_id
  join public.contributions c on c.participation_id = p.id
  join public.contribution_messages cm on cm.contribution_id = c.id
  left join public.profiles s on s.id = c.sender_id
  where p.id = p_participation
    and now() >= e.opens_at
    and cm.opened_at is not null
  order by c.created_at;
$$;

revoke all on function public.open_own_letter(uuid) from public, anon;
revoke all on function public.public_opened_letters(uuid) from public;
grant execute on function public.open_own_letter(uuid) to authenticated;
grant execute on function public.public_opened_letters(uuid) to anon, authenticated;
