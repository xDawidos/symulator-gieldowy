// =================================================================================
// 0.17.3 R1: Tied, sieć zawodowa w oknie Internet (plan_0.17.3_rozmowy.md, design/10_tied_0.17.3.md).
// Osoba to klucz relacji: `ceo:<id>` albo id bota. Stan gracza w playerProfile.tied (zapis), widok w tiedView (poza zapisem).
// Reakcje botów i odznaka Zweryfikowany liczone hashem, bez zapisu. Charakter osoby (R4) nigdy nie trafia do interfejsu.
// =================================================================================

const TIED_RULES = {
    mainPosts: 40, watchedPosts: 40,   // osobne limity: cały rynek oraz kontakty i obserwowani
    friendAt: 20, trustedAt: 60,       // progi relacji: Znajomy, Zaufany znajomy
    reactionCap: 2,                    // najwyżej +2 kwartalnie na osobę, gracz tego limitu nie widzi
    rejectLoss: 2, retryQuarters: 2,   // odrzucona prośba: relacja −2 i przerwa
    inviteChance: 0.1, maxInvites: 3,  // prośby do gracza
    verifiedEvery: 5                   // odznaka u ok. 20% kont
};
const TIED_POSITIVE_NEWS = /wynik|kontrakt|raport|współprac|kooperac|dywidend|rekord|przełom|technolog|nowa (oferta|placówk)/i;
const TIED_COMMENT_POOL = ['Super!', 'Gratuluję!', 'Trzymamy za was kciuki :)', 'Brawo!', 'Świetna wiadomość.', 'Tak trzymać!', 'Mocne.', 'Powodzenia w kolejnym kwartale!'];
const TIED_POST_KINDS = { result: 'Wyniki', coop: 'Współpraca' };
const TIED_AUDIENCE = { friends: 'Dla znajomych', trusted: 'Dla zaufanych' };
const TIED_LOCKED_TEXT = { friends: 'Treść dla znajomych', trusted: 'Treść dla zaufanych' };

let tiedView = { feed: 'main', side: 'me', pane: 'feed', person: null, company: null, message: null, filter: 'all', pool: null };
const initials = name => String(name || '?').split(/\s+/).map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();
const ceoKey = id => getCeoRelationKey(id);
const companyFollowKey = symbol => `co:${symbol}`;

function ensureTiedState() {
    const tied = playerProfile.tied || (playerProfile.tied = {});
    tied.friends ||= []; tied.requests ||= {}; tied.invites ||= []; tied.reacted ||= { q: -1, gains: {} };
    if (!Array.isArray(playerProfile.follows)) playerProfile.follows = [];
    return tied;
}

// --- Posty ---
function getTiedPosts() { return (mailbox && mailbox.tied) || []; }

function isWatchedTiedPost(post) {
    if (!playerProfile) return false;
    const key = post.ceoId ? ceoKey(post.ceoId) : null, follows = playerProfile.follows || [];
    return Boolean((post.ceoId && playerProfile.contacts?.some(contact => contact.id === post.ceoId)) || (key && (follows.includes(key) || isTiedFriend(key))) || follows.includes(companyFollowKey(post.symbol)));
}
function trimTiedPosts() {
    let main = 0, watched = 0;
    mailbox.tied = mailbox.tied.filter(post => isWatchedTiedPost(post) ? ++watched <= TIED_RULES.watchedPosts : ++main <= TIED_RULES.mainPosts);
}
function addTiedPost(fields) {
    if (!mailbox) return null;
    if (!Array.isArray(mailbox.tied)) mailbox.tied = [];
    const post = { id: mailbox.nextId++, at: typeof getMailClockMs === 'function' ? getMailClockMs() : 0, kind: 'result', ...fields };
    mailbox.tied.unshift(post);
    trimTiedPosts();
    return post;
}

