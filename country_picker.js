// =================================================================================
// 0.16.10 S0c: WYBÓR KRAJU STARTOWEGO NA GLOBUSIE
// Globe.gl (lib/globe.gl.min.js, zawiera Three.js), tekstury z img/globus, granice z data/kraje.geojson ładują się dopiero po kliknięciu „Wybierz na globusie”
// (≈3,2 MB); globus jest niszczony i usuwany z DOM po wyborze. To osobny ekran: `showCountryGlobe(onPick)` woła `onPick(kraj)` po potwierdzeniu.
// Lista krajów obok globusa jest pełnoprawnym wyborem: bez WebGL, bez sieci lub w testach (`__GAME_TEST_MODE__`) ekran działa tylko jako lista.
// Dwukierunkowa synchronizacja: lista, pinezki i obrysy krajów → `selectGlobeCountry` → `syncCountryPicker`.
// Kolor nigdy jedynym nośnikiem: kraje gry mają pinezkę z flagą i nazwą, wybrany ma obrys i podpis w karcie.
// =================================================================================

/** Kraje gry na globusie: kod ADM0_A3 (pole geojson), stolica i współrzędne pinezki. */
const GLOBE_COUNTRIES = {
    PL: { a3: 'POL', capital: 'Warszawa', lat: 52.2, lng: 19.4 }, DE: { a3: 'DEU', capital: 'Berlin', lat: 51.0, lng: 10.3 },
    US: { a3: 'USA', capital: 'Waszyngton', lat: 39.5, lng: -98.5 }, CZ: { a3: 'CZE', capital: 'Praga', lat: 49.8, lng: 15.5 },
    SE: { a3: 'SWE', capital: 'Sztokholm', lat: 62.0, lng: 15.0 }, CH: { a3: 'CHE', capital: 'Berno', lat: 46.8, lng: 8.2 },
    FR: { a3: 'FRA', capital: 'Paryż', lat: 46.5, lng: 2.5 }, JP: { a3: 'JPN', capital: 'Tokio', lat: 36.5, lng: 138.5 },
    CN: { a3: 'CHN', capital: 'Pekin', lat: 35.0, lng: 103.0 }, IN: { a3: 'IND', capital: 'Nowe Delhi', lat: 22.5, lng: 79.0 },
    TW: { a3: 'TWN', capital: 'Tajpej', lat: 23.7, lng: 121.0 }
};
// Wszystko jako skrypty (bez fetch i zapytań cross-origin), więc działa też przy otwarciu gry z dysku (file://). Tekstury: data-URI, tło nieba: kolor.
const GLOBE_ASSETS = [['lib/globe.gl.min.js', () => typeof Globe === 'function'], ['data/kraje.js', () => window.GLOBE_GEO], ['img/globus/tekstury.js', () => window.GLOBE_TEXTURES]];
const GLOBE_HOME_VIEW = { lat: 30, lng: 15, altitude: 2.4 };

let globeInstance = null;
let globeOverlay = null;
let globeAutoRotate = true;
let globeCurrent = 'PL';   // kraj pokazany na karcie (może być „wkrótce”)
let globeOnPick = null;

