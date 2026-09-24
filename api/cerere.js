// POST /api/cerere → RPC trimite_cerere → (opțional) webhook n8n pentru mailul instant.
const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const WEBHOOK = process.env.N8N_WEBHOOK_CERERE || 'https://alesignco.app.n8n.cloud/webhook/cereri'; // n8n „Cereri · Mostra”; verifică singur în Supabase ce primește

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const slug = String(b.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
    const email = String(b.email || '').trim().slice(0, 160);
    const telefon = String(b.telefon || '').trim().slice(0, 40);
    if (!slug || !b.nume || !telefon || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || b.acord !== true) { res.status(400).json({ ok: false, motiv: 'date lipsa' }); return; }
    const r = await fetch(`${URL_SB}/rest/v1/rpc/trimite_cerere`, {
      method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug, p_nume: String(b.nume).slice(0, 120), p_telefon: telefon, p_email: email, p_canal: b.canal === 'email' ? 'email' : 'whatsapp', p_interval: String(b.interval || '').slice(0, 30), p_pachet: String(b.pachet || '').slice(0, 60), p_altceva: String(b.altceva || '').slice(0, 2000), p_acord: true }),
    });
    if (!r.ok) { res.status(400).json({ ok: false, motiv: (await r.text()).slice(0, 200) }); return; }
    const out = await r.json();
    if (WEBHOOK) {
      await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tip: 'cerere', cerere_id: out.id, lead_id: out.lead_id, firma: out.firma, slug, nume: b.nume, telefon, email, canal: b.canal, interval: b.interval, pachet: b.pachet, altceva: b.altceva || '' }) }).catch(() => {});
    }
    res.status(200).json({ ok: true, id: out.id });
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message || e).slice(0, 200) }); }
}
