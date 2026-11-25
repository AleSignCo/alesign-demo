// Motorul de logo · kitul final: din candidatul ales (rețeta + corecturile din listă) sau din logoul pe care clientul îl păstrează,
// fișierele pe care le primește: SVG și PDF vectorial (orizontal, stivuit, semn × color, o culoare, negativ), PNG-uri de la 16 la
// 2.048 px, faviconul, iconița de telefon, poza de profil, ghidul de două pagini, imaginea mărcii pentru OSIM și arhiva ZIP.
// Totul se construiește ca forme (nu cu filtre) și se verifică la fel ca la propuneri. Nu atinge rețeaua: urcarea o face api/logo-kit.js.
import { PDFDocument, rgb } from 'pdf-lib';
import fontkitPdf from '@pdf-lib/fontkit';
import { zipSync, strToU8 } from 'fflate';
import { valideaza, normalizeaza } from './reteta.js';
import { compileaza, svg } from './compileaza.js';
import { verifica, culoriPaleta, numeDinDosar, fundaluri, culoareNegativ, contrast, lum, pieseSiGoluri, grosimeMinima } from './verificari.js';
import { laPixeli, textCaForma } from './plansa.js';
import { axe as axeFont, octetiFont } from './fonturi.js';
import { canvaskitProaspat, transforma, matRot, cutieLista, cutie, dSvg, randeaza, binar, op } from './ck.js';
import { CAP } from './litere.js';

export const COMBINATII = ['orizontal', 'stivuit', 'semn'];
export const VARIANTE = ['color', 'o_culoare', 'negativ'];
export const MARIMI_SEMN = [16, 32, 48, 64, 128, 180, 256, 512, 1024];
export const LATIMI_COMBINATII = [512, 1024, 2048];
const LATIME_PDF_MM = { orizontal: 120, stivuit: 80, semn: 60 };
const numeFisier = (comb, v) => `${comb}-${v.replace('_', '-')}`;

