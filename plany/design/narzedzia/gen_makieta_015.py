"""Makieta UI 0.15 „Hossa i bessa” z prawdziwymi klasami gry (tokens.css + style.css).

Użycie: python plany/design/narzedzia/gen_makieta_015.py  →  plany/design/makiety/05b_ui_015.html
Każda sekcja to <section class="demo"> — osobna ramka przy imporcie do Figmy.
"""
import math, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[3]
UI = (ROOT / 'ui.js').read_text(encoding='utf-8')
start = UI.index('const UI_ICON_PATHS = {'); end = UI.index('};', start)
ICONS = dict(re.findall(r"^\s+'?([\w-]+)'?: '([^']+)'", UI[start:end], re.M))
sec_start = UI.index('const SECTOR_ICON_PATHS = {'); sec_end = UI.index('};', sec_start)
SECTOR = dict(re.findall(r"^\s+'([^']+)': '([^']+)'", UI[sec_start:sec_end], re.M))


def ic(name, size=16):
    path = ICONS.get(name) or SECTOR.get(name)
    return f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" aria-hidden="true"><path d="{path}"/></svg>'


PHASES = [
    ('accumulation', 'faza-akumulacja', 'Akumulacja', 'Po spadkach ceny są niskie, a nastroje słabe. Cierpliwi inwestorzy po cichu kupują.'),
    ('bull', 'faza-hossa', 'Hossa', 'Rynek rośnie od dłuższego czasu, drożeje coraz więcej spółek. Zwykle najdłuższa faza cyklu.'),
    ('euphoria', 'faza-euforia', 'Euforia', 'Wszyscy kupują, wyceny są wysokie, a ryzyko krachu rośnie. Rzadko trwa długo.'),
    ('distribution', 'faza-dystrybucja', 'Dystrybucja', 'Szczyt za nami: duzi gracze sprzedają, indeks stoi w miejscu albo się chwieje.'),
    ('bear', 'faza-bessa', 'Bessa', 'Ceny spadają o 20% i więcej od szczytu. Strach rośnie, klienci umarzają udziały.'),
    ('capitulation', 'faza-kapitulacja', 'Kapitulacja', 'Panika i wyprzedaż za wszelką cenę — zwykle tuż przed dnem rynku.'),
]
P = {k: (icon, name, desc) for k, icon, name, desc in PHASES}
ZONES = [(0, 20, 'extreme-fear', 'skrajny strach'), (20, 40, 'fear', 'strach'), (40, 60, 'neutral', 'neutralnie'), (60, 80, 'greed', 'chciwość'), (80, 101, 'extreme-greed', 'skrajna chciwość')]


def zone(v):
    for lo, hi, key, word in ZONES:
        if lo <= v < hi:
            return key, word


def phase_badge(key, size=16, label=True):
    icon, name, _ = P[key]
    return f'<span class="market-phase phase--{key}">{ic(icon, size)}{f"<span class=\'phase-name\'>{name}</span>" if label else ""}</span>'


def mood_kpi(phase, value, state='confirmed', clickable=False, compact=False):
    zkey, word = zone(value)
    tag = 'button' if clickable else 'div'
    cls = 'mood-kpi' + (' is-confirming' if state == 'confirming' else '') + (' mood-kpi--compact' if compact else '')
    if state == 'confirming':
        ph = f'<span class="market-phase">{ic("info", 16)}<span class="phase-name">—</span><span class="mood-confirming">potwierdzanie</span></span>'
    else:
        ph = phase_badge(phase)
    attrs = ' type="button" aria-haspopup="dialog" title="Otwórz okno „Rynek”"' if clickable else ''
    return (f'<{tag} class="{cls}"{attrs}><span class="topbar-kpi-label">Nastrój rynku</span>'
            f'<span class="mood-kpi-row">{ph}<span class="mood-value sentiment--{zkey}">{value}</span><span class="sentiment-word sentiment--{zkey}">{word}</span></span>'
            f'<span class="mood-meter" style="--mood:{value}" aria-hidden="true"><i></i></span></{tag}>')


