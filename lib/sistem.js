// Lista SISTEM (SQL 105): normalizarea răspunsului Tally și pagina linkului personal (/sistem/<token>).
// Datele vizitatorului merg doar în bază (RPC sistem_inscriere, cu cheia de serviciu); pagina e privată (no-store, noindex), tokenul e cheia.
import crypto from 'crypto';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nr = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString('ro-RO'));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// eticheta câmpului din Tally → cheia noastră (etichetele pot fi scrise cum vrea Alex în formular)
const CHEI = [
  ['nume_prenume', /^(nume_prenume|nume|name|full_name|nume_si_prenume|numele_tau)$/],
  ['email', /^(email|e_mail|adresa_de_email|emailul_tau)$/],
  ['telefon', /^(telefon|phone|numar_de_telefon|telefonul_tau|whatsapp)$/],
  ['firma', /^(firma|companie|company|afacerea|business|numele_firmei|firma_ta)$/],
  ['domeniu', /^(domeniu|domeniul|nisa|industrie|domeniul_tau|in_ce_domeniu)/],
  ['oras', /^(oras|orasul|city|localitate|orasul_tau)$/],
  ['link_online', /^(link_online|link|website|site|instagram_sau_site|link_ul)/],
  ['problema', /^(problema|problema_ta|mesaj|ce_te_doare|cu_ce_te_ajutam|descriere)/],
  ['recomandat_de', /^(recomandat_de|recomandare|cod_de_recomandare|cine_te_a_recomandat|referral)/],
  ['consimtamant_gdpr', /^(consimtamant_gdpr|gdpr|consimtamant|acord|sunt_de_acord|accept)/],
  ['sursa', /^(sursa|source|utm_source)$/],
  ['instagram', /^(instagram|ig|handle|instagram_handle|utilizator_instagram)$/],
];
const SURSE = ['ig_comentariu', 'ig_dm', 'fb', 'tiktok_bio', 'linkedin_bio', 'site', 'recomandare', 'test'];

function valoare(f) {
  let v = f && f.value;
  if (Array.isArray(v)) {
    const opt = Array.isArray(f.options) ? f.options : [];
    v = v.map((x) => { const o = opt.find((y) => y && (y.id === x || y.value === x)); return o ? (o.text ?? o.label ?? o.value ?? x) : x; }).filter((x) => x != null && x !== '').join(', ');
  } else if (v && typeof v === 'object') {
    v = v.text ?? v.label ?? v.url ?? v.value ?? JSON.stringify(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return v == null ? '' : String(v);
}

// răspunsul Tally (eventType FORM_RESPONSE, data.fields[]) → {nume_prenume, email, …}; acceptă și un obiect plat (test, n8n)
export function dinTally(body) {
  const out = {};
  const d = body && body.data && typeof body.data === 'object' ? body.data : null;
  const campuri = d && Array.isArray(d.fields) ? d.fields : null;
  if (campuri) {
    for (const f of campuri) {
      const l = norm(f.label || f.key || '');
      const k = (CHEI.find(([, re]) => re.test(l)) || [])[0];
      if (!k) continue;
      const v = valoare(f).trim();
      if (k === 'consimtamant_gdpr') { out[k] = (v !== '' && /^(true|da|yes|1|on|accept|sunt de acord)/i.test(v)) || (Array.isArray(f.value) && f.value.length > 0) ? 'true' : 'false'; continue; }
      if (v !== '' && (out[k] == null || out[k] === '')) out[k] = v;
    }
    out.tally_id = String(d.responseId || d.submissionId || body.eventId || '').slice(0, 80);
  } else if (body && typeof body === 'object') {
    for (const [k] of CHEI) if (body[k] != null) out[k] = typeof body[k] === 'boolean' ? (body[k] ? 'true' : 'false') : String(body[k]);
    if (body.tally_id) out.tally_id = String(body.tally_id).slice(0, 80);
  }
  if (out.sursa) { const s = norm(out.sursa); out.sursa = SURSE.includes(s) ? s : s.slice(0, 40) || 'tally'; } else out.sursa = 'tally';
  if (out.instagram) out.instagram = out.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '').slice(0, 80);
  if (out.email) out.email = out.email.toLowerCase().trim();
  return out;
}

// semnătura Tally (HMAC SHA-256 pe corpul brut, base64) sau cheia din URL (?k=…): oricare din ele, dacă e configurată
export function cheieValida({ raw, semnatura, k, secretTally, cheie }) {
  if (secretTally && semnatura) {
    const h = crypto.createHmac('sha256', secretTally).update(raw).digest('base64');
    try { if (h.length === semnatura.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(semnatura))) return true; } catch { /* lungimi diferite */ }
  }
  if (cheie && k && k.length === cheie.length) { try { return crypto.timingSafeEqual(Buffer.from(k), Buffer.from(cheie)); } catch { return false; } }
  return false;
}

