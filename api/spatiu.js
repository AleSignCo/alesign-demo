// Vercel serverless: /s/<token> → RPC spatiu_date → spațiul clientului (aprobări, calendar, materiale, contracte, mesaje). Fără login: tokenul e cheia.
import { randeazaSpatiu, spatiuInchis } from '../lib/spatiu.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
// cheia de serviciu (doar pe server, din Vercel env): semnează pozele clientului din bucket-ul privat „onboarding” pentru o zi; fără ea, piesa pomenește poza cu numele
const KEY_SERV = process.env.SUPABASE_SERVICE_KEY;

async function semneazaPoze(d) {
  if (!KEY_SERV) return;
  const piese = [...(d.de_aprobat || []), ...(d.calendar || []), ...(d.rapoarte || [])];
  const cai = [...new Set(piese.map((s) => s && s.continut && !s.continut.imagine_url && s.continut.imagine_cale).filter(Boolean))].slice(0, 60);
  if (!cai.length) return;
  try {
    const r = await fetch(`${URL_SB}/storage/v1/object/sign/onboarding`, { method: 'POST', headers: { apikey: KEY_SERV, Authorization: `Bearer ${KEY_SERV}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 * 60 * 24, paths: cai }) });
    if (!r.ok) return;
    const lista = await r.json();
    const map = {};
    (Array.isArray(lista) ? lista : []).forEach((x) => { if (x && x.path && x.signedURL) map[x.path] = `${URL_SB}/storage/v1${x.signedURL}`; });
    piese.forEach((s) => { const c = s && s.continut; if (c && !c.imagine_url && c.imagine_cale && map[c.imagine_cale]) c.imagine_url = map[c.imagine_cale]; });
  } catch (e) { /* fără semnare: textul rămâne, poza se pomenește cu numele */ }
}

export default async function handler(req, res) {
  const token = String(req.query.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!token || token.length < 16) { res.status(404).send(spatiuInchis()); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc variabilele SUPABASE_URL / SUPABASE_KEY.</p>'); return; }
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/spatiu_date`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: token }) });
    if (!r.ok) { res.status(404).send(spatiuInchis()); return; }
    const d = await r.json();
    if (!d || !d.firma) { res.status(404).send(spatiuInchis()); return; }
    await semneazaPoze(d);
    const meta = String(req.query.meta || '').replace(/[^a-z_]/g, '').slice(0, 20);
    res.status(200).send(randeazaSpatiu(d, token, meta ? { meta, m: String(req.query.m || '').slice(0, 80) } : {}));
  } catch (e) { res.status(500).send(spatiuInchis()); }
}
