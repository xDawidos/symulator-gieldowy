# Plan wersji 0.11 „Ciemna Strefa”

## Decyzje

- **Porażka grozi tylko graczowi współpracującemu** z mafią lub korupcją. Wysoki poziom mafii bez udziału gracza oznacza kryzys „państwa mafijnego”, który da się odwrócić. Nie oznacza końca gry.
- **Brudne operacje idą przez fundusz.** Płaci gotówka funduszu (NAV). Każde wykrycie uderza w zaufanie klientów, daje wpis compliance w CV, obniża ocenę zarządu i może skończyć się degradacją.
- **Realizacja w częściach**, z commitem i testami po każdej.
- **Czas zawsze liczony w czasie gry** (tygodnie i kwartały), nigdy w minutach rzeczywistych.
- **Wszystkie efekty cenowe mają limity.** Nie psujemy balansu z A4.

## 0.11.1 Nadzór i korupcja

- **Wskaźnik korupcji 0–100**, wspólny dla całego świata.
  - Rośnie od korupcyjnych czynów gracza, botów i prezesów.
  - Spada dzięki skutecznej policji i KNF, z naturalnym powrotem do poziomu bazowego.
  - Wysoka korupcja:
    - zwiększa zmienność rynku;
    - częściej wywołuje afery;
    - obniża skuteczność policji.
- **Policja i KNF (Komisja Nadzoru Finansowego)** w nowej zakładce „⚖️ Nadzór” w oknie Państwa.
  - Każda instytucja ma poziom 0–5, budżet z Skarbu Państwa i skuteczność.
  - Gracz może wpłacić dotację z konta prywatnego.
  - Przy korupcji ≥ 40 pojawia się łapówka: spokój od śledztw na kilka kwartałów, ale korupcja rośnie.
- **Podejrzenia i drabina kar** dla gracza i botów. Kolejne wykrycia oznaczają:
  1. mandat;
  2. wyższy mandat;
  3. rekwizycja nielegalnie zdobytych aktywów i blokada handlu (w czasie gry);
  4. czytelne ostrzeżenie „jeszcze jedno wykrycie = wyrok”;
  5. porażka: „Zostałeś skazany za udział w zorganizowanej grupie przestępczej”.

  Każde wykrycie gracza:
  - obniża zaufanie klientów;
  - daje wpis compliance w CV (ocena zarządu −5);
  - kosztuje fundusz (mandat płaci fundusz).
- **Szara strefa** (nowy przycisk w menu), czyli usługi korupcyjne opłacane z funduszu:
  - przeciek z Banku Centralnego: dokładna decyzja o stopach przed posiedzeniem;
  - umorzenie długu spółki większościowej za łapówkę;
  - sprzedaż pakietu „pod stołem” botowi z premią, poza rynkiem;
  - ustawienie przetargu dla spółki budowlanej, w której fundusz ma większość.
- **Boty-ryzykanci** też korzystają z korupcji: podnoszą wskaźnik, bywają wykrywani i płacą mandaty.
- **Rosnąca uwaga otoczenia** zamiast „hamulców” przy stałych kwotach. Im większy fundusz na tle rynku, tym częstsze kontrole KNF. Czysta kontrola podnosi zaufanie klientów, wykrycie uruchamia drabinę kar.
- **Nowe cechy prezesów:**
  - „Skłonny do korupcji”;
  - „Skorumpowany” (podnosi korupcję, ryzyko afery);
  - „Niezależny” (spółka odporna na korupcję i, od 0.11.2, na mafię).
- **Zapis gry v11.**

## 0.11.2 Mafia (aktywuje się po pierwszym kontakcie gracza)

- **Usługi:**
  - pożyczka na preferencyjnych warunkach, z ostrą ścieżką windykacji;
  - sabotaż konkurencji (ograniczony negatywny event);
  - cynk o „przekręcie” na Giełdzie Śmieciowej;
  - haracz i ochrona (co tydzień gry).
- **Odmowa lub niezapłacony haracz** skutkuje zdarzeniami wymierzonymi w gracza.
- **Wpływy mafii w 5 nazwanych etapach:** Szara strefa → Układ → Ośmiornica → Państwo w państwie → Kryzys. Kasa mafii jest osobnym zasobem.
  - Od etapów wyższych pojawiają się:
    - mafijne spółki;
    - członkowie zarządu i prezesi z mafii (10–30% zysku dla mafii, wykrywalni przez policję);
    - czarny rynek akcji;
    - przejęcia;
    - propozycje nie do odrzucenia.
  - Spółka tuż przed bankructwem może zostać „uratowana” przez mafię za 1–5% udziałów.
- **Bruno „Elegant” Gato:**
  - majątek startowy 1,5× najbogatszego bota;
  - pakiety widoczne w akcjonariacie jako „akcjonariusz nieujawniony ~X%”, ale wewnętrznie liczone;
  - manipulacje cenami z limitem.
- **Rekwizycja przez policję:** aukcja zajętych aktywów, w której ukarany nie może brać udziału.
- **AI Capone i porachunki mafii:** seria zdarzeń.
- **Jedna spółka-żart** („Całkowicie Legalna Firma”), której wynik rośnie z wpływami mafii.
- **Wejściówki od mafii:**
  - pakiet akcji z debiutu na elitarnej giełdzie „spod lady” albo „załatwiona” ocena zarządu;
  - w zamian zlecenie z terminem w kwartałach.

## 0.11.3 Afery

- **Parabanki i scenariusze w stylu Amber Gold (3 warianty).**
  - Wysokie lokaty kuszą fundusz.
  - Upadek oznacza dla funduszu utratę lokat (NAV), spadek zaufania klientów i problem z compliance.
  - Kolejne etapy: dziennikarskie śledztwo, blokada notowań, wycena likwidacyjna 5–15%, ucieczka prezesa.
- **Parabanki udzielają kredytów bez oceny wiarygodności**, na bardzo wysoki procent.
- **Okienko pilnych wiadomości** (pasek z najważniejszymi informacjami).
- **Wojny PR** między dwiema spółkami z tej samej branży o podobnej kapitalizacji. KNF przeciwdziała czarnemu PR.

## 0.11.4 Zbrojeniówka i Gwardia

- **Sektor „Broń i obronność”:** 4 spółki na Giełdzie Złotej i Platynowej.
  - Targi zbrojeniowe z nagrodą „innowacja roku”.
  - Kontrakty państwowe zależne od partii rządzącej.
  - Bonusy zależne od siły policji, dotacje dla policji przy świetnych wynikach.
  - Mafia nie kupuje tych spółek.
- **Cechy prezesów:** „Emerytowany policjant”, „Generał”, „Były wojskowy”.
- **Fundusz „Gwardia”:** bot-fundusz, który nie współpracuje z mafią, lubi zbrojeniówkę i klasyczne sektory. Utrudnia mafijne przejęcia swoich spółek. Działa bez dochodu „z powietrza”.

## Później (osobno)

- **Ukryte „perły”:** przełom fundamentalny w 2 losowych spółkach (skok przychodów, więc wartość godziwa idzie w górę razem z ceną), z wczesnymi sygnałami dla uważnych graczy.
