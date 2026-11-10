// Testele șablonului după constatările testului valului (sarcina 69, 6 nov. 2026): node teste/test-sablon-69.mjs
// Verifică HTML-ul generat (static și previzualizare), nu pixelii: antetul, adresarea, panourile goale, programul, grilele, fonturile, prețurile din text.
import { randeazaSite, eFormal, paginiStatice, stivaCuRezerve, NISE } from '../lib/sablon.js';
import { serviciiDin, fapteQa, aplicaFapte, construiesteSite, dosarPentruBuild, pozePentruBuild, LATIME_MAX } from '../lib/site-build.js';

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
t('3 Acasă: eroul are poza, secțiunea Despre e pe o coloană', /<section class="erou split"><div class="w">/.test(acasa) && /<section class="despre"><div class="w una ed">/.test(acasa) && (acasa.match(/<div class="poza">/g) || []).length === 1);
const despre = st('despre');
t('3 Despre: așezare editorială (titlu | text), nicio poză repetată', /<section class="despre"><div class="w una ed"><div><p class="ochi">Despre<\/p><h1[^>]*>Cabinet Dr\. Radu<\/h1><\/div><div class="lead">/.test(despre) && !/<div class="poza">/.test(despre) && !/sala\.webp/.test(despre));
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
t('5 Servicii cu toate descrierile: 5 carduri pe 2 coloane, ultimul impar ia tot rândul (CSS)', (servicii.match(/<div class="c" id=/g) || []).length === 5 && !/class="lp"/.test(servicii) && /\.g2 \.c:last-child:nth-child\(odd\)\{grid-column:1 \/ -1\}/.test(servicii));

// 6. fonturile: două preload-uri (corp + titlu)
t('6 preload: titlul la 600 (h1), corpul la 400', (acasa.match(/<link rel="preload" href="\/_f\/[a-z-]+\/latin-\d+-normal\.woff2" as="font"/g) || []).length === 2 && /preload" href="\/_f\/fraunces\/latin-600-normal\.woff2"/.test(acasa) && /preload" href="\/_f\/inter\/latin-400-normal\.woff2"/.test(acasa));

// 7. prețurile din Dosar scrise ca text (pagina de pornire) → A1 le vede
const sv = serviciiDin(dosar.oferta);
t('7 serviciiDin text: 5 servicii cu preț', sv.length === 5 && sv[0].nume === 'Consultație medicină generală' && sv[0].pret === '250 lei' && sv[3].pret === 'de la 80 lei' && sv[4].nume === 'Certificat medical (sport, angajare)', JSON.stringify(sv.slice(0, 2)));
t('7 serviciiDin listă: neschimbată', serviciiDin({ servicii: [{ nume: 'X', pret: '10 lei' }] })[0].pret === '10 lei');
t('7 fapteQa.preturi din text', JSON.stringify(fapteQa(dosar).preturi) === JSON.stringify(['250 lei', '150 lei', '120 lei', 'de la 80 lei', '100 lei']));
t('7 aplicaFapte: prețul din text ajunge în pagina Servicii', aplicaFapte(piesa, { ...dosar, oferta: { servicii: 'Consultație medicină generală · 260 lei' } }).site.servicii.lista[0].pret === '260 lei');

