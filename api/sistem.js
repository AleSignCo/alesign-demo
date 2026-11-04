// GET /sistem/<token> → RPC sistem_oferta_date → pagina linkului personal (oferta lui, prețurile lui, rezervarea de Fondator, alegerea unui pachet).
// GET /sistem?r=<cod> → trimite spre formularul Tally cu recomandat_de=<cod> (linkul de recomandare al unui client).
import { randeazaSistem, paginaInchisa } from '../lib/sistem.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SERV = process.env.SUPABASE_SERVICE_KEY;
const HS = () => ({ apikey: KEY_SERV, Authorization: `Bearer ${KEY_SERV}`, 'Content-Type': 'application/json' });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!URL_SB || !KEY_SERV) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc SUPABASE_URL / SUPABASE_SERVICE_KEY.</p>'); return; }
  const r = String(req.query.r || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (r) {
    let tally = process.env.SISTEM_TALLY_URL || '';
    if (!tally) { try { const q = await fetch(`${URL_SB}/rest/v1/setari?cheie=eq.sistem_tally_url&select=valoare`, { headers: HS() }); const j = await q.json(); tally = (j[0] && j[0].valoare) || ''; } catch { /* fără Tally: 404 */ } }
    if (!tally) { res.status(404).send(paginaInchisa()); return; }
    const u = new URL(tally); u.searchParams.set('recomandat_de', r); u.searchParams.set('sursa', 'recomandare');
    res.writeHead(302, { Location: u.toString() }); res.end(); return;
  }
  const token = String(req.query.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!token || token.length < 16) { res.status(404).send(paginaInchisa()); return; }
  try {
    const q = await fetch(`${URL_SB}/rest/v1/rpc/sistem_oferta_date`, { method: 'POST', headers: HS(), body: JSON.stringify({ p_token: token }) });
    if (!q.ok) { res.status(404).send(paginaInchisa()); return; }
    const d = await q.json();
    if (!d || !d.lead_id) { res.status(404).send(paginaInchisa()); return; }
    res.status(200).send(randeazaSistem(d, { token, mesaj: String(req.query.m || '').slice(0, 300) }));
  } catch { res.status(500).send(paginaInchisa()); }
}
