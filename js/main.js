// Entry point: renderer, camera, navigation, and the study with its six albums.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ALBUMS, ITEMS } from './data.js';
import { ROOMS } from './content.js';
import { ROOM, TABLE, buildStudy } from './study.js';
import { AW, buildAlbums } from './albums.js';
import { UI } from './ui.js';

const IIIF = 'https://bibliotheque-numerique.inha.fr/i/?IIIF=';
const albumById = Object.fromEntries(ALBUMS.map((a) => [a.id, a]));
const img = (it, size) => `${IIIF}${albumById[it.a].iiif}${it.f}.tif/full/${size}/0/default.jpg`;
const info = (it) => `${IIIF}${albumById[it.a].iiif}${it.f}.tif/info.json`;
const inhaPage = (it) => `https://bibliotheque-numerique.inha.fr/viewer/${it.a}/?offset=#page=${it.p}&viewer=picture`;

const canvas = document.getElementById('scene');
const stage = document.getElementById('stage');
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  document.getElementById('fallback').hidden = false;
  document.getElementById('loading').remove();
  throw err;
}
// Retina screens get at most 1.5 device pixels per CSS pixel; the loop lowers this if frames are slow.
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 80);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.25;
controls.maxDistance = 22;
controls.maxPolarAngle = Math.PI * 0.499;
controls.rotateSpeed = 0.6;
controls.panSpeed = 0.8;
controls.screenSpacePanning = false;
controls.listenToKeyEvents(window);
controls.keyPanSpeed = 14;

// The scene is drawn only when something changes: the camera moves, a scan arrives, a page turns.
let dirty = true;
const invalidate = () => { dirty = true; };

// ---- Build the study -------------------------------------------------------------------
const study = buildStudy(scene, { aniso });
study.setOnChange(invalidate);
const byRoom = Object.fromEntries(ROOMS.map((r) => [r.id, ITEMS.filter((it) => it.r === r.id)]));
const books = buildAlbums(scene, ROOMS, byRoom, { aniso, img, onChange: invalidate });

// ---- Camera views ----------------------------------------------------------------------
const R = books.READ;
const VIEWS = {
  overview: { label: 'Overview', pos: [6.2, 6.4, 8.4], target: [0, 0.8, 0], fov: 40 },
  desk: { label: 'The table', pos: [0.2, 1.75, TABLE.z + 2.1], target: [0, TABLE.top, TABLE.z], fov: 48 },
  library: { label: 'Library', pos: [2.2, 1.6, 2.3], target: [-1.8, 1.5, -2.6], fov: 62 },
  window: { label: 'Window', pos: [-1.8, 1.6, 1.4], target: [ROOM.W / 2, 1.7, 0], fov: 58 },
  plan: { label: 'Plan', pos: [0, 15, 0.05], target: [0, 0, 0], fov: 38 },
};
const READ_VIEW = { pos: [R.x, TABLE.top + 0.95, R.z + 0.58], target: [R.x, TABLE.top, R.z + 0.02], fov: 44 };

const ui = new UI({
  views: VIEWS, rooms: ROOMS, albums: ALBUMS, books, img, info, inhaPage,
  onView: (id) => { if (books.state.current) closeBook(); goTo(id); },
  onBook: (i, spread) => openBook(books.albums[i], spread),
  onItem: (it) => openAt(it),
  onTurn: (d) => books.turn(d).then(sync),
  onClose: () => closeBook(),
  onSpread: (s) => { books.goToSpread(s); sync(); },
});

