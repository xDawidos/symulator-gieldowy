"""Makieta UI 0.15.5 z prawdziwymi klasami gry (tokens.css + style.css, blok „0.15.5 RANKING I LIMITY”).

Użycie: python plany/design/narzedzia/gen_makieta_0155.py  →  plany/design/makiety/05c_ui_0155.html
Każda sekcja to <section class="demo"> — osobna ramka.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[3]
UI = (ROOT / 'ui.js').read_text(encoding='utf-8')
start = UI.index('const UI_ICON_PATHS = {'); end = UI.index('};', start)
ICONS = dict(re.findall(r"^\s+'?([\w-]+)'?: '([^']+)'", UI[start:end], re.M))


def ic(name, size=16):
    return f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" aria-hidden="true"><path d="{ICONS[name]}"/></svg>'


def meter(pct, limit=None, tone='', label=''):
    lim = f' style="--v:{pct};--limit:{limit}"' if limit is not None else f' style="--v:{pct}"'
    return f'<span class="limit-meter {tone}"{lim} role="img" aria-label="{label}"><i></i>{"<b></b>" if limit is not None else ""}</span>'


def row(label, value):
    return f'<div class="construction-info-row"><span>{label}</span><strong>{value}</strong></div>'


def section(title, sub, body, width=720):
    return f'<section class="demo"><h2 class="demo-title">{title}</h2><p class="demo-sub">{sub}</p><div style="width:{width}px">{body}</div></section>'


# 1. Ranking ofert -----------------------------------------------------------
BIDS = [  # wg oceny malejąco; lider ponad limitem nadal jest pierwszy w rankingu, ale przegra z każdym, kto może przyjąć zlecenie
    ('Orzeł Telekom', 80.1, '12 100 000 PLN', 310, [('Cena', 88), ('Jakość', 74), ('Zdolność', 78), ('Reputacja', 70)], True),
    ('Orzeł Budownictwo', 78.4, '12 400 000 PLN', 320, [('Cena', 82), ('Jakość', 71), ('Zdolność', 80), ('Reputacja', 74)], False),
    ('Nordbud S.A.', 71.0, '12 900 000 PLN', 300, [('Cena', 74), ('Jakość', 76), ('Zdolność', 60), ('Reputacja', 69)], False),
    ('Kamień i Stal', 64.2, '13 200 000 PLN', 340, [('Cena', 66), ('Jakość', 58), ('Zdolność', 71), ('Reputacja', 55)], False),
]


def bid_row(rank, word, name, score, price, days, crit, over):
    crits = ''.join(f'<span class="bid-crit"><small>{k}</small><b>{v}</b></span>' for k, v in crit)
    flag = (f'<p class="limit-flag">{ic("klodka", 14)} <span>Ponad limitem 40% wygranych w oknie 8 kw. — wygra tylko wtedy, gdy nikt inny nie może przyjąć zlecenia.</span></p>' if over else '')
    return f'''<li class="bid-rank-row{" is-over" if over else ""}">
      <span class="bid-rank-pos" aria-label="Miejsce {rank}">{rank}.</span>
      <div class="bid-rank-main"><strong>{name}</strong><span class="text-muted">{word} · {score:.1f} / 100</span>
        {meter(score, tone="", label=f"Ocena {score:.1f} na 100")}
        <div class="bid-rank-facts"><span>{price}</span><span>{days} dni budowy</span></div>
        <div class="bid-crits">{crits}</div>{flag}</div></li>'''


WORDS = ['Najlepsza oferta', 'Miejsce 2 z 4', 'Miejsce 3 z 4', 'Najsłabsza oferta']
ranking = ''.join(bid_row(i + 1, WORDS[i], *b) for i, b in enumerate(BIDS))
tender = f'''<div class="construction-tender-card">
  {row("Kryteria oceny", "Cena 40% · Jakość 25% · Zdolność 20% · Reputacja 15%")}
  <details open><summary>Oferty wykonawców (4)</summary><ol class="bid-rank">{ranking}</ol></details></div>'''

fallback = f'''<p class="notice-inline">{ic("info", 14)} <span>Brak innego oferenta — limit udziału poluzowany. Zlecenie przyjmie wykonawca ponad limitem.</span></p>'''

# 2. Podwykonawcy ----------------------------------------------------------------
def sub_card(name, available, quality, rep, share, group=None):
    badge = f'<span class="status-badge {"available" if available else "busy"}">{"Dostępny" if available else "Zajęty"}</span>'
    grp = row('Należy do grupy', group) if group else row('Należy do grupy', 'niezależny')
    return f'''<article class="subcontractor-card specialist-card"><div class="card-topline"><h4>{name}</h4>{badge}</div>
      {row("Stawka (cena)", "104% stawki bazowej")}{row("Jakość / reputacja", f"{quality} / {rep} (0–100)")}
      <div class="construction-info-row"><span>Udział w zleceniach rynku</span><strong>{share}%</strong></div>{meter(share, 50, label=f"Udział {share}% przy progu 50%")}
      {grp}</article>'''


subs = f'''<h4 class="subcontractor-specialty">Fundamenty (4)</h4>
<div class="subcontractor-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
{sub_card("Pale Nord", True, 62, 58, 18)}{sub_card("Geotech Wschód", False, 55, 49, 46, "Orzeł Budownictwo (transfer 40% zysku)")}
{sub_card("Fundament Plus", True, 70, 66, 31)}{sub_card("Grunt i Spółka", True, 48, 41, 9)}</div>
<p class="text-xs text-muted" style="margin-top:8px">Pasek: kreska = próg 50% zleceń specjalności. Wartość zawsze też liczbą.</p>'''

# 3. REIT --------------------------------------------------------------------------
def reit_row(label, value):
    return f'<tr><td>{label} <span class="text-muted">ⓘ</span></td><td class="cell-number">{value}</td></tr>'


reit = f'''<section class="cc-section"><h4>{ic("budownictwo", 16)} Portfel nieruchomości (REIT)</h4>
<table class="asset-mini-table w-full"><tbody>
{reit_row("Rodzaj portfela", "Biura")}{reit_row("Wartość portfela", "412 300 000 PLN")}{reit_row("Obłożenie", "93,4%")}{reit_row("Stopa najmu", "6,2% rocznie")}
<tr><td>Dźwignia (LTV) <span class="text-muted">ⓘ</span></td><td class="cell-number">36,1% — wysoka (limit 60%)</td></tr>
<tr class="meter-row"><td colspan="2">{meter(36.1, 60, "", "LTV 36,1% przy limicie 60%")}<span class="meter-scale"><small>0%</small><small>budowa do 50%</small><small>limit 60%</small></span></td></tr>
{reit_row("Zysk z ostatniego kwartału", "5 100 000 PLN")}{reit_row("Wypłata (obowiązkowa ≥ 80% zysku)", "88% zysku · ostatnio 4 488 000 PLN")}{reit_row("Stopa dywidendy (rocznie)", "5,4%")}{reit_row("Premia / dyskonto do NAV", "▼ 3,2%")}
</tbody></table></section>'''

# 4. Bank — ekspozycja ------------------------------------------------------------------
bank = f'''<div class="bank-exposure"><div class="construction-info-row"><span>Ekspozycja na największego dłużnika</span><strong>6,2% kapitału banku (limit 10%)</strong></div>
{meter(62, 100, "", "Ekspozycja 6,2% kapitału przy limicie 10%")}
<p class="notice-inline is-warn">{ic("info", 14)} <span>Bank odmówił kredytu: ekspozycja na Nordbud S.A. przekroczyłaby 10% kapitału banku.</span></p></div>'''

out = [
    section('1. Ranking ofert w oknie przetargu', 'Lista numerowana: miejsce, słowo, ocena /100, pasek, cena, czas i cztery oceny cząstkowe. Wykonawca ponad limitem dostaje znacznik z kłódką i zdaniem, nie sam kolor.', tender),
    section('1b. Przetarg bez innego oferenta', 'Powód poluzowania limitu jest widoczny w nagłówku przetargu.', fallback),
    section('2. Podwykonawcy — grupy specjalności', 'Karta z udziałem w zleceniach rynku liczbą i paskiem z kreską progu 50%.', subs, width=720),
    section('3. Karta REIT', 'Tabela jak dotąd, plus pasek LTV ze znacznikami: budowa do 50%, limit 60%. Słowo przy liczbie zostaje.', reit),
    section('4. Bank — ekspozycja i odmowa kredytu', 'Zajęcie limitu koncentracji widoczne zanim bank odmówi.', bank),
]

html = f'''<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Makieta UI 0.15.5 — przetargi, podwykonawcy, REIT</title>
<link rel="stylesheet" href="../../../tokens.css"><link rel="stylesheet" href="../../../style.css">
<style>
body {{ padding: 24px !important; }}
.demo {{ background: var(--color-bg-base); padding: 24px; margin: 0 0 32px; border: 1px solid var(--color-border-subtle); border-radius: 6px; }}
.demo-title {{ margin: 0 0 4px; font-size: 20px; }}
.demo .construction-info-row {{ display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; font-size: 13px; }}
.demo-sub {{ margin: 0 0 16px; color: var(--color-text-muted); font-size: 13px; max-width: 720px; }}
</style></head><body class="dark-mode">
{"".join(out)}
</body></html>'''
dest = ROOT / 'plany/design/makiety/05c_ui_0155.html'
dest.write_text(html, encoding='utf-8')
print('zapisano', dest)
