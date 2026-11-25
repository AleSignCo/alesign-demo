// lib/spatiu-brand.js (S2, 25 nov. 2026): „Logoul tău” și „Fișierele tale” în spațiul clientului (/s/<token>).
// Datele vin din RPC spatiu_brand (SQL 111), puse de api/spatiu.js în d.brand_logo. semneazaBrand semnează planșele
// din bucketul privat „brand” (cheia de serviciu, doar pe server). Acțiunile merg la /api/spatiu-logo, descărcările
// la /api/brand-fisiere (URL semnat 60 de secunde). Regulile (cine, când, câte seturi și runde) sunt în bază.
// Exportă: brandHtml(b, token), BRAND_CSS, BRAND_JS, semneazaBrand(b, urlSupabase, cheieServiciu).
// Când nu e nimic de arătat (b null sau fără piese), brandHtml întoarce '' și pagina arată ca înainte.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dataRo = (d) => (d ? new Date(String(d).length === 10 ? d + 'T12:00:00Z' : d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', timeZone: 'Europe/Bucharest' }) : '');
const NUMERE = ['', 'o propunere', 'două propuneri', 'trei propuneri', 'patru propuneri'];
const propuneri = (n) => NUMERE[n] || `${n} propuneri`;
const seturi = (n) => (n === 1 ? 'un set' : n === 2 ? 'două seturi' : `${n} seturi`);

