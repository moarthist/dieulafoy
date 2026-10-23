// The catalogue: a book of numbered plates, read a spread at a time (one page on a phone),
// with turning pages. Front matter, six chapters, a concordance with the INHA albums, a colophon.
import { ALBUMS, ITEMS } from './data.js';
import { MUSEUM, ROOMS, ALBUM_NOTES } from './content.js';

const IIIF = 'https://bibliotheque-numerique.inha.fr/i/?IIIF=';
const INHA = 'https://bibliotheque-numerique.inha.fr';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const PER_PAGE = 2;
const FLIP_MS = 900;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const albumById = Object.fromEntries(ALBUMS.map((a) => [a.id, a]));
const img = (it, size) => `${IIIF}${albumById[it.a].iiif}${it.f}.tif/full/${size}/0/default.jpg`;
const info = (it) => `${IIIF}${albumById[it.a].iiif}${it.f}.tif/info.json`;
const inhaPage = (it) => `${INHA}/viewer/${it.a}/?offset=#page=${it.p}&viewer=picture`;
const parts = (it) => it.c.split(/\s+;\s+/).map((s) => s.replace(/^\[+|\]+$/g, '').trim()).filter(Boolean);

// ---- the entries, numbered through the book ------------------------------------------
let no = 0;
const chapters = ROOMS.map((room, ci) => {
  const c = { room, ci, entries: [] };
  ITEMS.filter((it) => it.r === room.id).forEach((it) => c.entries.push({ it, no: ++no, ch: c }));
  c.first = c.entries[0].no;
  c.last = c.entries[c.entries.length - 1].no;
  return c;
});
const entries = chapters.flatMap((c) => c.entries);

// ---- the pages -----------------------------------------------------------------------
// Page 0 is the front cover, alone on the right. After it, odd pages are versos (left) and
// even pages rectos (right). Chapters and the concordance open on a recto, as in print.
const pages = [];
const add = (p) => { pages.push(p); return pages.length - 1; };
const toRecto = () => { if (pages.length % 2) add({ t: 'blank' }); };
add({ t: 'cover' });
add({ t: 'endpaper' });
add({ t: 'title' });
add({ t: 'imprint' });
const contentsPage = add({ t: 'contents' });
add({ t: 'intro', part: 1 });
add({ t: 'intro', part: 2 });
chapters.forEach((c) => {
  toRecto();
  c.page = add({ t: 'chapter', c });
  for (let k = 0; k < c.entries.length; k += PER_PAGE) {
    const list = c.entries.slice(k, k + PER_PAGE);
    const p = add({ t: 'plates', c, list });
    list.forEach((e) => { e.page = p; });
  }
});
toRecto();
const concordancePage = add({ t: 'concordance', part: 1 });
add({ t: 'concordance', part: 2 });
const colophonPage = add({ t: 'colophon' });
toRecto();
add({ t: 'endpaper' });
add({ t: 'back' });
const LAST = pages.length - 1;

// ---- page content --------------------------------------------------------------------
const orn = '<span class="orn" aria-hidden="true">❦</span>';
const rule = '<span class="rule" aria-hidden="true"><i></i>✦<i></i></span>';
function runningHead(p, page) {
  if (p % 2) return '<span class="sc">Catalogue of the Photographs</span>';
  if (page.c) return `<span class="sc">${ROMAN[page.c.ci]}. ${esc(page.c.room.title)}</span>`;
  if (page.t === 'intro') return '<span class="sc">Introduction</span>';
  if (page.t === 'concordance') return '<span class="sc">Concordance</span>';
  return '<span class="sc">Jane Dieulafoy</span>';
}
const frame = (p, page, body, cls = '') => `
  <div class="page ${p % 2 ? 'verso' : 'recto'} ${cls}" data-p="${p}">
    <header class="rh">${runningHead(p, page)}</header>
    <div class="pg-body">${body}</div>
    <footer class="fo">${p}</footer>
  </div>`;

