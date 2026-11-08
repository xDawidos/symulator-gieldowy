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

/** Opóźnienia w ms (jak pisane wiadomości); przy `prefers-reduced-motion` zanikanie umowy trwa 0. */
const INTRO_DELAYS = Object.freeze({ typing: 1100, gap: 700, contractRead: 2200, contractSign: 1800, fade: 600, bossTyping: 1400, reply: 900 });

/** Krok 3: SMS-y między graczem a babcią (kto pisze, treść). Bez wpisywania przez gracza. */
const introSmsScript = d => [
    { from: 'me', text: `W końcu! Dostałem się do firmy ${d.corporation} na staż. Jeszcze tylko uzupełnię papiery i zaczynam.` },
    { from: 'grandma', text: 'Gratulacje! W nagrodę wyślę ci małe co nieco ;)' }
];

/** Kroki 5–6: rozmowa z szefem w TeamedUP! (skrypt). */
const introBossHello = d => `Cześć, ${d.name}! Od dzisiaj jestem twoim szefem! Zanim zaczniesz, podaj nazwę swojego funduszu. Pogadam ze stałymi klientami, żebyś miał dobry start, a ty lepiej pomyśl, jak nazwiesz swój fundusz.`;
const introFundMessage = name => `Miło mi cię poznać, mój fundusz będzie się nazywał: ${name}.`;
const INTRO_BOSS_BYE = 'Powodzenia, nie zawiedź mnie.';

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
function startIntroFlow({ schedule = introTimer, render = true, delays = {} } = {}) {
    introFlow = { step: 'country', data: { ...INTRO_DEFAULTS }, schedule, render, pending: null, delays: { ...INTRO_DELAYS, ...(typeof prefersReducedMotion === 'function' && prefersReducedMotion() ? { fade: 0 } : {}), ...delays }, sms: [], typing: null, chat: [], bossShown: false, awaitingFund: false };
    introRender();
    return introFlow;
}

function introGo(step) { introFlow.step = step; introRender(); }

/** Jedno oczekiwane zdarzenie naraz; `introHurry` (Enter/Spacja, kliknięcie) wykonuje je od razu. */
function introAfter(ms, cb) {
    const f = introFlow;
    const entry = { cb: () => { if (introFlow === f && f.pending === entry) { f.pending = null; cb(); } } };
    entry.cancel = f.schedule(ms, entry.cb);
    f.pending = entry;
}
function introHurry() {
    const p = introFlow?.pending;
    if (!p) return false;
    p.cancel?.(); p.cb();
    return true;
}

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
    introGo('sms');
    introRunSms();
    return { ok: true, errors };
}

/** Krok 3: każda wiadomość najpierw „pisze się” (wskaźnik), potem się pojawia; po babci — przelew kieszonkowego. */
function introRunSms() {
    const f = introFlow, script = introSmsScript(f.data), d = f.delays;
    let i = 0;
    const next = () => {
        if (i >= script.length) { f.typing = null; introAfter(d.gap, introOpenContract); return; }
        f.typing = script[i].from; introRender();
        introAfter(d.typing, () => {
            const m = script[i++];
            f.typing = null; f.sms.push(m);
            if (m.from === 'grandma') f.sms.push({ from: 'transfer', text: `Przelew przychodzący: +${formatZl(GRANDMA_POCKET_MONEY)} od: Babcia` });
            introRender();
            introAfter(d.gap, next);
        });
    };
    next();
}

/** Krok 4: umowa o pracę (data z gry); najpierw leży do podpisu, potem „Podpisano”, na końcu zanika. */
function getIntroContract(d = introFlow.data) {
    const date = typeof formatGameDate === 'function' ? formatGameDate() : '';
    return { title: 'Umowa o pracę', date, text: `${d.name} dołącza od dzisiaj do firmy: ${d.corporation}.`, signer: d.name };
}

function introOpenContract() {
    const f = introFlow, d = f.delays;
    f.signed = false; f.leaving = false;
    introGo('contract');
    introAfter(d.contractRead, () => {
        f.signed = true; introRender();
        introAfter(d.contractSign, () => { f.leaving = true; introRender(); introAfter(d.fade, introOpenBoss); });
    });
}

/** Krok 5: otwarcie TeamedUP! — rozmowa z szefem; reszta gry nadal zablokowana. Szef pisze powitanie i prosi o nazwę funduszu. */
function introOpenBoss() {
    const f = introFlow;
    f.bossShown = true; f.typing = 'boss';
    introGo('boss');
    introAfter(f.delays.bossTyping, () => {
        f.typing = null; f.chat.push({ from: 'boss', text: introBossHello(f.data) }); f.awaitingFund = true;
        introRender();
    });
}

