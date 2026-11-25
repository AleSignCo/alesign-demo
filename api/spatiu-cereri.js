// POST /api/spatiu-cereri (Funnel de cereri, etapa 1 · SQL 120): ce face proprietarul cu o cerere, din secțiunea „Cererile” a spațiului.
//   {token, actiune:'contact', cerere_id}                          → spatiu_cerere_contact: telefonul și emailul întregi; clicul intră în jurnalul spațiului
//   {token, actiune:'etapa', cerere_id, etapa, programat_la?}      → spatiu_cerere_etapa: nouă, contactat, programat (cu ziua și ora), finalizat, anulat
// Regulile (al cui e tokenul, cele 90 de zile, data programării) sunt în bază. Răspunsul nu trece prin niciun model și nu se scrie în loguri.
import { EROARE, ipDin, corpDin } from './spatiu-comentariu.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const ETAPE = ['noua', 'contactat', 'programat', 'finalizat', 'anulat'];
// mesajele bazei, spuse pe înțeles; orice altceva devine EROARE (glosar-ecosistem)
const PE_INTELES = [
  ['linkul nu mai merge', 'Linkul spațiului tău nu mai e valabil. Scrie-mi și îți trimit unul nou.'],
  ['cererea nu mai e în listă', 'Cererea aceasta nu mai e în listă: are peste 90 de zile. Reîncarcă pagina.'],
  ['alege ziua și ora programării', 'Alege ziua și ora programării, apoi salvează.'],
  ['data programării nu pare bună', 'Data programării e prea departe, în trecut sau în viitor. Verific-o și salvează din nou.'],
];
async function rpc(nume, corp) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nume}`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corp) });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
  if (!r.ok) { const m = String((j && j.message) || ''); const gasit = PE_INTELES.find(([k]) => m.includes(k)); return { motiv: gasit ? gasit[1] : EROARE }; }
  return { date: j };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).json({ ok: false, motiv: EROARE }); return; }
  const b = corpDin(req);
  if (!b) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
  const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = parseInt(b.cerere_id, 10);
  const actiune = b.actiune === 'contact' ? 'contact' : b.actiune === 'etapa' ? 'etapa' : null;
  if (token.length < 16 || !(id > 0) || !actiune) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
  const ua = String(req.headers['user-agent'] || '').slice(0, 120);
  try {
    if (actiune === 'contact') {
      const r = await rpc('spatiu_cerere_contact', { p_token: token, p_cerere_id: id, p_ip: ipDin(req), p_ua: ua });
      if (r.motiv) { res.status(400).json({ ok: false, motiv: r.motiv }); return; }
      if (!r.date) { res.status(404).json({ ok: false, motiv: 'Cererea aceasta nu mai e în listă: are peste 90 de zile. Reîncarcă pagina.' }); return; }
      res.status(200).json({ ok: true, telefon: r.date.telefon || null, email: r.date.email || null }); return;
    }
    const etapa = ETAPE.includes(b.etapa) ? b.etapa : null;
    if (!etapa) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
    let cand = null;
    if (etapa === 'programat' && b.programat_la) { const d = new Date(String(b.programat_la).slice(0, 40)); if (isNaN(d)) { res.status(400).json({ ok: false, motiv: 'Alege ziua și ora programării, apoi salvează.' }); return; } cand = d.toISOString(); }
    const r = await rpc('spatiu_cerere_etapa', { p_token: token, p_cerere_id: id, p_etapa: etapa, p_programat_la: cand, p_ip: ipDin(req), p_ua: ua });
    if (r.motiv) { res.status(400).json({ ok: false, motiv: r.motiv }); return; }
    res.status(200).json({ ok: true, etapa: r.date && r.date.etapa, programat_la: (r.date && r.date.programat_la) || null });
  } catch (e) { console.error('spatiu-cereri', e && e.message); res.status(500).json({ ok: false, motiv: EROARE }); }
}
