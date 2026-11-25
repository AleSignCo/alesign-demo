// Testele după prima probă adevărată (piesa 660, 25 nov. 2026): node teste/test-logo-proba660.mjs
// 1. formele echivalente sigure se îndreaptă, cele nesigure rămân respinse; 2. mesajele de respingere spun forma bună, cu exemplu;
// 3. cele 12 rețete reale (teste/test-logo-proba660-date.mjs) prin motorul de acum; 4. aceleași rețete cu regula C1 respectată:
// cel puțin 3 din 6 trec, de două ori la rând, cu același hash; 5. pragurile măsurate pe care le primește S2 pentru skill.
import { RETETE_8664, RETETE_8676, PALETA_8664, PALETA_8676, DOSAR_660 } from './test-logo-proba660-date.mjs';

const { normalizeaza, valideaza } = await import('../lib/logo/reteta.js');
const { genereazaSet } = await import('../lib/logo/genereaza.js');

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };
const cl = (x) => JSON.parse(JSON.stringify(x));
const dupa = (lista, id) => cl(lista.find((r) => r.id === id));
const set = (retete, paleta) => genereazaSet({ lead_id: 9000, sarcina_id: 660, set: 1, retete, paleta, dosar: DOSAR_660 }, { sharp: null, prefix: '9000/660/set-1/' });
const trecute = (o) => o.candidati.filter((c) => c.trecut).map((c) => c.id);
const cod = (c, k) => c && c.verificari.find((v) => v.cod === k);

// 1. formele echivalente
{
  const o = dupa(RETETE_8664, 'trei-sferturi'); const inainte = JSON.stringify(o); const { reteta: r, schimbari } = normalizeaza(o);
  t('1 "litere": "C" → ["C"] și afisat[].element → id; rețeta primită rămâne neatinsă', JSON.stringify(r.logotip.detalii[0].litere) === '["C"]' && r.semn.afisat.every((a) => a.id && a.element === undefined) && JSON.stringify(o) === inainte && schimbari.length === 3, schimbari.join(' · '));
  const e = normalizeaza(dupa(RETETE_8664, 'etape')).reteta.semn.elemente;
  t('1 „celule” ca listă de liste → listă simplă, rând cu rând', e[0].celule.join() === 'NV,p,p,p,.,.,SV,p,.' && e[1].celule.length === 9);
  const k = normalizeaza(dupa(RETETE_8676, 'plan-cu-preturi')).reteta.semn.operatii;
  t('1 operatii[].tip → op', k.every((x) => x.op && x.tip === undefined) && k[0].op === 'uneste' && k[1].op === 'scade');
  const p = normalizeaza(dupa(RETETE_8676, 'punct-45')).reteta.logotip.detalii[0].semn;
  t('1 o formă scrisă direct în „semn” → { elemente: [forma] }', Array.isArray(p.elemente) && p.elemente[0].id === 'ceas' && p.elemente[0].tip === 'arc');
  const x = normalizeaza(dupa(RETETE_8664, 'pas-cu-pas'));
  t('1 ce nu e sigur nu se atinge: "grosime": 80 la bara de ligatură rămâne 80', x.reteta.monograma.detalii[0].grosime === 80 && x.schimbari.length === 0);
  const tt = normalizeaza({ id: 'x', logotip: { detalii: [{ tip: 'taietura', litere: 'Toate' }, { tip: 'taietura', litere: 'i#2' }, { tip: 'taietura', litere: 'ab' }] } }).reteta.logotip.detalii;
  t('1 "Toate" → "toate", "i#2" → ["i#2"]; "ab" (mai multe litere) nu se ghicește', tt[0].litere === 'toate' && JSON.stringify(tt[1].litere) === '["i#2"]' && tt[2].litere === 'ab');
}

