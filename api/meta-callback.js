// GET /api/meta-callback?code=…&state=… → întoarcerea de la Meta după consimțământ.
// Verifică starea semnată → schimbă codul pe un token de utilizator cu viață lungă → citește paginile (cu tokenurile lor și contul Instagram legat)
// → RPC acces_meta_salveaza (tokenurile intră în Vault; în dosar rămân doar numele și id-urile) → înapoi în spațiul clientului, cu un mesaj.
// Nimic nu se scrie în pagină sau în log: tokenurile trec doar de la Meta la bază.
import { rpc } from '../lib/sb.js';
import { verificaStare } from './meta-connect.js';

const APP_ID = process.env.META_APP_ID || '2012838619434388';
const APP_SECRET = process.env.META_APP_SECRET || '';
const VERSIUNE = process.env.META_GRAPH_VERSION || 'v23.0';
const RETUR = process.env.META_REDIRECT || 'https://demo.alesign.net/api/meta-callback';
const GRAPH = `https://graph.facebook.com/${VERSIUNE}`;

async function graph(cale, params) {
  const u = new URL(`${GRAPH}${cale}`);
  Object.entries(params).forEach(([k, v]) => { if (v != null) u.searchParams.set(k, String(v)); });
  const r = await fetch(u, { headers: { Accept: 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) { const e = new Error((j.error && j.error.message) || `graph ${r.status}`); e.cod = j.error && j.error.code; throw e; }
  return j;
}

// pure, testabilă: din /me/accounts → lista pentru acces_meta_salveaza
export function paginiDin(raspuns) {
  const date = Array.isArray(raspuns && raspuns.data) ? raspuns.data : [];
  return date.filter((p) => p && p.id && p.access_token).map((p) => ({
    id: String(p.id), name: String(p.name || '').slice(0, 120), token: String(p.access_token),
    ig_id: p.instagram_business_account && p.instagram_business_account.id ? String(p.instagram_business_account.id) : null,
    ig_username: p.instagram_business_account && p.instagram_business_account.username ? String(p.instagram_business_account.username).slice(0, 80) : null,
  }));
}

const inapoi = (res, token, q) => { res.statusCode = 302; res.setHeader('Location', `/s/${token}?${q}#conturi`); res.end(); };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const st = verificaStare(req.query.state);
  if (!st) { res.status(400).send('Linkul de întoarcere nu e valabil sau a expirat. Reia conectarea din spațiul tău.'); return; }
  if (req.query.error || !req.query.code) { inapoi(res, st.token, 'meta=anulat'); return; }
  if (!APP_SECRET) { inapoi(res, st.token, 'meta=eroare&m=config'); return; }
  try {
    // 1. codul → token scurt → token cu viață lungă (≈ 60 de zile; tokenurile de pagină derivate din el nu expiră)
    const scurt = await graph('/oauth/access_token', { client_id: APP_ID, client_secret: APP_SECRET, redirect_uri: RETUR, code: String(req.query.code) });
    const lung = await graph('/oauth/access_token', { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: scurt.access_token });
    const userToken = lung.access_token || scurt.access_token;
    // 2. paginile administrate + contul Instagram legat de fiecare
    const conturi = await graph('/me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: 50, access_token: userToken });
    const pagini = paginiDin(conturi);
    if (!pagini.length) { inapoi(res, st.token, 'meta=fara_pagini'); return; }
    // 3. în bază: Vault + dosar
    await rpc('acces_meta_salveaza', { p_token: st.token, p_pagini: pagini, p_user_token: userToken });
    inapoi(res, st.token, 'meta=conectat');
  } catch (e) {
    inapoi(res, st.token, `meta=eroare&m=${encodeURIComponent(String(e.message || 'eroare').slice(0, 80))}`);
  }
}
