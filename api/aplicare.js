// POST /api/aplicare → aplicările din paginile de campanie (/liber, /dovada): RPC aplicare_noua (sql/aplicari.sql) + webhook n8n pentru mesajul instant.
import { URL_SB, KEY_SB, H, HW, ipDin, bodyDin } from '../lib/sb.js';

const WEBHOOK = process.env.N8N_WEBHOOK_APLICARI || 'https://alesignco.app.n8n.cloud/webhook/aplicari';
const VARIANTE = ['liber', 'dovada'];
const CANALE = ['whatsapp', 'telefon', 'email'];
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'];
const txt = (v, n) => String(v ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  let b;
  try { b = bodyDin(req); } catch { res.status(400).json({ ok: false, motiv: 'date invalide' }); return; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) { res.status(400).json({ ok: false, motiv: 'date invalide' }); return; }
  // capcana pentru roboți: un om nu vede câmpul
  if (b.website2) { res.status(200).json({ ok: true }); return; }

  const utm = Object.fromEntries(UTM.filter((k) => b.utm && typeof b.utm[k] === 'string').map((k) => [k, txt(b.utm[k], 160)]));
  const a = {
    varianta: VARIANTE.includes(b.varianta) ? b.varianta : 'necunoscut',
    nume: txt(b.nume, 120), firma: txt(b.firma, 160), oras: txt(b.oras, 80), nisa: txt(b.nisa, 80),
    telefon: txt(b.telefon, 40), email: txt(b.email, 160), canal: CANALE.includes(b.canal) ? b.canal : 'whatsapp',
    are_site: typeof b.are_site === 'boolean' ? b.are_site : null, site: txt(b.site, 200),
    buget: txt(b.buget, 60), obiectiv: txt(b.obiectiv, 200), pachet: txt(b.pachet, 80),
    dureri: Array.isArray(b.dureri) ? b.dureri.slice(0, 10).map((d) => txt(d, 120)).filter(Boolean) : [],
    mesaj: txt(b.mesaj, 1500), acord: b.acord === true, utm, pagina: txt(b.pagina, 120), referrer: txt(b.referrer, 300),
  };
  if (a.nume.length < 2 || a.telefon.replace(/\D/g, '').length < 9 || (a.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email)) || !a.acord) {
    res.status(400).json({ ok: false, motiv: 'date lipsa' });
    return;
  }

  let id = null;
  let leadId = null;
  let salvat = false;
  if (URL_SB && KEY_SB) {
    try {
      const r = await fetch(`${URL_SB}/rest/v1/rpc/aplicare_noua`, { method: 'POST', headers: H(), body: JSON.stringify({ p: { ...a, ip: ipDin(req) } }) });
      if (r.ok) { const o = await r.json(); id = o && o.id; leadId = o && o.lead_id; salvat = true; }
      else if ((await r.text()).toLowerCase().includes('prea multe')) { res.status(429).json({ ok: false, motiv: 'prea multe cereri' }); return; }
    } catch { /* încercăm măcar webhook-ul */ }
  }
  let anuntat = false;
  if (WEBHOOK) {
    try {
      const w = await fetch(WEBHOOK, { method: 'POST', headers: HW(), body: JSON.stringify({ tip: 'aplicare', id, lead_id: leadId, ...a }) });
      anuntat = w.ok;
    } catch { /* aplicarea rămâne în Supabase */ }
  }
  if (!salvat && !anuntat) { res.status(500).json({ ok: false, motiv: 'nu am putut salva' }); return; }
  res.status(200).json({ ok: true, id });
}
