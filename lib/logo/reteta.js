// Motorul de logo · validarea rețetei v1 (contractul: notițele comune, logo-reteta-v1.md).
// Întoarce { ok, reteta (normalizată), erori: ['r1.semn.elemente[2].rot: 20 nu e multiplu de 15', ...] }.
// Mesajele sunt pentru botul care reface rețeta: spun ce câmp, ce valoare și ce regulă.
import { FONTURI, familie, axe as axeFont } from './fonturi.js';

export const FAMILII = ['logotip', 'monograma', 'semn'];
export const DETALII = ['taietura', 'bara_ligatura', 'ochi_umplut', 'litera_forma', 'sablon', 'linie_interioara', 'arc'];
const DETALII_MONO = ['taietura', 'bara_ligatura', 'ochi_umplut', 'sablon'];
const ELEMENTE = ['cerc', 'elipsa', 'dreptunghi', 'bara', 'arc', 'poligon', 'sfert', 'semicerc', 'litera', 'repetitie', 'grila'];
const CODURI_GRILA = ['.', 'p', 'c', 'NE', 'NV', 'SE', 'SV', 'N', 'S', 'E', 'V'];
const LEGATURI = ['și', 'si', 'de', 'la', 'din', '&', '-', '–', 'and', 'the'];
const CEDILA = /[ŞşŢţ]/;

const esteNr = (x) => typeof x === 'number' && Number.isFinite(x);
const multiplu = (x, p) => Math.abs(x / p - Math.round(x / p)) < 1e-9;
const hex = (x) => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x);
const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
const fmt = (x) => String(x).replace('.', ',');

// direcțiile unei linii, modulo 180, ca să compar cu gestul (o tăietură la 30 și o bară la 120 sunt același gest)
const dir = (g) => ((g % 180) + 180) % 180;
function inGest(gUnghi, unghiuri) {
  const ne = unghiuri.map(dir).filter((d) => d % 90 !== 0);
  if (!ne.length) return true;
  if (gUnghi == null) return false;
  const G = [dir(gUnghi), dir(gUnghi + 90)];
  return ne.every((d) => G.some((x) => Math.abs(x - d) < 1e-6));
}

