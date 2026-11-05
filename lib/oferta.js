// Oferta de lansare AleSystem (27 nov. 2026): pagina /oferta și PDF-ul /oferta.pdf, atașat emailului de lansare (setari.sistem_pdf_oferta_url).
// Prețurile sunt cele de listă din `pachete`; ofertele (Fondator, lista SISTEM, recomandare) sunt descrise ca reguli, fără prețuri personale (acelea sunt pe linkul fiecăruia).
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { fontBytes } from './pdf.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SERV = process.env.SUPABASE_SERVICE_KEY;
const HS = () => ({ apikey: KEY_SERV, Authorization: `Bearer ${KEY_SERV}` });
const CODURI = ['prezenta', 'crestere', 'dominare', 'complete', 'lansare', 'relansare', 'an_crestere', 'fundatie'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// datele: pachetele din grilă + ofertele de lansare (reguli) + lansarea
export async function ofertaDate() {
  if (!URL_SB || !KEY_SERV) throw new Error('lipsesc SUPABASE_URL / SUPABASE_SERVICE_KEY');
  const [p, o, s] = await Promise.all([
    fetch(`${URL_SB}/rest/v1/pachete?select=cod,nume,subtitlu,pret,categorie,eticheta,descriere,include,ordine&cod=in.(${CODURI.join(',')})&activ=eq.true&order=ordine.asc`, { headers: HS() }).then((r) => r.json()),
    fetch(`${URL_SB}/rest/v1/oferte_lansare?select=cod,nume,de_la,pana_la,max_clienti,reduceri`, { headers: HS() }).then((r) => r.json()),
    fetch(`${URL_SB}/rest/v1/setari?select=cheie,valoare&cheie=in.(preturi_lansare_la,sistem_tally_url,firma_telefon,firma_email,sistem_url_baza)`, { headers: HS() }).then((r) => r.json()),
  ]);
  const set = Object.fromEntries((Array.isArray(s) ? s : []).map((x) => [x.cheie, x.valoare]));
  return normalizeaza({ pachete: Array.isArray(p) ? p : [], oferte: Array.isArray(o) ? o : [], setari: set });
}

export function normalizeaza({ pachete = [], oferte = [], setari = {} }) {
  const fond = oferte.find((x) => x.cod === 'FONDATOR_BF') || {}; const lista = oferte.find((x) => x.cod === 'LISTA_SISTEM') || {};
  const rf = fond.reduceri || {}; const rl = lista.reduceri || {};
  const lunare = pachete.filter((x) => x.categorie === 'lunar'); const anuale = pachete.filter((x) => x.categorie === 'combo'); const fundatie = pachete.find((x) => x.cod === 'fundatie');
  const red = (x) => (x && typeof x === 'object' ? x : {});
  return {
    lansare_la: setari.preturi_lansare_la || fond.de_la || '2026-11-27T20:00:00+02:00',
    pana_la: lista.pana_la || '2026-12-31T23:59:59+02:00',
    tally: setari.sistem_tally_url || '', baza: setari.sistem_url_baza || 'https://demo.alesign.net', telefon: setari.firma_telefon || '', email: setari.firma_email || 'info@alesign.net',
    lunare, anuale, fundatie,
    fondator: { locuri: Number(fond.max_clienti || 3), luni: Number(rf.luni || 12), lunar: red(rf.lunar), anual: Number(rf.anual || 20), cu_adus: Number(rf.lunar_cu_recomandare || 50), adus: Number(rf.adus || 20) },
    lista: { lunar: Number(rl.lunar || 10), anual: Number(rl.anual || 15), cu_adus: Number(rl.lunar_cu_recomandare || 20), adus: Number(rl.adus || 10), credit: Number(rl.anual_bonus_credit || 15) },
  };
}

const ro = (d, opt) => new Date(d).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', ...opt });
const ziLunga = (d) => ro(d, { day: 'numeric', month: 'long', year: 'numeric' });
const ora = (d) => ro(d, { hour: '2-digit', minute: '2-digit' });

// textele comune (pagină + PDF), în vocea lui Alexandru
export function texte(d) {
  const f = d.fondator, l = d.lista;
  const pr = (cod) => (f.lunar[cod] != null ? `−${f.lunar[cod]} %` : '');
  return {
    titlu: 'AleSystem Design',
    sub: 'Oferta de lansare',
    data: `${ziLunga(d.lansare_la)}, ora ${ora(d.lansare_la)}`,
    motto: 'Tu decizi direcția. Restul rulează singur.',
    ce: [
      'Nu sunt o agenție. Am fost. Am automatizat până și motivul pentru care exista o agenție.',
      'AleSystem e un sistem de boți care preiau execuția din afacerea ta: site, conținut, reclame, clienți noi, recenzii, raport. Rulează non-stop, fără concedii, fără „revin eu mâine”.',
      'Tu decizi direcția și aprobi ce se publică. Eu țin planul și prioritățile. Boții fac restul.',
    ],
    cum: [
      'Primești un link personal, cu prețurile tale.',
      'Alegi pachetul și îmi dai de știre cu un click.',
      'Îți trimit contractul pe email. Semnezi pe pagină, plătești cu cardul sau prin transfer.',
      'În 2-3 zile ai primul plan în spațiul tău. Aprobi cu un click. Nimic nu se publică fără tine.',
    ],
    oferte: [
      { nume: `Fondator · ${f.locuri} locuri`, text: `Îi aleg eu, de pe lista SISTEM. Fundația (${nr(d.fundatie ? d.fundatie.pret : 500)} lei, o dată: audit + apel, landing page premium, Google Business optimizat, conținut 30 de zile), apoi ${f.luni} luni la preț de fondator: ${['prezenta', 'crestere', 'dominare', 'complete'].map((c) => `${(d.lunare.find((x) => x.cod === c) || {}).nume || c} ${pr(c)}`).join(', ')}; anuale −${f.anual} %. Primii ${f.locuri} care plătesc intră.` },
      { nume: 'Lista SISTEM', text: `Toți cei de pe listă: −${l.lunar} % la abonamentele lunare, −${l.anual} % la cele anuale, pentru comenzile de până pe ${ziLunga(d.pana_la)}.` },
      { nume: 'Recomandarea', text: `Fiecare are un link personal de recomandare. Când cineva adus prin el plătește, Fondatorul coboară la −${f.cu_adus} % pe lunar cât timp cel adus rămâne client (lista: −${l.cu_adus} %), iar cel adus primește −${f.adus} % (de la un Fondator) sau −${l.adus} % (de pe listă) la primul abonament.` },
    ],
    nota: 'Prețuri finale, în lei. Prețurile personale (cu oferta aplicată) sunt pe linkul fiecăruia, nu aici. Nimic nu se plătește până nu semnezi.',
    contact: `${d.email}${d.telefon ? ` · ${d.telefon}` : ''} · alesign.net`,
  };
}

const STIL = `<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap');
:root{--bg:#0D0F14;--s:#151821;--s2:#1B1F2A;--b:#272C38;--g:#C9A227;--t:#F2F1ED;--d:#9BA1B0;--f:#5B6070}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--t);font-family:Manrope,-apple-system,'Segoe UI',Inter,Arial,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto;padding:40px 20px 80px}
.hero{min-height:72vh;display:flex;flex-direction:column;justify-content:center;gap:14px}
.eyebrow{color:var(--g);font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700}
h1{font-size:clamp(36px,7vw,72px);line-height:1.02;margin:0;font-weight:800;letter-spacing:-.02em}
h2{font-size:clamp(22px,3.4vw,32px);margin:72px 0 18px;font-weight:800;letter-spacing:-.01em}
.lead{font-size:clamp(17px,2.2vw,21px);color:var(--d);max-width:640px;margin:0}
.motto{font-size:clamp(20px,3vw,28px);font-weight:700;margin:18px 0 0}
.line{height:1px;background:linear-gradient(90deg,var(--g),transparent);margin:28px 0 0;width:160px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.card{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:22px;position:relative;overflow:hidden;transition:transform .35s ease,border-color .35s ease}
.card:hover{transform:translateY(-3px);border-color:var(--g)}
.card .tag{position:absolute;top:14px;right:14px;background:var(--g);color:#0D0F14;font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase}
.card h3{margin:0 0 4px;font-size:20px}.card .sub{color:var(--d);font-size:14px;margin:0 0 14px;min-height:42px}
.pret{font-size:30px;font-weight:800;letter-spacing:-.02em}.pret span{font-size:13px;color:var(--f);font-weight:500;letter-spacing:0}
.card ul{list-style:none;padding:0;margin:14px 0 0;color:var(--d);font-size:14px}.card li{padding:5px 0 5px 18px;position:relative;border-top:1px solid var(--b)}.card li::before{content:'';position:absolute;left:0;top:13px;width:8px;height:8px;border-radius:50%;background:var(--g)}
.pasi{counter-reset:p;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}.pasi div{background:var(--s2);border:1px solid var(--b);border-radius:14px;padding:18px;color:var(--d)}
.pasi div::before{counter-increment:p;content:counter(p);display:block;color:var(--g);font-weight:800;font-size:28px;margin-bottom:8px}
.of{display:grid;gap:12px}.of div{background:var(--s);border-left:3px solid var(--g);padding:16px 18px;border-radius:0 14px 14px 0}.of b{display:block;margin-bottom:4px;font-size:17px}.of p{margin:0;color:var(--d)}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.btn{display:inline-block;background:var(--g);color:#0D0F14;font-weight:800;padding:14px 22px;border-radius:12px;text-decoration:none;font-size:15px}.btn2{background:transparent;color:var(--g);border:1px solid var(--g)}
.f{color:var(--f);font-size:13px}.nota{margin-top:40px;border-top:1px solid var(--b);padding-top:18px}
.rv{opacity:0;transform:translateY(16px);transition:opacity .7s ease,transform .7s ease}.rv.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.rv{opacity:1;transform:none;transition:none}.card{transition:none}}
@media print{body{background:#fff;color:#111}.card,.pasi div,.of div{background:#fff;border-color:#ddd}.rv{opacity:1;transform:none}}
</style>`;
const SCRIPT = `<noscript><style>.rv{opacity:1;transform:none}</style></noscript><script>(()=>{const all=document.querySelectorAll('.rv');try{const io=new IntersectionObserver((es)=>{for(const e of es)if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}},{threshold:.12});all.forEach((el,i)=>{el.style.transitionDelay=(Math.min(i%6,5)*70)+'ms';io.observe(el)})}catch{}setTimeout(()=>all.forEach((el)=>el.classList.add('in')),1500)})();</script>`;

export function randeazaOferta(d) {
  const t = texte(d);
  const card = (p, per) => `<div class="card rv">${p.eticheta ? `<span class="tag">${esc(p.eticheta)}</span>` : ''}<h3>${esc(p.nume)}</h3><p class="sub">${esc(p.subtitlu || '')}</p><div class="pret">${nr(p.pret)} <span>lei${per}</span></div><ul>${(Array.isArray(p.include) ? p.include : []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(t.titlu)} · ${esc(t.sub)}</title>${STIL}</head><body><div class="wrap">
<section class="hero"><p class="eyebrow rv">${esc(t.sub)} · ${esc(t.data)}</p><h1 class="rv">${esc(t.titlu)}</h1><p class="lead rv">${esc(t.ce[1])}</p><p class="motto rv">${esc(t.motto)}</p><div class="line rv"></div></section>
<h2 class="rv">Ce e AleSystem</h2>${t.ce.map((x) => `<p class="lead rv">${esc(x)}</p>`).join('')}
<h2 class="rv">Abonamentele lunare</h2><div class="grid">${d.lunare.map((p) => card(p, ' / lună')).join('')}</div>
<h2 class="rv">Pachetele anuale</h2><div class="grid">${d.anuale.map((p) => card(p, ' / an')).join('')}</div>
<h2 class="rv">Ofertele de lansare</h2><div class="of">${t.oferte.map((o) => `<div class="rv"><b>${esc(o.nume)}</b><p>${esc(o.text)}</p></div>`).join('')}</div>
<h2 class="rv">Cum merge</h2><div class="pasi">${t.cum.map((x) => `<div class="rv">${esc(x)}</div>`).join('')}</div>
<div class="cta rv">${d.tally ? `<a class="btn" href="${esc(d.tally)}">Intră pe lista SISTEM</a>` : ''}<a class="btn btn2" href="/oferta.pdf">Descarcă PDF-ul</a></div>
<p class="f nota rv">${esc(t.nota)}<br>${esc(t.contact)}</p>
</div>${SCRIPT}</body></html>`;
}

// PDF-ul: pagini întunecate, auriu, Manrope; A4
export async function ofertaPdf(d) {
  const t = texte(d);
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  pdf.setTitle('AleSystem Design - Oferta de lansare'); pdf.setAuthor('AleSign&Co'); pdf.setLanguage('ro');
  const fb = await Promise.all([fontBytes('Manrope', 400), fontBytes('Manrope', 800)]);
  const ok = fb.every(Boolean);
  const F = ok ? { r: await pdf.embedFont(fb[0], { subset: true }), b: await pdf.embedFont(fb[1], { subset: true }) } : { r: await pdf.embedFont(StandardFonts.Helvetica), b: await pdf.embedFont(StandardFonts.HelveticaBold) };
  const T = ok ? (s) => String(s ?? '') : (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[„”]/g, '"').replace(/·/g, '-').replace(/−/g, '-');
  const W = 595.28, H = 841.89, M = 54, LW = W - 2 * M;
  const bg = rgb(0.051, 0.059, 0.078), s1 = rgb(0.082, 0.094, 0.129), line = rgb(0.153, 0.173, 0.22), gold = rgb(0.788, 0.635, 0.153), ink = rgb(0.949, 0.945, 0.929), dim = rgb(0.608, 0.631, 0.69), f = rgb(0.357, 0.376, 0.439);
  let page, y;
  const newPage = () => {
    page = pdf.addPage([W, H]); page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
    page.drawText('AleSystem Design', { x: M, y: H - 36, size: 9, font: F.b, color: gold });
    const r = T(t.sub); page.drawText(r, { x: W - M - F.r.widthOfTextAtSize(r, 8), y: H - 36, size: 8, font: F.r, color: f });
    y = H - 80;
  };
  const wrap = (text, font, size, width) => { const out = []; let cur = ''; for (const w of T(text).split(/\s+/)) { const x = cur ? `${cur} ${w}` : w; if (font.widthOfTextAtSize(x, size) > width && cur) { out.push(cur); cur = w; } else cur = x; } if (cur) out.push(cur); return out; };
  const need = (h) => { if (y - h < M) newPage(); };
  const para = (text, { font = F.r, size = 10.5, color = dim, after = 8, width = LW, x = M, lh = 1.45 } = {}) => { const ls = wrap(text, font, size, width); need(ls.length * size * lh); for (const l of ls) { page.drawText(l, { x, y, size, font, color }); y -= size * lh; } y -= after; };
  const h2 = (text) => { need(70); y -= 22; page.drawText(T(text), { x: M, y, size: 20, font: F.b, color: ink }); y -= 14; page.drawLine({ start: { x: M, y }, end: { x: M + 70, y }, thickness: 1.2, color: gold }); y -= 20; };

  // coperta
  newPage(); y = H - 300;
  page.drawText(T(`${t.sub} · ${t.data}`).toUpperCase(), { x: M, y, size: 9, font: F.b, color: gold }); y -= 44;
  page.drawText('AleSystem', { x: M, y, size: 52, font: F.b, color: ink }); y -= 54; page.drawText('Design', { x: M, y, size: 52, font: F.b, color: ink }); y -= 40;
  para(t.ce[1], { size: 13, color: dim, width: LW - 60, after: 14, lh: 1.5 });
  para(t.motto, { font: F.b, size: 17, color: ink, after: 0 });
  page.drawLine({ start: { x: M, y: y - 12 }, end: { x: M + 110, y: y - 12 }, thickness: 1.2, color: gold });
  page.drawText(T(t.contact), { x: M, y: M, size: 9, font: F.r, color: f });

  // ce e
  newPage(); h2('Ce e AleSystem'); for (const x of t.ce) para(x, { size: 12, color: ink, after: 10, lh: 1.5 });
  h2('Cum merge'); t.cum.forEach((x, i) => { need(40); page.drawText(String(i + 1), { x: M, y, size: 18, font: F.b, color: gold }); const ls = wrap(x, F.r, 11, LW - 30); let yy = y; for (const l of ls) { page.drawText(l, { x: M + 28, y: yy, size: 11, font: F.r, color: dim }); yy -= 16; } y = yy - 10; });

  // pachete
  const cardPdf = (p, per) => {
    const inc = Array.isArray(p.include) ? p.include : [];
    const h = 78 + inc.length * 14; need(h + 10);
    page.drawRectangle({ x: M, y: y - h + 10, width: LW, height: h, color: s1, borderColor: line, borderWidth: 0.6 });
    page.drawText(T(p.nume), { x: M + 16, y: y - 14, size: 16, font: F.b, color: ink });
    if (p.eticheta) { const e = T(p.eticheta).toUpperCase(); const ew = F.b.widthOfTextAtSize(e, 7.5) + 12; page.drawRectangle({ x: W - M - 16 - ew, y: y - 18, width: ew, height: 13, color: gold }); page.drawText(e, { x: W - M - 10 - ew, y: y - 14.5, size: 7.5, font: F.b, color: bg }); }
    page.drawText(T(p.subtitlu || ''), { x: M + 16, y: y - 30, size: 9.5, font: F.r, color: dim });
    const pr = `${nr(p.pret)} lei`; page.drawText(pr, { x: M + 16, y: y - 54, size: 20, font: F.b, color: ink });
    page.drawText(T(per), { x: M + 16 + F.b.widthOfTextAtSize(pr, 20) + 6, y: y - 54, size: 9, font: F.r, color: f });
    let yy = y - 74; for (const x of inc) { page.drawCircle({ x: M + 20, y: yy + 3, size: 2, color: gold }); page.drawText(T(x), { x: M + 30, y: yy, size: 9, font: F.r, color: dim }); yy -= 14; }
    y = y - h - 2;
  };
  newPage(); h2('Abonamentele lunare'); for (const p of d.lunare) cardPdf(p, '/ lună');
  newPage(); h2('Pachetele anuale'); for (const p of d.anuale) cardPdf(p, '/ an');

  // oferte + nota
  h2('Ofertele de lansare');
  for (const o of t.oferte) { need(70); page.drawRectangle({ x: M, y: y - 2, width: 2.5, height: 14, color: gold }); page.drawText(T(o.nume), { x: M + 12, y, size: 12.5, font: F.b, color: ink }); y -= 18; para(o.text, { x: M + 12, width: LW - 12, size: 10, after: 12 }); }
  y -= 6; need(50); page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: line }); y -= 16;
  para(t.nota, { size: 9, color: f, after: 4 }); para(t.contact, { size: 9, color: f, after: 0 });
  return Buffer.from(await pdf.save());
}
