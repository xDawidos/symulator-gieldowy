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

const companySpecificEventsPrompts = [
    // Pozytywne
    { id: 'cs_pos_1', message: stockName => `${stockName} ogłasza przełomową technologię! 🚀 Inwestorzy w euforii, a konkurenci płaczą w poduszkę. 😭`, type: 'positive', category: 'company' }, { id: 'cs_pos_2', message: stockName => `Niespodziewanie dobre wyniki finansowe ${stockName}! 💰 Analitycy drapią się w głowy, jak to możliwe. 🤔`, type: 'positive', category: 'company' }, { id: 'cs_pos_3', message: stockName => `Plotki o przejęciu ${stockName} przez tajemniczego szejka z Dubaju. Akcje szybują jak jastrząb na pustyni. 🐪💨📈`, type: 'positive', category: 'company' },
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
    { id: 'cs_neg_13', message: stockName => `${stockName} próbowało zaoszczędzić na tuszu do drukarek, drukując raporty roczne sokiem z buraków.  beetroot📜 Nieczytelne, tak jak przyszłość firmy.`, type: 'negative', category: 'company' },
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
    { id: 'mw_neg_7', message: () => `Meteorolodzy zapowiadają miesiąc bez słońca nad głównymi centrami finansowymi. 🌧️ảm Depresja na rynkach.`, type: 'negative', category: 'market' },
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

    if (Math.random() < 0.02) {
        triggerBankIPOEvent();
        return; // Zakończ cykl
    }

    if (Math.random() < 0.03) { // Dajemy 3% szans na to zdarzenie w każdym cyklu
        triggerHostileTakeoverEvent();
        return; // Jeśli wystąpi wrogie przejęcie, nie losujemy już innych eventów w tej turze
    }

    if (Math.random() < 0.05) {
        triggerTBillAuctionEvent();
        return; // Zakończ cykl, jeśli uruchomiono aukcję
    }

    if (isSkillUnlocked('startupInvestor') && Math.random() < 0.04) { // 4% szansy, jeśli masz odblokowane start-upy
        triggerStartupOfferEvent();
        return; // Nie losuj innych eventów w tej turze
    }
    if (Math.random() < 0.03) { // Mniej niż 3% szansy
        triggerStatePrivatizationEvent();
        return;
    }
     // Bardzo mała szansa na nacjonalizację prywatnej firmy
    if (Math.random() < 0.02) { // 1% szansy
        triggerNationalizationEvent();
        return;
    }

     if (Math.random() < 0.04) { // Dajemy 4% szansy
        triggerRescueOfferingEvent();
        return;
    }
     // Szansa na zdarzenie losowe związane z R&D
    if (Math.random() < 0.05) { // 5% szans
        triggerResearchEvent();
        return;
    }


     if (Math.random() < 0.04) { 
        triggerRescueOfferingEvent();
        return;
    }

    if (Math.random() < 0.05) { // Dajemy 5% szansy
        triggerStartupFundingEvent();
        return;
    }

    if (Math.random() < 0.04) {
        const activeBankStocks = stocks.filter(s => s.sector.includes('Bankowość Komercyjna') && !s.isBankrupt);
        if (activeBankStocks.length > 0) {
            const targetBankStock = getRandomElement(activeBankStocks);
            const eventData = getRandomElement(bankingSectorEventsPrompts);
            const duration = getRandomIntInRange(20, 50);
            const magnitude = getRandomInRange(0.03, 0.08) * (eventData.type === 'positive' ? 1 : -1);

            // Wyświetl event i zastosuj efekt do WYLOSOWANEGO banku
            displayEventMessage(eventData.message(targetBankStock.name), duration, magnitude, 'company');
            applyPriceEffect(targetBankStock.symbol, magnitude, eventData.type, 'company');

            // Można dodać mniejszy efekt do pozostałych banków, jeśli event dotyczy regulacji
            if (eventData.id === 'bank_pos_1' || eventData.id === 'bank_neg_2') {
                 activeBankStocks.forEach(bankStock => {
                     if (bankStock.symbol !== targetBankStock.symbol) {
                         applyPriceEffect(bankStock.symbol, magnitude * 0.5, eventData.type, 'market'); // Mniejszy efekt
                     }
                 });
            }
            return; // Zakończ cykl
        }
    }

        const eventTypeRoll = Math.random();
    if (eventTypeRoll < 0.30) { // Było 0.25, teraz 25% szans (0.30 - 0.05)
        const eventData = getRandomElement(marketWideEventsPrompts);
        const duration = getRandomIntInRange(25, 75);
        const magnitude = getRandomInRange(0.03, 0.08) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(), duration, magnitude, 'market');
        stocks.forEach(stock => {
            applyPriceEffect(stock.symbol, magnitude, eventData.type, 'market');
        });
    } else if (eventTypeRoll < 0.60) { // Było 0.55, teraz 30% szans (0.60 - 0.30)
        const eventData = getRandomElement(sectorEventsPrompts);
        const duration = getRandomIntInRange(20, 60);
        const magnitude = getRandomInRange(0.05, 0.12) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(), duration, magnitude, 'market');
        const affectedStocks = stocks.filter(stock => stock.sector.some(s => eventData.targetSectors.includes(s)));
        affectedStocks.forEach(stock => {
            applyPriceEffect(stock.symbol, magnitude, eventData.type, 'market');
        });
    } else { // Reszta, czyli 40% szans
        const targetStock = getRandomElement(stocks);
        if (!targetStock) return;
        const eventData = getRandomElement(companySpecificEventsPrompts);
        const duration = getRandomIntInRange(15, 45);
        const magnitude = getRandomInRange(0.10, 0.25) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(targetStock.name), duration, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, eventData.type, 'company');
    }
}

function triggerDividendEventCycle() {
    if (Math.random() <= 0.025) {
        const ownedStocks = stocks.filter(s => s.sharesOwned > 0);
        if (ownedStocks.length > 0) {
            const stockForDividend = getRandomElement(ownedStocks);
            const totalDividend = (stockForDividend.price * 0.03) * stockForDividend.sharesOwned;
            if (totalDividend > 0) {
                playerCash += totalDividend;
                const message = `Dywidenda od ${stockForDividend.name}! Otrzymujesz ${totalDividend.toFixed(2)} PLN! 🤑`;
                displayEventMessage(message, 30, null, 'company');
                displayCash();
            }
        }
    }
}

// umiejętność 

function triggerSixthSenseEvent() {
    // 1. Losujemy spółkę i przyszłe zdarzenie (bez zmian)
    const targetStock = getRandomElement(stocks);
    if (!targetStock) return;

    const futureEvent = getRandomElement(companySpecificEventsPrompts);
    
    // --- POCZĄTEK ZMIANY ---

    // 2. Przygotowujemy wiadomość i wyświetlamy ją w nowym oknie modal
    const hunchMessage = `[SZÓSTY ZMYSŁ 💡] Masz silne przeczucie dotyczące ${targetStock.name} (${targetStock.symbol})... Wygląda na to, że coś się tam wydarzy.`;
    
    // Zapisujemy wiadomość w dzienniku, aby pozostał po niej ślad
    logEvent(hunchMessage); 

    // Wyświetlamy okienko modal
    const modal = document.getElementById('sixth-sense-modal');
    const modalMessage = document.getElementById('sixth-sense-message');
    if (modal && modalMessage) {
        modalMessage.textContent = `Masz silne przeczucie dotyczące ${targetStock.name} (${targetStock.symbol})... Coś wisi w powietrzu.`;
        modal.style.display = 'block';
    }
    
    // --- KONIEC ZMIANY ---

    // 3. Ustawiamy opóźnienie, po którym nastąpi właściwe zdarzenie (bez zmian)
    const delay = getRandomIntInRange(10, 20) * 1000;

    console.log(`[Umiejętność] Szósty Zmysł: Wylosowano zdarzenie dla ${targetStock.name}, które nastąpi za ${delay / 1000}s.`);

    setTimeout(() => {
        // 4. Po upływie opóźnienia, uruchamiamy właściwe zdarzenie (bez zmian)
        console.log(`[Umiejętność] Szósty Zmysł: Uruchamianie zdarzenia dla ${targetStock.name}!`);
        
        const magnitude = getRandomInRange(0.05, 0.35) * (futureEvent.type === 'positive' ? 1 : -1);
        
        // Wyświetl właściwy komunikat o zdarzeniu
        displayEventMessage(futureEvent.message(targetStock.name), 45, magnitude);
        
        // Zastosuj efekt cenowy
        applyPriceEffect(targetStock.symbol, magnitude);

        // Odśwież widok tabeli, aby pokazać zmianę ceny
        displayStocks(getCurrentInputValues());
        displayPortfolio();

    }, delay);
}

