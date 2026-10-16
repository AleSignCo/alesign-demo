// POST /api/qa-dovada?q=<id rulare>&id=<captura.png> (Bot Website v5.1, etapa 5): mașina de QA urcă dovezile (capturile) în bucket-ul privat „qa-dovezi”.
// Mașina n-are cheia de serviciu: se autentifică cu cheia ei (antetul x-qa-cheie), verificată prin hash față de setari.qa_masina_cheie_hash.
// Dovezile se păstrează 12 luni (registrul QA); le citesc doar n8n (lentilele, verificatorul) și Founder OS, prin URL-uri semnate.
import { createHash } from 'crypto';
export const config = { api: { bodyParser: false } };
const SB = process.env.SUPABASE_URL; const SERV = process.env.SUPABASE_SERVICE_KEY;
const hs = (x = {}) => ({ apikey: SERV, Authorization: `Bearer ${SERV}`, ...x });
const corp = (req) => new Promise((ok, nu) => { const b = []; let n = 0; req.on('data', (c) => { n += c.length; if (n > 8 * 1024 * 1024) { nu(new Error('prea mare')); req.destroy(); } else b.push(c); }); req.on('end', () => ok(Buffer.concat(b))); req.on('error', nu); });

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!SB || !SERV) { res.status(500).json({ ok: false, motiv: 'lipsește SUPABASE_SERVICE_KEY' }); return; }
  try {
    const cheie = String(req.headers['x-qa-cheie'] || '');
    const st = await (await fetch(`${SB}/rest/v1/setari?cheie=eq.qa_masina_cheie_hash&select=valoare`, { headers: hs() })).json();
    const hash = st && st[0] && st[0].valoare;
    if (!cheie || !hash || createHash('sha256').update(cheie).digest('hex') !== hash) { res.status(401).json({ ok: false }); return; }
    const q = parseInt(req.query.q, 10); const id = String(req.query.id || '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 120);
    if (!(q > 0) || !/\.(png|jpe?g|webp|json)$/.test(id)) { res.status(400).json({ ok: false, motiv: 'q sau id invalid' }); return; }
    const date = await corp(req);
    const cale = `${q}/${id}`;
    const r = await fetch(`${SB}/storage/v1/object/qa-dovezi/${cale}`, { method: 'POST', headers: hs({ 'Content-Type': req.headers['content-type'] || 'image/png', 'x-upsert': 'true' }), body: date });
    if (!r.ok) { res.status(502).json({ ok: false, motiv: 'storage ' + r.status }); return; }
    res.status(200).json({ ok: true, cale });
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message).slice(0, 200) }); }
}
