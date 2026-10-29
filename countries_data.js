// =================================================================================
// 0.16.2 G6: DANE KRAJÓW — Niemcy (14 + 3 państwowe + 40 zestawu startowego 0.16.11), USA (16 + 4), Czechy (8 + 1); załącznik B planu 0.16.
// Definicje są w kodzie, nie w zapisie. Pola spółki: id (symbol), name, sector (lub [główny, drugi]), subsector, kind ('giant' | 'normal' | 'state'),
// price (w walucie kraju), special (jeden modyfikator: defense | loyal | summer | volatile | premiere | season), vol (mnożnik zmienności), desc.
// Kraj: rho (korelacja nastroju z PL: Europa 0,8 → 0,75/0,7, Ameryka–Europa 0,6), rateMean (średnia stopa), labour (stały profil dla pracowników, 0.13).
// Giganci mają to samo id i cenę co w FOREIGN_GIANTS (gdr.js): kwity zamieniają się w akcje 1:1 po dołączeniu kraju.
// =================================================================================

COUNTRY_DEFS.DE = {
    id: 'DE', name: 'Niemcy', currency: 'EUR', region: 'EU', rho: 0.75, rateMean: 0.025,
    operator: { id: 'DAX', name: 'Frankfurter Börsenhaus (DAX)', commission: 0.006 },
    oversight: { name: 'BaFin', callThreshold: 0.75, level: 3 },
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
        { id: 'OKT', name: 'Oktoberbräu Feust', sector: 'Alkohole', subsector: 'Piwowarstwo i napoje', kind: 'normal', price: 55 },
        { id: 'ABL', name: 'Autobahn Logistik', sector: 'Budowlany', kind: 'normal', price: 35 },
        { id: 'MRA', name: 'MetallRai', sector: ['Przemysł', 'Obronność'], kind: 'normal', price: 45, special: 'defense' },
        { id: 'DBF', name: 'Deutsche Bahnhof', sector: 'Usługi', kind: 'state', price: 22, desc: 'Państwowa kolej.' },
        { id: 'BPS', name: 'Bundespost', sector: 'Usługi', kind: 'state', price: 18, desc: 'Państwowa poczta.' },
        { id: 'WiS', name: 'Wolf & Stein Tech.', sector: 'Technologia', subsector: 'Półprzewodniki', kind: 'normal', price: 19, vol: 2.2, desc: 'Mała spółka półprzewodnikowa o gwałtownych notowaniach.' },
        { id: 'SPI', name: 'Spielkonsole Nord', sector: 'Gaming', kind: 'normal', price: 32, desc: 'Konsole i gry; cykl premier.' },
        { id: 'WND', name: 'Windkraft Nordsee', sector: 'Energia', kind: 'normal', price: 44, desc: 'OZE, dotacje.' },
        { id: 'GLB', name: 'Glasbau Thüringen', sector: 'Przemysł', kind: 'normal', price: 62, desc: 'Szkło techniczne i fasady.' },
        { id: 'ROB', name: 'Roboterwerk Stuttgart', sector: ['Technologia', 'Przemysł'], kind: 'normal', price: 150, desc: 'Roboty przemysłowe.' },
        { id: 'QNT', name: 'Quantenfabrik Ulm', sector: 'Technologia', kind: 'normal', price: 260, desc: 'Komputery kwantowe „do pokazania”.' },
        { id: 'FHI', name: 'Fraunhofer-Fälschung Institut', sector: 'Badania', kind: 'normal', price: 45, desc: 'Instytut stosowany, kontrakty z przemysłem.' },
        { id: 'TUM', name: 'Technische Universität Minsterberg', sector: 'Badania', kind: 'normal', price: 38, desc: 'Uczelnia techniczna, spin-offy.' },
        { id: 'RHM', name: 'Rheinmetall-Rhetorik', sector: 'Obronność', kind: 'normal', price: 180, special: 'defense', desc: 'Pojazdy opancerzone.' },
        { id: 'LPD', name: 'Leopard Dynamik', sector: 'Obronność', kind: 'normal', price: 160, special: 'defense', desc: 'Czołgi i serwis.' },
        { id: 'HKS', name: 'Heckler & Kochanek', sector: 'Obronność', kind: 'normal', price: 85, special: 'defense', desc: 'Broń strzelecka.' },
        { id: 'BAU', name: 'Bauhaus-Baumeister', sector: 'Budowlany', kind: 'normal', price: 70, desc: 'Generalny wykonawca.' },
        { id: 'HOC', name: 'Hochtief-Höhenflug', sector: 'Budowlany', kind: 'normal', price: 120, desc: 'Wieżowce i mosty.' },
        { id: 'ALZ', name: 'Allianz-Alles-Versichert', sector: 'Finanse', kind: 'normal', price: 95, desc: 'Ubezpieczenia.' },
        { id: 'BLD', name: 'Bildzeitung Boulevard', sector: 'Media', kind: 'normal', price: 22, desc: 'Tabloid, wpływa na nastroje.' },
        { id: 'VON', name: 'Vonovia-Wohnheim REIT', sector: 'Nieruchomości', kind: 'normal', price: 30, desc: 'Mieszkania na wynajem.' },
        { id: 'BRO', name: 'Bürohochhaus REIT', sector: 'Nieruchomości', kind: 'normal', price: 34, desc: 'Biurowce Frankfurt/Berlin.' },
        { id: 'EWB', name: 'Energiewerke Bund', sector: 'Energia', kind: 'state', price: 24, desc: 'Państwowy koncern energetyczny.' },
        { id: 'NTZ', name: 'Netzbetreiber Deutschland', sector: ['Energia', 'Technologia'], kind: 'state', price: 30, desc: 'Sieci przesyłowe.' },
        { id: 'TKB', name: 'Telekom Bundeswerk', sector: 'Technologia', kind: 'state', price: 20, desc: 'Państwowy operator telekomunikacyjny.' },
        { id: 'KUR', name: 'Kernkraft Rückbau', sector: ['Przemysł', 'Energia'], kind: 'state', price: 26, desc: 'Wygaszanie elektrowni jądrowych.' },
        { id: 'TKS', name: 'Thyssen-Krupps Stahl', sector: 'Przemysł', kind: 'normal', price: 48, desc: 'Stal i konstrukcje; cykl przemysłowy.' },
        { id: 'LND', name: 'Lindwurm Gase', sector: 'Chemia', kind: 'normal', price: 130, desc: 'Gazy techniczne dla przemysłu.' },
        { id: 'MAN', name: 'Mannschaft Nutzfahrzeuge', sector: ['Motoryzacja', 'Przemysł'], kind: 'normal', price: 75, desc: 'Ciężarówki i autobusy.' },
        { id: 'DIH', name: 'Diehl-Defensiv Lenkwaffen', sector: 'Obronność', kind: 'normal', price: 110, special: 'defense', desc: 'Rakiety i systemy obrony powietrznej.' },
        { id: 'HNS', name: 'Hensolt Radar', sector: 'Obronność', kind: 'normal', price: 95, special: 'defense', desc: 'Radary i optoelektronika dla wojska.' },
        { id: 'MRH', name: 'Münchner Rückhalt', sector: 'Finanse', kind: 'normal', price: 210, desc: 'Reasekuracja; kwartalne straty po katastrofach.' },
        { id: 'RWK', name: 'Rheinwestfalen Kraftwerke', sector: 'Energia', kind: 'normal', price: 33, desc: 'Elektrownie węglowe i gazowe w transformacji.' },
        { id: 'WAB', name: 'Wiederaufbaubank', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'state', price: 25, desc: 'Państwowy bank rozwoju.' }
    ]
};

