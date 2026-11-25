// Testele motorului de logo (25 nov. 2026): node teste/test-logo-motor.mjs
// 1. aceeași rețetă dă același SVG și același hash, în același proces și într-un proces nou;
// 2. 30 de operații pe forme (unire, scădere, intersecție) comparate pixel cu pixel cu rasterul formelor de pornire (IoU ≥ 0,995);
// 3. „ș”, „ț” și celelalte diacritice în cele 20 de fonturi, iar glifele curățate arată ca glifele fontului (IoU ≥ 0,998);
// 4. rețetele greșite sunt respinse, fiecare cu mesajul ei;
// 5. verificările măsurate trec pe cele trei exemple, iar monograma în care o literă se pierde pică la L1;
// 6. un set de 9 rețete iese în mai puțin de 10 secunde și are forma pe care o citește scriptul SQL 111.
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { FIRME, variante, clona, CALE_BRAND } from './test-logo-fixturi.mjs';

const { valideaza } = await import('../lib/logo/reteta.js');
const { compileaza, svg } = await import('../lib/logo/compileaza.js');
const { verifica, culoriPaleta, numeDinDosar } = await import('../lib/logo/verificari.js');
const { genereazaSet } = await import('../lib/logo/genereaza.js');
const { canvaskit, op, randeaza, binar, suprapunere, cutieLista, transforma } = await import('../lib/logo/ck.js');
const P = await import('../lib/logo/primitive.js');
const { FONTURI, font, aseaza, familie } = await import('../lib/logo/fonturi.js');
const { caleGlifa } = await import('../lib/logo/litere.js');

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };
const CK = await canvaskit();
const hashuri = async (r) => { const c = await compileaza(r); return ['orizontal', 'stivuit', 'semn'].map((k) => (c.forme[k] && c.forme[k].length ? svg(CK, c.forme[k], r.culori, 'color').hash : '-')).join(' '); };

// un proces nou: doar compilează și scrie hashurile (pentru testul 1)
if (process.argv[2] === '--hash') { console.log(await hashuri(FIRME[process.argv[3]].reteta)); process.exit(0); }

// 1. același hash
for (const [k, f] of Object.entries(FIRME)) {
  const a = await hashuri(f.reteta), b = await hashuri(clona(f.reteta)), c = await hashuri(f.reteta);
  t(`1 ${k}: trei compilări, același hash la orizontal, stivuit și semn`, a === b && b === c && !a.startsWith('-'), a.split(' ').map((x) => x.slice(0, 10)).join(' '));
  const d = execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--hash', k], { encoding: 'utf8' }).trim();
  t(`1 ${k}: același hash și într-un proces nou`, d === a);
}

