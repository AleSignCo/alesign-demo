// Motorul de logo · literele: logotipul (numele scris, cu detaliile parametrice) și monograma.
// Unitățile: majuscula are 100, linia de bază e la y = 0, y în jos (literele urcă spre y = -100).
import { font, aseaza } from './fonturi.js';
import { transforma, uneste, op as opPath, simplifica, contururi, cutie, cutieLista, matRot, randeaza, gol, curata } from './ck.js';
import * as P from './primitive.js';
import { compileazaSemn, garda } from './semn.js';
import { rezolvaLitera } from './reteta.js';

export const CAP = 100;

export function caleGlifa(CK, cmds) {
  const b = new CK.PathBuilder();
  for (const { c, a } of cmds) {
    if (c === 'moveTo') b.moveTo(a[0], a[1]);
    else if (c === 'lineTo') b.lineTo(a[0], a[1]);
    else if (c === 'quadraticCurveTo') b.quadTo(a[0], a[1], a[2], a[3]);
    else if (c === 'bezierCurveTo') b.cubicTo(a[0], a[1], a[2], a[3], a[4], a[5]);
    else if (c === 'closePath') b.close();
  }
  return curata(CK, b.detachAndDelete()); // contururile suprapuse din fonturile variabile, aduse la o formă curată
}
// o glifă singură, în unitățile fontului (y în sus): pentru literele din semn
export function glifaInContur(CK) {
  return (F, ch) => {
    const r = aseaza(F, ch); const g = r.glife[0]; if (!g || g.id === 0) return null;
    return { path: caleGlifa(CK, g.cmds), bbox: g.bbox };
  };
}

// grosimea tijei, măsurată pe glifă (l sau I), în unitățile noastre (majuscula = 100)
const tije = new Map();
export function grosimeTija(CK, F, mare = false) {
  const k = `${F.familie}|${JSON.stringify(F.axe)}|${mare}`;
  if (tije.has(k)) return tije.get(k);
  const ch = mare ? 'I' : 'l'; const a = aseaza(F, ch).glife[0];
  const s = CAP / F.cap;
  const p = transforma(CK, caleGlifa(CK, a.cmds), [s, 0, 0, 0, -s, 0, 0, 0, 1]);
  const [x0, , x1] = cutie(p);
  const L = 400; const H = 400; const fer = [x0 - 5, -CAP, x0 - 5 + (CAP + 10), 0];
  const m = randeaza(CK, [p], fer, L, H, { aa: false });
  const sc = L / (CAP + 10); const row = Math.round(H * 0.5);
  let best = 0, run = 0; for (let x = 0; x < L; x++) { if (m[row * L + x] >= 128) { run++; best = Math.max(best, run); } else run = 0; }
  const t = best / sc || (x1 - x0) * 0.5;
  tije.set(k, t); return t;
}

const fereastraBanda = (CK, cx, cy, unghi, latime, lung) => {
  const r = (unghi * Math.PI) / 180; const L = lung / 2;
  return P.bara(CK, cx - L * Math.cos(r), cy + L * Math.sin(r), cx + L * Math.cos(r), cy - L * Math.sin(r), latime, 'drept');
};
// aria unei forme, numărată în pixeli pe fereastra altei forme (256 × 256, fără netezire)
function aria(CK, p, fer) { const m = randeaza(CK, [p], cutie(fer), 256, 256, { aa: false }); let n = 0; for (let i = 0; i < m.length; i++) if (m[i] >= 128) n++; return n; }
const dilata = (CK, p, d) => (d > 0 ? uneste(CK, [p, p.makeStroked({ width: 2 * d, join: CK.StrokeJoin.Round, cap: CK.StrokeCap.Round })]) : p);
const scade = (CK, a, b, ctx, et) => { const r = simplifica(opPath(CK, a, b, 'scade')); return garda(CK, 'scade', [a, b], r, ctx, et); };

