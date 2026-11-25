// Motorul de logo · verificările măsurate (§7 din logo-reteta-v1.md). Fiecare întoarce { cod, trecut, valoare, prag, motiv, opreste }.
// `opreste: true` = ⛔ (candidatul iese din set); celelalte sunt semnale pentru critic și pentru Alexandru.
import { randeaza, binar, cutieLista, uneste, simplifica } from './ck.js';
import * as P from './primitive.js';
import { svg } from './compileaza.js';

// ── culori ──────────────────────────────────────────────────────────────
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const r1 = (x) => Math.round(x * 10) / 10;
const fmt = (x) => String(r1(x)).replace('.', ',');

// fundalurile de probă din paleta trimisă: deschis, închis, accent
export function fundaluri(paleta = {}) {
  const ne = (paleta.neutre || []).filter(Boolean);
  const toate = [paleta.fundal, paleta.text, paleta.baza, paleta.accent, ...ne].filter((x) => /^#[0-9a-f]{6}$/i.test(String(x || '')));
  const inchis = [...toate].sort((a, b) => lum(a) - lum(b))[0] || '#1A1A1A';
  const deschis = paleta.fundal || [...toate].sort((a, b) => lum(b) - lum(a))[0] || '#FFFFFF';
  const out = [{ rol: 'deschis', hex: deschis }, { rol: 'inchis', hex: inchis }];
  if (paleta.accent) out.push({ rol: 'accent', hex: paleta.accent });
  return out;
}
export const culoareNegativ = (paleta = {}) => (paleta.fundal && lum(paleta.fundal) > 0.75 ? paleta.fundal : '#FFFFFF');
export function culoriPaleta(p = {}) { return [...new Set([p.fundal, p.text, p.baza, p.accent, ...(p.neutre || [])].filter((x) => /^#[0-9a-f]{6}$/i.test(String(x || ''))).map((x) => x.toLowerCase()))]; }

// ── măsuri pe raster ────────────────────────────────────────────────────
function etichete(m, W, H, val, vecini8) {
  const lab = new Int32Array(W * H).fill(-1); let n = 0; const atingeMargine = []; const st = [];
  for (let i = 0; i < W * H; i++) {
    if (m[i] !== val || lab[i] >= 0) continue;
    let mg = false; lab[i] = n; st.push(i);
    while (st.length) {
      const p = st.pop(); const x = p % W, y = (p - x) / W;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) mg = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; if (!vecini8 && dx && dy) continue;
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const q = Y * W + X; if (m[q] === val && lab[q] < 0) { lab[q] = n; st.push(q); }
      }
    }
    atingeMargine.push(mg); n++;
  }
  return { n, atingeMargine };
}
export function pieseSiGoluri(m, W, H) {
  const fg = etichete(m, W, H, 1, true); const bg = etichete(m, W, H, 0, false);
  return { piese: fg.n, goluri: bg.atingeMargine.filter((x) => !x).length };
}
// distanța euclidiană la pătrat (Felzenszwalb–Huttenlocher), de la fiecare pixel la cel mai apropiat pixel „sursă”
function edt(surse, W, H) {
  const INF = 1e20; const f = new Float64Array(Math.max(W, H)); const d = new Float64Array(W * H);
  const v = new Int32Array(Math.max(W, H)); const z = new Float64Array(Math.max(W, H) + 1); const out = new Float64Array(Math.max(W, H));
  const unu = (n) => { let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF; for (let q = 1; q < n; q++) { let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); } k++; v[k] = q; z[k] = s; z[k + 1] = INF; } k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; out[q] = (q - v[k]) ** 2 + f[v[k]]; } };
  for (let i = 0; i < W * H; i++) d[i] = surse[i] ? 0 : INF;
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = d[y * W + x]; unu(H); for (let y = 0; y < H; y++) d[y * W + x] = out[y]; }
  for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) f[x] = d[y * W + x]; unu(W); for (let x = 0; x < W; x++) d[y * W + x] = out[x]; }
  return d;
}
// cât din formă se pierde la o „deschidere” cu un disc de rază r (părțile mai subțiri de 2r)
export function pierdereLaRaza(m, W, H, r) {
  const fond = new Uint8Array(W * H); let arie = 0; for (let i = 0; i < W * H; i++) { fond[i] = 1 - m[i]; arie += m[i]; }
  if (!arie) return 0;
  const dIn = edt(fond, W, H); const er = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) er[i] = m[i] && dIn[i] >= r * r ? 1 : 0;
  const dEr = edt(er, W, H); let pierdut = 0; for (let i = 0; i < W * H; i++) if (m[i] && dEr[i] > r * r) pierdut++;
  return pierdut / arie;
}
export function grosimeMinima(m, W, H) { // cea mai mică grosime (în pixeli) sub care se pierde mai mult de 1 % din formă
  let r = 0.5; while (r < 64 && pierdereLaRaza(m, W, H, r) < 0.01) r += 0.5; return 2 * (r - 0.5);
}