COUNTRY_DEFS.US = {
    id: 'US', name: 'USA', currency: 'USD', region: 'AM', rho: 0.6, rateMean: 0.04,
    operator: { id: 'WSE', name: 'Wall Street Exchange', commission: 0.006 },
    oversight: { name: 'SEC', callThreshold: 0.66, level: 3 },
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
        { id: 'DMPC', name: 'Dunder Mifflin Paper Company, Inc.', sector: 'Przemysł', kind: 'normal', price: 22, vol: 1.1, desc: 'Papier biurowy ze Scranton.' },
        { id: 'AMR', name: 'AmeriRail', sector: 'Usługi', kind: 'state', price: 30, desc: 'Państwowa kolej.' },
        { id: 'USM', name: 'US Mail & Parcel', sector: 'Usługi', kind: 'state', price: 12, desc: 'Państwowa poczta.' },
        { id: 'TVP', name: 'Tennessee Valley Power', sector: 'Energia', kind: 'state', price: 28, desc: 'Państwowa energetyka.' },
        { id: 'FFM', name: 'Fannie & Freddie Mortgage', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'state', price: 15, desc: 'Państwowe hipoteki.' }
    ]
};


COUNTRY_DEFS.CZ = {
    id: 'CZ', name: 'Czechy', currency: 'CZK', region: 'EU', rho: 0.7, rateMean: 0.04,
    operator: { id: 'PX', name: 'Burza Praha (PX)', commission: 0.006 },
    oversight: { name: 'ČNB', callThreshold: 0.66, level: 2 },
    labour: { wages: 0.9, rights: 'standard', unionMult: 0.8, shadow: 2, note: 'standard' },
    companies: [
        { id: 'PIV', name: 'Pivovar Bohemia', sector: 'Alkohole', subsector: 'Piwowarstwo i napoje', kind: 'normal', price: 520, special: 'summer', desc: 'Ulubiona spółka Kozela; upały w lecie podbijają sprzedaż.' },
        { id: 'OVP', name: 'Ovce Pivo', sector: 'Alkohole', subsector: 'Piwowarstwo i napoje', kind: 'normal', price: 310 },
        { id: 'SKA', name: 'Škodar Auto', sector: 'Motoryzacja', kind: 'normal', price: 880 },
        { id: 'CEP', name: 'ČEP Energie', sector: 'Energia', kind: 'normal', price: 650 },
        { id: 'KND', name: 'Knedlík a.s.', sector: 'Żywność', kind: 'normal', price: 240 },
        { id: 'BSK', name: 'Bohemia Sklo', sector: 'Dobra konsumpcyjne', kind: 'normal', price: 410, desc: 'Szkło i kryształy.' },
        { id: 'PRB', name: 'Praha Bank', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'normal', price: 780 },
        { id: 'KRG', name: 'Krecik Group', sector: 'Media', niche: 'TV', kind: 'normal', price: 150 },
        { id: 'CKO', name: 'České Koleje', sector: 'Usługi', kind: 'state', price: 120, desc: 'Państwowa kolej.' }
    ]
};


