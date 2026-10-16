// Build-ul determinist al unui site pe șablon (Bot Website v5.1, etapa 4): același input dă același hash.
// Ieșirea: fișierele statice ale proiectului Vercel al site-ului (paginile din paginiStatice, 404, robots, sitemap, fonturile, pozele
// copiate în build, manifestul și versiune.json) + vercel.json cu antetele (SEC1) și, la preview, noindex în antet (S4).
// Pozele se copiază în build (V10: niciun URL semnat în HTML), redimensionate și convertite în WebP când există `sharp` (P4), cu dimensiunile declarate.
import { createHash } from 'crypto';
import { paginiStatice, paginiExtra, fisiereFont, NISE, nisaDin } from './sablon.js';

// F7 / AN2: vizita și conversiile (telefon, WhatsApp, email, programare, formular), fără cookie și fără identificatori; trimise doar la /_m, pe același domeniu
export const SCRIPT_MASURARE = `(function(){try{var t=function(e){var b=JSON.stringify({t:e,p:location.pathname,r:document.referrer||'',h:location.host});if(navigator.sendBeacon)navigator.sendBeacon('/_m',b);else fetch('/_m',{method:'POST',body:b,keepalive:true});};t('pv');document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;var h=a.getAttribute('href')||'';if(/^tel:/i.test(h))t('tel');else if(/wa\\.me|whatsapp/i.test(h))t('wa');else if(/^mailto:/i.test(h))t('email');else if(a.getAttribute('data-m')==='prog'||/calendly|cal\\.com|booksy|fresha|setmore|simplybook|acuity/i.test(h))t('prog');},true);document.addEventListener('submit',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('form'))t('form');},true);}catch(e){}})();
`;
export const EVENIMENTE_MASURARE = ['pv', 'tel', 'wa', 'email', 'prog', 'form'];

const sha = (b) => createHash('sha256').update(b).digest('hex');
const LATIME_MAX = 1600;   // eroul are cel mult ~800 px afișați pe desktop: 2× (P4); pe mobil DPR 3 la 390 px = 1170 (IM1)

