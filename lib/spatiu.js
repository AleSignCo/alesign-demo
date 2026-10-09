// Spațiul clientului (motor de livrare, etapa 1): demo.alesign.net/s/<token>
// Clientul vede ce a trecut de Alex, aprobă sau cere modificări, vede calendarul, ce lipsește, contractele, rapoartele, și scrie mesaje.
// Fără login: tokenul din link e cheia. Aceeași linie vizuală ca Mostra și contractul. Zero prețuri sau termene interne.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', timeZone: 'Europe/Bucharest' }) : '');
const dataScurt = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', timeZone: 'Europe/Bucharest' }) : '');
const oraRo = (d) => (d ? new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }) : '');
const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { maximumFractionDigits: 2 });
const prenume = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const nl = (s) => esc(s).replace(/\n/g, '<br>');

const TIP = { postare: 'Postare', postare_gbp: 'Postare Google', campanie: 'Campanie de reclame', landing: 'Landing page', newsletter: 'Newsletter', video: 'Video', website: 'Site-ul nou', refresh: 'Site-ul actualizat', audit: 'Audit', strategie: 'Strategie', raport: 'Raport', clarity: 'Clarity', call: 'Call' };
const CANAL = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', google: 'Google' };
const LIPSA = {
  poze: ['Poze cu locul și cu echipa', 'Fără ele, postările pornesc cu imagini generice.'],
  oferta: ['Lista de servicii și prețuri', 'E baza pentru orice text: nu scriem nimic ce nu e aici.'],
  brand: ['Tonul în care vrei să vorbim', 'Trei cuvinte sunt de ajuns: cald, direct, elegant.'],
  domeniu: ['Domeniul site-ului', 'Numele domeniului și unde e înregistrat.'],
  acces_gbp: ['Acces la fișa Google', 'Ne adaugi ca manager al fișei; îți arăt cum, într-un minut.'],
  acces_ads: ['Acces la contul de reclame', 'Rămâne al tău; ne dai rol de partener.'],
  acces_meta: ['Conectare Facebook și Instagram', 'Un singur buton, fără parole.'],
  buget: ['Bugetul de reclame', 'Îl stabilim împreună înainte să pornească orice campanie.'],
  lista_newsletter: ['Lista de abonați', 'Doar persoane care și-au dat acordul.'],
  material_video: ['Materiale video brute', 'Clipuri scurte, filmate cu telefonul, sunt perfecte.'],
};
const STARE = { de_creat: 'în lucru', asteapta_material: 'așteaptă materiale de la tine', in_lucru: 'în lucru', la_alex: 'în lucru', la_client: 'la tine', modificare: 'în lucru', aprobat: 'gata, pleacă la dată', programat: 'programată', de_publicat_manual: 'programată', manual: 'în lucru', publicat: 'publicată', livrat: 'livrată', esuat: 'în lucru' };

const MARCA = `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="28" cy="28" r="20"/><circle cx="28" cy="28" r="5" fill="currentColor" stroke="none"/><circle cx="42.1" cy="13.9" r="6" fill="#ff2a2e" stroke="none"/></svg>`;

