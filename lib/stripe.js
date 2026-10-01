// Stripe Checkout, fără SDK: un POST form-encoded. Cheia secretă stă doar în Vercel (STRIPE_SECRET_KEY).
// v2: o sesiune cu mai multe linii: abonamentul (lunar sau anual) + serviciile plătite o dată (+ creditul ca reducere).
import { totaluri } from './contract-text.js';

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
  if (T.unic > 0) {
    items.push({ quantity: 1, price_data: { currency: 'ron', unit_amount: bani(tva(T.unic)), product_data: { name: `AleSign&Co · servicii o dată`, description: `Contract ${d.numar}: ${T.linii.filter((l) => !l.recurent && ['pachet', 'modul', 'custom'].includes(l.tip)).map((l) => l.nume).join(', ').slice(0, 300)}` } } });
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
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error((j.error && j.error.message) || 'stripe: sesiune nereușită');
  return { url: j.url, id: j.id };
}
