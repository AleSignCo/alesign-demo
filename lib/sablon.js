// Șabloanele de nișă pentru site-urile clienților (Linia „Website”): aceeași hartă fixă de secțiuni (continut.site din botul website v4),
// șase înfățișări — cabinet, salon, centru (spa/wellness), local (restaurant/cafenea), atelier/studio, afacere (generic/B2B).
// Un singur modul face trei lucruri: (1) previzualizarea din spațiul clientului (/s/<token>/site/<id>), (2) paginile statice pentru găzduire
// (Vercel, decizia 3), (3) fragmentele HTML+CSS pe secțiune pentru Webflow (conectorul inserează WHTML într-un site gol).
// Niciun text nu vine din șablon: tot ce e scris pe site e din continut.site (aprobat de Alexandru și de client). Șablonul doar așază.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl = (s) => esc(s).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const cifre = (s) => String(s || '').replace(/[^\d+]/g, '');

// aceeași regulă ca în Livrare · Mesaje (cuvantBusiness): nișa din dosar + numele firmei
export function nisaDin(identitate) {
  const n = String((identitate && identitate.nisa) || '').toLowerCase();
  const f = String((identitate && identitate.firma) || '').toLowerCase();
  const t = n + ' ' + f;
  if (/cabinet|dental|dentar|medical|clinic|stomato|kineto|fizio|veterinar|psiho/.test(t)) return 'cabinet';
  if (/salon|beauty|frizer|barber|coafor|nail|cosmetic|estetic|lash|brow/.test(t)) return 'salon';
  if (/spa|wellness|masaj|yoga|pilates|sauna/.test(t)) return 'centru';
  if (/restaurant|bistro|cafenea|cafe|pizzer|brutar|patiser|cofet|bar|pub|winery|cram/.test(t)) return 'local';
  if (/atelier|studio|foto|design|arhitect|tatuaj|croitor|bijut|ceram/.test(t)) return 'atelier';
  return 'afacere';
}

