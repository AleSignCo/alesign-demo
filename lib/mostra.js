// Mostra vie (Anexa v1.1, pasul 7): pagina pe care o primește leadul după apel.
// demo.alesign.net/m/<slug> → deschidere (3 ramuri) · ce am văzut · demo · pachete · cum decurge · invitație + formular · prelungire · subsol.
// Șablon pe ramuri, zero text generat per lead. Dacă un câmp lipsește, bucata lui nu apare.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }) : '');
const nr = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString('ro-RO'));

export const FRAZA_PRELUNGIRE = 'Da, vreau să prelungesc acest termen cu 7 zile';

// Catalog (03.09.2026). Se rescrie când Alex reface pachetele; pagina citește doar de aici.
export const PACHETE = [
  { id: 'prezenta', nume: 'Prezență', pret: '990', per: 'lună', min: 'minim 3 luni', include: ['Site-ul tău, ținut în formă', 'Un canal social postat constant', 'Recenzii cerute automat după fiecare vizită', 'Raport lunar, pe înțelesul tău'] },
  { id: 'crestere', nume: 'Creștere', pret: '2.490', per: 'lună', min: 'minim 3 luni', eticheta: 'Recomandat', include: ['Tot ce e în Prezență', 'Strategie și poziționare, o dată, la început', 'Două canale sociale', 'O campanie de reclame, cu pagina ei', 'Radar săptămânal: ce fac concurenții din zonă'] },
  { id: 'dominare', nume: 'Dominare', pret: '4.990', per: 'lună', min: 'minim 6 luni', include: ['Tot ce e în Creștere', 'Toate canalele, campanii nelimitate', 'Suport pentru clienții tăi, inclus', 'Radar zilnic și un apel lunar cu mine', 'Prioritate la proiectele făcute de mână'] },
];

const RAMURI = {
  fara_site: {
    eyebrow: 'O mostră pentru',
    scrisoare: (d) => [
      `Mersi că mi-ai dat câteva minute azi. Ți-am promis ceva concret, nu vorbe. Uite.`,
      `Am căutat ${d.firma} exact cum ar face-o un client nou: pe Google, seara, de pe telefon. Am găsit ${d.rating} stele din ${nr(d.nr_recenzii)} recenzii. Asta nu se cumpără, se muncește. Dar după recenzii vine un gol: niciun loc unde să vadă serviciile, prețurile, atmosfera. Și aici pierzi oameni care erau deja convinși.`,
      `Google e primul loc unde te caută cineva. Instagram și TikTok sunt al doilea, acolo se decide dacă îi place cum arăți. La amândouă te pot ajuta. Am început cu primul: mai jos e cum ar putea arăta ${d.firma} online. E o mostră făcută într-o seară, din ce se vede public despre tine. Site-ul adevărat îl facem împreună, cu pozele și cuvintele tale.`,
    ],
    observatii: (d) => [
      { vazut: 'Apari pe Google doar dacă cineva îți știe numele.', costa: `Cine caută „${d.termen || 'salon'} ${d.zona || 'în zonă'}" găsește vecinii.`, facem: 'Site și fișă Google optimizate pe serviciu și zonă.' },
      { vazut: 'Recenziile tale sunt excelente, dar nu duc nicăieri.', costa: 'Omul deja convins nu are unde să vadă prețuri și să programeze.', facem: 'Pagină de servicii și programare, legată de fișa Google.' },
      { vazut: 'Al doilea loc unde te verifică un client nou e social media.', costa: 'Un profil actualizat rar spune „poate nu mai lucrează".', facem: 'Conținut postat constant, fără să te ocupi tu.' },
    ],
    pornire: { titlu: 'Lansare', pret: '4.490', per: 'o dată', text: 'Website nou, al tău, plus trei luni de Prezență. Site-ul singur nu aduce clienți. Site-ul plus trei luni de prezență constantă, da.' },
    recomandat: 'crestere',
  },
  site_slab: {
    eyebrow: 'O mostră pentru',
    scrisoare: (d) => [
      `Mersi pentru discuția de azi. Cum am promis, ceva concret.`,
      `Am făcut ce face orice client nou înainte să sune: te-am căutat pe Google, de pe telefon. Recenziile: ${d.rating} stele din ${nr(d.nr_recenzii)}. Impresionant. Apoi am deschis site-ul. Și aici s-a rupt filmul: ${d.scor} din 100 la testele pe care le folosește Google ca să decidă pe cine arată primul. Un client îl deschide, așteaptă, vede ceva care nu seamănă cu salonul tău, și pleacă. Nu-ți spune nimeni. Pur și simplu nu mai sună.`,
      `Nu-ți propun un site nou. Îl repar pe al tău, îl aduc la nivelul recenziilor, și după aia ne ocupăm de locul unde se face alegerea: Instagram și TikTok. Mai jos, ce am observat și o mostră de direcție.`,
    ],
    observatii: (d) => dinAudit(d),
    pornire: { titlu: 'Website Refresh, dăruit', pret: '0', per: 'inclus în orice abonament', text: 'Site-ul tău, adus la nivelul recenziilor: viteză, mobil, programare. Nu-l plătești separat. Vine cu abonamentul.' },
    recomandat: 'crestere',
  },
  site_bun: {
    eyebrow: 'O mostră pentru',
    scrisoare: (d) => [
      `Mersi pentru discuția de azi. Îți datorez ceva concret. Uite.`,
      `Te-am căutat pe Google ca un client nou. Recenzii: ${d.rating} din ${nr(d.nr_recenzii)}. Site: ${d.scor} din 100. Rar văd un salon din ${d.zona || 'București'} cu amândouă în regulă, așa că nu-ți scriu ca să-ți vând un site. Ai unul bun.`,
      `Îți scriu pentru ce vine după Google: Instagram, TikTok, reclamele, mesajul care aduce clientul înapoi a treia oară. Acolo se câștigă acum. Și acolo, din ce văd, ${d.firma} lucrează manual, când are timp. Mai jos: trei lucruri pe care le-aș face în locul tău, și o mostră de direcție.`,
    ],
    observatii: (d) => dinAudit(d),
    pornire: null,
    recomandat: 'crestere',
  },
};

