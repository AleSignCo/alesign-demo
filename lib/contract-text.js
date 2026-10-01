// Contractul de prestări servicii AleSign&Co · șablon v2 (01.10.2026): linii multiple, totaluri separate, credite,
// buget de reclame, plată anuală (preț înghețat), indexare anuală, prima lună fără risc.
// Un singur text, folosit și de pagina /c/<slug> (HTML) și de PDF. Variabilele vin din contracte + setari.
// De verificat de un avocat înainte de primul client real. Nu e consultanță juridică.

const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }) : '');
const gol = (v, alt = '[de completat]') => (v && String(v).trim() ? String(v).trim() : alt);

// Liniile contractului (din contracte.linii). Contractele vechi (fără linii) primesc o singură linie din pachet_nume + pret.
export function linii(d) {
  const L = Array.isArray(d.linii) && d.linii.length ? d.linii : [{ tip: 'pachet', cod: d.pachet_cod, nume: d.pachet_nume, cantitate: 1, pret_unitar: Number(d.pret || 0), recurent: d.tip === 'abonament', total: Number(d.pret || 0) }];
  return L.map((l) => {
    const cant = Number(l.cantitate || 1), pu = Number(l.pret_unitar || 0), total = l.total != null ? Number(l.total) : pu * cant;
    const unit = l.unitate === 'zi' ? 'zi' : l.unitate === 'ora' ? 'oră' : l.unitate === 'buc' ? 'buc' : null;
    let afis;
    if (l.tip === 'conditie') afis = l.cod === 'care_luna_4' ? `${nr(pu)} RON / lună, din luna 4` : l.nota || '';
    else if (l.tip === 'inclus') afis = 'inclus, 0 RON';
    else if (l.tip === 'asteptare') afis = 'listă de așteptare, 0 RON';
    else if (l.tip === 'credit') afis = `${nr(total)} RON, o dată`;
    else afis = `${cant > 1 ? `${cant} ${unit || 'buc'} × ${nr(pu)} = ` : ''}${nr(total)} RON${l.recurent ? ' / lună' : ', o dată'}`;
    return { ...l, cantitate: cant, pret_unitar: pu, total, afis };
  });
}

export function totaluri(d) {
  const L = linii(d);
  const lunar = d.total_lunar != null ? Number(d.total_lunar) : L.filter((l) => l.recurent && ['pachet', 'modul', 'custom'].includes(l.tip)).reduce((s, l) => s + l.total, 0);
  const unic = d.total_unic != null ? Number(d.total_unic) : L.filter((l) => !l.recurent && ['pachet', 'modul', 'custom', 'credit'].includes(l.tip)).reduce((s, l) => s + l.total, 0);
  const anual = d.plata_anual && d.total_anual ? Number(d.total_anual) : null;
  const platitor = String((d.prestator || {}).platitor_tva) === 'true';
  const tva = platitor ? Number(d.tva_procent || 21) : 0;
  const cuTva = (p) => (platitor ? Math.round(p * (1 + tva / 100) * 100) / 100 : p);
  // prima plată: anual → total anual + o dată; lunar → prima lună + o dată; unic → o dată
  const prima = (anual != null ? anual : lunar) + unic;
  return { linii: L, lunar, unic, anual, platitor, tva, prima, primaCuTva: cuTva(prima), lunarCuTva: cuTva(lunar), unicCuTva: cuTva(unic), anualCuTva: anual != null ? cuTva(anual) : null };
}

// Compatibil cu codul vechi (stripe.js, contract.js): „prețul” = prima plată.
export function pret(d) {
  const t = totaluri(d);
  const per = d.tip === 'abonament' ? (t.anual != null ? 'an' : 'lună') : 'o dată';
  const baza = d.tip === 'abonament' ? (t.anual != null ? t.anual : t.lunar) : t.unic;
  return { baza, tva: t.tva, total: t.primaCuTva, platitor: t.platitor, per, prima: t.prima,
    text: t.platitor ? `${nr(baza)} RON + TVA ${t.tva}% / ${per}` : `${nr(baza)} RON / ${per} (neplătitor de TVA)` };
}

