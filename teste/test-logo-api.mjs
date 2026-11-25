// Testele celor trei rute ale motorului (25 nov. 2026): node teste/test-logo-api.mjs
// /api/logo-genereaza, /api/logo-kit, /api/brand-kit, cu bucketul „brand” simulat (fetch înlocuit; nimic nu pleacă în rețea).
// Verifică antetul secret, cererile greșite (400 cu motivul), urcarea în folderul piesei și forma răspunsului citită de SQL 111.
import { FIRME, SVG_EXISTENT, variante, raspuns, CALE_BRAND } from './test-logo-fixturi.mjs';

process.env.N8N_WEBHOOK_SECRET = 'secret-de-test';
process.env.SUPABASE_URL = 'https://test.invalid';
process.env.SUPABASE_SERVICE_KEY = 'cheie-de-test';

// bucketul simulat: ce se urcă rămâne în „depozit” și se poate citi înapoi
const depozit = new Map(); const cereri = []; let stricat = null;
globalThis.fetch = async (url, o = {}) => {
  const u = String(url); cereri.push({ url: u, metoda: o.method || 'GET', h: o.headers || {} });
  if (!u.startsWith('https://test.invalid/storage/v1/object/')) return { ok: false, status: 599, text: async () => 'adresă neașteptată', arrayBuffer: async () => new ArrayBuffer(0) };
  const cale = decodeURIComponent(u.replace('https://test.invalid/storage/v1/object/', '').replace(/^authenticated\//, ''));
  if (stricat && stricat.test(cale)) return { ok: false, status: 500, text: async () => 'storage oprit', arrayBuffer: async () => new ArrayBuffer(0) };
  if ((o.method || 'GET') === 'POST') { depozit.set(cale, { date: Buffer.from(o.body), tip: o.headers['Content-Type'] }); return { ok: true, status: 200, text: async () => '{}' }; }
  const f = depozit.get(cale); if (!f) return { ok: false, status: 404, text: async () => 'not found', arrayBuffer: async () => new ArrayBuffer(0) };
  return { ok: true, status: 200, arrayBuffer: async () => f.date.buffer.slice(f.date.byteOffset, f.date.byteOffset + f.date.length), text: async () => f.date.toString('utf8') };
};

const genereaza = await import('../api/logo-genereaza.js');
const kit = await import('../api/logo-kit.js');
const brand = await import('../api/brand-kit.js');
const { caleSigura } = await import('../lib/logo/stocare.js');

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };
const cere = async (ruta, body, { secret = 'secret-de-test', metoda = 'POST' } = {}) => { const r = raspuns(); await ruta.default({ method: metoda, headers: secret ? { 'x-alesign-secret': secret } : {}, body }, r); return r; };

// 1. poarta comună
for (const [nume, ruta, durata] of [['logo-genereaza', genereaza, 60], ['logo-kit', kit, 120], ['brand-kit', brand, 120]]) {
  t(`1 ${nume}: maxDuration ${durata} e exportat (vercel.json rămâne neatins)`, ruta.config && ruta.config.maxDuration === durata);
  const a = await cere(ruta, {}, { secret: null }), b = await cere(ruta, {}, { secret: 'altceva' }), c = await cere(ruta, {}, { metoda: 'GET' }), d = await cere(ruta, '{nu e json'), e = await cere(ruta, {}), g = await cere(ruta, '[1,2]');
  t(`1 ${nume}: fără antetul secret sau cu altul, 403; cu GET, 405`, a.cod === 403 && b.cod === 403 && c.cod === 405 && a.corp.ok === false && a.hdr['Cache-Control'] === 'no-store');
  t(`1 ${nume}: corp care nu e JSON sau nu e obiect, 400`, d.cod === 400 && g.cod === 400 && d.corp.ok === false);
  t(`1 ${nume}: fără lead_id și sarcina_id, 400 cu lista a ce lipsește`, e.cod === 400 && e.corp.erori.some((x) => x.startsWith('lead_id')) && e.corp.erori.some((x) => x.startsWith('sarcina_id')), e.corp.erori.join(' | ').slice(0, 150));
}
t('1 nicio cerere greșită n-a ajuns la bucket', cereri.length === 0);
t('1 căile cu „..”, goale sau cu bară inversă sunt respinse înainte de bucket', ['a/../b', '/a', 'a//b', 'a\\b', ''].every((c) => { try { caleSigura(c); return false; } catch { return true; } }) && caleSigura('9000/12/final/svg/orizontal-color.svg') === '9000/12/final/svg/orizontal-color.svg');

// 2. /api/logo-genereaza
const f = FIRME.arcada;
{
  const r = await cere(genereaza, JSON.stringify({ lead_id: 9000, sarcina_id: 12, set: 2, retete: variante('arcada', 3), paleta: f.paleta, dosar: f.dosar }));
  const c = r.corp || {}; const urcate = [...depozit.keys()];
  t('2 setul de 3 rețete: 200, trei candidați, urcat în brand/9000/12/set-2/', r.cod === 200 && c.ok && c.candidati.length === 3 && c.incarcat === true && c.bucket === 'brand' && urcate.length === c.fisiere.length && urcate.every((x) => x.startsWith('brand/9000/12/set-2/')), `${urcate.length} fișiere, ${c.durata_totala_ms} ms`);
  t('2 fiecare fișier urcat are cale, tip, octeți și SHA-256; urcarea e cu x-upsert și cheia de serviciu', c.fisiere.every((x) => CALE_BRAND.test(x.cale) && x.tip && x.octeti > 0 && /^[0-9a-f]{64}$/.test(x.sha256) && !x.base64) && cereri.every((q) => q.metoda === 'POST' && q.h['x-upsert'] === 'true' && q.h.apikey === 'cheie-de-test' && q.h.Authorization === 'Bearer cheie-de-test'));
  t('2 ce citește SQL 111: id, trecut, reteta, hash, amprenta, fisiere.orizontal_svg, fisiere.plansa_png, plansa_set_png, raport_json', c.candidati.every((x) => x.id && typeof x.trecut === 'boolean' && x.reteta && x.hash && x.amprenta && depozit.has('brand/' + x.fisiere.orizontal_svg) && depozit.has('brand/' + x.fisiere.plansa_png)) && depozit.has('brand/' + c.plansa_set_png) && depozit.has('brand/' + c.raport_json));
  t('2 tipurile urcate sunt cele primite de bucket (SVG, PNG, JSON)', [...depozit.values()].every((x) => ['image/svg+xml', 'image/png', 'application/json'].includes(x.tip)));
  depozit.clear(); cereri.length = 0;
  const p = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, retete: [f.reteta], paleta: f.paleta, dosar: f.dosar, incarca: false });
  t('2 cu „incarca”: false nu pleacă nimic la bucket, iar fișierele vin în răspuns (base64)', p.cod === 200 && cereri.length === 0 && p.corp.incarcat === false && p.corp.bucket === null && p.corp.fisiere.every((x) => typeof x.base64 === 'string' && x.base64.length > 0));
  // numele din logo_de_lucru (SQL 111): un logo AleSign cu aceeași amprentă ca arcada trebuie să oprească propunerea (A1)
  const am = p.corp.candidati[0].amprenta;
  const q = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, retete: [f.reteta], paleta: f.paleta, dosar: f.dosar, incarca: false, cu_date: false, amprente_alesign: [{ id: 'logouri.7', amprenta: am }], concurenti: [{ nume: 'Salon X', sursa: 'strategie' }] });
  const a1 = q.cod === 200 && q.corp.candidati[0].verificari.find((v) => v.cod === 'A1');
  t('2 „amprente_alesign” din SQL 111 ajunge la comparație: același desen ca un logo de-al nostru pică la A1', q.cod === 200 && a1 && a1.trecut === false && q.corp.candidati[0].trecut === false && q.corp.comparatii.numar === 1, a1 ? a1.motiv.slice(0, 110) : JSON.stringify(q.corp).slice(0, 160));
  const g1 = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, retete: [] }), g2 = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, retete: variante('arcada', 10) }), g3 = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, set: 99, retete: [f.reteta] }), g4 = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, retete: [f.reteta], paleta: ['#fff'] });
  t('2 fără rețete, cu peste 9, cu setul 99 sau cu paleta ca listă: 400 cu motivul', [g1, g2, g3, g4].every((x) => x.cod === 400 && x.corp.erori.length > 0), [g1, g2, g3, g4].map((x) => x.corp.erori[0]).join(' | ').slice(0, 190));
  const g5 = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, retete: [FIRME.crestatura.reteta], paleta: f.paleta, dosar: f.dosar, incarca: false });
  t('2 dacă nicio rețetă nu trece validarea: 400, cu „respinse” și motivele lor', g5.cod === 400 && g5.corp.respinse.length === 1 && g5.corp.erori.some((x) => x.includes('nu e identic cu numele din Dosar')));
  stricat = /set-1\/arcada\/plansa\.png$/;
  const s = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, retete: [f.reteta], paleta: f.paleta, dosar: f.dosar });
  t('2 dacă un fișier nu urcă: 500 și spune care', s.cod === 500 && s.corp.ok === false && /n-au urcat/.test(s.corp.motiv) && s.corp.motiv.includes('plansa.png'), s.corp.motiv.slice(0, 120));
  stricat = null; depozit.clear(); cereri.length = 0;
  delete process.env.SUPABASE_SERVICE_KEY;
  const fk = await cere(genereaza, { lead_id: 9000, sarcina_id: 12, retete: [f.reteta], paleta: f.paleta, dosar: f.dosar });
  t('2 fără cheile Supabase în env: 500 cu numele variabilelor, nimic compilat', fk.cod === 500 && /SUPABASE_URL sau SUPABASE_SERVICE_KEY/.test(fk.corp.motiv));
  process.env.SUPABASE_SERVICE_KEY = 'cheie-de-test';
}

