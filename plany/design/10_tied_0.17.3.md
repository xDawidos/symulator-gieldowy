# Projekt UI 0.17.3: Tied, rozmowy, obietnice

Data: 2026-11-05 · zlecenie: `plany/plan_0.17.3_rozmowy.md` (R1, R2, R4, R5, Interfejs) · system: [03_system.md](03_system.md) · makieta z działającymi przejściami: [makiety/10_tied_0173.html](makiety/10_tied_0173.html) · zrzuty: `zrzuty/z0173/`.

To projekt dla czatu kodu. CSS jest w grze (blok „0.17.3” na końcu `style.css`), 9 ikon w `UI_ICON_PATHS` i `img/ikony/`. Logiki nie ma. Stitch posłużył jako punkt wyjścia, z makiety odpadły lewa kolumna, „TLS 1.3”, „Węzeł”, „Stan terminala”, „GPW”, dekoracyjne odznaki i blok „Poziom relacji” z rangami. Źródłem projektu jest makieta HTML, Figmy nie używamy (decyzja użytkownika 2026-11-05).

## Zasady
1. **Charakter nigdy w interfejsie.** Ani słowem, ani ikoną, ani kolorem. Ton opcji w rozmowie („Liczby”, „Wizja”) opisuje wybór gracza, nie rozmówcę.
2. **Kolor nigdy sam.** Odznaki mają kształt i tekst dla czytnika, poziom relacji jest słowem, stan karteczki słowem i ikoną, polubienie: wypełnione serce + „Polubione”.
3. **Ostre kształty tylko w Tied.** Reguła jest na `.tied`, karteczki w TeamedUP! i Poczta zostają zaokrąglone. Awatary okrągłe, z inicjałami. Bez zdjęć.
4. **Bez nowych okien.** Profil i rozmowa zastępują kanał w tej samej kolumnie.
5. **Słownictwo:** „prezes”, „wiceprezes”, PLN, „giełda Złota”. Po polsku także w mailu KNF. W mailach bez nazw mechanik („wykrycie” tylko w ostrzeżeniu o następnym razie).

## Układ
| Strefa | Zawartość |
|---|---|
| `.tied` | siatka `1fr 300px`, bez lewej kolumny |
| `.tied-main` | `.tied-feedbar` (Główna, Kontakty, Portfel) i jeden widok: kanał, profil osoby, profil firmy, rozmowa |
| `.tied-side` | Mój profil, Wiadomości (licznik nowych), Kontakty; przyklejona, przewija się sama; zawsze widoczna |
| Rozmowa | klasa `.is-talk` na `.tied`: pasek zakładek zwija się w górę w 0,2 s i wraca po zamknięciu; `visibility: hidden` zdejmuje go z kolejności tabulatora; przy `prefers-reduced-motion` bez animacji |
| ≤ 900 px | jedna kolumna, u góry `.tied-switch` (Kanał / Profil i kontakty), widok w `data-pane` |
| ≤ 640 px | wybory w rozmowie w jednej kolumnie, zakładki kanału na całą szerokość |

Stan widoku w grze: `tiedView = { feed, side, pane, person, company, talk }`, po każdej zmianie ponowny `renderTiedPage()`. Stan nie trafia do zapisu.

## Elementy
| Element | Markup | Uwagi |
|---|---|---|
| Post | `.net-post` + `.tied-who`, `.tied-meta`, `.tied-react` | rodzaj jako `.net-chip` (Wyniki, Współpraca); post niepubliczny: chip z ikoną „Dla znajomych” lub „Dla zaufanych” |
| Odznaki | `.tied-badge` z `zweryfikowany`, `.tied-badge.is-friend` z `znajomy` | przy nazwisku ikona + `title` + `.sr-only`; na profilu ze słowem, bo dotyk nie ma `title` |
| Reakcje | `.tied-act[aria-pressed]`, licznik w `<b>` | po polubieniu „Polubione”; „Skomentuj” otwiera `.tied-pool` z 3 tekstami, po wyborze przycisk `disabled`; bez informacji o limicie +2 |
| Komentarze | `<details class="tied-comments">` | liczniki i teksty z hasha, komentarz gracza na górze |
| Post niedostępny | `.net-post.is-locked` | awatar, nazwisko, odznaki i `.tied-locked` „Treść dla znajomych/zaufanych”; bez daty, roli, spółki i reakcji; ramka przerywana |
| Wpis kadrowy | `.net-post.tied-hr` | `.tied-kicker` „Objęcie stanowiska” (`zarzad`) lub „Odejście ze spółki” (`wyjscie`), nazwisko i spółka klikalne; bez reakcji |
| Konto spółki | post jak wyżej, awatar z inicjałami nazwy | w `.tied-meta` „Konto spółki · sektor” |
| Profil osoby | `.tied-profile`, `.tied-rel`, `.tied-actions` | rola, spółka, staż, odznaki ze słowem, relacja słowem, liczbą i `renderLimitMeter((rel + 100) / 2, próg)`, kreska na następnym poziomie; ostatnie posty |
| Akcje profilu | `.tied-act` | Obserwuj ↔ Obserwujesz, Napisz, Dodaj do znajomych, Karta spółki; stany: „Prośba wysłana”, „Prośba odrzucona, ponów za 2 kw.”, „W znajomych”, „Następna rozmowa w kolejnym kwartale” (wszystkie `disabled`, tekst mówi dlaczego) |
| Profil firmy | `.tied-profile`, `.tied-board` | sektor, giełda, zarząd z Tied, Obserwuj, Karta spółki, ostatnie posty |
| Mój profil | `.tied-kv`, `.tied-compose` | dane jak dziś + liczba znajomych; 3 gotowe wpisy jako radio, Opublikuj; po publikacji zamiast formularza notka o następnym kwartale i własny post w `net-post` |
| Wiadomości | `.tied-contact` (`.is-new`) | jak dziś; „Nowa” + pasek z lewej; klik otwiera rozmowę w środku i oznacza przeczytane |
| Kontakty | `.tied-filter`, `.tied-contact`, `.tied-level` | rola, spółka, poziom słowem; odeszli: „Dawniej wiceprezes · spółka”; u góry prośby do gracza |
| Prośba do gracza | `.tied-request` | Przyjmij, Odrzuć; wysłane przez gracza widać tylko na profilu |
| Rozmowa, start | `.tied-start` | „Porozmawiaj (2–3 tury)” i „Szybka rozmowa (tylko relacja, do +2)” |
| Rozmowa, tura | `.tied-thread`, `.tied-bubble(.is-me)`, `.tied-turn`, `.tied-choices` | 3–4 opcje, nad każdą ton w `<small>`; numer tury słowem |
| Prośby w rozmowie | `.tied-choices` + `notice-inline` z `klodka` | przy udziale < 5% `disabled` i liczba „Masz 1,2%” |
| Wynik | `.tied-result` | relacja ▲/▼ + liczba, nowa wartość, kiedy następna rozmowa; nastrój w trakcie widać tylko po tonie odpowiedzi |
| Oferta VIP, obietnica | `.tied-offer` | wewnątrz wątku; `notice` gdy 3 z 3 aktywnych |
| Pusty kanał | `.net-empty` | Portfel i Kontakty mówią, co tu trafia |

