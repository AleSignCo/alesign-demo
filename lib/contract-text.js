// Contractul de prestări servicii AleSign&Co · v3 (13.10.2026): linii multiple, totaluri separate, credite, tranșe, buget de reclame, plată anuală,
// indexare, prima lună fără risc, plus pachetul juridic (decizia 6 din v5.1): termenii de îndeplinire pe serviciu, statutul Clientului (firmă sau
// consumator, cu dreptul de retragere), licența transferabilă, găzduirea aleasă, exportul, DPA (Anexa 2), garanțiile, plafonul de răspundere, SLA.
// Un singur text, folosit de pagina /c/<slug> (HTML) și de PDF. Variabilele vin din contracte + setari (contract_date). Scris după lege, fără avocat (decizia lui Alex, 13 oct.).

const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }) : '');
const gol = (v, alt = '[de completat]') => (v && String(v).trim() ? String(v).trim() : alt);

// Liniile contractului (din contracte.linii). Contractele vechi (fără linii) primesc o singură linie din pachet_nume + pret.
export function linii(d) {
  const L = Array.isArray(d.linii) && d.linii.length ? d.linii : [{ tip: 'pachet', cod: d.pachet_cod, nume: d.pachet_nume, cantitate: 1, pret_unitar: Number(d.pret || 0), recurent: d.tip === 'abonament', total: Number(d.pret || 0) }];
  return L.map((l) => {
    const cant = Number(l.cantitate || 1), pu = Number(l.pret_unitar || 0), total = l.total != null ? Number(l.total) : pu * cant;
    const unit = l.unitate === 'zi' ? 'zi' : l.unitate === 'ora' ? 'oră' : l.unitate === 'buc' ? 'buc' : null;
    let afis;
    if (l.tip === 'conditie') afis = l.cod === 'care_luna_4' ? `${nr(pu)} RON / lună, din luna 4` : l.nota || '';
    else if (l.tip === 'inclus') afis = 'inclus, 0 RON';
    else if (l.tip === 'asteptare') afis = 'listă de așteptare, 0 RON';
    else if (l.tip === 'credit') afis = `${nr(total)} RON, o dată`;
    else afis = `${cant > 1 ? `${cant} ${unit || 'buc'} × ${nr(pu)} = ` : ''}${nr(total)} RON${l.recurent ? ' / lună' : ', o dată'}`;
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
  // v5.1 (regula 31): partea plătită o dată se plătește pe tranșe, după total; activ doar cu setarea transe_active = true (o validează Alexandru)
  const T = transeDin(d, L, unic);
  const unicAcum = T[0].suma;
  // prima plată: anual → total anual + o dată (sau prima tranșă); lunar → prima lună + o dată (sau prima tranșă); unic → o dată (sau prima tranșă)
  const prima = (anual != null ? anual : lunar) + unicAcum;
  return { linii: L, lunar, unic, anual, platitor, tva, prima, transe: T, unicAcum, primaCuTva: cuTva(prima), lunarCuTva: cuTva(lunar), unicCuTva: cuTva(unic), unicAcumCuTva: cuTva(unicAcum), anualCuTva: anual != null ? cuTva(anual) : null };
}

// Tranșele (Bot Website v5.1, „Plata pe porți”): sub 5.000 integral; 5.000–19.999 50 / 50 (semnare, aprobarea site-ului);
// de la 20.000 40 / 30 / 30 (semnare, alegerea direcției, aprobarea site-ului); combo-urile 50 / 50, a doua la aprobare sau în ziua 30;
// Growth Year și plata anuală, integral. Fără setarea transe_active = true, totul rămâne integral, ca azi.
export function transeDin(d, L, unic) {
  const integral = [{ procent: 100, suma: unic, cand: 'la semnare', poarta: null }];
  if (String(d.transe_active) !== 'true' || !(unic >= 5000) || d.plata_anual) return integral;
  const coduri = (L || []).filter((l) => l.tip === 'pachet').map((l) => l.cod);
  // doar contractele cu un produs de site (Bot Website v5.1); restul catalogului rămâne cum era
  const SITE = ['website', 'refresh', 'signature', 'schita', 'cinematic', 'magazin', 'magazin_cinematic', 'reparatii', 'lansare', 'relansare', 'relaunch_signature'];
  const SITE_MODULE = ['pagina', 'migrare', 'limba', 'pagina_signature', 'limba_signature', 'integrare', 'moment'];
  const areSite = coduri.some((c) => SITE.includes(c)) || (L || []).some((l) => l.tip === 'modul' && SITE_MODULE.includes(l.cod));
  if (!areSite || coduri.includes('an_crestere')) return integral;
  // pragurile și procentele se iau pe prețul proiectului; creditele (Schița, Website nou, Audit) se scad din prima tranșă („Plata pe porți”)
  const brut = (L || []).filter((l) => !l.recurent && ['pachet', 'modul', 'custom'].includes(l.tip)).reduce((s, l) => s + Number(l.total || 0), 0);
  const credit = Math.max(0, brut - unic);
  const combo = (Array.isArray(d.combo_coduri) ? d.combo_coduri : ['lansare', 'relansare', 'relaunch_signature']).some((c) => c !== 'an_crestere' && coduri.includes(c));
  const atelier = coduri.some((c) => ['cinematic', 'magazin_cinematic'].includes(c));
  const parti = combo ? [[50, 'la semnare', null], [50, 'când Clientul aprobă site-ul sau în ziua 30 de la semnare, oricare vine mai întâi', 'C']]
    : brut < 20000 ? [[50, 'la semnare', null], [50, 'când Clientul aprobă site-ul', 'C']]
    : [[40, 'la semnare', null], [30, atelier ? 'când Clientul aprobă textele' : 'când Clientul alege direcția', atelier ? 'B' : 'A'], [30, 'când Clientul aprobă site-ul', 'C']];
  const T = parti.map(([procent, cand, poarta]) => ({ procent, suma: Math.round(brut * procent / 100), cand, poarta, ...(combo && poarta === 'C' ? { zi30: true } : {}) }));
  T[T.length - 1].suma = Math.round((brut - T.slice(0, -1).reduce((s, x) => s + x.suma, 0)) * 100) / 100;
  if (credit > 0) {
    let rest = credit;
    for (const x of T) { const scad = Math.min(rest, x.suma); x.suma -= scad; rest -= scad; if (scad > 0) x.credit = scad; if (!rest) break; }
  }
  const out = T.filter((x) => x.suma > 0);
  if (out.length < 2 || out[0].poarta) return integral;
  // coada (regula 35): startul la peste 10 zile lucrătoare de la semnare → rezervarea locului, 10 % din preț, la semnare, scăzută din tranșa 1,
  // iar tranșa 1 se plătește cu 10 zile lucrătoare înainte de start; la Atelier, rezervarea e chiar Schița (creditul ei)
  const start = d.start_la ? new Date(String(d.start_la).slice(0, 10) + 'T00:00:00Z') : null;
  const semnare = new Date(String(d.semnat_la || d.creat_la || new Date().toISOString()).slice(0, 10) + 'T00:00:00Z');
  if (start && zileLucratoareIntre(semnare, start) > 10 && !(atelier && credit > 0)) {
    const rez = Math.round(brut * 10 / 100);
    if (out[0].suma > rez) {
      out[0].suma -= rez; out[0].rezervare_scazuta = rez;
      const zi = inapoiZileLucratoare(start, 10);
      out[0].cand = `pe ${dataRo(zi)}, cu 10 zile lucrătoare înainte de data de start`; out[0].data = zi.toISOString().slice(0, 10);
      out.unshift({ procent: 10, suma: rez, cand: 'la semnare', poarta: null, rezervare: true });
    }
  }
  return out;
}

// planul tranșelor, pentru baza de date (transe_plan, SQL 57): sumele fără TVA + procentul de TVA, poarta, data fixă sau ziua 30
export function planTranse(d) {
  const T = totaluri(d);
  if (!T.transe || T.transe.length < 2) return [];
  return T.transe.map((x) => ({ procent: x.procent, suma: x.suma, tva_procent: T.platitor ? T.tva : 0, cand: x.cand, poarta: x.poarta || null, data: x.data || null, zi30: !!x.zi30, rezervare: !!x.rezervare, credit: x.credit || null }));
}

// zilele lucrătoare (luni–vineri, ca public.zile_lucratoare din baza de date) între două date, fără prima
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

// Compatibil cu codul vechi (stripe.js, contract.js): „prețul” = prima plată.
export function pret(d) {
  const t = totaluri(d);
  const per = d.tip === 'abonament' ? (t.anual != null ? 'an' : 'lună') : 'o dată';
  const baza = d.tip === 'abonament' ? (t.anual != null ? t.anual : t.lunar) : t.unic;
  return { baza, tva: t.tva, total: t.primaCuTva, platitor: t.platitor, per, prima: t.prima,
    text: t.platitor ? `${nr(baza)} RON + TVA ${t.tva}% / ${per}` : `${nr(baza)} RON / ${per} (neplătitor de TVA)` };
}

// ——— Pachetul juridic (decizia 6 din v5.1; Alex, 13 oct.: fără avocat, dar totul legal) ———
// Termenii de îndeplinire pe serviciu (Bot Website v5.1, „Cum se livrează”). Termenul curge de la data de start și se mută cu zilele
// în care AleSign așteaptă materiale, accese sau asset-uri de la Client (articolul 5).
export const SERVICII = {
  audit: { termen: '3 zile lucrătoare', runde: null, separat: null },
  reparatii: { termen: '7 zile lucrătoare de la primirea accesului de administrare și a backup-ului confirmat', runde: 'fără runde de design; raport „înainte / după”', separat: null },
  landing: { termen: '3 zile lucrătoare', runde: '1 rundă', separat: 'bugetul de reclame (minimum 1.500 RON / lună), plătit de Client direct platformelor' },
  refresh: { termen: '7 zile lucrătoare', runde: '1 rundă de design; faptele (prețuri, program, contact) se schimbă oricând', separat: 'domeniul, pe numele Clientului' },
  website: { termen: '10 zile lucrătoare', runde: '1 rundă de design; faptele (prețuri, program, contact) se schimbă oricând', separat: 'domeniul, pe numele Clientului; aplicația de programări, dacă o folosește' },
  pagina: { termen: '2 zile lucrătoare în plus la termenul site-ului; 3 zile lucrătoare pe un site deja publicat', runde: '1 rundă', separat: null },
  pagina_signature: { termen: '2 zile lucrătoare în plus la termenul site-ului; 5 zile lucrătoare pe un site deja publicat', runde: '1 rundă', separat: null },
  migrare: { termen: '5 zile lucrătoare în plus la termenul site-ului', runde: '1 rundă', separat: null },
  limba: { termen: '5 zile lucrătoare în plus la termenul site-ului', runde: '1 rundă', separat: 'corectura umană a traducerii, la cost, dacă Clientul o vrea' },
  limba_signature: { termen: '7 zile lucrătoare în plus la termenul site-ului', runde: '1 rundă', separat: 'corectura umană a traducerii, la cost, dacă Clientul o vrea' },
  signature: { termen: '15 zile lucrătoare', fondator: '25 de zile lucrătoare (Client fondator)', runde: '2 runde de design', separat: 'aplicația de programări; fonturile sau pozele stoc premium, la cost, pe numele Clientului' },
  moment: { termen: '10 zile lucrătoare de la primirea asset-ului (fotografie sau model 3D)', runde: '1 rundă', separat: 'asset-ul, la cost' },
  magazin: { termen: '25 de zile lucrătoare de la primirea acceselor', runde: '2 runde de design', separat: 'Shopify, programul de facturare și aplicațiile magazinului (aproximativ 190–510 RON / lună), comisioanele de plată și AWB-urile, pe contul Clientului; producția foto, la cost' },
  integrare: { termen: '10 zile lucrătoare de la primirea acceselor', runde: '1 rundă', separat: 'CRM-ul sau aplicația de programări a Clientului' },
  plata_site: { termen: '7 zile lucrătoare', runde: '1 rundă', separat: 'comisioanele procesatorului de plăți, pe contul Clientului' },
  schita: { termen: '7 zile lucrătoare', runde: '1 rundă', separat: null },
  cinematic: { termen: '25–30 de zile lucrătoare de la primirea asset-urilor, după Schiță', runde: '3 runde de design', separat: 'asset-urile (fotografie, 3D), la cost' },
  magazin_cinematic: { termen: '35–40 de zile lucrătoare de la primirea acceselor și a asset-urilor', runde: '3 runde de design', separat: 'ca la Magazin, plus asset-urile, la cost' },
  cereri: { termen: 'la activare', runde: null, separat: null },
};
// produsele care construiesc un site găzduit (abonamentele includ Refresh; Foundation și combo-urile includ Website nou)
const SITE_CONSTRUIT = ['website', 'refresh', 'signature', 'cinematic', 'landing', 'lansare', 'relansare', 'relaunch_signature', 'foundation', 'an_crestere'];
const MAGAZIN = ['magazin', 'magazin_cinematic'];
const ATELIER = ['cinematic', 'magazin_cinematic', 'schita'];
const LINIE_VITEZA = ['website', 'refresh', 'signature', 'landing', 'lansare', 'relansare', 'relaunch_signature', 'foundation'];

// ce conține contractul: o singură privire pe linii, folosită de toate articolele
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
    carePret: Number(d.care_pret || 190),
  };
}

