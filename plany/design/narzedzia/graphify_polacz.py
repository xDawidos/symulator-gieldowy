"""Dopina do graphify-out/graph.json wywolania funkcji miedzy plikami gry.

Skrypty gry dziela jedna przestrzen globalna, wiec AST widzi tylko wywolania w obrebie pliku.
Tu: nazwa funkcji zdefiniowana w dokladnie jednym pliku + wywolanie `nazwa(` w innym pliku
=> krawedz `calls` (INFERRED). Uruchom po `graphify update`:
    python plany/design/narzedzia/graphify_polacz.py
shortcut: wywolanie przypisane do ostatniej funkcji zaczynajacej sie wyzej w pliku (kod poza funkcjami
bywa przypisany do poprzedniej), komentarze i stringi nie sa pomijane; upgrade: parser JS.
"""
import json, re, sys
from collections import defaultdict
from pathlib import Path

G = Path('graphify-out/graph.json')
d = json.loads(G.read_text(encoding='utf-8'))
links_key = 'links' if 'links' in d else 'edges'
nodes = d['nodes']

funcs = defaultdict(list)  # sama nazwa -> wezly
per_file = defaultdict(list)  # plik -> (linia, wezel)
for n in nodes:
    l, sf, loc = n.get('label', ''), n.get('source_file', ''), n.get('source_location', '')
    if n.get('file_type') != 'code' or not l.endswith('()') or l.startswith('.') or not sf.endswith('.js') or not loc.startswith('L'):
        continue
    funcs[l[:-2]].append(n)
    per_file[sf].append((int(loc[1:].split('-')[0]), n))
for v in per_file.values():
    v.sort(key=lambda x: x[0])

existing = {(e['source'], e['target']) for e in d[links_key] if e.get('_origin') != 'ast-cross-file'}  # wlasne krawedzie z poprzedniego uruchomienia liczymy od nowa
call_re = re.compile(r'(?<![\w.$])([A-Za-z_$][\w$]*)\s*\(')
new = {}
for sf, fl in per_file.items():
    lines = Path(sf).read_text(encoding='utf-8', errors='replace').split('\n')
    for i, line in enumerate(lines, 1):
        owner = None
        for ln, n in fl:
            if ln <= i:
                owner = n
            else:
                break
        if owner is None:
            continue
        for name in call_re.findall(line):
            defs = funcs.get(name)
            if not defs or len(defs) != 1 or defs[0]['source_file'] == sf:
                continue
            key = (owner['id'], defs[0]['id'])
            if key not in existing and key not in new:
                new[key] = {'source': key[0], 'target': key[1], 'relation': 'calls', 'confidence': 'INFERRED',
                            'confidence_score': 0.7, 'source_file': sf, 'source_location': f'L{i}', '_origin': 'ast-cross-file'}
d[links_key] = [e for e in d[links_key] if e.get('_origin') != 'ast-cross-file'] + list(new.values())
G.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'dodano {len(new)} krawedzi calls miedzy plikami')
assert len(new) > 0 or '--allow-empty' in sys.argv, 'brak krawedzi - sprawdz source_location'
