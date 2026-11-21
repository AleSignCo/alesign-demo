// Contractul de prestÄƒri servicii AleSign&Co Â· v3 (13.10.2026): linii multiple, totaluri separate, credite, tranÈ™e, buget de reclame, platÄƒ anualÄƒ,
// indexare, prima lunÄƒ fÄƒrÄƒ risc, plus pachetul juridic (decizia 6 din v5.1): termenii de Ã®ndeplinire pe serviciu, statutul Clientului (firmÄƒ sau
// consumator, cu dreptul de retragere), licenÈ›a transferabilÄƒ, gÄƒzduirea aleasÄƒ, exportul, DPA (Anexa 2), garanÈ›iile, plafonul de rÄƒspundere, SLA.
// Un singur text, folosit de pagina /c/<slug> (HTML) È™i de PDF. Variabilele vin din contracte + setari (contract_date). Scris dupÄƒ lege, fÄƒrÄƒ avocat (decizia lui Alex, 13 oct.).

const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }) : '');
const gol = (v, alt = '[de completat]') => (v && String(v).trim() ? String(v).trim() : alt);

// Liniile contractului (din contracte.linii). Contractele vechi (fÄƒrÄƒ linii) primesc o singurÄƒ linie din pachet_nume + pret.
export function linii(d) {
  const L = Array.isArray(d.linii) && d.linii.length ? d.linii : [{ tip: 'pachet', cod: d.pachet_cod, nume: d.pachet_nume, cantitate: 1, pret_unitar: Number(d.pret || 0), recurent: d.tip === 'abonament', total: Number(d.pret || 0) }];
  return L.map((l) => {
    const cant = Number(l.cantitate || 1), pu = Number(l.pret_unitar || 0), total = l.total != null ? Number(l.total) : pu * cant;
    const unit = l.unitate === 'zi' ? 'zi' : l.unitate === 'ora' ? 'orÄƒ' : l.unitate === 'buc' ? 'buc' : null;
    let afis;
    if (l.tip === 'conditie') afis = l.cod === 'care_luna_4' ? `${nr(pu)} RON / lunÄƒ, din luna 4` : l.cod === 'care_plus_publicare' || l.cod === 'care_magazin_publicare' ? `${nr(pu)} RON / lunÄƒ, de la publicare` : String(l.cod || '').startsWith('cost_') ? `plÄƒtit de Client, separat: ${l.nota || ''}` : l.nota || '';
    else if (l.tip === 'inclus') afis = 'inclus, 0 RON';
    else if (l.tip === 'asteptare') afis = 'listÄƒ de aÈ™teptare, 0 RON';
    else if (l.tip === 'credit') afis = `${nr(total)} RON, o datÄƒ`;
    else afis = `${cant > 1 ? `${cant} ${unit || 'buc'} Ã— ${nr(pu)} = ` : ''}${nr(total)} RON${l.recurent ? ' / lunÄƒ' : ', o datÄƒ'}`;
    return { ...l, cantitate: cant, pret_unitar: pu, total, afis };
  });
}

export function totaluri(d) {
  const L = linii(d);
  const lunar = d.total_lunar != null ? Number(d.total_lunar) : L.filter((l) => l.recurent && ['pachet', 'modul', 'custom'].includes(l.tip)).reduce((s, l) => s + l.total, 0);
  const unic = d.total_unic != null ? Number(d.total_unic) : L.filter((l) => !l.recurent && ['pachet', 'modul', 'custom', 'credit'].includes(l.tip)).reduce((s, l) => s + l.total, 0);
  const anual = d.plata_anual && d.total_anual ? Number(d.total_anual) : null;
  const platitor = String((d.prestator || {}).platitor_tva) === 'true';
  const tva = platitor ? Number(d.tva_procent || 21) : 0;
  const cuTva = (p) => (platitor ? Math.round(p * (1 + tva / 100) * 100) / 100 : p);
  // v5.1 (regula 31): partea plÄƒtitÄƒ o datÄƒ se plÄƒteÈ™te pe tranÈ™e, dupÄƒ total; activ doar cu setarea transe_active = true (o valideazÄƒ Alexandru)
  const T = transeDin(d, L, unic);
  const unicAcum = T[0].suma;
  // prima platÄƒ: anual â†’ total anual + o datÄƒ (sau prima tranÈ™Äƒ); lunar â†’ prima lunÄƒ + o datÄƒ (sau prima tranÈ™Äƒ); unic â†’ o datÄƒ (sau prima tranÈ™Äƒ)
  const prima = (anual != null ? anual : lunar) + unicAcum;
  return { linii: L, lunar, unic, anual, platitor, tva, prima, transe: T, unicAcum, primaCuTva: cuTva(prima), lunarCuTva: cuTva(lunar), unicCuTva: cuTva(unic), unicAcumCuTva: cuTva(unicAcum), anualCuTva: anual != null ? cuTva(anual) : null };
}

// â€žPrimul an, totâ€ (regula 38): plata o datÄƒ + abonamentul pe 12 luni (minus lunile incluse Ã®ntr-un combo) sau Care-ul site-ului pe lunile neincluse
export function primulAnDin(d, t, careL4, careP) {
  if (!(t.unic > 0 || t.lunar > 0)) return null;
  const combo = t.linii.find((l) => l.tip === 'pachet' && l.nota && /dupÄƒ lunile incluse/.test(l.nota));
  const abon = t.lunar > 0 || !!combo;
  let suma = t.unic + t.lunar * 12;
  if (combo) { const luni = Number(d.luni_incluse || 3), abPret = Number(d.abonament_pret || 0); if (abPret > 0) suma += abPret * (12 - luni); }
  if (!abon) { if (careP) suma += Number(careP.pret_unitar || 0) * 12; else if (careL4) suma += Number(careL4.pret_unitar || 0) * 9; }
  return Math.round(suma * 100) / 100;
}

// TranÈ™ele (Bot Website v5.1, â€žPlata pe porÈ›iâ€; pragul coborÃ¢t la 1.900 pe 16 nov. 2026, hotÄƒrÃ¢rea din facturi-ce-mai-trebuie.md):
// sub 1.900 integral; 1.900â€“19.999 50 / 50 (semnare, aprobarea site-ului);
// de la 20.000 40 / 30 / 30 (semnare, alegerea direcÈ›iei, aprobarea site-ului); combo-urile 50 / 50, a doua la aprobare sau Ã®n ziua 30;
// Growth Year È™i plata anualÄƒ, integral. FÄƒrÄƒ setarea transe_active = true, totul rÄƒmÃ¢ne integral, ca azi.
export const PRAG_TRANSE = 1900; // sub el, douÄƒ facturi È™i douÄƒ reamintiri nu meritÄƒ: plata e integralÄƒ
export function transeDin(d, L, unic) {
  const integral = [{ procent: 100, suma: unic, cand: 'la semnare', poarta: null }];
  if (String(d.transe_active) !== 'true' || !(unic >= PRAG_TRANSE) || d.plata_anual) return integral;
  const coduri = (L || []).filter((l) => l.tip === 'pachet').map((l) => l.cod);
  // doar contractele cu un produs de site (Bot Website v5.1); restul catalogului rÄƒmÃ¢ne cum era
  const SITE = ['website', 'refresh', 'signature', 'schita', 'cinematic', 'magazin', 'magazin_cinematic', 'reparatii', 'lansare', 'relansare', 'relaunch_signature'];
  const SITE_MODULE = ['pagina', 'migrare', 'limba', 'pagina_signature', 'limba_signature', 'integrare', 'moment'];
  const areSite = coduri.some((c) => SITE.includes(c)) || (L || []).some((l) => l.tip === 'modul' && SITE_MODULE.includes(l.cod));
  if (!areSite || coduri.includes('an_crestere')) return integral;
  // pragurile È™i procentele se iau pe preÈ›ul proiectului; creditele (SchiÈ›a, Website nou, Audit) se scad din prima tranÈ™Äƒ (â€žPlata pe porÈ›iâ€)
  const brut = (L || []).filter((l) => !l.recurent && ['pachet', 'modul', 'custom'].includes(l.tip)).reduce((s, l) => s + Number(l.total || 0), 0);
  const credit = Math.max(0, brut - unic);
  const combo = (Array.isArray(d.combo_coduri) ? d.combo_coduri : ['lansare', 'relansare', 'relaunch_signature']).some((c) => c !== 'an_crestere' && coduri.includes(c));
  const atelier = coduri.some((c) => ['cinematic', 'magazin_cinematic'].includes(c));
  const parti = combo ? [[50, 'la semnare', null], [50, 'cÃ¢nd Clientul aprobÄƒ site-ul sau Ã®n ziua 30 de la semnare, oricare vine mai Ã®ntÃ¢i', 'C']]
    : brut < 20000 ? [[50, 'la semnare', null], [50, 'cÃ¢nd Clientul aprobÄƒ site-ul', 'C']]
    : [[40, 'la semnare', null], [30, atelier ? 'cÃ¢nd Clientul aprobÄƒ textele' : 'cÃ¢nd Clientul alege direcÈ›ia', atelier ? 'B' : 'A'], [30, 'cÃ¢nd Clientul aprobÄƒ site-ul', 'C']];
  const T = parti.map(([procent, cand, poarta]) => ({ procent, suma: Math.round(brut * procent / 100), cand, poarta, ...(combo && poarta === 'C' ? { zi30: true } : {}) }));
  T[T.length - 1].suma = Math.round((brut - T.slice(0, -1).reduce((s, x) => s + x.suma, 0)) * 100) / 100;
  if (credit > 0) {
    let rest = credit;
    for (const x of T) { const scad = Math.min(rest, x.suma); x.suma -= scad; rest -= scad; if (scad > 0) x.credit = scad; if (!rest) break; }
  }
  const out = T.filter((x) => x.suma > 0);
  if (out.length < 2 || out[0].poarta) return integral;
  // coada (regula 35): startul la peste 10 zile lucrÄƒtoare de la semnare â†’ rezervarea locului, 10 % din preÈ›, la semnare, scÄƒzutÄƒ din tranÈ™a 1,
  // iar tranÈ™a 1 se plÄƒteÈ™te cu 10 zile lucrÄƒtoare Ã®nainte de start; la Atelier, rezervarea e chiar SchiÈ›a (creditul ei)
  const start = d.start_la ? new Date(String(d.start_la).slice(0, 10) + 'T00:00:00Z') : null;
  const semnare = new Date(String(d.semnat_la || d.creat_la || new Date().toISOString()).slice(0, 10) + 'T00:00:00Z');
  if (start && zileLucratoareIntre(semnare, start) > 10 && !(atelier && credit > 0)) {
    const rez = Math.round(brut * 10 / 100);
    if (out[0].suma > rez) {
      out[0].suma -= rez; out[0].rezervare_scazuta = rez;
      const zi = inapoiZileLucratoare(start, 10);
      out[0].cand = `pe ${dataRo(zi)}, cu 10 zile lucrÄƒtoare Ã®nainte de data de start`; out[0].data = zi.toISOString().slice(0, 10);
      out.unshift({ procent: 10, suma: rez, cand: 'la semnare', poarta: null, rezervare: true });
    }
  }
  return out;
}

// planul tranÈ™elor, pentru baza de date (transe_plan, SQL 57): sumele fÄƒrÄƒ TVA + procentul de TVA, poarta, data fixÄƒ sau ziua 30
export function planTranse(d) {
  const T = totaluri(d);
  if (!T.transe || T.transe.length < 2) return [];
  return T.transe.map((x) => ({ procent: x.procent, suma: x.suma, tva_procent: T.platitor ? T.tva : 0, cand: x.cand, poarta: x.poarta || null, data: x.data || null, zi30: !!x.zi30, rezervare: !!x.rezervare, credit: x.credit || null }));
}

// zilele lucrÄƒtoare (luniâ€“vineri, ca public.zile_lucratoare din baza de date) Ã®ntre douÄƒ date, fÄƒrÄƒ prima
export function zileLucratoareIntre(a, b) {
  let n = 0; const d = new Date(a.getTime());
  while (d < b) { d.setUTCDate(d.getUTCDate() + 1); const z = d.getUTCDay(); if (z !== 0 && z !== 6) n++; }
  return n;
}
export function inapoiZileLucratoare(b, n) {
  const d = new Date(b.getTime()); let k = 0;
  while (k < n) { d.setUTCDate(d.getUTCDate() - 1); const z = d.getUTCDay(); if (z !== 0 && z !== 6) k++; }
  return d;
}

// Compatibil cu codul vechi (stripe.js, contract.js): â€žpreÈ›ulâ€ = prima platÄƒ.
export function pret(d) {
  const t = totaluri(d);
  const per = d.tip === 'abonament' ? (t.anual != null ? 'an' : 'lunÄƒ') : 'o datÄƒ';
  const baza = d.tip === 'abonament' ? (t.anual != null ? t.anual : t.lunar) : t.unic;
  return { baza, tva: t.tva, total: t.primaCuTva, platitor: t.platitor, per, prima: t.prima,
    text: t.platitor ? `${nr(baza)} RON + TVA ${t.tva}% / ${per}` : `${nr(baza)} RON / ${per} (neplÄƒtitor de TVA)` };
}