export function clauze(d) {
  const P = d.prestator || {};
  const C = d.client || {};
  const X = profil(d);
  const { t, abon, pf } = X;
  const min = Number(d.perioada_minima_luni || 0);
  const moduri = Array.isArray(d.plata_moduri) && d.plata_moduri.length ? d.plata_moduri : ['card', 'transfer'];
  const cuCard = moduri.includes('card') && String(d.stripe_activ) === 'true';
  const cum = cuCard ? 'cu cardul (prin Stripe) sau prin transfer bancar în maximum 5 zile lucrătoare de la semnare' : 'prin transfer bancar, în maximum 5 zile lucrătoare de la semnare';
  const idx = Number(d.indexare_procent || 10);
  const ani = Number(d.anual_inghetat_ani || 2);
  const tvaNota = t.platitor ? '' : ` AleSign nu este plătitor de TVA la data semnării${pf ? ', deci prețurile de mai sus sunt finale' : ''}; dacă devine, TVA se adaugă conform legii, cu notificare prealabilă.`;
  const credite = t.linii.filter((l) => l.tip === 'credit');
  const buget = t.linii.find((l) => l.tip === 'conditie' && l.cod === 'buget_reclame');
  const careL4 = t.linii.find((l) => l.tip === 'conditie' && l.cod === 'care_luna_4');
  const asteptare = t.linii.filter((l) => l.tip === 'asteptare');

  // ——— 4. Prețul și plata ———
  const pretP = [];
  if (abon) {
    pretP.push(`Abonamentul costă ${nr(t.lunar)} RON pe lună${t.platitor ? ` plus TVA ${t.tva}%` : ''}${t.unic > 0 ? `, la care se adaugă serviciile plătite o singură dată, în valoare totală de ${nr(t.unic)} RON${t.platitor ? ' plus TVA' : ''}` : t.unic < 0 ? `, din care se scade creditul de ${nr(-t.unic)} RON, o singură dată, pe prima factură` : ''}.${tvaNota}`);
    if (t.anual != null) pretP.push(`Clientul a ales plata anuală: ${nr(t.anual)} RON pe an${t.platitor ? ' plus TVA' : ''}, adică 12 luni cu o reducere de ${nr(Math.round(100 - (t.anual / (t.lunar * 12)) * 100))}% față de plata lunară, plătiți în avans. Prețul abonamentului rămâne neschimbat ${ani} ani de la data activării${d.pret_inghetat_pana ? ` (până pe ${dataRo(d.pret_inghetat_pana)})` : ''}, iar indexarea de la articolul 4.6 nu se aplică în această perioadă.`);
    else pretP.push(`Plata se face în avans, lunar. Prima lună${t.unic > 0 ? (t.transe.length > 1 ? `, împreună cu prima tranșă a serviciilor plătite o dată (${nr(t.unicAcum)} RON),` : ', împreună cu serviciile plătite o dată,') : ''} se plătește ${cum}. Lunile următoare se plătesc la aceeași zi a fiecărei luni${cuCard ? ': automat, dacă s-a ales cardul, sau pe baza facturii, în 5 zile lucrătoare de la emitere, dacă s-a ales transferul' : ', pe baza facturii, în 5 zile lucrătoare de la emitere'}.`);
  } else {
    pretP.push(`Prețul serviciilor este de ${nr(t.unic)} RON${t.platitor ? ` plus TVA ${t.tva}%` : ''}, plătit o singură dată.${tvaNota}`);
    if (t.transe.length > 1) pretP.push(`Plata se face în ${t.transe.length} tranșe: ${t.transe.map((x, i) => `${i + 1}) ${nr(x.suma)} RON ${x.rezervare ? `la semnare, ca rezervare a locului (10% din preț)` : `${x.cand} (${x.procent}% din preț${x.rezervare_scazuta ? ', minus rezervarea' : ''}${x.credit ? `, minus creditul de ${nr(x.credit)} RON` : ''})`}`).join('; ')}. Prima tranșă se plătește ${cum}.`);
    else pretP.push(`Plata se face integral, ${cum}.${d.start_la ? '' : ' Lucrul începe în ziua în care plata este confirmată.'}`);
  }
  if (t.transe.length > 1) {
    pretP.push(`Fiecare tranșă următoare se cere pe email, cu link de plată, în ziua în care se ajunge la momentul ei, și se plătește în 5 zile lucrătoare. Site-ul se publică pe domeniul Clientului doar după plata integrală.`);
    pretP.push(pf
      ? `Dacă Clientul oprește proiectul după termenul de retragere (articolul 15), plătește doar etapele începute; tranșele plătite pentru etapele neîncepute i se restituie în bani, în 14 zile, sau, dacă preferă, devin credit pe orice serviciu AleSign, valabil 6 luni. Clientul primește tot ce a aprobat până atunci: brief-ul și direcțiile, în PDF, și textele aprobate.`
      : `Clientul poate opri proiectul oricând, printr-un email (denunțare unilaterală, articolul 1276 din Codul civil; părțile convin ca dreptul să poată fi exercitat și după începerea lucrului). Prețul opririi sunt tranșele deja plătite: nu se restituie în bani, ci devin credit, valabil 6 luni, pe orice serviciu AleSign. Tranșele la care proiectul nu a ajuns nu se mai datorează. Clientul primește tot ce a aprobat până atunci: brief-ul și direcțiile, în PDF, și textele aprobate.${t.transe[0].rezervare ? ' Dacă oprirea are loc înainte de data de start, rezervarea devine credit în aceleași condiții.' : ''}`);
    if (X.signature) pretP.push(`Garanția direcției: Clientul alege dintre două direcții de design. Dacă nu îl convinge niciuna, AleSign propune încă un set. Dacă nici acesta nu îl convinge, proiectul se oprește, iar AleSign restituie integral sumele plătite pentru site, în 10 zile lucrătoare.`);
    pretP.push(`Dacă Clientul nu aprobă site-ul în 30 de zile de la prezentarea lui, proiectul se închide, iar tranșele plătite rămân la AleSign${pf ? ' pentru munca făcută până atunci' : ''}; previzualizarea rămâne disponibilă în aceste 30 de zile, iar o rundă nouă de lucru se ofertează separat. Dacă AleSign oprește proiectul din motive care țin de AleSign, Clientul primește tot ce s-a lucrat, iar tranșele plătite pentru etapele neîncepute se restituie integral.`);
  }
  if (d.start_la) pretP.push(`Data de start a lucrului este ${dataRo(d.start_la)}. Termenele din Anexa 1 curg de la ea și se mută cu zilele în care AleSign așteaptă materiale, accese sau aprobări de la Client.`);
  pretP.push(`Prima plată este de ${nr(t.prima)} RON${t.platitor ? ` plus TVA, adică ${nr(t.primaCuTva)} RON` : ''}.`);
  if (credite.length) pretP.push(`Creditele din Anexa 1 (${credite.map((l) => `${l.nume}: ${nr(-l.total)} RON`).join('; ')}) se scad o singură dată, din ${t.transe.length > 1 ? 'prima tranșă' : 'prima factură'}, și nu se restituie în bani.`);
  if (careL4) pretP.push(`Din a 4-a lună de la publicarea site-ului, Clientul intră automat în serviciul Care (găzduire, viteză, securitate, actualizări, backup), ${nr(careL4.pret_unitar)} RON pe lună, plătit lunar, pe bază de factură, cu posibilitatea de a renunța oricând cu preaviz de 30 de zile. Dacă între timp Clientul ia un abonament, Care este inclus în el.`);
  if (buget) pretP.push(`Bugetul de reclame nu este inclus în prețurile de mai sus: este al Clientului, se plătește de Client direct platformelor (Meta, Google, TikTok) și este de minimum ${nr(d.buget_reclame_min || 1500)} RON pe lună pentru fiecare lună cu campanii active. Fără buget, campaniile nu pot rula, iar restul serviciilor continuă normal.`);
  pretP.push(`Pentru fiecare plată AleSign emite factură, transmisă pe email${pf ? '' : ' și, unde legea o cere, prin sistemul național e-Factura'}. Facturile se găsesc și în spațiul Clientului, la „Contract și facturi”.`);
  pretP.push(`Dacă o plată întârzie mai mult de 10 zile, AleSign poate suspenda serviciile până la plată, cu o notificare pe email; site-ul rămâne online încă 30 de zile, iar nimic nu se șterge 90 de zile. Dacă întârzie mai mult de 30 de zile, AleSign poate înceta contractul${pf ? '' : ', iar sumele datorate pentru perioada minimă rămân scadente'}.`);
  if (abon) pretP.push(`4.6. Prețul abonamentului se indexează cu ${idx}% o dată pe an, la fiecare aniversare a datei activării, cu o notificare pe email cu 30 de zile înainte${t.anual != null ? ', după perioada cu preț înghețat' : ''}. Clientul care nu acceptă indexarea poate înceta contractul la data ei, fără alte costuri.`);

  // ——— 3. Durata ———
  const durataP = abon
    ? [
        `Contractul intră în vigoare la data primei plăți („data activării”)${min ? ` și se încheie pe o perioadă minimă de ${min} ${min === 1 ? 'lună' : 'luni'}. După perioada minimă, se prelungește automat` : ' și se prelungește automat'}, lună de lună, până când una dintre părți îl încetează cu un preaviz de 30 de zile, transmis pe email sau din spațiul Clientului („Încheie colaborarea”).`,
        d.prima_luna_fara_risc
          ? `Prima lună fără risc: în primele 30 de zile de la activare, Clientul poate înceta contractul printr-un simplu email, fără motiv și fără alte sume de plată. În acest caz perioada minimă nu se mai aplică, plata primei luni rămâne făcută, iar materialele de conținut livrate în această lună (postări, texte, rapoarte) rămân ale Clientului; site-ul inclus în abonament urmează regula de la articolul 14. ${t.anual != null ? 'La plata anuală, AleSign restituie în 10 zile lucrătoare diferența dintre suma plătită și prețul unei luni la tarif lunar. ' : ''}După ziua 30, se aplică perioada minimă de mai sus.`
          : null,
        min && !pf ? `${d.prima_luna_fara_risc ? 'După prima lună, ' : ''}Clientul poate încheia contractul înainte de finalul perioadei minime doar plătind lunile rămase din perioada minimă.` : null,
        min && pf ? `Clientul consumator poate înceta contractul oricând, cu preaviz de 30 de zile, fără penalități; site-ul inclus în abonament urmează regula de la articolul 14.` : null,
      ].filter(Boolean)
    : [
        `Contractul intră în vigoare la data plății${pf ? ' (cu regula de început de la articolul 15)' : ''} și se încheie la livrarea serviciilor din Anexa 1: pentru site, la publicarea pe domeniu după aprobarea Clientului (articolul 5); pentru celelalte servicii, la livrarea confirmată pe email de Client sau, în lipsa unui răspuns, la 5 zile lucrătoare după ce AleSign anunță livrarea.${d.abonament_cod && d.abonament_nume ? ` Dacă oferta conține și luni de abonament (${d.abonament_nume}), acestea încep la activare și, după lunile incluse, abonamentul continuă lunar la prețul din catalog, cu aceleași reguli de încetare ca la articolul 14.` : ''}`,
        X.care ? `Serviciul Care și găzduirea (articolul 9) continuă după livrare, lună de lună, până la încetarea lor cu preaviz de 30 de zile.` : null,
      ].filter(Boolean);

  // ——— 5. Termenele și acceptarea ———
  const termP = [
    `Termenul fiecărui serviciu, numărul rundelor de revizii și ce plătește Clientul separat sunt scrise, serviciu cu serviciu, în Anexa 1. Termenele se socotesc în zile lucrătoare (luni–vineri), curg de la data de start${d.start_la ? '' : ' (ziua confirmării plății, dacă nu s-a stabilit alta)'} și se mută cu zilele în care AleSign așteaptă materiale, accese, aprobări sau asset-uri de la Client.`,
    `Dacă materialele nu vin, AleSign trimite un memento la 2 și la 5 zile. La 14 zile, proiectul iese din programul de lucru și reintră la prima dată liberă, comunicată Clientului. La 30 de zile, proiectul intră în pauză${pf ? '' : ', iar sumele plătite devin credit, valabil 6 luni'}. La 90 de zile, proiectul se închide, iar Clientul primește tot ce a aprobat până atunci.`,
    X.site || X.magazin
      ? `Acceptarea site-ului: nimic nu se publică pe domeniul Clientului fără aprobarea lui. Site-ul se aprobă doar din butonul „Aprob site-ul” din spațiul Clientului, confirmat cu un cod unic trimis pe emailul din contract (articolul 18). Un „ok” pe email sau pe WhatsApp nu ține loc de aprobare. Aprobarea înseamnă acceptarea lucrării; defectele descoperite după aceea intră în garanția de la articolul 11.`
      : `Acceptarea: livrarea se confirmă pe email sau din spațiul Clientului. Dacă, în 5 zile lucrătoare de la anunțul livrării, Clientul nu trimite observații, livrarea se consideră acceptată.`,
    `O rundă de revizii înseamnă o listă de modificări trimisă o dată, pe aceeași versiune. Faptele (prețuri, program, telefon, adresă, echipă) se schimbă oricând, fără să consume o rundă. Rundele în plus, textele noi și secțiunile noi se ofertează separat, înainte de lucru.`,
    X.atelier ? `La proiectele Atelier, Alexandru lucrează personal pe proiect. Dacă lipsește peste 14 zile, Clientul alege: așteaptă, cu termenul mutat, sau oprește proiectul și primește tot ce s-a făcut, iar tranșele pentru etapele neîncepute îi revin integral.` : null,
  ].filter(Boolean);

  // ——— 6. Ce face AleSign ———
  const aleP = [
    `Livrează serviciile din Anexa 1 la termenele de acolo, cu grija unui profesionist.`,
    `Răspunde mesajelor Clientului în cel mult o zi lucrătoare, pe email sau WhatsApp.`,
    X.care ? `Pe durata serviciului Care: timpul de reacție la o problemă este de cel mult 4 ore lucrătoare (luni–vineri, 09:00–18:00). În afara acestui program, sistemul automat de monitorizare revine singur la ultima versiune bună a site-ului și îl alertează pe Alexandru; nu există gardă umană în weekend. Un formular sau o programare care nu mai funcționează se tratează ca incident critic. AleSign promite timp de reacție, nu un procent de disponibilitate.` : null,
    abon ? `Trimite lunar un raport scurt, pe înțelesul Clientului: ce s-a făcut, ce a produs, ce urmează.` : null,
    `Păstrează confidențiale informațiile primite de la Client (accese, date despre clienți, cifre) și le folosește doar pentru acest contract, și după încetarea lui.`,
    `Cere aprobarea Clientului înainte de a publica materiale cu numele lui. Materialele aprobate o dată (de exemplu, un calendar de postări) se publică fără o nouă aprobare.`,
    `Lucrează cu accese date de Client prin roluri de partener sau prin autorizare (OAuth), niciodată cu parolele lui. Cheile de acces se păstrează criptat și se revocă la încetarea contractului sau la cererea Clientului.`,
    `Ține evidența fiecărei generări, aprobări, publicări și fiecărui acces (cine, când, ce versiune), pe durata contractului și 12 luni după.`,
  ].filter(Boolean);

  // ——— 7. Ce face Clientul ———
  const cliP = [
    `Transmite materialele și accesele necesare (fotografii, logo, acces la fișa Google, domeniu, informații despre servicii și prețuri) în cel mult 5 zile lucrătoare de la activare, prin pagina de onboarding primită pe email. Termenele din Anexa 1 curg de la primirea lor.`,
    `Decide ce accese acordă. Fără un acces, AleSign livrează materialele fără publicare și fără raportare din contul respectiv.`,
    `Răspunde cererilor de aprobare în cel mult 2 zile lucrătoare. Lipsa răspunsului decalează termenele, nu obligațiile de plată.`,
    `Răspunde de legalitatea și adevărul informațiilor pe care le furnizează (prețuri, promoții, autorizații, titluri profesionale) și declară că are drepturile asupra imaginilor trimise, inclusiv acordul persoanelor care apar în ele.`,
    X.site || X.magazin ? `Înregistrează domeniul pe numele său (AleSign îl ghidează) și îl reînnoiește la timp; AleSign îl anunță cu 30, 14, 7 și 1 zi înainte de expirare, dacă data e cunoscută.` : null,
    X.magazin ? `Este comerciantul: contul Shopify, contul de plăți, programul de facturare și contul de curierat sunt pe numele lui, iar banii din vânzări intră direct la el. AleSign construiește și întreține tema, nu vinde în numele Clientului.` : null,
    buget ? `Pune la dispoziție bugetul de reclame și accesul la conturile de reclame (sau le creează cu ajutorul AleSign), în numele ${pf ? 'său' : 'firmei sale'}.` : null,
    `Nu solicită servicii în afara Anexei 1 fără un acord scris; ce e în plus se ofertează separat, fără surprize.`,
  ].filter(Boolean);

  // ——— 8. Proprietatea și licența ———
  const propP = [
    X.site || X.magazin
      ? `După plata integrală, Clientul primește o licență perpetuă, gratuită și transferabilă odată cu ${pf ? 'activitatea' : 'firma'} sau cu domeniul, pe tot site-ul livrat, inclusiv pe componentele de șablon sau de kit, în forma livrată. Textele, imaginile create special pentru Client și conținutul site-ului devin proprietatea Clientului după plata integrală. Până atunci, rămân ale AleSign.`
      : `Materialele livrate special pentru Client (texte, imagini create, rapoarte, strategii) devin proprietatea Clientului după plata lor integrală. Până atunci, rămân ale AleSign.`,
    `Sistemul AleSystem Design, agenții automatizați, șabloanele și kitul, procesele și know-how-ul rămân proprietatea AleSign. AleSign păstrează dreptul de a refolosi componentele generale pentru alți clienți, dar nu identitatea Clientului (numele, logo-ul, textele, fotografiile lui).`,
    X.signature ? `Exclusivitatea de design (Signature): timp de 12 luni de la publicare, AleSign nu folosește direcția de design aleasă de Client (paleta, tipografia și compoziția kitului, în configurația lui) pentru un alt client din aceeași nișă${d.nisa ? ` (${d.nisa})` : ''} și din aceeași localitate${d.localitate ? ` (${d.localitate})` : ''}.` : null,
    `Conținutul generat cu ajutorul inteligenței artificiale: AleSign transferă Clientului toate drepturile pe care le are asupra lui. Legea nu garantează protecția prin drept de autor a unui conținut generat automat, iar AleSign nu promite această protecție. AleSign verifică originalitatea față de sursele cunoscute și folosește doar imagini, fonturi și asset-uri pentru care există licență.`,
    `Licențele terților (fonturi, poze stoc premium, modele 3D, aplicații) se cumpără pe numele Clientului, la cost, iar lista lor se predă la plecare. Unde o licență nu se poate transfera, relicențierea e pe cheltuiala Clientului.`,
    `AleSign poate menționa Clientul și lucrarea în portofoliul său, fără date confidențiale. Clientul poate cere oricând, pe email, să nu apară${X.fondator ? '; la clienții fondatori, studiul de caz și jurnalul construcției se publică doar cu acordul lor scris' : ''}.`,
  ].filter(Boolean);

  // ——— 9. Găzduirea, domeniul, accesele, exportul ———
  const gazP = [];
  if (X.site || X.magazin) {
    if (X.magazin) gazP.push(`Magazinul stă pe Shopify, în contul Clientului, cu AleSign colaborator. Clientul editează singur produsele, prețurile, stocul și bannerele.`);
    if (X.site) {
      if (X.gazduire === 'alesign') gazP.push(`Găzduirea aleasă: la AleSign. Site-ul stă pe infrastructura Vercel, în contul AleSign, pe domeniul Clientului. Găzduirea face parte din serviciul Care (${nr(X.carePret)} RON pe lună${t.platitor ? ' plus TVA' : ''}): găzduire, certificat de securitate, viteză, actualizări, backup, monitorizare și revenire automată la ultima versiune bună. Lunile de Care incluse în ofertă (Anexa 1) nu se plătesc separat; după ele, Care continuă pe factură lunară, poate fi oprit cu preaviz de 30 de zile și este inclus în orice abonament.`);
      else if (X.gazduire === 'client_vercel') gazP.push(`Găzduirea aleasă: pe contul Vercel al Clientului (planul Pro, aproximativ 20 USD pe lună, plătit de Client direct către Vercel), cu AleSign membru al echipei lui. AleSign publică acolo, iar Care (${nr(X.carePret)} RON pe lună${t.platitor ? ' plus TVA' : ''}) rămâne disponibil, cu aceleași garanții.`);
      else gazP.push(`Găzduirea aleasă: la Client, ca fișiere. La publicare, AleSign predă fișierele complete ale site-ului (build-ul), cu instrucțiunile de publicare și de DNS. În această variantă nu se aplică serviciul Care, garanția de viteză și monitorizarea, iar formularul de contact trimite mesajele direct pe emailul Clientului. Garanția pentru defecte (articolul 11) acoperă fișierele predate, nemodificate. Clientul poate trece oricând la găzduirea AleSign, cu Care.`);
    }
    gazP.push(`Domeniul este și rămâne al Clientului, înregistrat pe numele lui. Dacă un domeniu a fost cumpărat de AleSign în numele Clientului, i se transferă gratuit, la cerere.`);
    gazP.push(`Exportul: oricând pleacă, Clientul primește în cel mult 30 de zile build-ul complet, conținutul în format JSON, sursele site-ului său și pozele, plus o mutare asistată gratuită pe contul său Vercel. Cu exportul: domeniul scos din proiectul AleSign, cu instrucțiunile DNS; formularul trecut pe emailul Clientului; cererile primite prin site exportate, apoi șterse; lista licențelor terților; accesele revocate. Spațiul Clientului rămâne arhivat 12 luni.`);
    gazP.push(`Un singur termen, de 30 de zile: la încetare, găzduirea de către AleSign continuă 30 de zile, timp în care Clientul alege între „rămân pe Care” (site-ul rămâne online pe Care ${nr(X.carePret)} RON pe lună, pe factură) și export. După 30 de zile fără alegere, găzduirea se oprește, iar exportul rămâne disponibil.`);
  } else {
    gazP.push(`Contractul nu include găzduirea unui site. Conturile create pentru Client (de exemplu, fișa Google sau conturile de reclame) sunt pe numele lui, iar accesele AleSign se revocă la încetare.`);
    gazP.push(`La încetare, AleSign predă Clientului, în cel mult 30 de zile de la cerere, materialele livrate și accesele conturilor create pe numele lui.`);
  }

  // ——— 10. Datele personale ———
  const dateP = [
    `Fiecare parte respectă Regulamentul (UE) 2016/679 (GDPR). Pentru datele de contact ale Clientului (contract, facturi, comunicări), AleSign este operator și le păstrează cât cere legea contabilă și fiscală.`,
    `Pentru datele clienților Clientului la care AleSign ajunge prin servicii (mesaje din formulare, cereri, liste de newsletter, cereri de recenzii, comentarii), Clientul este operatorul, iar AleSign este persoana împuternicită: prelucrează datele doar pe instrucțiunile Clientului, în condițiile din Anexa 2 (Acordul de prelucrare a datelor), parte din acest contract.`,
    `Datele de sănătate nu intră în niciun formular, chat sau modul construit de AleSign (articolul 9 din GDPR). Pe site-urile din domeniul medical, formularul cere doar numele, telefonul și intervalul preferat.`,
    `Dacă AleSign află de un incident de securitate care atinge datele clienților Clientului, îl anunță pe Client în cel mult 24 de ore, ca acesta, în calitate de operator, să poată notifica autoritatea (ANSPDCP) în 72 de ore, unde legea o cere.`,
  ];

  // ——— 11. Garanțiile ———
  const garP = garantii(d, X);

  // ——— 12. Răspunderea ———
  const raspP = [
    `Răspunderea totală a AleSign pentru orice prejudiciu legat de acest contract se limitează la sumele plătite de Client în ultimele 12 luni. AleSign nu răspunde pentru pierderi indirecte (profit nerealizat, clienți pierduți) și nici pentru efectele deciziilor platformelor terțe (Google, Meta, TikTok, Shopify, furnizori de găzduire) asupra conturilor Clientului.`,
    `Limitările de mai sus nu se aplică prejudiciilor cauzate cu intenție sau din culpă gravă (articolul 1355 din Codul civil)${pf ? ' și nici drepturilor pe care legea le dă consumatorului și care nu pot fi limitate prin contract' : ''}.`,
    `AleSign nu promite niciodată un anumit număr de clienți, vânzări, locul în Google, un procent de disponibilitate sau oameni de gardă în weekend. Promite ce scrie în Anexa 1, la termen și la calitatea descrisă, și timpul de reacție de la articolul 6.`,
    `Niciuna dintre părți nu răspunde pentru neexecutarea cauzată de forță majoră (articolul 1351 din Codul civil), notificată celeilalte părți în 5 zile de la apariție. Dacă forța majoră durează peste 30 de zile, oricare parte poate înceta contractul.`,
  ];

  // ——— 13. Ce nu facem ———
  const nuP = [
    `AleSign nu publică și nu construiește: afirmații false sau care nu se pot dovedi („cel mai bun din oraș”, rezultate garantate), recenzii sau testimoniale inventate, conținut care încalcă drepturile altcuiva, imitații ale altor firme sau persoane, colectarea de date fără temei legal, publicitate pentru alcool, tutun sau jocuri de noroc.`,
    `În domeniile reglementate (medical și stomatologic, estetic, cosmetice, suplimente, juridic, financiar), materialele respectă regulile profesiei și ale publicității din domeniu: fără promisiuni de rezultat, fără superlative nedovedite, fără „înainte / după” fără acordul scris al persoanei, cu aprobarea lui Alexandru pe fiecare piesă. Pentru suplimente, servicii juridice sau financiare, Clientul confirmă că afirmațiile îi aparțin și sunt permise în profesia lui.`,
    `AleSign poate refuza o cerere care contravine legii, acestui articol sau regulilor platformelor, fără penalitate. Refuzul se motivează pe email și vine, unde se poate, cu o formulare permisă. Refuzul unei cereri nu afectează restul contractului.`,
  ];

  // ——— 14. Încetarea ———
  const incP = [
    abon ? `Oricare parte poate înceta contractul ${min && !pf ? 'după perioada minimă' : 'oricând'}, cu preaviz de 30 de zile, pe email sau din spațiul Clientului („Încheie colaborarea”, confirmat cu un cod trimis pe emailul din contract), fără alt motiv.` : `Contractul încetează la livrare, conform articolului 3. Serviciul Care, dacă există, se încheie cu preaviz de 30 de zile, pe email sau din spațiul Clientului.`,
    `Oricare parte poate înceta contractul imediat dacă cealaltă își încalcă grav obligațiile și nu remediază în 10 zile de la notificare.`,
    abon && X.site ? `Site-ul inclus în abonament devine al Clientului, cu licența de la articolul 8, după perioada minimă${min ? ` de ${min} ${min === 1 ? 'lună' : 'luni'}` : ''}. Dacă abonamentul se încheie mai devreme (inclusiv în prima lună), Clientul păstrează site-ul plătind prețul lui de catalog (Website Refresh 900 RON, Website nou 2.900 RON, Signature 7.900 RON); altfel, site-ul nou se retrage, iar dacă site-ul vechi era găzduit de AleSign, acesta revine online.` : null,
    `La neplata unui abonament: memento la 7 zile, suspendarea lucrului nou la 14 zile, Care pus pe pauză la 30 de zile; nimic nu se șterge 90 de zile. O dispută de plată deschisă la bancă oprește lucrul nou și publicarea pe acel contract până la soluționare.`,
    `La încetare, serviciile prestate până atunci rămân plătite, accesele AleSign se revocă, iar predarea și exportul se fac conform articolului 9.`,
  ].filter(Boolean);

  // ——— 15. Statutul Clientului și dreptul de retragere ———
  const retP = pf
    ? [
        `Clientul încheie contractul ca persoană fizică, consumator. Informațiile cerute de Ordonanța de urgență nr. 34/2014 (prestatorul, serviciile, prețul total, plata, termenele, durata, încetarea, reclamațiile) sunt cele din acest contract și din Anexa 1.`,
        `Dreptul de retragere: Clientul se poate retrage din contract în 14 zile de la încheierea lui (data semnării), fără motiv și fără costuri, prin funcția „Mă retrag din contract” de pe pagina contractului, printr-un email la ${gol(P.email, 'info@alesign.net')} sau folosind formularul din Anexa 3. Ajunge ca declarația să fie trimisă înainte de expirarea termenului. AleSign confirmă primirea pe email, imediat.`,
        `Lucrul începe după expirarea termenului de retragere, cu excepția cazului în care Clientul cere expres, la semnare, să înceapă mai devreme. Dacă a cerut asta și se retrage, plătește doar contravaloarea serviciilor prestate până la data retragerii, proporțional cu prețul total. Dacă serviciul a fost prestat integral înainte de expirarea termenului, la cererea expresă a Clientului și cu confirmarea că știe că astfel pierde dreptul de retragere, retragerea nu mai este posibilă.`,
        `În caz de retragere, AleSign restituie toate sumele primite (minus, după caz, contravaloarea de mai sus) în cel mult 14 zile de la data la care a fost informat, folosind aceeași metodă de plată, fără comisioane pentru Client.`,
        `Clientul beneficiază de garanția legală de conformitate pentru conținutul și serviciile digitale (Ordonanța de urgență nr. 141/2021), pe lângă garanțiile de la articolul 11.`,
      ]
    : [
        `Clientul încheie contractul ca profesionist, în scopul activității sale${C.cui ? ` (CUI ${C.cui})` : ''}. Prevederile despre dreptul de retragere al consumatorilor (Ordonanța de urgență nr. 34/2014) nu se aplică.`,
      ];

  // ——— 16. Modificări, comenzi suplimentare, cesiune ———
  const modP = [
    `Contractul, cu anexele lui, reprezintă întregul acord al părților și înlocuiește orice discuție anterioară. Modificările se fac în scris, pe email sau printr-un act adițional acceptat online, cu acordul ambelor părți.`,
    abon ? `Un serviciu în plus pe un abonament activ se adaugă printr-o comandă suplimentară, paralelă, care nu închide și nu schimbă abonamentul. Trecerea pe alt abonament se face printr-un act de schimbare de pachet, de la data următoarei facturi.` : `Un serviciu în plus se adaugă printr-o comandă suplimentară, cu prețul și termenul ei, fără să schimbe acest contract.`,
    `Contractul, accesele și licența trec la altă ${pf ? 'persoană' : 'firmă'} (de exemplu, la vânzarea afacerii) doar printr-un act adițional semnat de toate părțile; la cesiune, cheile de acces și linkul spațiului se reemit.`,
  ];

  // ——— 17. Comunicări, lege, litigii ———
  const legeP = [
    `Comunicările oficiale dintre părți se fac pe email, la adresele din articolul 1, și se consideră primite în ziua lucrătoare următoare trimiterii. Reclamațiile se trimit la ${gol(P.email, 'info@alesign.net')}; AleSign răspunde în cel mult 5 zile lucrătoare.`,
    pf
      ? `Contractul este guvernat de legea română. Orice neînțelegere se rezolvă întâi prin discuție directă, în 15 zile. Clientul consumator se poate adresa și Autorității Naționale pentru Protecția Consumatorilor, inclusiv procedurii de soluționare alternativă a litigiilor (SAL), la reclamatiisal.anpc.ro, precum și instanțelor competente potrivit legii, inclusiv celor de la domiciliul său.`
      : `Contractul este guvernat de legea română. Orice neînțelegere se rezolvă întâi prin discuție directă, în 15 zile; dacă nu se ajunge la o soluție, de instanțele competente de la sediul AleSign.`,
    `Dacă o clauză devine nulă sau inaplicabilă, restul contractului rămâne valabil, iar părțile o înlocuiesc cu o clauză permisă, cât mai apropiată de intenția inițială.`,
  ];

  // ——— 18. Semnarea electronică și aprobările cu cod ———
  const semnP = [
    `Părțile convin că acest contract se poate semna electronic, pe pagina pusă la dispoziție de AleSign: prin scrierea numelui${pf ? '' : ' reprezentantului'}, bifarea acordului și apăsarea butonului „Semnez”. Semnătura este înregistrată cu data, ora și adresa IP, iar contractul semnat se trimite pe email ambelor părți. O astfel de semnătură electronică are efecte juridice și nu poate fi respinsă doar pentru că este în formă electronică (Regulamentul (UE) nr. 910/2014, art. 25). Părțile pot semna și clasic, pe hârtie, cu același efect.`,
    `Aprobările din spațiul Clientului care au efecte în contract („Aprob site-ul”, „Încheie colaborarea”) se confirmă cu un cod unic, trimis pe emailul din contract și valabil un timp scurt. Introducerea codului are valoarea unei semnături electronice a Clientului pentru acel act și se înregistrează cu data, ora și adresa IP.`,
  ];

  const parti = pf
    ? `${gol(C.denumire, '[numele și prenumele]')}, cu domiciliul în ${gol(C.adresa)}, email ${gol(C.email)}${C.telefon ? `, telefon ${C.telefon}` : ''}, persoană fizică, în calitate de beneficiar (numit în continuare „Clientul”),`
    : `${gol(C.denumire, '[firma clientului]')}, cu sediul în ${gol(C.adresa)}, CUI ${gol(C.cui)}${C.regcom ? `, înregistrată la Registrul Comerțului sub nr. ${C.regcom}` : ''}, reprezentată de ${gol(C.reprezentant, '[reprezentant]')}, email ${gol(C.email)}${C.telefon ? `, telefon ${C.telefon}` : ''}, în calitate de beneficiar (numit în continuare „Clientul”),`;

  const sec = [
    ['Părțile', [
      `${gol(P.denumire, 'AleSign&Co SRL')}, cu sediul în ${gol(P.adresa)}, CUI ${gol(P.cui)}, înregistrată la Registrul Comerțului sub nr. ${gol(P.regcom)}, email ${gol(P.email, 'info@alesign.net')}, reprezentată de ${gol(P.reprezentant, 'Alexandru-Vlad Pavăl')}, în calitate de prestator (numit în continuare „AleSign”),`,
      `și`,
      parti,
      `au convenit încheierea prezentului contract de prestări servicii, în condițiile de mai jos.`,
    ]],
    ['Ce facem și cum lucrăm', [
      `AleSign prestează pentru Client serviciile din oferta „${d.pachet_nume}”, descrise linie cu linie în Anexa 1, cu termenele de îndeplinire ale fiecăruia.`,
      d.descriere ? `Detalii convenite pentru acest contract: ${d.descriere}` : null,
      asteptare.length ? `Serviciile marcate „listă de așteptare” în Anexa 1 (${asteptare.map((l) => l.nume).join(', ')}) nu fac obiectul acestui contract și nu se facturează; când devin disponibile, AleSign le propune Clientului printr-un act adițional.` : null,
      `Rolurile: Clientul decide (aprobă ce se publică, ce se construiește, ce se schimbă) și rămâne titularul afacerii, al conturilor și al datelor clienților săi; AleSign execută. Nimic nu se publică în numele Clientului fără aprobarea lui.`,
      `AleSign lucrează prin sistemul său AleSystem Design, cu agenți automatizați bazați pe inteligență artificială, și prin munca echipei sale. Fiecare livrabil trece prin verificări automate și prin aprobarea unui om (Alexandru sau Clientul) înainte de publicare. Un asistent automat pus pe site-ul Clientului se prezintă ca atare din primul mesaj, iar o imagine generată care poate fi luată drept fotografie reală se marchează ca ilustrativă.`,
      `Serviciile sunt de marketing digital, construcție și întreținere de prezență online și automatizare a comunicării cu clienții. AleSign nu garantează un anumit număr de clienți, vânzări sau poziții în Google; garantează că livrează ce scrie în Anexa 1, la timp și la calitatea descrisă.`,
    ].filter(Boolean)],
    ['Durata', durataP],
    ['Prețul și plata', pretP],
    ['Termenele de îndeplinire și acceptarea', termP],
    ['Ce face AleSign', aleP],
    ['Ce face Clientul', cliP],
    ['Proprietatea și licența', propP],
    [X.site || X.magazin ? 'Găzduirea, domeniul, accesele și exportul' : 'Conturile, accesele și predarea', gazP],
    ['Datele personale', dateP],
    ['Garanțiile', garP],
    ['Răspunderea', raspP],
    ['Ce nu facem și domeniile reglementate', nuP],
    ['Încetarea', incP],
    [pf ? 'Clientul consumator și dreptul de retragere' : 'Statutul Clientului', retP],
    ['Modificări, comenzi suplimentare și cesiune', modP],
    ['Comunicări, lege, litigii', legeP],
    ['Semnarea electronică și aprobările cu cod', semnP],
  ];
  return sec.map(([titlu, p], i) => ({ titlu: `${i + 1}. ${titlu}`, p }));
}

