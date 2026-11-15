// Adresa unei persoane fizice, pe bucăți (15 nov. 2026).
// De ce: factura către o persoană fizică pleacă în e-Factura, iar acolo orașul și județul se cer separat (la București,
// orașul e „Sector 1”…„Sector 6”). La firme le luăm de la ANAF, după CUI; la persoane fizice nu are cine să ni le dea.
// Cum: formularul de contract le cere pe trei câmpuri, iar serverul le așază într-un singur rând, mereu în aceeași formă:
//   „Str. Exemplu nr. 10, Iași, jud. Iași”   sau   „Str. Exemplu nr. 10, Sector 3, București”.
// Rândul se salvează în contract ca până acum (client_adresa), deci baza de date nu se schimbă, iar fluxul de facturi
// citește localitatea și județul din coada rândului (aceeași regulă e copiată în nodul din n8n, care nu poate importa de aici).

export const JUDETE = ['Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brașov', 'Brăila', 'București', 'Buzău', 'Caraș-Severin', 'Călărași', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Satu Mare', 'Sălaj', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vaslui', 'Vâlcea', 'Vrancea'];

const curat = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const simplu = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// „jud. Iasi”, „IAȘI”, „Municipiul București” → numele din listă; altceva → ''
export function judetCurat(s) {
  const k = simplu(curat(s, 60)).replace(/^(judetul|jud\.?)\s+/, '').replace(/^(municipiul|mun\.?)\s+/, '');
  return JUDETE.find((j) => simplu(j) === k) || '';
}

// „Sector 3”, „sectorul 3”, „s3”, „3” → 3; altceva → 0
export function sectorDin(s) {
  const m = simplu(curat(s, 40)).match(/^(?:sector(?:ul)?|s\.?)?\s*([1-6])$/);
  return m ? Number(m[1]) : 0;
}

// Din cele trei câmpuri face rândul de adresă. Întoarce { ok, adresa, strada, localitate, judet } sau { ok:false, motiv }.
export function compuneAdresa({ strada, localitate, judet } = {}) {
  const st = curat(strada, 160).replace(/[\s,]+$/, '');
  const jd = judetCurat(judet);
  if (st.length < 3 || !jd) return { ok: false, motiv: 'adresa lipsa' };
  if (jd === 'București') {
    const n = sectorDin(localitate);
    if (!n) return { ok: false, motiv: 'sector lipsa' };
    return { ok: true, adresa: `${st}, Sector ${n}, București`, strada: st, localitate: `Sector ${n}`, judet: jd };
  }
  const loc = curat(localitate, 60).replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (loc.length < 2) return { ok: false, motiv: 'adresa lipsa' };
  return { ok: true, adresa: `${st}, ${loc}, jud. ${jd}`, strada: st, localitate: loc, judet: jd };
}

// Din rândul de adresă scoate bucățile, dacă rândul are forma de mai sus; altfel null (adresă veche, scrisă liber).
export function desfaceAdresa(adresa) {
  const a = curat(adresa, 300);
  let m = a.match(/^(.+),\s*sector(?:ul)?\s*([1-6]),\s*(?:mun(?:icipiul|\.)?\s*)?bucure[sșş]ti$/i);
  if (m) return { strada: m[1].trim(), localitate: `Sector ${m[2]}`, judet: 'București' };
  m = a.match(/^(.+),\s*([^,]+),\s*jud(?:e[tțţ]ul|\.)?\s*([^,]+)$/i);
  if (m) { const jd = judetCurat(m[3]); const loc = m[2].trim(); if (jd && jd !== 'București' && loc.length >= 2) return { strada: m[1].trim(), localitate: loc, judet: jd }; }
  return null;
}
