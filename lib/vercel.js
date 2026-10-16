// Vercel prin API (Bot Website v5.1, „Vercel: un proiect per site”): un proiect pe site, în echipa site-urilor clienților,
// fișierele statice urcate o dată (după SHA1), preview cu noindex, apoi producția pe domeniul clientului. Tokenul stă doar în env (VERCEL_TOKEN), pus de Alex.
// Deviez / de verificat la primul deploy real: numele câmpurilor API (v13 deployments, v2 files, v10 projects/domains, ssoProtection) sunt cele cunoscute din
// documentația Vercel, dar spec-ul le marchează „neverificat”; fiecare apel întoarce eroarea API-ului întreagă, ca să se vadă imediat ce s-a schimbat.
import { createHash } from 'crypto';

const API = 'https://api.vercel.com';
export const sha1 = (b) => createHash('sha1').update(b).digest('hex');
export const numeProiect = (slug) => ('site-' + String(slug || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')).slice(0, 90);

export function vercel({ token, echipa = null, f = fetch, pauza = (ms) => new Promise((x) => setTimeout(x, ms)) }) {
  if (!token) throw new Error('lipsește VERCEL_TOKEN');
  const q = (cale) => `${API}${cale}${echipa ? (cale.includes('?') ? '&' : '?') + 'teamId=' + encodeURIComponent(echipa) : ''}`;
  const cere = async (metoda, cale, corp, antete = {}) => {
    const r = await f(q(cale), { method: metoda, headers: { Authorization: `Bearer ${token}`, ...(corp && !Buffer.isBuffer(corp) ? { 'Content-Type': 'application/json' } : {}), ...antete }, body: corp == null ? undefined : (Buffer.isBuffer(corp) ? corp : JSON.stringify(corp)) });
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = { brut: t }; }
    if (!r.ok) { const e = new Error(`Vercel ${metoda} ${cale.split('?')[0]}: ${r.status} ${(j && j.error && (j.error.code + ' ' + j.error.message)) || t.slice(0, 200)}`); e.status = r.status; e.raspuns = j; throw e; }
    return j;
  };
  return {
    // proiectul site-ului: îl ia sau îl creează (fără framework, fără build: fișierele vin gata făcute); protecția de preview oprită, ca clientul să vadă preview-ul
    async proiect(nume) {
      try { return await cere('GET', `/v9/projects/${encodeURIComponent(nume)}`); }
      catch (e) { if (e.status !== 404) throw e; }
      const p = await cere('POST', '/v10/projects', { name: nume, framework: null });
      try { await cere('PATCH', `/v9/projects/${p.id}`, { ssoProtection: null }); } catch (e) { /* se vede la primul preview: QA-ul pică pe 401, nu trece în tăcere */ }
      return p;
    },
    // urcă fișierele (o dată, după SHA1); întoarce lista pentru deployment
    async urca(fisiere) {
      const lista = [];
      for (const x of fisiere) {
        const b = Buffer.isBuffer(x.date) ? x.date : Buffer.from(String(x.date));
        const s = sha1(b);
        await cere('POST', '/v2/files', b, { 'Content-Type': 'application/octet-stream', 'x-vercel-digest': s, 'Content-Length': String(b.length) });
        lista.push({ file: x.cale, sha: s, size: b.length });
      }
      return lista;
    },
    async deploy({ proiect, fisiere, productie = false, meta = {} }) {
      const files = await this.urca(fisiere);
      const d = await cere('POST', '/v13/deployments', { name: proiect.name || proiect, project: proiect.id || proiect, files, target: productie ? 'production' : undefined,
        projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null }, meta: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, String(v)])) });
      return d;
    },
    async asteapta(id, { incercari = 40, ms = 3000 } = {}) {
      for (let i = 0; i < incercari; i++) {
        const d = await cere('GET', `/v13/deployments/${id}`);
        if (d.readyState === 'READY') return d;
        if (['ERROR', 'CANCELED'].includes(d.readyState)) throw new Error(`deployment ${id}: ${d.readyState}${d.errorMessage ? ' · ' + d.errorMessage : ''}`);
        await pauza(ms);
      }
      throw new Error(`deployment ${id}: nu e gata după ${Math.round(incercari * ms / 1000)} s`);
    },
    // domeniul clientului pe proiect (și www, cu redirect spre varianta principală: V2 „o singură variantă”)
    async domeniu(proiect, domeniu) {
      const d = String(domeniu).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const apex = d.replace(/^www\./, '');
      const add = async (corp) => { try { return await cere('POST', `/v10/projects/${proiect.id || proiect}/domains`, corp); } catch (e) { if (e.status === 409) return null; throw e; } };
      await add({ name: apex });
      await add({ name: 'www.' + apex, redirect: apex, redirectStatusCode: 301 });
      const st = await cere('GET', `/v9/projects/${proiect.id || proiect}/domains/${apex}`);
      return { domeniu: apex, verificat: !!(st && st.verified), cerinte: (st && st.verification) || [] };
    },
    // revenirea (Care, incident): domeniul trece înapoi pe deployment-ul anterior
    async revino(proiect, deploymentId, domeniu) {
      return cere('POST', `/v2/deployments/${deploymentId}/aliases`, { alias: domeniu });
    },
    // V1: configurarea DNS a domeniului, așa cum o vede Vercel (misconfigured = DNS-ul nu duce la proiect)
    async domeniuConfig(domeniu) { return cere('GET', `/v6/domains/${encodeURIComponent(domeniu)}/config`); },
    // V4: deployment-ul de restaurare (preview) se șterge după verificare
    async sterge(id) { try { await cere('DELETE', `/v13/deployments/${id}`); return true; } catch (e) { return false; } },
    async deploymenturi(proiect, n = 5) { return cere('GET', `/v6/deployments?projectId=${proiect.id || proiect}&limit=${n}&target=production`); },
  };
}
