// Formele de bază ale semnului geometric, pe grila de 24, ca contururi închise din linii și cubice.
// Nicio curbă liberă: orice curbă de aici e un arc de cerc sau de elipsă.
import { arcCubic, matRot, transforma, uneste, punct, K90 } from './ck.js';

const DIR_SFERT = { NE: [0, 90], NV: [90, 180], SV: [180, 270], SE: [270, 360] };
const DIR_SEMI = { N: [0, 180], V: [90, 270], S: [180, 360], E: [-90, 90] };

export function cerc(CK, cx, cy, r) {
  const b = new CK.PathBuilder(); arcCubic(b, cx, cy, r, 0, 360, 'm'); b.close(); return b.detachAndDelete();
}
export function elipsa(CK, cx, cy, rx, ry, rot = 0) {
  const b = new CK.PathBuilder(); const k = K90;
  b.moveTo(cx + rx, cy);
  b.cubicTo(cx + rx, cy - k * ry, cx + k * rx, cy - ry, cx, cy - ry);
  b.cubicTo(cx - k * rx, cy - ry, cx - rx, cy - k * ry, cx - rx, cy);
  b.cubicTo(cx - rx, cy + k * ry, cx - k * rx, cy + ry, cx, cy + ry);
  b.cubicTo(cx + k * rx, cy + ry, cx + rx, cy + k * ry, cx + rx, cy);
  b.close();
  const p = b.detachAndDelete();
  return rot ? transforma(CK, p, matRot(rot, cx, cy)) : p;
}
export function dreptunghi(CK, x, y, l, h, raza = 0, rot = 0) {
  const r = Math.max(0, Math.min(raza, l / 2, h / 2));
  const b = new CK.PathBuilder();
  if (r <= 0) { b.moveTo(x, y); b.lineTo(x + l, y); b.lineTo(x + l, y + h); b.lineTo(x, y + h); b.close(); }
  else {
    b.moveTo(x + r, y); b.lineTo(x + l - r, y); arcCubic(b, x + l - r, y + r, r, 90, 0);
    b.lineTo(x + l, y + h - r); arcCubic(b, x + l - r, y + h - r, r, 0, -90);
    b.lineTo(x + r, y + h); arcCubic(b, x + r, y + h - r, r, 270, 180);
    b.lineTo(x, y + r); arcCubic(b, x + r, y + r, r, 180, 90); b.close();
  }
  const p = b.detachAndDelete();
  return rot ? transforma(CK, p, matRot(rot, x + l / 2, y + h / 2)) : p;
}
export function bara(CK, x1, y1, x2, y2, g, capete = 'drept') {
  const dx = x2 - x1, dy = y2 - y1; const L = Math.hypot(dx, dy) || 1e-9;
  const nx = (-dy / L) * (g / 2), ny = (dx / L) * (g / 2);
  const b = new CK.PathBuilder();
  if (capete === 'rotund') {
    // unghiul pe ecran al direcției (y în jos → minus)
    const a = (Math.atan2(-(dy), dx) * 180) / Math.PI;
    b.moveTo(x1 + nx, y1 + ny);
    b.lineTo(x2 + nx, y2 + ny);
    arcCubic(b, x2, y2, g / 2, a - 90, a + 90);
    b.lineTo(x1 - nx, y1 - ny);
    arcCubic(b, x1, y1, g / 2, a + 90, a + 270);
    b.close();
  } else { b.moveTo(x1 + nx, y1 + ny); b.lineTo(x2 + nx, y2 + ny); b.lineTo(x2 - nx, y2 - ny); b.lineTo(x1 - nx, y1 - ny); b.close(); }
  return b.detachAndDelete();
}
export function arc(CK, cx, cy, r, g, start, unghi, capete = 'drept') {
  const ro = r + g / 2, ri = r - g / 2; const a0 = start, a1 = start + unghi;
  const b = new CK.PathBuilder();
  arcCubic(b, cx, cy, ro, a0, a1, 'm');
  if (capete === 'rotund') { const [ex, ey] = punct(cx, cy, r, a1); arcCubic(b, ex, ey, g / 2, a1, a1 + 180); }
  else { const [x, y] = punct(cx, cy, ri, a1); b.lineTo(x, y); }
  if (ri > 0) arcCubic(b, cx, cy, ri, a1, a0); else b.lineTo(cx, cy);
  if (capete === 'rotund') { const [sx, sy] = punct(cx, cy, r, a0); arcCubic(b, sx, sy, g / 2, a0 + 180, a0 + 360); }
  b.close();
  return b.detachAndDelete();
}
export function poligon(CK, el) {
  const b = new CK.PathBuilder(); let pts;
  if (Array.isArray(el.puncte)) pts = el.puncte;
  else { pts = []; for (let i = 0; i < el.laturi; i++) pts.push(punct(el.cx, el.cy, el.r, 90 + (el.rot || 0) + (i * 360) / el.laturi)); }
  pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.close();
  return b.detachAndDelete();
}
export function sfert(CK, x, y, r, spre) {
  const [a0, a1] = DIR_SFERT[spre]; const b = new CK.PathBuilder();
  b.moveTo(x, y); arcCubic(b, x, y, r, a0, a1, 'l'); b.close(); return b.detachAndDelete();
}
export function semicerc(CK, x, y, r, spre) {
  const [a0, a1] = DIR_SEMI[spre]; const b = new CK.PathBuilder();
  arcCubic(b, x, y, r, a0, a1, 'm'); b.close(); return b.detachAndDelete();
}
// grila de sferturi: celule n × n; „N/S/E/V” = pătratul cu latura dinspre direcție rotunjită în semicerc
export function grila(CK, el) {
  const c = el.latura / el.n; const forme = [];
  el.celule.forEach((cod, i) => {
    const x0 = el.x + (i % el.n) * c, y0 = el.y + Math.floor(i / el.n) * c;
    if (cod === '.') return;
    if (cod === 'p') forme.push(dreptunghi(CK, x0, y0, c, c));
    else if (cod === 'c') forme.push(cerc(CK, x0 + c / 2, y0 + c / 2, c / 2));
    else if (cod === 'NE') forme.push(sfert(CK, x0, y0 + c, c, 'NE'));
    else if (cod === 'NV') forme.push(sfert(CK, x0 + c, y0 + c, c, 'NV'));
    else if (cod === 'SV') forme.push(sfert(CK, x0 + c, y0, c, 'SV'));
    else if (cod === 'SE') forme.push(sfert(CK, x0, y0, c, 'SE'));
    else if (cod === 'N') forme.push(uneste(CK, [dreptunghi(CK, x0, y0 + c / 2, c, c / 2), semicerc(CK, x0 + c / 2, y0 + c / 2, c / 2, 'N')]));
    else if (cod === 'S') forme.push(uneste(CK, [dreptunghi(CK, x0, y0, c, c / 2), semicerc(CK, x0 + c / 2, y0 + c / 2, c / 2, 'S')]));
    else if (cod === 'E') forme.push(uneste(CK, [dreptunghi(CK, x0, y0, c / 2, c), semicerc(CK, x0 + c / 2, y0 + c / 2, c / 2, 'E')]));
    else if (cod === 'V') forme.push(uneste(CK, [dreptunghi(CK, x0 + c / 2, y0, c / 2, c), semicerc(CK, x0 + c / 2, y0 + c / 2, c / 2, 'V')]));
  });
  return forme;
}