// fapte: ce compară scriptul de QA (A1, A3, L4, L5, RG1), fără date personale
export function fapteQa(dosar) {
  const d = dosar || {}; const i = d.identitate || {}; const o = d.oferta || {};
  const preturi = (Array.isArray(o.servicii) ? o.servicii : []).map((s) => s && s.pret).filter(Boolean).map(String);
  // toate numerele din Dosar (A4: o cifră-fapt de pe site trebuie să apară aici)
  const numere = [...new Set((JSON.stringify({ identitate: i, oferta: o, cifre: d.cifre || {}, brand: d.brand ? { despre: d.brand.despre, poveste: d.brand.poveste } : {} }).match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(/[.,]/g, '')))];
  return { firma: i.firma || d.firma, telefon: i.telefon || d.telefon, email: i.email || d.email, adresa: i.adresa, program: i.program, preturi, numere, programare_app: i.programare_app || (/^https:\/\//.test(String(i.programare_url || '')) ? new URL(i.programare_url).host : null), reglementat: i.reglementat || null, acorduri_recenzii: Array.isArray(i.acorduri_recenzii) ? i.acorduri_recenzii : [],
    legal: d.legal || { denumire: i.denumire_legala, cui: i.cui, reg_com: i.reg_com, sediu: i.sediu }, politica_url: i.politica_confidentialitate || i.politica_url || null, b2c: i.b2c !== false };
}

// Faptele din Dosar peste conținut (site-actualizare, „Firma ta”): contactul (telefon, email, adresă, program) și prețurile serviciilor potrivite după nume vin din Dosar;
// un telefon sau un email schimbat se înlocuiește și în texte (forma veche → cea nouă). Determinist: același Dosar → același build (V5).
const cifre = (x) => String(x || '').replace(/\D/g, '').replace(/^(?:0040|40)/, '0');
const numeServ = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export function aplicaFapte(piesa, dosar, anterior = null) {
  if (!piesa || typeof piesa !== 'object' || !piesa.site) return piesa;
  const i = (dosar && dosar.identitate) || {}; const o = (dosar && dosar.oferta) || {}; const a = (anterior && anterior.identitate) || {};
  let p = JSON.parse(JSON.stringify(piesa));
  // 1. telefonul / emailul vechi din texte → cele noi (doar când Dosarul anterior e cunoscut și diferă)
  const inloc = [];
  if (a.telefon && i.telefon && cifre(a.telefon) !== cifre(i.telefon) && cifre(a.telefon).length >= 9) inloc.push([cifre(a.telefon), String(i.telefon)]);
  if (a.email && i.email && String(a.email).toLowerCase() !== String(i.email).toLowerCase()) inloc.push([String(a.email), String(i.email)]);
  if (inloc.length) {
    const umbla = (v) => {
      if (typeof v === 'string') {
        let t = v;
        for (const [vechi, nou] of inloc) {
          if (/^\d+$/.test(vechi)) { const re = new RegExp(`(?:\\+?40|0040|0)\\s?${vechi.slice(1).split('').join('[\\s.\\-]?')}`, 'g'); t = t.replace(re, nou); }
          else t = t.split(vechi).join(nou);
        }
        return t;
      }
      if (Array.isArray(v)) return v.map(umbla);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, umbla(x)]));
      return v;
    };
    p = umbla(p);
  }
  // 2. contactul structurat: din Dosar
  for (const loc of [p.site.contact, p.site.acasa && p.site.acasa.contact]) {
    if (!loc || typeof loc !== 'object') continue;
    for (const k of ['telefon', 'email', 'adresa', 'program']) if (String(i[k] || '').trim()) loc[k] = String(i[k]).trim();
  }
  // 3. prețurile serviciilor, potrivite după nume (doar ce există în ambele)
  const preturi = new Map((Array.isArray(o.servicii) ? o.servicii : []).filter((x) => x && x.nume && x.pret).map((x) => [numeServ(x.nume), String(x.pret)]));
  if (preturi.size) for (const lista of [p.site.servicii && p.site.servicii.lista, p.site.acasa && p.site.acasa.servicii && p.site.acasa.servicii.lista]) {
    if (!Array.isArray(lista)) continue;
    for (const sv of lista) { const k = numeServ(sv && sv.nume); if (sv && preturi.has(k) && sv.pret !== undefined) sv.pret = preturi.get(k); }
  }
  return p;
}

/**
 * construiesteSite({ piesa, dosar, baza, preview, formular, poze, logo, salImg, aduce, sharp, sarcina, versiune })
 *  poze: [{ id, sursa: 'client'|'stoc'|'alex'|'grafic', licenta, alt, url | date }] în ordinea din Dosar; logo: idem (opțional)
 *  aduce(url) → Buffer (fonturi, poze); sharp: modulul sharp (opțional)
 * → { fisiere: [{ cale, date: Buffer|string, tip }], build, manifest, fapte }
 */
