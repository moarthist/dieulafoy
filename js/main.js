// Entry point: renderer, camera, navigation and the museum around them.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ALBUMS, ITEMS } from './data.js';
import { MUSEUM, ROOMS } from './content.js';
import { B, buildBuilding, planRooms } from './building.js';
import { buildFrames } from './frames.js';
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.3;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI * 0.499;
controls.rotateSpeed = 0.6;
controls.panSpeed = 0.8;
controls.screenSpacePanning = false;
controls.listenToKeyEvents(window);
controls.keyPanSpeed = 18;

// ---- Build the museum ----------------------------------------------------------------
const plan = planRooms(ROOMS);
const byRoom = Object.fromEntries(ROOMS.map((r) => [r.id, ITEMS.filter((it) => it.r === r.id)]));
const counts = { total: ITEMS.length, ...Object.fromEntries(ROOMS.map((r) => [r.id, byRoom[r.id].length])) };
const building = buildBuilding(scene, plan, { aniso, museum: MUSEUM, counts });
const gallery = buildFrames(scene, plan, byRoom, { aniso, img });
const frames = gallery.frames;

// ---- Camera views ----------------------------------------------------------------------
const VIEWS = {
  overview: { label: 'Overview', pos: [20, 30, 36], target: [0, 0, 1], fov: 40 },
  hall: { label: 'Hall', pos: [-B.X + 1.4, 1.62, 0.8], target: [B.X, 1.5, 0], fov: 60 },
  ...Object.fromEntries(plan.map((p) => [`room${p.room.n}`, { label: `Room ${p.room.n}`, room: p.room, ...p.view }])),
  plan: { label: 'Plan', pos: [0, 62, 0.05], target: [0, 0, 0], fov: 32 },
};

const ui = new UI({
  views: VIEWS, albums: ALBUMS, frames, img, info, inhaPage,
  onView: (id) => goTo(id),
  onFrame: (k, quiet) => visitFrame(frames[Math.max(0, Math.min(frames.length - 1, k))], quiet),
});

let aspect = 1;
function fovFor(base) {
  // keep the horizontal field of view reasonable on tall (phone) screens
  const ref = 1.35;
  if (aspect >= ref) return base;
  return Math.min(88, 2 * Math.atan(Math.tan((base * Math.PI) / 360) * (ref / aspect)) * (180 / Math.PI));
}
let tween = null, baseFov = VIEWS.overview.fov;

function flyTo(pos, target, fov, instant = false) {
  baseFov = fov;
  const to = { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), fov: fovFor(fov) };
  if (instant || reduceMotion) {
    camera.position.copy(to.pos);
    controls.target.copy(to.target);
    camera.fov = to.fov;
    camera.updateProjectionMatrix();
    controls.update();
    tween = null;
    return;
  }
  const dist = camera.position.distanceTo(to.pos);
  tween = {
    t0: performance.now(), dur: Math.min(1800, 700 + dist * 40),
    from: { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov },
    to,
  };
}
function goTo(id, instant = false) {
  const v = VIEWS[id];
  if (!v) return;
  ui.setActiveView(id);
  flyTo(v.pos, v.target, v.fov, instant);
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
controls.addEventListener('start', () => { tween = null; ui.setActiveView(null); });

// Stand in front of a frame and show its card.
function visitFrame(f, quiet = false) {
  if (!f) return;
  const c = f.center, n = f.normal;
  const back = 2.1;
  // on tall screens the card covers the lower half, so the frame is shown higher up
  const drop = aspect < 1 ? 0.42 : 0;
  const eyeY = Math.max(1.45, c.y + 0.05) - drop;
  flyTo([c.x + n.x * back, eyeY, c.z + n.z * back], [c.x, c.y - drop, c.z], 44, quiet);
  ui.setActiveView(null);
  gallery.setHover(f);
  ui.openCard(f);
}

// Walk to a point on the floor, keeping the direction you are looking in.
function walkTo(point) {
  const inRoom = plan.find((p) => p.inside(point.x, point.z));
  const inHall = Math.abs(point.z) < B.HALL / 2 - 0.3 && Math.abs(point.x) < B.X - 0.3;
  if (!inRoom && !inHall) return;
  const dir = controls.target.clone().sub(camera.position).setY(0);
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  const eye = [point.x - dir.x * 0.6, 1.62, point.z - dir.z * 0.6];
  const target = [point.x + dir.x * 2.4, 1.5, point.z + dir.z * 2.4];
  ui.setActiveView(null);
  flyTo(eye, target, Math.max(camera.fov > 70 ? 60 : camera.fov, 55));
}

// ---- Pins ------------------------------------------------------------------------------
plan.forEach((p) => {
  ui.addPin({
    label: `Room ${p.room.n} · ${p.room.title}`,
    pos: p.panel.pos.clone().add(new THREE.Vector3(0, 1.15, 0)),
    normal: p.panel.normal,
    activate: (btn) => { goTo(`room${p.room.n}`); ui.openReader('rooms', btn, p.room.id); },
  });
});
ui.addPin({ label: 'About the museum', pos: new THREE.Vector3(-B.X + B.T, 2.85, 0), normal: new THREE.Vector3(1, 0, 0), activate: (btn) => ui.openReader('about', btn) });
ui.addPin({ label: 'The albums', pos: new THREE.Vector3(B.X - B.T, 2.85, 0), normal: new THREE.Vector3(-1, 0, 0), activate: (btn) => ui.openReader('albums', btn) });

// ---- Picking -------------------------------------------------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pickTargets = [...building.blockers, ...gallery.pickables];
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickTargets, false)[0];
  if (!hit) return null;
  if (hit.object.userData.frame) return { frame: hit.object.userData.frame };
  if (hit.object.userData.frames) return { frame: hit.object.userData.frames[hit.instanceId] };
  if (hit.object === building.floor) return { floor: hit.point };
  return null;
}

