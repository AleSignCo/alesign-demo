// Motorul de logo · bucketul privat „brand” din Supabase Storage (îl creează S2 în SQL 110). Urcă și citește cu cheia de serviciu,
// ca api/qa-dovada.js; fișierele le văd doar n8n și Founder OS, prin URL-uri semnate. Căile: <lead>/<sarcina>/set-N/… și <lead>/<sarcina>/final/…
import { createHash } from 'crypto';

export const BUCKET = 'brand';
const SB = () => process.env.SUPABASE_URL;
const SERV = () => process.env.SUPABASE_SERVICE_KEY;
const hs = (x = {}) => ({ apikey: SERV(), Authorization: `Bearer ${SERV()}`, ...x });
export const areCheile = () => !!(SB() && SERV());

// fiecare bucată din cale, codată; fără „..”, fără începuturi cu „/”
export function caleSigura(cale) {
  const p = String(cale || '').split('/');
  if (!p.length || p.some((x) => !x || x === '.' || x === '..' || /[\\\0]/.test(x))) throw new Error(`cale greșită: ${String(cale).slice(0, 120)}`);
  return p.map(encodeURIComponent).join('/');
}

export const prefixSet = (lead, sarcina, set) => `${lead}/${sarcina}/set-${set}/`;
export const prefixFinal = (lead, sarcina) => `${lead}/${sarcina}/final/`;
export const prefixKit = (lead, sarcina) => `${lead}/${sarcina}/kit/`;

export async function urca(cale, date, tip = 'application/octet-stream') {
  const corp = Buffer.isBuffer(date) ? date : Buffer.from(String(date), 'utf8');
  const r = await fetch(`${SB()}/storage/v1/object/${BUCKET}/${caleSigura(cale)}`, { method: 'POST', headers: hs({ 'Content-Type': tip, 'x-upsert': 'true', 'Cache-Control': 'no-cache' }), body: corp });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`storage ${r.status} la ${cale}: ${t.slice(0, 160)}`); }
  return { cale, tip, octeti: corp.length, sha256: createHash('sha256').update(corp).digest('hex') };
}

// toate fișierele unui pas, câte `paralel` deodată; dacă vreunul nu urcă, se spune care (restul rămân urcate: x-upsert le rescrie la reluare)
export async function urcaToate(fisiere, { paralel = 6 } = {}) {
  const out = new Array(fisiere.length); const erori = []; let i = 0;
  const lucreaza = async () => { while (i < fisiere.length) { const k = i++; const f = fisiere[k]; try { out[k] = await urca(f.cale, f.date, f.tip); } catch (e) { erori.push(String(e.message || e)); } } };
  await Promise.all(Array.from({ length: Math.min(paralel, fisiere.length) }, lucreaza));
  if (erori.length) throw new Error(`${erori.length} din ${fisiere.length} fișiere n-au urcat: ${erori.slice(0, 3).join('; ')}`);
  return out;
}

// citire doar din cele două bucketuri private ale firmei: „brand” (ce face motorul) și „onboarding” (ce a încărcat clientul)
export const BUCKETURI_CITITE = ['brand', 'onboarding'];
export async function citeste(cale, bucket = BUCKET) {
  if (!BUCKETURI_CITITE.includes(bucket)) throw new Error(`bucket necunoscut: ${String(bucket).slice(0, 40)}`);
  const c = String(cale || '').replace(new RegExp(`^/?${bucket}/`), '');
  const r = await fetch(`${SB()}/storage/v1/object/authenticated/${bucket}/${caleSigura(c)}`, { headers: hs() });
  if (!r.ok) throw new Error(`storage ${r.status}: ${cale} nu se poate citi`);
  return Buffer.from(await r.arrayBuffer());
}

// fără bucket: fișierele vin în răspuns (probe, logo-proba.mjs), cu aceleași câmpuri ca după urcare
export function descrie(fisiere, { cuDate = false } = {}) {
  return fisiere.map((f) => {
    const b = Buffer.isBuffer(f.date) ? f.date : Buffer.from(String(f.date), 'utf8');
    return { cale: f.cale, tip: f.tip, octeti: b.length, sha256: createHash('sha256').update(b).digest('hex'), ...(cuDate ? { base64: b.toString('base64') } : {}) };
  });
}