// Cele 3 observații din Bot 2 (audit_probleme: text) + a treia fixă despre social, dacă botul a dat mai puțin de 3.
function dinAudit(d) {
  const p = Array.isArray(d.probleme) ? d.probleme.slice(0, 3) : [];
  const facem = d.ramura === 'site_bun' ? 'Îl rezolvăm în prima lună. E inclus.' : 'Se rezolvă în Website Refresh, prima săptămână.';
  const out = p.map((x) => (typeof x === 'string' ? { vazut: x, facem } : { vazut: x.vazut || x.titlu || '', costa: x.costa || x.de_ce || '', facem: x.facem || facem }));
  const social = { vazut: 'Al doilea loc unde te verifică un client nou e social media.', costa: 'Un profil actualizat rar spune „poate nu mai lucrează".', facem: 'Conținut postat constant, fără să te ocupi tu.' };
  if (out.length < 3) out.push(social);
  return out.slice(0, 3);
}

export function randeazaMostra(d, { preview = false } = {}) {
  const ramura = RAMURI[d.ramura] ? d.ramura : 'fara_site';
  const R = RAMURI[ramura];
  const firma = d.firma || '';
  const azi = d.azi ? new Date(d.azi) : new Date();
  const expira = d.expira_la ? new Date(d.expira_la) : null;
  const zile = expira ? Math.ceil((expira - azi) / 86400000) : null;
  const poatePrelungi = zile != null && zile <= 2 && zile >= 0 && !d.prelungita;
  const paragrafe = R.scrisoare(d);
  const obs = R.observatii(d);
  const demoUrl = d.demo_url || '';
  const scor = d.scor != null && ramura !== 'fara_site' ? Number(d.scor) : null;
  const rec = PACHETE.find((p) => p.id === (d.recomandat || R.recomandat)) || PACHETE[1];

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(firma)} · o mostră de la AleSystem Design</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#f5f2ec; --text:#141414; --muted:#6b675f; --soft:#a39e94; --surface:#fbf9f5; --line:#e2ddd3; --accent:#ff2a2e; --ink:#0c0c0d; --ink-text:#f4f1ea; }
  * { box-sizing:border-box; margin:0; padding:0; }
  html { scroll-behavior:smooth; }
  body { background:var(--bg); color:var(--text); font-family:Manrope, system-ui, sans-serif; line-height:1.65; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  h1,h2,h3,.serif { font-family:'Cormorant Garamond', Georgia, serif; font-weight:600; letter-spacing:-0.01em; line-height:1.08; }
  .wrap { width:min(1040px, 100% - 40px); margin:0 auto; }
  .eyebrow { font-size:11.5px; letter-spacing:.24em; text-transform:uppercase; font-weight:700; color:var(--muted); display:flex; align-items:center; gap:10px; }
  .eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--accent); }
  section { padding:88px 0; }
  section + section { border-top:1px solid var(--line); }
  .h2 { font-size:clamp(30px, 4vw, 44px); margin:14px 0 14px; }
  .lead { color:var(--muted); font-size:17px; max-width:60ch; }

  /* antet */
  header.top { position:sticky; top:0; z-index:20; background:color-mix(in srgb, var(--bg) 84%, transparent); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
  header.top .wrap { display:flex; align-items:center; justify-content:space-between; height:64px; gap:16px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:14px; letter-spacing:.02em; }
  .brand svg { width:22px; height:22px; }
  .valabil { font-size:12.5px; color:var(--muted); }
  .valabil b { color:var(--text); font-weight:600; }

  /* scrisoare */
  .scrisoare { padding:96px 0 80px; }
  .scrisoare h1 { font-size:clamp(44px, 7vw, 84px); margin:18px 0 34px; max-width:12ch; }
  .scrisoare h1 .w { display:inline-block; }
  .scrisoare .text { max-width:66ch; }
  .scrisoare .text p { font-size:clamp(17px, 1.5vw, 19.5px); margin-bottom:20px; color:#2a2823; }
  .scrisoare .text p:first-child { font-family:'Cormorant Garamond', serif; font-size:clamp(24px, 2.6vw, 30px); font-weight:500; color:var(--text); line-height:1.3; }
  .semn { display:flex; align-items:center; gap:14px; margin-top:34px; }
  .semn .nume { font-family:'Cormorant Garamond', serif; font-style:italic; font-size:30px; font-weight:500; }
  .semn .rol { font-size:12.5px; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; }
  .semn .rol::before { content:''; display:inline-block; width:22px; height:1px; background:var(--line); vertical-align:middle; margin-right:10px; }
  .cifre { display:flex; gap:44px; flex-wrap:wrap; margin-top:54px; padding-top:30px; border-top:1px solid var(--line); }
  .cifre div { min-width:120px; }
  .cifre b { font-family:'Cormorant Garamond', serif; font-size:44px; font-weight:600; display:block; line-height:1; }
  .cifre b small { font-size:20px; color:var(--soft); font-weight:500; }
  .cifre span { font-size:12.5px; color:var(--muted); letter-spacing:.08em; text-transform:uppercase; }

  /* observații */
  .obs { display:grid; grid-template-columns:repeat(3, 1fr); gap:18px; margin-top:38px; }
  .obs article { background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:28px 26px 26px; position:relative; transition:transform .35s ease, box-shadow .35s ease; }
  .obs article:hover { transform:translateY(-3px); box-shadow:0 18px 40px -28px rgba(20,20,20,.35); }
  .obs .n { font-family:'Cormorant Garamond', serif; font-size:38px; line-height:1; color:var(--soft); font-weight:500; margin-bottom:16px; }
  .obs h3 { font-size:23px; margin-bottom:14px; line-height:1.2; }
  .obs dl { display:grid; gap:10px; }
  .obs dt { font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); font-weight:700; }
  .obs dd { font-size:14.5px; color:#3b3833; margin-bottom:4px; }
  .obs dd.facem { color:var(--text); font-weight:600; }

  /* demo */
  .demo .cadru { margin-top:36px; background:var(--ink); border-radius:22px; padding:14px; position:relative; box-shadow:0 40px 80px -50px rgba(0,0,0,.6); }
  .demo .bara { display:flex; align-items:center; gap:8px; padding:4px 6px 12px; }
  .demo .bara i { width:10px; height:10px; border-radius:50%; background:#3a3a3d; display:block; }
  .demo .bara .url { margin-left:10px; font-size:12px; color:#8d8d92; font-family:ui-monospace, monospace; }
  .demo .ecran { position:relative; width:100%; aspect-ratio:16/10; border-radius:12px; overflow:hidden; background:#151516; }
  .demo .ecran::before { content:'Se încarcă mostra…'; position:absolute; inset:0; display:grid; place-items:center; color:#6f6f74; font-size:13px; letter-spacing:.08em; }
  .demo iframe { position:absolute; top:0; left:0; width:1280px; height:800px; border:0; background:#fff; transform-origin:0 0; transform:scale(var(--s, 1)); pointer-events:none; }
  .badge { position:absolute; top:-14px; left:28px; background:var(--accent); color:#fff; font-size:11px; letter-spacing:.2em; text-transform:uppercase; font-weight:700; padding:8px 14px; border-radius:999px; box-shadow:0 8px 20px -8px rgba(255,42,46,.7); }
  .demo .sub { display:flex; justify-content:space-between; gap:20px; align-items:center; margin-top:22px; flex-wrap:wrap; }
  .demo .sub p { color:var(--muted); font-size:14.5px; max-width:64ch; }
  .demo .sub p b { color:var(--text); }

  /* butoane */
  .btn { display:inline-flex; align-items:center; gap:12px; padding:15px 24px; border-radius:999px; background:var(--ink); color:var(--ink-text); font-weight:600; font-size:15px; border:0; cursor:pointer; position:relative; overflow:hidden; transition:transform .2s ease, box-shadow .2s ease; white-space:nowrap; }
  .btn::after { content:''; position:absolute; inset:0; background:var(--accent); transform:translateX(-101%); transition:transform .45s cubic-bezier(.7,0,.2,1); z-index:0; }
  .btn > * { position:relative; z-index:1; }
  .btn:hover { transform:translateY(-2px); box-shadow:0 14px 30px -16px rgba(0,0,0,.6); }
  .btn:hover::after { transform:translateX(0); }
  .btn .ar { display:inline-block; transition:transform .3s ease; }
  .btn:hover .ar { transform:translateX(4px); }
  .btn.ghost { background:transparent; color:var(--text); border:1px solid var(--line); }
  .btn.ghost::after { background:var(--ink); }
  .btn.ghost:hover { color:var(--ink-text); }
  .lnk { position:relative; font-weight:600; padding-bottom:2px; }
  .lnk::after { content:''; position:absolute; left:0; bottom:0; width:100%; height:1px; background:currentColor; transform:scaleX(0); transform-origin:right; transition:transform .4s cubic-bezier(.7,0,.2,1); }
  .lnk:hover::after { transform:scaleX(1); transform-origin:left; }

  /* pachete */
  .pornire { margin-top:36px; background:var(--ink); color:var(--ink-text); border-radius:22px; padding:34px 36px; display:grid; grid-template-columns:1.3fr .7fr; gap:30px; align-items:center; }
  .pornire .eyebrow { color:#b9b4aa; }
  .pornire .eyebrow::before { background:var(--accent); }
  .pornire h3 { font-size:36px; margin:10px 0 8px; }
  .pornire p { color:#cbc6bb; font-size:15.5px; max-width:52ch; }
  .pornire .pret { text-align:right; }
  .pornire .pret b { font-family:'Cormorant Garamond', serif; font-size:56px; font-weight:600; line-height:1; display:block; }
  .pornire .pret span { font-size:12.5px; color:#b9b4aa; letter-spacing:.08em; text-transform:uppercase; }
  .tiers { display:grid; grid-template-columns:repeat(3, 1fr); gap:18px; margin-top:22px; align-items:stretch; }
  .tier { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:30px 28px; display:flex; flex-direction:column; position:relative; transition:transform .35s ease, box-shadow .35s ease, border-color .35s ease; }
  .tier:hover { transform:translateY(-4px); box-shadow:0 24px 50px -34px rgba(20,20,20,.4); }
  .tier.rec { border-color:var(--text); transform:translateY(-8px); }
  .tier.rec:hover { transform:translateY(-11px); }
  .tier .et { position:absolute; top:-13px; left:26px; background:var(--text); color:var(--bg); font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; font-weight:700; padding:7px 12px; border-radius:999px; }
  .tier h3 { font-size:30px; margin-bottom:6px; }
  .tier .p { display:flex; align-items:baseline; gap:6px; margin:6px 0 4px; }
  .tier .p b { font-family:'Cormorant Garamond', serif; font-size:46px; font-weight:600; line-height:1; }
  .tier .p span { color:var(--muted); font-size:14px; }
  .tier .min { font-size:12.5px; color:var(--soft); margin-bottom:18px; }
  .tier ul { list-style:none; display:grid; gap:9px; margin-bottom:26px; flex:1; }
  .tier li { font-size:14.5px; color:#3b3833; padding-left:18px; position:relative; }
  .tier li::before { content:''; position:absolute; left:0; top:10px; width:7px; height:7px; border-radius:50%; background:var(--accent); }
  .tier .btn { align-self:flex-start; }
  .tier.rec .btn { background:var(--accent); }
  .tier.rec .btn::after { background:var(--ink); }
  .custom { margin-top:18px; border:1px dashed var(--soft); border-radius:22px; padding:28px 30px; display:grid; grid-template-columns:1fr auto; gap:24px; align-items:center; }
  .custom h3 { font-size:28px; margin-bottom:6px; }
  .custom p { color:var(--muted); font-size:15px; max-width:60ch; }
  .nota { font-size:13px; color:var(--soft); margin-top:16px; }

  /* pași */
  .pasi { display:grid; grid-template-columns:repeat(3, 1fr); gap:32px; margin-top:38px; counter-reset:p; }
  .pasi div { border-top:2px solid var(--text); padding-top:20px; position:relative; }
  .pasi div::before { counter-increment:p; content:'0' counter(p); font-size:11.5px; letter-spacing:.2em; color:var(--muted); font-weight:700; display:block; margin-bottom:12px; }
  .pasi h3 { font-size:26px; margin-bottom:8px; }
  .pasi p { color:var(--muted); font-size:15px; }

  /* invitație */
  .invit { display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:start; }
  .invit .text p { color:var(--muted); font-size:17px; max-width:44ch; margin-top:14px; }
  form { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:30px; display:grid; gap:16px; }
  .f { display:grid; gap:6px; }
  .f label { font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; font-weight:700; color:var(--muted); }
  .f input, .f textarea { font:inherit; font-size:15.5px; padding:13px 14px; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--text); outline:none; transition:border-color .2s ease, box-shadow .2s ease; width:100%; }
  .f input:focus, .f textarea:focus { border-color:var(--text); box-shadow:0 0 0 4px rgba(20,20,20,.06); }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .seg { display:flex; gap:6px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:5px; }
  .seg label { flex:1; text-align:center; font-size:14px; font-weight:600; padding:9px 8px; border-radius:9px; cursor:pointer; color:var(--muted); transition:all .2s ease; text-transform:none; letter-spacing:0; }
  .seg input { display:none; }
  .seg input:checked + label { background:var(--ink); color:var(--ink-text); }
  .acord { display:flex; gap:12px; align-items:flex-start; font-size:13.5px; color:var(--muted); }
  .acord input { width:18px; height:18px; margin-top:2px; accent-color:var(--text); flex:none; }
  form .btn { justify-content:center; }
  .multumesc { display:none; background:var(--ink); color:var(--ink-text); border-radius:22px; padding:40px 34px; }
  .multumesc h3 { font-size:36px; margin-bottom:10px; }
  .multumesc p { color:#cbc6bb; font-size:16px; }
  form.trimis { display:none; } form.trimis + .multumesc { display:block; }
  .eroare { color:var(--accent); font-size:13.5px; display:none; }

  /* prelungire */
  .prel { margin-top:56px; border:1px solid var(--line); background:var(--surface); border-radius:22px; padding:28px 30px; display:grid; grid-template-columns:1fr auto; gap:24px; align-items:center; }
  .prel h3 { font-size:26px; margin-bottom:4px; }
  .prel p { color:var(--muted); font-size:15px; }
  .prel .btn { white-space:normal; text-align:left; }
  .prel.gata h3 { color:var(--text); }

  footer { border-top:1px solid var(--line); padding:34px 0 46px; font-size:13px; color:var(--muted); }
  footer .wrap { display:flex; justify-content:space-between; gap:18px; flex-wrap:wrap; align-items:center; }
  footer .as { display:flex; align-items:center; gap:8px; }
  footer .as svg { width:16px; height:16px; }

  /* animații */
  .rv { opacity:0; transform:translateY(16px); transition:opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1); transition-delay:var(--d, 0s); }
  .rv.in { opacity:1; transform:none; }
  .scrisoare h1 .w { opacity:0; transform:translateY(18px) rotate(1deg); animation:w .9s cubic-bezier(.2,.7,.2,1) forwards; animation-delay:calc(.12s + var(--i) * .07s); }
  @keyframes w { to { opacity:1; transform:none; } }
  @media (prefers-reduced-motion: reduce) { .rv, .scrisoare h1 .w { opacity:1; transform:none; transition:none; animation:none; } .btn, .tier, .obs article { transition:none; } }

  @media (max-width: 880px) {
    section { padding:64px 0; }
    .scrisoare { padding:64px 0 56px; }
    .obs, .tiers, .pasi { grid-template-columns:1fr; }
    .tier.rec { transform:none; } .tier.rec:hover { transform:translateY(-4px); }
    .pornire, .custom, .invit, .prel { grid-template-columns:1fr; }
    .pornire .pret { text-align:left; }
    .row { grid-template-columns:1fr; }
    .valabil { display:none; }
    .demo .ecran { aspect-ratio:4/5; } .demo iframe { width:390px; height:844px; }
    .cifre { gap:26px; }
  }
</style>
</head>
<body>

<header class="top"><div class="wrap">
  <a class="brand" href="https://alesign.net" target="_blank" rel="noopener">${MARCA}<span>AleSystem Design</span></a>
  ${expira ? `<div class="valabil">Pregătit pentru <b>${esc(firma)}</b> · valabil până pe <b>${dataRo(expira)}</b></div>` : ''}
</div></header>

<section class="scrisoare"><div class="wrap">
  <p class="eyebrow rv">${esc(R.eyebrow)} ${esc(firma)}</p>
  <h1>${cuvinte('Salut, sunt Alexandru, de la AleSign.')}</h1>
  <div class="text">
    ${paragrafe.map((p, i) => `<p class="rv" style="--d:${0.35 + i * 0.12}s">${esc(p)}</p>`).join('\n    ')}
  </div>
  <div class="semn rv" style="--d:.8s"><span class="nume">Alexandru</span><span class="rol">AleSign&amp;Co</span></div>
  ${cifre(d, scor)}
</div></section>

<section class="observ"><div class="wrap">
  <p class="eyebrow rv">Ce am văzut</p>
  <h2 class="h2 rv" style="--d:.08s">Ce am văzut, ca un client nou.</h2>
  <p class="lead rv" style="--d:.14s">Trei lucruri. Nu e o listă de reproșuri, e ce mi-a sărit în ochi în primele două minute. Exact ce vede și clientul tău.</p>
  <div class="obs">
    ${obs.map((o, i) => `<article class="rv" style="--d:${0.1 + i * 0.12}s"><div class="n">0${i + 1}</div><h3>${esc(o.vazut)}</h3><dl>${o.costa ? `<dt>Ce te costă</dt><dd>${esc(o.costa)}</dd>` : ''}${o.facem ? `<dt>Ce facem</dt><dd class="facem">${esc(o.facem)}</dd>` : ''}</dl></article>`).join('\n    ')}
  </div>
</div></section>

${demoUrl ? `<section class="demo"><div class="wrap">
  <p class="eyebrow rv">Mostra</p>
  <h2 class="h2 rv" style="--d:.08s">Așa ar putea arăta ${esc(firma)}.</h2>
  <p class="lead rv" style="--d:.14s">Asta nu e site-ul tău. E o mostră, făcută într-o seară din ce se vede public despre ${esc(firma)}, ca să vezi direcția. Site-ul adevărat îl construim împreună: pozele tale, serviciile tale, prețurile tale.</p>
  <div class="cadru rv" style="--d:.2s">
    <span class="badge">Mostră · nu e site-ul final</span>
    <div class="bara"><i></i><i></i><i></i><span class="url">${esc(demoUrl.replace(/^https?:\/\//, ''))}</span></div>
    <div class="ecran"><iframe src="${esc(demoUrl)}" title="Mostră ${esc(firma)}" loading="lazy" scrolling="no" tabindex="-1"></iframe></div>
  </div>
  <div class="sub rv" style="--d:.1s">
    <p><b>Ce se schimbă la site-ul final:</b> fotografii reale, texte scrise cu tine, programare online, domeniul tău.</p>
    <a class="btn" href="${esc(demoUrl)}" target="_blank" rel="noopener"><span>Deschide pe tot ecranul</span><span class="ar">→</span></a>
  </div>
</div></section>` : ''}

<section class="pachete"><div class="wrap">
  <p class="eyebrow rv">Pachetul potrivit</p>
  <h2 class="h2 rv" style="--d:.08s">Cum am lucra împreună.</h2>
  <p class="lead rv" style="--d:.14s">Trei trepte, aceeași regulă la toate: tu aprobi, restul rulează singur. Prețurile sunt cele reale, fără „de la".</p>
  ${R.pornire ? `<div class="pornire rv" style="--d:.2s"><div><p class="eyebrow">Punctul de pornire pentru ${esc(firma)}</p><h3>${esc(R.pornire.titlu)}</h3><p>${esc(R.pornire.text)}</p></div><div class="pret">${R.pornire.pret === '0' ? `<b>Dăruit</b>` : `<b>${esc(R.pornire.pret)} <small style="font-size:22px">RON</small></b>`}<span>${esc(R.pornire.per)}</span></div></div>` : ''}
  <div class="tiers">
    ${PACHETE.map((p, i) => `<div class="tier${p.id === rec.id ? ' rec' : ''} rv" style="--d:${0.15 + i * 0.1}s">${p.id === rec.id ? `<span class="et">${esc(p.eticheta || 'Recomandat')}</span>` : ''}<h3>${esc(p.nume)}</h3><div class="p"><b>${esc(p.pret)}</b><span>RON / ${esc(p.per)}</span></div><div class="min">${esc(p.min)}</div><ul>${p.include.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><a class="btn${p.id === rec.id ? '' : ' ghost'}" href="#vorbim" data-pachet="${esc(p.nume)}"><span>Vreau ${esc(p.nume)}</span><span class="ar">→</span></a></div>`).join('\n    ')}
  </div>
  <div class="custom rv" style="--d:.1s"><div><h3>Vrei altceva?</h3><p>Spune-mi în două rânduri ce ai în minte, mai jos, la „altceva". Într-o zi lucrătoare primești un pachet construit pentru tine, cu prețul total, fără surprize.</p></div><a class="btn ghost" href="#vorbim" data-pachet="Custom"><span>Vreau ceva custom</span><span class="ar">→</span></a></div>
  <p class="nota">Prețurile sunt fără TVA. Abonamentele se pot opri la finalul perioadei minime, fără penalizări.</p>
</div></section>

<section class="cum"><div class="wrap">
  <p class="eyebrow rv">Cum ar decurge</p>
  <h2 class="h2 rv" style="--d:.08s">Trei pași. Fără ședințe.</h2>
  <div class="pasi">
    <div class="rv" style="--d:.1s"><h3>Vorbim 15 minute.</h3><p>Îmi spui ce vrei. Îți spun ce e realist. Dacă nu ne potrivim, îți spun și asta.</p></div>
    <div class="rv" style="--d:.2s"><h3>Pornim în 48 de ore.</h3><p>Semnăm online, plătești, și primești primul plan. Site-ul e live în câteva zile, cu pozele și textele tale.</p></div>
    <div class="rv" style="--d:.3s"><h3>Rulează singur.</h3><p>Postările, reclamele, raportul: le primești gata făcute, pe WhatsApp sau email. Tu aprobi. Boții execută.</p></div>
  </div>
</div></section>

<section id="vorbim" class="invitatie"><div class="wrap">
  <div class="invit">
    <div class="text">
      <p class="eyebrow rv">Invitația</p>
      <h2 class="h2 rv" style="--d:.08s">Îți propun o colaborare.</h2>
      <p class="rv" style="--d:.14s">Am făcut prima parte fără să-mi ceri. Partea a doua o facem împreună. Spune-mi când ești liber și pe ce canal preferi să continuăm. Te sun eu.</p>
    </div>
    <div class="rv" style="--d:.2s">
      <form id="cerere" data-slug="${esc(d.slug || '')}"${preview ? ' data-preview="1"' : ''}>
        <input type="hidden" name="pachet" value="${esc(rec.nume)}">
        <div class="f"><label for="nume">Numele tău</label><input id="nume" name="nume" required autocomplete="name" placeholder="Cum să-ți spun"></div>
        <div class="row">
          <div class="f"><label for="telefon">Telefon</label><input id="telefon" name="telefon" required inputmode="tel" autocomplete="tel" placeholder="07xx xxx xxx"></div>
          <div class="f"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" placeholder="nume@salon.ro"></div>
        </div>
        <div class="row">
          <div class="f"><label>Continuăm pe</label><div class="seg"><input type="radio" name="canal" id="c1" value="whatsapp" checked><label for="c1">WhatsApp</label><input type="radio" name="canal" id="c2" value="email"><label for="c2">Email</label></div></div>
          <div class="f"><label>Te pot suna</label><div class="seg"><input type="radio" name="interval" id="i1" value="dimineata" checked><label for="i1">Dimineața</label><input type="radio" name="interval" id="i2" value="dupa-amiaza"><label for="i2">După-amiaza</label><input type="radio" name="interval" id="i3" value="seara"><label for="i3">Seara</label></div></div>
        </div>
        <div class="f"><label for="altceva">Altceva? (opțional)</label><textarea id="altceva" name="altceva" rows="3" placeholder="Dacă vrei un pachet custom sau ai o întrebare, scrie aici."></textarea></div>
        <label class="acord"><input type="checkbox" name="acord" required><span>Sunt de acord să primesc mesaje de la AleSign&amp;Co pe canalul ales, despre această propunere. Mă pot răzgândi oricând, cu un singur mesaj.</span></label>
        <button class="btn" type="submit"><span>Vreau să vorbim</span><span class="ar">→</span></button>
        <p class="eroare" id="eroare">Nu a mers. Încearcă din nou sau scrie-mi direct la info@alesign.net.</p>
      </form>
      <div class="multumesc"><h3>Mulțumesc, <span id="m-nume"></span>.</h3><p>Te sun <span id="m-interval"></span>. Până atunci, mostra rămâne a ta, s-o răsfoiești și s-o arăți cui vrei.</p></div>
    </div>
  </div>

  ${poatePrelungi || preview ? `<div class="prel rv" id="prel"${poatePrelungi ? '' : ' style="--d:.1s"'}>
    <div><h3 id="prel-t">${zile === 0 ? 'Termenul expiră azi.' : `Termenul expiră ${zile === 1 ? 'mâine' : `în ${zile} zile`}.`}</h3><p id="prel-p">Dacă mai ai nevoie de timp să te gândești sau să arăți mostra cuiva, îl prelungesc cu 7 zile. Spune-mi doar:</p></div>
    <button class="btn ghost" id="prel-btn" type="button"><span>„${FRAZA_PRELUNGIRE}"</span></button>
  </div>` : ''}
</div></section>

<footer><div class="wrap">
  <div>AleSign&amp;Co · <a class="lnk" href="https://alesign.net" target="_blank" rel="noopener">alesign.net</a> · <a class="lnk" href="mailto:info@alesign.net">info@alesign.net</a></div>
  <div class="as">${MARCA}<span>Construit de AleSystem Design</span></div>
  <div>Pagină pregătită pentru ${esc(firma)}${expira ? `, valabilă până pe ${dataRo(expira)}` : ''}. Nu e indexată de Google.</div>
</div></footer>

<script>
(function(){
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });

  // mostra: iframe-ul e randat la lățime de desktop (sau telefon) și scalat în ramă
  function scal(){ document.querySelectorAll('.demo .ecran').forEach(function(e){ var f = e.querySelector('iframe'); if(!f) return; var w = innerWidth <= 880 ? 390 : 1280; f.style.setProperty('--s', (e.clientWidth / w).toString()); }); }
  scal(); addEventListener('resize', scal);

  // numere care cresc
  document.querySelectorAll('[data-n]').forEach(function(el){
    var end = parseFloat(el.getAttribute('data-n')), dec = (String(end).split('.')[1]||'').length, t0 = null;
    var o = new IntersectionObserver(function(es){ if(!es[0].isIntersecting) return; o.disconnect();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = end.toLocaleString('ro-RO'); return; }
      (function step(ts){ if(!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1100); var e = 1 - Math.pow(1 - p, 3); el.textContent = (end * e).toFixed(dec).replace('.', ','); if(p < 1) requestAnimationFrame(step); })(performance.now());
    }, { threshold: .6 }); o.observe(el);
  });

  // butoanele din pachete preselectează pachetul în formular
  document.querySelectorAll('[data-pachet]').forEach(function(a){ a.addEventListener('click', function(){ var h = document.querySelector('input[name=pachet]'); if(h) h.value = a.getAttribute('data-pachet'); if(a.getAttribute('data-pachet') === 'Custom') setTimeout(function(){ var t = document.getElementById('altceva'); if(t) t.focus(); }, 600); }); });

  var f = document.getElementById('cerere');
  f.addEventListener('submit', function(ev){
    ev.preventDefault();
    var fd = new FormData(f), b = {}; fd.forEach(function(v, k){ b[k] = v; }); b.slug = f.getAttribute('data-slug'); b.acord = !!b.acord;
    var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.firstElementChild.textContent = 'Se trimite…';
    var done = function(){ document.getElementById('m-nume').textContent = (b.nume || '').split(' ')[0]; document.getElementById('m-interval').textContent = { dimineata: 'dimineața', 'dupa-amiaza': 'după-amiaza', seara: 'seara' }[b.interval] || 'curând'; f.classList.add('trimis'); f.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    var fail = function(){ btn.disabled = false; btn.firstElementChild.textContent = 'Vreau să vorbim'; document.getElementById('eroare').style.display = 'block'; };
    if (f.getAttribute('data-preview')) { setTimeout(done, 700); return; }
    fetch('/api/cerere', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(function(r){ return r.ok ? done() : fail(); }).catch(fail);
  });

  var pb = document.getElementById('prel-btn');
  if (pb) pb.addEventListener('click', function(){
    pb.disabled = true;
    var ok = function(data){ var box = document.getElementById('prel'); box.classList.add('gata'); document.getElementById('prel-t').textContent = 'Gata. Ai încă 7 zile.'; document.getElementById('prel-p').textContent = 'Mostra e valabilă până pe ' + (data && data.pana_pe ? data.pana_pe : 'noua dată') + '. Fără grabă.'; pb.remove(); };
    if (f.getAttribute('data-preview')) { setTimeout(function(){ ok({ pana_pe: '${esc(dataRo(expira ? new Date(expira.getTime() + 7 * 86400000) : new Date(azi.getTime() + 14 * 86400000)))}' }); }, 600); return; }
    fetch('/api/prelungire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: f.getAttribute('data-slug'), mesaj: ${JSON.stringify(FRAZA_PRELUNGIRE)} }) }).then(function(r){ return r.json(); }).then(ok).catch(function(){ pb.disabled = false; });
  });
})();
</script>
</body>
</html>`;
}

const MARCA = `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="28" cy="28" r="20"/><circle cx="28" cy="28" r="5" fill="currentColor" stroke="none"/><circle cx="42.1" cy="13.9" r="6" fill="#ff2a2e" stroke="none"/></svg>`;

function cuvinte(s) { return s.split(' ').map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(' '); }

function cifre(d, scor) {
  const items = [];
  if (d.rating) items.push(`<div><b data-n="${esc(d.rating)}">0</b><span>stele pe Google</span></div>`);
  if (d.nr_recenzii) items.push(`<div><b data-n="${esc(d.nr_recenzii)}">0</b><span>recenzii</span></div>`);
  if (scor != null) items.push(`<div><b><span data-n="${scor}">0</span><small>/100</small></b><span>site, la testele Google</span></div>`);
  else if (d.ramura === 'fara_site') items.push(`<div><b>—</b><span>site: niciunul</span></div>`);
  return items.length ? `<div class="cifre rv" style="--d:.9s">${items.join('')}</div>` : '';
}

export function mostraExpirata({ firma = '' } = {}) {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Mostra a expirat</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#141414;font-family:Manrope,system-ui,sans-serif;text-align:center;padding:24px}h1{font-family:'Cormorant Garamond',serif;font-size:44px;margin:0 0 12px}p{color:#6b675f;max-width:44ch;margin:0 auto 22px}a{display:inline-block;padding:14px 24px;border-radius:999px;background:#0c0c0d;color:#f4f1ea;text-decoration:none;font-weight:600}</style></head>
<body><div><h1>Mostra${firma ? ` pentru ${esc(firma)}` : ''} a expirat.</h1><p>Termenul a trecut, dar propunerea nu. Scrie-mi și o reactivez într-o zi.</p><a href="mailto:info@alesign.net?subject=${encodeURIComponent('Mostra ' + firma)}">Scrie-mi</a></div></body></html>`;
}
