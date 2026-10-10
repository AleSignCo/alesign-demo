// GET /api/meta-connect?token=<spatiu_token> → pornește conectarea Facebook/Instagram a clientului (Facebook Login for Business).
// Tokenul spațiului e cheia (fără login); starea OAuth e semnată (HMAC cu secretul aplicației), ca să nu poată fi plantată.
// După consimțământ, Meta întoarce clientul la /api/meta-callback. Nicio cheie în pagină: App ID e public, App secret stă doar în env (META_APP_SECRET).
import { createHmac } from 'node:crypto';
import { rpc } from '../lib/sb.js';

const APP_ID = process.env.META_APP_ID || '2012838619434388';
const APP_SECRET = process.env.META_APP_SECRET || '';
const CONFIG_ID = process.env.META_CONFIG_ID || '981782274234516';
const VERSIUNE = process.env.META_GRAPH_VERSION || 'v23.0';
const RETUR = process.env.META_REDIRECT || 'https://demo.alesign.net/api/meta-callback';

export const tokenCurat = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
const b64 = (s) => Buffer.from(s).toString('base64url');
export function semneazaStare(token, leadId, la = Date.now()) {
  const corp = `${token}.${leadId}.${la}`;
  const semn = createHmac('sha256', APP_SECRET).update(corp).digest('base64url').slice(0, 32);
  return b64(`${corp}.${semn}`);
}
export function verificaStare(state, maxVechime = 20 * 60 * 1000) {
  try {
    const s = Buffer.from(String(state || ''), 'base64url').toString('utf8');
    const [token, leadId, la, semn] = s.split('.');
    if (!token || !leadId || !la || !semn) return null;
    const asteptat = createHmac('sha256', APP_SECRET).update(`${token}.${leadId}.${la}`).digest('base64url').slice(0, 32);
    if (asteptat !== semn) return null;
    if (Date.now() - Number(la) > maxVechime) return null;
    return { token: tokenCurat(token), leadId: Number(leadId) };
  } catch { return null; }
}

export default async function handler(req, res) {
  const token = tokenCurat(req.query.token);
  res.setHeader('Cache-Control', 'private, no-store');
  if (!token || token.length < 16) { res.status(404).send('Linkul nu e valabil.'); return; }
  // fără secret (conectarea nu e pornită încă): clientul se întoarce în spațiul lui cu un mesaj omenesc, nu pe o pagină albă
  if (!APP_SECRET) { res.statusCode = 302; res.setHeader('Location', `/s/${token}?meta=eroare&m=${encodeURIComponent('conectarea nu e pornită încă')}#conturi`); res.end(); return; }
  let l;
  try { l = await rpc('spatiu_lead', { p_token: token }); } catch { l = null; }
  if (!l || !l.lead_id) { res.status(404).send('Linkul nu e valabil.'); return; }
  const state = semneazaStare(token, l.lead_id);
  const url = `https://www.facebook.com/${VERSIUNE}/dialog/oauth?client_id=${encodeURIComponent(APP_ID)}&redirect_uri=${encodeURIComponent(RETUR)}&state=${encodeURIComponent(state)}&config_id=${encodeURIComponent(CONFIG_ID)}&response_type=code&override_default_response_type=true`;
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
}
