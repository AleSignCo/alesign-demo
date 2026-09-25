// Mic ajutor pentru Supabase (cheie publishable) și pentru webhook-urile n8n.
export const URL_SB = process.env.SUPABASE_URL;
export const KEY_SB = process.env.SUPABASE_KEY;
export const WEBHOOK_CONTRACTE = process.env.N8N_WEBHOOK_CONTRACTE || 'https://alesignco.app.n8n.cloud/webhook/contracte';

export const H = () => ({ apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`, 'Content-Type': 'application/json' });

export async function rpc(fn, body) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H(), body: JSON.stringify(body || {}) });
  if (!r.ok) { const t = await r.text(); const e = new Error(t.slice(0, 300)); e.status = r.status; try { e.motiv = JSON.parse(t).message; } catch {} throw e; }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

export function anunta(payload) {
  // n8n verifică singur în Supabase; aici doar semnalăm evenimentul
  return fetch(WEBHOOK_CONTRACTE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
}

export const slugCurat = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
export const ipDin = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 64);
export const bodyDin = (req) => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));