// 3. /api/logo-kit
{
  // forma din logo_de_lucru (SQL 111): rețeta în „ales.reteta”, corecturile din registru, „osim” cu numele și clasele
  const r = await cere(kit, { lead_id: 9000, sarcina_id: 12, mod: 'kit', ales: { logo_id: 41, set: 1, id: 'arcada', familie: 'logotip', reteta: f.reteta }, corecturi: { spatiere: 1 }, paleta: f.paleta, dosar: f.dosar, nume: 'Salon Liniște', osim: { nume: 'Salon Liniște', clase: [44] } });
  const c = r.corp || {};
  t('3 kitul din „ales.reteta”, cu o corectură: 200, urcat în brand/9000/12/final/', r.cod === 200 && c.ok && c.incarcat && c.fisiere.length >= 9 && [...depozit.keys()].every((x) => x.startsWith('brand/9000/12/final/')) && depozit.size === c.fisiere.length, `${depozit.size} fișiere`);
  t('3 ce citește SQL 111: zip, ghid_pdf, osim_jpg, fisiere[].cale, svg/orizontal-color.svg, verificari[].cod, reteta_finala', ['zip', 'ghid_pdf', 'osim_jpg'].every((k) => CALE_BRAND.test(c[k]) && depozit.has('brand/' + c[k])) && c.fisiere.some((x) => x.cale.endsWith('/svg/orizontal-color.svg')) && c.verificari.every((v) => v.cod) && c.reteta_finala.logotip.spatiere === 30 && c.aplicate.length === 1 && !c.fisiere.some((x) => x.base64));
  t('3 tipurile urcate sunt cele primite de bucket', [...depozit.values()].every((x) => ['image/svg+xml', 'image/png', 'image/jpeg', 'image/x-icon', 'application/pdf', 'application/zip', 'text/plain'].includes(x.tip)), [...new Set([...depozit.values()].map((x) => x.tip))].join(', '));
  const e1 = await cere(kit, { lead_id: 9000, sarcina_id: 12 }), e2 = await cere(kit, { lead_id: 9000, sarcina_id: 12, reteta: f.reteta, logo_existent: { svg: SVG_EXISTENT } }), e3 = await cere(kit, { lead_id: 9000, sarcina_id: 12, reteta: f.reteta, osim: { paragrafe: 'text' } });
  t('3 fără rețetă și fără logo, cu amândouă sau cu „osim” greșit: 400', [e1, e2, e3].every((x) => x.cod === 400 && x.corp.erori.length > 0), [e1, e2, e3].map((x) => x.corp.erori[0]).join(' | ').slice(0, 200));
  const fb = FIRME.crestatura; const e4 = await cere(kit, { lead_id: 9001, sarcina_id: 13, reteta: fb.reteta, corecturi: { culoare: 'accent' }, paleta: fb.paleta, dosar: fb.dosar });
  t('3 corectura care strică contrastul: 400 cu C1, verificările și rețeta încercată; nimic urcat pentru piesa aceea', e4.cod === 400 && e4.corp.erori.some((x) => x.startsWith('C1')) && Array.isArray(e4.corp.verificari) && !!e4.corp.reteta_finala && ![...depozit.keys()].some((x) => x.startsWith('brand/9001/13/')));
  // logoul pe care firma îl păstrează, citit din bucketul „onboarding” (logo_client din SQL 111)
  depozit.set('onboarding/9001/logo-firma.svg', { date: Buffer.from(SVG_EXISTENT), tip: 'image/svg+xml' }); cereri.length = 0;
  const k = await cere(kit, { lead_id: 9001, sarcina_id: 14, mod: 'kit_din_logoul_tau', logo_client: { bucket: 'onboarding', cale: '9001/logo-firma.svg', tip: 'image/svg+xml' }, paleta: { fundal: '#FFFFFF', text: '#1F4E5A', baza: '#1F4E5A' }, dosar: { identitate: { firma: 'Instal Frig Oltenia' } } });
  t('3 logoul clientului se citește din „onboarding” și kitul urcă în brand/9001/14/final/', k.cod === 200 && k.corp.existent === true && cereri[0].metoda === 'GET' && cereri[0].url.endsWith('/storage/v1/object/authenticated/onboarding/9001/logo-firma.svg') && depozit.has('brand/9001/14/final/svg/orizontal-color.svg') && k.corp.zip.endsWith('logo-instal-frig-oltenia.zip'), k.cod === 200 ? k.corp.zip : JSON.stringify(k.corp).slice(0, 160));
  const k2 = await cere(kit, { lead_id: 9001, sarcina_id: 14, logo_existent: { bucket: 'brand', cale: '9001/nu-exista.svg' } }), k3 = await cere(kit, { lead_id: 9001, sarcina_id: 14, logo_existent: { bucket: 'altul', cale: 'x.svg' } }), k4 = await cere(kit, { lead_id: 9001, sarcina_id: 14, logo_existent: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9"><text>a</text></svg>' }, incarca: false });
  t('3 logoul care lipsește din bucket, bucketul necunoscut și SVG-ul cu text: 400 cu motivul', k2.cod === 400 && /storage 404/.test(k2.corp.erori[0]) && k3.cod === 400 && /"brand" sau "onboarding"/.test(k3.corp.erori[0]) && k4.cod === 400 && k4.corp.erori.length > 0, [k2, k3, k4].map((x) => x.corp.erori[0]).join(' | ').slice(0, 220));
}

// 4. /api/brand-kit
{
  cereri.length = 0;
  const final = { bucket: 'brand', cale: '9000/12/final/svg/orizontal-color.svg', semn: '9000/12/final/svg/semn-color.svg', favicon: '9000/12/final/web/favicon.svg', sarcina_id: 12 };
  const r = await cere(brand, { lead_id: 9000, sarcina_id: 15, mod: 'brand_kit', nume: 'Salon Liniște', identitate: f.identitate, paleta: f.identitate.jetoane.culori, dosar: f.dosar, canale: f.canale, final });
  const c = r.corp || {}; const kitF = [...depozit.keys()].filter((x) => x.startsWith('brand/9000/15/'));
  t('4 brand kitul din „final” (logoul din kitul logoului): 200, urcat în brand/9000/15/kit/', r.cod === 200 && c.ok && c.incarcat && kitF.length === c.fisiere.length && kitF.every((x) => x.startsWith('brand/9000/15/kit/')) && cereri.filter((q) => q.metoda === 'GET').length === 2, r.cod === 200 ? `${kitF.length} fișiere, ${c.pagini} pagini` : JSON.stringify(c).slice(0, 200));
  t('4 ce citește SQL 111: fisiere[].cale în kit/, zip, verificari toate trecute, texte, canale, amanate', r.cod === 200 && c.fisiere.every((x) => CALE_BRAND.test(x.cale)) && depozit.has('brand/' + c.zip) && c.zip.startsWith('9000/15/kit/') && c.verificari.every((v) => v.trecut === true) && Array.isArray(c.texte) && c.texte.length > 10 && Array.isArray(c.canale) && c.amanate.length === 4);
  t('4 doar Instagram e în Dosar: o singură poză, cea de profil pentru Instagram', r.cod === 200 && c.poze.length === 1 && c.poze[0].canal === 'instagram' && c.poze[0].ce === 'poza_profil' && depozit.has('brand/9000/15/kit/retele/instagram-poza-profil.png') && !kitF.some((x) => /facebook|google|tiktok/.test(x)));
  t('4 tipurile urcate sunt cele primite de bucket (fonturile rămân doar în ZIP)', kitF.every((x) => ['image/png', 'application/pdf', 'application/zip', 'text/plain'].includes(depozit.get(x).tip)) && !kitF.some((x) => /\.ttf$/.test(x)));
  // corpul exact pe care îl trimite nodul „Pregătire” din fluxul n8n „Logo · generator” (mod brand_kit): fără nume și paletă,
  // logoul ca { bucket, cale, semn }, toate cele șapte aplicații
  cereri.length = 0; const inainte = new Set(depozit.keys());
  const n8 = await cere(brand, { lead_id: 9000, sarcina_id: 17, dosar: f.dosar, identitate: f.identitate, logo: { bucket: final.bucket, cale: final.cale, semn: final.semn }, canale: f.canale, aplicatii: ['ghid', 'avatar', 'coperta', 'carte_vizita', 'semnatura_email', 'antet', 'postare'], incarca: true });
  const n8F = [...depozit.keys()].filter((x) => !inainte.has(x));
  t('4 corpul din fluxul n8n (logo: { bucket, cale, semn }, șapte aplicații): 200, logoul citit din bucket, patru amânate', n8.cod === 200 && n8.corp.ok && n8.corp.nume === 'Salon Liniște' && cereri.filter((q) => q.metoda === 'GET').length === 2 && n8.corp.amanate.map((x) => x.ce).join() === 'carte_vizita,semnatura_email,antet,postare' && n8F.length > 0 && n8F.every((x) => x.startsWith('brand/9000/17/kit/')), n8.cod === 200 ? `${n8F.length} fișiere` : JSON.stringify(n8.corp).slice(0, 220));
  const n8r = await cere(brand, { lead_id: 9000, sarcina_id: 17, dosar: f.dosar, identitate: f.identitate, logo: { bucket: 'altul', cale: final.cale } });
  t('4 logo dintr-un bucket necunoscut: 400 care numește câmpul „logo.bucket”', n8r.cod === 400 && n8r.corp.erori.some((x) => x.startsWith('logo.bucket')), (n8r.corp.erori || []).join(' | ').slice(0, 120));
  const p = await cere(brand, { lead_id: 9000, sarcina_id: 15, identitate: f.identitate, dosar: f.dosar, canale: f.canale, logo: { orizontal_svg: depozit.get('brand/9000/12/final/svg/orizontal-color.svg').date.toString('utf8') }, incarca: false, aplicatii: ['antet'] });
  t('4 de probă: logoul în cerere, „incarca”: false, numele și paleta luate din Dosar și din jetoane', p.cod === 200 && p.corp.incarcat === false && p.corp.nume === 'Salon Liniște' && p.corp.amanate.length === 1 && p.corp.amanate[0].ce === 'antet', p.cod === 200 ? '' : JSON.stringify(p.corp).slice(0, 200));
  const e1 = await cere(brand, { lead_id: 9000, sarcina_id: 15 }), e2 = await cere(brand, { lead_id: 9000, sarcina_id: 15, identitate: f.identitate, canale: 'instagram' }), e3 = await cere(brand, { lead_id: 9000, sarcina_id: 15, identitate: f.identitate, dosar: f.dosar }), e4 = await cere(brand, { lead_id: 9000, sarcina_id: 15, identitate: f.identitate, dosar: f.dosar, final: { bucket: 'brand', cale: '9000/12/final/png/orizontal-color-512.png' } }), e5 = await cere(brand, { lead_id: 9000, sarcina_id: 15, identitate: f.identitate, dosar: f.dosar, final: { bucket: 'brand', cale: '9000/99/final/svg/orizontal-color.svg' } });
  t('4 fără identitate, cu „canale” ca text, fără logo, cu logo PNG sau cu logo care lipsește: 400 cu motivul', [e1, e2, e3, e4, e5].every((x) => x.cod === 400 && x.corp.erori.length > 0), [e1, e2, e3, e4, e5].map((x) => x.corp.erori[0]).join(' | ').slice(0, 260));
  const rau = JSON.parse(JSON.stringify(f.identitate)); rau.jetoane.culori.text = '#C9C2B8'; rau.culori[1].hex = '#C9C2B8';
  const e6 = await cere(brand, { lead_id: 9000, sarcina_id: 16, nume: 'Salon Liniște', identitate: rau, paleta: rau.jetoane.culori, dosar: f.dosar, final });
  t('4 o identitate cu textul prea șters pe fundal: 400 cu K1 și verificările; nimic urcat', e6.cod === 400 && e6.corp.erori.some((x) => x.startsWith('K1')) && Array.isArray(e6.corp.verificari) && ![...depozit.keys()].some((x) => x.startsWith('brand/9000/16/')), (e6.corp.erori || []).join(' | ').slice(0, 120));
}

console.log(`\n${n - picate} din ${n} trec`);
process.exit(picate ? 1 : 0);
