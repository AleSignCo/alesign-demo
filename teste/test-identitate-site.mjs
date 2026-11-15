// Testele legăturii identitate → site (15 nov. 2026): node teste/test-identitate-site.mjs
// Verifică regula, nu pixelii: culorile din Dosar · brand.jetoane intră în șablon doar dacă trec contrastul; altfel rămâne înfățișarea nișei.
import { randeazaSite, infatisareCuIdentitate, contrastCulori, NISE } from '../lib/sablon.js';

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };

const N0 = NISE.salon;
const cuJetoane = (culori, extra = {}) => ({ firma: 'Salon Test', nisa: 'salon', identitate: { firma: 'Salon Test', nisa: 'salon' }, brand: { jetoane: { culori, ...extra } } });
const PERECHI = (c) => [[c.cerneala, c.fundal, 7], [c.cerneala, c.suprafata, 7], [c.mut, c.fundal, 4.5], [c.mut, c.suprafata, 4.5], [c.accent, c.fundal, 4.5], [c.accent, c.suprafata, 4.5], [c.accentText, c.accent, 4.5]];
const toateTrec = (c) => PERECHI(c).every(([a, b, prag]) => contrastCulori(a, b) >= prag);

// 1. fără identitate în Dosar: înfățișarea nișei, neatinsă
const r1 = infatisareCuIdentitate(N0, { brand: {} });
t('1 fără jetoane: înfățișarea nișei', r1.folosita === false && r1.N === N0 && /nu are identitate/.test(r1.motive[0]));
t('1 Dosar gol sau lipsă: nu aruncă', infatisareCuIdentitate(N0, null).N === N0 && infatisareCuIdentitate(N0, {}).N === N0);

// 2. paletă deschisă, bună: intră toată
const buna = { fundal: '#F6F1EA', text: '#1F1A17', baza: '#7A3E2B', accent: '#C8A15A', neutre: ['#FBF8F4', '#E9E1D6', '#B9AD9F', '#6E635A', '#2B2420'] };
const r2 = infatisareCuIdentitate(N0, cuJetoane(buna, { raza_colt_px: 16 }));
t('2 paletă bună: folosită', r2.folosita === true && r2.N.culori.fundal === '#f6f1ea' && r2.N.culori.cerneala === '#1f1a17' && r2.N.culori.accent === '#7a3e2b');
t('2 toate perechile trec contrastul', toateTrec(r2.N.culori), JSON.stringify(r2.N.culori));
t('2 textul stins vine din neutrele clientului', r2.N.culori.mut === '#6e635a', r2.N.culori.mut);
t('2 raza: 16 px la carduri, butoanele rămân ale nișei', r2.N.raza === '16px' && r2.N.razaB === N0.razaB);
t('2 fonturile și așezarea rămân ale nișei', r2.N.titlu === N0.titlu && r2.N.corp === N0.corp && r2.N.local === N0.local && r2.N.erou === N0.erou);
t('2 înfățișarea nișei nu a fost modificată', N0.culori.fundal === '#fbf7f3' && N0.raza === '22px');

// 3. textul nu se citește pe fundal: nu intră nimic
const r3 = infatisareCuIdentitate(N0, cuJetoane({ ...buna, text: '#8A7F76' }));
t('3 text slab pe fundal: înfățișarea nișei, cu motiv', r3.folosita === false && r3.N === N0 && /contrast/.test(r3.motive[0]), r3.motive[0]);

// 4. culoarea de bază prea deschisă: se ia accentul; dacă nici el, baza apropiată de text
const r4 = infatisareCuIdentitate(N0, cuJetoane({ ...buna, baza: '#F2C94C', accent: '#5A2E8C' }));
t('4 bază prea deschisă: butoanele iau culoarea de accent', r4.folosita && r4.N.culori.accent === '#5a2e8c' && toateTrec(r4.N.culori));
const r4b = infatisareCuIdentitate(N0, cuJetoane({ ...buna, baza: '#F2C94C', accent: '#F7D9A0' }));
t('4 bază și accent prea deschise: baza apropiată de text, cu motiv', r4b.folosita && r4b.N.culori.accent !== '#f2c94c' && toateTrec(r4b.N.culori) && r4b.motive.length > 0, `${r4b.N.culori.accent} · ${r4b.motive.join('; ')}`);

// 5. paletă închisă
const inchisa = { fundal: '#14110F', text: '#F3EBDD', baza: '#D9A24A', accent: '#8FB8A8', neutre: ['#F3EBDD', '#CFC4B2', '#9C917F', '#4A4238', '#221D19'] };
const r5 = infatisareCuIdentitate(NISE.local, cuJetoane(inchisa));
t('5 paletă închisă: folosită, perechile trec', r5.folosita && toateTrec(r5.N.culori), JSON.stringify(r5.N.culori));
t('5 cardurile sunt mai deschise decât fundalul', contrastCulori(r5.N.culori.suprafata, '#000000') > contrastCulori(r5.N.culori.fundal, '#000000'));
t('5 textul de pe buton e închis pe un buton deschis', contrastCulori(r5.N.culori.accentText, r5.N.culori.accent) >= 4.5);

