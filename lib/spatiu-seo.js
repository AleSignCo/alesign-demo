// Tabloul SEO (SQL 121): secțiunea din spațiul clientului cu pozițiile din Google pe căutările din harta lui, cererile pe pagini și
// comparația cu aceleași zile din luna trecută. Datele vin din RPC-ul tablou_seo(token); până nu e legat Search Console, secțiunea nu apare.
// Cifrele sunt cele din Google Search Console, neschimbate: poziția e o medie, deci nu scriem „locul N” ca promisiune și nu rotunjim în sus.
// Secțiunea își aduce stilul ei, ca lib/spatiu.js să o pună cu o singură linie: ${seoHtml(d.seo)}.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 });
const poz = (v) => Number(v).toLocaleString('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const parti = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? { a: Number(m[1]), l: Number(m[2]), z: Number(m[3]) } : null; };
// „1–24 noiembrie”; dacă perioada trece în altă lună, „28 octombrie – 3 noiembrie”
export function perioadaRo(de, pana) {
  const a = parti(de); const b = parti(pana);
  if (!a || !b) return '';
  if (a.l === b.l && a.a === b.a) return a.z === b.z ? `${a.z} ${LUNI[a.l - 1]}` : `${a.z}–${b.z} ${LUNI[a.l - 1]}`;
  return `${a.z} ${LUNI[a.l - 1]} – ${b.z} ${LUNI[b.l - 1]}`;
}
// aceeași căutare scrisă fără diacritice nu se mai arată o dată
const faraSemne = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const eNumar = (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
// poziția de acum față de luna trecută (în Google, un număr mai mic înseamnă mai sus); sub o jumătate de poziție nu spunem că s-a mișcat
export function miscarePozitie(acum, inainte) {
  const A = eNumar(acum); const B = eNumar(inainte);
  if (A && B) { const d = Number(inainte) - Number(acum); return Math.abs(d) < 0.5 ? `la fel ca luna trecută (${poz(inainte)})` : d > 0 ? `mai sus decât luna trecută (${poz(inainte)})` : `mai jos decât luna trecută (${poz(inainte)})`; }
  if (A) return 'luna trecută nu apărea';
  if (B) return `luna trecută: ${poz(inainte)}`;
  return '';
}
const paginaPeInteles = (p) => { const c = String(p || '').replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/\/+$/, ''); if (!c) return 'Pagina principală'; const s = c.split('/').filter(Boolean).pop().replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
const dataRo = (iso) => { const p = parti(iso); return p ? `${p.z} ${LUNI[p.l - 1]}` : ''; };

export const CSS_SEO = `
  .seo-t { width:100%; border-collapse:collapse; margin-top:14px; font-size:14.5px; }
  .seo-t th { text-align:left; font-size:11.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); font-weight:700; padding:8px 10px 8px 0; border-bottom:1px solid var(--line); }
  .seo-t td { padding:12px 10px 12px 0; border-bottom:1px solid var(--line); vertical-align:top; }
  .seo-t td.n, .seo-t th.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; padding-right:0; padding-left:10px; }
  .seo-t .c { font-weight:600; } .seo-t .m { display:block; color:var(--muted); font-size:13px; font-weight:400; margin-top:2px; }
  .seo-p { font-weight:700; font-variant-numeric:tabular-nums; } .seo-nu { color:var(--muted); }
  .seo-tot { display:flex; flex-wrap:wrap; gap:10px 26px; margin-top:16px; } .seo-tot div { font-size:13.5px; color:var(--muted); } .seo-tot b { display:block; font-size:26px; color:var(--text); font-variant-numeric:tabular-nums; line-height:1.15; }
  .seo-sub { font-size:17px; font-weight:600; margin:28px 0 0; }
  @media (max-width:560px) { .seo-t .ascuns-mic { display:none; } }`;

function cautariHtml(t) {
  const lista = Array.isArray(t.cautari) ? t.cautari : [];
  if (!lista.length) return `<p class="gol">${t.are_harta ? 'Harta căutărilor tale nu are încă nicio căutare de urmărit.' : 'Harta căutărilor tale nu e încă aprobată. Până atunci vezi aici doar totalul din Google.'}</p>`;
  return `<table class="seo-t"><thead><tr><th>Căutarea</th><th class="n">Poziția medie</th><th class="n ascuns-mic">Afișări</th><th class="n">Clicuri</th></tr></thead><tbody>
    ${lista.map((x) => { const are = eNumar(x.pozitie); const m = miscarePozitie(x.pozitie, x.pozitie_inainte);
      const forme = (Array.isArray(x.cum_cauta) ? x.cum_cauta : []).filter((f) => f && faraSemne(f) !== faraSemne(x.cautare)).slice(0, 2);
      return `<tr><td><span class="c">${esc(x.cautare || '')}</span><span class="m">${esc(paginaPeInteles(x.pagina))}${forme.length ? ` · oamenii scriu și: ${forme.map((f) => `„${esc(f)}”`).join(', ')}` : ''}</span></td>
      <td class="n">${are ? `<span class="seo-p">${poz(x.pozitie)}</span>` : '<span class="seo-nu">încă nu apare</span>'}${m ? `<span class="m">${esc(m)}</span>` : ''}</td>
      <td class="n ascuns-mic">${t.are_date ? nr(x.afisari) : '—'}</td><td class="n">${t.are_date ? nr(x.clicuri) : '—'}</td></tr>`; }).join('\n')}
  </tbody></table>`;
}

function paginiHtml(t) {
  const lista = (Array.isArray(t.pagini) ? t.pagini : []).filter((p) => p && (Number(p.vizite) || Number(p.apasari) || Number(p.formulare) || Number(p.clicuri_google)));
  if (!lista.length) return '';
  return `<p class="seo-sub">Ce au făcut oamenii pe fiecare pagină</p>
  <p class="meta">Vizitele și apăsările pe telefon, WhatsApp, email și programare le număr eu pe site, fără cookie-uri. Formularele sunt cele din secțiunea Cererile.</p>
  <table class="seo-t"><thead><tr><th>Pagina</th><th class="n">Vizite</th><th class="n">Apăsări pe contact</th><th class="n">Formulare</th><th class="n ascuns-mic">Clicuri din Google</th></tr></thead><tbody>
    ${lista.map((p) => { const cereri = Number(p.apasari || 0) + Number(p.formulare || 0);
      return `<tr><td><span class="c">${esc(paginaPeInteles(p.pagina))}</span><span class="m">luna trecută, în aceleași zile: ${nr(p.vizite_inainte)} ${Number(p.vizite_inainte) === 1 ? 'vizită' : 'vizite'} și ${nr(p.cereri_inainte)} ${Number(p.cereri_inainte) === 1 ? 'cerere' : 'cereri'}${cereri ? `; acum ${nr(cereri)}` : ''}</span></td>
      <td class="n">${nr(p.vizite)}</td><td class="n">${nr(p.apasari)}</td><td class="n">${nr(p.formulare)}</td><td class="n ascuns-mic">${nr(p.clicuri_google)}</td></tr>`; }).join('\n')}
  </tbody></table>`;
}

function fisaGoogleHtml(f) {
  const stare = String((f && f.stare) || 'necerut'); const la = dataRo(f && f.cerut_la);
  const text = stare === 'aprobat' ? 'Google mi-a dat acces la cifrele fișei tale. Le aduc aici: căutările pe care apare fișa, apelurile și cererile de traseu.'
    : stare === 'cerut' ? `Cifrele fișei tale Google (căutările pe care apare, apelurile, cererile de traseu) vin aici după ce Google îmi aprobă accesul la ele.${la ? ` Am cerut accesul pe ${la}.` : ''} Până atunci, le vezi în aplicația Google Business Profile.`
      : 'Cifrele fișei tale Google (căutările pe care apare, apelurile, cererile de traseu) vin aici după ce Google îmi dă acces la ele. Până atunci, le vezi în aplicația Google Business Profile.';
  return `<p class="seo-sub">Fișa ta Google</p><p class="nota">${esc(text)}</p>`;
}

/**
 * seoHtml(t) → secțiunea „Tabloul SEO” (cu stilul ei) sau '' când Search Console nu e legat pentru client.
 *  t: răspunsul RPC-ului tablou_seo { activ, acces, proprietate, are_date, perioada, are_harta, cautari, total, pagini, surse, fisa_google }
 */
export function seoHtml(t) {
  if (!t || !t.activ) return '';
  const P = t.perioada || {}; const per = perioadaRo(P.de, P.pana); const perInainte = perioadaRo(P.de_inainte, P.pana_inainte);
  const site = String(t.proprietate || '').replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const T = t.total || {};
  const surse = (Array.isArray(t.surse) ? t.surse : []).filter((s) => s && s.sursa && Number(s.n) > 0).slice(0, 6);
  const expira = t.acces === 'expira';
  const titlu = !t.are_date ? 'Google încă adună primele cifre.' : 'Unde apari în Google, pe căutările tale.';
  const lead = !t.are_date
    ? `Am legat Google Search Console pentru ${esc(site || 'site-ul tău')}. Primele cifre apar la două-trei zile după legare, pentru că Google le dă cu întârziere. Mai jos sunt căutările pe care le urmăresc.`
    : `Cifrele vin din Google Search Console, pentru ${esc(site || 'site-ul tău')}, din ${esc(per)}. Google le dă cu două-trei zile întârziere. Poziția e o medie: diferă de la un om la altul, după locul în care se află și după ce a mai căutat.`;
  return `<section id="seo"><div class="wrap">
  <style>${CSS_SEO}</style>
  <p class="eyebrow">Tabloul SEO</p>
  <h2 class="h2">${titlu}</h2>
  <p class="lead">${lead}</p>
  ${expira ? '<p class="nota">Google nu mă mai lasă să citesc cifrele site-ului tău. De obicei înseamnă că accesul meu din Search Console a fost scos. Scrie-mi la Mesaje și îl punem la loc împreună.</p>' : ''}
  ${t.are_date ? `<div class="seo-tot"><div><b>${nr(T.clicuri)}</b>${Number(T.clicuri) === 1 ? 'clic' : 'clicuri'} din Google</div><div><b>${nr(T.afisari)}</b>${Number(T.afisari) === 1 ? 'afișare' : 'afișări'} în căutări</div>${perInainte ? `<div><b>${nr(T.clicuri_inainte)}</b>${Number(T.clicuri_inainte) === 1 ? 'clic' : 'clicuri'} în ${esc(perInainte)}</div>` : ''}</div>` : ''}
  ${cautariHtml(t)}
  ${t.are_date ? paginiHtml(t) : ''}
  ${t.are_date && surse.length ? `<p class="seo-sub">De unde au venit cererile din formular</p>${surse.map((s) => `<div class="rand"><span>${esc(s.sursa)}</span><span class="m">${nr(s.n)} ${Number(s.n) === 1 ? 'cerere' : 'cereri'}</span></div>`).join('')}` : ''}
  ${fisaGoogleHtml(t.fisa_google)}
</div></section>`;
}