def kpis(extra=''):
    return f'''<div class="topbar-kpi-group">
      <div class="topbar-kpi"><span class="topbar-kpi-label">Gotówka funduszu</span><span class="topbar-kpi-val">14 040,25 PLN</span></div>
      <div class="topbar-kpi"><span class="topbar-kpi-label">NAV / udział</span><span class="topbar-kpi-val">9,9481 PLN</span></div>
      <div class="topbar-kpi"><span class="topbar-kpi-label">Konto prywatne</span><span class="topbar-kpi-val">109,40 PLN</span></div>
      <div class="topbar-kpi"><span class="topbar-kpi-label">Zaufanie klientów</span><span class="topbar-kpi-val">62/100</span></div>
      {extra}
    </div>'''


CONTROLS = f'''<div class="topbar-controls"><span class="topbar-date">Rok 3 · kw. 2</span>
  <div class="speed-segmented"><button class="speed-btn">x1</button><button class="speed-btn">x2</button><button class="speed-btn active">x5</button></div>
  <button class="btn-pause">Pauza</button><button class="icon-btn">{ic("menu", 18)}</button></div>'''


def topbar(extra, width=1188):
    return f'<header class="topbar demo-topbar" style="width:{width}px">{kpis(extra)}{CONTROLS}</header>'


