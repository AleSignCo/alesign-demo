// POST /api/site-build {sarcina_id, productie?: false} (Bot Website v5.1): build-ul static al unei sarcini de site și deploy-ul pe Vercel,
// în proiectul site-ului (echipa site-urilor clienților). Etapa 4: preview cu noindex → n8n cheamă site_build_gata. Poarta D: producția pe domeniu,
// numai dacă build-ul refăcut are același hash cu cel aprobat (V5), urmată de verificările de publicare (V2, V5, S4, V8) → n8n cheamă site_publicat.
// Chemat doar de n8n, cu antetul secret (x-alesign-secret). Cheile (Supabase service, Vercel) stau în env, puse de Alex.
// Găzduirea din contract (SQL 75–76): alesign (ca până acum), client_vercel (producția în echipa Vercel a clientului, contracte.vercel_echipa),
// client_fisiere (fără formular central și fără măsurare; la Poarta D, build-ul se arhivează și se predă, nimic nu se publică la noi).
import dns from 'dns/promises';
import tls from 'tls';
import { construiesteSite } from '../lib/site-build.js';
import { vercel, numeProiect } from '../lib/vercel.js';
import { arhiveaza, citesteArhiva } from '../lib/arhiva.js';

export const config = { maxDuration: 300 };
const SB = process.env.SUPABASE_URL; const SERV = process.env.SUPABASE_SERVICE_KEY; const SECRET = process.env.N8N_WEBHOOK_SECRET || '';
const hs = () => ({ apikey: SERV, Authorization: `Bearer ${SERV}`, 'Content-Type': 'application/json' });
const echipaDin = (p) => (p && p.echipa) || process.env.VERCEL_TEAM_SITES || null; // site-urile din echipa clientului își păstrează echipa în publicare