export function clauze(d) {
  const P = d.prestator || {};
  const C = d.client || {};
  const t = totaluri(d);
  const abon = d.tip === 'abonament';
  const min = Number(d.perioada_minima_luni || 0);
  const moduri = Array.isArray(d.plata_moduri) && d.plata_moduri.length ? d.plata_moduri : ['card', 'transfer'];
  const cuCard = moduri.includes('card') && String(d.stripe_activ) === 'true';
  const cum = cuCard ? 'cu cardul (prin Stripe) sau prin transfer bancar în maximum 5 zile lucrătoare de la semnare' : 'prin transfer bancar, în maximum 5 zile lucrătoare de la semnare';
  const idx = Number(d.indexare_procent || 10);
  const ani = Number(d.anual_inghetat_ani || 2);
  const tvaNota = t.platitor ? '' : ' AleSign nu este plătitor de TVA la data semnării; dacă devine, TVA se adaugă conform legii, cu notificare prealabilă.';
  const credite = t.linii.filter((l) => l.tip === 'credit');
  const buget = t.linii.find((l) => l.tip === 'conditie' && l.cod === 'buget_reclame');
  const careL4 = t.linii.find((l) => l.tip === 'conditie' && l.cod === 'care_luna_4');
  const asteptare = t.linii.filter((l) => l.tip === 'asteptare');
  const abonNume = d.abonament_nume || (abon ? d.pachet_nume : '');

  const pretP = [];
  if (abon) {
    pretP.push(`Abonamentul costă ${nr(t.lunar)} RON pe lună${t.platitor ? ` plus TVA ${t.tva}%` : ''}${t.unic > 0 ? `, la care se adaugă serviciile plătite o singură dată, în valoare totală de ${nr(t.unic)} RON${t.platitor ? ' plus TVA' : ''}` : t.unic < 0 ? `, din care se scade creditul de ${nr(-t.unic)} RON, o singură dată, pe prima factură` : ''}.${tvaNota}`);
    if (t.anual != null) pretP.push(`Clientul a ales plata anuală: ${nr(t.anual)} RON pe an${t.platitor ? ' plus TVA' : ''}, adică 12 luni cu o reducere de ${nr(Math.round(100 - (t.anual / (t.lunar * 12)) * 100))}% față de plata lunară, plătiți în avans. Prețul abonamentului rămâne neschimbat ${ani} ani de la data activării${d.pret_inghetat_pana ? ` (până pe ${dataRo(d.pret_inghetat_pana)})` : ''}, iar indexarea de la articolul 4.6 nu se aplică în această perioadă.`);
    else pretP.push(`Plata se face în avans, lunar. Prima lună${t.unic > 0 ? ', împreună cu serviciile plătite o dată,' : ''} se plătește ${cum}. Lunile următoare se plătesc la aceeași zi a fiecărei luni${cuCard ? ': automat, dacă s-a ales cardul, sau pe baza facturii, în 5 zile lucrătoare de la emitere, dacă s-a ales transferul' : ', pe baza facturii, în 5 zile lucrătoare de la emitere'}.`);
  } else {
    pretP.push(`Prețul serviciilor este de ${nr(t.unic)} RON${t.platitor ? ` plus TVA ${t.tva}%` : ''}, plătit o singură dată.${tvaNota}`);
    pretP.push(`Plata se face integral, ${cum}. Lucrul începe în ziua în care plata este confirmată.`);
  }
  pretP.push(`Prima plată este de ${nr(t.prima)} RON${t.platitor ? ` plus TVA, adică ${nr(t.primaCuTva)} RON` : ''}.`);
  if (credite.length) pretP.push(`Creditele din Anexa 1 (${credite.map((l) => `${l.nume}: ${nr(-l.total)} RON`).join('; ')}) se scad o singură dată, din prima factură, și nu se restituie în bani.`);
  if (careL4) pretP.push(`Din a 4-a lună de la publicarea site-ului, Clientul intră automat în serviciul Care (viteză, securitate, actualizări, backup), ${nr(careL4.pret_unitar)} RON pe lună, plătit lunar, pe bază de factură, cu posibilitatea de a renunța oricând cu preaviz de 30 de zile. Dacă între timp Clientul ia un abonament, Care este inclus în el.`);
  if (buget) pretP.push(`Bugetul de reclame nu este inclus în prețurile de mai sus: este al Clientului, se plătește de Client direct platformelor (Meta, Google, TikTok) și este de minimum ${nr(d.buget_reclame_min || 1500)} RON pe lună pentru fiecare lună cu campanii active. Fără buget, campaniile nu pot rula, iar restul serviciilor continuă normal.`);
  pretP.push(`Pentru fiecare plată AleSign emite factură, transmisă pe email și, unde legea o cere, prin sistemul național e-Factura.`);
  pretP.push(`Dacă o plată întârzie mai mult de 10 zile, AleSign poate suspenda serviciile până la plată, cu o notificare pe email. Dacă întârzie mai mult de 30 de zile, AleSign poate înceta contractul, iar sumele datorate pentru perioada minimă rămân scadente.`);
  if (abon) pretP.push(`4.6. Prețul abonamentului se indexează cu ${idx}% o dată pe an, la fiecare aniversare a datei activării, cu o notificare pe email cu 30 de zile înainte${t.anual != null ? ', după perioada cu preț înghețat' : ''}.`);

  const durataP = abon
    ? [
        `Contractul intră în vigoare la data primei plăți („data activării”) și se încheie pe o perioadă minimă de ${min} ${min === 1 ? 'lună' : 'luni'}. După perioada minimă, se prelungește automat, lună de lună, până când una dintre părți îl încetează cu un preaviz de 30 de zile, transmis pe email.`,
        d.prima_luna_fara_risc
          ? `Prima lună fără risc: în primele 30 de zile de la activare, Clientul poate înceta contractul printr-un simplu email, fără motiv și fără alte sume de plată. În acest caz perioada minimă nu se mai aplică, plata primei luni rămâne făcută, iar materialele livrate în această lună rămân ale Clientului. ${t.anual != null ? ' La plata anuală, AleSign restituie în 10 zile lucrătoare diferența dintre suma plătită și prețul unei luni la tarif lunar.' : ''} După ziua 30, se aplică perioada minimă de mai sus.`
          : `Clientul poate încheia contractul înainte de finalul perioadei minime doar plătind lunile rămase din perioada minimă.`,
        d.prima_luna_fara_risc ? `După prima lună, Clientul poate încheia contractul înainte de finalul perioadei minime doar plătind lunile rămase din perioada minimă.` : null,
      ].filter(Boolean)
    : [
        `Contractul intră în vigoare la data plății și se încheie la livrarea serviciilor din Anexa 1, confirmată pe email de Client sau, în lipsa unui răspuns, la 5 zile lucrătoare după ce AleSign anunță livrarea.${d.abonament_cod && d.abonament_nume ? ` Dacă oferta conține și luni de abonament (${d.abonament_nume}), acestea încep la activare și, după lunile incluse, abonamentul continuă lunar la prețul din catalog, cu aceleași reguli de încetare ca la articolul 11.` : ''}`,
      ];

  return [
    {
      titlu: '1. Părțile',
      p: [
        `${gol(P.denumire, 'AleSign&Co SRL')}, cu sediul în ${gol(P.adresa)}, CUI ${gol(P.cui)}, înregistrată la Registrul Comerțului sub nr. ${gol(P.regcom)}, reprezentată de ${gol(P.reprezentant, 'Alexandru-Vlad Pavăl')}, în calitate de prestator (numit în continuare „AleSign”),`,
        `și`,
        `${gol(C.denumire, '[firma clientului]')}, cu sediul în ${gol(C.adresa)}, CUI ${gol(C.cui)}${C.regcom ? `, înregistrată la Registrul Comerțului sub nr. ${C.regcom}` : ''}, reprezentată de ${gol(C.reprezentant, '[reprezentant]')}, email ${gol(C.email)}${C.telefon ? `, telefon ${C.telefon}` : ''}, în calitate de beneficiar (numit în continuare „Clientul”),`,
        `au convenit încheierea prezentului contract de prestări servicii, în condițiile de mai jos.`,
      ],
    },
    {
      titlu: '2. Ce facem',
      p: [
        `AleSign prestează pentru Client serviciile din oferta „${d.pachet_nume}”, descrise linie cu linie în Anexa 1, prin sistemul său de agenți automatizați AleSystem Design și prin munca echipei sale. Clientul decide direcția (aprobă ce se publică, ce se construiește, ce se schimbă); AleSign execută.`,
        d.descriere ? `Detalii convenite pentru acest contract: ${d.descriere}` : null,
        asteptare.length ? `Serviciile marcate „listă de așteptare” în Anexa 1 (${asteptare.map((l) => l.nume).join(', ')}) nu fac obiectul acestui contract și nu se facturează; când devin disponibile, AleSign le propune Clientului printr-un act adițional.` : null,
        `Serviciile sunt de marketing digital, construcție și întreținere de prezență online și automatizare a proceselor de comunicare cu clienții. AleSign nu garantează un anumit număr de clienți, vânzări sau poziții în Google; garantează că livrează ce scrie în Anexa 1, la timp și la calitatea descrisă.`,
      ].filter(Boolean),
    },
    { titlu: '3. Durata', p: durataP },
    { titlu: '4. Prețul și plata', p: pretP },
    {
      titlu: '5. Ce face AleSign',
      p: [
        `Livrează serviciile din Anexa 1 la termenele de acolo, cu grija unui profesionist.`,
        `Răspunde mesajelor Clientului în cel mult o zi lucrătoare, pe email sau WhatsApp.`,
        abon ? `Trimite lunar un raport scurt, pe înțelesul Clientului: ce s-a făcut, ce a produs, ce urmează.` : null,
        `Păstrează confidențiale informațiile primite de la Client (accese, date despre clienți, cifre) și le folosește doar pentru acest contract.`,
        `Cere aprobarea Clientului înainte de a publica materiale cu numele lui. Materialele aprobate o dată (de exemplu, un calendar de postări) se publică fără o nouă aprobare.`,
      ].filter(Boolean),
    },
    {
      titlu: '6. Ce face Clientul',
      p: [
        `Transmite materialele și accesele necesare (fotografii, logo, acces la fișa Google, domeniu, informații despre servicii și prețuri) în cel mult 5 zile lucrătoare de la activare, prin pagina de onboarding primită pe email. Termenele din Anexa 1 curg de la primirea lor.`,
        `Răspunde cererilor de aprobare în cel mult 2 zile lucrătoare. Lipsa răspunsului decalează termenele, nu obligațiile de plată.`,
        `Răspunde de legalitatea și adevărul informațiilor pe care le furnizează (prețuri, promoții, autorizații, imagini pentru care are drepturi).`,
        buget ? `Pune la dispoziție bugetul de reclame și accesul la conturile de reclame (sau le creează cu ajutorul AleSign), în numele firmei sale.` : null,
        `Nu solicită servicii în afara Anexei 1 fără un acord scris; ce e în plus se ofertează separat, fără surprize.`,
      ].filter(Boolean),
    },
    {
      titlu: '7. Proprietatea asupra lucrărilor',
      p: [
        `Site-ul, textele, imaginile create și materialele livrate special pentru Client devin proprietatea Clientului după plata integrală a lor. Până atunci, rămân ale AleSign.`,
        `Sistemul AleSystem Design, agenții automatizați, șabloanele, procesele și know-how-ul rămân proprietatea AleSign. Clientul primește dreptul de a beneficia de ele pe durata contractului, nu de a le copia sau muta.`,
        `AleSign poate menționa Clientul și lucrarea în portofoliul său, fără date confidențiale. Clientul poate cere oricând, pe email, să nu apară.`,
      ],
    },
    {
      titlu: '8. Găzduire, domeniu, accese',
      p: [
        `Pe durata contractului, site-ul este găzduit și întreținut de AleSign. Domeniul este și rămâne al Clientului; dacă este cumpărat de AleSign în numele Clientului, i se transferă la cerere.`,
        `La încetarea contractului, AleSign predă Clientului, în 15 zile de la cerere, fișierele site-ului și accesele conturilor create pe numele lui. Găzduirea de către AleSign încetează la 30 de zile după încetare.`,
      ],
    },
    {
      titlu: '9. Date personale',
      p: [
        `Fiecare parte respectă Regulamentul (UE) 2016/679 (GDPR). Pentru datele clienților Clientului la care AleSign ajunge prin servicii (de exemplu, mesaje automate de recenzii sau programări), AleSign acționează ca persoană împuternicită, prelucrează datele doar pe instrucțiunile Clientului și le șterge la încetarea contractului, la cerere.`,
      ],
    },
    {
      titlu: '10. Răspundere',
      p: [
        `Răspunderea totală a AleSign pentru orice prejudiciu legat de acest contract se limitează la sumele plătite de Client în ultimele 3 luni. AleSign nu răspunde pentru pierderi indirecte (profit nerealizat, clienți pierduți) și nici pentru efectele deciziilor platformelor terțe (Google, Meta, TikTok, furnizori de găzduire) asupra conturilor Clientului.`,
        `Niciuna dintre părți nu răspunde pentru neexecutare cauzată de forță majoră, notificată în 5 zile de la apariție.`,
      ],
    },
    {
      titlu: '11. Încetarea',
      p: [
        abon ? `Oricare parte poate înceta contractul după perioada minimă, cu preaviz de 30 de zile, pe email, fără alt motiv.` : `Contractul încetează la livrare, conform articolului 3.`,
        `Oricare parte poate înceta contractul imediat dacă cealaltă își încalcă grav obligațiile și nu remediază în 10 zile de la notificare.`,
        `La încetare, serviciile prestate până atunci rămân plătite, iar predarea se face conform articolului 8.`,
      ],
    },
    {
      titlu: '12. Comunicări, lege, litigii',
      p: [
        `Comunicările oficiale dintre părți se fac pe email, la adresele din articolul 1, și se consideră primite în ziua lucrătoare următoare trimiterii.`,
        `Contractul este guvernat de legea română. Orice neînțelegere se rezolvă întâi prin discuție directă, în 15 zile; dacă nu se ajunge la o soluție, de instanțele competente de la sediul AleSign.`,
      ],
    },
    {
      titlu: '13. Semnarea electronică',
      p: [
        `Părțile convin că acest contract se poate semna electronic, pe pagina pusă la dispoziție de AleSign: prin scrierea numelui reprezentantului, bifarea acordului și apăsarea butonului „Semnez”. Semnătura este înregistrată cu data, ora și adresa IP, iar contractul semnat se trimite pe email ambelor părți. O astfel de semnătură electronică are efecte juridice și nu poate fi respinsă doar pentru că este în formă electronică (Regulamentul (UE) nr. 910/2014, art. 25). Părțile pot semna și clasic, pe hârtie, cu același efect.`,
        `Contractul, împreună cu Anexa 1, reprezintă întregul acord al părților și înlocuiește orice discuție anterioară. Modificările se fac în scris, pe email, cu acordul ambelor părți.`,
      ],
    },
  ];
}