// 2. 30 de operații pe forme, față de raster
const glifa = (fam, g, ch, x, y, s) => { const F = font(fam, g); const gl = aseaza(F, ch).glife[0]; return transforma(CK, caleGlifa(CK, gl.cmds), [s / F.upm, 0, x, 0, -s / F.upm, y, 0, 0, 1]); };
const PERECHI = [
  ['cerc peste dreptunghi (arcada)', () => [P.cerc(CK, 12, 10, 8), P.dreptunghi(CK, 4, 10, 16, 13)]],
  ['două cercuri', () => [P.cerc(CK, 9, 12, 7), P.cerc(CK, 15, 12, 7)]],
  ['două dreptunghiuri rotunjite', () => [P.dreptunghi(CK, 3, 3, 12, 12, 2), P.dreptunghi(CK, 9, 9, 12, 12, 2)]],
  ['elipsă rotită peste cerc', () => [P.elipsa(CK, 12, 12, 10, 5, 30), P.cerc(CK, 12, 12, 6)]],
  ['bară piezișă prin cerc', () => [P.cerc(CK, 12, 12, 8), P.bara(CK, 3, 20, 21, 4, 3, 'rotund')]],
  ['arc peste dreptunghi', () => [P.arc(CK, 12, 12, 8, 3, 0, 270), P.dreptunghi(CK, 10, 2, 4, 20)]],
  ['triunghi peste cerc', () => [P.poligon(CK, { laturi: 3, cx: 12, cy: 13, r: 10 }), P.cerc(CK, 12, 12, 5.5)]],
  ['sfert peste semicerc', () => [P.sfert(CK, 4, 4, 14, 'SE'), P.semicerc(CK, 12, 12, 8, 'N')]],
  ['B peste O (Bitter 700, monograma)', () => [glifa('Bitter', 700, 'B', 2, 20, 22), glifa('Bitter', 700, 'O', 8, 20, 22)]],
  ['bară prin „e” (Manrope 600)', () => [glifa('Manrope', 600, 'e', 4, 20, 26), P.bara(CK, 2, 18, 22, 6, 2)]],
];
for (const [nume, fa] of PERECHI) {
  const [a, b] = fa(); const fer = cutieLista([a, b]); const L = 640;
  const ra = binar(randeaza(CK, [a], fer, L, L, { aa: false })), rb = binar(randeaza(CK, [b], fer, L, L, { aa: false }));
  for (const [cod, f] of [['uneste', (x, y) => x | y], ['scade', (x, y) => x & (y ^ 1)], ['intersecteaza', (x, y) => x & y]]) {
    const ref = new Uint8Array(ra.length); for (let i = 0; i < ref.length; i++) ref[i] = f(ra[i], rb[i]);
    let iou = 0; try { iou = suprapunere(ref, binar(randeaza(CK, [op(CK, a, b, cod)], fer, L, L, { aa: false }))); } catch (e) { iou = 0; }
    t(`2 ${nume}: ${cod}`, iou >= 0.995, `IoU ${iou.toFixed(4)}`);
  }
}

// 3. diacriticele și curățenia glifelor, în cele 20 de fonturi
t('3 lista are 20 de fonturi, toate în manifest', FONTURI.length === 20 && FONTURI.every((f) => familie(f)));
const DIACRITICE = 'ăâîșțĂÂÎȘȚ'; const PROBA = 'abegopsBOQR&8ăâîșțĂÂÎȘȚ';
for (const fam of FONTURI) {
  const gs = [...new Set([400, 700].map((g) => font(fam, g).grosime))];
  let lipsa = '', minIou = 1, celMaiSlab = '';
  for (const g of gs) {
    const F = font(fam, g);
    for (const ch of DIACRITICE) { const gl = F.f.glyphForCodePoint(ch.codePointAt(0)); if (!gl || gl.id === 0 || !gl.path.commands.length) lipsa += ch; }
    // „ș” și „ț” au virgulă dedesubt: glifa coboară sub linia de bază și nu e aceeași cu „s”, respectiv „t”
    for (const [cu, fara] of [['ș', 's'], ['ț', 't']]) { const a = F.f.glyphForCodePoint(cu.codePointAt(0)), b = F.f.glyphForCodePoint(fara.codePointAt(0)); if (a.id === b.id || !(a.bbox.minY < b.bbox.minY - F.upm * 0.05)) lipsa += `(${cu} fără virgulă)`; }
    for (const ch of PROBA) {
      const gl = aseaza(F, ch).glife[0]; if (!gl || !gl.cmds.length) continue;
      const b = new CK.PathBuilder();
      for (const { c, a } of gl.cmds) { if (c === 'moveTo') b.moveTo(a[0], a[1]); else if (c === 'lineTo') b.lineTo(a[0], a[1]); else if (c === 'quadraticCurveTo') b.quadTo(a[0], a[1], a[2], a[3]); else if (c === 'bezierCurveTo') b.cubicTo(a[0], a[1], a[2], a[3], a[4], a[5]); else b.close(); }
      const brut = b.detachAndDelete(); const curat = caleGlifa(CK, gl.cmds); const fer = cutieLista([brut]);
      const iou = suprapunere(binar(randeaza(CK, [brut], fer, 256, 256, { aa: false })), binar(randeaza(CK, [curat], fer, 256, 256, { aa: false })));
      if (iou < minIou) { minIou = iou; celMaiSlab = `${ch} la ${F.grosime}`; }
    }
  }
  t(`3 ${fam}: diacriticele cu virgulă există, glifele curățate sunt cele ale fontului`, !lipsa && minIou >= 0.998, `${lipsa ? 'lipsă ' + lipsa + ' · ' : ''}IoU minim ${minIou.toFixed(4)} (${celMaiSlab})`);
}

