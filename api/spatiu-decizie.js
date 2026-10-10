// POST /api/spatiu-decizie {token, id|null, decizie:'aprob'|'modificare', motiv} → RPC spatiu_decizie → webhook n8n „Livrare · evenimente” (Alex află pe loc).
const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const WEBHOOK = process.env.N8N_WEBHOOK_LIVRARE || 'https://alesignco.app.n8n.cloud/webhook/livrare';
const SECRET = process.env.N8N_WEBHOOK_SECRET || '';
const HW = () => ({ 'Content-Type': 'application/json', ...(SECRET ? { 'x-alesign-secret': SECRET } : {}) }); // antetul secret al webhook-urilor n8n (pasul 7)

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  try {
    let b;
    try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { res.status(400).json({ ok: false, motiv: 'date invalide' }); return; }
    const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
    const decizie = b.decizie === 'modificare' ? 'modificare' : b.decizie === 'aprob' ? 'aprob' : null;
    const id = b.id == null ? null : parseInt(b.id, 10);
    const motiv = String(b.motiv || '').trim().slice(0, 1000);
    if (token.length < 16 || !decizie || (id !== null && !(id > 0))) { res.status(400).json({ ok: false, motiv: 'date lipsa' }); return; }
    if (decizie === 'modificare' && (id === null || motiv.length < 3)) { res.status(400).json({ ok: false, motiv: 'spune-mi ce schimbam' }); return; }
    const r = await fetch(`${URL_SB}/rest/v1/rpc/spatiu_decizie`, {
      method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token, p_sarcina_id: id, p_decizie: decizie, p_motiv: decizie === 'modificare' ? motiv : null }),
    });
    if (!r.ok) { res.status(400).json({ ok: false, motiv: 'nu am putut salva' }); return; }
    const out = await r.json();
    if (WEBHOOK) {
      await fetch(WEBHOOK, { method: 'POST', headers: HW(), body: JSON.stringify({ tip: decizie === 'aprob' ? 'client_aprobat' : 'client_modificare', lead_id: out.lead_id, sarcina_id: id, n: out.n, motiv: decizie === 'modificare' ? motiv : '' }) }).catch(() => {});
    }
    res.status(200).json({ ok: true, n: out.n });
  } catch (e) { res.status(500).json({ ok: false, motiv: 'eroare' }); }
}
