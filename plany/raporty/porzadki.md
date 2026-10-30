# Porządki 0.16.x → po 0.16.11 (usunięte pliki, graf, podział funkcji)

## 1. Usunięte pliki
| Co | Dlaczego |
|---|---|
| `plany/raporty/k4base,k4cz,k4de,k4de48,k4de57,k4pl,k4us.json`, `sim_015_final.json` (≈9,5 MB) | Surowe serie z przebiegów; `plany/raporty/*.json` było w `.gitignore`, ale pliki były wciąż śledzone. Nikt ich nie czyta (żaden `*.js`, `index.html`, `tests`); wnioski są w raportach `.md` (`kontrola_*`, `pomiar_*`, `baza_0.16.md`). Odtwarzalne przez `run_przebiegi.mjs`. |
| `plany/design/stitch/export/` (5 folderów, ≈2,5 MB) | Bajt w bajt kopie folderów obok (`diff -r` bez różnic). Wzmianki w `plan_0.16.6` i `kontrola_0.16.5` o „nowszej wersji w export” są nieaktualne – identyczne. |
| `.vs/` (9 plików, ≈1 MB) | Cache Visual Studio, w `.gitignore`, a mimo to śledzony. Usunięty z repo. |

Zostawione celowo: `graphify-out/.graphify_labels.json` (używa go graphify; `graph.backup-*.json` nie istnieją), `img/ikony` (źródła sprite'a), `img/logo`, `lib/*`, `data/*`, `img/globus`, `plany/design/zrzuty` (powołują się na nie raporty), `planyPoprzednie.zip`.

Plany oznaczone jako zastąpione: `plan_sektor_budowlany.md` (→ `plan_0.15.5_budownictwo_banki.md`).

Test po porządkach: 885/885.
