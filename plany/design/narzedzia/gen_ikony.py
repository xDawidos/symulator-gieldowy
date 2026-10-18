"""Eksport ikon gry (UI_ICON_PATHS + SECTOR_ICON_PATHS z ui.js) do img/ikony/.

Użycie: python plany/design/narzedzia/gen_ikony.py
Wynik:
  img/ikony/<nazwa>.svg      — pojedyncze ikony 24×24, kreska 1,8, currentColor (do Figmy / grafika)
  img/ikony/sektor-<…>.svg   — ikony sektorów
  img/ikony/sprite.svg       — wszystkie jako <symbol id="ic-<nazwa>">
  img/ikony/arkusz.html      — arkusz podglądu (samodzielny, do importu w Figmie: 1 ramka na grupę)
Źródłem prawdy jest ui.js — po zmianie ikon uruchom ponownie.
"""
import html, pathlib, re, unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[3]
UI = (ROOT / 'ui.js').read_text(encoding='utf-8')
OUT = ROOT / 'img' / 'ikony'


def block(start):
    s = UI.index(start)
    return UI[s:UI.index('};', s)]


UI_ICONS = re.findall(r"^\s+'?([\w-]+)'?: '([^']+)'", block('const UI_ICON_PATHS = {'), re.M)
ui_map = dict(UI_ICONS)
# sektory w kolejności z ui.js; wartość to ścieżka albo odwołanie UI_ICON_PATHS.<nazwa>
SECTORS = [(name, path or ui_map[ref]) for name, path, ref in
           re.findall(r"^\s+'([^']+)': (?:'([^']+)'|UI_ICON_PATHS\.(\w+))", block('const SECTOR_ICON_PATHS = {'), re.M)]


def slug(text):
    t = unicodedata.normalize('NFKD', text.replace('ł', 'l').replace('Ł', 'L'))
    t = ''.join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def svg(path, extra=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"{extra}><path d="{path}"/></svg>\n')


def group_of(name):
    if name.startswith('faza-'): return '0.15 · fazy rynku'
    if name.startswith('osiagniecie-'): return '0.15 · osiągnięcia'
    return 'Interfejs'


OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob('*.svg'):
    old.unlink()
items = []  # (grupa, nazwa pliku, etykieta, ścieżka)
for name, path in UI_ICONS:
    items.append((group_of(name), name, name, path))
for name, path in SECTORS:
    items.append(('Sektory', 'sektor-' + slug(name), name, path))
for _, fname, _, path in items:
    (OUT / f'{fname}.svg').write_text(svg(path), encoding='utf-8')

symbols = ''.join(f'  <symbol id="ic-{f}" viewBox="0 0 24 24"><path d="{p}"/></symbol>\n' for _, f, _, p in items)
(OUT / 'sprite.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" fill="none" stroke="currentColor" stroke-width="1.8" '
    'stroke-linecap="round" stroke-linejoin="round">\n' + symbols + '</svg>\n', encoding='utf-8')

groups = {}
for g, f, label, p in items:
    groups.setdefault(g, []).append((f, label, p))
sections = ''
for g, rows in groups.items():
    cells = ''.join(
        f'<figure class="cell"><svg width="48" height="48" viewBox="0 0 24 24"><path d="{p}"/></svg>'
        f'<svg width="16" height="16" viewBox="0 0 24 24"><path d="{p}"/></svg><figcaption>{html.escape(label)}</figcaption></figure>'
        for f, label, p in rows)
    sections += f'<section class="sheet"><h2>{html.escape(g)} <small>{len(rows)}</small></h2><div class="grid">{cells}</div></section>\n'
(OUT / 'arkusz.html').write_text(f'''<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Ikony Capital Quest</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root {{ --bg: #0A0D12; --surface: #10141B; --border: #1F2631; --ink: #E6EDF3; --muted: #8B949E; }}
body {{ margin: 0; padding: 24px; background: var(--bg); color: var(--ink); font: 13px/1.4 "IBM Plex Sans", system-ui, sans-serif; }}
h1 {{ margin: 0 0 4px; font-size: 20px; }} p {{ margin: 0 0 24px; color: var(--muted); }}
.sheet {{ width: 1120px; margin: 0 0 24px; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; }}
h2 {{ margin: 0 0 12px; font-size: 15px; }} h2 small {{ color: var(--muted); font-weight: 400; }}
.grid {{ display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px; }}
.cell {{ margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border: 1px solid var(--border); border-radius: 4px; }}
figcaption {{ font: 11px "IBM Plex Mono", ui-monospace, monospace; color: var(--muted); text-align: center; word-break: break-all; }}
svg {{ fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }}
</style></head><body>
<h1>Ikony Capital Quest — {len(items)}</h1>
<p>24×24, kreska 1,8, kolor tekstu (currentColor). Źródło: ui.js (UI_ICON_PATHS, SECTOR_ICON_PATHS); pliki: img/ikony/*.svg, sprite.svg. Generator: plany/design/narzedzia/gen_ikony.py.</p>
{sections}</body></html>
''', encoding='utf-8')
print(f'zapisano {len(items)} ikon w {OUT}')
