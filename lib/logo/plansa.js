// Motorul de logo · planșele: candidatul pe fundal deschis, închis și pe accent, stivuit, ca avatar, ca favicon (16 și 32 px)
// și pe o carte de vizită. Fără text în afară de datele firmei de pe carte (scrise ca forme, din fontul logotipului).
import { svg } from './compileaza.js';
import { font, aseaza } from './fonturi.js';
import { caleGlifa } from './litere.js';
import { transforma, dSvg, unesteVerificat, cutieLista } from './ck.js';
import { fundaluri, culoareNegativ, contrast } from './verificari.js';

// SVG-ul unei forme, adus la exact l × h pixeli (proporția păstrată, centrat)
export const laPixeli = (text, l, h) => text.replace(/ width="[^"]*" height="[^"]*"/, ` width="${l}" height="${h}" preserveAspectRatio="xMidYMid meet"`);

// un rând de text ca formă: { d, latime } în pixeli, cu linia de bază la y
export function textCaForma(CK, familie, grosime, text, px, x, y) {
  const F = font(familie, grosime); const a = aseaza(F, text); const s = px / F.upm;
  const p = unesteVerificat(CK, a.glife.filter((g) => g.cmds.length).map((g) => transforma(CK, caleGlifa(CK, g.cmds), [s, 0, x + g.x * s, 0, -s, y, 0, 0, 1])));
  return { d: p.isEmpty() ? '' : dSvg(p), latime: a.latime * s };
}

// ce variantă merge pe un fundal: cea cu contrastul cel mai mare (aceeași regulă ca C1)
export function variantaPe(fundal, culori, folosite, paleta) {
  const neg = culoareNegativ(paleta);
  const v = [['color', Math.min(...folosite.map((x) => contrast(x, fundal)))], ['o_culoare', contrast(culori.principal, fundal)], ['negativ', contrast(neg, fundal)]];
  v.sort((a, b) => b[1] - a[1]); return v[0][0];
}

async function bucata(sharp, text, l, h) { return sharp(Buffer.from(laPixeli(text, l, h))).png().toBuffer(); }

