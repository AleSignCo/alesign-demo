// Stripe Checkout, fără SDK: un POST form-encoded. Cheia secretă stă doar în Vercel (STRIPE_SECRET_KEY).
// v2: o sesiune cu mai multe linii: abonamentul (lunar sau anual) + serviciile plătite o dată (+ creditul ca reducere).
import { totaluri, planTranse } from './contract-text.js';

const KEY = () => process.env.STRIPE_SECRET_KEY || '';
export const stripeConfigurat = () => /^sk_(test|live)_/.test(KEY());

function form(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) continue;
    if (typeof v === 'object') form(v, key, out); else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.join('&');
}

const bani = (ron) => Math.round(Number(ron || 0) * 100);

// d = contract_date(slug); returnează { url } sau aruncă
export async function sesiuneCheckout(d, { slug, host }) {
  if (!stripeConfigurat()) throw new Error('stripe neconfigurat');
  const T = totaluri(d);
  const abon = d.tip === 'abonament' && T.lunar > 0;
  const tva = (p) => (T.platitor ? Math.round(p * (1 + T.tva / 100) * 100) / 100 : p);
  const base = `https://${host}/c/${slug}`;
  const meta = { contract_id: String(d.id), slug, numar: d.numar || '' };
  const items = [];
  if (abon) {
    const anual = T.anual != null;
    items.push({ quantity: 1, price_data: { currency: 'ron', unit_amount: bani(tva(anual ? T.anual : T.lunar)), recurring: { interval: anual ? 'year' : 'month' },
      product_data: { name: `AleSign&Co · ${d.abonament_nume || d.pachet_nume}`, description: `${anual ? 'Abonament anual' : 'Abonament lunar'}, contract ${d.numar}${T.platitor ? ', cu TVA' : ''}` } } });
  }
  // serviciile o dată: o singură linie cu totalul (creditul e deja scăzut în total_unic); dacă e negativ, se aplică ca reducere pe abonament
  // v5.1: cu tranșe (transe_active), sesiunea încasează doar prima tranșă; următoarele pleacă la poarta lor (manual până la valul 1)
  if (T.unic > 0) {
    items.push({ quantity: 1, price_data: { currency: 'ron', unit_amount: bani(tva(T.unicAcum)), product_data: { name: T.transe.length > 1 ? `AleSign&Co · servicii o dată, tranșa 1 din ${T.transe.length}` : `AleSign&Co · servicii o dată`, description: `Contract ${d.numar}: ${T.linii.filter((l) => !l.recurent && ['pachet', 'modul', 'custom'].includes(l.tip)).map((l) => l.nume).join(', ').slice(0, 300)}` } } });
  }
  const body = {
    mode: abon ? 'subscription' : 'payment',
    success_url: `${base}?platit=1`,
    cancel_url: `${base}?anulat=1#plata`,
    client_reference_id: String(d.id),
    customer_email: (d.client || {}).email || undefined,
    locale: 'ro',
    metadata: meta,
    line_items: Object.fromEntries(items.map((it, i) => [i, it])),
    ...(abon ? { subscription_data: { metadata: meta } } : { payment_intent_data: { metadata: { contract_id: String(d.id), slug } } }),
  };
  if (abon && T.unic < 0) {
    // credit: cupon unic pe prima factură
    const c = await fetch('https://api.stripe.com/v1/coupons', { method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ amount_off: bani(tva(-T.unic)), currency: 'ron', duration: 'once', name: `Credit contract ${d.numar}` }) });
    const cj = await c.json();
    if (c.ok && cj.id) body.discounts = { 0: { coupon: cj.id } };
  }
  // v5.1: planul tranșelor se fixează în bază înainte de prima plată (transe_plan); fără el, tranșele următoare nu s-ar mai cere singure
  if (T.transe.length > 1) await fixeazaPlan(d).catch(() => null);
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error((j.error && j.error.message) || 'stripe: sesiune nereușită');
  return { url: j.url, id: j.id };
}

