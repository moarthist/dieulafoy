// Interface layer over the study: view buttons, the bar and card of an open album, the reading
// panel, pins over the albums, and the full-screen deep-zoom viewer.
import * as THREE from 'three';
import { MUSEUM, ALBUM_NOTES } from './content.js';
import { ROMAN } from './textures.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function parts(it) {
  return it.c.split(/\s+;\s+/).map((s) => s.replace(/^\[+|\]+$/g, '').trim()).filter(Boolean);
}
export const title = (it) => parts(it)[0] || 'Untitled page';

export class UI {
  constructor(opts) {
    Object.assign(this, opts);
    this.albumById = Object.fromEntries(this.albums.map((a) => [a.id, a]));
    this.items = this.books.albums.flatMap((b) => b.items);
    this.reader = $('reader');
    this.card = $('frame-card');
    this.bar = $('album-bar');
    this.pins = [];
    this.pinsOn = true;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.buildToolbar();
    this.buildReader();
    this.buildViewer();
    this.bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bar]');
      if (!b) return;
      if (b.dataset.bar === 'close') this.onClose();
      else this.onTurn(+b.dataset.bar);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !$('viewer').hidden) return;
      if (!this.reader.hidden) this.closeReader();
    });
  }

  // ---------------------------------------------------------------- toolbar
  buildToolbar() {
    const bar = $('views');
    Object.entries(this.views).forEach(([id, v]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn view-btn';
      b.dataset.view = id;
      b.textContent = v.label;
      b.addEventListener('click', () => this.onView(id));
      bar.append(b);
    });
    this.books.albums.forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn view-btn';
      b.dataset.book = a.i;
      b.innerHTML = `<i style="background:${a.room.color}"></i>${ROMAN[a.i]}`;
      b.title = `Album ${ROMAN[a.i]}: ${a.room.title}`;
      b.addEventListener('click', () => this.onBook(a.i, 0));
      bar.insertBefore(b, bar.querySelector('[data-view="plan"]'));
    });
    $('read-menu').querySelectorAll('[data-read]').forEach((b) => b.addEventListener('click', () => this.openReader(b.dataset.read, b)));
  }

  setActiveView(id) {
    $('views').querySelectorAll('.view-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
  }

  setPins(on) {
    this.pinsOn = on;
    this.pins.forEach((p) => p.el.classList.toggle('is-hidden', !on));
  }

  // ---------------------------------------------------------------- the open album
  showBook(a, spread, pages = []) {
    document.body.classList.toggle('book-open', !!a);
    const where = $('where');
    if (!a) {
      this.bar.hidden = true;
      this.card.hidden = true;
      where.innerHTML = '';
      return;
    }
    where.innerHTML = `<i style="background:${a.room.color}"></i>Album ${ROMAN[a.i]} · ${esc(a.room.title)}`;
    const first = 2 * spread, last = Math.min(a.items.length, 2 * spread + 1);
    const label = spread === 0 ? 'Introduction' : first === last ? `Page ${first} of ${a.items.length}` : `Pages ${first}–${last} of ${a.items.length}`;
    this.bar.hidden = false;
    this.bar.style.setProperty('--c', a.room.color);
    this.bar.innerHTML = `
      <button type="button" class="btn" data-bar="close" aria-label="Close the album">✕ Close</button>
      <button type="button" class="btn turn" data-bar="-1" aria-label="Previous pages" ${spread === 0 ? 'disabled' : ''}>‹</button>
      <span class="ab-label"><strong>${ROMAN[a.i]} · ${esc(a.room.title)}</strong><em>${label}</em></span>
      <button type="button" class="btn turn" data-bar="1" aria-label="Next pages" ${spread >= a.spreads - 1 ? 'disabled' : ''}>›</button>`;
    if (!pages.length) { this.card.hidden = true; return; }
    this.card.hidden = false;
    this.card.style.setProperty('--c', a.room.color);
    this.card.innerHTML = `
      <p class="kicker">On these pages</p>
      ${pages.map((p) => {
        const it = p.it, album = this.albumById[it.a], ps = parts(it);
        return `
        <section class="pc">
          <h3><span>${p.k + 1}</span>${esc(ps[0] || 'Untitled page')}</h3>
          ${ps.length > 1 ? `<p>Also: ${ps.slice(1).map(esc).join('; ')}.</p>` : ''}
          <p class="fine">INHA, ${esc(album.name)}, page ${it.p} · ${esc(ALBUM_NOTES[album.id].makers)}</p>
          <div class="card-actions">
            <button type="button" class="btn accent" data-zoom="${it.a}-${it.p}">Look closer</button>
            <a class="btn" href="${this.inhaPage(it)}" target="_blank" rel="noopener">INHA ↗</a>
          </div>
        </section>`;
      }).join('')}`;
    this.card.querySelectorAll('[data-zoom]').forEach((b) => {
      b.onclick = () => this.openViewer(this.items.find((it) => `${it.a}-${it.p}` === b.dataset.zoom));
    });
  }

  // ---------------------------------------------------------------- reading panel
  buildReader() {
    this.reader.innerHTML = `
      <div class="reader-bar">
        <div class="reader-tabs" role="tablist" aria-label="Texts">
          ${[['about', 'The study'], ['books', 'The six albums'], ['catalogue', 'INHA albums'], ['search', 'Search']].map(([id, l]) => `<button type="button" class="reader-tab" role="tab" data-id="${id}">${l}</button>`).join('')}
        </div>
        <button type="button" class="reader-close" aria-label="Close">✕</button>
      </div>
      <div class="reader-body" tabindex="-1"></div>`;
    this.reader.querySelectorAll('.reader-tab').forEach((b) => b.addEventListener('click', () => this.openReader(b.dataset.id, this.readerOpener)));
    this.reader.querySelector('.reader-close').addEventListener('click', () => this.closeReader());
    this.reader.addEventListener('click', (e) => {
      const ob = e.target.closest('[data-open-book]');
      if (ob) { this.onBook(+ob.dataset.openBook, 0); if (window.innerWidth < 760) this.closeReader(); }
      const oi = e.target.closest('[data-item]');
      if (oi) { this.onItem(this.items.find((it) => `${it.a}-${it.p}` === oi.dataset.item)); if (window.innerWidth < 760) this.closeReader(); }
    });
  }

  openReader(id, opener) {
    this.readerOpener = opener || this.readerOpener;
    this.reader.hidden = false;
    requestAnimationFrame(() => this.reader.classList.add('is-open'));
    document.body.classList.add('reader-open');
    this.reader.querySelectorAll('.reader-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === id)));
    const body = this.reader.querySelector('.reader-body');
    body.innerHTML = this[`page_${id}`]();
    body.scrollTop = 0;
    if (id === 'search') { this.wireSearch(body); body.querySelector('input').focus(); }
  }

  closeReader() {
    this.reader.classList.remove('is-open');
    document.body.classList.remove('reader-open');
    setTimeout(() => { if (!this.reader.classList.contains('is-open')) this.reader.hidden = true; }, 300);
    this.readerOpener?.focus?.({ preventScroll: true });
  }

  page_about() {
    return `
      <p class="kicker">A library study</p>
      <h2 class="r-title">Jane Dieulafoy <em>The Photographs</em></h2>
      <p class="r-dates">1851–1916</p>
      ${MUSEUM.intro.slice(0, 2).map((p, i) => (i ? `<p>${esc(p)}</p>` : `<p class="r-lead">${esc(p)}</p>`)).join('')}
      <p>On the table lie six albums, one for each part of the collection. Together they hold every captioned page of the eight Dieulafoy albums kept at the INHA library, ${this.items.length} pages in all, each a scan of a real album page.</p>
      <h3>Whose photographs</h3>
      <p>${esc(MUSEUM.caveat)}</p>
      <h3>How to visit</h3>
      <ul class="plain">
        <li><b>Drag</b> to look around, <b>scroll</b> or pinch to zoom, <b>right-drag</b> or the arrow keys to move. Click the floor to walk there.</li>
        <li><b>Click an album</b> to open it. Turn the pages with <b>‹ ›</b>, the arrow keys, a swipe, or by clicking a blank leaf.</li>
        <li><b>Click a page</b>, or <b>Look closer</b>, to see the scan at full resolution.</li>
      </ul>
      <p class="r-ref">${esc(MUSEUM.rights)}<br><br>Developed by <strong>${esc(MUSEUM.credit.name)}</strong><br>${MUSEUM.credit.lines.map(esc).join('<br>')}</p>`;
  }

  page_books() {
    return this.books.albums.map((a) => `
      <section class="r-room" style="--c:${a.room.color}">
        <p class="kicker">Album ${ROMAN[a.i]} · ${a.items.length} pages</p>
        <h2 class="r-title">${esc(a.room.title)}</h2>
        <p class="r-dates">${esc(a.room.subtitle)}</p>
        ${a.room.text.map((p) => `<p>${esc(p)}</p>`).join('')}
        <button type="button" class="btn" data-open-book="${a.i}">Open album ${ROMAN[a.i]}</button>
      </section>`).join('');
  }

  page_catalogue() {
    return `
      <p class="kicker">The sources</p>
      <h2 class="r-title">Eight albums at the INHA</h2>
      <p class="r-lead">Bibliothèque de l’INHA, collections Jacques Doucet. Their pages are shared out among the six albums on the table by subject.</p>
      ${this.albums.map((a) => {
        const list = this.items.filter((it) => it.a === a.id);
        const where = [...new Set(list.map((it) => this.books.albums.find((b) => b.room.id === it.r).i))].sort();
        return `
        <section class="r-album">
          <h3>${esc(a.name)} <span>${esc(a.shelf)} · ${esc(a.dates)}</span></h3>
          <p>${esc(ALBUM_NOTES[a.id].text)}</p>
          <dl class="dates">
            <dt>Photographers</dt><dd>${esc(ALBUM_NOTES[a.id].makers)}</dd>
            <dt>Object</dt><dd>${esc(a.format)}</dd>
            <dt>On the table</dt><dd>${list.length} pages, in album${where.length > 1 ? 's' : ''} ${where.map((i) => ROMAN[i]).join(', ')}</dd>
          </dl>
          <div class="r-actions">
            <button type="button" class="btn" data-item="${list[0].a}-${list[0].p}">See its first page</button>
            <a class="btn ghost" href="https://bibliotheque-numerique.inha.fr/idurl/1/${a.id}" target="_blank" rel="noopener">INHA record ↗</a>
          </div>
        </section>`;
      }).join('')}`;
  }

  page_search() {
    return `
      <p class="kicker">Search</p>
      <h2 class="r-title">Every caption</h2>
      <label class="r-search"><span class="sr">Search all captions</span>
        <input type="search" placeholder="Ispahan, pont, derviche, frise, Salamanque…"></label>
      <p class="r-hits"></p>
      <ol class="r-results"></ol>`;
  }

  wireSearch(body) {
    const input = body.querySelector('input');
    const hits = body.querySelector('.r-hits');
    const list = body.querySelector('.r-results');
    const run = () => {
      const words = fold(input.value).split(/\s+/).filter(Boolean);
      if (!words.length || input.value.trim().length < 2) { hits.textContent = `${this.items.length} pages. Type at least two letters.`; list.innerHTML = ''; return; }
      const found = this.items.filter((it) => { const k = fold(`${it.c} ${this.albumById[it.a].name}`); return words.every((w) => k.includes(w)); });
      hits.textContent = `${found.length} page${found.length === 1 ? '' : 's'}`;
      list.innerHTML = found.slice(0, 120).map((it) => {
        const b = this.books.albums.find((x) => x.room.id === it.r);
        return `
        <li><button type="button" data-item="${it.a}-${it.p}" style="--c:${b.room.color}">
          <img alt="" loading="lazy" src="${this.img(it, '!160,120')}">
          <span><strong>${esc(title(it))}</strong><em>Album ${ROMAN[b.i]} · INHA ${esc(this.albumById[it.a].name)}, p. ${it.p}</em></span>
        </button></li>`;
      }).join('') + (found.length > 120 ? '<li class="r-more">Showing the first 120. Add a word to narrow the search.</li>' : '');
    };
    input.addEventListener('input', run);
    run();
  }

  // ---------------------------------------------------------------- pins
  addPin({ label, pos, normal, color, activate }) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pin';
    el.innerHTML = `<span class="pin-dot" style="${color ? `background:${color}` : ''}"></span><span class="pin-label">${esc(label)}</span>`;
    el.addEventListener('click', () => activate(el));
    $('pins').append(el);
    this.pins.push({ el, pos, normal, hidden: false });
  }

  updatePins(camera, width, height) {
    const cam = camera.position;
    for (const p of this.pins) {
      this.tmp.copy(p.pos).project(camera);
      const toCam = this.tmp2.copy(cam).sub(p.pos);
      const d = toCam.length();
      const visible = this.pinsOn && toCam.dot(p.normal) > 0.05 && this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.05 && Math.abs(this.tmp.y) < 1.05 && d < 14;
      if (!visible) {
        if (!p.hidden) { p.el.classList.add('is-hidden'); p.hidden = true; }
        continue;
      }
      if (p.hidden) { p.el.classList.remove('is-hidden'); p.hidden = false; }
      const x = (this.tmp.x * 0.5 + 0.5) * width, y = (-this.tmp.y * 0.5 + 0.5) * height;
      p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      p.el.classList.toggle('is-far', d > 1.6); // labels show on hover, or right next to an album
    }
  }

  // ---------------------------------------------------------------- deep-zoom viewer
  buildViewer() {
    const v = $('viewer');
    v.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]');
      if (!b) return;
      const k = b.dataset.v;
      if (k === 'close') this.closeViewer();
      else if (k === 'prev' || k === 'next') this.stepViewer(k === 'next' ? 1 : -1);
      else if (this.osd && k === 'zoomin') this.osd.viewport.zoomBy(1.6);
      else if (this.osd && k === 'zoomout') this.osd.viewport.zoomBy(1 / 1.6);
      else if (this.osd && k === 'home') this.osd.viewport.goHome();
    });
    document.addEventListener('keydown', (e) => {
      if (v.hidden) return;
      if (e.key === 'Escape') { e.stopPropagation(); this.closeViewer(); }
      if (e.key === 'ArrowRight') { e.stopPropagation(); this.stepViewer(1); }
      if (e.key === 'ArrowLeft') { e.stopPropagation(); this.stepViewer(-1); }
    }, true);
  }

  bookOf(it) { return this.books.albums.find((b) => b.room.id === it.r); }

  stepViewer(d) {
    const b = this.bookOf(this.viewing);
    const nx = b.items[b.items.indexOf(this.viewing) + d];
    if (nx) this.openViewer(nx);
  }

  openViewer(it) {
    if (!it) return;
    const v = $('viewer');
    const album = this.albumById[it.a];
    const b = this.bookOf(it);
    const k = b.items.indexOf(it);
    this.viewing = it;
    if (v.hidden) this.viewerOpener = document.activeElement;
    v.hidden = false;
    v.style.setProperty('--c', b.room.color);
    $('v-room').textContent = `Album ${ROMAN[b.i]} · ${b.room.title} · page ${k + 1} of ${b.items.length}`;
    $('v-title').textContent = title(it);
    const ps = parts(it);
    $('v-meta').innerHTML = `
      ${ps.length > 1 ? `<div><dt>On this page</dt><dd><ol>${ps.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></dd></div>` : ''}
      <div><dt>INHA album</dt><dd>${esc(album.name)}, page ${it.p}</dd></div>
      <div><dt>Shelf mark</dt><dd>INHA, ${esc(album.shelf)}</dd></div>
      <div><dt>Photographers</dt><dd>${esc(ALBUM_NOTES[album.id].makers)}</dd></div>
      <div><dt>Scan</dt><dd>${it.w} × ${it.h} px · public domain</dd></div>
      <div><dt>Catalogue caption</dt><dd lang="fr">${esc(it.c)}</dd></div>`;
    $('v-actions').innerHTML = `
      <a class="btn accent" href="${this.inhaPage(it)}" target="_blank" rel="noopener">Open at INHA ↗</a>
      <a class="btn" href="${this.img(it, 'max')}" target="_blank" rel="noopener">Full-size image ↗</a>`;
    $('v-count').textContent = '← → to move through the album · Esc to return to the table';
    v.querySelector('[data-v="prev"]').disabled = k <= 0;
    v.querySelector('[data-v="next"]').disabled = k >= b.items.length - 1;
    if (!this.osd && window.OpenSeadragon) {
      this.osd = window.OpenSeadragon({
        element: $('v-osd'), showNavigationControl: false, crossOriginPolicy: 'Anonymous',
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
        visibilityRatio: 0.6, minZoomImageRatio: 0.8, maxZoomPixelRatio: 3, animationTime: 0.6,
      });
    }
    this.osd?.open(this.info(it));
    v.querySelector('[data-v="close"]').focus({ preventScroll: true });
  }

  closeViewer() {
    $('viewer').hidden = true;
    this.osd?.close();
    // leave the album open at the page last seen
    if (this.viewing) this.onItem(this.viewing);
    this.viewerOpener?.focus?.({ preventScroll: true });
  }
}
