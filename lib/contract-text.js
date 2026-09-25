// Contractul de prestări servicii AleSign&Co · șablon (25.09.2026).
// Un singur text, folosit și de pagina /c/<slug> (HTML) și de PDF. Variabilele vin din contracte + setari.
// De verificat de un avocat înainte de primul client real. Nu e consultanță juridică.

const nr = (v) => Number(v || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const dataRo = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }) : '');
const gol = (v, alt = '[de completat]') => (v && String(v).trim() ? String(v).trim() : alt);

// Prețul afișat: fără TVA sau cu TVA, după setări.
export function pret(d) {
  const p = Number(d.pret || 0);
  const platitor = String((d.prestator || {}).platitor_tva) === 'true';
  const tva = platitor ? Number(d.tva_procent || 21) : 0;
  const total = platitor ? Math.round(p * (1 + tva / 100) * 100) / 100 : p;
  const per = d.tip === 'abonament' ? 'lună' : 'o dată';
  return { baza: p, tva, total, platitor, per, text: platitor ? `${nr(p)} RON + TVA ${tva}% = ${nr(total)} RON / ${per}` : `${nr(p)} RON / ${per} (neplătitor de TVA)` };
}

export function clauze(d) {
  const P = d.prestator || {};
  const C = d.client || {};
  const pr = pret(d);
  const abon = d.tip === 'abonament';
  const min = Number(d.perioada_minima_luni || 0);
  const include = Array.isArray(d.include) ? d.include : [];

  return [
    {
      titlu: '1. Părțile',
      p: [
        `${gol(P.denumire, 'AleSign&Co SRL')}, cu sediul în ${gol(P.adresa)}, CUI ${gol(P.cui)}, înregistrată la Registrul Comerțului sub nr. ${gol(P.regcom)}, reprezentată de ${gol(P.reprezentant, 'Alexandru Paval')}, în calitate de prestator (numit în continuare „AleSign”),`,
        `și`,
        `${gol(C.denumire, '[firma clientului]')}, cu sediul în ${gol(C.adresa)}, CUI ${gol(C.cui)}${C.regcom ? `, înregistrată la Registrul Comerțului sub nr. ${C.regcom}` : ''}, reprezentată de ${gol(C.reprezentant, '[reprezentant]')}, email ${gol(C.email)}${C.telefon ? `, telefon ${C.telefon}` : ''}, în calitate de beneficiar (numit în continuare „Clientul”),`,
        `au convenit încheierea prezentului contract de prestări servicii, în condițiile de mai jos.`,
      ],
    },
    {
      titlu: '2. Ce facem',
      p: [
        `AleSign prestează pentru Client serviciile din pachetul „${d.pachet_nume}”, descrise în Anexa 1, prin sistemul său de agenți automatizați AleSystem Design și prin munca echipei sale. Clientul decide direcția (aprobă ce se publică, ce se construiește, ce se schimbă); AleSign execută.`,
        d.descriere ? `Detalii convenite pentru acest contract: ${d.descriere}` : null,
        `Serviciile sunt de marketing digital, construcție și întreținere de prezență online și automatizare a proceselor de comunicare cu clienții. AleSign nu garantează un anumit număr de clienți, vânzări sau poziții în Google; garantează că livrează ce scrie în Anexa 1, la timp și la calitatea descrisă.`,
      ].filter(Boolean),
    },
    {
      titlu: '3. Durata',
      p: abon
        ? [
            `Contractul intră în vigoare la data primei plăți („data activării”) și se încheie pe o perioadă minimă de ${min} ${min === 1 ? 'lună' : 'luni'}. După perioada minimă, se prelungește automat, lună de lună, până când una dintre părți îl încetează cu un preaviz de 30 de zile, transmis pe email.`,
            `Clientul poate încheia contractul înainte de finalul perioadei minime doar plătind lunile rămase din perioada minimă.`,
          ]
        : [
            `Contractul intră în vigoare la data plății și se încheie la livrarea serviciilor din Anexa 1, confirmată pe email de Client sau, în lipsa unui răspuns, la 5 zile lucrătoare după ce AleSign anunță livrarea.`,
          ],
    },
    {
      titlu: '4. Prețul și plata',
      p: [
        `Prețul serviciilor este de ${pr.text}.${pr.platitor ? '' : ' AleSign nu este plătitor de TVA la data semnării; dacă devine, TVA se adaugă conform legii, cu notificare prealabilă.'}`,
        abon
          ? `Plata se face în avans, lunar. Prima lună se plătește la semnare, cu cardul (prin Stripe) sau prin transfer bancar în maximum 5 zile lucrătoare de la semnare. Lunile următoare se plătesc la aceeași zi a fiecărei luni: automat, dacă s-a ales cardul, sau pe baza facturii, în 5 zile lucrătoare de la emitere, dacă s-a ales transferul.`
          : `Plata se face integral la semnare, cu cardul (prin Stripe) sau prin transfer bancar în maximum 5 zile lucrătoare de la semnare. Lucrul începe în ziua în care plata este confirmată.`,
        `Pentru fiecare plată AleSign emite factură, transmisă pe email și, unde legea o cere, prin sistemul național e-Factura.`,
        `Dacă o plată întârzie mai mult de 10 zile, AleSign poate suspenda serviciile până la plată, cu o notificare pe email. Dacă întârzie mai mult de 30 de zile, AleSign poate înceta contractul, iar sumele datorate pentru perioada minimă rămân scadente.`,
      ],
    },
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
        `Nu solicită servicii în afara Anexei 1 fără un acord scris; ce e în plus se ofertează separat, fără surprize.`,
      ],
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
        `Contractul este guvernat de legea română. Orice neînțelegere se rezolvă întâi prin discuție directă, în 15 zile; dacă nu se ajunge la o soluție, de instanțele competente din București.`,
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
  const include = Array.isArray(d.include) ? d.include : [];
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
  return { titlu: `Anexa 1 · Pachetul „${d.pachet_nume}”`, include, termene, nota: 'Termenele curg de la primirea completă a materialelor de onboarding (articolul 6) și se pot decala cu acordul părților, pe email.' };
}

export function antet(d) {
  return { numar: d.numar || '', data: dataRo(d.semnat_la || d.trimis_la || new Date()), titlu: 'Contract de prestări servicii' };
}
