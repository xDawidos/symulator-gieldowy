// =================================================================================
// 0.16.10 „Nowa scenka startowa”: kroki jak krótki film. Logika (bez DOM, opóźnienia wstrzykiwane przez `schedule`) jest na górze pliku,
// wyświetlanie niżej. Kroki: country (globus, country_picker.js) → profile (imię, firma, kryzys) → sms → contract → boss (TeamedUP!) → done.
// Do `done` reszta gry jest zablokowana (`isIntroActive`): zegar stoi (core.js), menu i zakładki są `inert`, okno TeamedUP! nie zamyka się.
// Imię, firma, nazwa funduszu i kryzys trafiają do `playerProfile` dopiero w `completeIntroScene` (te same pola co przed 0.16.10).
// =================================================================================

const INTRO_DEFAULTS = Object.freeze({ name: 'Dawid', corporation: 'Wawelska Grupa Inwestycyjna', fundName: 'Fundusz Pierwszy Krok', crisis: '' });
const INTRO_LIMITS = Object.freeze({ name: 30, corporation: 40, fundName: 40 });
const INTRO_FIELD_LABELS = Object.freeze({ name: 'Imię', corporation: 'Nazwa firmy', fundName: 'Nazwa funduszu' });
const INTRO_EMPTY_MESSAGES = Object.freeze({ name: 'Podaj imię.', corporation: 'Podaj nazwę firmy.', fundName: 'Podaj nazwę funduszu.' });

let introFlow = null; // stan scenki (poza zapisem gry): { step, data, schedule, pending, render, ... }

/** Do `done` interfejs gry jest zablokowany (zegar, menu, zakładki, zamykanie TeamedUP!). */
function isIntroActive() { return Boolean(introFlow) && introFlow.step !== 'done'; }

/** Pole tekstowe: ściśnięte spacje, niepuste, w limicie znaków. Zwraca { ok, value, error }. */
function validateIntroField(kind, raw) {
    const value = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (!value) return { ok: false, value, error: INTRO_EMPTY_MESSAGES[kind] };
    if (value.length > INTRO_LIMITS[kind]) return { ok: false, value, error: `${INTRO_FIELD_LABELS[kind]}: najwyżej ${INTRO_LIMITS[kind]} znaków.` };
    return { ok: true, value };
}

const introTimer = (ms, fn) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); };

/** Rozpoczyna scenkę. `schedule(ms, fn)` zwraca funkcję anulującą (testy wstrzykują własną), `render: false` — bez interfejsu. */
function startIntroFlow({ schedule = introTimer, render = true } = {}) {
    introFlow = { step: 'country', data: { ...INTRO_DEFAULTS }, schedule, render, pending: null };
    introRender();
    return introFlow;
}

function introGo(step) { introFlow.step = step; introRender(); }

/** Krok 1 → 2: kraj startowy z globusa (albo z listy). */
function introPickCountry(id) {
    if (introFlow?.step !== 'country') return false;
    setStartCountry(id);
    introGo('profile');
    return true;
}

/** Krok 2: walidacja pól; przy błędzie zostaje na kroku. Zwraca { ok, errors }. */
function introSubmitProfile(raw = {}) {
    if (introFlow?.step !== 'profile') return { ok: false, errors: { step: 'To nie jest krok danych gracza.' } };
    const data = { ...introFlow.data, crisis: String(raw.crisis ?? '') }, errors = {};
    for (const kind of ['name', 'corporation']) {
        const r = validateIntroField(kind, raw[kind]);
        if (r.ok) data[kind] = r.value; else errors[kind] = r.error;
    }
    if (Object.keys(errors).length) return { ok: false, errors };
    introFlow.data = data;
    introFinish(); // etap 1: kolejne kroki (SMS, umowa, TeamedUP!) dochodzą w następnych etapach
    return { ok: true, errors };
}

/** Pominięcie: zostają wartości domyślne (albo już wpisane) i kraj taki, jaki wybrano (domyślnie PL). */
function skipIntroScene() {
    if (!introFlow || introFlow.step === 'done') return;
    introFlow.pending?.cancel?.(); introFlow.pending = null;
    if (typeof closeCountryGlobe === 'function') closeCountryGlobe();
    introFinish();
}

