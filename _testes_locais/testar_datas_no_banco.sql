-- TESTE DE DATAS NO BANCO (Supabase > SQL Editor). Vale para TODOS os usuários enquanto estiver alterado: use rápido, ou num projeto Supabase de teste.

-- 1) Guardar as datas reais (rode uma vez)
create table if not exists public._backup_events as select * from public.events where slug = 'natal-2026';

-- 2) Escolha UM cenário e rode:
-- 2a) simular 25/12 a 31/12 (revelação)
update public.events set opens_at = now() - interval '1 day',  ends_at = now() + interval '6 days' where slug = 'natal-2026';
-- 2b) simular depois de 01/01 (encerrado)
-- update public.events set opens_at = now() - interval '8 days', ends_at = now() - interval '1 minute' where slug = 'natal-2026';

-- 3) RESTAURAR as datas reais (não esqueça!)
-- update public.events e set starts_at = b.starts_at, opens_at = b.opens_at, ends_at = b.ends_at, expectation_at = b.expectation_at from public._backup_events b where e.slug = b.slug;
-- conferir: select slug, starts_at, opens_at, ends_at from public.events;   -- ends_at deve ser 2027-01-01 03:00:00+00
