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

    // Budowlany
    'BUILDING_PREFAB_1': { name: "Budownictwo Prefabrykowane", icon: '🏗️', description: "Szybka i tania metoda budowy z gotowych modułów przyspiesza realizację projektów.", type: "wzmacnianie rozwoju", cost: 300, initialCashCost: 3000, sector: 'Budowlany', applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'BUILDING_GREEN_MATERIALS_1': { name: "Ekologiczne Materiały", icon: '🌿', description: "Wykorzystanie materiałów przyjaznych środowisku poprawia wizerunek i otwiera nowe rynki.", type: "wzmacnianie pozycji na rynku", cost: 250, initialCashCost: 2500, sector: 'Budowlany', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.05, 'positive'); } },
    'BUILDING_SMART_CONSTRUCTION_1': { name: "Inteligentne Budownictwo", icon: '🤖', description: "Automatyzacja procesów budowlanych zwiększa wydajność i bezpieczeństwo.", type: "wzmacnianie ceny i zysków", cost: 500, initialCashCost: 5000, sector: 'Budowlany', applyEffect: (stock) => { stock.financialHealth += 1.5; stock.volatilityFactor *= 0.95; } },
    'BUILDING_UNDERGROUND_1': { name: "Technologie Podziemne", icon: '⛏️', description: "Specjalizacja w budowie tuneli i infrastruktury podziemnej otwiera nowe kontrakty.", type: "wzmacnianie rozwoju", cost: 400, initialCashCost: 4000, sector: 'Budowlany', applyEffect: (stock) => { stock.financialHealth += 1.2; } },
    'BUILDING_HIGH_RISE_1': { name: "Wieżowce",minResearchLevel: 2, icon: '🏙️', description: "Technologie budowy drapaczy chmur przyciągają prestiżowe zamówienia.", type: "wzmacnianie pozycji na rynku", cost: 800, initialCashCost: 8000, sector: 'Budowlany', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.15, 'positive'); } },
    'BUILDING_SEISMIC_1': { name: "Budownictwo Sejsmiczne", icon: '🌋', description: "Specjalizacja w budynkach odpornych na trzęsienia ziemi dla regionów zagrożonych.", type: "wzmacnianie rozwoju", cost: 350, initialCashCost: 3500, sector: 'Budowlany', applyEffect: (stock) => { stock.financialHealth += 0.8; } },
    'BUILDING_RENOVATION_1': { name: "Renowacja Zabytków", icon: '🏛️', description: "Ekspertyza w odnawianiu historycznych budynków przyciąga państwowe zamówienia.", type: "wzmacnianie ceny i zysków", cost: 450, initialCashCost: 4500, sector: 'Budowlany', applyEffect: (stock) => { stock.financialHealth += 1.0; } },
    'BUILDING_ECO_BUILDINGS_1': { name: "Zielone Budynki",minResearchLevel: 2, icon: '🌱', description: "Specjalizacja w budynkach energooszczędnych i samowystarczalnych.", type: "wzmacnianie pozycji na rynku", cost: 600, initialCashCost: 6000, sector: 'Budowlany', applyEffect: (stock) => { applyPriceEffect(stock.symbol, 0.10, 'positive'); stock.financialHealth += 0.5; } },
    'BUILDING_MEGA_PROJECTS_1': { name: "Megaprojekty", icon: '🚀', description: "Umiejętność zarządzania ogromnymi projektami infrastrukturalnymi.", type: "wzmacnianie rozwoju", cost: 1000, initialCashCost: 10000, sector: 'Budowlany', applyEffect: (stock) => { stock.financialHealth += 2.0; } },
};

// --- 2. LOGIKA GENERATORÓW (BEZ ZMIAN) ---
// ... (cała reszta pliku, czyli wszystkie funkcje, pozostaje bez zmian) ...

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