function ranges(nums) {
  const out = [];
  nums.sort((a, b) => a - b).forEach((n) => {
    const last = out[out.length - 1];
    if (last && n === last[1] + 1) last[1] = n; else out.push([n, n]);
  });
  return out.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ');
}

function pageHTML(p) {
  const page = pages[p];
  if (!page) return '';
  switch (page.t) {
    case 'cover': return `
      <div class="page cover" data-p="${p}">
        <div class="cv-frame">
          <p class="cv-top sc">Bibliothèque de l’Institut national d’histoire de l’art</p>
          ${rule}
          <p class="cv-a">A Catalogue of the</p>
          <h1 class="cv-title">Photographs</h1>
          <p class="cv-of">of</p>
          <p class="cv-name">Jane Dieulafoy</p>
          ${rule}
          <p class="cv-sub">Persia · Susiana · Chaldaea · Spain · France</p>
          <p class="cv-dates sc">mdccclxxx — mcmxv</p>
          <p class="cv-hint">Open the cover ›</p>
        </div>
      </div>`;
    case 'back': return `<div class="page cover back" data-p="${p}"><div class="cv-frame"><p class="cv-orn">❦</p></div></div>`;
    case 'endpaper': return `<div class="page endpaper" data-p="${p}"></div>`;
    case 'blank': return `<div class="page ${p % 2 ? 'verso' : 'recto'} blank" data-p="${p}"></div>`;
    case 'title': return `
      <div class="page recto titlepage" data-p="${p}">
        <p class="tp-a sc">A Catalogue of the</p>
        <h1 class="tp-title">Photographs</h1>
        <p class="tp-of">of</p>
        <p class="tp-name">Jane Dieulafoy</p>
        <p class="tp-dates">1851 – 1916</p>
        ${rule}
        <p class="tp-desc">Seven hundred and seventy-four plates from the Dieulafoy albums of the Bibliothèque de l’INHA, collections Jacques Doucet, arranged in six chapters, with a concordance.</p>
        ${orn}
        <p class="tp-imp sc">Paris · Bologna</p>
        <p class="tp-year">MMXXVI</p>
      </div>`;
    case 'imprint': return `
      <div class="page verso imprint" data-p="${p}">
        <div class="im-body">
          <p>${esc(MUSEUM.rights)}</p>
          <p>The plates reproduce scans of whole album pages, served by the image server of the INHA. Click any plate to see its scan at full resolution, with the catalogue caption of the library.</p>
          <p class="im-credit">Catalogue compiled by <b>${esc(MUSEUM.credit.name)}</b><br>${MUSEUM.credit.lines.map(esc).join('<br>')}</p>
          <p class="im-small">Set in EB Garamond and IM Fell English.</p>
        </div>
      </div>`;
    case 'contents': return frame(p, page, `
      <h2 class="h-sec">Contents</h2>
      ${rule}
      <ol class="toc">
        <li><a data-go-page="5"><span>Introduction</span><i></i><b>5</b></a></li>
        ${chapters.map((c) => `
          <li class="toc-ch"><a data-go-page="${c.page}"><span><em>${ROMAN[c.ci]}.</em> ${esc(c.room.title)}<small>${esc(c.room.subtitle)} · Nos. ${c.first}–${c.last}</small></span><i></i><b>${c.page}</b></a></li>`).join('')}
        <li><a data-go-page="${concordancePage}"><span>Concordance with the INHA albums</span><i></i><b>${concordancePage}</b></a></li>
        <li><a data-go-page="${colophonPage}"><span>Colophon</span><i></i><b>${colophonPage}</b></a></li>
      </ol>`, 'contents');
    case 'intro': {
      const body = page.part === 1
        ? `<h2 class="h-sec">Introduction</h2>${rule}
           <p class="dropcap">${esc(MUSEUM.intro[0])}</p><p>${esc(MUSEUM.intro[1])}</p>`
        : `<p>${esc(MUSEUM.intro[2])}</p>
           <h3 class="h-sub">A note on the photographs</h3><p>${esc(MUSEUM.caveat)}</p>
           <h3 class="h-sub">How the catalogue is arranged</h3>
           <p>The plates are numbered from 1 to ${entries.length} in six chapters, by subject. Each caption gives the catalogue caption of the INHA, the album and its page, and the shelf mark. The concordance at the end leads from each INHA album to its plates.</p>
           ${orn}`;
      return frame(p, page, body, 'text');
    }
    case 'chapter': {
      const c = page.c;
      return frame(p, page, `
        <p class="ch-no sc">Chapter ${ROMAN[c.ci]}</p>
        <h2 class="ch-title">${esc(c.room.title)}</h2>
        <p class="ch-sub">${esc(c.room.subtitle)}</p>
        ${rule}
        ${c.room.text.map((t, i) => `<p class="${i ? '' : 'dropcap'}">${esc(t)}</p>`).join('')}
        <p class="ch-range sc">Plates ${c.first} – ${c.last}</p>`, 'chapter');
    }
    case 'plates': return frame(p, page, page.list.map((e) => {
      const ps = parts(e.it), al = albumById[e.it.a];
      return `
        <figure class="plate" data-no="${e.no}" tabindex="0" role="button" aria-label="Plate ${e.no}: ${esc(ps[0] || '')}. Open at full size.">
          <div class="pl-frame"><img alt="" loading="eager" decoding="async" src="${img(e.it, '!900,900')}"></div>
          <figcaption>
            <span class="pl-no">${e.no}.</span>
            <span class="pl-t">${esc(ps[0] || 'Untitled page')}${ps.length > 1 ? `; ${esc(ps.slice(1).join('; '))}` : ''}.</span>
            <span class="pl-src">Album <i>${esc(al.name)}</i>, p. ${e.it.p} · INHA, ${esc(al.shelf)}</span>
          </figcaption>
        </figure>`;
    }).join(''), 'plates');
    case 'concordance': {
      const list = page.part === 1 ? ALBUMS.slice(0, 4) : ALBUMS.slice(4);
      return frame(p, page, `
        ${page.part === 1 ? `<h2 class="h-sec">Concordance</h2>${rule}<p class="cc-intro">From each album of the INHA to the plates of this catalogue.</p>` : ''}
        <dl class="cc">
          ${list.map((a) => {
            const nums = entries.filter((e) => e.it.a === a.id).map((e) => e.no);
            return `
            <dt><span class="sc">${esc(a.name)}</span> <small>${esc(a.shelf)} · ${esc(a.dates)} · <a href="${INHA}/idurl/1/${a.id}" target="_blank" rel="noopener">record ↗</a></small></dt>
            <dd><i>${esc(ALBUM_NOTES[a.id].makers)}.</i> ${nums.length} plates: Nos. ${ranges(nums)}.</dd>`;
          }).join('')}
        </dl>`, 'concordance');
    }
    case 'colophon': return frame(p, page, `
      <h2 class="h-sec">Colophon</h2>
      ${rule}
      <p>This catalogue gathers every captioned page of the eight Dieulafoy albums kept at the Bibliothèque de l’Institut national d’histoire de l’art in Paris, collections Jacques Doucet: Perse 1 to 6, Espagne et Portugal, and Divers.</p>
      <p>${esc(MUSEUM.rights)}</p>
      <p>The same pages can be visited as six albums on the table of a library study, in three dimensions: <a href="study.html">open the study</a>.</p>
      ${orn}
      <p class="colo-credit">Compiled by <b>${esc(MUSEUM.credit.name)}</b><br>${MUSEUM.credit.lines.map(esc).join('<br>')}</p>`, 'text');
    default: return '';
  }
}

