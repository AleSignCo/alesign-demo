// Materialele pentru cei care scriu SISTEM (ManyChat → DM, nov. 2026): ghidul „5 semne că firma ta premium arată ieftin online” și overview-ul
// AleSystem Design. Fiecare are pagină (/ghid, /overview: merg bine în browserul din Instagram) și PDF (/ghid.pdf, /overview.pdf), în stilul ofertei
// de lansare (întunecat, auriu, Manrope). Butonul spre formularul Tally păstrează sursa din linkul ManyChat (?sursa=…&instagram=…).
// Prețurile din overview sunt cele de listă din `pachete` (aceleași ca pe alesign.net); ofertele de lansare NU apar aici: se află pe 27 nov.
import { PDFDocument, PDFName, PDFString, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { fontBytes } from './pdf.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SERV = process.env.SUPABASE_SERVICE_KEY;
const HS = () => ({ apikey: KEY_SERV, Authorization: `Bearer ${KEY_SERV}` });
const TALLY_IMPLICIT = 'https://tally.so/r/bZ9qe6';
const BAZA_IMPLICIT = 'https://demo.alesign.net';
export const ARATA_PRETURI = true;   // overview: prețurile de listă la pachete (false = doar ce include fiecare)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ---------- linkul de înscriere: păstrează sursa și username-ul din ManyChat, curățate ----------
export function curataSursa(q = {}, implicit = 'site') {
  const sursa = String(q.sursa || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40) || implicit;
  const instagram = String(q.instagram || '').trim().replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 60);
  return { sursa, instagram };
}
export function linkInscriere(tally, q = {}, implicit = 'site') {
  const { sursa, instagram } = curataSursa(q, implicit);
  let u; try { u = new URL(tally || TALLY_IMPLICIT); } catch { u = new URL(TALLY_IMPLICIT); }
  u.searchParams.set('sursa', sursa);
  if (instagram) u.searchParams.set('instagram', instagram);
  return u.toString();
}
export function linkPdf(cale, q = {}) {
  const { sursa, instagram } = curataSursa(q, '');
  const p = new URLSearchParams(); if (sursa) p.set('sursa', sursa); if (instagram) p.set('instagram', instagram);
  return `${cale}${p.toString() ? `?${p}` : ''}`;
}

// ---------- datele (doar pentru overview: pachetele de listă) ----------
const CODURI = ['prezenta', 'crestere', 'dominare', 'complete', 'clarity', 'foundation'];
export async function brosuraDate() {
  if (!URL_SB || !KEY_SERV) throw new Error('lipsesc SUPABASE_URL / SUPABASE_SERVICE_KEY');
  const [p, s] = await Promise.all([
    fetch(`${URL_SB}/rest/v1/pachete?select=cod,nume,subtitlu,pret,categorie,eticheta,include,ordine&cod=in.(${CODURI.join(',')})&activ=eq.true&order=ordine.asc`, { headers: HS() }).then((r) => r.json()),
    fetch(`${URL_SB}/rest/v1/setari?select=cheie,valoare&cheie=in.(sistem_tally_url,sistem_url_baza,firma_email)`, { headers: HS() }).then((r) => r.json()),
  ]);
  const set = Object.fromEntries((Array.isArray(s) ? s : []).map((x) => [x.cheie, x.valoare]));
  return normalizeaza({ pachete: Array.isArray(p) ? p : [], setari: set });
}
export function normalizeaza({ pachete = [], setari = {} }) {
  return {
    lunare: pachete.filter((x) => x.categorie === 'lunar'),
    linia1: pachete.filter((x) => x.categorie === 'linia1' && ['clarity', 'foundation'].includes(x.cod)),
    tally: setari.sistem_tally_url || TALLY_IMPLICIT,
    baza: setari.sistem_url_baza || BAZA_IMPLICIT,
    email: setari.firma_email || 'info@alesign.net',
  };
}