// markdown ușor (## titlu, - listă, **bold**) pentru documentele scrise de boți (raport, campanie, landing, strategie, newsletter); totul trece prin esc()
const md = (t) => {
  const inl = (x) => esc(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const out = []; let li = null;
  String(t || '').replace(/\r/g, '').split('\n').forEach((l) => {
    if (/^\s*[-•]\s+/.test(l)) { if (!li) { li = []; out.push(li); } li.push(`<li>${inl(l.replace(/^\s*[-•]\s+/, ''))}</li>`); return; }
    li = null;
    if (/^#{1,3}\s+/.test(l)) out.push(`<h4 class="mdh">${inl(l.replace(/^#{1,3}\s+/, ''))}</h4>`);
    else if (l.trim()) out.push(`<p class="mdp">${inl(l)}</p>`);
  });
  return out.map((x) => (Array.isArray(x) ? `<ul class="mdl">${x.join('')}</ul>` : x)).join('');
};
const structurat = (s) => {
  const c = s.continut || {};
  const rand = (k, v) => (v ? `<p class="meta"><span class="k">${esc(k)}:</span> ${esc(v)}</p>` : '');
  if (s.tip === 'campanie') return `${rand('Obiectiv', c.obiectiv)}${c.buget_lunar != null ? rand('Buget lunar', `${nr(c.buget_lunar)} RON, plătit direct platformelor${Array.isArray(c.impartire) && c.impartire.length ? ` (${c.impartire.map((x) => `${x.canal} ${x.procent}%`).join(', ')})` : ''}`) : ''}${(Array.isArray(c.reclame) ? c.reclame : []).map((r) => `<div class="recl"><p class="meta">Reclama ${esc(r.nume || '')} · ${esc(r.unghi || '')}</p><p class="rt">${esc(r.titlu || '')}</p><p>${esc(r.text_principal || '')}</p><p class="meta">${esc(r.cta || '')}</p></div>`).join('')}`;
  if (s.tip === 'landing') return `${rand('Subtitlu', c.subtitlu)}${c.cta ? rand('Butonul paginii', `${c.cta.text || ''}${c.cta.tinta ? ` → ${c.cta.tinta}` : ''}`) : ''}`;
  if (s.tip === 'newsletter') return `${rand('Subiect', c.subiect)}${rand('Preheader', c.preheader)}`;
  if (s.tip === 'strategie') return rand('Într-o frază', c.pozitionare);
  // audit: scorul și cele trei lucruri de reparat, înaintea textului (clientul vede întâi verdictul)
  if (s.tip === 'audit') return `${c.scor != null ? `<p class="scor"><b>${esc(String(c.scor))}</b><span>/10 · cât de bine vinde pagina ta azi</span></p>` : ''}${(Array.isArray(c.prioritati) ? c.prioritati : []).map((p, i) => `<div class="recl prio"><p class="rt">${i + 1}. ${esc(p.ce || '')}</p><p>${esc(p.de_ce || '')}</p>${p.efort ? `<p class="meta">Efort: ${esc(p.efort)}</p>` : ''}</div>`).join('')}`;
  // site nou / refresh: paginile cu meta și îndemnul unic, înaintea textului complet (clientul vede întâi harta site-ului)
  if (s.tip === 'website' || s.tip === 'refresh') return `${c.indemn ? rand('Butonul site-ului', `${c.indemn.text || ''}${c.indemn.tinta ? ` → ${c.indemn.tinta}` : ''}`) : ''}${(Array.isArray(c.pagini) ? c.pagini : []).map((x) => `<div class="recl"><p class="rt">${esc(x.pagina || '')} <span class="meta">${esc(x.slug || '')}</span></p>${x.meta_titlu ? `<p class="meta">Google: ${esc(x.meta_titlu)}${x.meta_descriere ? ` — ${esc(x.meta_descriere)}` : ''}</p>` : ''}</div>`).join('')}${Array.isArray(c.lipsesc) && c.lipsesc.length ? rand('Ne mai trebuie de la tine', c.lipsesc.join(', ')) : ''}`;
  if (s.tip === 'video') return `${rand('Hook', c.hook)}${(Array.isArray(c.scene) ? c.scene : []).map((x, i) => `<div class="recl"><p class="meta">Scena ${esc(String(x.nr || i + 1))}${x.durata_sec ? ` · ${esc(String(x.durata_sec))} s` : ''}${x.text_pe_ecran ? ` · pe ecran: ${esc(x.text_pe_ecran)}` : ''}</p><p>${esc(x.ce_se_vede || '')}</p><p class="rt">„${esc(x.ce_se_spune || '')}”</p></div>`).join('')}${rand('Îndemnul', c.cta)}`;
  return '';
};

function continutHtml(s) {
  const c = s.continut || {};
  if (c.format === 'markdown') {
    return `${c.titlu ? `<p class="dt">${esc(c.titlu)}</p>` : ''}${structurat(s)}<div class="txt doc">${md(c.text)}</div>`;
  }
  const canale = (c.canale || (s.detalii && s.detalii.canale) || []).map((x) => CANAL[x] || x);
  const meta = [s.detalii && s.detalii.zi ? dataRo(s.detalii.zi) : null, canale.length ? canale.join(' · ') : null].filter(Boolean).join(' · ');
  const img = c.imagine_url ? `<img src="${esc(c.imagine_url)}" alt="" loading="lazy">` : c.imagine_nume ? `<div class="img-ph">poza ta: ${esc(c.imagine_nume)}</div>` : c.imagine ? `<div class="img-ph">imagine: ${esc(c.imagine)}</div>` : '';
  const text = c.text ? `<p class="txt">${nl(c.text)}</p>` : c.rezumat ? `<p class="txt">${nl(c.rezumat)}</p>` : '';
  const link = c.url && /^https?:\/\//i.test(String(c.url)) ? `<a class="lnk" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Deschide previzualizarea →</a>` : '';
  const buget = c.buget ? `<p class="meta">Buget propus: <b>${nr(c.buget)} RON / lună</b>, plătit direct platformelor</p>` : '';
  const note = c.nota ? `<p class="meta">${esc(c.nota)}</p>` : '';
  return `${meta ? `<p class="meta">${esc(meta)}</p>` : ''}${img}${text}${buget}${link}${note}`;
}

export function randeazaSpatiu(d, token) {
  const nume = prenume(d.contact) || '';
  const deAprobat = d.de_aprobat || [];
  const cal = d.calendar || [];
  const lipsa = (d.lipsesc || []).filter((k) => LIPSA[k]);
  const contracte = d.contracte || [];
  const rapoarte = d.rapoarte || [];
  const mesaje = d.mesaje || [];
  const ob = d.onboarding;
  const luni = {};
  cal.forEach((s) => { const k = (s.zi || s.luna || '').slice(0, 7); (luni[k] = luni[k] || []).push(s); });

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>${esc(d.firma)} · spațiul tău la AleSign</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#f5f2ec; --text:#141414; --muted:#6b675f; --soft:#a39e94; --surface:#fbf9f5; --line:#e2ddd3; --accent:#ff2a2e; --ink:#0c0c0d; --ink-text:#f4f1ea; --ok:#1f7a4d; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:Manrope, system-ui, sans-serif; line-height:1.6; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  h1,h2,h3 { font-family:'Cormorant Garamond', Georgia, serif; font-weight:600; letter-spacing:-0.01em; line-height:1.1; }
  .wrap { width:min(760px, 100% - 32px); margin:0 auto; }
  header.top { position:sticky; top:0; z-index:20; background:color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
  header.top .wrap { display:flex; align-items:center; justify-content:space-between; height:60px; gap:12px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:14px; }
  .brand svg { width:22px; height:22px; }
  .nav { display:flex; gap:14px; font-size:12.5px; color:var(--muted); overflow:auto; }
  .nav a { white-space:nowrap; }
  .eyebrow { font-size:11px; letter-spacing:.22em; text-transform:uppercase; font-weight:700; color:var(--muted); display:flex; align-items:center; gap:10px; }
  .eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--accent); }
  section { padding:40px 0; } section + section { border-top:1px solid var(--line); }
  .h2 { font-size:clamp(26px, 4vw, 34px); margin:10px 0 8px; }
  .lead { color:var(--muted); font-size:15.5px; max-width:60ch; }
  .salut { padding:48px 0 36px; }
  .salut h1 { font-size:clamp(34px, 6vw, 52px); margin:14px 0 14px; }
  .cifre { display:flex; gap:28px; flex-wrap:wrap; margin-top:22px; }
  .cifre b { font-family:'Cormorant Garamond', serif; font-size:36px; font-weight:600; display:block; line-height:1; }
  .cifre span { font-size:12px; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:20px; margin-top:14px; }
  .card h3 { font-size:22px; margin-bottom:6px; }
  .meta { font-size:12.5px; color:var(--muted); margin:4px 0 8px; }
  .txt { font-size:15.5px; margin:8px 0 10px; white-space:normal; }
  .dt { font-size:17px; font-weight:600; margin:6px 0 2px; }
  .doc .mdh { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#6b675f; margin:16px 0 4px; }
  .doc .mdp { margin:0 0 8px; }
  .doc .mdl { margin:0 0 8px; padding-left:18px; }
  .doc .mdl li { margin:2px 0; }
  .meta .k { color:#a39e94; }
  .recl { padding:10px 12px; border:1px solid #e2ddd3; border-radius:10px; margin:8px 0; }
  .recl .rt { font-weight:600; margin:2px 0; }
  .recl p { margin:2px 0; }
  .scor { display:flex; align-items:baseline; gap:8px; margin:6px 0 10px; }
  .scor b { font-size:34px; line-height:1; font-weight:700; }
  .scor span { font-size:13px; color:var(--muted); }
  .prio { border-color:#d9d2c4; }
  .card img { width:100%; max-height:420px; object-fit:cover; border-radius:12px; margin:8px 0; }
  .img-ph { font-size:12px; color:var(--soft); border:1px dashed var(--line); border-radius:12px; padding:14px; margin:8px 0; }
  .act { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
  .btn { display:inline-flex; align-items:center; gap:8px; padding:12px 18px; border-radius:999px; background:var(--ink); color:var(--ink-text); font-weight:600; font-size:14px; border:0; cursor:pointer; font-family:inherit; transition:transform .2s ease; }
  .btn:hover { transform:translateY(-1px); } .btn[disabled] { opacity:.5; cursor:not-allowed; }
  .btn.ok { background:var(--ok); } .btn.ghost { background:transparent; color:var(--text); border:1px solid var(--line); }
  .btn.mic { padding:9px 14px; font-size:13px; }
  .mod { display:none; margin-top:10px; } .mod.on { display:block; }
  textarea, input { font:inherit; font-size:15px; padding:12px 14px; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--text); outline:none; width:100%; }
  textarea:focus, input:focus { border-color:var(--text); }
  .gata { display:none; color:var(--ok); font-weight:600; font-size:14px; margin-top:10px; } .gata.on { display:block; }
  .lnk { font-weight:600; border-bottom:1px solid currentColor; }
  .toate { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-top:16px; padding:16px 18px; background:var(--ink); color:var(--ink-text); border-radius:16px; }
  .toate p { color:#cbc6bb; font-size:14px; }
  .toate .btn { background:var(--accent); }
  .luna { margin-top:18px; } .luna h3 { font-size:20px; margin-bottom:8px; text-transform:capitalize; }
  .zi { display:grid; grid-template-columns:64px 1fr auto; gap:12px; padding:10px 0; border-top:1px solid var(--line); font-size:14px; align-items:start; }
  .zi .d { font-weight:700; } .zi .s { font-size:12px; color:var(--muted); white-space:nowrap; }
  .zi .s.publicat, .zi .s.livrat { color:var(--ok); } .zi .s.la_client { color:var(--accent); }
  .zi .t { color:#2a2823; } .zi .t small { color:var(--soft); }
  .lipsa { display:grid; gap:10px; margin-top:14px; }
  .lipsa div { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
  .lipsa b { display:block; font-size:15px; } .lipsa span { font-size:13.5px; color:var(--muted); }
  .rand { display:flex; justify-content:space-between; gap:12px; padding:12px 0; border-top:1px solid var(--line); font-size:14.5px; flex-wrap:wrap; }
  .rand .m { color:var(--muted); font-size:13px; }
  .msg { padding:10px 14px; border-radius:14px; margin-top:8px; font-size:14.5px; max-width:85%; }
  .msg.client { background:var(--ink); color:var(--ink-text); margin-left:auto; } .msg.alex { background:var(--surface); border:1px solid var(--line); }
  .msg small { display:block; font-size:11px; opacity:.7; margin-top:2px; }
  footer { border-top:1px solid var(--line); padding:28px 0 40px; font-size:12.5px; color:var(--muted); }
  footer .wrap { display:flex; justify-content:space-between; gap:14px; flex-wrap:wrap; }
  .gol { color:var(--muted); font-size:14.5px; margin-top:10px; }
  @media (max-width:640px) { .zi { grid-template-columns:52px 1fr; } .zi .s { grid-column:2; } section { padding:32px 0; } }
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="https://alesign.net" target="_blank" rel="noopener">${MARCA}<span>AleSign&amp;Co</span></a>
  <nav class="nav"><a href="#aprobat">De aprobat</a><a href="#calendar">Calendar</a><a href="#materiale">Materiale</a><a href="#rapoarte">Rapoarte</a><a href="#contract">Contract</a><a href="#mesaje">Mesaje</a></nav>
</div></header>

<section class="salut"><div class="wrap">
  <p class="eyebrow">Spațiul tău</p>
  <h1>${esc(d.firma)}</h1>
  <p class="lead">${nume ? `Bună, ${esc(nume)}. ` : ''}Aici vezi tot ce pregătesc pentru tine, aprobi dintr-o apăsare și îmi spui ce vrei altfel. Nimic nu apare în numele tău fără „da”-ul tău.</p>
  <div class="cifre">
    <div><b>${deAprobat.length}</b><span>de aprobat</span></div>
    <div><b>${Number(d.in_lucru || 0)}</b><span>în lucru</span></div>
    <div><b>${Number(d.publicate_luna || 0)}</b><span>publicate luna asta</span></div>
  </div>
</div></section>

<section id="aprobat"><div class="wrap">
  <p class="eyebrow">De aprobat</p>
  <h2 class="h2">${deAprobat.length ? `${deAprobat.length === 1 ? 'O piesă te așteaptă.' : `${deAprobat.length} piese te așteaptă.`}` : 'Nimic de aprobat acum.'}</h2>
  <p class="lead">${deAprobat.length ? 'Fiecare a trecut deja prin verificarea mea. Aprobi, sau îmi scrii în două vorbe ce schimbăm.' : 'Când pregătesc ceva nou, primești un email cu linkul de aici.'}</p>
  ${deAprobat.length > 1 ? `<div class="toate"><p>Dacă ți se potrivesc toate, le aprobi deodată.</p><button class="btn" type="button" data-aprob-tot>Aprob toate cele ${deAprobat.length}</button></div>` : ''}
  ${deAprobat.map((s) => `<div class="card" data-sarcina="${s.id}">
    <p class="meta">${esc(TIP[s.tip] || s.tip)}${s.versiune > 1 ? ` · varianta ${s.versiune}` : ''}</p>
    <h3>${esc(s.titlu)}</h3>
    ${continutHtml(s)}
    <div class="act"><button class="btn ok" type="button" data-aprob="${s.id}">Aprob</button><button class="btn ghost" type="button" data-mod="${s.id}">Vreau o modificare</button></div>
    <div class="mod" id="mod-${s.id}"><textarea rows="3" placeholder="Ce schimbăm? Un rând e de ajuns: „mai scurt”, „fără prețuri”, „poza cu echipa”."></textarea><div class="act"><button class="btn mic" type="button" data-trimite-mod="${s.id}">Trimite</button></div></div>
    <p class="gata" id="gata-${s.id}"></p>
  </div>`).join('')}
</div></section>

<section id="calendar"><div class="wrap">
  <p class="eyebrow">Calendar</p>
  <h2 class="h2">Ce apare și când.</h2>
  <p class="lead">Postările, newsletterele și video-urile lunii, cu starea fiecăreia. Orele sunt orientative; publicarea se face în intervalul în care publicul tău e online.</p>
  ${Object.keys(luni).sort().map((k) => { const items = luni[k]; const t = new Date(k + '-01').toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }); return `<div class="luna"><h3>${esc(t)}</h3>${items.map((s) => `<div class="zi"><span class="d">${s.zi ? dataScurt(s.zi) : ''}</span><span class="t">${esc(TIP[s.tip] || s.tip)}${s.continut && s.continut.text ? `: <small>${esc(String(s.continut.text).slice(0, 90))}${String(s.continut.text).length > 90 ? '…' : ''}</small>` : ''}${s.canale && s.canale.length ? ` <small>· ${s.canale.map((x) => CANAL[x] || x).join(', ')}</small>` : ''}</span><span class="s ${esc(s.stare)}">${esc(STARE[s.stare] || s.stare)}${s.programat_la && s.stare === 'programat' ? ` · ${oraRo(s.programat_la)}` : ''}</span></div>`).join('')}</div>`; }).join('') || '<p class="gol">Calendarul se umple în primele zile de la pornire.</p>'}
</div></section>

<section id="materiale"><div class="wrap">
  <p class="eyebrow">Materiale</p>
  <h2 class="h2">${lipsa.length ? 'Mai am nevoie de câteva lucruri de la tine.' : 'Am tot ce îmi trebuie.'}</h2>
  <p class="lead">${lipsa.length ? 'Fiecare deblochează o parte din ce ai cumpărat. Le completezi în pagina de start, în câteva minute.' : 'Dacă se schimbă ceva (prețuri, program, poze noi), actualizezi tot din pagina de start.'}</p>
  ${lipsa.length ? `<div class="lipsa">${lipsa.map((k) => `<div><b>${esc(LIPSA[k][0])}</b><span>${esc(LIPSA[k][1])}</span></div>`).join('')}</div>` : ''}
  ${ob && ob.slug ? `<div class="act" style="margin-top:16px"><a class="btn" href="/o/${esc(ob.slug)}">${ob.completat_la ? 'Actualizează materialele' : 'Completează pagina de start'} →</a></div>` : ''}
</div></section>

<section id="rapoarte"><div class="wrap">
  <p class="eyebrow">Rapoarte</p>
  <h2 class="h2">Ce s-a întâmplat, lună de lună.</h2>
  ${rapoarte.length ? rapoarte.map((r) => `<div class="rand"><span>${esc(r.eticheta || r.luna)}</span><a class="lnk" href="/r/${esc(r.slug)}">Deschide raportul →</a></div>`).join('') : '<p class="gol">Primul raport vine la începutul lunii următoare, cu ce am livrat și ce s-a văzut.</p>'}
</div></section>

<section id="contract"><div class="wrap">
  <p class="eyebrow">Contract și plăți</p>
  <h2 class="h2">Actele, într-un loc.</h2>
  ${contracte.length ? contracte.map((c) => `<div class="rand"><span>Contract ${esc(c.numar)} · ${esc(c.pachet_nume)}<br><span class="m">${c.status === 'platit' ? `activ din ${dataRo(c.platit_la)}` : c.status === 'semnat' ? 'semnat, aștept plata' : 'de semnat'}${Number(c.total_lunar) > 0 ? ` · ${nr(c.total_lunar)} RON / lună` : ''}</span></span><span><a class="lnk" href="/c/${esc(c.slug)}">Deschide →</a> &nbsp; <a class="lnk" href="/api/contract-pdf?slug=${esc(c.slug)}">PDF</a></span></div>`).join('') : '<p class="gol">Niciun contract activ.</p>'}
</div></section>

<section id="mesaje"><div class="wrap">
  <p class="eyebrow">Mesaje</p>
  <h2 class="h2">Scrie-mi direct de aici.</h2>
  <p class="lead">Ajunge la mine, pe cardul tău, nu într-un inbox pierdut. Îți răspund în aceeași zi lucrătoare.</p>
  <div id="lista-mesaje">${mesaje.map((m) => `<div class="msg ${esc(m.de_la)}">${nl(m.text)}<small>${m.de_la === 'client' ? 'tu' : 'Alexandru'} · ${dataScurt(m.la)} ${oraRo(m.la)}</small></div>`).join('')}</div>
  <form id="f-mesaj" style="margin-top:14px"><textarea name="text" rows="3" placeholder="Întrebare, idee, o poză pe care o vrei folosită…" required></textarea><div class="act"><button class="btn" type="submit">Trimite</button></div><p class="gata" id="gata-mesaj">Trimis. Îți răspund în curând.</p></form>
</div></section>

<footer><div class="wrap">
  <div>AleSign&amp;Co · <a class="lnk" href="mailto:info@alesign.net">info@alesign.net</a></div>
  <div>Pagina e doar a ta: nu o da mai departe. Dacă vrei un link nou, scrie-mi.</div>
</div></footer>

<script>
(function(){
  var T = ${JSON.stringify(token)};
  function post(url, body){ return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.assign({ token: T }, body)) }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok && j.ok, j: j }; }); }).catch(function(){ return { ok:false }; }); }
  function gata(id, text, ok){ var g = document.getElementById('gata-' + id); if (!g) return; g.textContent = text; g.style.color = ok ? '' : '#b3261e'; g.classList.add('on'); }
  function blocheaza(card){ card.querySelectorAll('button').forEach(function(b){ b.disabled = true; }); }
  document.querySelectorAll('[data-aprob]').forEach(function(b){ b.addEventListener('click', function(){
    var id = b.getAttribute('data-aprob'), card = b.closest('.card'); blocheaza(card);
    post('/api/spatiu-decizie', { id: Number(id), decizie: 'aprob' }).then(function(r){ if (r.ok) { gata(id, 'Aprobat. Mulțumesc!', true); card.style.opacity = .6; } else { card.querySelectorAll('button').forEach(function(x){ x.disabled = false; }); gata(id, 'Nu a mers. Încearcă din nou sau scrie-mi.', false); } });
  }); });
  document.querySelectorAll('[data-mod]').forEach(function(b){ b.addEventListener('click', function(){ var m = document.getElementById('mod-' + b.getAttribute('data-mod')); m.classList.toggle('on'); if (m.classList.contains('on')) m.querySelector('textarea').focus(); }); });
  document.querySelectorAll('[data-trimite-mod]').forEach(function(b){ b.addEventListener('click', function(){
    var id = b.getAttribute('data-trimite-mod'), card = b.closest('.card'), ta = document.getElementById('mod-' + id).querySelector('textarea'); var motiv = (ta.value || '').trim();
    if (motiv.length < 3) { ta.focus(); return; } blocheaza(card);
    post('/api/spatiu-decizie', { id: Number(id), decizie: 'modificare', motiv: motiv }).then(function(r){ if (r.ok) { gata(id, 'Am notat. Refac și îți trimit varianta nouă.', true); card.style.opacity = .6; } else { card.querySelectorAll('button').forEach(function(x){ x.disabled = false; }); gata(id, 'Nu a mers. Încearcă din nou sau scrie-mi.', false); } });
  }); });
  var tot = document.querySelector('[data-aprob-tot]');
  if (tot) tot.addEventListener('click', function(){ tot.disabled = true; post('/api/spatiu-decizie', { id: null, decizie: 'aprob' }).then(function(r){ if (r.ok) { document.querySelectorAll('.card[data-sarcina]').forEach(function(c){ blocheaza(c); c.style.opacity = .6; }); tot.textContent = 'Aprobate. Mulțumesc!'; } else { tot.disabled = false; tot.textContent = 'Nu a mers. Încearcă din nou sau scrie-mi mai jos.'; } }); });
  var f = document.getElementById('f-mesaj');
  f.addEventListener('submit', function(ev){ ev.preventDefault(); var ta = f.querySelector('textarea'); var text = (ta.value || '').trim(); if (text.length < 2) return; var btn = f.querySelector('button'); btn.disabled = true;
    post('/api/spatiu-mesaj', { text: text }).then(function(r){ btn.disabled = false; if (r.ok) { var el = document.createElement('div'); el.className = 'msg client'; el.textContent = text; var s = document.createElement('small'); s.textContent = 'tu · acum'; el.appendChild(s); document.getElementById('lista-mesaje').appendChild(el); ta.value = ''; var g = document.getElementById('gata-mesaj'); g.textContent = g.getAttribute('data-ok') || g.textContent; g.style.color = ''; g.classList.add('on'); } else { var g2 = document.getElementById('gata-mesaj'); if (!g2.getAttribute('data-ok')) g2.setAttribute('data-ok', g2.textContent); g2.textContent = (r.j && r.j.motiv === 'prea multe mesaje') ? 'Ai trimis multe mesaje într-o oră. Mai încearcă puțin mai târziu sau scrie-mi pe email.' : 'Nu a mers. Încearcă din nou sau scrie-mi pe email.'; g2.style.color = '#b3261e'; g2.classList.add('on'); } }); });
})();
</script>
</body>
</html>`;
}

export function spatiuInchis() {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Linkul nu mai e valabil</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#141414;font-family:Manrope,system-ui,sans-serif;text-align:center;padding:24px}h1{font-family:'Cormorant Garamond',serif;font-size:40px;margin:0 0 12px}p{color:#6b675f;max-width:44ch;margin:0 auto 22px}a{display:inline-block;padding:14px 24px;border-radius:999px;background:#0c0c0d;color:#f4f1ea;text-decoration:none;font-weight:600}</style></head>
<body><div><h1>Linkul acesta nu mai e valabil.</h1><p>Poate a fost regenerat sau colaborarea s-a încheiat. Scrie-mi și îți trimit unul nou în aceeași zi.</p><a href="mailto:info@alesign.net?subject=Spatiul%20meu">Scrie-mi</a></div></body></html>`;
}
