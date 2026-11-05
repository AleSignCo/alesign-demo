// GET /oferta → pagina ofertei de lansare (prețuri de listă + regulile ofertelor); GET /oferta.pdf → același conținut ca PDF (atașat emailului de lansare)
import { ofertaDate, randeazaOferta, ofertaPdf } from '../lib/oferta.js';

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (req.method !== 'GET') { res.status(405).end(); return; }
  try {
    const d = await ofertaDate();
    if (String(req.query.f || '') === 'pdf') {
      const buf = await ofertaPdf(d);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="AleSystem-oferta-de-lansare.pdf"');
      res.status(200).send(buf); return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(randeazaOferta(d));
  } catch (e) { res.status(500).send('Oferta nu e disponibilă acum. Scrie-mi la info@alesign.net.'); }
}