// ---------- textele, în vocea lui Alex ----------
export const GHID = {
  eyebrow: 'Ghid gratuit · AleSystem Design',
  titlu: '5 semne că firma ta premium arată ieftin online',
  sub: 'Și ce poți face cu fiecare, de mâine. Durează 10 minute, cu telefonul în mână.',
  intro: [
    'Ai muncit ani de zile să ajungi unde ești. Clienți buni, prețuri pe măsură, o echipă pe care te bazezi.',
    'Omul care nu te cunoaște încă nu vede nimic din toate astea. Vede un telefon. Te caută pe Google, intră pe Instagram, deschide site-ul. Și în câteva secunde hotărăște dacă ești premium sau încă unul.',
    'Sistemul meu analizează în fiecare zi firme premium din București: clinici, saloane, restaurante, birouri. Aceleași 5 greșeli apar iar și iar. Niciuna nu ține de cât de bun ești. Toate țin de cum arăți online.',
    'Pentru fiecare semn ai un test de 2 minute. Bifează-l dacă te regăsești. La final, numeri.',
  ],
  semne: [
    {
      titlu: 'Fișa ta de pe Google arată abandonată',
      vede: 'Poze vechi sau făcute la întâmplare de clienți. Un program care nu mai e valabil. Recenzii fără niciun răspuns. O descriere goală.',
      deCe: 'Când cineva caută „salon premium Floreasca” sau „clinică dentară lângă mine”, compară fișele de pe Google una lângă alta, înainte să ajungă pe vreun site. Fișa ta e prima vitrină. De multe ori, singura pe care o vede.',
      test: 'Caută-te pe Google Maps de pe telefon, ca un client nou. Ai poze din ultimele 6 luni? Programul e corect, inclusiv în weekend? Ai răspuns la ultimele 5 recenzii?',
      faci: [
        '10 poze noi, făcute cu lumină bună: spațiul, echipa, un detaliu care te reprezintă.',
        'Programul corect, cu tot cu sărbători.',
        'Un răspuns scurt și personal la fiecare recenzie din ultima lună. Și la cele bune, și la cele proaste.',
      ],
    },
    {
      titlu: 'Site-ul se încarcă greu pe telefon (sau nu ai site deloc)',
      vede: 'Câteva secunde de ecran alb. Text mic, pe care trebuie să-l mărești cu degetele. Un buton de programare care nu merge. Un „© 2019” în subsol. Sau linkul din bio duce înapoi pe Instagram, și atât.',
      deCe: 'Clientul premium te verifică înainte să te sune. Un site lent sau vechi îi spune că nu te ocupi de detalii. Și dacă detaliile online sunt lăsate așa, de ce ar fi altfel la tine în salon sau în cabinet?',
      test: 'Deschide site-ul pe telefon, pe date mobile, nu pe Wi-Fi. Numără până vezi ceva util. Apoi încearcă să faci o programare și cronometrează.',
      faci: [
        'Trece site-ul prin pagespeed.web.dev (gratuit, de la Google) și uită-te la scorul pentru mobil.',
        'Pune telefonul și butonul de programare sus, vizibile din prima secundă.',
        'Scoate de pe prima pagină tot ce nu ajută omul să te sune sau să vină.',
      ],
    },
    {
      titlu: 'Instagram-ul tău e un depozit, nu o vitrină',
      vede: 'Ultima postare e de acum două luni. Înainte, cinci într-o săptămână. Poze de stock lângă poze făcute pe fugă. Texte de genul „Vă așteptăm cu drag!”.',
      deCe: 'Inconsecvența arată lipsă de timp. Iar clientul premium citește lipsa de timp ca lipsă de grijă. Nu contează cât de bun e serviciul, dacă vitrina spune altceva.',
      test: 'Deschide-ți profilul ca un străin. Ultimele 9 poze, în grilă, arată ca aceeași firmă? Ai postat ceva în ultimele 7 zile?',
      faci: [
        '3 postări pe săptămână, mereu în aceleași zile, valorează mai mult decât 10 într-o săptămână și apoi o lună de liniște.',
        'Aceleași culori, același tip de lumină, același ton.',
        'Poze reale din spațiul tău bat orice poză de stock.',
      ],
    },
    {
      titlu: 'Răspunzi greu, sau deloc',
      vede: 'Un mesaj citit și lăsat două zile. Un telefon care sună în gol la prânz. O recenzie de 2 stele, fără răspuns de patru luni.',
      deCe: 'Viteza face parte din serviciu. Omul care îți scrie seara la 10 mai scrie, în aceeași seară, încă la doi. Primul care răspunde bine îl câștigă.',
      test: 'Scrie-ți de pe alt cont, la o oră oarecare, ca un client. Cronometrează cât durează până primești un răspuns.',
      faci: [
        'Un răspuns automat cald la mesaje: „Mersi că ne-ai scris! Revenim în cel mult 2 ore. Dacă e urgent, sună-ne la...”.',
        'Un singur om care se ocupă zilnic de mesaje și de recenzii.',
        'La recenziile negative: un răspuns calm, fără scuze goale și fără ceartă, cu un telefon sau un email unde rezolvați în privat.',
      ],
    },
    {
      titlu: 'Vorbești ca toată lumea',
      vede: '„Servicii de calitate.” „Echipă de profesioniști.” „Prețuri accesibile.” „Ne pasă de clienții noștri.” Le-a citit azi la încă zece firme.',
      deCe: 'O frază pe care o poate spune oricine nu spune nimic despre tine. Iar „prețuri accesibile” e exact opusul a ce vrei să transmiți dacă ești premium.',
      test: 'Acoperă cu degetul logo-ul de pe site și de pe Instagram. Textul ar putea fi al oricărei firme din domeniul tău? Atunci ai semnul ăsta.',
      faci: [
        'Înlocuiește adjectivele cu fapte: nu „echipă de profesioniști”, ci cine e omul și de câți ani face asta.',
        'Spune ce primește clientul, concret, și cum se simte după.',
        'Scrie cum vorbești cu un client care stă în fața ta, nu ca într-o broșură.',
      ],
    },
  ],
  scor: [
    { de: 0, pana: 1, titlu: '0 sau 1 semn', text: 'Ești înaintea majorității. Ține ritmul: asta e partea grea.' },
    { de: 2, pana: 3, titlu: '2 sau 3 semne', text: 'Pierzi clienți pe care nu-i vezi. Nu sună, nu scriu, aleg pe altcineva și tu nu afli niciodată.' },
    { de: 4, pana: 5, titlu: '4 sau 5 semne', text: 'Oamenii te judecă după vitrină, nu după ce faci. Și vitrina ta nu te reprezintă.' },
  ],
  scorNota: 'Nu e vina ta. E o muncă de zi cu zi pe care nu o are nimeni din firmă în fișa postului.',
  finalTitlu: 'De ce ți-am scris ghidul ăsta',
  final: [
    'Tot ce ai citit mai sus se poate repara. Problema e că trebuie făcut în fiecare zi, nu o dată.',
    'De asta construiesc AleSystem Design: un sistem de boți care face toate cele 5 lucruri pentru tine. Fișa Google la zi, site rapid, postări constante în stilul tău, răspunsuri la recenzii, raport lunar. Eu țin planul. Tu aprobi ce se publică. Restul rulează singur.',
    'Pe 27 noiembrie, la 20:00, îl lansez. Cei de pe lista SISTEM află primii ofertele de lansare. Și am ceva special pentru 3 dintre voi.',
  ],
  cta: 'Intră pe lista SISTEM',
  semnatura: 'Alex · Fondator AleSign&Co · alesign.net',
};

