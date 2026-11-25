// Testele brand kitului (25 nov. 2026): node teste/test-brand-kit.mjs
// 1. kitul celor trei firme de probă: ghidul are 6–8 pagini și se redeschide, pozele sunt doar pentru canalele din Dosar, la mărimea
//    canalului, ZIP-ul trece „unzip -t” și are fonturile cu licența lor; 2. canalele citite din Dosar; 3. aplicările amânate;
// 4. verificările care opresc (K1, K2, K4, T1) și verdictul de contrast măsurat; 5. textele fixe trec detectorul de tipare de robot
//    (doar dacă îi dai calea: TIPARE_ROBOT=/cale/catre/tipare-robot.js node teste/test-brand-kit.mjs).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { FIRME, clona, CALE_BRAND } from './test-logo-fixturi.mjs';

const { genereazaKit, TEXTE_GHID, CITESTE_CLIENT } = await import('../lib/logo/kit.js');
const { genereazaBrandKit, canaleFolosite, verdictContrast, CANALE, APLICATII, TEXTE_BRAND, CITESTE_BRAND } = await import('../lib/brand/kit.js');

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };
const octeti = (f) => (Buffer.isBuffer(f.date) ? f.date : Buffer.from(String(f.date), 'utf8'));
const unzipT = (buf) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'alesign-brand-')); const f = path.join(d, 'b.zip'); fs.writeFileSync(f, buf); try { return execFileSync('unzip', ['-t', f], { encoding: 'utf8' }); } catch (e) { return `EROARE ${e.message}`; } finally { fs.rmSync(d, { recursive: true, force: true }); } };

// logoul final al fiecărei firme, din kitul logoului (ca în producție: brand kitul îl citește din bucket)
const logo = {};
for (const [k, f] of Object.entries(FIRME)) {
  const kit = await genereazaKit({ lead_id: f.lead_id, sarcina_id: 5, reteta: f.reteta, paleta: f.paleta, dosar: f.dosar }, { sharp, prefix: '' });
  if (!kit.ok) throw new Error(`kitul logoului ${k}: ${kit.motiv}`);
  logo[k] = { orizontal: String(kit.fisiere.find((x) => x.cale === 'svg/orizontal-color.svg').date), semn: String(kit.fisiere.find((x) => x.cale === 'svg/semn-color.svg').date) };
}
const cerere = (k, extra = {}) => { const f = FIRME[k]; return { lead_id: f.lead_id, sarcina_id: 7, nume: f.reteta.nume, identitate: clona(f.identitate), paleta: f.identitate.jetoane.culori, dosar: clona(f.dosar), canale: f.canale, data: '2026-11-27T20:00:00+02:00', ...extra }; };
const fa = (k, extra, opt = {}) => genereazaBrandKit(cerere(k, extra), { sharp, prefix: `${FIRME[k].lead_id}/7/kit/`, logo: logo[k], ...opt });

