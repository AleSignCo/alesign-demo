// POST /api/spatiu-comentariu (Bot Website v5.1, „Site-ul meu”): comentariile clientului pe secțiunile site-ului, scrise în spațiu (nu printr-un script în site).
//   {token, sarcina_id, actiune:'comentariu', sectiune, text} → site_comentariu (o ciornă a rundei)
//   {token, sarcina_id, actiune:'trimite'}                    → site_trimite_comentarii (închide runda → etapa 7, sau „cerere în afara contractului” peste rundele incluse)
// La trimitere, baza pinge n8n „Livrare · evenimente” (SQL 54), cu antetul secret din Vault; Alex află pe loc. Regulile (cine, când, câte runde) sunt în bază.
const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
// mesajele bazei pe care clientul le poate vedea (restul devin „nu am putut salva”)
const CUNOSCUTE = ['site-ul nu așteaptă comentarii', 'comentariul e gol', 'nu ai scris niciun comentariu'];
export const ipDin = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64) || null;
export async function rpc(nume, corp) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nume}`, { method: 'POST', headers: { apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corp) });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
  if (!r.ok) { const m = String((j && j.message) || ''); return { eroare: CUNOSCUTE.find((x) => m.includes(x)) || m.slice(0, 120) }; }
  return { date: j };
}
export const jurnal = (token, req, ce) => rpc('spatiu_jurnal_adauga', { p_token: token, p_ip: ipDin(req), p_ce: ce, p_ua: String(req.headers['user-agent'] || '').slice(0, 200) }).catch(() => null);
export const corpDin = (req) => { try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (e) { return null; } };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).json({ ok: false, motiv: 'neconfigurat' }); return; }
  const b = corpDin(req);
  if (!b) { res.status(400).json({ ok: false, motiv: 'date invalide' }); return; }
  const token = String(b.token || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
  const id = parseInt(b.sarcina_id, 10);
  const actiune = b.actiune === 'trimite' ? 'trimite' : b.actiune === 'comentariu' ? 'comentariu' : null;
  if (token.length < 16 || !(id > 0) || !actiune) { res.status(400).json({ ok: false, motiv: 'date lipsă' }); return; }
  try {
    if (actiune === 'comentariu') {
      const sectiune = String(b.sectiune || '').replace(/[^a-z0-9_.]/gi, '').slice(0, 80) || 'general';
      const text = String(b.text || '').trim().slice(0, 2000);
      if (text.length < 2) { res.status(400).json({ ok: false, motiv: 'Scrie comentariul.' }); return; }
      const r = await rpc('site_comentariu', { p_token: token, p_sarcina_id: id, p_sectiune: sectiune, p_text: text, p_ip: ipDin(req) });
      if (r.eroare) { res.status(400).json({ ok: false, motiv: r.eroare }); return; }
      await jurnal(token, req, 'comentariu');
      res.status(200).json({ ok: true, n: r.date && r.date.n }); return;
    }
    const r = await rpc('site_trimite_comentarii', { p_token: token, p_sarcina_id: id, p_ip: ipDin(req) });
    if (r.eroare) { res.status(400).json({ ok: false, motiv: r.eroare }); return; }
    const extra = !!(r.date && r.date.extra);
    await jurnal(token, req, 'trimite');
    res.status(200).json({ ok: true, extra });
  } catch (e) { res.status(500).json({ ok: false, motiv: 'eroare' }); }
}
