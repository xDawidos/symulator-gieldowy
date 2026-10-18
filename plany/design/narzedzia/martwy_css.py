"""Szuka martwych reguł w style.css: selektory, których klasy lub id nie występują w index.html ani w plikach .js.

Użycie: python plany/design/narzedzia/martwy_css.py [--usun]
Reguła jest „martwa”, gdy KAŻDY selektor z listy (a, b, c { … }) zawiera klasę/id nieobecną w kodzie.
Klasy budowane dynamicznie (np. `phase--${key}`, `cv-medal-${id}`) wykrywa po prefiksie przed `${`.
Bez --usun tylko raport (plany/design/martwy_css.md); z --usun zapisuje style.css bez martwych reguł.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
CSS_PATH = ROOT / 'style.css'
css = CSS_PATH.read_text(encoding='utf-8')
code = (ROOT / 'index.html').read_text(encoding='utf-8')
for f in sorted(ROOT.glob('*.js')):
    code += '\n' + f.read_text(encoding='utf-8')
code += '\n' + (ROOT / 'tests' / 'tests.html').read_text(encoding='utf-8')

tokens = set(re.findall(r'[A-Za-z_][\w-]*', code))
# prefiksy klas składanych w szablonach: class="foo-${x}" / 'foo-' + x / `is-${phase}`
prefixes = set(re.findall(r'([A-Za-z_][\w-]*-)\$\{', code)) | set(re.findall(r"""['"`]([A-Za-z_][\w-]*-)['"`]\s*\+""", code))


def used(name):
    if name in tokens:
        return True
    return any(name.startswith(p) for p in prefixes)


def selector_alive(sel):
    sel = re.sub(r'::?[\w-]+(\([^)]*\))?', '', sel)      # pseudo-klasy i pseudo-elementy
    sel = re.sub(r'\[[^\]]*\]', '', sel)                  # atrybuty
    names = re.findall(r'[.#]([A-Za-z_][\w-]*)', sel)
    return all(used(n) for n in names)


def parse(text):
    """Zwraca listę (start, end, prelude, body, depth) dla reguł zwykłych (bez @-bloków), z zagnieżdżeniem w @media."""
    out, i, n = [], 0, len(text)
    def walk(i, end, depth):
        while i < end:
            if text.startswith('/*', i):
                j = text.find('*/', i + 2); i = (j + 2) if j >= 0 else end; continue
            if text[i].isspace():
                i += 1; continue
            j = i
            while j < end and text[j] not in '{;':
                if text.startswith('/*', j):
                    k = text.find('*/', j + 2); j = k + 2 if k >= 0 else end; continue
                j += 1
            if j >= end: return end
            if text[j] == ';':
                i = j + 1; continue
            prelude = text[i:j].strip()
            # dopasuj klamrę
            k, lvl = j + 1, 1
            while k < end and lvl:
                if text.startswith('/*', k):
                    m = text.find('*/', k + 2); k = m + 2; continue
                if text[k] == '{': lvl += 1
                elif text[k] == '}': lvl -= 1
                k += 1
            if prelude.startswith('@'):
                if re.match(r'@(media|supports|layer)\b', prelude):
                    walk(j + 1, k - 1, depth + 1)
            else:
                out.append((i, k, prelude, text[j + 1:k - 1], depth))
            i = k
        return i
    walk(0, n, 0)
    return out


rules = parse(css)
dead = []
for start, end, prelude, body, depth in rules:
    sels = [s.strip() for s in prelude.split(',') if s.strip()]
    if not sels or any(s.startswith(('from', 'to')) or re.match(r'^\d+%$', s) for s in sels):
        continue
    if not any(selector_alive(s) for s in sels):
        dead.append((start, end, prelude))

line_of = lambda pos: css.count('\n', 0, pos) + 1
report = [f'# Martwe reguły w style.css (wygenerowane: narzedzia/martwy_css.py)\n',
          f'Reguł ogółem: {len(rules)} · martwych: {len(dead)} · bajtów do usunięcia: {sum(e - s for s, e, _ in dead)}\n',
          '| Linia | Selektor |', '|---|---|']
for s, e, p in dead:
    report.append(f'| {line_of(s)} | `{" ".join(p.split())[:120]}` |')
(ROOT / 'plany' / 'design' / 'martwy_css.md').write_text('\n'.join(report) + '\n', encoding='utf-8')
print(f'reguł: {len(rules)}, martwych: {len(dead)}, bajtów: {sum(e - s for s, e, _ in dead)}')

if '--usun' in sys.argv:
    out = css
    for s, e, _ in sorted(dead, reverse=True):
        # usuń regułę razem z końcem linii, jeśli zostaje pusta linia
        ls = out.rfind('\n', 0, s) + 1
        le = out.find('\n', e)
        le = len(out) if le < 0 else le
        if out[ls:s].strip() == '' and out[e:le].strip() == '':
            out = out[:ls] + out[le + 1:]
        else:
            out = out[:s] + out[e:]
    # puste bloki @media po usunięciu
    prev = None
    while prev != out:
        prev = out
        out = re.sub(r'@media[^{]*\{\s*\}\s*\n?', '', out)
    CSS_PATH.write_text(out, encoding='utf-8')
    print('zapisano style.css bez martwych reguł')
