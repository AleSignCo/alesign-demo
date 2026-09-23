// Vercel serverless: /<slug> → citește rândul din `siteuri` (Supabase, cheie publishable + RLS) → HTML.
import { randeaza, paginaExpirata } from '../lib/template.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!slug) { res.status(404).send(paginaExpirata({})); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc variabilele SUPABASE_URL / SUPABASE_KEY.</p>'); return; }

  try {
    const r = await fetch(`${URL_SB}/rest/v1/siteuri?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`, {
      headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}` },
    });
    const rows = r.ok ? await r.json() : [];
    const site = rows[0];
    if (!site || (site.expira_la && new Date(site.expira_la) < new Date())) { res.status(404).send(paginaExpirata({ firma: site?.firma })); return; }

    // vizualizare (best effort, nu blochează pagina)
    fetch(`${URL_SB}/rest/v1/rpc/vizualizare_demo`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }) }).catch(() => {});

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.status(200).send(randeaza(site, { host: req.headers.host }));
  } catch (e) {
    res.status(500).send(`<p style="font-family:sans-serif">Eroare: ${String(e.message || e).replace(/</g, '&lt;')}</p>`);
  }
}
