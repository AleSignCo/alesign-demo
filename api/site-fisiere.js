// GET /api/site-fisiere?t=<token spațiu>&s=<sarcina> (SQL 76): arhiva site-ului (fișierele predate, la găzduirea la client, sau exportul la plecare).
// Baza dă calea doar pentru clientul acelui site (spatiu_site_fisiere, cu cheia de serviciu); Storage semnează un URL de 60 de secunde, cu numele fișierului.
const SB = process.env.SUPABASE_URL; const SERV = process.env.SUPABASE_SERVICE_KEY;
const hs = () => ({ apikey: SERV, Authorization: `Bearer ${SERV}`, 'Content-Type': 'application/json' });
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const token = String((req.query || {}).t || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = parseInt((req.query || {}).s, 10);
  if (req.method !== 'GET' || token.length < 24 || !(id > 0)) { res.status(404).send('Nu există.'); return; }
  if (!SB || !SERV) { res.status(500).send('Lipsesc SUPABASE_URL sau SUPABASE_SERVICE_KEY.'); return; }
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/spatiu_site_fisiere`, { method: 'POST', headers: hs(), body: JSON.stringify({ p_token: token, p_sarcina_id: id }) });
    const a = r.ok ? await r.json() : null;
    if (!a || typeof a.arhiva !== 'string' || !/^[a-z0-9-]+\/[0-9a-z]+\.tar$/.test(a.arhiva)) { res.status(404).send('Nu există.'); return; }
    const s = await fetch(`${SB}/storage/v1/object/sign/arhiva-site/${a.arhiva}`, { method: 'POST', headers: hs(), body: JSON.stringify({ expiresIn: 60 }) });
    const j = s.ok ? await s.json() : null;
    if (!j || !j.signedURL) { res.status(404).send('Nu există.'); return; }
    const nume = String(a.nume || 'site.tar').replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 120);
    res.statusCode = 302; res.setHeader('Location', `${SB}/storage/v1${j.signedURL}${j.signedURL.includes('?') ? '&' : '?'}download=${encodeURIComponent(nume)}`); res.end();
  } catch (e) { res.status(500).send('Încearcă din nou.'); }
}
