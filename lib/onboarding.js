// Pagina de pornire a clientului (pasul 9): demo.alesign.net/o/<slug>. Cinci pași, salvare la fiecare pas, upload direct în Supabase Storage.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const prenume = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const MARCA = `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="28" cy="28" r="20"/><circle cx="28" cy="28" r="5" fill="currentColor" stroke="none"/><circle cx="42.1" cy="13.9" r="6" fill="#ff2a2e" stroke="none"/></svg>`;
const TIP = { beauty: 'salon', barbershop: 'barbershop', wellness: 'spa', spa: 'spa', medical: 'cabinet', horeca: 'restaurant' };

export function randeazaOnboarding(d, { supabaseUrl = '', supabaseKey = '', preview = false } = {}) {
  const R = d.raspunsuri || {};
  const C = d.contract || {};
  const fis = Array.isArray(d.fisiere) ? d.fisiere : [];
  const tip = TIP[String(d.nisa || '').toLowerCase()] || 'business';
  const cine = prenume(C.client_reprezentant);
  const gata = !!d.completat_la;
  const v = (k) => esc(R[k] || '');
  const chk = (k, val) => (R[k] === val ? ' checked' : '');
  const poze = fis.filter((f) => f.categorie !== 'logo');
  const logo = fis.filter((f) => f.categorie === 'logo');

  const PASI = [
    { id: 'despre', t: 'Despre tine', h: 'Cine ești și ce te face diferit.', p: `Trei întrebări. Răspunsurile tale sunt materia primă pentru texte: cu cât mai concret, cu atât mai bine.`, html: `
      <div class="row"><div class="f"><label for="contact">Persoana de contact</label><input id="contact" name="contact" value="${v('contact') || esc(C.client_reprezentant || '')}" placeholder="Prenume Nume"></div><div class="f"><label for="whatsapp">WhatsApp pentru aprobări</label><input id="whatsapp" name="whatsapp" value="${v('whatsapp')}" placeholder="07xx xxx xxx"></div></div>
      <div class="f"><label for="diferit">Ce spun clienții tăi cel mai des despre tine?</label><textarea id="diferit" name="diferit" rows="3" placeholder="De exemplu: „nu simți că treci printr-o fabrică”, „îmi amintesc cum îmi place cafeaua”, „ies mereu exact cu ce am cerut”.">${v('diferit')}</textarea></div>
      <div class="f"><label for="servicii">Serviciile principale și prețurile lor</label><textarea id="servicii" name="servicii" rows="5" placeholder="Câte unul pe rând: Tuns damă · 150 lei&#10;Vopsit · de la 300 lei&#10;…">${v('servicii')}</textarea></div>
      <div class="f"><label for="vedeta">Serviciul pe care vrei să-l vinzi mai mult</label><input id="vedeta" name="vedeta" value="${v('vedeta')}" placeholder="Cel cu marja cea mai bună sau cel care aduce clientul înapoi"></div>` },
    { id: 'poze', t: 'Fotografii', h: 'Pozele tale, nu de pe internet.', p: `Site-ul și postările pornesc de la ce trimiți aici. Nu trebuie să fie profesionale: telefon, lumină bună, fără filtre. 8–20 de poze: interiorul, echipa la lucru, rezultate, detalii care îți plac.`, html: `
      <div class="up" id="up-poze" data-cat="poze"><input type="file" id="in-poze" accept="image/*" multiple hidden><div class="up-in"><b>Trage pozele aici</b> sau <button type="button" class="lnk" data-for="in-poze">alege din telefon</button><span>JPG, PNG, HEIC · maximum 25 MB fiecare</span></div></div>
      <div class="lista" id="lista-poze">${poze.map((f) => `<div class="fi"><span>${esc(f.nume)}</span><i>✓</i></div>`).join('')}</div>
      <p class="hint" id="nr-poze">${poze.length ? `${poze.length} ${poze.length === 1 ? 'poză primită' : 'poze primite'}.` : 'Nicio poză încă.'}</p>
      <div class="f" style="margin-top:22px"><label>Logo <small>(dacă ai)</small></label><div class="up mic" id="up-logo" data-cat="logo"><input type="file" id="in-logo" accept="image/*,.svg,.pdf" hidden><div class="up-in"><b>Logo</b> · <button type="button" class="lnk" data-for="in-logo">alege fișierul</button><span>PNG, SVG sau PDF, cât mai mare</span></div></div><div class="lista" id="lista-logo">${logo.map((f) => `<div class="fi"><span>${esc(f.nume)}</span><i>✓</i></div>`).join('')}</div></div>
      <div class="f"><label>Nu ai logo?</label><div class="seg"><input type="radio" name="logo_stare" id="ls1" value="am"${chk('logo_stare', 'am')}><label for="ls1">L-am urcat</label><input type="radio" name="logo_stare" id="ls2" value="vreau"${chk('logo_stare', 'vreau')}><label for="ls2">Vreau unul, discutăm</label><input type="radio" name="logo_stare" id="ls3" value="fara"${chk('logo_stare', 'fara')}><label for="ls3">Merg cu numele scris frumos</label></div></div>` },
    { id: 'accese', t: 'Accese', h: 'Unde trebuie să ajungem.', p: `Nu îți cerem parole. Ne adaugi ca manager sau ne spui unde sunt lucrurile, iar noi ne descurcăm de acolo.`, html: `
      <div class="card"><h4>Fișa Google (Google Business Profile)</h4><p>Intră pe <b>business.google.com</b> → fișa ta → Setări → Manageri → Adaugă → <b>info@alesign.net</b>, rol Manager. Durează un minut.</p><div class="seg"><input type="radio" name="google" id="g1" value="adaugat"${chk('google', 'adaugat')}><label for="g1">Am adăugat</label><input type="radio" name="google" id="g2" value="nu_stiu"${chk('google', 'nu_stiu')}><label for="g2">Nu știu cine o administrează</label><input type="radio" name="google" id="g3" value="nu_am"${chk('google', 'nu_am')}><label for="g3">Nu am fișă</label></div></div>
      <div class="row"><div class="f"><label for="instagram">Instagram</label><input id="instagram" name="instagram" value="${v('instagram')}" placeholder="@numele_tau"></div><div class="f"><label for="tiktok">TikTok <small>(opțional)</small></label><input id="tiktok" name="tiktok" value="${v('tiktok')}" placeholder="@numele_tau"></div></div>
      <div class="row"><div class="f"><label for="facebook">Facebook <small>(opțional)</small></label><input id="facebook" name="facebook" value="${v('facebook')}" placeholder="link sau nume pagină"></div><div class="f"><label for="domeniu">Domeniul site-ului</label><input id="domeniu" name="domeniu" value="${v('domeniu') || esc(d.domeniu_site || '')}" placeholder="numele-tau.ro sau „nu am”"></div></div>
      <div class="f"><label for="domeniu_unde">Unde e cumpărat domeniul? <small>(dacă ai)</small></label><input id="domeniu_unde" name="domeniu_unde" value="${v('domeniu_unde')}" placeholder="De exemplu: RoTLD, GoDaddy, la un prieten, nu știu"></div>
      <p class="hint">Pentru Instagram și Facebook îți trimit după aceea o cerere de acces prin Meta Business. O accepți cu un click; nu ai nevoie să ne dai parola.</p>` },
    { id: 'program', t: 'Programul și contactul', h: 'Ce apare pe site și în fișa Google.', p: `Ce e scris aici e ce vede clientul. Corectăm o dată, bine.`, html: `
      <div class="row"><div class="f"><label for="telefon_afisat">Telefonul afișat clienților</label><input id="telefon_afisat" name="telefon_afisat" value="${v('telefon_afisat')}" placeholder="07xx xxx xxx"></div><div class="f"><label for="adresa_afisata">Adresa</label><input id="adresa_afisata" name="adresa_afisata" value="${v('adresa_afisata')}" placeholder="Strada, număr, sector"></div></div>
      <div class="f"><label for="program">Programul</label><textarea id="program" name="program" rows="3" placeholder="Luni–Vineri 9–20&#10;Sâmbătă 9–16&#10;Duminică închis">${v('program')}</textarea></div>
      <div class="f"><label>Cum se programează clienții acum</label><div class="seg"><input type="radio" name="programare" id="pr1" value="telefon"${chk('programare', 'telefon')}><label for="pr1">Telefon</label><input type="radio" name="programare" id="pr2" value="whatsapp"${chk('programare', 'whatsapp')}><label for="pr2">WhatsApp</label><input type="radio" name="programare" id="pr3" value="app"${chk('programare', 'app')}><label for="pr3">O aplicație</label></div></div>
      <div class="f"><label for="programare_app">Dacă e o aplicație, care? <small>(opțional)</small></label><input id="programare_app" name="programare_app" value="${v('programare_app')}" placeholder="Fresha, MERO, Booksy, altceva"></div>` },
    { id: 'stil', t: 'Stil și limite', h: 'Cum vrei să sune și să arate.', p: `Ultimul pas. Alegi o direcție, ne spui ce nu vrei niciodată, și e gata.`, html: `
      <div class="f"><label>Direcția vizuală</label><div class="seg col"><input type="radio" name="stil" id="s1" value="cald"${chk('stil', 'cald')}><label for="s1"><b>Cald</b><span>crem, lemn, lumină de după-amiază</span></label><input type="radio" name="stil" id="s2" value="curat"${chk('stil', 'curat')}><label for="s2"><b>Curat</b><span>alb, negru, spațiu, precizie</span></label><input type="radio" name="stil" id="s3" value="indraznet"${chk('stil', 'indraznet')}><label for="s3"><b>Îndrăzneț</b><span>contrast, culoare, atitudine</span></label></div></div>
      <div class="f"><label>Tonul comunicării</label><div class="seg col"><input type="radio" name="ton" id="t1" value="prietenos"${chk('ton', 'prietenos')}><label for="t1"><b>Prietenos</b><span>„tu”, cald, ca între cunoscuți</span></label><input type="radio" name="ton" id="t2" value="elegant"${chk('ton', 'elegant')}><label for="t2"><b>Elegant</b><span>„dumneavoastră”, calm, rafinat</span></label><input type="radio" name="ton" id="t3" value="direct"${chk('ton', 'direct')}><label for="t3"><b>Direct</b><span>scurt, sigur, fără înflorituri</span></label></div></div>
      <div class="f"><label for="niciodata">Ce NU vrem să facem niciodată în numele tău</label><textarea id="niciodata" name="niciodata" rows="3" placeholder="De exemplu: reduceri agresive, poze cu clienți fără acord, glume, emoji-uri…">${v('niciodata')}</textarea></div>
      <div class="f"><label for="altceva">Altceva ce ar trebui să știm <small>(opțional)</small></label><textarea id="altceva" name="altceva" rows="3" placeholder="Concurenți pe care îi urmărești, un eveniment care vine, o promoție deja anunțată…">${v('altceva')}</textarea></div>` },
  ];
  const pasCurent = Math.min(Number(d.pasi_gata || 0), PASI.length - 1);

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Pornire · ${esc(d.firma || C.client_denumire || '')} · AleSign&amp;Co</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#f5f2ec; --text:#141414; --muted:#6b675f; --soft:#a39e94; --surface:#fbf9f5; --line:#e2ddd3; --accent:#ff2a2e; --ink:#0c0c0d; --ink-text:#f4f1ea; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:Manrope, system-ui, sans-serif; line-height:1.65; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  h1,h2,h3,h4,.serif { font-family:'Cormorant Garamond', Georgia, serif; font-weight:600; letter-spacing:-0.01em; line-height:1.08; }
  .wrap { width:min(880px, 100% - 40px); margin:0 auto; }
  .eyebrow { font-size:11.5px; letter-spacing:.24em; text-transform:uppercase; font-weight:700; color:var(--muted); display:flex; align-items:center; gap:10px; }
  .eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--accent); }
  header.top { position:sticky; top:0; z-index:20; background:color-mix(in srgb, var(--bg) 84%, transparent); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
  header.top .wrap { display:flex; align-items:center; justify-content:space-between; height:64px; gap:16px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:14px; letter-spacing:.02em; }
  .brand svg { width:22px; height:22px; }
  .prog { display:flex; align-items:center; gap:10px; font-size:12.5px; color:var(--muted); }
  .prog .bar { width:120px; height:4px; background:var(--line); border-radius:99px; overflow:hidden; }
  .prog .bar i { display:block; height:100%; background:var(--text); width:0; transition:width .6s cubic-bezier(.2,.7,.2,1); }

  .scrisoare { padding:76px 0 40px; }
  .scrisoare h1 { font-size:clamp(40px, 6.4vw, 68px); margin:18px 0 22px; max-width:14ch; }
  .scrisoare h1 .w { display:inline-block; }
  .scrisoare .text p { font-size:clamp(17px, 1.5vw, 19px); margin-bottom:16px; color:#2a2823; max-width:62ch; }
  .scrisoare .text p:first-child { font-family:'Cormorant Garamond', serif; font-size:clamp(23px, 2.5vw, 28px); font-weight:500; color:var(--text); line-height:1.3; }

  .pasi { display:grid; grid-template-columns:220px 1fr; gap:40px; padding:30px 0 90px; align-items:start; }
  nav.lista { position:sticky; top:84px; display:grid; gap:4px; }
  nav.lista button { text-align:left; font:inherit; font-size:14px; font-weight:600; color:var(--muted); background:none; border:0; padding:10px 12px; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:all .2s ease; }
  nav.lista button i { width:26px; height:26px; border-radius:50%; border:1px solid var(--line); display:grid; place-items:center; font-size:11px; font-style:normal; font-weight:700; flex:none; }
  nav.lista button.on { color:var(--text); background:var(--surface); }
  nav.lista button.on i { background:var(--ink); color:var(--ink-text); border-color:var(--ink); }
  nav.lista button.gata i { background:var(--text); color:var(--bg); border-color:var(--text); }
  .pas { display:none; }
  .pas.on { display:block; animation:in .5s cubic-bezier(.2,.7,.2,1); }
  @keyframes in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  .pas h2 { font-size:clamp(30px, 4vw, 40px); margin:12px 0 10px; }
  .pas > p.lead { color:var(--muted); font-size:16px; max-width:58ch; margin-bottom:26px; }
  form { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:30px; display:grid; gap:18px; }
  .f { display:grid; gap:6px; }
  .f label { font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; font-weight:700; color:var(--muted); }
  .f label small { text-transform:none; letter-spacing:0; font-weight:500; }
  .f input, .f textarea { font:inherit; font-size:15.5px; padding:13px 14px; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--text); outline:none; transition:border-color .2s ease, box-shadow .2s ease; width:100%; resize:vertical; }
  .f input:focus, .f textarea:focus { border-color:var(--text); box-shadow:0 0 0 4px rgba(20,20,20,.06); }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .seg { display:flex; gap:6px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:5px; flex-wrap:wrap; }
  .seg label { flex:1; text-align:center; font-size:14px; font-weight:600; padding:9px 8px; border-radius:9px; cursor:pointer; color:var(--muted); transition:all .2s ease; text-transform:none; letter-spacing:0; }
  .seg input { display:none; }
  .seg input:checked + label { background:var(--ink); color:var(--ink-text); }
  .seg.col { display:grid; grid-template-columns:repeat(3, 1fr); }
  .seg.col label { text-align:left; padding:14px 14px; display:grid; gap:2px; }
  .seg.col label b { font-size:15px; } .seg.col label span { font-size:12.5px; font-weight:500; opacity:.8; }
  .card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:20px 22px; display:grid; gap:10px; }
  .card h4 { font-size:22px; } .card p { font-size:14.5px; color:#3b3833; }
  .up { border:1.5px dashed var(--soft); border-radius:16px; padding:34px 20px; text-align:center; transition:all .2s ease; background:#fff; cursor:pointer; }
  .up.mic { padding:18px; }
  .up.peste { border-color:var(--text); background:var(--surface); }
  .up-in { display:grid; gap:4px; font-size:15px; }
  .up-in span { font-size:12.5px; color:var(--muted); }
  .up-in .lnk { font:inherit; background:none; border:0; cursor:pointer; color:var(--text); font-weight:600; text-decoration:underline; text-underline-offset:3px; }
  .lista { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:8px; margin-top:10px; }
  .fi { font-size:12.5px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; gap:8px; align-items:center; overflow:hidden; }
  .fi span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .fi i { font-style:normal; color:var(--text); font-weight:700; } .fi.urca i { color:var(--soft); }
  .fi.eroare { border-color:var(--accent); } .fi.eroare i { color:var(--accent); }
  .hint { font-size:13px; color:var(--muted); }
  .btn { display:inline-flex; align-items:center; gap:12px; padding:15px 24px; border-radius:999px; background:var(--ink); color:var(--ink-text); font-weight:600; font-size:15px; border:0; cursor:pointer; position:relative; overflow:hidden; transition:transform .2s ease, box-shadow .2s ease; white-space:nowrap; font-family:inherit; }
  .btn::after { content:''; position:absolute; inset:0; background:var(--accent); transform:translateX(-101%); transition:transform .45s cubic-bezier(.7,0,.2,1); z-index:0; }
  .btn > * { position:relative; z-index:1; }
  .btn:hover { transform:translateY(-2px); box-shadow:0 14px 30px -16px rgba(0,0,0,.6); }
  .btn:hover::after { transform:translateX(0); }
  .btn.ghost { background:transparent; color:var(--text); border:1px solid var(--line); } .btn.ghost::after { background:var(--ink); } .btn.ghost:hover { color:var(--ink-text); }
  .btn[disabled] { opacity:.6; pointer-events:none; }
  .act { display:flex; justify-content:space-between; gap:12px; align-items:center; flex-wrap:wrap; }
  .act .st { font-size:13px; color:var(--muted); }
  .final { background:var(--ink); color:var(--ink-text); border-radius:22px; padding:40px 36px; }
  .final h2 { font-size:40px; margin-bottom:10px; } .final p { color:#cbc6bb; font-size:16px; max-width:56ch; }
  footer { border-top:1px solid var(--line); padding:34px 0 46px; font-size:13px; color:var(--muted); }
  footer .wrap { display:flex; justify-content:space-between; gap:18px; flex-wrap:wrap; align-items:center; }
  footer .as { display:flex; align-items:center; gap:8px; } footer .as svg { width:16px; height:16px; }
  .scrisoare h1 .w { opacity:0; transform:translateY(18px) rotate(1deg); animation:w .9s cubic-bezier(.2,.7,.2,1) forwards; animation-delay:calc(.12s + var(--i) * .07s); }
  @keyframes w { to { opacity:1; transform:none; } }
  @media (prefers-reduced-motion: reduce) { .scrisoare h1 .w { opacity:1; transform:none; animation:none; } .pas.on { animation:none; } }
  @media (max-width: 780px) {
    .pasi { grid-template-columns:1fr; gap:22px; } nav.lista { position:static; display:flex; overflow-x:auto; gap:6px; padding-bottom:6px; } nav.lista button { white-space:nowrap; }
    .row, .seg.col { grid-template-columns:1fr; } form { padding:22px; } .prog { display:none; } .scrisoare { padding:56px 0 28px; }
  }
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="https://alesign.net" target="_blank" rel="noopener">${MARCA}<span>AleSign&amp;Co</span></a>
  <div class="prog"><span id="prog-t">${gata ? 'Complet' : `Pasul ${pasCurent + 1} din ${PASI.length}`}</span><div class="bar"><i id="prog-b" style="width:${Math.round(((gata ? PASI.length : pasCurent) / PASI.length) * 100)}%"></i></div></div>
</div></header>

<section class="scrisoare"><div class="wrap">
  <p class="eyebrow">Pornire · ${esc(d.firma || C.client_denumire || '')}${C.numar ? ` · contract ${esc(C.numar)}` : ''}</p>
  <h1>${cuvinte(gata ? 'Am tot. Pornim.' : 'Zece minute, o dată.')}</h1>
  <div class="text">
    ${gata ? `<p>Mulțumesc${cine ? `, ${esc(cine)}` : ''}. Am primit tot ce aveam nevoie.</p><p>Primul lucru pe care îl vei vedea de la mine e planul primei luni, în 3 zile lucrătoare. Poți reveni oricând pe pagina asta ca să adaugi poze sau să corectezi ceva.</p>`
    : `<p>Salut${cine ? `, ${esc(cine)}` : ''}. Ca să construiesc ceva care e al tău, nu un șablon, am nevoie de câteva lucruri de la tine. O singură dată.</p><p>Cinci pași scurți: cine ești, pozele, accesele, programul, stilul. Se salvează pe măsură ce completezi; poți închide și reveni. Când termini, apeși „Am terminat” și de acolo preiau eu.</p>`}
  </div>
</div></section>

<div class="wrap pasi">
  <nav class="lista" id="nav">${PASI.map((p, i) => `<button type="button" data-i="${i}" class="${gata ? 'gata' : i < pasCurent ? 'gata' : i === pasCurent ? 'on' : ''}"><i>${i + 1}</i>${esc(p.t)}</button>`).join('')}</nav>
  <div id="pasi" data-slug="${esc(d.slug || '')}" data-url="${esc(supabaseUrl)}" data-key="${esc(supabaseKey)}"${preview ? ' data-preview="1"' : ''}${gata ? ' data-gata="1"' : ''}>
    ${PASI.map((p, i) => `<section class="pas${i === pasCurent && !gata ? ' on' : ''}" data-i="${i}" id="pas-${p.id}">
      <p class="eyebrow">${i + 1} · ${esc(p.t)}</p><h2>${esc(p.h)}</h2><p class="lead">${esc(p.p)}</p>
      <form data-i="${i}">${p.html}
        <div class="act"><span class="st" data-st></span>${i < PASI.length - 1 ? `<button class="btn" type="submit"><span>Salvează și continuă</span><span class="ar">→</span></button>` : `<button class="btn" type="submit"><span>Am terminat</span><span class="ar">→</span></button>`}</div>
      </form>
    </section>`).join('')}
    <section class="pas${gata ? ' on' : ''}" id="pas-final"><div class="final"><h2>Gata. Mulțumesc.</h2><p>Am primit tot. În 3 zile lucrătoare îți trimit planul primei luni și data la care site-ul e live. Dacă îți mai amintești ceva, revino aici oricând: pagina rămâne a ta.</p></div></section>
  </div>
</div>

<footer><div class="wrap">
  <div>AleSign&amp;Co · <a href="https://alesign.net" target="_blank" rel="noopener">alesign.net</a> · <a href="mailto:info@alesign.net">info@alesign.net</a></div>
  <div class="as">${MARCA}<span>Construit de AleSystem Design</span></div>
  <div>Pagină privată. Nu e indexată de Google.</div>
</div></footer>

<script>
(function(){
  var root = document.getElementById('pasi'), slug = root.getAttribute('data-slug'), prev = root.getAttribute('data-preview');
  var SB = root.getAttribute('data-url'), KEY = root.getAttribute('data-key');
  var N = ${PASI.length}, cur = ${pasCurent}, gataTot = !!root.getAttribute('data-gata');
  var nav = document.getElementById('nav');
  function arata(i){ cur = i; document.querySelectorAll('.pas').forEach(function(s){ s.classList.toggle('on', s.getAttribute('data-i') === String(i)); }); document.getElementById('pas-final').classList.toggle('on', i >= N); nav.querySelectorAll('button').forEach(function(b){ var k = Number(b.getAttribute('data-i')); b.classList.toggle('on', k === i); }); document.getElementById('prog-t').textContent = i >= N ? 'Complet' : 'Pasul ' + (i + 1) + ' din ' + N; document.getElementById('prog-b').style.width = Math.round((Math.min(i, N) / N) * 100) + '%'; window.scrollTo({ top: document.querySelector('.pasi').offsetTop - 70, behavior: 'smooth' }); }
  nav.addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) arata(Number(b.getAttribute('data-i'))); });

  function salveaza(body){ if (prev) return Promise.resolve({ ok: true }); return fetch('/api/onboarding-salveaza', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ slug: slug }, body)) }).then(function(r){ return r.json(); }); }

  document.querySelectorAll('form[data-i]').forEach(function(f){
    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      var i = Number(f.getAttribute('data-i')), fd = new FormData(f), r = {}; fd.forEach(function(v, k){ r[k] = v; });
      var btn = f.querySelector('button[type=submit]'), st = f.querySelector('[data-st]'); btn.disabled = true; st.textContent = 'Se salvează…';
      var ultimul = i === N - 1;
      salveaza({ raspunsuri: r, pasi_gata: Math.max(i + 1, 0), finalizat: ultimul }).then(function(j){
        btn.disabled = false;
        if (!j || !j.ok) { st.textContent = 'Nu s-a salvat. Încearcă din nou.'; return; }
        st.textContent = 'Salvat.'; nav.querySelectorAll('button')[i].classList.add('gata');
        arata(i + 1);
      }).catch(function(){ btn.disabled = false; st.textContent = 'Nu s-a salvat. Încearcă din nou.'; });
    });
  });

  // upload direct în Supabase Storage (bucket privat, folderul slug-ului)
  function urca(file, cat){
    var lista = document.getElementById('lista-' + cat), el = document.createElement('div'); el.className = 'fi urca'; el.innerHTML = '<span></span><i>…</i>'; el.firstChild.textContent = file.name; lista.appendChild(el);
    var nume = file.name.replace(/[^\\w.\\-]+/g, '_').slice(-80), cale = slug + '/' + cat + '/' + Date.now().toString(36) + '-' + nume;
    var p = prev ? Promise.resolve({ ok: true }) : fetch(SB + '/storage/v1/object/onboarding/' + cale, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file });
    return p.then(function(r){ if (!r.ok) throw new Error('upload'); return salveaza({ fisier: { cale: cale, nume: file.name, tip: file.type, marime: file.size, categorie: cat, la: new Date().toISOString() } }); })
      .then(function(){ el.classList.remove('urca'); el.lastChild.textContent = '✓'; if (cat === 'poze') { var n = lista.querySelectorAll('.fi:not(.eroare)').length; document.getElementById('nr-poze').textContent = n + (n === 1 ? ' poză primită.' : ' poze primite.'); } })
      .catch(function(){ el.classList.remove('urca'); el.classList.add('eroare'); el.lastChild.textContent = 'nu a mers'; });
  }
  document.querySelectorAll('.up').forEach(function(z){
    var cat = z.getAttribute('data-cat'), inp = z.querySelector('input[type=file]');
    z.addEventListener('click', function(e){ if (e.target.tagName !== 'BUTTON') inp.click(); });
    z.querySelector('button[data-for]').addEventListener('click', function(e){ e.stopPropagation(); inp.click(); });
    inp.addEventListener('change', function(){ Array.prototype.forEach.call(inp.files, function(f){ urca(f, cat); }); inp.value = ''; });
    ['dragenter','dragover'].forEach(function(t){ z.addEventListener(t, function(e){ e.preventDefault(); z.classList.add('peste'); }); });
    ['dragleave','drop'].forEach(function(t){ z.addEventListener(t, function(e){ e.preventDefault(); z.classList.remove('peste'); }); });
    z.addEventListener('drop', function(e){ Array.prototype.forEach.call(e.dataTransfer.files, function(f){ urca(f, cat); }); });
  });
})();
</script>
</body>
</html>`;
}

function cuvinte(s) { return s.split(' ').map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(' '); }

export function onboardingIndisponibil() {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Pagina nu e disponibilă</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#141414;font-family:Manrope,system-ui,sans-serif;text-align:center;padding:24px}h1{font-family:'Cormorant Garamond',serif;font-size:44px;margin:0 0 12px}p{color:#6b675f;max-width:44ch;margin:0 auto 22px}a{display:inline-block;padding:14px 24px;border-radius:999px;background:#0c0c0d;color:#f4f1ea;text-decoration:none;font-weight:600}</style></head>
<body><div><h1>Pagina nu e disponibilă.</h1><p>Linkul nu e valid sau pagina nu există încă. Scrie-mi și rezolvăm pe loc.</p><a href="mailto:info@alesign.net">Scrie-mi</a></div></body></html>`;
}
