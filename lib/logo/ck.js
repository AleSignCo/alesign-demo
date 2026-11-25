// Motorul de logo · stratul de geometrie: CanvasKit (Skia, BSD-3) în WebAssembly, pentru operațiile pe forme (PathOps),
// conturul din linie și randarea pe CPU. Toate curbele noastre sunt cubice: un cerc făcut din 4 cubice rămâne 4 cubice
// după unire, pe când cercul „conic” din Skia iese în zeci de pătratice (proba din 24 nov.: 8 noduri față de 160).
// Coordonatele: y în jos (ca în SVG). Unghiurile: grade, de la ora 3, în sens invers acelor de ceas, cum se vede pe ecran.
import fs from 'fs';
import { createRequire } from 'module';
import CanvasKitInit from 'canvaskit-wasm';

// Importul de mai sus și calea de mai jos sunt scrise literal, ca Vercel (nft) să împacheteze în funcție și biblioteca, și fișierul
// .wasm: cu createRequire nu le vedea pe niciuna (proba cu @vercel/nft din 25 nov.). Depozitul are node_modules la rădăcină,
// la două foldere deasupra lui lib/logo; pentru orice altă așezare rămâne căutarea obișnuită a lui Node.
const WASM = new URL('../../node_modules/canvaskit-wasm/bin/canvaskit.wasm', import.meta.url);
function octetiWasm() { try { return fs.readFileSync(WASM); } catch { return fs.readFileSync(createRequire(import.meta.url).resolve('canvaskit-wasm/bin/canvaskit.wasm')); } }
let ckPromis = null; let ckInst = null;
export function canvaskit() {
  if (!ckPromis) ckPromis = CanvasKitInit({ wasmBinary: octetiWasm() }).then((ck) => { ckInst = ck; return ck; });
  return ckPromis;
}
// La începutul unei cereri (un set, un kit, un brand kit), niciodată în mijlocul ei: formele Skia nu se eliberează una câte una,
// așa că memoria WebAssembly crește cu vreo 3 MB la fiecare set. Peste prag se pornește o instanță nouă, iar cea veche o adună Node.
export const memorieMB = () => (ckInst ? Math.round(ckInst.HEAPU8.length / 1048576) : 0);
export function canvaskitProaspat(pragMB = 600) {
  if (ckInst && ckInst.HEAPU8.length > pragMB * 1048576) { ckPromis = null; ckInst = null; }
  return canvaskit();
}

export const K90 = 0.5522847498307936; // 4/3·tan(π/8): cubica pentru un sfert de cerc
const rad = (g) => (g * Math.PI) / 180;
export const punct = (cx, cy, r, g) => [cx + r * Math.cos(rad(g)), cy - r * Math.sin(rad(g))];

// arc de cerc din unghiul a0 în a1 (pe ecran: a1 > a0 înseamnă invers acelor), în bucăți de cel mult 90°
export function arcCubic(b, cx, cy, r, a0, a1, mod = 'c') { // mod: 'm' începe cu moveTo, 'l' cu lineTo, 'c' continuă din punctul curent
  const pasi = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90 - 1e-9));
  const d = (a1 - a0) / pasi;
  let [x0, y0] = punct(cx, cy, r, a0);
  if (mod === 'm') b.moveTo(x0, y0); else if (mod === 'l') b.lineTo(x0, y0);
  for (let i = 0; i < pasi; i++) {
    const t0 = a0 + i * d, t1 = t0 + d;
    const h = (4 / 3) * Math.tan(rad(d) / 4);
    const [x1, y1] = punct(cx, cy, r, t1);
    // tangenta în y-jos: d/dθ (cos θ, −sin θ) = (−sin θ, −cos θ)
    const c1 = [x0 + h * r * -Math.sin(rad(t0)), y0 + h * r * -Math.cos(rad(t0))];
    const c2 = [x1 - h * r * -Math.sin(rad(t1)), y1 - h * r * -Math.cos(rad(t1))];
    b.cubicTo(c1[0], c1[1], c2[0], c2[1], x1, y1);
    x0 = x1; y0 = y1;
  }
}

// rotire pe ecran (invers acelor) în jurul (cx, cy), ca matrice 3×3 pe rânduri, pentru PathBuilder.transform
export function matRot(g, cx, cy) {
  const c = Math.cos(rad(g)), s = Math.sin(rad(g));
  // x' = cx + (x−cx)c + (y−cy)s ; y' = cy − (x−cx)s + (y−cy)c
  return [c, s, cx - cx * c - cy * s, -s, c, cy + cx * s - cy * c, 0, 0, 1];
}
export const matScala = (sx, sy, tx = 0, ty = 0) => [sx, 0, tx, 0, sy, ty, 0, 0, 1];
export const matOglinda = (cx) => [-1, 0, 2 * cx, 0, 1, 0, 0, 0, 1];

export function transforma(CK, p, m) { const b = new CK.PathBuilder(p); b.transform(m); const r = b.detach(); b.delete(); return r; }