let down = null, hovered = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const dt = performance.now() - down.t;
  down = null;
  if (moved > 6 || dt > 500) return;
  const h = pick(e);
  if (!h) return;
  if (h.frame) visitFrame(h.frame);
  else if (h.floor) walkTo(h.floor);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const h = pick(e);
  const f = h && h.frame;
  if (f !== hovered) {
    hovered = f;
    gallery.setHover(f || ui.current);
  }
  canvas.style.cursor = f ? 'pointer' : h && h.floor ? 'crosshair' : '';
});
canvas.addEventListener('pointerleave', () => { hovered = null; gallery.setHover(ui.current); canvas.style.cursor = ''; });
document.getElementById('frame-card').addEventListener('click', (e) => { if (e.target.closest('.card-close')) gallery.setHover(null); });

// ---- Size and loop ---------------------------------------------------------------------
function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false);
  aspect = w / h;
  camera.aspect = aspect;
  if (!tween) camera.fov = fovFor(baseFov);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

let lastTick = 0, litRoom;
function tick() {
  const t = controls.target;
  const p = plan.find((r) => r.inside(t.x, t.z)) || null;
  if (p !== litRoom) {
    litRoom = p;
    building.lightRoom(p);
    ui.setRoom(p && p.room);
  }
  gallery.stream(camera);
}

const PERF = location.search.includes('perf') ? { n: 0, worst: 0, last: 0, tick: 0, render: 0, cull: 0, t0: 0, el: null } : null;
if (PERF) { PERF.el = document.createElement('pre'); PERF.el.style.cssText = 'position:fixed;left:8px;top:200px;z-index:99;background:#000;color:#0f0;font:14px monospace;padding:8px'; document.body.append(PERF.el); }
function frame(now) {
  requestAnimationFrame(frame);
  if (PERF) {
    if (PERF.last) { PERF.n += 1; PERF.worst = Math.max(PERF.worst, now - PERF.last); } else PERF.t0 = now;
    PERF.last = now;
    const secs = (now - PERF.t0) / 1000;
    PERF.el.textContent = `fps ${(PERF.n / Math.max(secs, 0.001)).toFixed(1)}  worst ${PERF.worst.toFixed(0)}ms\ntick ${PERF.tick.toFixed(1)}  cull ${PERF.cull.toFixed(1)}  render ${PERF.render.toFixed(1)} ms\ncalls ${renderer.info.render.calls} tex ${renderer.info.memory.textures} prog ${renderer.info.programs.length}\nloaded ${frames.filter((f) => f.thumb).length} thumbs ${frames.filter((f) => f.sharp).length} sharp`;
  }
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.dur), e = ease(k);
    camera.position.lerpVectors(tween.from.pos, tween.to.pos, e);
    controls.target.lerpVectors(tween.from.target, tween.to.target, e);
    camera.fov = tween.from.fov + (tween.to.fov - tween.from.fov) * e;
    camera.updateProjectionMatrix();
    if (k >= 1) { tween = null; camera.fov = fovFor(baseFov); camera.updateProjectionMatrix(); }
  }
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -B.X, B.X);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -B.Z, B.Z);
  controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, B.H);
  controls.update();
  if (camera.position.y < 0.12) camera.position.y = 0.12;
  let pt = performance.now();
  gallery.cull(camera);
  if (PERF) PERF.cull = Math.max(PERF.cull, performance.now() - pt);
  pt = performance.now();
  if (now - lastTick > 300) { lastTick = now; tick(); }
  if (PERF) PERF.tick = Math.max(PERF.tick, performance.now() - pt);
  pt = performance.now();
  renderer.render(scene, camera);
  if (PERF) PERF.render = Math.max(PERF.render, performance.now() - pt);
  ui.updatePins(camera, stage.clientWidth, stage.clientHeight);
}

// ---- Start -----------------------------------------------------------------------------
goTo('overview', true);
tick();
requestAnimationFrame(frame);
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.getElementById('loading').classList.add('is-done');
  setTimeout(() => document.getElementById('loading')?.remove(), 600);
}));

// A link such as  #room4  or  #/walk/susa  opens straight in that room.
function fromHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const byId = ROOMS.find((r) => h.endsWith(r.id));
  const m = h.match(/^room([1-6])$/);
  if (m) return `room${m[1]}`;
  if (byId) return `room${byId.n}`;
  if (VIEWS[h]) return h;
  return null;
}
// A link such as  #page-62747-15  (album id, page) opens in front of that frame.
function frameFromHash() {
  const m = location.hash.match(/page-(\d+)-(\d+)/);
  return m ? frames.find((f) => f.it.a === +m[1] && f.it.p === +m[2]) : null;
}
function enter(instant) {
  const w = document.getElementById('welcome');
  if (!w) return;
  w.classList.add('is-done');
  setTimeout(() => w.remove(), instant ? 0 : 500);
  const f = frameFromHash();
  if (f) visitFrame(f, instant);
  else goTo(fromHash() || 'hall', instant);
}
document.getElementById('enter').addEventListener('click', () => enter(false));
if (fromHash() || frameFromHash()) enter(true);
window.addEventListener('hashchange', () => {
  const f = frameFromHash();
  if (f) { visitFrame(f); return; }
  const v = fromHash();
  if (v) goTo(v);
});

// Handy for debugging.
window.__museum = { goTo, camera, controls, scene, renderer, frames, plan, ui, THREE, visitFrame };