const premiumNewsPrompts = [
    // Plotki o firmach (niepewne)
    { 
        id: 'prem_pos_1', 
        message: stockName => `[PLOTKA] Dochodzą nas słuchy o możliwym przełomowym odkryciu w ${stockName}. Jeśli to prawda, kurs może wystrzelić.`,
        scope: 'company',
        type: 'positive',
        chanceToHappen: 0.70 // 70% szans, że event naprawdę się wydarzy
    },
    { 
        id: 'prem_neg_1', 
        message: stockName => `[PLOTKA] Krążą pogłoski o możliwym wycieku danych w ${stockName}. Zalecamy ostrożność.`,
        scope: 'company',
        type: 'negative',
        chanceToHappen: 0.70 // 70% szans
    },
    // Prognozy sektorowe (szersze, bardziej ogólne)
    { 
        id: 'prem_sec_pos_1', 
        message: sectorName => `[ANALIZA] Nasi analitycy przewidują nadchodzący boom w sektorze '${sectorName}'. Warto obserwować spółki z tej branży.`,
        scope: 'sector',
        targetSectors: ['Technologia', 'Usługi'], // Przykładowe sektory
        type: 'positive',
        chanceToHappen: 0.60 // 60% szans
    },
    { 
        id: 'prem_sec_neg_1', 
        message: sectorName => `[OSTRZEŻENIE] Spodziewamy się wprowadzenia nowych, niekorzystnych regulacji dla sektora '${sectorName}'. Może to wpłynąć na rentowność firm.`,
        scope: 'sector',
        targetSectors: ['Chemia', 'Przemysł'], // Przykładowe sektory
        type: 'negative',
        chanceToHappen: 0.60 // 60% szans
    }
];

function triggerStateCompanyEventCycle() {
    // POPRAWKA: Szansa na event wynosi teraz 10% (było 90%)
    if (Math.random() < 0.10) {
        const eventData = getRandomElement(stateCompanyEventsPrompts);
        const duration = getRandomIntInRange(30, 60);
        const magnitude = getRandomInRange(0.03, 0.08) * (eventData.type === 'positive' ? 1 : -1);

        // Dodajemy kategorię 'state' do eventu
        displayEventMessage(eventData.message(), duration, magnitude, 'state');

        const affectedStocks = stocks.filter(stock => stock.isStateOwned);
        
        affectedStocks.forEach(stock => {
            // Przekazujemy typ eventu do funkcji applyPriceEffect
            applyPriceEffect(stock.symbol, magnitude, eventData.type, 'state');
        });
    }
}

function triggerMergerAndAcquisitionEvent() {
    // Wybieramy dwie różne spółki: jedną dużą (przejmującą) i jedną małą (cel)
    const potentialAcquirers = stocks.filter(s => s.exchange === 'SILVER' || s.exchange === 'GOLD');
    const potentialTargets = stocks.filter(s => s.exchange === 'JUNK' || s.exchange === 'BRONZE');

    if (potentialAcquirers.length === 0 || potentialTargets.length === 0) {
        return; // Nie ma odpowiednich firm do przeprowadzenia M&A
    }

    const acquirer = getRandomElement(potentialAcquirers);
    let target = getRandomElement(potentialTargets);

    // Upewniamy się, że firmy nie są takie same
    while (acquirer.symbol === target.symbol) {
        target = getRandomElement(potentialTargets);
    }

    // 1. OGŁOSZENIE PLOTKI
    const initialPrice = target.price;
    const buyoutPremium = getRandomInRange(0.3, 0.6); // Premia 30-60% ponad aktualną cenę
    const buyoutPrice = initialPrice * (1 + buyoutPremium);

    const message = `[PLOTKA O PRZEJĘCIU] 📰 Słyszy się, że gigant ${acquirer.name} (${acquirer.symbol}) jest zainteresowany kupnem ${target.name} (${target.symbol})! Cena akcji celu szybuje w górę!`;
    logEvent(message, 'market');
    
    // Cena akcji celu od razu rośnie w reakcji na plotkę
    applyPriceEffect(target.symbol, buyoutPremium * 0.5); // Wstępny skok ceny o połowę premii

    // 2. FINALIZACJA PO OKREŚLONYM CZASIE
    const finalizationDelay = getRandomInRange(60, 120) * 1000; // Finalizacja po 60-120 sekundach

    setTimeout(() => {
        // Sprawdzamy, czy spółka-cel nadal istnieje (na wypadek, gdyby w międzyczasie zbankrutowała)
        const currentTargetStock = stocks.find(s => s.symbol === target.symbol);
        if (!currentTargetStock) return;

        logEvent(`[OFICJALNIE] Przejęcie stało się faktem! ${acquirer.name} wchłania ${target.name} po ostatecznej cenie ${buyoutPrice.toFixed(2)} PLN za akcję!`, 'review');

        // Płacimy graczowi za jego akcje
        if (playerPortfolio[target.symbol]) {
            const holding = playerPortfolio[target.symbol];
            const cashGained = buyoutPrice * holding.shares;
            playerCash += cashGained;
            logEvent(`Otrzymałeś ${cashGained.toFixed(2)} PLN za swoje akcje ${target.name}.`);
            delete playerPortfolio[target.symbol];
        }

        // Płacimy botom za ich akcje
        aiCompetitors.forEach(ai => {
            if (ai.portfolio[target.symbol]) {
                const holding = ai.portfolio[target.symbol];
                const cashGained = buyoutPrice * holding.shares;
                ai.cash += cashGained;
                delete ai.portfolio[target.symbol];
            }
        });
        
        // USUWANIE SPÓŁKI Z RYNKU
        const stockIndex = stocks.findIndex(s => s.symbol === target.symbol);
        if (stockIndex > -1) {
            stocks.splice(stockIndex, 1);
        }

        // Odświeżamy widoki
        displayStocks(getCurrentInputValues());
        displayPortfolio();
        displayCash();

    }, finalizationDelay);
}

function handleTakeoverAcceptance(acquirer, target, buyoutPrice) {
    logEvent(`[RYNEK] PRZEJĘCIE STAŁO SIĘ FAKTEM! ${acquirer.name} wchłania ${target.name}!`, 'review');

    // 1. Wypłata pieniędzy dla wszystkich akcjonariuszy przejmowanej firmy
    // Sprawdź gracza
    if (playerPortfolio[target.symbol]) {
        const holding = playerPortfolio[target.symbol];
        const cashGained = buyoutPrice * holding.shares;
        playerCash += cashGained;
        logEvent(`[PRZEJĘCIE] Otrzymałeś ${cashGained.toFixed(2)} PLN za swoje akcje ${target.name}.`, 'review');
        delete playerPortfolio[target.symbol];
    }
    // Sprawdź boty
    aiCompetitors.forEach(ai => {
        if (ai.portfolio[target.symbol]) {
            const holding = ai.portfolio[target.symbol];
            const cashGained = buyoutPrice * holding.shares;
            ai.cash += cashGained;
            delete ai.portfolio[target.symbol];
        }
    });

    // 2. Zwiększenie wartości firmy przejmującej
    const acquirerStock = stocks.find(s => s.symbol === acquirer.symbol);
    if (acquirerStock) {
        const targetMarketValue = target.price * target.totalShares;
        const priceIncreasePerShare = targetMarketValue / acquirerStock.totalShares;
        acquirerStock.price += priceIncreasePerShare;
    }

    // 3. Usunięcie przejętej firmy z rynku
    stocks = stocks.filter(stock => stock.symbol !== target.symbol);

    // 4. Zamknij okno modalne, jeśli było otwarte
    document.getElementById('takeover-modal').style.display = 'none';
}

