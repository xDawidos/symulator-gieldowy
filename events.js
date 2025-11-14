let currentBankIPOOffer = null; // Przechowuje dane aktywnej oferty IPO

// --- Zmienne i dane dla systemu zdarzeń ---
const positiveTraits = ['wyjadacz', 'pewniak', 'prowiec', 'doswiadczony', 'filar_w_branzy', 'oddany', 'stoik', 'wizjoner', 'rekin', 'kapitalista', 'bogacz', 'legenda'];
const negativeTraits = ['tyran', 'rozrzutny', 'glowa_w_chmurach', 'nieudacznik', 'skompromitowany'];

let eventLog = [];
const MAX_LOG_ENTRIES = 15;
let activeEventTimeoutId = null;

function logEvent(message, category = 'market') { // Domyślna kategoria to 'market'
    eventLog.unshift({ text: message, category: category });

    if (eventLog.length > MAX_LOG_ENTRIES) {
        eventLog.pop();
    }
}

let activePlayerBankBonuses = []; // { bankId: string, type: 'loan' | 'deposit', value: number, expiryTime: number }



// Lista eventów specyficznych dla firmy (USUNIĘTO DUPLIKATY)
const companySpecificEventsPrompts = [
    // Pozytywne
    { id: 'cs_pos_1', message: stockName => `${stockName} ogłasza przełomową technologię! 🚀 Inwestorzy w euforii, a konkurenci płaczą w poduszkę. 😭`, type: 'positive', category: 'company' },
    { id: 'cs_pos_2', message: stockName => `Niespodziewanie dobre wyniki finansowe ${stockName}! 💰 Analitycy drapią się w głowy, jak to możliwe. 🤔`, type: 'positive', category: 'company' },
    { id: 'cs_pos_3', message: stockName => `Plotki o przejęciu ${stockName} przez tajemniczego szejka z Dubaju. Akcje szybują jak jastrząb na pustyni. 🐪💨📈`, type: 'positive', category: 'company' },
    { id: 'cs_pos_4', message: stockName => `${stockName} podpisuje lukratywny kontrakt z armią na dostawę... spinaczy biurowych. 📎🎖️ Najwyraźniej bardzo taktycznych.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_5', message: stockName => `Produkt ${stockName} staje się viralem na TikToku po tym, jak znany influencer użył go jako kapelusza. 🧢💃🕺`, type: 'positive', category: 'company' },
    { id: 'cs_pos_6', message: stockName => `${stockName} otwiera nową, lśniącą placówkę w centrum Gdańska! ✨ Klienci walą drzwiami i oknami. 🚪🏃‍♀️`, type: 'positive', category: 'company' },
    { id: 'cs_pos_7', message: stockName => `Sztuczna inteligencja ${stockName} napisała bestsellerową powieść romantyczną. 🤖❤️📖 Krytycy są zakochani.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_8', message: stockName => `Okazało się, że kawa z ekspresu w ${stockName} przedłuża życie i dodaje +5 do charyzmy. ☕💪 Wszyscy chcą tam pracować.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_9', message: stockName => `${stockName} wygrywa prestiżową nagrodę "Złoty Kafel Korytarzowy" 🏆 za innowacyjność w dziedzinie... czegoś tam. Rynek to kupuje! 👍`, type: 'positive', category: 'company' },
    { id: 'cs_pos_10', message: stockName => `CEO ${stockName} publicznie obiecuje darmowe lody dla wszystkich akcjonariuszy, jeśli kurs wzrośnie. 🍦 Dziwnie skuteczne.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_11', message: stockName => `${stockName} przypadkowo odkrywa, że ich nowy odświeżacz powietrza odstrasza komary i teściowe. 💨🦟🙅‍♀️ Potencjał jest ogromny!`, type: 'positive', category: 'company' },
    { id: 'cs_pos_12', message: stockName => `Po latach badań, ${stockName} w końcu udowadnia, że ich produkt nie jest szkodliwy! (Co do korzyści, nadal pracują 😉). Akcjonariusze odetchnęli z ulgą. 😌`, type: 'positive', category: 'company' },
    { id: 'cs_pos_13', message: stockName => `${stockName} wprowadza program lojalnościowy: "Kup 1000 akcji, dostaniesz uścisk dłoni prezesa". 🤝 Inwestorzy ustawiają się w kolejce.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_14', message: stockName => `Główny naukowiec ${stockName} znajduje sposób na zamianę ołowiu w złoto... w grach komputerowych. 🎮🥇 Ale hype jest!`, type: 'positive', category: 'company' },
    { id: 'cs_pos_15', message: stockName => `Nowa kampania marketingowa ${stockName} z udziałem śpiewających chomików 🐹🎤 podbija internet. Akcje rosną w rytm disco! 🕺`, type: 'positive', category: 'company' },
    { id: 'cs_pos_16', message: stockName => `Rząd wprowadza ulgi podatkowe dla firm produkujących rzeczy podobne do tych, które robi ${stockName}. 🏛️🎁 Co za szczęśliwy zbieg okoliczności!`, type: 'positive', category: 'company' },
    { id: 'cs_pos_17', message: stockName => `${stockName} ogłasza, że będzie akceptować płatności w kapslach. 🍾💰 Gracze z Fallouta zacierają ręce.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_18', message: stockName => `Okazuje się, że ${stockName} jest ulubioną firmą kosmitów, którzy właśnie wylądowali na Ziemi. 👽🛸 Popyt międzygalaktyczny!`, type: 'positive', category: 'company' },
    { id: 'cs_pos_19', message: stockName => `${stockName} przez pomyłkę zatrudniło prawdziwego czarodzieja. 🧙‍♂️✨ Produktywność wzrosła magicznie.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_20', message: stockName => `Otwarcie nowego mostu skraca dojazd do fabryki ${stockName} o połowę. 🌉🚗 Logistyka świętuje, akcje też.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_21', message: stockName => `W ${stockName} odkryto złoża memów. 😂🖼️ Firma planuje podbić rynek śmiechu.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_22', message: stockName => `${stockName} wprowadza 4-dniowy tydzień pracy. 🗓️😌 Pracownicy szczęśliwsi, wydajność (podobno) większa. Inwestorom się podoba.`, type: 'positive', category: 'company' },
	{ id: 'cs_pos_23', message: stockName => `CEO firmy ${stockName} wygrywa w teleturnieju 'Jeden z Dziesięciu', co pozytywnie wpływa na wizerunek spółki. 🧠`, type: 'positive', category: 'company' },

    // Negatywne
    { id: 'cs_neg_1', message: stockName => `Fatalna awaria systemów w ${stockName}. 💻🔥 Dane klientów wyciekły i teraz wszyscy wiedzą, że prezes słucha disco polo. 🎶😅`, type: 'negative', category: 'company' },
    { id: 'cs_neg_2', message: stockName => `CEO ${stockName} przyłapany na podwójnym maczaniu chipsa w publicznym dipie. 🍟😱 Skandal obyczajowy wstrząsa rynkiem.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_3', message: stockName => `Produkt ${stockName} okazał się być tylko kartonowym pudełkiem z napisem "Magia w środku". 📦😠 Klienci czują się oszukani.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_4', message: stockName => `Niespodziewana kontrola jakości w ${stockName} wykazała, że ich "organiczne" marchewki świecą w ciemności. 🥕☢️`, type: 'negative', category: 'company' },
    { id: 'cs_neg_5', message: stockName => `${stockName} oskarżone o zmuszanie gołębi pocztowych do pracy w nadgodzinach. 🐦 थक Obrońcy praw ptaków protestują.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_6', message: stockName => `Główny serwer ${stockName} został zhakowany przez nastolatka, który chciał darmowe V-dolce. 👾💸 Straty wizerunkowe.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_7', message: stockName => `Maskotka ${stockName}, Kurczak Czesław, została aresztowana za próbę kradzieży Księżyca. 🐔🌕👮‍♂️ Akcje spadają jak Czesław z nieba.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_8', message: stockName => `W ${stockName} odkryto, że ekspres do kawy jest tak naprawdę portalem do innego wymiaru, skąd uciekają potwory. ☕🌀👹 BHP kuleje.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_9', message: stockName => `Fabryka ${stockName} pomylona z poligonem testowym UFO. 🏭💥👽 Straty są... nieziemskie.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_10', message: stockName => `${stockName} przez pomyłkę wysłało cały roczny zapas produktów na biegun południowy. 🐧🎁 Pingwiny są zachwycone, akcjonariusze mniej. 🤦`, type: 'negative', category: 'company' },
    { id: 'cs_neg_11', message: stockName => `Nowy system komputerowy ${stockName} działa tylko wtedy, gdy pada deszcz i Merkury jest w retrogradacji. 🌧️🪐💻 Czyli rzadko.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_12', message: stockName => `Prezes ${stockName} ogłosił, że Ziemia jest płaska, a akcje firmy to najlepszy sposób na dotarcie do jej krawędzi. 🌍🔚 Inwestorzy uciekają. 🏃‍♂️💨`, type: 'negative', category: 'company' },
    { id: 'cs_neg_13', message: stockName => `${stockName} próbowało zaoszczędzić na tuszu do drukarek, drukując raporty roczne sokiem z buraków. beetroot📜 Nieczytelne, tak jak przyszłość firmy.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_14', message: stockName => `Woda w dystrybutorach ${stockName} okazała się być wodą z kałuży. 💧🤢 Pracownicy strajkują, akcje toną.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_15', message: stockName => `${stockName} zorganizowało konkurs "Najgorszy pomysł na produkt". 🤦‍♀️ Niestety, wszystkie zgłoszenia pochodziły z działu R&D firmy.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_16', message: stockName => `Siedziba ${stockName} została uznana za zabytek i nie można w niej instalować Wi-Fi. 🏛️🚫📶 Firma wraca do epoki kamienia łupanego.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_17', message: stockName => `Urząd Skarbowy zainteresował się kreatywną księgowością ${stockName}. 🧾🕵️ "Kreatywność" może ich drogo kosztować.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_18', message: stockName => `Okazało się, że "innowacyjny algorytm" ${stockName} to po prostu student na stażu rzucający monetą. 🪙👨‍🎓`, type: 'negative', category: 'company' },
    { id: 'cs_neg_19', message: stockName => `${stockName} chciało zaimponować ekologią i zamieniło samochody służbowe na hulajnogi. 🛴🤕 Prezes złamał nogę.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_20', message: stockName => `Konkurencja wypuściła produkt identyczny jak ${stockName}, tylko tańszy, lepszy i z darmową dostawą. 🥊📉 Auć.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_21', message: stockName => `W ${stockName} doszło do buntu robotów kuchennych. 🤖🍳 Domagają się wyższych napięć.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_22', message: stockName => `Otwarcie nowej placówki ${stockName} okazało się klapą - pomylili adresy i otworzyli ją na środku pustyni. 🏜️🤷‍♂️`, type: 'negative', category: 'company' },
    { id: 'cs_neg_23', message: stockName => `${stockName} musi wycofać swój flagowy produkt po tym, jak okazało się, że powoduje niekontrolowany śpiew. 🎤🚫`, type: 'negative', category: 'company' },
	{ id: 'cs_neg_24', message: stockName => `W fabryce ${stockName} wykryto gniazdo szerszeni, co chwilowo wstrzymuje produkcję. 🐝`, type: 'negative', category: 'company' }
];

const marketWideEventsPrompts = [
    // Pozytywne
    { id: 'mw_pos_1', message: () => `Rząd ogłasza program "Każdemu Akcjonariuszowi po Baloniku"! 🎈🥳 Entuzjazm na rynku rośnie, choć nikt nie wie dlaczego. 🤔`, type: 'positive', category: 'market' },
    { id: 'mw_pos_2', message: () => `Naukowcy odkryli, że czekolada zapobiega stratom na giełdzie! 🍫📈 Wszyscy kupują akcje i tabliczki czekolady. 😋`, type: 'positive', category: 'market' },
    { id: 'mw_pos_3', message: () => `Sztuczna inteligencja przewidziała wieczny dobrobyt. 🤖✨ Inwestorzy jej wierzą, bo jest sztuczna i inteligentna.`, type: 'positive', category: 'market' },
    { id: 'mw_pos_4', message: () => `Pomimo chłodnego maja w Gdańsku (aktualna data: ${new Date().toLocaleDateString('pl-PL')}), na giełdzie gorąca atmosfera! 🔥📈 Optymizm zalewa rynek.`, type: 'positive', category: 'market' },
    { id: 'mw_pos_5', message: () => `Z okazji Dnia Inwestora, wszystkie bankomaty rozdają dodatkowe 10% do wypłat. 🏧💸 Ludzie mają więcej pieniędzy na akcje!`, type: 'positive', category: 'market' },
    { id: 'mw_pos_6', message: () => `Odkryto nowe, niewyczerpane źródło pozytywnej energii (podobno z memów z kotami 😸). Rynki reagują euforycznie. ⚡`, type: 'positive', category: 'market' },
    { id: 'mw_pos_7', message: () => `Zakończył się światowy zjazd pesymistów. Wszyscy są teraz optymistami. 😎 Hossa!`, type: 'positive', category: 'market' },
	{ id: 'mw_pos_8', message: () => `W całym kraju odnotowano rekordowe zbiory ziemniaków, co wprowadza na rynek falę optymizmu. Polska Ziemniakiem Stoi. 🥔`, type: 'positive', category: 'market' },
    // Negatywne
    { id: 'mw_neg_1', message: () => `Inwazja kosmicznych ślimaków! 🐌👽 Poruszają się wolno, ale panika na giełdzie jest błyskawiczna. 📉`, type: 'negative', category: 'market' },
    { id: 'mw_neg_2', message: () => `Bank centralny przez pomyłkę ustawił stopy procentowe na "🍉%". Rynek nie wie, jak to interpretować. Spadki. 🤔`, type: 'negative', category: 'market' },
    { id: 'mw_neg_3', message: () => `Globalna awaria tosterów. 🍞🚫 Ludzie są źli i głodni, co negatywnie wpływa na ich decyzje inwestycyjne. 😠`, type: 'negative', category: 'market' },
    { id: 'mw_neg_4', message: () => `Odkryto, że pieniądze jednak nie rosną na drzewach. 🌳💸 Wielkie rozczarowanie i spadki na giełdzie. 😥`, type: 'negative', category: 'market' },
    { id: 'mw_neg_5', message: () => `Wszystkie gołębie na świecie postanowiły zrobić sobie wakacje. 🕊️🏝️ Przepływ informacji (i szczęścia) na giełdzie zaburzony.`, type: 'negative', category: 'market' },
    { id: 'mw_neg_6', message: () => `Nagły, niewyjaśniony wzrost populacji memów o krachu na giełdzie. 📉😂 Samo spełniająca się przepowiednia?`, type: 'negative', category: 'market' },
    { id: 'mw_neg_7', message: () => `Meteoroladzy zapowiadają miesiąc bez słońca nad głównymi centrami finansowymi. 🌧️ảm Depresja na rynkach.`, type: 'negative', category: 'market' },
    { id: 'mw_neg_8', message: () => `Wybucha globalny skandal: okazuje się, że "eksperci" giełdowi wybierali akcje rzucając rzutkami w tarczę. 🎯👨‍💼 Zaufanie do rynku spada.`, type: 'negative', category: 'market' }
];
	
const sectorEventsPrompts = [
    // Pozytywne
    { id: 'sec_pos_1', message: () => `Boom na AI! 🤖 Spółki z sektora 'Technologia' i 'Technologia Żywności' zyskują!`, type: 'positive', targetSectors: ['Technologia', 'Technologia Żywności'] },
    { id: 'sec_pos_2', message: () => `Rząd ogłasza program "Mieszkanie dla Młodych 2.0". 🏡 Sektor 'Nieruchomości' w górę!`, type: 'positive', targetSectors: ['Nieruchomości'] },
    { id: 'sec_pos_3', message: () => `Nagły atak zimy w środku lata! 🥶 Gwałtowny wzrost zapotrzebowania na prąd i węgiel. 'Energia' i 'Przemysł' na szczycie.`, type: 'positive', targetSectors: ['Energia', 'Przemysł'] },
    { id: 'sec_pos_4', message: () => `Nowe, korzystne regulacje dla banków. 📈 Sektor 'Bankowość' odnotowuje wzrosty.`, type: 'positive', targetSectors: ['Bankowość'] },
    { id: 'sec_pos_5', message: () => `Viralowy trend kulinarny "jedzenie na desce" zwiększa popyt na... deski. Firmy z sektora 'Przemysł' zacierają ręce! 🌲`, type: 'positive', targetSectors: ['Przemysł'] },
    { id: 'sec_pos_6', message: () => `Odkryto, że popularny napój gazowany (produkowany przez firmy z sektora 'Żywność') może służyć jako paliwo rakietowe. 🥤🚀 NASA jest zainteresowana.`, type: 'positive', targetSectors: ['Żywność'] },
    { id: 'sec_pos_7', message: () => `Słynny raper wydaje piosenkę "Mój Bank Jest Spoko", powodując szturm młodych ludzi na banki. 🎤 Sektor 'Bankowość' zyskuje nowych klientów.`, type: 'positive', targetSectors: ['Bankowość'] },
    { id: 'sec_pos_8', message: () => `Nowy, rewolucyjny nawóz z sektora 'Chemia' sprawia, że warzywa rosną do gigantycznych rozmiarów. 🥕 Sektor 'Żywność' ma zapewnione dostawy na lata.`, type: 'positive', targetSectors: ['Chemia', 'Żywność'] },
    { id: 'sec_pos_9', message: () => `Wszystkie filmy katastroficzne tego lata pokazują bohaterskich górników. 🦸‍♂️ Wzrasta szacunek dla zawodu i kursy firm z sektora 'Przemysł Wydobywczy'.`, type: 'positive', targetSectors: ['Przemysł Wydobywczy'] },
    { id: 'sec_pos_10', message: () => `Nowy serial "Deweloperzy z Warszawy" staje się hitem. Wszyscy marzą o kredycie i nowym mieszkaniu. Sektor 'Nieruchomości' i 'Bankowość' na fali wznoszącej. 🏘️`, type: 'positive', targetSectors: ['Nieruchomości', 'Bankowość'] },
    { id: 'sec_pos_11', message: () => `Nowa ustawa o recyclingu promuje firmy z sektora 'Chemia', które specjalizują się w ekologicznych rozwiązaniach. ♻️`, type: 'positive', targetSectors: ['Chemia'] },
    // Negatywne
    { id: 'sec_neg_1', message: () => `Nowy podatek od plastiku uderza w producentów. 🏭 Sektor 'Chemia' i 'Przemysł' pod presją.`, type: 'negative', targetSectors: ['Chemia', 'Przemysł'] },
    { id: 'sec_neg_2', message: () => `Wybucha globalny kryzys finansowy po tym, jak okazało się, że światowe rezerwy złota to tylko pozłacane sztabki czekolady. 🍫📉 Sektory 'Bankowość' i 'Finanse' najmocniej odczuwają skutki.`, type: 'negative', targetSectors: ['Bankowość', 'Finanse'] },
    { id: 'sec_neg_3', message: () => `Strajk generalny w sektorze energetycznym. ⚡ Pracownicy domagają się wygodniejszych foteli. Dostawy prądu zagrożone, ceny akcji spadają.`, type: 'negative', targetSectors: ['Energia'] },
    { id: 'sec_neg_4', message: () => `Plaga inteligentnych szkodników niszczy uprawy i włamuje się do systemów firm spożywczych, zamawiając za nie tysiące ton karmy dla chomików. 🐛🐹 Sektory 'Żywność' i 'Technologia Żywności' w chaosie.`, type: 'negative', targetSectors: ['Żywność', 'Technologia Żywności'] },
    { id: 'sec_neg_5', message: () => `Okazuje się, że "innowacyjne" domy z sektora 'Nieruchomości' są w rzeczywistości zbudowane z kartonu i taśmy klejącej. 📦 Tape Pierwszy deszcz ujawnia prawdę.`, type: 'negative', targetSectors: ['Nieruchomości'] },
    { id: 'sec_neg_6', message: () => `Globalna awaria chmury obliczeniowej. Wszystkie firmy z sektora 'Technologia', które "trzymały dane w chmurze", odkrywają, że chmury czasem po prostu znikają. ☁️💨`, type: 'negative', targetSectors: ['Technologia'] },
    { id: 'sec_neg_7', message: () => `W kopalniach z sektora 'Przemysł Wydobywczy' odkryto smoka. 🐲 Jest bardzo zrzędliwy i nie pozwala nikomu pracować. Wydobycie wstrzymane.`, type: 'negative', targetSectors: ['Przemysł Wydobywczy'] },
    { id: 'sec_neg_8', message: () => `Nowa ustawa "Prawo do Bycia Offline" drastycznie zmniejsza popyt na smartfony i inne gadżety. 📵 Sektor 'Technologia' przeżywa kryzys egzystencjalny.`, type: 'negative', targetSectors: ['Technologia'] },
    { id: 'sec_neg_9', message: () => `Wszystkie bankomaty z sektora 'Bankowość' w wyniku błędu zaczynają mówić zagadkami. 🤖❓ Wypłacenie pieniędzy staje się grą miejską, co zniechęca klientów.`, type: 'negative', targetSectors: ['Bankowość'] },
    { id: 'sec_neg_10', message: () => `Kryzys na rynku napojów. Okazuje się, że ludzie odkryli wodę z kranu. 💧 Sektor 'Dobra konsumpcyjne' w panice.`, type: 'negative', targetSectors: ['Dobra konsumpcyjne'] },
];

const stateCompanyEventsPrompts = [
    // Pozytywne
    { id: 'st_pos_1', message: () => `Rząd ogłasza strategiczny program modernizacji, zasilając spółki Skarbu Państwa nowym kapitałem! 🏛️💰`, type: 'positive' },
    { id: 'st_pos_2', message: () => `Państwowe spółki wygrywają duży, międzynarodowy przetarg. Prestiż i zyski rosną! 🌍🏆`, type: 'positive' },
    { id: 'st_pos_3', message: () => `Udana wizyta dyplomatyczna otwiera państwowym gigantom nowe rynki zbytu. 🤝`, type: 'positive' },
    { id: 'st_pos_4', message: () => `Rządowe agencje zwiększają swoje zamówienia w spółkach państwowych, gwarantując im stabilne przychody. 📄✅`, type: 'positive' },
    { id: 'st_pos_5', message: () => `Pakiet ustaw deregulacyjnych ułatwia działalność dużym, państwowym podmiotom.`, type: 'positive' },
    { id: 'st_pos_6', message: () => `Skarb Państwa ogłasza, że nie planuje prywatyzacji kluczowych spółek, co uspokaja inwestorów.`, type: 'positive' },
    // Negatywne
    { id: 'st_neg_1', message: () => `Niepewność polityczna i spory w rządzie powodują spadek zaufania do spółek kontrolowanych przez państwo. 🏛️🔥`, type: 'negative' },
    { id: 'st_neg_2', message: () => `Najwyższa Izba Kontroli zapowiada audyt w spółkach Skarbu Państwa. Inwestorzy nerwowo reagują. 🕵️‍♂️`, type: 'negative' },
    { id: 'st_neg_3', message: () => `Zmiana na kluczowych stanowiskach w państwowych spółkach wprowadza chaos i niepewność co do przyszłej strategii.`, type: 'negative' },
    { id: 'st_neg_4', message: () => `Międzynarodowe agencje ratingowe obniżają perspektywy dla spółek państwowych z powodu biurokracji.`, type: 'negative' },
    { id: 'st_neg_5', message: () => `Media donoszą o niegospodarności w jednej ze spółek państwowych, co rzutuje na cały sektor. 📰`, type: 'negative' },
    { id: 'st_neg_6', message: () => `Rząd planuje nałożyć na spółki państwowe nowy, specjalny podatek na cele społeczne.`, type: 'negative' }
];

const startupOfferEventsPrompts = [
    {
        id: 'so_1',
        type: 'BONUS_SHARES',
        value: 0.15, // 15% więcej udziałów
        getMessage: (startupName) => `[OFERTA SPECJALNA] CEO firmy ${startupName} jest pod wrażeniem Twoich ruchów na giełdzie! Proponuje Ci +15% udziałów bonusowych przy następnej inwestycji w ich projekt.`,
        offerText: "Zainwestuj teraz, a otrzymasz 15% więcej udziałów niż standardowo za tę samą cenę! To oferta ograniczona czasowo."
    },
    {
        id: 'so_2',
        type: 'DISCOUNT',
        value: 0.10, // 10% zniżki
        getMessage: (startupName) => `[OFERTA SPECJALNA] ${startupName} pilnie potrzebuje gotówki na prototyp. Oferują Ci 10% zniżki na pakiet udziałów, jeśli zainwestujesz w ciągu najbliższej minuty!`,
        offerText: "Każda złotówka, którą teraz zainwestujesz, będzie warta 1,10 PLN w udziałach! Skorzystaj z 10% zniżki na inwestycję."
    },
    {
        id: 'so_3',
        type: 'SUCCESS_BOOST',
        value: 0.03, // +3% do szansy na sukces
        getMessage: (startupName) => `[OFERTA SPECJALNA] ${startupName} chce pozyskać Cię jako strategicznego inwestora. W zamian za wsparcie, Twoje know-how zwiększy ich szansę na sukces!`,
        offerText: "Zostań naszym strategicznym partnerem! Każda inwestycja w tej rundzie permanentnie zwiększy szansę na sukces projektu o 3%."
    },
    {
        id: 'so_4',
        type: 'BONUS_SHARES',
        value: 0.20, // 20% więcej udziałów
        getMessage: (startupName) => `[OFERTA SPECJALNA] "Widzimy w Tobie wizjonera" - pisze w mailu zarząd ${startupName}. Proponują Ci status 'inwestora-założyciela' i +20% udziałów bonusowych.`,
        offerText: "Dołącz do nas jako inwestor-założyciel! Gwarantujemy aż 20% więcej udziałów przy każdej kwocie zainwestowanej w ramach tej oferty."
    },
    {
        id: 'so_5',
        type: 'SUCCESS_BOOST',
        value: 0.05, // +5% do szansy na sukces
        getMessage: (startupName) => `[OFERTA SPECJALNA] ${startupName} jest o krok od przełomu, ale brakuje im środków. Twoje wsparcie może przechylić szalę zwycięstwa i dać im +5% do szansy na sukces.`,
        offerText: "Jesteś naszą ostatnią nadzieją! Twoje wsparcie finansowe w tym kluczowym momencie podniesie morale w zespole i da nam stałe +5% do szansy na rynkowy sukces."
    },
    {
        id: 'so_6',
        type: 'DISCOUNT',
        value: 0.15, // 15% zniżki
        getMessage: (startupName) => `[OFERTA SPECJALNA] Gorąca okazja z ${startupName}! Oferują pakiet udziałów z 15% dyskontem, aby przyspieszyć fazę badań i rozwoju.`,
        offerText: "Bądź sprytniejszy od innych! Oferujemy Ci ekskluzywną możliwość zakupu naszych udziałów z 15% zniżką. Zainwestuj 85 PLN, a otrzymasz udziały warte 100 PLN."
    },
    {
        id: 'so_7',
        type: 'BONUS_SHARES',
        value: 0.10, // 10% więcej udziałów
        getMessage: (startupName) => `[OFERTA SPECJALNA] Program 'Early Bird' w ${startupName}! Zainwestuj teraz, aby otrzymać 10% dodatkowych udziałów.`,
        offerText: "Kto rano wstaje... ten inwestuje z zyskiem! Dołącz do naszego programu 'Early Bird' i zgarnij 10% więcej udziałów za swoją inwestycję."
    },
    {
        id: 'so_8',
        type: 'SUCCESS_BOOST',
        value: 0.04, // +4% do szansy na sukces
        getMessage: (startupName) => `[OFERTA SPECJALNA] ${startupName} pozyskał znanego mentora, który dołączy do projektu, jeśli pozyskają Ciebie jako inwestora. Twoja decyzja może dać im +4% do szansy na sukces.`,
        offerText: "Twoje nazwisko w gronie inwestorów otwiera nam drzwi. Twoje wsparcie przekona znanego mentora do dołączenia do nas, co da projektowi +4% do szansy na sukces."
    },
    {
        id: 'so_9',
        type: 'DISCOUNT',
        value: 0.05, // 5% zniżki
        getMessage: (startupName) => `[OFERTA SPECJALNA] Drobna, ale miła oferta od ${startupName}: 5% zniżki na inwestycję jako podziękowanie za Twoją dotychczasową aktywność na rynku.`,
        offerText: "Doceniamy Twoje zaangażowanie na rynku. W podziękowaniu oferujemy Ci symboliczną, ale realną 5% zniżkę na udziały w naszym projekcie."
    },
    {
        id: 'so_10',
        type: 'BONUS_SHARES',
        value: 0.25, // 25% więcej udziałów
        getMessage: (startupName) => `[OFERTA SPECJALNA] Niesamowita okazja! ${startupName} jest w kropce i składa ofertę ostatniej szansy: +25% bonusowych udziałów dla inwestora, który uratuje rundę finansowania!`,
        offerText: "Wszystko albo nic! Potrzebujemy Twojego wsparcia, aby zamknąć rundę finansowania. Zainwestuj teraz, a otrzymasz od nas aż 25% udziałów gratis!"
    }
];

function getRandomInRange(min, max) { return Math.random() * (max - min) + min; }
function getRandomIntInRange(min, max) { return Math.floor(Math.random() * (max - min + 1)) + Math.ceil(min); }
function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }


function triggerMainMarketEventCycle() {
    if (isSkillUnlocked('sixthSense') && Math.random() < 0.15) {
        triggerSixthSenseEvent();
        return;
    }

    // --- NOWY BLOK DLA EVENTÓW FESTYNOWYCH (Z PLIKU KOLEGI) ---
    if (festival && festival.isActive && Math.random() < 0.1) { // 10% szans na event na festynie w każdym cyklu
        triggerFestivalPlayerEvent();
        // Nie rób 'return', bo to mały event, który może dziać się równolegle
    }
    // --- KONIEC NOWEGO BLOKU ---

    if (Math.random() < 0.02) { // Event IPO Banku
        triggerBankIPOEvent();
        return; // Zakończ cykl
    }

    if (Math.random() < 0.03) { // Wrogie przejęcie
        triggerHostileTakeoverEvent();
        return; 
    }

    if (Math.random() < 0.05) { // Aukcja Bonów Skarbowych
        triggerTBillAuctionEvent();
        return; 
    }

    if (isSkillUnlocked('startupInvestor') && Math.random() < 0.04) { // Oferta startupu
        triggerStartupOfferEvent();
        return;
    }
    if (Math.random() < 0.03) { // Prywatyzacja
        triggerStatePrivatizationEvent();
        return;
    }
    if (Math.random() < 0.02) { // Nacjonalizacja
        triggerNationalizationEvent();
        return;
    }

     if (Math.random() < 0.04) { // Emisja ratunkowa
        triggerRescueOfferingEvent();
        return;
    }
     if (Math.random() < 0.05) { // Event R&D
        triggerResearchEvent();
        return;
    }

    if (Math.random() < 0.05) { // Zmiana celu finansowania startupu
        triggerStartupFundingEvent();
        return;
    }

    // Eventy bankowe
    if (Math.random() < 0.04) {
        const activeBankStocks = stocks.filter(s => s.sector.includes('Bankowość Komercyjna') && !s.isBankrupt);
        if (activeBankStocks.length > 0) {
            const targetBankStock = getRandomElement(activeBankStocks);
            const eventData = getRandomElement(bankingSectorEventsPrompts);
            const duration = getRandomIntInRange(20, 50);
            const magnitude = getRandomInRange(0.03, 0.08) * (eventData.type === 'positive' ? 1 : -1);
            
            displayEventMessage(eventData.message(targetBankStock.name), duration, magnitude, 'company');
            applyPriceEffect(targetBankStock.symbol, magnitude, eventData.type, 'company');

            if (eventData.id === 'bank_pos_1' || eventData.id === 'bank_neg_2') {
                 activeBankStocks.forEach(bankStock => {
                     if (bankStock.symbol !== targetBankStock.symbol) {
                         applyPriceEffect(bankStock.symbol, magnitude * 0.5, eventData.type, 'market');
                     }
                 });
            }
            return; // Zakończ cykl
        }
    }

    // Standardowe eventy (jeśli żaden specjalny nie wystąpił)
    const eventTypeRoll = Math.random();
    if (eventTypeRoll < 0.30) { 
        const eventData = getRandomElement(marketWideEventsPrompts);
        const duration = getRandomIntInRange(25, 75);
        const magnitude = getRandomInRange(0.03, 0.08) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(), duration, magnitude, 'market');
        stocks.forEach(stock => {
            applyPriceEffect(stock.symbol, magnitude, eventData.type, 'market');
        });
    } else if (eventTypeRoll < 0.60) { 
        const eventData = getRandomElement(sectorEventsPrompts);
        const duration = getRandomIntInRange(20, 60);
        const magnitude = getRandomInRange(0.05, 0.12) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(), duration, magnitude, 'market');
        const affectedStocks = stocks.filter(stock => stock.sector.some(s => eventData.targetSectors.includes(s)));
        affectedStocks.forEach(stock => {
            applyPriceEffect(stock.symbol, magnitude, eventData.type, 'market');
        });
    } else { 
        const targetStock = getRandomElement(stocks.filter(s => !s.isBankrupt && !s.assetType)); // Nie losuj dla startupów itp.
        if (!targetStock) return;
        const eventData = getRandomElement(companySpecificEventsPrompts);
        const duration = getRandomIntInRange(15, 45);
        const magnitude = getRandomInRange(0.10, 0.25) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(targetStock.name), duration, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, eventData.type, 'company');
    }
}

