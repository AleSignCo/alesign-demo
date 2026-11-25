// Testele secțiunilor „Cererile” și „Tabloul SEO” din spațiul clientului (S3, 25 nov. 2026): node teste/test-spatiu-s3.mjs
// Verifică HTML-ul generat din răspunsurile RPC-urilor spatiu_cereri și tablou_seo (SQL 120–121) și ruta /api/spatiu-cereri, cu baza înlocuită.
process.env.SUPABASE_URL = 'https://test.invalid';
process.env.SUPABASE_KEY = 'cheie-de-test';
import { createRequire } from 'module';
const { cereriHtml, numarCereri, ETAPE_CERERI } = await import('../lib/spatiu-cereri.js');
const { seoHtml, perioadaRo, miscarePozitie } = await import('../lib/spatiu-seo.js');
const { default: ruta } = await import('../api/spatiu-cereri.js');
let tipareRobot = null; try { tipareRobot = createRequire(import.meta.url)(process.env.TIPARE_ROBOT || '../../../standard-specialist/aplicare/unelte/tipare-robot.js').tipareRobot; } catch (e) { tipareRobot = null; }

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };
const TOKEN = 'abcdefabcdefabcdefabcdef';
const text = (h) => h.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// 1. Cererile
const C = { activ: true, medical: false, zile: 90, numar: { toate: 3, noua: 2, contactat: 0, programat: 1, finalizat: 0, anulat: 0 },
  surse: [{ sursa: 'reclamă Google', n: 2 }, { sursa: 'fără sursă marcată', n: 1 }],
  cereri: [
    { id: 11, la: '2026-11-24T09:15:00Z', nume: 'Ioana <b>Pop</b>', telefon: '07•• ••• 222', email: null, are_telefon: true, are_email: false, mesaj: 'Vreau o programare joi.\nDupă ora 17.', pagina: 'https://salon-liniste.ro/contact', sursa: 'reclamă Google', campanie: 'camp-12', etapa: 'noua', recenzie: true },
    { id: 12, la: '2026-11-23T10:00:00Z', nume: 'Dan', telefon: null, email: 'd•••@exemplu.ro', are_telefon: false, are_email: true, mesaj: null, pagina: 'https://salon-liniste.ro/', sursa: null, etapa: 'programat', programat_la: '2026-11-27T14:30:00Z', recenzie: false },
    { id: 13, la: '2026-11-20T10:00:00Z', nume: 'Ana', telefon: '07•• ••• 111', are_telefon: true, are_email: false, pagina: '/servicii', etapa: 'noua' }] };
