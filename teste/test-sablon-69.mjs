// Testele șablonului după constatările testului valului (sarcina 69, 6 nov. 2026): node teste/test-sablon-69.mjs
// Verifică HTML-ul generat (static și previzualizare), nu pixelii: antetul, adresarea, panourile goale, programul, grilele, fonturile, prețurile din text.
import { randeazaSite, eFormal, paginiStatice } from '../lib/sablon.js';
import { serviciiDin, fapteQa, aplicaFapte } from '../lib/site-build.js';

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };

const piesa = { site: {
  acasa: { inceput: { titlu: 'Medicină generală în București, fără grabă', subtitlu: 'La Cabinet Dr. Radu aveți 30 de minute cu medicul.', buton: 'Sunați acum' },
    de_ce: { titlu: 'De ce Cabinet Dr. Radu', puncte: [{ titlu: '30 de minute', text: 'Aveți timp real cu medicul.' }, { titlu: 'Explicații', text: 'Pe înțelesul dumneavoastră.' }, { titlu: 'Loc', text: 'În aceeași săptămână.' }] },
    servicii: { titlu: 'Serviciile cabinetului', lista: [{ nume: 'Consultație medicină generală', text: 'Aveți 30 de minute.' }, { nume: 'Consultație de control', text: 'Când reveniți.' }, { nume: 'EKG cu interpretare', text: 'Rezultatul vine cu interpretare.' }, { nume: 'Recoltare analize uzuale', text: 'Probe.' }, { nume: 'Certificat medical', text: 'Sport, angajare.' }] },
    cum_decurge: { titlu: 'Cum decurge o vizită', pasi: [{ titlu: 'Sunați', text: 'Stabiliți ziua.' }, { titlu: 'Consultația', text: '30 de minute.' }, { titlu: 'Explicațiile', text: 'Ce urmează.' }, { titlu: 'Planul', text: 'Pas cu pas.' }] },
    despre_scurt: { titlu: 'Despre cabinet', text: 'Cabinet Dr. Radu este un cabinet medical din București.' },
    intrebari: [{ q: 'Cum fac o programare?', a: 'Sunați la cabinet.' }], contact: { titlu: 'Programarea se face prin telefon', text: 'Sunați la cabinet și stabiliți ziua.' } },
  servicii: { intro: { titlu: 'Serviciile cabinetului', text: 'Prețuri valabile la 16 octombrie 2026.' }, lista: [{ nume: 'Consultație medicină generală', pret: '250 lei', text: 'Aveți 30 de minute.' }, { nume: 'Consultație de control', pret: '150 lei', text: 'Când reveniți.' }, { nume: 'EKG cu interpretare', pret: '120 lei', text: 'Cu interpretare.' }, { nume: 'Recoltare analize uzuale', pret: 'de la 80 lei', text: 'Probe.' }, { nume: 'Certificat medical', pret: '100 lei', text: 'Sport, angajare.' }] },
  despre: { povestea: { titlu: 'Cabinet Dr. Radu', text: 'Dr. Andrei Radu vă primește la consultație.' }, cum_lucram: { titlu: 'Cum lucrăm', puncte: [{ titlu: 'Timp real', text: '30 de minute.' }, { titlu: 'Explicații clare', text: 'Pe înțelesul dumneavoastră.' }, { titlu: 'Plan', text: 'Pas cu pas.' }, { titlu: 'Programare telefonică', text: 'Doar prin telefon.' }] }, cu_cine: { titlu: 'Pentru cine', text: 'Pentru dumneavoastră.' } },
  contact: { titlu: 'Sunați la cabinet', text: 'Programările se fac doar prin telefon.', telefon: '0744 387 384', email: 'cabinet.radu@gmail.com', adresa: 'Str. Exemplu 1, București', program: 'Luni–Vineri 09:00-18:00\nSâmbătă 09:00-13:00\nDuminică închis' } },
  indemn: { text: 'Sunați acum', tip: 'telefon', tinta: '0744 387 384' }, poze: [{ pagina: 'Acasă', sectiune: 'inceput', brief: 'Sala de consultație' }, { pagina: 'Despre', sectiune: 'povestea', brief: 'Medicul în cabinet' }] };
