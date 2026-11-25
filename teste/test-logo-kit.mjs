// Testele kitului de logo (25 nov. 2026): node teste/test-logo-kit.mjs
// 1. kitul celor trei exemple: fiecare fișier se redeschide (PNG și SVG cu sharp, PDF cu pdf-lib, ICO citit din antet), ZIP-ul trece
//    „unzip -t”, numele și tipurile sunt cele pe care le primește bucketul „brand” (SQL 110) și le caută SQL 111;
// 2. imaginea mărcii respectă limitele OSIM; 3. corecturile din listă; 4. logoul pe care clientul îl păstrează; 5. memoria.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';
import zlib from 'zlib';
import { PDFDocument, PDFArray } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { FIRME, SVG_EXISTENT, clona, CALE_BRAND } from './test-logo-fixturi.mjs';

const { genereazaKit, aplicaCorecturi, formeDinSvg, MARIMI_SEMN, LATIMI_COMBINATII } = await import('../lib/logo/kit.js');
const { canvaskit, canvaskitProaspat, memorieMB } = await import('../lib/logo/ck.js');

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };
const octeti = (f) => (Buffer.isBuffer(f.date) ? f.date : Buffer.from(String(f.date), 'utf8'));
// tipurile pe care le primește bucketul „brand” (110-logo-bucketul-brand-si-registrul.sql)
const TIPURI_BUCKET = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon', 'application/pdf', 'application/zip', 'application/json', 'text/plain'];
const unzipT = (buf, nume) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'alesign-kit-')); const f = path.join(d, nume); fs.writeFileSync(f, buf); try { return execFileSync('unzip', ['-t', f], { encoding: 'utf8' }); } catch (e) { return `EROARE ${e.message}`; } finally { fs.rmSync(d, { recursive: true, force: true }); } };

