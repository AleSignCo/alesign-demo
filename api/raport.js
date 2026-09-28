// /r/<slug> → RPC raport_date → raportul lunar al clientului (pagină privată, noindex).
import { randeazaRaport, raportIndisponibil } from '../lib/raport.js';
import { rpc, slugCurat, URL_SB, KEY_SB, H } from '../lib/sb.js';

export default async function handler(req, res) {
  const slug = slugCurat(req.query.slug);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  if (!slug || slug.length < 16) { res.status(404).send(raportIndisponibil()); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc variabilele SUPABASE_URL / SUPABASE_KEY.</p>'); return; }
  try {
    const d = await rpc('raport_date', { p_slug: slug });
    if (!d || !d.id) { res.status(404).send(raportIndisponibil()); return; }
    fetch(`${URL_SB}/rest/v1/rpc/raport_vizualizare`, { method: 'POST', headers: H(), body: JSON.stringify({ p_slug: slug }) }).catch(() => {});
    res.status(200).send(randeazaRaport(d));
  } catch (e) {
    res.status(500).send(raportIndisponibil());
  }
}