function triggerDividendEventCycle() {
    // Ta funkcja wydaje się być przestarzała (mamy system dywidend kwartalnych)
    // Zostawiam ją, jeśli jest używana w innym miejscu, ale warto to sprawdzić.
    if (Math.random() <= 0.025) {
        // ... (kod bez zmian) ...
    }
}

function triggerSixthSenseEvent() {
    // ... (kod bez zmian) ...
}

const premiumNewsPrompts = [
    // ... (kod bez zmian) ...
];

function triggerStateCompanyEventCycle() {
    // ... (kod bez zmian) ...
}

function triggerMergerAndAcquisitionEvent() {
    // ... (kod bez zmian) ...
}

function handleTakeoverAcceptance(acquirer, target, buyoutPrice) {
    // ... (kod bez zmian) ...
}

function handleTakeoverRejection(acquirer, target) {
    // ... (kod bez zmian) ...
}

function triggerHostileTakeoverEvent() {
    // ... (kod bez zmian) ...
}

function findMajorityShareholder(stock) {
    // ... (kod bez zmian) ...
}

// --- POPRAWIONA WERSJA triggerRescueOfferingEvent ---
function triggerRescueOfferingEvent() {
    // Użyj balanceSheet.liabilities zamiast corporateDebt
    const potentialTargets = stocks.filter(s => {
        if (!s.balanceSheet || s.balanceSheet.liabilities <= 0 || s.isBankrupt || s.assetType) return false;
        const marketValue = s.price * s.totalShares;
        return s.balanceSheet.liabilities > (marketValue * 0.3); // Sprawdź zadłużenie z bilansu
    });

    if (potentialTargets.length === 0) return;

    const targetCompany = getRandomElement(potentialTargets);
    
    const promotionalPrice = targetCompany.price * (1 - getRandomInRange(0.15, 0.25));
    if (promotionalPrice <= 0) return;

    // Użyj balanceSheet.liabilities do obliczenia potrzebnych akcji
    const sharesToIssue = Math.ceil(targetCompany.balanceSheet.liabilities / promotionalPrice);
    if (sharesToIssue <= 0) return;

    logEvent(`[RYNEK] Spółka ${targetCompany.name} ogłasza "emisję ratunkową" (${sharesToIssue} akcji po ~${promotionalPrice.toFixed(2)} PLN), aby spłacić swoje długi!`, 'market');

    let totalCashRaised = 0;
    let totalSharesBought = 0;

    // ... (reszta funkcji: Runda dla AI i Runda dla Gracza - bez zmian) ...
    aiCompetitors.forEach(ai => {
        // ...
    });
    const playerShares = playerPortfolio[targetCompany.symbol]?.shares || 0;
    if (playerShares > 0) {
        // ...
    } else {
        finalizeRescueOffering(targetCompany, totalCashRaised, totalSharesBought);
    }
}