## Poza Tied
| Miejsce | Zmiana |
|---|---|
| Poczta | folder `important` za `inbox`, etykieta `uiIcon('wazne', 14)` „Ważne”, filtr `importance >= 3` w `getMailInFolder` i `getUnreadMailCount` |
| Mail KNF | zwykły `renderMailPreview`, `importance: 3`; pierwsze ostrzeżenie kończy `alert alert--warn`; decyzja o karze podaje kwotę słowem i liczbą |
| TeamedUP! | pozycja „Obietnice” w `#teamedup-nav`, ikona `karteczka`, liczba aktywnych; `.te-notes` z `.te-note`, `.is-done`, `.is-failed`; `limit-meter` i „320 z 500 akcji” przy celu mierzalnym; „Zrezygnuj” tylko w toku; zakup częściowy opisany na karteczce |
| Karta spółki | w `renderCompanyCardOverview` przy nazwisku `.ceo-link` „Profil w Tied”, pod spodem „Wiceprezesi” i `.ceo-deputies`, gdy `stock.deputies?.length`; bez cech wiceprezesa w karcie |

## Decyzje użytkownika (2026-11-05)
1. **Relacja na profilu:** słowo, miernik i liczba („Znajomy (+34)”).
2. **Odrzucenie prośby od prezesa lub bota:** relacja −2, jak w drugą stronę. Uzupełnia plan, do dopisania w R1.
3. **„Napisz” poza kontaktami:** przycisk `disabled` z tekstem „Rozmowa po zakupie akcji tej spółki”.
4. **Limit +2 za reakcje:** ukryty, bez komunikatu.
5. **Wpisy gracza:** 3 na kwartał: uczciwy o wyniku, ostrożny, chwałba.
6. **Kara KNF:** ostrzeżenie nie podaje kwoty, tylko „Następne wykrycie: kara”.

## Prompt dla czatu kodu (R1, R2, R4, R5)
> Wdróż wygląd 0.17.3 wg `plany/design/10_tied_0.17.3.md` i makiety `plany/design/makiety/10_tied_0173.html`, klasy CSS i ikony są gotowe, nie dopisuj tokenów. Zmieniasz markup: `renderTiedPage` w `internet.js` (podziel na `renderTiedFeed`, `renderTiedPost`, `renderTiedPerson`, `renderTiedCompany`, `renderTiedTalk`, `renderTiedSide`, stan `tiedView` poza zapisem, `.net-tied` i blok profilu po lewej usuń ze `style.css`), wpisy z `addTiedPost` i kadry z `replaceCeo`, `renderMailbox` i `MAIL_FOLDERS`, `getMailInFolder`, `getUnreadMailCount` w `events.js`, `MAIL_FOLDER_LABELS` w `ui.js`, nawigację w `renderTeamedUp` oraz nowe `renderTeamedPromises`, `renderCompanyCardOverview` (`ui.js`). Paski przez `renderLimitMeter`. Usuń `isTiedUnlocked` i ekran blokady zgodnie z R0. Charakter nie może trafić do żadnego tekstu, `title` ani `data-`. Testy: 1 na post niedostępny (bez treści, roli i reakcji), 1 na `.is-talk` przy otwartej rozmowie, 1 na folder „Ważne”, 1 na karteczkę, 1 sprawdzający brak nazw charakterów w HTML Tied. Sprawdź w przeglądarce na desktopie i 390 px, commit po polsku.
