// GET /api/brand-fisiere?t=<token spațiu>&s=<sarcina>&f=<cheie> (S2, 25 nov. 2026, SQL 111): un fișier din „Fișierele tale”.
// Baza dă calea doar pentru clientul acelei piese livrate (spatiu_brand_fisiere, cu cheia de serviciu) și doar ce intră în treapta lui
// (ghidul și dosarul OSIM nu sunt la L1). Storage semnează un URL de 60 de secunde din bucketul privat „brand”, cu numele fișierului.
const SB = process.env.SUPABASE_URL; const SERV = process.env.SUPABASE_SERVICE_KEY;
const hs = () => ({ apikey: SERV, Authorization: `Bearer ${SERV}`, 'Content-Type': 'application/json' });
const CHEI = ['zip', 'svg', 'semn', 'favicon', 'avatar', 'ghid', 'osim', 'osim_jpg'];
const NU_MERGE = 'Fișierul nu se mai poate descărca de aici. Scrie-mi la Mesaje și ți-l trimit eu.';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const q = req.query || {};
  const token = String(q.t || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = parseInt(q.s, 10);
  const f = CHEI.includes(String(q.f || '')) ? String(q.f) : null;
  if (req.method !== 'GET' || token.length < 16 || !(id > 0) || !f) { res.status(404).send(NU_MERGE); return; }
  if (!SB || !SERV) { console.error('brand-fisiere: lipsesc SUPABASE_URL / SUPABASE_SERVICE_KEY'); res.status(500).send(NU_MERGE); return; }
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/spatiu_brand_fisiere`, { method: 'POST', headers: hs(), body: JSON.stringify({ p_token: token, p_sarcina_id: id, p_fisier: f }) });
    const a = r.ok ? await r.json() : null;
    const cale = a && a.bucket === 'brand' && typeof a.cale === 'string' ? a.cale : '';
    if (!/^[0-9]+\/[0-9]+\/[A-Za-z0-9._/-]{1,240}$/.test(cale) || cale.includes('..') || !cale.startsWith(`${id}/`, cale.indexOf('/') + 1)) { res.status(404).send(NU_MERGE); return; }
    const s = await fetch(`${SB}/storage/v1/object/sign/brand/${cale}`, { method: 'POST', headers: hs(), body: JSON.stringify({ expiresIn: 60 }) });
    const j = s.ok ? await s.json() : null;
    if (!j || !j.signedURL) { res.status(404).send(NU_MERGE); return; }
    const nume = String(a.nume || cale.replace(/^.*\//, '')).replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 120);
    res.statusCode = 302; res.setHeader('Location', `${SB}/storage/v1${j.signedURL}${j.signedURL.includes('?') ? '&' : '?'}download=${encodeURIComponent(nume)}`); res.end();
  } catch (e) { console.error('brand-fisiere', e); res.status(500).send('Descărcarea nu a pornit. Mai încearcă o dată; dacă nu merge nici acum, scrie-mi la Mesaje și rezolv eu.'); }
}
