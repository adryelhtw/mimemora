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
