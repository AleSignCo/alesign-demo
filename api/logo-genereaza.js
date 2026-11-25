// POST /api/logo-genereaza (botul logo, S2): un set de propuneri de logo din rețete (formatul v1, logo-reteta-v1.md).
// Validează fiecare rețetă, o compilează de două ori (același hash), rulează verificările măsurate, face SVG-urile și planșele
// și le urcă în bucketul privat „brand”, la <lead>/<sarcina>/set-N/. Cu "incarca": false nu urcă nimic: fișierele vin în răspuns.
// Chemat doar de n8n, cu antetul secret (x-alesign-secret). Cheile Supabase stau în env.
import sharp from 'sharp';
import { genereazaSet, MAX_RETETE } from '../lib/logo/genereaza.js';
import { urcaToate, areCheile, descrie, prefixSet } from '../lib/logo/stocare.js';
import { intrare, iduri, gresit, eroare } from '../lib/logo/http.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const b = intrare(req, res); if (!b) return;
  const { lead, sarcina, set, erori } = iduri(b, { cuSet: true });
  if (!Array.isArray(b.retete) || !b.retete.length || b.retete.length > MAX_RETETE) erori.push(`retete: o listă cu 1–${MAX_RETETE} rețete`);
  if (b.paleta != null && (typeof b.paleta !== 'object' || Array.isArray(b.paleta))) erori.push('paleta: un obiect cu culorile din Dosar (fundal, text, baza, accent, neutre)');
  if (erori.length) { gresit(res, 'cererea nu e completă', erori); return; }
  // aceleași nume ca în logo_de_lucru (SQL 111): „amprente_alesign” (logourile noastre de până acum) și „concurenti” (cei cu imagine sau amprentă)
  if (b.comparatii == null && (Array.isArray(b.amprente_alesign) || Array.isArray(b.concurenti))) {
    b.comparatii = { alesign: Array.isArray(b.amprente_alesign) ? b.amprente_alesign : [], concurenti: (Array.isArray(b.concurenti) ? b.concurenti : []).filter((x) => x && (x.amprenta || x.png_base64)) };
  }
  const incarca = b.incarca !== false;
  if (incarca && !areCheile()) { res.status(500).json({ ok: false, motiv: 'lipsesc SUPABASE_URL sau SUPABASE_SERVICE_KEY în env' }); return; }
  try {
    const t0 = Date.now();
    const prefix = prefixSet(lead, sarcina, set);
    const r = await genereazaSet({ ...b, lead_id: lead, sarcina_id: sarcina, set }, { sharp, prefix });
    if (!r.ok) { gresit(res, r.motiv); return; }
    const { fisiere, ...rest } = r;
    if (!r.candidati.length) { gresit(res, 'nicio rețetă n-a trecut validarea sau compilarea', r.respinse.flatMap((x) => x.erori), { respinse: r.respinse }); return; }
    const lista = incarca ? await urcaToate(fisiere) : descrie(fisiere, { cuDate: b.cu_date !== false });
    res.status(200).json({ ok: true, ...rest, incarcat: incarca, bucket: incarca ? 'brand' : null, fisiere: lista, durata_totala_ms: Date.now() - t0 });
  } catch (e) { eroare(res, e); }
}