function canUseGlobe() {
    if (typeof window === 'undefined' || window.__GAME_TEST_MODE__) return false;
    try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

/** Wczytuje skrypt, jeśli jego dane nie są jeszcze w oknie (`loaded()`); błąd mówi, którego pliku brakuje. */
function loadScriptOnce(src, loaded) {
    return new Promise((resolve, reject) => {
        if (loaded()) return resolve();
        const s = document.createElement('script');
        s.src = src; s.onload = () => (loaded() ? resolve() : reject(new Error(`Skrypt ${src} nie ustawił danych`))); s.onerror = () => reject(new Error(`Nie wczytano ${src}`));
        document.head.appendChild(s);
    });
}

function prefersReducedMotion() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function themeColor(name, fallback) { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; } catch (e) { return fallback; } }
function toRgba(color, alpha) {
    const m = /^#([0-9a-f]{6})$/i.exec(color);
    if (!m) return color;
    const n = parseInt(m[1], 16);
    return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${alpha})`;
}

/** Karta kraju: stolica, waluta, giełda, godziny sesji, status (grywalny / wkrótce). */
function renderGlobeCard(id) {
    const info = GLOBE_COUNTRIES[id], def = COUNTRY_DEFS[id], playable = START_PLAYABLE.includes(id);
    const name = FLAG_NAMES[id] || id, cur = id === 'PL' ? 'PLN' : def?.currency;
    const exchange = id === 'PL' ? 'Giełda Papierów Wartościowych (GPW)' : def?.operator?.name || '—';
    const s = MARKET_SESSIONS[id], hh = x => String(Math.floor(x)).padStart(2, '0') + ':' + String(Math.round((x % 1) * 60)).padStart(2, '0');
    const hours = s ? `${hh(s.open)}–${hh(s.close)} (${s.city}, czas lokalny)` : '—';
    const rows = [['Stolica', info.capital], ['Waluta', `${cur}${CURRENCIES[cur] ? ` (${CURRENCIES[cur].name})` : ''}`], ['Giełda', exchange], ['Sesja', hours]];
    if (def?.oversight) rows.push(['Nadzór', def.oversight.name]);
    if (def?.labour) rows.push(['Pracownicy', `prawa ${def.labour.rights}, ${def.labour.note}`]);
    const note = !playable ? 'Rynek do dołączenia w trakcie gry (bilet na lotnisku) — nie jest dostępny jako kraj startowy.'
        : id === 'PL' ? 'Kraj startowy: pełny rynek macierzysty gry.' : 'Kraj startowy: jego giełda działa od pierwszego dnia i jest dla Ciebie rynkiem domowym (bez biletu). Rynek macierzysty gry pozostaje polski.';
    return `<h3>${flagIcon(id, 18)} ${escapeHtml(name)}</h3><dl class="cg-dl">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl><p class="cg-note">${note}</p>`;
}

/** Zaznaczenie kraju (z listy intro albo z globusa): karta, lot kamery, odświeżenie obrysu. Bez otwartego globusa nic nie robi. */
function syncCountryPicker(id) {
    if (!globeOverlay || !GLOBE_COUNTRIES[id]) return;
    globeCurrent = id;
    const card = globeOverlay.querySelector('#cg-card'), ok = globeOverlay.querySelector('#cg-confirm');
    if (card) card.innerHTML = renderGlobeCard(id);
    if (ok) ok.disabled = !START_PLAYABLE.includes(id);
    globeOverlay.querySelectorAll('.cg-item').forEach(b => { const on = b.dataset.country === id; b.setAttribute('aria-pressed', on); b.classList.toggle('selected', on); });
    if (globeInstance) {
        const { lat, lng } = GLOBE_COUNTRIES[id];
        globeInstance.pointOfView({ lat, lng, altitude: 1.5 }, prefersReducedMotion() ? 0 : 1000);
        globeInstance.polygonsData(globeInstance.polygonsData()); // przerysowanie obrysu wybranego kraju
    }
}

/** Kliknięcie kraju (lista, pinezka, obrys): karta i lot kamery; kraj „wkrótce” można obejrzeć, ale nie potwierdzić. */
function selectGlobeCountry(id) { syncCountryPicker(id); }

function setGlobeAutoRotate(on) {
    globeAutoRotate = on;
    if (globeInstance) globeInstance.controls().autoRotate = on;
    const b = globeOverlay?.querySelector('#cg-rotate');
    if (b) { b.setAttribute('aria-pressed', on); b.textContent = on ? 'Auto-obrót: włączony' : 'Auto-obrót: wyłączony'; }
}

function closeCountryGlobe() {
    if (globeInstance) { try { globeInstance._destructor?.(); } catch (e) { /* biblioteka już zwolniona */ } globeInstance = null; }
    window.removeEventListener('resize', resizeGlobe);
    if (globeOverlay) { globeOverlay.remove(); globeOverlay = null; }
}
function resizeGlobe() {
    const stage = globeOverlay?.querySelector('#cg-stage');
    if (globeInstance && stage) globeInstance.width(stage.clientWidth).height(stage.clientHeight);
}

/** Ekran wyboru kraju startowego; zawsze się otwiera (lista), globus 3D tylko gdy jest WebGL. `onPick(id)` po potwierdzeniu. */
async function showCountryGlobe(onPick) {
    if (globeOverlay) return false;
    globeOnPick = onPick;
    const webgl = canUseGlobe();
    const ids = Object.keys(GLOBE_COUNTRIES);
    globeOverlay = document.createElement('div');
    globeOverlay.className = 'intro-overlay cg-overlay';
    globeOverlay.innerHTML = `<div class="cg-dialog" role="dialog" aria-modal="true" aria-labelledby="cg-title">
        <div class="cg-head"><h2 id="cg-title">Wybierz kraj startowy</h2></div>
        <div class="cg-body"><div id="cg-stage" class="cg-stage"><p class="cg-loading" id="cg-status" role="status">Wczytywanie globusa (ok. 3 MB)…</p></div>
        <div class="cg-side"><div id="cg-card" class="cg-card" aria-live="polite"></div>
        <div class="cg-list" role="group" aria-label="Kraje">${ids.map(id => `<button type="button" class="cg-item" data-country="${id}" aria-pressed="false">${flagIcon(id, 12)} ${escapeHtml(FLAG_NAMES[id])}${START_PLAYABLE.includes(id) ? '' : ' (wkrótce)'}</button>`).join('')}</div>
        <div class="cg-actions"><button type="button" class="btn-ghost" id="cg-rotate" aria-pressed="true"></button><button type="button" class="btn-ghost" id="cg-reset">Reset widoku</button><button type="button" class="btn-primary" id="cg-confirm">Wybieram ten kraj</button></div></div></div></div>`;
    document.body.appendChild(globeOverlay);
    globeOverlay.querySelector('#cg-confirm').onclick = () => { const id = globeCurrent, cb = globeOnPick; if (!START_PLAYABLE.includes(id)) return; closeCountryGlobe(); if (cb) cb(id); };
    globeOverlay.querySelector('#cg-rotate').onclick = () => setGlobeAutoRotate(!globeAutoRotate);
    globeOverlay.querySelector('#cg-reset').onclick = () => { globeInstance?.pointOfView(GLOBE_HOME_VIEW, prefersReducedMotion() ? 0 : 800); };
    globeOverlay.querySelectorAll('.cg-item').forEach(b => { b.onclick = () => selectGlobeCountry(b.dataset.country); });
    globeAutoRotate = !prefersReducedMotion();
    setGlobeAutoRotate(globeAutoRotate);
    syncCountryPicker('PL');
    globeOverlay.querySelector('.cg-item.selected')?.focus();
    if (!webgl) { const st = globeOverlay.querySelector('#cg-status'); if (st) st.textContent = 'Globus 3D niedostępny (brak WebGL) — wybierz kraj z listy obok.'; return true; }
    try {
        for (const [src, loaded] of GLOBE_ASSETS) await loadScriptOnce(src, loaded);
        const geo = window.GLOBE_GEO, tex = window.GLOBE_TEXTURES;
        if (!globeOverlay) return true; // zamknięto w trakcie ładowania
        const stage = globeOverlay.querySelector('#cg-stage'), accent = themeColor('--accent-primary', '#4da3ff'), byA3 = Object.fromEntries(ids.map(id => [GLOBE_COUNTRIES[id].a3, id]));
        stage.innerHTML = '';
        const selectedId = () => globeCurrent, idOf = f => byA3[f.properties.ADM0_A3];
        globeInstance = Globe()(stage).width(stage.clientWidth).height(stage.clientHeight)
            .globeImageUrl(tex.night).bumpImageUrl(tex.bump).backgroundColor('#02040a')
            .polygonsData(geo.features)
            .polygonCapColor(f => { const id = idOf(f); return !id ? 'rgba(255,255,255,0.03)' : id === selectedId() ? toRgba(accent, 0.75) : toRgba(accent, START_PLAYABLE.includes(id) ? 0.4 : 0.18); })
            .polygonSideColor(() => 'rgba(0,0,0,0.15)')
            .polygonStrokeColor(f => idOf(f) ? (idOf(f) === selectedId() ? '#ffffff' : toRgba(accent, 0.9)) : 'rgba(255,255,255,0.12)')
            .polygonAltitude(f => { const id = idOf(f); return id === selectedId() ? 0.04 : id ? 0.015 : 0.003; })
            .onPolygonClick(f => { const id = idOf(f); if (id) selectGlobeCountry(id); })
            .htmlElementsData(ids.map(id => ({ id, ...GLOBE_COUNTRIES[id] })))
            .htmlElement(d => { const el = document.createElement('div'); el.className = 'cg-pin'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = `${flagIcon(d.id, 12)}<span>${escapeHtml(FLAG_NAMES[d.id])}</span>`; el.style.pointerEvents = 'auto'; el.onclick = () => selectGlobeCountry(d.id); return el; })
            .pointOfView(GLOBE_HOME_VIEW);
        const c = globeInstance.controls(); c.autoRotateSpeed = 0.6; c.autoRotate = globeAutoRotate;
        window.addEventListener('resize', resizeGlobe);
        syncCountryPicker(globeCurrent);
    } catch (e) {
        console.warn('Globus wyboru kraju:', e);
        const st = globeOverlay?.querySelector('#cg-status');
        if (st) st.textContent = `Globus nie wczytał się (${e && e.message || e}) — wybierz kraj z listy obok.`;
    }
    return true;
}
