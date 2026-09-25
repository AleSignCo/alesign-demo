// Stripe Checkout, fără SDK: un POST form-encoded. Cheia secretă stă doar în Vercel (STRIPE_SECRET_KEY).
import { pret } from './contract-text.js';

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

// d = contract_date(slug); returnează { url } sau aruncă
export async function sesiuneCheckout(d, { slug, host }) {
  if (!stripeConfigurat()) throw new Error('stripe neconfigurat');
  const pr = pret(d);
  const abon = d.tip === 'abonament';
  const suma = Math.round(pr.total * 100);
  const base = `https://${host}/c/${slug}`;
  const body = {
    mode: abon ? 'subscription' : 'payment',
    success_url: `${base}?platit=1`,
    cancel_url: `${base}?anulat=1#plata`,
    client_reference_id: String(d.id),
    customer_email: (d.client || {}).email || undefined,
    locale: 'ro',
    metadata: { contract_id: String(d.id), slug, numar: d.numar || '' },
    line_items: { 0: { quantity: 1, price_data: { currency: 'ron', unit_amount: suma, product_data: { name: `AleSign&Co · ${d.pachet_nume}`, description: abon ? `Abonament lunar, contract ${d.numar}` : `Contract ${d.numar}` }, ...(abon ? { recurring: { interval: 'month' } } : {}) } } },
    ...(abon ? { subscription_data: { metadata: { contract_id: String(d.id), slug, numar: d.numar || '' } } } : { payment_intent_data: { metadata: { contract_id: String(d.id), slug } } }),
    ...(pr.platitor ? {} : {}),
  };
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error((j.error && j.error.message) || 'stripe: sesiune nereușită');
  return { url: j.url, id: j.id };
}