// â€”â€”â€” Pachetul juridic (decizia 6 din v5.1; Alex, 13 oct.: fÄƒrÄƒ avocat, dar totul legal) â€”â€”â€”
// Termenii de Ã®ndeplinire pe serviciu (Bot Website v5.1, â€žCum se livreazÄƒâ€). Termenul curge de la data de start È™i se mutÄƒ cu zilele
// Ã®n care AleSign aÈ™teaptÄƒ materiale, accese sau asset-uri de la Client (articolul 5).
export const SERVICII = {
  audit: { termen: '3 zile lucrÄƒtoare', runde: null, separat: null },
  reparatii: { termen: '7 zile lucrÄƒtoare de la primirea accesului de administrare È™i a backup-ului confirmat', runde: 'fÄƒrÄƒ runde de design; raport â€žÃ®nainte / dupÄƒâ€', separat: null },
  landing: { termen: '3 zile lucrÄƒtoare', runde: '1 rundÄƒ', separat: 'bugetul de reclame (minimum 1.500 RON / lunÄƒ), plÄƒtit de Client direct platformelor' },
  refresh: { termen: '7 zile lucrÄƒtoare', runde: '1 rundÄƒ de design; faptele (preÈ›uri, program, contact) se schimbÄƒ oricÃ¢nd', separat: 'domeniul, pe numele Clientului' },
  website: { termen: '10 zile lucrÄƒtoare', runde: '1 rundÄƒ de design; faptele (preÈ›uri, program, contact) se schimbÄƒ oricÃ¢nd', separat: 'domeniul, pe numele Clientului; aplicaÈ›ia de programÄƒri, dacÄƒ o foloseÈ™te' },
  pagina: { termen: '2 zile lucrÄƒtoare Ã®n plus la termenul site-ului; 3 zile lucrÄƒtoare pe un site deja publicat', runde: '1 rundÄƒ', separat: null },
  pagina_signature: { termen: '2 zile lucrÄƒtoare Ã®n plus la termenul site-ului; 5 zile lucrÄƒtoare pe un site deja publicat', runde: '1 rundÄƒ', separat: null },
  migrare: { termen: '5 zile lucrÄƒtoare Ã®n plus la termenul site-ului', runde: '1 rundÄƒ', separat: null },
  limba: { termen: '5 zile lucrÄƒtoare Ã®n plus la termenul site-ului', runde: '1 rundÄƒ', separat: 'corectura umanÄƒ a traducerii, la cost, dacÄƒ Clientul o vrea' },
  limba_signature: { termen: '7 zile lucrÄƒtoare Ã®n plus la termenul site-ului', runde: '1 rundÄƒ', separat: 'corectura umanÄƒ a traducerii, la cost, dacÄƒ Clientul o vrea' },
  signature: { termen: '15 zile lucrÄƒtoare', fondator: '25 de zile lucrÄƒtoare (Client fondator)', runde: '2 runde de design', separat: 'aplicaÈ›ia de programÄƒri; fonturile sau pozele stoc premium, la cost, pe numele Clientului' },
  moment: { termen: '10 zile lucrÄƒtoare de la primirea asset-ului (fotografie sau model 3D)', runde: '1 rundÄƒ', separat: 'asset-ul, la cost' },
  magazin: { termen: '25 de zile lucrÄƒtoare de la primirea acceselor', runde: '2 runde de design', separat: 'Shopify, programul de facturare È™i aplicaÈ›iile magazinului (aproximativ 190â€“510 RON / lunÄƒ), comisioanele de platÄƒ È™i AWB-urile, pe contul Clientului; producÈ›ia foto, la cost' },
  integrare: { termen: '10 zile lucrÄƒtoare de la primirea acceselor', runde: '1 rundÄƒ', separat: 'CRM-ul sau aplicaÈ›ia de programÄƒri a Clientului' },
  plata_site: { termen: '7 zile lucrÄƒtoare', runde: '1 rundÄƒ', separat: 'comisioanele procesatorului de plÄƒÈ›i, pe contul Clientului' },
  schita: { termen: '7 zile lucrÄƒtoare', runde: '1 rundÄƒ', separat: null },
  cinematic: { termen: '25â€“30 de zile lucrÄƒtoare de la primirea asset-urilor, dupÄƒ SchiÈ›Äƒ', runde: '3 runde de design', separat: 'asset-urile (fotografie, 3D), la cost' },
  magazin_cinematic: { termen: '35â€“40 de zile lucrÄƒtoare de la primirea acceselor È™i a asset-urilor', runde: '3 runde de design', separat: 'ca la Magazin, plus asset-urile, la cost' },
  cereri: { termen: 'la activare', runde: null, separat: null },
};
// produsele care construiesc un site gÄƒzduit (abonamentele includ Refresh; Foundation È™i combo-urile includ Website nou)
const SITE_CONSTRUIT = ['website', 'refresh', 'signature', 'cinematic', 'landing', 'lansare', 'relansare', 'relaunch_signature', 'foundation', 'an_crestere'];
const MAGAZIN = ['magazin', 'magazin_cinematic'];
const ATELIER = ['cinematic', 'magazin_cinematic', 'schita'];
const LINIE_VITEZA = ['website', 'refresh', 'signature', 'landing', 'lansare', 'relansare', 'relaunch_signature', 'foundation'];