const dosar = { firma: 'Cabinet Dr. Radu', nisa: 'cabinet medical', identitate: { firma: 'Cabinet Dr. Radu', nisa: 'cabinet medical', telefon: '0744 387 384', email: 'cabinet.radu@gmail.com', reglementat: 'medical' },
  brand: { ton: 'elegant', altceva: 'Adresare cu „dumneavoastră”, ton calm și clar.' }, poze: [{ url: '/img/sala.webp', alt: 'Sala de consultație', w: 1200, h: 900 }],
  oferta: { servicii: 'Consultație medicină generală · 250 lei\nConsultație de control · 150 lei\nEKG cu interpretare · 120 lei\nRecoltare analize uzuale · de la 80 lei\nCertificat medical (sport, angajare) · 100 lei', vedeta: 'Consultația' } };
const st = (pagina, d = dosar, p = piesa) => randeazaSite(p, d, { mod: 'static', pagina, baza: 'https://cabinet-radu.ro', fonturi: '/_f' });

// 1. adresarea: din briefului Dosarului (fără câmpul explicit) → „sau sunați:”
t('1 eFormal din brief', eFormal(dosar, piesa.site) === true);
t('1 eFormal explicit tu', eFormal({ adresare: 'tu', brand: dosar.brand }, piesa.site) === false);
t('1 eFormal din texte (fără brief)', eFormal({}, piesa.site) === true && eFormal({}, { acasa: { inceput: { subtitlu: 'Sună și vino, îți explicăm tot.' } } }) === false);
const acasa = st('acasa');
t('1 Acasă: „sau sunați:”, fără „sau sună:”', /sau sunați:/.test(acasa) && !/sau sună:/.test(acasa));

