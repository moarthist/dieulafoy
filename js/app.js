import { ALBUMS, ITEMS } from './data.js';
import { MUSEUM, ROOMS, ALBUM_NOTES } from './content.js';

const IIIF = 'https://bibliotheque-numerique.inha.fr/i/?IIIF=';
const INHA = 'https://bibliotheque-numerique.inha.fr';

const albumById = Object.fromEntries(ALBUMS.map((a) => [a.id, a]));
const roomById = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
const keyOf = (it) => `${it.a}-${it.p}`;
const itemByKey = Object.fromEntries(ITEMS.map((it) => [keyOf(it), it]));
const itemsIn = (roomId) => ITEMS.filter((it) => it.r === roomId);

const app = document.getElementById('app');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

function img(it, size) {
  return `${IIIF}${albumById[it.a].iiif}${it.f}.tif/full/${size}/0/default.jpg`;
}
function info(it) {
  return `${IIIF}${albumById[it.a].iiif}${it.f}.tif/info.json`;
}
function inhaPage(it) {
  return `${INHA}/viewer/${it.a}/?offset=#page=${it.p}&viewer=picture`;
}
function parts(it) {
  return it.c.split(/\s+;\s+/).map((s) => s.replace(/^\[+|\]+$/g, '').trim()).filter(Boolean);
}
function title(it) {
  return parts(it)[0] || 'Untitled page';
}
function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch { /* storage may be unavailable */ }
  return null;
}

// ---------- shell ----------

function renderBar(active) {
  document.getElementById('bar-rooms').innerHTML = ROOMS.map((r) => `
    <a href="#/room/${r.id}" class="${r.id === active ? 'on' : ''}" style="--c:${r.color}" title="Room ${r.n}: ${esc(r.title)}">
      <i></i><span>${r.n}</span><em>${esc(r.title)}</em></a>`).join('');
}

function footer() {
  return `
  <footer class="foot">
    <div>
      <p class="foot-mark">Dieulafoy <span>Photographs</span></p>
      <p>${esc(MUSEUM.rights)}</p>
    </div>
    <p class="credit">Developed by <strong>${esc(MUSEUM.credit.name)}</strong><br>${MUSEUM.credit.lines.map(esc).join('<br>')}</p>
  </footer>`;
}

// ---------- lobby ----------

function plan() {
  // A floor plan: six rooms on either side of a hall, entered from the west.
  return `
  <div class="plan" role="list">
    ${ROOMS.map((r) => {
      const hero = itemByKey[r.hero.join('-')];
      return `
      <a class="plan-room plan-${r.n}" role="listitem" href="#/room/${r.id}" style="--c:${r.color}">
        <img alt="" loading="lazy" src="${img(hero, '!480,480')}">
        <span class="plan-n">${pad(r.n)}</span>
        <span class="plan-t">${esc(r.title)}</span>
        <span class="plan-c">${itemsIn(r.id).length} pages</span>
      </a>`;
    }).join('')}
    <div class="plan-hall"><span>Hall</span></div>
    <div class="plan-door">Entrance</div>
  </div>`;
}