const STIL = `<style>
:root{--bg:#0D0F14;--s:#151821;--s2:#1B1F2A;--b:#272C38;--g:#C9A227;--t:#F2F1ED;--d:#9BA1B0;--f:#5B6070;--v:#7FBF6B;--r:#E8734A}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font-family:-apple-system,'Segoe UI',Inter,Arial,sans-serif;line-height:1.5}
.wrap{max-width:860px;margin:0 auto;padding:32px 16px 64px}h1{font-size:28px;margin:0 0 6px}h2{font-size:18px;margin:28px 0 10px}p{margin:6px 0}.d{color:var(--d)}.f{color:var(--f);font-size:12px}
.card{background:var(--s);border:1px solid var(--b);border-radius:14px;padding:18px;margin:12px 0}.gold{color:var(--g)}.verde{color:var(--v)}.rosu{color:var(--r)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.p{background:var(--s2);border:1px solid var(--b);border-radius:12px;padding:14px}.p b{font-size:18px}.p s{color:var(--f)}
.btn{display:inline-block;background:var(--g);color:#0D0F14;font-weight:600;padding:12px 18px;border-radius:10px;text-decoration:none;border:0;cursor:pointer;font-size:15px}.btn2{background:transparent;color:var(--g);border:1px solid var(--g)}
label{display:block;margin:8px 0 4px;color:var(--d);font-size:13px}select,textarea,input{width:100%;background:var(--s2);color:var(--t);border:1px solid var(--b);border-radius:8px;padding:10px;font-size:14px}
ul{padding-left:18px;margin:6px 0}li{margin:2px 0}.tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--g);color:var(--g);margin-left:6px}
</style>`;

const NUME = { prezenta: 'Presence', crestere: 'Growth', dominare: 'Scale', complete: 'Complete', lansare: 'Launch', relansare: 'Relaunch', an_crestere: 'Growth Year' };

