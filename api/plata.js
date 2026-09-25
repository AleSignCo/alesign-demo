// POST /api/plata {slug, mod?: 'transfer', anuntat?: true} → card: {url} Stripe Checkout · transfer: alege_plata (+ webhook când clientul spune că a plătit)
import { rpc, anunta, slugCurat, bodyDin } from '../lib/sb.js';
import { sesiuneCheckout, stripeConfigurat } from '../lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  try {
    const b = bodyDin(req);
    const slug = slugCurat(b.slug);
    if (!slug) { res.status(400).json({ ok: false }); return; }
    const d = await rpc('contract_date', { p_slug: slug });
    if (!d || !d.id || d.status !== 'semnat') { res.status(400).json({ ok: false, motiv: 'stare invalida' }); return; }
    if (b.mod === 'transfer') {
      if (d.plata_mod !== 'transfer') await rpc('alege_plata', { p_slug: slug, p_mod: 'transfer' });
      if (b.anuntat === true) await anunta({ tip: 'transfer_anuntat', contract_id: d.id, slug, numar: d.numar, lead_id: d.lead_id });
      res.status(200).json({ ok: true }); return;
    }
    if (!stripeConfigurat()) { res.status(400).json({ ok: false, motiv: 'stripe inactiv' }); return; }
    if (d.plata_mod !== 'card') await rpc('alege_plata', { p_slug: slug, p_mod: 'card' });
    const s = await sesiuneCheckout(d, { slug, host: req.headers.host || 'demo.alesign.net' });
    res.status(200).json({ ok: true, url: s.url });
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message || e).slice(0, 200) }); }
}