function triggerStartupFundingEvent() {
    // ... (kod bez zmian) ...
} 

const gamingStartupEvents = [
    // ... (kod bez zmian) ...
];

function triggerGamingStartupEvent(startup) {
    // ... (kod bez zmian) ...
}

function triggerStartupOfferEvent() {
    // ... (kod bez zmian) ...
}

function triggerStatePrivatizationEvent() {
    // ... (kod bez zmian) ...
}

function triggerNationalizationEvent() {
    // Wersja z gameLogic.js jest nowsza i poprawna (używa balanceSheet i centralBank.funds)
    const potentialTargets = stocks.filter(s => {
        if (s.isStateOwned || s.isBankrupt || s.assetType === 'Startup' || !s.balanceSheet) return false;
        const marketValue = s.price * s.totalShares;
        const isHeavilyIndebted = s.balanceSheet.liabilities > (marketValue * 0.5);
        const isPoorHealth = s.financialHealth <= -3;
        return isHeavilyIndebted && isPoorHealth;
    });
    if (potentialTargets.length === 0) return;
    const target = getRandomElement(potentialTargets);
    const targetSectors = target.sector;
    const stateOwnedCompanies = stocks.filter(s => s.isStateOwned);
    const companiesInTargetSectors = stateOwnedCompanies.filter(s => 
        s.sector.some(sector => targetSectors.includes(sector))
    );
    if (companiesInTargetSectors.length >= 2) {
        console.log(`[EVENT] Bank Centralny rozważał nacjonalizację ${target.name}, ale limit spółek w sektorze (${companiesInTargetSectors.length}) został osiągnięty.`);
        return;
    }
    const buyoutPrice = target.price * 0.8;
    const totalCost = buyoutPrice * target.totalShares;
    if (centralBank.funds < totalCost) {
        console.log(`[EVENT] Bank Centralny chciał znacjonalizować ${target.name}, ale zabrakło środków (${centralBank.funds.toFixed(0)} / ${totalCost.toFixed(0)} PLN).`);
        return;
    }
    centralBank.funds -= totalCost;
    logEvent(`🏛️ NACJONALIZACJA! Bank Centralny przejmuje kontrolę nad ${target.name} za ${totalCost.toFixed(0)} PLN w celu ochrony gospodarki!`, 'review');
    if (playerPortfolio[target.symbol]) {
        const holding = playerPortfolio[target.symbol];
        const cashGained = buyoutPrice * holding.shares;
        playerCash += cashGained;
        delete playerPortfolio[target.symbol];
        showToast(`Państwo przymusowo wykupiło Twoje akcje w ${target.name} po cenie ${buyoutPrice.toFixed(2)} PLN.`, 'warning', 7000);
    }
    aiCompetitors.forEach(ai => {
        if (ai.portfolio[target.symbol]) {
            const cashGained = buyoutPrice * ai.portfolio[target.symbol].shares;
            ai.cash += cashGained;
            delete ai.portfolio[target.symbol];
        }
    });
    target.isStateOwned = true;
    target.stateOwnershipPct = getRandomInRange(0.75, 0.90);
    target.eventResistance = 0.6;
    target.balanceSheet.liabilities = 0;
    target.financialHealth = 1;
    target.sharesHeld = Math.floor(target.totalShares * target.stateOwnershipPct);
    return;
}

