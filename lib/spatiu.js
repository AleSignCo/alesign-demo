// Spațiul clientului (motor de livrare, etapa 1): demo.alesign.net/s/<token>
// Clientul vede ce a trecut de Alex, aprobă sau cere modificări, vede calendarul, ce lipsește, contractele, rapoartele, și scrie mesaje.
// Fără login: tokenul din link e cheia. Aceeași linie vizuală ca Mostra și contractul. Zero prețuri sau termene interne.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', timeZone: 'Europe/Bucharest' }) : '');
const dataScurt = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', timeZone: 'Europe/Bucharest' }) : '');
const oraRo = (d) => (d ? new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }) : '');
const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { maximumFractionDigits: 2 });
// „de” după numerele de la 20 în sus (regula românească): 15 verificări, 72 de verificări
const nrVerif = (n) => { const k = Number(n) || 0; return k % 100 >= 1 && k % 100 <= 19 ? String(k) : `${k} de`; };
const prenume = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const nl = (s) => esc(s).replace(/\n/g, '<br>');

const TIP = { postare: 'Postare', postare_gbp: 'Postare Google', campanie: 'Campanie de reclame', landing: 'Landing page', newsletter: 'Newsletter', video: 'Video', website: 'Site-ul nou', refresh: 'Site-ul actualizat', audit: 'Audit', strategie: 'Strategie', raport: 'Raport', clarity: 'Clarity', call: 'Call', reputatie: 'Răspuns la o recenzie', cerere_recenzie: 'Mesaj de cerere de recenzie' };
const CANAL = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', google: 'Google' };
const LIPSA = {
  poze: ['Poze cu locul și cu echipa', 'Fără ele, postările pornesc cu imagini generice.'],
  oferta: ['Lista de servicii și prețuri', 'E baza pentru orice text: nu scriem nimic ce nu e aici.'],
  brand: ['Tonul în care vrei să vorbim', 'Trei cuvinte sunt de ajuns: cald, direct, elegant.'],
  domeniu: ['Domeniul site-ului', 'Numele domeniului și unde e înregistrat.'],
  acces_gbp: ['Acces la fișa Google', 'Ne adaugi ca manager al fișei; îți arăt cum, într-un minut.'],
  acces_ads: ['Acces la contul de reclame', 'Rămâne al tău; ne dai rol de partener.'],
  acces_meta: ['Conectare Facebook și Instagram', 'Un singur buton, fără parole.'],
  buget: ['Bugetul de reclame', 'Îl stabilim împreună înainte să pornească orice campanie.'],
  lista_newsletter: ['Lista de abonați', 'Doar persoane care și-au dat acordul.'],
  material_video: ['Materiale video brute', 'Clipuri scurte, filmate cu telefonul, sunt perfecte.'],
  acces_site: ['Accesul la site și backup-ul', 'Un utilizator temporar pentru reparații și confirmarea gazdei că există un backup recent. Fără parole pe email: îți arăt cum.'],
  audit: ['Auditul site-ului', 'Reparațiile pornesc de la un Audit din ultimele 90 de zile.'],
  campanie: ['Campania de reclame pentru landing', 'Landingul pornește odată cu campania ta: o aprobi și mă apuc de pagină.'],
};
const STARE = { de_creat: 'în lucru', asteapta_material: 'așteaptă materiale de la tine', in_lucru: 'în lucru', la_alex: 'în lucru', la_client: 'la tine', modificare: 'în lucru', aprobat: 'gata, pleacă la dată', programat: 'programată', de_publicat_manual: 'programată', manual: 'în lucru', publicat: 'publicată', livrat: 'livrată', esuat: 'în lucru' };

const MARCA = `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="28" cy="28" r="20"/><circle cx="28" cy="28" r="5" fill="currentColor" stroke="none"/><circle cx="42.1" cy="13.9" r="6" fill="#ff2a2e" stroke="none"/></svg>`;