export function gol(CK) { return new CK.PathBuilder().detach(); }

// unirea unei liste de forme într-una singură (pe rând, cu PathOps)
export function uneste(CK, lista) {
  const xs = lista.filter((p) => p && !p.isEmpty());
  if (!xs.length) return gol(CK);
  let acc = xs[0];
  for (let i = 1; i < xs.length; i++) { const r = CK.Path.MakeFromOp(acc, xs[i], CK.PathOp.Union); if (!r) throw new Error('unirea a eșuat'); acc = r; }
  if (xs.length === 1) { const s = acc._makeSimplified(); return s || acc; }
  return acc;
}
export function op(CK, a, b, cod) {
  const harta = { uneste: CK.PathOp.Union, scade: CK.PathOp.Difference, intersecteaza: CK.PathOp.Intersect, xor: CK.PathOp.XOR };
  const r = CK.Path.MakeFromOp(a, b, harta[cod]);
  if (!r) throw new Error(`operația ${cod} a eșuat`);
  return r;
}
export function simplifica(p) { const s = p._makeSimplified(); return s || p; }

// cutia unei forme [x0, y0, x1, y1]
export function cutie(p) { const b = p.computeTightBounds(); return [b[0], b[1], b[2], b[3]]; }
export function cutieLista(lista) {
  let c = null;
  for (const p of lista) { if (!p || p.isEmpty()) continue; const b = cutie(p); c = c ? [Math.min(c[0], b[0]), Math.min(c[1], b[1]), Math.max(c[2], b[2]), Math.max(c[3], b[3])] : b; }
  return c || [0, 0, 0, 0];
}

// randarea pe CPU: forme → mască de acoperire (0–255), într-o fereastră [x0, y0, x1, y1] adusă la l × h pixeli, cu aspectul păstrat și centrată
export function randeaza(CK, forme, fereastra, l, h, { aa = true, margine = 0 } = {}) {
  const [x0, y0, x1, y1] = fereastra;
  const w = Math.max(1e-9, x1 - x0), hh = Math.max(1e-9, y1 - y0);
  const s = Math.min((l - 2 * margine) / w, (h - 2 * margine) / hh);
  const tx = (l - w * s) / 2 - x0 * s, ty = (h - hh * s) / 2 - y0 * s;
  const surf = CK.MakeSurface(l, h);
  if (!surf) throw new Error('suprafața de randare nu s-a creat');
  const cv = surf.getCanvas();
  cv.clear(CK.WHITE);
  const paint = new CK.Paint(); paint.setColor(CK.BLACK); paint.setAntiAlias(aa); paint.setStyle(CK.PaintStyle.Fill);
  cv.save(); cv.concat([s, 0, tx, 0, s, ty, 0, 0, 1]);
  for (const p of forme) if (p && !p.isEmpty()) cv.drawPath(p, paint);
  cv.restore();
  const px = cv.readPixels(0, 0, { width: l, height: h, colorType: CK.ColorType.RGBA_8888, alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB });
  surf.dispose(); paint.delete(); // dispose, nu delete: MakeSurface își ia pixelii cu malloc și doar dispose îi eliberează (altfel fiecare randare lasă l × h × 4 octeți în memoria WebAssembly)
  const m = new Uint8Array(l * h);
  for (let i = 0; i < l * h; i++) m[i] = 255 - px[i * 4];
  return m;
}
// PathOps (Skia) greșește când două contururi au o margine comună exactă: la Manrope, bara lui „e” atinge inelul pe aceeași
// linie și unirea umple ochiul literei (proba din 24 nov.). De aceea unirile care nu trec prin garda B1 (glifele, straturile
// din SVG) se verifică aici pe raster; dacă forma s-a stricat, fiecare contur (sau fiecare formă) e mutat cu o fracțiune
// de unitate (2–14 × 10⁻⁵ din mărime, sub pragul celor două zecimale din SVG) și operația se reia. Totul e determinist.
const PHI = 0.6180339887498949;
const mutaCu = (CK, p, d) => transforma(CK, p, [1, 0, d, 0, 1, d * PHI, 0, 0, 1]);
function probaRaster(CK, asteptat, fer, L) { return (q) => !!q && !q.isEmpty() && suprapunere(asteptat, binar(randeaza(CK, [q], fer, L, L, { aa: false }))) >= 0.998; }
export function curata(CK, p, { L = 256 } = {}) {
  if (!p || p.isEmpty()) return p;
  const fer = cutie(p); const proba = probaRaster(CK, binar(randeaza(CK, [p], fer, L, L, { aa: false })), fer, L);
  const r = p._makeSimplified(); if (proba(r)) return r;
  const cs = contururi(CK, p); const m = Math.max(fer[2] - fer[0], fer[3] - fer[1]);
  for (const k of [2, 6, 14]) {
    const b = new CK.PathBuilder(); cs.forEach((c, j) => b.addPath(mutaCu(CK, c, m * 1e-5 * k * (j + 1))));
    const q = b.detachAndDelete()._makeSimplified(); if (proba(q)) return q;
  }
  return p; // forma brută, cu umplere nonzero: se vede corect, doar nu e simplificată
}
export function unesteVerificat(CK, lista, { L = 384 } = {}) {
  const xs = lista.filter((p) => p && !p.isEmpty()); if (!xs.length) return gol(CK);
  const fer = cutieLista(xs); const proba = probaRaster(CK, binar(randeaza(CK, xs, fer, L, L, { aa: false })), fer, L);
  const incearca = (ps) => { try { return simplifica(uneste(CK, ps)); } catch { return null; } };
  const r = incearca(xs); if (proba(r)) return r;
  const m = Math.max(fer[2] - fer[0], fer[3] - fer[1]);
  for (const k of [2, 6, 14]) { const q = incearca(xs.map((p, j) => mutaCu(CK, p, m * 1e-5 * k * (j + 1)))); if (proba(q)) return q; }
  const b = new CK.PathBuilder(); xs.forEach((p) => b.addPath(p)); return b.detachAndDelete(); // fără unire: tot corect la umplere
}
export const binar = (m, prag = 128) => { const o = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) o[i] = m[i] >= prag ? 1 : 0; return o; };
export function suprapunere(a, b) { let I = 0, U = 0; for (let i = 0; i < a.length; i++) { I += a[i] & b[i]; U += a[i] | b[i]; } return U ? I / U : 1; }