// 4. rețetele greșite, fiecare cu mesajul ei
const GRESITE = [
  ['arcada', 'v: 2', (r) => { r.v = 2; }, 'motorul citește v: 1'],
  ['arcada', 'id cu majuscule', (r) => { r.id = 'Arcada'; }, 'litere mici, cifre și cratimă'],
  ['arcada', 'familie necunoscută', (r) => { r.familie = 'emblema'; }, 'nu e una dintre logotip, monograma, semn'],
  ['arcada', 'alt nume decât în Dosar', (r) => { r.nume = 'Salon Liniste'; }, 'nu e identic cu numele din Dosar'],
  ['arcada', '„ş” cu sedilă în nume', (r) => { r.nume = 'Salon Linişte'; }, 'cu virgulă (U+0219, U+021B)'],
  ['arcada', 'culoare din afara paletei', (r) => { r.culori.principal = '#FF00AA'; }, 'nu e în paleta trimisă'],
  ['arcada', 'font din afara listei', (r) => { r.logotip.font = 'Comic Sans MS'; }, 'nu e în lista celor 20'],
  ['arcada', 'grosime în afara axei', (r) => { r.logotip.grosime = 1200; }, 'între 300 și 900'],
  ['arcada', 'fără faptul din Dosar', (r) => { delete r.motiv.fapt; }, 'motiv.fapt.citat'],
  ['arcada', 'motiv de două cuvinte', (r) => { r.motiv.text = 'Arată bine.'; }, '20–300 de caractere'],
  ['arcada', 'element în afara grilei', (r) => { r.semn.elemente[0].x = 40; }, 'între 0 și 24'],
  ['arcada', 'valoare care nu e multiplu de 0,5', (r) => { r.semn.elemente[1].r = 7.3; }, 'multiplu de 0,5'],
  ['arcada', 'operație pe un element care nu există', (r) => { r.semn.operatii[0].elemente = ['zid', 'acoperis']; }, '„acoperis” nu există încă'],
  ['arcada', 'afișat un rezultat care nu există', (r) => { r.semn.afisat[0].id = 'poarta'; }, '„poarta” nu există'],
  ['arcada', 'tip de element necunoscut', (r) => { r.semn.elemente[0].tip = 'stea'; }, 'nu e unul dintre cerc'],
  ['arcada', 'detaliu necunoscut', (r) => { r.logotip.detalii[0].tip = 'umbra'; }, 'nu e una dintre taietura'],
  ['arcada', 'accent fără culoare de accent', (r) => { r.semn.afisat[0].culoare = 'accent'; }, 'culori.accent lipsește'],
  ['arcada', 'spațiere de 900', (r) => { r.logotip.spatiere = 900; }, 'între -50 și 200'],
  ['arcada', 'semnul de două ori mai mare', (r) => { r.combinatie = { marime_semn: 2 }; }, 'între 0,8 și 1,2'],
  ['crestatura', 'litere care nu sunt inițialele', (r) => { r.monograma.litere = 'XZ'; }, 'nu sunt inițialele'],
  ['crestatura', 'tăietură pe o literă care nu e în nume', (r) => { r.logotip.detalii[0].litere = ['W']; }, '„W” nu e în „Brutăria Olaru”'],
  ['crestatura', 'aranjare necunoscută', (r) => { r.monograma.aranjare = 'spirala'; }, '"suprapuse", "lipite", "stivuite" sau "in_forma"'],
  ['ferestre', 'grila cu celule lipsă', (r) => { r.semn.elemente[0].celule = ['p', 'p']; }, '9 coduri'],
  ['ferestre', 'peste 12 elemente', (r) => { for (let i = 0; i < 40; i++) r.semn.elemente.push({ id: 'c' + i, tip: 'cerc', cx: 12, cy: 12, r: 2 }); }, 'cel mult 12'],
  ['ferestre', 'rază negativă', (r) => { r.semn.elemente[1].r = -3; }, 'mai mare ca 0'],
];
const ctxDe = (k) => ({ numeDosar: numeDinDosar(FIRME[k].dosar), paleta: culoriPaleta(FIRME[k].paleta) });
for (const [k, nume, strica, mesaj] of GRESITE) {
  const r = clona(FIRME[k].reteta); strica(r); let v; try { v = valideaza(r, ctxDe(k)); } catch (e) { v = { ok: true, erori: ['excepție: ' + e.message] }; }
  t(`4 respinsă: ${nume}`, v.ok === false && v.erori.some((e) => e.includes(mesaj)), v.ok ? 'a trecut validarea' : v.erori[0].slice(0, 110));
}
t('4 respinsă: ceva ce nu e obiect', valideaza('reteta', {}).ok === false && valideaza(null, {}).ok === false && valideaza([], {}).ok === false);
for (const k of Object.keys(FIRME)) { const v = valideaza(FIRME[k].reteta, ctxDe(k)); t(`4 ${k}: rețeta bună trece validarea`, v.ok && !v.erori.length, (v.erori || []).join('; ')); }