function renderLobby() {
  const portrait = itemByKey['62745-63'];
  const total = ITEMS.length;
  app.innerHTML = `
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">A micro museum · INHA albums · 1880–1915</p>
      <h1>Jane Dieulafoy<em>The Photographs</em></h1>
      <p class="lede">${esc(MUSEUM.tagline)}</p>
      <div class="cta">
        <a class="btn solid" href="#/walk">Walk through in 3D</a>
        <a class="btn" href="#/room/${ROOMS[0].id}">Enter Room 1</a>
        <a class="btn" href="#plan">Floor plan</a>
      </div>
      <dl class="stats">
        <div><dt>${ALBUMS.length}</dt><dd>albums</dd></div>
        <div><dt>${total}</dt><dd>album pages</dd></div>
        <div><dt>${ROOMS.length}</dt><dd>rooms</dd></div>
      </dl>
    </div>
    <figure class="hero-fig">
      <button type="button" class="frame" data-open="${keyOf(portrait)}" data-list="all">
        <img alt="${esc(title(portrait))}" src="${img(portrait, '!900,1100')}">
      </button>
      <figcaption>${esc(title(portrait))}. Album Perse 3, page ${portrait.p}.</figcaption>
    </figure>
  </section>

  <section class="intro">
    <div class="intro-cols">
      ${MUSEUM.intro.map((p) => `<p>${esc(p)}</p>`).join('')}
    </div>
    <p class="note">${esc(MUSEUM.caveat)}</p>
  </section>

  <section class="plan-wrap" id="plan">
    <header class="sec-head">
      <p class="eyebrow">Floor plan</p>
      <h2>Six rooms</h2>
    </header>
    ${plan()}
  </section>

  <section class="room-list">
    ${ROOMS.map((r) => {
      const list = itemsIn(r.id);
      const strip = [0.12, 0.3, 0.5, 0.7, 0.9].map((f) => list[Math.floor(f * (list.length - 1))]);
      return `
      <a class="room-row" href="#/room/${r.id}" style="--c:${r.color}">
        <span class="rr-n">${pad(r.n)}</span>
        <span class="rr-t"><strong>${esc(r.title)}</strong><em>${esc(r.subtitle)}</em></span>
        <span class="rr-strip">${strip.map((it) => `<img alt="" loading="lazy" src="${img(it, '!260,200')}">`).join('')}</span>
        <span class="rr-go">${list.length} pages &rarr;</span>
      </a>`;
    }).join('')}
  </section>
  ${footer()}`;
  setList('all', ITEMS);
}

// ---------- room ----------

function renderRoom(room, view) {
  const list = itemsIn(room.id);
  const hero = itemByKey[room.hero.join('-')];
  const next = ROOMS[room.n % ROOMS.length];
  const counts = ALBUMS.map((a) => [a, list.filter((it) => it.a === a.id).length]).filter(([, n]) => n);
  view = view || store('dieulafoy.view') || 'wall';
  document.documentElement.style.setProperty('--room', room.color);
  document.documentElement.style.setProperty('--room-ink', room.ink);

  app.innerHTML = `
  <section class="entrance" style="--c:${room.color}">
    <div class="wall-text">
      <p class="eyebrow">Room ${pad(room.n)} / ${pad(ROOMS.length)}</p>
      <h1>${esc(room.title)}</h1>
      <p class="sub">${esc(room.subtitle)}</p>
      ${room.text.map((p) => `<p>${esc(p)}</p>`).join('')}
      <p class="from">${list.length} album pages from ${counts.map(([a, n]) => `${esc(a.name)} (${n})`).join(', ')}.</p>
    </div>
    <figure class="entrance-fig">
      <button type="button" class="frame" data-open="${keyOf(hero)}" data-list="${room.id}">
        <img alt="${esc(title(hero))}" src="${img(hero, '!1100,900')}">
      </button>
      <figcaption>${esc(title(hero))}</figcaption>
    </figure>
  </section>

  <div class="room-tools">
    <div class="seg" role="tablist" aria-label="View">
      <button type="button" role="tab" data-view="wall" aria-selected="${view === 'wall'}">Gallery wall</button>
      <button type="button" role="tab" data-view="index" aria-selected="${view === 'index'}">Index</button>
    </div>
    <label class="search" ${view === 'wall' ? 'hidden' : ''}>
      <span class="sr">Search captions</span>
      <input type="search" id="q" placeholder="Search captions in this room">
    </label>
    <p class="pos" id="pos" ${view === 'wall' ? '' : 'hidden'}></p>
    <a class="btn small walk-link" href="#/walk/${room.id}">Walk this room in 3D</a>
  </div>

  <section class="gallery" id="gallery">${view === 'wall' ? wall(list, next) : grid(list)}</section>

  <a class="next-room" href="#/room/${next.id}" style="--c:${next.color}">
    <span>Next · Room ${pad(next.n)}</span><strong>${esc(next.title)} &rarr;</strong>
  </a>
  ${footer()}`;

  setList(room.id, list);
  app.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    store('dieulafoy.view', b.dataset.view);
    renderRoom(room, b.dataset.view);
    document.querySelector('.room-tools').scrollIntoView({ block: 'start' });
  }));
  if (view === 'wall') wireWall(list.length);
  else wireGrid(room, list);
}