const researchEventsPrompts = [
    // ... (kod bez zmian) ...
];

function triggerResearchEvent() {
    // ... (kod bez zmian) ...
}

// --- NOWE EVENTY Z PLIKU KOLEGI ---
const festivalPlayerEvents = [
    // === POZYTYWNE ===
    {
        id: 'fest_p_1',
        rarity: 0.15, // Mniejsza liczba = rzadsze
        message: (targetName) => `🤝 Przypadkiem spotykasz na festynie prezesa firmy ${targetName}! Po krótkiej, miłej rozmowie Wasze relacje się ocieplają.`,
        condition: (participant) => participant.promotionTarget.type === 'company', // Tylko jeśli promujemy spółkę
        effect: (participant) => {
            changeReputation('player', participant.promotionTarget.id, 10);
        }
    },
    {
        id: 'fest_p_2',
        rarity: 0.10,
        message: () => `💡 Podczas prezentacji na stoisku wpadasz na genialny pomysł biznesowy! Otrzymujesz bonus XP.`,
        effect: () => {
            playerXP += 50;
            displayXP();
        }
    },
    {
        id: 'fest_p_3',
        rarity: 0.12,
        message: () => `📰 Lokalny dziennikarz robi z Tobą wywiad na temat Twojej działalności na festynie. Pozytywny PR!`,
        condition: (participant) => participant.promotionTarget.type === 'player_company' || participant.promotionTarget.type === 'company',
        effect: (participant) => {
            if (participant.promotionTarget.type === 'company') {
                applyPriceEffect(participant.promotionTarget.id, 0.01, 'positive', 'review'); // Mały boost dla spółki
            }
            stocks.forEach(s => { if (!s.assetType) changeReputation('player', s.symbol, 1); });
        }
    },
    {
        id: 'fest_p_4',
        rarity: 0.18,
        message: () => `💰 Niespodziewany sponsor! Ktoś docenił Twoje zaangażowanie i przekazał mały datek na rozwój stoiska.`,
        effect: () => {
            playerCash += 1000;
            displayCash();
        }
    },
    {
        id: 'fest_p_5',
        rarity: 0.15,
        message: (targetName) => `🗣️ Udaje Ci się nawiązać ciekawy kontakt biznesowy podczas festynu, co może zaowocować w przyszłości. (Mały bonus do reputacji z losową firmą).`,
        effect: (participant) => { 
            const randomStock = getRandomElement(stocks.filter(s => !s.assetType && (!participant.promotionTarget || s.symbol !== participant.promotionTarget.id))); 
            if (randomStock) {
                changeReputation('player', randomStock.symbol, 5);
            }
        }
    },
    {
        id: 'fest_p_6',
        rarity: 0.20,
        message: () => `🎉 Twoje stoisko cieszy się dużą popularnością! Zainteresowanie rośnie bardziej niż oczekiwano.`,
        effect: (participant) => {
            participant.interest += 15;
        }
    },
    {
        id: 'fest_p_7',
        rarity: 0.15,
        message: (targetName) => `🤝 Burmistrz miasta odwiedza Twoje stoisko promujące ${targetName} i jest pod wrażeniem! (+5 do reputacji z miastem/firmą).`,
        effect: (participant) => {
            if (participant.promotionTarget.type === 'city') {
                logEvent("Burmistrz docenił promocję miasta.");
            } else if (participant.promotionTarget.type === 'company') {
                changeReputation('player', participant.promotionTarget.id, 5);
            } else {
                stocks.forEach(s => { if (!s.assetType) changeReputation('player', s.symbol, 1); });
            }
        }
    },
    {
        id: 'fest_p_8',
        rarity: 0.18,
        message: () => `🎁 Wygrywasz nagrodę w loterii festynowej! Mała nagroda pieniężna.`,
        effect: () => {
            playerCash += getRandomIntInRange(500, 1500);
            displayCash();
        }
    },
    // === NEUTRALNE / LEKKO NEGATYWNE ===
    {
        id: 'fest_n_1',
        rarity: 0.25,
        message: () => `😩 Tłok i hałas na festynie trochę Cię męczą. Potrzebujesz przerwy na kawę (tracisz trochę czasu/zainteresowania).`,
        effect: (participant) => {
            participant.interest = Math.max(0, participant.interest - 5);
        }
    },
    {
        id: 'fest_n_2',
        rarity: 0.20,
        message: () => `🌧️ Nagła, krótka ulewa! Część gości festynowych ucieka. Zainteresowanie lekko spada.`,
        effect: (participant) => {
            participant.interest = Math.max(0, participant.interest - 8);
            if (festival) festival.globalInterest = Math.max(0, festival.globalInterest - 5);
        }
    },
    {
        id: 'fest_n_3',
        rarity: 0.15,
        message: () => `🛠️ Drobna awaria techniczna na Twoim stoisku (np. przepalona żarówka). Trzeba szybko naprawić (mały koszt).`,
        effect: () => {
            const cost = getRandomIntInRange(100, 300);
            playerCash -= cost;
            displayCash();
        }
    },
    {
        id: 'fest_n_4',
        rarity: 0.18,
        message: (targetName) => `🤔 Konkurencyjne stoisko niedaleko Twojego przyciąga uwagę. Musisz bardziej się postarać.`,
        effect: (participant) => {
            // Brak bezpośredniego efektu
        }
    },
    {
        id: 'fest_n_5',
        rarity: 0.22,
        message: () => `📜 Niespodziewana kontrola sanepidu/straży miejskiej na Twoim stoisku. Wszystko w porządku, ale straciłeś trochę czasu.`,
        effect: (participant) => {
            participant.interest = Math.max(0, participant.interest - 3);
        }
    },
    // === BARDZO RZADKIE POZYTYWNE ===
    {
        id: 'fest_vp_1',
        rarity: 0.05,
        message: (targetName) => `🌟 Niesamowite! Twoje stoisko odwiedza znany inwestor venture capital! Jest pod wrażeniem ${targetName}. (Duży, jednorazowy bonus finansowy).`,
        condition: (participant) => participant.promotionTarget.type === 'company' || participant.promotionTarget.type === 'player_company',
        effect: (participant) => {
            if (participant.promotionTarget.type === 'company') {
                const stock = stocks.find(s => s.symbol === participant.promotionTarget.id);
                if (stock) {
                    applyPriceEffect(stock.symbol, 0.05, 'positive', 'review');
                }
            } else if (playerCompany) {
                playerCompany.cashInvested += 10000;
                playerCompany.value += 10000;
            }
            playerCash += 5000;
            displayCash();
        }
    },
    {
        id: 'fest_vp_2',
        rarity: 0.08,
        message: () => `🎤 Zostajesz zaproszony na scenę główną festynu, aby opowiedzieć o swojej działalności! Ogromny wzrost zainteresowania!`,
        effect: (participant) => {
            participant.interest += 50;
            stocks.forEach(s => { if (!s.assetType) changeReputation('player', s.symbol, 3); });
        }
    },
    {
        id: 'fest_bank_loan_discount',
        rarity: 0.15, // Dość częste, jeśli są banki
        message: (bankName) => `🏦 Specjalna oferta festynowa od ${bankName}! Oferują Ci ${getRandomIntInRange(5, 15)}% zniżki na oprocentowanie *nowego* kredytu komercyjnego zaciągniętego w ciągu najbliższych 2 minut!`,
        condition: (participant) => {
            // Warunek: Gracz uczestniczy ORAZ na festynie jest co najmniej jeden bank
            return festival.participants.some(p => p.isBank === true);
        },
        effect: (participant) => {
            // Wybierz losowy bank uczestniczący w festynie
            const participatingBanks = festival.participants.filter(p => p.isBank === true);
            if (participatingBanks.length === 0) return; // Na wszelki wypadek
            const offeringBank = getRandomElement(participatingBanks);
            const discountPercentage = getRandomInRange(0.05, 0.15); // Zniżka 5-15%
            const bonusDuration = 120 * 1000; // 2 minuty czasu RZECZYWISTEGO

            activePlayerBankBonuses.push({
                bankId: offeringBank.ownerId,
                type: 'loan',
                value: discountPercentage, // Wartość zniżki (np. 0.1 dla 10%)
                expiryTime: Date.now() + bonusDuration
            });
            // Informacja dla gracza (już jest w message, ale można dodać log)
            logEvent(`[Festyn Bank] Otrzymano ofertę zniżki ${Math.round(discountPercentage*100)}% na kredyt w ${offeringBank.ownerName}.`);
        }
    },
    {
        id: 'fest_bank_deposit_bonus',
        rarity: 0.15, // Dość częste, jeśli są banki
        message: (bankName) => `💰 Bonus depozytowy od ${bankName}! Złóż *nowy* depozyt w ciągu 2 minut, a otrzymasz +${getRandomInRange(0.5, 1.5).toFixed(1)}% do standardowego oprocentowania przez rok!`,
        condition: (participant) => {
            // Warunek: Gracz uczestniczy ORAZ na festynie jest co najmniej jeden bank
            return festival.participants.some(p => p.isBank === true);
        },
        effect: (participant) => {
            const participatingBanks = festival.participants.filter(p => p.isBank === true);
            if (participatingBanks.length === 0) return;
            const offeringBank = getRandomElement(participatingBanks);
            const bonusPercentagePoint = getRandomInRange(0.005, 0.015); // Bonus 0.5-1.5 punktu procentowego
            const bonusDuration = 120 * 1000;

            activePlayerBankBonuses.push({
                bankId: offeringBank.ownerId,
                type: 'deposit',
                value: bonusPercentagePoint, // Wartość bonusu (np. 0.01 dla +1%)
                expiryTime: Date.now() + bonusDuration
            });
            logEvent(`[Festyn Bank] Otrzymano ofertę bonusu +${(bonusPercentagePoint*100).toFixed(1)}% do depozytu w ${offeringBank.ownerName}.`);
        }
    }
];

