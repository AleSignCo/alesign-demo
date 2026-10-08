// Configurator de pachete (Catalog v2): secțiunea „Pachetul potrivit” din Mostra, cu selecție multiplă și calcul live.
// Citește catalogul din RPC catalog_public(slug) (pachete, module, reguli, setări, blocare preț). Zero prețuri hardcodate.
// Regulile 1–20 din „Catalog AleSign v2” rulează în browser (UX) și sunt re-validate pe server (valideaza_linii).

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ron = (n) => Number(n || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }) : '');

export const CSS_CONFIGURATOR = `
  .cfg-top { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap; margin-top:34px; }
  .cfg-top .lead { margin:0; }
  .toggle { display:inline-flex; background:#fff; border:1px solid var(--line); border-radius:999px; padding:4px; gap:4px; }
  .toggle button { font:inherit; font-size:13.5px; font-weight:600; padding:9px 16px; border-radius:999px; border:0; background:transparent; color:var(--muted); cursor:pointer; transition:all .2s ease; }
  .toggle button.on { background:var(--ink); color:var(--ink-text); }
  .toggle button small { font-weight:500; opacity:.8; margin-left:4px; }
  .blocat { font-size:13px; color:var(--muted); margin-top:10px; }
  .blocat.exp { color:var(--accent); }
  .tiers4 { display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin-top:26px; align-items:stretch; }
  .tier.sel { border-color:var(--text); box-shadow:0 0 0 2px var(--text) inset; }
  .tier.wait { opacity:.78; }
  .tier .start { font-size:12.5px; color:var(--accent); font-weight:600; margin:-8px 0 14px; }
  .tier .wl { font-size:12.5px; color:var(--muted); margin:-8px 0 14px; }
  .tier .p .an { display:none; }
  .anual .tier .p .lu { display:none; } .anual .tier .p .an { display:inline; }
  .tier .btn.on { background:var(--accent); } .tier .btn.on::after { background:var(--ink); }
  .tier .btn.on .ar { transform:rotate(90deg); }
  .cfg-grid { display:grid; grid-template-columns:1.25fr .75fr; gap:22px; margin-top:22px; align-items:start; }
  .cfg-left { display:grid; gap:18px; }
  .panel { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:26px 26px 22px; }
  .panel h3 { font-size:26px; margin-bottom:4px; }
  .panel > p { color:var(--muted); font-size:14.5px; max-width:60ch; margin-bottom:16px; }
  .mods { display:grid; grid-template-columns:1fr; gap:2px; }
  .mod { display:flex; align-items:center; gap:12px; padding:10px 10px; border-radius:12px; transition:background .2s ease; min-height:52px; }
  .mod:hover { background:#fff; }
  .mod input[type=checkbox] { width:18px; height:18px; accent-color:var(--text); flex:none; cursor:pointer; }
  .mod .t { flex:1; min-width:0; }
  .mod .t b { font-size:14.5px; font-weight:600; display:block; line-height:1.25; }
  .mod .t span { font-size:12.5px; color:var(--muted); display:block; max-width:52ch; }
  .mod .pr { font-size:13.5px; font-weight:600; white-space:nowrap; text-align:right; min-width:150px; }
  .mod .pr small { font-weight:500; color:var(--muted); }
  .mod .pr.inc { color:var(--muted); font-weight:500; }
  .mod .q { display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:999px; background:#fff; margin-left:4px; }
  .mod .q button { font:inherit; width:26px; height:26px; border:0; background:transparent; cursor:pointer; color:var(--text); border-radius:999px; }
  .mod .q button:disabled { opacity:.35; cursor:default; }
  .mod .q i { font-style:normal; font-size:13px; font-weight:700; min-width:18px; text-align:center; }
  .mod.off { opacity:.55; }
  .mod .wl { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); font-weight:700; }
  .combos { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; }
  .combo { border:1px solid var(--line); background:#fff; border-radius:16px; padding:18px 18px 16px; cursor:pointer; transition:border-color .2s ease, transform .3s ease; position:relative; }
  .combo:hover { transform:translateY(-2px); }
  .combo.sel { border-color:var(--text); box-shadow:0 0 0 2px var(--text) inset; }
  .combo h4 { font-family:'Cormorant Garamond', serif; font-size:24px; font-weight:600; line-height:1.1; margin-bottom:4px; }
  .combo .sub { font-size:12.5px; color:var(--muted); min-height:34px; }
  .combo .pr { margin-top:10px; font-size:15px; font-weight:700; }
  .combo .pr s { color:var(--soft); font-weight:500; margin-left:6px; font-size:13px; }
  .rezumat { background:var(--ink); color:var(--ink-text); border-radius:22px; padding:28px 28px 24px; position:sticky; top:84px; }
  .rezumat .eyebrow { color:#b9b4aa; }
  .rezumat h3 { font-size:28px; margin:8px 0 14px; }
  .rezumat ul { list-style:none; display:grid; gap:9px; margin-bottom:18px; }
  .rezumat li { display:flex; justify-content:space-between; gap:14px; font-size:14px; color:#dcd7cc; border-bottom:1px dashed #2c2c2f; padding-bottom:8px; }
  .rezumat li b { font-weight:600; color:var(--ink-text); }
  .rezumat li small { display:block; color:#9b968c; font-size:12px; }
  .rezumat li.cond { color:#b9b4aa; font-size:13px; }
  .rezumat li.cred b { color:#7ee2a8; }
  .rezumat .tot { display:grid; gap:6px; padding-top:6px; }
  .rezumat .tot div { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
  .rezumat .tot b { font-family:'Cormorant Garamond', serif; font-size:38px; font-weight:600; line-height:1; }
  .rezumat .tot b small { font-size:16px; color:#b9b4aa; font-weight:500; }
  .rezumat .tot span { font-size:12.5px; color:#b9b4aa; letter-spacing:.06em; text-transform:uppercase; }
  .rezumat .tot .an { color:#7ee2a8; font-size:13px; }
  .rezumat .msg { display:grid; gap:8px; margin:16px 0 0; }
  .rezumat .msg p { font-size:13px; color:#cbc6bb; padding-left:14px; position:relative; animation:fadein .5s ease; }
  .rezumat .msg p::before { content:''; position:absolute; left:0; top:8px; width:6px; height:6px; border-radius:50%; background:var(--accent); }
  .rezumat .msg p.rec { color:#7ee2a8; cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
  .rezumat .fr { margin-top:16px; padding-top:14px; border-top:1px solid #2c2c2f; font-size:12.5px; color:#9b968c; }
  .rezumat .fr b { color:#dcd7cc; font-weight:600; }
  .rezumat .btn { width:100%; justify-content:center; margin-top:18px; background:var(--accent); }
  .rezumat .btn::after { background:#fff; } .rezumat .btn:hover { color:var(--ink); }
  .rezumat .btn[disabled] { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }
  .rezumat .gol { color:#9b968c; font-size:14px; margin-bottom:12px; }
  @keyframes fadein { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
  @media (max-width: 1080px) { .tiers4 { grid-template-columns:repeat(2, 1fr); } }
  @media (max-width: 880px) { .tiers4, .cfg-grid, .combos { grid-template-columns:1fr; } .rezumat { position:static; } .mod { flex-wrap:wrap; } .mod .pr { min-width:0; } }
`;