// 5. verificările măsurate
for (const [k, f] of Object.entries(FIRME)) {
  const c = await compileaza(f.reteta); const c2 = await compileaza(f.reteta);
  const x = verifica(c, f.reteta, { paleta: f.paleta, dosar: f.dosar, hash2: svg(c2.CK, c2.forme.orizontal, f.reteta.culori, 'color').hash, comparatii: [] });
  const pic = x.verificari.filter((q) => q.opreste && q.trecut === false);
  t(`5 ${k}: toate verificările care opresc trec`, x.trecut === true && !pic.length, pic.length ? pic.map((q) => `${q.cod}: ${q.motiv}`).join('; ').slice(0, 200) : `${x.verificari.length} verificări`);
  const f1 = x.verificari.find((q) => q.cod === 'F1'); t(`5 ${k}: faptul citat e în Dosar, la calea scrisă (F1)`, !!f1 && f1.trecut === true, f1 ? f1.motiv.slice(0, 90) : 'lipsește F1');
}
{
  const f = FIRME.crestatura; const r = clona(f.reteta); r.monograma.decalaj = 0.28; delete r.monograma.gol;
  const v = valideaza(r, ctxDe('crestatura')); let l1 = null;
  if (v.ok) { const c = await compileaza(r); const x = verifica(c, r, { paleta: f.paleta, dosar: f.dosar, hash2: svg(c.CK, c.forme.orizontal, r.culori, 'color').hash, comparatii: [] }); l1 = x.verificari.find((q) => q.cod === 'L1'); }
  t('5 monograma BO cu literele prea suprapuse (B se citește E) pică la L1', !!l1 && l1.trecut === false && l1.opreste === true, l1 ? l1.motiv : `validarea: ${(v.erori || []).join('; ').slice(0, 120)}`);
  const r2 = clona(f.reteta); r2.motiv.fapt.citat = 'cuptor cu lemne de fag'; const c = await compileaza(r2);
  const x = verifica(c, r2, { paleta: f.paleta, dosar: f.dosar, hash2: svg(c.CK, c.forme.orizontal, r2.culori, 'color').hash, comparatii: [] }); const f1 = x.verificari.find((q) => q.cod === 'F1');
  t('5 un fapt care nu e în Dosar pică la F1', !!f1 && f1.trecut === false);
}