// ---- layout ----------------------------------------------------------------------------
const book = $('book');
const slotL = $('slot-l'), slotR = $('slot-r');
let single = false;
function layout() {
  const W = window.innerWidth, H = window.innerHeight;
  const top = document.querySelector('.top').offsetHeight, bar = document.querySelector('.bar').offsetHeight;
  const availW = W - (W < 700 ? 16 : 64), availH = H - top - bar - (W < 700 ? 20 : 40);
  const ratio = 0.7;
  const wasSingle = single;
  single = availW < 760 || availW / availH < 1.15;
  const pw = Math.floor(single ? Math.min(availW, availH * ratio) : Math.min(availW / 2, availH * ratio));
  book.style.setProperty('--pw', `${pw}px`);
  book.style.setProperty('--ph', `${Math.floor(pw / ratio)}px`);
  book.style.fontSize = `${(pw / 31).toFixed(2)}px`;
  book.classList.toggle('single', single);
  if (wasSingle !== single) show(pos, false);
  edges();
}

// ---- position and rendering --------------------------------------------------------------
// In two-page view `pos` is the page on the right of the open spread (or the left, at the end).
let pos = 0, busy = false;
const spreadOf = (p) => (p === 0 ? 0 : Math.ceil(p / 2));
const pagesOf = (s) => (s === 0 ? [null, 0] : [2 * s - 1, 2 * s <= LAST ? 2 * s : null]);
const SPREADS = spreadOf(LAST) + 1;

