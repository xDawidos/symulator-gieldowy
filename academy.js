// =================================================================================
// 0.12 N1: AKADEMIA — słownik pojęć giełdowych z przykładami z gry, quizy,
// porównanie wskaźników spółki z medianą sektora.
// Stan w playerProfile.academy: { unlocked: { id: kwartał }, quizzes: { id: true } }.
// =================================================================================

const ACADEMY_QUIZ_REWARD = 60; // zł do portfela prywatnego za pierwsze zaliczenie quizu
const ACADEMY_BASE_ENTRIES = ['kapitalizacja', 'cz', 'nav', 'benchmark'];

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
            if (stock.assetType || stock.isBankrupt || !stock.sector?.[0]) continue;
            const m = getCompanyMetrics(stock);
            if (m) (groups[stock.sector[0]] = groups[stock.sector[0]] || []).push(m);
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

/** Opis wskaźnika względem sektora: { text, cls } albo null. lowerIsCheap: niższa wartość = „taniej/lepiej”. */
function compareWithSector(value, sectorValue, { lowerIsCheap = true, format = v => v.toFixed(1), labels = ['tania', 'droga'] } = {}) {
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
        text: 'Kapitalizacja to kurs akcji pomnożony przez liczbę akcji — tyle rynek płaci dziś za całą spółkę. Sam kurs nic nie mówi o wielkości firmy: akcja za 5 zł może należeć do większej spółki niż akcja za 500 zł.',
        example: () => { const s = bestBy(pickListed(), x => getMarketCapValue(x)); return s ? `Największa spółka w grze: ${s.name} — kapitalizacja ${formatZl(getMarketCapValue(s), 0)} przy kursie ${formatZl(s.price)}.` : ''; },
        quiz: [
            { q: 'Spółka ma 1 000 000 akcji po 20 zł. Jaka jest jej kapitalizacja?', a: ['20 mln zł', '1 mln zł', '20 tys. zł'], c: 0 },
            { q: 'Która spółka jest większa?', a: ['Nie da się ocenić po samym kursie', 'Ta z wyższym kursem akcji', 'Ta z niższym kursem akcji'], c: 0 },
            { q: 'Kurs akcji rośnie o 10%, liczba akcji bez zmian. Kapitalizacja…', a: ['rośnie o 10%', 'się nie zmienia', 'spada o 10%'], c: 0 }
        ]
    },
    cz: {
        title: 'C/Z (cena do zysku)', icon: '📐',
        text: 'C/Z to kurs podzielony przez zysk na akcję z ostatnich 4 kwartałów. Mówi, ile lat zysku „płacisz” kupując akcję. Niskie C/Z bywa okazją, ale też sygnałem problemów — zawsze porównuj ze spółkami z tego samego sektora.',
        example: () => {
            const s = bestBy(pickListed(x => x.fundamentals.peRatio > 0), x => getMarketCapValue(x));
            const med = s && getSectorMedians(s.sector[0]);
            return s && med?.pe ? `${s.name}: C/Z ${s.fundamentals.peRatio.toFixed(1)}, mediana sektora ${s.sector[0]}: ${med.pe.toFixed(1)}.` : '';
        },
        quiz: [
            { q: 'Kurs 50 zł, zysk na akcję 5 zł. Ile wynosi C/Z?', a: ['10', '5', '250'], c: 0 },
            { q: 'Spółka A ma C/Z 8, a mediana jej sektora to 14. Co to sugeruje?', a: ['Jest tania względem sektora — warto sprawdzić dlaczego', 'Na pewno zbankrutuje', 'Jest droga względem sektora'], c: 0 },
            { q: 'Spółka ma stratę. Jakie ma C/Z?', a: ['Nie da się go sensownie policzyć', 'Bardzo niskie, więc jest tania', 'Równe zero'], c: 0 }
        ]
    },
    eps: {
        title: 'EPS (zysk na akcję)', icon: '💵',
        text: 'EPS to zysk netto podzielony przez liczbę akcji. Gdy spółka emituje nowe akcje, ten sam zysk dzieli się na więcej części — EPS spada (rozwodnienie). Rynek patrzy na tempo wzrostu EPS.',
        example: () => { const s = bestBy(pickListed(), x => x.fundamentals.epsTtm); return s ? `${s.name}: zysk na akcję z 4 kwartałów ${formatZl(s.fundamentals.epsTtm)}.` : ''; },
        quiz: [
            { q: 'Zysk netto 2 mln zł, 1 mln akcji. EPS = ?', a: ['2 zł', '0,5 zł', '2 mln zł'], c: 0 },
            { q: 'Spółka podwaja liczbę akcji, zysk bez zmian. EPS…', a: ['spada o połowę', 'rośnie dwukrotnie', 'się nie zmienia'], c: 0 },
            { q: 'Co oznacza „rozwodnienie” akcjonariuszy?', a: ['Mniejszy udział i zysk na akcję po emisji nowych akcji', 'Wypłatę dywidendy', 'Spadek zadłużenia'], c: 0 }
        ]
    },
    cwk: {
        title: 'C/WK i wartość księgowa', icon: '📚',
        text: 'Wartość księgowa to majątek spółki minus jej długi (kapitał własny). C/WK = kurs / wartość księgowa na akcję. Poniżej 1 rynek wycenia spółkę taniej niż jej majątek netto — często dlatego, że majątek przynosi mało zysku.',
        example: () => { const s = pickListed(x => x.fundamentals.pbRatio > 0).sort((a, b) => a.fundamentals.pbRatio - b.fundamentals.pbRatio)[0]; return s ? `Najniższe C/WK: ${s.name} — ${s.fundamentals.pbRatio.toFixed(2)}.` : ''; },
        quiz: [
            { q: 'Majątek 10 mln zł, długi 4 mln zł. Wartość księgowa to…', a: ['6 mln zł', '14 mln zł', '10 mln zł'], c: 0 },
            { q: 'C/WK = 0,7 oznacza, że…', a: ['rynek wycenia spółkę poniżej jej majątku netto', 'spółka ma 70% zadłużenia', 'spółka wypłaca 70% zysku'], c: 0 },
            { q: 'Dlaczego niskie C/WK nie zawsze jest okazją?', a: ['Majątek może przynosić słabe zyski albo być przeszacowany', 'Bo C/WK nie ma znaczenia', 'Bo takie spółki nie płacą podatków'], c: 0 }
        ]
    },
    dywidenda: {
        title: 'Dywidenda i stopa dywidendy', icon: '💰',
        text: 'Dywidenda to część zysku wypłacana akcjonariuszom. Stopa dywidendy = dywidendy z roku / kurs. Bardzo wysoka stopa bywa pułapką: jeśli spółka wypłaca więcej, niż zarabia, dywidenda zostanie obcięta.',
        example: () => { const s = bestBy(pickListed(), x => getTrailingDividendYield(x)); return s && getTrailingDividendYield(s) > 0 ? `Najwyższa stopa dywidendy: ${s.name} — ${(getTrailingDividendYield(s) * 100).toFixed(2)}%.` : 'Na razie żadna spółka nie wypłaciła dywidendy w tym roku.'; },
        quiz: [
            { q: 'Kurs 40 zł, dywidendy z roku 2 zł. Stopa dywidendy = ?', a: ['5%', '2%', '20%'], c: 0 },
            { q: 'Kiedy wysoka stopa dywidendy jest sygnałem ostrzegawczym?', a: ['Gdy spółka wypłaca więcej, niż zarabia', 'Zawsze jest dobra', 'Gdy spółka ma mało długów'], c: 0 },
            { q: 'Co dzieje się z kursem w dniu odcięcia dywidendy?', a: ['Spada mniej więcej o wartość dywidendy', 'Rośnie o wartość dywidendy', 'Nic się nie zmienia'], c: 0 }
        ]
    },
    zadluzenie: {
        title: 'Zadłużenie', icon: '🏦',
        text: 'Zadłużenie (zobowiązania / aktywa) pokazuje, jaka część majątku jest finansowana długiem. Dług zwiększa zyski w dobrych czasach, ale w recesji odsetki zjadają wynik. Powyżej ~70% spółka jest wrażliwa na kryzys i wzrost stóp.',
        example: () => { const s = bestBy(pickListed(x => x.balanceSheet?.assets > 0), x => x.balanceSheet.liabilities / x.balanceSheet.assets); return s ? `Najbardziej zadłużona: ${s.name} — ${(s.balanceSheet.liabilities / s.balanceSheet.assets * 100).toFixed(0)}% aktywów.` : ''; },
        quiz: [
            { q: 'Aktywa 100 mln zł, zobowiązania 80 mln zł. Zadłużenie = ?', a: ['80%', '20%', '125%'], c: 0 },
            { q: 'Bank Centralny podnosi stopy. Która spółka ucierpi najbardziej?', a: ['Mocno zadłużona', 'Bez długów z dużą gotówką', 'Każda tak samo'], c: 0 },
            { q: 'Dlaczego dług bywa korzystny?', a: ['Pozwala rosnąć szybciej, gdy zysk z inwestycji przewyższa odsetki', 'Bo obniża ryzyko', 'Bo nie trzeba go spłacać'], c: 0 }
        ]
    },
    marza: {
        title: 'Marża', icon: '✂️',
        text: 'Marża netto = zysk netto / przychody. Pokazuje, ile z każdej złotówki sprzedaży zostaje jako zysk. Sektory różnią się marżami (technologia zwykle wyższe niż handel), więc porównuj spółki w obrębie sektora.',
        example: () => { const s = bestBy(pickListed(x => x.fundamentals.revenueTtm > 0), x => x.fundamentals.netIncomeTtm / x.fundamentals.revenueTtm); return s ? `Najwyższa marża netto: ${s.name} — ${(s.fundamentals.netIncomeTtm / s.fundamentals.revenueTtm * 100).toFixed(1)}%.` : ''; },
        quiz: [
            { q: 'Przychody 10 mln zł, zysk netto 1 mln zł. Marża netto = ?', a: ['10%', '1%', '90%'], c: 0 },
            { q: 'Wysoka inflacja kosztów zwykle…', a: ['obniża marże', 'podnosi marże', 'nie ma wpływu na marże'], c: 0 },
            { q: 'Dlaczego porównujemy marże w obrębie sektora?', a: ['Sektory mają naturalnie różne marże', 'Bo marża zależy od kursu akcji', 'Bo poza sektorem marży nie ma'], c: 0 }
        ]
    },
    roe: {
        title: 'ROE (rentowność kapitału)', icon: '🔁',
        text: 'ROE = zysk netto / kapitał własny. Mówi, ile zysku spółka wypracowuje z pieniędzy akcjonariuszy. Wysokie ROE przy niskim zadłużeniu to znak dobrego biznesu; wysokie ROE „napompowane” długiem jest ryzykowne.',
        example: () => { const s = bestBy(pickListed(), x => getCompanyMetrics(x)?.roe); const m = s && getCompanyMetrics(s); return m?.roe ? `Najwyższe ROE: ${s.name} — ${(m.roe * 100).toFixed(1)}%.` : ''; },
        quiz: [
            { q: 'Zysk 3 mln zł, kapitał własny 20 mln zł. ROE = ?', a: ['15%', '6,7%', '23%'], c: 0 },
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
            { q: 'Spółka ma 1 mln zł gotówki i 10 mln zł zobowiązań do spłaty w tym roku. To…', a: ['sygnał ryzyka płynności', 'bardzo bezpieczna sytuacja', 'nie ma znaczenia'], c: 0 }
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
            { q: 'Wartość godziwa 120 zł, kurs 80 zł. Spółka jest…', a: ['niedowartościowana', 'przewartościowana', 'wyceniona idealnie'], c: 0 },
            { q: 'Dlaczego warto liczyć wycenę kilkoma metodami?', a: ['Każda ma założenia — przedział jest bardziej wiarygodny', 'Bo jedna metoda zawsze jest błędna', 'Bo tak wymaga KNF'], c: 0 },
            { q: 'Model Gordona (dywidendowy) nie zadziała dla spółki, która…', a: ['nie wypłaca dywidend', 'ma niskie C/Z', 'ma dużo gotówki'], c: 0 }
        ]
    },
    nav: {
        title: 'NAV i jednostki funduszu', icon: '💼',
        text: 'NAV (wartość aktywów netto) na jednostkę to wartość funduszu podzielona przez liczbę jednostek (JU). Klienci kupują i umarzają JU po NAV. Wynik funduszu mierzy się zmianą NAV, nie wielkością aktywów — napływ klientów nie jest zyskiem.',
        example: () => playerFund ? `Twój fundusz: NAV ${getFundNav().toFixed(4)} zł na jednostkę, aktywa ${formatZl(getFundAssets(), 0)}.` : '',
        quiz: [
            { q: 'Klienci wpłacają do funduszu 1 mln zł. NAV na jednostkę…', a: ['się nie zmienia — przybywa jednostek', 'rośnie o 1 mln zł', 'spada'], c: 0 },
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
            { q: 'Obligacja 1000 zł z kuponem 6% rocznie płaci rocznie…', a: ['60 zł', '6 zł', '600 zł'], c: 0 }
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
            { q: 'Spółka ma 10 mln zł zysku, ale 1 mln zł gotówki z działalności. To…', a: ['sygnał ostrzegawczy — zysk mało „gotówkowy”', 'świetny wynik', 'bez znaczenia'], c: 0 },
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
            { q: 'Czy niski kurs akcji oznacza, że spółka jest tania?', a: ['Niekoniecznie — może być bliska bankructwa', 'Tak, zawsze', 'Tak, jeśli kurs < 1 zł'], c: 0 }
        ]
    }
};

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
function queueAcademyNotification(id) {
    academyNotifyQueue.push(id);
    if (academyNotifyQueue.length > 1) return;
    setTimeout(() => {
        const ids = academyNotifyQueue;
        academyNotifyQueue = [];
        const titles = ids.map(x => `„${ACADEMY_ENTRIES[x].title}”`);
        pushNotification(ids.length === 1 ? `📘 Nowe hasło w Akademii: ${titles[0]}` : `📘 Nowe hasła w Akademii (${ids.length}): ${titles.join(', ')}`, () => openAcademy(ids[0]));
    }, 0);
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
    if (held.some(s => s.governance?.pendingAgm)) unlockAcademyEntry('walne');
    if (allBonds.some(b => b.ownerId === 'player')) unlockAcademyEntry('obligacje');
    if ((typeof getFundDeposits === 'function' && getFundDeposits().length) || (playerFund.ppp || []).length) unlockAcademyEntry('lokata');
    if (Object.values(playerPortfolio).some(h => h.assetType === 'etf' && h.shares > 0)) unlockAcademyEntry('etf');
    if (getSkillLevel('financialAnalyst') >= 1) unlockAcademyEntry('wycena');
    if (getSkillLevel('accountant') >= 3) unlockAcademyEntry('przeplywy');
    if (getSkillLevel('accountant') >= 4) unlockAcademyEntry('kreatywna');
    if (stocks.some(s => s.isBankrupt)) unlockAcademyEntry('bankructwo');
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
    if (academyView.result?.reward) showToast(`🎓 Quiz zaliczony! +${academyView.result.reward} zł do portfela.`, 'success');
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
            ${open ? entry.icon : '🔒'} ${open ? escapeHtml(entry.title) : '???'} ${academy.quizzes[id] ? '<span class="academy-done">✔</span>' : ''}</button>`;
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
            <h4>Quiz ${academy.quizzes[selected] ? '— zaliczony ✔' : `— za zaliczenie ${ACADEMY_QUIZ_REWARD} zł`}</h4>
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