let aspect = 1;
function fovFor(base) {
  // keep the horizontal field of view reasonable on tall (phone) screens
  const ref = 1.35;
  if (aspect >= ref) return base;
  return Math.min(90, 2 * Math.atan(Math.tan((base * Math.PI) / 360) * (ref / aspect)) * (180 / Math.PI));
}
let tween = null, baseFov = VIEWS.overview.fov;
function flyTo(v, instant = false) {
  baseFov = v.fov;
  const to = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target), fov: fovFor(v.fov) };
  if (instant || reduceMotion) {
    camera.position.copy(to.pos);
    controls.target.copy(to.target);
    camera.fov = to.fov;
    camera.updateProjectionMatrix();
    controls.update();
    tween = null;
    invalidate();
    return;
  }
  const dist = camera.position.distanceTo(to.pos);
  tween = {
    t0: performance.now(), dur: Math.min(1700, 800 + dist * 60),
    from: { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov },
    to,
  };
}
function goTo(id, instant = false) {
  const v = VIEWS[id];
  if (!v) return;
  ui.setActiveView(id);
  flyTo(v, instant);
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
controls.addEventListener('start', () => { tween = null; ui.setActiveView(null); });
controls.addEventListener('change', invalidate);

// ---- Albums ------------------------------------------------------------------------------
function sync() {
  ui.showBook(books.state.current, books.state.spread, books.visiblePages());
  invalidate();
}
async function openBook(a, spread = 0, instant = false) {
  ui.setActiveView(null);
  ui.setPins(false);
  controls.stopListenToKeyEvents();
  flyTo(READ_VIEW, instant);
  ui.showBook(a, spread, []);
  await books.openAlbum(a, spread);
  sync();
}
async function closeBook() {
  ui.showBook(null);
  await books.closeAlbum();
  controls.listenToKeyEvents(window);
  ui.setPins(true);
  invalidate();
}
function openAt(it) {
  const a = books.albums.find((b) => b.room.id === it.r);
  openBook(a, books.spreadOf(a, it));
}

// ---- Pins over the albums ---------------------------------------------------------------
books.albums.forEach((a) => {
  const p = books.home(a.i);
  ui.addPin({
    label: `${a.room.n} · ${a.room.title}`,
    color: a.room.color,
    pos: new THREE.Vector3(p.x - AW / 2 + 0.06, p.y + 0.12, p.z),
    normal: new THREE.Vector3(0, 1, 0.4).normalize(),
    activate: () => openBook(a),
  });
});

// ---- Picking -------------------------------------------------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pickTargets = [...study.blockers, ...books.pickables];
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickTargets, false).find((h) => h.object.visible && h.object.parent.visible);
  if (!hit) return null;
  if (hit.object.userData.album) return { album: hit.object.userData.album };
  if (hit.object.userData.page) return { page: hit.object.userData.page, side: hit.object.userData.side };
  if (study.floors.includes(hit.object)) return { floor: hit.point };
  return null;
}

// Walk to a point on the floor, keeping the direction you are looking in.
function walkTo(point) {
  const m = 0.7;
  if (Math.abs(point.x) > ROOM.W / 2 - m || Math.abs(point.z) > ROOM.D / 2 - m) return;
  const dir = controls.target.clone().sub(camera.position).setY(0);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  dir.normalize();
  ui.setActiveView(null);
  flyTo({ pos: [point.x - dir.x * 0.5, 1.62, point.z - dir.z * 0.5], target: [point.x + dir.x * 2.4, 1.45, point.z + dir.z * 2.4], fov: 58 });
}

let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const dt = performance.now() - down.t;
  down = null;
  if (moved > 6 || dt > 500) return;
  const h = pick(e);
  if (!h) return;
  if (h.album) openBook(h.album);
  else if (h.page) {
    if (h.page.kind === 'item') ui.openViewer(h.page.it);
    else books.turn(h.side).then(sync);
  } else if (h.floor && !books.state.current) walkTo(h.floor);
});
// Hovering is checked at most once a frame.
let moveEvent = null;
canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !e.buttons) moveEvent = e; });
canvas.addEventListener('pointerleave', () => { moveEvent = null; canvas.style.cursor = ''; });
function hover() {
  const h = pick(moveEvent);
  moveEvent = null;
  canvas.style.cursor = h && (h.album || h.page) ? 'pointer' : h && h.floor && !books.state.current ? 'crosshair' : '';
}

// Keys: arrows turn the pages of an open album; Escape closes it.
window.addEventListener('keydown', (e) => {
  if (!books.state.current || !document.getElementById('viewer').hidden || e.target.closest('input')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); books.turn(1).then(sync); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); books.turn(-1).then(sync); }
  if (e.key === 'Escape' && document.getElementById('reader').hidden) closeBook();
});
// Swipe across an open album to turn its pages.
let swipe = null;
canvas.addEventListener('touchstart', (e) => { if (books.state.current && e.touches.length === 1) swipe = { x: e.touches[0].clientX, t: performance.now() }; }, { passive: true });
canvas.addEventListener('touchend', (e) => {
  if (!swipe) return;
  const dx = e.changedTouches[0].clientX - swipe.x;
  if (Math.abs(dx) > 50 && performance.now() - swipe.t < 600) books.turn(dx < 0 ? 1 : -1).then(sync);
  swipe = null;
});