// 2. antetul: marca + nav cu 4 linkuri + două butoane (unul în nav, unul în afară), CSS-ul pentru ≤ 600 px cu rânduri
t('2 antet: marca, nav, 4 linkuri, 2 butoane', (acasa.match(/<a class="marca"/g) || []).length === 1 && /<nav class="nav"/.test(acasa) && (acasa.match(/<nav class="nav"[^>]*>(.*?)<\/nav>/)[1].match(/<a href=/g) || []).length === 4 && (acasa.match(/<nav class="nav"[^>]*>(.*?)<\/nav>/)[1].match(/class="b mic"/g) || []).length === 1 && (acasa.match(/class="b mic"/g) || []).length === 2);
t('2 CSS ≤ 600: nav pe rândul lui, butonul din afară vizibil, butonul din nav ascuns', /@media\(max-width:600px\)[^}]*}[\s\S]*?\.sus \.b\{display:inline-flex;min-height:44px;order:2\}\.nav\{flex-basis:100%;order:3/.test(acasa) && /\.nav \.b\{display:none\}\}/.test(acasa));
t('2 CSS ≤ 900: fără overflow:auto pe nav, linkuri de 44 px', !/\.nav\{[^}]*overflow:auto/.test(acasa) && /\.nav a\{min-height:44px/.test(acasa));

// 3. panourile goale: Acasă · Despre fără a doua poză → o coloană; pagina Despre fără a doua poză → o coloană, fără poza din erou
t('3 Acasă: eroul are poza, secțiunea Despre e pe o coloană', /<section class="erou split"><div class="w">/.test(acasa) && /<section class="despre"><div class="w una">/.test(acasa) && (acasa.match(/<div class="poza">/g) || []).length === 1);
const despre = st('despre');
t('3 Despre: o coloană, nicio poză repetată', /<section class="despre"><div class="w una">/.test(despre) && !/<div class="poza">/.test(despre) && !/sala\.webp/.test(despre));
const cuDoua = st('despre', { ...dosar, poze: [...dosar.poze, { url: '/img/medic.webp', alt: 'Medicul', w: 1000, h: 1000 }] });
t('3 Despre cu a doua poză: panou cu poza, două coloane', /<section class="despre"><div class="w">/.test(cuDoua) && /medic\.webp/.test(cuDoua));
const faraPoze = st('acasa', { ...dosar, poze: [] });
t('3 Acasă fără nicio poză: eroul pe o coloană, zero panouri', /<section class="erou split"><div class="w una">/.test(faraPoze) && !/<div class="poza">/.test(faraPoze));
const prev = randeazaSite(piesa, { ...dosar, poze: [] }, { mod: 'preview' });
t('3 previzualizare fără poze: panourile cu briefului rămân (clientul vede ce poză se cere)', (prev.match(/<div class="poza">/g) || []).length >= 2 && /Poză: Sala de consultație/.test(prev));

// 4. programul pe rânduri, intervalele nu se rup
const contact = st('contact');
t('4 program: 3 rânduri, intervale nowrap', /class="randuri">Luni–Vineri <span class="nw">09:00–18:00<\/span><br>Sâmbătă <span class="nw">09:00–13:00<\/span><br>Duminică închis</.test(contact), (contact.match(/class="randuri">[^<]*(?:<[^>]+>[^<]*)*?<\/b>/) || [''])[0].slice(0, 160));

// 5. grilele: 3 puncte → n3, 5 servicii → n5 (rând centrat), 4 puncte „Cum lucrăm” → n4 (4 coloane, apoi 2×2)
t('5 grile n3 / n5 / n4', /class="g3 n3"/.test(acasa) && /class="g3 n5"/.test(acasa) && /class="g3 n4"/.test(despre) && /\.g3\.n5 \.c:nth-child\(5\)\{grid-column:4 \/ span 2\}/.test(acasa) && /\.g3\.n4\{grid-template-columns:repeat\(4,1fr\)\}/.test(acasa));
const servicii = st('servicii');
t('5 Servicii: 5 carduri pe 2 coloane, ultimul impar ia tot rândul (CSS)', (servicii.match(/<div class="c" id=/g) || []).length === 5 && /\.g2 \.c:last-child:nth-child\(odd\)\{grid-column:1 \/ -1\}/.test(servicii));

// 6. fonturile: două preload-uri (corp + titlu)
t('6 preload: titlu + corp', (acasa.match(/<link rel="preload" href="\/_f\/[a-z-]+\/latin-\d+-normal\.woff2" as="font"/g) || []).length === 2);

// 7. prețurile din Dosar scrise ca text (pagina de pornire) → A1 le vede
const sv = serviciiDin(dosar.oferta);
t('7 serviciiDin text: 5 servicii cu preț', sv.length === 5 && sv[0].nume === 'Consultație medicină generală' && sv[0].pret === '250 lei' && sv[3].pret === 'de la 80 lei' && sv[4].nume === 'Certificat medical (sport, angajare)', JSON.stringify(sv.slice(0, 2)));
t('7 serviciiDin listă: neschimbată', serviciiDin({ servicii: [{ nume: 'X', pret: '10 lei' }] })[0].pret === '10 lei');
t('7 fapteQa.preturi din text', JSON.stringify(fapteQa(dosar).preturi) === JSON.stringify(['250 lei', '150 lei', '120 lei', 'de la 80 lei', '100 lei']));
t('7 aplicaFapte: prețul din text ajunge în pagina Servicii', aplicaFapte(piesa, { ...dosar, oferta: { servicii: 'Consultație medicină generală · 260 lei' } }).site.servicii.lista[0].pret === '260 lei');

// 8. toate paginile statice se generează, fără „Numele firmei”, cu noindex doar în previzualizare
const pagini = paginiStatice(piesa, dosar, { baza: 'https://cabinet-radu.ro', fonturi: '/_f' });
t('8 pagini statice: 5 (4 + 404), fără umplutură', pagini.length === 5 && pagini.every((p) => !/Numele firmei|undefined|\[object/.test(p.html)));

console.log(`\n${n - picate} / ${n} trec`);
process.exit(picate ? 1 : 0);
