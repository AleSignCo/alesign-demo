// Datele de probă ale motorului de logo și ale brand kitului (24–25 nov. 2026): trei firme inventate, fiecare cu rețeta ei (formatul v1),
// cu Dosarul din care rețeta își citează faptul, cu paleta (jetoanele identității) și cu identitatea aprobată (formatul botului Identitate,
// SQL 55 + 106). Le folosesc teste/test-logo-*.mjs și teste/test-brand-*.mjs. Rulat singur, fișierul doar le numără.
//   arcada      Salon Liniște      logotip + semn (arcada)           Instagram
//   crestatura  Brutăria Olaru     monogramă BO + tăietura din O     Facebook și Google
//   ferestre    Cabinet Țurcanu    semn pe grilă + virgula lui Ț     nicio rețea în Dosar
export const FIRME = {
 "arcada": {
  "lead_id": 9900,
  "nisa": "saloane-beauty",
  "reteta": {
   "v": 1,
   "id": "arcada",
   "familie": "logotip",
   "nume": "Salon Liniște",
   "motiv": {
    "text": "Arcada de la intrare devine semnul, iar punctul lui i din Liniște e deschiderea ei, mică: clientele o recunosc de pe stradă.",
    "fapt": {
     "cale": "brand.logo_raspunsuri.detaliu",
     "citat": "arcada de piatră de la intrare"
    }
   },
   "gest": {
    "raza": 4
   },
   "culori": {
    "principal": "#2F3B36"
   },
   "logotip": {
    "font": "Fraunces",
    "grosime": 400,
    "axe": {
     "SOFT": 100,
     "opsz": 72
    },
    "spatiere": 10,
    "detalii": [
     {
      "tip": "litera_forma",
      "litera": "i#2",
      "parte": "punct",
      "semn": {
       "elemente": [
        {
         "id": "p",
         "tip": "dreptunghi",
         "x": 6,
         "y": 12,
         "l": 12,
         "h": 12,
         "raza": 0
        },
        {
         "id": "b",
         "tip": "cerc",
         "cx": 12,
         "cy": 12,
         "r": 6
        }
       ],
       "operatii": [
        {
         "op": "uneste",
         "elemente": [
          "p",
          "b"
         ],
         "rezultat": "usa"
        }
       ]
      }
     }
    ]
   },
   "semn": {
    "elemente": [
     {
      "id": "zid",
      "tip": "dreptunghi",
      "x": 4,
      "y": 10,
      "l": 16,
      "h": 13,
      "raza": 0
     },
     {
      "id": "bolta",
      "tip": "cerc",
      "cx": 12,
      "cy": 10,
      "r": 8
     },
     {
      "id": "gol",
      "tip": "dreptunghi",
      "x": 8,
      "y": 11,
      "l": 8,
      "h": 12,
      "raza": 0
     },
     {
      "id": "golbolta",
      "tip": "cerc",
      "cx": 12,
      "cy": 11,
      "r": 4
     }
    ],
    "operatii": [
     {
      "op": "uneste",
      "elemente": [
       "zid",
       "bolta"
      ],
      "rezultat": "plin"
     },
     {
      "op": "uneste",
      "elemente": [
       "gol",
       "golbolta"
      ],
      "rezultat": "deschidere"
     },
     {
      "op": "scade",
      "din": "plin",
      "scad": [
       "deschidere"
      ],
      "rezultat": "arcada"
     }
    ],
    "afisat": [
     {
      "id": "arcada",
      "culoare": "principal"
     }
    ]
   }
  },
  "paleta": {
   "fundal": "#F4EFE8",
   "text": "#1E2320",
   "baza": "#2F3B36",
   "accent": "#A8744F",
   "neutre": [
    "#F4EFE8",
    "#DCD4C8",
    "#A39B8E",
    "#5C5A52",
    "#1E2320"
   ]
  },
  "dosar": {
   "identitate": {
    "firma": "Salon Liniște",
    "nisa": "Salon beauty",
    "oras": "Iași",
    "telefon": "0744 000 111",
    "email": "programari@salonliniste.ro",
    "adresa": "Str. Lăpușneanu 14, Iași",
    "instagram": "@salonliniste"
   },
   "brand": {
    "nume_marca": "Salon Liniște",
    "logo_raspunsuri": {
     "stare": "vreau",
     "detaliu": "Intrăm pe sub arcada de piatră de la intrare, singura de pe stradă.",
     "evita": "foarfece, pieptene, siluete de femeie",
     "unde": "firma de deasupra ușii, Instagram",
     "culori": "verde închis și piatră; nu vreau roz"
    },
    "vocea": "Am deschis salonul ca să fie un loc liniștit, fără muzică tare și fără grabă.",
    "site_text": "Salonul nostru vă oferă servicii de înaltă calitate într-o atmosferă relaxantă. Echipa noastră de profesioniști vă așteaptă cu drag!"
   },
   "pozitionare": {
    "diferit": "o clientă pe rând, fără grabă"
   },
   "oferta": {
    "descriere": "Tuns, vopsit și coafat pentru femei. Programările se fac doar telefonic sau pe Instagram."
   }
  },
  "canale": [
   "instagram"
  ],
  "identitate": {
   "culori": [
    {
     "rol": "fundal",
     "nume": "Piatră",
     "hex": "#F4EFE8",
     "folosire": "fundalul paginilor și al postărilor",
     "proportie": "cea mai mare parte din pagină"
    },
    {
     "rol": "text",
     "nume": "Cerneală",
     "hex": "#1E2320",
     "folosire": "textul obișnuit",
     "proportie": "doar textul"
    },
    {
     "rol": "baza",
     "nume": "Verde de arcadă",
     "hex": "#2F3B36",
     "folosire": "logoul, titlurile, butoanele",
     "proportie": "cam o cincime"
    },
    {
     "rol": "accent",
     "nume": "Lemn",
     "hex": "#A8744F",
     "folosire": "un singur detaliu pe pagină: o linie, o iconiță",
     "proportie": "puțin, ca un semn"
    },
    {
     "rol": "neutru",
     "nume": "Calcar",
     "hex": "#DCD4C8",
     "folosire": "liniile de despărțire, fundalul casetelor",
     "proportie": "puțin"
    }
   ],
   "perechi": [
    {
     "text": "#1E2320",
     "fundal": "#F4EFE8",
     "pentru": "text obișnuit",
     "unde": "tot textul de pe site și din postări"
    },
    {
     "text": "#F4EFE8",
     "fundal": "#2F3B36",
     "pentru": "text obișnuit",
     "unde": "butoanele și banda de sus"
    },
    {
     "text": "#A8744F",
     "fundal": "#F4EFE8",
     "pentru": "text mare",
     "unde": "cifrele mari din postări"
    },
    {
     "text": "#2F3B36",
     "fundal": "#DCD4C8",
     "pentru": "text obișnuit",
     "unde": "casetele cu prețuri"
    }
   ],
   "fonturi": {
    "titluri": "Fraunces",
    "text": "Source Sans 3",
    "grosimi_titluri": "500",
    "grosimi_text": "400",
    "de_ce": "Fraunces are serife moi, ca piatra arcadei; Source Sans 3 se citește ușor pe telefon, la orice mărime.",
    "rezerva_titluri": "Georgia",
    "rezerva_text": "Arial"
   },
   "jetoane": {
    "culori": {
     "fundal": "#F4EFE8",
     "text": "#1E2320",
     "baza": "#2F3B36",
     "accent": "#A8744F",
     "neutre": [
      "#F4EFE8",
      "#DCD4C8",
      "#A39B8E",
      "#5C5A52",
      "#1E2320"
     ]
    },
    "fonturi": {
     "titluri": "Fraunces",
     "text": "Source Sans 3"
    }
   },
   "ton": {
    "cuvinte": [
     "liniștit",
     "atent",
     "simplu"
    ],
    "exemplu_da": "Te programezi, vii, stai cât îți trebuie. Între două cliente lăsăm un sfert de oră liber, ca să nu se suprapună nimeni.",
    "exemplu_nu": "Îți oferim o experiență unică de răsfăț, cu servicii premium și rezultate garantate!",
    "niciodata": [
     "semne de exclamare în șir",
     "cuvinte ca „experiență unică” sau „răsfăț total”"
    ]
   },
   "fotografie": {
    "lumina": "lumină de zi, de la geam; fără blitz",
    "incadrare": "aproape, pe mâini și pe păr, cu arcada sau peretele de piatră în spate",
    "oameni": "clientele reale, doar cu acordul lor; fără poze de catalog",
    "niciodata": [
     "poze cu oameni care pozează",
     "filtre care schimbă culoarea părului"
    ]
   },
   "rescrieri": [
    {
     "sursa": "brand.site_text",
     "original": "Salonul nostru vă oferă servicii de înaltă calitate într-o atmosferă relaxantă. Echipa noastră de profesioniști vă așteaptă cu drag!",
     "nou": "La noi e liniște: fără muzică tare, fără grabă, o clientă pe rând. Te așteptăm pe Lăpușneanu 14.",
     "de_ce": "Am scos laudele generale și am pus ce e adevărat doar aici: liniștea și o clientă pe rând."
    },
    {
     "sursa": "oferta.descriere",
     "original": "Tuns, vopsit și coafat pentru femei. Programările se fac doar telefonic sau pe Instagram.",
     "nou": "Tuns, vopsit, coafat. Te programezi la telefon sau pe Instagram, iar ora ta rămâne a ta.",
     "de_ce": "Același fapt, spus către clientă, cu motivul pentru care programarea contează."
    },
    {
     "sursa": "brand.vocea",
     "original": "Am deschis salonul ca să fie un loc liniștit, fără muzică tare și fără grabă.",
     "nou": "Am deschis salonul pentru o oră liniștită: fără muzică tare și fără grabă.",
     "de_ce": "Fraza era deja bună; am scurtat-o, ca să încapă pe prima pagină a site-ului."
    }
   ],
   "personalitate": [
    {
     "axa": "jucăuș–serios",
     "pozitie": 4,
     "de_ce": "proprietara scrie despre liniște și grijă, nu despre glume"
    },
    {
     "axa": "relaxat–formal",
     "pozitie": 2,
     "de_ce": "vorbește cu clientele pe „tu”, ca de la om la om"
    },
    {
     "axa": "accesibil–premium",
     "pozitie": 3,
     "de_ce": "prețuri obișnuite pentru Iași, dar timp mai mult pentru fiecare clientă"
    },
    {
     "axa": "clasic–inovator",
     "pozitie": 2,
     "de_ce": "arcada de piatră și clădirea veche pe care le pomenește în fiecare text"
    },
    {
     "axa": "discret–îndrăzneț",
     "pozitie": 1,
     "de_ce": "nu vrea roz, nu vrea muzică tare, vrea să se audă puțin"
    }
   ],
   "semn_distinctiv": "Arcada de piatră de la intrare: apare în logo, în colțul rotunjit de sus al pozelor și pe ușa salonului.",
   "reguli": [
    {
     "asa_da": "O singură culoare de accent pe pagină, pusă pe un detaliu mic.",
     "asa_nu": "Accentul pe tot titlul sau pe fundalul întregii postări."
    },
    {
     "asa_da": "Pozele cu colțurile de sus rotunjite, ca arcada.",
     "asa_nu": "Rame, umbre sau colțuri tăiate oblic."
    },
    {
     "asa_da": "Mult spațiu gol în jurul textului.",
     "asa_nu": "Postări pline de text, de la margine la margine."
    }
   ]
  }
 },
 "crestatura": {
  "lead_id": 9901,
  "nisa": "cafenele-patiserii-brutarii",
  "reteta": {
   "v": 1,
   "id": "crestatura",
   "familie": "monograma",
   "nume": "Brutăria Olaru",
   "motiv": {
    "text": "Crestătura piezișă pe care o face pe fiecare pâine trece prin O, ca printr-o pâine rotundă, la același unghi în semn și în nume.",
    "fapt": {
     "cale": "brand.vocea",
     "citat": "o singură crestătură, pieziș"
    }
   },
   "gest": {
    "unghi": 30,
    "latime": 2
   },
   "culori": {
    "principal": "#3B2A20",
    "accent": "#C9853A"
   },
   "monograma": {
    "litere": "BO",
    "font": "Bitter",
    "grosime": 700,
    "aranjare": "suprapuse",
    "decalaj": 0.06,
    "gol": 2,
    "detalii": [
     {
      "tip": "taietura",
      "litere": [
       "O"
      ],
      "inaltime": 0.55
     }
    ]
   },
   "logotip": {
    "font": "Bitter",
    "grosime": 600,
    "spatiere": 20,
    "detalii": [
     {
      "tip": "taietura",
      "litere": [
       "O"
      ],
      "inaltime": 0.55
     }
    ]
   }
  },
  "paleta": {
   "fundal": "#F7F1E6",
   "text": "#2A1E17",
   "baza": "#3B2A20",
   "accent": "#C9853A",
   "neutre": [
    "#F7F1E6",
    "#E6D9C3",
    "#B49B7B",
    "#6B5442",
    "#2A1E17"
   ]
  },
  "dosar": {
   "identitate": {
    "firma": "Brutăria Olaru",
    "nisa": "Brutărie",
    "oras": "Iași",
    "telefon": "0755 222 333",
    "email": "comenzi@brutariaolaru.ro",
    "adresa": "Bd. Independenței 8, Iași",
    "facebook": "Brutăria Olaru"
   },
   "brand": {
    "logo_raspunsuri": {
     "stare": "fara",
     "detaliu": "cuptorul de cărămidă al bunicului",
     "evita": "spice de grâu, brutar cu bonetă"
    },
    "vocea": "Fiecare pâine primește o singură crestătură, pieziș, înainte să intre în cuptor. Așa a făcut bunicul și așa fac și eu.",
    "site_text": "Brutăria Olaru face pâine cu maia din 1998, în cuptorul din curtea de pe Independenței. Pâinea iese caldă la 6 dimineața."
   },
   "pozitionare": {
    "diferit": "pâine cu maia, coaptă în cuptor de cărămidă"
   }
  },
  "canale": [
   "facebook",
   "gbp"
  ],
  "identitate": {
   "culori": [
    {
     "rol": "fundal",
     "nume": "Făină",
     "hex": "#F7F1E6",
     "folosire": "fundalul",
     "proportie": "cea mai mare parte"
    },
    {
     "rol": "text",
     "nume": "Coajă arsă",
     "hex": "#2A1E17",
     "folosire": "textul",
     "proportie": "doar textul"
    },
    {
     "rol": "baza",
     "nume": "Cuptor",
     "hex": "#3B2A20",
     "folosire": "logoul, titlurile, firma de la intrare",
     "proportie": "o cincime"
    },
    {
     "rol": "accent",
     "nume": "Crustă",
     "hex": "#C9853A",
     "folosire": "prețurile și ora la care iese pâinea",
     "proportie": "puțin"
    },
    {
     "rol": "neutru",
     "nume": "Hârtie de pungă",
     "hex": "#E6D9C3",
     "folosire": "casetele și etichetele",
     "proportie": "puțin"
    }
   ],
   "perechi": [
    {
     "text": "#2A1E17",
     "fundal": "#F7F1E6",
     "pentru": "text obișnuit",
     "unde": "tot textul"
    },
    {
     "text": "#F7F1E6",
     "fundal": "#3B2A20",
     "pentru": "text obișnuit",
     "unde": "banda de sus și firma"
    },
    {
     "text": "#C9853A",
     "fundal": "#F7F1E6",
     "pentru": "text obișnuit",
     "unde": "prețurile"
    },
    {
     "text": "#3B2A20",
     "fundal": "#E6D9C3",
     "pentru": "text obișnuit",
     "unde": "etichetele de pe pungi"
    }
   ],
   "fonturi": {
    "titluri": "Bitter",
    "text": "Work Sans",
    "grosimi_titluri": "700",
    "grosimi_text": "400",
    "de_ce": "Bitter are serife pătrate, ca literele pictate pe firmele vechi; Work Sans e simplu și se citește de departe.",
    "rezerva_titluri": "Georgia",
    "rezerva_text": "Verdana"
   },
   "jetoane": {
    "culori": {
     "fundal": "#F7F1E6",
     "text": "#2A1E17",
     "baza": "#3B2A20",
     "accent": "#C9853A",
     "neutre": [
      "#F7F1E6",
      "#E6D9C3",
      "#B49B7B",
      "#6B5442",
      "#2A1E17"
     ]
    },
    "fonturi": {
     "titluri": "Bitter",
     "text": "Work Sans"
    }
   },
   "ton": {
    "cuvinte": [
     "cald",
     "direct",
     "de cartier"
    ],
    "exemplu_da": "Pâinea cu maia iese la 6. Dacă vrei una caldă, sună-ne de seara și ți-o punem deoparte.",
    "exemplu_nu": "Descoperă gustul autentic al tradiției într-o experiență culinară de neuitat!",
    "niciodata": [
     "„tradiție autentică” și alte cuvinte de ambalaj",
     "promisiuni despre sănătate"
    ]
   },
   "fotografie": {
    "lumina": "lumina de dimineață din brutărie, caldă",
    "incadrare": "aproape, pe pâine și pe mâinile brutarului; cuptorul în spate",
    "oameni": "brutarii și clienții din cartier, cu acordul lor",
    "niciodata": [
     "pâine din stocuri de poze",
     "fundaluri albe de studio"
    ]
   },
   "rescrieri": [
    {
     "sursa": "brand.site_text",
     "original": "Brutăria Olaru face pâine cu maia din 1998, în cuptorul din curtea de pe Independenței. Pâinea iese caldă la 6 dimineața.",
     "nou": "Facem pâine cu maia din 1998, în cuptorul din curte, pe Independenței 8. Prima tavă iese la 6 dimineața.",
     "de_ce": "Am trecut la „noi”, ca să vorbească brutarul, și am pus adresa exactă."
    }
   ],
   "personalitate": [
    {
     "axa": "jucăuș–serios",
     "pozitie": 3,
     "de_ce": "glumește cu clienții din cartier, dar despre pâine vorbește serios"
    },
    {
     "axa": "relaxat–formal",
     "pozitie": 1,
     "de_ce": "toți clienții îi spun pe nume"
    },
    {
     "axa": "accesibil–premium",
     "pozitie": 2,
     "de_ce": "pâine de fiecare zi, la preț de cartier"
    },
    {
     "axa": "clasic–inovator",
     "pozitie": 1,
     "de_ce": "aceeași rețetă de maia din 1998"
    },
    {
     "axa": "discret–îndrăzneț",
     "pozitie": 3,
     "de_ce": "firma pictată de la intrare se vede din stație"
    }
   ],
   "semn_distinctiv": "Crestătura oblică din coaja pâinii: o repetă logoul, eticheta și colțul tăiat al postărilor.",
   "reguli": [
    {
     "asa_da": "Ora la care iese pâinea, scrisă mare, cu accentul.",
     "asa_nu": "Accentul pe text lung: pe fundalul deschis nu se citește."
    }
   ]
  }
 },
 "ferestre": {
  "lead_id": 9902,
  "nisa": "clinici-stomatologice",
  "reteta": {
   "v": 1,
   "id": "ferestre",
   "familie": "semn",
   "nume": "Cabinet Țurcanu",
   "motiv": {
    "text": "Ferestrele rotunde ale casei din Copou dau colțurile rotunde ale lui T; virgula lui Ț e un sfert de cerc de aceeași rază, în culoarea de accent.",
    "fapt": {
     "cale": "brand.logo_raspunsuri.detaliu",
     "citat": "ferestrele rotunde de la etaj"
    }
   },
   "gest": {
    "raza": 5.5
   },
   "culori": {
    "principal": "#17364A",
    "accent": "#D98C5F"
   },
   "semn": {
    "elemente": [
     {
      "id": "g",
      "tip": "grila",
      "x": 4,
      "y": 0,
      "latura": 16.5,
      "n": 3,
      "celule": [
       "NV",
       "p",
       "NE",
       ".",
       "p",
       ".",
       ".",
       "p",
       "."
      ]
     },
     {
      "id": "v",
      "tip": "sfert",
      "x": 15,
      "y": 18,
      "r": 5.5,
      "spre": "SV"
     }
    ],
    "operatii": [],
    "afisat": [
     {
      "id": "g",
      "culoare": "principal"
     },
     {
      "id": "v",
      "culoare": "accent"
     }
    ]
   },
   "logotip": {
    "font": "Manrope",
    "grosime": 600,
    "spatiere": 20,
    "detalii": [
     {
      "tip": "litera_forma",
      "litera": "Ț",
      "parte": "semn_diacritic",
      "semn": {
       "elemente": [
        {
         "id": "q",
         "tip": "sfert",
         "x": 18,
         "y": 6,
         "r": 12,
         "spre": "SV"
        }
       ],
       "operatii": [],
       "afisat": [
        {
         "id": "q",
         "culoare": "accent"
        }
       ]
      }
     }
    ]
   }
  },
  "paleta": {
   "fundal": "#F5F3EF",
   "text": "#14222C",
   "baza": "#17364A",
   "accent": "#D98C5F",
   "neutre": [
    "#F5F3EF",
    "#DDE2E3",
    "#9AA5AA",
    "#4A5A63",
    "#14222C"
   ]
  },
  "dosar": {
   "identitate": {
    "firma": "Cabinet Țurcanu",
    "nisa": "Stomatologie",
    "oras": "Iași",
    "telefon": "0232 000 444",
    "email": "contact@cabinetturcanu.ro",
    "adresa": "Str. Vasile Alecsandri 3, Copou, Iași"
   },
   "brand": {
    "logo_raspunsuri": {
     "stare": "rebranding",
     "detaliu": "Cabinetul e în casa veche din Copou, cu ferestrele rotunde de la etaj.",
     "evita": "dinți zâmbitori, periuțe, albastru-turcoaz"
    },
    "vocea": "Lucrez singură, cu o asistentă, și îmi iau timp pentru fiecare om."
   },
   "pozitionare": {
    "diferit": "un singur medic, care te vede de la prima consultație la ultima"
   }
  },
  "canale": [],
  "identitate": {
   "culori": [
    {
     "rol": "fundal",
     "nume": "Alb cald",
     "hex": "#F5F3EF",
     "folosire": "fundalul",
     "proportie": "aproape tot"
    },
    {
     "rol": "text",
     "nume": "Grafit",
     "hex": "#14222C",
     "folosire": "textul",
     "proportie": "doar textul"
    },
    {
     "rol": "baza",
     "nume": "Albastru de Copou",
     "hex": "#17364A",
     "folosire": "logoul și titlurile",
     "proportie": "o cincime"
    },
    {
     "rol": "accent",
     "nume": "Teracotă",
     "hex": "#D98C5F",
     "folosire": "un detaliu",
     "proportie": "foarte puțin"
    }
   ],
   "perechi": [
    {
     "text": "#14222C",
     "fundal": "#F5F3EF",
     "pentru": "text obișnuit",
     "unde": "tot textul"
    }
   ],
   "fonturi": {
    "titluri": "Manrope",
    "text": "Manrope",
    "grosimi_titluri": "700",
    "grosimi_text": "400",
    "de_ce": "Un singur font, în două grosimi: curat și ușor de citit.",
    "rezerva_titluri": "Arial",
    "rezerva_text": "Arial"
   },
   "jetoane": {
    "culori": {
     "fundal": "#F5F3EF",
     "text": "#14222C",
     "baza": "#17364A",
     "accent": "#D98C5F",
     "neutre": [
      "#F5F3EF",
      "#DDE2E3",
      "#9AA5AA",
      "#4A5A63",
      "#14222C"
     ]
    },
    "fonturi": {
     "titluri": "Manrope",
     "text": "Manrope"
    }
   },
   "ton": {
    "cuvinte": [
     "calm",
     "limpede",
     "răbdător"
    ],
    "exemplu_da": "Îți explicăm înainte ce facem și cât costă. Dacă te doare, spune și ne oprim.",
    "exemplu_nu": "Zâmbetul perfect te așteaptă la noi!",
    "niciodata": [
     "promisiuni de rezultat",
     "poze cu dinți"
    ]
   },
   "fotografie": {
    "lumina": "lumină naturală, de la ferestrele cabinetului",
    "incadrare": "spațiul și oamenii, nu instrumentele",
    "oameni": "medicii și asistentele",
    "niciodata": [
     "instrumente în prim-plan",
     "zâmbete de catalog"
    ]
   }
  }
 }
};