// 1. kitul celor trei exemple
const kituri = {};
for (const [k, f] of Object.entries(FIRME)) {
  const prefix = `${f.lead_id}/5/final/`; const t0 = Date.now();
  const kit = await genereazaKit({ lead_id: f.lead_id, sarcina_id: 5, reteta: f.reteta, paleta: f.paleta, dosar: f.dosar, osim: { titlu: 'Reprezentarea mărcii', paragrafe: ['Marca e alcătuită din numele firmei, scris cu litere desenate, și dintr-un semn.'] } }, { sharp, prefix });
  const ms = Date.now() - t0; kituri[k] = kit;
  t(`1 ${k}: kitul iese, în mai puțin de 10 secunde`, kit.ok === true && ms < 10000, kit.ok ? `${ms} ms, ${kit.fisiere.length} fișiere` : `${kit.motiv}: ${(kit.erori || []).join('; ')}`);
  if (!kit.ok) continue;
  const F = kit.fisiere; const cale = (s) => F.find((x) => x.cale === prefix + s);
  t(`1 ${k}: toate căile sunt în ${prefix} și trec regula din SQL 111`, F.every((x) => x.cale.startsWith(prefix) && CALE_BRAND.test(x.cale)));
  t(`1 ${k}: toate tipurile sunt primite de bucketul „brand”`, F.every((x) => TIPURI_BUCKET.includes(x.tip)), [...new Set(F.map((x) => x.tip))].filter((x) => !TIPURI_BUCKET.includes(x)).join(', '));
  t(`1 ${k}: fișierele pe care le caută SQL 111 există`, ['svg/orizontal-color.svg', 'svg/stivuit-color.svg', 'svg/semn-color.svg', 'web/favicon.svg', 'web/favicon.ico', 'ghid-logo.pdf', 'osim/marca.jpg', 'CITESTE.txt'].every(cale) && kit.zip === `${prefix}logo-${kit.zip.split('logo-')[1]}` && kit.ghid_pdf === prefix + 'ghid-logo.pdf' && kit.osim_jpg === prefix + 'osim/marca.jpg' && F.length >= 9, kit.zip);
  // SVG: doar forme pline
  const svgs = F.filter((x) => x.cale.endsWith('.svg')); let svgRau = '';
  for (const x of svgs) { const s = String(x.date); if (/<text|<image|stroke=|evenodd|<linearGradient|<filter|<mask|<use/i.test(s) || !/^<svg[^>]+viewBox=/.test(s)) svgRau += x.cale + ' '; const m = await sharp(Buffer.from(s)).metadata(); if (m.format !== 'svg' || !m.width) svgRau += `(${x.cale} nu se deschide) `; }
  t(`1 ${k}: ${svgs.length} SVG-uri, doar forme pline (fără text, contur, imagini, evenodd), toate se deschid`, svgs.length === 10 && !svgRau, svgRau);
  // PNG: mărimea din nume, transparență
  const pngs = F.filter((x) => x.cale.endsWith('.png')); let pngRau = '';
  for (const x of pngs) { const m = await sharp(octeti(x)).metadata(); const nr = Number((x.cale.match(/-(\d+)\.png$/) || [])[1]); if (m.format !== 'png') pngRau += x.cale + ' '; if (nr && m.width !== nr) pngRau += `${x.cale} are ${m.width} px `; if (x.cale.includes('/png/') && !m.hasAlpha) pngRau += `${x.cale} fără transparență `; }
  const asteptate = 3 * MARIMI_SEMN.length + 2 * 3 * LATIMI_COMBINATII.length + 2;
  t(`1 ${k}: ${pngs.length} PNG-uri la mărimea din nume, cele din png/ pe fundal transparent`, pngs.length === asteptate && !pngRau, pngRau || `${asteptate} așteptate`);
  const ap = await sharp(octeti(cale('web/apple-touch-icon.png'))).metadata(), av = await sharp(octeti(cale('web/avatar.png'))).metadata();
  t(`1 ${k}: iconița de telefon are 180 px, poza de profil 1.024 px, amândouă fără transparență`, ap.width === 180 && ap.height === 180 && av.width === 1024 && !ap.hasAlpha && !av.hasAlpha);
  // PDF
  const pdfs = F.filter((x) => x.cale.endsWith('.pdf')); let pdfRau = ''; let paginiGhid = 0;
  for (const x of pdfs) { try { const d = await PDFDocument.load(octeti(x)); if (d.getPageCount() < 1) pdfRau += x.cale + ' '; if (x.cale.endsWith('ghid-logo.pdf')) paginiGhid = d.getPageCount(); } catch (e) { pdfRau += `${x.cale}: ${e.message} `; } }
  t(`1 ${k}: ${pdfs.length} PDF-uri se redeschid cu pdf-lib; ghidul logoului are 2 pagini`, pdfs.length === 11 && !pdfRau && paginiGhid === 2, pdfRau);
  // ICO: antetul și cele trei imagini
  const ico = octeti(cale('web/favicon.ico')); const nrI = ico.readUInt16LE(4); let icoOk = ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1 && nrI === 3; const mar = [];
  for (let i = 0; i < nrI && icoOk; i++) { const o = 6 + 16 * i; const len = ico.readUInt32LE(o + 8), off = ico.readUInt32LE(o + 12); const m = await sharp(ico.subarray(off, off + len)).metadata(); mar.push(m.width); icoOk = m.format === 'png' && m.width === ico[o] && off + len <= ico.length; }
  t(`1 ${k}: favicon.ico are trei imagini (16, 32, 48 px), fiecare se deschide`, icoOk && mar.join() === '16,32,48', mar.join(', '));
  // ZIP
  const zf = F.find((x) => x.cale === kit.zip); const rad = kit.zip.split('/').pop().replace('.zip', ''); const ut = unzipT(octeti(zf), 'kit.zip');
  const inZip = Object.keys(unzipSync(new Uint8Array(octeti(zf)))); const restul = F.filter((x) => x !== zf).map((x) => `${rad}/${x.cale.slice(prefix.length)}`);
  t(`1 ${k}: ZIP-ul trece „unzip -t” și are exact fișierele kitului, într-un folder cu numele firmei`, /No errors detected/.test(ut) && inZip.length === restul.length && restul.every((x) => inZip.includes(x)), `${inZip.length} fișiere în ${rad}/`);
  const cit = octeti(cale('CITESTE.txt')).toString('utf8');
  t(`1 ${k}: CITESTE.txt începe cu BOM (diacriticele se văd în Notepad) și nu promite depunerea la OSIM`, cit.charCodeAt(0) === 0xFEFF && cit.includes('cererea ta de înregistrare la OSIM') && !/desenat de mine|depunem|înregistrăm noi/i.test(cit));
  t(`1 ${k}: mărimea minimă e măsurată (mm la tipar, px pe ecran)`, kit.minim && kit.minim.mm >= 6 && kit.minim.px >= 12 && kit.minim.px <= 64, JSON.stringify(kit.minim));
  t(`1 ${k}: verificările vin cu cod, trecut și motiv, iar cele care opresc trec`, kit.verificari.length >= 10 && kit.verificari.every((v) => v.cod && typeof v.motiv === 'string') && !kit.verificari.some((v) => v.opreste && v.trecut === false));
}