// 2. mesajele spun forma bună, cu un exemplu
{
  const baza = dupa(RETETE_8676, 'cadran-45');
  const e = (mod) => { const r = cl(baza); mod(r); return valideaza(r, {}).erori.join(' | '); };
  const m1 = e((r) => { r.logotip.detalii[0].litere = 5; });
  const m2 = e((r) => { r.semn.afisat[0].id = 'nu-exista'; r.semn.operatii[0].op = 'scade'; delete r.semn.operatii[0].tip; });
  const m3 = e((r) => { r.semn.operatii[0].op = 'taie'; delete r.semn.operatii[0].tip; });
  const m4 = e((r) => { r.semn.elemente.push({ id: 'g', tip: 'grila', x: 0, y: 0, latura: 12, n: 2, celule: ['p', '.', 'p'] }); r.semn.operatii[0].op = 'scade'; delete r.semn.operatii[0].tip; });
  const m5 = (() => { const r = dupa(RETETE_8676, 'punct-45'); r.logotip.detalii[0].semn = { elemente: [] }; return valideaza(r, {}).erori.join(' | '); })();
  const m6 = valideaza(dupa(RETETE_8664, 'pas-cu-pas'), {}).erori.join(' | ');
  t('2 „litere” greșit: arată ["a"], "i#2" și "toate"', /de exemplu "litere": \["a"\]/.test(m1) && m1.includes('"toate"'), m1.slice(0, 140));
  t('2 „afisat” cu un id care nu există: spune ce id-uri se pot desena și dă un exemplu', m2.includes('(aici: cadran)') && m2.includes('de exemplu [{ "id": "cadran"'), m2.slice(0, 160));
  t('2 „op” greșit: spune cheia "op" și dă exemplele pentru scade și uneste', m3.includes('cheia e "op"') && m3.includes('{ "op": "scade"') && m3.includes('{ "op": "uneste"'));
  t('2 „celule” cu alt număr de coduri: spune câte, în ce ordine, cu exemplu', m4.includes('3 în loc de 4 coduri') && m4.includes('rând cu rând') && m4.includes('["NV", "p", "p", "."]'), m4.slice(m4.indexOf('celule'), m4.indexOf('celule') + 120));
  t('2 semn fără elemente: arată { "elemente": [...] } cu un cerc', m5.includes('{ "elemente": [{ "id": "punct", "tip": "cerc"'));
  t('2 „grosime”: 80 la bara de ligatură: spune unitatea și dă un exemplu', m6.includes('80: în unități de grilă (24 de unități = înălțimea majusculei)') && m6.includes('de exemplu "grosime": 2'));
  const o = await set([(() => { const r = dupa(RETETE_8676, 'voce-calma'); r.id = 'ochi-pe-c'; r.logotip.detalii[0].litere = ['C']; return r; })()], PALETA_8676);
  const mo = (o.respinse[0] || { erori: [] }).erori.join(' ');
  t('2 „ochi_umplut” pe o literă fără ochi: spune ce litere au ochi în font', mo.includes('„C” n-are un ochi închis în Nunito') && mo.includes('"a"') && mo.includes('de exemplu "litere": ['), mo.slice(0, 200));
}

// 3. cele 12 rețete reale, neschimbate, prin motorul de acum (pe Vercel: 0 din 6 de două ori)
let s1, s2;
{
  s1 = await set(RETETE_8664, PALETA_8664); s2 = await set(RETETE_8676, PALETA_8676);
  const resp = [...s1.respinse, ...s2.respinse];
  t('3 dintre 12, una singură mai e respinsă înainte de desen: pas-cu-pas, pentru "grosime": 80', resp.length === 1 && resp[0].id === 'pas-cu-pas', resp.map((x) => x.id).join(', '));
  t('3 voce-calma și liniste se desenează („a” umplut nu mai oprește inițiala „C”)', ['voce-calma', 'liniste'].every((id) => [...s1.candidati, ...s2.candidati].some((c) => c.id === id)));
  const rs = s1.candidati.find((c) => c.id === 'rand-scris');
  t('3 rand-scris: B1 măsoară tăietura pe literă și trece (era 97,87 %)', cod(rs, 'B1') && cod(rs, 'B1').trecut && cod(rs, 'B1').valoare >= 0.995, cod(rs, 'B1') && cod(rs, 'B1').motiv);
  t('3 8664: 2 din 6 trec (liniste, crestatura-c); 8676: 1 din 6 (punct-45)', trecute(s1).join() === 'liniste,crestatura-c' && trecute(s2).join() === 'punct-45', `${trecute(s1).join(', ')} | ${trecute(s2).join(', ')}`);
  const c1 = [...s1.candidati, ...s2.candidati].filter((c) => !c.trecut && cod(c, 'C1') && !cod(c, 'C1').trecut).map((c) => c.id);
  t('3 ce mai oprește cel mai des: C1 pe fundalul de accent (2,7:1), la 6 dintre cele 9 picate', c1.length === 6 && c1.every((id) => [...s1.candidati, ...s2.candidati].find((c) => c.id === id).verificari.find((v) => v.cod === 'C1').motiv.includes('pe accent')), c1.join(', '));
  t('3 răspunsul are „normalizari” la fiecare candidat și la fiecare respinsă', [...s1.candidati, ...s2.candidati, ...resp].every((c) => Array.isArray(c.normalizari)) && s1.candidati.find((c) => c.id === 'trei-sferturi').normalizari.length === 3);
}