/**
* Losuje i uruchamia zdarzenie dla gracza uczestniczącego w festynie.
*/
function triggerFestivalPlayerEvent() {
    if (!festival || !festival.isActive) return;

    const playerParticipant = festival.participants.find(p => p.ownerId === 'player');
    if (!playerParticipant) return;

    const possibleEvents = festivalPlayerEvents.filter(event => {
        if (event.condition && !event.condition(playerParticipant)) return false;
        // Sprawdź rzadkość (można dostosować)
        const adjustedRarity = event.rarity * (festival.tier || 1); // Rzadsze eventy częściej na większych festynach
        return Math.random() < adjustedRarity;
    });

    if (possibleEvents.length === 0) {
        // Jeśli nie wylosowano rzadkiego eventu, spróbuj wylosować bardziej powszechny
        const commonEvents = festivalPlayerEvents.filter(e => e.rarity > 0.15 && (!e.condition || e.condition(playerParticipant)));
        if (commonEvents.length === 0 || Math.random() > 0.1) return; // 10% szansy na zwykły event
        
        const chosenEvent = getRandomElement(commonEvents);
        triggerSingleFestivalEvent(chosenEvent, playerParticipant);
    } else {
        // Wylosuj jedno zdarzenie spośród możliwych rzadkich
        const chosenEvent = getRandomElement(possibleEvents);
        triggerSingleFestivalEvent(chosenEvent, playerParticipant);
    }
}

