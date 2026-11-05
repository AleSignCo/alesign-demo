// GET /api/sistem-oglinda?t=<token> → CSV cu oglinda listei SISTEM (lista_sistem_oglinda), pentru Google Sheets prin =IMPORTDATA(...). Fără OAuth, fără credential în n8n.
// Tokenul e în setari.sistem_oglinda_token (SQL 106); citirea se face cu cheia de serviciu, doar pe server. Rândurile citite prima dată se marchează „trimise” (sistem_oglinda_trimis).
import crypto from 'crypto';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SERV = process.env.SUPABASE_SERVICE_KEY;
const HS = () => ({ apikey: KEY_SERV, Authorization: `Bearer ${KEY_SERV}`, 'Content-Type': 'application/json' });
const COL = [['Data', 'la'], ['Eveniment', 'eveniment'], ['Etapa', 'etapa'], ['Nume', 'nume'], ['Email', 'email'], ['Telefon', 'telefon'], ['Firma', 'firma'], ['Domeniu', 'domeniu'], ['Oras', 'oras'], ['Sursa', 'sursa'], ['Oferta', 'oferta'], ['Recomandat de', 'recomandat_de'], ['Link personal', 'link_personal'], ['Lead ID', 'lead_id']];
const ro = (d) => (d ? new Date(d).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const celula = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
// telefonul rămâne text în Sheet (un spațiu după prefixul de țară; altfel IMPORTDATA îl face număr și pierde „+”)
const telefon = (t) => String(t || '').replace(/^\+(\d{2})(\d{6,})$/, '+$1 $2');

export function csvDin(randuri) {
  const linii = [COL.map(([h]) => h).join(',')];
  for (const r of randuri) linii.push(COL.map(([, k]) => celula(k === 'la' ? ro(r.la) : k === 'telefon' ? telefon(r.telefon) : r[k])).join(','));
  return linii.join('\r\n') + '\r\n';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') { res.status(405).end(); return; }
  if (!URL_SB || !KEY_SERV) { res.status(503).send('lipsesc SUPABASE_URL / SUPABASE_SERVICE_KEY'); return; }
  const t = String(req.query.t || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 80);
  if (t.length < 16) { res.status(403).send('token'); return; }
  try {
    const q = await fetch(`${URL_SB}/rest/v1/setari?cheie=eq.sistem_oglinda_token&select=valoare`, { headers: HS() });
    const j = await q.json();
    const bun = String((j[0] && j[0].valoare) || '');
    if (!bun || bun.length !== t.length || !crypto.timingSafeEqual(Buffer.from(bun), Buffer.from(t))) { res.status(403).send('token'); return; }
    const r = await fetch(`${URL_SB}/rest/v1/lista_sistem_oglinda?select=*&order=id.asc&limit=5000`, { headers: HS() });
    if (!r.ok) { res.status(502).send('nu pot citi oglinda'); return; }
    const randuri = await r.json();
    const noi = randuri.filter((x) => !x.trimis_la).map((x) => x.id);
    if (noi.length) { try { await fetch(`${URL_SB}/rest/v1/rpc/sistem_oglinda_trimis`, { method: 'POST', headers: HS(), body: JSON.stringify({ p_ids: noi }) }); } catch { /* marcarea e informativă */ } }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send('﻿' + csvDin(randuri));
  } catch (e) { res.status(500).send('eroare'); }
}
