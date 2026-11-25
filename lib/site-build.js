// Build-ul determinist al unui site pe șablon (Bot Website v5.1, etapa 4): același input dă același hash.
// Ieșirea: fișierele statice ale proiectului Vercel al site-ului (paginile din paginiStatice, 404, robots, sitemap, fonturile, pozele
// copiate în build, manifestul și versiune.json) + vercel.json cu antetele (SEC1) și, la preview, noindex în antet (S4).
// Pozele se copiază în build (V10: niciun URL semnat în HTML), redimensionate și convertite în WebP când există `sharp` (P4), cu dimensiunile declarate.
import { createHash } from 'crypto';
import { paginiStatice, paginiExtra, fisiereFont, NISE, nisaDin, lipsuriPolitica, POLITICA_CALE, SCRIPT_UTM } from './sablon.js';

// F7 / AN2: vizita și conversiile (telefon, WhatsApp, email, programare, formular), fără cookie și fără identificatori; trimise doar la /_m, pe același domeniu
export const SCRIPT_MASURARE = `(function(){try{var t=function(e){var b=JSON.stringify({t:e,p:location.pathname,r:document.referrer||'',h:location.host});if(navigator.sendBeacon)navigator.sendBeacon('/_m',b);else fetch('/_m',{method:'POST',body:b,keepalive:true});};t('pv');document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;var h=a.getAttribute('href')||'';if(/^tel:/i.test(h))t('tel');else if(/wa\\.me|whatsapp/i.test(h))t('wa');else if(/^mailto:/i.test(h))t('email');else if(a.getAttribute('data-m')==='prog'||/calendly|cal\\.com|booksy|fresha|setmore|simplybook|acuity/i.test(h))t('prog');},true);document.addEventListener('submit',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('form'))t('form');},true);}catch(e){}})();
`;
export const EVENIMENTE_MASURARE = ['pv', 'tel', 'wa', 'email', 'prog', 'form'];