// 8. toate paginile statice se generează, fără „Numele firmei”, cu noindex doar în previzualizare
const pagini = paginiStatice(piesa, dosar, { baza: 'https://cabinet-radu.ro', fonturi: '/_f' });
t('8 pagini statice: 5 (4 + 404), fără umplutură', pagini.length === 5 && pagini.every((p) => !/Numele firmei|undefined|\[object/.test(p.html)));

// 9. subsolul legal (L4) și pictograma SAL (L6): datele legale din Dosar sau din contract; pictograma în caseta de 250×50, din manifestul build-ului, la 1×–3×
{ const legal = { denumire: 'Cabinet Dr. Radu', cui: '12345678', reg_com: 'J40/1234/2020', sediu: 'Str. Exemplu 1, București', b2c: true };
  const sal = { url: '/img/aaaa.webp', srcset: '/img/aaaa.webp 1x, /img/bbbb.webp 2x, /img/cccc.webp 3x' };
  const h = randeazaSite(piesa, { ...dosar, legal }, { mod: 'static', pagina: 'acasa', baza: 'https://cabinet-radu.ro', fonturi: '/_f', sal });
  const subsol = (h.match(/<footer>[\s\S]*<\/footer>/) || [''])[0]; const text = subsol.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  t('9 subsol: CUI, Reg. Com., sediu', /CUI 12345678/.test(subsol) && /J40\/1234\/2020/.test(subsol) && /Sediu: Str\. Exemplu 1/.test(subsol));
  t('9 subsol: nimic repetat (firma o dată, adresa o dată, ca „Sediu”)', (text.match(/Cabinet Dr\. Radu/g) || []).length === 1 && (text.match(/Str\. Exemplu 1/g) || []).length === 1, text.slice(0, 200));
  t('9 subsol: niciun „·” agățat înaintea pictogramei', !/·\s*<\/p>/.test(subsol) && !/·\s*<a class="sal"/.test(subsol));
  t('9 SAL: link reclamatiisal, 250×50, srcset 1×–3×, lazy', /<a class="sal" href="https:\/\/reclamatiisal\.anpc\.ro\/"[^>]*><img src="\/img\/aaaa\.webp" srcset="\/img\/aaaa\.webp 1x, \/img\/bbbb\.webp 2x, \/img\/cccc\.webp 3x" width="250" height="50" alt="ANPC[^"]*" loading="lazy"/.test(subsol) && /\.sal img\{width:250px;height:50px;object-fit:contain/.test(h));
  const altSediu = randeazaSite(piesa, { ...dosar, legal: { ...legal, denumire: 'Radu Medical SRL', sediu: 'Bd. Unirii 5, București' } }, { mod: 'static', pagina: 'acasa', baza: 'https://cabinet-radu.ro', fonturi: '/_f', sal });
  const t2 = (altSediu.match(/<footer>[\s\S]*<\/footer>/) || [''])[0].replace(/<[^>]+>/g, ' ');
  t('9 subsol: denumirea legală diferită și sediul diferit de punctul de lucru apar amândouă', /Radu Medical SRL/.test(t2) && /Str\. Exemplu 1/.test(t2) && /Sediu: Bd\. Unirii 5/.test(t2));
  const vechi = randeazaSite(piesa, { ...dosar, legal }, { mod: 'static', pagina: 'acasa', baza: 'https://cabinet-radu.ro', fonturi: '/_f', sal_img: '/_alesign/anpc-sal.png' });
  t('9 SAL: forma veche (sal_img, un URL) merge în continuare', /<img src="\/_alesign\/anpc-sal\.png" width="250" height="50"/.test(vechi));
  const fara = randeazaSite(piesa, { ...dosar, legal }, { mod: 'static', pagina: 'acasa', baza: 'https://cabinet-radu.ro', fonturi: '/_f' });
  t('9 fără imagine SAL: rămâne linkul text (L6 pică, corect)', /reclamatiisal\.anpc\.ro\/" rel="noopener" target="_blank">ANPC/.test(fara)); }

// 10. ciclul 2 (9 nov. 2026): marca are țintă de 44 px (M3); ancorele opresc sub antet (N2); Servicii fără descrieri → listă de prețuri, fără carduri goale
t('10 marca: min-height 44 px', /\.marca\{display:flex;align-items:center;gap:12px;min-height:44px/.test(acasa));
t('10 ancore: scroll-padding-top pe desktop, telefon și landscape', /html\{scroll-behavior:smooth;scroll-padding-top:84px\}/.test(acasa) && /@media\(max-width:900px\)\{html\{scroll-padding-top:116px\}\}/.test(acasa) && /max-height:500px\)\{html\{scroll-padding-top:76px\}/.test(acasa));
{ const p2 = JSON.parse(JSON.stringify(piesa)); p2.site.servicii.lista[3].text = ''; p2.site.servicii.lista[4].text = '';
  const s2 = st('servicii', dosar, p2);
  t('10 Servicii cu descrieri lipsă: listă de prețuri, 5 rânduri, niciun <p> gol', /<div class="lp">/.test(s2) && (s2.match(/<div class="r" id=/g) || []).length === 5 && !/<div class="c" id=/.test(s2) && !/<p><\/p>/.test(s2) && /<div class="r" id="recoltare-analize-uzuale"><h2 class="t3">Recoltare analize uzuale<\/h2><p class="pret">de la 80(?: |&nbsp;)lei<\/p><\/div>/.test(s2), (s2.match(/<div class="r" id="recoltare[^]*?<\/div>/) || [''])[0]); }

// 11. P2: fonturile de rezervă potrivite (size-adjust) și lățimile de text fără unitatea ch
t('11 rezerve: @font-face cu size-adjust pentru titlu și corp, câte 3 familii × 2 greutăți', (acasa.match(/@font-face\{font-family:'Fraunces r\d';font-weight:(?:100 500|600 900);src:local\([^}]+size-adjust:[\d.]+%\}/g) || []).length === 6 && (acasa.match(/@font-face\{font-family:'Inter r\d';[^}]+size-adjust:[\d.]+%\}/g) || []).length === 6);
t('11 stiva: fontul site-ului, rezervele, apoi restul', stivaCuRezerve("'Fraunces', Georgia, serif") === "'Fraunces','Fraunces r1','Fraunces r2','Fraunces r3',Georgia,serif" && stivaCuRezerve('Necunoscut, serif') === 'Necunoscut, serif' && /body\{[^}]*font-family:'Inter','Inter r1','Inter r2','Inter r3',system-ui,sans-serif/.test(acasa));
t('11 nicio lățime în ch (depinde de fontul de rezervă)', !/\d+ch[;}]/.test(acasa) && /--ct:0\.\d+em;--cc:0\.\d+em/.test(acasa) && /\.erou h1\{[^}]*max-width:calc\(16 \* var\(--ct\)\)/.test(acasa));
for (const [cheie, N] of Object.entries(NISE)) t(`11 înfățișarea „${cheie}”: titlul și corpul au rezerve calculate`, /r1/.test(stivaCuRezerve(N.titlu)) && /r1/.test(stivaCuRezerve(N.corp)));

// 12. build: pictograma SAL intră în manifest (D1) ca WebP (P4), pozele au alt-ul scris de bot când Dosarul nu-l are, lățimea maximă acoperă IM1
{ const sharp = await import('sharp').then((m) => m.default).catch(() => null);
  const png = sharp ? await sharp({ create: { width: 680, height: 169, channels: 4, background: '#2a3f8a' } }).png().toBuffer() : Buffer.from('fals');
  const foto = sharp ? await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#c8d6d0' } }).jpeg().toBuffer() : Buffer.from('fals');
  const D = { identitate: { firma: 'Cabinet Dr. Radu', nisa: 'Medical', telefon: '0744 387 384', email: 'cabinet.radu@gmail.com', cui: '12345678', reg_com: 'J40/1234/2020', sediu: 'Str. Exemplu 1, București', denumire_legala: 'Cabinet Dr. Radu' }, brand: { ...dosar.brand, poze: [{ cale: 'x/poze/sala.jpg' }] }, oferta: dosar.oferta, cifre: {} };
  const dB = dosarPentruBuild(D, { firma: 'Cabinet Dr. Radu' }, {});
  t('12 dosarPentruBuild: datele legale din Dosar', dB.legal && dB.legal.cui === '12345678' && dB.legal.b2c === true && dB.firma === 'Cabinet Dr. Radu');
  t('12 dosarPentruBuild: fără CUI în Dosar, din contract (nu la persoană fizică)', dosarPentruBuild({ identitate: { firma: 'X' } }, {}, { client_cui: '999', client_denumire: 'X SRL', client_tip: 'firma' }).legal.cui === '999' && dosarPentruBuild({ identitate: { firma: 'X' } }, {}, { client_cui: '999', client_tip: 'persoana_fizica' }).legal === null);
  const pz = pozePentruBuild(D.brand, { 'x/poze/sala.jpg': 'mem://sala' }, { poze: [{ alt: 'Sala de consultație a cabinetului', sursa: 'brand.poze[0]' }] });
  t('12 pozePentruBuild: alt-ul botului când Dosarul nu are', pz.length === 1 && pz[0].alt === 'Sala de consultație a cabinetului' && pz[0].sursa === 'client' && pz[0].url === 'mem://sala');
  t('12 pozePentruBuild: alt-ul din Dosar câștigă', pozePentruBuild({ poze: [{ cale: 'a', alt: 'Din Dosar' }] }, { a: 'u' }, { poze: [{ alt: 'De la bot', sursa: 'brand.poze[0]' }] })[0].alt === 'Din Dosar');
  if (sharp) {
    const aduce = async (u) => (u === 'mem://sala' ? foto : Buffer.from('wOF2-fals'));
    const rez = await construiesteSite({ piesa, dosar: dB, baza: 'https://cabinet-radu.ro', preview: true, aduce, sharp, sal: png, poze: pz, logo: null });
    const M = rez.manifest; const eSal = M.imagini.find((i) => i.rol === 'pictograma'); const eFoto = M.imagini.find((i) => i.rol === 'poza');
    t('12 manifest: pictograma SAL cu sursă și licență, 3 variante WebP (201, 402, 603)', !!eSal && eSal.sursa === 'grafic' && /ANPC/.test(eSal.licenta) && eSal.variante.map((v) => v.w).join() === '201,402,603' && eSal.variante.every((v) => /^\/img\/[0-9a-f]{16}\.webp$/.test(v.fisier)));
    const acasaB = rez.fisiere.find((f) => f.cale === 'index.html').date; const imgSal = (acasaB.match(/<a class="sal"[^>]*><img[^>]+>/) || [''])[0];
    t('12 pagina: pictograma din /img, cu srcset 1x 2x 3x; niciun /_alesign/anpc-sal.png', eSal.variante.every((v) => imgSal.includes(v.fisier)) && /1x, [^ ]+ 2x, [^ ]+ 3x/.test(imgSal) && !rez.fisiere.some((f) => /anpc-sal/.test(f.cale)) && !/anpc-sal\.png/.test(acasaB));
    t('12 fiecare imagine servită din pagini e în manifest (D1)', [...new Set(rez.fisiere.filter((f) => /\.html$/.test(f.cale)).flatMap((f) => [...String(f.date).matchAll(/\/img\/[0-9a-f]{16}\.webp/g)].map((m) => m[0])))].every((u) => M.imagini.some((i) => i.variante.some((v) => v.fisier === u))));
    t('12 fotografia: variante până la 1.920 px (IM1 la 390 × DPR 3 cere 1.611)', LATIME_MAX === 1920 && eFoto.variante.map((v) => v.w).join() === '480,800,1200,1920' && eFoto.alt === 'Sala de consultație a cabinetului');
    t('12 eroul are alt', /<img src="\/img\/[0-9a-f]{16}\.webp" alt="Sala de consultație a cabinetului"[^>]*fetchpriority="high"/.test(acasaB));
    const fara = await construiesteSite({ piesa, dosar: dB, baza: 'https://cabinet-radu.ro', preview: true, aduce, sharp, poze: pz, logo: null });
    t('12 fără pictogramă: build-ul merge, subsolul are linkul text', !fara.manifest.imagini.some((i) => i.rol === 'pictograma') && /reclamatiisal\.anpc\.ro\/" rel="noopener" target="_blank">ANPC/.test(fara.fisiere.find((f) => f.cale === 'index.html').date));
    const iar = await construiesteSite({ piesa, dosar: dB, baza: 'https://cabinet-radu.ro', preview: true, aduce, sharp, sal: png, poze: pz, logo: null });
    t('12 build determinist: același input, același hash (V5)', iar.build === rez.build && fara.build !== rez.build);
  } else t('12 (sharp lipsește: testele de build sărite)', true);
}

// 13. standardul de specialist (10 nov. 2026): Echipa, textul de sub buton, Mulțumim din hartă, telefon apelabil, WhatsApp cu mesaj
{
  const cu = JSON.parse(JSON.stringify(piesa));
  cu.site.despre.oameni = [{ nume: 'Dr. Andrei Radu', titlu: 'medic', text: 'Vă primește la fiecare consultație.' }, { nume: 'Maria Ionescu', titlu: 'asistentă', text: '' }];
  cu.site.multumim = { titlu: 'Am primit cererea', text: 'Vă sunăm în aceeași zi lucrătoare.' };
  cu.indemn = { ...cu.indemn, dupa: 'Vă răspundem în programul cabinetului.' };
  const despre = st('despre', dosar, cu); const acasa13 = st('acasa', dosar, cu); const mult = st('multumim', dosar, cu);
  t('13 Echipa apare când harta are oameni', /class="echipa"/.test(despre) && despre.includes('Dr. Andrei Radu') && despre.includes('class="rol">medic'));
  t('13 titlul Echipei urmează adresarea', despre.includes('Oamenii pe care îi întâlniți'));
  t('13 omul fără text nu lasă paragraf gol', !/<p><\/p>/.test(despre));
  t('13 fără oameni, Despre rămâne ca înainte', !/class="echipa"/.test(st('despre')));
  t('13 textul de sub buton apare doar când harta îl are', /class="dupa"[^>]*>Vă răspundem în programul cabinetului\./.test(acasa13) && !/class="dupa"/.test(st('acasa')));
  t('13 Mulțumim ia textele din hartă', mult.includes('Am primit cererea') && mult.includes('Vă sunăm în aceeași zi lucrătoare.'));
  t('13 Mulțumim de rezervă: fără semn de exclamare', !/Mulțumim!/.test(st('multumim')));
  t('13 telefonul din erou e apelabil', /class="alt"[^>]*>[^<]*<a href="tel:\+40/.test(acasa13));
  const wa = JSON.parse(JSON.stringify(piesa)); wa.indemn = { text: 'Scrieți-ne', tip: 'whatsapp', tinta: '0744 387 384', mesaj: 'Bună ziua, aș dori o programare.' };
  t('13 WhatsApp cu mesaj precompletat', /https:\/\/wa\.me\/40744387384\?text=Bun%C4%83%20ziua/.test(st('acasa', dosar, wa)));
  const wa2 = JSON.parse(JSON.stringify(wa)); delete wa2.indemn.mesaj;
  t('13 WhatsApp fără mesaj rămâne ca înainte', /href="https:\/\/wa\.me\/40744387384"/.test(st('acasa', dosar, wa2)));
}

// 14. galeria, antetul fără text dublat, detaliile serviciului (10 nov. 2026, standardul de specialist)
{
  const pz = (i, alt = 'Poza ' + i) => ({ url: '/img/p' + i + '.webp', alt, w: 1200, h: 900, srcset: '/img/p' + i + '-480.webp 480w, /img/p' + i + '.webp 1200w' });
  const d5 = { ...dosar, poze: [pz(0), pz(1), pz(2), pz(3), pz(4)] };
  const a5 = st('acasa', d5);
  t('14 galeria apare de la a treia poză', /class="galerie"/.test(a5) && /class="gal n3"/.test(a5) && (a5.match(/<figure class="poza">/g) || []).length === 3);
  t('14 pozele din galerie au descriere, dimensiuni și încărcare leneșă', /<figure class="poza"><img src="\/img\/p2\.webp" alt="Poza 2" width="1200" height="900" srcset="[^"]+" sizes="[^"]+" loading="lazy" decoding="async">/.test(a5));
  t('14 primele două poze nu se repetă în galerie', !/<figure class="poza"><img src="\/img\/p[01]\.webp"/.test(a5));
  t('14 o singură poză în plus nu face galerie', !/class="galerie"/.test(st('acasa', { ...dosar, poze: [pz(0), pz(1), pz(2)] })));
  t('14 fără poze în plus, Acasă rămâne fără galerie', !/class="galerie"/.test(st('acasa')));
  t('14 poza fără descriere nu intră pe site-ul publicat', (st('acasa', { ...dosar, poze: [pz(0), pz(1), pz(2), pz(3, ''), pz(4)] }).match(/<figure class="poza">/g) || []).length === 2);
  t('14 cel mult șase poze în galerie', (st('acasa', { ...dosar, poze: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => pz(i)) }).match(/<figure class="poza">/g) || []).length === 6);
  const cuTitlu = JSON.parse(JSON.stringify(piesa)); cuTitlu.site.acasa.galerie = { titlu: 'Cabinetul, pe dinăuntru' };
  t('14 titlul galeriei vine din hartă', /<p class="ochi">Galerie<\/p><h2 class="h2">Cabinetul, pe dinăuntru<\/h2>/.test(st('acasa', d5, cuTitlu)));
  t('14 fără titlu, „Galerie” apare o singură dată', (a5.match(/>Galerie</g) || []).length === 1);
  const faq = acasa.match(/<section><div class="w">(?:<p class="ochi">[^<]*<\/p>)?<h2 class="h2">[^<]*<\/h2><div class="faq">/);
  t('14 la Întrebări titlul nu mai e scris de două ori', !!faq && !/class="ochi"/.test(faq[0]));
  t('14 secțiunile cu titlu propriu păstrează eticheta mică', /<p class="ochi">[^<]+<\/p><h2 class="h2">De ce Cabinet Dr\. Radu<\/h2>/.test(acasa));
  const cuDet = JSON.parse(JSON.stringify(piesa)); cuDet.site.servicii.lista[0].durata = '30 de minute'; cuDet.site.servicii.lista[0].cine = 'Dr. Andrei Radu';
  const serv = st('servicii', dosar, cuDet);
  t('14 durata și omul apar la serviciul care le are', /<p class="det">Durată: 30[^<]*de minute · Cu cine: Dr\.[^<]*Andrei Radu<\/p>/.test(serv) && (serv.match(/class="det"/g) || []).length === 1);
  t('14 fără durată și om, pagina Servicii rămâne ca înainte', !/class="det"/.test(st('servicii')));
  const plin = randeazaSite(piesa, { ...d5, nisa: 'restaurant', identitate: { ...dosar.identitate, nisa: 'restaurant', reglementat: '' } }, { mod: 'static', pagina: 'acasa', baza: 'https://exemplu.ro', fonturi: '/_f' });
  t('14 poza din eroul pe toată lățimea are dimensiuni', !/class="erou plin"/.test(plin) || /class="erou plin"[\s\S]{0,200}<img src="\/img\/p0\.webp" alt="Poza 0" width="1200" height="900" srcset=/.test(plin));
}

console.log(`\n${n - picate} / ${n} trec`);
process.exit(picate ? 1 : 0);
