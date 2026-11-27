// Testele s3b (26–27 nov. 2026, seara dinaintea lansării): node teste/test-sablon-s3b.mjs
// Partea legală (datele firmei, capitalul social, TVA-ul, pagina „Termeni și informații legale”, cookie-urile, pictograma SAL din 2026)
// și îmbogățirea fără redesign (serviciul-vedetă, data prețurilor pe Acasă, adresarea din Dosar, ținte de 44 px, eroul fără poză, titlul formularului).
// Verifică HTML-ul generat, nu pixelii. Fără dependențe: rulează cu node din rădăcina depozitului.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { randeazaSite, paginiStatice, paginiExtra, eFormal, textPolitica, textTermeni, eTermeni, lipsuriLegal, formaDin, arePreturi, dataPreturi, textTva, UI_LIMBI, TERMENI_CALE, NISE, contrastCulori } from '../lib/sablon.js';
import { construiesteSite } from '../lib/site-build.js';

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };
const txt = (h) => h.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const subsol = (h) => (h.match(/<footer>[\s\S]*?<\/footer>/) || [''])[0];

// Salonul de probă, cu forma lui #502 (textele aprobate, pe scurt): prețuri în cardurile de pe Acasă, data prețurilor în titlul de pe Acasă și în introducerea de la Servicii
const piesa = { site: {
  acasa: { inceput: { titlu: 'Culoarea se alege înainte să fie amestecată', subtitlu: 'Prețul se stabilește înainte, în scris, pe WhatsApp.', buton: 'Programează-te pe WhatsApp' },
    servicii: { titlu: 'Serviciile salonului', lista: [{ nume: 'Balayage', text: 'Într-o singură ședință. De la 950 lei.' }, { nume: 'Tuns și coafat, păr mediu', text: '220 lei.' }, { nume: 'Vopsit rădăcină', text: '280 lei.' }, { nume: 'Consultație de culoare', text: '20 de minute, gratuită.' }] },
    contact: { titlu: 'Programările se fac pe WhatsApp', text: 'Scrii salonului.' } },
  servicii: { intro: { titlu: 'Servicii și prețuri', text: 'Prețuri valabile la 20 noiembrie 2026.' }, lista: [{ nume: 'Balayage', pret: 'de la 950 lei', text: 'Într-o singură ședință.' }, { nume: 'Tuns și coafat, păr mediu', pret: '220 lei', text: '' }] },
  despre: { povestea: { titlu: 'Cine îți face culoarea', text: 'Un stilist colorist din 2011.' } },
  contact: { titlu: 'Adresă, program și programări', text: 'Programările se fac pe WhatsApp.' } },
  indemn: { tip: 'whatsapp', text: 'Programează-te pe WhatsApp', tinta: '+40 700 000 101' } };
const ident = { firma: 'Salon Liniște', nisa: 'Salon de coafură', telefon: '+40 700 000 101', email: 'salon@exemplu.ro', adresa: 'Str. Exemplului nr. 12, București', cui: 'RO28182282', reg_com: 'J40/1234/1999', sediu: 'Bd. Tudor Vladimirescu', denumire_legala: 'Salon Liniște', politica_confidentialitate: 'auto' };
// așa ajunge Dosarul lui #502 la șablon (dosarPentruBuild): legal din identitate, brandul cu „tu” spus în altceva, tonul „elegant”
const d502 = { firma: 'Salon Liniște', nisa: 'Salon de coafură', identitate: ident, legal: { denumire: 'Salon Liniște', cui: 'RO28182282', reg_com: 'J40/1234/1999', sediu: 'Bd. Tudor Vladimirescu', b2c: true },
  adresare: '', telefon: ident.telefon, email: ident.email, adresa: ident.adresa, brand: { ton: 'elegant', altceva: 'Vorbim cu „tu”, calm și la obiect. Programările se fac pe WhatsApp.' },
  oferta: { vedeta: 'Balayage-ul făcut într-o singură ședință, cu consultație de culoare înainte' }, poze: [] };
