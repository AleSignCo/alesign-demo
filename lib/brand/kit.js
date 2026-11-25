// Brand kitul · din identitatea aprobată (botul Identitate, SQL 55 + 106) și din logoul final al firmei (kitul logoului):
// ghidul brandului (8 pagini, A4: fișierele, culorile cu contrastul măsurat, fonturile cu rezervele pentru Word, Docs și Canva,
// vocea cu rescrierile pe textele firmei, fotografiile, logoul și profilurile), poza de profil și coperta doar pentru canalele
// pe care firma le folosește (din Dosar), fonturile cu licența OFL, culorile într-un fișier text și arhiva ZIP.
// Cartea de vizită, semnătura de e-mail, antetul și șablonul de postare se primesc acum și vin înapoi la „amanate” (26–28 nov.).
// Nu atinge rețeaua: citirea logoului și urcarea le face api/brand-kit.js.
import { PDFDocument, rgb } from 'pdf-lib';
import fontkitPdf from '@pdf-lib/fontkit';
import { zipSync, strToU8 } from 'fflate';
import { canvaskitProaspat, dSvg } from '../logo/ck.js';
import { formeDinSvg, slug } from '../logo/kit.js';
import { contrast, lum, fundaluri, culoareNegativ, numeDinDosar } from '../logo/verificari.js';
import { familie, octetiFont, fisiereFont, font, aseaza } from '../logo/fonturi.js';

// ── canalele: dimensiunile pozelor (px). Sursele: pagina de ajutor Google Business Profile (logo 720 × 720); restul, ghidurile
// publice ale platformelor din nov. 2026 (Facebook 820 × 312 pe desktop, 640 × 360 pe telefon). „zona” = cât din lățime și din
// înălțime poate ocupa logoul, ca să nu-l taie telefonul sau poza de profil care se suprapune peste copertă.
export const CANALE = {
  instagram: { nume: 'Instagram', avatar: 1080, coperta: null },
  facebook: { nume: 'Facebook', avatar: 720, coperta: { w: 1640, h: 624, zona: [0.56, 0.5] } },
  tiktok: { nume: 'TikTok', avatar: 1080, coperta: null },
  google: { nume: 'Google (profilul firmei)', avatar: 720, coperta: { w: 1024, h: 576, zona: [0.6, 0.42] } },
  linkedin: { nume: 'LinkedIn', avatar: 400, coperta: { w: 1128, h: 191, zona: [0.46, 0.5] } },
  youtube: { nume: 'YouTube', avatar: 800, coperta: { w: 2560, h: 1440, zona: [0.5, 0.24] } },
};
const ALIAS = { ig: 'instagram', fb: 'facebook', tik_tok: 'tiktok', gbp: 'google', google_business: 'google', google_maps: 'google', maps: 'google', yt: 'youtube' };
const LINK = { instagram: ['instagram'], facebook: ['facebook'], tiktok: ['tiktok'], google: ['google', 'gbp', 'google_business', 'google_maps'], linkedin: ['linkedin'], youtube: ['youtube'] };

// aplicările care vin în a doua parte (26–28 nov. 2026): cererea e primită acum și se întoarce la „amanate”
export const APLICATII = { carte_vizita: 'cartea de vizită', semnatura_email: 'semnătura de e-mail', antet: 'antetul pentru documente', postare: 'șablonul de postare' };
// cele care ies de acum în fiecare kit (fluxul n8n „Logo · generator” le trimite pe toate șapte în „aplicatii”)
export const FACUTE_ACUM = { ghid: 'ghidul brandului', avatar: 'poza de profil', coperta: 'coperta' };
export const AMANATE_PANA_LA = '2026-11-28';

// canalele firmei, din Dosar: identitate.canale (lista din onboarding) și linkurile din identitate (instagram, facebook…)
export function canaleFolosite(canale, dosar) {
  const id = (dosar && dosar.identitate) || {};
  const brut = Array.isArray(canale) ? canale : (Array.isArray(id.canale) ? id.canale : []);
  const lista = brut.map((x) => String((x && (x.canal || x.nume)) || x || '').toLowerCase().trim().replace(/[\s-]+/g, '_')).map((x) => ALIAS[x] || x).filter(Boolean);
  const out = Object.keys(CANALE).map((k) => {
    const surse = [];
    if (lista.includes(k)) surse.push('identitate.canale');
    for (const c of LINK[k]) if (typeof id[c] === 'string' && id[c].trim()) { surse.push(`identitate.${c}`); break; }
    return { canal: k, nume: CANALE[k].nume, folosit: surse.length > 0, sursa: surse.join(' + ') || null };
  });
  const necunoscute = [...new Set(lista.filter((x) => !CANALE[x]))];
  return { canale: out, necunoscute };
}

