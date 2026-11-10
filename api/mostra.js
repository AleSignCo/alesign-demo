// Vercel serverless: /m/<slug> → RPC mostra_date + mostra_vizualizare (blochează prețurile la prima deschidere) + catalog_public(slug) → pagina Mostrei.
import { randeazaMostra, mostraExpirata, mostraDejaClient } from '../lib/mostra.js';

const URL_SB = process.env.SUPABASE_URL;
const KEY_SB = process.env.SUPABASE_KEY;
const H = () => ({ apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' });
const TERMEN = { beauty: 'salon', salon: 'salon', wellness: 'spa', spa: 'spa', barbershop: 'barbershop', frizerie: 'frizerie', horeca: 'restaurant', restaurant: 'restaurant', cafenea: 'cafenea', medical: 'clinică', clinica: 'clinică', dental: 'cabinet stomatologic', stomatologie: 'cabinet stomatologic', estetic: 'clinică de estetică', imobiliare: 'agenție imobiliară', fitness: 'sală de fitness' };
const rpc = async (fn, body) => { const r = await fetch(`${URL_SB}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H(), body: JSON.stringify(body) }); if (!r.ok) return null; const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return null; } };

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!slug) { res.status(404).send(mostraExpirata({})); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc variabilele SUPABASE_URL / SUPABASE_KEY.</p>'); return; }
  try {
    const m = await rpc('mostra_date', { p_slug: slug });
    if (!m || !m.lead_id) { res.status(404).send(mostraExpirata({})); return; }
    // clientul care apasă iar pe linkul Mostrei (SQL 26: mostra_date dă și statusul): fără configurator, fără cerere nouă; îl trimitem la spațiul lui
    if (m.status === 'Client') { res.setHeader('Cache-Control', 'private, no-store'); res.status(200).send(mostraDejaClient({ firma: m.firma })); return; }

    // întâi vizualizarea (fixează prețurile 7 zile de la prima deschidere), apoi catalogul cu prețurile blocate
    await rpc('mostra_vizualizare', { p_slug: slug });
    const catalog = (await rpc('catalog_public', { p_slug: slug })) || { pachete: [], module: [], reguli: {}, setari: {}, blocat: {} };

    const scor = m.audit_scor == null ? null : Number(m.audit_scor);
    const ramura = !m.cu_site ? 'fara_site' : scor == null ? 'site_slab' : scor < 60 ? 'site_slab' : 'site_bun';
    const host = req.headers.host || 'demo.alesign.net';
    const d = {
      slug, firma: m.firma, zona: m.zona, rating: m.rating, nr_recenzii: m.nr_recenzii,
      termen: TERMEN[String(m.nisa || '').toLowerCase()] || 'firmă',
      ramura, scor: scor == null && ramura === 'site_slab' ? 0 : scor,
      probleme: Array.isArray(m.audit_probleme) ? m.audit_probleme : [],
      demo_url: `https://${host}/${m.demo_slug}`,
      expira_la: m.mostra_expira, prelungita: !!m.mostra_prelungita,
      cu_site: !!m.cu_site,
      catalog,
      // ramura decide ce recomand: fără site → Growth (cu Launch ca punct de pornire); site slab → Growth; site bun → Growth
      recomandat: 'crestere',
    };
    if (ramura === 'site_slab' && scor == null) d.probleme = [{ vazut: 'Site-ul nu s-a încărcat când l-am testat.', costa: 'Cine a intrat în acel moment a dat de o pagină care nu se deschide.', facem: 'Îl repunem pe picioare odată cu Website Refresh.' }, ...d.probleme];

    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(randeazaMostra(d));
  } catch (e) {
    res.status(500).send(`<p style="font-family:sans-serif">Eroare: ${String(e.message || e).replace(/</g, '&lt;')}</p>`);
  }
}
