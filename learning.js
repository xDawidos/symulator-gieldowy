// =================================================================================
// learning.js: Nauka giełdy: Akademia (słownik, quizy, mediany sektora), skaner spółek i wyceny, mentor i certyfikaty.
// Złączone pliki: academy.js, scanner.js, mentor.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## academy.js
// #################################################################################

// =================================================================================
// 0.12 N1: AKADEMIA — słownik pojęć giełdowych z przykładami z gry, quizy,
// porównanie wskaźników spółki z medianą sektora.
// Stan w playerProfile.academy: { unlocked: { id: kwartał }, quizzes: { id: true } }.
// =================================================================================

const ACADEMY_QUIZ_REWARD = 60; // PLN do portfela prywatnego za pierwsze zaliczenie quizu
const ACADEMY_BASE_ENTRIES = ['kapitalizacja', 'cz', 'nav', 'benchmark', 'fazy_rynku'];

// ---------------------------------------------------------------------------------
// WSKAŹNIKI SPÓŁKI I MEDIANY SEKTORA (wspólne z kartą spółki i skanerem)
// ---------------------------------------------------------------------------------

/** Wskaźniki spółki z bilansu i 4 ostatnich kwartałów (null = brak danych). */
function getCompanyMetrics(stock) {
    const f = stock?.fundamentals;
    if (!f || stock.assetType || stock.isBankStock) return null; // banki: bilans z depozytami klientów — inne wskaźniki
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const assets = Number(stock.balanceSheet?.assets) || 0;
    const liabilities = Math.max(0, Number(stock.balanceSheet?.liabilities) || 0);
    const equity = assets - liabilities;
    const history = f.history || [];
    const last4 = history.slice(-4).reduce((sum, q) => sum + (Number(q.netIncome) || 0), 0);
    const prev4 = history.length >= 8 ? history.slice(-8, -4).reduce((sum, q) => sum + (Number(q.netIncome) || 0), 0) : null;
    const dividendYield = typeof getTrailingDividendYield === 'function' ? getTrailingDividendYield(stock) : 0;
    return {
        cap: (Number(stock.price) || 0) * shares,
        eps: Number(f.epsTtm),
        pe: f.peRatio > 0 ? f.peRatio : null,
        pb: f.pbRatio > 0 ? f.pbRatio : null,
        dy: dividendYield,
        debt: assets > 0 ? liabilities / assets : null,
        margin: f.revenueTtm > 0 ? f.netIncomeTtm / f.revenueTtm : null,
        roe: equity > 0 ? f.netIncomeTtm / equity : null,
        liquidity: liabilities > 0 ? Math.max(0, Number(stock.cash) || 0) / liabilities : null,
        growth: prev4 && prev4 > 0 ? last4 / prev4 - 1 : null,
        health: Number(stock.financialHealth) || 0,
        fair: f.fairValue > 0 ? f.fairValue : null
    };
}