// A slot keeps its page element if it already shows that page, so nothing is drawn twice.
function fill(slot, p) {
  const cur = slot.firstElementChild;
  if (!(p != null && cur && +cur.dataset.p === p)) slot.innerHTML = p == null ? '' : pageHTML(p);
  slot.classList.toggle('empty', p == null);
}
const take = (slot) => slot.firstElementChild || document.createElement('div');
const node = (p) => { const t = document.createElement('template'); t.innerHTML = p == null ? '<div></div>' : pageHTML(p).trim(); return t.content.firstElementChild; };
function makeLeaf(cls, front, rear) {
  const leaf = document.createElement('div');
  leaf.className = `leaf ${cls}`;
  const f = document.createElement('div'), r = document.createElement('div');
  f.className = 'face front';
  r.className = 'face rear';
  f.append(front);
  r.append(rear);
  leaf.append(f, r);
  return leaf;
}
function show(p, announce = true) {
  pos = Math.max(0, Math.min(LAST, p));
  if (single) {
    fill(slotR, pos);
    slotL.innerHTML = '';
  } else {
    const [l, r] = pagesOf(spreadOf(pos));
    fill(slotL, l);
    fill(slotR, r);
  }
  book.classList.toggle('closed', !single && pos === 0);
  book.classList.toggle('at-end', !single && spreadOf(pos) === SPREADS - 1);
  edges();
  status();
  preload();
  if (announce) history.replaceState(null, '', `#p${pos}`);
}
function edges() {
  const done = single ? pos : spreadOf(pos) * 2, left = LAST - done;
  book.style.setProperty('--el', `${Math.min(14, done / 26).toFixed(1)}px`);
  book.style.setProperty('--er', `${Math.min(14, left / 26).toFixed(1)}px`);
}
function status() {
  const scrub = $('scrub');
  scrub.max = single ? LAST : SPREADS - 1;
  scrub.value = single ? pos : spreadOf(pos);
  const [l, r] = single ? [null, pos] : pagesOf(spreadOf(pos));
  const nums = [l, r].filter((x) => x != null && x > 0);
  const page = pages[r ?? l];
  const where = page && page.c ? ` · ${ROMAN[page.c.ci]}. ${page.c.room.title}` : '';
  $('folio').textContent = pos === 0 ? 'Cover' : `${nums.length > 1 ? 'pp.' : 'p.'} ${nums.join('–')}${where}`;
}
// fetch the next and previous spreads' scans, so they are ready when the page turns
const warmed = new Set();
function preload() {
  const around = single ? [pos + 1, pos + 2, pos - 1] : [...pagesOf(spreadOf(pos) + 1), ...pagesOf(Math.max(0, spreadOf(pos) - 1))];
  around.forEach((p) => {
    const pg = pages[p];
    if (!pg || pg.t !== 'plates') return;
    pg.list.forEach((e) => {
      const u = img(e.it, '!900,900');
      if (warmed.has(u)) return;
      warmed.add(u);
      const im = new Image();
      im.src = u;
    });
  });
}