export const slug = (s) => String(s || 'logo').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'logo';
const virgula = (x, z = 1) => String(Math.round(x * 10 ** z) / 10 ** z).replace('.', ',');
const hexRgb = (h) => { const n = parseInt(String(h).slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const cmyk = (h) => {
  const n = parseInt(String(h).slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const k = 1 - Math.max(r, g, b); if (k >= 1) return [0, 0, 0, 100];
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((x) => Math.round(x * 100));
};
const rgbText = (h) => { const n = parseInt(String(h).slice(1), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };

// ── corecturile din listă (cel mult 2 runde, alese de client sau de Alexandru) ──────────────────────────────────────────────
export function aplicaCorecturi(r0, cor = {}, paleta = {}) {
  const r = structuredClone(r0); const aplicate = []; const erori = [];
  if (cor == null || typeof cor !== 'object' || Array.isArray(cor)) return { reteta: r, aplicate, erori: ['corecturi: un obiect'] };
  const pas = (nume) => { const v = cor[nume]; if (v == null || v === 0) return 0; if (!Number.isInteger(v) || v < -2 || v > 2) { erori.push(`corecturi.${nume}: un întreg între -2 și 2`); return 0; } return v; };
  const logotip = () => {
    if (!r.logotip) r.logotip = r.monograma ? { font: r.monograma.font, grosime: r.monograma.grosime, ...(r.monograma.axe ? { axe: r.monograma.axe } : {}), spatiere: 20, detalii: [] } : { font: 'Inter', grosime: 500, spatiere: 10, detalii: [] };
    return r.logotip;
  };
  const g = pas('grosime');
  if (g) {
    const L = logotip(); const w = (axeFont(L.font) || {}).wght; const cur = L.grosime || 400;
    let nou = cur + 100 * g;
    if (!w) erori.push(`corecturi.grosime: fontul ${L.font} are o singură grosime`);
    else {
      if (w.statice) { const spre = w.statice.filter((x) => (g > 0 ? x > cur : x < cur)).sort((a, b) => (g > 0 ? a - b : b - a)); nou = spre[Math.min(Math.abs(g), spre.length) - 1]; }
      else nou = Math.max(w.min, Math.min(w.max, nou));
      if (nou == null || nou === cur) erori.push(`corecturi.grosime: ${L.font} nu are grosimi ${g > 0 ? 'peste' : 'sub'} ${cur}`);
      else { aplicate.push(`grosimea literelor: ${cur} → ${nou}`); L.grosime = nou; }
    }
  }
  const s = pas('spatiere');
  if (s) { const L = logotip(); const cur = L.spatiere || 0; const nou = Math.max(-50, Math.min(200, cur + 20 * s)); if (nou === cur) erori.push('corecturi.spatiere: spațierea e deja la capăt (-50…200)'); else { aplicate.push(`spațierea literelor: ${cur} → ${nou} (miimi de em)`); L.spatiere = nou; } }
  if (cor.majuscule != null) {
    if (typeof cor.majuscule !== 'boolean') erori.push('corecturi.majuscule: true, false sau null');
    else { const L = logotip(); if (!!L.majuscule !== cor.majuscule) { aplicate.push(cor.majuscule ? 'numele cu majuscule' : 'numele cum e scris în Dosar'); L.majuscule = cor.majuscule; } }
  }
  const m = pas('marime_semn');
  if (m) {
    if (!r.semn && !r.monograma) erori.push('corecturi.marime_semn: rețeta n-are semn sau monogramă');
    else { const cur = (r.combinatie && r.combinatie.marime_semn) || 1; const nou = Math.round(Math.max(0.8, Math.min(1.2, cur + 0.1 * m)) * 100) / 100; if (nou === cur) erori.push('corecturi.marime_semn: mărimea e deja la capăt (80–120 %)'); else { r.combinatie = { ...(r.combinatie || {}), marime_semn: nou }; aplicate.push(`mărimea semnului față de nume: ${Math.round(cur * 100)} % → ${Math.round(nou * 100)} %`); } }
  }
  if (cor.culoare != null && cor.culoare !== 'principal') {
    const pal = culoriPaleta(paleta); const vechi = r.culori.principal;
    if (cor.culoare === 'accent') {
      if (!r.culori.accent) erori.push('corecturi.culoare: rețeta n-are culoare de accent');
      else { r.culori = { principal: r.culori.accent, accent: vechi }; aplicate.push(`culoarea principală: ${vechi} → ${r.culori.principal} (schimbată cu accentul)`); }
    } else if (!/^#[0-9a-f]{6}$/i.test(String(cor.culoare)) || (pal.length && !pal.includes(String(cor.culoare).toLowerCase()))) erori.push(`corecturi.culoare: "principal", "accent" sau o culoare din paletă (${pal.join(', ')})`);
    else if (String(cor.culoare).toLowerCase() !== vechi.toLowerCase()) {
      const nou = String(cor.culoare).toUpperCase();
      r.culori = r.culori.accent && r.culori.accent.toLowerCase() === nou.toLowerCase() ? { principal: nou, accent: vechi } : { ...r.culori, principal: nou };
      aplicate.push(`culoarea principală: ${vechi} → ${nou}`);
    }
  }
  if (cor.fara_semn != null) {
    if (typeof cor.fara_semn !== 'boolean') erori.push('corecturi.fara_semn: true sau false');
    else if (cor.fara_semn) { if (!r.semn && !r.monograma) erori.push('corecturi.fara_semn: rețeta n-are semn'); else { r.combinatie = { ...(r.combinatie || {}), fara_semn: true }; aplicate.push('fără semn lângă nume (semnul rămâne pentru favicon și poza de profil)'); } }
  }
  return { reteta: r, aplicate, erori };
}

// ── logoul existent: SVG-ul clientului adus la forme pline, pe straturi de culoare fără suprapuneri ──────────────────────────
const NUMITE = { black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#008000', blue: '#0000FF', gray: '#808080', grey: '#808080', navy: '#000080', maroon: '#800000', olive: '#808000', teal: '#008080', purple: '#800080', silver: '#C0C0C0', orange: '#FFA500' };
function culoareSvg(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'none' || s === 'transparent') return 'none';
  let m = s.match(/^#([0-9a-f]{3})$/); if (m) return ('#' + m[1].split('').map((c) => c + c).join('')).toUpperCase();
  m = s.match(/^#([0-9a-f]{6})$/); if (m) return ('#' + m[1]).toUpperCase();
  m = s.match(/^rgb\(\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*\)$/);
  if (m) { const c = [[m[1], m[2]], [m[3], m[4]], [m[5], m[6]]].map(([x, p]) => Math.max(0, Math.min(255, Math.round(p ? (Number(x) * 255) / 100 : Number(x))))); return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase(); }
  if (NUMITE[s]) return NUMITE[s];
  return undefined; // necunoscută
}
const atribute = (s) => { const o = {}; const re = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g; let m; while ((m = re.exec(s))) o[m[1]] = m[3] != null ? m[3] : m[4]; return o; };
const stilInline = (s) => Object.fromEntries(String(s || '').split(';').map((x) => x.split(':').map((y) => y.trim())).filter((x) => x.length === 2 && x[0]));
const nr = (v, d = 0) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
const inmulteste = (a, b) => [a[0] * b[0] + a[1] * b[3], a[0] * b[1] + a[1] * b[4], a[0] * b[2] + a[1] * b[5] + a[2], a[3] * b[0] + a[4] * b[3], a[3] * b[1] + a[4] * b[4], a[3] * b[2] + a[4] * b[5] + a[5], 0, 0, 1];
function matriceSvg(t) {
  let M = [1, 0, 0, 0, 1, 0, 0, 0, 1]; const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g; let m;
  while ((m = re.exec(String(t || '')))) {
    const a = m[2].split(/[\s,]+/).filter(Boolean).map(Number); let T;
    if (m[1] === 'matrix') T = [a[0], a[2], a[4], a[1], a[3], a[5], 0, 0, 1];
    else if (m[1] === 'translate') T = [1, 0, a[0] || 0, 0, 1, a[1] || 0, 0, 0, 1];
    else if (m[1] === 'scale') T = [a[0], 0, 0, 0, a[1] != null ? a[1] : a[0], 0, 0, 0, 1];
    else if (m[1] === 'rotate') { const r = ((a[0] || 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), cx = a[1] || 0, cy = a[2] || 0; T = [c, -s, cx - c * cx + s * cy, s, c, cy - s * cx - c * cy, 0, 0, 1]; }
    else if (m[1] === 'skewX') T = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 0, 1, 0, 0, 0, 1];
    else T = [1, 0, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0, 0, 1];
    M = inmulteste(M, T);
  }
  return M;
}
export function formeDinSvg(CK, text) {
  const erori = []; const note = [];
  let s = String(text || '');
  if (!/<svg[\s>]/i.test(s)) return { erori: ['logo_existent.svg: nu e un fișier SVG'], note, straturi: [] };
  if (s.length > 2_000_000) return { erori: ['logo_existent.svg: fișierul are peste 2 MB'], note, straturi: [] };
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<(metadata|title|desc|sodipodi:namedview)\b[\s\S]*?<\/\1>/gi, '').replace(/<sodipodi:namedview\b[^>]*\/>/gi, '');
  const interzise = { text: 'text viu (literele trebuie transformate în contururi)', tspan: 'text viu', image: 'o imagine lipită (PNG/JPG) în SVG', lineargradient: 'degradeu', radialgradient: 'degradeu', filter: 'filtre (umbră, blur)', mask: 'mască', pattern: 'textură (pattern)', foreignobject: 'conținut străin', use: 'elemente refolosite (use)', clippath: 'decupaj (clipPath)' };
  for (const m of s.matchAll(/<([a-zA-Z]+)\b/g)) { const k = m[1].toLowerCase(); if (interzise[k] && !erori.some((e) => e.includes(interzise[k]))) erori.push(`logo_existent.svg: are ${interzise[k]}; curăță-l întâi (în Illustrator: Type → Create Outlines, Object → Expand) și trimite-l din nou`); }
  // clasele din <style> (exporturile din Illustrator): doar fill, fill-rule, stroke, opacity
  const clase = {};
  for (const st of s.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const r of st[1].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const dec = stilInline(r[2]);
      for (const sel of r[1].split(',').map((x) => x.trim())) { const k = sel.match(/^\.([\w-]+)$/); if (k) clase[k[1]] = { ...(clase[k[1]] || {}), ...dec }; else if (sel) note.push(`regula de stil „${sel}” a fost ignorată`); }
    }
  }
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<defs\b[\s\S]*?<\/defs>/gi, '');
  if (erori.length) return { erori, note, straturi: [] };
  const forme = []; const stiva = [{ M: [1, 0, 0, 0, 1, 0, 0, 0, 1], fill: '#000000', fillRule: 'nonzero', stroke: 'none' }];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g; let m;
  while ((m = re.exec(s))) {
    const [, inchide, tagBrut, attrs, gol2] = m; const tag = tagBrut.toLowerCase();
    if (inchide) { if (tag === 'g' || tag === 'svg' || tag === 'a') stiva.pop(); continue; }
    const a = atribute(attrs); const st = { ...(a.class ? String(a.class).split(/\s+/).reduce((o, c) => ({ ...o, ...(clase[c] || {}) }), {}) : {}), ...stilInline(a.style) };
    const val = (k) => (st[k] != null ? st[k] : a[k]);
    const p = stiva[stiva.length - 1];
    const ctx = { M: a.transform ? inmulteste(p.M, matriceSvg(a.transform)) : p.M, fill: val('fill') != null ? val('fill') : p.fill, fillRule: val('fill-rule') || p.fillRule, stroke: val('stroke') != null ? val('stroke') : p.stroke, strokeW: val('stroke-width') != null ? val('stroke-width') : p.strokeW, op: Math.min(nr(val('opacity'), 1), nr(val('fill-opacity'), 1)) * (p.op == null ? 1 : p.op), display: val('display') || p.display };
    if (tag === 'svg' && stiva.length === 1 && a.viewBox) { const v = a.viewBox.split(/[\s,]+/).map(Number); if (v.length === 4 && (v[0] || v[1])) ctx.M = inmulteste(ctx.M, [1, 0, -v[0], 0, 1, -v[1], 0, 0, 1]); }
    if (['g', 'svg', 'a'].includes(tag)) { if (!gol2) stiva.push(ctx); continue; }
    if (!['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line'].includes(tag)) continue;
    if (ctx.display === 'none') continue;
    const fill = culoareSvg(ctx.fill); const stroke = culoareSvg(ctx.stroke);
    if (stroke && stroke !== 'none' && nr(ctx.strokeW, 1) > 0) { erori.push(`logo_existent.svg: un <${tag}> are linie de contur (stroke); transform-o în formă (Object → Path → Outline Stroke) și trimite-l din nou`); continue; }
    if (tag === 'line') continue;
    if (fill === 'none') continue;
    if (fill === undefined) { erori.push(`logo_existent.svg: culoarea „${ctx.fill}” nu se poate citi; scrie-o ca #RRGGBB`); continue; }
    if (ctx.op < 0.999) { erori.push(`logo_existent.svg: un <${tag}> e transparent (opacity ${virgula(ctx.op, 2)}); logoul are nevoie de culori pline`); continue; }
    const b = new CK.PathBuilder();
    if (tag === 'path') { const q = CK.Path.MakeFromSVGString(a.d || ''); if (!q) { erori.push('logo_existent.svg: un <path> are „d” care nu se poate citi'); continue; } b.addPath(q); }
    else if (tag === 'rect') { const x = nr(a.x), y = nr(a.y), w = nr(a.width), h = nr(a.height); let rx = a.rx != null ? nr(a.rx) : a.ry != null ? nr(a.ry) : 0, ry = a.ry != null ? nr(a.ry) : rx; rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2); if (w <= 0 || h <= 0) continue; if (rx || ry) b.addRRect(CK.RRectXY(CK.LTRBRect(x, y, x + w, y + h), rx, ry)); else b.addRect(CK.LTRBRect(x, y, x + w, y + h)); }
    else if (tag === 'circle') { const r = nr(a.r); if (r <= 0) continue; b.addOval(CK.LTRBRect(nr(a.cx) - r, nr(a.cy) - r, nr(a.cx) + r, nr(a.cy) + r)); }
    else if (tag === 'ellipse') { const rx = nr(a.rx), ry = nr(a.ry); if (rx <= 0 || ry <= 0) continue; b.addOval(CK.LTRBRect(nr(a.cx) - rx, nr(a.cy) - ry, nr(a.cx) + rx, nr(a.cy) + ry)); }
    else { const pts = String(a.points || '').trim().split(/[\s,]+/).map(Number); if (pts.length < 6) continue; b.moveTo(pts[0], pts[1]); for (let i = 2; i + 1 < pts.length; i += 2) b.lineTo(pts[i], pts[i + 1]); b.close(); }
    b.setFillType(ctx.fillRule === 'evenodd' ? CK.FillType.EvenOdd : CK.FillType.Winding);
    let path = b.detachAndDelete(); path = transforma(CK, path, ctx.M);
    if (!path.isEmpty()) forme.push({ path, culoare: fill });
  }
  if (erori.length) return { erori: [...new Set(erori)], note, straturi: [] };
  if (!forme.length) return { erori: ['logo_existent.svg: n-are nicio formă plină'], note, straturi: [] };
  // ordinea de pictor: fiecare formă acoperă ce e sub ea; albul (și aproape-albul) e gol, se vede fundalul
  const straturi = []; let albe = 0;
  for (const f of forme) {
    for (const st of straturi) st.path = op(CK, st.path, f.path, 'scade');
    if (lum(f.culoare) > 0.9) { albe++; continue; }
    const st = straturi.find((x) => x.culoare === f.culoare);
    if (st) st.path = op(CK, st.path, f.path, 'uneste'); else straturi.push({ culoare: f.culoare, path: f.path });
  }
  const pline = straturi.filter((x) => !x.path.isEmpty());
  if (albe) note.push(`${albe} ${albe === 1 ? 'formă albă a fost tratată' : 'forme albe au fost tratate'} ca gol: pe fundal deschis arată la fel, iar pe fundal închis se vede fundalul`);
  if (!pline.length) return { erori: ['logo_existent.svg: după ce albul devine gol, nu mai rămâne nimic din logo'], note, straturi: [] };
  // garda: straturile față de desenul original, pixel cu pixel (512 px)
  const fer = cutieLista(forme.map((f) => f.path)); const L = 512;
  const harta = (lista) => { const out = new Int32Array(L * L).fill(-1); lista.forEach((f, i) => { const mm = binar(randeaza(CK, [f.path], fer, L, L, { aa: false })); for (let k = 0; k < L * L; k++) if (mm[k]) out[k] = lum(f.culoare) > 0.9 ? -1 : parseInt(f.culoare.slice(1), 16); }); return out; };
  const a1 = harta(forme), a2 = harta(pline); let eg = 0, tot = 0; for (let k = 0; k < L * L; k++) { if (a1[k] !== -1 || a2[k] !== -1) { tot++; if (a1[k] === a2[k]) eg++; } }
  const iou = tot ? eg / tot : 1;
  return { erori: [], note, straturi: pline, garda: Math.round(iou * 100000) / 100000, cutie: fer };
}

// ── fișierele ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function pdfVector(straturi, b, latimeMm, titlu) {
  const doc = await PDFDocument.create(); doc.setTitle(titlu); doc.setProducer('AleSign · motorul de logo'); doc.setCreator('AleSign');
  const w = b[2] - b[0], h = b[3] - b[1]; const Wpt = (latimeMm / 25.4) * 72; const s = Wpt / w; const Hpt = h * s;
  const page = doc.addPage([Wpt, Hpt]);
  for (const st of straturi) page.drawSvgPath(dSvg(st.path), { x: -b[0] * s, y: Hpt + b[1] * s, scale: s, color: hexRgb(st.culoare) });
  return Buffer.from(await doc.save());
}
const pngDin = (sharp, text, w, h) => sharp(Buffer.from(laPixeli(text, w, h))).png({ compressionLevel: 9 }).toBuffer();
// SVG-ul semnului pus pe o placă de n × n, cu semnul pe `parte` din latură (iconița de telefon, poza de profil, faviconul pe placă)
function placa(textSemn, n, fundal, parte = 0.64) {
  const s = Math.round(n * parte); const o = Math.round((n - s) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}"><rect width="${n}" height="${n}" fill="${fundal}"/>${laPixeli(textSemn, s, s).replace('<svg ', `<svg x="${o}" y="${o}" `)}</svg>`;
}
export function ico(pngs) {
  const h = Buffer.alloc(6 + 16 * pngs.length); h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(pngs.length, 4);
  let off = h.length;
  pngs.forEach((p, i) => { const o = 6 + 16 * i; h[o] = p.n >= 256 ? 0 : p.n; h[o + 1] = p.n >= 256 ? 0 : p.n; h.writeUInt16LE(1, o + 4); h.writeUInt16LE(32, o + 6); h.writeUInt32LE(p.buf.length, o + 8); h.writeUInt32LE(off, o + 12); off += p.buf.length; });
  return Buffer.concat([h, ...pngs.map((p) => p.buf)]);
}
// cea mai mică înălțime pe ecran (px) la care piesele și golurile literelor sunt aceleași ca la 400 px
export async function inaltimeMinimaPx(sharp, text, b) {
  const asp = (b[2] - b[0]) / (b[3] - b[1]);
  const masca = async (h) => {
    const w = Math.max(1, Math.round(h * asp));
    const { data, info } = await sharp(Buffer.from(laPixeli(text, w, h))).extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const m = new Uint8Array(info.width * info.height); for (let i = 0; i < m.length; i++) m[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
    return pieseSiGoluri(m, info.width, info.height);
  };
  const ref = await masca(400);
  for (const h of [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64]) { const t = await masca(h); if (t.piese === ref.piese && t.goluri === ref.goluri) return h; }
  return 80;
}
// cea mai mică înălțime tipărită (mm) la care cea mai subțire parte are cel puțin 0,1 mm (cel puțin 6 mm)
function inaltimeMinimaMm(CK, forme) {
  const P = forme.map((f) => f.path); const b = cutieLista(P); const H = 400; const W = Math.min(2400, Math.round(H * ((b[2] - b[0]) / (b[3] - b[1]))) + 8);
  const m = binar(randeaza(CK, P, b, W, H + 8, { aa: true, margine: 4 })); const g = grosimeMinima(m, W, H + 8);
  return Math.max(6, Math.ceil((0.1 * H) / Math.max(0.5, g)));
}

// ── ghidul logoului (două pagini, A4) ────────────────────────────────────────────────────────────────────────────────────
export const TEXTE_GHID = {
  intro: 'Pe două pagini: cum arată logoul pe fundaluri diferite, cât loc îi lași, cât de mic poate fi și ce culori are. Dă ghidul și celui care îți tipărește firma, cărțile de vizită sau tricourile.',
  variante: {
    color: 'Color, pe fundal deschis. E varianta de bază: pe site, pe cărțile de vizită, pe firma de la intrare.',
    negativ: 'Negativ, pe fundal închis sau pe o poză întunecată.',
    o_culoare: 'Într-o singură culoare, pentru ștampilă, gravură, broderie sau tipar cu o culoare.',
  },
  spatiu: 'Lasă în jurul logoului cel puțin x, adică înălțimea majusculelor din nume. În zona asta nu intră text, alte logouri sau marginea foii.',
  spatiuExistent: 'Lasă în jurul logoului cel puțin x, adică un sfert din înălțimea lui. În zona asta nu intră text, alte logouri sau marginea foii.',
  marime: (mm, px, ceSemn, pxSemn) => `Tipărit, logoul întreg are nevoie de cel puțin ${mm} mm înălțime: atât e nevoie ca liniile cele mai subțiri să iasă la tipar. Pe ecran, cel puțin ${px} px înălțime, ca literele să rămână deschise.${ceSemn ? ` ${ceSemn} singur se citește de la ${pxSemn} px${pxSemn <= 16 ? ', cât un favicon' : ''}.` : ''}`,
  greseli: [
    ['Nu-l întinde și nu-l turti.', 'Îl mărești sau îl micșorezi doar ținând proporțiile: în Word și în Canva, trage de colț.'],
    ['Nu-l roti.', 'Logoul stă drept, și pe o poză înclinată.'],
    ['Nu-i schimba culorile.', 'Folosește doar variantele din arhivă: color, negativ sau într-o culoare.'],
    ['Nu-l pune pe un fundal apropiat de culoarea lui.', 'Acolo merge varianta negativ sau cea într-o culoare, oricare are contrast.'],
    ['Nu-i adăuga umbră, contur sau alte efecte.', 'Logoul e plin și plat; așa iese curat la tipar, pe hârtie și pe material.'],
  ],
  greseala6: {
    semn: ['Nu muta semnul și nu-i schimba mărimea.', 'Semnul și numele au locul lor. Pentru un spațiu mai îngust ai varianta stivuită.'],
    font: ['Nu rescrie numele cu alt font.', 'Literele din logo sunt desenate ca forme; numele scris cu alt font nu mai e logoul.'],
    taiat: ['Nu-l tăia și nu-i acoperi o parte.', 'Dacă nu încape, alege o variantă mai îngustă sau fă-l mai mic.'],
  },
  arhiva: [
    ['svg', 'pentru site și pentru cine lucrează cu logoul pe calculator.'],
    ['pdf', 'pentru tipografie: vectori, se măresc oricât fără să se strice.'],
    ['png', 'imagini gata făcute, pe fundal transparent, de la 16 la 2.048 px.'],
    ['web', 'faviconul site-ului, iconița pentru ecranul telefonului și poza de profil.'],
    ['osim', 'imaginea mărcii, 8 × 8 cm la 300 dpi, pentru cererea ta de înregistrare la OSIM.'],
  ],
};

async function ghidLogo(o) {
  const { CK, nume, culori, paleta, straturi, cuSemn, existent, minim, font: fontLogo, forme6 } = o;
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkitPdf);
  const fR = await doc.embedFont(octetiFont('Lato', 400).octeti, { subset: true }); const fB = await doc.embedFont(octetiFont('Lato', 700).octeti, { subset: true });
  doc.setTitle(`Ghidul logoului · ${nume}`); doc.setAuthor('AleSign'); doc.setCreator('AleSign'); doc.setProducer('AleSign · motorul de logo'); doc.setLanguage('ro');
  const W = 595.28, H = 841.89, M = 48, LW = W - 2 * M;
  const ink = rgb(0.11, 0.11, 0.1), muted = rgb(0.42, 0.4, 0.37), linie = rgb(0.85, 0.84, 0.81), rosu = rgb(0.72, 0.16, 0.12);
  const rupe = (t, f, z, lat) => { const out = []; let rand = ''; for (const c of String(t).split(/\s+/)) { const x = rand ? `${rand} ${c}` : c; if (f.widthOfTextAtSize(x, z) > lat && rand) { out.push(rand); rand = c; } else rand = x; } if (rand) out.push(rand); return out; };
  const scrie = (pg, t, x, y, { z = 9.5, f = fR, c = ink, lat = LW, pas = 1.38 } = {}) => { for (const r of rupe(t, f, z, lat)) { pg.drawText(r, { x, y: H - y - z, size: z, font: f, color: c }); y += z * pas; } return y; };
  const desen = (pg, st, b, x, y, w, h) => {
    const bw = b[2] - b[0], bh = b[3] - b[1]; const s = Math.min(w / bw, h / bh); const ox = x + (w - bw * s) / 2, oy = y + (h - bh * s) / 2;
    for (const q of st) pg.drawSvgPath(dSvg(q.path), { x: ox - b[0] * s, y: H - oy + b[1] * s, scale: s, color: hexRgb(q.culoare), ...(q.contur ? { borderColor: hexRgb(q.contur), borderWidth: 1.2 } : {}) });
    return { s, x: ox, y: oy, w: bw * s, h: bh * s };
  };
  const cutieRect = (pg, x, y, w, h, cul, extra = {}) => pg.drawRectangle({ x, y: H - y - h, width: w, height: h, color: cul ? hexRgb(cul) : undefined, ...extra });
  const titlu = (pg, t, y) => { pg.drawText(t, { x: M, y: H - y - 12, size: 12, font: fB, color: ink }); return y + 22; };
  const fd = fundaluri(paleta); const deschis = fd[0].hex; const neg = culori.negativ;
  const fundalNeg = contrast(neg, culori.principal) >= 3 ? culori.principal : fd[1].hex;
  const orz = straturi.orizontal;

  // pagina 1
  let p = doc.addPage([W, H]); let y = M;
  p.drawText('Ghidul logoului', { x: M, y: H - y - 9, size: 9, font: fR, color: muted }); y += 16;
  p.drawText(nume, { x: M, y: H - y - 20, size: 20, font: fB, color: ink }); y += 32;
  y = scrie(p, TEXTE_GHID.intro, M, y, { c: muted }) + 14;
  y = titlu(p, 'Variantele', y);
  const lc = (LW - 24) / 3; const hc = 92;
  const cazuri = [['color', deschis, orz.color, TEXTE_GHID.variante.color], ['negativ', fundalNeg, orz.negativ, TEXTE_GHID.variante.negativ], ['o_culoare', '#FFFFFF', orz.o_culoare, TEXTE_GHID.variante.o_culoare]];
  let yMax = y;
  cazuri.forEach(([, bg, v, t], i) => {
    const x = M + i * (lc + 12); cutieRect(p, x, y, lc, hc, bg, bg === '#FFFFFF' ? { borderColor: linie, borderWidth: 0.7 } : {});
    desen(p, v.straturi, v.cutie, x + 14, y + 18, lc - 28, hc - 36);
    yMax = Math.max(yMax, scrie(p, t, x, y + hc + 8, { z: 8.5, lat: lc, c: muted }));
  });
  y = yMax + 16;
  y = titlu(p, 'Spațiul din jur', y);
  { // desenul: logoul, cu zona liberă de x pe fiecare latură
    const bx = M, bw = 300, bh = 120; cutieRect(p, bx, y, bw, bh, deschis);
    const b = orz.color.cutie; const lat = b[2] - b[0], ina = b[3] - b[1]; const xu = existent ? ina / 4 : CAP;
    const s = Math.min((bw - 40) / (lat + 2 * xu), (bh - 24) / (ina + 2 * xu));
    const d = desen(p, orz.color.straturi, b, bx + (bw - (lat + 2 * xu) * s) / 2 + xu * s, y + (bh - (ina + 2 * xu) * s) / 2 + xu * s, lat * s, ina * s);
    const X = xu * s;
    p.drawRectangle({ x: d.x - X, y: H - (d.y + d.h + X), width: d.w + 2 * X, height: d.h + 2 * X, borderColor: rosu, borderWidth: 0.7, borderDashArray: [3, 2], opacity: 0 });
    p.drawLine({ start: { x: d.x - X, y: H - d.y - d.h / 2 }, end: { x: d.x, y: H - d.y - d.h / 2 }, color: rosu, thickness: 0.7 });
    p.drawText('x', { x: d.x - X / 2 - 2.5, y: H - d.y - d.h / 2 + 3, size: 8, font: fB, color: rosu });
    scrie(p, existent ? TEXTE_GHID.spatiuExistent : TEXTE_GHID.spatiu, bx + bw + 18, y + 6, { lat: LW - bw - 18 });
    y += bh + 18;
  }
  y = titlu(p, 'Mărimea minimă', y);
  {
    const hMm = minim.mm; const hPt = (hMm / 25.4) * 72; const b = orz.color.cutie; const wPt = hPt * ((b[2] - b[0]) / (b[3] - b[1]));
    cutieRect(p, M, y, 170, 60, deschis); desen(p, orz.color.straturi, b, M + 14, y + (60 - hPt) / 2, Math.min(wPt, 142), hPt);
    if (straturi.semn) { const sPt = (5 / 25.4) * 72; cutieRect(p, M + 180, y, 60, 60, deschis); desen(p, straturi.semn.color.straturi, straturi.semn.color.cutie, M + 180 + (60 - sPt) / 2, y + (60 - sPt) / 2, sPt, sPt); }
    scrie(p, TEXTE_GHID.marime(hMm, minim.px, straturi.semn ? (existent || cuSemn ? 'Semnul' : 'Inițiala') : null, minim.pxSemn), M + 258, y + 2, { lat: LW - 258 });
    y += 60 + 22;
  }
  y = titlu(p, 'Culorile', y);
  {
    const lista = [['Principală', culori.principal], ...(culori.accent ? [['Accent', culori.accent]] : []), ['Fundal', deschis], ['Negativ', neg]].filter(([, h], i, a) => a.findIndex((x) => x[1].toLowerCase() === h.toLowerCase()) === i);
    const lw = Math.min(118, (LW - 12 * (lista.length - 1)) / lista.length);
    lista.forEach(([n, h], i) => {
      const x = M + i * (lw + 12); cutieRect(p, x, y, lw, 42, h, lum(h) > 0.85 ? { borderColor: linie, borderWidth: 0.7 } : {});
      p.drawText(n, { x, y: H - y - 56, size: 8.5, font: fB, color: ink });
      p.drawText(h.toUpperCase(), { x, y: H - y - 68, size: 8, font: fR, color: muted });
      p.drawText(`RGB ${rgbText(h)}`, { x, y: H - y - 79, size: 8, font: fR, color: muted });
      p.drawText(`CMYK ${cmyk(h).join(' ')}`, { x, y: H - y - 90, size: 8, font: fR, color: muted });
    });
    y += 104;
    const perechi = [['Principala pe fundal', culori.principal, deschis, false], ...(culori.accent ? [['Accentul pe fundal', culori.accent, deschis, true]] : []), ['Negativul pe principală', neg, culori.principal, false]];
    for (const [t, a, b, det] of perechi) { const k = contrast(a, b); const v = k >= 4.5 ? 'se citește și ca text mic' : k >= 3 ? 'bun pentru logo și titluri' : det ? 'merge ca detaliu în logo, nu pentru text' : 'nu pune logoul așa'; p.drawText(`${t}: ${virgula(k)}:1 · ${v}`, { x: M, y: H - y - 9, size: 9, font: fR, color: k >= 3 || det ? ink : rosu }); y += 14; }
    y = scrie(p, 'CMYK-ul e o conversie aproximativă; la tipar cere tipografiei o probă de culoare.', M, y + 4, { z: 8, c: muted });
  }
  y = Math.max(y + 10, H - M - 40);
  scrie(p, existent ? 'Logoul e cel pe care îl ai deja; fișierele sunt refăcute din el ca forme pline.' : `Literele din logo sunt desenate ca forme, pornind de la fontul ${fontLogo.familie} (licența SIL Open Font, gratuit). Dacă vrei să scrii ceva lângă logo în același stil, îl găsești la fonts.google.com.`, M, y, { z: 8, c: muted });

  // pagina 2
  p = doc.addPage([W, H]); y = M;
  p.drawText('Ce nu faci cu logoul', { x: M, y: H - y - 18, size: 18, font: fB, color: ink }); y += 30;
  y = scrie(p, 'Fiecare exemplu de mai jos e făcut cu logoul tău, așa cum arată când cineva îl potrivește din ochi.', M, y, { c: muted }) + 14;
  const g6 = forme6.tip; const greseli = [...TEXTE_GHID.greseli, TEXTE_GHID.greseala6[g6]];
  const cw = (LW - 18) / 2, ch = 118;
  greseli.forEach(([t1, t2], i) => {
    const x = M + (i % 2) * (cw + 18), yy = y + Math.floor(i / 2) * (ch + 62);
    const ex = o.exemple[i]; cutieRect(p, x, yy, cw, ch, ex.fundal, ex.fundal === '#FFFFFF' ? { borderColor: linie, borderWidth: 0.7 } : {});
    desen(p, ex.straturi, ex.cutie, x + 30, yy + 26, cw - 60, ch - 52);
    const cx = x + cw - 16, cy = H - yy - 16; p.drawLine({ start: { x: cx - 6, y: cy - 6 }, end: { x: cx + 6, y: cy + 6 }, color: rosu, thickness: 1.6 }); p.drawLine({ start: { x: cx - 6, y: cy + 6 }, end: { x: cx + 6, y: cy - 6 }, color: rosu, thickness: 1.6 });
    p.drawText(t1, { x, y: H - yy - ch - 18, size: 9.5, font: fB, color: rosu });
    scrie(p, t2, x, yy + ch + 22, { z: 8.5, lat: cw, c: muted });
  });
  y += 3 * (ch + 62) + 6;
  y = titlu(p, 'Ce găsești în arhivă', y);
  for (const [f, t] of TEXTE_GHID.arhiva) { p.drawText(`${f}/`, { x: M, y: H - y - 9.5, size: 9.5, font: fB, color: ink }); y = scrie(p, t, M + 44, y, { lat: LW - 44 }) + 3; }
  return Buffer.from(await doc.save());
}

// nuanța unei culori (0–360) și o culoare din nuanță, saturație, luminozitate: pentru exemplul cu culori străine
function nuanta(h) { const n = parseInt(h.slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (x * 60 + 360) % 360; }
function hsl(h, s, l) { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); }
// exemplele de folosire greșită, desenate pe logoul real (forme transformate, nu imagini)
function exempleGreseli(CK, orz, culori, paleta, tip6, fontAlt) {
  const fd = fundaluri(paleta); const deschis = fd[0].hex; const P = orz.color.straturi;
  const mut = (st, m) => st.map((q) => ({ ...q, path: transforma(CK, q.path, m) }));
  const box = (st) => cutieLista(st.map((q) => q.path));
  const b = orz.color.cutie; const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const out = [];
  const intins = mut(P, [1.5, 0, -cx * 0.5, 0, 0.62, cy * 0.38, 0, 0, 1]); out.push({ fundal: deschis, straturi: intins, cutie: box(intins) });
  const rotit = mut(P, matRot(18, cx, cy)); out.push({ fundal: deschis, straturi: rotit, cutie: box(rotit) });
  // culori străine: nuanța opusă principalei
  const n = parseInt(culori.principal.slice(1), 16); const h0 = nuanta(culori.principal);
  out.push({ fundal: deschis, straturi: P.map((q, i) => ({ ...q, culoare: hsl((h0 + 150 + 70 * i) % 360, 0.7, 0.5) })), cutie: b });
  // fundal fără contrast: amestecul principalei cu alb, la contrast sub 2:1
  let bg = culori.principal; for (let t = 0.1; t < 0.95; t += 0.05) { const mix = '#' + [16, 8, 0].map((sh) => { const c = (n >> sh) & 255; return Math.round(c + (255 - c) * t).toString(16).padStart(2, '0'); }).join(''); if (contrast(culori.principal, mix) >= 1.5) { bg = mix.toUpperCase(); break; } }
  out.push({ fundal: bg, straturi: P, cutie: b });
  // umbră și contur
  const umbra = P.map((q) => ({ ...q, path: transforma(CK, q.path, [1, 0, (b[3] - b[1]) * 0.06, 0, 1, (b[3] - b[1]) * 0.06, 0, 0, 1]), culoare: '#9A9690' }));
  out.push({ fundal: deschis, straturi: [...umbra, ...P.map((q) => ({ ...q, contur: '#1A1A1A' }))], cutie: box([...umbra, ...P]) });
  // a șasea
  if (tip6 === 'semn') {
    out.push(null); // îl pune genereazaKit, din formele combinației
  } else if (tip6 === 'font' && fontAlt) {
    out.push({ fundal: deschis, straturi: [{ path: fontAlt, culoare: culori.principal }], cutie: cutie(fontAlt) });
  } else {
    const taiat = P.map((q) => ({ ...q, path: op(CK, q.path, (() => { const bb = new CK.PathBuilder(); bb.addRect(CK.LTRBRect(b[0] - 1, b[1] - 1, b[0] + (b[2] - b[0]) * 0.68, b[3] + 1)); return bb.detachAndDelete(); })(), 'intersecteaza') }));
    out.push({ fundal: deschis, straturi: taiat, cutie: b });
  }
  return out;
}

export const CITESTE_CLIENT = (nume, cuSemn, existent) => [
  `Logoul ${nume} · fișierele tale`,
  '',
  'Arhiva are cinci foldere. Dacă nu știi ce să trimiți: PDF-ul merge la tipografie, PNG-ul merge oriunde altundeva.',
  '',
  'svg/   Logoul în vectori, pentru site și pentru cine lucrează cu el pe calculator (designer, programator).',
  'pdf/   Tot vectori, pentru tipografie: cărți de vizită, firma de la intrare, autocolante. Se măresc oricât fără să se strice.',
  'png/   Imagini gata făcute, pe fundal transparent, de la 16 la 2.048 px. Merg în Word, în Canva și pe rețele.',
  'web/   Faviconul site-ului, iconița pentru ecranul telefonului și poza de profil (1.024 px).',
  'osim/  Imaginea mărcii, 8 × 8 cm la 300 dpi, pentru cererea ta de înregistrare la OSIM.',
  '',
  'Fiecare logo vine în trei feluri:',
  '- color: pe fundal deschis, e varianta de bază;',
  '- negativ: deschis la culoare, pentru fundal închis sau pentru poze întunecate;',
  '- o-culoare: tot logoul într-o singură culoare, pentru ștampilă, gravură sau broderie.',
  '',
  existent
    ? (cuSemn ? 'Și în două așezări: orizontal (logoul întreg) și semn (doar semnul, pentru favicon și poza de profil).' : 'Logoul întreg e în fișierele „orizontal”.')
    : `Și în trei așezări: orizontal (${cuSemn ? 'semnul lângă nume' : 'numele pe un rând'}), stivuit (${cuSemn ? 'semnul deasupra numelui' : 'numele pe două rânduri, unde se poate'}) și semn (${cuSemn ? 'doar semnul' : 'doar inițiala'}, pentru favicon și poza de profil).`,
  '',
  'Regulile de folosire sunt în ghid-logo.pdf, pe două pagini. Dă-l și celui care îți tipărește materialele.',
  ...(existent ? [] : ['', `Logoul e făcut pentru ${nume} și nu-l mai folosim pentru nimeni.`]),
  '',
].join('\n');

// ── kitul ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function genereazaKit(cerere, { sharp, prefix = '', svgExistent = null, svgSemnExistent = null, pragMemorieMB = 600 } = {}) {
  const t0 = Date.now(); const CK = await canvaskitProaspat(pragMemorieMB);
  const paleta = cerere.paleta || {}; const dosar = cerere.dosar || null; const note = [];
  const existent = !!cerere.logo_existent;
  let r = null, c = null, aplicate = [], verificari = [], forme, numeFirma, cuSemn, fontLogo = null, culori;
  if (!existent) {
    const k = aplicaCorecturi(normalizeaza(cerere.reteta).reteta, cerere.corecturi || {}, paleta); // formele echivalente sigure, ca la set
    if (k.erori.length) return { ok: false, motiv: 'corecturile nu se pot aplica', erori: k.erori };
    r = k.reteta; aplicate = k.aplicate;
    const v = valideaza(r, { numeDosar: dosar ? numeDinDosar(dosar) : null, paleta: culoriPaleta(paleta) });
    if (!v.ok) return { ok: false, motiv: 'rețeta finală nu trece validarea', erori: v.erori };
    let c2;
    try { c = await compileaza(r); c2 = await compileaza(r); } catch (e) { return { ok: false, motiv: aplicate.length ? 'rețeta cu corecturile nu se poate desena' : 'rețeta nu se poate desena', erori: [`${r.id}: ${String(e.message || e).slice(0, 300)}`], reteta_finala: r, aplicate }; }
    const h2 = svg(c2.CK, c2.forme.orizontal, r.culori, 'color').hash;
    const x = verifica(c, r, { paleta, dosar, hash2: h2, comparatii: [], cuvinteDescriptive: cerere.cuvinte_descriptive || [] });
    verificari = x.verificari.map(({ cod, trecut, valoare, prag, motiv, opreste }) => ({ cod, trecut, opreste, valoare, prag, motiv }));
    const opresc = verificari.filter((q) => q.opreste && q.trecut === false);
    if (opresc.length) return { ok: false, motiv: 'rețeta cu corecturile nu trece verificările', erori: opresc.map((q) => `${q.cod}: ${q.motiv}`), verificari, reteta_finala: r, aplicate };
    forme = c.forme; numeFirma = r.nume; cuSemn = c.areSemn; fontLogo = c.font;
    culori = { principal: r.culori.principal, accent: r.culori.accent, negativ: culoareNegativ(paleta) };
  } else {
    if (!svgExistent) return { ok: false, motiv: 'logo_existent: lipsește SVG-ul', erori: ['logo_existent.svg sau logo_existent.cale'] };
    const L = formeDinSvg(CK, svgExistent); note.push(...L.note);
    if (L.erori.length) return { ok: false, motiv: 'logoul trimis nu se poate folosi așa cum e', erori: L.erori };
    let S = null; if (svgSemnExistent) { S = formeDinSvg(CK, svgSemnExistent); note.push(...S.note.map((x) => `semn: ${x}`)); if (S.erori.length) return { ok: false, motiv: 'semnul trimis nu se poate folosi așa cum e', erori: S.erori.map((e) => e.replace('logo_existent.svg', 'logo_existent.semn_svg')) }; }
    numeFirma = (dosar && numeDinDosar(dosar)) || cerere.nume || 'logo'; cuSemn = !!S;
    // culoarea pentru varianta într-o culoare: cea mai închisă din logo
    const toate = [...L.straturi, ...(S ? S.straturi : [])].map((q) => q.culoare);
    const principal = [...toate].sort((a, b) => lum(a) - lum(b))[0];
    culori = { principal, accent: null, negativ: culoareNegativ(paleta) };
    const fl = L.straturi.map((q) => ({ path: q.path, culoare: q.culoare }));
    const fs2 = S ? S.straturi.map((q) => ({ path: q.path, culoare: q.culoare })) : null;
    forme = { orizontal: fl, stivuit: null, semn: fs2, logotip: fl };
    verificari.push({ cod: 'B1', trecut: L.garda >= 0.995 && (!S || S.garda >= 0.995), opreste: true, valoare: Math.min(L.garda, S ? S.garda : 1), prag: 0.995, motiv: 'straturile de culoare refăcute față de desenul trimis, pixel cu pixel la 512 px' });
    const culs = [...new Set(toate)]; verificari.push({ cod: 'S2', trecut: true, opreste: false, valoare: culs.length, motiv: `culorile din logo: ${culs.join(', ')}` });
    if (!S) note.push('semnul n-a venit separat: faviconul și poza de profil sunt făcute din logoul întreg; dacă e lat, nu se citește la 16 px (trimite și semn_svg)');
    if (verificari.some((q) => q.opreste && q.trecut === false)) return { ok: false, motiv: 'logoul trimis nu s-a putut reface exact', erori: verificari.filter((q) => q.trecut === false).map((q) => `${q.cod}: ${q.motiv}`), verificari };
  }
  const fisiere = []; const adauga = (cale, date, tip) => fisiere.push({ cale, date, tip });
  // SVG, PDF, PNG pentru fiecare combinație și variantă
  const combs = COMBINATII.filter((k) => forme[k] && forme[k].length);
  const straturi = {};
  for (const comb of combs) {
    straturi[comb] = {};
    for (const v of VARIANTE) {
      const x = svg(CK, forme[comb], culori, v); straturi[comb][v] = x;
      const nf = numeFisier(comb, v);
      adauga(`svg/${nf}.svg`, x.text, 'image/svg+xml');
      adauga(`pdf/${nf}.pdf`, await pdfVector(x.straturi, x.cutie, LATIME_PDF_MM[comb], `${numeFirma} · ${nf}`), 'application/pdf');
      if (comb === 'semn') for (const n of MARIMI_SEMN) adauga(`png/${nf}-${n}.png`, await pngDin(sharp, x.text, n, n), 'image/png');
      else for (const w of LATIMI_COMBINATII) { const hh = Math.max(1, Math.round((w * (x.cutie[3] - x.cutie[1])) / (x.cutie[2] - x.cutie[0]))); adauga(`png/${nf}-${w}.png`, await pngDin(sharp, x.text, w, hh), 'image/png'); }
    }
  }
  // web: favicon, iconița de telefon, poza de profil (din semn; la logoul existent fără semn, din logo)
  const sursaIcon = straturi.semn || straturi.orizontal;
  const fd = fundaluri(paleta);
  const folosite = [...new Set(sursaIcon.color.straturi.map((q) => q.culoare))];
  const peAlb = Math.min(...folosite.map((h) => contrast(h, '#FFFFFF')));
  const placaFundal = contrast(culori.negativ, culori.principal) >= 3 ? culori.principal : fd[0].hex;
  const semnPePlaca = placaFundal === culori.principal ? sursaIcon.negativ.text : sursaIcon.color.text;
  const favSvg = peAlb >= 3 ? sursaIcon.color.text : placa(semnPePlaca, 64, placaFundal, 0.78);
  adauga('web/favicon.svg', favSvg, 'image/svg+xml');
  const fav = []; for (const n of [16, 32, 48]) fav.push({ n, buf: await sharp(Buffer.from(laPixeli(favSvg, n, n))).png().toBuffer() });
  adauga('web/favicon.ico', ico(fav), 'image/x-icon');
  adauga('web/apple-touch-icon.png', await sharp(Buffer.from(placa(semnPePlaca, 180, placaFundal, 0.64))).flatten({ background: placaFundal }).png().toBuffer(), 'image/png');
  adauga('web/avatar.png', await sharp(Buffer.from(placa(semnPePlaca, 1024, placaFundal, 0.64))).flatten({ background: placaFundal }).png().toBuffer(), 'image/png');
  // ghidul
  const orz = straturi.orizontal; const minim = { mm: existent ? inaltimeMinimaMm(CK, forme.orizontal) : 6, px: await inaltimeMinimaPx(sharp, orz.o_culoare.text, orz.o_culoare.cutie), pxSemn: straturi.semn ? await inaltimeMinimaPx(sharp, straturi.semn.o_culoare.text, straturi.semn.o_culoare.cutie) : null };
  let tip6 = existent ? 'taiat' : (c.areSemn && !c.faraSemn ? 'semn' : 'font'); let fontAlt = null;
  if (tip6 === 'font') { const alt = fontLogo.serife ? 'Inter' : 'DM Serif Display'; const t = textCaForma(CK, alt, alt === 'Inter' ? 600 : 400, r.logotip && r.logotip.majuscule ? numeFirma.toLocaleUpperCase('ro-RO') : numeFirma, 100, 0, 0); fontAlt = t.d ? CK.Path.MakeFromSVGString(t.d) : null; if (!fontAlt) tip6 = 'taiat'; }
  const exemple = exempleGreseli(CK, orz, culori, paleta, tip6, fontAlt);
  if (tip6 === 'semn') { // semnul mutat: din formele combinației orizontale (semn la stânga, nume la dreapta)
    const L = c.forme.logotip; const sb = forme.semn; const lb = cutieLista(L.map((f) => f.path)); const sbb = cutieLista(sb.map((f) => f.path)); const k = ((lb[3] - lb[1]) * 1.9) / (sbb[3] - sbb[1]);
    const st = [...L.map((f) => ({ path: f.path, culoare: f.culoare === 'accent' ? culori.accent : culori.principal })), ...sb.map((f) => ({ path: transforma(CK, f.path, [k, 0, lb[2] + 24 - sbb[0] * k, 0, k, lb[1] - (sbb[3] - sbb[1]) * k * 0.55 - sbb[1] * k, 0, 0, 1]), culoare: f.culoare === 'accent' ? culori.accent : culori.principal }))];
    exemple[5] = { fundal: fd[0].hex, straturi: st, cutie: cutieLista(st.map((q) => q.path)) };
  }
  const ghid = await ghidLogo({ CK, nume: numeFirma, culori, paleta, straturi, cuSemn, existent, minim, font: fontLogo, forme6: { tip: tip6 }, exemple });
  adauga('ghid-logo.pdf', ghid, 'application/pdf');
  // OSIM: reprezentarea mărcii, 8 × 8 cm la 300 dpi, pe alb, color; combinația cea mai apropiată de pătrat, dacă nu se cere alta
  const os = cerere.osim || {};
  const alegeri = combs.filter((k) => k !== 'semn' || !combs.includes('orizontal'));
  const aspect = (k) => { const b = straturi[k].color.cutie; const a = (b[2] - b[0]) / (b[3] - b[1]); return a > 1 ? a : 1 / a; };
  const combOsim = os.varianta && combs.includes(os.varianta) ? os.varianta : alegeri.sort((a, b) => aspect(a) - aspect(b))[0];
  const N = 945; const lat = Math.round(N * 0.9);
  const b0 = straturi[combOsim].color.cutie; const asp = (b0[2] - b0[0]) / (b0[3] - b0[1]); const wO = asp >= 1 ? lat : Math.round(lat * asp), hO = asp >= 1 ? Math.round(lat / asp) : lat;
  const marca = await sharp({ create: { width: N, height: N, channels: 3, background: '#FFFFFF' } }).composite([{ input: Buffer.from(laPixeli(straturi[combOsim].color.text, wO, hO)), left: Math.round((N - wO) / 2), top: Math.round((N - hO) / 2) }]).flatten({ background: '#FFFFFF' }).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).withMetadata({ density: 300 }).toBuffer();
  adauga('osim/marca.jpg', marca, 'image/jpeg');
  if (os.titlu && Array.isArray(os.paragrafe) && os.paragrafe.length) adauga('osim/dosar-osim.pdf', await paginaOsim(os, marca, numeFirma), 'application/pdf');
  adauga('CITESTE.txt', '\uFEFF' + CITESTE_CLIENT(numeFirma, cuSemn, existent), 'text/plain'); // BOM: Notepad și browserul citesc diacriticele; bucketul primește doar „text/plain”, fără charset
  // ZIP-ul, cu toate de mai sus într-un folder cu numele firmei
  const radacina = `logo-${slug(numeFirma)}`;
  const intrari = {}; for (const f of fisiere) { const u8 = Buffer.isBuffer(f.date) ? new Uint8Array(f.date) : strToU8(f.date); intrari[`${radacina}/${f.cale}`] = [u8, { level: /\.(png|jpg|pdf|ico)$/.test(f.cale) ? 0 : 6, mtime: new Date('2026-11-27T20:00:00+02:00') }]; }
  const zip = Buffer.from(zipSync(intrari));
  const toate = [...fisiere.map((f) => ({ ...f, cale: `${prefix}${f.cale}` })), { cale: `${prefix}${radacina}.zip`, date: zip, tip: 'application/zip' }];
  return {
    ok: true, existent, reteta_finala: r, aplicate, verificari, note, combinatii: combs, osim_combinatie: combOsim, minim,
    zip: `${prefix}${radacina}.zip`, ghid_pdf: `${prefix}ghid-logo.pdf`, osim_jpg: `${prefix}osim/marca.jpg`, osim_pdf: toate.some((f) => f.cale.endsWith('dosar-osim.pdf')) ? `${prefix}osim/dosar-osim.pdf` : null,
    durata_ms: Date.now() - t0, fisiere: toate, noduri: Object.fromEntries(combs.map((k) => [k, straturi[k].color.noduri])),
  };
}