function wall(list, next) {
  return `
  <div class="wall" id="wall" tabindex="0" aria-label="Gallery wall. Scroll or use the arrow keys to walk along it.">
    <div class="wall-track">
      ${list.map((it, i) => {
        const r = it.w / it.h;
        return `
        <figure class="hang" style="--r:${r.toFixed(3)}">
          <button type="button" class="frame" data-open="${keyOf(it)}" aria-label="Open ${esc(title(it))}">
            <img alt="" data-src="${img(it, '!900,700')}">
          </button>
          <figcaption class="label">
            <span class="label-n">${pad(i + 1)}</span>
            <strong>${esc(title(it))}</strong>
            ${parts(it).length > 1 ? `<span class="label-more">+ ${parts(it).length - 1} more on this page</span>` : ''}
            <span class="label-src">${esc(albumById[it.a].name)}, p. ${it.p}</span>
          </figcaption>
        </figure>`;
      }).join('')}
      <a class="doorway" href="#/room/${next.id}" style="--c:${next.color}">
        <span>Room ${pad(next.n)}</span><strong>${esc(next.title)}</strong><em>Continue &rarr;</em>
      </a>
    </div>
  </div>
  <div class="wall-nav">
    <button type="button" data-step="-1" aria-label="Walk left">&larr;</button>
    <div class="track-bar"><i id="bar-fill"></i></div>
    <button type="button" data-step="1" aria-label="Walk right">&rarr;</button>
  </div>`;
}

function wireWall(count) {
  const el = document.getElementById('wall');
  const fill = document.getElementById('bar-fill');
  const pos = document.getElementById('pos');
  const frames = [...el.querySelectorAll('.hang')];
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const im = e.target.querySelector('img[data-src]');
    if (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); im.addEventListener('load', () => im.classList.add('in'), { once: true }); }
    io.unobserve(e.target);
  }), { root: el, rootMargin: '0px 1600px' });
  frames.forEach((f) => io.observe(f));

  const update = () => {
    const max = el.scrollWidth - el.clientWidth;
    fill.style.width = `${max > 0 ? (el.scrollLeft / max) * 100 : 0}%`;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let i = frames.findIndex((f) => f.offsetLeft + f.offsetWidth > mid);
    if (i < 0) i = count - 1;
    pos.textContent = `${pad(i + 1)} / ${pad(count)}`;
  };
  el.addEventListener('scroll', update, { passive: true });
  update();

  // A vertical wheel walks along the wall.
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const max = el.scrollWidth - el.clientWidth;
    if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY * 1.4;
  }, { passive: false });

  const step = (d) => el.scrollBy({ left: d * el.clientWidth * 0.75, behavior: 'smooth' });
  document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => step(+b.dataset.step)));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
}

function grid(list) {
  return `<div class="grid" id="grid">${list.map(card).join('')}</div>
  <p class="empty" id="empty" hidden>No page matches.</p>`;
}

function card(it) {
  const room = roomById[it.r];
  return `
  <button type="button" class="card" data-open="${keyOf(it)}" data-k="${esc((it.c + ' ' + albumById[it.a].name).toLowerCase())}" style="--c:${room.color}">
    <span class="card-img"><img alt="" loading="lazy" src="${img(it, '!420,360')}"></span>
    <span class="card-t">${esc(title(it))}</span>
    <span class="card-s">${esc(albumById[it.a].name)}, p. ${it.p}${parts(it).length > 1 ? ` · ${parts(it).length} prints` : ''}</span>
  </button>`;
}

