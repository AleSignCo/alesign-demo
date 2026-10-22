// Comun pentru paginile-film (/alesystem, /dovada): bara de progres, antetul, aparițiile, cifra live, prețul de pornire,
// WhatsApp-ul cu numele afacerii, formularul scurt și bara de pe telefon. Varianta formularului vine din data-varianta.
(function () {
  'use strict';
  var A = window.AleSign, $ = function (s) { return document.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var io = 'IntersectionObserver' in window;
  var de = function (n) { var r = n % 100; return r >= 20 || (n >= 100 && r === 0) ? n + ' de' : String(n); };

  // ---------- bara de progres și antetul ----------
  var top = $('#top'), progres = $('#progres'), cerut = false;
  function scroll() {
    cerut = false;
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    if (progres) progres.style.width = (max > 0 ? h.scrollTop / max * 100 : 0) + '%';
    if (top) top.classList.toggle('solid', h.scrollTop > 40);
  }
  window.addEventListener('scroll', function () { if (!cerut) { cerut = true; requestAnimationFrame(scroll); } }, { passive: true });
  scroll();

  // ---------- aparițiile ----------
  var r = $$('[data-r]');
  if (!io || !A.miscare) r.forEach(function (e) { e.classList.add('in'); });
  else {
    var o = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } }); }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    r.forEach(function (e) { o.observe(e); });
  }

  // ---------- cifra live și prețul de pornire ----------
  A.date().then(function (d) {
    if (!d) return;
    var c = d.cifre, cifra = $('#live-cifra');
    if (c && cifra) {
      var serie = Array.isArray(c.research_zilnic) ? c.research_zilnic : [];
      var n = serie.length ? serie.reduce(function (s, x) { return s + (Number(x.n) || 0); }, 0) : c.firme_analizate;
      if (typeof n === 'number') {
        var t = $('#live-text');
        if (t && t.dataset.sablon) t.textContent = t.dataset.sablon.replace('{zile}', serie.length ? 'în ultimele ' + de(serie.length) + ' zile' : 'până acum');
        if ($('#live-ex')) $('#live-ex').hidden = !c.exemplu;
        A.laVedere(cifra, function () { A.numara(cifra, n, null, 1800); }, 0.5);
      }
    }
    var P = A.pachete(d.catalog);
    if (P.lunare.length && $('#pret-mic')) $('#pret-mic').textContent = 'Abonamentele pornesc de la ' + A.RON.format(P.lunare[0].pret) + ' RON pe lună. Prețurile sunt la vedere, fără costuri ascunse.';
  });

  // ---------- WhatsApp cu numele afacerii, după generator ----------
  var waBaza = 'https://wa.me/40755367084?text=';
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('.gen-final-btn')) return;
    var firma = ($('#incearca') || {}).dataset && $('#incearca').dataset.nume;
    if (firma) $$('#wa, .bj-wa').forEach(function (a) { a.href = waBaza + encodeURIComponent('Salut, Alexandru! Am încercat AleSystem pe „' + firma + '” și vreau mostra reală.'); });
  });

  // ---------- formularul scurt: te sun eu ----------
  var f = $('#formular');
  if (f) {
    var er = $('#c-eroare'), btn = $('#c-trimite'), textBtn = btn.firstChild.textContent;
    var eroare = function (t) { er.innerHTML = t; er.hidden = !t; };
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); eroare('');
      var b = { nume: $('#c-nume').value.trim(), telefon: $('#c-tel').value.trim(), firma: $('#c-firma').value.trim(), nisa: $('#c-nisa').value, canal: 'telefon', acord: $('#c-acord').checked, website2: $('#c-website2').value, pachet: ($('#c-pachet') || {}).value || '', mesaj: 'A cerut să fie sunat, din pagina ' + location.pathname + '.' };
      if (b.nume.length < 2) { eroare('Spune-mi cum te cheamă, ca să știu pe cine sun.'); $('#c-nume').focus(); return; }
      if (b.telefon.replace(/\D/g, '').length < 9) { eroare('Numărul pare că-i lipsește o cifră.'); $('#c-tel').focus(); return; }
      if (!b.acord) { eroare('Bifează acordul, altfel n-am voie să te sun.'); $('#c-acord').focus(); return; }
      btn.disabled = true; btn.firstChild.textContent = 'Trimit… ';
      A.trimite(f.dataset.varianta || 'alesystem', b).then(function (r) {
        btn.disabled = false; btn.firstChild.textContent = textBtn;
        if (r.ok) {
          f.hidden = true;
          $('#succes-titlu').textContent = 'Mersi, ' + b.nume.split(' ')[0] + '! Am primit.';
          $('#succes-text').textContent = r.previzualizare
            ? 'Previzualizare: de aici nu pleacă nimic. Pe pagina reală, Alexandru primește numărul și te sună.'
            : 'Te sun azi' + (b.firma ? ' despre ' + b.firma : '') + '. Dacă nu răspunzi, îți las un mesaj pe WhatsApp.';
          $('#c-succes').hidden = false; $('#c-succes').focus();
          return;
        }
        eroare(r.motiv === 'prea multe cereri' ? 'Am primit deja numărul tău azi. Te sun cât pot de repede.' : 'Nu s-a trimis. Sună-mă direct la <a href="tel:+40755367084">0755 367 084</a> sau scrie-mi pe <a href="' + $('#wa').href + '" target="_blank" rel="noopener">WhatsApp</a>.');
      });
    });
  }

  // ---------- bara de jos dispare pe prima scenă și la contact ----------
  if (io && $('#bara-jos')) {
    var vazut = {};
    var ob = new IntersectionObserver(function (es) { es.forEach(function (e) { vazut[e.target.id] = e.isIntersecting; }); $('#bara-jos').classList.toggle('ascunsa', !!(vazut.contact || vazut.sus)); }, { threshold: 0.3 });
    ['#contact', '#sus'].forEach(function (s) { if ($(s)) ob.observe($(s)); });
  }
})();