const dComplet = { ...d502, identitate: { ...ident, denumire_legala: 'Salon Liniște SRL', capital: '200', tva: 'nu' }, legal: { ...d502.legal, denumire: 'Salon Liniște SRL' } };
const F = { actiune: 'https://formular.exemplu.ro/api/formular', site: 'x' };
const st = (pagina, d = d502, p = piesa, opt = {}) => randeazaSite(p, d, { mod: 'static', pagina, baza: 'https://salon-liniste.ro', fonturi: '/_f', formular: F, ...opt });

// 1. adresarea: „Vorbim cu „tu”” din Dosar câștigă în fața tonului „elegant” (soft „ton” 6, #502)
t('1 eFormal: „Vorbim cu „tu””, ton elegant → tu', eFormal(d502, piesa.site) === false);
t('1 eFormal: „la tu”, „pe «tu»”, „ne tutuim” → tu', ['Scriem la tu.', 'Vorbim pe «tu» cu toată lumea.', 'Ne tutuim cu clientele.'].every((a) => eFormal({ brand: { ton: 'elegant', altceva: a } }, {}) === false));
t('1 eFormal: „dumneavoastră” spus în brief rămâne formal', eFormal({ brand: { ton: 'prietenos', altceva: 'Adresare cu „dumneavoastră”, ton calm.' } }, {}) === true);
t('1 eFormal: fără nicio mențiune, tonul elegant rămâne formal (ca înainte)', eFormal({ brand: { ton: 'elegant', altceva: 'Programările se fac pe WhatsApp.' } }, {}) === true);
t('1 eFormal: un cuvânt care doar conține „tu” nu schimbă nimic', eFormal({ brand: { ton: 'elegant', altceva: 'Vorbim cu tuturor clientelor despre culoare.' } }, {}) === true);
const acasa = st('acasa'); const contact = st('contact');
t('1 Acasă #502: „sau sună:”, fără „sau sunați:”', /sau sună:/.test(acasa) && !/sau sunați:/.test(acasa));
t('1 Contact #502: nicio etichetă fixă la „dumneavoastră”', !/sunați|Lăsați|vă putem răspunde/.test(txt(contact).replace(/Politica de confidențialitate|Termeni și informații legale/g, '')));
t('1 salon: eticheta de contact e „Programări”, nu „Rezervări”', /<p class="ochi">Programări<\/p>/.test(contact) && !/Rezervări/.test(contact));

// 2. datele legale: forma juridică, capitalul social, TVA-ul (Legea 31/1990 art. 74; Legea 365/2002 art. 5)
t('2 formaDin: SRL, S.R.L., SA, PFA, SRL-D', formaDin('Salon Liniște SRL') === 'SRL' && formaDin('Salon Liniște S.R.L.') === 'SRL' && formaDin('Clinica Alfa SA') === 'SA' && formaDin('Popescu Ana PFA') === 'PFA' && formaDin('Studio Beta SRL-D') === 'SRL-D');
t('2 formaDin: fără formă → gol; „Sanda”, „Salon” nu se iau drept SA', formaDin('Salon Liniște') === '' && formaDin('Sanda Salon') === '' && formaDin('Casa Ana') === '');
const lip = lipsuriLegal(d502, piesa);
t('2 lipsuriLegal #502: forma juridică, capitalul social, TVA-ul', lip.length === 3 && /forma juridică/.test(lip[0]) && /capitalul social/.test(lip[1]) && /TVA/.test(lip[2]), JSON.stringify(lip));
t('2 lipsuriLegal: Dosar complet → nimic', lipsuriLegal(dComplet, piesa).length === 0, JSON.stringify(lipsuriLegal(dComplet, piesa)));
t('2 lipsuriLegal: fără prețuri pe site nu se cere TVA-ul', !lipsuriLegal(d502, { site: { acasa: { inceput: { titlu: 'x' } } } }).some((x) => /TVA/.test(x)));
t('2 lipsuriLegal: medical fără autorizație o cere', lipsuriLegal({ ...dComplet, identitate: { ...dComplet.identitate, reglementat: 'medical' } }, piesa).some((x) => /autorizația/.test(x)));
t('2 lipsuriLegal: fără date legale, un singur rând', lipsuriLegal({ firma: 'X' }, piesa).length === 1);
const sC = subsol(st('acasa', dComplet));
t('2 subsol: „Capital social: 200 lei” când Dosarul îl are', /Capital social: 200(?:&nbsp;| )lei/.test(sC) && !/Capital social/.test(subsol(acasa)));
t('2 subsol: denumirea legală diferită de firmă apare (cu forma juridică)', /Salon Liniște SRL/.test(sC));
t('2 TVA: textTva', textTva(true) === 'Prețurile includ TVA.' && textTva(false) === 'Firma nu este plătitoare de TVA.' && textTva(null) === '');
t('2 arePreturi / dataPreturi din textele aprobate', arePreturi(piesa) && !arePreturi({ site: { acasa: { inceput: { titlu: '20 de minute' } } } }) && dataPreturi(piesa) === 'Prețuri valabile la 20 noiembrie 2026.');

