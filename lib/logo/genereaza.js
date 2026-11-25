// Motorul de logo · un set: rețetele → validare → compilare (de două ori, pentru hash) → verificări → SVG-uri și planșe.
// Nu atinge rețeaua: întoarce fișierele în memorie; urcarea în bucket o face api/logo-genereaza.js (lib/logo/stocare.js).
import { valideaza, normalizeaza } from './reteta.js';
import { compileaza, svg } from './compileaza.js';
import { canvaskitProaspat } from './ck.js';
import { verifica, culoriPaleta, numeDinDosar, amprentaB64, amprentaPng, dinB64, asemanare } from './verificari.js';
import { plansaCandidat, plansaSet } from './plansa.js';

export const MAX_RETETE = 9;

// pregătește lista de comparații: amprente gata sau PNG-uri (capturi), cu nume
export async function comparatii(sharp, c = {}) {
  const out = []; const note = [];
  for (const x of c.alesign || []) { const a = dinB64(x.amprenta); if (a) out.push({ nume: `logoul AleSign ${x.id || ''}`.trim(), a }); else note.push(`amprenta ${x.id || '?'} nu are 512 octeți`); }
  for (const x of c.concurenti || []) {
    let a = x.amprenta ? dinB64(x.amprenta) : null;
    if (!a && x.png_base64) { try { a = await amprentaPng(sharp, Buffer.from(x.png_base64, 'base64')); } catch (e) { note.push(`${x.nume || 'concurent'}: imaginea nu s-a citit`); } }
    if (a) out.push({ nume: x.nume || 'un concurent', a }); else note.push(`${x.nume || 'concurent'}: fără amprentă`);
  }
  return { lista: out, note };
}

export async function genereazaSet(cerere, { sharp, prefix = '', pragMemorieMB = 600 } = {}) {
  const t0 = Date.now(); await canvaskitProaspat(pragMemorieMB);
  const retete = Array.isArray(cerere.retete) ? cerere.retete : [];
  if (!retete.length || retete.length > MAX_RETETE) return { ok: false, motiv: `retete: 1–${MAX_RETETE} rețete` };
  const ids = retete.map((r) => r && r.id); const dubluri = ids.filter((x, i) => ids.indexOf(x) !== i);
  const paleta = cerere.paleta || {}; const dosar = cerere.dosar || null;
  const ctx = { numeDosar: dosar ? numeDinDosar(dosar) : null, paleta: culoriPaleta(paleta) };
  const cmp = await comparatii(sharp, cerere.comparatii || {});
  const candidati = []; const respinse = []; const fisiere = []; const pentruSet = [];
  for (const r0 of retete) {
    const { reteta: r, schimbari: normalizari } = normalizeaza(r0); // formele echivalente sigure (proba 660)
    const v = valideaza(r, ctx);
    if (dubluri.includes(r && r.id)) v.erori.push(`${r.id}: id-ul apare de două ori în set`);
    if (!v.ok || v.erori.length) { respinse.push({ id: r && r.id, erori: v.erori, normalizari }); continue; }
    try {
      const c = await compileaza(r); const c2 = await compileaza(r);
      const h2 = svg(c2.CK, c2.forme.orizontal, r.culori, 'color').hash;
      const x = verifica(c, r, { paleta, dosar, hash2: h2, comparatii: cmp.lista, cuvinteDescriptive: cerere.cuvinte_descriptive || [] });
      // asemănarea cu ceilalți candidați din set (semnal)
      for (const p of pentruSet) { const s = asemanare(x.amprenta, p.amprenta); if (s >= 0.7) x.verificari.push({ cod: 'A2', opreste: false, trecut: false, valoare: Math.round(s * 100) / 100, prag: 0.7, motiv: `seamănă cu ${p.r.id} din același set (${Math.round(s * 100)} %)` }); }
      const baza = `${prefix}${r.id}/`;
      const f = {
        orizontal_svg: { cale: `${baza}orizontal.svg`, date: x.svg.orizontal.text, tip: 'image/svg+xml' },
        stivuit_svg: { cale: `${baza}stivuit.svg`, date: x.svg.stivuit.text, tip: 'image/svg+xml' },
        semn_svg: { cale: `${baza}semn.svg`, date: x.svg.semn.text, tip: 'image/svg+xml' },
        reteta_json: { cale: `${baza}reteta.json`, date: JSON.stringify(r, null, 1), tip: 'application/json' },
      };
      if (sharp) f.plansa_png = { cale: `${baza}plansa.png`, date: await plansaCandidat(sharp, c, r, paleta, dosar), tip: 'image/png' };
      Object.values(f).forEach((x2) => fisiere.push(x2));
      const fapt = x.verificari.find((q) => q.cod === 'F1');
      candidati.push({
        id: r.id, familie: r.familie, trecut: x.trecut, hash: x.svg.orizontal.hash, amprenta: amprentaB64(x.amprenta),
        reteta: r, normalizari,
        fapt: { cale: r.motiv.fapt.cale, citat: r.motiv.fapt.citat, gasit: fapt ? fapt.trecut : null, valoare: fapt && fapt.valoare ? fapt.valoare : null },
        font: c.font, verificari: x.verificari.map(({ cod, trecut, valoare, prag, motiv, opreste }) => ({ cod, trecut, opreste, valoare, prag, motiv })),
        noduri: { semn: x.svg.semn.noduri, orizontal: x.svg.orizontal.noduri, stivuit: x.svg.stivuit.noduri },
        fisiere: Object.fromEntries(Object.entries(f).map(([k, v2]) => [k, v2.cale])),
      });
      pentruSet.push({ c, r, amprenta: x.amprenta, trecut: x.trecut });
    } catch (e) { respinse.push({ id: r.id, erori: [`${r.id}: compilarea a eșuat: ${String(e.message || e).slice(0, 300)}`], normalizari }); }
  }
  if (sharp && pentruSet.length) fisiere.push({ cale: `${prefix}set.png`, date: await plansaSet(sharp, pentruSet, paleta), tip: 'image/png' });
  const raport = { set: cerere.set || 1, lead_id: cerere.lead_id, sarcina_id: cerere.sarcina_id, motor: 'alesign-logo v1', durata_ms: Date.now() - t0, comparatii: { numar: cmp.lista.length, note: cmp.note }, candidati, respinse };
  fisiere.push({ cale: `${prefix}raport.json`, date: JSON.stringify(raport, null, 1), tip: 'application/json' });
  return { ok: true, ...raport, plansa_set_png: pentruSet.length && sharp ? `${prefix}set.png` : null, raport_json: `${prefix}raport.json`, fisiere };
}