// ── amprenta 64 × 64 ────────────────────────────────────────────────────
export function amprenta(CK, forme) {
  const p = forme.map((f) => f.path || f); const b = cutieLista(p);
  return binar(randeaza(CK, p, b, 64, 64, { aa: true, margine: 2 }));
}
export const amprentaB64 = (a) => { const o = Buffer.alloc(512); for (let i = 0; i < 4096; i++) if (a[i]) o[i >> 3] |= 1 << (7 - (i & 7)); return o.toString('base64'); };
export const dinB64 = (s) => { const b = Buffer.from(String(s || ''), 'base64'); if (b.length !== 512) return null; const a = new Uint8Array(4096); for (let i = 0; i < 4096; i++) a[i] = (b[i >> 3] >> (7 - (i & 7))) & 1; return a; };
function transf(a, k) { // 0–3 rotiri cu 90°, 4–7 aceleași în oglindă
  const o = new Uint8Array(4096);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    let X = k >= 4 ? 63 - x : x, Y = y; for (let r = 0; r < k % 4; r++) { const t = X; X = 63 - Y; Y = t; }
    o[Y * 64 + X] = a[y * 64 + x];
  }
  return o;
}
const jac = (a, b) => { let I = 0, U = 0; for (let i = 0; i < 4096; i++) { I += a[i] & b[i]; U += a[i] | b[i]; } return U ? I / U : 0; };
export function asemanare(a, b) { let best = 0; for (let k = 0; k < 8; k++) best = Math.max(best, jac(transf(a, k), b)); return best; }
// amprenta unui PNG (captura unui semn de concurent): gri, prag Otsu, forma = ce diferă de margine
export async function amprentaPng(sharp, buf) {
  const { data, info } = await sharp(buf).flatten({ background: '#ffffff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height; const hist = new Array(256).fill(0); for (const v of data) hist[v]++;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i]; let sB = 0, wB = 0, best = 0, prag = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = data.length - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF; const v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; prag = t; } }
  let marg = 0, nm = 0; for (let x = 0; x < W; x++) { marg += data[x] + data[(H - 1) * W + x]; nm += 2; } const fondInchis = marg / nm < prag;
  const m = new Uint8Array(W * H); let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0; i < W * H; i++) { const v = fondInchis ? data[i] > prag : data[i] <= prag; if (v) { m[i] = 255; const x = i % W, y = (i - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  if (x1 < 0) return null;
  const crop = await sharp(Buffer.from(m), { raw: { width: W, height: H, channels: 1 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(60, 60, { fit: 'contain', background: { r: 0, g: 0, b: 0 } }).extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0 } }).raw().toBuffer();
  const a = new Uint8Array(4096); for (let i = 0; i < 4096; i++) a[i] = crop[i] >= 128 ? 1 : 0; return a;
}

// semnele protejate (R3) și formele de bază (R1), ca amprente construite pe grila de 24
let sabloane = null;
function sabloaneR(CK) {
  if (sabloane) return sabloane;
  const B = (x, y, l, h) => P.dreptunghi(CK, x, y, l, h);
  const plus = uneste(CK, [B(8, 2, 8, 20), B(2, 8, 20, 8)]);
  const latina = uneste(CK, [B(10, 1, 4, 22), B(4, 6, 16, 4)]);
  const elvetiana = simplifica(CK.Path.MakeFromOp(B(1, 1, 22, 22), uneste(CK, [B(10, 4, 4, 16), B(4, 10, 16, 4)]), CK.PathOp.Difference));
  const semiluna = simplifica(CK.Path.MakeFromOp(P.cerc(CK, 12, 12, 10), P.cerc(CK, 15, 10, 8.5), CK.PathOp.Difference));
  const stele = uneste(CK, Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return P.poligon(CK, { cx: 12 + 9 * Math.cos(a), cy: 12 - 9 * Math.sin(a), r: 1.6, laturi: 5, rot: 0 }); }));
  const am = (p) => amprenta(CK, [p]);
  sabloane = {
    protejate: [['crucea greacă (crucea roșie, farmacia)', am(plus)], ['crucea latină', am(latina)], ['crucea elvețiană', am(elvetiana)], ['semiluna roșie', am(semiluna)], ['cercul de stele al UE', am(stele)]],
    baza: [['un cerc', am(P.cerc(CK, 12, 12, 10))], ['un pătrat', am(B(2, 2, 20, 20))], ['un triunghi', am(P.poligon(CK, { cx: 12, cy: 13, r: 10, laturi: 3, rot: 0 }))], ['un inel', am(simplifica(CK.Path.MakeFromOp(P.cerc(CK, 12, 12, 10), P.cerc(CK, 12, 12, 6), CK.PathOp.Difference)))]],
  };
  return sabloane;
}

// ── numele și faptul ────────────────────────────────────────────────────
const norm = (s) => String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/ş/g, 'ș').replace(/ţ/g, 'ț').replace(/[„”"“'’«»]/g, '').replace(/\s+/g, ' ').trim();
const faraDiacritice = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
export function valoareLaCale(o, cale) {
  let v = o; for (const k of String(cale).split('.')) { if (v == null) return undefined; v = Array.isArray(v) && /^\d+$/.test(k) ? v[parseInt(k, 10)] : v[k]; }
  return v;
}
const textDin = (v) => (v == null ? '' : typeof v === 'string' ? v : typeof v === 'object' ? Object.values(v).map(textDin).join(' \n ') : String(v));
export function verificaFapt(dosar, fapt) {
  if (!dosar) return { cod: 'F1', trecut: null, opreste: false, motiv: 'Dosarul n-a venit în cerere; faptul rămâne de verificat de S2' };
  const v = valoareLaCale(dosar, fapt.cale);
  if (v == null) return { cod: 'F1', trecut: false, opreste: true, motiv: `în Dosar nu există ${fapt.cale}` };
  const t = textDin(v); const ok = norm(t).includes(norm(fapt.citat));
  return { cod: 'F1', trecut: ok, opreste: true, motiv: ok ? `„${fapt.citat}” e în ${fapt.cale}` : `„${fapt.citat}” nu apare în ${fapt.cale} (acolo scrie: „${t.slice(0, 120)}”)`, valoare: t.slice(0, 300) };
}
export const numeDinDosar = (d) => (d && ((d.brand && d.brand.nume_marca) || (d.identitate && d.identitate.firma) || d.firma)) || null;

const GENERICE = ['cabinet', 'clinica', 'clinic', 'salon', 'studio', 'atelier', 'service', 'cafenea', 'cafe', 'restaurant', 'bistro', 'brutaria', 'brutarie', 'patiserie', 'cofetarie', 'dental', 'dent', 'stomatologie', 'stomatologic', 'medical', 'beauty', 'spa', 'wellness', 'fitness', 'gym', 'yoga', 'pilates', 'auto', 'detailing', 'imobiliare', 'construct', 'constructii', 'renovari', 'design', 'interior', 'consult', 'consulting', 'contabilitate', 'avocat', 'avocatura', 'notar', 'vet', 'veterinar', 'pet', 'hotel', 'pensiune', 'florarie', 'evenimente', 'nunti', 'shop', 'magazin', 'scoala', 'academia', 'cursuri', 'terapie', 'psihologie', 'masaj', 'coafor', 'frizerie', 'barber', 'nails', 'unghii', 'it', 'soft', 'tech', 'grup', 'group', 'center', 'centru'];
const FORME = ['srl', 's.r.l.', 'sa', 'pfa', 'ii', 'ifn', 'srl-d'];
export function numeDescriptiv(nume, oras, extra = []) {
  const set = new Set([...GENERICE, ...extra.map(faraDiacritice), ...String(oras || '').split(/[\s-]+/).map(faraDiacritice).filter(Boolean)]);
  const cuv = faraDiacritice(nume).split(/[\s\-–&.,]+/).filter((w) => w && !FORME.includes(w) && !['si', 'de', 'la', 'din', 'the', 'and'].includes(w));
  return { descriptiv: cuv.length > 0 && cuv.every((w) => set.has(w)), cuvinte: cuv };
}

// ── toate verificările unui candidat ────────────────────────────────────
export function verifica(c, r, o = {}) {
  const CK = c.CK; const V = []; const add = (x) => V.push({ prag: null, valoare: null, ...x });
  const culori = { principal: r.culori.principal, accent: r.culori.accent };
  const svgS = svg(CK, c.forme.semn, culori, 'color'); const svgO = svg(CK, c.forme.orizontal, culori, 'color'); const svgT = svg(CK, c.forme.stivuit, culori, 'color');
  // S1–S5
  const interzis = /<(text|tspan|linearGradient|radialGradient|filter|image|clipPath|mask|pattern|use|style|line|polyline|circle|ellipse|rect)\b|stroke=|style=|href=/i;
  const ab = [svgS, svgO, svgT].filter((s) => interzis.test(s.text));
  add({ cod: 'S1', opreste: true, trecut: ab.length === 0, valoare: ab.length, prag: 0, motiv: ab.length ? 'SVG-ul are altceva decât forme pline' : 'doar <path> plin, în toate cele trei combinații' });
  const folosite = [...new Set([svgS, svgO, svgT].flatMap((s) => s.straturi.map((x) => x.culoare.toLowerCase())))];
  const inPaleta = !o.paleta || folosite.every((h) => culoriPaleta(o.paleta).map((x) => x.toLowerCase()).includes(h));
  add({ cod: 'S2', opreste: true, trecut: folosite.length <= 2 && inPaleta, valoare: folosite.length, prag: 2, motiv: `${folosite.join(', ')}${inPaleta ? '' : ' (una nu e în paletă)'}` });
  const limO = 1500; const okN = svgS.noduri <= 400 && svgO.noduri <= limO && svgT.noduri <= limO;
  add({ cod: 'S3', opreste: true, trecut: okN, valoare: { semn: svgS.noduri, orizontal: svgO.noduri, stivuit: svgT.noduri }, prag: { semn: 400, orizontal: limO }, motiv: `semnul ${svgS.noduri} noduri, orizontala ${svgO.noduri}, stivuita ${svgT.noduri}` });
  const kb = Math.max(svgS.text.length, svgO.text.length, svgT.text.length) / 1024;
  add({ cod: 'S4', opreste: true, trecut: kb <= 30, valoare: r1(kb), prag: 30, motiv: `cel mai mare SVG are ${fmt(kb)} KB` });
  if (o.hash2) add({ cod: 'S5', opreste: true, trecut: o.hash2 === svgO.hash, valoare: svgO.hash.slice(0, 16), motiv: o.hash2 === svgO.hash ? 'a doua compilare dă același hash' : `hash diferit la a doua compilare (${o.hash2.slice(0, 12)})` });
  // B1
  const gmin = c.garda.length ? Math.min(...c.garda.map((g) => g.iou)) : 1; const rea = c.garda.filter((g) => g.iou < 0.995);
  add({ cod: 'B1', opreste: true, trecut: !rea.length, valoare: r1(gmin * 1000) / 1000, prag: 0.995, motiv: `${c.garda.length} operații, cea mai slabă la ${String(Math.round(gmin * 10000) / 100).replace('.', ',')} %${rea.length ? ': ' + rea.map((g) => g.eticheta).join('; ') : ''}` });
  // M1–M2 pe semn (forma pe o culoare)
  const semnP = c.forme.semn.map((f) => f.path); const bs = cutieLista(semnP); const lat = Math.max(bs[2] - bs[0], bs[3] - bs[1]);
  const fer = [(bs[0] + bs[2]) / 2 - lat / 2, (bs[1] + bs[3]) / 2 - lat / 2, (bs[0] + bs[2]) / 2 + lat / 2, (bs[1] + bs[3]) / 2 + lat / 2];
  const mar = (n) => binar(randeaza(CK, semnP, fer, n, n, { aa: true, margine: Math.max(1, Math.round(n / 16)) }));
  const m256 = mar(256), m32 = mar(32), m16 = mar(16);
  const t256 = pieseSiGoluri(m256, 256, 256), t32 = pieseSiGoluri(m32, 32, 32), t16 = pieseSiGoluri(m16, 16, 16);
  const ok32 = t32.piese === t256.piese && t32.goluri === t256.goluri, ok16 = t16.piese === t256.piese && t16.goluri === t256.goluri;
  add({ cod: 'M1', opreste: true, trecut: ok32, valoare: { 256: t256, 32: t32, 16: t16 }, motiv: `piese/goluri: 256 px ${t256.piese}/${t256.goluri}, 32 px ${t32.piese}/${t32.goluri}, 16 px ${t16.piese}/${t16.goluri}${ok16 ? '' : ' (la 16 px se schimbă: semnal pentru favicon)'}` });
  const pierd = pierdereLaRaza(m256, 256, 256, 7.5); const gmin16 = (grosimeMinima(m256, 256, 256) * 16) / 256;
  add({ cod: 'M2', opreste: false, trecut: pierd <= 0.02, valoare: r1(gmin16 * 10) / 10, prag: 1, motiv: `cea mai subțire parte are cam ${fmt(gmin16)} px la 16 px; sub 1 px se pierde ${String(Math.round(pierd * 1000) / 10).replace('.', ',')} % din semn` });
  // M3: logotipul tipărit cu înălțimea de 6 mm
  const logoP = c.forme.logotip.map((f) => f.path); const bl = cutieLista(logoP); const hW = bl[3] - bl[1]; const raport = (bl[2] - bl[0]) / hW;
  const px1200 = Math.round((6 / 25.4) * 1200); const W1200 = Math.min(4000, Math.round(px1200 * raport) + 8);
  const mm = binar(randeaza(CK, logoP, bl, W1200, px1200 + 8, { aa: true, margine: 4 }));
  const pier6 = pierdereLaRaza(mm, W1200, px1200 + 8, (0.05 / 25.4) * 1200);
  const px300 = Math.round((6 / 25.4) * 300); const m300 = binar(randeaza(CK, logoP, bl, Math.round(px300 * raport) + 4, px300 + 4, { aa: true, margine: 2 }));
  const g300 = pieseSiGoluri(m300, Math.round(px300 * raport) + 4, px300 + 4).goluri, gMare = pieseSiGoluri(mm, W1200, px1200 + 8).goluri;
  add({ cod: 'M3', opreste: true, trecut: pier6 <= 0.01 && g300 === gMare, valoare: { pierdere: r1(pier6 * 1000) / 1000, goluri_300dpi: g300, goluri_mare: gMare }, motiv: `la 6 mm înălțime: ${String(Math.round(pier6 * 1000) / 10).replace('.', ',')} % din litere e mai subțire de 0,1 mm; golurile literelor: ${g300} la 300 dpi față de ${gMare}` });
  // C1
  const neg = culoareNegativ(o.paleta || {}); const per = [];
  let toateOk = true;
  for (const f of fundaluri(o.paleta || {})) {
    const folositeColor = [...new Set([svgS, svgO].flatMap((q) => q.straturi.map((x) => x.culoare)))];
    const variante = [['color', folositeColor], ['o culoare', [culori.principal]], ['negativ', [neg]]].map(([n, cs]) => [n, Math.min(...cs.map((x) => contrast(x, f.hex)))]);
    variante.sort((a, b) => b[1] - a[1]); const [n, v] = variante[0]; if (v < 3) toateOk = false;
    per.push({ fundal: f.rol, hex: f.hex, varianta: n, contrast: r1(v) });
  }
  add({ cod: 'C1', opreste: true, trecut: toateOk, valoare: per, prag: 3, motiv: per.map((x) => `pe ${x.fundal} (${x.hex}): ${x.varianta} ${fmt(x.contrast)}:1`).join('; ') });
  // N1, N2
  const nd = o.dosar ? numeDinDosar(o.dosar) : null;
  add({ cod: 'N1', opreste: true, trecut: nd == null ? null : String(nd).normalize('NFC').replace(/ş/g, 'ș').replace(/ţ/g, 'ț').replace(/Ş/g, 'Ș').replace(/Ţ/g, 'Ț') === r.nume.normalize('NFC'), motiv: nd == null ? 'Dosarul n-a venit în cerere' : `în logo „${c.text}”, în Dosar „${nd}”` });
  const F = c.F; const ab2 = [];
  if (c.glife.some((g) => g.id === 0)) ab2.push('glifă lipsă');
  for (const [cp, ced] of [[0x219, 0x15f], [0x21b, 0x163], [0x218, 0x15e], [0x21a, 0x162]]) {
    if (!c.text.includes(String.fromCodePoint(cp))) continue;
    const g = F.f.glyphForCodePoint(cp), gc = F.f.glyphForCodePoint(ced);
    if (!g || !g.id) ab2.push(`${String.fromCodePoint(cp)} lipsește din font`); else if (gc && g.id === gc.id) ab2.push(`${String.fromCodePoint(cp)} are aceeași glifă ca ${String.fromCodePoint(ced)} (sedilă)`);
    const folosita = c.glife.find((x) => x.cps.includes(cp)); if (folosita && folosita.id !== g.id) ab2.push(`${String.fromCodePoint(cp)} e înlocuit la așezare`);
  }
  for (const [cp, baza] of [[0x103, 0x61], [0xe2, 0x61], [0xee, 0x69], [0x102, 0x41], [0xc2, 0x41], [0xce, 0x49]]) {
    if (!c.text.includes(String.fromCodePoint(cp))) continue;
    const g = F.f.glyphForCodePoint(cp); if (!g || !g.id || g.id === F.f.glyphForCodePoint(baza).id) ab2.push(`${String.fromCodePoint(cp)} n-are glifa lui`);
  }
  add({ cod: 'N2', opreste: true, trecut: ab2.length === 0, valoare: ab2.length, prag: 0, motiv: ab2.length ? ab2.join('; ') : `${F.familie}: ș și ț cu virgulă, ă â î cu glifele lor${/[șțȘȚăâîĂÂÎ]/.test(c.text) ? '' : ' (numele n-are diacritice)'}` });
  // A1
  const a = amprenta(CK, c.forme.semn); const lista = [];
  for (const x of o.comparatii || []) { const am = x.a || dinB64(x.amprenta); if (am) lista.push({ nume: x.nume || x.id, s: asemanare(a, am) }); }
  lista.sort((x, y) => y.s - x.s); const top = lista[0];
  add({ cod: 'A1', opreste: !!top && top.s >= 0.82, trecut: !top || top.s < 0.82, valoare: top ? Math.round(top.s * 100) / 100 : 0, prag: 0.82, motiv: lista.length ? `cel mai apropiat: ${top.nume}, ${Math.round(top.s * 100)} %${top.s >= 0.7 && top.s < 0.82 ? ' (semnal: seamănă)' : ''}; comparat cu ${lista.length}` : 'n-a venit nimic de comparat' });
  // R1–R3
  const S = sabloaneR(CK);
  const baza = S.baza.map(([n, t]) => [n, asemanare(a, t)]).sort((x, y) => y[1] - x[1])[0];
  const singura = (c.tipuri.length === 1 && ['cerc', 'elipsa', 'dreptunghi', 'poligon', 'sfert', 'semicerc'].includes(c.tipuri[0]) && !c.nrOperatii) || baza[1] >= 0.9;
  add({ cod: 'R1', opreste: false, trecut: !singura, valoare: Math.round(baza[1] * 100) / 100, motiv: singura ? `semnul e ${baza[0]}: o formă de bază singură se înregistrează greu ca marcă` : `nu e o formă de bază singură (cel mai aproape de ${baza[0]}, ${Math.round(baza[1] * 100)} %)` });
  const nd2 = numeDescriptiv(r.nume, o.dosar && o.dosar.identitate && (o.dosar.identitate.oras || o.dosar.identitate.localitate), o.cuvinteDescriptive || []);
  add({ cod: 'R2', opreste: false, trecut: !nd2.descriptiv, valoare: nd2.cuvinte, motiv: nd2.descriptiv ? `„${r.nume}” spune doar serviciul și locul: ca marcă se apără greu fără semn` : 'numele are un cuvânt care nu descrie serviciul sau locul' });
  const prot = S.protejate.map(([n, t]) => [n, asemanare(a, t)]).sort((x, y) => y[1] - x[1])[0];
  add({ cod: 'R3', opreste: true, trecut: prot[1] < 0.75, valoare: Math.round(prot[1] * 100) / 100, prag: 0.75, motiv: prot[1] >= 0.75 ? `semnul seamănă cu ${prot[0]} (${Math.round(prot[1] * 100)} %): simbol protejat` : `departe de simbolurile protejate (cel mai aproape: ${prot[0]}, ${Math.round(prot[1] * 100)} %)` });
  // F1, G1
  add(verificaFapt(o.dosar, r.motiv.fapt));
  const inLitere = (r.logotip && (r.logotip.detalii || []).length > 0) || (r.monograma && (r.monograma.detalii || []).length > 0) || r.familie === 'monograma';
  const inSemn = !!r.semn || r.familie === 'monograma';
  // L1: în monograma cu litere suprapuse, fiecare literă păstrează la vedere cel puțin 85 % din forma ei (la 0,28 din lățime, B-ul din Bitter rămâne la 70 % și se citește E)
  if (c.ctx && c.ctx.litereMonograma) {
    const lm = c.ctx.litereMonograma; const min = Math.min(...lm.map((x) => x.pastrat));
    add({ cod: 'L1', opreste: true, trecut: min >= 0.85, prag: 0.85, valoare: lm.map((x) => ({ litera: x.litera, pastrat: r1(x.pastrat * 1000) / 1000 })), motiv: lm.map((x) => `${x.litera}: ${Math.round(x.pastrat * 100)} % la vedere`).join(', ') + (min >= 0.85 ? '' : '; o literă acoperită prea mult nu se mai citește') });
  }
  add({ cod: 'G1', opreste: false, trecut: inLitere && inSemn, motiv: inLitere && inSemn ? 'gestul e și în semn, și în litere' : inSemn ? 'gestul e doar în semn: literele sunt fontul simplu' : 'gestul e doar în litere' });
  return { verificari: V, amprenta: a, svg: { semn: svgS, orizontal: svgO, stivuit: svgT }, trecut: V.filter((x) => x.opreste && x.trecut === false).length === 0 };
}
