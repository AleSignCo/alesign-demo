// Testele adresei pe bucăți la persoane fizice (15 nov. 2026): node teste/test-adresa.mjs
// Verifică regula din lib/adresa.js, formularul din pagina de contract și ce trimite serverul mai departe la semnare.
process.env.SUPABASE_URL = 'https://test.invalid';
process.env.SUPABASE_KEY = 'cheie-de-test';
const { JUDETE, judetCurat, sectorDin, compuneAdresa, desfaceAdresa } = await import('../lib/adresa.js');
const { randeazaContract } = await import('../lib/contract.js');
const { default: semneaza } = await import('../api/semneaza.js');

let n = 0, picate = 0;
const t = (nume, ok, detaliu = '') => { n++; if (!ok) picate++; console.log(`${ok ? 'trece' : 'PICĂ '} ${nume}${detaliu ? ' · ' + detaliu : ''}`); };

// 1. lista de județe
t('1 lista: 41 de județe și București, fără dubluri', JUDETE.length === 42 && new Set(JUDETE).size === 42 && JUDETE.includes('București') && JUDETE.includes('Ilfov'));
t('1 județul se recunoaște și fără diacritice, cu „jud.” sau cu majuscule', judetCurat('iasi') === 'Iași' && judetCurat('jud. Timis') === 'Timiș' && judetCurat('JUDEȚUL CLUJ') === 'Cluj' && judetCurat('Municipiul București') === 'București' && judetCurat('Satu Mare') === 'Satu Mare');
t('1 un județ care nu există nu trece', judetCurat('Transilvania') === '' && judetCurat('') === '' && judetCurat(null) === '');
t('1 sectorul: „Sector 3”, „sectorul 3”, „s3”, „3”', sectorDin('Sector 3') === 3 && sectorDin('sectorul 3') === 3 && sectorDin('s3') === 3 && sectorDin(' 3 ') === 3);
t('1 sectorul: 7, 0, text liber sau gol nu trec', sectorDin('Sector 7') === 0 && sectorDin('0') === 0 && sectorDin('Titan') === 0 && sectorDin('') === 0 && sectorDin('Sector 3 bis') === 0);

// 2. compunerea rândului
const a1 = compuneAdresa({ strada: 'Str. Păcurari nr. 10, bl. A, ap. 5', localitate: 'Iași', judet: 'Iași' });
t('2 în țară: „strada, localitatea, jud. județul”', a1.ok && a1.adresa === 'Str. Păcurari nr. 10, bl. A, ap. 5, Iași, jud. Iași', a1.adresa);
const a2 = compuneAdresa({ strada: 'Bd. Decebal 14', localitate: 'sectorul 3', judet: 'bucuresti' });
t('2 București: „strada, Sector N, București”', a2.ok && a2.adresa === 'Bd. Decebal 14, Sector 3, București' && a2.localitate === 'Sector 3', a2.adresa);
t('2 București fără sector: cerut pe nume', compuneAdresa({ strada: 'Bd. Decebal 14', localitate: 'București', judet: 'București' }).motiv === 'sector lipsa');
t('2 fără stradă, fără localitate sau cu județ greșit: adresă lipsă', compuneAdresa({ strada: '', localitate: 'Iași', judet: 'Iași' }).motiv === 'adresa lipsa' && compuneAdresa({ strada: 'Str. X 1', localitate: '', judet: 'Iași' }).motiv === 'adresa lipsa' && compuneAdresa({ strada: 'Str. X 1', localitate: 'Iași', judet: 'Moldova' }).motiv === 'adresa lipsa' && compuneAdresa().motiv === 'adresa lipsa');
const a3 = compuneAdresa({ strada: '  Str. Lungă nr. 2,  ', localitate: 'Vama, sat', judet: 'jud. Suceava' });
t('2 virgulele din localitate și de la capătul străzii nu strică rândul', a3.ok && a3.adresa === 'Str. Lungă nr. 2, Vama sat, jud. Suceava', a3.adresa);
t('2 rândul încape în câmpul din contract (300 de caractere)', compuneAdresa({ strada: 'x'.repeat(500), localitate: 'y'.repeat(500), judet: 'Bistrița-Năsăud' }).adresa.length <= 300);

// 3. desfacerea rândului: ce a compus serverul se citește la loc întocmai
for (const [st, loc, jd] of [['Str. Păcurari nr. 10, bl. A, ap. 5', 'Iași', 'Iași'], ['Calea Dorobanților 1', 'Sector 1', 'București'], ['Str. Unirii 3', 'Târgu Mureș', 'Mureș'], ['Principală 44', 'Vama', 'Satu Mare'], ['Str. 1 Decembrie 1918 nr. 7', 'Reșița', 'Caraș-Severin']]) {
  const c = compuneAdresa({ strada: st, localitate: loc, judet: jd }); const d = desfaceAdresa(c.adresa);
  t(`3 dus-întors: ${loc}, ${jd}`, !!d && d.strada === st && d.localitate === (jd === 'București' ? loc : loc) && d.judet === jd, c.adresa);
}
let dusIntors = 0; const LOC = ['Iași', 'Cluj-Napoca', 'Sfântu Gheorghe', 'Baia Mare', 'Vama', 'Piatra Neamț'];
for (const jd of JUDETE) for (const loc of LOC) { const c = compuneAdresa({ strada: 'Str. Florilor nr. 3, ap. 2', localitate: jd === 'București' ? 'Sector 4' : loc, judet: jd }); const d = desfaceAdresa(c.adresa); if (c.ok && d && d.judet === jd && d.strada === 'Str. Florilor nr. 3, ap. 2' && d.localitate === (jd === 'București' ? 'Sector 4' : loc)) dusIntors++; }
t('3 dus-întors pe toate județele', dusIntors === JUDETE.length * LOC.length, `${dusIntors} din ${JUDETE.length * LOC.length}`);
t('3 o adresă veche, scrisă liber, nu se ghicește', desfaceAdresa('Strada Florilor 3, Iași') === null && desfaceAdresa('Iași') === null && desfaceAdresa('') === null && desfaceAdresa(null) === null && desfaceAdresa('Str. X 1, Iași, jud. Moldova') === null);
t('3 se citește și „județul”, și fără diacritice', desfaceAdresa('Str. X 1, Iasi, judetul Iasi')?.judet === 'Iași' && desfaceAdresa('Str. X 1, sector 2, Bucuresti')?.localitate === 'Sector 2');