// ---- turning pages ------------------------------------------------------------------------
function turn(dir) {
  if (busy) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (single) {
    const n = pos + dir;
    if (n < 0 || n > LAST) return;
    if (reduce) { show(n); return; }
    busy = true;
    const blank = node(null);
    blank.className = 'page verso blank';
    let leaf;
    if (dir > 0) {
      leaf = makeLeaf('single-leaf fwd', take(slotR), blank);
      fill(slotR, n);
    } else {
      leaf = makeLeaf('single-leaf back', node(n), blank);
    }
    book.append(leaf);
    finishFlip(leaf, () => {
      if (dir < 0) slotR.replaceChildren(leaf.querySelector('.front').firstElementChild);
      show(n);
    });
    return;
  }
  const s = spreadOf(pos), n = s + dir;
  if (n < 0 || n >= SPREADS) return;
  const next = n === 0 ? 0 : Math.min(LAST, 2 * n);
  if (reduce) { show(next); return; }
  busy = true;
  const [l1, r1] = pagesOf(n);
  // the page being turned leaves its slot and rides on the leaf; its back is the next page
  const leaf = dir > 0 ? makeLeaf('fwd', take(slotR), node(l1)) : makeLeaf('back', take(slotL), node(r1));
  if (dir > 0) fill(slotR, r1); else fill(slotL, l1);
  if (n === 0) book.classList.remove('closed');
  book.classList.add('turning');
  book.append(leaf);
  finishFlip(leaf, () => {
    const landed = leaf.querySelector('.rear').firstElementChild;
    (dir > 0 ? slotL : slotR).replaceChildren(landed);
    show(next);
  });
}
function finishFlip(leaf, done) {
  requestAnimationFrame(() => requestAnimationFrame(() => leaf.classList.add('go')));
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    done();
    leaf.remove();
    book.classList.remove('turning');
    busy = false;
  };
  leaf.addEventListener('transitionend', (e) => { if (e.target === leaf) end(); });
  setTimeout(end, FLIP_MS + 200);
}
function goPage(p, flash) {
  if (busy) return;
  const target = Math.max(0, Math.min(LAST, p));
  const same = single ? target === pos : spreadOf(target) === spreadOf(pos);
  if (!same) {
    const step = single ? target - pos : spreadOf(target) - spreadOf(pos);
    if (Math.abs(step) === 1) { turn(step); setTimeout(() => highlight(flash), FLIP_MS + 50); return; }
    book.classList.add('jump');
    setTimeout(() => { show(target); book.classList.remove('jump'); highlight(flash); }, 180);
    return;
  }
  highlight(flash);
}
function highlight(no) {
  if (!no) return;
  const el = book.querySelector(`.slot .plate[data-no="${no}"]`);
  if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
}