function filterCards(container, q, empty) {
  const words = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
  let shown = 0;
  container.querySelectorAll('.card').forEach((c) => {
    const k = c.dataset.k.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const ok = words.every((w) => k.includes(w));
    c.hidden = !ok;
    if (ok) shown += 1;
  });
  if (empty) empty.hidden = shown > 0;
  return shown;
}

function wireGrid(room, list) {
  const q = document.getElementById('q');
  const g = document.getElementById('grid');
  q.addEventListener('input', () => {
    filterCards(g, q.value, document.getElementById('empty'));
    setList(room.id, list.filter((it) => !g.querySelector(`[data-open="${keyOf(it)}"]`).hidden));
  });
}

// ---------- albums ----------

function renderAlbums() {
  document.documentElement.style.setProperty('--room', '#161412');
  app.innerHTML = `
  <section class="albums-head">
    <p class="eyebrow">The catalogue</p>
    <h1>Eight albums</h1>
    <p class="lede">The Dieulafoy albums of the INHA library, collections Jacques Doucet. The bar under each album shows where its pages hang in the museum.</p>
    <ul class="legend">${ROOMS.map((r) => `<li style="--c:${r.color}"><i></i>${r.n}. ${esc(r.title)}</li>`).join('')}</ul>
  </section>
  <section class="albums">
    ${ALBUMS.map((a) => {
      const list = ITEMS.filter((it) => it.a === a.id);
      const note = ALBUM_NOTES[a.id];
      const cover = list[Math.min(2, list.length - 1)];
      return `
      <article class="album">
        <button type="button" class="album-cover" data-open="${keyOf(cover)}" data-list="all"><img alt="" loading="lazy" src="${img(cover, '!600,460')}"></button>
        <div class="album-body">
          <p class="eyebrow">${esc(a.shelf)} · ${esc(a.dates)}</p>
          <h2>${esc(a.name)}</h2>
          <p>${esc(note.text)}</p>
          <dl>
            <div><dt>Photographers</dt><dd>${esc(note.makers)}</dd></div>
            <div><dt>Object</dt><dd>${esc(a.format)}</dd></div>
            <div><dt>In the museum</dt><dd>${list.length} captioned pages of ${a.pages} scans</dd></div>
          </dl>
          <div class="mix">${ROOMS.map((r) => {
            const n = list.filter((it) => it.r === r.id).length;
            return n ? `<a href="#/room/${r.id}" style="--c:${r.color};flex:${n}" title="${n} in ${esc(r.title)}"></a>` : '';
          }).join('')}</div>
          <a class="btn small" href="${INHA}/idurl/1/${a.id}" target="_blank" rel="noopener">Album record at INHA ↗</a>
        </div>
      </article>`;
    }).join('')}
  </section>
  <section class="search-all">
    <header class="sec-head">
      <p class="eyebrow">Search</p>
      <h2>Every caption</h2>
    </header>
    <label class="search wide"><span class="sr">Search all captions</span>
      <input type="search" id="qa" placeholder="Try Ispahan, pont, derviche, frise, Salamanque…"></label>
    <p class="hits" id="hits"></p>
    <div class="grid" id="grid-all"></div>
  </section>
  ${footer()}`;

  setList('all', ITEMS);
  const q = document.getElementById('qa');
  const g = document.getElementById('grid-all');
  const hits = document.getElementById('hits');
  const run = () => {
    const v = q.value.trim();
    if (v.length < 2) { g.innerHTML = ''; hits.textContent = `${ITEMS.length} pages. Type at least two letters.`; return; }
    if (!g.childElementCount) g.innerHTML = ITEMS.map(card).join('');
    const n = filterCards(g, v);
    hits.textContent = `${n} page${n === 1 ? '' : 's'} match “${v}”.`;
    setList('all', ITEMS.filter((it) => !g.querySelector(`[data-open="${keyOf(it)}"]`).hidden));
  };
  q.addEventListener('input', run);
  run();
}

