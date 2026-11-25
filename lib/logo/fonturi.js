// Motorul de logo · fonturile: cele 20 de familii OFL permise, ca TTF-uri întregi din github.com/google/fonts (commitul din manifest),
// nu ca bucăți fontsource (acolo kerningul și „ș” se pierd între latin și latin-ext). Fiecare fișier are amprenta SHA-256 în
// fonturi/manifest.json și se verifică la prima deschidere. Contururile, kerningul, ligaturile și axele variabile vin din fontkit 2.0.4 (MIT).
import fs from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import * as fontkit from 'fontkit'; // import scris literal, ca Vercel (nft) să împacheteze biblioteca în funcție

// căile scrise de mână, una câte una, ca Vercel să le includă în funcție (nft urmărește doar căile literale)
const FISIERE = {
  'bitter/var.ttf': new URL('./fonturi/bitter/var.ttf', import.meta.url),
  'bitter/OFL.txt': new URL('./fonturi/bitter/OFL.txt', import.meta.url),
  'cormorantgaramond/var.ttf': new URL('./fonturi/cormorantgaramond/var.ttf', import.meta.url),
  'cormorantgaramond/OFL.txt': new URL('./fonturi/cormorantgaramond/OFL.txt', import.meta.url),
  'dmsans/var.ttf': new URL('./fonturi/dmsans/var.ttf', import.meta.url),
  'dmsans/OFL.txt': new URL('./fonturi/dmsans/OFL.txt', import.meta.url),
  'dmserifdisplay/400.ttf': new URL('./fonturi/dmserifdisplay/400.ttf', import.meta.url),
  'dmserifdisplay/OFL.txt': new URL('./fonturi/dmserifdisplay/OFL.txt', import.meta.url),
  'fraunces/var.ttf': new URL('./fonturi/fraunces/var.ttf', import.meta.url),
  'fraunces/OFL.txt': new URL('./fonturi/fraunces/OFL.txt', import.meta.url),
  'inter/var.ttf': new URL('./fonturi/inter/var.ttf', import.meta.url),
  'inter/OFL.txt': new URL('./fonturi/inter/OFL.txt', import.meta.url),
  'lato/900.ttf': new URL('./fonturi/lato/900.ttf', import.meta.url),
  'lato/700.ttf': new URL('./fonturi/lato/700.ttf', import.meta.url),
  'lato/300.ttf': new URL('./fonturi/lato/300.ttf', import.meta.url),
  'lato/500.ttf': new URL('./fonturi/lato/500.ttf', import.meta.url),
  'lato/400.ttf': new URL('./fonturi/lato/400.ttf', import.meta.url),
  'lato/600.ttf': new URL('./fonturi/lato/600.ttf', import.meta.url),
  'lato/OFL.txt': new URL('./fonturi/lato/OFL.txt', import.meta.url),
  'librebaskerville/var.ttf': new URL('./fonturi/librebaskerville/var.ttf', import.meta.url),
  'librebaskerville/OFL.txt': new URL('./fonturi/librebaskerville/OFL.txt', import.meta.url),
  'lora/var.ttf': new URL('./fonturi/lora/var.ttf', import.meta.url),
  'lora/OFL.txt': new URL('./fonturi/lora/OFL.txt', import.meta.url),
  'manrope/var.ttf': new URL('./fonturi/manrope/var.ttf', import.meta.url),
  'manrope/OFL.txt': new URL('./fonturi/manrope/OFL.txt', import.meta.url),
  'merriweather/var.ttf': new URL('./fonturi/merriweather/var.ttf', import.meta.url),
  'merriweather/OFL.txt': new URL('./fonturi/merriweather/OFL.txt', import.meta.url),
  'montserrat/var.ttf': new URL('./fonturi/montserrat/var.ttf', import.meta.url),
  'montserrat/OFL.txt': new URL('./fonturi/montserrat/OFL.txt', import.meta.url),
  'nunito/var.ttf': new URL('./fonturi/nunito/var.ttf', import.meta.url),
  'nunito/OFL.txt': new URL('./fonturi/nunito/OFL.txt', import.meta.url),
  'opensans/var.ttf': new URL('./fonturi/opensans/var.ttf', import.meta.url),
  'opensans/OFL.txt': new URL('./fonturi/opensans/OFL.txt', import.meta.url),
  'playfairdisplay/var.ttf': new URL('./fonturi/playfairdisplay/var.ttf', import.meta.url),
  'playfairdisplay/OFL.txt': new URL('./fonturi/playfairdisplay/OFL.txt', import.meta.url),
  'poppins/700.ttf': new URL('./fonturi/poppins/700.ttf', import.meta.url),
  'poppins/800.ttf': new URL('./fonturi/poppins/800.ttf', import.meta.url),
  'poppins/300.ttf': new URL('./fonturi/poppins/300.ttf', import.meta.url),
  'poppins/500.ttf': new URL('./fonturi/poppins/500.ttf', import.meta.url),
  'poppins/400.ttf': new URL('./fonturi/poppins/400.ttf', import.meta.url),
  'poppins/600.ttf': new URL('./fonturi/poppins/600.ttf', import.meta.url),
  'poppins/OFL.txt': new URL('./fonturi/poppins/OFL.txt', import.meta.url),
  'raleway/var.ttf': new URL('./fonturi/raleway/var.ttf', import.meta.url),
  'raleway/OFL.txt': new URL('./fonturi/raleway/OFL.txt', import.meta.url),
  'roboto/var.ttf': new URL('./fonturi/roboto/var.ttf', import.meta.url),
  'roboto/OFL.txt': new URL('./fonturi/roboto/OFL.txt', import.meta.url),
  'sourcesans3/var.ttf': new URL('./fonturi/sourcesans3/var.ttf', import.meta.url),
  'sourcesans3/OFL.txt': new URL('./fonturi/sourcesans3/OFL.txt', import.meta.url),
  'worksans/var.ttf': new URL('./fonturi/worksans/var.ttf', import.meta.url),
  'worksans/OFL.txt': new URL('./fonturi/worksans/OFL.txt', import.meta.url),};