export const OVERVIEW = {
  eyebrow: 'AleSystem Design · Overview',
  titlu: 'Compania din spatele companiei tale. Din boți.',
  lead: 'Un sistem de boți AI care preia execuția din afacerea ta: site, conținut, reclame, Google, recenzii, raport. Rulează non-stop. Tu aprobi. Eu țin planul.',
  motto: 'Tu decizi direcția. Restul rulează singur.',
  peScurt: [
    'Nu sunt o agenție. Am fost. Am automatizat până și motivul pentru care exista o agenție.',
    'Agenția clasică îți trimite un raport pe lună și atât. Aici vezi tot ce se construiește, în timp real, și aprobi cu un click.',
    'Nu vând un software pe care să-l configurezi singur. Vând un sistem gata construit și rulat pentru tine.',
  ],
  ceFace: [
    { titlu: 'Site', text: 'Rapid, pe domeniul tău, găzduit și ținut la zi. Verificat automat pe telefon, tabletă și desktop înainte de fiecare publicare.' },
    { titlu: 'Conținut', text: 'Postări în vocea firmei tale, pe 2 până la 5 canale, în aceleași zile, în același stil. Le aprobi înainte să plece.' },
    { titlu: 'Google', text: 'Fișa ta Google Business la zi: program, poze, postări. Prima vitrină în care te văd clienții.' },
    { titlu: 'Reputație', text: 'Răspunsuri la recenzii: calde la cele bune, calme la cele proaste, cu contul tău Google conectat.' },
    { titlu: 'Reclame', text: 'Campanii pe Facebook și Instagram, construite pe oferta ta. Bugetul de reclame e al tău, plătit direct.' },
    { titlu: 'Raport', text: 'O dată pe lună, de citit în două minute: ce s-a făcut, ce a adus, ce urmează. Fiecare cifră are sursă.' },
  ],
  pasi: [
    'Audit și un apel de 20 de minute. Vezi ce merge și ce te costă clienți acum.',
    'Planul. Îl fac eu, pe afacerea ta, și ți-l arăt înainte să pornim.',
    'Boții construiesc. Fiecare piesă trece prin verificări automate și prin mine, apoi ajunge la tine. Aprobi cu un click. Nimic nu se publică fără tine.',
    'Raport lunar și ajustări. Ce merge, întărim. Ce nu merge, schimbăm.',
  ],
  comparatie: [
    ['Cine execută', 'oameni, în program', 'boți, non-stop, verificați de mine'],
    ['Ce vezi', 'un raport pe lună', 'tot, în timp real, în spațiul tău'],
    ['Când primești răspuns', 'în câteva zile', 'în aceeași zi lucrătoare'],
    ['Concedii, demisii', 'se întâmplă', 'boții nu pleacă'],
    ['Ce faci tu', 'explici de fiecare dată ce vrei', 'aprobi sau ceri o schimbare, cu un click'],
  ],
  pentruCine: [
    'Pentru firmele care vor să arate premium online, nu cel mai ieftin: clinici, saloane, restaurante premium, imobiliare, avocatură, arhitectură și design interior.',
    'Și pentru cei care încă n-au afacere, dar vor una: Linia 1, de la idee la companie.',
  ],
  nuSuntem: 'Nu suntem pentru oricine. Dacă alegi după cel mai mic preț, nu sunt omul tău. Dacă vrei ca firma ta să arate online la fel de bine cum lucrează, da.',
  cineE: 'Sunt Alex. Construiesc AleSystem pas cu pas și îl arăt zi de zi, până la lansare.',
  final: 'Pe 27 noiembrie, la 20:00, lansez AleSystem Design. Cei de pe lista SISTEM află primii ofertele de lansare. Și am ceva special pentru 3 dintre voi.',
  notaPreturi: 'Prețuri de listă, finale, în lei. Ofertele de lansare pentru lista SISTEM le afli pe 27 noiembrie, la 20:00.',
  cta: 'Intră pe lista SISTEM',
  semnatura: 'Alex · Fondator AleSign&Co · alesign.net',
};

