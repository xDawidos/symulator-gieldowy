# 19. Wspólna rama okna i grupy zakładek Państwa (R9)

Makieta: [makiety/19_okna.html](makiety/19_okna.html), samodzielna (tokens.css + sprite). CSS ramy w `makiety/19_okna.css` (ten blok idzie do style.css; to źródło prawdy). Makiety 19, 20 i 21 mają wklejone kopie tokens.css, 19_okna.css i sprite'a, bo podgląd plików w aplikacji otwiera stronę bez plików obok; po zmianie 19_okna.css kopie trzeba odświeżyć. Realizuje O1, O2, O3 i O4 z [17_przeglad_2026-11-10.md](17_przeglad_2026-11-10.md). **Trzeba to zrobić przed L4 z 0.18**, bo w grze zakładka Łańcuchy już jest dziesiątą zakładką Państwa.

## Decyzje użytkownika (2026-11-10)
- Zakładki Państwa w **bocznej szynie** z grupami. Na telefonie szyna zwija się do przycisku „Grupa › Zakładka” z listą.
- Grupy jak w O4: **Gospodarka** (Przegląd, Makro, Energia, Łańcuchy), **Prawo** (Kraj, Podatki, Nadzór), **Programy** (Program emerytalny, Działania państwa), **Rynki** (jedna zakładka, więc w szynie grupa jest od razu zakładką).
- Makieta obejmuje ramę na Państwie, Firmie i Internecie (skórka).

## Co pokazuje / markup
| Część | Co pokazuje | Markup (nowe klasy `wn-*`) |
|---|---|---|
| Skorupa | Jedno okno dla wszystkich: przypięte do góry (`top: 6vh`), **stała** wysokość `min(86vh, 820px)`, przewija się tylko treść. Na telefonie cały ekran | `section.wn[role=dialog][aria-modal]`, wiersze: nagłówek / pasek liczb / ciało |
| Akcent okna | Górna krawędź 3 px i emblemat w kolorze sekcji (`--color-section-*`). Bursztyn tylko w Banku (patrz otwarte) | `.wn--state`, `.wn--firm`… ustawiają `--wn-accent` |
| Nagłówek | Emblemat, tytuł (Plex Sans Condensed 22 px), **jedno zdanie stanu** zamiast kickera z kropkami (O3), np. „Stopa bez zmian, inflacja powyżej celu. Nadzór prowadzi 1 kontrolę Twojego funduszu.” | `.wn-head`, `.wn-emblem`, `h2`, `p`, `.wn-close` (40 px, 44 px na telefonie, `aria-label="Zamknij (Esc)"`) |
| Pasek liczb | Obecny `.bank-ticker`: 3–5 liczb, etykieta zwykłą wielkością liter, liczba w Plex Mono. Na telefonie przewijany w poziomie z wygaszeniem przy prawej krawędzi | `.wn-strip > div > span + b` |
| Szyna (okna z >6 zakładkami: Państwo, Miasto) | Grupy z ikoną i nazwą, zakładki pod nimi; wybrana: tło `raised`, pogrubienie, pasek 3 px w kolorze okna. Licznik przy zakładce, gdy coś czeka (Łańcuchy 2 napięte, Nadzór 1 kontrola) | `nav.wn-rail > .wn-list[role=tablist][aria-orientation=vertical] > .wn-group[role=group] > h3 + button.wn-tab[role=tab]`, `.wn-tab.is-solo`, `.wn-count` |
| Zakładki poziome (do 6: Firma, Bank, Klienci, Budownictwo) | Ten sam `.wn-tab`, znacznik wyboru jako kreska pod spodem | `nav.wn-tabs` w `.wn-body.is-tabs` |
| Skórka Internetu | Pasek przeglądarki (wstecz, odśwież, adres `ulubione.cq`, zamknij) zamiast nagłówka, Ulubione jako zakładki. Reszta ramy ta sama. TeamedUP! tak samo | `.wn--net`, `.wn-browser`, `.wn-nav`, `.wn-url`, `.wn-favs` |
| Telefon | Okno na cały ekran, szyna = przycisk `.wn-pick` („Gospodarka › Łańcuchy”, 48 px) i rozwijana lista nad treścią | `button.wn-pick[aria-expanded]` + `.wn-list` |