// ---- Size and loop ---------------------------------------------------------------------
function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false);
  aspect = w / h;
  camera.aspect = aspect;
  if (!tween) camera.fov = fovFor(baseFov);
  camera.updateProjectionMatrix();
  invalidate();
}
new ResizeObserver(resize).observe(stage);
resize();

// If drawing is slow while moving, lower the resolution step by step.
const slow = { n: 0, sum: 0, last: 0 };
function adapt(now) {
  if (slow.last && now - slow.last < 200) {
    slow.sum += now - slow.last;
    slow.n += 1;
    if (slow.n === 30) {
      if (slow.sum / slow.n > 34 && pixelRatio > 0.75) {
        pixelRatio = Math.max(0.75, pixelRatio - 0.25);
        renderer.setPixelRatio(pixelRatio);
        resize();
      }
      slow.n = 0; slow.sum = 0;
    }
  }
  slow.last = now;
}

function frame(now) {
  requestAnimationFrame(frame);
  if (moveEvent) hover();
  if (books.update(now)) dirty = true;
  if (tween) {
    dirty = true;
    const k = Math.min(1, (now - tween.t0) / tween.dur), e = ease(k);
    camera.position.lerpVectors(tween.from.pos, tween.to.pos, e);
    controls.target.lerpVectors(tween.from.target, tween.to.target, e);
    camera.fov = tween.from.fov + (tween.to.fov - tween.from.fov) * e;
    camera.updateProjectionMatrix();
    if (k >= 1) { tween = null; camera.fov = fovFor(baseFov); camera.updateProjectionMatrix(); }
  }
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -ROOM.W / 2, ROOM.W / 2);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -ROOM.D / 2, ROOM.D / 2);
  controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, ROOM.H);
  controls.update();
  if (camera.position.y < 0.12) camera.position.y = 0.12;
  if (!dirty) { slow.last = 0; return; }
  dirty = false;
  study.cull(camera);
  renderer.render(scene, camera);
  ui.updatePins(camera, stage.clientWidth, stage.clientHeight);
  adapt(now);
}

// ---- Start -----------------------------------------------------------------------------
goTo('overview', true);
books.warmup(() => renderer.compile(scene, camera)); // compile every shader now, not on the first page turn
requestAnimationFrame(frame);
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.getElementById('loading').classList.add('is-done');
  setTimeout(() => document.getElementById('loading')?.remove(), 600);
}));

// Links: #album3 opens the third album, #page-62747-15 (album id, page) opens at that page,
// and a view name (#desk, #library…) goes there.
function fromHash() {
  const h = location.hash.replace(/^#\/?/, '');
  let m = h.match(/^album([1-6])$/);
  if (m) return { book: +m[1] - 1 };
  m = h.match(/page-(\d+)-(\d+)/);
  if (m) {
    const it = ITEMS.find((x) => x.a === +m[1] && x.p === +m[2]);
    if (it) return { item: it };
  }
  const room = ROOMS.find((r) => h && h.endsWith(r.id));
  if (room) return { book: room.n - 1 };
  if (VIEWS[h]) return { view: h };
  return null;
}
function follow(t, instant) {
  if (!t) return;
  if (t.book != null) openBook(books.albums[t.book], 0, instant);
  else if (t.item) openAt(t.item);
  else if (t.view) ui.onView(t.view);
}
function enter(instant) {
  const w = document.getElementById('welcome');
  if (!w) return;
  w.classList.add('is-done');
  setTimeout(() => w.remove(), instant ? 0 : 500);
  const t = fromHash();
  if (t) follow(t, instant);
  else goTo('desk');
}
document.getElementById('enter').addEventListener('click', () => enter(false));
if (fromHash()) enter(true);
window.addEventListener('hashchange', () => follow(fromHash()));

// Handy for debugging.
window.__museum = { goTo, camera, controls, scene, renderer, books, ui, THREE, openBook, closeBook };
