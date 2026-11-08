// GET /ghid, /ghid.pdf, /overview, /overview.pdf → materialele pentru cei care scriu SISTEM (lib/brosuri.js).
// ?sursa=…&instagram=… din linkul ManyChat trec mai departe, curățate, în butonul spre formularul Tally.
import { brosuraDate, randeazaGhid, randeazaOverview, ghidPdf, overviewPdf } from '../lib/brosuri.js';

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).end(); return; }
  const b = String(req.query.b || '') === 'overview' ? 'overview' : 'ghid';
  const pdf = String(req.query.f || '') === 'pdf';
  const q = { sursa: req.query.sursa, instagram: req.query.instagram };
  try {
    const d = await brosuraDate();
    if (pdf) {
      const buf = b === 'overview' ? await overviewPdf(d, q) : await ghidPdf(d, q);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=600');
      res.setHeader('Content-Disposition', `inline; filename="${b === 'overview' ? 'AleSystem-Design-overview' : 'Ghid-5-semne-firma-premium'}.pdf"`);
      res.status(200).send(buf); return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(b === 'overview' ? randeazaOverview(d, q) : randeazaGhid(d, q));
  } catch (e) { res.status(500).send('Pagina nu e disponibilă acum. Scrie-mi la info@alesign.net.'); }
}