// planul tranșelor în bază (SQL 57, transe_plan): o singură dată pe contract; cheia de serviciu stă doar în Vercel (SUPABASE_SERVICE_KEY)
export async function fixeazaPlan(d, f = fetch) {
  const plan = planTranse(d);
  if (plan.length < 2) return { ok: true, integral: true };
  const SB = process.env.SUPABASE_URL; const SERV = process.env.SUPABASE_SERVICE_KEY;
  if (!SB || !SERV) throw new Error('lipsește SUPABASE_SERVICE_KEY');
  const r = await f(`${SB}/rest/v1/rpc/transe_plan`, { method: 'POST', headers: { apikey: SERV, Authorization: `Bearer ${SERV}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_contract_id: d.id, p_transe: plan }) });
  if (!r.ok) throw new Error('transe_plan: ' + r.status);
  return r.json();
}

// o tranșă (pagina /t/<token>): plată unică, cu TVA dacă AleSign e plătitor; metadata leagă sesiunea de tranșă
export async function sesiuneTransa(tr, { host, f = fetch }) {
  if (!stripeConfigurat()) throw new Error('stripe neconfigurat');
  const suma = Math.round(Number(tr.suma || 0) * (1 + Number(tr.tva_procent || 0) / 100) * 100) / 100;
  const base = `https://${host}/t/${tr.token}`;
  const body = { mode: 'payment', success_url: `${base}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${base}?anulat=1`, client_reference_id: `transa-${tr.id}`, customer_email: tr.email || undefined, locale: 'ro',
    metadata: { transa_id: String(tr.id), contract_id: String(tr.contract_id), numar: tr.contract || '' },
    payment_intent_data: { metadata: { transa_id: String(tr.id), contract_id: String(tr.contract_id) } },
    line_items: { 0: { quantity: 1, price_data: { currency: 'ron', unit_amount: bani(suma), product_data: { name: `AleSign&Co · tranșa ${tr.nr} din ${tr.din}`, description: `Contract ${tr.contract}${Number(tr.tva_procent) > 0 ? ', cu TVA' : ''}` } } } } };
  const r = await f('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error((j.error && j.error.message) || 'stripe: sesiune nereușită');
  return { url: j.url, id: j.id, suma };
}

// la întoarcerea din Stripe: sesiunea se verifică pe server (plătită, aceeași tranșă, aceeași sumă), nu pe cuvântul browserului
export async function verificaSesiuneTransa(sessionId, tr, f = fetch) {
  if (!stripeConfigurat() || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(String(sessionId || ''))) return { ok: false, motiv: 'sesiune invalidă' };
  const r = await f(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${KEY()}` } });
  const j = await r.json();
  if (!r.ok) return { ok: false, motiv: 'stripe ' + r.status };
  const suma = Math.round(Number(tr.suma || 0) * (1 + Number(tr.tva_procent || 0) / 100) * 100);
  const ok = j.payment_status === 'paid' && j.metadata && j.metadata.transa_id === String(tr.id) && Number(j.amount_total) === suma && String(j.currency).toLowerCase() === 'ron';
  return { ok, ref: j.payment_intent || j.id, motiv: ok ? null : 'sesiunea nu e plătită sau nu e a acestei tranșe' };
}

// Care din luna 4 (SQL 68, G4): abonament lunar Stripe; prima plată la începutul lunii 4 (trial_end), dacă e la cel puțin 2 zile; altfel, de azi
export async function sesiuneCare(c, { host, f = fetch, acum = Date.now() }) {
  if (!stripeConfigurat()) throw new Error('stripe neconfigurat');
  const suma = Math.round(Number(c.suma || 0) * (1 + Number(c.tva_procent || 0) / 100) * 100) / 100;
  const base = `https://${host}/care/${c.token}`;
  const start = c.de_la ? Math.floor(new Date(`${c.de_la}T08:00:00Z`).getTime() / 1000) : 0;
  const meta = { care_sarcina_id: String(c.id), contract_id: String(c.contract_id), numar: c.contract || '' };
  const body = { mode: 'subscription', success_url: `${base}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${base}?anulat=1`, client_reference_id: `care-${c.id}`, customer_email: c.email || undefined, locale: 'ro', metadata: meta,
    subscription_data: { metadata: meta, ...(start * 1000 - acum > 2 * 864e5 ? { trial_end: start } : {}) },
    line_items: { 0: { quantity: 1, price_data: { currency: 'ron', unit_amount: bani(suma), recurring: { interval: 'month' }, product_data: { name: 'AleSign&Co · Care pentru site', description: `Contract ${c.contract || ''}: găzduire, monitorizare, revenire automată, actualizări${Number(c.tva_procent) > 0 ? ', cu TVA' : ''}` } } } } };
  const r = await f('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error((j.error && j.error.message) || 'stripe: sesiune nereușită');
  return { url: j.url, id: j.id, suma, trial: !!body.subscription_data.trial_end };
}

// la întoarcere: sesiunea de abonament e completă și e a acestui Care (metadata), verificată pe server
export async function verificaSesiuneCare(sessionId, c, f = fetch) {
  if (!stripeConfigurat() || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(String(sessionId || ''))) return { ok: false, motiv: 'sesiune invalidă' };
  const r = await f(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${KEY()}` } });
  const j = await r.json();
  if (!r.ok) return { ok: false, motiv: 'stripe ' + r.status };
  const ok = j.mode === 'subscription' && j.status === 'complete' && !!j.subscription && j.metadata && j.metadata.care_sarcina_id === String(c.id);
  return { ok, ref: j.subscription || null, motiv: ok ? null : 'sesiunea nu e completă sau nu e a acestui Care' };
}