// ce conÈ›ine contractul: o singurÄƒ privire pe linii, folositÄƒ de toate articolele
// Contractul de Fondator (lista SISTEM, FONDATOR_BF): oferta vine din contract_date â†’ oferta (SQL 108); e â€žde Fondatorâ€ doar cÃ¢nd e contractul FundaÈ›iei
export function fondatorDin(d) {
  const o = d && d.oferta;
  if (!o || o.cod !== 'FONDATOR_BF' || !o.fondator) return null;
  const linii = Array.isArray(d.linii) ? d.linii : [];
  if (!linii.some((l) => l && l.cod === 'fundatie')) return null;
  const f = o.fondator;
  const liv = (f.fundatie && f.fundatie.livrare) || {};
  const ziLuna = (x) => (x ? new Date(x).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', timeZone: 'Europe/Bucharest' }) : '');
  return {
    prenume: o.prenume || '', persoana: o.persoana || '', firma: o.firma || d.firma || '', domeniu: o.domeniu || '', oras: o.oras || '',
    nr: Number(f.nr || 1), max: Number(f.max_clienti || 3), platiti: Number(f.platiti || 0), luni: Number(f.luni || 12),
    adusProcent: Number(f.adus_procent || 50), anualProcent: Number(f.anual_procent || 20),
    pret: Number((f.fundatie && f.fundatie.pret) || 500), include: (f.fundatie && Array.isArray(f.fundatie.include)) ? f.fundatie.include : [],
    livrare: liv.de_la && liv.pana_la ? `${ziLuna(liv.de_la)} È™i ${ziLuna(liv.pana_la)} ${new Date(liv.pana_la).getFullYear()}` : '',
    preturi: Array.isArray(f.preturi) ? f.preturi : [],
    linkRecomandare: o.link_recomandare || '', codRecomandare: o.cod_recomandare || '',
  };
}

// GaranÈ›ia de 90 de zile (13 nov. 2026): existÄƒ doar dacÄƒ pe contract e scris pragul (contracte.garantie = { prag, ce })
export function garantie90(d) {
  const g = d && d.garantie && typeof d.garantie === 'object' ? d.garantie : null;
  const prag = g ? Math.floor(Number(g.prag)) : 0;
  if (!g || !(prag > 0)) return null;
  return { prag, ce: String(g.ce || '').trim() || 'cererile pornite de pe site È™i mÄƒsurate de sistem: apeluri, mesaje pe WhatsApp, emailuri, programÄƒri È™i formulare trimise' };
}

export function profil(d) {
  const t = totaluri(d);
  const cod = (l) => String(l.cod || '');
  const pachete = t.linii.filter((l) => l.tip === 'pachet').map(cod);
  const module = t.linii.filter((l) => l.tip === 'modul').map(cod);
  const toate = [...pachete, ...module];
  const abon = d.tip === 'abonament' || t.lunar > 0;
  const are = (...c) => c.some((x) => toate.includes(x));
  const site = abon || are(...SITE_CONSTRUIT);
  const magazin = are(...MAGAZIN);
  const gazduire = ['alesign', 'client_vercel', 'client_fisiere'].includes(d.gazduire) ? d.gazduire : 'alesign';
  const care = are('care', 'care_plus', 'care_magazin', 'care_magazin_mare') || t.linii.some((l) => l.cod === 'care_luna_4') || (site && gazduire !== 'client_fisiere' && (abon || are('website', 'signature')));
  return {
    t, pachete, module, toate, abon, are, site, magazin, gazduire, care,
    pf: d.client_tip === 'persoana_fizica',
    signature: are('signature', 'relaunch_signature'),
    atelier: are(...ATELIER),
    viteza: are(...LINIE_VITEZA) && gazduire !== 'client_fisiere',
    reparatii: are('reparatii'),
    fondator: !!d.fondator && are('signature', 'relaunch_signature', 'cinematic'),
    carePret: Number(d.care_pret || 240),
  };
}

export function clauze(d) {
  const FO = fondatorDin(d);
  const P = d.prestator || {};
  const C = d.client || {};
  const X = profil(d);
  const { t, abon, pf } = X;
  const min = Number(d.perioada_minima_luni || 0);
  const moduri = Array.isArray(d.plata_moduri) && d.plata_moduri.length ? d.plata_moduri : ['card', 'transfer'];
  const cuCard = moduri.includes('card') && String(d.stripe_activ) === 'true';
  const cum = cuCard ? 'cu cardul (prin Stripe) sau prin transfer bancar Ã®n maximum 5 zile lucrÄƒtoare de la semnare' : 'prin transfer bancar, Ã®n maximum 5 zile lucrÄƒtoare de la semnare';
  const idx = Number(d.indexare_procent || 10);
  const ani = Number(d.anual_inghetat_ani || 2);
  const tvaNota = t.platitor ? '' : ` AleSign nu este plÄƒtitor de TVA la data semnÄƒrii${pf ? ', deci preÈ›urile de mai sus sunt finale' : ''}; dacÄƒ devine, TVA se adaugÄƒ conform legii, cu notificare prealabilÄƒ.`;
  const credite = t.linii.filter((l) => l.tip === 'credit');
  const buget = t.linii.find((l) => l.tip === 'conditie' && l.cod === 'buget_reclame');
  const careL4 = t.linii.find((l) => l.tip === 'conditie' && l.cod === 'care_luna_4');
  const asteptare = t.linii.filter((l) => l.tip === 'asteptare');

  // â€”â€”â€” 4. PreÈ›ul È™i plata â€”â€”â€”
  const pretP = [];
  if (abon) {
    pretP.push(`Abonamentul costÄƒ ${nr(t.lunar)} RON pe lunÄƒ${t.platitor ? ` plus TVA ${t.tva}%` : ''}${t.unic > 0 ? `, la care se adaugÄƒ serviciile plÄƒtite o singurÄƒ datÄƒ, Ã®n valoare totalÄƒ de ${nr(t.unic)} RON${t.platitor ? ' plus TVA' : ''}` : t.unic < 0 ? `, din care se scade creditul de ${nr(-t.unic)} RON, o singurÄƒ datÄƒ, pe prima facturÄƒ` : ''}.${tvaNota}`);
    if (t.anual != null) pretP.push(`Clientul a ales plata anualÄƒ: ${nr(t.anual)} RON pe an${t.platitor ? ' plus TVA' : ''}, adicÄƒ 12 luni cu o reducere de ${nr(Math.round(100 - (t.anual / (t.lunar * 12)) * 100))}% faÈ›Äƒ de plata lunarÄƒ, plÄƒtiÈ›i Ã®n avans. PreÈ›ul abonamentului rÄƒmÃ¢ne neschimbat ${ani} ani de la data activÄƒrii${d.pret_inghetat_pana ? ` (pÃ¢nÄƒ pe ${dataRo(d.pret_inghetat_pana)})` : ''}, iar indexarea de la articolul 4.6 nu se aplicÄƒ Ã®n aceastÄƒ perioadÄƒ.`);
    else pretP.push(`Plata se face Ã®n avans, lunar. Prima lunÄƒ${t.unic > 0 ? (t.transe.length > 1 ? `, Ã®mpreunÄƒ cu prima tranÈ™Äƒ a serviciilor plÄƒtite o datÄƒ (${nr(t.unicAcum)} RON),` : ', Ã®mpreunÄƒ cu serviciile plÄƒtite o datÄƒ,') : ''} se plÄƒteÈ™te ${cum}. Lunile urmÄƒtoare se plÄƒtesc la aceeaÈ™i zi a fiecÄƒrei luni${cuCard ? ': automat, dacÄƒ s-a ales cardul, sau pe baza facturii, Ã®n 5 zile lucrÄƒtoare de la emitere, dacÄƒ s-a ales transferul' : ', pe baza facturii, Ã®n 5 zile lucrÄƒtoare de la emitere'}.`);
  } else {
    pretP.push(`PreÈ›ul serviciilor este de ${nr(t.unic)} RON${t.platitor ? ` plus TVA ${t.tva}%` : ''}, plÄƒtit o singurÄƒ datÄƒ.${tvaNota}`);
    if (t.transe.length > 1) pretP.push(`Plata se face Ã®n ${t.transe.length} tranÈ™e: ${t.transe.map((x, i) => `${i + 1}) ${nr(x.suma)} RON ${x.rezervare ? `la semnare, ca rezervare a locului (10% din preÈ›)` : `${x.cand} (${x.procent}% din preÈ›${x.rezervare_scazuta ? ', minus rezervarea' : ''}${x.credit ? `, minus creditul de ${nr(x.credit)} RON` : ''})`}`).join('; ')}. Prima tranÈ™Äƒ se plÄƒteÈ™te ${cum}.`);
    else pretP.push(`Plata se face integral, ${cum}.${d.start_la ? '' : ' Lucrul Ã®ncepe Ã®n ziua Ã®n care plata este confirmatÄƒ.'}`);
  }
  if (t.transe.length > 1) {
    pretP.push(`Fiecare tranÈ™Äƒ urmÄƒtoare se cere pe email, cu link de platÄƒ, Ã®n ziua Ã®n care se ajunge la momentul ei, È™i se plÄƒteÈ™te Ã®n 5 zile lucrÄƒtoare. Site-ul se publicÄƒ pe domeniul Clientului doar dupÄƒ plata integralÄƒ.`);
    pretP.push(pf
      ? `DacÄƒ Clientul opreÈ™te proiectul dupÄƒ termenul de retragere (articolul 15), plÄƒteÈ™te doar etapele Ã®ncepute; tranÈ™ele plÄƒtite pentru etapele neÃ®ncepute i se restituie Ã®n bani, Ã®n 14 zile, sau, dacÄƒ preferÄƒ, devin credit pe orice serviciu AleSign, valabil 6 luni. Clientul primeÈ™te tot ce a aprobat pÃ¢nÄƒ atunci: brief-ul È™i direcÈ›iile, Ã®n PDF, È™i textele aprobate.`
      : `Clientul poate opri proiectul oricÃ¢nd, printr-un email (denunÈ›are unilateralÄƒ, articolul 1276 din Codul civil; pÄƒrÈ›ile convin ca dreptul sÄƒ poatÄƒ fi exercitat È™i dupÄƒ Ã®nceperea lucrului). PreÈ›ul opririi sunt tranÈ™ele deja plÄƒtite: nu se restituie Ã®n bani, ci devin credit, valabil 6 luni, pe orice serviciu AleSign. TranÈ™ele la care proiectul nu a ajuns nu se mai datoreazÄƒ. Clientul primeÈ™te tot ce a aprobat pÃ¢nÄƒ atunci: brief-ul È™i direcÈ›iile, Ã®n PDF, È™i textele aprobate.${t.transe[0].rezervare ? ' DacÄƒ oprirea are loc Ã®nainte de data de start, rezervarea devine credit Ã®n aceleaÈ™i condiÈ›ii.' : ''}`);
    if (X.signature) pretP.push(`GaranÈ›ia direcÈ›iei: Clientul alege dintre douÄƒ direcÈ›ii de design. DacÄƒ nu Ã®l convinge niciuna, AleSign propune Ã®ncÄƒ un set. DacÄƒ nici acesta nu Ã®l convinge, proiectul se opreÈ™te, iar AleSign restituie integral sumele plÄƒtite pentru site, Ã®n 10 zile lucrÄƒtoare.`);
    pretP.push(`DacÄƒ Clientul nu aprobÄƒ site-ul Ã®n 30 de zile de la prezentarea lui, proiectul se Ã®nchide, iar tranÈ™ele plÄƒtite rÄƒmÃ¢n la AleSign${pf ? ' pentru munca fÄƒcutÄƒ pÃ¢nÄƒ atunci' : ''}; previzualizarea rÄƒmÃ¢ne disponibilÄƒ Ã®n aceste 30 de zile, iar o rundÄƒ nouÄƒ de lucru se oferteazÄƒ separat. DacÄƒ AleSign opreÈ™te proiectul din motive care È›in de AleSign, Clientul primeÈ™te tot ce s-a lucrat, iar tranÈ™ele plÄƒtite pentru etapele neÃ®ncepute se restituie integral.`);
  }
  if (d.start_la) pretP.push(`Data de start a lucrului este ${dataRo(d.start_la)}. Termenele din Anexa 1 curg de la ea È™i se mutÄƒ cu zilele Ã®n care AleSign aÈ™teaptÄƒ materiale, accese sau aprobÄƒri de la Client.`);
  pretP.push(`Prima platÄƒ este de ${nr(t.prima)} RON${t.platitor ? ` plus TVA, adicÄƒ ${nr(t.primaCuTva)} RON` : ''}.`);
  if (credite.length) pretP.push(`Creditele din Anexa 1 (${credite.map((l) => `${l.nume}: ${nr(-l.total)} RON`).join('; ')}) se scad o singurÄƒ datÄƒ, din ${t.transe.length > 1 ? 'prima tranÈ™Äƒ' : 'prima facturÄƒ'}, È™i nu se restituie Ã®n bani.`);
  // valul 2 (regulile 21â€“22): Care Plus sau Care Magazin de la publicare; cu abonament, diferenÈ›a de nivel apare ca linie lunarÄƒ
  const careP = t.linii.find((l) => l.tip === 'conditie' && (l.cod === 'care_plus_publicare' || l.cod === 'care_magazin_publicare'));
  if (careP) pretP.push(`De la publicare, site-ul intrÄƒ Ã®n serviciul ${careP.cod === 'care_magazin_publicare' ? 'Care Magazin (test zilnic de cumpÄƒrare, facturi È™i AWB verificate, tema È™i aplicaÈ›iile la zi), minimum 3 luni' : 'Care Plus (gÄƒzduire, integrÄƒrile verificate zilnic, test trimestrial pe telefonul de referinÈ›Äƒ)'}, ${nr(careP.pret_unitar)} RON pe lunÄƒ${t.platitor ? ' plus TVA' : ''}, facturat lunar; un singur serviciu Care pe site, cel al piesei celei mai complexe.`);
  // valul 2 (regula 38): â€žPrimul an, totâ€, ca interval, separat de total
  const costuri = t.linii.filter((l) => l.tip === 'conditie' && String(l.cod || '').startsWith('cost_'));
  const primulAn = primulAnDin(d, t, careL4, careP);
  if (primulAn != null) pretP.push(`Primul an, tot: ${nr(primulAn)} RON${t.platitor ? ' plus TVA' : ''} (serviciile plÄƒtite o datÄƒ, plus ${abon ? 'abonamentul' : 'serviciul Care'} pe 12 luni, minus lunile incluse)${costuri.length ? `, plus costurile plÄƒtite de Client direct furnizorilor, estimate Ã®ntre ${nr(costuri.reduce((s2, l) => s2 + Number((l.interval_an || {}).min || 0), 0))} È™i ${nr(costuri.reduce((s2, l) => s2 + Number((l.interval_an || {}).max || 0), 0))} RON pe an (${costuri.map((l) => l.nota).join('; ')})` : ''}.`);
  if (careL4) pretP.push(`Din a 4-a lunÄƒ de la publicarea site-ului, Clientul intrÄƒ automat Ã®n serviciul Care (gÄƒzduire, vitezÄƒ, securitate, actualizÄƒri, backup), ${nr(careL4.pret_unitar)} RON pe lunÄƒ, plÄƒtit lunar, pe bazÄƒ de facturÄƒ, cu posibilitatea de a renunÈ›a oricÃ¢nd cu preaviz de 30 de zile. DacÄƒ Ã®ntre timp Clientul ia un abonament, Care este inclus Ã®n el.`);
  if (buget) pretP.push(`Bugetul de reclame nu este inclus Ã®n preÈ›urile de mai sus: este al Clientului, se plÄƒteÈ™te de Client direct platformelor (Meta, Google, TikTok) È™i este de minimum ${nr(d.buget_reclame_min || 1500)} RON pe lunÄƒ pentru fiecare lunÄƒ cu campanii active. FÄƒrÄƒ buget, campaniile nu pot rula, iar restul serviciilor continuÄƒ normal.`);
  pretP.push(`Pentru fiecare platÄƒ AleSign emite facturÄƒ, transmisÄƒ pe email${pf ? '' : ' È™i, unde legea o cere, prin sistemul naÈ›ional e-Factura'}. Facturile se gÄƒsesc È™i Ã®n spaÈ›iul Clientului, la â€žContract È™i facturiâ€.`);
  pretP.push(`DacÄƒ o platÄƒ Ã®ntÃ¢rzie mai mult de 10 zile, AleSign poate suspenda serviciile pÃ¢nÄƒ la platÄƒ, cu o notificare pe email; site-ul rÄƒmÃ¢ne online Ã®ncÄƒ 30 de zile, iar nimic nu se È™terge 90 de zile. DacÄƒ Ã®ntÃ¢rzie mai mult de 30 de zile, AleSign poate Ã®nceta contractul${pf ? '' : ', iar sumele datorate pentru perioada minimÄƒ rÄƒmÃ¢n scadente'}.`);
  if (abon) pretP.push(`4.6. PreÈ›ul abonamentului se indexeazÄƒ cu ${idx}% o datÄƒ pe an, la fiecare aniversare a datei activÄƒrii, cu o notificare pe email cu 30 de zile Ã®nainte${t.anual != null ? ', dupÄƒ perioada cu preÈ› Ã®ngheÈ›at' : ''}. Clientul care nu acceptÄƒ indexarea poate Ã®nceta contractul la data ei, fÄƒrÄƒ alte costuri.`);

  // â€”â€”â€” 3. Durata â€”â€”â€”
  const durataP = abon
    ? [
        `Contractul intrÄƒ Ã®n vigoare la data primei plÄƒÈ›i (â€ždata activÄƒriiâ€)${min ? ` È™i se Ã®ncheie pe o perioadÄƒ minimÄƒ de ${min} ${min === 1 ? 'lunÄƒ' : 'luni'}. DupÄƒ perioada minimÄƒ, se prelungeÈ™te automat` : ' È™i se prelungeÈ™te automat'}, lunÄƒ de lunÄƒ, pÃ¢nÄƒ cÃ¢nd una dintre pÄƒrÈ›i Ã®l Ã®nceteazÄƒ cu un preaviz de 30 de zile, transmis pe email sau din spaÈ›iul Clientului (â€žÃŽncheie colaborareaâ€).`,
        d.prima_luna_fara_risc
          ? `Prima lunÄƒ fÄƒrÄƒ risc: Ã®n primele 30 de zile de la activare, Clientul poate Ã®nceta contractul printr-un simplu email, fÄƒrÄƒ motiv È™i fÄƒrÄƒ alte sume de platÄƒ. ÃŽn acest caz perioada minimÄƒ nu se mai aplicÄƒ, plata primei luni rÄƒmÃ¢ne fÄƒcutÄƒ, iar materialele de conÈ›inut livrate Ã®n aceastÄƒ lunÄƒ (postÄƒri, texte, rapoarte) rÄƒmÃ¢n ale Clientului; site-ul inclus Ã®n abonament urmeazÄƒ regula de la articolul 14. ${t.anual != null ? 'La plata anualÄƒ, AleSign restituie Ã®n 10 zile lucrÄƒtoare diferenÈ›a dintre suma plÄƒtitÄƒ È™i preÈ›ul unei luni la tarif lunar. ' : ''}DupÄƒ ziua 30, se aplicÄƒ perioada minimÄƒ de mai sus.`
          : null,
        min && !pf ? `${d.prima_luna_fara_risc ? 'DupÄƒ prima lunÄƒ, ' : ''}Clientul poate Ã®ncheia contractul Ã®nainte de finalul perioadei minime doar plÄƒtind lunile rÄƒmase din perioada minimÄƒ.` : null,
        min && pf ? `Clientul consumator poate Ã®nceta contractul oricÃ¢nd, cu preaviz de 30 de zile, fÄƒrÄƒ penalitÄƒÈ›i; site-ul inclus Ã®n abonament urmeazÄƒ regula de la articolul 14.` : null,
      ].filter(Boolean)
    : [
        `Contractul intrÄƒ Ã®n vigoare la data plÄƒÈ›ii${pf ? ' (cu regula de Ã®nceput de la articolul 15)' : ''} È™i se Ã®ncheie la livrarea serviciilor din Anexa 1: pentru site, la publicarea pe domeniu dupÄƒ aprobarea Clientului (articolul 5); pentru celelalte servicii, la livrarea confirmatÄƒ pe email de Client sau, Ã®n lipsa unui rÄƒspuns, la 5 zile lucrÄƒtoare dupÄƒ ce AleSign anunÈ›Äƒ livrarea.${d.abonament_cod && d.abonament_nume ? ` DacÄƒ oferta conÈ›ine È™i luni de abonament (${d.abonament_nume}), acestea Ã®ncep la activare È™i, dupÄƒ lunile incluse, abonamentul continuÄƒ lunar la preÈ›ul din catalog, cu aceleaÈ™i reguli de Ã®ncetare ca la articolul 14.` : ''}`,
        X.care ? `Serviciul Care È™i gÄƒzduirea (articolul 9) continuÄƒ dupÄƒ livrare, lunÄƒ de lunÄƒ, pÃ¢nÄƒ la Ã®ncetarea lor cu preaviz de 30 de zile.` : null,
      ].filter(Boolean);

  // â€”â€”â€” 5. Termenele È™i acceptarea â€”â€”â€”
  const termP = [
    `Termenul fiecÄƒrui serviciu, numÄƒrul rundelor de revizii È™i ce plÄƒteÈ™te Clientul separat sunt scrise, serviciu cu serviciu, Ã®n Anexa 1. Termenele se socotesc Ã®n zile lucrÄƒtoare (luniâ€“vineri), curg de la data de start${d.start_la ? '' : ' (ziua confirmÄƒrii plÄƒÈ›ii, dacÄƒ nu s-a stabilit alta)'} È™i se mutÄƒ cu zilele Ã®n care AleSign aÈ™teaptÄƒ materiale, accese, aprobÄƒri sau asset-uri de la Client.`,
    `DacÄƒ materialele nu vin, AleSign trimite un memento la 2 È™i la 5 zile. La 14 zile, proiectul iese din programul de lucru È™i reintrÄƒ la prima datÄƒ liberÄƒ, comunicatÄƒ Clientului. La 30 de zile, proiectul intrÄƒ Ã®n pauzÄƒ${pf ? '' : ', iar sumele plÄƒtite devin credit, valabil 6 luni'}. La 90 de zile, proiectul se Ã®nchide, iar Clientul primeÈ™te tot ce a aprobat pÃ¢nÄƒ atunci.`,
    X.site || X.magazin
      ? `Acceptarea site-ului: nimic nu se publicÄƒ pe domeniul Clientului fÄƒrÄƒ aprobarea lui. Site-ul se aprobÄƒ doar din butonul â€žAprob site-ulâ€ din spaÈ›iul Clientului, confirmat cu un cod unic trimis pe emailul din contract (articolul 18). Un â€žokâ€ pe email sau pe WhatsApp nu È›ine loc de aprobare. Aprobarea Ã®nseamnÄƒ acceptarea lucrÄƒrii; defectele descoperite dupÄƒ aceea intrÄƒ Ã®n garanÈ›ia de la articolul 11.`
      : `Acceptarea: livrarea se confirmÄƒ pe email sau din spaÈ›iul Clientului. DacÄƒ, Ã®n 5 zile lucrÄƒtoare de la anunÈ›ul livrÄƒrii, Clientul nu trimite observaÈ›ii, livrarea se considerÄƒ acceptatÄƒ.`,
    `O rundÄƒ de revizii Ã®nseamnÄƒ o listÄƒ de modificÄƒri trimisÄƒ o datÄƒ, pe aceeaÈ™i versiune. Faptele (preÈ›uri, program, telefon, adresÄƒ, echipÄƒ) se schimbÄƒ oricÃ¢nd, fÄƒrÄƒ sÄƒ consume o rundÄƒ. Rundele Ã®n plus, textele noi È™i secÈ›iunile noi se oferteazÄƒ separat, Ã®nainte de lucru.`,
    X.atelier ? `La proiectele Atelier, Alexandru lucreazÄƒ personal pe proiect. DacÄƒ lipseÈ™te peste 14 zile, Clientul alege: aÈ™teaptÄƒ, cu termenul mutat, sau opreÈ™te proiectul È™i primeÈ™te tot ce s-a fÄƒcut, iar tranÈ™ele pentru etapele neÃ®ncepute Ã®i revin integral.` : null,
  ].filter(Boolean);

  // â€”â€”â€” 6. Ce face AleSign â€”â€”â€”
  const aleP = [
    `LivreazÄƒ serviciile din Anexa 1 la termenele de acolo, cu grija unui profesionist.`,
    `RÄƒspunde mesajelor Clientului Ã®n cel mult o zi lucrÄƒtoare, pe email sau WhatsApp.`,
    X.care ? `Pe durata serviciului Care: timpul de reacÈ›ie la o problemÄƒ este de cel mult 4 ore lucrÄƒtoare (luniâ€“vineri, 09:00â€“18:00). ÃŽn afara acestui program, sistemul automat de monitorizare revine singur la ultima versiune bunÄƒ a site-ului È™i Ã®l alerteazÄƒ pe Alexandru; nu existÄƒ gardÄƒ umanÄƒ Ã®n weekend. Un formular sau o programare care nu mai funcÈ›ioneazÄƒ se trateazÄƒ ca incident critic. AleSign promite timp de reacÈ›ie, nu un procent de disponibilitate.` : null,
    abon ? `Trimite lunar un raport scurt, pe Ã®nÈ›elesul Clientului: ce s-a fÄƒcut, ce a produs, ce urmeazÄƒ.` : null,
    `PÄƒstreazÄƒ confidenÈ›iale informaÈ›iile primite de la Client (accese, date despre clienÈ›i, cifre) È™i le foloseÈ™te doar pentru acest contract, È™i dupÄƒ Ã®ncetarea lui.`,
    `PublicÄƒ Ã®n numele Clientului doar materiale care au trecut de verificÄƒrile automate È™i de aprobarea lui Alexandru, Ã®n limitele mandatului de la articolul 2. CorecteazÄƒ sau retrage un material Ã®n cel mult o zi lucrÄƒtoare de la cererea Clientului.`,
    `LucreazÄƒ cu accese date de Client prin roluri de partener sau prin autorizare (OAuth), niciodatÄƒ cu parolele lui. Cheile de acces se pÄƒstreazÄƒ criptat È™i se revocÄƒ la Ã®ncetarea contractului sau la cererea Clientului.`,
    `Èšine evidenÈ›a fiecÄƒrei generÄƒri, aprobÄƒri, publicÄƒri È™i fiecÄƒrui acces (cine, cÃ¢nd, ce versiune), pe durata contractului È™i 12 luni dupÄƒ.`,
  ].filter(Boolean);

  // â€”â€”â€” 7. Ce face Clientul â€”â€”â€”
  const cliP = [
    `Transmite materialele È™i accesele necesare (fotografii, logo, acces la fiÈ™a Google, domeniu, informaÈ›ii despre servicii È™i preÈ›uri) Ã®n cel mult 5 zile lucrÄƒtoare de la activare, prin pagina de onboarding primitÄƒ pe email. Termenele din Anexa 1 curg de la primirea lor.`,
    `Decide ce accese acordÄƒ. FÄƒrÄƒ un acces, AleSign livreazÄƒ materialele fÄƒrÄƒ publicare È™i fÄƒrÄƒ raportare din contul respectiv.`,
    `Spune Ã®n scris, la Ã®nceput, ce nu vrea sÄƒ aparÄƒ niciodatÄƒ Ã®n numele lui È™i anunÈ›Äƒ din timp orice schimbare de preÈ›uri, program, servicii sau echipÄƒ; AleSign lucreazÄƒ cu ultimele informaÈ›ii primite.`,
    X.site || X.magazin ? `La alegerea direcÈ›iei È™i la recepÈ›ia site-ului rÄƒspunde Ã®n cel mult 2 zile lucrÄƒtoare. Lipsa rÄƒspunsului decaleazÄƒ termenele, nu obligaÈ›iile de platÄƒ.` : null,
    `RÄƒspunde de legalitatea È™i adevÄƒrul informaÈ›iilor pe care le furnizeazÄƒ (preÈ›uri, promoÈ›ii, autorizaÈ›ii, titluri profesionale) È™i declarÄƒ cÄƒ are drepturile asupra imaginilor trimise, inclusiv acordul persoanelor care apar Ã®n ele.`,
    X.site || X.magazin ? `ÃŽnregistreazÄƒ domeniul pe numele sÄƒu (AleSign Ã®l ghideazÄƒ) È™i Ã®l reÃ®nnoieÈ™te la timp; AleSign Ã®l anunÈ›Äƒ cu 30, 14, 7 È™i 1 zi Ã®nainte de expirare, dacÄƒ data e cunoscutÄƒ.` : null,
    X.magazin ? `Este comerciantul: contul Shopify, contul de plÄƒÈ›i, programul de facturare È™i contul de curierat sunt pe numele lui, iar banii din vÃ¢nzÄƒri intrÄƒ direct la el. AleSign construieÈ™te È™i Ã®ntreÈ›ine tema, nu vinde Ã®n numele Clientului.` : null,
    buget ? `Pune la dispoziÈ›ie bugetul de reclame È™i accesul la conturile de reclame (sau le creeazÄƒ cu ajutorul AleSign), Ã®n numele ${pf ? 'sÄƒu' : 'firmei sale'}.` : null,
    `Nu solicitÄƒ servicii Ã®n afara Anexei 1 fÄƒrÄƒ un acord scris; ce e Ã®n plus se oferteazÄƒ separat, fÄƒrÄƒ surprize.`,
  ].filter(Boolean);

  // â€”â€”â€” 8. Proprietatea È™i licenÈ›a â€”â€”â€”
  const propP = [
    X.site || X.magazin
      ? `DupÄƒ plata integralÄƒ, Clientul primeÈ™te o licenÈ›Äƒ perpetuÄƒ, gratuitÄƒ È™i transferabilÄƒ odatÄƒ cu ${pf ? 'activitatea' : 'firma'} sau cu domeniul, pe tot site-ul livrat, inclusiv pe componentele de È™ablon sau de kit, Ã®n forma livratÄƒ. Textele, imaginile create special pentru Client È™i conÈ›inutul site-ului devin proprietatea Clientului dupÄƒ plata integralÄƒ. PÃ¢nÄƒ atunci, rÄƒmÃ¢n ale AleSign.`
      : `Materialele livrate special pentru Client (texte, imagini create, rapoarte, strategii) devin proprietatea Clientului dupÄƒ plata lor integralÄƒ. PÃ¢nÄƒ atunci, rÄƒmÃ¢n ale AleSign.`,
    `Sistemul AleSystem Design, agenÈ›ii automatizaÈ›i, È™abloanele È™i kitul, procesele È™i know-how-ul rÄƒmÃ¢n proprietatea AleSign. AleSign pÄƒstreazÄƒ dreptul de a refolosi componentele generale pentru alÈ›i clienÈ›i, dar nu identitatea Clientului (numele, logo-ul, textele, fotografiile lui).`,
    X.signature ? `Exclusivitatea de design (Signature): timp de 12 luni de la publicare, AleSign nu foloseÈ™te direcÈ›ia de design aleasÄƒ de Client (paleta, tipografia È™i compoziÈ›ia kitului, Ã®n configuraÈ›ia lui) pentru un alt client din aceeaÈ™i niÈ™Äƒ${d.nisa ? ` (${d.nisa})` : ''} È™i din aceeaÈ™i localitate${d.localitate ? ` (${d.localitate})` : ''}.` : null,
    `ConÈ›inutul generat cu ajutorul inteligenÈ›ei artificiale: AleSign transferÄƒ Clientului toate drepturile pe care le are asupra lui. Legea nu garanteazÄƒ protecÈ›ia prin drept de autor a unui conÈ›inut generat automat, iar AleSign nu promite aceastÄƒ protecÈ›ie. AleSign verificÄƒ originalitatea faÈ›Äƒ de sursele cunoscute È™i foloseÈ™te doar imagini, fonturi È™i asset-uri pentru care existÄƒ licenÈ›Äƒ.`,
    `LicenÈ›ele terÈ›ilor (fonturi, poze stoc premium, modele 3D, aplicaÈ›ii) se cumpÄƒrÄƒ pe numele Clientului, la cost, iar lista lor se predÄƒ la plecare. Unde o licenÈ›Äƒ nu se poate transfera, relicenÈ›ierea e pe cheltuiala Clientului.`,
    `AleSign poate menÈ›iona Clientul È™i lucrarea Ã®n portofoliul sÄƒu, fÄƒrÄƒ date confidenÈ›iale. Clientul poate cere oricÃ¢nd, pe email, sÄƒ nu aparÄƒ${X.fondator ? '; la clienÈ›ii fondatori, studiul de caz È™i jurnalul construcÈ›iei se publicÄƒ doar cu acordul lor scris' : ''}.`,
  ].filter(Boolean);

  // â€”â€”â€” 9. GÄƒzduirea, domeniul, accesele, exportul â€”â€”â€”
  const gazP = [];
  if (X.site || X.magazin) {
    if (X.magazin) gazP.push(`Magazinul stÄƒ pe Shopify, Ã®n contul Clientului, cu AleSign colaborator. Clientul editeazÄƒ singur produsele, preÈ›urile, stocul È™i bannerele.`);
    if (X.site) {
      if (X.gazduire === 'alesign') gazP.push(`GÄƒzduirea aleasÄƒ: la AleSign. Site-ul stÄƒ pe infrastructura Vercel, Ã®n contul AleSign, pe domeniul Clientului. GÄƒzduirea face parte din serviciul Care (${nr(X.carePret)} RON pe lunÄƒ${t.platitor ? ' plus TVA' : ''}): gÄƒzduire, certificat de securitate, vitezÄƒ, actualizÄƒri, backup, monitorizare È™i revenire automatÄƒ la ultima versiune bunÄƒ. Lunile de Care incluse Ã®n ofertÄƒ (Anexa 1) nu se plÄƒtesc separat; dupÄƒ ele, Care continuÄƒ pe facturÄƒ lunarÄƒ, poate fi oprit cu preaviz de 30 de zile È™i este inclus Ã®n orice abonament.`);
      else if (X.gazduire === 'client_vercel') gazP.push(`GÄƒzduirea aleasÄƒ: pe contul Vercel al Clientului (planul Pro, aproximativ 20 USD pe lunÄƒ, plÄƒtit de Client direct cÄƒtre Vercel), cu AleSign membru al echipei lui. AleSign publicÄƒ acolo, iar Care (${nr(X.carePret)} RON pe lunÄƒ${t.platitor ? ' plus TVA' : ''}) rÄƒmÃ¢ne disponibil, cu aceleaÈ™i garanÈ›ii.`);
      else gazP.push(`GÄƒzduirea aleasÄƒ: la Client, ca fiÈ™iere. La publicare, AleSign predÄƒ fiÈ™ierele complete ale site-ului (build-ul), cu instrucÈ›iunile de publicare È™i de DNS. ÃŽn aceastÄƒ variantÄƒ nu se aplicÄƒ serviciul Care, garanÈ›ia de vitezÄƒ È™i monitorizarea, iar formularul de contact trimite mesajele direct pe emailul Clientului. GaranÈ›ia pentru defecte (articolul 11) acoperÄƒ fiÈ™ierele predate, nemodificate. Clientul poate trece oricÃ¢nd la gÄƒzduirea AleSign, cu Care.`);
    }
    gazP.push(`Domeniul este È™i rÄƒmÃ¢ne al Clientului, Ã®nregistrat pe numele lui. DacÄƒ un domeniu a fost cumpÄƒrat de AleSign Ã®n numele Clientului, i se transferÄƒ gratuit, la cerere.`);
    gazP.push(`Exportul: oricÃ¢nd pleacÄƒ, Clientul primeÈ™te Ã®n cel mult 30 de zile build-ul complet, conÈ›inutul Ã®n format JSON, sursele site-ului sÄƒu È™i pozele, plus o mutare asistatÄƒ gratuitÄƒ pe contul sÄƒu Vercel. Cu exportul: domeniul scos din proiectul AleSign, cu instrucÈ›iunile DNS; formularul trecut pe emailul Clientului; cererile primite prin site exportate, apoi È™terse; lista licenÈ›elor terÈ›ilor; accesele revocate. SpaÈ›iul Clientului rÄƒmÃ¢ne arhivat 12 luni.`);
    gazP.push(`Un singur termen, de 30 de zile: la Ã®ncetare, gÄƒzduirea de cÄƒtre AleSign continuÄƒ 30 de zile, timp Ã®n care Clientul alege Ã®ntre â€žrÄƒmÃ¢n pe Careâ€ (site-ul rÄƒmÃ¢ne online pe Care ${nr(X.carePret)} RON pe lunÄƒ, pe facturÄƒ) È™i export. DupÄƒ 30 de zile fÄƒrÄƒ alegere, gÄƒzduirea se opreÈ™te, iar exportul rÄƒmÃ¢ne disponibil.`);
  } else {
    gazP.push(`Contractul nu include gÄƒzduirea unui site. Conturile create pentru Client (de exemplu, fiÈ™a Google sau conturile de reclame) sunt pe numele lui, iar accesele AleSign se revocÄƒ la Ã®ncetare.`);
    gazP.push(`La Ã®ncetare, AleSign predÄƒ Clientului, Ã®n cel mult 30 de zile de la cerere, materialele livrate È™i accesele conturilor create pe numele lui.`);
  }

  // â€”â€”â€” 10. Datele personale â€”â€”â€”
  const dateP = [
    `Fiecare parte respectÄƒ Regulamentul (UE) 2016/679 (GDPR). Pentru datele de contact ale Clientului (contract, facturi, comunicÄƒri), AleSign este operator È™i le pÄƒstreazÄƒ cÃ¢t cere legea contabilÄƒ È™i fiscalÄƒ.`,
    `Pentru datele clienÈ›ilor Clientului la care AleSign ajunge prin servicii (mesaje din formulare, cereri, liste de newsletter, cereri de recenzii, comentarii), Clientul este operatorul, iar AleSign este persoana Ã®mputernicitÄƒ: prelucreazÄƒ datele doar pe instrucÈ›iunile Clientului, Ã®n condiÈ›iile din Anexa 2 (Acordul de prelucrare a datelor), parte din acest contract.`,
    `Datele de sÄƒnÄƒtate nu intrÄƒ Ã®n niciun formular, chat sau modul construit de AleSign (articolul 9 din GDPR). Pe site-urile din domeniul medical, formularul cere doar numele, telefonul È™i intervalul preferat.`,
    `DacÄƒ AleSign aflÄƒ de un incident de securitate care atinge datele clienÈ›ilor Clientului, Ã®l anunÈ›Äƒ pe Client Ã®n cel mult 24 de ore, ca acesta, Ã®n calitate de operator, sÄƒ poatÄƒ notifica autoritatea (ANSPDCP) Ã®n 72 de ore, unde legea o cere.`,
  ];

  // â€”â€”â€” 11. GaranÈ›iile â€”â€”â€”
  const garP = garantii(d, X);

  // â€”â€”â€” 12. RÄƒspunderea â€”â€”â€”
  const raspP = [
    `RÄƒspunderea totalÄƒ a AleSign pentru orice prejudiciu legat de acest contract se limiteazÄƒ la sumele plÄƒtite de Client Ã®n ultimele 12 luni. AleSign nu rÄƒspunde pentru pierderi indirecte (profit nerealizat, clienÈ›i pierduÈ›i) È™i nici pentru efectele deciziilor platformelor terÈ›e (Google, Meta, TikTok, Shopify, furnizori de gÄƒzduire) asupra conturilor Clientului.`,
    `LimitÄƒrile de mai sus nu se aplicÄƒ prejudiciilor cauzate cu intenÈ›ie sau din culpÄƒ gravÄƒ (articolul 1355 din Codul civil)${pf ? ' È™i nici drepturilor pe care legea le dÄƒ consumatorului È™i care nu pot fi limitate prin contract' : ''}.`,
    `${garantie90(d) && abon ? 'ÃŽn afara pragului din garanÈ›ia de 90 de zile (articolul 11), ' : ''}AleSign nu promite un anumit numÄƒr de clienÈ›i, vÃ¢nzÄƒri, locul Ã®n Google, un procent de disponibilitate sau oameni de gardÄƒ Ã®n weekend. Promite ce scrie Ã®n Anexa 1, la termen È™i la calitatea descrisÄƒ, È™i timpul de reacÈ›ie de la articolul 6.`,
    `Niciuna dintre pÄƒrÈ›i nu rÄƒspunde pentru neexecutarea cauzatÄƒ de forÈ›Äƒ majorÄƒ (articolul 1351 din Codul civil), notificatÄƒ celeilalte pÄƒrÈ›i Ã®n 5 zile de la apariÈ›ie. DacÄƒ forÈ›a majorÄƒ dureazÄƒ peste 30 de zile, oricare parte poate Ã®nceta contractul.`,
  ];

  // â€”â€”â€” 13. Ce nu facem â€”â€”â€”
  const nuP = [
    `AleSign nu publicÄƒ È™i nu construieÈ™te: afirmaÈ›ii false sau care nu se pot dovedi (â€žcel mai bun din oraÈ™â€, rezultate garantate), recenzii sau testimoniale inventate, conÈ›inut care Ã®ncalcÄƒ drepturile altcuiva, imitaÈ›ii ale altor firme sau persoane, colectarea de date fÄƒrÄƒ temei legal, publicitate pentru alcool, tutun sau jocuri de noroc.`,
    `ÃŽn domeniile reglementate (medical È™i stomatologic, estetic, cosmetice, suplimente, juridic, financiar), materialele respectÄƒ regulile profesiei È™i ale publicitÄƒÈ›ii din domeniu: fÄƒrÄƒ promisiuni de rezultat, fÄƒrÄƒ superlative nedovedite, fÄƒrÄƒ â€žÃ®nainte / dupÄƒâ€ fÄƒrÄƒ acordul scris al persoanei, cu aprobarea lui Alexandru pe fiecare piesÄƒ. Pentru suplimente, servicii juridice sau financiare, Clientul confirmÄƒ cÄƒ afirmaÈ›iile Ã®i aparÈ›in È™i sunt permise Ã®n profesia lui.`,
    `AleSign poate refuza o cerere care contravine legii, acestui articol sau regulilor platformelor, fÄƒrÄƒ penalitate. Refuzul se motiveazÄƒ pe email È™i vine, unde se poate, cu o formulare permisÄƒ. Refuzul unei cereri nu afecteazÄƒ restul contractului.`,
  ];

  // â€”â€”â€” 14. ÃŽncetarea â€”â€”â€”
  const incP = [
    abon ? `Oricare parte poate Ã®nceta contractul ${min && !pf ? 'dupÄƒ perioada minimÄƒ' : 'oricÃ¢nd'}, cu preaviz de 30 de zile, pe email sau din spaÈ›iul Clientului (â€žÃŽncheie colaborareaâ€, confirmat cu un cod trimis pe emailul din contract), fÄƒrÄƒ alt motiv.` : `Contractul Ã®nceteazÄƒ la livrare, conform articolului 3. Serviciul Care, dacÄƒ existÄƒ, se Ã®ncheie cu preaviz de 30 de zile, pe email sau din spaÈ›iul Clientului.`,
    `Oricare parte poate Ã®nceta contractul imediat dacÄƒ cealaltÄƒ Ã®È™i Ã®ncalcÄƒ grav obligaÈ›iile È™i nu remediazÄƒ Ã®n 10 zile de la notificare.`,
    abon && X.site ? `Site-ul inclus Ã®n abonament devine al Clientului, cu licenÈ›a de la articolul 8, dupÄƒ perioada minimÄƒ${min ? ` de ${min} ${min === 1 ? 'lunÄƒ' : 'luni'}` : ''}. DacÄƒ abonamentul se Ã®ncheie mai devreme (inclusiv Ã®n prima lunÄƒ), Clientul pÄƒstreazÄƒ site-ul plÄƒtind preÈ›ul lui de catalog (Website Refresh 900 RON, Website nou 2.900 RON, Signature 7.900 RON); altfel, site-ul nou se retrage, iar dacÄƒ site-ul vechi era gÄƒzduit de AleSign, acesta revine online.` : null,
    `La neplata unui abonament: memento la 7 zile, suspendarea lucrului nou la 14 zile, Care pus pe pauzÄƒ la 30 de zile; nimic nu se È™terge 90 de zile. O disputÄƒ de platÄƒ deschisÄƒ la bancÄƒ opreÈ™te lucrul nou È™i publicarea pe acel contract pÃ¢nÄƒ la soluÈ›ionare.`,
    `La Ã®ncetare, serviciile prestate pÃ¢nÄƒ atunci rÄƒmÃ¢n plÄƒtite, accesele AleSign se revocÄƒ, iar predarea È™i exportul se fac conform articolului 9.`,
  ].filter(Boolean);

  // â€”â€”â€” 15. Statutul Clientului È™i dreptul de retragere â€”â€”â€”
  const retP = pf
    ? [
        `Clientul Ã®ncheie contractul ca persoanÄƒ fizicÄƒ, consumator. InformaÈ›iile cerute de OrdonanÈ›a de urgenÈ›Äƒ nr. 34/2014 (prestatorul, serviciile, preÈ›ul total, plata, termenele, durata, Ã®ncetarea, reclamaÈ›iile) sunt cele din acest contract È™i din Anexa 1.`,
        `Dreptul de retragere: Clientul se poate retrage din contract Ã®n 14 zile de la Ã®ncheierea lui (data semnÄƒrii), fÄƒrÄƒ motiv È™i fÄƒrÄƒ costuri, prin funcÈ›ia â€žMÄƒ retrag din contractâ€ de pe pagina contractului, printr-un email la ${gol(P.email, 'info@alesign.net')} sau folosind formularul din Anexa 3. Ajunge ca declaraÈ›ia sÄƒ fie trimisÄƒ Ã®nainte de expirarea termenului. AleSign confirmÄƒ primirea pe email, imediat.`,
        `Lucrul Ã®ncepe dupÄƒ expirarea termenului de retragere, cu excepÈ›ia cazului Ã®n care Clientul cere expres, la semnare, sÄƒ Ã®nceapÄƒ mai devreme. DacÄƒ a cerut asta È™i se retrage, plÄƒteÈ™te doar contravaloarea serviciilor prestate pÃ¢nÄƒ la data retragerii, proporÈ›ional cu preÈ›ul total. DacÄƒ serviciul a fost prestat integral Ã®nainte de expirarea termenului, la cererea expresÄƒ a Clientului È™i cu confirmarea cÄƒ È™tie cÄƒ astfel pierde dreptul de retragere, retragerea nu mai este posibilÄƒ.`,
        `ÃŽn caz de retragere, AleSign restituie toate sumele primite (minus, dupÄƒ caz, contravaloarea de mai sus) Ã®n cel mult 14 zile de la data la care a fost informat, folosind aceeaÈ™i metodÄƒ de platÄƒ, fÄƒrÄƒ comisioane pentru Client.`,
        `Clientul beneficiazÄƒ de garanÈ›ia legalÄƒ de conformitate pentru conÈ›inutul È™i serviciile digitale (OrdonanÈ›a de urgenÈ›Äƒ nr. 141/2021), pe lÃ¢ngÄƒ garanÈ›iile de la articolul 11.`,
      ]
    : [
        `Clientul Ã®ncheie contractul ca profesionist, Ã®n scopul activitÄƒÈ›ii sale${C.cui ? ` (CUI ${C.cui})` : ''}. Prevederile despre dreptul de retragere al consumatorilor (OrdonanÈ›a de urgenÈ›Äƒ nr. 34/2014) nu se aplicÄƒ.`,
      ];

  // â€”â€”â€” 16. ModificÄƒri, comenzi suplimentare, cesiune â€”â€”â€”
  const modP = [
    `Contractul, cu anexele lui, reprezintÄƒ Ã®ntregul acord al pÄƒrÈ›ilor È™i Ã®nlocuieÈ™te orice discuÈ›ie anterioarÄƒ. ModificÄƒrile se fac Ã®n scris, pe email sau printr-un act adiÈ›ional acceptat online, cu acordul ambelor pÄƒrÈ›i.`,
    abon ? `Un serviciu Ã®n plus pe un abonament activ se adaugÄƒ printr-o comandÄƒ suplimentarÄƒ, paralelÄƒ, care nu Ã®nchide È™i nu schimbÄƒ abonamentul. Trecerea pe alt abonament se face printr-un act de schimbare de pachet, de la data urmÄƒtoarei facturi.` : `Un serviciu Ã®n plus se adaugÄƒ printr-o comandÄƒ suplimentarÄƒ, cu preÈ›ul È™i termenul ei, fÄƒrÄƒ sÄƒ schimbe acest contract.`,
    `Contractul, accesele È™i licenÈ›a trec la altÄƒ ${pf ? 'persoanÄƒ' : 'firmÄƒ'} (de exemplu, la vÃ¢nzarea afacerii) doar printr-un act adiÈ›ional semnat de toate pÄƒrÈ›ile; la cesiune, cheile de acces È™i linkul spaÈ›iului se reemit.`,
  ];

  // â€”â€”â€” 17. ComunicÄƒri, lege, litigii â€”â€”â€”
  const legeP = [
    `ComunicÄƒrile oficiale dintre pÄƒrÈ›i se fac pe email, la adresele din articolul 1, È™i se considerÄƒ primite Ã®n ziua lucrÄƒtoare urmÄƒtoare trimiterii. ReclamaÈ›iile se trimit la ${gol(P.email, 'info@alesign.net')}; AleSign rÄƒspunde Ã®n cel mult 5 zile lucrÄƒtoare.`,
    pf
      ? `Contractul este guvernat de legea romÃ¢nÄƒ. Orice neÃ®nÈ›elegere se rezolvÄƒ Ã®ntÃ¢i prin discuÈ›ie directÄƒ, Ã®n 15 zile. Clientul consumator se poate adresa È™i AutoritÄƒÈ›ii NaÈ›ionale pentru ProtecÈ›ia Consumatorilor, inclusiv procedurii de soluÈ›ionare alternativÄƒ a litigiilor (SAL), la reclamatiisal.anpc.ro, precum È™i instanÈ›elor competente potrivit legii, inclusiv celor de la domiciliul sÄƒu.`
      : `Contractul este guvernat de legea romÃ¢nÄƒ. Orice neÃ®nÈ›elegere se rezolvÄƒ Ã®ntÃ¢i prin discuÈ›ie directÄƒ, Ã®n 15 zile; dacÄƒ nu se ajunge la o soluÈ›ie, de instanÈ›ele competente de la sediul AleSign.`,
    `DacÄƒ o clauzÄƒ devine nulÄƒ sau inaplicabilÄƒ, restul contractului rÄƒmÃ¢ne valabil, iar pÄƒrÈ›ile o Ã®nlocuiesc cu o clauzÄƒ permisÄƒ, cÃ¢t mai apropiatÄƒ de intenÈ›ia iniÈ›ialÄƒ.`,
  ];

  // â€”â€”â€” 18. Semnarea electronicÄƒ È™i aprobÄƒrile cu cod â€”â€”â€”
  const semnP = [
    `PÄƒrÈ›ile convin cÄƒ acest contract se poate semna electronic, pe pagina pusÄƒ la dispoziÈ›ie de AleSign: prin scrierea numelui${pf ? '' : ' reprezentantului'}, bifarea acordului È™i apÄƒsarea butonului â€žSemnezâ€. SemnÄƒtura este Ã®nregistratÄƒ cu data, ora È™i adresa IP, iar contractul semnat se trimite pe email ambelor pÄƒrÈ›i. O astfel de semnÄƒturÄƒ electronicÄƒ are efecte juridice È™i nu poate fi respinsÄƒ doar pentru cÄƒ este Ã®n formÄƒ electronicÄƒ (Regulamentul (UE) nr. 910/2014, art. 25). PÄƒrÈ›ile pot semna È™i clasic, pe hÃ¢rtie, cu acelaÈ™i efect.`,
    `AprobÄƒrile din spaÈ›iul Clientului care au efecte Ã®n contract (â€žAprob site-ulâ€, â€žÃŽncheie colaborareaâ€) se confirmÄƒ cu un cod unic, trimis pe emailul din contract È™i valabil un timp scurt. Introducerea codului are valoarea unei semnÄƒturi electronice a Clientului pentru acel act È™i se Ã®nregistreazÄƒ cu data, ora È™i adresa IP.`,
  ];

  const parti = pf
    ? `${gol(C.denumire, '[numele È™i prenumele]')}, cu domiciliul Ã®n ${gol(C.adresa)}, email ${gol(C.email)}${C.telefon ? `, telefon ${C.telefon}` : ''}, persoanÄƒ fizicÄƒ, Ã®n calitate de beneficiar (numit Ã®n continuare â€žClientulâ€),`
    : `${gol(C.denumire, '[firma clientului]')}, cu sediul Ã®n ${gol(C.adresa)}, CUI ${gol(C.cui)}${C.regcom ? `, Ã®nregistratÄƒ la Registrul ComerÈ›ului sub nr. ${C.regcom}` : ''}, reprezentatÄƒ de ${gol(C.reprezentant, '[reprezentant]')}, email ${gol(C.email)}${C.telefon ? `, telefon ${C.telefon}` : ''}, Ã®n calitate de beneficiar (numit Ã®n continuare â€žClientulâ€),`;

  const sec = [
    ['PÄƒrÈ›ile', [
      `${gol(P.denumire, 'AleSign&Co SRL')}, cu sediul Ã®n ${gol(P.adresa)}, CUI ${gol(P.cui)}, Ã®nregistratÄƒ la Registrul ComerÈ›ului sub nr. ${gol(P.regcom)}, email ${gol(P.email, 'info@alesign.net')}, reprezentatÄƒ de ${gol(P.reprezentant, 'Alexandru-Vlad PavÄƒl')}, Ã®n calitate de prestator (numit Ã®n continuare â€žAleSignâ€),`,
      `È™i`,
      parti,
      `au convenit Ã®ncheierea prezentului contract de prestÄƒri servicii, Ã®n condiÈ›iile de mai jos.`,
    ]],
    ['Ce facem È™i cum lucrÄƒm', [
      FO ? `Clientul este unul dintre cei ${FO.max} Fondatori aleÈ™i de Alexandru de pe lista SISTEM (Fondatorul nr. ${FO.nr}${FO.domeniu ? `, ${FO.domeniu}` : ''}${FO.oras ? `, ${FO.oras}` : ''}). Prin acest contract, AleSign Ã®i construieÈ™te â€žFundaÈ›iaâ€: ${FO.include.length ? FO.include.join(', ').replace(/^./, (m) => m.toLowerCase()) : 'serviciile din Anexa 1'}${FO.livrare ? `, livrate Ã®ntre ${FO.livrare}` : ''}, descrise linie cu linie Ã®n Anexa 1.`
         : `AleSign presteazÄƒ pentru Client serviciile din oferta â€ž${d.pachet_nume}â€, descrise linie cu linie Ã®n Anexa 1, cu termenele de Ã®ndeplinire ale fiecÄƒruia.`,
      FO ? `Locul de Fondator se confirmÄƒ la plata FundaÈ›iei. Locurile sunt ${FO.max} È™i se ocupÄƒ Ã®n ordinea plÄƒÈ›ii. DacÄƒ la momentul plÄƒÈ›ii Clientului toate cele ${FO.max} locuri sunt deja plÄƒtite, AleSign restituie integral suma Ã®n cel mult 3 zile lucrÄƒtoare, pe aceeaÈ™i cale, iar Clientul rÄƒmÃ¢ne pe oferta listei SISTEM (âˆ’10 % la abonamentele lunare, âˆ’15 % la cele anuale, pentru comenzile de pÃ¢nÄƒ pe 31 decembrie 2026).` : null,
      FO ? null : d.descriere ? `Detalii convenite pentru acest contract: ${d.descriere}` : null,
      asteptare.length ? `Serviciile marcate â€žlistÄƒ de aÈ™teptareâ€ Ã®n Anexa 1 (${asteptare.map((l) => l.nume).join(', ')}) nu fac obiectul acestui contract È™i nu se factureazÄƒ; cÃ¢nd devin disponibile, AleSign le propune Clientului printr-un act adiÈ›ional.` : null,
      `Rolurile: Clientul rÄƒmÃ¢ne titularul afacerii, al conturilor È™i al datelor clienÈ›ilor sÄƒi È™i stabileÈ™te, la Ã®nceput, direcÈ›ia È™i regulile (ce servicii È™i ce preÈ›uri se comunicÄƒ, ce nu vrea sÄƒ aparÄƒ niciodatÄƒ Ã®n numele lui). AleSign rÄƒspunde de execuÈ›ie, de la plan pÃ¢nÄƒ la publicare.`,
      `Mandatul de publicare: prin semnarea contractului, Clientul Ã®mputerniceÈ™te AleSign sÄƒ pregÄƒteascÄƒ È™i sÄƒ publice Ã®n numele lui materialele din Anexa 1 (postÄƒri, reclame, emailuri, rÄƒspunsuri la recenzii, actualizÄƒri ale fiÈ™ei Google), fÄƒrÄƒ o aprobare separatÄƒ pentru fiecare material, Ã®n limitele informaÈ›iilor È™i regulilor primite de la Client. Clientul vede Ã®n spaÈ›iul lui tot ce este programat È™i tot ce s-a publicat È™i poate cere oricÃ¢nd schimbarea sau retragerea unui material; AleSign o face Ã®n cel mult o zi lucrÄƒtoare. Reclamele se lanseazÄƒ doar Ã®n limita bugetului lunar scris Ã®n Anexa 1; orice depÄƒÈ™ire cere acordul scris al Clientului. Mandatul poate fi retras oricÃ¢nd, Ã®n scris; de la retragere, AleSign livreazÄƒ materialele fÄƒrÄƒ sÄƒ le publice.`,
      `RÄƒmÃ¢n la decizia Clientului doar momentele care Ã®l angajeazÄƒ direct: alegerea direcÈ›iei de design sau a numelui, acolo unde Anexa 1 o prevede, È™i recepÈ›ia site-ului (articolul 5).`,
      `AleSign lucreazÄƒ prin sistemul sÄƒu AleSystem Design, cu agenÈ›i automatizaÈ›i bazaÈ›i pe inteligenÈ›Äƒ artificialÄƒ, È™i prin munca echipei sale. Fiecare livrabil trece prin verificÄƒri automate È™i prin aprobarea lui Alexandru Ã®nainte de publicare. Un asistent automat pus pe site-ul Clientului se prezintÄƒ ca atare din primul mesaj, iar o imagine generatÄƒ care poate fi luatÄƒ drept fotografie realÄƒ se marcheazÄƒ ca ilustrativÄƒ.`,
      `Serviciile sunt de marketing digital, construcÈ›ie È™i Ã®ntreÈ›inere de prezenÈ›Äƒ online È™i automatizare a comunicÄƒrii cu clienÈ›ii. ${garantie90(d) && abon ? 'ÃŽn afara pragului din garanÈ›ia de 90 de zile (articolul 11), ' : ''}AleSign nu garanteazÄƒ un anumit numÄƒr de clienÈ›i, vÃ¢nzÄƒri sau poziÈ›ii Ã®n Google; garanteazÄƒ cÄƒ livreazÄƒ ce scrie Ã®n Anexa 1, la timp È™i la calitatea descrisÄƒ.`,
    ].filter(Boolean)],
    ...(FO ? [['Oferta de Fondator', [
      `OdatÄƒ cu FundaÈ›ia, Clientul primeÈ™te oferta de Fondator: preÈ›urile de fondator din Anexa 1 (â€žPreÈ›urile tale de fondatorâ€), valabile ${FO.luni} luni de la prima lunÄƒ de abonament, pentru oricare dintre abonamentele de acolo. Oferta este personalÄƒ: a Clientului, pentru firma din acest contract, È™i nu se transferÄƒ.`,
      `Abonamentul se alege de Client dupÄƒ FundaÈ›ie, printr-un contract separat, la preÈ›urile de fondator. FundaÈ›ia nu obligÄƒ Clientul la niciun abonament; dacÄƒ nu alege unul, contractul se Ã®ncheie odatÄƒ cu livrarea FundaÈ›iei, fÄƒrÄƒ alte sume de platÄƒ.`,
      `Clientul are un link personal de recomandare${FO.linkRecomandare ? ` (${FO.linkRecomandare})` : ''}. CÃ¢nd un client nou adus prin el plÄƒteÈ™te primul abonament, abonamentul lunar al Clientului coboarÄƒ la ${100 - FO.adusProcent} % din preÈ›ul de listÄƒ (coloana â€žcu client adusâ€ din Anexa 1) cÃ¢t timp cel adus rÄƒmÃ¢ne client; cel adus primeÈ™te, la rÃ¢ndul lui, o reducere la primul abonament. Reducerea se aplicÄƒ singurÄƒ din luna urmÄƒtoare È™i se opreÈ™te singurÄƒ dacÄƒ cel adus renunÈ›Äƒ.`,
      `AleSign anunÈ›Äƒ Clientul pe email la fiecare loc de Fondator plÄƒtit È™i la Ã®nchiderea ofertei. PreÈ›urile de listÄƒ È™i restul ofertelor se pot schimba oricÃ¢nd; preÈ›urile de fondator ale Clientului rÄƒmÃ¢n cele din Anexa 1 pe toatÄƒ durata celor ${FO.luni} luni.`,
    ]]] : []),
    ['Durata', durataP],
    ['PreÈ›ul È™i plata', pretP],
    ['Termenele de Ã®ndeplinire È™i acceptarea', termP],
    ['Ce face AleSign', aleP],
    ['Ce face Clientul', cliP],
    ['Proprietatea È™i licenÈ›a', propP],
    [X.site || X.magazin ? 'GÄƒzduirea, domeniul, accesele È™i exportul' : 'Conturile, accesele È™i predarea', gazP],
    ['Datele personale', dateP],
    ['GaranÈ›iile', garP],
    ['RÄƒspunderea', raspP],
    ['Ce nu facem È™i domeniile reglementate', nuP],
    ['ÃŽncetarea', incP],
    [pf ? 'Clientul consumator È™i dreptul de retragere' : 'Statutul Clientului', retP],
    ['ModificÄƒri, comenzi suplimentare È™i cesiune', modP],
    ['ComunicÄƒri, lege, litigii', legeP],
    ['Semnarea electronicÄƒ È™i aprobÄƒrile cu cod', semnP],
  ];
  return sec.map(([titlu, p], i) => ({ titlu: `${i + 1}. ${titlu}`, p }));
}