const MANIFEST = JSON.parse(fs.readFileSync(new URL('./fonturi/manifest.json', import.meta.url), 'utf8'));

// aceeași listă și aceeași ordine ca în lib/spatiu.js (FONTURI) și în setarea identitate_fonturi
export const FONTURI = ['Inter', 'Montserrat', 'Poppins', 'Lato', 'Open Sans', 'Roboto', 'Nunito', 'Raleway', 'Work Sans', 'DM Sans', 'Manrope', 'Source Sans 3', 'Playfair Display', 'Merriweather', 'Lora', 'Cormorant Garamond', 'DM Serif Display', 'Libre Baskerville', 'Fraunces', 'Bitter'];
export const manifest = () => MANIFEST;
export function familie(nume) {
  const k = Object.keys(MANIFEST.familii).find((x) => x.toLowerCase() === String(nume || '').trim().toLowerCase());
  return k ? { nume: k, ...MANIFEST.familii[k] } : null;
}

const deschise = new Map();
function deschide(dir, f) {
  const cheie = `${dir}/${f.fisier}`;
  if (deschise.has(cheie)) return deschise.get(cheie);
  const buf = fs.readFileSync(fileURLToPath(FISIERE[cheie]));
  const h = createHash('sha256').update(buf).digest('hex');
  if (h !== f.sha256) throw new Error(`fontul ${cheie} nu are amprenta din manifest (${h.slice(0, 12)} ≠ ${f.sha256.slice(0, 12)})`);
  const fk = fontkit.create(buf);
  deschise.set(cheie, fk);
  return fk;
}
// octeții fișierului (cel mai apropiat de grosimea cerută): pentru PDF-uri, unde @pdf-lib/fontkit citește doar fonturile statice
export function octetiFont(nume, grosime = 400) {
  const e = familie(nume); if (!e) throw new Error(`fontul „${nume}” nu e în lista celor 20`);
  const f = e.fisiere.slice().sort((a, b) => Math.abs((a.grosime ?? 400) - grosime) - Math.abs((b.grosime ?? 400) - grosime))[0];
  const buf = fs.readFileSync(fileURLToPath(FISIERE[`${e.dir}/${f.fisier}`]));
  if (createHash('sha256').update(buf).digest('hex') !== f.sha256) throw new Error(`fontul ${e.dir}/${f.fisier} nu are amprenta din manifest`);
  return { octeti: buf, static: f.grosime != null, grosime: f.grosime, fisier: f.original };
}
// fișierele unei familii, cum le dăm clientului în brand kit: numele din google/fonts (fără paranteze și virgule), octeții, licența
export function fisiereFont(nume) {
  const e = familie(nume); if (!e) return null;
  const fisiere = e.fisiere.map((f) => {
    const buf = fs.readFileSync(fileURLToPath(FISIERE[`${e.dir}/${f.fisier}`]));
    if (createHash('sha256').update(buf).digest('hex') !== f.sha256) throw new Error(`fontul ${e.dir}/${f.fisier} nu are amprenta din manifest`);
    const baza = f.original.split('/').pop().replace(/\[([^\]]*)\]/, (m, ax) => `-variabil-${ax.replace(/,/g, '-')}`);
    return { nume: baza, octeti: buf, variabil: f.grosime == null };
  });
  return { familie: e.nume, serife: e.serife, fisiere, licenta: textLicenta(nume) };
}
export function textLicenta(nume) { const e = familie(nume); return e ? fs.readFileSync(fileURLToPath(FISIERE[`${e.dir}/OFL.txt`]), 'utf8') : null; }