// cele șase înfățișări: fonturi, culori, forme, așezarea eroului și micile etichete care diferă de la o nișă la alta
export const NISE = {
  cabinet: {
    nume: 'Cabinet', fonturi: 'family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600', titlu: "'Fraunces', Georgia, serif", corp: "Inter, system-ui, sans-serif",
    culori: { fundal: '#f7f9f8', suprafata: '#ffffff', cerneala: '#13302b', mut: '#5b6b67', linie: '#dfe7e4', accent: '#1f6f5f', accentText: '#ffffff', moale: '#e3efea', erou: 'linear-gradient(135deg,#dcebe5,#eef4f1)' },
    raza: '12px', razaB: '40px', erou: 'split', etichete: { de_ce: 'De ce aici', servicii: 'Servicii', cum: 'Cum decurge', intrebari: 'Întrebări frecvente', contact: 'Programări' },
  },
  salon: {
    nume: 'Salon', fonturi: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@400;500;600', titlu: "'Cormorant Garamond', Georgia, serif", corp: "Jost, system-ui, sans-serif",
    culori: { fundal: '#fbf7f3', suprafata: '#ffffff', cerneala: '#2b211e', mut: '#7a6a63', linie: '#eadfd7', accent: '#b5685a', accentText: '#ffffff', moale: '#f3e6df', erou: 'linear-gradient(160deg,#f1dfd6,#f8efe9)' },
    raza: '22px', razaB: '40px', erou: 'centrat', etichete: { de_ce: 'Ce ne deosebește', servicii: 'Servicii', cum: 'Cum decurge o vizită', intrebari: 'Întrebări', contact: 'Rezervări' },
  },
  centru: {
    nume: 'Centru', fonturi: 'family=Marcellus&family=Manrope:wght@400;500;600;700', titlu: "'Marcellus', Georgia, serif", corp: "Manrope, system-ui, sans-serif",
    culori: { fundal: '#f4f3ee', suprafata: '#fbfaf6', cerneala: '#1e2a26', mut: '#66706b', linie: '#e1e3da', accent: '#4e6b5b', accentText: '#ffffff', moale: '#e6e9df', erou: 'linear-gradient(150deg,#dfe4d7,#eef0e8)' },
    raza: '26px', razaB: '40px', erou: 'centrat', etichete: { de_ce: 'De ce aici', servicii: 'Ce oferim', cum: 'Cum decurge', intrebari: 'Întrebări', contact: 'Programări' },
  },
  local: {
    nume: 'Local', fonturi: 'family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;500;600', titlu: "'Playfair Display', Georgia, serif", corp: "'Source Sans 3', system-ui, sans-serif",
    culori: { fundal: '#1b1714', suprafata: '#262019', cerneala: '#f3ebdd', mut: '#b9ac99', linie: '#3a322a', accent: '#d9a24a', accentText: '#1b1714', moale: '#2f2820', erou: 'linear-gradient(135deg,#3a2d20,#1f1915)' },
    raza: '8px', razaB: '6px', erou: 'plin', etichete: { de_ce: 'De ce aici', servicii: 'Ce găsești la noi', cum: 'Cum decurge', intrebari: 'Întrebări', contact: 'Rezervări' },
  },
  atelier: {
    nume: 'Atelier', fonturi: 'family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500', titlu: "'Space Grotesk', system-ui, sans-serif", corp: "Inter, system-ui, sans-serif",
    culori: { fundal: '#ffffff', suprafata: '#f6f6f4', cerneala: '#0b0b0c', mut: '#5c5c5a', linie: '#e4e4e0', accent: '#0b0b0c', accentText: '#f5c400', moale: '#f5c400', erou: 'linear-gradient(135deg,#ededea,#f9f9f7)' },
    raza: '0px', razaB: '0px', erou: 'split', etichete: { de_ce: 'De ce noi', servicii: 'Ce facem', cum: 'Cum lucrăm', intrebari: 'Întrebări', contact: 'Scrie-ne' },
  },
  afacere: {
    nume: 'Afacere', fonturi: 'family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500', titlu: "Manrope, system-ui, sans-serif", corp: "Inter, system-ui, sans-serif",
    culori: { fundal: '#f5f7fb', suprafata: '#ffffff', cerneala: '#0f1b33', mut: '#5a6478', linie: '#dfe4ee', accent: '#1e4fd8', accentText: '#ffffff', moale: '#e4eafb', erou: 'linear-gradient(135deg,#dde5f8,#eef2fb)' },
    raza: '12px', razaB: '10px', erou: 'split', etichete: { de_ce: 'De ce noi', servicii: 'Servicii', cum: 'Cum lucrăm', intrebari: 'Întrebări frecvente', contact: 'Contact' },
  },
};

