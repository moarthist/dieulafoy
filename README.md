# Jane Dieulafoy: The Photographs

**A catalogue to read.** The site opens as an old printed catalogue lying on a desk: a cloth-bound cover with gilt
lettering, marbled endpapers, a title page, contents, an introduction, six chapters of numbered plates, a
concordance with the INHA albums and a colophon. Its 774 plates are every captioned page of the eight Dieulafoy
photograph albums kept at the library of the Institut national d’histoire de l’art (INHA), Paris, collections
Jacques Doucet.

- **Reading.** Two pages at a time on a wide screen, one on a phone. Turn the pages with **‹ ›**, the arrow keys,
  a swipe, or a click on the outer edge of a page (the corner lifts when the pointer is there); the page slider
  and **Contents** jump further. Each chapter opens on a right-hand page, as in print.
- **The plates.** Two to a page, numbered 1–774, each with the INHA catalogue caption, the album, its page and the
  shelf mark. Click a plate to see the scan at full resolution with deep zoom; ← → go through the plates.
- **Search** finds plates by any word of their captions and turns to them.
- **Links.** `#p116` opens page 116, `#no214` plate 214, `#contents` the contents.

The same pages can also be visited in 3D, as six albums on the table of a library study: **`study.html`** (see
below).

It is a plain static website: no build step, no framework, nothing to install. It runs on GitHub Pages as it is.

## The study in 3D (`study.html`)

A 3D library study, after the classic Italian home office: glazed bookcases in pale lacquer and gilt, damask
walls, a crystal chandelier, a Persian rug and a large library table, with **six leather albums** on it, one for
each chapter of the catalogue.

### The six albums

| Album | Title | What it holds | Pages |
| --- | --- | --- | --- |
| I | The Road East | Streets, rivers, camps, the Gulf and the Makran coast | 98 |
| II | Domes, Bridges and Bazaars | Mosques, madrasas, palaces, bridges and bazaars of Persia and Baghdad | 113 |
| III | Ancient Empires | Pasargadae, Persepolis, Naqsh-e Rustam, Sasanian palaces, Ctesiphon, Babylon, Malamir, Bishapur | 113 |
| IV | Susa | The excavation of 1884–86, the friezes, the finds and the Dieulafoy rooms at the Louvre | 103 |
| V | Faces and Encounters | Portraits: the Qajar court, dervishes, Armenians of Julfa, workers at Susa, the Dieulafoys | 151 |
| VI | Beyond Persia | Spain and Portugal, France, and the antiquities of the album “Divers” | 196 |

**How to visit the study.** Drag to look around, scroll or pinch to zoom, right-drag or the arrow keys to move, and click
the floor to walk there. The buttons at the bottom go to the overview, the table, the library, the window and the
plan, or open an album (I–VI). **Click an album** and the others move aside while it opens in front of you: the
inside of its front board carries its introduction, and every leaf after that is a scan of a real album page.
Turn the pages with **‹ ›**, the arrow keys, a swipe, or a click on a blank leaf. **Click a page**, or **Look
closer** on the card, for the deep-zoom viewer, with the full INHA caption and a link to the page at INHA.
**The study**, **The six albums**, **INHA albums** and **Search** open the reading panel.

**Links.** `#album3` (or `#susa`, `#people`…) opens an album, `#page-62747-15` (INHA album id, page) opens the
right album at that page, and `#library`, `#window`… go to a view.

## The INHA albums

| Album | Shelf mark | INHA record |
| --- | --- | --- |
| Perse 1 | 4 PHOT 018 (1) | <https://bibliotheque-numerique.inha.fr/idurl/1/62746> |
| Perse 2 | 4 PHOT 018 (2) | <https://bibliotheque-numerique.inha.fr/idurl/1/62742> |
| Perse 3 | 4 PHOT 018 (3) | <https://bibliotheque-numerique.inha.fr/idurl/1/62745> |
| Perse 4 | 4 PHOT 018 (4) | <https://bibliotheque-numerique.inha.fr/idurl/1/62743> |
| Perse 5 | 4 PHOT 018 (5) | <https://bibliotheque-numerique.inha.fr/idurl/1/62747> |
| Perse 6 | 4 PHOT 018 (6) | <https://bibliotheque-numerique.inha.fr/idurl/1/62754> |
| Espagne et Portugal | 4 PHOT 017 | <https://bibliotheque-numerique.inha.fr/idurl/1/62737> |
| Divers | 4 PHOT 019 | <https://bibliotheque-numerique.inha.fr/idurl/1/62750> |

