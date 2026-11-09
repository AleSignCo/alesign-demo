#!/usr/bin/env python3
"""Calculează `size-adjust` pentru fonturile de rezervă ale șablonului (P2: schimbarea de font nu mai mută textul).

Pentru fiecare familie din NISE (lib/sablon.js) compară lățimea medie a literelor, pe un text românesc, cu fonturile pe care le au
dispozitivele: Arial / Liberation Sans (Windows, macOS, iOS, Linux), Roboto (Android), DejaVu Sans (Linux); la serife: Times New Roman /
Liberation Serif, Noto Serif (Android), DejaVu Serif. Rezultatul se lipește în lib/sablon.js, la REZERVE.

  pip install fonttools brotli && python3 unelte/fonturi-rezerva.py
Fonturile web și Roboto / Noto Serif vin de la fontsource (jsDelivr); Liberation și DejaVu din sistem (metric identice cu Arial / Times New Roman).
"""
import io, json, re, sys, unicodedata, urllib.request, os
from fontTools.ttLib import TTFont

TEXT = """La Cabinet Dr. Radu aveti timp real cu medicul: 30 de minute pentru consultatia de medicina generala, explicatii clare si un plan de
tratament explicat pas cu pas. Programarile se fac doar prin telefon. Sunati acum sau scrieti-ne. Serviciile cabinetului, cu pretul fiecaruia.
De ce noi. Cum lucram. Intrebari frecvente. Povestea noastra incepe in Bucuresti, cu o echipa mica si cu clienti care revin. Pret: 250 lei.
Luni - Vineri 09:00 - 18:00, Sambata 09:00 - 13:00. Va asteptam cu drag. Contact: +40 744 387 384."""
FAMILII = {  # id fontsource: (nume, tip, greutatea „normal”, greutatea „gros”)
    'fraunces': ('Fraunces', 'serif', 500, 600), 'inter': ('Inter', 'sans', 400, 600), 'cormorant-garamond': ('Cormorant Garamond', 'serif', 500, 600),
    'jost': ('Jost', 'sans', 400, 600), 'forum': ('Forum', 'serif', 400, 400), 'manrope': ('Manrope', 'sans', 400, 600),
    'playfair-display': ('Playfair Display', 'serif', 500, 600), 'source-sans-3': ('Source Sans 3', 'sans', 400, 600), 'space-grotesk': ('Space Grotesk', 'sans', 500, 600),
}
SIS = '/usr/share/fonts/truetype'
REZ = {
    'sans': [('arial', f'{SIS}/liberation/LiberationSans-Regular.ttf', f'{SIS}/liberation/LiberationSans-Bold.ttf'), ('roboto', 'cdn:roboto:400', 'cdn:roboto:700'), ('dejavu', f'{SIS}/dejavu/DejaVuSans.ttf', f'{SIS}/dejavu/DejaVuSans-Bold.ttf')],
    'serif': [('times', f'{SIS}/liberation/LiberationSerif-Regular.ttf', f'{SIS}/liberation/LiberationSerif-Bold.ttf'), ('noto', 'cdn:noto-serif:400', 'cdn:noto-serif:700'), ('dejavu', f'{SIS}/dejavu/DejaVuSerif.ttf', f'{SIS}/dejavu/DejaVuSerif-Bold.ttf')],
}
CACHE = os.environ.get('FONT_CACHE', '/tmp/fonturi')

def cdn(fid, g):
    os.makedirs(CACHE, exist_ok=True); f = f'{CACHE}/{fid}-{g}.woff2'
    if not os.path.exists(f):
        with urllib.request.urlopen(f'https://cdn.jsdelivr.net/fontsource/fonts/{fid}@latest/latin-{g}-normal.woff2') as r: open(f, 'wb').write(r.read())
    return f

def zero(cale):
    """lățimea cifrei 0 în em: unitatea CSS `ch` a fontului (șablonul scrie lățimile de text în em × această valoare, ca să nu depindă de fontul de rezervă)"""
    if cale.startswith('cdn:'): _, fid, g = cale.split(':'); cale = cdn(fid, g)
    f = TTFont(cale); return round(f['hmtx'][f.getBestCmap()[ord('0')]][0] / f['head'].unitsPerEm, 3)

def latime(cale):
    if cale.startswith('cdn:'): _, fid, g = cale.split(':'); cale = cdn(fid, g)
    f = TTFont(cale); cmap = f.getBestCmap(); hmtx = f['hmtx']; upm = f['head'].unitsPerEm
    t = [c for c in TEXT if c != '\n']; tot = 0
    for c in t:
        g = cmap.get(ord(c)) or cmap.get(ord(' ')); tot += hmtx[g][0]
    return tot / len(t) / upm

out = {}
for fid, (nume, tip, gn, gb) in FAMILII.items():
    wn, wb = latime(f'cdn:{fid}:{gn}'), latime(f'cdn:{fid}:{gb}')
    out[nume] = {'tip': tip, 'zero': {'n': zero(f'cdn:{fid}:{gn}'), 'b': zero(f'cdn:{fid}:{gb}')}, 'n': {k: round(100 * wn / latime(r), 1) for k, r, _ in REZ[tip]}, 'b': {k: round(100 * wb / latime(b), 1) for k, _, b in REZ[tip]}}
print('const REZERVE = ' + json.dumps(out, ensure_ascii=False).replace('"', "'") + ';')
