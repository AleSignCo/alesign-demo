// POST /api/retragere {slug, nume, email, confirm: true} → funcția de retragere a consumatorului (OUG 34/2014; Directiva (UE) 2023/2673).
// RPC contract_retragere: doar persoană fizică, doar în cele 14 zile; confirmarea pleacă pe email (Livrare, „contract_retras”).
import { rpc, slugCurat, ipDin, bodyDin } from '../lib/sb.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  try {
    const b = bodyDin(req);
    const slug = slugCurat(b.slug);
    const nume = String(b.nume || '').trim().slice(0, 120);
    const email = String(b.email || '').trim().slice(0, 160);
    if (!slug || b.confirm !== true || nume.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { res.status(400).json({ ok: false, motiv: 'date lipsa' }); return; }
    try {
      const out = await rpc('contract_retragere', { p_slug: slug, p_nume: nume, p_email: email, p_ip: ipDin(req), p_ua: String(req.headers['user-agent'] || '').slice(0, 300) });
      res.status(200).json({ ok: true, numar: out.numar, retras_la: out.retras_la, deja: !!out.deja });
    } catch (e) { res.status(400).json({ ok: false, motiv: e.motiv || 'nu se poate' }); }
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message || e).slice(0, 200) }); }
}
