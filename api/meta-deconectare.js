// POST /api/meta-deconectare {token} → clientul retrage accesul: secretul dispare din Vault, starea revine la „lipsa”. (Revocarea din partea Meta o face el din setările Facebook.)
import { rpc, bodyDin } from '../lib/sb.js';
import { tokenCurat } from './meta-connect.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') { res.status(405).send('metodă'); return; }
  const b = bodyDin(req);
  const token = tokenCurat(b.token || req.query.token);
  if (!token || token.length < 16) { res.status(404).send('Linkul nu e valabil.'); return; }
  try { await rpc('acces_meta_sterge', { p_token: token }); } catch { /* starea rămâne; clientul vede tot „conectat” și poate reîncerca */ }
  res.statusCode = 302; res.setHeader('Location', `/s/${token}?meta=deconectat#conturi`); res.end();
}