// ---------- viewer ----------

const lists = {};
let currentList = 'all';
function setList(name, list) { lists[name] = list; currentList = name; }

const viewer = document.getElementById('viewer');
let osd = null;
let open = null;
let lastFocus = null;

function show(key, listName) {
  const it = itemByKey[key];
  if (!it) return;
  if (listName && lists[listName]) currentList = listName;
  const list = lists[currentList] || ITEMS;
  const i = list.indexOf(it);
  const room = roomById[it.r];
  const album = albumById[it.a];
  open = it;
  if (viewer.hidden) lastFocus = document.activeElement;
  viewer.hidden = false;
  viewer.style.setProperty('--c', room.color);
  document.body.classList.add('locked');

  document.getElementById('v-room').innerHTML = `<a href="#/room/${room.id}">Room ${pad(room.n)} · ${esc(room.title)}</a>`;
  document.getElementById('v-title').textContent = title(it);
  const ps = parts(it);
  document.getElementById('v-meta').innerHTML = `
    ${ps.length > 1 ? `<div class="v-prints"><dt>On this page</dt><dd><ol>${ps.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></dd></div>` : ''}
    <div><dt>Album</dt><dd>${esc(album.name)}, page ${it.p}</dd></div>
    <div><dt>Shelf mark</dt><dd>INHA, ${esc(album.shelf)}</dd></div>
    <div><dt>Photographers</dt><dd>${esc(ALBUM_NOTES[album.id].makers)}</dd></div>
    <div><dt>Scan</dt><dd>${it.w} × ${it.h} px · public domain</dd></div>
    <div><dt>Catalogue caption</dt><dd lang="fr">${esc(it.c)}</dd></div>`;
  document.getElementById('v-actions').innerHTML = `
    <a class="btn solid small" href="${inhaPage(it)}" target="_blank" rel="noopener">Open at INHA ↗</a>
    <a class="btn small" href="${img(it, 'max')}" target="_blank" rel="noopener">Full-size image ↗</a>`;
  document.getElementById('v-count').textContent = i >= 0 ? `${i + 1} of ${list.length}` : '';
  viewer.querySelector('.v-prev').disabled = i <= 0;
  viewer.querySelector('.v-next').disabled = i < 0 || i >= list.length - 1;

  if (!osd && window.OpenSeadragon) {
    osd = window.OpenSeadragon({
      element: document.getElementById('v-osd'),
      showNavigationControl: false,
      crossOriginPolicy: 'Anonymous',
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      visibilityRatio: 0.6,
      minZoomImageRatio: 0.8,
      maxZoomPixelRatio: 3,
      animationTime: 0.6,
    });
  }
  if (osd) osd.open(info(it));
  viewer.querySelector('.v-close').focus({ preventScroll: true });
}

function hide() {
  viewer.hidden = true;
  open = null;
  document.body.classList.remove('locked');
  if (osd) osd.close();
  if (lastFocus) lastFocus.focus({ preventScroll: true });
}

function move(d) {
  if (!open) return;
  const list = lists[currentList] || ITEMS;
  const i = list.indexOf(open);
  const nx = list[i + d];
  if (nx) show(keyOf(nx));
}

viewer.addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  const v = b.dataset.v;
  if (v === 'close') hide();
  else if (v === 'prev') move(-1);
  else if (v === 'next') move(1);
  else if (osd && v === 'zoomin') osd.viewport.zoomBy(1.6);
  else if (osd && v === 'zoomout') osd.viewport.zoomBy(1 / 1.6);
  else if (osd && v === 'home') osd.viewport.goHome();
});
document.addEventListener('keydown', (e) => {
  if (viewer.hidden) return;
  if (e.key === 'Escape') hide();
  if (e.key === 'ArrowRight') move(1);
  if (e.key === 'ArrowLeft') move(-1);
});
app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]');
  if (b) show(b.dataset.open, b.dataset.list);
});
viewer.querySelector('#v-room').addEventListener('click', (e) => { if (e.target.closest('a')) hide(); });