def gauge_svg(value):
    cx, cy, r, w = 112, 124, 92, 18
    parts = []
    colors = ['extreme-fear', 'fear', 'neutral', 'greed', 'extreme-greed']
    for i, key in enumerate(colors):
        a0 = math.pi * (1 - i / 5) - 0.012
        a1 = math.pi * (1 - (i + 1) / 5) + 0.012
        x0, y0 = cx + r * math.cos(a0), cy - r * math.sin(a0)
        x1, y1 = cx + r * math.cos(a1), cy - r * math.sin(a1)
        parts.append(f'<path d="M{x0:.1f} {y0:.1f} A{r} {r} 0 0 1 {x1:.1f} {y1:.1f}" style="stroke:var(--color-sentiment-{key});stroke-width:{w};fill:none"/>')
    # etykiety wewnątrz viewBox (Figma przycina SVG do jego obszaru): 0 i 100 pod końcami łuku, 50 nad szczytem
    for x, y, lbl in [(cx - r, cy + 24, '0'), (cx, cy - r - 16, '50'), (cx + r, cy + 24, '100')]:
        parts.append(f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" style="fill:var(--color-text-muted);font:11px var(--font-family-mono)">{lbl}</text>')
    a = math.pi * (1 - value / 100)
    nx, ny = cx + (r - 26) * math.cos(a), cy - (r - 26) * math.sin(a)
    parts.append(f'<line x1="{cx}" y1="{cy}" x2="{nx:.1f}" y2="{ny:.1f}" style="stroke:var(--color-text-primary);stroke-width:3;stroke-linecap:round"/>')
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="6" style="fill:var(--color-text-primary)"/>')
    return f'<svg viewBox="0 0 224 152" role="img" aria-label="Wskaźnik strachu i chciwości: {value}">{"".join(parts)}</svg>'


def spark(seed, n=20, up=True):
    pts = []
    v = 50
    for i in range(n):
        v += math.sin(i * 0.9 + seed) * 6 + (1.2 if up else -1.2)
        pts.append(v)
    lo, hi = min(pts), max(pts)
    d = ' '.join(f'{"M" if i == 0 else "L"}{i * 100 / (n - 1):.1f} {30 - (p - lo) / (hi - lo + 1e-9) * 26 - 2:.1f}' for i, p in enumerate(pts))
    return f'<svg class="sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><path d="{d}"/></svg>'


def gig_chart():
    W, H = 1050, 200
    bands = [('bear', 0, 100), ('capitulation', 100, 135), ('accumulation', 135, 300), ('bull', 300, 770), ('euphoria', 770, 880), ('distribution', 880, 965), ('bull', 965, 1050)]
    out = []
    for j, (key, x0, x1) in enumerate(bands):
        out.append(f'<g class="phase--{key}"><rect class="phase-band" x="{x0}" y="0" width="{x1 - x0}" height="{H}"/>'
                   f'<line x1="{x0}" y1="0" x2="{x0}" y2="{H}" style="stroke:var(--phase-color);stroke-opacity:.5"/>'
                   f'<text class="phase-band-label" x="{x0 + 6}" y="{16 if j % 2 == 0 else 32}">{P[key][1]}</text></g>')
    pts, v = [], 60
    for i in range(0, W + 1, 10):
        if i < 135: v += 5
        elif i < 300: v -= 1.2
        elif i < 770: v -= 1.1
        elif i < 880: v -= 2.4
        elif i < 965: v += 2.2
        else: v -= 1.0
        v += math.sin(i / 23) * 3
        pts.append((i, max(24, min(H - 10, v))))
    d = ' '.join(f'{"M" if j == 0 else "L"}{x} {y:.1f}' for j, (x, y) in enumerate(pts))
    out.append(f'<path d="{d}" style="fill:none;stroke:var(--color-chart-index);stroke-width:2"/>')
    out.append(f'<text x="{W - 6}" y="{H - 8}" text-anchor="end" style="fill:var(--color-text-muted);font:11px var(--font-family-mono)">GIG · 6 lat</text>')
    return f'<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" role="img" aria-label="Wykres GIG z tłem potwierdzonych faz">{"".join(out)}</svg>'


def section(title, sub, body, width=1180):
    return f'<section class="demo" style="width:{width}px"><h2 class="demo-title">{title}</h2><p class="demo-sub">{sub}</p>{body}</section>'


out = []
# 1. KPI nastroju — stany
states = f'''
<div class="demo-row"><span class="demo-label">Bez L4 — elementu nie ma (stary „marketTrend” znika)</span>{topbar('')}</div>
<div class="demo-row"><span class="demo-label">L4 — potwierdzona faza i wskaźnik (dymek po najechaniu/fokusie)</span>{topbar(mood_kpi('bull', 62))}</div>
<div class="demo-row"><span class="demo-label">L5 — to samo jako przycisk (otwiera okno „Rynek”)</span>{topbar(mood_kpi('bull', 62, clickable=True))}</div>
<div class="demo-row"><span class="demo-label">Faza w trakcie potwierdzania (start gry / po zakończeniu fazy) — bez zdradzania ukrytej fazy</span>{topbar(mood_kpi('bull', 47, state='confirming'))}</div>'''
out.append(section('1. KPI nastroju rynku w górnym pasku', 'Faza + pasek 5 stref (decyzja użytkownika). Kolor nigdy sam: ikona + nazwa fazy, liczba + słowo strefy, znacznik na pasku. Szerokość paska jak w grze przy 1440 px (1188 px); z KPI nastroju data gry przenosi się do dymka.', states, width=1240))
zones = ''.join(f'<div class="demo-cell">{mood_kpi(ph, v)}</div>' for ph, v in [('capitulation', 12), ('bear', 31), ('accumulation', 50), ('bull', 68), ('euphoria', 88)])
phases = ''.join(f'''<div class="demo-cell tooltip-demo">{phase_badge(k)}<div class="tooltip" style="position:static;margin-top:8px"><strong>{P[k][1]}</strong>{P[k][2]}<br><span style="color:var(--color-text-muted)">Potwierdzona 2 kw. temu · fazy potwierdzamy z opóźnieniem, jak na prawdziwym rynku.</span></div></div>''' for k, *_ in PHASES)
out.append(section('1b. Pięć stref wskaźnika i sześć faz z dymkiem', 'Strefy: &lt;20 skrajny strach, 20–40 strach, 40–60 neutralnie, 60–80 chciwość, &gt;80 skrajna chciwość.',
                   f'<div class="demo-grid5">{zones}</div><div class="demo-grid3" style="margin-top:16px">{phases}</div>'))
mobile = f'''<header class="topbar demo-topbar demo-mobile" style="width:390px">
  <button class="mobile-nav-toggle icon-btn" style="display:inline-flex">{ic("menu", 18)}</button>
  {kpis(mood_kpi('bull', 62, compact=True))}
  <div class="topbar-controls" style="width:100%;margin-left:0"><div class="speed-segmented" style="flex:1"><button class="speed-btn" style="flex:1">x1</button><button class="speed-btn" style="flex:1">x2</button><button class="speed-btn active" style="flex:1">x5</button></div><button class="btn-pause" style="flex:1">Pauza</button><button class="icon-btn">{ic("menu", 18)}</button></div></header>'''
out.append(section('1c. Wersja mobilna (≤ 860 px)', 'Ikona fazy i liczba; nazwa fazy i słowo strefy w dymku po dotknięciu (aria-label pełny).', mobile, width=430))

# 2. Okno „Rynek”
ticker = ''.join(f'<div class="bank-ticker-item"><span>{l}</span><strong>{v}</strong>{f"<small class=\'text-muted\'>{s}</small>" if s else ""}</div>' for l, v, s in [
    ('Faza', phase_badge('bull'), 'potwierdzona 2 kw. temu'), ('Wskaźnik', '<span class="sentiment-word sentiment--greed">62 · chciwość</span>', 'tydz. 24'),
    ('C/Z rynku', '14,2', 'mediana 5 lat 12,8 · +11%'), ('Premia za ryzyko akcji', '+1,8 pp', 'zysk/cena − lokata'), ('Obsunięcie GIG', '−4,2%', 'od szczytu')])
cards = ''.join(f'<div class="sentiment-card sentiment--{zone(v)[0]}"><span class="label">{l}</span><span class="value">{v} <span class="sentiment-word" style="font-family:var(--font-family-sans);font-size:12px">{zone(v)[1]}</span></span>{spark(i, up=v > 50)}<span class="hint">{h}</span></div>'
                for i, (l, v, h) in enumerate([('Pęd', 71, 'GIG vs średnia 4 kw.'), ('Szerokość rynku', 64, '58% spółek nad średnią'), ('Zmienność', 55, 'WNR vs mediana 5 lat'), ('Wycena', 61, 'C/Z vs mediana 5 lat'), ('Apetyt', 59, 'debiuty i dźwignia botów')]))
history = ''.join(f'<li><span class="when">{w}</span><span>{"<span class=\'retro-label\'>za nami:</span>" if retro else ""}{phase_badge(k)}</span><span class="text-muted">{note}</span></li>' for w, k, retro, note in [
    ('Rok 3 · kw. 2', 'bull', False, 'trwa od 2 kw. · GIG +18% od dołka'), ('Rok 2 · kw. 4', 'accumulation', False, '2 kw. · GIG +3%'),
    ('Rok 2 · kw. 3', 'capitulation', True, 'dno GIG w kw. 3 · −34% od szczytu (rozpoznane po fakcie)'), ('Rok 2 · kw. 1', 'bear', False, '3 kw. · GIG −22%'), ('Rok 1 · kw. 3', 'distribution', False, '2 kw. · GIG −2%')])
window = f'''<div class="modal bank-window market-window demo-modal" style="position:static;transform:none;width:1100px;max-height:none!important">
  <button class="close-btn" aria-label="Zamknij">&times;</button>
  <header class="bank-hero"><div class="bank-emblem">{ic("rynek", 26)}</div><div><div class="bank-hero-kicker">Strateg rynku · fazy i nastroje</div><h2 class="bank-hero-title">Rynek</h2></div></header>
  <div class="bank-ticker">{ticker}</div>
  <div class="bank-tab-content" style="display:flex;flex-direction:column;gap:16px">
    <div class="market-grid">
      <div class="gauge">{gauge_svg(62)}<span class="gauge-value">62</span><span class="sentiment-word sentiment--greed">chciwość</span><span class="gauge-caption">Indeks strachu i chciwości · średnia 5 składników · nie zna ukrytej fazy</span></div>
      <div><h4 class="bank-section-title">Składniki wskaźnika (20 tygodni)</h4><div class="sentiment-cards">{cards}</div></div>
    </div>
    <div><h4 class="bank-section-title">GIG i potwierdzone fazy</h4><div class="gig-chart">{gig_chart()}</div></div>
    <div><h4 class="bank-section-title">Historia faz</h4><ul class="phase-history">{history}</ul></div>
  </div></div>'''
out.append(section('2. Okno „Rynek” (L5)', 'Wzorzec okien Państwo/Kraj: nagłówek z akcentem sekcji (--color-section-market), pasek 5 KPI, licznik, karty składników, wykres GIG z tłem i podpisami faz, historia faz („za nami” dla faz krótszych niż opóźnienie).', window, width=1140))

# 3. Premia sektora
rows = ''.join(f'<tr><td class="l"><div class="stock-name">{n}</div><div class="stock-meta">{s}</div></td><td class="cell-number">{cz}</td><td class="cell-number">{cwk}</td><td class="cell-number">{prem}</td></tr>' for n, s, cz, cwk, prem in [
    ('Neuronix AI', 'Technologia · Sztuczna inteligencja · NRX', '41,3', '6,2', '<span class="sector-premium up">▲ +38%</span> <span class="badge badge--warn">bańka</span>'),
    ('Bank Gildia Handlowa', 'Bankowość · BGH', '9,8', '1,1', '<span class="sector-premium down">▼ −6%</span>'),
    ('Polski Uran', 'Energia · PUR', '12,4', '1,6', '<span class="sector-premium flat">■ +2%</span>')])
scanner = f'''<table id="stock-table" style="width:760px"><thead><tr><th class="col-name" style="text-align:left">Spółka</th><th>C/Z</th><th>C/WK</th><th title="C/Z sektora względem mediany z 5 lat">Premia sektora</th></tr></thead><tbody>{rows}</tbody></table>
<div class="cc-kpis" style="width:760px;margin-top:16px">
  <div class="cc-kpi"><span>C/Z</span><strong>41,3</strong><em class="text-down">sektor 31,0 · droga</em></div>
  <div class="cc-kpi"><span>Premia sektora</span><strong><span class="sector-premium up">▲ +38%</span></strong><em>C/Z sektora 31,0 vs mediana 5 lat 22,5 · bańka</em></div>
  <div class="cc-kpi"><span>Wartość godziwa</span><strong>48,20 PLN</strong><em>bez premii rynku — kurs 71,50 PLN</em></div></div>'''
out.append(section('3. Premia sektora: kolumna w skanerze (L5) i kafelek w karcie spółki', 'Dodatnia premia = sektor drożej niż zwykle → kolor ostrzeżenia (nie zysku) + ▲ + znacznik „bańka” przy &gt; +30%.', scanner, width=800))

# 4. Osiągnięcia
earned = [('osiagniecie-kryzys', 'Przeżyj pierwszy kryzys', 'Przeszedłeś przez Bessę z zaufaniem ≥ 30 i bez utraty stanowiska.', 'Rok 2 · kw. 4 · +100 XP'),
          ('osiagniecie-krew', 'Krew na ulicach', 'Kupiłeś w skrajnym strachu i zarobiłeś +30% w rok.', 'Rok 3 · kw. 1 · +150 XP'),
          ('osiagniecie-hossa', 'Pierwsza hossa', 'Cała Hossa z funduszem nie gorszym od GIG.', 'Rok 3 · kw. 2 · +100 XP')]
hidden = [('osiagniecie-wygrana', 'Bądź lepszy od rynku wtedy, gdy wszyscy tracą.'), ('osiagniecie-banka', 'Wyjdź, zanim balon pęknie.'), ('osiagniecie-jednorozec', 'Znajdź spółkę, która urośnie pięciokrotnie.'),
          ('osiagniecie-statek', 'Nie każda gwiazda świeci wiecznie.'), ('osiagniecie-zimna-krew', 'Gdy giełda staje, nie panikuj.'), ('osiagniecie-cykl', 'Zobacz wszystkie twarze rynku.'),
          ('osiagniecie-dlugo', 'Wytrwaj 20 lat i nie przegraj z rynkiem.'), ('osiagniecie-pulapka', 'Ukryte.')]
cardsA = ''.join(f'<article class="achievement"><span class="achievement-icon">{ic(i, 20)}</span><div><h5>{t}</h5><p>{d}</p><div class="meta">{m}</div></div></article>' for i, t, d, m in earned)
cardsA += ''.join(f'<article class="achievement is-hidden"><span class="achievement-icon">{ic("klodka", 18)}</span><div><h5>???</h5><p>{h}</p></div></article>' for _, h in hidden)
notif = f'<div class="notif-item notif-item--achievement" style="width:360px">{ic("osiagniecie-wygrana", 16)}<span>Osiągnięcie: Krew na ulicach · +150 XP</span><button class="btn-ghost btn-sm">Otwórz</button><button class="notif-close" aria-label="Zamknij">{ic("zamknij", 14)}</button></div>'
ach = f'''<h4 style="margin:0">Osiągnięcia</h4><div class="achievements-summary"><span class="mini-progress" style="display:block;width:120px"><span class="mini-progress-bar" style="width:27%;background:var(--color-text-accent)"></span></span> 3 z 11 · 350 XP</div>
<div class="achievements" style="width:960px">{cardsA}</div><p class="demo-sub" style="margin-top:16px">Powiadomienie o zdobyciu (istniejące pushNotification, wariant --achievement):</p>{notif}'''
out.append(section('4. Osiągnięcia w zakładce CV i szkolenia', 'Zdobyte: ikona, tytuł, opis, data i XP. Ukryte: „???” + podpowiedź (ironiczne „Pułapka wartości” bez podpowiedzi). Kolejność: zdobyte od najnowszego, potem ukryte.', ach, width=1000))

# 5. Analityk Indeksowy L4 i L5
def training(level, title, desc, cost, preview, req=None, done_all=False):
    steps = ''.join(f'<i class="{"is-done" if i < level else "is-next" if i == level else ""}"></i>' for i in range(5))
    btn = f'<button class="btn-primary btn-sm" {"disabled" if req else ""}>{req or f"Szkolenie: {cost}"}</button>'
    return f'''<article class="cv-training" style="width:300px"><h4>Analityk Indeksowy</h4><p class="fund-muted">Poziom {level}/5</p><div class="level-steps">{steps}</div>
      <p><strong>L{level + 1} „{title}”</strong> — {desc}</p><div class="unlock-preview"><span class="label">Odblokuje</span>{preview}</div>{btn}</article>'''
pv4 = mood_kpi('bull', 62)
pv5 = f'<div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--color-text-secondary)"><span>{ic("rynek", 14)} okno „Rynek” (kliknij nastrój na pasku)</span><span>{ic("szukaj", 14)} kolumna „Premia sektora” w skanerze</span><span>{ic("karta", 14)} premia sektora w karcie spółki</span></div>'
trs = training(3, 'Nastroje rynku', 'faza rynku i wskaźnik strachu i chciwości na pasku. Fazę potwierdzamy z opóźnieniem — jak na prawdziwym rynku.', '900 PLN', pv4)
trs += training(4, 'Strateg rynku', 'pełna analiza rynku: składniki wskaźnika, historia faz, premia sektora.', '1 600 PLN', pv5)
trs += training(3, 'Strateg rynku', 'wymaga poziomu 4.', '1 600 PLN', pv5, req='Wymaga poziomu 4 „Nastroje rynku”').replace('Poziom 3/5', 'Poziom 3/5 · podgląd L5')
out.append(section('5. Dwa nowe poziomy Analityka Indeksowego', 'Karta szkolenia z drabinką L1–L5 i podglądem tego, co odblokowuje następny poziom.', f'<div style="display:flex;gap:16px">{trs}</div>', width=1000))

html = f'''<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Makieta UI 0.15 — Hossa i bessa</title>
<link rel="stylesheet" href="../../../tokens.css"><link rel="stylesheet" href="../../../style.css">
<style>
body {{ padding: 24px !important; }}
.demo {{ background: var(--color-bg-base); padding: 24px; margin: 0 0 32px; border: 1px solid var(--color-border-subtle); border-radius: 6px; }}
.demo-title {{ margin: 0 0 4px; font-size: 20px; }}
.demo-sub {{ margin: 0 0 16px; color: var(--color-text-muted); font-size: 13px; }}
.demo-row {{ margin-bottom: 14px; }}
.demo-label {{ display: block; margin-bottom: 6px; font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .06em; }}
.demo-topbar {{ position: static !important; margin: 0 !important; border: 1px solid var(--color-border-subtle) !important; }}
.demo-mobile {{ flex-wrap: wrap; height: auto !important; padding: 8px 12px !important; }}
.demo-mobile .topbar-kpi-group {{ flex: 1 1 0; overflow: hidden; gap: 16px; }}
.demo-mobile .topbar-kpi-val {{ font-size: 14px; }}
.demo-grid5 {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }}
.demo-grid3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }}
.demo-cell {{ padding: 12px; background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: 4px; }}
.demo-modal .bank-ticker-item small {{ font-size: 11px; }}
.demo-modal {{ position: relative !important; left: auto !important; top: auto !important; transform: none !important; }}
</style></head><body class="dark-mode">
{"".join(out)}
</body></html>'''
dest = ROOT / 'plany/design/makiety/05b_ui_015.html'
dest.write_text(html, encoding='utf-8')
print('zapisano', dest)
