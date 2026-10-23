// Interface layer over the 3D building: view buttons, reading panel, frame card, pins and the
// full-screen deep-zoom viewer.
import * as THREE from 'three';
import { MUSEUM, ROOMS, ALBUM_NOTES } from './content.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function parts(it) {
  return it.c.split(/\s+;\s+/).map((s) => s.replace(/^\[+|\]+$/g, '').trim()).filter(Boolean);
}
export const title = (it) => parts(it)[0] || 'Untitled page';

export class UI {
  constructor({ views, albums, frames, img, info, inhaPage, onView, onFrame }) {
    Object.assign(this, { views, albums, frames, img, info, inhaPage, onView, onFrame });
    this.albumById = Object.fromEntries(albums.map((a) => [a.id, a]));
    this.reader = $('reader');
    this.card = $('frame-card');
    this.pins = [];
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.buildToolbar();
    this.buildReader();
    this.buildViewer();
    document.addEventListener('keydown', (e) => {
      if (!$('viewer').hidden) return;
      if (e.key === 'Escape') {
        if (!this.reader.hidden) this.closeReader();
        else if (!this.card.hidden) this.closeCard();
      }
      if (!this.card.hidden && this.current && !e.target.closest('input')) {
        if (e.key === ']' || e.key === '.') this.onFrame(this.current.k + 1);
        if (e.key === '[' || e.key === ',') this.onFrame(this.current.k - 1);
      }
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
      if (v.room) {
        b.innerHTML = `<i style="background:${v.room.color}"></i>${v.room.n}`;
        b.title = `Room ${v.room.n}: ${v.room.title}`;
      } else b.textContent = v.label;
      b.addEventListener('click', () => this.onView(id));
      bar.append(b);
    });
    $('read-menu').querySelectorAll('[data-read]').forEach((b) => b.addEventListener('click', () => this.openReader(b.dataset.read, b)));
  }