// 4. aceleași rețete, cu regula C1 respectată: o singură schimbare, culori.principal = paleta.text (cea mai închisă culoare)
{
  const regula = (lista, paleta) => lista.map((r0) => { const r = cl(r0); if (['trei-sferturi', 'etape', 'cadran-45', 'plan-cu-preturi', 'voce-calma'].includes(r.id)) { if (r.culori.accent && r.culori.accent.toLowerCase() === paleta.text.toLowerCase()) r.culori.accent = r.culori.principal; r.culori.principal = paleta.text; } return r; });
  const a1 = await set(regula(RETETE_8664, PALETA_8664), PALETA_8664), a2 = await set(regula(RETETE_8676, PALETA_8676), PALETA_8676);
  const b1 = await set(regula(RETETE_8664, PALETA_8664), PALETA_8664), b2 = await set(regula(RETETE_8676, PALETA_8676), PALETA_8676);
  const h = (o) => o.candidati.map((c) => `${c.id}:${c.trecut}:${c.hash}`).join();
  t('4 cu regula C1: 8664 dă cel puțin 3 din 6', trecute(a1).length >= 3, trecute(a1).join(', '));
  t('4 cu regula C1: 8676 dă cel puțin 3 din 6', trecute(a2).length >= 3, trecute(a2).join(', '));
  t('4 a doua rulare dă aceleași trecute și aceleași hash-uri', h(a1) === h(b1) && h(a2) === h(b2));
}

// 5. pragurile măsurate pe rețetele reale (le primește S2 pentru skill)
{
  const rs = (lat) => { const r = dupa(RETETE_8664, 'rand-scris'); r.id = `rs-${String(lat).replace('.', '')}`; r.gest.latime = lat; return r; };
  const o = await set([rs(0.5), rs(1), rs(1.5)], PALETA_8664); const c = (id) => o.candidati.find((x) => x.id === id);
  t('5 tăietura prin litere: lățimea 0,5 pică M1, 1 pică M3, 1,5 trece tot', !cod(c('rs-05'), 'M1').trecut && cod(c('rs-1'), 'M1').trecut && !cod(c('rs-1'), 'M3').trecut && c('rs-15').trecut);
  const lt = (b) => { const r = dupa(RETETE_8676, 'linia-de-total'); r.id = `lt-${b}`; r.gest.latime = b; r.logotip.detalii[0].grosime = b; return r; };
  const o2 = await set([lt(1), lt(2)], PALETA_8676); const c2 = (id) => o2.candidati.find((x) => x.id === id);
  t('5 bara de ligatură pe un logo pe două rânduri: grosimea 1 pică M3, 2 trece', !cod(c2('lt-1'), 'M3').trecut && c2('lt-2').trecut);
  const dc = (gol) => { const r = dupa(RETETE_8676, 'drum-comun'); r.id = `dc-${String(gol).replace('.', '')}`; r.gest.latime = gol; r.monograma.gol = gol; r.monograma.detalii[0].grosime = gol; r.culori.principal = PALETA_8676.text; return r; };
  const doua = (() => { const r = dupa(RETETE_8676, 'drum-comun'); r.id = 'dc-ca'; r.monograma.litere = 'CA'; r.monograma.aranjare = 'stivuite'; r.monograma.detalii = []; r.culori.principal = PALETA_8676.text; return r; })();
  const o3 = await set([dc(1.5), dc(3.5), doua], PALETA_8676); const c3 = (id) => o3.candidati.find((x) => x.id === id);
  t('5 trei inițiale „lipite” cu bară la bază pică M1 și la golul 3,5; două, „stivuite”, trec', !cod(c3('dc-15'), 'M1').trecut && !cod(c3('dc-35'), 'M1').trecut && c3('dc-ca').trecut);
}

console.log(`\n${n - picate} din ${n} trec`);
process.exit(picate ? 1 : 0);
