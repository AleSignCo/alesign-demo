// GET /api/contract-pdf?slug=… → PDF-ul contractului (nesemnat sau semnat, după stare). n8n îl ia de aici ca atașament.
import { rpc, slugCurat } from '../lib/sb.js';
import { contractPdf } from '../lib/pdf.js';

export default async function handler(req, res) {
  const slug = slugCurat(req.query.slug);
  if (!slug) { res.status(404).send('nu'); return; }
  try {
    const d = await rpc('contract_date', { p_slug: slug });
    if (!d || !d.id) { res.status(404).send('Contractul nu e disponibil.'); return; }
    const bytes = await contractPdf(d);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Contract-${d.numar || slug}${d.status !== 'trimis' ? '-semnat' : ''}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(Buffer.from(bytes));
  } catch (e) { res.status(500).send(`Eroare: ${String(e.message || e).slice(0, 200)}`); }
}