// 2. imaginea mărcii pentru OSIM (limitele din nota lui S2: JPEG, cel mult 2 MB, între 800 × 600 și 2008 × 2835 px, nume de cel mult 25 de caractere)
for (const [k, kit] of Object.entries(kituri)) {
  if (!kit.ok) continue; const f = kit.fisiere.find((x) => x.cale === kit.osim_jpg); const b = octeti(f); const m = await sharp(b).metadata(); const st = await sharp(b).stats();
  const colt = await sharp(b).extract({ left: 0, top: 0, width: 8, height: 8 }).raw().toBuffer();
  t(`2 ${k}: marca.jpg e JPEG, 945 × 945 px la 300 dpi (8 × 8 cm), sub 2 MB, pe alb`, m.format === 'jpeg' && m.width === 945 && m.height === 945 && m.density === 300 && b.length < 2 * 1048576 && m.width >= 800 && m.height >= 600 && m.width <= 2008 && m.height <= 2835 && path.basename(f.cale).length <= 25 && colt.every((v) => v >= 250) && st.channels.length === 3, `${Math.round(b.length / 1024)} KB, combinația ${kit.osim_combinatie}`);
}
{
  const f = FIRME.arcada; const k = await genereazaKit({ lead_id: 9900, sarcina_id: 5, reteta: f.reteta, paleta: f.paleta, dosar: f.dosar, osim: { nume: 'Salon Liniște', clase: [44], depunere: null } }, { sharp, prefix: '9900/5/final/' });
  t('2 „osim” în forma din SQL 111 (fără titlu și paragrafe): kitul iese, cu marca.jpg și fără pagina OSIM', k.ok && !!k.osim_jpg && k.osim_pdf === null);
  const k2 = await genereazaKit({ lead_id: 9900, sarcina_id: 5, reteta: f.reteta, paleta: f.paleta, dosar: f.dosar, osim: { titlu: 'Reprezentarea mărcii', paragrafe: ['Un paragraf de la S2.'], varianta: 'orizontal' } }, { sharp, prefix: '9900/5/final/' });
  const pg = k2.ok && k2.osim_pdf ? (await PDFDocument.load(octeti(k2.fisiere.find((x) => x.cale === k2.osim_pdf)))).getPageCount() : 0;
  t('2 cu titlu și paragrafe, pagina OSIM are o pagină, iar „varianta” alege combinația', pg === 1 && k2.osim_combinatie === 'orizontal');
  // 45 de paragrafe, cum le face nodul „Pregătire” al lui S2 (textOsim): titluri de secțiune cu „:”, clasele, taxele, 12 pași, ce urmează
  const par = ['Aici ai tot ce îți trebuie ca să înregistrezi logoul ca marcă la OSIM. Depui tu, în numele firmei, din aplicația OSIM.', 'Ce depui: marca figurativă „Salon Liniște”, color. Fișierul e marca.jpg, din folderul osim. Culorile pe care le treci în cerere: #2F3A33 și #B8925A.', 'Clasele și termenii pe care îi treci la „Bunuri și servicii”:'];
  for (let i = 0; i < 6; i++) par.push(`Clasa ${40 + i}. Pentru serviciile pe care le faci în salon, de la tuns la vopsit și tratamente. Termenii: servicii de coafură; servicii de manichiură; servicii de saloane de înfrumusețare. Caută fiecare termen în nomenclatorul aplicației OSIM și păstrează-i doar pe cei pe care îi găsești acolo.`);
  par.push('Cât plătești la OSIM, în 2026: depunere online, o clasă: 190 de lei la depunere, 254 de lei examinarea și 254 de lei certificatul, în total 698 de lei. Taxele le plătești direct la OSIM.');
  par.push('Unde cauți numele înainte să plătești:'); for (let i = 0; i < 4; i++) par.push(`Baza ${i + 1} (https://www.tmdn.org/tmview/#/tmview/results?page=1&criteria=C&basicSearch=salon-liniste-${i}): cauți numele și semnele asemănătoare.`);
  par.push('Pașii, în aplicația OSIM (https://osim.ro):'); for (let i = 1; i <= 12; i++) par.push(`${i}. Pasul ${i}: completezi câmpul cerut în formular, verifici ce ai scris și treci mai departe.`);
  par.push('Ce urmează după depunere:'); while (par.length < 44) par.push('OSIM publică cererea, iar în trei luni oricine poate face opoziție. Dacă nu vine nicio opoziție, primești certificatul.');
  par.push('Taxele și pașii sunt cei de pe osim.ro la 20 noiembrie 2026. Verifică-i din nou în ziua în care depui.');
  const k3 = await genereazaKit({ lead_id: 9900, sarcina_id: 5, reteta: f.reteta, paleta: f.paleta, dosar: f.dosar, osim: { titlu: 'Dosarul pentru OSIM: marca „Salon Liniște”', paragrafe: par } }, { sharp, prefix: '9900/5/final/' });
  const pdf = k3.ok && k3.osim_pdf ? octeti(k3.fisiere.find((x) => x.cale === k3.osim_pdf)) : null;
  const doc = pdf ? await PDFDocument.load(pdf) : null;
  // ce s-a scris pe fiecare pagină: fiecare rând de text (font, mărime, y) și locul imaginii, din fluxul de conținut al paginii
  const flux = (pgx) => { const c = pgx.node.Contents(); const s = c instanceof PDFArray ? c.asArray().map((r) => doc.context.lookup(r)) : [c]; return s.map((x) => { const b = Buffer.from(x.contents); try { return zlib.inflateSync(b).toString('latin1'); } catch (e) { return b.toString('latin1'); } }).join('\n'); };
  const pagini = doc ? doc.getPages().map((pgx) => { const txt = flux(pgx); const randuri = [...txt.matchAll(/\/(\S+) ([\d.]+) Tf[\s\S]*?1 0 0 1 [\d.]+ ([\d.-]+) Tm/g)].map((m) => ({ font: m[1], z: +m[2], y: +m[3] })); const im = [...txt.matchAll(/1 0 0 1 [\d.]+ ([\d.-]+) cm[\s\S]*?\/\S+ Do/g)].map((m) => +m[1]); return { randuri, im }; }) : [];
  const corp = pagini.flatMap((q) => q.randuri.filter((r) => r.z !== 8.5)); const subsol = pagini.flatMap((q) => q.randuri.filter((r) => r.z === 8.5));
  const H = 841.89;
  t('2 dosarul OSIM cu 45 de paragrafe curge pe mai multe pagini, fiecare cu numărul ei', pagini.length >= 2 && subsol.length === pagini.length, `${pagini.length} pagini`);
  t('2 niciun rând nu iese din pagină sau nu calcă pe subsol', corp.length >= par.length + 1 && corp.every((r) => r.y >= 70 && r.y <= H - 56) && subsol.every((r) => Math.abs(r.y - 30) < 0.01), `${corp.length} rânduri, cel mai jos la ${Math.min(...corp.map((r) => r.y)).toFixed(1)}`);
  const ult = pagini[pagini.length - 1] || { randuri: [], im: [] }; const etUlt = ult.randuri.filter((r) => r.z !== 8.5).pop();
  t('2 un titlu de secțiune nu rămâne singur jos pe pagină; marca e pe ultima pagină, întreagă, cu eticheta deasupra', pagini.slice(0, -1).every((q) => { const c = q.randuri.filter((r) => r.z !== 8.5); return c.length && !/Bold/i.test(c[c.length - 1].font); }) && ult.im.length === 1 && ult.im[0] >= 56 && pagini.slice(0, -1).every((q) => !q.im.length) && !!etUlt && /Bold/i.test(etUlt.font) && etUlt.y > ult.im[0] + 226);
}