function handleTakeoverRejection(acquirer, target) {
    logEvent(`[RYNEK] WETO! Próba wrogiego przejęcia ${target.name} przez ${acquirer.name} nie powiodła się!`, 'review');

    // 1. Konsekwencje dla firmy, która się obroniła (cel)
    // Niepewność na rynku powoduje lekki spadek jej wartości.
    const targetPriceDrop = getRandomInRange(-0.01, -0.10); // Spadek o 1-10%
    applyPriceEffect(target.symbol, targetPriceDrop, 'negative', 'review');
    logEvent(`Niepewność po próbie przejęcia uderza w kurs ${target.name}.`, 'market');

    // 2. Konsekwencje dla firmy, której się nie udało (agresor)
    // Nieudana ekspansja to zła wiadomość dla inwestorów.
    const acquirerPriceDrop = getRandomInRange(-0.02, -0.05); // Spadek o 2-5%
    applyPriceEffect(acquirer.symbol, acquirerPriceDrop, 'negative', 'review');
    logEvent(`Inwestorzy negatywnie reagują na nieudaną próbę ekspansji ${acquirer.name}.`, 'market');
    
    // 3. Zamknij okno modalne, jeśli było otwarte
    document.getElementById('takeover-modal').style.display = 'none';
}

function triggerHostileTakeoverEvent() {
    const potentialAcquirers = stocks.filter(s =>
        s.assetType !== 'Startup' &&
        exchanges[s.exchange] &&
        exchanges[s.exchange].level >= 4 &&
        !s.isBankrupt
    );
    if (potentialAcquirers.length === 0) return;

    const potentialTargets = stocks.filter(s =>
        s.assetType !== 'Startup' &&
        exchanges[s.exchange] &&
        exchanges[s.exchange].level <= 2 &&
        !s.isBankrupt &&
        // --- POPRAWIONY WARUNEK ---
        !s.ceo?.traits?.some(t => t.id === 'imperator')
    );
    if (potentialTargets.length === 0) return;

    // Reszta funkcji pozostaje taka sama, jak w Twoim pliku
    potentialTargets.sort(() => 0.5 - Math.random());

    for (const target of potentialTargets) {
        const majorityOwner = findMajorityShareholder(target);

        if (majorityOwner) {
            const acquirer = getRandomElement(potentialAcquirers.filter(a => a.symbol !== target.symbol));
            if (!acquirer) continue;

            const buyoutPremium = getRandomInRange(0.3, 0.6);
            const buyoutPrice = target.price * (1 + buyoutPremium);

            console.log(`[EVENT] Wrogie przejęcie: ${acquirer.name} próbuje przejąć ${target.name}, którego właścicielem jest ${majorityOwner.owner.name}`);

            if (majorityOwner.type === 'player') {
                const modal = document.getElementById('takeover-modal');
                const message = document.getElementById('takeover-message');
                message.innerHTML = `Spółka <strong>${acquirer.name}</strong> złożyła ofertę wrogiego przejęcia Twojej firmy <strong>${target.name}</strong>! <br> Proponują <strong>${buyoutPrice.toFixed(2)} PLN</strong> za akcję. Co robisz?`;

                document.getElementById('accept-takeover-btn').onclick = () => handleTakeoverAcceptance(acquirer, target, buyoutPrice);
                document.getElementById('reject-takeover-btn').onclick = () => handleTakeoverRejection(acquirer, target);

                modal.style.display = 'block';

            } else if (majorityOwner.type === 'ai') {
                logEvent(`[RYNEK] Słyszy się, że ${acquirer.name} próbuje przejąć ${target.name}, kontrolowane przez ${majorityOwner.owner.name}!`, 'market');
                aiDecideOnTakeover(majorityOwner.owner, acquirer, target, buyoutPrice);
                console.log(`Bot ${majorityOwner.owner.name} musi podjąć decyzję...`);
            }

            return;
        }
    }
}


function findMajorityShareholder(stock) {
    const majorityThreshold = stock.totalShares * 0.5;

    // Sprawdź gracza
    const playerShares = playerPortfolio[stock.symbol] ? playerPortfolio[stock.symbol].shares : 0;
    if (playerShares > majorityThreshold) {
        return { owner: { name: 'Ty (Gracz)' }, type: 'player' };
    }

    // Sprawdź boty
    for (const ai of aiCompetitors) {
        const aiShares = ai.portfolio[stock.symbol] ? ai.portfolio[stock.symbol].shares : 0;
        if (aiShares > majorityThreshold) {
            return { owner: ai, type: 'ai' };
        }
    }

    return null; // Brak większościowego udziałowca
}

function triggerRescueOfferingEvent() {
    const potentialTargets = stocks.filter(s => {
        if (!s.corporateDebt || s.isBankrupt) return false;
        const marketValue = s.price * s.totalShares;
        return s.corporateDebt > (marketValue * 0.3);
    });

    if (potentialTargets.length === 0) return;

    const targetCompany = getRandomElement(potentialTargets);
    
    const promotionalPrice = targetCompany.price * (1 - getRandomInRange(0.15, 0.25));
    if (promotionalPrice <= 0) return;

    const sharesToIssue = Math.ceil(targetCompany.corporateDebt / promotionalPrice);
    if (sharesToIssue <= 0) return;

    logEvent(`[RYNEK] Spółka ${targetCompany.name} ogłasza "emisję ratunkową" (${sharesToIssue} akcji po ~${promotionalPrice.toFixed(2)} PLN), aby spłacić swoje długi!`, 'market');

    let totalCashRaised = 0;
    let totalSharesBought = 0;

    // --- ETAP 1: Runda dla Botów AI ---
    aiCompetitors.forEach(ai => {
        const aiShares = ai.portfolio[targetCompany.symbol]?.shares || 0;
        if (aiShares > 0) {
            const aiOwnershipPct = aiShares / targetCompany.totalShares;
            const sharesOfferedToAI = Math.floor(sharesToIssue * aiOwnershipPct);
            
            if (sharesOfferedToAI > 0) {
                const aiOfferDetails = {
                    targetCompany: targetCompany,
                    sharesOffered: sharesOfferedToAI,
                    promotionalPrice: promotionalPrice,
                    totalCost: sharesOfferedToAI * promotionalPrice
                };
                const sharesAiBought = aiDecideOnRescueOffer(ai, aiOfferDetails);
                if (sharesAiBought > 0) {
                    totalSharesBought += sharesAiBought;
                    totalCashRaised += sharesAiBought * promotionalPrice;
                }
            }
        }
    });

    // --- ETAP 2: Runda dla Gracza ---
    const playerShares = playerPortfolio[targetCompany.symbol]?.shares || 0;
    if (playerShares > 0) {
        const playerOwnershipPct = playerShares / targetCompany.totalShares;
        const sharesOfferedToPlayer = Math.floor(sharesToIssue * playerOwnershipPct);

        if (sharesOfferedToPlayer > 0) {
            const playerOfferDetails = {
                targetCompany: targetCompany,
                sharesOffered: sharesOfferedToPlayer,
                promotionalPrice: promotionalPrice,
                totalCost: sharesOfferedToPlayer * promotionalPrice,
                // Przekazujemy dalej informacje o tym, co już zrobiły boty, do finalizacji
                cashRaisedSoFar: totalCashRaised,
                sharesBoughtSoFar: totalSharesBought
            };
            openRescueOfferingModal(playerOfferDetails);
        } else {
            // Gracz ma za mało akcji, by dostać ofertę, więc od razu finalizujemy
            finalizeRescueOffering(targetCompany, totalCashRaised, totalSharesBought);
        }
    } else {
        // Gracz nie jest udziałowcem, więc od razu finalizujemy
        finalizeRescueOffering(targetCompany, totalCashRaised, totalSharesBought);
    }
}

