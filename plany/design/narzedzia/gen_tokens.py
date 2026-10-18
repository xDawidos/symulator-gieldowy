"""Generator tokenów redesignu 0.14.5.

Użycie (z katalogu repo):  python plany/design/narzedzia/gen_tokens.py
Czyta plany/design/tokens.json, zapisuje:
  - tokens.css                              (zmienne CSS dla gry)
  - plany/design/kontrast_tokenow.md        (tabela kontrastów tekst × tło, WCAG)
Nazwa w Figmie 'color/bg/base' = zmienna CSS '--color-bg-base'.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]
T = json.loads((ROOT / 'plany/design/tokens.json').read_text(encoding='utf-8'))
P = T['primitives']


def css_name(name):
    return '--' + name.replace('/', '-')


def rgba(hex_):
    h = hex_.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return r, g, b, a


def css_color(hex_):
    r, g, b, a = rgba(hex_)
    return hex_.upper() if a == 1 else f'rgba({r}, {g}, {b}, {a:.2f})'


def resolve(name):
    return P[T['color'][name]['alias']]


def lum(rgb):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def over(top, bottom):
    r, g, b, a = rgba(top)
    R, G, B = bottom
    return (r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a))


def ratio(fg, bg):
    l1, l2 = lum(fg), lum(bg)
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)


# ---------- tokens.css ----------
out = ['/* Tokeny redesignu 0.14.5 — kierunek A · Terminal (tylko ciemny motyw).',
       '   WYGENEROWANE z plany/design/tokens.json przez plany/design/narzedzia/gen_tokens.py — nie edytuj ręcznie.',
       '   Te same nazwy co zmienne w Figmie: color/bg/base → --color-bg-base. */',
       '', ':root {', '  color-scheme: dark; /* natywne paski przewijania, listy i pola w ciemnym motywie */', '  /* Prymitywy (nie używać bezpośrednio w komponentach) */']
for k, v in P.items():
    out.append(f'  {css_name(k)}: {css_color(v)};')
out.append('')
out.append('  /* Kolory semantyczne */')
for k, v in T['color'].items():
    out.append(f'  {css_name(k)}: var({css_name(v["alias"])}); /* {v["opis"]} */')
out.append('')
out.append('  /* Odstępy, promienie, rozmiary (px) */')
for grp in ('space', 'radius', 'size'):
    for k, v in T[grp].items():
        out.append(f'  {css_name(k)}: {v}px;')
out.append('')
out.append('  /* Typografia */')
fam = {'sans': f"'{T['font']['font/family/sans']}', 'Segoe UI', system-ui, sans-serif",
       'mono': f"'{T['font']['font/family/mono']}', ui-monospace, 'Cascadia Mono', Consolas, monospace"}
out.append(f'  --font-family-sans: {fam["sans"]};')
out.append(f'  --font-family-mono: {fam["mono"]};')
for k, v in T['text'].items():
    n = css_name(k)
    out.append(f'  {n}-size: {v["size"]}px; {n}-line: {v["line"]}px; {n}-weight: {v["weight"]}; {n}-track: {v["track"]}em;')
out.append('')
out.append('  /* Cienie i ruch */')
for k, layers in T['shadow'].items():
    parts = [f'{l["x"]}px {l["y"]}px {l["blur"]}px {l["spread"]}px {css_color(l["color"])}' for l in layers]
    out.append(f'  {css_name(k)}: {", ".join(parts)};')
for k, v in T['motion'].items():
    out.append(f'  {css_name(k)}: {v};')
out.append('  --focus-ring: 0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-focus);')
out.append('')
out.append('  /* Zmienne komponentów (aliasy — komponent czyta tylko swoje zmienne) */')
for k, v in T.get('component', {}).items():
    out.append(f'  --{k.replace("/", "-")}: {v};')
out.append('')
out.append('  /* Sekcja okna: .modal--bank itd. nadpisuje --modal-accent */')
out.append('}')
for sec in ('bank', 'ju', 'state', 'city', 'build', 'grey'):
    out.append(f'.modal--{sec} {{ --modal-accent: var(--color-section-{sec}); }}')
out.append('')
out.append('/* Klasy typografii (te same nazwy co style tekstu w Figmie: text/body → .t-body) */')
for k, v in T['text'].items():
    n = css_name(k)
    cls = '.t-' + k.split('/')[1]
    extra = ' text-transform: uppercase;' if v.get('upper') else ''
    numeric = ' font-variant-numeric: tabular-nums;' if v['family'] == 'mono' else ''
    out.append(f'{cls} {{ font-family: var(--font-family-{v["family"]}); font-size: var({n}-size); line-height: var({n}-line); '
               f'font-weight: var({n}-weight); letter-spacing: var({n}-track);{extra}{numeric} }}')
out.append('')
(ROOT / 'tokens.css').write_text('\n'.join(out), encoding='utf-8')

# ---------- tabela kontrastów ----------
bgs = ['color/bg/base', 'color/bg/surface', 'color/bg/raised', 'color/bg/sunken']
base_rgb = rgba(P['ink/900'])[:3]


def bg_rgb(name):
    hex_ = resolve(name)
    # przezroczyste tła liczone na tle strony
    return over(hex_, rgba(P['ink/800'])[:3]) if rgba(hex_)[3] < 1 else rgba(hex_)[:3]


rows = ['# Kontrast tokenów (wygenerowane)', '',
        'Wygenerowane przez `narzedzia/gen_tokens.py`. AA: tekst ≥ 4,5:1, elementy UI (ramki pól, fokus) ≥ 3:1. '
        'Tła przezroczyste liczone na `color/bg/surface`.', '',
        '| Kolor | ' + ' | '.join(b.split('/')[-1] for b in bgs) + ' | Wynik |',
        '|---|' + '---|' * (len(bgs) + 1)]
fails = 0
for name, v in T['color'].items():
    if not (name.startswith('color/text/') or name.startswith('color/phase/') or name.startswith('color/sentiment/') or name in ('color/border/strong', 'color/focus', 'color/border/accent')):
        continue
    if name in ('color/text/on-accent', 'color/text/on-danger', 'color/text/disabled'):
        continue
    need = 3.0 if name.startswith('color/border') or name == 'color/focus' else 4.5
    fg = rgba(resolve(name))[:3]
    rs = [ratio(fg, bg_rgb(b)) for b in bgs]
    ok = min(rs) >= need
    fails += not ok
    rows.append(f'| `{name}` | ' + ' | '.join(f'{r:.2f}' for r in rs) + f' | {"OK" if ok else "**ZA MAŁO**"} (min {need}) |')
# pary specjalne
special = [('color/text/on-accent', 'color/bg/accent', 4.5), ('color/text/on-accent', 'color/bg/accent-hover', 4.5),
           ('color/text/on-danger', 'color/bg/danger', 4.5),
           ('color/text/up', 'color/bg/up-soft', 4.5), ('color/text/down', 'color/bg/down-soft', 4.5),
           ('color/text/warn', 'color/bg/warn-soft', 4.5), ('color/text/info', 'color/bg/info-soft', 4.5),
           ('color/text/primary', 'color/bg/accent-soft', 4.5), ('color/text/primary', 'color/bg/pressed', 4.5)]
rows += ['', '| Para | Kontrast | Wynik |', '|---|---|---|']
for fgn, bgn, need in special:
    fg = rgba(resolve(fgn))[:3]
    r = ratio(fg, bg_rgb(bgn))
    ok = r >= need
    fails += not ok
    rows.append(f'| `{fgn}` na `{bgn}` | {r:.2f} | {"OK" if ok else "**ZA MAŁO**"} |')
rows += ['', f'Niespełnionych par: **{fails}**.', '']
(ROOT / 'plany/design/kontrast_tokenow.md').write_text('\n'.join(rows), encoding='utf-8')
print('tokens.css i kontrast_tokenow.md zapisane; niespełnionych par:', fails)