// ---- controls ------------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'next') turn(1);
    else if (a === 'prev') turn(-1);
    else if (a === 'search') openSearch();
    else if (a === 'close-search') closeSearch();
    return;
  }
  const go = e.target.closest('[data-go-page]');
  if (go) { e.preventDefault(); goPage(+go.dataset.goPage); return; }
  const tgo = e.target.closest('[data-go]');
  if (tgo && tgo.dataset.go === 'contents') { goPage(contentsPage); return; }
  const plate = e.target.closest('.slot .plate');
  if (plate) { openViewer(+plate.dataset.no); return; }
  if (e.target.closest('.slot .cover') && pos === 0) turn(1);
});
book.addEventListener('keydown', (e) => {
  const plate = e.target.closest('.plate');
  if (plate && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openViewer(+plate.dataset.no); }
});
document.addEventListener('keydown', (e) => {
  if (!$('viewer').hidden || !$('search').hidden || e.target.closest('input')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); turn(1); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); turn(-1); }
  if (e.key === 'Home') goPage(0);
  if (e.key === 'End') goPage(LAST);
  if (e.key === '/') { e.preventDefault(); openSearch(); }
});
const scrub = $('scrub');
scrub.addEventListener('input', () => {
  const v = +scrub.value;
  const p = single ? v : (v === 0 ? 0 : 2 * v);
  const pg = pages[Math.min(LAST, p)];
  $('folio').textContent = `Go to p. ${Math.min(LAST, p)}${pg && pg.c ? ` · ${ROMAN[pg.c.ci]}. ${pg.c.room.title}` : ''}`;
});
scrub.addEventListener('change', () => { const v = +scrub.value; goPage(single ? v : (v === 0 ? 0 : 2 * v)); });
// swipe on touch screens
let sw = null;
book.addEventListener('touchstart', (e) => { if (e.touches.length === 1) sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; }, { passive: true });
book.addEventListener('touchend', (e) => {
  if (!sw) return;
  const dx = e.changedTouches[0].clientX - sw.x, dy = e.changedTouches[0].clientY - sw.y;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - sw.t < 700) turn(dx < 0 ? 1 : -1);
  sw = null;
});

// ---- search --------------------------------------------------------------------------------
function openSearch() {
  $('search').hidden = false;
  $('q').focus();
  runSearch();
}
function closeSearch() { $('search').hidden = true; }
function runSearch() {
  const q = $('q').value, words = fold(q).split(/\s+/).filter(Boolean);
  const list = $('results');
  if (q.trim().length < 2) { $('hits').textContent = `${entries.length} plates. Type at least two letters.`; list.innerHTML = ''; return; }
  const found = entries.filter((e) => { const k = fold(`${e.it.c} ${albumById[e.it.a].name} ${e.ch.room.title}`); return words.every((w) => k.includes(w)); });
  $('hits').textContent = `${found.length} plate${found.length === 1 ? '' : 's'}`;
  list.innerHTML = found.slice(0, 150).map((e) => `
    <li><button type="button" data-hit="${e.no}">
      <img alt="" loading="lazy" src="${img(e.it, '!160,120')}">
      <span><b>${e.no}.</b> ${esc(parts(e.it)[0] || '')}<small>${ROMAN[e.ch.ci]}. ${esc(e.ch.room.title)} · p. ${e.page}</small></span>
    </button></li>`).join('') + (found.length > 150 ? '<li class="more">Showing the first 150. Add a word to narrow the search.</li>' : '');
}
$('q').addEventListener('input', runSearch);
$('results').addEventListener('click', (e) => {
  const b = e.target.closest('[data-hit]');
  if (!b) return;
  const en = entries[+b.dataset.hit - 1];
  closeSearch();
  goPage(en.page, en.no);
});
$('search').addEventListener('click', (e) => { if (e.target === $('search')) closeSearch(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('search').hidden) closeSearch(); });

