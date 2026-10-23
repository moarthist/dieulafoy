#!/usr/bin/env python3
"""Build js/data.js from the INHA IIIF manifests of the Dieulafoy albums.

Every captioned page of the eight albums becomes one exhibit, and is hung in
one of the six rooms by the words in its INHA caption (see ROOMS and OVERRIDES).

    python3 tools/build_data.py            # downloads the manifests, writes js/data.js
    python3 tools/build_data.py --cache DIR  # keep the downloaded manifests in DIR
"""
import argparse, json, os, re, urllib.request

BASE = 'https://bibliotheque-numerique.inha.fr'

# The eight albums, in the order of the museum's catalogue.
ALBUMS = [
    (62746, 'Perse 1', '4 PHOT 018 (1)', '1880–1894'),
    (62742, 'Perse 2', '4 PHOT 018 (2)', '1880–1894'),
    (62745, 'Perse 3', '4 PHOT 018 (3)', '1880–1894'),
    (62743, 'Perse 4', '4 PHOT 018 (4)', '1880–1894'),
    (62747, 'Perse 5', '4 PHOT 018 (5)', '1880–1894'),
    (62754, 'Perse 6', '4 PHOT 018 (6)', '1880–1894'),
    (62737, 'Espagne et Portugal', '4 PHOT 017', '1888–1914'),
    (62750, 'Divers', '4 PHOT 019', '1860–1915'),
]

# Pages that are not photographs (covers, endpapers, colour charts...).
SKIP = re.compile(r'^(\d+.*|Plat.*|Contre.*|Garde|Dos|n\.p\..*|Mire.*|Réglette|Tranche.*|'
                  r'\[?photographie volante\]?|\[note ms\.\]|Perse\. \d|Espagne|Portugal|Divers.*)$', re.I)

# Keywords for each room. A page goes to the room whose words it matches most;
# a tie goes to the room listed first.
ROOMS = {
    'susa': r"suse|susa|susien|susiane|tumul|tranchée|fouille|apadana|apadâna|frise|immortels|griffon|"
            r"crevasse|chapiteau|déblai|caisses|bases? de colonne|louvre|sceau|cachet|stèle|céramique|urne|"
            r"récipient|faïence|parapet|poteries|maquette|restauration|montage des colonnes|daniel|danial|"
            r"barrè bachy|tête de taureau|gond de porte|fragment|taureau sculpté|corps du taureau|briques|"
            r"transport|chargement|statuette|carreau|main courante|stucs|inscription perse|donjon|citadelle, vue",
    'ancient': r"persépolis|cyrus|cambyse|darius|xerx|nakh|naqsh|nash|rostam|roustem|achéménide|sassanide|"
               r"chapour|sarvistan|firouz|ctésiphon|babylone|babel|mérodach|malamir|chekeft|kaleh|kaleb|anzan|"
               r"madérè|maderé|mechhed|propylon|androcéphales|atechga|bas-relief|bas relief|relief|eivan|eïvan|"
               r"ferachbad|\brois\b|hypogée|valérien|tag eïvan|taq|cunéiforme|pilier|polvar|tès|anzanites|kosro|"
               r"intaille|hamadan|aiguière|camée|combat d'un lion",
    'architecture': r"mosquée|masdjed|mastched|matsched|minaret|médress|madrasa|médrésé|imamzad|imazad|"
                    r"tombeau|mirhab|mihrab|coupole|dôme|golestan|tcheel|chehel|hacht|pavillon|caravansérail|"
                    r"\bpont|bazar|meïdan|iwan|église|couvent|etchmiadzin|\btour\b|khan orthma|koumbaz|barrage|"
                    r"abambar|colombier|palais|panneaux|peinture murale|citadelle|porte|forteresse|taslim|"
                    r"tchaar-bag|bagè|vakil|moulins",
    'people': r"portrait|femme|homme|enfant|famille|derviche|mollah|mirza|cheikh|cheik\b|chah et|shah\b|"
              r"gouverneur|groupe|danseur|musicien|berger|paysan|marchand|mendiant|nourrice|jeune|fille|fils|"
              r"soeurs|père|ouvrier|bildars|cavalier|arabe|lori|luris|bakht|mekrani|dames|épouse|neveu|nièce|"
              r"notables|suite|familiers|escorte|golam|ketkhoda|archevêque|catholicos|sacristain|arméni|chef|"
              r"wali|vali|duarte|colonel|docteur|juge|mehda|portefaix|batelier|dieulafoy|babin|houssay|zeybeck|"
              r"mystères|armée persane|scieurs|émissaire|adjémis|seïd|torkan|bibi|matab|ousta|tholozan|abdurza|"
              r"mozaffer|mozzafer|darâb|mirza|nomades|danakils|somalie|porteuse|ménagère|montagnards|guèbre|"
              r"opium|teinturerie|battage|farine|pain|négociant|mouchteïd|ordou|jument",
    'journey': r"panorama|rue|paysage|rive|jardin|campement|caravane|village|plage|canal|navires|montagne|"
               r"rivière|plateau|route|\bhor\b|kelek|tente|palmier|figuier|maison|puits|douane|poste|télégraphe|"
               r"isthme|mouillage|bungalow|steamer|aden|mascate|gwadar|obock|suez|bassorah|tigre|euphrate|karoun|"
               r"kerkha|chaour|bagdad|bender|bendar|bouchir|bouchyr|pasni|ormara|jahsk|négor|paquebot|mer rouge|"
               r"cabanes|hameau|marne|ravin|oasis|quai|citernes|contrebande|pluie",
}
ROOM_ORDER = ['journey', 'architecture', 'ancient', 'susa', 'people', 'elsewhere']
PRIORITY = ['susa', 'ancient', 'architecture', 'people', 'journey']

