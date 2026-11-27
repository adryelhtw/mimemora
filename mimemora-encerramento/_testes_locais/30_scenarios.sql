\set ON_ERROR_STOP 0
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'
\set D '00000000-0000-0000-0000-00000000000d'
\set E '00000000-0000-0000-0000-00000000000e'
select id as tree from public.participations limit 1 \gset
select c.id as letter from public.contributions c order by slot limit 1 \gset
select g.id as box from public.gifts g where kind='misterioso' limit 1 \gset
\set LOOK '''{"model":"classica","lights":"douradas","topper":"estrela","scene":"neve"}'''

\echo ===== S1: 24/12 23:59 (opens_at = agora + 1 min) =====
begin;
update public.events set opens_at = now() + interval '1 minute', ends_at = now() + interval '7 days' where slug='natal-2026';
set local role authenticated; select set_config('request.jwt.claim.sub', :'D', true);
select public.attempt('S1 criar árvore (Dani)', 'ok:1', format('insert into public.participations (user_id,event_id,config) select %L, id, %L::jsonb from public.events where slug=''natal-2026''', :'D', :LOOK));
select set_config('request.jwt.claim.sub', :'E', true);
select public.attempt('S1 enfeitar', 'ok:1', format('select public.add_ornament(%L,''lua'',''oi'',''verso'',3)', :'tree'));
select public.attempt('S1 Presente Misterioso', 'ok:1', format('select public.send_gift(%L,''misterioso'')', :'tree'));
select public.attempt('S1 Brilho Mágico', 'ok:1', format('select public.send_gift(%L,''brilho'')', :'tree'));
rollback;

\echo ===== S2: 25/12 00:00 exato (opens_at = now()) =====
begin;
update public.events set opens_at = now(), ends_at = now() + interval '7 days' where slug='natal-2026';
set local role authenticated; select set_config('request.jwt.claim.sub', :'D', true);
select public.attempt('S2 criar árvore bloqueado', '%row-level security%', format('insert into public.participations (user_id,event_id,config) select %L, id, %L::jsonb from public.events where slug=''natal-2026''', :'D', :LOOK));
select set_config('request.jwt.claim.sub', :'E', true);
select public.attempt('S2 enfeitar bloqueado', 'event_closed', format('select public.add_ornament(%L,''lua'',''oi'',''verso'',3)', :'tree'));
select public.attempt('S2 Presente Misterioso bloqueado', 'event_closed', format('select public.send_gift(%L,''misterioso'')', :'tree'));
select public.attempt('S2 Brilho Mágico permitido', 'ok:1', format('select public.send_gift(%L,''brilho'')', :'tree'));
rollback;

\echo ===== S3: 25/12 a 31/12 =====
begin;
update public.events set opens_at = now() - interval '2 days', ends_at = now() + interval '5 days' where slug='natal-2026';
set local role authenticated; select set_config('request.jwt.claim.sub', :'D', true);
select public.attempt('S3 criar árvore bloqueado', '%row-level security%', format('insert into public.participations (user_id,event_id,config) select %L, id, %L::jsonb from public.events where slug=''natal-2026''', :'D', :LOOK));
select public.attempt('S3 Brilho Mágico (Dani) permitido', 'ok:1', format('select public.send_gift(%L,''brilho'')', :'tree'));
select public.attempt('S3 enfeite bloqueado', 'event_closed', format('select public.add_ornament(%L,''lua'',''oi'',''verso'',3)', :'tree'));
select public.attempt('S3 misterioso bloqueado', 'event_closed', format('select public.send_gift(%L,''misterioso'')', :'tree'));
select set_config('request.jwt.claim.sub', :'A', true);
select public.attempt('S3 dono abre carta', 'ok:1', format('select public.open_letter(%L)', :'letter'));
select public.attempt('S3 dono abre presente pendente', 'ok:1', format('select public.open_gift(%L)', :'box'));
select public.attempt('S3 abertura duplicada bloqueada', 'already_opened', format('select public.open_gift(%L)', :'box'));
select public.attempt('S3 mark_reveal_seen ok', 'ok:1', format('select public.mark_reveal_seen(id) from public.events where slug=''natal-2026'''));
select set_config('request.jwt.claim.sub', :'B', true);
select public.attempt('S3 não-dono não abre presente', 'not_owner', format('select public.open_gift(%L)', :'box'));
rollback;

