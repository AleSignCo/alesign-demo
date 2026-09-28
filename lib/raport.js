// Raportul lunar al clientului: demo.alesign.net/r/<slug>. Aceeași limbă vizuală ca Mostra.
// Toate cifrele vin din tabelul rapoarte; unde nu e o cifră, scrie „fără date”, niciodată 0 inventat.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v) => { if (v === null || v === undefined || v === '') return null; const n = Number(String(v).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : null; };
const fmt = (n, zec = 0) => (n == null ? '' : n.toLocaleString('ro-RO', { maximumFractionDigits: zec, minimumFractionDigits: 0 }));
const prenume = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const numeLuna = (d) => { const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : `${LUNI[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
const eticheta = (r) => (r && r.eticheta ? r.eticheta : numeLuna(r && r.luna));
const ref = (r) => (r && r.eticheta ? `„${r.eticheta.charAt(0).toLowerCase()}${r.eticheta.slice(1)}”` : numeLuna(r && r.luna));
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

const METRICI = [
  ['trafic', 'vizite pe site', 0], ['leaduri', 'cereri și mesaje', 0], ['programari', 'programări', 0],
  ['recenzii', 'recenzii Google', 0], ['rating', 'nota pe Google', 1], ['urmaritori', 'urmăritori', 0], ['reach', 'oameni atinși pe social', 0],
];
const MARCA = `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="28" cy="28" r="20"/><circle cx="28" cy="28" r="5" fill="currentColor" stroke="none"/><circle cx="42.1" cy="13.9" r="6" fill="#ff2a2e" stroke="none"/></svg>`;

function variatie(acum, inainte) {
  if (acum == null || inainte == null || inainte === 0) return null;
  return Math.round(((acum - inainte) / inainte) * 100);
}

function grafic(istoric, cheie) {
  const puncte = istoric.map((m) => ({ e: cap(eticheta(m)).replace(/ \d{4}$/, ''), v: num((m.cifre || {})[cheie]) }));
  const cu = puncte.filter((p) => p.v != null);
  if (cu.length < 2) return '';
  const max = Math.max(1, ...cu.map((p) => p.v));
  const W = 640, H = 220, pad = 28, bw = Math.min(64, (W - pad * 2) / puncte.length - 14);
  const pas = (W - pad * 2) / puncte.length;
  const bare = puncte.map((p, i) => {
    const x = pad + i * pas + (pas - bw) / 2;
    const h = p.v == null ? 0 : Math.max(3, Math.round((p.v / max) * (H - 70)));
    const y = H - 34 - h;
    const ultima = i === puncte.length - 1;
    return `<g><rect x="${x.toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="${h}" rx="6" fill="${ultima ? '#0c0c0d' : '#d9d3c7'}"/>`
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${y - 8}" text-anchor="middle" font-size="17" font-weight="600" fill="#141414">${p.v == null ? '' : esc(fmt(p.v))}</text>`
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="15" fill="#6b675f">${esc(p.e)}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evoluția vizitelor pe site, lună de lună" style="width:100%;height:auto;display:block">${bare}</svg>`;
}