# Hand decisions where the words alone mislead: (album, page) -> room.
OVERRIDES = {
    (62750, 5): 'ancient', (62750, 6): 'ancient', (62750, 7): 'ancient', (62750, 8): 'ancient',
    (62750, 47): 'ancient',
    (62743, 31): 'ancient', (62743, 34): 'ancient',          # excavations at Tès, not Susa
    (62745, 63): 'people', (62745, 73): 'people',            # Jane, and Jane and Marcel on deck
    (62742, 11): 'people', (62742, 39): 'people',
    (62754, 5): 'people',
    (62747, 4): 'people', (62747, 94): 'people', (62747, 95): 'people', (62747, 96): 'people',
    (62747, 36): 'susa',                                     # foreman and secretary of the dig
    (62747, 77): 'susa', (62747, 78): 'susa',                # Marcel at the end of the excavations
    (62743, 98): 'susa', (62743, 99): 'susa', (62743, 100): 'susa', (62743, 104): 'susa',
    (62743, 102): 'susa', (62743, 103): 'susa',
    (62754, 72): 'journey',
    (62742, 89): 'people',
    (62742, 49): 'ancient', (62742, 50): 'ancient', (62742, 51): 'ancient', (62742, 52): 'ancient',
    (62742, 57): 'ancient', (62742, 59): 'ancient', (62742, 63): 'ancient',  # Persepolis, not Susa
    (62754, 20): 'ancient',
    (62747, 28): 'susa',
    (62746, 92): 'architecture', (62745, 8): 'architecture',
    (62747, 93): 'journey', (62745, 27): 'journey', (62745, 28): 'journey',
}


def fetch(aid, cache):
    path = cache and os.path.join(cache, f'm{aid}.json')
    if path and os.path.exists(path):
        return json.load(open(path))
    with urllib.request.urlopen(f'{BASE}/iiif/{aid}/manifest', timeout=60) as r:
        data = r.read()
    if path:
        open(path, 'wb').write(data)
    return json.loads(data)


def classify(aid, page, caption):
    if (aid, page) in OVERRIDES:
        return OVERRIDES[(aid, page)]
    if aid in (62737, 62750):
        return 'elsewhere'
    text = caption.lower()
    scores = {k: len(re.findall(rx, text)) for k, rx in ROOMS.items()}
    best = max(scores.values())
    if best == 0:
        return 'journey'
    return next(k for k in PRIORITY if scores[k] == best)


def clean(caption):
    caption = re.sub(r'\s+', ' ', caption).strip()
    if caption.startswith('[') and caption.endswith(']') and caption.count('[') == 1:
        caption = caption[1:-1]
    return caption.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'js', 'data.js'))
    args = ap.parse_args()
    if args.cache:
        os.makedirs(args.cache, exist_ok=True)

    albums, items = [], []
    for aid, name, shelf, dates in ALBUMS:
        m = fetch(aid, args.cache)
        canvases = m['sequences'][0]['canvases']
        caps = {}
        for r in m['structures']:
            label = r['label'].strip()
            if r.get('viewingHint') == 'top' or SKIP.match(label) or len(r['canvases']) != 1:
                continue
            caps.setdefault(r['canvases'][0].rsplit('/', 1)[1], []).append(label)
        meta = {d['label']: d['value'] for d in m.get('metadata', []) if isinstance(d.get('value'), str)}
        prefix = None
        count = 0
        for c in canvases:
            k = c['@id'].rsplit('/', 1)[1]
            svc = c['images'][0]['resource']['service']['@id'].split('IIIF=', 1)[1]
            prefix = prefix or svc.rsplit('_', 1)[0] + '_'
            if k not in caps:
                continue
            caption = clean(' ; '.join(dict.fromkeys(caps[k])))
            items.append({'a': aid, 'p': int(k), 'w': c['width'], 'h': c['height'],
                          'f': svc.rsplit('_', 1)[1].replace('.tif', ''),
                          'c': caption, 'r': classify(aid, int(k), caption)})
            count += 1
        albums.append({'id': aid, 'name': name, 'shelf': shelf, 'dates': dates,
                       'iiif': prefix, 'pages': len(canvases), 'shown': count,
                       'format': meta.get('Description matérielle', ''),
                       'note': meta.get('Note complémentaire', '') or meta.get('Note de contenu', '')})

    for room in ROOM_ORDER:
        print(f'{room:13s}', sum(1 for i in items if i['r'] == room))
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/build_data.py from the INHA IIIF manifests. Do not edit by hand.\n')
        f.write('// a: album id, p: page (canvas) number, w/h: scan size, f: image file number,\n')
        f.write('// c: INHA catalogue caption, r: room.\n')
        f.write('export const ALBUMS = ' + json.dumps(albums, ensure_ascii=False, indent=1) + ';\n')
        f.write('export const ITEMS = [\n')
        for i in items:
            f.write(json.dumps(i, ensure_ascii=False) + ',\n')
        f.write('];\n')
    print(len(items), 'pages written to', os.path.normpath(args.out))


if __name__ == '__main__':
    main()