// =================================================================================
// 0.16.3 G11: Szwecja (7 + 2 państwowe), Szwajcaria (7 + 1), Francja (11 + 2); załącznik B planu 0.16.
// Tagi `special` canopening, vintage, frogs, cocoa i launder dostają mechanikę w G13.
// =================================================================================

COUNTRY_DEFS.SE = {
    id: 'SE', name: 'Szwecja', currency: 'SEK', region: 'EU', rho: 0.7, rateMean: 0.03,
    operator: { id: 'SSE', name: 'Stockholmska Börsen (SSE)', commission: 0.006 },
    oversight: { name: 'Finansinspektionen', callThreshold: 0.9, level: 2 },
    labour: { wages: 1.5, rights: 'ochronne', unionMult: 1.5, shadow: 0, note: 'zadowolenie +5' },
    companies: [
        { id: 'SSA', name: 'Surströmming Stålverk AB', sector: ['Przemysł', 'Rybołówstwo'], kind: 'normal', price: 160, special: 'canopening', desc: 'Stal (cykliczna) i kiszony śledź (stabilny); „otwarcie puszki” to skandal albo viral.' },
        { id: 'IKJ', name: 'IKEJA', sector: 'Dobra konsumpcyjne', kind: 'giant', price: 420, desc: 'Gigant meblowy.' },
        { id: 'VLK', name: 'Volvik', sector: 'Motoryzacja', kind: 'normal', price: 240 },
        { id: 'SPT', name: 'Spotifaj', sector: ['Media', 'Technologia'], kind: 'normal', price: 360 },
        { id: 'ERS', name: 'Ericssen', sector: 'Technologia', kind: 'normal', price: 85, desc: 'Telekomunikacja.' },
        { id: 'SAB', name: 'Saabre Defence', sector: 'Obronność', kind: 'normal', price: 190, special: 'defense' },
        { id: 'OFA', name: 'Östersjö Fiske AB', sector: 'Rybołówstwo', kind: 'normal', price: 70 },
        { id: 'VKF', name: 'Vattenkraft', sector: 'Energia', kind: 'state', price: 90, desc: 'Państwowa energetyka wodna.' },
        { id: 'SYK', name: 'Systemkrogen', sector: 'Alkohole', kind: 'state', price: 110, special: 'loyal', desc: 'Państwowy monopol na sprzedaż alkoholu; stabilna, wysoka dywidenda.' }
    ]
};