// Logoul și faviconul pe site (1.5, 24 nov. 2026). Logoul livrat de noi stă în bucketul „brand” (SQL 111: brand.logo = { bucket, cale, semn, favicon,
// favicon_ico, tip: 'svg', din }); cel păstrat de client stă în „onboarding” (brand.logo = { cale, tip }). SVG-ul se copiază cum e, fără WebP.
// Un SVG intră pe site doar dacă are numai forme: fără scripturi, fără atribute on…, fără fișiere sau adrese din afară.
export function svgProblema(t) {
  const s = Buffer.isBuffer(t) ? t.toString('utf8') : String(t || '');
  if (!/<svg[\s>]/i.test(s)) return 'nu e un fișier SVG';
  if (/<(script|foreignObject|iframe|embed|object|image|audio|video|animate|set)\b/i.test(s)) return 'are elemente care nu sunt forme (script, imagine, animație)';
  if (/\son[a-z]+\s*=/i.test(s) || /javascript:|data:text\/html/i.test(s)) return 'are cod în atribute';
  if (/(?:xlink:)?href\s*=\s*["']\s*(?!#)/i.test(s) || /@import|url\(\s*["']?\s*(?!#)/i.test(s)) return 'cere fișiere din afară';
  return null;
}
// lățimea și înălțimea SVG-ului, din viewBox (sau din width/height); 0 când nu se pot citi
export function svgMarime(t) {
  const s = Buffer.isBuffer(t) ? t.toString('utf8') : String(t || '');
  const vb = s.match(/<svg[^>]*\sviewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (vb) return { w: Math.round(Number(vb[1])), h: Math.round(Number(vb[2])) };
  const w = s.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i); const h = s.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
  return { w: w ? Math.round(Number(w[1])) : 0, h: h ? Math.round(Number(h[1])) : 0 };
}
const eSvg = (p) => /svg/i.test(String((p && p.tip) || '')) || /\.svg(?:[?#]|$)/i.test(String((p && (p.cale || p.url)) || ''));
// căile de semnat pentru logo și favicon (bucketul lor) și obiectele de build, din brand.logo și harta URL-urilor semnate
export function caiLogo(L) {
  if (!L || !L.cale) return { bucket: 'onboarding', cai: [] };
  const bucket = L.bucket === 'brand' ? 'brand' : 'onboarding';
  const web = L.favicon ? String(L.favicon).replace(/[^/]+$/, '') : '';
  return { bucket, cai: [L.cale, L.semn, L.favicon, L.favicon_ico, web ? web + 'apple-touch-icon.png' : null].filter(Boolean) };
}
export function logoPentruBuild(L, urlPe = {}) {
  if (!L || !L.cale || !urlPe[L.cale]) return { logo: null, favicon: null };
  const sursa = L.bucket === 'brand' && L.din !== 'logoul_tau' ? 'grafic' : 'client';
  const tip = eSvg(L) ? 'svg' : (L.tip || '');
  const logo = { id: L.cale, sursa, url: urlPe[L.cale], alt: '', tip };
  const web = L.favicon ? String(L.favicon).replace(/[^/]+$/, '') : '';
  const f = {};
  if (L.favicon && urlPe[L.favicon]) f.svg = { id: L.favicon, sursa, url: urlPe[L.favicon], tip: 'svg' };
  else if (L.semn && urlPe[L.semn]) f.svg = { id: L.semn, sursa, url: urlPe[L.semn], tip: 'svg' };
  if (L.favicon_ico && urlPe[L.favicon_ico]) f.ico = { id: L.favicon_ico, sursa, url: urlPe[L.favicon_ico] };
  if (web && urlPe[web + 'apple-touch-icon.png']) f.apple = { id: web + 'apple-touch-icon.png', sursa, url: urlPe[web + 'apple-touch-icon.png'] };
  return { logo, favicon: Object.keys(f).length ? f : null };
}
// Eticheta de verificare Search Console (121): doar în pagina principală a site-ului publicat, după calculul build-ului (ca Poarta D să compare
// același hash cu sau fără ea); o etichetă veche se înlocuiește
export function cuEtichetaGsc(html, cod) {
  const c = String(cod || '').trim();
  if (!/^[A-Za-z0-9_-]{20,120}$/.test(c)) return html;
  const fara = String(html).replace(/<meta name="google-site-verification" content="[^"]*">/g, '');
  return fara.replace('<head>', `<head><meta name="google-site-verification" content="${c}">`);
}

const sha = (b) => createHash('sha256').update(b).digest('hex');
// IM1 cere sursa cea mai mare ≥ 1,5 × lățimea afișată × DPR: eroul are 358 px la 390 (DPR 3) → 1.611 px. Cu 1.600 pica la 11 px (sarcina 69, ciclul 2);
// 1.920 acoperă și desktopul la DPR 2. Pe telefon browserul ia tot varianta de 1.200 (srcset), deci P4 rămâne în limită.
export const LATIME_MAX = 1920;
// L6: pictograma SAL are lățimea oficială de 201 px (în caseta de 250 × 50); o servim la 1×, 2× și 3× din sursa de 680 px
export const SAL_LATIME = 201;

// serviciile din Dosar · Ofertă: listă [{ nume, pret }] sau, de la pagina de pornire, text cu un serviciu pe rând („Consultație · 250 lei”);
// A1 compară prețurile de pe site cu cele de aici, deci textul trebuie citit la fel ca lista (constatarea 20, sarcina 69)
export function serviciiDin(oferta) {
  const s = (oferta || {}).servicii;
  if (Array.isArray(s)) return s.filter((x) => x && typeof x === 'object');
  return String(s || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(.*?)(?:\s*[·\-–:|]\s*|\s+)((?:de la\s+)?\d[\d.\s]*(?:,\d+)?\s*(?:lei|RON|€|EUR)\b.*)$/i);
    return m ? { nume: m[1].replace(/[·\-–:|\s]+$/, '').trim(), pret: m[2].trim() } : { nume: l };
  });
}
// fapte: ce compară scriptul de QA (A1, A3, L4, L5, RG1), fără date personale
export function fapteQa(dosar) {
  const d = dosar || {}; const i = d.identitate || {}; const o = d.oferta || {};
  const preturi = serviciiDin(o).map((s) => s && s.pret).filter(Boolean).map(String);
  // toate numerele din Dosar (A4: o cifră-fapt de pe site trebuie să apară aici)
  const numere = [...new Set((JSON.stringify({ identitate: i, oferta: o, cifre: d.cifre || {}, brand: d.brand ? { despre: d.brand.despre, poveste: d.brand.poveste } : {} }).match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(/[.,]/g, '')))];
  return { firma: i.firma || d.firma, telefon: i.telefon || d.telefon, email: i.email || d.email, adresa: i.adresa, program: i.program, preturi, numere, programare_app: i.programare_app || (/^https:\/\//.test(String(i.programare_url || '')) ? new URL(i.programare_url).host : null), reglementat: i.reglementat || null, acorduri_recenzii: Array.isArray(i.acorduri_recenzii) ? i.acorduri_recenzii : [],
    legal: d.legal || { denumire: i.denumire_legala, cui: i.cui, reg_com: i.reg_com, sediu: i.sediu }, politica_url: /^auto$/i.test(String(i.politica_confidentialitate || i.politica_url || '')) ? (lipsuriPolitica(d).length ? null : POLITICA_CALE) : (i.politica_confidentialitate || i.politica_url || null), b2c: i.b2c !== false };
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
  // 2b. promoția curentă (valul 2, „Firma ta”): din Dosar · Ofertă, pe pagina de acasă; șablonul o ascunde după data de expirare
  if (p.site.acasa && typeof p.site.acasa === 'object') {
    const pr = o.promotie && typeof o.promotie === 'object' && String(o.promotie.text || '').trim() ? { text: String(o.promotie.text).trim().slice(0, 120), expira_la: String(o.promotie.expira_la || '').slice(0, 10) } : null;
    if (pr) p.site.acasa.promotie = pr; else delete p.site.acasa.promotie;
  }
  // 3. prețurile serviciilor, potrivite după nume (doar ce există în ambele)
  const preturi = new Map(serviciiDin(o).filter((x) => x && x.nume && x.pret).map((x) => [numeServ(x.nume), String(x.pret)]));
  if (preturi.size) for (const lista of [p.site.servicii && p.site.servicii.lista, p.site.acasa && p.site.acasa.servicii && p.site.acasa.servicii.lista]) {
    if (!Array.isArray(lista)) continue;
    for (const sv of lista) { const k = numeServ(sv && sv.nume); if (sv && preturi.has(k) && sv.pret !== undefined) sv.pret = preturi.get(k); }
  }
  return p;
}

// Dosarul de build, din instantaneul sarcinii (detalii.dosar), lead și contract: aceeași funcție pentru api/site-build și pentru oglinda locală de QA,
// ca site-ul măsurat înainte de push să fie cel pe care îl construiește producția (sarcina 69, 9 nov. 2026).
// Datele legale (L4, subsolul, politica): din Dosar; dacă Dosarul nu le are, din contractul semnat (clientul își scrie CUI-ul la semnare).
export function dosarPentruBuild(D, l = {}, K = {}) {
  const I = (D && D.identitate) || {}; const Br = (D && D.brand) || {};
  const legal = I.cui ? { denumire: I.denumire_legala || I.firma, cui: I.cui, reg_com: I.reg_com, sediu: I.sediu, b2c: I.b2c !== false }
    : K.client_cui && K.client_tip !== 'persoana_fizica' ? { denumire: K.client_denumire || I.firma, cui: K.client_cui, reg_com: K.client_regcom || null, sediu: K.client_adresa || null, b2c: I.b2c !== false } : null;
  return { firma: I.firma || l.firma, nisa: I.nisa || l.nisa, identitate: I, legal,
    adresare: Br.adresare || '', telefon: I.telefon, email: I.email, adresa: I.adresa, program: I.program, oferta: D.oferta, cifre: D.cifre, brand: Br };
}
// Pozele de build, în ordinea din Dosar. Textul alternativ: din Dosar (alt, descriere); dacă Dosarul nu-l are, cel scris de bot pentru poza aceea
// (continut.poze[].alt, legat prin sursa „brand.poze[i]”): eroul nu rămâne cu alt gol când textul există deja (AC7, sarcina 69)
export function pozePentruBuild(Br, urlPe, continut = null) {
  const brief = (i) => ((continut && Array.isArray(continut.poze) ? continut.poze : []).find((x) => x && String(x.sursa || '').replace(/\s/g, '') === `brand.poze[${i}]`) || {});
  return (Array.isArray(Br && Br.poze) ? Br.poze : []).filter((p) => p && p.cale).map((p, i) => ({ id: p.id || p.cale, sursa: p.sursa || 'client', licenta: p.licenta || null, oameni: p.oameni, declaratie_oameni: p.declaratie_oameni,
    inainte_dupa: p.inainte_dupa, acord_scris: p.acord_scris, alt: String(p.alt || p.descriere || brief(i).alt || '').trim(), url: urlPe[p.cale] }));
}

/**
 * construiesteSite({ piesa, dosar, baza, preview, formular, poze, logo, sal, aduce, sharp, sarcina, versiune })
 *  sal: Buffer cu pictograma SAL (opțional; fără ea, subsolul are linkul text spre ANPC)
 *  poze: [{ id, sursa: 'client'|'stoc'|'alex'|'grafic', licenta, alt, url | date }] în ordinea din Dosar; logo: idem (opțional)
 *  aduce(url) → Buffer (fonturi, poze); sharp: modulul sharp (opțional)
 * → { fisiere: [{ cale, date: Buffer|string, tip }], build, manifest, fapte }
 */
export async function construiesteSite(o) {
  const { dosar, baza, preview = true, formular = null, aduce, sharp = null } = o;
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
    // SVG (logoul, faviconul): copiat cum e, cu numele din conținut; nu trece prin sharp (ar deveni o poză)
    if (eSvg(p) || /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(Buffer.isBuffer(date) ? date.subarray(0, 300).toString('utf8') : String(date).slice(0, 300))) {
      const problema = svgProblema(date);
      if (problema) { (manifest.respinse = manifest.respinse || []).push({ id_dosar: p.id || null, rol, motiv: problema }); return null; }
      const nume = `img/${sha(date).slice(0, 16)}.svg`; const m = svgMarime(date);
      if (fisiere.some((x) => x.cale === nume)) return { url: '/' + nume, alt: p.alt || '', w: m.w, h: m.h, srcset: '', vector: true }; // același fișier (logoul pătrat e și favicon)
      fisiere.push({ cale: nume, date, tip: 'image/svg+xml' });
      manifest.imagini.push({ fisier: '/' + nume, variante: [{ fisier: '/' + nume, w: m.w, h: m.h }], id_dosar: p.id || null, rol, sursa: p.sursa || null, licenta: p.licenta || null, licentiat_pe: p.licentiat_pe || null,
        oameni: false, declaratie_oameni: null, inainte_dupa: false, acord_scris: null, w: m.w, h: m.h, alt: p.alt || '', vector: true });
      return { url: '/' + nume, alt: p.alt || '', w: m.w, h: m.h, srcset: '', vector: true };
    }
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
  // faviconul din kitul logoului: favicon.ico la rădăcină (browserele îl cer singure), SVG-ul și iconița Apple în /img; o piesă care lipsește se sare.
  // Fără kit, un logo SVG aproape pătrat (cel mult 1,25 : 1) ține loc de favicon; un logo lat nu, s-ar vedea ca o linie.
  const favicon = {};
  const fo = o.favicon || {};
  if (fo.ico) { try { const b = fo.ico.date || await aduce(fo.ico.url); fisiere.push({ cale: 'favicon.ico', date: b, tip: 'image/x-icon' }); favicon.ico = '/favicon.ico';
    manifest.imagini.push({ fisier: '/favicon.ico', variante: [{ fisier: '/favicon.ico', w: 48, h: 48 }], id_dosar: fo.ico.id || null, rol: 'favicon', sursa: fo.ico.sursa || null, licenta: null, oameni: false, w: 48, h: 48, alt: '' }); } catch (e) { /* fără .ico: rămâne SVG-ul */ } }
  if (fo.svg) { try { const x = await copiaza({ ...fo.svg, tip: 'svg', alt: '' }, 'favicon'); if (x) favicon.svg = x.url; } catch (e) { /* fără SVG */ } }
  if (fo.apple) { try { const b = fo.apple.date || await aduce(fo.apple.url); const nume = `img/${sha(b).slice(0, 16)}.png`; fisiere.push({ cale: nume, date: b, tip: 'image/png' }); favicon.apple = '/' + nume;
    manifest.imagini.push({ fisier: '/' + nume, variante: [{ fisier: '/' + nume, w: 180, h: 180 }], id_dosar: fo.apple.id || null, rol: 'favicon', sursa: fo.apple.sursa || null, licenta: null, oameni: false, w: 180, h: 180, alt: '' }); } catch (e) { /* fără iconița Apple */ } }
  if (!favicon.svg && !favicon.ico && logo && logo.vector && logo.w && logo.h && Math.max(logo.w, logo.h) / Math.min(logo.w, logo.h) <= 1.25) favicon.svg = logo.url;
  const poze = [];
  for (const p of o.poze || []) poze.push(await copiaza(p, 'poza'));
  // L6: pictograma SAL (ANPC) e o imagine a build-ului ca oricare alta: în manifest, cu sursă (D1), în WebP (P4), în hash-ul build-ului (V5).
  // Până pe 9 nov. 2026 era adăugată după build, ca PNG, în afara manifestului: D1 și P4 picau pe toate paginile (sarcina 69, ciclul 2).
  let sal = o.salImg ? { url: String(o.salImg), srcset: '' } : null;
  if (o.sal && Buffer.isBuffer(o.sal) && o.sal.length) {
    const intrare = { rol: 'pictograma', sursa: 'grafic', licenta: 'pictograma oficială ANPC · SAL (anpc.ro/sal)', id_dosar: null, alt: 'ANPC · Soluționarea alternativă a litigiilor' };
    if (sharp) {
      const variante = [];
      for (const k of [1, 2, 3]) {
        const iesit = await sharp(o.sal, { failOn: 'none' }).resize({ width: SAL_LATIME * k, withoutEnlargement: true }).webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
        const nume = `img/${sha(iesit.data).slice(0, 16)}.webp`;
        if (variante.some((v) => v.fisier === '/' + nume)) continue;
        fisiere.push({ cale: nume, date: iesit.data, tip: 'image/webp' });
        variante.push({ fisier: '/' + nume, w: iesit.info.width, h: iesit.info.height, x: k });
      }
      const mare = variante[variante.length - 1];
      manifest.imagini.push({ fisier: variante[0].fisier, variante, ...intrare, w: mare.w, h: mare.h });
      sal = { url: variante[0].fisier, srcset: variante.length > 1 ? variante.map((v) => `${v.fisier} ${v.x}x`).join(', ') : '' };
    } else {
      const nume = `img/${sha(o.sal).slice(0, 16)}.png`;
      fisiere.push({ cale: nume, date: o.sal, tip: 'image/png' });
      manifest.imagini.push({ fisier: '/' + nume, variante: [{ fisier: '/' + nume, w: 0, h: 0 }], ...intrare, w: 0, h: 0 });
      sal = { url: '/' + nume, srcset: '' };
    }
  }
  const dosarRandare = { ...dosar, logo_url: logo ? logo.url : '', poze };
  // paginile sunt aceleași pe preview și pe domeniu (canonical, Open Graph, JSON-LD spre domeniul final): clientul aprobă exact ce se publică (V5);
  // preview-ul primește doar noindex (meta + antet) și robots „Disallow”, care nu intră în hash-ul build-ului
  // măsurarea fără cookie (masurare-site): un script mic de pe domeniu trimite evenimentele la /_m, rescris de Vercel spre endpoint-ul central
  const masurare = /^https:\/\//.test(String(o.masurare || '')) ? String(o.masurare) : null;
  const opt = { baza, fonturi: '/_f', og_imagine: poze[0] && baza ? `${baza}${poze[0].url}` : '', formular, sal, ...(Object.keys(favicon).length ? { favicon } : {}), ...(o.retras ? { retras: true } : {}), ...(masurare ? { masurare: true } : {}) };
  if (masurare) fisiere.push({ cale: '_alesign/m.js', date: SCRIPT_MASURARE, tip: 'application/javascript' });
  // sursa cererii (funnel, etapa 1): scriptul care pune etichetele utm_* din adresă în formular; doar unde există formularul
  if (formular) { fisiere.push({ cale: '_alesign/u.js', date: SCRIPT_UTM, tip: 'application/javascript' }); manifest.utm = { script: '/_alesign/u.js', campuri: 'utm_*', stocare: false }; }
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
  // eticheta Search Console: pe pagina principală publicată, în afara hash-ului (ca noindex-ul de preview)
  if (!preview && o.gscMeta) for (const f of paginiHtml) if (f.cale === 'index.html') f.date = cuEtichetaGsc(f.date, o.gscMeta);
  fisiere.push({ cale: 'robots.txt', date: preview || !baza ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${baza}/sitemap.xml\n`, tip: 'text/plain' });
  // antetele proiectului (SEC1, S4); formularul trimite spre endpoint-ul central (form-action)
  const formHost = formular && /^https?:\/\//.test(formular.actiune) ? new URL(formular.actiune).origin : '';
  // preview-ul se vede încadrat în „Site-ul meu” (spațiul clientului, alt domeniu): doar acolo frame-ancestors îl permite; pe domeniu rămâne 'self' + X-Frame-Options
  const spatiu = preview ? String(o.spatiuOrigine || 'https://demo.alesign.net').replace(/\/+$/, '') : '';
  const csp = `default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src ${masurare || formular ? "'self'" : "'none'"};${masurare ? " connect-src 'self';" : ''} base-uri 'self'; form-action 'self'${formHost ? ' ' + formHost : ''}; frame-ancestors 'self'${spatiu ? ' ' + spatiu : ''}; object-src 'none'`;
  const antete = [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ...(spatiu ? [] : [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]), { key: 'Content-Security-Policy', value: csp }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }, ...(preview ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : [])];
  fisiere.push({ cale: 'vercel.json', date: JSON.stringify({ cleanUrls: true, trailingSlash: false, ...(redirects.length ? { redirects } : {}), ...(masurare ? { rewrites: [{ source: '/_m', destination: masurare }] } : {}), headers: [{ source: '/(.*)', headers: antete }, { source: '/_f/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }, { source: '/img/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }] }, null, 1), tip: 'application/json' });
  fisiere.push({ cale: 'versiune.json', date: JSON.stringify({ build, sarcina: o.sarcina || null, versiune: o.versiune || null }), tip: 'application/json' });
  return { fisiere, build, manifest, fapte: fapteQa(dosar) };
}