// 4. formularul din pagina de contract
const baza = { slug: 'abcdef1234567890', status: 'trimis', tip: 'proiect', linii: [], prestator: {}, client: {} };
let paginaPf = '', paginaFirma = '', eroare = '';
try { paginaPf = randeazaContract({ ...baza, client_tip: 'persoana_fizica', client: { denumire: 'Ana Pop', adresa: 'Str. Florilor nr. 3, Vama, jud. Suceava' } }); paginaFirma = randeazaContract({ ...baza, client_tip: 'firma' }); } catch (e) { eroare = String(e && e.message); }
t('4 pagina de contract se randează', !eroare && paginaPf.length > 1000, eroare);
t('4 persoană fizică: stradă, localitate și județ, toate obligatorii; fără câmpul vechi', /name="strada" required/.test(paginaPf) && /name="localitate" required/.test(paginaPf) && /<select id="judet" name="judet" required/.test(paginaPf) && !/name="adresa"/.test(paginaPf));
t('4 persoană fizică: lista are toate județele', (paginaPf.match(/<option value="[^"]+"/g) || []).length === 42);
t('4 persoană fizică: o adresă salvată se așază la loc pe câmpuri', /name="strada"[^>]*value="Str\. Florilor nr\. 3"/.test(paginaPf) && /name="localitate"[^>]*value="Vama"/.test(paginaPf) && /<option value="Suceava" selected>/.test(paginaPf));
t('4 firmă: formularul rămâne cum era (un rând de adresă, fără listă de județe)', /name="adresa" required/.test(paginaFirma) && !/name="judet"/.test(paginaFirma) && !/name="strada"/.test(paginaFirma));

// 5. serverul: ce pleacă spre baza de date la semnare
const cheamari = [];
globalThis.fetch = async (url, o) => { cheamari.push({ url: String(url), body: o && o.body ? JSON.parse(o.body) : null }); return { ok: true, status: 200, text: async () => JSON.stringify({ id: 1, numar: 'T-1', lead_id: 9000 }), json: async () => ({}) }; };
const cere = async (client, extra = {}) => { cheamari.length = 0; let cod = 0, corp = null; const res = { status: (c) => { cod = c; return res; }, json: (j) => { corp = j; return res; } };
  await semneaza({ method: 'POST', headers: { host: 'demo.alesign.net' }, body: { slug: 'abcdef1234567890', nume: 'Ana Pop', plata_mod: 'transfer', acord: true, client, ...extra } }, res);
  return { cod, corp, rpc: cheamari.find((x) => /rpc\/semneaza_contract/.test(x.url)) }; };
const s1 = await cere({ tip: 'persoana_fizica', denumire: 'Ana Pop', email: 'ana@exemplu.ro', strada: 'Str. Florilor nr. 3', localitate: 'Vama', judet: 'Suceava' });
t('5 persoană fizică: serverul trimite rândul compus', s1.cod === 200 && s1.rpc && s1.rpc.body.p_client.adresa === 'Str. Florilor nr. 3, Vama, jud. Suceava', JSON.stringify(s1.rpc && s1.rpc.body.p_client));
t('5 bucățile nu ajung în baza de date ca și câmpuri noi', s1.rpc && !('strada' in s1.rpc.body.p_client) && !('localitate' in s1.rpc.body.p_client) && !('judet' in s1.rpc.body.p_client));
const s2 = await cere({ tip: 'persoana_fizica', denumire: 'Ana Pop', email: 'ana@exemplu.ro', strada: 'Bd. Decebal 14', localitate: 'Titan', judet: 'București' });
t('5 București fără sector: oprit înainte de baza de date, cu motiv', s2.cod === 400 && s2.corp.motiv === 'sector lipsa' && !s2.rpc);
const s3 = await cere({ tip: 'persoana_fizica', denumire: 'Ana Pop', email: 'ana@exemplu.ro', strada: 'Str. X 1', localitate: 'Iași', judet: '' });
t('5 fără județ: oprit, cu motiv', s3.cod === 400 && s3.corp.motiv === 'adresa lipsa' && !s3.rpc);
const s4 = await cere({ tip: 'persoana_fizica', denumire: 'Ana Pop', email: 'ana@exemplu.ro', adresa: 'Strada Veche 1, Iași' });
t('5 formular vechi (doar „adresa”): trece cum a scris omul', s4.cod === 200 && s4.rpc && s4.rpc.body.p_client.adresa === 'Strada Veche 1, Iași');
const s5 = await cere({ tip: 'firma', denumire: 'SC Exemplu SRL', cui: 'RO123', email: 'a@firma.ro', adresa: 'Str. Sediului 2, Cluj-Napoca, Cluj', strada: 'altceva', localitate: 'x', judet: 'Iași' });
t('5 firmă: adresa rămâne cea scrisă, bucățile se ignoră', s5.cod === 200 && s5.rpc && s5.rpc.body.p_client.adresa === 'Str. Sediului 2, Cluj-Napoca, Cluj');

console.log(`\n${n - picate} din ${n} trec`);
process.exit(picate ? 1 : 0);