// ---------- paginile ----------
const STIL = `<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap');
:root{--bg:#0D0F14;--s:#151821;--s2:#1B1F2A;--b:#272C38;--g:#C9A227;--g2:#E2C35A;--t:#F2F1ED;--d:#9BA1B0;--f:#5B6070}
*{box-sizing:border-box}html{scroll-behavior:smooth;overflow-x:hidden}body{margin:0;overflow-x:hidden;background:var(--bg);color:var(--t);font-family:Manrope,-apple-system,'Segoe UI',Inter,Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding:36px 16px 88px}
.hero{min-height:78vh;display:flex;flex-direction:column;justify-content:center;gap:16px;position:relative;isolation:isolate}
.hero::after{content:'';position:absolute;right:0;bottom:-10%;width:min(420px,90vw);height:min(420px,90vw);z-index:-1;background:radial-gradient(circle,rgba(201,162,39,.16),transparent 65%);pointer-events:none;animation:plutire 9s ease-in-out infinite alternate}
@keyframes plutire{from{transform:translate(0,0)}to{transform:translate(-40px,-30px)}}
.eyebrow{color:var(--g);font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700}
h1{font-size:clamp(34px,7vw,64px);line-height:1.04;margin:0;font-weight:800;letter-spacing:-.02em}
h1 em{font-style:normal;color:var(--g)}
h2{font-size:clamp(22px,3.6vw,32px);margin:72px 0 18px;font-weight:800;letter-spacing:-.01em;line-height:1.2}
.lead{font-size:clamp(17px,2.3vw,20px);color:var(--d);max-width:640px;margin:0 0 12px}
.motto{font-size:clamp(19px,3vw,26px);font-weight:700;margin:12px 0 0}
.line{height:1px;background:linear-gradient(90deg,var(--g),transparent);margin:24px 0 0;width:160px}
.jos{color:var(--f);font-size:13px;margin-top:28px;display:flex;align-items:center;gap:8px}.jos::before{content:'';width:1px;height:28px;background:linear-gradient(var(--g),transparent);animation:coboara 1.8s ease-in-out infinite}
@keyframes coboara{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
.semn{background:var(--s);border:1px solid var(--b);border-radius:20px;padding:24px 20px;margin:18px 0;position:relative;overflow:hidden;transition:border-color .35s ease}
.semn.bifat{border-color:var(--g)}
.semn .nr{font-size:64px;font-weight:800;line-height:1;color:var(--g);opacity:.9;letter-spacing:-.04em}
.semn h3{font-size:clamp(20px,3vw,26px);line-height:1.25;margin:8px 0 16px}
.semn .et{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--g);font-weight:700;margin:16px 0 4px}
.semn p{margin:0;color:var(--d)}
.test{background:var(--s2);border-left:3px solid var(--g);border-radius:0 12px 12px 0;padding:14px 16px;margin-top:6px}.test p{color:var(--t)}
.semn ul{list-style:none;padding:0;margin:6px 0 0}.semn li{padding:8px 0 8px 22px;position:relative;color:var(--d);border-top:1px solid var(--b)}.semn li:first-child{border-top:0}
.semn li::before{content:'';position:absolute;left:2px;top:17px;width:8px;height:8px;border-radius:50%;background:var(--g)}
.bifa{display:flex;align-items:center;gap:12px;margin-top:18px;padding:14px 16px;border:1px dashed var(--b);border-radius:12px;cursor:pointer;user-select:none;font-weight:700}
.bifa input{width:22px;height:22px;accent-color:var(--g);margin:0}
.semn.bifat .bifa{border-style:solid;border-color:var(--g);background:rgba(201,162,39,.08)}
.scor{display:grid;gap:12px}.scor div{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:18px;transition:all .35s ease}
.scor div.activ{border-color:var(--g);background:rgba(201,162,39,.08);transform:scale(1.015)}
.scor b{display:block;font-size:17px;margin-bottom:4px}.scor p{margin:0;color:var(--d)}
.numar{font-size:clamp(44px,8vw,72px);font-weight:800;color:var(--g);line-height:1;margin:6px 0 2px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
.card{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:20px;position:relative;overflow:hidden;transition:transform .35s ease,border-color .35s ease}
.card:hover{transform:translateY(-3px);border-color:var(--g)}
.card h3{margin:0 0 6px;font-size:19px}.card p{margin:0;color:var(--d);font-size:15px}
.card .tag{position:absolute;top:14px;right:14px;background:var(--g);color:#0D0F14;font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase}
.card .sub{color:var(--d);font-size:14px;margin:0 0 12px;min-height:40px}
.pret{font-size:28px;font-weight:800;letter-spacing:-.02em;margin:4px 0}.pret span{font-size:13px;color:var(--f);font-weight:500;letter-spacing:0}
.card ul{list-style:none;padding:0;margin:12px 0 0;color:var(--d);font-size:14px}.card li{padding:5px 0 5px 18px;position:relative;border-top:1px solid var(--b)}.card li::before{content:'';position:absolute;left:0;top:13px;width:7px;height:7px;border-radius:50%;background:var(--g)}
.pasi{counter-reset:p;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}.pasi div{background:var(--s2);border:1px solid var(--b);border-radius:14px;padding:18px;color:var(--d)}
.pasi div::before{counter-increment:p;content:counter(p);display:block;color:var(--g);font-weight:800;font-size:28px;margin-bottom:8px}
.tab{width:100%;border-collapse:separate;border-spacing:0;font-size:15px}.tab th,.tab td{padding:12px 10px;text-align:left;vertical-align:top;border-top:1px solid var(--b)}
.tab th{color:var(--f);font-size:11px;letter-spacing:.14em;text-transform:uppercase;border-top:0}.tab td:first-child{color:var(--d)}.tab td:last-child{color:var(--t);font-weight:700}.tab td:nth-child(2){color:var(--f)}
.citat{font-size:clamp(18px,2.6vw,22px);border-left:3px solid var(--g);padding:4px 0 4px 18px;margin:0;color:var(--t)}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}.btn{display:inline-block;background:var(--g);color:#0D0F14;font-weight:800;padding:15px 24px;border-radius:12px;text-decoration:none;font-size:16px;transition:transform .25s ease,box-shadow .25s ease}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(201,162,39,.25)}.btn2{background:transparent;color:var(--g);border:1px solid var(--g)}
.final{background:linear-gradient(160deg,var(--s),var(--bg));border:1px solid var(--b);border-radius:22px;padding:28px 20px;margin-top:72px}
.final p{color:var(--d)}.final p:last-of-type{color:var(--t);font-weight:700}
.f{color:var(--f);font-size:13px}.semnatura{margin-top:36px;border-top:1px solid var(--b);padding-top:16px}
.rv{opacity:0;transform:translateY(16px);transition:opacity .7s ease,transform .7s ease}.rv.in{opacity:1;transform:none}
@media (min-width:700px){.wrap{padding:48px 24px 96px}.semn{padding:30px 32px}.final{padding:36px 34px}}
@media (prefers-reduced-motion:reduce){.rv{opacity:1;transform:none;transition:none}.card,.btn,.scor div{transition:none}.hero::after,.jos::before{animation:none}}
@media print{body{background:#fff;color:#111}.semn,.card,.pasi div,.scor div,.final{background:#fff;border-color:#ddd}.rv{opacity:1;transform:none}.bifa{display:none}}
</style>`;
const SCRIPT_REVEAL = `<noscript><style>.rv{opacity:1;transform:none}</style></noscript><script>(()=>{const all=document.querySelectorAll('.rv');try{const io=new IntersectionObserver((es)=>{for(const e of es)if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}},{threshold:.12});all.forEach((el,i)=>{el.style.transitionDelay=(Math.min(i%6,5)*70)+'ms';io.observe(el)})}catch{}setTimeout(()=>all.forEach((el)=>el.classList.add('in')),1500)})();</script>`;
// ghidul: bifele numără semnele și aprind intervalul de scor (fără JS, totul se citește la fel)
const SCRIPT_SCOR = `<script>(()=>{const cs=[...document.querySelectorAll('.bifa input')];const n=document.getElementById('nr-bifate');const bs=[...document.querySelectorAll('.scor [data-de]')];
const up=()=>{const k=cs.filter((c)=>c.checked).length;if(n)n.textContent=k;cs.forEach((c)=>c.closest('.semn').classList.toggle('bifat',c.checked));bs.forEach((b)=>b.classList.toggle('activ',k>=+b.dataset.de&&k<=+b.dataset.pana));};
cs.forEach((c)=>c.addEventListener('change',up));up();})();</script>`;