/** Zdarzenie spółki → post (tylko dobre wieści; reszta to nie chwalenie się). Współpracę ogłasza konto spółki, wyniki prezes. */
function noteTiedEvent(message, category) {
    if (category !== 'company' || !mailbox || typeof stocks === 'undefined' || !TIED_POSITIVE_NEWS.test(message)) return null;
    const stock = stocks.find(s => s.ceo && typeof s.ceo === 'object' && message.includes(s.name));
    if (!stock) return null;
    const kind = /współprac|kooperac/i.test(message) ? 'coop' : 'result';
    const lead = kind === 'coop' ? 'Cieszymy się, że możemy to ogłosić:' : 'Z dumą dzielę się wiadomością:';
    const text = `${lead} ${String(message).replace(/\p{Extended_Pictographic}|️/gu, '').replace(/\s+/g, ' ').trim()}`;
    if (getTiedPosts().some(p => p.symbol === stock.symbol && p.text === text)) return null;
    return addTiedPost(kind === 'coop' ? { symbol: stock.symbol, text, kind } : { symbol: stock.symbol, author: stock.ceo.name, ceoId: stock.ceo.id, text, kind });
}

/** Wpis kadrowy z replaceCeo: objęcie stanowiska albo odejście ze spółki. */
function noteTiedStaffChange(stock, oldCeo, newCeo) {
    if (!mailbox || !stock) return;
    if (oldCeo?.name) addTiedPost({ kind: 'hr', hr: 'out', symbol: stock.symbol, author: oldCeo.name, ceoId: oldCeo.id });
    if (newCeo?.name) addTiedPost({ kind: 'hr', hr: 'in', symbol: stock.symbol, author: newCeo.name, ceoId: newCeo.id });
}

// --- Znajomi i poziomy ---
function isTiedFriend(key) { return Boolean(playerProfile?.tied?.friends?.includes(key)); }
function getTiedLevel(key) {
    if (!isTiedFriend(key)) return 'Kontakt';
    return getRelation(key) >= TIED_RULES.trustedAt ? 'Zaufany znajomy' : 'Znajomy';
}
function canSeeTiedPost(post) {
    if (!post.audience || post.audience === 'public') return true;
    const key = post.ceoId ? ceoKey(post.ceoId) : null;
    if (!key || !isTiedFriend(key)) return false;
    return post.audience === 'friends' || getRelation(key) >= TIED_RULES.trustedAt;
}
/** Decyzja o prośbie. R4: tu wejdzie charakter osoby. */
function willAcceptTiedFriend(key) { return getRelation(key) >= TIED_RULES.friendAt; }
/** Czy osoba zaprasza gracza. R4: tu wejdzie charakter osoby. */
function getTiedInviteChance(key) { return getRelation(key) >= TIED_RULES.friendAt ? TIED_RULES.inviteChance : 0; }

function getTiedFriendState(key) {
    const tied = ensureTiedState();
    if (tied.friends.includes(key)) return { status: 'friend' };
    if (tied.invites.includes(key)) return { status: 'invite' };
    return tied.requests[key] || { status: 'none' };
}
function requestTiedFriend(key) {
    if (getTiedFriendState(key).status !== 'none' || !findRelationPerson(key)) return false;
    ensureTiedState().requests[key] = { status: 'sent', q: macro.quarter };
    return true;
}
function addTiedFriend(key) {
    const tied = ensureTiedState();
    if (!tied.friends.includes(key)) tied.friends.push(key);
    delete tied.requests[key];
    tied.invites = tied.invites.filter(id => id !== key);
}
function rejectTiedRelation(key, reason) {
    changeRelation(key, -TIED_RULES.rejectLoss, reason);
    ensureTiedState().requests[key] = { status: 'rejected', until: macro.quarter + TIED_RULES.retryQuarters };
}
function acceptTiedInvite(key) { if (ensureTiedState().invites.includes(key)) addTiedFriend(key); }
function declineTiedInvite(key) {
    const tied = ensureTiedState();
    if (!tied.invites.includes(key)) return;
    tied.invites = tied.invites.filter(id => id !== key);
    rejectTiedRelation(key, 'odrzucone zaproszenie w Tied');
}
/** changeRelation: relacja poniżej 0 usuwa ze znajomych. */
function dropTiedFriendIfHostile(key) {
    const tied = playerProfile?.tied;
    if (tied?.friends?.includes(key) && getRelation(key) < 0) tied.friends = tied.friends.filter(id => id !== key);
}