// textul așezat: o glifă = { cale (unitățile noastre), culoare, i0, i1, text, bbox, adv, x }
function aseazaText(CK, F, text, { spatiere = 0, randuri = 1 } = {}) {
  const s = CAP / F.cap; const out = []; let latime = 0;
  const linii = randuri === 2 ? (() => { const k = text.search(/\s/); return [{ t: text.slice(0, k), off: 0 }, { t: text.slice(k).replace(/^\s+/, ''), off: [...text.slice(0, k)].length + (text.slice(k).length - text.slice(k).replace(/^\s+/, '').length) }]; })() : [{ t: text, off: 0 }];
  const latimi = [];
  linii.forEach((ln, li) => {
    const a = aseaza(F, ln.t, { spatiere });
    latimi.push(a.latime * s);
    a.glife.forEach((g) => {
      const cps = [...ln.t];
      const p = transforma(CK, caleGlifa(CK, g.cmds), [s, 0, g.x * s, 0, -s, li * 1.45 * CAP - g.y * s, 0, 0, 1]);
      out.push({ cale: p, culoare: 'principal', i0: ln.off + [...cps.slice(0, g.i0)].length, i1: ln.off + g.i1, text: g.text, id: g.id, linie: li, gol: !g.cmds.length, cps: g.cps });
    });
  });
  latime = Math.max(...latimi);
  // centrez rândurile între ele
  if (linii.length > 1) linii.forEach((_, li) => { const dx = (latime - latimi[li]) / 2; if (dx) out.filter((g) => g.linie === li).forEach((g) => { g.cale = transforma(CK, g.cale, [1, 0, dx, 0, 1, 0, 0, 0, 1]); }); });
  return { glife: out, latime, s };
}

const glifeTinta = (glife, nume, t) => {
  if (t === 'toate') return glife.filter((g) => !g.gol);
  const r = rezolvaLitera(nume, t); if (r.eroare) throw new Error(r.eroare);
  return glife.filter((g) => r.index >= g.i0 && r.index <= g.i1);
};

// contururile unei glife, clasate: corp, punct (deasupra literelor mici), semn deasupra, semn dedesubt
function parti(CK, g, F) {
  const xh = (F.xh / F.cap) * CAP;
  return contururi(CK, g.cale).map((p) => { const b = cutie(p); return { p, b, deasupra: b[3] < -xh * 0.92 && b[3] < -CAP * 0.4, dedesubt: b[1] > CAP * 0.02 }; });
}

