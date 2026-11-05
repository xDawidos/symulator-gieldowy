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
const TIED_POST_KINDS = { result: 'Wyniki', coop: 'Współpraca', note: 'Wpis', opinion: 'Opinia' };
const TIED_AUDIENCE = { friends: 'Dla znajomych', trusted: 'Dla zaufanych' };
const TIED_LOCKED_TEXT = { friends: 'Treść dla znajomych', trusted: 'Treść dla zaufanych' };

let tiedView = { feed: 'main', side: 'me', pane: 'feed', person: null, company: null, message: null, filter: 'all', pool: null, talk: null, draft: 'good' };
const initials = name => (String(name || '?').match(/(?<![\p{L}"])\p{L}/gu) || ['?']).filter((_, i, all) => i === 0 || i === all.length - 1).join('').toUpperCase(); // bez pseudonimu w cudzysłowie
const ceoKey = id => getCeoRelationKey(id);
const tiedPostKey = post => post.botId || (post.ceoId ? ceoKey(post.ceoId) : null);
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
    const key = tiedPostKey(post), follows = playerProfile.follows || [];
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
    if (getTiedPosts().some(p => p.symbol === stock.symbol && p.text?.startsWith(text))) return null;
    const closing = stock.ceo.id ? ` ${pickByHash(getPersonCharacterData(ceoKey(stock.ceo.id)).closing, text)}` : '';
    return addTiedPost(kind === 'coop' ? { symbol: stock.symbol, text, kind } : { symbol: stock.symbol, author: stock.ceo.name, ceoId: stock.ceo.id, text: text + closing, kind });
}

/** Wpis kadrowy z replaceCeo: objęcie stanowiska albo odejście ze spółki. */
function noteTiedStaffChange(stock, oldCeo, newCeo, role = 'prezes') {
    if (!mailbox || !stock) return;
    if (oldCeo?.name) addTiedPost({ kind: 'hr', hr: 'out', role, symbol: stock.symbol, author: oldCeo.name, ceoId: oldCeo.id });
    if (newCeo?.name) addTiedPost({ kind: 'hr', hr: 'in', role, symbol: stock.symbol, author: newCeo.name, ceoId: newCeo.id, ...(newCeo.formerDeputyTrait ? { promoted: true } : {}) });
}

// --- Znajomi i poziomy ---
function isTiedFriend(key) { return Boolean(playerProfile?.tied?.friends?.includes(key)); }
function getTiedLevel(key) {
    if (!isTiedFriend(key)) return 'Kontakt';
    return getRelation(key) >= TIED_RULES.trustedAt ? 'Zaufany znajomy' : 'Znajomy';
}
function canSeeTiedPost(post) {
    if (!post.audience || post.audience === 'public') return true;
    const key = tiedPostKey(post);
    if (!key || !isTiedFriend(key)) return false;
    return post.audience === 'friends' || post.gossip || getRelation(key) >= TIED_RULES.trustedAt; // Plotkarz: post dla zaufanych widzą znajomi
}
/** Decyzja o prośbie: próg i charakter osoby. */
function willAcceptTiedFriend(key) { return getRelation(key) >= TIED_RULES.friendAt + getPersonCharacterData(key).accept; }
/** Czy osoba zaprasza gracza: próg i charakter osoby. */
function getTiedInviteChance(key) { return getRelation(key) >= TIED_RULES.friendAt ? TIED_RULES.inviteChance * getPersonCharacterData(key).invite : 0; }

function getTiedFriendState(key) {
    const tied = ensureTiedState();
    if (tied.friends.includes(key)) return { status: 'friend' };
    if (tied.invites.includes(key)) return { status: 'invite' };
    return tied.requests[key] || { status: 'none' };
}
function requestTiedFriend(key) {
    if (getTiedFriendState(key).status !== 'none' || !findRelationPerson(key)) return false;
    ensureTiedState().requests[key] = { status: 'sent', q: macro.quarter };
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('relacjeKontakty');
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
    processPromisesQuarterly();
}

// --- Reakcje ---
function grantTiedReaction(post) {
    const key = tiedPostKey(post);
    if (!key) return;
    const tied = ensureTiedState();
    if (tied.reacted.q !== macro.quarter) tied.reacted = { q: macro.quarter, gains: {} };
    const cap = TIED_RULES.reactionCap + (stocks.some(s => getDeputies(s).some(deputy => ceoKey(deputy.id) === key && deputy.trait === 'towarzyski')) ? 1 : 0);
    if ((tied.reacted.gains[key] || 0) >= cap) return;
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
    if (person.kind === 'vip') return { key, name: person.name, kind: 'vip', role: 'Inwestor VIP', stock: null };
    if (person.kind !== 'ceo') return { key, name: person.name, kind: person.kind, role: person.kind === 'investor' ? 'Inwestor' : 'Współpracownik', stock: null };
    const ceoId = key.slice(4), stock = stocks.find(s => s.ceo?.id === ceoId);
    if (stock) return { key, name: person.name, kind: 'ceo', role: 'Prezes', stock, tenure: Math.floor((stock.ceo.tenure || 0) / 4) };
    const employer = stocks.find(s => getDeputies(s).some(deputy => deputy.id === ceoId));
    if (employer) return { key, name: person.name, kind: 'deputy', role: 'Wiceprezes', stock: employer, tenure: Math.floor((macro.quarter - getDeputies(employer).find(deputy => deputy.id === ceoId).hiredQ) / 4) };
    const contact = playerProfile?.contacts?.find(c => c.id === ceoId);
    return { key, name: person.name, kind: contact?.role === 'wiceprezes' ? 'deputy' : 'ceo', role: `Dawniej ${contact?.role || 'prezes'}`, stock: stocks.find(s => s.symbol === contact?.symbol) || null, former: true };
}

/** Lista kontaktów: prezesi spółek kupionych przez gracza oraz inwestorzy, z którymi coś go łączy. */
function getTiedContacts() {
    const ceos = (playerProfile?.contacts || []).map(contact => getTiedPerson(ceoKey(contact.id)));
    const investors = getRelationPeople().filter(person => person.kind === 'investor' && (getRelation(person.id) !== 0 || isTiedFriend(person.id))).map(person => getTiedPerson(person.id));
    const vips = (playerProfile?.tied?.vips || []).map(vip => getTiedPerson(`vip:${vip.id}`));
    return [...ceos, ...investors, ...vips].filter(Boolean);
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
const tiedRoleOf = post => post.kind === 'player' ? 'Zarządca funduszu' : post.botId ? 'Inwestor' : post.role || 'Prezes';
const tiedPostName = post => post.author || stocks.find(s => s.symbol === post.symbol)?.name || post.symbol;

function renderTiedStaffPost(post) {
    const stock = stocks.find(s => s.symbol === post.symbol), key = tiedPostKey(post), joined = post.hr === 'in';
    const person = key && findRelationPerson(key) ? tiedPersonLink(key, post.author) : escapeHtml(post.author);
    const company = stock ? tiedCompanyLink(stock) : escapeHtml(post.symbol);
    return `<article class="net-post tied-hr">${uiIcon(joined ? 'zarzad' : 'wyjscie', 20)}<div><span class="tied-kicker">${joined ? 'Objęcie stanowiska' : 'Odejście ze spółki'}</span>
        ${person} ${joined ? `obejmuje stanowisko ${post.role === 'wiceprezes' ? 'wiceprezesa' : 'prezesa'} spółki ${company}` : `odchodzi ze spółki ${company} (${post.role || 'prezes'})`}
        <div class="tied-meta">${post.promoted ? 'wcześniej wiceprezes tej spółki · ' : ''}${formatMailTime(post.at)}</div></div></article>`;
}

function renderTiedPost(post) {
    if (post.kind === 'hr') return renderTiedStaffPost(post);
    const key = tiedPostKey(post), name = tiedPostName(post), known = key && findRelationPerson(key);
    if (!canSeeTiedPost(post)) return `<article class="net-post is-locked"><span class="net-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>${known ? tiedPersonLink(key, name) : `<strong>${escapeHtml(name)}</strong>`}${known ? renderTiedBadges(key) : ''}
        <span class="tied-locked">${uiIcon('klodka', 14)} ${TIED_LOCKED_TEXT[post.audience]}</span></article>`;
    const stock = stocks.find(s => s.symbol === post.symbol), bots = getTiedBotReactions(post);
    const meta = post.botId || post.kind === 'player' ? tiedRoleOf(post) : post.author ? `${tiedRoleOf(post)} · ${stock ? tiedCompanyLink(stock) : escapeHtml(post.symbol)}` : `Konto spółki · ${escapeHtml(stock ? getMainSector(stock) || '' : '')}`;
    if (post.kind === 'player') return `<article class="net-post"><header><span class="net-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span><div><span class="tied-who"><strong>${escapeHtml(name)}</strong></span><span class="tied-meta">${meta} · ${formatMailTime(post.at)}</span></div><span class="net-chip">Wpis</span></header><p>${escapeHtml(post.text)}</p></article>`;
    const who = key || post.author ? `<span class="tied-who">${known ? tiedPersonLink(key, name) : `<strong>${escapeHtml(name)}</strong>`}${known ? renderTiedBadges(key) : ''}</span>`
        : `<span class="tied-who">${stock ? tiedCompanyLink(stock) : `<strong>${escapeHtml(name)}</strong>`}${isTiedVerified(companyFollowKey(post.symbol)) ? tiedBadge('', 'zweryfikowany', 'Zweryfikowany') : ''}</span>`;
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

function renderTiedTalkAction(key) {
    const access = getTiedTalkAccess(key);
    if (!access) return '';
    if (hasTalkedThisQuarter(key)) return `<button class="tied-act" disabled>${uiIcon('komentarz', 14)}Następna rozmowa w kolejnym kwartale</button>`;
    return `<button class="tied-act" onclick="tiedOpenTalk('${escapeHtml(key)}')">${uiIcon('komentarz', 14)}Napisz</button>`;
}

function renderTiedPerson(key) {
    const person = getTiedPerson(key);
    if (!person) return `<section class="tied-view">${tiedBackButton()}<p class="net-empty">Tej osoby nie ma już w Tied.</p></section>`;
    const value = getRelation(key), friend = isTiedFriend(key), level = getTiedLevel(key);
    const next = friend ? (value < TIED_RULES.trustedAt ? ['Zaufany znajomy', TIED_RULES.trustedAt] : null) : ['Znajomy', TIED_RULES.friendAt];
    const meter = renderLimitMeter((value + 100) / 2, next ? (next[1] + 100) / 2 : NaN, `Relacja ${tiedRelationText(value)}${next ? `, następny poziom od +${next[1]}` : ''}`);
    const posts = getTiedPosts().filter(post => tiedPostKey(post) === key && post.kind !== 'hr');
    const tags = [isTiedVerified(key) ? `<span class="tied-tag tied-badge">${uiIcon('zweryfikowany', 14)} Zweryfikowany</span>` : '', friend ? `<span class="tied-tag tied-badge is-friend">${uiIcon('znajomy', 14)} Znajomy</span>` : ''].join('');
    const place = person.stock ? ` · ${tiedCompanyLink(person.stock)}` : '', tenure = Number.isFinite(person.tenure) ? ` · staż ${person.tenure} lat` : '';
    return `<section class="tied-view">${tiedBackButton()}<article class="tied-profile">
        <div class="tied-profile-head"><span class="net-avatar lg" aria-hidden="true">${escapeHtml(initials(person.name))}</span><div><h4>${escapeHtml(person.name)}</h4>
            <span class="tied-meta">${person.role}${place}${tenure}</span>${tags ? `<div class="tied-tags">${tags}</div>` : ''}</div></div>
        <div class="tied-rel"><strong>Relacja: ${level}</strong> (${tiedRelationText(value)} w skali od −100 do +100) ${meter}${next ? `<span class="tied-note">Kreska: następny poziom, ${next[0]}.</span>` : ''}</div>
        <div class="tied-actions">${renderTiedFollowAction(key)}${renderTiedTalkAction(key)}${renderTiedFriendAction(key)}${person.stock ? `<button class="tied-act" onclick="openDescriptionModal('${escapeHtml(person.stock.symbol)}')">${uiIcon('rynek', 14)}Karta spółki</button>` : ''}</div></article>
        ${posts.length ? `<h4 class="tied-section">Ostatnie posty</h4>${posts.slice(0, 5).map(renderTiedPost).join('')}` : ''}</section>`;
}

function renderTiedCompany(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return `<section class="tied-view">${tiedBackButton()}<p class="net-empty">Tej spółki nie ma już na giełdzie.</p></section>`;
    const follow = companyFollowKey(symbol), posts = getTiedPosts().filter(post => post.symbol === symbol && post.kind !== 'hr');
    const row = (person, role) => { const id = person.id ? ceoKey(person.id) : null; return `<li><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(person.name))}</span>${id ? `${tiedPersonLink(id, person.name)}${renderTiedBadges(id)}` : escapeHtml(person.name)}<span class="tied-meta">${role}</span></li>`; };
    const board = stock.ceo?.name ? `<h5 class="tied-section">Zarząd</h5><ul class="tied-board">${row(stock.ceo, 'Prezes')}${getDeputies(stock).map(deputy => row(deputy, 'Wiceprezes')).join('')}</ul>` : '';
    return `<section class="tied-view">${tiedBackButton()}<article class="tied-profile">
        <div class="tied-profile-head"><span class="net-avatar lg" aria-hidden="true">${escapeHtml(initials(stock.name))}</span><div><h4>${escapeHtml(stock.name)}</h4>
            <span class="tied-meta">Konto spółki · ${escapeHtml(getMainSector(stock) || '')} · ${escapeHtml(exchanges[stock.exchange]?.name || stock.exchange)}</span>
            ${isTiedVerified(follow) ? `<div class="tied-tags"><span class="tied-tag tied-badge">${uiIcon('zweryfikowany', 14)} Zweryfikowany</span></div>` : ''}</div></div>
        ${board}<div class="tied-actions mt-3">${renderTiedFollowAction(follow)}<button class="tied-act" onclick="openDescriptionModal('${escapeHtml(symbol)}')">${uiIcon('rynek', 14)}Karta spółki</button></div></article>
        ${posts.length ? `<h4 class="tied-section">Ostatnie posty</h4>${posts.slice(0, 5).map(renderTiedPost).join('')}` : ''}</section>`;
}

/** Wiadomość w środku kolumny; rozmowę prowadzi renderTiedConversation. */
function renderTiedTalk(message) {
    const sender = getMailSenderName(message.sender).replace(/^\P{L}+/u, '');
    return `<section class="tied-view"><div class="tied-talk"><div class="tied-talk-head"><span class="net-avatar" aria-hidden="true">${escapeHtml(initials(sender))}</span><div><strong>${escapeHtml(sender)}</strong><span class="tied-meta">${escapeHtml(message.subject)}</span></div>
        <button class="tied-act" onclick="tiedBack()">${uiIcon('zamknij', 14)}Zamknij</button></div>
        <div class="tied-thread"><div class="tied-bubble">${escapeHtml(message.body)}<small>${formatMailTime(message.at)}</small></div></div>${String(message.sender).startsWith('bot:') ? `<div class="tied-actions">${renderTiedTalkAction(String(message.sender).slice(4))}</div>` : ''}</div></section>`;
}

function renderTiedConversation(talk) {
    const person = talk.name ? { name: talk.name, role: 'Inwestor VIP', stock: null } : getTiedPerson(talk.key);
    const key = talk.key, name = person?.name || '', known = !talk.name;
    const head = `<div class="tied-talk-head"><span class="net-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span><div><span class="tied-who">${known ? tiedPersonLink(key, name) : `<strong>${escapeHtml(name)}</strong>`}${known ? renderTiedBadges(key) : ''}</span><span class="tied-meta">${person?.role || ''}${person?.stock ? ` · ${escapeHtml(person.stock.name)}` : ''}${known ? ` · relacja: ${getTiedLevel(key)}` : ''}</span></div>
        <button class="tied-act" onclick="tiedBack()">${uiIcon('zamknij', 14)}Zamknij rozmowę</button></div>`;
    if (talk.start) return `<section class="tied-view"><div class="tied-talk">${head}<div class="tied-start"><button class="tied-act" onclick="tiedStartFull()">${uiIcon('komentarz', 14)}Porozmawiaj (2–3 tury)</button><button class="tied-act" onclick="tiedQuick()">${uiIcon('szybko', 14)}Szybka rozmowa (tylko relacja, do +2)</button></div></div></section>`;
    const thread = talk.log.map(line => `<div class="tied-bubble${line.me ? ' is-me' : ''}">${escapeHtml(line.text)}</div>`).join('');
    if (talk.result) {
        const { delta, requested } = talk.result, sign = delta > 0 ? '▲ +' : delta < 0 ? '▼ −' : '■ ';
        const text = talk.name ? (talk.result.success ? `${escapeHtml(name)} wpłaca środki do funduszu.` : `${escapeHtml(name)} rezygnuje z wpłaty.`) : `Rozmowa zakończona. Relacja <strong>${sign}${Math.abs(delta)}</strong>, teraz ${tiedRelationText(getRelation(key))}. Następna rozmowa w kolejnym kwartale.${talk.request ? (requested ? ' Zarząd wróci do Twojej prośby.' : ' Prośba została bez odpowiedzi.') : ''}`;
        return `<section class="tied-view"><div class="tied-talk">${head}<div class="tied-thread">${thread}</div><div class="tied-result">${uiIcon('ok', 16)}<span>${text}</span></div></div></section>`;
    }
    const choices = talk.options.map((option, index) => `<button onclick="tiedChoose(${index})"><small>${TALK_TONES[option.tone].label}</small>${escapeHtml(option.text)}</button>`).join('');
    const stock = !talk.name && person?.stock && !person.former ? person.stock : null, stake = getTalkStake(stock), last = talk.turn === talk.turns, open = stake >= TALK_RULES.minStake;
    const requests = stock && last ? `<h4 class="tied-section">Prośby do zarządu</h4><div class="tied-choices">${Object.entries(TALK_REQUESTS).map(([id, item]) => `<button ${open ? `onclick="tiedChoose(0, '${id}')"` : 'disabled'}><small>${item.label}</small>${item.text}</button>`).join('')}</div>${open ? '' : `<p class="notice-inline">${uiIcon('klodka', 14)}<span>Prośby wymagają co najmniej 5% udziałów w spółce. Masz ${formatNumberPl(stake * 100, 1)}%.</span></p>`}` : '';
    return `<section class="tied-view"><div class="tied-talk">${head}<div class="tied-thread">${thread}<p class="tied-turn">Tura ${talk.turn} z ${talk.turns}. Jedna rozmowa z tą osobą na kwartał.</p><div class="tied-choices">${choices}</div>${requests}</div></div></section>`;
}

const getTiedMessages = () => mailbox.messages.filter(m => getMailChannel(m) === 'tied');

function renderTiedMyProfile() {
    const me = playerProfile || {}, position = CAREER_POSITIONS[getPositionIndex(me.positionId)]?.name || '';
    return `<section class="tied-panel"><span class="net-avatar lg" aria-hidden="true">${escapeHtml(initials(me.name))}</span><h4 class="mt-2">${escapeHtml(me.name || 'Ty')}</h4>
        <span class="tied-meta">${escapeHtml(position)}${playerFund?.name ? ` · ${escapeHtml(playerFund.name)}` : ''}</span>
        <dl class="tied-kv"><div><dt>Konto prywatne</dt><dd>${formatZl(playerWallet?.cash || 0, 2)}</dd></div><div><dt>Zaufanie klientów</dt><dd>${(playerFund?.trust ?? 0).toFixed(0)} / 100</dd></div><div><dt>Znajomi</dt><dd>${ensureTiedState().friends.length}</dd></div></dl>
        <h4 class="tied-section">${uiIcon('wpis', 14)} Wpis na ten kwartał</h4>${canPublishTiedPost() ? `<form class="tied-compose" onsubmit="tiedPublish(); return false">${Object.entries(TIED_PLAYER_POSTS).map(([id, text]) => `<label><input type="radio" name="tied-post" value="${id}" ${tiedView.draft === id ? 'checked' : ''} onchange="tiedView.draft='${id}'"> ${escapeHtml(text)}</label>`).join('')}<div class="btn-row"><button class="btn-primary btn-sm">Opublikuj</button></div></form>` : '<p class="tied-note">Wpis opublikowany. Następny w kolejnym kwartale.</p>'}</section>`;
}
function renderTiedMessages() {
    const offers = getVipOffers().map(offer => `<div class="tied-offer"><span class="tied-kicker">Oferta VIP</span><p>${escapeHtml(offer.name)} rozważa wpłatę do funduszu. Rozmowa rozstrzyga, czy wpłaci.</p><div class="tied-actions"><button class="btn-primary btn-sm" onclick="tiedOpenVip(${offer.id})">Porozmawiaj</button><button class="btn-ghost btn-sm" onclick="tiedDeclineVip(${offer.id})">Odrzuć</button></div></div>`).join('');
    const rows = getTiedMessages().slice(0, 20).map(m => {
        const sender = getMailSenderName(m.sender).replace(/^\P{L}+/u, '');
        return `<li><button class="tied-contact${m.read ? '' : ' is-new'}" onclick="tiedOpenMessage(${m.id})"><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(sender))}</span><span><strong>${escapeHtml(sender)}${m.read ? '' : ' <span class="net-chip">Nowa</span>'}</strong><span class="text-sm">${escapeHtml(m.subject)}</span></span></button></li>`;
    }).join('');
    return `<section class="tied-panel">${offers}${typeof renderTiedPromiseOffers === 'function' ? renderTiedPromiseOffers() : ''}${rows ? `<ul class="tied-list">${rows}</ul>` : offers ? '' : '<p class="text-sm text-muted">Brak wiadomości.</p>'}</section>`;
}
function renderTiedContacts() {
    const tied = ensureTiedState();
    const invites = tied.invites.map(getTiedPerson).filter(Boolean).map(person => `<div class="tied-request"><div class="tied-request-who"><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(person.name))}</span><span>${tiedPersonLink(person.key, person.name)}<br><span class="tied-meta">${person.role}${person.stock ? ` · ${escapeHtml(person.stock.name)}` : ''}</span></span></div>
        <div class="btn-row"><button class="btn-primary btn-sm" onclick="tiedAcceptInvite('${escapeHtml(person.key)}')">Przyjmij</button><button class="btn-ghost btn-sm" onclick="tiedDeclineInvite('${escapeHtml(person.key)}')">Odrzuć</button></div></div>`).join('');
    const all = getTiedContacts(), list = all.filter(person => tiedView.filter === 'all' || person.kind === tiedView.filter);
    const filter = [['all', 'Wszyscy'], ['ceo', 'Prezesi'], ['deputy', 'Wiceprezesi'], ['investor', 'Inwestorzy'], ['vip', 'VIP-y']].map(([id, label]) => `<button aria-pressed="${tiedView.filter === id}" onclick="tiedSetFilter('${id}')">${label}</button>`).join('');
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
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('jakCzytacTied');
    const message = tiedView.message !== null ? mailbox.messages.find(m => m.id === tiedView.message) : null, talk = tiedView.talk;
    const center = talk ? renderTiedConversation(talk) : message ? renderTiedTalk(message) : tiedView.person ? renderTiedPerson(tiedView.person) : tiedView.company ? renderTiedCompany(tiedView.company) : renderTiedFeed();
    const feedTab = (id, label) => `<button role="tab" aria-selected="${tiedView.feed === id && !tiedView.person && !tiedView.company}" onclick="tiedSetFeed('${id}')">${label}</button>`;
    const paneTab = (id, label) => `<button role="tab" aria-selected="${tiedView.pane === id}" onclick="tiedSetPane('${id}')">${label}</button>`;
    root.innerHTML = `<div class="tied${message || talk ? ' is-talk' : ''}" data-pane="${tiedView.pane}">
        <div class="tied-tabs tied-switch" role="tablist" aria-label="Widok Tied">${paneTab('feed', 'Kanał')}${paneTab('side', 'Profil i kontakty')}</div>
        <div class="tied-main"><div class="tied-feedbar"><div><div class="tied-tabs" role="tablist" aria-label="Kanał">${feedTab('main', 'Główna')}${feedTab('contacts', 'Kontakty')}${feedTab('portfolio', 'Portfel')}</div></div></div>${center}</div>
        ${renderTiedSide()}</div>`;
}

// --- Akcje widoku ---
function tiedSetView(changes) { Object.assign(tiedView, changes); renderTiedPage(); }
function tiedCenter(changes) { tiedSetView({ person: null, company: null, message: null, pool: null, talk: null, pane: 'feed', ...changes }); }
const tiedBack = () => tiedCenter({});
const tiedSetFeed = feed => tiedCenter({ feed });
const tiedSetSide = side => tiedSetView({ side });
const tiedSetPane = pane => tiedSetView({ pane });
const tiedSetFilter = filter => tiedSetView({ filter });
const tiedOpenPerson = key => tiedCenter({ person: key });
const tiedOpenCompany = symbol => tiedCenter({ company: symbol });
function tiedOpenMessage(id) { markMailRead(id); tiedCenter({ message: id }); }
function tiedOpenTalk(key) {
    if (getTiedTalkAccess(key) === 'full') { tiedCenter({ talk: { key, start: true } }); return; }
    quickTiedTalk(key); tiedCenter({ person: key });
}
function tiedStartFull() { const key = tiedView.talk?.key; if (key && startTiedTalk(key)) renderTiedPage(); }
function tiedQuick() { const key = tiedView.talk?.key; if (key) { quickTiedTalk(key); tiedCenter({ person: key }); } }
const tiedChoose = (index, request = null) => { chooseTalkOption(index, request); renderTiedPage(); };
const tiedPublish = () => { publishTiedPlayerPost(tiedView.draft); renderTiedPage(); };
function tiedOpenVip(id) { if (startVipTalk(id)) tiedSetView({ person: null, company: null, message: null, pane: 'feed' }); }
const tiedDeclineVip = id => { declineVipOffer(id); renderTiedPage(); };
function openTiedVip(id) {
    tiedCenter({ side: 'msgs' });
    openInternetPage('tied');
    tiedOpenVip(id);
    if (typeof closeMailbox === 'function') closeMailbox();
}
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

// =================================================================================
// 0.17.3 R2 i R4: charaktery (tylko dane, nigdy w interfejsie), zapowiedzi, opinie botów, KNF
// =================================================================================
// truth: udział prawdziwych zapowiedzi, hint: szansa posta przy prawdziwym planie, decay: mnożnik zaniku relacji,
// tones: ocena tonu w rozmowie (−2…+2), closing i flavor: styl, po którym gracz czyta rozmówcę.
const TIED_CHARACTERS = {
    rachmistrz: { weight: 18, truth: 0.9, hint: 0.7, decay: 1, invite: 1, accept: 0,
        tones: { numbers: 2, vision: -1, safety: 1, relation: 0, pressure: -1 },
        closing: ['Liczby się zgadzają.', 'Marża zostaje naszym priorytetem.', 'Pilnujemy kosztów.'],
        flavor: ['Przejrzałem koszty za ostatni kwartał. Marża to nie przypadek, tylko dyscyplina.', 'Każdą złotówkę wydatków liczymy dwa razy.', 'Rozmawialiśmy dziś o marży. Tym razem bardzo długo.'],
        reply: { good: 'Konkretnie. Takie rozmowy lubię.', bad: 'Proszę o liczby, nie o wrażenia.', neutral: 'Sprawdzę to w arkuszu.' } },
    mentor: { weight: 16, truth: 0.85, hint: 0.9, decay: 1, invite: 1.3, accept: 0,
        tones: { numbers: 0, vision: 1, safety: 0, relation: 2, pressure: -2 },
        closing: ['Warto się tym podzielić.', 'To była dobra lekcja.', 'Tego uczę młodszych kolegów.'],
        flavor: ['Najcenniejszą lekcję dostałem w najgorszym kwartale, nie w najlepszym.', 'Spokój w zarządzie jest wart więcej niż jeden dobry raport.', 'Młodym menedżerom powtarzam: najpierw słuchaj rynku.'],
        reply: { good: 'Miło to słyszeć. Porozmawiajmy jeszcze.', bad: 'Spokojnie, nie w tym tonie.', neutral: 'Dobre pytanie, pomyślmy nad nim.' } },
    lojalista: { weight: 16, truth: 0.8, hint: 0.7, decay: 0.5, invite: 1, accept: 0,
        tones: { numbers: -1, vision: 0, safety: 1, relation: 2, pressure: -2 },
        closing: ['Dziękuję całemu zespołowi.', 'Dziękuję naszym partnerom.', 'To zasługa ludzi.'],
        flavor: ['Dziękuję zespołowi za ten kwartał. Bez was nie byłoby tych wyników.', 'Dobrzy partnerzy to największy kapitał spółki.', 'Kolejny rok z tymi samymi dostawcami. Takie relacje się ceni.'],
        reply: { good: 'Dziękuję, doceniam to.', bad: 'Myślałem, że się rozumiemy.', neutral: 'Dobrze, że o tym mówimy.' } },
    zachowawczy: { weight: 16, truth: 0.7, hint: 0.35, decay: 1, invite: 0.7, accept: 0,
        tones: { numbers: 1, vision: -2, safety: 2, relation: 0, pressure: -1 },
        closing: ['Bez pośpiechu.', 'Stabilnie, krok po kroku.', 'Działamy ostrożnie.'],
        flavor: ['Stabilnie i bez pośpiechu. Tak zamierzamy pracować także w tym roku.', 'Nie zmieniamy czegoś, co działa.', 'Ostrożność kosztuje mniej niż pośpiech.'],
        reply: { good: 'Rozsądnie. Tak wolę rozmawiać.', bad: 'To brzmi zbyt ryzykownie.', neutral: 'Muszę to przemyśleć.' } },
    sceptyk: { weight: 14, truth: 0.7, hint: 0.6, decay: 1, invite: 0.7, accept: 0,
        tones: { numbers: 2, vision: -2, safety: 1, relation: -1, pressure: 0 },
        closing: ['Zobaczymy, czy to przetrwa.', 'Wolę poczekać na dane.', 'Moda szybko mija.'],
        flavor: ['Wszyscy mówią o tym samym trendzie. Dlatego wolę poczekać.', 'Czy naprawdę tym razem jest inaczej?', 'Rynek lubi opowieści. Ja wolę sprawdzać.'],
        reply: { good: 'Tu mogę się zgodzić.', bad: 'Nie przekonuje mnie to.', neutral: 'Może. Pokaż dane.' } },
    blefiarz: { weight: 12, truth: 0.4, hint: 0.9, decay: 1, invite: 1, accept: 0,
        tones: { numbers: -2, vision: 2, safety: -1, relation: 1, pressure: 0 },
        closing: ['Będzie wielki rok!!!', 'To dopiero początek!!!', 'Najlepsi na rynku!!!'],
        flavor: ['Absolutnie rewolucyjny kwartał!!! Rynek jeszcze nie wie, co nadchodzi!!!', 'Jesteśmy najlepsi i wszyscy to widzą!!!', 'Niesamowite rzeczy dzieją się w naszej firmie!!!'],
        reply: { good: 'Właśnie o to chodzi!!!', bad: 'Nie rozumiesz naszej skali!', neutral: 'Zobaczysz, będzie wielkie!!!' } },
    manipulator: { weight: 8, truth: 0.5, hint: 0.8, decay: 1, invite: 2, accept: 0,
        tones: { numbers: -1, vision: 1, safety: -1, relation: 2, pressure: -1 },
        closing: ['Cenię ludzi, którzy to rozumieją.', 'Liczę na wsparcie.', 'Mądrzy inwestorzy już wiedzą.'],
        flavor: ['Mądrzy inwestorzy widzą to, czego inni jeszcze nie zauważyli.', 'Doceniam tych, którzy są z nami od początku. Pamiętam o nich.', 'Przydałoby się kilka dobrych głosów przy tej sprawie.'],
        reply: { good: 'Od początku wiedziałem, że można na Ciebie liczyć.', bad: 'Szkoda, liczyłem na więcej zrozumienia.', neutral: 'Pomyślmy, jak możemy sobie pomóc.' } }
};
const TIED_BOT_CHARACTERS = { calm: 'zachowawczy', pro_investor: 'rachmistrz', dividend_chaser: 'lojalista', graham: 'sceptyk', whale: 'mentor', banker: 'rachmistrz', reckless: 'blefiarz', yolo_trader: 'manipulator', guard: 'lojalista' };

/** Charakter osoby: stały dla klucza, boty z osobowości. Tylko do logiki. */
function getPersonCharacter(key) {
    const bot = typeof aiCompetitors !== 'undefined' ? aiCompetitors.find(ai => ai.id === key) : null;
    if (bot) return bot.customLogic === 'wolf' ? 'manipulator' : TIED_BOT_CHARACTERS[bot.personality] || 'sceptyk';
    const list = Object.entries(TIED_CHARACTERS), total = list.reduce((sum, [, c]) => sum + c.weight, 0);
    let roll = descriptionHash(`char:${key}`) % total;
    for (const [id, c] of list) { if (roll < c.weight) return id; roll -= c.weight; }
    return 'sceptyk';
}
const getPersonCharacterData = key => TIED_CHARACTERS[getPersonCharacter(key)];
/** Zanik relacji (processRelationsQuarterly). */
const getRelationDecayFactor = key => key.startsWith('ceo:') || aiCompetitors.some(ai => ai.id === key) ? getPersonCharacterData(key).decay : 1;

const COMPANY_PLAN_RULES = { delay: [1, 2], audienceTrusted: 0.35, fakeBase: 0.03, tipChance: 0.15, fineShare: 0.05, flavorPosts: 2, investorPostChance: 0.5, pumpShare: 0.3 };
const TIED_HINTS = {
    dividend: { friends: ['Coraz częściej rozmawiamy w zarządzie o akcjonariuszach.', 'Akcjonariusze pytają o wypłaty. Słuchamy.'], trusted: ['Na najbliższym posiedzeniu wracamy do polityki wypłat.', 'Inaczej patrzymy dziś na podział zysku.'] },
    buyback: { friends: ['Uważamy, że rynek nie docenia naszej spółki.', 'Sporo mówimy ostatnio o własnych akcjach.'], trusted: ['Gotówkę można dziś wykorzystać lepiej niż na lokacie, także na rynku.', 'Nasze akcje wyglądają ciekawie. Tyle mogę powiedzieć.'] },
    strategy: { friends: ['Szukamy nowych kierunków rozwoju.', 'Układamy strategię na nowo.'], trusted: ['Rozważamy wejście w coś, czego jeszcze nie robiliśmy.', 'Zarząd dyskutuje o zmianie profilu działalności.'] },
    takeover: { friends: ['Patrzymy szerzej na nasz sektor.', 'Rynek się konsoliduje, a my to widzimy.'], trusted: ['Przyglądamy się mniejszemu graczowi z sektora {sector}.', 'Mamy na oku spółkę z sektora {sector}.'] }
};
const TIED_PLAN_TYPES = Object.keys(TIED_HINTS);

/** Post-zapowiedź: bez liczb i dat, styl zdradza autora. */
function postTiedHint(stock, type, sectorName = null) {
    if (!stock.ceo?.id) return null;
    const quiet = getDeputies(stock).find(deputy => deputy.trait === 'milczek'), gossip = getDeputies(stock).find(deputy => deputy.trait === 'plotkarz');
    const author = (type && stock.plannedMove?.real && quiet) || gossip || stock.ceo, key = ceoKey(author.id), character = getPersonCharacterData(key); // Milczek mówi tylko o planach prawdziwych
    if (Math.random() >= character.hint) return null;
    const audience = Math.random() < COMPANY_PLAN_RULES.audienceTrusted ? 'trusted' : 'friends';
    const text = getRandomElement(TIED_HINTS[type][audience]).replace('{sector}', sectorName || getMainSector(stock) || 'podobnego');
    return addTiedPost({ symbol: stock.symbol, author: author.name, ceoId: author.id, text: `${text} ${getRandomElement(character.closing)}`, kind: 'hint', audience, q: macro.quarter, ...(author !== stock.ceo ? { role: 'Wiceprezes' } : {}), ...(gossip && author === gossip ? { gossip: true } : {}) });
}

/** Plan spółki: decyzja zapada teraz, wykonanie po 1–2 kwartałach. false, gdy spółka ma już plan: wtedy kod wykonuje decyzję od razu, więc częstość się nie zmienia. */
function planCompanyMove(stock, type, data = null, atQ = null) {
    if (stock.plannedMove || !stock.ceo?.id || stock.assetType) return false;
    stock.plannedMove = { type, atQ: atQ ?? macro.quarter + getRandomIntInRange(...COMPANY_PLAN_RULES.delay), real: true, ...(data ? { data } : {}) };
    postTiedHint(stock, type, data?.targetSector);
    return true;
}
function executeCompanyPlan(stock, plan) {
    const data = plan.data || {};
    if (plan.type === 'dividend') return !stock.dividendPolicyLockedByOwner && applyDividendPolicyChange(stock, data.policy);
    if (plan.type === 'strategy') return proposeStrategy(stock, data.proposal) === 'started';
    if (plan.type === 'buyback') { // prośba do zarządu; zwykły skup działa na liczniku cechy prezesa
        const shares = Math.floor(stock.totalShares * 0.001);
        if (!(shares > 0) || shares > getAvailableShares(stock)) return false;
        stock.treasuryShares = (stock.treasuryShares || 0) + shares;
        logEvent(`📈 Zarząd ${stock.name} ogłasza skup akcji własnych.`, 'company');
        return true;
    }
    if (plan.type === 'takeover') {
        const target = stocks.find(s => s.symbol === data.target);
        if (!target || target.isBankrupt || target.mergerProcess || stock.mergerProcess) return false; // plan odpada z przyczyn zewnętrznych
        return Boolean(initiateMergerProcess(stock, target, data.kind, data.financing, data.premium));
    }
    return false;
}
/** Co kwartał: plany z nadchodzącym terminem i zapowiedzi bez pokrycia (ich liczba wynika z prawdziwości charakteru). */
function processCompanyPlansQuarterly() {
    const quarter = macro.quarter;
    for (const stock of stocks) {
        const plan = stock.plannedMove;
        if (plan && plan.atQ <= quarter) {
            delete stock.plannedMove;
            if (plan.real && (plan.type !== 'buyback' || plan.data?.manual) && executeCompanyPlan(stock, plan)) resolveTiedTips(stock);
            continue;
        }
        if (plan || !stock.ceo?.id || stock.assetType || stock.isBankrupt) continue;
        const truth = getPersonCharacterData(ceoKey(stock.ceo.id)).truth;
        if (Math.random() < COMPANY_PLAN_RULES.fakeBase * (1 - truth) / truth) {
            const type = getRandomElement(TIED_PLAN_TYPES);
            stock.plannedMove = { type, atQ: quarter + getRandomIntInRange(...COMPANY_PLAN_RULES.delay), real: false };
            postTiedHint(stock, type);
        }
    }
    processTiedChatterQuarterly();
}

// --- Posty bez zapowiedzi: styl prezesów i opinie inwestorów ---
function processTiedChatterQuarterly() {
    if (!mailbox) return;
    const authors = stocks.filter(s => s.ceo?.id && !s.isBankrupt && !s.assetType).flatMap(s => [{ stock: s, person: s.ceo }, ...getDeputies(s).flatMap(deputy => Array.from({ length: Math.round((DEPUTY_TRAITS[deputy.trait]?.posts ?? 1) * 2) }, () => ({ stock: s, person: deputy, role: 'Wiceprezes' })))]);
    for (let i = 0; i < COMPANY_PLAN_RULES.flavorPosts && authors.length; i++) {
        const { stock, person, role } = getRandomElement(authors);
        addTiedPost({ symbol: stock.symbol, author: person.name, ceoId: person.id, text: getRandomElement(getPersonCharacterData(ceoKey(person.id)).flavor), kind: 'note', ...(role ? { role } : {}) });
    }
    const speaker = stocks.find(s => hasDeputyTrait(s, 'rzecznik') && Math.random() < 0.15); // Rzecznik: częstsze posty konta spółki
    if (speaker) addTiedPost({ symbol: speaker.symbol, text: pickByHash(['Pracujemy nad kolejnymi projektami. Szczegóły wkrótce.', 'Dziękujemy klientom za kolejny dobry kwartał.', 'Spotkajmy się na najbliższych targach branżowych.'], `${speaker.symbol}:${macro.quarter}`), kind: 'note' });
    for (const ai of aiCompetitors) { // wypchnięcie akcji po własnej reklamie
        if (ai.tiedPump && ai.tiedPump.q < macro.quarter) {
            const shares = Math.floor((ai.portfolio?.[ai.tiedPump.symbol]?.shares || 0) * COMPANY_PLAN_RULES.pumpShare);
            if (shares > 0) aiSellStock(ai, ai.tiedPump.symbol, shares);
            delete ai.tiedPump;
        }
    }
    if (Math.random() < COMPANY_PLAN_RULES.investorPostChance) postTiedInvestorOpinion();
}
function postTiedInvestorOpinion() {
    const bots = getRelationPeople().filter(person => person.kind === 'investor' && Object.keys(person.entity.portfolio || {}).length);
    if (!bots.length) return null;
    const person = getRandomElement(bots), ai = person.entity, symbols = Object.keys(ai.portfolio).filter(symbol => stocks.some(s => s.symbol === symbol && !s.assetType));
    if (!symbols.length) return null;
    const symbol = getRandomElement(symbols), stock = stocks.find(s => s.symbol === symbol), character = getPersonCharacter(person.id), fair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(stock) : 0;
    const pump = (character === 'manipulator' || character === 'blefiarz') && Math.random() < 0.5;
    if (pump) ai.tiedPump = { symbol: stock.symbol, q: macro.quarter };
    const cheap = pump || (fair > 0 && stock.price < fair);
    const text = pump ? `${stock.name} to okazja, jakiej dawno nie było. ${getRandomElement(TIED_CHARACTERS[character].closing)}`
        : cheap ? `Trzymam ${stock.name} i uważam, że kurs jest niżej, niż powinien.` : `Trzymam ${stock.name}, ale po tych wzrostach nie dokładałbym.`;
    return addTiedPost({ symbol: stock.symbol, author: person.name, botId: person.id, text, kind: 'opinion' });
}

// --- KNF: zakup po poście dla zaufanych ---
/** buyStock: gracz czytał post dla zaufanych o tej spółce, a plan jest prawdziwy. */
function noteTiedTip(stock) {
    if (!playerProfile || !stock.plannedMove?.real) return;
    const seen = getTiedPosts().some(post => post.symbol === stock.symbol && post.audience === 'trusted' && post.kind === 'hint' && macro.quarter - post.q <= 1 && canSeeTiedPost(post));
    if (!seen) return;
    const tied = ensureTiedState();
    tied.tips ||= [];
    if (!tied.tips.some(tip => tip.symbol === stock.symbol)) tied.tips.push({ symbol: stock.symbol, q: macro.quarter });
}
/** Zapowiedź się sprawdziła: szansa wykrycia, pierwsze wykrycie to ostrzeżenie, kolejne kara. */
function resolveTiedTips(stock) {
    const tied = playerProfile?.tied;
    if (!tied?.tips?.length) return;
    const hit = tied.tips.some(tip => tip.symbol === stock.symbol);
    tied.tips = tied.tips.filter(tip => tip.symbol !== stock.symbol);
    if (!hit || Math.random() >= COMPANY_PLAN_RULES.tipChance) return;
    tied.knfHits = (tied.knfHits || 0) + 1;
    if (tied.knfHits === 1) {
        addMail({ sender: 'KNF', subject: `Zapytanie w sprawie transakcji na akcjach ${stock.name}`, body: `Kupiłeś akcje ${stock.name} tuż przed decyzją zarządu, o której spółka wcześniej nie informowała publicznie. Tym razem kończy się na ostrzeżeniu. Przy kolejnym wykryciu nałożymy karę.`, importance: 3, symbol: stock.symbol });
        return;
    }
    const fine = Math.max(0, playerCash) * COMPANY_PLAN_RULES.fineShare;
    playerCash -= fine; governmentTreasury += fine;
    if (typeof recordPayment === 'function') recordPayment('player-fund', 'external:knf', fine, `Kara KNF: ${stock.name}`);
    addMail({ sender: 'KNF', subject: `Kara za transakcje na akcjach ${stock.name}`, body: `Ponownie stwierdziliśmy zakup akcji tuż przed decyzją zarządu, którą znałeś z zamkniętego kręgu. Kara: pięć procent gotówki funduszu, czyli ${formatZl(fine, 0)}.`, importance: 3, symbol: stock.symbol });
}

// =================================================================================
// 0.17.3 R3: wiceprezesi (stock.deputies). Od giełdy Złotej i progu kapitalizacji, 1–3 w spółce.
// =================================================================================
const DEPUTY_RULES = { minLevel: 3, termQuarters: [12, 24], promoteChance: 0.7, heirChance: 0.9, leaveChance: 0.15, successorDelay: [1, 2], capTiers: [1, 2.5] };
// Cecha działa przez parametr gry (patrz wywołania getDeputyFactor i hasDeputyTrait); w karcie spółki się nie pokazuje.
const DEPUTY_TRAITS = {
    gadula: { name: 'Gaduła', posts: 2 }, milczek: { name: 'Milczek', posts: 0.5 }, plotkarz: { name: 'Plotkarz' }, towarzyski: { name: 'Towarzyski' }, rzecznik: { name: 'Rzecznik' },
    skarbnik: { name: 'Skarbnik', volatility: 0.98 }, inzynier: { name: 'Inżynier', research: 1.05 }, sprzedawca: { name: 'Sprzedawca', revenue: 1.005 }, kontroler: { name: 'Kontroler', costs: 0.995 },
    prawnik: { name: 'Prawnik', resistance: 0.95 }, kadrowy: { name: 'Kadrowy', union: 0.8 }, nastepca: { name: 'Następca', heir: true }, aspirant: { name: 'Aspirant', heir: true },
    lojalny: { name: 'Lojalny' }, wyga: { name: 'Stary wyga' }
};
const getDeputies = stock => stock?.deputies || [];
const hasDeputyTrait = (stock, id) => getDeputies(stock).some(deputy => deputy.trait === id);
/** Iloczyn efektu cech wiceprezesów spółki (1, gdy ich nie ma). */
function getDeputyFactor(stock, field) {
    let factor = 1;
    for (const deputy of getDeputies(stock)) factor *= DEPUTY_TRAITS[deputy.trait]?.[field] ?? 1;
    return factor;
}

function getDeputyCapThreshold() {
    const caps = stocks.filter(s => s.exchange === 'GOLD' && !s.isBankrupt && !s.assetType).map(getMarketCapValue).sort((a, b) => a - b);
    return caps.length ? caps[caps.length >> 1] : Infinity;
}
function getDeputyTarget(stock, threshold) {
    if ((exchanges[stock.exchange]?.level ?? 0) < DEPUTY_RULES.minLevel || stock.assetType || stock.isBankrupt) return 0;
    const cap = getMarketCapValue(stock);
    if (!(cap >= threshold)) return 0;
    const tier = 1 + DEPUTY_RULES.capTiers.filter(mult => cap >= threshold * mult * 2).length; // rośnie z kapitalizacją
    return Math.min(3, tier + (descriptionHash(`dep:${stock.symbol}`) % 2 ? 0 : tier > 1 ? 0 : 1));
}
function createDeputy(stock) {
    const candidate = generateCeoCandidate(stock);
    const deputy = { id: candidate.id, name: candidate.name, age: candidate.age, trait: getRandomElement(Object.keys(DEPUTY_TRAITS)), traits: (candidate.traits || []).slice(0, 1), hiredQ: macro.quarter, untilQ: macro.quarter + getRandomIntInRange(...DEPUTY_RULES.termQuarters) };
    (stock.deputies ||= []).push(deputy);
    noteTiedStaffChange(stock, null, deputy, 'wiceprezes');
    return deputy;
}
function removeDeputy(stock, deputy, announce = true) {
    stock.deputies = getDeputies(stock).filter(item => item !== deputy);
    if (!stock.deputies.length) delete stock.deputies;
    if (announce) noteTiedStaffChange(stock, deputy, null, 'wiceprezes');
}
/** Co kwartał: koniec kadencji, nowi (najwyżej 1 na spółkę na kwartał). Spółka pod progiem nie dostaje nowych, obecni zostają do końca kadencji. */
function processDeputiesQuarterly() {
    const threshold = getDeputyCapThreshold(), quarter = macro.quarter;
    for (const stock of stocks) {
        for (const deputy of [...getDeputies(stock)]) if (deputy.untilQ <= quarter && deputy.trait !== 'lojalny') removeDeputy(stock, deputy);
        if (getDeputies(stock).length < getDeputyTarget(stock, threshold) && quarter >= (stock.deputyWaitQ ?? 0)) createDeputy(stock);
    }
}

/** Następca przy replaceCeo bez kandydata: wiceprezes albo null (wtedy nowa osoba z zewnątrz). */
function pickDeputySuccessor(stock) {
    const list = getDeputies(stock);
    if (!list.length) return null;
    const heirs = list.filter(deputy => DEPUTY_TRAITS[deputy.trait]?.heir);
    if (Math.random() >= (heirs.length ? DEPUTY_RULES.heirChance : DEPUTY_RULES.promoteChance)) return null;
    return getRandomElement(heirs.length ? heirs : list);
}
/** Awans: relacja zostaje przy id, cecha wiceprezesa to już tylko historia, prezes dostaje zwykły zestaw z zachowaniem cechy z ceoTraits. */
function promoteDeputy(stock, deputy) {
    removeDeputy(stock, deputy, false);
    const kept = deputy.traits || [], ceo = { id: deputy.id, name: deputy.name, age: deputy.age, traits: [] };
    assignCeoTraits(ceo);
    ceo.traits = [...kept, ...ceo.traits.filter(trait => !kept.some(old => old.id === trait.id))];
    ceo.formerDeputyTrait = deputy.trait;
    if (deputy.trait === 'wyga') ceo.keepTenure = Math.max(0, macro.quarter - deputy.hiredQ);
    stock.deputyWaitQ = macro.quarter + getRandomIntInRange(...DEPUTY_RULES.successorDelay);
    return ceo;
}
/** Po zmianie prezesa: pominięty aspirant odchodzi, reszta odchodzi z małą szansą; lojalny zostaje. */
function settleDeputiesAfterCeoChange(stock) {
    for (const deputy of [...getDeputies(stock)]) {
        if (deputy.trait === 'aspirant' || (deputy.trait !== 'lojalny' && Math.random() < DEPUTY_RULES.leaveChance)) removeDeputy(stock, deputy);
    }
}

// =================================================================================
// 0.17.3 R4: rozmowy, posty gracza, VIP w Tied
// =================================================================================
// Wynik liczy się bez losowania: charakter × ton, nastawienie rozmówcy w tym kwartale (hash), powtórzony ton traci, relacja.
// Parametry z symulacji: gracz czytający charakter ok. 64% sukcesu, losowy ok. 25%.
const TALK_RULES = { turns: [2, 3], options: [3, 4], repeatLoss: 1, likedBonus: 1, dislikedLoss: 4, successAt: 0.5, friendBonus: 0.25, hostileLoss: 0.25, moodStep: 3, quickGain: 2, minStake: 0.05 };
const TALK_TONES = {
    numbers: { label: 'Liczby', texts: ['Jaki poziom marży uznajesz za bezpieczny?', 'Które koszty rosną najszybciej?', 'Ile zarabiacie na najmniejszym kliencie?'] },
    vision: { label: 'Wizja', texts: ['Gdzie widzisz spółkę za trzy lata?', 'Co może zmienić całą branżę?', 'W co warto dziś wejść, zanim zrobią to inni?'] },
    safety: { label: 'Bezpieczeństwo', texts: ['Co najbardziej zagraża wynikom?', 'Jak jesteście przygotowani na gorszy rok?', 'Ile gotówki trzymacie na czarną godzinę?'] },
    relation: { label: 'Relacja', texts: ['Doceniam ten czas na rozmowę.', 'Dobrze się z Tobą rozmawia.', 'Cenię to, co robisz w tej firmie.'] },
    pressure: { label: 'Presja', texts: ['Akcjonariusze oczekują więcej.', 'Rynek traci cierpliwość.', 'Wyniki muszą się poprawić, i to szybko.'] }
};
const TALK_OPENERS = ['Dzień dobry. Co Cię do mnie sprowadza?', 'Mam chwilę. O czym chcesz porozmawiać?', 'Słucham. Co sądzisz o ostatnim kwartale?'];
const TALK_REQUESTS = { dividend: { label: 'Dywidenda', text: 'Czy spółka rozważy wyższą wypłatę?' }, buyback: { label: 'Skup akcji', text: 'Czy spółka rozważy skup akcji?' }, strategy: { label: 'Strategia', text: 'Czy zarząd rozważy nowy kierunek?' } };
const TIED_PLAYER_POSTS = { good: 'Fundusz zakończył kwartał powyżej indeksu.', hard: 'Trudny kwartał, trzymamy się strategii.', brag: 'Najlepszy fundusz na rynku!' };

/** Czy można rozmawiać: 'full', 'quick' albo null. Jedyne miejsce z tym warunkiem (decyzja użytkownika może go zmienić): pełna rozmowa z kontaktem, u autora widocznego posta bez kontaktu tylko szybka. */
function getTiedTalkAccess(key) {
    const person = getTiedPerson(key);
    if (!person || person.kind === 'colleague') return null;
    if (isTiedContact(key)) return 'full';
    return getTiedPosts().some(post => tiedPostKey(post) === key && post.kind !== 'hr' && canSeeTiedPost(post)) ? 'quick' : null;
}
const isTiedContact = key => getTiedContacts().some(person => person.key === key);
const hasTalkedThisQuarter = key => ensureTiedState().talked?.[key] === macro.quarter;

/** Nastawienie rozmówcy w tym kwartale: stałe, gracz odczytuje je z odpowiedzi. */
function getTalkBias(key) {
    const tones = Object.keys(TALK_TONES), liked = descriptionHash(`${key}:${macro.quarter}:up`) % tones.length;
    return { liked: tones[liked], disliked: tones[(liked + 1 + descriptionHash(`${key}:${macro.quarter}:down`) % (tones.length - 1)) % tones.length] };
}
function getTalkToneValue(key, tone, used = {}) {
    const bias = getTalkBias(key);
    return getPersonCharacterData(key).tones[tone] - TALK_RULES.repeatLoss * (used[tone] || 0) + (tone === bias.liked ? TALK_RULES.likedBonus : 0) - (tone === bias.disliked ? TALK_RULES.dislikedLoss : 0);
}
/** Wynik rozmowy z listy tonów: nastrój −2…+2, zmiana relacji −6…+6, sukces. */
function resolveTalk(key, choices) {
    const used = {};
    let sum = 0;
    for (const tone of choices) { sum += getTalkToneValue(key, tone, used); used[tone] = (used[tone] || 0) + 1; }
    const relation = getRelation(key), bonus = relation >= TIED_RULES.friendAt ? TALK_RULES.friendBonus : relation < 0 ? -TALK_RULES.hostileLoss : 0;
    const score = sum / Math.max(1, choices.length) + bonus, mood = Math.max(-2, Math.min(2, Math.round(score)));
    return { mood, delta: mood * TALK_RULES.moodStep, success: score >= TALK_RULES.successAt };
}
function getTalkOptions() {
    const tones = Object.keys(TALK_TONES).sort(() => Math.random() - 0.5).slice(0, getRandomIntInRange(...TALK_RULES.options));
    return tones.map(tone => ({ tone, text: getRandomElement(TALK_TONES[tone].texts) }));
}
function startTiedTalk(key) {
    if (getTiedTalkAccess(key) !== 'full' || hasTalkedThisQuarter(key)) return false;
    tiedView.talk = { key, turn: 1, turns: getRandomIntInRange(...TALK_RULES.turns), choices: [], log: [{ text: getRandomElement(TALK_OPENERS) }], options: getTalkOptions(), request: null, result: null };
    return true;
}
function markTalked(key) { const tied = ensureTiedState(); (tied.talked ||= {})[key] = macro.quarter; }

/** Szybka rozmowa: bez minigry, najwyżej +2, także bez kontaktu. */
function quickTiedTalk(key) {
    if (!getTiedTalkAccess(key) || hasTalkedThisQuarter(key)) return false;
    const best = Math.max(...Object.values(getPersonCharacterData(key).tones));
    const gain = Math.min(TALK_RULES.quickGain, getTalkToneValue(key, 'relation') >= best - 1 ? 2 : 1);
    markTalked(key);
    changeRelation(key, gain, 'szybka rozmowa w Tied');
    return gain;
}
function getTalkStake(stock) { return stock ? (getFundStakePct(stock) || 0) : 0; }
/** Prośba do zarządu przy sukcesie: zwykły plan spółki. Udział ≥ 5%, tylko u prezesa albo wiceprezesa. */
function executeTalkRequest(stock, request) {
    if (request === 'dividend') {
        const index = DIVIDEND_POLICY_ORDER.indexOf(normalizeDividendPolicy(stock.dividendPolicy));
        return index < 2 && planCompanyMove(stock, 'dividend', { policy: DIVIDEND_POLICY_ORDER[index + 1] });
    }
    if (request === 'buyback') return planCompanyMove(stock, 'buyback', { manual: true });
    const proposal = canStartExpansion(stock) ? { type: 'expand', target: pickExpansionSector(stock) } : null;
    return Boolean(proposal?.target) && planCompanyMove(stock, 'strategy', { proposal });
}
function chooseTalkOption(index, request = null) {
    const talk = tiedView.talk;
    if (!talk || talk.result) return null;
    const option = request ? { tone: 'pressure', text: TALK_REQUESTS[request].text } : talk.options[index];
    if (!option) return null;
    const used = {};
    for (const tone of talk.choices) used[tone] = (used[tone] || 0) + 1;
    const value = getTalkToneValue(talk.key, option.tone, used), reply = getPersonCharacterData(talk.key).reply;
    talk.choices.push(option.tone);
    if (request) talk.request = request;
    talk.log.push({ me: true, text: option.text }, { text: value >= 1 ? reply.good : value < 0 ? reply.bad : reply.neutral });
    if (talk.turn < talk.turns) { talk.turn++; talk.options = getTalkOptions(); return talk; }
    finishTiedTalk(talk);
    return talk;
}
function finishTiedTalk(talk) {
    const result = resolveTalk(talk.key, talk.choices);
    markTalked(talk.key);
    if (talk.key.startsWith('vip:')) { settleVipTalk(talk.key, result); talk.result = result; return; }
    changeRelation(talk.key, result.delta, 'rozmowa w Tied');
    const stock = getTiedPerson(talk.key)?.stock;
    if (talk.request && stock) result.requested = result.success && executeTalkRequest(stock, talk.request);
    talk.result = result;
}

// --- VIP ---
function getVipOffers() { return (playerFund?.vip?.offers || []).filter(offer => offer.expiresQ > macro.quarter); }
function startVipTalk(offerId) {
    const offer = getVipOffers().find(item => item.id === offerId);
    if (!offer) return false;
    const key = `vip:${offer.id}`;
    tiedView.talk = { key, name: offer.name, turn: 1, turns: 3, choices: [], log: [{ text: 'Rozważam wpłatę do Twojego funduszu. Przekonaj mnie.' }], options: getTalkOptions(), request: null, result: null };
    return true;
}
/** Rozmowa rozstrzyga o wpłacie; skutki bez zmian (5–15% NAV, lock-up, wyjście przy słabym wyniku). */
function settleVipTalk(key, result) {
    const offer = getVipOffers().find(item => `vip:${item.id}` === key);
    if (!offer) return;
    settleVipOffer(offer, result.success);
    const tied = ensureTiedState();
    (tied.vips ||= []).push({ id: offer.id, name: offer.name, won: result.success });
}
function declineVipOffer(offerId) {
    const vip = playerFund?.vip;
    if (vip) vip.offers = vip.offers.filter(offer => offer.id !== offerId);
}

// --- Wpis gracza ---
function canPublishTiedPost() { return ensureTiedState().postQ !== macro.quarter; }
function publishTiedPlayerPost(id) {
    if (!TIED_PLAYER_POSTS[id] || !canPublishTiedPost()) return false;
    ensureTiedState().postQ = macro.quarter;
    addTiedPost({ kind: 'player', author: playerProfile.name, text: TIED_PLAYER_POSTS[id], symbol: null });
    const period = playerFund?.periods?.at(-1);
    if (!period) return true;
    const beat = period.fundReturn >= period.benchmarkReturn;
    const change = (id === 'hard' ? !beat : beat) ? 1 : id === 'hard' ? 0 : -2; // zgodny z wynikiem +1, chwałba przy słabym wyniku −2
    playerFund.trust = Math.max(0, Math.min(100, playerFund.trust + change));
    return true;
}

// --- Relacja z prezesem a spółka (R0: premia i spadki) ---
const CEO_RELATION_RULES = { bonusAt: 40, bonusCap: 30, bigSale: 0.01, bigSaleLoss: 5, voteLoss: 8, dismissalLoss: 20 };
/** Co kwartał: dobra relacja z prezesem daje +1 do reputacji w spółce, do +30 z tego źródła. */
function processCeoRelationBonus() {
    if (!playerProfile) return;
    const gained = ensureTiedState().repGain ||= {};
    for (const stock of stocks) {
        if (!stock.ceo?.id || getRelation(ceoKey(stock.ceo.id)) < CEO_RELATION_RULES.bonusAt || (gained[stock.symbol] || 0) >= CEO_RELATION_RULES.bonusCap) continue;
        const before = stock.reputation?.player;
        changeReputation('player', stock.symbol, 1);
        if (stock.reputation?.player !== before) gained[stock.symbol] = (gained[stock.symbol] || 0) + 1;
    }
}
function noteCeoRelationLoss(stock, loss, reason) {
    if (stock?.ceo?.id) changeRelation(ceoKey(stock.ceo.id), -loss, reason);
}

// =================================================================================
// 0.17.3 R5: obietnice botów. Bot płaci z własnej gotówki i kupuje jednostki po NAV, bez sprzedaży po innej cenie.
// =================================================================================
const PROMISE_RULES = { relationAt: 20, maxActive: 3, offerChance: 0.15, amountShare: [0.01, 0.03], cashShare: 0.25, term: [2, 3], lockYears: 1, reward: 5, failLoss: 10, resignLoss: 5, keepClosed: 8 };
const heldSymbols = () => Object.keys(playerPortfolio || {}).filter(symbol => playerPortfolio[symbol]?.shares > 0);
const stockOf = symbol => stocks.find(s => s.symbol === symbol);
const portfolioShareOf = value => { const total = getFundPortfolioValue(); return total > 0 ? value / total : 0; };
const lastPeriodBeat = () => { const p = playerFund?.periods?.at(-1); return Boolean(p) && p.fundReturn >= p.benchmarkReturn; };
const shortMargins = () => (typeof getMarginPositions === 'function' ? getMarginPositions() : []).filter(p => p.side < 0);

// Każdy cel: make(ai) daje parametry albo null, gdy nie ma sensu; state(goal) daje { done, failed?, value?, max? }; end: liczy się dopiero na koniec terminu.
const PROMISE_GOALS = {
    buyShares: { make: ai => { const symbol = getRandomElement(Object.keys(ai.portfolio || {}).filter(s => stockOf(s) && !stockOf(s).assetType && canAccessExchange(stockOf(s).exchange, stockOf(s)))); if (!symbol) return null; const stock = stockOf(symbol); const shares = Math.max(10, Math.floor(getFundAssets() * 0.02 / stock.price)); return { symbol, shares, base: playerPortfolio?.[symbol]?.shares || 0 }; },
        text: g => `Kup min. ${formatNumberPl(g.shares, 0)} akcji ${stockOf(g.symbol)?.name || g.symbol}.`, state: g => { const value = Math.max(0, (playerPortfolio?.[g.symbol]?.shares || 0) - g.base); return { done: value >= g.shares, value, max: g.shares, unit: 'akcji' }; } },
    sellHolding: { make: () => { const symbol = getRandomElement(heldSymbols()); return symbol ? { symbol } : null; }, text: g => `Sprzedaj akcje ${stockOf(g.symbol)?.name || g.symbol}.`, state: g => ({ done: !(playerPortfolio?.[g.symbol]?.shares > 0) }) },
    sectorShare: { make: ai => { const stock = stockOf(getRandomElement(Object.keys(ai.portfolio || {}))); const sector = stock && getMainSector(stock); return sector ? { sector } : null; }, text: g => `Ustaw sektor ${g.sector} na min. 10% wartości portfela.`,
        state: g => ({ done: portfolioShareOf(heldSymbols().filter(s => stockOf(s) && getMainSector(stockOf(s)) === g.sector).reduce((sum, s) => sum + getHoldingMarketValue(s, playerPortfolio[s]), 0)) >= 0.1 }) },
    holdShares: { end: true, make: () => { const symbol = getRandomElement(heldSymbols()); return symbol ? { symbol, base: playerPortfolio[symbol].shares } : null; }, text: g => `Utrzymaj akcje ${stockOf(g.symbol)?.name || g.symbol} do terminu, nie sprzedawaj.`, state: g => { const kept = (playerPortfolio?.[g.symbol]?.shares || 0) >= g.base; return { done: kept, failed: !kept }; } },
    maxPosition: { make: () => heldSymbols().some(s => portfolioShareOf(getHoldingMarketValue(s, playerPortfolio[s])) >= 0.25) ? {} : null, text: () => 'Zejdź z największą pozycją poniżej 25% portfela.', state: () => ({ done: heldSymbols().every(s => portfolioShareOf(getHoldingMarketValue(s, playerPortfolio[s])) < 0.25) }) },
    cashShare: { end: true, make: () => ({}), text: () => 'Utrzymaj gotówkę funduszu na poziomie min. 10% do terminu.', state: () => ({ done: playerCash >= getFundAssets() * 0.1 }) },
    closeShorts: { make: () => shortMargins().length ? {} : null, text: () => 'Zamknij wszystkie pozycje krótkie.', state: () => ({ done: !shortMargins().length }) },
    noDebt: { make: () => (playerFund?.liquidityLoan?.principal > 0 || getMarginPositions().length) ? {} : null, text: () => 'Spłać kredyt i zejdź z dźwignią do zera.', state: () => ({ done: !(playerFund?.liquidityLoan?.principal > 0) && !getMarginPositions().length }) },
    beatGig: { end: true, make: () => ({}), text: () => 'Pokonaj GIG w ostatnim kwartale przed terminem.', state: () => ({ done: lastPeriodBeat() }) },
    agmVote: { make: () => { const stock = stocks.find(s => s.governance?.pendingAgm?.items?.length && canFundControlAgm(s)); if (!stock) return null; const item = getRandomElement(stock.governance.pendingAgm.items); return { symbol: stock.symbol, item: item.id, label: item.label, vote: Math.random() < 0.5 ? 'for' : 'against' }; },
        text: g => `Zagłosuj ${g.vote === 'for' ? 'za' : 'przeciw'}: ${g.label} (${stockOf(g.symbol)?.name || g.symbol}).`, state: g => { const item = stockOf(g.symbol)?.governance?.pendingAgm?.items?.find(i => i.id === g.item); return { done: item?.playerVote === g.vote }; } },
    safeShare: { make: () => ({}), text: () => 'Miej min. 10% aktywów w obligacjach lub funduszach towarowych.', state: () => { const assets = getFundAssets(); return { done: assets > 0 && (getFundBondsValue() + (typeof getFundCommodityValue === 'function' ? getFundCommodityValue() : 0)) / assets >= 0.1 }; } }
};

function ensurePromises() {
    const tied = ensureTiedState();
    tied.promiseOffers ||= []; tied.promises ||= []; tied.promiseNext ||= 1;
    return tied;
}
const getActivePromises = () => ensurePromises().promises.filter(promise => promise.status === 'live');
const getPromiseBot = promise => aiCompetitors.find(ai => ai.id === promise.bot) || null;

/** Co kwartał: bot z dobrą relacją proponuje umowę. Manipulator częściej, zwłaszcza przed własną sprzedażą. */
function maybeOfferPromises() {
    if (!playerFund) return;
    const tied = ensurePromises();
    for (const person of getRelationPeople().filter(item => item.kind === 'investor' && getRelation(item.id) >= PROMISE_RULES.relationAt)) {
        if (getActivePromises().length + tied.promiseOffers.length >= PROMISE_RULES.maxActive) return;
        if (tied.promiseOffers.some(offer => offer.bot === person.id) || getActivePromises().some(promise => promise.bot === person.id)) continue;
        const pushy = getPersonCharacter(person.id) === 'manipulator' ? (person.entity.tiedPump ? 3 : 2) : 1;
        if (Math.random() < PROMISE_RULES.offerChance * pushy) createPromiseOffer(person.entity);
    }
}
function createPromiseOffer(ai) {
    const tied = ensurePromises(), types = Object.keys(PROMISE_GOALS).sort(() => Math.random() - 0.5);
    for (const type of types) {
        const goal = PROMISE_GOALS[type].make(ai);
        if (!goal) continue;
        const amount = Math.floor(Math.min(getFundAssets() * getRandomInRange(...PROMISE_RULES.amountShare), (Number(ai.cash) || 0) * PROMISE_RULES.cashShare));
        if (!(amount >= 100)) return null;
        const offer = { id: tied.promiseNext++, bot: ai.id, name: ai.name, type, goal, amount, dueQ: macro.quarter + getRandomIntInRange(...PROMISE_RULES.term), offerQ: macro.quarter };
        tied.promiseOffers.push(offer);
        return offer;
    }
    return null;
}
function acceptPromiseOffer(id) {
    const tied = ensurePromises(), offer = tied.promiseOffers.find(item => item.id === id);
    if (!offer || getActivePromises().length >= PROMISE_RULES.maxActive) return false;
    tied.promiseOffers = tied.promiseOffers.filter(item => item !== offer);
    tied.promises.unshift({ ...offer, status: 'live' });
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('obietniceInwestorow');
    return true;
}
function refusePromiseOffer(id) { const tied = ensurePromises(); tied.promiseOffers = tied.promiseOffers.filter(item => item.id !== id); }

/** Spełnienie: bot kupuje po NAV tyle, na ile go stać; pieniądze przechodzą z jego gotówki do funduszu. */
function fulfillPromise(promise) {
    const ai = getPromiseBot(promise), paid = Math.floor(Math.min(promise.amount, Math.max(0, Number(ai?.cash) || 0)));
    promise.status = 'done'; promise.paid = paid;
    if (ai) changeRelation(ai.id, PROMISE_RULES.reward, 'spełniona obietnica');
    if (!(paid > 0)) return 0;
    const nav = getFundNav();
    ai.cash -= paid;
    const client = addFundClient('rich', 0, nav);
    client.name = promise.name; client.botId = ai.id;
    const units = subscribeClient(client, paid); // bez kosztu kampanii, więc NAV się nie zmienia
    addTranche(client, units, nav, { lockYears: PROMISE_RULES.lockYears });
    return paid;
}
function closePromise(promise, status, loss, reason) {
    promise.status = status;
    if (getPromiseBot(promise)) changeRelation(promise.bot, -loss, reason);
}
function resignPromise(id) {
    const promise = getActivePromises().find(item => item.id === id);
    if (!promise) return false;
    closePromise(promise, 'resigned', PROMISE_RULES.resignLoss, 'rezygnacja z umowy');
    return true;
}
/** Po transakcji i przy zmianie kwartału. */
function checkPromises(atQuarterEnd = false) {
    if (!playerProfile?.tied?.promises?.length) return;
    for (const promise of getActivePromises()) {
        const def = PROMISE_GOALS[promise.type], state = def.state(promise.goal), due = macro.quarter >= promise.dueQ;
        if (state.failed) closePromise(promise, 'failed', PROMISE_RULES.failLoss, 'niespełniona obietnica');
        else if (state.done && (!def.end || (due && atQuarterEnd))) fulfillPromise(promise);
        else if (due && atQuarterEnd) closePromise(promise, 'failed', PROMISE_RULES.failLoss, 'niespełniona obietnica');
    }
    const tied = playerProfile.tied, closed = tied.promises.filter(promise => promise.status !== 'live');
    if (closed.length > PROMISE_RULES.keepClosed) tied.promises = tied.promises.filter(promise => promise.status === 'live' || closed.indexOf(promise) < PROMISE_RULES.keepClosed);
}
const onPromiseCheck = () => checkPromises(false);
function processPromisesQuarterly() {
    const tied = ensurePromises();
    tied.promiseOffers = tied.promiseOffers.filter(offer => offer.offerQ === macro.quarter || macro.quarter - offer.offerQ < 2);
    checkPromises(true);
    maybeOfferPromises();
}

function renderTiedPromiseOffers() {
    return ensurePromises().promiseOffers.map(offer => `<div class="tied-offer"><span class="tied-kicker">Obietnica zakupu</span><p>${escapeHtml(offer.name)}: kupię jednostki Twojego funduszu za <strong>${formatZl(offer.amount, 0)}</strong>, jeśli do ${formatQuarterDate(offer.dueQ)} wykonasz cel. ${escapeHtml(PROMISE_GOALS[offer.type].text(offer.goal))}</p>
        <div class="tied-actions"><button class="btn-primary btn-sm" onclick="tiedAcceptPromise(${offer.id})" ${getActivePromises().length >= PROMISE_RULES.maxActive ? 'disabled' : ''}>Przyjmij</button><button class="btn-ghost btn-sm" onclick="tiedRefusePromise(${offer.id})">Odmów</button></div>
        <p class="tied-note">Aktywne obietnice: ${getActivePromises().length} z ${PROMISE_RULES.maxActive}. Trafią do TeamedUP! jako karteczka.</p></div>`).join('');
}
const tiedAcceptPromise = id => { acceptPromiseOffer(id); renderTiedPage(); };
const tiedRefusePromise = id => { refusePromiseOffer(id); renderTiedPage(); };

const PROMISE_STATUS = { live: ['te-chip live', 'zegar', 'W toku'], done: ['te-chip ok', 'ok', 'Spełniona'], failed: ['te-chip', 'zamknij', 'Niespełniona'], resigned: ['te-chip', 'zamknij', 'Rezygnacja'] };
function renderTeamedPromises() {
    const list = ensurePromises().promises;
    if (!list.length) return '<p class="fund-muted">Brak obietnic. Tu trafiają umowy z inwestorami przyjęte w Tied.</p>';
    return `<ul class="te-notes">${list.map(promise => {
        const def = PROMISE_GOALS[promise.type], state = def.state(promise.goal), [chip, icon, label] = PROMISE_STATUS[promise.status];
        const cls = promise.status === 'done' ? ' is-done' : promise.status === 'live' ? '' : ' is-failed';
        const meter = promise.status === 'live' && state.max ? `${renderLimitMeter(Math.min(100, state.value / state.max * 100), NaN, `Wykonano ${state.value} z ${state.max} ${state.unit}`)}<span class="tied-note">${formatNumberPl(state.value, 0)} z ${formatNumberPl(state.max, 0)} ${state.unit}</span>` : '';
        const foot = promise.status === 'live' ? `<span>do ${formatQuarterDate(promise.dueQ)}</span><button class="btn-ghost btn-sm" onclick="resignPromise(${promise.id}); renderTeamedUp()">Zrezygnuj</button>`
            : promise.status === 'done' ? `<span>${promise.paid < promise.amount ? `${escapeHtml(promise.name)} kupił jednostki za ${formatZl(promise.paid, 0)}: tyle miał gotówki.` : `${escapeHtml(promise.name)} kupił jednostki po NAV.`}</span>` : `<span>termin: ${formatQuarterDate(promise.dueQ)}</span>`;
        return `<li class="te-note${cls}"><div class="te-note-top"><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(promise.name))}</span><strong>${escapeHtml(promise.name)}</strong><span class="${chip}">${uiIcon(icon, 12)} ${label}</span></div>
            <span>${escapeHtml(def.text(promise.goal))}</span>${meter}<span class="te-note-amount">${formatZl(promise.amount, 0)}</span><footer>${foot}</footer></li>`;
    }).join('')}</ul>`;
}

// =================================================================================
// 0.17.3 R6: Akademia. Uczy czytania stylu, ale nie mapuje go na liczby.
// =================================================================================
Object.assign(ACADEMY_ENTRIES, {
    jakCzytacTied: {
        title: 'Jak czytać Tied', get icon() { return academyIcon('rynek'); },
        text: 'Nie każdy prezes pisze to samo i nie każdy mówi prawdę równie często. Jeden liczy koszty, drugi dziękuje ludziom, trzeci obiecuje rewolucję w każdym kwartale. Styl zdradza człowieka: ten, kto zawsze pisze superlatywami, rzadziej dotrzymuje słowa niż ten, kto pisze o marży. Posty dla znajomych i zaufanych mówią więcej, ale nigdy nie są pewnikiem, bo plan zarządu może odpaść. Zakup akcji tuż po poufnej wiadomości interesuje też KNF.',
        example: () => `W Tied jest teraz ${getTiedPosts().length} wpisów. Sprawdź, kto z autorów pisze o liczbach, a kto o wizji.`,
        quiz: [
            { q: 'Co najwięcej mówi o wiarygodności autora?', a: ['styl jego wpisów w czasie', 'liczba polubień', 'odznaka przy nazwisku'], c: 0 },
            { q: 'Czy zapowiedź zarządu jest pewna?', a: ['nie, plan może odpaść', 'tak, zawsze', 'tak, gdy pisze ją prezes'], c: 0 },
            { q: 'Co grozi za zakup tuż po poufnym poście?', a: ['kontrola KNF', 'nic', 'zamknięcie konta w Tied'], c: 0 }
        ]
    },
    relacjeKontakty: {
        title: 'Relacje i kontakty', get icon() { return academyIcon('bank'); },
        text: 'Kontaktem zostaje prezes spółki, której akcje kupiłeś, także gdy później je sprzedasz. Polubienia i komentarze budują relację powoli, a rozmowa działa mocniej, ale tylko raz na kwartał. Znajomym zostaje osoba, która przyjmie Twoją prośbę, a to wymaga dobrej relacji. Relacja idzie za człowiekiem: gdy prezes zmienia spółkę, zabiera ją ze sobą, a jego następca zaczyna od zera. Jeśli prosisz zarząd o decyzję, potrzebujesz udziału w spółce.',
        example: () => `Masz ${getTiedContacts().length} kontaktów i ${ensureTiedState().friends.length} znajomych.`,
        quiz: [
            { q: 'Co dzieje się z relacją, gdy prezes odchodzi do innej spółki?', a: ['zostaje przy nim', 'przechodzi na następcę', 'znika'], c: 0 },
            { q: 'Kto może zostać znajomym?', a: ['osoba, która przyjmie prośbę', 'każdy po polubieniu', 'tylko inwestor'], c: 0 },
            { q: 'Co działa mocniej na relację?', a: ['udana rozmowa', 'pojedyncze polubienie', 'obserwowanie'], c: 0 }
        ]
    },
    obietniceInwestorow: {
        title: 'Obietnice inwestorów', get icon() { return academyIcon('moneta'); },
        text: 'Inwestor z dobrą relacją może obiecać zakup jednostek Twojego funduszu, jeśli wykonasz cel. Płaci po NAV, z własnej gotówki, więc obietnica nie zmienia wartości jednostki dla pozostałych klientów. Kiedy nie ma tyle pieniędzy, kupuje mniej. Cel bywa jednak na rękę jemu, na przykład zakup spółki, którą sam trzyma. Zanim się zgodzisz, zapytaj, czy zrobiłbyś to samo bez jego pieniędzy, bo obowiązek wobec klientów masz cały czas.',
        example: () => `Aktywne obietnice: ${getActivePromises().length} z ${PROMISE_RULES.maxActive}.`,
        quiz: [
            { q: 'Po jakiej cenie inwestor kupuje jednostki?', a: ['po NAV', 'z premią', 'z dyskontem'], c: 0 },
            { q: 'Co się dzieje przy niespełnionej obietnicy?', a: ['relacja spada', 'fundusz płaci karę', 'nic'], c: 0 },
            { q: 'Dlaczego warto sprawdzić cel obietnicy?', a: ['może służyć inwestorowi', 'jest zawsze szkodliwy', 'nie ma to znaczenia'], c: 0 }
        ]
    }
});
