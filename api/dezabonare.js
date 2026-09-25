// GET /api/dezabonare?t=<token> → RPC dezabonare → pagină de confirmare. Un click, fără întrebări.
const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pagina = (titlu, text) => `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titlu)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#141414;font-family:Manrope,system-ui,sans-serif;text-align:center;padding:24px}h1{font-family:'Cormorant Garamond',serif;font-size:44px;margin:0 0 12px}p{color:#6b675f;max-width:44ch;margin:0 auto}</style></head>
<body><div><h1>${esc(titlu)}</h1><p>${esc(text)}</p></div></body></html>`;

export default async function handler(req, res) {
  const t = String(req.query.t || '').replace(/[^a-f0-9]/g, '').slice(0, 64);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  if (!t) { res.status(400).send(pagina('Link incomplet', 'Linkul de dezabonare nu e întreg. Scrie-mi la info@alesign.net și rezolv eu.')); return; }
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/dezabonare`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: t }) });
    if (!r.ok) { res.status(404).send(pagina('Link expirat', 'Nu am găsit nimic pentru linkul ăsta. Dacă tot primești mesaje, scrie-mi la info@alesign.net.')); return; }
    const out = await r.json();
    res.status(200).send(pagina('Gata, nu îți mai scriu.', `Nu mai primești mesaje de la mine${out && out.firma ? ` pentru ${out.firma}` : ''}. Mulțumesc că mi-ai spus. Dacă te răzgândești, îmi scrii oricând la info@alesign.net.`));
  } catch (e) { res.status(500).send(pagina('A apărut o eroare', 'Scrie-mi la info@alesign.net și te scot manual, în aceeași zi.')); }
}