function median(values) {
    const list = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (!list.length) return null;
    const mid = Math.floor(list.length / 2);
    return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

let sectorMedianCache = { at: 0, data: {} };

/** Mediany wskaźników w sektorze (główny sektor spółki); odświeżane co 2 s. */
function getSectorMedians(sector) {
    const now = Date.now();
    if (now - sectorMedianCache.at > 2000) {
        const groups = {};
        for (const stock of stocks) {
            if (stock.assetType || stock.isBankrupt || !getMainSector(stock)) continue;
            const m = getCompanyMetrics(stock);
            if (!m) continue;
            (groups[getMainSector(stock)] = groups[getMainSector(stock)] || []).push(m);
            const sub = getMainSubsector(stock); // T2: mediana podsektora (klucz „sektor|podsektor”)
            if (sub) (groups[`${getMainSector(stock)}|${sub}`] = groups[`${getMainSector(stock)}|${sub}`] || []).push(m);
        }
        const data = {};
        for (const [name, list] of Object.entries(groups)) {
            data[name] = { count: list.length };
            for (const key of ['pe', 'pb', 'dy', 'debt', 'margin', 'roe']) data[name][key] = median(list.map(m => m[key]));
        }
        sectorMedianCache = { at: now, data };
    }
    return sectorMedianCache.data[sector] || null;
}

/** T2: mediany podsektora — tylko przy co najmniej 3 spółkach (inaczej null). */
function getSubsectorMedians(sector, subsector) {
    if (!subsector) return null;
    getSectorMedians(sector); // odświeża pamięć podręczną
    const data = sectorMedianCache.data[`${sector}|${subsector}`];
    return data && data.count >= 3 ? data : null;
}

/** Opis wskaźnika względem sektora: { text, cls } albo null. lowerIsCheap: niższa wartość = „taniej/lepiej”. */
function compareWithSector(value, sectorValue, { lowerIsCheap = true, format = v => formatNumberPl(v, 1), labels = ['tania', 'droga'] } = {}) {
    if (!Number.isFinite(value) || !Number.isFinite(sectorValue) || sectorValue === 0) return null;
    const ratio = value / sectorValue;
    let verdict = 'jak sektor', cls = 'text-muted';
    if (ratio < 0.85) { verdict = lowerIsCheap ? labels[0] : labels[1]; cls = lowerIsCheap ? 'text-up' : 'text-down'; }
    else if (ratio > 1.15) { verdict = lowerIsCheap ? labels[1] : labels[0]; cls = lowerIsCheap ? 'text-down' : 'text-up'; }
    return { text: `sektor ${format(sectorValue)} · ${verdict}`, cls };
}

// ---------------------------------------------------------------------------------
// SŁOWNIK
// ---------------------------------------------------------------------------------

function pickListed(filter = () => true) {
    return stocks.filter(s => !s.assetType && !s.isBankrupt && s.fundamentals && filter(s));
}

function bestBy(list, fn) {
    let best = null, bestValue = -Infinity;
    for (const item of list) { const v = fn(item); if (Number.isFinite(v) && v > bestValue) { best = item; bestValue = v; } }
    return best;
}

const ACADEMY_ENTRIES = {
    kapitalizacja: {
        title: 'Kapitalizacja', icon: '🏢',
        text: 'Kapitalizacja to kurs akcji pomnożony przez liczbę akcji — tyle rynek płaci dziś za całą spółkę. Sam kurs nic nie mówi o wielkości firmy: akcja za 5 PLN może należeć do większej spółki niż akcja za 500 PLN.',
        example: () => { const s = bestBy(pickListed(), x => getMarketCapValue(x)); return s ? `Największa spółka w grze: ${s.name} — kapitalizacja ${formatZl(getMarketCapValue(s), 0)} przy kursie ${formatZl(s.price)}.` : ''; },
        quiz: [
            { q: 'Spółka ma 1 000 000 akcji po 20 PLN. Jaka jest jej kapitalizacja?', a: ['20 mln PLN', '1 mln PLN', '20 tys. PLN'], c: 0 },
            { q: 'Która spółka jest większa?', a: ['Nie da się ocenić po samym kursie', 'Ta z wyższym kursem akcji', 'Ta z niższym kursem akcji'], c: 0 },
            { q: 'Kurs akcji rośnie o 10%, liczba akcji bez zmian. Kapitalizacja…', a: ['rośnie o 10%', 'się nie zmienia', 'spada o 10%'], c: 0 }
        ]
    },
    cz: {
        title: 'C/Z (cena do zysku)', icon: '📐',
        text: 'C/Z to kurs podzielony przez zysk na akcję z ostatnich 4 kwartałów. Mówi, ile lat zysku „płacisz” kupując akcję. Niskie C/Z bywa okazją, ale też sygnałem problemów — zawsze porównuj ze spółkami z tego samego sektora.',
        example: () => {
            const s = bestBy(pickListed(x => x.fundamentals.peRatio > 0), x => getMarketCapValue(x));
            const med = s && getSectorMedians(getMainSector(s));
            return s && med?.pe ? `${s.name}: C/Z ${s.fundamentals.peRatio.toFixed(1)}, mediana sektora ${getMainSector(s)}: ${med.pe.toFixed(1)}.` : '';
        },
        quiz: [
            { q: 'Kurs 50 PLN, zysk na akcję 5 PLN. Ile wynosi C/Z?', a: ['10', '5', '250'], c: 0 },
            { q: 'Spółka A ma C/Z 8, a mediana jej sektora to 14. Co to sugeruje?', a: ['Jest tania względem sektora — warto sprawdzić dlaczego', 'Na pewno zbankrutuje', 'Jest droga względem sektora'], c: 0 },
            { q: 'Spółka ma stratę. Jakie ma C/Z?', a: ['Nie da się go sensownie policzyć', 'Bardzo niskie, więc jest tania', 'Równe zero'], c: 0 }
        ]
    },
    eps: {
        title: 'EPS (zysk na akcję)', icon: '💵',
        text: 'EPS to zysk netto podzielony przez liczbę akcji. Gdy spółka emituje nowe akcje, ten sam zysk dzieli się na więcej części — EPS spada (rozwodnienie). Rynek patrzy na tempo wzrostu EPS.',
        example: () => { const s = bestBy(pickListed(), x => x.fundamentals.epsTtm); return s ? `${s.name}: zysk na akcję z 4 kwartałów ${formatZl(s.fundamentals.epsTtm)}.` : ''; },
        quiz: [
            { q: 'Zysk netto 2 mln PLN, 1 mln akcji. EPS = ?', a: ['2 PLN', '0,5 PLN', '2 mln PLN'], c: 0 },
            { q: 'Spółka podwaja liczbę akcji, zysk bez zmian. EPS…', a: ['spada o połowę', 'rośnie dwukrotnie', 'się nie zmienia'], c: 0 },
            { q: 'Co oznacza „rozwodnienie” akcjonariuszy?', a: ['Mniejszy udział i zysk na akcję po emisji nowych akcji', 'Wypłatę dywidendy', 'Spadek zadłużenia'], c: 0 }
        ]
    },
    cwk: {
        title: 'C/WK i wartość księgowa', icon: '📚',
        text: 'Wartość księgowa to majątek spółki minus jej długi (kapitał własny). C/WK = kurs / wartość księgowa na akcję. Poniżej 1 rynek wycenia spółkę taniej niż jej majątek netto — często dlatego, że majątek przynosi mało zysku.',
        example: () => { const s = pickListed(x => x.fundamentals.pbRatio > 0).sort((a, b) => a.fundamentals.pbRatio - b.fundamentals.pbRatio)[0]; return s ? `Najniższe C/WK: ${s.name} — ${s.fundamentals.pbRatio.toFixed(2)}.` : ''; },
        quiz: [
            { q: 'Majątek 10 mln PLN, długi 4 mln PLN. Wartość księgowa to…', a: ['6 mln PLN', '14 mln PLN', '10 mln PLN'], c: 0 },
            { q: 'C/WK = 0,7 oznacza, że…', a: ['rynek wycenia spółkę poniżej jej majątku netto', 'spółka ma 70% zadłużenia', 'spółka wypłaca 70% zysku'], c: 0 },
            { q: 'Dlaczego niskie C/WK nie zawsze jest okazją?', a: ['Majątek może przynosić słabe zyski albo być przeszacowany', 'Bo C/WK nie ma znaczenia', 'Bo takie spółki nie płacą podatków'], c: 0 }
        ]
    },
    dywidenda: {
        title: 'Dywidenda i stopa dywidendy', icon: '💰',
        text: 'Dywidenda to część zysku wypłacana akcjonariuszom. Stopa dywidendy = dywidendy z roku / kurs. Bardzo wysoka stopa bywa pułapką: jeśli spółka wypłaca więcej, niż zarabia, dywidenda zostanie obcięta.',
        example: () => { const s = bestBy(pickListed(), x => getTrailingDividendYield(x)); return s && getTrailingDividendYield(s) > 0 ? `Najwyższa stopa dywidendy: ${s.name} — ${(getTrailingDividendYield(s) * 100).toFixed(2)}%.` : 'Na razie żadna spółka nie wypłaciła dywidendy w tym roku.'; },
        quiz: [
            { q: 'Kurs 40 PLN, dywidendy z roku 2 PLN. Stopa dywidendy = ?', a: ['5%', '2%', '20%'], c: 0 },
            { q: 'Kiedy wysoka stopa dywidendy jest sygnałem ostrzegawczym?', a: ['Gdy spółka wypłaca więcej, niż zarabia', 'Zawsze jest dobra', 'Gdy spółka ma mało długów'], c: 0 },
            { q: 'Co dzieje się z kursem w dniu odcięcia dywidendy?', a: ['Spada mniej więcej o wartość dywidendy', 'Rośnie o wartość dywidendy', 'Nic się nie zmienia'], c: 0 }
        ]
    },
    zadluzenie: {
        title: 'Zadłużenie', icon: '🏦',
        text: 'Zadłużenie (zobowiązania / aktywa) pokazuje, jaka część majątku jest finansowana długiem. Dług zwiększa zyski w dobrych czasach, ale w recesji odsetki zjadają wynik. Powyżej ~70% spółka jest wrażliwa na kryzys i wzrost stóp.',
        example: () => { const s = bestBy(pickListed(x => x.balanceSheet?.assets > 0), x => x.balanceSheet.liabilities / x.balanceSheet.assets); return s ? `Najbardziej zadłużona: ${s.name} — ${(s.balanceSheet.liabilities / s.balanceSheet.assets * 100).toFixed(0)}% aktywów.` : ''; },
        quiz: [
            { q: 'Aktywa 100 mln PLN, zobowiązania 80 mln PLN. Zadłużenie = ?', a: ['80%', '20%', '125%'], c: 0 },
            { q: 'Bank Centralny podnosi stopy. Która spółka ucierpi najbardziej?', a: ['Mocno zadłużona', 'Bez długów z dużą gotówką', 'Każda tak samo'], c: 0 },
            { q: 'Dlaczego dług bywa korzystny?', a: ['Pozwala rosnąć szybciej, gdy zysk z inwestycji przewyższa odsetki', 'Bo obniża ryzyko', 'Bo nie trzeba go spłacać'], c: 0 }
        ]
    },
    marza: {
        title: 'Marża', icon: '✂️',
        text: 'Marża netto = zysk netto / przychody. Pokazuje, ile z każdej złotówki sprzedaży zostaje jako zysk. Sektory różnią się marżami (technologia zwykle wyższe niż handel), więc porównuj spółki w obrębie sektora.',
        example: () => { const s = bestBy(pickListed(x => x.fundamentals.revenueTtm > 0), x => x.fundamentals.netIncomeTtm / x.fundamentals.revenueTtm); return s ? `Najwyższa marża netto: ${s.name} — ${(s.fundamentals.netIncomeTtm / s.fundamentals.revenueTtm * 100).toFixed(1)}%.` : ''; },
        quiz: [
            { q: 'Przychody 10 mln PLN, zysk netto 1 mln PLN. Marża netto = ?', a: ['10%', '1%', '90%'], c: 0 },
            { q: 'Wysoka inflacja kosztów zwykle…', a: ['obniża marże', 'podnosi marże', 'nie ma wpływu na marże'], c: 0 },
            { q: 'Dlaczego porównujemy marże w obrębie sektora?', a: ['Sektory mają naturalnie różne marże', 'Bo marża zależy od kursu akcji', 'Bo poza sektorem marży nie ma'], c: 0 }
        ]
    },
    roe: {
        title: 'ROE (rentowność kapitału)', icon: '🔁',
        text: 'ROE = zysk netto / kapitał własny. Mówi, ile zysku spółka wypracowuje z pieniędzy akcjonariuszy. Wysokie ROE przy niskim zadłużeniu to znak dobrego biznesu; wysokie ROE „napompowane” długiem jest ryzykowne.',
        example: () => { const s = bestBy(pickListed(), x => getCompanyMetrics(x)?.roe); const m = s && getCompanyMetrics(s); return m?.roe ? `Najwyższe ROE: ${s.name} — ${(m.roe * 100).toFixed(1)}%.` : ''; },
        quiz: [
            { q: 'Zysk 3 mln PLN, kapitał własny 20 mln PLN. ROE = ?', a: ['15%', '6,7%', '23%'], c: 0 },
            { q: 'Dwie spółki mają ROE 20%. Która jest bezpieczniejsza?', a: ['Ta z mniejszym zadłużeniem', 'Ta z większym zadłużeniem', 'Są tak samo bezpieczne'], c: 0 },
            { q: 'Co mierzy ROE?', a: ['Zysk z kapitału akcjonariuszy', 'Wzrost kursu akcji', 'Wielkość sprzedaży'], c: 0 }
        ]
    },
    plynnosc: {
        title: 'Płynność finansowa', icon: '💧',
        text: 'Płynność to zdolność do regulowania bieżących zobowiązań. Spółka z zyskiem, ale bez gotówki, może upaść, gdy nie spłaci długu na czas. W grze porównuj gotówkę spółki z jej zobowiązaniami.',
        example: () => { const s = pickListed(x => x.balanceSheet?.liabilities > 0).sort((a, b) => a.cash / a.balanceSheet.liabilities - b.cash / b.balanceSheet.liabilities)[0]; return s ? `Najsłabsza płynność: ${s.name} — gotówka ${formatZl(s.cash, 0)} przy zobowiązaniach ${formatZl(s.balanceSheet.liabilities, 0)}.` : ''; },
        quiz: [
            { q: 'Czy spółka z zyskiem może zbankrutować?', a: ['Tak, jeśli zabraknie jej gotówki na spłatę długów', 'Nie, zysk chroni przed bankructwem', 'Tylko w recesji'], c: 0 },
            { q: 'Co poprawia płynność?', a: ['Więcej gotówki względem bieżących zobowiązań', 'Wyższy kurs akcji', 'Większa liczba akcji'], c: 0 },
            { q: 'Spółka ma 1 mln PLN gotówki i 10 mln PLN zobowiązań do spłaty w tym roku. To…', a: ['sygnał ryzyka płynności', 'bardzo bezpieczna sytuacja', 'nie ma znaczenia'], c: 0 }
        ]
    },
    raport: {
        title: 'Raport kwartalny i konsensus', icon: '📰',
        text: 'Co kwartał spółki publikują wyniki. Kurs reaguje nie na sam wynik, lecz na różnicę względem oczekiwań (konsensusu). Dobry wynik, ale gorszy od oczekiwań, potrafi obniżyć kurs.',
        example: () => { const s = pickListed(x => Number.isFinite(x.lastSurprise) && Math.abs(x.lastSurprise) > 0.15)[0]; return s ? `${s.name}: ostatni zysk ${s.lastSurprise > 0 ? 'powyżej' : 'poniżej'} oczekiwań o ${(Math.abs(s.lastSurprise) * 100).toFixed(0)}%.` : ''; },
        quiz: [
            { q: 'Spółka zarobiła 10% więcej niż rok temu, ale analitycy czekali na +30%. Kurs prawdopodobnie…', a: ['spadnie', 'mocno wzrośnie', 'się nie zmieni'], c: 0 },
            { q: 'Czym jest konsensus?', a: ['Średnią prognozą analityków przed raportem', 'Zgodą zarządu na dywidendę', 'Ceną z emisji akcji'], c: 0 },
            { q: 'Na co rynek reaguje najmocniej?', a: ['Na niespodziankę względem oczekiwań', 'Na sam fakt publikacji raportu', 'Na długość raportu'], c: 0 }
        ]
    },
    wycena: {
        title: 'Wycena: wartość godziwa', icon: '⚖️',
        text: 'Wartość godziwa to szacunek, ile spółka „powinna” kosztować. Metody: porównawcza (C/Z i C/WK sektora), dywidendowa (model Gordona) i inne. Różne metody dają różne wyniki — dlatego wycena to przedział, nie jedna liczba. Kurs w długim terminie dąży do wartości.',
        example: () => { const s = bestBy(pickListed(x => x.fundamentals.fairValue > 0), x => x.fundamentals.fairValue / x.price); return s ? `Największy potencjał wg modelu: ${s.name} — wartość ${formatZl(s.fundamentals.fairValue)} przy kursie ${formatZl(s.price)}.` : ''; },
        quiz: [
            { q: 'Wartość godziwa 120 PLN, kurs 80 PLN. Spółka jest…', a: ['niedowartościowana', 'przewartościowana', 'wyceniona idealnie'], c: 0 },
            { q: 'Dlaczego warto liczyć wycenę kilkoma metodami?', a: ['Każda ma założenia — przedział jest bardziej wiarygodny', 'Bo jedna metoda zawsze jest błędna', 'Bo tak wymaga KNF'], c: 0 },
            { q: 'Model Gordona (dywidendowy) nie zadziała dla spółki, która…', a: ['nie wypłaca dywidend', 'ma niskie C/Z', 'ma dużo gotówki'], c: 0 }
        ]
    },
    nav: {
        title: 'NAV i jednostki funduszu', icon: '💼',
        text: 'NAV (wartość aktywów netto) na udział to wartość funduszu podzielona przez liczbę udziałów. Klienci kupują i umarzają udziały po NAV. Wynik funduszu mierzy się zmianą NAV, nie wielkością aktywów — napływ klientów nie jest zyskiem.',
        example: () => playerFund ? `Twój fundusz: NAV ${getFundNav().toFixed(4)} PLN na jednostkę, aktywa ${formatZl(getFundAssets(), 0)}.` : '',
        quiz: [
            { q: 'Klienci wpłacają do funduszu 1 mln PLN. NAV na jednostkę…', a: ['się nie zmienia — przybywa jednostek', 'rośnie o 1 mln PLN', 'spada'], c: 0 },
            { q: 'Czym mierzy się wynik zarządzającego?', a: ['Zmianą NAV na jednostkę', 'Wielkością aktywów', 'Liczbą klientów'], c: 0 },
            { q: 'Akcje w portfelu tanieją o 10%, gotówka bez zmian. NAV…', a: ['spada', 'rośnie', 'się nie zmienia'], c: 0 }
        ]
    },
    benchmark: {
        title: 'Benchmark (GIG)', icon: '🎯',
        text: 'Benchmark to punkt odniesienia — u Ciebie indeks GIG. Zarządzający jest oceniany za wynik ponad benchmark (alfa). Zarobić 5%, gdy rynek urósł 15%, to słaby wynik; stracić 3%, gdy rynek spadł 15%, to dobry.',
        example: () => playerFund ? `Bieżący okres: fundusz ${((getFundNav() / playerFund.current.startNav - 1) * 100).toFixed(1)}%, GIG ${((getBenchmarkValue() / playerFund.current.startBenchmark - 1) * 100).toFixed(1)}%.` : '',
        quiz: [
            { q: 'Fundusz +8%, GIG +12%. Wynik względem benchmarku (alfa)?', a: ['−4 pkt proc.', '+8 pkt proc.', '+20 pkt proc.'], c: 0 },
            { q: 'Fundusz −5%, GIG −15%. Jak ocenić wynik?', a: ['Dobrze — fundusz pobił rynek', 'Źle — fundusz stracił', 'Nie da się ocenić'], c: 0 },
            { q: 'Po co fundusz ma benchmark?', a: ['Żeby ocenić umiejętności zarządzającego na tle rynku', 'Żeby wyznaczyć opłatę za zarządzanie', 'Żeby ustalić kurs akcji'], c: 0 }
        ]
    },
    dywersyfikacja: {
        title: 'Dywersyfikacja', icon: '🧺',
        text: 'Dywersyfikacja to rozłożenie pieniędzy na wiele spółek i sektorów. Zmniejsza ryzyko jednej wpadki (bankructwo, afera), ale nie chroni przed spadkiem całego rynku. Zbyt duża liczba pozycji rozmywa przewagę z dobrych wyborów.',
        example: () => { const d = typeof getDiversificationStats === 'function' && playerFund ? getDiversificationStats() : null; return d ? `Twój fundusz: ${d.count} spółek, największa pozycja ${(d.maxShare * 100).toFixed(0)}% aktywów.` : ''; },
        quiz: [
            { q: 'Przed jakim ryzykiem dywersyfikacja NIE chroni?', a: ['Spadkiem całego rynku', 'Bankructwem jednej spółki', 'Aferą w jednej firmie'], c: 0 },
            { q: 'Masz 90% aktywów w jednej spółce. To…', a: ['bardzo duże ryzyko koncentracji', 'dobra dywersyfikacja', 'bez znaczenia'], c: 0 },
            { q: 'Lepsza dywersyfikacja to 5 spółek…', a: ['z różnych sektorów', 'z jednego sektora', 'o tej samej nazwie'], c: 0 }
        ]
    },
    zmiennosc: {
        title: 'Zmienność i obsunięcie', icon: '🎢',
        text: 'Zmienność to skala wahań wartości. Obsunięcie (drawdown) to spadek od szczytu. Klienci boją się dużych obsunięć — nawet jeśli wynik końcowy jest dobry. Dlatego liczy się nie tylko zysk, ale i droga do niego.',
        example: () => playerFund ? `Twoje największe obsunięcie w tym okresie: ${(playerFund.current.maxDrawdown * 100).toFixed(1)}%.` : '',
        quiz: [
            { q: 'Fundusz rośnie do 120, spada do 90, wraca do 110. Obsunięcie od szczytu = ?', a: ['25%', '10%', '30%'], c: 0 },
            { q: 'Po spadku o 50% ile trzeba zarobić, żeby wrócić do punktu wyjścia?', a: ['100%', '50%', '25%'], c: 0 },
            { q: 'Dlaczego ostrożni klienci uciekają przy dużej zmienności?', a: ['Boją się strat, nawet przejściowych', 'Bo rośnie opłata', 'Bo spada inflacja'], c: 0 }
        ]
    },
    obligacje: {
        title: 'Obligacje i ryzyko kredytowe', icon: '📄',
        text: 'Obligacja to pożyczka dla emitenta: dostajesz odsetki (kupon) i zwrot nominału na koniec. Im bardziej ryzykowny emitent, tym wyższe oprocentowanie — to zapłata za ryzyko niewypłacalności. Skarb Państwa płaci najmniej, bo jest najbezpieczniejszy.',
        example: () => `Stopa bazowa Banku Centralnego: ${((centralBank?.baseInterestRate || 0) * 100).toFixed(2)}% — obligacje firm płacą więcej o premię za ryzyko.`,
        quiz: [
            { q: 'Dlaczego obligacja ryzykownej firmy płaci więcej niż skarbowa?', a: ['To premia za ryzyko niewypłacalności', 'Bo firmy są bogatsze od państwa', 'Bo ma krótszy termin'], c: 0 },
            { q: 'Emitent ogłasza niewypłacalność. Co tracisz?', a: ['Kolejne kupony i często część nominału', 'Nic — obligacje są gwarantowane', 'Tylko ostatni kupon'], c: 0 },
            { q: 'Obligacja 1000 PLN z kuponem 6% rocznie płaci rocznie…', a: ['60 PLN', '6 PLN', '600 PLN'], c: 0 }
        ]
    },
    lokata: {
        title: 'Lokata, stopy procentowe i inflacja', icon: '🏧',
        text: 'Lokata daje pewne odsetki, ale jeśli inflacja jest wyższa, realnie tracisz siłę nabywczą. Klienci porównują wynik funduszu z lokatą i inflacją — fundusz, który zarabia mniej niż lokata, traci zaufanie.',
        example: () => `Inflacja: ${((macro?.inflation || 0) * 100).toFixed(1)}%, stopa lokat: ${(getDepositRate() * 100).toFixed(1)}% — realna stopa: ${((getDepositRate() - (macro?.inflation || 0)) * 100).toFixed(1)} pkt proc.`,
        quiz: [
            { q: 'Lokata 5%, inflacja 7%. Realny zysk to około…', a: ['−2%', '+5%', '+12%'], c: 0 },
            { q: 'Bank Centralny podnosi stopy. Lokaty zwykle…', a: ['drożeją (wyższe oprocentowanie)', 'tanieją', 'znikają'], c: 0 },
            { q: 'Dlaczego fundusz musi pobić lokatę?', a: ['Bo klienci mogą wybrać bezpieczną lokatę zamiast funduszu', 'Bo tak każe GIG', 'Bo lokaty są zakazane'], c: 0 }
        ]
    },
    fuzje: {
        title: 'Fuzje i przejęcia', icon: '🤝',
        text: 'Przejęcie to zakup kontroli nad spółką — zwykle z premią ponad kurs, bo kupujący płaci za kontrolę. Akcjonariusze celu mogą sprzedać po cenie oferty albo głosować przeciw; zarząd może się bronić (pigułka, Biały Rycerz, negocjacje).',
        example: () => { const s = stocks.find(x => x.mergerProcess && !x.isBankrupt); return s ? `Trwa proces: ${s.name} (etap ${s.mergerProcess.stage}/7).` : 'Na rynku nie trwa teraz żadne przejęcie.'; },
        quiz: [
            { q: 'Dlaczego oferta przejęcia zwykle jest powyżej kursu?', a: ['Kupujący płaci premię za kontrolę', 'Bo kurs zawsze jest za niski', 'Bo tak każe giełda'], c: 0 },
            { q: 'Akcje celu przejęcia zwykle po ogłoszeniu oferty…', a: ['rosną w stronę ceny oferty', 'spadają do zera', 'się nie zmieniają'], c: 0 },
            { q: 'Co robi „Biały Rycerz”?', a: ['Składa konkurencyjną, przyjazną ofertę', 'Kupuje akcje agresora', 'Emituje nowe akcje'], c: 0 }
        ]
    },
    walne: {
        title: 'Walne zgromadzenie i ład korporacyjny', icon: '🗳️',
        text: 'Akcjonariusze decydują na walnym zgromadzeniu: dywidenda, zarząd, emisje, przejęcia. Głos ma wagę udziału. Od kilku procent możesz zgłaszać wnioski, od ok. 20% masz miejsce w radzie nadzorczej, powyżej 50% kontrolujesz spółkę.',
        example: () => { const s = stocks.find(x => x.governance?.pendingAgm && (playerPortfolio[x.symbol]?.shares || 0) > 0); return s ? `Najbliższe walne w Twojej spółce: ${s.name}.` : ''; },
        quiz: [
            { q: 'Masz 30% akcji. Czy możesz sam przegłosować uchwałę?', a: ['Nie, potrzebujesz większości głosów obecnych', 'Tak, zawsze', 'Tylko w sprawie dywidendy'], c: 0 },
            { q: 'Kto wybiera radę nadzorczą?', a: ['Akcjonariusze na walnym', 'Prezes spółki', 'Giełda'], c: 0 },
            { q: 'Część drobnych akcjonariuszy nie głosuje. Jaki to ma skutek?', a: ['Duży pakiet ma większą siłę wśród obecnych', 'Uchwały są nieważne', 'Wszystkie uchwały przechodzą'], c: 0 }
        ]
    },
    etf: {
        title: 'ETF i fundusze indeksowe', icon: '🧾',
        text: 'ETF to fundusz notowany na giełdzie, który kupuje koszyk spółek (np. indeks). Daje tanią dywersyfikację jedną transakcją, ale nie pobije rynku — będzie miał wynik koszyka minus opłaty.',
        example: () => { const e = (typeof etfs !== 'undefined' ? etfs : [])[0]; return e ? `${e.name}: ${Object.keys(e.holdings || {}).length} spółek w koszyku.` : ''; },
        quiz: [
            { q: 'Główna zaleta ETF?', a: ['Dywersyfikacja jedną transakcją', 'Gwarancja zysku', 'Brak ryzyka'], c: 0 },
            { q: 'ETF na indeks w porównaniu z indeksem da wynik…', a: ['zbliżony, pomniejszony o koszty', 'zawsze dwa razy lepszy', 'niezależny od indeksu'], c: 0 },
            { q: 'Dlaczego zarządzający aktywnie nie trzyma wszystkiego w ETF?', a: ['Bo wtedy nie pobije benchmarku', 'Bo ETF są zakazane', 'Bo ETF nie mają spółek'], c: 0 }
        ]
    },
    przeplywy: {
        title: 'Przepływy pieniężne', icon: '💧',
        text: 'Zysk w rachunku wyników to nie to samo co gotówka. Przepływy z działalności pokazują, ile pieniędzy faktycznie wpłynęło. Zdrowa spółka zamienia większość zysku w gotówkę; jeśli zysk rośnie, a gotówka nie — sprzedaż może być „na papierze” (należności, których nikt nie zapłaci).',
        example: () => { const s = pickListed(x => (x.fundamentals.history || []).some(q => Number.isFinite(q.ocf)))[0]; const q = s?.fundamentals.history.slice(-1)[0]; return q && Number.isFinite(q.ocf) ? `${s.name}: ostatni kwartał zysk ${formatZl(q.netIncome, 0)}, gotówka z działalności ${formatZl(q.ocf, 0)}.` : ''; },
        quiz: [
            { q: 'Spółka ma 10 mln PLN zysku, ale 1 mln PLN gotówki z działalności. To…', a: ['sygnał ostrzegawczy — zysk mało „gotówkowy”', 'świetny wynik', 'bez znaczenia'], c: 0 },
            { q: 'Dlaczego amortyzację dodaje się do zysku przy liczeniu gotówki?', a: ['To koszt bez wydatku pieniędzy w tym okresie', 'Bo to przychód', 'Bo tak każe podatek'], c: 0 },
            { q: 'Rosnące należności przy stałej sprzedaży oznaczają, że…', a: ['klienci płacą coraz później (albo sprzedaż jest fikcyjna)', 'spółka ma więcej gotówki', 'spada zadłużenie'], c: 0 }
        ]
    },
    kreatywna: {
        title: 'Kreatywna księgowość', icon: '🎭',
        text: 'Zarząd pod presją może „poprawiać” wyniki: księgować sprzedaż, za którą nikt nie zapłaci, odraczać koszty, trafiać idealnie w oczekiwania. Prędzej czy później przychodzi korekta i kurs gwałtownie spada. Sygnały: zysk bez gotówki, puchnące należności, zmiany audytora, wyniki zawsze minimalnie nad konsensusem.',
        example: () => { const s = stocks.filter(x => x.fraudHistory?.length).sort((a, b) => b.fraudHistory.slice(-1)[0].quarter - a.fraudHistory.slice(-1)[0].quarter)[0]; return s ? `Ostatnia korekta: ${s.name} — odpis ${formatZl(s.fraudHistory.slice(-1)[0].writeOff, 0)}.` : 'Jeszcze żadna spółka nie musiała korygować wyników.'; },
        quiz: [
            { q: 'Który zestaw najbardziej sugeruje zawyżanie zysków?', a: ['Zysk rośnie, gotówka spada, należności puchną', 'Wysoka dywidenda i brak długu', 'Spadek kursu po słabym raporcie'], c: 0 },
            { q: 'Co zwykle dzieje się z kursem po ujawnieniu oszustwa?', a: ['Gwałtowny spadek', 'Wzrost — bo zarząd się zmienia', 'Nic'], c: 0 },
            { q: 'Dlaczego częsta zmiana audytora jest podejrzana?', a: ['Spółka może szukać mniej dociekliwego badania', 'Bo audyt jest tańszy', 'To zawsze dobry znak'], c: 0 }
        ]
    },
    audyt: {
        title: 'Audyt', icon: '🔍',
        text: 'Audytor niezależnie sprawdza sprawozdania: czy przychody i należności istnieją, czy majątek jest wyceniony uczciwie. Badanie kosztuje i trwa, ale chroni przed dużą stratą — zwłaszcza przed dużą inwestycją. Audytor też bywa omylny.',
        example: () => { const s = stocks.find(x => x.audit?.done); return s ? `Ostatni audyt zlecony przez fundusz: ${s.name} — ${s.audit.clean ? 'bez zastrzeżeń' : 'wykryte nieprawidłowości'}.` : 'Fundusz nie zlecał jeszcze audytu.'; },
        quiz: [
            { q: 'Kiedy zlecenie audytu ma największy sens?', a: ['Przed dużą inwestycją w spółkę z czerwonymi flagami', 'Po sprzedaży wszystkich akcji', 'Nigdy — raporty wystarczą'], c: 0 },
            { q: 'Czy „czysty” audyt gwarantuje brak oszustwa?', a: ['Nie — audytor może coś przeoczyć', 'Tak, zawsze', 'Tylko w bankach'], c: 0 },
            { q: 'Co audytor sprawdza?', a: ['Czy sprawozdania odpowiadają rzeczywistości', 'Kurs akcji', 'Pensję prezesa w prasie'], c: 0 }
        ]
    },
    wplyw: {
        title: 'Płynność rynku i wpływ zlecenia', icon: '🌊',
        text: 'Gdy w obrocie jest mało akcji, duże zlecenie samo przesuwa kurs: kupując, podbijasz cenę, sprzedając — zbijasz. Do tego dochodzi prowizja rynku. Duży fundusz w małej spółce płaci więc więcej, niż pokazuje kurs — dlatego dzieli zlecenia albo wybiera płynne spółki.',
        example: () => { const s = pickListed().sort((a, b) => getFreeFloatShares(a) - getFreeFloatShares(b))[0]; return s ? `Najmniej płynna: ${s.name} — w wolnym obrocie ${getFreeFloatShares(s).toLocaleString('pl-PL')} akcji.` : ''; },
        quiz: [
            { q: 'Kupujesz 20% wolnego obrotu małej spółki jednym zleceniem. Co się stanie?', a: ['Sam podbijesz kurs i kupisz drożej', 'Kupisz po kursie z ekranu', 'Kurs spadnie'], c: 0 },
            { q: 'Jak ograniczyć wpływ dużego zlecenia?', a: ['Podzielić je na mniejsze części w czasie', 'Kupić wszystko naraz', 'Kupić na koncie prywatnym'], c: 0 },
            { q: 'Co oznacza „płynna spółka”?', a: ['Dużo akcji w obrocie, łatwo kupić i sprzedać', 'Spółka z dużą gotówką', 'Spółka bez długu'], c: 0 }
        ]
    },
    bankructwo: {
        title: 'Bankructwo', icon: '💥',
        text: 'Spółka bankrutuje, gdy nie jest w stanie spłacać zobowiązań. Akcjonariusze są na końcu kolejki — zwykle tracą wszystko. Sygnały ostrzegawcze: rosnące zadłużenie, straty, spadająca gotówka, słaba kondycja.',
        example: () => { const n = stocks.filter(s => s.isBankrupt).length; return n ? `W tej grze zbankrutowało już ${n} spółek.` : 'Jeszcze żadna spółka nie zbankrutowała.'; },
        quiz: [
            { q: 'Kto dostaje pieniądze jako ostatni przy bankructwie?', a: ['Akcjonariusze', 'Banki-wierzyciele', 'Pracownicy'], c: 0 },
            { q: 'Który zestaw sygnałów najbardziej wskazuje ryzyko bankructwa?', a: ['Straty, rosnący dług, mało gotówki', 'Wysoka dywidenda i brak długu', 'Rosnące przychody i zysk'], c: 0 },
            { q: 'Czy niski kurs akcji oznacza, że spółka jest tania?', a: ['Niekoniecznie — może być bliska bankructwa', 'Tak, zawsze', 'Tak, jeśli kurs < 1 PLN'], c: 0 }
        ]
    }
};

// ---------------------------------------------------------------------------------
// 0.13: hasła o społeczeństwie i rynku pracy (dopisane do ACADEMY_ENTRIES)
// ---------------------------------------------------------------------------------

function societyReady() {
    return typeof society === 'object' && society && society.classes;
}

function workforceListed() {
    return typeof getWorkforceCompanies === 'function' ? getWorkforceCompanies() : [];
}

Object.assign(ACADEMY_ENTRIES, {
    strukturaSpoleczna: {
        title: 'Struktura społeczna a popyt', icon: '👥',
        text: 'Ludzie z różnych klas wydają inaczej: zamożni więcej na turystykę, nieruchomości i finanse, biedniejsi — na żywność i podstawowe usługi. Gdy rośnie klasa średnia, rośnie popyt na dobra „wyższego rzędu”. Indeks popytu w zakładce Kraj streszcza strukturę klas w jednej liczbie (start = 1,00).',
        example: () => societyReady() ? `Dziś: klasa biedna ${(society.classes.poor * 100).toFixed(1)}%, indeks popytu ${society.demandIndex.toFixed(3)}.` : '',
        quiz: [
            { q: 'Klasa średnia rośnie kosztem biednej. Co dzieje się z indeksem popytu?', a: ['Rośnie', 'Spada', 'Nie zmienia się'], c: 0 },
            { q: 'Która branża najbardziej korzysta na bogaceniu się społeczeństwa?', a: ['Turystyka', 'Żywność', 'Energia'], c: 0 },
            { q: 'Co najszybciej przesuwa ludzi w górę drabiny zamożności?', a: ['Wzrost PKB przy niskim bezrobociu', 'Wysoka inflacja', 'Recesja'], c: 0 }
        ]
    },
    elastycznosc: {
        title: 'Dobra luksusowe i podstawowe (elastyczność)', icon: '🛍️',
        text: 'Elastyczność dochodowa mówi, jak mocno popyt na dobro reaguje na zmianę zamożności. Dobra luksusowe (podróże, gry, mieszkania) mają elastyczność > 1 — w dobrych czasach rosną szybciej niż gospodarka, w złych spadają mocniej. Dobra podstawowe (żywność) mają elastyczność < 1: to sektory defensywne.',
        example: () => `W grze: Turystyka ×${DEMAND_ELASTICITY['Turystyka']}, Gaming ×${DEMAND_ELASTICITY['Gaming']}, Żywność ×${DEMAND_ELASTICITY['Żywność']} — tyle razy mocniej przychody reagują na indeks popytu.`,
        quiz: [
            { q: 'Społeczeństwo ubożeje. Który sektor ucierpi najmniej?', a: ['Żywność', 'Turystyka', 'Nieruchomości'], c: 0 },
            { q: 'Elastyczność dochodowa większa od 1 oznacza…', a: ['dobro luksusowe — popyt rośnie szybciej niż dochody', 'dobro podstawowe', 'brak reakcji na dochody'], c: 0 },
            { q: 'Dlaczego spółki spożywcze nazywa się defensywnymi?', a: ['Ludzie jedzą także w kryzysie', 'Mają zawsze wysoką dywidendę', 'Państwo gwarantuje ich zyski'], c: 0 }
        ]
    },
    ryzykoBinarne: {
        title: 'Ryzyko binarne (biotechnologia)', icon: '🧪',
        text: 'Wynik badania klinicznego jest zero-jedynkowy: lek przechodzi fazę albo nie. Kurs biotechu potrafi wtedy wzrosnąć o połowę albo spaść o połowę w jeden dzień. Wyniku nie da się przewidzieć z wykresu — zarządzający dzieli więc ryzyko: mała pozycja w kilku biotechach zamiast jednej dużej.',
        example: () => { const s = stocks.find(x => x.clinicalTrial && !x.isBankrupt); return s ? `${s.name}: lek ${s.clinicalTrial.drug} w fazie ${CLINICAL_PHASES[s.clinicalTrial.phase].name}, wynik ok. kwartału ${s.clinicalTrial.dueQuarter}. Szanse faz: I 60%, II 45%, III 60%.` : 'Szanse faz badań: I 60%, II 45%, III 60% — łącznie lek przechodzi wszystkie fazy w ok. 16% przypadków.'; },
        quiz: [
            { q: 'Lek przechodzi fazy z szansą 60%, 45% i 60%. Jaka jest szansa przejścia wszystkich trzech?', a: ['ok. 16%', 'ok. 55%', 'ok. 45%'], c: 0 },
            { q: 'Jak ograniczyć ryzyko binarne w portfelu?', a: ['kilka małych pozycji w różnych biotechach', 'jedna duża pozycja przed wynikiem', 'kupić tuż przed ogłoszeniem'], c: 0 },
            { q: 'Czy wynik badania da się odczytać z wykresu przed ogłoszeniem?', a: ['nie — jest losowany w chwili ogłoszenia', 'tak, z wolumenu', 'tak, z poprzedniej fazy'], c: 0 }
        ]
    },
    spinoff: {
        title: 'Spin-off i dywidenda rzeczowa', icon: '✂️',
        text: 'Spin-off to wydzielenie części spółki do nowej, osobno notowanej firmy. Akcjonariusze nie płacą: każdy dostaje akcje córki proporcjonalnie do akcji matki (dywidenda rzeczowa). W dniu wydzielenia kurs matki spada mniej więcej o wartość wydzielonej części, więc wartość pozycji się nie zmienia. Rynek zwykle nagradza zapowiedź (znika dyskonto konglomeratu), ale robi to od razu — po ogłoszeniu nie ma darmowego zysku. W wariancie carve-out matka zachowuje większość akcji córki (51–80%), a córka zostaje spółką zależną.',
        example: () => { const e = spinoffLog[0]; const c = e && stocks.find(s => s.symbol === e.child); return c ? `${c.name} (${c.symbol}) wydzielona z ${e.parent}${e.carve ? ` — carve-out, matka ma ${(e.keep * 100).toFixed(0)}%` : ''}.` : 'Spółka z dwoma niepowiązanymi segmentami (np. Technologia i Energia) może wydzielić mniejszy segment, jeśli ma ≥ 30% przychodów.'; },
        quiz: [
            { q: 'Ile płaci akcjonariusz za akcje spółki wydzielonej w spin-offie?', a: ['nic — dostaje je proporcjonalnie do akcji matki', 'cenę rynkową', 'połowę ceny rynkowej'], c: 0 },
            { q: 'Co dzieje się z kursem matki w dniu wydzielenia?', a: ['spada o wartość wydzielonej części', 'rośnie o wartość córki', 'nie zmienia się'], c: 0 },
            { q: 'Kiedy rynek wycenia korzyść ze spin-offu?', a: ['od razu przy zapowiedzi', 'dopiero rok po wydzieleniu', 'nigdy'], c: 0 }
        ]
    },
    sotp: {
        title: 'Wycena sumy części (SOTP)', icon: '🧮',
        text: 'Sum-of-the-parts: wartość spółki z kilkoma segmentami liczy się jako sumę wartości każdego segmentu, wycenionego mnożnikami jego własnego sektora. Konglomerat z niepowiązanymi segmentami często kosztuje mniej niż suma części (dyskonto konglomeratu, w grze do −10%). Wydzielenie segmentu usuwa to dyskonto — dlatego zapowiedź spin-offu podnosi kurs, a po wydzieleniu matka + córka są warte tyle co przed, plus efekt zapowiedzi.',
        example: () => { const s = stocks.find(x => !x.isBankrupt && !x.assetType && getStockSegments(x).length >= 2 && getConglomerateDiscount(x) > 0); return s ? `${s.name}: segmenty ${getStockSegments(s).map(g => `${g.sector} ${(g.share * 100).toFixed(0)}%`).join(', ')}, dyskonto konglomeratu ${(getConglomerateDiscount(s) * 100).toFixed(0)}%.` : 'Dyskonto konglomeratu: −4% za każdy segment niepowiązany z głównym, najwyżej −10%.'; },
        quiz: [
            { q: 'Czym jest wycena SOTP?', a: ['sumą wartości segmentów wycenianych osobno', 'wyceną z jednego C/Z całej spółki', 'ceną z ostatniej transakcji'], c: 0 },
            { q: 'Co usuwa dyskonto konglomeratu?', a: ['wydzielenie niepowiązanego segmentu', 'emisja akcji', 'skup akcji'], c: 0 },
            { q: 'Ile wynosi dyskonto konglomeratu w grze najwyżej?', a: ['10%', '50%', '0%'], c: 0 }
        ]
    },
    grupaKapitalowa: {
        title: 'Grupa kapitałowa i holding', icon: '🏢',
        text: 'Grupa kapitałowa to spółka matka razem ze spółkami zależnymi, w których ma ponad 50% głosów. Holding sam niczego nie produkuje — zarządza pakietami akcji. W grze koncern 🏢 to spółka z czołówki kapitalizacji (górne 15%), która ma co najmniej 2 segmenty działalności, w tym jeden niepowiązany z głównym, albo 2 spółki zależne, albo 2 segmenty i spółkę zależną. Wartość grupy liczy się sumą części: każdy segment wyceniony mnożnikiem swojego sektora plus rynkowa wartość pakietów w zależnych. Gdy kurs jest niżej niż suma części, mówimy o dyskoncie holdingowym; gdy wyżej — o premii.',
        example: () => { const s = stocks.find(x => typeof isConcern === 'function' && isConcern(x)); if (!s) return 'Koncern: górne 15% kapitalizacji oraz segmenty niepowiązane, ≥ 2 spółki zależne albo ≥ 2 segmenty i spółka zależna.'; const p = getSumOfParts(s); return `${s.name}: kapitalizacja ${formatZl(p.cap, 0)}, suma części ${formatZl(p.total, 0)}${p.premium !== null ? ` (${p.premium >= 0 ? 'premia' : 'dyskonto'} ${(Math.abs(p.premium) * 100).toFixed(0)}%)` : ''}.`; },
        quiz: [
            { q: 'Kiedy spółka jest zależna od matki?', a: ['gdy matka ma ponad 50% głosów', 'gdy matka ma 5% akcji', 'gdy działają w tym samym sektorze'], c: 0 },
            { q: 'Kurs koncernu jest niższy od sumy części. To…', a: ['dyskonto holdingowe', 'premia holdingowa', 'dywidenda rzeczowa'], c: 0 },
            { q: 'Jak wycenia się pakiet akcji w spółce zależnej w sumie części?', a: ['wartością rynkową pakietu', 'ceną zakupu sprzed lat', 'nie wlicza się go'], c: 0 }
        ]
    },
    ryzykoKontrahenta: {
        title: 'Ryzyko kontrahenta', icon: '⛓️',
        text: 'Kooperacja to umowa dostawca–odbiorca między spółkami z branż powiązanych (np. Chemia i Przemysł). Daje obu stronom korzyść: w grze +0,3 pp wzrostu przychodów na kwartał i +0,5 pp marży, liczone tylko od segmentu, którego dotyczy umowa. Ma też koszt ukryty: los spółki zależy od partnera. Strajk, bankructwo albo korekta wyników kooperanta przenosi połowę szoku na drugą stronę. Zerwanie umowy przed terminem kosztuje karę umowną. Dlatego analityk patrzy nie tylko na spółkę, ale też na jej głównych kontrahentów.',
        example: () => { const c = cooperations[0]; if (!c) return 'Koncern zawiera najwyżej 3 kooperacje, każdą na 8–16 kwartałów.'; const a = stocks.find(s => s.symbol === c.a), b = stocks.find(s => s.symbol === c.b); return `${a?.name || c.a} (${c.segA}) i ${b?.name || c.b} (${c.segB}): kooperacja do kw. ${c.end}.`; },
        quiz: [
            { q: 'Kooperant ogłasza strajk. Co dzieje się z drugą stroną umowy?', a: ['traci część przychodów segmentu objętego umową', 'nic — umowa chroni przed wszystkim', 'zyskuje, bo przejmuje klientów'], c: 0 },
            { q: 'Od czego liczona jest premia z kooperacji w grze?', a: ['od udziału segmentu, którego dotyczy umowa', 'od całych przychodów spółki', 'od kapitalizacji'], c: 0 },
            { q: 'Co płaci strona zrywająca umowę przed terminem?', a: ['karę umowną drugiej stronie', 'podatek od kooperacji', 'nic'], c: 0 }
        ]
    },
    podmiotyPowiazane: {
        title: 'Transakcje z podmiotami powiązanymi', icon: '🚩',
        text: 'Gdy jeden właściciel kontroluje dwie spółki, ale ma w nich różne udziały (np. 80% i 20%), opłaca mu się przerzucać zysk tam, gdzie ma więcej — przez ceny w umowach między spółkami. To tunelowanie: akcjonariusze mniejszościowi spółki poszkodowanej tracą. W grze taka kooperacja dostaje czerwoną flagę „transakcje z podmiotami powiązanymi” (Księgowy, poziom 4). Pakiet mniejszościowy może złożyć skargę do KNF; jeśli warunki były nierynkowe i KNF to wykaże, beneficjent zwraca korzyść z grzywną, a umowa wraca do cen rynkowych.',
        example: () => { const c = cooperations.find(x => x.flag); if (!c) return 'Przykład: właściciel ma 80% spółki A i 20% spółki B — umowa A–B to transakcja z podmiotem powiązanym.'; return `${c.flag.name}: ${(c.flag.pctA * 100).toFixed(0)}% w ${c.a} i ${(c.flag.pctB * 100).toFixed(0)}% w ${c.b} — kooperacja z czerwoną flagą.`; },
        quiz: [
            { q: 'Właściciel ma 80% spółki A i 20% spółki B. Gdzie opłaca mu się „przenieść” zysk?', a: ['do spółki A', 'do spółki B', 'nigdzie — to bez różnicy'], c: 0 },
            { q: 'Kto traci na tunelowaniu?', a: ['akcjonariusze mniejszościowi spółki poszkodowanej', 'tylko państwo', 'nikt'], c: 0 },
            { q: 'Co może zrobić akcjonariusz mniejszościowy?', a: ['złożyć skargę do KNF', 'zablokować umowę sam', 'nic'], c: 0 }
        ]
    },
    premiaKontrola: {
        title: 'Premia za kontrolę', icon: '💼',
        text: 'Pakiet kontrolny (ponad 50% głosów) jest wart więcej niż ta sama liczba akcji kupowana pojedynczo: daje władzę nad zarządem, dywidendą, transferem zysku i strategią. Dlatego kupujący płaci premię za kontrolę — w grze 15–30% ponad kurs. Matka może sprzedać pakiet córki innemu inwestorowi (koncernowi albo botowi); zysk z premii trafia do matki.',
        example: () => { const s = stocks.find(x => x.tender); return s ? `${s.tender.buyerName} kupił pakiet kontrolny ${s.name} po ${formatZl(s.tender.price)}.` : 'Kurs 100 PLN, premia za kontrolę 20% → pakiet kontrolny sprzedany po 120 PLN za akcję.'; },
        quiz: [
            { q: 'Dlaczego za pakiet kontrolny płaci się więcej niż kurs?', a: ['daje władzę nad spółką', 'bo akcje są rzadkie', 'z powodu podatku'], c: 0 },
            { q: 'Ile wynosi premia za kontrolę w grze?', a: ['15–30%', '0%', '100%'], c: 0 },
            { q: 'Kto dostaje premię przy sprzedaży pakietu córki?', a: ['spółka matka', 'akcjonariusze mniejszościowi córki', 'giełda'], c: 0 }
        ]
    },
    wezwanie: {
        title: 'Wezwanie i ochrona mniejszości', icon: '📣',
        text: 'Kto przejmuje kontrolę nad spółką (ponad 50%), musi ogłosić wezwanie: zaproponować wszystkim pozostałym akcjonariuszom odkupienie akcji po tej samej cenie, jaką zapłacił za pakiet kontrolny. Dzięki temu premia za kontrolę nie trafia tylko do jednego sprzedającego, a mniejszościowi mogą wyjść, jeśli nie ufają nowemu właścicielowi. Można też zostać — wtedy dalej jest się akcjonariuszem mniejszościowym.',
        example: () => { const s = stocks.find(x => x.tender); return s ? `${s.name}: wezwanie ${s.tender.buyerName} po ${formatZl(s.tender.price)} do kw. ${s.tender.until}.` : 'Nowy właściciel zapłacił 120 PLN za akcję pakietu — w wezwaniu każdy może sprzedać po 120 PLN.'; },
        quiz: [
            { q: 'Po jakiej cenie jest wezwanie po zakupie pakietu kontrolnego?', a: ['po tej samej co za pakiet', 'po kursie z dnia wezwania', 'po wartości księgowej'], c: 0 },
            { q: 'Czy akcjonariusz musi sprzedać w wezwaniu?', a: ['nie — może zostać', 'tak, zawsze', 'tylko fundusze'], c: 0 },
            { q: 'Kogo chroni wezwanie?', a: ['akcjonariuszy mniejszościowych', 'tylko kupującego', 'zarząd'], c: 0 }
        ]
    },
    squeezeOut: {
        title: 'Przymusowy wykup (squeeze-out)', icon: '🧲',
        text: 'Gdy matka ma co najmniej 90% akcji córki, może przymusowo wykupić resztę — mniejszościowi muszą sprzedać. W grze cena wykupu zawiera premię 10–20% ponad kurs. Potem spółki się łączą: segment córki wraca do matki, córka znika z giełdy i zwalnia miejsce w limicie spółek. Pakiet mniejszościowy zamienia się w gotówkę.',
        example: () => { const s = stocks.find(x => (x.absorbedCompanies || []).some(a => a && a.quarter !== undefined)); const a = s && s.absorbedCompanies.filter(x => x.quarter !== undefined).at(-1); return a ? `${s.name} wchłonęła ${a.name} (kw. ${a.quarter}).` : 'Matka z 92% córki wykupuje pozostałe 8% po kursie + 15% i łączy spółki.'; },
        quiz: [
            { q: 'Od jakiego udziału matka może przymusowo wykupić resztę akcji w grze?', a: ['90%', '50%', '75%'], c: 0 },
            { q: 'Co dostaje akcjonariusz mniejszościowy przy squeeze-oucie?', a: ['gotówkę po cenie wykupu', 'akcje matki', 'nic'], c: 0 },
            { q: 'Co dzieje się z córką po wchłonięciu?', a: ['znika z giełdy, segment wraca do matki', 'zostaje notowana', 'bankrutuje'], c: 0 }
        ]
    },
    fazySpolki: {
        title: 'Fazy rozwoju spółki', icon: '🔄',
        text: 'Każda spółka jest w jakiejś fazie cyklu życia. Fazy zwykłe: Wzrost (przychody +1,5 pp na kwartał), Stabilność (bez premii, mniejsza zmienność), Spadek (−1,5 pp, kurs pod presją, badania wolniej), Reorganizacja (−0,5 pp, najwyższa zmienność; kończy się stabilnością przy kondycji ≥ 2 albo spadkiem przy < −3). Fazy rzadkie i czasowe: Złoty Rok ✨ (4 kwartały, +3 pp, kurs szybciej w górę), Impuls Innowacji 💡 (4–8 kwartałów, badania o 50% szybsze, +0,5 pp), Zejście w Cień 👻 (3–6 kwartałów, −4 pp, silna presja i zmienność). Po fazie czasowej spółka wraca do poprzedniej. Faza zmienia przychody, więc zysk i wartość godziwą — kurs idzie za nimi z opóźnieniem.',
        example: () => { const s = stocks.find(x => !x.isBankrupt && !x.assetType && [CORPORATE_PHASES.GOLDEN_YEAR, CORPORATE_PHASES.INNOVATION_PUSH, CORPORATE_PHASES.SHADOW_DESCENT].includes(x.corporatePhase)) || stocks.find(x => !x.isBankrupt && !x.assetType && x.corporatePhase); return s ? `${s.name}: ${getCorporatePhaseTooltip(s.corporatePhase)}` : 'Znacznik fazy widać w tabeli rynku przy cenie (szkolenie Analityk Finansowy).'; },
        quiz: [
            { q: 'Która faza przyspiesza badania spółki o 50%?', a: ['Impuls Innowacji', 'Złoty Rok', 'Stabilność'], c: 0 },
            { q: 'Ile trwa Złoty Rok?', a: ['4 kwartały', 'bez limitu', '1 kwartał'], c: 0 },
            { q: 'Co dzieje się po zakończeniu fazy czasowej (np. Zejścia w Cień)?', a: ['spółka wraca do poprzedniej fazy', 'spółka bankrutuje', 'faza trwa do końca gry'], c: 0 }
        ]
    },
    dlugiHoryzont: {
        title: 'Długi horyzont inwestycji (atom)', icon: '☢️',
        text: 'Blok jądrowy buduje się latami: przez cały ten czas spółka wydaje gotówkę, a przychodu z inwestycji nie ma. Na końcu decyduje regulator — może opóźnić start. Potem blok daje stabilny przychód przez dekady. Taka inwestycja obniża dziś zyski i wolne przepływy, a jej wartość zależy od cierpliwości kapitału i od polityki (kontrakty z państwem).',
        example: () => { const s = stocks.find(x => x.nuclearBlock && !x.isBankrupt); return s ? `${s.name}: blok jądrowy — etap ${s.nuclearBlock.stage === 'operating' ? 'działa' : s.nuclearBlock.stage === 'approval' ? 'czeka na regulatora' : 'budowa'}, wydano ${formatZl(s.nuclearBlock.spent, 0)} z ${formatZl(s.nuclearBlock.cost, 0)}.` : 'Budowa bloku trwa 8–16 kwartałów, a regulator może dołożyć 2–4 kwartały opóźnienia.'; },
        quiz: [
            { q: 'Co dzieje się z wolnymi przepływami pieniężnymi w trakcie budowy bloku?', a: ['są niższe — gotówka idzie w budowę', 'rosną od pierwszego kwartału', 'nie zmieniają się'], c: 0 },
            { q: 'Kto może opóźnić uruchomienie bloku?', a: ['regulator', 'akcjonariusze mniejszościowi', 'bank centralny'], c: 0 },
            { q: 'Od czego zależą kontrakty z państwem dla elektrowni?', a: ['od partii rządzącej', 'od kursu akcji', 'od liczby akcjonariuszy'], c: 0 }
        ]
    },
    regulacja: {
        title: 'Regulacja (fintech)', icon: '🏛️',
        text: 'Fintech działa na licencji nadzoru finansowego (KNF). Kontrola może przyjść w każdej chwili; firma w słabej kondycji ryzykuje karę albo zakaz przyjmowania nowych klientów, co zatrzymuje wzrost — główny argument za wysoką wyceną fintechu. Ryzyko regulacyjne nie widać w wynikach, dopóki nie nastąpi.',
        example: () => { const s = stocks.find(x => !x.isBankrupt && getSubsectorMechanicShare(x, 'knf') > 0); return s ? `${s.name} (fintech): kondycja ${(Number(s.financialHealth) || 0).toFixed(1)}${isKnfGrowthBlocked(s) ? ' — trwa zakaz nowych klientów' : ''}. Kontrola KNF: ok. 10% szans w roku.` : 'Kontrola KNF: ok. 10% szans w roku; przy słabej kondycji kara albo zakaz nowych klientów na 2 kwartały.'; },
        quiz: [
            { q: 'Co grozi fintechowi w słabej kondycji przy kontroli KNF?', a: ['kara albo zakaz nowych klientów', 'nic, kontrola dotyczy tylko banków', 'automatyczna dywidenda'], c: 0 },
            { q: 'Dlaczego zakaz nowych klientów mocno uderza w kurs fintechu?', a: ['wycena opiera się na szybkim wzroście', 'fintech traci wszystkie aktywa', 'kurs zależy tylko od dywidendy'], c: 0 },
            { q: 'Kiedy ryzyko regulacyjne widać w wynikach spółki?', a: ['dopiero gdy się zmaterializuje', 'zawsze w każdym raporcie', 'nigdy'], c: 0 }
        ]
    },
    dywersyfikacja: {
        title: 'Dywersyfikacja a specjalizacja', icon: '⚖️',
        text: 'Spółka może rosnąć wszerz (nowe segmenty: mniejsze ryzyko jednej branży, ale rozproszona uwaga) albo w głąb (podsektor, nisza: wyższa marża dzięki skupieniu, ale większa zależność od jednego rynku). W grze segment z podsektorem, który daje co najmniej 70% przychodów, ma premię „skupienia” +1,5 pp marży.',
        example: () => { const s = stocks.find(x => !x.isBankrupt && !x.assetType && typeof getFocusMarginAdj === 'function' && getFocusMarginAdj(x) > 0); return s ? `${s.name}: skupiona na ${getMainSubsector(s)} — premia +1,5 pp marży.` : 'Premia skupienia: +1,5 pp marży przy ≥ 70% przychodów z segmentu z podsektorem.'; },
        quiz: [
            { q: 'Co daje spółce specjalizacja (skupienie)?', a: ['wyższą marżę, ale większą zależność od jednego rynku', 'zawsze niższe ryzyko', 'automatycznie wyższą dywidendę'], c: 0 },
            { q: 'Co daje dywersyfikacja segmentów?', a: ['mniejsze ryzyko jednej branży', 'zawsze wyższą wycenę', 'brak kosztów'], c: 0 },
            { q: 'Kiedy w grze działa premia skupienia?', a: ['segment z podsektorem daje ≥ 70% przychodów', 'spółka ma 3 segmenty', 'spółka nie ma podsektora'], c: 0 }
        ]
    },
    synergia: {
        title: 'Synergia', icon: '🔗',
        text: 'Synergia to korzyść z połączenia działalności, które do siebie pasują: wspólni klienci, technologia albo łańcuch dostaw (np. chemia i przemysł, budownictwo i nieruchomości). W grze segmenty z branż powiązanych dają +1 pp marży, a rozszerzenie w branżę powiązaną udaje się w 85% przypadków (niepowiązaną — w 65%).',
        example: () => { const s = stocks.find(x => !x.isBankrupt && !x.assetType && typeof getSynergyMarginAdj === 'function' && getSynergyMarginAdj(x) > 0); return s ? `${s.name}: ${getStockSegments(s).map(seg => seg.sector).join(' + ')} — synergia +1 pp marży.` : 'Przykłady branż powiązanych: Technologia–Gaming, Chemia–Przemysł, Energia–Przemysł, Medycyna–Badania.'; },
        quiz: [
            { q: 'Które rozszerzenie ma większą szansę powodzenia?', a: ['w branżę powiązaną (85%)', 'w dowolną branżę (zawsze 85%)', 'w branżę niepowiązaną'], c: 0 },
            { q: 'Ile daje synergia w grze?', a: ['+1 pp marży', '+10% kursu od razu', 'nic'], c: 0 },
            { q: 'Które segmenty są powiązane?', a: ['Budowlany i Nieruchomości', 'Gaming i Rolnictwo', 'Bankowość i Turystyka'], c: 0 }
        ]
    },
    konglomerat: {
        title: 'Dyskonto konglomeratu', icon: '🏚️',
        text: 'Inwestorzy płacą mniej za spółkę z wieloma niepowiązanymi biznesami: trudniej ją ocenić, a zarząd może przenosić pieniądze między segmentami nieefektywnie. W grze wycena docelowa spada o 4% za każdy niepowiązany segment ponad pierwszy (najwyżej −10%). Rozbicie konglomeratu (np. wydzielenie spółki) często tę wartość odblokowuje.',
        example: () => { const s = stocks.find(x => !x.isBankrupt && !x.assetType && typeof getConglomerateDiscount === 'function' && getConglomerateDiscount(x) > 0); return s ? `${s.name}: dyskonto konglomeratu −${(getConglomerateDiscount(s) * 100).toFixed(0)}% (${getStockSegments(s).map(seg => seg.sector).join(', ')}).` : 'Dyskonto: −4% za każdy niepowiązany segment ponad pierwszy, najwyżej −10%.'; },
        quiz: [
            { q: 'Dlaczego konglomeraty bywają wyceniane taniej?', a: ['trudniej je ocenić i zarządzać kapitałem', 'mają zawsze mniejsze zyski', 'nie płacą podatków'], c: 0 },
            { q: 'Spółka ma segment główny Chemia i dwa niepowiązane. Dyskonto w grze?', a: ['−8%', '−4%', '−20%'], c: 0 },
            { q: 'Czy segment powiązany zwiększa dyskonto?', a: ['nie', 'tak, o 4%', 'tak, o 10%'], c: 0 }
        ]
    },
    segmenty: {
        title: 'Segmenty działalności', icon: '🧩',
        text: 'Duża spółka rzadko robi jedną rzecz. Segmenty to części działalności, np. bank z ubezpieczeniami albo przemysł z energetyką. Wycenę i ryzyko spółki liczy się jako średnią segmentów ważoną ich udziałem w przychodach. Segment główny (największy udział) decyduje, z jakim sektorem porównujemy spółkę.',
        example: () => { const s = bestBy(stocks.filter(x => !x.assetType && !x.isBankrupt && getStockSegments(x).length > 1), x => getStockSegments(x).length); return s ? `${s.name}: ${getStockSegments(s).map(seg => `${seg.sector} ${(seg.share * 100).toFixed(0)}%`).join(', ')} — sektor główny ${getMainSector(s)}.` : ''; },
        quiz: [
            { q: 'Spółka ma 70% przychodów z energetyki i 30% z chemii. Jej sektor główny to…', a: ['Energia', 'Chemia', 'oba po równo'], c: 0 },
            { q: 'Profil ryzyka spółki z kilkoma segmentami to…', a: ['średnia segmentów ważona udziałami', 'profil najmniejszego segmentu', 'zawsze profil rynku'], c: 0 },
            { q: 'Z czyją medianą C/Z porównuje się spółkę wielosegmentową?', a: ['sektora głównego', 'każdego segmentu osobno', 'całego rynku'], c: 0 }
        ]
    },
    kosztPracy: {
        title: 'Koszt pracy i wydajność', icon: '👷',
        text: 'Płace to często największy koszt spółki: od kilku procent przychodów u dewelopera do 40% w usługach. Liczy się nie sama płaca, ale płaca na jednostkę pracy — wydajność. Wyższe płace przy jeszcze wyższej wydajności obniżają koszt. Zakładka Zatrudnienie pokazuje koszt pracy w % przychodów na tle sektora.',
        example: () => { const s = bestBy(workforceListed(), x => x.workforce.laborShare); return s ? `Najbardziej pracochłonna: ${s.name} — koszt pracy ok. ${(s.workforce.laborShare * getLaborCostIndex(s) * 100).toFixed(0)}% przychodów.` : ''; },
        quiz: [
            { q: 'Płace rosną o 5%, wydajność o 10%. Koszt pracy na jednostkę produkcji…', a: ['spada', 'rośnie', 'się nie zmienia'], c: 0 },
            { q: 'W której branży koszt pracy jest zwykle największy względem przychodów?', a: ['Usługi', 'Nieruchomości', 'Energia'], c: 0 },
            { q: 'Koszt pracy 30% przychodów, płace +10%. O ile spada marża (bez innych zmian)?', a: ['O 3 pkt proc.', 'O 10 pkt proc.', 'O 30 pkt proc.'], c: 0 }
        ]
    },
    dzwignia: {
        title: 'Dźwignia operacyjna', icon: '🏋️',
        text: 'Gdy duża część kosztów jest stała albo sztywna (płace, umowy), mała zmiana przychodów mocno zmienia zysk. To dźwignia operacyjna: w dobrych czasach zysk rośnie szybciej niż sprzedaż, w złych — spada szybciej. Strajk, który obniża przychody o 10%, może zabrać dużo więcej niż 10% zysku.',
        example: () => { const s = workforceListed().find(x => x.workforce.strike); return s ? `${s.name}: strajk obniża przychody kwartału o ${(s.workforce.strike.pct * 100).toFixed(0)}%.` : 'Obecnie żadna spółka nie strajkuje.'; },
        quiz: [
            { q: 'Przychody 100, koszty stałe 80, zysk 20. Przychody spadają o 10%. Zysk spada o…', a: ['50%', '10%', '20%'], c: 0 },
            { q: 'Wysoka dźwignia operacyjna oznacza…', a: ['większe wahania zysku niż przychodów', 'wysokie zadłużenie', 'niską wycenę'], c: 0 },
            { q: 'Kiedy dźwignia operacyjna pomaga akcjonariuszom?', a: ['Gdy przychody rosną', 'Gdy przychody spadają', 'Nigdy'], c: 0 }
        ]
    },
    szaraStrefa: {
        title: 'Szara strefa', icon: '🕶️',
        text: 'Zatrudnianie „na czarno” obniża koszty (niższe płace, brak podatków), więc podnosi marżę — dopóki nie przyjdzie Inspekcja Pracy. Kara bywa wielokrotnością zaoszczędzonych pieniędzy, a do tego dochodzi spadek kursu i utrata klientów, którzy nie chcą takich spółek w portfelu. Dla państwa to utracone podatki.',
        example: () => { const s = workforceListed().filter(x => getGreyShare(x) > 0.05).sort((a, b) => getGreyShare(b) - getGreyShare(a))[0]; return s ? `${s.name}: ok. ${(getGreyShare(s) * 100).toFixed(0)}% zatrudnionych bez umów.` : 'Żadna spółka nie ma dziś ponad 5% szarej strefy.'; },
        quiz: [
            { q: 'Dlaczego szara strefa podnosi marżę?', a: ['Niższe płace i brak podatków od pracy', 'Wyższe ceny produktów', 'Lepsza wydajność'], c: 0 },
            { q: 'Co grozi spółce złapanej przez Inspekcję Pracy?', a: ['Kara, spadek kursu i utrata części klientów', 'Nic', 'Tylko upomnienie'], c: 0 },
            { q: 'Kto traci na szarej strefie poza pracownikami?', a: ['Budżet państwa', 'Tylko konkurenci', 'Nikt'], c: 0 }
        ]
    },
    phillips: {
        title: 'Krzywa Phillipsa', icon: '📉',
        text: 'Krzywa Phillipsa opisuje zależność: gdy bezrobocie jest niskie, firmy konkurują o ludzi i płace rosną szybciej; gdy wysokie — płace stoją. Rosnące płace podnoszą inflację, a Bank Centralny odpowiada stopami. Dlatego dane z rynku pracy poruszają kursy.',
        example: () => societyReady() ? `Bezrobocie ${(macro.unemployment * 100).toFixed(1)}% (naturalne ${(NATURAL_UNEMPLOYMENT * 100).toFixed(0)}%), realne płace pracowników: ${society.wages.workers.toFixed(3)}.` : '',
        quiz: [
            { q: 'Bezrobocie spada poniżej naturalnego. Co dzieje się z płacami?', a: ['Rosną szybciej', 'Spadają', 'Nic'], c: 0 },
            { q: 'Szybki wzrost płac może skłonić Bank Centralny do…', a: ['podwyżki stóp', 'obniżki stóp', 'drukowania pieniędzy'], c: 0 },
            { q: 'Realny wzrost płac to wzrost…', a: ['ponad inflację', 'razem z inflacją', 'tylko w sektorze publicznym'], c: 0 }
        ]
    },
    niedobor: {
        title: 'Niedobór talentów i płace', icon: '🧠',
        text: 'Specjalistów nie da się „wyprodukować” w kwartał — kształcenie trwa latami. Gdy firmy potrzebują ich więcej, niż kształci kraj, płace specjalistów rosną, a spółki technologiczne, badawcze i medyczne wolniej się rozwijają. Edukacja to inwestycja z opóźnieniem 4–8 lat.',
        example: () => societyReady() ? `Niedobór specjalistów: ${society.shortage.toFixed(2)} (powyżej 1 = brakuje ludzi), edukacja ${society.education.toFixed(0)}/100.` : '',
        quiz: [
            { q: 'Niedobór specjalistów rośnie. Którym spółkom to szkodzi najbardziej?', a: ['Technologicznym i badawczym', 'Spożywczym', 'Deweloperom'], c: 0 },
            { q: 'Państwo zwiększa nakłady na edukację. Kiedy rynek pracy to odczuje?', a: ['Po kilku latach', 'Od razu', 'Nigdy'], c: 0 },
            { q: 'Co robi spółka z zadowoloną załogą i gotówką, gdy brakuje specjalistów?', a: ['Podkupuje ich od słabszych konkurentów', 'Zwalnia ludzi', 'Obniża płace'], c: 0 }
        ]
    },
    drenaz: {
        title: 'Drenaż mózgów', icon: '✈️',
        text: 'Gdy kraj traci atrakcyjność (niskie płace, złe nastroje w firmach, bezrobocie), najszybciej wyjeżdżają najlepiej wykształceni — mają najwięcej możliwości za granicą. To drenaż mózgów: kraj traci specjalistów, w których wykształcenie zainwestował, a niedobór talentów rośnie.',
        example: () => societyReady() ? `Atrakcyjność kraju: ${Number(society.migration.attractiveness || 0).toFixed(0)}/100; fale emigracji w tej grze: ${society.migration.emigrationWaves || 0}.` : '',
        quiz: [
            { q: 'Kto wyjeżdża najczęściej przy fali emigracji?', a: ['Specjaliści', 'Emeryci', 'Prezesi spółek państwowych'], c: 0 },
            { q: 'Jak drenaż mózgów wpływa na płace specjalistów w kraju?', a: ['Podnosi je — jest ich mniej', 'Obniża je', 'Nie wpływa'], c: 0 },
            { q: 'Co poprawia atrakcyjność kraju?', a: ['Zadowoleni pracownicy, realne płace i niskie bezrobocie', 'Wysoka inflacja', 'Szara strefa'], c: 0 }
        ]
    },
    zwiazek: {
        title: 'Związek zawodowy i układ zbiorowy', icon: '✊',
        text: 'Związek zawodowy negocjuje płace w imieniu pracowników. Co roku może żądać podwyżki: zgoda podnosi koszty, ale daje spokój; odmowa grozi strajkiem. Układ zbiorowy to umowa na kilka lat — koszty są przewidywalne, a ryzyko strajku znika. Związki powstają głównie tam, gdzie ludzie są niezadowoleni.',
        example: () => { const n = workforceListed().filter(x => x.workforce.union).length; return `Związki zakładowe działają w ${n} spółkach; sektorowe: ${Object.keys(society?.sectorUnions || {}).join(', ') || 'brak'}.`; },
        quiz: [
            { q: 'Co daje spółce układ zbiorowy?', a: ['Spokój i przewidywalne płace na kilka lat', 'Niższe płace', 'Zwolnienie z podatków'], c: 0 },
            { q: 'Gdzie najłatwiej powstaje związek?', a: ['W dużej firmie z niezadowoloną załogą', 'W małej firmie z zadowoloną załogą', 'Wszędzie tak samo'], c: 0 },
            { q: 'Związek sektorowy różni się od zakładowego tym, że…', a: ['obejmuje wszystkie spółki branży', 'działa tylko w spółkach państwowych', 'nie może strajkować'], c: 0 }
        ]
    },
    strajk: {
        title: 'Strajk jako ryzyko operacyjne', icon: '🪧',
        text: 'Strajk zatrzymuje część sprzedaży: przychody kwartału spadają, a przez dźwignię operacyjną zysk spada jeszcze mocniej. Kurs reaguje od razu, ale strajki zwykle się kończą — rynek często przesadza w panice. Inwestor długoterminowy pyta: czy porozumienie będzie drogie na lata?',
        example: () => { const list = workforceListed().filter(x => x.workforce.strike); return list.length ? `Strajkują: ${list.slice(0, 3).map(x => x.name).join(', ')}.` : `Od początku gry było ${society?.stats?.strikes || 0} strajków.`; },
        quiz: [
            { q: 'Strajk obniża przychody kwartału o 10%. Zysk spółki z wysokimi kosztami stałymi…', a: ['spada o więcej niż 10%', 'spada dokładnie o 10%', 'rośnie'], c: 0 },
            { q: 'Kurs spadł na wieść o strajku. Kiedy to bywa okazją?', a: ['Gdy spółka jest zdrowa, a porozumienie nie będzie drogie', 'Zawsze', 'Nigdy'], c: 0 },
            { q: 'Jak spółka może zmniejszyć ryzyko strajków?', a: ['Dbać o zadowolenie i zawrzeć układ zbiorowy', 'Obniżyć płace', 'Zatrudniać na czarno'], c: 0 }
        ]
    },
    esg: {
        title: 'ESG: litera S', icon: '🌱',
        text: 'ESG to ocena spółek pod kątem środowiska (E), społeczeństwa (S) i ładu korporacyjnego (G). Litera S to m.in. traktowanie pracowników: płace, bezpieczeństwo, brak pracy na czarno. Coraz więcej inwestorów — jak klienci „Etyczni” w Twoim funduszu — omija spółki, które źle traktują ludzi.',
        example: () => { const avg = typeof getAverageSatisfaction === 'function' ? getAverageSatisfaction() : null; return avg !== null ? `Średnie zadowolenie pracowników na giełdzie: ${avg.toFixed(0)}/100.` : ''; },
        quiz: [
            { q: 'Czego dotyczy litera S w ESG?', a: ['Społeczeństwa i pracowników', 'Sprzedaży', 'Strategii podatkowej'], c: 0 },
            { q: 'Klient „Etyczny” wycofa pieniądze, gdy fundusz…', a: ['ma duże udziały w spółkach z niezadowoloną załogą lub szarą strefą', 'ma obligacje skarbowe', 'płaci dywidendy'], c: 0 },
            { q: 'Dlaczego mniejszościowy inwestor patrzy na zadowolenie pracowników?', a: ['Bo wpływa na strajki, koszty i klientów funduszu', 'Bo może zmienić płace', 'Nie patrzy'], c: 0 }
        ]
    },
    placaMinimalna: {
        title: 'Płaca minimalna', icon: '💵',
        text: 'Płaca minimalna podnosi zarobki najsłabiej opłacanych i pomaga biednym awansować. Ma jednak koszt: firmy pracochłonne (usługi, budowlanka, handel) płacą więcej, część miejsc pracy znika (bezrobocie lekko rośnie), a niektóre firmy uciekają w szarą strefę.',
        example: () => societyReady() ? `Dziś płaca minimalna: ${describeLawLevel('minWage')} (realne płace taniej siły: ${society.wages.cheap.toFixed(3)}).` : '',
        quiz: [
            { q: 'Płaca minimalna rośnie. Które spółki ucierpią najbardziej?', a: ['Pracochłonne: usługi, budowlanka', 'Deweloperzy', 'Energetyka'], c: 0 },
            { q: 'Jaki jest typowy skutek uboczny wyższej płacy minimalnej?', a: ['Nieco wyższe bezrobocie', 'Niższa inflacja', 'Spadek zatrudnienia w administracji'], c: 0 },
            { q: 'Kto zyskuje na wyższej płacy minimalnej?', a: ['Najsłabiej opłacani pracownicy', 'Akcjonariusze firm usługowych', 'Szara strefa'], c: 0 }
        ]
    },
    deficyt: {
        title: 'Deficyt budżetowy i rentowność obligacji', icon: '🏦',
        text: 'Gdy państwo wydaje więcej, niż zbiera z podatków, ma deficyt i musi pożyczać. Długo utrzymujący się deficyt niepokoi inwestorów — żądają wyższego oprocentowania obligacji skarbowych. W końcu rząd musi podnieść podatki albo ciąć wydatki, co uderza w zyski firm albo w konsumpcję.',
        example: () => societyReady() ? `Saldo budżetu w ostatnim kwartale: ${formatZl(society.budget.balance || 0, 0)}; deficyt od ${society.budget.deficitQuarters} kw.` : '',
        quiz: [
            { q: 'Deficyt utrzymuje się latami. Co dzieje się z rentownością obligacji?', a: ['Rośnie', 'Spada', 'Nie zmienia się'], c: 0 },
            { q: 'Rząd podnosi CIT, by załatać budżet. Co z zyskiem netto spółek?', a: ['Spada', 'Rośnie', 'Bez zmian'], c: 0 },
            { q: 'Dlaczego w recesji deficyt zwykle rośnie?', a: ['Wpływy z podatków spadają szybciej niż wydatki', 'Państwo przestaje płacić', 'Rosną dywidendy'], c: 0 }
        ]
    },
    zapowiedz: {
        title: 'Rynek dyskontuje zapowiedzi', icon: '📣',
        text: 'Ceny akcji odzwierciedlają oczekiwania. Gdy rząd zapowiada ustawę (np. program mieszkań), kursy budowlanki rosną w dniu ogłoszenia, a nie w dniu wejścia w życie. Kto kupuje „na fakcie”, często spóźnia się z zyskiem. Zarabia ten, kto przewidzi zapowiedź — np. z programu wyborczego partii.',
        example: () => societyReady() && society.lastAnnouncement ? `Ostatnia zapowiedź: ${SOCIAL_LAWS[society.lastAnnouncement.law].name} → ${describeLawLevel(society.lastAnnouncement.law, society.lastAnnouncement.to)}.` : 'Rząd nie zapowiedział jeszcze żadnej ustawy.',
        quiz: [
            { q: 'Kiedy kurs budowlanki reaguje na program mieszkań socjalnych?', a: ['Przy zapowiedzi', 'Gdy ruszą budowy', 'Po wyborach'], c: 0 },
            { q: 'Jak przewidzieć zapowiedzi ustaw?', a: ['Śledzić programy partii i sondaże', 'Czytać tylko raporty spółek', 'Nie da się'], c: 0 },
            { q: 'Co znaczy „kupuj plotki, sprzedawaj fakty”?', a: ['Kurs rośnie na oczekiwaniach, a fakt bywa już w cenie', 'Plotki zawsze są prawdziwe', 'Fakty nie mają znaczenia'], c: 0 }
        ]
    },
    rynekNasycony: {
        title: 'Rynek nasycony', icon: '🧱',
        text: `Giełda ma ograniczoną pojemność: kapitał inwestorów i uwaga analityków rozkładają się na wszystkie notowane spółki. Gdy krajowych spółek jest więcej niż ok. ${LISTING_SOFT_CAP}, debiuty zdarzają się rzadziej, startupy dostają mniejsze i droższe finansowanie (inwestor żąda większego udziału), a słabe firmy szybciej trafiają do koszyka śmieciowego, upadają albo są przejmowane. Do limitu nie liczą się spółki zależne, startupy z inkubatora ani spółki z rynków internetowych.`,
        example: () => typeof getListedCompanyCount === 'function' ? `Dziś: ${getListedCompanyCount()} spółek krajowych (miękki limit ${LISTING_SOFT_CAP}), presja rynku ${(getCrowdingPressure() * 100).toFixed(0)}%.` : '',
        quiz: [
            { q: 'Na giełdzie jest dużo więcej spółek niż zwykle. Co dzieje się ze startupami?', a: ['Dostają mniej pieniędzy na gorszych warunkach', 'Łatwiej debiutują', 'Nic się nie zmienia'], c: 0 },
            { q: 'Które spółki najszybciej znikają z nasyconego rynku?', a: ['Słabe i zadłużone', 'Największe', 'Te z dywidendą'], c: 0 },
            { q: 'Czy spółka zależna innej spółki liczy się do limitu krajowych spółek?', a: ['Nie', 'Tak', 'Tylko w kryzysie'], c: 0 }
        ]
    },
    indeks_wazony: {
        title: 'Indeks ważony kapitalizacją', icon: '📊',
        text: 'W indeksie ważonym kapitalizacją (jak GIG, TIG5 czy WIG20) wpływ spółki na indeks zależy od jej wartości rynkowej (kurs × liczba akcji), a nie samej ceny akcji. Aby zapobiec zdominowaniu indeksu przez jednego giganta, stosuje się limity wag (tzw. cap, w GIG max 10% na spółkę). Dzięki temu indeks odzwierciedla realną wartość całej giełdy, a debiut drogiej pojedynczej akcji nie wykrzywia sztucznie wskaźnika.',
        example: () => {
            const gig = typeof marketIndexes !== 'undefined' ? marketIndexes.find(i => i.id === 'GIG') : null;
            if (!gig || !gig.weights) return 'GIG stosuje limit 10% wagi na pojedynczą spółkę.';
            const topEntry = Object.entries(gig.weights).sort((a, b) => b[1] - a[1])[0];
            return topEntry ? `W GIG największa spółka (${topEntry[0]}) ma wagę ${(topEntry[1] * 100).toFixed(1)}% (limit 10%).` : 'W GIG waga żadnej spółki nie przekracza 10%.';
        },
        quiz: [
            { q: 'Od czego zależy waga spółki w indeksie ważonym kapitalizacją?', a: ['Od wartości rynkowej (kurs × liczba akcji)', 'Tylko od samej ceny pojedynczej akcji', 'Od liczby pracowników spółki'], c: 0 },
            { q: 'Po co wprowadza się limit wagi (tzw. cap, np. 10%) w indeksie giełdowym?', a: ['Aby jedna ogromna spółka nie zdominowała całego indeksu', 'Żeby zablokować wypłatę dywidend', 'Aby ograniczyć zysk inwestorów do 10%'], c: 0 },
            { q: 'Które indeksy w grze są ważone kapitalizacją?', a: ['GIG (cap 10%), TIG5 oraz SIG20', 'Tylko lokaty i obligacje', 'Żadne — wszystkie są równe'], c: 0 }
        ]
    },
    jednorozce: {
        title: 'Jednorożce i Gasnące Gwiazdy', icon: '🦄',
        text: 'Na dojrzałym rynku pewne spółki przechodzą 6–8 kwartalne cykle skrajnych emocji inwestorów. Jednorożec (Unicorn) notuje dynamiczny wzrost przychodów (+5–7%), wyższe marże i premię wyceny (+25%), lecz po falach silnych wzrostów inwestorzy okresowo realizują zyski (korekta -15–20%). Z kolei Gasnąca Gwiazda zmaga się ze spadkiem przychodów i marż, a jej wycena cierpi z powodu dyskonta, przeplatanego jedynie krótkimi, technicznymi odbiciami ulgi (dead-cat bounce). Role te rotują na rynku w formie sztafety.',
        example: () => {
            const unicorn = typeof stocks !== 'undefined' ? stocks.find(s => s.marketStar?.type === 'unicorn') : null;
            const fading = typeof stocks !== 'undefined' ? stocks.find(s => s.marketStar?.type === 'fading_star') : null;
            if (unicorn) return `Obecny jednorożec na rynku: ${unicorn.name} (${unicorn.symbol}) — pozostało ${unicorn.marketStar.quartersLeft} kw. cyklu.`;
            if (fading) return `Obecna gasnąca gwiazda: ${fading.name} (${fading.symbol}) — pozostało ${fading.marketStar.quartersLeft} kw. cyklu.`;
            return 'Jednorożce i gasnące gwiazdy wyłaniają się na rynku od 3. kwartału gry.';
        },
        quiz: [
            { q: 'Czym charakteryzuje się Jednorożec rynkowy?', a: ['Hiper-wzrostem przychodów, wyższą marżą i premią wyceny z okresowymi korektami', 'Gwarancją braku jakichkolwiek spadków kursu', 'Brakiem konkurencji i monopolem prawnym'], c: 0 },
            { q: 'Co to jest techniczne odbicie ulgi (dead-cat bounce) na gasnącej gwieździe?', a: ['Krótkotrwały wzrost kursu wyprzedanej spółki, po którym powraca trend schyłkowy', 'Trwałe uzdrowienie finansów spółki', 'Wypłata rekordowej dywidendy'], c: 0 },
            { q: 'Jak długo trwa cykl jednorożca lub gasnącej gwiazdy przed przekazaniem sztafety?', a: ['Zazwyczaj 6–8 kwartałów (1.5–2 lata gry)', 'Zawsze dokładnie 1 tydzień', 'Przez całą 20-letnią grę bez zmian'], c: 0 }
        ]
    },
    korekta: {
        title: 'Korekta rynkowa', icon: '📉',
        text: 'Korekta to przejściowy spadek indeksu lub kursu o 10–20% od ostatniego lokalnego szczytu w ramach szerszego trendu wzrostowego. Różni się od bessy, która oznacza spadek przekraczający 20% połączony z trwałym pogorszeniem sentymentu. Korekty pozwalają rynkowi ochłonąć po zbyt szybkich wzrostach i często stanowią okazję do dokupienia dobrych spółek po niższych cenach.',
        example: () => {
            const regime = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            const peak = regime?.gigPeak || 1000;
            const cur = typeof getGigIndexValue === 'function' ? getGigIndexValue() : 1000;
            return `Lokalny szczyt GIG: ${peak.toFixed(1)} pkt. Bieżące obsunięcie od szczytu: ${(((cur - peak) / peak) * 100).toFixed(1)}%.`;
        },
        quiz: [
            { q: 'Czym różni się korekta od bessy?', a: ['Korekta to spadek o 10–20%, bessa przekracza 20% i trwa dłużej', 'Korekta dotyczy tylko spółek technologicznych', 'W korekcie giełda jest zamknięta'], c: 0 },
            { q: 'Co często dzieje się po zdrowej korekcie w trendzie wzrostowym?', a: ['Rynek powraca do wzrostów po schłodzeniu wycen', 'Wszystkie spółki natychmiast bankrutują', 'Bank Centralny podwaja podatki'], c: 0 },
            { q: 'O ile procent zazwyczaj spada indeks podczas klasycznej korekty?', a: ['O 10 do 20% od lokalnego szczytu', 'O 50 do 90%', 'O mniej niż 1%'], c: 0 }
        ]
    },
    cykl_rynku_gospodarki: {
        title: 'Cykl rynku a cykl gospodarki', icon: '🔄',
        text: 'Giełda to mechanizm dyskontujący przyszłość — rynek akcji zazwyczaj wyprzedza realną gospodarkę (PKB) o 1 do 2 kwartałów. Hossa często rozpoczyna się w samym dołku recesji, gdy dane gospodarcze są najgorsze, ponieważ inwestorzy wyceniają przyszłe ożywienie. Z kolei szczyt hossy i początek spadków pojawia się w fazie przegrzania gospodarki.',
        example: () => {
            const eco = typeof economyCycle === 'object' ? economyCycle?.phase : 'expansion';
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home')?.phase : 'bull';
            return `Faza gospodarki: ${eco} · Faza giełdy: ${reg}.`;
        },
        quiz: [
            { q: 'Dlaczego giełda rośnie, gdy gospodarka wciąż jest w recesji?', a: ['Inwestorzy dyskontują przyszłe ożywienie gospodarcze z wyprzedzeniem 1–2 kwartałów', 'Ponieważ dane o PKB są bez znaczenia', 'Giełda i gospodarka nie mają ze sobą żadnego związku'], c: 0 },
            { q: 'Kiedy najczęściej rynek akcji osiąga szczyt przed spadkami?', a: ['W fazie przegrzania gospodarki, gdy optymizm jest powszechny', 'Podczas najgłębszej recesji', 'W momencie spadku stóp procentowych do zera'], c: 0 },
            { q: 'O ile kwartałów giełda papierów wartościowych zazwyczaj wyprzedza cykl gospodarczy?', a: ['O 1 do 2 kwartałów', 'O 10 lat', 'Giełda reaguje z 3-letnim opóźnieniem'], c: 0 }
        ]
    },
    strach_chciwosc: {
        title: 'Indeks strachu i chciwości', icon: '🌡️',
        text: 'Wskaźnik Strachu i Chciwości (0–100) mierzy temperaturę emocji panujących na parkiecie. Składa się z 5 filarów: pędu indeksu GIG (względem średniej z 4 kw.), szerokości rynku (% rosnących spółek), zmienności WNR, mediany wycen C/Z oraz apetytu na ryzyko (dźwignia funduszy i debiuty). Wartości poniżej 20 oznaczają skrajny strach (potencjalne dno wyprzedaży), a powyżej 80 skrajną chciwość (ryzyko korekty lub bańki).',
        example: () => {
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            return reg ? `Bieżący wskaźnik sentymentu: ${reg.sentiment}/100. Pęd: ${reg.sentimentParts?.momentum}, Szerokość: ${reg.sentimentParts?.breadth}%, Zmienność: ${reg.sentimentParts?.volatility}.` : 'Wskaźnik nastrojów rynku wymaga ukończenia szkolenia Analityka Indeksowego.';
        },
        quiz: [
            { q: 'Co oznacza odczyt wskaźnika poniżej 20 punktów?', a: ['Skrajny strach inwestorów i potencjalną okazję zakupu (krew na ulicach)', 'Skrajną euforię i konieczność natychmiastowej sprzedaży', 'Brak handlu na giełdzie'], c: 0 },
            { q: 'Z ilu filarów wyliczany jest wskaźnik sentymentu w grze?', a: ['Z 5 składników: pęd, szerokość rynku, zmienność, C/Z i apetyt na ryzyko', 'Tylko z inflacji i stóp procentowych', 'Z liczby graczy w rankingu'], c: 0 },
            { q: 'W jakiej strefie wskaźnik sugeruje skrajną chciwość i ryzyko bańki?', a: ['Powyżej 80 punktów', 'Poniżej 10 punktów', 'Dokładnie w punkcie 50'], c: 0 }
        ]
    },
    premia_ryzyko: {
        title: 'Premia za ryzyko akcji (ERP)', icon: '⚖️',
        text: 'Inwestowanie w akcje wiąże się ze zmiennością, dlatego inwestorzy wymagają wyższej oczekiwanej stopy zwrotu niż z bezpiecznych obligacji skarbowych czy lokat. Różnica ta to Premia za Ryzyko Akcji (Equity Risk Premium). Gdy stopy procentowe banku centralnego są wysokie, a wyceny akcji drogie, premia za ryzyko kurczy się — kapitał odpływa do bezpiecznych obligacji.',
        example: () => {
            const dep = typeof getDepositRate === 'function' ? (getDepositRate() * 100).toFixed(2) : '3.00';
            return `Oprocentowanie bezpiecznej lokaty: ${dep}%. Inwestorzy na akcjach oczekują premii za ryzyko ponad tę stopę.`;
        },
        quiz: [
            { q: 'Czym jest premia za ryzyko akcji?', a: ['Dodatkowym zyskiem oczekiwanym z akcji ponad stopę wolną od ryzyka', 'Karą nakładaną przez KNF na fundusze', 'Opłatą maklerską przy zakupie akcji'], c: 0 },
            { q: 'Co dzieje się, gdy bezpieczne obligacje oferują bardzo wysokie oprocentowanie?', a: ['Akcje stają się mniej atrakcyjne, kapitał może odpływać z giełdy', 'Wyceny akcji rosną do nieskończoności', 'Wszystkie spółki przestają publikować raporty'], c: 0 },
            { q: 'Co stanowi podstawę stopy wolnej od ryzyka w gospodarce gry?', a: ['Obligacje skarbowe i lokaty bankowe', 'Najbardziej ryzykowne startupy', 'Kredyty lombardowe'], c: 0 }
        ]
    },
    krach_bezpieczniki: {
        title: 'Krach giełdowy i bezpieczniki', icon: '🚨',
        text: 'Krach to gwałtowne załamanie notowań — spadek indeksu o ponad 20% w ciągu zaledwie 1–4 tygodni, wywołany nagłą paniką, realizacją zleceń stop-loss i przymusowymi wezwaniami do uzupełnienia depozytu (margin call). Aby zapobiec załamaniu infrastruktury, giełda stosuje automatyczne bezpieczniki (circuit breakers): przy spadku GIG o -10% handel staje na 15 s gry, przy -13% na 30 s, a przy -20% handel zostaje zawieszony do końca tygodnia.',
        example: () => {
            const isCrash = typeof isMarketCrashing === 'function' && isMarketCrashing();
            const isHalt = typeof isMarketHalted === 'function' && isMarketHalted();
            return isCrash ? '🚨 Na rynku trwa KRACH!' : isHalt ? '⚠️ Handel jest wstrzymany przez bezpiecznik!' : 'Bezpieczniki giełdowe czuwają nad stabilnością parkietu (progi -10%, -13%, -20%).';
        },
        quiz: [
            { q: 'Jakie są progi zadziałania bezpieczników giełdowych w grze?', a: ['-10% (15s), -13% (30s) oraz -20% (do końca tygodnia)', '-1%, -2% i -3%', '-50% i zamknięcie giełdy na rok'], c: 0 },
            { q: 'Co dzieje się podczas zawieszenia handlu przez bezpiecznik?', a: ['Wszystkie zlecenia zakupu i sprzedaży są zablokowane', 'Spółki natychmiast bankrutują', 'Gracz traci wszystkie pieniądze'], c: 0 },
            { q: 'Ile trwa wstrzymanie handlu przy bezpieczniku 1. stopnia (-10%)?', a: ['15 sekund', 'Cały miesiąc', '24 godziny'], c: 0 }
        ]
    },
    premia_przejecia: {
        title: 'Premia za przejęcie', icon: '🤝',
        text: 'Kupujący całą spółkę płaci więcej niż kurs giełdowy — to premia za przejęcie (zwykle 20–40%). Płaci za kontrolę: może połączyć firmy, obciąć koszty, wykorzystać synergie. Kurs celu po ogłoszeniu skacze w okolice ceny oferty, a kurs kupującego często spada — rynek boi się, że przepłacił.',
        example: () => { const s = stocks.find(x => x.mergerProcess?.arb && x.mergerProcess.initiatorSymbol !== x.symbol && x.mergerProcess.type === 'przejęcie'); return s ? `${s.name}: oferta ${formatZl(s.mergerProcess.offerDetails.buyoutPricePerShare)} za akcję, premia ${Math.round((s.mergerProcess.offerDetails.premium || 0) * 100)}%.` : 'Teraz nikt nie przejmuje spółki na giełdzie.'; },
        quiz: [
            { q: 'Kurs 100 PLN, oferta 130 PLN za akcję. Ile wynosi premia?', a: ['30%', '130%', '23%'], c: 0 },
            { q: 'Dlaczego kurs kupującego często spada po ogłoszeniu przejęcia?', a: ['Rynek boi się, że kupujący przepłacił', 'Bo kupujący dostaje gotówkę', 'Bo cel bankrutuje'], c: 0 },
            { q: 'Za co kupujący płaci premię?', a: ['Za kontrolę i spodziewane synergie', 'Za prowizję maklera', 'Za podatek od transakcji'], c: 0 }
        ]
    },
    arbitraz_fuzji: {
        title: 'Arbitraż fuzji', icon: '⚖️',
        text: 'Po ogłoszeniu przejęcia kurs celu nie dochodzi do pełnej ceny oferty — zostaje różnica (spread). To cena ryzyka: transakcja może się nie udać (urząd antymonopolowy, obrona zarządu, brak finansowania). Kto kupi akcje celu, zarobi spread, jeśli transakcja dojdzie do skutku, ale straci, gdy zostanie zerwana — wtedy kurs wraca w okolice ceny sprzed oferty. Spread maleje, gdy transakcja się zbliża.',
        example: () => { const s = stocks.find(x => x.mergerProcess?.arb && x.mergerProcess.initiatorSymbol !== x.symbol); return s ? `${s.name}: spread ${formatNumberPl(s.mergerProcess.arb.spread * 100, 1)}%, etap ${s.mergerProcess.stage}/7.` : 'Spread zobaczysz w karcie spółki, gdy trwa przejęcie.'; },
        quiz: [
            { q: 'Oferta 100 PLN, kurs celu 94 PLN. Ile wynosi spread?', a: ['6%', '94%', '106%'], c: 0 },
            { q: 'Co się dzieje z kursem celu po zerwaniu przejęcia?', a: ['Wraca w okolice ceny sprzed oferty', 'Rośnie do ceny oferty', 'Spółka znika z giełdy'], c: 0 },
            { q: 'Kiedy spread jest największy?', a: ['Na początku procesu i przy wrogim przejęciu', 'Dzień przed rozliczeniem', 'Gdy nikt nie przejmuje spółki'], c: 0 }
        ]
    },
    emisje_skupy: {
        title: 'Emisje i skupy w cyklu rynku', icon: '🔁',
        text: 'Zarząd sam wybiera moment emisji i skupu akcji. Gdy rynek płaci za akcje dużo (hossa, wysoka wycena), spółka chętnie sprzedaje nowe akcje — dostaje dużo gotówki za mały kawałek firmy, ale dotychczasowi akcjonariusze mają mniejszy udział w zysku (rozwodnienie). Gdy akcje są tanie (bessa, panika), spółka z zapasem gotówki skupuje własne akcje — zostaje ich mniej, więc każda daje większy udział w zysku.',
        example: () => {
            const premium = typeof getMarketRegime === 'function' ? Number(getMarketRegime('home')?.premium) || 0 : 0;
            return `Premia rynku: ${premium >= 0 ? '+' : ''}${(premium * 100).toFixed(0)}% — ${premium > 0.10 ? 'zarządy częściej proponują emisje' : premium < -0.15 ? 'zarządy z gotówką częściej proponują skup akcji' : 'wyceny są umiarkowane'}.`;
        },
        quiz: [
            { q: 'Kiedy emisja nowych akcji jest najkorzystniejsza dla spółki?', a: ['Gdy akcje są drogie', 'Gdy akcje są tanie', 'Zawsze tak samo'], c: 0 },
            { q: 'Co emisja 10% nowych akcji robi z udziałem dotychczasowego akcjonariusza w zysku?', a: ['Zmniejsza go (rozwodnienie)', 'Zwiększa go', 'Nie zmienia'], c: 0 },
            { q: 'Spółka skupuje 10% własnych akcji. Twój udział w zysku na akcję…', a: ['rośnie', 'maleje', 'nie zmienia się'], c: 0 }
        ]
    },
    bramka_umorzen: {
        title: 'Bramka umorzeń', icon: '⏳',
        text: 'Fundusz może czasowo ograniczyć wypłaty, gdy klienci chcą naraz umorzyć dużą część udziałów — tak robią fundusze nieruchomości i fundusze zamknięte. W grze w kwartale można umorzyć najwyżej 10% udziałów z jego początku (w tym panika najwyżej 5%). Reszta zleceń czeka w kolejce i idzie pierwsza w następnym kwartale, chyba że klient odzyska zadowolenie i zrezygnuje. Bramka chroni pozostałych klientów przed wyprzedażą akcji po złych cenach, ale klienci to widzą — zaufanie spada.',
        example: () => {
            const queued = typeof getQueuedRedemptionUnits === 'function' ? getQueuedRedemptionUnits() : 0;
            return queued > 0 ? `W kolejce umorzeń czeka ${formatNumberPl(queued, 1)} udziałów.` : 'Kolejka umorzeń jest pusta.';
        },
        quiz: [
            { q: 'Ile udziałów można umorzyć w jednym kwartale, zanim zadziała bramka?', a: ['10% udziałów z początku kwartału', '50% udziałów', 'Bez limitu'], c: 0 },
            { q: 'Co dzieje się ze zleceniem umorzenia ponad limit?', a: ['Czeka w kolejce i idzie pierwsze w następnym kwartale', 'Przepada', 'Jest realizowane od razu po niższej cenie'], c: 0 },
            { q: 'Jaki koszt ponosi fundusz, uruchamiając bramkę?', a: ['Spada zaufanie klientów', 'Płaci karę do KNF', 'Traci licencję'], c: 0 }
        ]
    },
    pozyczkodawca: {
        title: 'Pożyczkodawca ostatniej instancji', icon: '🏛️',
        text: 'W sytuacji paniki rynkowej i kryzysu płynności komercyjne instytucje finansowe boją się pożyczać sobie nawzajem pieniądze. Rolę pożyczkodawcy ostatniej instancji pełni Bank Centralny. W odpowiedzi na krach może obniżyć stopy procentowe (np. cięcie o 50 pb) oraz zasilić rynek płynnością, zapobiegając lawinie bankructw.',
        example: () => {
            const rate = typeof centralBank === 'object' && centralBank ? (centralBank.baseInterestRate * 100).toFixed(2) : '4.50';
            return `Aktualna stopa referencyjna Banku Centralnego: ${rate}%.`;
        },
        quiz: [
            { q: 'Kto pełni rolę pożyczkodawcy ostatniej instancji w gospodarce?', a: ['Bank Centralny', 'Lombardy miejskie', 'Prywatni inwestorzy zagraniczni'], c: 0 },
            { q: 'Jak Bank Centralny zwykle reaguje na wybuch paniki i krachu?', a: ['Ścina stopy procentowe i dostarcza płynność', 'Podnosi stopy procentowe do 100%', 'Likwiduje giełdę papierów wartościowych'], c: 0 },
            { q: 'Jaki jest główny cel działania pożyczkodawcy ostatniej instancji?', a: ['Zapobieżenie zapaści płynnościowej i fali bankructw w sektorze finansowym', 'Maksymalizacja zysków komercyjnych banków', 'Sfinansowanie festynu miejskiego'], c: 0 }
        ]
    },
    dzwignia_margin: {
        title: 'Dźwignia i Margin Call', icon: '⚡',
        text: 'Dźwignia finansowa polega na inwestowaniu za pożyczone pieniądze (np. kredyty bankowe). W czasie hossy mnoży zyski, lecz w czasie spadków potęguje straty. Gdy wartość portfela zabezpieczającego pożyczkę spadnie poniżej wymaganego progu, następuje Margin Call — wezwanie do natychmiastowej spłaty długu lub przymusowa wyprzedaż akcji po dowolnej cenie.',
        example: () => {
            return 'Podczas krachu fundusze o dźwigni powyżej 50% podlegają wymuszonej wyprzedaży 20–40% akcji.';
        },
        quiz: [
            { q: 'Co to jest Margin Call?', a: ['Wezwanie do uzupełnienia depozytu lub przymusowa sprzedaż akcji przy spadku wycen', 'Powiadomienie o wypłacie rekordowej dywidendy', 'Propozycja awansu w korporacji'], c: 0 },
            { q: 'Dlaczego nadmierna dźwignia finansowa jest niebezpieczna dla całego rynku?', a: ['Wymuszona wyprzedaż akcji pod margin call pogłębia spadki cen innych spółek', 'Ponieważ obniża inflację w kraju', 'Bo uniemożliwia kupno obligacji'], c: 0 },
            { q: 'Co dzieje się, gdy inwestor na dźwigni nie uzupełni środków po wezwaniu margin call?', a: ['Broker lub bank przymusowo wyprzedaje akcje z portfela', 'Kredyt zostaje natychmiast umorzony za darmo', 'Inwestor otrzymuje darmowe jednostki uczestnictwa'], c: 0 }
        ]
    },
    obsuniecie_kapitalu: {
        title: 'Obsunięcie kapitału (Drawdown)', icon: '📉',
        text: 'Maksymalne obsunięcie kapitału (Max Drawdown) to największy procentowy spadek wartości funduszu lub indeksu od historycznego szczytu do kolejnego dołka przed ustanowieniem nowego rekordu. Jest to jedna z najważniejszych miar ryzyka — klienci funduszu panikują i wycofują kapitał, gdy obsunięcie przekracza ich próg tolerancji.',
        example: () => {
            const dd = (typeof playerFund !== 'undefined' && playerFund?.current?.maxDrawdown) ? (playerFund.current.maxDrawdown * 100).toFixed(1) : '0.0';
            return `Maksymalne obsunięcie funduszu w bieżącym okresie: ${dd}%.`;
        },
        quiz: [
            { q: 'Co mierzy wskaźnik Max Drawdown?', a: ['Największy spadek wyceny od szczytu do dołka w danym okresie', 'Średni zysk z dywidend w skali roku', 'Liczbę transakcji przeprowadzonych przez zarządcę'], c: 0 },
            { q: 'Dlaczego duże obsunięcie kapitału zagraża funduszowi?', a: ['Klienci tracą zaufanie i składają zlecenia umorzenia jednostek', 'KNF automatycznie przejmuje spółki z portfela', 'Fundusz musi podwoić liczbę akcji'], c: 0 },
            { q: 'Od jakiego punktu odniesienia mierzy się drawdown portfela?', a: ['Od najwyższego dotychczasowego szczytu (peak)', 'Od ceny zakupu pierwszej spółki', 'Od zera'], c: 0 }
        ]
    },
    okno_ipo: {
        title: 'Okno IPO', icon: '🚪',
        text: 'Okno IPO to korzystny okres na rynku (zwykle faza Hossy lub Euforii), w którym wysoki optymizm inwestorów i nadmiar kapitału pozwalają młodym spółkom i startupom debiutować na giełdzie przy bardzo wysokich wycenach (mnożnik 1.2–1.8x). Podczas bessy okno IPO zatrzaskuje się — debiuty są przekładane, a wyceny spadają.',
        example: () => {
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home')?.phase : 'bull';
            const mult = (reg === 'euphoria' ? '1.4–1.8x (szeroko otwarte)' : reg === 'bear' ? '0.6–0.8x (zamknięte)' : '1.0x (normalne)');
            return `Bieżący stan okna debiutów IPO: ${mult}.`;
        },
        quiz: [
            { q: 'Kiedy okno debiutów (IPO) jest najbardziej otwarte?', a: ['W fazie hossy i euforii przy wysokim sentymencie i napływach kapitału', 'W trakcie najgłębszego krachu', 'Gdy Bank Centralny podnosi podatki'], c: 0 },
            { q: 'Co dzieje się ze startupami planującymi wejście na giełdę podczas bessy?', a: ['Często odkładają debiut w czasie, czekając na lepszą koniunkturę', 'Debiutują natychmiast z potrójną wyceną', 'Przekazują majątek burmistrzowi miasta'], c: 0 },
            { q: 'Jaki mnożnik wyceny mogą osiągać debiuty w fazie euforii?', a: ['Nawet 1.4 do 1.8x normalnej wyceny godziwej', 'Zawsze dokładnie 0.1x', 'Wycena debiutu jest zawsze ujemna'], c: 0 }
        ]
    },
    pulapka_wartosci: {
        title: 'Pułapka wartości (Value Trap)', icon: '🕳️',
        text: 'Pułapka wartości to sytuacja, w której spółka wydaje się niezwykle tania według tradycyjnych wskaźników (bardzo niskie C/Z lub C/WK poniżej 1), lecz w rzeczywistości jej model biznesowy chyli się ku upadkowi, przychody kurczą się, a rynkowa pozycja gaśnie (np. Gasnąca Gwiazda). Kupowanie takich spółek wyłącznie z powodu „niskiej ceny” często prowadzi do wieloletnich strat.',
        example: () => {
            const fading = typeof stocks !== 'undefined' ? stocks.find(s => s.marketStar?.type === 'fading_star') : null;
            return fading ? `Obecna gasnąca gwiazda na parkiecie: ${fading.name} (${fading.symbol}) — C/Z: ${fading.fundamentals?.peRatio?.toFixed(1) || 'N/A'}.` : 'Uważaj na spółki ze spadającymi przychodami, nawet jeśli ich C/Z wydaje się atrakcyjne.';
        },
        quiz: [
            { q: 'Czym jest pułapka wartości?', a: ['Pozornie tanią spółką, której biznes trwale słabnie i przynosi straty', 'Zablokowaniem konta maklerskiego przez giełdę', 'Opłatą za wycenę portfela'], c: 0 },
            { q: 'Dlaczego niskie C/Z nie zawsze oznacza bezpieczną okazję?', a: ['Ponieważ zyski spółki mogą wkrótce drastycznie spaść lub zamienić się w stratę', 'Bo wskaźnik C/Z liczy się tylko dla banków', 'Niskie C/Z jest zawsze gwarancją zysku'], c: 0 },
            { q: 'Który typ spółek z aktualizacji 0.15 jest klasycznym przykładem pułapki wartości?', a: ['Gasnąca gwiazda (fading star)', 'Jednorożec (unicorn)', 'Nowy startup technologiczny'], c: 0 }
        ]
    },
    fazy_rynku: {
        title: 'Fazy rynku i nastroje inwestorów', icon: '🐂',
        text: 'Cykl giełdowy składa się z 6 charakterystycznych faz: Akumulacji (po cichu kupują cierpliwi), Hossy (szeroki, długi wzrost), Euforii (wysokie wyceny, szczyt nastrojów), Dystrybucji (duzi gracze wyprzedają akcje), Bessy (spadki cen, strach inwestorów) oraz Kapitulacji (paniczna wyprzedaż tuż przed dnem rynku). Fazy rynku potwierdzane są z opóźnieniem (1–2 kwartały lub po ruchu GIG o 20%), gdzie szczyt lub dno rozpoznaje się dopiero po fakcie. Równolegle wskaźnik Strachu i Chciwości (0–100) mierzy bieżący sentyment na podstawie pędu GIG, szerokości rynku, zmienności WNR, wycen C/Z i apetytu na ryzyko.',
        example: () => {
            const regime = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            if (!regime) return 'Wskaźnik nastrojów rynku wymaga ukończenia szkolenia Analityka Indeksowego.';
            const phaseName = regime.shownPhase ? (MARKET_PHASES[regime.shownPhase]?.name || regime.shownPhase) : 'w trakcie potwierdzania';
            return `Aktualny wskaźnik Strachu i Chciwości: ${regime.sentiment}/100. Potwierdzona faza rynku: ${phaseName} (premia rynkowa: ${(regime.premium * 100).toFixed(1)}%).`;
        },
        quiz: [
            { q: 'Dlaczego fazy rynku (hossa, bessa) potwierdzane są w analizie z opóźnieniem?', a: ['Ponieważ punkt zwrotny można pewnie potwierdzić dopiero po trwałej zmianie trendu', 'Z powodu problemów technicznych giełdy', 'Żeby analitycy mieli czas na urlop'], c: 0 },
            { q: 'Czym charakteryzuje się faza Euforii na giełdzie?', a: ['Wyceny są bardzo wysokie, panuje powszechny optymizm, a ryzyko korekty lub krachu rośnie', 'Wszyscy masowo wyprzedają akcje ze stratą', 'Brak jakichkolwiek transakcji na giełdzie'], c: 0 },
            { q: 'Co mierzy wskaźnik Strachu i Chciwości (0–100)?', a: ['Bieżący nastrój rynku wyliczany m.in. z pędu cen, szerokości rynku i zmienności', 'Jedynie aktualny poziom inflacji w kraju', 'Liczbę nowych spółek debiutujących na giełdzie'], c: 0 }
        ]
    },
    banki_sektorowe: {
        title: 'Bańki sektorowe i premia wyceny', icon: '🫧',
        text: 'Bańka sektorowa to zjawisko, w którym spółki z modnej branży (np. sztuczna inteligencja, biotechnologia czy gaming) drożeją daleko ponad swoje fundamenty pod wpływem rynkowej gorączki. Premia wyceny sektora może osiągać od kilkunastu do nawet +150% ponad wartość godziwą. Im wyższa premia i dłuższy czas trwania bańki, tym większe prawdopodobieństwo jej gwałtownego pęknięcia (−15…−25% w 1–3 kwartały). Konglomeraty o zdywersyfikowanych przychodach są mniej narażone na pęknięcie bańki niż spółki jednosegmentowe.',
        example: () => {
            const bubble = typeof getActiveSectorBubble === 'function' ? getActiveSectorBubble() : null;
            if (bubble) {
                return `Aktualna gorączka rynkowa: sektor ${bubble.name} z premią wyceny ${(bubble.premium * 100).toFixed(0)}% (faza: ${bubble.phase}).`;
            }
            return 'Obecnie na rynku nie ma aktywnej bańki sektorowej — wyceny branżowe pozostają w normie.';
        },
        quiz: [
            { q: 'Dlaczego inwestowanie w spółki podczas zaawansowanej bańki sektorowej jest ryzykowne?', a: ['Szansa gwałtownego pęknięcia bańki rośnie wraz z wysokością premii i czasem jej trwania', 'Ponieważ spółki w bańce nie mogą wypłacać dywidend', 'Giełda natychmiast zawiesza handel wszystkimi spółkami'], c: 0 },
            { q: 'Jak dywersyfikacja segmentowa (konglomerat) wpływa na ekspozycję na bańkę?', a: ['Ogranicza wpływ bańki proporcjonalnie do udziału danego segmentu w przychodach spółki', 'Zwiększa ryzyko straty dwukrotnie', 'Nie ma żadnego wpływu na wycenę'], c: 0 },
            { q: 'Co dzieje się po pęknięciu bańki sektorowej?', a: ['Premia gwałtownie spada poniżej zera (−15…−25%), po czym rynek stopniowo powraca do równowagi', 'Wszystkie spółki z sektora natychmiast bankrutują', 'Premia natychmiast rośnie o kolejne 100%'], c: 0 }
        ]
    }
});

// ---------------------------------------------------------------------------------
// STAN, ODBLOKOWYWANIE, PODPOWIEDZI PO BŁĘDZIE
// ---------------------------------------------------------------------------------

function getAcademy() {
    if (!playerProfile) return { unlocked: {}, quizzes: {} };
    if (!playerProfile.academy) playerProfile.academy = { unlocked: {}, quizzes: {} };
    const academy = playerProfile.academy;
    for (const id of ACADEMY_BASE_ENTRIES) if (!(id in academy.unlocked)) academy.unlocked[id] = 0;
    return academy;
}

function isAcademyUnlocked(id) {
    return id in getAcademy().unlocked;
}

/** Odblokowuje hasło (raz); hint — dodatkowy tekst powiadomienia (np. po błędzie). */
function unlockAcademyEntry(id, hint = '') {
    const entry = ACADEMY_ENTRIES[id];
    if (!entry || !playerProfile) return false;
    const academy = getAcademy();
    const fresh = !(id in academy.unlocked);
    if (fresh) academy.unlocked[id] = typeof macro === 'object' ? macro.quarter : 0;
    if (typeof pushNotification !== 'function') return fresh;
    if (hint) pushNotification(`📘 ${hint} — hasło „${entry.title}”`, () => openAcademy(id));
    else if (fresh) queueAcademyNotification(id);
    return fresh;
}

// Kilka haseł odblokowanych naraz = jedno powiadomienie.
let academyNotifyQueue = [];
const ACADEMY_NOTIFY_WINDOW_MS = 2000;
function queueAcademyNotification(id) {
    academyNotifyQueue.push(id);
    if (academyNotifyQueue.length > 1) return;
    // Hasła odblokowane w ciągu 2 s (np. na starcie gry) trafiają do jednego powiadomienia.
    setTimeout(() => {
        const ids = academyNotifyQueue;
        academyNotifyQueue = [];
        const titles = ids.map(x => `„${ACADEMY_ENTRIES[x].title}”`);
        pushNotification(ids.length === 1 ? `📘 Nowe hasło w Akademii: ${titles[0]}` : `📘 Nowe hasła w Akademii (${ids.length}): ${titles.slice(0, 4).join(', ')}${ids.length > 4 ? '…' : ''}`, () => openAcademy(ids[0]));
    }, ACADEMY_NOTIFY_WINDOW_MS);
}

/** Co tydzień: hasła odblokowują się przy pierwszym kontakcie z pojęciem. */
function checkAcademyTriggers() {
    if (!playerProfile || !playerFund) return;
    const held = stocks.filter(s => (playerPortfolio[s.symbol]?.shares || 0) > 0);
    if (playerFund.periods.length > 0) unlockAcademyEntry('zmiennosc');
    if (held.length >= 3) unlockAcademyEntry('dywersyfikacja');
    if (held.some(s => s.lastReport && s.lastReport !== 'brak')) unlockAcademyEntry('raport');
    if (held.some(s => s.lastDividend)) unlockAcademyEntry('dywidenda');
    if (held.some(s => s.mergerProcess)) unlockAcademyEntry('fuzje');
    if (held.some(s => s.mergerProcess?.arb && s.mergerProcess.initiatorSymbol !== s.symbol)) { unlockAcademyEntry('arbitraz_fuzji'); unlockAcademyEntry('premia_przejecia'); } // 0.15.1 M1
    if (held.some(s => s.governance?.pendingAgm)) unlockAcademyEntry('walne');
    if (allBonds.some(b => b.ownerId === 'player')) unlockAcademyEntry('obligacje');
    if ((typeof getFundDeposits === 'function' && getFundDeposits().length) || (playerFund.ppp || []).length) unlockAcademyEntry('lokata');
    if (Object.values(playerPortfolio).some(h => h.assetType === 'etf' && h.shares > 0)) unlockAcademyEntry('etf');
    if (getSkillLevel('financialAnalyst') >= 1) unlockAcademyEntry('wycena');
    if (getSkillLevel('indexAnalystLvl1') >= 1) unlockAcademyEntry('indeks_wazony');
    if (stocks.some(s => s.marketStar)) unlockAcademyEntry('jednorozce');
    if (getSkillLevel('indexAnalystLvl1') >= 3) {
        unlockAcademyEntry('cykl_rynku_gospodarki');
        unlockAcademyEntry('korekta');
    }
    if (getSkillLevel('indexAnalystLvl1') >= 4) {
        unlockAcademyEntry('strach_chciwosc');
        unlockAcademyEntry('premia_ryzyko');
    }
    if (typeof isMarketCrashing === 'function' && (isMarketCrashing() || isMarketHalted())) {
        unlockAcademyEntry('krach_bezpieczniki');
        unlockAcademyEntry('pozyczkodawca');
    }
    if (stocks.some(s => s.marketStar?.type === 'fading_star')) {
        unlockAcademyEntry('pulapka_wartosci');
    }
    if (getSkillLevel('accountant') >= 3) unlockAcademyEntry('przeplywy');
    if (getSkillLevel('accountant') >= 4) unlockAcademyEntry('kreatywna');
    if (stocks.some(s => s.isBankrupt)) unlockAcademyEntry('bankructwo');
    if (typeof getCrowdingPressure === 'function' && getCrowdingPressure() > 0) unlockAcademyEntry('rynekNasycony');
    // 0.13: społeczeństwo i rynek pracy
    if (held.some(s => s.workforce?.union || (typeof getSectorUnion === 'function' && getSectorUnion(s)))) unlockAcademyEntry('zwiazek');
    if (held.some(s => s.workforce?.strike)) { unlockAcademyEntry('strajk'); unlockAcademyEntry('dzwignia'); }
    if (held.some(s => typeof getGreyShare === 'function' && getGreyShare(s) > 0.05) && getSkillLevel('accountant') >= 4) unlockAcademyEntry('szaraStrefa');
    if (held.some(s => ['Turystyka', 'Gaming', 'Żywność'].includes(getMainSector(s)))) unlockAcademyEntry('elastycznosc');
    if (held.some(s => getStockSegments(s).length > 1)) unlockAcademyEntry('segmenty'); // 0.14 T1b
    if (held.some(s => typeof getConglomerateDiscount === 'function' && getConglomerateDiscount(s) > 0)) unlockAcademyEntry('konglomerat'); // 0.14 T3
    if (held.some(s => typeof getSynergyMarginAdj === 'function' && getSynergyMarginAdj(s) > 0)) unlockAcademyEntry('synergia');
    if (held.some(s => s.strategy?.process || s.strategy?.pivot || (typeof getFocusMarginAdj === 'function' && getFocusMarginAdj(s) > 0))) unlockAcademyEntry('dywersyfikacja');
    if (typeof isConcern === 'function') { // 0.14 T5
        if (held.some(s => isConcern(s) || getSubsidiaryCount(s) > 0)) unlockAcademyEntry('grupaKapitalowa');
        if (held.some(s => getStockCooperations(s).length)) unlockAcademyEntry('ryzykoKontrahenta');
        if (getSkillLevel('accountant') >= 4 && held.some(s => getStockCooperations(s).some(c => c.flag))) unlockAcademyEntry('podmiotyPowiazane');
        if (held.some(s => s.tender)) { unlockAcademyEntry('wezwanie'); unlockAcademyEntry('premiaKontrola'); } // 0.14 T6
    }
    if (typeof society === 'object' && society) {
        if (Math.abs((macro?.unemployment || NATURAL_UNEMPLOYMENT) - NATURAL_UNEMPLOYMENT) > 0.015) unlockAcademyEntry('phillips');
        if (society.shortage > 1.05) unlockAcademyEntry('niedobor');
        if ((society.migration?.emigrationWaves || 0) > 0) unlockAcademyEntry('drenaz');
        if (society.budget?.deficitQuarters >= 2) unlockAcademyEntry('deficyt');
        if (playerFund.clients?.some(c => c.type === 'ethical')) unlockAcademyEntry('esg');
    }
}

/** Zdarzenia z podpowiedzią po błędzie gracza. */
function onAcademyEvent(kind, stock = null) {
    if (!playerProfile) return;
    const held = stock && ((playerPortfolio[stock.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[stock.symbol]?.shares || 0) > 0);
    if (kind === 'bankruptcy' && held) {
        const debt = stock.balanceSheet?.assets > 0 ? stock.balanceSheet.liabilities / stock.balanceSheet.assets : null;
        unlockAcademyEntry(debt !== null && debt > 0.7 ? 'zadluzenie' : 'bankructwo', `${stock.name} upadła${debt !== null ? ` (zadłużenie ${(debt * 100).toFixed(0)}%)` : ''}`);
    } else if (kind === 'tragicReport' && held) {
        unlockAcademyEntry('raport', `${stock.name}: wynik mocno poniżej oczekiwań`);
    } else if (kind === 'bondDefault') {
        unlockAcademyEntry('obligacje', 'Emitent Twoich obligacji jest niewypłacalny');
    }
}

// ---------------------------------------------------------------------------------
// QUIZ
// ---------------------------------------------------------------------------------

/** answers: tablica indeksów odpowiedzi. Zwraca { correct, total, passed, reward }. */
function submitAcademyQuiz(id, answers) {
    const entry = ACADEMY_ENTRIES[id];
    if (!entry || !isAcademyUnlocked(id)) return null;
    const correct = entry.quiz.filter((question, i) => Number(answers[i]) === question.c).length;
    const passed = correct === entry.quiz.length;
    const academy = getAcademy();
    let reward = 0;
    if (passed && !academy.quizzes[id]) {
        academy.quizzes[id] = true;
        reward = ACADEMY_QUIZ_REWARD;
        playerWallet.cash += reward;
        recordPayment('external:szkolenia', 'player-wallet', reward, `Quiz Akademii: ${entry.title}`);
        playerProfile.cv.push({ type: 'training', text: `Akademia: zaliczony quiz „${entry.title}”.` });
    }
    return { correct, total: entry.quiz.length, passed, reward };
}

/** Kolejność odpowiedzi tasowana stabilnie (wg id hasła i pytania), poprawna nie zawsze pierwsza. */
function getQuizOrder(id, qi, count) {
    let seed = 0;
    for (const ch of `${id}:${qi}`) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
    const order = [...Array(count).keys()];
    for (let i = order.length - 1; i > 0; i--) { seed = (seed * 7 + 13) % 9973; const j = seed % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    return order;
}

// ---------------------------------------------------------------------------------
// WIDOK (zakładka „Akademia” w oknie CV)
// ---------------------------------------------------------------------------------

let academyView = { selected: null, result: null };

function openAcademy(id = null) {
    if (id) academyView = { selected: id, result: null };
    if (typeof cvTab !== 'undefined') cvTab = 'academy';
    if (typeof openSkillsModal === 'function') openSkillsModal();
}

function selectAcademyEntry(id) {
    academyView = { selected: id, result: null };
    if (typeof renderCvPanel === 'function') renderCvPanel();
}

function academyQuizSubmit(id) {
    const entry = ACADEMY_ENTRIES[id];
    const answers = entry.quiz.map((q, qi) => document.querySelector(`input[name="aq-${qi}"]:checked`)?.value);
    if (answers.some(a => a === undefined)) { showToast('Odpowiedz na wszystkie pytania.', 'warning'); return; }
    academyView.result = submitAcademyQuiz(id, answers);
    academyView.answers = answers;
    if (academyView.result?.reward) showToast(`🎓 Quiz zaliczony! +${academyView.result.reward} PLN do portfela.`, 'success');
    renderCvPanel();
}

function renderAcademyPanel() {
    const academy = getAcademy();
    const ids = Object.keys(ACADEMY_ENTRIES);
    const unlockedCount = ids.filter(id => id in academy.unlocked).length;
    const passedCount = Object.keys(academy.quizzes).length;
    const selected = academyView.selected && ACADEMY_ENTRIES[academyView.selected] && isAcademyUnlocked(academyView.selected) ? academyView.selected : ids.find(id => id in academy.unlocked);

    const list = ids.map(id => {
        const entry = ACADEMY_ENTRIES[id];
        const open = id in academy.unlocked;
        return `<button class="academy-item ${id === selected ? 'active' : ''}" ${open ? `onclick="selectAcademyEntry('${id}')"` : 'disabled title="Hasło odblokujesz, gdy zetkniesz się z tym pojęciem w grze."'}>
            ${open ? entry.icon : (typeof uiIcon === 'function' ? uiIcon('klodka', 14) : '🔒')} ${open ? escapeHtml(entry.title) : '???'} ${academy.quizzes[id] ? '<span class="academy-done">✔</span>' : ''}</button>`;
    }).join('');

    let detail = '<p class="text-muted">Wybierz hasło.</p>';
    if (selected) {
        const entry = ACADEMY_ENTRIES[selected];
        let example = '';
        try { example = entry.example ? entry.example() : ''; } catch (e) { example = ''; }
        const result = academyView.selected === selected ? academyView.result : null;
        const quiz = entry.quiz.map((q, qi) => {
            const order = getQuizOrder(selected, qi, q.a.length);
            const chosen = result ? Number(academyView.answers?.[qi]) : null;
            return `<fieldset class="academy-q"><legend>${qi + 1}. ${escapeHtml(q.q)}</legend>
                ${order.map(ai => `<label class="${result ? (ai === q.c ? 'text-up' : ai === chosen ? 'text-down' : '') : ''}"><input type="radio" name="aq-${qi}" value="${ai}" ${chosen === ai ? 'checked' : ''}> ${escapeHtml(q.a[ai])}</label>`).join('')}
            </fieldset>`;
        }).join('');
        detail = `
            <h3 class="mt-0">${entry.icon} ${escapeHtml(entry.title)}</h3>
            <p>${escapeHtml(entry.text)}</p>
            ${example ? `<p class="academy-example">🎮 <strong>W Twojej grze:</strong> ${escapeHtml(example)}</p>` : ''}
            <h4>Quiz ${academy.quizzes[selected] ? '— zaliczony ✔' : `— za zaliczenie ${ACADEMY_QUIZ_REWARD} PLN`}</h4>
            ${quiz}
            ${result ? `<p class="${result.passed ? 'text-up' : 'text-down'}">${result.passed ? '✅ Wszystko dobrze!' : `Poprawne: ${result.correct}/${result.total} — spróbuj jeszcze raz.`}</p>` : ''}
            <button onclick="academyQuizSubmit('${selected}')">Sprawdź odpowiedzi</button>`;
    }

    return `
        <p class="fund-muted">Hasła odblokowujesz, gdy pierwszy raz zetkniesz się z pojęciem w grze. Odblokowane: ${unlockedCount}/${ids.length} · zaliczone quizy: ${passedCount}.</p>
        <div class="academy-layout">
            <nav class="academy-list">${list}</nav>
            <section class="academy-detail">${detail}</section>
        </div>`;
}

// #################################################################################
// ## scanner.js
// #################################################################################

// =================================================================================
// 0.12 N2: SKANER SPÓŁEK, METODY WYCENY, KONSENSUS ANALITYKÓW
// Szkolenie „Analityk Finansowy”:
//   1 — skaner + wycena porównawcza (C/Z sektora),
//   2 — ROE, marża, wzrost zysku; wycena z C/WK sektora i modelem dywidend (Gordona),
//   3 — konsensus przed raportem i wynik vs konsensus, potencjał do wyceny w skanerze.
// =================================================================================

const SCANNER_PRESETS = {
    value:    { label: '💎 Tanie wartościowe', filters: { peBelowSector: true, pbMax: 1.5, debtMax: 60 } },
    dividend: { label: '💰 Dywidendowe', filters: { dyMin: 4, debtMax: 70, healthMin: 0 } },
    growth:   { label: '🚀 Wzrostowe', filters: { growthMin: 10, healthMin: 1 } },
    safe:     { label: '🛡️ Bezpieczne', filters: { debtMax: 40, healthMin: 2 } }
};

const SCANNER_DEFAULT_FILTERS = { sector: 'all', subsector: null, secondary: false, type: 'all', grouped: true, niche: '', peBelowSector: false, pbMax: '', dyMin: '', debtMax: '', growthMin: '', healthMin: '', accessibleOnly: true, greyOnly: false };

let scannerView = { filters: { ...SCANNER_DEFAULT_FILTERS }, sort: 'cap', dir: -1 };

function getAnalystLevel() {
    return getSkillLevel('financialAnalyst');
}

// ---------------------------------------------------------------------------------
// METODY WYCENY
// ---------------------------------------------------------------------------------

/** Wycena kilkoma metodami: { pe, book, gordon } (zł/akcję albo null). */
function getValuationMethods(stock) {
    const m = getCompanyMetrics(stock);
    const f = stock.fundamentals;
    if (!m || !f) return null;
    const med = getSectorMedians(getMainSector(stock)) || {};
    const pe = m.eps > 0 && med.pe ? m.eps * med.pe : null;
    const book = f.bookValuePerShare > 0 && med.pb ? f.bookValuePerShare * med.pb : null;
    // Model Gordona: D1 / (r − g); r = stopa bazowa + 5 pkt premii za ryzyko akcji, g ≤ r − 2 pkt.
    const dps = stock.price * (m.dy || 0);
    const r = Math.max(0.04, (Number(centralBank?.baseInterestRate) || 0.05) + 0.05);
    const g = Math.max(-0.02, Math.min(r - 0.02, m.growth !== null ? m.growth * 0.5 : 0.02));
    const gordon = dps > 0 ? dps * (1 + g) / (r - g) : null;
    return { pe, book, gordon, r, g };
}

// ---------------------------------------------------------------------------------
// SKANER
// ---------------------------------------------------------------------------------

function num(value) {
    const n = parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/** Wiersze skanera po filtrach i sortowaniu. */
function runScanner(filters = scannerView.filters, sort = scannerView.sort, dir = scannerView.dir) {
    const rows = [];
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt) continue;
        if (!stockMatchesSectorFilter(stock, { sector: filters.sector || 'all', subsector: filters.subsector || null, secondary: Boolean(filters.secondary) })) continue; // T1c
        if (filters.niche && !getStockSegments(stock).some(seg => seg.niche === filters.niche)) continue; // T3: filtr specjalizacji
        if (filters.accessibleOnly && !canAccessExchange(stock.exchange)) continue;
        const m = getCompanyMetrics(stock);
        if (!m) continue;
        const med = getSectorMedians(getMainSector(stock)) || {};
        if (filters.peBelowSector && !(m.pe && med.pe && m.pe < med.pe)) continue;
        if (num(filters.pbMax) !== null && !(m.pb && m.pb <= num(filters.pbMax))) continue;
        if (num(filters.dyMin) !== null && !(m.dy * 100 >= num(filters.dyMin))) continue;
        if (num(filters.debtMax) !== null && !(m.debt !== null && m.debt * 100 <= num(filters.debtMax))) continue;
        if (num(filters.growthMin) !== null && !(m.growth !== null && m.growth * 100 >= num(filters.growthMin))) continue;
        if (num(filters.healthMin) !== null && !(m.health >= num(filters.healthMin))) continue;
        const work = getScannerWorkforce(stock);
        if (filters.greyOnly && !(work && work.grey > 0.05)) continue;
        const sectorPremium = Number(stock.sectorPremium) || 0;
        rows.push({ stock, m, med, work, upside: m.fair ? m.fair / stock.price - 1 : null, sectorPremium });
    }
    const key = row => sort === 'name' ? row.stock.name : sort === 'upside' ? row.upside : sort === 'sectorPremium' ? row.sectorPremium : sort === 'labor' ? row.work?.laborVsSector ?? null : sort === 'satisfaction' ? row.work?.satisfaction ?? null : row.m[sort];
    rows.sort((a, b) => {
        const va = key(a), vb = key(b);
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        return typeof va === 'string' ? va.localeCompare(vb, 'pl') * dir : (va - vb) * dir;
    });
    return rows;
}

/** 0.13: dane zatrudnienia do skanera (koszt pracy względem sektora, zadowolenie, związek, ryzyko strajku, szara strefa). */
let scannerLaborSectorCache = { at: -1, data: {} };
function getScannerWorkforce(stock) {
    if (!stock.workforce || typeof getLaborCostIndex !== 'function') return null;
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    if (scannerLaborSectorCache.at !== quarter || !scannerLaborSectorCache.data.__n || scannerLaborSectorCache.data.__n !== stocks.length) {
        const data = { __n: stocks.length };
        const groups = {};
        for (const s of stocks) if (s.workforce && !s.isBankrupt) (groups[getMainSector(s)] = groups[getMainSector(s)] || []).push(s.workforce.laborShare * getLaborCostIndex(s));
        for (const [sector, list] of Object.entries(groups)) data[sector] = median(list);
        scannerLaborSectorCache = { at: quarter, data };
    }
    const labor = stock.workforce.laborShare * getLaborCostIndex(stock);
    const sector = scannerLaborSectorCache.data[getMainSector(stock)] || labor;
    return { labor, laborVsSector: sector > 0 ? labor / sector - 1 : 0, satisfaction: stock.workforce.satisfaction, union: getUnionStatus(stock), risk: getStrikeRisk(stock), grey: getGreyShare(stock) };
}

function openScanner() {
    if (getAnalystLevel() < 1) {
        showToast('Skaner spółek odblokujesz szkoleniem „Analityk Finansowy” (CV i szkolenia).', 'warning', 6000);
        return;
    }
    let modal = document.getElementById('scanner-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'scanner-modal';
        modal.className = 'modal modal-xl';
        modal.innerHTML = '<button class="close-btn" onclick="closeModalFrom(this)" aria-label="Zamknij">&times;</button><h2 class="mt-0">🔎 Skaner spółek</h2><div id="scanner-filters"></div><div id="scanner-results"></div>';
        document.body.appendChild(modal);
    }
    renderScannerFilters();
    renderScannerResults();
    modal.style.display = 'block';
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('wycena');
}

function setScannerFilter(key, value) {
    scannerView.filters[key] = value;
    renderScannerResults();
}

function applyScannerPreset(id) {
    const preset = SCANNER_PRESETS[id] || (playerProfile?.scannerPresets || []).find(p => p.name === id);
    if (!preset) return;
    scannerView.filters = { ...SCANNER_DEFAULT_FILTERS, ...(preset.filters || {}) };
    renderScannerFilters();
    renderScannerResults();
}

function saveScannerPreset() {
    const name = (document.getElementById('scanner-preset-name')?.value || '').trim().slice(0, 30);
    if (!name || !playerProfile) { showToast('Podaj nazwę presetu.', 'warning'); return; }
    if (!Array.isArray(playerProfile.scannerPresets)) playerProfile.scannerPresets = [];
    playerProfile.scannerPresets = playerProfile.scannerPresets.filter(p => p.name !== name);
    playerProfile.scannerPresets.push({ name, filters: { ...scannerView.filters } });
    if (playerProfile.scannerPresets.length > 8) playerProfile.scannerPresets.shift();
    showToast(`Zapisano preset „${name}”.`, 'success');
    renderScannerFilters();
}

/** T1c: zmiana filtra sektora w skanerze (ten sam renderer co lista spółek). */
function setScannerSectorFilter(changes) {
    const f = scannerView.filters;
    Object.assign(f, changes);
    if ('sector' in changes) f.subsector = null;
    renderScannerFilters();
    renderScannerResults();
}

function setScannerSort(key) {
    if (scannerView.sort === key) scannerView.dir *= -1;
    else { scannerView.sort = key; scannerView.dir = key === 'name' || key === 'pe' || key === 'pb' || key === 'debt' ? 1 : -1; }
    renderScannerResults();
}

function renderScannerFilters() {
    const box = document.getElementById('scanner-filters');
    if (!box) return;
    const f = scannerView.filters;
    // T1c: ten sam filtr sektora co na liście spółek (chipy z liczbą spółek, podsektory, segmenty poboczne).
    const sectorChips = renderSectorFilterChips(stocks.filter(s => !s.assetType && !s.isBankrupt), { sector: f.sector || 'all', subsector: f.subsector || null, secondary: Boolean(f.secondary), type: 'all', grouped: f.grouped !== false }, 'setScannerSectorFilter', { hideType: true });
    const input = (key, label, placeholder, title) => `<label class="text-sm" title="${escapeHtml(title)}">${label} <input type="text" inputmode="decimal" class="w-xs" value="${escapeHtml(f[key] ?? '')}" placeholder="${placeholder}" oninput="setScannerFilter('${key}', this.value)"></label>`;
    const own = (playerProfile?.scannerPresets || []).map(p => `<button class="btn-xs btn-secondary" onclick="applyScannerPreset('${escapeHtml(p.name).replace(/'/g, '&#39;')}')">⭐ ${escapeHtml(p.name)}</button>`).join('');
    box.innerHTML = `
        <div class="d-flex gap-2 flex-wrap mb-2">${Object.entries(SCANNER_PRESETS).map(([id, p]) => `<button class="btn-xs btn-secondary" onclick="applyScannerPreset('${id}')">${p.label}</button>`).join('')}${own}
            <button class="btn-xs" onclick="scannerView.filters = { ...SCANNER_DEFAULT_FILTERS }; renderScannerFilters(); renderScannerResults();">Wyczyść</button></div>
        <div class="sector-chips scanner-sector-chips">${sectorChips.chips}</div>${sectorChips.extra}
        <div class="scanner-filters">
            <label class="text-sm">Specjalizacja <select onchange="setScannerFilter('niche', this.value)"><option value="">wszystkie</option>${SECTOR_NAMES.flatMap(name => Object.keys(SECTORS[name].niches || {})).map(n => `<option ${f.niche === n ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}</select></label>
            <label class="text-sm" title="C/Z niższe od mediany sektora"><input type="checkbox" ${f.peBelowSector ? 'checked' : ''} onchange="setScannerFilter('peBelowSector', this.checked)"> C/Z poniżej sektora</label>
            ${input('pbMax', 'C/WK ≤', 'np. 1', 'Kurs / wartość księgowa na akcję')}
            ${input('dyMin', 'Dywidenda ≥', '%', 'Stopa dywidendy z ostatniego roku, w %')}
            ${input('debtMax', 'Zadłużenie ≤', '%', 'Zobowiązania / aktywa, w %')}
            ${getAnalystLevel() >= 2 ? input('growthMin', 'Wzrost zysku r/r ≥', '%', 'Zysk z 4 ostatnich kwartałów vs 4 wcześniejszych') : ''}
            ${input('healthMin', 'Kondycja ≥', '−5…5', 'Kondycja finansowa spółki')}
            <label class="text-sm"><input type="checkbox" ${f.accessibleOnly ? 'checked' : ''} onchange="setScannerFilter('accessibleOnly', this.checked)"> tylko dostępne giełdy</label>
            ${getSkillLevel('accountant') >= 4 ? `<label class="text-sm" title="Czerwona flaga: ponad 5% zatrudnionych bez umów (Księgowy poz. 4)"><input type="checkbox" ${f.greyOnly ? 'checked' : ''} onchange="setScannerFilter('greyOnly', this.checked)"> 🚩 szara strefa &gt; 5%</label>` : ''}
        </div>
        <div class="d-flex gap-2 items-center mt-2"><input type="text" id="scanner-preset-name" class="w-md" placeholder="Nazwa własnego presetu"><button class="btn-xs" onclick="saveScannerPreset()">💾 Zapisz filtry</button></div>`;
}

function renderScannerResults() {
    const box = document.getElementById('scanner-results');
    if (!box) return;
    const level = getAnalystLevel();
    const flagsOn = typeof getRedFlags === 'function' && getSkillLevel('accountant') >= 4;
    const hasIndexLvl5 = typeof getSkillLevel === 'function' && getSkillLevel('indexAnalystLvl1') >= 5;
    const rows = runScanner();
    const pct = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(1)}%`;
    const fx = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(1);
    const head = (key, label, title) => `<th class="clickable" title="${escapeHtml(title)}" onclick="setScannerSort('${key}')">${label}${scannerView.sort === key ? (scannerView.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
    const cls = (v, med, lowerBetter) => !Number.isFinite(v) || !Number.isFinite(med) ? '' : (lowerBetter ? v < med * 0.85 : v > med * 1.15) ? 'text-up' : (lowerBetter ? v > med * 1.15 : v < med * 0.85) ? 'text-down' : '';
    box.innerHTML = `
        <p class="text-sm text-muted">Znaleziono: <strong>${rows.length}</strong>. Kolor: na zielono lepiej niż mediana sektora, na czerwono gorzej. Kliknij spółkę, by otworzyć kartę. Banki pomijamy — ich bilans zawiera depozyty klientów, więc C/WK i zadłużenie liczy się inaczej.</p>
        <div class="scanner-table-wrap"><table class="asset-mini-table w-full scanner-table">
            <thead><tr>
                ${head('name', 'Spółka', 'Nazwa')}<th title="Podsektor segmentu głównego i specjalizacja-nisza (🏷️); filtr: chipy podsektorów i pole „Specjalizacja”">Podsektor / nisza</th>${head('cap', 'Kapitalizacja', 'Kurs × liczba akcji')}${head('pe', 'C/Z', 'Cena / zysk')}${head('pb', 'C/WK', 'Cena / wartość księgowa')}${hasIndexLvl5 ? head('sectorPremium', 'Premia sektora', 'Premia wyceny sektora względem normy fundamentalnej') : ''}
                ${head('dy', 'Dywid.', 'Stopa dywidendy')}${head('debt', 'Zadłuż.', 'Zobowiązania / aktywa')}
                ${level >= 2 ? head('roe', 'ROE', 'Zysk / kapitał własny') + head('margin', 'Marża', 'Zysk netto / przychody') + head('growth', 'Zysk r/r', 'Wzrost zysku rok do roku') : ''}
                ${head('health', 'Kondycja', 'Kondycja finansowa')}${head('labor', 'Praca', 'Koszt pracy w % przychodów (w nawiasie: względem mediany sektora)')}${head('satisfaction', 'Zadow.', 'Zadowolenie pracowników 0–100')}<th title="Związek zawodowy: brak / zakładowy / sektorowy">Związek</th><th title="Ryzyko strajku">Strajk</th>${level >= 3 ? head('upside', 'Potencjał', 'Wartość godziwa / kurs − 1') : ''}${flagsOn ? '<th title="Czerwone flagi (Księgowy poz. 4)">🚩</th>' : ''}
            </tr></thead>
            <tbody>${rows.slice(0, 120).map(({ stock, m, med, work, upside, sectorPremium }) => `<tr class="clickable" onclick="openDescriptionModal('${stock.symbol}')">
                <td>${escapeHtml(stock.name)} <span class="text-xs text-muted">${escapeHtml(stock.symbol)}</span><span class="text-xs text-muted d-block">${escapeHtml(getStockActivityLabel(stock))}</span></td>
                <td class="text-xs" title="${escapeHtml(getSubsectorMedians(getMainSector(stock), getMainSubsector(stock)) ? `Mediana C/Z podsektora: ${getSubsectorMedians(getMainSector(stock), getMainSubsector(stock)).pe?.toFixed(1)}` : 'Podsektor (T2)')}">${escapeHtml(getMainSubsector(stock) || '—')}${getStockSegments(stock).find(seg => seg.niche) ? ` · 🏷️ ${escapeHtml(getStockSegments(stock).find(seg => seg.niche).niche)}` : ''}</td>
                <td class="cell-number">${formatZl(m.cap, 0)}</td>
                <td class="cell-number ${cls(m.pe, med.pe, true)}">${fx(m.pe)}</td>
                <td class="cell-number ${cls(m.pb, med.pb, true)}">${m.pb ? m.pb.toFixed(2) : '—'}</td>
                ${hasIndexLvl5 ? `<td class="cell-number">${typeof formatSectorPremiumCell === 'function' ? formatSectorPremiumCell(sectorPremium, typeof isCompanyInSectorBubble === 'function' && isCompanyInSectorBubble(stock)) : `${(sectorPremium * 100).toFixed(0)}%`}</td>` : ''}
                <td class="cell-number ${cls(m.dy, med.dy, false)}">${pct(m.dy)}</td>
                <td class="cell-number ${cls(m.debt, med.debt, true)}">${pct(m.debt)}</td>
                ${level >= 2 ? `<td class="cell-number ${cls(m.roe, med.roe, false)}">${pct(m.roe)}</td><td class="cell-number ${cls(m.margin, med.margin, false)}">${pct(m.margin)}</td><td class="cell-number ${m.growth > 0 ? 'text-up' : m.growth < 0 ? 'text-down' : ''}">${pct(m.growth)}</td>` : ''}
                <td class="cell-number">${m.health.toFixed(1)}</td>
                ${renderScannerWorkforceCells(work)}
                ${level >= 3 ? `<td class="cell-number ${upside > 0.15 ? 'text-up' : upside < -0.15 ? 'text-down' : ''}">${pct(upside)}</td>` : ''}
                ${flagsOn ? (() => { const flags = getRedFlags(stock); return `<td class="cell-number ${flags.length >= 2 ? 'text-down' : ''}" title="${escapeHtml(flags.map(f => f.label).join(', '))}">${flags.length || ''}</td>`; })() : ''}
            </tr>`).join('') || '<tr><td colspan="15" class="text-muted">Żadna spółka nie spełnia filtrów.</td></tr>'}</tbody>
        </table></div>`;
}

function renderScannerWorkforceCells(work) {
    if (!work) return '<td>—</td><td>—</td><td>—</td><td>—</td>';
    const vs = work.laborVsSector;
    return `<td class="cell-number ${vs > 0.05 ? 'text-down' : vs < -0.05 ? 'text-up' : ''}" title="względem mediany sektora: ${vs >= 0 ? '+' : ''}${(vs * 100).toFixed(0)}%">${(work.labor * 100).toFixed(1)}%</td>
        <td class="cell-number ${work.satisfaction >= 70 ? 'text-up' : work.satisfaction < 40 ? 'text-down' : ''}">${work.satisfaction.toFixed(0)}</td>
        <td>${{ none: '—', company: '✊ zakł.', sector: '✊ sekt.' }[work.union]}</td>
        <td class="${work.risk === 'wysokie' || work.risk === 'trwa' ? 'text-down' : ''}">${escapeHtml(work.risk || '—')}</td>`;
}

// #################################################################################
// ## mentor.js
// #################################################################################

// =================================================================================
// 0.12 N4: MENTOR — zadania szkoleniowe i certyfikaty (warunek awansu, decyzja użytkownika).
// Trzy ścieżki: Analityk (przed Kierownikiem projektu), Ryzyko (przed Członkiem zarządu),
// Audyt (przed CEO). Certyfikat = zaliczona wymagana liczba zadań ze ścieżki.
// Stan: playerProfile.mentor = { active: [{ id, since, data }], done: { id: kwartał },
//       certificates: { track: kwartał }, events: { financeViews: [], flaggedSell: false } }.
// =================================================================================

const MENTOR_NAME = 'Halina Wróblewska';
const MENTOR_ACTIVE_TASKS = 3;
const MENTOR_REWARD = 150; // PLN do portfela prywatnego za zadanie

const MENTOR_TRACKS = {
    analyst: { label: 'Certyfikat Analityka', icon: '📐', required: 3, position: 'projectLead' },
    risk:    { label: 'Certyfikat Zarządzania Ryzykiem', icon: '🛡️', required: 3, position: 'board' },
    audit:   { label: 'Certyfikat Audytora', icon: '🔍', required: 2, position: 'ceo' }
};

function mentorQuarter() {
    return typeof macro === 'object' ? macro.quarter : 0;
}

function heldStocks() {
    return stocks.filter(s => !s.assetType && !s.isBankrupt && (playerPortfolio[s.symbol]?.shares || 0) > 0);
}

function quizzesPassed(ids) {
    const quizzes = typeof getAcademy === 'function' ? getAcademy().quizzes : {};
    return ids.filter(id => quizzes[id]).length;
}

/** check(task) → true (zaliczone) | false; progress(task) → tekst postępu. */
const MENTOR_TASKS = {
    buyInFear: {
        track: 'risk', title: 'Kup w skrajnym strachu',
        text: 'Gdy wskaźnik Strachu i Chciwości spadnie poniżej 20 pkt, zainwestuj co najmniej 5% aktywów funduszu w spółkę i utrzymaj tę pozycję przez 4 kwartały.',
        lesson: 'strach_chciwosc',
        isEligible: () => {
            const lvl = typeof getSkillLevel === 'function' ? getSkillLevel('indexAnalystLvl1') : 0;
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            return lvl >= 4 && (reg?.sentiment ?? 50) < 20;
        },
        init: task => { task.data = { symbol: null, startQ: null }; },
        check: task => {
            const assets = Math.max(1, typeof getFundAssets === 'function' ? getFundAssets() : 1);
            const held = typeof heldStocks === 'function' ? heldStocks() : [];
            const qualifying = held.find(s => {
                const val = (playerPortfolio[s.symbol]?.shares || 0) * s.price;
                return val / assets >= 0.05;
            });
            if (!qualifying) { task.data = { symbol: null, startQ: null }; return false; }
            const curQ = typeof mentorQuarter === 'function' ? mentorQuarter() : 0;
            if (task.data.symbol !== qualifying.symbol) {
                task.data = { symbol: qualifying.symbol, startQ: curQ };
            }
            return (curQ - (task.data.startQ || curQ)) >= 4;
        },
        progress: task => task.data?.symbol ? `${task.data.symbol}: ${Math.max(0, (mentorQuarter() - (task.data.startQ || mentorQuarter())))}/4 kw.` : 'kup spółkę za ≥5% aktywów'
    },
    exitBubble: {
        track: 'risk', title: 'Wyjdź z bańki',
        text: 'W trakcie trwania bańki sektorowej sprzedaj co najmniej 50% pozycji w spółce z pompowanego sektora, zanim bańka pęknie.',
        lesson: 'banki_sektorowe',
        isEligible: () => {
            const bubble = typeof getActiveSectorBubble === 'function' ? getActiveSectorBubble() : null;
            if (!bubble || bubble.phase !== 'inflating') return false;
            const held = typeof heldStocks === 'function' ? heldStocks() : [];
            return held.some(s => typeof getCompanyBubbleShare === 'function' && getCompanyBubbleShare(s, bubble) > 0.3);
        },
        init: task => {
            const bubble = typeof getActiveSectorBubble === 'function' ? getActiveSectorBubble() : null;
            const held = typeof heldStocks === 'function' ? heldStocks() : [];
            const pick = held.find(s => typeof getCompanyBubbleShare === 'function' && getCompanyBubbleShare(s, bubble) > 0.3);
            task.data = { symbol: pick?.symbol || null, initialShares: pick ? (playerPortfolio[pick.symbol]?.shares || 0) : 0 };
        },
        check: task => {
            if (!task.data?.symbol) return false;
            const currentShares = playerPortfolio[task.data.symbol]?.shares || 0;
            const bubble = typeof getActiveSectorBubble === 'function' ? getActiveSectorBubble() : null;
            if (bubble && bubble.phase === 'inflating' && currentShares <= task.data.initialShares * 0.50 && task.data.initialShares > 0) {
                return true;
            }
            return false;
        },
        progress: task => task.data?.symbol ? `${task.data.symbol}: sprzedaj ≥50% z ${task.data.initialShares} akcji` : 'czekaj na bańkę sektorową'
    },
    surviveBear: {
        track: 'risk', title: 'Przetrwaj bessę',
        text: 'Przetrwaj fazę Bessy (trwającą co najmniej 1 kwartał) z maksymalnym obsunięciem funduszu mniejszym niż spadek indeksu GIG.',
        lesson: 'fazy_rynku',
        isEligible: () => {
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            return reg && reg.phase === 'bear' && reg.quartersInPhase >= 1;
        },
        init: task => {
            const gig = typeof getGigIndexValue === 'function' ? getGigIndexValue() : 1000;
            const nav = (typeof playerFund !== 'undefined' && playerFund?.currentNav) ? playerFund.currentNav : 100;
            task.data = { startGig: gig, startNav: nav, minGig: gig, minNav: nav, startQ: mentorQuarter() };
        },
        check: task => {
            const gig = typeof getGigIndexValue === 'function' ? getGigIndexValue() : 1000;
            const nav = (typeof playerFund !== 'undefined' && playerFund?.currentNav) ? playerFund.currentNav : 100;
            if (gig < (task.data.minGig || gig)) task.data.minGig = gig;
            if (nav < (task.data.minNav || nav)) task.data.minNav = nav;
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            // Zaliczenie, gdy faza bessy się kończy lub trwała >= 2 kwartały i drawdown funduszu < drawdown GIG
            if (reg && (reg.phase !== 'bear' || (mentorQuarter() - (task.data.startQ || mentorQuarter())) >= 2)) {
                const gigDd = ((task.data.minGig || gig) - (task.data.startGig || gig)) / (task.data.startGig || 1);
                const navDd = ((task.data.minNav || nav) - (task.data.startNav || nav)) / (task.data.startNav || 1);
                return navDd > gigDd; // mniejsze obsunięcie (np. -10% > -25%)
            }
            return false;
        },
        progress: task => `Bessa w toku: chroń kapitał funduszu`
    },
    cheapPe: {
        track: 'analyst', title: 'Tania względem sektora',
        text: 'Kup spółkę z C/Z poniżej mediany jej sektora i dodatnim zyskiem. Trzymaj ją 2 kwartały.',
        lesson: 'cz',
        check: task => {
            const pick = heldStocks().find(s => { const m = getCompanyMetrics(s); const med = getSectorMedians(getMainSector(s)); return m?.pe && med?.pe && m.pe < med.pe && m.eps > 0; });
            if (!pick) { task.data = {}; return false; }
            if (task.data.symbol !== pick.symbol) task.data = { symbol: pick.symbol, from: mentorQuarter() };
            return mentorQuarter() - task.data.from >= 2;
        },
        progress: task => task.data?.symbol ? `${task.data.symbol}: ${mentorQuarter() - task.data.from}/2 kw.` : 'brak takiej spółki w portfelu'
    },
    bookValue: {
        track: 'analyst', title: 'Poniżej wartości księgowej',
        text: 'Znajdź w skanerze spółkę z C/WK < 1 i dodatnim zyskiem, i kup ją do funduszu.',
        lesson: 'cwk',
        check: () => heldStocks().some(s => { const m = getCompanyMetrics(s); return m?.pb && m.pb < 1 && m.eps > 0; }),
        progress: () => 'kup spółkę z C/WK < 1'
    },
    compareValuation: {
        track: 'analyst', title: 'Trzy spojrzenia na wycenę',
        text: 'Otwórz zakładkę Finanse w kartach 3 różnych spółek i porównaj ich wskaźniki.',
        lesson: 'wycena',
        check: () => (getMentor().events.financeViews || []).length >= 3,
        progress: () => `${Math.min(3, (getMentor().events.financeViews || []).length)}/3 spółek`
    },
    valuationQuiz: {
        track: 'analyst', title: 'Egzamin z wyceny',
        text: 'Zalicz quizy Akademii: C/Z, C/WK i Wycena.',
        lesson: 'wycena',
        check: () => quizzesPassed(['cz', 'cwk', 'wycena']) >= 3,
        progress: () => `${quizzesPassed(['cz', 'cwk', 'wycena'])}/3 quizy`
    },
    diversify: {
        track: 'risk', title: 'Pięć koszyków',
        text: 'Zbuduj portfel z co najmniej 5 sektorów, w którym żadna spółka nie przekracza 30% aktywów.',
        lesson: 'dywersyfikacja',
        check: () => { const held = heldStocks(); const sectors = new Set(held.map(s => getMainSector(s))); const assets = Math.max(1, getFundAssets()); return sectors.size >= 5 && held.every(s => playerPortfolio[s.symbol].shares * s.price / assets <= 0.3); },
        progress: () => `${new Set(heldStocks().map(s => getMainSector(s))).size}/5 sektorów`
    },
    safeAssets: {
        track: 'risk', title: 'Bezpieczna część portfela',
        text: 'Ulokuj część pieniędzy funduszu w obligacjach albo na lokacie.',
        lesson: 'obligacje',
        check: () => allBonds.some(b => b.ownerId === 'player') || (typeof getFundDeposits === 'function' && getFundDeposits().length > 0),
        progress: () => 'kup obligacje albo załóż lokatę'
    },
    calmPeriod: {
        track: 'risk', title: 'Spokojna ręka',
        text: 'Zakończ okres oceny z obsunięciem funduszu poniżej 5%.',
        lesson: 'zmiennosc',
        check: task => (playerFund?.periods || []).some(p => p.number > (task.data.fromPeriod ?? 0) && p.maxDrawdown < 0.05),
        init: task => { task.data.fromPeriod = playerFund?.periods?.slice(-1)[0]?.number ?? 0; },
        progress: () => `bieżące obsunięcie ${((playerFund?.current?.maxDrawdown || 0) * 100).toFixed(1)}%`
    },
    riskQuiz: {
        track: 'risk', title: 'Egzamin z ryzyka',
        text: 'Zalicz quizy Akademii: Dywersyfikacja, Zmienność i obsunięcie, Obligacje.',
        lesson: 'dywersyfikacja',
        check: () => quizzesPassed(['dywersyfikacja', 'zmiennosc', 'obligacje']) >= 3,
        progress: () => `${quizzesPassed(['dywersyfikacja', 'zmiennosc', 'obligacje'])}/3 quizy`
    },
    sellFlagged: {
        track: 'audit', title: 'Ucieczka przed korektą',
        text: 'Sprzedaj akcje spółki, która ma co najmniej 2 czerwone flagi (szkolenie Księgowy, poziom 4).',
        lesson: 'kreatywna',
        check: () => Boolean(getMentor().events.flaggedSell),
        progress: () => 'sprzedaj spółkę z 🚩🚩'
    },
    orderAudit: {
        track: 'audit', title: 'Sprawdź u źródła',
        text: 'Zleć audyt spółki (szkolenie Księgowy, poziom 5).',
        lesson: 'audyt',
        check: () => stocks.some(s => s.audit),
        progress: () => 'zleć audyt w karcie spółki'
    },
    satisfiedMargin: {
        track: 'analyst', title: 'Szczęśliwa załoga, gruba marża',
        text: 'Kup spółkę z zadowoleniem pracowników > 70 i marżą powyżej mediany jej sektora (skaner: kolumny Zadow. i Marża).',
        lesson: 'kosztPracy',
        check: () => heldStocks().some(s => { const m = getCompanyMetrics(s); const med = getSectorMedians(getMainSector(s)); return (s.workforce?.satisfaction || 0) > 70 && m?.margin !== null && med?.margin !== undefined && m.margin > med.margin; }),
        progress: () => 'kup spółkę z zadowoleniem > 70 i marżą ponad sektor'
    },
    lawAnnouncement: {
        track: 'analyst', title: 'Zarób na zapowiedzi',
        text: 'Kup spółkę budowlaną lub dewelopera, zanim rząd zapowie program mieszkań socjalnych, i bądź na plusie w dniu zapowiedzi.',
        lesson: 'zapowiedz',
        check: () => Boolean(getMentor().events.lawProfit),
        progress: () => typeof society === 'object' && society ? `mieszkania socjalne: ${describeLawLevel('housing')}; programy partii w zakładce Kraj` : ''
    },
    strikeHold: {
        track: 'risk', title: 'Spokój w czasie strajku',
        text: 'Trzymaj spółkę przez strajk (nie sprzedawaj w panice) i sprzedaj ją potem z zyskiem.',
        lesson: 'strajk',
        check: () => Boolean(getMentor().events.strikeProfit),
        progress: () => { const s = heldStocks().find(x => playerPortfolio[x.symbol]?.heldThroughStrike); return s ? `${s.symbol}: przetrwany strajk — sprzedaj z zyskiem` : 'czekaj na strajk w spółce z portfela'; }
    },
    auditQuiz: {
        track: 'audit', title: 'Egzamin audytora',
        text: 'Zalicz quizy Akademii: Przepływy pieniężne, Kreatywna księgowość, Audyt.',
        lesson: 'audyt',
        check: () => quizzesPassed(['przeplywy', 'kreatywna', 'audyt']) >= 3,
        progress: () => `${quizzesPassed(['przeplywy', 'kreatywna', 'audyt'])}/3 quizy`
    }
};

function getMentor() {
    if (!playerProfile) return { active: [], done: {}, certificates: {}, events: {} };
    if (!playerProfile.mentor) playerProfile.mentor = { active: [], done: {}, certificates: {}, events: { financeViews: [], flaggedSell: false } };
    const mentor = playerProfile.mentor;
    if (!mentor.events) mentor.events = { financeViews: [], flaggedSell: false };
    return mentor;
}

function hasCertificate(track) {
    return track in getMentor().certificates;
}

/** Certyfikat wymagany do awansu na dane stanowisko (null = brak wymogu). */
function getRequiredCertificate(positionId) {
    return Object.entries(MENTOR_TRACKS).find(([, t]) => t.position === positionId)?.[0] || null;
}

function getTrackProgress(track) {
    const mentor = getMentor();
    return Object.entries(MENTOR_TASKS).filter(([id, t]) => t.track === track && mentor.done[id] !== undefined).length;
}

/** Uzupełnia aktywne zadania (najpierw ścieżka potrzebna do najbliższego awansu). */
function assignMentorTasks() {
    const mentor = getMentor();
    if (mentor.active.length >= MENTOR_ACTIVE_TASKS) return;
    const order = Object.keys(MENTOR_TRACKS).filter(track => !hasCertificate(track));
    const busy = new Set(mentor.active.map(t => t.id));
    for (const track of order) {
        const free = Object.entries(MENTOR_TASKS).filter(([id, t]) => t.track === track && mentor.done[id] === undefined && !busy.has(id));
        for (const [id, def] of free) {
            if (mentor.active.length >= MENTOR_ACTIVE_TASKS) return;
            const task = { id, since: mentorQuarter(), data: {} };
            if (def.init) def.init(task);
            mentor.active.push(task);
            busy.add(id);
        }
    }
}

/** Co tydzień i po zdarzeniach: sprawdza zadania, wypłaca nagrody, nadaje certyfikaty. */
function checkMentorTasks() {
    if (!playerProfile || !playerFund) return;
    const mentor = getMentor();
    assignMentorTasks();
    for (const task of [...mentor.active]) {
        const def = MENTOR_TASKS[task.id];
        if (!def) { mentor.active = mentor.active.filter(t => t !== task); continue; }
        let ok = false;
        try { ok = def.check(task); } catch (e) { ok = false; }
        if (!ok) continue;
        mentor.active = mentor.active.filter(t => t !== task);
        mentor.done[task.id] = mentorQuarter();
        playerWallet.cash += MENTOR_REWARD;
        recordPayment('external:korporacja', 'player-wallet', MENTOR_REWARD, `Zadanie mentora: ${def.title}`);
        if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry(def.lesson);
        if (typeof pushNotification === 'function') pushNotification(`🎓 ${MENTOR_NAME}: zadanie „${def.title}” zaliczone (+${MENTOR_REWARD} PLN)`, () => openMentor());
    }
    // Certyfikaty: ścieżka z wymaganą liczbą zadań.
    for (const [id, track] of Object.entries(MENTOR_TRACKS)) {
        if (hasCertificate(id) || getTrackProgress(id) < track.required) continue;
        mentor.certificates[id] = mentorQuarter();
        mentor.active = mentor.active.filter(task => MENTOR_TASKS[task.id]?.track !== id); // reszta ścieżki niepotrzebna
        playerProfile.cv.push({ type: 'training', text: `${track.icon} ${track.label}` });
        if (typeof addMail === 'function') addMail({ sender: CORPORATION_SENDER, subject: `${track.icon} ${track.label}`, body: `Gratulacje! Zdobywasz ${track.label}. Spełniasz wymóg certyfikatu do awansu na stanowisko: ${CAREER_POSITIONS[getPositionIndex(track.position)].name}.`, importance: 2 });
    }
    assignMentorTasks();
}

/** Zdarzenia z gry liczone do zadań. */
function noteMentorEvent(kind, stock = null) {
    if (!playerProfile) return;
    const events = getMentor().events;
    if (kind === 'financeView' && stock && !events.financeViews.includes(stock.symbol)) {
        events.financeViews.push(stock.symbol);
        if (events.financeViews.length > 20) events.financeViews.shift();
    }
    if (kind === 'sell' && stock && typeof getRedFlags === 'function' && getSkillLevel('accountant') >= 4 && getRedFlags(stock).length >= 2) events.flaggedSell = true;
    // 0.13: sprzedaż z zyskiem po przetrwanym strajku; zysk w dniu zapowiedzi programu mieszkań.
    const holding = stock ? playerPortfolio[stock.symbol] : null;
    if (kind === 'sell' && holding?.heldThroughStrike && !stock.workforce?.strike && stock.price > (Number(holding.avgPrice) || Infinity)) events.strikeProfit = true;
    if (kind === 'lawAnnouncement' && stock && holding?.shares > 0 && stock.price > (Number(holding.avgPrice) || Infinity)) events.lawProfit = true;
    checkMentorTasks();
}

// ---------------------------------------------------------------------------------
// WIDOK: zakładka „Mentor” w oknie CV
// ---------------------------------------------------------------------------------

function openMentor() {
    if (typeof cvTab !== 'undefined') cvTab = 'mentor';
    if (typeof openSkillsModal === 'function') openSkillsModal();
}

function renderMentorPanel() {
    assignMentorTasks();
    const mentor = getMentor();
    const certs = Object.entries(MENTOR_TRACKS).map(([track, t]) => {
        const progress = getTrackProgress(track);
        const has = hasCertificate(track);
        return `<article class="mentor-cert ${has ? 'done' : ''}"><span class="mentor-cert-icon">${has ? t.icon : '🔒'}</span>
            <div><strong>${escapeHtml(t.label)}</strong><span class="text-xs text-muted d-block">wymagany do awansu na: ${escapeHtml(CAREER_POSITIONS[getPositionIndex(t.position)].name)}</span>
            <span class="text-sm">${has ? '✅ zdobyty' : `zadania: ${progress}/${t.required}`}</span></div></article>`;
    }).join('');
    const active = mentor.active.map(task => {
        const def = MENTOR_TASKS[task.id];
        let progress = '';
        try { progress = def.progress(task); } catch (e) { progress = ''; }
        return `<li class="mentor-task"><div><strong>${MENTOR_TRACKS[def.track].icon} ${escapeHtml(def.title)}</strong>
            <p class="text-sm m-0">${escapeHtml(def.text)}</p><span class="text-xs text-muted">${escapeHtml(progress)} · nagroda ${MENTOR_REWARD} PLN</span></div>
            <button class="btn-xs btn-secondary" onclick="openAcademy('${def.lesson}')">📘 Hasło</button></li>`;
    }).join('');
    const done = Object.keys(mentor.done).map(id => MENTOR_TASKS[id]).filter(Boolean).map(def => `<li>✅ ${escapeHtml(def.title)}</li>`).join('');
    return `
        <p class="fund-muted">${MENTOR_NAME}, Twoja mentorka w korporacji, daje zadania, które uczą analizy i zarządzania ryzykiem. Zarząd awansuje na wyższe stanowiska tylko z certyfikatem.</p>
        <div class="mentor-certs">${certs}</div>
        <h4>Aktywne zadania</h4>
        <ul class="list-plain mentor-tasks">${active || '<li class="text-muted">Wszystkie zadania wykonane — gratulacje!</li>'}</ul>
        ${done ? `<h4>Wykonane</h4><ul class="list-plain text-sm">${done}</ul>` : ''}`;
}


// =================================================================================
// 0.15 H6b: REJESTR OSIĄGNIĘĆ (ACHIEVEMENTS)
// =================================================================================

const ACHIEVEMENTS = {
    first_crisis: {
        id: 'first_crisis', icon: '🌧️', title: 'Przeżyj pierwszy kryzys',
        desc: 'Przejdź przez pierwszą Bessę albo krach rynkowy z zaufaniem inwestorów ≥ 30 i bez utraty stanowiska.',
        xp: 100, hidden: false,
        check: () => {
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            if (!reg || !reg.history || reg.history.length === 0) return false;
            const hadCrisis = reg.history.some(h => h.phase === 'bear' || h.phase === 'capitulation');
            return hadCrisis && (playerFund?.trust || 0) >= 30;
        }
    },
    beat_crisis: {
        id: 'beat_crisis', icon: '🏆', title: 'Wygraj z kryzysem',
        desc: 'W fazie Bessy lub w ciągu 2 kwartałów od krachu osiągnij wynik funduszu lepszy od indeksu GIG o co najmniej 5 punktów procentowych.',
        xp: 150, hidden: false,
        check: () => {
            const periods = playerFund?.periods || [];
            if (!periods.length) return false;
            const last = periods[periods.length - 1];
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            const isBearOrPostCrash = reg?.phase === 'bear' || reg?.phase === 'capitulation' || reg?.history.slice(0, 2).some(h => h.phase === 'bear');
            return isBearOrPostCrash && (last.fundReturn - last.benchmarkReturn) >= 0.05;
        }
    },
    blood_on_streets: {
        id: 'blood_on_streets', icon: '🩸', title: 'Krew na ulicach',
        desc: 'Kup akcje za co najmniej 5% aktywów funduszu przy wskaźniku strachu < 20 i osiągnij +30% zysku na tej pozycji po 4 kwartałach.',
        xp: 200, hidden: false,
        check: () => {
            const tracker = playerProfile?._bloodOnStreetsTracker;
            if (!tracker || !tracker.symbol) return false;
            const stock = stocks.find(s => s.symbol === tracker.symbol);
            if (!stock) return false;
            const curQ = typeof mentorQuarter === 'function' ? mentorQuarter() : 0;
            if (curQ - tracker.boughtQ >= 4) {
                const gain = (stock.price - tracker.boughtPrice) / tracker.boughtPrice;
                return gain >= 0.30;
            }
            return false;
        }
    },
    escape_bubble: {
        id: 'escape_bubble', icon: '🫧', title: 'Ucieczka z bańki',
        desc: 'Przy pęknięciu bańki sektorowej posiadaj o co najmniej 50% mniej akcji jej sektora niż 2 kwartały wcześniej.',
        xp: 150, hidden: false,
        check: () => Boolean(playerProfile?._escapedBubbleAchievement)
    },
    unicorn_hunter: {
        id: 'unicorn_hunter', icon: '🦄', title: 'Łowca jednorożców',
        desc: 'Kup jednorożca, zanim jego kurs urośnie 2-krotnie od startu wzrostu, i utrzymaj go aż do 5-krotnego wzrostu.',
        xp: 200, hidden: false,
        check: () => {
            const tracker = playerProfile?._unicornTracker;
            if (!tracker) return false;
            const stock = stocks.find(s => s.symbol === tracker.symbol);
            if (!stock) return false;
            return stock.price >= tracker.startPrice * 5;
        }
    },
    abandon_fading_star: {
        id: 'abandon_fading_star', icon: '🚢', title: 'Zejście z tonącego statku',
        desc: 'Sprzedaj gasnącą gwiazdę (stanowiącą wcześniej co najmniej 5% aktywów) przed spadkiem kursu o 50% od startu gaśnięcia.',
        xp: 100, hidden: false,
        check: () => Boolean(playerProfile?._abandonedFadingStar)
    },
    value_trap: {
        id: 'value_trap', icon: '🕳️', title: 'Pułapka wartości',
        desc: 'Trzymaj gasnącą gwiazdę (stanowiącą co najmniej 5% aktywów) aż do jej spadku do giełdy Brązowej.',
        xp: 50, hidden: true, hint: 'Gdy niska wycena zamiast okazji okazuje się biletem w jedną stronę...',
        check: () => {
            const held = typeof heldStocks === 'function' ? heldStocks() : [];
            return held.some(s => s.marketStar?.type === 'fading_star' && (s.exchange === 'BRONZE' || s.exchange === 'JUNK'));
        }
    },
    cold_blood: {
        id: 'cold_blood', icon: '🧊', title: 'Zimna krew',
        desc: 'W tygodniu z bezpiecznikiem giełdowym nie sprzedawaj akcji w panice i wyjdź na plus 2 kwartały później.',
        xp: 120, hidden: false,
        check: () => Boolean(playerProfile?._coldBloodAchieved)
    },
    first_bull_market: {
        id: 'first_bull_market', icon: '🐂', title: 'Pierwsza hossa',
        desc: 'Przejdź całą fazę Hossy z łącznym wynikiem funduszu wyższym lub równym indeksowi GIG.',
        xp: 150, hidden: false,
        check: () => Boolean(playerProfile?._firstBullMarketAchieved)
    },
    full_market_cycle: {
        id: 'full_market_cycle', icon: '🧭', title: 'Pełny cykl',
        desc: 'Przeżyj wszystkie 6 faz rynku (Akumulacja, Hossa, Euforia, Dystrybucja, Bessa, Kapitulacja).',
        xp: 200, hidden: false,
        check: () => {
            const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            if (!reg || !reg.history) return false;
            const seen = new Set(reg.history.map(h => h.phase));
            if (reg.phase) seen.add(reg.phase);
            return ['accumulation', 'bull', 'euphoria', 'distribution', 'bear', 'capitulation'].every(p => seen.has(p));
        }
    },
    longer_than_market: {
        id: 'longer_than_market', icon: '📈', title: 'Dłużej niż rynek',
        desc: '20 lat zarządzania funduszem (80 kwartałów) z wynikiem funduszu wyższym lub równym indeksowi GIG.',
        xp: 250, hidden: false,
        check: () => {
            const periods = playerFund?.periods || [];
            if (periods.length < 20) return false;
            const totalFund = periods.reduce((sum, p) => sum + (p.fundReturn || 0), 0);
            const totalGig = periods.reduce((sum, p) => sum + (p.benchmarkReturn || 0), 0);
            return totalFund >= totalGig;
        }
    }
};

function getPlayerAchievements() {
    if (!playerProfile) return {};
    if (!playerProfile.achievements) playerProfile.achievements = {};
    return playerProfile.achievements;
}

function unlockAchievement(id) {
    if (!playerProfile) return false;
    const achievements = getPlayerAchievements();
    if (achievements[id]) return false; // już zdobyte
    const def = ACHIEVEMENTS[id];
    if (!def) return false;

    const curQ = typeof mentorQuarter === 'function' ? mentorQuarter() : 0;
    achievements[id] = curQ;
    playerProfile.xp = (playerProfile.xp || 0) + (def.xp || 100);
    playerProfile.cv.push({ type: 'achievement', text: `${def.icon} Osiągnięcie: ${def.title} (+${def.xp} XP)` });

    if (typeof pushNotification === 'function') {
        pushNotification(`🏆 Osiągnięcie: ${def.title} (+${def.xp} XP)`, () => {
            if (typeof openCareerModal === 'function') openCareerModal();
        });
    }
    if (typeof logEvent === 'function') {
        logEvent(`🏆 Zdobyto osiągnięcie: ${def.title} (+${def.xp} XP)`, 'review');
    }
    return true;
}

function checkAchievements() {
    if (!playerProfile) return;
    const achievements = getPlayerAchievements();
    for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
        if (achievements[id]) continue;
        try {
            if (typeof def.check === 'function' && def.check()) {
                unlockAchievement(id);
            }
        } catch (e) {
            // błąd sprawdzania nie przerywa pętli
        }
    }
}