COUNTRY_DEFS.CH = {
    id: 'CH', name: 'Szwajcaria', currency: 'CHF', region: 'EU', rho: 0.65, rateMean: 0.01,
    operator: { id: 'SWX', name: 'Giełda Zurychska (SWX)', commission: 0.006 },
    oversight: { name: 'FINMA', callThreshold: 0.9, level: 3 },
    labour: { wages: 1.9, rights: 'standard', unionMult: 0.6, shadow: 0, note: 'standard' },
    companies: [
        { id: 'WSM', name: 'Waschmabank', sector: 'Bankowość', subsector: 'Bank międzynarodowy', kind: 'normal', price: 62, special: 'launder', desc: 'Bank „bez pytań”: pranie pieniędzy mafii; w skarbcu złoto (tylko informacja).' },
        { id: 'MTH', name: 'Matterhornen', sector: 'Żywność', subsector: 'Słodycze', kind: 'normal', price: 74, special: 'cocoa', desc: 'Czekolada; ceny kakao, stabilna dywidenda.' },
        { id: 'UBZ', name: 'UBZ Bankgesellschaft', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'normal', price: 24 },
        { id: 'ROV', name: 'Rochevartis Pharma', sector: 'Medycyna', niche: 'Farmaceutyki', kind: 'giant', price: 105 },
        { id: 'NSK', name: 'Nestlik', sector: 'Żywność', kind: 'giant', price: 98 },
        { id: 'PUH', name: 'Präzision Uhren AG', sector: 'Dobra konsumpcyjne', kind: 'normal', price: 150, desc: 'Zegarki.' },
        { id: 'ASR', name: 'Alpen Ski Resorts', sector: 'Turystyka', kind: 'normal', price: 45, special: 'season' },
        { id: 'ALP', name: 'Alpenpost', sector: 'Usługi', kind: 'state', price: 32, desc: 'Państwowa poczta.' }
    ]
};