The albums mix photographs by Jane and Marcel Dieulafoy with prints from others: the Sémiramis mission led by
Louis Lapicque (Perse 3 and 4), Charles Babin and Frédéric Houssay (Perse 6), and studios such as Mansell and
Neurdein (Divers). The museum shows each page with the photographers named in the INHA record of its album.

## Run it on your computer

The page uses ES modules, so open it through a local server rather than by double-clicking `index.html`:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The images come from the INHA server, so you need an internet connection.

## Publish it with GitHub Pages

In the repository, open **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and
`/ (root)`, and save. After a minute the museum is at `https://moarthist.github.io/dieulafoy/`.

## How the pages are sorted

`js/data.js` is generated by `tools/build_data.py`. The script downloads the IIIF manifest of each album, keeps
every page that has a catalogue caption (covers, endpapers and blank pages are left out), and hangs it in a room:

1. the album *Espagne et Portugal* and the album *Divers* go to album VI, except the Sasanian and Achaemenid
   objects of *Divers*, which go to album III;
2. other pages go to the album whose keywords (in `ROOMS`) match their caption most often;
3. `OVERRIDES` fixes the pages where the words mislead, for example the apadana of Persepolis, which would
   otherwise land in Susa.

To move a page to another album, add it to `OVERRIDES` as `(INHA album id, page): 'subject'` and run the script again:

```bash
python3 tools/build_data.py
```

## Edit the text

All the writing is in `js/content.js`: the introduction (`MUSEUM`), the six chapters or albums (`ROOMS`: title,
subtitle, colour and introduction) and the notes on the INHA albums (`ALBUM_NOTES`). Both the catalogue and the
study read it.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The catalogue: desk, book, page bar, search sheet and viewer |
| `css/catalogue.css` | The catalogue’s styles: covers, endpapers, paper, type, page turning |
| `js/catalogue.js` | The catalogue: builds and numbers the pages, turns them, search, viewer, links |
| `study.html` | The 3D study: stage, masthead, menus, album bar, reading panel, card, viewer, welcome card |
| `css/museum.css` | Interface styles of the 3D study |
| `js/main.js` | Renderer, camera views, navigation, opening albums, clicking and the loop |
| `js/study.js` | The room: walls, bookcases and books, window, table, chair, lamp, globe, chandelier, rug, lights |
| `js/albums.js` | The six albums: covers, opening and closing, page turning, and loading the scans |
| `js/textures.js` | Procedural textures (parquet, damask, lacquer, leather) and the texts drawn on canvases |
| `js/ui.js` | View buttons, album bar and card, reading panel, pins and the deep-zoom viewer |
| `js/content.js` | **All the text** |
| `js/data.js` | Generated list of albums and pages, with their captions and subjects |
| `tools/build_data.py` | Builds `js/data.js` from the INHA manifests |
| `assets/carpet.jpg` | Photograph of the Persian rug, from the Representing Persia room |
| `vendor/` | three.js r160 (MIT licence) and OpenSeadragon 4.1.1 (BSD licence), so no CDN is needed |

## Credits

Developed by **Mahmoud Mohammadi**, MA Visual Arts – Arts, Museology and Curatorship, University of Bologna.

Scans and captions: Bibliothèque de l’INHA, collections Jacques Doucet, public domain. This project is
independent and is not affiliated with the INHA. Built with [three.js](https://threejs.org/) (MIT) and [OpenSeadragon](https://openseadragon.github.io/) (BSD).
