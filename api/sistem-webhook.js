// POST /api/sistem-webhook → webhook-ul Tally pentru formularul „Lista SISTEM” (SQL 105, sistem_inscriere).
// Cine poate chema: Tally, cu semnătura HMAC (TALLY_SIGNING_SECRET, antetul tally-signature) sau cheia din URL (?k=SISTEM_CHEIE). Fără una din ele configurată: 503.
// Scrie cu cheia de serviciu (SUPABASE_SERVICE_KEY): funcția e doar pentru service_role. Răspunde 200 când leadul e în bază; Tally reîncearcă la 5xx.
import { dinTally, cheieValida } from '../lib/sistem.js';

export const config = { api: { bodyParser: false } };
const URL_SB = process.env.SUPABASE_URL;
const KEY_SERV = process.env.SUPABASE_SERVICE_KEY;

function corp(req) {
  return new Promise((resolve, reject) => { let s = ''; req.setEncoding('utf8'); req.on('data', (c) => { s += c; if (s.length > 200000) reject(new Error('prea mare')); }); req.on('end', () => resolve(s)); req.on('error', reject); });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  const secretTally = process.env.TALLY_SIGNING_SECRET || '';
  const cheie = process.env.SISTEM_CHEIE || '';
  if (!secretTally && !cheie) { res.status(503).json({ ok: false, motiv: 'neconfigurat: pune TALLY_SIGNING_SECRET sau SISTEM_CHEIE în Vercel' }); return; }
  if (!URL_SB || !KEY_SERV) { res.status(503).json({ ok: false, motiv: 'lipsesc SUPABASE_URL / SUPABASE_SERVICE_KEY' }); return; }
  let raw;
  try { raw = await corp(req); } catch { res.status(400).json({ ok: false, motiv: 'corp invalid' }); return; }
  const k = String(req.query.k || '');
  if (!cheieValida({ raw, semnatura: String(req.headers['tally-signature'] || ''), k, secretTally, cheie })) { res.status(403).json({ ok: false, motiv: 'semnătură sau cheie greșită' }); return; }
  let body;
  try { body = JSON.parse(raw || '{}'); } catch { res.status(400).json({ ok: false, motiv: 'JSON invalid' }); return; }
  if (body && body.eventType && body.eventType !== 'FORM_RESPONSE') { res.status(200).json({ ok: true, ignorat: body.eventType }); return; }
  const p = dinTally(body);
  if (!p.email) { res.status(200).json({ ok: false, motiv: 'fără email' }); return; }
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/sistem_inscriere`, { method: 'POST', headers: { apikey: KEY_SERV, Authorization: `Bearer ${KEY_SERV}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p }) });
    const t = await r.text();
    if (!r.ok) { res.status(r.status >= 500 ? 502 : 200).json({ ok: false, motiv: t.slice(0, 300) }); return; }
    const o = t ? JSON.parse(t) : {};
    res.status(200).json({ ok: true, lead_id: o.lead_id, nou: o.nou, oferta_cod: o.oferta_cod });
  } catch (e) { res.status(502).json({ ok: false, motiv: String(e.message || e).slice(0, 200) }); }
}
