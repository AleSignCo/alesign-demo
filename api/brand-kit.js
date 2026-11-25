// POST /api/brand-kit (botul logo, S2, piesa „aplicatii_brand”): brand kitul firmei, din identitatea aprobată și din logoul final.
// Face ghidul brandului (8 pagini), poza de profil și coperta doar pentru canalele din Dosar, fonturile cu licența lor, culori.txt
// și ZIP-ul, și le urcă în bucketul privat „brand”, la <lead>/<sarcina>/kit/. Cartea de vizită, semnătura de e-mail, antetul și
// șablonul de postare se primesc de acum și vin înapoi la „amanate” (a doua parte a motorului, 26–28 nov. 2026).
// Chemat doar de n8n, cu antetul secret (x-alesign-secret). Cu "incarca": false, fișierele vin în răspuns (probe).
import sharp from 'sharp';
import { genereazaBrandKit } from '../lib/brand/kit.js';
import { urcaToate, areCheile, descrie, prefixKit, citeste, BUCKETURI_CITITE } from '../lib/logo/stocare.js';
import { intrare, iduri, gresit, eroare } from '../lib/logo/http.js';

export const config = { maxDuration: 120 };

// logoul final: { orizontal_svg, semn_svg } în cerere (probe), sau în bucket: logo: { bucket, cale, semn } (fluxul n8n
// „Logo · generator”) ori „final” din logo_de_lucru (SQL 111), cu aceeași formă
const dinBucket = (b) => [['logo', b.logo], ['final', b.final]].find(([, x]) => x && typeof x === 'object' && typeof x.cale === 'string' && x.cale);
async function logoDin(b, erori) {
  const l = b.logo && typeof b.logo === 'object' ? b.logo : null;
  if (l && typeof l.orizontal_svg === 'string' && l.orizontal_svg.trim()) return { orizontal: l.orizontal_svg, semn: typeof l.semn_svg === 'string' && l.semn_svg.trim() ? l.semn_svg : null };
  const gasit = dinBucket(b);
  if (!gasit) { erori.push('logo: { bucket: "brand" | "onboarding", cale, semn? } (logoul final al firmei; merge și „final” cu aceeași formă) sau logo: { orizontal_svg, semn_svg? }'); return null; }
  const [camp, f] = gasit; const bucket = f.bucket || 'brand';
  if (!BUCKETURI_CITITE.includes(bucket)) { erori.push(`${camp}.bucket: "brand" sau "onboarding"`); return null; }
  if (!/\.svg$/i.test(f.cale)) { erori.push(`${camp}.cale: brand kitul se face doar din logoul în SVG`); return null; }
  let orizontal = null, semn = null;
  try { orizontal = (await citeste(f.cale, bucket)).toString('utf8'); } catch (e) { erori.push(`${camp}.cale: ${e.message}`); return null; }
  if (typeof f.semn === 'string' && f.semn) { try { semn = (await citeste(f.semn, bucket)).toString('utf8'); } catch (e) { semn = null; } }
  return { orizontal, semn };
}

export default async function handler(req, res) {
  const b = intrare(req, res); if (!b) return;
  const { lead, sarcina, erori } = iduri(b);
  if (!b.identitate || typeof b.identitate !== 'object' || Array.isArray(b.identitate)) erori.push('identitate: identitatea aprobată (culori, perechi, fonturi, jetoane, ton, fotografie, rescrieri, reguli)');
  if (b.canale != null && !Array.isArray(b.canale)) erori.push('canale: lista din Dosar (identitate.canale)');
  if (b.aplicatii != null && !Array.isArray(b.aplicatii)) erori.push('aplicatii: o listă (ghid, avatar, coperta, carte_vizita, semnatura_email, antet, postare)');
  if (erori.length) { gresit(res, 'cererea nu e completă', erori); return; }
  const incarca = b.incarca !== false;
  const cuBucket = !(b.logo && typeof b.logo === 'object' && b.logo.orizontal_svg);
  if ((incarca || cuBucket) && !areCheile()) { res.status(500).json({ ok: false, motiv: 'lipsesc SUPABASE_URL sau SUPABASE_SERVICE_KEY în env' }); return; }
  try {
    const t0 = Date.now(); const e2 = [];
    const logo = await logoDin(b, e2);
    if (!logo) { gresit(res, 'logoul final nu s-a putut citi', e2); return; }
    const k = await genereazaBrandKit({ ...b, lead_id: lead, sarcina_id: sarcina }, { sharp, prefix: prefixKit(lead, sarcina), logo });
    if (!k.ok) { gresit(res, k.motiv, k.erori || [], k.verificari ? { verificari: k.verificari } : {}); return; }
    const { fisiere, ok, ...rest } = k;
    const lista = incarca ? await urcaToate(fisiere) : descrie(fisiere, { cuDate: b.cu_date === true });
    res.status(200).json({ ok: true, ...rest, incarcat: incarca, bucket: incarca ? 'brand' : null, fisiere: lista, durata_totala_ms: Date.now() - t0 });
  } catch (e) { eroare(res, e); }
}