  setActiveView(id) {
    $('views').querySelectorAll('.view-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
  }

  setRoom(room) {
    const el = $('where');
    if (!room) { el.innerHTML = '<i style="background:#1f1a16"></i>Hall'; return; }
    el.innerHTML = `<i style="background:${room.color}"></i>Room ${pad(room.n)} · ${esc(room.title)}`;
  }

  // ---------------------------------------------------------------- reading panel
  buildReader() {
    this.reader.innerHTML = `
      <div class="reader-bar">
        <div class="reader-tabs" role="tablist" aria-label="Texts">
          ${[['about', 'The museum'], ['rooms', 'Rooms'], ['albums', 'Albums'], ['search', 'Search']].map(([id, l]) => `<button type="button" class="reader-tab" role="tab" data-id="${id}">${l}</button>`).join('')}
        </div>
        <button type="button" class="reader-close" aria-label="Close">✕</button>
      </div>
      <div class="reader-body" tabindex="-1"></div>`;
    this.reader.querySelectorAll('.reader-tab').forEach((b) => b.addEventListener('click', () => this.openReader(b.dataset.id, this.readerOpener)));
    this.reader.querySelector('.reader-close').addEventListener('click', () => this.closeReader());
    this.reader.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) { this.onView(go.dataset.go); if (window.innerWidth < 760) this.closeReader(); }
      const fr = e.target.closest('[data-frame]');
      if (fr) { this.onFrame(+fr.dataset.frame); if (window.innerWidth < 760) this.closeReader(); }
    });
  }

  openReader(id, opener, roomId) {
    this.readerOpener = opener || this.readerOpener;
    this.reader.hidden = false;
    requestAnimationFrame(() => this.reader.classList.add('is-open'));
    document.body.classList.add('reader-open');
    this.reader.querySelectorAll('.reader-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === id)));
    const body = this.reader.querySelector('.reader-body');
    body.innerHTML = this[`page_${id}`]();
    body.scrollTop = 0;
    if (id === 'search') this.wireSearch(body);
    if (roomId) body.querySelector(`#r-${roomId}`)?.scrollIntoView({ block: 'start' });
    if (id === 'search') body.querySelector('input').focus();
  }

  closeReader() {
    this.reader.classList.remove('is-open');
    document.body.classList.remove('reader-open');
    setTimeout(() => { if (!this.reader.classList.contains('is-open')) this.reader.hidden = true; }, 300);
    this.readerOpener?.focus?.({ preventScroll: true });
  }

  page_about() {
    return `
      <p class="kicker">A micro museum</p>
      <h2 class="r-title">Jane Dieulafoy <em>The Photographs</em></h2>
      <p class="r-dates">1851–1916</p>
      ${MUSEUM.intro.map((p, i) => (i ? `<p>${esc(p)}</p>` : `<p class="r-lead">${esc(p)}</p>`)).join('')}
      <h3>Whose photographs</h3>
      <p>${esc(MUSEUM.caveat)}</p>
      <h3>How to visit</h3>
      <ul class="plain">
        <li><b>Drag</b> to look around, <b>scroll</b> or pinch to zoom, <b>right-drag</b> or the arrow keys to move.</li>
        <li>Click the floor to walk there, and a frame to stand in front of it.</li>
        <li>The buttons at the bottom take you to the hall, to each room, or above the building.</li>
      </ul>
      <p class="r-ref">${esc(MUSEUM.rights)}<br><br>Developed by <strong>${esc(MUSEUM.credit.name)}</strong><br>${MUSEUM.credit.lines.map(esc).join('<br>')}</p>`;
  }

  page_rooms() {
    return ROOMS.map((r) => {
      const n = this.frames.filter((f) => f.room === r).length;
      return `
      <section class="r-room" id="r-${r.id}" style="--c:${r.color}">
        <p class="kicker">Room ${pad(r.n)} · ${n} album pages</p>
        <h2 class="r-title">${esc(r.title)}</h2>
        <p class="r-dates">${esc(r.subtitle)}</p>
        ${r.text.map((p) => `<p>${esc(p)}</p>`).join('')}
        <button type="button" class="btn" data-go="room${r.n}">Go to Room ${r.n}</button>
      </section>`;
    }).join('');
  }

  page_albums() {
    return `
      <p class="kicker">The catalogue</p>
      <h2 class="r-title">Eight albums</h2>
      <p class="r-lead">Bibliothèque de l’INHA, collections Jacques Doucet. Every captioned page hangs in the museum.</p>
      ${this.albums.map((a) => {
        const list = this.frames.filter((f) => f.it.a === a.id);
        const first = list[0];
        return `
        <section class="r-album">
          <h3>${esc(a.name)} <span>${esc(a.shelf)} · ${esc(a.dates)}</span></h3>
          <p>${esc(ALBUM_NOTES[a.id].text)}</p>
          <dl class="dates">
            <dt>Photographers</dt><dd>${esc(ALBUM_NOTES[a.id].makers)}</dd>
            <dt>Object</dt><dd>${esc(a.format)}</dd>
            <dt>In the museum</dt><dd>${list.length} pages, in ${[...new Set(list.map((f) => `Room ${f.room.n}`))].join(', ')}</dd>
          </dl>
          <div class="r-actions">
            <button type="button" class="btn" data-frame="${first.k}">See its first page</button>
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
      if (!words.length || input.value.trim().length < 2) { hits.textContent = `${this.frames.length} pages. Type at least two letters.`; list.innerHTML = ''; return; }
      const found = this.frames.filter((f) => { const k = fold(`${f.it.c} ${this.albumById[f.it.a].name}`); return words.every((w) => k.includes(w)); });
      hits.textContent = `${found.length} page${found.length === 1 ? '' : 's'}`;
      list.innerHTML = found.slice(0, 120).map((f) => `
        <li><button type="button" data-frame="${f.k}" style="--c:${f.room.color}">
          <img alt="" loading="lazy" src="${this.img(f.it, '!160,120')}">
          <span><strong>${esc(title(f.it))}</strong><em>Room ${f.room.n} · ${esc(this.albumById[f.it.a].name)}, p. ${f.it.p}</em></span>
        </button></li>`).join('') + (found.length > 120 ? '<li class="r-more">Showing the first 120. Add a word to narrow the search.</li>' : '');
    };
    input.addEventListener('input', run);
    run();
  }

  // ---------------------------------------------------------------- frame card
  openCard(f) {
    this.current = f;
    const album = this.albumById[f.it.a];
    const ps = parts(f.it);
    this.card.hidden = false;
    this.card.style.setProperty('--c', f.room.color);
    this.card.innerHTML = `
      <button type="button" class="card-close" aria-label="Close">✕</button>
      <p class="kicker">Room ${pad(f.room.n)} · ${f.i + 1} of ${f.count}</p>
      <h3>${esc(ps[0] || 'Untitled page')}</h3>
      ${ps.length > 1 ? `<p>Also on this page: ${ps.slice(1).map(esc).join('; ')}.</p>` : ''}
      <dl class="specs">
        <dt>Album</dt><dd>${esc(album.name)}, page ${f.it.p}</dd>
        <dt>Shelf</dt><dd>INHA, ${esc(album.shelf)}</dd>
      </dl>
      <div class="card-actions">
        <button type="button" class="btn" data-nav="-1" aria-label="Previous frame">‹</button>
        <button type="button" class="btn accent" data-zoom>Look closer</button>
        <a class="btn" href="${this.inhaPage(f.it)}" target="_blank" rel="noopener">INHA ↗</a>
        <button type="button" class="btn" data-nav="1" aria-label="Next frame">›</button>
      </div>
      <p class="fine">${esc(ALBUM_NOTES[album.id].makers)} · public domain</p>`;
    this.card.querySelector('.card-close').onclick = () => this.closeCard();
    this.card.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => this.onFrame(f.k + +b.dataset.nav); });
    this.card.querySelector('[data-zoom]').onclick = () => this.openViewer(f);
  }

  closeCard() {
    this.card.hidden = true;
    this.current = null;
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
      const visible = toCam.dot(p.normal) > 0.05 && this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.05 && Math.abs(this.tmp.y) < 1.05 && d < 30;
      if (!visible) {
        if (!p.hidden) { p.el.classList.add('is-hidden'); p.hidden = true; }
        continue;
      }
      if (p.hidden) { p.el.classList.remove('is-hidden'); p.hidden = false; }
      const x = (this.tmp.x * 0.5 + 0.5) * width, y = (-this.tmp.y * 0.5 + 0.5) * height;
      p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      p.el.classList.toggle('is-far', d > 9);
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
      else if (k === 'prev' || k === 'next') { const nx = this.frames[this.viewing.k + (k === 'next' ? 1 : -1)]; if (nx) { this.onFrame(nx.k, true); this.openViewer(nx); } }
      else if (this.osd && k === 'zoomin') this.osd.viewport.zoomBy(1.6);
      else if (this.osd && k === 'zoomout') this.osd.viewport.zoomBy(1 / 1.6);
      else if (this.osd && k === 'home') this.osd.viewport.goHome();
    });
    document.addEventListener('keydown', (e) => {
      if (v.hidden) return;
      if (e.key === 'Escape') this.closeViewer();
      if (e.key === 'ArrowRight') v.querySelector('[data-v="next"]').click();
      if (e.key === 'ArrowLeft') v.querySelector('[data-v="prev"]').click();
    }, true);
  }

  openViewer(f) {
    const v = $('viewer');
    const album = this.albumById[f.it.a];
    this.viewing = f;
    if (v.hidden) this.viewerOpener = document.activeElement;
    v.hidden = false;
    v.style.setProperty('--c', f.room.color);
    $('v-room').textContent = `Room ${pad(f.room.n)} · ${f.room.title}`;
    $('v-title').textContent = title(f.it);
    const ps = parts(f.it);
    $('v-meta').innerHTML = `
      ${ps.length > 1 ? `<div><dt>On this page</dt><dd><ol>${ps.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></dd></div>` : ''}
      <div><dt>Album</dt><dd>${esc(album.name)}, page ${f.it.p}</dd></div>
      <div><dt>Shelf mark</dt><dd>INHA, ${esc(album.shelf)}</dd></div>
      <div><dt>Photographers</dt><dd>${esc(ALBUM_NOTES[album.id].makers)}</dd></div>
      <div><dt>Scan</dt><dd>${f.it.w} × ${f.it.h} px · public domain</dd></div>
      <div><dt>Catalogue caption</dt><dd lang="fr">${esc(f.it.c)}</dd></div>`;
    $('v-actions').innerHTML = `
      <a class="btn accent" href="${this.inhaPage(f.it)}" target="_blank" rel="noopener">Open at INHA ↗</a>
      <a class="btn" href="${this.img(f.it, 'max')}" target="_blank" rel="noopener">Full-size image ↗</a>`;
    $('v-count').textContent = `${f.k + 1} of ${this.frames.length} in the museum`;
    v.querySelector('[data-v="prev"]').disabled = f.k <= 0;
    v.querySelector('[data-v="next"]').disabled = f.k >= this.frames.length - 1;
    if (!this.osd && window.OpenSeadragon) {
      this.osd = window.OpenSeadragon({
        element: $('v-osd'), showNavigationControl: false, crossOriginPolicy: 'Anonymous',
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
        visibilityRatio: 0.6, minZoomImageRatio: 0.8, maxZoomPixelRatio: 3, animationTime: 0.6,
      });
    }
    this.osd?.open(this.info(f.it));
    v.querySelector('[data-v="close"]').focus({ preventScroll: true });
  }

  closeViewer() {
    $('viewer').hidden = true;
    this.osd?.close();
    this.viewerOpener?.focus?.({ preventScroll: true });
  }
}
