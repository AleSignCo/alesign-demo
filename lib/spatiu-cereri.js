// Cererile (Funnel de cereri, etapa 1 · SQL 120): secțiunea din spațiul clientului cu cererile venite prin formularul site-ului.
// Datele vin din RPC-ul spatiu_cereri(token): ultimele 90 de zile, telefonul și emailul mascate. Contactul întreg apare abia la clic
// (POST /api/spatiu-cereri, care notează clicul în jurnalul spațiului), iar starea o mută proprietarul: nouă, contactat, programat, finalizat, anulat.
// Secțiunea își aduce stilul și scriptul ei, ca lib/spatiu.js să o pună cu o singură linie: ${cereriHtml(d.cereri, token)}.
// Nimic de aici nu ajunge la un model: textul cererii se arată doar proprietarului (la medical, baza nici nu păstrează mesajul).
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl = (s) => esc(s).replace(/\n/g, '<br>');
const ziOra = (d) => (d ? new Date(d).toLocaleString('ro-RO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }) : '');
// valoarea pentru <input type="datetime-local">, pe ora României
const pentruCamp = (d) => { if (!d) return ''; const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d)); return p.replace(' ', 'T'); };

export const ETAPE_CERERI = [['noua', 'Nouă'], ['contactat', 'Am vorbit'], ['programat', 'Programat'], ['finalizat', 'A venit'], ['anulat', 'Anulat']];
const NUME_ETAPA = Object.fromEntries(ETAPE_CERERI);
const INTERVAL = { oricand: 'oricând', dimineata: 'dimineața', dupa_amiaza: 'după-amiaza' };
// pagina din care a venit cererea, pe înțeles: „/contact” → „pagina Contact”
const paginaPeInteles = (p) => { const c = String(p || '').replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/\/+$/, ''); if (!c) return 'pagina principală'; const s = c.split('/').filter(Boolean).pop().replace(/-/g, ' '); return `pagina „${s.charAt(0).toUpperCase() + s.slice(1)}”`; };

export function numarCereri(c) { const n = (c && c.numar) || {}; return { toate: Number(n.toate || 0), noi: Number(n.noua || 0) }; }