// literele din nume: "i" = primul i, "i#2" = al doilea; "toate"
export function rezolvaLitera(nume, t) {
  const cps = [...nfc(nume)];
  const m = /^(.)(?:#(\d+))?$/u.exec(String(t || ''));
  if (!m) return { eroare: `„${t}” nu e o literă (scrie litera, de exemplu "i" sau "i#2")` };
  const ch = m[1]; const nr = m[2] ? parseInt(m[2], 10) : 1;
  let k = 0;
  for (let i = 0; i < cps.length; i++) if (cps[i] === ch && ++k === nr) return { index: i, ch };
  return { eroare: k ? `„${ch}” apare de ${k} ori în „${nume}”, nu de ${nr}` : `„${ch}” nu e în „${nume}” (literele mari și mici contează)` };
}
export function initiale(nume) {
  return nfc(nume).split(/[\s\-–]+/).filter((w) => w && !LEGATURI.includes(w.toLowerCase())).map((w) => [...w.replace(/^[^\p{L}]+/u, '')][0]).filter(Boolean);
}

export function valideaza(r, ctx = {}) {
  const E = []; const id = r && typeof r.id === 'string' ? r.id : '?';
  const err = (cale, m) => E.push(`${id}${cale ? '.' + cale : ''}: ${m}`);
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { ok: false, erori: ['rețeta nu e un obiect JSON'] };
  if (r.v !== 1) err('v', `versiunea e ${JSON.stringify(r.v)}; motorul citește v: 1`);
  if (typeof r.id !== 'string' || !/^[a-z0-9-]{1,24}$/.test(r.id)) err('id', 'litere mici, cifre și cratimă, 1–24 de caractere');
  if (!FAMILII.includes(r.familie)) err('familie', `„${r.familie}” nu e una dintre ${FAMILII.join(', ')}`);
  const nume = nfc(r.nume);
  if (!nume.trim()) err('nume', 'lipsește');
  if (CEDILA.test(nume)) err('nume', '„ş” sau „ţ” cu sedilă (U+015F, U+0163): scrie „ș” și „ț” cu virgulă (U+0219, U+021B)');
  if (ctx.numeDosar != null && nume !== nfc(ctx.numeDosar).replace(/ş/g, 'ș').replace(/ţ/g, 'ț').replace(/Ş/g, 'Ș').replace(/Ţ/g, 'Ț'))
    err('nume', `„${nume}” nu e identic cu numele din Dosar, „${nfc(ctx.numeDosar)}”`);
  // motivul și faptul
  const mt = r.motiv || {};
  if (typeof mt.text !== 'string' || mt.text.trim().length < 20 || mt.text.length > 300) err('motiv.text', 'o propoziție de 20–300 de caractere');
  if (!mt.fapt || typeof mt.fapt.cale !== 'string' || !/^[\p{L}\w]+(\.[\p{L}\w]+)*$/u.test(mt.fapt.cale)) err('motiv.fapt.cale', 'calea din Dosar, cu puncte (de exemplu brand.logo_raspunsuri.detaliu)');
  if (!mt.fapt || typeof mt.fapt.citat !== 'string' || mt.fapt.citat.trim().length < 3 || mt.fapt.citat.length > 200) err('motiv.fapt.citat', 'faptul copiat din Dosar, 3–200 de caractere');
  // gestul
  const g = r.gest || {};
  if (!r.gest || typeof r.gest !== 'object' || (g.unghi == null && g.latime == null && g.raza == null)) err('gest', 'cel puțin unul dintre unghi, latime, raza');
  if (g.unghi != null && (!esteNr(g.unghi) || !multiplu(g.unghi, 15) || g.unghi < 0 || g.unghi > 165)) err('gest.unghi', `${g.unghi} trebuie să fie multiplu de 15, între 0 și 165`);
  if (g.latime != null && (!esteNr(g.latime) || !multiplu(g.latime, 0.5) || g.latime < 0.5 || g.latime > 4)) err('gest.latime', `${g.latime} trebuie să fie multiplu de 0,5, între 0,5 și 4`);
  if (g.raza != null && (!esteNr(g.raza) || !multiplu(g.raza, 0.5) || g.raza < 0.5 || g.raza > 6)) err('gest.raza', `${g.raza} trebuie să fie multiplu de 0,5, între 0,5 și 6`);
  // culorile
  const c = r.culori || {};
  const paleta = (ctx.paleta || []).map((x) => String(x).toLowerCase());
  if (!hex(c.principal)) err('culori.principal', 'un cod #RRGGBB');
  else if (paleta.length && !paleta.includes(c.principal.toLowerCase())) err('culori.principal', `${c.principal} nu e în paleta trimisă (${paleta.join(', ')})`);
  if (c.accent != null) { if (!hex(c.accent)) err('culori.accent', 'un cod #RRGGBB sau lipsește'); else if (paleta.length && !paleta.includes(c.accent.toLowerCase())) err('culori.accent', `${c.accent} nu e în paleta trimisă (${paleta.join(', ')})`); }
  const areAccent = hex(c.accent);
  const unghiuriVazute = []; const loc = { litere: false, semn: false }; // pentru G1
  // familia
  if (r.familie === 'logotip' && !r.logotip) err('logotip', 'lipsește (familia e logotip)');
  if (r.familie === 'monograma' && !r.monograma) err('monograma', 'lipsește (familia e monograma)');
  if (r.familie === 'semn' && !r.semn) err('semn', 'lipsește (familia e semn)');
  if (r.logotip) valideazaLogotip(r.logotip, 'logotip', nume, g, areAccent, err, unghiuriVazute, loc);
  if (r.monograma) valideazaMonograma(r.monograma, 'monograma', nume, g, areAccent, err, unghiuriVazute, loc);
  if (r.semn) valideazaSemn(r.semn, 'semn', nume, g, areAccent, err, { max: 12, maxOp: 6, litere: true }, unghiuriVazute, loc);
  // combinația (din corecturile de la kit): mărimea semnului față de nume și logoul fără semn
  if (r.combinatie != null) {
    const k = r.combinatie;
    if (typeof k !== 'object' || Array.isArray(k)) err('combinatie', 'un obiect: { marime_semn, fara_semn }');
    else {
      if (k.marime_semn != null && (!esteNr(k.marime_semn) || k.marime_semn < 0.8 - 1e-9 || k.marime_semn > 1.2 + 1e-9)) err('combinatie.marime_semn', 'între 0,8 și 1,2 (1 înseamnă semnul la 1,3 × majuscula)');
      if (k.fara_semn != null && typeof k.fara_semn !== 'boolean') err('combinatie.fara_semn', 'true sau false');
    }
  }
  if (!inGest(g.unghi, unghiuriVazute)) err('gest.unghi', `rețeta folosește unghiurile ${[...new Set(unghiuriVazute.map(dir).filter((d) => d % 90))].join(', ')}, dar gest.unghi e ${g.unghi == null ? 'nescris' : g.unghi}: semnul și literele au același unghi`);
  return { ok: E.length === 0, erori: E, reteta: E.length ? null : r, gest: loc };
}

function tinta(nume, t, cale, err) { const x = rezolvaLitera(nume, t); if (x.eroare) { err(cale, x.eroare); return null; } return x; }
function tinte(nume, l, cale, err) {
  if (l === 'toate') return 'toate';
  if (!Array.isArray(l) || !l.length) { err(cale, 'o listă de litere sau "toate"'); return null; }
  return l.map((t, i) => tinta(nume, t, `${cale}[${i}]`, err));
}

function valideazaFont(o, cale, err) {
  if (!FONTURI.includes(o.font)) { err(`${cale}.font`, `„${o.font}” nu e în lista celor 20 (${FONTURI.join(', ')})`); return; }
  if (!esteNr(o.grosime) || o.grosime < 300 || o.grosime > 900 || !multiplu(o.grosime, 100)) err(`${cale}.grosime`, `${o.grosime}: între 300 și 900, din 100 în 100`);
  const ax = axeFont(o.font) || {};
  for (const [k, v] of Object.entries(o.axe || {})) {
    if (k === 'wght') { err(`${cale}.axe.wght`, 'grosimea se scrie la „grosime”'); continue; }
    if (!ax[k]) { err(`${cale}.axe.${k}`, `${o.font} n-are axa ${k}${Object.keys(ax).filter((x) => x !== 'wght').length ? ` (are ${Object.keys(ax).filter((x) => x !== 'wght').join(', ')})` : ''}`); continue; }
    if (!esteNr(v) || v < ax[k].min || v > ax[k].max) err(`${cale}.axe.${k}`, `${v} e în afara axei (${ax[k].min}–${ax[k].max})`);
  }
}

function valideazaDetaliu(d, cale, nume, g, areAccent, err, permise, unghiuri, loc) {
  if (!d || !permise.includes(d.tip)) { err(`${cale}.tip`, `„${d && d.tip}” nu e una dintre ${permise.join(', ')}`); return; }
  loc.litere = true;
  const unghiCerut = (implicit) => {
    if (d.unghi != null) {
      if (!esteNr(d.unghi) || !multiplu(d.unghi, 15)) { err(`${cale}.unghi`, `${d.unghi} nu e multiplu de 15`); return; }
      if (dir(d.unghi) % 90 !== 0 && (g.unghi == null || ![dir(g.unghi), dir(g.unghi + 90)].includes(dir(d.unghi)))) { err(`${cale}.unghi`, `${d.unghi} nu e gest.unghi (${g.unghi == null ? 'nescris' : g.unghi}); semnul și literele au același unghi`); return; }
      unghiuri.push(d.unghi);
    } else if (implicit == null) err(`${cale}.unghi`, 'lipsește și nici gest.unghi nu e scris');
    else unghiuri.push(implicit);
  };
  const latimeCeruta = () => {
    if (d.latime != null && g.latime != null && d.latime !== g.latime) err(`${cale}.latime`, `${fmt(d.latime)} nu e gest.latime (${fmt(g.latime)})`);
    if (d.latime == null && g.latime == null) err(`${cale}.latime`, 'lipsește și nici gest.latime nu e scris');
  };
  switch (d.tip) {
    case 'taietura':
      tinte(nume, d.litere, `${cale}.litere`, err); unghiCerut(g.unghi); latimeCeruta();
      if (d.inaltime != null && (!esteNr(d.inaltime) || d.inaltime < 0 || d.inaltime > 1)) err(`${cale}.inaltime`, 'între 0 și 1');
      break;
    case 'sablon':
      tinte(nume, d.litere, `${cale}.litere`, err); unghiCerut(g.unghi != null ? g.unghi : 90); latimeCeruta();
      if (d.pozitie != null && (!esteNr(d.pozitie) || d.pozitie < 0 || d.pozitie > 1)) err(`${cale}.pozitie`, 'între 0 și 1');
      break;
    case 'bara_ligatura': {
      const a = tinta(nume, d.de_la, `${cale}.de_la`, err), b = tinta(nume, d.pana_la, `${cale}.pana_la`, err);
      if (a && b && b.index <= a.index) err(`${cale}.pana_la`, `„${d.pana_la}” trebuie să vină după „${d.de_la}” în nume`);
      if (a && b && [...nume].slice(a.index, b.index + 1).includes(' ')) err(`${cale}`, 'bara leagă litere din același cuvânt');
      if (d.inaltime != null && !['baza', 'x', 'majuscula'].includes(d.inaltime) && !(esteNr(d.inaltime) && d.inaltime >= 0 && d.inaltime <= 1)) err(`${cale}.inaltime`, '"baza", "x", "majuscula" sau un număr 0–1');
      if (d.grosime != null && (!esteNr(d.grosime) || d.grosime < 0.5 || d.grosime > 6 || !multiplu(d.grosime, 0.5))) err(`${cale}.grosime`, 'în unități de grilă, multiplu de 0,5, 0,5–6');
      break; }
    case 'ochi_umplut':
      tinte(nume, d.litere, `${cale}.litere`, err);
      if (d.culoare != null && !['principal', 'accent'].includes(d.culoare)) err(`${cale}.culoare`, '"principal" sau "accent"');
      if (d.culoare === 'accent' && !areAccent) err(`${cale}.culoare`, 'accent, dar culori.accent lipsește');
      break;
    case 'litera_forma': {
      const t = tinta(nume, d.litera, `${cale}.litera`, err);
      const parte = d.parte || 'intreaga';
      if (!['intreaga', 'punct', 'semn_diacritic'].includes(parte)) err(`${cale}.parte`, '"intreaga", "punct" sau "semn_diacritic"');
      if (t && parte === 'punct' && !/[ijIJ]/.test(t.ch) && !/[îÎ]/.test(t.ch)) err(`${cale}.parte`, `„${t.ch}” n-are punct (merge la i și j)`);
      if (t && parte === 'semn_diacritic' && !/[șțăâîȘȚĂÂÎ]/.test(t.ch)) err(`${cale}.parte`, `„${t.ch}” n-are semn diacritic (merge la ș, ț, ă, â, î)`);
      if (!d.semn || typeof d.semn !== 'object') err(`${cale}.semn`, 'lipsește semnul care ține locul literei');
      else valideazaSemn(d.semn, `${cale}.semn`, nume, g, areAccent, err, { max: 6, maxOp: 3, litere: false }, unghiuri, { litere: false, semn: false });
      break; }
    case 'linie_interioara':
      tinte(nume, d.litere, `${cale}.litere`, err);
      if (d.adancime != null && (!esteNr(d.adancime) || d.adancime < 10 || d.adancime > 150)) err(`${cale}.adancime`, '10–150 de miimi de em');
      if (d.grosime != null && (!esteNr(d.grosime) || d.grosime < 8 || d.grosime > 80)) err(`${cale}.grosime`, '8–80 de miimi de em');
      break;
    case 'arc':
      if (!esteNr(d.raza) || d.raza < 1.5 || d.raza > 12) err(`${cale}.raza`, 'în em, între 1,5 și 12');
      if (!['sus', 'jos'].includes(d.sens)) err(`${cale}.sens`, '"sus" sau "jos"');
      break;
    default:
  }
}

function valideazaLogotip(o, cale, nume, g, areAccent, err, unghiuri, loc) {
  valideazaFont(o, cale, err);
  if (o.majuscule != null && typeof o.majuscule !== 'boolean') err(`${cale}.majuscule`, 'true sau false');
  if (o.spatiere != null && (!esteNr(o.spatiere) || o.spatiere < -50 || o.spatiere > 200)) err(`${cale}.spatiere`, 'între -50 și 200 (miimi de em)');
  if (o.randuri != null && ![1, 2].includes(o.randuri)) err(`${cale}.randuri`, '1 sau 2');
  if (o.randuri === 2 && !/\s/.test(nume)) err(`${cale}.randuri`, 'numele are un singur cuvânt');
  const d = o.detalii == null ? [] : o.detalii;
  if (!Array.isArray(d) || d.length > 2) { err(`${cale}.detalii`, 'o listă de cel mult 2 rețete'); return; }
  d.forEach((x, i) => valideazaDetaliu(x, `${cale}.detalii[${i}]`, nume, g, areAccent, err, DETALII, unghiuri, loc));
  if (d.filter((x) => x && x.tip === 'arc').length && o.randuri === 2) err(`${cale}.detalii`, 'arcul merge doar pe un rând');
}

function valideazaMonograma(o, cale, nume, g, areAccent, err, unghiuri, loc) {
  valideazaFont(o, cale, err);
  loc.semn = true;
  const L = [...nfc(o.litere || '')];
  if (L.length < 1 || L.length > 3) err(`${cale}.litere`, '1–3 inițiale');
  else {
    const ini = initiale(nume); let j = 0; let bune = true;
    for (const ch of L) { while (j < ini.length && ini[j].toLowerCase() !== ch.toLowerCase()) j++; if (j >= ini.length) { bune = false; break; } j++; }
    if (!bune) err(`${cale}.litere`, `„${o.litere}” nu sunt inițialele lui „${nume}” în ordine (inițialele: ${ini.join(', ')})`);
  }
  if (!['suprapuse', 'lipite', 'stivuite', 'in_forma'].includes(o.aranjare)) err(`${cale}.aranjare`, '"suprapuse", "lipite", "stivuite" sau "in_forma"');
  if (o.decalaj != null && (!esteNr(o.decalaj) || o.decalaj < 0 || o.decalaj > 0.8)) err(`${cale}.decalaj`, 'între 0 și 0,8');
  if (o.gol != null && (!esteNr(o.gol) || o.gol < 0 || o.gol > 4 || !multiplu(o.gol, 0.5))) err(`${cale}.gol`, 'multiplu de 0,5, între 0 și 4');
  if (o.gol != null && g.latime != null && o.gol !== g.latime && o.gol !== 0) err(`${cale}.gol`, `${fmt(o.gol)} nu e gest.latime (${fmt(g.latime)})`);
  if (o.aranjare === 'in_forma') {
    if (!o.forma || !['cerc', 'dreptunghi', 'poligon'].includes(o.forma.tip)) err(`${cale}.forma`, 'la in_forma: un cerc, un dreptunghi sau un poligon pe grila de 24');
    else valideazaSemn({ elemente: [{ id: 'forma', ...o.forma }] }, `${cale}`, nume, g, areAccent, err, { max: 1, maxOp: 0, litere: false, prefix: 'forma' }, unghiuri, loc);
  }
  if (L.length === 1 && o.aranjare !== 'in_forma' && !(o.detalii || []).length) err(`${cale}`, 'o singură literă fără formă și fără detaliu e doar o literă: pune aranjare "in_forma" sau un detaliu');
  const d = o.detalii == null ? [] : o.detalii;
  if (!Array.isArray(d) || d.length > 2) { err(`${cale}.detalii`, 'o listă de cel mult 2 rețete'); return; }
  const numeM = L.join('');
  d.forEach((x, i) => valideazaDetaliu(x, `${cale}.detalii[${i}]`, numeM, g, areAccent, err, DETALII_MONO, unghiuri, loc));
}

const pe = (v) => esteNr(v) && multiplu(v, 0.5);
const inGrila = (v) => pe(v) && v >= 0 && v <= 24;
export function valideazaSemn(s, cale, nume, g, areAccent, err, lim, unghiuri, loc) {
  if (!s || !Array.isArray(s.elemente) || !s.elemente.length) { err(`${cale}.elemente`, 'cel puțin un element'); return; }
  if (s.elemente.length > lim.max) err(`${cale}.elemente`, `${s.elemente.length} elemente; cel mult ${lim.max}`);
  const ops = s.operatii == null ? [] : s.operatii;
  if (!Array.isArray(ops)) { err(`${cale}.operatii`, 'o listă'); return; }
  if (ops.length > lim.maxOp) err(`${cale}.operatii`, `${ops.length} operații; cel mult ${lim.maxOp}`);
  loc.semn = loc.semn || !lim.prefix;
  const ids = new Map(); const consumate = new Set();
  s.elemente.forEach((el, i) => {
    const c = lim.prefix ? lim.prefix : `${cale}.elemente[${i}]`;
    if (!el || !ELEMENTE.includes(el.tip)) { err(`${c}.tip`, `„${el && el.tip}” nu e unul dintre ${ELEMENTE.join(', ')}`); return; }
    if (!lim.prefix && (typeof el.id !== 'string' || !/^[a-z0-9_-]{1,24}$/i.test(el.id))) err(`${c}.id`, 'un nume scurt, din litere și cifre');
    if (ids.has(el.id)) err(`${c}.id`, `„${el.id}” e folosit de două ori`);
    const num = (k, ok, m) => { if (!ok(el[k])) err(`${c}.${k}`, `${JSON.stringify(el[k])}: ${m}`); };
    const G = (k) => num(k, inGrila, 'pe grilă: multiplu de 0,5, între 0 și 24');
    const R = (k, max = 24) => num(k, (v) => pe(v) && v > 0 && v <= max, `multiplu de 0,5, mai mare ca 0, cel mult ${max}`);
    const U = (k, opt = true) => { if (el[k] == null && opt) return; num(k, (v) => esteNr(v) && multiplu(v, 15), 'multiplu de 15'); };
    switch (el.tip) {
      case 'cerc': G('cx'); G('cy'); R('r', 12); break;
      case 'elipsa': G('cx'); G('cy'); R('rx', 12); R('ry', 12); U('rot'); if (esteNr(el.rot)) unghiuri.push(el.rot, el.rot + 90); break;
      case 'dreptunghi':
        G('x'); G('y'); R('l'); R('h'); U('rot');
        if (esteNr(el.rot)) unghiuri.push(el.rot);
        if (el.raza != null && el.raza !== 0) { if (g.raza == null) err(`${c}.raza`, 'colț rotunjit, dar gest.raza nu e scris'); else if (el.raza !== g.raza) err(`${c}.raza`, `${fmt(el.raza)} nu e gest.raza (${fmt(g.raza)}): colțurile au raza gestului`); }
        if (esteNr(el.x) && esteNr(el.l) && el.x + el.l > 24) err(`${c}`, 'iese din grilă la dreapta (x + l > 24)');
        if (esteNr(el.y) && esteNr(el.h) && el.y + el.h > 24) err(`${c}`, 'iese din grilă jos (y + h > 24)');
        break;
      case 'bara':
        if (el.cx != null || el.lungime != null) { G('cx'); G('cy'); R('lungime', 34); num('unghi', (v) => esteNr(v) && multiplu(v, 15), 'multiplu de 15'); if (esteNr(el.unghi)) unghiuri.push(el.unghi); }
        else {
          G('x1'); G('y1'); G('x2'); G('y2');
          if ([el.x1, el.y1, el.x2, el.y2].every(esteNr)) {
            const dx = el.x2 - el.x1, dy = el.y2 - el.y1;
            if (!dx && !dy) err(`${c}`, 'capetele sunt în același punct');
            else if (dx && dy && Math.abs(Math.abs(dx) - Math.abs(dy)) > 1e-9) err(`${c}`, 'pe capete merge doar orizontal, vertical sau la 45°; pentru alt unghi scrie cx, cy, lungime și unghi');
            else unghiuri.push(dx && dy ? (Math.sign(dx) === Math.sign(-dy) ? 45 : 135) : (dx ? 0 : 90));
          }
        }
        R('grosime', 8);
        if (el.capete != null && !['drept', 'rotund'].includes(el.capete)) err(`${c}.capete`, '"drept" sau "rotund"');
        break;
      case 'arc':
        G('cx'); G('cy'); R('r', 12); R('grosime', 8); U('start', false); num('unghi', (v) => esteNr(v) && multiplu(v, 15) && v >= 15 && v <= 345, 'multiplu de 15, între 15 și 345');
        if (el.capete != null && !['drept', 'rotund'].includes(el.capete)) err(`${c}.capete`, '"drept" sau "rotund"');
        if (esteNr(el.r) && esteNr(el.grosime) && el.grosime >= 2 * el.r) err(`${c}.grosime`, 'mai groasă decât diametrul arcului');
        break;
      case 'poligon':
        if (Array.isArray(el.puncte)) {
          if (el.puncte.length < 3 || el.puncte.length > 8) err(`${c}.puncte`, '3–8 colțuri');
          el.puncte.forEach((p, k) => { if (!Array.isArray(p) || p.length !== 2 || !inGrila(p[0]) || !inGrila(p[1])) err(`${c}.puncte[${k}]`, 'o pereche [x, y] pe grilă'); });
        } else { G('cx'); G('cy'); R('r', 12); num('laturi', (v) => Number.isInteger(v) && v >= 3 && v <= 8, 'un număr întreg 3–8'); U('rot'); }
        break;
      case 'sfert': G('x'); G('y'); R('r', 24); if (!['NE', 'NV', 'SE', 'SV'].includes(el.spre)) err(`${c}.spre`, '"NE", "NV", "SE" sau "SV"'); break;
      case 'semicerc': G('x'); G('y'); R('r', 12); if (!['N', 'S', 'E', 'V'].includes(el.spre)) err(`${c}.spre`, '"N", "S", "E" sau "V"'); break;
      case 'litera':
        if (!lim.litere) { err(`${c}`, 'aici nu merge o literă'); break; }
        if (typeof el.text !== 'string' || [...el.text].length !== 1) err(`${c}.text`, 'un singur caracter');
        else if (!nfc(nume).toLowerCase().includes(nfc(el.text).toLowerCase())) err(`${c}.text`, `„${el.text}” nu e în „${nume}”`);
        else if (CEDILA.test(el.text)) err(`${c}.text`, 'ş/ţ cu sedilă: scrie ș/ț cu virgulă');
        G('x'); G('y'); R('inaltime', 24);
        if (el.grosime != null && (!esteNr(el.grosime) || el.grosime < 300 || el.grosime > 900 || !multiplu(el.grosime, 100))) err(`${c}.grosime`, '300–900, din 100 în 100');
        break;
      case 'repetitie':
        if (!ids.has(el.element)) err(`${c}.element`, `„${el.element}” nu e un element de dinainte`);
        else consumate.add(el.element);
        num('n', (v) => [2, 3, 4, 6, 8, 12].includes(v), '2, 3, 4, 6, 8 sau 12');
        if (!Array.isArray(el.centru) || el.centru.length !== 2 || !inGrila(el.centru[0]) || !inGrila(el.centru[1])) err(`${c}.centru`, 'o pereche [x, y] pe grilă');
        break;
      case 'grila':
        G('x'); G('y'); num('n', (v) => [2, 3, 4].includes(v), '2, 3 sau 4');
        R('latura');
        if (esteNr(el.latura) && esteNr(el.n) && !multiplu(el.latura / el.n, 0.5)) err(`${c}.latura`, `latura împărțită la ${el.n} trebuie să dea un multiplu de 0,5`);
        if (esteNr(el.x) && esteNr(el.latura) && el.x + el.latura > 24) err(`${c}`, 'iese din grilă la dreapta');
        if (esteNr(el.y) && esteNr(el.latura) && el.y + el.latura > 24) err(`${c}`, 'iese din grilă jos');
        if (!Array.isArray(el.celule) || (esteNr(el.n) && el.celule.length !== el.n * el.n)) err(`${c}.celule`, `${esteNr(el.n) ? el.n * el.n : 'n × n'} coduri`);
        else el.celule.forEach((k, j) => { if (!CODURI_GRILA.includes(k)) err(`${c}.celule[${j}]`, `„${k}” nu e un cod (${CODURI_GRILA.join(' ')})`); });
        if (Array.isArray(el.celule) && el.celule.every((k) => k === '.')) err(`${c}.celule`, 'toate celulele sunt goale');
        break;
      default:
    }
    ids.set(el.id, el);
  });
  // operațiile
  ops.forEach((o, i) => {
    const c = `${cale}.operatii[${i}]`;
    if (!o || !['uneste', 'scade', 'intersecteaza', 'xor'].includes(o.op)) { err(`${c}.op`, '"uneste", "scade", "intersecteaza" sau "xor"'); return; }
    const folosite = o.op === 'scade' ? [o.din, ...(Array.isArray(o.scad) ? o.scad : [])] : (Array.isArray(o.elemente) ? o.elemente : []);
    if (o.op === 'scade' && (!Array.isArray(o.scad) || !o.scad.length)) err(`${c}.scad`, 'o listă de id-uri');
    if (o.op !== 'scade' && folosite.length < 2) err(`${c}.elemente`, 'cel puțin două id-uri');
    folosite.forEach((x) => { if (!ids.has(x)) err(c, `„${x}” nu există încă`); else if (consumate.has(x)) err(c, `„${x}” a fost deja folosit într-o operație`); });
    if (o.op === 'scade') (o.scad || []).forEach((x) => {
      const el = ids.get(x);
      if (el && el.tip === 'bara') { if (g.latime == null) err(c, `bara „${x}” taie, dar gest.latime nu e scris`); else if (el.grosime !== g.latime) err(c, `bara „${x}” taie cu grosimea ${fmt(el.grosime)}, nu cu gest.latime (${fmt(g.latime)})`); }
    });
    if (typeof o.rezultat !== 'string' || !/^[a-z0-9_-]{1,24}$/i.test(o.rezultat)) err(`${c}.rezultat`, 'un nume nou');
    else if (ids.has(o.rezultat)) err(`${c}.rezultat`, `„${o.rezultat}” există deja`);
    folosite.forEach((x) => consumate.add(x));
    ids.set(o.rezultat, { tip: 'rezultat', op: o.op });
  });
  if (s.afisat != null) {
    if (!Array.isArray(s.afisat) || !s.afisat.length) err(`${cale}.afisat`, 'o listă de { id, culoare }');
    else s.afisat.forEach((a, i) => {
      if (!a || !ids.has(a.id)) err(`${cale}.afisat[${i}].id`, `„${a && a.id}” nu există`);
      else if (consumate.has(a.id)) err(`${cale}.afisat[${i}].id`, `„${a.id}” a intrat într-o operație; desenează rezultatul ei`);
      if (a && a.culoare != null && !['principal', 'accent'].includes(a.culoare)) err(`${cale}.afisat[${i}].culoare`, '"principal" sau "accent"');
      if (a && a.culoare === 'accent' && !areAccent) err(`${cale}.afisat[${i}].culoare`, 'accent, dar culori.accent lipsește');
    });
  }
}
