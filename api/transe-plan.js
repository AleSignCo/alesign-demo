// POST /api/transe-plan {contract_id, slug} (v5.1, SQL 57): planul tranșelor unui contract, calculat de contract (transeDin) și fixat în bază o singură dată.
// Chemat de baza de date (pingul „transe”, la semnare și la plată, cu antetul secret din Vault) și, direct, de sesiunea de plată (lib/stripe.js).
import { fixeazaPlan } from '../lib/stripe.js';
const SB = process.env.SUPABASE_URL; const SERV = process.env.SUPABASE_SERVICE_KEY; const SECRET = process.env.N8N_WEBHOOK_SECRET || '';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!SECRET || req.headers['x-alesign-secret'] !== SECRET) { res.status(403).json({ ok: false }); return; }
  if (!SB || !SERV) { res.status(500).json({ ok: false, motiv: 'lipsește SUPABASE_SERVICE_KEY' }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const slug = String(b.slug || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
    if (!slug) { res.status(400).json({ ok: false, motiv: 'slug lipsă' }); return; }
    const r = await fetch(`${SB}/rest/v1/rpc/contract_date`, { method: 'POST', headers: { apikey: SERV, Authorization: `Bearer ${SERV}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }) });
    const d = r.ok ? await r.json() : null;
    if (!d || !d.id || (b.contract_id && Number(b.contract_id) !== Number(d.id))) { res.status(404).json({ ok: false, motiv: 'contract inexistent' }); return; }
    res.status(200).json(await fixeazaPlan(d));
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message).slice(0, 200) }); }
}