export function paginaInchisa() {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link necunoscut</title>${STIL}</head><body><div class="wrap"><h1>Linkul ăsta nu mai e activ</h1><p class="d">Scrie-ne și îți trimitem unul nou.</p></div></body></html>`;
}

// pagina linkului personal: ce ofertă are, prețurile lui, rezervarea de Fondator sau alegerea unui pachet
export function randeazaSistem(d, { token = '', mesaj = '' } = {}) {
  const fond = d.oferta_cod === 'FONDATOR_BF' && !d.fondator_ratat;
  const preturi = d.fondator_ratat ? (d.preturi_lista_sistem || {}) : (d.preturi || {});
  const lunare = (d.pachete || []).filter((p) => p.categorie === 'lunar'); const anuale = (d.pachete || []).filter((p) => p.categorie === 'combo');
  const cu = (p) => { const r = preturi[p.cod]; return r != null && Number(r) < Number(p.pret) ? `<b>${nr(r)} lei</b> <s>${nr(p.pret)}</s>` : `<b>${nr(p.pret)} lei</b>`; };
  const oferta = fond ? 'Pachetul Fondator' : d.oferta_cod === 'ADUS' ? `Adus de ${esc(d.recomandat_de || 'un client')}` : 'Lista SISTEM';
  const cf = d.contract_fundatie;
  const fondBloc = fond ? `
<div class="card"><h2 style="margin-top:0">Fundația <span class="tag">500 lei, o dată</span></h2>
<p class="d">${esc((d.fundatie && d.fundatie.descriere) || '')}</p>
<ul>${((d.fundatie && d.fundatie.include) || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
${cf ? `<p>${cf.status === 'platit' ? '<span class="verde">Locul tău e rezervat și plătit.</span>' : `Contractul tău e pregătit (${esc(cf.numar)}): <a class="btn" href="/c/${esc(cf.slug)}">Semnează și plătește</a>`}</p>`
     : d.fondator && d.fondator.deschisa ? `<p class="f">${esc(d.fondator.platiti)} din ${esc(d.fondator.max_clienti)} locuri plătite. Primii 3 care plătesc.</p><form method="post" action="/api/sistem-actiune"><input type="hidden" name="token" value="${esc(token)}"><input type="hidden" name="actiune" value="rezerva"><button class="btn" type="submit">Rezervă locul de Fondator</button></form>`
     : `<p class="rosu">${esc((d.fondator && d.fondator.motiv) || 'Oferta nu e deschisă încă')}</p>`}
<p class="f">După Fundație, abonamentul la preț de fondator 12 luni (mai jos). Dacă aduci un client, −50 %.</p></div>` : '';
  const ratat = d.fondator_ratat ? `<div class="card"><h2 style="margin-top:0" class="rosu">Locurile de Fondator s-au ocupat</h2><p class="d">Cele 3 locuri au fost plătite. Rămâi pe lista SISTEM: −10 % la lunare, −15 % la anuale, pentru comenzile de până pe 31 decembrie 2026.</p></div>` : '';
  const cap = d.capacitate && d.capacitate.liber === false ? `<div class="card"><p class="gold">${esc(d.capacitate.mesaj || 'Locurile lunii s-au ocupat. Te punem pe lista de așteptare.')}</p></div>` : '';
  const pachete = `
<h2>${fond ? 'Abonamentul tău de fondator, după Fundație' : 'Prețurile tale'}</h2>
<div class="grid">${lunare.map((p) => `<div class="p"><p class="d">${esc(NUME[p.cod] || p.nume)}${p.eticheta ? `<span class="tag">${esc(p.eticheta)}</span>` : ''}</p><p>${cu(p)} <span class="f">/ lună</span></p><p class="f">${esc(p.subtitlu || '')}</p></div>`).join('')}</div>
<p class="f" style="margin-top:10px">Anuale: ${anuale.map((p) => `${esc(NUME[p.cod] || p.nume)} ${cu(p)}`).join(' · ')}. ${esc(d.tva_text || '')}</p>
<div class="card"><form method="post" action="/api/sistem-actiune"><input type="hidden" name="token" value="${esc(token)}"><input type="hidden" name="actiune" value="cerere">
<label>Alege pachetul</label><select name="cod">${[...lunare, ...anuale].map((p) => `<option value="${esc(p.cod)}">${esc(NUME[p.cod] || p.nume)} · ${nr(preturi[p.cod] != null ? preturi[p.cod] : p.pret)} lei${p.categorie === 'combo' ? ' / an' : ' / lună'}</option>`).join('')}</select>
<label><input type="checkbox" name="anual" value="1" style="width:auto"> plătit anual (−15 %)</label>
<label>Un mesaj pentru Alexandru (opțional)</label><textarea name="mesaj" rows="3" maxlength="2000"></textarea>
<p><button class="btn btn2" type="submit">Vreau oferta asta</button></p><p class="f">Primești contractul pe email, cu prețul de mai sus. Nimic nu se plătește acum.</p></form></div>`;
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Oferta ta · AleSystem</title>${STIL}</head><body><div class="wrap">
<p class="f">AleSystem Design · lista SISTEM</p>
<h1>Salut, ${esc(d.nume || d.firma || '')}.</h1>
<p class="d">${d.lansata ? 'AleSystem rulează. Asta e oferta ta, pe linkul tău personal.' : `Oferta se deschide pe ${esc(d.lansare_la ? new Date(d.lansare_la).toLocaleString('ro-RO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }) : '27 noiembrie, 20:00')}. Până atunci vezi ce te așteaptă.`} <span class="tag">${esc(oferta)}</span></p>
${mesaj ? `<div class="card"><p class="verde">${esc(mesaj)}</p></div>` : ''}
${ratat}${cap}${fondBloc}${pachete}
<p class="f" style="margin-top:24px">Linkul tău de recomandare (cine vine prin el îți aduce bonusul de recomandare): <a href="${esc(d.link_recomandare || '#')}" style="color:var(--g)">${esc(d.link_recomandare || '')}</a></p>
<p class="f">Tu decizi direcția. Restul rulează singur.</p></div></body></html>`;
}

export function paginaMultumesc(titlu, text, inapoi) {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(titlu)}</title>${STIL}</head><body><div class="wrap"><h1>${esc(titlu)}</h1><p class="d">${esc(text)}</p>${inapoi ? `<p><a class="btn btn2" href="${esc(inapoi)}">Înapoi la oferta ta</a></p>` : ''}</div></body></html>`;
}
