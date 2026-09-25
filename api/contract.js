// /c/<slug> → RPC contract_date → pagina contractului (semnare / plată / bun venit).
import { randeazaContract, contractIndisponibil } from '../lib/contract.js';
import { rpc, slugCurat, URL_SB, KEY_SB, H } from '../lib/sb.js';

export default async function handler(req, res) {
  const slug = slugCurat(req.query.slug);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  if (!slug) { res.status(404).send(contractIndisponibil({})); return; }
  if (!URL_SB || !KEY_SB) { res.status(500).send('<p style="font-family:sans-serif">Lipsesc variabilele SUPABASE_URL / SUPABASE_KEY.</p>'); return; }
  try {
    const d = await rpc('contract_date', { p_slug: slug });
    if (!d || !d.id) { res.status(404).send(contractIndisponibil({})); return; }
    d.slug = slug;
    fetch(`${URL_SB}/rest/v1/rpc/contract_vizualizare`, { method: 'POST', headers: H(), body: JSON.stringify({ p_slug: slug }) }).catch(() => {});
    res.status(200).send(randeazaContract(d));
  } catch (e) {
    res.status(500).send(`<p style="font-family:sans-serif">Eroare: ${String(e.message || e).replace(/</g, '&lt;')}</p>`);
  }
}