// ---------- walk-through ----------

let stopWalk = null;

function renderWalk(roomId) {
  document.body.classList.add('walking');
  app.innerHTML = `
  <section class="walk" id="walk">
    <canvas class="w-gl" tabindex="0" aria-label="3D gallery. Drag to look, arrow keys or W A S D to walk, click a photograph to open it."></canvas>
    <div class="w-top">
      <p class="w-room"></p>
      <nav class="w-rooms" aria-label="Go to room">${ROOMS.map((r, i) => `<button type="button" data-go="${i}" style="--c:${r.color}" title="${esc(r.title)}">${r.n}</button>`).join('')}</nav>
    </div>
    <div class="w-cross" aria-hidden="true"></div>
    <div class="w-label" hidden></div>
    <canvas class="w-map" title="Plan: click to go there"></canvas>
    <div class="w-intro">
      <p class="eyebrow">Walk-through</p>
      <h1>Six rooms, ${ITEMS.length} frames</h1>
      <ul>
        <li><b>Look</b> drag with the mouse or a finger</li>
        <li><b>Walk</b> arrow keys or W A S D (Shift to hurry), or click the floor</li>
        <li><b>Open</b> click a photograph</li>
        <li><b>Jump</b> keys 1 to 6, or the room buttons</li>
      </ul>
      <button type="button" class="btn solid w-start">Start walking</button>
    </div>
    <p class="w-loading">Building the rooms…</p>
  </section>`;
  const el = document.getElementById('walk');
  const startRoom = Math.max(0, ROOMS.findIndex((r) => r.id === roomId));
  import('./walk.js').then(async (m) => {
    if (!document.body.contains(el)) return;
    const stop = await m.start(el, {
      ITEMS, ROOMS, img, title, startRoom,
      albumName: (it) => albumById[it.a].name,
      show, setList, credit: MUSEUM.credit,
    });
    if (!document.body.contains(el)) { stop(); return; }
    stopWalk = stop;
    el.classList.add('ready');
  }).catch((err) => {
    el.querySelector('.w-loading').textContent = `The 3D rooms could not start in this browser (${err.message}). Try the gallery walls instead.`;
  });
}

// ---------- router ----------

function route() {
  const [, page, arg] = (location.hash || '#/').split('/');
  if (!viewer.hidden) hide();
  if (stopWalk) { stopWalk(); stopWalk = null; }
  document.body.classList.remove('walking');
  document.documentElement.style.removeProperty('--room');
  document.documentElement.style.removeProperty('--room-ink');
  if (page === 'walk') {
    renderBar(null);
    renderWalk(arg);
    document.title = 'Walk-through · Jane Dieulafoy';
    window.scrollTo(0, 0);
  } else if (page === 'room' && roomById[arg]) {
    renderBar(arg);
    renderRoom(roomById[arg]);
    document.title = `Room ${roomById[arg].n}: ${roomById[arg].title} · Jane Dieulafoy`;
    window.scrollTo(0, 0);
  } else if (page === 'albums') {
    renderBar(null);
    renderAlbums();
    document.title = 'Albums · Jane Dieulafoy';
    window.scrollTo(0, 0);
  } else if (location.hash === '#plan') {
    if (!app.querySelector('#plan')) { renderBar(null); renderLobby(); }
    document.getElementById('plan').scrollIntoView();
  } else {
    renderBar(null);
    renderLobby();
    document.title = MUSEUM.title;
    window.scrollTo(0, 0);
  }
  app.focus({ preventScroll: true });
}

window.addEventListener('hashchange', route);
route();