// 6. coduri greșite
t('6 cod care nu e culoare: înfățișarea nișei', infatisareCuIdentitate(N0, cuJetoane({ ...buna, fundal: 'crem cald' })).folosita === false);
t('6 cod scurt și fără diez: acceptate', infatisareCuIdentitate(N0, cuJetoane({ ...buna, fundal: 'fff', text: '111' })).N.culori.fundal === '#ffffff');
t('6 neutre lipsă sau stricate: tot merge', (() => { const r = infatisareCuIdentitate(N0, cuJetoane({ ...buna, neutre: ['x', null] })); return r.folosita && toateTrec(r.N.culori); })());

// 7. raza
t('7 colțuri drepte: și butoanele', (() => { const r = infatisareCuIdentitate(N0, cuJetoane(buna, { raza_colt_px: 0 })); return r.N.raza === '0px' && r.N.razaB === '0px'; })());
t('7 rază prea mare: limitată la 28 px', infatisareCuIdentitate(N0, cuJetoane(buna, { raza_colt_px: 99 })).N.raza === '28px');
t('7 rază lipsă sau negativă: a nișei', infatisareCuIdentitate(N0, cuJetoane(buna)).N.raza === N0.raza && infatisareCuIdentitate(N0, cuJetoane(buna, { raza_colt_px: -4 })).N.raza === N0.raza);

// 8. în pagină
const piesa = { site: { acasa: { inceput: { titlu: 'Coafură fără grabă', subtitlu: 'O oră doar pentru tine.', buton: 'Programează-te' } }, contact: { telefon: '0700 000 000' }, indemn: { text: 'Programează-te', tip: 'telefon', tinta: '0700 000 000' } } };
const pag = (dosar, opt = {}) => randeazaSite(piesa, dosar, { mod: 'static', pagina: 'acasa', baza: 'https://salon-test.ro', fonturi: '/_f', ...opt });
const cuId = pag(cuJetoane(buna, { raza_colt_px: 16 }));
const faraId = pag(cuJetoane(buna), { fara_identitate: true });
const fara = pag({ firma: 'Salon Test', nisa: 'salon', identitate: { firma: 'Salon Test', nisa: 'salon' }, brand: {} });
t('8 pagina poartă culorile clientului', /--fundal:#f6f1ea;/.test(cuId) && /--cerneala:#1f1a17;/.test(cuId) && /--accent:#7a3e2b;/.test(cuId) && /--raza:16px/.test(cuId));
t('8 fără identitate: culorile nișei', /--fundal:#fbf7f3;/.test(fara) && /--accent:#a8594b;/.test(fara));
t('8 fara_identitate: culorile nișei, deși Dosarul are identitate', /--fundal:#fbf7f3;/.test(faraId));
t('8 restul paginii e identic (doar rândul de culori diferă)', cuId.replace(/:root\{[^}]*\}/, '') === fara.replace(/:root\{[^}]*\}/, ''));
t('8 paletă respinsă: pagina rămâne pe nișă', /--fundal:#fbf7f3;/.test(pag(cuJetoane({ ...buna, text: '#8A7F76' }))));

// 9. invariant: pe 2.000 de palete la întâmplare, tot ce e folosit trece contrastul și nimic nu aruncă
let rnd = 20261115; const u = () => { rnd = (rnd * 1664525 + 1013904223) % 4294967296; return rnd / 4294967296; };
const hex = () => '#' + [0, 0, 0].map(() => Math.floor(u() * 256).toString(16).padStart(2, '0')).join('');
let folosite = 0, rele = 0, aruncate = 0;
for (let i = 0; i < 2000; i++) {
  try {
    const r = infatisareCuIdentitate(Object.values(NISE)[i % 6], cuJetoane({ fundal: hex(), text: hex(), baza: hex(), accent: hex(), neutre: [hex(), hex(), hex(), hex(), hex()] }, { raza_colt_px: Math.floor(u() * 40) }));
    if (r.folosita) { folosite++; if (!toateTrec(r.N.culori)) rele++; } else if (r.N.identitate) rele++;
  } catch (e) { aruncate++; }
}
t('9 2.000 de palete la întâmplare: nicio pereche sub prag, nicio excepție', rele === 0 && aruncate === 0 && folosite > 0, `${folosite} folosite, ${rele} cu pereche picată, ${aruncate} excepții`);

console.log(`\n${n - picate} / ${n} trec`);
process.exit(picate ? 1 : 0);