// GaranÈ›iile 1â€“12 (Bot Website v5.1, â€žGaranÈ›iiâ€), doar cele care se aplicÄƒ liniilor contractului
export function garantii(d, X = profil(d)) {
  const { t, are } = X;
  const g = [];
  const siteTreapta = X.site || X.magazin || X.atelier;
  const G = garantie90(d);
  if (G && X.abon) {
    const buget = Number(d.buget_reclame_min || 0) > 0;
    g.push(`90 de zile cu rezultate sau banii Ã®napoi: pÄƒrÈ›ile numÄƒrÄƒ ${G.ce}. Pragul este de ${nr(G.prag)} Ã®n primele 90 de zile de la activare. NumÄƒrÄƒtoarea se face din sistemul de mÄƒsurare instalat de AleSign, iar Clientul o vede Ã®n raportul lunar. DacÄƒ la finalul celor 90 de zile numÄƒrul mÄƒsurat este sub prag, Clientul poate cere, Ã®n 15 zile, restituirea abonamentului plÄƒtit pentru aceste 90 de zile, iar AleSign Ã®l restituie Ã®n 10 zile lucrÄƒtoare. Cererea de restituire Ã®ncheie contractul la data ei, fÄƒrÄƒ preaviz È™i fÄƒrÄƒ plata lunilor rÄƒmase din perioada minimÄƒ.`);
    g.push(`GaranÈ›ia de 90 de zile se aplicÄƒ dacÄƒ abonamentul a fost plÄƒtit la zi È™i a rÄƒmas activ toate cele 90 de zile, dacÄƒ materialele È™i accesele au fost date Ã®n cel mult 5 zile lucrÄƒtoare de la activare, dacÄƒ site-ul È™i mÄƒsurarea de pe el au rÄƒmas active${buget ? ' È™i dacÄƒ bugetul de reclame din Anexa 1 a fost plÄƒtit platformelor' : ''}. Nu se restituie bugetul de reclame, plÄƒtit direct platformelor, È™i nici serviciile plÄƒtite o singurÄƒ datÄƒ (site, identitate), care rÄƒmÃ¢n ale Clientului. DacÄƒ Clientul Ã®nceteazÄƒ contractul Ã®nainte de ziua 90, garanÈ›ia nu se aplicÄƒ, iar sumele plÄƒtite nu se restituie.`);
  }
  if (t.transe.length > 1) g.push(`PlÄƒteÈ™ti restul cÃ¢nd aprobi: ultima tranÈ™Äƒ se cere la aprobarea site-ului, iar site-ul nu se publicÄƒ pÃ¢nÄƒ cÃ¢nd Clientul nu apasÄƒ â€žAprob site-ulâ€.`);
  if (X.signature && t.transe.length < 2) g.push(`GaranÈ›ia direcÈ›iei: Clientul alege dintre douÄƒ direcÈ›ii de design. DacÄƒ nu Ã®l convinge niciuna, AleSign propune Ã®ncÄƒ un set. DacÄƒ nici acesta nu Ã®l convinge, proiectul se opreÈ™te, iar AleSign restituie integral sumele plÄƒtite pentru site, Ã®n 10 zile lucrÄƒtoare.`);
  if (X.signature && t.transe.length > 1) g.push(`GaranÈ›ia direcÈ›iei, Ã®n condiÈ›iile de la articolul 4.`);
  if (are('cinematic', 'magazin_cinematic')) g.push(`La Atelier, garanÈ›ia direcÈ›iei este SchiÈ›a: Clientul vede direcÈ›iile Ã®nainte sÄƒ cumpere proiectul.`);
  if (siteTreapta && !X.reparatii) g.push(`Termenul, scris: pentru fiecare 5 zile lucrÄƒtoare de Ã®ntÃ¢rziere din vina AleSign, Clientul primeÈ™te o lunÄƒ de Care gratuitÄƒ, la nivelul treptei, cel mult 3${X.gazduire === 'client_fisiere' ? ' (la site-ul gÄƒzduit de Client, contravaloarea ei, ca credit pe orice serviciu AleSign)' : ''}. Termenul se mutÄƒ cu zilele Ã®n care AleSign aÈ™teaptÄƒ materiale, accese sau asset-uri.`);
  if (siteTreapta && !X.reparatii) g.push(`12 luni pentru defecte de funcÈ›ionare, cu sau fÄƒrÄƒ Care: AleSign reparÄƒ gratuit. Sunt excluse conÈ›inutul schimbat de Client Ã®n afara formularelor puse la dispoziÈ›ie de AleSign, funcÈ›iile noi, platformele terÈ›ilor (Shopify È™i aplicaÈ›iile lui, aplicaÈ›iile de programÄƒri) È™i site-urile mutate pe altÄƒ gÄƒzduire sau modificate de alÈ›ii.`);
  if (X.reparatii) g.push(`ReparaÈ›ii: 30 de zile de garanÈ›ie pe reparaÈ›iile fÄƒcute. ÃŽnainte de lucru se confirmÄƒ un backup, iar la final Clientul primeÈ™te raportul â€žÃ®nainte / dupÄƒâ€, cu aceleaÈ™i verificÄƒri mÄƒsurate.`);
  if (X.viteza) g.push(`Viteza: la predare, scorul PageSpeed pe mobil este peste 90 pe domeniul Clientului (mediana a 3 rulÄƒri). DacÄƒ scade din cauza codului AleSign, AleSign reparÄƒ Ã®n 5 zile lucrÄƒtoare. Sunt excluse conÈ›inutul È™i scripturile adÄƒugate la cererea Clientului.`);
  if (siteTreapta && !X.reparatii) g.push(`Dovada: la predare, Clientul primeÈ™te raportul verificÄƒrilor automate trecute de site (accesibilitate, vitezÄƒ, securitate, conformitate legalÄƒ, SEO tehnic, funcÈ›ionare).`);
  if (X.magazin) g.push(`Comanda realÄƒ Ã®nainte de lansare: Clientul plaseazÄƒ o comandÄƒ cu cardul sÄƒu pe magazinul Ã®ncÄƒ protejat cu parolÄƒ, iar AleSign o ramburseazÄƒ; urmeazÄƒ 14 zile de supraveghere zilnicÄƒ a comenzilor, facturilor È™i AWB-urilor.`);
  if (are('website')) g.push(`Urci fÄƒrÄƒ pierdere: ce a plÄƒtit Clientul pe Website nou se scade integral din Signature sau Magazin, dacÄƒ trece la ele Ã®n 6 luni de la publicare.`);
  if (are('audit')) g.push(`Auditul se scade integral din orice serviciu AleSign cumpÄƒrat Ã®n 30 de zile.`);
  if (are('schita')) g.push(`SchiÈ›a se scade integral din proiectul pe care Ã®l recomandÄƒ (cel mult 50% din preÈ›ul proiectului), dacÄƒ proiectul se semneazÄƒ Ã®n 30 de zile de la livrarea ei.`);
  if (d.dev_rezerva === true && (X.site || X.magazin)) g.push(`Continuitatea: dacÄƒ Alexandru lipseÈ™te, o persoanÄƒ numitÄƒ (dezvoltatorul de rezervÄƒ) preia Care-ul site-ului Clientului Ã®n cel mult 48 de ore. Exportul este disponibil oricÃ¢nd.`);
  if (X.fondator && X.signature) g.push(`Client fondator Signature: Ã®ncÄƒ 6 luni de Care, gratuit, migrarea gratuitÄƒ pe versiunea urmÄƒtoare a kitului È™i jurnalul construcÈ›iei, publicat doar cu acordul Clientului.`);
  if (X.fondator && are('cinematic')) g.push(`Client fondator Cinematic: 3 luni de Care Plus, gratuit.`);
  g.push(`GaranÈ›iile de mai sus sunt bonusuri, nu reduceri de preÈ›, È™i se adaugÄƒ drepturilor pe care Clientul le are prin lege.`);
  return g;
}

