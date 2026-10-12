// =================================================================================
// companies.js: Spółki: technologie i R&D, opisy i prezesi, model spółek i wyników, dywidendy, inwestycje, startupy, zbrojeniówka, księgowość i audyt.
// Złączone pliki: technologies.js, descriptions.js, companies.js, dividends.js, investments.js, startups.js, defense.js, accounting.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## technologies.js
// #################################################################################

// Plik: technologies.js
const RESEARCH_MAINTENANCE_COST = 50; // Np. 50 PLN na tydzień czasu gry

const technologies = {
    // ### BADANIA OGÓLNE (dla wszystkich sektorów) ###
    'COMMON_MANAGEMENT_1': { name: "Szkolenie Agile",minResearchLevel: 2, description: "Wdrożenie zwinnych metodyk zarządzania projektami poprawia ogólną kondycję finansową firmy.", type: "wzmacnianie rozwoju", cost: 120, initialCashCost: 1200, sector: 'common', icon: '🧑‍🏫', applyEffect: (stock) => { stock.financialHealth += 0.5; logEvent(`🎓 Wdrożenie Agile w ${stock.name} poprawia jej kondycję.`); } },
    'COMMON_MARKETING_1': { name: "Kampania Marketingowa Online", description: "Zwiększona obecność w mediach społecznościowych pozytywnie wpływa na postrzeganie marki i cenę akcji.", type: "wzmacnianie pozycji na rynku", cost: 150, initialCashCost: 1500, sector: 'common', icon: '📈', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.03, 'positive'); logEvent(`📣 Udana kampania marketingowa podnosi wycenę ${stock.name}!`); } },
    'COMMON_LOGISTICS_1': { name: "Optymalizacja Logistyki", description: "Usprawnienie łańcucha dostaw zmniejsza wahania kursu związane z opóźnieniami.", type: "wzmacnianie ceny i zysków", cost: 180, initialCashCost: 1800, sector: 'common', icon: '🚚', applyEffect: (stock) => { stock.volatilityFactor *= 0.95; } },
    'COMMON_HR_1': { name: "Program Benefitów Pracowniczych", description: "Wprowadzenie benefitów pozapłacowych zwiększa satysfakcję załogi i stabilność operacyjną firmy.", type: "wzmacnianie rozwoju", cost: 100, initialCashCost: 1000, sector: 'common', icon: '🎁', applyEffect: (stock) => { stock.financialHealth += 0.25; stock.volatilityFactor *= 0.98; } },
    'COMMON_ECO_1': { name: "Certyfikat Eko-Odpowiedzialności", description: "Uzyskanie certyfikatu ekologicznego poprawia wizerunek firmy i przyciąga nowych inwestorów.", type: "wzmacnianie pozycji na rynku", cost: 200, initialCashCost: 2000, sector: 'common', icon: '🌿', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.04, 'positive'); } },
    'COMMON_IT_1': { name: "System ERP", description: "Wdrożenie zintegrowanego systemu planowania zasobów przedsiębiorstwa zwiększa efektywność.", type: "wzmacnianie rozwoju", cost: 300, initialCashCost: 3000, sector: 'common', icon: '💻', applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'COMMON_FINANCE_1': { name: "Zaawansowany Audyt Finansowy",minResearchLevel: 2, description: "Przeprowadzenie dogłębnego audytu pozwala zoptymalizować koszty i zwiększyć rentowność.", type: "wzmacnianie ceny i zysków", cost: 220, initialCashCost: 2200, sector: 'common', icon: '💰', applyEffect: (stock) => { stock.financialHealth += 0.5; stock.volatilityFactor *= 0.97; } },
    'COMMON_SECURITY_1': { name: "Systemy Cyberbezpieczeństwa", description: "Nowoczesne systemy ochrony danych zmniejszają ryzyko kryzysów wizerunkowych i kar finansowych.", type: "wzmacnianie rozwoju", cost: 280, initialCashCost: 2800, sector: 'common', icon: '🛡️', applyEffect: (stock) => { stock.volatilityFactor *= 0.92; } },
    'COMMON_AUTOMATION_1': { name: "Automatyzacja Procesów Biznesowych", description: "Automatyzacja powtarzalnych zadań biurowych obniża koszty i przyspiesza działanie firmy.", type: "wzmacnianie ceny i zysków", cost: 350, initialCashCost: 3500, sector: 'common', icon: '🤖', applyEffect: (stock) => { stock.financialHealth += 1.2; } },
    'COMMON_LEGAL_1': { name: "Optymalizacja Podatkowa",minResearchLevel: 2, description: "Nowa strategia podatkowa pozwala na legalne obniżenie obciążeń fiskalnych, co zwiększa zysk netto.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'common', icon: '🧾', applyEffect: (stock) => { stock.financialHealth += 1.5; } },
    'COMMON_DATA_1': { name: "Analityka Big Data", description: "Wdrożenie narzędzi do analizy dużych zbiorów danych pozwala lepiej przewidywać trendy rynkowe.", type: "wzmacnianie pozycji na rynku", cost: 320, initialCashCost: 3200, sector: 'common', icon: '📊', applyEffect: (stock) => { stock.volatilityFactor *= 0.90; } },
    'COMMON_EXPANSION_1': { name: "Badanie Rynków Zagranicznych",minResearchLevel: 2, description: "Analiza potencjału eksportowego otwiera drzwi do przyszłej ekspansji i nowych źródeł przychodu.", type: "wzmacnianie rozwoju", cost: 250, initialCashCost: 2500, sector: 'common', icon: '🌍', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.05, 'positive'); } },

    // ### BADANIA SEKTOROWE (9 TECHNOLOGII NA SEKTOR) ###

    // Przemysł
    'INDUSTRY_STEEL_1': { name: "Wzmocniona Stal", icon: '🔩', description: "Nowy stop stali jest lżejszy i bardziej wytrzymały.", type: "wzmacnianie ceny i zysków", cost: 200, initialCashCost: 2000, sector: 'Przemysł', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.04, 'positive'); } },
    'INDUSTRY_EXCAVATOR_1': { name: "Nowoczesne Koparki", icon: '🏗️', description: "Większa wydajność maszyn budowlanych przyspiesza realizację kontraktów.", type: "wzmacnianie rozwoju", cost: 220, initialCashCost: 2200, sector: 'Przemysł', applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'INDUSTRY_PLASTAL_1': { name: "Plastal",minResearchLevel: 2, icon: '🧱', description: "Opatentowanie nowego, ultralekkiego kompozytu otwiera rynek premium.", type: "wzmacnianie ceny i zysków", cost: 300, initialCashCost: 3000, sector: 'Przemysł', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.08, 'positive'); } },
    'INDUSTRY_LOGISTICS_1': { name: "Logistyka Just-In-Time", icon: '📦', description: "Perfekcyjna logistyka redukuje koszty magazynowania.", type: "wzmacnianie rozwoju", cost: 180, initialCashCost: 1800, sector: 'Przemysł', applyEffect: (stock) => { stock.financialHealth += 0.8; } },
    'INDUSTRY_ROBO_1': { name: "Roboinżynieria",minResearchLevel: 2, icon: '🦾', description: "Automatyzacja linii produkcyjnej zwiększa wydajność i jakość.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'Przemysł', applyEffect: (stock) => { stock.financialHealth += 1.2; stock.volatilityFactor *= 0.95; } },
    'INDUSTRY_TRAINING_1': { name: "Szkolenia Pracowników", icon: '👷', description: "Podniesienie kwalifikacji załogi poprawia bezpieczeństwo i efektywność.", type: "wzmacnianie rozwoju", cost: 150, initialCashCost: 1500, sector: 'Przemysł', applyEffect: (stock) => { stock.financialHealth += 0.5; } },
    'INDUSTRY_QUANTUM_BARRACKS_1': { name: "Baraki Kwantowe",minResearchLevel: 2, icon: '🌌', description: "Zastosowanie fizyki kwantowej do... budowy baraków? Brzmi innowacyjnie.", type: "wzmacnianie pozycji na rynku", cost: 500, initialCashCost: 5000, sector: 'Przemysł', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.10, 'positive'); } },
    'INDUSTRY_SUPERMETAL_1': { name: "Supermetal", icon: '✨', description: "Odkrycie stopu o niemal niezniszczalnych właściwościach.", type: "wzmacnianie ceny i zysków", cost: 700, initialCashCost: 7000, sector: 'Przemysł', applyEffect: (stock) => { stock.volatilityFactor *= 0.7; applyPriceEffect(stock.symbol, 0.15, 'positive'); } },
    'INDUSTRY_TRUCK_1': { name: "Powiększone Ciężarówki", icon: '🚛', description: "Zwiększenie ładowności floty transportowej o 15%. Proste i skuteczne.", type: "wzmacnianie rozwoju", cost: 240, initialCashCost: 2400, sector: 'Przemysł', applyEffect: (stock) => { stock.financialHealth += 1.1; } },

    // Bankowość
    'BANKING_EWALLET_1': { name: "E-Bankowość Mobilna", icon: '📱', description: "Nowa, intuicyjna aplikacja mobilna przyciąga młodszych klientów.", type: "wzmacnianie pozycji na rynku", cost: 250, initialCashCost: 2500, sector: 'Bankowość', applyEffect: (stock) => { stock.financialHealth += 0.75; } },
    'BANKING_CRYPTO_1': { name: "Integracja z Kryptowalutami", icon: '₿', description: "Możliwość handlu kryptowalutami przyciąga nowych, ryzykujących inwestorów.", type: "wzmacnianie pozycji na rynku", cost: 350, initialCashCost: 3500, sector: 'Bankowość', applyEffect: (stock) => { stock.volatilityFactor *= 1.2; applyPriceEffect(stock.symbol, 0.05, 'positive');} },
    'BANKING_AI_ADVISOR_1': { name: "Doradca Inwestycyjny AI", icon: '🤖', description: "Automatyczny doradca pomaga klientom w zarządzaniu portfelem, zwiększając przychody z opłat.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'Bankowość', applyEffect: (stock) => { stock.financialHealth += 1.5; } },
    'BANKING_SECURITY_2': { name: "Sejfy w Innym Wymiarze",minResearchLevel: 2, icon: '🌀', description: "Przełomowa, kwantowa technologia zabezpieczeń staje się legendą na rynku.", type: "wzmacnianie pozycji na rynku", cost: 500, initialCashCost: 5000, sector: 'Bankowość', applyEffect: (stock) => { stock.volatilityFactor *= 0.8; stock.financialHealth += 1.0; } },
    'BANKING_PAPER_1': { name: "Lepszy Papier do Banknotów", icon: '💵', description: "Opracowanie trwalszego i bezpieczniejszego materiału na banknoty.", type: "wzmacnianie rozwoju", cost: 180, initialCashCost: 1800, sector: 'Bankowość', applyEffect: (stock) => { stock.financialHealth += 0.6; } },
    'BANKING_PRINTER_1': { name: "Drukarki Pieniędzy", icon: '🖨️', description: "Usprawnienie procesu druku banknotów. Plotki mówią, że czasem się 'zacina' i drukuje za dużo...", type: "wzmacnianie ceny i zysków", cost: 280, initialCashCost: 2800, sector: 'Bankowość', applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'BANKING_CRASH_AI_1': { name: "AI Przewidujące Krachy",minResearchLevel: 2, icon: '🔮', description: "System wczesnego ostrzegania przed kryzysami, co znacząco stabilizuje portfel banku.", type: "wzmacnianie rozwoju", cost: 600, initialCashCost: 6000, sector: 'Bankowość', applyEffect: (stock) => { stock.volatilityFactor *= 0.75; } },
    'BANKING_UNLIMITED_CARD_1': { name: "Nielimitowane Karty Kredytowe", icon: '💳', description: "Oferta kart kredytowych bez limitu dla najbogatszych klientów. Bardzo dochodowe, bardzo ryzykowne.", type: "wzmacnianie ceny i zysków", cost: 450, initialCashCost: 4500, sector: 'Bankowość', applyEffect: (stock) => { stock.financialHealth += 2.0; stock.volatilityFactor *= 1.3; } },

    // Żywność
    'FOOD_ECO_PACKAGING_1': { name: "Ekoplastik", icon: '♻️', description: "Biodegradowalne opakowania poprawiają wizerunek firmy.", type: "wzmacnianie pozycji na rynku", cost: 160, initialCashCost: 1600, sector: 'Żywność', applyEffect: (stock) => { stock.financialHealth += 0.4; } },
    'FOOD_TASTER_1': { name: "Automatyczni Testerzy Żywności", icon: '🧪', description: "System AI do kontroli jakości eliminuje ryzyko wadliwych partii produktu.", type: "wzmacnianie rozwoju", cost: 200, initialCashCost: 2000, sector: 'Żywność', applyEffect: (stock) => { stock.volatilityFactor *= 0.9; } },
    'FOOD_HYDRO_1': { name: "Baseny Hydroponiczne", icon: '🌱', description: "Własne uprawy hydroponiczne uniezależniają firmę od wahań cen na rynku rolnym.", type: "wzmacnianie ceny i zysków", cost: 300, initialCashCost: 3000, sector: 'Żywność', applyEffect: (stock) => { stock.financialHealth += 1.0; stock.volatilityFactor *= 0.92; } },
    'FOOD_VITAMIN_1': { name: "Sok Multiwitamina",minResearchLevel: 2, icon: '🧃', description: "Wprowadzenie na rynek nowego, prozdrowotnego produktu staje się hitem sprzedażowym.", type: "wzmacnianie pozycji na rynku", cost: 220, initialCashCost: 2200, sector: 'Żywność', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.06, 'positive'); } },
    'FOOD_NO_ROT_1': { name: "Niegnijąca Mąka",minResearchLevel: 2, icon: '🍞', description: "Opatentowanie metody przechowywania, która rewolucjonizuje logistykę i zapasy.", type: "wzmacnianie rozwoju", cost: 280, initialCashCost: 2800, sector: 'Żywność', applyEffect: (stock) => { stock.financialHealth += 1.2; } },
    'FOOD_EDIBLE_CUP_1': { name: "Jadalne Kubki",minResearchLevel: 2, icon: '☕', description: "Innowacyjny, ekologiczny produkt, który staje się viralem w mediach.", type: "wzmacnianie pozycji na rynku", cost: 190, initialCashCost: 1900, sector: 'Żywność', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.05, 'positive'); } },
    'FOOD_BOWL_1': { name: "Chlebowe Miski", icon: '🥣', description: "Wprowadzenie jadalnych misek do zup. Genialne w swojej prostocie.", type: "wzmacnianie pozycji na rynku", cost: 150, initialCashCost: 1500, sector: 'Żywność', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.03, 'positive'); } },
    'FOOD_3D_MEAT_1': { name: "Mięso z Drukarki 3D", icon: '🥩', description: "Rozpoczęcie produkcji syntetycznego mięsa, które idealnie imituje prawdziwe.", type: "wzmacnianie cen i zysków", cost: 500, initialCashCost: 5000, sector: 'Żywność', applyEffect: (stock) => { stock.financialHealth += 1.8; } },
    'FOOD_STUDENT_MIX_1': { name: "Mieszanka Studencka Premium", icon: '🥜', description: "Nowa, luksusowa wersja mieszanki studenckiej z rzadkimi orzechami. Hit w korporacjach.", type: "wzmacnianie ceny i zysków", cost: 120, initialCashCost: 1200, sector: 'Żywność', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.02, 'positive'); } },

    // Gaming
    'GAMING_CONSOLE_1': { name: "Nowa Konsola", icon: '🎮', description: "Wypuszczenie własnej konsoli tworzy zamknięty, dochodowy ekosystem.", type: "wzmacnianie pozycji na rynku", cost: 1000, initialCashCost: 10000, sector: 'Gaming', applyEffect: (stock) => { stock.financialHealth += 3; applyPriceEffect(stock.symbol, 0.20, 'positive'); } },
    'GAMING_VR_1': { name: "Gry na Okulary VR", icon: '🕶️', description: "Wejście na nową, obiecującą platformę VR przyciąga entuzjastów technologii.", type: "wzmacnianie rozwoju", cost: 300, initialCashCost: 3000, sector: 'Gaming', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.07, 'positive'); } },
    'GAMING_ADDICTION_1': { name: "System Uzależniania Graczy",minResearchLevel: 2, icon: '🎰', description: "Kontrowersyjny, ale skuteczny system pętli behawioralnych maksymalizuje przychody.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'Gaming', applyEffect: (stock) => { stock.financialHealth += 2.0; stock.volatilityFactor *= 1.1; } },
    'GAMING_SLEEP_1': { name: "Granie Przez Sen",minResearchLevel: 2, icon: '😴', description: "Technologia pozwalająca na zdobywanie postępów w grze podczas snu. Gracze to kochają.", type: "wzmacnianie pozycji na rynku", cost: 600, initialCashCost: 6000, sector: 'Gaming', applyEffect: (stock) => { stock.financialHealth += 1.5; } },
    'GAMING_ENGINE_1': { name: "Własny Silnik Graficzny", icon: '🖼️', description: "Stworzenie własnego silnika uniezależnia od zewnętrznych firm i obniża koszty.", type: "wzmacnianie rozwoju", cost: 500, initialCashCost: 5000, sector: 'Gaming', applyEffect: (stock) => { stock.financialHealth += 1.0; stock.volatilityFactor *= 0.9; } },
    'GAMING_CLOUD_1': { name: "Granie w Chmurze", icon: '☁️', description: "Uruchomienie własnej platformy do streamingu gier otwiera nowe źródło subskrypcji.", type: "wzmacnianie ceny i zysków", cost: 700, initialCashCost: 7000, sector: 'Gaming', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.15, 'positive'); } },
    'GAMING_AI_QUEST_1': { name: "AI Generujące Questy", icon: '✍️', description: "System AI, który tworzy nieskończoną liczbę zadań dla graczy, utrzymując ich zaangażowanie.", type: "wzmacnianie pozycji na rynku", cost: 450, initialCashCost: 4500, sector: 'Gaming', applyEffect: (stock) => { stock.financialHealth += 1.2; } },
    'GAMING_DREAM_MICRO_1': { name: "Mikrotransakcje w Snach", icon: '🌙', description: "Gracze mogą kupować przedmioty we śnie. Zyski są nierealne.", type: "wzmacnianie ceny i zysków", cost: 900, initialCashCost: 9000, sector: 'Gaming', applyEffect: (stock) => { stock.financialHealth += 4.0; } },
    'GAMING_PORTABLE_PAD_1': { name: "Przenośne Pady", icon: '🕹️', description: "Kompaktowe, wysokiej jakości kontrolery do gier mobilnych stają się rynkowym hitem.", type: "wzmacnianie pozycji na rynku", cost: 250, initialCashCost: 2500, sector: 'Gaming', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.06, 'positive'); } },

    // Technologia
    'TECH_CLOUD_2': { name: "Chmura w Chmurze", icon: '☁️', description: "Abstrakcyjna optymalizacja infrastruktury chmurowej, która (podobno) działa.", type: "wzmacnianie rozwoju", cost: 300, initialCashCost: 3000, sector: 'Technologia', applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'TECH_ZERO_G_1': { name: "Serwery w Stanie Nieważkości", icon: '🛰️', description: "Przechowywanie danych na orbicie zmniejsza koszty chłodzenia i jest bardzo medialne.", type: "wzmacnianie pozycji na rynku", cost: 800, initialCashCost: 8000, sector: 'Technologia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.18, 'positive'); } },
    'TECH_PATENT_1': { name: "Nowe Patenty", icon: '⚖️', description: "Zabezpieczenie kluczowych technologii patentami generuje stały dochód z licencji.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'Technologia', applyEffect: (stock) => { stock.financialHealth += 1.5; } },
    'TECH_AGENT_AI_1': { name: "Agenci AI", icon: '🤖', description: "Autonomiczni agenci AI, którzy samodzielnie piszą i sprzedają oprogramowanie.", type: "wzmacnianie ceny i zysków", cost: 1200, initialCashCost: 12000, sector: 'Technologia', applyEffect: (stock) => { stock.financialHealth += 4; } },
    'TECH_FAB_1': { name: "Fabryki Komponentów", icon: '🏭', description: "Budowa własnej fabryki półprzewodników uniezależnia od azjatyckich dostawców.", type: "wzmacnianie rozwoju", cost: 900, initialCashCost: 9000, sector: 'Technologia', applyEffect: (stock) => { stock.volatilityFactor *= 0.7; stock.financialHealth += 2.0; } },
    'TECH_QUANTUM_1': { name: "Komputery Kwantowe",minResearchLevel: 2, icon: '⚛️', description: "Przełom w obliczeniach kwantowych daje firmie ogromną przewagę technologiczną.", type: "wzmacnianie pozycji na rynku", cost: 1500, initialCashCost: 15000, sector: 'Technologia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.30, 'positive'); } },
    'TECH_HOLO_1': { name: "Holograficzne Telekonferencje",minResearchLevel: 2, icon: '👨‍🚀', description: "System do telekonferencji, który wyświetla rozmówców jako trójwymiarowe hologramy.", type: "wzmacnianie pozycji na rynku", cost: 600, initialCashCost: 6000, sector: 'Technologia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.12, 'positive'); } },
    'TECH_SELF_WRITE_1': { name: "Samospisujące się Oprogramowanie", icon: '✍️', description: "Stworzenie kodu, który sam się rozwija i naprawia. Przerażające i genialne.", type: "wzmacnianie rozwoju", cost: 2000, initialCashCost: 20000, sector: 'Technologia', applyEffect: (stock) => { stock.financialHealth += 5; } },
    'TECH_NEURAL_1': { name: "Neuralink-as-a-Service",minResearchLevel: 2, icon: '🧠', description: "Platforma chmurowa do zarządzania implantami neuronowymi. Przyszłość jest teraz.", type: "wzmacnianie ceny i zysków", cost: 1800, initialCashCost: 18000, sector: 'Technologia', applyEffect: (stock) => { stock.financialHealth += 3; applyPriceEffect(stock.symbol, 0.20, 'positive'); } },

    // Nieruchomości
    'REALTY_SMART_HOME_1': { name: "System Smart Home", icon: '🏠', description: "Integracja mieszkań z systemem inteligentnego domu staje się standardem w ofercie.", type: "wzmacnianie ceny i zysków", cost: 250, initialCashCost: 2500, sector: 'Nieruchomości', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.05, 'positive'); } },
    'REALTY_MODULAR_1': { name: "Budownictwo Modułowe", icon: '📦', description: "Wdrożenie technologii budowy z prefabrykatów skraca czas i obniża koszty inwestycji.", type: "wzmacnianie rozwoju", cost: 350, initialCashCost: 3500, sector: 'Nieruchomości', applyEffect: (stock) => { stock.financialHealth += 1.5; } },
    'REALTY_3DPRINT_1': { name: "Domy z Drukarki 3D",minResearchLevel: 2, icon: '🖨️', description: "Zastosowanie druku 3D do wznoszenia budynków rewolucjonizuje rynek budowlany.", type: "wzmacnianie rozwoju", cost: 600, initialCashCost: 6000, sector: 'Nieruchomości', applyEffect: (stock) => { stock.financialHealth += 2.0; stock.volatilityFactor *= 0.85; } },
    'REALTY_GREEN_ROOF_1': { name: "Zielone Dachy", icon: '🌿', description: "Standardowe wyposażanie budynków w zielone dachy i systemy odzysku wody.", type: "wzmacnianie pozycji na rynku", cost: 200, initialCashCost: 2000, sector: 'Nieruchomości', applyEffect: (stock) => { stock.financialHealth += 0.5; applyPriceEffect(stock.symbol, 0.03, 'positive'); } },
    'REALTY_METAVERSE_1': { name: "Wirtualne Nieruchomości", icon: '🌐', description: "Sprzedaż działek i apartamentów w popularnym metawersum jako nowa gałąź biznesu.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'Nieruchomości', applyEffect: (stock) => { stock.financialHealth += 1.0; stock.volatilityFactor *= 1.2; } },
    'REALTY_ANTIGRAV_1': { name: "Antygrawitacyjne Fundamenty",minResearchLevel: 2, icon: '🚀', description: "Pozwalają budować na dowolnym terenie. Fizycy twierdzą, że to niemożliwe, ale działa.", type: "wzmacnianie pozycji na rynku", cost: 1500, initialCashCost: 15000, sector: 'Nieruchomości', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.35, 'positive'); } },
    'REALTY_UNDERGROUND_1': { name: "Luksusowe Bunkry", icon: ' bunkers.png', description: "Budowa luksusowych, samowystarczalnych bunkrów dla najbogatszych.", type: "wzmacnianie ceny i zysków", cost: 700, initialCashCost: 7000, sector: 'Nieruchomości', applyEffect: (stock) => { stock.financialHealth += 2.2; } },
    'REALTY_AI_ARCHITECT_1': { name: "Architekt AI",minResearchLevel: 2, icon: '🏛️', description: "AI, która projektuje zoptymalizowane i piękne budynki w ułamku sekundy.", type: "wzmacnianie rozwoju", cost: 450, initialCashCost: 4500, sector: 'Nieruchomości', applyEffect: (stock) => { stock.financialHealth += 1.8; } },
    'REALTY_DYNAMIC_WALLS_1': { name: "Dynamiczne Ściany", icon: '🧱', description: "System przesuwnych ścian pozwalający na dowolną rekonfigurację mieszkania.", type: "wzmacnianie pozycji na rynku", cost: 380, initialCashCost: 3800, sector: 'Nieruchomości', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.07, 'positive'); } },

    // Energia
    'ENERGY_FUSION_1': { name: "Reaktor Fuzyjny",minResearchLevel: 2, icon: '☀️', description: "Przełom w badaniach nad fuzją jądrową obiecuje tanią, czystą energię.", type: "wzmacnianie pozycji na rynku", cost: 2000, initialCashCost: 20000, sector: 'Energia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.50, 'positive'); stock.financialHealth += 2; } },
    'ENERGY_BATTERY_1': { name: "Magazyny Bateryjne", icon: '🔋', description: "Rozwój technologii magazynowania energii stabilizuje sieć i zyski.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'Energia', applyEffect: (stock) => { stock.volatilityFactor *= 0.8; } },
    'ENERGY_WIRELESS_1': { name: "Bezprzewodowy Przesył Energii", icon: '📡', description: "Technologia przesyłu energii na odległość eliminuje potrzebę budowy drogich linii energetycznych.", type: "wzmacnianie pozycji na rynku", cost: 1200, initialCashCost: 12000, sector: 'Energia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.30, 'positive'); } },
    'ENERGY_SMART_GRID_1': { name: "Inteligentna Sieć (Smart Grid)", icon: '🌐', description: "Sieć energetyczna, która sama zarządza popytem i podażą, minimalizując straty.", type: "wzmacnianie rozwoju", cost: 500, initialCashCost: 5000, sector: 'Energia', applyEffect: (stock) => { stock.financialHealth += 2.0; stock.volatilityFactor *= 0.88; } },
    'ENERGY_BLACK_HOLE_1': { name: "Energia z Osobliwości",minResearchLevel: 2, icon: '⚫', description: "Niezwykle wydajne, choć nieco niepokojące źródło energii.", type: "wzmacnianie ceny i zysków", cost: 3000, initialCashCost: 30000, sector: 'Energia', applyEffect: (stock) => { stock.financialHealth += 10; } },
    'ENERGY_GEO_1': { name: "Geotermia Głębinowa", icon: '🌋', description: "Odwierty do jądra Ziemi pozwalają na pozyskanie niemal nieskończonej energii.", type: "wzmacnianie rozwoju", cost: 800, initialCashCost: 8000, sector: 'Energia', applyEffect: (stock) => { stock.financialHealth += 3.0; } },
    'ENERGY_KINETIC_1': { name: "Płytki Kinetyczne",minResearchLevel: 2, icon: '🚶', description: "Płytki chodnikowe, które generują energię z kroków przechodniów.", type: "wzmacnianie pozycji na rynku", cost: 300, initialCashCost: 3000, sector: 'Energia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.05, 'positive'); } },
    'ENERGY_SOLAR_PAINT_1': { name: "Farba Fotowoltaiczna",minResearchLevel: 2, icon: '🎨', description: "Farba, którą można pomalować dowolną powierzchnię, zamieniając ją w panel słoneczny.", type: "wzmacnianie ceny i zysków", cost: 600, initialCashCost: 6000, sector: 'Energia', applyEffect: (stock) => { stock.financialHealth += 1.5; applyPriceEffect(stock.symbol, 0.10, 'positive'); } },
    'ENERGY_ALGAE_1': { name: "Biopaliwo z Alg", icon: '🌿', description: "Wydajne i ekologiczne paliwo produkowane w bioreaktorach z alg.", type: "wzmacnianie rozwoju", cost: 450, initialCashCost: 4500, sector: 'Energia', applyEffect: (stock) => { stock.financialHealth += 1.2; } },

    // Chemia
    'CHEM_GRAPHENE_1': { name: "Produkcja Grafenu", icon: '✒️', description: "Opanowanie masowej produkcji grafenu otwiera drzwi do rewolucji materiałowej.", type: "wzmacnianie pozycji na rynku", cost: 900, initialCashCost: 9000, sector: 'Chemia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.25, 'positive'); } },
    'CHEM_SELF_HEAL_1': { name: "Polimery Samonaprawiające", icon: '🩹', description: "Tworzywa sztuczne, które same 'leczą' pęknięcia i zarysowania.", type: "wzmacnianie ceny i zysków", cost: 500, initialCashCost: 5000, sector: 'Chemia', applyEffect: (stock) => { stock.financialHealth += 1.5; applyPriceEffect(stock.symbol, 0.05, 'positive'); } },
    'CHEM_SMART_PAINT_1': { name: "Inteligentne Farby", icon: '🎨', description: "Farby, które zmieniają kolor w zależności od temperatury lub nastroju.", type: "wzmacnianie pozycji na rynku", cost: 300, initialCashCost: 3000, sector: 'Chemia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.08, 'positive'); } },
    'CHEM_ALCHEMY_1': { name: "Alchemia Stosowana", icon: '🧪', description: "Transmutacja ołowiu w złoto. Wciąż na etapie eksperymentalnym, ale rynek jest podekscytowany.", type: "wzmacnianie ceny i zysków", cost: 2500, initialCashCost: 25000, sector: 'Chemia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.60, 'positive'); } },
    'CHEM_WATER_FUEL_1': { name: "Paliwo z Wody",minResearchLevel: 2, icon: '💧', description: "Opatentowanie wydajnego katalizatora do elektrolizy wody.", type: "wzmacnianie rozwoju", cost: 1200, initialCashCost: 12000, sector: 'Chemia', applyEffect: (stock) => { stock.financialHealth += 4.0; } },
    'CHEM_CO2_CAPTURE_1': { name: "Wychwyt CO2 z Atmosfery", icon: '☁️', description: "Technologia, która zamienia dwutlenek węgla w użyteczne polimery. Niezwykle dochodowa i proekologiczna.", type: "wzmacnianie pozycji na rynku", cost: 800, initialCashCost: 8000, sector: 'Chemia', applyEffect: (stock) => { stock.financialHealth += 2.0; applyPriceEffect(stock.symbol, 0.15, 'positive'); } },
    'CHEM_PLASTIC_EATING_1': { name: "Enzymy trawiące plastik", icon: '🗑️', description: "Odkrycie enzymów, które w szybkim tempie rozkładają odpady z tworzyw sztucznych.", type: "wzmacnianie rozwoju", cost: 600, initialCashCost: 6000, sector: 'Chemia', applyEffect: (stock) => { stock.financialHealth += 2.5; } },
    'CHEM_AERO_GEL_1': { name: "Produkcja Aerożelu",minResearchLevel: 2, icon: '🧊', description: "Uruchomienie produkcji najlżejszego materiału stałego na świecie o niezwykłych właściwościach izolacyjnych.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'Chemia', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.10, 'positive'); } },
    'CHEM_MED_POLYMER_1': { name: "Polimery Medyczne",minResearchLevel: 2, icon: '❤️', description: "Stworzenie biokompatybilnych polimerów do produkcji implantów i protez.", type: "wzmacnianie pozycji na rynku", cost: 450, initialCashCost: 4500, sector: 'Chemia', applyEffect: (stock) => { stock.financialHealth += 1.2; } },

    // Dobra konsumpcyjne
    'CONSUMER_3DPRINT_1': { name: "Druk 3D na Życzenie",minResearchLevel: 2, icon: '🖨️', description: "Możliwość personalizacji produktów za pomocą druku 3D przyciąga klientów premium.", type: "wzmacnianie pozycji na rynku", cost: 280, initialCashCost: 2800, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.06, 'positive'); } },
    'CONSUMER_SELF_CLEAN_1': { name: "Samoczyszczące Ubrania", icon: '👕', description: "Nanotechnologia w tkaninach, która odpycha brud i wodę.", type: "wzmacnianie ceny i zysków", cost: 400, initialCashCost: 4000, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { stock.financialHealth += 1.5; } },
    'CONSUMER_ETERNAL_BULB_1': { name: "Wieczna Żarówka",minResearchLevel: 2, icon: '💡', description: "Żarówka, która nigdy się nie przepala. Jednorazowy zakup, ale ogromny prestiż.", type: "wzmacnianie pozycji na rynku", cost: 600, initialCashCost: 6000, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { stock.volatilityFactor *= 0.8; applyPriceEffect(stock.symbol, 0.10, 'positive'); } },
    'CONSUMER_SMART_PACK_1': { name: "Inteligentne Opakowania", icon: '📦', description: "Opakowania, które informują o świeżości produktu lub same zamawiają uzupełnienie.", type: "wzmacnianie rozwoju", cost: 220, initialCashCost: 2200, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { stock.financialHealth += 0.8; } },
    'CONSUMER_SCENT_1': { name: "Personalizowane Zapachy", icon: '👃', description: "System AI, który tworzy unikalne perfumy na podstawie preferencji klienta.", type: "wzmacnianie pozycji na rynku", cost: 320, initialCashCost: 3200, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.07, 'positive'); } },
    'CONSUMER_SUSTAINABLE_1': { name: "Materiały z Recyklingu", icon: '♻️', description: "Pełne przejście na produkcję z materiałów pochodzących w 100% z recyklingu.", type: "wzmacnianie pozycji na rynku", cost: 250, initialCashCost: 2500, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { stock.financialHealth += 0.5; } },
    'CONSUMER_TELEPORT_1': { name: "Teleportacja Produktów", icon: '🌀', description: "Natychmiastowa dostawa do domu. Technologia wciąż niestabilna, czasem zamiast tostera pojawia się pingwin.", type: "wzmacnianie ceny i zysków", cost: 2000, initialCashCost: 20000, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { stock.financialHealth += 5.0; stock.volatilityFactor *= 1.5; } },
    'CONSUMER_LOYALTY_AI_1': { name: "Program Lojalnościowy AI",minResearchLevel: 2, icon: '❤️', description: "AI, które personalizuje zniżki i nagrody, maksymalizując lojalność klientów.", type: "wzmacnianie rozwoju", cost: 380, initialCashCost: 3800, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { stock.financialHealth += 1.2; } },
    'CONSUMER_UNIVERSAL_REMOTE_1': { name: "Uniwersalny Pilot", icon: '🎛️', description: "Jeden pilot do sterowania absolutnie wszystkim. Ostateczne rozwiązanie problemu pierwszego świata.", type: "wzmacnianie pozycji na rynku", cost: 420, initialCashCost: 4200, sector: 'Dobra konsumpcyjne', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.10, 'positive'); } },

    // Usługi
    'SERVICES_DRONE_1': { name: "Dostawy Dronami", icon: '🛸', description: "Automatyzacja 'ostatniej mili' w dostawach rewolucjonizuje logistykę firmy.", type: "wzmacnianie rozwoju", cost: 450, initialCashCost: 4500, sector: 'Usługi', applyEffect: (stock) => { stock.financialHealth += 1.8; } },
    'SERVICES_AI_LAWYER_1': { name: "Prawnik AI", icon: '⚖️', description: "AI, które analizuje dokumenty i przygotowuje pisma procesowe, obniżając koszty obsługi prawnej.", type: "wzmacnianie ceny i zysków", cost: 600, initialCashCost: 6000, sector: 'Usługi', applyEffect: (stock) => { stock.financialHealth += 2.0; } },
    'SERVICES_AI_SUPPORT_1': { name: "Wsparcie Klienta AI", icon: '🎧', description: "Chatboty i voiceboty, które są nieodróżnialne od ludzi i rozwiązują 99% problemów.", type: "wzmacnianie rozwoju", cost: 400, initialCashCost: 4000, sector: 'Usługi', applyEffect: (stock) => { stock.financialHealth += 1.5; } },
    'SERVICES_DIGITAL_TWIN_1': { name: "Cyfrowe Sobowtóry", icon: '👨‍💻', description: "Usługa tworzenia cyfrowych awatarów, które mogą uczestniczyć w spotkaniach za klienta.", type: "wzmacnianie pozycji na rynku", cost: 700, initialCashCost: 7000, sector: 'Usługi', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.12, 'positive'); } },
    'SERVICES_PREDICTIVE_1': { name: "Konserwacja Predykcyjna", icon: '🔧', description: "Systemy, które przewidują awarie maszyn, zanim one nastąpią, oferowane jako usługa.", type: "wzmacnianie ceny i zysków", cost: 500, initialCashCost: 5000, sector: 'Usługi', applyEffect: (stock) => { stock.volatilityFactor *= 0.85; stock.financialHealth += 1.0; } },
    'SERVICES_OUTSOURCE_DIMENSION_1': { name: "Outsourcing Międzywymiarowy", icon: '🌀', description: "Zlecanie zadań istotom z innych wymiarów. Taniej, ale komunikacja bywa trudna.", type: "wzmacnianie ceny i zysków", cost: 1500, initialCashCost: 15000, sector: 'Usługi', applyEffect: (stock) => { stock.financialHealth += 6.0; } },
    'SERVICES_CLOUD_PLATFORM_1': { name: "Własna Platforma Chmurowa",minResearchLevel: 2, icon: '☁️', description: "Stworzenie własnej infrastruktury chmurowej uniezależnia od gigantów i staje się nowym źródłem przychodu.", type: "wzmacnianie rozwoju", cost: 800, initialCashCost: 8000, sector: 'Usługi', applyEffect: (stock) => { stock.financialHealth += 2.5; } },
    'SERVICES_SUBSCRIPTION_1': { name: "Model Subskrypcyjny",minResearchLevel: 2, icon: '🔁', description: "Przejście z jednorazowych usług na model subskrypcyjny, zapewniający stały dopływ gotówki.", type: "wzmacnianie ceny i zysków", cost: 300, initialCashCost: 3000, sector: 'Usługi', applyEffect: (stock) => { stock.volatilityFactor *= 0.9; } },
    'SERVICES_ON_DEMAND_1': { name: "Eksperci na Żądanie",minResearchLevel: 2, icon: '💡', description: "Platforma łącząca firmy z wysoko wykwalifikowanymi ekspertami na godziny.", type: "wzmacnianie pozycji na rynku", cost: 350, initialCashCost: 3500, sector: 'Usługi', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.07, 'positive'); } },

    // Turystyka
    'TOURISM_VR_1': { name: "Wirtualne Wycieczki",minResearchLevel: 2, icon: '🌐', description: "Oferowanie wycieczek w wirtualnej rzeczywistości jako nowa gałąź przychodów.", type: "wzmacnianie ceny i zysków", cost: 320, initialCashCost: 3200, sector: 'Turystyka', applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'TOURISM_SPACE_1': { name: "Turystyka Kosmiczna",minResearchLevel: 2, icon: '🚀', description: "Organizacja lotów suborbitalnych dla najbogatszych klientów.", type: "wzmacnianie pozycji na rynku", cost: 2500, initialCashCost: 25000, sector: 'Turystyka', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.70, 'positive'); } },
    'TOURISM_AI_PLANNER_1': { name: "Planer Podróży AI", icon: '🗺️', description: "AI, które tworzy idealnie spersonalizowane plany podróży, maksymalizując satysfakcję klientów.", type: "wzmacnianie rozwoju", cost: 400, initialCashCost: 4000, sector: 'Turystyka', applyEffect: (stock) => { stock.financialHealth += 1.5; } },
    'TOURISM_UNDERWATER_HOTEL_1': { name: "Hotel Podwodny", icon: '🐠', description: "Budowa luksusowego hotelu na dnie oceanu. Ogromna atrakcja.", type: "wzmacnianie pozycji na rynku", cost: 1200, initialCashCost: 12000, sector: 'Turystyka', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.25, 'positive'); } },
    'TOURISM_LOYALTY_1': { name: "Globalny Program Lojalnościowy", icon: '⭐', description: "Wspólny program lojalnościowy z liniami lotniczymi i hotelami na całym świecie.", type: "wzmacnianie pozycji na rynku", cost: 300, initialCashCost: 3000, sector: 'Turystyka', applyEffect: (stock) => { stock.financialHealth += 0.8; } },
    'TOURISM_DYNAMIC_PRICING_1': { name: "Dynamiczne Wyceny", icon: '💲', description: "System AI, który w czasie rzeczywistym dostosowuje ceny wycieczek do popytu, maksymalizując zyski.", type: "wzmacnianie ceny i zysków", cost: 450, initialCashCost: 4500, sector: 'Turystyka', applyEffect: (stock) => { stock.financialHealth += 1.8; } },
    'TOURISM_TRANSLATOR_1': { name: "Tłumacz Neuronowy",minResearchLevel: 2, icon: '🗣️', description: "Urządzenie, które w czasie rzeczywistym tłumaczy rozmowy na dowolny język.", type: "wzmacnianie rozwoju", cost: 600, initialCashCost: 6000, sector: 'Turystyka', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.10, 'positive'); } },
    'TOURISM_TIME_TRAVEL_1': { name: "Podróże w Czasie (Symulacje)",minResearchLevel: 2, icon: '⏳', description: "Historyczne symulacje VR pozwalające 'odwiedzić' starożytny Rzym lub pole bitwy pod Grunwaldem.", type: "wzmacnianie pozycji na rynku", cost: 800, initialCashCost: 8000, sector: 'Turystyka', applyEffect: (stock) => { stock.financialHealth += 1.2; applyPriceEffect(stock.symbol, 0.15, 'positive'); } },
    'TOURISM_ECO_1': { name: "Ekoturystyka", icon: '🌲', description: "Certyfikowane, neutralne dla środowiska wycieczki, które stają się nowym, modnym trendem.", type: "wzmacnianie rozwoju", cost: 280, initialCashCost: 2800, sector: 'Turystyka', applyEffect: (stock) => { stock.financialHealth += 0.7; } },

    // Medycyna
    'MED_GENE_1': { name: "Terapie Genowe",minResearchLevel: 2, icon: '🧬', description: "Przełom w personalizowanych terapiach genowych daje nadzieję milionom pacjentów.", type: "wzmacnianie pozycji na rynku", cost: 1800, initialCashCost: 18000, sector: 'Medycyna', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.40, 'positive'); } },
    'MED_AI_DIAG_1': { name: "Diagnostyka AI", icon: '🩺', description: "System AI, który trafniej niż lekarze diagnozuje choroby ze zdjęć, rewolucjonizuje rynek.", type: "wzmacnianie rozwoju", cost: 600, initialCashCost: 6000, sector: 'Medycyna', applyEffect: (stock) => { stock.financialHealth += 2.5; } },
    'MED_NANOBOTS_1': { name: "Nanoboty Naprawcze",minResearchLevel: 2, icon: '🤖', description: "Mikroskopijne roboty krążące w krwiobiegu, które naprawiają uszkodzone komórki.", type: "wzmacnianie cen i zysków", cost: 2200, initialCashCost: 22000, sector: 'Medycyna', applyEffect: (stock) => { stock.financialHealth += 5.0; } },
    'MED_REGEN_CAPSULE_1': { name: "Kapsuły Regeneracyjne", icon: '🛌', description: "Urządzenia, które w ciągu kilku godzin leczą złamania i poważne urazy.", type: "wzmacnianie rozwoju", cost: 1500, initialCashCost: 15000, sector: 'Medycyna', applyEffect: (stock) => { stock.financialHealth += 4.0; } },
    'MED_ANTI_AGING_1': { name: "Odwracanie Starzenia",minResearchLevel: 2, icon: '👶', description: "Terapia, która cofa zegar biologiczny. Skutki uboczne są... nieznane.", type: "wzmacnianie pozycji na rynku", cost: 3000, initialCashCost: 30000, sector: 'Medycyna', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 1.0, 'positive'); } },
    'MED_3D_ORGANS_1': { name: "Druk Organów 3D", icon: '🖨️', description: "Możliwość 'wydrukowania' w pełni funkcjonalnej nerki lub serca na zamówienie.", type: "wzmacnianie rozwoju", cost: 1900, initialCashCost: 19000, sector: 'Medycyna', applyEffect: (stock) => { stock.financialHealth += 6.0; } },
    'MED_ROBO_SURGEON_1': { name: "Zdalny Chirurg Robotyczny", icon: '🦾', description: "Robot, który pozwala najlepszym chirurgom na świecie operować pacjentów na odległość.", type: "wzmacnianie pozycji na rynku", cost: 800, initialCashCost: 8000, sector: 'Medycyna', applyEffect: (stock) => { stock.volatilityFactor *= 0.8; } },
    'MED_CRYO_1': { name: "Krionika", icon: '🥶', description: "Usługa zamrażania pacjentów z nadzieją na ich ożywienie w przyszłości. Biznes z zerową liczbą reklamacji.", type: "wzmacnianie ceny i zysków", cost: 700, initialCashCost: 7000, sector: 'Medycyna', applyEffect: (stock) => { stock.financialHealth += 2.0; } },
    'MED_TELEPATHY_1': { name: "Leczenie Telepatyczne", icon: '🧠', description: "Terapia dla pacjentów w śpiączce za pomocą interfejsu mózg-komputer. Przełom w neurologii.", type: "wzmacnianie rozwoju", cost: 900, initialCashCost: 9000, sector: 'Medycyna', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.20, 'positive'); } },

    // Budowlany — constructionEffects działają na NOWE kontrakty (koszt, tempo, ryzyko opóźnień)
    'BUILDING_PREFAB_1': { name: "Budownictwo Prefabrykowane", icon: '🏗️', description: "Szybka i tania metoda budowy z gotowych modułów przyspiesza realizację projektów.", type: "wzmacnianie rozwoju", cost: 300, initialCashCost: 3000, sector: 'Budowlany', constructionEffects: { speedBonus: 0.10, costReduction: 0.03 }, applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'BUILDING_GREEN_MATERIALS_1': { name: "Ekologiczne Materiały", icon: '🌿', description: "Wykorzystanie materiałów przyjaznych środowisku poprawia wizerunek i otwiera nowe rynki.", type: "wzmacnianie pozycji na rynku", cost: 250, initialCashCost: 2500, sector: 'Budowlany', constructionEffects: { costReduction: 0.02 }, applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.05, 'positive'); } },
    'BUILDING_SMART_CONSTRUCTION_1': { name: "Inteligentne Budownictwo", icon: '🤖', description: "Automatyzacja i planowanie budów: szybsze prace i mniej opóźnień na nowych kontraktach.", type: "wzmacnianie ceny i zysków", cost: 500, initialCashCost: 5000, sector: 'Budowlany', constructionEffects: { speedBonus: 0.05, delayReduction: 0.15 }, applyEffect: (stock) => { stock.financialHealth += 1.5; stock.volatilityFactor *= 0.95; } },
    'BUILDING_UNDERGROUND_1': { name: "Technologie Podziemne", icon: '⛏️', description: "Specjalizacja w budowie tuneli i infrastruktury podziemnej otwiera nowe kontrakty.", type: "wzmacnianie rozwoju", cost: 400, initialCashCost: 4000, sector: 'Budowlany', constructionEffects: { delayReduction: 0.10 }, applyEffect: (stock) => { stock.financialHealth += 1.2; } },
    'BUILDING_HIGH_RISE_1': { name: "Wieżowce",minResearchLevel: 2, icon: '🏙️', description: "Technologie budowy drapaczy chmur przyciągają prestiżowe zamówienia.", type: "wzmacnianie pozycji na rynku", cost: 800, initialCashCost: 8000, sector: 'Budowlany', constructionEffects: { speedBonus: 0.03 }, applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.15, 'positive'); } },
    'BUILDING_SEISMIC_1': { name: "Budownictwo Sejsmiczne", icon: '🌋', description: "Specjalizacja w budynkach odpornych na trzęsienia ziemi dla regionów zagrożonych.", type: "wzmacnianie rozwoju", cost: 350, initialCashCost: 3500, sector: 'Budowlany', constructionEffects: { delayReduction: 0.10 }, applyEffect: (stock) => { stock.financialHealth += 0.8; } },
    'BUILDING_RENOVATION_1': { name: "Renowacja Zabytków", icon: '🏛️', description: "Ekspertyza w odnawianiu historycznych budynków przyciąga państwowe zamówienia.", type: "wzmacnianie ceny i zysków", cost: 450, initialCashCost: 4500, sector: 'Budowlany', constructionEffects: { costReduction: 0.03 }, applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'BUILDING_ECO_BUILDINGS_1': { name: "Zielone Budynki",minResearchLevel: 2, icon: '🌱', description: "Specjalizacja w budynkach energooszczędnych i samowystarczalnych.", type: "wzmacnianie pozycji na rynku", cost: 600, initialCashCost: 6000, sector: 'Budowlany', constructionEffects: { costReduction: 0.02 }, applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.10, 'positive'); stock.financialHealth += 0.5; } },
    'BUILDING_MEGA_PROJECTS_1': { name: "Megaprojekty", icon: '🚀', description: "Umiejętność zarządzania ogromnymi projektami infrastrukturalnymi.", type: "wzmacnianie rozwoju", cost: 1000, initialCashCost: 10000, sector: 'Budowlany', constructionEffects: { speedBonus: 0.05, costReduction: 0.03, delayReduction: 0.15 }, applyEffect: (stock) => { stock.financialHealth += 2.0; } },
    'BUILDING_LOGISTICS_1': { name: "Logistyka Materiałów Budowlanych", icon: '🚚', description: "Zmniejsza koszty nowych budów o 2% i ryzyko opóźnień o 20%.", type: "wzmacnianie rozwoju", cost: 350, initialCashCost: 3500, sector: 'Budowlany', constructionEffects: { costReduction: 0.02, delayReduction: 0.20 }, applyEffect: (stock) => { stock.financialHealth += 0.3; } },
};

// === NOWA SEKCJA: INWESTYCJE BANKOWE ===

// Współczynnik przeliczenia minut na punkty badań
// Jeśli 1 minuta gry = 60000ms, a 1 punkt badań = 2500ms postępu,
// to 1 minuta = 60000 / 2500 = 24 punkty badań.
const BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE = 24;

// Definicje inwestycji bankowych
const bankInvestments = {
    'BANK_ATM_EXPANSION': {
        id: 'BANK_ATM_EXPANSION', // Dodajemy ID dla spójności
        name: "Rozbudowa sieci bankomatów",
        description: "Zwiększa zasięg terytorialny banku i generuje niewielki, stały dochód z opłat.",
        baseCost: 200, // Bazowy koszt w punktach badań
        initialCashCost: 50000, // Koszt gotówkowy rozpoczęcia inwestycji
        increaseDurationPoints: BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE, // Dodaje 1 minutę (w punktach) per poziom
        maxLevel: 10, // Opcjonalny limit powtórzeń
        applyEffect: (stock, bankData) => {
            // bankData to obiekt banku z commercialBanks
            bankData.cash -= 10000; // Koszt zakupu bankomatów z kasy banku
            stock.financialHealth += 0.1; // Mały, stały bonus do kondycji
            // Można dodać mechanizm małego pasywnego dochodu dla banku
            logEvent(`🏦 Bank ${stock.name} inwestuje ${bankInvestments.BANK_ATM_EXPANSION.initialCashCost.toLocaleString()} PLN w rozbudowę sieci bankomatów.`);
        }
    },
    'BANK_FINTECH_PLATFORM': {
        id: 'BANK_FINTECH_PLATFORM',
        name: "Wdrożenie platformy FinTech",
        description: "Nowoczesna platforma online przyciąga nowych klientów i usprawnia operacje, potencjalnie zwiększając zyski.",
        baseCost: 400,
        initialCashCost: 150000,
        increaseDurationPoints: BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE * 2, // Dodaje 2 minuty
        maxLevel: 5,
        applyEffect: (stock, bankData) => {
            bankData.cash -= 50000;
            stock.financialHealth += 0.3;
            stock.volatilityFactor *= 0.98; // Bardziej stabilne operacje
            applyPriceEffect(stock.symbol, 0.02, 'positive'); // Mały boost ceny akcji
            logEvent(`💻 Bank ${stock.name} wdraża nowoczesną platformę FinTech kosztem ${bankInvestments.BANK_FINTECH_PLATFORM.initialCashCost.toLocaleString()} PLN.`);
        }
    },
    'BANK_NEW_BRANCHES': {
        id: 'BANK_NEW_BRANCHES',
        name: "Otwarcie nowych oddziałów",
        description: "Zwiększa obecność fizyczną banku, co może przyciągnąć więcej depozytów i klientów kredytowych, ale podnosi koszty stałe.",
        baseCost: 300,
        initialCashCost: 200000,
        increaseDurationPoints: BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE * 1.5, // Dodaje 1.5 minuty
        maxLevel: 8,
        applyEffect: (stock, bankData) => {
            bankData.cash -= 80000;
            stock.financialHealth += 0.2; // Potencjał wzrostu
            // W przyszłości można dodać mechanizm zwiększający koszty operacyjne banku
            logEvent(`🏢 Bank ${stock.name} otwiera nowe oddziały, inwestując ${bankInvestments.BANK_NEW_BRANCHES.initialCashCost.toLocaleString()} PLN.`);
        }
    },
    'BANK_MARKETING_CAMPAIGN': {
        id: 'BANK_MARKETING_CAMPAIGN',
        name: "Kampania marketingowa",
        description: "Zwiększa rozpoznawalność marki, co może przyciągnąć nowych klientów i zwiększyć wolumen depozytów.",
        baseCost: 150,
        initialCashCost: 75000,
        increaseDurationPoints: BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE * 0.5, // Dodaje 30 sekund
        maxLevel: 15,
        applyEffect: (stock, bankData) => {
            bankData.cash -= 25000;
            applyPriceEffect(stock.symbol, 0.03, 'positive'); // Tymczasowy boost ceny akcji
            // W przyszłości można dodać tymczasowy bonus do przyciągania depozytów
            logEvent(`📣 Bank ${stock.name} rozpoczyna kampanię marketingową za ${bankInvestments.BANK_MARKETING_CAMPAIGN.initialCashCost.toLocaleString()} PLN.`);
        }
    },
     'BANK_AI_RISK_ASSESSMENT': {
        id: 'BANK_AI_RISK_ASSESSMENT',
        name: "Wdrożenie AI do Oceny Ryzyka",
        description: "System AI analizuje ryzyko kredytowe dokładniej niż ludzie, zmniejszając straty na złych kredytach.",
        baseCost: 350,
        initialCashCost: 120000,
        increaseDurationPoints: BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE * 1.5,
        maxLevel: 7,
        applyEffect: (stock, bankData) => {
            bankData.cash -= 40000;
            stock.financialHealth += 0.4; // Lepsze zarządzanie ryzykiem
            stock.volatilityFactor *= 0.96; // Bardziej stabilne wyniki
            // Można dodać mechanizm zmniejszający szansę na default kredytów udzielonych przez ten bank
            logEvent(`🤖 Bank ${stock.name} inwestuje ${bankInvestments.BANK_AI_RISK_ASSESSMENT.initialCashCost.toLocaleString()} PLN w AI do oceny ryzyka kredytowego.`);
        }
    },
    'BANK_INVESTMENT_FUND': {
        id: 'BANK_INVESTMENT_FUND',
        name: "Uruchomienie Funduszu Inwestycyjnego",
        description: "Stworzenie nowego funduszu inwestycyjnego dla klientów generuje dodatkowe przychody z opłat za zarządzanie.",
        baseCost: 250,
        initialCashCost: 100000,
        increaseDurationPoints: BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE,
        maxLevel: 12,
        applyEffect: (stock, bankData) => {
            bankData.cash -= 30000;
            stock.financialHealth += 0.25;
            applyPriceEffect(stock.symbol, 0.015, 'positive');
            // Można dodać mechanizm generowania pasywnego dochodu dla banku
            logEvent(`📈 Bank ${stock.name} uruchamia nowy fundusz inwestycyjny, inwestując ${bankInvestments.BANK_INVESTMENT_FUND.initialCashCost.toLocaleString()} PLN.`);
        }
    }
};

// #################################################################################
// ## descriptions.js
// #################################################################################

// =================================================================================
// DESCRIPTIONS.JS - Silnik do proceduralnego generowania opisów spółek i prezesów
// Wersja poprawiona
// =================================================================================

// --- 1. PULE DANYCH ---
const maleFirstNames = ["Jan", "Piotr", "Krzysztof", "Marek", "Andrzej", "Tomasz", "Paweł", "Marcin", "Michał", "Adam", "Dariusz", "Grzegorz", "Stanisław", "Cezary", "Rafał", "Jacek", "Artur", "Sebastian", "Robert", "Mariusz", "Mateusz", "Wojciech", "Zbigniew", "Kamil"];
const femaleFirstNames = ["Anna", "Maria", "Katarzyna", "Elżbieta", "Małgorzata", "Agnieszka", "Barbara", "Ewa", "Joanna", "Magdalena", "Monika", "Grażyna", "Justyna", "Beata", "Izabela", "Karolina", "Aleksandra", "Patrycja", "Natalia", "Weronika"];
const ceoLastNames = ["Kowalski", "Nowak", "Wiśniewski", "Dąbrowski", "Lewandowski", "Wójcik", "Kamiński", "Zieliński", "Szymański", "Woźniak", "Kozłowski", "Jankowski", "Mazur", "Kwiatkowski", "Wojciechowski", "Krawczyk", "Zając", "Król", "Walczak", "Stępień", "Górski", "Pawlak", "Michalski", "Sikora", "Ostrowski", "Baran", "Duda", "Piotrowski", "Grabowski"];
const companyDescriptors = {
    leader: ["potentat", "numer jeden", "wyznacznik standardów", "hegemon", "dominator", "czołowy gracz", "pionier", "lider rynku", "kluczowy gracz", "główny dostawca", "lider segmentu"],
    experienced: ["weteran branży", "wytrawny gracz", "filar rynku", "firma z tradycjami", "ugruntowana pozycja", "sprawdzony partner", "doświadczony podmiot", "instytucja w branży"],
    stable: ["solidny brand", "zaufana marka", "marka o ugruntowanej pozycji", "pewny gracz", "stabilna firma", "bezpieczna przystań"],
    renowned: ["prestiżowa marka", "symbol jakości", "ceniony brand", "uznana marka w branży", "firma z renomą", "synonim niezawodności"],
    rookie: ["challenger", "nowicjusz na rynku", "debiutant", "wschodząca gwiazda", "młoda firma", "świeża siła", "ambitny gracz", "dynamiczny startup"],
    giant: ["kolos", "imperium biznesowe", "mocarstwo", "lewiatan", "rekin biznesu", "tytan branży", "gigant na rynku", "konglomerat"],
    innovator: ["wizjoner", "innowator", "trendsetter", "prekursor zmian", "motor napędowy branży", "awangarda sektora"]
};
const ceoQuotes = {
    positive: ["Jesteśmy na fali wznoszącej i nie zamierzamy zwalniać tempa.", "Nasze wyniki mówią same za siebie. Innowacja to klucz do naszego sukcesu.", "Z optymizmem patrzymy w przyszłość, planując dalszą ekspansję na rynki zagraniczne.", "Budujemy wartość dla naszych akcjonariuszy każdego dnia, konsekwentnie realizując strategię.", "Dzięki zaufaniu inwestorów i ciężkiej pracy całego zespołu osiągamy kolejne kamienie milowe.", "Nasza pozycja lidera jest niezagrożona, a my już wyznaczamy nowe, ambitne cele.", "Każdy kwartał przynosi rekordowe zyski. To najlepszy dowód na słuszność naszej obranej drogi.", "Technologia, którą rozwijamy, daje nam przewagę na lata. Konkurencja może tylko patrzeć.", "Nie tylko spełniamy prognozy, my je przekraczamy. To nowy standard w naszej firmie.", "Nasz model biznesowy udowodnił swoją skuteczność. Czas na skalowanie działalności."],
    neutral: ["Koncentrujemy się na stabilnym, organicznym wzroście i utrzymaniu rentowności.", "Rynek jest wymagający, ale dzięki efektywności operacyjnej utrzymujemy solidną pozycję.", "Naszym priorytetem jest optymalizacja procesów i długoterminowa satysfakcja klienta.", "Działamy zgodnie z przyjętym planem, adaptując się do zmian w otoczeniu biznesowym.", "Utrzymanie płynności i dyscyplina kosztowa to fundamenty naszej działalności w obecnym klimacie.", "Realizujemy nasze cele krok po kroku, stawiając na zrównoważony i przemyślany rozwój.", "Analizujemy trendy rynkowe, aby podejmować świadome i odpowiedzialne decyzje.", "Nasza siła leży w stabilności i przewidywalności, co cenią nasi partnerzy biznesowi."],
    negative: ["Przechodzimy przez okres głębokiej restrukturyzacji, która jest niezbędna dla przyszłości firmy.", "Wierzymy, że wkrótce uda nam się pokonać obecne trudności rynkowe i wrócić na ścieżkę wzrostu.", "Poszukujemy nowych dróg rozwoju w tym wymagającym otoczeniu, analizując każdy możliwy scenariusz.", "Sytuacja jest trudna, ale zarząd jest w pełni zdeterminowany, by odwrócić negatywny trend.", "Skupiamy się na odzyskaniu zaufania rynku i fundamentalnej poprawie wyników finansowych.", "Musimy podjąć trudne, czasem niepopularne decyzje, aby zapewnić firmie długoterminową stabilność.", "Czynniki zewnętrzne miały znaczący, negatywny wpływ na nasze ostatnie wyniki.", "Najbliższe kwartały będą dla nas prawdziwym testem. Prosimy inwestorów o cierpliwość."]
};
const startupVerbs = ["planuje", "zamierza", "chce", "przymierza się by", "ma ambicję", "celuje w to, by", "dąży do tego, aby", "przygotowuje się, by", "podejmuje próbę, by"];
const startupQuotes = ["Zmienimy zasady gry w tej branży, to obietnica.", "Nasz produkt to rewolucja, na którą wszyscy czekali. Potrzebujemy tylko paliwa rakietowego.", "Mamy technologię i zespół, które zostawią konkurencję daleko w tyle.", "To dopiero początek. Nasz potencjał jest nieograniczony, a apetyt na sukces jeszcze większy.", "Jesteśmy małym zespołem z wielkimi ambicjami i jeszcze większą determinacją.", "Szukamy odważnych inwestorów, którzy tak jak my wierzą w ten przełomowy projekt.", "Nie chcemy być kolejną firmą na rynku. Chcemy być rynkiem.", "Nasza wizja jest prosta: stworzyć produkt, bez którego wkrótce nikt nie będzie wyobrażał sobie życia.", "Konkurencja jeszcze nie wie, co nadchodzi. To nasza największa przewaga.", "Albo będziemy numerem jeden, albo nie będzie nas wcale. Nie ma innej opcji."];
const companyMottos = ["Naszą misją jest dostarczanie najwyższej jakości i przekraczanie oczekiwań.", "Firma kieruje się zasadą zrównoważonego rozwoju i odpowiedzialności społecznej.", "Wizją spółki jest zostanie niekwestionowanym liderem innowacji w swojej branży.", "Spółka stawia na dynamiczny rozwój, elastyczność i pełną satysfakcję klienta.", "Budujemy przyszłość w oparciu o tradycję, doświadczenie i nowoczesne technologie.", "Kluczem do sukcesu jest dla nas partnerstwo i transparentność w biznesie.", "Codziennie pracujemy na zaufanie naszych klientów i inwestorów.", "Inwestujemy w ludzi, bo to oni tworzą wartość naszej firmy.", "Jakość nie jest celem, jest standardem.", "Myślimy globalnie, działamy lokalnie."];
const sectorSpecifics = {
    'Media': { 
    activity: [
        "Spółka jest właścicielem ogólnopolskiego dziennika finansowego i portalu internetowego.", 
        "Grupa medialna koncentruje się na stacjach radiowych i telewizji biznesowej.", 
        "Firma specjalizuje się w organizacji konferencji branżowych i wydawaniu magazynów specjalistycznych.",
        "Agencja jest liderem na rynku public relations i marketingu sponsorowanego."
    ], 
    keywords: [
        "rynek reklamowy", "wpływy z subskrypcji", "wiarygodność", "zasięgi", 
        "regulacje medialne", "content marketing", "dziennikarstwo śledcze"
    ] 
},
    'Finanse Konsumenckie': { 
    activity: [
        "Spółka jest liderem na rynku pożyczek pozabankowych, tzw. 'chwilówek'.", 
        "Firma specjalizuje się w windykacji należności i zarządzaniu portfelami długów.", 
        "Podmiot prowadzi ogólnopolską sieć lombardów i kantorów wymiany walut.",
        "Firma oferuje usługi księgowe i optymalizację podatkową dla małych i średnich przedsiębiorstw."
    ], 
    keywords: [
        "zadłużenie konsumentów", "regulacje KNF", "stopy procentowe", "koszty windykacji", 
        "popyt na gotówkę", "scoring kredytowy", "płynność finansowa", "progi podatkowe"
    ] 
},
    'Chemia': { activity: ["Spółka jest kluczowym producentem specjalistycznych chemikaliów dla przemysłu.", "Firma koncentruje się na produkcji wysokomarżowych tworzyw sztucznych.", "Zakład produkuje nawozy sztuczne dla rolnictwa na skalę krajową.", "Koncern jest liderem w segmencie chemii gospodarczej i kosmetycznej."], keywords: ["ceny surowców", "regulacje ekologiczne", "nowe patenty", "łańcuch dostaw", "koszty energii", "innowacje produktowe"] },
    'Energia': { activity: ["Koncern zajmuje się wydobyciem i dystrybucją energii ze źródeł konwencjonalnych.", "Spółka inwestuje w odnawialne źródła energii, głównie farmy wiatrowe i fotowoltaikę.", "Firma jest operatorem dużej elektrowni systemowej, kluczowej dla krajowego bezpieczeństwa.", "Spółka rozwija technologie związane z magazynowaniem energii i wodorem."], keywords: ["bezpieczeństwo energetyczne", "transformacja klimatyczna", "ceny uprawnień do emisji", "polityka państwa", "magazynowanie energii", "inwestycje w sieć"] },
    'Żywność': { activity: ["Firma jest jednym z największych przetwórców mięsa w kraju.", "Specjalnością spółki są zdrowe, organiczne produkty żywnościowe dystrybuowane w sieciach premium.", "Koncern jest liderem na rynku napojów i soków owocowych.", "Zakład jest znaczącym producentem wyrobów cukierniczych i słodyczy."], keywords: ["trendy konsumenckie", "ceny płodów rolnych", "koszty logistyki", "eksport", "inflacja cen żywności", "zdrowa żywność"] },
    'Dobra konsumpcyjne': { activity: ["Spółka produkuje szeroką gamę artykułów gospodarstwa domowego, od chemii po małe AGD.", "Firma jest właścicielem popularnej marki odzieżowej o ugruntowanej pozycji.", "Koncern specjalizuje się w produkcji i dystrybucji kosmetyków na rynek masowy.", "Firma jest znanym producentem mebli, sprzedawanych w sieci własnych salonów."], keywords: ["siła nabywcza konsumentów", "rozpoznawalność marki", "e-commerce", "koszty marketingu", "lojalność klientów", "marża detaliczna"] },
    'Technologia': { activity: ["Firma dostarcza oprogramowanie typu SaaS dla klientów korporacyjnych w chmurze.", "Spółka specjalizuje się w produkcji zaawansowanych komponentów do urządzeń mobilnych.", "Agencja tworzy dedykowane systemy IT dla sektora finansowego i ubezpieczeniowego.", "Firma jest liderem w dziedzinie cyberbezpieczeństwa, chroniąc dane największych instytucji."], keywords: ["innowacje", "ochrona danych osobowych", "sztuczna inteligencja", "globalna konkurencja", "brak specjalistów IT", "chmura obliczeniowa"] },
    'Medycyna': { activity: ["Spółka prowadzi sieć prywatnych klinik i laboratoriów diagnostycznych.", "Firma biotechnologiczna pracuje nad przełomowym lekiem na choroby cywilizacyjne.", "Zakład jest producentem sprzętu medycznego jednorazowego użytku dla szpitali.", "Firma rozwija innowacyjne oprogramowanie do analizy danych medycznych."], keywords: ["badania kliniczne", "refundacja leków", "demografia", "nowe terapie", "wydatki publiczne na zdrowie", "telemedycyna"] },
    'Nieruchomości': { activity: ["Spółka specjalizuje się w budowie i wynajmie powierzchni biurowych w centrach miast.", "Firma koncentruje się na rynku mieszkaniowym, realizując duże osiedla deweloperskie.", "Deweloper buduje i zarządza nowoczesnymi centrami logistycznymi i magazynowymi.", "Spółka jest właścicielem portfela centrów handlowych w największych miastach."], keywords: ["stopy procentowe", "popyt na kredyty hipoteczne", "ceny gruntów", "praca zdalna", "koszty budowy", "wskaźnik pustostanów"] },
    'Przemysł': { activity: ["Firma jest czołowym producentem maszyn dla sektora budowlanego.", "Specjalnością spółki jest produkcja stalowych konstrukcji na potrzeby infrastruktury.", "Zakład produkuje części samochodowe dla największych światowych koncernów.", "Koncern jest liderem w produkcji opakowań dla branży spożywczej i farmaceutycznej."], keywords: ["zamówienia publiczne", "ceny stali", "koszty pracy", "automatyzacja produkcji", "łańcuchy dostaw", "inwestycje infrastrukturalne"] },
    'Bankowość': { activity: ["Bank uniwersalny oferujący pełen zakres usług dla klientów detalicznych i firm.", "Instytucja finansowa skupia się na obsłudze zamożnych klientów i zarządzaniu aktywami.", "Firma jest liderem na rynku leasingu i faktoringu dla małych i średnich przedsiębiorstw.", "Bank specjalizuje się w kredytach hipotecznych i obsłudze rynku nieruchomości."], keywords: ["polityka monetarna", "jakość portfela kredytowego", "fintech", "regulacje bankowe", "cyfryzacja usług", "marża odsetkowa"] },
    'Usługi': { activity: ["Firma jest liderem na rynku usług kurierskich i logistycznych.", "Spółka oferuje profesjonalne usługi outsourcingu IT dla międzynarodowych korporacji.", "Sieć prowadzi działalność w zakresie ochrony osób i mienia na terenie całego kraju.", "Firma zarządza dużą siecią agencji pracy tymczasowej."], keywords: ["cyfryzacja", "rynek pracy", "efektywność operacyjna", "pozyskiwanie nowych klientów", "presja płacowa", "automatyzacja"] },
    'Turystyka': { activity: ["Operator jest jednym z największych touroperatorów w kraju, organizującym wycieczki zagraniczne.", "Spółka zarządza siecią luksusowych hoteli w popularnych miejscowościach wypoczynkowych.", "Firma jest właścicielem dużej platformy rezerwacyjnej online dla obiektów noclegowych.", "Przewoźnik lotniczy oferuje tanie połączenia do najpopularniejszych europejskich miast."], keywords: ["sytuacja geopolityczna", "ruch lotniczy", "preferencje podróżnych", "konkurencja cenowa", "kursy walut", "ceny paliw"] },
    'Gaming': { activity: ["Studio produkuje gry komputerowe z segmentu AAA, celując w rynek globalny.", "Firma jest wydawcą gier mobilnych opartych na modelu free-to-play, generujących stałe przychody.", "Spółka specjalizuje się w portowaniu gier na różne platformy sprzętowe.", "Firma jest producentem gier planszowych i karcianych, które z sukcesem digitalizuje."], keywords: ["nadchodząca premiera", "silnik graficzny", "monetyzacja", "społeczność graczy", "koszty marketingu", "recenzje w mediach"] },
    'Finanse': { 
activity: ["Fundusz specjalizuje się w aktywnym zarządzaniu portfelem akcji spółek giełdowych.", "Spółka jest funduszem inwestycyjnym zamkniętym, skupującym pakiety akcji w wybranych sektorach.", "Podmiot koncentruje się na długoterminowych inwestycjach w spółki o solidnych fundamentach.", "Główną działalnością firmy jest trading i spekulacja na rynkach kapitałowych."], keywords: ["analiza rynkowa", "dywersyfikacja portfela", "stopy procentowe", "wyniki spółek portfelowych", "przepływy kapitału", "globalne trendy"] },
'Bankowość Komercyjna': { activity: ["Bank oferuje usługi finansowe dla klientów indywidualnych i korporacyjnych.", "Instytucja specjalizuje się w zarządzaniu aktywami i operacjach inwestycyjnych.", "Bank koncentruje się na obsłudze dużych przedsiębiorstw i finansowaniu projektów."], keywords: ["stopy procentowe", "regulacje finansowe", "akcja kredytowa", "marża odsetkowa", "płynność", "ryzyko kredytowe"] }
};
const researchInstituteDescriptions = ["Jesteśmy inkubatorem innowacji. Nie prowadzimy własnych badań komercyjnych, lecz analizujemy i syntetyzujemy postęp technologiczny całego rynku. Nasza wartość rośnie wraz z każdą nową technologią odkrytą przez inne firmy, a nasza obecność stymuluje rozwój sąsiadujących z nami przedsiębiorstw.", "Nasza misja to katalizowanie postępu. Działamy jako centrum analityczne, czerpiąc wartość z globalnego rozwoju technologicznego. Inwestorzy postrzegają nas jako barometr innowacyjności całej gospodarki, a bliska współpraca z nami to gwarancja przyspieszenia dla każdego działu R&D.", "Specjalizujemy się w metaanalizie i prognozowaniu trendów. Każdy sukces badawczy na rynku, niezależnie od sektora, jest cegiełką budującą naszą fundamentalną wartość. Firmy, które lokują się w naszym otoczeniu, zyskują unikalny dostęp do naszej wiedzy, co przyspiesza ich własne projekty.", "Działamy na styku nauki i biznesu, przekuwając odkrycia innych w czystą wartość kapitałową. Nasz model biznesowy opiera się na założeniu, że fala innowacji podnosi wszystkie łodzie - a nasza jest pierwszą, która to odczuwa. Stanowimy również centrum kompetencyjne dla firm w naszym sąsiedztwie.", "Nie tworzymy technologii – my ją udoskonalamy i standaryzujemy. Nasza wartość jest bezpośrednio powiązana z sumą innowacji na rynku. Jesteśmy jak papier lakmusowy postępu; im więcej dzieje się w laboratoriach na całym świecie, tym lepiej dla naszych akcjonariuszy.", "Postrzegamy postęp technologiczny jako ekosystem. Naszą rolą jest bycie jego centralnym hubem, który zyskuje na każdej udanej innowacji. Firmy współpracujące z nami otrzymują od nas wsparcie, które skraca ich cykle badawcze i pozwala szybciej komercjalizować odkrycia."];

// --- 2. LOGIKA GENERATORÓW ---

function assignCeoTraits(ceo) {
    // Sprawdzenie, czy baza danych cech jest dostępna
    if (typeof ceoTraits === 'undefined' || Object.keys(ceoTraits).length === 0) {
        console.error("Błąd: Baza danych `ceoTraits` jest niedostępna lub pusta!");
        ceo.traits = [];
        return;
    }

    const assignedTraits = [];
    const traitsPool = Object.keys(ceoTraits).map(id => ({ id, ...ceoTraits[id] }));

    // 1. Ustal, ile cech ma mieć CEO
    let numTraits = 1;
    if (ceo.age >= 55) { // Starsi, bardziej doświadczeni CEO mają więcej cech
        const roll = Math.random();
        if (roll < 0.1) numTraits = 3;      // 10% szans na 3 cechy
        else if (roll < 0.5) numTraits = 2; // 40% szans na 2 cechy
    } else if (ceo.age >= 40) {
        if (Math.random() < 0.3) numTraits = 2; // 30% szans na 2 cechy
    }

    // 2. Pętla losująca cechy
    for (let i = 0; i < numTraits; i++) {
        const roll = Math.random() * 100;
        let rarityToGet;

        // Ustal rzadkość cechy do wylosowania
        if (roll < 1.5) rarityToGet = 'exceptional'; // 1.5% szansy
        else if (roll < 8) rarityToGet = 'very_rare'; // 6.5% szansy
        else if (roll < 30) rarityToGet = 'rare';    // 22% szansy
        else rarityToGet = 'common';                // 70% szansy

        // Znajdź wszystkie dostępne cechy danej rzadkości, których CEO jeszcze nie ma
        const availableTraits = traitsPool.filter(trait =>
            trait.rarity === rarityToGet &&
            !assignedTraits.some(assigned => assigned.id === trait.id)
        );

        // Jeśli są dostępne cechy, wylosuj jedną i dodaj
        if (availableTraits.length > 0) {
            const chosenTrait = getRandomElement(availableTraits);
            assignedTraits.push({
                id: chosenTrait.id,
                name: chosenTrait.name,
                rarity: chosenTrait.rarity
            });
        } else {
            // Jeśli w danej rzadkości nie ma już nic do wylosowania, spróbuj wylosować cokolwiek innego
            const fallbackTraits = traitsPool.filter(trait => trait.rarity !== 'hidden' && !assignedTraits.some(assigned => assigned.id === trait.id));
            if (fallbackTraits.length > 0) {
                const chosenTrait = getRandomElement(fallbackTraits);
                assignedTraits.push({
                    id: chosenTrait.id,
                    name: chosenTrait.name,
                    rarity: chosenTrait.rarity
                });
            }
        }
    }

    ceo.traits = assignedTraits;
}

function generateCEO(stock, isReplacement = false) {
    if (stock.ceo && typeof stock.ceo === 'object' && !isReplacement) return;

    const isFemale = Math.random() < 0.3;
    const firstName = isFemale ? getRandomElement(femaleFirstNames) : getRandomElement(maleFirstNames);
    let lastName = getRandomElement(ceoLastNames);

    if (isFemale) {
        if (lastName.endsWith('ski')) lastName = lastName.slice(0, -1) + 'a';
        else if (lastName.endsWith('cki')) lastName = lastName.slice(0, -1) + 'a';
    }
    
    let age, tenure;
    if (stock.assetType === 'Startup') {
        age = getRandomIntInRange(20, 40);
    } else {
        age = getRandomIntInRange(40, 60);
    }

    if (isReplacement) {
        tenure = 0;
    } else {
        tenure = getRandomIntInRange(10 * 4, 20 * 4);
    }

    const newCeo = {
        name: `${firstName} ${lastName}`,
        age: age,
        tenure: tenure,
        traits: []
    };

    assignCeoTraits(newCeo);
    
    stock.ceo = newCeo;
}


function replaceCeo(stock, newCeo = null) {
    const oldCeo = stock.ceo; // Zapisujemy starego CEO do późniejszej analizy

    // Jeśli przekazano konkretnego kandydata (od gracza lub AI), powołaj go.
    if (newCeo) {
        newCeo.tenure = 0; // Nowy prezes zaczyna z zerowym stażem w tej firmie
        stock.ceo = newCeo;
    }
    // W przeciwnym razie (np. emerytura, losowe zdarzenie), wygeneruj nowego losowego prezesa.
    else {
        generateCEO(stock, true); // Używamy flagi 'isReplacement', aby wyzerować staż
    }

    // Sprawdź, czy nowy CEO ma cechę "Midas"
    if (stock.ceo && stock.ceo.traits && stock.ceo.traits.some(t => t.id === 'midas')) {
        stock.financialHealth += 3;
        if (stock.financialHealth > 5) stock.financialHealth = 5;
        applyPriceEffect(stock.symbol, 0.15, 'positive', 'company');
        logEvent(`✨ [CEO] Dotyk Midasa! Objęcie stanowiska przez nowego prezesa w ${stock.name} natychmiast poprawia finanse i kurs akcji!`, 'company');
    }

    // Sprawdź, czy stary CEO miał cechę "Kapitalista" i czy są akcje własne do sprzedania
    if (oldCeo && oldCeo.traits.some(t => t.id === 'kapitalista') && stock.treasuryShares > 0) {
        const soldShares = stock.treasuryShares;
        stock.treasuryShares = 0; // Akcje wracają na rynek
        applyPriceEffect(stock.symbol, -0.01, 'negative', 'company');
        logEvent(`[CEO] Po odejściu prezesa-kapitalisty, ${stock.name} sprzedaje ${soldShares.toLocaleString('pl-PL')} akcji własnych, co lekko obniża kurs.`, 'review');
    }
}

function getCompanyDescriptor(stock) {
    const exchangeLevel = exchanges[stock.exchange].level;
    if (exchangeLevel >= 4) return getRandomElement(companyDescriptors.giant);
    if (exchangeLevel === 3) return getRandomElement(companyDescriptors.leader);
    if (exchangeLevel === 2) return getRandomElement(companyDescriptors.experienced.concat(companyDescriptors.renowned));
    if (exchangeLevel === 1) return getRandomElement(companyDescriptors.stable);
    return getRandomElement(companyDescriptors.rookie);
}

function getCEOQuote(stock) {
    if (stock.financialHealth >= 2) return getRandomElement(ceoQuotes.positive);
    if (stock.financialHealth <= -2) return getRandomElement(ceoQuotes.negative);
    return getRandomElement(ceoQuotes.neutral);
}

function getVolatilitySentence(stock) {
    if (stock.volatilityFactor < 0.8) return "Spółka cieszy się opinią stabilnej i przewidywalnej inwestycji.";
    if (stock.volatilityFactor >= 0.8 && stock.volatilityFactor < 2.0) return "Notowania akcji charakteryzują się umiarkowaną zmiennością.";
    if (stock.volatilityFactor >= 2.0 && stock.volatilityFactor < 3.5) return "Spółka znana jest z dynamicznych wahań kursu, co przyciąga spekulantów.";
    return "Inwestycja w tę firmę wiąże się z bardzo wysokim ryzykiem i dużą zmiennością notowań.";
}

function initializeDescriptionParts(stock) {
    generateCEO(stock);
    
    const sector = stock.sector[0];
    const sectorInfo = sectorSpecifics[sector] || { activity: ["Firma działa w swojej branży."], keywords: ["rynek", "konkurencja", "klienci"] };

    stock.descriptionParts = {
        activitySentence: getRandomElement(sectorInfo.activity),
        keywordsSentence: `Kluczowe dla rozwoju firmy są czynniki takie jak ${getRandomElement(sectorInfo.keywords)} oraz ${getRandomElement(sectorInfo.keywords)}.`,
        mottoSentence: getRandomElement(companyMottos)
    };
}

function assembleDescription(stock) {
    if (stock.assetType === 'Startup') {
        if (!stock.ceo || !stock.ceo.name) generateCEO(stock);
        if (stock.description) return stock.description;

        const ceoName = stock.ceo.name;
        const verb = getRandomElement(startupVerbs);
        const sector = stock.sector[0];

        const sentence1 = `${stock.name} ${verb} zrewolucjonizować rynek w kategorii ${sector}.`;
        const sentence2 = "Projekt zakłada stworzenie innowacyjnej platformy o globalnym potencjale, która ma przyciągnąć szerokie grono odbiorców.";
        const sentence3 = `Prezes ${ceoName} komentuje: '${getRandomElement(startupQuotes)}'`;
        
        stock.description = `${sentence1} ${sentence2} ${sentence3}`;
        return stock.description;
    } 
    else if (stock.assetType === 'ResearchInstitute') {
        return stock.description || "Brak opisu dla tego instytutu.";
    } 
    else {
        if (!stock.descriptionParts || !stock.ceo || !stock.ceo.name) {
            initializeDescriptionParts(stock);
            if (!stock.descriptionParts || !stock.ceo || !stock.ceo.name) {
                 return "Brak danych do wygenerowania opisu.";
            }
        }
        
        const parts = stock.descriptionParts;
        const ceoName = stock.ceo.name;
        
        const sentence1_dynamic = `${stock.name} to ${getCompanyDescriptor(stock)} w kategorii ${stock.sector[0]}.`;
        const sentence3_dynamic = getVolatilitySentence(stock);
        const sentence7_dynamic = `'${getCEOQuote(stock)}' - komentuje ${ceoName.split(' ').pop()}.`;
        const sentence2_static = parts.activitySentence;
        const sentence4_static = parts.keywordsSentence;
        const sentence5_static = parts.mottoSentence;
        const sentence6_static = `Na czele spółki stoi prezes ${ceoName}.`;

        return `${sentence1_dynamic} ${sentence2_static} ${sentence3_dynamic} ${sentence4_static} ${sentence5_static} ${sentence6_static} ${sentence7_dynamic}`;
    }
}

function generateCeoCandidate(stock) {
    const isFemale = Math.random() < 0.3;
    const firstName = isFemale ? getRandomElement(femaleFirstNames) : getRandomElement(maleFirstNames);
    let lastName = getRandomElement(ceoLastNames);

    if (isFemale) {
        if (lastName.endsWith('ski')) lastName = lastName.slice(0, -1) + 'a';
        else if (lastName.endsWith('cki')) lastName = lastName.slice(0, -1) + 'a';
    }
    
    const age = stock.assetType === 'Startup' ? getRandomIntInRange(20, 40) : getRandomIntInRange(40, 60);
    const tenure = getRandomIntInRange(5 * 4, 15 * 4); // Staż w kwartałach (5-15 lat doświadczenia)

    const candidate = {
        name: `${firstName} ${lastName}`,
        age: age,
        tenure: tenure,
        traits: []
    };

    assignCeoTraits(candidate); // Używamy assignCeoTraits, aby przypisać mu cechy
    
    return candidate;
}

// #################################################################################
// ## companies.js
// #################################################################################


let currentCollateralAuction = null; // { stockSymbol, quantity, minPrice, endTime, bids: [] }
// Nowa globalna tablica na spółki miejskie (nienotowane na giełdzie)
let municipalCompanies = [];
let privateCompanies = [];
const MINIMUM_STARTUPS = 3; 
const TARGET_STARTUPS = 5;
let currentBankIPOOffer = null;
// cechy prezesów
const ceoTraits = {
    // === CECHY POSPOLITE (COMMON) ===
    wyjadacz: {
        name: "Wyjadacz",
        rarity: "common",
        color: "#a0a0a0",
        description: "Delikatnie zwiększa bazowy wzrost ceny akcji (+1%)."
    },
    hobbista: {
        name: "Hobbista",
        rarity: "common",
        color: "#a0a0a0",
        description: "Zwiększa wahania kursu akcji (+2% do volatilityFactor)."
    },
    tyran: {
        name: "Tyran",
        rarity: "common",
        color: "#a0a0a0",
        description: "Z powodu niskiego morale w firmie, bazowy wzrost ceny akcji jest spowolniony (-2%)."
    },
    rozrzutny: {
        name: "Rozrzutny",
        rarity: "common",
        color: "#a0a0a0",
        description: "Nieefektywne zarządzanie finansami spowalnia bazowy wzrost ceny akcji (-2%)."
    },
    glowa_w_chmurach: {
        name: "Głowa w chmurach",
        rarity: "common",
        color: "#a0a0a0",
        description: "Brak skupienia na detalach spowalnia postęp badań w firmie (-5%)."
    },
    niezdecydowany: {
        name: "Niezdecydowany",
        rarity: "common",
        color: "#a0a0a0",
        description: "Jego niezdecydowanie wprowadza chaos. Co kwartał istnieje 25% szans, że polityka dywidendowa firmy zostanie losowo zmieniona."
    },
    biurowy_dron: {
        name: "Biurowy Dron",
        rarity: "common",
        color: "#a0a0a0",
        description: "Skupiony na procesach, a nie na wynikach. Przyspiesza badania (+5%), ale spowalnia wzrost ceny akcji (-1%)."
    },
    ryzykant: {
        name: "Ryzykant",
        rarity: "common",
        color: "#a0a0a0",
        description: "Lubi grać va banque. Zwiększa zmienność akcji (+10%), ale wzmacnia też pozytywne zdarzenia losowe (+5%)."
    },
    ksiegowy: {
        name: "Księgowy",
        rarity: "common",
        color: "#a0a0a0",
        description: "Przedkłada stabilność nad innowacje. Obniża zmienność akcji (-5%), ale spowalnia też postęp badań (-5%)."
    },
    plotkarz: {
        name: "Plotkarz",
        rarity: "common",
        color: "#a0a0a0",
        description: "Jego gadulstwo sprawia, że firma mocniej reaguje na plotki. Wzmacnia efekty wszystkich zdarzeń firmowych o 10% (pozytywnych i negatywnych)."
    },

    // === CECHY RZADKIE (RARE) ===
    pewniak: {
        name: "Pewniak",
        rarity: "rare",
        color: "#4caf50",
        description: "Utrzymuje stabilność firmy. Współczynnik zmienności (volatilityFactor) nigdy nie przekroczy 3.0 i nie spadnie poniżej 0.5."
    },
    prowiec: {
        name: "PRowiec",
        rarity: "rare",
        color: "#4caf50",
        description: "Mistrz public relations. Wzmacnia efekty pozytywnych zdarzeń losowych dla tej spółki o 3%."
    },
    doswiadczony: {
        name: "Doświadczony",
        rarity: "rare",
        color: "#4caf50",
        description: "Weteran biznesu. Osłabia negatywne zdarzenia o 15% i wzmacnia pozytywne o 1%."
    },
    filar_w_branzy: {
        name: "Filar w branży",
        rarity: "rare",
        color: "#4caf50",
        description: "Jego reputacja sprawia, że cena akcji rośnie o 1% szybciej niż średnia dla tego sektora."
    },
    reakcjonista: {
        name: "Reakcjonista",
        rarity: "rare",
        color: "#4caf50",
        description: "Pod jego rządami firma bardzo emocjonalnie reaguje na wiadomości. Efekty zdarzeń (pozytywnych i negatywnych) są o 10% silniejsze."
    },
    nieudacznik: {
        name: "Nieudacznik",
        rarity: "rare",
        color: "#f44336",
        description: "Kombinacja pecha i złych decyzji. Spowalnia wzrost ceny akcji o 5% i zwiększa jej wahania o 5%."
    },
    skompromitowany: {
        name: "Skompromitowany",
        rarity: "rare",
        color: "#f44336",
        description: "Ciągnie się za nim zła sława. Zwiększa szansę na negatywne, specyficzne dla firmy zdarzenie o 10%."
    },
    oddany: {
        name: "Oddany",
        rarity: "rare",
        color: "#4caf50",
        description: "Lojalny firmie i jej pracownikom. Próba jego zwolnienia przez radę nadzorczą ma o 25% mniejszą szansę powodzenia."
    },
    skapiec: {
        name: "Skąpiec",
        rarity: "rare",
        color: "#f44336",
        description: "Nienawidzi dzielić się zyskiem. Blokuje wszelkie wypłaty dywidendy, niezależnie od polityki firmy. Kumulowany kapitał nieznacznie poprawia kondycję finansową (+0.25 co kwartał)."
    },
    szczodry: {
        name: "Szczodry",
        rarity: "rare",
        color: "#4caf50",
        description: "Uwielbia dzielić się zyskiem. Zwiększa kwotę wypłacanej dywidendy o 15% i ignoruje politykę 'Wzrostu'."
    },
    spec_od_kryzysu: {
        name: "Specjalista ds. Kryzysu",
        rarity: "rare",
        color: "#4caf50",
        description: "Gdy kondycja firmy spada poniżej zera, ma 20% szans w każdym kwartale na jej natychmiastowe ustabilizowanie do poziomu 0."
    },
    lowca_glow: {
        name: "Łowca Głów",
        rarity: "rare",
        color: "#4caf50",
        description: "Agresywnie rekrutuje talenty. Przyspiesza badania (+10%), ale jego metody zwiększają zmienność akcji (+15%)."
    },
    lojalista: {
        name: "Lojalista",
        rarity: "rare",
        color: "#4caf50",
        description: "Ma silne poczucie obowiązku państwowego. Jeśli prezesuje spółce państwowej, zwiększa jej odporność na negatywne zdarzenia o dodatkowe 20%."
    },

    // === CECHY BARDZO RZADKIE (VERY RARE) ===
    stoik: {
        name: "Stoik",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Opoka spokoju. Permanentnie obniża zmienność akcji (volatilityFactor) o 40% i osłabia efekty wszystkich zdarzeń o 25%."
    },
    wizjoner: {
        name: "Wizjoner",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Patrzy w przyszłość. Przyspiesza postęp badań o 10%, ale jego ryzykowne decyzje zwiększają zmienność akcji o 5%."
    },
    rekin: {
        name: "Rekin",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Agresywny i skuteczny. Zwiększa bazowy wzrost ceny akcji o 5%."
    },
    kapitalista: {
        name: "Kapitalista",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Wierzy w siłę kapitału. Spółka automatycznie skupuje niewielką liczbę swoich akcji co 4-7 minut, wspierając kurs."
    },
    geniusz_innowacji: {
        name: "Geniusz Innowacji",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Jego umysł wyprzedza epokę. Drastycznie przyspiesza wszelkie prace badawczo-rozwojowe w firmie (+25%)."
    },
    ulubieniec_rzadu: {
        name: "Ulubieniec Rządu",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Ma doskonałe kontakty w sferach rządowych. Jeśli prezesuje spółce państwowej, co kwartał ma 15% szans na otrzymanie pokaźnego grantu finansowego."
    },
    ekspansjonista: {
        name: "Ekspansjonista",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Zawsze myśli o rozwoju. Co dwa kwartały zwiększa maksymalną liczbę akcji (maxShares) spółki o 1%, otwierając drogę do przyszłych emisji."
    },
    patron: {
        name: "Patron",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Wspiera zdolnych inwestorów. Gracz otrzymuje o 10% więcej XP za zyskowne transakcje na akcjach tej spółki."
    },
    magik_finansowy: {
        name: "Magik Finansowy",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Potrafi sprawić, że problemy znikają. Co kwartał ma 10% szans na całkowite wyzerowanie długu korporacyjnego spółki."
    },

    // === CECHY WYJĄTKOWE (EXCEPTIONAL) ===
    bogacz: {
        name: "Bogacz",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Ma tak rozległe wpływy i prywatne środki, że jego firma nie może zbankrutować ani zostać znacjonalizowana."
    },
    legenda: {
        name: "Legenda",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Ikona biznesu. Negatywne eventy są osłabione o 50%, pozytywne pojawiają się 5% częściej, a co 10 minut cena akcji otrzymuje stały bonus +3.5%."
    },
    czlowiek_z_ludu: {
        name: "Człowiek z Ludu",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Jest tak lubiany i szanowany, że jego firma jest całkowicie odporna na negatywne zdarzenia losowe dotyczące bezpośrednio spółki (kategorii 'company')."
    },
    midas: {
        name: "Midas",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Wszystko, czego dotknie, zamienia się w złoto. Przy objęciu stanowiska jednorazowo podnosi kondycję finansową firmy o +3 i cenę akcji o +15%."
    },
    tytan_przemyslu: {
        name: "Tytan Przemysłu",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Jego imperium jest niewzruszone. Spółka jest całkowicie odporna na negatywne zdarzenia sektorowe i ogólnorynkowe."
    },
    wladca_marionetek: {
        name: "Władca Marionetek",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Pociąga za sznurki w całej branży. Co kwartał ma 5% szans na wywołanie pozytywnego zdarzenia dla WŁASNEJ firmy."
    },
    imperator: {
        name: "Imperator",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Jego władza jest absolutna. Spółka, której przewodzi, nie może zostać wrogo przejęta przez innego gracza lub AI."
    },
    // === 0.11 CIEMNA STREFA ===
    sklonny_do_korupcji: {
        name: "Skłonny do korupcji",
        rarity: "common",
        color: "#a0a0a0",
        description: "Lubi „załatwiać” sprawy. Czasem podnosi korupcję w kraju, a spółka częściej trafia w afery."
    },
    chciwy: {
        name: "Chciwy",
        rarity: "rare",
        color: "#f44336",
        description: "Tnie koszty na ludziach: narzuca politykę kadrową „Wyzysk” (wyższa marża, ale strajki, odejścia i kontrole Inspekcji Pracy)."
    },
    lojalny_pracownikom: {
        name: "Przyjaciel załogi",
        rarity: "rare",
        color: "#4caf50",
        description: "Lojalny wobec pracowników: polityka kadrowa „Prospołeczna” — wyższe płace, wyższa wydajność, mniej związków i strajków."
    },
    skorumpowany: {
        name: "Skorumpowany",
        rarity: "rare",
        color: "#4caf50",
        description: "Bierze i daje. Co kwartał podnosi korupcję w kraju; spółka jest pierwszym celem śledztw i afer."
    },
    niezalezny: {
        name: "Niezależny",
        rarity: "rare",
        color: "#4caf50",
        description: "Nie da się go kupić. Spółka jest odporna na afery korupcyjne i wpływy mafii."
    },
    czlonek_mafii: {
        name: "Członek mafii",
        rarity: "hidden", // nadawana tylko przez mafię (mafia.js), nie losowana
        color: "#212121",
        description: "Ćwierć zysku spółki „znika” co kwartał. Policja może go zatrzymać."
    },
    emerytowany_policjant: {
        name: "Emerytowany policjant",
        rarity: "hidden", // tylko prezesi spółek zbrojeniowych (defense.js)
        color: "#1565c0",
        description: "Stare znajomości: korupcja w kraju spada szybciej, a wpływy mafii rosną wolniej."
    },
    general: {
        name: "Generał",
        rarity: "hidden",
        color: "#1565c0",
        description: "Wzmacnia walkę z mafią; korupcja na niego nie działa (spółka odporna na afery)."
    },
    byly_wojskowy: {
        name: "Były wojskowy",
        rarity: "hidden",
        color: "#1565c0",
        description: "Dyscyplina w zarządzie: spółka odporna na afery korupcyjne."
    }
};
// generowanie startupów
const startupSectors = [['Technologia'], ['Gaming'], ['Medycyna'], ['Media'], ['Energia'], ['Żywność'], ['Nieruchomości'], ['Chemia'], ['Przemysł'], ['Dobra konsumencje'], ['Usługi'], ['Turystyka'], ['Bankowość'], ['Finanse Konsumenckie']];

const techPrefixes = ['Quantum', 'Cyber', 'Data', 'Nano', 'Aero', 'Geo'];
const techSuffixes = ['Leap', 'Verse', 'Solutions', 'Dynamics', 'Core'];
const gamingPrefixes = ['Pixel', 'Rogue', 'Iron', 'Grim', 'Mad', 'True', 'Good', 'Toxic', 'Giga'];
const gamingSuffixes = ['Punx', 'Tale', 'Forge', 'Horde', 'Quest', 'Id', 'Rats', 'Cache', 'Byte', 'Pro'];
const medPrefixes = ['Bio', 'Neuro', 'Vita', 'Cardio', 'Hema'];
const medSuffixes = ['Gen', 'Cure', 'Pulse', 'Labs', 'Health'];
const energyPrefixes = ['Eco', 'Hydro', 'Geo', 'Sun', 'Volt'];
const energySuffixes = ['Volt', 'Charge', 'Power', 'Grid', 'Source'];
const financePrefixes = ['Fin', 'Apex', 'Alpha', 'Quantum', 'Secure', 'Virtuo'];
const financeSuffixes = ['Vest', 'Trade', 'Trust', 'Cap', 'Fund'];
const foodPrefixes = ['Agro', 'Bio', 'Eko', 'Smak', 'Fresh', 'Poli'];
const foodSuffixes = ['Food', 'Farm', 'Pex', 'Pol', 'Vit', 'Garden'];
const realtyPrefixes = ['Bud', 'Dom', 'Pro', 'Euro', 'Poli', 'Global'];
const realtySuffixes = ['Dom', 'Bud', 'Invest', 'Estate', 'Plaza'];
const chemPrefixes = ['Chem', 'Poli', 'Anwil', 'Syntho', 'Nitro'];
const chemSuffixes = ['Plast', 'Chem', 'Tech', 'Novia', 'Corp'];
const industryPrefixes = ['Poli', 'Stal', 'Indu', 'Mega', 'Bud', 'Raw', 'Euro', 'Neo', 'Hard', 'Max', 'Daw'];
const industrySuffixes = ['Stal', 'Bud', 'Tech', 'Weld', 'Corp', 'System', 'Max', 'Ex', 'Pol'];
const consumerPrefixes = ['Neo', 'Poli', 'Comfort', 'Pro', 'Lux', 'Every'];
const consumerSuffixes = ['Lux', 'Plast', 'Dom', 'Produkt', 'Line', 'Day'];
const servicesPrefixes = ['Serwis', 'Pro', 'Pol', 'Euro', 'Global', 'Biz'];
const servicesSuffixes = ['Net', 'Com', 'Serv', 'Line', 'Team', 'Solutions'];
const tourismPrefixes = ['Poli', 'Travel', 'Euro', 'Sun', 'Go', 'Sky'];
const tourismSuffixes = ['Pol', 'Travel', 'Sun', 'Fly', 'Tour', 'Ways'];
const bankingPrefixes = ['Fin', 'Euro', 'Pol', 'Pro', 'Secure', 'Capital', 'Super', 'Mega', 'Giga', 'Star', 'Amber'];
const bankingSuffixes = ['Bank', 'Trust', 'Vest', 'Kapitał', 'Finance', 'Invest', 'Vabank', 'Parabank', 'Gold'];


//cechy prezesów banku
const centralBankGovernorTraits = {
    // Polityka Monetarna
    jastrzab: { name: "Jastrząb", rarity: "rare", color: "#f44336", description: "Preferuje wyższe stopy procentowe, aby kontrolować inflację, nawet kosztem wzrostu gospodarczego." },
    golab: { name: "Gołąb", rarity: "rare", color: "#4caf50", description: "Skłania się ku niższym stopom procentowym, aby stymulować gospodarkę, ryzykując wyższą inflacją." },
    stabilizator: { name: "Stabilizator", rarity: "common", color: "#a0a0a0", description: "Dąży do utrzymania stabilnych stóp procentowych, unikając gwałtownych ruchów." },
    // Stosunek do Regulacji
    regulator: { name: "Regulator", rarity: "rare", color: "#ffc107", description: "Zwolennik ścisłego nadzoru nad bankami komercyjnymi, częściej podnosi wymogi rezerwowe." },
    deregulator: { name: "Deregulator", rarity: "rare", color: "#2196f3", description: "Uważa, że rynek sam się wyreguluje, skłonny do obniżania wymogów rezerwowych." },
    // Stosunek do Państwa
    etatysta: { name: "Etatysta", rarity: "very_rare", color: "#663399", description: "Silnie wspiera sektor państwowy, chętniej finansuje spółki Skarbu Państwa i rozważa nacjonalizację." },
    libertarianin: { name: "Libertarianin", rarity: "very_rare", color: "#000000", description: "Sceptyczny wobec interwencji państwa, rzadziej finansuje spółki państwowe, preferuje prywatyzację." },
    // Inne
    niezalezny: { name: "Niezależny Ekspert", rarity: "common", color: "#a0a0a0", description: "Podejmuje decyzje w oparciu o dane makroekonomiczne, mniej podatny na naciski." },
    partyjniak: { name: "Człowiek Partii", rarity: "rare", color: "#8B4513", description: "Jego decyzje są często podyktowane bieżącą polityką, co prowadzi do nieprzewidywalnych ruchów." }
};


const ALL_COMMERCIAL_BANKS_DEFINITIONS = [
    // Inwestycyjne (3 + 1)
    { id: 'inv1', name: 'Bank Spryciarski', type: BANK_TYPES.INVESTMENT, initialCapital: 5000000, reserveRatio: 0.1, baseInterestRateMargin: 0.01 },
    { id: 'inv2', name: 'Galeria Bankowa', type: BANK_TYPES.INVESTMENT, initialCapital: 4500000, reserveRatio: 0.1, baseInterestRateMargin: 0.012 },
    { id: 'inv3', name: 'Bank Kolekcjonerski RPK', type: BANK_TYPES.INVESTMENT, initialCapital: 4000000, reserveRatio: 0.1, baseInterestRateMargin: 0.009 },
    // --> NOWY: Bank Hipotezy jako Inwestycyjny <--
    { id: 'bhi', name: 'Bank Hipotezy', type: BANK_TYPES.INVESTMENT, initialCapital: 8000000, reserveRatio: 0.11, baseInterestRateMargin: 0.011, isActiveFromStart: true }, // Kapitał szacowany

    // Korporacyjne (3)
    { id: 'corp1', name: 'Syriusz Corp.', type: BANK_TYPES.CORPORATE, initialCapital: 7000000, reserveRatio: 0.15, baseInterestRateMargin: 0.015 },
    { id: 'corp2', name: 'Krupiewicz Group S.A', type: BANK_TYPES.CORPORATE, initialCapital: 6500000, reserveRatio: 0.16, baseInterestRateMargin: 0.016 },
    { id: 'corp3', name: 'Biuro Pokrytego Investment Group', type: BANK_TYPES.CORPORATE, initialCapital: 6000000, reserveRatio: 0.14, baseInterestRateMargin: 0.014 },

    // Uniwersalny (2)
    { id: 'uni1', name: 'Bank Powszechny', type: BANK_TYPES.UNIVERSAL, initialCapital: 10000000, reserveRatio: 0.12, baseInterestRateMargin: 0.02 },
    { id: 'bpn', name: 'BPN BK', type: BANK_TYPES.UNIVERSAL, initialCapital: 6000000, reserveRatio: 0.13, baseInterestRateMargin: 0.021, isActiveFromStart: true }, // Kapitał szacowany

    // Międzynarodowy (2)
    { id: 'int1', name: 'Gildia Handlowa', type: BANK_TYPES.INTERNATIONAL, initialCapital: 15000000, reserveRatio: 0.1, baseInterestRateMargin: 0.018 },
    { id: 'bks', name: 'Bank Klasy Światowej', type: BANK_TYPES.INTERNATIONAL, initialCapital: 20000000, reserveRatio: 0.09, baseInterestRateMargin: 0.017, isActiveFromStart: true }, // Kapitał szacowany

    // Spółdzielczy (1)
    { id: 'coop1', name: 'Wiejski Bank Spółdzielczy', type: BANK_TYPES.COOPERATIVE, initialCapital: 2000000, reserveRatio: 0.18, baseInterestRateMargin: 0.025 },

    // Internetowy (1)
    { id: 'net1', name: 'EmBank', type: BANK_TYPES.INTERNET, initialCapital: 3000000, reserveRatio: 0.08, baseInterestRateMargin: 0.017 },

    // Hipoteczny (1)
    { id: 'mort1', name: 'Super Bank Hipoteczny', type: BANK_TYPES.MORTGAGE, initialCapital: 5000000, reserveRatio: 0.13, baseInterestRateMargin: 0.022 },
];

let commercialBanks = []; // Zainicjowane banki

const exchanges = {
    'JUNK': { name: 'Giełda Śmieciowa 🗑️', level: 0, color: '#6c757d', minPrice: 0, maxPrice: 20, licenseCost: 0 },
    'BRONZE': { name: 'Rynek Brązowy 🥉', level: 1, color: '#cd7f32', minPrice: 20, maxPrice: 75, licenseCost: 20000 },
    'SILVER': { name: 'Giełda Srebrna 🥈', level: 2, color: '#c0c0c0', minPrice: 75, maxPrice: 400, licenseCost: 125000 },
    'GOLD': { name: 'Giełda Złota 🥇', level: 3, color: '#ffd700', minPrice: 400, maxPrice: 1500, licenseCost: 250000 },
    'PLATINUM': { name: 'Giełda Platynowa 💎', level: 4, color: '#e5e4e2', minPrice: 1500, maxPrice: Infinity, licenseCost: 500000 },
    // Giełdy elitarne (etap E2): przydział wg rankingu kapitalizacji, nie ceny — finance.js
    'RUBY': { name: 'Giełda Rubinowa 🔴', level: 5, color: '#c3112f', minPrice: Infinity, maxPrice: Infinity, licenseCost: 0, rankBased: true },
    'EMERALD': { name: 'Giełda Szmaragdowa 🟢', level: 6, color: '#1f9d55', minPrice: Infinity, maxPrice: Infinity, licenseCost: 0, rankBased: true },
    'DIAMOND': { name: 'Giełda Diamentowa 💠', level: 7, color: '#6ec6ff', minPrice: Infinity, maxPrice: Infinity, licenseCost: 0, rankBased: true }
};

const CORPORATE_PHASES = {
    GROWTH: 'Wzrost',
    STABILITY: 'Stabilność',
    DECLINE: 'Spadek',
    REORGANIZATION: 'Reorganizacja',
    GOLDEN_YEAR: 'Złoty Rok ✨', // Faza unikalna
    SHADOW_DESCENT: 'Zejście w Cień 👻', // Faza unikalna
    INNOVATION_PUSH: 'Impuls Innowacji 💡' // Faza unikalna
};

// --- Pula Spółek ---
const initialStocks = [
    // GIEŁDA ŚMIECIOWA (Poziom 0)
    {
    name: 'EcoLube', price: 5.00, volatilityFactor: 2.1, symbol: 'ECL', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
 lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Elektrownia SA', price: 15.00, volatilityFactor: 0.5, symbol: 'ESA', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Energia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Konfiturex', price: 2.00, volatilityFactor: 4.5, symbol: 'KFX', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Wieczne Ziemniaki Sp. z o.o.', price: 1.50, volatilityFactor: 3.5, symbol: 'WZM', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Six Hand', price: 0.80, volatilityFactor: 4.0, symbol: 'SIX', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Pikselowe Marzenia', price: 7.50, volatilityFactor: 3.8, symbol: 'PIX', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Błyskawiczna Proteza', price: 12.00, volatilityFactor: 3.2, symbol: 'BLP', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Super Makarony', price: 18.00, volatilityFactor: 0.6, symbol: 'SUM', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },

    // RYNEK BRĄZOWY (Poziom 1)
    {
    name: 'Alicante Housing', price: 30.00, volatilityFactor: 0.8, symbol: 'ALI', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Kopalnie Węgla Mine', price: 35.00, volatilityFactor: 1.6, symbol: 'KWM', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'BPN BK',
        price: 45.00, // Pozostawiamy cenę startową
        volatilityFactor: 0.6,
        symbol: 'BPN',
        exchange: 'BRONZE', // Pozostawiamy giełdę
        totalShares: 10000, maxShares: 10000, // Pozostawiamy akcje
        sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        balanceSheet: { assets: 6000000, liabilities: 0, shareCapital: 600000, retainedEarnings: 5400000 }, // Ustawiamy bilans banku
        quarterlyEarnings: 0, lineHistory: [], playerTransactions: [],
        sector: ['Bankowość Komercyjna', 'Bankowość'], // Zmieniamy sektor
        financialHealth: 2, // Domyślna kondycja
        lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0,
        dividendPolicy: 'Balanced', // Domyślna polityka
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 45 * 10000, estimatedDividend: 0,
        bankAccountId: null, // Banki nie mają kont
        cash: 6000000, // Gotówka banku = kapitał
        isBankStock: true, // --> Dodana flaga <--
        bankData: { id: 'bpn', type: BANK_TYPES.UNIVERSAL } // --> Dodane dane banku <--
    },
    {
    name: 'KolenBreg', price: 19.00, volatilityFactor: 1.5, symbol: 'KOB', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Wolf & Stein Tech.', price: 19.00, volatilityFactor: 2.2, symbol: 'WiS', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'WinPost', price: 20.00, volatilityFactor: 2.8, symbol: 'WIP', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia', 'Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Knor-FIX', price: 24.00, volatilityFactor: 1.0, symbol: 'FIX', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Czysty Błysk', price: 30.00, volatilityFactor: 0.7, symbol: 'CZB', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Dunder Mifflin Paper Company, Inc.', price: 22.00, volatilityFactor: 1.1, symbol: 'DMPC', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Drużyna Holding', price: 22.00, volatilityFactor: 1.1, symbol: 'DRH', exchange: 'BRONZE', totalShares: 8000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Bałtyckie Rejsy', price: 45.00, volatilityFactor: 1.6, symbol: 'BAL', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Turystyka'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Boazeria Organiczna', price: 48.00, volatilityFactor: 1.2, symbol: 'BOO', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'DarAwansu', price: 47.00, volatilityFactor: 3.0, symbol: 'DAW', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Lek-Pol', price: 60.00, volatilityFactor: 1.1, symbol: 'LEK', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'BurgerLand', price: 58.00, volatilityFactor: 1.4, symbol: 'BUL', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Beretxol', price: 68.00, volatilityFactor: 1.1, symbol: 'BER', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },

    // GIEŁDA SREBRNA (Poziom 2) - Limit: 50,000
    {
        name: 'Bank Żywności', price: 76.00, volatilityFactor: 1.8, symbol: 'BAZ', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Bankowość', 'Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Firma Tłusta Pucha', price: 80.00, volatilityFactor: 1.6, symbol: 'FTP', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność', 'Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Luksusowe Spinacze', price: 88.00, volatilityFactor: 0.8, symbol: 'LUS', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Krajoznawsto Obce', price: 78.00, volatilityFactor: 2.5, symbol: 'KRO', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Turystyka'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Plandex', price: 99.00, volatilityFactor: 1.3, symbol: 'PLX', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Turystyka'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'GUM Med Research', price: 78.00, volatilityFactor: 0.7, symbol: 'GUM', exchange: 'SILVER',
        totalShares: 42000, maxShares: 42000, sharesHeld: 0, sector: ['Badania'],
        financialHealth: 1, lastReport: 'neutral', isStateOwned: false, stateOwnershipPct: 0,
        assetType: 'ResearchInstitute',
        research: { isResearching: false, unlockedTechs: [] },
        researchUnlocks: {}, playerTransactions: [], priceAlerts: { buy: null, sell: null },
        candlestickHistory: [], lineHistory: [], currentCandle: null, dividendPolicy: 'Growth'
    },
    {
        name: 'Linapol', price: 114.00, volatilityFactor: 0.9, symbol: 'LIN', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Betonex', price: 120.00, volatilityFactor: 1.0, symbol: 'BTX', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł', 'Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'VitaGen', price: 180.00, volatilityFactor: 2.2, symbol: 'VTG', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna', 'Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cyber-Ochrona', price: 210.00, volatilityFactor: 1.9, symbol: 'CRO', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi', 'Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Annesco', price: 298.00, volatilityFactor: 1.2, symbol: 'ANN', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Meferox', price: 292.00, volatilityFactor: 1.7, symbol: 'MEF', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Energia', 'Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
     {
        name: 'Instytut Badań Stosowanych', price: 80.00, volatilityFactor: 0.5, symbol: 'IBS', exchange: 'SILVER',
        totalShares: 40000, maxShares: 40000, sharesHeld: 0, sector: ['Badania'],
        financialHealth: 2, lastReport: 'neutral', isStateOwned: false, stateOwnershipPct: 0,
        assetType: 'ResearchInstitute', // Specjalny typ do identyfikacji
        research: { isResearching: false, unlockedTechs: [] }, // Same nie badają
        researchUnlocks: {}, playerTransactions: [], priceAlerts: { buy: null, sell: null },
        candlestickHistory: [], lineHistory: [], currentCandle: null, dividendPolicy: 'Growth'
    },
    {
        name: 'Bank Hipotezy',
        price: 330.00, // Pozostawiamy cenę startową
        volatilityFactor: 0.8,
        symbol: 'BHI',
        exchange: 'SILVER', // Pozostawiamy giełdę
        totalShares: 50000, maxShares: 50000, // Pozostawiamy akcje
        sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        balanceSheet: { assets: 8000000, liabilities: 0, shareCapital: 800000, retainedEarnings: 7200000 }, // Ustawiamy bilans banku
        quarterlyEarnings: 0, lineHistory: [], playerTransactions: [],
        sector: ['Bankowość Komercyjna', 'Finanse'], // Zmieniamy sektor
        financialHealth: 2, // Domyślna kondycja
        lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0,
        dividendPolicy: 'Balanced', // Domyślna polityka
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 330 * 50000, estimatedDividend: 0,
        bankAccountId: null, // Banki nie mają kont
        cash: 8000000, // Gotówka banku = kapitał
        isBankStock: true, // --> Dodana flaga <--
        bankData: { id: 'bhi', type: BANK_TYPES.INVESTMENT } // --> Dodane dane banku <--
    },
    {
        name: 'Siarkobrzeg', price: 337.00, volatilityFactor: 1.4, symbol: 'SIK', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'BlueBull', price: 150.00, volatilityFactor: 1.2, symbol: 'BLB', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cyberfood Corp', price: 250.00, volatilityFactor: 1.8, symbol: 'CYF', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność', 'Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    
    {
        name: 'Uniwersytet Gdański', price: 110.00, volatilityFactor: 0.6, symbol: 'UnG', exchange: 'SILVER',
        totalShares: 35000, maxShares: 35000, sharesHeld: 0, sector: ['Badania'],
        financialHealth: 1, lastReport: 'neutral', isStateOwned: false, stateOwnershipPct: 0,
        assetType: 'ResearchInstitute',
        research: { isResearching: false, unlockedTechs: [] },
        researchUnlocks: {}, playerTransactions: [], priceAlerts: { buy: null, sell: null },
        candlestickHistory: [], lineHistory: [], currentCandle: null, dividendPolicy: 'Growth'
    },
    

    // GIEŁDA ZŁOTA (Poziom 3)
    {
        name: 'WielkiWoltaż', price: 410.00, volatilityFactor: 0.9, symbol: 'WIW', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Energia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Krawaciarze Inc.', price: 485.00, volatilityFactor: 0.7, symbol: 'KRA', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł', 'Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Sanitas Szpitale', price: 550.00, volatilityFactor: 0.6, symbol: 'SAN', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Stocznia Morska', price: 777.00, volatilityFactor: 1.3, symbol: 'STM', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Mieszkalnictwo Inwestycyjne',
        price: 0, volatilityFactor: 0.8, symbol: 'MIN', exchange: 'GOLD',
        totalShares: 100000, maxShares: 100000, sharesHeld: 0,
        sector: ['Finanse'], // Teraz głównym sektorem są Finanse
        financialHealth: 1, lastReport: 'brak', cash: 89000000, isTradeLocked: false,
        assetType: 'Holding', // <-- ZMIANA: Konwersja na fundusz
        holdingPortfolio: {}, // <-- NOWOŚĆ: Pusty portfel na start
        specializationSectors: ['Nieruchomości'], // <-- NOWOŚĆ: Specjalizacja w nieruchomościach
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null }
    },
    {
        name: 'SuperKonsumpcja!', price: 950.00, volatilityFactor: 1.1, symbol: 'SKP', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Bank Klasy Światowej',
        price: 1000.00, // Pozostawiamy cenę startową
        volatilityFactor: 0.3,
        symbol: 'BKS',
        exchange: 'GOLD', // Pozostawiamy giełdę
        totalShares: 100000, maxShares: 100000, // Pozostawiamy akcje
        sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        balanceSheet: { assets: 20000000, liabilities: 0, shareCapital: 2000000, retainedEarnings: 18000000 }, // Ustawiamy bilans banku
        quarterlyEarnings: 0, lineHistory: [], playerTransactions: [],
        sector: ['Bankowość Komercyjna', 'Finanse', 'Międzynarodowy'], // Zmieniamy sektor
        financialHealth: 3, // Domyślna kondycja (lepsza)
        lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0,
        dividendPolicy: 'Balanced', // Domyślna polityka
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 1000 * 100000, estimatedDividend: 0,
        bankAccountId: null, // Banki nie mają kont
        cash: 20000000, // Gotówka banku = kapitał
        isBankStock: true, // --> Dodana flaga <--
        bankData: { id: 'bks', type: BANK_TYPES.INTERNATIONAL } // --> Dodane dane banku <--
    },

    // GIEŁDA PLATYNOWA (Poziom 4)
    {
        name: 'Universal Projects', price: 1525.00, volatilityFactor: 1.5, symbol: 'UNP', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cortex Neural', price: 1850.00, volatilityFactor: 2.4, symbol: 'CTX', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'KrzeUraFos4', price: 2300.00, volatilityFactor: 2.9, symbol: 'KUP', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Biurowce Obsługi Rachunkowej', price: 3000.00, volatilityFactor: 0.6, symbol: 'BOR', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi', 'Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    // GIEŁDY ELITARNE (od startu; przydział trzyma ranking kapitalizacji — finance.js)
    {
        name: 'Bałtycka Energia Wiatrowa', price: 1900.00, volatilityFactor: 0.9, symbol: 'BEW', exchange: 'RUBY', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        quarterlyEarnings: 0,
        lineHistory: [], playerTransactions: [], sector: ['Energia'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'Balanced',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null,
        cash: 0
    },
    {
        name: 'Nova Robotics', price: 2000.00, volatilityFactor: 1.4, symbol: 'NRB', exchange: 'RUBY', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        quarterlyEarnings: 0,
        lineHistory: [], playerTransactions: [], sector: ['Technologia', 'Przemysł'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'Growth',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null,
        cash: 0
    },
    {
        name: 'Orzeł Telekom', price: 3600.00, volatilityFactor: 0.8, symbol: 'ORT', exchange: 'EMERALD', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        quarterlyEarnings: 0,
        lineHistory: [], playerTransactions: [], sector: ['Technologia', 'Usługi'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'Aggressive',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null,
        cash: 0
    },
    // --- NOWE SPÓŁKI: FINANSE KONSUMENCKIE ---
    {
        name: 'WRONA',
        price: 650.00, volatilityFactor: 1.8, symbol: 'WRN', exchange: 'GOLD',
        totalShares: 90000, maxShares: 100000, sharesHeld: 0,
        sector: ['Finanse Konsumenckie', 'Usługi'],
        financialHealth: 2, lastReport: 'brak', cash: 5000000, // Potrzebuje dużo gotówki na start
        assetType: 'DebtCollector', // Unikalny typ dla logiki
        balanceSheet: { assets: 5000000, liabilities: 0, shareCapital: 50000, retainedEarnings: 450000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Growth', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false
    },
    {
        name: 'LOMBARDEX S.A.',
        price: 65.00, volatilityFactor: 1.5, symbol: 'LOM', exchange: 'SILVER',
        totalShares: 35000, maxShares: 45000, sharesHeld: 0,
        sector: ['Finanse Konsumenckie', 'Usługi'],
        financialHealth: 1, lastReport: 'brak', cash: 400000, // Też potrzebuje gotówki na pożyczki
        assetType: 'PawnShop', // Unikalny typ dla logiki
        balanceSheet: { assets: 400000, liabilities: 0, shareCapital: 40000, retainedEarnings: 360000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        holdingPortfolio: { 'WRN': { quantity: 8, purchasePrice: 620 } },
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false
    },
    {
        name: 'Retax Biuro Obrachunkowe',
        price: 40.00, volatilityFactor: 0.8, symbol: 'TAX', exchange: 'BRONZE',
        totalShares: 20000, maxShares: 30000, sharesHeld: 0,
        sector: ['Finanse Konsumenckie', 'Usługi'],
        financialHealth: 3, lastReport: 'brak', cash: 50000, // Stabilny biznes, nie wymaga dużo gotówki
        assetType: 'Accounting', // Unikalny typ dla logiki
        balanceSheet: { assets: 50000, liabilities: 0, shareCapital: 5000, retainedEarnings: 45000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false
    },
    // --- NOWE SPÓŁKI SKARBU PAŃSTWA ---

    {
        name: 'Puls Rynku S.A.',
        price: 110.00, volatilityFactor: 1.1, symbol: 'PULS', exchange: 'SILVER',
        totalShares: 30000, maxShares: 40000, sharesHeld: 0,
        sector: ['Media', 'Usługi'],
        financialHealth: 2, lastReport: 'brak', cash: 300000,
        assetType: 'Holding', // Traktujemy je jak Holdingi, aby mogły kupować akcje innych
        specializationSectors: ['Media'], // Flaga identyfikująca
        holdingPortfolio: {},
        balanceSheet: { assets: 300000, liabilities: 0, shareCapital: 30000, retainedEarnings: 270000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false,
        // Dane specyficzne dla mediów
        newspaperData: { 
            layout: 'layout1', // Inny wygląd (na przyszłość)
            eventLog: [], // Własny log zdarzeń
            adRevenuePerClick: 15.0 // Zysk za otwarcie gazety z reklamą
        },
        stance: 'neutral', // ('neutral', 'pro-player', 'anti-player')
        favors: {} // Obiekt firm, które kupiły przychylność (np. {'PLY': true})
    },
    {
        name: 'Flesz Giełdowy',
        price: 95.00, volatilityFactor: 1.3, symbol: 'FLESZ', exchange: 'SILVER',
        totalShares: 25000, maxShares: 35000, sharesHeld: 0,
        sector: ['Media', 'Usługi'],
        financialHealth: 1, lastReport: 'brak', cash: 200000,
        assetType: 'Holding', 
        specializationSectors: ['Media'],
        holdingPortfolio: {},
        balanceSheet: { assets: 200000, liabilities: 0, shareCapital: 20000, retainedEarnings: 180000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Growth', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false,
        newspaperData: { 
            layout: 'layout2',
            eventLog: [], 
            adRevenuePerClick: 10.0
        },
        stance: 'neutral',
        favors: {}
    },
    {
        name: 'Obserwator Finansowy',
        price: 120.00, volatilityFactor: 0.9, symbol: 'OBSER', exchange: 'SILVER',
        totalShares: 30000, maxShares: 40000, sharesHeld: 0,
        sector: ['Media', 'Usługi'],
        financialHealth: 3, lastReport: 'brak', cash: 400000,
        assetType: 'Holding', 
        specializationSectors: ['Media'],
        holdingPortfolio: {},
        balanceSheet: { assets: 400000, liabilities: 0, shareCapital: 40000, retainedEarnings: 360000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false,
        newspaperData: { 
            layout: 'layout3',
            eventLog: [], 
            adRevenuePerClick: 12.0
        },
        stance: 'neutral',
        favors: {}
    },
    
    // NOWY KOD (POPRAWIONY)
    {
        name: 'Bank Finansowania Projektów',
        price: 0, volatilityFactor: 0.4, symbol: 'BFP', exchange: 'SILVER',
        totalShares: 50000, maxShares: 60000, sharesHeld: 0,
        sector: ['Finanse'],
        financialHealth: 2, lastReport: 'brak', cash: 14000000, isTradeLocked: false,
        assetType: 'Holding',
        holdingPortfolio: {},
        specializationFilter: 'stateOwned',
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z)  candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null },

        // --- DODANE LUB POPRAWIONE LINIE ---
        isStateOwned: true,           // Ustawienie flagi państwowej
        stateOwnershipPct: 0.75,      // Przykładowo 75% udziałów państwa
        eventResistance: 0.6,         // Odporność na zdarzenia (typowa dla spółek państwowych)
        stateOfferCooldownUntil: 0    // Timer dla ofert gracza
        // --- KONIEC POPRAWEK ---
    },
    {
    name: 'Energa', price: 90.00, volatilityFactor: 0.6, symbol: 'ENG', exchange: 'SILVER', totalShares: 55000, maxShares: 65000, sharesHeld: 0, stateOfferCooldownUntil: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Energia'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.60, eventResistance: 0.6, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Tauron', price: 85.00, volatilityFactor: 0.7, symbol: 'TRN', exchange: 'SILVER', totalShares: 60000, maxShares: 70000, sharesHeld: 0, stateOfferCooldownUntil: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Energia'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.55, eventResistance: 0.6, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Państwowy Uran', price: 420.00, volatilityFactor: 0.9, symbol: 'PUR', exchange: 'GOLD', totalShares: 80000, maxShares: 100000, sharesHeld: 0, stateOfferCooldownUntil: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Przemysł', 'Energia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.80, eventResistance: 0.7, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Miedź Ludowa', price: 450.00, volatilityFactor: 0.8, symbol: 'MLD', exchange: 'GOLD', totalShares: 90000, maxShares: 110000, sharesHeld: 0, stateOfferCooldownUntil: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.65, eventResistance: 0.7, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Narodowy Operator Cyfrowy', price: 510.00, volatilityFactor: 0.5, symbol: 'NOC', exchange: 'GOLD', totalShares: 100000, maxShares: 120000, stateOfferCooldownUntil: 0, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Technologia', 'Usługi'], financialHealth: 2, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.90, eventResistance: 0.8, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Fundacja Przedsiębiorczości Miejskiej',
        price: 100.00, // Cena startowa
        volatilityFactor: 0.1, // Bardzo stabilna
        symbol: 'FPM',
        exchange: 'SILVER',
        totalShares: 100000, maxShares: 100000, sharesHeld: 0, insiderShares: 100000, // 100% akcji w rękach fundacji
        sector: ['Finanse'],
        financialHealth: 5, lastReport: 'brak', cash: 2000000,
        assetType: 'Holding', // Działa jak Holding
        holdingPortfolio: {},
        specializationSectors: ['Finanse Konsumenckie'], // Specjalizacja (na razie pusta)
        balanceSheet: { assets: 2000000, liabilities: 0, shareCapital: 200000, retainedEarnings: 1800000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        
        isStateOwned: true,           // Traktujemy ją jako "państwową" dla mechaniki
        stateOwnershipPct: 1.0,       // Miasto posiada 100%
        canBeTraded: false,           // ===>>> GRACZ NIE MOŻE JEJ KUPIĆ/SPRZEDAĆ <<<===
        cannotGoBankrupt: true,       // Nie może zbankrutować
        
        dividendPolicy: 'None', dividendTimer: 999999999, estimatedDividend: 0,
        bankAccountId: null, isBankStock: false
    },

    // --- NOWE SPÓŁKI TYPU REIT ---
    {
        name: 'Global Real Estate Trust',
        price: 450.00, volatilityFactor: 0.2, symbol: 'GRET', exchange: 'GOLD',
    totalShares: 100000, maxShares: 100000, sharesHeld: 0, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Nieruchomości'],
        financialHealth: 3, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, isStateOwned: false,
        assetType: 'REIT', dividendPerShare: 0.1, dividendTimer: 2 * 60 * 1000 // REIT-y mają własny, stały zegar i dywidendę na akcję
    },
    {
        name: 'Urban Office REIT',
        price: 520.00, volatilityFactor: 0.2, symbol: 'UOR', exchange: 'GOLD',
    totalShares: 80000, maxShares: 80000, sharesHeld: 0, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Nieruchomości'],
        financialHealth: 2, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, isStateOwned: false,
        assetType: 'REIT', dividendPerShare: 0.15, dividendTimer: 2 * 60 * 1000
    },

    {
        name: 'Hospital rental',
        price: 1350.00, volatilityFactor: 0.18, symbol: 'HOR', exchange: 'PLATINUM',
    totalShares: 800000, maxShares: 1500000, sharesHeld: 0, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Nieruchomości'],
        financialHealth: 3, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, isStateOwned: false,
        assetType: 'REIT', dividendPerShare: 0.2, dividendTimer: 2 * 60 * 1100
    },
    {
        name: 'Morskie REITy',
        price: 790.00, volatilityFactor: 0.25, symbol: 'REJS', exchange: 'GOLD',
    totalShares: 66000, maxShares: 150000, sharesHeld: 0, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Nieruchomości'],
        financialHealth: 2, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, isStateOwned: false,
        assetType: 'REIT', dividendPerShare: 0.166, dividendTimer: 2 * 60 * 1000
    },

    {
        name: 'Heavy Metal Holding',
        price: 120.00, volatilityFactor: 0.5, symbol: 'HMH', exchange: 'SILVER',
        totalShares: 75000, maxShares: 75000, sharesHeld: 0, 
        sector: ['Finanse'], financialHealth: 2, lastReport: 'brak', cash: 9000000,
        assetType: 'Holding', // Specjalny typ spółki
        holdingPortfolio: {}, // Wewnętrzny portfel akcji
        specializationSectors: ['Energia', 'Chemia', 'Przemysł', 'Dobra konsumpcyjne'], // Specjalizacja
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null }
    },
    {
        name: 'Quick Buissness Finance',
        price: 150.00, volatilityFactor: 0.8, symbol: 'QBF', exchange: 'GOLD',
        totalShares: 90000, maxShares: 90000, sharesHeld: 0,
        sector: ['Finanse'], financialHealth: 2, lastReport: 'brak', cash: 13500000,
        assetType: 'Holding',
        holdingPortfolio: {},
        specializationSectors: ['Technologia', 'Bankowość', 'Usługi', 'Nieruchomości'],
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null }
    },
    {
        name: 'Holding Rekreacyjny',
        price: 135.00, volatilityFactor: 0.4, symbol: 'VSF', exchange: 'SILVER',
        totalShares: 80000, maxShares: 80000, sharesHeld: 0,
        sector: ['Finanse'], financialHealth: 2, lastReport: 'brak', cash: 10800000,
        assetType: 'Holding',
        holdingPortfolio: {},
        specializationSectors: ['Żywność', 'Turystyka', 'Medycyna', 'Gaming'],
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null }
    }

];

const CONSTRUCTION_COMPANIES_DATA = [
    { name: 'Budimix', exchange: 'GOLD', price: 450, volatility: 0.8, sector: ['Budowlany'] },
    { name: 'DrogiStal', exchange: 'SILVER', price: 120, volatility: 1.1, sector: ['Budowlany', 'Przemysł'] },
    { name: 'BobBuild', exchange: 'BRONZE', price: 40, volatility: 1.5, sector: ['Budowlany'] },
    { name: 'Infrastrukturex', exchange: 'GOLD', price: 520, volatility: 0.7, sector: ['Budowlany'] },
    { name: 'Budipol', exchange: 'SILVER', price: 180, volatility: 0.9, sector: ['Budowlany'] },
    // Betonex już istnieje w initialStocks, zaktualizujemy go dynamicznie lub ręcznie
    { name: 'Bractwo Stali', exchange: 'PLATINUM', price: 1600, volatility: 0.6, sector: ['Budowlany', 'Przemysł'] },
    { name: 'Majsterbud', exchange: 'BRONZE', price: 25, volatility: 2.0, sector: ['Budowlany'] },
    { name: 'Giereklud', exchange: 'GOLD', price: 380, volatility: 0.5, sector: ['Budowlany'], isStateOwned: true, stateOwnershipPct: 1.0 }
];

// Rodzaje pozycji katalogu inwestycji:
//  construction — wymaga robót budowlanych (budowa, rozbudowa, modernizacja infrastruktury)
//  mixed        — etap budowlany (przetarg) + etap wyposażenia realizowany przez samą spółkę
//  equipment, software, marketing, training, organization, expansion — bez robót budowlanych
//                 (realizowane jako zwykłe inwestycje; w przyszłości zlecenia sektorowe)
const CONSTRUCTION_KINDS = ['construction', 'mixed'];

// Jawna klasyfikacja każdej pozycji — nie zgadujemy po nazwie.
// constructionShare — część kosztu przypadająca na roboty budowlane (dla 'mixed').
// requirements — minimalne wymagania wobec wykonawcy (doświadczenie, technologia).
const INVESTMENT_CLASSIFICATION = {
    marketing_campaign: { kind: 'marketing' },
    equipment_upgrade: { kind: 'equipment' },
    software_update: { kind: 'software' },
    new_branch: { kind: 'construction' },
    foreign_expansion: { kind: 'expansion' },
    employee_training: { kind: 'training' },

    new_factory: { kind: 'construction' },
    new_mine: { kind: 'construction', requirements: { minExperience: 15 } },

    server_room: { kind: 'mixed', constructionShare: 0.45 },
    chip_factory: { kind: 'mixed', constructionShare: 0.60, requirements: { minExperience: 20 } },
    software_development_center: { kind: 'organization' },

    research_lab: { kind: 'mixed', constructionShare: 0.50 },
    hospital: { kind: 'construction', requirements: { minExperience: 20 } },
    pharma_factory: { kind: 'mixed', constructionShare: 0.65 },

    energy_plant: { kind: 'construction', requirements: { minExperience: 20 } },
    wind_farm: { kind: 'construction' },
    solar_park: { kind: 'construction' },

    logistics_hub: { kind: 'construction' },
    distribution_center: { kind: 'construction' },
    warehouse_automation: { kind: 'mixed', constructionShare: 0.45 },

    office_building: { kind: 'construction' },
    warehouse: { kind: 'construction' },
    residential_complex: { kind: 'construction', requirements: { minExperience: 10 } },
    shopping_center: { kind: 'construction', requirements: { minExperience: 15 } },
    industrial_park: { kind: 'construction', requirements: { minExperience: 20 } },
    skyscraper: { kind: 'construction', requirements: { minExperience: 30, requiredTech: 'BUILDING_HIGH_RISE_1' } },

    game_studio: { kind: 'organization' },
    esports_arena: { kind: 'construction' },
    vr_development_lab: { kind: 'equipment' },
    mobile_game_studio: { kind: 'organization' },
    streaming_platform: { kind: 'software' },
    gaming_casino: { kind: 'construction' },

    hotel_chain: { kind: 'construction' },
    resort: { kind: 'construction', requirements: { minExperience: 10 } },
    theme_park: { kind: 'construction', requirements: { minExperience: 15 } },
    cruise_terminal: { kind: 'construction', requirements: { minExperience: 15 } },
    ski_resort: { kind: 'construction' },
    casino: { kind: 'construction' },

    food_processing_plant: { kind: 'mixed', constructionShare: 0.60 },
    dairy_farm: { kind: 'construction' },
    brewery: { kind: 'mixed', constructionShare: 0.55 },

    production_facility: { kind: 'construction' },
    textile_factory: { kind: 'mixed', constructionShare: 0.55 },
    electronics_assembly: { kind: 'equipment' },

    service_center: { kind: 'organization' },
    call_center: { kind: 'organization' },
    consulting_office: { kind: 'organization' },
    it_services_center: { kind: 'organization' },
    legal_services: { kind: 'organization' },
    accounting_firm: { kind: 'organization' },

    research_facility: { kind: 'construction', requirements: { minExperience: 10 } },
    innovation_lab: { kind: 'mixed', constructionShare: 0.40 },
    testing_center: { kind: 'mixed', constructionShare: 0.50 },
    biotech_lab: { kind: 'mixed', constructionShare: 0.40 },
    aerospace_research: { kind: 'construction', requirements: { minExperience: 20 } },
    materials_science_lab: { kind: 'mixed', constructionShare: 0.45 },

    bank_headquarters: { kind: 'construction', requirements: { minExperience: 15 } },
    data_center_finance: { kind: 'mixed', constructionShare: 0.45 },
    vault_building: { kind: 'construction' },

    financial_tower: { kind: 'construction', requirements: { minExperience: 25 } },
    trading_floor: { kind: 'equipment' },
    fintech_hub: { kind: 'software' },

    chemical_plant: { kind: 'construction', requirements: { minExperience: 15 } },
    refinery: { kind: 'construction', requirements: { minExperience: 20 } },
    rnd_lab_chemistry: { kind: 'mixed', constructionShare: 0.45 },

    tv_studio: { kind: 'mixed', constructionShare: 0.50 },
    broadcasting_center: { kind: 'construction' },
    cinema_complex: { kind: 'construction' },

    cargo_terminal: { kind: 'construction', requirements: { minExperience: 15 } },
    container_port: { kind: 'construction', requirements: { minExperience: 25 } },
    fuel_station_network: { kind: 'construction' }
};

const INVESTMENT_KIND_LABELS = {
    construction: 'Budowa (przetarg)',
    mixed: 'Budowa + wyposażenie',
    equipment: 'Sprzęt',
    software: 'Oprogramowanie',
    marketing: 'Marketing',
    training: 'Szkolenia',
    organization: 'Organizacja',
    expansion: 'Ekspansja',
    investment: 'Inwestycja'
};

const INVESTMENT_CATALOG = {
    'general': [
        { 
            id: 'marketing_campaign', 
            name: "Kampania Marketingowa", 
            icon: 'img/billboardicon.png', 
            cost: 100000, duration: 4, assetValue: 0, incomeBonus: 0.15, healthBonus: 0, minDevLevel: 1,
            maintenance: 0 // Marketing nie ma kosztów utrzymania po zakończeniu
        },
        { 
            id: 'equipment_upgrade', 
            name: "Modernizacja Sprzętu", 
            icon: 'img/equipment.png', 
            cost: 50000, duration: 2, assetValue: 30000, incomeBonus: 0.02, healthBonus: 0.5, minDevLevel: 1,
            maintenance: 500 // Serwisowanie sprzętu
        },
        { 
            id: 'software_update', 
            name: "Aktualizacja Systemów IT", 
            icon: 'img/update.png', 
            cost: 20000, duration: 1, assetValue: 0, incomeBonus: 0.01, healthBonus: 0.1, minDevLevel: 1,
            maintenance: 200 // Licencje
        },
        { 
            id: 'new_branch', 
            name: "Nowa Filia", 
            icon: 'img/branch.png', 
            cost: 200000, duration: 12, assetValue: 150000, incomeBonus: 0.1, healthBonus: 0.2, minDevLevel: 2,
            maintenance: 2000 // Czynsz, media
        },
        { 
            id: 'foreign_expansion', 
            name: "Ekspansja Zagraniczna", 
            icon: 'img/globe.png', 
            cost: 1000000, duration: 36, assetValue: 800000, incomeBonus: 0.25, healthBonus: 0, minDevLevel: 3,
            maintenance: 10000 // Biura zagraniczne
        },
        { 
            id: 'employee_training', 
            name: "Centrum Szkoleniowe", 
            icon: 'img/box.png', 
            cost: 150000, duration: 8, assetValue: 100000, incomeBonus: 0.03, healthBonus: 0.8, minDevLevel: 2,
            maintenance: 1000 
        }
    ],
    'Przemysł': [
        { id: 'new_factory', name: "Nowa Fabryka", icon: 'img/fabrykaicon.png', cost: 800000, duration: 40, assetValue: 700000, incomeBonus: 0.2, healthBonus: 0.5, minDevLevel: 2, maintenance: 5000 },
        { id: 'new_mine', name: "Nowy Szyb Wydobywczy", icon: 'img/mine.png', cost: 1500000, duration: 50, assetValue: 1200000, incomeBonus: 0.3, healthBonus: 0.2, minDevLevel: 3, maintenance: 8000 }
    ],
    'Technologia': [
        { id: 'server_room', name: "Własna Serwerownia", icon: 'img/server.png', cost: 400000, duration: 16, assetValue: 300000, incomeBonus: 0.15, healthBonus: 0.2, minDevLevel: 2, maintenance: 3000 }, // Prąd!
        { id: 'chip_factory', name: "Fabryka Chipów", icon: 'img/fabrykaicon.png', cost: 1200000, duration: 50, assetValue: 1000000, incomeBonus: 0.25, healthBonus: 0.5, minDevLevel: 3, maintenance: 8000 },
        { id: 'software_development_center', name: "Centrum Rozwoju Oprogramowania", icon: 'img/server.png', cost: 600000, duration: 25, assetValue: 500000, incomeBonus: 0.18, healthBonus: 0.3, minDevLevel: 2, maintenance: 4000 }
    ],
    'Medycyna': [
        { id: 'research_lab', name: "Laboratorium Badawcze", icon: 'img/medlab.png', cost: 600000, duration: 20, assetValue: 500000, incomeBonus: 0.1, healthBonus: 1.5, minDevLevel: 2, maintenance: 4000 },
        { id: 'hospital', name: "Szpital", icon: 'img/branch.png', cost: 1500000, duration: 60, assetValue: 1200000, incomeBonus: 0.3, healthBonus: 2.0, minDevLevel: 4, maintenance: 10000 },
        { id: 'pharma_factory', name: "Fabryka Leków", icon: 'img/fabrykaicon.png', cost: 1000000, duration: 40, assetValue: 800000, incomeBonus: 0.22, healthBonus: 1.0, minDevLevel: 3, maintenance: 6000 }
    ],
    'Energia': [
        { id: 'energy_plant', name: "Rozbudowa Elektrowni", icon: 'img/fabrykaicon.png', cost: 1200000, duration: 30, assetValue: 1000000, incomeBonus: 0.18, healthBonus: 1.0, minDevLevel: 3, maintenance: 6000 },
        { id: 'wind_farm', name: "Farma Wiatrowa", icon: 'img/fabrykaicon.png', cost: 800000, duration: 35, assetValue: 650000, incomeBonus: 0.15, healthBonus: 0.8, minDevLevel: 2, maintenance: 4000 },
        { id: 'solar_park', name: "Park Słoneczny", icon: 'img/fabrykaicon.png', cost: 600000, duration: 25, assetValue: 500000, incomeBonus: 0.12, healthBonus: 0.6, minDevLevel: 2, maintenance: 3000 }
    ],
    'Logistyka': [
        { id: 'logistics_hub', name: "Centrum Logistyczne", icon: 'img/box.png', cost: 500000, duration: 24, assetValue: 400000, incomeBonus: 0.12, healthBonus: 0.3, minDevLevel: 2, maintenance: 2500 },
        { id: 'distribution_center', name: "Centrum Dystrybucyjne", icon: 'img/box.png', cost: 700000, duration: 30, assetValue: 550000, incomeBonus: 0.16, healthBonus: 0.4, minDevLevel: 2, maintenance: 3500 },
        { id: 'warehouse_automation', name: "Automatyczna Hala Magazynowa", icon: 'img/box.png', cost: 900000, duration: 40, assetValue: 700000, incomeBonus: 0.2, healthBonus: 0.5, minDevLevel: 3, maintenance: 4500 }
    ],
    'Budowlany': [
        { id: 'office_building', name: "Biurowiec", icon: 'img/branch.png', cost: 600000, duration: 30, assetValue: 500000, incomeBonus: 0.15, healthBonus: 0.4, minDevLevel: 2, maintenance: 3000 },
        { id: 'warehouse', name: "Hala Magazynowa", icon: 'img/box.png', cost: 400000, duration: 20, assetValue: 350000, incomeBonus: 0.1, healthBonus: 0.2, minDevLevel: 1, maintenance: 2000 },
        { id: 'residential_complex', name: "Osiedle Mieszkaniowe", icon: 'img/branch.png', cost: 1000000, duration: 45, assetValue: 800000, incomeBonus: 0.2, healthBonus: 0.5, minDevLevel: 3, maintenance: 5000 },
        { id: 'shopping_center', name: "Centrum Handlowe", icon: 'img/branch.png', cost: 1500000, duration: 60, assetValue: 1200000, incomeBonus: 0.25, healthBonus: 0.6, minDevLevel: 4, maintenance: 8000 },
        { id: 'industrial_park', name: "Park Przemysłowy", icon: 'img/fabrykaicon.png', cost: 2000000, duration: 80, assetValue: 1600000, incomeBonus: 0.3, healthBonus: 0.7, minDevLevel: 5, maintenance: 10000 },
        { id: 'skyscraper', name: "Wieżowiec", icon: 'img/branch.png', cost: 3000000, duration: 100, assetValue: 2400000, incomeBonus: 0.35, healthBonus: 0.8, minDevLevel: 6, maintenance: 15000 }
    ],
    'Gaming': [
        { id: 'game_studio', name: "Studio Gier", icon: 'img/server.png', cost: 300000, duration: 12, assetValue: 250000, incomeBonus: 0.08, healthBonus: 0.5, minDevLevel: 1, maintenance: 1500 },
        { id: 'esports_arena', name: "Arena eSport", icon: 'img/branch.png', cost: 600000, duration: 25, assetValue: 480000, incomeBonus: 0.15, healthBonus: 0.3, minDevLevel: 2, maintenance: 3000 },
        { id: 'vr_development_lab', name: "Laboratorium VR", icon: 'img/medlab.png', cost: 800000, duration: 35, assetValue: 640000, incomeBonus: 0.18, healthBonus: 0.4, minDevLevel: 3, maintenance: 4000 },
        { id: 'mobile_game_studio', name: "Studio Gier Mobilnych", icon: 'img/server.png', cost: 400000, duration: 15, assetValue: 320000, incomeBonus: 0.1, healthBonus: 0.6, minDevLevel: 1, maintenance: 2000 },
        { id: 'streaming_platform', name: "Platforma Streamingowa", icon: 'img/server.png', cost: 1000000, duration: 40, assetValue: 800000, incomeBonus: 0.22, healthBonus: 0.5, minDevLevel: 3, maintenance: 5000 },
        { id: 'gaming_casino', name: "Kasyno Gier", icon: 'img/branch.png', cost: 700000, duration: 30, assetValue: 550000, incomeBonus: 0.16, healthBonus: 0.35, minDevLevel: 2, maintenance: 3500 }
    ],
    'Turystyka': [
        { id: 'hotel_chain', name: "Łańcuch Hoteli", icon: 'img/branch.png', cost: 800000, duration: 35, assetValue: 600000, incomeBonus: 0.18, healthBonus: 0.4, minDevLevel: 2, maintenance: 4000 },
        { id: 'resort', name: "Kurort", icon: 'img/globe.png', cost: 1200000, duration: 50, assetValue: 900000, incomeBonus: 0.22, healthBonus: 0.5, minDevLevel: 3, maintenance: 6000 },
        { id: 'theme_park', name: "Park Rozrywki", icon: 'img/globe.png', cost: 2000000, duration: 70, assetValue: 1500000, incomeBonus: 0.3, healthBonus: 0.6, minDevLevel: 4, maintenance: 10000 },
        { id: 'cruise_terminal', name: "Terminal Promowy", icon: 'img/box.png', cost: 1000000, duration: 40, assetValue: 800000, incomeBonus: 0.2, healthBonus: 0.45, minDevLevel: 3, maintenance: 5000 },
        { id: 'ski_resort', name: "Ośrodek Narciarski", icon: 'img/globe.png', cost: 900000, duration: 45, assetValue: 700000, incomeBonus: 0.19, healthBonus: 0.42, minDevLevel: 2, maintenance: 4500 },
        { id: 'casino', name: "Kasyno", icon: 'img/branch.png', cost: 600000, duration: 25, assetValue: 480000, incomeBonus: 0.14, healthBonus: 0.3, minDevLevel: 2, maintenance: 3000 }
    ],
    'Żywność': [
        { id: 'food_processing_plant', name: "Zakład Przetwórstwa Żywności", icon: 'img/fabrykaicon.png', cost: 700000, duration: 28, assetValue: 550000, incomeBonus: 0.16, healthBonus: 0.3, minDevLevel: 2, maintenance: 3500 },
        { id: 'dairy_farm', name: "Farma Mleczna", icon: 'img/fabrykaicon.png', cost: 500000, duration: 20, assetValue: 400000, incomeBonus: 0.14, healthBonus: 0.25, minDevLevel: 1, maintenance: 2500 },
        { id: 'brewery', name: "Browar", icon: 'img/fabrykaicon.png', cost: 600000, duration: 25, assetValue: 480000, incomeBonus: 0.18, healthBonus: 0.35, minDevLevel: 2, maintenance: 3000 }
    ],
    'Dobra konsumpcyjne': [
        { id: 'production_facility', name: "Zakład Produkcyjny", icon: 'img/fabrykaicon.png', cost: 500000, duration: 22, assetValue: 400000, incomeBonus: 0.12, healthBonus: 0.25, minDevLevel: 1, maintenance: 2500 },
        { id: 'textile_factory', name: "Fabryka Tekstyliów", icon: 'img/fabrykaicon.png', cost: 400000, duration: 18, assetValue: 320000, incomeBonus: 0.1, healthBonus: 0.2, minDevLevel: 1, maintenance: 2000 },
        { id: 'electronics_assembly', name: "Linia Montażu Elektroniki", icon: 'img/fabrykaicon.png', cost: 800000, duration: 30, assetValue: 640000, incomeBonus: 0.2, healthBonus: 0.4, minDevLevel: 2, maintenance: 4000 }
    ],
    'Usługi': [
        { id: 'service_center', name: "Centrum Usługowe", icon: 'img/branch.png', cost: 400000, duration: 18, assetValue: 300000, incomeBonus: 0.1, healthBonus: 0.2, minDevLevel: 1, maintenance: 2000 },
        { id: 'call_center', name: "Centrum Obsługi Klienta", icon: 'img/branch.png', cost: 300000, duration: 15, assetValue: 240000, incomeBonus: 0.08, healthBonus: 0.15, minDevLevel: 1, maintenance: 1500 },
        { id: 'consulting_office', name: "Biuro Konsultingowe", icon: 'img/branch.png', cost: 500000, duration: 20, assetValue: 400000, incomeBonus: 0.12, healthBonus: 0.25, minDevLevel: 2, maintenance: 2500 },
        { id: 'it_services_center', name: "Centrum Usług IT", icon: 'img/server.png', cost: 600000, duration: 25, assetValue: 480000, incomeBonus: 0.14, healthBonus: 0.3, minDevLevel: 2, maintenance: 3000 },
        { id: 'legal_services', name: "Biuro Prawnicze", icon: 'img/branch.png', cost: 350000, duration: 16, assetValue: 280000, incomeBonus: 0.09, healthBonus: 0.18, minDevLevel: 1, maintenance: 1800 },
        { id: 'accounting_firm', name: "Firma Księgowa", icon: 'img/branch.png', cost: 250000, duration: 12, assetValue: 200000, incomeBonus: 0.07, healthBonus: 0.12, minDevLevel: 1, maintenance: 1300 }
    ],
    'Badania': [
        { id: 'research_facility', name: "Obiekt Badawczy", icon: 'img/medlab.png', cost: 900000, duration: 40, assetValue: 700000, incomeBonus: 0.14, healthBonus: 1.0, minDevLevel: 3, maintenance: 4500 },
        { id: 'innovation_lab', name: "Laboratorium Innowacji", icon: 'img/medlab.png', cost: 700000, duration: 30, assetValue: 550000, incomeBonus: 0.12, healthBonus: 0.8, minDevLevel: 2, maintenance: 3500 },
        { id: 'testing_center', name: "Centrum Testowe", icon: 'img/medlab.png', cost: 500000, duration: 20, assetValue: 400000, incomeBonus: 0.1, healthBonus: 0.6, minDevLevel: 1, maintenance: 2500 },
        { id: 'biotech_lab', name: "Laboratorium Biotechnologiczne", icon: 'img/medlab.png', cost: 1100000, duration: 45, assetValue: 850000, incomeBonus: 0.16, healthBonus: 1.2, minDevLevel: 3, maintenance: 5500 },
        { id: 'aerospace_research', name: "Centrum Badań Lotniczych", icon: 'img/medlab.png', cost: 1500000, duration: 60, assetValue: 1200000, incomeBonus: 0.2, healthBonus: 1.5, minDevLevel: 4, maintenance: 7500 },
        { id: 'materials_science_lab', name: "Laboratorium Nauk Materiałowych", icon: 'img/medlab.png', cost: 800000, duration: 35, assetValue: 650000, incomeBonus: 0.13, healthBonus: 0.9, minDevLevel: 2, maintenance: 4000 }
    ],
    'Bankowość': [
        { id: 'bank_headquarters', name: "Siedziba Banku", icon: 'img/branch.png', cost: 1800000, duration: 50, assetValue: 1500000, incomeBonus: 0.28, healthBonus: 0.8, minDevLevel: 4, maintenance: 12000 },
        { id: 'data_center_finance', name: "Centrum Danych Finansowych", icon: 'img/server.png', cost: 1200000, duration: 35, assetValue: 900000, incomeBonus: 0.2, healthBonus: 0.6, minDevLevel: 3, maintenance: 7000 },
        { id: 'vault_building', name: "Budynk Sejfów", icon: 'img/branch.png', cost: 800000, duration: 25, assetValue: 600000, incomeBonus: 0.15, healthBonus: 0.4, minDevLevel: 2, maintenance: 5000 }
    ],
    'Finanse': [
        { id: 'financial_tower', name: "Wieża Finansowa", icon: 'img/branch.png', cost: 2000000, duration: 55, assetValue: 1700000, incomeBonus: 0.3, healthBonus: 0.85, minDevLevel: 4, maintenance: 13000 },
        { id: 'trading_floor', name: "Piętro Tradingowe", icon: 'img/branch.png', cost: 1500000, duration: 40, assetValue: 1200000, incomeBonus: 0.25, healthBonus: 0.7, minDevLevel: 3, maintenance: 9000 },
        { id: 'fintech_hub', name: "Hub FinTech", icon: 'img/server.png', cost: 1000000, duration: 30, assetValue: 800000, incomeBonus: 0.2, healthBonus: 0.5, minDevLevel: 2, maintenance: 6000 }
    ],
    'Chemia': [
        { id: 'chemical_plant', name: "Zakład Chemiczny", icon: 'img/fabrykaicon.png', cost: 1300000, duration: 45, assetValue: 1100000, incomeBonus: 0.24, healthBonus: 0.7, minDevLevel: 3, maintenance: 8000 },
        { id: 'refinery', name: "Rafineria", icon: 'img/fabrykaicon.png', cost: 1800000, duration: 60, assetValue: 1500000, incomeBonus: 0.32, healthBonus: 0.9, minDevLevel: 4, maintenance: 11000 },
        { id: 'rnd_lab_chemistry', name: "Laboratorium R&D Chemiczne", icon: 'img/medlab.png', cost: 900000, duration: 35, assetValue: 700000, incomeBonus: 0.18, healthBonus: 1.2, minDevLevel: 3, maintenance: 5000 }
    ],
    'Media': [
        { id: 'tv_studio', name: "Studio Telewizyjne", icon: 'img/branch.png', cost: 1400000, duration: 45, assetValue: 1100000, incomeBonus: 0.22, healthBonus: 0.6, minDevLevel: 3, maintenance: 8500 },
        { id: 'broadcasting_center', name: "Centrum Nadawcze", icon: 'img/branch.png', cost: 1000000, duration: 35, assetValue: 800000, incomeBonus: 0.18, healthBonus: 0.5, minDevLevel: 2, maintenance: 6000 },
        { id: 'cinema_complex', name: "Kompleks Kinowy", icon: 'img/branch.png', cost: 800000, duration: 28, assetValue: 650000, incomeBonus: 0.16, healthBonus: 0.4, minDevLevel: 2, maintenance: 4500 }
    ],
    'Transport': [
        { id: 'cargo_terminal', name: "Terminal Cargo", icon: 'img/box.png', cost: 1100000, duration: 38, assetValue: 900000, incomeBonus: 0.2, healthBonus: 0.55, minDevLevel: 3, maintenance: 6500 },
        { id: 'container_port', name: "Port Kontenerowy", icon: 'img/box.png', cost: 1600000, duration: 55, assetValue: 1300000, incomeBonus: 0.26, healthBonus: 0.75, minDevLevel: 4, maintenance: 9500 },
        { id: 'fuel_station_network', name: "Sieć Stacji Paliw", icon: 'img/branch.png', cost: 700000, duration: 22, assetValue: 550000, incomeBonus: 0.14, healthBonus: 0.35, minDevLevel: 2, maintenance: 4000 }
    ]
};

// Uzupełnienie pozycji katalogu: rodzaj, wymagania i jednolita jednostka czasu.
// Czas w katalogu jest wyrażony w DNIACH (budowy lub realizacji); 1 dzień = 1/7 tygodnia gry.
Object.values(INVESTMENT_CATALOG).forEach(category => {
    if (!Array.isArray(category)) return;

    category.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const classification = INVESTMENT_CLASSIFICATION[item.id] || {};

        item.kind = classification.kind || item.kind || 'investment';
        item.type = item.kind;
        item.durationDays = Number(item.durationDays ?? item.duration) || 1;
        item.constructionShare = item.kind === 'mixed'
            ? Number(classification.constructionShare) || 0.5
            : (item.kind === 'construction' ? 1 : 0);
        item.requirements = classification.requirements || {};
        item.isConstructionProject = CONSTRUCTION_KINDS.includes(item.kind);
    });
});

function getCatalogEntryById(id) {
    if (!id) return null;
    for (const category of Object.values(INVESTMENT_CATALOG)) {
        const found = category.find(item => item.id === id);
        if (found) return found;
    }
    return null;
}

/** Wszystkie pozycje katalogu dostępne dla spółki: ogólne + wszystkie jej sektory, bez duplikatów. */
function getInvestmentCatalogForCompany(company) {
    const sectors = Array.isArray(company?.sector) ? company.sector : [];
    const seen = new Set();
    const result = [];

    for (const key of ['general', ...sectors]) {
        for (const item of INVESTMENT_CATALOG[key] || []) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            result.push(item);
        }
    }

    return result;
}

/** Specyfikacja etapu budowlanego dla przetargu (null, jeśli pozycja nie wymaga robót budowlanych). */
function getConstructionSpec(id) {
    const item = getCatalogEntryById(id);
    if (!item || !CONSTRUCTION_KINDS.includes(item.kind)) return null;

    const share = item.constructionShare;
    const days = Math.max(1, Math.round(item.durationDays * (item.kind === 'mixed' ? Math.max(0.6, share) : 1)));

    return {
        id: item.id,
        name: item.kind === 'mixed' ? `${item.name} (etap budowlany)` : item.name,
        kind: item.kind,
        cost: Math.round(item.cost * share),
        catalogCost: item.cost,
        constructionShare: share,
        durationDays: days,
        duration: days,
        estimatedMarketValue: Math.round((Number(item.assetValue) || 0) * share),
        incomeBonus: item.kind === 'construction' ? Number(item.incomeBonus) || 0 : 0,
        maintenance: Math.round((Number(item.maintenance) || 0) * share),
        healthBonus: item.kind === 'construction' ? Number(item.healthBonus) || 0 : 0,
        minDevLevel: Number(item.minDevLevel) || 0,
        requirements: { ...(item.requirements || {}) }
    };
}

/**
 * Katalog budowlany dostępny dla konkretnej spółki — ta sama funkcja dla UI i dla AI.
 * Wymaganie to poziom działu rozwoju (nie kondycja finansowa).
 */
function getConstructionCatalogForCompany(company, options = {}) {
    const devLevel = Number(company?.departments?.development?.level) || 0;

    return getInvestmentCatalogForCompany(company)
        .filter(item => CONSTRUCTION_KINDS.includes(item.kind))
        .filter(item => options.ignoreLevel || devLevel >= (Number(item.minDevLevel) || 0));
}

// --- ETFy ---
const etfs = []; // ETF-y z portfelami tworzy initializeEtfs() (etf.js)



let specialists = [
    { id: 'spec1', name: 'Voltomax Systemy', specialty: 'technology', bonus: 0.1, contractsCompleted: 0, level: 1, cash: 101000 },
    { id: 'spec2', name: 'Hydronex Serwis', specialty: 'general', bonus: 0.08, contractsCompleted: 0, level: 1, cash: 80000 },
    { id: 'spec3', name: 'Linea Architekci', specialty: 'office', bonus: 0.12, contractsCompleted: 0, level: 1, cash: 120000 },
    { id: 'spec4', name: 'Inżynierowie Strukturalni', specialty: 'industrial', bonus: 0.15, contractsCompleted: 0, level: 1, cash: 150000 },
    { id: 'spec5', name: 'Konstruktorium S.A', specialty: 'residential', bonus: 0.09, contractsCompleted: 0, level: 1, cash: 90000 },
    { id: 'spec6', name: 'WiesBud', specialty: 'residential', bonus: 0.04, contractsCompleted: 0, level: 1, cash: 65000 },
    { id: 'spec7', name: 'Pomocex', specialty: 'office', bonus: 0.1, contractsCompleted: 0, level: 1, cash: 100000 }
];


// --- Funkcje Zarządzania Spółkami ---

function initializeCommercialBanks() {
    commercialBanks = ALL_COMMERCIAL_BANKS_DEFINITIONS.map(def => ({
        ...def,
        cash: def.initialCapital,
        reservesBC: 0,
        loanPortfolio: {},
        depositPortfolio: {},
        stockPortfolio: {},
        corporateClients: [],
        interestRateDeposit: 0,
        interestRateLoan: 0,

        isActive: def.isActiveFromStart || false, // <--- Dodaj lub zmodyfikuj tę linię
        startupInvestments: {} // Dodajmy pole na inwestycje startupowe
    }));

}

function createBankStockObject(bank, exchangeLevel = 'SILVER') {
    if (!bank || !bank.isActive) return null;

    // Uproszczone obliczenie parametrów IPO na podstawie kapitału początkowego
    const ipoValuation = bank.initialCapital * getRandomInRange(1.05, 1.3); // Wycena 5-30% wyższa niż kapitał
    const ipoSharePrice = getRandomInRange(75, 150); // Cena akcji w typowym zakresie dla SILVER
    const ipoTotalShares = Math.floor(ipoValuation / ipoSharePrice);

    if (ipoTotalShares <= 0) {
        console.error(`[Bank IPO Init] Obliczona liczba akcji (${ipoTotalShares}) jest nieprawidłowa dla ${bank.name}.`);
        return null;
    }

    const symbol = `BK${bank.id.toUpperCase()}`; // Generowanie symbolu, np. BKINV1

    const newBankStock = {
        name: bank.name,
        symbol: symbol,
        price: ipoSharePrice,
        volatilityFactor: getRandomInRange(0.4, 1.2), // Banki są raczej stabilne
        exchange: exchangeLevel, // Debiut na określonej giełdzie
        totalShares: ipoTotalShares,
        maxShares: ipoTotalShares * 2, // Możliwość przyszłych emisji
        sharesHeld: 0, // Na starcie nikt nie ma akcji
        sector: ['Bankowość Komercyjna', 'Finanse'], // Sektory
        financialHealth: getRandomIntInRange(1, 3), // Startują ze zdrową kondycją
        balanceSheet: { // Uproszczony bilans na start
            assets: bank.cash,
            liabilities: bank.cash - bank.initialCapital, // Różnica jako zobowiązania (uproszczenie)
            shareCapital: bank.initialCapital * 0.1, // Kapitał zakładowy
            retainedEarnings: bank.initialCapital * 0.9 // Zyski zatrzymane
        },
        quarterlyEarnings: 0,
        bankAccountId: null, // Banki nie mają konta w innym banku
        cash: bank.cash, // Gotówka banku
        descriptionParts: null, // Zostaną wygenerowane
        ceo: null, // Zostanie wygenerowany
        isBankStock: true, // Flaga oznaczająca akcje banku
        bankData: { id: bank.id, type: bank.type }, // Dane powiązane z obiektem banku
        // --- Dodaj standardowe pola, których może brakować ---
        priceHistory: [],
        candlestickHistory: [],
        lineHistory: [],
        currentCandle: null,
        playerTransactions: [],
        priceAlerts: { buy: null, sell: null },
        dividendPolicy: 'Balanced', // Domyślna polityka dywidendy dla banków
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: ipoValuation,
        estimatedDividend: 0,
        isTradeLocked: false,
        dividendCooldownUntil: 0,
        stateOwnershipPct: 0,
        isStateOwned: false,
        lastReport: 'brak',
        research: null, // Banki używają systemu inwestycji, nie R&D
        researchUnlocks: null
    };

    // Wygeneruj opis i CEO
    initializeDescriptionParts(newBankStock);
    generateCEO(newBankStock);
    console.log(`[createBankStockObject] Utworzono obiekt akcji dla banku ${bank.name}:`, newBankStock);
    return newBankStock;
}

function initializeBalanceSheetForStock(stock) {


    // Pomiń start-upy, REIT-y i inne specjalne typy
    if (stock.assetType || stock.isBankStock) { // Dodano isBankStock
        
        stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 };
        stock.quarterlyEarnings = 0;
        stock.cash = 0; // Inicjalizuj gotówkę na 0 dla typów specjalnych
        return;
    }

    if (stock.assetType || stock.isBankStock) {
        stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 };
        stock.cash = 0;
        return;
    }

    const marketCap = stock.price * stock.totalShares;
    const assets = marketCap * getRandomInRange(0.9, 1.5);
    
    // ZMIANA: Dług zależny od kondycji. Zdrowe firmy (Health > 1) mogą nie mieć długu.
    let liabilitiesRatio = 0;
    if (stock.financialHealth < 2) {
        // Słabe firmy mają dług (10% - 60%)
        liabilitiesRatio = getRandomInRange(0.1, 0.5) - (stock.financialHealth * 0.05);
    } else {
        // Dobre firmy mają mały dług lub wcale (0% - 30%)
        if (Math.random() < 0.75) {
            liabilitiesRatio = getRandomInRange(0.05, 0.3);
        } else {
            liabilitiesRatio = 0; // Brak długu
        }
    }
    
    // Zabezpieczenie, żeby dług nie był ujemny
    const liabilities = assets * Math.max(0, liabilitiesRatio);
    
    const equity = assets - liabilities;
    const shareCapital = equity * getRandomInRange(0.1, 0.2);
    const retainedEarnings = equity - shareCapital;

    stock.balanceSheet = {
        assets: assets,
        liabilities: liabilities,
        shareCapital: shareCapital,
        retainedEarnings: retainedEarnings
    };
    stock.quarterlyEarnings = 0;
    stock.cash = assets * getRandomInRange(0.01, 0.05);

    const exchangeLevel = exchanges[stock.exchange]?.level ?? 0;
    stock.companyAge = getRandomIntInRange(1, 5) + exchangeLevel * 8;

    if (stock.companyAge < 12 && stock.financialHealth >= 1) {
        stock.corporatePhase = CORPORATE_PHASES.GROWTH;
    } else if (stock.financialHealth <= -2) {
        stock.corporatePhase = CORPORATE_PHASES.DECLINE;
    } else {
        stock.corporatePhase = CORPORATE_PHASES.STABILITY;
    }
    stock.phaseTimer = 0;
    
    if (stock.bankAccountId) {
        const bank = commercialBanks.find(b => b.id === stock.bankAccountId);
        if (bank) bank.cash += stock.cash;
    }

}

let stocks = JSON.parse(JSON.stringify(initialStocks)); // Inicjalizacja głównej tablicy

try {
    randomizeInitialShareCounts();
} catch (e) {
    console.error('[diag] Błąd podczas randomizeInitialShareCounts():', e);
}
function randomizeInitialShareCounts() {
    console.log("[START GRY] Randomizowanie liczby akcji...");
    stocks.forEach(stock => {
        const range = SHARE_LIMIT_RANGES[stock.exchange];
        if (range) {
            const randomShares = getRandomIntInRange(range.min, range.max);
            stock.totalShares = randomShares;
            stock.maxShares = randomShares;
            stock.sharesHeld = 0; // Upewniamy się, że na starcie nikt nie ma akcji
        }
    });
    syncSharesHeldWithInitialPortfolios();
}

/** Startowe portfele holdingów i instytucji (np. lombard) to akcje w obrocie — liczą się do sharesHeld. */
function syncSharesHeldWithInitialPortfolios() {
    for (const owner of stocks) {
        for (const [symbol, holding] of Object.entries(owner.holdingPortfolio || {})) {
            const stock = stocks.find(s => s.symbol === symbol);
            if (stock) stock.sharesHeld = (Number(stock.sharesHeld) || 0) + (Number(holding.quantity) || 0);
        }
    }
}



// =================================================================================
// FUNDAMENTY SPÓŁEK
// Zysk nie zależy od ceny akcji. Spółka ma przychody (kalibrowane raz na starcie tak, by
// wycena początkowa odpowiadała kapitalizacji), marżę EBITDA, amortyzację, odsetki i CIT.
// Co kwartał liczymy wskaźniki (EPS, C/Z, C/WK, sprzedaż i WK na akcję) oraz wartość godziwą,
// do której cena powoli wraca (economy.js → updateStockPrices).
// =================================================================================

const FUNDAMENTALS_HISTORY_QUARTERS = 8;

const PHASE_GROWTH_ADJUSTMENT = {
    [CORPORATE_PHASES.GROWTH]: 0.015,
    [CORPORATE_PHASES.STABILITY]: 0,
    [CORPORATE_PHASES.DECLINE]: -0.02,
    [CORPORATE_PHASES.REORGANIZATION]: -0.005,
    [CORPORATE_PHASES.GOLDEN_YEAR]: 0.03,
    [CORPORATE_PHASES.SHADOW_DESCENT]: -0.04,
    [CORPORATE_PHASES.INNOVATION_PUSH]: 0.005
};

/** Spółki z pełnym modelem przychodów (bez typów specjalnych i banków). */
function hasRevenueModel(stock) {
    return Boolean(stock && !stock.assetType && !stock.isBankStock);
}

/**
 * Spółki, których cena jest kotwiczona w wartości godziwej.
 * Banki są wyłączone: ich bilans zawiera depozyty klientów (wartość księgowa wielokrotnie
 * przewyższa kapitalizację), a zysk to stały % aktywów — model banku do osobnej kalibracji.
 */
/**
 * 0.13.1 (B11): wycena do wyświetlenia dla spółek bez wyceny z zysków (holdingi, REIT-y, fundusze):
 * holding — NAV (gotówka + portfel po kursie − dług) na akcję; REIT — NAV albo stopa dywidendy 7% (co wyższe).
 * Nie zmienia kotwicy cen rynku (fundamentals.fairValue).
 */
function getAssetBasedFairValue(stock) {
    if (!stock) return null;
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const liabilities = Math.max(0, Number(stock.balanceSheet?.liabilities) || 0);
    if (stock.assetType === 'Holding') {
        let value = Math.max(0, Number(stock.cash) || 0);
        for (const [symbol, holding] of Object.entries(stock.holdingPortfolio || {})) value += (stocks.find(s => s.symbol === symbol)?.price || 0) * (Number(holding?.quantity) || 0);
        for (const [symbol, quantity] of Object.entries(stock.equityStakes || {})) value += (stocks.find(s => s.symbol === symbol)?.price || 0) * (Number(quantity) || 0);
        return Math.max(0, value - liabilities) / shares || null;
    }
    if (stock.assetType === 'REIT') {
        const nav = Math.max(0, (Number(stock.balanceSheet?.assets) || 0) - liabilities) / shares;
        const income = (Number(stock.dividendPerShare) || 0) * (4 * BASE_DELAYS.quarterly / 120000) / 0.07; // dywidenda co 2 min gry (10× w roku) / 7%
        return Math.max(nav, income) || null;
    }
    const equity = (Number(stock.balanceSheet?.assets) || 0) - liabilities;
    return equity > 0 ? equity / shares : null;
}

/** Wartość godziwa do pokazania graczowi (z zysków albo z majątku). */
function getDisplayedFairValue(stock) {
    const fair = Number(stock?.fundamentals?.fairValue);
    return fair > 0 ? fair : getAssetBasedFairValue(stock);
}

function hasValuationAnchor(stock) {
    return Boolean(stock && !stock.assetType);
}

function getLoanRate() {
    return typeof LOAN_INTEREST_RATE === 'number' && Number.isFinite(LOAN_INTEREST_RATE) ? LOAN_INTEREST_RATE : 0.10;
}

function initializeFundamentals(stock, force = false) {
    if (!stock || (stock.fundamentals?.version === 1 && !force)) return stock?.fundamentals || null;

    const profile = getSectorProfile(stock);
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const marketCap = Math.max(0.01, Number(stock.price) || 0.01) * shares;
    const liabilities = Math.max(0, Number(stock.balanceSheet?.liabilities) || 0);
    assignCompanyIdiosyncrasy(stock);

    // Kalibracja: roczny zysk netto ≈ kapitalizacja / (C/Z sektora × luka wyceny spółki).
    // U3: luka wyceny sprawia, że na starcie są spółki tanie i drogie względem zysków.
    const netAnnual = marketCap / (profile.pe * stock.valuationGap);
    const ebtAnnual = netAnnual / (1 - COMPANY_INCOME_TAX_RATE);
    const operatingMargin = Math.max(0.05, profile.margin * (1 + stock.marginAdj) - profile.da);
    const revenue = hasRevenueModel(stock)
        ? Math.max(1000, (ebtAnnual + liabilities * getLoanRate()) / operatingMargin / 4)
        : 0;
    const netQuarter = netAnnual / 4;

    stock.fundamentals = {
        version: 1,
        revenue,
        history: [],
        fairValue: Number(stock.price) || 0.01,
        expectedEps: netQuarter / shares
    };

    // Syntetyczna historia 4 kwartałów (z szumem), żeby EPS z 4 kwartałów istniał od startu.
    const noise = [0, 0, 0, 0].map(() => gaussianRandom() * 0.12);
    const mean = noise.reduce((a, b) => a + b, 0) / 4;
    for (let i = 0; i < 4; i++) {
        const factor = 1 + noise[i] - mean; // suma 4 kwartałów bez zmian
        stock.fundamentals.history.push({
            revenue: revenue * (1 + (noise[i] - mean) * 0.5),
            ebitda: revenue * profile.margin * (1 + stock.marginAdj) * factor,
            netIncome: netQuarter * factor,
            eps: netQuarter * factor / shares,
            synthetic: true
        });
    }

    updateFundamentalRatios(stock);
    return stock.fundamentals;
}

// B5: rynek mniej byczy (cel GIG +7–9% rocznie zamiast +14%).
const SECTOR_GROWTH_FACTOR = 0.8;      // trend wzrostu sektorów −20%
const INFLATION_PASS_THROUGH = 0.15;   // inflacja w przychodach (było 0,3)

// B5: zatłoczony rynek (ponad ~100 spółek) — bez sztywnego limitu: więcej fuzji i przejęć,
// ostrzejsza konkurencja (niższe marże), łatwiejsze upadki najsłabszych i nieco mniej debiutów.
// 0.13.1 (D2): limit dotyczy spółek krajowych — bez spółek zależnych, startupów w inkubatorze i rynków internetowych
// (te mają własny limit na rynek). Powyżej limitu: rzadsze debiuty i nowe spółki z wydarzeń tylko przy wolnym miejscu,
// słabe spółki szybciej spadają i upadają, a startupy dostają mniejsze i droższe finansowanie.
const LISTING_SOFT_CAP = 100;
const LISTING_HARD_CAP = 110;        // P1: twardy sufit — od 110 spółek krajowych żadnych nowych debiutów ani przenosin na rynek krajowy
const LISTING_PRESSURE_RANGE = LISTING_HARD_CAP - LISTING_SOFT_CAP;   // hamulec 100–110 (pełna presja przy suficie)
const LISTING_TOTAL_CAP = 150;       // P1: wszystkie notowane podmioty (krajowe, zależne, rynki internetowe, holdingi, REIT…) bez startupów
const AWAITING_LISTING_MAX_QUARTERS = 8; // startup bez miejsca na giełdzie czeka najwyżej 2 lata, potem zostaje przejęty

/** Spółka liczona do limitu spółek krajowych. */
function isCountedListedCompany(stock) {
    return Boolean(stock && !stock.assetType && !stock.isBankrupt && !stock.isSubsidiaryOf
        && !(typeof isInternetMarketStock === 'function' && isInternetMarketStock(stock)));
}

function getListedCompanyCount() {
    return stocks.filter(isCountedListedCompany).length;
}

/** Presja zatłoczenia: 0 do 100 spółek krajowych, liniowo do 1 przy 110 (twardy sufit). */
function getCrowdingPressure() {
    return Math.max(0, Math.min(1, (getListedCompanyCount() - LISTING_SOFT_CAP) / LISTING_PRESSURE_RANGE));
}

/** Mnożnik szans na debiut: ponad limitem do −70%. */
function getDebutFactor() {
    return 1 - 0.7 * getCrowdingPressure();
}

/** P1: każda nowa spółka krajowa (debiut startupu, zależna, bank, wydarzenie, przenosiny na rynek krajowy) tylko poniżej sufitu. */
function hasFreeListingSlot() {
    return getListedCompanyCount() < LISTING_HARD_CAP && hasFreeTotalListingSlot();
}

/** Wszystkie notowane podmioty poza startupami w inkubatorze. */
function getTotalCompanyCount() {
    return stocks.filter(s => !s.isBankrupt && s.assetType !== 'Startup').length;
}

/** P1: miejsce pod łącznym sufitem (także dla spółek zależnych i członków rynków internetowych). */
function hasFreeTotalListingSlot() {
    return getTotalCompanyCount() < LISTING_TOTAL_CAP;
}

/** P1: startup gotowy do debiutu, a giełda pełna — czeka w inkubatorze (stage 'awaitingListing'). */
function parkStartupForListing(startup, successMultiplier) {
    startup.stage = 'awaitingListing';
    startup.awaitingListing = { multiplier: successMultiplier, since: typeof macro === 'object' ? macro.quarter : 0 };
    logEvent(`⏳ ${startup.name} jest gotowy do debiutu, ale giełda jest pełna (${getListedCompanyCount()}/${LISTING_HARD_CAP} spółek) — czeka w inkubatorze na wolne miejsce.`, 'review');
}

/** P1: co kwartał — czekające startupy debiutują po kolei, gdy zwolni się miejsce; po 8 kwartałach przejmuje je inwestor. */
function processAwaitingListings() {
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    const waiting = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'awaitingListing')
        .sort((a, b) => (a.awaitingListing?.since || 0) - (b.awaitingListing?.since || 0));
    for (const startup of waiting) {
        const info = startup.awaitingListing || { multiplier: 1.5, since: quarter };
        if (hasFreeListingSlot()) {
            startup.stage = 'finalized';
            delete startup.awaitingListing;
            logEvent(`🔔 Zwolniło się miejsce na giełdzie — ${startup.name} debiutuje po ${quarter - info.since} kw. oczekiwania.`, 'market');
            handleSuccessfulIPO(startup, info.multiplier);
        } else if (quarter - info.since >= AWAITING_LISTING_MAX_QUARTERS) {
            const payout = Math.min(2, Math.max(1.05, info.multiplier));
            logEvent(`🤝 ${startup.name} nie doczekał się miejsca na giełdzie — projekt przejmuje inwestor branżowy, udziałowcy dostają ${(payout * 100 - 100).toFixed(0)}% ponad wkład.`, 'market');
            removeStartup(startup, 1, payout);
        }
    }
}

/** D2: finansowanie startupów na nasyconym rynku — mniejsze wpłaty (do −50%) … */
function getStartupFundingFactor() {
    return 1 - 0.5 * getCrowdingPressure();
}

/** … i gorsze warunki udziałów dla inwestorów przy debiucie (do −30% akcji). */
function getStartupTermsFactor() {
    return 1 - 0.3 * getCrowdingPressure();
}

/** D2: co kwartał słabe spółki krajowe na nasyconym rynku tanieją szybciej (spadek na Giełdę Śmieciową). */
function applyCrowdingPressureToWeak() {
    const pressure = getCrowdingPressure();
    if (pressure <= 0) return 0;
    let hit = 0;
    for (const stock of stocks) {
        if (!isCountedListedCompany(stock) || stock.isStateOwned || stock.marketOperator || (Number(stock.financialHealth) || 0) >= -1) continue;
        applyPriceEffect(stock.symbol, -0.04 * pressure, 'negative', 'market');
        hit++;
    }
    return hit;
}

/** Ponad limitem: najmniejsze spółki (dolne 25% kapitalizacji) z kondycją ≤ −3 mogą upaść. */
let cullThresholdCache = { quarter: -1, cap: 0 };
function isCullCandidate(stock) {
    const pressure = getCrowdingPressure();
    if (stock.assetType || stock.isStateOwned || stock.isBankStock || stock.marketOperator || !isCountedListedCompany(stock) || (Number(stock.financialHealth) || 0) > -3 + 1.5 * pressure) return false;
    if (pressure <= 0) return false;
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    if (cullThresholdCache.quarter !== quarter) {
        const caps = stocks.filter(isCountedListedCompany).map(getMarketCapValue).sort((a, b) => a - b);
        cullThresholdCache = { quarter, cap: caps[Math.floor(caps.length * (0.25 + 0.15 * pressure))] || 0 };
    }
    return getMarketCapValue(stock) <= cullThresholdCache.cap;
}

/**
 * U3: cechy indywidualne spółki (raz, zapisywane w spółce):
 * marża ±30% profilu sektora, tempo wzrostu ±2,4 pkt proc. rocznie, luka wyceny 0,72–1,4 (C/Z względem sektora).
 */
function assignCompanyIdiosyncrasy(stock) {
    if (!Number.isFinite(stock.marginAdj)) stock.marginAdj = getRandomInRange(-0.3, 0.3);
    if (!Number.isFinite(stock.growthAdj)) stock.growthAdj = getRandomInRange(-0.006, 0.006);
    if (!Number.isFinite(stock.valuationGap)) stock.valuationGap = Math.exp(getRandomInRange(Math.log(0.72), Math.log(1.4)));
}

/** Wynik kwartału z modelu przychodów (bez zmian gotówki — to robi raport). */
function computeQuarterResults(stock) {
    const fundamentals = stock.fundamentals || initializeFundamentals(stock);
    const profile = getSectorProfile(stock);
    const health = Number(stock.financialHealth) || 0;
    const phaseAdj = PHASE_GROWTH_ADJUSTMENT[stock.corporatePhase] || 0;
    const gdp = getGdpDriver(); // napęd koniunktury (economy.js)

    // Cykl sektora i inflacja (nominalny wzrost przychodów) — macro.js
    const sectorAdj = typeof getSectorCycleAdj === 'function' ? getSectorCycleAdj(stock) : 0;
    const inflation = typeof macro === 'object' ? macro.inflation : 0.025;
    const projectAdj = (typeof getSpecialProjectGrowth === 'function' ? getSpecialProjectGrowth(stock) : 0) // bonusy projektów specjalnych
        + (typeof getMafiaFrontGrowth === 'function' ? getMafiaFrontGrowth(stock) : 0) // spółki-przykrywki rosną z wpływami mafii
        + (typeof getDefenseGrowthBonus === 'function' ? getDefenseGrowthBonus(stock) : 0); // zbrojeniówka: bonus od siły policji
    const societyAdj = typeof getSocietyGrowthAdj === 'function' ? getSocietyGrowthAdj(stock) : 0; // 0.13: popyt klas, niedobór specjalistów
    const growth = profile.growth / 4 * SECTOR_GROWTH_FACTOR + (Number(stock.growthAdj) || 0) + profile.beta * gdp + health * 0.004 + phaseAdj + sectorAdj + projectAdj + societyAdj + inflation / 4 * INFLATION_PASS_THROUGH + gaussianRandom() * 0.02;
    fundamentals.revenue = Math.max(1000, fundamentals.revenue * (1 + Math.max(-0.25, Math.min(0.25, growth))));

    // 0.13: strajk, epidemia, klęska — przychody tylko tego kwartału (baza przychodów bez zmian).
    const quarterFactor = (typeof getStrikeRevenueFactor === 'function' ? getStrikeRevenueFactor(stock) : 1) * (typeof getSocietyRevenueFactor === 'function' ? getSocietyRevenueFactor(stock) : 1);
    const baseRevenue = fundamentals.revenue;
    const revenue = baseRevenue * quarterFactor;
    const lostRevenue = baseRevenue - revenue; // dźwignia operacyjna: 40% kosztów jest sztywnych w krótkim terminie
    const inflationSqueeze = Math.max(0, inflation - 0.04) * 0.5; // wysoka inflacja zjada marże
    // 0.13: marża = marża_0.12 + udział_kosztu_pracy × (1 − indeks); neutralnie (indeks 1,0) bez zmian.
    const laborAdj = typeof getLaborMarginAdj === 'function' ? getLaborMarginAdj(stock) : 0;
    const labor = revenue * (typeof getLaborShare === 'function' ? getLaborShare(stock) : 0) * (typeof getLaborCostIndex === 'function' ? getLaborCostIndex(stock) : 1);
    const margin = Math.max(-0.4, Math.min(0.6, profile.margin * (1 + (Number(stock.marginAdj) || 0)) + health * 0.015 + phaseAdj * 0.5 + profile.beta * gdp * (gdp < 0 ? 3 : 2) - inflationSqueeze - getCrowdingPressure() * 0.02 + laborAdj)); // B5: recesja mocniej tnie marże; zatłoczony rynek = ostrzejsza konkurencja; 0.13: koszt pracy
    const fixedExpenses = Math.max(0, Number(stock.fixedExpenses) || 0);

    // Działające inwestycje: kwartalny zysk lub strata (investments.js).
    const investmentResult = typeof processOperatingInvestments === 'function' ? processOperatingInvestments(stock) : 0;
    const ebitda = baseRevenue * margin - lostRevenue * (margin + (1 - margin) * 0.4) - fixedExpenses + investmentResult;
    const depreciation = baseRevenue * profile.da;
    const interest = Math.max(0, Number(stock.balanceSheet?.liabilities) || 0) * getLoanRate() / 4;
    const ebt = ebitda - depreciation - interest;
    const tax = ebt > 0 ? ebt * (typeof getCompanyIncomeTaxRate === 'function' ? getCompanyIncomeTaxRate() : COMPANY_INCOME_TAX_RATE) : 0;
    let netIncome = ebt - tax;

    // Spółki państwowe: Skarb Państwa pokrywa 70% straty (dotacja).
    let subsidy = 0;
    if (stock.isStateOwned && netIncome < 0) {
        subsidy = -netIncome * 0.7;
        governmentTreasury -= subsidy;
        netIncome += subsidy;
    }

    governmentTreasury += tax;
    if (typeof society === 'object' && society?.budget) society.budget.citQuarter = (Number(society.budget.citQuarter) || 0) + tax;

    return { revenue, ebitda, depreciation, interest, tax, subsidy, netIncome, investmentResult, labor };
}

/** Zapisuje kwartał w historii i przelicza wskaźniki. Zwraca niespodziankę EPS względem oczekiwań. */
function recordQuarterFundamentals(stock, quarter) {
    const fundamentals = stock.fundamentals || initializeFundamentals(stock);
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const eps = quarter.netIncome / shares;
    const expected = Number(fundamentals.expectedEps) || 0;

    fundamentals.history.push({
        revenue: quarter.revenue,
        ebitda: quarter.ebitda,
        netIncome: quarter.netIncome,
        eps,
        // N3: dane dla Księgowego (rachunek wyników, przepływy, należności); 0.13: koszt pracy
        depreciation: quarter.depreciation, interest: quarter.interest, tax: quarter.tax, labor: quarter.labor,
        ocf: quarter.ocf, receivables: quarter.receivables
    });
    if (fundamentals.history.length > FUNDAMENTALS_HISTORY_QUARTERS) fundamentals.history.shift();

    const profile = getSectorProfile(stock);
    fundamentals.expectedEps = eps * (1 + profile.growth / 4);
    fundamentals.lastEps = eps;

    updateFundamentalRatios(stock);

    if (Math.abs(expected) < 1e-9) return 0;
    return (eps - expected) / Math.abs(expected);
}

function updateFundamentalRatios(stock) {
    const fundamentals = stock?.fundamentals;
    if (!fundamentals) return null;

    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const last4 = fundamentals.history.slice(-4);
    const sum = key => last4.reduce((total, quarter) => total + (Number(quarter[key]) || 0), 0);

    const equity = (Number(stock.balanceSheet?.assets) || 0) - (Number(stock.balanceSheet?.liabilities) || 0);
    const price = Math.max(0.01, Number(stock.price) || 0.01);

    fundamentals.revenueTtm = sum('revenue');
    fundamentals.ebitdaTtm = sum('ebitda');
    fundamentals.netIncomeTtm = sum('netIncome');
    fundamentals.epsTtm = fundamentals.netIncomeTtm / shares;
    fundamentals.salesPerShare = fundamentals.revenueTtm / shares;
    fundamentals.bookValuePerShare = equity / shares;
    fundamentals.peRatio = fundamentals.epsTtm > 0 ? price / fundamentals.epsTtm : null;
    fundamentals.pbRatio = fundamentals.bookValuePerShare > 0 ? price / fundamentals.bookValuePerShare : null;

    if (hasValuationAnchor(stock)) {
        const profile = getSectorProfile(stock);
        const healthPremium = 1 + Math.max(-0.3, Math.min(0.3, (Number(stock.financialHealth) || 0) * 0.03));
        const bvps = Math.max(0, fundamentals.bookValuePerShare);

        if (stock.isBankStock) {
            // Bank: wycena z zysku (marża odsetkowa); wartość księgowa zawiera depozyty, więc bez kotwicy P/BV.
            fundamentals.fairValue = fundamentals.epsTtm > 0 && (stock.ledgerQuarters || 0) >= 4 ? fundamentals.epsTtm * profile.pe * healthPremium : null;
        } else {
            const earningsValue = fundamentals.epsTtm * profile.pe * getValuationMultiplier(stock) * healthPremium;
            fundamentals.fairValue = fundamentals.epsTtm > 0
                ? 0.75 * earningsValue + 0.25 * Math.min(bvps, earningsValue * 2) // B5: kotwica księgowa najwyżej 2× wartość z zysku
                : Math.max(0.01, bvps * 0.7);
        }
    } else {
        fundamentals.fairValue = null;
    }

    return fundamentals;
}

/** Kondycja finansowa podąża powoli za rentownością (obok wpływu zdarzeń). */
function updateHealthFromProfitability(stock, quarter) {
    if (!(quarter.revenue > 0)) return;
    const netMargin = quarter.netIncome / quarter.revenue;
    const target = Math.max(-5, Math.min(5, (netMargin - 0.06) * 30));
    const health = Number(stock.financialHealth) || 0;
    stock.financialHealth = Math.max(-5, Math.min(5, health + (target - health) * 0.1));
}

// =================================================================================
// STRUKTURA WŁASNOŚCI
// insiderShares — pakiet zarządu i pracowników (poza obrotem). Państwo: stateOwnershipPct.
// Jedno miejsce liczenia akcji dostępnych w obrocie: getAvailableShares.
// =================================================================================

function initializeOwnership(stock) {
    if (!stock || Number.isFinite(stock.insiderShares)) return;

    const privateCompany = !stock.assetType && !stock.isBankStock && !stock.isStateOwned;
    // Pakiety insiderów 15–40%: gracz i boty nadal mogą zdobyć większość (>50%) z wolnego obrotu.
    const wanted = privateCompany ? Math.floor((Number(stock.totalShares) || 0) * getRandomInRange(0.15, 0.40)) : 0;
    // Starszy zapis: pula insiderów powstaje z akcji jeszcze nieposiadanych — nie zabiera pakietów inwestorom.
    stock.insiderShares = 0;
    const held = stock.symbol ? getTrackedHeldShares(stock) : 0;
    stock.insiderShares = Math.max(0, Math.min(wanted, Math.floor(getFreeFloatShares(stock) - held)));
}

function getFreeFloatShares(stock) {
    const total = Math.max(0, Number(stock?.totalShares) || 0);
    const insiders = Math.max(0, Number(stock?.insiderShares) || 0);
    const treasury = Math.max(0, Number(stock?.treasuryShares) || 0);
    const state = Math.floor(total * Math.max(0, Number(stock?.stateOwnershipPct) || 0)); // pakiet państwa (także mniejszościowy) poza obrotem
    return Math.max(0, total - insiders - treasury - state);
}

/** Akcje, które można dziś kupić na rynku (wolny obrót minus akcje posiadane przez inwestorów). */
function getAvailableShares(stock) {
    // Także faktyczni posiadacze: zaniżone sharesHeld nie może pozwolić kupić ponad wolny obrót.
    const tracked = stock?.symbol && Array.isArray(stocks) ? getTrackedHeldShares(stock) : 0;
    const held = Math.max(0, Number(stock?.sharesHeld) || 0, tracked);
    return Math.max(0, Math.floor(getFreeFloatShares(stock) - held));
}

// =================================================================================
// DYWIDENDY — strategia = stopa wypłaty z zysku netto kwartału
// Po raporcie zarząd ogłasza dywidendę; wypłata następuje po krótkim czasie (dividendTimer),
// z gotówki spółki. W dniu wypłaty cena spada o dywidendę na akcję.
// =================================================================================

const DIVIDEND_POLICIES = {
    Growth:     { label: 'Wzrost (0%)',      min: 0,    max: 0 },
    Balanced:   { label: 'Zachęta (1–10%)',  min: 0.01, max: 0.10 },
    Aggressive: { label: 'Wysoka (10–50%)',  min: 0.10, max: 0.50 },
    Total:      { label: 'Pełna (100%)',     min: 1.0,  max: 1.0 }
};

const DIVIDEND_POLICY_ORDER = ['Growth', 'Balanced', 'Aggressive', 'Total'];

function normalizeDividendPolicy(policy) {
    return DIVIDEND_POLICIES[policy] ? policy : 'Growth'; // 'None' i brak = Wzrost
}

function getDividendPolicyLabel(policy) {
    return DIVIDEND_POLICIES[normalizeDividendPolicy(policy)].label;
}

function setCompanyDividendPolicy(stock, policy) {
    stock.dividendPolicy = normalizeDividendPolicy(policy);
    const def = DIVIDEND_POLICIES[stock.dividendPolicy];
    stock.dividendPayoutRatio = def.min === def.max ? def.min : getRandomInRange(def.min, def.max);
}

function assignInitialDividendPolicies() {
    stocks.forEach(stock => {
        if (stock.assetType === 'REIT') return;
        if (stock.exchange === 'JUNK' || stock.assetType) {
            setCompanyDividendPolicy(stock, 'Growth');
        } else {
            setCompanyDividendPolicy(stock, getRandomElement(['Growth', 'Growth', 'Balanced', 'Balanced', 'Aggressive', 'Total'])); // „Pełna” rzadko (audyt A4)
        }
    });
    console.log('[START GRY] Przypisano początkowe polityki dywidendowe.');
}

function initializeDividendEstimates() {
    stocks.forEach(stock => {
        if (stock.assetType === 'REIT') {
            stock.estimatedDividend = stock.dividendPerShare;
            return;
        }
        if (!Number.isFinite(stock.dividendPayoutRatio)) setCompanyDividendPolicy(stock, stock.dividendPolicy);
        const eps = Number(stock.fundamentals?.expectedEps) || 0;
        stock.estimatedDividend = Math.max(0, eps * stock.dividendPayoutRatio);
        stock.dividendTimer = BASE_DELAYS.quarterly;
    });
}

/** Zarząd (AI) rzadko zmienia strategię wg cyklu, kondycji i gotówki — chyba że narzucił ją właściciel. */
function reviewDividendPolicy(stock) {
    if (stock.assetType || stock.dividendPolicyLockedByOwner || Math.random() > 0.08) return;

    const index = DIVIDEND_POLICY_ORDER.indexOf(normalizeDividendPolicy(stock.dividendPolicy));
    const health = Number(stock.financialHealth) || 0;
    let next = index;

    if ((economyCycle.phase === 'recession' || health < -1) && index > 0) next = index - 1;
    else if (DIVIDEND_POLICY_ORDER[index] === 'Total' && economyCycle.phase !== 'expansion' && Math.random() < 0.5) next = index - 1; // 100% wypłaty to wyjątek, nie norma
    else if ((economyCycle.phase === 'expansion' || economyCycle.phase === 'overheating') && health > 2 && index < 2) next = index + 1;
    else if (stock.corporatePhase === CORPORATE_PHASES.GROWTH && index > 0) next = 0;
    else if (getRatePressureOnDividend(stock) > 0 && index < 2) next = index + 1; // wysokie stopy: akcjonariusze chcą wypłat
    // Arystokrata pilnuje serii: nie obniża polityki bez recesji.
    if (stock.isDividendAristocrat && next < index && economyCycle.phase !== 'recession') next = index;

    if (next !== index) {
        setCompanyDividendPolicy(stock, DIVIDEND_POLICY_ORDER[next]);
        logEvent(`💼 Zarząd ${stock.name} zmienia strategię dywidendową na: ${getDividendPolicyLabel(stock.dividendPolicy)}.`, 'company');
    }
}

/** Ogłoszenie dywidendy po raporcie (wypłata po dividendTimer). */
function declareQuarterDividend(stock, reportedNetIncome) {
    if (stock.assetType === 'REIT') return;

    stock.pendingDividend = null;
    stock.estimatedDividend = 0;
    stock.dividendTimer = BASE_DELAYS.quarterly;

    if (!Number.isFinite(stock.dividendPayoutRatio)) setCompanyDividendPolicy(stock, stock.dividendPolicy);

    if (stock.ceo?.traits?.some(t => t.id === 'skapiec')) return;

    let ratio = stock.dividendPayoutRatio;
    const isGenerous = stock.ceo?.traits?.some(t => t.id === 'szczodry');
    if (isGenerous) ratio = Math.min(1, Math.max(ratio, 0.05) * 1.15);

    if (!(ratio > 0) || !(reportedNetIncome > 0)) return;

    const available = Math.max(0, Number(stock.cash) || 0) * 0.8;
    const total = Math.min(reportedNetIncome * ratio, available);
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    if (total <= 0) return;

    stock.pendingDividend = { total, dps: total / shares, declaredAt: Date.now() };
    stock.estimatedDividend = total / shares;
    stock.dividendTimer = getRandomIntInRange(30000, 90000);
}

/** Wypłata dywidendy: z gotówki spółki, cena spada o dywidendę na akcję. */
function payCompanyDividend(stock, dividendPerShare, purpose = 'Dywidenda') {
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const maxTotal = Math.max(0, Number(stock.cash) || 0);
    const total = Math.min(dividendPerShare * shares, maxTotal);
    if (!(total > 0)) return 0;

    const dps = total / shares;
    adjustCompanyCash(stock, -total);
    adjustBalanceSheet(stock, { assets: -total, retainedEarnings: -total });
    recordPayment(stock, 'external:akcjonariusze', total, purpose);

    stock.lastDividend = { dps, total, paidAt: Date.now(), yield: dps / Math.max(0.01, stock.price) };
    if (typeof addChartEvent === 'function') addChartEvent(stock, '✂️', `Odcięcie dywidendy: ${dps.toFixed(2)} zł/akcję — kurs spada o mniej więcej tyle`);
    recordDividendPayment(stock, dps);
    payDividendToShareholders(stock, dps);
    return total;
}

function updateDividendTimers(deltaTime) {
    stocks.forEach(stock => {
        if (stock.isBankrupt) return;

        if (stock.assetType === 'REIT') {
            stock.dividendTimer -= deltaTime;
            if (stock.dividendTimer <= 0) {
                processReitDividend(stock);
                stock.dividendTimer = 2 * 60 * 1000;
            }
            return;
        }

        if (!stock.pendingDividend) return;

        stock.dividendTimer -= deltaTime;
        if (stock.dividendTimer > 0) return;

        const declared = stock.pendingDividend;
        stock.pendingDividend = null;
        stock.estimatedDividend = 0;
        stock.dividendTimer = BASE_DELAYS.quarterly;
        payCompanyDividend(stock, declared.dps, 'Dywidenda kwartalna');
    });
}

function processFinancialReports() {
    console.log("[RAPORTY KWARTALNE] Rozpoczęto przetwarzanie raportów finansowych...");

    // Zliczanie technologii (bez zmian)
    let totalUnlockedTechs = 0;
    stocks.forEach(s => {
        if (s.research && s.research.unlockedTechs) {
            totalUnlockedTechs += s.research.unlockedTechs.length;
        }
    });

    for (let i = stocks.length - 1; i >= 0; i--) {
        const stock = stocks[i];

        if (stock.assetType === 'Startup' || stock.isBankrupt) continue;

        let quarterlyEarnings = 0;
        const marketCap = stock.price * stock.totalShares;

        // Dochód bazowy typów specjalnych (lombard, biuro rachunkowe). Spółki standardowe mają model przychodów.
        const baseQuarterlyIncome = 0;
        let quarterModel = null;   // wynik z modelu przychodów (spółki standardowe)
        let nonCashCosts = 0;      // amortyzacja: obniża wynik, ale nie gotówkę
        if (!stock.fundamentals) initializeFundamentals(stock);


        if (!stock.balanceSheet) {
             console.warn(`[REPORTS] ${stock.symbol} nie miał bilansu. Inicjalizuję pusty.`);
             stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 };
        }
        
        // --- Logika obliczania Zysku/Straty (główna) ---
        if (stock.assetType === 'REIT') {
            // 🏡 REITy
            const assetBase = stock.balanceSheet.assets > 0 ? stock.balanceSheet.assets : marketCap * 0.8;
            if (stock.balanceSheet.assets === 0) stock.balanceSheet.assets = assetBase;
            const rentalIncome = assetBase * 0.02; // 2%
            const maintenanceCosts = assetBase * 0.005; // 0.5%
            quarterlyEarnings = (rentalIncome - maintenanceCosts) * (1 + (stock.financialHealth / 50));

        } else if (stock.assetType === 'Holding') {
            // 🏢 Holdingi
            const portfolioValue = Object.values(stock.holdingPortfolio).reduce((sum, holding) => {
                const ownedStock = stocks.find(s => s.symbol === Object.keys(stock.holdingPortfolio).find(key => stock.holdingPortfolio[key] === holding));
                return sum + (ownedStock ? ownedStock.price * holding.quantity : 0);
            }, 0);
            const managementFee = (stock.cash + portfolioValue) * 0.0025;
            const portfolioPerformance = portfolioValue * ((stock.financialHealth * 0.005) + getRandomInRange(-0.02, 0.02));
            quarterlyEarnings = managementFee + portfolioPerformance;

        } else if (stock.assetType === 'ResearchInstitute') {
            // 🧪 Instytuty
            const earningsPerTech = 5000;
            quarterlyEarnings = totalUnlockedTechs * earningsPerTech * getRandomInRange(0.9, 1.1);
        
        // ===>>> NOWA LOGIKA DLA FINANSÓW KONSUMENCKICH <<<===
        } else if (stock.assetType === 'DebtCollector') {
            // WRONA zarabia na odsetkach od przejętych długów
            let totalInterestCollected = 0;
            // Sprawdź długi AI
            aiCompetitors.forEach(ai => {
                if (ai.loans) {
                    ai.loans.forEach(loan => {
                        if (loan.collectorSymbol === stock.symbol) {
                            const weeklyInterest = loan.amount * (loan.interestRate / 52);
                            totalInterestCollected += weeklyInterest * 12;
                        }
                    });
                }
            });
            quarterlyEarnings = totalInterestCollected * (1 + (stock.financialHealth / 10)); // Modyfikator kondycji
        

        } else if (stock.isBankStock) {
            // 🏦 Banki Komercyjne
            // Wynik = marża odsetkowa z księgi banku (finance.js); stary wzór tylko bez danych.
            const ledgerResult = typeof getBankQuarterlyEarnings === 'function' ? getBankQuarterlyEarnings(stock) : null;
            if (ledgerResult !== null) {
                quarterlyEarnings = ledgerResult;
            } else {
                const loanIncome = stock.balanceSheet.assets * 0.01;
                const depositCosts = stock.balanceSheet.liabilities * 0.005;
                quarterlyEarnings = (loanIncome - depositCosts) * (1 + (stock.financialHealth / 10));
            }

        } else if (!stock.assetType) {
            // 🏭 Spółki standardowe i państwowe: model przychodów, kosztów, amortyzacji, odsetek i CIT.
            // Zysk nie zależy od ceny akcji.
            quarterModel = computeQuarterResults(stock);
            quarterlyEarnings = quarterModel.netIncome;
            nonCashCosts = quarterModel.depreciation;
        } else if (stock.assetType === 'PawnShop') {
            // LOMBARDEX (Na razie mały bazowy zysk + zysk ze sprzedaży)
            let profitFromSales = 0;
            if (stock.holdingPortfolio) {
                for (const symbol in stock.holdingPortfolio) {
                    if (Math.random() < 0.5) { // 50% szans na sprzedaż w tym kwartale
                        const holding = stock.holdingPortfolio[symbol];
                        const targetStock = stocks.find(s => s.symbol === symbol);
                        if (targetStock) {
                            const proceeds = targetStock.price * holding.quantity;
                            const costBasis = holding.purchasePrice * holding.quantity;
                            profitFromSales += (proceeds - costBasis);
                            
                            stock.cash += proceeds; 
                            targetStock.sharesHeld -= holding.quantity; 
                            delete stock.holdingPortfolio[symbol]; 
                            
                            logEvent(`[LOMBARDEX] ${stock.name} sprzedał ${holding.quantity} akcji ${symbol} (zysk: ${profitFromSales.toFixed(0)} PLN).`, 'company');
                        }
                    }
                }
            }
            quarterlyEarnings = profitFromSales + baseQuarterlyIncome + 5000; // Zysk ze sprzedaży + Baza + Stały bonus
        }
        else if (stock.assetType === 'Accounting') {
            // Zysk z prowizji (stock.quarterlyEarnings) był już zbierany co tydzień w chargeAccountingFee()
            // Dodajemy do niego tylko bazowy dochód
            quarterlyEarnings = stock.quarterlyEarnings + baseQuarterlyIncome;
            
            // WAŻNE: Resetujemy licznik zysków na następny kwartał
            stock.quarterlyEarnings = 0; 
        }
        // Koszty stałe z inwestycji: w modelu przychodów są już w EBITDA.
        if (stock.fixedExpenses && !quarterModel) {
            quarterlyEarnings -= stock.fixedExpenses;
        }

        // --- Wynik raportowany a przepływy gotówki ---
        // quarterlyEarnings to wynik operacyjny symulowany przez raport: wpływa na gotówkę teraz.
        // Koszty R&D, wynik kontraktów budowlanych, dochody z nieruchomości i koszty inwestycji
        // zostały rozliczone w gotówce i bilansie w chwili zdarzenia — raport tylko je pokazuje
        // i nie "wypłaca" ich drugi raz. Ponowny raport nie zobaczy tych samych pozycji.
        const operatingCashResult = quarterlyEarnings;
        const recognizedResearchExpense = recognizeResearchExpenses(stock);
        const periodResults = takePeriodResults(stock);
        const constructionResult = periodResults.constructionRevenue - periodResults.constructionCosts;
        const reportedQuarterlyEarnings = operatingCashResult - recognizedResearchExpense + periodResults.total;
        // N3: spółka-oszust publikuje zysk wyższy od prawdziwego (gotówka płynie z prawdziwego).
        const fakeEarnings = typeof getFraudInflation === 'function' ? getFraudInflation(stock, quarterModel, reportedQuarterlyEarnings) : 0;
        const publishedEarnings = reportedQuarterlyEarnings + fakeEarnings;

        stock.quarterlyEarnings = publishedEarnings;
        stock.lastReportBreakdown = {
            reportedAt: Date.now(),
            operating: operatingCashResult,
            researchExpense: recognizedResearchExpense,
            constructionRevenue: periodResults.constructionRevenue,
            constructionCosts: periodResults.constructionCosts,
            propertyIncome: periodResults.propertyIncome,
            investmentExpense: periodResults.investmentExpense,
            otherIncome: periodResults.otherIncome,
            total: publishedEarnings
        };

        // Gotówka: zysk netto + amortyzacja (koszt niegotówkowy). Aktywa i kapitał: zysk netto.
        adjustCompanyCash(stock, operatingCashResult + nonCashCosts);
        adjustBalanceSheet(stock, { assets: operatingCashResult, retainedEarnings: operatingCashResult });

        // Fundamenty kwartału (EPS z wyniku raportowanego: z R&D i kontraktami).
        const accounting = typeof recordAccountingQuarter === 'function' && quarterModel ? recordAccountingQuarter(stock, quarterModel, reportedQuarterlyEarnings, fakeEarnings) : null;
        const earningsSurprise = recordQuarterFundamentals(stock, {
            revenue: (quarterModel ? quarterModel.revenue : 0) + periodResults.constructionRevenue,
            ebitda: (quarterModel ? quarterModel.ebitda : reportedQuarterlyEarnings) + fakeEarnings,
            netIncome: publishedEarnings,
            depreciation: quarterModel?.depreciation, interest: quarterModel?.interest, tax: quarterModel?.tax, labor: quarterModel?.labor,
            ocf: accounting ? accounting.ocf : reportedQuarterlyEarnings + nonCashCosts,
            receivables: accounting?.receivables
        });
        if (quarterModel) {
            stock.lastReportBreakdown.revenue = quarterModel.revenue;
            stock.lastReportBreakdown.ebitda = quarterModel.ebitda;
            stock.lastReportBreakdown.depreciation = quarterModel.depreciation;
            stock.lastReportBreakdown.interest = quarterModel.interest;
            stock.lastReportBreakdown.tax = quarterModel.tax;
            stock.lastReportBreakdown.subsidy = quarterModel.subsidy;
            updateHealthFromProfitability(stock, quarterModel);
        }

        // Wynik kontraktów wpływa na ocenę kondycji spółki (ograniczony wpływ).
        if (constructionResult !== 0) {
            const scale = Math.max(50000, Math.abs(marketCap) * 0.02);
            const change = Math.max(-0.5, Math.min(0.5, constructionResult / scale));
            stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + change);
        }

        // Transfer 50% zysku do spółki-matki — tylko z dodatniego wyniku i w granicach gotówki.
        if (stock.isSubsidiaryOf && reportedQuarterlyEarnings > 0) {
            const parentStock = stocks.find(s => s.symbol === stock.isSubsidiaryOf);
            const earningsToTransfer = parentStock
                ? Math.min(reportedQuarterlyEarnings * 0.5, Math.max(0, Number(stock.cash) || 0))
                : 0;

            if (earningsToTransfer > 0) {
                transferCompanyCash(stock, parentStock, earningsToTransfer, 'Transfer zysku do spółki-matki');
                adjustBalanceSheet(stock, { assets: -earningsToTransfer, retainedEarnings: -earningsToTransfer });
                adjustBalanceSheet(parentStock, { assets: earningsToTransfer, retainedEarnings: earningsToTransfer });

                logEvent(`💸 Spółka zależna ${stock.name} transferuje ${earningsToTransfer.toFixed(0)} PLN zysku do ${parentStock.name}.`, 'company');
            }
        }

        // Finansowanie: decyzje na podstawie pełnego wyniku (z R&D i kontraktami).
        if (reportedQuarterlyEarnings < 0 && stock.assetType !== 'Holding' && !stock.isBankStock) {
            // Firma ze stratą zaciąga mały dług, aby zachować płynność (gotówka i dług rosną razem).
            const debtIncrease = Math.abs(reportedQuarterlyEarnings) * getRandomInRange(0.1, 0.4);
            borrowForCompany(stock, debtIncrease, 'Kredyt na płynność po stracie');
        } else if (reportedQuarterlyEarnings > 0 && stock.balanceSheet.liabilities > 0 && stock.cash > 0) {
            // Firma z zyskiem spłaca część długu.
            const debtRepayment = Math.min(stock.cash * 0.5, reportedQuarterlyEarnings * getRandomInRange(0.1, 0.3));
            repayCompanyDebt(stock, Math.min(debtRepayment, stock.balanceSheet.liabilities));
        }
        // P3: kredyt na płynność pokrywa tylko część straty — gdy gotówka i tak spadła poniżej zera, bank dokredytowuje
        // do zera z małym buforem (dług rośnie, kapitał bez zmian; o upadłości decyduje kapitał poniżej).
        coverNegativeCash(stock, reportedQuarterlyEarnings);

        // Logika bankructwa (bez zmian)
        const equity = stock.balanceSheet.assets - stock.balanceSheet.liabilities;
        if ((equity <= 0 || stock.financialHealth <= -5 || isCullCandidate(stock)) && !stock.isBankrupt) {
             let bankruptcyChance = 0.30;
             if (typeof isProtectedMarketOperator === 'function' && isProtectedMarketOperator(stock)) {
                 // D1: operator rynku internetowego z kilkoma spółkami nie upada — spółki członkowskie składają się na ratunek.
                 bankruptcyChance = 0;
                 const bailout = Math.max(0, -equity) + getMarketCapValue(stock) * 0.05;
                 adjustCompanyCash(stock, bailout); // ratunek w gotówce (P3: bez „pustych” aktywów)
                 adjustBalanceSheet(stock, { assets: bailout, retainedEarnings: bailout });
                 stock.financialHealth = Math.max(stock.financialHealth, -1);
             } else if (stock.ceo?.traits?.some(t => t.id === 'bogacz')) {
                 bankruptcyChance = 0;
                 logEvent(`[CEO] Prywatne środki i wpływy prezesa ratują ${stock.name} przed bankructwem!`);
                 const bailout = Math.abs(equity) + (stock.price * stock.totalShares * 0.1);
                 stock.balanceSheet.assets += bailout;
                 stock.balanceSheet.retainedEarnings += bailout;
                 stock.financialHealth = 1;
             } else if (stock.assetType === 'REIT' || stock.isBankStock) {
                bankruptcyChance = 0.05; // REITy i Banki rzadziej bankrutują
             }

             if (bankruptcyChance > 0 && Math.random() < bankruptcyChance) {
                 if (typeof mafiaRescueFromBankruptcy === 'function' && mafiaRescueFromBankruptcy(stock)) continue; // „inwestor” w ostatniej chwili (mafia.js)
                 logEvent(`🔥 BANKRUCTWO! Spółka ${stock.name} (${stock.symbol}) ogłasza upadłość!`, 'review');
                 if (typeof onAcademyEvent === 'function') onAcademyEvent('bankruptcy', stock); // przed usunięciem akcji gracza
                 removeStockFromGame(stock.symbol); 
                 stock.isBankrupt = true;
                 stock.timeOfDeath = Date.now();
                 continue; 
             }
        }

        // Emisja obligacji ratunkowych (bez zmian)
        const canIssueRescue = stock.financialHealth <= -3 &&
                               stock.balanceSheet.liabilities > stock.balanceSheet.assets * 0.6 &&
                               !stock.assetType && !stock.isBankStock &&
                               (!stock.rescueActionCooldown || Date.now() > stock.rescueActionCooldown) &&
                               Math.random() < 0.25;
        if (canIssueRescue) {
            issueRescueBond(stock);
        }

        // Reakcja rynku na raport: niespodzianka EPS względem oczekiwań (nie progi kondycji).
        let reportResult = 'neutral';
        let magnitude = 0;
        let eventMessage = '';
        const surprise = Math.max(-1, Math.min(1, earningsSurprise));
        stock.lastSurprise = surprise; // N2: wynik vs konsensus (karta spółki)
        stock.surpriseHistory = [...(stock.surpriseHistory || []), surprise].slice(-4); // N3: czerwona flaga „zawsze tuż nad konsensusem”

        if (surprise >= 0.5) {
            reportResult = 'excellent';
            eventMessage = `📈 DOSKONAŁY RAPORT! ${stock.name} (${stock.symbol}): zysk znacznie powyżej oczekiwań.`;
        } else if (surprise >= 0.15) {
            reportResult = 'good';
            eventMessage = `📈 DOBRY RAPORT: Wyniki ${stock.name} (${stock.symbol}) powyżej oczekiwań.`;
        } else if (surprise <= -0.5) {
            reportResult = 'tragic';
            eventMessage = `📉 TRAGICZNY RAPORT! ${stock.name} (${stock.symbol}) mocno rozczarowuje wynikami.`;
            if (typeof onAcademyEvent === 'function') onAcademyEvent('tragicReport', stock);
        } else if (surprise <= -0.15) {
            reportResult = 'bad';
            eventMessage = `📉 SŁABY RAPORT: ${stock.name} (${stock.symbol}) notuje wyniki poniżej prognoz.`;
        }

        if (reportResult !== 'neutral') {
            magnitude = Math.max(-0.12, Math.min(0.12, surprise * 0.12));
        }

        stock.lastReport = reportResult;
        if (reportResult !== 'neutral') {
            logEvent(eventMessage);
            applyPriceEffect(stock.symbol, magnitude, magnitude < 0 ? 'negative' : 'positive', 'review');
        }
        if (typeof addChartEvent === 'function' && Math.abs(surprise) >= 0.15) addChartEvent(stock, surprise > 0 ? '📈' : '📉', `Raport kwartalny: zysk ${surprise >= 0 ? '+' : ''}${(surprise * 100).toFixed(0)}% vs konsensus`);

        // Dywidenda: zarząd może zmienić strategię, potem ogłasza wypłatę z zysku kwartału.
        reviewDividendPolicy(stock);
        declareQuarterDividend(stock, publishedEarnings); // oszust wypłaca dywidendę z „zysku na papierze”
        updateDividendStreak(stock); // seria wypłat i status arystokraty (dividends.js)

        // Aktualizacja zmienności (bez zmian)
        const baseVolatility = initialStocks.find(s => s.symbol === stock.symbol)?.volatilityFactor || stock.volatilityFactor;
        if (stock.financialHealth > 0) {
            stock.volatilityFactor = Math.max(baseVolatility * 0.8, stock.volatilityFactor * 0.95);
        } else if (stock.financialHealth < 0) {
            stock.volatilityFactor = Math.min(baseVolatility * 2.5, stock.volatilityFactor * 1.05);
        }
        if (stock.volatilityFactor < 0.1) stock.volatilityFactor = 0.1;

        if (stock.quarterlyEarnings > 0 && !stock.isBankrupt) {
            let cityTaxRate = 0.005; // 0.5%
            
            // Sprawdź modyfikator podatkowy burmistrza
            if (city.mayor.taxModifier) {
                cityTaxRate += city.mayor.taxModifier; // np. +0.01 lub -0.01
            }
            
            if (cityTaxRate > 0) {
                 const cityTax = stock.quarterlyEarnings * cityTaxRate;
                 if (stock.cash >= cityTax) {
                     adjustCompanyCash(stock, -cityTax);
                     adjustBalanceSheet(stock, { assets: -cityTax, retainedEarnings: -cityTax });
                     city.budget += cityTax;
                 }
                 // Nie logujemy tego, żeby nie spamować
            }
        }

    } // Koniec pętli for

    // Wartość godziwa po raportach (nowa faza cyklu i stopy mogły zmienić wyceny).
    stocks.forEach(stock => {
        if (!stock.isBankrupt && stock.fundamentals) updateFundamentalRatios(stock);
    });

    displayStocks(getCurrentInputValues());
    displayPortfolio();
    console.log("[RAPORTY KWARTALNE] Przetwarzanie zakończone.");
    checkCompanyCounterActions();
}

function processReitDividend(stock) {
    if (stock.sharesHeld === 0) return;

    // Logika wzrostu dywidendy dla REIT
    const roll = Math.random();
    if (roll > 0.81) { // 19% szans na wzrost
        stock.dividendPerShare += getRandomInRange(0.05, 0.5);
    } // w 81% przypadków zostaje bez zmian

    payDividendToShareholders(stock, stock.dividendPerShare);
}

function resolveMerger(stock1, stock2, process) {
    console.log(`[M&A Resolve] Finalizowanie procesu ${process.type} dla ${stock1.symbol} i ${stock2.symbol}...`);

    const initiator = stock1.symbol === process.initiatorSymbol ? stock1 : stock2;
    const target = stock1.symbol === process.initiatorSymbol ? stock2 : stock1;
    let successMessage = "";

    // Koszt "Zatrutej Pigułki" (bez zmian)
    let defenseCost = 0;
    if (process.defenseActive === 'poisonPill') {
        defenseCost = (target.price * target.totalShares) * 0.20;
        logEvent(`💊 ${initiator.name} musi zapłacić ${defenseCost.toFixed(0)} PLN za "odtrucie pigułki" w ${target.name}!`, 'review');
        process.costs += defenseCost;
    }
    
    const totalCost = process.offerDetails.totalCost + process.costs; // Całkowity koszt = oferta + koszty procesu + koszty obrony

    // --- Logika dla różnych typów ---
    switch (process.type) {
        case 'przejęcie':
        case 'influenceTakeover':
            
            // ===>>> NOWA LOGIKA FINANSOWANIA <<<===
            if (process.financing === 'cash') {
                // 1. Finansowanie Gotówką
                if (initiator.cash < totalCost) {
                    cancelMerger(initiator, "Brak wystarczających środków na finalizację przejęcia (koszty dodatkowe).");
                    cancelMerger(target, "Inicjator nie pokrył kosztów przejęcia.");
                    return;
                }
                initiator.cash -= totalCost;
                logEvent(`💸 ${initiator.name} wydaje łącznie ${totalCost.toFixed(0)} PLN (z gotówki) na przejęcie ${target.name}.`, 'company');
            
            } else if (process.financing === 'lbo') {
                // 2. Finansowanie Długiem (LBO)
                const lenderBank = findBestLenderBank(initiator, totalCost);
                if (!lenderBank) {
                    cancelMerger(initiator, "Nie udało się zabezpieczyć finansowania LBO. Banki odrzuciły wniosek.");
                    cancelMerger(target, "Inicjatorowi nie udało się pozyskać finansowania LBO.");
                    return;
                }
                
                // Bank płaci (traci gotówkę), Inicjator zyskuje dług
                lenderBank.cash -= totalCost;
                if (initiator.balanceSheet) {
                    initiator.balanceSheet.liabilities += totalCost; // Dług dopisany do bilansu!
                }
                // Dodaj kredyt do portfela banku (śledzenie)
                if (!lenderBank.loanPortfolio[initiator.symbol]) lenderBank.loanPortfolio[initiator.symbol] = 0;
                lenderBank.loanPortfolio[initiator.symbol] += totalCost;
                
                logEvent(`🏦 ${initiator.name} finansuje przejęcie ${target.name} poprzez LBO (dług) w ${lenderBank.name} na kwotę ${totalCost.toFixed(0)} PLN!`, 'company');
            
            } else {
                console.error(`[M&A Resolve] Nieznany typ finansowania: ${process.financing}`);
                cancelMerger(initiator, "Błąd metody finansowania.");
                cancelMerger(target, "Błąd metody finansowania.");
                return;
            }
            // ===>>> KONIEC NOWEJ LOGIKI FINANSOWANIA <<<===


            // 3. Wypłata dla akcjonariuszy spółki-celu (bez zmian)
            const pricePerShare = process.offerDetails.buyoutPricePerShare;
            // Gracz
            if (playerPortfolio[target.symbol]) {
                const holding = playerPortfolio[target.symbol];
                const grossGain = holding.shares * pricePerShare;
                playerCash += grossGain; // TODO: Obliczyć podatek
                logEvent(`💰 Otrzymujesz ${grossGain.toFixed(2)} PLN za akcje ${target.name} w ramach przejęcia.`, 'success');
            }
            // AI
            aiCompetitors.forEach(ai => {
                if (ai.portfolio[target.symbol]) {
                    ai.cash += ai.portfolio[target.symbol].shares * pricePerShare;
                }
            });
            // Holdingi i Banki
            stocks.filter(s => s.assetType === 'Holding' && s.holdingPortfolio[target.symbol]).forEach(h => h.cash += (h.holdingPortfolio[target.symbol].quantity * pricePerShare));
            commercialBanks.filter(b => b.stockPortfolio[target.symbol]).forEach(b => b.cash += (b.stockPortfolio[target.symbol].shares * pricePerShare));
            settleEtfHoldings(target.symbol, pricePerShare); // pakiety ETF-ów (etf.js)
            transferSpecialBonuses(target, initiator); // bonusy projektów specjalnych (projects.js)
            target.absorbedBy = initiator.symbol; // pakiety celu przechodzą na przejmującego
            // Fundusze botów, konto prywatne gracza i inne spółki z pakietami
            for (const manager of corporation?.managers || []) {
                const held = manager.fund?.portfolio?.[target.symbol]?.shares || 0;
                if (held > 0) { manager.fund.cash += held * pricePerShare; delete manager.fund.portfolio[target.symbol]; }
            }
            const walletHeld = playerWallet?.portfolio?.[target.symbol]?.shares || 0;
            if (walletHeld > 0) { playerWallet.cash += walletHeld * pricePerShare; delete playerWallet.portfolio[target.symbol]; }
            for (const owner of stocks) {
                const stake = owner !== initiator ? owner.equityStakes?.[target.symbol] || 0 : 0;
                if (stake > 0) adjustCompanyCash(owner, stake * pricePerShare);
                if (owner.equityStakes?.[target.symbol]) delete owner.equityStakes[target.symbol];
            }

            // 4. Przeniesienie Aktywów i Pasywów (bez zmian)
            if (initiator.balanceSheet && target.balanceSheet) {
                initiator.balanceSheet.assets += target.balanceSheet.assets;
                initiator.balanceSheet.liabilities += target.balanceSheet.liabilities;
                initiator.balanceSheet.retainedEarnings += target.balanceSheet.retainedEarnings;
                initiator.cash += target.cash; 
            }

            // 5. Obsługa CEO (Złoty Spadochron) (bez zmian)
            if (target.ceo?.traits?.some(t => t.id === 'goldenParachute')) {
                const parachuteCost = (target.price * target.totalShares) * 0.02; 
                if (initiator.cash >= parachuteCost) {
                    initiator.cash -= parachuteCost;
                    logEvent(`[CEO] Prezes ${target.name} odpala złoty spadochron! Koszt dla ${initiator.name}: ${parachuteCost.toFixed(0)} PLN.`, 'company');
                }
            }

            // 6. Aktualizacja spółki-matki (bez zmian)
            initiator.financialHealth = Math.max(-5, Math.min(5, ((initiator.financialHealth + target.financialHealth) / 2) + 0.5));
            if (!initiator.subsidiaries) initiator.subsidiaries = [];
            initiator.subsidiaries.push({ symbol: target.symbol, name: target.name, date: Date.now() });

            successMessage = `✅ Przejęcie zakończone! ${initiator.name} wchłonął ${target.name}.`;
            break;

        case 'fuzja':
            const initiatorValue = initiator.price * initiator.totalShares;
            const targetValue = target.price * target.totalShares;
            const totalNewValue = initiatorValue + targetValue;
            const exchangeRatio = (targetValue / totalNewValue) / target.totalShares; 
            const newSharesForTargetHolders = target.totalShares * exchangeRatio;
            const initiatorRatio = (initiatorValue / totalNewValue) / initiator.totalShares;
            const newSharesForInitiatorHolders = initiator.totalShares * initiatorRatio;
            const newTotalShares = newSharesForTargetHolders + newSharesForInitiatorHolders;

            const playerTargetShares = playerPortfolio[target.symbol]?.shares || 0;
            const playerInitiatorShares = playerPortfolio[initiator.symbol]?.shares || 0;
            const totalNewSharesForPlayer = (playerTargetShares * exchangeRatio) + (playerInitiatorShares * initiatorRatio);
            if (playerTargetShares > 0) delete playerPortfolio[target.symbol]; // wymiana opisana niżej w dzienniku (fuzja)
            if (totalNewSharesForPlayer > 0) {
                 playerPortfolio[initiator.symbol] = { shares: totalNewSharesForPlayer, avgPrice: totalNewValue / newTotalShares, assetType: 'stock' };
                 logEvent(`🔄 Twoje akcje ${target.symbol} i ${initiator.symbol} zostały wymienione na ${totalNewSharesForPlayer.toFixed(0)} akcji nowej spółki.`, 'review');
            }

            [...aiCompetitors, ...stocks.filter(s=>s.assetType==='Holding'), ...commercialBanks].forEach(entity => {
                const portfolio = entity.portfolio || entity.holdingPortfolio || entity.stockPortfolio;
                if (!portfolio) return;
                const targetShares = portfolio[target.symbol]?.shares || portfolio[target.symbol]?.quantity || 0;
                const initiatorShares = portfolio[initiator.symbol]?.shares || portfolio[initiator.symbol]?.quantity || 0;
                const totalNewShares = (targetShares * exchangeRatio) + (initiatorShares * initiatorRatio);
                if (targetShares > 0) delete portfolio[target.symbol];
                if (totalNewShares > 0) {
                    if(entity.portfolio) {
                         portfolio[initiator.symbol] = { shares: totalNewShares, avgPrice: totalNewValue / newTotalShares };
                    } else { 
                         portfolio[initiator.symbol] = { quantity: totalNewShares, purchasePrice: totalNewValue / newTotalShares };
                    }
                }
            });

            transferSpecialBonuses(target, initiator);
            target.absorbedBy = initiator.symbol;
            initiator.name = `${initiator.name.split(' ')[0]}-${target.name.split(' ')[0]} Group`;
            initiator.totalShares = newTotalShares;
            initiator.maxShares = newTotalShares * 1.5;
            initiator.price = totalNewValue / newTotalShares;
            if (initiator.balanceSheet && target.balanceSheet) {
                initiator.balanceSheet.assets += target.balanceSheet.assets;
                initiator.balanceSheet.liabilities += target.balanceSheet.liabilities;
                initiator.balanceSheet.retainedEarnings += target.balanceSheet.retainedEarnings;
                initiator.cash += target.cash;
            }
            initiator.cash -= process.costs;
            initiator.financialHealth = Math.max(-5, Math.min(5, ((initiator.financialHealth + target.financialHealth) / 2) + 1.0));
            if (!initiator.subsidiaries) initiator.subsidiaries = [];
            initiator.subsidiaries.push({ symbol: target.symbol, name: target.name, date: Date.now() });

            if (target.ceo && target.financialHealth > initiator.financialHealth) {
                initiator.ceo = target.ceo;
            } 

            successMessage = `✅ Fuzja zakończona! Powstaje ${initiator.name}.`;
            break;

        default:
            console.warn(`[M&A Resolve] Nieznany typ procesu: ${process.type}`);
            cancelMerger(stock1, "Nieobsługiwany typ procesu.");
            cancelMerger(stock2, "Nieobsługiwany typ procesu.");
            return;
    }

    // --- Finalizacja (bez zmian) ---
    removeStockFromGame(target.symbol);
    initiator.mergerProcess = null;
    initiator.mergerPartnerVisible = false;

    logEvent(successMessage, 'success');
    showToast(successMessage, 'success', 7000);

    displayStocks(getCurrentInputValues());
    displayPortfolio();
}

/**
 * Anuluje proces fuzji lub przejęcia.
 * @param {object} stock - Spółka, dla której anulujemy proces (druga zostanie znaleziona po partnerSymbol).
 * @param {string} reason - Powód anulowania.
 */
function cancelMerger(stock, reason) {
    if (!stock || !stock.mergerProcess) return;

    const partnerSymbol = stock.mergerProcess.partnerSymbol;
    const partnerStock = stocks.find(s => s.symbol === partnerSymbol);

    logEvent(`❌ Proces M&A między ${stock.symbol} a ${partnerSymbol} został anulowany. Powód: ${reason}`, 'review');
    showToast(`Fuzja/Przejęcie ${stock.symbol}-${partnerSymbol} anulowane!`, 'error');

    // Resetuj stan w obu spółkach
    stock.mergerProcess = null;
    stock.mergerPartnerVisible = false;
    stock.isBeingMerged = false;
    stock.canBeTraded = true;

    if (partnerStock) {
        partnerStock.mergerProcess = null;
        partnerStock.mergerPartnerVisible = false;
        partnerStock.isBeingMerged = false;
        partnerStock.canBeTraded = true;
    }

    // Nałóż karę za nieudany proces (lekki spadek kondycji)
    stock.financialHealth -= 0.3;
    if (partnerStock) {
        partnerStock.financialHealth -= 0.3;
    }

    // Odśwież UI
    displayStocks(getCurrentInputValues());
}

// --- Startupy ---
function updateStartups(deltaTime) {
    const now = Date.now();
    for (let i = stocks.length - 1; i >= 0; i--) {
        const startup = stocks[i];
        if (startup.assetType !== 'Startup') continue;

        // Używamy instrukcji switch, aby zarządzać etapami życia start-upu
        switch (startup.stage) {
            case 'funding':
                // Etap zbierania funduszy (pasywne finansowanie wciąż działa)
                if (startup.currentFunding < startup.fundingGoal) {
                    // Drobni inwestorzy z zewnątrz: średnio ok. 0,1% celu na sekundę gry (~15 min do zebrania bez funduszu i botów).
                    let donation = 0;
                    const roll = Math.random();
                    if (roll < 0.02) { donation = startup.fundingGoal * getRandomInRange(0.01, 0.03); }
                    else if (roll < 0.30) { donation = startup.fundingGoal * getRandomInRange(0.001, 0.004); }
                    if (donation > 0) {
                        startup.currentFunding += donation;
                        if (startup.currentFunding > startup.fundingGoal) {
                            startup.currentFunding = startup.fundingGoal;
                        }
                    }
                }

                // Jeśli cel został osiągnięty, przechodzimy do etapu 'overfunding'
                if (startup.currentFunding >= startup.fundingGoal) {
                    startup.stage = 'overfunding';
                    startup.overfundingTimeLeft = 120000; // Ustawiamy timer na 2 minuty
                    logEvent(`[START-UP] ${startup.name} osiągnął cel finansowy! Rozpoczyna się 2-minutowy okres na dodatkowe inwestycje bonusowe.`, 'review');
                }
                break; // T0: inkubator rysuje część UI pętli (raz na wywołanie), nie każdy tik

            case 'overfunding':
                // Etap "dopłacania" po osiągnięciu celu
                startup.overfundingTimeLeft -= deltaTime; // Odliczamy czas
                
                if (startup.overfundingTimeLeft <= 0) {
                    // Jeśli czas minął, przechodzimy do etapu rozwoju
                    startup.stage = 'development';
                    logEvent(`[START-UP] Okres dodatkowych inwestycji dla ${startup.name} zakończył się...`, 'review');
                }
                break; // T0: inkubator rysuje część UI pętli (raz na wywołanie), nie każdy tik

            case 'development':
                // Wstrzymanie: niezapłacony koszt dodatkowy albo opóźnienie techniczne (prywatyzacja).
                if (startup.pendingExtraCost || (startup.developmentPausedUntil && Date.now() < startup.developmentPausedUntil)) break;
                if (startup.isPrivatized && !startup.complicationRolled && startup.developmentProgress > 50) {
                    startup.complicationRolled = true;
                    if (Math.random() < 0.35) { triggerPrivatizedStartupComplication(startup); break; }
                }
                // Etap rozwoju
                if (startup.developmentProgress < 100) {
                    const progressIncrease = (deltaTime / 1000) * 0.5 * (startup.operatorStartup ? OPERATOR_STARTUP_SLOWDOWN : 1); // operator rynku rozwija się wolno
                    startup.developmentProgress += progressIncrease;
                }

                // --- NOWY BLOK KODU DLA MINI-EVENTÓW ---
                // Sprawdź, czy gracz odblokował start-upy, czy to start-up gamingowy i czy wylosowano event
                if (isSkillUnlocked('startupInvestor') && startup.sector.includes('Gaming') && Math.random() < 0.005) {
                    triggerGamingStartupEvent(startup);
                }
                // --- KONIEC NOWEGO BLOKU ---

                if (startup.developmentProgress >= 100 && startup.stage === 'development') {
                    // NATYCHMIAST zmieniamy etap, aby ten blok kodu nie wykonał się ponownie
                    startup.stage = 'finalized'; 
                    startup.developmentProgress = 100;
                    finalizeStartup(startup); // Wywołujemy finał tylko RAZ
                }
                break;
            
            case 'financial_complications':
                startup.rescueTimeLeft -= deltaTime;

                // Logika wkładu AI (mała szansa w każdym cyklu)
                if (Math.random() < 0.02) {
                    const contributingAI = aiCompetitors.find(ai => ai.portfolio[startup.symbol] && Math.random() < 0.5);
                    if (contributingAI) {
                        const amount = Math.min(contributingAI.cash * 0.1, startup.rescueGoal - startup.rescueCurrent);
                        if (amount > 100) {
                            contributingAI.cash -= amount;
                            startup.rescueCurrent += amount;
                            const aiHolding = contributingAI.portfolio[startup.symbol];
                            aiHolding.investedAmount = (Number(aiHolding.investedAmount) || 0) + amount; // ratunek = inwestycja
                            logEvent(`[START-UP] ${contributingAI.name} dofinansowuje ${startup.name} kwotą ${amount.toFixed(2)} PLN!`);
                        }
                    }
                }

                if (checkStartupRescue(startup)) break; // zebrano kwotę ratunkową (także przez boty) → debiut
                if (startup.rescueTimeLeft <= 0 && startup.rescueCurrent < startup.rescueGoal) {
                    // Czas minął, a cel nie został osiągnięty -> KRYTYCZNA PORAŻKA
                    showToast(`Nie udało się uratować ${startup.name}! Firma upada.`, 'error', 5000);
                    logEvent(`[START-UP] 🔥 ${startup.name} nie zebrał na czas środków na ratunek.`, 'review');
                    removeStartup(startup, 0.05, 0.15); // Zwrot 5-15%
                }
                break;
        }

    }
}

function initializeResearchForStock(stock, options = {}) {
    if (!stock || stock.isBankrupt) return false;

    // Nie resetujemy już istniejącego systemu.
    if (stock.research && typeof stock.research === 'object') {
        return false;
    }

    const excludedTypes = [
        'Startup',
        'REIT',
        'ResearchInstitute'
    ];

    if (excludedTypes.includes(stock.assetType)) {
        stock.research = null;
        stock.researchUnlocks = null;
        return false;
    }

    // Banki nadal korzystają z własnego systemu inwestycji.
    if (stock.isBankStock) {
        const investmentIds = Object.keys(bankInvestments);

        if (investmentIds.length === 0) {
            stock.research = null;
            return false;
        }

        const firstId = getRandomElement(investmentIds);
        const investment = bankInvestments[firstId];
        const bank = commercialBanks.find(
            item => item.id === stock.bankData?.id
        );

        const cost = Number(investment.initialCashCost ?? 0);
        const requiredProgress = Number(investment.baseCost);

        if (
            !Number.isFinite(cost) ||
            cost < 0 ||
            !Number.isFinite(requiredProgress) ||
            requiredProgress <= 0
        ) {
            return false;
        }

        stock.research = {
            isInvestment: true,
            isResearching: false,
            currentInvestmentId: firstId,
            progress: 0,
            requiredProgress,
            completedInvestments: Object.fromEntries(
                investmentIds.map(id => [id, 0])
            ),
            investmentPaused: false,
            ledger: [],
            pendingQuarterlyExpense: 0
        };

        if (
            bank &&
            Number.isFinite(Number(bank.cash)) &&
            Number(bank.cash) >= cost
        ) {
            bank.cash = Number(bank.cash) - cost;
            stock.research.isResearching = true;

            logEvent(
                `Bank ${stock.name} rozpoczyna inwestycję ` +
                `„${investment.name}” za ${cost.toFixed(2)} PLN.`,
                'company'
            );
        } else {
            stock.research.investmentPaused = true;

            logEvent(
                `Bank ${stock.name} oczekuje na środki na inwestycję ` +
                `„${investment.name}”.`,
                'company'
            );
        }

        return true;
    }

    if (!Array.isArray(stock.sector)) return false;

    const specializations = [
        'wzmacnianie rozwoju',
        'wzmacnianie pozycji na rynku',
        'wzmacnianie ceny i zysków'
    ];

    const shouldResearch = typeof options.enabled === 'boolean'
        ? options.enabled
        : Math.random() > 0.10;

    const specialization = specializations.includes(options.specialization)
        ? options.specialization
        : getRandomElement(specializations);

    stock.research = {
        isInvestment: false,
        isResearching: false,
        specialization,
        researchSpeedMultiplier: 1,
        currentTech: null,
        progress: 0,
        unlockedTechs: [],
        researchPaused: false,
        choiceAvailableUntil: null,
        choiceRemainingGameMs: null,
        autoResearchEnabled: shouldResearch,
        autoRetryGameMs: null,
        ledger: [],
        pendingQuarterlyExpense: 0
    };

    const unlockDefaults = {
        canSeeSpecialization: false,
        canSeeResults: false,
        canFund: false,
        canInfluence: false,
        canInterfere: false
    };

    stock.researchUnlocks = {
        ...unlockDefaults,
        ...(stock.researchUnlocks || {})
    };

    if (!shouldResearch) return true;

    const available = getAvailableCompanyResearch(stock, true);

    if (available.length === 0) {
        stock.research.autoRetryGameMs = BASE_DELAYS.weekly;

        logEvent(
            `${stock.name}: R&D przygotowane, ale brak dostępnego ` +
            'badania, na które spółkę stać. Wybór zostanie ponowiony.',
            'company'
        );

        return true;
    }

    const isBuilder = stock.sector.includes('Budowlany');

    const preferred = isBuilder
        ? available.filter(
            id =>
                technologies[id].sector === 'Budowlany' &&
                technologies[id].constructionEffects
        )
        : [];

    const pool = preferred.length > 0 ? preferred : available;

    const firstId = (
        options.firstTechId &&
        available.includes(options.firstTechId)
    )
        ? options.firstTechId
        : getRandomElement(pool);

    const started = startCompanyResearch(stock, firstId);

    if (!started) {
        stock.research.autoRetryGameMs = BASE_DELAYS.weekly;
    }

    return true;
}

function buyStartupInsurance(symbol) {
    const holding = playerPortfolio[symbol];
    if (!holding || holding.assetType !== 'Startup') return;

    // Sprawdź warunki
    if (getSkillLevel('startupInvestor') < 4) {
        showToast("Musisz mieć 4 poziom 'Anioła Biznesu', aby wykupić ubezpieczenie.");
        return;
    }
    if (holding.isInsured) {
        showToast("Ta inwestycja jest już ubezpieczona.");
        return;
    }

    // Oblicz koszt ubezpieczenia (5% wartości inwestycji)
    // SCALONO: W Twojej wersji było `holding.shares * holding.avgPrice`, co nie ma sensu dla startupu.
    // Zmieniam na `holding.investedAmount`, co jest logiczne.
    const insuranceCost = holding.investedAmount * 0.05;

    if (playerCash < insuranceCost) {
        showToast(`Nie masz wystarczająco gotówki, aby wykupić ubezpieczenie! Potrzebujesz ${insuranceCost.toFixed(2)} PLN.`);
        return;
    }

    gameConfirm(`Czy na pewno chcesz wykupić ubezpieczenie dla inwestycji w ${symbol} za ${insuranceCost.toFixed(2)} PLN?`, () => {
        // Transakcja
        playerCash -= insuranceCost;
        holding.isInsured = true;

        logEvent(`🛡️ Wykupiono ubezpieczenie dla inwestycji w ${symbol} za ${insuranceCost.toFixed(2)} PLN.`, 'review');
        displayCash();
    });
}

/**
 * Uruchamia komplikację dla sprywatyzowanego start-upu, który w normalnych warunkach by upadł.
 * @param {object} startup Obiekt start-upu.
 */
function triggerPrivatizedStartupComplication(startup) {
    logEvent(`[Prywatyzacja] Wystąpiły nieprzewidziane problemy z projektem ${startup.name}...`, 'review');

    if (Math.random() < 0.5) {
        // Komplikacja: Dodatkowe koszty
        const extraCost = startup.fundingGoal * getRandomInRange(0.15, 0.30);
        startup.pendingExtraCost = extraCost;
        logEvent(`Projekt ${startup.name} wymaga dodatkowych ${extraCost.toFixed(2)} PLN! Prace zostały wstrzymane do czasu uregulowania płatności.`, 'review');
    } else {
        // Komplikacja: Opóźnienie
        const delaySeconds = getRandomIntInRange(45, 90);
        startup.developmentPausedUntil = Date.now() + (delaySeconds * 1000);
        logEvent(`Prace nad ${startup.name} zostały opóźnione o ${delaySeconds} sekund z powodu problemów technicznych.`, 'review');
    }
}

function generateNewStartup() {
    let name;
    let sector;
    do {
        sector = getRandomElement(startupSectors);
    } while (sector[0] === 'Bankowość'); // Losuj ponownie, jeśli wylosowano Bankowość
    switch (sector[0]) {
        case 'Technologia':
            name = `${getRandomElement(techPrefixes)}${getRandomElement(techSuffixes)}`;
            break;
        case 'Gaming':
            name = `${getRandomElement(gamingPrefixes)}${getRandomElement(gamingSuffixes)}`;
            break;
        case 'Medycyna':
            name = `${getRandomElement(medPrefixes)}${getRandomElement(medSuffixes)}`;
            break;
        case 'Energia':
            name = `${getRandomElement(energyPrefixes)}${getRandomElement(energySuffixes)}`;
            break;
        case 'Finanse':
            name = `${getRandomElement(financePrefixes)}${getRandomElement(financeSuffixes)}`;
            break;
        case 'Żywność':
            name = `${getRandomElement(foodPrefixes)}${getRandomElement(foodSuffixes)}`;
            break;
        case 'Nieruchomości':
            name = `${getRandomElement(realtyPrefixes)}${getRandomElement(realtySuffixes)}`;
            break;
        case 'Chemia':
            name = `${getRandomElement(chemPrefixes)}${getRandomElement(chemSuffixes)}`;
            break;
        case 'Przemysł':
            name = `${getRandomElement(industryPrefixes)}${getRandomElement(industrySuffixes)}`;
            break;
        case 'Dobra konsumpcyjne':
            name = `${getRandomElement(consumerPrefixes)}${getRandomElement(consumerSuffixes)}`;
            break;
        case 'Usługi':
            name = `${getRandomElement(servicesPrefixes)}${getRandomElement(servicesSuffixes)}`;
            break;
        case 'Turystyka':
            name = `${getRandomElement(tourismPrefixes)}${getRandomElement(tourismSuffixes)}`;
            break;
        case 'Bankowość':
            name = `${getRandomElement(bankingPrefixes)}${getRandomElement(bankingSuffixes)}`;
            break;
        default:
            name = 'DejwCorp';
            break;
    }
    let symbol = (name.substring(0, 3) + name.charAt(Math.floor(name.length / 2))).toUpperCase();

    while (stocks.some(s => s.symbol === symbol)) {
        symbol += 'X';
    }


    let successChance = getRandomInRange(0.50, 0.75); // Bazowa szansa na sukces: 50-75%
    let isScam = false;
    let isWhiteCrow = false;
    let fundingGoal = Math.round(getRandomIntInRange(5000, 40000) * (1 + 0.5 * getCrowdingPressure()) / 500) * 500; // skala funduszu gracza (etap F2); D2: nasycony rynek = trudniejszy cel

    // --- LOGIKA SPECJALNYCH PRZYPADKÓW ---
    const specialRoll = Math.random();

    if (specialRoll < 0.02) { // 2% szans na "białego kruka"
        isWhiteCrow = true;
        successChance = 1;

        fundingGoal *= 1.3; // "Białe kruki" mają wyższe cele
    } else if (specialRoll < 0.12) { // 10% szans na oszustwo (przedział od 2% do 12%)
        isScam = true;
        successChance = 0;
    }

    // Specjalna zasada dla firm gamingowych - większe ryzyko
    if (sector.includes('Gaming') && !isWhiteCrow) {
        successChance *= 0.7; // Obniżamy szansę na sukces o 30%
    }

    const newStartup = {
        name: name,
        symbol: symbol,
        exchange: 'INCUBATOR',
        price: getRandomInRange(0.5, 2.5),
        totalShares: 100000, maxShares: 100000, sharesHeld: 0, priceHistory: [], // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
        lineHistory: [], playerTransactions: [], playerTransactions: [],
        sector: sector,
        financialHealth: 0,
        volatilityFactor: getRandomInRange(2.5, 4.5),
        dividendPolicy: 'None',
        assetType: 'Startup',
        fundingGoal: Math.round(fundingGoal),
        currentFunding: 0,
        developmentProgress: 0,
        successChance: successChance,
        isScam: isScam,
        isWhiteCrow: isWhiteCrow,
        stage: 'funding',
        ipoPriceBonus: 0,
        marketBehavior: null,
        overfundingEndTime: 0,
        investors: {}
    };

    return newStartup;
}

function maintainStartupCount() {
    const currentStartups = stocks.filter(s => s.assetType === 'Startup').length;

    // Funkcja działa tylko wtedy, gdy liczba start-upów spadnie PONIŻEJ minimum
    if (currentStartups < MINIMUM_STARTUPS) {
        const startupsToAdd = Math.round((TARGET_STARTUPS - currentStartups) * getDebutFactor()); // B5: ponad limitem spółek mniej startupów
        if (startupsToAdd <= 0) return;
        console.log(`[INKUBATOR] Liczba start-upów (${currentStartups}) spadła poniżej minimum. Dodawanie ${startupsToAdd} nowych...`);

        for (let i = 0; i < startupsToAdd; i++) {
            const newStartup = generateNewStartup();
            stocks.push(newStartup);
            logEvent(`[INKUBATOR] Na rynku pojawił się nowy, obiecujący start-up: ${newStartup.name}!`, 'market');
        }
    }
}

function acceptStartupOffer(symbol, amount, offerType, offerValue) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup' || startup.stage !== 'funding') {
        showToast("Niestety, ta oferta jest już nieaktualna!");
        return;
    }
    if (!canFundInvestInStartups(amount)) return; // limit startupów funduszu

    if (playerCash < amount) {
        showToast("Nie masz wystarczająco gotówki, aby dokonać tej inwestycji!");
        return;
    }

    let finalAmount = amount;
    let successChanceBonus = (amount / startup.fundingGoal) * 0.05; // Standardowy bonus
    let logMessage = `Przyjęto ofertę od ${startup.name} i zainwestowano ${amount.toFixed(2)} PLN.`;

    // Zastosuj bonusy z oferty
    switch (offerType) {
        case 'DISCOUNT':
            const discountedCost = amount * (1 - offerValue);
            if (playerCash < discountedCost) {
                showToast(`Nie masz wystarczająco gotówki! Koszt po zniżce to ${discountedCost.toFixed(2)} PLN.`);
                return;
            }
            playerCash -= discountedCost;
            finalAmount = amount; // Inwestowana kwota pozostaje ta sama, płacisz mniej
            logMessage += ` Otrzymano ${offerValue * 100}% zniżki!`;
            break;
        case 'BONUS_SHARES':
            playerCash -= amount;
            finalAmount = amount * (1 + offerValue); // Wartość inwestycji jest wirtualnie powiększona
            logMessage += ` Otrzymano ${offerValue * 100}% bonusowych udziałów!`;
            break;
        case 'SUCCESS_BOOST':
            playerCash -= amount;
            finalAmount = amount;
            startup.successChance += offerValue; // Dodajemy stały bonus do szansy na sukces
            if (startup.successChance > 1) startup.successChance = 1;
            logMessage += ` Szansa na sukces projektu wzrosła o ${offerValue * 100}%!`;
            break;
        default:
             playerCash -= amount;
             break;
    }
    
    // Zaktualizuj dane start-upu
    startup.currentFunding += finalAmount;
    startup.successChance += successChanceBonus;
    if (startup.successChance > 1) startup.successChance = 1;

    // Zaktualizuj portfel gracza
    if (playerPortfolio[symbol]) {
        playerPortfolio[symbol].investedAmount += finalAmount;
    } else {
        playerPortfolio[symbol] = { investedAmount: finalAmount, assetType: 'Startup', isInsured: false };
    }
    
    const playerName = "Ty (Gracz)";
    startup.investors[playerName] = (startup.investors[playerName] || 0) + finalAmount;
    
    logEvent(logMessage, 'review');

    // Zamknij modal i odśwież widok
    document.getElementById('startup-offer-modal').style.display = 'none';
    displayCash();
    displayPortfolio();
    displayStartups(getCurrentStartupInputValues());
}

function updateStartupAutoInvestTimers(deltaTime) {
    for (const symbol in playerStartupAutoInvest) {
        const settings = playerStartupAutoInvest[symbol];
        
        if (settings.isEnabled) {
            settings.timer -= deltaTime;

            if (settings.timer <= 0) {
                const startup = stocks.find(s => s.symbol === symbol);
                // Sprawdź, czy inwestycja jest nadal możliwa
                if (startup && (startup.stage === 'funding' || startup.stage === 'overfunding')) {
                    if (canFundInvestInStartups(settings.amount, true)) {
                        investInStartup(symbol, settings.amount);
                        logEvent(`[AUTO-STARTUP] Automatycznie zainwestowano ${settings.amount.toFixed(2)} PLN w ${startup.name}.`);
                    } else {
                        settings.isEnabled = false; // Wyłącz, jeśli brak środków
                        logEvent(`[AUTO-STARTUP] Brak środków! Auto-inwestowanie w ${startup.name} zostało wyłączone.`, 'review');
                        showToast(`Brak środków! Auto-inwestowanie w ${startup.name} wyłączone.`, 'error');
                    }
                } else {
                    settings.isEnabled = false; // Wyłącz, jeśli start-up nie przyjmuje już wpłat
                    logEvent(`[AUTO-STARTUP] Start-up ${symbol} nie przyjmuje już inwestycji. Auto-inwestowanie wyłączone.`, 'review');
                }
                
                settings.timer = settings.interval; // Zresetuj timer
            }
        }
    }
}

/**
 * Gracz opłaca dodatkowy koszt komplikacji w sprywatyzowanym start-upie.
 * @param {string} symbol Symbol start-upu.
 */
function payExtraStartupCost(symbol) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || !startup.pendingExtraCost) return;

    const cost = startup.pendingExtraCost;

    if (playerCash < cost) {
        showToast(`Nie masz wystarczająco gotówki, aby pokryć dodatkowe koszty (${cost.toFixed(2)} PLN).`);
        return;
    }
    playerCash -= cost;
    startup.pendingExtraCost = null; // Usuń blokadę kosztową
    startup.developmentProgress += 1; // Daj mały "kopniak", aby wznowić postęp

    logEvent(`Zapłacono dodatkowe ${cost.toFixed(2)} PLN, aby wznowić prace nad ${startup.name}.`, 'review');

    displayCash();
    displayStartups(getCurrentStartupInputValues());
}

/**
 * Inicjalizuje system reputacji dla wszystkich spółek na starcie gry.
 */
function initializeReputation() {
    const allEntities = ['player', ...aiCompetitors.map(ai => ai.id)];
    stocks.forEach(stock => {
        if (stock.assetType === 'Startup') return; // Reputacja nie dotyczy startupów

        stock.reputation = {};
        allEntities.forEach(id => {

            // --- POPRAWKA: Uwzględnienie Charyzmy Lvl 2 ---
            let baseRep = 0;
            // Jeśli jednostka to gracz i ma odblokowany Lvl 2 Charyzmy, jego startowa reputacja to 10.
            if (id === 'player' && getSkillLevel('charisma') >= 2) {
                baseRep = 10;
            }
            stock.reputation[id] = baseRep; // Początkowa reputacja
            // --- KONIEC POPRAWKI ---
        });
    });
    console.log("[SYSTEM] Zainicjalizowano system reputacji.");
}

function initializeAnalyticalProperties(stock) {
    const stabilityOptions = ["Bardzo Stabilny", "Stabilny", "Niestabilny", "Wewnętrzne tarcia", "Chaos"];
    const strategyOptions = ["Agresywna ekspansja", "Cięcia kosztów", "Kampania marketingowa", "Skup akcji własnych", "Inwestycje w R&D", "Poszukiwanie celu do przejęcia"];

    stock.analytical = {
        stability: getRandomElement(stabilityOptions),
        strategy: getRandomElement(strategyOptions),
        ceoCompetence: getRandomIntInRange(-5, 5)
    };
}

function updateAnalyticalProperties() {
    console.log("[Analityka] Aktualizowanie ukrytych danych korporacyjnych...");
    const stabilityOptions = ["Bardzo Stabilny", "Stabilny", "Niestabilny", "Wewnętrzne tarcia", "Chaos"];
    const strategyOptions = ["Agresywna ekspansja", "Cięcia kosztów", "Kampania marketingowa", "Skup akcji własnych", "Inwestycje w R&D", "Poszukiwanie celu do przejęcia"];

    stocks.forEach(stock => {
        if (stock.analytical && Math.random() < 0.25) { // 25% szans na zmianę w kwartale
            if (Math.random() < 0.5) {
                stock.analytical.strategy = getRandomElement(strategyOptions);
            } else {
                stock.analytical.stability = getRandomElement(stabilityOptions);
            }
        }
    });
}

function initializeHoldingPortfolios() {
    const holdingCompanies = stocks.filter(s => s.assetType === 'Holding');
    const regularStocks = stocks.filter(s => !s.assetType);

    holdingCompanies.forEach(holding => {
        let potentialTargets;
        if (holding.specializationFilter === 'stateOwned') {
            potentialTargets = regularStocks.filter(target => target.isStateOwned);
        } else {
            potentialTargets = regularStocks.filter(target =>
                target.sector && target.sector.some(sector => holding.specializationSectors.includes(sector))
            );
        }

        const numberOfInvestments = getRandomIntInRange(1, 3);

        for (let i = 0; i < numberOfInvestments; i++) {
            if (potentialTargets.length === 0) break;
            const targetIndex = Math.floor(Math.random() * potentialTargets.length);
            const targetStock = potentialTargets.splice(targetIndex, 1)[0];

            if (targetStock) {
                const quantity = getRandomIntInRange(1, 10);
                const cost = quantity * targetStock.price;
                const availableShares = getAvailableShares(targetStock);

                if (quantity <= availableShares && holding.cash >= cost) {
                    holding.cash -= cost;
                    // ZAPISUJEMY OBIEKT Z DANYMI, A NIE TYLKO LICZBĘ
                    const existing = holding.holdingPortfolio[targetStock.symbol];
                    holding.holdingPortfolio[targetStock.symbol] = existing
                        ? { quantity: existing.quantity + quantity, purchasePrice: (existing.purchasePrice * existing.quantity + cost) / (existing.quantity + quantity) }
                        : { quantity, purchasePrice: targetStock.price };
                    targetStock.sharesHeld += quantity;
                }
            }
        }
    });
    console.log("[SYSTEM] Zainicjalizowano portfele startowe dla spółek finansowych.");
}
function initializeCityCompanies() {
    // 1. Wyczyść stare dane
    municipalCompanies = [];
    privateCompanies = [];
    
    // 2. Stwórz spółki miejskie
   const municipalNames = [
        { name: "Oczyszczalnia Ścieków 'Woda Czysta'", type: 'Usługi', budget: 50000 },
        { name: "Drogi i Zieleń Miejska", type: 'Przemysł', budget: 30000 },
        { name: "Sortownia Odpadów 'EkoGdańsk'", type: 'Usługi', budget: 40000 },
        { name: "Elektrociepłownia Miejska", type: 'Energia', budget: 150000 },
        { name: "Stadion Miejski", type: 'Turystyka', budget: 10000 },
        { name: "Szpital Miejski", type: 'Medycyna', budget: 80000 },
        { name: "Dom Kultury", type: 'Usługi', budget: 5000 },
        { name: "Wodociągi Miejskie", type: 'Usługi', budget: 60000 }
    ];

    municipalNames.forEach(comp => {
        municipalCompanies.push({
            id: `mun_${comp.name.substring(0, 3).toUpperCase()}`,
            name: comp.name,
            type: comp.type,
            budget: comp.budget,
            baseIncome: comp.budget * 0.1
        });
    });

    // 3. Stwórz firmy prywatne
    const fpf = stocks.find(s => s.symbol === 'FPF'); // Znajdź Fundację
    for (let i = 0; i < 5; i++) { // Stwórz 5 firm prywatnych na start
        const newPrivateCompany = {
            id: `priv_${Date.now() + i}`,
            name: `Prywatna Inicjatywa #${i + 1}`, // TODO: Lepszy generator nazw
            value: getRandomIntInRange(10000, 50000),
            developmentProgress: 0,
            cityOwnership: getRandomInRange(0.01, 0.99) // Udział Fundacji (miasta)
        };
        privateCompanies.push(newPrivateCompany);
        
        // Fundacja przejmuje udziały
        if (fpf && fpf.holdingPortfolio) {
            // Symulujemy udziały jako specjalny wpis w portfolio holdingu
            fpf.holdingPortfolio[newPrivateCompany.id] = {
                quantity: newPrivateCompany.cityOwnership * 100, // Zapiszemy procent jako "ilość"
                purchasePrice: newPrivateCompany.value / 100 // Zapiszemy wartość 1%
            };
        }
    }
    console.log("[MIASTO] Zainicjowano spółki miejskie i firmy prywatne.");
}

function updateHoldingCompanies() {
    const holdingCompanies = stocks.filter(s => s.assetType === 'Holding');

    holdingCompanies.forEach(holding => {
        if (Math.random() < 0.05) { 
            runHoldingCompanyAI(holding);
        }

        let portfolioValue = 0;
        for (const symbol in holding.holdingPortfolio) {
            const ownedStock = stocks.find(s => s.symbol === symbol);
            const holdingData = holding.holdingPortfolio[symbol]; // Pobieramy cały obiekt
            if (ownedStock && holdingData) {
                portfolioValue += ownedStock.price * holdingData.quantity; // Mnożymy przez .quantity
            }
        }

        const totalAssetValue = holding.cash + portfolioValue;

        if (holding.totalShares > 0) {
            const navPerShare = totalAssetValue / holding.totalShares;
           holding.price = Math.max(0.01, (holding.price * 0.5) + (navPerShare * 0.5)); 
        // Możesz eksperymentować z proporcjami, np. 0.6 + 0.4 dla wolniejszych zmian
        }

        // Logika aktualizacji wykresów (pozostaje bez zmian)
        const now = Date.now();
        if (!holding.currentCandle || !holding.candlestickHistory) {
            holding.candlestickHistory = [];
            holding.lineHistory = [];
            holding.currentCandle = { time: now, open: holding.price, high: holding.price, low: holding.price, close: holding.price };
        }

        holding.lineHistory.push({ time: now, price: holding.price });
        if (holding.lineHistory.length > (15 * 60)) {
            holding.lineHistory.shift();
        }

        const candle = holding.currentCandle;
        candle.close = holding.price;
        if (holding.price > candle.high) candle.high = holding.price;
        if (holding.price < candle.low) candle.low = holding.price;

        if (now - candle.time >= CANDLE_INTERVAL) {
            holding.candlestickHistory.push(candle);
            if (holding.candlestickHistory.length > (15 * 4)) {
                holding.candlestickHistory.shift();
            }
            holding.currentCandle = { time: now, open: holding.price, high: holding.price, low: holding.price, close: holding.price };
        }
    });
}

    function updateCorporatePhase(stock) {
    // Pomiń typy specjalne i bankrutów
    if (stock.assetType || stock.isBankStock || stock.isBankrupt) return;

    stock.companyAge++; // Firma starzeje się o kwartał

    // Obsługa faz tymczasowych (Złoty Rok, Zejście w Cień, Impuls Innowacji)
    if (stock.phaseTimer && stock.phaseTimer > 0) {
        stock.phaseTimer--; // Odliczanie czasu trwania fazy
        if (stock.phaseTimer <= 0) {
            // Faza tymczasowa się skończyła, wróć do fazy bazowej
            const previousPhase = stock.previousPhase || CORPORATE_PHASES.STABILITY; // Wróć do poprzedniej lub domyślnej
            logEvent(`⏳ Faza "${stock.corporatePhase}" dla ${stock.name} dobiegła końca. Powrót do fazy "${previousPhase}".`);
            stock.corporatePhase = previousPhase;
            stock.previousPhase = null; // Wyczyść zapamiętaną fazę
            // Tutaj można dodać jednorazowy efekt po zakończeniu fazy, np. lekka korekta ceny
        }
        return; // Jeśli jesteśmy w fazie tymczasowej, nie zmieniamy jej jeszcze
    }

    const currentPhase = stock.corporatePhase;
    const health = stock.financialHealth;
    const age = stock.companyAge;
    let nextPhase = currentPhase; // Domyślnie zostajemy w tej samej fazie
    let transitionReason = ""; // Opis powodu zmiany

    // Sprawdzenie szansy na unikalne fazy (przed standardowymi przejściami)
    const uniquePhaseRoll = Math.random();
    if (uniquePhaseRoll < 0.02 && (currentPhase === CORPORATE_PHASES.GROWTH || currentPhase === CORPORATE_PHASES.STABILITY || currentPhase === CORPORATE_PHASES.REORGANIZATION)) {
        // 2% szansy na Złoty Rok
        nextPhase = CORPORATE_PHASES.GOLDEN_YEAR;
        stock.phaseTimer = 4; // Faza trwa 4 kwartały (1 rok)
        transitionReason = "niespodziewanego okresu prosperity";
    } else if (uniquePhaseRoll < 0.04 && (currentPhase === CORPORATE_PHASES.DECLINE || currentPhase === CORPORATE_PHASES.REORGANIZATION)) {
        // 2% szansy na Zejście w Cień (jeśli już jest źle)
        nextPhase = CORPORATE_PHASES.SHADOW_DESCENT;
        stock.phaseTimer = getRandomIntInRange(3, 6); // Faza trwa 3-6 kwartałów
        transitionReason = "pogłębiającego się kryzysu";
    } else if (uniquePhaseRoll < 0.07 && (currentPhase === CORPORATE_PHASES.GROWTH || currentPhase === CORPORATE_PHASES.REORGANIZATION)) {
        // 3% szansy na Impuls Innowacji (szczególnie w fazie wzrostu lub reorganizacji)
        nextPhase = CORPORATE_PHASES.INNOVATION_PUSH;
        stock.phaseTimer = getRandomIntInRange(4, 8); // Faza trwa 4-8 kwartałów
        transitionReason = "skupienia na badaniach i rozwoju";
    }

    // Jeśli nie wylosowano fazy unikalnej, sprawdź standardowe przejścia
    if (nextPhase === currentPhase) {
        switch (currentPhase) {
            case CORPORATE_PHASES.GROWTH:
                if (health <= 0 || age > 20) { // Słabe wyniki lub starzenie się
                    nextPhase = CORPORATE_PHASES.STABILITY;
                    transitionReason = health <= 0 ? "spowolnienia rozwoju" : "osiągnięcia dojrzałości";
                } else if (health < -2) { // Nagłe załamanie
                    nextPhase = CORPORATE_PHASES.DECLINE;
                    transitionReason = "gwałtownego pogorszenia wyników";
                }
                break;
            case CORPORATE_PHASES.STABILITY:
                if (health >= 3 && age < 30 && Math.random() < 0.1) { // Dobre wyniki i młody wiek - szansa na powrót do wzrostu
                    nextPhase = CORPORATE_PHASES.GROWTH;
                    transitionReason = "nowego impulsu rozwojowego";
                } else if (health < -1) { // Pogorszenie wyników
                    nextPhase = CORPORATE_PHASES.DECLINE;
                    transitionReason = "pogarszającej się rentowności";
                } else if (health <= 1 && age > 40 && Math.random() < 0.05) { // Starzenie się i przeciętne wyniki
                     nextPhase = CORPORATE_PHASES.DECLINE;
                     transitionReason = "utraty konkurencyjności";
                }
                break;
            case CORPORATE_PHASES.DECLINE:
                if (health <= -5) { // Bardzo źle - ryzyko bankructwa (obsługiwane w processFinancialReports)
                    // Pozostaje w Decline, ale może wejść w Reorganizację po evencie ratunkowym
                } else if (health >= 0 && Math.random() < 0.2) { // Lekka poprawa - szansa na Reorganizację
                    nextPhase = CORPORATE_PHASES.REORGANIZATION;
                    transitionReason = "próby restrukturyzacji";
                }
                break;
            case CORPORATE_PHASES.REORGANIZATION:
                if (health >= 2) { // Udana reorganizacja
                    nextPhase = CORPORATE_PHASES.STABILITY;
                    transitionReason = "udanej restrukturyzacji i stabilizacji";
                } else if (health < -3) { // Porażka reorganizacji
                    nextPhase = CORPORATE_PHASES.DECLINE;
                    transitionReason = "niepowodzenia planu naprawczego";
                }
                // Jeśli health jest neutralne, pozostaje w Reorganization
                break;
        }
    }

    // Zastosuj zmianę fazy, jeśli nastąpiła
    if (nextPhase !== currentPhase) {
        // Zapisz poprzednią fazę bazową, jeśli wchodzimy w fazę tymczasową
        if (stock.phaseTimer > 0 && currentPhase !== CORPORATE_PHASES.GOLDEN_YEAR && currentPhase !== CORPORATE_PHASES.SHADOW_DESCENT && currentPhase !== CORPORATE_PHASES.INNOVATION_PUSH) {
            stock.previousPhase = currentPhase;
        } else if (stock.phaseTimer === 0) { // Wychodzimy z fazy tymczasowej lub normalna zmiana
             stock.previousPhase = null;
        }

        stock.corporatePhase = nextPhase;
        logEvent(`🏢 Spółka ${stock.name} wchodzi w fazę "${nextPhase}" z powodu ${transitionReason}.`, 'company');

        // Można dodać jednorazowy efekt przy zmianie fazy, np. mały boost/spadek ceny
        if (nextPhase === CORPORATE_PHASES.GROWTH) applyPriceEffect(stock.symbol, 0.02, 'positive');
        else if (nextPhase === CORPORATE_PHASES.DECLINE) applyPriceEffect(stock.symbol, -0.03, 'negative');
        else if (nextPhase === CORPORATE_PHASES.GOLDEN_YEAR) applyPriceEffect(stock.symbol, 0.05, 'positive');
        else if (nextPhase === CORPORATE_PHASES.SHADOW_DESCENT) applyPriceEffect(stock.symbol, -0.04, 'negative');
    }
}

/**
 * Spółka próbuje osłabić pozycję dominującego udziałowca z negatywną reputacją.
 * @param {object} stock - Obiekt spółki.
 * @param {string} dominantEntityId - ID gracza lub AI, którego pozycję trzeba osłabić.
 */
function triggerCompanyCounterAction(stock, dominantEntityId) {
    const sharesToIssue = Math.floor(stock.totalShares * 0.05); // Emisja 5% nowych akcji
    const discountPrice = stock.price * (1 - getRandomInRange(0.10, 0.20)); // Cena ze zniżką 10-20%

    logEvent(`🚨 ${stock.name} próbuje osłabić Twoją dominację, emitując ${sharesToIssue} nowych akcji ze zniżką dla konkurencji!`, 'review');

    // Zwiększamy pule akcji
    stock.totalShares += sharesToIssue;
    stock.maxShares += sharesToIssue;
    
    // Logika oferowania akcji konkurencji (w tym przypadku botom)
    const potentialBuyers = aiCompetitors.filter(ai => ai.id !== dominantEntityId);
    let sharesSold = 0;

    potentialBuyers.forEach(ai => {
        const sharesToOffer = Math.floor(sharesToIssue / potentialBuyers.length);
        const cost = sharesToOffer * discountPrice;

        let acceptanceChance = 0.2; // Bazowa szansa
        if (ai.cash > cost * 2) acceptanceChance += 0.3;
        if (ai.portfolio[stock.symbol]) acceptanceChance += 0.4; // Chętniej dokupią, jeśli już mają

        if (Math.random() < acceptanceChance) {
            aiBuyStock(ai, stock.symbol, sharesToOffer);
            sharesSold += sharesToOffer;
        }
    });
    
    if (sharesSold > 0) {
        logEvent(`Konkurencja nabyła ${sharesSold} akcji ${stock.name} po obniżonej cenie.`);
    }
}

function checkCompanyCounterActions() {
    stocks.forEach(stock => {
        if (stock.assetType === 'Startup' || stock.isBankrupt) return;

        for (const entityId in stock.reputation) {
            const rep = stock.reputation[entityId];
            
            // Sprawdź, czy reputacja jest negatywna
            if (rep < REPUTATION_LEVELS.NEGATIVE) {
                let holding;
                if (entityId === 'player') {
                    holding = playerPortfolio[stock.symbol];
                } else {
                    const ai = aiCompetitors.find(a => a.id === entityId);
                    holding = ai?.portfolio[stock.symbol];
                }
                
                // Sprawdź, czy dana jednostka ma ponad 50% udziałów
                if (holding && (holding.shares / stock.totalShares) > 0.5) {
                    
                    // Uruchom akcję z 25% szansą w każdym cyklu
                    if (Math.random() < 0.25) {
                        triggerCompanyCounterAction(stock, entityId);
                    }
                    return; // Tylko jedna akcja na spółkę na cykl
                }
            }
        }
    });
}

function detectFinancialAnomaly(stock) {
    const anomalyReportElement = document.getElementById('financial-anomaly-report');
    if (!anomalyReportElement) return; // Upewnij się, że element istnieje
    anomalyReportElement.innerHTML = ''; // Wyczyść poprzedni raport

    // SCALONO: Zmieniono 'accountant' na 'financialAnalyst' (pasując do Twojej definicji umiejętności)
    // Zakładam, że chcesz to podpiąć pod 'financialAnalyst' lub dodać 'accountant' do obiektu 'skills'
    // Na razie używam 'financialAnalyst'
    if (getSkillLevel('financialAnalyst') < 3 || Math.random() > 0.15) {
        // Nie wykryto anomalii (lub brak umiejętności)
        return;
    }

    // Wykryto anomalię!
    if (Math.random() < 0.5) {
        // ANOMALIA NEGATYWNA (np. ukryte koszty, ryzyko kary)
        const possibleNegativeOutcomes = [
            { text: "Wykryto nieprawidłowości w rozliczeniach! Może to prowadzić do drobnej kary finansowej.", effect: () => { stock.financialHealth -= 0.2; applyPriceEffect(stock.symbol, -0.01, 'negative'); } },
            { text: "Znaleziono dowody na nieefektywne zarządzanie zapasami. Wpłynie to negatywnie na najbliższe wyniki.", effect: () => { stock.financialHealth -= 0.1; } },
            { text: "Twoja analiza wskazuje na potencjalne ryzyko sporu prawnego, co niepokoi rynek.", effect: () => { applyPriceEffect(stock.symbol, -0.02, 'negative'); } }
        ];
        const outcome = getRandomElement(possibleNegativeOutcomes);
        anomalyReportElement.innerHTML = `<span class="text-down">🚨 Wykryto Anomalię! ${outcome.text}</span>`;
        logEvent(`[Księgowy] Wykryto negatywną anomalię w finansach ${stock.name}!`, 'review');
        outcome.effect(); // Zastosuj negatywny efekt
        showToast(`Wykryto anomalię w ${stock.name}!`, 'warning');

    } else {
        // ANOMALIA POZYTYWNA (np. niedoszacowane aktywa, potencjał oszczędności)
        const possiblePositiveOutcomes = [
            { text: "Odkryto niedoszacowane aktywa w bilansie! Spółka może być warta więcej niż sądzono.", effect: () => { applyPriceEffect(stock.symbol, 0.015, 'positive'); } },
            { text: "Twoja analiza wskazuje na możliwość znacznych oszczędności kosztów operacyjnych.", effect: () => { stock.financialHealth += 0.15; } },
            { text: "Zidentyfikowano potencjalne źródło dodatkowych przychodów, wcześniej pomijane przez zarząd.", effect: () => { stock.financialHealth += 0.1; applyPriceEffect(stock.symbol, 0.01, 'positive'); } }
        ];
        const outcome = getRandomElement(possiblePositiveOutcomes);
        anomalyReportElement.innerHTML = `<span class="text-up">💡 Wykryto Potencjał! ${outcome.text}</span>`;
        logEvent(`[Księgowy] Wykryto pozytywną anomalię (potencjał) w finansach ${stock.name}!`, 'review');
        outcome.effect(); // Zastosuj pozytywny efekt
        showToast(`Wykryto potencjał w ${stock.name}!`, 'success');
    }
    // Po zastosowaniu efektu, odśwież modal finansowy, aby pokazać ewentualne zmiany
    openFinancialDetailsModal(stock.symbol);
}

// setDividendPolicy: zob. player.js (jedna implementacja).

function executeForcedDividend(stock) {
    if (Date.now() < stock.dividendCooldownUntil) {
        return false; // Nie można jeszcze wymusić dywidendy
    }

    // Specjalna dywidenda: do 4% kapitalizacji, ale tylko z gotówki spółki.
    const dividendTotalAmount = Math.min((stock.price * stock.totalShares) * 0.04, Math.max(0, Number(stock.cash) || 0) * 0.8);
    if (!(dividendTotalAmount > 0)) return false;

    payCompanyDividend(stock, dividendTotalAmount / stock.totalShares, 'Dywidenda specjalna');

    // Ustawiamy cooldown
    stock.dividendCooldownUntil = Date.now() + (BASE_DELAYS.quarterly / 2); // Cooldown na pół kwartału
    
    // Zmniejszamy kondycję finansową, bo to obciąża firmę
    stock.financialHealth -= 0.5;

    return true; // Sukces
}

function forceDividend(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    if (executeForcedDividend(stock)) {
        logEvent(`👑 Na Twój wniosek, zarząd ${stock.name} wypłaca specjalną dywidendę!`, 'review');
        showToast("Dywidenda została wypłacona!", 'success');

        // --- POCZĄTEK POPRAWKI: Uwzględnienie Charyzmy Lvl 1 i 4 ---
        // Działanie gracza (wymuszenie dywidendy) ma mniejszy negatywny skutek dla reputacji
        let repLoss = -15;
        // SCALONO: (Używamy 'charisma' jak w definicji umiejętności)
        const charismaLevel = getSkillLevel('charisma');

        if (charismaLevel >= 4) {
            repLoss *= 0.50; // Lvl 4: 50% redukcji
        } else if (charismaLevel >= 1) {
            repLoss *= 0.85; // Lvl 1-3: 15% redukcji
        }
        changeReputation('player', symbol, repLoss);
        // --- KONIEC POPRAWKI ---
        onPlayerForcedDividend(stock); // relacje z botami-akcjonariuszami (relations.js)

        openManagementModal(symbol); // Odśwież widok modala
    } else {
        showToast("Nie można jeszcze zażądać kolejnej dywidendy.", 'warning');
    }
}

/**
 * Inicjuje proces fuzji lub przejęcia między dwoma spółkami.
 * @param {object} initiatorStock - Spółka inicjująca proces.
 * @param {object} targetStock - Spółka będąca celem procesu.
 * @param {'fuzja' | 'przejęcie'} type - Typ procesu M&A.
 * @param {string} financing - Metoda finansowania ('cash', 'stockSwap', 'lbo').
 * @param {number} [offerPremium=0.25] - Premia oferowana ponad cenę rynkową (tylko dla 'przejęcie').
 */
function initiateMergerProcess(initiatorStock, targetStock, type, financing = 'cash', offerPremium = 0.25, options = {}) {
    // Walidacje
    if (!initiatorStock || !targetStock || initiatorStock === targetStock) {
        console.error("[M&A Init] Błąd: Nieprawidłowe spółki.");
        return false;
    }
    if (initiatorStock.mergerProcess || targetStock.mergerProcess) {
        showToast("Anulowano: Jedna ze spółek jest już w trakcie innego procesu M&A.", 'warning');
        return false;
    }
    if (targetStock.isSubsidiaryOf) {
        showToast("Anulowano: Nie można przejąć spółki zależnej.", 'warning');
        return false;
    }
    if (targetStock.isBankrupt || initiatorStock.isBankrupt) {
        showToast("Anulowano: Nie można przeprowadzać operacji na bankrutach.", 'warning');
        return false;
    }

    // Walidacja finansowania
    let buyoutPricePerShare = 0;
    let totalCost = 0;

    if (type === 'przejęcie') {
        buyoutPricePerShare = targetStock.price * (1 + offerPremium);
        totalCost = buyoutPricePerShare * targetStock.totalShares;
        if (financing === 'cash' && initiatorStock.cash < totalCost) {
            showToast(`Anulowano: ${initiatorStock.name} nie ma wystarczająco gotówki (${totalCost.toFixed(0)} PLN) na przejęcie.`, 'error');
            return false;
        }
        if (financing === 'lbo') {
            const lbo = validateLbo(initiatorStock, targetStock, totalCost);
            if (!lbo.ok) {
                showToast(`Anulowano wykup lewarowany: ${lbo.reason}.`, 'error');
                return false;
            }
        }
    }

    console.log(`[M&A Init] Rozpoczęto proces: ${initiatorStock.symbol} -> ${targetStock.symbol} (Typ: ${type})`);

    const processData = {
        type: type,
        stage: 1,
        progress: 0,
        partnerSymbol: targetStock.symbol,
        initiatorSymbol: initiatorStock.symbol,
        complications: 0,
        costs: 0,
        statusMessage: `Etap 1: Wstępne rozmowy (${type})...`,
        decisionRequired: null,
        defenseActive: null,
        financing: financing,
        offerDetails: { // Zapisujemy szczegóły oferty
            premium: offerPremium,
            buyoutPricePerShare: buyoutPricePerShare,
            totalCost: totalCost
            // Dla fuzji można tu zapisać 'exchangeRatio'
        }
    };

    // Ustaw obiekt procesu w obu spółkach
    initiatorStock.mergerProcess = { ...processData };
    targetStock.mergerProcess = { ...processData, partnerSymbol: initiatorStock.symbol };

    logEvent(`🤝 Rozpoczynają się rozmowy o ${type} między ${initiatorStock.name} a ${targetStock.name}!`, 'market');
    showToast(`Rozpoczęto rozmowy o ${type} ${initiatorStock.symbol} z ${targetStock.symbol}!`, 'default');

    // Obrony, decyzja funduszu (≥ 20%), zarząd (ma.js)
    if (type === 'przejęcie') onTakeoverStarted(initiatorStock, targetStock, options);

    displayStocks(getCurrentInputValues());
    return true;
}

function triggerMergerMiniEvent(stock1, stock2, process) {
    const isPositive = Math.random() < 0.5; // 50% szans na pozytywny event

    if (isPositive) {
        // --- Ukryte Złoto ---
        const effects = [
            { desc: "odkryto nieoczekiwane synergie operacyjne!", costChange: -500, progressChange: 5, healthChange: 0.1 },
            { desc: "znaleziono sposób na optymalizację podatkową połączonej firmy!", costChange: -1000, progressChange: 0, healthChange: 0.05 },
            { desc: "kluczowy pracownik konkurencji przechodzi do jednej ze spółek!", costChange: 0, progressChange: 0, healthChange: 0.15 }
        ];
        const effect = getRandomElement(effects);
        process.costs = Math.max(0, process.costs + effect.costChange);
        process.progress += effect.progressChange;
        stock1.financialHealth += effect.healthChange;
        stock2.financialHealth += effect.healthChange;
        process.statusMessage = `✨ Ukryte złoto: ${effect.desc}`;
        logEvent(`[M&A] ✨ ${stock1.symbol} <-> ${stock2.symbol}: ${effect.desc}`, 'review');
    } else {
        // --- Trup w Szafie ---
        const effects = [
            { desc: "ujawniono nieznane wcześniej zobowiązania jednej ze spółek!", costChange: 1500, progressChange: -5, healthChange: -0.1 },
            { desc: "kluczowi menedżerowie ogłaszają odejście w proteście przeciw fuzji!", costChange: 500, progressChange: -10, healthChange: -0.05 },
            { desc: "pojawiają się problemy z integracją systemów IT!", costChange: 800, progressChange: -8, healthChange: 0 }
        ];
        const effect = getRandomElement(effects);
        process.costs += effect.costChange;
        process.progress = Math.max(0, process.progress + effect.progressChange);
        stock1.financialHealth += effect.healthChange;
        stock2.financialHealth += effect.healthChange;
        process.statusMessage = `💀 Trup w szafie: ${effect.desc}`;
        logEvent(`[M&A] 💀 ${stock1.symbol} <-> ${stock2.symbol}: ${effect.desc}`, 'review');
    }
    // Aktualizuj proces w obu spółkach (bo 'process' to referencja do obiektu jednej z nich)
    const partner = stock1.symbol === process.initiatorSymbol ? stock2 : stock1;
    if (partner.mergerProcess) {
        Object.assign(partner.mergerProcess, process); // Nadpisz dane w procesie partnera
    }
}

function checkAntitrust(stock1, stock2) {
    // 1. Sprawdź, czy urząd w ogóle analizuje tę sprawę
    if (Math.random() > antitrustOffice.analysisCapacity) {
        console.log(`[Antymonopol] Urząd nie zainteresował się fuzją ${stock1.symbol} i ${stock2.symbol}.`);
        return false; // Urząd nie podjął analizy
    }

    console.log(`[Antymonopol] Urząd analizuje potencjalną fuzję ${stock1.symbol} i ${stock2.symbol}...`);
    logEvent(`⚖️ Urząd Antymonopolowy przygląda się planom połączenia ${stock1.name} i ${stock2.name}...`, 'state');

    // 2. Oblicz potencjalny udział rynkowy połączonej firmy (uproszczony)
    const combinedMarketCap = (stock1.price * stock1.totalShares) + (stock2.price * stock2.totalShares);
    const commonSectors = stock1.sector.filter(s => stock2.sector.includes(s)); // Znajdź wspólne sektory
    let potentialMarketShare = 0;

    if (commonSectors.length > 0) {
        // Oblicz całkowitą kapitalizację we wspólnym sektorze (głównym)
        const sector = commonSectors[0];
        const sectorTotalMarketCap = stocks
            .filter(s => !s.assetType && !s.isBankrupt && s.sector.includes(sector))
            .reduce((sum, s) => sum + (s.price * s.totalShares), 0);

        if (sectorTotalMarketCap > 0) {
            potentialMarketShare = combinedMarketCap / sectorTotalMarketCap;
        }
    } else {
        // Jeśli brak wspólnych sektorów (fuzja konglomeratowa), ryzyko monopolu jest niskie
        potentialMarketShare = 0.1; // Przykładowo niskie ryzyko
    }

    // 3. Określ próg blokady (np. 40% udziału w rynku)
    const blockThreshold = 0.40;
    const shouldBlock = potentialMarketShare >= blockThreshold;

    // 4. Losuj decyzję urzędu (uwzględniając jego dokładność)
    let blockDecision = false;
    if (shouldBlock) {
        // Jeśli udział przekracza próg, jest szansa na blokadę (zależna od accuracy)
        blockDecision = Math.random() < antitrustOffice.accuracy;
    } else {
        // Jeśli udział jest niski, jest mała szansa na BŁĘDNĄ blokadę (1 - accuracy)
        blockDecision = Math.random() < (1 - antitrustOffice.accuracy) * 0.1; // Mała szansa na błąd
    }

    // 5. Zastosuj i zwróć decyzję
    if (blockDecision) {
        logEvent(`⚖️ BLOKADA! Urząd Antymonopolowy blokuje połączenie ${stock1.name} i ${stock2.name} z powodu ryzyka monopolu!`, 'state');
        showToast(`Urząd Antymonopolowy zablokował fuzję ${stock1.symbol}-${stock2.symbol}!`, 'error');
        // TODO: Opcjonalnie: Można nałożyć karę finansową na inicjatora
        return true; // Fuzja zablokowana
    } else {
        console.log(`[Antymonopol] Urząd zezwolił na połączenie ${stock1.symbol} i ${stock2.symbol}.`);
        logEvent(`⚖️ Urząd Antymonopolowy nie widzi przeciwwskazań dla połączenia ${stock1.name} i ${stock2.name}.`, 'state');
        return false; // Fuzja dozwolona
    }
}

// operacje bankowe

function runDebtCollectorAI() {
    const collectors = stocks.filter(s => s.assetType === 'DebtCollector' && !s.isBankrupt && s.cash > 20000); // Musi mieć gotówkę
    if (collectors.length === 0) return;

    // Zbierz wszystkie potencjalne długi (tylko bankowe z problemami)
    const potentialDebts = [];
    
    // Długi AI
    aiCompetitors.forEach(ai => {
        if (ai.loans) {
            ai.loans.forEach(loan => {
                if (loan.bankId && (loan.missedPayments || 0) > 0) {
                    potentialDebts.push({ entity: ai, loan: loan });
                }
            });
        }
    });

    if (potentialDebts.length === 0) return; // Brak długów do przejęcia

    // Każdy windykator próbuje złożyć jedną ofertę
    collectors.forEach(collector => {
        // Niska szansa na działanie w każdym cyklu
        if (Math.random() < 0.1) { 
            const targetDebtInfo = getRandomElement(potentialDebts);
            const loan = targetDebtInfo.loan;

            // Sprawdź, czy oferta nie była niedawno składana
            const now = Date.now();
            if (loan.offerCooldown && now < loan.offerCooldown) {
                return; // Pomiń, ten dług jest na cooldownie
            }

            // Sprawdź, czy windykatora stać
            if (collector.cash >= loan.amount) {
                createDebtTakeoverOffer(collector, targetDebtInfo.entity, loan);
            }
        }
    });
}

function createDebtTakeoverOffer(collectorStock, targetEntity, loan) {
    const newInterestRate = loan.interestRate * 1.5; // Przykładowo: 50% wyższe oprocentowanie
    const offerCooldownTime = BASE_DELAYS.quarterly / currentSpeedMultiplier; // Cooldown na kwartał

    loan.offerCooldown = Date.now() + offerCooldownTime; // Ustaw cooldown, aby nie spamować

    if (targetEntity === 'player') return; // gracz nie ma prywatnych kredytów (fundusz: finance.js)
    aiDecideOnDebtOffer(targetEntity, collectorStock, loan, newInterestRate);
}

function runPawnShopAI() {
    const pawnShops = stocks.filter(s => s.assetType === 'PawnShop' && !s.isBankrupt && s.cash > 50000); // Musi mieć gotówkę na pożyczki
    if (pawnShops.length === 0) return;

    // Zbierz potencjalnych klientów (Gracz i AI, którzy mają kłopoty LUB cenne akcje)
    const potentialClients = [];
    
    // Klienci: tylko boty (zastaw funduszu gracza: finance.js)
    aiCompetitors.forEach(ai => {
        const aiNetWorth = calculateNetWorth(ai);
        const aiCashRatio = ai.cash / aiNetWorth;
        const aiHasDebt = ai.loans && ai.loans.some(l => (l.missedPayments || 0) > 0);
        if (aiHasDebt || aiCashRatio < 0.03) { // prawdziwe zaległości lub brak gotówki
            for (const symbol in ai.portfolio) {
                const holding = ai.portfolio[symbol];
                if (holding.shares > 0 && !holding.assetType && !holding.lockedShares) {
                    const stock = stocks.find(s => s.symbol === symbol);
                    if (stock && stock.price * holding.shares > 1000) {
                        potentialClients.push({ entity: ai, stockToPawn: stock, holding: holding });
                        break; 
                    }
                }
            }
        }
    });

    if (potentialClients.length === 0) return; // Brak celów

    // Każdy lombard składa jedną ofertę
    pawnShops.forEach(pawnShop => {
        if (Math.random() < 0.05) { // Niska szansa (5%) na ofertę w tygodniu
            const targetClient = getRandomElement(potentialClients);
            const loanAmount = (targetClient.stockToPawn.price * targetClient.holding.shares) * 0.4; // Pożyczka 40% wartości akcji
            
            if (pawnShop.cash >= loanAmount) {
                createPawnLoanOffer(pawnShop, targetClient.entity, targetClient.stockToPawn, targetClient.holding, loanAmount);
            }
        }
    });
}

function createPawnLoanOffer(pawnShop, targetEntity, stockToPawn, holding, loanAmount) {
    // Lombardy mają bardzo wysokie oprocentowanie
    const newInterestRate = 0.25; // 25% rocznie (stałe)
    const durationWeeks = 12; // 12 tygodni (kwartał) na spłatę

    // Zastawiamy wszystkie posiadane akcje danej spółki (uproszczenie)
    const quantity = holding.shares;
    
    // Ustaw cooldown na ofercie dla tej konkretnej spółki w portfelu
    const now = Date.now();
    const offerCooldownTime = BASE_DELAYS.quarterly / currentSpeedMultiplier;
    // Potrzebujemy miejsca do zapisania cooldownu - użyjmy obiektu stockToPawn
    if (!stockToPawn.pawnOfferCooldown) stockToPawn.pawnOfferCooldown = {};
    const entityId = (targetEntity === 'player') ? 'player' : targetEntity.id;
    
    if (stockToPawn.pawnOfferCooldown[entityId] && now < stockToPawn.pawnOfferCooldown[entityId]) {
        return; // Pomiń, ten cel jest na cooldownie
    }
    stockToPawn.pawnOfferCooldown[entityId] = now + offerCooldownTime;


    if (targetEntity === 'player') return;
    aiDecideOnPawnOffer(targetEntity, pawnShop, stockToPawn, quantity, loanAmount, newInterestRate, durationWeeks);
}

/**
 * Rozpoczyna aukcję na akcje przejęte z niespłaconej hipoteki.
 * @param {string} originalOwnerId - Kto stracił akcje ('player' lub ID bota)
 * @param {string} symbol - Symbol licytowanych akcji.
 * @param {number} quantity - Liczba akcji na aukcji.
 */
function startCollateralAuction(originalOwnerId, symbol, quantity) {
    if (currentCollateralAuction) return; // Już trwa inna aukcja

    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const auctionDurationMinutes = 3;
    const auctionEndTime = Date.now() + (auctionDurationMinutes * 60 * 1000 / currentSpeedMultiplier);
    const minPrice = stock.price * 0.7; // Cena minimalna 70% wartości rynkowej

    currentCollateralAuction = {
        stockSymbol: symbol,
        quantityAvailable: quantity,
        minPrice: minPrice,
        endTime: auctionEndTime,
        bids: [] // { bidderId, quantity, price }
    };

    // Usuń akcje z portfela dłużnika
    if (originalOwnerId === 'player') {
        if (playerPortfolio[symbol]) {
            // SCALONO: Sprawdzamy 'lockedShares' i odejmujemy od nich, a potem od zwykłych akcji
            const holding = playerPortfolio[symbol];
            if (holding.lockedShares >= quantity) {
                holding.lockedShares -= quantity;
            } else {
                const remainingToSeize = quantity - (holding.lockedShares || 0);
                holding.lockedShares = 0;
                holding.shares -= remainingToSeize; // Odejmij resztę z wolnych akcji
            }
            if (holding.shares <= 0) delete playerPortfolio[symbol];
            if (typeof notePlayerPositionLoss === 'function') notePlayerPositionLoss(symbol, quantity, 'licytacja akcji z zastawu (niespłacona pożyczka)');
        }
    } else {
        const ai = aiCompetitors.find(a => a.id === originalOwnerId);
        if (ai && ai.portfolio[symbol]) {
             // SCALONO: Logika 'lockedShares' dla AI
             const holding = ai.portfolio[symbol];
             if (holding.lockedShares >= quantity) {
                holding.lockedShares -= quantity;
             } else {
                const remainingToSeize = quantity - (holding.lockedShares || 0);
                holding.lockedShares = 0;
                holding.shares -= remainingToSeize;
             }
             if (ai.portfolio[symbol].shares <= 0) delete ai.portfolio[symbol];
        }
    }
    // UWAGA: Te akcje formalnie "znikają" na czas aukcji. Zostaną dodane do zwycięzcy.

    logEvent(` AUKCJA AKCJI! ${quantity} szt. ${symbol} trafia na licytację (cena min. ${minPrice.toFixed(2)} PLN). Aukcja trwa ${auctionDurationMinutes} min.`, 'warning');
    showToast(` AUKCJA AKCJI ${symbol}! Sprawdź Bank Centralny.`, 'warning', 10000);

    // Zaplanuj rozstrzygnięcie
    const delay = auctionEndTime - Date.now();
    // SCALONO: Twoja wersja miała 'setTimeout', ale w 'main.js' jest pętla sprawdzająca.
    // Usuwam 'setTimeout', aby polegać na pętli z 'main.js' (która sprawdza `currentCollateralAuction.endTime`)
    // setTimeout(resolveCollateralAuction, delay); 

    if (document.getElementById('bank-modal')?.style.display === 'block') openBankModal();
}

function placeCollateralBid(bidder, quantity, price) {
    if (!currentCollateralAuction || Date.now() > currentCollateralAuction.endTime) {
        if (bidder === 'player') showToast("Aukcja akcji nie jest aktywna.");
        return false;
    }
    if (isNaN(quantity) || quantity <= 0 || quantity > currentCollateralAuction.quantityAvailable ||
        isNaN(price) || price < currentCollateralAuction.minPrice) {
        if (bidder === 'player') showToast(`Wprowadź poprawną ilość (max ${currentCollateralAuction.quantityAvailable}) i cenę (min ${currentCollateralAuction.minPrice.toFixed(2)} PLN).`);
        return false;
    }

    const bidderId = (bidder === 'player') ? 'player' : bidder.id;
    const bidderCash = (bidder === 'player') ? playerCash : bidder.cash;
    const totalCost = quantity * price;

    if (bidderCash < totalCost) {
        if (bidder === 'player') showToast("Nie masz wystarczająco środków na złożenie tej oferty.");
        return false;
    }

    currentCollateralAuction.bids.push({ bidderId, quantity, price });

    if (bidder === 'player') {
        logEvent(`Złożono ofertę zakupu ${quantity} akcji ${currentCollateralAuction.stockSymbol} po ${price.toFixed(2)} PLN.`, 'review');
        showToast("Oferta na akcje złożona!", 'success');
        openBankModal();
    } else {
        console.log(`[AI] ${bidder.name} złożył ofertę na ${quantity} akcji ${currentCollateralAuction.stockSymbol} po ${price.toFixed(2)} PLN.`);
    }
    return true;
}

function resolveCollateralAuction() {
    if (!currentCollateralAuction) return;
    const { stockSymbol, bids } = currentCollateralAuction;
    let remainingQuantity = currentCollateralAuction.quantityAvailable;
    const stock = stocks.find(s => s.symbol === stockSymbol); // Potrzebne do aktualizacji portfela

    logEvent(`🔔 Aukcja akcji ${stockSymbol} zakończona! Rozpoczyna się alokacja.`, 'market');
    bids.sort((a, b) => b.price - a.price); // Najwyższa cena pierwsza

    for (const bid of bids) {
        if (remainingQuantity <= 0) break;
        const quantityToAllocate = Math.min(bid.quantity, remainingQuantity);
        const totalCost = quantityToAllocate * bid.price;

        let bidderObject = (bid.bidderId === 'player') ? 'player' : aiCompetitors.find(ai => ai.id === bid.bidderId);
        if (!bidderObject) continue;
        const bidderCash = (bidderObject === 'player') ? playerCash : bidderObject.cash;

        if (bidderCash >= totalCost) {
            // Pobierz kasę
            if (bidderObject === 'player') playerCash -= totalCost;
            else bidderObject.cash -= totalCost;

            // Dodaj akcje do portfela zwycięzcy
            const targetPortfolio = (bidderObject === 'player') ? playerPortfolio : bidderObject.portfolio;
            if (targetPortfolio[stockSymbol]) {
                const holding = targetPortfolio[stockSymbol];
                const oldVal = holding.avgPrice * holding.shares;
                holding.shares += quantityToAllocate;
                holding.avgPrice = (oldVal + totalCost) / holding.shares;
            } else {
                targetPortfolio[stockSymbol] = { shares: quantityToAllocate, avgPrice: bid.price };
            }

            remainingQuantity -= quantityToAllocate;

            // Informacje
            if (bid.bidderId === 'player') {
                logEvent(`✅ Wygrałeś ${quantityToAllocate} akcji ${stockSymbol} na aukcji po cenie ${bid.price.toFixed(2)} PLN!`, 'success');
                displayCash(); displayPortfolio();
            } else {
                console.log(`[AI] ${bidderObject.name} wygrał ${quantityToAllocate} akcji ${stockSymbol} po ${bid.price.toFixed(2)} PLN.`);
            }

            // Pieniądze z aukcji trafiają do banku hipotecznego (uproszczone - na razie do BC)
            centralBank.funds += totalCost;

        } else if (bid.bidderId === 'player') {
            logEvent(`⚠️ Twoja oferta na akcje ${stockSymbol} została odrzucona (brak środków)!`, 'error');
        }
    }
    
    // SCALONO: Logika dla niesprzedanych akcji (jeśli jakieś zostały)
    if (remainingQuantity > 0) {
        logEvent(`Aukcja ${stockSymbol} zakończona. ${remainingQuantity} akcji nie znalazło nabywcy i przepada.`);
        // Te akcje po prostu znikają z rynku (nie są dodawane do nikogo).
    }

    currentCollateralAuction = null;
    logEvent("Alokacja akcji z aukcji zakończona.", 'market');
    if (document.getElementById('bank-modal')?.style.display === 'block') openBankModal();
}

function issueRescueBond(stock) {
    // Oblicz, ile kapitału potrzeba (np. 30% obecnego długu)
    const capitalNeeded = stock.balanceSheet.liabilities * 0.3;
    if (capitalNeeded <= 0) return; // Nie emituj, jeśli nie ma długu lub potrzeba 0

    const faceValue = 1000;
    const quantityToIssue = Math.ceil(capitalNeeded / faceValue);
    if (quantityToIssue <= 0) return;

    // Wyższe oprocentowanie i ryzyko zależne od kondycji
    const baseInterest = 0.08; // Wyższa baza niż normalnie
    const healthPenaltyInterest = Math.abs(stock.financialHealth) * 0.015; // +1.5% za każdy pkt poniżej 0
    const volatilityRiskBonus = stock.volatilityFactor * 0.05; // Ryzyko rośnie ze zmiennością
    const finalInterest = baseInterest + healthPenaltyInterest;
    const finalRisk = Math.min(0.9, 0.3 + Math.abs(stock.financialHealth) * 0.1 + volatilityRiskBonus); // Ryzyko 30%-90%

    const duration = getRandomIntInRange(15, 35); // Krótszy/Średni termin

    const newBondOffer = {
        id: `res_bond_${stock.symbol}_${Date.now()}`,
        issuerName: `${stock.name} (Ratunkowa)`, // Oznacz nazwę
        issuerSymbol: stock.symbol, // ---> WAŻNE: Dodaj symbol emitenta <---
        type: 'Korporacyjna Ratunkowa 🆘', // Oznacz typ
        interestRate: finalInterest,
        durationMinutes: duration,
        risk: finalRisk,
        faceValue: faceValue,
        available: quantityToIssue,
        isRescueBond: true // ---> Dodaj flagę <---
    };

    activeBonds.push(newBondOffer);
    logEvent(`🆘 Emisja Ratunkowa Obligacji! ${stock.name} emituje ${quantityToIssue} obligacji (${(finalInterest * 100).toFixed(1)}%, Ryzyko: ${(finalRisk * 100).toFixed(0)}%) by pokryć długi!`, 'market');
    showToast(`🆘 ${stock.name} emituje obligacje ratunkowe!`, 'warning');

    // Zapobiegaj natychmiastowej kolejnej emisji (np. cooldown na kwartał)
    stock.rescueActionCooldown = Date.now() + BASE_DELAYS.quarterly / currentSpeedMultiplier;

    // Odśwież widok rynku obligacji, jeśli otwarty
    if (document.getElementById('bank-modal')?.style.display === 'block' && document.getElementById('bank-content-bonds')?.style.display === 'block') {
        if (typeof renderBondMarketInBank === 'function') renderBondMarketInBank();
    }
}

function sellSharesToInvestmentBank(bankId, symbol, quantity) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = playerPortfolio[symbol];

    // SCALONO: Dodano sprawdzenie `holding.lockedShares`
    const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;
    if (!bank || bank.type !== BANK_TYPES.INVESTMENT || !stock || !holding || availableShares < quantity) {
        showToast("Wystąpił błąd podczas sprzedaży (sprawdź, czy masz wystarczająco *dostępnych* akcji).");
        return;
    }

    // Cena odkupu: 95% ceny rynkowej, obniżona dla słabych spółek
    let priceMultiplier = 0.95;
    if (stock.financialHealth < 0) priceMultiplier -= 0.05;
    if (stock.financialHealth < -2) priceMultiplier -= 0.05;
    const purchasePrice = stock.price * priceMultiplier;
    const totalCostForBank = purchasePrice * quantity;

    if (bank.cash < totalCostForBank) {
        showToast(`Bank ${bank.name} nie ma wystarczająco gotówki, aby odkupić te akcje.`);
        return;
    }

    // Transakcja
    bank.cash -= totalCostForBank;
    playerCash += totalCostForBank;

    // Aktualizacja portfela gracza
    holding.shares -= quantity;
    if (holding.shares <= 0) {
        delete playerPortfolio[symbol];
    }

    // Aktualizacja portfela banku
    if (bank.stockPortfolio[symbol]) {
        const bankHolding = bank.stockPortfolio[symbol];
        const oldTotalValue = bankHolding.avgPrice * bankHolding.shares;
        const newTotalValue = oldTotalValue + totalCostForBank;
        bankHolding.shares += quantity;
        bankHolding.avgPrice = newTotalValue / bankHolding.shares;
    } else {
        bank.stockPortfolio[symbol] = { shares: quantity, avgPrice: purchasePrice };
    }

    logEvent(`Sprzedałeś ${quantity} akcji ${symbol} bankowi ${bank.name} po ${purchasePrice.toFixed(2)} PLN.`, 'review');
    displayCash();
    displayPortfolio();
}

function buySharesFromInvestmentBank(bankId, symbol) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const stock = stocks.find(s => s.symbol === symbol);
    const bankHolding = bank?.stockPortfolio[symbol];
    const inputElement = document.getElementById(`buy-from-bank-${bankId}-${symbol}`);
    const quantity = inputElement ? inputElement.valueAsNumber : 0;

    if (!bank || !stock || !bankHolding || bankHolding.shares < quantity || isNaN(quantity) || quantity <= 0) {
        showToast("Nie można zrealizować tej transakcji (sprawdź ilość lub dostępność).");
        return;
    }

    const sellPrice = stock.price * 1.10; // Cena z marżą +10%
    const totalCost = sellPrice * quantity;

    if (playerCash < totalCost) {
        showToast("Nie masz wystarczająco gotówki.");
        return;
    }

    // Transakcja
    playerCash -= totalCost;
    bank.cash += totalCost;

    // Aktualizacja portfela banku
    bankHolding.shares -= quantity;
    if (bankHolding.shares <= 0) {
        delete bank.stockPortfolio[symbol];
    }

    // Aktualizacja portfela gracza
    if (playerPortfolio[symbol]) {
        const playerHolding = playerPortfolio[symbol];
        const oldTotalValue = playerHolding.avgPrice * playerHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        playerHolding.shares += quantity;
        playerHolding.avgPrice = newTotalValue / playerHolding.shares;
    } else {
        playerPortfolio[symbol] = { shares: quantity, avgPrice: sellPrice };
    }

    logEvent(`Kupiłeś ${quantity} akcji ${symbol} od banku ${bank.name} po ${sellPrice.toFixed(2)} PLN.`, 'review');
    displayCash();
    displayPortfolio();
    renderCommercialBanksList(); // Odśwież listę banków, bo zmieniła się dostępność akcji
}

function checkMortgageDefaults() {
    const now = Date.now();
    let auctionStartedThisCycle = false; // Flaga, aby uruchomić max jedną aukcję na cykl

    // --- 👇 ZAKTUALIZOWANA LOGIKA: Sprawdź hipoteki AI 👇 ---
    if (!auctionStartedThisCycle) { // Sprawdzaj AI tylko, jeśli gracz nie stracił akcji w tym cyklu
        for (const ai of aiCompetitors) { // Pętla po wszystkich botach
            if (!ai.loans || ai.loans.length === 0) continue; // Pomiń AI bez pożyczek

            for (let i = ai.loans.length - 1; i >= 0; i--) { // Pętla po pożyczkach bota
                const loan = ai.loans[i];
                // Sprawdź, czy to hipoteka, termin minął i nie jest spłacona
                if (loan.collateral && now >= loan.maturityDate && loan.amount > 0.01) {
                    logEvent(`⏰ ${ai.name} nie spłacił hipoteki pod zastaw ${loan.collateral.quantity} ${loan.collateral.symbol}! Akcje trafiają na aukcję.`, 'market');

                    // Uruchom aukcję (funkcja sama usunie akcje z portfela AI)
                    startCollateralAuction(ai.id, loan.collateral.symbol, loan.collateral.quantity);

                    // Usuń niespłaconą pożyczkę z listy AI
                    ai.loans.splice(i, 1);

                    // Znajdź i usuń pożyczkę z portfela banku
                    const bank = commercialBanks.find(b => b.id === loan.bankId);
                     if (bank && bank.loanPortfolio[ai.id]) { // Użyj ID bota
                        const bankLoanIndex = bank.loanPortfolio[ai.id].findIndex(bl => bl.id === loan.id);
                        if (bankLoanIndex !== -1) {
                            bank.loanPortfolio[ai.id].splice(bankLoanIndex, 1);
                        }
                    }

                    auctionStartedThisCycle = true; // Uruchomiono aukcję
                    break; // Tylko jedna aukcja AI na cykl dla danego bota
                }
            }
            if (auctionStartedThisCycle) break; // Przerwij zewnętrzną pętlę AI, jeśli uruchomiono aukcję
        }
    }
    // --- 👆 KONIEC ZAKTUALIZOWANEJ LOGIKI 👆 ---
}

/**
 * Zmienia bank komercyjny przypisany do spółki.
 * @param {string} symbol - Symbol spółki.
 * @param {string} newBankId - ID nowego banku.
 */
function changeCompanyBank(symbol, newBankId) {
    const stock = stocks.find(s => s.symbol === symbol);
    const newBank = commercialBanks.find(b => b.id === newBankId && b.isActive);

    // Walidacja (bez zmian)
    if (!stock || stock.assetType) { console.error("..."); return; }
    if (!newBank) { showToast("Wybrany bank jest nieaktywny lub nie istnieje."); return; }
    if (stock.bankAccountId === newBankId) { showToast(`Spółka ${stock.name} już korzysta z usług banku ${newBank.name}.`); return; }

    const oldBankId = stock.bankAccountId;
    const oldBank = commercialBanks.find(b => b.id === oldBankId);

    // --- 👇 NOWA LOGIKA TRANSFERU 👇 ---
    // 1. Transfer gotówki spółki
    const cashToTransfer = stock.cash;
    if (oldBank) {
        oldBank.cash -= cashToTransfer; // Zmniejsz gotówkę starego banku
    }
    newBank.cash += cashToTransfer; // Zwiększ gotówkę nowego banku
    // `stock.cash` pozostaje bez zmian

    // 2. Transfer kredytów spółki (jeśli istnieją)
    let transferredLoanAmount = 0;
    if (oldBank && oldBank.loanPortfolio[symbol]) {
        transferredLoanAmount = oldBank.loanPortfolio[symbol];
        // Przenieś kredyt do nowego banku
        newBank.loanPortfolio[symbol] = (newBank.loanPortfolio[symbol] || 0) + transferredLoanAmount;
        // Usuń kredyt ze starego banku
        delete oldBank.loanPortfolio[symbol];

        // Symulacja przepływu środków między bankami (nowy bank "spłaca" stary)
        oldBank.cash += transferredLoanAmount; // Stary bank odzyskuje środki
        newBank.cash -= transferredLoanAmount; // Nowy bank wydaje środki na przejęcie kredytu
        logEvent(` Kredyt spółki ${symbol} (${transferredLoanAmount.toFixed(0)} PLN) został przeniesiony do ${newBank.name}.`);
    }
    // --- 👆 KONIEC NOWEJ LOGIKI TRANSFERU 👆 ---

    // Aktualizacja przypisania banku i list klientów (bez zmian)
    if (oldBank) {
        const clientIndex = oldBank.corporateClients.indexOf(symbol);
        if (clientIndex > -1) oldBank.corporateClients.splice(clientIndex, 1);
    }
    stock.bankAccountId = newBankId;
    if (!newBank.corporateClients.includes(symbol)) {
        newBank.corporateClients.push(symbol);
    }

    logEvent(`🏦 Spółka ${stock.name} przenosi swój rachunek (saldo: ${cashToTransfer.toFixed(0)} PLN${transferredLoanAmount > 0 ? `, kredyt: ${transferredLoanAmount.toFixed(0)} PLN` : ''}) do banku ${newBank.name}.`, 'review');
    showToast(`Rachunek ${stock.name} przeniesiony do ${newBank.name}.`, 'success');

    // Odśwież widok panelu zarządzania (bez zmian)
    if (document.getElementById('management-modal')?.style.display === 'block' && document.getElementById('management-modal').dataset.currentSymbol === symbol) {
        openManagementModal(symbol);
    }
}

function applyTechnology(company, techId) {
    const research = company?.research;
    const tech = technologies[techId];

    if (
        !company ||
        company.isBankrupt ||
        !research ||
        research.isInvestment ||
        !tech ||
        research.currentTech !== techId ||
        !research.isResearching
    ) {
        return false;
    }

    const progress = Number(research.progress);
    const required = Number(tech.cost);

    if (
        !Number.isFinite(progress) ||
        !Number.isFinite(required) ||
        required <= 0 ||
        progress < required
    ) {
        return false;
    }

    if (!Array.isArray(research.unlockedTechs)) {
        research.unlockedTechs = [];
    }

    if (research.unlockedTechs.includes(techId)) {
        research.currentTech = null;
        research.progress = 0;
        research.isResearching = false;
        research.researchPaused = false;
        research.choiceAvailableUntil = null;
        research.choiceRemainingGameMs = null;
        return false;
    }

    if (typeof tech.applyEffect === 'function') {
        tech.applyEffect(company);
    }

    research.unlockedTechs.push(techId);
    research.currentTech = null;
    research.progress = 0;
    research.isResearching = false;
    research.researchPaused = false;
    research.choiceAvailableUntil = null;
    research.choiceRemainingGameMs = null;

    logEvent(
        `${company.name} ukończyła badanie „${tech.name}”.`,
        'company'
    );

    const available = getAvailableCompanyResearch(company);

    if (available.length === 0) {
        logEvent(
            `${company.name}: brak kolejnych dostępnych badań ` +
            'w obecnej specjalizacji.',
            'company'
        );

        return true;
    }

    if (company.researchUnlocks?.canInterfere) {
        research.choiceRemainingGameMs = 15000;

        // Pole pozostaje sygnałem dla dotychczasowych elementów UI.
        research.choiceAvailableUntil = Date.now() + 15000;
        research.isResearching = true;

        logEvent(
            `${company.name} czeka na wybór kolejnego badania. ` +
            'Czas decyzji: 15 sekund symulacji.',
            'company'
        );
    } else {
        const affordable = getAvailableCompanyResearch(company, true);

        if (affordable.length > 0) {
            startCompanyResearch(
                company,
                getRandomElement(affordable)
            );
        } else {
            logEvent(
                `${company.name}: brak środków na kolejne badanie.`,
                'company'
            );
        }
    }

    return true;
}
// Funkcja pomocnicza do rozpoczynania kolejnej inwestycji bankowej
function startNextBankInvestment(stock, nextInvestmentId, bankData) {
    const nextInvestment = bankInvestments[nextInvestmentId];
    const completedCount = stock.research.completedInvestments[nextInvestmentId] || 0;
    const requiredProgress = nextInvestment.baseCost + (completedCount * nextInvestment.increaseDurationPoints);
    const initialCashCost = nextInvestment.initialCashCost || 0;

    stock.research.currentInvestmentId = nextInvestmentId;
    stock.research.progress = 0;
    stock.research.requiredProgress = requiredProgress; // Zapisz wymagany postęp dla tej realizacji
    stock.research.investmentPaused = false; // Resetuj pauzę

    // Sprawdź, czy bank stać na rozpoczęcie
    if (bankData.cash >= initialCashCost) {
        bankData.cash -= initialCashCost;
        stock.research.isResearching = true;
        if(initialCashCost > 0) logEvent(`💸 Bank ${stock.name} rozpoczyna kolejną inwestycję: "${nextInvestment.name}" (Poziom ${completedCount + 1}) kosztem ${initialCashCost.toLocaleString()} PLN. Czas: ${Math.round(requiredProgress / BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE)} min.`);
        else logEvent(`▶️ Bank ${stock.name} rozpoczyna kolejną inwestycję: "${nextInvestment.name}" (Poziom ${completedCount + 1}). Czas: ${Math.round(requiredProgress / BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE)} min.`);
    } else {
        stock.research.isResearching = false;
        stock.research.investmentPaused = true; // Zapauzuj
        logEvent(`⏸️ Bank ${stock.name} chciał rozpocząć inwestycję "${nextInvestment.name}", ale brakuje środków (${initialCashCost.toLocaleString()} PLN). Inwestycje wstrzymane.`);
    }
}

function applyBankInvestmentEffect(stock, completedInvestmentId) {
    const investment = bankInvestments[completedInvestmentId];
    const bankData = commercialBanks.find(b => b.id === stock.bankData.id);

    if (!investment || !bankData) {
        console.error(`Błąd przy aplikowaniu efektu inwestycji ${completedInvestmentId} dla ${stock.symbol}`);
        stock.research.isResearching = false; // Zatrzymaj proces w razie błędu
        return;
    }

    // 1. Zastosuj efekt ukończonej inwestycji
    investment.applyEffect(stock, bankData);

    // 2. Zaktualizuj licznik ukończonych
    stock.research.completedInvestments[completedInvestmentId]++;
    const currentLevel = stock.research.completedInvestments[completedInvestmentId];
    logEvent(`✅ Bank ${stock.name} zakończył inwestycję "${investment.name}" (Poziom ${currentLevel}).`);

    // 3. Sprawdź, czy osiągnięto maksymalny poziom
    if (investment.maxLevel && currentLevel >= investment.maxLevel) {
        logEvent(`ℹ️ Bank ${stock.name} osiągnął maksymalny poziom inwestycji "${investment.name}".`);
        // Wybierz inną inwestycję (która nie jest na max poziomie)
        const availableInvestmentIds = Object.keys(bankInvestments).filter(id => {
            const inv = bankInvestments[id];
            const completedCount = stock.research.completedInvestments[id] || 0;
            return !inv.maxLevel || completedCount < inv.maxLevel;
        });
        if (availableInvestmentIds.length === 0) {
            logEvent(`🎉 Bank ${stock.name} zrealizował wszystkie dostępne inwestycje!`);
            stock.research.isResearching = false;
            stock.research.currentInvestmentId = null;
            return;
        }
        const nextInvestmentId = getRandomElement(availableInvestmentIds);
        startNextBankInvestment(stock, nextInvestmentId, bankData);

    } else {
        // 4. Wybierz losowo następną inwestycję (może być ta sama)
        const availableInvestmentIds = Object.keys(bankInvestments).filter(id => {
            const inv = bankInvestments[id];
            const completedCount = stock.research.completedInvestments[id] || 0;
            return !inv.maxLevel || completedCount < inv.maxLevel; // Tylko te, które nie są na max poziomie
        });
         if (availableInvestmentIds.length === 0) { // Na wszelki wypadek
            logEvent(`🎉 Bank ${stock.name} zrealizował wszystkie dostępne inwestycje!`);
            stock.research.isResearching = false;
            stock.research.currentInvestmentId = null;
            return;
        }
        const nextInvestmentId = getRandomElement(availableInvestmentIds);
        startNextBankInvestment(stock, nextInvestmentId, bankData);
    }
}

function updateResearchProgress(deltaTime) {
    const researchPoints = deltaTime / 2500; // Ilość punktów postępu w tym cyklu

    stocks.forEach(stock => {
        // Pomiń, jeśli spółka nie ma systemu badań/inwestycji lub nie jest aktywny
        if (!stock.research || !stock.research.isResearching) return;

        // --- Logika dla Inwestycji Bankowych ---
        if (stock.research.isInvestment) {
            if (stock.research.currentInvestmentId) {
                // Dodaj punkty postępu
                stock.research.progress += researchPoints; // Banki na razie bez mnożników prędkości

                // Sprawdź, czy inwestycja została ukończona
                if (stock.research.progress >= stock.research.requiredProgress) {
                    applyBankInvestmentEffect(stock, stock.research.currentInvestmentId);
                }
            }
        }
        // --- Logika dla Standardowego R&D ---
        else {
            if (stock.research.currentTech) {
                let baseSpeedMultiplier = stock.research.researchSpeedMultiplier || 1.0;
                let ceoMultiplier = 1.0;
                if (stock.ceo && stock.ceo.traits) {
                    if (stock.ceo.traits.some(t => t.id === 'wizjoner')) ceoMultiplier *= 1.10;
                    if (stock.ceo.traits.some(t => t.id === 'glowa_w_chmurach')) ceoMultiplier *= 0.95;
                    if (stock.ceo.traits.some(t => t.id === 'geniusz_innowacji')) ceoMultiplier *= 1.25;
                    if (stock.ceo.traits.some(t => t.id === 'biurowy_dron')) ceoMultiplier *= 1.05;
                    if (stock.ceo.traits.some(t => t.id === 'ksiegowy')) ceoMultiplier *= 0.95;
                    if (stock.ceo.traits.some(t => t.id === 'lowca_glow')) ceoMultiplier *= 1.10;
                }
                if (stock.departments && stock.departments.research.level >= 3) {
            baseSpeedMultiplier *= 1.10; // +10% prędkości
                }

                let phaseMultiplier = 1.0;
                if (stock.corporatePhase === CORPORATE_PHASES.INNOVATION_PUSH) {
                    phaseMultiplier = 1.5; // +50% prędkości badań
                } else if (stock.corporatePhase === CORPORATE_PHASES.DECLINE || stock.corporatePhase === CORPORATE_PHASES.SHADOW_DESCENT) {
                     phaseMultiplier = 0.7; // -30% prędkości w fazie spadku
                }

                // Dodaj punkty postępu
                stock.research.progress += researchPoints * baseSpeedMultiplier * ceoMultiplier * phaseMultiplier;

                // Sprawdź, czy badanie zostało ukończone
                const currentTechCost = technologies[stock.research.currentTech]?.cost;
                if (currentTechCost && stock.research.progress >= currentTechCost) {
                    logEvent(`💡 PRZEŁOM! ${stock.name} zakończył badania nad technologią: "${technologies[stock.research.currentTech].name}"!`);
                    applyTechnology(stock, stock.research.currentTech); // Wywołaj starą funkcję
                }
            }
        }
    });
}

function checkResearchChoiceTimers(deltaTime = 0) {
    const delta = Number(deltaTime);

    if (!Number.isFinite(delta) || delta < 0) return;

    for (const company of stocks) {
        const research = company.research;

        if (!research || research.isInvestment) continue;

        if (company.isBankrupt) {
            research.choiceAvailableUntil = null;
            research.choiceRemainingGameMs = null;
            continue;
        }

        if (research.currentTech || !research.choiceAvailableUntil) {
            research.choiceRemainingGameMs = null;
            continue;
        }

        // Starsza, aktywna decyzja otrzymuje pełne 15 s symulacji.
        if (
            !Number.isFinite(research.choiceRemainingGameMs) ||
            research.choiceRemainingGameMs < 0
        ) {
            research.choiceRemainingGameMs = 15000;
        }

        if (isGamePaused) continue;

        research.choiceRemainingGameMs = Math.max(
            0,
            research.choiceRemainingGameMs - delta
        );

        if (research.choiceRemainingGameMs > 0) continue;

        research.choiceAvailableUntil = null;
        research.choiceRemainingGameMs = null;
        research.isResearching = false;

        const available = getAvailableCompanyResearch(company, true);

        if (available.length > 0) {
            startCompanyResearch(
                company,
                getRandomElement(available)
            );
        } else {
            logEvent(
                `${company.name}: czas wyboru minął, ale brak ` +
                'dostępnego badania, na które spółkę stać.',
                'company'
            );
        }
    }
}

function updateResearchInstitutes() {
    // 1. Policz wszystkie technologie odblokowane przez inne firmy
    const totalTechsByType = {
        'wzmacnianie rozwoju': 0,
        'wzmacnianie pozycji na rynku': 0,
        'wzmacnianie ceny i zysków': 0
    };
    
    stocks.filter(s =>
            s.assetType !== 'ResearchInstitute' && // Nie licz instytutów
            s.research &&                           // Upewnij się, że obiekt research istnieje
            s.research.unlockedTechs &&             // Upewnij się, że tablica unlockedTechs istnieje
            s.research.unlockedTechs.length > 0     // Dopiero teraz sprawdź długość
          )
          .forEach(s => {
              s.research.unlockedTechs.forEach(techId => {
                  const tech = technologies[techId];
                  // Sprawdź, czy technologia istnieje i ma poprawny typ
                  if (tech && totalTechsByType.hasOwnProperty(tech.type)) {
                      totalTechsByType[tech.type]++;
                  }
              });
          });

    // 2. Znajdź instytuty badawcze
    const researchInstitutes = stocks.filter(s => s.assetType === 'ResearchInstitute');
    
    // 3. Zastosuj bonusy do każdego instytutu
    researchInstitutes.forEach(stock => {
        let priceBonus = 0;
        let healthBonus = 0;
        let volatilityModifier = 1.0;

        // Bonus do ceny za technologie zysków
        priceBonus += totalTechsByType['wzmacnianie ceny i zysków'] * 0.05; // +0.05 PLN do ceny za każdą taką tech.

        // Bonus do kondycji za technologie rozwoju
        healthBonus += totalTechsByType['wzmacnianie rozwoju'] * 0.02;

        // Bonus do stabilności (niższa zmienność) za technologie pozycji na rynku
        const marketPositionTechs = totalTechsByType['wzmacnianie pozycji na rynku'];
        volatilityModifier -= (marketPositionTechs * 0.005); // -0.5% do zmienności za każdą taką tech.
        
        // Zastosuj efekty: procentowy dryf ceny i stałe (nieskładane) modyfikatory.
        stock.price *= 1 + priceBonus * 0.002;
        stock.financialHealth = Math.min(5, stock.financialHealth + healthBonus * 0.01);
        if (!Number.isFinite(stock.baseVolatilityFactor)) stock.baseVolatilityFactor = stock.volatilityFactor;
        stock.volatilityFactor = Math.max(0.1, stock.baseVolatilityFactor * volatilityModifier);
    });
}

function checkResearchInstitutePositions() {
    // 1. Zresetuj wszystkie bonusy prędkości badań
    stocks.forEach(s => {
        if(s.research) s.research.researchSpeedMultiplier = 1.0;
    });

    const researchInstitutesIndices = [];
    stocks.forEach((s, index) => {
        if (s.assetType === 'ResearchInstitute') {
            researchInstitutesIndices.push(index);
        }
    });

    researchInstitutesIndices.forEach(index => {
        const neighbors = [stocks[index - 1], stocks[index + 1]];
        
        // 2. Zastosuj bonus do sąsiadów
        neighbors.forEach(neighbor => {
            if (neighbor && neighbor.research && neighbor.research.isResearching) {
                neighbor.research.researchSpeedMultiplier = 1.05; // Bonus +5%
            }
        });

        // 3. Sprawdź, czy sąsiad też jest instytutem badawczym
        const nextStock = stocks[index + 1];
        if (nextStock && nextStock.assetType === 'ResearchInstitute') {
            const stockToMove = Math.random() < 0.5 ? stocks[index] : nextStock;
            const direction = Math.random() < 0.5 ? 'up' : 'down';
            
            let priceChange = direction === 'up' ? 2.5 : -0.8; // Mnożnik x2.5 lub /5
            
            applyPriceEffect(stockToMove.symbol, priceChange, 'neutral');
            
            const message = direction === 'up' 
                ? `Wybuch innowacji! Konkurencja między ${stockToMove.name} a sąsiadem owocuje przełomem i skokowym wzrostem wyceny!`
                : `Konflikt o patenty! Wojna podjazdowa między ${stockToMove.name} a sąsiadem negatywnie wpływa na jego wycenę.`;
                
            showToast(message, direction === 'up' ? 'success' : 'error', 6000);
            logEvent(`🧪 ${message}`);
        }
    });
}

function unlockResearchTier(symbol, tierName, cost) {
    const stock = stocks.find(s => s.symbol === symbol);
    let finalCost = cost;
    const playerRep = stock.reputation['player'];

    if (playerRep < REPUTATION_LEVELS.NEGATIVE) finalCost *= 1.10; // 10% drożej
    else if (playerRep >= REPUTATION_LEVELS.POSITIVE) finalCost *= 0.98; // 2% taniej
    if (!stock || playerCash < cost) {
        showToast("Za mało gotówki, aby odblokować ten poziom!", 'error');
        return;
    }
    if (stock.researchUnlocks[tierName]) {
        showToast("Ten poziom jest już odblokowany.", 'default');
        return;
    }

    playerCash -= cost;
    stock.researchUnlocks[tierName] = true;
    
    showToast("Dostęp odblokowany!", 'success');
    logEvent(`🔬 Odblokowałeś nowy poziom dostępu do R&D w ${stock.name}.`);

    displayCash();
    openResearchModal(symbol); // Odśwież widok panelu badań
}

function fundResearch(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    const amountInput = document.getElementById('rd-funding-amount');
    const amount = amountInput.valueAsNumber;

    if (!stock || !amount || amount <= 0) {
        showToast("Wpisz poprawną kwotę.");
        return;
    }
    if (playerCash < amount) {
        showToast("Nie masz wystarczająco gotówki!");
        return;
    }

    if (!stock.research || stock.research.isInvestment || !stock.research.currentTech) {
        showToast("Spółka nie prowadzi teraz badania, które można sfinansować.");
        return;
    }

    playerCash -= amount;
    stock.research.progress += amount; // 1 PLN = 1 punkt postępu
    // Gracz płaci za zewnętrzne prace badawcze — środki opuszczają model (jawnie oznaczone).
    recordPayment('player', 'external:uslugi_badawcze', amount, `Finansowanie badań w ${stock.name}`);
    
    showToast(`Sfinansowano badania w ${stock.name} kwotą ${amount.toFixed(2)} PLN!`, 'success');
    logEvent(`🔬 Przyspieszono badania w ${stock.name} o ${amount} punktów.`);

    displayCash();
    openResearchModal(symbol); // Odśwież widok
    openManagementModal(symbol); // Odśwież też główny panel, by zaktualizować pasek
    amountInput.value = '';
}

function changeResearchSpecialization(symbol) {
    const company = stocks.find(stock => stock.symbol === symbol);
    const select = document.getElementById('rd-specialization-select');
    const research = company?.research;

    if (
        !company ||
        !research ||
        research.isInvestment ||
        !company.researchUnlocks?.canInfluence ||
        !select
    ) {
        return false;
    }

    if (research.currentTech) {
        showToast(
            'Najpierw ukończ obecne badanie. Zmiana kierunku nie może go porzucić.',
            'warning'
        );
        return false;
    }

    const allowed = [
        'wzmacnianie rozwoju',
        'wzmacnianie pozycji na rynku',
        'wzmacnianie ceny i zysków'
    ];

    const selected = select.value;

    if (
        !allowed.includes(selected) ||
        selected === research.specialization
    ) {
        return false;
    }

    research.specialization = selected;
    research.progress = 0;
    research.choiceAvailableUntil = null;
    research.isResearching = false;
    research.researchPaused = false;

    const affordable = getAvailableCompanyResearch(company, true);

    if (affordable.length > 0) {
        startCompanyResearch(
            company,
            getRandomElement(affordable)
        );
    }

    logEvent(
        `${company.name} zmienia kierunek badań na „${selected}”.`,
        'company'
    );

    openResearchModal(symbol);
    updateConstructionSectorUI();

    return true;
}

function processCeoActions(deltaTime) {
    stocks.forEach(stock => {
        if (!stock.ceo || !stock.ceo.traits) return;

        stock.ceo.traits.forEach(trait => {
            if (!stock.ceo.timers) stock.ceo.timers = {};

            // --- POCZĄTEK ZMIAN DLA CECHY KAPITALISTA ---
            if (trait.id === 'kapitalista') {
                if (stock.ceo.timers.buyback === undefined) {
                    stock.ceo.timers.buyback = getRandomIntInRange(4 * 60 * 1000, 7 * 60 * 1000);
                }
                stock.ceo.timers.buyback -= deltaTime;

                if (stock.ceo.timers.buyback <= 0) {
                    const sharesToBuy = Math.floor(stock.totalShares * 0.001); // Skup 0.1% akcji
                    const availableSharesOnMarket = getAvailableShares(stock);

                    if (sharesToBuy > 0 && sharesToBuy <= availableSharesOnMarket) {
                        // Inicjalizuj 'treasuryShares', jeśli nie istnieje
                        if (!stock.treasuryShares) stock.treasuryShares = 0;
                        
                        // Zamiast niszczyć akcje, dodajemy je do puli akcji własnych spółki
                        stock.treasuryShares += sharesToBuy;
                        
                        logEvent(`📈 [Kapitalista] Zarząd ${stock.name} ogłasza skup akcji własnych w celu podniesienia wartości dla akcjonariuszy!`, 'company');
                    }
                    stock.ceo.timers.buyback = getRandomIntInRange(4 * 60 * 1000, 7 * 60 * 1000); // Reset timera
                }
            }
            // --- KONIEC ZMIAN DLA CECHY KAPITALISTA ---

            if (trait.id === 'legenda') {
                if (stock.ceo.timers.legendBoost === undefined) {
                    stock.ceo.timers.legendBoost = 10 * 60 * 1000;
                }
                stock.ceo.timers.legendBoost -= deltaTime;

                if (stock.ceo.timers.legendBoost <= 0) {
                    applyPriceEffect(stock.symbol, 0.035, 'positive', 'review');
                    logEvent(`🏆 [Legenda] Charyzma prezesa ${stock.name} znów przyciąga inwestorów!`, 'company');
                    stock.ceo.timers.legendBoost = 10 * 60 * 1000; // Reset timera
                }
            }
        });
    });
}

function initiateCeoChange(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    const playerShares = playerPortfolio[symbol]?.shares || 0;
    const ownershipPct = (playerShares / stock.totalShares) * 100;

    if (ownershipPct <= 50) {
        showToast("Musisz posiadać ponad 50% akcji, aby zainicjować zmianę prezesa!", 'error');
        return;
    }

    // Generujemy 3 kandydatów
    const candidates = [
        generateCeoCandidate(stock),
        generateCeoCandidate(stock),
        generateCeoCandidate(stock)
    ];
    
    // Obliczamy szansę na sukces
    const baseChance = 0.50;
    const bonusChance = (ownershipPct - 50) * 0.01;
    const successChance = Math.min(1.0, baseChance + bonusChance); // Ogranicz do 100%

    // Zapisujemy kandydatów tymczasowo w obiekcie spółki
    stock.ceoCandidates = candidates;
    
    openCeoChoiceModal(symbol, candidates, successChance);
}


function confirmCeoChange(symbol, candidateIndex) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.ceoCandidates) return;

    const chosenCandidate = stock.ceoCandidates[candidateIndex];
    document.getElementById('ceo-choice-modal').style.display = 'none'; // Zamknij modal

    // --- POCZĄTEK POPRAWEK ---

    // 1. Oblicz i pobierz koszt operacji (5% wartości rynkowej)
    const marketCap = stock.price * stock.totalShares;
    const operationCost = marketCap * 0.05;

    // 2. Sprawdź, czy gracza stać NA TEN MOMENT
    // (Mógł wydać pieniądze, gdy okno wyboru było otwarte)
    if (playerCash < operationCost) {
        showToast("Brak środków! Nie stać Cię na przeprowadzenie operacji zmiany prezesa.", 'error');

        // Ustawiamy cooldown mimo wszystko, bo próba została podjęta i nie powiodła się
        stock.ceo.fireCooldown = Date.now() + (BASE_DELAYS.quarterly * 2 / currentSpeedMultiplier);
        delete stock.ceoCandidates;
        openManagementModal(symbol); // Odśwież widok
        return; // Zakończ funkcję
    }

    playerCash -= operationCost;
    displayCash(); // Natychmiast zaktualizuj gotówkę
    logEvent(`💸 Pobrano ${operationCost.toFixed(2)} PLN za próbę zwołania walnego zgromadzenia w ${stock.name}.`, 'review');


    const playerShares = playerPortfolio[symbol]?.shares || 0;
    const ownershipPct = (playerShares / stock.totalShares) * 100;
    const baseChance = 0.50;
    const bonusChance = (ownershipPct - 50) * 0.01;
    const successChance = Math.min(1.0, baseChance + bonusChance);

    if (Math.random() < successChance) {
        
        const oldCeo = stock.ceo; // Zapisujemy cały obiekt starego CEO
        replaceCeo(stock, chosenCandidate); // Przekazujemy wybranego kandydata
        logEvent(`👑 Zmiana warty w ${stock.name}! Po Twojej interwencji powołano nowego prezesa.`, 'review');
        showToast(`Sukces! W ${stock.name} powołano nowego prezesa.`, 'success');

       
        changeReputation('player', symbol, -10); // -10 za udaną "intrygę"

    } else {
        
        logEvent(`👑 Twoja próba powołania nowego prezesa w ${stock.name} nie powiodła się. Rada nadzorcza odrzuciła kandydaturę.`, 'review');
        showToast("Porażka! Rada nadzorcza zablokowała Twoją decyzję.", 'error');

        
        changeReputation('player', symbol, -25); // -25 za nieudaną próbę (wygląda to źle)
    }

    
    stock.ceo.fireCooldown = Date.now() + (BASE_DELAYS.quarterly * 2 / currentSpeedMultiplier);
    delete stock.ceoCandidates;
    openManagementModal(symbol); // Odśwież widok
}


function updateCeoTenureAndAge() {
    stocks.forEach(stock => {
        // Sprawdzamy tylko aktywne spółki z prezesami
        if (stock.ceo && !stock.isBankrupt && !stock.assetType) {
            
            // 1. Podstawowe starzenie prezesa
            stock.ceo.age += 1;
            stock.ceo.tenure += 4; // Dodajemy 4 kwartały do stażu
            
            // 2. NOWOŚĆ: Logika przejścia na emeryturę (start od 65 lat)
            if (stock.ceo.age >= 65) {
                // Szansa rośnie z każdym rokiem (65 lat = 15%, 66 lat = 30%, 70 lat = 90%)
                const retirementChance = (stock.ceo.age - 64) * 0.15; 
                
                if (Math.random() < retirementChance) {
                    logEvent(`👴 Prezes ${stock.ceo.name} (${stock.name}) przeszedł na zasłużoną emeryturę w wieku ${stock.ceo.age} lat.`, 'company');
                    
                    // Powołanie nowej osoby na miejsce starego prezesa
                    if (typeof generateCEO === 'function') {
                        generateCEO(stock);
                    }
                }
            }
        }
    });
}

function makeSubsidiary(parentStock, childStock) {
    if (!parentStock || !childStock || childStock.isSubsidiaryOf) {
        console.warn(`[makeSubsidiary] Błąd: Nie można utworzyć zależności dla ${parentStock?.symbol} -> ${childStock?.symbol}`);
        return; // Zabezpieczenie przed błędami lub ponownym ustawieniem
    }

    // Ustaw flagę zależności
    childStock.isSubsidiaryOf = parentStock.symbol;

    // Dodaj do listy spółek zależnych rodzica (jeśli lista nie istnieje, stwórz ją)
    if (!parentStock.subsidiaries) {
        parentStock.subsidiaries = [];
    }
    // Upewnij się, że nie dodajemy duplikatu
    if (!parentStock.subsidiaries.includes(childStock.symbol)) {
        parentStock.subsidiaries.push(childStock.symbol);
    }

    // Zresetuj proces fuzji/przejęcia, jeśli jakiś był aktywny (na wypadek, gdyby to był wynik wpływu)
    childStock.mergerProcess = null;
    parentStock.mergerProcess = null; // Zresetuj też rodzica na wszelki wypadek

    // Zaloguj zdarzenie
    logEvent(`🏢 Spółka ${childStock.name} (${childStock.symbol}) stała się spółką zależną od ${parentStock.name} (${parentStock.symbol}) z powodu dominującego wpływu!`, 'review');
    showToast(`${childStock.name} jest teraz zależna od ${parentStock.name}!`, 'warning');

    // Opcjonalnie: Można tutaj dodać natychmiastowe efekty, np.
    // - Lekki boost dla ceny parentStock
    // - Lekki spadek zmienności childStock (większa stabilność pod kontrolą)
    applyPriceEffect(parentStock.symbol, 0.02, 'positive'); // +2% dla rodzica
    childStock.volatilityFactor *= 0.9; // Spółka zależna staje się stabilniejsza

    // Odśwież UI, aby pokazać zmiany (np. wcięcie w tabeli)
    displayStocks(getCurrentInputValues());
    // Jeśli modal zarządzania jest otwarty dla którejś z tych spółek, odśwież go
    if (document.getElementById('management-modal')?.style.display === 'block') {
         const currentSymbol = document.getElementById('management-modal').dataset.currentSymbol;
         if(currentSymbol === parentStock.symbol || currentSymbol === childStock.symbol) {
             openManagementModal(currentSymbol);
         }
    }
     // Odśwież też opis, jeśli jest otwarty
    if (document.getElementById('description-modal')?.style.display === 'block') {
        const currentSymbol = typeof companyCardView !== 'undefined' ? companyCardView.symbol : null;
         if(currentSymbol === parentStock.symbol || currentSymbol === childStock.symbol) {
             openDescriptionModal(currentSymbol);
         }
    }
}

function updateInfluence() {
    // 1. Filtruj aktywne, niezależne spółki, które mają system wpływów
    const regularStocks = stocks.filter(s => s.influence && !s.isSubsidiaryOf);

    // 2. Oblicz wywierany wpływ (tylko od aktywnych)
    regularStocks.forEach(sourceStock => {
        sourceStock.influence.exerted = {}; // Resetuj wywierany wpływ
        const sourceMarketCap = sourceStock.price * sourceStock.totalShares;

        // Wpływ jest wywierany na WSZYSTKIE spółki (nawet zależne, ale nie na siebie)
        stocks.filter(s => s.influence && s.symbol !== sourceStock.symbol).forEach(targetStock => {
            const targetMarketCap = targetStock.price * targetStock.totalShares;
            let currentInfluence = 0;

            // 1. Wpływ rozmiaru
            if (sourceMarketCap > targetMarketCap) {
                currentInfluence += (sourceMarketCap / targetMarketCap - 1) * 2;
            }
            // 2. Wpływ kondycji
            currentInfluence += (sourceStock.financialHealth - targetStock.financialHealth) * 0.5;

            // 3. Wpływ posiadanych akcji (Holdingi)
            if (sourceStock.assetType === 'Holding' && sourceStock.holdingPortfolio[targetStock.symbol]) {
                const sharesHeld = sourceStock.holdingPortfolio[targetStock.symbol].quantity;
                const ownershipPct = (sharesHeld / targetStock.totalShares) * 100;
                currentInfluence += ownershipPct * 0.5;
            }
            
            // 4. Cechy CEO
            if (sourceStock.ceo?.traits?.some(t => t.id === 'rekin')) {
                currentInfluence *= 1.1;
            }

            // Ograniczenie i zapis
            currentInfluence = Math.max(0, Math.round(currentInfluence));
            if (currentInfluence > 0) {
                sourceStock.influence.exerted[targetStock.symbol] = currentInfluence;
            }
        });
    });

    // 3. Agreguj otrzymywany wpływ dla WSZYSTKICH spółek (nawet zależnych)
    stocks.filter(s => s.influence).forEach(targetStock => {
        targetStock.influence.received = {};
        targetStock.influence.totalReceived = 0;
        // Sprawdź wpływ od wszystkich regularnych (niezależnych) spółek
        regularStocks.forEach(sourceStock => {
            if (sourceStock.influence.exerted[targetStock.symbol]) {
                const received = sourceStock.influence.exerted[targetStock.symbol];
                targetStock.influence.received[sourceStock.symbol] = received;
                targetStock.influence.totalReceived += received;
            }
        });
    });
}

function runMunicipalCompanyLogic() {
    if (Math.random() > 0.20) { // 20% szans rocznie na IPO
        return;
    }

    const targetCompany = getRandomElement(municipalCompanies);
    if (!targetCompany) return;

    // Spółka wchodzi na giełdę
    logEvent(`🎉 IPO SPÓŁKI MIEJSKIEJ! ${targetCompany.name} wchodzi na Giełdę Brązową!`, 'success');

    const cityOwnershipPct = getRandomInRange(0.51, 0.95); // Miasto trzyma 51-95%
    const totalShares = getRandomIntInRange(20000, 50000);
    const initialPrice = (targetCompany.budget + targetCompany.baseIncome * 5) / totalShares; // Prosta wycena

    const newStock = {
        name: targetCompany.name,
        price: Math.max(10, initialPrice), // Cena min. 10 PLN
        volatilityFactor: getRandomInRange(0.2, 0.5), // Bardzo stabilne
        symbol: targetCompany.id,
        isMunicipal: true, // spółka miejska — miasto może dofinansowywać jej inwestycje
        exchange: 'BRONZE', 
        totalShares: totalShares,
        maxShares: totalShares * 2,
        sharesHeld: 0, insiderShares: 0, // pakiet miasta (stateOwnershipPct) jest poza wolnym obrotem — nie liczy się do sharesHeld
        sector: ['Usługi', 'Nieruchomości'], // Uogólniony sektor
        financialHealth: 5, // Bardzo zdrowe
        lastReport: 'good',
        cash: targetCompany.budget,
        assetType: 'Municipal', // Nowy typ
        balanceSheet: { assets: targetCompany.budget * 2, liabilities: targetCompany.budget, shareCapital: totalShares * 10, retainedEarnings: 0 },
        quarterlyEarnings: targetCompany.baseIncome / 4,
        priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        
        isStateOwned: true, // Używamy tej flagi do oznaczenia własności publicznej (miejskiej)
        stateOwnershipPct: cityOwnershipPct,
        canBeTraded: true,
        cannotGoBankrupt: true, // Nigdy nie bankrutują
        
        dividendPolicy: Math.random() < 0.5 ? 'None' : 'Balanced', // 50/50
        dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000),
        estimatedDividend: 0,
        bankAccountId: null, 
        isBankStock: false
    };
    
    // Zainicjuj bilans, CEO itp.
    initializeBalanceSheetForStock(newStock); // Mimo że ma assetType, chcemy CEO itp.
    initializeDescriptionParts(newStock);
    generateCEO(newStock);
    
    stocks.push(newStock);
    if (typeof initializeFundamentals === 'function') initializeFundamentals(newStock, true); // U3: pełne wskaźniki (C/Z itd.) od debiutu

    // Usuń z listy spółek miejskich
    const index = municipalCompanies.findIndex(c => c.id === targetCompany.id);
    if (index > -1) municipalCompanies.splice(index, 1);
}

function runPrivateCompanyLogic() {
    privateCompanies.forEach(company => {
        company.developmentProgress += getRandomInRange(1, 5); // Powolny postęp co kwartał

        if (company.developmentProgress >= 100) {
            // Firma dojrzała - podejmuje decyzję
            company.developmentProgress = 0; // Reset
            const decision = Math.random();

            if (decision < 0.2) { // 20% szans na IPO
                logEvent(`📈 Firma prywatna ${company.name} decyduje się na wejście na Giełdę Brązową!`, 'market');
                // TODO: Logika IPO podobna do `runMunicipalCompanyLogic`, ale:
                // 1. Tworzy zwykłą spółkę (bez `cannotGoBankrupt`).
                // 2. Fundacja (FPF) otrzymuje `cityOwnership` procent akcji.
                // 3. Reszta akcji trafia na rynek.
            } else if (decision < 0.4) { // 20% szans na wejście do inkubatora
                logEvent(`🚀 Firma prywatna ${company.name} wchodzi do inkubatora jako startup!`, 'market');
                // TODO: Logika tworzenia `Startupu` na bazie `company.value`.
            } else {
                // 60% szans - pozostaje prywatna, ale rośnie
                company.value *= 1.2; // Wartość rośnie o 20%
                city.infrastructureLevel += 0.01; // Stały, mały bonus do infrastruktury
            }
        }
    });
}

function changeReputation(entityId, stockSymbol, change) {
    const stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock || !stock.reputation || stock.reputation[entityId] === undefined) return;

    let finalChange = change;

    // Jeśli relacje są przyjacielskie, kara jest mniejsza
    if (change < 0 && stock.reputation[entityId] >= REPUTATION_LEVELS.POSITIVE) {
        finalChange *= 0.8; // Zmniejszenie kary o 20%
    }

    stock.reputation[entityId] += finalChange;

    // Ograniczenie reputacji do przedziału -100 do 100
    if (stock.reputation[entityId] > 100) stock.reputation[entityId] = 100;
    if (stock.reputation[entityId] < -100) stock.reputation[entityId] = -100;

    // --- NOWY BLOK: Charyzma Lvl 2 i Lvl 5 (Egzekwowanie podłogi reputacji) ---
    if (entityId === 'player') {
        const charismaLevel = getSkillLevel('charisma');
        let reputationFloor = -100; // Domyślna podłoga

        const holding = playerPortfolio[stockSymbol];

        // Lvl 5: Jeśli masz 70%+, podłoga = 0 (ma wyższy priorytet)
        if (charismaLevel >= 5 && holding && (holding.shares / stock.totalShares) > 0.70) {
            reputationFloor = 0;
        }
        // Lvl 2: W przeciwnym razie, jeśli masz Lvl 2+, podłoga = 10
        else if (charismaLevel >= 2) {
            reputationFloor = 10;
        }

        // Zastosuj obliczoną podłogę
        if (stock.reputation[entityId] < reputationFloor) {
            stock.reputation[entityId] = reputationFloor;
        }
    }
    // --- KONIEC NOWEGO BLOKU ---

    console.log(`[REPUTACJA] Relacje ${entityId} z ${stockSymbol} zmieniły się o ${finalChange.toFixed(1)} i wynoszą teraz ${stock.reputation[entityId].toFixed(1)}`);
}

function applyPriceEffect(stockSymbol, percentageChange, eventType, eventCategory = 'company') {
    const stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock) return;

    // ===>>> NOWY BLOK: TARCZA PR (PR SHIELD CHECK) <<<===
    if (percentageChange < 0 && stock.prShieldExpiry && Date.now() < stock.prShieldExpiry) {
        logEvent(`🛡️ Tarcza PR (artykuł sponsorowany) ochroniła ${stock.name} przed negatywnym zdarzeniem!`, 'review');
        showToast(`Pozytywny PR ochronił ${stock.name} przed negatywnym eventem!`, 'success');
        
        // Opcjonalnie: Tarcza zużywa się po jednej obronie
        // stock.prShieldExpiry = null; 
        
        return; // ZATRZYMAJ negatywny efekt
    }

    if (
        percentageChange < 0 &&
        eventCategory === 'company' &&
        stock.ceo?.traits?.some(t => t.id === 'czlowiek_z_ludu')
    ) {
        logEvent(`🛡️ [Człowiek z Ludu] Reputacja prezesa ${stock.name} ochroniła firmę przed negatywnymi skutkami zdarzenia!`);
        return; 
    }
    if (
        percentageChange < 0 &&
        (eventCategory === 'market' || eventCategory === 'sector') &&
        stock.ceo?.traits?.some(t => t.id === 'tytan_przemyslu')
    ) {
        logEvent(`🛡️ [Tytan Przemysłu] Niewzruszona pozycja ${stock.name} na rynku uchroniła ją przed negatywnym zdarzeniem!`);
        return; 
    }

    // --- Sekcja 2: Obliczanie modyfikatorów ---
    const oldPrice = stock.price;
    let finalPercentageChange = percentageChange;

    // Modyfikatory wynikające z cech CEO
    if (stock.ceo && stock.ceo.traits) {
        stock.ceo.traits.forEach(trait => {
            switch (trait.id) {
                case 'prowiec':
                    if (finalPercentageChange > 0) finalPercentageChange *= 1.03;
                    break;
                case 'doswiadczony':
                    if (finalPercentageChange > 0) finalPercentageChange *= 1.01;
                    else finalPercentageChange *= 0.85;
                    break;
                case 'reakcjonista':
                    finalPercentageChange *= 1.10;
                    break;
                case 'stoik':
                    finalPercentageChange *= 0.75;
                    break;
                case 'legenda':
                    if (finalPercentageChange < 0) finalPercentageChange *= 0.50;
                    break;
                case 'ryzykant':
                    if (finalPercentageChange > 0) finalPercentageChange *= 1.05;
                    break;
                case 'plotkarz':
                    if (eventCategory === 'company') finalPercentageChange *= 1.10;
                    break;
            }
        });
    }

    // Modyfikatory dla negatywnych zdarzeń (spółki państwowe, umiejętności gracza)
    if (finalPercentageChange < 0) {
        let totalResistance = 0;
        if (stock.isStateOwned && stock.eventResistance > 0) {
            totalResistance += stock.eventResistance;
        }
        if (stock.isStateOwned && stock.ceo?.traits?.some(t => t.id === 'lojalista')) {
            totalResistance += 0.20;
        }
        if (totalResistance > 0) {
            finalPercentageChange *= (1 - Math.min(1, totalResistance));
        }

        // Umiejętność gracza "Żelazne Nerwy"
        const nervesLevel = getSkillLevel('ironNerves');
        if (nervesLevel > 0) {
            let nervesModifier = 1.0;
            switch (nervesLevel) {
                case 1: nervesModifier = 0.95; break;
                case 2: nervesModifier = 0.88; break;
                case 3: nervesModifier = 0.80; break;
            }
            finalPercentageChange *= nervesModifier;
        }

        // Umiejętność gracza "Charyzma"
        const charismaLevel = getSkillLevel('charisma'); 
        if (charismaLevel > 0) {
            let charismaModifier = 1.0;
            if (charismaLevel >= 4) { // Poziom 4 (stara nazwa) -> teraz Lvl 3+
                charismaModifier = 0.50; // 50% redukcji
            } else if (charismaLevel >= 1) {
                charismaModifier = 0.85; // 15% redukcji
            }
            finalPercentageChange *= charismaModifier;
        }
    }

    // --- Sekcja 3: Zastosowanie finalnej zmiany ceny ---
    stock.price *= (1 + finalPercentageChange);
    if (stock.price < 0.01) {
        stock.price = 0.01;
    }

    // Każde zdarzenie lekko zwiększa zmienność — najwyżej do 2× zmienności bazowej (bez narastania w nieskończoność).
    if (!Number.isFinite(stock.baseVolatilityFactor)) stock.baseVolatilityFactor = stock.volatilityFactor;
    stock.volatilityFactor = Math.min(stock.baseVolatilityFactor * 2, stock.volatilityFactor * 1.05);

    console.log(`Efekt cenowy dla ${stock.name}: ${oldPrice.toFixed(2)} -> ${stock.price.toFixed(2)} (finalna zmiana: ${(finalPercentageChange * 100).toFixed(2)}%)`);
}

function checkForPotentialMA() {
    const potentialInitiators = [
        ...aiCompetitors.filter(ai => ai.cash > 50000 && ai.personality !== 'market_maker'), 
        ...stocks.filter(s => s.assetType === 'Holding' && s.cash > 100000), 
        ...commercialBanks.filter(b => b.type === BANK_TYPES.INVESTMENT && b.isActive && b.cash > 1000000)
    ];
    const potentialTargets = stocks.filter(s =>
        !s.assetType && !s.isBankrupt && !s.mergerProcess && !s.isSubsidiaryOf && exchanges[s.exchange].level < 3
    );
    if (potentialInitiators.length === 0 || potentialTargets.length === 0) return;

    const initiator = getRandomElement(potentialInitiators);
    const initiatorObject = (initiator.id ? initiator : { id: initiator.symbol, name: initiator.name, cash: initiator.cash, portfolio: initiator.holdingPortfolio || initiator.stockPortfolio });

    // --- Ustalenie strategii (logika bez zmian) ---
    let checkChance = 0.05; 
    let preferredType = 'przejęcie';
    // ===>>> ZMIANA 1: Domyślne finansowanie <<<===
    let preferredFinancing = 'cash'; // Domyślnie gotówka
    let targetFilter = (target) => target.financialHealth < 0; 

    if (initiator.personality) { 
        // Cele wg charakteru bota: agresywni — tanie i słabe, spokojni — rentowne z dywidendą, wieloryb — duże.
        switch (initiator.personality) {
            case 'reckless':
            case 'yolo_trader':
                checkChance = 0.08;
                targetFilter = target => target.financialHealth < 0;
                break;
            case 'calm':
            case 'dividend_chaser':
                checkChance = 0.03;
                targetFilter = target => target.financialHealth >= 1 && (target.lastDividend?.yield || 0) > 0;
                break;
            case 'whale':
                checkChance = 0.06;
                targetFilter = target => target.price * target.totalShares > 50e6;
                break;
            case 'pro_investor':
                checkChance = 0.05;
                targetFilter = target => target.fundamentals?.fairValue > target.price * 1.2;
                break;
            default:
                break;
        }
    } else if (initiator.assetType === 'Holding') {
        checkChance = 0.10;
        targetFilter = (target) => (target.sector || []).some(s => (initiator.specializationSectors || initiator.sector || []).includes(s));
    } else if (initiator.type === BANK_TYPES.INVESTMENT) {
        checkChance = 0.12;
        preferredType = 'fuzja'; 
        preferredFinancing = 'stockSwap'; 
        targetFilter = (target) => target.financialHealth >= 1; 
    }

    if (Math.random() > checkChance * (1 + 2 * getCrowdingPressure())) return; // B5: zatłoczony rynek sprzyja konsolidacji

    // --- Wybór celu (logika bez zmian) ---
    const eligibleTargets = potentialTargets.filter(target =>
        target.symbol !== initiatorObject.id && targetFilter(target)
    );
    if (eligibleTargets.length === 0) return;
    
    const targetStock = getRandomElement(eligibleTargets);
    
    // ===>>> ZMIANA 2: Sprawdzenie finansowania dla AI <<<===
    if (preferredType === 'przejęcie') {
        const offerPremium = getRandomInRange(0.15, 0.35);
        const totalCost = (targetStock.price * (1 + offerPremium)) * targetStock.totalShares;

        // Sprawdź, czy inicjatora stać na gotówkę
        if (initiatorObject.cash < totalCost) {
            // Nie stać na gotówkę. Sprawdź, czy może wziąć LBO.
            const initiatorStock = stocks.find(s => s.symbol === initiatorObject.id); // Potrzebny obiekt stock dla financialHealth
            const initiatorHealth = initiatorStock ? initiatorStock.financialHealth : (initiator.personality ? 2 : 0); // Uproszczenie dla AI

            if (initiatorHealth >= 0) { // Jeśli ma co najmniej neutralną kondycję
                preferredFinancing = 'lbo'; // Zdecyduj się na LBO
                console.log(`[M&A AI] ${initiatorObject.name} nie ma gotówki, spróbuje LBO na ${targetStock.symbol}.`);
            } else {
                // Nie stać go na gotówkę i jest w złej kondycji - odpuść
                console.log(`[M&A AI] ${initiatorObject.name} odpuszcza przejęcie ${targetStock.symbol} (brak środków i zła kondycja na LBO).`);
                return; // Zakończ
            }
        }
    }
    // ===>>> KONIEC ZMIANY 2 <<<===


    // Finalna szansa na zainicjowanie procesu
    let ceoModifier = 1.0;
    const initiatorStock = stocks.find(s => s.symbol === initiatorObject.id); 
    if (initiatorStock && initiatorStock.ceo?.traits?.some(t => t.id === 'ekspansjonista')) {
        ceoModifier = 2.0; 
    }

    if (Math.random() < 0.5 * ceoModifier) {
        console.log(`[M&A AI] ${initiatorObject.name} (${initiatorObject.id}) inicjuje ${preferredType} celu ${targetStock.symbol} (Finansowanie: ${preferredFinancing})!`);
        
        let finalInitiatorStock = initiatorStock;
        if (initiator.personality) {
             const controlledStockSymbol = Object.keys(initiator.portfolio).find(sym => {
                 const stock = stocks.find(s => s.symbol === sym);
                 return stock && !stock.assetType && (initiator.portfolio[sym].shares / stock.totalShares > 0.5);
             });
             finalInitiatorStock = stocks.find(s => s.symbol === controlledStockSymbol);
        }
        
        if (finalInitiatorStock) {
            // Przekaż wybraną metodę finansowania
            initiateMergerProcess(finalInitiatorStock, targetStock, preferredType, preferredFinancing, getRandomInRange(0.15, 0.35));
        }
    }
}

function reviewCompanyPlacements() {
    console.log(`[PRZEGLĄD RYNKU] Uruchomiono cykliczny przegląd...`);
    let promotionOccurred = false;

    stocks.forEach(stock => {
        if (stock.assetType === 'REIT' || stock.assetType === 'Startup' || stock.isBankrupt) {
            return;
        }

        const currentExchangeKey = stock.exchange;
        const currentLevel = exchanges[currentExchangeKey].level;
        let correctExchangeKey = null;

        for (const key in exchanges) {
            const exchange = exchanges[key];
            if (stock.price >= exchange.minPrice && stock.price < exchange.maxPrice) {
                correctExchangeKey = key;
                break;
            }
        }
        // Obsługa spółek z ceną powyżej progu PLATINUM
        if (stock.price >= exchanges['PLATINUM'].maxPrice) {
             correctExchangeKey = 'PLATINUM';
        }


        if (!correctExchangeKey || correctExchangeKey === currentExchangeKey) return;
        // Giełdy elitarne przydziela ranking kapitalizacji (assignEliteExchanges, finance.js).
        if (exchanges[currentExchangeKey]?.rankBased && correctExchangeKey === 'PLATINUM') return;

        promotionOccurred = true;
        const newExchange = exchanges[correctExchangeKey];

        stock.exchange = correctExchangeKey;

        let message = '';
        
        // --- KLUCZOWA POPRAWKA JEST TUTAJ ---
        // Zamiast wywoływać starą, nieistniejącą funkcję...
        // ...wywołujemy nową, która regeneruje części składowe opisu.
        initializeDescriptionParts(stock); 
        // --- KONIEC POPRAWKI ---

        if (newExchange.level > currentLevel) { // Logika dla AWANSU
            const magnitude = (Math.random() * 0.05) + 0.03;
            message = `📈 AWANS: ${stock.name} przechodzi na giełdę "${newExchange.name}"!`;
            applyPriceEffect(stock.symbol, magnitude, 'positive', 'review');
            
            const newLimitRange = SHARE_LIMIT_RANGES[correctExchangeKey];
            if (newLimitRange) stock.maxShares = getRandomIntInRange(newLimitRange.min, newLimitRange.max);

            if (currentLevel === 0) {
                setCompanyDividendPolicy(stock, getRandomElement(['Growth', 'Growth', 'Balanced', 'Balanced', 'Aggressive', 'Total'])); // „Pełna” rzadko (audyt A4)
                message += ` Spółka ustala swoją politykę dywidendową na: ${getDividendPolicyLabel(stock.dividendPolicy)}.`;
            } else if (Math.random() < 0.25) {
                const oldPolicy = stock.dividendPolicy;
                if (!stock.dividendPolicyLockedByOwner) setCompanyDividendPolicy(stock, getRandomElement(DIVIDEND_POLICY_ORDER));
                if (oldPolicy !== stock.dividendPolicy) {
                    message += ` Zarząd rewiduje strategię i zmienia politykę dywidendową na: ${getDividendPolicyLabel(stock.dividendPolicy)}!`;
                }
            }
        } else { // Logika dla SPADKU
            const magnitude = ((Math.random() * 0.05) + 0.03) * -1;
            message = `📉 SPADEK: ${stock.name} spada na giełdę "${newExchange.name}"...`;
            applyPriceEffect(stock.symbol, magnitude, 'negative', 'review');

            const newLimitRange = SHARE_LIMIT_RANGES[correctExchangeKey];
            if (newLimitRange) stock.maxShares = getRandomIntInRange(newLimitRange.min, newLimitRange.max);
        }

        logEvent(message, 'review');
    });

    if (promotionOccurred) {
        displayStocks(getCurrentInputValues());
        checkPlayerTierUpgrade();
    }
}

function cleanupBankruptStocks(speedMultiplier) {
    const oneMinuteInGame = 60000 / speedMultiplier;
    const now = Date.now();

    // stocks.filter tworzy nową tablicę, więc musimy nadpisać starą
    const originalCount = stocks.length;
    const removed = [];
    stocks = stocks.filter(stock => {
        if (!stock.isBankrupt) {
            return true; // Zostawiamy aktywne spółki
        }
        // Jeśli spółka jest bankrutem, sprawdzamy, czy minął już czas
        if ((now - stock.timeOfDeath) < oneMinuteInGame) return true;
        removed.push(stock);
        return false;
    });
    // P3: usunięta spółka nie zostawia „duchów” — ani swoich pakietów, ani cudzych pakietów swoich akcji (symbol może wrócić).
    for (const stock of removed) { releaseCompanyStakes(stock); purgeSymbolHolders(stock.symbol); }

    if (stocks.length < originalCount) {
        console.log("Usunięto zbankrutowane spółki z listy.");
    }
}

function finalizeStartup(startup) {
    const symbol = startup.symbol;
    logEvent(`[START-UP] Nadszedł dzień sądu dla ${startup.name}!`, 'review');

    // D1: startup operatora rynku internetowego ma gwarancję debiutu.
    if (startup.operatorStartup) {
        startup.isScam = false;
        startup.successChance = Math.max(startup.successChance || 0, 1);
    }

    // Scenariusz oszustwa jest sprawdzany na samym początku
    if (startup.isScam) {
        showToast(`OSZUSTWO! Start-up ${startup.name} okazał się piramidą finansową!`, 'error', 5000);
        removeStartup(startup, 0, 0); // Utrata 100%
        return; // Zakończ funkcję
    }

    // KROK 1: Obliczamy ostateczną szansę i wykonujemy rzut kostką
    let finalSuccessChance = startup.successChance;
    if (getSkillLevel('startupInvestor') >= 2 && playerPortfolio[symbol]) {
        finalSuccessChance += 0.05;
    }
    const roll = Math.random();

    // KROK 2: Rozbudowana logika sprawdzania wyników
    if (roll > finalSuccessChance) {
        // --- GAŁĄŹ PORAŻKI ---
        if (finalSuccessChance > 0.40 && roll < finalSuccessChance + 0.15) {
            // Scenariusz "O WŁOS": losujemy między Opóźnieniem a Komplikacjami
            if (Math.random() < 0.5) {
                // --- WYNIK: OPÓŹNIENIE ---
                showToast(`Opóźnienie... ${startup.name} potrzebuje więcej czasu.`, 'warning', 4000);
                logEvent(`[START-UP] ⏳ Niewiele brakowało! Projekt ${startup.name} wraca do fazy rozwoju.`, 'review');
                startup.stage = 'development';
                startup.developmentProgress = 50; // Cofamy postęp do 50%
                startup.fundingGoal *= 1.15; // Koszty rosną o 15% na poprawki
                startup.successChance -= 0.10; // Szansa na sukces przy następnej próbie jest niższa
                logEvent(`Cel finansowy ${startup.name} wzrósł do ${startup.fundingGoal.toLocaleString('pl-PL')} PLN!`);
            } else {
                // --- WYNIK: KOMPLIKACJE FINANSOWE ---
                showToast(`Komplikacje! ${startup.name} potrzebuje natychmiastowego dofinansowania!`, 'warning', 5000);
                logEvent(`[START-UP] 💸 ${startup.name} napotkał problemy finansowe na ostatniej prostej!`, 'review');
                startup.stage = 'financial_complications';
                startup.rescueGoal = getRandomIntInRange(1000, 10000);
                startup.rescueCurrent = 0;
                startup.rescueTimeLeft = 120000; // 2 minuty na zebranie środków
            }
        } else {
            // Scenariusz "DOTKLIWA PORAŻKA": losujemy między 3 typami porażki
            const failureRoll = Math.random();
            if (failureRoll < 0.50) {
                // --- WYNIK: PORAŻKA (50% szans) ---
                showToast(`Porażka. ${startup.name} nie wchodzi na giełdę.`, 'error', 4000);
                logEvent(`[START-UP] 📉 Projekt ${startup.name} upadł, ale udało się odzyskać część środków.`, 'review');
                removeStartup(startup, 0.5, 0.7); // Zwrot 50-70%
            } else if (failureRoll < 0.85) {
                // --- WYNIK: KRYTYCZNA PORAŻKA (35% szans) ---
                showToast(`Krytyczna porażka! Prawie cała inwestycja w ${startup.name} przepadła.`, 'error', 5000);
                logEvent(`[START-UP] 🔥 Projekt ${startup.name} zakończył się dotkliwą porażką finansową.`, 'review');
                removeStartup(startup, 0.05, 0.15); // Zwrot 5-15%
            } else {
                // --- WYNIK: BANKRUCTWO (15% szans) ---
                showToast(`BANKRUCTWO! Inwestycja w ${startup.name} stracona w 100%.`, 'error', 5000);
                logEvent(`[START-UP] 💥 Totalne bankructwo ${startup.name}! Inwestorzy tracą wszystko.`, 'review');
                removeStartup(startup, 0, 0); // Zwrot 0%
            }
        }
    } else {
        // --- GAŁĄŹ SUKCESU ---
        let successMultiplier, successType, toastType;

        if (startup.isPrivatized) {
            // --- WYNIK DLA START-UPU SPRYWATYZOWANEGO ---
            successMultiplier = getRandomInRange(1.1, 2.5); // Znacznie niższy, ale gwarantowany zysk
            successType = 'Prywatyzacja Zakończona Sukcesem';
            toastType = 'default';
        } else if (roll < 0.10) { // Zmniejszamy szansę na krytyczny sukces
            // --- WYNIK: KRYTYCZNY SUKCES (NERF) ---
            successMultiplier = getRandomInRange(8, 12); // Było 15-30
            successType = 'Krytyczny Sukces';
            toastType = 'success';
        } else if (roll < finalSuccessChance * 0.5) {
            // --- WYNIK: CICHY SUKCES (NERF) ---
            successMultiplier = getRandomInRange(3, 7); // Było 5-15
            successType = 'Cichy Sukces';
            toastType = 'success';
        } else {
            // --- WYNIK: DEBIUT BEZ ECHA (NERF) ---
            successMultiplier = getRandomInRange(1.1, 2.8); // Było 1-5
            successType = 'Debiut bez Echa';
            toastType = 'default';
        }

        showToast(`${successType}! ${startup.name} wchodzi na giełdę!`, toastType, 4000);
        logEvent(`[IPO] ${successType} dla ${startup.name}! Mnożnik wyceny: x${successMultiplier.toFixed(1)}`, 'review');

        // Wywołanie funkcji pomocniczej, która zajmie się całym procesem IPO
        handleSuccessfulIPO(startup, successMultiplier);
    }
    displayStartups(getCurrentStartupInputValues());
}

function processBankStartupSponsorship() {
    const activeBanks = commercialBanks.filter(b => b.isActive && (b.type === BANK_TYPES.INVESTMENT || b.type === BANK_TYPES.UNIVERSAL));
    if (activeBanks.length === 0) return;

    const potentialStartups = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding' && !s.isPrivatized && !s.isScamDetected);
    if (potentialStartups.length === 0) return;

    activeBanks.forEach(bank => {
        // Niska szansa (np. 2%) w każdym cyklu tygodniowym na próbę sponsorowania
        if (Math.random() < 0.02 && bank.cash > 50000) { // Bank musi mieć trochę gotówki
            const targetStartup = getRandomElement(potentialStartups);
            const investmentAmount = Math.round(Math.min(getRandomIntInRange(5000, 20000) * getStartupFundingFactor(), Math.max(0, targetStartup.fundingGoal - targetStartup.currentFunding))); // Kwota sponsorowania (D2: mniej na nasyconym rynku, B6: do celu)
            if (!(investmentAmount >= 100)) return;

            if (bank.cash >= investmentAmount) {
                bank.cash -= investmentAmount;
                targetStartup.currentFunding += investmentAmount;

                // Bank pojawia się na liście fundatorów
                targetStartup.investors[bank.name] = (targetStartup.investors[bank.name] || 0) + investmentAmount;

                // Bank otrzymuje "prawo do udziałów" (zapisujemy kwotę)
                if (!bank.startupInvestments) bank.startupInvestments = {};
                bank.startupInvestments[targetStartup.symbol] = (bank.startupInvestments[targetStartup.symbol] || 0) + investmentAmount;

                // Zwiększ szansę na sukces startupu
                const successChanceBonus = (investmentAmount / targetStartup.fundingGoal) * 0.03; // Mniejszy bonus niż od gracza/AI
                targetStartup.successChance += successChanceBonus;
                if (targetStartup.successChance > 1) targetStartup.successChance = 1;

                // Zwiększ szansę na wrogie przejęcie w przyszłości (jeśli wejdzie na giełdę)
                if (!targetStartup.acquisitionTargetChance) targetStartup.acquisitionTargetChance = 0;
                targetStartup.acquisitionTargetChance += 0.05; // +5% szansy

                logEvent(`🏦 Bank ${bank.name} sponsoruje startup ${targetStartup.name} kwotą ${investmentAmount.toLocaleString()} PLN!`, 'market');
                
                // Odśwież widok startupów, jeśli otwarty
                if (document.getElementById('startup-incubator-panel').style.display === 'block') {
                    displayStartups(getCurrentStartupInputValues());
                }
            }
        }
    });
}

function executePawnLoan(targetEntity, pawnShop, targetStock, quantity, loanAmount, newInterestRate, durationWeeks) {
    const entityId = (targetEntity === 'player') ? 'player' : targetEntity.id;
    const portfolio = (targetEntity === 'player') ? playerPortfolio : targetEntity.portfolio;
    const holding = portfolio[targetStock.symbol];

    // 1. Sprawdź, czy akcje są nadal dostępne (nie zostały sprzedane)
    const availableShares = holding.shares - (holding.lockedShares || 0);
    if (availableShares < quantity) {
        if (targetEntity === 'player') showToast("Transakcja anulowana. Sprzedałeś akcje, zanim oferta została przyjęta.", 'error');
        return;
    }

    // 2. Transakcja: Lombard płaci, Dłużnik dostaje gotówkę
    pawnShop.cash -= loanAmount;
    if (targetEntity === 'player') playerCash += loanAmount;
    else targetEntity.cash += loanAmount;

    // 3. Stwórz nowy dług lombardowy dla dłużnika
    const maturityDate = Date.now() + (durationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const totalRepaymentAmount = loanAmount * (1 + (newInterestRate * (durationWeeks / 52))); // Całkowita kwota do spłaty (kapitał + odsetki)

    const newLoan = {
        id: `pawn_${Date.now()}_${entityId}`,
        bankId: null, // To nie jest kredyt bankowy
        bankName: pawnShop.name, // Wierzyciel
        collectorSymbol: pawnShop.symbol, // Używamy tego pola do identyfikacji
        initialAmount: loanAmount,
        amount: totalRepaymentAmount, // Całkowita kwota do spłaty
        interestRate: newInterestRate,
        weeklyPayment: totalRepaymentAmount, // Cała kwota jest płatna na koniec
        maturityDate: maturityDate,
        collateral: { symbol: targetStock.symbol, quantity: quantity },
        isPawnLoan: true // Specjalna flaga
    };

    if (!targetEntity.loans) targetEntity.loans = [];
    targetEntity.loans.push(newLoan);

    // 4. Zablokuj akcje dłużnika
    if (!holding.lockedShares) holding.lockedShares = 0;
    holding.lockedShares += quantity;

    logEvent(`💰 ${pawnShop.name} udzielił pożyczki ${loanAmount.toFixed(2)} PLN pod zastaw ${quantity} akcji ${targetStock.symbol}. Termin spłaty: ${durationWeeks} tyg.`, 'review');
    
    if (targetEntity === 'player') {
        showToast("Otrzymano gotówkę z lombardu! Akcje zostały zablokowane.", 'success');
        displayCash();
        displayPortfolio();
    }
}

function executeDebtTransfer(collectorStock, targetEntity, loan, newInterestRate) {
    // 1. Collector (WRONA) płaci bankowi
    collectorStock.cash -= loan.amount;
    collectorStock.balanceSheet.assets += loan.amount; // Dług staje się aktywem windykatora

    // 2. Bank otrzymuje pieniądze i zamyka kredyt
    const bank = commercialBanks.find(b => b.id === loan.bankId);
    if (bank) {
        bank.cash += loan.amount;
        // Usuń kredyt z portfolio banku
        const portfolioKey = (targetEntity === 'player') ? 'player' : targetEntity.id;
        if (bank.loanPortfolio[portfolioKey]) {
            const loanIndex = bank.loanPortfolio[portfolioKey].findIndex(l => l.id === loan.id);
            if (loanIndex > -1) {
                bank.loanPortfolio[portfolioKey].splice(loanIndex, 1);
            }
        }
    }

    // 3. Dłużnik (Gracz/AI) ma zmodyfikowany dług
    loan.bankId = null; // Już nie jest dłużny bankowi
    loan.bankName = collectorStock.name; // Nowy wierzyciel
    loan.collectorSymbol = collectorStock.symbol; // Symbol wierzyciela (dla płatności)
    loan.interestRate = newInterestRate; // NOWE, WYŻSZE OPROCENTOWANIE
    loan.missedPayments = 0; // Windykator daje "czystą kartę"
    // Przelicz ratę
    const loanDurationWeeks = Math.round((loan.maturityDate - Date.now()) / (BASE_DELAYS.weekly / currentSpeedMultiplier));
    const weeklyRate = loan.interestRate / 52;
    if (loanDurationWeeks > 0 && weeklyRate > 0) {
        loan.weeklyPayment = loan.amount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);
    } else {
        loan.weeklyPayment = loan.amount * 0.05; // Awaryjna rata
    }

    const entityName = (targetEntity === 'player') ? "Twój" : `Bota ${targetEntity.name}`;
    logEvent(`🔔 ${collectorStock.name} przejął ${entityName} dług w wysokości ${loan.amount.toFixed(2)} PLN. Nowe oprocentowanie: ${(newInterestRate * 100).toFixed(1)}%.`, 'review');

}

function findBestLenderBank(initiator, loanAmount) {
    // Banki korporacyjne i uniwersalne są najlepsze do LBO
    const potentialLenders = commercialBanks.filter(b =>
        b.isActive &&
        (b.type === BANK_TYPES.CORPORATE || b.type === BANK_TYPES.UNIVERSAL) &&
        b.cash > loanAmount * 1.5 // Bank musi mieć nadwyżkę gotówki
    );

    if (potentialLenders.length === 0) {
        console.warn(`[LBO] Brak banków z wystarczającą płynnością (${loanAmount.toFixed(0)}) dla ${initiator.symbol}.`);
        return null; // Brak chętnych banków
    }

    // Prosta logika: wybierz bank z największą ilością gotówki
    potentialLenders.sort((a, b) => b.cash - a.cash);
    const lender = potentialLenders[0];

    // Sprawdź kondycję biorącego kredyt
    if (initiator.financialHealth < -1) {
        console.log(`[LBO] Bank ${lender.name} odrzucił wniosek ${initiator.symbol} o LBO z powodu złej kondycji finansowej.`);
        return null; // Bank odrzuca zbyt ryzykownego klienta
    }
    
    console.log(`[LBO] Bank ${lender.name} zgodził się sfinansować LBO dla ${initiator.symbol}.`);
    return lender;
}

function removeStockFromGame(symbol) {
    releaseCompanyStakes(stocks.find(s => s.symbol === symbol)); // pakiety usuwanej spółki (audyt A1)
    // 1. Usuń z głównej listy `stocks`
    const index = stocks.findIndex(s => s.symbol === symbol);
    if (index > -1) {
        stocks.splice(index, 1);
    }

    // 2. Usuń z portfela gracza
    if (playerPortfolio[symbol]) {
        if (typeof notePlayerPositionLoss === 'function') notePlayerPositionLoss(symbol, playerPortfolio[symbol].shares, 'bankructwo spółki — akcje są bezwartościowe');
        delete playerPortfolio[symbol];
    }

    // 3. Usuń z portfeli AI
    aiCompetitors.forEach(ai => {
        if (ai.portfolio[symbol]) {
            delete ai.portfolio[symbol];
        }
    });

    // 4. Usuń z portfeli Holdingów
    stocks.forEach(s => {
        if (s.assetType === 'Holding' && s.holdingPortfolio[symbol]) {
            delete s.holdingPortfolio[symbol];
        }
    });

    // 5. Usuń z portfeli Banków Inwestycyjnych
    commercialBanks.forEach(bank => {
        if (bank.stockPortfolio[symbol]) {
            delete bank.stockPortfolio[symbol];
        }
    });

    if (typeof settleEtfHoldings === 'function') settleEtfHoldings(symbol, 0); // ETF-y tracą pakiet (bankructwo)
    purgeSymbolHolders(symbol); // P3: pakiety spółek, funduszy botów i portfela prywatnego

    console.log(`[M&A] Spółka ${symbol} została całkowicie usunięta z gry.`);
}

/**
 * P3: usuwa wszystkie pozycje w akcjach o danym symbolu (spółka zniknęła z gry). Bez tego symbol użyty ponownie
 * (nowy startup, nowa spółka zależna) dziedziczy „duchy posiadaczy” — akcje w obrocie ≠ posiadacze.
 */
function purgeSymbolHolders(symbol) {
    if (!symbol) return;
    for (const owner of stocks) {
        if (owner.equityStakes && symbol in owner.equityStakes) delete owner.equityStakes[symbol];
        if (owner.holdingPortfolio && symbol in owner.holdingPortfolio) delete owner.holdingPortfolio[symbol];
    }
    for (const manager of corporation?.managers || []) if (manager.fund?.portfolio?.[symbol]) delete manager.fund.portfolio[symbol];
    for (const ai of aiCompetitors) if (ai.portfolio?.[symbol]) delete ai.portfolio[symbol];
    for (const bank of commercialBanks) if (bank.stockPortfolio?.[symbol]) delete bank.stockPortfolio[symbol];
    if (playerWallet?.portfolio?.[symbol]) delete playerWallet.portfolio[symbol];
    if (typeof etfs !== 'undefined') for (const etf of etfs) if (etf.holdings && symbol in etf.holdings) delete etf.holdings[symbol];
}


// TO NA SAMYM DOLE

if (typeof window !== 'undefined') {
    try {
        if (typeof generateNewStartup === 'function') {
            window.generateNewStartup = generateNewStartup;
        } else {
            console.warn('[diag] generateNewStartup nie jest funkcją w tej chwili, nie przypisano do window.');
        }
    } catch (e) {
        console.warn('[diag] Nie udało się przypisać generateNewStartup do window:', e);
    }
}

if (typeof window !== 'undefined') {
    try {
        if (typeof initializeDividendEstimates === 'function') {
            window.initializeDividendEstimates = initializeDividendEstimates;
        } else {
            console.warn('[diag] initializeDividendEstimates nie jest funkcją w tej chwili, nie przypisano do window.');
        }
    } catch (e) {
        console.warn('[diag] Nie udało się przypisać initializeDividendEstimates do window:', e);
    }
}

function initializeConstructionCompanies() {
    CONSTRUCTION_COMPANIES_DATA.forEach(data => {
        const tempSymbol = data.name.substring(0, 3).toUpperCase() + 'B';
        const existing = stocks.find(s => s.symbol === tempSymbol || s.name === data.name);
        
        if (existing) {
            if (!existing.sector.includes('Budowlany')) existing.sector.push('Budowlany');
            if (!existing.constructionStats) {
                existing.constructionStats = { experience: getRandomIntInRange(10, 80), currentProjects: 0, wonTenders: 0 };
                updateConstructionCapacity(existing);
            }
            if (!existing.departments) initializeDepartments(existing);
            if (!existing.bankAccountId) assignBankToCompany(existing);
            return;
        }

        // ZMIANA: Losowa liczba akcji zamiast MAX
        const range = SHARE_LIMIT_RANGES[data.exchange];
        const totalShares = getRandomIntInRange(range.min, range.max);

        // ZMIANA: Losowa polityka dywidendowa
        const policies = ['Balanced', 'Aggressive', 'Growth', 'Total'];
        const randomPolicy = getRandomElement(policies);

        const newStock = {
            name: data.name,
            symbol: tempSymbol, 
            price: data.price,
            volatilityFactor: data.volatility,
            exchange: data.exchange,
            totalShares: totalShares,
            maxShares: totalShares, // Na start max = total
            sharesHeld: 0, // pakiet państwa liczony osobno (stateOwnershipPct), poza wolnym obrotem
            sector: data.sector,
            financialHealth: 1,
            // Bilans startowy
            balanceSheet: { assets: data.price * totalShares, liabilities: 0, shareCapital: data.price * totalShares * 0.1, retainedEarnings: data.price * totalShares * 0.9 },
            quarterlyEarnings: 0,
            cash: data.price * totalShares * 0.05, 
            priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
            isStateOwned: data.isStateOwned || false,
            stateOwnershipPct: data.stateOwnershipPct || 0,
            dividendPolicy: randomPolicy, // Zastosowanie losowej polityki
            dividendTimer: getRandomIntInRange(60000, 120000),
            
            constructionStats: {
                experience: getRandomIntInRange(0, 50),
                currentProjects: 0,
                wonTenders: 0
            }
        };
        
        initializeDescriptionParts(newStock);
        generateCEO(newStock);
        initializeDepartments(newStock);
        assignBankToCompany(newStock);
        initializeReputation(newStock);
        
        stocks.push(newStock);
    });
    console.log("[COMPANIES] Sektor budowlany zainicjalizowany (z losowością).");
}

// --- FUNKCJE LOGIKI DZIAŁÓW I INWESTYCJI (Wklej na dole companies.js) ---

function initializeDepartments(stock) {
    // Pomiń typy specjalne, one nie mają działów
    if (stock.assetType || stock.isBankStock) return;

    stock.departments = {
        research: { level: getRandomIntInRange(0, 1) },
        development: { level: getRandomIntInRange(0, 1) },
        economy: { level: getRandomIntInRange(0, 1) }
    };
    stock.activeInvestments = [];
}

function runCorporateLogic() {
    stocks.forEach(stock => {
        if (stock.assetType || stock.isBankrupt || stock.isBankStock) return;

        // Autonaprawa działów
        if (!stock.departments) initializeDepartments(stock);
        if (!stock.departments) return;
        if (!Array.isArray(stock.activeInvestments)) stock.activeInvestments = [];

        // --- 1. Dział Ekonomii ---
        // Lvl 2: Optymalizacja Bankowa (szukanie lepszego oprocentowania)
        if (stock.departments.economy.level >= 2 && Math.random() < 0.02) {
            optimizeBankChoice(stock);
        }

        // --- 2. Dział Rozwoju ---
        if (stock.departments.development.level >= 1) {
            if (countCompanyInvestmentOrders(stock) < stock.departments.development.level) {
                // AI decyduje o inwestycji, jeśli ma nadmiar gotówki
                if (stock.cash > 150000 && Math.random() < 0.03 * getCycleInvestmentAppetite()) {
                    startRandomInvestment(stock);
                }
            }
            processActiveInvestments(stock);
        }

        // --- 3. Dział Badań ---
        // Logika (bonus prędkości i odblokowanie Tier 2) jest sprawdzana w updateResearchProgress i applyTechnology
    });
}

// ============================================
// INWESTYCJE SPÓŁEK — JEDNA ŚCIEŻKA REALIZACJI
// construction / mixed  -> przetarg budowlany (gameCore.js)
// pozostałe rodzaje     -> inwestycja wewnętrzna (activeInvestments)
// ============================================

/** Liczba zamówień spółki w toku: inwestycje wewnętrzne + przetargi + budowy jako zamawiający. */
function countCompanyInvestmentOrders(stock) {
    const key = getEntityKey(stock);
    const internal = Array.isArray(stock.activeInvestments) ? stock.activeInvestments.length : 0;
    const tenders = activeTenders.filter(tender =>
        ['open', 'closed'].includes(tender.status) && getEntityKey(tender.clientCompany) === key
    ).length;
    const projects = constructionProjects.filter(project =>
        !project.settled && getEntityKey(project.tender?.clientCompany) === key
    ).length;

    return internal + tenders + projects;
}

function getInvestmentCostForCompany(stock, investment) {
    const level = Number(stock?.departments?.development?.level) || 0;
    return level >= 3 ? investment.cost * 0.9 : investment.cost;
}

/** Czy spółka może zapłacić kwotę z gotówki lub kredytu (bez wykonywania operacji). */
function canFinanceAmount(stock, amount) {
    const value = Number(amount);
    if (!(value > 0)) return true;

    const cash = Math.max(0, Number(stock?.cash) || 0);
    if (cash >= value) return true;

    const sheet = stock?.balanceSheet;
    if (!sheet) return false;

    const shortfall = value - cash;
    const assets = Math.max(1, Number(sheet.assets) || 0);
    return ((Number(sheet.liabilities) || 0) + shortfall) / (assets + shortfall) < 0.7;
}

/**
 * Zapewnia spółce gotówkę na wydatek: brakującą kwotę pożycza w swoim banku
 * (gotówka i zobowiązania rosną razem). Niczego nie wydaje.
 */
function financeInvestment(stock, amount) {
    const value = Number(amount);
    if (!stock || !Number.isFinite(value)) return false;
    if (value <= 0) return true;

    const cash = Math.max(0, Number(stock.cash) || 0);
    if (cash >= value) return true;
    if (!canFinanceAmount(stock, value)) return false;

    borrowForCompany(stock, value - cash, 'Kredyt inwestycyjny');
    return true;
}

/** Kredyt z banku spółki: gotówka, aktywa i zobowiązania rosną o tę samą kwotę. */
function borrowForCompany(stock, amount, purpose = 'Kredyt') {
    const value = Number(amount);
    if (!stock || !(value > 0)) return 0;

    const bank = getCompanyBank(stock);
    if (bank) bank.cash = (Number(bank.cash) || 0) - value; // bank wypłaca kredyt ze swoich środków

    adjustCompanyCash(stock, value);
    adjustBalanceSheet(stock, { assets: value, liabilities: value });
    recordPayment(bank ? bank.id : 'external:bank_credit', stock, value, purpose);

    return value;
}

/** P3: kredyt ratunkowy — gotówka spółki wraca do zera z buforem 5% straty kwartału. Zwraca kwotę kredytu. */
function coverNegativeCash(stock, quarterResult = 0) {
    if (!stock || stock.assetType || !(Number(stock.cash) < 0)) return 0;
    return borrowForCompany(stock, -Number(stock.cash) + Math.abs(Math.min(0, Number(quarterResult) || 0)) * 0.05 + 1, 'Kredyt ratunkowy na pokrycie ujemnej gotówki');
}

/** Spłata długu: gotówka, aktywa i zobowiązania maleją o tę samą kwotę. */
function repayCompanyDebt(stock, amount) {
    const value = Math.min(Number(amount) || 0, Math.max(0, Number(stock?.cash) || 0), Math.max(0, Number(stock?.balanceSheet?.liabilities) || 0));
    if (!(value > 0)) return 0;

    adjustCompanyCash(stock, -value);
    const bank = getCompanyBank(stock);
    if (bank) bank.cash = (Number(bank.cash) || 0) + value;

    adjustBalanceSheet(stock, { assets: -value, liabilities: -value });
    recordPayment(stock, bank ? bank.id : 'external:bank_credit', value, 'Spłata długu');

    return value;
}

function hasCompanyInvestmentInProgress(stock, investmentId) {
    if ((stock.activeInvestments || []).some(inv => inv.id === investmentId)) return true;
    return typeof hasOpenConstructionOrder === 'function' && hasOpenConstructionOrder(stock, investmentId);
}

/**
 * Jedyny punkt startu inwestycji spółki (AI i decyzje właściciela).
 * @returns {{ok: boolean, message: string}}
 */
function startCompanyInvestment(stock, investmentId, source = 'ai') {
    const investment = getCatalogEntryById(investmentId);
    const fail = message => ({ ok: false, message });

    if (!stock || stock.isBankrupt || !investment) return fail('Nieznana inwestycja.');
    if (!getInvestmentCatalogForCompany(stock).some(item => item.id === investment.id)) {
        return fail('Ta inwestycja nie jest dostępna dla tej spółki.');
    }
    if (!Array.isArray(stock.activeInvestments)) stock.activeInvestments = [];

    const level = Number(stock.departments?.development?.level) || 0;
    if (level < investment.minDevLevel) return fail(`Wymagany poziom działu rozwoju: ${investment.minDevLevel}.`);
    if (countCompanyInvestmentOrders(stock) >= Math.max(1, level)) {
        return fail(`Osiągnięto limit jednoczesnych inwestycji (${Math.max(1, level)}).`);
    }
    if (hasCompanyInvestmentInProgress(stock, investment.id)) return fail('Ta inwestycja jest już w toku.');

    if (CONSTRUCTION_KINDS.includes(investment.kind)) {
        const spec = getConstructionSpec(investment.id);
        const budget = spec.cost * (source === 'owner' ? 1.3 : getRandomInRange(1.2, 1.45));
        const weights = source === 'owner' ? {} : randomTenderWeights(stock);
        const tenderId = requestConstructionTender(stock, investment, budget, weights);

        if (!tenderId) return fail('Nie udało się ogłosić przetargu (limit przetargów, brak finansowania lub zamówienie w toku).');

        logEvent(`🏗️ ${stock.name} ogłasza przetarg na ${spec.name}.`, 'company');
        return { ok: true, message: `Ogłoszono przetarg na: ${spec.name}` };
    }

    const cost = getInvestmentCostForCompany(stock, investment);
    if (!financeInvestment(stock, cost)) return fail(`Brak środków i zdolności kredytowej (koszt: ${cost.toLocaleString('pl-PL')} PLN).`);

    startInternalInvestment(stock, investment, cost);
    return { ok: true, message: `Rozpoczęto projekt: ${investment.name}` };
}

function startInternalInvestment(stock, investment, cost, options = {}) {
    // Wydatek: gotówka -> inwestycja w toku (aktywa bez zmian do czasu zakończenia).
    adjustCompanyCash(stock, -cost);
    recordPayment(stock, 'external:dostawcy_inwestycji', cost, `Inwestycja: ${investment.name}`);

    const project = {
        uid: nextSimulationId('inv'),
        id: investment.id,
        name: options.name || investment.name,
        kind: options.phase === 'equipment' ? 'equipment' : investment.kind,
        phase: options.phase || 'main',
        buildingId: options.buildingId || null,
        durationDays: Math.max(1, Number(options.durationDays ?? investment.durationDays) || 1),
        totalDuration: Math.max(1, Number(options.durationDays ?? investment.durationDays) || 1),
        progress: 0,
        cost,
        data: {
            assetValue: Number(options.assetValue ?? investment.assetValue) || 0,
            incomeBonus: Number(investment.incomeBonus) || 0,
            healthBonus: Number(investment.healthBonus) || 0,
            maintenance: Number(options.maintenance ?? investment.maintenance) || 0
        },
        contractor: null
    };

    stock.activeInvestments.push(project);
    logEvent(`🏢 ${stock.name} rozpoczyna projekt: ${project.name} (koszt: ${cost.toFixed(0)} PLN, ${project.durationDays} dni).`, 'company');

    return project;
}

function startRandomInvestment(stock) {
    const level = Number(stock.departments?.development?.level) || 0;
    const options = getInvestmentCatalogForCompany(stock).filter(item =>
        level >= item.minDevLevel && !hasCompanyInvestmentInProgress(stock, item.id)
    );

    if (options.length === 0) return false;
    return startCompanyInvestment(stock, getRandomElement(options).id, 'ai').ok;
}

/** Etap wyposażenia dla pozycji mieszanych — uruchamiany po odbiorze budowy. */
function onConstructionCompleted(client, project) {
    const item = getCatalogEntryById(project.tender?.buildingType?.id);
    if (!item || item.kind !== 'mixed' || client.isBankrupt) return;

    if (!Array.isArray(client.activeInvestments)) client.activeInvestments = [];

    const cost = Math.round(getInvestmentCostForCompany(client, item) * (1 - item.constructionShare));
    const days = Math.max(1, Math.round(item.durationDays * (1 - item.constructionShare) * 0.5));

    if (!financeInvestment(client, cost)) {
        logEvent(`⚠️ ${client.name}: brak środków na wyposażenie „${item.name}”. Obiekt stoi bez wyposażenia.`, 'company');
        return;
    }

    startInternalInvestment(client, item, cost, {
        phase: 'equipment',
        name: `${item.name} (wyposażenie)`,
        durationDays: days,
        buildingId: `building_${project.id}`,
        assetValue: Math.round((Number(item.assetValue) || 0) * (1 - item.constructionShare)),
        maintenance: Math.round((Number(item.maintenance) || 0) * (1 - item.constructionShare))
    });
}

function processActiveInvestments(stock) {
    if (!Array.isArray(stock.activeInvestments)) return;

    for (let i = stock.activeInvestments.length - 1; i >= 0; i--) {
        const project = stock.activeInvestments[i];
        if (!Number.isFinite(project.totalDuration)) project.totalDuration = Number(project.durationDays) || 1;

        // Wywoływane raz na tydzień gry = 7 dni realizacji.
        project.progress = (Number(project.progress) || 0) + 7;

        if (project.progress >= project.totalDuration) {
            finishInvestment(stock, project);
            stock.activeInvestments.splice(i, 1);
        }
    }
}

function finishInvestment(stock, project) {
    const data = project.data || {};
    const cost = Math.max(0, Number(project.cost) || 0);

    // Aktywuje się co najwyżej koszt; reszta (np. marketing) jest kosztem okresu.
    const capitalized = Math.min(cost, Math.max(0, Number(data.assetValue) || 0));
    const expensed = cost - capitalized;

    if (expensed > 0) {
        adjustBalanceSheet(stock, { assets: -expensed, retainedEarnings: -expensed });
        postPeriodEntry(stock, `investment_${project.uid || project.id}`, { investmentExpense: expensed });
    }

    if (project.phase === 'equipment' && project.buildingId) {
        const building = (stock.portfolio?.buildings || []).find(item => item.id === project.buildingId);
        if (building) {
            building.bookValue += capitalized;
            building.purchasePrice += capitalized;
            building.value = building.bookValue;
            building.income = Number(data.incomeBonus) || 0;
            building.maintenance += Number(data.maintenance) || 0;
            building.equipped = true;
        }
    } else if (data.maintenance > 0) {
        stock.fixedExpenses = (Number(stock.fixedExpenses) || 0) + data.maintenance;
    }

    stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + (Number(data.healthBonus) || 0));

    // Weryfikacja i start działania: wynik kwartalny zamiast stałego bonusu (investments.js).
    const quality = rollVerificationQuality(stock);
    if (quality === 'defects') {
        const fix = Math.round(cost * 0.05);
        adjustCompanyCash(stock, -fix);
        adjustBalanceSheet(stock, { assets: -fix, retainedEarnings: -fix });
    }
    const building = project.phase === 'equipment' && project.buildingId
        ? (stock.portfolio?.buildings || []).find(item => item.id === project.buildingId) : null;
    registerOperatingInvestment(stock, {
        id: project.id, name: project.name,
        cost: cost + (building?.purchasePrice || 0),
        incomeBonus: data.incomeBonus,
        quality,
        fundIncomePct: project.fundIncomePct || 0,
        fundInvested: project.fundInvested || 0,
        lifeQuarters: capitalized > 0 || building ? null : 4
    });
    if (data.incomeBonus > 0 && quality !== 'defects') {
        applyPriceEffect(stock.symbol, data.incomeBonus * 0.2, 'positive', 'company');
    }

    logEvent(`✅ ${stock.name} zakończył projekt: „${project.name}” (aktywowano ${capitalized.toFixed(0)} PLN, koszt okresu ${expensed.toFixed(0)} PLN).`, 'success');
}

function payDividendToShareholders(stock, dividendPerShare) {
    // Obsługa spółek zależnych (transfer do matki)
    if (stock.isSubsidiaryOf) {
        const parentStock = stocks.find(s => s.symbol === stock.isSubsidiaryOf);
        if (parentStock) {
            const totalDividendFromSubsidiary = stock.totalShares * dividendPerShare;
            if (parentStock.cash !== undefined) {
                adjustCompanyCash(parentStock, totalDividendFromSubsidiary);
                adjustBalanceSheet(parentStock, { assets: totalDividendFromSubsidiary, retainedEarnings: totalDividendFromSubsidiary });
            }
            logEvent(`💸 Spółka zależna ${stock.name} przekazuje ${totalDividendFromSubsidiary.toFixed(2)} PLN dywidendy do ${parentStock.name}.`, 'company');
            stock.price = Math.max(stock.price * 0.9, stock.price - dividendPerShare); // odcięcie dywidendy (najwyżej −10%)
            if (stock.price < 0.01) stock.price = 0.01;
            return;
        }
    }

    // Standardowa wypłata
    const taxRateDividend = TAX_RATES.dividend; // Pobieramy z economy.js

    // 1. Wypłata dla Gracza
    if (playerPortfolio[stock.symbol]) {
        let finalDividendPerShare = dividendPerShare;
        const playerRep = stock.reputation ? stock.reputation['player'] : 0;

        // Modyfikatory reputacji
        if (playerRep < REPUTATION_LEVELS.NEGATIVE) finalDividendPerShare *= 0.8;
        else if (playerRep >= REPUTATION_LEVELS.POSITIVE) finalDividendPerShare *= 1.05;

        const grossDividend = playerPortfolio[stock.symbol].shares * finalDividendPerShare;

        if (typeof playerFund !== 'undefined' && playerFund) {
            // Fundusz nie płaci podatku od dywidend — dywidenda podnosi NAV.
            playerCash += grossDividend;
            if (typeof noteCorporateGoal === 'function') noteCorporateGoal('dividends', grossDividend);
            logEvent(`💰 Fundusz otrzymuje ${grossDividend.toFixed(2)} zł dywidendy od ${stock.name}.`, 'review');
        } else {
            // Podatki (San Escobar)
            let playerTaxModifier = 1.0;
            const sanEscobarLvl = getSkillLevel('sanEscobar');
            if (sanEscobarLvl >= 1) playerTaxModifier = 0.95;
            if (sanEscobarLvl >= 4) playerTaxModifier = 0.0;

            const taxToPay = grossDividend * taxRateDividend * playerTaxModifier;
            governmentTreasury += taxToPay;
            playerCash += grossDividend - taxToPay;
            logEvent(`💰 Otrzymujesz ${(grossDividend - taxToPay).toFixed(2)} PLN dywidendy netto od ${stock.name} (podatek: ${taxToPay.toFixed(2)} PLN).`, 'review');
        }
        displayCash(); // Funkcja z ui.js
    }

    // 1b. Wypłata na prywatne konto gracza (z podatkiem od dywidend)
    const privateHolding = typeof playerWallet !== 'undefined' ? playerWallet.portfolio[stock.symbol] : null;
    if (privateHolding && privateHolding.shares > 0) {
        const gross = privateHolding.shares * dividendPerShare;
        const tax = gross * taxRateDividend * getPrivateTaxModifier();
        governmentTreasury += tax;
        playerWallet.cash += gross - tax;
        logEvent(`💰 Prywatnie otrzymujesz ${(gross - tax).toFixed(2)} zł dywidendy od ${stock.name} (podatek ${tax.toFixed(2)} zł).`, 'review');
    }

    // 2. Wypłata dla AI
    aiCompetitors.forEach(ai => {
        if (ai.portfolio[stock.symbol]) {
            let finalDividendPerShare = dividendPerShare;
            const aiRep = stock.reputation ? stock.reputation[ai.id] : 0;
            
            if (aiRep < REPUTATION_LEVELS.NEGATIVE) finalDividendPerShare *= 0.8;
            else if (aiRep >= REPUTATION_LEVELS.POSITIVE) finalDividendPerShare *= 1.05;

            const grossDividend = ai.portfolio[stock.symbol].shares * finalDividendPerShare;
            
            // Podatek AI
            let aiTaxModifier = 1.0;
            const aiSanEscobarLvl = ai.unlockedSkills ? (ai.unlockedSkills['sanEscobar'] || 0) : 0;
            if (aiSanEscobarLvl >= 1) aiTaxModifier = 0.95;
            if (aiSanEscobarLvl >= 4) aiTaxModifier = 0.0;

            const taxToPay = grossDividend * taxRateDividend * aiTaxModifier;
            const netDividend = grossDividend - taxToPay;
            
            governmentTreasury += taxToPay;
            ai.cash += netDividend;
        }
    });

    // 2b. Fundusze botów-zarządców korporacji (bez podatku, jak fundusz gracza)
    if (typeof corporation !== 'undefined' && corporation) {
        for (const manager of corporation.managers) {
            const holding = manager.fund.portfolio[stock.symbol];
            if (holding) manager.fund.cash += holding.shares * dividendPerShare;
        }
    }

    // 2c. Pozostali posiadacze (audyt A1): banki, holdingi, pakiety spółek, ETF-y, miasto, Skarb Państwa.
    payDividendToInstitutions(stock, dividendPerShare);

    // 3. Spadek ceny akcji (odcięcie dywidendy)
    stock.price = Math.max(stock.price * 0.9, stock.price - dividendPerShare); // odcięcie dywidendy (najwyżej −10%)
    if (stock.price < 0.01) stock.price = 0.01;
    
    console.log(`[Dywidenda] Wypłacono dywidendę ${dividendPerShare.toFixed(2)} dla ${stock.symbol}`);
}

function assignBankToCompany(stock) {
    // Jeśli to bank, startup, holding lub już ma konto - pomiń
    if (stock.assetType || stock.isBankStock || stock.bankAccountId) return;

    const activeCorpAndUniBanks = commercialBanks.filter(b => b.isActive && (b.type === 'Korporacyjny' || b.type === 'Uniwersalny'));
    
    if (activeCorpAndUniBanks.length > 0) {
        const assignedBank = getRandomElement(activeCorpAndUniBanks);
        stock.bankAccountId = assignedBank.id;
        
        // Upewnij się, że tablica klientów istnieje
        if (!assignedBank.corporateClients) assignedBank.corporateClients = [];
        if (!assignedBank.corporateClients.includes(stock.symbol)) {
            assignedBank.corporateClients.push(stock.symbol);
        }

        // Wpłać gotówkę firmy do banku (symulacja)
        if (stock.cash > 0) {
            assignedBank.cash += stock.cash;
        }
        console.log(`[BANKING] Przypisano ${stock.name} do banku ${assignedBank.name}`);
    }
}

function optimizeBankChoice(stock) {
    // Działa tylko dla Działu Ekonomii Lvl 2+
    if (!stock.departments || stock.departments.economy.level < 2) return;
    
    // Wykonuj rzadko (np. 5% szans na tydzień), żeby firmy nie skakały ciągle
    if (Math.random() > 0.05) return;

    const currentBank = commercialBanks.find(b => b.id === stock.bankAccountId);
    if (!currentBank) return;

    // Sprawdź oprocentowanie depozytów (dla firm z gotówką) lub kredytów (dla zadłużonych)
    const isSaver = stock.cash > 0;
    
    let bestBank = currentBank;
    let bestRate = isSaver ? currentBank.interestRateDeposit : currentBank.interestRateLoan;

    commercialBanks.filter(b => b.isActive && (b.type === 'Korporacyjny' || b.type === 'Uniwersalny')).forEach(bank => {
        if (isSaver) {
            // Szukamy wyższego oprocentowania depozytów
            if (bank.interestRateDeposit > bestRate) {
                bestRate = bank.interestRateDeposit;
                bestBank = bank;
            }
        } else {
            // Szukamy niższego oprocentowania kredytów
            if (bank.interestRateLoan < bestRate) {
                bestRate = bank.interestRateLoan;
                bestBank = bank;
            }
        }
    });

    // Jeśli znaleziono lepszy bank (różnica min. 0.5 p.p.)
    if (bestBank.id !== currentBank.id && Math.abs(bestRate - (isSaver ? currentBank.interestRateDeposit : currentBank.interestRateLoan)) > 0.005) {
        changeCompanyBank(stock.symbol, bestBank.id); // Używamy istniejącej funkcji z player.js/companies.js
        logEvent(`📊 Dział Ekonomii ${stock.name} przenosi konto do ${bestBank.name} dla lepszych warunków.`, 'company');
    }
}

function forceCompanyInvestment(symbol, investmentId) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const result = startCompanyInvestment(stock, investmentId, 'owner');

    if (!result.ok) {
        showToast(result.message, 'error');
    } else {
        logEvent(`👑 Na wniosek właściciela: ${stock.name} — ${result.message}.`, 'company');
        showToast(result.message, 'success');
    }

    if (typeof openManagementModal === 'function') {
        openManagementModal(symbol, 'depts');
    }
}

function canPlayerBlockInvestments(stock) {
    const isMajority = (playerPortfolio[stock.symbol]?.shares / stock.totalShares) > 0.5;
    const hasCharisma = getSkillLevel('charisma') >= 4;
    return isMajority || hasCharisma;
}

/**
 * Władza Korony: zablokowanie inwestycji przez gracza.
 * orderRef: uid inwestycji wewnętrznej, ID przetargu lub ID projektu budowlanego.
 */
function blockInvestment(symbol, orderRef) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    if (!canPlayerBlockInvestments(stock)) {
        showToast("Nie masz wystarczającej władzy, by zablokować tę inwestycję (wymagane >50% akcji lub Charyzma Lvl 4).");
        return;
    }

    const key = getEntityKey(stock);
    const internalIndex = (stock.activeInvestments || []).findIndex(inv => inv.uid === orderRef || inv.id === orderRef);
    const tender = activeTenders.find(item => item.id === orderRef && getEntityKey(item.clientCompany) === key);
    const project = constructionProjects.find(item => item.id === orderRef && getEntityKey(item.tender?.clientCompany) === key);

    if (internalIndex < 0 && !tender && !project) return;

    gameConfirm('Czy na pewno chcesz zablokować tę inwestycję? Spółka poniesie koszty przerwania, a relacje z zarządem ucierpią.', () => {

    if (internalIndex >= 0) {
        // Przerwana inwestycja wewnętrzna: odzysk 50% nakładów, reszta to koszt okresu.
        const inv = stock.activeInvestments[internalIndex];
        const recovered = inv.cost * 0.5;
        const lost = inv.cost - recovered;

        adjustCompanyCash(stock, recovered);
        recordPayment('external:dostawcy_inwestycji', stock, recovered, 'Odzysk nakładów przerwanej inwestycji');
        adjustBalanceSheet(stock, { assets: -lost, retainedEarnings: -lost });
        postPeriodEntry(stock, `investment_block_${inv.uid || inv.id}`, { investmentExpense: lost });

        stock.activeInvestments.splice(internalIndex, 1);
        logEvent(`⛔ [KORONA] Zablokowałeś inwestycję „${inv.name}” w ${stock.name}. Odzyskano ${recovered.toFixed(0)} PLN.`, 'review');
    } else if (project) {
        cancelConstructionProject(project, 'Inwestycja zablokowana przez właściciela.', 'client');
    } else if (tender && ['open', 'closed'].includes(tender.status)) {
        cancelTender(tender, 'Przetarg zablokowany przez właściciela.');
    }

    changeReputation('player', symbol, -35);
    showToast('Inwestycja zablokowana. Strata wizerunkowa!', 'warning');

    if (typeof openManagementModal === 'function') openManagementModal(symbol, 'depts');
    });
}

function getConstructionResearchOptions(company) {
    if (
        !company ||
        !Array.isArray(company.sector) ||
        !company.sector.includes('Budowlany')
    ) {
        return [];
    }

    const research = company.research;
    const unlocked = new Set(
        Array.isArray(research?.unlockedTechs)
            ? research.unlockedTechs
            : []
    );

    const researchLevel = Math.max(
        0,
        Number(company.departments?.research?.level) || 0
    );

    const cash = Number(company.cash);

    return Object.entries(technologies)
        .filter(([, tech]) => tech.sector === 'Budowlany')
        .map(([id, tech]) => {
            const initialCashCost = Math.max(
                0,
                Number(tech.initialCashCost) || 0
            );

            const requiredLevel = Math.max(
                0,
                Number(tech.minResearchLevel) || 0
            );

            const completed = unlocked.has(id);
            const current = research?.currentTech === id;
            const levelMet = researchLevel >= requiredLevel;

            const specializationMet =
                research?.specialization === tech.type;

            const affordable =
                Number.isFinite(cash) &&
                cash >= initialCashCost;

            const hasValidResearchSystem = Boolean(
                research && !research.isInvestment
            );

            const available =
                !company.isBankrupt &&
                hasValidResearchSystem &&
                !completed &&
                !current &&
                levelMet &&
                specializationMet;

            let status;

            if (completed) {
                status = 'Ukończone';
            } else if (current) {
                status = research.isResearching
                    ? 'Badanie w toku'
                    : 'Badanie wstrzymane';
            } else if (company.isBankrupt) {
                status = 'Spółka nieaktywna';
            } else if (!hasValidResearchSystem) {
                status = 'Brak aktywnego systemu R&D';
            } else if (!levelMet) {
                status = `Wymaga działu R&D na poziomie ${requiredLevel}`;
            } else if (!specializationMet) {
                status = 'Inna specjalizacja badań';
            } else if (!affordable) {
                status = 'Brak środków na rozpoczęcie';
            } else {
                status = 'Kandydat do kolejnego badania';
            }

            return {
                id,
                name: tech.name,
                icon: tech.icon || '🔬',
                description: tech.description || '',
                type: tech.type,
                researchPoints: Number(tech.cost),
                initialCashCost,
                requiredLevel,
                completed,
                current,
                available,
                affordable,
                status,
                constructionEffects: tech.constructionEffects || null
            };
        })
        .sort((a, b) => {
            if (a.current !== b.current) return a.current ? -1 : 1;
            if (a.completed !== b.completed) return a.completed ? 1 : -1;

            return a.name.localeCompare(b.name, 'pl');
        });
}

function getAvailableCompanyResearch(company, affordableOnly = false) {
    const research = company?.research;

    if (
        !company ||
        company.isBankrupt ||
        company.isBankStock ||
        !research ||
        research.isInvestment ||
        !Array.isArray(company.sector)
    ) {
        return [];
    }

    const unlocked = new Set(
        Array.isArray(research.unlockedTechs)
            ? research.unlockedTechs
            : []
    );

    const level = Math.max(
        0,
        Number(company.departments?.research?.level) || 0
    );

    const cash = Number(company.cash);

    return Object.keys(technologies).filter(id => {
        const tech = technologies[id];
        const points = Number(tech.cost);
        const initialCost = Number(tech.initialCashCost ?? 0);
        const requiredLevel = Number(tech.minResearchLevel ?? 0);

        if (
            unlocked.has(id) ||
            id === research.currentTech ||
            tech.type !== research.specialization ||
            !(tech.sector === 'common' ||
                company.sector.includes(tech.sector)) ||
            !Number.isFinite(points) ||
            points <= 0 ||
            !Number.isFinite(initialCost) ||
            initialCost < 0 ||
            !Number.isFinite(requiredLevel) ||
            requiredLevel < 0 ||
            level < requiredLevel
        ) {
            return false;
        }

        return !affordableOnly ||
            (Number.isFinite(cash) && cash >= initialCost);
    });
}

// =================================================================================
// KSIĘGOWANIE R&D
// Każda opłata (rozpoczęcie, utrzymanie) przechodzi przez recordResearchExpense:
//  - gotówka (i rachunek bankowy) maleje raz, w chwili płatności,
//  - aktywa i zyski zatrzymane maleją raz (wszystkie wydatki R&D to koszty, bez kapitalizacji),
//  - wpis trafia do dziennika R&D jako "nierozpoznany" i czeka na raport kwartalny,
//  - raport tylko odczytuje sumę (recognizeResearchExpenses) i oznacza wpisy jako rozpoznane.
// Inwestycje bankowe (research.isInvestment) mają osobną ścieżkę i nie korzystają z tego dziennika.
// =================================================================================

const RESEARCH_LEDGER_KEEP_RECOGNIZED = 8; // zapis gry: dziennik R&D był największą częścią spółki (limit localStorage)

function ensureResearchLedger(company) {
    if (!company || !company.research || typeof company.research !== 'object') {
        return null;
    }

    const research = company.research;

    if (!Array.isArray(research.ledger)) research.ledger = [];
    if (!research.costTotals || typeof research.costTotals !== 'object') {
        research.costTotals = { startup: 0, maintenance: 0 };
    }
    if (!Number.isFinite(Number(research.pendingQuarterlyExpense))) {
        research.pendingQuarterlyExpense = 0;
    }

    return research;
}

function recordResearchExpense(company, options = {}) {
    const research = ensureResearchLedger(company);
    if (!research || research.isInvestment) return 0;

    const kind = options.kind === 'maintenance' ? 'maintenance' : 'startup';
    const techId = options.techId || research.currentTech || null;
    const amountRaw = Number(options.amount ?? 0);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 0;

    if (amount <= 0) return 0;

    const paymentId = options.paymentId || nextSimulationId(`research_${kind}`);

    // Ten sam identyfikator płatności nigdy nie jest księgowany drugi raz.
    if (research.ledger.some(entry => entry.id === paymentId)) return 0;

    research.ledger.push({
        id: paymentId,
        kind,
        techId,
        amount,
        timestamp: Date.now(),
        recognized: false,
        source: options.source || 'cash'
    });

    research.pendingQuarterlyExpense = Number(research.pendingQuarterlyExpense || 0) + amount;
    research.costTotals[kind] = (Number(research.costTotals[kind]) || 0) + amount;

    adjustCompanyCash(company, -amount);
    adjustBalanceSheet(company, { assets: -amount, retainedEarnings: -amount });
    recordPayment(company, 'external:uslugi_badawcze', amount, kind === 'startup' ? 'R&D: rozpoczęcie badania' : 'R&D: utrzymanie badania', paymentId);

    if (kind === 'startup') {
        research.lastStartupCost = amount;
        research.lastStartupPaymentId = paymentId;
    } else {
        research.lastMaintenanceCost = amount;
        research.lastMaintenancePaymentId = paymentId;
    }

    return amount;
}

function getUnrecognizedResearchExpense(company) {
    const research = company?.research;
    if (!research || !Array.isArray(research.ledger)) return 0;

    return research.ledger
        .filter(entry => !entry.recognized)
        .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
}

/** Podział kosztów R&D okresu (nierozpoznanych) na rozpoczęcie i utrzymanie. */
function getResearchCostSummary(company) {
    const research = company?.research;
    const summary = { pendingStartup: 0, pendingMaintenance: 0, pendingTotal: 0, totalStartup: 0, totalMaintenance: 0, lastReported: 0 };

    if (!research || research.isInvestment) return summary;

    for (const entry of research.ledger || []) {
        if (entry.recognized) continue;
        if (entry.kind === 'maintenance') summary.pendingMaintenance += Number(entry.amount) || 0;
        else summary.pendingStartup += Number(entry.amount) || 0;
    }

    summary.pendingTotal = summary.pendingStartup + summary.pendingMaintenance;
    summary.totalStartup = Number(research.costTotals?.startup) || 0;
    summary.totalMaintenance = Number(research.costTotals?.maintenance) || 0;
    summary.lastReported = Number(research.lastRecognizedExpense) || 0;

    return summary;
}

/**
 * Zwraca koszty R&D do raportu i oznacza je jako rozpoznane.
 * Nie zmienia gotówki ani bilansu — to zrobiono przy płatności.
 */
function recognizeResearchExpenses(company) {
    const research = company?.research;
    if (!research || !Array.isArray(research.ledger)) return 0;

    const pending = getUnrecognizedResearchExpense(company);

    research.ledger.forEach(entry => {
        if (!entry.recognized) entry.recognized = true;
    });

    research.pendingQuarterlyExpense = 0;
    research.lastRecognizedExpense = pending;

    // Ograniczenie historii: zostawiamy wszystkie nierozpoznane i ostatnie rozpoznane.
    const recognized = research.ledger.filter(entry => entry.recognized);
    if (recognized.length > RESEARCH_LEDGER_KEEP_RECOGNIZED) {
        const drop = new Set(recognized.slice(0, recognized.length - RESEARCH_LEDGER_KEEP_RECOGNIZED).map(entry => entry.id));
        research.ledger = research.ledger.filter(entry => !drop.has(entry.id));
    }

    return pending;
}

/**
 * Tygodniowe utrzymanie standardowego R&D.
 *  - badanie w toku: pobiera opłatę utrzymania; przy braku środków wstrzymuje badanie (postęp zostaje),
 *  - badanie wstrzymane: przy dostępnych środkach wznawia, pobierając tylko opłatę utrzymania
 *    (koszt rozpoczęcia nie jest pobierany ponownie).
 */
function processResearchMaintenanceAndPause(stock) {
    if (!stock || !stock.research || stock.assetType || stock.isBankStock || stock.research.isInvestment) {
        return false;
    }

    const research = stock.research;
    const techId = research.currentTech;
    const maintenanceCost = Number(RESEARCH_MAINTENANCE_COST || 0);

    if (!Number.isFinite(maintenanceCost) || maintenanceCost <= 0 || !techId) {
        return false;
    }

    const techName = technologies[techId]?.name || 'nieznanej technologii';

    if (research.isResearching) {
        if ((Number(stock.cash) || 0) >= maintenanceCost) {
            recordResearchExpense(stock, { kind: 'maintenance', techId, amount: maintenanceCost });
            return true;
        }

        research.isResearching = false;
        research.researchPaused = true;
        logEvent(`⏸️ ${stock.name} wstrzymuje badania nad "${techName}" z powodu braku środków na utrzymanie.`, 'company');
        showToast(`Badania w ${stock.name} wstrzymane - brak funduszy!`, 'warning');
        return false;
    }

    if (research.researchPaused && (Number(stock.cash) || 0) >= maintenanceCost) {
        recordResearchExpense(stock, { kind: 'maintenance', techId, amount: maintenanceCost });

        research.isResearching = true;
        research.researchPaused = false;
        logEvent(`▶️ ${stock.name} wznawia badania nad "${techName}".`, 'company');
        return true;
    }

    return false;
}

/** Wznowienie wstrzymanej inwestycji bankowej (osobny system niż standardowe R&D). */
function processBankInvestmentResume(stock) {
    const research = stock?.research;
    if (!stock?.isBankStock || !research?.isInvestment || !research.investmentPaused || !research.currentInvestmentId) {
        return false;
    }

    const bankData = commercialBanks.find(bank => bank.id === stock.bankData?.id);
    const investment = bankInvestments[research.currentInvestmentId];
    const cost = Number(investment?.initialCashCost) || 0;

    if (!bankData || !investment || (Number(bankData.cash) || 0) < cost) return false;

    bankData.cash -= cost;
    if (cost > 0) recordPayment(bankData.id, 'external:inwestycje_bankowe', cost, `Inwestycja bankowa: ${investment.name}`);

    research.isResearching = true;
    research.investmentPaused = false;

    if (cost > 0) logEvent(`💸 Bank ${stock.name} wznawia inwestycję "${investment.name}" kosztem ${cost.toLocaleString()} PLN.`);
    else logEvent(`▶️ Bank ${stock.name} wznawia inwestycję "${investment.name}".`);

    return true;
}

function startCompanyResearch(company, techId) {
    const research = company?.research;

    if (!research || research.isInvestment || research.currentTech) return false;

    if (!getAvailableCompanyResearch(company).includes(techId)) {
        return false;
    }

    const tech = technologies[techId];
    const cost = Number(tech.initialCashCost ?? 0);
    const cash = Number(company.cash);

    if (!Number.isFinite(cash) || cash < cost) {
        return false;
    }

    const paymentId = nextSimulationId(`research_start_${techId}`);
    recordResearchExpense(company, { kind: 'startup', techId, amount: cost, paymentId });

    research.currentTech = techId;
    research.progress = 0;
    research.isResearching = true;
    research.researchPaused = false;
    research.choiceAvailableUntil = null;
    research.choiceRemainingGameMs = null;

    if (!Array.isArray(company.researchCostHistory)) {
        company.researchCostHistory = [];
    }

    company.researchCostHistory.push({ techId, amount: cost, paidAt: Date.now(), paymentId });
    if (company.researchCostHistory.length > 40) company.researchCostHistory.shift();

    logEvent(
        `${company.name} rozpoczyna badanie „${tech.name}”. ` +
        `Koszt rozpoczęcia: ${cost.toFixed(2)} PLN.`,
        'company'
    );

    return true;
}

function updateResearchAutoRetry(
    deltaTime = 0,
    companies = stocks
) {
    if (isGamePaused) return;

    const delta = Number(deltaTime);
    if (!Number.isFinite(delta) || delta < 0) return;

    for (const company of companies) {
        const research = company?.research;

        if (
            !research ||
            company.isBankrupt ||
            company.isBankStock ||
            research.isInvestment
        ) {
            continue;
        }

        if (research.autoResearchEnabled === false) {
            research.autoRetryGameMs = null;
            continue;
        }

        const previouslyResearched =
            (
                Array.isArray(company.researchCostHistory) &&
                company.researchCostHistory.length > 0
            ) ||
            (
                Array.isArray(research.unlockedTechs) &&
                research.unlockedTechs.length > 0
            );

        if (
            research.autoResearchEnabled !== true &&
            !previouslyResearched
        ) {
            continue;
        }

        if (
            research.currentTech ||
            research.choiceAvailableUntil ||
            research.isResearching
        ) {
            research.autoRetryGameMs = null;
            continue;
        }

        if (
            !Number.isFinite(research.autoRetryGameMs) ||
            research.autoRetryGameMs < 0
        ) {
            research.autoRetryGameMs = 0;
        }

        research.autoRetryGameMs = Math.max(
            0,
            research.autoRetryGameMs - delta
        );

        if (research.autoRetryGameMs > 0) continue;

        research.autoRetryGameMs = BASE_DELAYS.weekly;

        const available = getAvailableCompanyResearch(company, true);

        if (available.length === 0) continue;

        const isBuilder =
            Array.isArray(company.sector) &&
            company.sector.includes('Budowlany');

        const preferred = isBuilder
            ? available.filter(
                id =>
                    technologies[id].sector === 'Budowlany' &&
                    technologies[id].constructionEffects
            )
            : [];

        const candidates = preferred.length > 0
            ? preferred
            : available;

        candidates.sort((a, b) => {
            const costDifference =
                Number(technologies[a].initialCashCost ?? 0) -
                Number(technologies[b].initialCashCost ?? 0);

            if (costDifference !== 0) return costDifference;

            return a.localeCompare(b);
        });

        const started = startCompanyResearch(company, candidates[0]);

        if (started) {
            research.autoRetryGameMs = null;
        }
    }
}

// =================================================================================
// AUDYT A1: spójność akcji w obrocie i wypłat
// =================================================================================

/** Dywidenda dla instytucji (bez podatku): banki, holdingi, pakiety spółek, ETF-y, miasto, państwo. */
function payDividendToInstitutions(stock, dps) {
    const symbol = stock.symbol;
    for (const bank of commercialBanks) {
        const shares = bank.stockPortfolio?.[symbol]?.shares || 0;
        if (shares > 0) bank.cash += shares * dps;
    }
    for (const owner of stocks) {
        if (owner === stock) continue;
        const shares = (owner.holdingPortfolio?.[symbol]?.quantity || 0) + (owner.equityStakes?.[symbol] || 0);
        if (shares > 0) {
            adjustCompanyCash(owner, shares * dps);
            adjustBalanceSheet(owner, { assets: shares * dps, retainedEarnings: shares * dps });
        }
    }
    if (typeof etfs !== 'undefined') for (const etf of etfs) if (etf.holdings?.[symbol] > 0) etf.cash += etf.holdings[symbol] * dps;
    if (stock.cityShares > 0 && typeof city === 'object') city.budget += stock.cityShares * dps;
    const stateShares = Math.floor(stock.totalShares * Math.max(0, Number(stock.stateOwnershipPct) || 0));
    if (stateShares > 0) governmentTreasury += stateShares * dps;
}

/** Pakiety usuwanej spółki: przechodzą na spółkę przejmującą albo wracają do wolnego obrotu. */
function releaseCompanyStakes(company) {
    if (!company) return;
    const heir = company.absorbedBy ? stocks.find(s => s.symbol === company.absorbedBy) : null;
    const stakes = { ...(company.equityStakes || {}) };
    for (const [symbol, holding] of Object.entries(company.holdingPortfolio || {})) stakes[symbol] = (stakes[symbol] || 0) + (Number(holding.quantity) || 0);
    for (const [symbol, shares] of Object.entries(stakes)) {
        const target = stocks.find(s => s.symbol === symbol);
        if (!target || !(shares > 0)) continue;
        if (heir && heir !== target) {
            if (!heir.equityStakes) heir.equityStakes = {};
            heir.equityStakes[symbol] = (heir.equityStakes[symbol] || 0) + shares;
        } else {
            target.sharesHeld = Math.max(0, target.sharesHeld - shares);
        }
    }
    company.equityStakes = {};
    company.holdingPortfolio = {};
}

/** Akcje śledzonych posiadaczy w wolnym obrocie (bez państwa i insiderów). */
function getTrackedHeldShares(stock) {
    const symbol = stock.symbol;
    let total = (playerPortfolio[symbol]?.shares || 0) + (playerWallet?.portfolio?.[symbol]?.shares || 0);
    for (const ai of aiCompetitors) total += ai.portfolio?.[symbol]?.shares || 0;
    for (const manager of corporation?.managers || []) total += manager.fund?.portfolio?.[symbol]?.shares || 0;
    for (const bank of commercialBanks) total += bank.stockPortfolio?.[symbol]?.shares || 0;
    for (const owner of stocks) total += (owner.holdingPortfolio?.[symbol]?.quantity || 0) + (owner.equityStakes?.[symbol] || 0);
    if (typeof etfs !== 'undefined') for (const etf of etfs) total += etf.holdings?.[symbol] || 0;
    total += Number(stock.cityShares) || 0;
    return total;
}

/**
 * Posiadacze mają więcej akcji niż wolny obrót (zapisy sprzed poprawki): nadwyżkę oddają akcje własne,
 * potem pula insiderów — pakiety inwestorów zostają nietknięte.
 */
function releaseOverheldShares(stock) {
    let excess = Math.ceil(getTrackedHeldShares(stock) - getFreeFloatShares(stock));
    for (const key of ['treasuryShares', 'insiderShares']) {
        if (excess <= 0) break;
        const pool = Math.max(0, Number(stock[key]) || 0);
        const released = Math.min(pool, excess);
        if (released > 0) { stock[key] = pool - released; excess -= released; }
    }
    // P3: dalej pakiet państwa (akcje sprzedane z niego inwestorom bez korekty udziału)…
    if (excess > 0 && stock.stateOwnershipPct > 0 && stock.totalShares > 0) {
        const stateShares = Math.floor(stock.totalShares * stock.stateOwnershipPct);
        const released = Math.min(stateShares, excess);
        stock.stateOwnershipPct = Math.max(0, (stateShares - released) / stock.totalShares);
        excess -= released;
    }
    // … a na końcu „duchy posiadaczy”: pakiety spółek upadłych, potem pozostałych posiadaczy (bez funduszu i portfela gracza).
    if (excess > 0) trimGhostHolders(stock, excess);
}

/** P3: zdejmuje nadmiarowe akcje z pakietów posiadaczy, których nie pokrywa wolny obrót. Zwraca zdjętą liczbę. */
function trimGhostHolders(stock, excess) {
    const symbol = stock.symbol;
    let left = excess;
    const take = (get, set) => { if (left <= 0) return; const have = Math.max(0, Number(get()) || 0); const cut = Math.min(have, left); if (cut > 0) { set(have - cut); left -= cut; } };
    const owners = stocks.filter(o => o !== stock && (o.equityStakes?.[symbol] || o.holdingPortfolio?.[symbol]));
    for (const owner of [...owners.filter(o => o.isBankrupt), ...owners.filter(o => !o.isBankrupt)]) {
        if (owner.equityStakes?.[symbol]) take(() => owner.equityStakes[symbol], v => { if (v > 0) owner.equityStakes[symbol] = v; else delete owner.equityStakes[symbol]; });
        if (owner.holdingPortfolio?.[symbol]) take(() => owner.holdingPortfolio[symbol].quantity, v => { if (v > 0) owner.holdingPortfolio[symbol].quantity = v; else delete owner.holdingPortfolio[symbol]; });
    }
    if (typeof etfs !== 'undefined') for (const etf of etfs) if (etf.holdings?.[symbol]) take(() => etf.holdings[symbol], v => { etf.holdings[symbol] = v; });
    for (const bank of commercialBanks) if (bank.stockPortfolio?.[symbol]) take(() => bank.stockPortfolio[symbol].shares, v => { if (v > 0) bank.stockPortfolio[symbol].shares = v; else delete bank.stockPortfolio[symbol]; });
    for (const manager of corporation?.managers || []) if (manager.fund?.portfolio?.[symbol]) take(() => manager.fund.portfolio[symbol].shares, v => { if (v > 0) manager.fund.portfolio[symbol].shares = v; else delete manager.fund.portfolio[symbol]; });
    for (const ai of aiCompetitors) if (ai.portfolio?.[symbol]?.shares) take(() => ai.portfolio[symbol].shares, v => { if (v > 0) ai.portfolio[symbol].shares = v; else delete ai.portfolio[symbol]; });
    take(() => stock.cityShares, v => { stock.cityShares = v; });
    if (left < excess && typeof isDebugMode === 'function' && isDebugMode()) console.warn(`[P3] ${symbol}: zdjęto ${excess - left} akcji „duchów posiadaczy”`);
    return excess - left;
}

/** Uzgadnia sharesHeld z posiadaczami (wczytanie zapisu i co kwartał). Zwraca liczbę poprawionych spółek. */
function reconcileSharesHeld() {
    let fixed = 0;
    for (const stock of stocks) {
        if (stock.assetType === 'Startup' || stock.isBankrupt) continue;
        releaseOverheldShares(stock);
        const tracked = Math.min(getTrackedHeldShares(stock), Math.max(0, getFreeFloatShares(stock)));
        if (Math.abs((Number(stock.sharesHeld) || 0) - tracked) > 0.5) {
            if (typeof isDebugMode === 'function' && isDebugMode()) console.warn(`[A1] sharesHeld ${stock.symbol}: ${stock.sharesHeld} → ${tracked}`);
            stock.sharesHeld = tracked;
            fixed++;
        }
    }
    return fixed;
}

// #################################################################################
// ## dividends.js
// #################################################################################

// dividends.js — Dywidendy (wersja 0.10.2, część M2)
//
// Dywidendowy arystokrata: spółka, która ≥ 12 kwartałów z rzędu ogłasza dywidendę i jej nie obniża
// (tolerancja 5%). Bonusy w skali modyfikatorów kursu: +0,2 stabilności (zmienność −20%),
// +0,05 przyrostu (dryf kursu jak cechy prezesa), +0,07 zainteresowania (wycena ×1,07).
// Obcięcie dywidendy odbiera status i przecenia kurs. Nie dotyczy REIT-ów.
// Historia wypłat i seria kwartałów w karcie spółki; polityka zarządu reaguje na stopy procentowe.

const ARISTOCRAT_MIN_STREAK = 12; // audyt A4: przy 8 kwartałach status miało 20–40% spółek
const ARISTOCRAT_BONUS = { stability: 0.2, growth: 0.05, interest: 0.07 };
const DIVIDEND_CUT_TOLERANCE = 0.95;
const ARISTOCRAT_CUT_PENALTY = -0.06;
const DIVIDEND_HISTORY_LIMIT = 8;

/** Wołane po ogłoszeniu (lub braku) dywidendy w raporcie kwartalnym. */
function updateDividendStreak(stock) {
    if (stock.assetType) return;
    const declared = stock.pendingDividend?.dps || 0;
    const previous = Number(stock.lastDeclaredDps) || 0;
    const wasAristocrat = Boolean(stock.isDividendAristocrat);

    if (declared > 0 && (previous <= 0 || declared >= previous * DIVIDEND_CUT_TOLERANCE)) {
        stock.dividendStreak = (Number(stock.dividendStreak) || 0) + 1;
    } else {
        stock.dividendStreak = declared > 0 ? 1 : 0; // obcięta dywidenda zaczyna serię od nowa
    }
    stock.lastDeclaredDps = declared;
    stock.isDividendAristocrat = stock.dividendStreak >= ARISTOCRAT_MIN_STREAK;

    if (!wasAristocrat && stock.isDividendAristocrat) {
        logEvent(`👑 ${stock.name} zostaje dywidendowym arystokratą — ${stock.dividendStreak} kwartałów rosnącej lub stałej dywidendy.`, 'company');
    } else if (wasAristocrat && !stock.isDividendAristocrat) {
        applyPriceEffect(stock.symbol, ARISTOCRAT_CUT_PENALTY, 'negative', 'company');
        logEvent(`💔 ${stock.name} ${declared > 0 ? 'obcina' : 'wstrzymuje'} dywidendę i traci status dywidendowego arystokraty. Kurs spada.`, 'company');
    }
}

/** Wpis do historii wypłat (wołane z payCompanyDividend). */
function recordDividendPayment(stock, dps) {
    if (!Array.isArray(stock.dividendHistory)) stock.dividendHistory = [];
    stock.dividendHistory.unshift({ dps, yield: dps / Math.max(0.01, stock.price), at: typeof getMailClockMs === 'function' ? getMailClockMs() : Date.now() });
    stock.dividendHistory.length = Math.min(stock.dividendHistory.length, DIVIDEND_HISTORY_LIMIT);
}

/** Stopa dywidendy z ostatnich 4 wypłat (≈ roczna). */
function getTrailingDividendYield(stock) {
    if (stock.assetType === 'REIT') return stock.lastDividend?.yield ? stock.lastDividend.yield * 4 : 0;
    const paid = (stock.dividendHistory || []).slice(0, 4).reduce((sum, entry) => sum + entry.dps, 0);
    return paid / Math.max(0.01, stock.price);
}

function getAristocratValuationFactor(stock) {
    return stock?.isDividendAristocrat ? 1 + ARISTOCRAT_BONUS.interest : 1;
}

/** Presja akcjonariuszy przy wysokich stopach: zdrowa spółka podnosi wypłaty. */
function getRatePressureOnDividend(stock) {
    const rate = Number(centralBank?.baseInterestRate) || 0.05;
    return rate > 0.06 && (Number(stock.financialHealth) || 0) > 0 ? 1 : rate < 0.02 ? -1 : 0;
}

/** Linijka pod nazwą spółki w karcie: status arystokraty, stopa dywidendy, seria. */
function renderDividendBadges(stock) {
    if (stock.assetType && stock.assetType !== 'REIT') return '';
    const yieldPct = (getTrailingDividendYield(stock) * 100).toFixed(2);
    const badge = stock.isDividendAristocrat
        ? `<span class="badge-aristocrat" title="Stabilność +${ARISTOCRAT_BONUS.stability}, przyrost +${ARISTOCRAT_BONUS.growth}, zainteresowanie +${ARISTOCRAT_BONUS.interest}">👑 Dywidendowy arystokrata</span>` : '';
    const history = (stock.dividendHistory || []).slice(0, 6).map(entry => entry.dps.toFixed(2)).join(' · ');
    const market = typeof getStockMarket === 'function' && getStockMarket(stock) !== 'GPW' ? `<span class="badge-market">członek rynku ${escapeHtml(getMarketLabel(getStockMarket(stock)))}</span>` : '';
    const projects = (typeof getActiveSpecialBonuses === 'function' ? getActiveSpecialBonuses(stock) : []).map(bonus => `<span class="badge-market" title="Wzrost przychodów +${(bonus.growth * 100).toFixed(1)} pkt proc./kw., wycena +${(bonus.valuation * 100).toFixed(1)}%">${bonus.icon || '🏗️'} ${escapeHtml(bonus.name)}</span>`).join('');
    return `<p class="dividend-badges">${badge}${market}${projects}
        <span class="text-sm">Stopa dywidendy: <strong>${yieldPct}%</strong></span>
        ${stock.assetType ? '' : `<span class="text-sm text-muted">seria: ${stock.dividendStreak || 0}/${ARISTOCRAT_MIN_STREAK} kw.</span>`}
        ${history ? `<span class="text-xs text-muted d-block">Ostatnie wypłaty (zł/akcję): ${history}</span>` : ''}</p>`;
}

// #################################################################################
// ## investments.js
// #################################################################################

// investments.js — Inwestycje spółek (etap G4)
//
// Każda inwestycja przechodzi etapy: projekt → budowa → weryfikacja, potem działa. Weryfikacja ocenia
// jakość (wydajność). Działająca inwestycja co kwartał dokłada do wyniku spółki zysk lub stratę
// (oczekiwany zwrot × wydajność × koniunktura sektora + losowość); po 4 stratnych kwartałach z rzędu
// zarząd ją wygasza. Większościowy akcjonariusz (fundusz) może dopłacić do inwestycji w toku
// w zamian za nowe akcje albo udział w jej zyskach. Bank Centralny dofinansowuje spółki państwowe,
// miasto — spółki miejskie (w zamian za akcje).

const INVESTMENT_STAGES = [
    { id: 'design', label: 'Projekt', share: 0.2 },
    { id: 'build', label: 'Budowa', share: 0.6 },
    { id: 'verify', label: 'Weryfikacja', share: 0.2 }
];
const INVESTMENT_QUALITY = {
    excellent: { label: 'wzorowa', icon: '🏅', efficiency: 1.1 },
    ok: { label: 'poprawna', icon: '✅', efficiency: 1.0 },
    defects: { label: 'usterki', icon: '⚠️', efficiency: 0.85 }
};
const INVESTMENT_LOSS_STREAK_LIMIT = 4;
const FUND_TOPUP_DISCOUNT = 0.05;
const FUND_INCOME_MAX_SHARE = 0.6;

// =================================================================================
// ETAPY I JAKOŚĆ
// =================================================================================

/** Etap inwestycji wewnętrznej z postępu (dni realizacji). */
function getInvestmentStageInfo(project) {
    const fraction = Math.max(0, Math.min(1, (Number(project.progress) || 0) / Math.max(1, Number(project.totalDuration) || 1)));
    let start = 0;
    const segments = INVESTMENT_STAGES.map(stage => {
        const fill = Math.max(0, Math.min(1, (fraction - start) / stage.share));
        start += stage.share;
        return { ...stage, fill };
    });
    const current = segments.find(segment => segment.fill < 1) || segments[segments.length - 1];
    return { fraction, segments, current };
}

/** Ocena weryfikacji: dział rozwoju i opóźnienia budowy wpływają na jakość. */
function rollVerificationQuality(stock, delays = 0) {
    const dev = Number(stock.departments?.development?.level) || 0;
    const pExcellent = Math.min(0.5, 0.12 + dev * 0.05);
    const pDefects = Math.max(0.05, 0.25 - dev * 0.04 + delays * 0.08);
    const roll = Math.random();
    if (roll < pExcellent) return 'excellent';
    if (roll < pExcellent + pDefects) return 'defects';
    return 'ok';
}

/** Oczekiwany roczny zwrot z kosztu (6% bazowo + premia z katalogu). */
function getExpectedAnnualRoi(incomeBonus) {
    return 0.06 + Math.max(0, Number(incomeBonus) || 0) * 0.6;
}

function registerOperatingInvestment(stock, { id, name, cost, incomeBonus, quality = 'ok', fundIncomePct = 0, fundInvested = 0, lifeQuarters = null }) {
    if (!Array.isArray(stock.operatingInvestments)) stock.operatingInvestments = [];
    const def = INVESTMENT_QUALITY[quality] || INVESTMENT_QUALITY.ok;
    const operating = {
        uid: nextSimulationId('op'),
        id, name,
        cost: Math.max(0, Number(cost) || 0),
        roi: getExpectedAnnualRoi(incomeBonus),
        quality,
        efficiency: def.efficiency,
        quarters: 0,
        lastResult: 0,
        totalResult: 0,
        lossStreak: 0,
        fundIncomePct: Math.min(FUND_INCOME_MAX_SHARE, Math.max(0, fundIncomePct)),
        fundInvested,
        fundPaid: 0,
        lifeQuarters // kampanie i szkolenia (bez majątku) działają ograniczony czas
    };
    stock.operatingInvestments.push(operating);
    logEvent(`🔍 ${stock.name}: weryfikacja „${name}” — jakość ${def.icon} ${def.label}. Inwestycja zaczyna działać.`, 'company');
    return operating;
}

// =================================================================================
// WYNIK KWARTALNY DZIAŁAJĄCYCH INWESTYCJI (wołane z computeQuarterResults)
// =================================================================================

function processOperatingInvestments(stock) {
    if (!Array.isArray(stock.operatingInvestments) || !stock.operatingInvestments.length) return 0;
    const profile = getSectorProfile(stock);
    const cycle = 1 + profile.beta * getGdpDriver() * 10;
    let total = 0;

    for (const operating of [...stock.operatingInvestments]) {
        const expected = operating.cost * operating.roi / 4;
        let result = expected * operating.efficiency * cycle + gaussianRandom() * expected * 0.9;
        operating.quarters++;

        // Udział funduszu w zysku (dopłata „za dochód”).
        if (result > 0 && operating.fundIncomePct > 0 && playerFund) {
            const payout = result * operating.fundIncomePct;
            result -= payout;
            playerCash += payout;
            operating.fundPaid += payout;
            recordPayment(stock, 'player-fund', payout, `Udział w zysku: ${operating.name}`);
        }

        operating.lastResult = result;
        operating.totalResult += result;
        operating.lossStreak = result < 0 ? operating.lossStreak + 1 : 0;
        total += result;

        if (operating.lifeQuarters && operating.quarters >= operating.lifeQuarters) {
            stock.operatingInvestments = stock.operatingInvestments.filter(item => item !== operating);
            logEvent(`⏹️ ${stock.name}: „${operating.name}” zakończyła działanie (łączny wynik ${Math.round(operating.totalResult).toLocaleString('pl-PL')} zł).`, 'company');
        } else if (operating.lossStreak >= INVESTMENT_LOSS_STREAK_LIMIT) {
            const writeOff = Math.round(operating.cost * 0.4);
            adjustBalanceSheet(stock, { assets: -writeOff, retainedEarnings: -writeOff });
            stock.operatingInvestments = stock.operatingInvestments.filter(item => item !== operating);
            logEvent(`📉 ${stock.name} wygasza nierentowną inwestycję „${operating.name}” (odpis ${writeOff.toLocaleString('pl-PL')} zł).`, 'company');
        }
    }
    return total;
}

// =================================================================================
// DOPŁATA FUNDUSZU (większościowy akcjonariusz)
// =================================================================================

function canFundTopUp(stock) {
    return playerFund && getFundStakePct(stock) > 0.5;
}

/**
 * Dopłata funduszu do inwestycji w toku.
 * mode 'shares' — nowa emisja dla funduszu po cenie rynkowej −5% (także ponad limit akcji);
 * mode 'income' — udział w zysku tej inwestycji (do 60%, proporcjonalnie do dopłaty).
 */
function fundTopUpInvestment(symbol, uid, amount, mode) {
    const stock = stocks.find(s => s.symbol === symbol);
    const project = stock?.activeInvestments?.find(item => item.uid === uid);
    amount = Math.floor(Number(amount));
    if (!stock || !project) { showToast('Inwestycja nie jest już w toku.', 'error'); return false; }
    if (!canFundTopUp(stock)) { showToast('Dopłata wymaga większości (> 50%) akcji w funduszu.', 'warning'); return false; }
    if (!(amount >= 100) || amount > playerCash) { showToast('Za mało gotówki funduszu (minimum 100 zł).', 'error'); return false; }
    const remaining = Math.max(0, project.cost - (project.fundTopUp || 0));
    amount = Math.min(amount, remaining);
    if (!(amount > 0)) { showToast('Fundusz sfinansował już całą inwestycję.', 'default'); return false; }

    let newShares = 0;
    if (mode === 'shares') {
        // B1: rabat 5% tylko do 25% kosztu inwestycji; nowe akcje ponad limit najwyżej +10% akcji spółki.
        if (!Number.isFinite(stock.topUpBaseShares)) stock.topUpBaseShares = stock.totalShares; // limit liczony od akcji sprzed pierwszej dopłaty
        const capShares = Math.max(0, Math.floor(stock.topUpBaseShares * 0.1) - (stock.topUpShares || 0));
        if (capShares <= 0) { showToast('Limit nowych akcji z dopłat (10% spółki) wyczerpany — wybierz udział w zysku.', 'warning'); return false; }
        const discountRoom = Math.max(0, project.cost * 0.25 - (project.discountedTopUp || 0));
        const discountPrice = stock.price * (1 - FUND_TOPUP_DISCOUNT);
        const discountedShares = Math.min(capShares, Math.floor(Math.min(amount, discountRoom) / discountPrice));
        const fullShares = Math.min(capShares - discountedShares, Math.floor((amount - discountedShares * discountPrice) / stock.price));
        newShares = discountedShares + Math.max(0, fullShares);
        if (newShares <= 0) { showToast('Kwota za mała na choćby jedną akcję.', 'warning'); return false; }
        amount = Math.round(discountedShares * discountPrice + Math.max(0, fullShares) * stock.price); // płacisz tylko za objęte akcje
        project.discountedTopUp = (project.discountedTopUp || 0) + discountedShares * discountPrice;
    }

    playerCash -= amount;
    adjustCompanyCash(stock, amount);
    project.fundTopUp = (project.fundTopUp || 0) + amount;

    if (mode === 'shares') {
        stock.topUpShares = (stock.topUpShares || 0) + newShares;
        stock.maxShares = Math.max(Number(stock.maxShares) || 0, stock.totalShares) + newShares; // ponad limit emisji
        stock.totalShares += newShares;
        stock.sharesHeld += newShares;
        const holding = playerPortfolio[symbol];
        holding.avgPrice = (holding.avgPrice * holding.shares + amount) / (holding.shares + newShares);
        holding.shares += newShares;
        adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
        recordPayment('player-fund', stock, amount, `Dopłata za akcje: ${project.name}`);
        logEvent(`💼 Fundusz dopłaca ${amount.toLocaleString('pl-PL')} zł do „${project.name}” (${stock.name}) i obejmuje ${newShares.toLocaleString('pl-PL')} nowych akcji.`, 'review');
    } else {
        const pct = Math.min(FUND_INCOME_MAX_SHARE, FUND_INCOME_MAX_SHARE * project.fundTopUp / Math.max(1, project.cost));
        project.fundIncomePct = pct;
        project.fundInvested = (project.fundInvested || 0) + amount;
        adjustBalanceSheet(stock, { assets: amount, liabilities: amount }); // zobowiązanie wobec funduszu (udział w zysku)
        recordPayment('player-fund', stock, amount, `Dopłata za udział w zysku: ${project.name}`);
        logEvent(`💼 Fundusz dopłaca ${amount.toLocaleString('pl-PL')} zł do „${project.name}” (${stock.name}) za ${(pct * 100).toFixed(0)}% zysku tej inwestycji.`, 'review');
    }
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

// =================================================================================
// FINANSOWANIE PUBLICZNE: Bank Centralny → spółki państwowe, miasto → spółki miejskie
// =================================================================================

function issueSharesToPublicOwner(stock, amount, owner) {
    const newShares = Math.floor(amount / Math.max(0.01, stock.price * (1 - FUND_TOPUP_DISCOUNT)));
    if (newShares <= 0) return 0;
    const oldTotal = stock.totalShares;
    stock.totalShares += newShares;
    stock.maxShares = Math.max(Number(stock.maxShares) || 0, oldTotal) + newShares;
    if (owner === 'state') {
        const stateShares = oldTotal * (stock.stateOwnershipPct || 0) + newShares;
        stock.stateOwnershipPct = stateShares / stock.totalShares; // pakiet państwa poza wolnym obrotem
    } else {
        stock.cityShares = (Number(stock.cityShares) || 0) + newShares;
        stock.sharesHeld += newShares; // miasto jako inwestor w obrocie
    }
    adjustCompanyCash(stock, amount);
    adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
    return newShares;
}

/** Co kwartał: dofinansowanie inwestycji w toku spółek państwowych i miejskich. */
function processPublicInvestmentFunding() {
    const recession = ['recession', 'slowdown'].includes(economyCycle?.phase);
    for (const stock of stocks) {
        if (stock.isBankrupt || stock.assetType) continue;
        const project = (stock.activeInvestments || []).find(item => !item.publicFunding);
        if (!project) continue;
        const amount = Math.round(project.cost * 0.4);

        if (stock.isStateOwned && Math.random() < (recession ? 0.6 : 0.3) && centralBank.funds > amount * 5) {
            centralBank.funds -= amount;
            const shares = issueSharesToPublicOwner(stock, amount, 'state');
            project.publicFunding = 'state';
            logEvent(`🏛️ Bank Centralny dofinansowuje „${project.name}” w ${stock.name}: ${amount.toLocaleString('pl-PL')} zł za ${shares.toLocaleString('pl-PL')} akcji.`, 'state');
        } else if (stock.isMunicipal && Math.random() < (city.mayor?.policy === 'municipal' ? 0.6 : 0.25) && city.budget > amount * 3) {
            city.budget -= amount;
            const shares = issueSharesToPublicOwner(stock, amount, 'city');
            project.publicFunding = 'city';
            logEvent(`🏙️ Miasto dofinansowuje „${project.name}” w ${stock.name}: ${amount.toLocaleString('pl-PL')} zł za ${shares.toLocaleString('pl-PL')} akcji.`, 'city');
        }
    }
}

// #################################################################################
// ## startups.js
// #################################################################################

// startups.js — Inkubator startupów (etap F2)
//
// Inwestuje wyłącznie fundusz (gotówka klientów), łącznie do 10% aktywów funduszu (inwestycje
// bezpośrednie + wpłaty do puli). Wycena w NAV po zainwestowanej kwocie aż do IPO. Przy IPO udziały
// wszystkich inwestorów są normalizowane (80% akcji dla inwestorów, 20% wolny obrót), więc nigdy
// nie przekraczają 100%. Odradzanie inkubatora w czasie gry (maintainStartupCount co tydzień).

const STARTUP_FUND_LIMIT = 0.10;
const STARTUP_INVESTORS_SHARE = 0.80;

// =================================================================================
// LIMIT FUNDUSZU
// =================================================================================

function getFundStartupExposure() {
    let exposure = 0;
    for (const holding of Object.values(playerPortfolio)) {
        if (holding.assetType === 'Startup') exposure += Number(holding.investedAmount) || 0;
    }
    return exposure + (Number(investmentPool?.playerStakes?.player) || 0);
}

function getFundStartupCapacity() {
    return Math.max(0, getFundAssets() * STARTUP_FUND_LIMIT - getFundStartupExposure());
}

/** Sprawdza limit i gotówkę funduszu; komunikat dla gracza przy odmowie. */
function canFundInvestInStartups(amount, silent = false) {
    const fail = message => { if (!silent && typeof showToast === 'function') showToast(message, 'error'); return false; };
    if (!FEATURE_FLAGS.startups) return fail('Inkubator jest nieczynny.');
    if (!(amount > 0)) return fail('Wpisz poprawną kwotę.');
    if (amount > playerCash) return fail('Za mało gotówki funduszu.');
    if (amount > getFundStartupCapacity() + 1e-6) {
        return fail(`Limit startupów: ${(STARTUP_FUND_LIMIT * 100).toFixed(0)}% aktywów funduszu (wolne: ${getFundStartupCapacity().toFixed(0)} zł).`);
    }
    return true;
}

function addFundStartupStake(startup, amount) {
    const holding = playerPortfolio[startup.symbol] || { investedAmount: 0, assetType: 'Startup', isInsured: false };
    holding.investedAmount += amount;
    playerPortfolio[startup.symbol] = holding;
    if (!startup.investors) startup.investors = {};
    startup.investors['Fundusz'] = (startup.investors['Fundusz'] || 0) + amount;
}

// =================================================================================
// INWESTYCJE FUNDUSZU
// =================================================================================

function investInStartup(symbol, amount) {
    if (!(Number(amount) > 0)) amount = document.getElementById(`invest-amount-${symbol}`)?.valueAsNumber;
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup') return false;
    if (startup.stage !== 'funding' && startup.stage !== 'overfunding') {
        showToast(`${startup.name} jest już w fazie rozwoju i nie przyjmuje inwestycji.`, 'default');
        return false;
    }
    if (!canFundInvestInStartups(amount)) return false;

    playerCash -= amount;
    if (startup.stage === 'funding') {
        startup.currentFunding += amount;
        startup.successChance = Math.min(1, startup.successChance + amount / startup.fundingGoal * 0.05);
        logEvent(`🚀 Fundusz inwestuje ${amount.toFixed(2)} zł w ${startup.name} (faza finansowania).`, 'review');
    } else {
        startup.ipoPriceBonus += amount;
        logEvent(`🚀 Fundusz dopłaca ${amount.toFixed(2)} zł do ${startup.name} przed debiutem (wyższa wycena IPO).`, 'review');
    }
    addFundStartupStake(startup, amount);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    if (typeof displayStartups === 'function') displayStartups(getCurrentStartupInputValues());
    return true;
}

/** Ratunek w etapie komplikacji: wpłata liczy się jako inwestycja; zebranie kwoty = debiut. */
function playerRescuesStartup(symbol, amount) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.stage !== 'financial_complications') return false;
    amount = Math.min(Number(amount), startup.rescueGoal - startup.rescueCurrent);
    if (!canFundInvestInStartups(amount)) return false;

    playerCash -= amount;
    startup.rescueCurrent += amount;
    addFundStartupStake(startup, amount);
    logEvent(`🚑 Fundusz dofinansowuje ${startup.name} kwotą ${amount.toFixed(2)} zł.`, 'review');
    checkStartupRescue(startup);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

function checkStartupRescue(startup) {
    if (startup.stage !== 'financial_complications' || startup.rescueCurrent < startup.rescueGoal) return false;
    logEvent(`[START-UP] ✅ ${startup.name} zebrał środki ratunkowe i wchodzi na giełdę.`, 'review');
    handleSuccessfulIPO(startup, getRandomInRange(1, 5));
    return true;
}

/** Prywatyzacja (szkolenie „Anioł Biznesu” poz. 5): fundusz przejmuje całość, inni inwestorzy dostają zwrot. */
function privatizeStartup(symbol) {
    if (getSkillLevel('startupInvestor') < 5) { showToast('Prywatyzacja wymaga 5. poziomu szkolenia „Anioł Biznesu”.', 'warning'); return false; }
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup' || startup.isPrivatized) return false;
    if (startup.stage !== 'funding') { showToast('Prywatyzować można tylko w fazie finansowania.', 'warning'); return false; }

    const price = startup.fundingGoal * 1.2; // 20% premii
    const already = playerPortfolio[symbol]?.investedAmount || 0;
    const cost = price - already;
    if (!canFundInvestInStartups(cost)) return false;

    refundOtherStartupClaims(startup);
    playerCash -= cost;
    startup.isPrivatized = true;
    startup.isScam = false; // pełne badanie due diligence przed wykupem
    startup.originalSuccessChance = startup.successChance;
    startup.successChance = 1;
    startup.currentFunding = startup.fundingGoal;
    startup.investors = { 'Fundusz': price };
    playerPortfolio[symbol] = { investedAmount: price, assetType: 'Startup', isInsured: playerPortfolio[symbol]?.isInsured || false };
    logEvent(`🏢 Fundusz prywatyzuje start-up ${startup.name} za ${cost.toFixed(2)} zł — gwarantowany debiut.`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Zwrot wpłat botów, banków i puli (np. przy prywatyzacji przez fundusz). */
function refundOtherStartupClaims(startup) {
    const symbol = startup.symbol;
    for (const ai of aiCompetitors) {
        const holding = ai.portfolio[symbol];
        if (holding?.investedAmount > 0) { ai.cash += holding.investedAmount; delete ai.portfolio[symbol]; }
    }
    for (const bank of commercialBanks) {
        const amount = bank.startupInvestments?.[symbol];
        if (amount > 0) { bank.cash += amount; delete bank.startupInvestments[symbol]; }
    }
    for (const manager of corporation?.managers || []) {
        const amount = manager.fund.startups?.[symbol];
        if (amount > 0) { manager.fund.cash += amount; delete manager.fund.startups[symbol]; }
    }
    for (const investment of startup.poolInvestors || []) {
        for (const [id, contribution] of Object.entries(investment.contributors || {})) {
            const share = investment.amount * contribution / Math.max(1e-9, Object.values(investment.contributors).reduce((a, b) => a + b, 0));
            if (id === 'player') playerCash += share;
            else { const ai = aiCompetitors.find(item => item.id === id); if (ai) ai.cash += share; }
            if (investmentPool.playerStakes[id]) investmentPool.playerStakes[id] = Math.max(0, investmentPool.playerStakes[id] - contribution);
        }
    }
    startup.poolInvestors = [];
}

// =================================================================================
// DEBIUT (IPO) — udziały znormalizowane do 100%
// =================================================================================

function collectStartupClaims(startup) {
    const symbol = startup.symbol;
    const claims = [];
    const fundClaim = playerPortfolio[symbol]?.investedAmount || 0;
    if (fundClaim > 0) claims.push({ kind: 'player', amount: fundClaim });
    for (const ai of aiCompetitors) {
        const amount = ai.portfolio[symbol]?.investedAmount || 0;
        if (amount > 0) claims.push({ kind: 'ai', ai, amount });
    }
    for (const investment of startup.poolInvestors || []) {
        const total = Object.values(investment.contributors || {}).reduce((a, b) => a + b, 0);
        if (!(total > 0)) continue;
        for (const [id, contribution] of Object.entries(investment.contributors)) {
            const amount = investment.amount * contribution / total;
            if (id === 'player') claims.push({ kind: 'player', amount, pool: true, contribution });
            else { const ai = aiCompetitors.find(item => item.id === id); if (ai) claims.push({ kind: 'ai', ai, amount, pool: true, contribution, id }); }
        }
    }
    for (const bank of commercialBanks) {
        const amount = bank.startupInvestments?.[symbol] || 0;
        if (amount > 0) claims.push({ kind: 'bank', bank, amount });
    }
    for (const manager of corporation?.managers || []) {
        const amount = manager.fund.startups?.[symbol] || 0;
        if (amount > 0) claims.push({ kind: 'botFund', manager, amount });
    }
    return claims;
}

function handleSuccessfulIPO(startup, successMultiplier) {
    if (!startup.operatorStartup && !hasFreeListingSlot()) { parkStartupForListing(startup, successMultiplier); return; } // P1: twardy sufit
    const symbol = startup.symbol;
    const claims = collectStartupClaims(startup);
    purgeSymbolHolders(symbol); // P3: symbol mógł należeć do usuniętej spółki — bez cudzych „duchów” w nowej
    const totalClaims = claims.reduce((sum, claim) => sum + claim.amount, 0);
    const base = Math.max(totalClaims, startup.fundingGoal + (startup.ipoPriceBonus || 0));
    const ipoPrice = getRandomInRange(25, 50);
    const totalShares = Math.max(1000, Math.floor(base * successMultiplier / ipoPrice));
    const investorShares = Math.floor(totalShares * STARTUP_INVESTORS_SHARE * (startup.operatorStartup ? 1 : getStartupTermsFactor())); // D2: gorsze warunki na nasyconym rynku
    let sharesHeld = 0;

    // Wyczyść roszczenia startupowe, potem przydziel akcje.
    delete playerPortfolio[symbol];
    aiCompetitors.forEach(ai => { if (ai.portfolio[symbol]?.investedAmount !== undefined) delete ai.portfolio[symbol]; });

    // Udział = wpłata / max(wpłaty, cel zbiórki): mała wpłata to mały udział, niezebrana część trafia do wolnego obrotu.
    const shareBase = Math.max(totalClaims, Number(startup.fundingGoal) || 0);
    for (const claim of claims) {
        const shares = shareBase > 0 ? Math.floor(investorShares * claim.amount / shareBase) : 0;
        if (shares <= 0) continue;
        sharesHeld += shares;
        if (claim.kind === 'player') {
            const holding = playerPortfolio[symbol] || { shares: 0, avgPrice: ipoPrice, assetType: 'stock' };
            holding.shares += shares;
            playerPortfolio[symbol] = holding;
            if (claim.pool) investmentPool.playerStakes.player = Math.max(0, (investmentPool.playerStakes.player || 0) - claim.contribution);
        } else if (claim.kind === 'ai') {
            const holding = claim.ai.portfolio[symbol] || { shares: 0, avgPrice: ipoPrice };
            holding.shares += shares;
            claim.ai.portfolio[symbol] = holding;
            if (claim.pool && investmentPool.playerStakes[claim.id]) investmentPool.playerStakes[claim.id] = Math.max(0, investmentPool.playerStakes[claim.id] - claim.contribution);
        } else if (claim.kind === 'bank') {
            claim.bank.stockPortfolio[symbol] = { shares, avgPrice: ipoPrice };
            delete claim.bank.startupInvestments[symbol];
        } else if (claim.kind === 'botFund') {
            const holding = claim.manager.fund.portfolio[symbol] || { shares: 0, avgPrice: claim.amount / shares };
            holding.shares += shares;
            claim.manager.fund.portfolio[symbol] = holding;
            delete claim.manager.fund.startups[symbol];
        }
    }
    // Średnia cena zakupu funduszu = zainwestowana kwota / akcje (realny koszt w NAV).
    const fundClaim = claims.filter(claim => claim.kind === 'player').reduce((sum, claim) => sum + claim.amount, 0);
    if (playerPortfolio[symbol]?.shares > 0) playerPortfolio[symbol].avgPrice = fundClaim / playerPortfolio[symbol].shares;

    startup.assetType = undefined;
    startup.exchange = 'BRONZE';
    startup.price = ipoPrice;
    startup.totalShares = totalShares;
    startup.maxShares = totalShares;
    startup.sharesHeld = Math.min(sharesHeld, totalShares);
    startup.insiderShares = 0;
    startup.financialHealth = getRandomIntInRange(1, 4);
    startup.marketBehavior = { phase: 'ipo_boost', endTime: Date.now() + getRandomIntInRange(8000, 20000) / Math.max(1, currentSpeedMultiplier || 1) }; // czas gry, nie rzeczywisty
    ['fundingGoal', 'currentFunding', 'developmentProgress', 'successChance', 'stage', 'poolInvestors', 'rescueGoal', 'rescueCurrent', 'rescueTimeLeft'].forEach(key => delete startup[key]);

    // Bilans po debiucie: kapitał od inwestorów (bez niego wartość godziwa ≈ 0 i kurs spada do zera).
    const raisedCapital = Math.max(totalClaims, totalShares * ipoPrice * 0.9);
    startup.balanceSheet = { assets: raisedCapital, liabilities: 0, shareCapital: raisedCapital * 0.8, retainedEarnings: raisedCapital * 0.2 };
    startup.cash = totalClaims * 0.5; // połowa wpłat zostaje w kasie, reszta poszła na rozwój (aktywa niematerialne)
    startup.quarterlyEarnings = 0;
    if (typeof initializeDescriptionParts === 'function') initializeDescriptionParts(startup);
    if (typeof initializeResearchForStock === 'function') initializeResearchForStock(startup);
    if (typeof initializeFundamentals === 'function') initializeFundamentals(startup, true);
    if (!startup.reputation) startup.reputation = { player: 0 };

    const fundValue = (playerPortfolio[symbol]?.shares || 0) * ipoPrice;
    logEvent(`🔔 IPO: ${startup.name} debiutuje po ${ipoPrice.toFixed(2)} zł (${totalShares.toLocaleString('pl-PL')} akcji).${fundClaim > 0 ? ` Fundusz: ${fundClaim.toFixed(0)} zł → ${fundValue.toFixed(0)} zł.` : ''}`, 'review');
    if (startup.operatorStartup && typeof activateMarketOperator === 'function') activateMarketOperator(startup); // nowy rynek (markets.js)
    if (fundClaim > 0) playerProfile?.cv.push({ type: 'milestone', text: `Startup ${startup.name}: debiut na giełdzie (${fundClaim.toFixed(0)} → ${fundValue.toFixed(0)} zł).` });
}

/** Upadek startupu: zwroty (ubezpieczenie funduszu 75%), usunięcie; nowy startup pojawi się w czasie gry. */
function removeStartup(startup, refundMin = 0, refundMax = 0) {
    const symbol = startup.symbol;
    const holding = playerPortfolio[symbol];
    if (holding?.investedAmount > 0) {
        const refund = holding.isInsured ? holding.investedAmount * 0.75 : holding.investedAmount * (refundMax > 0 ? getRandomInRange(refundMin, refundMax) : 0);
        if (refund > 0) playerCash += refund;
        logEvent(`📉 Startup ${startup.name} nie debiutuje — fundusz odzyskuje ${refund.toFixed(2)} z ${holding.investedAmount.toFixed(2)} zł${holding.isInsured ? ' (ubezpieczenie)' : ''}.`, 'review');
        playerProfile?.cv.push({ type: 'milestone', text: `Startup ${startup.name}: upadek (odzysk ${refund.toFixed(0)} zł).` });
    }
    for (const ai of aiCompetitors) {
        const aiHolding = ai.portfolio[symbol];
        if (aiHolding?.investedAmount > 0) ai.cash += aiHolding.investedAmount * (refundMax > 0 ? getRandomInRange(refundMin, refundMax) : 0);
        delete ai.portfolio[symbol];
    }
    for (const bank of commercialBanks) if (bank.startupInvestments) delete bank.startupInvestments[symbol];
    for (const manager of corporation?.managers || []) {
        const amount = manager.fund.startups?.[symbol];
        if (amount > 0) manager.fund.cash += amount * (refundMax > 0 ? getRandomInRange(refundMin, refundMax) : 0);
        if (manager.fund.startups) delete manager.fund.startups[symbol];
    }
    delete playerPortfolio[symbol];
    if (startup.operatorStartup && typeof onOperatorStartupRemoved === 'function') onOperatorStartupRemoved(startup); // upadek operatora: sponsorzy znikają
    const index = stocks.findIndex(s => s.symbol === symbol);
    if (index > -1) stocks.splice(index, 1);
}

// =================================================================================
// ZDARZENIA INKUBATORA
// =================================================================================

/** Anioł biznesu z zewnątrz dorzuca środki do startupu w fazie finansowania. */
function triggerStartupFundingEvent() {
    const candidates = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding');
    const startup = getRandomElement(candidates);
    if (!startup) return null;
    const amount = Math.round(startup.fundingGoal * getRandomInRange(0.05, 0.15));
    startup.currentFunding = Math.min(startup.fundingGoal, startup.currentFunding + amount);
    logEvent(`[INKUBATOR] 👼 Anioł biznesu wspiera ${startup.name} kwotą ${amount.toLocaleString('pl-PL')} zł.`, 'market');
    return startup.symbol;
}

const gamingStartupEvents = [
    { text: name => `🎮 Zwiastun gry ${name} bije rekordy wyświetleń!`, progress: 8, chance: 0.04 },
    { text: name => `🐞 Testerzy ${name} znajdują krytyczny błąd — prace się opóźniają.`, progress: -10, chance: -0.03 },
    { text: name => `🏆 ${name} wygrywa nagrodę na targach gier.`, progress: 5, chance: 0.06 },
    { text: name => `💸 Wydawca wycofuje się ze współpracy z ${name}.`, progress: -5, chance: -0.06 }
];

function triggerGamingStartupEvent(startup) {
    const event = getRandomElement(gamingStartupEvents);
    startup.developmentProgress = Math.max(0, Math.min(99, startup.developmentProgress + event.progress));
    startup.successChance = Math.max(0, Math.min(1, startup.successChance + event.chance));
    logEvent(`[INKUBATOR] ${event.text(startup.name)}`, 'company');
}

/** Oferta specjalna startupu dla funduszu (zniżka, bonus udziałów lub wyższa szansa sukcesu). */
function triggerStartupOfferEvent() {
    const startup = getRandomElement(stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding'));
    if (!startup || getFundStartupCapacity() < 500 || typeof openStartupOfferModal !== 'function') return null;
    const offers = [
        { type: 'DISCOUNT', value: 0.1, offerText: `${startup.name} oferuje funduszowi 10% zniżki przy inwestycji w tej rundzie.` },
        { type: 'BONUS_SHARES', value: 0.15, offerText: `${startup.name} proponuje 15% bonusowych udziałów za wejście teraz.` },
        { type: 'SUCCESS_BOOST', value: 0.05, offerText: `${startup.name} pozyskał mentora — inwestycja teraz podniesie szansę sukcesu o 5 pp.` }
    ];
    openStartupOfferModal({ startup, offer: getRandomElement(offers) });
    return startup.symbol;
}

// #################################################################################
// ## defense.js
// #################################################################################

// defense.js — Zbrojeniówka i Gwardia (wersja 0.11.4 „Ciemna Strefa”)
//
// Sektor „Obronność”: 4 spółki na Giełdzie Złotej i Platynowej. Targi zbrojeniowe raz w roku gry
// (nagroda „Innowacja roku”), kontrakty państwowe zależne od partii rządzącej, drobny bonus od siły policji,
// spółki w świetnej kondycji dotują policję. Mafia ich nie kupuje (isMafiaImmune). Prezesi tych spółek
// mogą mieć cechy: Emerytowany policjant, Generał, Były wojskowy.
// Fundusz „Gwardia”: bot, który nie współpracuje z mafią, lubi zbrojeniówkę i klasyczne sektory; jego duże
// pakiety chronią spółki przed ludźmi mafii w zarządach. Bez dochodu „z powietrza”.

const DEFENSE_SECTOR = 'Obronność';
const DEFENSE_COMPANIES = [
    { name: 'Polska Zbrojownia', symbol: 'PZB', exchange: 'PLATINUM', price: [1800, 2600] },
    { name: 'Orzeł Defence', symbol: 'ORZD', exchange: 'PLATINUM', price: [1600, 2200] },
    { name: 'Grom Systems', symbol: 'GROM', exchange: 'GOLD', price: [600, 1200] },
    { name: 'Husaria Arms', symbol: 'HUSA', exchange: 'GOLD', price: [450, 900] }
];
const DEFENSE_CEO_TRAITS = ['emerytowany_policjant', 'general', 'byly_wojskowy'];
const GUARD_LIKED_SECTORS = [DEFENSE_SECTOR, 'Energia', 'Przemysł', 'Bankowość', 'Żywność', 'Transport'];
const GUARD_DISLIKED_SECTORS = ['Technologia', 'Gaming', 'Badania'];

function isDefenseCompany(stock) {
    return Boolean(stock?.sector?.includes(DEFENSE_SECTOR));
}

/** Cecha „mundurowa” dla prezesa spółki zbrojeniowej (40% szans). */
function maybeGiveDefenseTrait(stock) {
    if (!stock?.ceo || Math.random() > 0.4) return;
    const id = getRandomElement(DEFENSE_CEO_TRAITS);
    if (stock.ceo.traits?.some(t => t.id === id)) return;
    stock.ceo.traits = [...(stock.ceo.traits || []), { id, name: ceoTraits[id].name, rarity: 'hidden' }];
}

/** Nowa gra i migracja: 4 spółki zbrojeniowe + fundusz Gwardia. */
function initDefenseSector() {
    for (const def of DEFENSE_COMPANIES) {
        if (stocks.some(s => s.defenseId === def.symbol)) continue;
        const stock = createListedCompany({ name: def.name, symbol: uniqueSymbol(def.symbol), sector: [DEFENSE_SECTOR], price: getRandomInRange(...def.price), totalShares: getRandomIntInRange(150, 300) * 1000, exchange: def.exchange });
        stock.defenseId = def.symbol;
        stock.financialHealth = getRandomIntInRange(1, 3);
        maybeGiveDefenseTrait(stock);
        stocks.push(stock);
    }
    spawnGuardFund();
}

function getGuardFund() {
    return aiCompetitors.find(ai => ai.isGuard) || null;
}

function spawnGuardFund() {
    if (getGuardFund()) return getGuardFund();
    const richest = Math.max(...aiCompetitors.filter(ai => !ai.isMafia).map(ai => ai.cash || 0), 100000);
    const guard = { id: 'guard_fund', name: 'Fundusz „Gwardia”', cash: Math.round(richest * 1.2), portfolio: {}, loans: [], personality: 'guard', isGuard: true, accessLevel: 7, hasTBillAccess: false, tBills: [], creditScore: 100 };
    aiCompetitors.push(guard);
    return guard;
}

/** Gwardia: kupuje zbrojeniówkę i klasyki, sprzedaje nowoczesne sektory. */
function runGuardFundQuarterly() {
    const guard = getGuardFund();
    if (!guard) return;
    for (const [symbol, holding] of Object.entries(guard.portfolio)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock && stock.sector?.some(sec => GUARD_DISLIKED_SECTORS.includes(sec)) && holding.shares > 0) aiSellStock(guard, symbol, holding.shares);
    }
    const liked = stocks.filter(s => !s.assetType && !s.isBankrupt && s.sector?.some(sec => GUARD_LIKED_SECTORS.includes(sec)) && !s.sector?.some(sec => GUARD_DISLIKED_SECTORS.includes(sec)) && getAvailableShares(s) > 0);
    const picks = [...liked.filter(isDefenseCompany), ...liked.sort(() => Math.random() - 0.5)].slice(0, 3);
    for (const stock of picks) {
        const quantity = Math.floor(Math.min(getAvailableShares(stock), stock.totalShares * 0.01, guard.cash * 0.05 / Math.max(0.01, stock.price)));
        if (quantity > 0) aiBuyStock(guard, stock.symbol, quantity);
    }
}

/** Duży pakiet Gwardii (≥ 5%) chroni spółkę przed ludźmi mafii. */
function isGuardProtected(stock) {
    const guard = getGuardFund();
    return Boolean(guard && (guard.portfolio[stock.symbol]?.shares || 0) / Math.max(1, stock.totalShares) >= 0.05);
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processDefenseQuarterly() {
    const companies = stocks.filter(s => isDefenseCompany(s) && !s.isBankrupt);
    const police = typeof getInstitutionEffectiveness === 'function' ? getInstitutionEffectiveness(oversight.police) : 0.3;

    // Kontrakty państwowe: częściej przy rządzie „państwowym” i w kampanii wyborczej.
    const stateParty = macro.election?.ruling === 'state' || macro.election?.coalition?.partner === 'state';
    for (const stock of companies) {
        const favor = typeof getPoliticalFavor === 'function' && getFundStakePct(stock) > 0.5 ? getPoliticalFavor() * 0.1 : 0;
        if (Math.random() < (stateParty ? 0.3 : 0.15) + (macro.election?.campaign ? 0.1 : 0) + favor) {
            const contract = Math.round(Math.min(Math.max(0, governmentTreasury) * 0.002, getMarketCapValue(stock) * 0.02));
            if (contract > 0) {
                governmentTreasury -= contract;
                adjustCompanyCash(stock, contract);
                adjustBalanceSheet(stock, { assets: contract, retainedEarnings: contract });
                logEvent(`🛡️ ${stock.name} podpisuje kontrakt z MON na ${formatZl(contract, 0)}.`, 'state');
            }
        }
        // Spółka w świetnej kondycji dotuje policję.
        const earnings = Number(stock.quarterlyEarnings) || 0;
        if (earnings > 0 && stock.financialHealth >= 3 && Math.random() < 0.2 && typeof fundInstitution === 'function') {
            const donation = Math.min(Math.max(0, stock.cash) * 0.05, earnings * 0.01);
            adjustCompanyCash(stock, -donation);
            adjustBalanceSheet(stock, { assets: -donation, retainedEarnings: -donation });
            fundInstitution(oversight.police, donation);
            logEvent(`🚓 ${stock.name} przekazuje ${formatZl(donation, 0)} na wyposażenie policji.`, 'state');
        }
        // Cechy prezesów wpływają na korupcję i mafię.
        if (hasCeoTrait(stock, 'emerytowany_policjant')) { oversight.corruption = Math.max(0, oversight.corruption - 1); if (typeof addMafiaInfluence === 'function') addMafiaInfluence(-2); }
        if (hasCeoTrait(stock, 'general') && typeof addMafiaInfluence === 'function') addMafiaInfluence(-3);
        if (!stock.ceo?.traits?.some(t => DEFENSE_CEO_TRAITS.includes(t.id)) && Math.random() < 0.05) maybeGiveDefenseTrait(stock);
    }

    // Targi zbrojeniowe raz w roku gry.
    if (companies.length && macro.quarter % 4 === 2) {
        const winner = getRandomElement(companies);
        for (const stock of companies) applyPriceEffect(stock.symbol, stock === winner ? 0.06 : 0.01, 'positive', 'company');
        logEvent(`🎖️ Targi zbrojeniowe: nagrodę „Innowacja roku” zdobywa ${winner.name}!`, 'company');
    }
    runGuardFundQuarterly();
    if (!getGuardFund()) spawnGuardFund();
    if (companies.length < DEFENSE_COMPANIES.length) initDefenseSector(); // odtwarza brakujące (np. po bankructwie — nowy gracz w branży)
}

/** Bonus wzrostu spółek zbrojeniowych od siły policji (computeQuarterResults). */
function getDefenseGrowthBonus(stock) {
    if (!isDefenseCompany(stock) || typeof getInstitutionEffectiveness !== 'function') return 0;
    return getInstitutionEffectiveness(oversight.police) * 0.004;
}

// #################################################################################
// ## accounting.js
// #################################################################################

// =================================================================================
// 0.12 N3: KSIĘGOWY → AUDYTOR. Kreatywna księgowość (zawyżanie zysków), przepływy
// pieniężne, należności, czerwone flagi, audyt zlecany przez fundusz.
//
// Spółka-oszust raportuje zysk wyższy od prawdziwego. Gotówka płynie z PRAWDZIWEGO
// zysku, a różnica trafia do należności (aktywa „na papierze”). Po 3–7 kwartałach
// przychodzi korekta (3–7 kw.): odpis należności, spadek kursu, zmiana prezesa.
// Cel: ok. 3–5% notowanych spółek naraz (decyzja użytkownika).
// =================================================================================

const FRAUD_MAX_SHARE = 0.05;          // najwyżej 5% notowanych spółek naraz
const FRAUD_START_CHANCE = 0.008;      // bazowa szansa na kwartał (słaba kondycja ×2, skłonny prezes ×3)
const FRAUD_FAKE_CAP = 0.12;           // zawyżenie najwyżej 12% przychodów kwartału
const AUDIT_MISS_CHANCE = 0.1;         // audytor przeocza oszustwo
const ACCOUNTANT_REQUIRED = { pnl: 1, balance: 2, cashflow: 3, flags: 4, audit: 5 };

function isFraudEligible(stock) {
    return stock && !stock.assetType && !stock.isBankrupt && !stock.isBankStock && !stock.isStateOwned && !stock.marketOperator && stock.fundamentals;
}

function getAccountingQuarter() {
    return typeof macro === 'object' ? macro.quarter : 0;
}

// ---------------------------------------------------------------------------------
// RAPORT KWARTALNY: zawyżenie, należności, przepływy (wołane z processQuarterlyReports)
// ---------------------------------------------------------------------------------

/** Ile spółka „dopisze” do zysku w tym raporcie (0 dla uczciwych). */
function getFraudInflation(stock, quarterModel, realEarnings) {
    const fraud = stock.fraud;
    if (!fraud || !quarterModel) return 0;
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const expected = (Number(stock.fundamentals?.expectedEps) || 0) * shares;
    // Wynik „tuż nad konsensusem” — typowy ślad zarządzania wynikiem.
    const target = expected > 0 ? expected * (1 + getRandomInRange(0.01, 0.06)) : 0;
    const fake = Math.max(quarterModel.revenue * 0.015, target - realEarnings);
    return Math.min(fake, quarterModel.revenue * FRAUD_FAKE_CAP);
}

/**
 * Po raporcie: należności (uczciwe ~ przychody × wskaźnik + zawyżenie) i przepływy z działalności.
 * Zwraca { receivables, ocf } do zapisania w historii kwartału.
 */
function recordAccountingQuarter(stock, quarterModel, realEarnings, fake) {
    if (!Number.isFinite(stock.receivablesRatio)) stock.receivablesRatio = getRandomInRange(0.15, 0.35);
    const revenue = quarterModel?.revenue || 0;
    const honest = revenue * stock.receivablesRatio * (1 + gaussianRandom() * 0.08);
    const previousHonest = Number.isFinite(stock.honestReceivables) ? stock.honestReceivables : honest;
    stock.honestReceivables = honest;
    if (fake > 0) {
        stock.fraud.total += fake;
        adjustBalanceSheet(stock, { assets: fake, retainedEarnings: fake }); // „zysk” bez gotówki = należności
    }
    const depreciation = quarterModel?.depreciation || 0;
    const ocf = realEarnings + depreciation - (honest - previousHonest);
    return { receivables: honest + (stock.fraud?.total || 0), ocf };
}

// ---------------------------------------------------------------------------------
// CO KWARTAŁ: nowe oszustwa, zmiany audytora, korekty, audyty
// ---------------------------------------------------------------------------------

function processAccountingQuarterly() {
    const quarter = getAccountingQuarter();
    const listed = stocks.filter(s => !s.assetType && !s.isBankrupt);
    let active = listed.filter(s => s.fraud).length;
    const knf = typeof getInstitutionEffectiveness === 'function' && typeof oversight === 'object' ? getInstitutionEffectiveness(oversight.knf) : 0.3;

    for (const stock of listed) {
        // Zmiana audytora: częsta u oszustów, rzadka u uczciwych (szum).
        if (Math.random() < (stock.fraud ? 0.25 : 0.02)) stock.auditorChangedQuarter = quarter;

        if (stock.fraud) {
            const early = quarter - stock.fraud.start >= 2 && Math.random() < knf * 0.08; // KNF wykrywa wcześniej (nie od razu)
            if (early || quarter >= stock.fraud.correctAt) revealFraud(stock, early ? 'KNF' : 'audytor');
            continue;
        }
        if (!isFraudEligible(stock) || active >= Math.max(1, Math.floor(listed.length * FRAUD_MAX_SHARE))) continue;
        let chance = FRAUD_START_CHANCE;
        if ((Number(stock.financialHealth) || 0) < 0) chance *= 2;
        if (stock.ceo?.traits?.some(t => ['skorumpowany', 'sklonny_do_korupcji', 'chciwy'].includes(t.id))) chance *= 3;
        if (Math.random() < chance) { stock.fraud = { start: quarter, correctAt: quarter + getRandomIntInRange(3, 7), total: 0 }; active++; }
    }

    // Zlecone audyty: wynik po kwartale.
    for (const stock of stocks.filter(s => s.audit && !s.audit.done && quarter > s.audit.quarter)) finishAudit(stock);
}

/** Korekta wyników: odpis zawyżonych należności, spadek kursu, nowy prezes. */
function revealFraud(stock, by) {
    const fraud = stock.fraud;
    stock.fraud = null;
    if (!fraud) return;
    const writeOff = Math.min(fraud.total, Math.max(0, Number(stock.balanceSheet?.assets) || 0));
    if (writeOff > 0) adjustBalanceSheet(stock, { assets: -writeOff, retainedEarnings: -writeOff });
    const drop = 0.2 + Math.min(0.2, writeOff / Math.max(1, getMarketCapValue(stock)));
    applyPriceEffect(stock.symbol, -drop, 'negative', 'company');
    stock.financialHealth = Math.max(-5, (Number(stock.financialHealth) || 0) - 1.5);
    stock.fraudHistory = [...(stock.fraudHistory || []), { quarter: getAccountingQuarter(), writeOff, by }].slice(-3);
    if (typeof replaceCeo === 'function' && stock.ceo) replaceCeo(stock);
    if (typeof addChartEvent === 'function') addChartEvent(stock, '🧾', `Korekta wyników: odpis ${formatZl(writeOff, 0)}`);
    const text = `🧾 KOREKTA WYNIKÓW: ${stock.name} (${stock.symbol}) zawyżała zyski — odpis ${formatZl(writeOff, 0)}, kurs −${(drop * 100).toFixed(0)}%, zarząd odwołany (wykrył: ${by}).`;
    logEvent(text, 'company');
    if (typeof showBreakingNews === 'function') showBreakingNews(text, false);

    // Afera audytora: firma, która niedawno dała „czystą” opinię.
    if (stock.audit?.done && stock.audit.clean && stock.audit.missed) {
        const firm = stocks.find(s => s.symbol === stock.audit.firm);
        if (firm) { applyPriceEffect(firm.symbol, -0.15, 'negative', 'company'); logEvent(`🧾 Afera audytora: ${firm.name} przeoczyła oszustwo w ${stock.name}.`, 'company'); }
    }
    if (typeof unlockAcademyEntry === 'function') {
        const held = (playerPortfolio[stock.symbol]?.shares || 0) > 0;
        unlockAcademyEntry('kreatywna', held ? `${stock.name}: korekta wyników w Twojej spółce` : '');
    }
}

// ---------------------------------------------------------------------------------
// CZERWONE FLAGI
// ---------------------------------------------------------------------------------

/** Lista sygnałów ostrzegawczych z danych publicznych: [{ id, label, desc }]. */
function getRedFlags(stock) {
    const history = stock?.fundamentals?.history || [];
    const real = history.filter(q => !q.synthetic);
    const flags = [];
    const last4 = real.slice(-4);
    if (last4.length >= 3) {
        const net = last4.reduce((s, q) => s + (Number(q.netIncome) || 0), 0);
        const ocf = last4.reduce((s, q) => s + (Number(q.ocf) || 0), 0);
        if (net > 0 && ocf < net * 0.6) flags.push({ id: 'cash', label: 'Zysk bez gotówki', desc: `Przepływy z działalności (${formatZl(ocf, 0)}) dużo niższe od zysku (${formatZl(net, 0)}).` });
    }
    if (real.length >= 5) {
        const now = real[real.length - 1], before = real[real.length - 5];
        const recvGrowth = before.receivables > 0 ? now.receivables / before.receivables - 1 : 0;
        const revGrowth = before.revenue > 0 ? now.revenue / before.revenue - 1 : 0;
        if (recvGrowth - revGrowth > 0.25) flags.push({ id: 'receivables', label: 'Należności rosną szybciej niż sprzedaż', desc: `Należności +${(recvGrowth * 100).toFixed(0)}%, przychody ${revGrowth >= 0 ? '+' : ''}${(revGrowth * 100).toFixed(0)}% r/r.` });
    }
    if (Number.isFinite(stock.auditorChangedQuarter) && getAccountingQuarter() - stock.auditorChangedQuarter <= 4) {
        flags.push({ id: 'auditor', label: 'Zmiana audytora', desc: `Spółka zmieniła firmę audytorską ${getAccountingQuarter() - stock.auditorChangedQuarter} kw. temu.` });
    }
    const surprises = (stock.surpriseHistory || []).slice(-3);
    if (surprises.length === 3 && surprises.every(s => s >= 0 && s <= 0.08)) {
        flags.push({ id: 'beat', label: 'Wyniki zawsze tuż nad konsensusem', desc: 'Trzy raporty z rzędu minimalnie powyżej oczekiwań — możliwe „zarządzanie wynikiem”.' });
    }
    const grey = typeof getGreyShare === 'function' ? getGreyShare(stock) : 0;
    if (grey > 0.05) flags.push({ id: 'grey', label: 'Szara strefa', desc: `Ok. ${(grey * 100).toFixed(0)}% zatrudnionych bez umów — wyższa marża dziś, ryzyko kary Inspekcji Pracy jutro.` });
    return flags;
}

// ---------------------------------------------------------------------------------
// AUDYT (Księgowy poziom 5)
// ---------------------------------------------------------------------------------

function getAuditCost(stock) {
    return Math.round(Math.max(3000, getMarketCapValue(stock) * 0.002));
}

function orderAudit(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || stock.assetType) return false;
    if (getSkillLevel('accountant') < ACCOUNTANT_REQUIRED.audit) { showToast('Audyt zleca Audytor (Księgowy poziom 5).', 'warning'); return false; }
    if (stock.audit && !stock.audit.done) { showToast('Audyt tej spółki już trwa.', 'default'); return false; }
    const cost = getAuditCost(stock);
    if (playerCash < cost) { showToast(`Audyt kosztuje ${formatZl(cost, 0)} — za mało gotówki funduszu.`, 'error'); return false; }
    const firm = stocks.filter(s => s.assetType === 'Accounting' && !s.isBankrupt)[0] || null;
    playerCash -= cost;
    if (firm) { adjustCompanyCash(firm, cost); firm.quarterlyEarnings = (Number(firm.quarterlyEarnings) || 0) + cost; }
    recordPayment('player-fund', firm || 'external:audytor', cost, `Audyt: ${stock.name}`);
    stock.audit = { quarter: getAccountingQuarter(), firm: firm?.symbol || null, done: false };
    logEvent(`🔍 Fundusz zleca audyt ${stock.name} (${formatZl(cost, 0)}). Wynik w przyszłym kwartale.`, 'review');
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('audyt');
    return true;
}

function finishAudit(stock) {
    const audit = stock.audit;
    const fraud = stock.fraud;
    audit.done = true;
    audit.doneQuarter = getAccountingQuarter();
    audit.missed = Boolean(fraud) && Math.random() < AUDIT_MISS_CHANCE;
    audit.clean = !fraud || audit.missed;
    audit.inflation = fraud && !audit.missed ? fraud.total : 0;
    const body = audit.clean
        ? `Audyt ${stock.name}: sprawozdania rzetelne, bez istotnych zastrzeżeń.`
        : `Audyt ${stock.name}: zysk zawyżony o ok. ${formatZl(audit.inflation, 0)} (fikcyjne należności). Korekta wyników jest kwestią czasu.`;
    if (typeof addMail === 'function') addMail({ sender: CORPORATION_SENDER, subject: audit.clean ? `🔍 Audyt ${stock.symbol}: czysto` : `🔍 Audyt ${stock.symbol}: NIEPRAWIDŁOWOŚCI`, body, importance: audit.clean ? 2 : 3, symbol: stock.symbol });
}

// ---------------------------------------------------------------------------------
// WIDOK: sekcje w zakładce „Finanse” karty spółki
// ---------------------------------------------------------------------------------

function renderAccountingSection(stock) {
    const level = getSkillLevel('accountant');
    const history = (stock.fundamentals?.history || []).slice(-8);
    const locked = (need, label) => `<p class="text-xs text-muted mt-2">🔒 ${label} — szkolenie „Księgowy”, poziom ${need}.</p>`;
    const money = v => Number.isFinite(v) ? formatZl(v, 0) : '—';
    let html = '';

    // 1. Rachunek zysków i strat
    if (level >= ACCOUNTANT_REQUIRED.pnl) {
        const cols = history.map((q, i) => `<th class="cell-number">${q.synthetic ? 'est.' : `Q−${history.length - 1 - i}`}</th>`).join('');
        const rowOf = (label, key, hint) => `<tr><td title="${escapeHtml(hint)}">${label}</td>${history.map(q => `<td class="cell-number">${money(q[key])}</td>`).join('')}</tr>`;
        html += `<h4 class="mt-3">📒 Rachunek zysków i strat (kwartały)</h4>
            <div class="scanner-table-wrap"><table class="asset-mini-table w-full"><thead><tr><th></th>${cols}</tr></thead><tbody>
                ${rowOf('Przychody', 'revenue', 'Sprzedaż w kwartale.')}
                ${history.some(q => Number.isFinite(q.labor)) ? rowOf('w tym koszt pracy', 'labor', 'Płace i świadczenia: udział w przychodach × indeks kosztu pracy (0.13).') : ''}
                ${rowOf('EBITDA', 'ebitda', 'Wynik operacyjny przed amortyzacją.')}
                ${rowOf('− Amortyzacja', 'depreciation', 'Zużycie majątku — koszt bez wydatku gotówki.')}
                ${rowOf('− Odsetki', 'interest', 'Koszt długu.')}
                ${rowOf('− Podatek', 'tax', 'Podatek dochodowy.')}
                ${rowOf('= Zysk netto', 'netIncome', 'To, co zostaje dla akcjonariuszy.')}
            </tbody></table></div>${renderLaborCostBar(stock, history)}`;
    } else return locked(1, 'Rachunek zysków i strat, bilans, przepływy, czerwone flagi i audyt');

    // 2. Bilans
    if (level >= ACCOUNTANT_REQUIRED.balance) {
        const assets = Number(stock.balanceSheet?.assets) || 0, liabilities = Number(stock.balanceSheet?.liabilities) || 0;
        const cash = Math.max(0, Number(stock.cash) || 0);
        const receivables = Math.min(assets, (stock.honestReceivables || 0) + (stock.fraud?.total || 0));
        const equity = assets - liabilities;
        const bar = (value, total, cls) => `<span class="acc-bar ${cls}" style="width:${total > 0 ? Math.max(2, Math.min(100, value / total * 100)) : 0}%"></span>`;
        html += `<h4 class="mt-3">⚖️ Bilans</h4>
            <div class="acc-balance">
                <div><strong>Aktywa ${money(assets)}</strong><div class="acc-bars">${bar(cash, assets, 'cash')}${bar(receivables, assets, 'recv')}${bar(Math.max(0, assets - cash - receivables), assets, 'other')}</div>
                    <span class="text-xs">🟩 gotówka ${money(cash)} · 🟨 należności ${money(receivables)} · ⬜ pozostałe ${money(Math.max(0, assets - cash - receivables))}</span></div>
                <div><strong>Pasywa ${money(assets)}</strong><div class="acc-bars">${bar(Math.max(0, equity), assets, 'equity')}${bar(liabilities, assets, 'debt')}</div>
                    <span class="text-xs">🟦 kapitał własny ${money(equity)} · 🟥 zobowiązania ${money(liabilities)}</span></div>
            </div>
            <p class="text-sm">Dług netto (zobowiązania − gotówka): <strong>${money(liabilities - cash)}</strong>. Bilans zawsze się równa: aktywa = kapitał własny + zobowiązania.</p>`;
    } else html += locked(2, 'Bilans');

    // 3. Przepływy pieniężne
    if (level >= ACCOUNTANT_REQUIRED.cashflow) {
        const real = history.filter(q => !q.synthetic && Number.isFinite(q.ocf));
        const net = real.reduce((s, q) => s + q.netIncome, 0), ocf = real.reduce((s, q) => s + q.ocf, 0);
        html += `<h4 class="mt-3">💧 Przepływy pieniężne z działalności</h4>
            ${real.length ? `<table class="asset-mini-table w-full"><thead><tr><th></th>${real.map((q, i) => `<th class="cell-number">Q−${real.length - 1 - i}</th>`).join('')}</tr></thead><tbody>
                <tr><td>Zysk netto</td>${real.map(q => `<td class="cell-number">${money(q.netIncome)}</td>`).join('')}</tr>
                <tr><td>Gotówka z działalności</td>${real.map(q => `<td class="cell-number ${q.ocf < q.netIncome * 0.6 && q.netIncome > 0 ? 'text-down' : ''}">${money(q.ocf)}</td>`).join('')}</tr>
            </tbody></table>
            <p class="text-sm">Zysk pokryty gotówką: <strong class="${net > 0 && ocf < net * 0.6 ? 'text-down' : ''}">${net > 0 ? `${(ocf / net * 100).toFixed(0)}%` : '—'}</strong>. Zdrowa spółka zamienia zysk w gotówkę (zwykle ≥ 80%).</p>`
            : '<p class="text-sm text-muted">Przepływy pojawią się po pierwszym raporcie kwartalnym.</p>'}`;
    } else html += locked(3, 'Przepływy pieniężne');

    // 4. Czerwone flagi
    if (level >= ACCOUNTANT_REQUIRED.flags) {
        const flags = getRedFlags(stock);
        html += `<h4 class="mt-3">🚩 Czerwone flagi</h4>${flags.length
            ? `<ul class="list-plain text-sm">${flags.map(f => `<li>🚩 <strong>${escapeHtml(f.label)}</strong> — ${escapeHtml(f.desc)}</li>`).join('')}</ul><p class="text-xs text-muted">Jedna flaga bywa przypadkiem. Kilka naraz to poważne ostrzeżenie.</p>`
            : '<p class="text-sm text-up">Brak sygnałów ostrzegawczych.</p>'}`;
    } else html += locked(4, 'Czerwone flagi');

    // 5. Audyt
    if (level >= ACCOUNTANT_REQUIRED.audit) {
        const audit = stock.audit;
        html += `<h4 class="mt-3">🔍 Audyt</h4>${audit && !audit.done ? '<p class="text-sm">Audyt w toku — wynik w przyszłym kwartale.</p>'
            : `${audit?.done ? `<p class="text-sm ${audit.clean ? 'text-up' : 'text-down'}">Ostatni audyt (kw. ${audit.doneQuarter}): ${audit.clean ? 'bez zastrzeżeń' : `zysk zawyżony o ok. ${money(audit.inflation)}`}.</p>` : ''}
                <button class="btn-secondary" onclick="orderAudit('${stock.symbol}'); renderCompanyCard();">Zleć audyt (${formatZl(getAuditCost(stock), 0)} z funduszu)</button>
                <p class="text-xs text-muted">Audytor sprawdza dokumenty u źródła. Rzadko, ale zdarza się, że przeoczy oszustwo.</p>`}`;
    } else html += locked(5, 'Audyt');
    return html;
}

// #################################################################################
// ## workforce.js
// #################################################################################

// workforce.js — Pracownicy w spółkach (wersja 0.13, części S2–S4)
//
// Każda spółka z modelem przychodów ma 5 grup zatrudnienia (struktura według sektora), koszt pracy jako
// udział w przychodach i indeks kosztu pracy (płace grup × polityka kadrowa / wydajność + koszty związku).
// Marża = marża_0.12 + udział_kosztu_pracy × (1 − indeks) — przy ustawieniach neutralnych (polityka
// Standardowa, płace 1,0, brak związku) wynik jest identyczny jak w 0.12. Liczby pracowników są fabularne
// (start według giełdy, potem proporcjonalnie do realnych przychodów). Prezes ustala politykę według cech;
// większościowiec (gracz lub bot) może ją zmienić. Zadowolenie 0–100, rotacja, szara strefa i Inspekcja
// Pracy, związki zakładowe i sektorowe, żądania co 4 kwartały, strajki, podkupowanie specjalistów i prezesów.

// Struktura zatrudnienia (udziały) i koszt pracy (% przychodów) według sektora.
const WORKFORCE_TEMPLATES = {
    'Technologia':   { board: 4, specialists: 45, workers: 41, cheap: 10, grey: 0, labor: 0.30 },
    'Badania':       { board: 4, specialists: 50, workers: 36, cheap: 10, grey: 0, labor: 0.40 },
    'Medycyna':      { board: 4, specialists: 40, workers: 46, cheap: 10, grey: 0, labor: 0.30 },
    'Finanse':       { board: 5, specialists: 35, workers: 55, cheap: 5,  grey: 0, labor: 0.22 },
    'Przemysł':      { board: 2, specialists: 15, workers: 58, cheap: 23, grey: 2, labor: 0.25 },
    'Chemia':        { board: 2, specialists: 15, workers: 58, cheap: 23, grey: 2, labor: 0.15 },
    'Budowlany':     { board: 2, specialists: 10, workers: 45, cheap: 35, grey: 8, labor: 0.30 },
    'Żywność':       { board: 2, specialists: 8,  workers: 50, cheap: 35, grey: 5, labor: 0.20 },
    'Usługi':        { board: 2, specialists: 8,  workers: 50, cheap: 33, grey: 7, labor: 0.40 },
    'Turystyka':     { board: 2, specialists: 8,  workers: 50, cheap: 33, grey: 7, labor: 0.35 },
    'Energia':       { board: 3, specialists: 25, workers: 62, cheap: 10, grey: 0, labor: 0.12 },
    'Nieruchomości': { board: 5, specialists: 20, workers: 55, cheap: 18, grey: 2, labor: 0.08 }
};
// Pozostałe sektory: najbliższy wzorzec (koszt pracy można nadpisać).
const WORKFORCE_TEMPLATE_ALIASES = {
    'Gaming': ['Technologia'], 'Media': ['Technologia', 0.30], 'Bankowość': ['Finanse', 0.20], 'Bankowość Komercyjna': ['Finanse', 0.20],
    'Finanse Konsumenckie': ['Finanse', 0.25], 'Obronność': ['Przemysł'], 'Dobra konsumpcyjne': ['Żywność', 0.20],
    'Logistyka': ['Usługi', 0.35], 'Transport': ['Usługi', 0.35]
};
const WORKFORCE_DEFAULT_TEMPLATE = { board: 3, specialists: 20, workers: 55, cheap: 20, grey: 2, labor: 0.25 };

// Zatrudnienie na starcie według giełdy (liczby fabularne).
const WORKFORCE_EMPLOYEES_BY_EXCHANGE = {
    JUNK: [20, 150], BRONZE: [100, 600], SILVER: [400, 2500], GOLD: [2000, 10000], PLATINUM: [8000, 40000],
    RUBY: [30000, 120000], EMERALD: [30000, 120000], DIAMOND: [30000, 120000]
};

const LABOR_POLICIES = {
    exploit:  { name: 'Wyzysk',       icon: '⛓️', pay: 0.85, target: 20, union: 3,   productivity: -0.03, grey: 0.10, inspection: 3 },
    saving:   { name: 'Oszczędna',    icon: '✂️', pay: 0.93, target: 40, union: 1.8, productivity: 0,     grey: 0,    inspection: 1 },
    standard: { name: 'Standardowa',  icon: '⚖️', pay: 1.00, target: 60, union: 1,   productivity: 0,     grey: 0,    inspection: 1 },
    social:   { name: 'Prospołeczna', icon: '🤝', pay: 1.08, target: 80, union: 0.4, productivity: 0.04,  grey: 0,    inspection: 1, rotation: 0.5 }
};
const LABOR_POLICY_ORDER = ['exploit', 'saving', 'standard', 'social'];
const LABOR_POLICY_LOCK_QUARTERS = 4;
const GREY_WAGE_FACTOR = 0.6;
const UNION_COST = 0.01;
const UNION_BASE_CHANCE = 0.03;      // plan: 2% — podniesione po przebiegach ×50 (cel: 15–35% spółek ze związkiem po 6,5 roku)
const UNION_DEMAND_EVERY = 4;
const COLLECTIVE_AGREEMENT_QUARTERS = 8;
const PRODUCTIVITY_TREND = 0.004;      // realny wzrost wydajności na kwartał (zatrudnienie rośnie wolniej niż przychody)
const CEO_POACH_COST = 0.01;           // 1% kapitalizacji spółki, z której odchodzi prezes
const CEO_POACH_COOLDOWN = 4;          // limit gracza: 1 na rok
const UNION_BUST_DETECTION = 0.3;

const EXPLOIT_CEO_TRAITS = ['chciwy', 'skorumpowany', 'czlonek_mafii'];
const SAVING_CEO_TRAITS = ['tyran', 'skapiec'];
const SOCIAL_CEO_TRAITS = ['lojalny_pracownikom', 'czlowiek_z_ludu', 'szczodry'];

function getWorkforceQuarter() {
    return typeof society === 'object' && society ? society.quarter : (typeof macro === 'object' ? macro.quarter : 0);
}

function getWorkforceTemplate(stock) {
    const sectors = Array.isArray(stock?.sector) && stock.sector.length ? stock.sector : [];
    const templates = sectors.map(sector => {
        if (WORKFORCE_TEMPLATES[sector]) return WORKFORCE_TEMPLATES[sector];
        const alias = WORKFORCE_TEMPLATE_ALIASES[sector];
        if (alias) return { ...WORKFORCE_TEMPLATES[alias[0]], labor: alias[1] ?? WORKFORCE_TEMPLATES[alias[0]].labor };
        return WORKFORCE_DEFAULT_TEMPLATE;
    });
    if (!templates.length) templates.push(WORKFORCE_DEFAULT_TEMPLATE);
    const result = {};
    for (const key of ['board', 'specialists', 'workers', 'cheap', 'grey', 'labor']) {
        result[key] = templates.reduce((sum, t) => sum + t[key], 0) / templates.length;
    }
    return result;
}

function hasWorkforce(stock) {
    return typeof hasRevenueModel === 'function' && hasRevenueModel(stock) && !stock.isBankrupt;
}

/** Polityka kadrowa według cech prezesa i kondycji (bez udziału właściciela). */
function getCeoLaborPolicy(stock) {
    const traits = (stock.ceo?.traits || []).map(t => t.id);
    if (traits.some(id => SOCIAL_CEO_TRAITS.includes(id))) return 'social';
    if (traits.some(id => EXPLOIT_CEO_TRAITS.includes(id))) return 'exploit';
    if (traits.some(id => SAVING_CEO_TRAITS.includes(id)) || (Number(stock.financialHealth) || 0) < -1.5) return 'saving';
    return 'standard';
}

/** Tworzy zatrudnienie spółki (nowa gra, nowe spółki i migracja starych zapisów). */
function ensureWorkforce(stock) {
    if (!hasWorkforce(stock)) return null;
    if (stock.workforce && stock.workforce.version === 1) return stock.workforce;
    const template = getWorkforceTemplate(stock);
    const range = WORKFORCE_EMPLOYEES_BY_EXCHANGE[stock.exchange] || WORKFORCE_EMPLOYEES_BY_EXCHANGE.BRONZE;
    const employees = Math.round(Math.exp(getRandomInRange(Math.log(range[0]), Math.log(range[1]))));
    const policy = getCeoLaborPolicy(stock);
    const base = { board: template.board / 100, specialists: template.specialists / 100, workers: template.workers / 100, cheap: template.cheap / 100, grey: template.grey / 100 };
    stock.workforce = {
        version: 1,
        base,
        laborShare: template.labor,
        employees,
        employeesStart: employees,
        revenueStart: Math.max(1, Number(stock.fundamentals?.revenue) || 1),
        priceLevelStart: typeof society === 'object' && society ? society.priceLevel : 1,
        sinceQuarter: getWorkforceQuarter(),
        policy,
        policySetBy: 'ceo',
        policyLockUntil: -1,
        payMult: LABOR_POLICIES[policy].pay,
        productivity: 1,
        productivityBonus: 0,
        satisfaction: 0,
        satisfactionHistory: [],
        wagePremium: 0,
        rotation: 0,
        greySavings: [],
        greyCaughtQuarter: null,
        greyCleanUntil: -1,
        layoffs: false,
        union: null,
        strike: null,
        lastLaborIndex: 1
    };
    const wf = stock.workforce;
    if (stock.isStateOwned && Math.random() < 0.3) wf.union = createUnion('company');
    wf.satisfaction = getSatisfactionTarget(stock); // start: zadowolenie równe celowi polityki
    return wf;
}

function createUnion(type) {
    return { type, since: getWorkforceQuarter(), nextDemand: getWorkforceQuarter() + getRandomIntInRange(1, UNION_DEMAND_EVERY), agreementUntil: -1, pendingDemand: null };
}

/** Struktura zatrudnienia z szarą strefą (Wyzysk +10 pp, płaca minimalna +2 pp w spółkach Oszczędnych/Wyzysk). */
function getWorkforceStructure(stock) {
    const wf = stock.workforce;
    if (!wf) return null;
    const structure = { ...wf.base };
    const policy = LABOR_POLICIES[wf.policy] || LABOR_POLICIES.standard;
    let extraGrey = 0;
    if (wf.greyCleanUntil < getWorkforceQuarter()) {
        extraGrey += policy.grey;
        if ((wf.policy === 'exploit' || wf.policy === 'saving') && typeof society === 'object' && society) extraGrey += 0.02 * (Number(society.laws?.minWage) || 0);
    }
    const fromCheap = Math.min(structure.cheap, extraGrey);
    structure.cheap -= fromCheap;
    const fromWorkers = Math.min(structure.workers, extraGrey - fromCheap);
    structure.workers -= fromWorkers;
    structure.grey += fromCheap + fromWorkers;
    return structure;
}

function getMarketWage(group) {
    return typeof society === 'object' && society ? (Number(society.wages?.[group]) || 1) : 1;
}

/** Koszt grup względem struktury bazowej przy płacach 1,0 (kalibracja: neutralnie = 1). */
function getWorkforceCostRatio(stock, structure = getWorkforceStructure(stock)) {
    const wf = stock.workforce;
    if (!wf || !structure) return 1;
    const premium = 1 + (Number(wf.wagePremium) || 0);
    let cost = 0, base = 0;
    for (const group of WORKFORCE_GROUPS) {
        const greyFactor = group.id === 'grey' ? GREY_WAGE_FACTOR : 1;
        const wage = group.id === 'grey' ? getMarketWage('cheap') : getMarketWage(group.id);
        cost += (structure[group.id] || 0) * wage * greyFactor * (group.id === 'grey' ? 1 : premium);
        base += (wf.base[group.id] || 0) * greyFactor;
    }
    return base > 0 ? cost / base : 1;
}

/** Indeks kosztu pracy spółki: płace × polityka / wydajność + związek + rekrutacja. Bez losowości. */
function getLaborCostIndex(stock) {
    const wf = stock?.workforce;
    if (!wf) return 1;
    const productivity = Math.max(0.5, (Number(wf.productivity) || 1) + (Number(wf.productivityBonus) || 0));
    let index = getWorkforceCostRatio(stock) * (Number(wf.payMult) || 1) / productivity;
    if (wf.union || getSectorUnion(stock)) index += UNION_COST;
    index += (Number(wf.rotation) || 0) * 0.3;
    return clampValue(index, 0.5, 2);
}

function getLaborShare(stock) {
    return Number(stock?.workforce?.laborShare) || 0;
}

/** Odchylenie marży od 0.12: udział × (1 − indeks). */
function getLaborMarginAdj(stock) {
    const wf = stock?.workforce;
    if (!wf) return 0;
    return getLaborShare(stock) * (1 - getLaborCostIndex(stock));
}

/** Mnożnik przychodów kwartału ze strajku (spółki i sektora). */
function getStrikeRevenueFactor(stock) {
    const strike = stock?.workforce?.strike;
    return strike ? Math.max(0.5, 1 - (Number(strike.pct) || 0)) : 1;
}

function getSectorUnion(stock) {
    if (typeof society !== 'object' || !society?.sectorUnions) return null;
    const sector = stock?.sector?.[0];
    return sector ? society.sectorUnions[sector] || null : null;
}

function getUnionStatus(stock) {
    if (getSectorUnion(stock)) return 'sector';
    return stock?.workforce?.union ? 'company' : 'none';
}

function getRightsLevel() {
    return typeof society === 'object' && society ? clampValue(Number(society.laws?.rights) || 0, 0, 2) : 1;
}

/** Cel zadowolenia: polityka, płace vs rynek, prawa, kondycja, układ zbiorowy, zwolnienia, związek, zasiłki. */
function getSatisfactionTarget(stock) {
    const wf = stock.workforce;
    const policy = LABOR_POLICIES[wf.policy] || LABOR_POLICIES.standard;
    const health = clampValue(Number(stock.financialHealth) || 0, -5, 5);
    const benefits = typeof society === 'object' && society ? ((Number(society.laws?.benefits) || 0) - SOCIAL_LAWS.benefits.start) * 2 : 0;
    let target = policy.target
        + clampValue((Number(wf.wagePremium) || 0) / 0.05, -1, 1) * 10
        + RIGHTS_SATISFACTION[getRightsLevel()]
        + health
        + benefits;
    const union = wf.union || getSectorUnion(stock);
    if (union) target += 5;
    if (union && union.agreementUntil >= getWorkforceQuarter()) target += 10;
    if (wf.layoffs) target -= 10;
    return clampValue(target, 0, 100);
}

function getWorkforceGroupCounts(stock) {
    const structure = getWorkforceStructure(stock);
    const employees = Number(stock.workforce?.employees) || 0;
    return Object.fromEntries(WORKFORCE_GROUPS.map(g => [g.id, Math.round(employees * (structure?.[g.id] || 0))]));
}

function isLaborPolicyLocked(stock) {
    return (stock.workforce?.policyLockUntil ?? -1) > getWorkforceQuarter();
}

/** Zmiana polityki: blokada 4 kw., marża stopniowo (2 kw.), zadowolenie od razu −15 / +5. */
function applyLaborPolicy(stock, policy, setBy = 'ceo') {
    const wf = stock.workforce;
    if (!wf || !LABOR_POLICIES[policy] || wf.policy === policy) return false;
    const lower = LABOR_POLICY_ORDER.indexOf(policy) < LABOR_POLICY_ORDER.indexOf(wf.policy);
    wf.satisfaction = clampValue(wf.satisfaction + (lower ? -15 : 5), 0, 100);
    wf.payStep = (LABOR_POLICIES[policy].pay - wf.payMult) / 2; // marża dochodzi do nowej polityki w 2 kwartały
    wf.policy = policy;
    wf.policySetBy = setBy;
    wf.policyLockUntil = getWorkforceQuarter() + LABOR_POLICY_LOCK_QUARTERS;
    return true;
}

/** Gracz-większościowiec zmienia politykę kadrową (opcjonalnie — domyślnie decyduje prezes). */
function setLaborPolicy(symbol, policy) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !ensureWorkforce(stock)) return false;
    if (typeof canFundControlAgm !== 'function' || !canFundControlAgm(stock)) { showToast('Politykę kadrową zmienia tylko większościowy akcjonariusz (> 50%).', 'warning'); return false; }
    if (isLaborPolicyLocked(stock)) { showToast(`Polityka zablokowana jeszcze ${stock.workforce.policyLockUntil - getWorkforceQuarter()} kw.`, 'warning'); return false; }
    if (!applyLaborPolicy(stock, policy, 'owner')) return false;
    logSociety(`👥 ${stock.name}: nowa polityka kadrowa „${LABOR_POLICIES[policy].name}” (decyzja funduszu).`, 'company');
    if (policy === 'exploit' && typeof unlockAcademyEntry === 'function') unlockAcademyEntry('szaraStrefa');
    return true;
}

// ---------------------------------------------------------------------------------
// CO KWARTAŁ (przed raportami): polityka, zatrudnienie, zadowolenie, rotacja, szara strefa
// ---------------------------------------------------------------------------------

function updateWorkforcePolicy(stock) {
    const wf = stock.workforce;
    const playerControls = typeof canFundControlAgm === 'function' && canFundControlAgm(stock);
    if (wf.policySetBy === 'owner' && playerControls) { /* polityka właściciela zostaje */ }
    else if (!isLaborPolicyLocked(stock)) {
        let wanted = getCeoLaborPolicy(stock);
        const bot = typeof getMajorityBot === 'function' ? getMajorityBot(stock) : null;
        if (bot && Math.random() < 0.1) wanted = ['dividend_chaser', 'banker', 'whale'].includes(bot.personality) ? 'saving' : 'standard';
        if (wanted !== wf.policy) applyLaborPolicy(stock, wanted, bot ? 'bot' : 'ceo');
    }
    // Marża dochodzi do nowej polityki w 2 kwartały (połowa różnicy na kwartał).
    const targetPay = (LABOR_POLICIES[wf.policy] || LABOR_POLICIES.standard).pay;
    const step = Number(wf.payStep) || (targetPay - wf.payMult) / 2;
    wf.payMult += step;
    if ((step >= 0 && wf.payMult >= targetPay - 1e-9) || (step < 0 && wf.payMult <= targetPay + 1e-9)) { wf.payMult = targetPay; wf.payStep = 0; }
}

function updateWorkforceEmployees(stock) {
    const wf = stock.workforce;
    const revenue = Number(stock.fundamentals?.revenue) || wf.revenueStart;
    const priceLevel = typeof society === 'object' && society ? society.priceLevel : 1;
    const quarters = Math.max(0, getWorkforceQuarter() - wf.sinceQuarter);
    const real = revenue / wf.revenueStart / Math.max(0.5, priceLevel / (wf.priceLevelStart || 1));
    const productivity = Math.pow(1 + PRODUCTIVITY_TREND, quarters) * Math.max(0.5, wf.productivity);
    const next = Math.max(5, Math.round(wf.employeesStart * real / productivity));
    // Zwolnienia: spadek przychodów o ponad 10% r/r albo kondycja < −2.
    const history = (stock.fundamentals?.history || []).filter(q => !q.synthetic);
    const yearAgo = history.length >= 5 ? history[history.length - 5].revenue : null;
    const revenueDrop = yearAgo > 0 && history[history.length - 1].revenue < yearAgo * 0.9;
    wf.layoffs = (revenueDrop || (Number(stock.financialHealth) || 0) < -2) && next < wf.employees;
    if (wf.layoffs) wf.satisfaction = clampValue(wf.satisfaction - 10, 0, 100);
    wf.employees = next;
}

function updateWorkforceSatisfaction(stock) {
    const wf = stock.workforce;
    const target = getSatisfactionTarget(stock);
    wf.satisfaction = clampValue(wf.satisfaction + (target - wf.satisfaction) * 0.25, 0, 100);
    wf.satisfactionHistory.push(Math.round(wf.satisfaction));
    if (wf.satisfactionHistory.length > 8) wf.satisfactionHistory.shift();

    // Rotacja przy niskim zadowoleniu (wydajność −1…3%, koszt rekrutacji w indeksie kosztu pracy).
    const policy = LABOR_POLICIES[wf.policy] || LABOR_POLICIES.standard;
    wf.rotation = 0;
    if (wf.satisfaction < 35) {
        wf.rotation = getRandomInRange(0.03, 0.08) * (policy.rotation || 1) * (wf.union || getSectorUnion(stock) ? 0.7 : 1);
    }
    const targetProductivity = 1 + policy.productivity + (wf.satisfaction > 70 ? 0.02 : 0) - wf.rotation * 0.35;
    wf.productivity += (targetProductivity - wf.productivity) * 0.5;
    if (Math.abs(targetProductivity - wf.productivity) < 0.0005) wf.productivity = targetProductivity;
    wf.productivityBonus = Math.abs(wf.productivityBonus) < 0.0005 ? 0 : wf.productivityBonus * 0.75;
    // Przewaga płacowa z podwyżek związkowych powoli wygasa (rynek dogania).
    wf.wagePremium = Math.abs(wf.wagePremium) < 0.0005 ? 0 : wf.wagePremium * 0.95;
}

/** Oszczędność na szarej strefie w kwartale (płace ×0,6, bez podatków). */
function recordGreySavings(stock) {
    const wf = stock.workforce;
    const structure = getWorkforceStructure(stock);
    const baseCost = WORKFORCE_GROUPS.reduce((sum, g) => sum + (wf.base[g.id] || 0) * (g.id === 'grey' ? GREY_WAGE_FACTOR : 1), 0) || 1;
    const revenue = Number(stock.fundamentals?.revenue) || 0;
    const saving = revenue * wf.laborShare * (structure.grey || 0) * getMarketWage('cheap') * (1 - GREY_WAGE_FACTOR) / baseCost;
    wf.greyExtraSaving = structure.grey > 0 ? saving * Math.max(0, structure.grey - (wf.base.grey || 0)) / structure.grey : 0; // ponad strukturę sektora (budżet państwa)
    wf.greySavings.push(saving);
    if (wf.greySavings.length > 4) wf.greySavings.shift();
    return saving;
}

/** Kontrola Inspekcji Pracy: szansa = udział szarej strefy × 20% × mnożnik polityki. Kara 3× oszczędność z 4 kw. */
function runLaborInspection(stock, force = false) {
    const wf = stock.workforce;
    const structure = getWorkforceStructure(stock);
    const policy = LABOR_POLICIES[wf.policy] || LABOR_POLICIES.standard;
    let chance = (structure.grey || 0) * 0.2 * policy.inspection;
    if (wf.policy === 'exploit' && getRightsLevel() === 2) chance *= 2;
    if (!force && !(Math.random() < chance)) return null;
    const fine = Math.round(3 * wf.greySavings.reduce((a, b) => a + b, 0));
    const paid = Math.max(0, Math.min(fine, Number(stock.cash) || 0));
    if (paid > 0) {
        adjustCompanyCash(stock, -paid);
        adjustBalanceSheet(stock, { assets: -paid, retainedEarnings: -paid });
        governmentTreasury += paid;
        recordPayment(stock, 'external:skarb-panstwa', paid, 'Kara Inspekcji Pracy');
    }
    applyPriceEffect(stock.symbol, -0.04, 'negative', 'company');
    wf.greyCaughtQuarter = getWorkforceQuarter();
    wf.greyCleanUntil = getWorkforceQuarter() + 4;
    wf.greySavings = [];
    logSociety(`🦺 Inspekcja Pracy w ${stock.name}: pracownicy bez umów, kara ${formatZl(paid, 0)}. Kurs spada.`, 'company');
    if (typeof canFundControlAgm === 'function' && canFundControlAgm(stock) && playerProfile) {
        playerProfile.cv.push({ type: 'compliance', text: `Inspekcja Pracy: szara strefa w ${stock.name} (spółka kontrolowana przez fundusz), kara ${formatZl(paid, 0)}.` });
    }
    if (typeof unlockAcademyEntry === 'function' && (playerPortfolio?.[stock.symbol]?.shares || 0) > 0) unlockAcademyEntry('szaraStrefa', `${stock.name}: kara za szarą strefę`);
    return { fine, paid };
}

// ---------------------------------------------------------------------------------
// S3: odejścia między firmami i podkupowanie
// ---------------------------------------------------------------------------------

function getWorkforceCompanies() {
    return stocks.filter(s => hasWorkforce(s) && s.workforce);
}

function processWorkforceMoves(companies) {
    const bySector = {};
    for (const stock of companies) (bySector[stock.sector?.[0] || '—'] = bySector[stock.sector?.[0] || '—'] || []).push(stock);
    for (const list of Object.values(bySector)) {
        if (list.length < 2) continue;
        // Odejścia: z firm z zadowoleniem < 35 do firm z zadowoleniem > 60 (wydajność −1% / +0,5%).
        const happy = list.filter(s => s.workforce.satisfaction > 60);
        for (const source of list.filter(s => s.workforce.satisfaction < 35)) {
            if (!happy.length) break;
            const target = getRandomElement(happy);
            source.workforce.productivityBonus -= 0.01;
            target.workforce.productivityBonus += 0.005;
        }
        // Podkupowanie specjalistów: spółka z gotówką i zadowoleniem > 70 od najsłabszej z sektora.
        const weakest = [...list].sort((a, b) => a.workforce.satisfaction - b.workforce.satisfaction)[0];
        for (const buyer of list.filter(s => s !== weakest && s.workforce.satisfaction > 70)) {
            const cost = Math.round((Number(buyer.fundamentals?.revenue) || 0) * buyer.workforce.laborShare * 0.02);
            if (!(cost > 0) || (Number(buyer.cash) || 0) < cost * 5) continue;
            adjustCompanyCash(buyer, -cost);
            adjustBalanceSheet(buyer, { assets: -cost, retainedEarnings: -cost });
            recordPayment(buyer, 'external:pracownicy', cost, 'Podkupienie specjalistów');
            buyer.workforce.productivityBonus += 0.01;
            weakest.workforce.productivityBonus -= 0.01;
            weakest.workforce.satisfaction = clampValue(weakest.workforce.satisfaction - 2, 0, 100);
        }
    }
}

/** Podkupienie prezesa: koszt 1% kapitalizacji źródła z gotówki kupującej spółki; szansa 60% − zadowolenie/2. */
function poachCeo(buyer, source, byPlayer = false) {
    if (!buyer || !source || buyer === source || !source.ceo || !ensureWorkforce(buyer) || !ensureWorkforce(source)) return { ok: false, reason: 'Brak spółki lub prezesa.' };
    const cost = Math.round(getMarketCapValue(source) * CEO_POACH_COST);
    if ((Number(buyer.cash) || 0) < cost) return { ok: false, reason: `Spółka potrzebuje ${formatZl(cost, 0)} gotówki.` };
    adjustCompanyCash(buyer, -cost);
    adjustBalanceSheet(buyer, { assets: -cost, retainedEarnings: -cost });
    recordPayment(buyer, 'external:headhunterzy', cost, `Podkupienie prezesa ${source.ceo.name}`);
    const chance = clampValue(0.6 - source.workforce.satisfaction / 200, 0.05, 0.6);
    if (!(Math.random() < chance)) {
        logSociety(`👔 Prezes ${source.ceo.name} odrzuca ofertę ${buyer.name} i zostaje w ${source.name}.`, 'company');
        return { ok: true, success: false, cost, chance };
    }
    const ceo = source.ceo;
    replaceCeo(buyer, { ...ceo, traits: [...(ceo.traits || [])] });
    replaceCeo(source);
    applyPriceEffect(source.symbol, -0.03, 'negative', 'company');
    logSociety(`👔 ${buyer.name} podkupuje prezesa ${ceo.name} z ${source.name}${byPlayer ? ' (decyzja funduszu)' : ''}. ${source.name} dostaje nowego prezesa.`, 'company');
    return { ok: true, success: true, cost, chance };
}

/** Akcja gracza-większościowca: „Podkup prezesa” (limit 1 na rok). */
function playerPoachCeo(buyerSymbol, sourceSymbol) {
    const buyer = stocks.find(s => s.symbol === buyerSymbol);
    const source = stocks.find(s => s.symbol === sourceSymbol);
    if (!buyer || typeof canFundControlAgm !== 'function' || !canFundControlAgm(buyer)) { showToast('Prezesa podkupuje tylko spółka, w której fundusz ma > 50%.', 'warning'); return null; }
    const last = playerProfile?.ceoPoachQuarter;
    if (Number.isFinite(last) && getWorkforceQuarter() - last < CEO_POACH_COOLDOWN) { showToast(`Limit: jedno podkupienie prezesa na rok (kolejne za ${CEO_POACH_COOLDOWN - (getWorkforceQuarter() - last)} kw.).`, 'warning'); return null; }
    const result = poachCeo(buyer, source, true);
    if (!result.ok) { showToast(result.reason, 'error'); return null; }
    if (playerProfile) playerProfile.ceoPoachQuarter = getWorkforceQuarter();
    showToast(result.success ? `Udało się! ${buyer.name} ma nowego prezesa.` : `Prezes odmówił (szansa była ${(result.chance * 100).toFixed(0)}%).`, result.success ? 'success' : 'warning', 6000);
    return result;
}

function processBotCeoPoaching(companies) {
    for (const buyer of companies) {
        const bot = typeof getMajorityBot === 'function' ? getMajorityBot(buyer) : null;
        if (!bot || !['reckless', 'whale'].includes(bot.personality) || !(Math.random() < 0.025)) continue;
        const candidates = companies.filter(s => s !== buyer && s.sector?.[0] === buyer.sector?.[0] && s.ceo && !(typeof canFundControlAgm === 'function' && canFundControlAgm(s)));
        const best = candidates.sort((a, b) => (b.ceo.traits?.length || 0) - (a.ceo.traits?.length || 0))[0];
        if (best) poachCeo(buyer, best);
    }
}

// ---------------------------------------------------------------------------------
// S4: związki zawodowe, żądania, strajki
// ---------------------------------------------------------------------------------

function getUnionChance(stock) {
    const wf = stock.workforce;
    const policy = LABOR_POLICIES[wf.policy] || LABOR_POLICIES.standard;
    return UNION_BASE_CHANCE * Math.max(0.2, (50 - wf.satisfaction) / 10) * policy.union * RIGHTS_UNION_MULT[getRightsLevel()] * (wf.employees >= 200 ? 1 : 0.3);
}

function processUnionFormation(companies) {
    if (!society.sectorUnions) society.sectorUnions = {};
    for (const stock of companies) {
        if (stock.workforce.union || !(Math.random() < getUnionChance(stock))) continue;
        stock.workforce.union = createUnion('company');
        logSociety(`✊ W ${stock.name} powstaje związek zawodowy (zadowolenie ${stock.workforce.satisfaction.toFixed(0)}/100).`, 'company');
        if (typeof unlockAcademyEntry === 'function' && (playerPortfolio?.[stock.symbol]?.shares || 0) > 0) unlockAcademyEntry('zwiazek');
    }
    const bySector = {};
    for (const stock of companies) (bySector[stock.sector?.[0]] = bySector[stock.sector?.[0]] || []).push(stock);
    for (const [sector, list] of Object.entries(bySector)) {
        if (!sector || sector === 'undefined' || society.sectorUnions[sector] || list.length < 2) continue;
        const unions = list.filter(s => s.workforce.union).length;
        const avg = list.reduce((sum, s) => sum + s.workforce.satisfaction, 0) / list.length;
        if ((unions >= 3 || avg < 40) && Math.random() < 0.15) {
            society.sectorUnions[sector] = createUnion('sector');
            logSociety(`✊ Powstaje związek sektorowy w branży ${sector}: żądania i strajki obejmą wszystkie spółki sektora.`, 'state');
        }
    }
}

/** Wielkość żądania płacowego: 3–8% (więcej przy wysokiej inflacji i niskim bezrobociu). */
function getUnionDemandSize() {
    const inflation = Number(macro?.inflation) || INFLATION_TARGET;
    const unemployment = Number(macro?.unemployment) || NATURAL_UNEMPLOYMENT;
    return clampValue(0.03 + (inflation - INFLATION_TARGET) * 0.5 + (NATURAL_UNEMPLOYMENT - unemployment) * 0.5 + getRandomInRange(0, 0.02), 0.03, 0.08);
}

/** Odpowiedź prezesa według cech, polityki i kondycji. */
function getCeoUnionResponse(stock) {
    const wf = stock.workforce;
    const traits = (stock.ceo?.traits || []).map(t => t.id);
    const health = Number(stock.financialHealth) || 0;
    if (wf.policy === 'social' || traits.some(id => SOCIAL_CEO_TRAITS.includes(id))) return 'agree';
    if (wf.strike && wf.strike.quarters >= 2) return Math.random() < 0.6 ? 'agree' : 'negotiate'; // długi strajk: zarząd ustępuje
    if (wf.policy === 'exploit' || traits.some(id => EXPLOIT_CEO_TRAITS.includes(id))) return Math.random() < 0.7 ? 'refuse' : 'negotiate';
    const roll = Math.random();
    if (health > 1) return roll < 0.4 ? 'agree' : roll < 0.9 ? 'negotiate' : 'refuse';
    if (health < -1) return roll < 0.5 ? 'refuse' : 'negotiate';
    return roll < 0.25 ? 'agree' : roll < 0.8 ? 'negotiate' : 'refuse';
}

function startStrike(stock, strength = 1, raise = 0) {
    const wf = stock.workforce;
    const pct = getRandomInRange(0.05, 0.15) * strength;
    const fresh = !wf.strike;
    wf.strike = { pct, quarters: (wf.strike?.quarters || 0) + 1, sector: Boolean(wf.strike?.sector), raise: raise || wf.strike?.raise || getUnionDemandSize(), decidedQuarter: getWorkforceQuarter() };
    wf.satisfaction = clampValue(wf.satisfaction - 10, 0, 100);
    applyPriceEffect(stock.symbol, -getRandomInRange(0.03, 0.08) * strength, 'negative', 'company');
    // Kontrahenci budowlanki naliczają kary.
    if (stock.sector?.includes('Budowlany') && typeof getActiveProjectsForBuilder === 'function' && getActiveProjectsForBuilder(stock).length) {
        const penalty = Math.round(Math.min(Math.max(0, Number(stock.cash) || 0), (Number(stock.fundamentals?.revenue) || 0) * 0.01));
        if (penalty > 0) {
            adjustCompanyCash(stock, -penalty);
            adjustBalanceSheet(stock, { assets: -penalty, retainedEarnings: -penalty });
            recordPayment(stock, 'external:kontrahenci', penalty, 'Kary umowne za opóźnienia (strajk)');
        }
    }
    if (fresh && typeof society === 'object' && society) {
        if (!society.stats) society.stats = { strikes: 0 };
        society.stats.strikes = (society.stats.strikes || 0) + 1;
    }
    if (typeof noteStrikeForGoals === 'function') noteStrikeForGoals(stock);
    if (typeof unlockAcademyEntry === 'function' && (playerPortfolio?.[stock.symbol]?.shares || 0) > 0) unlockAcademyEntry('strajk', `${stock.name}: strajk`);
    return wf.strike;
}

/** Rozstrzyga żądanie lub trwający strajk w spółce: agree | negotiate | refuse. */
function resolveUnionDemand(stock, choice, raise, union) {
    const wf = stock.workforce;
    const ended = Boolean(wf.strike);
    const accept = (share, satisfaction) => {
        wf.wagePremium += raise * share;
        wf.satisfaction = clampValue(wf.satisfaction + satisfaction, 0, 100);
        wf.strike = null;
        if (union && share >= 1 && Math.random() < 0.6) union.agreementUntil = getWorkforceQuarter() + COLLECTIVE_AGREEMENT_QUARTERS;
        return union?.agreementUntil >= getWorkforceQuarter() ? 'agreement' : 'accepted';
    };
    if (choice === 'agree') return accept(1, 10);
    if (choice === 'negotiate') {
        if (Math.random() < 0.5) return accept(0.5, 5);
        startStrike(stock, 0.5, raise);
        return 'strike';
    }
    const strikeChance = clampValue(0.4 + (50 - wf.satisfaction) / 100, 0.4, 0.7);
    if (ended || Math.random() < strikeChance) { startStrike(stock, 1, raise); return 'strike'; }
    wf.satisfaction = clampValue(wf.satisfaction - 5, 0, 100);
    return 'refused';
}

const UNION_OUTCOME_TEXT = { agreement: 'zgoda i układ zbiorowy (spokój na 2 lata)', accepted: 'porozumienie', strike: 'STRAJK', refused: 'odmowa bez strajku' };

function sendUnionDecisionMail(stock, demand, striking) {
    if (typeof addMail !== 'function') return;
    addMail({
        sender: CORPORATION_SENDER,
        subject: striking ? `✊ Strajk w ${stock.name} — decyzja funduszu` : `✊ Związek w ${stock.name} żąda podwyżki ${(demand.raise * 100).toFixed(1)}%`,
        body: `${striking ? 'Strajk trwa i obniża przychody spółki.' : `Związek zawodowy żąda podwyżki płac o ${(demand.raise * 100).toFixed(1)}%.`} Jako większościowy akcjonariusz możesz zdecydować do końca kwartału: zgoda (płace w górę, zadowolenie +10, możliwy układ zbiorowy), negocjacje (połowa podwyżki, 50% szans na porozumienie) albo odmowa (ryzyko strajku). Bez Twojej odpowiedzi zdecyduje prezes według swoich cech — to nie jest kara.`,
        importance: 3, symbol: stock.symbol, action: { type: 'unionDemand', symbol: stock.symbol }
    });
}

/** Odpowiedź gracza na żądanie związku (mail lub zakładka Zatrudnienie). */
function respondUnionDemand(symbol, choice) {
    const stock = stocks.find(s => s.symbol === symbol);
    const pending = stock?.workforce?.pendingDemand;
    if (!pending || !['agree', 'negotiate', 'refuse'].includes(choice)) return false;
    pending.choice = choice;
    showToast(`Decyzja zapisana: ${{ agree: 'zgoda', negotiate: 'negocjacje', refuse: 'odmowa' }[choice]}. Zarząd wykona ją na koniec kwartału.`, 'success');
    return true;
}

function processUnionDemands(companies) {
    const quarter = getWorkforceQuarter();
    // 1. Decyzje zaległe (żądania z poprzedniego kwartału w spółkach gracza).
    for (const stock of companies) {
        const wf = stock.workforce;
        const pending = wf.pendingDemand;
        if (!pending) continue;
        if (pending.quarter >= quarter) continue;
        const choice = pending.choice || getCeoUnionResponse(stock);
        const union = wf.union || getSectorUnion(stock);
        const outcome = resolveUnionDemand(stock, choice, pending.raise, union);
        wf.pendingDemand = null;
        logSociety(`✊ ${stock.name}: ${pending.choice ? 'fundusz' : 'prezes'} wybiera ${{ agree: 'zgodę', negotiate: 'negocjacje', refuse: 'odmowę' }[choice]} — ${UNION_OUTCOME_TEXT[outcome]}.`, 'company');
    }
    // 2. Trwające strajki: kolejny kwartał znów wymaga decyzji.
    for (const stock of companies) {
        const wf = stock.workforce;
        if (!wf.strike || wf.pendingDemand || wf.strike.decidedQuarter === quarter) continue;
        const raise = wf.strike.raise || getUnionDemandSize();
        if (typeof canFundControlAgm === 'function' && canFundControlAgm(stock)) {
            wf.pendingDemand = { raise, quarter, choice: null, strike: true };
            sendUnionDecisionMail(stock, wf.pendingDemand, true);
            continue;
        }
        const outcome = resolveUnionDemand(stock, getCeoUnionResponse(stock), raise, wf.union || getSectorUnion(stock));
        if (outcome !== 'strike') logSociety(`✊ ${stock.name}: koniec strajku (${UNION_OUTCOME_TEXT[outcome]}).`, 'company');
    }
    // 3. Związki zakładowe: żądania co 4 kwartały (poza układem zbiorowym).
    for (const stock of companies) {
        const wf = stock.workforce;
        const union = wf.union;
        if (!union || getSectorUnion(stock) || wf.strike || wf.pendingDemand) continue;
        if (union.agreementUntil >= quarter || union.nextDemand > quarter) continue;
        union.nextDemand = quarter + UNION_DEMAND_EVERY;
        const raise = getUnionDemandSize();
        if (typeof canFundControlAgm === 'function' && canFundControlAgm(stock)) {
            wf.pendingDemand = { raise, quarter, choice: null };
            sendUnionDecisionMail(stock, wf.pendingDemand, false);
            continue;
        }
        const choice = getCeoUnionResponse(stock);
        const outcome = resolveUnionDemand(stock, choice, raise, union);
        logSociety(`✊ ${stock.name}: związek żąda +${(raise * 100).toFixed(1)}% — ${UNION_OUTCOME_TEXT[outcome]}.`, 'company');
    }
    // 4. Związki sektorowe: wspólne żądanie; gdy większość spółek odmawia — strajk całego sektora.
    for (const [sector, union] of Object.entries(society.sectorUnions || {})) {
        if (union.agreementUntil >= quarter || union.nextDemand > quarter) continue;
        const list = companies.filter(s => s.sector?.[0] === sector);
        if (!list.length) { delete society.sectorUnions[sector]; continue; }
        union.nextDemand = quarter + UNION_DEMAND_EVERY;
        const raise = getUnionDemandSize();
        const decided = list.filter(s => !(typeof canFundControlAgm === 'function' && canFundControlAgm(s)));
        for (const stock of list.filter(s => !decided.includes(s))) {
            if (stock.workforce.pendingDemand) continue;
            stock.workforce.pendingDemand = { raise, quarter, choice: null, sector };
            sendUnionDecisionMail(stock, stock.workforce.pendingDemand, false);
        }
        const choices = decided.map(stock => [stock, getCeoUnionResponse(stock)]);
        const refusing = choices.filter(([, c]) => c === 'refuse').length;
        const sectorStrike = choices.length && refusing / choices.length >= 0.5 && Math.random() < 0.6;
        for (const [stock, choice] of choices) {
            if (sectorStrike) { startStrike(stock, 1, raise); stock.workforce.strike.sector = true; }
            else resolveUnionDemand(stock, choice === 'refuse' ? 'negotiate' : choice, raise, union);
        }
        if (!sectorStrike && Math.random() < 0.5) union.agreementUntil = quarter + COLLECTIVE_AGREEMENT_QUARTERS;
        logSociety(sectorStrike
            ? `✊ STRAJK w całym sektorze ${sector}: związek sektorowy żądał +${(raise * 100).toFixed(1)}%, większość zarządów odmówiła.`
            : `✊ Związek sektorowy (${sector}) wywalczył podwyżki${union.agreementUntil >= quarter ? ' i układ zbiorowy' : ''}.`, 'state');
    }
}

/** Ciemna strefa: „rozbicie związku” u „przyjaciół”. 30% wykrycia → strajk generalny w sektorze i afera. */
function mafiaBustUnion(symbol) {
    if (typeof requireMafiaContact === 'function' && !requireMafiaContact()) return false;
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock?.workforce?.union) { showToast('W tej spółce nie ma związku zakładowego.', 'warning'); return false; }
    const cost = typeof getSabotageCost === 'function' ? getSabotageCost(stock) : 5000;
    if (playerCash < cost) { showToast(`Usługa kosztuje ${formatZl(cost, 0)} z funduszu.`, 'error'); return false; }
    playerCash -= cost;
    recordPayment('player-fund', 'external:szara-strefa', cost, 'Doradztwo kadrowe');
    stock.workforce.union = null;
    stock.workforce.pendingDemand = null;
    if (typeof mafiaTrace === 'function') mafiaTrace(30, 3, 15, cost);
    if (Math.random() < UNION_BUST_DETECTION) {
        const sector = stock.sector?.[0];
        for (const other of getWorkforceCompanies().filter(s => s.sector?.[0] === sector)) { startStrike(other, 1); other.workforce.strike.sector = true; }
        if (playerFund) playerFund.trust = Math.max(0, playerFund.trust - 10);
        if (playerProfile) playerProfile.cv.push({ type: 'compliance', text: `Afera: fundusz zlecił rozbicie związku w ${stock.name}.` });
        if (typeof getRecord === 'function') getRecord('player').suspicion += 20;
        logEvent(`📰 AFERA: wyszło na jaw, że fundusz ${playerProfile?.fundName || ''} zlecił „rozbicie” związku w ${stock.name}. Strajk generalny w sektorze ${sector}!`, 'review');
        return 'detected';
    }
    logSociety(`🕶️ Związek zawodowy w ${stock.name} „sam się rozwiązał”.`, 'company');
    return true;
}

// ---------------------------------------------------------------------------------
// GŁÓWNA PĘTLA KWARTAŁU (main.js, po makro, przed raportami)
// ---------------------------------------------------------------------------------

function processWorkforceQuarter() {
    if (typeof society !== 'object' || !society) return;
    ensureSocietyState();
    const companies = stocks.filter(hasWorkforce);
    companies.forEach(ensureWorkforce);
    for (const stock of companies) {
        updateWorkforcePolicy(stock);
        updateWorkforceEmployees(stock);
        updateWorkforceSatisfaction(stock);
        recordGreySavings(stock);
        runLaborInspection(stock);
    }
    processWorkforceMoves(companies);
    processBotCeoPoaching(companies);
    processUnionFormation(companies);
    processUnionDemands(companies);
    for (const stock of companies) stock.workforce.lastLaborIndex = getLaborCostIndex(stock);
    publishSocietyReport(companies);
}

/** S6: jeden zbiorczy mail na kwartał — „Raport z rynku pracy i kraju” (zamiast osobnych wiadomości). */
function publishSocietyReport(companies = getWorkforceCompanies()) {
    if (typeof addMail !== 'function' || !mailbox || typeof society !== 'object' || !society) return null;
    const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
    const striking = companies.filter(s => s.workforce.strike);
    const held = companies.filter(s => (playerPortfolio?.[s.symbol]?.shares || 0) > 0);
    const heldNotes = held.filter(s => s.workforce.strike || s.workforce.satisfaction < 40 || getGreyShare(s) > 0.05 || s.workforce.pendingDemand)
        .slice(0, 4).map(s => `${s.name}: ${s.workforce.strike ? 'strajk' : s.workforce.pendingDemand ? 'żądanie związku' : getGreyShare(s) > 0.05 ? 'szara strefa' : `zadowolenie ${s.workforce.satisfaction.toFixed(0)}`}`);
    const growth = Number(society.lastGrowth) || 0;
    const lines = [
        `Populacja ${formatPopulation(society.population)} (${growth >= 0 ? '+' : ''}${pct(growth, 2)} w kwartale, migracja ${(society.migration.lastPeople || 0) >= 0 ? '+' : ''}${Math.round(society.migration.lastPeople || 0).toLocaleString('pl-PL')}), bezrobocie ${pct(macro.unemployment)}, indeks popytu ${society.demandIndex.toFixed(3)}.`,
        `Płace realne: pracownicy ${society.wages.workers.toFixed(3)}, specjaliści ${society.wages.specialists.toFixed(3)} (niedobór ${society.shortage.toFixed(2)}), edukacja ${society.education.toFixed(0)}/100.`,
        `Strajki: ${striking.length ? striking.slice(0, 4).map(s => s.name).join(', ') : 'brak'}; związki zakładowe w ${companies.filter(s => s.workforce.union).length} spółkach${Object.keys(society.sectorUnions || {}).length ? `, sektorowe: ${Object.keys(society.sectorUnions).join(', ')}` : ''}.`,
        society.pendingLaw ? `Zapowiedź ustawy: ${SOCIAL_LAWS[society.pendingLaw.law].name} → ${describeLawLevel(society.pendingLaw.law, society.pendingLaw.to)}.` : '',
        society.budget.hasBalance !== undefined ? `Budżet: saldo ${formatZl(society.budget.balance || 0, 0)}${society.budget.deficitQuarters ? ` (deficyt od ${society.budget.deficitQuarters} kw.)` : ''}.` : '',
        heldNotes.length ? `Twoje spółki: ${heldNotes.join('; ')}.` : '',
        ...society.report.slice(-5).map(item => `• ${item}`)
    ].filter(Boolean);
    society.lastReportQuarter = society.quarter;
    return addMail({ sender: 'OBSER', subject: `👥 Raport z rynku pracy i kraju — kwartał ${society.quarter}`, body: lines.join('  '), importance: 2 });
}

/** Średnie zadowolenie ważone zatrudnieniem (atrakcyjność kraju, KPI). */
function getAverageSatisfaction(list = getWorkforceCompanies()) {
    let sum = 0, weight = 0;
    for (const stock of list) {
        if (!stock.workforce) continue;
        sum += stock.workforce.satisfaction * stock.workforce.employees;
        weight += stock.workforce.employees;
    }
    return weight > 0 ? sum / weight : 60;
}

/** Ryzyko strajku dla skanera: niskie / średnie / wysokie. */
function getStrikeRisk(stock) {
    const wf = stock?.workforce;
    if (!wf) return null;
    if (wf.strike) return 'trwa';
    const union = wf.union || getSectorUnion(stock);
    if (!union) return wf.satisfaction < 35 ? 'średnie' : 'niskie';
    if (union.agreementUntil >= getWorkforceQuarter()) return 'niskie';
    return wf.satisfaction < 45 || wf.policy === 'exploit' ? 'wysokie' : 'średnie';
}

function getGreyShare(stock) {
    const structure = stock?.workforce ? getWorkforceStructure(stock) : null;
    return structure ? structure.grey || 0 : 0;
}

/** Księgowy poz. 1: koszt pracy jako osobny słupek (struktura przychodów ostatniego kwartału). */
function renderLaborCostBar(stock, history) {
    const last = [...history].reverse().find(q => Number.isFinite(q.labor) && q.revenue > 0);
    if (!last) return '';
    const labor = Math.max(0, last.labor / last.revenue), ebitda = Math.max(0, last.ebitda / last.revenue);
    const other = Math.max(0, 1 - labor - ebitda);
    const seg = (value, cls) => `<span class="${cls}" style="width:${Math.min(100, value * 100).toFixed(1)}%"></span>`;
    return `<div class="labor-bar" role="img" aria-label="Struktura przychodów">${seg(labor, 'labor')}${seg(other, 'other')}${seg(ebitda, 'ebitda')}</div>
        <p class="text-xs">🟨 koszt pracy ${(labor * 100).toFixed(1)}% · ⬜ pozostałe koszty ${(other * 100).toFixed(1)}% · 🟩 EBITDA ${(ebitda * 100).toFixed(1)}% przychodów (ostatni kwartał)</p>`;
}