export function anexa(d) {
  const t = totaluri(d);
  const include = (Array.isArray(d.include) ? d.include : []).filter((x) => !t.linii.some((l) => l.nume === x)); // fără dubluri cu liniile
  const abon = d.tip === 'abonament';
  const termene = abon
    ? [
        'Ziua 1–3 de la primirea materialelor: apel de pornire (15 minute), plan de lucru pentru prima lună.',
        'Ziua 4–10: site-ul live pe domeniul Clientului (nou sau refăcut, după pachet) și fișa Google pusă la punct.',
        'Ziua 10–30: primele materiale de publicat trimise spre aprobare; publicare automată după aprobare.',
        'Ziua 30 și apoi lunar: raportul lunar, în maximum 2 minute de citit.',
      ]
    : [
        'Ziua 1–3 de la primirea materialelor: apel de pornire (15 minute) și confirmarea structurii.',
        'Ziua 4–15: construcția și prima versiune, trimisă spre aprobare.',
        'Până în ziua 20: corecturi (o rundă) și publicare pe domeniul Clientului.',
        'La final: predarea acceselor și a fișierelor.',
      ];
  const totText = [
    t.lunar > 0 ? `Total lunar: ${nr(t.lunar)} RON${t.platitor ? ' + TVA' : ''}` : null,
    t.anual != null ? `Total anual (plată în avans): ${nr(t.anual)} RON${t.platitor ? ' + TVA' : ''}` : null,
    t.unic !== 0 ? `Total o dată: ${nr(t.unic)} RON${t.platitor ? ' + TVA' : ''}` : null,
    `Prima plată: ${nr(t.prima)} RON${t.platitor ? ` + TVA = ${nr(t.primaCuTva)} RON` : ''}`,
  ].filter(Boolean);
  return { titlu: `Anexa 1 · Oferta „${d.pachet_nume}”`, linii: t.linii, totaluri: totText, include, termene, nota: 'Termenele curg de la primirea completă a materialelor de onboarding (articolul 6) și se pot decala cu acordul părților, pe email. Liniile marcate „inclus” nu se facturează separat; liniile „listă de așteptare” nu fac obiectul contractului.' };
}

export function antet(d) {
  return { numar: d.numar || '', data: dataRo(d.semnat_la || d.trimis_la || new Date()), titlu: 'Contract de prestări servicii' };
}