const h = cereriHtml(C, TOKEN);
t('1 fără formular și fără cereri: secțiunea nu apare', cereriHtml({ activ: false }, TOKEN) === '' && cereriHtml(null, TOKEN) === '');
t('1 titlul numără cererile noi', /<h2 class="h2">Te așteaptă 2 cereri noi\.<\/h2>/.test(h) && /Te așteaptă o cerere nouă\./.test(cereriHtml({ ...C, numar: { toate: 3, noua: 1 } }, TOKEN)) && /Ai răspuns la toate cererile\./.test(cereriHtml({ ...C, numar: { toate: 3, noua: 0 } }, TOKEN)));
t('1 numele din cerere e scăpat (fără HTML străin)', h.includes('Ioana &lt;b&gt;Pop&lt;/b&gt;') && !h.includes('<b>Pop</b>'));
t('1 telefonul apare mascat, cu butonul „Arată contactul”', h.includes('<span class="cr-v" data-cr-tel>07•• ••• 222</span>') && (h.match(/data-cr-arata/g) || []).length >= 3 && !/0744|tel:\+?\d/.test(text(h)));
t('1 pagina și sursa, pe înțeles', /a scris de pe pagina „Contact” · a venit din: reclamă Google · a bifat că vrea cererea de recenzie/.test(h) && /a scris de pe pagina principală/.test(h));
t('1 cele cinci stări, cu cea de acum aleasă', ETAPE_CERERI.length === 5 && /<option value="programat" selected>Programat<\/option>/.test(h) && (h.match(/<option value="noua" selected>/g) || []).length === 2);
t('1 programarea: câmpul de dată vizibil și ora României', /<label class="cr-l cr-data on">[^<]*<input type="datetime-local" data-cr-data value="2026-11-27T16:30">/.test(h) && /Programat pe 27 noiembrie/.test(h));
t('1 rezumatul: totalul și sursele marcate, fără „fără sursă marcată”', /<b>3<\/b> cereri în ultimele 90 de zile/.test(h) && /<b>2<\/b> din reclamă Google/.test(h) && !/fără sursă marcată/.test(h));
t('1 scriptul are tokenul și ruta lui; stilul vine cu secțiunea', h.includes(`var T = "${TOKEN}";`) && h.includes("fetch('/api/spatiu-cereri'") && /<style>[\s\S]*\.cr-sus/.test(h));
t('1 fără cereri: mesajul de început, fără script', (() => { const g = cereriHtml({ activ: true, cereri: [], numar: { toate: 0, noua: 0 } }, TOKEN); return /Încă n-a scris nimeni de pe site\./.test(g) && !/<script>/.test(g); })());
t('1 peste 10 cereri: restul ascunse, cu butonul lor', (() => { const multe = cereriHtml({ ...C, cereri: Array.from({ length: 14 }, (_, i) => ({ ...C.cereri[2], id: 100 + i })) }, TOKEN); return (multe.match(/<div class="card cr" hidden/g) || []).length === 4 && /Arată și celelalte 4/.test(multe); })());
t('1 medical: intervalul preferat', /preferă să fie sunat dimineața/.test(cereriHtml({ ...C, medical: true, cereri: [{ ...C.cereri[2], interval: 'dimineata' }] }, TOKEN)));
t('1 numarCereri', numarCereri(C).noi === 2 && numarCereri(null).toate === 0);

// 2. Tabloul SEO
const S = { activ: true, acces: 'conectat', proprietate: 'https://salon-liniste.ro/', are_date: true, are_harta: true,
  perioada: { de: '2026-11-01', pana: '2026-11-22', de_inainte: '2026-10-01', pana_inainte: '2026-10-22' },
  cautari: [{ cautare: 'coafor Iași Copou', pagina: '/', pozitie: 7.2, afisari: 180, clicuri: 15, cum_cauta: ['coafor iasi copou', 'coafor copou'], pozitie_inainte: 11, afisari_inainte: 90, clicuri_inainte: 4 },
    { cautare: 'vopsit păr Iași', pagina: '/servicii', pozitie: null, afisari: 0, clicuri: 0, cum_cauta: [], pozitie_inainte: 9.3 },
    { cautare: 'tuns copii Iași', pagina: '/servicii', pozitie: 4.1, afisari: 20, clicuri: 2, cum_cauta: [], pozitie_inainte: 4.3 },
    { cautare: 'salon Liniște', pagina: '/', pozitie: 1.4, afisari: 60, clicuri: 30, cum_cauta: [], pozitie_inainte: null }],
  total: { clicuri: 61, afisari: 940, clicuri_inainte: 22, afisari_inainte: 610 },
  pagini: [{ pagina: '/', vizite: 320, apasari: 14, formulare: 3, clicuri_google: 40, vizite_inainte: 210, cereri_inainte: 9 }, { pagina: '/contact', vizite: 1, apasari: 0, formulare: 0, clicuri_google: 0, vizite_inainte: 1, cereri_inainte: 1 }],
  surse: [{ sursa: 'reclamă Google', n: 2 }, { sursa: 'fără sursă marcată', n: 1 }], fisa_google: { stare: 'cerut', cerut_la: '2026-11-26' } };
