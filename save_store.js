// =================================================================================
// save_store.js — 0.14.3 „Zapis bez limitu”: przechowywanie zapisu gry.
// IndexedDB (baza „gra-inwestycyjna”, magazyn „saves”, klucze „current” i „previous”) jako główny zapis,
// localStorage jako zapas (gdy IndexedDB nie działa) i kopia awaryjna przy zamknięciu karty.
// Rekordy: 'gz' (IndexedDB: gzip z natywnego CompressionStream, data = ArrayBuffer; 3 MB w ok. 50 ms)
// i 'lz16' (localStorage: LZString.compressToUTF16 — tekst i zapis synchroniczny przy zamknięciu karty; 3 MB ok. 1 s).
// Pomiar 0.14.3 Z2: lz16 ok. 7–8× (znaki), gzip ok. 4,9× (bajty UTF-8) i ok. 20× szybszy.
// Tryb testów (window.__GAME_TEST_MODE__) używa osobnej bazy i nigdy nie dotyka zapisu gracza.
// =================================================================================

const SAVE_DB_NAME = 'gra-inwestycyjna';
const SAVE_DB_TEST_NAME = 'gra-inwestycyjna-test';
const SAVE_DB_STORE = 'saves';
const SAVE_RECORD_FORMAT = 'lz16';
const SAVE_RECORD_GZIP = 'gz';
const SAVE_LOCAL_LIMIT = 2_400_000;        // znaków w localStorage (kopia awaryjna / zapas), po kompresji
const SAVE_IDB_RAW_LIMIT = 50_000_000;     // znaków JSON przed kompresją — powyżej poziomy kompaktowe także w IndexedDB

const saveStore = {
    backend: null,          // 'indexeddb' | 'localStorage' | 'none'
    detectError: null,
    persisted: null,        // navigator.storage.persist(): true / false / null (brak API)
    db: null,
    dbName: null,
    queue: Promise.resolve(),
    pending: null,          // rekord czekający na zapis (najnowszy wygrywa)
    writing: false,

    isTestMode() {
        return typeof window !== 'undefined' && Boolean(window.__GAME_TEST_MODE__);
    },

    /** Otwiera bazę i sprawdza zapis/odczyt próbny. Wynik w this.backend. */
    async detect(dbName = null, factory = typeof indexedDB !== 'undefined' ? indexedDB : null) {
        this.dbName = this.isTestMode() ? SAVE_DB_TEST_NAME : (dbName || SAVE_DB_NAME); // testy nigdy nie otwierają bazy gracza
        this.detectError = null;
        try {
            if (!factory) throw new Error('brak indexedDB');
            this.db = await new Promise((resolve, reject) => {
                const request = factory.open(this.dbName, 1);
                request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(SAVE_DB_STORE)) request.result.createObjectStore(SAVE_DB_STORE); };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('indexedDB.open'));
                request.onblocked = () => reject(new Error('indexedDB zablokowane'));
            });
            await this.tx('readwrite', store => store.put({ probe: Date.now() }, 'probe'));
            const probe = await this.tx('readonly', store => store.get('probe'));
            if (!probe || !probe.probe) throw new Error('próbny odczyt nieudany');
            this.backend = 'indexeddb';
        } catch (error) {
            this.db = null;
            this.detectError = String(error && error.message || error);
            this.backend = typeof localStorage !== 'undefined' ? 'localStorage' : 'none';
        }
        return this.backend;
    },

    /** Jedna transakcja na magazynie; zwraca wynik ostatniego żądania. */
    tx(mode, fn) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(SAVE_DB_STORE, mode);
            const store = transaction.objectStore(SAVE_DB_STORE);
            let last = null;
            const out = fn(store);
            const requests = Array.isArray(out) ? out : [out];
            for (const request of requests) if (request) request.onsuccess = () => { last = request.result; };
            transaction.oncomplete = () => resolve(last);
            transaction.onerror = () => reject(transaction.error || new Error('transakcja'));
            transaction.onabort = () => reject(transaction.error || new Error('transakcja przerwana'));
        });
    },

    /** Zapis atomowy: stary „current” → „previous”, nowy → „current” (jedna transakcja). */
    async writeIdb(record) {
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(SAVE_DB_STORE, 'readwrite');
            const store = transaction.objectStore(SAVE_DB_STORE);
            const get = store.get('current');
            get.onsuccess = () => {
                if (get.result) store.put(get.result, 'previous');
                store.put(record, 'current');
            };
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error('zapis'));
            transaction.onabort = () => reject(transaction.error || new Error('zapis przerwany'));
        });
    },

    /** Zapis rekordu (bez nakładania: kolejny czeka, a najnowszy zastępuje oczekujący). */
    write(record, localKey = null) {
        this.pending = record;
        if (this.writing) return this.queue;
        this.writing = true;
        this.queue = (async () => {
            let result = { ok: false };
            while (this.pending) {
                const next = this.pending;
                this.pending = null;
                try {
                    if (this.backend === 'indexeddb') await this.writeIdb(next);
                    else if (this.backend === 'localStorage' && localKey) writeLocalRecord(localKey, next);
                    else throw new Error('brak miejsca zapisu');
                    result = { ok: true, backend: this.backend, record: next };
                } catch (error) {
                    result = { ok: false, error: String(error && error.message || error) };
                }
            }
            this.writing = false;
            return result;
        })();
        return this.queue;
    },

    /** Rekordy z IndexedDB: { current, previous } (null, gdy brak albo backend inny). */
    async read() {
        if (this.backend !== 'indexeddb') return { current: null, previous: null };
        const current = await this.tx('readonly', store => store.get('current'));
        const previous = await this.tx('readonly', store => store.get('previous'));
        return { current: current || null, previous: previous || null };
    },

    async clear() {
        if (this.backend === 'indexeddb' && this.db) await this.tx('readwrite', store => [store.delete('current'), store.delete('previous')]);
    },

    async requestPersistence() {
        try {
            if (typeof navigator !== 'undefined' && navigator.storage?.persist) this.persisted = await navigator.storage.persist();
        } catch (error) { this.persisted = false; }
        return this.persisted;
    },

    async estimate() {
        try {
            if (typeof navigator !== 'undefined' && navigator.storage?.estimate) return await navigator.storage.estimate();
        } catch (error) { /* brak danych */ }
        return null;
    }
};