// 3. prețurile au data lor și TVA-ul (L1, lit. h): pe Acasă, sub carduri; pe Servicii, sub listă
t('3 Acasă: data prețurilor luată din Servicii, când Acasă n-o are (L1)', /<p class="pret-data">Prețuri valabile la 20 noiembrie 2026\.<\/p>/.test(acasa));
const pCuData = JSON.parse(JSON.stringify(piesa)); pCuData.site.acasa.servicii.titlu = 'Serviciile salonului, cu prețuri valabile la 20 noiembrie 2026';
t('3 Acasă: data deja în titlul secțiunii → nu se repetă', !/class="pret-data"/.test(st('acasa', d502, pCuData)));
t('3 Acasă: TVA-ul din Dosar lângă dată', /<p class="pret-data">Prețuri valabile la 20 noiembrie 2026\. Firma nu este plătitoare de TVA\.<\/p>/.test(st('acasa', dComplet)));
t('3 Servicii: doar TVA-ul (data e în introducere)', /<p class="pret-data">Firma nu este plătitoare de TVA\.<\/p>/.test(st('servicii', dComplet)) && !/class="pret-data"/.test(st('servicii')));
t('3 fără prețuri: niciun rând', !/class="pret-data"/.test(st('acasa', dComplet, { site: { ...piesa.site, acasa: { ...piesa.site.acasa, servicii: { titlu: 'S', lista: [{ nume: 'Tuns', text: 'Cu programare.' }, { nume: 'Vopsit', text: 'Cu consultație.' }] } } }, indemn: piesa.indemn })));

// 4. serviciul-vedetă: primul, pe tot rândul, cu textul aprobat; nu se repetă în grilă
t('4 vedeta: Balayage are cardul lui, primul', /<div class="c vedeta"><h3>Balayage<\/h3><p>Într-o singură ședință\. De la 950(?:&nbsp;| )lei\.<\/p><\/div><div class="g3 n3">/.test(acasa));
t('4 vedeta: Balayage nu apare a doua oară pe Acasă, la servicii', (acasa.match(/<h3>Balayage<\/h3>/g) || []).length === 1);
t('4 vedeta: „Consultație de culoare” (pomenită mai târziu în frază) rămâne în grilă', /<div class="c"><h3>Consultație de culoare<\/h3>/.test(acasa));
t('4 fără vedeta în Dosar: grila de dinainte', !/vedeta/.test(st('acasa', { ...d502, oferta: {} }).replace(/<style>[\s\S]*?<\/style>/, '')) && /<div class="g3 n4">/.test(st('acasa', { ...d502, oferta: {} })));
t('4 vedeta care nu se potrivește cu niciun serviciu: nimic accentuat', !/class="c vedeta"/.test(st('acasa', { ...d502, oferta: { vedeta: 'Manichiura semipermanentă' } })));

