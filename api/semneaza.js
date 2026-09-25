// POST /api/semneaza {slug, client{denumire,cui,regcom,adresa,reprezentant,email,telefon}, nume, plata_mod, acord}
// → RPC semneaza_contract → webhook n8n (tip: semnat) → dacă e card și Stripe e activ: {url} către Checkout.
import { rpc, anunta, slugCurat, ipDin, bodyDin } from '../lib/sb.js';
import { sesiuneCheckout, stripeConfigurat } from '../lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  try {
    const b = bodyDin(req);
    const slug = slugCurat(b.slug);
    const c = b.client || {};
    const client = { denumire: String(c.denumire || '').trim().slice(0, 200), cui: String(c.cui || '').trim().slice(0, 40), regcom: String(c.regcom || '').trim().slice(0, 40), adresa: String(c.adresa || '').trim().slice(0, 300), reprezentant: String(c.reprezentant || '').trim().slice(0, 120), email: String(c.email || '').trim().slice(0, 160), telefon: String(c.telefon || '').trim().slice(0, 40) };
    const nume = String(b.nume || '').trim().slice(0, 120);
    const mod = b.plata_mod === 'card' ? 'card' : 'transfer';
    if (!slug || b.acord !== true || nume.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(client.email)) { res.status(400).json({ ok: false, motiv: 'date lipsa' }); return; }
    let out;
    try { out = await rpc('semneaza_contract', { p_slug: slug, p_client: client, p_nume: nume, p_ip: ipDin(req), p_ua: String(req.headers['user-agent'] || '').slice(0, 300), p_plata_mod: mod }); }
    catch (e) { res.status(400).json({ ok: false, motiv: e.motiv || 'nu se poate' }); return; }
    await anunta({ tip: 'semnat', contract_id: out.id, slug, numar: out.numar, lead_id: out.lead_id, plata_mod: mod });
    if (mod === 'card' && stripeConfigurat()) {
      try { const d = await rpc('contract_date', { p_slug: slug }); const s = await sesiuneCheckout(d, { slug, host: req.headers.host || 'demo.alesign.net' }); res.status(200).json({ ok: true, id: out.id, url: s.url }); return; }
      catch (e) { /* cade pe pagina de plată, unde clientul reîncearcă sau alege transferul */ }
    }
    res.status(200).json({ ok: true, id: out.id });
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message || e).slice(0, 200) }); }
}