export async function plansaCandidat(sharp, c, r, paleta = {}, dosar = null, opt = {}) {
  const CK = c.CK; const W = 1600, H = 1000;
  const culori = { principal: r.culori.principal, accent: r.culori.accent, negativ: culoareNegativ(paleta) };
  const folosite = [...new Set(svg(CK, c.forme.orizontal, culori, 'color').straturi.map((s) => s.culoare))];
  const fd = fundaluri(paleta); const compus = []; const fundalPlansa = '#E9E7E2';
  const panou = (x, y, l, h, culoare) => compus.push({ input: { create: { width: l, height: h, channels: 4, background: culoare } }, left: x, top: y });
  const pune = async (text, x, y, l, h) => { compus.push({ input: await bucata(sharp, text, l, h), left: x, top: y }); };
  // rândul 1: orizontala pe cele trei fundaluri
  const lat = Math.floor(W / fd.length);
  for (const [i, f] of fd.entries()) {
    panou(i * lat, 0, lat, 440, f.hex);
    const v = variantaPe(f.hex, culori, folosite, paleta);
    await pune(svg(CK, c.forme.orizontal, culori, v).text, i * lat + Math.round(lat * 0.1), 140, Math.round(lat * 0.8), 160);
  }
  // rândul 2: stivuita pe deschis
  panou(0, 440, 420, 560, fd[0].hex);
  await pune(svg(CK, c.forme.stivuit, culori, 'color').text, 50, 520, 320, 400);
  // avatarul: semnul pe 64 % din latură, în cerc
  panou(420, 440, 380, 560, fundalPlansa);
  const fA = contrast(culori.negativ, culori.principal) >= 3 ? culori.principal : fd[0].hex; const vA = fA === culori.principal ? 'negativ' : 'color';
  const D = 260; const sem = svg(CK, c.forme.semn, culori, vA);
  const cerc = `<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="${fA}"/></svg>`;
  compus.push({ input: Buffer.from(cerc), left: 480, top: 500 });
  await pune(sem.text, 480 + Math.round(D * 0.18), 500 + Math.round(D * 0.18), Math.round(D * 0.64), Math.round(D * 0.64));
  const d2 = 72; compus.push({ input: Buffer.from(cerc.replace(/260/g, d2).replace(/130/g, d2 / 2)), left: 574, top: 820 });
  await pune(sem.text, 574 + Math.round(d2 * 0.18), 820 + Math.round(d2 * 0.18), Math.round(d2 * 0.64), Math.round(d2 * 0.64));
  // faviconul: 16 și 32 px, mărit la 160 px (pixel cu pixel, ca să se vadă ce rămâne din semn) și dedesubt la mărimea reală
  panou(800, 440, 300, 560, '#DEE1E6');
  const fav = svg(CK, c.forme.semn, culori, folosite.length > 1 && contrast(culori.principal, '#FFFFFF') >= 3 ? 'color' : 'o_culoare');
  for (const [k, n] of [[0, 16], [1, 32]]) {
    const png = await sharp(Buffer.from(laPixeli(fav.text, n, n))).flatten({ background: '#FFFFFF' }).png().toBuffer();
    const M = 160; const mare = await sharp(png).resize(M, M, { kernel: 'nearest' }).png().toBuffer();
    panou(830, 470 + k * 260, 240, 240, '#FFFFFF');
    compus.push({ input: mare, left: 830 + (240 - M) / 2, top: 470 + k * 260 + 16 });
    compus.push({ input: png, left: 830 + 120 - n / 2, top: 470 + k * 260 + 240 - n - 14 });
  }
  // cartea de vizită, 85 × 55 mm, cu telefonul și emailul din Dosar
  panou(1100, 440, 500, 560, fundalPlansa);
  const cl = 440, ch = Math.round((440 * 55) / 85), cx = 1130, cy = 520;
  const id = (dosar && dosar.identitate) || {};
  const linie = [id.telefon || id.telefon_afisat, id.email].filter(Boolean).join('   ·   ');
  const fT = opt.fontText || (c.F.serife ? 'Source Sans 3' : c.font.familie);
  const t = linie ? textCaForma(CK, fT, 400, linie, 13, 0, 0) : null;
  const carte = `<svg xmlns="http://www.w3.org/2000/svg" width="${cl}" height="${ch}"><rect width="${cl}" height="${ch}" fill="${fd[0].hex}"/>${t ? `<path transform="translate(${Math.round((cl - t.latime) / 2)},${ch - 26})" fill="${culori.principal}" d="${t.d}"/>` : ''}</svg>`;
  compus.push({ input: { create: { width: cl, height: ch, channels: 4, background: '#00000022' } }, left: cx + 3, top: cy + 4 });
  compus.push({ input: Buffer.from(carte), left: cx, top: cy });
  await pune(svg(CK, c.forme.orizontal, culori, 'color').text, cx + Math.round(cl * 0.15), cy + Math.round(ch * 0.28), Math.round(cl * 0.7), Math.round(ch * 0.3));
  return sharp({ create: { width: W, height: H, channels: 4, background: fundalPlansa } }).composite(compus).png().toBuffer();
}

// planșa setului: candidații unul sub altul, orizontala pe deschis și semnul, cu id-ul (pentru Founder OS)
export async function plansaSet(sharp, lista, paleta = {}) {
  const fd = fundaluri(paleta); const L = 1600, h = 240; const compus = [];
  for (const [i, x] of lista.entries()) {
    const { c, r } = x; const CK = c.CK; const culori = { principal: r.culori.principal, accent: r.culori.accent, negativ: culoareNegativ(paleta) };
    compus.push({ input: { create: { width: L, height: h - 6, channels: 4, background: fd[0].hex } }, left: 0, top: i * h });
    compus.push({ input: { create: { width: 300, height: h - 6, channels: 4, background: fd[1].hex } }, left: L - 300, top: i * h });
    const et = textCaForma(CK, 'Inter', 600, `${r.id}${x.trecut === false ? '  (oprit)' : ''}`, 22, 0, 0);
    compus.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40"><path transform="translate(24,28)" fill="${x.trecut === false ? '#B3261E' : '#555555'}" d="${et.d}"/></svg>`), left: 0, top: i * h + 10 });
    compus.push({ input: await bucata(sharp, svg(CK, c.forme.orizontal, culori, 'color').text, 1100, 130), left: 80, top: i * h + 60 });
    compus.push({ input: await bucata(sharp, svg(CK, c.forme.semn, culori, 'negativ').text, 160, 160), left: L - 230, top: i * h + 37 });
  }
  return sharp({ create: { width: L, height: lista.length * h, channels: 4, background: '#E9E7E2' } }).composite(compus).png().toBuffer();
}