export function aplicaDetalii(CK, glife, detalii, nume, F, ctx, unitate, gest) {
  const xh = (F.xh / F.cap) * CAP;
  const extra = []; // forme noi (accent sau înlocuiri)
  for (const [k, d] of (detalii || []).entries()) {
    const et = `detaliul ${k + 1} (${d.tip})`;
    const latime = (d.latime != null ? d.latime : gest.latime) * unitate;
    const unghi = d.unghi != null ? d.unghi : (d.tip === 'sablon' && gest.unghi == null ? 90 : gest.unghi);
    if (d.tip === 'taietura' || d.tip === 'sablon') {
      const tinte = d.litere === 'toate' ? ['toate'] : d.litere;
      for (const t of tinte) {
        const gs = glifeTinta(glife, nume, t); if (!gs.length) continue;
        if (t === 'toate' && d.tip === 'taietura') {
          const b = cutieLista(gs.map((g) => g.cale)); const cx = (b[0] + b[2]) / 2; const cy = -(d.inaltime != null ? d.inaltime : 0.5) * CAP;
          const banda = fereastraBanda(CK, cx, cy, unghi, latime, (b[2] - b[0]) * 2 + 4 * CAP);
          gs.forEach((g) => { g.cale = scade(CK, g.cale, banda, ctx, `${et}: ${g.text}`); });
        } else gs.forEach((g) => {
          const b = cutie(g.cale);
          const cx = d.tip === 'sablon' ? b[0] + (d.pozitie != null ? d.pozitie : 0.5) * (b[2] - b[0]) : (b[0] + b[2]) / 2;
          const cy = d.tip === 'sablon' ? (b[1] + b[3]) / 2 : -(d.inaltime != null ? d.inaltime : 0.5) * CAP;
          const banda = fereastraBanda(CK, cx, cy, unghi, latime, 4 * CAP);
          g.cale = scade(CK, g.cale, banda, ctx, `${et}: ${g.text}`);
        });
      }
    } else if (d.tip === 'bara_ligatura') {
      const A = glifeTinta(glife, nume, d.de_la)[0], B = glifeTinta(glife, nume, d.pana_la)[0];
      const t = grosimeTija(CK, F, /\p{Lu}/u.test(A.text));
      const gro = d.grosime != null ? d.grosime * unitate : t;
      const ba = cutie(A.cale), bb = cutie(B.cale);
      const h = d.inaltime == null || d.inaltime === 'x' ? -xh + gro / 2 : d.inaltime === 'baza' ? -gro / 2 : d.inaltime === 'majuscula' ? -CAP + gro / 2 : -d.inaltime * CAP;
      const x0 = Math.min(ba[2], bb[0]) - t * 0.6, x1 = Math.max(ba[2], bb[0]) + t * 0.6;
      const bara = P.dreptunghi(CK, x0, h - gro / 2, x1 - x0, gro);
      const u = simplifica(uneste(CK, [A.cale, bara])); A.cale = garda(CK, 'uneste', [A.cale, bara], u, ctx, `${et}: ${A.text}`);
    } else if (d.tip === 'ochi_umplut') {
      const tinte = d.litere === 'toate' ? ['toate'] : d.litere;
      for (const t of tinte) for (const g of glifeTinta(glife, nume, t)) {
        const pline = uneste(CK, contururi(CK, g.cale).map((p) => { p.setFillType(CK.FillType.Winding); return simplifica(p); }));
        const gauri = simplifica(opPath(CK, pline, g.cale, 'scade'));
        if (gauri.isEmpty()) {
          if (d._optional) continue; // inițiala din „doar semnul”: dacă n-are ochi, rămâne cum e
          const cuOchi = [...new Set(glife.filter((x) => !x.gol && x.text.trim() && !simplifica(opPath(CK, uneste(CK, contururi(CK, x.cale).map((p) => { p.setFillType(CK.FillType.Winding); return simplifica(p); })), x.cale, 'scade')).isEmpty()).map((x) => x.text))];
          throw new Error(`„${g.text}” n-are un ochi închis în ${F.familie}; "ochi_umplut" merge doar pe literele cu ochi închis${cuOchi.length ? `, aici: ${cuOchi.map((x) => `"${x}"`).join(', ')}` : ''}; de exemplu "litere": ["${cuOchi[0] || 'a'}"]`);
        }
        if (d.culoare === 'accent') extra.push({ cale: gauri, culoare: 'accent', i0: g.i0, i1: g.i1, text: g.text + ' (ochiul)' });
        else g.cale = garda(CK, 'uneste', [g.cale, gauri], pline, ctx, `${et}: ${g.text}`);
      }
    } else if (d.tip === 'litera_forma') {
      const g = glifeTinta(glife, nume, d.litera)[0]; const parte = d.parte || 'intreaga';
      const sub = { garda: ctx.garda, font: F, glifa: ctx.glifa };
      const semn = compileazaSemn(CK, d.semn, sub);
      let box;
      if (parte === 'intreaga') {
        const b = cutie(g.cale); const H = /\p{Lu}/u.test(g.text) ? CAP : xh; const cx = (b[0] + b[2]) / 2;
        box = [cx - H / 2, -H, H]; g.cale = gol(CK);
      } else {
        const pp = parti(CK, g, F);
        const alese = pp.filter((x) => (parte === 'punct' ? x.deasupra : (/[șțȘȚ]/.test(g.text) ? x.dedesubt : x.deasupra)));
        if (!alese.length || alese.length === pp.length) throw new Error(`„${g.text}” n-are ${parte === 'punct' ? 'punctul' : 'semnul'} desenat separat în ${F.familie}`);
        const b = cutieLista(alese.map((x) => x.p)); const latura = 1.6 * Math.max(b[2] - b[0], b[3] - b[1]);
        box = [(b[0] + b[2]) / 2 - latura / 2, (b[1] + b[3]) / 2 - latura / 2, latura];
        g.cale = uneste(CK, pp.filter((x) => !alese.includes(x)).map((x) => x.p));
      }
      const k2 = box[2] / 24;
      semn.forme.forEach((f) => extra.push({ cale: transforma(CK, f.path, [k2, 0, box[0], 0, k2, box[1], 0, 0, 1]), culoare: f.culoare, i0: g.i0, i1: g.i1, text: g.text + ' (forma)' }));
    } else if (d.tip === 'linie_interioara') {
      const em = CAP / F.cap * F.upm; const ad = ((d.adancime != null ? d.adancime : 45) / 1000) * em, gr = ((d.grosime != null ? d.grosime : 22) / 1000) * em;
      const tinte = d.litere === 'toate' ? ['toate'] : d.litere;
      for (const t of tinte) for (const g of glifeTinta(glife, nume, t)) {
        const st = (w) => g.cale.makeStroked({ width: w, join: CK.StrokeJoin.Round, cap: CK.StrokeCap.Butt });
        const banda = simplifica(opPath(CK, st(2 * (ad + gr)), st(2 * ad), 'scade'));
        const golul = simplifica(opPath(CK, banda, g.cale, 'intersecteaza'));
        g.cale = scade(CK, g.cale, golul, ctx, `${et}: ${g.text}`);
      }
    } else if (d.tip === 'arc') {
      const toate = [...glife, ...extra]; const b0 = cutieLista(toate.map((g) => g.cale)); const X0 = (b0[0] + b0[2]) / 2;
      const R = d.raza * (CAP / F.cap) * F.upm;
      for (const g of toate) {
        if (!g.cale || g.cale.isEmpty()) continue;
        const b = cutie(g.cale); const xc = (b[0] + b[2]) / 2; const th = (xc - X0) / R; const deg = (th * 180) / Math.PI;
        let p = transforma(CK, g.cale, [1, 0, -xc, 0, 1, 0, 0, 0, 1]);
        if (d.sens === 'sus') { p = transforma(CK, p, matRot(-deg, 0, 0)); g.cale = transforma(CK, p, [1, 0, X0 + R * Math.sin(th), 0, 1, R - R * Math.cos(th), 0, 0, 1]); }
        else { p = transforma(CK, p, matRot(deg, 0, 0)); g.cale = transforma(CK, p, [1, 0, X0 + R * Math.sin(th), 0, 1, -R + R * Math.cos(th), 0, 0, 1]); }
      }
    }
  }
  return extra;
}