function introFinish() {
    const f = introFlow;
    if (!f || f.step === 'done') return;
    completeIntroScene(f.data);
    f.step = 'done';
    introRender();
}

/** Zapis do stanu gry: te same pola co przed 0.16.10 (`playerProfile.name/corporation/fundName`, CV, scenariusz kryzysu, powitalna poczta). */
function completeIntroScene(data = introFlow?.data || INTRO_DEFAULTS) {
    playerProfile.name = data.name || playerProfile.name;
    playerProfile.corporation = data.corporation || playerProfile.corporation;
    playerProfile.fundName = data.fundName || playerProfile.fundName;
    playerProfile.cv = [{ type: 'start', text: `Zatrudnienie w ${playerProfile.corporation} jako Młodszy zarządca funduszu „${playerProfile.fundName}”.` }];

    if (typeof setCrisisScenario === 'function') setCrisisScenario(data.crisis || ''); // 0.15.3 W4: scenariusz startowy (po zapisie CV)
    if (typeof syncCeoTitle === 'function') syncCeoTitle(); // nazwa korporacji z formularza
    logEvent(`💼 Witaj, ${playerProfile.name}! Zarządzasz funduszem „${playerProfile.fundName}” w ${playerProfile.corporation}. Wznów grę, aby zacząć.`, 'review');

    // Jedno powitanie w poczcie — z nazwami z formularza (startNewCareer wysłał wcześniej domyślne).
    mailbox = createMailbox();
    addMail({
        sender: 'corporation',
        subject: `Witamy w ${playerProfile.corporation}, ${playerProfile.name}!`,
        body: `Od dziś zarządzasz funduszem „${playerProfile.fundName}”. Wyniki oceniamy co 4 okresy. Wiadomości z rynku przysyłają czasopisma — prenumeraty ustawisz w zakładce Subskrypcje.${playerProfile.country !== 'PL' ? ` Kraj startowy: ${getCountryDef(playerProfile.country).name} — jego giełda (${getCountryDef(playerProfile.country).operator.name}) jest dla Ciebie rynkiem domowym, bez biletu.` : ''}`,
        importance: 2
    });
    refreshFundViews();
}

/** Wejście z `main.js` dla nowej gry: opcja trwała (tryb debug) pomija całą scenkę. */
function showIntroScene() {
    if (isDebugMode() && isIntroSkipEnabled()) { startIntroFlow({ render: false }); skipIntroScene(); return; }
    startIntroFlow();
}

// =================================================================================
// Wyświetlanie
// =================================================================================

function introRender() {
    const f = introFlow, overlay = document.getElementById('intro-overlay');
    if (!f || !f.render || !overlay) return;
    const active = isIntroActive(), $ = id => document.getElementById(id);
    document.querySelector('.app-shell')?.toggleAttribute('inert', active); // blokada menu, zakładek i giełdy
    document.querySelectorAll('[data-intro-skip]').forEach(b => { b.hidden = !(active && isDebugMode()); });
    if (f.step === 'country' && !f.globeShown) { f.globeShown = true; if (typeof showCountryGlobe === 'function') showCountryGlobe(introPickCountry); }
    overlay.hidden = f.step !== 'profile';
    $('intro-form').hidden = f.step !== 'profile';
    if (f.step === 'profile') $('intro-name')?.focus();
}

/** Zatwierdzenie formularza danych gracza (przycisk „Dalej”, Enter w polu). */
function introProfileSubmit(event) {
    event.preventDefault();
    const val = id => document.getElementById(id)?.value ?? '';
    const r = introSubmitProfile({ name: val('intro-name'), corporation: val('intro-corporation'), crisis: val('intro-crisis') });
    const box = document.getElementById('intro-form-error');
    if (box) box.textContent = Object.values(r.errors).join(' ');
    for (const kind of ['name', 'corporation']) {
        const el = document.getElementById(`intro-${kind}`);
        if (el) el.setAttribute('aria-invalid', r.errors[kind] ? 'true' : 'false');
    }
    if (!r.ok) document.getElementById(`intro-${r.errors.name ? 'name' : 'corporation'}`)?.focus();
}
