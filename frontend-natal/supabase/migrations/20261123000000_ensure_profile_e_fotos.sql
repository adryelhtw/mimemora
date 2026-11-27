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
