// =================================================================================
// 0.16.2 G6: DANE KRAJÓW — Niemcy (13 + 3 państwowe), USA (15 + 4), Czechy (8 + 1); załącznik B planu 0.16.
// Definicje są w kodzie, nie w zapisie. Pola spółki: id (symbol), name, sector (lub [główny, drugi]), subsector, kind ('giant' | 'normal' | 'state'),
// price (w walucie kraju), special (jeden modyfikator: defense | loyal | summer | volatile | premiere | season), vol (mnożnik zmienności), desc.
// Kraj: rho (korelacja nastroju z PL: Europa 0,8 → 0,75/0,7, Ameryka–Europa 0,6), rateMean (średnia stopa), labour (stały profil dla pracowników, 0.13).
// Giganci mają to samo id i cenę co w FOREIGN_GIANTS (gdr.js): kwity zamieniają się w akcje 1:1 po dołączeniu kraju.
// =================================================================================

COUNTRY_DEFS.DE = {
    id: 'DE', name: 'Niemcy', currency: 'EUR', region: 'EU', rho: 0.75, rateMean: 0.025,
    operator: { id: 'DAX', name: 'Frankfurter Börsenhaus (DAX)', commission: 0.006 },
    labour: { wages: 1.6, rights: 'ochronne', unionMult: 1.2, shadow: 0, note: 'współdecydowanie' },
    companies: [
        { id: 'PZW', name: 'Panzerwafel GmbH', sector: ['Żywność', 'Obronność'], kind: 'normal', price: 38, special: 'defense', desc: 'Wafle w racjach wojskowych; rosną z wydatkami na obronność.' },
        { id: 'VWA', name: 'VolksDeutsch Auto', sector: 'Motoryzacja', kind: 'giant', price: 95 },
        { id: 'STW', name: 'Sternwagen AG', sector: 'Motoryzacja', kind: 'normal', price: 140, desc: 'Specjalizacja: segment premium.' },
        { id: 'BMV', name: 'BMV Bayerwerke', sector: 'Motoryzacja', kind: 'normal', price: 105, desc: 'Kierowcy po zakupie auta stają się idiotami.' },
        { id: 'CRH', name: 'Chemiefabrik Rhein AG', sector: 'Chemia', kind: 'giant', price: 70 },
        { id: 'BYM', name: 'BayernMunch', sector: 'Medycyna', niche: 'Farmaceutyki', kind: 'normal', price: 85 },
        { id: 'MTS', name: 'Medizintechnik Schwarzwald', sector: 'Medycyna', subsector: 'Sprzęt medyczny', kind: 'normal', price: 60 },
        { id: 'SIE', name: 'Siemenz Industrie', sector: ['Przemysł', 'Technologia'], kind: 'normal', price: 110 },
        { id: 'SPF', name: 'SPASF Software', sector: 'Technologia', kind: 'normal', price: 130 },
        { id: 'DGH', name: 'Deutsche Goldhaus', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'normal', price: 40 },
        { id: 'OKT', name: 'Oktoberbräu Feust', sector: 'Alkohole', subsector: 'Piwowarstwo i napoje', kind: 'normal', price: 55 },
        { id: 'ABL', name: 'Autobahn Logistik', sector: 'Budowlany', kind: 'normal', price: 35 },
        { id: 'MRA', name: 'MetallRai', sector: ['Przemysł', 'Obronność'], kind: 'normal', price: 45, special: 'defense' },
        { id: 'DBF', name: 'Deutsche Bahnhof', sector: 'Usługi', kind: 'state', price: 22, desc: 'Państwowa kolej.' },
        { id: 'BPS', name: 'Bundespost', sector: 'Usługi', kind: 'state', price: 18, desc: 'Państwowa poczta.' },
        { id: 'WAB', name: 'Wiederaufbaubank', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'state', price: 25, desc: 'Państwowy bank rozwoju.' }
    ]
};

COUNTRY_DEFS.US = {
    id: 'US', name: 'USA', currency: 'USD', region: 'AM', rho: 0.6, rateMean: 0.04,
    operator: { id: 'WSE', name: 'Wall Street Exchange', commission: 0.006 },
    labour: { wages: 1.7, rights: 'liberalne', unionMult: 0.5, shadow: 2, note: 'niska szansa związku' },
    companies: [
        { id: 'PLT', name: 'Palant-YR', sector: 'Technologia', subsector: 'Sztuczna inteligencja', kind: 'normal', price: 24, special: 'defense', desc: 'Szpiegostwo dla obronności; kontrakty wywiadowcze rosną z wydatkami na obronność.' },
        { id: 'GLS', name: 'Glasses', sector: 'Technologia', kind: 'giant', price: 180, desc: 'Wyszukiwarka i reklama.' },
        { id: 'AMZ', name: 'Amazonka Corp.', sector: ['Usługi', 'Technologia'], kind: 'giant', price: 140, desc: 'E-commerce.' },
        { id: 'PER', name: 'Pear', sector: ['Technologia', 'Dobra konsumpcyjne'], kind: 'giant', price: 210, special: 'premiere', desc: 'Smartfony; co rok premiera modelu — hit albo flop; lojalni klienci łagodzą spadki.' },
        { id: 'MCH', name: 'Macrohard', sector: 'Technologia', kind: 'normal', price: 400, desc: 'Oprogramowanie.' },
        { id: 'FNG', name: 'FingerPrint', sector: ['Media', 'Technologia'], kind: 'normal', price: 320, desc: 'Social media; specjalizacja Rozrywka.' },
        { id: 'ENV', name: 'Envidia', sector: 'Technologia', subsector: 'Półprzewodniki', kind: 'normal', price: 120, desc: 'Projektant chipów do AI.' },
        { id: 'TSL', name: 'Teslar Motors', sector: 'Motoryzacja', kind: 'normal', price: 250, special: 'volatile', desc: 'Auta elektryczne; wysoka zmienność.' },
        { id: 'LAE', name: 'Lotos Aerospace', sector: ['Przemysł', 'Obronność'], kind: 'normal', price: 130, special: 'defense', desc: 'Lotnictwo.' },
        { id: 'WSC', name: 'Wall Street Corp.', sector: 'Bankowość', subsector: 'Bank inwestycyjny', kind: 'normal', price: 90 },
        { id: 'TOB', name: 'Texas Oil & Barbecue', sector: 'Energia', kind: 'normal', price: 75 },
        { id: 'HDP', name: 'Hollywood Dreams Pictures', sector: 'Media', niche: 'Rozrywka', kind: 'normal', price: 60, special: 'season' },
        { id: 'BPU', name: 'Big Pharma Unlimited', sector: 'Medycyna', niche: 'Farmaceutyki', kind: 'normal', price: 110 },
        { id: 'CHQ', name: 'ChickQueen', sector: 'Żywność', kind: 'normal', price: 45 },
        { id: 'CKF', name: 'Coke&Fent', sector: 'Alkohole', subsector: 'Piwowarstwo i napoje', kind: 'normal', price: 65 },
        { id: 'AMR', name: 'AmeriRail', sector: 'Usługi', kind: 'state', price: 30, desc: 'Państwowa kolej.' },
        { id: 'USM', name: 'US Mail & Parcel', sector: 'Usługi', kind: 'state', price: 12, desc: 'Państwowa poczta.' },
        { id: 'TVP', name: 'Tennessee Valley Power', sector: 'Energia', kind: 'state', price: 28, desc: 'Państwowa energetyka.' },
        { id: 'FFM', name: 'Fannie & Freddie Mortgage', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'state', price: 15, desc: 'Państwowe hipoteki.' }
    ]
};

