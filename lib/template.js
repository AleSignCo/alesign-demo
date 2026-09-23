// Template de nișă (Anexa v1.1, pasul 5): un singur layout per nișă; per lead se schimbă textele, paleta, datele firmei și pozele.
// Zero placeholder: dacă un câmp lipsește, secțiunea lui nu apare.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const PALETE = {
  beauty: {
    noir:  { bg: '#0f0e0f', text: '#f5f1ea', muted: '#b9b2a6', surface: '#181618', accent: '#c9a227', accentText: '#0f0e0f', line: '#2a272a' },
    ivory: { bg: '#faf7f2', text: '#1c1a17', muted: '#6b645b', surface: '#ffffff', accent: '#8a6d3b', accentText: '#ffffff', line: '#e8e1d6' },
    rose:  { bg: '#f7efec', text: '#2a1f1d', muted: '#7a6764', surface: '#fffaf8', accent: '#a85a5a', accentText: '#ffffff', line: '#ead9d4' },
  },
  barbershop: {
    noir:  { bg: '#0e0f11', text: '#f2efe9', muted: '#a9a49b', surface: '#16181b', accent: '#c8963e', accentText: '#0e0f11', line: '#262a2f' },
    steel: { bg: '#f3f2ef', text: '#1a1c1f', muted: '#5d6166', surface: '#ffffff', accent: '#1f2a36', accentText: '#ffffff', line: '#dedbd5' },
    oak:   { bg: '#f5efe6', text: '#2a2118', muted: '#736555', surface: '#fcf8f1', accent: '#8b5a2b', accentText: '#ffffff', line: '#e6dccd' },
  },
  spa: {
    sage:  { bg: '#f2f4ef', text: '#1f2621', muted: '#66716a', surface: '#ffffff', accent: '#5f7a61', accentText: '#ffffff', line: '#dfe5dc' },
    noir:  { bg: '#0e1110', text: '#eef1ec', muted: '#a3aaa4', surface: '#161a18', accent: '#b8a56a', accentText: '#0e1110', line: '#252b28' },
    sand:  { bg: '#f7f3ec', text: '#26221c', muted: '#75695a', surface: '#fffdf9', accent: '#9c7b4f', accentText: '#ffffff', line: '#e9e1d4' },
  },
};

export const NISA_LABEL = { beauty: 'Salon de înfrumusețare', barbershop: 'Barbershop', spa: 'Spa & Wellness' };

