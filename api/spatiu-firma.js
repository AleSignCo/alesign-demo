// POST /api/spatiu-firma (valul 2, SQL 94, „Faptele le schimbi tu”): clientul își schimbă faptele din fișa firmei și le publică o dată pe zi.
//   {token, actiune:'salveaza', date:{telefon, email, adresa, program, servicii:[{nume, pret, descriere}], echipa:[{nume, rol}], promotie:{text, expira_la}|null}}
//      → firma_ta_salveaza: verificările dure sunt în bază (telefon RO, email, lungimi, prețuri, fără promisiuni, fără promoții în nișele reglementate); erorile vin pe câmp
//   {token, actiune:'publica'} → firma_ta_publica: site-ul se reconstruiește cu faptele noi, QA, publicare fără Poarta D; o publicare pe zi
// Serverul curăță doar forma (tipuri, lungimi, număr de rânduri); regulile sunt în bază, ca să fie aceleași și pentru Founder OS.
import { rpc, jurnal, corpDin, EROARE } from './spatiu-comentariu.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const MOTIVE = { 'o publicare pe zi': 'Azi ai publicat deja o dată. Ce salvezi acum poți publica mâine, tot deodată.', 'publicarea e in lucru': 'Publicarea de dinainte încă rulează. Când se termină, poți publica din nou.',
  'nimic de publicat': 'Nu e nimic nou de publicat. Schimbă ceva, salvează, apoi publică.', 'niciun site publicat la noi': 'Aici poți schimba lucruri după ce site-ul tău e online, la mine.',
  'site-ul nu e publicat': 'Site-ul nu e online în clipa asta, probabil lucrez la el. Revin eu la tine.', 'firma ta e oprita': 'Deocamdată am oprit schimbările de aici. Scrie-mi ce vrei schimbat și le fac eu.', 'spatiu inexistent': 'Linkul nu mai merge. Scrie-mi și îți trimit linkul bun în aceeași zi.' };
const text = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);

export function dateCurate(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const o = {};
  if ('telefon' in d) o.telefon = text(d.telefon, 30);
  if ('email' in d) o.email = text(d.email, 120);
  if ('adresa' in d) o.adresa = text(d.adresa, 200);
  if ('program' in d) o.program = text(d.program, 400);
  if ('servicii' in d) o.servicii = (Array.isArray(d.servicii) ? d.servicii : []).slice(0, 40).filter((x) => x && typeof x === 'object').map((x) => ({ nume: text(x.nume, 80), pret: text(x.pret, 30), descriere: text(x.descriere, 400) })).filter((x) => x.nume);
  if ('echipa' in d) o.echipa = (Array.isArray(d.echipa) ? d.echipa : []).slice(0, 30).filter((x) => x && typeof x === 'object').map((x) => ({ nume: text(x.nume, 60), rol: text(x.rol, 60) })).filter((x) => x.nume);
  if ('promotie' in d) o.promotie = d.promotie && typeof d.promotie === 'object' && text(d.promotie.text, 120) ? { text: text(d.promotie.text, 120), expira_la: text(d.promotie.expira_la, 10) } : null;
  return Object.keys(o).length ? o : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).json({ ok: false, motiv: EROARE }); return; }
  const b = corpDin(req);
  if (!b) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
  const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
  const actiune = b.actiune === 'publica' ? 'publica' : b.actiune === 'salveaza' ? 'salveaza' : null;
  if (token.length < 16 || !actiune) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
  try {
    if (actiune === 'salveaza') {
      const date = dateCurate(b.date);
      if (!date) { res.status(400).json({ ok: false, motiv: 'N-ai schimbat nimic încă.' }); return; }
      const r = await rpc('firma_ta_salveaza', { p_token: token, p: date });
      if (r.eroare) { res.status(400).json({ ok: false, motiv: MOTIVE[r.eroare] || 'Nu s-a salvat. Mai încearcă o dată; dacă nu merge nici acum, scrie-mi la Mesaje și rezolv eu.' }); return; }
      const j = r.date || {};
      if (j.ok === false) { res.status(400).json({ ok: false, erori: Array.isArray(j.erori) ? j.erori.slice(0, 20).map((e) => ({ camp: text(e.camp, 40), text: text(e.text, 300) })) : [] }); return; }
      await jurnal(token, req, 'firma_ta');
      // starea de după salvare, pentru buton (câte nepublicate, dacă azi s-a publicat deja)
      const st = await rpc('spatiu_date', { p_token: token });
      const f = (st.date && st.date.firma_ta) || {};
      res.status(200).json({ ok: true, nimic_schimbat: !!j.nimic_schimbat, versiune_id: j.versiune_id || null, nepublicate: Number(f.nepublicate || 0), publicat_azi: !!f.publicat_azi, in_lucru: !!f.in_lucru }); return;
    }
    const r = await rpc('firma_ta_publica', { p_token: token });
    if (r.eroare) { res.status(400).json({ ok: false, motiv: MOTIVE[r.eroare] || EROARE }); return; }
    await jurnal(token, req, 'firma_ta_publica');
    res.status(200).json({ ok: true, campuri: r.date && r.date.campuri });
  } catch (e) { console.error('spatiu-firma', e); res.status(500).json({ ok: false, motiv: EROARE }); }
}
