// Arhiva build-ului publicat (Bot Website v5.1, V4): fișierele statice ale site-ului într-un .tar (ustar, fără dependențe),
// urcat în bucket-ul privat „arhiva-site” la <proiect>/<build>.tar. Din el se reface oricând site-ul (revenire, restaurare pe preview, export la plecare).
const BLOC = 512;
const octal = (n, lung) => n.toString(8).padStart(lung - 1, '0') + '\0';

export function tar(fisiere) {
  const parti = [];
  for (const f of fisiere) {
    const date = Buffer.isBuffer(f.date) ? f.date : Buffer.from(String(f.date));
    const nume = Buffer.from(f.cale, 'utf8');
    if (nume.length > 255) throw new Error('cale prea lungă pentru tar: ' + f.cale);
    const h = Buffer.alloc(BLOC, 0);
    // numele în câmpul „name” (100) sau împărțit cu „prefix” (155) la un „/”
    let n = f.cale, pre = '';
    if (nume.length > 100) { const i = f.cale.lastIndexOf('/', 155); pre = f.cale.slice(0, i); n = f.cale.slice(i + 1); }
    h.write(n, 0, 100, 'utf8');
    h.write(octal(0o644, 8), 100, 8, 'ascii'); h.write(octal(0, 8), 108, 8, 'ascii'); h.write(octal(0, 8), 116, 8, 'ascii');
    h.write(octal(date.length, 12), 124, 12, 'ascii'); h.write(octal(0, 12), 136, 12, 'ascii');
    h.write('        ', 148, 8, 'ascii'); h.write('0', 156, 1, 'ascii'); h.write('ustar\0', 257, 6, 'ascii'); h.write('00', 263, 2, 'ascii');
    if (pre) h.write(pre, 345, 155, 'utf8');
    let suma = 0; for (const b of h) suma += b;
    h.write(suma.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    parti.push(h, date, Buffer.alloc((BLOC - (date.length % BLOC)) % BLOC, 0));
  }
  parti.push(Buffer.alloc(BLOC * 2, 0));
  return Buffer.concat(parti);
}

export function untar(buf) {
  const out = []; let i = 0;
  while (i + BLOC <= buf.length) {
    const h = buf.subarray(i, i + BLOC);
    if (h.every((b) => b === 0)) break;
    const sir = (a, b) => h.subarray(a, b).toString('utf8').replace(/\0.*$/s, '');
    const lung = parseInt(sir(124, 136).trim() || '0', 8);
    const pre = sir(345, 500); const nume = pre ? `${pre}/${sir(0, 100)}` : sir(0, 100);
    i += BLOC;
    if (sir(156, 157) === '0' || sir(156, 157) === '') out.push({ cale: nume, date: Buffer.from(buf.subarray(i, i + lung)) });
    i += Math.ceil(lung / BLOC) * BLOC;
  }
  return out;
}

// urcă arhiva (cheia de serviciu) și o citește înapoi; calea e determinată de proiect și build, deci aceeași publicare nu dublează arhiva
export async function arhiveaza({ sb, cheie, proiect, build, fisiere, f = fetch }) {
  const cale = `${proiect}/${build}.tar`;
  const corp = tar(fisiere);
  const r = await f(`${sb}/storage/v1/object/arhiva-site/${cale}`, { method: 'POST', headers: { apikey: cheie, Authorization: `Bearer ${cheie}`, 'Content-Type': 'application/x-tar', 'x-upsert': 'true' }, body: corp });
  if (!r.ok) throw new Error('arhiva: storage ' + r.status);
  return { cale, octeti: corp.length, fisiere: fisiere.length };
}
export async function citesteArhiva({ sb, cheie, cale, f = fetch }) {
  const r = await f(`${sb}/storage/v1/object/arhiva-site/${cale}`, { headers: { apikey: cheie, Authorization: `Bearer ${cheie}` } });
  if (!r.ok) throw new Error('arhiva: citire ' + r.status);
  return untar(Buffer.from(await r.arrayBuffer()));
}
