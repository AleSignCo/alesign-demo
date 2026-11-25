// POST /api/logo-kit (botul logo, S2): kitul final al logoului ales, cu corecturile din listă aplicate de cod
// (grosime, spațiere, majuscule, mărimea semnului, culoarea, fără semn), sau kitul din logoul pe care clientul îl păstrează
// (logo_existent: SVG doar cu forme pline). Face SVG, PDF vectorial, PNG, faviconul, iconița, poza de profil, ghidul de două pagini,
// imaginea mărcii pentru OSIM și ZIP-ul, și le urcă în bucketul privat „brand”, la <lead>/<sarcina>/final/.
// Chemat doar de n8n, cu antetul secret (x-alesign-secret). Cu "incarca": false, fișierele vin în răspuns (probe).
import sharp from 'sharp';
import { genereazaKit } from '../lib/logo/kit.js';
import { urcaToate, areCheile, descrie, prefixFinal, citeste, BUCKETURI_CITITE } from '../lib/logo/stocare.js';
import { intrare, iduri, gresit, eroare } from '../lib/logo/http.js';

export const config = { maxDuration: 120 };

async function svgDin(x, camp, erori) {
  if (x == null) return null;
  if (typeof x === 'string') return x;
  if (typeof x === 'object' && x.svg) return String(x.svg);
  if (typeof x === 'object' && x.cale) {
    const bucket = x.bucket || 'brand';
    if (!BUCKETURI_CITITE.includes(bucket)) { erori.push(`${camp}.bucket: "brand" sau "onboarding"`); return null; }
    try { return (await citeste(x.cale, bucket)).toString('utf8'); } catch (e) { erori.push(`${camp}.cale: ${e.message}`); return null; }
  }
  erori.push(`${camp}: { svg } sau { bucket: "brand" | "onboarding", cale }`); return null;
}

export default async function handler(req, res) {
  const b = intrare(req, res); if (!b) return;
  const { lead, sarcina, erori } = iduri(b);
  // aceleași nume ca în logo_de_lucru (SQL 111): „ales.reteta” e rețeta aleasă, „logo_client” e logoul pe care firma îl păstrează
  if (b.reteta == null && b.ales && typeof b.ales === 'object' && b.ales.reteta) b.reteta = b.ales.reteta;
  if (b.logo_existent == null && b.logo_client && typeof b.logo_client === 'object' && b.logo_client.cale) b.logo_existent = b.logo_client;
  const existent = b.logo_existent != null;
  if (!existent && (!b.reteta || typeof b.reteta !== 'object')) erori.push('reteta: rețeta aleasă (formatul v1) sau logo_existent');
  if (existent && b.reteta) erori.push('reteta și logo_existent: doar unul dintre ele');
  if (b.osim != null && (typeof b.osim !== 'object' || (b.osim.paragrafe != null && !Array.isArray(b.osim.paragrafe)))) erori.push('osim: { titlu, paragrafe: [..], varianta? }');
  if (erori.length) { gresit(res, 'cererea nu e completă', erori); return; }
  const incarca = b.incarca !== false;
  if (incarca && !areCheile()) { res.status(500).json({ ok: false, motiv: 'lipsesc SUPABASE_URL sau SUPABASE_SERVICE_KEY în env' }); return; }
  try {
    const t0 = Date.now();
    let svgExistent = null, svgSemn = null;
    if (existent) {
      const e2 = [];
      const le = b.logo_existent;
      svgExistent = await svgDin(le && (le.svg || le.cale ? { svg: le.svg, cale: le.cale, bucket: le.bucket } : null), 'logo_existent', e2);
      svgSemn = await svgDin(le && (le.semn_svg || le.semn_cale ? { svg: le.semn_svg, cale: le.semn_cale, bucket: le.bucket } : null), 'logo_existent.semn', e2);
      if (!svgExistent && !e2.length) e2.push('logo_existent: { svg } sau { bucket: "brand" | "onboarding", cale }');
      if (e2.length) { gresit(res, 'logoul existent nu s-a putut citi', e2); return; }
    }
    const k = await genereazaKit({ ...b, lead_id: lead, sarcina_id: sarcina }, { sharp, prefix: prefixFinal(lead, sarcina), svgExistent, svgSemnExistent: svgSemn });
    if (!k.ok) { gresit(res, k.motiv, k.erori || [], { ...(k.verificari ? { verificari: k.verificari } : {}), ...(k.reteta_finala ? { reteta_finala: k.reteta_finala } : {}), ...(k.aplicate ? { aplicate: k.aplicate } : {}) }); return; }
    const { fisiere, ok, ...rest } = k;
    const lista = incarca ? await urcaToate(fisiere) : descrie(fisiere, { cuDate: b.cu_date === true });
    res.status(200).json({ ok: true, ...rest, incarcat: incarca, bucket: incarca ? 'brand' : null, fisiere: lista, durata_totala_ms: Date.now() - t0 });
  } catch (e) { eroare(res, e); }
}