// 6. setul: viteza și forma răspunsului
{
  const f = FIRME.arcada; const t0 = Date.now();
  const s = await genereazaSet({ lead_id: 9900, sarcina_id: 77, set: 2, retete: variante('arcada', 9), paleta: f.paleta, dosar: f.dosar }, { sharp, prefix: '9900/77/set-2/' });
  const ms = Date.now() - t0;
  t('6 un set de 9 rețete iese în mai puțin de 10 secunde', s.ok && ms < 10000, `${ms} ms`);
  t('6 setul are 9 candidați compilați (SQL 111 cere între 3 și 12)', s.candidati.length === 9 && !s.respinse.length, `${s.candidati.length} candidați, ${s.respinse.length} respinse`);
  const c0 = s.candidati[0];
  t('6 fiecare candidat are id, familie, rețeta, hash, amprentă, verificări și fișiere', s.candidati.every((c) => /^[a-z0-9-]{1,24}$/.test(c.id) && c.familie && c.reteta && c.reteta.id === c.id && /^[0-9a-f]{64}$/.test(c.hash) && Buffer.from(c.amprenta, 'base64').length === 512 && Array.isArray(c.verificari) && typeof c.trecut === 'boolean'), Object.keys(c0).join(', '));
  t('6 fișierele candidatului sunt în folderul setului: orizontal_svg și plansa_png', s.candidati.every((c) => ['orizontal_svg', 'stivuit_svg', 'semn_svg', 'reteta_json', 'plansa_png'].every((k) => typeof c.fisiere[k] === 'string' && c.fisiere[k].startsWith(`9900/77/set-2/${c.id}/`) && CALE_BRAND.test(c.fisiere[k]))), c0.fisiere.plansa_png);
  t('6 faptul vine cu „gasit”, iar planșa setului și raportul au calea lor', c0.fapt.gasit === true && s.plansa_set_png === '9900/77/set-2/set.png' && s.raport_json === '9900/77/set-2/raport.json');
  t('6 toate căile trec regula din SQL 111 (logo_cale)', s.fisiere.every((x) => CALE_BRAND.test(x.cale)), `${s.fisiere.length} fișiere`);
  const pl = await sharp(s.fisiere.find((x) => x.cale.endsWith('/arcada/plansa.png')).date).metadata(); const ps = await sharp(s.fisiere.find((x) => x.cale.endsWith('set.png')).date).metadata();
  t('6 planșa candidatului și planșa setului se deschid ca PNG', pl.format === 'png' && pl.width >= 1200 && ps.format === 'png' && ps.width >= 1200, `${pl.width} × ${pl.height}, ${ps.width} × ${ps.height}`);
  const a2 = s.candidati.slice(1).filter((c) => c.verificari.some((q) => q.cod === 'A2')).length;
  t('6 variantele aproape identice sunt semnalate ca asemănătoare (A2, semnal)', a2 >= 1, `${a2} din 8`);
  const d = await genereazaSet({ lead_id: 9900, sarcina_id: 77, retete: [f.reteta, clona(f.reteta), FIRME.crestatura.reteta], paleta: f.paleta, dosar: f.dosar }, { sharp, prefix: '9900/77/set-1/' });
  t('6 id-ul dublat și rețeta altei firme ajung la „respinse”, cu motivul', d.candidati.length === 0 && d.respinse.length === 3 && d.respinse.some((x) => x.erori.some((e) => e.includes('apare de două ori'))) && d.respinse.some((x) => x.erori.some((e) => e.includes('nu e identic cu numele din Dosar'))), `${d.respinse.length} respinse`);
}

console.log(`\n${n - picate} din ${n} trec`);
process.exit(picate ? 1 : 0);
