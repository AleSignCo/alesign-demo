// POST /api/spatiu-directie (valul 2, SQL 96, Signature): clientul alege direcția la Poarta A sau cere încă un set.
//   {token, sarcina_id, actiune:'aleg', idx}          → spatiu_alege_directie (direcția aprobată, Copy pornește)
//   {token, sarcina_id, actiune:'set_nou', motiv}     → spatiu_directii_set_nou (etapa 2 se reia cu motivul; la al doilea refuz, la Alex)
import { rpc, jurnal, corpDin, EROARE } from './spatiu-comentariu.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const MOTIVE = { 'piesa nu asteapta alegerea directiei': 'Ai ales deja direcția sau am schimbat eu ceva între timp. Reîncarcă pagina.', 'directie necunoscuta': 'Direcția asta nu e printre cele propuse. Reîncarcă pagina.',
  'spune in cateva cuvinte ce nu merge': 'Spune-mi în cel puțin 5 cuvinte ce nu ți se potrivește.', 'spatiu inexistent': 'Linkul nu mai merge. Scrie-mi și îți trimit linkul bun în aceeași zi.' };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).json({ ok: false, motiv: EROARE }); return; }
  const b = corpDin(req);
  if (!b) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
  const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
  const id = parseInt(b.sarcina_id, 10);
  const actiune = b.actiune === 'aleg' ? 'aleg' : b.actiune === 'set_nou' ? 'set_nou' : null;
  if (token.length < 16 || !(id > 0) || !actiune) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
  try {
    if (actiune === 'aleg') {
      const idx = parseInt(b.idx, 10);
      if (!(idx >= 0 && idx < 10)) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
      const r = await rpc('spatiu_alege_directie', { p_token: token, p_sarcina_id: id, p_idx: idx });
      if (r.eroare) { res.status(400).json({ ok: false, motiv: MOTIVE[r.eroare] || EROARE }); return; }
      await jurnal(token, req, 'alege_directie');
      res.status(200).json({ ok: true, directie: r.date && r.date.directie }); return;
    }
    const motiv = String(b.motiv || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 1000);
    const r = await rpc('spatiu_directii_set_nou', { p_token: token, p_sarcina_id: id, p_motiv: motiv });
    if (r.eroare) { res.status(400).json({ ok: false, motiv: MOTIVE[r.eroare] || EROARE }); return; }
    await jurnal(token, req, 'directii_set_nou');
    res.status(200).json({ ok: true, la_alex: !!(r.date && r.date.la_alex), set: r.date && r.date.set });
  } catch (e) { console.error('spatiu-directie', e); res.status(500).json({ ok: false, motiv: EROARE }); }
}
