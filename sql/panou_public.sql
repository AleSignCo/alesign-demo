-- Totalurile publice pentru /panou, /liber și /dovada (banda „Live din sistem”, graficul zilnic, locurile de abonament).
-- Rulează o dată în Supabase → SQL Editor. Întoarce doar numere agregate, fără nicio dată despre vreo firmă sau persoană.
-- Ce nu vrei să arăți public, scoate din json_build_object: paginile afișează doar cheile pe care le primesc.

create or replace function public.panou_public()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'firme_analizate', (select count(*) from leaduri where sursa = 'research'),
    'audituri',        (select count(*) from leaduri where audit_scor is not null),
    'mostre',          (select count(*) from leaduri where mostra_trimisa_la is not null),
    'apeluri',         (select count(*) from apeluri_log),
    'clienti_activi',  (select count(*) from leaduri where status = 'Client'),
    -- câte firme a găsit Research în fiecare din ultimele 30 de zile (zilele fără nimic apar cu 0)
    'research_zilnic', (
      select json_agg(json_build_object('zi', z.zi, 'n', coalesce(c.n, 0)) order by z.zi)
      from (select generate_series(current_date - 29, current_date, interval '1 day')::date as zi) z
      left join (
        select coalesce(gasit_la, creat_la)::date as zi, count(*) as n
        from leaduri
        where sursa = 'research' and coalesce(gasit_la, creat_la) >= current_date - 29
        group by 1
      ) c on c.zi = z.zi
    ),
    -- locurile de abonament: aceeași setare ca în Founder OS → Setări (implicit 20)
    'locuri_total',    coalesce((select nullif(valoare, '')::int from setari where cheie = 'locuri_abonamente'), 20),
    'locuri_ocupate',  (select count(*) from leaduri where status = 'Client'),
    'actualizat_la',   now()
  );
$$;

revoke all on function public.panou_public() from public;
grant execute on function public.panou_public() to anon, authenticated;
