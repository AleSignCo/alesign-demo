// Testele stratului de adâncime și mișcare al șablonului (s3c, 27 nov. 2026): node teste/test-sablon-s3c.mjs
// Verifică regulile, nu pixelii: mișcarea e doar în CSS, se oprește la „prefers-reduced-motion”, nu ascunde nimic și nu are animații lungi (QA: AC6, AC9).
import { randeazaSite, NISE, contrastCulori } from '../lib/sablon.js';

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${String(n).padStart(2, '0')} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };

const piesa = { site: { acasa: { inceput: { titlu: 'Coafură fără grabă', subtitlu: 'O oră doar pentru tine.', buton: 'Scrie-ne' }, de_ce: { titlu: 'De ce aici', puncte: [{ titlu: 'O clientă pe rând', text: 'Ora ta e a ta.' }, { titlu: 'Liniște', text: 'Fără muzică tare.' }] }, cum_decurge: { titlu: 'Cum decurge', pasi: [{ titlu: 'Ne scrii', text: 'Pe WhatsApp.' }, { titlu: 'Vii', text: 'La ora ta.' }] }, intrebari: [{ q: 'Unde sunteți?', a: 'În Sectorul 1.' }] }, servicii: { intro: { titlu: 'Servicii' }, lista: [{ nume: 'Tuns', text: 'Cu discuție înainte.', pret: '120 lei' }] }, despre: { povestea: { titlu: 'Despre', text: 'Un salon mic.' } }, contact: { titlu: 'Scrie-ne', text: 'Răspundem în aceeași zi.' } }, indemn: { text: 'Scrie-ne', tip: 'telefon', tinta: '0700 000 000' } };
// adresa, programul și telefonul stau sus, cum le trimit build-ul (lib/site-build.js) și alesign-siteuri (api/site.js)
const dosar = (extra = {}) => ({ firma: 'Salon Test', nisa: 'salon', adresa: 'Str. Exemplului nr. 12, Sector 1', program: 'Marți–Vineri 10:00–20:00\nSâmbătă 9:00–16:00\nDuminică și luni închis', telefon: '0700 000 000', brand: {}, ...extra, identitate: { firma: 'Salon Test', nisa: 'salon', oras: 'București', ...(extra.identitate || {}) } });
const pag = (pagina, d = dosar(), opt = {}) => randeazaSite(piesa, d, { mod: 'static', pagina, baza: 'https://salon-test.ro', fonturi: '/_f', ...opt });
const cssDin = (h) => (h.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const strat = (h) => { const c = cssDin(h); const i = c.indexOf('/* —— s3c'); return i < 0 ? '' : c.slice(i); };
// scoate blocurile @media(prefers-reduced-motion:no-preference){…} și @supports … {@media(…no-preference){…}}, cu acoladele lor
const faraMiscare = (c) => { let out = '', i = 0; const M = '@media(prefers-reduced-motion:no-preference){'; while (i < c.length) { const j = c.indexOf(M, i); if (j < 0) { out += c.slice(i); break; } out += c.slice(i, j); let k = j + M.length, ad = 1; while (k < c.length && ad > 0) { if (c[k] === '{') ad++; else if (c[k] === '}') ad--; k++; } i = k; } return out; };
const faraCadre = (c) => c.replace(/@keyframes [\w-]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');

const acasa = pag('acasa'); const S = strat(acasa);

// 1. stratul e pe fiecare pagină și e același text pe orice nișă (culorile vin din :root)
t('stratul e pe toate paginile', ['acasa', 'servicii', 'despre', 'contact', '404'].every((p) => strat(pag(p)).includes('@keyframes v-apare')));
t('stratul e text fix: același pe salon și pe local', strat(pag('acasa', dosar({ nisa: 'restaurant', identitate: { nisa: 'restaurant' } }), { nisa: 'local' })) === strat(pag('acasa', dosar(), { nisa: 'salon' })) && S.length > 3000);
t('niciun script și niciun fișier nou', !/<script(?![^>]*application\/ld\+json)/.test(acasa) && !/url\(/.test(S) && !/@import/.test(S));

// 2. regulile QA despre mișcare
const durate = [...S.matchAll(/animation:[^;}]*/g)].flatMap((m) => [...m[0].matchAll(/(\d*\.?\d+)s\b/g)].map((x) => Number(x[1])));
t('AC9: nicio animație infinită', !/infinite/.test(S));
t('AC9: nicio animație cu timp mai lungă de 5 secunde', durate.length > 4 && Math.max(...durate) <= 1.5, `cea mai lungă: ${Math.max(...durate)} s`);
const rest = faraMiscare(faraCadre(S));
t('AC6: orice animație stă doar unde omul n-a cerut mai puțină mișcare', !/animation(?:-timeline|-range)?:/.test(rest.replace(/@supports \([^)]*\(\)\)/g, '')) && !/@view-transition/.test(rest));
t('AC6: opritorul general a rămas', cssDin(acasa).includes('@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{transition:none!important;animation:none!important}}'));
t('nimic nu e ascuns în starea de bază (fără mișcare, pagina e întreagă)', !/opacity:0(?![.\d])/.test(rest) && !/visibility:hidden/.test(rest) && !/display:none/.test(rest.replace(/\.b\.gol::before\{display:none\}/, '').replace(/\.pasi::before\{display:none\}/g, '')));
const aparitie = (S.match(/main section:not\(\.erou\)[^{]*\{([^}]*)\}/) || [])[1] || '';
t('aparițiile la derulare n-au umplere: sub ecran, elementul stă firesc (capturile QA îl văd)', /animation:v-apare var\(--ease\);animation-timeline:view\(\)/.test(aparitie) && !/both|forwards|backwards/.test(aparitie));
t('titlul primului ecran doar urcă, nu se stinge (LCP)', /@keyframes v-urca\{from\{transform:translateY\(\d+px\)\}\}/.test(S) && /\.erou h1\{animation:v-urca/.test(S));
t('niciun element lipit de ecran în plus (M6)', !/position:(?:fixed|sticky)/.test(S));

// 3. faptele de sub buton vin doar din Dosar
const fapte = (h) => (h.match(/<ul class="fapte">([\s\S]*?)<\/ul>/) || [])[1] || '';
t('faptele: adresa și orele deschise, din Dosar', /<li>Str\. Exemplului nr\.(?:&nbsp;| )12, Sector(?:&nbsp;| )1<\/li>/.test(fapte(acasa)) && /Marți–Vineri/.test(fapte(acasa)) && /Sâmbătă/.test(fapte(acasa)), fapte(acasa).replace(/<[^>]+>/g, ' | ').slice(0, 120));
t('faptele: rândul cu „închis” nu apare', !/nchis/.test(fapte(acasa)));
t('faptele: fără adresă și fără program, lista lipsește', !/class="fapte"/.test(pag('acasa', { firma: 'Salon Test', nisa: 'salon', identitate: { firma: 'Salon Test', nisa: 'salon' }, brand: {} })));
t('faptele: doar pe Acasă', !/class="fapte"/.test(pag('servicii')) && !/class="fapte"/.test(pag('contact')));
t('faptele: textul din Dosar e scăpat', /Str\. &lt;script&gt;x/.test(pag('acasa', dosar({ adresa: 'Str. <script>x</script> 1' }))));
t('faptele: nu sunt linkuri (nicio țintă mică de atins)', !/<a /.test(fapte(acasa)));
t('pe o pagină de ofertă (landing) nu apar', !/class="fapte"/.test(randeazaSite({ titlu: 'Ofertă', cta: { text: 'Sună', tinta: '0700 000 000' }, oferta_expira_la: '2099-01-01' }, dosar(), { mod: 'static', pagina: 'acasa' })));

// 4. secțiunile nuanțate: textul rămâne citibil pe fiecare nișă
for (const [k, N] of Object.entries(NISE)) {
  const h = pag('acasa', dosar({ nisa: k, identitate: { nisa: k } }), { nisa: k }); const r = (cssDin(h).match(/:root\{[^}]*\}/) || [''])[0];
  const sec = (r.match(/--sec-n:(#[0-9a-f]{6})/) || [])[1], mut = (r.match(/--mut-n:(#[0-9a-f]{6})/) || [])[1];
  t(`nișa „${k}”: fondul nuanțat și textul lui trec contrastul`, !!sec && !!mut && contrastCulori(mut, sec) >= 4.5 && contrastCulori(N.culori.cerneala, sec) >= 7, sec && mut ? `${contrastCulori(mut, sec).toFixed(2)} : 1` : 'fără nuanță');
}
t('numerele pașilor sunt scrise cu cerneală, nu cu accent', /\.pas::before\{[^}]*color:var\(--cerneala\)/.test(S));

// 5. previzualizarea din Founder OS primește același strat
const prev = randeazaSite(piesa, dosar(), { mod: 'preview' });
t('previzualizarea are stratul și faptele', strat(prev).includes('@keyframes v-apare') && /class="fapte"/.test(prev));

console.log(`\n${n - picate} / ${n} trec`);
process.exit(picate ? 1 : 0);