// markdown ușor (## titlu, - listă, **bold**) pentru documentele scrise de boți (raport, campanie, landing, strategie, newsletter); totul trece prin esc()
const md = (t) => {
  const inl = (x) => esc(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const out = []; let li = null;
  String(t || '').replace(/\r/g, '').split('\n').forEach((l) => {
    if (/^\s*[-•]\s+/.test(l)) { if (!li) { li = []; out.push(li); } li.push(`<li>${inl(l.replace(/^\s*[-•]\s+/, ''))}</li>`); return; }
    li = null;
    if (/^#{1,3}\s+/.test(l)) out.push(`<h4 class="mdh">${inl(l.replace(/^#{1,3}\s+/, ''))}</h4>`);
    else if (l.trim()) out.push(`<p class="mdp">${inl(l)}</p>`);
  });
  return out.map((x) => (Array.isArray(x) ? `<ul class="mdl">${x.join('')}</ul>` : x)).join('');
};
const structurat = (s) => {
  const c = s.continut || {};
  const rand = (k, v) => (v ? `<p class="meta"><span class="k">${esc(k)}:</span> ${esc(v)}</p>` : '');
  if (s.tip === 'campanie') return `${rand('Obiectiv', c.obiectiv)}${c.buget_lunar != null ? rand('Buget lunar', `${nr(c.buget_lunar)} RON, plătit direct platformelor${Array.isArray(c.impartire) && c.impartire.length ? ` (${c.impartire.map((x) => `${x.canal} ${x.procent}%`).join(', ')})` : ''}`) : ''}${(Array.isArray(c.reclame) ? c.reclame : []).map((r) => `<div class="recl"><p class="meta">Reclama ${esc(r.nume || '')} · ${esc(r.unghi || '')}</p><p class="rt">${esc(r.titlu || '')}</p><p>${esc(r.text_principal || '')}</p><p class="meta">${esc(r.cta || '')}</p></div>`).join('')}`;
  if (s.tip === 'landing') return `${rand('Subtitlu', c.subtitlu)}${c.cta ? rand('Butonul paginii', `${c.cta.text || ''}${c.cta.tinta ? ` → ${c.cta.tinta}` : ''}`) : ''}`;
  if (s.tip === 'newsletter') return `${rand('Subiect', c.subiect)}${rand('Preheader', c.preheader)}`;
  if (s.tip === 'strategie') return rand('Într-o frază', c.pozitionare);
  // Clarity: verdictul (culoare) și concurenții cu sursă, înaintea textului (clientul vede întâi decizia)
  if (s.tip === 'clarity') { const V = { merge: ['Merge', '#1f6f5f'], merge_cu_conditii: ['Merge, cu condiții', '#b07a1a'], nu_merge: ['Nu merge', '#a33a2f'] }[c.verdict]; return `${V ? `<p class="meta"><span class="verd" style="background:${V[1]}">${esc(V[0])}</span>${c.verdict_text ? ` ${esc(c.verdict_text)}` : ''}</p>` : ''}${(Array.isArray(c.concurenti) ? c.concurenti : []).map((x, i) => `<div class="recl prio"><p class="rt">${i + 1}. ${esc(x.nume || '')}${x.pret ? ` · ${esc(x.pret)}` : ''}</p><p>${esc(x.punct_tare || '')}${x.slabiciune ? ` · ${esc(x.slabiciune)}` : ''}</p>${x.sursa && /^https:\/\//.test(String(x.sursa)) ? `<p class="meta"><a href="${esc(x.sursa)}" target="_blank" rel="noopener noreferrer">sursa ↗</a></p>` : ''}</div>`).join('')}`; }
  // audit: scorul și cele trei lucruri de reparat, înaintea textului (clientul vede întâi verdictul)
  if (s.tip === 'audit') return `${c.scor != null ? `<p class="scor"><b>${esc(String(c.scor))}</b><span>/10 · cât de bine vinde pagina ta azi</span></p>` : ''}${(Array.isArray(c.prioritati) ? c.prioritati : []).map((p, i) => `<div class="recl prio"><p class="rt">${i + 1}. ${esc(p.ce || '')}</p><p>${esc(p.de_ce || '')}</p>${p.efort ? `<p class="meta">Efort: ${esc(p.efort)}</p>` : ''}</div>`).join('')}`;
  // răspuns la recenzie: recenzia (pe scurt) și stelele, deasupra răspunsului; clientul vede la ce răspunde
  if (s.tip === 'reputatie') return `${c.stele != null ? `<p class="meta">${esc('★'.repeat(Math.max(0, Math.min(5, Number(c.stele) || 0))))}${esc('☆'.repeat(5 - Math.max(0, Math.min(5, Number(c.stele) || 0))))}${c.recenzie ? ` · „${esc(c.recenzie)}”` : ''}</p>` : (c.recenzie ? rand('Recenzia', c.recenzie) : '')}<p class="meta">Răspunsul de mai jos apare public, sub recenzie, după „da”-ul tău.</p>`;
  // site nou / refresh: paginile cu meta și îndemnul unic, înaintea textului complet (clientul vede întâi harta site-ului)
  if (s.tip === 'website' || s.tip === 'refresh') return `${c.site && typeof c.site === 'object' && TOKEN ? `<a class="lnk" href="/s/${esc(TOKEN)}/site/${esc(String(s.id))}" target="_blank" rel="noopener noreferrer">Vezi site-ul așezat pe șablonul tău →</a>` : ''}${c.indemn ? rand('Butonul site-ului', `${c.indemn.text || ''}${c.indemn.tinta ? ` → ${c.indemn.tinta}` : ''}`) : ''}${(Array.isArray(c.pagini) ? c.pagini : []).map((x) => `<div class="recl"><p class="rt">${esc(x.pagina || '')} <span class="meta">${esc(x.slug || '')}</span></p>${x.meta_titlu ? `<p class="meta">Google: ${esc(x.meta_titlu)}${x.meta_descriere ? ` — ${esc(x.meta_descriere)}` : ''}</p>` : ''}</div>`).join('')}${Array.isArray(c.lipsesc) && c.lipsesc.length ? rand('Ne mai trebuie de la tine', c.lipsesc.join(', ')) : ''}`;
  if (s.tip === 'video') return `${rand('Hook', c.hook)}${(Array.isArray(c.scene) ? c.scene : []).map((x, i) => `<div class="recl"><p class="meta">Scena ${esc(String(x.nr || i + 1))}${x.durata_sec ? ` · ${esc(String(x.durata_sec))} s` : ''}${x.text_pe_ecran ? ` · pe ecran: ${esc(x.text_pe_ecran)}` : ''}</p><p>${esc(x.ce_se_vede || '')}</p><p class="rt">„${esc(x.ce_se_spune || '')}”</p></div>`).join('')}${rand('Îndemnul', c.cta)}`;
  return '';
};

function continutHtml(s) {
  const c = s.continut || {};
  if (c.format === 'markdown') {
    return `${c.titlu ? `<p class="dt">${esc(c.titlu)}</p>` : ''}${structurat(s)}<div class="txt doc">${md(c.text)}</div>`;
  }
  const canale = (c.canale || (s.detalii && s.detalii.canale) || []).map((x) => CANAL[x] || x);
  const meta = [s.detalii && s.detalii.zi ? dataRo(s.detalii.zi) : null, canale.length ? canale.join(' · ') : null].filter(Boolean).join(' · ');
  const img = c.imagine_url ? `<img src="${esc(c.imagine_url)}" alt="" loading="lazy">` : c.imagine_nume ? `<div class="img-ph">poza ta: ${esc(c.imagine_nume)}</div>` : c.imagine ? `<div class="img-ph">imagine: ${esc(c.imagine)}</div>` : '';
  const text = c.text ? `<p class="txt">${nl(c.text)}</p>` : c.rezumat ? `<p class="txt">${nl(c.rezumat)}</p>` : '';
  const link = c.url && /^https?:\/\//i.test(String(c.url)) ? `<a class="lnk" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Deschide previzualizarea →</a>` : '';
  const buget = c.buget ? `<p class="meta">Buget propus: <b>${nr(c.buget)} RON / lună</b>, plătit direct platformelor</p>` : '';
  const note = c.nota ? `<p class="meta">${esc(c.nota)}</p>` : '';
  return `${meta ? `<p class="meta">${esc(meta)}</p>` : ''}${img}${text}${buget}${link}${note}`;
}

// „Site-ul meu” (Bot Website v5.1): faza pe limba clientului (glosarul porților), preview-ul încadrat, secțiunile cu „Comentează”, „Aprob site-ul” cu cod
const FAZA = {
  construim: ['Construim site-ul', 'Scriem textele din fișa firmei tale și le așezăm pe design. Te anunț pe email când e gata de văzut.'],
  materiale: ['Aștept materiale de la tine', 'O parte din site așteaptă ce lipsește în Materiale, mai jos.'],
  verificam: ['Verificăm site-ul', 'Îl trecem prin verificări pe telefon și pe desktop, înainte să ajungă la tine.'],
  ajustam: ['Lucrez la comentariile tale', 'Le iau pe rând. Versiunea nouă trece din nou prin verificări și apare aici.'],
  extra: ['Comentariile tale sunt la mine', 'Runda aceasta e peste cele incluse. Îți scriu în aceeași zi lucrătoare cu o propunere.'],
  aprobi: ['Aprobi site-ul', 'E exact versiunea care se publică. Îl deschizi pe telefon și pe desktop, comentezi pe secțiuni sau îl aprobi.'],
  aprobat: ['Aprobat. Urmează publicarea', 'Publicăm pe domeniul tău după ce se încheie plata. Te anunț când e live.'],
  publicam: ['Publicăm', 'Legăm domeniul și verificăm totul pe adresa finală.'],
  live: ['Site-ul e live', 'De aici încolo îl ținem la zi și îl verificăm zilnic (găzduire și grijă).'],
  predat: ['Site-ul e gata, la tine', 'Fișierele sunt mai jos. De aici, site-ul stă pe găzduirea ta; dacă vrei să-l mutăm la noi, cu Care, scrie-mi.'],
};
const PAGINA = { acasa: 'Acasă', servicii: 'Servicii', despre: 'Despre', contact: 'Contact' };
const SECTIUNE = { inceput: 'Începutul paginii', de_ce: 'De ce noi', servicii: 'Servicii', cum_decurge: 'Cum decurge', despre_scurt: 'Despre, pe scurt', intrebari: 'Întrebări', intro: 'Introducere', lista: 'Lista serviciilor', povestea: 'Povestea', cum_lucram: 'Cum lucrăm', cu_cine: 'Cu cine lucrăm', echipa: 'Echipa', recenzii: 'Recenzii', program: 'Program', harta: 'Harta' };
const eticheta = (k) => SECTIUNE[k] || (String(k).charAt(0).toUpperCase() + String(k).slice(1)).replace(/_/g, ' ');
// secțiunile din harta site-ului (continut.site): pagina.sectiune; paginile fără subsecțiuni rămân o singură secțiune; plus „tot site-ul”
export function sectiuniSite(site) {
  const out = [{ cheie: 'general', eticheta: 'Tot site-ul (culori, poze, ton)' }];
  if (!site || typeof site !== 'object') return out;
  for (const [p, v] of Object.entries(site)) {
    if (!v || typeof v !== 'object') continue;
    const sub = Object.entries(v).filter(([, x]) => x && typeof x === 'object');
    if (!sub.length) { out.push({ cheie: p, eticheta: PAGINA[p] || eticheta(p) }); continue; }
    for (const [k] of sub) out.push({ cheie: `${p}.${k}`, eticheta: `${PAGINA[p] || eticheta(p)} · ${eticheta(k)}` });
  }
  return out.slice(0, 40);
}
function siteMeuHtml(x) {
  const f = (x.faza === 'live' && x.gazduire === 'client_fisiere' ? FAZA.predat : FAZA[x.faza]) || FAZA.construim;
  const sect = sectiuniSite(x.site);
  const ciorne = Array.isArray(x.ciorne) ? x.ciorne : [];
  const peSect = (k) => ciorne.filter((c) => c.sectiune === k);
  const dupaRunde = x.runda > x.runde_incluse;
  const date = [x.start_la ? `start: ${dataRo(x.start_la)}` : '', x.termen && !['live', 'aprobat', 'publicam'].includes(x.faza) ? `termen: ${dataRo(x.termen)}` : '', x.faza === 'aprobi' ? `runda ${Math.min(x.runda, x.runde_incluse)} din ${x.runde_incluse}` : ''].filter(Boolean).join(' · ');
  const preview = x.url_preview ? `<div class="prev" id="prev-${x.id}">
      <div class="prev-bara"><span>Previzualizare</span><span class="prev-vp"><button type="button" class="on" data-vp="desktop" data-prev="${x.id}" aria-pressed="true">Desktop</button><button type="button" data-vp="telefon" data-prev="${x.id}" aria-pressed="false">Telefon</button></span><a class="lnk" href="${esc(x.url_preview)}" target="_blank" rel="noopener noreferrer">Deschide separat ↗</a></div>
      <div class="prev-cadru"><iframe src="${esc(x.url_preview)}" title="Previzualizarea site-ului ${esc(x.titlu || '')}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe></div>
    </div>` : '';
  const comentarii = x.faza === 'aprobi' ? `<div class="sect">
      <p class="dt">Comentarii pe secțiuni</p>
      <p class="meta">Scrii unde vrei ceva altfel. Rămân aici până apeși „Trimite comentariile”: atunci se închide runda și mă apuc de ele.${dupaRunde ? ' Runda aceasta e peste cele incluse în contract: îți scriu cu o propunere înainte să lucrez.' : ''}</p>
      ${sect.map((z) => `<div class="sect-r" data-sect="${esc(z.cheie)}"><div class="sect-t"><span>${esc(z.eticheta)}</span><button type="button" class="btn ghost mic" data-com="${x.id}" data-cheie="${esc(z.cheie)}">Comentează</button></div>
        <div class="sect-c">${peSect(z.cheie).map((c) => `<p class="ciorna">${nl(c.text)}</p>`).join('')}</div>
        <div class="mod" id="com-${x.id}-${esc(z.cheie).replace(/\./g, '-')}"><label class="vh" for="ta-${x.id}-${esc(z.cheie).replace(/\./g, '-')}">Comentariu pentru ${esc(z.eticheta)}</label><textarea id="ta-${x.id}-${esc(z.cheie).replace(/\./g, '-')}" rows="3" placeholder="Ce vrei altfel aici? Un rând e de ajuns."></textarea><div class="act"><button class="btn mic" type="button" data-salv="${x.id}" data-cheie="${esc(z.cheie)}">Salvează comentariul</button></div></div>
      </div>`).join('')}
      <div class="act"><button class="btn" type="button" data-trimite-com="${x.id}"${ciorne.length ? '' : ' disabled'}>Trimite comentariile (<span data-n="${x.id}">${ciorne.length}</span>)</button></div>
    </div>
    <div class="aprob">
      <p class="dt">Totul e cum trebuie?</p>
      <p class="meta">Aprobi exact versiunea din previzualizare. Îți trimit un cod de 6 cifre pe emailul din contract, ca să fiu sigur că aprobarea e a ta.${ciorne.length ? ` Ai ${ciorne.length === 1 ? 'un comentariu netrimis' : `${ciorne.length} comentarii netrimise`}: dacă aprobi, nu mai intră în lucru.` : ''}</p>
      <div class="act"><button class="btn ok" type="button" data-cod="${x.id}">Aprob site-ul</button></div>
      <div class="mod${x.cod_activ ? ' on' : ''}" id="cod-${x.id}"><p class="meta" id="cod-catre-${x.id}">${x.cod_activ ? 'Ți-am trimis codul pe email.' : ''}</p><label class="vh" for="cod-in-${x.id}">Codul primit pe email</label><input id="cod-in-${x.id}" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="Codul de 6 cifre"><div class="act"><button class="btn ok mic" type="button" data-aproba="${x.id}">Confirm aprobarea</button><button class="btn ghost mic" type="button" data-cod="${x.id}">Trimite alt cod</button></div></div>
    </div>` : '';
  const live = x.faza === 'live' && x.live ? `<p class="txt"><a class="lnk" href="https://${esc(String(x.live).replace(/^https?:\/\//, ''))}" target="_blank" rel="noopener">${esc(String(x.live).replace(/^https?:\/\//, ''))} ↗</a>${x.publicat_la ? ` <span class="meta">· live din ${dataRo(x.publicat_la)}</span>` : ''}</p><p class="meta">Vrei o schimbare? Scrie-mi mai jos, la Mesaje: o fac sau îți trimit o propunere.</p>${x.raport_30 ? `<p class="txt"><a class="lnk" href="/e/${esc(x.raport_30)}">Raportul de la 30 de zile →</a></p>` : ''}${x.verificari && x.verificari.n ? `<details class="verif"><summary class="lnk">La predare, site-ul a trecut de ${nrVerif(x.verificari.n)} verificări dure</summary><ul class="arii">${(x.verificari.arii || []).map((a) => `<li>${esc(a.arie)}: ${Number(a.n) || 0}</li>`).join('')}</ul><p class="meta">Le-a rulat scriptul nostru de QA${x.verificari.la ? ` pe ${dataRo(x.verificari.la)}` : ''}, pe mobil și pe desktop, în trei browsere.</p></details>` : ''}` : '';
  // găzduirea la client (SQL 76) sau exportul la plecare: arhiva site-ului, de descărcat (link semnat 60 s, doar cu tokenul spațiului)
  const fisiere = x.fisiere ? `<div class="sect"><p class="dt">Fișierele site-ului</p><p class="meta">${x.gazduire === 'client_fisiere' ? 'Site-ul e gata de pus pe găzduirea ta: arhiva conține toate paginile, pozele și fonturile. O dezarhivezi și o urci în rădăcina domeniului; dacă vrei, te ajut la mutare.' : 'Exportul complet al site-ului, cum scrie în contract: toate paginile, pozele și fonturile.'}</p><div class="act"><a class="btn" href="/api/site-fisiere?t=${encodeURIComponent(TOKEN)}&amp;s=${x.id}">Descarcă fișierele site-ului</a></div></div>` : '';
  return `<div class="card site-meu" data-site="${x.id}">
    <p class="meta">${esc(TIP[x.tip] || 'Site')}${date ? ` · ${esc(date)}` : ''}</p>
    <h3>${esc(f[0])}</h3>
    <p class="txt">${esc(f[1])}</p>
    ${x.faza === 'aprobat' && x.plata_ramasa ? '<p class="nota">Mai e ultima tranșă: îți trimit linkul de plată pe email. Publicăm după ce se încheie plata.</p>' : ''}
    ${preview}${comentarii}${live}${fisiere}
    <p class="gata" id="gata-site-${x.id}"></p>
  </div>`;
}

// tokenul spațiului curent (pentru linkurile din piese, ex. previzualizarea site-ului); se setează la fiecare randare
let TOKEN = '';
export function randeazaSpatiu(d, token, opt = {}) {
  TOKEN = token || '';
  const acc = d.accese || {};
  const metaMsg = opt.meta === 'conectat' ? ['ok', 'Gata: paginile tale sunt conectate. De acum, ce aprobi se publică singur, la ora stabilită.'] : opt.meta === 'deconectat' ? ['', 'Accesul a fost retras. Până reconectezi, piesele aprobate ți le trimit pe email ca să le publici tu.'] : opt.meta === 'anulat' ? ['', 'Nu s-a conectat nimic (ai închis fereastra Facebook). Poți relua oricând.'] : opt.meta === 'fara_pagini' ? ['', 'Contul Facebook cu care te-ai conectat nu administrează nicio pagină. Conectează-te cu contul care e administrator al paginii afacerii.'] : opt.meta === 'eroare' ? ['', `Nu a mers conectarea${opt.m ? ` (${opt.m})` : ''}. Încearcă din nou; dacă se repetă, scrie-mi mai jos.`] : null;
  const nume = prenume(d.contact) || '';
  const deAprobat = d.de_aprobat || [];
  const cal = d.calendar || [];
  const lipsa = (d.lipsesc || []).filter((k) => LIPSA[k]);
  const contracte = d.contracte || [];
  const facturi = Array.isArray(d.facturi) ? d.facturi : [];
  const incheiere = Array.isArray(d.incheiere) ? d.incheiere : [];
  const rapoarte = d.rapoarte || [];
  const mesaje = d.mesaje || [];
  const ob = d.onboarding;
  const siteMeu = Array.isArray(d.site_meu) ? d.site_meu : [];
  const luni = {};
  cal.forEach((s) => { const k = (s.zi || s.luna || '').slice(0, 7); (luni[k] = luni[k] || []).push(s); });

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>${esc(d.firma)} · spațiul tău la AleSign</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#f5f2ec; --text:#141414; --muted:#6b675f; --soft:#a39e94; --surface:#fbf9f5; --line:#e2ddd3; --accent:#ff2a2e; --ink:#0c0c0d; --ink-text:#f4f1ea; --ok:#1f7a4d; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:Manrope, system-ui, sans-serif; line-height:1.6; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  h1,h2,h3 { font-family:'Cormorant Garamond', Georgia, serif; font-weight:600; letter-spacing:-0.01em; line-height:1.1; }
  .wrap { width:min(760px, 100% - 32px); margin:0 auto; }
  header.top { position:sticky; top:0; z-index:20; background:color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
  header.top .wrap { display:flex; align-items:center; justify-content:space-between; height:60px; gap:12px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:14px; }
  .brand svg { width:22px; height:22px; }
  .nav { display:flex; gap:14px; font-size:12.5px; color:var(--muted); overflow:auto; }
  .nav a { white-space:nowrap; }
  .eyebrow { font-size:11px; letter-spacing:.22em; text-transform:uppercase; font-weight:700; color:var(--muted); display:flex; align-items:center; gap:10px; }
  .eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--accent); }
  section { padding:40px 0; } section + section { border-top:1px solid var(--line); }
  .h2 { font-size:clamp(26px, 4vw, 34px); margin:10px 0 8px; }
  .lead { color:var(--muted); font-size:15.5px; max-width:60ch; }
  .salut { padding:48px 0 36px; }
  .salut h1 { font-size:clamp(34px, 6vw, 52px); margin:14px 0 14px; }
  .cifre { display:flex; gap:28px; flex-wrap:wrap; margin-top:22px; }
  .cifre b { font-family:'Cormorant Garamond', serif; font-size:36px; font-weight:600; display:block; line-height:1; }
  .cifre span { font-size:12px; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:20px; margin-top:14px; }
  .card h3 { font-size:22px; margin-bottom:6px; }
  .meta { font-size:12.5px; color:var(--muted); margin:4px 0 8px; }
  .txt { font-size:15.5px; margin:8px 0 10px; white-space:normal; }
  .dt { font-size:17px; font-weight:600; margin:6px 0 2px; }
  .doc .mdh { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#6b675f; margin:16px 0 4px; }
  .doc .mdp { margin:0 0 8px; }
  .doc .mdl { margin:0 0 8px; padding-left:18px; }
  .doc .mdl li { margin:2px 0; }
  .meta .k { color:#a39e94; }
  .recl { padding:10px 12px; border:1px solid #e2ddd3; border-radius:10px; margin:8px 0; }
  .recl .rt { font-weight:600; margin:2px 0; }
  .recl p { margin:2px 0; }
  .scor { display:flex; align-items:baseline; gap:8px; margin:6px 0 10px; }
  .scor b { font-size:34px; line-height:1; font-weight:700; }
  .scor span { font-size:13px; color:var(--muted); }
  .prio { border-color:#d9d2c4; }
  .verd { display:inline-block; color:#fff; border-radius:999px; padding:3px 10px; font-weight:600; font-size:12px; margin-right:6px; }
  .card img { width:100%; max-height:420px; object-fit:cover; border-radius:12px; margin:8px 0; }
  .img-ph { font-size:12px; color:var(--soft); border:1px dashed var(--line); border-radius:12px; padding:14px; margin:8px 0; }
  .act { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
  .btn { display:inline-flex; align-items:center; gap:8px; padding:12px 18px; border-radius:999px; background:var(--ink); color:var(--ink-text); font-weight:600; font-size:14px; border:0; cursor:pointer; font-family:inherit; transition:transform .2s ease; }
  .btn:hover { transform:translateY(-1px); } .btn[disabled] { opacity:.5; cursor:not-allowed; }
  .btn.ok { background:var(--ok); } .btn.ghost { background:transparent; color:var(--text); border:1px solid var(--line); }
  .btn.mic { padding:9px 14px; font-size:13px; }
  .mod { display:none; margin-top:10px; } .mod.on { display:block; }
  details.verif summary { cursor:pointer; } details.verif ul.arii { margin:8px 0; padding-left:18px; }
  details.incheie summary { cursor:pointer; } details.incheie .opt { display:block; margin:8px 0; font-size:15px; } details.incheie textarea { width:100%; margin-top:8px; }
  textarea, input { font:inherit; font-size:15px; padding:12px 14px; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--text); outline:none; width:100%; }
  textarea:focus, input:focus { border-color:var(--text); }
  .gata { display:none; color:var(--ok); font-weight:600; font-size:14px; margin-top:10px; } .gata.on { display:block; }
  .lnk { font-weight:600; border-bottom:1px solid currentColor; }
  .toate { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-top:16px; padding:16px 18px; background:var(--ink); color:var(--ink-text); border-radius:16px; }
  .toate p { color:#cbc6bb; font-size:14px; }
  .toate .btn { background:var(--accent); }
  .luna { margin-top:18px; } .luna h3 { font-size:20px; margin-bottom:8px; text-transform:capitalize; }
  .zi { display:grid; grid-template-columns:64px 1fr auto; gap:12px; padding:10px 0; border-top:1px solid var(--line); font-size:14px; align-items:start; }
  .zi .d { font-weight:700; } .zi .s { font-size:12px; color:var(--muted); white-space:nowrap; }
  .zi .s.publicat, .zi .s.livrat { color:var(--ok); } .zi .s.la_client { color:var(--accent); }
  .zi .t { color:#2a2823; } .zi .t small { color:var(--soft); }
  .lipsa { display:grid; gap:10px; margin-top:14px; }
  .lipsa div { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
  .lipsa b { display:block; font-size:15px; } .lipsa span { font-size:13.5px; color:var(--muted); }
  .cont { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:14px 16px; margin-top:14px; }
  .cont b { display:block; font-size:15px; } .cont span { font-size:13.5px; color:var(--muted); }
  .nota { padding:10px 14px; border-radius:12px; background:var(--surface); border:1px solid var(--line); font-size:14.5px; margin-top:10px; } .nota.ok { border-color:var(--ok); color:var(--ok); }
  .rand { display:flex; justify-content:space-between; gap:12px; padding:12px 0; border-top:1px solid var(--line); font-size:14.5px; flex-wrap:wrap; }
  .rand .m { color:var(--muted); font-size:13px; }
  .msg { padding:10px 14px; border-radius:14px; margin-top:8px; font-size:14.5px; max-width:85%; }
  .msg.client { background:var(--ink); color:var(--ink-text); margin-left:auto; } .msg.alex { background:var(--surface); border:1px solid var(--line); }
  .msg small { display:block; font-size:11px; opacity:.7; margin-top:2px; }
  footer { border-top:1px solid var(--line); padding:28px 0 40px; font-size:12.5px; color:var(--muted); }
  footer .wrap { display:flex; justify-content:space-between; gap:14px; flex-wrap:wrap; }
  .gol { color:var(--muted); font-size:14.5px; margin-top:10px; }
  .vh { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  .prev { margin:14px 0; border:1px solid var(--line); border-radius:14px; overflow:hidden; background:#fff; }
  .prev-bara { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; padding:8px 12px; border-bottom:1px solid var(--line); font-size:13px; color:var(--muted); background:var(--surface); }
  .prev-vp { display:flex; gap:4px; } .prev-vp button { font:inherit; font-size:12.5px; padding:7px 12px; min-height:32px; border-radius:999px; border:1px solid var(--line); background:transparent; cursor:pointer; color:var(--text); }
  .prev-vp button.on { background:var(--ink); color:var(--ink-text); border-color:var(--ink); }
  .prev-cadru { display:flex; justify-content:center; background:#ece8df; }
  .prev iframe { width:100%; height:72vh; min-height:480px; border:0; background:#fff; transition:width .25s ease; }
  .prev.telefon iframe { width:390px; max-width:100%; }
  .sect { margin-top:16px; } .sect-r { border-top:1px solid var(--line); padding:10px 0; }
  .sect-t { display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:14.5px; }
  .ciorna { font-size:13.5px; background:#fff; border:1px dashed var(--line); border-radius:10px; padding:8px 10px; margin-top:8px; }
  .aprob { margin-top:18px; padding-top:14px; border-top:1px solid var(--line); }
  .site-meu input { max-width:220px; letter-spacing:.2em; }
  @media (max-width:640px) { .zi { grid-template-columns:52px 1fr; } .zi .s { grid-column:2; } section { padding:32px 0; } }
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="https://alesign.net" target="_blank" rel="noopener">${MARCA}<span>AleSign&amp;Co</span></a>
  <nav class="nav">${siteMeu.length ? '<a href="#site">Site-ul meu</a>' : ''}<a href="#aprobat">De aprobat</a><a href="#calendar">Calendar</a><a href="#materiale">Materiale</a><a href="#rapoarte">Rapoarte</a><a href="#contract">Contract</a><a href="#mesaje">Mesaje</a></nav>
</div></header>

<section class="salut"><div class="wrap">
  <p class="eyebrow">Spațiul tău</p>
  <h1>${esc(d.firma)}</h1>
  <p class="lead">${nume ? `Bună, ${esc(nume)}. ` : ''}Aici vezi tot ce pregătesc pentru tine, aprobi dintr-o apăsare și îmi spui ce vrei altfel. Nimic nu apare în numele tău fără „da”-ul tău.</p>
  <div class="cifre">
    <div><b>${deAprobat.length}</b><span>de aprobat</span></div>
    <div><b>${Number(d.in_lucru || 0)}</b><span>în lucru</span></div>
    <div><b>${Number(d.publicate_luna || 0)}</b><span>publicate luna asta</span></div>
  </div>
</div></section>

${siteMeu.length ? `<section id="site"><div class="wrap">
  <p class="eyebrow">Site-ul meu</p>
  <h2 class="h2">${siteMeu.some((x) => x.faza === 'aprobi') ? 'Site-ul tău e gata de văzut.' : 'Unde e site-ul tău acum.'}</h2>
  <p class="lead">Aici îl vezi, îl comentezi și îl aprobi, totul într-un loc. Nimic nu se publică fără „Aprob site-ul”.</p>
  ${siteMeu.map(siteMeuHtml).join('')}
</div></section>` : ''}

<section id="aprobat"><div class="wrap">
  <p class="eyebrow">De aprobat</p>
  <h2 class="h2">${deAprobat.length ? `${deAprobat.length === 1 ? 'O piesă te așteaptă.' : `${deAprobat.length} piese te așteaptă.`}` : 'Nimic de aprobat acum.'}</h2>
  <p class="lead">${deAprobat.length ? 'Fiecare a trecut deja prin verificarea mea. Aprobi, sau îmi scrii în două vorbe ce schimbăm.' : 'Când pregătesc ceva nou, primești un email cu linkul de aici.'}</p>
  ${deAprobat.length > 1 ? `<div class="toate"><p>Dacă ți se potrivesc toate, le aprobi deodată.</p><button class="btn" type="button" data-aprob-tot>Aprob toate cele ${deAprobat.length}</button></div>` : ''}
  ${deAprobat.map((s) => `<div class="card" data-sarcina="${s.id}">
    <p class="meta">${esc(TIP[s.tip] || s.tip)}${s.versiune > 1 ? ` · varianta ${s.versiune}` : ''}</p>
    <h3>${esc(s.titlu)}</h3>
    ${continutHtml(s)}
    <div class="act"><button class="btn ok" type="button" data-aprob="${s.id}">Aprob</button><button class="btn ghost" type="button" data-mod="${s.id}">Vreau o modificare</button></div>
    <div class="mod" id="mod-${s.id}"><textarea rows="3" placeholder="Ce schimbăm? Un rând e de ajuns: „mai scurt”, „fără prețuri”, „poza cu echipa”."></textarea><div class="act"><button class="btn mic" type="button" data-trimite-mod="${s.id}">Trimite</button></div></div>
    <p class="gata" id="gata-${s.id}"></p>
  </div>`).join('')}
</div></section>

<section id="calendar"><div class="wrap">
  <p class="eyebrow">Calendar</p>
  <h2 class="h2">Ce apare și când.</h2>
  <p class="lead">Postările, newsletterele și video-urile lunii, cu starea fiecăreia. Orele sunt orientative; publicarea se face în intervalul în care publicul tău e online.</p>
  ${Object.keys(luni).sort().map((k) => { const items = luni[k]; const t = new Date(k + '-01').toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }); return `<div class="luna"><h3>${esc(t)}</h3>${items.map((s) => `<div class="zi"><span class="d">${s.zi ? dataScurt(s.zi) : ''}</span><span class="t">${esc(TIP[s.tip] || s.tip)}${s.continut && s.continut.text ? `: <small>${esc(String(s.continut.text).slice(0, 90))}${String(s.continut.text).length > 90 ? '…' : ''}</small>` : ''}${s.canale && s.canale.length ? ` <small>· ${s.canale.map((x) => CANAL[x] || x).join(', ')}</small>` : ''}</span><span class="s ${esc(s.stare)}">${esc(STARE[s.stare] || s.stare)}${s.programat_la && s.stare === 'programat' ? ` · ${oraRo(s.programat_la)}` : ''}</span></div>`).join('')}</div>`; }).join('') || '<p class="gol">Calendarul se umple în primele zile de la pornire.</p>'}
</div></section>

<section id="materiale"><div class="wrap">
  <p class="eyebrow">Materiale</p>
  <h2 class="h2">${lipsa.length ? 'Mai am nevoie de câteva lucruri de la tine.' : 'Am tot ce îmi trebuie.'}</h2>
  <p class="lead">${lipsa.length ? 'Fiecare deblochează o parte din ce ai cumpărat. Le completezi în pagina de start, în câteva minute.' : 'Dacă se schimbă ceva (prețuri, program, poze noi), actualizezi tot din pagina de start.'}</p>
  ${lipsa.length ? `<div class="lipsa">${lipsa.map((k) => `<div><b>${esc(LIPSA[k][0])}</b><span>${esc(LIPSA[k][1])}</span></div>`).join('')}</div>` : ''}
  ${ob && ob.slug ? `<div class="act" style="margin-top:16px"><a class="btn" href="/o/${esc(ob.slug)}">${ob.completat_la ? 'Actualizează materialele' : 'Completează pagina de start'} →</a></div>` : ''}
</div></section>

<section id="rapoarte"><div class="wrap">
  <p class="eyebrow">Rapoarte</p>
  <h2 class="h2">Ce s-a întâmplat, lună de lună.</h2>
  ${rapoarte.length ? rapoarte.map((r) => `<div class="rand"><span>${esc(r.eticheta || r.luna)}</span><a class="lnk" href="/r/${esc(r.slug)}">Deschide raportul →</a></div>`).join('') : '<p class="gol">Primul raport vine la începutul lunii următoare, cu ce am livrat și ce s-a văzut.</p>'}
</div></section>

<section id="conturi"><div class="wrap">
  <p class="eyebrow">Conturile tale</p>
  <h2 class="h2">${acc.meta === 'conectat' ? 'Facebook și Instagram sunt conectate.' : 'Publicarea, fără să mai copiezi nimic.'}</h2>
  ${metaMsg ? `<p class="nota${metaMsg[0] ? ' ' + metaMsg[0] : ''}">${esc(metaMsg[1])}</p>` : ''}
  ${acc.meta === 'conectat'
    ? `<div class="cont"><div><b>${esc(acc.meta_pagina_nume || 'Pagina ta de Facebook')}</b><span>Facebook${acc.meta_ig_nume ? ` · Instagram @${esc(acc.meta_ig_nume)}` : ' · fără cont Instagram legat de pagină'}${acc.meta_conectat_la ? ` · conectat pe ${dataRo(acc.meta_conectat_la)}` : ''}</span></div>
      <form method="post" action="/api/meta-deconectare" onsubmit="return confirm('Retragi accesul? Piesele aprobate ți le voi trimite pe email, ca să le publici tu.')"><input type="hidden" name="token" value="${esc(TOKEN)}"><button class="btn ghost mic" type="submit">Retrage accesul</button></form></div>
      ${Array.isArray(acc.meta_pagini) && acc.meta_pagini.length > 1 ? `<p class="gol">Publicăm pe „${esc(acc.meta_pagina_nume || '')}”. Ai conectat ${acc.meta_pagini.length} pagini; dacă vrei alta, spune-mi mai jos.</p>` : ''}`
    : `<p class="lead">Conectezi o singură dată pagina de Facebook (și contul de Instagram legat de ea). Nu-mi dai nicio parolă: Facebook îți cere acordul, iar eu primesc doar dreptul de a publica ce ai aprobat tu aici. Poți retrage accesul oricând, de pe această pagină.</p>
      <div class="act"><a class="btn" href="/api/meta-connect?token=${esc(TOKEN)}">Conectează Facebook și Instagram →</a></div>
      <p class="gol" style="margin-top:10px">Până atunci, piesele aprobate ți le trimit pe email, gata de copiat.</p>`}
</div></section>

<section id="contract"><div class="wrap">
  <p class="eyebrow">Contract și facturi</p>
  <h2 class="h2">Actele, într-un loc.</h2>
  ${contracte.length ? contracte.map((c) => `<div class="rand"><span>Contract ${esc(c.numar)} · ${esc(c.pachet_nume)}<br><span class="m">${c.status === 'platit' ? `activ din ${dataRo(c.platit_la)}` : c.status === 'semnat' ? 'semnat, aștept plata' : 'de semnat'}${Number(c.total_lunar) > 0 ? ` · ${nr(c.total_lunar)} RON / lună` : ''}</span></span><span><a class="lnk" href="/c/${esc(c.slug)}">Deschide →</a> &nbsp; <a class="lnk" href="/api/contract-pdf?slug=${esc(c.slug)}">PDF</a></span></div>`).join('') : '<p class="gol">Niciun contract activ.</p>'}
${incheiere.map((k) => k.incheiere && k.incheiere.la ? `<p class="nota" style="margin-top:14px">Ai încheiat contractul ${esc(k.numar)}: se încheie pe ${dataRo(k.incheiere.efect_la)}. ${k.incheiere.alegere === 'care' ? 'Site-ul rămâne online pe Care, 190 RON pe lună, pe factură.' : 'Pregătesc exportul complet și te ajut cu mutarea.'}</p>` : `<details class="incheie" style="margin-top:16px"><summary class="lnk">Încheie colaborarea (contract ${esc(k.numar)})</summary>
  <p class="meta">Preaviz de 30 de zile${k.efect_daca_azi ? `: dacă închei azi, contractul se încheie pe ${dataRo(k.efect_daca_azi)}` : ''}. Până atunci, totul merge ca acum.</p>
  ${k.site ? `<label class="opt"><input type="radio" name="alegere-${k.id}" value="care" checked> Site-ul rămâne online pe Care, 190 RON pe lună (găzduire, monitorizare, faptele le schimbi tu)</label>` : ''}
  <label class="opt"><input type="radio" name="alegere-${k.id}" value="export"${k.site ? '' : ' checked'}> Vreau exportul complet și ajutor la mutare</label>
  <label class="vh" for="motiv-${k.id}">De ce pleci (opțional)</label><textarea id="motiv-${k.id}" rows="2" placeholder="De ce pleci (opțional, mă ajută)"></textarea>
  <div class="act"><button class="btn ghost mic" type="button" data-incheie-cod="${k.id}">Trimite-mi codul</button></div>
  <div class="mod${k.cod_activ ? ' on' : ''}" id="inc-${k.id}"><p class="meta" id="inc-catre-${k.id}">${k.cod_activ ? 'Ți-am trimis codul pe email.' : ''}</p><label class="vh" for="inc-in-${k.id}">Codul primit pe email</label><input id="inc-in-${k.id}" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="Codul de 6 cifre"><div class="act"><button class="btn mic" type="button" data-incheie="${k.id}">Confirm încheierea</button></div></div>
</details>`).join('')}
${facturi.length ? `<h3 class="h3" id="facturi" style="margin-top:22px">Facturi</h3>${facturi.map((f) => `<div class="rand"><span>${f.test ? 'Factură de test, fără valoare fiscală' : `${f.tip === 'storno' ? 'Stornare' : 'Factura'} ${esc(f.serie)} ${esc(f.numar)}`}${f.contract ? ` · contract ${esc(f.contract)}` : ''}<br><span class="m">${nr(Math.abs(Number(f.total)))} RON${f.emisa_la ? ` · ${dataRo(f.emisa_la)}` : ''}</span></span><span>${f.pdf && !f.test ? `<a class="lnk" href="/api/factura?t=${esc(TOKEN)}&amp;id=${Number(f.id)}">PDF</a>` : ''}</span></div>`).join('')}` : ''}
</div></section>

<section id="mesaje"><div class="wrap">
  <p class="eyebrow">Mesaje</p>
  <h2 class="h2">Scrie-mi direct de aici.</h2>
  <p class="lead">Ajunge la mine, pe cardul tău, nu într-un inbox pierdut. Îți răspund în aceeași zi lucrătoare.</p>
  <div id="lista-mesaje">${mesaje.map((m) => `<div class="msg ${esc(m.de_la)}">${nl(m.text)}<small>${m.de_la === 'client' ? 'tu' : 'Alexandru'} · ${dataScurt(m.la)} ${oraRo(m.la)}</small></div>`).join('')}</div>
  <form id="f-mesaj" style="margin-top:14px"><textarea name="text" rows="3" placeholder="Întrebare, idee, o poză pe care o vrei folosită…" required></textarea><div class="act"><button class="btn" type="submit">Trimite</button></div><p class="gata" id="gata-mesaj">Trimis. Îți răspund în curând.</p></form>
</div></section>

<footer><div class="wrap">
  <div>AleSign&amp;Co · <a class="lnk" href="mailto:info@alesign.net">info@alesign.net</a></div>
  <div>Pagina e doar a ta: nu o da mai departe. Dacă vrei un link nou, scrie-mi.</div>
</div></footer>

<script>
(function(){
  var T = ${JSON.stringify(token)};
  function post(url, body){ return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.assign({ token: T }, body)) }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok && j.ok, j: j }; }); }).catch(function(){ return { ok:false }; }); }
  function gata(id, text, ok){ var g = document.getElementById('gata-' + id); if (!g) return; g.textContent = text; g.style.color = ok ? '' : '#b3261e'; g.classList.add('on'); }
  function blocheaza(card){ card.querySelectorAll('button').forEach(function(b){ b.disabled = true; }); }
  document.querySelectorAll('[data-aprob]').forEach(function(b){ b.addEventListener('click', function(){
    var id = b.getAttribute('data-aprob'), card = b.closest('.card'); blocheaza(card);
    post('/api/spatiu-decizie', { id: Number(id), decizie: 'aprob' }).then(function(r){ if (r.ok) { gata(id, 'Aprobat. Mulțumesc!', true); card.style.opacity = .6; } else { card.querySelectorAll('button').forEach(function(x){ x.disabled = false; }); gata(id, 'Nu a mers. Încearcă din nou sau scrie-mi.', false); } });
  }); });
  document.querySelectorAll('[data-mod]').forEach(function(b){ b.addEventListener('click', function(){ var m = document.getElementById('mod-' + b.getAttribute('data-mod')); m.classList.toggle('on'); if (m.classList.contains('on')) m.querySelector('textarea').focus(); }); });
  document.querySelectorAll('[data-trimite-mod]').forEach(function(b){ b.addEventListener('click', function(){
    var id = b.getAttribute('data-trimite-mod'), card = b.closest('.card'), ta = document.getElementById('mod-' + id).querySelector('textarea'); var motiv = (ta.value || '').trim();
    if (motiv.length < 3) { ta.focus(); return; } blocheaza(card);
    post('/api/spatiu-decizie', { id: Number(id), decizie: 'modificare', motiv: motiv }).then(function(r){ if (r.ok) { gata(id, 'Am notat. Refac și îți trimit varianta nouă.', true); card.style.opacity = .6; } else { card.querySelectorAll('button').forEach(function(x){ x.disabled = false; }); gata(id, 'Nu a mers. Încearcă din nou sau scrie-mi.', false); } });
  }); });
  // Site-ul meu: previzualizarea pe desktop / telefon, comentarii pe secțiuni, „Aprob site-ul” cu cod
  function gataSite(id, text, ok){ var g = document.getElementById('gata-site-' + id); if (!g) return; g.textContent = text; g.style.color = ok ? '' : '#b3261e'; g.classList.add('on'); }
  document.querySelectorAll('[data-vp]').forEach(function(b){ b.addEventListener('click', function(){ var p = document.getElementById('prev-' + b.getAttribute('data-prev')); if (!p) return; p.classList.toggle('telefon', b.getAttribute('data-vp') === 'telefon'); p.querySelectorAll('[data-vp]').forEach(function(x){ var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }); });
  var idDom = function(id, cheie){ return id + '-' + String(cheie).replace(/\\./g, '-'); };
  document.querySelectorAll('[data-com]').forEach(function(b){ b.addEventListener('click', function(){ var m = document.getElementById('com-' + idDom(b.getAttribute('data-com'), b.getAttribute('data-cheie'))); if (!m) return; m.classList.toggle('on'); if (m.classList.contains('on')) m.querySelector('textarea').focus(); }); });
  document.querySelectorAll('[data-salv]').forEach(function(b){ b.addEventListener('click', function(){
    var id = b.getAttribute('data-salv'), cheie = b.getAttribute('data-cheie'), m = document.getElementById('com-' + idDom(id, cheie)), ta = m.querySelector('textarea'), text = (ta.value || '').trim();
    if (text.length < 2) { ta.focus(); return; } b.disabled = true;
    post('/api/spatiu-comentariu', { sarcina_id: Number(id), actiune: 'comentariu', sectiune: cheie, text: text }).then(function(r){ b.disabled = false;
      if (!r.ok) { gataSite(id, (r.j && r.j.motiv) || 'Nu a mers. Încearcă din nou.', false); return; }
      var p = document.createElement('p'); p.className = 'ciorna'; p.textContent = text; m.parentNode.querySelector('.sect-c').appendChild(p); ta.value = ''; m.classList.remove('on');
      var n = document.querySelector('[data-n="' + id + '"]'); if (n) { n.textContent = String(Number(n.textContent || 0) + 1); n.closest('button').disabled = false; } });
  }); });
  document.querySelectorAll('[data-trimite-com]').forEach(function(b){ b.addEventListener('click', function(){ var id = b.getAttribute('data-trimite-com'); b.disabled = true;
    post('/api/spatiu-comentariu', { sarcina_id: Number(id), actiune: 'trimite' }).then(function(r){ if (r.ok) { var c = b.closest('.card'); c.querySelectorAll('button').forEach(function(x){ x.disabled = true; }); gataSite(id, r.j.extra ? 'Am primit comentariile. Runda e peste cele incluse: îți scriu azi cu o propunere.' : 'Am primit comentariile. Mă apuc de ele și îți arăt versiunea nouă aici.', true); } else { b.disabled = false; gataSite(id, (r.j && r.j.motiv) || 'Nu a mers. Încearcă din nou.', false); } });
  }); });
  document.querySelectorAll('[data-cod]').forEach(function(b){ b.addEventListener('click', function(){ var id = b.getAttribute('data-cod'); b.disabled = true;
    post('/api/spatiu-aproba', { sarcina_id: Number(id), actiune: 'cod' }).then(function(r){ b.disabled = false; var m = document.getElementById('cod-' + id); m.classList.add('on');
      document.getElementById('cod-catre-' + id).textContent = r.ok ? 'Ți-am trimis un cod de 6 cifre pe ' + (r.j.catre || 'emailul din contract') + '. E valabil 15 minute.' : ((r.j && r.j.motiv) || 'Nu am putut trimite codul. Încearcă din nou.');
      if (r.ok) document.getElementById('cod-in-' + id).focus(); });
  }); });
  document.querySelectorAll('[data-aproba]').forEach(function(b){ b.addEventListener('click', function(){ var id = b.getAttribute('data-aproba'), inp = document.getElementById('cod-in-' + id), cod = (inp.value || '').replace(/\\D/g, '');
    if (cod.length !== 6) { inp.focus(); return; } b.disabled = true;
    post('/api/spatiu-aproba', { sarcina_id: Number(id), actiune: 'aproba', cod: cod }).then(function(r){ if (r.ok) { var c = b.closest('.card'); c.querySelectorAll('button, input').forEach(function(x){ x.disabled = true; }); gataSite(id, 'Site-ul e aprobat. Mulțumesc! Te anunț când e live pe domeniul tău.', true); } else { b.disabled = false; gataSite(id, (r.j && r.j.motiv) || 'Nu a mers. Încearcă din nou.', false); } });
  }); });
  document.querySelectorAll('[data-incheie-cod]').forEach(function(b){ b.addEventListener('click', function(){ var id = b.getAttribute('data-incheie-cod'); b.disabled = true;
    post('/api/spatiu-incheie', { contract_id: Number(id), actiune: 'cod' }).then(function(r){ b.disabled = false; var m = document.getElementById('inc-' + id); m.classList.add('on');
      document.getElementById('inc-catre-' + id).textContent = r.ok ? 'Ți-am trimis un cod de 6 cifre pe ' + (r.j.catre || 'emailul din contract') + '. E valabil 15 minute.' : ((r.j && r.j.motiv) || 'Nu am putut trimite codul.');
      if (r.ok) document.getElementById('inc-in-' + id).focus(); });
  }); });
  document.querySelectorAll('[data-incheie]').forEach(function(b){ b.addEventListener('click', function(){ var id = b.getAttribute('data-incheie'), inp = document.getElementById('inc-in-' + id), cod = (inp.value || '').replace(/\\D/g, '');
    var al = document.querySelector('input[name="alegere-' + id + '"]:checked'); if (cod.length !== 6 || !al) { inp.focus(); return; } b.disabled = true;
    post('/api/spatiu-incheie', { contract_id: Number(id), actiune: 'confirma', cod: cod, alegere: al.value, motiv: (document.getElementById('motiv-' + id).value || '').trim() }).then(function(r){
      var p = document.getElementById('inc-catre-' + id); if (r.ok) { b.closest('details').querySelectorAll('button, input, textarea').forEach(function(x){ x.disabled = true; }); p.textContent = 'Am primit. Contractul se încheie pe ' + new Date(r.j.efect_la + 'T12:00:00Z').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) + '. Îți scriu azi cu pașii.'; } else { b.disabled = false; p.textContent = (r.j && r.j.motiv) || 'Nu a mers. Încearcă din nou.'; } });
  }); });
  var tot = document.querySelector('[data-aprob-tot]');
  if (tot) tot.addEventListener('click', function(){ tot.disabled = true; post('/api/spatiu-decizie', { id: null, decizie: 'aprob' }).then(function(r){ if (r.ok) { document.querySelectorAll('.card[data-sarcina]').forEach(function(c){ blocheaza(c); c.style.opacity = .6; }); tot.textContent = 'Aprobate. Mulțumesc!'; } else { tot.disabled = false; tot.textContent = 'Nu a mers. Încearcă din nou sau scrie-mi mai jos.'; } }); });
  var f = document.getElementById('f-mesaj');
  f.addEventListener('submit', function(ev){ ev.preventDefault(); var ta = f.querySelector('textarea'); var text = (ta.value || '').trim(); if (text.length < 2) return; var btn = f.querySelector('button'); btn.disabled = true;
    post('/api/spatiu-mesaj', { text: text }).then(function(r){ btn.disabled = false; if (r.ok) { var el = document.createElement('div'); el.className = 'msg client'; el.textContent = text; var s = document.createElement('small'); s.textContent = 'tu · acum'; el.appendChild(s); document.getElementById('lista-mesaje').appendChild(el); ta.value = ''; var g = document.getElementById('gata-mesaj'); g.textContent = g.getAttribute('data-ok') || g.textContent; g.style.color = ''; g.classList.add('on'); } else { var g2 = document.getElementById('gata-mesaj'); if (!g2.getAttribute('data-ok')) g2.setAttribute('data-ok', g2.textContent); g2.textContent = (r.j && r.j.motiv === 'prea multe mesaje') ? 'Ai trimis multe mesaje într-o oră. Mai încearcă puțin mai târziu sau scrie-mi pe email.' : 'Nu a mers. Încearcă din nou sau scrie-mi pe email.'; g2.style.color = '#b3261e'; g2.classList.add('on'); } }); });
})();
</script>
</body>
</html>`;
}

export function spatiuInchis() {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Linkul nu mai e valabil</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#141414;font-family:Manrope,system-ui,sans-serif;text-align:center;padding:24px}h1{font-family:'Cormorant Garamond',serif;font-size:40px;margin:0 0 12px}p{color:#6b675f;max-width:44ch;margin:0 auto 22px}a{display:inline-block;padding:14px 24px;border-radius:999px;background:#0c0c0d;color:#f4f1ea;text-decoration:none;font-weight:600}</style></head>
<body><div><h1>Linkul acesta nu mai e valabil.</h1><p>Poate a fost regenerat sau colaborarea s-a încheiat. Scrie-mi și îți trimit unul nou în aceeași zi.</p><a href="mailto:info@alesign.net?subject=Spatiul%20meu">Scrie-mi</a></div></body></html>`;
}
