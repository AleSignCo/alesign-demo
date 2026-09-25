// Pagina clientului (pasul 9): demo.alesign.net/c/<slug> → contract · date firmă · semnătură · plată · bun venit.
// Aceeași limbă vizuală ca Mostra. Trei stări: trimis (de semnat) · semnat (de plătit) · platit (bun venit).
import { clauze, anexa, antet, pret } from './contract-text.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }) : '');
const oraRo = (d) => (d ? new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }) : '');
const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { maximumFractionDigits: 2 });
const prenume = (s) => String(s || '').trim().split(/\s+/)[0] || '';

const MARCA = `<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="28" cy="28" r="20"/><circle cx="28" cy="28" r="5" fill="currentColor" stroke="none"/><circle cx="42.1" cy="13.9" r="6" fill="#ff2a2e" stroke="none"/></svg>`;

export function randeazaContract(d, { preview = false } = {}) {
  const C = d.client || {};
  const P = d.prestator || {};
  const pr = pret(d);
  const abon = d.tip === 'abonament';
  const stare = d.status === 'platit' ? 'platit' : d.status === 'semnat' ? 'semnat' : 'trimis';
  const cine = prenume(C.reprezentant);
  const A = antet(d);
  const cl = clauze(d);
  const an = anexa(d);
  const moduri = Array.isArray(d.plata_moduri) ? d.plata_moduri : ['card', 'transfer'];
  const cardOk = moduri.includes('card') && String(d.stripe_activ) === 'true';
  const transferOk = moduri.includes('transfer');
  const min = Number(d.perioada_minima_luni || 0);
  const expira = d.expira_la ? new Date(d.expira_la) : null;

  const durata = abon ? (min > 0 ? `minim ${min} luni, apoi lunar` : 'lunar, fără perioadă minimă') : 'o singură dată';
  const rezumat = `<div class="rezumat rv" style="--d:.2s">
    <div><p class="eyebrow">Contract ${esc(A.numar)}</p><h3>${esc(d.pachet_nume)}</h3><p class="desc">${esc(d.descriere || (Array.isArray(d.include) ? d.include.slice(0, 3).join(' · ') : ''))}</p></div>
    <dl><div><dt>Preț</dt><dd><b>${nr(pr.baza)}</b> <span>RON${pr.platitor ? ` + TVA ${pr.tva}%` : ''} / ${abon ? 'lună' : 'o dată'}</span></dd></div><div><dt>Durată</dt><dd>${esc(durata)}</dd></div><div><dt>Plată</dt><dd>${[cardOk ? 'card' : null, transferOk ? 'transfer bancar' : null].filter(Boolean).join(' sau ') || 'transfer bancar'}</dd></div></dl>
  </div>`;

  const doc = `<div class="doc rv" id="doc" style="--d:.1s">
    <div class="doc-in">
      <div class="doc-antet"><div>${MARCA}<span>AleSign&amp;Co</span></div><div class="nr">${esc(A.titlu)} · nr. ${esc(A.numar)} · ${esc(A.data)}</div></div>
      <h2 class="serif">${esc(A.titlu)}</h2>
      ${cl.map((c) => `<h3>${esc(c.titlu)}</h3>${c.p.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('')}
      <h3>${esc(an.titlu)}</h3>
      <p><b>Ce include:</b></p><ul>${an.include.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p><b>Termene:</b></p><ul>${an.termene.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="mic">${esc(an.nota)}</p>
      ${stare !== 'trimis' ? `<div class="semnaturi"><div><span class="et">Prestator</span><b>${esc(P.denumire || 'AleSign&Co SRL')}</b><span>${esc(P.reprezentant || 'Alexandru Paval')}</span></div><div><span class="et">Client</span><b>${esc(C.denumire || '')}</b><span>${esc(d.semnatura_nume || C.reprezentant || '')}${d.semnat_la ? ` · semnat ${d.semnatura_mod === 'clasic' ? 'pe hârtie' : 'electronic'} pe ${esc(dataRo(d.semnat_la))}, ${esc(oraRo(d.semnat_la))}` : ''}</span></div></div>` : ''}
    </div>
    <div class="doc-fade" id="doc-fade"><button type="button" class="btn ghost" id="doc-mai"><span>Citește tot contractul</span><span class="ar">↓</span></button></div>
  </div>`;

  let pasi = '';
  if (stare === 'trimis') {
    pasi = `<section class="pasi-s" id="semnare"><div class="wrap">
      <p class="eyebrow rv">Pasul 1 din 2</p>
      <h2 class="h2 rv" style="--d:.08s">Datele firmei tale.</h2>
      <p class="lead rv" style="--d:.14s">Intră în contract și pe factură. Le completezi o singură dată.</p>
      <form id="f-semn" class="rv" style="--d:.2s" data-slug="${esc(d.slug || '')}"${preview ? ' data-preview="1"' : ''}>
        <div class="row">
          <div class="f"><label for="denumire">Denumirea firmei</label><input id="denumire" name="denumire" required value="${esc(C.denumire || '')}" placeholder="SC Exemplu SRL"></div>
          <div class="f"><label for="cui">CUI / CIF</label><input id="cui" name="cui" required value="${esc(C.cui || '')}" placeholder="RO12345678"></div>
        </div>
        <div class="row">
          <div class="f"><label for="regcom">Nr. Registrul Comerțului <small>(opțional)</small></label><input id="regcom" name="regcom" value="${esc(C.regcom || '')}" placeholder="J40/1234/2020"></div>
          <div class="f"><label for="reprezentant">Reprezentant legal</label><input id="reprezentant" name="reprezentant" required value="${esc(C.reprezentant || '')}" placeholder="Nume și prenume"></div>
        </div>
        <div class="f"><label for="adresa">Adresa sediului</label><input id="adresa" name="adresa" required value="${esc(C.adresa || '')}" placeholder="Strada, număr, oraș, județ"></div>
        <div class="row">
          <div class="f"><label for="email">Email pentru contract și facturi</label><input id="email" name="email" type="email" required value="${esc(C.email || '')}" placeholder="nume@firma.ro"></div>
          <div class="f"><label for="telefon">Telefon</label><input id="telefon" name="telefon" value="${esc(C.telefon || '')}" placeholder="07xx xxx xxx"></div>
        </div>

        <div class="sep"><p class="eyebrow">Pasul 2 din 2</p><h2 class="h2">Semnătura.</h2><p class="lead">Scrie-ți numele așa cum apare în actul de identitate. Contractul semnat îți vine pe email imediat.</p></div>
        <div class="f"><label for="nume">Numele tău, ca semnătură</label><input id="nume" name="nume" required class="semn-input" placeholder="Prenume Nume" autocomplete="name"></div>
        <div class="f"><label>Cum plătești prima ${abon ? 'lună' : 'tranșă'}</label><div class="seg">${cardOk ? `<input type="radio" name="plata_mod" id="pm1" value="card" checked><label for="pm1">Card (Stripe)</label>` : ''}<input type="radio" name="plata_mod" id="pm2" value="transfer"${cardOk ? '' : ' checked'}><label for="pm2">Transfer bancar</label></div></div>
        <label class="acord"><input type="checkbox" name="acord" required><span>Am citit contractul și Anexa 1 și sunt de acord cu ele. Înțeleg că apăsarea butonului „Semnez” are valoarea semnăturii mele, în numele firmei de mai sus.</span></label>
        <button class="btn" type="submit"><span>Semnez contractul</span><span class="ar">→</span></button>
        <p class="eroare" id="eroare">Nu a mers. Verifică datele sau scrie-mi la info@alesign.net.</p>
        <p class="alt">Preferi pe hârtie? <a class="lnk" href="/api/contract-pdf?slug=${esc(d.slug || '')}" target="_blank" rel="noopener">Descarcă PDF-ul</a>, semnează-l și trimite-l la <a class="lnk" href="mailto:info@alesign.net">info@alesign.net</a>. Confirm eu în aceeași zi.</p>
      </form>
    </div></section>`;
  } else if (stare === 'semnat') {
    const modAles = d.plata_mod;
    pasi = `<section class="pasi-s" id="plata"><div class="wrap">
      <p class="eyebrow rv">Semnat pe ${esc(dataRo(d.semnat_la))}</p>
      <h2 class="h2 rv" style="--d:.08s">Mulțumesc, ${esc(cine)}. Rămâne plata.</h2>
      <p class="lead rv" style="--d:.14s">${abon ? `Prima lună: <b>${esc(nr(pr.total))} RON</b>${pr.platitor ? ' (cu TVA)' : ''}. Începem în ziua în care se confirmă.` : `Suma: <b>${esc(nr(pr.total))} RON</b>${pr.platitor ? ' (cu TVA)' : ''}. Începem în ziua în care se confirmă.`}</p>
      <div class="plata rv" style="--d:.2s" data-slug="${esc(d.slug || '')}"${preview ? ' data-preview="1"' : ''}>
        ${cardOk ? `<div class="opt${modAles === 'card' ? ' on' : ''}" data-mod="card"><div><h3>Cu cardul</h3><p>Plată securizată prin Stripe. ${abon ? 'Lunile următoare se plătesc singure, la aceeași dată. Poți opri oricând după perioada minimă.' : 'Confirmare instantă.'}</p></div><button class="btn" type="button" id="btn-card"><span>Plătește ${esc(nr(pr.total))} RON</span><span class="ar">→</span></button></div>` : ''}
        ${transferOk ? `<div class="opt${modAles === 'transfer' || !cardOk ? ' on' : ''}" data-mod="transfer"><div><h3>Prin transfer bancar</h3><p>Factura îți vine pe email. Activăm în ziua în care intră banii.</p>
          <dl class="iban"><div><dt>Beneficiar</dt><dd>${esc(P.denumire || 'AleSign&Co SRL')}</dd></div><div><dt>IBAN</dt><dd><b>${esc(P.iban || '[IBAN în curs de completare]')}</b></dd></div><div><dt>Banca</dt><dd>${esc(P.banca || '')}</dd></div><div><dt>Suma</dt><dd><b>${esc(nr(pr.total))} RON</b></dd></div><div><dt>Detalii plată</dt><dd>Contract ${esc(A.numar)}</dd></div></dl></div>
          <button class="btn ghost" type="button" id="btn-transfer"><span>${modAles === 'transfer' ? 'Am făcut transferul' : 'Aleg transferul'}</span><span class="ar">→</span></button></div>` : ''}
        <p class="eroare" id="eroare">Nu a mers. Încearcă din nou sau scrie-mi la info@alesign.net.</p>
        <p class="gata" id="gata">Notat. Te anunț pe email când se confirmă plata și îți trimit pagina de pornire.</p>
      </div>
      <p class="alt rv">Contractul semnat: <a class="lnk" href="/api/contract-pdf?slug=${esc(d.slug || '')}" target="_blank" rel="noopener">descarcă PDF-ul</a>. L-ai primit și pe email.</p>
    </div></section>`;
  } else {
    pasi = `<section class="pasi-s" id="pornire"><div class="wrap">
      <p class="eyebrow rv">Plătit pe ${esc(dataRo(d.platit_la))}</p>
      <h2 class="h2 rv" style="--d:.08s">Bun venit, ${esc(cine)}. De aici începe.</h2>
      <p class="lead rv" style="--d:.14s">Primul lucru de care am nevoie: pozele, logo-ul și câteva răspunsuri. Durează 10 minute și le dai o singură dată.</p>
      <div class="cta rv" style="--d:.2s">${d.onboarding_slug ? `<a class="btn" href="/o/${esc(d.onboarding_slug)}"><span>Deschide pagina de pornire</span><span class="ar">→</span></a>` : ''}<a class="btn ghost" href="/api/contract-pdf?slug=${esc(d.slug || '')}" target="_blank" rel="noopener"><span>Contractul semnat (PDF)</span></a></div>
    </div></section>`;
  }

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Contract ${esc(A.numar)} · ${esc(C.denumire || d.firma || '')} · AleSign&amp;Co</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#f5f2ec; --text:#141414; --muted:#6b675f; --soft:#a39e94; --surface:#fbf9f5; --line:#e2ddd3; --accent:#ff2a2e; --ink:#0c0c0d; --ink-text:#f4f1ea; }
  * { box-sizing:border-box; margin:0; padding:0; }
  html { scroll-behavior:smooth; }
  body { background:var(--bg); color:var(--text); font-family:Manrope, system-ui, sans-serif; line-height:1.65; -webkit-font-smoothing:antialiased; }
  a { color:inherit; text-decoration:none; }
  h1,h2,h3,.serif { font-family:'Cormorant Garamond', Georgia, serif; font-weight:600; letter-spacing:-0.01em; line-height:1.08; }
  .wrap { width:min(880px, 100% - 40px); margin:0 auto; }
  .eyebrow { font-size:11.5px; letter-spacing:.24em; text-transform:uppercase; font-weight:700; color:var(--muted); display:flex; align-items:center; gap:10px; }
  .eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--accent); }
  section { padding:76px 0; }
  section + section { border-top:1px solid var(--line); }
  .h2 { font-size:clamp(30px, 4vw, 44px); margin:14px 0 14px; }
  .lead { color:var(--muted); font-size:17px; max-width:60ch; }
  .lead b { color:var(--text); }

  header.top { position:sticky; top:0; z-index:20; background:color-mix(in srgb, var(--bg) 84%, transparent); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); }
  header.top .wrap { display:flex; align-items:center; justify-content:space-between; height:64px; gap:16px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:14px; letter-spacing:.02em; }
  .brand svg { width:22px; height:22px; }
  .stare { font-size:12.5px; color:var(--muted); display:flex; gap:18px; }
  .stare span { display:flex; align-items:center; gap:6px; }
  .stare i { width:7px; height:7px; border-radius:50%; background:var(--line); display:inline-block; }
  .stare span.on { color:var(--text); font-weight:600; } .stare span.on i { background:var(--accent); }
  .stare span.gata i { background:var(--text); }

  .scrisoare { padding:84px 0 64px; }
  .scrisoare h1 { font-size:clamp(40px, 6.4vw, 72px); margin:18px 0 28px; max-width:14ch; }
  .scrisoare h1 .w { display:inline-block; }
  .scrisoare .text { max-width:64ch; }
  .scrisoare .text p { font-size:clamp(17px, 1.5vw, 19px); margin-bottom:18px; color:#2a2823; }
  .scrisoare .text p:first-child { font-family:'Cormorant Garamond', serif; font-size:clamp(23px, 2.5vw, 28px); font-weight:500; color:var(--text); line-height:1.3; }
  .semn { display:flex; align-items:center; gap:14px; margin-top:28px; }
  .semn .nume { font-family:'Cormorant Garamond', serif; font-style:italic; font-size:30px; font-weight:500; }
  .semn .rol { font-size:12.5px; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; }
  .semn .rol::before { content:''; display:inline-block; width:22px; height:1px; background:var(--line); vertical-align:middle; margin-right:10px; }

  .rezumat { margin-top:44px; background:var(--ink); color:var(--ink-text); border-radius:22px; padding:32px 34px; display:grid; grid-template-columns:1.2fr 1fr; gap:28px; align-items:center; }
  .rezumat .eyebrow { color:#b9b4aa; }
  .rezumat h3 { font-size:38px; margin:8px 0 6px; }
  .rezumat .desc { color:#cbc6bb; font-size:14.5px; max-width:44ch; }
  .rezumat dl { display:grid; gap:12px; border-left:1px solid #2a2a2d; padding-left:26px; }
  .rezumat dt { font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:#8f8a80; font-weight:700; }
  .rezumat dd { font-size:15px; }
  .rezumat dd b { font-family:'Cormorant Garamond', serif; font-size:34px; font-weight:600; line-height:1; }
  .rezumat dd span { color:#b9b4aa; font-size:13px; }

  /* documentul */
  .doc { position:relative; margin-top:38px; }
  .doc-in { background:#fff; border:1px solid var(--line); border-radius:22px; padding:52px 56px; max-height:560px; overflow:hidden; transition:max-height .6s cubic-bezier(.2,.7,.2,1); box-shadow:0 30px 60px -50px rgba(0,0,0,.35); }
  .doc.deschis .doc-in { max-height:none; }
  .doc-antet { display:flex; justify-content:space-between; align-items:center; gap:16px; font-size:12px; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; margin-bottom:34px; padding-bottom:18px; border-bottom:1px solid var(--line); }
  .doc-antet div:first-child { display:flex; align-items:center; gap:8px; font-weight:700; color:var(--text); }
  .doc-antet svg { width:18px; height:18px; }
  .doc-in h2 { font-size:38px; margin-bottom:26px; }
  .doc-in h3 { font-size:20px; margin:30px 0 10px; font-family:Manrope, sans-serif; font-weight:700; letter-spacing:0; }
  .doc-in p { font-size:15px; color:#2a2823; margin-bottom:10px; }
  .doc-in ul { margin:6px 0 14px 18px; font-size:15px; color:#2a2823; display:grid; gap:6px; }
  .doc-in .mic { font-size:13px; color:var(--muted); }
  .semnaturi { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:40px; padding-top:24px; border-top:1px solid var(--line); }
  .semnaturi .et { font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); font-weight:700; display:block; margin-bottom:8px; }
  .semnaturi b { display:block; font-family:'Cormorant Garamond', serif; font-size:26px; font-weight:600; line-height:1.1; }
  .semnaturi span:last-child { font-size:13px; color:var(--muted); }
  .doc-fade { position:absolute; left:0; right:0; bottom:0; padding:120px 0 26px; background:linear-gradient(to bottom, rgba(255,255,255,0), #fff 60%); display:flex; justify-content:center; border-radius:0 0 22px 22px; }
  .doc.deschis .doc-fade { display:none; }

  .btn { display:inline-flex; align-items:center; gap:12px; padding:15px 24px; border-radius:999px; background:var(--ink); color:var(--ink-text); font-weight:600; font-size:15px; border:0; cursor:pointer; position:relative; overflow:hidden; transition:transform .2s ease, box-shadow .2s ease; white-space:nowrap; font-family:inherit; }
  .btn::after { content:''; position:absolute; inset:0; background:var(--accent); transform:translateX(-101%); transition:transform .45s cubic-bezier(.7,0,.2,1); z-index:0; }
  .btn > * { position:relative; z-index:1; }
  .btn:hover { transform:translateY(-2px); box-shadow:0 14px 30px -16px rgba(0,0,0,.6); }
  .btn:hover::after { transform:translateX(0); }
  .btn .ar { display:inline-block; transition:transform .3s ease; }
  .btn:hover .ar { transform:translateX(4px); }
  .btn.ghost { background:transparent; color:var(--text); border:1px solid var(--line); }
  .btn.ghost::after { background:var(--ink); }
  .btn.ghost:hover { color:var(--ink-text); }
  .btn[disabled] { opacity:.6; pointer-events:none; }
  .lnk { position:relative; font-weight:600; padding-bottom:2px; }
  .lnk::after { content:''; position:absolute; left:0; bottom:0; width:100%; height:1px; background:currentColor; transform:scaleX(0); transform-origin:right; transition:transform .4s cubic-bezier(.7,0,.2,1); }
  .lnk:hover::after { transform:scaleX(1); transform-origin:left; }

  form { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:34px; display:grid; gap:16px; margin-top:30px; }
  .f { display:grid; gap:6px; }
  .f label { font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; font-weight:700; color:var(--muted); }
  .f label small { text-transform:none; letter-spacing:0; font-weight:500; }
  .f input { font:inherit; font-size:15.5px; padding:13px 14px; border:1px solid var(--line); border-radius:12px; background:#fff; color:var(--text); outline:none; transition:border-color .2s ease, box-shadow .2s ease; width:100%; }
  .f input:focus { border-color:var(--text); box-shadow:0 0 0 4px rgba(20,20,20,.06); }
  .f input.semn-input { font-family:'Cormorant Garamond', serif; font-style:italic; font-size:30px; padding:10px 16px; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .sep { margin-top:22px; padding-top:30px; border-top:1px solid var(--line); }
  .sep .h2 { font-size:32px; margin-bottom:8px; }
  .sep .lead { font-size:15.5px; }
  .seg { display:flex; gap:6px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:5px; }
  .seg label { flex:1; text-align:center; font-size:14px; font-weight:600; padding:9px 8px; border-radius:9px; cursor:pointer; color:var(--muted); transition:all .2s ease; text-transform:none; letter-spacing:0; }
  .seg input { display:none; }
  .seg input:checked + label { background:var(--ink); color:var(--ink-text); }
  .acord { display:flex; gap:12px; align-items:flex-start; font-size:13.5px; color:var(--muted); }
  .acord input { width:18px; height:18px; margin-top:2px; accent-color:var(--text); flex:none; }
  form .btn { justify-content:center; }
  .eroare, .gata { font-size:13.5px; display:none; }
  .eroare { color:var(--accent); }
  .gata { color:var(--text); font-weight:600; }
  .alt { font-size:13.5px; color:var(--muted); margin-top:6px; }

  .plata { display:grid; gap:16px; margin-top:30px; }
  .opt { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:28px 30px; display:grid; grid-template-columns:1fr auto; gap:24px; align-items:center; transition:border-color .3s ease, transform .3s ease; }
  .opt.on { border-color:var(--text); }
  .opt h3 { font-size:26px; margin-bottom:6px; }
  .opt p { color:var(--muted); font-size:14.5px; max-width:52ch; }
  .iban { display:grid; grid-template-columns:repeat(2, auto); gap:8px 28px; margin-top:16px; font-size:14px; }
  .iban dt { font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); font-weight:700; }
  .iban dd b { font-family:ui-monospace, monospace; font-size:15px; letter-spacing:.04em; }
  .cta { display:flex; gap:12px; flex-wrap:wrap; margin-top:30px; }

  footer { border-top:1px solid var(--line); padding:34px 0 46px; font-size:13px; color:var(--muted); }
  footer .wrap { display:flex; justify-content:space-between; gap:18px; flex-wrap:wrap; align-items:center; }
  footer .as { display:flex; align-items:center; gap:8px; }
  footer .as svg { width:16px; height:16px; }

  .rv { opacity:0; transform:translateY(16px); transition:opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1); transition-delay:var(--d, 0s); }
  .rv.in { opacity:1; transform:none; }
  .scrisoare h1 .w { opacity:0; transform:translateY(18px) rotate(1deg); animation:w .9s cubic-bezier(.2,.7,.2,1) forwards; animation-delay:calc(.12s + var(--i) * .07s); }
  @keyframes w { to { opacity:1; transform:none; } }
  @media (prefers-reduced-motion: reduce) { .rv, .scrisoare h1 .w { opacity:1; transform:none; transition:none; animation:none; } }
  @media (max-width: 780px) {
    section { padding:56px 0; } .scrisoare { padding:60px 0 48px; }
    .rezumat, .opt, .semnaturi, .row { grid-template-columns:1fr; }
    .rezumat dl { border-left:0; padding-left:0; border-top:1px solid #2a2a2d; padding-top:18px; }
    .doc-in { padding:32px 22px; } form { padding:22px; }
    .stare { display:none; }
    .iban { grid-template-columns:1fr; }
  }
  @media print { header.top, .doc-fade, .pasi-s, footer, .rezumat { display:none !important; } .doc-in { max-height:none; border:0; box-shadow:none; } body { background:#fff; } }
</style>
</head>
<body>

<header class="top"><div class="wrap">
  <a class="brand" href="https://alesign.net" target="_blank" rel="noopener">${MARCA}<span>AleSign&amp;Co</span></a>
  <div class="stare"><span class="${stare === 'trimis' ? 'on' : 'gata'}"><i></i>Semnare</span><span class="${stare === 'semnat' ? 'on' : stare === 'platit' ? 'gata' : ''}"><i></i>Plată</span><span class="${stare === 'platit' ? 'on' : ''}"><i></i>Pornire</span></div>
</div></header>

<section class="scrisoare"><div class="wrap">
  <p class="eyebrow rv">Contract ${esc(A.numar)} · ${esc(C.denumire || d.firma || '')}</p>
  <h1>${cuvinte(stare === 'platit' ? 'Suntem în echipă.' : stare === 'semnat' ? 'Semnat. Un pas.' : 'Contractul tău, gata.')}</h1>
  <div class="text">
    ${stare === 'trimis' ? `<p class="rv" style="--d:.35s">Salut${cine ? `, ${esc(cine)}` : ''}. Mulțumesc pentru încredere. Am pregătit contractul: scurt, în română normală, fără capcane.</p>
    <p class="rv" style="--d:.47s">Mai jos e tot: ce facem, cât costă, cât durează, ce se întâmplă dacă vrei să oprești. Îl citești în 5 minute. Apoi completezi datele firmei, îl semnezi cu numele tău și alegi cum plătești. Atât.</p>
    <p class="rv" style="--d:.59s">Dacă ceva nu e clar, îmi scrii înainte să semnezi. Prefer o întrebare în plus decât o neînțelegere mai târziu.${expira ? ` Linkul rămâne valabil până pe ${esc(dataRo(expira))}.` : ''}</p>`
    : stare === 'semnat' ? `<p class="rv" style="--d:.35s">Mulțumesc${cine ? `, ${esc(cine)}` : ''}. Contractul e semnat și l-ai primit pe email.</p><p class="rv" style="--d:.47s">Mai rămâne plata primei ${abon ? 'luni' : 'tranșe'}. În ziua în care se confirmă, îți trimit pagina de pornire: acolo îmi dai pozele și accesele, și pornim.</p>`
    : `<p class="rv" style="--d:.35s">Bun venit${cine ? `, ${esc(cine)}` : ''}. Plata e confirmată, contractul e activ.</p><p class="rv" style="--d:.47s">De aici, ritmul e simplu: tu îmi dai materialele o singură dată, eu îți arăt ce am construit, tu aprobi, restul rulează. Primul pas e pagina de pornire de mai jos.</p>`}
  </div>
  <div class="semn rv" style="--d:.7s"><span class="nume">Alexandru</span><span class="rol">AleSign&amp;Co</span></div>
  ${rezumat}
</div></section>

<section class="contract"><div class="wrap">
  <p class="eyebrow rv">Contractul</p>
  <h2 class="h2 rv" style="--d:.08s">Ce semnăm, cuvânt cu cuvânt.</h2>
  <p class="lead rv" style="--d:.14s">Tot textul, plus Anexa 1 cu ce include pachetul și termenele. Nimic ascuns în note de subsol.</p>
  ${doc}
</div></section>

${pasi}

<footer><div class="wrap">
  <div>AleSign&amp;Co · <a class="lnk" href="https://alesign.net" target="_blank" rel="noopener">alesign.net</a> · <a class="lnk" href="mailto:info@alesign.net">info@alesign.net</a></div>
  <div class="as">${MARCA}<span>Construit de AleSystem Design</span></div>
  <div>Pagină privată pentru ${esc(C.denumire || d.firma || '')}. Nu e indexată de Google.</div>
</div></footer>

<script>
(function(){
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });

  var doc = document.getElementById('doc'), mai = document.getElementById('doc-mai');
  if (mai) mai.addEventListener('click', function(){ doc.classList.add('deschis'); });

  var f = document.getElementById('f-semn');
  if (f) {
    f.addEventListener('submit', function(ev){
      ev.preventDefault();
      var fd = new FormData(f), b = { client: {} }; fd.forEach(function(v, k){ if (k === 'nume' || k === 'plata_mod' || k === 'acord') b[k] = v; else b.client[k] = v; });
      b.slug = f.getAttribute('data-slug'); b.acord = !!b.acord;
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.firstElementChild.textContent = 'Se semnează…';
      var fail = function(m){ btn.disabled = false; btn.firstElementChild.textContent = 'Semnez contractul'; var e = document.getElementById('eroare'); e.style.display = 'block'; if (m) e.textContent = m; };
      if (f.getAttribute('data-preview')) { setTimeout(function(){ btn.firstElementChild.textContent = 'Semnat (previzualizare)'; }, 700); return; }
      fetch('/api/semneaza', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
        .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
        .then(function(x){ if (!x.ok) return fail(x.j && x.j.motiv === 'date firma lipsa' ? 'Lipsesc date ale firmei (denumire, CUI, adresă, email).' : null); if (x.j.url) { location.href = x.j.url; return; } location.href = location.pathname + '?semnat=1#plata'; })
        .catch(function(){ fail(); });
    });
  }

  var pl = document.querySelector('.plata');
  if (pl) {
    var slug = pl.getAttribute('data-slug'), prev = pl.getAttribute('data-preview');
    var bc = document.getElementById('btn-card'), bt = document.getElementById('btn-transfer');
    var err = function(){ document.getElementById('eroare').style.display = 'block'; };
    if (bc) bc.addEventListener('click', function(){
      bc.disabled = true; bc.firstElementChild.textContent = 'Te duc la plată…';
      if (prev) return;
      fetch('/api/plata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: slug }) }).then(function(r){ return r.json(); }).then(function(j){ if (j && j.url) location.href = j.url; else { bc.disabled = false; bc.firstElementChild.textContent = 'Plătește'; err(); } }).catch(function(){ bc.disabled = false; err(); });
    });
    if (bt) bt.addEventListener('click', function(){
      bt.disabled = true;
      var anuntat = bt.firstElementChild.textContent.indexOf('Am făcut') === 0;
      if (prev) { document.getElementById('gata').style.display = 'block'; return; }
      fetch('/api/plata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: slug, mod: 'transfer', anuntat: anuntat }) }).then(function(r){ return r.json(); }).then(function(j){
        if (!j || !j.ok) { bt.disabled = false; err(); return; }
        document.querySelectorAll('.opt').forEach(function(o){ o.classList.toggle('on', o.getAttribute('data-mod') === 'transfer'); });
        if (anuntat) { document.getElementById('gata').style.display = 'block'; } else { bt.disabled = false; bt.firstElementChild.textContent = 'Am făcut transferul'; }
      }).catch(function(){ bt.disabled = false; err(); });
    });
  }
})();
</script>
</body>
</html>`;
}

function cuvinte(s) { return s.split(' ').map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(' '); }

export function contractIndisponibil({ motiv = 'expirat' } = {}) {
  const t = motiv === 'anulat' ? 'Contractul a fost retras.' : 'Linkul a expirat.';
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${t}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#141414;font-family:Manrope,system-ui,sans-serif;text-align:center;padding:24px}h1{font-family:'Cormorant Garamond',serif;font-size:44px;margin:0 0 12px}p{color:#6b675f;max-width:44ch;margin:0 auto 22px}a{display:inline-block;padding:14px 24px;border-radius:999px;background:#0c0c0d;color:#f4f1ea;text-decoration:none;font-weight:600}</style></head>
<body><div><h1>${t}</h1><p>Nu e nicio problemă. Scrie-mi și îți trimit unul nou în aceeași zi.</p><a href="mailto:info@alesign.net?subject=${encodeURIComponent('Contract')}">Scrie-mi</a></div></body></html>`;
}