async function paginaOsim(os, jpg, nume) {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkitPdf);
  const fR = await doc.embedFont(octetiFont('Lato', 400).octeti, { subset: true }); const fB = await doc.embedFont(octetiFont('Lato', 700).octeti, { subset: true });
  doc.setTitle(`${os.titlu} · ${nume}`); doc.setLanguage('ro'); doc.setCreator('AleSign');
  // A4; textul curge pe câte pagini e nevoie (S2 trimite până la 45 de paragrafe: clasele, taxele, cei 12 pași, ce urmează)
  const W = 595.28, H = 841.89, M = 56, LW = W - 2 * M, JOS = M + 14; let p = null; let y = 0;
  const pagina = () => { p = doc.addPage([W, H]); y = M; };
  const loc = (h) => { if (y + h > H - JOS && y > M) pagina(); };
  // un cuvânt mai lat decât rândul (un link lung) se rupe pe litere, ca să nu iasă din pagină
  const bucati = (c, f, z, lat) => { if (f.widthOfTextAtSize(c, z) <= lat) return [c]; const out = []; let s = ''; for (const ch of c) { if (s && f.widthOfTextAtSize(s + ch, z) > lat) { out.push(s); s = ch; } else s += ch; } if (s) out.push(s); return out; };
  const rupe = (t, f, z, lat) => { const out = []; let rand = ''; for (const c0 of String(t).split(/\s+/).filter(Boolean)) for (const c of bucati(c0, f, z, lat)) { const x = rand ? `${rand} ${c}` : c; if (f.widthOfTextAtSize(x, z) > lat && rand) { out.push(rand); rand = c; } else rand = x; } if (rand) out.push(rand); return out; };
  const pars = os.paragrafe.map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' && typeof x.text === 'string' ? x.text : x == null ? '' : String(x)).trim()).filter(Boolean);
  pagina();
  for (const r of rupe(os.titlu, fB, 15, LW)) { loc(21); p.drawText(r, { x: M, y: H - y - 15, size: 15, font: fB }); y += 21; }
  y += 8;
  pars.forEach((par, i) => {
    const titluSec = /:$/.test(par) && par.length <= 120; // „Pașii, în aplicația OSIM:”, „Ce urmează după depunere:”
    const f = titluSec ? fB : fR; const rs = rupe(par, f, 10.5, LW);
    const urm = titluSec && pars[i + 1] ? Math.min(3, rupe(pars[i + 1], fR, 10.5, LW).length) : 0; // titlul nu rămâne singur jos
    if (titluSec) y += 4;
    loc(rs.length <= 4 ? (rs.length + urm) * 15 : (1 + urm) * 15);
    for (const r of rs) { loc(15); p.drawText(r, { x: M, y: H - y - 10.5, size: 10.5, font: f }); y += 15; }
    y += titluSec ? 2 : 7;
  });
  const img = await doc.embedJpg(jpg); const lat = (80 / 25.4) * 72;
  // marca, cu eticheta ei lângă (nu rămâne o imagine fără nume pe ultima pagină)
  loc(8 + 15 + 6 + lat); y += 8;
  p.drawText('Marca (osim/marca.jpg, 8 × 8 cm):', { x: M, y: H - y - 10.5, size: 10.5, font: fB }); y += 15;
  p.drawImage(img, { x: M, y: H - y - 6 - lat, width: lat, height: lat });
  const pg = doc.getPages();
  if (pg.length > 1) pg.forEach((q, i) => q.drawText(`${nume} · pagina ${i + 1} din ${pg.length}`, { x: M, y: M - 26, size: 8.5, font: fR, color: rgb(0.42, 0.42, 0.42) }));
  return Buffer.from(await doc.save());
}
