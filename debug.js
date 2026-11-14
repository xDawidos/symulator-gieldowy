// =================================================================================
// 0.18.6 O1: NARZĘDZIA DEBUG — przełącznik w Ustawieniach, prędkości testowe, pieniądze, relacje, fazy rynku, bańki, krach, bezpiecznik.
// Moduł ładowany zawsze (testy i przebiegi wołają debugSetMarketPhase, debugTriggerSectorBubble…). Flaga isDebugMode() i niezmienniki
// checkWorldInvariants() zostają w ui.js, bo czyta je kod gry. Docelowo ładowanie tylko na localhost albo z ?debug=1 (plan: Odłożone).
// =================================================================================

/** Blok narzędzi w oknie Ustawień — budowany tutaj, a nie w index.html (0.18.6 O1). */
const DEBUG_PHASES = [['accumulation', 'Akumulacja'], ['bull', 'Hossa'], ['euphoria', 'Euforia'], ['distribution', 'Dystrybucja'], ['bear', 'Bessa'], ['capitulation', 'Kapitulacja']];
const DEBUG_BUBBLES = [['ai', 'Sztuczna inteligencja'], ['fintech', 'Fintech'], ['biotech', 'Biotechnologia'], ['semiconductors', 'Półprzewodniki'], ['drones', 'Drony'], ['renewables', 'OZE'], ['gaming', 'Gaming'], ['realestate', 'Nieruchomości']];
function buildDebugTools() {
    const tools = document.createElement('div');
    tools.id = 'debug-tools'; tools.className = 'debug-tools';
    const cur = typeof getBaseCurrency === 'function' ? getBaseCurrency() : 'PLN';
    tools.innerHTML = `
        <button type="button" onclick="debugAddWallet(1000)">+1 000 ${cur} na konto prywatne</button>
        <button type="button" onclick="debugAddFund(10000)">+10 000 ${cur} do funduszu</button>
        <button type="button" onclick="debugEndPeriod()">Zakończ okres funduszu</button>
        <button type="button" onclick="debugShiftRelations(10)">+10 relacji z każdym</button>
        <button type="button" onclick="debugShiftRelations(-10)">−10 relacji z każdym</button>
        <button type="button" onclick="debugBoardReview()">Ocena zarządu teraz</button>
        <button type="button" onclick="debugCheckInvariants()">Sprawdź spójność świata</button>
        <button type="button" id="debug-skip-intro-btn" onclick="toggleIntroSkip()">Pomijaj scenkę z babcią: nie</button>
        <div class="debug-row">
            <label for="debug-market-phase-select" class="debug-label">Faza rynku:</label>
            <select id="debug-market-phase-select" onchange="debugSetMarketPhase(this.value)">${DEBUG_PHASES.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>
            <button type="button" onclick="debugSetMarketPhase(document.getElementById('debug-market-phase-select').value)">Ustaw (potwierdzona)</button>
            <button type="button" onclick="debugSetMarketPhase(document.getElementById('debug-market-phase-select').value, false)">Ustaw (potwierdzanie)</button>
        </div>
        <details class="debug-genealogy" ontoggle="if (this.open) renderGenealogyDebug()">
            <summary class="debug-label">Mapa rodowa spółek (przejęcia, córki, usamodzielnienia)</summary>
            <button type="button" onclick="renderGenealogyDebug()">Odśwież</button>
            <pre id="debug-genealogy" class="debug-pre"></pre>
        </details>
        <div class="debug-row">
            <label for="debug-bubble-cand-select" class="debug-label">Bańka:</label>
            <select id="debug-bubble-cand-select">${DEBUG_BUBBLES.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>
            <button type="button" onclick="debugTriggerSectorBubble(document.getElementById('debug-bubble-cand-select').value)">Wywołaj bańkę</button>
            <button type="button" onclick="debugPopSectorBubble()">Pęknij bańkę</button>
        </div>`;
    return tools;
}