// Garanțiile 1–12 (Bot Website v5.1, „Garanții”), doar cele care se aplică liniilor contractului
export function garantii(d, X = profil(d)) {
  const { t, are } = X;
  const g = [];
  const siteTreapta = X.site || X.magazin || X.atelier;
  if (t.transe.length > 1) g.push(`Plătești restul când aprobi: ultima tranșă se cere la aprobarea site-ului, iar site-ul nu se publică până când Clientul nu apasă „Aprob site-ul”.`);
  if (X.signature && t.transe.length < 2) g.push(`Garanția direcției: Clientul alege dintre două direcții de design. Dacă nu îl convinge niciuna, AleSign propune încă un set. Dacă nici acesta nu îl convinge, proiectul se oprește, iar AleSign restituie integral sumele plătite pentru site, în 10 zile lucrătoare.`);
  if (X.signature && t.transe.length > 1) g.push(`Garanția direcției, în condițiile de la articolul 4.`);
  if (are('cinematic', 'magazin_cinematic')) g.push(`La Atelier, garanția direcției este Schița: Clientul vede direcțiile înainte să cumpere proiectul.`);
  if (siteTreapta && !X.reparatii) g.push(`Termenul, scris: pentru fiecare 5 zile lucrătoare de întârziere din vina AleSign, Clientul primește o lună de Care gratuită, la nivelul treptei, cel mult 3${X.gazduire === 'client_fisiere' ? ' (la site-ul găzduit de Client, contravaloarea ei, ca credit pe orice serviciu AleSign)' : ''}. Termenul se mută cu zilele în care AleSign așteaptă materiale, accese sau asset-uri.`);
  if (siteTreapta && !X.reparatii) g.push(`12 luni pentru defecte de funcționare, cu sau fără Care: AleSign repară gratuit. Sunt excluse conținutul schimbat de Client în afara formularelor puse la dispoziție de AleSign, funcțiile noi, platformele terților (Shopify și aplicațiile lui, aplicațiile de programări) și site-urile mutate pe altă găzduire sau modificate de alții.`);
  if (X.reparatii) g.push(`Reparații: 30 de zile de garanție pe reparațiile făcute. Înainte de lucru se confirmă un backup, iar la final Clientul primește raportul „înainte / după”, cu aceleași verificări măsurate.`);
  if (X.viteza) g.push(`Viteza: la predare, scorul PageSpeed pe mobil este peste 90 pe domeniul Clientului (mediana a 3 rulări). Dacă scade din cauza codului AleSign, AleSign repară în 5 zile lucrătoare. Sunt excluse conținutul și scripturile adăugate la cererea Clientului.`);
  if (siteTreapta && !X.reparatii) g.push(`Dovada: la predare, Clientul primește raportul verificărilor automate trecute de site (accesibilitate, viteză, securitate, conformitate legală, SEO tehnic, funcționare).`);
  if (X.magazin) g.push(`Comanda reală înainte de lansare: Clientul plasează o comandă cu cardul său pe magazinul încă protejat cu parolă, iar AleSign o rambursează; urmează 14 zile de supraveghere zilnică a comenzilor, facturilor și AWB-urilor.`);
  if (are('website')) g.push(`Urci fără pierdere: ce a plătit Clientul pe Website nou se scade integral din Signature sau Magazin, dacă trece la ele în 6 luni de la publicare.`);
  if (are('audit')) g.push(`Auditul se scade integral din orice serviciu AleSign cumpărat în 30 de zile.`);
  if (are('schita')) g.push(`Schița se scade integral din proiectul pe care îl recomandă (cel mult 50% din prețul proiectului), dacă proiectul se semnează în 30 de zile de la livrarea ei.`);
  if (d.dev_rezerva === true && (X.site || X.magazin)) g.push(`Continuitatea: dacă Alexandru lipsește, o persoană numită (dezvoltatorul de rezervă) preia Care-ul site-ului Clientului în cel mult 48 de ore. Exportul este disponibil oricând.`);
  if (X.fondator && X.signature) g.push(`Client fondator Signature: încă 6 luni de Care, gratuit, migrarea gratuită pe versiunea următoare a kitului și jurnalul construcției, publicat doar cu acordul Clientului.`);
  if (X.fondator && are('cinematic')) g.push(`Client fondator Cinematic: 3 luni de Care Plus, gratuit.`);
  g.push(`Garanțiile de mai sus sunt bonusuri, nu reduceri de preț, și se adaugă drepturilor pe care Clientul le are prin lege.`);
  return g;
}