export function anexa(d) {
  const X = profil(d);
  const { t, abon } = X;
  const include = (Array.isArray(d.include) ? d.include : []).filter((x) => !t.linii.some((l) => l.nume === x)); // fÄƒrÄƒ dubluri cu liniile
  // termenii pe serviciu: fiecare linie cu treapta ei din â€žCum se livreazÄƒâ€
  const servicii = [];
  for (const l of t.linii.filter((x) => ['pachet', 'modul'].includes(x.tip))) {
    const s = SERVICII[l.cod];
    if (!s) continue;
    servicii.push({ serviciu: l.nume, termen: X.fondator && s.fondator ? s.fondator : s.termen, runde: s.runde || 'â€”', separat: s.separat || 'â€”' });
  }
  const generic = abon
    ? [
        'Ziua 1â€“3 de la primirea materialelor: apel de pornire (15 minute), plan de lucru pentru prima lunÄƒ.',
        X.site ? 'Site-ul (Refresh sau cel inclus Ã®n pachet) intrÄƒ Ã®n lucru la termenul din tabelul de mai sus; fiÈ™a Google se pune la punct Ã®n primele 10 zile lucrÄƒtoare.' : null,
        'Ziua 10â€“30: primele materiale, publicate dupÄƒ verificarea lui Alexandru; Clientul le vede Ã®n spaÈ›iul lui.',
        // 20 nov. 2026: Ã®n luna activÄƒrii, postÄƒrile se dau proporÈ›ional cu zilele rÄƒmase (genereaza_sarcini, scriptul 86)
        include.some((x) => /postÄƒri/i.test(String(x))) ? 'ÃŽn luna calendaristicÄƒ Ã®n care Ã®ncepe abonamentul, postÄƒrile se livreazÄƒ proporÈ›ional cu zilele rÄƒmase din lunÄƒ; din luna urmÄƒtoare, Ã®n numÄƒrul Ã®ntreg din ofertÄƒ.' : null,
        'Ziua 30 È™i apoi lunar: raportul lunar, Ã®n maximum 2 minute de citit.',
      ].filter(Boolean)
    : servicii.length
      ? []
      : [
          'Ziua 1â€“3 de la primirea materialelor: apel de pornire (15 minute) È™i confirmarea structurii.',
          'Ziua 4â€“15: lucrul È™i prima versiune, trimisÄƒ spre aprobare.',
          'PÃ¢nÄƒ Ã®n ziua 20: corecturi (o rundÄƒ) È™i livrarea.',
          'La final: predarea materialelor È™i a acceselor.',
        ];
  const totText = [
    t.lunar > 0 ? `Total lunar: ${nr(t.lunar)} RON${t.platitor ? ' + TVA' : ''}` : null,
    t.anual != null ? `Total anual (platÄƒ Ã®n avans): ${nr(t.anual)} RON${t.platitor ? ' + TVA' : ''}` : null,
    t.unic !== 0 ? `Total o datÄƒ: ${nr(t.unic)} RON${t.platitor ? ' + TVA' : ''}` : null,
    `Prima platÄƒ: ${nr(t.prima)} RON${t.platitor ? ` + TVA = ${nr(t.primaCuTva)} RON` : ''}`,
  ].filter(Boolean);
  const gaz = X.site ? { alesign: 'GÄƒzduirea: la AleSign (Vercel AleSign, domeniul Clientului), prin serviciul Care.', client_vercel: 'GÄƒzduirea: pe contul Vercel al Clientului, cu AleSign membru.', client_fisiere: 'GÄƒzduirea: la Client, ca fiÈ™iere predate (fÄƒrÄƒ Care).' }[X.gazduire] : null;
  const FO = fondatorDin(d);
  const fondatorPreturi = FO ? FO.preturi.map((p) => ({ nume: p.nume, anual: p.categorie === 'combo', lista: Number(p.lista), fondator: Number(p.fondator), procent: Number(p.procent), cu_adus: p.cu_adus != null ? Number(p.cu_adus) : null })) : [];
  return {
    titlu: FO ? `Anexa 1 Â· FundaÈ›ia È™i preÈ›urile tale de fondator` : `Anexa 1 Â· Oferta â€ž${d.pachet_nume}â€ È™i termenii de Ã®ndeplinire`,
    fondator: FO, fondator_preturi: fondatorPreturi,
    linii: t.linii, totaluri: totText, include, servicii, termene: generic, gazduire: gaz,
    fondator_nota: FO ? `PreÈ›urile de fondator sunt Ã®n lei, pe lunÄƒ (lunare) sau pe an (anuale, plÄƒtite Ã®n avans), preÈ›uri finale; valabile ${FO.luni} luni de la prima lunÄƒ de abonament, pentru Fondatorul nr. ${FO.nr}, firma ${FO.firma || 'din contract'}. â€žCu client adusâ€: cÃ¢t plÄƒteÈ™te Clientul pe lunÄƒ cÃ¢t timp un client adus prin linkul lui rÄƒmÃ¢ne client.` : '',
    nota: `Termenele se socotesc Ã®n zile lucrÄƒtoare È™i curg de la data de start${d.start_la ? ` (${dataRo(d.start_la)})` : ''}; se mutÄƒ cu zilele Ã®n care AleSign aÈ™teaptÄƒ materiale, accese, aprobÄƒri sau asset-uri de la Client (articolul 5).${X.pf && !d.incepere_acord_la ? ' La Clientul consumator care nu a cerut Ã®nceperea imediatÄƒ, data de start este ziua de dupÄƒ termenul de retragere (articolul 15).' : ''} Liniile marcate â€žinclusâ€ nu se factureazÄƒ separat; liniile â€žlistÄƒ de aÈ™teptareâ€ nu fac obiectul contractului.`,
  };
}

