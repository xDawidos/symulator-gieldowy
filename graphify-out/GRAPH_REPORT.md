# Graph Report - wizardly-saha-d677dd  (2026-10-18)

## Corpus Check
- 70 files · ~345,732 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .db 2, .vsidx 1)

## Summary
- 2597 nodes · 5463 edges · 118 communities (101 shown, 17 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 237 edges (avg confidence: 0.83)
- Token cost: 962,210 input · 0 output

## Community Hubs (Navigation)
- Spółki: dane i stałe
- UI: wykresy i widoki
- Rdzeń: stan i obligacje
- Gracz i pula inwestycyjna
- Testy jednostkowe
- Fuzje, przejęcia, walne
- Zapis i pętla gry
- Boty AI
- Państwo, miasto, nadzór
- Akademia i nauka
- Poczta i zdarzenia
- UI: fundusz i portfel
- Plan 0.13 i mapa
- Finanse: lokaty i banki
- Segmenty i podsektory
- Pracownicy i związki
- Makro i cykle
- Spółki zależne
- Kooperacje i KNF
- Fundusz i dostęp do giełd
- Zatłoczenie rynku i ceny
- Startupy
- Dywidendy i księgowość
- Plan 0.15 Hossa i bessa
- Klienci funduszu
- Korupcja i nadzór
- Poprawki 0.14.1–0.14.2
- Operatorzy rynków
- Projekty specjalne
- Bankructwa i dostępne akcje
- Plan 0.16 Giełda międzynarodowa
- Budownictwo i bilans
- Pasek newsów i niezmienniki
- Przetargi budowlane
- ETF-y
- Okresy funduszu
- Inwestycje i reputacja
- Mafia
- Kredyty spółek
- Badania i technologie
- Wydzielenia i opisy
- Rynek pracy i migracja
- Roadmap: banki i obligacje
- Sektory: rejestr i odczyty
- Roadmap: wersje 0.8–1.0
- Pierwotna lista planów
- Tabela akcji
- Roadmap: prestiż i miasto
- Plan 0.10.2 Makro
- Plan 0.15.1 Kryzysy
- Kariera i ocena
- Lombard i windykacja
- Roadmap: ciemna strefa
- Plan 0.11.5 Balans
- Emisje JU i przepływy
- Audyt planu 0.15
- UI: okna pomocnicze
- Wynik kwartalny i koszt pracy
- Pasek górny i debug
- Plany 0.11.6 i 0.12
- Opłaty i przejęcia funduszy
- Budowy: UI
- Giełdy elitarne
- Plan 0.11 Ciemna strefa
- Społeczeństwo i partie
- Migracja segmentów
- Roadmap: startupy
- Ranking i CV
- Zapowiedź wydzielenia
- Przetargi: porządki
- Okna banków i miasta
- Presety przebiegów
- UI: banki
- UI: startupy i pula
- Kontrola 0.14
- Roadmap: relacje i M&A
- Magazyn zapisu (IndexedDB)
- Parabanki i afery
- UI: poczta
- Profile sektorów
- Roadmap: cel gry
- Roadmap: interfejs i postacie
- Intro i tryb debug
- Audyt 0.10.2
- Audyt 0.15: kalibracja
- Roadmap: umiejętności
- Weryfikacja 0.13.1
- Audyt startupów 0.14.1
- Tworzenie funduszy
- Pożyczki pomostowe
- Okna funduszu i JU
- Kompresja lz-string
- Audyt mechanik
- Pomysły odłożone
- Kontrola 0.14.2
- Raport zapisu 0.14.3
- Ikony budynków
- Prowizje i koncesje
- Okno rynku akcji
- Cele korporacji
- Usługi mafii
- Ikony sektorów
- Szkielet strony i testy
- Sprite postaci
- Zakup obligacji
- Panel startupów
- Przełącznik wykresu
- Okna zarządzania spółką
- Okna wykresu i alertów
- Ikona banknotu
- Ikona zapisu
- Karta spółki
- Ekran porażki
- Walne zgromadzenia
- Powiadomienia
- Ekran zwycięstwa
- Strona przebiegów

## God Nodes (most connected - your core abstractions)
1. `escapeHtml()` - 59 edges
2. `Plan 0.15 Hossa i bessa` - 46 edges
3. `formatZl()` - 44 edges
4. `makeCompany()` - 39 edges
5. `resetWorld()` - 37 edges
6. `Audyt planu 0.15 Hossa i bessa` - 31 edges
7. `Plan 0.16 Gielda miedzynarodowa (szkic)` - 29 edges
8. `Plany (pierwotna lista)` - 26 edges
9. `processFinancialReports()` - 25 edges
10. `applyPriceEffect()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `R0 Audyt przepływów pieniędzy w inkubatorze` --references--> `updateStartupAutoInvestTimers()`  [AMBIGUOUS]
  plany/plan_0.14.1_startupy.md → companies.js
- `R5 Portfel prywatny: mniej pieniędzy, więcej wyborów` --references--> `computePerformanceBonus()`  [AMBIGUOUS]
  plany/plan_0.14.1_startupy.md → player.js
- `R5 Portfel prywatny: mniej pieniędzy, więcej wyborów` --references--> `chargeManagementFee()`  [AMBIGUOUS]
  plany/plan_0.14.1_startupy.md → player.js
- `R5 Portfel prywatny: mniej pieniędzy, więcej wyborów` --references--> `settleCorporateGoals()`  [AMBIGUOUS]
  plany/plan_0.14.1_startupy.md → player.js
- `Lokaty spolek w JU (limit 5% / 10%)` --references--> `processCorporateSubscriptions()`  [INFERRED]
  plany/raporty/weryfikacja_0.13.1.md → player.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Virtual-clock simulation pipeline** — tests_przebiegi_loadframe, tests_przebiegi_stub, tests_przebiegi_presets, tests_przebiegi_probe, tests_przebiegi_onerun, tests_przebiegi_runner [EXTRACTED 1.00]
- **bank-window styled modals (hero, ticker, tabs)** — index_bank_modal, index_city_investment_modal, index_state_modal, index_construction_sector_modal, index_clients_modal [EXTRACTED 1.00]
- **Player fund management (NAV, JU emission, clients)** — index_portfolio_panel, index_fund_emission, index_clients_modal, index_trading_account_switch [INFERRED 0.85]
- **Diagnoza i kalibracja dryfu GIG** — plany_raporty_audyt_planu_0_15_gig_drift, plany_raporty_audyt_planu_0_15_h0_pomiar, plany_raporty_audyt_planu_0_15_h1_kalibracja, plany_raporty_audyt_planu_0_15_rownowazony_gig, plany_raporty_audyt_planu_0_15_gig_wazony_kapitalizacja, plany_raporty_kontrola_0_14_2_atrybucja_gig_marzy [INFERRED 0.85]
- **Mechanika krachu H4** — plany_raporty_audyt_planu_0_15_h4_krach, plany_raporty_audyt_planu_0_15_bezpieczniki, plany_raporty_audyt_planu_0_15_margin_call_botow, plany_raporty_audyt_planu_0_15_ciecie_stop, plany_raporty_audyt_planu_0_15_knf_dzwignia [EXTRACTED 1.00]
- **Warstwa zapisu 0.14.3** — plany_raporty_zapis_0_14_3_indexeddb_save_store, plany_raporty_zapis_0_14_3_format_gz, plany_raporty_zapis_0_14_3_format_lz16, plany_raporty_zapis_0_14_3_zapis_atomowy, plany_raporty_zapis_0_14_3_eksport_import [EXTRACTED 1.00]
- **Krach i reakcja instytucji (H4)** — plany_plan_0_15_hossa_bessa_krach, plany_plan_0_15_hossa_bessa_margin_call_botow, plany_plan_0_15_hossa_bessa_bezpieczniki, plany_plan_0_15_hossa_bessa_bank_centralny_ciecie, plany_plan_0_15_hossa_bessa_knf_dzwignia [EXTRACTED 1.00]
- **Widok nastroju za umiejetnoscia (H2b)** — plany_plan_0_15_hossa_bessa_analityk_indeksowy_l4_l5, plany_plan_0_15_hossa_bessa_potwierdzenie_fazy, plany_plan_0_15_hossa_bessa_indeks_strachu_chciwosci, plany_plan_0_15_hossa_bessa_okno_rynek, plany_plan_0_15_hossa_bessa_premia_ryzyka_akcji [EXTRACTED 1.00]
- **Silnik szokow sektorowych (banki, krach, kryzysy)** — plany_plan_0_15_hossa_bessa_banka_sektorowa, plany_plan_0_15_hossa_bessa_apply_sector_shock, plany_plan_0_15_hossa_bessa_udzial_segmentu, plany_plan_0_15_1_kryzysy_linie_kryzysow [INFERRED 0.85]
- **Kolejnosc wersji 0.13 -> 0.14.x -> 0.15 -> 0.16** — plany_plan_0_13_spoleczenstwo, plany_plan_0_14_struktura_spolek, plany_plan_0_13_0_16_mapa_v0_14_5_redesign, plany_plan_0_13_0_16_mapa_v0_15_hossa_bessa, plany_plan_0_13_0_16_mapa_v0_16_gielda_miedzynarodowa [EXTRACTED 1.00]
- **Cykl zycia grupy kapitalowej (segmenty, wydzielenie, koncern, corki)** — plany_plan_0_14_struktura_spolek_segmenty, plany_plan_0_14_struktura_spolek_rozszerzenie_pivot, plany_plan_0_14_struktura_spolek_spin_off, plany_plan_0_14_struktura_spolek_koncerny_kooperacje, plany_plan_0_14_struktura_spolek_spolki_zalezne [EXTRACTED 1.00]
- **Ryzyko pracownicze spolki (polityka, zadowolenie, zwiazki, szara strefa)** — plany_plan_0_13_spoleczenstwo_polityka_kadrowa, plany_plan_0_13_spoleczenstwo_zadowolenie, plany_plan_0_13_spoleczenstwo_zwiazki_zawodowe, plany_plan_0_13_spoleczenstwo_szara_strefa, plany_plan_0_13_spoleczenstwo_koszt_pracy [EXTRACTED 1.00]
- **Rozliczanie pieniędzy puli inwestycyjnej** — plany_plan_0_14_1_startupy_pula_inwestycyjna, plany_plan_0_14_1_startupy_rozliczenie_puli, plany_plan_0_14_1_startupy_niezmiennik_inkubatora, plany_plan_0_14_1_startupy_limit_10_procent_startupy, companies_removestartup, player_getfundassets [EXTRACTED 1.00]
- **Potok zapisu bez limitu (IndexedDB, kompresja, atomowość, eksport)** — plany_plan_0_14_3_zapis_savestore, plany_plan_0_14_3_zapis_kompresja_lz_string, plany_plan_0_14_3_zapis_zapis_atomowy, plany_plan_0_14_3_zapis_eksport_import_pliku, main_savegamestate, main_applysavesnapshot [EXTRACTED 1.00]
- **Wykrycie exploitow i ich balans w 0.11.5** — plany_testy_ogolne_0_11_za_mocne, plany_plan_0_11_5_balans_exploity_b1, plany_plan_0_11_5_balans_pakiet_pod_stolem, plany_plan_0_11_5_balans_parabank, plany_plan_0_11_5_balans_cynk, plany_plan_0_11_ciemna_strefa_szara_strefa [INFERRED 0.85]
- **Ciemna strefa: korupcja, nadzor, mafia i kary** — plany_plan_0_11_ciemna_strefa_wskaznik_korupcji, plany_plan_0_11_ciemna_strefa_policja_knf, plany_plan_0_11_ciemna_strefa_drabina_kar, plany_plan_0_11_ciemna_strefa_szara_strefa, plany_plan_0_11_ciemna_strefa_mafia [EXTRACTED 1.00]
- **Nauka analizy fundamentalnej** — plany_plan_0_12_nauka_akademia, plany_plan_0_12_nauka_skaner_spolek, plany_plan_0_12_nauka_analityk_finansowy, plany_plan_0_12_nauka_ksiegowy_audytor, plany_plan_0_12_nauka_czerwone_flagi, plany_plan_0_12_nauka_kreatywna_ksiegowosc, plany_plan_0_11_6_uwagi_rozbieznosc_cz [INFERRED 0.85]
- **Ekosystem finansowy: bank centralny, banki komercyjne, fundusze, finanse spółek** — plany_roadmap_bank_centralny, plany_roadmap_banki_komercyjne, plany_roadmap_fundusze, plany_roadmap_finanse_spolek, plany_roadmap_obligacje [EXTRACTED 1.00]
- **Ciemna strefa: mafia, korupcja i firmy z giełdy śmieciowej** — plany_roadmap_mafia, plany_roadmap_korupcja, plany_roadmap_legalna_firma, plany_roadmap_firma_krzak, plany_roadmap_wejsciowki_mafia [EXTRACTED 1.00]
- **Partie, wybory, lobbing i technologie zmieniające rynek** — plany_roadmap_partie, plany_roadmap_wybory, plany_roadmap_lobbing, plany_roadmap_technologie [INFERRED 0.85]
- **Pixel-artowe ikony ulepszen firmy (kremowe tlo, czarny kontur)** — img_billboardicon, img_box, img_branch, img_equipment, img_fabrykaicon [INFERRED 0.75]
- **Sector icon set (beige 64px tiles)** — img_mine, img_medlab, img_server, img_globe [INFERRED 0.75]

## Communities (118 total, 17 thin omitted)

### Community 0 - "Spółki: dane i stałe"
Cohesion: 0.01
Nodes (137): ACCOUNTANT_REQUIRED, ALL_COMMERCIAL_BANKS_DEFINITIONS, ARISTOCRAT_BONUS, bankingPrefixes, bankingSuffixes, bankInvestments, canFundTopUp(), centralBankGovernorTraits (+129 more)

### Community 1 - "UI: wykresy i widoki"
Cohesion: 0.03
Nodes (56): aggregateCandles(), applySectionCollapse(), BANK_TYPE_STYLES, calculateNiceYAxisRange(), CLASS_COLORS, COLLAPSIBLE_SECTIONS, COMPANY_CARD_TABS, companyCardView (+48 more)

### Community 2 - "Rdzeń: stan i obligacje"
Cohesion: 0.02
Nodes (68): activeBonds, activeTenders, allBonds, allTBills, ANTITRUST_UPGRADE_COSTS, antitrustOffice, BANK_TYPES, BASE_DELAYS (+60 more)

### Community 3 - "Gracz i pula inwestycyjna"
Cohesion: 0.03
Nodes (55): Pula inwestycyjna, activeModifiers, ANALYST_TYPES, applyFestivalBonus(), CAREER_POSITIONS, checkIncubatorInvariants(), checkPoolInvariants(), city (+47 more)

### Community 4 - "Testy jednostkowe"
Cohesion: 0.06
Nodes (55): assert(), AssertionError, assertNear(), awardContract(), biotech(), careerWorld(), externalMark(), externalNetFlow() (+47 more)

### Community 5 - "Fuzje, przejęcia, walne"
Cohesion: 0.08
Nodes (69): abortTakeover(), acceptRescueOffer(), activateDefenseMechanism(), ACTIVIST_PROPOSALS, advanceMergerProcess(), aiDecideOnRescueOffer(), applyAgmResolution(), applyComplicationOption() (+61 more)

### Community 6 - "Zapis i pętla gry"
Cohesion: 0.06
Nodes (66): processAiLoansWeekly(), applySaveSnapshot(), buildSaveJson(), buildSaveRecord(), buildSaveSnapshot(), clearIntervals(), compactBondsForSave(), compactPricePoints() (+58 more)

### Community 7 - "Boty AI"
Cohesion: 0.06
Nodes (58): acceptBankBlockOffer(), acceptBotBlock(), aiBuySharesFromInvestmentBank(), aiBuyStock(), aiCanInvestInStartups(), aiChooseCommercialBank(), aiCompetitors, aiFestivalActions() (+50 more)

### Community 8 - "Państwo, miasto, nadzór"
Cohesion: 0.04
Nodes (47): aiCampaignDonations(), changeReputationWithMayor(), CITY_ATTRACTIONS, cityInvestment, commissionCityTender(), ensureCityModel(), ensurePpp(), FESTIVAL_BOOST_SECTORS (+39 more)

### Community 9 - "Akademia i nauka"
Cohesion: 0.07
Nodes (50): ACADEMY_BASE_ENTRIES, ACADEMY_ENTRIES, academyNotifyQueue, academyQuizSubmit(), academyView, applyScannerPreset(), assignMentorTasks(), checkAcademyTriggers() (+42 more)

### Community 10 - "Poczta i zdarzenia"
Cohesion: 0.06
Nodes (49): AD_TEMPLATES, addMail(), addToDigest(), bankingSectorEventsPrompts, chargeMagazineSubscriptions(), companySpecificEventsPrompts, CORPORATION_CATEGORIES, eventLog (+41 more)

### Community 11 - "UI: fundusz i portfel"
Cohesion: 0.07
Nodes (57): corporationAction(), displayEtfs(), displayFundPanel(), displayPortfolio(), escapeHtml(), formatMainSectorLabel(), formatRatio(), formatZl() (+49 more)

### Community 12 - "Plan 0.13 i mapa"
Cohesion: 0.07
Nodes (47): RULING_PARTIES, Mapa prac 0.13-0.16, A1 Dlugi przebieg weryfikacyjny x200, A3 Licznik przyciec trimGhostHolders, Etap A: domkniecie 0.13 i 0.13.1, Osobny limit spolek zagranicznych (1,5x na kraj), marketRegimes (nastroj per rynek), Rynek pracy 2 (po 0.16) (+39 more)

### Community 13 - "Finanse: lokaty i banki"
Cohesion: 0.07
Nodes (44): BOND_RECOVERY, breakFundDeposit(), bridgeLoanOffers, buyOutAllHolders(), canBankLend(), canBankTakeFundDeposits(), checkBondMaturities(), delistStockAtPrice() (+36 more)

### Community 14 - "Segmenty i podsektory"
Cohesion: 0.11
Nodes (41): addStockSegment(), advancePivot(), applyBinaryPriceJump(), areSectorsRelated(), canChooseNiche(), canEnterSubsector(), canPivot(), canStartExpansion() (+33 more)

### Community 15 - "Pracownicy i związki"
Cohesion: 0.08
Nodes (41): applyLaborPolicy(), createUnion(), ensureWorkforce(), getCeoLaborPolicy(), getCeoUnionResponse(), getGreyShare(), getMarketWage(), getRightsLevel() (+33 more)

### Community 16 - "Makro i cykle"
Cohesion: 0.08
Nodes (40): addMacroLog(), advanceEconomyCycle(), advanceEducation(), advanceElectionCycle(), advanceMacroQuarter(), advanceSectorCycles(), applyRateSurprise(), clampValue() (+32 more)

### Community 17 - "Spółki zależne"
Cohesion: 0.09
Nodes (37): absorbSubsidiary(), applyGroupPolicy(), canPlayerManageSubsidiary(), ensureCompanyCash(), foundConcernSubsidiary(), getGroupRedFlag(), getLoanRate(), getMarketLoanRate() (+29 more)

### Community 18 - "Kooperacje i KNF"
Cohesion: 0.09
Nodes (36): breakCooperation(), canCooperate(), canPlayerFileKnfComplaint(), endCooperation(), fileKnfComplaint(), findCoopSegmentPair(), findRelatedPartyOwner(), getCapThreshold() (+28 more)

### Community 19 - "Fundusz i dostęp do giełd"
Cohesion: 0.09
Nodes (33): Dostep do gield wg stanowiska, applyTradeImpact(), botBuy(), botSell(), buyIndex(), buyOwnFundUnits(), buyStock(), buyStockPrivate() (+25 more)

### Community 20 - "Zatłoczenie rynku i ceny"
Cohesion: 0.08
Nodes (33): applyCrowdingPressureToWeak(), applyPriceEffect(), checkForPotentialMA(), detectFinancialAnomaly(), getCrowdingPressure(), getDebutFactor(), getListedCompanyCount(), getNuclearStartChance() (+25 more)

### Community 21 - "Startupy"
Cohesion: 0.09
Nodes (31): acceptStartupOffer(), addFundStartupStake(), canFundInvestInStartups(), checkStartupRescue(), collectStartupClaims(), finalizeStartup(), getFundStartupCapacity(), getFundStartupExposure() (+23 more)

### Community 22 - "Dywidendy i księgowość"
Cohesion: 0.09
Nodes (31): assignCompanyIdiosyncrasy(), assignInitialDividendPolicies(), checkCompanyCounterActions(), declareQuarterDividend(), getDividendPolicyLabel(), getFraudInflation(), getInstituteQuarterlyIncome(), getProfitTransferRate() (+23 more)

### Community 23 - "Plan 0.15 Hossa i bessa"
Cohesion: 0.13
Nodes (3): ECONOMY_PHASES, getValuationMultiplier(), Plan 0.15 Hossa i bessa

### Community 24 - "Klienci funduszu"
Cohesion: 0.10
Nodes (31): addFundClient(), applyFeeAndCampaign(), computeJuPremium(), consolidateSupervisedFund(), ensureClientProfile(), forceLiquidation(), formatPlnShort(), generateOutsideBuyers() (+23 more)

### Community 25 - "Korupcja i nadzór"
Cohesion: 0.10
Nodes (31): bribePolice(), commitCorruptAct(), convictPlayer(), createOversight(), donateToInstitution(), ensureOversight(), fundInstitution(), getDecentFundThreshold() (+23 more)

### Community 26 - "Poprawki 0.14.1–0.14.2"
Cohesion: 0.09
Nodes (28): generateCompanyName(), generateNewStartup(), INVESTMENT_CATALOG, updateResearchInstitutes(), Plan 0.14.1 Poprawki z gry: startupy, portfel prywatny, widok spółek, R0 Audyt przepływów pieniędzy w inkubatorze, R5 Portfel prywatny: mniej pieniędzy, więcej wyborów, Rejestr SECTORS (+20 more)

### Community 27 - "Operatorzy rynków"
Cohesion: 0.17
Nodes (29): activateMarketOperator(), closeMarketOperator(), collectListingFees(), createListedCompany(), createMarketOperators(), ensureMarketOperators(), fundMarketOperatorBailout(), getInternetMarketIds() (+21 more)

### Community 28 - "Projekty specjalne"
Cohesion: 0.12
Nodes (29): buyProjectBond(), chargeConsortium(), completeProject(), createProject(), createSpecialProjects(), ensureSpecialProjects(), expireProject(), findBuilder() (+21 more)

### Community 29 - "Bankructwa i dostępne akcje"
Cohesion: 0.10
Nodes (28): cancelMerger(), cleanupBankruptStocks(), creepSubsidiaryStake(), findBestLenderBank(), getAvailableShares(), getDefenseGrowthBonus(), getFreeFloatShares(), getGuardFund() (+20 more)

### Community 31 - "Budownictwo i bilans"
Cohesion: 0.18
Nodes (27): addBuildingToClient(), adjustBalanceSheet(), adjustCompanyCash(), cancelConstructionProject(), commissionSocialHousing(), completeConstructionProject(), drawConstructionCredit(), finishBuilderContract() (+19 more)

### Community 32 - "Pasek newsów i niezmienniki"
Cohesion: 0.09
Nodes (27): P7/P11 Pasek newsów zamiast zalewu powiadomień, attachNewsTicker(), checkWorldInvariants(), debugCheckInvariants(), enqueueTickerNews(), estimateOrderImpact(), handleFundEmission(), isPlayerMatter() (+19 more)

### Community 33 - "Przetargi budowlane"
Cohesion: 0.14
Nodes (26): awardTender(), bidOnTender(), calculateBidScore(), cancelTender(), canCompanyBid(), countOpenOrdersForClient(), createTender(), estimateBuilderCost() (+18 more)

### Community 34 - "ETF-y"
Cohesion: 0.11
Nodes (25): buyEtf(), closeEtf(), createEtf(), describeEtfRules(), etfSell(), getEtfCharismaBonus(), getEtfIssuers(), getEtfNav() (+17 more)

### Community 35 - "Okresy funduszu"
Cohesion: 0.18
Nodes (25): beginBotFundPeriod(), beginFundPeriod(), botFundInvestInStartups(), checkMilestones(), closeCorporationPeriod(), closeFundPeriod(), computeTrustTarget(), getBenchmarkValue() (+17 more)

### Community 36 - "Inwestycje i reputacja"
Cohesion: 0.10
Nodes (24): blockInvestment(), canPlayerBlockInvestments(), changeReputation(), confirmCeoChange(), executeForcedDividend(), finishAudit(), forceDividend(), getAccountingQuarter() (+16 more)

### Community 37 - "Mafia"
Cohesion: 0.16
Nodes (24): addMafiaInfluence(), answerMafiaDemand(), contactMafia(), createMafia(), createMafiaDemand(), ensureMafia(), executeSabotage(), getBruno() (+16 more)

### Community 38 - "Kredyty spółek"
Cohesion: 0.12
Nodes (23): borrowForCompany(), canFinanceAmount(), changeCompanyBank(), countCompanyInvestmentOrders(), coverNegativeCash(), financeInvestment(), finishInvestment(), forceCompanyInvestment() (+15 more)

### Community 39 - "Badania i technologie"
Cohesion: 0.13
Nodes (22): applyBankInvestmentEffect(), applyTechnology(), changeResearchSpecialization(), checkResearchChoiceTimers(), ensureResearchLedger(), getAvailableCompanyResearch(), getCatalogSectorsForCompany(), getConstructionCatalogForCompany() (+14 more)

### Community 40 - "Wydzielenia i opisy"
Cohesion: 0.12
Nodes (21): assembleDescription(), assignBankToCompany(), assignCeoTraits(), createBankStockObject(), distributeSpinoffShares(), executeSpinoff(), generateCEO(), generateCeoCandidate() (+13 more)

### Community 41 - "Rynek pracy i migracja"
Cohesion: 0.13
Nodes (21): addToPoorClass(), advanceLaborMarket(), advanceMigration(), advanceSocialPolicy(), advanceWages(), announceLawChange(), applyPendingLaw(), describeLawLevel() (+13 more)

### Community 42 - "Roadmap: banki i obligacje"
Cohesion: 0.16
Nodes (7): Wersja 0.5 BigBank, Plany poprawione przez AI, Główny Plan Projektowy (30.09.2025) update 0.3, 0. Fundamenty techniczne i balans, 3. Nowe aktywa inwestycyjne, 4. Instytucje i uczestnicy rynku, Wersja 0.6 Instytucje Finansowe

### Community 43 - "Sektory: rejestr i odczyty"
Cohesion: 0.15
Nodes (19): getInstrumentType(), getMainSector(), getMainSegment(), getMainSubsector(), getRulingParty(), getSectorCycleAdj(), getSectorFilterCounts(), getSectorValuationFactor() (+11 more)

### Community 44 - "Roadmap: wersje 0.8–1.0"
Cohesion: 0.14
Nodes (9): Ewentualny roadmap (alternatywna kolejność wersji), Wersja 0.11 Development, Wersja 0.8 Ryzyko, rozwoje i wybuchy, Wersja 0.9 Polityka, Wersja 1.0 Start i scenariusze, Roadmap (wersje 0.3-1.0), Wersja 0.11 Polityka Globalna, Wersja 0.13 Postęp i Ewolucja (+1 more)

### Community 46 - "Tabela akcji"
Cohesion: 0.14
Nodes (18): closeOpenStockDrawer(), displayStocks(), getCurrentInputValues(), getSectorFilterBaseList(), getStockChangePct(), isStockOwnedByPlayer(), openDescriptionModal(), renderSectorFilterChips() (+10 more)

### Community 47 - "Roadmap: prestiż i miasto"
Cohesion: 0.17
Nodes (5): Wersja 0.4 Prestiż i władza, Wersja 0.7.5 Nowe horyzonty, 1. Interfejs i doświadczenie gracza (UI/UX), Wersja 0.10 Nowe Horyzonty, Wersja 0.5 Władza i Zarządzanie

### Community 48 - "Plan 0.10.2 Makro"
Cohesion: 0.17
Nodes (8): Plan 0.10.2 Makro, Kalendarz dywidend (dzien odciecia), Relacje z botami (-100..100), Wybory co 4 lata gry, Wydarzenia spolek panstwowych, Zakladka Firma, Zapis v10, Dzien odciecia dywidendy pokazany wprost

### Community 50 - "Kariera i ocena"
Cohesion: 0.13
Nodes (17): applyPositionChanges(), canHireAnalysts(), canProposeTakeovers(), canSuperviseFunds(), computeEvaluationScore(), getEvaluationParticipants(), getExternalFirmName(), getExternalFirmValuation() (+9 more)

### Community 51 - "Lombard i windykacja"
Cohesion: 0.22
Nodes (16): collectPawnDebt(), getDebtCollector(), getFundAccount(), getPawnCapacity(), getPawnOutstanding(), getPawnShop(), maybeBotPawn(), notifyDebtAction() (+8 more)

### Community 52 - "Roadmap: ciemna strefa"
Cohesion: 0.18
Nodes (3): Wersja 0.6 Ciemna Strefa, 2. Struktura rynku i giełd, Wersja 0.9 Ciemna Strefa

### Community 53 - "Plan 0.11.5 Balans"
Cohesion: 0.16
Nodes (12): Konsorcja i projekty specjalne, Cynk (z prowokacja policyjna), Plan 0.11.5 Balans, Obligacje projektowe, Oplata za zarzadzanie (0,5-3%), Afery: parabanki (Amber Gold), Wojny PR, Bezczynny fundusz traci zaufanie (+4 more)

### Community 54 - "Emisje JU i przepływy"
Cohesion: 0.16
Nodes (16): P12 Limit emisji JU przy niskim zaufaniu, addOutsideSubscription(), createFundFlowQuarter(), getBigInvestors(), getEmissionBlockReason(), getFundFlowStats(), getLastPeriodExcess(), getMaxEmissionUnits() (+8 more)

### Community 55 - "Audyt planu 0.15"
Cohesion: 0.20
Nodes (13): Audyt planu 0.15 Hossa i bessa, Nadzwyczajne ciecie stop po krachu, H3 banki sektorowe, H6 Akademia, Mentor, pasek newsow, retrospektywa, Indeks strachu i chciwosci 0-100 (5 skladnikow), KNF obniza dzwignie botow w euforii, Linie kryzysow 0.15.1, Margin call botow (+5 more)

### Community 56 - "UI: okna pomocnicze"
Cohesion: 0.14
Nodes (16): displayCash(), displayXP(), gameConfirm(), handleViewFinancesClick(), openCompanyInvestments(), openFinancialDetailsModal(), openManagementModal(), openMaTargetModal() (+8 more)

### Community 57 - "Wynik kwartalny i koszt pracy"
Cohesion: 0.16
Nodes (15): computeQuarterResults(), consumeNicheRevenueFactor(), getFocusMarginAdj(), getLaborCostIndex(), getLaborMarginAdj(), getLaborShare(), getNicheDef(), getNicheGrowthAdj() (+7 more)

### Community 58 - "Pasek górny i debug"
Cohesion: 0.20
Nodes (15): Debug tools (add wallet/fund, end period, invariants, skip intro), Intro scene (grandma SMS + player profile form), Settings modal (theme, save panel, debug tools), Game speed segmented control (x1..x200 debug), Topbar (KPI, speed control, save/export/reset), __sim.finish (TSR by labor policy, save sizes, invariants), loadFrame(), oneRun() (+7 more)

### Community 59 - "Plany 0.11.6 i 0.12"
Cohesion: 0.20
Nodes (12): Plan 0.11.6 Uwagi z gry, U4 Kierunek 0.12: gra ktora uczy, Nowe okno informacji o spolce, Oprocentowanie prywatnych obligacji (stopa skarbowa + premia za ryzyko), Podzial akcji startupu (wplata / max(wplaty, cel)), Analityk Finansowy (3 poziomy), Czerwone flagi, Plan 0.12 Nauka gieldy (+4 more)

### Community 60 - "Opłaty i przejęcia funduszy"
Cohesion: 0.14
Nodes (15): Błąd B: pula poza NAV funduszu, advanceFundTakeover(), chargeManagementFee(), checkVictory(), completeFundTakeover(), getCorporateGoalPay(), getDiversificationStats(), getFundAssets() (+7 more)

### Community 61 - "Budowy: UI"
Cohesion: 0.29
Nodes (15): createConstructionInfoRow(), formatConstructionMoney(), formatConstructionTime(), getConstructionHistoryRows(), getConstructionProjectStatusLabel(), openConstructionSectorModal(), renderConstructionCompaniesList(), renderConstructionFinancing() (+7 more)

### Community 62 - "Giełdy elitarne"
Cohesion: 0.22
Nodes (13): acquireWeakerSubsidiary(), applyEliteBonuses(), assignEliteExchanges(), foundSubsidiary(), getGameClockMs(), getMarketCap(), isEliteExchange(), pickSubsidiaryName() (+5 more)

### Community 63 - "Plan 0.11 Ciemna strefa"
Cohesion: 0.23
Nodes (10): Pakiet pod stolem, Przyzwoity fundusz (dotacje dla policji i KNF), Bruno Elegant Gato, Plan 0.11 Ciemna Strefa, Fundusz Gwardia, Policja i KNF (zakladka Nadzor), Wejsciowki od mafii, Wskaznik korupcji 0-100 (+2 more)

### Community 64 - "Społeczeństwo i partie"
Cohesion: 0.18
Nodes (12): advanceSocietyQuarter(), applyClassMobility(), computePartySupport(), computeRawDemand(), createSocietyState(), ensureSocietyState(), getClassBasedSupport(), getClassMobilityShift() (+4 more)

### Community 65 - "Migracja segmentów"
Cohesion: 0.24
Nodes (12): applyStartSubsectors(), assignRandomSubsector(), canonicalSectorName(), computeStockSegments(), deriveSegmentsFromSectors(), ensureAllStockSegments(), ensureStockSegments(), getBankSubsector() (+4 more)

### Community 66 - "Roadmap: startupy"
Cohesion: 0.24
Nodes (3): Wersja 0.10 Boty, spółki i ich odświeżenie, 8. Start-upy, Wersja 0.3 Dywidenda update

### Community 67 - "Ranking i CV"
Cohesion: 0.17
Nodes (12): displayLeaderboard(), formatPct(), getFundRanking(), openLeaderboardModal(), openSkillsModal(), renderCvPanel(), renderFundPeriodsChart(), renderFundRivalsTable() (+4 more)

### Community 68 - "Zapowiedź wydzielenia"
Cohesion: 0.36
Nodes (11): announceSpinoff(), canAnnounceSpinoff(), getGigValue(), getSpinoffCandidateSegment(), getSpinoffQuarter(), isPlayerSpinoffMajority(), isTopCapQuartile(), noteSpinoffRumor() (+3 more)

### Community 69 - "Przetargi: porządki"
Cohesion: 0.27
Nodes (11): autoAwardExpiredTenders(), closeExpiredTenders(), pruneFinishedTenders(), updateTenderSystem(), Kontrakty budowlane (escrow, etapy, kary), constructionStats i limity projektow (maxProjects), Implementation Summary: Sektor Budowlany, generateAITenders (AI zglasza przetargi) (+3 more)

### Community 70 - "Okna banków i miasta"
Cohesion: 0.18
Nodes (10): App sidebar navigation, T-bill and collateral auctions, Bank center modal (central, commercial deposits, bonds), City (Gdansk) modal: budget, PPP, municipal firms, elections, Construction sector modal (projects, subcontractors, bridge financing), Corporation overlay (firm, board, analysts, cooperation, takeovers), Grey zone modal (corruption services), Mailbox overlay (Gmail-like) (+2 more)

### Community 71 - "Presety przebiegów"
Cohesion: 0.18
Nodes (10): Preset bez-013 (disable 0.13 labor/society effects), Preset bez-p10 (no credit before spending), Preset bez-p6 (catalog without position requirements), Preset bez-p9 / bez-p9-banki / bez-p9-strata (old valuation anchors), Preset fundusz-gig (fund tracks GIG index), Preset fundusz-gig-zamkniety (closed subscriptions), Preset gracz-aktywny (GIG + alpha, career promotion, wallet by source), Preset polityki-losowe (random labor policy per company) (+2 more)

### Community 72 - "UI: banki"
Cohesion: 0.20
Nodes (11): closeInteractionModal(), getBankTypeClass(), openBankModal(), renderBankTicker(), renderBondMarketInBank(), renderCommercialBanksList(), renderFundDeposits(), switchBankTab() (+3 more)

### Community 73 - "UI: startupy i pula"
Cohesion: 0.18
Nodes (10): displayInvestmentPool(), displayStartups(), getCurrentStartupInputValues(), getPoolStartupShare(), openInvestorsModal(), openStartupAutoInvestModal(), updateToggleButton(), renderPoolDetails() (+2 more)

### Community 74 - "Kontrola 0.14"
Cohesion: 0.22
Nodes (9): getListedSubsidiaryStakeValue(), Kontrola koncowa 0.14 Struktura spolek, Koncerny (prog kapitalizacji, warunek struktury), Spolki z >= 2 segmentami 22% (do diagnozy), Wydzielenia spin-off i carve-out, Zapis 3,26 MB po 20 latach, Wydzielenia 0.14 T4: gdzie ginela wartosc, Dyskonto konglomeratu (+1 more)

### Community 75 - "Roadmap: relacje i M&A"
Cohesion: 0.27
Nodes (3): Wersja 0.4.5 Relacje, 5. Głębia symulacji spółek i zdarzeń, Wersja 0.7 Głębia Korporacyjna

### Community 76 - "Magazyn zapisu (IndexedDB)"
Cohesion: 0.29
Nodes (5): collectSaveCandidates(), collectSaveCandidatesAsync(), decodeSaveRecord(), decodeSaveRecordAsync(), saveStore

### Community 77 - "Parabanki i afery"
Cohesion: 0.20
Nodes (10): collapseParabank(), createScandals(), ensureScandals(), processParabanksQuarterly(), processPrWarsQuarterly(), processScandalsQuarterly(), settleParabankDeposits(), showBreakingNews() (+2 more)

### Community 78 - "UI: poczta"
Cohesion: 0.22
Nodes (10): formatMailTime(), mailAction(), openMailbox(), renderMailbox(), renderMailPreview(), renderMailSubscriptions(), selectMail(), setMailFolder() (+2 more)

### Community 79 - "Profile sektorów"
Cohesion: 0.22
Nodes (9): computeSectorProfile(), getSectorProfile(), getSectorSubsectorProfile(), SECTOR_PROFILES, SECTORS, 0.14.3 Zapis bez limitu (IndexedDB, kompresja), T1c Filtry sektorow i filtr Typ, T1a Rejestr SECTORS i mapowanie starych nazw (+1 more)

### Community 82 - "Intro i tryb debug"
Cohesion: 0.31
Nodes (9): applyDebugModeUi(), completeIntroScene(), isDebugMode(), isIntroSkipEnabled(), renderIntroCountries(), showIntroScene(), skipIntroScene(), toggleDebugMode() (+1 more)

### Community 83 - "Audyt 0.10.2"
Cohesion: 0.36
Nodes (8): getGdpDriver(), A2 Martwy kod i stuby, A3 Interfejs, A4 Balans, Audyt 0.10.2, Audyt A1-A4, Kotwica ksiegowa ograniczona do 2x wartosci z zysku, closeModalFrom()

### Community 84 - "Audyt 0.15: kalibracja"
Cohesion: 0.25
Nodes (5): updateMarketIndexes(), Limit celow korporacji CEO 25%, Gasnace gwiazdy (H1b), Jednorozce (H1b), GIG rownych wag przewazany co tik (h5)

### Community 87 - "Weryfikacja 0.13.1"
Cohesion: 0.29
Nodes (6): Zaufanie i JU funduszu = GIG (B5), Raport weryfikacji 0.13.1, B5: zaufanie funduszu = GIG dryfuje do 30-40, Duchy posiadaczy i licznik przyciec (ghostTrimLog), Polityki kadrowe (Oszczedna, Wyzysk), Stanowisko tests/przebiegi.html z wirtualnym zegarem

### Community 88 - "Audyt startupów 0.14.1"
Cohesion: 0.32
Nodes (8): Audyt przeplywow inkubatora 0.14.1 R0, Blad A/A': removeStartup pomija poolInvestors, Blad E: martwy Wklad w pule (playerStakes), Blad F1: removeStartup kasuje wklad bankow, F3: prywatyzacja omija pule, Ksiega puli (investmentPool.ledger), Niezmiennik inkubatora, Niezmiennik puli

### Community 89 - "Tworzenie funduszy"
Cohesion: 0.25
Nodes (8): createBotFund(), createCorporation(), createJuMarket(), createPlayerFund(), createPlayerWallet(), getExternalRivalFunds(), startNewCareer(), syncCeoTitle()

### Community 90 - "Pożyczki pomostowe"
Cohesion: 0.43
Nodes (7): closeBridgeLoan(), fundBridgeLoan(), generateBridgeLoanOffers(), getFundBridgeCapacity(), getFundBridgeLoans(), getFundBridgeLoansValue(), processBridgeLoansWeekly()

### Community 91 - "Okna funduszu i JU"
Cohesion: 0.33
Nodes (7): Clients and JU secondary market modal, Debt collector modal (WRONA), JU emission and continuous subscriptions, Liabilities section (pawnshop, debt collector), Pawnshop modal (LOMBARDEX), My fund panel (NAV, JU emission, clients, private account, career), Trading account switch (fund / private)

### Community 92 - "Kompresja lz-string"
Cohesion: 0.38
Nodes (5): _compress(), emitW(), writeBit(), writeBits(), _decompress()

### Community 93 - "Audyt mechanik"
Cohesion: 0.29
Nodes (6): CV i szkolenia (zamiast drzewka umiejetnosci), Audyt mechanik, Etapy B/C/D/E, Nowe gieldy: Rubin, Szmaragd, Diament, Skrzynka mailowa (Gmail), Okno wrogiego przejecia i negocjacji

### Community 95 - "Kontrola 0.14.2"
Cohesion: 0.33
Nodes (5): GIG drift 18-22%/rok zamiast 7-9%, Kontrola 0.14.2 i atrybucja GIG/marzy, Atrybucja GIG i marzy presetami bez-p6/p9/p10, Kotwice wyceny P9, Kredyt przed wydatkiem P10

### Community 96 - "Raport zapisu 0.14.3"
Cohesion: 0.38
Nodes (6): Raport 0.14.3 Zapis bez limitu, Eksport/import JSON, Format lz16 (lz-string) dla localStorage, save_store.js: IndexedDB z zapasem localStorage, Panel zapisu w Ustawieniach, Zapis atomowy current/previous i kopia przy zamknieciu

### Community 97 - "Ikony budynków"
Cohesion: 0.33
Nodes (6): Ikony budynkow/inwestycji, Ikona billboardu (tablica z wykrzyknikiem, pixel-art), Ikona okna/skrzynki (siatka 2x2, pixel-art), Ikona oddzialu/budynku z oknami (pixel-art), Ikona zebatki (sprzet/ustawienia, pixel-art), Ikona fabryki (pixel-art)

### Community 98 - "Prowizje i koncesje"
Cohesion: 0.47
Nodes (6): buyInternetConcession(), chargeMarketCommission(), etfBuy(), getInternetConcessionCost(), getOperatorStock(), hasInternetConcession()

### Community 99 - "Okno rynku akcji"
Cohesion: 0.33
Nodes (5): Dividend analyst modal, ETF funds section, Market level tabs (JUNK..DIAMOND, INTERNET), Stock market panel (KPI, sector chips, level tabs), stock-table

### Community 100 - "Cele korporacji"
Cohesion: 0.40
Nodes (6): assignCorporateGoals(), ensureCorporateGoals(), getCorporateGoalsView(), noteCorporateGoal(), noteStrikeForGoals(), settleCorporateGoals()

### Community 101 - "Usługi mafii"
Cohesion: 0.47
Nodes (6): mafiaEntryTicket(), mafiaLoan(), mafiaTip(), mafiaTrace(), requireMafiaContact(), toggleMafiaProtection()

### Community 102 - "Ikony sektorów"
Cohesion: 0.40
Nodes (5): Company sector icons, Globe icon (hand-drawn Earth, beige tile), Medical lab flask icon (pharma/biotech sector), Pickaxe and ore icon (mining sector), iT letters icon (IT/tech sector)

### Community 103 - "Szkielet strony i testy"
Cohesion: 0.40
Nodes (3): index.html (game shell), window.__GAME_TEST_MODE__ flag, tests.html (unit test runner page)

### Community 104 - "Sprite postaci"
Cohesion: 0.67
Nodes (4): Sprite postaci gracza, Sprite biurka z komputerem (stanowisko gracza), Twarz postaci (stan czuwania), Twarz postaci spiaca (Zzz)

### Community 105 - "Zakup obligacji"
Cohesion: 0.67
Nodes (4): buyOtherBond(), buyStateBond(), createBondRecord(), payForBonds()

### Community 106 - "Panel startupów"
Cohesion: 0.50
Nodes (4): Auto-invest modals (pool and startup), Startup investment pool panel, NewHorizons startup exchange panel, Preset gracz-pula (quarterly pool contribution + direct startup)

### Community 107 - "Przełącznik wykresu"
Cohesion: 1.00
Nodes (3): Price chart type toggle (candles vs line), Candlestick chart button (chart type toggle), Line chart button (chart type toggle)

### Community 108 - "Okna zarządzania spółką"
Cohesion: 0.67
Nodes (3): M&A target and complication modals, Company management modal (dividend, CEO, policy, bank, debt, R&D, M&A), R&D panel modal (5 unlock tiers)

## Ambiguous Edges - Review These
- `updateStartupAutoInvestTimers()` → `R0 Audyt przepływów pieniędzy w inkubatorze`  [AMBIGUOUS]
  plany/plan_0.14.1_startupy.md · relation: references
- `computePerformanceBonus()` → `R5 Portfel prywatny: mniej pieniędzy, więcej wyborów`  [AMBIGUOUS]
  plany/plan_0.14.1_startupy.md · relation: references
- `chargeManagementFee()` → `R5 Portfel prywatny: mniej pieniędzy, więcej wyborów`  [AMBIGUOUS]
  plany/plan_0.14.1_startupy.md · relation: references
- `settleCorporateGoals()` → `R5 Portfel prywatny: mniej pieniędzy, więcej wyborów`  [AMBIGUOUS]
  plany/plan_0.14.1_startupy.md · relation: references
- `toggleSubsidiaryVisibility()` → `P3 Spółki zależne: widok pod matką, nazwy, segment`  [AMBIGUOUS]
  plany/plan_0.14.2_poprawki_z_gry_2.md · relation: references
- `Raport 0.14.3 Zapis bez limitu` → `Stanowisko tests/przebiegi.html z wirtualnym zegarem`  [AMBIGUOUS]
  plany/raporty/weryfikacja_0.13.1.md · relation: conceptually_related_to
- `Operatorzy rynkow (GPW, XTD, PLU5, Euronext)` → `Oplata za zarzadzanie (0,5-3%)`  [AMBIGUOUS]
  plany/plan_0.11.5_balans.md · relation: conceptually_related_to

## Knowledge Gaps
- **86 isolated node(s):** `NewHorizons startup exchange panel`, `ETF funds section`, `Trading account switch (fund / private)`, `Price chart modal (candlestick/line, alerts)`, `Price alert modal` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 607 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Plan 0.15 Hossa i bessa` connect `Plan 0.15 Hossa i bessa` to `Plan 0.15.1 Kryzysy`, `Plan 0.15: nastrój i bańki`, `Dywidendy i księgowość`, `Pomysły odłożone`, `Plan 0.16 Giełda międzynarodowa`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **What connects `NewHorizons startup exchange panel`, `ETF funds section`, `Trading account switch (fund / private)` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Spółki: dane i stałe` be split into smaller, more focused modules?**
  _Cohesion score 0.012025779018005448 - nodes in this community are weakly interconnected._
- **Why does `updateFundamentalRatios()` connect `Dywidendy i księgowość` to `Spółki: dane i stałe`, `Wydzielenia i opisy`, `Kontrola 0.14`, `Segmenty i podsektory`, `Spółki zależne`, `Audyt planu 0.15`, `Plan 0.15 Hossa i bessa`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `UI: wykresy i widoki` be split into smaller, more focused modules?**
  _Cohesion score 0.0296220633299285 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `updateStartupAutoInvestTimers()` and `R0 Audyt przepływów pieniędzy w inkubatorze`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `computePerformanceBonus()` and `R5 Portfel prywatny: mniej pieniędzy, więcej wyborów`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._