export function anexa(d) {
  const X = profil(d);
  const { t, abon } = X;
  const include = (Array.isArray(d.include) ? d.include : []).filter((x) => !t.linii.some((l) => l.nume === x)); // fără dubluri cu liniile
  // termenii pe serviciu: fiecare linie cu treapta ei din „Cum se livrează”
  const servicii = [];
  for (const l of t.linii.filter((x) => ['pachet', 'modul'].includes(x.tip))) {
    const s = SERVICII[l.cod];
    if (!s) continue;
    servicii.push({ serviciu: l.nume, termen: X.fondator && s.fondator ? s.fondator : s.termen, runde: s.runde || '—', separat: s.separat || '—' });
  }
  const generic = abon
    ? [
        'Ziua 1–3 de la primirea materialelor: apel de pornire (15 minute), plan de lucru pentru prima lună.',
        X.site ? 'Site-ul (Refresh sau cel inclus în pachet) intră în lucru la termenul din tabelul de mai sus; fișa Google se pune la punct în primele 10 zile lucrătoare.' : null,
        'Ziua 10–30: primele materiale de publicat trimise spre aprobare; publicare automată după aprobare.',
        'Ziua 30 și apoi lunar: raportul lunar, în maximum 2 minute de citit.',
      ].filter(Boolean)
    : servicii.length
      ? []
      : [
          'Ziua 1–3 de la primirea materialelor: apel de pornire (15 minute) și confirmarea structurii.',
          'Ziua 4–15: lucrul și prima versiune, trimisă spre aprobare.',
          'Până în ziua 20: corecturi (o rundă) și livrarea.',
          'La final: predarea materialelor și a acceselor.',
        ];
  const totText = [
    t.lunar > 0 ? `Total lunar: ${nr(t.lunar)} RON${t.platitor ? ' + TVA' : ''}` : null,
    t.anual != null ? `Total anual (plată în avans): ${nr(t.anual)} RON${t.platitor ? ' + TVA' : ''}` : null,
    t.unic !== 0 ? `Total o dată: ${nr(t.unic)} RON${t.platitor ? ' + TVA' : ''}` : null,
    `Prima plată: ${nr(t.prima)} RON${t.platitor ? ` + TVA = ${nr(t.primaCuTva)} RON` : ''}`,
  ].filter(Boolean);
  const gaz = X.site ? { alesign: 'Găzduirea: la AleSign (Vercel AleSign, domeniul Clientului), prin serviciul Care.', client_vercel: 'Găzduirea: pe contul Vercel al Clientului, cu AleSign membru.', client_fisiere: 'Găzduirea: la Client, ca fișiere predate (fără Care).' }[X.gazduire] : null;
  return {
    titlu: `Anexa 1 · Oferta „${d.pachet_nume}” și termenii de îndeplinire`,
    linii: t.linii, totaluri: totText, include, servicii, termene: generic, gazduire: gaz,
    nota: `Termenele se socotesc în zile lucrătoare și curg de la data de start${d.start_la ? ` (${dataRo(d.start_la)})` : ''}; se mută cu zilele în care AleSign așteaptă materiale, accese, aprobări sau asset-uri de la Client (articolul 5).${X.pf && !d.incepere_acord_la ? ' La Clientul consumator care nu a cerut începerea imediată, data de start este ziua de după termenul de retragere (articolul 15).' : ''} Liniile marcate „inclus” nu se facturează separat; liniile „listă de așteptare” nu fac obiectul contractului.`,
  };
}