// HTML-ul secțiunii. `cat` = rezultatul catalog_public; `d` = datele Mostrei (ramura, firma, recomandat)
export function randeazaConfigurator(cat, d) {
  const P = cat.pachete || [];
  const lunare = P.filter((p) => p.in_mostra && p.categorie === 'lunar');
  const combos = P.filter((p) => p.in_mostra && p.categorie === 'combo');
  const unice = P.filter((p) => p.in_mostra && p.categorie === 'unic');
  const M = cat.module || [];
  const S = cat.setari || {};
  const red = Number(S.anual_reducere_procent || 15);
  const rec = d.recomandat || 'crestere';
  const bl = cat.blocat || {};
  const blocatTxt = bl.valabil ? `Prețurile de pe această pagină rămân valabile până pe <b>${esc(dataRo(bl.pana))}</b>.`
    : bl.expirat ? (cat.reguli?.pret_blocat || 'Prețurile de aici au fost valabile până la {data}. Le vezi pe cele de acum.').replace('{data}', dataRo(bl.pana))
    : `Prețurile de pe această pagină rămân valabile <b>${esc(String(S.pret_blocat_zile || 7))} zile</b> de la prima deschidere.`;

  const tier = (p, i) => {
    const wait = !p.disponibil;
    const an = Math.round(Number(p.pret) * 12 * (100 - red) / 100);
    return `<div class="tier${p.cod === rec ? ' rec' : ''}${wait ? ' wait' : ''} rv" data-tier="${esc(p.cod)}" style="--d:${0.15 + i * 0.08}s">
      ${p.cod === rec && !wait ? `<span class="et">${esc(p.eticheta || 'Recomandat')}</span>` : ''}
      <h3>${esc(p.nume)}</h3>
      <div class="min" style="margin:0 0 10px">${esc(p.subtitlu || '')}</div>
      <div class="p"><b>${ron(p.pret)}</b><span class="lu">RON / lună</span><span class="an">RON / lună · ${ron(an)} pe an</span></div>
      <div class="min">minim ${p.perioada_minima_luni} luni, apoi lunar</div>
      ${wait ? `<div class="wl">Listă de așteptare: se deschide pe măsură ce cresc. Te anunț eu.</div>` : p.start_din ? `<div class="start">Start din ${esc(dataRo(p.start_din))}</div>` : ''}
      <ul>${(p.include || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${wait ? `<button class="btn ghost" type="button" data-wait="${esc(p.cod)}"><span>Anunță-mă când se deschide</span></button>`
             : `<button class="btn${p.cod === rec ? '' : ' ghost'}" type="button" data-alege="${esc(p.cod)}"><span>Aleg ${esc(p.nume)}</span><span class="ar">→</span></button>`}
    </div>`;
  };

  const modul = (m) => {
    const wl = m.lista_asteptare;
    const per = m.unitate === 'luna' ? '/ lună' : m.unitate === 'buc' ? '/ buc' : m.unitate === 'ora' ? '/ oră' : 'o dată';
    return `<label class="mod${wl ? ' off' : ''}" data-mod="${esc(m.cod)}">
      <input type="checkbox" data-mcheck="${esc(m.cod)}">
      <span class="t"><b>${esc(m.nume)}</b><span>${esc(m.descriere || '')}${m.nota ? ` · ${esc(m.nota)}` : ''}</span>${wl ? `<span class="wl">Listă de așteptare${m.disponibil_din ? ` · ${esc(m.disponibil_din)}` : ''}</span>` : ''}</span>
      <span class="pr" data-mpret="${esc(m.cod)}">${ron(m.pret)} <small>RON ${esc(per)}</small></span>
      ${m.cantitate_max > 1 ? `<span class="q"><button type="button" data-q="-" data-qm="${esc(m.cod)}">−</button><i data-qv="${esc(m.cod)}">1</i><button type="button" data-q="+" data-qm="${esc(m.cod)}">+</button></span>` : ''}
    </label>`;
  };

  const unic = (p) => `<label class="mod" data-unic="${esc(p.cod)}">
      <input type="checkbox" data-ucheck="${esc(p.cod)}">
      <span class="t"><b>${esc(p.nume)}</b><span>${esc(p.subtitlu || '')}</span></span>
      <span class="pr" data-upret="${esc(p.cod)}">${ron(p.pret)} <small>RON${p.unitate === 'zi' ? ' / zi' : p.unitate === 'ora' ? ' / oră' : ''}</small></span>
    </label>`;

  const combo = (c) => `<div class="combo" data-combo="${esc(c.cod)}" role="button" tabindex="0">
      <h4>${esc(c.nume)}</h4><div class="sub">${esc(c.subtitlu || '')}</div>
      <div class="pr">${ron(c.pret)} RON${c.conditii?.separat ? `<s>${ron(c.conditii.separat)}</s>` : ''}</div>
    </div>`;

  return `<section class="pachete" id="pachete"><div class="wrap">
  <p class="eyebrow rv">Pachetul potrivit</p>
  <h2 class="h2 rv" style="--d:.08s">Cum am lucra împreună.</h2>
  <div class="cfg-top rv" style="--d:.14s">
    <p class="lead">Alege un pachet lunar sau construiește-ți unul din module. Orice bifezi, pagina calculează pe loc și îți explică ce se întâmplă. Nimic nu apare în numele tău fără acordul tău.</p>
    <div><div class="toggle" id="toggle-plata"><button type="button" class="on" data-plata="lunar">Lunar</button><button type="button" data-plata="anual">Anual <small>−${red}%</small></button></div></div>
  </div>
  <p class="blocat${bl.expirat ? ' exp' : ''} rv" style="--d:.18s">${blocatTxt}</p>
  <div class="tiers4" id="tiers">${lunare.map(tier).join('')}</div>
  <div class="cfg-grid">
    <div class="cfg-left">
      <div class="panel rv" style="--d:.1s" id="panel-module">
        <h3>Custom: alegi exact ce îți trebuie.</h3>
        <p id="module-lead">Bifează modulele. Peste un pachet lunar, modulele devin extra; fără pachet, construiești un Custom de la ${ron(S.custom_minim_lunar || 590)} RON / lună, minim ${esc(String(S.custom_min_luni || 3))} luni. Raportul lunar e inclus oricum.</p>
        <div class="mods">${M.map(modul).join('')}</div>
      </div>
      ${unice.length ? `<div class="panel rv" style="--d:.14s" id="panel-unice">
        <h3>O singură dată.</h3>
        <p>Servicii plătite o dată. Fiecare e o ușă spre un abonament: ori se scade din el, ori îl cere.</p>
        <div class="mods">${unice.map(unic).join('')}</div>
      </div>` : ''}
      ${combos.length ? `<div class="panel rv" style="--d:.18s" id="panel-combo">
        <h3>Combo-uri.</h3>
        <p>Singurele oferte cu preț sub suma componentelor. Un combo conține deja un pachet lunar, deci nu se combină cu altul.</p>
        <div class="combos">${combos.map(combo).join('')}</div>
      </div>` : ''}
    </div>
    <aside class="rezumat rv" style="--d:.2s" id="rezumat" aria-live="polite">
      <p class="eyebrow">Ce ai ales</p>
      <h3 id="rz-titlu">Nimic, deocamdată.</h3>
      <p class="gol" id="rz-gol">Alege un pachet sau bifează module și vezi aici totalul, pe loc.</p>
      <ul id="rz-linii"></ul>
      <div class="tot" id="rz-tot"></div>
      <div class="msg" id="rz-msg"></div>
      <div class="fr" id="rz-fr"></div>
      <a class="btn" href="#vorbim" id="rz-btn"><span>Vreau să vorbim despre asta</span><span class="ar">→</span></a>
    </aside>
  </div>
  <p class="nota">Prețurile sunt fără TVA. Abonamentele se pot opri la finalul perioadei minime, fără penalizări. Bugetul de reclame e separat de abonament și se plătește direct platformelor.</p>
</div></section>`;
}