// un logo pe care clientul îl păstrează, exportat din Illustrator: clase CSS, grupuri cu transformări, alb folosit ca „gol”
export const SVG_EXISTENT = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Generator: Adobe Illustrator 27.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" x=\"0px\" y=\"0px\" viewBox=\"0 0 400 120\" style=\"enable-background:new 0 0 400 120;\" xml:space=\"preserve\">\n<style type=\"text/css\">\n\t.st0{fill:#FFFFFF;}\n\t.st1{fill:#1F4E5A;}\n\t.st2{fill:#E3A23B;}\n</style>\n<rect class=\"st0\" width=\"400\" height=\"120\"/>\n<g transform=\"translate(10,10)\">\n\t<circle class=\"st1\" cx=\"50\" cy=\"50\" r=\"48\"/>\n\t<path class=\"st0\" d=\"M50,20 A30,30 0 1,1 49.9,20 Z M50,35 a15,15 0 1,0 0.1,0 Z\"/>\n\t<rect class=\"st2\" x=\"40\" y=\"44\" width=\"20\" height=\"12\" rx=\"4\"/>\n</g>\n<g transform=\"matrix(1 0 0 1 130 40)\">\n\t<rect class=\"st1\" x=\"0\" y=\"0\" width=\"14\" height=\"50\"/>\n\t<polygon class=\"st1\" points=\"20,0 60,0 60,12 32,12 32,20 56,20 56,32 32,32 32,50 20,50\"/>\n\t<rect class=\"st1\" x=\"70\" y=\"0\" width=\"14\" height=\"50\" rx=\"7\" ry=\"7\"/>\n\t<ellipse class=\"st2\" cx=\"120\" cy=\"25\" rx=\"24\" ry=\"25\"/>\n\t<path class=\"st0\" d=\"M120 10 C 128 10 134 17 134 25 C 134 33 128 40 120 40 C 112 40 106 33 106 25 C 106 17 112 10 120 10 Z\"/>\n</g>\n</svg>\n";

