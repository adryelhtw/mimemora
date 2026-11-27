select id as tree from public.participations limit 1 \gset
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',true);
select public.add_ornament(:'tree','estrela','Feliz Natal da Bruno',  'frente', 0);
select public.send_gift(:'tree','misterioso');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',true);
select public.add_ornament(:'tree','sino','Feliz Natal da Carla', 'frente', 1);
select public.send_gift(:'tree','brilho');
reset role;
-- o brilho da Carla já expirou (3 dias passaram)
update public.gifts set expires_at = now() - interval '1 day' where kind='brilho';
commit;
select kind, count(*) from public.gifts group by 1;