function triggerStartupFundingEvent() {
    // 1. Znajdź potencjalne cele (start-upy, które wciąż zbierają fundusze)
    const targets = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding');
    if (targets.length === 0) return; // Jeśli nie ma takich start-upów, nic nie rób

    // 2. Wybierz losowy start-up
    const target = getRandomElement(targets);
    const originalGoal = target.fundingGoal;

    // 3. Wylosuj, czy zdarzenie jest pozytywne, czy negatywne
    if (Math.random() < 0.5) {
        // ZDARZENIE NEGATYWNE: Cel finansowy rośnie
        const increasePercent = getRandomInRange(0.15, 0.30); // Wzrost o 15-30%
        target.fundingGoal *= (1 + increasePercent);
        logEvent(`[START-UP] 🚨 Niespodziewane komplikacje w projekcie ${target.name}! Ich cel finansowy wzrósł z ${originalGoal.toLocaleString('pl-PL')} do ${target.fundingGoal.toLocaleString('pl-PL')} PLN!`, 'review');
    } else {
        // ZDARZENIE POZYTYWNE: Cel finansowy maleje
        const decreasePercent = getRandomInRange(0.10, 0.20); // Spadek o 10-20%
        target.fundingGoal *= (1 - decreasePercent);
        logEvent(`[START-UP] 🎉 Dobre wieści dla ${target.name}! Dzięki optymalizacji kosztów, ich cel finansowy zmalał z ${originalGoal.toLocaleString('pl-PL')} do ${target.fundingGoal.toLocaleString('pl-PL')} PLN!`, 'review');
    }
} 

const gamingStartupEvents = [
    // --- Pozytywne ---
    {
        name: "Zwiastun gry staje się viralem",
        type: 'positive',
        message: startupName => `📈 HYPE! Zwiastun gry ${startupName} podbija internet! Szansa na sukces rośnie.`,
        effect: (startup) => {
            startup.successChance += 0.10; // +10% do szansy na sukces
            startup.ipoPriceBonus += 15000; // Wartość przy debiucie rośnie o 15k
        }
    },
    {
        name: "Znany streamer zachwycony wczesną wersją",
        type: 'positive',
        message: startupName => `🎮 Ogromny rozgłos dla ${startupName}! Znany streamer jest zachwycony demem gry.`,
        effect: (startup) => {
            startup.successChance += 0.08; // +8% do szansy na sukces
            startup.ipoPriceBonus += 20000;
        }
    },
    {
        name: "Gra trafi do usługi abonamentowej w dniu premiery!",
        type: 'positive',
        message: startupName => `💰 Świetna wiadomość dla ${startupName}! Podpisano umowę z dużą platformą, co obniża koszty.`,
        effect: (startup) => {
            startup.fundingGoal *= 0.85; // Cel finansowy spada o 15%
            logEvent(`Cel finansowy ${startup.name} zmalał do ${startup.fundingGoal.toLocaleString('pl-PL')} PLN!`);
        }
    },
    {
        name: "Przełom w technologii - silnik graficzny zachwyca",
        type: 'positive',
        message: startupName => `🚀 Innowacja w ${startupName}! Ich silnik graficzny wyznacza nowe standardy.`,
        effect: (startup) => {
            startup.successChance += 0.12;
            startup.developmentProgress += 5; // Małe przyspieszenie prac
        }
    },
    {
        name: "Nagroda 'Best of Show' na targach branżowych",
        type: 'positive',
        message: startupName => `🏆 PRESTIŻ! ${startupName} zdobywa nagrodę 'Best of Show' na ważnych targach! Hype sięga zenitu.`,
        effect: (startup) => {
            startup.successChance += 0.15; // Duży bonus za prestiż
            startup.ipoPriceBonus += 25000;
        }
    },
    {
        name: "Niespodziewanie pozytywne opinie testerów",
        type: 'positive',
        message: startupName => `👍 Wygląda dobrze! Wewnętrzni testerzy ${startupName} chwalą grywalność i brak błędów.`,
        effect: (startup) => {
            startup.successChance += 0.07; // Solidny wzrost szansy na sukces, bo gra jest po prostu dobra
        }
    },
    {
        name: "Pozyskanie legendarnego kompozytora",
        type: 'positive',
        message: startupName => `🎶 Muzyczna legenda dołącza do ${startupName}! Ścieżka dźwiękowa przyciągnie fanów.`,
        effect: (startup) => {
            startup.successChance += 0.05;
            startup.ipoPriceBonus += 10000; // Nazwisko w zespole podnosi wartość
        }
    },
    // --- Negatywne ---
    {
        name: "Odejście głównego projektanta",
        type: 'negative',
        message: startupName => `🔥 KRYZYS w ${startupName}! Odszedł główny projektant, przyszłość projektu jest niepewna.`,
        effect: (startup) => {
            startup.successChance -= 0.15; // -15% do szansy na sukces
            startup.fundingGoal *= 1.10; // Koszty rosną o 10% na znalezienie zastępstwa
            logEvent(`Cel finansowy ${startup.name} wzrósł do ${startup.fundingGoal.toLocaleString('pl-PL')} PLN!`);
        }
    },
     {
        name: "Konflikt z wydawcą o monetyzację",
        type: 'negative',
        message: startupName => `😡 Konflikt w ${startupName}! Wydawca naciska na agresywne mikrotransakcje. Gracze będą wściekli.`,
        effect: (startup) => {
            startup.successChance -= 0.10;
            startup.volatilityFactor += 0.6; // Po premierze kurs będzie bardziej niestabilny z powodu kontrowersji
        }
    },
    {
        name: "Negatywny odbiór pierwszych gameplayów",
        type: 'negative',
        message: startupName => `👎 Słaby pokaz... Pierwsze fragmenty rozgrywki z ${startupName} zostały skrytykowane przez społeczność.`,
        effect: (startup) => {
            startup.successChance -= 0.12;
            startup.ipoPriceBonus -= 15000; // Zły PR obniża postrzeganą wartość
        }
    },
    {
        name: "'Scope creep' wymyka się spod kontroli",
        type: 'negative',
        message: startupName => `💸 Złe zarządzanie w ${startupName}! Projekt rozrósł się tak bardzo, że koszty rosną lawinowo.`,
        effect: (startup) => {
            startup.fundingGoal *= 1.20; // Cel finansowy rośnie o 20%
            startup.developmentProgress -= 5; // Dodatkowe funkcje cofają postęp prac
            if (startup.developmentProgress < 0) startup.developmentProgress = 0;
            logEvent(`Cel finansowy ${startup.name} wzrósł do ${startup.fundingGoal.toLocaleString('pl-PL')} PLN!`);
        }
    },
    {
        name: "Wykryto poważną lukę w zabezpieczeniach sieciowych",
        type: 'negative',
        message: startupName => `💻 ALARM w ${startupName}! Krytyczna luka w kodzie sieciowym zagraża trybowi multiplayer.`,
        effect: (startup) => {
            startup.successChance -= 0.08;
            startup.fundingGoal *= 1.15; // Koszty rosną o 15% na zatrudnienie ekspertów i naprawę
            logEvent(`Cel finansowy ${startup.name} wzrósł do ${startup.fundingGoal.toLocaleString('pl-PL')} PLN!`);
        }
    },
    {
        name: "Plaga bugów krytycznych wstrzymuje prace",
        type: 'negative',
        message: startupName => `🐞 Problemy w ${startupName}! Plaga bugów spowalnia produkcję.`,
        effect: (startup) => {
            startup.developmentProgress -= 10; // Prace cofają się o 10 punktów
            if (startup.developmentProgress < 0) startup.developmentProgress = 0;
            startup.successChance -= 0.05;
        }
    },
    {
        name: "Ogłoszenie opóźnienia premiery",
        type: 'negative',
        message: startupName => `⏳ ${startupName} oficjalnie opóźnia premierę. Inwestorzy i fani są rozczarowani.`,
        effect: (startup) => {
            startup.successChance -= 0.08;
            startup.ipoPriceBonus -= 10000; // Wartość przy debiucie spada
        }
    },
    {
        name: "Oskarżenia o 'crunch' i złe warunki pracy",
        type: 'negative',
        message: startupName => `📰 Zła prasa wokół ${startupName}! Pojawiają się oskarżenia o 'crunch', co uderza w reputację firmy.`,
        effect: (startup) => {
            startup.successChance -= 0.10;
            startup.volatilityFactor += 0.5; // Spółka będzie bardziej niestabilna po debiucie
        }
    }
];

