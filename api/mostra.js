// Vercel serverless: /m/<slug> → RPC mostra_date (Supabase, cheie publishable) → pagina Mostrei.
import { randeazaMostra, mostraExpirata } from '../lib/mostra.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const H = () => ({ apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' });
const TERMEN = { beauty: 'salon', wellness: 'spa', spa: 'spa', barbershop: 'barbershop' };

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!slug) { res.status(404).send(mostraExpirata({})); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc variabilele SUPABASE_URL / SUPABASE_KEY.</p>'); return; }
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/mostra_date`, { method: 'POST', headers: H(), body: JSON.stringify({ p_slug: slug }) });
    const m = r.ok ? await r.json() : null;
    if (!m || !m.lead_id) { res.status(404).send(mostraExpirata({})); return; }

    const scor = m.audit_scor == null ? null : Number(m.audit_scor);
    const ramura = !m.cu_site ? 'fara_site' : scor == null ? 'site_slab' : scor < 60 ? 'site_slab' : 'site_bun';
    const host = req.headers.host || 'demo.alesign.net';
    const d = {
      slug, firma: m.firma, zona: m.zona, rating: m.rating, nr_recenzii: m.nr_recenzii,
      termen: TERMEN[String(m.nisa || '').toLowerCase()] || 'salon',
      ramura, scor: scor == null && ramura === 'site_slab' ? 0 : scor,
      probleme: Array.isArray(m.audit_probleme) ? m.audit_probleme : [],
      demo_url: `https://${host}/${m.demo_slug}`,
      expira_la: m.mostra_expira, prelungita: !!m.mostra_prelungita,
    };
    if (ramura === 'site_slab' && scor == null) d.probleme = [{ vazut: 'Site-ul nu s-a încărcat când l-am testat.', costa: 'Un client care dă de o pagină moartă nu mai încearcă a doua oară.', facem: 'Îl repunem pe picioare în prima săptămână.' }, ...d.probleme];

    fetch(`${URL_SB}/rest/v1/rpc/mostra_vizualizare`, { method: 'POST', headers: H(), body: JSON.stringify({ p_slug: slug }) }).catch(() => {});
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(randeazaMostra(d));
  } catch (e) {
    res.status(500).send(`<p style="font-family:sans-serif">Eroare: ${String(e.message || e).replace(/</g, '&lt;')}</p>`);
  }
}