COUNTRY_DEFS.FR = {
    id: 'FR', name: 'Francja', currency: 'EUR', region: 'EU', rho: 0.75, rateMean: 0.025,
    operator: { id: 'CAC', name: 'Bourse de Paris (CAC)', commission: 0.006 },
    oversight: { name: 'AMF', callThreshold: 0.75, level: 3 },
    labour: { wages: 1.5, rights: 'ochronne', unionMult: 2.0, shadow: 0, note: 'częste strajki' },
    companies: [
        { id: 'MCG', name: 'Maison Champagnerie', sector: 'Alkohole', kind: 'normal', price: 210, special: 'vintage', desc: 'Co rok losowa jakość winobrania; luksus rośnie w hossie.' },
        { id: 'GRF', name: 'Grenouille & Fils', sector: 'Żywność', kind: 'normal', price: 48, special: 'frogs', desc: 'Żabie udka; sezonowość i protesty ekologów.' },
        { id: 'LVT', name: 'Luxe Vuitonnet', sector: 'Dobra konsumpcyjne', kind: 'giant', price: 640, desc: 'Gigant luksusu.' },
        { id: 'JTM', name: 'Jetaime', sector: 'Dobra konsumpcyjne', kind: 'normal', price: 330, desc: 'Dom mody.' },
        { id: 'BPA', name: 'Beauté Paris', sector: ['Chemia', 'Dobra konsumpcyjne'], kind: 'normal', price: 180, desc: 'Kosmetyki.' },
        { id: 'ABS', name: 'Airbuss', sector: 'Przemysł', kind: 'normal', price: 140, desc: 'Lotnictwo.' },
        { id: 'GPR', name: 'Gaz de Provence', sector: 'Energia', kind: 'normal', price: 38 },
        { id: 'CLK', name: 'Crédit le Krecik', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'normal', price: 12 },
        { id: 'BAG', name: 'Bagieta SA', sector: ['Żywność', 'Budowlany'], kind: 'normal', price: 22 },
        { id: 'CRD', name: 'Croissanterie Dupont', sector: 'Żywność', kind: 'normal', price: 34 },
        { id: 'CAR', name: "Côte d'Azur Resorts", sector: 'Turystyka', kind: 'normal', price: 56 },
        { id: 'ENA', name: 'Électricité Nationale', sector: 'Energia', kind: 'state', price: 28, desc: 'Państwowa energetyka (atom).' },
        { id: 'RDF', name: 'Rail de France', sector: 'Usługi', kind: 'state', price: 20, desc: 'Państwowa kolej.' }
    ]
};

COUNTRY_DEFS.JP = {
    id: 'JP', name: 'Japonia', currency: 'JPY', region: 'AS', rho: 0.6, rateMean: 0.005,
    operator: { id: 'TSE', name: 'Giełda w Tokio (TSE)', commission: 0.005 },
    oversight: { name: 'FSA', callThreshold: 0.75, level: 3 },
    labour: { wages: 1.3, rights: 'standard', unionMult: 0.4, shadow: 0, note: 'lojalność wobec firmy' },
    companies: [
        { id: 'BKG', name: 'Bakugan TV', sector: 'Media', niche: 'TV', kind: 'normal', price: 4200, special: 'anime', desc: 'Hit albo klapa sezonu anime; rośnie z liczbą krajów na giełdzie (eksport kultury).' },
        { id: 'SSM', name: 'SushShama', sector: 'Żywność', kind: 'normal', price: 1800 },
        { id: 'TYM', name: 'Toyotomi Motors', sector: 'Motoryzacja', kind: 'giant', price: 2800, desc: 'Gigant motoryzacyjny.' },
        { id: 'HND', name: 'Hondaru Motors', sector: 'Motoryzacja', kind: 'normal', price: 1500 },
        { id: 'SNE', name: 'Sonic Electronics', sector: ['Technologia', 'Media'], kind: 'normal', price: 3600 },
        { id: 'PKM', name: 'Pokeman', sector: 'Gaming', kind: 'normal', price: 7000 },
        { id: 'MHI', name: 'Mitsubosh Heavy Industries', sector: 'Przemysł', subsector: 'Przemysł ciężki', kind: 'normal', price: 3300 },
        { id: 'ARS', name: 'Araska Corp.', sector: 'Przemysł', subsector: 'Robotyka', kind: 'giant', price: 5200, desc: 'Gigant robotyki.' },
        { id: 'SHK', name: 'Shinkansen Railways', sector: 'Usługi', kind: 'normal', price: 3500 },
        { id: 'SKY', name: 'SaKyoto', sector: 'Alkohole', kind: 'normal', price: 2400 },
        { id: 'YPH', name: 'YellowPharm', sector: 'Medycyna', niche: 'Farmaceutyki', kind: 'normal', price: 4200 },
        { id: 'HTB', name: 'Howam To Bank', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'normal', price: 900 },
        { id: 'SMR', name: 'Samurai', sector: 'Obronność', kind: 'normal', price: 3800 },
        { id: 'NPH', name: 'Nippon Poczta Holding', sector: 'Usługi', kind: 'state', price: 1300, desc: 'Państwowa poczta i bank pocztowy.' },
        { id: 'TPK', name: 'TEPKO Tokio Energia', sector: 'Energia', kind: 'state', price: 1100, desc: 'Państwowa energetyka.' },
        { id: 'JBR', name: 'Japoński Bank Rozwoju', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'state', price: 1600, desc: 'Państwowy bank rozwoju.' }
    ]
};