/** Co kwartał (processRelationsQuarterly): odpowiedzi na prośby gracza, koniec przerw, nowe zaproszenia. */
function processTiedQuarterly() {
    if (!playerProfile) return;
    const tied = ensureTiedState(), quarter = macro.quarter;
    for (const [key, request] of Object.entries(tied.requests)) {
        if (request.status === 'rejected') { if (quarter >= request.until) delete tied.requests[key]; continue; }
        if (quarter <= request.q) continue;
        if (willAcceptTiedFriend(key)) addTiedFriend(key);
        else rejectTiedRelation(key, 'odrzucona prośba w Tied');
    }
    for (const person of getTiedContacts()) {
        if (tied.invites.length >= TIED_RULES.maxInvites) break;
        if (getTiedFriendState(person.key).status === 'none' && Math.random() < getTiedInviteChance(person.key)) tied.invites.push(person.key);
    }
}

// --- Reakcje ---
function grantTiedReaction(post) {
    if (!post.ceoId) return;
    const tied = ensureTiedState(), key = ceoKey(post.ceoId);
    if (tied.reacted.q !== macro.quarter) tied.reacted = { q: macro.quarter, gains: {} };
    if ((tied.reacted.gains[key] || 0) >= TIED_RULES.reactionCap) return;
    tied.reacted.gains[key] = (tied.reacted.gains[key] || 0) + 1;
    changeRelation(key, 1, 'reakcja w Tied');
}
function findReactableTiedPost(id) {
    const post = getTiedPosts().find(p => p.id === id);
    return post && post.kind !== 'hr' && canSeeTiedPost(post) ? post : null;
}
function likeTiedPost(id) {
    const post = findReactableTiedPost(id);
    if (!post || post.liked) return false;
    post.liked = true;
    grantTiedReaction(post);
    return true;
}
/** 3 teksty do wyboru: stałe dla posta. */
function getTiedCommentChoices(id) {
    const start = descriptionHash(`${id}:pool`) % TIED_COMMENT_POOL.length;
    return [0, 3, 5].map(step => TIED_COMMENT_POOL[(start + step) % TIED_COMMENT_POOL.length]);
}
function commentTiedPost(id, text) {
    const post = findReactableTiedPost(id);
    if (!post || post.comment || !getTiedCommentChoices(id).includes(text)) return false;
    post.comment = text;
    grantTiedReaction(post);
    return true;
}
/** Reakcje botów: liczone z id posta, bez zapisu. */
function getTiedBotReactions(post) {
    const bots = getRelationPeople().filter(person => person.kind === 'investor');
    const count = bots.length ? descriptionHash(`${post.id}:c`) % 4 : 0;
    const comments = Array.from({ length: count }, (_, i) => ({
        person: bots[descriptionHash(`${post.id}:b${i}`) % bots.length],
        text: TIED_COMMENT_POOL[descriptionHash(`${post.id}:t${i}`) % TIED_COMMENT_POOL.length]
    }));
    return { likes: descriptionHash(`${post.id}:l`) % 25, comments };
}

// --- Osoby i firmy ---
const isTiedVerified = key => descriptionHash(key) % TIED_RULES.verifiedEvery === 0;

/** Opis osoby do widoków: klucz relacji → nazwa, rola, spółka. */
function getTiedPerson(key) {
    const person = findRelationPerson(key);
    if (!person) return null;
    if (person.kind !== 'ceo') return { key, name: person.name, kind: person.kind, role: person.kind === 'investor' ? 'Inwestor' : 'Współpracownik', stock: null };
    const ceoId = key.slice(4), stock = stocks.find(s => s.ceo?.id === ceoId);
    if (stock) return { key, name: person.name, kind: 'ceo', role: 'Prezes', stock, tenure: Math.floor((stock.ceo.tenure || 0) / 4) };
    const contact = playerProfile?.contacts?.find(c => c.id === ceoId);
    return { key, name: person.name, kind: 'ceo', role: 'Dawniej prezes', stock: stocks.find(s => s.symbol === contact?.symbol) || null, former: true };
}

/** Lista kontaktów: prezesi spółek kupionych przez gracza oraz inwestorzy, z którymi coś go łączy. */
function getTiedContacts() {
    const ceos = (playerProfile?.contacts || []).map(contact => getTiedPerson(ceoKey(contact.id)));
    const investors = getRelationPeople().filter(person => person.kind === 'investor' && (getRelation(person.id) !== 0 || isTiedFriend(person.id))).map(person => getTiedPerson(person.id));
    return [...ceos, ...investors].filter(Boolean);
}

function toggleTiedFollow(key) {
    ensureTiedState();
    playerProfile.follows = playerProfile.follows.includes(key) ? playerProfile.follows.filter(id => id !== key) : [...playerProfile.follows, key];
}
const isTiedFollowed = key => Boolean(playerProfile?.follows?.includes(key));