function triggerGamingStartupEvent(startup) {
    if (!startup) return;

    // Losujemy event z naszej nowej tablicy
    const event = getRandomElement(gamingStartupEvents);

    // Wyświetlamy graczowi informację o tym, co się stało
    logEvent(event.message(startup.name), 'review');

    // Wywołujemy funkcję 'effect', która modyfikuje parametry start-upu
    event.effect(startup);

    console.log(`[EVENT GAMINGOWY] Uruchomiono "${event.name}" dla ${startup.name}.`);
}

function triggerStartupOfferEvent() {
    // 1. Znajdź start-upy, które mogą składać oferty
    const potentialTargets = stocks.filter(s => 
        s.assetType === 'Startup' && 
        s.stage === 'funding' && 
        !s.isPrivatized &&
        !playerPortfolio[s.symbol] // Oferta tylko dla start-upów, w które gracz jeszcze nie zainwestował
    );

    if (potentialTargets.length === 0) return;

    // 2. Wylosuj start-up i ofertę
    const targetStartup = getRandomElement(potentialTargets);
    const offer = getRandomElement(startupOfferEventsPrompts);

    // 3. Pokaż powiadomienie typu "toast"
    const toastMessage = offer.getMessage(targetStartup.name);
    showToast(toastMessage, 'default', 10000); // Wyświetlaj przez 10 sekund
    logEvent(toastMessage, 'review');

    // 4. Przygotuj szczegóły i otwórz modal (funkcję do UI dodamy w następnym kroku)
    const offerDetails = {
        startup: targetStartup,
        offer: offer
    };
    openStartupOfferModal(offerDetails);
}

function triggerStatePrivatizationEvent() {
    // 1. Znajdź potencjalne cele (tak jak wcześniej)
    const potentialTargets = stocks.filter(s => 
        s.isStateOwned &&
        (exchanges[s.exchange].level <= 1) &&
        s.financialHealth < -1
    );

    if (potentialTargets.length === 0) return;

    // 2. Wylosuj cel
    const target = getRandomElement(potentialTargets);

    // 3. Uruchom prywatyzację (usunięto warunek 'hasAnotherInSector')
    const sharesToRelease = Math.floor(target.totalShares * target.stateOwnershipPct);

    logEvent(`🏛️ PRYWATYZACJA! Z powodu słabych wyników, Skarb Państwa sprzedaje cały swój pakiet akcji w ${target.name}, uwalniając ${sharesToRelease.toLocaleString('pl-PL')} akcji na rynek!`, 'review');

    target.isStateOwned = false;
    target.stateOwnershipPct = 0;
    target.eventResistance = 0;
    target.sharesHeld -= sharesToRelease;
    if (target.sharesHeld < 0) target.sharesHeld = 0;
    
    applyPriceEffect(target.symbol, 0.05, 'positive', 'review');
    
    return;
}


function triggerNationalizationEvent() {
    // 1. Znajdź potencjalne cele nacjonalizacji:
    //    - Nie są już państwowe, nie są zbankrutowane, nie są startupami.
    //    - Mają bardzo słabą kondycję (<= -3).
    //    - Są mocno zadłużone (dług > 50% wartości rynkowej).
    const potentialTargets = stocks.filter(s => {
        if (s.isStateOwned || s.isBankrupt || s.assetType === 'Startup' || !s.balanceSheet) return false;
        const marketValue = s.price * s.totalShares;
        // Używamy długu z bilansu (liabilities) zamiast starego corporateDebt
        const isHeavilyIndebted = s.balanceSheet.liabilities > (marketValue * 0.5);
        const isPoorHealth = s.financialHealth <= -3;
        return isHeavilyIndebted && isPoorHealth;
    });

    // Jeśli nie ma kandydatów, zakończ
    if (potentialTargets.length === 0) return;

    // 2. Wylosuj cel
    const target = getRandomElement(potentialTargets);
    const targetSectors = target.sector;

    // 3. Sprawdź limit spółek państwowych w danym sektorze
    const stateOwnedCompanies = stocks.filter(s => s.isStateOwned);
    const companiesInTargetSectors = stateOwnedCompanies.filter(s =>
        s.sector.some(sector => targetSectors.includes(sector))
    );

    // Jeśli państwo ma już 2 lub więcej spółek w tym sektorze, anuluj
    if (companiesInTargetSectors.length >= 2) {
        console.log(`[EVENT] Bank Centralny rozważał nacjonalizację ${target.name}, ale limit spółek w sektorze (${companiesInTargetSectors.length}) został osiągnięty.`);
        return;
    }

    // 4. Oblicz koszt wykupu i sprawdź fundusze Banku Centralnego
    const buyoutPrice = target.price * 0.8; // Cena wykupu to 80% wartości rynkowej
    const totalCost = buyoutPrice * target.totalShares; // Koszt wykupu WSZYSTKICH akcji

    // Sprawdź, czy Bank Centralny stać na przejęcie
    if (centralBank.funds < totalCost) {
        console.log(`[EVENT] Bank Centralny chciał znacjonalizować ${target.name}, ale zabrakło środków (${centralBank.funds.toFixed(0)} / ${totalCost.toFixed(0)} PLN).`);
        return; // Anuluj, jeśli BC nie ma wystarczająco pieniędzy
    }

    // 5. Przeprowadź nacjonalizację
    centralBank.funds -= totalCost; // Pobierz środki z funduszy BC
    logEvent(`🏛️ NACJONALIZACJA! Bank Centralny przejmuje kontrolę nad ${target.name} za ${totalCost.toFixed(0)} PLN w celu ochrony gospodarki!`, 'review');

    // 6. Wypłać pieniądze dotychczasowym akcjonariuszom (graczowi i AI)
    // Gracz
    if (playerPortfolio[target.symbol]) {
        const holding = playerPortfolio[target.symbol];
        const cashGained = buyoutPrice * holding.shares;
        playerCash += cashGained;
        delete playerPortfolio[target.symbol];
        showToast(`Państwo przymusowo wykupiło Twoje akcje w ${target.name} po cenie ${buyoutPrice.toFixed(2)} PLN.`, 'warning', 7000);
    }
    // Boty
    aiCompetitors.forEach(ai => {
        if (ai.portfolio[target.symbol]) {
            const cashGained = buyoutPrice * ai.portfolio[target.symbol].shares;
            ai.cash += cashGained;
            delete ai.portfolio[target.symbol];
        }
    });

    // 7. Przekształć spółkę w państwową
    target.isStateOwned = true; // Oznacz jako państwową
    target.stateOwnershipPct = getRandomInRange(0.75, 0.90); // Państwo przejmuje 75-90%
    target.eventResistance = 0.6; // Otrzymuje odporność na zdarzenia
    target.balanceSheet.liabilities = 0; // Państwo spłaca długi z własnych środków (już odjętych z BC)
    target.financialHealth = 1; // Kondycja zostaje "uzdrowiona"

    // 8. Zaktualizuj liczbę akcji w obiegu
    // Akcje należące do graczy/AI zostały wykupione. Reszta (free float) przepada.
    // Państwo obejmuje swój nowy pakiet kontrolny.
    target.sharesHeld = Math.floor(target.totalShares * target.stateOwnershipPct);

    // Uruchom tylko jedno takie zdarzenie naraz w danym cyklu
    return;
}


