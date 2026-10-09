// Vercel serverless: /s/<token>/site/<id> → RPC spatiu_site → site-ul clientului așezat pe șablonul nișei lui (previzualizare din spațiul clientului).
// Textele vin doar din piesa aprobată de Alexandru (continut.site); șablonul nu adaugă niciun cuvânt. Pozele clientului se semnează pe server (bucket privat), dacă există cheia de serviciu.
import { randeazaSite } from '../lib/sablon.js';
import { spatiuInchis } from '../lib/spatiu.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const KEY_SERV = process.env.SUPABASE_SERVICE_KEY;

async function semneaza(cai) {
  if (!KEY_SERV || !cai.length) return {};
  try {
    const r = await fetch(`${URL_SB}/storage/v1/object/sign/onboarding`, { method: 'POST', headers: { apikey: KEY_SERV, Authorization: `Bearer ${KEY_SERV}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 * 60 * 24, paths: cai }) });
    if (!r.ok) return {};
    const lista = await r.json(); const map = {};
    (Array.isArray(lista) ? lista : []).forEach((x) => { if (x && x.path && x.signedURL) map[x.path] = `${URL_SB}/storage/v1${x.signedURL}`; });
    return map;
  } catch (e) { return {}; }
}

export default async function handler(req, res) {
  const token = String(req.query.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = Number(String(req.query.id || '').replace(/[^0-9]/g, ''));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!token || token.length < 16 || !id) { res.status(404).send(spatiuInchis()); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc variabilele SUPABASE_URL / SUPABASE_KEY.</p>'); return; }
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/spatiu_site`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: token, p_sarcina_id: id }) });
    if (!r.ok) { res.status(404).send(spatiuInchis()); return; }
    const d = await r.json();
    if (!d || !d.continut) { res.status(404).send(spatiuInchis()); return; }
    const cai = [d.logo_cale, ...(Array.isArray(d.poze_cai) ? d.poze_cai : [])].filter(Boolean).slice(0, 12);
    const semnate = await semneaza(cai);
    const pozeClient = (Array.isArray(d.poze_cai) ? d.poze_cai : []).map((c) => semnate[c]).filter(Boolean);
    const publice = (Array.isArray(d.poze_publice) ? d.poze_publice : []).filter((u) => /^https?:\/\//i.test(String(u || '')));
    const idn = d.identitate || {};
    const dosar = { firma: d.firma, nisa: d.nisa, identitate: idn, logo_url: d.logo_cale ? semnate[d.logo_cale] : '', poze: [...pozeClient, ...publice].slice(0, 8), telefon: idn.telefon, email: idn.email, adresa: idn.adresa, program: idn.program };
    res.status(200).send(randeazaSite(d.continut, dosar, { mod: 'preview', inapoi: `/s/${token}` }));
  } catch (e) { res.status(500).send(spatiuInchis()); }
}