// logotipul: { forme: [{ path, culoare }], F, latime, glife }
export function compileazaLogotip(CK, o, nume, gest, ctx, unitate) {
  const F = font(o.font, o.grosime || 400, o.axe || {});
  const text = o.majuscule ? nume.toLocaleUpperCase('ro-RO') : nume;
  // Detaliile se aplică mereu pe un singur rând, unde „sub linia de bază” și „la jumătatea majusculei” au un singur înțeles
  // (proba din 25 nov.: pe rândul al doilea, virgula lui „Ț” nu mai era găsită și tăieturile cădeau pe rândul de sus).
  const { glife } = aseazaText(CK, F, text, { spatiere: o.spatiere || 0 });
  const lipsa = glife.filter((g) => g.id === 0);
  if (lipsa.length) throw new Error(`${F.familie} n-are glifa pentru „${lipsa.map((g) => g.text).join('')}”`);
  const extra = aplicaDetalii(CK, glife, o.detalii || [], nume, F, ctx, unitate, gest);
  const toate = [...glife, ...extra].filter((g) => g.cale && !g.cale.isEmpty());
  // pe două rânduri: tot ce vine după primul spațiu coboară un rând și se centrează sub primul cuvânt
  if ((o.randuri || 1) === 2) {
    const k = [...text].findIndex((ch) => /\s/.test(ch));
    const r1 = toate.filter((g) => g.i1 < k), r2 = toate.filter((g) => g.i0 > k);
    if (k > 0 && r1.length && r2.length) {
      const b1 = cutieLista(r1.map((g) => g.cale)), b2 = cutieLista(r2.map((g) => g.cale));
      const dx = (b1[0] + b1[2]) / 2 - (b2[0] + b2[2]) / 2;
      r2.forEach((g) => { g.cale = transforma(CK, g.cale, [1, 0, dx, 0, 1, 1.45 * CAP, 0, 0, 1]); g.linie = 1; });
    }
  }
  return { forme: toate.map((g) => ({ path: g.cale, culoare: g.culoare })), F, glife, text };
}

// inițiala, pentru „doar semnul” la un logotip fără semn: prima literă, cu tăieturile și golurile rețetei
export function compileazaInitiala(CK, o, nume, gest, ctx) {
  const F = font(o.font, o.grosime || 400, o.axe || {});
  const ch = [...nume].find((x) => /\p{L}/u.test(x));
  const text = o.majuscule ? ch.toLocaleUpperCase('ro-RO') : ch.toLocaleUpperCase('ro-RO');
  const { glife } = aseazaText(CK, F, text, {});
  // ochiul umplut ajunge pe inițială doar dacă litera are ochi (proba 660: „a” umplut nu mai oprește rețeta pe „C”)
  const det = (o.detalii || []).filter((d) => ['taietura', 'sablon', 'linie_interioara', 'ochi_umplut'].includes(d.tip)).map((d) => ({ ...d, litere: 'toate', ...(d.tip === 'ochi_umplut' ? { _optional: true } : {}) }));
  const extra = aplicaDetalii(CK, glife, det, text, F, ctx, CAP / 24, gest);
  return { forme: [...glife, ...extra].filter((g) => g.cale && !g.cale.isEmpty()).map((g) => ({ path: g.cale, culoare: g.culoare })), F };
}