// JS-ul paginii: motorul de reguli. Se inserează în <script> cu catalogul ca JSON.
export function scriptConfigurator(cat, d) {
  const date = { cat: { pachete: cat.pachete || [], module: cat.module || [], reguli: cat.reguli || {}, setari: cat.setari || {}, blocat: cat.blocat || {} }, rec: d.recomandat || 'crestere', slug: d.slug || '', cu_site: !!d.cu_site };
  return `window.__CFG = ${JSON.stringify(date).replace(/</g, '\\u003c')};
(function(){
  var C = window.__CFG, cat = C.cat, P = {}, M = {}, R = cat.reguli || {}, S = cat.setari || {};
  cat.pachete.forEach(function(p){ P[p.cod] = p; }); cat.module.forEach(function(m){ M[m.cod] = m; });
  var red = Number(S.anual_reducere_procent || 15), minLunar = Number(S.custom_minim_lunar || 590);
  var ron = function(n){ return Number(n || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 }); };
  var dataRo = function(x){ return x ? new Date(x).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }) : ''; };
  var tpl = function(k, v){ var s = R[k] || ''; Object.keys(v || {}).forEach(function(z){ s = s.split('{' + z + '}').join(v[z]); }); return s; };
  var KEY = 'sel:' + C.slug;

  // starea: lunar = cod pachet lunar sau combo; module = {cod: cant}; unice = {cod: cant}; anual
  var st = { lunar: null, module: {}, unice: {}, anual: false, asteptare: {} };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && typeof sv === 'object') st = Object.assign(st, sv); } catch (e) {}
  if (st.lunar && (!P[st.lunar] || !P[st.lunar].disponibil)) st.lunar = null;
  var intrat = false; try { intrat = !!sessionStorage.getItem(KEY + ':intrat'); } catch (e) {}
  if (!st.lunar && !Object.keys(st.module).length && !Object.keys(st.unice).length && !intrat && P[C.rec] && P[C.rec].disponibil) st.lunar = C.rec;
  try { sessionStorage.setItem(KEY + ':intrat', '1'); } catch (e) {}
  var msgs = [], pre = [], inRandare = false;
  var say = function(t, rec){ if (t) (inRandare ? msgs : pre).push({ t: t, rec: rec || null }); };

  function pachetLunar(){ var p = st.lunar ? P[st.lunar] : null; if (!p) return null; if (p.categorie === 'combo') { var a = p.conditii && (p.conditii.abonament_dupa || p.conditii.abonament); return a && P[a] ? P[a] : null; } return p; }
  function areCampanie(){ var p = pachetLunar(); return (p && p.module && p.module.campanie > 0) || (st.module.campanie > 0) || !!st.unice.campanie_lansare; }

  // normalizare: dependențe, exclusivități, cantități (regulile 4, 5, 6, 17)
  function normalizeaza(){
    var p = pachetLunar();
    Object.keys(st.module).forEach(function(c){ var m = M[c]; if (!m) { delete st.module[c]; return; } st.module[c] = Math.max(1, Math.min(Number(st.module[c]) || 1, m.cantitate_max || 1)); });
    Object.keys(st.unice).forEach(function(c){ var u = P[c]; if (!u || u.categorie !== 'unic') { delete st.unice[c]; return; } st.unice[c] = Math.max(1, Math.min(Number(st.unice[c]) || 1, 30)); });
    if (st.unice.refresh) { delete st.unice.refresh; } // regula 6: nu se bifează niciodată; apare „inclus”
    cat.module.forEach(function(m){ if (!st.module[m.cod]) return;
      (m.cere || []).forEach(function(dep){ var inPachet = p && p.module && p.module[dep] > 0; if (!inPachet && !st.module[dep] && !(dep === 'campanie' && st.unice.campanie_lansare)) {
        st.module[dep] = 1; say(dep === 'campanie' ? tpl('landing_cere_campanie') : tpl('extra_cere_social')); } });
      (m.exclusiv || []).forEach(function(ex){ if (st.module[ex]) { delete st.module[ex]; say('Am scos „' + (M[ex] ? M[ex].nume : ex) + '”: nu merge împreună cu „' + m.nume + '”.'); } });
    });
    if (st.unice.landing && !areCampanie()) { if (p || Object.keys(st.module).length) { st.module.campanie = 1; } else { st.unice.campanie_lansare = 1; } say(tpl('landing_cere_campanie')); }
  }

  // liniile ofertei (ce ajunge la server) + totaluri (regula 2, 3, 7, 8, 12, 13, 14, 16)
  function calculeaza(){
    var linii = [], lunar = 0, unic = 0, p = pachetLunar(), pl = st.lunar ? P[st.lunar] : null;
    if (pl) {
      linii.push({ tip: 'pachet', cod: pl.cod, nume: pl.nume, cantitate: 1, pret_unitar: Number(pl.pret), recurent: pl.categorie !== 'combo', afis: pl.categorie === 'combo' ? ron(pl.pret) + ' RON o dată' : ron(pl.pret) + ' RON / lună', nota: pl.categorie === 'combo' ? 'apoi ' + (p ? p.nume : '') + ' lunar' : 'minim ' + pl.perioada_minima_luni + ' luni' });
      if (pl.categorie === 'combo') unic += Number(pl.pret); else lunar += Number(pl.pret);
    }
    Object.keys(st.module).forEach(function(c){ var m = M[c], q = st.module[c]; if (!m) return;
      if (m.lista_asteptare) { linii.push({ tip: 'modul', cod: c, nume: m.nume, cantitate: 0, pret_unitar: 0, recurent: false, afis: 'listă de așteptare', nota: m.disponibil_din || '', asteptare: true }); say(tpl('lista_asteptare', { modul: m.nume, din: m.disponibil_din ? (/^(în|din|de la)( |$)/i.test(m.disponibil_din) ? m.disponibil_din : 'din ' + m.disponibil_din) : 'în curând' })); return; }
      var inclus = p && p.module && Number(p.module[c] || 0), extra = q - (inclus || 0);
      if (inclus && extra <= 0) { linii.push({ tip: 'inclus', cod: c, nume: m.nume + (q > 1 ? ' × ' + q : ''), cantitate: q, pret_unitar: 0, recurent: false, afis: 'inclus în ' + p.nume, inclus: true }); return; }
      var rec = m.unitate !== 'o_data', tot = Number(m.pret) * extra;
      linii.push({ tip: 'modul', cod: c, nume: m.nume, cantitate: extra, pret_unitar: Number(m.pret), recurent: rec, afis: ron(tot) + (rec ? ' RON / lună' : ' RON o dată'), nota: (inclus ? inclus + ' inclus' + (inclus > 1 ? 'e' : '') + ' în ' + p.nume + ', ' + extra + ' extra' : (extra > 1 ? extra + ' × ' + ron(m.pret) : (p ? 'extra peste ' + p.nume : ''))) });
      if (rec) lunar += tot; else unic += tot;
      if (p && inclus === 0) say(tpl('custom_vs_fix', { modul: m.nume, pachet: p.nume, pret: ron(tot) }));
    });
    Object.keys(st.unice).forEach(function(c){ var u = P[c], q = st.unice[c]; if (!u) return; var tot = Number(u.pret) * q;
      linii.push({ tip: 'pachet', cod: c, nume: u.nume, cantitate: q, pret_unitar: Number(u.pret), recurent: false, afis: ron(tot) + ' RON o dată', nota: q > 1 ? q + ' × ' + ron(u.pret) : '' });
      unic += tot;
      if (c === 'website') say(p ? tpl('website_plus_abonament') : tpl('website_singur'));
    });
    if (p && C.cu_site && !st.unice.website) linii.push({ tip: 'inclus', cod: 'refresh', nume: 'Website Refresh', cantitate: 1, pret_unitar: 0, recurent: false, afis: 'gratuit la semnare', inclus: true });
    var buget = areCampanie() || (pl && pl.conditii && pl.conditii.buget_reclame);
    if (buget) { linii.push({ tip: 'conditie', cod: 'buget_reclame', nume: 'Buget de reclame, al tău', afis: 'min. ' + ron(S.buget_reclame_min || 1500) + ' RON / lună', cond: true }); say(tpl('buget_reclame')); }
    // regula 3: Custom ≥ pachet care îl include
    var recom = null;
    if (!pl && Object.keys(st.module).length) {
      var cand = cat.pachete.filter(function(x){ return x.categorie === 'lunar' && x.disponibil && x.module; }).sort(function(a, b){ return a.pret - b.pret; });
      for (var i = 0; i < cand.length; i++) { var x = cand[i], ok = true; Object.keys(st.module).forEach(function(c){ if (M[c] && M[c].lista_asteptare) return; if (!(Number(x.module[c] || 0) >= st.module[c])) ok = false; });
        if (ok && Number(x.pret) < lunar) { recom = { cod: x.cod, nume: x.nume, economie: lunar - Number(x.pret) }; break; } }
      if (recom) say(tpl('recomanda_pachet', { pachet: recom.nume, economie: ron(recom.economie) }), recom.cod);
    }
    var subMin = !pl && lunar > 0 && lunar < minLunar;
    if (subMin) say(tpl('minim_custom'));
    var anual = st.anual && pl && pl.categorie !== 'combo' && lunar > 0 ? Math.round(lunar * 12 * (100 - red) / 100) : null;
    if (anual) say(tpl('plata_anuala'));
    var ab = pl ? pl : (lunar > 0 ? P.custom : null);
    return { linii: linii, lunar: lunar, unic: unic, anual: anual, subMin: subMin, gol: !linii.filter(function(l){ return !l.cond; }).length, pachet: ab, abonament: p, recom: recom, buget: buget };
  }

  function salveaza(){ try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  function randeaza(){
    inRandare = true; msgs = pre.slice(); pre = []; normalizeaza(); var r = calculeaza(); salveaza(); inRandare = false;
    document.getElementById('pachete').classList.toggle('anual', !!st.anual);
    document.querySelectorAll('[data-tier]').forEach(function(el){ var on = el.getAttribute('data-tier') === st.lunar; el.classList.toggle('sel', on); var b = el.querySelector('[data-alege]'); if (b) { b.classList.toggle('on', on); b.firstElementChild.textContent = on ? 'Ales: ' + P[el.getAttribute('data-tier')].nume : 'Aleg ' + P[el.getAttribute('data-tier')].nume; } });
    document.querySelectorAll('[data-combo]').forEach(function(el){ el.classList.toggle('sel', el.getAttribute('data-combo') === st.lunar); });
    var p = r.abonament;
    cat.module.forEach(function(m){ var row = document.querySelector('[data-mod="' + m.cod + '"]'); if (!row) return; var cb = row.querySelector('input'); cb.checked = !!st.module[m.cod];
      var qv = row.querySelector('[data-qv]'); if (qv) qv.textContent = st.module[m.cod] || 1;
      var inc = p && p.module && Number(p.module[m.cod] || 0), pr = row.querySelector('[data-mpret]');
      if (m.lista_asteptare) { pr.innerHTML = '<small>nu intră în total</small>'; pr.classList.add('inc'); }
      else if (inc) { pr.innerHTML = (m.cantitate_max > 1 ? inc + ' inclus' + (inc > 1 ? 'e' : '') : 'inclus') + ' în ' + p.nume + (m.cantitate_max > inc ? '<br><small>în plus: ' + ron(m.pret) + ' RON' + (m.unitate === 'luna' ? ' / lună' : m.unitate === 'buc' ? ' / buc' : m.unitate === 'ora' ? ' / oră' : '') + '</small>' : ''); pr.classList.add('inc'); }
      else { pr.innerHTML = ron(m.pret) + ' <small>RON ' + (m.unitate === 'luna' ? '/ lună' : m.unitate === 'buc' ? '/ buc' : m.unitate === 'ora' ? '/ oră' : 'o dată') + '</small>'; pr.classList.remove('inc'); }
      var minus = row.querySelector('[data-q="-"]'), plus = row.querySelector('[data-q="+"]'); if (minus) minus.disabled = (st.module[m.cod] || 1) <= 1; if (plus) plus.disabled = (st.module[m.cod] || 1) >= (m.cantitate_max || 1);
    });
    document.querySelectorAll('[data-unic]').forEach(function(row){ var c = row.getAttribute('data-unic'); row.querySelector('input').checked = !!st.unice[c]; });
    // rezumat
    var ul = document.getElementById('rz-linii'); ul.innerHTML = r.linii.map(function(l){ return '<li class="' + (l.cond ? 'cond' : l.credit ? 'cred' : '') + '"><span>' + l.nume + (l.nota ? '<small>' + l.nota + '</small>' : '') + '</span><b>' + l.afis + '</b></li>'; }).join('');
    document.getElementById('rz-gol').style.display = r.gol ? 'block' : 'none';
    document.getElementById('rz-titlu').textContent = r.gol ? 'Nimic, deocamdată.' : (r.pachet ? r.pachet.nume : 'Servicii o dată') + (r.pachet && r.pachet.cod === 'custom' ? ' · ' + Object.keys(st.module).length + ' module' : '');
    var tot = [];
    if (r.lunar > 0) tot.push('<div><span>Lunar</span><b>' + ron(r.lunar) + ' <small>RON / lună</small></b></div>');
    if (r.anual) tot.push('<div class="an"><span>Plătit anual</span><b style="font-size:26px">' + ron(r.anual) + ' <small>RON / an</small></b></div>');
    if (r.unic > 0) tot.push('<div><span>O dată</span><b>' + ron(r.unic) + ' <small>RON</small></b></div>');
    document.getElementById('rz-tot').innerHTML = tot.join('');
    var mb = document.getElementById('rz-msg'); mb.innerHTML = msgs.filter(function(m, i, a){ return a.findIndex(function(z){ return z.t === m.t; }) === i; }).map(function(m){ return '<p' + (m.rec ? ' class="rec" data-rec="' + m.rec + '"' : '') + '>' + m.t + '</p>'; }).join('');
    var fr = [];
    if (r.lunar > 0 && !r.subMin && S.prima_luna_fara_risc) fr.push('<b>Prima lună fără risc.</b> Dacă în primele 30 de zile îmi spui că nu continui, minimul de luni se anulează și nu mai datorezi nimic. Ce am făcut în luna 1 rămâne al tău.');
    if (r.pachet && r.pachet.start_din) fr.push(tpl('capacitate', { data: dataRo(r.pachet.start_din) }));
    if (r.anual) fr.push('Prețul rămâne înghețat ' + (S.anual_inghetat_ani || 2) + ' ani.');
    document.getElementById('rz-fr').innerHTML = fr.join('<br><br>'); document.getElementById('rz-fr').style.display = fr.length ? 'block' : 'none';
    var btn = document.getElementById('rz-btn'); var blocat = r.gol || r.subMin; btn.toggleAttribute('disabled', blocat); btn.setAttribute('aria-disabled', blocat ? 'true' : 'false');
    // formularul primește selecția
    var h = document.querySelector('input[name=pachet]'); if (h) h.value = r.gol ? 'Fără selecție' : (r.pachet ? r.pachet.nume : r.linii.filter(function(l){ return l.tip === 'pachet'; }).map(function(l){ return l.nume; }).join(' + '));
    window.__selectie = r.gol ? null : { plata_anual: !!r.anual, linii: r.linii.filter(function(l){ return (l.tip === 'pachet' || l.tip === 'modul') && !l.asteptare && Number(l.cantitate) > 0; }).map(function(l){ return { tip: l.tip, cod: l.cod, cantitate: l.cantitate, pret_unitar: l.pret_unitar, recurent: l.recurent }; }) };
    window.__rezumatText = r.gol ? '' : r.linii.map(function(l){ return l.nume + ': ' + l.afis; }).join('; ') + (r.lunar ? ' · ' + ron(r.lunar) + ' RON/lună' : '') + (r.unic ? ' · ' + ron(r.unic) + ' RON o dată' : '') + (r.anual ? ' · anual ' + ron(r.anual) : '');
  }

  // evenimente
  document.querySelectorAll('[data-alege]').forEach(function(b){ b.addEventListener('click', function(){ var c = b.getAttribute('data-alege'), vechi = st.lunar;
    if (st.lunar === c) { st.lunar = null; } else { if (vechi && P[vechi]) say(P[vechi].categorie === 'combo' ? tpl('combo_vs_lunar', { combo: P[vechi].nume, pachet_inclus: (pachetLunar() || {}).nume || '', nou: P[c].nume }) : tpl('un_singur_lunar', { vechi: P[vechi].nume, nou: P[c].nume })); st.lunar = c; }
    randeaza(); }); });
  document.querySelectorAll('[data-combo]').forEach(function(el){ var go = function(){ var c = el.getAttribute('data-combo'), vechi = st.lunar; if (st.lunar === c) st.lunar = null; else { if (vechi && P[vechi]) say(tpl('combo_vs_lunar', { combo: P[c].nume, pachet_inclus: (P[P[c].conditii && (P[c].conditii.abonament_dupa || P[c].conditii.abonament)] || {}).nume || '', nou: P[c].nume })); st.lunar = c; } randeaza(); }; el.addEventListener('click', go); el.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
  document.querySelectorAll('[data-wait]').forEach(function(b){ b.addEventListener('click', function(){ var c = b.getAttribute('data-wait'); var t = document.getElementById('altceva'); if (t) { var s = 'Vreau să fiu anunțat când se deschide ' + P[c].nume + '.'; if (t.value.indexOf(s) < 0) t.value = (t.value ? t.value + '\\n' : '') + s; } b.firstElementChild.textContent = 'Notat. Te anunț eu.'; b.disabled = true; location.hash = '#vorbim'; }); });
  document.querySelectorAll('[data-mcheck]').forEach(function(cb){ cb.addEventListener('change', function(){ var c = cb.getAttribute('data-mcheck'); if (cb.checked) { st.module[c] = st.module[c] || 1; (M[c].exclusiv || []).forEach(function(ex){ if (st.module[ex]) { delete st.module[ex]; say('Am scos „' + (M[ex] ? M[ex].nume : ex) + '”: nu merge împreună cu „' + M[c].nume + '”.'); } }); } else delete st.module[c]; randeaza(); }); });
  document.querySelectorAll('[data-ucheck]').forEach(function(cb){ cb.addEventListener('change', function(){ var c = cb.getAttribute('data-ucheck'); if (cb.checked) st.unice[c] = 1; else delete st.unice[c]; randeaza(); }); });
  document.querySelectorAll('[data-qm]').forEach(function(b){ b.addEventListener('click', function(e){ e.preventDefault(); var c = b.getAttribute('data-qm'), m = M[c]; st.module[c] = Math.max(1, Math.min((st.module[c] || 1) + (b.getAttribute('data-q') === '+' ? 1 : -1), m.cantitate_max || 1)); randeaza(); }); });
  document.querySelectorAll('[data-plata]').forEach(function(b){ b.addEventListener('click', function(){ st.anual = b.getAttribute('data-plata') === 'anual'; document.querySelectorAll('[data-plata]').forEach(function(x){ x.classList.toggle('on', x === b); }); randeaza(); }); });
  document.getElementById('rz-msg').addEventListener('click', function(e){ var t = e.target.closest('[data-rec]'); if (!t) return; st.lunar = t.getAttribute('data-rec'); randeaza(); });
  document.getElementById('rz-btn').addEventListener('click', function(e){ if (this.hasAttribute('disabled')) e.preventDefault(); });
  randeaza();
})();`;
}