// 5. Contact: formularul e a doua cale când îndemnul e WhatsApp
t('5 Contact: „Sau lasă-ne un mesaj” deasupra formularului', /<h2 class="form-sus">Sau lasă-ne un mesaj<\/h2><form class="form"/.test(contact));
t('5 Contact formal: „Sau lăsați-ne un mesaj”', /Sau lăsați-ne un mesaj/.test(st('contact', { ...d502, brand: { ton: 'elegant', altceva: '' } })));
const pForm = { ...piesa, indemn: { tip: 'formular', text: 'Scrie-ne' } };
t('5 Contact: îndemnul e formularul → fără titlul în plus', !/form-sus/.test(st('contact', d502, pForm).replace(/<style>[\s\S]*?<\/style>/, '')));
t('5 traduceri: cheile noi au en, de, hu', ['Sau lasă-ne un mesaj', 'Sau lăsați-ne un mesaj', 'Termeni și informații legale'].every((k) => ['en', 'de', 'hu'].every((l) => typeof UI_LIMBI[l][k] === 'string' && UI_LIMBI[l][k])));

// 6. ținte de atingere și eroul fără poză (CSS)
t('6 telefonul din erou: 44 px și 16 px', /\.erou \.act \.alt a\{[^}]*min-height:44px/.test(acasa) && /\.erou \.act \.alt\{font-size:16px/.test(acasa));
t('6 subsol și datele de contact: 44 px; linkul din acord rămâne în rând (24 px)', /footer a,\.date a\{display:inline-flex;align-items:center;min-height:44px\}/.test(acasa) && /\.form \.acord a\{display:inline-block;min-height:24px/.test(acasa) && /\.pagini-extra a\{[^}]*min-height:44px/.test(acasa));
t('6 eroul fără poză: o coloană și fondul nuanțat al nișei (salon: #f8f1ec), cu textul gri mai închis', /<section class="erou centrat"><div class="w una">/.test(acasa) && /\.erou:has\(>\.w\.una\)\{background:#f8f1ec\}/.test(acasa) && /\.erou:has\(>\.w\.una\) \.sub,[^{]+\{color:#62544e\}/.test(acasa));
t('6 eroul fără poză: textul trece 4,5:1 pe fondul nou, la toate nișele', Object.values(NISE).every((N) => { const c = N.culori; const mx = (a, b, p) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p)).toString(16).padStart(2, '0')).join(''); return contrastCulori(mx(c.mut, c.cerneala, 0.7), mx(c.moale, c.fundal, 0.35)) >= 4.5 && contrastCulori(c.cerneala, mx(c.moale, c.fundal, 0.35)) >= 4.5; }));

// 7. pagina „Termeni și informații legale”
const pag = paginiStatice(piesa, d502, { baza: 'https://salon-liniste.ro', fonturi: '/_f', formular: F }).map((p) => p.cale);
t('7 paginiStatice: termeni/index.html când Dosarul are denumirea, CUI-ul și sediul', pag.includes('termeni/index.html') && pag.includes('politica-de-confidentialitate/index.html'), pag.join(', '));
t('7 fără CUI: nicio pagină de termeni și niciun link spre ea', !paginiStatice(piesa, { ...d502, legal: { denumire: 'Salon Liniște' }, identitate: { ...ident, cui: '' } }, { formular: F }).some((p) => p.cale === 'termeni/index.html') && !eTermeni({ identitate: { denumire_legala: 'X', sediu: 'Y' } }));
t('7 subsolul: link spre /termeni, după politica de confidențialitate', /Politica de confidențialitate<\/a> · <a href="\/termeni">Termeni și informații legale<\/a>/.test(subsol(acasa)) && TERMENI_CALE === '/termeni');
const tm = st('termeni', dComplet); const tmT = txt(tm);
t('7 Termeni: titlu, canonical, fără noindex', /<h1[^>]*>Termeni și informații legale<\/h1>/.test(tm) && /<link rel="canonical" href="https:\/\/salon-liniste\.ro\/termeni">/.test(tm) && !/noindex/.test(tm) && /<title>Termeni și informații legale · Salon Liniște<\/title>/.test(tm));
t('7 Termeni: cine suntem (denumire, CUI, Reg. Com., sediu, capital), cu contact', /Salon Liniște SRL/.test(tmT) && /CUI RO28182282/.test(tmT) && /J40\/1234\/1999/.test(tmT) && /sediul social în Bd\. Tudor Vladimirescu/.test(tmT) && /capital social 200 lei/.test(tmT) && /\+40 700 000 101/.test(tmT));
t('7 Termeni: prețuri în lei și TVA-ul; fără plăți pe site', /Prețurile de pe site sunt în lei/.test(tmT) && /Firma nu este plătitoare de TVA\./.test(tmT) && /nu se fac plăți/.test(tmT));
t('7 Termeni: cookie-uri, drepturi de autor, reclamații cu ANPC SAL', /nu pune cookie-uri/.test(tmT) && /Drepturi de autor/.test(tmT) && /reclamatiisal\.anpc\.ro/.test(tmT) && /Politica de confidențialitate/.test(tmT));
t('7 Termeni: fără TVA în Dosar → nicio frază despre TVA', !/TVA/.test(txt(st('termeni')).replace(/Politica de confidențialitate/g, '')));
t('7 Termeni: fără prețuri pe site → fără capitolul Prețuri, capitolele se renumerotează', (() => { const x = textTermeni(dComplet, { preturi: false }); return !/Prețuri/.test(x) && /## 3\. Date personale/.test(x) && /## 5\. Reclamații/.test(x); })());
t('7 Termeni: firmă doar B2B → fără capitolul de reclamații ANPC', !/ANPC/.test(textTermeni({ ...dComplet, legal: { ...dComplet.legal, b2c: false } }, { preturi: true })));
t('7 Termeni: nicio regulă inventată (anulări, garanții, avans, rambursări)', !/anul|garanți|avans|rambursa|penalit/i.test(textTermeni(dComplet, { preturi: true, formular: true, programare: true })));
t('7 Termeni: data, doar când Dosarul o are (termeni_data)', /Ultima actualizare: 26 noiembrie 2026/.test(txt(st('termeni', { ...dComplet, identitate: { ...dComplet.identitate, termeni_data: '2026-11-26' } }))) && !/Ultima actualizare/.test(tmT));
let eroare = null; try { st('termeni', { firma: 'X', identitate: { firma: 'X', telefon: '0744 111 222' } }); } catch (e) { eroare = e; }
t('7 Termeni static fără date legale: LIPSA, nu o pagină goală', eroare && eroare.cod === 'LIPSA');
t('7 paginiExtra: slugul „termeni” nu poate fi luat de o pagină în plus', paginiExtra({ site: { extra: { termeni: { titlu: 'X', text: 'y' }, balayage: { titlu: 'B', text: 'b' } } } }).map((p) => p[2]).join(',') === 'balayage');
const prev = randeazaSite(piesa, d502, { mod: 'preview' });
t('7 previzualizare: ecranul #termeni și linkul din subsol', /id="pg-termeni"/.test(prev) && /"termeni"\]/.test(prev) && /<a href="#termeni">Termeni și informații legale<\/a>/.test(prev));
t('7 previzualizare: „Mai lipsesc” arată golurile legale', /<p class="lipsa">Mai lipsesc:[^<]*forma juridică[^<]*capitalul social[^<]*TVA/.test(prev));
t('7 site publicat: „Mai lipsesc” nu apare', !/class="lipsa"/.test(acasa.replace(/<style>[\s\S]*?<\/style>/, '')));

// 8. cookie-uri: nimic salvat pe dispozitiv, nicio încorporare, niciun script străin (Legea 506/2004 art. 4 alin. 5, după Legea 219/2026)
const toate = paginiStatice(piesa, d502, { baza: 'https://salon-liniste.ro', fonturi: '/_f', formular: F, masurare: true });
const html = toate.map((p) => p.html).join('\n');
t('8 static: fără iframe, fără document.cookie, fără localStorage / sessionStorage', !/<iframe/i.test(html) && !/document\.cookie|localStorage|sessionStorage|indexedDB/.test(html));
t('8 static: scripturile sunt doar /_alesign/m.js și /_alesign/u.js', (html.match(/<script src="[^"]+"/g) || []).every((s) => /<script src="\/_alesign\/(m|u)\.js"/.test(s)));
t('8 static: fonturile de pe domeniul site-ului, nu de la Google', !/fonts\.googleapis|fonts\.gstatic/.test(html));
t('8 harta: link, nu încorporare (Google Maps se deschide doar la clic)', /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=|href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/.test(contact) && !/maps\/embed/.test(html));
const pol = textPolitica(dComplet, { email: 'salon@exemplu.ro', tel: '+40 700 000 101' });
t('8 politica: cookie-urile spuse exact (nimic salvat, fără acord cerut)', /nu pune cookie-uri și nu păstrează nimic în browserul dumneavoastră, de aceea nu vă cere acordul/.test(pol) && /nu se salvează pe dispozitivul dumneavoastră/.test(pol));

// 9. SAL (Ordinul ANPC 449/2022, modificat prin Ordinul 270/2026): pictograma din 2026, 250 × 50, spre reclamatiisal.anpc.ro; SOL nu mai apare
const cuSal = st('acasa', d502, piesa, { sal_img: '/img/sal.webp' });
t('9 subsol: pictograma SAL 250 × 50, spre reclamatiisal.anpc.ro', /<a class="sal" href="https:\/\/reclamatiisal\.anpc\.ro\/" rel="noopener" target="_blank"><img src="\/img\/sal\.webp" width="250" height="50"/.test(cuSal));
t('9 nicăieri un link spre SOL (platforma ODR, închisă pe 20 iul. 2025)', !/ec\.europa\.eu\/consumers\/odr|webgate\.ec\.europa\.eu\/odr/.test(html + cuSal));
const api = fs.readFileSync(new URL('../api/site-build.js', import.meta.url), 'utf8');
t('9 api/site-build: pictograma implicită e modelul din 2026', /process\.env\.SAL_IMG_URL \|\| 'https:\/\/demo\.alesign\.net\/anpc-sal-2026\.png'/.test(api) && !/anpc-sal-680\.png'\)/.test(api));
const png = fs.readFileSync(new URL('../public/anpc-sal-2026.png', import.meta.url));
t('9 public/anpc-sal-2026.png: fișierul oficial ANPC (SHA-256), 201 × 50 px', crypto.createHash('sha256').update(png).digest('hex') === '22c8a45600aecb9db935d536691766a99b71f4ceb5153ce34681d8788c15d5ed' && png.readUInt32BE(16) === 201 && png.readUInt32BE(20) === 50);

// 10. build-ul: pagina de termeni intră în fișiere și în sitemap
const aduce = async () => Buffer.from('font');
const b = await construiesteSite({ piesa, dosar: d502, baza: 'https://salon-liniste.ro', preview: false, formular: F, aduce, sharp: null });
const f = (c) => b.fisiere.find((x) => x.cale === c);
t('10 build: termeni/index.html și /termeni în sitemap', !!f('termeni/index.html') && /<loc>https:\/\/salon-liniste\.ro\/termeni<\/loc>/.test(String(f('sitemap.xml').date)));
const bFara = await construiesteSite({ piesa, dosar: { ...d502, legal: null, identitate: { ...ident, cui: '', denumire_legala: '' } }, baza: 'https://salon-liniste.ro', preview: false, formular: null, aduce, sharp: null });
t('10 build: fără date legale, nici pagina, nici linkul', !bFara.fisiere.some((x) => x.cale === 'termeni/index.html') && !/\/termeni/.test(String(bFara.fisiere.find((x) => x.cale === 'index.html').date)));
console.log(`\n${n - picate} / ${n} trec`);
process.exit(picate ? 1 : 0);