// =================================================================================
// Wyświetlanie
// =================================================================================
const tiedRelationText = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value))}`;
const tiedCompanyLink = stock => `<button class="tied-name" onclick="tiedOpenCompany('${escapeHtml(stock.symbol)}')">${escapeHtml(stock.name)}</button>`;
const tiedPersonLink = (key, name) => `<button class="tied-name" onclick="tiedOpenPerson('${escapeHtml(key)}')">${escapeHtml(name)}</button>`;
const tiedBadge = (cls, icon, label) => `<span class="tied-badge${cls}" title="${label}">${uiIcon(icon, 15)}<span class="sr-only">${label}</span></span>`;
function renderTiedBadges(key) {
    return `${isTiedVerified(key) ? tiedBadge('', 'zweryfikowany', 'Zweryfikowany') : ''}${isTiedFriend(key) ? tiedBadge(' is-friend', 'znajomy', 'Znajomy') : ''}`;
}
const tiedPostName = post => post.author || stocks.find(s => s.symbol === post.symbol)?.name || post.symbol;
const tiedPostKey = post => post.ceoId ? ceoKey(post.ceoId) : null;

function renderTiedStaffPost(post) {
    const stock = stocks.find(s => s.symbol === post.symbol), key = tiedPostKey(post), joined = post.hr === 'in';
    const person = key && findRelationPerson(key) ? tiedPersonLink(key, post.author) : escapeHtml(post.author);
    const company = stock ? tiedCompanyLink(stock) : escapeHtml(post.symbol);
    return `<article class="net-post tied-hr">${uiIcon(joined ? 'zarzad' : 'wyjscie', 20)}<div><span class="tied-kicker">${joined ? 'Objęcie stanowiska' : 'Odejście ze spółki'}</span>
        ${person} ${joined ? `obejmuje stanowisko prezesa spółki ${company}` : `odchodzi ze spółki ${company} (prezes)`}
        <div class="tied-meta">${formatMailTime(post.at)}</div></div></article>`;
}

function renderTiedPost(post) {
    if (post.kind === 'hr') return renderTiedStaffPost(post);
    const key = tiedPostKey(post), name = tiedPostName(post), known = key && findRelationPerson(key);
    if (!canSeeTiedPost(post)) return `<article class="net-post is-locked"><span class="net-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>${known ? tiedPersonLink(key, name) : `<strong>${escapeHtml(name)}</strong>`}${known ? renderTiedBadges(key) : ''}
        <span class="tied-locked">${uiIcon('klodka', 14)} ${TIED_LOCKED_TEXT[post.audience]}</span></article>`;
    const stock = stocks.find(s => s.symbol === post.symbol), bots = getTiedBotReactions(post);
    const who = key || post.author ? `<span class="tied-who">${known ? tiedPersonLink(key, name) : `<strong>${escapeHtml(name)}</strong>`}${known ? renderTiedBadges(key) : ''}</span>`
        : `<span class="tied-who">${stock ? tiedCompanyLink(stock) : `<strong>${escapeHtml(name)}</strong>`}${isTiedVerified(companyFollowKey(post.symbol)) ? tiedBadge('', 'zweryfikowany', 'Zweryfikowany') : ''}</span>`;
    const meta = post.author ? `Prezes · ${stock ? tiedCompanyLink(stock) : escapeHtml(post.symbol)}` : `Konto spółki · ${escapeHtml(stock ? getMainSector(stock) || '' : '')}`;
    const chip = TIED_AUDIENCE[post.audience] ? `${uiIcon(post.audience === 'friends' ? 'znajomy' : 'klodka', 12)} ${TIED_AUDIENCE[post.audience]}` : TIED_POST_KINDS[post.kind] || 'Wyniki';
    const comments = [...(post.comment ? [{ me: true, text: post.comment }] : []), ...bots.comments].map(item => {
        const label = item.me ? (playerProfile?.name || 'Ty') : item.person.name;
        return `<li><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(label))}</span><span>${item.me ? `<strong>${escapeHtml(label)}</strong>` : tiedPersonLink(item.person.id, label)}<br>${escapeHtml(item.text)}</span></li>`;
    });
    const pool = tiedView.pool === post.id && !post.comment ? `<div class="tied-pool">${getTiedCommentChoices(post.id).map(text => `<button class="tied-act" onclick="tiedComment(${post.id}, '${escapeHtml(text.replace(/'/g, "\\'"))}')">${escapeHtml(text)}</button>`).join('')}</div>` : '';
    return `<article class="net-post"><header><span class="net-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span><div>${who}<span class="tied-meta">${meta} · ${formatMailTime(post.at)}</span></div><span class="net-chip">${chip}</span></header>
        <p>${escapeHtml(post.text)}</p>
        <div class="tied-react"><button class="tied-act" aria-pressed="${Boolean(post.liked)}" onclick="tiedLike(${post.id})">${uiIcon('serce', 14)}<span>${post.liked ? 'Polubione' : 'Lubię to'}</span> <b>${bots.likes + (post.liked ? 1 : 0)}</b></button>
            <button class="tied-act" aria-expanded="${tiedView.pool === post.id}" ${post.comment ? 'disabled' : ''} onclick="tiedTogglePool(${post.id})">${uiIcon('komentarz', 14)}Skomentuj <b>${comments.length}</b></button>
            ${stock ? `<span class="tied-quote">Kurs ${escapeHtml(post.symbol)}: <strong>${formatZl(stock.price, 2)}</strong><button class="btn-ghost btn-sm" onclick="openStockDetailsModal('${escapeHtml(post.symbol)}')">${uiIcon('rynek', 14)} Pokaż spółkę</button></span>` : ''}</div>
        ${pool}${comments.length ? `<details class="tied-comments"><summary>Komentarze (${comments.length})</summary><ul>${comments.join('')}</ul></details>` : ''}</article>`;
}

function getTiedFeedPosts(feed) {
    const posts = getTiedPosts();
    if (feed === 'contacts') return posts.filter(isWatchedTiedPost);
    if (feed === 'portfolio') return posts.filter(post => post.kind !== 'hr' && canSeeTiedPost(post) && (playerPortfolio?.[post.symbol]?.shares || 0) > 0);
    return posts;
}
function renderTiedFeed() {
    const empty = { main: 'Jeszcze nic się nie wydarzyło. Posty pojawiają się przy dobrych wiadomościach ze spółek i przy zmianach w zarządach.', contacts: 'Tu trafiają posty kontaktów, znajomych i obserwowanych. Kontaktem zostaje prezes spółki, której akcje kupisz.', portfolio: 'Spółki z Twojego portfela jeszcze nic nie opublikowały. Tu trafiają posty o spółkach, które trzymasz.' };
    const posts = getTiedFeedPosts(tiedView.feed);
    return `<section class="tied-view">${posts.length ? posts.map(renderTiedPost).join('') : `<p class="net-empty">${empty[tiedView.feed]}</p>`}</section>`;
}

function renderTiedFriendAction(key) {
    const state = getTiedFriendState(key);
    if (state.status === 'friend') return `<button class="tied-act" disabled>${uiIcon('znajomy', 14)}W znajomych</button>`;
    if (state.status === 'sent') return `<button class="tied-act" disabled>${uiIcon('zegar', 14)}Prośba wysłana</button>`;
    if (state.status === 'rejected') return `<button class="tied-act" disabled>${uiIcon('blokada', 14)}Prośba odrzucona, ponów za ${Math.max(1, state.until - macro.quarter)} kw.</button>`;
    if (state.status === 'invite') return `<button class="tied-act" onclick="tiedAcceptInvite('${escapeHtml(key)}')">${uiIcon('znajomy', 14)}Przyjmij zaproszenie</button>`;
    return `<button class="tied-act" onclick="tiedRequestFriend('${escapeHtml(key)}')">${uiIcon('dodaj-znajomego', 14)}Dodaj do znajomych</button>`;
}
function renderTiedFollowAction(key) {
    const on = isTiedFollowed(key);
    return `<button class="tied-act" aria-pressed="${on}" onclick="tiedToggleFollow('${escapeHtml(key)}')">${uiIcon('obserwuj', 14)}<span>${on ? 'Obserwujesz' : 'Obserwuj'}</span></button>`;
}
const tiedBackButton = () => `<button class="tied-back" onclick="tiedBack()">${uiIcon('cofnij', 14)} Wróć do kanału</button>`;

function renderTiedPerson(key) {
    const person = getTiedPerson(key);
    if (!person) return `<section class="tied-view">${tiedBackButton()}<p class="net-empty">Tej osoby nie ma już w Tied.</p></section>`;
    const value = getRelation(key), friend = isTiedFriend(key), level = getTiedLevel(key);
    const next = friend ? (value < TIED_RULES.trustedAt ? ['Zaufany znajomy', TIED_RULES.trustedAt] : null) : ['Znajomy', TIED_RULES.friendAt];
    const meter = renderLimitMeter((value + 100) / 2, next ? (next[1] + 100) / 2 : NaN, `Relacja ${tiedRelationText(value)}${next ? `, następny poziom od +${next[1]}` : ''}`);
    const posts = getTiedPosts().filter(post => post.ceoId && ceoKey(post.ceoId) === key && post.kind !== 'hr');
    const tags = [isTiedVerified(key) ? `<span class="tied-tag tied-badge">${uiIcon('zweryfikowany', 14)} Zweryfikowany</span>` : '', friend ? `<span class="tied-tag tied-badge is-friend">${uiIcon('znajomy', 14)} Znajomy</span>` : ''].join('');
    const place = person.stock ? ` · ${tiedCompanyLink(person.stock)}` : '', tenure = Number.isFinite(person.tenure) ? ` · staż ${person.tenure} lat` : '';
    return `<section class="tied-view">${tiedBackButton()}<article class="tied-profile">
        <div class="tied-profile-head"><span class="net-avatar lg" aria-hidden="true">${escapeHtml(initials(person.name))}</span><div><h4>${escapeHtml(person.name)}</h4>
            <span class="tied-meta">${person.role}${place}${tenure}</span>${tags ? `<div class="tied-tags">${tags}</div>` : ''}</div></div>
        <div class="tied-rel"><strong>Relacja: ${level}</strong> (${tiedRelationText(value)} w skali od −100 do +100) ${meter}${next ? `<span class="tied-note">Kreska: następny poziom, ${next[0]}.</span>` : ''}</div>
        <div class="tied-actions">${renderTiedFollowAction(key)}${renderTiedFriendAction(key)}${person.stock ? `<button class="tied-act" onclick="openDescriptionModal('${escapeHtml(person.stock.symbol)}')">${uiIcon('rynek', 14)}Karta spółki</button>` : ''}</div></article>
        ${posts.length ? `<h4 class="tied-section">Ostatnie posty</h4>${posts.slice(0, 5).map(renderTiedPost).join('')}` : ''}</section>`;
}

function renderTiedCompany(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return `<section class="tied-view">${tiedBackButton()}<p class="net-empty">Tej spółki nie ma już na giełdzie.</p></section>`;
    const follow = companyFollowKey(symbol), posts = getTiedPosts().filter(post => post.symbol === symbol && post.kind !== 'hr');
    const ceoId = stock.ceo?.id, key = ceoId ? ceoKey(ceoId) : null;
    const board = stock.ceo?.name ? `<h4 class="tied-section">Zarząd</h4><ul class="tied-board"><li><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(stock.ceo.name))}</span>${key ? `${tiedPersonLink(key, stock.ceo.name)}${renderTiedBadges(key)}` : escapeHtml(stock.ceo.name)}<span class="tied-meta">Prezes</span></li></ul>` : '';
    return `<section class="tied-view">${tiedBackButton()}<article class="tied-profile">
        <div class="tied-profile-head"><span class="net-avatar lg" aria-hidden="true">${escapeHtml(initials(stock.name))}</span><div><h4>${escapeHtml(stock.name)}</h4>
            <span class="tied-meta">Konto spółki · ${escapeHtml(getMainSector(stock) || '')} · ${escapeHtml(exchanges[stock.exchange]?.name || stock.exchange)}</span>
            ${isTiedVerified(follow) ? `<div class="tied-tags"><span class="tied-tag tied-badge">${uiIcon('zweryfikowany', 14)} Zweryfikowany</span></div>` : ''}</div></div>
        ${board}<div class="tied-actions mt-3">${renderTiedFollowAction(follow)}<button class="tied-act" onclick="openDescriptionModal('${escapeHtml(symbol)}')">${uiIcon('rynek', 14)}Karta spółki</button></div></article>
        ${posts.length ? `<h4 class="tied-section">Ostatnie posty</h4>${posts.slice(0, 5).map(renderTiedPost).join('')}` : ''}</section>`;
}

/** Wątek w środku kolumny. R4 doda tu rozmowę; na razie treść wiadomości. */
function renderTiedTalk(message) {
    const sender = getMailSenderName(message.sender).replace(/^\P{L}+/u, '');
    return `<section class="tied-view"><div class="tied-talk"><div class="tied-talk-head"><span class="net-avatar" aria-hidden="true">${escapeHtml(initials(sender))}</span><div><strong>${escapeHtml(sender)}</strong><span class="tied-meta">${escapeHtml(message.subject)}</span></div>
        <button class="tied-act" onclick="tiedBack()">${uiIcon('zamknij', 14)}Zamknij</button></div>
        <div class="tied-thread"><div class="tied-bubble">${escapeHtml(message.body)}<small>${formatMailTime(message.at)}</small></div></div></div></section>`;
}

const getTiedMessages = () => mailbox.messages.filter(m => getMailChannel(m) === 'tied');

function renderTiedMyProfile() {
    const me = playerProfile || {}, position = CAREER_POSITIONS[getPositionIndex(me.positionId)]?.name || '';
    return `<section class="tied-panel"><span class="net-avatar lg" aria-hidden="true">${escapeHtml(initials(me.name))}</span><h4 class="mt-2">${escapeHtml(me.name || 'Ty')}</h4>
        <span class="tied-meta">${escapeHtml(position)}${playerFund?.name ? ` · ${escapeHtml(playerFund.name)}` : ''}</span>
        <dl class="tied-kv"><div><dt>Konto prywatne</dt><dd>${formatZl(playerWallet?.cash || 0, 2)}</dd></div><div><dt>Zaufanie klientów</dt><dd>${(playerFund?.trust ?? 0).toFixed(0)} / 100</dd></div><div><dt>Znajomi</dt><dd>${ensureTiedState().friends.length}</dd></div></dl></section>`;
}
function renderTiedMessages() {
    const rows = getTiedMessages().slice(0, 20).map(m => {
        const sender = getMailSenderName(m.sender).replace(/^\P{L}+/u, '');
        return `<li><button class="tied-contact${m.read ? '' : ' is-new'}" onclick="tiedOpenMessage(${m.id})"><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(sender))}</span><span><strong>${escapeHtml(sender)}${m.read ? '' : ' <span class="net-chip">Nowa</span>'}</strong><span class="text-sm">${escapeHtml(m.subject)}</span></span></button></li>`;
    }).join('');
    return `<section class="tied-panel">${rows ? `<ul class="tied-list">${rows}</ul>` : '<p class="text-sm text-muted">Brak wiadomości.</p>'}</section>`;
}
function renderTiedContacts() {
    const tied = ensureTiedState();
    const invites = tied.invites.map(getTiedPerson).filter(Boolean).map(person => `<div class="tied-request"><div class="tied-request-who"><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(person.name))}</span><span>${tiedPersonLink(person.key, person.name)}<br><span class="tied-meta">${person.role}${person.stock ? ` · ${escapeHtml(person.stock.name)}` : ''}</span></span></div>
        <div class="btn-row"><button class="btn-primary btn-sm" onclick="tiedAcceptInvite('${escapeHtml(person.key)}')">Przyjmij</button><button class="btn-ghost btn-sm" onclick="tiedDeclineInvite('${escapeHtml(person.key)}')">Odrzuć</button></div></div>`).join('');
    const all = getTiedContacts(), list = all.filter(person => tiedView.filter === 'all' || person.kind === tiedView.filter);
    const filter = [['all', 'Wszyscy'], ['ceo', 'Prezesi'], ['investor', 'Inwestorzy']].map(([id, label]) => `<button aria-pressed="${tiedView.filter === id}" onclick="tiedSetFilter('${id}')">${label}</button>`).join('');
    const rows = list.map(person => `<li><button class="tied-contact" onclick="tiedOpenPerson('${escapeHtml(person.key)}')"><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(person.name))}</span><span><strong>${escapeHtml(person.name)}</strong><span class="tied-meta">${person.role}${person.stock ? ` · ${escapeHtml(person.stock.name)}` : ''}</span><span class="tied-level">${getTiedLevel(person.key)}</span></span></button></li>`).join('');
    return `<section class="tied-panel">${invites ? `<h4 class="tied-section mt-0">Prośby do Ciebie (${tied.invites.length})</h4>${invites}` : ''}
        <h4 class="tied-section${invites ? '' : ' mt-0'}">Kontakty (${all.length})</h4>
        <div class="tied-filter" role="group" aria-label="Filtr kontaktów">${filter}</div>
        ${rows ? `<ul class="tied-list">${rows}</ul>` : '<p class="text-sm text-muted">Kontaktem zostaje prezes spółki, której akcje kupisz.</p>'}</section>`;
}
function renderTiedSide() {
    const unread = getTiedMessages().filter(m => !m.read).length, tab = (id, label) => `<button role="tab" aria-selected="${tiedView.side === id}" onclick="tiedSetSide('${id}')">${label}</button>`;
    const body = tiedView.side === 'msgs' ? renderTiedMessages() : tiedView.side === 'people' ? renderTiedContacts() : renderTiedMyProfile();
    return `<aside class="tied-side" aria-label="Profil, wiadomości i kontakty"><div class="tied-tabs" role="tablist" aria-label="Panel">${tab('me', 'Mój profil')}${tab('msgs', `Wiadomości${unread ? ` <span class="net-count">${unread}</span>` : ''}`)}${tab('people', 'Kontakty')}</div>${body}</aside>`;
}

function renderTiedPage() {
    const root = document.getElementById('net-tied-body');
    if (!root) return;
    const message = tiedView.message !== null ? mailbox.messages.find(m => m.id === tiedView.message) : null;
    const center = message ? renderTiedTalk(message) : tiedView.person ? renderTiedPerson(tiedView.person) : tiedView.company ? renderTiedCompany(tiedView.company) : renderTiedFeed();
    const feedTab = (id, label) => `<button role="tab" aria-selected="${tiedView.feed === id && !tiedView.person && !tiedView.company}" onclick="tiedSetFeed('${id}')">${label}</button>`;
    const paneTab = (id, label) => `<button role="tab" aria-selected="${tiedView.pane === id}" onclick="tiedSetPane('${id}')">${label}</button>`;
    root.innerHTML = `<div class="tied${message ? ' is-talk' : ''}" data-pane="${tiedView.pane}">
        <div class="tied-tabs tied-switch" role="tablist" aria-label="Widok Tied">${paneTab('feed', 'Kanał')}${paneTab('side', 'Profil i kontakty')}</div>
        <div class="tied-main"><div class="tied-feedbar"><div><div class="tied-tabs" role="tablist" aria-label="Kanał">${feedTab('main', 'Główna')}${feedTab('contacts', 'Kontakty')}${feedTab('portfolio', 'Portfel')}</div></div></div>${center}</div>
        ${renderTiedSide()}</div>`;
}

// --- Akcje widoku ---
function tiedSetView(changes) { Object.assign(tiedView, changes); renderTiedPage(); }
function tiedCenter(changes) { tiedSetView({ person: null, company: null, message: null, pool: null, pane: 'feed', ...changes }); }
const tiedBack = () => tiedCenter({});
const tiedSetFeed = feed => tiedCenter({ feed });
const tiedSetSide = side => tiedSetView({ side });
const tiedSetPane = pane => tiedSetView({ pane });
const tiedSetFilter = filter => tiedSetView({ filter });
const tiedOpenPerson = key => tiedCenter({ person: key });
const tiedOpenCompany = symbol => tiedCenter({ company: symbol });
function tiedOpenMessage(id) { markMailRead(id); tiedCenter({ message: id }); }
const tiedLike = id => { likeTiedPost(id); renderTiedPage(); };
const tiedTogglePool = id => tiedSetView({ pool: tiedView.pool === id ? null : id });
const tiedComment = (id, text) => { commentTiedPost(id, text); tiedSetView({ pool: null }); };
const tiedToggleFollow = key => { toggleTiedFollow(key); renderTiedPage(); };
const tiedRequestFriend = key => { requestTiedFriend(key); renderTiedPage(); };
const tiedAcceptInvite = key => { acceptTiedInvite(key); renderTiedPage(); };
const tiedDeclineInvite = key => { declineTiedInvite(key); renderTiedPage(); };

/** Link „Profil w Tied” w karcie spółki. */
function openTiedProfile(key) {
    const card = document.getElementById('description-modal');
    if (card) card.style.display = 'none';
    tiedCenter({ person: key });
    openInternetPage('tied');
}
