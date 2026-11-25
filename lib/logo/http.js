// Motorul de logo · ce au comun cele trei rute (logo-genereaza, logo-kit, brand-kit): metoda, antetul secret, corpul JSON, id-urile.
// Chemate doar de n8n, cu x-alesign-secret = N8N_WEBHOOK_SECRET, ca api/site-build.js. Mesajele sunt pentru S2 și pentru Founder OS.
export function intrare(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, motiv: 'doar POST' }); return null; }
  const SECRET = process.env.N8N_WEBHOOK_SECRET || '';
  if (!SECRET || req.headers['x-alesign-secret'] !== SECRET) { res.status(403).json({ ok: false, motiv: 'antet secret lipsă' }); return null; }
  let b;
  try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { res.status(400).json({ ok: false, motiv: 'corpul cererii nu e JSON', erori: [] }); return null; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) { res.status(400).json({ ok: false, motiv: 'corpul cererii trebuie să fie un obiect JSON', erori: [] }); return null; }
  return b;
}

// lead_id, sarcina_id (și set, unde e cazul): întregi pozitivi
export function iduri(b, { cuSet = false } = {}) {
  const erori = []; const ent = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const lead = ent(b.lead_id); const sarcina = ent(b.sarcina_id); const set = cuSet ? (b.set == null ? 1 : ent(b.set)) : null;
  if (!lead) erori.push('lead_id: un număr întreg pozitiv');
  if (!sarcina) erori.push('sarcina_id: un număr întreg pozitiv');
  if (cuSet && (!set || set > 50)) erori.push('set: un număr întreg între 1 și 50');
  return { lead, sarcina, set, erori };
}

export const gresit = (res, motiv, erori = [], extra = {}) => res.status(400).json({ ok: false, motiv, erori, ...extra });
export const eroare = (res, e) => res.status(500).json({ ok: false, motiv: String((e && e.message) || e).slice(0, 300) });
