// /e/<slug> (v5.1, Poarta E): „raportul de la 30 de zile” al site-ului, pentru client. Cifrele vin din măsurarea fără cookie și din cererile formularului;
// „înainte” vine din Auditul de dinainte (dacă a existat). Recomandarea de abonament e aleasă de Alexandru. Fără nimic intern (constatări, costuri).
const SB = process.env.SUPABASE_URL; const ANON = process.env.SUPABASE_KEY;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nr = (v) => Number(v || 0).toLocaleString('ro-RO');
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }) : '');

export function paginaRaport(x) {
  const D = (x.date && x.date.dupa) || {}; const I = (x.date && x.date.inainte) || {};
  const fara = x.date && x.date.fara_date;
  const cifra = (v, et) => `<div class="cf"><b>${fara ? '—' : nr(v)}</b><span>${esc(et)}</span></div>`;
  const pagini = Array.isArray(D.pagini) ? D.pagini : []; const surse = Array.isArray(D.surse) ? D.surse : [];
  const prio = Array.isArray(I.audit_prioritati) ? I.audit_prioritati : [];
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Raportul de la 30 de zile · ${esc(x.firma)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>:root{--bg:#f5f2ec;--text:#141414;--muted:#6b675f;--line:#e2ddd3;--surface:#fbf9f5;--ink:#0c0c0d;--ok:#1f7a4d}*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--text);font-family:Manrope,system-ui,sans-serif;line-height:1.6;padding:40px 16px}
main{max-width:720px;margin:0 auto}.eye{font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:var(--muted)}h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(32px,6vw,46px);line-height:1.1;margin:10px 0 12px}
h2{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;margin:0 0 10px}.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px;margin-top:16px}
.cifre{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px}.cf b{display:block;font-family:'Cormorant Garamond',serif;font-size:38px;line-height:1}.cf span{font-size:12.5px;color:var(--muted)}
.m{color:var(--muted);font-size:14.5px}.rand{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line);font-size:14.5px}.rand:first-of-type{border-top:0}
.btn{display:inline-flex;align-items:center;min-height:48px;padding:12px 22px;border-radius:999px;background:var(--ink);color:#f4f1ea;font-weight:600;text-decoration:none;margin-top:12px}</style></head>
<body><main><p class="eye">Raportul de la 30 de zile</p><h1>${esc(x.firma)}: prima lună a site-ului nou</h1>
<p class="m">De la ${esc(dataRo(D.de))} la ${esc(dataRo(D.pana))}.${fara ? ' Măsurarea n-a primit încă date în această perioadă; cifrele apar „—”, nu inventate.' : ''}</p>
<div class="card"><h2>După</h2><div class="cifre">${cifra(D.vizite, 'vizite')}${cifra(D.vizitatori, 'vizitatori (unici pe zi)')}${cifra(D.cereri, 'cereri din formular')}${cifra(D.telefon, 'clicuri pe telefon')}${cifra(D.whatsapp, 'clicuri pe WhatsApp')}${Number(D.programare) ? cifra(D.programare, 'clicuri pe programare') : ''}</div>
${pagini.length ? `<p class="m" style="margin-top:14px">Paginile cele mai citite</p>${pagini.map((p) => `<div class="rand"><span>${esc(p.cale)}</span><span>${nr(p.vizite)}</span></div>`).join('')}` : ''}
${surse.length ? `<p class="m" style="margin-top:14px">De unde au venit</p>${surse.map((p) => `<div class="rand"><span>${esc(p.ref)}</span><span>${nr(p.vizite)}</span></div>`).join('')}` : ''}</div>
${I.audit_scor != null ? `<div class="card"><h2>Înainte</h2><p>Auditul site-ului vechi${I.audit_la ? ` (${esc(dataRo(I.audit_la))})` : ''}: <b>${esc(String(I.audit_scor))}/10</b>.</p>${prio.length ? prio.slice(0, 3).map((p, i) => `<div class="rand"><span>${i + 1}. ${esc(p.ce || '')}</span><span class="m">rezolvat în site-ul nou</span></div>`).join('') : ''}</div>` : ''}
${x.recomandare ? `<div class="card"><h2>Ce îți recomand acum</h2><p><b>${esc((x.abonament && x.abonament.nume) || x.recomandare)}</b></p>${x.nota ? `<p style="margin-top:8px">${esc(x.nota)}</p>` : ''}${x.token ? `<a class="btn" href="/s/${esc(x.token)}#mesaje">Vorbim despre asta</a>` : ''}</div>` : ''}
<p class="m" style="margin-top:22px">Cifrele vin din măsurarea site-ului, fără cookie-uri și fără date personale, și din cererile primite prin formular. Alexandru, AleSign&amp;Co</p></main></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const slug = String((req.query && req.query.slug) || '').toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 64);
  const nu = () => res.status(404).send('<!doctype html><p style="font-family:sans-serif;padding:40px">Raportul nu e disponibil. Scrie-mi la info@alesign.net.</p>');
  if (slug.length !== 24 || !SB || !ANON) { nu(); return; }
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/raport_site_public`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }) });
    const x = r.ok ? await r.json() : null;
    if (!x || !x.firma) { nu(); return; }
    res.status(200).send(paginaRaport(x));
  } catch (e) { res.status(500).send('<!doctype html><p style="font-family:sans-serif;padding:40px">A apărut o problemă. Încearcă din nou.</p>'); }
}