export async function construiesteSite(o) {
  const { dosar, baza, preview = true, formular = null, aduce, sharp = null, salImg = null } = o;
  const piesa = aplicaFapte(o.piesa, dosar, o.dosarAnterior || null);
  const fisiere = []; const manifest = { imagini: [], fonturi: [] };
  const N = NISE[nisaDin({ nisa: dosar.nisa || (dosar.identitate && dosar.identitate.nisa), firma: dosar.firma || (dosar.identitate && dosar.identitate.firma) })];
  // fonturile, de pe domeniul site-ului (L3): fișierele fontsource ale înfățișării (OFL)
  for (const f of fisiereFont(N)) {
    const date = await aduce(`https://cdn.jsdelivr.net/fontsource/fonts/${f.id}@latest/${f.fisier}`);
    fisiere.push({ cale: `_f/${f.id}/${f.fisier}`, date, tip: 'font/woff2' });
    if (!manifest.fonturi.some((x) => x.id === f.id)) manifest.fonturi.push({ id: f.id, familie: f.fam, licenta: 'OFL-1.1', sursa: 'fontsource' });
  }
  // pozele: copiate în build, cu numele din conținut (același input → același fișier)
  const copiaza = async (p, rol) => {
    let date = p.date || await aduce(p.url);
    let ext = 'jpg'; let w = 0; let h = 0;
    let variante = [];
    if (sharp) {
      // variantele pentru srcset (P4: browserul ia cel mult ~2× cât afișează; IM1: sursa cea mai mare rămâne ≥ 1,5× la DPR 3)
      const meta = await sharp(date, { failOn: 'none' }).metadata();
      const maxim = Math.min(meta.width || LATIME_MAX, rol === 'logo' ? 600 : LATIME_MAX);
      const latimi = rol === 'logo' ? [maxim] : [...new Set([480, 800, 1200, maxim].filter((x) => x <= maxim))];
      for (const lat of latimi) {
        // fără metadate EXIF (D7): sharp nu le copiază decât la cerere
        const iesit = await sharp(date, { failOn: 'none' }).rotate().resize({ width: lat, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
        const nume = `img/${sha(iesit.data).slice(0, 16)}.webp`;
        fisiere.push({ cale: nume, date: iesit.data, tip: 'image/webp' });
        variante.push({ fisier: '/' + nume, w: iesit.info.width, h: iesit.info.height });
      }
      ext = 'webp';
    } else {
      const nume = `img/${sha(date).slice(0, 16)}.${ext}`;
      fisiere.push({ cale: nume, date, tip: 'image/jpeg' });
      variante = [{ fisier: '/' + nume, w: 0, h: 0 }];
    }
    const mare = variante[variante.length - 1]; const implicit = variante.find((v) => v.w >= 800) || mare;
    w = mare.w; h = mare.h;
    manifest.imagini.push({ fisier: implicit.fisier, variante, id_dosar: p.id || null, rol, sursa: p.sursa || null, licenta: p.licenta || null, licentiat_pe: p.licentiat_pe || null,
      oameni: p.oameni == null ? null : !!p.oameni, declaratie_oameni: p.declaratie_oameni || null, inainte_dupa: !!p.inainte_dupa, acord_scris: p.acord_scris || null, w, h, alt: p.alt || '' });
    return { url: implicit.fisier, alt: p.alt || '', w: implicit.w, h: implicit.h, srcset: variante.length > 1 ? variante.map((v) => `${v.fisier} ${v.w}w`).join(', ') : '' };
  };
  const logo = o.logo ? await copiaza(o.logo, 'logo') : null;
  const poze = [];
  for (const p of o.poze || []) poze.push(await copiaza(p, 'poza'));
  const dosarRandare = { ...dosar, logo_url: logo ? logo.url : '', poze };
  // paginile sunt aceleași pe preview și pe domeniu (canonical, Open Graph, JSON-LD spre domeniul final): clientul aprobă exact ce se publică (V5);
  // preview-ul primește doar noindex (meta + antet) și robots „Disallow”, care nu intră în hash-ul build-ului
  // măsurarea fără cookie (masurare-site): un script mic de pe domeniu trimite evenimentele la /_m, rescris de Vercel spre endpoint-ul central
  const masurare = /^https:\/\//.test(String(o.masurare || '')) ? String(o.masurare) : null;
  const opt = { baza, fonturi: '/_f', og_imagine: poze[0] && baza ? `${baza}${poze[0].url}` : '', formular, sal_img: salImg, ...(o.retras ? { retras: true } : {}), ...(masurare ? { masurare: true } : {}) };
  if (masurare) fisiere.push({ cale: '_alesign/m.js', date: SCRIPT_MASURARE, tip: 'application/javascript' });
  if (masurare) manifest.masurare = { endpoint: '/_m', evenimente: EVENIMENTE_MASURARE, cookie: false };
  const paginiHtml = paginiStatice(piesa, dosarRandare, opt).map((p) => ({ cale: p.cale, date: p.html, tip: 'text/html; charset=utf-8' }));
  fisiere.push(...paginiHtml);
  // sitemap-ul: paginile publicate (fără 404 și fără mulțumim), inclusiv paginile în plus; la Landing, una singură
  const pagini = paginiHtml.filter((p) => !/^(404\.html|multumim\/)/.test(p.cale)).map((p) => p.cale.replace(/index\.html$/, '').replace(/\/$/, ''));
  if (baza) fisiere.push({ cale: 'sitemap.xml', date: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pagini.map((x) => `  <url><loc>${baza}/${x}</loc></url>`).join('\n')}\n</urlset>\n`, tip: 'application/xml' });
  // S8: adresele vechi cu trafic → 301 spre pagina care le acoperă subiectul (site.extra.<slug>.redirect_de_la, de la Migrare)
  const redirects = paginiExtra(piesa).flatMap(([, , slug, p]) => (Array.isArray(p.redirect_de_la) ? p.redirect_de_la : []).map((v) => String(v || '').trim()).filter((v) => /^\/[^\s?#]*$/.test(v) && v !== `/${slug}`).slice(0, 50).map((v) => ({ source: v, destination: `/${slug}`, permanent: true })));
  if (redirects.length) manifest.redirects = redirects.map((x) => ({ source: x.source, destination: x.destination }));
  fisiere.push({ cale: '_alesign/manifest.json', date: JSON.stringify(manifest, null, 1), tip: 'application/json' });
  // hash-ul build-ului: din conținut (pagini, fonturi, poze, manifest, sitemap), sortat; fără comutatoarele de indexare (V5: același build pe preview și pe domeniu)
  const build = sha(fisiere.slice().sort((a, b) => a.cale.localeCompare(b.cale)).map((f) => f.cale + ':' + sha(Buffer.isBuffer(f.date) ? f.date : Buffer.from(f.date))).join('\n')).slice(0, 20);
  if (preview) for (const f of paginiHtml) f.date = f.date.replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');
  fisiere.push({ cale: 'robots.txt', date: preview || !baza ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${baza}/sitemap.xml\n`, tip: 'text/plain' });
  // antetele proiectului (SEC1, S4); formularul trimite spre endpoint-ul central (form-action)
  const formHost = formular && /^https?:\/\//.test(formular.actiune) ? new URL(formular.actiune).origin : '';
  // preview-ul se vede încadrat în „Site-ul meu” (spațiul clientului, alt domeniu): doar acolo frame-ancestors îl permite; pe domeniu rămâne 'self' + X-Frame-Options
  const spatiu = preview ? String(o.spatiuOrigine || 'https://demo.alesign.net').replace(/\/+$/, '') : '';
  const csp = `default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src ${masurare ? "'self'" : "'none'"};${masurare ? " connect-src 'self';" : ''} base-uri 'self'; form-action 'self'${formHost ? ' ' + formHost : ''}; frame-ancestors 'self'${spatiu ? ' ' + spatiu : ''}; object-src 'none'`;
  const antete = [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ...(spatiu ? [] : [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]), { key: 'Content-Security-Policy', value: csp }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }, ...(preview ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : [])];
  fisiere.push({ cale: 'vercel.json', date: JSON.stringify({ cleanUrls: true, trailingSlash: false, ...(redirects.length ? { redirects } : {}), ...(masurare ? { rewrites: [{ source: '/_m', destination: masurare }] } : {}), headers: [{ source: '/(.*)', headers: antete }, { source: '/_f/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }, { source: '/img/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }] }, null, 1), tip: 'application/json' });
  fisiere.push({ cale: 'versiune.json', date: JSON.stringify({ build, sarcina: o.sarcina || null, versiune: o.versiune || null }), tip: 'application/json' });
  return { fisiere, build, manifest, fapte: fapteQa(dosar) };
}
