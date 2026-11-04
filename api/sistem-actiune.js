// POST /api/sistem-actiune (formular sau JSON): actiune=rezerva → sistem_fondator_rezerva → pagina contractului (/c/<slug>); actiune=cerere → sistem_cerere → mulțumire.
import { paginaMultumesc } from '../lib/sistem.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SERV = process.env.SUPABASE_SERVICE_KEY;
const HS = () => ({ apikey: KEY_SERV, Authorization: `Bearer ${KEY_SERV}`, 'Content-Type': 'application/json' });
const COD = ['prezenta', 'crestere', 'dominare', 'complete', 'lansare', 'relansare', 'an_crestere'];

function campuri(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  const s = typeof b === 'string' ? b : '';
  try { return JSON.parse(s); } catch { return Object.fromEntries(new URLSearchParams(s)); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!URL_SB || !KEY_SERV) { res.status(500).send(paginaMultumesc('Nu merge acum', 'Lipsesc SUPABASE_URL / SUPABASE_SERVICE_KEY.', '')); return; }
  const b = campuri(req);
  const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const actiune = String(b.actiune || '');
  if (!token || token.length < 16) { res.status(400).send(paginaMultumesc('Link necunoscut', 'Deschide din nou linkul din email.', '')); return; }
  const inapoi = `/sistem/${token}`;
  try {
    if (actiune === 'rezerva') {
      const q = await fetch(`${URL_SB}/rest/v1/rpc/sistem_fondator_rezerva`, { method: 'POST', headers: HS(), body: JSON.stringify({ p_token: token }) });
      const t = await q.text();
      if (!q.ok) { let m = t; try { m = JSON.parse(t).message || t; } catch {} res.status(400).send(paginaMultumesc('Nu am putut rezerva', String(m).slice(0, 300), inapoi)); return; }
      const o = JSON.parse(t || '{}');
      if (o && o.ok && o.slug) { res.writeHead(302, { Location: `/c/${o.slug}` }); res.end(); return; }
      res.writeHead(302, { Location: `${inapoi}?m=${encodeURIComponent('Locurile de Fondator s-au ocupat. Rămâi pe lista SISTEM, cu prețurile de mai jos.')}` }); res.end(); return;
    }
    if (actiune === 'cerere') {
      const cod = String(b.cod || '');
      if (!COD.includes(cod)) { res.status(400).send(paginaMultumesc('Pachet necunoscut', 'Alege un pachet din listă.', inapoi)); return; }
      const anual = b.anual === '1' || b.anual === true || b.anual === 'true';
      const q = await fetch(`${URL_SB}/rest/v1/rpc/sistem_cerere`, { method: 'POST', headers: HS(), body: JSON.stringify({ p_token: token, p_cod: cod, p_anual: anual, p_mesaj: String(b.mesaj || '').slice(0, 2000) || null }) });
      const t = await q.text();
      if (!q.ok) { let m = t; try { m = JSON.parse(t).message || t; } catch {} res.status(400).send(paginaMultumesc('Nu a mers', String(m).slice(0, 300), inapoi)); return; }
      const o = JSON.parse(t || '{}');
      if (o && o.lista_asteptare) { res.status(200).send(paginaMultumesc('Ești pe lista de așteptare', o.mesaj || 'Locurile lunii s-au ocupat. Revenim când se eliberează un loc.', inapoi)); return; }
      res.status(200).send(paginaMultumesc('Am primit', 'Alexandru îți trimite contractul pe email, cu prețul din oferta ta. Nimic nu se plătește până nu semnezi.', inapoi)); return;
    }
    res.status(400).send(paginaMultumesc('Acțiune necunoscută', '', inapoi));
  } catch (e) { res.status(500).send(paginaMultumesc('Nu merge acum', 'Încearcă din nou peste un minut.', inapoi)); }
}