// ---- the viewer -----------------------------------------------------------------------------
let osd = null, viewing = null, opener = null;
function openViewer(n) {
  const e = entries[n - 1];
  if (!e) return;
  const v = $('viewer'), al = albumById[e.it.a], ps = parts(e.it);
  if (v.hidden) opener = document.activeElement;
  viewing = e;
  v.hidden = false;
  $('v-no').textContent = `Plate ${e.no} · Chapter ${ROMAN[e.ch.ci]}, ${e.ch.room.title}`;
  $('v-title').textContent = ps[0] || 'Untitled page';
  $('v-meta').innerHTML = `
    ${ps.length > 1 ? `<div><dt>On this page</dt><dd><ol>${ps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></dd></div>` : ''}
    <div><dt>Album</dt><dd>${esc(al.name)}, page ${e.it.p}</dd></div>
    <div><dt>Shelf mark</dt><dd>INHA, ${esc(al.shelf)}</dd></div>
    <div><dt>Photographers</dt><dd>${esc(ALBUM_NOTES[al.id].makers)}</dd></div>
    <div><dt>Scan</dt><dd>${e.it.w} × ${e.it.h} px · public domain</dd></div>
    <div><dt>Catalogue caption</dt><dd lang="fr">${esc(e.it.c)}</dd></div>`;
  $('v-actions').innerHTML = `
    <a class="vbtn solid" href="${inhaPage(e.it)}" target="_blank" rel="noopener">Open at INHA ↗</a>
    <a class="vbtn" href="${img(e.it, 'max')}" target="_blank" rel="noopener">Full-size image ↗</a>`;
  v.querySelector('[data-v="prev"]').disabled = e.no <= 1;
  v.querySelector('[data-v="next"]').disabled = e.no >= entries.length;
  if (!osd && window.OpenSeadragon) {
    osd = window.OpenSeadragon({
      element: $('v-osd'), showNavigationControl: false, crossOriginPolicy: 'Anonymous',
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      visibilityRatio: 0.6, minZoomImageRatio: 0.8, maxZoomPixelRatio: 3, animationTime: 0.6,
    });
  }
  osd?.open(info(e.it));
  v.querySelector('[data-v="close"]').focus({ preventScroll: true });
}
function closeViewer() {
  $('viewer').hidden = true;
  osd?.close();
  if (viewing) {
    const target = viewing.page;
    if (single ? target !== pos : spreadOf(target) !== spreadOf(pos)) show(target);
    highlight(viewing.no);
  }
  opener?.focus?.({ preventScroll: true });
}
$('viewer').addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  const k = b.dataset.v;
  if (k === 'close') closeViewer();
  else if (k === 'prev' && viewing) openViewer(viewing.no - 1);
  else if (k === 'next' && viewing) openViewer(viewing.no + 1);
  else if (osd && k === 'zoomin') osd.viewport.zoomBy(1.6);
  else if (osd && k === 'zoomout') osd.viewport.zoomBy(1 / 1.6);
  else if (osd && k === 'home') osd.viewport.goHome();
});
document.addEventListener('keydown', (e) => {
  if ($('viewer').hidden) return;
  if (e.key === 'Escape') closeViewer();
  if (e.key === 'ArrowRight' && viewing) openViewer(viewing.no + 1);
  if (e.key === 'ArrowLeft' && viewing) openViewer(viewing.no - 1);
});

// ---- start ----------------------------------------------------------------------------------
// Links: #p24 opens page 24, #no214 plate 214, #contents the contents.
function fromHash() {
  const h = location.hash.slice(1);
  let m = h.match(/^p(\d+)$/);
  if (m) return { page: +m[1] };
  m = h.match(/^no(\d+)$/);
  if (m && entries[+m[1] - 1]) return { page: entries[+m[1] - 1].page, no: +m[1] };
  if (h === 'contents') return { page: contentsPage };
  return null;
}
window.addEventListener('resize', () => layout());
window.addEventListener('hashchange', () => { const t = fromHash(); if (t) goPage(t.page, t.no); });
layout();
const start = fromHash();
show(start ? start.page : 0, false);
if (start && start.no) setTimeout(() => highlight(start.no), 300);
// show the book once the fonts are in, or after a moment in any case
const ready = () => book.classList.add('ready');
document.fonts?.ready.then(ready);
setTimeout(ready, 400);
