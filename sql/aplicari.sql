-- Aplicările din paginile de campanie (/liber, /dovada). Rulează o dată în Supabase → SQL Editor.
-- Fiecare aplicare se păstrează cu varianta paginii și sursa campaniei (UTM), ca să vezi care pagină aduce oameni,
-- și intră ca lead nou în Founder OS (leaduri, sursa 'landing', status 'Nou').

create table if not exists public.aplicari (
  id          bigint generated always as identity primary key,
  creat_la    timestamptz not null default now(),
  varianta    text not null,               -- 'liber' | 'dovada' | 'alesystem'
  nume        text not null,
  firma       text,
  oras        text,
  nisa        text,
  telefon     text not null,
  email       text,
  canal       text,
  are_site    boolean,
  site        text,
  buget       text,
  obiectiv    text,
  pachet      text,
  dureri      text[],
  mesaj       text,
  utm         jsonb not null default '{}'::jsonb,
  pagina      text,
  referrer    text,
  acord       boolean not null,
  ip          text,
  lead_id     bigint,
  status      text not null default 'Nouă'
);
create index if not exists aplicari_creat_la on public.aplicari (creat_la desc);
create index if not exists aplicari_telefon on public.aplicari (telefon);

-- fără politici: nimeni nu citește sau scrie direct; doar funcția de mai jos scrie
alter table public.aplicari enable row level security;

create or replace function public.aplicare_noua(p jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id      bigint;
  v_lead    bigint;
  v_nume    text := left(trim(coalesce(p->>'nume', '')), 120);
  v_tel     text := left(trim(coalesce(p->>'telefon', '')), 40);
  v_email   text := nullif(left(trim(coalesce(p->>'email', '')), 160), '');
  v_firma   text := nullif(left(trim(coalesce(p->>'firma', '')), 160), '');
  v_oras    text := nullif(left(trim(coalesce(p->>'oras', '')), 80), '');
  v_nisa    text := nullif(left(trim(coalesce(p->>'nisa', '')), 80), '');
  v_site    text := nullif(left(trim(coalesce(p->>'site', '')), 200), '');
  v_are     boolean := case when p ? 'are_site' and jsonb_typeof(p->'are_site') = 'boolean' then (p->>'are_site')::boolean end;
begin
  if coalesce((p->>'acord')::boolean, false) is not true then raise exception 'acord lipsa'; end if;
  if length(v_nume) < 2 or length(regexp_replace(v_tel, '\D', '', 'g')) < 9 then raise exception 'date lipsa'; end if;
  if (select count(*) from aplicari where telefon = v_tel and creat_la > now() - interval '1 day') >= 3 then
    raise exception 'prea multe cereri';
  end if;

  insert into aplicari (varianta, nume, firma, oras, nisa, telefon, email, canal, are_site, site, buget, obiectiv, pachet, dureri, mesaj, utm, pagina, referrer, acord, ip)
  values (
    left(coalesce(p->>'varianta', 'necunoscut'), 20), v_nume, v_firma, v_oras, v_nisa, v_tel, v_email,
    left(coalesce(p->>'canal', 'whatsapp'), 20), v_are, v_site,
    nullif(left(coalesce(p->>'buget', ''), 60), ''), nullif(left(coalesce(p->>'obiectiv', ''), 200), ''), nullif(left(coalesce(p->>'pachet', ''), 80), ''),
    case when jsonb_typeof(p->'dureri') = 'array' then array(select left(x, 120) from jsonb_array_elements_text(p->'dureri') x limit 10) else null end,
    nullif(left(coalesce(p->>'mesaj', ''), 1500), ''),
    case when jsonb_typeof(p->'utm') = 'object' then p->'utm' else '{}'::jsonb end,
    left(coalesce(p->>'pagina', ''), 120), left(coalesce(p->>'referrer', ''), 300), true, left(coalesce(p->>'ip', ''), 64)
  )
  returning id into v_id;

  -- lead nou în Founder OS; dacă tabelul are alte reguli (un telefon deja existent, o coloană obligatorie), aplicarea rămâne oricum salvată
  begin
    insert into leaduri (firma, nisa, oras, status, scor, cu_site, premium, sursa, telefon, email, domeniu_site, notite)
    values (
      coalesce(v_firma, v_nume), coalesce(v_nisa, 'General'), coalesce(v_oras, 'București'), 'Nou', 0, coalesce(v_are, false), false, 'landing',
      v_tel, v_email, v_site,
      'Aplicare de pe /' || coalesce(p->>'varianta', '?') || ' · ' || v_nume
        || coalesce(' · campanie: ' || nullif(p->'utm'->>'utm_campaign', ''), '')
        || coalesce(' · ' || nullif(p->>'obiectiv', ''), '')
        || coalesce(' · ' || nullif(p->>'mesaj', ''), '')
    )
    returning id into v_lead;
    update aplicari set lead_id = v_lead where id = v_id;
  exception when others then
    null;
  end;

  return json_build_object('id', v_id, 'lead_id', v_lead);
end;
$$;

revoke all on function public.aplicare_noua(jsonb) from public;
grant execute on function public.aplicare_noua(jsonb) to anon, authenticated;
