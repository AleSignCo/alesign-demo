// Motorul de logo · semnul pe grila de 24: elementele de bază, operațiile (PathOps) și garda de suprapunere (B1).
import { uneste, op as opPath, transforma, matRot, simplifica, randeaza, binar, suprapunere, cutieLista, gol } from './ck.js';
import * as P from './primitive.js';

// o literă ca formă, pe grilă: x = centrul, y = linia de bază, inaltime = a majusculei
export function literaPeGrila(CK, F, ch, x, y, inaltime, glifaInContur) {
  const g = glifaInContur(F, ch); if (!g) throw new Error(`fontul ${F.familie} n-are „${ch}”`);
  const s = inaltime / F.cap;
  const bb = g.bbox; const cx = ((bb.minX + bb.maxX) / 2) * s;
  return transforma(CK, g.path, [s, 0, x - cx, 0, -s, y, 0, 0, 1]);
}

export function element(CK, el, ctx) {
  switch (el.tip) {
    case 'cerc': return P.cerc(CK, el.cx, el.cy, el.r);
    case 'elipsa': return P.elipsa(CK, el.cx, el.cy, el.rx, el.ry, el.rot || 0);
    case 'dreptunghi': return P.dreptunghi(CK, el.x, el.y, el.l, el.h, el.raza || 0, el.rot || 0);
    case 'bara': {
      if (el.cx != null) { const r = (el.unghi * Math.PI) / 180, L = el.lungime / 2; return P.bara(CK, el.cx - L * Math.cos(r), el.cy + L * Math.sin(r), el.cx + L * Math.cos(r), el.cy - L * Math.sin(r), el.grosime, el.capete || 'drept'); }
      return P.bara(CK, el.x1, el.y1, el.x2, el.y2, el.grosime, el.capete || 'drept');
    }
    case 'arc': return P.arc(CK, el.cx, el.cy, el.r, el.grosime, el.start, el.unghi, el.capete || 'drept');
    case 'poligon': return P.poligon(CK, el);
    case 'sfert': return P.sfert(CK, el.x, el.y, el.r, el.spre);
    case 'semicerc': return P.semicerc(CK, el.x, el.y, el.r, el.spre);
    case 'grila': { const f = P.grila(CK, el); ctx.garda.push(...[]); return garda(CK, 'uneste', f, uneste(CK, f), ctx, `${el.id}: grila`); }
    case 'litera': {
      const F = el.grosime && ctx.fontCu ? ctx.fontCu(el.grosime) : ctx.font;
      return literaPeGrila(CK, F, el.text, el.x, el.y, el.inaltime, ctx.glifa);
    }
    default: throw new Error('element necunoscut ' + el.tip);
  }
}

// garda B1: forma combinată, randată la 512 px, față de combinarea pe pixeli a formelor necombinate; suprapunere ≥ 0,995
export function garda(CK, cod, intrari, rezultat, ctx, eticheta) {
  const fer = cutieLista([...intrari, rezultat]);
  if (fer[2] - fer[0] <= 0 || fer[3] - fer[1] <= 0) { ctx.garda.push({ eticheta, cod, iou: 1 }); return rezultat; }
  const L = 512;
  const m = intrari.map((p) => binar(randeaza(CK, [p], fer, L, L, { aa: false })));
  const asteptat = new Uint8Array(L * L);
  for (let i = 0; i < L * L; i++) {
    let v;
    if (cod === 'uneste') { v = 0; for (const x of m) v |= x[i]; }
    else if (cod === 'scade') { v = m[0][i]; for (let k = 1; k < m.length; k++) v &= 1 - m[k][i]; }
    else if (cod === 'intersecteaza') { v = 1; for (const x of m) v &= x[i]; }
    else { v = 0; for (const x of m) v ^= x[i]; }
    asteptat[i] = v;
  }
  const iesit = binar(randeaza(CK, [rezultat], fer, L, L, { aa: false }));
  const iou = suprapunere(asteptat, iesit);
  ctx.garda.push({ eticheta, cod, iou: Math.round(iou * 100000) / 100000 });
  return rezultat;
}

function aplicaOp(CK, cod, forme, ctx, eticheta) {
  let r;
  if (cod === 'uneste') r = uneste(CK, forme);
  else if (cod === 'scade') { r = forme[0]; const rest = uneste(CK, forme.slice(1)); r = opPath(CK, r, rest, 'scade'); }
  else { r = forme[0]; for (let i = 1; i < forme.length; i++) r = opPath(CK, r, forme[i], cod); }
  r = simplifica(r);
  return garda(CK, cod, forme, r, ctx, eticheta);
}

// compilează un semn: { forme: [{ path, culoare }], tipuri: [tipurile elementelor], nrOperatii }
export function compileazaSemn(CK, s, ctx) {
  const harta = new Map(); const consumate = new Set();
  for (const el of s.elemente) {
    if (el.tip === 'repetitie') {
      const baza = harta.get(el.element); consumate.add(el.element);
      const copii = []; for (let i = 0; i < el.n; i++) copii.push(i ? transforma(CK, baza, matRot((360 / el.n) * i, el.centru[0], el.centru[1])) : baza);
      harta.set(el.id, aplicaOp(CK, 'uneste', copii, ctx, `${el.id}: repetiția lui ${el.element}`));
    } else harta.set(el.id, element(CK, el, ctx));
  }
  for (const o of s.operatii || []) {
    const ids = o.op === 'scade' ? [o.din, ...o.scad] : o.elemente;
    const forme = ids.map((x) => harta.get(x)); ids.forEach((x) => consumate.add(x));
    const r = aplicaOp(CK, o.op, forme, ctx, `${o.rezultat}: ${o.op} ${ids.join(', ')}`);
    if (r.isEmpty()) throw new Error(`operația care dă „${o.rezultat}” lasă o formă goală`);
    harta.set(o.rezultat, r);
  }
  const afis = s.afisat && s.afisat.length ? s.afisat : [...harta.keys()].filter((k) => !consumate.has(k)).map((id) => ({ id, culoare: 'principal' }));
  return { forme: afis.map((a) => ({ path: harta.get(a.id), culoare: a.culoare || 'principal' })), tipuri: s.elemente.map((e) => e.tip), nrOperatii: (s.operatii || []).length };
}
export { gol };
