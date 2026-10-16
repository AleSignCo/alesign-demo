// /care/<token> (SQL 68, G4): Care din luna 4. Contractul: Care pornește automat din luna 4, pe factură lunară; pagina arată ce include, suma, data și alegerile:
// cardul (abonament Stripe, prima plată la începutul lunii 4), factura lunară (implicit) sau „Nu continui” (preaviz de 30 de zile, exportul și mutarea asistată). Tokenul (32) e cheia.
import { sesiuneCare, verificaSesiuneCare, stripeConfigurat } from '../lib/stripe.js';
const SB = process.env.SUPABASE_URL; const ANON = process.env.SUPABASE_KEY; const SERV = process.env.SUPABASE_SERVICE_KEY;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { maximumFractionDigits: 2 });
const dataRo = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }) : '');
const rpc = async (nume, corp, cheie = ANON) => { const r = await fetch(`${SB}/rest/v1/rpc/${nume}`, { method: 'POST', headers: { apikey: cheie, Authorization: `Bearer ${cheie}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corp) }); return r.ok ? r.json() : null; };

export function paginaCare(c, { mesaj = '', ok = false } = {}) {
  const cuTva = Math.round(Number(c.suma) * (1 + Number(c.tva_procent || 0) / 100) * 100) / 100;
  const p = c.prestator || {}; const activ = c.stare === 'activ'; const refuzat = c.stare === 'refuzat';
  const card = !activ && String(c.stripe_activ) === 'true' && (!Array.isArray(c.plata_moduri) || c.plata_moduri.includes('card'));
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Care pentru site · ${esc(c.firma || '')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>:root{--bg:#f5f2ec;--text:#141414;--muted:#6b675f;--line:#e2ddd3;--surface:#fbf9f5;--ink:#0c0c0d;--ok:#1f7a4d}*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--text);font-family:Manrope,system-ui,sans-serif;line-height:1.6;padding:40px 16px}
main{max-width:560px;margin:0 auto}.eye{font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:var(--muted)}h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(30px,6vw,42px);line-height:1.1;margin:10px 0 14px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px;margin-top:16px}.suma{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;line-height:1}.m{color:var(--muted);font-size:14px}
ul{padding-left:18px;margin:10px 0}li{margin:3px 0}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border-radius:999px;background:var(--ink);color:#f4f1ea;font:inherit;font-weight:600;border:0;cursor:pointer;margin-top:14px}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}.ok{color:var(--ok);font-weight:600}.rand{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:14.5px}.rand:first-of-type{border-top:0}</style></head>
<body><main><p class="eye">Contract ${esc(c.contract)}</p><h1>Care pentru site-ul tău, din luna 4</h1>
${mesaj ? `<p class="${ok ? 'ok' : 'm'}" role="status">${esc(mesaj)}</p>` : ''}
<div class="card"><p class="suma">${nr(cuTva)} RON <span class="m">/ lună</span></p><p class="m">${Number(c.tva_procent) > 0 ? `${nr(c.suma)} RON + TVA ${esc(c.tva_procent)}% · ` : ''}de la ${esc(dataRo(c.de_la))}</p>
<ul><li>găzduirea, certificatul și domeniul legat</li><li>monitorizarea la 5 minute și revenirea automată dacă ceva cade</li><li>arhiva fiecărei versiuni și actualizările tehnice</li><li>faptele le schimbi tu, oricând, din spațiul tău</li></ul>
${activ ? `<p class="ok">Care e activ${c.mod === 'card' ? ', cu cardul' : ', pe factură lunară (transfer)'}. Mulțumesc!</p>` : refuzat ? `<p class="m">Ai ales să nu continui. Site-ul rămâne online până pe ${esc(dataRo(c.oprire_la))}; îți trimit exportul și te ajut să-l muți. Dacă te răzgândești, alege mai jos.</p>` : ''}
${!activ && !refuzat ? `<p class="m" style="margin-top:10px">Cum scrie în contract: din ${esc(dataRo(c.de_la))}, Care continuă automat, pe factură lunară. Dacă preferi cardul, îl alegi aici.</p>` : ''}
${card || (activ && c.mod === 'transfer' && String(c.stripe_activ) === 'true') ? `<form method="post"><input type="hidden" name="alegere" value="card"><button class="btn" type="submit">${activ ? 'Trec pe card' : 'Plătesc cu cardul'}</button></form><p class="m" style="margin-top:6px">Prima plată: ${esc(dataRo(c.de_la))}, apoi lunar. Renunți oricând, cu 30 de zile de preaviz.</p>` : ''}</div>
${activ ? '' : `<div class="card"><p style="font-weight:600">Pe factură lunară, prin transfer</p>
<div class="rand"><span class="m">Beneficiar</span><span>${esc(p.denumire || 'AleSign&Co')}</span></div>${p.iban ? `<div class="rand"><span class="m">IBAN</span><span>${esc(p.iban)}${p.banca ? ` · ${esc(p.banca)}` : ''}</span></div>` : ''}
<form method="post"><input type="hidden" name="alegere" value="transfer"><button class="btn ghost" type="submit">${refuzat ? 'M-am răzgândit: continui' : 'Confirm factura lunară'}</button></form></div>
${refuzat ? '' : `<div class="card"><p style="font-weight:600">Nu continui</p><p class="m">Site-ul rămâne online încă 30 de zile de la alegere (cel puțin până pe ${esc(dataRo(c.de_la))}). Primești exportul complet și te ajut să-l muți unde vrei.</p>
<form method="post" onsubmit="return confirm('Sigur nu continui cu Care? Site-ul se oprește după 30 de zile.')"><input type="hidden" name="alegere" value="refuz"><button class="btn ghost" type="submit">Nu continui</button></form></div>`}`}
<p class="m" style="margin-top:22px">Întrebări? <a href="mailto:info@alesign.net" style="color:inherit;font-weight:600">info@alesign.net</a> · Alexandru, AleSign&amp;Co</p></main></body></html>`;
}

const corp = (req) => { const b = req.body; if (b && typeof b === 'object') return b; return Object.fromEntries(new URLSearchParams(String(b || ''))); };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Referrer-Policy', 'no-referrer');
  const token = String((req.query && req.query.token) || '').toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 64);
  const html = (cod, h) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(cod).send(h); };
  const nevalabil = '<!doctype html><p style="font-family:sans-serif;padding:40px">Linkul nu e valabil. Scrie-mi la info@alesign.net.</p>';
  if (token.length !== 32 || !SB || !ANON) { html(404, nevalabil); return; }
  try {
    let c = await rpc('care_pentru_plata', { p_token: token });
    if (!c || !c.id) { html(404, nevalabil); return; }
    c.token = token;
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'demo.alesign.net').split(',')[0].trim();
    if (req.method === 'POST') {
      const a = String(corp(req).alegere || '');
      if (a === 'card') {
        if ((c.stare === 'activ' && c.mod === 'card') || !stripeConfigurat()) { html(200, paginaCare(c, { mesaj: c.stare === 'activ' ? 'Care e deja activ.' : 'Plata cu cardul nu e pornită. Alege transferul.' })); return; }
        const s = await sesiuneCare(c, { host }); res.setHeader('Location', s.url); res.status(303).send(''); return;
      }
      if (a === 'transfer') { const r = await rpc('care_luna4_activ', { p_token: token, p_mod: 'transfer', p_ref: null }); c = { ...c, ...(r && r.ok ? { stare: 'activ', mod: 'transfer' } : {}) }; html(200, paginaCare(c, r && r.ok ? { mesaj: 'Gata: Care continuă. Factura vine lunar pe email, cu termen de 5 zile.', ok: true } : { mesaj: 'Nu s-a putut salva. Scrie-mi la info@alesign.net.' })); return; }
      if (a === 'refuz') { const r = await rpc('care_luna4_refuz', { p_token: token }); c = { ...c, ...(r && r.ok ? { stare: 'refuzat', oprire_la: r.oprire_la } : {}) }; html(200, paginaCare(c, r && r.ok ? { mesaj: 'Am notat. Îți scriu în curând pentru export și mutare.' } : { mesaj: 'Abonamentul cu cardul se oprește dintr-un mesaj către mine.' })); return; }
      html(400, paginaCare(c)); return;
    }
    const sid = String((req.query && req.query.session_id) || '');
    if (sid && c.stare !== 'activ' && SERV) {
      const v = await verificaSesiuneCare(sid, c);
      if (v.ok) { await rpc('care_luna4_activ', { p_token: token, p_mod: 'card', p_ref: v.ref }, SERV); c = { ...c, stare: 'activ', mod: 'card' }; html(200, paginaCare(c, { mesaj: 'Gata: Care continuă cu cardul. Mulțumesc!', ok: true })); return; }
      html(200, paginaCare(c, { mesaj: 'Nu văd încă abonamentul confirmat. Reîncarcă pagina peste un minut.' })); return;
    }
    html(200, paginaCare(c, { mesaj: req.query && req.query.anulat ? 'Nu s-a pornit nimic. Poți alege din nou oricând.' : '' }));
  } catch (e) { html(500, '<!doctype html><p style="font-family:sans-serif;padding:40px">A apărut o problemă. Încearcă din nou peste câteva minute.</p>'); }
}
