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
