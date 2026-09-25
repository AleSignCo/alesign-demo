// PDF-ul contractului (pdf-lib, fără dependențe native). Fonturile (Manrope + Cormorant Garamond) se iau din Google Fonts la prima cerere și se țin în memorie.
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { clauze, anexa, antet, pret } from './contract-text.js';

// Cormorant (font variabil) nu trece prin fontkit; titlurile merg pe Manrope 700.
const FONTS = { regular: ['Manrope', 400], bold: ['Manrope', 700], serif: ['Manrope', 700] };
const cache = {};

async function fontBytes(family, weight) {
  const key = `${family}:${weight}`;
  if (cache[key]) return cache[key];
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`, { headers: { 'User-Agent': 'curl/8' } })).text();
    const m = css.match(/src:\s*url\(([^)]+\.ttf)\)/);
    if (!m) throw new Error('fără ttf');
    const b = new Uint8Array(await (await fetch(m[1])).arrayBuffer());
    cache[key] = b;
    return b;
  } catch { return null; }
}

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[„”]/g, '"').replace(/·/g, '-');

export async function contractPdf(d) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const A = antet(d);
  pdf.setTitle(`Contract ${A.numar} - AleSign&Co`);
  pdf.setAuthor('AleSign&Co');
  pdf.setLanguage('ro');

  const fb = await Promise.all([fontBytes(...FONTS.regular), fontBytes(...FONTS.bold), fontBytes(...FONTS.serif)]);
  const ok = fb.every(Boolean);
  const F = ok
    ? { r: await pdf.embedFont(fb[0], { subset: true }), b: await pdf.embedFont(fb[1], { subset: true }), s: await pdf.embedFont(fb[2], { subset: true }) }
    : { r: await pdf.embedFont(StandardFonts.Helvetica), b: await pdf.embedFont(StandardFonts.HelveticaBold), s: await pdf.embedFont(StandardFonts.TimesRomanBold) };
  const T = ok ? (s) => String(s ?? '') : strip; // fără fonturi Google, scoatem diacriticele (WinAnsi)

  const W = 595.28, H = 841.89, M = 56, LW = W - 2 * M;
  const ink = rgb(0.08, 0.08, 0.08), muted = rgb(0.42, 0.4, 0.37), line = rgb(0.886, 0.867, 0.827), accent = rgb(1, 0.165, 0.18);
  let page, y, pn = 0;
  const pages = [];

  const newPage = () => {
    page = pdf.addPage([W, H]); pages.push(page); pn++;
    // antet
    page.drawCircle({ x: M + 6, y: H - M + 4, size: 5, borderColor: ink, borderWidth: 1.2 });
    page.drawCircle({ x: M + 6, y: H - M + 4, size: 1.3, color: ink });
    page.drawCircle({ x: M + 9.6, y: H - M + 7.6, size: 1.6, color: accent });
    page.drawText('AleSign&Co', { x: M + 18, y: H - M, size: 9, font: F.b, color: ink });
    const r = T(`${A.titlu} nr. ${A.numar}`);
    page.drawText(r, { x: W - M - F.r.widthOfTextAtSize(r, 8), y: H - M, size: 8, font: F.r, color: muted });
    page.drawLine({ start: { x: M, y: H - M - 10 }, end: { x: W - M, y: H - M - 10 }, thickness: 0.6, color: line });
    y = H - M - 34;
  };
  const need = (h) => { if (y - h < M + 24) newPage(); };
  const wrap = (text, font, size, width) => {
    const out = []; let cur = '';
    for (const w of String(text).split(/\s+/)) {
      const t = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  };
  const para = (text, { font = F.r, size = 10, color = ink, lh = 1.5, indent = 0, after = 6 } = {}) => {
    const lines = wrap(T(text), font, size, LW - indent);
    for (const l of lines) { need(size * lh); page.drawText(l, { x: M + indent, y, size, font, color }); y -= size * lh; }
    y -= after;
  };
  const h = (text, size = 12, after = 4) => { need(size * 2.4); y -= 6; page.drawText(T(text), { x: M, y, size, font: F.b, color: ink }); y -= size * 1.5 + after; };
  const bullet = (text) => { need(16); page.drawCircle({ x: M + 6, y: y + 3.5, size: 1.6, color: accent }); para(text, { indent: 16, after: 2 }); };

  newPage();
  page.drawText(T(A.titlu), { x: M, y, size: 22, font: F.s, color: ink }); y -= 28;
  page.drawText(T(`Nr. ${A.numar} · ${A.data}`), { x: M, y, size: 10, font: F.r, color: muted }); y -= 26;

  for (const c of clauze(d)) { h(c.titlu); for (const p of c.p) para(p); }
  const an = anexa(d);
  h(an.titlu, 13);
  para('Ce include:', { font: F.b, after: 2 }); for (const x of an.include) bullet(x);
  y -= 4; para('Termene:', { font: F.b, after: 2 }); for (const x of an.termene) bullet(x);
  para(an.nota, { size: 8.5, color: muted, after: 10 });

  // semnături
  need(120); y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: line }); y -= 22;
  const P = d.prestator || {}, C = d.client || {};
  const col = (x, et, nume, rep, sub) => {
    page.drawText(T(et), { x, y, size: 7.5, font: F.b, color: muted });
    page.drawText(T(nume), { x, y: y - 20, size: 15, font: F.s, color: ink });
    page.drawText(T(rep), { x, y: y - 36, size: 9.5, font: F.r, color: ink });
    if (sub) { let yy = y - 50; for (const l of wrap(T(sub), F.r, 8, LW / 2 - 20)) { page.drawText(l, { x, y: yy, size: 8, font: F.r, color: muted }); yy -= 11; } }
  };
  const semnat = d.semnat_la ? new Date(d.semnat_la) : null;
  const cand = semnat ? `${semnat.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' })}, ${semnat.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' })}` : '';
  col(M, 'PRESTATOR', P.denumire || 'AleSign&Co SRL', P.reprezentant || 'Alexandru Paval', semnat ? `Acceptat electronic la ${cand}, prin sistemul AleSign.` : 'Semnătura');
  col(M + LW / 2 + 10, 'CLIENT', C.denumire || '[firma clientului]', d.semnatura_nume || C.reprezentant || '[reprezentant]',
    semnat ? (d.semnatura_mod === 'clasic' ? `Semnat pe hârtie, confirmat la ${cand}.` : `Semnat electronic la ${cand}${d.semnatura_ip ? `, IP ${d.semnatura_ip}` : ''}. Consimțământ înregistrat: nume, acord bifat, buton „Semnez”.`) : 'Semnătura');
  y -= 96;

  // subsol pe fiecare pagină
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: M - 6 }, end: { x: W - M, y: M - 6 }, thickness: 0.6, color: line });
    pg.drawText(T(`AleSign&Co · alesign.net · info@alesign.net`), { x: M, y: M - 20, size: 7.5, font: F.r, color: muted });
    const p = `${i + 1} / ${pages.length}`;
    pg.drawText(p, { x: W - M - F.r.widthOfTextAtSize(p, 7.5), y: M - 20, size: 7.5, font: F.r, color: muted });
  });

  return pdf.save();
}
