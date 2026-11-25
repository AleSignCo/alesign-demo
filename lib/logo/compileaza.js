// Motorul de logo · compilarea unei rețete validate: semnul, logotipul și combinațiile (orizontală, stivuită, doar semnul),
// apoi SVG-ul în trei variante (color, pe o culoare, negativ), construite ca forme, nu cu filtre.
import { createHash } from 'crypto';
import { canvaskit, transforma, uneste, unesteVerificat, simplifica, cutieLista, dSvg, noduri } from './ck.js';
import { compileazaSemn } from './semn.js';
import { compileazaLogotip, compileazaMonograma, compileazaInitiala, glifaInContur, CAP } from './litere.js';
import { font } from './fonturi.js';

export const PROPORTIE_SEMN = 1.3; // în combinația orizontală, semnul are 1,3 × majuscula

const mut = (CK, forme, m) => forme.map((f) => ({ ...f, path: transforma(CK, f.path, m) }));

// rețeta → { semn: {forme, cutie}, logotip: {forme}, orizontal, stivuit, doar_semn, garda, info }
export async function compileaza(r, opt = {}) {
  const CK = await canvaskit();
  const gest = r.gest || {};
  const ctx = { garda: [], glifa: glifaInContur(CK) };
  let semn = null; let cutieSemn = null; let tipuri = []; let nrOp = 0;
  const lt = r.logotip || null;
  if (r.semn) {
    const Fs = font((lt && lt.font) || (r.monograma && r.monograma.font) || opt.fontImplicit || 'Inter', (lt && lt.grosime) || 600, (lt && lt.axe) || {});
    const c = compileazaSemn(CK, r.semn, { ...ctx, font: Fs, fontCu: (g) => font(Fs.familie, g, Fs.axe) });
    semn = c.forme; cutieSemn = [0, 0, 24, 24]; tipuri = c.tipuri; nrOp = c.nrOperatii;
  } else if (r.monograma) {
    const c = compileazaMonograma(CK, r.monograma, gest, ctx);
    semn = c.forme; const b = cutieLista(semn.map((f) => f.path)); cutieSemn = [b[0], -CAP, b[2], 0]; tipuri = ['monograma']; nrOp = 0;
  }
  const areSemn = !!semn;
  const k = r.combinatie || {}; const prop = PROPORTIE_SEMN * (k.marime_semn || 1); const faraSemn = k.fara_semn === true;
  const unitate = areSemn ? (CAP * PROPORTIE_SEMN) / 24 : CAP / 24;
  const logo = lt || (r.monograma ? { font: r.monograma.font, grosime: r.monograma.grosime, axe: r.monograma.axe, spatiere: 20, detalii: [] } : { font: opt.fontImplicit || 'Inter', grosime: 500, spatiere: 10, detalii: [] });
  const L = compileazaLogotip(CK, logo, r.nume, gest, ctx, unitate);
  if (!areSemn) { const I = compileazaInitiala(CK, logo, r.nume, gest, ctx); semn = I.forme; const b = cutieLista(semn.map((f) => f.path)); cutieSemn = [b[0], -CAP, b[2], 0]; tipuri = ['initiala']; }

  // doar semnul: pe grila lui, adus la 240 × 240 (o unitate = 10), centrat
  const hS = cutieSemn[3] - cutieSemn[1];
  const kD = 240 / hS; const bS = cutieLista(semn.map((f) => f.path));
  const doar = mut(CK, semn, [kD, 0, 120 - ((bS[0] + bS[2]) / 2) * kD, 0, kD, -cutieSemn[1] * kD + (r.semn ? 0 : 0), 0, 0, 1]);
  // orizontala: semnul la 1,3 × majuscula (cu corectura de mărime), centrat pe înălțimea majusculei
  const kO = (CAP * prop) / hS;
  const semnO = mut(CK, semn, [kO, 0, -bS[0] * kO, 0, kO, -cutieSemn[1] * kO - CAP / 2 - (CAP * prop) / 2, 0, 0, 1]);
  const bO = cutieLista(semnO.map((f) => f.path)); const bL = cutieLista(L.forme.map((f) => f.path));
  const golO = 0.38 * CAP * prop;
  const logoO = mut(CK, L.forme, [1, 0, bO[2] + golO - bL[0], 0, 1, 0, 0, 0, 1]);
  const orizontal = areSemn && !faraSemn ? [...semnO, ...logoO] : L.forme;
  // stivuita: semnul la 2,6 × majuscula, deasupra, centrat
  let stivuit;
  if (areSemn && !faraSemn) {
    const kS = (CAP * 2 * prop) / hS;
    const semnS = mut(CK, semn, [kS, 0, 0, 0, kS, 0, 0, 0, 1]); const bSS = cutieLista(semnS.map((f) => f.path));
    const cxL = (bL[0] + bL[2]) / 2;
    stivuit = [...mut(CK, semnS, [1, 0, cxL - (bSS[0] + bSS[2]) / 2, 0, 1, -CAP - 0.45 * CAP - bSS[3], 0, 0, 1]), ...L.forme];
  } else if (/\s/.test(r.nume) && (logo.randuri || 1) === 1) {
    stivuit = compileazaLogotip(CK, { ...logo, randuri: 2 }, r.nume, gest, ctx, unitate).forme;
  } else stivuit = L.forme;
  return {
    CK, ctx, garda: ctx.garda, tipuri, nrOperatii: nrOp, areSemn, faraSemn, familie: r.familie,
    forme: { semn: doar, orizontal, stivuit, logotip: L.forme },
    font: { familie: L.F.familie, grosime: L.F.grosime, axe: L.F.axe, fisier: L.F.fisier, sha256: L.F.sha256, serife: L.F.serife },
    text: L.text, glife: L.glife, F: L.F,
  };
}

