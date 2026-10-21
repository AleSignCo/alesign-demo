-- Panoul public (demo.alesign.net/panou): totalurile din bandă „Live din sistem”.
-- Rulează o dată în Supabase → SQL Editor. Întoarce doar numere agregate, fără nicio dată despre vreo firmă sau persoană.
-- Ce nu vrei să arăți public, scoate din json_build_object: pagina afișează doar cheile pe care le primește.

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
    'actualizat_la',   now()
  );
$$;

revoke all on function public.panou_public() from public;
grant execute on function public.panou_public() to anon, authenticated;