// CSS-ul comun, cu variabilele nișei; fără JS pe site-ul real (previzualizarea are 20 de linii pentru schimbat pagina)
function css(N) {
  const c = N.culori;
  return `
:root{--fundal:${c.fundal};--suprafata:${c.suprafata};--cerneala:${c.cerneala};--mut:${c.mut};--linie:${c.linie};--accent:${c.accent};--accent-text:${c.accentText};--moale:${c.moale};--erou:${c.erou};--raza:${N.raza};--raza-b:${N.razaB || N.raza}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--fundal);color:var(--cerneala);font-family:${N.corp};line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
h1,h2,h3,.tf{font-family:${N.titlu};font-weight:600;line-height:1.08;letter-spacing:-0.012em}
.w{width:min(1120px,100% - 40px);margin:0 auto}
.sus{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--fundal) 88%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--linie)}
.sus .w{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.marca{display:flex;align-items:center;gap:12px;font-weight:700;font-size:17px;letter-spacing:-0.01em}
.marca img{height:36px;width:auto}
.nav{display:flex;align-items:center;gap:24px;font-size:14.5px;color:var(--mut)}
.nav a.on{color:var(--cerneala);font-weight:600}
.nav .b{display:none}
.b{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:var(--accent-text);padding:13px 22px;border-radius:var(--raza-b);font-weight:600;font-size:15px;border:1.5px solid var(--accent);transition:transform .15s,opacity .15s}
.b:hover{transform:translateY(-1px);opacity:.94}
.b.gol{background:transparent;color:var(--cerneala);border-color:var(--linie)}
.b.mic{padding:10px 16px;font-size:14px}
.ochi{font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;color:var(--mut);display:flex;align-items:center;gap:10px}
.ochi::before{content:'';width:18px;height:2px;background:var(--accent)}
section{padding:72px 0}
section+section{border-top:1px solid var(--linie)}
.h2{font-size:clamp(28px,3.6vw,40px);margin:12px 0 10px;max-width:22ch}
.lead{color:var(--mut);font-size:17px;max-width:62ch}
.lead p+p{margin-top:10px}
/* erou */
.erou{padding:56px 0 64px;border-top:0}
.erou .w{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.erou h1{font-size:clamp(36px,5.4vw,62px);margin:0 0 18px;max-width:16ch}
.erou .sub{font-size:19px;color:var(--mut);max-width:48ch;margin-bottom:28px}
.erou .act{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.erou .act .alt{font-size:14px;color:var(--mut)}
.poza{background:var(--erou);border-radius:var(--raza);aspect-ratio:4/3;overflow:hidden;position:relative;display:flex;align-items:flex-end;padding:18px}
.poza img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.poza .brief{position:relative;font-size:12.5px;color:var(--mut);background:color-mix(in srgb,var(--suprafata) 85%,transparent);padding:8px 12px;border-radius:8px;max-width:34ch}
.erou.centrat .w{grid-template-columns:1fr;text-align:center;justify-items:center;gap:32px}
.erou.centrat h1{max-width:20ch}
.erou.centrat .act{justify-content:center}
.erou.centrat .poza{width:100%;aspect-ratio:21/9}
.erou.plin{padding:0}
.erou.plin .w{grid-template-columns:1fr;width:100%;gap:0}
.erou.plin .poza{border-radius:0;aspect-ratio:auto;min-height:62vh;align-items:center;padding:0}
.erou.plin .poza::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.55),rgba(0,0,0,.15))}
.erou.plin .text{position:relative;z-index:2;width:min(1120px,100% - 40px);margin:0 auto;padding:72px 0}
/* grile */
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:32px}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:32px}
.c{background:var(--suprafata);border:1px solid var(--linie);border-radius:var(--raza);padding:26px}
.c h3{font-size:21px;margin-bottom:8px}
.c p{color:var(--mut);font-size:15.5px}
.c .pret{margin-top:14px;font-weight:600;color:var(--cerneala);font-size:15px}
.nr{font-family:${N.titlu};font-size:34px;color:var(--accent);line-height:1;margin-bottom:12px}
.pasi{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:32px;counter-reset:p}
.pas{padding:22px 0 0;border-top:2px solid var(--linie);position:relative}
.pas::before{counter-increment:p;content:counter(p,decimal-leading-zero);font-family:${N.titlu};font-size:15px;color:var(--accent);letter-spacing:.08em;display:block;margin-bottom:10px}
.pas h3{font-size:19px;margin-bottom:6px}
.pas p{color:var(--mut);font-size:15px}
.despre .w{display:grid;grid-template-columns:.9fr 1.1fr;gap:48px;align-items:center}
.despre .poza{aspect-ratio:1/1}
.faq{margin-top:28px;max-width:760px}
.faq details{border-top:1px solid var(--linie);padding:18px 0}
.faq details:last-child{border-bottom:1px solid var(--linie)}
.faq summary{cursor:pointer;font-weight:600;font-size:17px;list-style:none;display:flex;justify-content:space-between;gap:16px}
.faq summary::after{content:'+';color:var(--accent);font-size:22px;line-height:1}
.faq details[open] summary::after{content:'–'}
.faq p{color:var(--mut);margin-top:10px;font-size:15.5px;max-width:64ch}
.contact .w{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.date{display:grid;gap:14px;margin-top:24px}
.date div{display:grid;gap:2px;padding:14px 0;border-top:1px solid var(--linie)}
.date span{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);font-weight:600}
.date b{font-weight:500;font-size:17px}
.date a:hover{text-decoration:underline}
.cta{background:var(--cerneala);color:var(--fundal);text-align:center;padding:80px 0;border-top:0}
.cta h2{font-size:clamp(28px,3.6vw,42px);margin-bottom:12px;color:inherit}
.cta p{opacity:.78;max-width:52ch;margin:0 auto 26px}
.cta .b{background:var(--fundal);color:var(--cerneala);border-color:var(--fundal)}
footer{padding:36px 0;border-top:1px solid var(--linie);color:var(--mut);font-size:13.5px}
footer .w{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
.pg{display:block}
main{min-height:calc(100vh - 220px)}
.lipsa{margin-top:28px;padding:14px 16px;border:1px dashed var(--linie);border-radius:var(--raza);font-size:13.5px;color:var(--mut)}
.prev-bara{position:static;background:#0c0c0d;color:#f4f1ea;font:500 13px/1.4 Manrope,system-ui,sans-serif;padding:10px 20px;display:flex;justify-content:space-between;gap:16px;align-items:center}
.prev-bara a{color:#f4f1ea;text-decoration:underline;text-underline-offset:3px}
.prev-bara b{color:#ff2a2e}
@media(max-width:900px){.erou .w,.despre .w,.contact .w{grid-template-columns:1fr;gap:28px}.g3,.g2,.pasi{grid-template-columns:1fr 1fr}.sus .w{height:60px}.nav{gap:14px;font-size:13.5px;overflow:auto}.sus .b{display:none}.nav .b{display:inline-flex}}
@media(max-width:600px){.prev-bara .lung{display:none}.g3,.g2,.pasi{grid-template-columns:1fr}section{padding:52px 0}.erou{padding:36px 0 48px}.erou.plin .poza{min-height:70vh}.w{width:min(1120px,100% - 32px)}}
`;
}