// SVG-ul unei combinații, într-o variantă: color (principal + accent), o_culoare (totul în principal), negativ (totul în culoarea deschisă)
export function svg(CK, forme, culori, varianta = 'color', { margine = 0, fundal = null } = {}) {
  const straturi = [];
  if (varianta === 'color') {
    // principal, apoi accent, apoi culorile date direct (#RRGGBB, la logoul existent, unde straturile vin deja fără suprapuneri)
    const rez = (c) => (c === 'accent' ? culori.accent : !c || c === 'principal' ? culori.principal : c);
    const grupe = new Map([[rez('principal'), []], [rez('accent'), []]]);
    for (const f of forme) { const k = rez(f.culoare); if (!grupe.has(k)) grupe.set(k, []); grupe.get(k).push(f.path); }
    for (const [cul, ps] of grupe) if (cul && ps.length) straturi.push({ path: unesteVerificat(CK, ps), culoare: cul });
  } else {
    straturi.push({ path: unesteVerificat(CK, forme.map((f) => f.path)), culoare: varianta === 'negativ' ? (culori.negativ || '#FFFFFF') : (culori.mono || culori.principal) });
  }
  const b = cutieLista(straturi.map((s) => s.path));
  const x0 = b[0] - margine, y0 = b[1] - margine, w = b[2] - b[0] + 2 * margine, h = b[3] - b[1] + 2 * margine;
  const r2 = (v) => Math.round(v * 100) / 100;
  const vb = `${r2(x0)} ${r2(y0)} ${r2(w)} ${r2(h)}`;
  const H = 100; const W = r2((w / h) * H);
  // umplerea „nonzero” peste tot (makeAsWinding): așa o citesc la fel browserul, PDF-ul (pdf-lib) și programele de tipar
  for (const s of straturi) { const w = s.path.makeAsWinding(); if (w) s.path = w; }
  const cai = straturi.map((s) => `<path fill="${s.culoare.toUpperCase()}"${s.path.getFillType() === CK.FillType.EvenOdd ? ' fill-rule="evenodd"' : ''} d="${dSvg(s.path)}"/>`).join('');
  const fd = fundal ? `<rect x="${r2(x0)}" y="${r2(y0)}" width="${r2(w)}" height="${r2(h)}" fill="${fundal.toUpperCase()}"/>` : '';
  const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${W}" height="${H}">${fd}${cai}</svg>`;
  return { text, hash: createHash('sha256').update(text).digest('hex'), noduri: straturi.reduce((s, x) => s + noduri(x.path), 0), straturi, cutie: [x0, y0, x0 + w, y0 + h] };
}