const s = seoHtml(S);
t('2 Search Console nelegat: secțiunea nu apare', seoHtml({ activ: false }) === '' && seoHtml(null) === '');
t('2 perioada pe înțeles', perioadaRo('2026-11-01', '2026-11-22') === '1–22 noiembrie' && perioadaRo('2026-10-28', '2026-11-03') === '28 octombrie – 3 noiembrie' && perioadaRo('', '') === '');
t('2 mișcarea poziției: un număr mai mic înseamnă mai sus', miscarePozitie(7.2, 11) === 'mai sus decât luna trecută (11,0)' && miscarePozitie(9, 5) === 'mai jos decât luna trecută (5,0)' && miscarePozitie(4.1, 4.3) === 'la fel ca luna trecută (4,3)' && miscarePozitie(1.4, null) === 'luna trecută nu apărea' && miscarePozitie(null, 9.3) === 'luna trecută: 9,3' && miscarePozitie(null, null) === '');
t('2 fiecare căutare din hartă, cu poziția ei sau „încă nu apare”', /<span class="c">coafor Iași Copou<\/span>/.test(s) && /<span class="seo-p">7,2<\/span><span class="m">mai sus decât luna trecută \(11,0\)<\/span>/.test(s) && /<span class="seo-nu">încă nu apare<\/span><span class="m">luna trecută: 9,3<\/span>/.test(s));
t('2 formele în care caută oamenii, fără căutarea însăși', /oamenii scriu și: „coafor copou”/.test(s) && !/oamenii scriu și: „coafor iasi copou”, „coafor iasi copou”/.test(s));
t('2 totalul și comparația cu aceleași zile', /<b>61<\/b>clicuri din Google/.test(s) && /<b>940<\/b>afișări în căutări/.test(s) && /<b>22<\/b>clicuri în 1–22 octombrie/.test(s));
t('2 cererile pe pagini, cu singularul corect', /<span class="c">Pagina principală<\/span><span class="m">luna trecută, în aceleași zile: 210 vizite și 9 cereri; acum 17<\/span>/.test(s) && /1 vizită și 1 cerere</.test(s));
t('2 sursele cererilor și fișa Google cu data cererii', /<span>reclamă Google<\/span><span class="m">2 cereri<\/span>/.test(s) && /Am cerut accesul pe 26 noiembrie\./.test(s) && /Google Business Profile/.test(s));
t('2 fără promisiuni și fără jargon', !/top \d|locul 1\b|primul loc|garant|ranking|SERP|CTR|impresii|keyword/i.test(text(s)));
const inceput = seoHtml({ activ: true, acces: 'conectat', proprietate: 'sc-domain:salon-liniste.ro', are_date: false, are_harta: true, cautari: [{ cautare: 'coafor Iași Copou', pagina: '/', pozitie: null }], fisa_google: { stare: 'necerut' } });
t('2 fără date încă: căutările urmărite, fără cifre', /Google încă adună primele cifre\./.test(inceput) && /pentru salon-liniste\.ro/.test(inceput) && /încă nu apare/.test(inceput) && !/seo-tot/.test(inceput.replace(/<style>[\s\S]*?<\/style>/, '')));
t('2 accesul scos: îi spun ce s-a întâmplat și ce facem', /Google nu mă mai lasă să citesc cifrele site-ului tău\./.test(seoHtml({ ...S, acces: 'expira' })) && !/Google nu mă mai lasă/.test(s));
t('2 fără hartă aprobată', /Harta căutărilor tale nu e încă aprobată\./.test(seoHtml({ ...S, are_harta: false, cautari: [] })));

// 3. textele trec de detectorul de tipare (Standardul de scris, §6)
if (tipareRobot) for (const [nume, html] of [['Cererile', h], ['Tabloul SEO', s], ['Tabloul SEO la început', inceput]]) {
  const r = tipareRobot(text(html).replace(/Ioana.*?Pop/, 'Ioana Pop'), { tip: 'spatiu', adresare: 'tu' });
  t(`3 tipare de robot: ${nume}`, (r.opresc || []).length === 0, (r.opresc || []).map((x) => `${x.cod}: ${x.fragment}`).join(' | '));
} else t('3 tipare de robot: detectorul nu e la îndemână (sări)', true);