// Anexa 2 (DPA, art. 28 GDPR) È™i, la consumator, Anexa 3 (formularul de retragere)
export const SUBIMPUTERNICITI = [
  ['Anthropic', 'modelele de inteligenÈ›Äƒ artificialÄƒ care scriu È™i verificÄƒ textele', 'SUA'],
  ['Vercel', 'gÄƒzduirea site-urilor È™i a paginilor AleSign', 'SUA, cu servere Ã®n UE'],
  ['Supabase', 'baza de date, fiÈ™ierele È™i autentificarea', 'SUA (furnizorul); regiunea proiectului'],
  ['n8n', 'automatizÄƒrile (fluxurile de lucru)', 'Germania'],
  ['Google', 'emailul (Gmail), fiÈ™a Google a Clientului', 'UE / SUA'],
  ['Brevo', 'trimiterea newsletterelor', 'FranÈ›a'],
  ['Stripe', 'plÄƒÈ›ile cu cardul', 'Irlanda / SUA'],
  ['GitHub', 'codul site-urilor', 'SUA'],
  ['Oblio', 'facturile AleSign', 'RomÃ¢nia'],
  ['Meta', 'doar la campaniile de reclame ale Clientului', 'Irlanda / SUA'],
  ['serviciul de monitorizare È™i cel de raportare a erorilor', 'disponibilitatea site-ului È™i erorile tehnice, fÄƒrÄƒ conÈ›inutul mesajelor', 'numele lor se comunicÄƒ pe email Ã®nainte de folosire'],
];