// 1. kitul celor trei firme
const ASTEPTAT = { arcada: ['instagram-poza-profil'], crestatura: ['facebook-poza-profil', 'facebook-coperta', 'google-poza-profil', 'google-coperta'], ferestre: [] };
for (const k of Object.keys(FIRME)) {
  const prefix = `${FIRME[k].lead_id}/7/kit/`; const t0 = Date.now(); const b = await fa(k); const ms = Date.now() - t0;
  t(`1 ${k}: brand kitul iese, în mai puțin de 10 secunde`, b.ok === true && ms < 10000, b.ok ? `${ms} ms, ${b.fisiere.length} fișiere urcate, ${b.in_zip.length} în ZIP` : `${b.motiv}: ${(b.erori || []).join('; ')}`);
  if (!b.ok) continue;
  const F = b.fisiere; const cale = (s) => F.find((x) => x.cale === prefix + s);
  t(`1 ${k}: toate căile sunt în ${prefix}, trec regula din SQL 111 și au tipuri primite de bucket`, F.every((x) => x.cale.startsWith(prefix) && CALE_BRAND.test(x.cale) && ['image/png', 'application/pdf', 'application/zip', 'text/plain'].includes(x.tip)) && b.zip.startsWith(prefix) && b.ghid_pdf === prefix + 'ghid-brand.pdf');
  const pdf = await PDFDocument.load(octeti(cale('ghid-brand.pdf')));
  t(`1 ${k}: ghidul se redeschide cu pdf-lib și are între 6 și 8 pagini`, pdf.getPageCount() >= 6 && pdf.getPageCount() <= 8 && pdf.getPageCount() === b.pagini && pdf.getTitle().includes(FIRME[k].reteta.nume), `${pdf.getPageCount()} pagini, ${Math.round(octeti(cale('ghid-brand.pdf')).length / 1024)} KB`);
  const poze = F.filter((x) => x.cale.includes('/retele/')).map((x) => path.basename(x.cale, '.png'));
  t(`1 ${k}: pozele sunt doar pentru canalele din Dosar`, poze.length === ASTEPTAT[k].length && ASTEPTAT[k].every((x) => poze.includes(x)), poze.join(', ') || 'nicio poză (firma n-are rețele în Dosar)');
  let rau = '';
  for (const z of b.poze) { const m = await sharp(octeti(F.find((x) => x.cale === z.cale))).metadata(); const def = CANALE[z.canal]; const [w, h] = z.ce === 'coperta' ? [def.coperta.w, def.coperta.h] : [def.avatar, def.avatar]; if (m.format !== 'png' || m.width !== w || m.height !== h || m.hasAlpha) rau += `${z.cale} ${m.width}×${m.height} `; }
  t(`1 ${k}: fiecare poză are mărimea canalului ei și n-are transparență`, !rau, rau);
  // logoul stă în zona pe care rețeaua n-o taie: colțurile pozei de profil și marginile copertei au doar culoarea de fundal
  let taiat = '';
  for (const z of b.poze) {
    const img = sharp(octeti(F.find((x) => x.cale === z.cale))); const { data, info } = await img.raw().toBuffer({ resolveWithObject: true }); const px = (x, y) => { const i = (y * info.width + x) * info.channels; return `${data[i]},${data[i + 1]},${data[i + 2]}`; };
    const fundal = px(2, 2); const W = info.width, H = info.height; let alt = 0;
    if (z.ce === 'poza_profil') { const R = W / 2; for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) if (Math.hypot(x - R, y - R) > R * 0.86 && px(x, y) !== fundal) alt++; }
    else { const mx = Math.round(W * 0.15), my = Math.round(H * 0.12); for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) if ((x < mx || x > W - mx || y < my || y > H - my) && px(x, y) !== fundal) alt++; }
    if (alt) taiat += `${z.cale}: ${alt} puncte în afara zonei `;
  }
  t(`1 ${k}: logoul încape în cercul pozei de profil și în mijlocul copertei`, !taiat, taiat);
  const zf = F.find((x) => x.cale === b.zip); const rad = path.basename(b.zip, '.zip'); const inZip = Object.keys(unzipSync(new Uint8Array(octeti(zf))));
  t(`1 ${k}: ZIP-ul trece „unzip -t” și are tot ce scrie în „in_zip”`, /No errors detected/.test(unzipT(octeti(zf))) && inZip.length === b.in_zip.length && b.in_zip.every((x) => inZip.includes(`${rad}/${x}`)), `${inZip.length} fișiere în ${rad}/`);
  const fam = [...new Set([b.fonturi.titluri, b.fonturi.text])];
  const dirs = [...new Set(inZip.filter((x) => x.includes('/fonturi/')).map((x) => x.split('/')[2]))];
  t(`1 ${k}: în ZIP, fiecare font vine cu fișierul lui și cu licența OFL`, dirs.length === fam.length && dirs.every((d) => inZip.some((x) => x.includes(`/fonturi/${d}/`) && x.endsWith('.ttf')) && inZip.includes(`${rad}/fonturi/${d}/OFL.txt`)) && inZip.every((x) => /^[\x20-\x7E]+$/.test(x)), `${fam.join(', ')} → ${dirs.join(', ')}`);
  const culori = octeti(cale('culori.txt')).toString('utf8'); const cit = octeti(cale('CITESTE.txt')).toString('utf8');
  t(`1 ${k}: culori.txt are fiecare cod din jetoane, iar fișierele text încep cu BOM`, ['fundal', 'text', 'baza', 'accent'].every((r) => culori.includes(FIRME[k].identitate.jetoane.culori[r].toUpperCase())) && culori.charCodeAt(0) === 0xFEFF && cit.charCodeAt(0) === 0xFEFF);
  t(`1 ${k}: verificările K1, K2, K4, C1, G2 și T1 trec`, ['K1', 'K2', 'K4', 'C1', 'G2', 'T1'].every((c) => b.verificari.some((v) => v.cod === c && v.trecut === true)), b.verificari.map((v) => `${v.cod} ${v.valoare}`).join(' · '));
}