const cap = (titlu, descriere) => `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0D0F14"><title>${esc(titlu)}</title><meta name="description" content="${esc(descriere)}">${STIL}</head><body><div class="wrap">`;

export function randeazaGhid(d, q = {}) {
  const g = GHID;
  const inscriere = linkInscriere(d.tally, q, 'ghid');
  const pdf = linkPdf('/ghid.pdf', q);
  return `${cap(`${g.titlu} · AleSystem Design`, g.sub)}
<section class="hero"><p class="eyebrow rv">${esc(g.eyebrow)}</p><h1 class="rv"><em>5 semne</em> că firma ta premium arată ieftin online</h1><p class="lead rv">${esc(g.sub)}</p><div class="line rv"></div><p class="jos rv">Începe de aici</p></section>
${g.intro.map((x) => `<p class="lead rv">${esc(x)}</p>`).join('')}
${g.semne.map((s, i) => `<article class="semn rv" id="semn-${i + 1}"><div class="nr">${i + 1}</div><h3>${esc(s.titlu)}</h3>
<p class="et">Ce vede clientul</p><p>${esc(s.vede)}</p>
<p class="et">De ce contează</p><p>${esc(s.deCe)}</p>
<p class="et">Testul de 2 minute</p><div class="test"><p>${esc(s.test)}</p></div>
<p class="et">Ce faci de mâine</p><ul>${s.faci.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<label class="bifa"><input type="checkbox" aria-label="Mă regăsesc în semnul ${i + 1}"> Mă regăsesc aici</label></article>`).join('')}
<h2 class="rv">Câte semne ai bifat?</h2><p class="numar rv"><span id="nr-bifate">0</span> din 5</p>
<div class="scor">${g.scor.map((s) => `<div class="rv" data-de="${s.de}" data-pana="${s.pana}"><b>${esc(s.titlu)}</b><p>${esc(s.text)}</p></div>`).join('')}</div>
<p class="lead rv" style="margin-top:18px">${esc(g.scorNota)}</p>
<section class="final rv"><p class="eyebrow">${esc(g.finalTitlu)}</p>${g.final.map((x) => `<p>${esc(x)}</p>`).join('')}
<div class="cta"><a class="btn" href="${esc(inscriere)}">${esc(g.cta)}</a><a class="btn btn2" href="${esc(pdf)}">Descarcă ghidul (PDF)</a><a class="btn btn2" href="${esc(linkPdf('/overview', q))}">Vezi ce e AleSystem</a></div></section>
<p class="f semnatura">${esc(g.semnatura)}</p>
</div>${SCRIPT_REVEAL}${SCRIPT_SCOR}</body></html>`;
}

export function randeazaOverview(d, q = {}) {
  const o = OVERVIEW;
  const inscriere = linkInscriere(d.tally, q, 'overview');
  const pdf = linkPdf('/overview.pdf', q);
  const card = (p, per) => `<div class="card rv">${p.eticheta && p.eticheta !== 'Listă de așteptare' ? `<span class="tag">${esc(p.eticheta)}</span>` : ''}<h3>${esc(p.nume)}</h3><p class="sub">${esc(p.subtitlu || '')}</p>${ARATA_PRETURI ? `<div class="pret">${nr(p.pret)} <span>lei${per}</span></div>` : ''}<ul>${(Array.isArray(p.include) ? p.include : []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  return `${cap('AleSystem Design · Overview', o.lead)}
<section class="hero"><p class="eyebrow rv">${esc(o.eyebrow)}</p><h1 class="rv">Compania din spatele companiei tale. <em>Din boți.</em></h1><p class="lead rv">${esc(o.lead)}</p><p class="motto rv">${esc(o.motto)}</p><div class="line rv"></div><p class="jos rv">5 minute de citit</p></section>
<h2 class="rv">Pe scurt</h2>${o.peScurt.map((x) => `<p class="lead rv">${esc(x)}</p>`).join('')}
<h2 class="rv">Ce face, concret</h2><div class="grid">${o.ceFace.map((c) => `<div class="card rv"><h3>${esc(c.titlu)}</h3><p>${esc(c.text)}</p></div>`).join('')}</div>
<h2 class="rv">Cum lucrăm</h2><div class="pasi">${o.pasi.map((x) => `<div class="rv">${esc(x)}</div>`).join('')}</div>
<h2 class="rv">Agenția clasică și AleSystem</h2><div class="rv" style="overflow-x:auto"><table class="tab"><thead><tr><th></th><th>Agenția clasică</th><th>AleSystem</th></tr></thead><tbody>${o.comparatie.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>
<h2 class="rv">Pentru cine</h2>${o.pentruCine.map((x) => `<p class="lead rv">${esc(x)}</p>`).join('')}<p class="citat rv">${esc(o.nuSuntem)}</p>
<h2 class="rv">Pachetele</h2><div class="grid">${d.lunare.map((p) => card(p, ' / lună')).join('')}</div>
${d.linia1.length ? `<h2 class="rv">Linia 1 · De la idee la companie</h2><div class="grid">${d.linia1.map((p) => card(p, ', o dată')).join('')}</div>` : ''}
<p class="f rv" style="margin-top:16px">${esc(o.notaPreturi)}</p>
<section class="final rv"><p class="eyebrow">27 noiembrie, 20:00</p><p>${esc(o.cineE)}</p><p>${esc(o.final)}</p>
<div class="cta"><a class="btn" href="${esc(inscriere)}">${esc(o.cta)}</a><a class="btn btn2" href="${esc(pdf)}">Descarcă overview-ul (PDF)</a><a class="btn btn2" href="${esc(linkPdf('/ghid', q))}">Ghidul: 5 semne</a></div></section>
<p class="f semnatura">${esc(o.semnatura)}</p>
</div>${SCRIPT_REVEAL}</body></html>`;
}

// ---------- PDF-urile (A4, întunecat, auriu, Manrope; butonul de înscriere e link) ----------
async function documentNou(titlu) {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  pdf.setTitle(titlu); pdf.setAuthor('AleSign&Co'); pdf.setLanguage('ro');
  const fb = await Promise.all([fontBytes('Manrope', 400), fontBytes('Manrope', 800)]);
  const ok = fb.every(Boolean);
  const F = ok ? { r: await pdf.embedFont(fb[0], { subset: true }), b: await pdf.embedFont(fb[1], { subset: true }) } : { r: await pdf.embedFont(StandardFonts.Helvetica), b: await pdf.embedFont(StandardFonts.HelveticaBold) };
  const T = ok ? (s) => String(s ?? '') : (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[„”]/g, '"').replace(/·/g, '-').replace(/−/g, '-').replace(/©/g, '(c)');
  const W = 595.28, H = 841.89, M = 54, LW = W - 2 * M;
  const C = { bg: rgb(0.051, 0.059, 0.078), s1: rgb(0.082, 0.094, 0.129), s2: rgb(0.106, 0.122, 0.165), line: rgb(0.153, 0.173, 0.22), gold: rgb(0.788, 0.635, 0.153), ink: rgb(0.949, 0.945, 0.929), dim: rgb(0.608, 0.631, 0.69), f: rgb(0.357, 0.376, 0.439) };
  const st = { page: null, y: 0, nr: 0 };
  const newPage = (antet = titlu) => {
    st.page = pdf.addPage([W, H]); st.nr += 1;
    st.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });
    st.page.drawText('AleSystem Design', { x: M, y: H - 36, size: 9, font: F.b, color: C.gold });
    const r = T(antet); st.page.drawText(r, { x: W - M - F.r.widthOfTextAtSize(r, 8), y: H - 36, size: 8, font: F.r, color: C.f });
    const n = String(st.nr); st.page.drawText(n, { x: W - M - F.r.widthOfTextAtSize(n, 8), y: 30, size: 8, font: F.r, color: C.f });
    st.y = H - 84;
  };
  const wrap = (text, font, size, width) => { const out = []; let cur = ''; for (const w of T(text).split(/\s+/).filter(Boolean)) { const x = cur ? `${cur} ${w}` : w; if (font.widthOfTextAtSize(x, size) > width && cur) { out.push(cur); cur = w; } else cur = x; } if (cur) out.push(cur); return out; };
  const need = (h) => { if (st.y - h < M + 10) newPage(); };
  const para = (text, { font = F.r, size = 10.5, color = C.dim, after = 8, width = LW, x = M, lh = 1.5 } = {}) => { const ls = wrap(text, font, size, width); need(ls.length * size * lh); for (const l of ls) { st.page.drawText(l, { x, y: st.y, size, font, color }); st.y -= size * lh; } st.y -= after; };
  const eticheta = (text) => { need(30); st.page.drawText(T(text).toUpperCase(), { x: M, y: st.y, size: 7.5, font: F.b, color: C.gold }); st.y -= 14; };
  const h2 = (text) => { need(70); st.y -= 8; for (const l of wrap(text, F.b, 19, LW)) { st.page.drawText(l, { x: M, y: st.y, size: 19, font: F.b, color: C.ink }); st.y -= 24; } st.y += 6; st.page.drawLine({ start: { x: M, y: st.y }, end: { x: M + 70, y: st.y }, thickness: 1.2, color: C.gold }); st.y -= 22; };
  const bullets = (items, { x = M, width = LW, size = 10.5 } = {}) => { for (const it of items) { const ls = wrap(it, F.r, size, width - 16); need(ls.length * size * 1.5 + 6); st.page.drawCircle({ x: x + 3, y: st.y + 3.5, size: 2.2, color: C.gold }); for (const l of ls) { st.page.drawText(l, { x: x + 14, y: st.y, size, font: F.r, color: C.dim }); st.y -= size * 1.5; } st.y -= 5; } };
  const caseta = (text, { size = 10.5 } = {}) => { const ls = wrap(text, F.r, size, LW - 30); const lh = size * 1.5; const h = ls.length * lh + 18; need(h + 10); const top = st.y + 2; st.page.drawRectangle({ x: M, y: top - h, width: LW, height: h, color: C.s2 }); st.page.drawRectangle({ x: M, y: top - h, width: 2.5, height: h, color: C.gold }); let yy = top - 9 - size; for (const l of ls) { st.page.drawText(l, { x: M + 16, y: yy, size, font: F.r, color: C.ink }); yy -= lh; } st.y = top - h - 14; };
  const legatura = (url, x1, y1, x2, y2) => {
    const a = pdf.context.register(pdf.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x1, y1, x2, y2], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) } }));
    const ex = st.page.node.lookup(PDFName.of('Annots'));
    if (ex) ex.push(a); else st.page.node.set(PDFName.of('Annots'), pdf.context.obj([a]));
  };
  const buton = (text, url, { secundar = false } = {}) => {
    need(50); const t = T(text); const w = F.b.widthOfTextAtSize(t, 11.5) + 36; const h = 32; const y0 = st.y - 10;
    if (secundar) st.page.drawRectangle({ x: M, y: y0, width: w, height: h, borderColor: C.gold, borderWidth: 1 });
    else st.page.drawRectangle({ x: M, y: y0, width: w, height: h, color: C.gold });
    st.page.drawText(t, { x: M + 18, y: y0 + 11, size: 11.5, font: F.b, color: secundar ? C.gold : C.bg });
    legatura(url, M, y0, M + w, y0 + h);
    st.page.drawText(T(url.replace(/^https?:\/\//, '').replace(/\?.*$/, '')), { x: M + w + 12, y: y0 + 12, size: 8.5, font: F.r, color: C.f });
    st.y = y0 - 22;
  };
  const coperta = ({ eyebrow, linii, lead, motto, jos }) => {
    newPage(''); st.y = H - 290;
    st.page.drawText(T(eyebrow).toUpperCase(), { x: M, y: st.y, size: 9, font: F.b, color: C.gold }); st.y -= 46;
    for (const [i, l] of linii.entries()) { for (const r of wrap(l, F.b, 40, LW)) { st.page.drawText(r, { x: M, y: st.y, size: 40, font: F.b, color: i === 0 ? C.gold : C.ink }); st.y -= 46; } }
    st.y -= 6; para(lead, { size: 13, color: C.dim, width: LW - 40, after: 12, lh: 1.5 });
    if (motto) para(motto, { font: F.b, size: 15, color: C.ink, after: 0 });
    st.page.drawLine({ start: { x: M, y: st.y - 12 }, end: { x: M + 110, y: st.y - 12 }, thickness: 1.2, color: C.gold });
    if (jos) st.page.drawText(T(jos), { x: M, y: M, size: 9, font: F.r, color: C.f });
  };
  return { pdf, F, T, C, W, H, M, LW, st, newPage, wrap, need, para, eticheta, h2, bullets, caseta, buton, coperta, legatura };
}

export async function ghidPdf(d, q = {}) {
  const g = GHID; const D = await documentNou(g.titlu);
  const { F, T, C, M, LW, st } = D;
  const inscriere = linkInscriere(d.tally, q, 'ghid_pdf');
  D.coperta({ eyebrow: g.eyebrow, linii: ['5 semne', 'că firma ta premium arată ieftin online'], lead: g.sub, motto: '', jos: g.semnatura });
  D.newPage(); D.h2('Înainte să începi'); for (const x of g.intro) D.para(x, { size: 12, color: C.ink, after: 10, lh: 1.55 });
  for (const [i, s] of g.semne.entries()) {
    D.newPage(`Semnul ${i + 1} din 5`);
    st.page.drawText(String(i + 1), { x: M, y: st.y - 30, size: 72, font: F.b, color: C.gold }); st.y -= 66;
    for (const l of D.wrap(s.titlu, F.b, 21, LW)) { st.page.drawText(l, { x: M, y: st.y, size: 21, font: F.b, color: C.ink }); st.y -= 27; }
    st.y -= 10;
    D.eticheta('Ce vede clientul'); D.para(s.vede, { size: 11.5, after: 16 });
    D.eticheta('De ce contează'); D.para(s.deCe, { size: 11.5, after: 16 });
    D.eticheta('Testul de 2 minute'); D.caseta(s.test, { size: 11.5 }); st.y -= 4;
    D.eticheta('Ce faci de mâine'); D.bullets(s.faci, { size: 11.5 });
    st.y -= 6; D.need(30); st.page.drawRectangle({ x: M, y: st.y - 4, width: 11, height: 11, borderColor: C.gold, borderWidth: 1 }); st.page.drawText(T('Mă regăsesc aici'), { x: M + 20, y: st.y - 2, size: 10, font: F.b, color: C.ink }); st.y -= 24;
  }
  D.newPage(); D.h2('Câte semne ai bifat?');
  for (const s of g.scor) { const ls = D.wrap(s.text, F.r, 10.5, LW - 30); const h = 30 + ls.length * 15.5; D.need(h + 10); st.page.drawRectangle({ x: M, y: st.y - h + 14, width: LW, height: h, color: C.s1, borderColor: C.line, borderWidth: 0.6 }); st.page.drawText(T(s.titlu), { x: M + 16, y: st.y - 4, size: 12.5, font: F.b, color: C.gold }); let yy = st.y - 22; for (const l of ls) { st.page.drawText(l, { x: M + 16, y: yy, size: 10.5, font: F.r, color: C.dim }); yy -= 15.5; } st.y -= h + 10; }
  D.para(g.scorNota, { size: 11, color: C.ink, after: 22 });
  D.h2(g.finalTitlu); for (const [i, x] of g.final.entries()) D.para(x, { size: 11.5, color: i === g.final.length - 1 ? C.ink : C.dim, font: i === g.final.length - 1 ? F.b : F.r, after: 10 });
  st.y -= 6; D.buton(g.cta, inscriere);
  D.para(g.semnatura, { size: 9, color: C.f, after: 0 });
  return Buffer.from(await D.pdf.save());
}

export async function overviewPdf(d, q = {}) {
  const o = OVERVIEW; const D = await documentNou('AleSystem Design · Overview');
  const { F, T, C, M, LW, st } = D;
  const inscriere = linkInscriere(d.tally, q, 'overview_pdf');
  D.coperta({ eyebrow: o.eyebrow, linii: ['Compania din spatele companiei tale.', 'Din boți.'], lead: o.lead, motto: o.motto, jos: o.semnatura });
  D.newPage(); D.h2('Pe scurt'); for (const x of o.peScurt) D.para(x, { size: 12, color: C.ink, after: 10 });
  st.y -= 6; D.h2('Ce face, concret');
  for (const c of o.ceFace) { const ls = D.wrap(c.text, F.r, 10.5, LW - 110); const h = Math.max(ls.length * 15.5, 16) + 18; D.need(h + 6); st.page.drawRectangle({ x: M, y: st.y - h + 14, width: LW, height: h, color: C.s1, borderColor: C.line, borderWidth: 0.6 }); st.page.drawText(T(c.titlu), { x: M + 14, y: st.y - 3, size: 12, font: F.b, color: C.gold }); let yy = st.y - 3; for (const l of ls) { st.page.drawText(l, { x: M + 104, y: yy, size: 10.5, font: F.r, color: C.dim }); yy -= 15.5; } st.y -= h + 6; }
  D.newPage(); D.h2('Cum lucrăm');
  for (const [i, x] of o.pasi.entries()) { D.need(50); st.page.drawText(String(i + 1), { x: M, y: st.y - 6, size: 24, font: F.b, color: C.gold }); const ls = D.wrap(x, F.r, 11.5, LW - 36); let yy = st.y; for (const l of ls) { st.page.drawText(l, { x: M + 34, y: yy, size: 11.5, font: F.r, color: C.dim }); yy -= 17; } st.y = Math.min(yy, st.y - 30) - 12; }
  st.y -= 4; D.h2('Agenția clasică și AleSystem');
  const c1 = 150, c2 = 140; D.need(24); st.page.drawText('AGENȚIA CLASICĂ', { x: M + c1, y: st.y, size: 7.5, font: F.b, color: C.f }); st.page.drawText('ALESYSTEM', { x: M + c1 + c2, y: st.y, size: 7.5, font: F.b, color: C.gold }); st.y -= 12;
  for (const r of o.comparatie) { const a = D.wrap(r[0], F.r, 10, c1 - 12), b = D.wrap(r[1], F.r, 10, c2 - 12), c = D.wrap(r[2], F.b, 10, LW - c1 - c2); const n = Math.max(a.length, b.length, c.length); D.need(n * 14 + 14); st.page.drawLine({ start: { x: M, y: st.y + 4 }, end: { x: M + LW, y: st.y + 4 }, thickness: 0.5, color: C.line }); st.y -= 10; for (let k = 0; k < n; k++) { if (a[k]) st.page.drawText(a[k], { x: M, y: st.y, size: 10, font: F.r, color: C.dim }); if (b[k]) st.page.drawText(b[k], { x: M + c1, y: st.y, size: 10, font: F.r, color: C.f }); if (c[k]) st.page.drawText(c[k], { x: M + c1 + c2, y: st.y, size: 10, font: F.b, color: C.ink }); st.y -= 14; } st.y -= 4; }
  st.y -= 10; D.h2('Pentru cine'); for (const x of o.pentruCine) D.para(x, { size: 11, after: 8 }); D.caseta(o.nuSuntem, { size: 11 });
  const cardPdf = (p, per) => {
    const inc = Array.isArray(p.include) ? p.include : [];
    const incL = inc.map((x) => D.wrap(x, F.r, 9.5, LW - 46));
    const start = ARATA_PRETURI ? 70 : 48;
    const h = start + incL.reduce((s2, l) => s2 + l.length * 13 + 2, 0) + 4;
    D.need(h + 14);
    const top = st.y + 6;
    st.page.drawRectangle({ x: M, y: top - h, width: LW, height: h, color: C.s1, borderColor: C.line, borderWidth: 0.6 });
    st.page.drawText(T(p.nume), { x: M + 16, y: top - 22, size: 15, font: F.b, color: C.ink });
    if (p.eticheta && p.eticheta !== 'Listă de așteptare') { const e = T(p.eticheta).toUpperCase(); const ew = F.b.widthOfTextAtSize(e, 7.5) + 12; st.page.drawRectangle({ x: M + LW - 16 - ew, y: top - 26, width: ew, height: 13, color: C.gold }); st.page.drawText(e, { x: M + LW - 10 - ew, y: top - 22.5, size: 7.5, font: F.b, color: C.bg }); }
    st.page.drawText(T(p.subtitlu || ''), { x: M + 16, y: top - 37, size: 9.5, font: F.r, color: C.dim });
    if (ARATA_PRETURI) { const pr = `${nr(p.pret)} lei`; st.page.drawText(pr, { x: M + 16, y: top - 58, size: 17, font: F.b, color: C.gold }); st.page.drawText(T(per), { x: M + 20 + F.b.widthOfTextAtSize(pr, 17), y: top - 58, size: 9, font: F.r, color: C.f }); }
    let yy = top - start - 6;
    for (const ls of incL) { st.page.drawCircle({ x: M + 20, y: yy + 3, size: 1.8, color: C.gold }); for (const l of ls) { st.page.drawText(l, { x: M + 30, y: yy, size: 9.5, font: F.r, color: C.dim }); yy -= 13; } yy -= 2; }
    st.y = top - h - 14;
  };
  D.newPage(); D.h2('Pachetele'); for (const p of d.lunare) cardPdf(p, '/ lună');
  if (d.linia1.length) { st.y -= 10; D.need(190); D.h2('Linia 1 · De la idee la companie'); for (const p of d.linia1) cardPdf(p, ', o dată'); }
  st.y -= 4; D.para(o.notaPreturi, { size: 9, color: C.f, after: 18 });
  D.need(170); D.h2('27 noiembrie, 20:00'); D.para(o.cineE, { size: 11.5, after: 8 }); D.para(o.final, { size: 11.5, color: C.ink, font: F.b, after: 14 });
  D.buton(o.cta, inscriere);
  D.para(o.semnatura, { size: 9, color: C.f, after: 0 });
  return Buffer.from(await D.pdf.save());
}
