// GET /api/factura?t=<token spațiu>&id=<factură> (SQL 67): PDF-ul facturii, doar pentru clientul ei. Baza dă calea (factura_pdf_pentru, cu cheia de serviciu),
// Storage semnează un URL de 60 de secunde, iar clientul e redirecționat. Fără token valid: 404, fără să spunem dacă factura există.
const SB = process.env.SUPABASE_URL; const SERV = process.env.SUPABASE_SERVICE_KEY;
const hs = () => ({ apikey: SERV, Authorization: `Bearer ${SERV}`, 'Content-Type': 'application/json' });
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const token = String((req.query || {}).t || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = parseInt((req.query || {}).id, 10);
  if (req.method !== 'GET' || token.length < 24 || !(id > 0)) { res.status(404).send('Nu există.'); return; }
  if (!SB || !SERV) { res.status(500).send('Lipsesc SUPABASE_URL sau SUPABASE_SERVICE_KEY.'); return; }
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/factura_pdf_pentru`, { method: 'POST', headers: hs(), body: JSON.stringify({ p_token: token, p_factura_id: id }) });
    const cale = r.ok ? await r.json() : null;
    if (!cale || typeof cale !== 'string' || !/^[0-9]+\/[A-Za-z0-9-]+\.pdf$/.test(cale)) { res.status(404).send('Nu există.'); return; }
    const s = await fetch(`${SB}/storage/v1/object/sign/facturi/${cale}`, { method: 'POST', headers: hs(), body: JSON.stringify({ expiresIn: 60 }) });
    const j = s.ok ? await s.json() : null;
    if (!j || !j.signedURL) { res.status(404).send('Nu există.'); return; }
    res.statusCode = 302; res.setHeader('Location', `${SB}/storage/v1${j.signedURL}`); res.end();
  } catch (e) { res.status(500).send('Încearcă din nou.'); }
}