// monograma: literele la majuscula 100; 1 unitate de grilă = 100/24
export function compileazaMonograma(CK, o, gest, ctx) {
  const F = font(o.font, o.grosime || 400, o.axe || {});
  const U = CAP / 24; const L = [...o.litere.normalize('NFC')];
  const gol = (o.gol != null ? o.gol : (gest.latime || 1)) * U;
  let glife = [];
  if (o.aranjare === 'stivuite') {
    const h = (CAP - gol * (L.length - 1)) / L.length;
    L.forEach((ch, i) => {
      const a = aseazaText(CK, F, ch); const g = a.glife[0]; const k = h / CAP;
      let p = transforma(CK, g.cale, [k, 0, 0, 0, k, 0, 0, 0, 1]); const b = cutie(p);
      p = transforma(CK, p, [1, 0, -(b[0] + b[2]) / 2, 0, 1, -CAP + (i + 1) * h + i * gol, 0, 0, 1]);
      glife.push({ ...g, cale: p, i0: i, i1: i });
    });
  } else if (o.aranjare === 'in_forma') {
    const cont = compileazaSemn(CK, { elemente: [{ id: 'forma', ...o.forma }] }, { garda: ctx.garda, font: F, glifa: ctx.glifa }).forme[0].path;
    const c = transforma(CK, cont, [U, 0, 0, 0, U, -CAP, 0, 0, 1]); // grila 24 → 100, cu susul la -100
    const kH = L.length === 1 ? 0.5 : L.length === 2 ? 0.42 : 0.34;
    const a = aseazaText(CK, F, L.join(''), {}); const k = kH;
    let lit = uneste(CK, a.glife.map((g) => transforma(CK, g.cale, [k, 0, 0, 0, k, 0, 0, 0, 1])));
    const bl = cutie(lit); const bc = cutie(c);
    lit = transforma(CK, lit, [1, 0, (bc[0] + bc[2]) / 2 - (bl[0] + bl[2]) / 2, 0, 1, (bc[1] + bc[3]) / 2 - (bl[1] + bl[3]) / 2, 0, 0, 1]);
    const r = scade(CK, c, lit, ctx, 'monograma: literele scobite din formă');
    glife = [{ cale: r, culoare: 'principal', i0: 0, i1: L.length - 1, text: L.join('') }];
  } else {
    let x = 0;
    L.forEach((ch, i) => {
      const a = aseazaText(CK, F, ch); const g = a.glife[0]; const b = cutie(g.cale);
      const p = transforma(CK, g.cale, [1, 0, x - b[0], 0, 1, 0, 0, 0, 1]);
      glife.push({ ...g, cale: p, i0: i, i1: i });
      const w = b[2] - b[0];
      x += o.aranjare === 'lipite' ? w - (o.decalaj != null ? o.decalaj : 0.1) * w : w * (1 - (o.decalaj != null ? o.decalaj : 0.3));
    });
    if (o.aranjare === 'suprapuse') {
      const intregi = glife.map((g) => g.cale);
      for (let k = 1; k < glife.length; k++) {
        const d = dilata(CK, glife[k].cale, gol);
        for (let j = 0; j < k; j++) glife[j].cale = scade(CK, glife[j].cale, d, ctx, `monograma: golul dintre ${glife[k].text} și ${glife[j].text}`);
      }
      // cât din fiecare literă rămâne la vedere (verificarea L1): un B căruia O îi acoperă burțile se citește E
      ctx.litereMonograma = glife.map((g, i) => ({ litera: g.text, pastrat: aria(CK, g.cale, intregi[i]) / Math.max(1e-9, aria(CK, intregi[i], intregi[i])) }));
    } else if (o.aranjare === 'lipite') {
      const u = simplifica(uneste(CK, glife.map((g) => g.cale)));
      glife = [{ cale: garda(CK, 'uneste', glife.map((g) => g.cale), u, ctx, 'monograma: literele lipite'), culoare: 'principal', i0: 0, i1: L.length - 1, text: L.join('') }];
    }
  }
  const extra = aplicaDetalii(CK, glife, o.detalii || [], L.join(''), F, ctx, U, gest);
  return { forme: [...glife, ...extra].filter((g) => g.cale && !g.cale.isEmpty()).map((g) => ({ path: g.cale, culoare: g.culoare || 'principal' })), F };
}
