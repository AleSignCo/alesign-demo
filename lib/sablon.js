// Șabloanele de nișă pentru site-urile clienților (Linia „Website”): aceeași hartă fixă de secțiuni (continut.site din botul website v4),
// șase înfățișări — cabinet, salon, centru (spa/wellness), local (restaurant/cafenea), atelier/studio, afacere (generic/B2B).
// Un singur modul face trei lucruri: (1) previzualizarea din spațiul clientului (/s/<token>/site/<id>), (2) paginile statice pentru găzduire
// (Vercel, decizia 3), (3) fragmentele HTML+CSS pe secțiune pentru Webflow (conectorul inserează WHTML într-un site gol).
// Niciun text nu vine din șablon: tot ce e scris pe site e din continut.site (aprobat de Alexandru și de client). Șablonul doar așază.

// Valul 0 din Bot Website v5.1 (13 oct. 2026): F2 (tel:+40, wa.me/40), A7 (f\u0103r\u0103 \u201eNumele firmei\u201d), S2 (h2 la servicii), AC1 (accentul Salon),
// AC2/AC6/AC12 (focus, mi\u0219care redus\u0103, \u201eSari la con\u021binut\u201d), C2/C3 (spa\u021biu nedesp\u0103r\u021bit, ghilimele \u201e\u2026\u201d, linie de interval), C8 (tu / dumneavoastr\u0103),
// AC7 (alt din Dosar), P10 (poza LCP prioritar\u0103), S3/S5/S7 (JSON-LD, canonical, Open Graph), L3 (fonturi de pe domeniul site-ului), L4 (date legale).
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// textul vizibil (nu atributele): tipografia rom\u00e2neasc\u0103 aplicat\u0103 la randare, f\u0103r\u0103 s\u0103 schimbe cuvintele
const UNIT = 'RON|lei|EUR|euro|\u20ac|%|min|minute|ore|h|km|m|cm|mm|kg|g|ml|l|mp|m\u00b2|zile|luni|ani|s\u0103pt\u0103m\u00e2ni';
export const tx = (s) => esc(s)
  .replace(new RegExp(`(\\d)[ \\t]+(${UNIT})(?![\\p{L}\\d])`, 'gu'), '$1&nbsp;$2')
  .replace(/\b(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})\b/g, '$1\u2013$2')
  .replace(new RegExp(`\\b(\\d{1,3})-(\\d{1,3})(?=(?:\\s|&nbsp;)*(?:${UNIT})(?![\\p{L}\\d]))`, 'gu'), '$1\u2013$2')
  .replace(/&quot;([^&\n]{1,200}?)&quot;/g, '\u201e$1\u201d')
  .replace(/(\p{L})'(\p{L})/gu, '$1\u2019$2');
const nl = (s) => tx(s).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// markdown simplu (## titlu, ### subtitlu, - listă, **bold**) pentru paginile în plus, Migrare și Landing; totul trece prin tx() (escapare + tipografie)
export function mdHtml(t) {
  const inl = (x) => tx(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const out = []; let li = null; let par = [];
  const inchide = () => { if (par.length) { out.push(`<p>${par.map(inl).join('<br>')}</p>`); par = []; } };
  String(t || '').replace(/\r/g, '').split('\n').forEach((l) => {
    if (/^\s*[-•]\s+/.test(l)) { inchide(); if (!li) { li = []; out.push(li); } li.push(`<li>${inl(l.replace(/^\s*[-•]\s+/, ''))}</li>`); return; }
    li = null;
    if (/^###\s+/.test(l)) { inchide(); out.push(`<h3>${inl(l.replace(/^###\s+/, ''))}</h3>`); }
    else if (/^#{1,2}\s+/.test(l)) { inchide(); out.push(`<h2>${inl(l.replace(/^#{1,2}\s+/, ''))}</h2>`); }
    else if (l.trim()) par.push(l.trim()); else inchide();
  });
  inchide();
  return out.map((x) => (Array.isArray(x) ? `<ul>${x.join('')}</ul>` : x)).join('');
}
// paginile în plus (Pagină în plus, Migrare): site.extra.<slug> = { titlu, text, redirect_de_la }; cel mult 20, slug fără diacritice (S6)
export function paginiExtra(piesa) {
  const x = piesa && piesa.site && piesa.site.extra;
  if (!x || typeof x !== 'object' || Array.isArray(x)) return [];
  return Object.entries(x).filter(([slug, p]) => /^[a-z0-9][a-z0-9-]{0,60}$/.test(slug) && !['servicii', 'despre', 'contact', 'multumim', '404', '_f', 'img', '_alesign'].includes(slug) && p && (p.titlu || p.text)).slice(0, 20)
    .map(([slug, p]) => [`x-${slug}`, String(p.titlu || slug), slug, p]);
}
// Landing (harta de landing): o pagină, o acțiune, data de expirare a ofertei
export const eLanding = (piesa) => !!(piesa && !piesa.site && (piesa.oferta_expira_la || piesa.cta));
// F2: un singur format de num\u0103r pentru tel: \u0219i WhatsApp, cu prefixul \u021b\u0103rii (+40 / 40), oricum l-a scris clientul
export function telIntl(s) {
  let n = String(s || '').replace(/[^\d+]/g, '');
  if (!n) return '';
  if (n.startsWith('00')) n = '+' + n.slice(2);
  if (n.startsWith('+')) return n;
  if (n.startsWith('40') && n.length === 11) return '+' + n;
  if (n.startsWith('0')) return '+40' + n.slice(1);
  if (/^[237]\d{8}$/.test(n)) return '+40' + n;
  return n;
}
const waNr = (s) => telIntl(s).replace(/^\+/, '');

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
    local: [['fraunces', 'Fraunces', [500, 600]], ['inter', 'Inter', [400, 500, 600]]],
  },
  salon: {
    nume: 'Salon', fonturi: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@400;500;600', titlu: "'Cormorant Garamond', Georgia, serif", corp: "Jost, system-ui, sans-serif",
    culori: { fundal: '#fbf7f3', suprafata: '#ffffff', cerneala: '#2b211e', mut: '#7a6a63', linie: '#eadfd7', accent: '#a8594b', accentText: '#ffffff', moale: '#f3e6df', erou: 'linear-gradient(160deg,#f1dfd6,#f8efe9)' },
    raza: '22px', razaB: '40px', erou: 'centrat', etichete: { de_ce: 'Ce ne deosebește', servicii: 'Servicii', cum: 'Cum decurge o vizită', intrebari: 'Întrebări', contact: 'Rezervări' },
    local: [['cormorant-garamond', 'Cormorant Garamond', [500, 600], [500]], ['jost', 'Jost', [400, 500, 600]]],
  },
  centru: {
    nume: 'Centru', fonturi: 'family=Forum&family=Manrope:wght@400;500;600;700', titlu: "'Forum', Georgia, serif", corp: "Manrope, system-ui, sans-serif",
    culori: { fundal: '#f4f3ee', suprafata: '#fbfaf6', cerneala: '#1e2a26', mut: '#66706b', linie: '#e1e3da', accent: '#4e6b5b', accentText: '#ffffff', moale: '#e6e9df', erou: 'linear-gradient(150deg,#dfe4d7,#eef0e8)' },
    raza: '26px', razaB: '40px', erou: 'centrat', etichete: { de_ce: 'De ce aici', servicii: 'Ce oferim', cum: 'Cum decurge', intrebari: 'Întrebări', contact: 'Programări' },
    local: [['forum', 'Forum', [400]], ['manrope', 'Manrope', [400, 500, 600, 700]]],
  },
  local: {
    nume: 'Local', fonturi: 'family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;500;600', titlu: "'Playfair Display', Georgia, serif", corp: "'Source Sans 3', system-ui, sans-serif",
    culori: { fundal: '#1b1714', suprafata: '#262019', cerneala: '#f3ebdd', mut: '#b9ac99', linie: '#3a322a', accent: '#d9a24a', accentText: '#1b1714', moale: '#2f2820', erou: 'linear-gradient(135deg,#3a2d20,#1f1915)' },
    raza: '8px', razaB: '6px', erou: 'plin', etichete: { de_ce: 'De ce aici', servicii: 'Ce găsești la noi', cum: 'Cum decurge', intrebari: 'Întrebări', contact: 'Rezervări' },
    local: [['playfair-display', 'Playfair Display', [500, 600], [500]], ['source-sans-3', 'Source Sans 3', [400, 500, 600]]],
  },
  atelier: {
    nume: 'Atelier', fonturi: 'family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500', titlu: "'Space Grotesk', system-ui, sans-serif", corp: "Inter, system-ui, sans-serif",
    culori: { fundal: '#ffffff', suprafata: '#f6f6f4', cerneala: '#0b0b0c', mut: '#5c5c5a', linie: '#e4e4e0', accent: '#0b0b0c', accentText: '#f5c400', moale: '#f5c400', erou: 'linear-gradient(135deg,#ededea,#f9f9f7)' },
    raza: '0px', razaB: '0px', erou: 'split', etichete: { de_ce: 'De ce noi', servicii: 'Ce facem', cum: 'Cum lucrăm', intrebari: 'Întrebări', contact: 'Scrie-ne' },
    local: [['space-grotesk', 'Space Grotesk', [500, 600, 700]], ['inter', 'Inter', [400, 500]]],
  },
  afacere: {
    nume: 'Afacere', fonturi: 'family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500', titlu: "Manrope, system-ui, sans-serif", corp: "Inter, system-ui, sans-serif",
    culori: { fundal: '#f5f7fb', suprafata: '#ffffff', cerneala: '#0f1b33', mut: '#5a6478', linie: '#dfe4ee', accent: '#1e4fd8', accentText: '#ffffff', moale: '#e4eafb', erou: 'linear-gradient(135deg,#dde5f8,#eef2fb)' },
    raza: '12px', razaB: '10px', erou: 'split', etichete: { de_ce: 'De ce noi', servicii: 'Servicii', cum: 'Cum lucrăm', intrebari: 'Întrebări frecvente', contact: 'Contact' },
    local: [['manrope', 'Manrope', [500, 600, 700, 800]], ['inter', 'Inter', [400, 500]]],
  },
};

// L3: pe site-ul publicat fonturile vin de pe domeniul site-ului (ruta /_f a găzduirii), nu de la Google; aceleași familii, subseturile latin + latin-ext
const RANGE = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
};
export function fisiereFont(N) {
  const out = [];
  for (const [id, fam, w, wi] of N.local || []) {
    for (const [st, lista] of [['normal', w || []], ['italic', wi || []]]) for (const g of lista) for (const sub of ['latin', 'latin-ext']) out.push({ id, fam, g, st, sub, fisier: `${sub}-${g}-${st}.woff2` });
  }
  return out;
}
export const FONTURI_PERMISE = new Set(Object.values(NISE).flatMap((N) => fisiereFont(N).map((f) => `${f.id}/${f.fisier}`)));
function fontFace(N, cale) {
  return fisiereFont(N).map((f) => `@font-face{font-family:'${f.fam}';font-style:${f.st};font-weight:${f.g};font-display:swap;src:url(${cale}/${f.id}/${f.fisier}) format('woff2');unicode-range:${RANGE[f.sub]}}`).join('\n');
}

// C8: etichetele șablonului urmează adresarea din Dosar · Brand (tu sau dumneavoastră); textele botului vin deja în adresarea aleasă
const DVS = { 'Scrie-ne': 'Scrieți-ne', 'Ce găsești la noi': 'Ce găsiți la noi' };
function eticheteFormale(E, formal) { if (!formal) return E; const o = {}; for (const [k, v] of Object.entries(E)) o[k] = DVS[v] || v; return o; }

// S3: subtipul schema.org din nișă (LocalBusiness e rezerva)
export function tipSchema(identitate) {
  const t = `${(identitate && identitate.nisa) || ''} ${(identitate && identitate.firma) || ''}`.toLowerCase();
  if (/dental|dentar|stomato/.test(t)) return 'Dentist';
  if (/veterinar/.test(t)) return 'VeterinaryCare';
  if (/cabinet|medical|clinic|kineto|fizio|psiho/.test(t)) return 'MedicalBusiness';
  if (/frizer|barber|coafor/.test(t)) return 'HairSalon';
  if (/nail|unghii/.test(t)) return 'NailSalon';
  if (/salon|beauty|cosmetic|estetic|lash|brow/.test(t)) return 'BeautySalon';
  if (/spa|masaj|sauna/.test(t)) return 'DaySpa';
  if (/wellness|yoga|pilates/.test(t)) return 'HealthAndBeautyBusiness';
  if (/cafenea|cafe/.test(t)) return 'CafeOrCoffeeShop';
  if (/brutar|patiser|cofet/.test(t)) return 'Bakery';
  if (/\bbar\b|pub/.test(t)) return 'BarOrPub';
  if (/winery|cram/.test(t)) return 'Winery';
  if (/restaurant|bistro|pizzer/.test(t)) return 'Restaurant';
  if (/contabil/.test(t)) return 'AccountingService';
  if (/avocat|juridic/.test(t)) return 'LegalService';
  if (/consult/.test(t)) return 'ProfessionalService';
  return 'LocalBusiness';
}

// CSS-ul comun, cu variabilele nișei; fără JS pe site-ul real (previzualizarea are 20 de linii pentru schimbat pagina)
function css(N) {
  const c = N.culori;
  return `
:root{--fundal:${c.fundal};--suprafata:${c.suprafata};--cerneala:${c.cerneala};--mut:${c.mut};--linie:${c.linie};--accent:${c.accent};--accent-text:${c.accentText};--moale:${c.moale};--erou:${c.erou};--raza:${N.raza};--raza-b:${N.razaB || N.raza}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--fundal);color:var(--cerneala);font-family:${N.corp};line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
a:focus-visible,summary:focus-visible{outline:2px solid var(--cerneala);outline-offset:3px;border-radius:4px}
.b:focus-visible{outline:2px solid var(--cerneala);outline-offset:3px}
.cta .b:focus-visible{outline-color:var(--fundal)}
.sari{position:absolute;left:12px;top:-60px;z-index:50;background:var(--cerneala);color:var(--fundal);padding:10px 16px;border-radius:8px;font-weight:600}
.sari:focus{top:12px}
img{max-width:100%;display:block}
h1,h2,h3,.tf{font-family:${N.titlu};font-weight:600;line-height:1.08;letter-spacing:-0.012em}
.w{width:min(1120px,100% - 40px);margin:0 auto}
.sus{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--fundal) 88%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--linie)}
.sus .w{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.marca{display:flex;align-items:center;gap:12px;font-weight:700;font-size:17px;letter-spacing:-0.01em}
.marca img{height:36px;width:auto}
.nav{display:flex;align-items:center;gap:24px;font-size:14.5px;color:var(--mut)}
.nav a{padding:8px 0}
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
.md h2{font-size:clamp(22px,2.6vw,28px);margin:26px 0 10px;color:var(--cerneala)}.md h3{font-size:19px;margin:20px 0 8px;color:var(--cerneala)}.md ul{margin:8px 0 12px 20px}.md li{margin:4px 0}.md p{margin:0 0 12px}
.expira{margin-top:14px;font-size:14px;color:var(--mut)}
.pagini-extra{border-top:1px solid var(--linie);padding:16px 0;font-size:13.5px}.pagini-extra .w{display:flex;flex-wrap:wrap;gap:6px 18px}.pagini-extra a{color:var(--mut);min-height:24px;display:inline-flex;align-items:center}
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
.c h3,.c .t3{font-size:21px;margin-bottom:8px}
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
.form{margin-top:30px;display:grid;gap:14px;max-width:520px}.form label{display:grid;gap:6px;font-size:14px;font-weight:600}.form input,.form textarea,.form select{font:inherit;font-size:16px;font-weight:400;color:var(--cerneala);background:var(--suprafata);border:1.5px solid var(--linie);border-radius:10px;padding:11px 13px;width:100%}.form input:focus-visible,.form textarea:focus-visible,.form select:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.form .acord{display:flex;gap:10px;align-items:flex-start;font-weight:400;color:var(--mut)}.form .acord input{width:auto;margin-top:4px}.form .acord a{text-decoration:underline}.form .nota{font-size:13.5px;color:var(--mut);margin:0}.form .capcana{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.form button{justify-self:start;cursor:pointer}.form .avert{font-size:14px;border-left:3px solid var(--accent);padding:4px 0 4px 12px;margin:0}
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
footer a,.date a,.form .acord a{display:inline-block;min-height:24px;line-height:24px}
.pg{display:block}
main{min-height:calc(100vh - 220px)}
.lipsa{margin-top:28px;padding:14px 16px;border:1px dashed var(--linie);border-radius:var(--raza);font-size:13.5px;color:var(--mut)}
.prev-bara{position:static;background:#0c0c0d;color:#f4f1ea;font:500 13px/1.4 Manrope,system-ui,sans-serif;padding:10px 20px;display:flex;justify-content:space-between;gap:16px;align-items:center}
.prev-bara a{color:#f4f1ea;text-decoration:underline;text-underline-offset:3px}
.prev-bara b{color:#ff2a2e}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{transition:none!important;animation:none!important}}
@media(orientation:landscape) and (max-height:500px){.erou{padding:20px 0 24px}.erou h1{font-size:30px;margin-bottom:8px}.erou .sub{font-size:16px;margin-bottom:12px}.erou .poza{display:none}.erou.plin .poza{display:flex;min-height:0}.erou.plin .text{padding:24px 0}.sus .w{height:52px}}
@media(max-width:900px){.erou .w,.despre .w,.contact .w{grid-template-columns:1fr;gap:28px}.g3,.g2,.pasi{grid-template-columns:1fr 1fr}.sus .w{height:60px}.nav{gap:14px;font-size:13.5px;overflow:auto}.sus .b{display:none}.nav .b{display:inline-flex}}
@media(max-width:600px){.prev-bara .lung{display:none}.g3,.g2,.pasi{grid-template-columns:1fr}section{padding:52px 0}.erou{padding:36px 0 48px}.erou.plin .poza{min-height:70vh}.w{width:min(1120px,100% - 32px)}}
`;
}

// datele de contact afișate: din harta site-ului (acasa.contact / contact), completate din dosar; niciun placeholder
function contactDin(site, dosar) {
  const a = (site && site.contact) || {}; const b = (site && site.acasa && site.acasa.contact) || {}; const d = dosar || {};
  const ia = (k) => String(a[k] || b[k] || d[k] || '').trim();
  // programarea prin link (Website nou): pagina de programări a clientului, din Dosar · Identitate.programare_url (doar https); la `medical`, RG3 cere aplicația clinicii
  const prog = String((d.identitate && d.identitate.programare_url) || d.programare_url || '').trim();
  return { telefon: ia('telefon'), email: ia('email'), adresa: ia('adresa'), program: ia('program'), programare: /^https:\/\/[^\s"'<>]+$/.test(prog) ? prog : '' };
}

// butonul unic al site-ului: ținta după tip (telefon / WhatsApp / pagina de contact); numerele mereu cu +40 (F2)
function indemnLink(indemn, ct, modPrev, slugContact) {
  const tip = String((indemn && indemn.tip) || '').toLowerCase(); const tinta = String((indemn && indemn.tinta) || '').trim();
  if (tip === 'telefon' && (tinta || ct.telefon)) return `tel:${telIntl(tinta || ct.telefon)}`;
  if (tip === 'whatsapp') { if (/^https?:/.test(tinta)) return tinta; const n = waNr(tinta || ct.telefon); if (n) return `https://wa.me/${n}`; }
  if (tip === 'programare' && (/^https:/.test(tinta) || ct.programare)) return /^https:/.test(tinta) ? tinta : ct.programare;
  if (/^https?:/.test(tinta)) return tinta;
  if (/^mailto:|@/.test(tinta)) return tinta.startsWith('mailto:') ? tinta : `mailto:${tinta}`;
  return modPrev ? `#${slugContact}` : `/${slugContact}`;
}

// pozele vin ca URL sau ca { url, alt }; alt-ul e descrierea din Dosar (AC7), gol doar la pozele decorative; poza din erou e LCP (P10)
const normPoza = (p) => (p && typeof p === 'object' ? { url: String(p.url || ''), alt: String(p.alt || ''), w: Number(p.w) || 0, h: Number(p.h) || 0, srcset: String(p.srcset || '') } : { url: String(p || ''), alt: '', w: 0, h: 0, srcset: '' });
function poza(p, brief, modPrev, lcp = false) {
  const x = p ? normPoza(p) : { url: '', alt: '' };
  const atr = lcp ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"';
  const dim = (x.w && x.h ? ` width="${x.w}" height="${x.h}"` : '') + (x.srcset ? ` srcset="${esc(x.srcset)}" sizes="${lcp ? '(max-width: 900px) 100vw, 50vw' : '(max-width: 900px) 100vw, 45vw'}"` : '');
  return `<div class="poza">${x.url ? `<img src="${esc(x.url)}" alt="${esc(x.alt)}"${dim}${atr}>` : ''}${!x.url && modPrev && brief ? `<div class="brief">Poză: ${esc(brief)}</div>` : ''}</div>`;
}

// paginile fixe ale șablonului; meta vine din continut.pagini (dacă botul le-a potrivit după nume), altfel din harta site-ului
const PAGINI = [['acasa', 'Acasă', ''], ['servicii', 'Servicii', 'servicii'], ['despre', 'Despre', 'despre'], ['contact', 'Contact', 'contact']];
function metaPentru(pagini, cheie, nume, site, firma) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const p = (Array.isArray(pagini) ? pagini : []).find((x) => x && (norm(x.pagina).includes(norm(nume)) || (cheie === 'acasa' && String(x.slug || '').trim() === '/') || norm(x.slug || '').replace(/\//g, '') === String(cheie).replace(/^x-/, '')));
  const t = p && p.meta_titlu ? p.meta_titlu : (cheie === 'acasa' ? `${firma}` : (firma ? `${nume} · ${firma}` : nume));
  const d = p && p.meta_descriere ? p.meta_descriere : String((site && site.acasa && site.acasa.inceput && site.acasa.inceput.subtitlu) || '').slice(0, 155);
  return { titlu: t, descriere: d };
}

// datele legale ale firmei (L4) și legătura ANPC SAL (L6): din Dosar · Identitate; fără ele, nimic inventat
function legalDin(d) {
  const i = d.identitate || {}; const l = d.legal || {};
  const ia = (k, k2) => String(l[k] || i[k2 || k] || '').trim();
  return { denumire: ia('denumire', 'denumire_legala'), cui: ia('cui'), reg_com: ia('reg_com'), sediu: ia('sediu'), b2c: l.b2c !== false && i.b2c !== false };
}

// ce lipsește pentru formular (L5): politica de confidențialitate a clientului; se cere în Materiale, nu oprește publicarea
export function lipsuriFormular(dosar) {
  const d = dosar || {}; const i = d.identitate || {};
  const politica = String(d.politica_url || (d.legal && d.legal.politica_url) || i.politica_url || i.politica_confidentialitate || '').trim();
  return /^https?:\/\//i.test(politica) ? [] : ['politica de confidențialitate (linkul ei), ca să punem formularul pe site'];
}

// ce lipsește ca să publicăm un site (A7): nimic nu se umple cu text de rezervă
export function lipsuriStatic(piesa, dosar) {
  const d = dosar || {}; const site = (piesa && piesa.site) || null; const out = [];
  if (eLanding(piesa)) { if (!piesa.oferta_expira_la) out.push('data de expirare a ofertei'); if (!piesa.titlu) out.push('titlul ofertei'); }
  else if (!site || typeof site !== 'object') out.push('textele site-ului');
  if (!String(d.firma || (d.identitate && d.identitate.firma) || '').trim()) out.push('numele firmei');
  const ct = contactDin(site || {}, { telefon: d.telefon, email: d.email });
  if (!ct.telefon && !ct.email) out.push('un telefon sau un email');
  return out;
}

/**
 * randeazaSite(piesa, dosar, opt)
 *  piesa: continut-ul sarcinii website/refresh v4 (site, pagini, indemn, poze, lipsesc)
 *  dosar: { firma, nisa, identitate, legal, adresare: 'tu'|'dumneavoastra', logo_url, poze: [url | {url, alt}], telefon, email, adresa, program }
 *  opt:   { mod: 'preview' | 'static', inapoi: url (preview), nisa: cheie forțată, pagina: 'acasa'|'servicii'|'despre'|'contact' (static),
 *           baza: 'https://domeniu' (static: canonical, og:url, JSON-LD), fonturi: '/_f' (static: fonturile de pe domeniul site-ului; null = Google), og_imagine: URL absolut }
 * Întoarce un document HTML complet. În modul static, fără numele firmei aruncă o eroare cu cod LIPSA (nu publicăm „Numele firmei”).
 */
export function randeazaSite(piesa, dosar, opt = {}) {
  const c = piesa || {}; const site = c.site || {}; const d = dosar || {};
  const LND = eLanding(c);
  const cheie = NISE[opt.nisa] ? opt.nisa : nisaDin({ nisa: d.nisa || (d.identitate && d.identitate.nisa), firma: d.firma || (d.identitate && d.identitate.firma) });
  const N = NISE[cheie];
  const formal = /dumneavoastr|formal/i.test(String(d.adresare || (d.brand && d.brand.adresare) || site.adresare || ''));
  const E = eticheteFormale(N.etichete, formal);
  const suna = formal ? 'sau sunați:' : 'sau sună:';
  const t2 = (tu, dvs) => tx(formal ? dvs : tu);
  const modPrev = opt.mod !== 'static';
  const firma = String(d.firma || (d.identitate && d.identitate.firma) || '').trim();
  if (!modPrev && !firma) { const e = new Error('lipsește numele firmei'); e.cod = 'LIPSA'; e.lipsesc = ['numele firmei']; throw e; }
  const ct = contactDin(site, { telefon: d.telefon, email: d.email, adresa: d.adresa, program: d.program, identitate: d.identitate });
  // Landing (F9): o singură țintă; „formular” (sau nimic) = formularul de pe pagină, dacă există politica clientului; altfel telefonul
  const politica0 = String(d.politica_url || (d.legal && d.legal.politica_url) || (d.identitate && (d.identitate.politica_url || d.identitate.politica_confidentialitate)) || '').trim();
  const lndT = LND ? String((c.cta && c.cta.tinta) || '').trim() : '';
  const lndForm = LND && (!lndT || /^#?formular$/i.test(lndT)) && /^https?:\/\//i.test(politica0) && (!!opt.formular || modPrev);
  const lndExpirat = LND && (!!opt.retras || (!!c.oferta_expira_la && String(opt.azi || new Date().toISOString().slice(0, 10)) > String(c.oferta_expira_la).slice(0, 10)));
  const indemn = LND ? { text: (c.cta && c.cta.text) || '', tinta: /^#?formular$/i.test(lndT) ? '' : lndT, tip: /^(tel:|\+?[\d][\d\s().-]{7,}$)/.test(lndT) ? 'telefon' : (/wa\.me|whatsapp/i.test(lndT) ? 'whatsapp' : '') } : (c.indemn || {});
  const btText = String(indemn.text || (site.acasa && site.acasa.inceput && site.acasa.inceput.buton) || E.contact).trim();
  const href = lndForm ? '#formular' : (LND && !indemn.tinta ? (ct.telefon ? `tel:${telIntl(ct.telefon)}` : '#formular') : indemnLink(indemn, ct, modPrev, 'contact'));
  const poze = Array.isArray(d.poze) ? d.poze.filter((p) => normPoza(p).url) : [];
  const briefs = Array.isArray(c.poze) ? c.poze : [];
  const briefPt = (pg, sec) => { const b = briefs.find((x) => x && new RegExp(sec, 'i').test(String(x.sectiune || '') + ' ' + String(x.pagina || ''))) || briefs.find((x) => x && new RegExp(pg, 'i').test(String(x.pagina || ''))); return b ? b.brief : ''; };
  const A = site.acasa || {}; const S = site.servicii || {}; const D = site.despre || {}; const C = site.contact || {};
  const lnk = (k) => { const pg = (typeof PG !== 'undefined' ? PG : PAGINI).find((p) => p[0] === k); return modPrev ? `#${k}` : (k === 'acasa' ? '/' : `/${pg ? pg[2] : k}`); };
  const buton = (cls = '') => `<a class="b ${cls}" href="${esc(href)}"${ct.programare && href === ct.programare ? ' data-m="prog"' : ''}>${tx(btText)}</a>`;
  const lipsesc = [...(Array.isArray(c.lipsesc) ? c.lipsesc : []), ...(firma ? [] : ['numele firmei'])];
  const EXTRA = paginiExtra(c); const PG = [...PAGINI, ...EXTRA.map((p) => p.slice(0, 3))];
  const inMeniu = EXTRA.length <= 2 ? EXTRA : [];  // paginile în plus intră în meniu; la Migrare (multe pagini) stau în subsol și în sitemap

  const nav = (activ) => LND ? `<a class="sari" href="#continut">Sari la conținut</a><header class="sus"><div class="w"><span class="marca">${d.logo_url ? `<img src="${esc(d.logo_url)}" alt="${esc(firma)}" height="36">` : tx(firma)}</span>${lndExpirat ? '' : buton('mic')}</div></header>` : `<a class="sari" href="#continut">Sari la conținut</a><header class="sus"><div class="w"><a class="marca" href="${lnk('acasa')}">${d.logo_url ? `<img src="${esc(d.logo_url)}" alt="${esc(firma)}" height="36">` : tx(firma)}</a><nav class="nav" aria-label="Meniu">${[...PAGINI, ...inMeniu].map(([k, n]) => `<a href="${lnk(k)}" class="${k === activ ? 'on' : ''}"${k === activ ? ' aria-current="page"' : ''}>${esc(n)}</a>`).join('')}${buton('mic')}</nav>${buton('mic')}</div></header>`;

  const pgAcasa = () => {
    const I = A.inceput || {}; const dc = A.de_ce || {}; const sv = A.servicii || {}; const cd = A.cum_decurge || {}; const ds = A.despre_scurt || {}; const iq = Array.isArray(A.intrebari) ? A.intrebari : []; const ac = A.contact || {};
    const p0 = poze[0] ? normPoza(poze[0]) : null;
    const erou = N.erou === 'plin'
      ? `<section class="erou plin"><div class="w"><div class="poza">${p0 ? `<img src="${esc(p0.url)}" alt="${esc(p0.alt)}" fetchpriority="high" decoding="async">` : ''}<div class="text"><h1 style="color:#fff">${tx(I.titlu || firma)}</h1><p class="sub" style="color:rgba(255,255,255,.82)">${tx(I.subtitlu || '')}</p><div class="act">${buton()}${ct.telefon ? `<span class="alt" style="color:rgba(255,255,255,.75)">${suna} ${tx(ct.telefon)}</span>` : ''}</div></div></div></div></section>`
      : `<section class="erou ${N.erou}"><div class="w"><div><h1>${tx(I.titlu || firma)}</h1><p class="sub">${tx(I.subtitlu || '')}</p><div class="act">${buton()}${ct.telefon ? `<span class="alt">${suna} ${tx(ct.telefon)}</span>` : ''}</div></div>${N.erou === 'centrat' && !poze[0] && !modPrev ? '' : poza(poze[0], briefPt('Acas', 'Încep|Inceput|erou|hero'), modPrev, true)}</div></section>`;
    const deCe = Array.isArray(dc.puncte) && dc.puncte.length ? `<section><div class="w"><p class="ochi">${tx(E.de_ce)}</p><h2 class="h2">${tx(dc.titlu || E.de_ce)}</h2><div class="g3">${dc.puncte.slice(0, 6).map((p, i) => `<div class="c"><div class="nr" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div><h3>${tx(p.titlu || '')}</h3><p>${tx(p.text || '')}</p></div>`).join('')}</div></div></section>` : '';
    const serv = Array.isArray(sv.lista) && sv.lista.length ? `<section><div class="w"><p class="ochi">${tx(E.servicii)}</p><h2 class="h2">${tx(sv.titlu || E.servicii)}</h2><div class="g3">${sv.lista.slice(0, 6).map((s) => `<div class="c"><h3>${tx(s.nume || '')}</h3><p>${tx(s.text || '')}</p></div>`).join('')}</div><p style="margin-top:24px"><a class="b gol" href="${lnk('servicii')}">Toate serviciile</a></p></div></section>` : '';
    const cum = Array.isArray(cd.pasi) && cd.pasi.length ? `<section><div class="w"><p class="ochi">${tx(E.cum)}</p><h2 class="h2">${tx(cd.titlu || E.cum)}</h2><div class="pasi">${cd.pasi.slice(0, 4).map((p) => `<div class="pas"><h3>${tx(p.titlu || '')}</h3><p>${tx(p.text || '')}</p></div>`).join('')}</div></div></section>` : '';
    const despre = ds.text ? `<section class="despre"><div class="w">${poza(poze[1], briefPt('Acas', 'Despre'), modPrev)}<div><p class="ochi">Despre</p><h2 class="h2">${tx(ds.titlu || 'Despre noi')}</h2><div class="lead"><p>${nl(ds.text)}</p></div><p style="margin-top:22px"><a class="b gol" href="${lnk('despre')}">Povestea noastră</a></p></div></div></section>` : '';
    const faq = iq.length ? `<section><div class="w"><p class="ochi">${tx(E.intrebari)}</p><h2 class="h2">${tx(E.intrebari)}</h2><div class="faq">${iq.slice(0, 6).map((q) => `<details><summary>${tx(q.q || '')}</summary><p>${tx(q.a || '')}</p></details>`).join('')}</div></div></section>` : '';
    const contact = `<section class="cta"><div class="w"><h2>${tx(ac.titlu || C.titlu || E.contact)}</h2><p>${tx(ac.text || C.text || '')}</p>${buton()}</div></section>`;
    return erou + deCe + serv + cum + despre + faq + contact;
  };

  // S2: pe pagina Servicii titlurile coboară h1 → h2 (aceeași mărime vizuală ca înainte)
  const pgServicii = () => {
    const intro = S.intro || {}; const lista = Array.isArray(S.lista) ? S.lista : [];
    return `<section class="erou" style="padding-bottom:24px"><div class="w" style="grid-template-columns:1fr"><div><p class="ochi">${tx(E.servicii)}</p><h1 style="font-size:clamp(32px,4.6vw,52px)">${tx(intro.titlu || E.servicii)}</h1><p class="sub">${tx(intro.text || '')}</p></div></div></section>` +
      `<section style="border-top:0;padding-top:0"><div class="w"><div class="g2" style="margin-top:0">${lista.map((s) => `<div class="c" id="${slugify(s.nume)}"><h2 class="t3">${tx(s.nume || '')}</h2><p>${nl(s.text || '')}</p>${s.pret ? `<p class="pret">${tx(s.pret)}</p>` : ''}</div>`).join('')}</div></div></section>` +
      `<section class="cta"><div class="w"><h2>${tx(C.titlu || E.contact)}</h2><p>${tx(C.text || '')}</p>${buton()}</div></section>`;
  };

  const pgDespre = () => {
    const pv = D.povestea || {}; const cl = D.cum_lucram || {}; const cc = D.cu_cine || {};
    return `<section class="despre"><div class="w"><div><p class="ochi">Despre</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${tx(pv.titlu || 'Povestea noastră')}</h1><div class="lead"><p>${nl(pv.text || '')}</p></div></div>${poza(poze[1] || poze[0], briefPt('Despre', 'Poveste|Despre|echip'), modPrev, true)}</div></section>` +
      (Array.isArray(cl.puncte) && cl.puncte.length ? `<section><div class="w"><p class="ochi">${tx(E.cum)}</p><h2 class="h2">${tx(cl.titlu || E.cum)}</h2><div class="g3">${cl.puncte.slice(0, 6).map((p) => `<div class="c"><h3>${tx(p.titlu || '')}</h3><p>${tx(p.text || '')}</p></div>`).join('')}</div></div></section>` : '') +
      (cc.text ? `<section><div class="w"><p class="ochi">Pentru cine</p><h2 class="h2">${tx(cc.titlu || 'Cu cine lucrăm')}</h2><div class="lead"><p>${nl(cc.text)}</p></div></div></section>` : '') +
      `<section class="cta"><div class="w"><h2>${tx(C.titlu || E.contact)}</h2><p>${tx(C.text || '')}</p>${buton()}</div></section>`;
  };

  // formularul pe email (valul 0, G2): apare doar dacă există politica de confidențialitate a clientului (L5); bifa de marketing nu există aici.
  // Fără JavaScript (F12): validarea o face browserul (required, type, pattern), iar serverul o reface. Capcana (F13) e un câmp ascuns oamenilor.
  const politica = String(d.politica_url || (d.legal && d.legal.politica_url) || (d.identitate && (d.identitate.politica_url || d.identitate.politica_confidentialitate)) || '').trim();
  const medical = String(d.reglementat || (d.identitate && d.identitate.reglementat) || '') === 'medical';
  const F = opt.formular && /^https?:\/\//i.test(politica) ? opt.formular : null;
  const formular = () => {
    if (!F && !(modPrev && politica)) return '';
    const dez = modPrev ? ' disabled' : '';
    const t = (tu, dvs) => (formal ? dvs : tu);
    const camp = (id, et, extra) => `<label for="f-${id}">${esc(et)}<input id="f-${id}" name="${id}"${extra}${dez}></label>`;
    const campuri = medical
      ? `${camp('nume', 'Nume', ' required minlength="2" maxlength="80" autocomplete="name"')}${camp('telefon', 'Telefon', ' type="tel" required pattern="[0-9 +().-]{9,20}" inputmode="tel" autocomplete="tel"')}<label for="f-interval">${t('Când te sunăm', 'Când vă sunăm')}<select id="f-interval" name="interval"${dez}><option value="oricand">Oricând</option><option value="dimineata">Dimineața</option><option value="dupa_amiaza">După-amiaza</option></select></label><p class="avert">${t('Nu scrie aici detalii despre sănătatea ta. Te sunăm noi.', 'Nu scrieți aici detalii despre sănătatea dumneavoastră. Vă sunăm noi.')}</p>`
      : `${camp('nume', 'Nume', ' required minlength="2" maxlength="80" autocomplete="name"')}${camp('telefon', 'Telefon', ' type="tel" pattern="[0-9 +().-]{9,20}" inputmode="tel" autocomplete="tel"')}${camp('email', 'Email', ' type="email" maxlength="120" autocomplete="email"')}<label for="f-mesaj">Mesaj<textarea id="f-mesaj" name="mesaj" rows="4" maxlength="1500"${dez}></textarea></label><p class="nota">${t('Lasă un telefon sau un email, ca să-ți putem răspunde.', 'Lăsați un telefon sau un email, ca să vă putem răspunde.')}</p>`;
    const acord = `<label class="acord" for="f-acord"><input type="checkbox" id="f-acord" name="acord" value="da" required${dez}><span>${t('Sunt de acord', 'Sunt de acord')} ca ${tx(firma)} să ${t('mă', 'mă')} contacteze pe baza acestor date. Detalii în <a href="${esc(politica)}" rel="noopener">politica de confidențialitate</a>.</span></label>`;
    const ascunse = F ? `<input type="hidden" name="s" value="${esc(F.site || '')}"><div class="capcana" aria-hidden="true"><label for="f-website">Lasă gol</label><input id="f-website" name="website" tabindex="-1" autocomplete="off"></div>` : '';
    return `<form class="form" method="post" action="${esc(F ? F.actiune : '#')}" accept-charset="utf-8">${ascunse}${campuri}${acord}<button class="b" type="submit"${dez}>Trimite</button>${modPrev ? '<p class="nota">Formularul pornește după publicare.</p>' : ''}</form>`;
  };
  const pg404 = () => `<section class="contact"><div class="w"><div><p class="ochi">404</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${t2('Pagina nu există.', 'Pagina nu există.')}</h1><div class="lead"><p>${t2('Adresa s-a schimbat sau are o greșeală. Găsești totul pornind de pe pagina principală.', 'Adresa s-a schimbat sau are o greșeală. Găsiți totul pornind de pe pagina principală.')}</p></div><p style="margin-top:26px"><a class="b" href="/">Pagina principală</a></p></div></div></section>`;
  const pgMultumim = () => `<section class="contact"><div class="w"><div><p class="ochi">${tx(E.contact)}</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${t2('Mulțumim! Am primit mesajul tău.', 'Mulțumim! Am primit mesajul dumneavoastră.')}</h1><div class="lead"><p>${t2('Revenim la tine cât mai repede.', 'Revenim cât mai repede.')}</p></div><p style="margin-top:26px"><a class="b gol" href="${lnk('acasa')}">Înapoi pe pagina principală</a></p></div></div></section>`;
  const pgContact = () => {
    const rand = (k, v, h) => (v ? `<div><span>${esc(k)}</span><b>${h ? `<a href="${esc(h)}">${tx(v)}</a>` : tx(v)}</b></div>` : '');
    return `<section class="contact"><div class="w"><div><p class="ochi">${tx(E.contact)}</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${tx(C.titlu || E.contact)}</h1><div class="lead"><p>${nl(C.text || '')}</p></div><p style="margin-top:26px">${buton()}</p>${formular()}</div><div class="date">${rand('Telefon', ct.telefon, ct.telefon ? `tel:${telIntl(ct.telefon)}` : '')}${ct.programare ? `<div><span>${tx('Programări')}</span><b><a href="${esc(ct.programare)}" data-m="prog">${tx('Programează online')}</a></b></div>` : ''}${rand('Email', ct.email, ct.email ? `mailto:${ct.email}` : '')}${rand('Adresă', ct.adresa, ct.adresa ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ct.adresa)}` : '')}${rand('Program', ct.program)}${modPrev && lipsesc.length ? `<p class="lipsa">Mai lipsesc: ${esc(lipsesc.join(', '))}. Le punem pe site în ziua în care le primim de la tine.</p>` : ''}</div></div></section>`;
  };

  // Pagină în plus / Migrare: titlul, textul în markdown simplu, îndemnul
  const pgExtra = (k) => {
    const p = (EXTRA.find((x) => x[0] === k) || [])[3] || {};
    return `<section class="despre"><div class="w" style="grid-template-columns:1fr"><div><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${tx(p.titlu || '')}</h1><div class="lead md">${mdHtml(p.text)}</div></div></div></section>` +
      `<section class="cta"><div class="w"><h2>${tx(C.titlu || E.contact)}</h2><p>${tx(C.text || '')}</p>${buton()}</div></section>`;
  };
  // Landing: o ofertă, o acțiune, termenul vizibil (L2); după termen, pagina spune că oferta s-a încheiat, fără buton
  const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const dataRoL = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${Number(m[3])} ${LUNI[Number(m[2]) - 1]} ${m[1]}` : ''; };
  const pgLanding = () => {
    const exp = dataRoL(c.oferta_expira_la);
    if (lndExpirat) {
      const live = String((d.identitate && (d.identitate.site_live || d.identitate.domeniu)) || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return `<section class="erou"><div class="w" style="grid-template-columns:1fr"><div><h1>${t2('Oferta s-a încheiat.', 'Oferta s-a încheiat.')}</h1><p class="sub">${t2(`Mulțumim pentru interes. ${exp ? `Oferta a fost valabilă până pe ${exp}.` : ''}`, `Vă mulțumim pentru interes. ${exp ? `Oferta a fost valabilă până pe ${exp}.` : ''}`)}</p>${live ? `<div class="act"><a class="b gol" href="https://${esc(live)}">${t2('Vezi site-ul nostru', 'Vedeți site-ul nostru')}</a></div>` : ''}</div></div></section>`;
    }
    const termen = exp ? `<p class="expira">${t2('Oferta e valabilă până pe', 'Oferta este valabilă până pe')} ${tx(exp)}.</p>` : '';
    const erou = `<section class="erou ${N.erou === 'plin' ? '' : N.erou}"><div class="w"><div><h1>${tx(c.titlu || firma)}</h1><p class="sub">${tx(c.subtitlu || '')}</p><div class="act">${buton()}</div>${termen}</div>${poze[0] ? poza(poze[0], '', modPrev, true) : ''}</div></section>`;
    const corpL = c.text ? `<section><div class="w"><div class="lead md">${mdHtml(c.text)}</div></div></section>` : '';
    const final = lndForm ? `<section class="contact" id="formular"><div class="w"><div><h2 class="h2">${tx(btText)}</h2>${termen}${formular()}</div></div></section>`
      : `<section class="cta" id="formular"><div class="w"><h2>${tx(btText)}</h2>${termen}${buton()}</div></section>`;
    return erou + corpL + final;
  };

  const L = legalDin(d);
  const randLegal = [L.denumire, L.cui ? `CUI ${L.cui}` : '', L.reg_com, L.sediu ? `Sediu: ${L.sediu}` : ''].filter(Boolean).map((x) => tx(x)).join(' · ');
  const sal = (L.denumire || L.cui) && L.b2c ? (opt.sal_img ? `<a href="https://reclamatiisal.anpc.ro/" rel="noopener" target="_blank"><img src="${esc(opt.sal_img)}" width="250" height="50" alt="ANPC · Soluționarea alternativă a litigiilor" loading="lazy"></a>` : `<a href="https://reclamatiisal.anpc.ro/" rel="noopener" target="_blank">ANPC · Soluționarea alternativă a litigiilor</a>`) : '';
  const politicaLink = /^https?:\/\//i.test(politica) ? `<a href="${esc(politica)}" rel="noopener">Politica de confidențialitate</a>` : '';
  const subsol = `<footer><div class="w"><span>© ${new Date().getFullYear()} ${tx(firma)}${ct.adresa ? ` · ${tx(ct.adresa)}` : ''}</span><span>${ct.telefon ? `<a href="tel:${esc(telIntl(ct.telefon))}">${tx(ct.telefon)}</a>` : ''}${ct.telefon && ct.email ? ' · ' : ''}${ct.email ? `<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>` : ''}</span>${randLegal || sal || politicaLink ? `<span class="legal" style="flex-basis:100%">${[randLegal, politicaLink, sal].filter(Boolean).join(' · ')}</span>` : ''}</div></footer>`;
  const subsolExtra = EXTRA.length > inMeniu.length ? `<nav class="pagini-extra" aria-label="Alte pagini"><div class="w">${EXTRA.filter((x) => !inMeniu.includes(x)).map(([k, n]) => `<a href="${lnk(k)}">${tx(n)}</a>`).join('')}</div></nav>` : '';
  const corp = { acasa: LND ? pgLanding : pgAcasa, servicii: pgServicii, despre: pgDespre, contact: pgContact, multumim: pgMultumim, '404': pg404 };
  for (const [k] of EXTRA) corp[k] = () => pgExtra(k);

  // S3: LocalBusiness cu subtipul nișei, din aceleași date ca pagina (A3); fără câmpuri inventate
  const jsonLd = (url) => {
    const i = d.identitate || {};
    const o = { '@context': 'https://schema.org', '@type': tipSchema({ nisa: d.nisa || i.nisa, firma }), name: firma, url };
    if (ct.telefon) o.telephone = telIntl(ct.telefon);
    if (ct.email) o.email = ct.email;
    if (ct.adresa) o.address = { '@type': 'PostalAddress', streetAddress: ct.adresa, ...(i.oras ? { addressLocality: i.oras } : {}), addressCountry: 'RO' };
    if (opt.og_imagine) o.image = opt.og_imagine;
    if (L.denumire) o.legalName = L.denumire;
    if (L.cui) o.taxID = L.cui;
    return `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
  };

  const fonturiGoogle = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${N.fonturi}&display=swap" rel="stylesheet">`;
  const fonturiLocale = (cale) => { const corpF = (N.local || [])[1] || (N.local || [])[0]; const pre = corpF ? `<link rel="preload" href="${cale}/${corpF[0]}/latin-${(corpF[2] || [400])[0]}-normal.woff2" as="font" type="font/woff2" crossorigin>` : ''; return { link: pre, css: fontFace(N, cale) }; };
  const cap = (meta, extra = '', fl = null) => `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="${esc(opt.favicon || 'data:,')}">${modPrev ? '<meta name="robots" content="noindex, nofollow">' : ''}
<title>${esc(meta.titlu)}</title>
<meta name="description" content="${esc(meta.descriere)}">
${fl ? fl.link : fonturiGoogle}
<style>${fl ? fl.css + '\n' : ''}${css(N)}</style>${extra}${opt.masurare && !modPrev ? '\n<script src="/_alesign/m.js" defer></script>' : ''}
</head>`;

  if (!modPrev) {
    const [k, n, slug] = opt.pagina === 'multumim' ? ['multumim', 'Mulțumim', 'multumim'] : opt.pagina === '404' ? ['404', 'Pagina nu există', '404'] : (PG.find((p) => p[0] === (opt.pagina || 'acasa')) || PG[0]);
    const meta = LND ? { titlu: String(c.meta_titlu || c.titlu || firma), descriere: String(c.meta_descriere || c.subtitlu || '').slice(0, 160) } : metaPentru(c.pagini, k, n, site, firma);
    const baza = String(opt.baza || '').replace(/\/+$/, '');
    const url = baza ? `${baza}/${slug}` : '';
    const og = baza ? `
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website"><meta property="og:locale" content="ro_RO"><meta property="og:site_name" content="${esc(firma)}">
<meta property="og:title" content="${esc(meta.titlu)}"><meta property="og:description" content="${esc(meta.descriere)}"><meta property="og:url" content="${esc(url)}">${opt.og_imagine ? `<meta property="og:image" content="${esc(opt.og_imagine)}">` : ''}
${k === 'acasa' ? jsonLd(`${baza}/`) : ''}` : '';
    const fl = opt.fonturi === null ? null : fonturiLocale(opt.fonturi || '/_f');
    if (k === '404') return `${cap({ titlu: `Pagina nu există · ${firma}`, descriere: '' }, '\n<meta name="robots" content="noindex">', fl)}<body>${nav('')}<main id="continut">${corp['404']()}</main>${subsol}</body></html>`;
    if (k === 'multumim') return `${cap({ titlu: `Mulțumim · ${firma}`, descriere: '' }, '\n<meta name="robots" content="noindex">', fl)}<body>${nav('contact')}<main id="continut">${corp.multumim()}</main>${subsol}</body></html>`;
    return `${cap(meta, og + (lndExpirat ? '\n<meta name="robots" content="noindex">' : ''), fl)}<body>${nav(k)}<main id="continut">${corp[k]()}</main>${subsol}${subsolExtra}</body></html>`;
  }
  // previzualizare: toate paginile într-un singur document; se vede una, după #hash (id-urile sunt „pg-…”, ca browserul să nu sară la ancoră sub antetul lipicios); fără JS se văd toate, în ordine
  const meta = LND ? { titlu: String(c.meta_titlu || c.titlu || firma), descriere: String(c.meta_descriere || c.subtitlu || '') } : metaPentru(c.pagini, 'acasa', 'Acasă', site, firma);
  const js = `<script>(function(){var P=${JSON.stringify(PG.map((p) => p[0]))};function arata(){var h=(location.hash||'#acasa').slice(1);if(P.indexOf(h)<0)h='acasa';P.forEach(function(k){var el=document.getElementById('pg-'+k);if(el)el.style.display=k===h?'block':'none';});document.querySelectorAll('.nav a').forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+h);});window.scrollTo(0,0);}window.addEventListener('hashchange',arata);arata();})();</script>`;
  const bara = `<div class="prev-bara"><span><b>Previzualizare</b><span class="lung"> · așa arată site-ul tău cu textele de acum, pe șablonul „${esc(N.nume)}”. Pozele se pun la final.</span></span>${opt.inapoi ? `<a href="${esc(opt.inapoi)}">Înapoi la spațiul tău</a>` : ''}</div>`;
  return `${cap(meta)}<body>${bara}${nav('acasa')}<main id="continut">${LND ? corp.acasa() : PG.map(([k]) => `<div class="pg" id="pg-${k}">${corp[k]()}</div>`).join('')}</main>${subsol}${subsolExtra}${LND ? '' : js}</body></html>`;
}

// paginile statice pentru găzduire: [{ cale: 'index.html' | 'servicii/index.html' …, html }]
export function paginiStatice(piesa, dosar, opt = {}) {
  const lista = eLanding(piesa) ? [PAGINI[0]] : [...PAGINI, ...paginiExtra(piesa).map((p) => p.slice(0, 3))];
  const out = lista.map(([k, , slug]) => ({ cale: slug ? `${slug}/index.html` : 'index.html', html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: k }) }));
  if (opt.formular) out.push({ cale: 'multumim/index.html', html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: 'multumim' }) });
  if (opt.p404 !== false) out.push({ cale: '404.html', html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: '404' }) });
  return out;
}