// același set pentru o firmă: n variante ale unei rețete, cu id-uri diferite (pentru testele de viteză și de formă a răspunsului)
export function variante(nume, n) {
  const baza = FIRME[nume].reteta; const out = [];
  for (let i = 0; i < n; i++) { const r = JSON.parse(JSON.stringify(baza)); r.id = i ? `${baza.id}-${i + 1}` : baza.id; if (r.logotip && i) r.logotip.spatiere = (r.logotip.spatiere || 0) + 10 * i; out.push(r); }
  return out;
}
export const clona = (x) => JSON.parse(JSON.stringify(x));

// ce verifică și scriptul SQL 111 (logo_cale): o cale din bucketul „brand”, fără prefixul bucketului
export const CALE_BRAND = /^[0-9]+\/[0-9]+\/[A-Za-z0-9._\/-]{1,240}$/;

// răspunsul unei rute, ca în Vercel: { cod, corp, hdr }
export function raspuns() { const r = { cod: 0, corp: null, hdr: {} }; r.status = (c) => { r.cod = c; return r; }; r.json = (x) => { r.corp = x; return r; }; r.setHeader = (k, v) => { r.hdr[k] = v; }; return r; }

if (import.meta.url === `file://${process.argv[1]}`) console.log(`${Object.keys(FIRME).length} firme de probă: ${Object.values(FIRME).map((f) => f.reteta.nume).join(', ')}`);