// calea dintr-un rezultat al motorului (cu sau fără prefixul „brand/”), verificată ca în logo_cale (SQL 111)
const caleBrand = (p) => {
  const c = String(p || '').replace(/^\/?brand\//, '');
  return /^[0-9]+\/[0-9]+\/[A-Za-z0-9._/-]{1,240}$/.test(c) && !c.includes('..') ? c : null;
};

// Semnează planșele și SVG-urile arătate în „Logoul tău”, pentru 6 ore. Pune *_url lângă cale (plansa_url, orizontal_url,
// semn_url, stivuit_url). Fără cheie sau dacă Storage nu răspunde, propunerile apar fără imagine, cu textul lor.
export async function semneazaBrand(b, urlSupabase, cheieServiciu) {
  if (!b || !urlSupabase || !cheieServiciu || !Array.isArray(b.logo)) return;
  const tinte = [];
  b.logo.forEach((s) => {
    (s && Array.isArray(s.candidati) ? s.candidati : []).forEach((c) => {
      const f = (c && c.fisiere) || {};
      ['plansa_png', 'orizontal_svg', 'semn_svg', 'stivuit_svg'].forEach((k) => { if (f[k]) tinte.push([f, k]); });
    });
    if (s && s.corectat) ['orizontal_svg', 'stivuit_svg', 'semn_svg'].forEach((k) => { if (s.corectat[k]) tinte.push([s.corectat, k]); });
  });
  const cai = [...new Set(tinte.map(([o, k]) => caleBrand(o[k])).filter(Boolean))].slice(0, 80);
  if (!cai.length) return;
  try {
    const r = await fetch(`${urlSupabase}/storage/v1/object/sign/brand`, { method: 'POST', headers: { apikey: cheieServiciu, Authorization: `Bearer ${cheieServiciu}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 * 60 * 6, paths: cai }) });
    if (!r.ok) return;
    const lista = await r.json();
    const map = {};
    (Array.isArray(lista) ? lista : []).forEach((x) => { if (x && x.path && x.signedURL) map[x.path] = `${urlSupabase}/storage/v1${x.signedURL}`; });
    tinte.forEach(([o, k]) => { const c = caleBrand(o[k]); if (c && map[c]) o[k.replace(/_(png|svg)$/, '_url')] = map[c]; });
  } catch (e) { /* fără semnare: propunerile rămân cu textul lor */ }
}

const imagine = (url, alt) => (url
  ? `<div class="bl-img"><img src="${esc(url)}" alt="${esc(alt)}" loading="lazy"></div>`
  : '<div class="bl-img bl-fara"><span>Imaginea nu s-a încărcat. Reîncarcă pagina peste un minut.</span></div>');

const candidat = (s, c, i, firma, cuButon) => `<figure class="bl-c">
  ${imagine(c.fisiere && (c.fisiere.plansa_url || c.fisiere.orizontal_url), `Propunerea ${i + 1} de logo pentru ${firma}`)}
  <figcaption>
    <b>Propunerea ${i + 1}</b>
    ${c.motiv ? `<p>${esc(c.motiv)}</p>` : ''}
    ${c.fapt ? `<p class="bl-fapt">Pornește de la: „${esc(c.fapt)}”</p>` : ''}
    ${cuButon ? `<button class="btn mic" type="button" data-bl="aleg" data-s="${s.id}" data-logo-id="${Number(c.logo_id)}" data-nr="${i + 1}"${s.ales ? ' data-schimb="1"' : ''}>${cuButon}</button>` : ''}
  </figcaption>
</figure>`;

const cerere = (s) => `<details class="bl-d"><summary>Altă cerere</summary>
  <p class="meta">Dacă vrei ceva ce nu e în listă, scrie-mi aici. Cererea ajunge la mine și îți răspund în spațiul tău.</p>
  <textarea id="bl-cerere-${s.id}" rows="3" maxlength="1500" aria-label="Ce ai vrea altfel la logo"></textarea>
  <div class="act"><button class="btn ghost mic" type="button" data-bl="cerere" data-s="${s.id}">Trimit cererea</button></div>
</details>`;

const corecturi = (s, lista) => {
  const chei = Object.keys(lista || {});
  if (!chei.length) return '';
  if (!(Number(s.runde_ramase) > 0)) return '<p class="meta">Ai folosit rundele de corecturi din pachet. Dacă mai vrei ceva, scrie-mi la „Altă cerere”.</p>';
  const cerute = Object.entries(s.corecturi || {}).map(([k, v]) => { const x = lista[k]; if (!x) return null; const n = Number(v);
    const val = x.valori && (x.valori[String(v)] || (n < 0 ? x.valori['-1'] : n > 0 ? x.valori['1'] : null)); return val ? `${x.eticheta}: ${val}` : null; }).filter(Boolean);
  return `<div class="bl-cor">
  <p class="meta">Poți cere corecturi din listă ${Number(s.runde_ramase) === 1 ? 'încă o dată' : `de încă ${Number(s.runde_ramase) === 2 ? 'două' : Number(s.runde_ramase)} ori`}. Refac logoul și ți-l arăt aici.${cerute.length ? ` Până acum ai cerut: ${esc(cerute.join('; '))}.` : ''}</p>
  ${chei.map((k) => `<fieldset><legend>${esc(lista[k].eticheta)}</legend>
    <label><input type="radio" name="bl-k-${s.id}-${esc(k)}" value="" checked> cum e acum</label>
    ${Object.entries(lista[k].valori || {}).map(([v, t]) => `<label><input type="radio" name="bl-k-${s.id}-${esc(k)}" value="${esc(v)}"> ${esc(t)}</label>`).join('')}
  </fieldset>`).join('')}
  <div class="act"><button class="btn mic" type="button" data-bl="corectura" data-s="${s.id}">Trimit corecturile</button></div>
</div>`;
};

const aprobare = (s) => `<div class="aprob">
  <p class="meta">Când logoul arată cum vrei, îl aprobi. Îți trimit un cod pe email și logoul se aprobă doar cu el. După aprobare fac fișierele.</p>
  <div class="act"><button class="btn ok" type="button" data-bl="cod" data-s="${s.id}">${s.cod_activ ? 'Vreau alt cod' : 'Aprob logoul'}</button></div>
  <div class="bl-cod${s.cod_activ ? ' on' : ''}" id="bl-cod-${s.id}">
    <p class="meta" id="bl-catre-${s.id}">${s.cod_activ ? 'Ți-am trimis codul pe email.' : ''}</p>
    <input id="bl-cod-in-${s.id}" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="Codul de 6 cifre" aria-label="Codul primit pe email">
    <div class="act"><button class="btn ok mic" type="button" data-bl="aprob" data-s="${s.id}">Confirm aprobarea</button></div>
  </div>
</div>`;

function logoCard(s, b) {
  const firma = b.firma || 'firma ta';
  const cand = Array.isArray(s.candidati) ? s.candidati : [];
  const ales = s.ales && cand.find((c) => String(c.logo_id) === String(s.ales.logo_id));
  const faza = s.faza || '';
  const termen = s.termen && s.stare !== 'livrat' ? `<p class="meta">Termen: ${esc(dataRo(s.termen))}</p>` : '';
  const gata = `<p class="gata" id="gata-logo-${s.id}" role="status"></p>`;
  const dinLogoulTau = s.mod === 'kit_din_logoul_tau';
  let h3 = 'Logoul tău', corp = '';

  if (s.stare === 'livrat' || faza === 'gata') {
    h3 = 'Logoul e gata';
    corp = `${ales ? imagine(ales.fisiere && (ales.fisiere.plansa_url || ales.fisiere.orizontal_url), `Logoul ales pentru ${firma}`) : ''}
      <p class="txt">${dinLogoulTau ? 'Am făcut fișierele din logoul tău. La logo n-am schimbat nimic.' : `Logoul pentru ${esc(firma)} e gata. E făcut doar pentru firma ta și nu-l mai primește nimeni.`} Fișierele sunt mai jos, la <a class="lnk" href="#fisiere">„Fișierele tale”</a>.</p>`;
  } else if (s.stare === 'la_client' && faza === 'alegere' && cand.length) {
    h3 = `Ai ${propuneri(cand.length)} de logo`;
    const r = Number(s.seturi_ramase) || 0;
    corp = `<p class="txt">Fiecare pornește de la ceva adevărat despre firma ta, iar sub fiecare scrie de la ce. Alegi una, apoi o poți corecta din listă înainte s-o aprobi.</p>
      <div class="bl-g">${cand.map((c, i) => candidat(s, c, i, firma, 'Aleg logoul acesta')).join('')}</div>
      <details class="bl-d"><summary>Niciuna nu mi se potrivește</summary>
        <p class="meta">Scrie-mi ce nu ți-a plăcut, în cel puțin cinci cuvinte. ${r > 0 ? `Fac alt set pornind de la ce îmi scrii. Mai ai ${seturi(r)} în pachet.` : 'Ai văzut toate seturile din pachet, așa că mă uit eu și te sun.'}</p>
        <textarea id="bl-motiv-${s.id}" rows="3" maxlength="1500" aria-label="Ce nu ți-a plăcut la propuneri"></textarea>
        <div class="act"><button class="btn ghost mic" type="button" data-bl="niciunul" data-s="${s.id}">Trimit</button></div>
      </details>
      ${cerere(s)}`;
  } else if (s.stare === 'la_client' && (faza === 'ales' || faza === 'corectura_gata')) {
    h3 = faza === 'corectura_gata' ? 'Logoul, cu corecturile tale' : 'Logoul ales';
    const corectat = faza === 'corectura_gata' && s.corectat && s.corectat.orizontal_url;
    const altele = cand.filter((c) => c !== ales);
    corp = `${corectat ? imagine(s.corectat.orizontal_url, `Logoul pentru ${firma}, cu corecturile tale`) : ales ? imagine(ales.fisiere && (ales.fisiere.plansa_url || ales.fisiere.orizontal_url), `Logoul ales pentru ${firma}`) : ''}
      <p class="txt">${faza === 'corectura_gata' ? 'Am refăcut logoul cu corecturile tale.' : 'Ai ales logoul acesta.'}${ales && ales.motiv ? ` ${esc(ales.motiv)}` : ''}</p>
      ${corecturi(s, b.corecturi)}
      ${aprobare(s)}
      ${altele.length ? `<details class="bl-d"><summary>Aleg altă propunere din set</summary><div class="bl-g">${altele.map((c) => candidat(s, c, cand.indexOf(c), firma, 'Aleg-o pe aceasta')).join('')}</div></details>` : ''}
      ${cerere(s)}`;
  } else if (faza === 'cerere' || faza === 'fara_seturi') {
    h3 = 'Am primit ce mi-ai scris';
    corp = `<p class="txt">${faza === 'fara_seturi' ? 'Ai văzut toate seturile din pachet, așa că mă uit eu și te sun.' : 'Mă uit eu la cererea ta și îți răspund aici, în spațiul tău.'}</p>`;
  } else if (faza === 'corectura') {
    h3 = 'Refac logoul';
    corp = '<p class="txt">Refac logoul cu corecturile tale și ți-l arăt aici când e gata.</p>';
  } else if (faza === 'kit' || faza === 'alex_kit') {
    h3 = dinLogoulTau ? 'Fac fișierele din logoul tău' : 'Ai aprobat logoul';
    corp = `${ales ? imagine(ales.fisiere && (ales.fisiere.plansa_url || ales.fisiere.orizontal_url), `Logoul ales pentru ${firma}`) : ''}
      <p class="txt">${dinLogoulTau ? 'Pregătesc fișierele din logoul pe care mi l-ai dat, fără să schimb nimic la el.' : 'Pregătesc fișierele.'} Îți scriu pe email când sunt gata.</p>${termen}`;
  } else {
    h3 = 'Propunerile de logo';
    corp = `<p class="txt">${Number(s.set) > 1 ? 'Fac alt set de propuneri, pornind de la ce mi-ai scris.' : `Lucrez la propunerile de logo pentru ${esc(firma)}.`} Când sunt gata, ți le arăt aici și îți scriu pe email.</p>${termen}`;
  }
  return `<div class="card bl" id="logo-${s.id}"><h3>${h3}</h3>${corp}${gata}</div>`;
}

const ETICHETE = {
  zip: 'Toate fișierele, într-o arhivă ZIP', svg: 'Logoul, în SVG', semn: 'Semnul, în SVG', favicon: 'Faviconul pentru site',
  avatar: 'Avatarul pentru rețele', ghid: 'Ghidul logoului (PDF)', osim: 'Dosarul pentru OSIM (PDF)', osim_jpg: 'Marca pentru OSIM (JPG)',
};

function fisiereCard(f, token) {
  const chei = Array.isArray(f.chei) ? f.chei : [];
  if (!chei.length) return '';
  const kit = f.tip === 'aplicatii_brand';
  const link = (k) => `<li><a class="lnk" href="/api/brand-fisiere?t=${encodeURIComponent(token)}&amp;s=${Number(f.sarcina_id)}&amp;f=${encodeURIComponent(k)}" rel="nofollow">${esc(kit && k === 'ghid' ? 'Ghidul brandului (PDF)' : kit && k === 'zip' ? 'Aplicațiile brandului, într-o arhivă ZIP' : ETICHETE[k] || k)}</a></li>`;
  return `<div class="card">
  <h3>${kit ? 'Aplicațiile brandului' : 'Logoul'}</h3>
  ${f.livrat_la ? `<p class="meta">Gata pe ${esc(dataRo(f.livrat_la))}</p>` : ''}
  <ul class="bl-f">${chei.map(link).join('')}</ul>
  ${!kit ? '<p class="meta">Pentru tipar dai PDF-ul sau SVG-ul din arhivă; pentru site și rețele, PNG-urile.</p>' : ''}
  ${chei.includes('osim') ? '<p class="nota">Dosarul pentru OSIM are marca pregătită, clasele și pașii. Marca o depui tu, în numele firmei, iar taxele le plătești direct la OSIM.</p>' : ''}
</div>`;
}

export function brandHtml(b, token) {
  if (!b || typeof b !== 'object') return '';
  const logo = (Array.isArray(b.logo) ? b.logo : []).filter((s) => s && s.id);
  const fisiere = (Array.isArray(b.fisiere) ? b.fisiere : []).filter((f) => f && f.sarcina_id && Array.isArray(f.chei) && f.chei.length);
  if (!logo.length && !fisiere.length) return '';
  const deTine = logo.some((s) => s.stare === 'la_client');
  const toateGata = logo.length && logo.every((s) => s.stare === 'livrat');
  const sLogo = logo.length ? `<section id="logo" data-t="${esc(token)}"><div class="wrap">
  <p class="eyebrow">Logoul tău</p>
  <h2 class="h2">${deTine ? 'Logoul te așteaptă pe tine.' : toateGata ? 'Logoul tău e gata.' : 'Lucrez la logoul tău.'}</h2>
  <p class="lead">${deTine ? 'Aici alegi logoul, îl corectezi din listă și îl aprobi. Fișierele le fac doar după ce aprobi logoul cu codul primit pe email.' : toateGata ? 'Fișierele sunt mai jos și le poți descărca oricând.' : 'Îți scriu pe email când am ceva de arătat aici.'}</p>
  ${logo.map((s) => logoCard(s, b)).join('')}
</div></section>` : '';
  const sFis = fisiere.length ? `<section id="fisiere"><div class="wrap">
  <p class="eyebrow">Fișierele tale</p>
  <h2 class="h2">Gata de folosit.</h2>
  <p class="lead">Le descarci de aici oricând. Dacă dai logoul cuiva (tipografiei sau celui care îți face reclamele), îi trimiți arhiva ZIP.</p>
  ${fisiere.map((f) => fisiereCard(f, token)).join('')}
</div></section>` : '';
  return sLogo + '\n' + sFis;
}

export const BRAND_CSS = `
  .bl-g { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-top:14px; }
  .bl-c { margin:0; border:1px solid var(--line); border-radius:14px; background:#fff; overflow:hidden; display:flex; flex-direction:column; }
  .bl-c figcaption { padding:12px 14px 14px; display:flex; flex-direction:column; gap:6px; flex:1; }
  .bl-c figcaption b { font-size:15px; } .bl-c figcaption p { font-size:14.5px; margin:0; }
  .bl-c figcaption .btn { margin-top:auto; align-self:flex-start; }
  .bl-c figcaption .bl-fapt { color:var(--muted); font-size:13px; }
  .bl-img { background:#fff; border:1px solid var(--line); border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center; min-height:140px; margin:10px 0; }
  .bl-c .bl-img { border:0; border-bottom:1px solid var(--line); border-radius:0; margin:0; }
  .card .bl-img img { width:100%; height:auto; max-height:560px; object-fit:contain; border-radius:0; margin:0; display:block; }
  .bl-fara span { font-size:12.5px; color:var(--soft); padding:14px; text-align:center; }
  .bl-cor { display:grid; gap:10px; margin-top:14px; }
  .bl-cor fieldset { border:1px solid var(--line); border-radius:12px; padding:8px 12px 10px; background:#fff; }
  .bl-cor legend { font-size:13px; font-weight:700; padding:0 4px; }
  .bl-cor label { display:inline-flex; align-items:center; gap:6px; margin:4px 16px 4px 0; font-size:14px; cursor:pointer; min-height:32px; }
  .bl-cor input[type=radio] { width:auto; padding:0; margin:0; accent-color:var(--ink); }
  .bl-cod { display:none; margin-top:10px; } .bl-cod.on { display:block; } .bl-cod input { max-width:220px; letter-spacing:.2em; }
  details.bl-d { margin-top:14px; } details.bl-d summary { cursor:pointer; font-weight:600; font-size:14.5px; } details.bl-d textarea { margin-top:8px; }
  .bl-f { list-style:none; display:grid; gap:10px; margin:12px 0 10px; font-size:15px; }
  @media (max-width:520px) { .bl-g { grid-template-columns:1fr; } }
`;

// Rulează în browser, de sine stătător (nu folosește nimic din fișierul acesta). Tokenul îl ia din data-t al secțiunii.
function brandClient() {
  var sec = document.getElementById('logo');
  if (!sec) return;
  var T = sec.getAttribute('data-t');
  var EROARE = 'Nu s-a trimis. Mai încearcă o dată; dacă nu merge nici acum, scrie-mi la Mesaje și rezolv eu.';
  function trimite(body) {
    body.token = T;
    return fetch('/api/spatiu-logo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.ok, j: j || {} }; }); })
      .catch(function () { return { ok: false, j: {} }; });
  }
  function spune(id, text, ok) { var g = document.getElementById('gata-logo-' + id); if (!g) return; g.textContent = text; g.style.color = ok ? '' : '#b3261e'; g.classList.add('on'); }
  function opreste(card, da) { if (card) card.querySelectorAll('button, input, textarea').forEach(function (x) { x.disabled = da; }); }
  function cuvinte(t) { return String(t || '').trim().split(/\s+/).filter(Boolean).length; }
  function reincarca() { setTimeout(function () { location.hash = 'logo'; location.reload(); }, 1200); }
  sec.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-bl]');
    if (!b) return;
    var ce = b.getAttribute('data-bl'), id = Number(b.getAttribute('data-s')), card = document.getElementById('logo-' + id);
    var nuMerge = function (r) { opreste(card, false); spune(id, (r.j && r.j.motiv) || EROARE, false); };
    if (ce === 'aleg') {
      var schimb = b.getAttribute('data-schimb') === '1';
      if (!confirm(schimb ? 'Alegi propunerea ' + b.getAttribute('data-nr') + ' în locul celei de acum? Corecturile cerute până acum nu se păstrează, iar rundele folosite rămân folosite.'
        : 'Alegi propunerea ' + b.getAttribute('data-nr') + '? După ce o alegi, o poți corecta din listă, apoi o aprobi cu codul primit pe email.')) return;
      opreste(card, true);
      trimite({ sarcina_id: id, actiune: 'aleg', logo_id: Number(b.getAttribute('data-logo-id')) }).then(function (r) {
        if (r.ok) { spune(id, 'Ai ales logoul. Reîncarc pagina ca să-l vezi.', true); reincarca(); } else nuMerge(r); });
    } else if (ce === 'niciunul') {
      var ta = document.getElementById('bl-motiv-' + id), motiv = ta ? ta.value.trim() : '';
      if (cuvinte(motiv) < 5) { spune(id, 'Scrie-mi în cel puțin cinci cuvinte ce nu ți-a plăcut, ca setul următor să fie altfel.', false); if (ta) ta.focus(); return; }
      opreste(card, true);
      trimite({ sarcina_id: id, actiune: 'niciunul', motiv: motiv }).then(function (r) {
        if (r.ok) spune(id, r.j.ce === 'la_alex' ? 'Am notat. Ai văzut toate seturile din pachet, așa că mă uit eu și te sun.' : 'Am notat. Fac alt set și ți-l arăt aici când e gata.', true); else nuMerge(r); });
    } else if (ce === 'corectura') {
      var cor = {};
      card.querySelectorAll('input[type=radio]:checked').forEach(function (x) { var k = x.name.replace('bl-k-' + id + '-', ''); if (x.value !== '') cor[k] = x.value; });
      if (!Object.keys(cor).length) { spune(id, 'Alege din listă ce vrei schimbat, apoi trimite.', false); return; }
      opreste(card, true);
      trimite({ sarcina_id: id, actiune: 'corectura', corecturi: cor }).then(function (r) {
        if (r.ok) spune(id, 'Am primit. Refac logoul și ți-l arăt aici când e gata.', true); else nuMerge(r); });
    } else if (ce === 'cerere') {
      var tc = document.getElementById('bl-cerere-' + id), text = tc ? tc.value.trim() : '';
      if (cuvinte(text) < 5) { spune(id, 'Scrie-mi în câteva cuvinte ce ai vrea altfel la logo.', false); if (tc) tc.focus(); return; }
      opreste(card, true);
      trimite({ sarcina_id: id, actiune: 'cerere', text: text }).then(function (r) {
        if (r.ok) spune(id, 'Am primit. Mă uit eu la cererea ta și îți răspund aici.', true); else nuMerge(r); });
    } else if (ce === 'cod') {
      b.disabled = true;
      trimite({ sarcina_id: id, actiune: 'cod' }).then(function (r) {
        b.disabled = false;
        var m = document.getElementById('bl-cod-' + id); if (m) m.classList.add('on');
        var p = document.getElementById('bl-catre-' + id);
        if (p) p.textContent = r.ok ? 'Ți-am trimis un cod de 6 cifre pe ' + (r.j.catre || 'emailul din contract') + '. E valabil 15 minute.' : (r.j.motiv || 'Nu am putut trimite codul. Mai încearcă o dată peste un minut.');
        if (r.ok) { b.textContent = 'Vreau alt cod'; var i = document.getElementById('bl-cod-in-' + id); if (i) i.focus(); }
      });
    } else if (ce === 'aprob') {
      var inp = document.getElementById('bl-cod-in-' + id), cod = inp ? inp.value.replace(/[^0-9]/g, '') : '';
      if (cod.length !== 6) { if (inp) inp.focus(); return; }
      opreste(card, true);
      trimite({ sarcina_id: id, actiune: 'aprob', cod: cod }).then(function (r) {
        if (!r.ok) { nuMerge(r); return; }
        if (r.j.ce === 'gata') { spune(id, 'Ai aprobat logoul. Fișierele sunt gata; reîncarc pagina.', true); reincarca(); }
        else spune(id, 'Ai aprobat logoul. Pregătesc fișierele și îți scriu pe email când sunt gata.', true);
      });
    }
  });
}

export const BRAND_JS = `(${brandClient.toString()})();`;