// --- Kodowanie rekordu (Z2) ---

/** Snapshot → rekord lz16. */
function encodeSaveRecord(snapshot, level = 0, json = null) {
    const text = json ?? JSON.stringify(snapshot);
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const data = LZString.compressToUTF16(text);
    const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    return { format: SAVE_RECORD_FORMAT, version: snapshot.version, savedAt: snapshot.savedAt, size: text.length, compressed: data.length, level, compressMs: Math.round(ms), data };
}

function canGzipSave() {
    return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' && typeof Response === 'function' && typeof Blob === 'function';
}

/** Snapshot → rekord gz (asynchronicznie, dla IndexedDB). */
async function encodeSaveRecordGz(snapshot, level = 0, json = null) {
    const text = json ?? JSON.stringify(snapshot);
    const t0 = performance.now();
    const data = await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    return { format: SAVE_RECORD_GZIP, version: snapshot.version, savedAt: snapshot.savedAt, size: text.length, compressed: data.byteLength, level, compressMs: Math.round(performance.now() - t0), data };
}

/** Każdy format (gz, lz16, czysty JSON, obiekt) → snapshot albo null. */
async function decodeSaveRecordAsync(input) {
    try {
        if (input && typeof input === 'object' && input.format === SAVE_RECORD_GZIP) {
            const text = await new Response(new Blob([input.data]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
            return JSON.parse(text);
        }
    } catch (error) {
        return null;
    }
    return decodeSaveRecord(input);
}

/** Rekord lz16, tekst rekordu, stary czysty JSON albo obiekt snapshotu → snapshot (null przy błędzie; gz tylko asynchronicznie). */
function decodeSaveRecord(input) {
    try {
        let value = input;
        if (typeof value === 'string') {
            const trimmed = value.trimStart();
            if (!trimmed.startsWith('{')) return null;
            value = JSON.parse(trimmed);
        }
        if (!value || typeof value !== 'object') return null;
        if (value.format === SAVE_RECORD_FORMAT) {
            const text = LZString.decompressFromUTF16(value.data);
            return text ? JSON.parse(text) : null;
        }
        return value.version ? value : null; // stary format: snapshot jako czysty JSON
    } catch (error) {
        return null;
    }
}

function writeLocalRecord(key, record) {
    const text = JSON.stringify(record);
    if (text.length > SAVE_LOCAL_LIMIT) throw new Error(`zapis za duży dla localStorage (${text.length} znaków)`);
    localStorage.setItem(key, text);
    return text.length;
}

/** Kandydaci do wczytania (najnowszy pierwszy): rekordy IndexedDB i kopia z localStorage (synchronicznie: lz16 i JSON). */
function collectSaveCandidates(idb, localRaw, decoded = null) {
    const list = [];
    const add = (source, raw) => {
        if (!raw) return;
        const snapshot = decoded && decoded.has(raw) ? decoded.get(raw) : decodeSaveRecord(raw);
        const savedAt = Number(snapshot?.savedAt) || Number(raw?.savedAt) || 0;
        list.push({ source, snapshot, savedAt, legacy: typeof raw === 'string' && !raw.includes(`"format":"${SAVE_RECORD_FORMAT}"`) });
    };
    add('indexeddb:current', idb?.current);
    add('indexeddb:previous', idb?.previous);
    add('localStorage', localRaw);
    return list.sort((a, b) => b.savedAt - a.savedAt);
}

/** Jak collectSaveCandidates, ale rozpakowuje też rekordy gz (wstępny odczyt przed startem gry). */
async function collectSaveCandidatesAsync(idb, localRaw) {
    const decoded = new Map();
    for (const raw of [idb?.current, idb?.previous]) if (raw && typeof raw === 'object') decoded.set(raw, await decodeSaveRecordAsync(raw));
    return collectSaveCandidates(idb, localRaw, decoded);
}