/** Krok 6: nazwa funduszu (walidacja); gracz „pisze” gotową wiadomość, szef odpowiada, interfejs się odblokowuje. Zwraca { ok, error }. */
function introSubmitFund(raw) {
    const f = introFlow;
    if (f?.step !== 'boss' || !f.awaitingFund) return { ok: false, error: 'Szef jeszcze nie pytał o nazwę funduszu.' };
    const r = validateIntroField('fundName', raw);
    if (!r.ok) return r;
    f.data.fundName = r.value; f.awaitingFund = false;
    f.chat.push({ from: 'me', text: introFundMessage(r.value) }); f.typing = 'boss';
    introRender();
    introAfter(f.delays.reply, () => { f.typing = null; f.chat.push({ from: 'boss', text: INTRO_BOSS_BYE }); introFinish(); });
    return { ok: true };
}

/** Krok 7: „Zaczynam pracę” zamyka TeamedUP! (po odblokowaniu). */
function introLeaveChat() {
    if (!introFlow || isIntroActive()) return;
    introFlow.bossShown = false;
    introRender();
}

/** Pominięcie: zostają wartości domyślne (albo już wpisane) i kraj taki, jaki wybrano (domyślnie PL). */
function skipIntroScene() {
    if (!introFlow || introFlow.step === 'done') return;
    introFlow.pending?.cancel?.(); introFlow.pending = null; introFlow.bossShown = false;
    if (typeof closeCountryGlobe === 'function') closeCountryGlobe();
    introFinish();
}

function introFinish() {
    const f = introFlow;
    if (!f || f.step === 'done') return;
    completeIntroScene(f.data);
    f.step = 'done'; f.typing = null; f.awaitingFund = false;
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
    if (f.step === 'country' && !f.globeShown) { f.globeShown = true; if (typeof showCountryGlobe === 'function') showCountryGlobe(introPickCountry); }
    overlay.hidden = !['profile', 'sms', 'contract'].includes(f.step);
    $('intro-form').hidden = f.step !== 'profile';
    $('intro-phone').hidden = !['sms', 'contract'].includes(f.step);
    $('intro-phone').classList.toggle('is-leaving', f.step === 'contract'); // telefon zanika, umowa wchodzi (przy reduced-motion: zamiana natychmiast)
    $('intro-contract').hidden = f.step !== 'contract';
    if (f.step === 'contract') introFillContract(f);
    if (f.step === 'profile') $('intro-name')?.focus();
    if (f.step === 'sms' || f.step === 'contract') introSyncLog($('intro-sms-thread'), f.sms, f.typing, introSmsBubble);
    const tu = $('teamedup-overlay');
    if (tu && f.bossShown) { tu.hidden = false; f.tuOpened = true; renderTeamedUp(); }
    else if (tu && f.tuOpened) { tu.hidden = true; f.tuOpened = false; }
    const close = tu?.querySelector('.close-btn');
    if (close) close.hidden = active; // TeamedUP! zamyka się dopiero po rozmowie z szefem
    document.querySelectorAll('[data-intro-skip]').forEach(b => { b.hidden = !(active && isDebugMode()); });
}

