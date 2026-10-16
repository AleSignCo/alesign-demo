// POST /api/spatiu-aproba (Bot Website v5.1, „Site-ul meu”, Poarta C): „Aprob site-ul”, confirmat cu cod unic (SEC5).
//   {token, sarcina_id, actiune:'cod'}          → site_cod_cere (6 cifre, 15 minute, 5 încercări; codul pleacă pe emailul din contract, prin n8n)
//   {token, sarcina_id, actiune:'aproba', cod}  → site_aproba (sarcina → aprobat, ultima tranșă se cere; publicarea după plata integrală, la Poarta D)
// Aprobarea nu se dă altfel: nu prin „Aprob toate”, nu printr-un „ok” pe email. Fiecare pas intră în istoric, cu ora și IP-ul; baza pinge n8n (SQL 54).
import { rpc, ipDin, corpDin, jurnal } from './spatiu-comentariu.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) { res.status(500).json({ ok: false, motiv: 'neconfigurat' }); return; }
  const b = corpDin(req);
  if (!b) { res.status(400).json({ ok: false, motiv: 'date invalide' }); return; }
  const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = parseInt(b.sarcina_id, 10);
  if (token.length < 16 || !(id > 0) || !['cod', 'aproba'].includes(b.actiune)) { res.status(400).json({ ok: false, motiv: 'date lipsă' }); return; }
  try {
    if (b.actiune === 'cod') {
      const r = await rpc('site_cod_cere', { p_token: token, p_sarcina_id: id, p_actiune: 'aprob_site' });
      if (r.eroare) { res.status(400).json({ ok: false, motiv: /un minut/.test(r.eroare) ? 'Ți-am trimis deja un cod. Așteaptă un minut.' : /emailul/.test(r.eroare) ? 'Nu găsesc emailul din contract. Scrie-mi mai jos.' : 'Site-ul nu mai așteaptă aprobarea.' }); return; }
      await jurnal(token, req, 'cod');
      res.status(200).json({ ok: true, catre: r.date && r.date.catre }); return;
    }
    const cod = String(b.cod || '').replace(/\D/g, '').slice(0, 6);
    if (cod.length !== 6) { res.status(400).json({ ok: false, motiv: 'Codul are 6 cifre.' }); return; }
    const r = await rpc('site_aproba', { p_token: token, p_sarcina_id: id, p_cod: cod, p_ip: ipDin(req) });
    if (r.eroare) { res.status(400).json({ ok: false, motiv: 'Site-ul nu mai așteaptă aprobarea.' }); return; }
    if (!r.date || !r.date.ok) { res.status(400).json({ ok: false, motiv: (r.date && r.date.motiv) ? r.date.motiv.charAt(0).toUpperCase() + r.date.motiv.slice(1) + '.' : 'Codul nu se potrivește.' }); return; }
    await jurnal(token, req, 'aproba');
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, motiv: 'eroare' }); }
}
