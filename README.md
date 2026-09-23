# AleSign · Mostra vie (demo per lead)

O singură aplicație Vercel care randează site-ul demo al fiecărui lead din tabelul `siteuri` (Supabase).
`demo.alesign.net/<slug>` → citește rândul cu slug-ul respectiv → HTML gata, în ~50 ms. Fără build per lead.

## Publicare
1. Urcă folderul într-un repo GitHub privat `alesign-demo`.
2. Vercel → Add New → Project → importă repo-ul (Framework: Other).
3. Environment Variables: `SUPABASE_URL`, `SUPABASE_KEY` (cheia publishable, nu secret).
4. Deploy. Test: `https://<proiect>.vercel.app/<slug>`.
5. Domeniu: Vercel → Settings → Domains → `demo.alesign.net`; în Bluehost, CNAME `demo` → `cname.vercel-dns.com`.

Pozele din `public/poze` sunt de pe Pexels (licență Pexels, uz comercial permis). Creditele sunt în `public/poze/credite.json`.