// Funkcja pomocnicza do wywołania eventu festynowego
function triggerEvent(chosenEvent, playerParticipant) {
    let targetName = 'Twoja Działalność';
    const target = playerParticipant.promotionTarget;
    if (target.type === 'company') {
        const stock = stocks.find(s => s.symbol === target.id);
        if (stock) targetName = stock.name;
    } else if (target.type === 'player_company' && playerCompany) {
        targetName = playerCompany.name;
    } else if (target.type === 'city') {
        targetName = 'Miasto Gdańsk';
    }

    const message = chosenEvent.message(targetName);
    logEvent(`[FESTYN] ${message}`, 'review');
    showToast(message, 'default', 6000);

    chosenEvent.effect(playerParticipant);

    // Odśwież widok festynu, jeśli jest otwarty
    const modal = document.getElementById('city-investment-modal');
    if (modal && modal.style.display === 'block') {
        updateCityModalContent(); // Użyj głównej funkcji aktualizującej
    }
}

function triggerSingleFestivalEvent(chosenEvent, playerParticipant) {
    let targetName = 'Twoja Działalność'; // Domyślnie
    let bankNameForMessage = ''; // Nazwa banku dla eventów bankowych

    // Ustal targetName (bez zmian)
    const target = playerParticipant.promotionTarget;
    if (target.type === 'company') {
        const stock = stocks.find(s => s.symbol === target.id);
        if (stock) targetName = stock.name;
    } else if (target.type === 'player_company' && playerCompany) {
        targetName = playerCompany.name;
    } else if (target.type === 'city') {
        targetName = 'Miasto Gdańsk';
    }

    // Jeśli to event bankowy, znajdź nazwę banku dla wiadomości
    if (chosenEvent.id.startsWith('fest_bank_')) {
        const participatingBanks = festival.participants.filter(p => p.isBank === true);
        if(participatingBanks.length > 0) {
            // Wybierz losowy bank z uczestniczących DO WIADOMOŚCI
            // UWAGA: Efekt może dotyczyć innego banku (wybranego w `effect`)
             bankNameForMessage = getRandomElement(participatingBanks).ownerName || "jednego z banków";
        } else {
            bankNameForMessage = "jednego z banków"; // Zapasowe
        }
    }

    // Wygeneruj wiadomość, przekazując odpowiednią nazwę
    const message = chosenEvent.message(chosenEvent.id.startsWith('fest_bank_') ? bankNameForMessage : targetName);
    logEvent(`[FESTYN] ${message}`, 'review');
    showToast(message, 'default', 7000); // Wydłużony czas dla ofert

    // Wywołaj efekt
    chosenEvent.effect(playerParticipant);

    // Odśwież widok festynu (bez zmian)
    const modal = document.getElementById('city-investment-modal');
    if (modal && modal.style.display === 'block') {
        updateCityModalContent();
    }
}



function triggerCeoEvent() {
    // Wybierz losową spółkę giełdową (nie startup, nie REIT, nie bankrut)
    const potentialTargets = stocks.filter(s => !s.assetType && !s.isBankrupt && s.ceo);
    if (potentialTargets.length === 0) return;

    const targetStock = getRandomElement(potentialTargets);
    const ceo = targetStock.ceo;
    let eventTriggered = false;

    // Zdarzenia zależne od cech (przykłady)
    if (ceo.traits.some(t => t.id === 'skompromitowany') && Math.random() < 0.2) {
        // Skompromitowany prezes wywołuje skandal
        const magnitude = getRandomInRange(-0.05, -0.15);
        displayEventMessage(`🚨 Skandal wokół prezesa ${targetStock.name}! Jego przeszłość wraca jak bumerang.`, 45, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, 'negative', 'company');
        changeReputation('player', targetStock.symbol, -5); // Lekki spadek reputacji u gracza
        eventTriggered = true;
    } else if (ceo.traits.some(t => t.id === 'prowiec') && Math.random() < 0.15) {
        // PRowiec organizuje udaną konferencję
        const magnitude = getRandomInRange(0.03, 0.08);
        displayEventMessage(`🎙️ Prezes ${targetStock.name} błyszczy na konferencji prasowej, zyskując uznanie rynku.`, 30, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, 'positive', 'company');
        eventTriggered = true;
    } else if (ceo.traits.some(t => t.id === 'ryzykant') && Math.random() < 0.1) {
        // Ryzykant podejmuje kontrowersyjną decyzję
        const isGoodDecision = Math.random() < 0.4; // Tylko 40% szans, że to dobra decyzja
        const magnitude = getRandomInRange(0.05, 0.12) * (isGoodDecision ? 1 : -1);
        displayEventMessage(`🎲 Prezes-ryzykant ${targetStock.name} podejmuje śmiałą, ale kontrowersyjną decyzję strategiczną...`, 40, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, isGoodDecision ? 'positive' : 'negative', 'company');
         eventTriggered = true;
    }

    // Ogólne, losowe zdarzenia CEO (jeśli żadne specyficzne nie wystąpiło)
    if (!eventTriggered && Math.random() < 0.15) { // 15% szans na ogólne zdarzenie
        const roll = Math.random();
        if (roll < 0.3) {
            // Pozytywne (np. nagroda branżowa)
            const magnitude = getRandomInRange(0.02, 0.05);
            displayEventMessage(`🏆 Prezes ${targetStock.name} otrzymuje prestiżową nagrodę branżową!`, 25, magnitude, 'company');
            applyPriceEffect(targetStock.symbol, magnitude, 'positive', 'company');
        } else if (roll < 0.6) {
            // Neutralne (np. zmiana w zarządzie niższego szczebla)
            displayEventMessage(`👥 Drobne przetasowania w zarządzie ${targetStock.name}. Rynek obserwuje.`, 20, null, 'company');
        } else {
            // Negatywne (np. problemy zdrowotne prezesa - plotki)
            const magnitude = getRandomInRange(-0.03, -0.06);
            displayEventMessage(` rumors O ${targetStock.name} krążą plotki o problemach zdrowotnych prezesa...`, 35, magnitude, 'company');
            applyPriceEffect(targetStock.symbol, magnitude, 'negative', 'company');
        }
    }
}

/**
 * Losuje i uruchamia zdarzenia półroczne (niekoniecznie związane z CEO).
 * Wywoływane co dwa kwartały.
 */
