-- PATCH (não destrutivo): rode no SQL Editor se você JÁ rodou o schema completo.
-- Corrige "permission denied", permite avatares padrão e garante perfil para contas já criadas.

-- 1) permissões explícitas (projetos novos do Supabase não liberam as tabelas sozinhos)
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.events, public.participations, public.contributions to anon, authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;
grant insert on public.participations to authenticated;
grant delete on public.contributions to authenticated;
grant select on public.contribution_messages to authenticated;

-- 2) avatar: foto https (Google/Storage) ou ícone padrão "preset:nome"
alter table public.profiles drop constraint if exists profiles_avatar_valid;
alter table public.profiles add constraint profiles_avatar_valid
  check (avatar_url is null or avatar_url ~ '^(https://.+|preset:[a-z-]{2,20})$');

-- 3) garante um perfil para toda conta existente
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