## Zachowanie (jedno dla wszystkich okien)
- Otwarcie: fokus na tytuł albo pierwszą zakładkę; fokus uwięziony w oknie; Esc i `.wn-close` zamykają, fokus wraca na przycisk, który otworzył okno.
- Klik w tło zamyka (jak dziś w Firmie).
- Zmiana zakładki nie zmienia rozmiaru okna; treść wraca na górę (`scrollTop = 0`).
- Szyna: strzałki góra/dół między zakładkami, Enter/Spacja wybiera. Na telefonie wybór zamyka listę.
- Ostatnia zakładka okna zapamiętana do końca sesji.

## Przepięcie obecnych okien
| Dziś | Po |
|---|---|
| `.modal.bank-window` + `.close-btn` + `.bank-hero` (`.bank-hero-kicker`, `.bank-hero-title`) | `.wn` + `.wn-head` (kicker → zdanie stanu z funkcji, np. `stateHeadline()`) |
| `.bank-ticker` | `.wn-strip` (te same dane) |
| `.bank-tabs` / `.bank-tab-btn` | `.wn-tabs` / `.wn-tab` albo `.wn-rail` |
| `.bank-tab-content`, `#state-body` | `.wn-main` |
| `#corporation-overlay` + `.corp-modal` | `.wn.wn--firm` w tym samym mechanizmie co reszta (`closeModalFrom`) |
| `#internet-modal` + `.tab-btn` Kantoru | `.wn.wn--net`; zakładki Kantoru wewnątrz strony zostają poziome `.wn-tabs` |
| `switchStateTab(id)` | bez zmian w danych; render szyny z tablicy grup `STATE_TAB_GROUPS` |

Miasto ma 7 zakładek (z Wyborami), więc też dostaje szynę. Proponowane grupy Miasta: **Miasto** (Przegląd, Wybory), **Spółki** (Spółki miejskie, Firmy prywatne), **Projekty** (PPP, Specjalne, Lotnisko). Do potwierdzenia przy kodzie.

## Otwarte
- Bank ma akcent `--color-section-bank` = bursztyn, a po R4 bursztyn oznacza „Twoje”. Propozycja: Bank na `--blue-300` albo neutralny `--ink-300`. Decyzja użytkownika.
- `.wn-count` używa koloru ostrzeżenia; jeśli liczników będzie dużo, przejść na neutralny.

## Prompt dla czatu kodu
> Wprowadź wspólną ramę okna z `plany/design/19_okna.md` i makiety `plany/design/makiety/19_okna.html` (R9). Skopiuj blok CSS „wspólna rama okna” (klasy `wn-*`) do `style.css`, z `@container (max-width: 640px)` zamienionym na `@media (max-width: 640px)` i `position: absolute` okna/tła na `fixed`. Najpierw przepnij Państwo: szyna z grupami Gospodarka (Przegląd, Makro, Energia, Łańcuchy), Prawo (Kraj, Podatki, Nadzór), Programy (Program emerytalny, Działania państwa), Rynki; na telefonie przycisk „Grupa › Zakładka” z listą. Potem pozostałe `.modal.bank-window` (zakładki poziome `.wn-tabs`), Firmę (`#corporation-overlay` do tego samego mechanizmu) i Internet jako skórkę `.wn--net`. Kickery z kropkami zamień na jedno zdanie stanu liczone z danych. Okno ma stałą wysokość i przewija tylko `.wn-main`. Zachowaj `switchStateTab` i dane zakładek, zmieniasz tylko ramę. Dodaj testy: 10 zakładek Państwa w 4 grupach, Esc zamyka każde okno, zmiana zakładki nie zmienia wysokości okna, brak `.bank-hero-kicker` z „·”. Commit po każdym oknie.
