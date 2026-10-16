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

    // G10 (SQL 78): după publicare, demo-ul trimite 301 spre domeniul clientului
    try {
      const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 1500);
      const rl = await fetch(`${URL_SB}/rest/v1/rpc/demo_site_live`, { method: 'POST', signal: ac.signal, headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }) });
      clearTimeout(t);
      const live = rl.ok ? await rl.json() : null;
      if (typeof live === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(live)) { res.statusCode = 301; res.setHeader('Location', `https://${live}/`); res.setHeader('Cache-Control', 'public, max-age=3600'); res.end(); return; }
    } catch (e) { /* fără răspuns: demo-ul rămâne, ca până acum */ }

    // vizualizare (best effort, nu blochează pagina)
    fetch(`${URL_SB}/rest/v1/rpc/vizualizare_demo`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }) }).catch(() => {});

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.status(200).send(randeaza(site, { host: req.headers.host }));
  } catch (e) {
    res.status(500).send(`<p style="font-family:sans-serif">Eroare: ${String(e.message || e).replace(/</g, '&lt;')}</p>`);
  }
}