// 3. corecturile din listă (setarea logo_corecturi, SQL 110): le aplică codul
{
  const f = FIRME.ferestre;
  const a = aplicaCorecturi(f.reteta, { grosime: 1, spatiere: -1, marime_semn: 1, majuscule: true }, f.paleta);
  t('3 grosimea, spațierea, mărimea semnului și majusculele se aplică pe rețetă', !a.erori.length && a.aplicate.length === 4 && a.reteta.logotip.grosime === 700 && a.reteta.logotip.spatiere === 0 && a.reteta.combinatie.marime_semn === 1.1 && a.reteta.logotip.majuscule === true, a.aplicate.join(' · '));
  t('3 rețeta de pornire rămâne neschimbată', f.reteta.logotip.grosime === 600 && !f.reteta.combinatie);
  const z = aplicaCorecturi(f.reteta, { grosime: 0, culoare: 'principal', fara_semn: false, majuscule: null }, f.paleta);
  t('3 valorile „nimic de schimbat” (0, principal, false, null) nu schimbă nimic', !z.erori.length && !z.aplicate.length && JSON.stringify(z.reteta) === JSON.stringify(f.reteta));
  const g = aplicaCorecturi(f.reteta, { grosime: 5, culoare: '#123456', spatiere: 'mare' }, f.paleta);
  t('3 valorile din afara listei sunt respinse, fiecare cu mesajul ei', g.erori.length === 3 && g.erori.some((e) => e.includes('corecturi.grosime')) && g.erori.some((e) => e.includes('corecturi.culoare')) && g.erori.some((e) => e.includes('corecturi.spatiere')), g.erori.join(' | ').slice(0, 160));
  const k = await genereazaKit({ lead_id: 9902, sarcina_id: 5, reteta: f.reteta, corecturi: { grosime: 1, fara_semn: true }, paleta: f.paleta, dosar: f.dosar }, { sharp, prefix: '9902/5/final/' });
  const k0 = kituri.ferestre; const h = (kk, s) => String(kk.fisiere.find((x) => x.cale.endsWith(s)).date);
  t('3 kitul cu corecturi: rețeta finală e cea corectată, iar logoul orizontal e altul', k.ok && k.reteta_finala.logotip.grosime === 700 && k.reteta_finala.combinatie.fara_semn === true && k.aplicate.length === 2 && h(k, 'svg/orizontal-color.svg') !== h(k0, 'svg/orizontal-color.svg'), (k.aplicate || []).join(' · '));
  const fb = FIRME.crestatura; const c1 = await genereazaKit({ lead_id: 9901, sarcina_id: 5, reteta: fb.reteta, corecturi: { culoare: 'accent' }, paleta: fb.paleta, dosar: fb.dosar }, { sharp, prefix: '9901/5/final/' });
  t('3 o corectură care strică contrastul (accentul ca principală) oprește kitul, cu verificarea C1 și rețeta încercată', c1.ok === false && c1.erori.some((e) => e.startsWith('C1')) && !!c1.reteta_finala && Array.isArray(c1.verificari), (c1.erori || []).join(' | ').slice(0, 160));
  const fa = FIRME.arcada; const c2 = await genereazaKit({ lead_id: 9900, sarcina_id: 5, reteta: fa.reteta, corecturi: { culoare: 'accent' }, paleta: fa.paleta, dosar: fa.dosar }, { sharp, prefix: '9900/5/final/' });
  t('3 „accent” pe un logo fără culoare de accent e respins cu motivul', c2.ok === false && c2.erori.some((e) => e.includes('n-are culoare de accent')));
}

