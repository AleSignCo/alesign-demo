// Comun pentru /liber și /dovada: pozele, galeria care curge, apariția la scroll, ziua cu AleSystem și generatorul „scrie numele afacerii”.
// Generatorul rulează doar în browser, din numele scris: nu trimite nimic și nu pretinde că a analizat ceva real.
(function () {
  'use strict';
  var A = window.AleSign;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // toate pozele într-un singur loc, ca previzualizarea să le includă o singură dată
  var FOTO = {
    'salon-interior': '/lp/foto/salon-interior.jpg', 'salon-proprietara': '/lp/foto/salon-proprietara.jpg', 'salon-coafat': '/lp/foto/salon-coafat.jpg',
    'salon-oglinda': '/lp/foto/salon-oglinda.jpg', 'salon-foarfeca': '/lp/foto/salon-foarfeca.jpg', 'salon-receptie': '/lp/foto/salon-receptie.jpg',
    'salon-alb': '/lp/foto/salon-alb.jpg', 'salon-negru': '/lp/foto/salon-negru.jpg',
    'barber-scaune': '/lp/foto/barber-scaune.jpg', 'barber-barba': '/lp/foto/barber-barba.jpg', 'barber-unelte': '/lp/foto/barber-unelte.jpg',
    'barber-ceas': '/lp/foto/barber-ceas.jpg', 'barber-tuns': '/lp/foto/barber-tuns.jpg',
    'spa-lounge': '/lp/foto/spa-lounge.jpg', 'spa-pietre': '/lp/foto/spa-pietre.jpg', 'spa-lumanari': '/lp/foto/spa-lumanari.jpg', 'spa-cada': '/lp/foto/spa-cada.jpg',
    'spa-marmura': '/lp/foto/spa-marmura.jpg', 'spa-crema': '/lp/foto/spa-crema.jpg', 'spa-cosmetice': '/lp/foto/spa-cosmetice.jpg', 'spa-hol': '/lp/foto/spa-hol.jpg',
    'spa-baie': '/lp/foto/spa-baie.jpg', 'spa-lumanare': '/lp/foto/spa-lumanare.jpg'
  };
  var url = function (k) { return FOTO[k] ? 'url("' + FOTO[k] + '")' : ''; };
  function poze(r) { $$('[data-foto]', r).forEach(function (el) { el.style.backgroundImage = url(el.dataset.foto); }); }

  // ---------- galeria: rândurile se dublează ca să curgă la nesfârșit ----------
  function galerie() {
    $$('.galerie-rand').forEach(function (rand) {
      poze(rand);
      $$('span', rand).forEach(function (s) { var c = s.cloneNode(true); c.setAttribute('aria-hidden', 'true'); rand.appendChild(c); });
    });
  }

  // ---------- apariția la scroll ----------
  function apare() {
    if (!A.miscare || !('IntersectionObserver' in window)) return;
    var el = $$('main > section:not(.erou):not(.galerie):not(.ziua) > .wrap > *').concat($$('.munci > li, .drumuri > *, .focus > *, .fapte > li, .potrivire > *, .grupe > *, .pierdut-grid > *, .bonus > li'));
    var o = new IntersectionObserver(function (intrari) {
      intrari.forEach(function (i) {
        if (!i.isIntersecting) return;
        var t = i.target;
        t.classList.add('vazut'); o.unobserve(t);
        // după apariție, elementul își recapătă tranzițiile lui (hover etc.)
        setTimeout(function () { t.classList.remove('apare', 'vazut'); t.style.transitionDelay = ''; }, 1400);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    el.forEach(function (e) {
      if (e.closest('[hidden]') && !e.closest('#live')) return;
      var frati = e.parentNode ? Array.prototype.indexOf.call(e.parentNode.children, e) : 0;
      if (e.parentNode && !e.parentNode.classList.contains('wrap')) e.style.transitionDelay = Math.min(frati, 5) * 80 + 'ms';
      e.classList.add('apare'); o.observe(e);
    });
  }

  // ---------- ziua: ceasul și poza urmăresc momentul de pe ecran ----------
  function ziua() {
    var s = document.getElementById('ziua');
    if (!s) return;
    var fotos = $$('.ziua-foto', s), momente = $$('.ziua-momente li', s), ora = s.querySelector('.ziua-ceas b'), et = s.querySelector('.ziua-ceas span'), bara = s.querySelector('.ziua-progres i');
    poze(s);
    function activ(i) {
      momente.forEach(function (m, j) { m.classList.toggle('activ', j === i); });
      fotos.forEach(function (f, j) { f.classList.toggle('activ', j === i); });
      ora.textContent = momente[i].dataset.ora;
      et.textContent = momente[i].dataset.eticheta;
      bara.style.width = (momente.length > 1 ? i / (momente.length - 1) * 100 : 100) + '%';
    }
    activ(0);
    if (!('IntersectionObserver' in window)) return;
    var o = new IntersectionObserver(function (intrari) {
      intrari.forEach(function (i) { if (i.isIntersecting) activ(momente.indexOf(i.target)); });
    }, { rootMargin: '-55% 0px -30% 0px' });
    momente.forEach(function (m) { o.observe(m); });
  }

  // ---------- generatorul ----------
  var DOM = {
    frumusete: { et: 'salon de frumusețe', nisa: 'Beauty & Wellness', foto: ['salon-interior', 'salon-oglinda', 'salon-foarfeca', 'salon-coafat'],
      tag: 'Frumusețe lucrată cu răbdare, în {oras}.', cta: 'Programează-te', serv: ['Tuns & styling', 'Colorare', 'Tratamente'],
      post: ['Înainte și după. Culoarea de toamnă, lucrată la {nume}.', 'Detaliile fac diferența. Ne vedem săptămâna asta?', 'Mai avem locuri joi după-amiază. Scrie-ne „joi”.'],
      rec: ['Andreea M.', '„Am ieșit exact cum mi-am dorit. Revin sigur!”'], rasp: 'Mulțumim, Andreea! Ne bucurăm că ai plecat zâmbind de la {nume}. Te așteptăm data viitoare.' },
    barber: { et: 'barbershop', nisa: 'Beauty & Wellness', foto: ['barber-scaune', 'barber-barba', 'barber-unelte', 'barber-tuns'],
      tag: 'Tunsori clasice și bărbierit ca la carte, în {oras}.', cta: 'Rezervă un scaun', serv: ['Tuns', 'Barbă', 'Bărbierit clasic'],
      post: ['Fade proaspăt, lucrat azi la {nume}.', 'Uneltele contează. Le curățăm după fiecare client.', 'Sâmbătă dimineață mai avem două locuri.'],
      rec: ['Mihai R.', '„Cea mai bună tunsoare din ultimul an.”'], rasp: 'Mersi, Mihai! Te așteptăm peste trei săptămâni la {nume}.' },
    spa: { et: 'spa', nisa: 'Beauty & Wellness', foto: ['spa-lounge', 'spa-pietre', 'spa-lumanari', 'spa-cada'],
      tag: 'O oră în care nu te caută nimeni. În {oras}.', cta: 'Rezervă un ritual', serv: ['Masaj', 'Ritualuri', 'Zona de relaxare'],
      post: ['Ritualul cu pietre calde de la {nume}. 60 de minute doar pentru tine.', 'Lumânări aprinse, telefonul închis. Te așteptăm.', 'Un voucher la {nume} e cadoul care nu se uită.'],
      rec: ['Ioana P.', '„Am plecat ca nouă. Atmosfera e superbă.”'], rasp: 'Mulțumim, Ioana! Ne bucurăm că ți-ai găsit liniștea la {nume}.' },
    clinica: { et: 'clinică privată', nisa: 'Medical', foto: ['spa-marmura', 'salon-receptie', 'spa-crema', 'salon-alb'],
      tag: 'Îngrijire atentă, explicată pe înțelesul tău. În {oras}.', cta: 'Programează o consultație', serv: ['Consultații', 'Tratamente', 'Controale periodice'],
      post: ['Ce întrebi la prima consultație? Am făcut o listă scurtă.', 'Așa ne pregătim cabinetul pentru tine, în fiecare dimineață.', 'Programările pentru luna viitoare sunt deschise.'],
      rec: ['Elena D.', '„Mi s-a explicat totul clar și cu răbdare.”'], rasp: 'Vă mulțumim pentru încredere, doamna Elena! Ne bucurăm că v-ați simțit bine la {nume}.' },
    alt: { et: 'afacere premium', nisa: 'Alt domeniu premium', foto: ['salon-receptie', 'spa-hol', 'spa-baie', 'salon-negru'],
      tag: 'Calitate pe care o simți din prima zi. În {oras}.', cta: 'Cere o întâlnire', serv: ['Consultanță', 'Proiecte la comandă', 'Întreținere'],
      post: ['Din culise: cum arată o zi la {nume}.', 'Un proiect terminat săptămâna asta. Detaliile, în carusel.', 'Ai o întrebare? Îți răspundem în aceeași zi.'],
      rec: ['Radu T.', '„Profesioniști de la primul telefon până la final.”'], rasp: 'Mulțumim frumos, Radu! Ne bucurăm că ați lucrat cu {nume}.' }
  };
  var slug = function (s) {
    var t = String(s || '').toLowerCase().replace(/&/g, 'si');
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* fără normalize */ }
    return t.replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'afacereata';
  };
  var initiale = function (s) { return String(s || 'A').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase() || 'A'; };
  var oras = function (s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'București'; };

  function generator() {
    var g = document.getElementById('incearca');
    if (!g) return;
    var f = g.querySelector('.gen-form'), scena = g.querySelector('.gen-scena'), inNume = g.querySelector('.gen-nume'), inOras = g.querySelector('.gen-oras');
    var btn = g.querySelector('.gen-porneste'), pasi = $$('.consola-pasi li', g), final = g.querySelector('.gen-final');
    var q = function (s) { return g.querySelector(s); };
    var lucreaza = false;

    function date() {
      var dom = (f.querySelector('input[name="gen-dom"]:checked') || {}).value || 'frumusete';
      var nume = inNume.value.trim().replace(/\s+/g, ' ').slice(0, 40);
      return { cheie: dom, d: DOM[dom], nume: nume, afis: nume || 'Numele afacerii tale', oras: oras(inOras.value) };
    }
    var fill = function (t, x) { return t.replace(/\{nume\}/g, x.afis).replace(/\{oras\}/g, x.oras); };

    // site-ul se schimbă pe măsură ce scrii
    function site(x) {
      q('.site-foto').style.backgroundImage = url(x.d.foto[0]);
      q('.site-logo b').textContent = initiale(x.afis);
      q('.site-logo span').textContent = x.afis;
      q('.site-mic').textContent = x.oras + ' · ' + x.d.et;
      var n = q('.site-nume'); n.textContent = x.afis; n.classList.toggle('lung', x.afis.length > 18);
      q('.site-tag').textContent = fill(x.d.tag, x);
      q('.site-btn').textContent = x.d.cta;
      $$('.site-servicii span', g).forEach(function (s, i) { s.textContent = x.d.serv[i]; });
      q('.browser-url span').textContent = slug(x.nume) + '.ro';
    }
    function rest(x) {
      $$('.ig', g).forEach(function (el, i) {
        el.querySelector('.ig-cap b').textContent = initiale(x.afis);
        el.querySelector('.ig-cap span').textContent = '@' + slug(x.nume);
        el.querySelector('.ig-foto').style.backgroundImage = url(x.d.foto[i + 1]);
        el.querySelector('.ig-foto p').textContent = fill(x.d.post[i], x);
      });
      q('.rec-sus b').textContent = x.d.rec[0];
      q('.rec > p').textContent = x.d.rec[1];
      q('.rec-rasp p').textContent = fill(x.d.rasp, x);
    }
    function actual() { if (!lucreaza) { var x = date(); site(x); if (!scena.classList.contains('gol')) rest(x); } }
    inNume.addEventListener('input', actual);
    inOras.addEventListener('input', actual);
    $$('input[name="gen-dom"]', g).forEach(function (r) { r.addEventListener('change', actual); });
    var x0 = date(); site(x0); rest(x0);

    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (lucreaza) return;
      var x = date();
      if (!x.nume) { inNume.focus(); inNume.setAttribute('placeholder', 'Scrie aici numele, apoi apasă din nou'); return; }
      lucreaza = true; btn.disabled = true;
      var t0 = performance.now(), texte = ['Citesc numele: „' + x.nume + '”', 'Aleg pozele și tonul pentru ' + x.d.et, 'Construiesc prima pagină a site-ului', 'Scriu trei postări cu numele tău', 'Pregătesc răspunsul la o recenzie', 'Verific totul înainte să ți-l arăt'];
      pasi.forEach(function (p, i) { p.className = ''; p.textContent = texte[i]; });
      final.hidden = true;
      scena.classList.remove('gata'); scena.classList.add('lucreaza');
      var durate = A.miscare ? [700, 900, 1000, 900, 800, 600] : [0, 0, 0, 0, 0, 0];
      var i = 0;
      (function pas() {
        if (i > 0) { pasi[i - 1].classList.remove('acum'); pasi[i - 1].classList.add('facut'); }
        if (i === 2) site(x);
        if (i === pasi.length) {
          var sec = ((performance.now() - t0) / 1000).toFixed(1).replace('.', ',');
          rest(x);
          scena.classList.remove('lucreaza', 'gol'); void scena.offsetWidth; scena.classList.add('gata');
          q('.gen-final-text').innerHTML = 'Asta a durat <b>' + sec + ' secunde</b> și a pornit doar de la un nume. Mostra reală pornește de la afacerea ta: concurenții tăi din ' + A.esc(x.oras) + ', pozele tale, prețurile tale. <b>O fac eu, gratis.</b>';
          q('.gen-final-btn span').textContent = 'Vreau mostra reală pentru ' + x.nume;
          final.hidden = false;
          g.dataset.nume = x.nume; g.dataset.nisa = x.d.nisa; g.dataset.oras = x.oras;
          lucreaza = false; btn.disabled = false; btn.querySelector('span').textContent = 'Încearcă alt nume';
          return;
        }
        pasi[i].classList.add('acum');
        setTimeout(function () { i++; pas(); }, durate[i]);
      })();
    });

    // mostra reală: completez formularul cu ce a scris deja
    q('.gen-final-btn').addEventListener('click', function () {
      var cf = g.dataset.firma && document.querySelector(g.dataset.firma);
      if (cf && !cf.value) cf.value = g.dataset.nume || '';
      var co = g.dataset.campOras && document.querySelector(g.dataset.campOras);
      if (co && !co.value) co.value = g.dataset.oras || '';
      $$(g.dataset.campNisa || '_').forEach(function (c) {
        if (c.tagName === 'SELECT') c.value = g.dataset.nisa;
        else if (c.value === g.dataset.nisa) c.checked = true;
      });
    });
  }

  galerie(); ziua(); generator(); apare();
})();