// ── culorile ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const HEX = /^#[0-9a-f]{6}$/i;
const ROL = { fundal: 'Fundal', text: 'Text', baza: 'Culoarea de bază', accent: 'Accent', neutru: 'Neutru', neutre: 'Neutru' };
const virgula = (x, z = 1) => String(Math.round(x * 10 ** z) / 10 ** z).replace('.', ',');
const mare = (t) => { const x = String(t || '').trim(); return x ? x[0].toLocaleUpperCase('ro-RO') + x.slice(1) : x; };
const mii = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const hexRgb = (h) => { const n = parseInt(String(h).slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const rgbText = (h) => { const n = parseInt(String(h).slice(1), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };
const cmyk = (h) => {
  const n = parseInt(String(h).slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const k = 1 - Math.max(r, g, b); if (k >= 1) return [0, 0, 0, 100];
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((x) => Math.round(x * 100));
};
export const verdictContrast = (k) => (k >= 7 ? 'se citește ușor, și ca text mic' : k >= 4.5 ? 'bun pentru text obișnuit' : k >= 3 ? 'doar pentru titluri și text mare' : 'nu pentru text, doar ca suprafață de culoare');
const pragPentru = (p) => (/obi/i.test(String(p || '')) ? 4.5 : 3);

function culoriGhid(identitate, paleta) {
  const lista = Array.isArray(identitate.culori) ? identitate.culori.filter((c) => c && HEX.test(String(c.hex || ''))) : [];
  if (lista.length) return lista.map((c) => ({ rol: String(c.rol || '').toLowerCase(), nume: String(c.nume || '').trim(), hex: c.hex.toUpperCase(), folosire: String(c.folosire || '').trim(), proportie: String(c.proportie || '').trim() }));
  const out = []; for (const r of ['fundal', 'text', 'baza', 'accent']) if (HEX.test(String(paleta[r] || ''))) out.push({ rol: r, nume: '', hex: paleta[r].toUpperCase(), folosire: '', proportie: '' });
  for (const n of paleta.neutre || []) if (HEX.test(String(n)) && !out.some((c) => c.hex === n.toUpperCase())) out.push({ rol: 'neutru', nume: '', hex: n.toUpperCase(), folosire: '', proportie: '' });
  return out;
}

// ── fonturile: un rând de text ca formă vectorială, din fontul brandului (contururile fontkit, umplere nonzero ca în font) ──
function rand(familieF, grosime, text, pt) {
  const F = font(familieF, grosime); const a = aseaza(F, text); const s = pt / F.upm; const L = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' };
  let d = '';
  for (const g of a.glife) for (const c of g.cmds) { const p = []; for (let i = 0; i < c.a.length; i += 2) p.push(((g.x + c.a[i]) * s).toFixed(2), (-(c.a[i + 1] + (g.y || 0)) * s).toFixed(2)); d += `${L[c.c]}${p.join(' ')} `; }
  return { d: d.trim(), latime: a.latime * s, cap: (F.cap || F.upm * 0.7) * s };
}
const latimeText = (familieF, grosime, text, pt) => { const F = font(familieF, grosime); return (aseaza(F, text).latime * pt) / F.upm; };
const grosimeDin = (x, d) => { const m = String(x == null ? '' : x).match(/\d{3}/); return m ? Number(m[0]) : d; };

// ── logoul pe o suprafață: SVG cu fundal și straturile logoului încadrate în zona dată ───────────────────────────────────
function compune(W, H, fundal, straturi, cutie, potriveste) {
  const bw = cutie[2] - cutie[0], bh = cutie[3] - cutie[1]; const s = potriveste(bw, bh);
  const tx = (W - bw * s) / 2 - cutie[0] * s, ty = (H - bh * s) / 2 - cutie[1] * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${fundal}"/><g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(6)})">${straturi.map((q) => `<path d="${dSvg(q.path)}" fill="${q.culoare}"/>`).join('')}</g></svg>`;
}
// poza de profil: rețelele o taie în cerc, deci logoul încape în cercul înscris, cu aer
const inCerc = (W) => (bw, bh) => Math.min((0.68 * W) / bw, (0.68 * W) / bh, (0.84 * W) / Math.hypot(bw, bh));
const inZona = (W, H, z) => (bw, bh) => Math.min((z[0] * W) / bw, (z[1] * H) / bh);

// fundalul pozelor: culoarea de bază cu logoul negativ, dacă are contrast; altfel fundalul deschis cu logoul color
function alegeFundal(culori, paleta) {
  const neg = culoareNegativ(paleta);
  if (contrast(neg, culori.principal) >= 3) return { fundal: culori.principal, varianta: 'negativ', recoloreaza: neg };
  return { fundal: fundaluri(paleta)[0].hex, varianta: 'color', recoloreaza: null };
}

// ── textele fixe ale ghidului (scrise după references/STANDARD-SCRIS.md; trec prin tipare-robot.js în teste) ───────────────
const SURSA = (s) => { const x = String(s || '').toLowerCase(); return /site/.test(x) ? 'De pe site' : /oferta|servic/.test(x) ? 'Din lista de servicii' : /google|recenz/.test(x) ? 'De pe Google' : /postar|instagram|facebook|tiktok/.test(x) ? 'Dintr-o postare' : /mesaj|whatsapp|email/.test(x) ? 'Dintr-un mesaj' : 'Din ce ne-ai trimis'; };
export const TEXTE_BRAND = {
  intro: (nume) => `Tot ce ține brandul ${nume} la un loc: fișierele, culorile, fonturile, felul în care vorbești și pozele pentru rețele. Dă ghidul oricui lucrează cu brandul tău: tipografiei, celui care îți face site-ul, celui care îți scrie postările.`,
  cuprins: ['Fișierele tale', 'Culorile', 'Fonturile', 'Vocea', 'Vocea, pe textele tale', 'Fotografiile și regulile', 'Logoul și profilurile'],
  fisiere: (zip, zipLogo) => `Arhiva ${zip} are patru foldere și ghidul. ${zipLogo ? `Logoul are arhiva lui, ${zipLogo}, cu fișierele pentru site și tipar și cu ghidul logoului.` : 'Logoul are arhiva lui, cu fișierele pentru site și tipar și cu ghidul logoului.'}`,
  foldere: [
    ['ghid-brand.pdf', 'ghidul acesta.'],
    ['retele/', 'poza de profil și coperta pentru fiecare rețea pe care ești, la mărimea cerută de ea.'],
    ['fonturi/', 'fișierele fonturilor, cu licența lor. Le instalezi cu dublu clic și apar în Word și în celelalte programe.'],
    ['culori.txt', 'codurile culorilor, ca să le copiezi exact: HEX pentru site și Canva, RGB pentru ecran, CMYK pentru tipar.'],
  ],
  unde: [
    ['Site', 'logoul SVG din arhiva logoului, codurile HEX și fonturile din fonturi/.'],
    ['Tipografie', 'logoul PDF din arhiva logoului și codurile CMYK. Cere o probă de culoare înainte de tiraj.'],
    ['Word și e-mail', 'fonturile din fonturi/, instalate; unde nu le ai, fontul de rezervă de la pagina Fonturile.'],
    ['Canva', 'logoul PNG, codurile HEX și fonturile, căutate după nume.'],
    ['Rețele', 'pozele din retele/, încărcate așa cum sunt, fără să le tai.'],
  ],
  urmeaza: (lista) => `Urmează, separat: ${lista}.`,
  culori: 'Fiecare culoare are un rol. Rolul spune unde stă culoarea și cât din pagină ocupă, ca brandul să arate la fel pe site, pe hârtie și pe rețele.',
  perechi: 'Contrastul de mai jos e măsurat pe culorile tale. Cifra spune cât de bine se citește textul pe fundalul lui: de la 4,5:1 merge pentru text obișnuit, de la 3:1 doar pentru titluri.',
  cmyk: 'CMYK-ul e o conversie aproximativă. La tipar, cere tipografiei o probă de culoare.',
  fonturi: 'Două fonturi, unul pentru titluri și unul pentru text. Nu adăuga un al treilea: două fonturi folosite mereu la fel țin brandul recognoscibil.',
  licenta: 'Ambele fonturi au licența SIL Open Font: le folosești gratuit pe site, în documente și la tipar. Fișierele și licența sunt în fonturi/.',
  rezerve: (t, x, rt, rx) => [
    ['Word și e-mail', `instalează fonturile din fonturi/. Pe un calculator unde nu sunt instalate, scrii titlurile cu ${rt} și textul cu ${rx}.`],
    ['Google Docs', `meniul de fonturi, apoi „Mai multe fonturi”, și cauți „${t}”${x !== t ? ` și „${x}”` : ''}. Dacă nu apare, folosești ${rt}${rx !== rt ? ` și ${rx}` : ''}.`],
    ['Canva', `cauți „${t}”${x !== t ? ` și „${x}”` : ''} în lista de fonturi. Dacă nu apare, cu Canva Pro încarci fișierele din fonturi/; altfel folosești ${rt}${rx !== rt ? ` și ${rx}` : ''}.`],
    ['Site', 'programatorul ia fonturile din fonturi/ sau de pe fonts.google.com.'],
  ],
  vocea: 'Cum sună firma ta când scrie: pe site, în postări, în mesajele către clienți. Trei cuvinte, un exemplu bun, unul de evitat.',
  rescrieri: 'Câteva texte de-ale tale, scrise din nou în vocea brandului. Faptele rămân aceleași, se schimbă doar felul în care sunt spuse.',
  fotografii: 'Ce fel de poze folosești pe site și pe rețele. Pozele făcute după regulile astea arată ca ale aceleiași firme, oricine le-ar face.',
  logo: 'Logoul pe fundalul deschis și pe culoarea de bază. Spațiul din jur, mărimea minimă și ce nu faci cu el sunt în ghidul logoului, din arhiva logoului.',
  profiluri: 'Pozele sunt făcute la mărimea cerută de fiecare rețea. Logoul stă în zona pe care rețeaua n-o taie, și pe telefon.',
  faraCanale: 'În Dosar nu e trecută încă nicio rețea. Când îți faci un profil, cere-ne poza de profil și coperta pentru el.',
  axe: { 'jucăuș–serios': ['jucăuș', 'serios'], 'relaxat–formal': ['relaxat', 'formal'], 'accesibil–premium': ['accesibil', 'premium'], 'clasic–inovator': ['clasic', 'inovator'], 'discret–îndrăzneț': ['discret', 'îndrăzneț'] },
};
const lunaRo = (d) => d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' });

// ── ghidul brandului (PDF, A4) ───────────────────────────────────────────────────────────────────────────────────────────
async function ghidBrand(o) {
  const { nume, identitate: I, culori, culoriLista, perechi, ft, fundalPoze, logo, poze, zip, zipLogo, amanate, data } = o;
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkitPdf);
  const fR = await doc.embedFont(octetiFont('Lato', 400).octeti, { subset: true }); const fB = await doc.embedFont(octetiFont('Lato', 700).octeti, { subset: true });
  doc.setTitle(`Ghidul brandului · ${nume}`); doc.setAuthor('AleSign'); doc.setCreator('AleSign'); doc.setProducer('AleSign · brand kit'); doc.setLanguage('ro');
  const W = 595.28, H = 841.89, M = 48, LW = W - 2 * M, JOS = H - M - 18;
  const ink = rgb(0.11, 0.11, 0.1), muted = rgb(0.42, 0.4, 0.37), linie = rgb(0.85, 0.84, 0.81), rosu = rgb(0.72, 0.16, 0.12);
  const texte = []; const textCul = HEX.test(String(o.paleta.text || '')) ? o.paleta.text : '#1C1C1A';
  const rupe = (t, f, z, lat) => { const out = []; for (const par of String(t).split('\n')) { let r = ''; for (const c of par.split(/\s+/).filter(Boolean)) { const x = r ? `${r} ${c}` : c; if (f.widthOfTextAtSize(x, z) > lat && r) { out.push(r); r = c; } else r = x; } out.push(r); } return out; };
  let p, y, nrPag = 0;
  const subsol = () => { p.drawText(`${nume} · ghidul brandului`, { x: M, y: M - 22, size: 7.5, font: fR, color: muted }); p.drawText(String(nrPag), { x: W - M - 6, y: M - 22, size: 7.5, font: fR, color: muted }); };
  const pagina = () => { if (p) subsol(); p = doc.addPage([W, H]); nrPag++; y = M; p.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: hexRgb(culori.principal) }); };
  const loc = (h) => { if (y + h > JOS) { pagina(); } };
  const scrie = (t, { x = M, z = 9.5, f = fR, c = ink, lat = LW, pas = 1.42, pastreaza = false } = {}) => {
    if (t == null || t === '') return y; texte.push(String(t));
    const randuri = rupe(t, f, z, lat); if (!pastreaza) loc(randuri.length * z * pas);
    for (const r of randuri) { p.drawText(r, { x, y: H - y - z, size: z, font: f, color: c }); y += z * pas; }
    return y;
  };
  const scrieLa = (t, x, yy, opt = {}) => { const y0 = y; y = yy; scrie(t, { ...opt, x, pastreaza: true }); const r = y; y = y0; return r; };
  const titlu = (t, sub) => { pagina(); y += 30; randFont(ft.titluri, ft.gTitluri, t, 26, M, y, textCul); y += 20; if (sub) { scrie(sub, { c: muted, lat: LW * 0.9 }); y += 16; } };
  const sectiune = (t) => { loc(40); p.drawText(t, { x: M, y: H - y - 11.5, size: 11.5, font: fB, color: ink }); y += 21; };
  const rect = (x, yy, w, h, cul, extra = {}) => p.drawRectangle({ x, y: H - yy - h, width: w, height: h, color: cul ? hexRgb(cul) : undefined, ...extra });
  const desen = (st, b, x, yy, w, h) => { const bw = b[2] - b[0], bh = b[3] - b[1]; const s = Math.min(w / bw, h / bh); const ox = x + (w - bw * s) / 2, oy = yy + (h - bh * s) / 2; for (const q of st) p.drawSvgPath(dSvg(q.path), { x: ox - b[0] * s, y: H - oy + b[1] * s, scale: s, color: hexRgb(q.culoare) }); };
  const randFont = (fam, g, text, pt, x, baza, cul) => { const r = rand(fam, g, text, pt); if (r.d) p.drawSvgPath(r.d, { x, y: H - baza, color: hexRgb(cul) }); texte.push(text); return r; };
  const randuriFont = (fam, g, text, pt, lat) => { const out = []; let r = ''; for (const c of String(text).split(/\s+/).filter(Boolean)) { const x = r ? `${r} ${c}` : c; if (latimeText(fam, g, x, pt) > lat && r) { out.push(r); r = c; } else r = x; } if (r) out.push(r); return out; };
  const neg = culori.negativ; const deschis = fundaluri(o.paleta)[0].hex;

  // 1 · coperta
  pagina();
  { const hp = 430; rect(0, 0, W, hp, fundalPoze.fundal); desen(fundalPoze.varianta === 'negativ' ? logo.negativ : logo.color, logo.cutie, M + 40, 120, LW - 80, hp - 240); y = hp + 40; }
  p.drawText('Ghidul brandului', { x: M, y: H - y - 10, size: 10, font: fR, color: muted }); y += 22;
  { let pt = 30; while (pt > 16 && latimeText(ft.titluri, ft.gTitluri, nume, pt) > LW) pt -= 2; y += pt * 0.9; randFont(ft.titluri, ft.gTitluri, nume, pt, M, y, textCul); y += pt * 0.55; }
  y += 6; scrie(TEXTE_BRAND.intro(nume), { c: muted, lat: LW * 0.86 }); y += 18;
  const cuprins = TEXTE_BRAND.cuprins.filter((t) => t !== 'Vocea, pe textele tale' || (I.rescrieri || []).length);
  cuprins.forEach((t, i) => { p.drawText(String(i + 2), { x: M, y: H - y - 10, size: 10, font: fB, color: muted }); p.drawText(t, { x: M + 22, y: H - y - 10, size: 10, font: fR, color: ink }); y += 17; });
  p.drawText(data, { x: M, y: M + 4, size: 8.5, font: fR, color: muted });

  // 2 · fișierele tale
  titlu('Fișierele tale', TEXTE_BRAND.fisiere(zip, zipLogo));
  for (const [f, t] of TEXTE_BRAND.foldere) { loc(30); p.drawText(f, { x: M, y: H - y - 9.5, size: 9.5, font: fB, color: ink }); y = scrieLa(t, M + 92, y, { lat: LW - 92 }) + 6; }
  if (poze.length) {
    y += 4; sectiune('În retele/');
    for (const z of poze) { loc(16); p.drawText(z.fisier.replace('retele/', ''), { x: M, y: H - y - 9, size: 9, font: fR, color: ink }); p.drawText(`${z.canal_nume} · ${z.ce} · ${mii(z.w)} × ${mii(z.h)} px`, { x: M + 170, y: H - y - 9, size: 9, font: fR, color: muted }); y += 14.5; }
  }
  y += 10; sectiune('Ce folosești unde');
  for (const [k, t] of TEXTE_BRAND.unde) { loc(30); p.drawText(k, { x: M, y: H - y - 9.5, size: 9.5, font: fB, color: ink }); y = scrieLa(t, M + 92, y, { lat: LW - 92 }) + 6; }
  if (amanate.length) { y += 10; scrie(TEXTE_BRAND.urmeaza(amanate.map((a) => a.nume).join(', ').replace(/, ([^,]*)$/, ' și $1')), { c: muted }); }

  // 3 · culorile
  titlu('Culorile', TEXTE_BRAND.culori);
  { const n = culoriLista.length; const col = n <= 4 ? n : 3; const gap = 14; const cw = (LW - gap * (col - 1)) / col;
    for (let i = 0; i < n; i += col) {
      const rand2 = culoriLista.slice(i, i + col); const inaltimi = [];
      loc(160);
      rand2.forEach((c, j) => {
        const x = M + j * (cw + gap); rect(x, y, cw, 58, c.hex, lum(c.hex) > 0.85 ? { borderColor: linie, borderWidth: 0.7 } : {});
        let yy = y + 70; p.drawText(c.nume || ROL[c.rol] || 'Culoare', { x, y: H - yy - 9.5, size: 9.5, font: fB, color: ink }); texte.push(c.nume || ''); yy += 14;
        p.drawText(`${ROL[c.rol] || c.rol} · ${c.hex}`, { x, y: H - yy - 8.5, size: 8.5, font: fR, color: muted }); yy += 12;
        p.drawText(`RGB ${rgbText(c.hex)} · CMYK ${cmyk(c.hex).join(' ')}`, { x, y: H - yy - 8, size: 8, font: fR, color: muted }); yy += 13;
        if (c.folosire) yy = scrieLa(mare(c.folosire), x, yy, { z: 8.5, lat: cw, c: ink }) + 1;
        if (c.proportie) yy = scrieLa(mare(c.proportie), x, yy, { z: 8.5, lat: cw, c: muted });
        inaltimi.push(yy);
      });
      y = Math.max(...inaltimi) + 16;
    }
  }
  sectiune('Textul pe fundal'); scrie(TEXTE_BRAND.perechi, { c: muted }); y += 8;
  for (const q of perechi) {
    loc(44); rect(M, y, 112, 36, q.fundal, lum(q.fundal) > 0.85 ? { borderColor: linie, borderWidth: 0.7 } : {});
    p.drawText('Aa', { x: M + 12, y: H - y - 25, size: 17, font: fB, color: hexRgb(q.text) }); p.drawText('text', { x: M + 46, y: H - y - 23, size: 10, font: fR, color: hexRgb(q.text) });
    p.drawText(`${q.text} pe ${q.fundal} · ${virgula(q.k)}:1 · ${verdictContrast(q.k)}`, { x: M + 126, y: H - y - 13, size: 9.5, font: fB, color: q.k >= 3 ? ink : rosu });
    if (q.unde) scrieLa(q.unde, M + 126, y + 18, { z: 8.5, c: muted, lat: LW - 126 });
    y += 46;
  }
  y += 4; scrie(TEXTE_BRAND.cmyk, { z: 8, c: muted });

  // 4 · fonturile
  titlu('Fonturile', TEXTE_BRAND.fonturi);
  for (const [rol, fam, g, rez] of [['Titluri', ft.titluri, ft.gTitluri, ft.rezTitluri], ['Text', ft.text, ft.gText, ft.rezText]]) {
    loc(150); p.drawText(`${rol} · ${fam}${g ? `, ${g}` : ''}`, { x: M, y: H - y - 9, size: 9, font: fB, color: muted }); y += 16;
    if (rol === 'Titluri') { y += 30; randFont(fam, g, nume, 32, M, y, textCul); y += 16; y += 20; randFont(fam, g, 'Aa Ăă Ââ Îî Șș Țț · 0123 · 4567 · 89', 17, M, y, textCul); y += 18; }
    else {
      const mostra = (I.ton && I.ton.exemplu_da) || ((I.rescrieri || [])[0] || {}).nou || `${nume}, ${o.oras || ''}`.replace(/, $/, '');
      for (const r of randuriFont(fam, g, mostra, 12, LW * 0.82).slice(0, 4)) { y += 17; randFont(fam, g, r, 12, M, y, textCul); }
      y += 22; randFont(fam, g, 'Aa Ăă Ââ Îî Șș Țț · 0123 · 4567 · 89', 12, M, y, textCul); y += 12;
    }
    y += 6; p.drawText(`Rezerva: ${rez}`, { x: M, y: H - y - 9, size: 9, font: fR, color: muted }); y += 24;
  }
  if (I.fonturi && I.fonturi.de_ce) { scrie(I.fonturi.de_ce, { c: ink }); y += 10; }
  sectiune('Unde n-ai fontul');
  for (const [k, t] of TEXTE_BRAND.rezerve(ft.titluri, ft.text, ft.rezTitluri, ft.rezText)) { loc(30); p.drawText(k, { x: M, y: H - y - 9.5, size: 9.5, font: fB, color: ink }); y = scrieLa(t, M + 92, y, { lat: LW - 92 }) + 6; }
  y += 8; scrie(TEXTE_BRAND.licenta, { z: 8.5, c: muted });

  // 5 · vocea
  titlu('Vocea', TEXTE_BRAND.vocea);
  const ton = I.ton || {};
  if (Array.isArray(ton.cuvinte) && ton.cuvinte.length) { y += 26; let x = M; for (const c of ton.cuvinte.slice(0, 3)) { const r = randFont(ft.titluri, ft.gTitluri, c, 22, x, y, textCul); x += r.latime + 26; } y += 24; }
  if (ton.exemplu_da) { sectiune('Așa da'); scrie(`„${ton.exemplu_da}”`); y += 8; }
  if (ton.exemplu_nu) { sectiune('Așa nu'); scrie(`„${ton.exemplu_nu}”`, { c: muted }); y += 8; }
  if (Array.isArray(ton.niciodata) && ton.niciodata.length) { sectiune('Niciodată'); for (const n of ton.niciodata) scrie(`· ${n}`); y += 8; }
  if (Array.isArray(I.personalitate) && I.personalitate.length) {
    sectiune('Personalitatea');
    for (const a of I.personalitate) {
      const ax = String(a.axa || '').replace(/[-‐-‒–—]/g, '–'); const [st, dr] = TEXTE_BRAND.axe[ax] || ax.split('–'); const poz = Math.max(1, Math.min(5, Number(a.pozitie) || 3));
      loc(36); p.drawText(st || '', { x: M, y: H - y - 9, size: 9, font: fR, color: ink }); p.drawText(dr || '', { x: M + 230, y: H - y - 9, size: 9, font: fR, color: ink });
      const x0 = M + 70, x1 = M + 220; p.drawLine({ start: { x: x0, y: H - y - 6 }, end: { x: x1, y: H - y - 6 }, color: linie, thickness: 1 });
      for (let k = 1; k <= 5; k++) p.drawCircle({ x: x0 + ((k - 1) * (x1 - x0)) / 4, y: H - y - 6, size: k === poz ? 4.5 : 1.8, color: k === poz ? hexRgb(culori.principal) : linie });
      texte.push(st || '', dr || '');
      if (a.de_ce) scrieLa(a.de_ce, M + 300, y, { z: 8, c: muted, lat: LW - 300 });
      y += 30;
    }
  }

  // 6 · vocea, pe textele tale
  if ((I.rescrieri || []).length) {
    titlu('Vocea, pe textele tale', TEXTE_BRAND.rescrieri);
    for (const r of I.rescrieri.slice(0, 5)) {
      loc(90); p.drawText(SURSA(r.sursa), { x: M, y: H - y - 9, size: 9, font: fB, color: muted }); y += 16;
      p.drawText('Azi', { x: M, y: H - y - 9, size: 9, font: fB, color: muted }); y = scrieLa(`„${r.original}”`, M + 92, y, { c: muted, lat: LW - 92 }) + 4;
      p.drawText('În vocea ta', { x: M, y: H - y - 9, size: 9, font: fB, color: ink }); y = scrieLa(`„${r.nou}”`, M + 92, y, { lat: LW - 92 }) + 4;
      if (r.de_ce) { p.drawText('De ce', { x: M, y: H - y - 9, size: 9, font: fB, color: muted }); y = scrieLa(r.de_ce, M + 92, y, { z: 8.5, c: muted, lat: LW - 92 }) + 4; }
      y += 12; p.drawLine({ start: { x: M, y: H - y }, end: { x: W - M, y: H - y }, color: linie, thickness: 0.6 }); y += 14;
    }
  }

  // 7 · fotografiile și regulile
  titlu('Fotografiile și regulile', TEXTE_BRAND.fotografii);
  if (I.semn_distinctiv) { loc(70); const y0 = y; y += 12; scrie('După ce te recunoaște cineva care nu-ți vede numele', { x: M + 14, z: 9, f: fB, c: muted, lat: LW - 28 }); y += 2; scrie(I.semn_distinctiv, { x: M + 14, lat: LW - 28 }); y += 10; p.drawRectangle({ x: M, y: H - y, width: 3, height: y - y0, color: hexRgb(culori.principal) }); y += 16; }
  const fo = I.fotografie || {};
  for (const [k, t] of [['Lumina', fo.lumina], ['Încadrarea', fo.incadrare], ['Oamenii', fo.oameni]]) if (t) { loc(30); p.drawText(k, { x: M, y: H - y - 9.5, size: 9.5, font: fB, color: ink }); y = scrieLa(t, M + 92, y, { lat: LW - 92 }) + 8; }
  if (Array.isArray(fo.niciodata) && fo.niciodata.length) { loc(30); p.drawText('Niciodată', { x: M, y: H - y - 9.5, size: 9.5, font: fB, color: rosu }); y = scrieLa(fo.niciodata.join('; ') + '.', M + 92, y, { lat: LW - 92 }) + 8; }
  const reguli = (I.reguli || []).filter((r) => r && (r.asa_da || r.asa_nu));
  if (reguli.length) {
    y += 8; sectiune('Așa da, așa nu'); const cw = (LW - 18) / 2;
    p.drawText('Așa da', { x: M, y: H - y - 9, size: 9, font: fB, color: ink }); p.drawText('Așa nu', { x: M + cw + 18, y: H - y - 9, size: 9, font: fB, color: rosu }); y += 16;
    for (const r of reguli.slice(0, 8)) { loc(40); const a = scrieLa(r.asa_da || '', M, y, { z: 9, lat: cw }); const b = scrieLa(r.asa_nu || '', M + cw + 18, y, { z: 9, lat: cw, c: muted }); y = Math.max(a, b) + 10; }
  }

  // 8 · logoul și profilurile
  titlu('Logoul și profilurile', TEXTE_BRAND.logo);
  { const cw = (LW - 14) / 2, ch = 110; rect(M, y, cw, ch, deschis, lum(deschis) > 0.85 ? { borderColor: linie, borderWidth: 0.7 } : {}); desen(logo.color, logo.cutie, M + 22, y + 24, cw - 44, ch - 48);
    const fn = contrast(neg, culori.principal) >= 3 ? culori.principal : fundaluri(o.paleta)[1].hex; rect(M + cw + 14, y, cw, ch, fn); desen(logo.negativ, logo.cutie, M + cw + 36, y + 24, cw - 44, ch - 48); y += ch + 22; }
  sectiune('Pozele pentru rețele');
  if (!poze.length) scrie(TEXTE_BRAND.faraCanale, { c: muted });
  else {
    scrie(TEXTE_BRAND.profiluri, { c: muted }); y += 10;
    const avatare = poze.filter((z) => z.ce === 'poza de profil'); const coperte = poze.filter((z) => z.ce === 'coperta');
    if (avatare.length) { loc(110); let x = M; for (const z of avatare) { const d = 64; const img = await doc.embedPng(z.mic); p.drawImage(img, { x, y: H - y - d, width: d, height: d }); p.drawText(z.canal_nume.replace(' (profilul firmei)', ''), { x, y: H - y - d - 13, size: 8, font: fR, color: muted }); x += d + 26; } y += 64 + 30; }
    for (const z of coperte) { const w = Math.min(LW * 0.62, 330); const h = (w * z.h) / z.w; loc(h + 30); const img = await doc.embedPng(z.mic); p.drawImage(img, { x: M, y: H - y - h, width: w, height: h }); p.drawText(z.canal_nume.replace(' (profilul firmei)', ''), { x: M + w + 12, y: H - y - 10, size: 8.5, font: fB, color: ink }); p.drawText(z.fisier.replace('retele/', ''), { x: M + w + 12, y: H - y - 23, size: 8.5, font: fR, color: muted }); p.drawText(`${mii(z.w)} × ${mii(z.h)} px`, { x: M + w + 12, y: H - y - 35, size: 8.5, font: fR, color: muted }); y += h + 16; }
  }
  subsol();
  return { pdf: Buffer.from(await doc.save()), pagini: doc.getPageCount(), texte };
}

// ── kitul ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// cerere: { lead_id, sarcina_id, nume, identitate, paleta, dosar, canale, aplicatii?, zip_logo? }; logo: { orizontal: SVG, semn: SVG | null }
export async function genereazaBrandKit(cerere, { sharp, prefix = '', logo: svgLogo, pragMemorieMB = 600 } = {}) {
  const t0 = Date.now(); const CK = await canvaskitProaspat(pragMemorieMB);
  const I = (cerere.identitate && typeof cerere.identitate === 'object') ? cerere.identitate : {};
  const paleta = (cerere.paleta && typeof cerere.paleta === 'object' && !Array.isArray(cerere.paleta)) ? cerere.paleta : ((I.jetoane && I.jetoane.culori) || {});
  const dosar = cerere.dosar || null; const erori = []; const note = []; const verificari = [];
  const nume = String(cerere.nume || (dosar && numeDinDosar(dosar)) || '').trim();
  if (!nume) erori.push('nume: numele firmei (sau dosar.brand.nume_marca)');
  if (!HEX.test(String(paleta.fundal || '')) || !HEX.test(String(paleta.text || '')) || !HEX.test(String(paleta.baza || ''))) erori.push('paleta: fundal, text și baza, ca #RRGGBB (jetoanele identității)');
  const fTit = String((I.fonturi && I.fonturi.titluri) || (I.jetoane && I.jetoane.fonturi && I.jetoane.fonturi.titluri) || '').trim();
  const fTxt = String((I.fonturi && I.fonturi.text) || (I.jetoane && I.jetoane.fonturi && I.jetoane.fonturi.text) || '').trim();
  if (!fTit || !fTxt) erori.push('identitate.fonturi: titluri și text');
  if (!svgLogo || !svgLogo.orizontal) erori.push('logoul final: SVG-ul orizontal-color din kitul logoului');
  const toateApl = [...Object.keys(FACUTE_ACUM), ...Object.keys(APLICATII)];
  const lista = cerere.aplicatii == null ? Object.keys(APLICATII) : (Array.isArray(cerere.aplicatii) ? cerere.aplicatii : null);
  if (!lista) erori.push(`aplicatii: o listă din ${toateApl.join(', ')}`);
  else for (const a of lista) if (!APLICATII[a] && !FACUTE_ACUM[a]) erori.push(`aplicatii: „${String(a).slice(0, 30)}” nu e una din ${toateApl.join(', ')}`);
  const ceri = (lista || []).filter((a, i, l) => APLICATII[a] && l.indexOf(a) === i); // ghidul, avatarul și coperta ies oricum
  if (erori.length) return { ok: false, motiv: 'cererea pentru brand kit nu e completă', erori };

  // K4: fonturile sunt din lista celor 20 (licența OFL verificată, fișierele în motor)
  const lipsa = [fTit, fTxt].filter((f) => !familie(f));
  verificari.push({ cod: 'K4', trecut: !lipsa.length, opreste: true, valoare: lipsa.length, motiv: lipsa.length ? `fontul ${lipsa.join(' și ')} nu e în lista celor 20: nu am fișierele și licența lui` : `fonturile ${fTit}${fTxt !== fTit ? ` și ${fTxt}` : ''} sunt în lista celor 20, cu licența OFL` });
  // K1: textul pe fundal se citește ca text obișnuit
  const k1 = contrast(paleta.text, paleta.fundal);
  verificari.push({ cod: 'K1', trecut: k1 >= 4.5, opreste: true, valoare: Math.round(k1 * 100) / 100, prag: 4.5, motiv: `textul ${paleta.text} pe fundalul ${paleta.fundal}: ${virgula(k1)}:1` });
  // K2: codurile din ghid sunt cele din jetoane (le citesc site-ul și ceilalți boți)
  const culoriLista = culoriGhid(I, paleta);
  const lipsaJ = ['fundal', 'text', 'baza', 'accent'].filter((r) => HEX.test(String(paleta[r] || '')) && !culoriLista.some((c) => c.hex.toLowerCase() === paleta[r].toLowerCase()));
  verificari.push({ cod: 'K2', trecut: !lipsaJ.length, opreste: true, valoare: lipsaJ.length, motiv: lipsaJ.length ? `jetoanele au ${lipsaJ.map((r) => `${r} ${paleta[r]}`).join(', ')}, dar culorile identității nu: ghidul ar avea alte coduri decât site-ul` : 'codurile din ghid sunt aceleași cu jetoanele' });
  if (verificari.some((v) => v.opreste && !v.trecut)) return { ok: false, motiv: 'brand kitul nu trece verificările', erori: verificari.filter((v) => !v.trecut).map((v) => `${v.cod}: ${v.motiv}`), verificari };

  // logoul final, ca straturi de culoare
  const L = formeDinSvg(CK, svgLogo.orizontal); if (L.erori.length) return { ok: false, motiv: 'logoul final nu se poate citi', erori: L.erori };
  const S = svgLogo.semn ? formeDinSvg(CK, svgLogo.semn) : null; if (S && S.erori.length) { note.push('semnul din kitul logoului nu s-a citit; pozele de profil sunt făcute din logoul întreg'); }
  const toate = L.straturi.map((q) => q.culoare); const principal = HEX.test(String(paleta.baza || '')) && toate.some((h) => h.toLowerCase() === paleta.baza.toLowerCase()) ? paleta.baza : [...toate].sort((a, b) => lum(a) - lum(b))[0];
  const culori = { principal, negativ: culoareNegativ(paleta) };
  const negativ = (st) => st.map((q) => ({ path: q.path, culoare: culori.negativ }));
  const logo = { color: L.straturi, negativ: negativ(L.straturi), cutie: L.cutie };
  const icon = S && !S.erori.length ? { color: S.straturi, negativ: negativ(S.straturi), cutie: S.cutie } : logo;
  const fp = alegeFundal(culori, paleta);
  // C1: logoul are contrast pe fundalul pozelor (negativul pe bază sau culoarea principală pe fundalul deschis)
  const kc = fp.varianta === 'negativ' ? contrast(culori.negativ, fp.fundal) : Math.max(...[...new Set(toate)].map((h) => contrast(h, fp.fundal)));
  verificari.push({ cod: 'C1', trecut: kc >= 3, opreste: true, valoare: Math.round(kc * 100) / 100, prag: 3, motiv: `logoul ${fp.varianta === 'negativ' ? 'negativ' : 'color'} pe fundalul pozelor ${fp.fundal}: ${virgula(kc)}:1` });

  // canalele și pozele
  const { canale, necunoscute } = canaleFolosite(cerere.canale, dosar);
  if (necunoscute.length) note.push(`canale fără dimensiuni în motor: ${necunoscute.join(', ')} (n-am făcut poze pentru ele)`);
  const fisiere = []; const adauga = (cale, date, tip, doarInZip = false) => fisiere.push({ cale, date, tip, doarInZip });
  const poze = [];
  for (const c of canale.filter((x) => x.folosit)) {
    const def = CANALE[c.canal]; const st = fp.varianta === 'negativ' ? icon.negativ : icon.color;
    const a = compune(def.avatar, def.avatar, fp.fundal, st, icon.cutie, inCerc(def.avatar));
    const png = await sharp(Buffer.from(a)).flatten({ background: fp.fundal }).png({ compressionLevel: 9 }).toBuffer();
    const fis = `retele/${c.canal}-poza-profil.png`; adauga(fis, png, 'image/png');
    poze.push({ canal: c.canal, canal_nume: def.nume, ce: 'poza de profil', fisier: fis, w: def.avatar, h: def.avatar, mic: await sharp(png).resize(256, 256).ensureAlpha().composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><circle cx="128" cy="128" r="128" fill="#000"/></svg>'), blend: 'dest-in' }]).png().toBuffer() });
    if (def.coperta) {
      const { w, h, zona } = def.coperta; const stL = fp.varianta === 'negativ' ? logo.negativ : logo.color;
      const s = compune(w, h, fp.fundal, stL, logo.cutie, inZona(w, h, zona));
      const pc = await sharp(Buffer.from(s)).flatten({ background: fp.fundal }).png({ compressionLevel: 9 }).toBuffer();
      const fc = `retele/${c.canal}-coperta.png`; adauga(fc, pc, 'image/png');
      poze.push({ canal: c.canal, canal_nume: def.nume, ce: 'coperta', fisier: fc, w, h, mic: await sharp(pc).resize(660).png().toBuffer() });
    }
  }
  if (!poze.length) note.push('firma n-are niciun canal în Dosar (identitate.canale sau linkuri): n-am făcut poze de profil');

  // perechile de text (identitate.perechi), cu contrastul măsurat; verdictul din ghid e cel măsurat
  const perechi = [];
  const surse = Array.isArray(I.perechi) && I.perechi.length ? I.perechi : [{ text: paleta.text, fundal: paleta.fundal, pentru: 'text obișnuit', unde: '' }];
  for (const q of surse) {
    if (!q || !HEX.test(String(q.text || '')) || !HEX.test(String(q.fundal || ''))) { note.push('o pereche din identitate n-are două coduri #RRGGBB; am lăsat-o deoparte'); continue; }
    const k = contrast(q.text, q.fundal); perechi.push({ text: q.text.toUpperCase(), fundal: q.fundal.toUpperCase(), k, pentru: q.pentru || '', unde: q.unde || '' });
    if (k < pragPentru(q.pentru)) note.push(`perechea ${q.text} pe ${q.fundal} era pentru „${q.pentru}”, dar are ${virgula(k)}:1; în ghid scrie „${verdictContrast(k)}”`);
  }

  // fonturile, cu rezervele
  const serif = (f) => !!(familie(f) || {}).serife;
  const ft = {
    titluri: familie(fTit).nume, text: familie(fTxt).nume,
    gTitluri: grosimeDin(I.fonturi && I.fonturi.grosimi_titluri, 700), gText: grosimeDin(I.fonturi && I.fonturi.grosimi_text, 400),
    rezTitluri: String((I.fonturi && I.fonturi.rezerva_titluri) || (serif(fTit) ? 'Georgia' : 'Arial')).trim(),
    rezText: String((I.fonturi && I.fonturi.rezerva_text) || (serif(fTxt) ? 'Georgia' : 'Arial')).trim(),
  };
  if (!(I.fonturi && I.fonturi.rezerva_titluri && I.fonturi.rezerva_text)) note.push(`identitatea n-are fonturile de rezervă (scriptul 106): am pus ${ft.rezTitluri} și ${ft.rezText}, după serife`);
  for (const f of [...new Set([ft.titluri, ft.text])]) {
    const x = fisiereFont(f); const dir = `fonturi/${slug(f)}`;
    // doar în ZIP: bucketul „brand” (SQL 110) nu primește fișiere de font, iar clientul le ia oricum din arhivă
    for (const q of x.fisiere) adauga(`${dir}/${q.nume}`, q.octeti, 'font/ttf', true);
    adauga(`${dir}/OFL.txt`, x.licenta, 'text/plain', true);
  }

  // culori.txt
  const culoriTxt = [`Culorile ${nume}`, '', ...culoriLista.map((c) => `${(c.nume || ROL[c.rol] || 'Culoare').padEnd(22)} ${(ROL[c.rol] || c.rol).padEnd(17)} HEX ${c.hex}   RGB ${rgbText(c.hex).padEnd(13)}   CMYK ${cmyk(c.hex).join(' ')}`), '', 'CMYK-ul e o conversie aproximativă. La tipar, cere tipografiei o probă de culoare.', ''].join('\n');
  adauga('culori.txt', '\uFEFF' + culoriTxt, 'text/plain');

  const amanate = ceri.map((k) => ({ ce: k, nume: APLICATII[k], pana_la: AMANATE_PANA_LA, motiv: 'cererea e primită; fișierul vine cu a doua parte a motorului (26–28 nov. 2026)' }));
  const radacina = `brand-${slug(nume)}`;
  const g = await ghidBrand({ nume, identitate: I, culori, culoriLista, perechi, ft, fundalPoze: fp, logo, poze, paleta, oras: dosar && dosar.identitate && dosar.identitate.oras, zip: `${radacina}.zip`, zipLogo: cerere.zip_logo ? String(cerere.zip_logo).split('/').pop() : null, amanate, data: lunaRo(cerere.data ? new Date(cerere.data) : new Date()) });
  adauga('ghid-brand.pdf', g.pdf, 'application/pdf');
  verificari.push({ cod: 'G2', trecut: g.pagini >= 6 && g.pagini <= 8, opreste: true, valoare: g.pagini, prag: '6–8', motiv: `ghidul brandului are ${g.pagini} pagini` });
  // T1: telefonul și emailul din textele kitului sunt cele din Dosar (aceeași regulă ca logo_verifica_rezultat, SQL 111)
  const textele = [...new Set([nume, ...g.texte, culoriTxt].filter(Boolean))];
  const id = (dosar && dosar.identitate) || {}; const tel = String(id.telefon || '').replace(/\D/g, '').slice(-9); const mail = String(id.email || '').trim().toLowerCase(); const straine = [];
  for (const t of textele) {
    for (const m of t.matchAll(/(\+?[0-9][0-9 .()-]{8,16}[0-9])/g)) { const c = m[1].replace(/\D/g, ''); if (c.length >= 9 && c.length <= 12 && c.slice(-9) !== tel) straine.push(m[1]); }
    for (const m of t.matchAll(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)) if (m[1].toLowerCase() !== mail) straine.push(m[1]);
  }
  verificari.push({ cod: 'T1', trecut: !straine.length, opreste: true, valoare: straine.length, motiv: straine.length ? `în kit apar date de contact care nu sunt în Dosar: ${[...new Set(straine)].slice(0, 3).join(', ')}` : 'telefonul și emailul din kit sunt cele din Dosar (sau lipsesc)' });
  if (verificari.some((v) => v.opreste && !v.trecut)) return { ok: false, motiv: 'brand kitul nu trece verificările', erori: verificari.filter((v) => !v.trecut).map((v) => `${v.cod}: ${v.motiv}`), verificari };

  adauga('CITESTE.txt', '\uFEFF' + CITESTE_BRAND(nume, poze, ft, amanate), 'text/plain');
  const intrari = {}; for (const f of fisiere) { const u8 = Buffer.isBuffer(f.date) ? new Uint8Array(f.date) : strToU8(f.date); intrari[`${radacina}/${f.cale}`] = [u8, { level: /\.(png|pdf)$/.test(f.cale) ? 0 : 6, mtime: new Date('2026-11-27T20:00:00+02:00') }]; }
  const zip = Buffer.from(zipSync(intrari));
  const toateF = [...fisiere.filter((f) => !f.doarInZip).map(({ doarInZip, ...f }) => ({ ...f, cale: `${prefix}${f.cale}` })), { cale: `${prefix}${radacina}.zip`, date: zip, tip: 'application/zip' }];
  return {
    ok: true, nume, verificari, note, canale, amanate, pagini: g.pagini, fonturi: { titluri: ft.titluri, text: ft.text, rezerva_titluri: ft.rezTitluri, rezerva_text: ft.rezText },
    poze: poze.map(({ canal, ce, fisier, w, h }) => ({ canal, ce: ce === 'coperta' ? 'coperta' : 'poza_profil', cale: `${prefix}${fisier}`, w, h })),
    perechi: perechi.map((q) => ({ text: q.text, fundal: q.fundal, contrast: Math.round(q.k * 100) / 100, verdict: verdictContrast(q.k), pentru: q.pentru })),
    in_zip: fisiere.map((f) => f.cale), texte: textele, zip: `${prefix}${radacina}.zip`, ghid_pdf: `${prefix}ghid-brand.pdf`, durata_ms: Date.now() - t0, fisiere: toateF,
  };
}

export const CITESTE_BRAND = (nume, poze, ft, amanate) => [
  `Brandul ${nume} · fișierele tale`,
  '',
  'ghid-brand.pdf   Ghidul brandului: culorile, fonturile, vocea, fotografiile, logoul și pozele pentru rețele.',
  'retele/          Poza de profil și coperta, pentru fiecare rețea pe care ești, la mărimea cerută de ea. Le încarci așa cum sunt.',
  'fonturi/         Fonturile brandului, cu licența lor (SIL Open Font, gratuite). Dublu clic pe fișier și „Instalează”.',
  'culori.txt       Codurile culorilor: HEX pentru site și Canva, RGB pentru ecran, CMYK pentru tipar.',
  '',
  ...(poze.length ? ['În retele/:', ...poze.map((z) => `- ${z.fisier.replace('retele/', '')}: ${z.canal_nume}, ${z.ce}, ${mii(z.w)} × ${mii(z.h)} px`), ''] : []),
  `Titlurile le scrii cu ${ft.titluri}, textul cu ${ft.text}. Unde fonturile nu sunt instalate: ${ft.rezTitluri} pentru titluri, ${ft.rezText} pentru text.`,
  '',
  'Logoul are arhiva lui, cu fișierele pentru site și tipar și cu ghidul logoului.',
  ...(amanate.length ? ['', `Urmează, separat: ${amanate.map((a) => a.nume).join(', ').replace(/, ([^,]*)$/, ' și $1')}.`] : []),
  '',
].join('\n');