// datele de contact afișate: din harta site-ului (acasa.contact / contact), completate din dosar; niciun placeholder
function contactDin(site, dosar) {
  const a = (site && site.contact) || {}; const b = (site && site.acasa && site.acasa.contact) || {}; const d = dosar || {};
  const ia = (k) => String(a[k] || b[k] || d[k] || '').trim();
  return { telefon: ia('telefon'), email: ia('email'), adresa: ia('adresa'), program: ia('program') };
}

// butonul unic al site-ului: ținta după tip (telefon / WhatsApp / pagina de contact)
function indemnLink(indemn, ct, modPrev, slugContact) {
  const tip = String((indemn && indemn.tip) || '').toLowerCase(); const tinta = String((indemn && indemn.tinta) || '').trim();
  if (tip === 'telefon' && (tinta || ct.telefon)) return `tel:${cifre(tinta || ct.telefon)}`;
  if (tip === 'whatsapp') { const n = cifre(tinta || ct.telefon).replace(/^\+/, '').replace(/^0/, '40'); if (/^https?:/.test(tinta)) return tinta; if (n) return `https://wa.me/${n}`; }
  if (/^https?:/.test(tinta)) return tinta;
  if (/^mailto:|@/.test(tinta)) return tinta.startsWith('mailto:') ? tinta : `mailto:${tinta}`;
  return modPrev ? `#${slugContact}` : `/${slugContact}`;
}

function poza(url, brief, modPrev) {
  return `<div class="poza">${url ? `<img src="${esc(url)}" alt="">` : ''}${!url && modPrev && brief ? `<div class="brief">Poză: ${esc(brief)}</div>` : ''}</div>`;
}

