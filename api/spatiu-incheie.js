// POST /api/spatiu-incheie (SQL 71): „Încheie colaborarea” din spațiu, confirmat cu cod unic (SEC5).
//   {token, contract_id, actiune:'cod'}                                  → spatiu_incheie_cod (6 cifre, 15 minute, 5 încercări; pe emailul din contract)
//   {token, contract_id, actiune:'confirma', cod, alegere:'care'|'export', motiv} → spatiu_incheie (preaviz 30 de zile, după perioada minimă; G5: rămâne pe Care sau exportul)
import { rpc, ipDin, corpDin, jurnal } from './spatiu-comentariu.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) { res.status(500).json({ ok: false, motiv: 'neconfigurat' }); return; }
  const b = corpDin(req);
  if (!b) { res.status(400).json({ ok: false, motiv: 'date invalide' }); return; }
  const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = parseInt(b.contract_id, 10);
  if (token.length < 16 || !(id > 0) || !['cod', 'confirma'].includes(b.actiune)) { res.status(400).json({ ok: false, motiv: 'date lipsă' }); return; }
  try {
    if (b.actiune === 'cod') {
      const r = await rpc('spatiu_incheie_cod', { p_token: token, p_contract_id: id });
      if (r.eroare) { res.status(400).json({ ok: false, motiv: /un minut/.test(r.eroare) ? 'Ți-am trimis deja un cod. Așteaptă un minut.' : /emailul/.test(r.eroare) ? 'Nu găsesc emailul din contract. Scrie-mi mai jos.' : 'Contractul nu mai e activ.' }); return; }
      await jurnal(token, req, 'incheie_cod');
      res.status(200).json({ ok: true, catre: r.date && r.date.catre, efect_la: r.date && r.date.efect_la }); return;
    }
    const cod = String(b.cod || '').replace(/\D/g, '').slice(0, 6);
    const alegere = ['care', 'export'].includes(b.alegere) ? b.alegere : null;
    if (cod.length !== 6 || !alegere) { res.status(400).json({ ok: false, motiv: cod.length !== 6 ? 'Codul are 6 cifre.' : 'Alege ce se întâmplă cu site-ul.' }); return; }
    const r = await rpc('spatiu_incheie', { p_token: token, p_contract_id: id, p_cod: cod, p_alegere: alegere, p_motiv: String(b.motiv || '').slice(0, 1000) || null, p_ip: ipDin(req) });
    if (r.eroare) { res.status(400).json({ ok: false, motiv: /site găzduit/.test(r.eroare) ? 'Site-ul nu e găzduit de noi: alege exportul.' : 'Contractul nu mai e activ.' }); return; }
    if (!r.date || !r.date.ok) { res.status(400).json({ ok: false, motiv: (r.date && r.date.motiv) ? r.date.motiv.charAt(0).toUpperCase() + r.date.motiv.slice(1) + '.' : 'Codul nu se potrivește.' }); return; }
    await jurnal(token, req, 'incheie');
    res.status(200).json({ ok: true, efect_la: r.date.efect_la, alegere: r.date.alegere });
  } catch (e) { res.status(500).json({ ok: false, motiv: 'eroare' }); }
}