/** Włączony tryb: dokleja narzędzia do okna Ustawień i pokazuje prędkości testowe; wyłączony: usuwa blok z DOM. */
function applyDebugModeUi() {
    const enabled = isDebugMode();
    document.querySelectorAll('.debug-only').forEach(element => { element.hidden = !enabled; });
    const host = document.querySelector('.debug-settings');
    let tools = document.getElementById('debug-tools');
    if (enabled && !tools && host) { tools = buildDebugTools(); host.appendChild(tools); }
    if (!enabled && tools) tools.remove();
    const button = document.getElementById('debug-toggle-btn');
    if (button) button.textContent = `Tryb debug: ${enabled ? 'włączony' : 'wyłączony'}`;
    const skipButton = document.getElementById('debug-skip-intro-btn');
    if (skipButton) skipButton.textContent = `Pomijaj scenkę z babcią: ${isIntroSkipEnabled() ? 'tak' : 'nie'}`;
    const phaseSelect = document.getElementById('debug-market-phase-select');
    if (phaseSelect && typeof getMarketRegime === 'function') {
        const regime = getMarketRegime('home');
        if (regime?.phase) phaseSelect.value = regime.phase;
    }
    if (!enabled && currentSpeedMultiplier > 5) setGameSpeed(5);
}

/** Przełącznik w ustawieniach debug: kolejne nowe gry startują bez scenki z babcią. */
function toggleIntroSkip() {
    try { localStorage.setItem(INTRO_SKIP_KEY, isIntroSkipEnabled() ? '0' : '1'); } catch (e) { /* brak localStorage */ }
    applyDebugModeUi();
}

function toggleDebugMode() {
    try { localStorage.setItem(DEBUG_MODE_KEY, isDebugMode() ? '0' : '1'); } catch (e) { /* brak localStorage */ }
    applyDebugModeUi();
}

function debugAddWallet(amount) {
    playerWallet.cash += amount;
    logEvent(`🛠️ [DEBUG] +${formatZl(amount, 0)} do portfela prywatnego.`, 'review');
    refreshFundViews();
}

/** Dodaje gotówkę funduszowi bez nowych JU (NAV rośnie). */
function debugAddFund(amount) {
    playerCash += amount;
    logEvent(`🛠️ [DEBUG] +${formatZl(amount, 0)} do gotówki funduszu.`, 'review');
    refreshFundViews();
}

/** Zmienia relację z każdym: współpracownicy, inwestorzy, prezesi, wiceprezesi, dawne kontakty i VIP-y. */
function debugShiftRelations(delta) {
    const board = stocks.flatMap(stock => [stock.ceo, ...(stock.deputies || [])]).filter(person => person?.id).map(person => getCeoRelationKey(person.id));
    const contacts = (playerProfile?.contacts || []).map(contact => getCeoRelationKey(contact.id));
    const vips = [...(playerFund?.vip?.offers || []), ...(playerProfile?.tied?.vips || [])].map(vip => `vip:${vip.id}`);
    const keys = new Set([...getRelationPeople().map(person => person.id), ...board, ...contacts, ...vips]);
    keys.forEach(key => changeRelation(key, delta, 'debug'));
    logEvent(`🛠️ [DEBUG] Relacje ${delta > 0 ? '+' : ''}${delta} z każdym (${keys.size} osób).`, 'review');
    refreshFundViews();
}

function debugEndPeriod() {
    if (playerFund) closeFundPeriod();
    refreshFundViews();
}

function debugBoardReview() {
    if (typeof runBoardEvaluation === 'function') runBoardEvaluation();
    refreshFundViews();
}