// SVG: din comenzile Skia, cu două zecimale (aceeași rețetă → același text → același hash)
const n2 = (v) => { const r = Math.round(v * 100) / 100; return (Object.is(r, -0) ? 0 : r).toString(); };
export function dSvg(p) {
  const c = p.toCmds(); let i = 0; const out = []; let ultim = [0, 0]; let start = [0, 0];
  while (i < c.length) {
    const v = c[i++];
    if (v === 0) { out.push(`M${n2(c[i])} ${n2(c[i + 1])}`); ultim = start = [c[i], c[i + 1]]; i += 2; }
    else if (v === 1) { out.push(`L${n2(c[i])} ${n2(c[i + 1])}`); ultim = [c[i], c[i + 1]]; i += 2; }
    else if (v === 2) { out.push(`Q${n2(c[i])} ${n2(c[i + 1])} ${n2(c[i + 2])} ${n2(c[i + 3])}`); ultim = [c[i + 2], c[i + 3]]; i += 4; }
    else if (v === 3) { // conica (cercurile și colțurile rotunde dintr-un SVG existent) → cubica echivalentă, k = 4w / 3(1 + w)
      const [x0, y0] = ultim; const [x1, y1, x2, y2, w] = c.slice(i, i + 5); const k = (4 * w) / (3 * (1 + w));
      out.push(`C${n2(x0 + k * (x1 - x0))} ${n2(y0 + k * (y1 - y0))} ${n2(x2 + k * (x1 - x2))} ${n2(y2 + k * (y1 - y2))} ${n2(x2)} ${n2(y2)}`); ultim = [x2, y2]; i += 5;
    }
    else if (v === 4) { out.push(`C${n2(c[i])} ${n2(c[i + 1])} ${n2(c[i + 2])} ${n2(c[i + 3])} ${n2(c[i + 4])} ${n2(c[i + 5])}`); ultim = [c[i + 4], c[i + 5]]; i += 6; }
    else if (v === 5) { out.push('Z'); ultim = start; }
    else throw new Error('verb necunoscut ' + v);
  }
  return out.join('');
}
// nodurile: capetele de segment (M, L, Q, conică, C); ar = câte numere are fiecare verb
export function noduri(p) { const c = p.toCmds(); let i = 0, n = 0; const ar = [2, 2, 4, 5, 6, 0]; while (i < c.length) { const v = c[i++]; if (v !== 5) n++; i += ar[v]; } return n; }
// piesele (contururile închise) dintr-o formă
export function contururi(CK, p) {
  const c = p.toCmds(); const out = []; let b = null; let i = 0;
  while (i < c.length) {
    const v = c[i++];
    if (v === 0) { if (b) out.push(b.detach()); b = new CK.PathBuilder(); b.moveTo(c[i], c[i + 1]); i += 2; }
    else if (v === 1) { b.lineTo(c[i], c[i + 1]); i += 2; }
    else if (v === 2) { b.quadTo(c[i], c[i + 1], c[i + 2], c[i + 3]); i += 4; }
    else if (v === 3) { b.conicTo(c[i], c[i + 1], c[i + 2], c[i + 3], c[i + 4]); i += 5; }
    else if (v === 4) { b.cubicTo(c[i], c[i + 1], c[i + 2], c[i + 3], c[i + 4], c[i + 5]); i += 6; }
    else if (v === 5) { b.close(); }
  }
  if (b) out.push(b.detach());
  return out;
}