// 2. canalele, din Dosar
{
  const c = (canale, id) => canaleFolosite(canale, { identitate: id }).canale.filter((x) => x.folosit).map((x) => x.canal).join(',');
  t('2 lista din Dosar: „instagram”, „gbp”, „Facebook”, „tik tok” ajung la canalele motorului', c(['instagram', 'gbp', 'Facebook', 'tik tok'], {}) === 'instagram,facebook,tiktok,google');
  t('2 fără listă, linkul din Dosar e de ajuns (identitate.facebook)', c(null, { facebook: 'https://facebook.com/brutaria' }) === 'facebook' && c(undefined, { canale: ['tiktok'], instagram: '@x' }) === 'instagram,tiktok');
  t('2 un link gol sau o listă goală nu înseamnă canal', c([], { instagram: '', facebook: '   ' }) === '' && c(null, {}) === '');
  const x = canaleFolosite(['instagram', 'pinterest'], { identitate: {} });
  t('2 un canal fără dimensiuni în motor e spus, nu ghicit', x.necunoscute.join() === 'pinterest' && x.canale.find((q) => q.canal === 'instagram').sursa === 'identitate.canale');
  const b = await fa('ferestre', { canale: ['youtube', 'linkedin'] });
  t('2 YouTube și LinkedIn primesc poza de profil și coperta lor', b.ok && b.poze.map((z) => `${z.canal}:${z.ce}:${z.w}x${z.h}`).join(' ') === 'linkedin:poza_profil:400x400 linkedin:coperta:1128x191 youtube:poza_profil:800x800 youtube:coperta:2560x1440', b.ok ? b.poze.map((z) => `${z.canal} ${z.w}×${z.h}`).join(', ') : b.motiv);
}

// 3. aplicările amânate
{
  const a = await fa('arcada'); const b = await fa('arcada', { aplicatii: ['carte_vizita', 'postare'] }); const c = await fa('arcada', { aplicatii: [] }); const d = await fa('arcada', { aplicatii: ['afis'] });
  t('3 fără „aplicatii”, toate patru vin la „amanate”, cu termenul', a.ok && a.amanate.map((x) => x.ce).join() === Object.keys(APLICATII).join() && a.amanate.every((x) => x.pana_la === '2026-11-28' && x.nume && x.motiv));
  t('3 cu două cerute, două amânate; cu lista goală, niciuna', b.ok && b.amanate.map((x) => x.ce).join() === 'carte_vizita,postare' && c.ok && c.amanate.length === 0);
  t('3 o aplicare care nu există e respinsă cu lista celor șapte', d.ok === false && d.erori.some((e) => e.includes('afis') && e.includes('carte_vizita') && e.includes('ghid') && e.includes('coperta')));
  const sapte = await fa('arcada', { aplicatii: ['ghid', 'avatar', 'coperta', 'carte_vizita', 'semnatura_email', 'antet', 'postare'] });
  t('3 lista fluxului n8n (toate șapte): ghidul, poza și coperta ies acum, celelalte patru vin la „amanate”', sapte.ok && sapte.amanate.map((x) => x.ce).join() === 'carte_vizita,semnatura_email,antet,postare' && sapte.pagini === a.pagini && sapte.poze.length === a.poze.length, sapte.ok ? '' : (sapte.erori || []).join(' | ').slice(0, 160));
  t('3 kitul nu are niciun fișier pentru aplicările amânate', a.in_zip.every((x) => !/carte|semnatura|antet|postare/.test(x)));
}