// --- NOWA BAZA DANYCH DLA ZDARZEŃ R&D ---
const researchEventsPrompts = [
    // === POZYTYWNE ===
    {
        name: "Przełom w Laboratorium",
        type: 'positive',
        getMessage: (stockName) => `💡 Niespodziewany przełom w laboratorium ${stockName}! Naukowcy dokonali kluczowego odkrycia.`,
        resolve: (stock) => {
            const roll = Math.random();
            if (roll < 0.6) { // 60% szans
                const progressBonus = technologies[stock.research.currentTech].cost * 0.3;
                stock.research.progress += progressBonus;
                logEvent(`Badania w ${stock.name} przyspieszają o 30%!`);
            } else if (roll < 0.9) { // 30% szans
                const progressBonus = technologies[stock.research.currentTech].cost * 0.5;
                stock.research.progress += progressBonus;
                logEvent(`Ogromny postęp w ${stock.name}! Badania przyspieszają aż o 50%!`);
            } else { // 10% szans
                stock.research.progress = technologies[stock.research.currentTech].cost; // Natychmiastowe ukończenie
                logEvent(`Eureka! Naukowcy z ${stock.name} natychmiast kończą bieżące badania!`);
            }
        }
    },
    {
        name: "Grant Rządowy",
        type: 'positive',
        getMessage: (stockName) => `💰 ${stockName} otrzymuje niespodziewany grant rządowy na wsparcie innowacji!`,
        resolve: (stock) => {
            const cashBonus = getRandomIntInRange(5000, 20000);
            applyPriceEffect(stock.symbol, 0.02, 'positive'); // Lekki wzrost ceny
            logEvent(`Firma ${stock.name} otrzymuje ${cashBonus} PLN na badania, co rynek przyjmuje z optymizmem.`);
        }
    },
    {
        name: "Pozyskanie Talentu",
        type: 'positive',
        getMessage: (stockName) => `👨‍🔬 Genialny naukowiec przechodzi z konkurencji do ${stockName}!`,
        resolve: (stock) => {
            logEvent(`Doświadczenie nowego pracownika w ${stock.name} trwale przyspiesza wszystkie przyszłe badania.`);
            // W przyszłości można by tu dodać permanentny modyfikator prędkości badań
            const progressBonus = technologies[stock.research.currentTech].cost * 0.25;
            stock.research.progress += progressBonus;
        }
    },
    {
        name: "Udana Konferencja Branżowa",
        type: 'positive',
        getMessage: (stockName) => `🏆 Prezentacja ${stockName} na konferencji naukowej zdobywa owacje na stojąco!`,
        resolve: (stock) => {
            const roll = Math.random();
            if (roll < 0.7) {
                applyPriceEffect(stock.symbol, 0.05, 'positive');
                logEvent(`Prestiż ${stock.name} rośnie, co przekłada się na wycenę akcji.`);
            } else {
                stock.financialHealth += 0.5;
                logEvent(`Pozytywny odbiór branży poprawia ogólną kondycję finansową ${stock.name}.`);
            }
        }
    },
    {
        name: "Nieoczekiwane Zastosowanie",
        type: 'positive',
        getMessage: (stockName) => `🤯 Odkryto przypadkowe, rewolucyjne zastosowanie dla technologii rozwijanej przez ${stockName}!`,
        resolve: (stock) => {
            logEvent(`Potencjał komercyjny badań w ${stock.name} gwałtownie rośnie!`);
            applyPriceEffect(stock.symbol, 0.10, 'positive');
        }
    },
    {
        name: "Współpraca z Uczelnią",
        type: 'positive',
        getMessage: (stockName) => `🎓 ${stockName} nawiązuje strategiczną współpracę z renomowaną uczelnią techniczną.`,
        resolve: (stock) => {
            const progressBonus = technologies[stock.research.currentTech].cost * 0.15;
            stock.research.progress += progressBonus;
            logEvent(`Dostęp do zasobów akademickich przyspiesza badania w ${stock.name} o 15%.`);
        }
    },
    {
        name: "Inspirujący Artykuł w Prasie",
        type: 'positive',
        getMessage: (stockName) => `📰 Prestiżowy magazyn "Puls Rynku" publikuje pochlebny artykuł o dziale R&D w ${stock.name}.`,
        resolve: (stock) => {
            logEvent(`Wizerunek ${stock.name} jako innowatora umacnia się na rynku.`);
            applyPriceEffect(stock.symbol, 0.04, 'positive');
        }
    },

    // === NEGATYWNE ===
    {
        name: "Wypadek w Laboratorium",
        type: 'negative',
        getMessage: (stockName) => `🔥 Drobny wypadek w laboratorium ${stockName} powoduje opóźnienia w badaniach.`,
        resolve: (stock) => {
            const roll = Math.random();
            if (roll < 0.6) { // 60% szans
                stock.research.progress *= 0.75; // Utrata 25% postępu
                logEvent(`Część danych z badań w ${stock.name} uległa zniszczeniu. Postęp cofa się o 25%.`);
            } else if (roll < 0.9) { // 30% szans
                stock.research.progress *= 0.5; // Utrata 50% postępu
                logEvent(`Poważne straty w laboratorium ${stock.name}! Postęp badań cofa się aż o 50%!`);
            } else { // 10% szans
                stock.research.isResearching = false; // Tego nie dodajemy, bo nie ma logiki wznawiania
                logEvent(`Badania w ${stock.name} zostają czasowo zawieszone na czas remontu.`);
            }
        }
    },
    {
        name: "Ślepy Zaułek",
        type: 'negative',
        getMessage: (stockName) => `😩 Naukowcy z ${stockName} odkryli, że ich obecne podejście badawcze to ślepy zaułek.`,
        resolve: (stock) => {
            stock.research.progress = 0; // Całkowita utrata postępu
            logEvent(`Badania w ${stock.name} muszą zacząć się od nowa!`);
        }
    },
    {
        name: "Konkurencja Depcze po Piętach",
        type: 'negative',
        getMessage: (stockName) => `🏃‍♂️ Konkurencja ogłasza, że pracuje nad bardzo podobną technologią co ${stockName}!`,
        resolve: (stock) => {
            logEvent(`Rynek obawia się, że ${stock.name} nie będzie pierwszy. Wycena spada.`);
            applyPriceEffect(stock.symbol, -0.05, 'negative');
        }
    },
    {
        name: "Odejście Kluczowego Naukowca",
        type: 'negative',
        getMessage: (stockName) => `🚶‍♂️ Kluczowy naukowiec odchodzi z ${stockName}, zabierając ze sobą cenną wiedzę.`,
        resolve: (stock) => {
            logEvent(`Utrata know-how w ${stock.name} spowalnia prace i zwiększa ryzyko.`);
            stock.volatilityFactor *= 1.1;
            stock.research.progress *= 0.8; // Utrata 20% postępu
        }
    },
    {
        name: "Problemy z Patentem",
        type: 'negative',
        getMessage: (stockName) => `⚖️ Pojawiły się problemy prawne. Ktoś inny rości sobie prawa do patentu, nad którym pracuje ${stockName}.`,
        resolve: (stock) => {
            const roll = Math.random();
            if (roll < 0.5) {
                applyPriceEffect(stock.symbol, -0.08, 'negative');
                logEvent(`Niepewność prawna wokół ${stock.name} odstrasza inwestorów.`);
            } else {
                logEvent(`Koszty prawne obciążają finanse ${stock.name}.`);
                stock.financialHealth -= 0.5;
            }
        }
    },
    {
        name: "Cięcia Budżetowe",
        type: 'negative',
        getMessage: (stockName) => `✂️ Z powodu słabszych wyników, zarząd ${stockName} decyduje się na cięcia w budżecie R&D.`,
        resolve: (stock) => {
            logEvent(`Badania w ${stock.name} będą teraz postępować wolniej.`);
             // W przyszłości można by tu obniżyć modyfikator prędkości badań
            applyPriceEffect(stock.symbol, -0.03, 'negative');
        }
    },
    {
        name: "Negatywne Wyniki Badań",
        type: 'negative',
        getMessage: (stockName) => `📉 Wstępne wyniki badań w ${stockName} są rozczarowujące.`,
        resolve: (stock) => {
            logEvent(`Rynek sceptycznie ocenia szanse na sukces technologii rozwijanej przez ${stock.name}.`);
            stock.research.progress *= 0.9; // Mała utrata postępu
            stock.volatilityFactor *= 1.05; // Wzrost ryzyka
        }
    }
];

