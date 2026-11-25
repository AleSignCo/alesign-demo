// POST /api/spatiu-logo (S2, 25 nov. 2026, SQL 111): ce face clientul la „Logoul tău”, în spațiul lui (/s/<token>).
//   {token, sarcina_id, actiune:'aleg', logo_id}       → spatiu_logo_aleg (una din propunerile setului arătat)
//   {token, sarcina_id, actiune:'niciunul', motiv}     → spatiu_logo_niciunul (alt set, sau la Alexandru când s-au terminat seturile)
//   {token, sarcina_id, actiune:'corectura', corecturi}→ spatiu_logo_corectura (din lista „logo_corecturi”; le reface codul)
//   {token, sarcina_id, actiune:'cerere', text}        → spatiu_logo_cerere (o cerere scrisă, merge la Alexandru)
//   {token, sarcina_id, actiune:'cod'}                 → spatiu_logo_cod (codul de 6 cifre pe email, 15 minute)
//   {token, sarcina_id, actiune:'aprob', cod}          → spatiu_logo_aprob (logoul aprobat; kitul se face după)
// Răspunde {ok, motiv?, ...}; „motiv” e mereu o propoziție pentru client. Regulile (faze, seturi, runde, cod) sunt în bază.
import { EROARE, rpc, jurnal, corpDin, ipDin } from './spatiu-comentariu.js';

const ACTIUNI = ['aleg', 'niciunul', 'corectura', 'cerere', 'cod', 'aprob'];
// mesajele bazei pe care clientul le poate vedea, spuse pe înțeles; orice altă eroare devine EROARE (motivul tehnic rămâne în jurnalul Vercel)
const PE_INTELES = [
  ['logoul nu asteapta alegerea', 'Logoul nu mai așteaptă alegerea acum. Reîncarcă pagina.'],
  ['logoul nu asteapta corecturi', 'Logoul nu mai așteaptă corecturi acum. Reîncarcă pagina.'],
  ['logoul nu asteapta aprobarea', 'Logoul nu mai așteaptă aprobarea acum. Reîncarcă pagina.'],
  ['am trimis deja un cod', 'Ți-am trimis deja un cod. Dacă nu l-ai primit, mai cere unul peste un minut.'],
  ['lipsește emailul din contract', 'Nu am un email la care să-ți trimit codul. Scrie-mi la Mesaje și rezolv eu.'],
];
const peInteles = (m) => { const x = PE_INTELES.find(([k]) => String(m || '').includes(k)); return x ? x[1] : EROARE; };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) { res.status(500).json({ ok: false, motiv: EROARE }); return; }
  const b = corpDin(req);
  if (!b) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
  const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = parseInt(b.sarcina_id, 10);
  const actiune = ACTIUNI.includes(b.actiune) ? b.actiune : null;
  if (token.length < 16 || !(id > 0) || !actiune) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
  const baza = { p_token: token, p_sarcina_id: id };
  let nume, corp;
  if (actiune === 'aleg') {
    const logo = parseInt(b.logo_id, 10);
    if (!(logo > 0)) { res.status(400).json({ ok: false, motiv: EROARE }); return; }
    nume = 'spatiu_logo_aleg'; corp = { ...baza, p_logo_id: logo };
  } else if (actiune === 'niciunul') {
    nume = 'spatiu_logo_niciunul'; corp = { ...baza, p_motiv: String(b.motiv || '').trim().slice(0, 1500) };
  } else if (actiune === 'corectura') {
    const c = b.corecturi && typeof b.corecturi === 'object' && !Array.isArray(b.corecturi) ? b.corecturi : {};
    const curat = {};
    Object.keys(c).slice(0, 8).forEach((k) => { if (/^[a-z_]{1,20}$/.test(k)) curat[k] = String(c[k]).slice(0, 12); });
    if (!Object.keys(curat).length) { res.status(400).json({ ok: false, motiv: 'Alege din listă ce vrei schimbat, apoi trimite.' }); return; }
    nume = 'spatiu_logo_corectura'; corp = { ...baza, p_corecturi: curat };
  } else if (actiune === 'cerere') {
    nume = 'spatiu_logo_cerere'; corp = { ...baza, p_text: String(b.text || '').trim().slice(0, 1500) };
  } else if (actiune === 'cod') {
    nume = 'spatiu_logo_cod'; corp = baza;
  } else {
    const cod = String(b.cod || '').replace(/\D/g, '').slice(0, 6);
    if (cod.length !== 6) { res.status(400).json({ ok: false, motiv: 'Scrie codul de 6 cifre din email.' }); return; }
    nume = 'spatiu_logo_aprob'; corp = { ...baza, p_cod: cod, p_ip: ipDin(req) };
  }
  try {
    const r = await rpc(nume, corp);
    if (r.eroare) { console.error('spatiu-logo', actiune, r.eroare); res.status(400).json({ ok: false, motiv: peInteles(r.eroare) }); return; }
    const d = r.date && typeof r.date === 'object' ? r.date : {};
    // un refuz al bazei cu motiv (de pildă „Codul nu se potrivește…”) e deja o propoziție pentru client
    if (d.ok === false) { res.status(200).json({ ok: false, motiv: String(d.motiv || EROARE).slice(0, 300) }); return; }
    await jurnal(token, req, 'logo_' + actiune);
    const extra = {};
    ['ce', 'seturi_ramase', 'runde_ramase', 'catre', 'logo_id'].forEach((k) => { if (d[k] !== undefined && d[k] !== null) extra[k] = d[k]; });
    res.status(200).json({ ok: true, ...extra });
  } catch (e) { console.error('spatiu-logo', e); res.status(500).json({ ok: false, motiv: EROARE }); }
}