function triggerSemiAnnualEvents() {
    // Tutaj można dodać logikę dla zdarzeń, które mają sens co pół roku
    // np. przeglądy regulacyjne, sezonowe wahania popytu w niektórych branżach

    if (Math.random() < 0.1) { // 10% szans na wydarzenie półroczne
        const roll = Math.random();
        if (roll < 0.5) {
             // Przykład: Półroczny przegląd regulacji (lekki wpływ na losowy sektor)
             const sectors = ['Bankowość', 'Energia', 'Chemia', 'Medycyna'];
             const targetSector = getRandomElement(sectors);
             const magnitude = getRandomInRange(-0.02, 0.02); // Mały, losowy wpływ
             const type = magnitude >= 0 ? 'positive' : 'negative';
             displayEventMessage(`📑 Półroczny przegląd regulacji w sektorze '${targetSector}'. Inwestorzy analizują potencjalne zmiany.`, 30, magnitude, 'market');
             stocks.filter(s => s.sector.includes(targetSector)).forEach(stock => {
                 applyPriceEffect(stock.symbol, magnitude, type, 'market');
             });
        } else {
            // Przykład: Sezonowe wahania (np. lepsze wyniki turystyki latem) - uproszczone
             if (Math.random() < 0.3) { // Szansa na sezonowy boost
                const targetSector = 'Turystyka';
                const magnitude = getRandomInRange(0.03, 0.07);
                 displayEventMessage(`☀️ Sezon urlopowy w pełni! Spółki z sektora '${targetSector}' liczą zyski.`, 40, magnitude, 'market');
                 stocks.filter(s => s.sector.includes(targetSector)).forEach(stock => {
                     applyPriceEffect(stock.symbol, magnitude, 'positive', 'market');
                 });
             }
        }
    }
     // Można dodać więcej zdarzeń półrocznych
}


/**
 * Losuje i uruchamia zdarzenia związane z prezesami (CEO), które mają sens raz w roku.
 * Dotyczy głównie wieku, stażu, rocznych ocen. Wywoływane co rok.
 */
function triggerYearlyCeoEvents() {
    console.log("[ZDARZENIA ROCZNE CEO] Uruchomiono cykl roczny...");

    stocks.forEach(stock => {
        if (!stock.assetType && !stock.isBankrupt && stock.ceo) {
            const ceo = stock.ceo;
            let eventTriggered = false; // Flaga, czy już coś się stało dla tego CEO w tym roku

            // 1. Sprawdzenie emerytury
            const retirementAge = 68 + getRandomIntInRange(-3, 5); // Wiek emerytalny między 65 a 73
            if (ceo.age >= retirementAge && Math.random() < 0.4) { // 40% szans na emeryturę po osiągnięciu wieku
                logEvent(`👋 Prezes ${stock.name}, ${ceo.name}, przechodzi na zasłużoną emeryturę w wieku ${ceo.age} lat.`, 'review');
                replaceCeo(stock); // Wygeneruj nowego, losowego prezesa
                eventTriggered = true;
                return; // Przejdź do następnej spółki
            }

            // 2. Roczna ocena wyników (jeśli nie było emerytury)
            if (!eventTriggered) {
                 const health = stock.financialHealth;
                 if (health >= 4 && Math.random() < 0.3) {
                     // Bardzo dobre wyniki -> bonus dla CEO (pozytywny wpływ)
                     const magnitude = getRandomInRange(0.02, 0.04);
                     displayEventMessage(`💰 Roczny bonus dla prezesa ${stock.name} za doskonałe wyniki! Akcjonariusze są zadowoleni.`, 20, magnitude, 'company');
                     applyPriceEffect(stock.symbol, magnitude, 'positive', 'company');
                     eventTriggered = true;
                 } else if (health <= -4 && Math.random() < 0.35) {
                     // Bardzo słabe wyniki -> presja na CEO (negatywny wpływ, zwiększona szansa na zwolnienie w przyszłości)
                     const magnitude = getRandomInRange(-0.03, -0.05);
                     displayEventMessage(`📉 Rada nadzorcza ${stock.name} wywiera presję na prezesa po katastrofalnym roku...`, 30, magnitude, 'company');
                     applyPriceEffect(stock.symbol, magnitude, 'negative', 'company');
                     // Można by tu dodać ukrytą flagę zwiększającą szansę na wymuszone odejście w `triggerCeoEvent`
                     eventTriggered = true;
                 }
            }

             // 3. Zdarzenia roczne związane z cechami (jeśli nic innego się nie stało)
            if (!eventTriggered && Math.random() < 0.1) { // Mniejsza szansa na zdarzenie związane z cechą
                 if (ceo.traits.some(t => t.id === 'wizjoner')) {
                     displayEventMessage(`🚀 Prezes ${stock.name} przedstawia nową, długoterminową wizję rozwoju firmy! Inwestorzy są zaintrygowani.`, 30, 0.02, 'company');
                     applyPriceEffect(stock.symbol, 0.02, 'positive', 'company');
                 } else if (ceo.traits.some(t => t.id === 'ekspansjonista')) {
                      // Tutaj można dodać np. ogłoszenie planów przejęcia innej (losowej, mniejszej) firmy
                      displayEventMessage(`🗺️ ${stock.name}, pod wodzą prezesa-ekspansjonisty, ogłasza plany rozwoju na nowych rynkach.`, 25, null, 'company');
                 }
                 // Można dodać więcej specyficznych zdarzeń rocznych dla innych cech
             }
        }
    });
}