// --- NOWA FUNKCJA URUCHAMIAJĄCA ZDARZENIA R&D ---
function triggerResearchEvent() {
    // Znajdź wszystkie spółki, które aktywnie prowadzą badania
    const researchingCompanies = stocks.filter(s => s.research && s.research.isResearching);
    if (researchingCompanies.length === 0) return;

    // Wylosuj jedną z nich
    const targetStock = getRandomElement(researchingCompanies);
    
    // Wylosuj zdarzenie
    const eventData = getRandomElement(researchEventsPrompts);

    // Wyświetl powiadomienie i zastosuj losowy skutek
    logEvent(eventData.getMessage(targetStock.name), 'review');
    showToast(eventData.getMessage(targetStock.name), eventData.type === 'positive' ? 'success' : 'warning');
    
    eventData.resolve(targetStock);
}

function triggerCeoEvent() {
    const potentialStocks = stocks.filter(s => s.ceo && s.ceo.tenure > 0 && !s.isBankrupt && s.assetType !== 'Startup');
    if (potentialStocks.length === 0) return;

    const stock = getRandomElement(potentialStocks);
    const ceo = stock.ceo;
    const eventRoll = Math.random();

    // 1. Szansa na emeryturę (rośnie wraz ze stażem)
    const retirementChance = Math.max(0, (ceo.tenure - 8)) * 0.02; // Zaczyna się po 2 latach (8 kwartałach), 2% na kwartał
    if (eventRoll < retirementChance) {
        const oldCeoName = ceo.name;
        replaceCeo(stock);
        logEvent(`🏢 Prezes firmy ${stock.name} przechodzi na zasłużoną emeryturę.`, 'review');
        showToast(`Prezes ${stock.name} odchodzi na emeryturę!`, 'default');
        return; // Zdarzenie wystąpiło, kończymy
    }

    // 2. Szansa na skandal (tylko dla cechy "Skompromitowany")
    if (ceo.traits.some(t => t.id === 'skompromitowany') && Math.random() < 0.2) {
        const eventData = getRandomElement(companySpecificEventsPrompts.filter(e => e.type === 'negative'));
        const magnitude = getRandomInRange(0.10, 0.20) * -1;
        
        displayEventMessage(`[SKANDAL] Przeszłość prezesa ${ceo.name} daje o sobie znać! ${eventData.message(stock.name)}`, 30, magnitude, 'company');
        applyPriceEffect(stock.symbol, magnitude, 'negative', 'company');
        return;
    }

    // 3. Szansa na nagrodę branżową (mała, ogólna szansa)
    if (Math.random() < 0.05) {
        const eventData = getRandomElement(companySpecificEventsPrompts.filter(e => e.type === 'positive'));
        const magnitude = getRandomInRange(0.05, 0.10);
        
        displayEventMessage(`🏆 Prezes ${ceo.name} otrzymuje prestiżową nagrodę biznesową! To pozytywnie wpływa na wizerunek ${stock.name}.`, 30, magnitude, 'company');
        applyPriceEffect(stock.symbol, magnitude, 'positive', 'company');
        return;
    }
}

/**
 * Uruchamia zdarzenia CEO, które są sprawdzane co pół roku.
 */
function triggerSemiAnnualEvents() {
    stocks.forEach(stock => {
        if (!stock.isBankrupt && stock.poorPerformanceCounter > 0 && stock.chanceToCedePower) {
            if (Math.random() < stock.chanceToCedePower) {
                // Event: Oddanie władzy
                const oldCeoName = stock.ceo.name;
                replaceCeo(stock);
                logEvent(`[CEO] Po okresie słabych wyników, dotychczasowy prezes oddaje władzę w ${stock.name}!`, 'review');
                showToast(`Zmiana warty w ${stock.name}!`, 'success');
                stock.activePositiveBoostUntil = Date.now() + 3000;
                stock.poorPerformanceCounter = 0;
                stock.chanceToCedePower = 0.02; // Reset
            }
        }
    });
}

/**
 * Uruchamia rzadkie zdarzenia CEO, które są losowane raz w roku.
 */
function triggerYearlyCeoEvents() {
    // Globalne roczne eventy (losują się raz na cały rynek)
    if (Math.random() < 0.01) { // 1% szans na rezygnację
        const eligibleStocks = stocks.filter(s => !s.isBankrupt && s.financialHealth < 1);
        if (eligibleStocks.length > 0) {
            const stock = getRandomElement(eligibleStocks);
            const oldCeoName = stock.ceo.name;
            replaceCeo(stock);
            logEvent(`[CEO] Prezes firmy ${stock.name} rezygnuje ze stanowiska z powodu braku zadowalających wyników.`, 'review');
        }
    }
    
    if (Math.random() < 0.05) { // 5% szans na skandal
        const stock = getRandomElement(stocks.filter(s => !s.isBankrupt));
        if (Math.random() < 0.5) {
            replaceCeo(stock);
            applyPriceEffect(stock.symbol, 0.02, 'positive');
            logEvent(`[SKANDAL!] Po ujawnieniu afery, prezes ${stock.name} został natychmiast odwołany. Inwestorzy z optymizmem patrzą na "nowe otwarcie".`, 'company');
        } else {
            applyPriceEffect(stock.symbol, -0.04, 'negative');
            logEvent(`[SKANDAL!] Wybuchł skandal obyczajowy z udziałem prezesa ${stock.name}! Firma traci na wizerunku.`, 'company');
        }
    }

    if (Math.random() < 0.005) { // 0.5% szans na areszt
        const stock = getRandomElement(stocks.filter(s => !s.isBankrupt));
        const oldCeoName = stock.ceo.name;
        replaceCeo(stock);
        applyPriceEffect(stock.symbol, -0.01, 'negative');
        logEvent(`[PILNE!] Prezes firmy ${stock.name} został aresztowany pod zarzutem malwersacji finansowych!`, 'company');
    }
    
    // Pętla po spółkach dla zdarzeń indywidualnych
    stocks.forEach(stock => {
        if (!stock.ceo || stock.isBankrupt) return;

        let eventTriggered = false;
        
        // 1. Emerytura
        let retirementChance = 0;
        if (stock.ceo.age >= 65) retirementChance = 0.8;
        else if (stock.ceo.age >= 50) retirementChance = (stock.ceo.tenure / 4) * 0.02;
        
        if (Math.random() < retirementChance) {
            const oldCeoName = stock.ceo.name;
            replaceCeo(stock);
            logEvent(`[CEO] Po ${Math.floor(stock.ceo.tenure / 4)} latach pracy, ${oldCeoName} przechodzi na emeryturę. Nowym prezesem ${stock.name} zostaje ${stock.ceo.name}.`, 'review');
            eventTriggered = true;
        }

        // 2. Przejęcie władzy (jeśli nie było emerytury)
        if (!eventTriggered && stock.ceo.traits.filter(t => negativeTraits.includes(t.id)).length >= 2) {
            if (Math.random() < 0.15) {
                const oldCeoName = stock.ceo.name;
                replaceCeo(stock);
                logEvent(`[CEO] "Bunt" w radzie nadzorczej ${stock.name}! ${oldCeoName} został odwołany z powodu niekompetencji.`, 'review');
                stock.activePositiveBoostUntil = Date.now() + 2000;
                eventTriggered = true;
            }
        }
        
        // 3. Odejście legendy (jeśli nie było poprzednich)
        if (!eventTriggered && stock.ceo.traits.some(t => t.rarity === 'exceptional' && positiveTraits.includes(t.id))) {
            if (Math.random() < 0.10) {
                const oldCeoName = stock.ceo.name;
                replaceCeo(stock);
                logEvent(`[CEO] Ikona biznesu na stanowisku prezesa ${stock.name} odchodzi do globalnej korporacji. To duża strata dla firmy.`, 'review');
                stock.activeNegativeBoostUntil = Date.now() + 2000;
            }
        }
    });
}

