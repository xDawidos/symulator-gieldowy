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
'Budownictwo': {
    activity: [
        "Spółka realizuje wielkie kontrakty infrastrukturalne, budując drogi i mosty.",
        "Firma specjalizuje się w budownictwie kubaturowym i deweloperskim.",
        "Przedsiębiorstwo dostarcza beton i prefabrykaty na największe place budowy w kraju.",
        "Koncern budowlany wygrywa przetargi na modernizację obiektów użyteczności publicznej."
    ],
    keywords: [
        "ceny materiałów", "przetargi publiczne", "warunki pogodowe", "dostępność siły roboczej",
        "koniunktura mieszkaniowa", "inwestycje rządowe", "pozwolenia na budowę"
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

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
}

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
            const fallbackTraits = traitsPool.filter(trait => !assignedTraits.some(assigned => assigned.id === trait.id));
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