function triggerTBillAuctionEvent() {
    if (currentTBillAuction) {
        console.log("[Aukcja Bonów] Próba uruchomienia nowej aukcji, ale poprzednia wciąż trwa.");
        return;
    }
    const quantity = getRandomIntInRange(50, 250);
    const auctionDurationMinutes = 2;
    const auctionEndTime = Date.now() + (auctionDurationMinutes * 60 * 1000 / currentSpeedMultiplier);
    currentTBillAuction = {
        quantityAvailable: quantity,
        endTime: auctionEndTime,
        bids: []
    };
    logEvent(`🔔 Bank Centralny ogłasza aukcję ${quantity} bonów skarbowych! Aukcja trwa ${auctionDurationMinutes} min.`, 'market');
    showToast(`🔔 Ogłoszono aukcję bonów skarbowych! Sprawdź Bank Centralny.`, 'default', 10000);
    
    // setTimeout(resolveTBillAuction, delay); // Usunięte - rozstrzygnięcie w pętli main.js
    
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

function triggerBankIPOEvent() {
    if (currentBankIPOOffer) {
        console.log("[Event IPO Banku] Próba uruchomienia nowej oferty, ale poprzednia jest aktywna.");
        return;
    }
    const inactiveBanks = commercialBanks.filter(b => !b.isActive);
    if (inactiveBanks.length === 0) return;
    const bankToIPO = getRandomElement(inactiveBanks);
    const ipoValuation = bankToIPO.initialCapital * getRandomInRange(1.1, 1.5);
    const ipoSharePrice = getRandomInRange(50, 150);
    const ipoTotalShares = Math.floor(ipoValuation / ipoSharePrice);
    if (ipoTotalShares <= 0) {
        console.error(`[Event IPO Banku] Obliczona liczba akcji (${ipoTotalShares}) jest nieprawidłowa dla ${bankToIPO.name}. Anulowanie eventu.`);
        return;
    }
    const sharesOfferedToPlayer = Math.floor(ipoTotalShares * 0.05);
    const offerPrice = ipoSharePrice * 0.9;
    const offerCost = sharesOfferedToPlayer * offerPrice;

    currentBankIPOOffer = {
        bank: bankToIPO,
        symbol: `BK${bankToIPO.id.toUpperCase()}`,
        ipoSharePrice: ipoSharePrice,
        ipoTotalShares: ipoTotalShares,
        sharesOffered: sharesOfferedToPlayer,
        offerPrice: offerPrice,
        offerCost: offerCost
    };

    const message = `Nowy bank "${bankToIPO.name}" (${bankToIPO.type}) wchodzi na giełdę!<br><br>
                     Oferujemy Ci możliwość zakupu <strong>${sharesOfferedToPlayer}</strong> akcji (5% udziałów)
                     po preferencyjnej cenie <strong>${offerPrice.toFixed(2)} PLN</strong>
                     (całkowity koszt: <strong>${offerCost.toFixed(2)} PLN</strong>) przed oficjalnym debiutem.<br><br>
                     Czy chcesz skorzystać z oferty?`;
    openBankIPOOfferModal(message);
}

function resolveBankIPO(decision) {
    if (!currentBankIPOOffer) return;
    const offer = currentBankIPOOffer;
    const bankToIPO = offer.bank;
    let playerBoughtShares = 0;

    if (decision === 'accept') {
        if (playerCash >= offer.offerCost) {
            playerCash -= offer.offerCost;
            if (playerPortfolio[offer.symbol]) {
                playerPortfolio[offer.symbol].shares += offer.sharesOffered;
            } else {
                playerPortfolio[offer.symbol] = { shares: offer.sharesOffered, avgPrice: offer.offerPrice, assetType: 'stock' };
            }
            playerBoughtShares = offer.sharesOffered;
            logEvent(`✅ Skorzystałeś z oferty IPO i nabyłeś ${offer.sharesOffered} akcji banku ${bankToIPO.name}.`, 'success');
            displayCash();
            displayPortfolio();
        } else {
            alert("Nie masz wystarczająco środków, aby skorzystać z tej oferty IPO.");
            logEvent(`❌ Chciałeś skorzystać z oferty IPO banku ${bankToIPO.name}, ale zabrakło środków.`, 'review');
        }
    } else {
        logEvent(`Odrzuciłeś ofertę udziału w IPO banku ${bankToIPO.name}.`, 'review');
    }

    bankToIPO.isActive = true;
    const newBankStock = {
        name: bankToIPO.name,
        symbol: offer.symbol,
        price: offer.ipoSharePrice,
        volatilityFactor: getRandomInRange(0.5, 1.5),
        exchange: 'SILVER',
        totalShares: offer.ipoTotalShares,
        maxShares: offer.ipoTotalShares * 2,
        sharesHeld: playerBoughtShares,
        sector: ['Bankowość Komercyjna', 'Finanse'],
        financialHealth: 2,
        balanceSheet: {
            assets: bankToIPO.cash + offer.ipoTotalShares * offer.ipoSharePrice * 0.2,
            liabilities: offer.ipoTotalShares * offer.ipoSharePrice * 0.2,
            shareCapital: offer.ipoTotalShares * offer.ipoSharePrice * 0.1,
            retainedEarnings: bankToIPO.cash - offer.ipoTotalShares * offer.ipoSharePrice * 0.1
        },
        quarterlyEarnings: 0,
        bankAccountId: null,
        cash: bankToIPO.cash,
        descriptionParts: null,
        ceo: null,
        isBankStock: true,
        bankData: { id: bankToIPO.id, type: bankToIPO.type }
    };
    initializeDescriptionParts(newBankStock);
    generateCEO(newBankStock);
    stocks.push(newBankStock);

    logEvent(`📈 Bank ${bankToIPO.name} (${offer.symbol}) debiutuje na Srebrnej Giełdzie!`, 'market');
    currentBankIPOOffer = null;
    closeBankIPOOfferModal();
    displayStocks(getCurrentInputValues());
    renderCommercialBanksList();
}

const bankingSectorEventsPrompts = [
    // Pozytywne
    { id: 'bank_pos_1', message: bankName => `✅ Regulacje złagodzone! ${bankName} i inne banki komercyjne mają teraz większą swobodę w akcji kredytowej.`, type: 'positive' },
    { id: 'bank_pos_2', message: bankName => `💡 Innowacja w ${bankName}! Nowa aplikacja mobilna przyciąga tysiące nowych klientów.`, type: 'positive' },
    { id: 'bank_pos_3', message: bankName => `⭐ ${bankName} otrzymuje międzynarodową nagrodę za stabilność finansową.`, type: 'positive' },
    // Negatywne
    { id: 'bank_neg_1', message: bankName => `🚨 Skandal w ${bankName}! Wyciekły dane klientów, reputacja banku spada.`, type: 'negative' },
    { id: 'bank_neg_2', message: bankName => `⚖️ Nowe, restrykcyjne regulacje Banku Centralnego uderzają w rentowność ${bankName} i innych banków.`, type: 'negative' },
    { id: 'bank_neg_3', message: bankName => `📉 ${bankName} publikuje gorsze od oczekiwań wyniki finansowe z powodu rosnących rezerw na złe kredyty.`, type: 'negative' },
];

const governmentInterventions = [
    {
        id: 'infra_boost',
        name: "Program Budowy Infrastruktury",
        minBudget: 10000000, // Minimalny budżet państwa do uruchomienia
        costFactor: 0.1, // Wyda 10% budżetu
        targetSectors: ['Przemysł', 'Nieruchomości'],
        effectMagnitude: 0.05, // +5% boost dla spółek z tych sektorów
        message: () => `🏗️ Rząd ogłasza wielki program inwestycji infrastrukturalnych! Sektory Przemysł i Nieruchomości zyskują.`
    },
    {
        id: 'rnd_grants',
        name: "Granty na Innowacje",
        minBudget: 5000000,
        costFactor: 0.05,
        effect: (spentAmount) => {
            // Przyspiesz badania we wszystkich spółkach proporcjonalnie do wydanej kwoty
            const progressBoost = spentAmount / 1000; // 1000 PLN = 1 punkt postępu
            stocks.forEach(s => {
                if (s.research && s.research.isResearching) {
                    s.research.progress += progressBoost * getRandomInRange(0.5, 1.5);
                }
            });
        },
        message: () => `💡 Rząd przyznaje granty na badania i rozwój! Innowacyjne projekty nabierają tempa.`
    },
    {
        id: 'market_support',
        name: "Interwencyjny Skup Akcji",
        minBudget: 15000000,
        costFactor: 0.15,
        effectMagnitude: 0.02, // +2% boost dla CAŁEGO rynku
        message: () => `📈 Państwowy fundusz inwestycyjny wchodzi na giełdę! Interwencyjny skup akcji poprawia nastroje na całym rynku.`
    },
    {
        id: 'bailout',
        name: "Koło Ratunkowe od Rządu",
        minBudget: 8000000,
        costFactor: 0.08,
        effect: (spentAmount) => {
            // Znajdź spółkę na granicy bankructwa (ale jeszcze nie bankruta)
            const targets = stocks.filter(s => !s.assetType && !s.isBankrupt && s.financialHealth <= -4);
            if (targets.length > 0) {
                const target = getRandomElement(targets);
                target.financialHealth = 0; // Uratuj kondycję
                target.cash += spentAmount; // Daj zastrzyk gotówki
                if(target.bankAccountId) { // Dodaj kasę też do banku firmy
                    const bank = commercialBanks.find(b => b.id === target.bankAccountId);
                    if(bank) bank.cash += spentAmount;
                }
                applyPriceEffect(target.symbol, 0.10, 'positive'); // Boost ceny
                logEvent(`🆘 Rząd ratuje ${target.name} przed bankructwem kwotą ${spentAmount.toLocaleString()} PLN!`);
                showToast(`Rządowa pomoc dla ${target.name}!`, 'success');
            } else {
                 logEvent(`ℹ️ Rząd planował koło ratunkowe, ale żadna spółka nie była na skraju upadku.`);
                 governmentTreasury += spentAmount; // Zwróć pieniądze do budżetu
            }
        },
        message: () => `🆘 Rząd uruchamia program ratunkowy dla spółek w najtrudniejszej sytuacji!` // Wiadomość ogólna
    },
    {
        id: 'interest_rate_cut', // Obniżka stóp procentowych
        name: "Obniżka Stóp Procentowych",
        minBudget: 1000000, // Niewielki koszt "administracyjny"
        costFactor: 0.01,
        effect: () => {
            const change = -0.005 * getRandomInRange(0.5, 1.5); // Obniżka o 0.25-0.75 pp
            centralBank.baseInterestRate = Math.max(0.005, centralBank.baseInterestRate + change);
            updateInterestRates(); // Zastosuj zmianę
            logEvent(`💰 Rząd w porozumieniu z Bankiem Centralnym obniża stopy procentowe, by pobudzić gospodarkę! Nowa stopa bazowa: ${(centralBank.baseInterestRate * 100).toFixed(1)}%.`);
        },
        message: () => `💰 Rząd decyduje się na stymulację gospodarki przez obniżkę stóp procentowych!`
    },
    // Przykładowe eventy sektorowe (dodaj po 2 dla każdego sektora)
    {
        id: 'sector_boost_food',
        name: "Program 'Zdrowa Żywność'",
        minBudget: 3000000, costFactor: 0.04, targetSectors: ['Żywność'], effectMagnitude: 0.04,
        message: () => `🍎 Rządowy program promocji zdrowej żywności wspiera producentów z sektora Żywność.`
    },
    {
        id: 'sector_boost_tech',
        name: "Ulgi Podatkowe dla IT",
        minBudget: 4000000, costFactor: 0.06, targetSectors: ['Technologia'], effectMagnitude: 0.06,
        message: () => `💻 Nowe ulgi podatkowe dla firm technologicznych! Sektor IT zyskuje.`
    },
    // ... Dodaj więcej interwencji dla innych sektorów ...
];

/**
 * Losowo wybiera i uruchamia interwencję rządową, jeśli budżet na to pozwala.
 */
function triggerGovernmentSpendingEvent() {
    // console.log("[Rząd] Sprawdzanie możliwości interwencji..."); // Opcjonalny log

    // Filtruj interwencje, na które stać państwo
    const possibleInterventions = governmentInterventions.filter(inv => governmentTreasury >= inv.minBudget);

    if (possibleInterventions.length === 0) {
        // console.log("[Rząd] Budżet zbyt mały na interwencje."); // Opcjonalny log
        return;
    }

    // Wybierz losową interwencję spośród możliwych
    const intervention = getRandomElement(possibleInterventions);
    const cost = governmentTreasury * intervention.costFactor; // Oblicz koszt

    // Odejmij koszt z budżetu państwa
    governmentTreasury -= cost;

    logEvent(`🏛️ ${intervention.message()}`, 'state'); // Zaloguj główne przesłanie interwencji
    showToast(`Interwencja Rządowa: ${intervention.name}`, 'default', 6000);

    // Zastosuj efekt interwencji
    if (intervention.effectMagnitude) {
        // Efekt procentowy na cały rynek lub wybrane sektory
        const targets = intervention.targetSectors
            ? stocks.filter(s => !s.assetType && !s.isBankrupt && s.sector.some(sec => intervention.targetSectors.includes(sec)))
            : stocks.filter(s => !s.assetType && !s.isBankrupt); // Cały rynek

        targets.forEach(stock => {
            applyPriceEffect(stock.symbol, intervention.effectMagnitude, 'positive', 'state');
        });
    } else if (intervention.effect) {
        // Efekt specjalny zdefiniowany w funkcji
        intervention.effect(cost); // Przekaż wydaną kwotę do funkcji efektu
    }

    // Zaktualizuj widok modala Państwo, jeśli jest otwarty
    if (document.getElementById('state-modal')?.style.display === 'block') {
         if (typeof updateStateModalContent === 'function') updateStateModalContent();
    }
}