// POST /api/onboarding-salveaza {slug, raspunsuri?, fisier?, pasi_gata?, finalizat?} → RPC onboarding_salveaza (+ webhook n8n la finalizare)
import { rpc, anunta, slugCurat, bodyDin } from '../lib/sb.js';

const curat = (o) => { const out = {}; for (const [k, v] of Object.entries(o || {})) { if (/^[a-z_]{1,40}$/.test(k)) out[k] = String(v ?? '').slice(0, 4000); } return out; };

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  try {
    const b = bodyDin(req);
    const slug = slugCurat(b.slug);
    if (!slug) { res.status(400).json({ ok: false }); return; }
    const fisier = b.fisier && typeof b.fisier === 'object' ? { cale: String(b.fisier.cale || '').slice(0, 300), nume: String(b.fisier.nume || '').slice(0, 200), tip: String(b.fisier.tip || '').slice(0, 80), marime: Number(b.fisier.marime || 0), categorie: b.fisier.categorie === 'logo' ? 'logo' : 'poze', la: new Date().toISOString() } : null;
    if (fisier && !fisier.cale.startsWith(`${slug}/`)) { res.status(400).json({ ok: false, motiv: 'cale invalida' }); return; }
    let out;
    try { out = await rpc('onboarding_salveaza', { p_slug: slug, p_raspunsuri: b.raspunsuri ? curat(b.raspunsuri) : null, p_fisier: fisier, p_pasi_gata: b.pasi_gata == null ? null : Math.max(0, Math.min(5, Number(b.pasi_gata) || 0)), p_finalizat: b.finalizat === true }); }
    catch (e) { res.status(400).json({ ok: false, motiv: e.motiv || 'nu se poate' }); return; }
    if (b.finalizat === true) await anunta({ tip: 'onboarding_complet', onboarding_id: out.id, contract_id: out.contract_id, lead_id: out.lead_id, slug });
    res.status(200).json({ ok: true, pasi_gata: out.pasi_gata, completat_la: out.completat_la });
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message || e).slice(0, 200) }); }
}