\echo ===== S4: 01/01/2027 00:00 exato (ends_at = now()) =====
begin;
update public.events set opens_at = now() - interval '7 days', ends_at = now() where slug='natal-2026';
set local role authenticated; select set_config('request.jwt.claim.sub', :'D', true);
select public.attempt('S4 criar árvore bloqueado', '%row-level security%', format('insert into public.participations (user_id,event_id,config) select %L, id, %L::jsonb from public.events where slug=''natal-2026''', :'D', :LOOK));
select public.attempt('S4 enfeite bloqueado', 'event_closed', format('select public.add_ornament(%L,''lua'',''oi'',''verso'',3)', :'tree'));
select public.attempt('S4 misterioso bloqueado', 'event_closed', format('select public.send_gift(%L,''misterioso'')', :'tree'));
select public.attempt('S4 Brilho bloqueado', 'event_closed', format('select public.send_gift(%L,''brilho'')', :'tree'));
select public.attempt('S4 árvore privada invisível p/ Dani', 'ok:0', format('select 1 from public.participations where id=%L', :'tree'));
select public.attempt('S4 enfeites invisíveis p/ Dani (privada)', 'ok:0', format('select 1 from public.contributions where participation_id=%L', :'tree'));
select public.attempt('S4 presentes invisíveis p/ Dani (privada)', 'ok:0', format('select 1 from public.gifts where participation_id=%L', :'tree'));
select public.attempt('S4 memory_gifts vazio p/ Dani (privada)', 'ok:0', format('select * from public.memory_gifts(%L)', :'tree'));
select public.attempt('S4 memory_glow_givers vazio p/ Dani (privada)', 'ok:0', format('select * from public.memory_glow_givers(%L)', :'tree'));
select public.attempt('S4 read_letter privada', 'private_memory', format('select public.read_letter(%L)', :'letter'));
select public.attempt('S4 escrita direta em gifts negada', '%permission denied%', format('insert into public.gifts (kind,sender_id,participation_id) values (''brilho'',%L,%L)', :'D', :'tree'));
select public.attempt('S4 update direto em participations negado', '%permission denied%', format('update public.participations set memory_public=true where id=%L', :'tree'));
set local role authenticated; select set_config('request.jwt.claim.sub', :'A', true);
select public.attempt('S4 dono vê a árvore', 'ok:1', format('select 1 from public.participations where id=%L', :'tree'));
select public.attempt('S4 dono abre carta (leitura)', 'ok:1', format('select public.open_letter(%L)', :'letter'));
select public.attempt('S4 mark_reveal_seen bloqueado', 'event_closed', format('select public.mark_reveal_seen(id) from public.events where slug=''natal-2026'''));
select public.attempt('S4 dono NÃO remove enfeite (RLS)', 'ok:0', format('delete from public.contributions where id=%L', :'letter'));
select public.attempt('S4 dono abre presente pendente', 'ok:1', format('select public.open_gift(%L)', :'box'));
select public.attempt('S4 abertura duplicada', 'already_opened', format('select public.open_gift(%L)', :'box'));
select public.attempt('S4 dono vê memory_gifts (2)', 'ok:2', format('select * from public.memory_gifts(%L)', :'tree'));
select public.attempt('S4 dono vê glow givers (1)', 'ok:1', format('select * from public.memory_glow_givers(%L)', :'tree'));
select 'DONO vê recompensa:' as info, sender, kind, opened_at is not null as aberto, reward_label, reward_mimos from public.memory_gifts(:'tree');
select public.attempt('S4 set_memory_visibility permitido', 'ok:1', format('select public.set_memory_visibility(%L,true)', :'tree'));
reset role;
select 'S4 pós-fim: ornament_opens do dono (esperado 1: só a carta aberta em S4? ver abaixo)' as info, count(*) as aberturas, (select revealed_at is not null from public.participations) as revealed from public.ornament_opens;
set local role authenticated; select set_config('request.jwt.claim.sub', :'A', true);
-- memória agora pública
reset role; set local role authenticated; select set_config('request.jwt.claim.sub', :'D', true);
select public.attempt('S4 pública: Dani vê a árvore', 'ok:1', format('select 1 from public.participations where id=%L', :'tree'));
select public.attempt('S4 pública: Dani lê carta', 'ok:1', format('select public.read_letter(%L)', :'letter'));
select public.attempt('S4 pública: Dani vê memory_gifts', 'ok:2', format('select * from public.memory_gifts(%L)', :'tree'));
select 'DANI vê (sem recompensa):' as info, sender, kind, reward_label, reward_mimos, is_owner from public.memory_gifts(:'tree');
select public.attempt('S4 pública: Dani vê glow givers', 'ok:1', format('select * from public.memory_glow_givers(%L)', :'tree'));
reset role; set local role anon; select set_config('request.jwt.claim.sub', '', true);
select public.attempt('S4 pública: anônimo vê memory_gifts', 'ok:2', format('select * from public.memory_gifts(%L)', :'tree'));
select public.attempt('S4 pública: anônimo NÃO lê carta', '%permission denied%', format('select public.read_letter(%L)', :'letter'));
-- bloqueio
reset role; insert into public.blocks (blocker_id, blocked_id) values (:'A', :'E');
set local role authenticated; select set_config('request.jwt.claim.sub', :'E', true);
select public.attempt('S4 pública mas bloqueado: Edu não vê memory_gifts', 'ok:0', format('select * from public.memory_gifts(%L)', :'tree'));
select public.attempt('S4 pública mas bloqueado: Edu não vê árvore', 'ok:0', format('select 1 from public.participations where id=%L', :'tree'));
rollback;

\echo ===== S5: Brilho repetido de uma mesma pessoa não duplica o usuário =====
begin;
update public.events set opens_at = now() - interval '2 days', ends_at = now() + interval '5 days' where slug='natal-2026';
set local role authenticated; select set_config('request.jwt.claim.sub', :'C', true);
select public.attempt('S5 Carla envia 2º brilho (o 1º expirou)', 'ok:1', format('select public.send_gift(%L,''brilho'')', :'tree'));
reset role; update public.gifts set expires_at = now() - interval '1 hour' where kind='brilho';
update public.events set opens_at = now() - interval '9 days', ends_at = now() where slug='natal-2026';
update public.participations set memory_public = true;
set local role authenticated; select set_config('request.jwt.claim.sub', :'D', true);
select 'givers' as info, username, total from public.memory_glow_givers(:'tree');
rollback;