export async function aduce(u) { const r = await fetch(u); if (!r.ok) throw new Error(`${u.split('?')[0]}: ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
async function semneaza(cai) {
  if (!cai.length) return {};
  const r = await fetch(`${SB}/storage/v1/object/sign/onboarding`, { method: 'POST', headers: hs(), body: JSON.stringify({ expiresIn: 600, paths: cai }) });
  if (!r.ok) throw new Error('semnarea pozelor: ' + r.status);
  return Object.fromEntries((await r.json()).filter((x) => x.signedURL).map((x) => [x.path, `${SB}/storage/v1${x.signedURL}`]));
}

// V8: instantaneul DNS al emailului pe domeniu (MX, SPF, DMARC); se ia la primul build, înainte de orice schimbare pentru site
export const rezolvitorDns = { r: dns }; // testele îl înlocuiesc
export async function dnsEmail(domeniu, r = rezolvitorDns.r) {
  const txt = async (n) => { try { return (await r.resolveTxt(n)).map((x) => x.join('')); } catch (e) { return []; } };
  let mx = []; try { mx = (await r.resolveMx(domeniu)).map((x) => x.exchange.toLowerCase()).sort(); } catch (e) { mx = []; }
  const spf = (await txt(domeniu)).find((x) => /^v=spf1/i.test(x)) || null;
  const dmarc = (await txt('_dmarc.' + domeniu)).find((x) => /^v=DMARC1/i.test(x)) || null;
  return { mx, spf, dmarc };
}

// V8: emailul pe domeniu rămâne la fel după schimbările DNS pentru site: MX, SPF și DMARC identice cu instantaneul de dinainte
// (DKIM: selectorul nu se poate enumera din DNS; testul dus-întors al emailului e în Mod test). Fără instantaneu: nimic de comparat, V8 rămâne pe Dosar.
export async function verificaEmail(domeniu, inainte, r = rezolvitorDns.r) {
  if (!inainte || !((inainte.mx && inainte.mx.length) || inainte.spf || inainte.dmarc)) return [];
  const dupa = await dnsEmail(domeniu, r);
  const egal = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
  const mxInainte = [...(inainte.mx || [])].map((x) => String(x).toLowerCase()).sort();
  const dif = [!egal(mxInainte, dupa.mx) && 'MX', !egal(inainte.spf, dupa.spf) && 'SPF', !egal(inainte.dmarc, dupa.dmarc) && 'DMARC'].filter(Boolean);
  return [{ cod: 'V8', trecut: dif.length === 0, motiv: dif.length ? `schimbat după publicare: ${dif.join(', ')} (MX acum: ${dupa.mx.join(', ') || '—'})` : `emailul neatins: MX ${dupa.mx.join(', ') || '—'}, SPF ${dupa.spf ? 'da' : 'nu'}, DMARC ${dupa.dmarc ? 'da' : 'nu'}` }];
}

// pagina de așteptare (la prima publicare, când V1, V2 sau V5 pică): numele firmei, contactul din Dosar, noindex; versiune.json = „asteptare”
const escH = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function paginaAsteptare({ firma = '', telefon = '', email = '' } = {}) {
  const tel = String(telefon || '').replace(/[^0-9+]/g, '');
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escH(firma)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#141414;font-family:system-ui,sans-serif;padding:24px;text-align:center}h1{font-size:clamp(28px,6vw,44px);margin:0 0 12px}p{margin:6px 0;color:#4a4740}a{color:#141414;font-weight:600}</style></head>
<body><main><h1>${escH(firma)}</h1><p>Site-ul nou e aproape gata.</p>${tel ? `<p>Până atunci: <a href="tel:${escH(tel)}">${escH(telefon)}</a></p>` : ''}${email ? `<p><a href="mailto:${escH(email)}">${escH(email)}</a></p>` : ''}</main></body></html>`;
  const antete = { headers: [{ source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Content-Security-Policy', value: "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" }] }] };
  return [{ cale: 'index.html', date: html }, { cale: '404.html', date: html }, { cale: 'versiune.json', date: JSON.stringify({ build: 'asteptare' }) }, { cale: 'vercel.json', date: JSON.stringify(antete) }];
}

// Poarta D: dacă pică V1, V2 sau V5, domeniul revine la deploy-ul anterior (din arhiva publicării de dinainte); la prima publicare, la pagina de așteptare
export async function revinoDupaPicare({ V, proiect, s, dosar, verificari, build, sb, cheie, f = fetch }) {
  const critice = (verificari || []).filter((v) => ['V1', 'V2', 'V5'].includes(v.cod) && v.trecut === false);
  if (!critice.length) return null;
  const anterior = s && s.publicare && s.publicare.arhiva && !String(s.publicare.arhiva).endsWith(`/${build}.tar`) ? s.publicare.arhiva : null;
  let fisiere; let tinta;
  if (anterior) { try { fisiere = await citesteArhiva({ sb, cheie, cale: anterior, f }); tinta = anterior.split('/').pop().replace(/\.tar$/, ''); } catch (e) { fisiere = null; } }
  if (!fisiere) { fisiere = paginaAsteptare({ firma: dosar.firma, telefon: dosar.telefon, email: dosar.email }); tinta = 'asteptare'; }
  const dep = await V.deploy({ proiect, fisiere, productie: true, meta: { sarcina: s.id, revenire: tinta, motiv: critice.map((v) => v.cod).join(',') } });
  await V.asteapta(dep.id);
  return { build: tinta, deploy_id: dep.id, coduri: [...new Set(critice.map((v) => v.cod))] };
}

// verificările de publicare care se pot face din funcție (restul, pe mașina de QA): certificatul, HTTP → HTTPS, build-ul de pe domeniu, noindex, emailul pe domeniu
export async function verificaPublicarea(domeniu, build, emailInainte, f = fetch) {
  const out = [];
  const cert = await new Promise((ok) => { const s = tls.connect({ host: domeniu, port: 443, servername: domeniu, timeout: 8000 }, () => { const c = s.getPeerCertificate(); s.end(); ok(c && c.valid_to ? new Date(c.valid_to) : null); }); s.on('error', () => ok(null)); s.on('timeout', () => { s.destroy(); ok(null); }); });
  out.push({ cod: 'V2', trecut: !!cert && cert - Date.now() > 30 * 864e5, motiv: cert ? `certificatul expiră pe ${cert.toISOString().slice(0, 10)}` : 'fără certificat valid' });
  try { const h = await f(`http://${domeniu}/`, { redirect: 'manual' }); const loc = h.headers.get('location') || ''; out.push({ cod: 'V2', trecut: [301, 308].includes(h.status) && loc.startsWith(`https://${domeniu}`), motiv: `HTTP → ${h.status} ${loc}` }); } catch (e) { out.push({ cod: 'V2', trecut: false, motiv: 'HTTP: ' + e.message }); }
  try { const v = await (await f(`https://${domeniu}/versiune.json`, { cache: 'no-store' })).json(); out.push({ cod: 'V5', trecut: v.build === build, motiv: `build pe domeniu ${v.build}, aprobat ${build}` }); } catch (e) { out.push({ cod: 'V5', trecut: false, motiv: 'versiune.json: ' + e.message }); }
  try { const p = await f(`https://${domeniu}/`); const t = await p.text(); out.push({ cod: 'S4', trecut: !/noindex/i.test(p.headers.get('x-robots-tag') || '') && !/<meta name="robots" content="noindex/i.test(t), motiv: 'noindex pe site-ul publicat' }); } catch (e) { out.push({ cod: 'S4', trecut: false, motiv: e.message }); }
  out.push(...await verificaEmail(domeniu, emailInainte));
  return out;
}

// V1: domeniul (cu și fără www) duce la proiect (configurarea văzută de Vercel) și expiră peste cel puțin 30 de zile (RDAP; unde registrul n-are RDAP, „neconcludent”, la Alex)
export async function verificaDomeniul(V, apex, f = fetch) {
  const out = [];
  for (const d of [apex, 'www.' + apex]) {
    try { const c = await V.domeniuConfig(d); out.push({ cod: 'V1', trecut: c && c.misconfigured === false, motiv: `${d}: ${c && c.misconfigured === false ? 'DNS spre proiect' : 'DNS greșit sau nelegat'}` }); }
    catch (e) { out.push({ cod: 'V1', trecut: false, motiv: `${d}: ${e.message}` }); }
  }
  let exp = null;
  try { const r = await f(`https://rdap.org/domain/${encodeURIComponent(apex)}`, { headers: { Accept: 'application/rdap+json' } }); if (r.ok) { const j = await r.json(); const e = (j.events || []).find((x) => x.eventAction === 'expiration'); exp = e ? new Date(e.eventDate) : null; } } catch (e) { exp = null; }
  out.push(exp && !isNaN(exp) ? { cod: 'V1', trecut: exp - Date.now() > 30 * 864e5, motiv: `domeniul expiră pe ${exp.toISOString().slice(0, 10)}` }
    : { cod: 'V1', trecut: null, motiv: 'neconcludent: registrul nu dă data expirării prin RDAP; verifică la registrar (Alex)' });
  return out;
}

// V4: arhiva build-ului publicat și o restaurare din ea pe un preview, care trebuie să servească același build
export async function verificaArhiva({ V, proiect, build, fisiere, sb, cheie, f = fetch }) {
  try {
    const a = await arhiveaza({ sb, cheie, proiect: proiect.name, build, fisiere, f });
    const inapoi = await citesteArhiva({ sb, cheie, cale: a.cale, f });
    const dep = await V.deploy({ proiect, fisiere: inapoi, productie: false, meta: { restaurare: build } });
    const gata = await V.asteapta(dep.id);
    let v = null; try { v = await (await f(`https://${gata.url}/versiune.json`, { cache: 'no-store' })).json(); } catch (e) { v = null; }
    await V.sterge(dep.id);
    const ok = !!v && v.build === build && inapoi.length === fisiere.length;
    return { verificare: { cod: 'V4', trecut: ok, motiv: ok ? `arhiva ${a.cale} (${inapoi.length} fișiere) restaurată pe preview, același build` : `restaurarea din ${a.cale} nu servește build-ul ${build}` }, arhiva: a.cale };
  } catch (e) { return { verificare: { cod: 'V4', trecut: false, motiv: 'arhiva: ' + e.message }, arhiva: null }; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  if (!SECRET || req.headers['x-alesign-secret'] !== SECRET) { res.status(403).json({ ok: false, motiv: 'antet secret lipsă' }); return; }
  if (!SB || !SERV || !process.env.VERCEL_TOKEN) { res.status(500).json({ ok: false, motiv: 'lipsesc SUPABASE_SERVICE_KEY sau VERCEL_TOKEN în env' }); return; }
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const id = parseInt(b.sarcina_id, 10); const retragere = !!b.retragere; const productie = !!b.productie || retragere;
  try {
    const x = await (await fetch(`${SB}/rest/v1/sarcini?id=eq.${id}&select=id,lead_id,contract_id,tip,versiune,continut,detalii,publicare,build,etapa,stare,publicare_aprobata_la,scor_dur`, { headers: hs() })).json();
    const s = x && x[0];
    // Incident (SQL 66): revenirea din arhiva build-ului (deploy-ul anterior la cădere, cel aprobat la desfigurare), fără rebuild; verificată pe versiune.json
    if (b.revenire) {
      const cale = String(b.arhiva || (s && s.publicare && s.publicare.arhiva) || '');
      if (!s || !['publicat', 'livrat'].includes(s.stare) || !/^[a-z0-9-]+\/[0-9a-z]+\.tar$/.test(cale)) { res.status(409).json({ ok: false, motiv: 'revenirea cere un site publicat și o arhivă' }); return; }
      const raport = (ok, build, dep, motiv) => (b.incident_id ? fetch(`${SB}/rest/v1/rpc/incident_revenire_gata`, { method: 'POST', headers: hs(), body: JSON.stringify({ p_incident_id: b.incident_id, p_ok: ok, p_build: build, p_deploy_id: dep, p_motiv: motiv }) }).catch(() => null) : null);
      const build = cale.split('/').pop().replace(/\.tar$/, '');
      try {
        const fis = await citesteArhiva({ sb: SB, cheie: SERV, cale });
        const V = vercel({ token: process.env.VERCEL_TOKEN, echipa: echipaDin(s.publicare) });
        const proiect = await V.proiect((s.publicare && s.publicare.proiect_vercel) || cale.split('/')[0]);
        const dep = await V.deploy({ proiect, fisiere: fis, productie: true, meta: { sarcina: s.id, revenire: build, incident: b.incident_id || null } });
        const gata = await V.asteapta(dep.id);
        let v = null; try { v = await (await fetch(`https://${gata.url}/versiune.json`, { cache: 'no-store' })).json(); } catch (e) { v = null; }
        const ok = !!v && v.build === build;
        await raport(ok, build, dep.id, ok ? null : `după revenire, versiune.json arată ${v ? v.build : 'nimic'}`);
        res.status(200).json({ ok, revenire: true, build, deploy_id: dep.id, url: `https://${gata.url}` });
      } catch (e) { await raport(false, build, null, String(e.message).slice(0, 300)); res.status(500).json({ ok: false, revenire: true, motiv: String(e.message).slice(0, 300) }); }
      return;
    }
    // fluxul domeniului (SQL 69): zilnic, pe un site publicat fără DNS legat (sau la cerere); legat → V1, V2, V8 (încă o dată după legare) și expirarea
    if (b.domeniu_verifica) {
      const p = (s && s.publicare) || {};
      const dom0 = String(p.domeniu || (s && s.detalii && s.detalii.dosar && (s.detalii.dosar.identitate || {}).domeniu) || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!s || !['publicat', 'livrat'].includes(s.stare) || !p.proiect_vercel || !dom0) { res.status(409).json({ ok: false, motiv: 'un site publicat, cu proiect și domeniu' }); return; }
      const V = vercel({ token: process.env.VERCEL_TOKEN, echipa: echipaDin(p) });
      const proiect = await V.proiect(p.proiect_vercel);
      const d = await V.domeniu(proiect, dom0);
      let verificari = [];
      if (d.verificat) verificari = [...await verificaPublicarea(d.domeniu, s.build, (s.detalii && s.detalii.dns_email_inainte) || null), ...await verificaDomeniul(V, d.domeniu)];
      const dnsOk = d.verificat && verificari.filter((v) => v.cod === 'V1' && /DNS/.test(v.motiv || '')).every((v) => v.trecut === true);
      const exp = (verificari.find((v) => v.cod === 'V1' && /expiră pe \d{4}-\d{2}-\d{2}/.test(v.motiv || '')) || {}).motiv;
      const expiraLa = exp ? exp.match(/(\d{4}-\d{2}-\d{2})/)[1] : null;
      await fetch(`${SB}/rest/v1/rpc/site_domeniu_stare`, { method: 'POST', headers: hs(), body: JSON.stringify({ p_sarcina_id: s.id, p_dns_ok: dnsOk, p_verificari: verificari, p_cerinte: d.cerinte || [], p_expira_la: expiraLa }) }).catch(() => null);
      res.status(200).json({ ok: true, domeniu: d.domeniu, dns_ok: dnsOk, verificari, expira_la: expiraLa }); return;
    }
    if (!s || !s.detalii || !s.detalii.dosar) { res.status(404).json({ ok: false, motiv: 'sarcina sau instantaneul Dosarului lipsește' }); return; }
    // L2: un landing expirat se retrage singur: pagina „Oferta s-a încheiat” (noindex) înlocuiește oferta pe același domeniu
    if (retragere && (s.tip !== 'landing' || !['publicat', 'livrat'].includes(s.stare || 'publicat'))) { res.status(409).json({ ok: false, motiv: 'doar un landing publicat se retrage' }); return; }
    if (productie && !retragere && (!s.publicare_aprobata_la || s.scor_dur !== 0)) { res.status(409).json({ ok: false, motiv: 'fără Poarta D sau cu cod dur picat' }); return; }
    const l = (await (await fetch(`${SB}/rest/v1/leaduri?id=eq.${s.lead_id}&select=id,firma,demo_slug,nisa`, { headers: hs() })).json())[0] || {};
    const D = s.detalii.dosar; const I = D.identitate || {}; const Br = D.brand || {};
    const poze = (Array.isArray(Br.poze) ? Br.poze : []).filter((p) => p && p.cale);
    const sem = await semneaza([...(Br.logo && Br.logo.cale ? [Br.logo.cale] : []), ...poze.map((p) => p.cale)]);
    const proiectNume = numeProiect(l.demo_slug || l.firma || 'client-' + s.lead_id);
    const domeniu = String(I.domeniu || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const baza = domeniu ? `https://${domeniu}` : `https://${proiectNume}.vercel.app`;
    const dosar = { firma: I.firma || l.firma, nisa: I.nisa || l.nisa, identitate: I, legal: I.cui ? { denumire: I.denumire_legala, cui: I.cui, reg_com: I.reg_com, sediu: I.sediu, b2c: I.b2c !== false } : null,
      adresare: Br.adresare || '', telefon: I.telefon, email: I.email, adresa: I.adresa, program: I.program, oferta: D.oferta, cifre: D.cifre, brand: Br };
    let sharp = null; try { sharp = (await import('sharp')).default; } catch (e) { sharp = null; }
    const K = s.contract_id ? ((await (await fetch(`${SB}/rest/v1/contracte?id=eq.${s.contract_id}&select=gazduire,vercel_echipa`, { headers: hs() })).json())[0] || {}) : {};
    const gaz = s.tip === 'landing' ? 'alesign' : (K.gazduire || 'alesign'); // landingul stă mereu la noi (campania)
    // la fișierele predate, site-ul nu depinde de nimic de la noi: contactul pe email și telefon, fără formularul central și fără /_m (același build în preview și la predare)
    const formular = gaz !== 'client_fisiere' && process.env.FORMULAR_URL ? { actiune: process.env.FORMULAR_URL, site: '' } : null;
    const rez = await construiesteSite({ piesa: s.continut, dosar, dosarAnterior: (s.detalii && s.detalii.actualizare && s.detalii.actualizare.dosar_anterior) || null, baza, preview: !productie, formular, aduce, sharp, sarcina: s.id, versiune: s.versiune, retras: retragere, masurare: gaz === 'client_fisiere' ? null : (process.env.MASURARE_URL || null),
      salImg: process.env.SAL_IMG_URL ? '/_alesign/anpc-sal.png' : null,
      poze: poze.map((p, i) => ({ id: p.id || p.cale, sursa: p.sursa || 'client', licenta: p.licenta || null, oameni: p.oameni, declaratie_oameni: p.declaratie_oameni, inainte_dupa: p.inainte_dupa, acord_scris: p.acord_scris, alt: p.alt || p.descriere || '', url: sem[p.cale] })),
      logo: Br.logo && Br.logo.cale && sem[Br.logo.cale] ? { id: Br.logo.cale, sursa: 'client', url: sem[Br.logo.cale], alt: '' } : null });
    if (process.env.SAL_IMG_URL) rez.fisiere.push({ cale: '_alesign/anpc-sal.png', date: await aduce(process.env.SAL_IMG_URL), tip: 'image/png' });
    if (productie && !retragere && s.build && rez.build !== s.build) { res.status(409).json({ ok: false, motiv: `build-ul refăcut (${rez.build}) diferă de cel aprobat (${s.build}): ceva s-a schimbat după Poarta C` }); return; }
    const V0 = vercel({ token: process.env.VERCEL_TOKEN, echipa: process.env.VERCEL_TEAM_SITES || null });
    // predarea ca fișiere: arhiva build-ului aprobat (verificată prin restaurare pe un preview al nostru) e livrabilul; nimic pe domeniu
    if (productie && !retragere && gaz === 'client_fisiere') {
      const ar = await verificaArhiva({ V: V0, proiect: await V0.proiect(proiectNume), build: rez.build, fisiere: rez.fisiere, sb: SB, cheie: SERV });
      res.status(200).json({ ok: ar.verificare.trecut === true, build: rez.build, verificari: [ar.verificare], revenire: null,
        publicare: { gazduire: 'client_fisiere', arhiva: ar.arhiva, fisiere: rez.fisiere.length, domeniu: domeniu || null },
        motiv: ar.verificare.trecut === true ? null : 'arhiva pentru predare: ' + ar.verificare.motiv }); return;
    }
    if (productie && !retragere && gaz === 'client_vercel' && !K.vercel_echipa) { res.status(409).json({ ok: false, motiv: 'găzduirea e pe Vercel-ul clientului, dar lipsește echipa lui (Founder OS → contract → echipa Vercel)' }); return; }
    const V = productie && !retragere && gaz === 'client_vercel' ? vercel({ token: process.env.VERCEL_TOKEN, echipa: K.vercel_echipa }) : V0;
    const proiect = await V.proiect(proiectNume);
    const dep = await V.deploy({ proiect, fisiere: rez.fisiere, productie, meta: { sarcina: s.id, versiune: s.versiune, build: rez.build } });
    const gata = await V.asteapta(dep.id);
    if (retragere) {
      // L2: oferta expirată e jos; baza notează retragerea (pingul a venit din bază, care nu citește răspunsul)
      await fetch(`${SB}/rest/v1/rpc/landing_retras`, { method: 'POST', headers: hs(), body: JSON.stringify({ p_sarcina_id: s.id, p_build: rez.build }) }).catch(() => null);
      res.status(200).json({ ok: true, retras: true, build: rez.build, url: `https://${gata.url}` }); return;
    }
    if (!productie) {
      const fapte = { ...rez.fapte };
      if (domeniu && !(s.detalii && s.detalii.dns_email_inainte)) { try { fapte.dns_email = await dnsEmail(domeniu); } catch (e) { /* fără instantaneu: V8 rămâne pe Dosar */ } }
      res.status(200).json({ ok: true, url_preview: `https://${gata.url}`, build: rez.build, deploy_id: dep.id, proiect: proiect.name, fapte }); return;
    }
    let dom = null; let verificari = [];
    if (domeniu) {
      dom = await V.domeniu(proiect, domeniu);
      if (dom.verificat) verificari = [...await verificaPublicarea(dom.domeniu, rez.build, (s.detalii && s.detalii.dns_email_inainte) || I.dns_email || null), ...await verificaDomeniul(V, dom.domeniu)];
    }
    // V4: arhiva și restaurarea (indiferent de domeniu: build-ul publicat trebuie să se poată reface)
    const ar = await verificaArhiva({ V, proiect, build: rez.build, fisiere: rez.fisiere, sb: SB, cheie: SERV });
    verificari.push(ar.verificare);
    // fără domeniu legat încă, site-ul rămâne live pe adresa proiectului (Motor: „pe un subdomeniu al nostru până se rezolvă”), cu alertă DNS;
    // o verificare „neconcludentă” (trecut: null, ex. expirarea .ro fără RDAP) nu oprește publicarea, dar ajunge la Alex în `verificari`
    const ok = verificari.every((v) => v.trecut !== false);
    const revenire = ok ? null : await revinoDupaPicare({ V, proiect, s, dosar, verificari, build: rez.build, sb: SB, cheie: SERV });
    res.status(200).json({ ok, build: rez.build, verificari, revenire, publicare: { gazduire: V === V0 ? 'vercel_alesign' : 'vercel_client', ...(V === V0 ? {} : { echipa: K.vercel_echipa }), proiect_vercel: proiect.name, deploy_id: dep.id, url: `https://${gata.url}`, domeniu: dom ? dom.domeniu : null, dns_ok: !!(dom && dom.verificat), cerinte_dns: dom ? dom.cerinte : [], arhiva: ar.arhiva },
      motiv: !ok ? (revenire ? `domeniul a revenit la ${revenire.build === 'asteptare' ? 'pagina de așteptare' : `build-ul ${revenire.build}`}; ` : '') + 'o verificare de publicare a picat: ' + verificari.filter((v) => v.trecut === false).map((v) => `${v.cod} (${v.motiv})`).join('; ').slice(0, 300)
        : !domeniu ? 'Dosarul n-are domeniul: site-ul e live pe adresa proiectului până îl primim' : (!dom.verificat ? 'domeniul nu e încă legat (DNS): instrucțiunile sunt în cerinte_dns' : null) });
  } catch (e) { res.status(500).json({ ok: false, motiv: String(e.message).slice(0, 400) }); }
}
