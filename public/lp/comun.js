// Comun pentru paginile de campanie (/liber, /dovada): datele live, formatarea, cifrele care urcă și trimiterea aplicației cu sursa campaniei.
(function () {
  'use strict';
  var RON = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 });
  var miscare = !window.matchMedia || window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // sursa campaniei: UTM-urile și id-urile de click din link, ca fiecare aplicare să spună de unde a venit
  var utm = (function () {
    var o = {};
    try {
      var q = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'].forEach(function (k) { var v = q.get(k); if (v) o[k] = v.slice(0, 160); });
    } catch (e) { /* fără URLSearchParams */ }
    return o;
  })();

  // catalogul public și cifrele live (/api/panou-date); pe previzualizare vin din pagină. O singură cerere, oricâte scripturi întreabă.
  var promis = null;
  function date() {
    if (promis) return promis;
    if (window.PANOU_DATE) promis = Promise.resolve(window.PANOU_DATE);
    else if (!window.fetch || location.protocol.indexOf('http') !== 0) promis = Promise.resolve(null);
    else promis = fetch('/api/panou-date', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return promis;
  }

  function trimite(varianta, campuri) {
    var corp = Object.assign({}, campuri, { varianta: varianta, utm: utm, pagina: location.pathname, referrer: String(document.referrer || '').slice(0, 300) });
    if (window.PANOU_PREVIZUALIZARE) return Promise.resolve({ ok: true, previzualizare: true });
    return fetch('/api/aplicare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corp) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return Object.assign({ ok: r.ok }, j); }); })
      .catch(function () { return { ok: false, motiv: 'retea' }; });
  }

  // o singură dată, când elementul intră pe ecran
  function laVedere(el, fn, prag) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (intrari) { intrari.forEach(function (i) { if (i.isIntersecting) { o.disconnect(); fn(); } }); }, { threshold: prag || 0.35 });
    o.observe(el);
  }

  // cifra urcă de la valoarea de acum la cea nouă; la repaus arată deja valoarea finală
  function numara(el, tinta, fmt, durata) {
    var f = fmt || function (v) { return RON.format(v); };
    if (!miscare) { el.textContent = f(tinta); return; }
    var din = Number(el.dataset.acum || 0), t0 = null;
    el.dataset.acum = tinta;
    var pas = function (t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / (durata || 1200));
      el.textContent = f(Math.round(din + (tinta - din) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }
  function numaraLaVedere(radacina) {
    Array.prototype.forEach.call((radacina || document).querySelectorAll('[data-num]'), function (el) {
      laVedere(el, function () { el.dataset.acum = 0; numara(el, Number(el.dataset.num)); }, 0.6);
    });
  }

  // pachetele publice din catalog: treptele lunare, combinațiile și ușile o dată
  function pachete(cat) {
    var P = (cat && cat.pachete) || [];
    return {
      lunare: P.filter(function (p) { return p.categorie === 'lunar' && p.cod !== 'custom'; }).sort(function (a, b) { return a.pret - b.pret; }),
      combo: P.filter(function (p) { return p.categorie === 'combo'; }),
      unice: P.filter(function (p) { return p.categorie === 'unic'; }),
      setari: (cat && cat.setari) || {},
    };
  }

  window.AleSign = { RON: RON, miscare: miscare, esc: esc, utm: utm, date: date, trimite: trimite, laVedere: laVedere, numara: numara, numaraLaVedere: numaraLaVedere, pachete: pachete };
})();