function triggerTBillAuctionEvent() {
    // Sprawdź, czy już trwa aukcja
    if (currentTBillAuction) {
        console.log("[Aukcja Bonów] Próba uruchomienia nowej aukcji, ale poprzednia wciąż trwa.");
        return;
    }

    const quantity = getRandomIntInRange(50, 250); // Ile bonów jest oferowanych
    const auctionDurationMinutes = 2; // Aukcja trwa 2 minuty czasu gry
    const auctionEndTime = Date.now() + (auctionDurationMinutes * 60 * 1000 / currentSpeedMultiplier);

    currentTBillAuction = {
        quantityAvailable: quantity,
        endTime: auctionEndTime,
        bids: [] // Lista złożonych ofert: { bidderId, quantity, price }
    };

    logEvent(`🔔 Bank Centralny ogłasza aukcję ${quantity} bonów skarbowych! Aukcja trwa ${auctionDurationMinutes} min.`, 'market');
    showToast(`🔔 Ogłoszono aukcję bonów skarbowych! Sprawdź Bank Centralny.`, 'default', 10000);

    // Zaplanuj rozstrzygnięcie aukcji
    // Używamy setTimeout zamiast pętli, bo to jednorazowe zdarzenie
    const delay = auctionEndTime - Date.now();
    //setTimeout(resolveTBillAuction, delay);

    // Odśwież widok banku, jeśli jest otwarty
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

function triggerBankIPOEvent() {
    // Sprawdź, czy już trwa inna oferta IPO banku
    if (currentBankIPOOffer) {
        console.log("[Event IPO Banku] Próba uruchomienia nowej oferty, ale poprzednia jest aktywna.");
        return;
    }

    const inactiveBanks = commercialBanks.filter(b => !b.isActive);
    if (inactiveBanks.length === 0) return; // Brak banków do wprowadzenia
    const bankToIPO = getRandomElement(inactiveBanks);

    // Oblicz parametry oferty IPO
    const ipoValuation = bankToIPO.initialCapital * getRandomInRange(1.1, 1.5);
    const ipoSharePrice = getRandomInRange(50, 150);
    const ipoTotalShares = Math.floor(ipoValuation / ipoSharePrice);
    // Upewnij się, że liczba akcji jest dodatnia
    if (ipoTotalShares <= 0) {
        console.error(`[Event IPO Banku] Obliczona liczba akcji (${ipoTotalShares}) jest nieprawidłowa dla ${bankToIPO.name}. Anulowanie eventu.`);
        return;
    }
    const sharesOfferedToPlayer = Math.floor(ipoTotalShares * 0.05);
    // Upewnij się, że oferowana liczba akcji jest dodatnia
    if (sharesOfferedToPlayer <= 0) {
        console.log(`[Event IPO Banku] Obliczona liczba oferowanych akcji (${sharesOfferedToPlayer}) jest zbyt mała dla ${bankToIPO.name}. Anulowanie oferty dla gracza.`);
         // Możemy kontynuować event bez oferty dla gracza lub go anulować - na razie kontynuujemy
    }
    const offerPrice = ipoSharePrice * 0.9; // Zniżka 10% dla gracza
    const offerCost = sharesOfferedToPlayer * offerPrice;

    // Zapisz dane oferty globalnie, aby były dostępne dla funkcji resolveBankIPO i UI
    currentBankIPOOffer = {
        bank: bankToIPO,
        symbol: `BK${bankToIPO.id.toUpperCase()}`, // Np. BKINV1
        ipoSharePrice: ipoSharePrice,
        ipoTotalShares: ipoTotalShares,
        sharesOffered: sharesOfferedToPlayer,
        offerPrice: offerPrice,
        offerCost: offerCost
    };

    // Przygotuj treść wiadomości dla modala
    const message = `Nowy bank "${bankToIPO.name}" (${bankToIPO.type}) wchodzi na giełdę!<br><br>
                     Oferujemy Ci możliwość zakupu <strong>${sharesOfferedToPlayer}</strong> akcji (5% udziałów)
                     po preferencyjnej cenie <strong>${offerPrice.toFixed(2)} PLN</strong>
                     (całkowity koszt: <strong>${offerCost.toFixed(2)} PLN</strong>) przed oficjalnym debiutem.<br><br>
                     Czy chcesz skorzystać z oferty?`;

    // Otwórz modal z ofertą (funkcja z ui.js)
    openBankIPOOfferModal(message);

    // Bank NIE jest jeszcze aktywowany ani dodawany na giełdę.
    // Stanie się to dopiero po decyzji gracza w funkcji resolveBankIPO.
}

function resolveBankIPO(decision) {
    if (!currentBankIPOOffer) return;

    const offer = currentBankIPOOffer;
    const bankToIPO = offer.bank;
    let playerBoughtShares = 0;

    if (decision === 'accept') {
        if (playerCash >= offer.offerCost) {
            playerCash -= offer.offerCost;
            // Dodaj akcje do portfela gracza
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
    } else { // decision === 'reject'
        logEvent(`Odrzuciłeś ofertę udziału w IPO banku ${bankToIPO.name}.`, 'review');
    }

    // Aktywuj bank i dodaj go na giełdę (niezależnie od decyzji gracza)
    bankToIPO.isActive = true;
    const newBankStock = {
        name: bankToIPO.name,
        symbol: offer.symbol,
        price: offer.ipoSharePrice, // Startuje z ceną IPO
        volatilityFactor: getRandomInRange(0.5, 1.5),
        exchange: 'SILVER',
        totalShares: offer.ipoTotalShares,
        maxShares: offer.ipoTotalShares * 2,
        sharesHeld: playerBoughtShares, // Tylko akcje kupione przez gracza są "zajęte" na start
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

    // Wyczyść ofertę i zamknij modal
    currentBankIPOOffer = null;
    closeBankIPOOfferModal(); // Funkcję dodamy w ui.js

    // Odśwież widoki
    displayStocks(getCurrentInputValues());
    renderCommercialBanksList(); // Odśwież listę banków
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