/** Panel TeamedUP! w trakcie scenki (wołane z `renderTeamedUp`): rozmowa z szefem, reszta aplikacji nieaktywna. */
function introRenderChat() {
    const f = introFlow, $ = id => document.getElementById(id), body = $('teamedup-content');
    if (!body.querySelector('.te-intro')) {
        $('teamedup-nav').innerHTML = [['cel', 'Zadania i oceny'], ['poczta', 'Wiadomości'], ['pracownik', 'Zatrudnianie']].map(([icon, label]) => `<button type="button" class="mail-folder" disabled>${uiIcon(icon, 16)} ${label}</button>`).join('')
            + '<p class="intro-hint">Reszta aplikacji odblokuje się po rozmowie z szefem.</p>';
        body.innerHTML = `<section class="te-intro" aria-label="Rozmowa z szefem">
            <header class="te-intro-head"><span class="net-avatar" aria-hidden="true">SZ</span><div><strong>Szef</strong><span class="te-role"></span></div><button type="button" class="intro-skip btn-ghost" data-intro-skip hidden onclick="skipIntroScene()">Pomiń</button></header>
            <div id="te-intro-log" class="te-intro-log" role="log" aria-live="polite" aria-relevant="additions" onclick="introHurry()"></div>
            <form id="te-intro-form" class="te-intro-form" hidden onsubmit="introFundSubmit(event)" novalidate>
                <label for="intro-fund">Nazwa funduszu</label>
                <div class="te-intro-row"><input id="intro-fund" maxlength="40" autocomplete="off" aria-describedby="intro-fund-error"><button type="submit" class="btn-primary">Wyślij</button></div>
                <p id="intro-fund-error" class="intro-error" role="alert"></p>
            </form>
            <div id="te-intro-done" hidden><button type="button" class="btn-primary" onclick="introLeaveChat()">Zaczynam pracę</button></div>
            <p class="intro-hint">Enter lub Spacja przyspiesza pisanie.</p></section>`;
    }
    body.querySelector('.te-role').textContent = `Przełożony · ${f.data.corporation}`;
    const hint = $('teamedup-nav').querySelector('.intro-hint');
    if (hint) hint.textContent = isIntroActive() ? 'Reszta aplikacji odblokuje się po rozmowie z szefem.' : 'Gra odblokowana. Kliknij „Zaczynam pracę”.';
    introSyncLog($('te-intro-log'), f.chat, f.typing, introChatBubble);
    const form = $('te-intro-form'), ask = f.step === 'boss' && f.awaitingFund, input = $('intro-fund');
    if (ask && form.hidden) { input.value = f.data.fundName; form.hidden = false; input.focus(); input.select(); }
    if (!ask) form.hidden = true;
    const done = $('te-intro-done'), wasHidden = done.hidden;
    done.hidden = isIntroActive();
    if (wasHidden && !done.hidden) done.querySelector('button').focus();
    document.querySelectorAll('[data-intro-skip]').forEach(b => { b.hidden = !(isIntroActive() && isDebugMode()); });
}

function introChatBubble(m) {
    const el = document.createElement('div');
    el.className = `te-bubble${m.from === 'me' ? ' me' : ''}`;
    const who = document.createElement('span'); who.className = 'intro-who'; who.textContent = m.from === 'me' ? 'Ty' : 'Szef';
    el.append(who, document.createTextNode(m.text));
    return el;
}

/** Zatwierdzenie nazwy funduszu (przycisk „Wyślij”, Enter w polu). */
function introFundSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('intro-fund'), r = introSubmitFund(input?.value);
    document.getElementById('intro-fund-error').textContent = r.ok ? '' : r.error;
    input?.setAttribute('aria-invalid', r.ok ? 'false' : 'true');
    if (!r.ok) input?.focus();
}

/** Dopisuje tylko nowe wiadomości (bez przerysowania całości — czytnik ekranu czyta tylko dodane, `aria-live`); wskaźnik pisania jest zawsze ostatni. */
function introSyncLog(box, items, typing, makeBubble) {
    if (!box) return;
    box.querySelectorAll('.intro-typing').forEach(n => n.remove());
    for (let i = box.querySelectorAll('[data-i]').length; i < items.length; i++) { const el = makeBubble(items[i]); el.dataset.i = i; box.appendChild(el); }
    if (typing) { const el = makeBubble({ from: typing, text: '…' }); el.classList.add('intro-typing'); el.setAttribute('aria-hidden', 'true'); box.appendChild(el); }
    box.scrollTop = box.scrollHeight;
}

function introFillContract(f) {
    const c = getIntroContract(f.data), $ = id => document.getElementById(id);
    $('intro-contract-date').textContent = c.date;
    $('intro-contract-text').textContent = c.text;
    $('intro-contract-sig').textContent = f.signed ? c.signer : '';
    $('intro-contract-state').textContent = f.signed ? 'Podpisano' : 'Oczekuje na podpis';
    $('intro-contract-box').classList.toggle('on', Boolean(f.signed));
    $('intro-contract').classList.toggle('is-leaving', Boolean(f.leaving));
}

const INTRO_SENDERS = { me: 'Ty', grandma: 'Babcia' };
function introSmsBubble(m) {
    const el = document.createElement('div');
    if (m.from === 'transfer') { el.className = 'intro-transfer'; el.textContent = m.text; return el; }
    el.className = `intro-sms${m.from === 'me' ? ' me' : ''}`;
    const who = document.createElement('span'); who.className = 'intro-who'; who.textContent = INTRO_SENDERS[m.from] || m.from;
    el.append(who, document.createTextNode(m.text));
    return el;
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

// Enter/Spacja poza polami i przyciskami przyspiesza pisanie (kliknięcie w wiadomości też).
if (typeof document !== 'undefined') {
    document.addEventListener('keydown', event => {
        if (!isIntroActive() || (event.key !== 'Enter' && event.key !== ' ')) return;
        if (event.target instanceof Element && event.target.closest('input, textarea, select, button, summary, a, [contenteditable]')) return;
        if (introHurry()) event.preventDefault();
    });
}