// 4. ruta /api/spatiu-cereri, cu baza înlocuită
{ const apeluri = []; let raspuns = { ok: true, status: 200, corp: { id: 11, telefon: '0744111222', email: null } };
  globalThis.fetch = async (u, o) => { apeluri.push({ u: String(u), corp: JSON.parse(o.body) }); return { ok: raspuns.ok, status: raspuns.status, text: async () => JSON.stringify(raspuns.corp) }; };
  const cere = async (body, metoda = 'POST') => { const res = { cod: 0, j: null, setHeader() {}, status(c) { this.cod = c; return this; }, json(j) { this.j = j; return this; } }; await ruta({ method: metoda, body, headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'user-agent': 'test' } }, res); return res; };
  t('4 doar POST', (await cere({}, 'GET')).cod === 405);
  t('4 fără token sau fără cerere: refuz, fără apel la bază', (await cere({ token: 'scurt', actiune: 'contact', cerere_id: 11 })).cod === 400 && (await cere({ token: TOKEN, actiune: 'altceva', cerere_id: 11 })).cod === 400 && apeluri.length === 0);
  const c1 = await cere({ token: TOKEN, actiune: 'contact', cerere_id: 11 });
  t('4 contactul: RPC-ul lui, cu IP-ul, și telefonul întreg în răspuns', c1.cod === 200 && c1.j.ok && c1.j.telefon === '0744111222' && apeluri[0].u.endsWith('/rpc/spatiu_cerere_contact') && apeluri[0].corp.p_ip === '1.2.3.4' && apeluri[0].corp.p_cerere_id === 11);
  raspuns = { ok: true, status: 200, corp: null };
  t('4 contactul unei cereri ieșite din listă', (await cere({ token: TOKEN, actiune: 'contact', cerere_id: 99 })).cod === 404);
  raspuns = { ok: true, status: 200, corp: { id: 11, etapa: 'programat', programat_la: '2026-11-27T14:30:00+00:00' } };
  const e1 = await cere({ token: TOKEN, actiune: 'etapa', cerere_id: 11, etapa: 'programat', programat_la: '2026-11-27T14:30:00.000Z' });
  const ultim = apeluri[apeluri.length - 1];
  t('4 starea: RPC-ul lui, cu data programării', e1.cod === 200 && e1.j.etapa === 'programat' && ultim.u.endsWith('/rpc/spatiu_cerere_etapa') && ultim.corp.p_etapa === 'programat' && ultim.corp.p_programat_la === '2026-11-27T14:30:00.000Z');
  t('4 o stare care nu există nu ajunge la bază', (await cere({ token: TOKEN, actiune: 'etapa', cerere_id: 11, etapa: 'castigat' })).cod === 400 && apeluri[apeluri.length - 1] === ultim);
  raspuns = { ok: false, status: 400, corp: { message: 'alege ziua și ora programării' } };
  const e2 = await cere({ token: TOKEN, actiune: 'etapa', cerere_id: 11, etapa: 'programat' });
  t('4 mesajul bazei, spus pe înțeles', e2.cod === 400 && e2.j.motiv === 'Alege ziua și ora programării, apoi salvează.');
  raspuns = { ok: false, status: 500, corp: { message: 'permission denied for table cereri_site' } };
  const e3 = await cere({ token: TOKEN, actiune: 'etapa', cerere_id: 11, etapa: 'anulat' });
  t('4 o eroare necunoscută nu ajunge la client cu vorbele bazei', e3.j.ok === false && /^Nu s-a trimis\./.test(e3.j.motiv) && !/permission|cereri_site/.test(e3.j.motiv));
}

console.log(`\n${n - picate} / ${n} trec`);
process.exit(picate ? 1 : 0);
