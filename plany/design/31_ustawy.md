# 31. Ustawy w zakładce Kraj: jeden układ (Państwo → Prawo → Kraj) — zaakceptowana 2026-11-22, zaktualizowana do planu 0.19.1 P5b (zmiany do akceptacji)

Makieta: [makiety/31_ustawy.html](makiety/31_ustawy.html) (samodzielna). Uwaga użytkownika 2026-11-22: w zakładce Kraj są dwa sposoby pokazywania ustaw, a finansowanie infrastruktury jest poza tym.

## Stan w kodzie (2026-11-22)
- `renderCountryPanel()` (`ui.js:9370`): karta „Ustawy” z tabelą wszystkich `SOCIAL_LAWS` — ikona (często **emoji** z `law.icon`, gdy brak `uiIcon`), nazwa, poziom słowem, „zapowiedź” albo „zmiany: N”, kropki `.law-pip`.
- Pod spodem osobno `renderInfraLawSteps()` (`infrastructure.js:404`) i `renderClimateLawSteps()` (`energy_ui.js:161`): oś kroków `ol.crisis-axis.law-steps` z opisem skutku każdego poziomu. Te dwie ustawy są więc pokazane dwa razy, za każdym razem inaczej.

## Jeden układ
| Część | Treść | Markup / ARIA |
|---|---|---|
| Grupy | Praca i socjal (Płaca minimalna, Zasiłki, Mieszkania socjalne, Prawa pracownicze), Rynek i spółki (Próg wezwania, Progi CIT, Ustawa antymonopolowa), Energia i klimat (Polityka energetyczna, Dostawcy energii, Polityka klimatyczna) | `section.lw-grp[aria-label] > h3 + ul.lw` |
| Wiersz | ikona SVG (bez emoji), nazwa i „zmiany: N”, poziom słowem, zapowiedź jako znacznik z zegarem, skala poziomów, strzałka | `button.lw-row[aria-expanded][aria-controls]` |
| Skala | odcinki: ustawy porządkowe (np. Płaca minimalna) wypełnione do bieżącego; **rodzaje** (Polityka energetyczna, Progi CIT, Dostawcy energii) tylko bieżący odcinek; zapowiedź jako odcinek z przerywaną ramką | `.lw-scale[role=img][aria-label="poziom 2 z 4"]` („wariant” dla rodzajów) |
| Rozwinięcie | wszystkie poziomy ze skutkiem (dawne osie kroków, teraz dla każdej ustawy), bieżący i zapowiedziany oznaczone słowem | `div.lw-detail[id] > ol.lw-levels > li[aria-current]`, `.is-next` |
| Polityki ministerstw (P5b) | grupa „Polityki ministerstw”: Finansowanie infrastruktury w tej samej karcie z dopiskiem „decyduje: Ministerstwo Infrastruktury”; po rozwinięciu program partii, reguła ministra (przepustowość < 0,85 → +1 poziom, najwyżej raz na rok), ostatnia zmiana i odnośnik do karty ministerstwa. Później tak samo energia (UEiE) | `.lw-by`, `dl.lw-who` |
| Kto chce zmiany, ostatnia zmiana (P5b) | po rozwinięciu: „Chcą zmiany” (partie i kierunek), „Przeciw”, „Ostatnia zmiana” (kwartał, z → na) | `dl.lw-who` |
| Skrót w zakładce Kraj (P5b) | ta sama karta, 4 najważniejsze ustawy i odnośnik „Pełna lista: Prawo → Ustawy”; identyfikatory rozwinięć z prefiksem, żeby nie dublować pełnej listy | `#short ul.lw`, `id="ds-…"` |

Ikony zamiast emoji: Płaca minimalna `moneta`, Zasiłki `serce`, Mieszkania `blok`, Prawa pracownicze i antymonopolowa `waga`, Próg wezwania `megafon`, Progi CIT `raport`, energetyka `prad`, dostawcy `firma`, klimat `emisje`. Opisy skutków poziomów w makiecie są przykładowe; w kodzie dla infrastruktury i klimatu już są (`small` w `law-steps`), dla pozostałych ustaw do dopisania przy `SOCIAL_LAWS` (np. pole `effects`).

## Prompt dla czatu kodu
> Według `plany/design/31_ustawy.md` i makiety `plany/design/makiety/31_ustawy.html`: w `renderCountryPanel()` zamień kartę „Ustawy” i osie `renderInfraLawSteps` / `renderClimateLawSteps` na jedną listę `ul.lw` w trzech grupach; wiersz jako `button[aria-expanded]` z rozwinięciem wszystkich poziomów i skutków; ikony SVG zamiast emoji; skala porządkowa albo rodzaje; polityka `infrastructure` w grupie „Polityki ministerstw” z dopiskiem „decyduje: Ministerstwo Infrastruktury”; po rozwinięciu kto chce zmiany i ostatnia zmiana; ta sama funkcja karty w skrócie (4 ustawy) i w pełnej liście (P5b). Testy: brak emoji w wierszach ustaw; jedna funkcja renderuje kartę w obu miejscach; liczba i poziomy ustaw identyczne w obu widokach; unikalne id rozwinięć.
