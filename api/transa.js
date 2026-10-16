// /t/<token> (v5.1, SQL 57): pagina de plată a unei tranșe. GET → suma, termenul, cardul (Stripe) sau transferul (IBAN-ul AleSign).
// POST → sesiunea Stripe a tranșei. La întoarcere (?session_id=…), sesiunea se verifică pe server și abia apoi tranșa e marcată plătită.
// Tokenul e cheia (32 de caractere, o tranșă); pagina nu arată nimic altceva din contract.
import { sesiuneTransa, verificaSesiuneTransa, stripeConfigurat } from '../lib/stripe.js';
const SB = process.env.SUPABASE_URL; const ANON = process.env.SUPABASE_KEY; const SERV = process.env.SUPABASE_SERVICE_KEY;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }) : '');
const rpc = async (nume, corp, cheie = ANON) => { const r = await fetch(`${SB}/rest/v1/rpc/${nume}`, { method: 'POST', headers: { apikey: cheie, Authorization: `Bearer ${cheie}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corp) }); return r.ok ? r.json() : null; };

export function paginaTransa(t, { mesaj = '', ok = false } = {}) {
  const cuTva = Math.round(Number(t.suma) * (1 + Number(t.tva_procent || 0) / 100) * 100) / 100;
  const p = t.prestator || {};
  const platita = t.stare === 'platita';
  const card = !platita && String(t.stripe_activ) === 'true' && (!Array.isArray(t.plata_moduri) || t.plata_moduri.includes('card'));
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Tranșa ${esc(t.nr)} din ${esc(t.din)} · ${esc(t.firma || '')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>:root{--bg:#f5f2ec;--text:#141414;--muted:#6b675f;--line:#e2ddd3;--surface:#fbf9f5;--ink:#0c0c0d;--ok:#1f7a4d}*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--text);font-family:Manrope,system-ui,sans-serif;line-height:1.6;padding:40px 16px}
main{max-width:560px;margin:0 auto}.eye{font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:var(--muted)}h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(30px,6vw,42px);line-height:1.1;margin:10px 0 14px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px;margin-top:16px}.suma{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;line-height:1}.m{color:var(--muted);font-size:14px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border-radius:999px;background:var(--ink);color:#f4f1ea;font:inherit;font-weight:600;border:0;cursor:pointer;margin-top:14px}
.ok{color:var(--ok);font-weight:600}.rand{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:14.5px}.rand:first-of-type{border-top:0}</style></head>
<body><main><p class="eye">Contract ${esc(t.contract)}</p><h1>Tranșa ${esc(t.nr)} din ${esc(t.din)}</h1>
${mesaj ? `<p class="${ok ? 'ok' : 'm'}" role="status">${esc(mesaj)}</p>` : ''}
<div class="card"><p class="suma">${nr(cuTva)} RON</p><p class="m">${Number(t.tva_procent) > 0 ? `${nr(t.suma)} RON + TVA ${esc(t.tva_procent)}% · ` : ''}${esc(t.cand || '')}</p>
${platita ? `<p class="ok" style="margin-top:12px">Plătită${t.platita_la ? ` pe ${esc(dataRo(t.platita_la))}` : ''}. Mulțumesc!</p>` : `<p class="m" style="margin-top:8px">${t.scadenta ? `Termen de plată: ${esc(dataRo(t.scadenta))}.` : ''}</p>`}
${card ? `<form method="post"><button class="btn" type="submit">Plătește cu cardul</button></form>` : ''}</div>
${platita ? '' : `<div class="card"><p style="font-weight:600">Sau prin transfer bancar</p>
<div class="rand"><span class="m">Beneficiar</span><span>${esc(p.denumire || 'AleSign&Co')}</span></div>
${p.cui ? `<div class="rand"><span class="m">CUI</span><span>${esc(p.cui)}</span></div>` : ''}
${p.iban ? `<div class="rand"><span class="m">IBAN</span><span>${esc(p.iban)}${p.banca ? ` · ${esc(p.banca)}` : ''}</span></div>` : ''}
<div class="rand"><span class="m">Detalii plată</span><span>${esc(t.contract)} · tranșa ${esc(t.nr)}</span></div>
<p class="m" style="margin-top:8px">Confirm plata în aceeași zi lucrătoare în care ajunge în cont.</p></div>`}
<p class="m" style="margin-top:22px">Întrebări? <a href="mailto:info@alesign.net" style="color:inherit;font-weight:600">info@alesign.net</a> · Alexandru, AleSign&amp;Co</p></main></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Referrer-Policy', 'no-referrer');
  const token = String((req.query && req.query.token) || '').toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 64);
  const html = (cod, h) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(cod).send(h); };
  if (token.length !== 32 || !SB || !ANON) { html(404, '<!doctype html><p style="font-family:sans-serif;padding:40px">Linkul nu e valabil. Scrie-mi la info@alesign.net.</p>'); return; }
  try {
    let t = await rpc('transa_pentru_plata', { p_token: token });
    if (!t || !t.id) { html(404, '<!doctype html><p style="font-family:sans-serif;padding:40px">Linkul nu e valabil. Scrie-mi la info@alesign.net.</p>'); return; }
    t.token = token;
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'demo.alesign.net').split(',')[0].trim();
    if (req.method === 'POST') {
      if (t.stare !== 'ceruta' || !stripeConfigurat()) { html(200, paginaTransa(t, { mesaj: t.stare === 'platita' ? 'Tranșa e deja plătită.' : 'Plata cu cardul nu e pornită. Folosește transferul de mai jos.' })); return; }
      const s = await sesiuneTransa(t, { host });
      res.setHeader('Location', s.url); res.status(303).send(''); return;
    }
    const sid = String((req.query && req.query.session_id) || '');
    if (sid && t.stare === 'ceruta' && SERV) {
      const v = await verificaSesiuneTransa(sid, t);
      if (v.ok) { await rpc('transa_platita', { p_transa_id: t.id, p_mod: 'card', p_ref: v.ref, p_session: sid }, SERV); t = { ...t, stare: 'platita', platita_la: new Date().toISOString() }; html(200, paginaTransa(t, { mesaj: 'Plata a intrat. Mulțumesc!', ok: true })); return; }
      html(200, paginaTransa(t, { mesaj: 'Nu văd încă plata confirmată. Dacă ai plătit, reîncarcă pagina peste un minut.' })); return;
    }
    html(200, paginaTransa(t, { mesaj: req.query && req.query.anulat ? 'Plata a fost anulată. Poți încerca din nou oricând.' : '' }));
  } catch (e) { html(500, '<!doctype html><p style="font-family:sans-serif;padding:40px">A apărut o problemă. Încearcă din nou peste câteva minute.</p>'); }
}