COUNTRY_DEFS.TW = {
    id: 'TW', name: 'Tajwan', currency: 'TWD', region: 'AS', rho: 0.55, rateMean: 0.02,
    operator: { id: 'TWS', name: 'Giełda Tajpejska (TWSE)', commission: 0.005 },
    oversight: { name: 'FSC', callThreshold: 0.75, level: 2 },
    labour: { wages: 0.9, rights: 'standard', unionMult: 0.4, shadow: 0, note: 'standard' },
    companies: [
        { id: 'KWS', name: 'Krzemowa Wyspa Semiconductor', sector: 'Technologia', subsector: 'Półprzewodniki', kind: 'giant', price: 700, special: 'tension', desc: 'Gigant półprzewodników, dostawca dla AI; napięcie Chiny–Tajwan.' },
        { id: 'FXK', name: 'Foxkon', sector: 'Technologia', kind: 'normal', price: 110, desc: 'Montaż elektroniki.' },
        { id: 'ASU', name: 'Asuss', sector: 'Technologia', kind: 'normal', price: 340 },
        { id: 'FMC', name: 'Formoza Chemia', sector: 'Chemia', kind: 'normal', price: 90 },
        { id: 'BBT', name: 'Bubble Tea Taipei', sector: 'Żywność', kind: 'normal', price: 55 },
        { id: 'TPF', name: 'Taipower Formosa', sector: 'Energia', kind: 'state', price: 45, desc: 'Państwowa energetyka.' }
    ]
};

COUNTRY_DEFS.CN = {
    id: 'CN', name: 'Chiny', currency: 'CNY', region: 'AS', rho: 0.45, rateMean: 0.03,
    operator: { id: 'SHG', name: 'Giełda w Szanghaju (SHG)', commission: 0.005 },
    oversight: { name: 'CSRC', callThreshold: 0.66, level: 1 },
    labour: { wages: 0.6, rights: 'liberalne', unionMult: 0.2, shadow: 5, note: 'związki państwowe' },
    companies: [
        { id: 'ALB', name: 'Alibaka Group', sector: ['Technologia', 'Usługi'], kind: 'giant', price: 90, desc: 'Gigant e-commerce.' },
        { id: 'TNC', name: 'Tencentyl', sector: ['Technologia', 'Media'], kind: 'giant', price: 380, desc: 'Gigant komunikatorów i gier.' },
        { id: 'HUI', name: 'Huiei Telecom', sector: 'Technologia', kind: 'normal', price: 60, special: 'sanctions', desc: 'Ryzyko sankcji.' },
        { id: 'BYD', name: 'BuildYourDream Motors', sector: 'Motoryzacja', kind: 'normal', price: 110, desc: 'Auta elektryczne.' },
        { id: 'WMC', name: 'Wielcy Murarze Chińscy', sector: 'Budowlany', kind: 'normal', price: 24 },
        { id: 'FSI', name: 'Fabryka Świata Industries', sector: 'Przemysł', kind: 'normal', price: 40 },
        { id: 'SRE', name: 'Smok Rare Earths', sector: 'Przemysł', subsector: 'Przemysł ciężki', kind: 'normal', price: 75, special: 'rareearths', desc: 'Metale ziem rzadkich.' },
        { id: 'RPL', name: 'RicePlantators', sector: 'Żywność', kind: 'normal', price: 12, desc: 'Start na giełdzie brązowej.' },
        { id: 'PND', name: 'PanDa Bank', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'normal', price: 8, desc: 'Parabank: wysokie oprocentowanie lokat, ryzyko upadku jak Amber Gold (mechanika parabanku z 0.11).' },
        { id: 'TTM', name: 'TikTak Media', sector: 'Media', kind: 'giant', price: 120, desc: 'Gigant krótkich filmów.' },
        { id: 'JDL', name: 'Jedwabn Logistyka', sector: 'Usługi', kind: 'normal', price: 30 },
        { id: 'HYN', name: 'Herbata Yunnan', sector: 'Żywność', subsector: 'Herbata', kind: 'normal', price: 55 },
        { id: 'DAJ', name: 'Daj', sector: 'Żywność', kind: 'normal', price: 18, desc: 'Sprzedaż jaj.' },
        { id: 'PSE', name: 'Państwowa Sieć Energetyczna', sector: 'Energia', kind: 'state', price: 14, desc: 'Państwowa energetyka.' },
        { id: 'CKN', name: 'Chińska Kolej Narodowa', sector: 'Budowlany', kind: 'state', price: 9, desc: 'Państwowa kolej.' },
        { id: 'LBR', name: 'Ludowy Bank Rolny', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'state', price: 5, desc: 'Państwowy bank rolny.' },
        { id: 'SNN', name: 'Sinochem Narodowy', sector: 'Chemia', kind: 'state', price: 22, desc: 'Państwowy koncern chemiczny.' }
    ]
};