// 4. logoul pe care clientul îl păstrează
{
  const dosar = { identitate: { firma: 'Instal Frig Oltenia' } }; const paleta = { fundal: '#FFFFFF', text: '#1F4E5A', baza: '#1F4E5A', accent: '#E3A23B' };
  const k = await genereazaKit({ lead_id: 9001, sarcina_id: 6, logo_existent: { svg: SVG_EXISTENT }, paleta, dosar }, { sharp, prefix: '9001/6/final/', svgExistent: SVG_EXISTENT });
  const b1 = k.ok && k.verificari.find((v) => v.cod === 'B1');
  t('4 SVG-ul din Illustrator (clase, grupuri, alb ca gol) se reface exact: B1 ≥ 0,995', k.ok && k.existent === true && b1 && b1.trecut && b1.valoare >= 0.995, k.ok ? `B1 ${b1.valoare}, ${k.fisiere.length} fișiere` : `${k.motiv}: ${(k.erori || []).join('; ')}`);
  t('4 fără semn separat: kitul are logoul orizontal, faviconul din logo și o notă care cere semnul', k.ok && k.combinatii.join() === 'orizontal' && k.fisiere.some((x) => x.cale.endsWith('web/favicon.ico')) && k.note.some((x) => x.includes('semn_svg')) && k.reteta_finala === null);
  t('4 căile și tipurile sunt bune și la logoul păstrat', k.ok && k.fisiere.every((x) => CALE_BRAND.test(x.cale) && TIPURI_BUCKET.includes(x.tip)) && /No errors detected/.test(unzipT(octeti(k.fisiere.find((x) => x.cale === k.zip)), 'e.zip')));
  const semn = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#1F4E5A"/><rect x="40" y="44" width="20" height="12" rx="4" fill="#E3A23B"/></svg>';
  const ks = await genereazaKit({ lead_id: 9001, sarcina_id: 6, logo_existent: { svg: SVG_EXISTENT }, paleta, dosar }, { sharp, prefix: '9001/6/final/', svgExistent: SVG_EXISTENT, svgSemnExistent: semn });
  t('4 cu semnul trimis separat, kitul are și fișierele „semn”', ks.ok && ks.combinatii.join() === 'orizontal,semn' && ks.fisiere.some((x) => x.cale.endsWith('svg/semn-color.svg')), ks.ok ? `${ks.fisiere.length} fișiere` : ks.motiv);
  const CK = await canvaskit();
  const RELE = [
    ['text netransformat în curbe', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><text x="0" y="40" font-family="Arial">Instal Frig</text></svg>', 'text'],
    ['o poză lipită în SVG', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><image href="data:image/png;base64,AAAA" width="200" height="60"/></svg>', 'imagine'],
    ['degrade', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><defs><linearGradient id="g"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect width="200" height="60" fill="url(#g)"/></svg>', 'degrade'],
    ['contur în loc de formă plină', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><path d="M10 10 L190 50" stroke="#000" stroke-width="4" fill="none"/></svg>', 'contur'],
    ['transparență', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><rect width="200" height="60" fill="#1F4E5A" opacity="0.5"/></svg>', 'transparen'],
    ['ceva ce nu e SVG', 'acesta e un PDF, nu un SVG', 'svg'],
  ];
  for (const [nume, text, cuvant] of RELE) { const L = formeDinSvg(CK, text); t(`4 respins: ${nume}`, L.erori.length > 0 && L.erori.join(' ').toLowerCase().includes(cuvant), (L.erori[0] || 'a trecut').slice(0, 120)); }
  const kr = await genereazaKit({ lead_id: 9001, sarcina_id: 6, logo_existent: { svg: RELE[0][1] }, paleta, dosar }, { sharp, prefix: '9001/6/final/', svgExistent: RELE[0][1] });
  t('4 kitul dintr-un SVG cu text întoarce „ok: false” și spune ce are de făcut clientul', kr.ok === false && kr.erori.length > 0 && /curbe|contururi|outline/i.test(kr.erori.join(' ')), (kr.erori || []).join(' ').slice(0, 140));
}

// 5. memoria WebAssembly rămâne mică de la un kit la altul, iar instanța se schimbă curat peste prag
{
  const f = FIRME.arcada; const m0 = memorieMB();
  const a = await genereazaKit({ lead_id: 9900, sarcina_id: 5, reteta: f.reteta, paleta: f.paleta, dosar: f.dosar }, { sharp, prefix: 'x/' });
  const b = await genereazaKit({ lead_id: 9900, sarcina_id: 5, reteta: f.reteta, paleta: f.paleta, dosar: f.dosar }, { sharp, prefix: 'x/' });
  t('5 două kituri la rând nu umflă memoria motorului (sub 20 MB în plus)', memorieMB() - m0 < 20, `${m0} → ${memorieMB()} MB`);
  const CK1 = await canvaskit(); const c = await genereazaKit({ lead_id: 9900, sarcina_id: 5, reteta: f.reteta, paleta: f.paleta, dosar: f.dosar }, { sharp, prefix: 'x/', pragMemorieMB: 1 }); const CK2 = await canvaskit();
  const h = (k) => String(k.fisiere.find((x) => x.cale.endsWith('svg/orizontal-color.svg')).date);
  t('5 peste prag motorul pornește o instanță nouă, iar logoul iese identic', CK1 !== CK2 && h(a) === h(b) && h(b) === h(c));
  await canvaskitProaspat();
}

console.log(`\n${n - picate} din ${n} trec`);
process.exit(picate ? 1 : 0);