// Anexa 2 (DPA, art. 28 GDPR) și, la consumator, Anexa 3 (formularul de retragere)
export const SUBIMPUTERNICITI = [
  ['Anthropic', 'modelele de inteligență artificială care scriu și verifică textele', 'SUA'],
  ['Vercel', 'găzduirea site-urilor și a paginilor AleSign', 'SUA, cu servere în UE'],
  ['Supabase', 'baza de date, fișierele și autentificarea', 'SUA (furnizorul); regiunea proiectului'],
  ['n8n', 'automatizările (fluxurile de lucru)', 'Germania'],
  ['Google', 'emailul (Gmail), fișa Google a Clientului', 'UE / SUA'],
  ['Brevo', 'trimiterea newsletterelor', 'Franța'],
  ['Stripe', 'plățile cu cardul', 'Irlanda / SUA'],
  ['GitHub', 'codul site-urilor', 'SUA'],
  ['Oblio', 'facturile AleSign', 'România'],
  ['Meta', 'doar la campaniile de reclame ale Clientului', 'Irlanda / SUA'],
  ['serviciul de monitorizare și cel de raportare a erorilor', 'disponibilitatea site-ului și erorile tehnice, fără conținutul mesajelor', 'numele lor se comunică pe email înainte de folosire'],
];

