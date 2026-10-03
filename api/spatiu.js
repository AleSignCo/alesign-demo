// Vercel serverless: /s/<token> → RPC spatiu_date → spațiul clientului (aprobări, calendar, materiale, contracte, mesaje). Fără login: tokenul e cheia.
import { randeazaSpatiu, spatiuInchis } from '../lib/spatiu.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  const token = String(req.query.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!token || token.length < 16) { res.status(404).send(spatiuInchis()); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc variabilele SUPABASE_URL / SUPABASE_KEY.</p>'); return; }
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/spatiu_date`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: token }) });
    if (!r.ok) { res.status(404).send(spatiuInchis()); return; }
    const d = await r.json();
    if (!d || !d.firma) { res.status(404).send(spatiuInchis()); return; }
    res.status(200).send(randeazaSpatiu(d, token));
  } catch (e) { res.status(500).send(spatiuInchis()); }
}