// paginile fixe ale șablonului; meta vine din continut.pagini (dacă botul le-a potrivit după nume), altfel din harta site-ului
const PAGINI = [['acasa', 'Acasă', ''], ['servicii', 'Servicii', 'servicii'], ['despre', 'Despre', 'despre'], ['contact', 'Contact', 'contact']];
function metaPentru(pagini, cheie, nume, site, firma) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const p = (Array.isArray(pagini) ? pagini : []).find((x) => x && (norm(x.pagina).includes(norm(nume)) || (cheie === 'acasa' && String(x.slug || '').trim() === '/') || norm(x.slug || '').replace(/\//g, '') === cheie));
  const t = p && p.meta_titlu ? p.meta_titlu : (cheie === 'acasa' ? `${firma}` : `${nume} · ${firma}`);
  const d = p && p.meta_descriere ? p.meta_descriere : String((site && site.acasa && site.acasa.inceput && site.acasa.inceput.subtitlu) || '').slice(0, 155);
  return { titlu: t, descriere: d };
}

/**
 * randeazaSite(piesa, dosar, opt)
 *  piesa: continut-ul sarcinii website/refresh v4 (site, pagini, indemn, poze)
 *  dosar: { firma, nisa, identitate, logo_url, poze: [url], telefon, email, adresa, program }
 *  opt:   { mod: 'preview' | 'static', inapoi: url (preview), nisa: cheie forțată, pagina: 'acasa'|'servicii'|'despre'|'contact' (static: o singură pagină) }
 * Întoarce un document HTML complet.
 */
export function randeazaSite(piesa, dosar, opt = {}) {
  const c = piesa || {}; const site = c.site || {}; const d = dosar || {};
  const cheie = NISE[opt.nisa] ? opt.nisa : nisaDin({ nisa: d.nisa || (d.identitate && d.identitate.nisa), firma: d.firma || (d.identitate && d.identitate.firma) });
  const N = NISE[cheie]; const E = N.etichete;
  const firma = String(d.firma || (d.identitate && d.identitate.firma) || '').trim() || 'Numele firmei';
  const modPrev = opt.mod !== 'static';
  const ct = contactDin(site, { telefon: d.telefon, email: d.email, adresa: d.adresa, program: d.program });
  const indemn = c.indemn || {}; const btText = String(indemn.text || (site.acasa && site.acasa.inceput && site.acasa.inceput.buton) || E.contact).trim();
  const href = indemnLink(indemn, ct, modPrev, 'contact');
  const poze = Array.isArray(d.poze) ? d.poze.filter(Boolean) : [];
  const briefs = Array.isArray(c.poze) ? c.poze : [];
  const briefPt = (pg, sec) => { const b = briefs.find((x) => x && new RegExp(sec, 'i').test(String(x.sectiune || '') + ' ' + String(x.pagina || ''))) || briefs.find((x) => x && new RegExp(pg, 'i').test(String(x.pagina || ''))); return b ? b.brief : ''; };
  const A = site.acasa || {}; const S = site.servicii || {}; const D = site.despre || {}; const C = site.contact || {};
  const lnk = (k) => (modPrev ? `#${k}` : (k === 'acasa' ? '/' : `/${k}`));
  const buton = (cls = '') => `<a class="b ${cls}" href="${esc(href)}">${esc(btText)}</a>`;

  const nav = (activ) => `<header class="sus"><div class="w"><a class="marca" href="${lnk('acasa')}">${d.logo_url ? `<img src="${esc(d.logo_url)}" alt="${esc(firma)}">` : esc(firma)}</a><nav class="nav">${PAGINI.map(([k, n]) => `<a href="${lnk(k)}" class="${k === activ ? 'on' : ''}">${esc(n)}</a>`).join('')}${buton('mic')}</nav>${buton('mic')}</div></header>`;

  const pgAcasa = () => {
    const I = A.inceput || {}; const dc = A.de_ce || {}; const sv = A.servicii || {}; const cd = A.cum_decurge || {}; const ds = A.despre_scurt || {}; const iq = Array.isArray(A.intrebari) ? A.intrebari : []; const ac = A.contact || {};
    const erou = N.erou === 'plin'
      ? `<section class="erou plin"><div class="w"><div class="poza">${poze[0] ? `<img src="${esc(poze[0])}" alt="">` : ''}<div class="text"><h1 style="color:#fff">${esc(I.titlu || firma)}</h1><p class="sub" style="color:rgba(255,255,255,.82)">${esc(I.subtitlu || '')}</p><div class="act">${buton()}${ct.telefon ? `<span class="alt" style="color:rgba(255,255,255,.75)">sau sună: ${esc(ct.telefon)}</span>` : ''}</div></div></div></div></section>`
      : `<section class="erou ${N.erou}"><div class="w"><div><h1>${esc(I.titlu || firma)}</h1><p class="sub">${esc(I.subtitlu || '')}</p><div class="act">${buton()}${ct.telefon ? `<span class="alt">sau sună: ${esc(ct.telefon)}</span>` : ''}</div></div>${poza(poze[0], briefPt('Acas', 'Încep|Inceput|erou|hero'), modPrev)}</div></section>`;
    const deCe = Array.isArray(dc.puncte) && dc.puncte.length ? `<section><div class="w"><p class="ochi">${esc(E.de_ce)}</p><h2 class="h2">${esc(dc.titlu || E.de_ce)}</h2><div class="g3">${dc.puncte.slice(0, 6).map((p, i) => `<div class="c"><div class="nr">${String(i + 1).padStart(2, '0')}</div><h3>${esc(p.titlu || '')}</h3><p>${esc(p.text || '')}</p></div>`).join('')}</div></div></section>` : '';
    const serv = Array.isArray(sv.lista) && sv.lista.length ? `<section><div class="w"><p class="ochi">${esc(E.servicii)}</p><h2 class="h2">${esc(sv.titlu || E.servicii)}</h2><div class="g3">${sv.lista.slice(0, 6).map((s) => `<div class="c"><h3>${esc(s.nume || '')}</h3><p>${esc(s.text || '')}</p></div>`).join('')}</div><p style="margin-top:24px"><a class="b gol" href="${lnk('servicii')}">Toate serviciile</a></p></div></section>` : '';
    const cum = Array.isArray(cd.pasi) && cd.pasi.length ? `<section><div class="w"><p class="ochi">${esc(E.cum)}</p><h2 class="h2">${esc(cd.titlu || E.cum)}</h2><div class="pasi">${cd.pasi.slice(0, 4).map((p) => `<div class="pas"><h3>${esc(p.titlu || '')}</h3><p>${esc(p.text || '')}</p></div>`).join('')}</div></div></section>` : '';
    const despre = ds.text ? `<section class="despre"><div class="w">${poza(poze[1], briefPt('Acas', 'Despre'), modPrev)}<div><p class="ochi">Despre</p><h2 class="h2">${esc(ds.titlu || 'Despre noi')}</h2><div class="lead"><p>${nl(ds.text)}</p></div><p style="margin-top:22px"><a class="b gol" href="${lnk('despre')}">Povestea noastră</a></p></div></div></section>` : '';
    const faq = iq.length ? `<section><div class="w"><p class="ochi">${esc(E.intrebari)}</p><h2 class="h2">${esc(E.intrebari)}</h2><div class="faq">${iq.slice(0, 6).map((q) => `<details><summary>${esc(q.q || '')}</summary><p>${esc(q.a || '')}</p></details>`).join('')}</div></div></section>` : '';
    const contact = `<section class="cta"><div class="w"><h2>${esc(ac.titlu || C.titlu || E.contact)}</h2><p>${esc(ac.text || C.text || '')}</p>${buton()}</div></section>`;
    return erou + deCe + serv + cum + despre + faq + contact;
  };

  const pgServicii = () => {
    const intro = S.intro || {}; const lista = Array.isArray(S.lista) ? S.lista : [];
    return `<section class="erou" style="padding-bottom:24px"><div class="w" style="grid-template-columns:1fr"><div><p class="ochi">${esc(E.servicii)}</p><h1 style="font-size:clamp(32px,4.6vw,52px)">${esc(intro.titlu || E.servicii)}</h1><p class="sub">${esc(intro.text || '')}</p></div></div></section>` +
      `<section style="border-top:0;padding-top:0"><div class="w"><div class="g2" style="margin-top:0">${lista.map((s) => `<div class="c" id="${slugify(s.nume)}"><h3>${esc(s.nume || '')}</h3><p>${nl(s.text || '')}</p>${s.pret ? `<p class="pret">${esc(s.pret)}</p>` : ''}</div>`).join('')}</div></div></section>` +
      `<section class="cta"><div class="w"><h2>${esc(C.titlu || E.contact)}</h2><p>${esc(C.text || '')}</p>${buton()}</div></section>`;
  };

  const pgDespre = () => {
    const pv = D.povestea || {}; const cl = D.cum_lucram || {}; const cc = D.cu_cine || {};
    return `<section class="despre"><div class="w"><div><p class="ochi">Despre</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${esc(pv.titlu || 'Povestea noastră')}</h1><div class="lead"><p>${nl(pv.text || '')}</p></div></div>${poza(poze[1] || poze[0], briefPt('Despre', 'Poveste|Despre|echip'), modPrev)}</div></section>` +
      (Array.isArray(cl.puncte) && cl.puncte.length ? `<section><div class="w"><p class="ochi">${esc(E.cum)}</p><h2 class="h2">${esc(cl.titlu || E.cum)}</h2><div class="g3">${cl.puncte.slice(0, 6).map((p) => `<div class="c"><h3>${esc(p.titlu || '')}</h3><p>${esc(p.text || '')}</p></div>`).join('')}</div></div></section>` : '') +
      (cc.text ? `<section><div class="w"><p class="ochi">Pentru cine</p><h2 class="h2">${esc(cc.titlu || 'Cu cine lucrăm')}</h2><div class="lead"><p>${nl(cc.text)}</p></div></div></section>` : '') +
      `<section class="cta"><div class="w"><h2>${esc(C.titlu || E.contact)}</h2><p>${esc(C.text || '')}</p>${buton()}</div></section>`;
  };

  const pgContact = () => {
    const rand = (k, v, h) => (v ? `<div><span>${esc(k)}</span><b>${h ? `<a href="${esc(h)}">${esc(v)}</a>` : esc(v)}</b></div>` : '');
    return `<section class="contact"><div class="w"><div><p class="ochi">${esc(E.contact)}</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${esc(C.titlu || E.contact)}</h1><div class="lead"><p>${nl(C.text || '')}</p></div><p style="margin-top:26px">${buton()}</p></div><div class="date">${rand('Telefon', ct.telefon, ct.telefon ? `tel:${cifre(ct.telefon)}` : '')}${rand('Email', ct.email, ct.email ? `mailto:${ct.email}` : '')}${rand('Adresă', ct.adresa, ct.adresa ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ct.adresa)}` : '')}${rand('Program', ct.program)}${modPrev && Array.isArray(c.lipsesc) && c.lipsesc.length ? `<p class="lipsa">Mai lipsesc: ${esc(c.lipsesc.join(', '))}. Le punem pe site în ziua în care le primim de la tine.</p>` : ''}</div></div></section>`;
  };

  const subsol = `<footer><div class="w"><span>© ${new Date().getFullYear()} ${esc(firma)}${ct.adresa ? ` · ${esc(ct.adresa)}` : ''}</span><span>${ct.telefon ? `<a href="tel:${esc(cifre(ct.telefon))}">${esc(ct.telefon)}</a>` : ''}${ct.telefon && ct.email ? ' · ' : ''}${ct.email ? `<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>` : ''}</span></div></footer>`;
  const corp = { acasa: pgAcasa, servicii: pgServicii, despre: pgDespre, contact: pgContact };

  const cap = (meta, extra = '') => `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${modPrev ? '<meta name="robots" content="noindex, nofollow">' : ''}
<title>${esc(meta.titlu)}</title>
<meta name="description" content="${esc(meta.descriere)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${N.fonturi}&display=swap" rel="stylesheet">
<style>${css(N)}</style>${extra}
</head>`;

  if (!modPrev) {
    const [k, n] = PAGINI.find((p) => p[0] === (opt.pagina || 'acasa')) || PAGINI[0];
    const meta = metaPentru(c.pagini, k, n, site, firma);
    return `${cap(meta)}<body>${nav(k)}<main>${corp[k]()}</main>${subsol}</body></html>`;
  }
  // previzualizare: toate paginile într-un singur document; se vede una, după #hash (id-urile sunt „pg-…”, ca browserul să nu sară la ancoră sub antetul lipicios); fără JS se văd toate, în ordine
  const meta = metaPentru(c.pagini, 'acasa', 'Acasă', site, firma);
  const js = `<script>(function(){var P=${JSON.stringify(PAGINI.map((p) => p[0]))};function arata(){var h=(location.hash||'#acasa').slice(1);if(P.indexOf(h)<0)h='acasa';P.forEach(function(k){var el=document.getElementById('pg-'+k);if(el)el.style.display=k===h?'block':'none';});document.querySelectorAll('.nav a').forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+h);});window.scrollTo(0,0);}window.addEventListener('hashchange',arata);arata();})();</script>`;
  const bara = `<div class="prev-bara"><span><b>Previzualizare</b><span class="lung"> · așa arată site-ul tău cu textele de acum, pe șablonul „${esc(N.nume)}”. Pozele se pun la final.</span></span>${opt.inapoi ? `<a href="${esc(opt.inapoi)}">Înapoi la spațiul tău</a>` : ''}</div>`;
  return `${cap(meta)}<body>${bara}${nav('acasa')}<main>${PAGINI.map(([k]) => `<div class="pg" id="pg-${k}">${corp[k]()}</div>`).join('')}</main>${subsol}${js}</body></html>`;
}

// paginile statice pentru găzduire: [{ cale: 'index.html' | 'servicii/index.html' …, html }]
export function paginiStatice(piesa, dosar, opt = {}) {
  return PAGINI.map(([k, , slug]) => ({ cale: slug ? `${slug}/index.html` : 'index.html', html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: k }) }));
}