// 4. verificările care opresc și contrastul măsurat
{
  const cu = (k, strica) => { const c = cerere(k); strica(c); return genereazaBrandKit(c, { sharp, prefix: 'x/', logo: logo[k] }); };
  const k1 = await cu('arcada', (c) => { c.identitate.jetoane.culori.text = '#C9C2B8'; c.identitate.culori[1].hex = '#C9C2B8'; c.paleta = c.identitate.jetoane.culori; });
  t('4 K1: textul prea șters pe fundal oprește kitul', k1.ok === false && k1.erori.some((e) => e.startsWith('K1')) && k1.verificari.find((v) => v.cod === 'K1').valoare < 4.5, (k1.erori || []).join(' | '));
  const k2 = await cu('arcada', (c) => { c.identitate.culori[3].hex = '#B07A50'; });
  t('4 K2: o culoare din ghid diferită de jetoane oprește kitul', k2.ok === false && k2.erori.some((e) => e.startsWith('K2') && e.includes('accent')), (k2.erori || []).join(' | ').slice(0, 150));
  const k4 = await cu('arcada', (c) => { c.identitate.fonturi.titluri = 'Helvetica Neue'; });
  t('4 K4: un font din afara listei celor 20 oprește kitul', k4.ok === false && k4.erori.some((e) => e.startsWith('K4') && e.includes('Helvetica Neue')));
  const t1 = await cu('arcada', (c) => { c.identitate.ton.exemplu_da = 'Sună-ne la 0722 123 456 și te programăm pe loc, fără să aștepți.'; });
  t('4 T1: un număr de telefon care nu e în Dosar oprește kitul', t1.ok === false && t1.erori.some((e) => e.startsWith('T1') && e.includes('0722 123 456')), (t1.erori || []).join(' | ').slice(0, 150));
  const t2 = await cu('arcada', (c) => { c.identitate.ton.exemplu_da = 'Sună-ne la 0744 000 111 sau scrie-ne la programari@salonliniste.ro și îți găsim o oră.'; });
  t('4 T1: telefonul și emailul din Dosar trec', t2.ok === true);
  const t3 = await cu('arcada', (c) => { c.identitate.fotografie.lumina = 'ca în pozele de pe contact@altafirma.ro'; });
  t('4 T1: un email care nu e în Dosar oprește kitul', t3.ok === false && t3.erori.some((e) => e.startsWith('T1') && e.includes('contact@altafirma.ro')));
  const b = await fa('crestatura'); const p = b.perechi.find((x) => x.text === '#C9853A');
  t('4 perechea cerută „pentru text obișnuit” cu contrast 2,7:1 apare în ghid cu verdictul măsurat și cu o notă', b.ok && p && p.contrast < 3 && p.verdict === verdictContrast(p.contrast) && p.verdict.startsWith('nu pentru text') && b.note.some((x) => x.includes('#C9853A')), p ? `${p.contrast}:1 → ${p.verdict}` : '');
  t('4 verdictele de contrast: 7, 4,5 și 3 sunt pragurile', verdictContrast(7).includes('text mic') && verdictContrast(6.9) === 'bun pentru text obișnuit' && verdictContrast(4.4).startsWith('doar pentru titluri') && verdictContrast(2.9).startsWith('nu pentru text'));
  const e1 = await genereazaBrandKit({ ...cerere('arcada'), identitate: {} }, { sharp, prefix: 'x/', logo: logo.arcada }); const e2 = await genereazaBrandKit(cerere('arcada'), { sharp, prefix: 'x/', logo: null }); const e3 = await genereazaBrandKit(cerere('arcada'), { sharp, prefix: 'x/', logo: { orizontal: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9"><text>x</text></svg>' } });
  t('4 fără fonturi, fără logo sau cu un logo care nu e din forme pline: „ok: false” cu motivul', e1.ok === false && e1.erori.some((e) => e.includes('identitate.fonturi')) && e2.ok === false && e2.erori.some((e) => e.includes('logoul final')) && e3.ok === false && e3.erori.length > 0);
  const vechi = await cu('ferestre', (c) => { delete c.identitate.fonturi.rezerva_titluri; delete c.identitate.fonturi.rezerva_text; delete c.identitate.rescrieri; delete c.identitate.personalitate; delete c.identitate.perechi; });
  t('4 o identitate de dinainte de scriptul 106 (fără rezerve, rescrieri, personalitate): kitul iese, cu rezerva aleasă după serife și cu nota', vechi.ok && vechi.fonturi.rezerva_titluri === 'Arial' && vechi.note.some((x) => x.includes('rezervă')) && vechi.pagini >= 6, vechi.ok ? `${vechi.pagini} pagini` : `${vechi.motiv}: ${(vechi.erori || []).join('; ')}`);
}

// 5. textele fixe, prin detectorul de tipare de robot (standard-specialist/aplicare/unelte/tipare-robot.js)
{
  const unde = process.env.TIPARE_ROBOT;
  if (!unde || !fs.existsSync(unde)) console.log('sărit 5 textele fixe prin detectorul de tipare: dă calea în TIPARE_ROBOT');
  else {
    const { tipareRobot } = createRequire(import.meta.url)(path.resolve(unde));
    const plat = (x) => (typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap(plat) : typeof x === 'function' ? [] : x && typeof x === 'object' ? Object.values(x).flatMap(plat) : []);
    const G = TEXTE_GHID, T = TEXTE_BRAND; const ft = { titluri: 'Fraunces', text: 'Source Sans 3', rezTitluri: 'Georgia', rezText: 'Arial' };
    const am = Object.values(APLICATII).map((nume) => ({ nume })); const poze = [{ fisier: 'retele/instagram-poza-profil.png', canal_nume: 'Instagram', ce: 'poza de profil', w: 1080, h: 1080 }];
    const seturi = {
      'ghidul logoului': [...plat({ ...G, marime: null }), G.marime(6, 24, 'Semnul', 12), G.marime(6, 24, null, null)].join('\n'),
      'CITESTE din kitul logoului (cu semn)': CITESTE_CLIENT('Salon Liniște', true, false),
      'CITESTE din kitul logoului (fără semn)': CITESTE_CLIENT('Brutăria Olaru', false, false),
      'CITESTE din kitul logoului păstrat': CITESTE_CLIENT('Cabinet Țurcanu', false, true),
      'ghidul brandului': [T.intro('Salon Liniște'), ...T.cuprins, T.fisiere('brand-salon-liniste.zip', 'logo-salon-liniste.zip'), T.fisiere('brand-x.zip', null), ...plat(T.foldere), ...plat(T.unde), T.urmeaza('cartea de vizită, semnătura de e-mail, antetul pentru documente și șablonul de postare'), T.culori, T.perechi, T.cmyk, T.fonturi, T.licenta, ...plat(T.rezerve('Fraunces', 'Source Sans 3', 'Georgia', 'Arial')), T.vocea, T.rescrieri, T.fotografii, T.logo, T.profiluri, T.faraCanale, ...[7.2, 5, 3.4, 2].map(verdictContrast)].join('\n'),
      'CITESTE din brand kit': CITESTE_BRAND('Salon Liniște', poze, ft, am),
    };
    for (const [k, text] of Object.entries(seturi)) { const r = tipareRobot(text, { tip: 'document', adresare: 'tu' }); t(`5 ${k}: niciun tipar de robot`, r.opresc.length === 0 && r.critic.length === 0, [...r.opresc, ...r.critic].map((x) => `${x.cod}: ${x.fragment}`).join(' | ').slice(0, 200)); }
    const toate = Object.values(seturi).join('\n');
    t('5 textele promit exclusivitatea și nu spun „desenat de mine” sau că depunem noi la OSIM', /nu-l mai folosim pentru nimeni/.test(toate) && !/desenat de mine|desenat de mână|depunem noi|înregistrăm noi|dumneavoastră/i.test(toate));
  }
}

console.log(`\n${n - picate} din ${n} trec`);
process.exit(picate ? 1 : 0);