COUNTRY_DEFS.IN = {
    id: 'IN', name: 'Indie', currency: 'INR', region: 'AS', rho: 0.5, rateMean: 0.065,
    operator: { id: 'BSE', name: 'Giełda w Bombaju (BSE)', commission: 0.005 },
    oversight: { name: 'SEBI', callThreshold: 0.66, level: 2 },
    labour: { wages: 0.3, rights: 'liberalne', unionMult: 0.8, shadow: 10, note: 'duża szara strefa' },
    companies: [
        { id: 'CMS', name: 'Curry Masala Ltd', sector: 'Żywność', kind: 'normal', price: 900, special: 'monsoon', desc: 'Ceny przypraw, sezon monsunowy.' },
        { id: 'BWS', name: 'Bollywood Studios', sector: 'Media', niche: 'Rozrywka', kind: 'normal', price: 650, special: 'bollywood', desc: 'Co kwartał premiera: hit albo klapa.' },
        { id: 'HSR', name: 'HelloSir!', sector: 'Technologia', kind: 'giant', price: 1500, desc: 'Gigant IT (outsourcing).' },
        { id: 'GNG', name: 'GangesGroup', sector: 'Medycyna', niche: 'Farmaceutyki', kind: 'normal', price: 1100, desc: 'Leki generyczne.' },
        { id: 'MTA', name: 'Mata Group', sector: ['Przemysł', 'Motoryzacja'], kind: 'normal', price: 2400 },
        { id: 'RLJ', name: 'Relajans Industries', sector: ['Energia', 'Przemysł'], kind: 'normal', price: 2800 },
        { id: 'BOB', name: 'Bank of Bharat', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'normal', price: 700 },
        { id: 'IEX', name: 'Indian Express', sector: 'Usługi', kind: 'normal', price: 600 },
        { id: 'TMH', name: 'Taj Mahal Hotels', sector: 'Turystyka', kind: 'normal', price: 1900 },
        { id: 'KRK', name: 'Karakorum', sector: 'Obronność', kind: 'normal', price: 1500 },
        { id: 'IKP', name: 'Indyjskie Koleje Państwowe', sector: 'Usługi', kind: 'state', price: 450, desc: 'Państwowa kolej.' },
        { id: 'WGI', name: 'Węgiel Indii', sector: 'Przemysł', kind: 'state', price: 380, desc: 'Państwowe kopalnie węgla.' },
        { id: 'NRG', name: 'Narodowa Ropa i Gaz Indii', sector: 'Energia', kind: 'state', price: 260, desc: 'Państwowy koncern paliwowy.' },
        { id: 'NUB', name: 'Narodowe Ubezpieczenia Bharat', sector: 'Bankowość', subsector: 'Bank komercyjny', kind: 'state', price: 520, desc: 'Państwowy ubezpieczyciel.' }
    ]
};