// axele unei familii: { wght: {min, max, default}, ... } (la fonturile statice: grosimile fișierelor)
export function axe(nume) {
  const e = familie(nume); if (!e) return null;
  const v = e.fisiere.find((x) => x.grosime == null);
  if (v) { const ax = deschide(e.dir, v).variationAxes || {}; return Object.fromEntries(Object.entries(ax).map(([k, a]) => [k, { min: a.min, max: a.max, default: a.default }])); }
  const gs = e.fisiere.map((x) => x.grosime).sort((a, b) => a - b);
  return { wght: { min: gs[0], max: gs[gs.length - 1], default: gs.includes(400) ? 400 : gs[0], statice: gs } };
}

const instante = new Map();
// font(familie, grosime, axe) → { f, familie, grosime, axe, fisier, sha256, serife, upm, cap, xh }
export function font(nume, grosime = 400, axeCerute = {}) {
  const e = familie(nume); if (!e) throw new Error(`fontul „${nume}” nu e în lista celor 20`);
  const v = e.fisiere.find((x) => x.grosime == null);
  let f, fis, gReal = grosime, aplicate = {};
  if (v) {
    const baza = deschide(e.dir, v); fis = v;
    const ax = baza.variationAxes || {};
    aplicate = {};
    for (const [k, a] of Object.entries(ax)) {
      let val = k === 'wght' ? grosime : (axeCerute[k] != null ? Number(axeCerute[k]) : a.default);
      val = Math.max(a.min, Math.min(a.max, val));
      aplicate[k] = val;
    }
    gReal = aplicate.wght != null ? aplicate.wght : 400;
    const cheie = `${e.dir}|${JSON.stringify(aplicate)}`;
    if (instante.has(cheie)) f = instante.get(cheie);
    else { f = Object.keys(ax).length ? baza.getVariation(aplicate) : baza; instante.set(cheie, f); }
  } else {
    fis = e.fisiere.slice().sort((a, b) => Math.abs(a.grosime - grosime) - Math.abs(b.grosime - grosime) || a.grosime - b.grosime)[0];
    f = deschide(e.dir, fis); gReal = fis.grosime; aplicate = { wght: gReal };
  }
  const cap = (f.glyphForCodePoint(0x48).bbox || {}).maxY || f.capHeight;
  const xh = (f.glyphForCodePoint(0x78).bbox || {}).maxY || f.xHeight;
  return { f, familie: e.nume, grosime: gReal, axe: aplicate, fisier: fis.original, sha256: fis.sha256, serife: e.serife, upm: f.unitsPerEm, cap, xh };
}

// așezarea textului: kerningul și ligaturile fontului (GPOS, GSUB), plus spațierea cerută (miimi de em)
// → { glife: [{ i0, i1, text, id, x, adv, cmds, bbox }], latime }; i0..i1 = indicii caracterelor din text acoperite de glifă
export function aseaza(F, text, { spatiere = 0 } = {}) {
  const cps = [...text];
  const run = F.f.layout(text);
  const extra = (spatiere / 1000) * F.upm;
  let x = 0, ic = 0; const glife = [];
  run.glyphs.forEach((g, k) => {
    const p = run.positions[k]; const n = Math.max(1, (g.codePoints || []).length);
    const i0 = ic, i1 = ic + n - 1; ic += n;
    const cmds = g.path.commands.map((c) => ({ c: c.command, a: c.args.slice() }));
    glife.push({ i0, i1, text: cps.slice(i0, i1 + 1).join(''), id: g.id, x: x + p.xOffset, y: p.yOffset, adv: p.xAdvance, cmds, bbox: g.bbox, cps: g.codePoints || [] });
    x += p.xAdvance + (k < run.glyphs.length - 1 ? extra : 0);
  });
  return { glife, latime: x };
}