export function anexe(d) {
  const P = d.prestator || {};
  const C = d.client || {};
  const pf = d.client_tip === 'persoana_fizica';
  const out = [];
  out.push({
    titlu: 'Anexa 2 · Acordul de prelucrare a datelor (art. 28 din Regulamentul (UE) 2016/679)',
    p: [
      `Părțile: Clientul, ca operator, și AleSign, ca persoană împuternicită. Acordul se aplică în măsura în care serviciile din Anexa 1 implică date personale ale clienților, pacienților, abonaților sau vizitatorilor Clientului și durează cât contractul, plus perioada de predare.`,
      `Ce date și ale cui: vizitatorii site-ului care trimit formularul sau o cerere (nume, telefon, email, mesajul, intervalul preferat), abonații newsletterului (email, nume, dovada consimțământului), clienții cărora li se cere o recenzie (nume, email sau telefon), persoanele care comentează pe paginile Clientului. Nu se prelucrează date de sănătate sau alte categorii speciale de date.`,
      `Scopul: transmiterea cererilor către Client, trimiterea newsletterelor și a cererilor de recenzii doar către persoanele care au acceptat, răspunsurile automate, rapoartele agregate. AleSign nu folosește datele în alt scop, nu le vinde și nu antrenează modele de inteligență artificială pe ele. Mesajele din formulare nu trec prin modelele de inteligență artificială; excepția este un asistent sau un răspuns automat cerut de Client, doar cu câmpurile necesare.`,
      `Sub-împuterniciții de mai jos sunt autorizați de Client prin acest acord. AleSign anunță pe email, cu cel puțin 15 zile înainte, orice sub-împuternicit nou sau înlocuit; Clientul se poate opune motivat, iar dacă nu se găsește o soluție, poate înceta serviciul afectat fără costuri. AleSign impune fiecăruia obligații de protecție a datelor cel puțin egale cu cele din acest acord.`,
      `Transferul în afara Spațiului Economic European (în special în SUA) se face doar către furnizori certificați în cadrul EU-U.S. Data Privacy Framework sau pe baza clauzelor contractuale standard aprobate de Comisia Europeană, după caz.`,
      `Securitatea: acces doar pentru persoanele care au nevoie, cu autentificare în doi pași pe conturile principale; chei și tokenuri păstrate criptat; conexiuni criptate; jurnalul accesărilor; backup; date fictive la testare. Persoanele care au acces la date sunt obligate la confidențialitate.`,
      `Incidentele: AleSign anunță Clientul în cel mult 24 de ore de la aflarea unui incident care atinge datele, cu ce se știe (ce date, câte persoane, ce s-a făcut) și îl ajută la notificarea către ANSPDCP (72 de ore) și, unde e cazul, către persoanele vizate.`,
      `Drepturile persoanelor: AleSign ajută Clientul să răspundă cererilor de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, de regulă în 5 zile lucrătoare de la cerere. Dezabonarea funcționează în orice email trimis.`,
      `La încetare: AleSign predă Clientului datele (export) și le șterge în cel mult 90 de zile, cu excepția celor pe care legea îl obligă să le păstreze (contracte, facturi). La cerere, confirmă ștergerea în scris.`,
      `Verificarea: AleSign pune la dispoziția Clientului, la cerere, informațiile necesare pentru a demonstra respectarea acestui acord.`,
    ],
    lista: SUBIMPUTERNICITI.map(([n, ce, unde]) => `${n}: ${ce} (${unde})`),
  });
  if (pf) out.push({
    titlu: 'Anexa 3 · Formularul de retragere',
    p: [
      `Se completează și se trimite doar dacă Clientul dorește să se retragă din contract. Retragerea se poate face și direct, din funcția „Mă retrag din contract” de pe pagina contractului.`,
      `Către ${gol(P.denumire, 'AleSign&Co SRL')}, ${gol(P.adresa)}, email ${gol(P.email, 'info@alesign.net')}:`,
      `Prin prezenta vă notific că mă retrag din contractul ${d.numar || '[numărul]'} privind prestarea serviciilor „${d.pachet_nume || ''}”, încheiat la data de ${d.semnat_la ? dataRo(d.semnat_la) : '[data]'}.`,
      `Numele: ${gol(C.denumire, '[numele și prenumele]')}. Adresa: ${gol(C.adresa)}. Semnătura (doar pe hârtie): ____________. Data: ____________.`,
    ],
  });
  return out;
}

export function antet(d) {
  return { numar: d.numar || '', data: dataRo(d.semnat_la || d.trimis_la || new Date()), titlu: 'Contract de prestări servicii' };
}
