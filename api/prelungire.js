// POST /api/prelungire → RPC prelungeste_mostra (doar cu fraza exactă) → webhook n8n (te anunță).
// G20: cere antetul X-Alesign-Mostra: prelungire și Content-Type: application/json. Un formular de pe alt site nu poate trimite antete proprii fără verificare CORS (preflight), deci nu poate prelungi o mostră în numele altcuiva.
const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const WEBHOOK = process.env.N8N_WEBHOOK_CERERE || 'https://alesignco.app.n8n.cloud/webhook/cereri';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (req.headers['x-alesign-mostra'] !== 'prelungire' || !/^application\/json/i.test(String(req.headers['content-type'] || ''))) { res.status(403).json({ ok: false, motiv: 'antet lipsă' }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const slug = String(b.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
    const r = await fetch(`${URL_SB}/rest/v1/rpc/prelungeste_mostra`, {
      method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug, p_mesaj: String(b.mesaj || '') }),
    });
    if (!r.ok) { res.status(400).json({ ok: false, motiv: (await r.text()).slice(0, 200) }); return; }
    const out = await r.json();
    const pana_pe = new Date(out.mostra_expira).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' });
    if (WEBHOOK) await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tip: 'prelungire', lead_id: out.lead_id, firma: out.firma, slug, pana_pe }) }).catch(() => {});
    res.status(200).json({ ok: true, pana_pe });
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message || e).slice(0, 200) }); }
}