function cerereHtml(x, medical) {
  const etapa = NUME_ETAPA[x.etapa] ? x.etapa : 'noua';
  const contact = [x.are_telefon ? `<span class="cr-v" data-cr-tel>${esc(x.telefon || '')}</span>` : '', x.are_email ? `<span class="cr-v" data-cr-email>${esc(x.email || '')}</span>` : ''].filter(Boolean).join(' · ');
  const detalii = [`a scris de pe ${paginaPeInteles(x.pagina)}`, x.sursa ? `a venit din: ${x.sursa}` : '', medical && x.interval ? `preferă să fie sunat ${INTERVAL[x.interval] || 'oricând'}` : '', x.recenzie ? 'a bifat că vrea cererea de recenzie' : ''].filter(Boolean).join(' · ');
  return `<div class="card cr" data-cr="${Number(x.id)}" data-etapa="${etapa}">
    <div class="cr-sus"><div><p class="dt">${esc(x.nume || 'Fără nume')}</p><p class="meta">${esc(ziOra(x.la))} · ${esc(detalii)}</p></div><span class="cr-e cr-${etapa}" data-cr-eticheta>${esc(NUME_ETAPA[etapa])}</span></div>
    ${x.mesaj ? `<p class="cr-m">${nl(x.mesaj)}</p>` : ''}
    <p class="cr-c">${contact}${x.are_telefon || x.are_email ? ` <button type="button" class="btn ghost mic" data-cr-arata>Arată contactul</button>` : ''}</p>
    <div class="cr-jos">
      <label class="cr-l">Unde ai ajuns cu cererea<select data-cr-etapa aria-label="Starea cererii de la ${esc(x.nume || 'client')}">${ETAPE_CERERI.map(([k, n]) => `<option value="${k}"${k === etapa ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label class="cr-l cr-data${etapa === 'programat' ? ' on' : ''}">Ziua și ora programării<input type="datetime-local" data-cr-data value="${esc(pentruCamp(x.programat_la))}"></label>
      <button type="button" class="btn mic" data-cr-salveaza>Salvez</button>
    </div>
    <p class="cr-g" data-cr-gata>${x.etapa === 'programat' && x.programat_la ? `Programat pe ${esc(ziOra(x.programat_la))}.` : ''}</p>
  </div>`;
}

export const CSS_CERERI = `
  .cr-sus { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .cr-e { font-size:12px; font-weight:700; padding:5px 10px; border-radius:999px; border:1px solid var(--line); white-space:nowrap; }
  .cr-e.cr-noua { background:var(--accent); border-color:var(--accent); color:#fff; } .cr-e.cr-programat, .cr-e.cr-finalizat { border-color:var(--ok); color:var(--ok); } .cr-e.cr-anulat { color:var(--muted); }
  .cr-m { margin:10px 0 0; font-size:15px; white-space:pre-line; }
  .cr-c { margin:10px 0 0; font-size:14.5px; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .cr-v { font-variant-numeric:tabular-nums; font-weight:600; } .cr-v a { border-bottom:1px solid currentColor; }
  .cr-jos { display:flex; flex-wrap:wrap; align-items:flex-end; gap:12px; margin-top:14px; padding-top:12px; border-top:1px solid var(--line); }
  .cr-l { display:flex; flex-direction:column; gap:4px; font-size:12.5px; color:var(--muted); }
  .cr-l select, .cr-l input { font:inherit; font-size:14.5px; color:var(--text); padding:9px 10px; border:1px solid var(--line); border-radius:10px; background:#fff; min-height:42px; }
  .cr-data { display:none; } .cr-data.on { display:flex; }
  .cr [data-cr-gata] { min-height:1.2em; font-size:13.5px; margin:8px 0 0; }
  .cr-rez { display:flex; flex-wrap:wrap; gap:8px 18px; font-size:14px; color:var(--muted); margin-top:10px; } .cr-rez b { color:var(--text); }
  .cr-mai { margin-top:14px; }`;

const scriptCereri = (token) => `<script>
(function(){
  var T = ${JSON.stringify(token)};
  var EROARE = 'Nu s-a trimis. Mai încearcă o dată; dacă nu merge nici acum, scrie-mi la Mesaje și rezolv eu.';
  var NUME = ${JSON.stringify(NUME_ETAPA)};
  function post(body){ return fetch('/api/spatiu-cereri', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.assign({ token: T }, body)) }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok && j.ok, j: j }; }); }).catch(function(){ return { ok:false }; }); }
  function spune(card, text, ok){ var g = card.querySelector('[data-cr-gata]'); if (!g) return; g.textContent = text; g.style.color = ok ? '' : '#b3261e'; }
  document.querySelectorAll('.cr').forEach(function(card){
    var id = Number(card.getAttribute('data-cr')), sel = card.querySelector('[data-cr-etapa]'), data = card.querySelector('[data-cr-data]'), arata = card.querySelector('[data-cr-arata]'), salveaza = card.querySelector('[data-cr-salveaza]');
    sel.addEventListener('change', function(){ data.parentNode.classList.toggle('on', sel.value === 'programat'); });
    if (arata) arata.addEventListener('click', function(){ arata.disabled = true;
      post({ actiune: 'contact', cerere_id: id }).then(function(r){
        if (!r.ok) { arata.disabled = false; spune(card, (r.j && r.j.motiv) || EROARE, false); return; }
        var tel = card.querySelector('[data-cr-tel]'), em = card.querySelector('[data-cr-email]');
        if (tel && r.j.telefon) { tel.textContent = ''; var a = document.createElement('a'); a.href = 'tel:' + String(r.j.telefon).replace(/[^0-9+]/g, ''); a.textContent = r.j.telefon; tel.appendChild(a); }
        if (em && r.j.email) { em.textContent = ''; var b = document.createElement('a'); b.href = 'mailto:' + r.j.email; b.textContent = r.j.email; em.appendChild(b); }
        arata.remove(); spune(card, '', true);
      }); });
    salveaza.addEventListener('click', function(){
      var etapa = sel.value, cand = data.value;
      if (etapa === 'programat' && !cand) { spune(card, 'Alege ziua și ora programării, apoi salvează.', false); return; }
      salveaza.disabled = true;
      post({ actiune: 'etapa', cerere_id: id, etapa: etapa, programat_la: etapa === 'programat' && cand ? new Date(cand).toISOString() : null }).then(function(r){
        salveaza.disabled = false;
        if (!r.ok) { spune(card, (r.j && r.j.motiv) || EROARE, false); return; }
        var e = card.querySelector('[data-cr-eticheta]'); e.textContent = NUME[etapa] || etapa; e.className = 'cr-e cr-' + etapa; card.setAttribute('data-etapa', etapa);
        spune(card, etapa === 'programat' ? 'Am notat programarea.' : 'Am notat.', true);
      });
    });
  });
  var mai = document.querySelector('[data-cr-mai]');
  if (mai) mai.addEventListener('click', function(){ document.querySelectorAll('.cr[hidden]').forEach(function(c){ c.hidden = false; }); mai.remove(); });
})();
</script>`;

/**
 * cereriHtml(c, token) → secțiunea „Cererile” (cu stilul și scriptul ei) sau '' când site-ul nu are formular și nu a venit nicio cerere.
 *  c: răspunsul RPC-ului spatiu_cereri { activ, medical, zile, cereri: [...], numar: {...}, surse: [...] }
 */
export function cereriHtml(c, token) {
  if (!c || !c.activ) return '';
  const lista = Array.isArray(c.cereri) ? c.cereri : [];
  const n = numarCereri(c);
  const surse = (Array.isArray(c.surse) ? c.surse : []).filter((s) => s && s.sursa && s.sursa !== 'fără sursă marcată').slice(0, 5);
  const titlu = !lista.length ? 'Încă n-a scris nimeni de pe site.' : n.noi === 0 ? 'Ai răspuns la toate cererile.' : n.noi === 1 ? 'Te așteaptă o cerere nouă.' : `Te așteaptă ${n.noi} cereri noi.`;
  const PRIMELE = 10;
  return `<section id="cereri"><div class="wrap">
  <style>${CSS_CERERI}</style>
  <p class="eyebrow">Cererile</p>
  <h2 class="h2">${titlu}</h2>
  <p class="lead">Aici ajunge fiecare om care îți scrie prin formularul de pe site. Vezi de pe ce pagină a scris și, când linkul era marcat de mine, din ce reclamă sau postare a venit. Telefonul apare întreg când apeși „Arată contactul”. Țin cererile aici ${Number(c.zile) || 90} de zile.</p>
  ${lista.length ? `<p class="cr-rez"><span><b>${n.toate}</b> ${n.toate === 1 ? 'cerere' : 'cereri'} în ultimele ${Number(c.zile) || 90} de zile</span>${surse.map((s) => `<span><b>${Number(s.n)}</b> din ${esc(s.sursa)}</span>`).join('')}</p>` : '<p class="gol">Când scrie cineva, îți trimit cererea pe email și o găsești și aici, cu starea ei.</p>'}
  ${lista.map((x, i) => (i < PRIMELE ? cerereHtml(x, !!c.medical) : cerereHtml(x, !!c.medical).replace('<div class="card cr"', '<div class="card cr" hidden'))).join('\n')}
  ${lista.length > PRIMELE ? `<p class="cr-mai"><button type="button" class="btn ghost mic" data-cr-mai>Arată și celelalte ${lista.length - PRIMELE}</button></p>` : ''}
  ${lista.length ? scriptCereri(token) : ''}
</div></section>`;
}