/** 0.15: Ręczna zmiana fazy rynku w trybie debug. */
function debugSetMarketPhase(phaseKey, forceConfirm = true) {
    if (typeof getMarketRegime !== 'function' || typeof MARKET_PHASES === 'undefined') return;
    const regime = getMarketRegime('home');
    if (!regime || !MARKET_PHASES[phaseKey]) return;
    const def = MARKET_PHASES[phaseKey];
    regime.phase = phaseKey;
    regime.quartersInPhase = 1;
    regime.phaseLength = Math.floor(def.length[0] + (def.length[1] - def.length[0]) / 2);
    regime.premiumTarget = (def.premium[0] + def.premium[1]) / 2;
    if (forceConfirm) {
        regime.shownPhase = phaseKey;
        regime.shownSince = typeof macro !== 'undefined' && macro?.quarter ? Number(macro.quarter) : 1;
    } else {
        regime.shownPhase = null;
    }
    const gigVal = typeof getGigIndexValue === 'function' ? getGigIndexValue() : 1000;
    regime.startGig = gigVal;
    if (phaseKey === 'bull' || phaseKey === 'euphoria') {
        regime.gigTrough = gigVal;
        regime.gigPeak = gigVal;
    } else if (phaseKey === 'bear' || phaseKey === 'capitulation') {
        regime.gigPeak = gigVal;
        regime.gigTrough = gigVal;
    }
    if (typeof logEvent === 'function') {
        logEvent(`🛠️ [DEBUG] Ustawiono fazę rynku: ${def.name} (${forceConfirm ? 'potwierdzona' : 'w trakcie potwierdzania'}).`, 'market');
    }
    if (typeof updateMoodKpi === 'function') updateMoodKpi();
    if (typeof renderMarketModal === 'function') {
        const modal = document.getElementById('market-modal');
        if (modal && modal.style.display !== 'none') renderMarketModal();
    }
}

function debugCheckInvariants() {
    const problems = checkWorldInvariants();
    const warnings = problems.warnings || [];
    const note = warnings.length ? `, przycięcia: ${warnings.length}` : '';
    showToast(problems.length ? `Naruszenia: ${problems.length}${note} (szczegóły w konsoli)` : `Świat gry spójny ✔${note}`, problems.length ? 'error' : warnings.length ? 'warning' : 'success', 6000);
    if (problems.length) console.warn('[niezmienniki]', problems);
    if (warnings.length) console.warn('[niezmienniki: przycięcia]', warnings);
    return problems;
}

/** Debug: ręczne wywołanie bańki sektorowej. */
function debugTriggerSectorBubble(candId = 'ai', initialPremium = 0.35) {
    const cand = SECTOR_BUBBLE_CANDIDATES.find(c => c.id === candId) || SECTOR_BUBBLE_CANDIDATES[0];
    activeSectorBubble = {
        candidateId: cand.id,
        name: cand.name,
        sector: cand.sector,
        subsector: cand.subsector,
        phase: 'inflating',
        premium: initialPremium,
        quarters: 1,
        popDuration: 0,
        popTarget: 0,
        popStartPremium: 0,
        recoveryQuarters: 0
    };
    sectorBubbleCooldown = 0;
    updateAllSectorPremiums();
    if (typeof logEvent === 'function') {
        logEvent(`🛠️ [DEBUG] Wywołano bańkę sektorową: ${cand.name} (premia +${(initialPremium * 100).toFixed(0)}%).`, 'review');
    }
}

/** Debug: natychmiastowe pęknięcie bańki sektorowej. */
function debugPopSectorBubble() {
    if (!activeSectorBubble) return;
    activeSectorBubble.phase = 'popping';
    activeSectorBubble.popDuration = 2;
    activeSectorBubble.popTarget = -0.20;
    activeSectorBubble.popStartPremium = activeSectorBubble.premium;
    activeSectorBubble.quartersInPop = 0;
    updateAllSectorPremiums();
    if (typeof logEvent === 'function') {
        logEvent(`🛠️ [DEBUG] Wymuszono pęknięcie bańki sektorowej: ${activeSectorBubble.name}.`, 'review');
    }
}

/** Debug: ręczne wywołanie krachu rynkowego. */
function debugTriggerMarketCrash() {
    triggerMarketCrash();
}

/** Debug: ręczne wywołanie bezpiecznika giełdowego. */
function debugTriggerMarketHalt(level = 1, durationSec = 15) {
    triggerMarketHalt(level, durationSec, level === 1 ? -0.075 : (level === 2 ? -0.135 : -0.21));
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', applyDebugModeUi);
