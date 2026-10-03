// POST /api/spatiu-mesaj {token, text} → RPC spatiu_mesaj (limită 20/oră în bază) → webhook n8n „Livrare · evenimente” (Alex primește mesajul pe loc).
const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const WEBHOOK = process.env.N8N_WEBHOOK_LIVRARE || 'https://alesignco.app.n8n.cloud/webhook/livrare';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  try {
    let b;
    try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { res.status(400).json({ ok: false, motiv: 'date invalide' }); return; }
    const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
    const text = String(b.text || '').trim().slice(0, 2000);
    if (token.length < 16 || text.length < 2) { res.status(400).json({ ok: false, motiv: 'date lipsa' }); return; }
    const r = await fetch(`${URL_SB}/rest/v1/rpc/spatiu_mesaj`, {
      method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token, p_text: text }),
    });
    if (!r.ok) { const t = (await r.text()).toLowerCase(); res.status(400).json({ ok: false, motiv: t.includes('prea multe') ? 'prea multe mesaje' : 'nu am putut salva' }); return; }
    const out = await r.json();
    if (WEBHOOK) {
      await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tip: 'mesaj_client', lead_id: out.lead_id, text }) }).catch(() => {});
    }
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, motiv: 'eroare' }); }
}
