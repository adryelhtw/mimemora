-- helper de teste (só no banco local de teste)
create or replace function public.attempt(p_label text, p_expect text, p_stmt text) returns void language plpgsql as $$
declare v_got text; v_rows bigint;
begin
  begin
    execute p_stmt; get diagnostics v_rows = row_count; v_got := 'ok:' || v_rows;
  exception when others then v_got := coalesce(nullif(sqlerrm, ''), sqlstate);
  end;
  raise notice '% | % | esperado "%" obtido "%"', case when v_got like p_expect then 'PASS' else 'FAIL' end, p_label, p_expect, v_got;
end $$;
grant execute on function public.attempt(text, text, text) to anon, authenticated;

insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','a@x'),('00000000-0000-0000-0000-00000000000b','b@x'),
 ('00000000-0000-0000-0000-00000000000c','c@x'),('00000000-0000-0000-0000-00000000000d','d@x'),
 ('00000000-0000-0000-0000-00000000000e','e@x');
update public.profiles set username = 'dona' where id='00000000-0000-0000-0000-00000000000a';
update public.profiles set username = 'bruno' where id='00000000-0000-0000-0000-00000000000b';
update public.profiles set username = 'carla' where id='00000000-0000-0000-0000-00000000000c';
update public.profiles set username = 'dani' where id='00000000-0000-0000-0000-00000000000d';
update public.profiles set username = 'edu' where id='00000000-0000-0000-0000-00000000000e';
select public.grant_mimos(id, 1000, 'teste', 'seed') from public.profiles;

-- baseline: evento ABERTO (antes de 25/12): árvore da dona, enfeite do Bruno, presentes
update public.events set starts_at = now() - interval '10 days', opens_at = now() + interval '5 days', ends_at = now() + interval '12 days' where slug='natal-2026';
insert into public.participations (user_id, event_id, config)
  select '00000000-0000-0000-0000-00000000000a', id, '{"model":"classica","lights":"douradas","topper":"estrela","scene":"neve"}' from public.events where slug='natal-2026';