export function randeaza(site, { host = '' } = {}) {
  const nisa = PALETE[site.nisa] ? site.nisa : 'beauty';
  const P = PALETE[nisa][site.stil] || Object.values(PALETE[nisa])[0];
  const t = site.texte || {};
  const poze = (site.poze || []).map((p) => `/poze/${p}`);
  const tel = site.telefon || '';
  const telHref = tel.replace(/[^\d+]/g, '');
  const firma = site.firma || '';
  const servicii = Array.isArray(t.servicii) ? t.servicii.slice(0, 6) : [];
  const deCe = Array.isArray(t.de_ce) ? t.de_ce.slice(0, 3) : [];
  const expira = site.expira_la ? new Date(site.expira_la).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }) : '';
  const maps = site.adresa ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(firma + ', ' + site.adresa)}` : '';
  const rating = site.rating ? Number(site.rating).toFixed(1).replace('.0', '') : '';

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(firma)} · ${esc(NISA_LABEL[nisa])}</title>
<meta name="description" content="${esc(t.subtitlu || t.tagline || firma)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --bg:${P.bg}; --text:${P.text}; --muted:${P.muted}; --surface:${P.surface}; --accent:${P.accent}; --accent-text:${P.accentText}; --line:${P.line}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--text); font-family: Manrope, system-ui, sans-serif; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, .serif { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; letter-spacing: -0.01em; line-height: 1.1; }
  a { color: inherit; text-decoration: none; }
  .wrap { width: min(1120px, 100% - 40px); margin: 0 auto; }
  .eyebrow { font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
  .btn { display: inline-flex; align-items: center; gap: 10px; padding: 14px 24px; border-radius: 999px; background: var(--accent); color: var(--accent-text); font-weight: 600; font-size: 15px; transition: transform .15s ease, filter .15s ease; }
  .btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .btn.ghost { background: transparent; color: var(--text); border: 1px solid var(--line); }
  nav { position: sticky; top: 0; z-index: 10; background: color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
  nav .wrap { display: flex; align-items: center; justify-content: space-between; height: 68px; }
  nav .brand { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; }
  nav .tel { font-size: 14px; font-weight: 600; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--line); }
  .hero { position: relative; min-height: 88vh; display: grid; align-items: end; isolation: isolate; }
  .hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; }
  .hero::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.55) 60%, rgba(0,0,0,.78) 100%); }
  .hero .wrap { padding: 96px 0 72px; color: #fff; }
  .hero .eyebrow { color: #f3e6c4; }
  .hero h1 { font-size: clamp(40px, 6.5vw, 78px); max-width: 14ch; margin: 14px 0 18px; }
  .hero p { font-size: clamp(16px, 1.6vw, 20px); max-width: 52ch; color: rgba(255,255,255,.86); }
  .hero .cta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 30px; align-items: center; }
  .hero .ghost { color: #fff; border-color: rgba(255,255,255,.35); }
  .rating { display: inline-flex; align-items: center; gap: 8px; margin-top: 26px; font-size: 14px; color: rgba(255,255,255,.9); }
  .rating b { color: #f3d56b; letter-spacing: .06em; }
  section { padding: 96px 0; }
  section + section { border-top: 1px solid var(--line); }
  .h2 { font-size: clamp(30px, 3.6vw, 46px); margin: 12px 0 18px; }
  .despre { display: grid; grid-template-columns: 1.1fr .9fr; gap: 56px; align-items: center; }
  .despre p { color: var(--muted); font-size: 17px; margin-bottom: 14px; }
  .despre img { width: 100%; aspect-ratio: 4/5; object-fit: cover; border-radius: 18px; }
  .grid { display: grid; gap: 18px; grid-template-columns: repeat(3, 1fr); }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 26px; }
  .card h3 { font-size: 24px; margin-bottom: 8px; }
  .card p { color: var(--muted); font-size: 15px; }
  .card .n { color: var(--accent); font-size: 12px; letter-spacing: .12em; font-weight: 600; margin-bottom: 14px; display: block; }
  .galerie { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 240px; gap: 12px; }
  .galerie img { width: 100%; height: 100%; object-fit: cover; border-radius: 14px; }
  .galerie img:first-child { grid-column: span 2; grid-row: span 2; }
  .dece { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .dece div { border-top: 2px solid var(--accent); padding-top: 18px; }
  .dece h3 { font-size: 22px; margin-bottom: 6px; }
  .dece p { color: var(--muted); font-size: 15px; }
  .contact { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
  .contact .big { font-family: 'Cormorant Garamond', serif; font-size: clamp(32px, 4vw, 52px); font-weight: 600; display: block; margin: 12px 0 22px; }
  .contact .adr { color: var(--muted); font-size: 16px; }
  .contact .card { padding: 34px; }
  .contact .card p { color: var(--muted); margin-bottom: 18px; }
  footer { border-top: 1px solid var(--line); padding: 30px 0 40px; font-size: 13px; color: var(--muted); }
  footer .demo { display: flex; gap: 16px; flex-wrap: wrap; justify-content: space-between; align-items: center; }
  footer .demo b { color: var(--text); }
  @media (max-width: 860px) {
    section { padding: 64px 0; }
    .despre, .contact { grid-template-columns: 1fr; gap: 28px; }
    .grid, .dece { grid-template-columns: 1fr; }
    .galerie { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 160px; }
    .hero { min-height: 78vh; }
    nav .tel { padding: 8px 12px; }
  }
</style>
</head>
<body>
<nav><div class="wrap"><a class="brand" href="#">${esc(firma)}</a>${tel ? `<a class="tel" href="tel:${esc(telHref)}">${esc(tel)}</a>` : ''}</div></nav>

<header class="hero">
  ${poze[0] ? `<img src="${poze[0]}" alt="">` : ''}
  <div class="wrap">
    <p class="eyebrow">${esc(NISA_LABEL[nisa])}${site.zona ? ` · ${esc(site.zona)}` : ''}</p>
    <h1>${esc(t.tagline || firma)}</h1>
    ${t.subtitlu ? `<p>${esc(t.subtitlu)}</p>` : ''}
    <div class="cta">
      ${tel ? `<a class="btn" href="tel:${esc(telHref)}">${esc(t.cta || 'Programează-te')}</a>` : ''}
      ${servicii.length ? `<a class="btn ghost" href="#servicii">Vezi serviciile</a>` : ''}
    </div>
    ${rating ? `<p class="rating"><b>★★★★★</b> ${esc(rating)} din 5${site.nr_recenzii ? ` · ${esc(site.nr_recenzii)} recenzii pe Google` : ''}</p>` : ''}
  </div>
</header>

${t.despre ? `<section id="despre"><div class="wrap despre">
  <div><p class="eyebrow">Despre noi</p><h2 class="h2">${esc(t.despre_titlu || firma)}</h2>${String(t.despre).split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  ${poze[1] ? `<img src="${poze[1]}" alt="">` : ''}
</div></section>` : ''}

${servicii.length ? `<section id="servicii"><div class="wrap">
  <p class="eyebrow">Servicii</p><h2 class="h2">${esc(t.servicii_titlu || 'Ce facem, fără compromis')}</h2>
  <div class="grid">${servicii.map((s, i) => `<div class="card"><span class="n">0${i + 1}</span><h3>${esc(s.nume)}</h3><p>${esc(s.descriere || '')}</p></div>`).join('')}</div>
</div></section>` : ''}

${poze.length > 3 ? `<section id="galerie"><div class="wrap">
  <p class="eyebrow">Atmosfera</p><h2 class="h2">${esc(t.galerie_titlu || 'Locul în care vii să te simți bine')}</h2>
  <div class="galerie">${poze.slice(2, 7).map((p) => `<img src="${p}" alt="" loading="lazy">`).join('')}</div>
</div></section>` : ''}

${deCe.length ? `<section id="dece"><div class="wrap">
  <p class="eyebrow">De ce ${esc(firma)}</p><h2 class="h2">${esc(t.de_ce_titlu || 'Trei motive, pe scurt')}</h2>
  <div class="dece">${deCe.map((d) => `<div><h3>${esc(typeof d === 'string' ? d : d.titlu)}</h3>${d && d.text ? `<p>${esc(d.text)}</p>` : ''}</div>`).join('')}</div>
</div></section>` : ''}

<section id="contact"><div class="wrap contact">
  <div>
    <p class="eyebrow">Programări</p>
    <h2 class="h2">${esc(t.contact_titlu || 'Un telefon și e rezolvat')}</h2>
    ${tel ? `<a class="big" href="tel:${esc(telHref)}">${esc(tel)}</a>` : ''}
    ${site.adresa ? `<p class="adr">${esc(site.adresa)}${maps ? ` · <a href="${maps}" target="_blank" rel="noreferrer" style="color:var(--accent)">Vezi pe hartă</a>` : ''}</p>` : ''}
  </div>
  <div class="card">
    <h3 style="font-size:26px;margin-bottom:8px">${esc(t.cta || 'Programează-te')}</h3>
    <p>${esc(t.contact_text || 'Sună sau scrie pe WhatsApp și îți găsim un loc în zilele următoare.')}</p>
    ${tel ? `<a class="btn" href="tel:${esc(telHref)}">Sună acum</a> <a class="btn ghost" href="https://wa.me/${esc(telHref.replace('+', ''))}" target="_blank" rel="noreferrer">WhatsApp</a>` : ''}
  </div>
</div></section>

<footer><div class="wrap demo">
  <span>© ${new Date().getFullYear()} ${esc(firma)}${site.adresa ? ` · ${esc(site.adresa)}` : ''}</span>
  <span>Mostră pregătită de <b>AleSign</b> pentru ${esc(firma)}. Nu este site-ul oficial.${expira ? ` Disponibilă până pe ${esc(expira)}.` : ''}</span>
</div></footer>
</body>
</html>`;
}

export function paginaExpirata({ firma = '', host = '' } = {}) {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Mostra a expirat</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f0e0f;color:#f5f1ea;font-family:Manrope,sans-serif;text-align:center;padding:24px}h1{font-family:'Cormorant Garamond',serif;font-size:44px;margin:0 0 10px}p{color:#b9b2a6;max-width:46ch;margin:0 auto 22px}a{display:inline-block;padding:14px 24px;border-radius:999px;background:#c9a227;color:#0f0e0f;font-weight:600;text-decoration:none}</style></head>
<body><div><p style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;color:#c9a227;font-weight:600">AleSign</p><h1>${esc(firma) || 'Mostra'} nu mai e online</h1><p>Mostrele sunt făcute pentru o singură firmă și stau online 14 zile. Dacă e a ta și vrei să o vezi din nou, scrie-ne.</p><a href="mailto:info@alesign.net">info@alesign.net</a></div></body></html>`;
}