export function randeazaRaport(d) {
  const istoric = Array.isArray(d.istoric) ? d.istoric : [];
  const idx = istoric.findIndex((m) => String(m.luna) === String(d.luna));
  const anterior = idx > 0 ? istoric[idx - 1] : null;
  const primul = istoric.length > 1 ? istoric[0] : null;
  const c = d.cifre || {};
  const luna = eticheta(d);
  const cine = prenume(d.reprezentant);
  const firma = d.firma || '';
  const livrate = (Array.isArray(d.livrate) ? d.livrate : []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 20);

  const carduri = METRICI.map(([k, et, zec]) => {
    const v = num(c[k]);
    if (v == null) return '';
    const fataDe = variatie(v, anterior ? num((anterior.cifre || {})[k]) : null);
    const deLaStart = primul && primul !== anterior ? variatie(v, num((primul.cifre || {})[k])) : null;
    const semn = (x) => (x > 0 ? '+' : '') + x + '%';
    const clasa = (x) => (x == null ? '' : x >= 0 ? 'sus' : 'jos');
    return `<article class="card rv"><b>${esc(fmt(v, zec))}</b><span class="et">${esc(et)}</span>`
      + (fataDe != null ? `<span class="dif ${clasa(fataDe)}">${semn(fataDe)} față de luna trecută</span>` : '')
      + (deLaStart != null ? `<span class="dif mic ${clasa(deLaStart)}">${semn(deLaStart)} de când am început</span>` : '')
      + `</article>`;
  }).filter(Boolean);

  const deschidere = anterior
    ? `Mai jos e luna ${esc(luna)} pentru ${esc(firma)}: ce s-a întâmplat, ce am făcut și ce urmează. Cifrele sunt cele reale, din Google, din site și din rețelele sociale; unde nu am avut o cifră sigură, n-am pus-o.`
    : `Acesta e primul raport pentru ${esc(firma)}. De aici pornim: cifrele de mai jos sunt punctul de plecare, iar de luna viitoare vei vedea exact cât s-a mișcat fiecare.`;

  const graficTrafic = grafic(istoric, 'trafic');

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(firma)} · raportul pentru ${esc(luna)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#f5f2ec; --text:#141414; --muted:#6b675f; --soft:#a39e94; --surface:#fbf9f5; --line:#e2ddd3; --accent:#ff2a2e; --ink:#0c0c0d; --ink-text:#f4f1ea; --sus:#2f6b3a; --jos:#a0431f; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:Manrope, system-ui, sans-serif; line-height:1.65; -webkit-font-smoothing:antialiased; }
  a { color:inherit; }
  h1,h2,h3 { font-family:'Cormorant Garamond', Georgia, serif; font-weight:600; letter-spacing:-0.01em; line-height:1.08; }
  .wrap { width:min(1000px, 100% - 40px); margin:0 auto; }
  .eyebrow { font-size:11.5px; letter-spacing:.24em; text-transform:uppercase; font-weight:700; color:var(--muted); display:flex; align-items:center; gap:10px; }
  .eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--accent); }
  header.top { position:sticky; top:0; z-index:20; background:color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
  header.top .wrap { display:flex; align-items:center; justify-content:space-between; height:64px; gap:16px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:14px; text-decoration:none; }
  .brand svg { width:22px; height:22px; }
  .pentru { font-size:12.5px; color:var(--muted); text-align:right; }
  .pentru b { color:var(--text); }
  section { padding:76px 0; }
  section + section { border-top:1px solid var(--line); }
  .scrisoare h1 { font-size:clamp(42px, 6.4vw, 78px); margin:18px 0 28px; max-width:14ch; }
  .scrisoare p { font-size:clamp(17px, 1.5vw, 19px); color:#2a2823; max-width:62ch; margin-bottom:16px; }
  .scrisoare p.salut { font-family:'Cormorant Garamond', serif; font-size:clamp(24px, 2.6vw, 30px); color:var(--text); }
  .semn { display:flex; align-items:center; gap:14px; margin-top:26px; }
  .semn .nume { font-family:'Cormorant Garamond', serif; font-style:italic; font-size:30px; }
  .semn .rol { font-size:12px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; }
  .h2 { font-size:clamp(30px, 4vw, 42px); margin:12px 0 10px; }
  .lead { color:var(--muted); font-size:16.5px; max-width:60ch; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:16px; margin-top:32px; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:24px 22px; display:flex; flex-direction:column; gap:4px; }
  .card b { font-family:'Cormorant Garamond', serif; font-size:48px; line-height:1; font-weight:600; }
  .card .et { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); font-weight:700; margin-bottom:8px; }
  .dif { font-size:14px; font-weight:600; }
  .dif.mic { font-size:12.5px; font-weight:500; color:var(--muted); }
  .dif.sus { color:var(--sus); } .dif.jos { color:var(--jos); }
  .dif.mic.sus, .dif.mic.jos { opacity:.85; }
  .grafic { margin-top:30px; background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:24px 20px 10px; }
  .grafic p { font-size:13px; color:var(--muted); margin-bottom:10px; }
  .liste { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:30px; }
  .bloc { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:28px 26px; }
  .bloc h3 { font-size:26px; margin-bottom:14px; }
  .bloc ul { list-style:none; display:grid; gap:10px; }
  .bloc li { padding-left:22px; position:relative; font-size:15.5px; color:#2a2823; }
  .bloc li::before { content:''; position:absolute; left:0; top:.62em; width:8px; height:8px; border-radius:50%; background:var(--ink); }
  .bloc p { font-size:15.5px; color:#2a2823; white-space:pre-line; }
  .bloc.inchis { background:var(--ink); color:var(--ink-text); border-color:var(--ink); }
  .bloc.inchis p { color:#d8d3c8; }
  .gol { color:var(--muted); font-size:15px; }
  .cta { display:flex; gap:12px; flex-wrap:wrap; margin-top:26px; }
  .btn { display:inline-flex; align-items:center; gap:10px; padding:14px 22px; border-radius:999px; background:var(--ink); color:var(--ink-text); font-weight:600; font-size:15px; text-decoration:none; }
  .btn.ghost { background:transparent; color:var(--text); border:1px solid var(--line); }
  footer { padding:36px 0 48px; border-top:1px solid var(--line); color:var(--muted); font-size:12.5px; }
  footer .wrap { display:flex; justify-content:space-between; gap:18px; flex-wrap:wrap; }
  .rv { opacity:0; transform:translateY(14px); transition:opacity .7s ease, transform .7s ease; }
  .rv.in { opacity:1; transform:none; }
  @media (max-width: 760px) { section { padding:56px 0; } .liste { grid-template-columns:1fr; } .grid { grid-template-columns:1fr 1fr; gap:10px; } .card { padding:18px 16px; border-radius:16px; } .card b { font-size:34px; } .card .et { font-size:10.5px; letter-spacing:.1em; } .dif { font-size:12.5px; } .dif.mic { font-size:11.5px; } .pentru { display:none; } }
  @media (prefers-reduced-motion: reduce) { .rv { opacity:1; transform:none; transition:none; } }
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="https://alesign.net" target="_blank" rel="noopener">${MARCA}<span>AleSystem Design</span></a>
  <div class="pentru">Raportul lunar pentru <b>${esc(firma)}</b> · ${esc(luna)}</div>
</div></header>

<section class="scrisoare"><div class="wrap">
  <p class="eyebrow">Raportul pentru ${esc(luna)}</p>
  <h1>${esc(cap(luna))}, pe scurt.</h1>
  <p class="salut">Bună${cine ? `, ${esc(cine)}` : ''}!</p>
  <p>${deschidere}</p>
  ${d.nota ? `<p>${esc(d.nota)}</p>` : ''}
  <div class="semn"><span class="nume">Alexandru</span><span class="rol">AleSign&amp;Co</span></div>
</div></section>

<section><div class="wrap">
  <p class="eyebrow">Cifrele lunii</p>
  <h2 class="h2">Ce s-a întâmplat.</h2>
  <p class="lead">${anterior ? `Comparat cu ${esc(ref(anterior))}${primul && primul !== anterior ? ` și cu ${esc(ref(primul))}, de unde am pornit` : ''}.` : 'Prima lună: de aici măsurăm tot ce urmează.'}</p>
  ${carduri.length ? `<div class="grid">${carduri.join('')}</div>` : '<p class="gol" style="margin-top:24px">Cifrele lunii se completează în curând.</p>'}
  ${graficTrafic ? `<div class="grafic rv"><p>Vizite pe site, lună de lună</p>${graficTrafic}</div>` : ''}
</div></section>

<section><div class="wrap">
  <p class="eyebrow">Luna asta și luna viitoare</p>
  <h2 class="h2">Ce am făcut și ce urmează.</h2>
  <div class="liste">
    <div class="bloc rv"><h3>Ce am făcut</h3>${livrate.length ? `<ul>${livrate.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="gol">Lista lucrărilor lunii vine împreună cu cifrele.</p>'}</div>
    <div class="bloc inchis rv"><h3>Ce urmează</h3><p>${d.urmeaza ? esc(d.urmeaza) : 'Stabilim împreună la discuția lunară.'}</p></div>
  </div>
  <div class="cta">
    <a class="btn" href="mailto:info@alesign.net?subject=${encodeURIComponent(`Raportul ${firma} · ${luna}`)}">Scrie-mi despre raport</a>
    ${d.telefon ? `<a class="btn ghost" href="tel:${esc(String(d.telefon).replace(/\s/g, ''))}">Sună-mă: ${esc(d.telefon)}</a>` : ''}
  </div>
</div></section>

<footer><div class="wrap">
  <div>AleSign&amp;Co · <a href="https://alesign.net" target="_blank" rel="noopener">alesign.net</a> · info@alesign.net</div>
  <div>Pagină privată, pregătită pentru ${esc(firma)}. Nu e indexată de Google.</div>
</div></footer>
<script>
(function(){ var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.08 });
document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); }); })();
</script>
</body>
</html>`;
}

export function raportIndisponibil() {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Raport indisponibil</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#141414;font-family:Manrope,system-ui,sans-serif;text-align:center;padding:24px}h1{font-family:'Cormorant Garamond',serif;font-size:40px;margin:0 0 12px}p{color:#6b675f;max-width:44ch;margin:0 auto 22px}a{display:inline-block;padding:14px 24px;border-radius:999px;background:#0c0c0d;color:#f4f1ea;text-decoration:none;font-weight:600}</style></head>
<body><div><h1>Nu am găsit raportul.</h1><p>Linkul nu e întreg sau raportul a fost înlocuit. Scrie-mi și ți-l retrimit în aceeași zi.</p><a href="mailto:info@alesign.net?subject=Raport">Scrie-mi</a></div></body></html>`;
}