export function anexe(d) {
  const P = d.prestator || {};
  const C = d.client || {};
  const pf = d.client_tip === 'persoana_fizica';
  const out = [];
  out.push({
    titlu: 'Anexa 2 Â· Acordul de prelucrare a datelor (art. 28 din Regulamentul (UE) 2016/679)',
    p: [
      `PÄƒrÈ›ile: Clientul, ca operator, È™i AleSign, ca persoanÄƒ Ã®mputernicitÄƒ. Acordul se aplicÄƒ Ã®n mÄƒsura Ã®n care serviciile din Anexa 1 implicÄƒ date personale ale clienÈ›ilor, pacienÈ›ilor, abonaÈ›ilor sau vizitatorilor Clientului È™i dureazÄƒ cÃ¢t contractul, plus perioada de predare.`,
      `Ce date È™i ale cui: vizitatorii site-ului care trimit formularul sau o cerere (nume, telefon, email, mesajul, intervalul preferat), abonaÈ›ii newsletterului (email, nume, dovada consimÈ›ÄƒmÃ¢ntului), clienÈ›ii cÄƒrora li se cere o recenzie (nume, email sau telefon), persoanele care comenteazÄƒ pe paginile Clientului. Nu se prelucreazÄƒ date de sÄƒnÄƒtate sau alte categorii speciale de date.`,
      `Scopul: transmiterea cererilor cÄƒtre Client, trimiterea newsletterelor È™i a cererilor de recenzii doar cÄƒtre persoanele care au acceptat, rÄƒspunsurile automate, rapoartele agregate. AleSign nu foloseÈ™te datele Ã®n alt scop, nu le vinde È™i nu antreneazÄƒ modele de inteligenÈ›Äƒ artificialÄƒ pe ele. Mesajele din formulare nu trec prin modelele de inteligenÈ›Äƒ artificialÄƒ; excepÈ›ia este un asistent sau un rÄƒspuns automat cerut de Client, doar cu cÃ¢mpurile necesare.`,
      `Sub-Ã®mputerniciÈ›ii de mai jos sunt autorizaÈ›i de Client prin acest acord. AleSign anunÈ›Äƒ pe email, cu cel puÈ›in 15 zile Ã®nainte, orice sub-Ã®mputernicit nou sau Ã®nlocuit; Clientul se poate opune motivat, iar dacÄƒ nu se gÄƒseÈ™te o soluÈ›ie, poate Ã®nceta serviciul afectat fÄƒrÄƒ costuri. AleSign impune fiecÄƒruia obligaÈ›ii de protecÈ›ie a datelor cel puÈ›in egale cu cele din acest acord.`,
      `Transferul Ã®n afara SpaÈ›iului Economic European (Ã®n special Ã®n SUA) se face doar cÄƒtre furnizori certificaÈ›i Ã®n cadrul EU-U.S. Data Privacy Framework sau pe baza clauzelor contractuale standard aprobate de Comisia EuropeanÄƒ, dupÄƒ caz.`,
      `Securitatea: acces doar pentru persoanele care au nevoie, cu autentificare Ã®n doi paÈ™i pe conturile principale; chei È™i tokenuri pÄƒstrate criptat; conexiuni criptate; jurnalul accesÄƒrilor; backup; date fictive la testare. Persoanele care au acces la date sunt obligate la confidenÈ›ialitate.`,
      `Incidentele: AleSign anunÈ›Äƒ Clientul Ã®n cel mult 24 de ore de la aflarea unui incident care atinge datele, cu ce se È™tie (ce date, cÃ¢te persoane, ce s-a fÄƒcut) È™i Ã®l ajutÄƒ la notificarea cÄƒtre ANSPDCP (72 de ore) È™i, unde e cazul, cÄƒtre persoanele vizate.`,
      `Drepturile persoanelor: AleSign ajutÄƒ Clientul sÄƒ rÄƒspundÄƒ cererilor de acces, rectificare, È™tergere, restricÈ›ionare, portabilitate È™i opoziÈ›ie, de regulÄƒ Ã®n 5 zile lucrÄƒtoare de la cerere. Dezabonarea funcÈ›ioneazÄƒ Ã®n orice email trimis.`,
      `La Ã®ncetare: AleSign predÄƒ Clientului datele (export) È™i le È™terge Ã®n cel mult 90 de zile, cu excepÈ›ia celor pe care legea Ã®l obligÄƒ sÄƒ le pÄƒstreze (contracte, facturi). La cerere, confirmÄƒ È™tergerea Ã®n scris.`,
      `Verificarea: AleSign pune la dispoziÈ›ia Clientului, la cerere, informaÈ›iile necesare pentru a demonstra respectarea acestui acord.`,
    ],
    lista: SUBIMPUTERNICITI.map(([n, ce, unde]) => `${n}: ${ce} (${unde})`),
  });
  if (pf) out.push({
    titlu: 'Anexa 3 Â· Formularul de retragere',
    p: [
      `Se completeazÄƒ È™i se trimite doar dacÄƒ Clientul doreÈ™te sÄƒ se retragÄƒ din contract. Retragerea se poate face È™i direct, din funcÈ›ia â€žMÄƒ retrag din contractâ€ de pe pagina contractului.`,
      `CÄƒtre ${gol(P.denumire, 'AleSign&Co SRL')}, ${gol(P.adresa)}, email ${gol(P.email, 'info@alesign.net')}:`,
      `Prin prezenta vÄƒ notific cÄƒ mÄƒ retrag din contractul ${d.numar || '[numÄƒrul]'} privind prestarea serviciilor â€ž${d.pachet_nume || ''}â€, Ã®ncheiat la data de ${d.semnat_la ? dataRo(d.semnat_la) : '[data]'}.`,
      `Numele: ${gol(C.denumire, '[numele È™i prenumele]')}. Adresa: ${gol(C.adresa)}. SemnÄƒtura (doar pe hÃ¢rtie): ____________. Data: ____________.`,
    ],
  });
  return out;
}

export function antet(d) {
  return { numar: d.numar || '', data: dataRo(d.semnat_la || d.trimis_la || new Date()), titlu: 'Contract de prestÄƒri servicii' };
}
