// POST /api/monitor (Incident, SQL 66): semnalul monitorului extern (la 5 minute, Care) → incident_din_monitor.
// „jos” deschide incidentul (sau îl găsește pe cel deschis), cere revenirea și anunță Alex și dezvoltatorul; „sus” îl marchează rezolvat.
// Corpul generic: { domeniu | url, stare: 'jos' | 'sus', ce: 'site' | 'formular' | 'programare' | 'certificat' | 'viteza', motiv }.
// Acceptă și forma webhook-urilor uzuale (monitorURL / alertType 1 = jos, 2 = sus / alertDetails). Monitorul îl alege Alex (lista lui).
// Autentificare: antetul x-alesign-secret = MONITOR_SECRET (env, pus de Alex). Cheia Supabase de serviciu stă în env.
import { timingSafeEqual } from 'crypto';

const SB = process.env.SUPABASE_URL; const SERV = process.env.SUPABASE_SERVICE_KEY;
const egal = (a, b) => { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && timingSafeEqual(x, y); };

export function semnal(b) {
  const tinta = b.domeniu || b.url || b.monitorURL || b.monitor_url || '';
  let stare = b.stare || null;
  if (!stare && b.alertType != null) stare = String(b.alertType) === '1' ? 'jos' : String(b.alertType) === '2' ? 'sus' : null;
  if (!stare && typeof b.status === 'string') stare = /down|jos|fail/i.test(b.status) ? 'jos' : /up|sus|ok|resolved/i.test(b.status) ? 'sus' : null;
  const ce = ['site', 'formular', 'programare', 'certificat', 'viteza'].includes(b.ce) ? b.ce : 'site';
  const motiv = String(b.motiv || b.alertDetails || b.cause || '').slice(0, 300) || null;
  return tinta && stare ? { p_domeniu: String(tinta).slice(0, 255), p_stare: stare, p_ce: ce, p_motiv: motiv } : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!process.env.MONITOR_SECRET || !egal(req.headers['x-alesign-secret'], process.env.MONITOR_SECRET)) { res.status(403).json({ ok: false }); return; }
  if (!SB || !SERV) { res.status(500).json({ ok: false, motiv: 'lipsesc SUPABASE_URL sau SUPABASE_SERVICE_KEY în env' }); return; }
  let b = {}; try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (e) { b = {}; }
  const p = semnal(b);
  if (!p) { res.status(400).json({ ok: false, motiv: 'lipsește ținta sau starea' }); return; }
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/incident_din_monitor`, { method: 'POST', headers: { apikey: SERV, Authorization: `Bearer ${SERV}`, 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    const j = await r.json().catch(() => null);
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, incident: j && j.id ? j.id : null, existent: !!(j && j.existent), rezolvate: j && j.rezolvate != null ? j.rezolvate : undefined });
  } catch (e) { res.status(502).json({ ok: false, motiv: 'baza nu răspunde' }); }
}
