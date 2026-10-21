// /api/panou-date → datele paginilor publice (/panou, /liber, /dovada): catalogul public (RPC catalog_public) și totalurile publice (RPC panou_public, sql/panou_public.sql).
// Fără date personale: doar prețurile pachetelor din Mostra și câteva totaluri. Cache 5 minute la margine.
import { URL_SB, KEY_SB, H } from '../lib/sb.js';

const rpc = async (fn) => {
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H(), body: '{}' });
    if (!r.ok) return null;
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  } catch { return null; }
};

// doar câmpurile pe care le arată pagina, din pachetele care apar și în Mostra
const pachetPublic = (p) => ({
  cod: p.cod, nume: p.nume, subtitlu: p.subtitlu || '', categorie: p.categorie, pret: Number(p.pret),
  eticheta: p.eticheta || null, perioada_minima_luni: p.perioada_minima_luni || null, include: Array.isArray(p.include) ? p.include : [],
  disponibil: p.disponibil !== false, unitate: p.unitate || null, conditii: p.conditii && p.conditii.separat ? { separat: Number(p.conditii.separat) } : null,
});
const CIFRE = ['firme_analizate', 'audituri', 'mostre', 'apeluri', 'clienti_activi', 'locuri_total', 'locuri_ocupate'];
// seria zilnică a Research-ului: doar zi + număr, cel mult 60 de zile
const serie = (v) => (Array.isArray(v) ? v.slice(-60).filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(String(d.zi))).map((d) => ({ zi: String(d.zi), n: Math.max(0, Number(d.n) || 0) })) : []);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  if (!URL_SB || !KEY_SB) { res.status(200).json({ catalog: null, cifre: null }); return; }
  const [cat, cif] = await Promise.all([rpc('catalog_public'), rpc('panou_public')]);
  const S = (cat && cat.setari) || {};
  const catalog = cat && Array.isArray(cat.pachete) ? {
    pachete: cat.pachete.filter((p) => p.in_mostra).map(pachetPublic),
    setari: { anual_reducere_procent: Number(S.anual_reducere_procent || 0) || null, pret_blocat_zile: Number(S.pret_blocat_zile || 0) || null },
  } : null;
  const cifre = cif && typeof cif === 'object'
    ? Object.fromEntries(CIFRE.filter((k) => cif[k] != null && Number.isFinite(Number(cif[k]))).map((k) => [k, Number(cif[k])])
      .concat(serie(cif.research_zilnic).length ? [['research_zilnic', serie(cif.research_zilnic)]] : [])
      .concat(cif.actualizat_la ? [['actualizat_la', cif.actualizat_la]] : []))
    : null;
  res.status(200).json({ catalog, cifre, la: new Date().toISOString() });
}
