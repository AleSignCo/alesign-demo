// /o/<slug> → RPC onboarding_date → pagina de pornire (5 pași, upload direct în Storage cu cheia publishable).
import { randeazaOnboarding, onboardingIndisponibil } from '../lib/onboarding.js';
import { rpc, slugCurat, URL_SB, KEY_SB } from '../lib/sb.js';

export default async function handler(req, res) {
  const slug = slugCurat(req.query.slug);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  if (!slug) { res.status(404).send(onboardingIndisponibil()); return; }
  try {
    const d = await rpc('onboarding_date', { p_slug: slug });
    if (!d || !d.id) { res.status(404).send(onboardingIndisponibil()); return; }
    d.slug = slug;
    res.status(200).send(randeazaOnboarding(d, { supabaseUrl: URL_SB, supabaseKey: KEY_SB }));
  } catch (e) { res.status(500).send(`<p style="font-family:sans-serif">Eroare: ${String(e.message || e).replace(/</g, '&lt;')}</p>`); }
}
