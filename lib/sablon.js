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
  return Object.entries(x).filter(([slug, p]) => /^[a-z0-9][a-z0-9-]{0,60}$/.test(slug) && !['servicii', 'despre', 'contact', 'multumim', 'politica-de-confidentialitate', '404', '_f', 'img', '_alesign'].includes(slug) && p && (p.titlu || p.text)).slice(0, 20)
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
// P2: fonturile de rezervă potrivite ca lățime cu fontul site-ului. Cât se încarcă fontul (font-display: swap), textul stă în fontul pe care îl are dispozitivul,
// micșorat sau mărit cu `size-adjust` cât să ocupe aceleași rânduri; la schimbare, nimic nu se mută. Fără ele, pe un Linux cu DejaVu, titlul din erou avea un rând
// în plus până venea fontul și împingea poza: CLS 0,105 pe Acasă (sarcina 69, ciclul 2). Tabelul: unelte/fonturi-rezerva.py (lățimea medie pe text românesc).
const REZERVE = {'Fraunces': {'tip': 'serif', 'zero': {'n': 0.662, 'b': 0.675}, 'n': {'times': 117.0, 'noto': 99.6, 'dejavu': 91.7}, 'b': {'times': 111.9, 'noto': 95.4, 'dejavu': 84.3}}, 'Inter': {'tip': 'sans', 'zero': {'n': 0.631, 'b': 0.66}, 'n': {'arial': 106.8, 'roboto': 107.5, 'dejavu': 93.5}, 'b': {'arial': 102.2, 'roboto': 107.6, 'dejavu': 84.9}}, 'Cormorant Garamond': {'tip': 'serif', 'zero': {'n': 0.477, 'b': 0.477}, 'n': {'times': 96.4, 'noto': 82.1, 'dejavu': 75.6}, 'b': {'times': 91.0, 'noto': 77.6, 'dejavu': 68.6}}, 'Jost': {'tip': 'sans', 'zero': {'n': 0.6, 'b': 0.643}, 'n': {'arial': 96.6, 'roboto': 97.2, 'dejavu': 84.6}, 'b': {'arial': 96.7, 'roboto': 101.8, 'dejavu': 80.3}}, 'Forum': {'tip': 'serif', 'zero': {'n': 0.533, 'b': 0.533}, 'n': {'times': 99.4, 'noto': 84.6, 'dejavu': 77.9}, 'b': {'times': 93.5, 'noto': 79.7, 'dejavu': 70.5}}, 'Manrope': {'tip': 'sans', 'zero': {'n': 0.61, 'b': 0.642}, 'n': {'arial': 102.4, 'roboto': 103.0, 'dejavu': 89.6}, 'b': {'arial': 99.7, 'roboto': 104.9, 'dejavu': 82.8}}, 'Playfair Display': {'tip': 'serif', 'zero': {'n': 0.615, 'b': 0.63}, 'n': {'times': 112.0, 'noto': 95.3, 'dejavu': 87.7}, 'b': {'times': 106.3, 'noto': 90.6, 'dejavu': 80.1}}, 'Source Sans 3': {'tip': 'sans', 'zero': {'n': 0.497, 'b': 0.513}, 'n': {'arial': 92.8, 'roboto': 93.4, 'dejavu': 81.3}, 'b': {'arial': 89.7, 'roboto': 94.4, 'dejavu': 74.5}}, 'Space Grotesk': {'tip': 'sans', 'zero': {'n': 0.645, 'b': 0.646}, 'n': {'arial': 109.0, 'roboto': 109.8, 'dejavu': 95.5}, 'b': {'arial': 102.3, 'roboto': 107.7, 'dejavu': 85.0}}};
const LOCALE_REZ = {
  arial: [['Arial', 'ArialMT', 'Liberation Sans', 'LiberationSans'], ['Arial Bold', 'Arial-BoldMT', 'Liberation Sans Bold', 'LiberationSans-Bold']],
  roboto: [['Roboto', 'Roboto-Regular'], ['Roboto Bold', 'Roboto-Bold']],
  times: [['Times New Roman', 'TimesNewRomanPSMT', 'Liberation Serif', 'LiberationSerif'], ['Times New Roman Bold', 'TimesNewRomanPS-BoldMT', 'Liberation Serif Bold', 'LiberationSerif-Bold']],
  noto: [['Noto Serif', 'NotoSerif'], ['Noto Serif Bold', 'NotoSerif-Bold']],
  dejavu: { sans: [['DejaVu Sans', 'DejaVuSans'], ['DejaVu Sans Bold', 'DejaVuSans-Bold']], serif: [['DejaVu Serif', 'DejaVuSerif'], ['DejaVu Serif Bold', 'DejaVuSerif-Bold']] },
};
const primaFamilie = (stiva) => String(stiva || '').split(',')[0].replace(/["']/g, '').trim();
// stiva de fonturi cu rezervele potrivite intercalate după fontul site-ului: 'Inter','Inter r1','Inter r2','Inter r3',system-ui,sans-serif
export function stivaCuRezerve(stiva) {
  const f = primaFamilie(stiva); const R = REZERVE[f]; if (!R) return String(stiva || '');
  const rest = String(stiva).split(',').slice(1).map((x) => x.trim()).filter(Boolean);
  return [`'${f}'`, ...Object.keys(R.n).map((_, i) => `'${f} r${i + 1}'`), ...rest].join(',');
}
// unitatea `ch` depinde de fontul în care e scris textul: cu fontul de rezervă, „16ch” era mai îngust decât cu fontul site-ului și titlul se rupea altfel.
// Lățimile de text sunt de aceea în em × lățimea cifrei 0 din fontul site-ului (--ct pentru titluri, --cc pentru corp): aceeași lățime înainte și după schimbarea fontului.
const chEm = (stiva, g) => { const R = REZERVE[primaFamilie(stiva)]; return `${R ? R.zero[g] : 0.55}em`; };
export function fontFaceRezerve(N) {
  const out = [];
  for (const f of [...new Set([primaFamilie(N.titlu), primaFamilie(N.corp)])]) {
    const R = REZERVE[f]; if (!R) continue;
    Object.keys(R.n).forEach((k, i) => {
      const [normal, gros] = k === 'dejavu' ? LOCALE_REZ.dejavu[R.tip] : LOCALE_REZ[k]; const src = (l) => l.map((x) => `local('${x}')`).join(',');
      out.push(`@font-face{font-family:'${f} r${i + 1}';font-weight:100 500;src:${src(normal)};size-adjust:${R.n[k]}%}`, `@font-face{font-family:'${f} r${i + 1}';font-weight:600 900;src:${src(gros)};size-adjust:${R.b[k]}%}`);
    });
  }
  return out.join('\n');
}
export const FONTURI_PERMISE = new Set(Object.values(NISE).flatMap((N) => fisiereFont(N).map((f) => `${f.id}/${f.fisier}`)));
function fontFace(N, cale) {
  return fisiereFont(N).map((f) => `@font-face{font-family:'${f.fam}';font-style:${f.st};font-weight:${f.g};font-display:swap;src:url(${cale}/${f.id}/${f.fisier}) format('woff2');unicode-range:${RANGE[f.sub]}}`).join('\n');
}

// C8: etichetele șablonului urmează adresarea din Dosar · Brand (tu sau dumneavoastră); textele botului vin deja în adresarea aleasă
const DVS = { 'Scrie-ne': 'Scrieți-ne', 'Ce găsești la noi': 'Ce găsiți la noi' };
function eticheteFormale(E, formal) { if (!formal) return E; const o = {}; for (const [k, v] of Object.entries(E)) o[k] = DVS[v] || v; return o; }
// adresarea: 1) câmpul explicit (adresare: 'tu' | 'dumneavoastra'), 2) briefului din Dosar · Brand (altceva / ton), 3) textele site-ului (cine câștigă la numărătoare)
export function eFormal(d, site) {
  const explicit = String((d && (d.adresare || (d.brand && d.brand.adresare))) || (site && site.adresare) || '').trim();
  if (/dumneavoastr|formal/i.test(explicit)) return true;
  if (/^(tu|informal)$/i.test(explicit)) return false;
  // aceeași regulă ca în skill-ul site-copy (C8): brand.altceva explicit câștigă; altfel tonul: „elegant” → dumneavoastră, „prietenos” / „direct” → tu
  const altceva = String((d && d.brand && d.brand.altceva) || '');
  if (/dumneavoastr/i.test(altceva)) return true;
  if (/\badresare\b[^.]{0,30}\b(tu|pe tu)\b/i.test(altceva)) return false;
  const ton = String((d && d.brand && d.brand.ton) || '');
  if (/elegant|formal/i.test(ton)) return true;
  if (/prietenos|direct/i.test(ton)) return false;
  const text = JSON.stringify(site || {});
  const dvs = (text.match(/dumneavoastr|\bsunați\b|\bscrieți\b|\bveniți\b|\bputeți\b|\baveți\b/gi) || []).length;
  const tu = (text.match(/\bsună\b|\bscrie-ne\b|\bvino\b|\bpoți\b|\bai nevoie\b|\bîți\b|\bte sunăm\b/gi) || []).length;
  return dvs > tu;
}

// Limbă în plus (valul 2, ML1–ML2): a doua limbă stă sub site.<cod> (site.en), cu aceeași hartă ca în română; textele vin din bot (traducerea textelor aprobate),
// etichetele fixe ale șablonului vin de aici (sau din site.<cod>.ui, dacă botul le-a scris altfel). Paginile ei stau sub /<cod>/, cu hreflang reciproc și lang corect.
export const UI_LIMBI = {
  en: { de_ce: 'Why here', servicii: 'Services', cum: 'How it works', intrebari: 'Frequently asked questions', contact: 'Get in touch', Acasă: 'Home', Servicii: 'Services', Despre: 'About', Contact: 'Contact',
    'Toate serviciile': 'All services', 'Despre noi': 'About us', 'Povestea noastră': 'Our story', 'Pentru cine': 'Who it is for', 'Cu cine lucrăm': 'Who we work with', Telefon: 'Phone', Programări: 'Appointments', 'Programează online': 'Book online',
    Email: 'Email', Adresă: 'Address', Program: 'Opening hours', 'Sari la conținut': 'Skip to content', Meniu: 'Menu', 'sau sună:': 'or call:', 'sau sunați:': 'or call:', Nume: 'Name', Mesaj: 'Message', Trimite: 'Send', 'Când te sunăm': 'When should we call you',
    Oricând: 'Anytime', Dimineața: 'Morning', 'După-amiaza': 'Afternoon', 'Nu scrie aici detalii despre sănătatea ta. Te sunăm noi.': 'Please do not write health details here. We will call you.',
    'Lasă un telefon sau un email, ca să-ți putem răspunde.': 'Leave a phone number or an email so we can get back to you.', 'Sunt de acord': 'I agree', 'să mă contacteze pe baza acestor date. Detalii în': 'may contact me using these details. More in the',
    'politica de confidențialitate': 'privacy policy', 'Politica de confidențialitate': 'Privacy policy', 'Alte pagini': 'Other pages', 'Formularul pornește după publicare.': 'The form goes live after publishing.', 'Lasă gol': 'Leave empty', locale: 'en_US' },
  de: { de_ce: 'Warum hier', servicii: 'Leistungen', cum: 'So läuft es ab', intrebari: 'Häufige Fragen', contact: 'Kontakt', Acasă: 'Start', Servicii: 'Leistungen', Despre: 'Über uns', Contact: 'Kontakt',
    'Toate serviciile': 'Alle Leistungen', 'Despre noi': 'Über uns', 'Povestea noastră': 'Unsere Geschichte', 'Pentru cine': 'Für wen', 'Cu cine lucrăm': 'Mit wem wir arbeiten', Telefon: 'Telefon', Programări: 'Termine', 'Programează online': 'Online buchen',
    Email: 'E-Mail', Adresă: 'Adresse', Program: 'Öffnungszeiten', 'Sari la conținut': 'Zum Inhalt springen', Meniu: 'Menü', 'sau sună:': 'oder anrufen:', 'sau sunați:': 'oder anrufen:', Nume: 'Name', Mesaj: 'Nachricht', Trimite: 'Senden', 'Când te sunăm': 'Wann dürfen wir anrufen',
    Oricând: 'Jederzeit', Dimineața: 'Vormittags', 'După-amiaza': 'Nachmittags', 'Nu scrie aici detalii despre sănătatea ta. Te sunăm noi.': 'Bitte keine Gesundheitsdaten hier eintragen. Wir rufen Sie an.',
    'Lasă un telefon sau un email, ca să-ți putem răspunde.': 'Hinterlassen Sie Telefon oder E-Mail, damit wir antworten können.', 'Sunt de acord': 'Ich bin einverstanden, dass', 'să mă contacteze pe baza acestor date. Detalii în': 'mich anhand dieser Daten kontaktiert. Details in der',
    'politica de confidențialitate': 'Datenschutzerklärung', 'Politica de confidențialitate': 'Datenschutzerklärung', 'Alte pagini': 'Weitere Seiten', 'Formularul pornește după publicare.': 'Das Formular ist nach der Veröffentlichung aktiv.', 'Lasă gol': 'Leer lassen', locale: 'de_DE' },
  hu: { de_ce: 'Miért mi', servicii: 'Szolgáltatások', cum: 'Hogyan zajlik', intrebari: 'Gyakori kérdések', contact: 'Kapcsolat', Acasă: 'Kezdőlap', Servicii: 'Szolgáltatások', Despre: 'Rólunk', Contact: 'Kapcsolat',
    'Toate serviciile': 'Minden szolgáltatás', 'Despre noi': 'Rólunk', 'Povestea noastră': 'Történetünk', 'Pentru cine': 'Kinek', 'Cu cine lucrăm': 'Kikkel dolgozunk', Telefon: 'Telefon', Programări: 'Időpontok', 'Programează online': 'Online időpont',
    Email: 'E-mail', Adresă: 'Cím', Program: 'Nyitvatartás', 'Sari la conținut': 'Ugrás a tartalomra', Meniu: 'Menü', 'sau sună:': 'vagy hívjon:', 'sau sunați:': 'vagy hívjon:', Nume: 'Név', Mesaj: 'Üzenet', Trimite: 'Küldés', 'Când te sunăm': 'Mikor hívhatjuk',
    Oricând: 'Bármikor', Dimineața: 'Délelőtt', 'După-amiaza': 'Délután', 'Nu scrie aici detalii despre sănătatea ta. Te sunăm noi.': 'Kérjük, ne írjon ide egészségügyi adatokat. Visszahívjuk.',
    'Lasă un telefon sau un email, ca să-ți putem răspunde.': 'Hagyjon telefonszámot vagy e-mailt, hogy válaszolhassunk.', 'Sunt de acord': 'Hozzájárulok, hogy', 'să mă contacteze pe baza acestor date. Detalii în': 'ezen adatok alapján megkeressen. Részletek az',
    'politica de confidențialitate': 'adatvédelmi tájékoztatóban', 'Politica de confidențialitate': 'Adatvédelmi tájékoztató', 'Alte pagini': 'További oldalak', 'Formularul pornește după publicare.': 'Az űrlap a közzététel után indul.', 'Lasă gol': 'Hagyja üresen', locale: 'hu_HU' },
};
export const limbiDin = (piesa) => Object.keys((piesa && piesa.site) || {}).filter((k) => /^[a-z]{2}$/.test(k) && k !== 'ro' && piesa.site[k] && typeof piesa.site[k] === 'object' && piesa.site[k].acasa && typeof piesa.site[k].acasa === 'object');

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
${fontFaceRezerve(N)}
:root{--ct:${chEm(N.titlu, 'b')};--cc:${chEm(N.corp, 'n')};--fundal:${c.fundal};--suprafata:${c.suprafata};--cerneala:${c.cerneala};--mut:${c.mut};--linie:${c.linie};--accent:${c.accent};--accent-text:${c.accentText};--moale:${c.moale};--erou:${c.erou};--raza:${N.raza};--raza-b:${N.razaB || N.raza}}
*{box-sizing:border-box;margin:0;padding:0}
/* N2: o ancoră (#continut, #serviciu) oprește sub antetul lipicios, nu sub el: 69 px pe desktop, până la 101 px pe telefon (antetul pe două rânduri) */
html{scroll-behavior:smooth;scroll-padding-top:84px}
body{background:var(--fundal);color:var(--cerneala);font-family:${stivaCuRezerve(N.corp)};line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
a:focus-visible,summary:focus-visible{outline:2px solid var(--cerneala);outline-offset:3px;border-radius:4px}
.b:focus-visible{outline:2px solid var(--cerneala);outline-offset:3px}
.cta .b:focus-visible{outline-color:var(--fundal)}
.sari{position:absolute;left:12px;top:-60px;z-index:50;background:var(--cerneala);color:var(--fundal);padding:10px 16px;border-radius:8px;font-weight:600}
.sari:focus{top:12px}
img{max-width:100%;display:block}
h1,h2,h3,.tf{font-family:${stivaCuRezerve(N.titlu)};font-weight:600;line-height:1.08;letter-spacing:-0.012em}
.w{width:min(1120px,100% - 40px);margin:0 auto}
.sus{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--fundal) 88%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--linie)}
.sus .w{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.marca{display:flex;align-items:center;gap:12px;min-height:44px;font-weight:700;font-size:17px;letter-spacing:-0.01em}
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
.h2{font-size:clamp(28px,3.6vw,40px);margin:12px 0 10px;max-width:calc(22 * var(--ct))}
.lead{color:var(--mut);font-size:17px;max-width:calc(62 * var(--cc))}
.lead p+p{margin-top:10px}
.md h2{font-size:clamp(22px,2.6vw,28px);margin:26px 0 10px;color:var(--cerneala)}.md h3{font-size:19px;margin:20px 0 8px;color:var(--cerneala)}.md ul{margin:8px 0 12px 20px}.md li{margin:4px 0}.md p{margin:0 0 12px}
.expira{margin-top:14px;font-size:14px;color:var(--mut)}
.pagini-extra{border-top:1px solid var(--linie);padding:16px 0;font-size:13.5px}.pagini-extra .w{display:flex;flex-wrap:wrap;gap:6px 18px}.pagini-extra a{color:var(--mut);min-height:24px;display:inline-flex;align-items:center}
/* erou */
.erou{padding:56px 0 64px;border-top:0}
.erou .w{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.erou h1{font-size:clamp(36px,5.4vw,62px);margin:0 0 18px;max-width:calc(16 * var(--ct))}
.erou .sub{font-size:19px;color:var(--mut);max-width:calc(48 * var(--cc));margin-bottom:28px}
.erou .act{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.erou .act .alt{font-size:14px;color:var(--mut)}
.poza{background:var(--erou);border-radius:var(--raza);aspect-ratio:4/3;overflow:hidden;position:relative;display:flex;align-items:flex-end;padding:18px}
.poza img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.poza .brief{position:relative;font-size:12.5px;color:var(--mut);background:color-mix(in srgb,var(--suprafata) 85%,transparent);padding:8px 12px;border-radius:8px;max-width:calc(34 * var(--cc))}
.erou.centrat .w{grid-template-columns:1fr;text-align:center;justify-items:center;gap:32px}
.erou.centrat h1{max-width:calc(20 * var(--ct))}
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
.faq p{color:var(--mut);margin-top:10px;font-size:15.5px;max-width:calc(64 * var(--cc))}
.contact .w{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.form{margin-top:30px;display:grid;gap:14px;max-width:520px}.form label{display:grid;gap:6px;font-size:14px;font-weight:600}.form input,.form textarea,.form select{font:inherit;font-size:16px;font-weight:400;color:var(--cerneala);background:var(--suprafata);border:1.5px solid var(--linie);border-radius:10px;padding:11px 13px;width:100%}.form input:focus-visible,.form textarea:focus-visible,.form select:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.form .acord{display:flex;gap:10px;align-items:flex-start;font-weight:400;color:var(--mut)}.form .acord input{width:auto;margin-top:4px}.form .acord a{text-decoration:underline}.form .nota{font-size:13.5px;color:var(--mut);margin:0}.form .capcana{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.form button{justify-self:start;cursor:pointer}.form .avert{font-size:14px;border-left:3px solid var(--accent);padding:4px 0 4px 12px;margin:0}
.date{display:grid;gap:14px;margin-top:24px}
.date div{display:grid;gap:2px;padding:14px 0;border-top:1px solid var(--linie)}
.date span{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);font-weight:600}
/* valorile de contact stau la greutatea corpului (400): greutatea 500 era folosită doar aici și aducea două fișiere de font în plus pe pagina Contact (P1) */
.date b{font-weight:400;font-size:17px;color:var(--cerneala)}
.date a:hover{text-decoration:underline}
.cta{background:var(--cerneala);color:var(--fundal);text-align:center;padding:80px 0;border-top:0}
.promo{padding:18px 0;background:var(--suprafata);border-top:1px solid var(--linie);border-bottom:1px solid var(--linie)}
.promo p{font-size:16px;text-align:center}.promo span{color:var(--mut);margin-left:8px;font-size:14px}
.cta h2{font-size:clamp(28px,3.6vw,42px);margin-bottom:12px;color:inherit}
.cta p{opacity:.78;max-width:calc(52 * var(--cc));margin:0 auto 26px}
.cta .b{background:var(--fundal);color:var(--cerneala);border-color:var(--fundal)}
footer{padding:36px 0;border-top:1px solid var(--linie);color:var(--mut);font-size:13.5px}
footer .w{display:grid;gap:16px}
.f-r{display:flex;justify-content:space-between;align-items:center;gap:10px 28px;flex-wrap:wrap}
.f-legal{padding-top:16px;border-top:1px solid var(--linie)}
.f-legal .legal{flex:1 1 320px;max-width:calc(72 * var(--cc))}
.sal{flex:none}.sal img{width:250px;height:50px;object-fit:contain;object-position:right center}
footer a,.date a,.form .acord a{display:inline-block;min-height:24px;line-height:24px}
.pg{display:block}
main{min-height:calc(100vh - 220px)}
.lipsa{margin-top:28px;padding:14px 16px;border:1px dashed var(--linie);border-radius:var(--raza);font-size:13.5px;color:var(--mut)}
.prev-bara{position:static;background:#0c0c0d;color:#f4f1ea;font:500 13px/1.4 Manrope,system-ui,sans-serif;padding:10px 20px;display:flex;justify-content:space-between;gap:16px;align-items:center}
.prev-bara a{color:#f4f1ea;text-decoration:underline;text-underline-offset:3px}
.prev-bara b{color:#ff2a2e}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{transition:none!important;animation:none!important}}
/* fără poză: secțiunea stă pe o coloană, nu cu un panou gol (D3, sarcina 69) */
.erou .w.una,.despre .w.una{grid-template-columns:1fr}
.erou .w.una h1{max-width:calc(20 * var(--ct))}
/* fără poză, „Despre” e așezată editorial: titlul în stânga, textul în dreapta, pe toată lățimea (c2-25: fără jumătate de pagină goală) */
.despre .w.una.ed{grid-template-columns:.8fr 1.2fr;align-items:start;gap:48px}
.despre .w.una.ed .lead{max-width:none;font-size:18px}
.despre .w.una.ed>div:last-child{padding-top:28px}
/* Servicii ca listă de prețuri: un serviciu pe rând, prețul în dreapta, descrierea dedesubt doar unde există (c2-17, c2-18: fără carduri goale) */
.lp{max-width:880px;border-top:1px solid var(--linie)}
.lp .r{display:grid;grid-template-columns:1fr auto;gap:6px 32px;align-items:baseline;padding:22px 0;border-bottom:1px solid var(--linie)}
.lp h2{font-size:21px}
.lp p{grid-column:1;color:var(--mut);font-size:15.5px;max-width:calc(58 * var(--cc))}
.lp .pret{grid-column:2;grid-row:1;margin:0;font-weight:600;font-size:17px;color:var(--cerneala);white-space:nowrap}
/* programul: un interval pe rând, orele nu se rup (c1-21) */
.date b.randuri{white-space:normal}.nw{white-space:nowrap}.date b span{font:inherit;letter-spacing:inherit;text-transform:none;color:inherit}
/* grile fără carduri orfane: 4 carduri → 4 coloane (apoi 2×2); 5 carduri pe 3 coloane → al doilea rând centrat; pe 2 coloane, ultimul card impar ia tot rândul (c1-9, c1-13, c1-17, c1-33) */
.g3.n4{grid-template-columns:repeat(4,1fr)}
.g3.n5{grid-template-columns:repeat(6,1fr)}.g3.n5 .c{grid-column:span 2}.g3.n5 .c:nth-child(4){grid-column:2 / span 2}.g3.n5 .c:nth-child(5){grid-column:4 / span 2}
.g2 .c:last-child:nth-child(odd){grid-column:1 / -1}
@media(max-width:900px){html{scroll-padding-top:116px}}
@media(orientation:landscape) and (max-height:500px){html{scroll-padding-top:76px}.erou{padding:20px 0 24px}.erou h1{font-size:30px;margin-bottom:8px}.erou .sub{font-size:16px;margin-bottom:12px}.erou .poza{display:none}.erou.plin .poza{display:flex;min-height:0}.erou.plin .text{padding:24px 0}.sus .w{min-height:52px}}
/* antetul pe ecrane mici (M3, M1): niciun element nu iese din ecran; linkurile au ținte de 44 px; butonul de apel rămâne întreg */
@media(max-width:900px){.erou .w,.despre .w,.contact .w,.despre .w.una.ed{grid-template-columns:1fr;gap:28px}.despre .w.una.ed{gap:8px}.despre .w.una.ed>div:last-child{padding-top:0}.g3,.g2,.pasi,.g3.n4,.g3.n5{grid-template-columns:1fr 1fr}.g3.n5 .c,.g3.n5 .c:nth-child(4),.g3.n5 .c:nth-child(5){grid-column:auto}.g3 .c:last-child:nth-child(odd){grid-column:1 / -1}.sus .w{height:auto;min-height:60px;flex-wrap:wrap;padding:6px 0;row-gap:0}.nav{flex-wrap:wrap;gap:0 14px;font-size:13.5px}.nav a{min-height:44px;display:inline-flex;align-items:center;padding:0 2px}.sus .b{display:none}.nav .b{display:inline-flex;min-height:44px}}
@media(max-width:600px){.prev-bara .lung{display:none}.g3,.g2,.pasi,.g3.n4,.g3.n5{grid-template-columns:1fr}section{padding:52px 0}.erou{padding:36px 0 48px}.erou.plin .poza{min-height:70vh}.w{width:min(1120px,100% - 32px)}
.sus .w{padding:8px 0 4px}.marca{flex:1 1 auto;min-width:0;font-size:16px;line-height:1.2}.lp .r{grid-template-columns:1fr;padding:18px 0}.lp .pret{grid-column:1;grid-row:auto}.sal img{object-position:left center}.sus .b{display:inline-flex;min-height:44px;order:2}.nav{flex-basis:100%;order:3;justify-content:space-between;gap:0 8px}.nav .b{display:none}}
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
// fără poză: în previzualizare rămâne panoul cu briefului (clientul vede ce poză se cere); pe site-ul publicat nu apare niciun panou gol (D3, c1-2, c1-29)
function poza(p, brief, modPrev, lcp = false) {
  const x = p ? normPoza(p) : { url: '', alt: '' };
  if (!x.url && !(modPrev && brief)) return '';
  const atr = lcp ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"';
  const dim = (x.w && x.h ? ` width="${x.w}" height="${x.h}"` : '') + (x.srcset ? ` srcset="${esc(x.srcset)}" sizes="${lcp ? '(max-width: 900px) 100vw, 50vw' : '(max-width: 900px) 100vw, 45vw'}"` : '');
  return `<div class="poza">${x.url ? `<img src="${esc(x.url)}" alt="${esc(x.alt)}"${dim}${atr}>` : ''}${!x.url && modPrev && brief ? `<div class="brief">Poză: ${esc(brief)}</div>` : ''}</div>`;
}
// clasa coloanei: `una` când secțiunea nu are panou de poză (textul ia toată lățimea)
const una = (html) => (html ? '' : ' una');
// grile: numărul de carduri decide așezarea (fără orfani)
const gn = (cls, n) => `${cls} n${n}`;

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

// ce lipsește pentru formular (L5): politica de confidențialitate a clientului; se cere în Materiale, nu oprește publicarea.
// Dosar · Identitate · politica_confidentialitate poate fi un link (https://…) sau „auto”: șablonul scrie singur pagina /politica-de-confidentialitate din datele legale ale clientului.
export const POLITICA_CALE = '/politica-de-confidentialitate';
const polDin = (d) => String((d && (d.politica_url || (d.legal && d.legal.politica_url) || (d.identitate && (d.identitate.politica_url || d.identitate.politica_confidentialitate)))) || '').trim();
const eOkPol = (u) => /^https?:\/\//i.test(u) || u === POLITICA_CALE;
export function lipsuriPolitica(dosar) {
  const d = dosar || {}; const i = d.identitate || {}; const L = legalDin(d); const out = [];
  if (!L.denumire) out.push('denumirea legală a firmei');
  if (!L.cui) out.push('CUI');
  if (!L.sediu) out.push('sediul');
  if (!String(d.email || i.email_formular || i.email || '').trim()) out.push('un email de contact');
  return out;
}
// pagina generată există doar când Dosarul cere „auto”, datele legale sunt complete și site-ul are formular (sau e previzualizare)
export function eAutoPolitica(dosar, opt) {
  const o = opt || {};
  return /^auto$/i.test(polDin(dosar)) && lipsuriPolitica(dosar).length === 0 && (o.mod !== 'static' || !!o.formular);
}
export function lipsuriFormular(dosar) {
  const d = dosar || {}; const politica = polDin(d);
  if (/^https?:\/\//i.test(politica)) return [];
  if (/^auto$/i.test(politica)) { const l = lipsuriPolitica(d); return l.length ? [`datele pentru politica de confidențialitate generată: ${l.join(', ')}`] : []; }
  return ['politica de confidențialitate (linkul ei sau „auto”, cu datele legale ale firmei), ca să punem formularul pe site'];
}

// textul politicii (operator = clientul, împuternicit = AleSign&Co SRL); numai din datele Dosarului, nimic inventat. Markdown simplu, trece prin mdHtml.
// Derivat din politica AleSign (alesign.net/politica-de-confidentialitate); descrie exact ce face formularul din sql/48 (câmpuri, 24 de luni, fără IP).
const curat = (x) => String(x || '').replace(/[*\r\n]+/g, ' ').replace(/^[#\-•\s]+/, '').trim();
export function textPolitica(d, { medical = false, tel = '', email = '', data = '' } = {}) {
  const L = legalDin(d || {}); const i = (d && d.identitate) || {};
  const nume = curat(L.denumire); const contact = [email ? curat(email) : '', tel ? curat(tel) : ''].filter(Boolean).join(' · ');
  const campuri = medical ? 'numele, numărul de telefon și intervalul în care preferați să fiți sunat' : 'numele, numărul de telefon și/sau emailul și mesajul pe care îl scrieți';
  const L2 = [];
  L2.push('## 1. Cine prelucrează datele');
  L2.push(`Operatorul datelor este **${nume}**, CUI ${curat(L.cui)}${L.reg_com ? `, ${curat(L.reg_com)}` : ''}, cu sediul în ${curat(L.sediu)}. Ne puteți scrie sau suna oricând: ${contact}.`);
  L2.push('## 2. Ce date colectăm și de ce');
  L2.push(`Prin formularul de contact de pe acest site primim ${campuri}. Le folosim doar ca să vă răspundem la cererea trimisă și, dacă este cazul, să stabilim o programare sau o ofertă.`);
  if (medical) L2.push('Formularul nu cere și nu trebuie să trimiteți prin el informații despre sănătatea dumneavoastră. Pentru orice întrebare medicală, sunați-ne sau veniți la cabinet.');
  L2.push('Temeiul este consimțământul dumneavoastră (art. 6 alin. 1 lit. a din GDPR), exprimat prin bifa din formular, și, pentru răspunsul la cererea dumneavoastră, pașii premergători unui contract (lit. b). Fără bifă, formularul nu se trimite. Nu vă luăm decizii automate și nu vă facem profil.');
  L2.push('## 3. Cine mai vede datele');
  L2.push(`Formularul este oferit de **AleSign&Co SRL**, care acționează ca persoană împuternicită de ${nume}: primește mesajul, îl păstrează temporar și îl trimite pe emailul firmei. Pentru asta folosește furnizori de infrastructură: Vercel (găzduirea site-ului), Supabase (baza de date), n8n Cloud (automatizarea) și Google (trimiterea emailului). Unii dintre ei pot prelucra date în afara Spațiului Economic European, pe baza clauzelor contractuale standard ale Comisiei Europene. Nu vindem și nu transmitem datele altor persoane, cu excepția cazurilor în care legea ne obligă.`);
  L2.push('## 4. Cât păstrăm datele');
  L2.push('Cererile trimise prin formular se păstrează cel mult doi ani, apoi se șterg automat. Le puteți cere ștergerea mai devreme. Nu păstrăm adresa dumneavoastră IP; folosim doar o amprentă din care adresa nu poate fi refăcută, pentru a opri trimiterile repetate.');
  L2.push('## 5. Cookie-uri');
  L2.push('Acest site nu folosește cookie-uri de urmărire sau de publicitate. Dacă măsurăm vizitele, o facem agregat, fără cookie-uri și fără profil individual.');
  L2.push('## 6. Drepturile dumneavoastră');
  L2.push(`Aveți dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a vă retrage consimțământul oricând, fără să afecteze prelucrările de dinainte. Scrieți-ne la ${curat(email || contact)} și vă răspundem într-o lună de la primirea cererii. Dacă nu sunteți mulțumit, vă puteți adresa Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28–30, București, www.dataprotection.ro.`);
  L2.push('## 7. Minori');
  L2.push('Site-ul se adresează adulților. Nu prelucrăm cu bună știință date ale persoanelor sub șaisprezece ani.');
  if (data) L2.push(`Ultima actualizare: ${data}.`);
  return L2.join('\n');
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
  const c = piesa || {}; const d = dosar || {};
  // Limbă în plus: opt.limba = codul limbii a doua (site.<cod>); textele vin de acolo, contactul lipsă cade pe română, etichetele fixe din UI_LIMBI sau din site.<cod>.ui
  const L2 = opt.limba && String(opt.limba).toLowerCase() !== 'ro' ? String(opt.limba).toLowerCase() : null;
  const site2 = L2 && c.site && c.site[L2] && typeof c.site[L2] === 'object' && c.site[L2].acasa ? c.site[L2] : null;
  if (L2 && !site2) { const e = new Error(`site-ul nu are limba „${L2}”`); e.cod = 'LIPSA'; e.lipsesc = [`traducerea în ${L2}`]; throw e; }
  const site = site2 ? { ...(c.site || {}), ...site2, extra: site2.extra && typeof site2.extra === 'object' ? site2.extra : {} } : (c.site || {});
  const UI = site2 ? { ...(UI_LIMBI[L2] || UI_LIMBI.en), ...(site2.ui && typeof site2.ui === 'object' ? site2.ui : {}) } : null;
  const T = (x) => (UI && typeof UI[x] === 'string' && UI[x] ? UI[x] : x);
  const LANG = L2 || 'ro'; const LIMBI = limbiDin(c);
  const LND = eLanding(c);
  const cheie = NISE[opt.nisa] ? opt.nisa : nisaDin({ nisa: d.nisa || (d.identitate && d.identitate.nisa), firma: d.firma || (d.identitate && d.identitate.firma) });
  const N = NISE[cheie];
  // C8: adresarea vine din Dosar · Brand (adresare); când lipsește, o citim din brief („Adresare cu «dumneavoastră»”) și din textele aprobate:
  // un site scris la „dumneavoastră” nu primește eticheta fixă „sau sună:” (sarcina 69, c1-24)
  const formal = eFormal(d, site);
  const E0 = eticheteFormale(N.etichete, formal);
  const E = UI ? Object.fromEntries(Object.entries(E0).map(([k, v]) => [k, typeof UI[k] === 'string' && UI[k] ? UI[k] : v])) : E0;
  const suna = T(formal ? 'sau sunați:' : 'sau sună:');
  const t2 = (tu, dvs) => tx(formal ? dvs : tu);
  const modPrev = opt.mod !== 'static';
  const firma = String(d.firma || (d.identitate && d.identitate.firma) || '').trim();
  if (!modPrev && !firma) { const e = new Error('lipsește numele firmei'); e.cod = 'LIPSA'; e.lipsesc = ['numele firmei']; throw e; }
  const ct = contactDin(site, { telefon: d.telefon, email: d.email, adresa: d.adresa, program: d.program, identitate: d.identitate });
  // Landing (F9): o singură țintă; „formular” (sau nimic) = formularul de pe pagină, dacă există politica clientului; altfel telefonul
  const polAuto = eAutoPolitica(d, opt);
  const politica0 = polAuto ? POLITICA_CALE : (/^auto$/i.test(polDin(d)) ? '' : polDin(d));
  const lndT = LND ? String((c.cta && c.cta.tinta) || '').trim() : '';
  const lndForm = LND && (!lndT || /^#?formular$/i.test(lndT)) && eOkPol(politica0) && (!!opt.formular || modPrev);
  const lndExpirat = LND && (!!opt.retras || (!!c.oferta_expira_la && String(opt.azi || new Date().toISOString().slice(0, 10)) > String(c.oferta_expira_la).slice(0, 10)));
  const indemn = LND ? { text: (c.cta && c.cta.text) || '', tinta: /^#?formular$/i.test(lndT) ? '' : lndT, tip: /^(tel:|\+?[\d][\d\s().-]{7,}$)/.test(lndT) ? 'telefon' : (/wa\.me|whatsapp/i.test(lndT) ? 'whatsapp' : '') } : (c.indemn || {});
  // pe a doua limbă, textul butonului vine din traducere (site.<cod>.indemn.text sau acasa.inceput.buton), niciodată din română
  const btText = String(site2 ? ((site2.indemn && site2.indemn.text) || (site2.acasa.inceput && site2.acasa.inceput.buton) || E.contact) : (indemn.text || (site.acasa && site.acasa.inceput && site.acasa.inceput.buton) || E.contact)).trim();
  const href = lndForm ? '#formular' : (LND && !indemn.tinta ? (ct.telefon ? `tel:${telIntl(ct.telefon)}` : '#formular') : indemnLink(indemn, ct, modPrev, L2 ? `${L2}/contact` : 'contact'));
  const poze = Array.isArray(d.poze) ? d.poze.filter((p) => normPoza(p).url) : [];
  const briefs = Array.isArray(c.poze) ? c.poze : [];
  const briefPt = (pg, sec) => { const b = briefs.find((x) => x && new RegExp(sec, 'i').test(String(x.sectiune || '') + ' ' + String(x.pagina || ''))) || briefs.find((x) => x && new RegExp(pg, 'i').test(String(x.pagina || ''))); return b ? b.brief : ''; };
  const A = site.acasa || {}; const S = site.servicii || {}; const D = site.despre || {}; const C = site.contact || {};
  const lnk = (k) => { const pg = (typeof PG !== 'undefined' ? PG : PAGINI).find((p) => p[0] === k); return modPrev ? `#${k}` : (k === 'acasa' ? (L2 ? `/${L2}` : '/') : `${L2 ? '/' + L2 : ''}/${pg ? pg[2] : k}`); };
  const buton = (cls = '') => `<a class="b ${cls}" href="${esc(href)}"${ct.programare && href === ct.programare ? ' data-m="prog"' : ''}>${tx(btText)}</a>`;
  const lipsesc = [...(Array.isArray(c.lipsesc) ? c.lipsesc : []), ...(firma ? [] : ['numele firmei'])];
  const EXTRA = paginiExtra(site2 ? { site } : c); const PG = [...PAGINI.map(([k, n, sl]) => [k, T(n), sl]), ...EXTRA.map((p) => p.slice(0, 3))];
  const inMeniu = EXTRA.length <= 2 ? EXTRA : [];  // paginile în plus intră în meniu; la Migrare (multe pagini) stau în subsol și în sitemap

  const nav = (activ) => LND ? `<a class="sari" href="#continut">${tx(T('Sari la conținut'))}</a><header class="sus"><div class="w"><span class="marca">${d.logo_url ? `<img src="${esc(d.logo_url)}" alt="${esc(firma)}" height="36">` : tx(firma)}</span>${lndExpirat ? '' : buton('mic')}</div></header>` : `<a class="sari" href="#continut">${tx(T('Sari la conținut'))}</a><header class="sus"><div class="w"><a class="marca" href="${lnk('acasa')}">${d.logo_url ? `<img src="${esc(d.logo_url)}" alt="${esc(firma)}" height="36">` : tx(firma)}</a><nav class="nav" aria-label="${esc(T('Meniu'))}">${[...PG.slice(0, 4), ...inMeniu].map(([k, n]) => `<a href="${lnk(k)}" class="${k === activ ? 'on' : ''}"${k === activ ? ' aria-current="page"' : ''}>${esc(n)}</a>`).join('')}${buton('mic')}</nav>${buton('mic')}</div></header>`;

  const pgAcasa = () => {
    const I = A.inceput || {}; const dc = A.de_ce || {}; const sv = A.servicii || {}; const cd = A.cum_decurge || {}; const ds = A.despre_scurt || {}; const iq = Array.isArray(A.intrebari) ? A.intrebari : []; const ac = A.contact || {};
    const p0 = poze[0] ? normPoza(poze[0]) : null;
    const erou = N.erou === 'plin'
      ? `<section class="erou plin"><div class="w"><div class="poza">${p0 ? `<img src="${esc(p0.url)}" alt="${esc(p0.alt)}" fetchpriority="high" decoding="async">` : ''}<div class="text"><h1 style="color:#fff">${tx(I.titlu || firma)}</h1><p class="sub" style="color:rgba(255,255,255,.82)">${tx(I.subtitlu || '')}</p><div class="act">${buton()}${ct.telefon ? `<span class="alt" style="color:rgba(255,255,255,.75)">${suna} ${tx(ct.telefon)}</span>` : ''}</div></div></div></div></section>`
      : (() => { const pz = N.erou === 'centrat' && !poze[0] && !modPrev ? '' : poza(poze[0], briefPt('Acas', 'Încep|Inceput|erou|hero'), modPrev, true);
        return `<section class="erou ${N.erou}"><div class="w${una(pz)}"><div><h1>${tx(I.titlu || firma)}</h1><p class="sub">${tx(I.subtitlu || '')}</p><div class="act">${buton()}${ct.telefon ? `<span class="alt">${suna} ${tx(ct.telefon)}</span>` : ''}</div></div>${pz}</div></section>`; })();
    const deCe = Array.isArray(dc.puncte) && dc.puncte.length ? `<section><div class="w"><p class="ochi">${tx(E.de_ce)}</p><h2 class="h2">${tx(dc.titlu || E.de_ce)}</h2><div class="${gn('g3', Math.min(dc.puncte.length, 6))}">${dc.puncte.slice(0, 6).map((p, i) => `<div class="c"><div class="nr" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div><h3>${tx(p.titlu || '')}</h3><p>${tx(p.text || '')}</p></div>`).join('')}</div></div></section>` : '';
    const serv = Array.isArray(sv.lista) && sv.lista.length ? `<section><div class="w"><p class="ochi">${tx(E.servicii)}</p><h2 class="h2">${tx(sv.titlu || E.servicii)}</h2><div class="${gn('g3', Math.min(sv.lista.length, 6))}">${sv.lista.slice(0, 6).map((s) => `<div class="c"><h3>${tx(s.nume || '')}</h3><p>${tx(s.text || '')}</p></div>`).join('')}</div><p style="margin-top:24px"><a class="b gol" href="${lnk('servicii')}">${tx(T('Toate serviciile'))}</a></p></div></section>` : '';
    const cum = Array.isArray(cd.pasi) && cd.pasi.length ? `<section><div class="w"><p class="ochi">${tx(E.cum)}</p><h2 class="h2">${tx(cd.titlu || E.cum)}</h2><div class="pasi">${cd.pasi.slice(0, 4).map((p) => `<div class="pas"><h3>${tx(p.titlu || '')}</h3><p>${tx(p.text || '')}</p></div>`).join('')}</div></div></section>` : '';
    const despre = ds.text ? (() => { const pz = poza(poze[1], briefPt('Acas', 'Despre'), modPrev);
      return pz ? `<section class="despre"><div class="w">${pz}<div><p class="ochi">${tx(T('Despre'))}</p><h2 class="h2">${tx(ds.titlu || T('Despre noi'))}</h2><div class="lead"><p>${nl(ds.text)}</p></div><p style="margin-top:22px"><a class="b gol" href="${lnk('despre')}">${tx(T('Povestea noastră'))}</a></p></div></div></section>`
        : `<section class="despre"><div class="w una ed"><div><p class="ochi">${tx(T('Despre'))}</p><h2 class="h2">${tx(ds.titlu || T('Despre noi'))}</h2></div><div><div class="lead"><p>${nl(ds.text)}</p></div><p style="margin-top:22px"><a class="b gol" href="${lnk('despre')}">${tx(T('Povestea noastră'))}</a></p></div></div></section>`; })() : '';
    const faq = iq.length ? `<section><div class="w"><p class="ochi">${tx(E.intrebari)}</p><h2 class="h2">${tx(E.intrebari)}</h2><div class="faq">${iq.slice(0, 6).map((q) => `<details><summary>${tx(q.q || '')}</summary><p>${tx(q.a || '')}</p></details>`).join('')}</div></div></section>` : '';
    const contact = `<section class="cta"><div class="w"><h2>${tx(ac.titlu || C.titlu || E.contact)}</h2><p>${tx(ac.text || C.text || '')}</p>${buton()}</div></section>`;
    // promoția curentă („Firma ta”, valul 2): o frază, cu data până la care ține; intră doar din Dosar, după verificările dure, și dispare singură după dată
    const pr = A.promotie && typeof A.promotie === 'object' && String(A.promotie.text || '').trim() && (!A.promotie.expira_la || String(A.promotie.expira_la).slice(0, 10) >= String(opt.azi || new Date().toISOString().slice(0, 10)))
      ? `<section class="promo"><div class="w"><p><strong>${tx(String(A.promotie.text).trim())}</strong>${A.promotie.expira_la ? ` <span>până pe ${esc(new Date(String(A.promotie.expira_la).slice(0, 10) + 'T12:00:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }))}</span>` : ''}</p></div></section>` : '';
    return erou + pr + deCe + serv + cum + despre + faq + contact;
  };

  // S2: pe pagina Servicii titlurile coboară h1 → h2 (aceeași mărime vizuală ca înainte)
  const pgServicii = () => {
    const intro = S.intro || {}; const lista = Array.isArray(S.lista) ? S.lista : [];
    // un serviciu fără descriere ar lăsa un card gol: atunci pagina devine listă de prețuri (rânduri), unde descrierea e opțională
    const listaPret = lista.length > 0 && lista.some((s) => !String((s && s.text) || '').trim());
    return `<section class="erou" style="padding-bottom:24px"><div class="w" style="grid-template-columns:1fr"><div><p class="ochi">${tx(E.servicii)}</p><h1 style="font-size:clamp(32px,4.6vw,52px)">${tx(intro.titlu || E.servicii)}</h1><p class="sub">${tx(intro.text || '')}</p></div></div></section>` +
      (listaPret
        ? `<section style="border-top:0;padding-top:0"><div class="w"><div class="lp">${lista.map((s) => `<div class="r" id="${slugify(s.nume)}"><h2 class="t3">${tx(s.nume || '')}</h2>${s.pret ? `<p class="pret">${tx(s.pret)}</p>` : ''}${String(s.text || '').trim() ? `<p>${nl(s.text)}</p>` : ''}</div>`).join('')}</div></div></section>`
        : `<section style="border-top:0;padding-top:0"><div class="w"><div class="g2" style="margin-top:0">${lista.map((s) => `<div class="c" id="${slugify(s.nume)}"><h2 class="t3">${tx(s.nume || '')}</h2><p>${nl(s.text || '')}</p>${s.pret ? `<p class="pret">${tx(s.pret)}</p>` : ''}</div>`).join('')}</div></div></section>`) +
      `<section class="cta"><div class="w"><h2>${tx(C.titlu || E.contact)}</h2><p>${tx(C.text || '')}</p>${buton()}</div></section>`;
  };

  const pgDespre = () => {
    const pv = D.povestea || {}; const cl = D.cum_lucram || {}; const cc = D.cu_cine || {};
    // poza de pe Despre e a doua poză din Dosar; fără ea, pagina stă pe o coloană (nu repetăm poza din erou: c1-28, c1-29)
    const pz = poza(poze[1], briefPt('Despre', 'Poveste|Despre|echip'), modPrev, true);
    return (pz ? `<section class="despre"><div class="w"><div><p class="ochi">${tx(T('Despre'))}</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${tx(pv.titlu || T('Povestea noastră'))}</h1><div class="lead"><p>${nl(pv.text || '')}</p></div></div>${pz}</div></section>`
      : `<section class="despre"><div class="w una ed"><div><p class="ochi">${tx(T('Despre'))}</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${tx(pv.titlu || T('Povestea noastră'))}</h1></div><div class="lead"><p>${nl(pv.text || '')}</p></div></div></section>`) +
      (Array.isArray(cl.puncte) && cl.puncte.length ? `<section><div class="w"><p class="ochi">${tx(E.cum)}</p><h2 class="h2">${tx(cl.titlu || E.cum)}</h2><div class="${gn('g3', Math.min(cl.puncte.length, 6))}">${cl.puncte.slice(0, 6).map((p) => `<div class="c"><h3>${tx(p.titlu || '')}</h3><p>${tx(p.text || '')}</p></div>`).join('')}</div></div></section>` : '') +
      (cc.text ? `<section><div class="w"><p class="ochi">${tx(T('Pentru cine'))}</p><h2 class="h2">${tx(cc.titlu || T('Cu cine lucrăm'))}</h2><div class="lead"><p>${nl(cc.text)}</p></div></div></section>` : '') +
      `<section class="cta"><div class="w"><h2>${tx(C.titlu || E.contact)}</h2><p>${tx(C.text || '')}</p>${buton()}</div></section>`;
  };

  // formularul pe email (valul 0, G2): apare doar dacă există politica de confidențialitate a clientului (L5); bifa de marketing nu există aici.
  // Fără JavaScript (F12): validarea o face browserul (required, type, pattern), iar serverul o reface. Capcana (F13) e un câmp ascuns oamenilor.
  const politica = politica0;
  // în previzualizare pagina generată e un ecran al aceluiași document (#politica); pe domeniu e pagina ei
  const polHref = polAuto && modPrev ? (LND ? '#' : '#politica') : politica;
  const medical = String(d.reglementat || (d.identitate && d.identitate.reglementat) || '') === 'medical';
  const F = opt.formular && eOkPol(politica) ? opt.formular : null;
  const formular = () => {
    if (!F && !(modPrev && politica)) return '';
    const dez = modPrev ? ' disabled' : '';
    const t = (tu, dvs) => T(formal ? dvs : tu);
    const camp = (id, et, extra) => `<label for="f-${id}">${esc(T(et))}<input id="f-${id}" name="${id}"${extra}${dez}></label>`;
    const campuri = medical
      ? `${camp('nume', 'Nume', ' required minlength="2" maxlength="80" autocomplete="name"')}${camp('telefon', 'Telefon', ' type="tel" required pattern="[0-9 +().-]{9,20}" inputmode="tel" autocomplete="tel"')}<label for="f-interval">${t('Când te sunăm', 'Când vă sunăm')}<select id="f-interval" name="interval"${dez}><option value="oricand">${esc(T('Oricând'))}</option><option value="dimineata">${esc(T('Dimineața'))}</option><option value="dupa_amiaza">${esc(T('După-amiaza'))}</option></select></label><p class="avert">${t('Nu scrie aici detalii despre sănătatea ta. Te sunăm noi.', 'Nu scrieți aici detalii despre sănătatea dumneavoastră. Vă sunăm noi.')}</p>`
      : `${camp('nume', 'Nume', ' required minlength="2" maxlength="80" autocomplete="name"')}${camp('telefon', 'Telefon', ' type="tel" pattern="[0-9 +().-]{9,20}" inputmode="tel" autocomplete="tel"')}${camp('email', 'Email', ' type="email" maxlength="120" autocomplete="email"')}<label for="f-mesaj">${esc(T('Mesaj'))}<textarea id="f-mesaj" name="mesaj" rows="4" maxlength="1500"${dez}></textarea></label><p class="nota">${t('Lasă un telefon sau un email, ca să-ți putem răspunde.', 'Lăsați un telefon sau un email, ca să vă putem răspunde.')}</p>`;
    const acord = `<label class="acord" for="f-acord"><input type="checkbox" id="f-acord" name="acord" value="da" required${dez}><span>${UI ? `${tx(T('Sunt de acord'))} ${tx(firma)} ${tx(T('să mă contacteze pe baza acestor date. Detalii în'))} <a href="${esc(polHref)}" rel="noopener">${tx(T('politica de confidențialitate'))}</a>.` : `${t('Sunt de acord', 'Sunt de acord')} ca ${tx(firma)} să ${t('mă', 'mă')} contacteze pe baza acestor date. Detalii în <a href="${esc(polHref)}" rel="noopener">politica de confidențialitate</a>.`}</span></label>`;
    const ascunse = F ? `<input type="hidden" name="s" value="${esc(F.site || '')}"><div class="capcana" aria-hidden="true"><label for="f-website">${esc(T('Lasă gol'))}</label><input id="f-website" name="website" tabindex="-1" autocomplete="off"></div>` : '';
    return `<form class="form" method="post" action="${esc(F ? F.actiune : '#')}" accept-charset="utf-8">${ascunse}${campuri}${acord}<button class="b" type="submit"${dez}>${esc(T('Trimite'))}</button>${modPrev ? `<p class="nota">${esc(T('Formularul pornește după publicare.'))}</p>` : ''}</form>`;
  };
  const pg404 = () => `<section class="contact"><div class="w"><div><p class="ochi">404</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${t2('Pagina nu există.', 'Pagina nu există.')}</h1><div class="lead"><p>${t2('Adresa s-a schimbat sau are o greșeală. Găsești totul pornind de pe pagina principală.', 'Adresa s-a schimbat sau are o greșeală. Găsiți totul pornind de pe pagina principală.')}</p></div><p style="margin-top:26px"><a class="b" href="/">Pagina principală</a></p></div></div></section>`;
  const pgMultumim = () => `<section class="contact"><div class="w"><div><p class="ochi">${tx(E.contact)}</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${t2('Mulțumim! Am primit mesajul tău.', 'Mulțumim! Am primit mesajul dumneavoastră.')}</h1><div class="lead"><p>${t2('Revenim la tine cât mai repede.', 'Revenim cât mai repede.')}</p></div><p style="margin-top:26px"><a class="b gol" href="${lnk('acasa')}">Înapoi pe pagina principală</a></p></div></div></section>`;
  const pgPolitica = () => `<section class="despre"><div class="w" style="grid-template-columns:1fr"><div><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">Politica de confidențialitate</h1><div class="lead md">${mdHtml(textPolitica(d, { medical: String(d.reglementat || (d.identitate && d.identitate.reglementat) || '') === 'medical', tel: ct.telefon, email: String(d.email || (d.identitate && (d.identitate.email_formular || d.identitate.email)) || ct.email || '').trim(), data: dataRoL(d.identitate && d.identitate.politica_data) }))}</div></div></div></section>`;
  const pgContact = () => {
    const rand = (k, v, h) => (v ? `<div><span>${esc(k)}</span><b>${h ? `<a href="${esc(h)}">${tx(v)}</a>` : tx(v)}</b></div>` : '');
    // programul: rândurile din Dosar rămân rânduri, iar un interval orar nu se rupe (c1-21, c1-32)
    const randProgram = (k, v) => (v ? `<div><span>${esc(k)}</span><b class="randuri">${tx(v).replace(/\s*\n+\s*/g, '<br>').replace(/(\d{1,2}[:.]\d{2}–\d{1,2}[:.]\d{2})/g, '<span class="nw">$1</span>')}</b></div>` : '');
    return `<section class="contact"><div class="w"><div><p class="ochi">${tx(E.contact)}</p><h1 style="font-size:clamp(32px,4.6vw,52px);margin-bottom:16px">${tx(C.titlu || E.contact)}</h1><div class="lead"><p>${nl(C.text || '')}</p></div><p style="margin-top:26px">${buton()}</p>${formular()}</div><div class="date">${rand(T('Telefon'), ct.telefon, ct.telefon ? `tel:${telIntl(ct.telefon)}` : '')}${ct.programare ? `<div><span>${tx(T('Programări'))}</span><b><a href="${esc(ct.programare)}" data-m="prog">${tx(T('Programează online'))}</a></b></div>` : ''}${rand(T('Email'), ct.email, ct.email ? `mailto:${ct.email}` : '')}${rand(T('Adresă'), ct.adresa, ct.adresa ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ct.adresa)}` : '')}${randProgram(T('Program'), ct.program)}${modPrev && lipsesc.length ? `<p class="lipsa">Mai lipsesc: ${esc(lipsesc.join(', '))}. Le punem pe site în ziua în care le primim de la tine.</p>` : ''}</div></div></section>`;
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
  // L6: pictograma SAL, 250 × 50 px în pagină (caseta), imaginea oficială de 201 px înăuntru, la 1×–3× (opt.sal = { url, srcset }, din manifestul build-ului)
  const salImg = opt.sal && opt.sal.url ? opt.sal : (opt.sal_img ? { url: String(opt.sal_img), srcset: '' } : null);
  const sal = (L.denumire || L.cui) && L.b2c ? (salImg ? `<a class="sal" href="https://reclamatiisal.anpc.ro/" rel="noopener" target="_blank"><img src="${esc(salImg.url)}"${salImg.srcset ? ` srcset="${esc(salImg.srcset)}"` : ''} width="250" height="50" alt="ANPC · Soluționarea alternativă a litigiilor" loading="lazy" decoding="async"></a>` : `<a href="https://reclamatiisal.anpc.ro/" rel="noopener" target="_blank">ANPC · Soluționarea alternativă a litigiilor</a>`) : '';
  const politicaLink = eOkPol(politica) ? `<a href="${esc(polHref)}" rel="noopener">${tx(T('Politica de confidențialitate'))}</a>` : '';
  // subsolul, pe două rânduri (c2-12, c2-13, c2-30): sus firma și contactul; jos datele legale, politica și pictograma SAL, fiecare la locul ei.
  // Nimic nu se repetă: denumirea legală identică cu firma rămâne doar lângă ©, iar adresa identică cu sediul apare o singură dată, ca „Sediu”.
  const acelasi = (x, y) => !!x && !!y && String(x).toLowerCase().replace(/[^a-z0-9ăâîșț]+/gi, '') === String(y).toLowerCase().replace(/[^a-z0-9ăâîșț]+/gi, '');
  const sediuEAdresa = acelasi(L.sediu, ct.adresa);
  const randLegal = [acelasi(L.denumire, firma) ? '' : L.denumire, L.cui ? `CUI ${L.cui}` : '', L.reg_com, L.sediu ? `Sediu: ${L.sediu}` : ''].filter(Boolean).map((x) => tx(x)).join(' · ');
  const contactSubsol = `${ct.telefon ? `<a href="tel:${esc(telIntl(ct.telefon))}">${tx(ct.telefon)}</a>` : ''}${ct.telefon && ct.email ? ' · ' : ''}${ct.email ? `<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>` : ''}`;
  const legalText = [randLegal, politicaLink].filter(Boolean).join(' · ');
  const subsol = `<footer><div class="w"><div class="f-r"><span>© ${new Date().getFullYear()} ${tx(firma)}${ct.adresa && !(sediuEAdresa && randLegal) ? ` · ${tx(ct.adresa)}` : ''}</span>${contactSubsol ? `<span>${contactSubsol}</span>` : ''}</div>${legalText || sal ? `<div class="f-r f-legal">${legalText ? `<p class="legal">${legalText}</p>` : ''}${sal}</div>` : ''}</div></footer>`;
  const subsolExtra = EXTRA.length > inMeniu.length ? `<nav class="pagini-extra" aria-label="${esc(T('Alte pagini'))}"><div class="w">${EXTRA.filter((x) => !inMeniu.includes(x)).map(([k, n]) => `<a href="${lnk(k)}">${tx(n)}</a>`).join('')}</div></nav>` : '';
  const corp = { acasa: LND ? pgLanding : pgAcasa, servicii: pgServicii, despre: pgDespre, contact: pgContact, multumim: pgMultumim, politica: pgPolitica, '404': pg404 };
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
  // P2/P10: fontul de corp și cel de titlu se preîncarcă (subsetul latin, prima greutate), ca schimbarea de font să nu mute textul după prima vopsire
  const fonturiLocale = (cale) => { const lista = (N.local || []).slice(0, 2);
    // greutatea preîncărcată e cea din primul ecran: titlurile sunt la 600 (h1), corpul la 400; până pe 9 nov. 2026 se preîncărca prima din listă (Fraunces 500, nefolosită în erou)
    const greutate = (f, i) => { const g = f[2] || [400]; const vrea = i === 0 && primaFamilie(N.titlu) === f[1] ? 600 : 400; return g.includes(vrea) ? vrea : g.reduce((a, b) => (Math.abs(b - vrea) < Math.abs(a - vrea) ? b : a), g[0]); };
    const pre = lista.map((f, i) => `<link rel="preload" href="${cale}/${f[0]}/latin-${greutate(f, i)}-normal.woff2" as="font" type="font/woff2" crossorigin>`).join(''); return { link: pre, css: fontFace(N, cale) }; };
  const cap = (meta, extra = '', fl = null) => `<!doctype html>
<html lang="${esc(LANG)}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="${esc(opt.favicon || 'data:,')}">${modPrev ? '<meta name="robots" content="noindex, nofollow">' : ''}
<title>${esc(meta.titlu)}</title>
<meta name="description" content="${esc(meta.descriere)}">
${fl ? fl.link : fonturiGoogle}
<style>${fl ? fl.css + '\n' : ''}${css(N)}</style>${extra}${opt.masurare && !modPrev ? '\n<script src="/_alesign/m.js" defer></script>' : ''}
</head>`;

  if (!modPrev) {
    const [k, n, slug] = opt.pagina === 'multumim' ? ['multumim', 'Mulțumim', 'multumim'] : opt.pagina === 'politica' ? ['politica', 'Politica de confidențialitate', 'politica-de-confidentialitate'] : opt.pagina === '404' ? ['404', 'Pagina nu există', '404'] : (PG.find((p) => p[0] === (opt.pagina || 'acasa')) || PG[0]);
    const paginiL = L2 ? (Array.isArray(c.pagini) ? c.pagini : []).filter((x) => x && String(x.hreflang || '').toLowerCase() === L2).map((x) => ({ ...x, slug: String(x.slug || '').replace(new RegExp(`^/${L2}(?=/|$)`), '') || '/' })) : c.pagini;
    const meta = k === 'politica' ? { titlu: `Politica de confidențialitate · ${firma}`, descriere: `Cum prelucrează ${firma} datele trimise prin formularul de contact.` } : LND ? { titlu: String(c.meta_titlu || c.titlu || firma), descriere: String(c.meta_descriere || c.subtitlu || '').slice(0, 160) } : metaPentru(paginiL, k, n, site, firma);
    if (k === 'politica' && !polAuto) { const e = new Error('politica generată nu e disponibilă'); e.cod = 'LIPSA'; e.lipsesc = lipsuriPolitica(d); throw e; }
    const baza = String(opt.baza || '').replace(/\/+$/, '');
    const urlPt = (lang, sl) => `${baza}${lang === 'ro' ? '' : '/' + lang}${sl ? '/' + sl : (lang === 'ro' ? '/' : '')}`;
    const url = baza ? urlPt(LANG, slug) : '';
    // ML1: hreflang reciproc pe fiecare pagină care există în ambele limbi (și pe paginile în română), cu x-default spre română
    const inLimba = (lang) => lang === 'ro' ? (k.startsWith('x-') ? !!(c.site && c.site.extra && c.site.extra[slug]) : true) : (k.startsWith('x-') ? !!(c.site[lang].extra && c.site[lang].extra[slug]) : true);
    const hreflang = baza && LIMBI.length && !['multumim', 'politica', '404'].includes(k) ? ['ro', ...LIMBI].filter(inLimba).map((lang) => `\n<link rel="alternate" hreflang="${lang}" href="${esc(urlPt(lang, slug))}">`).join('') + `\n<link rel="alternate" hreflang="x-default" href="${esc(urlPt('ro', slug))}">` : '';
    const og = baza ? `
<link rel="canonical" href="${esc(url)}">${hreflang}
<meta property="og:type" content="website"><meta property="og:locale" content="${esc(UI && UI.locale ? UI.locale : 'ro_RO')}"><meta property="og:site_name" content="${esc(firma)}">
<meta property="og:title" content="${esc(meta.titlu)}"><meta property="og:description" content="${esc(meta.descriere)}"><meta property="og:url" content="${esc(url)}">${opt.og_imagine ? `<meta property="og:image" content="${esc(opt.og_imagine)}">` : ''}
${k === 'acasa' ? jsonLd(urlPt(LANG, '')) : ''}` : '';
    const fl = opt.fonturi === null ? null : fonturiLocale(opt.fonturi || '/_f');
    if (k === '404') return `${cap({ titlu: `Pagina nu există · ${firma}`, descriere: '' }, '\n<meta name="robots" content="noindex">', fl)}<body>${nav('')}<main id="continut">${corp['404']()}</main>${subsol}</body></html>`;
    if (k === 'multumim') return `${cap({ titlu: `Mulțumim · ${firma}`, descriere: '' }, '\n<meta name="robots" content="noindex">', fl)}<body>${nav('contact')}<main id="continut">${corp.multumim()}</main>${subsol}</body></html>`;
    return `${cap(meta, og + (lndExpirat ? '\n<meta name="robots" content="noindex">' : ''), fl)}<body>${nav(k)}<main id="continut">${corp[k]()}</main>${subsol}${subsolExtra}</body></html>`;
  }
  // previzualizare: toate paginile într-un singur document; se vede una, după #hash (id-urile sunt „pg-…”, ca browserul să nu sară la ancoră sub antetul lipicios); fără JS se văd toate, în ordine
  const meta = LND ? { titlu: String(c.meta_titlu || c.titlu || firma), descriere: String(c.meta_descriere || c.subtitlu || '') } : metaPentru(c.pagini, 'acasa', T('Acasă'), site, firma);
  const js = `<script>(function(){var P=${JSON.stringify([...PG.map((p) => p[0]), ...(polAuto ? ['politica'] : [])])};function arata(){var h=(location.hash||'#acasa').slice(1);if(P.indexOf(h)<0)h='acasa';P.forEach(function(k){var el=document.getElementById('pg-'+k);if(el)el.style.display=k===h?'block':'none';});document.querySelectorAll('.nav a').forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+h);});window.scrollTo(0,0);}window.addEventListener('hashchange',arata);arata();})();</script>`;
  const bara = `<div class="prev-bara"><span><b>Previzualizare</b><span class="lung"> · așa arată site-ul tău cu textele de acum, pe șablonul „${esc(N.nume)}”. Pozele se pun la final.</span></span>${opt.inapoi ? `<a href="${esc(opt.inapoi)}">Înapoi la spațiul tău</a>` : ''}</div>`;
  return `${cap(meta)}<body>${bara}${nav('acasa')}<main id="continut">${LND ? corp.acasa() : PG.map(([k]) => `<div class="pg" id="pg-${k}">${corp[k]()}</div>`).join('') + (polAuto ? `<div class="pg" id="pg-politica">${corp.politica()}</div>` : '')}</main>${subsol}${subsolExtra}${LND ? '' : js}</body></html>`;
}

// paginile statice pentru găzduire: [{ cale: 'index.html' | 'servicii/index.html' …, html }]
export function paginiStatice(piesa, dosar, opt = {}) {
  const lista = eLanding(piesa) ? [PAGINI[0]] : [...PAGINI, ...paginiExtra(piesa).map((p) => p.slice(0, 3))];
  const out = lista.map(([k, , slug]) => ({ cale: slug ? `${slug}/index.html` : 'index.html', html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: k }) }));
  if (opt.formular) out.push({ cale: 'multumim/index.html', html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: 'multumim' }) });
  if (eAutoPolitica(dosar, { ...opt, mod: 'static' })) out.push({ cale: 'politica-de-confidentialitate/index.html', html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: 'politica' }) });
  // Limbă în plus: paginile celei de-a doua limbi, sub /<cod>/ (aceleași slug-uri; paginile în plus doar dacă sunt traduse)
  if (!eLanding(piesa)) for (const L of limbiDin(piesa)) {
    const extraL = paginiExtra({ site: piesa.site[L] }).map((p) => p.slice(0, 3));
    for (const [k, , slug] of [...PAGINI, ...extraL]) out.push({ cale: `${L}/${slug ? slug + '/' : ''}index.html`, html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: k, limba: L }) });
  }
  if (opt.p404 !== false) out.push({ cale: '404.html', html: randeazaSite(piesa, dosar, { ...opt, mod: 'static', pagina: '404' }) });
  return out;
}
