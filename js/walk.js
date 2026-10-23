// The walk-through: six connected 3D rooms with every album page framed on the walls.
// Rooms run east along x; each has two outer walls and a central wall in the room colour,
// with the wall text on its head. Pages hang in two rows on all four long faces.
import * as THREE from '../vendor/three.module.js';

const W = 14;            // room width (z from -7 to 7)
const H = 4.6;           // ceiling height
const T = 0.3;           // wall thickness
const DOOR = 1.6;        // half width of the doorways
const DOOR_H = 3.2;
const PITCH = 1.4;       // distance between frame columns
const ROWS = [2.72, 1.5]; // frame centres: upper row, lower row
const PHOTO_W = 0.95, PHOTO_H = 0.72, MAT = 0.07, RIM = 0.035;
const EYE = 1.6, RADIUS = 0.3;
const HEAD = 5;          // distance from the west wall to the wall text
const TAIL = 3;          // gap between the central wall and the east wall
const LOAD_NEAR = 22, UNLOAD_FAR = 42, MAX_LOADING = 8;

// ---------- layout ----------

function columns(len) { return Math.max(0, Math.floor(len / PITCH)); }

function roomLength(n) {
  for (let L = 16; ; L += 0.5) {
    const cap = ROWS.length * (2 * columns(L - 2.4) + 2 * columns(L - HEAD - TAIL - 1.2));
    if (cap >= n) return L;
  }
}

function layout(rooms, itemsByRoom) {
  let x = 0;
  return rooms.map((room) => {
    const items = itemsByRoom[room.id];
    const L = roomLength(items.length);
    const x0 = x;
    x += L;
    const pa = x0 + HEAD, pb = x0 + L - TAIL;
    // The four long faces, in walking order: south wall, south side of the central wall,
    // north side of the central wall, north wall. dir is the direction the numbers run.
    const faces = [
      { from: x0 + 1.2, to: x0 + L - 1.2, z: W / 2 - T / 2, n: -1, dir: 1 },
      { from: pa + 0.6, to: pb - 0.6, z: T / 2, n: 1, dir: -1 },
      { from: pa + 0.6, to: pb - 0.6, z: -T / 2, n: -1, dir: 1 },
      { from: x0 + 1.2, to: x0 + L - 1.2, z: -W / 2 + T / 2, n: 1, dir: -1 },
    ];
    const slots = [];
    let left = items.length;
    faces.forEach((f) => {
      const cols = Math.min(columns(f.to - f.from), Math.ceil(left / ROWS.length));
      left -= Math.min(left, cols * ROWS.length);
      const span = cols * PITCH;
      const start = (f.from + f.to) / 2 - (span / 2) * f.dir + (PITCH / 2) * f.dir;
      for (let c = 0; c < cols; c += 1) {
        ROWS.forEach((y) => slots.push({ x: start + c * PITCH * f.dir, y, z: f.z, n: f.n }));
      }
    });
    return { room, items, x0, L, pa, pb, slots: slots.slice(0, items.length) };
  });
}

// ---------- canvas textures ----------

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function shade(hex, f) {
  const c = new THREE.Color(hex).getRGB({}, THREE.SRGBColorSpace);
  return `rgb(${[c.r, c.g, c.b].map((v) => Math.round(Math.min(1, v * f) * 255)).join(',')})`;
}

// A wall lit by wall washers: brighter where the pictures hang.
function wallTex(hex) {
  return canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, shade(hex, 0.86));
    gr.addColorStop(0.25, shade(hex, 1.02));
    gr.addColorStop(0.55, shade(hex, 1.0));
    gr.addColorStop(0.92, shade(hex, 0.9));
    gr.addColorStop(0.975, shade(hex, 0.8));
    gr.addColorStop(1, shade(hex, 0.8));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

function floorTex() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#c9c2b7'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i += 1) {
      const v = 175 + Math.random() * 50;
      g.fillStyle = `rgba(${v},${v - 6},${v - 14},${Math.random() * 0.35})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    g.strokeStyle = 'rgba(90,80,70,.25)'; g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function shadowTex() {
  const t = canvasTex(128, 128, (g) => {
    g.shadowColor = 'rgba(30,20,10,.55)';
    g.shadowBlur = 22;
    g.shadowOffsetY = 6;
    g.fillStyle = 'rgba(30,20,10,.55)';
    g.fillRect(30, 30, 68, 68);
  });
  return t;
}

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(/\s+/);
  let line = '';
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = test;
  });
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}

const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = '"Inter Tight", system-ui, sans-serif';

function textPanel(room, count) {
  return canvasTex(2000, 1240, (g, w, h) => {
    g.fillStyle = room.color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.font = `600 30px ${SANS}`;
    g.fillText(`ROOM ${String(room.n).padStart(2, '0')} / 06`, 110, 150);
    g.fillStyle = '#fff';
    g.font = `150px ${SERIF}`;
    g.fillText(room.title, 104, 300);
    g.font = `italic 58px ${SERIF}`;
    g.fillText(room.subtitle, 110, 390);
    g.font = `32px ${SANS}`;
    // First paragraph in the left column, the rest in the right one.
    const colW = 820;
    wrap(g, room.text[0], 110, 490, colW, 46);
    let y = 490;
    room.text.slice(1).forEach((p) => { y = wrap(g, p, 110 + colW + 80, y, colW, 46) + 26; });
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.font = `26px ${SANS}`;
    g.fillText(`${count} album pages · walk around the wall to see them all`, 110, h - 90);
  });
}

function signTex(lines, color) {
  return canvasTex(1400, 300, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = color;
    g.font = `600 34px ${SANS}`;
    g.fillText(lines[0].toUpperCase(), 20, 80);
    g.fillStyle = '#1b1916';
    g.font = `120px ${SERIF}`;
    g.fillText(lines[1], 14, 220);
  });
}

function bigPanel(eyebrow, title, paras, credit) {
  return canvasTex(2000, 1240, (g, w, h) => {
    g.fillStyle = '#171513'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a59d92';
    g.font = `600 30px ${SANS}`;
    g.fillText(eyebrow.toUpperCase(), 110, 150);
    g.fillStyle = '#eee9e1';
    g.font = `140px ${SERIF}`;
    let y = 300;
    title.forEach((t, i) => { g.font = `${i ? 'italic ' : ''}140px ${SERIF}`; g.fillStyle = i ? '#c9b68f' : '#eee9e1'; g.fillText(t, 104, y); y += 140; });
    g.fillStyle = '#cfc8bd';
    g.font = `32px ${SANS}`;
    y += 30;
    paras.forEach((p) => { y = wrap(g, p, 110, y, 1700, 46) + 22; });
    if (credit) {
      g.fillStyle = '#a59d92'; g.font = `26px ${SANS}`;
      credit.forEach((c, i) => g.fillText(c, 110, h - 150 + i * 38));
    }
  });
}

// ---------- start ----------

export async function start(host, api) {
  const { ITEMS, ROOMS, img, title, albumName, show, setList, credit } = api;
  try { await Promise.all([document.fonts.load(`150px ${SERIF}`), document.fonts.load(`italic 58px ${SERIF}`), document.fonts.load(`32px ${SANS}`)]); } catch { /* fonts are optional */ }

  const byRoom = Object.fromEntries(ROOMS.map((r) => [r.id, ITEMS.filter((it) => it.r === r.id)]));
  const plan = layout(ROOMS, byRoom);
  const total = plan[plan.length - 1].x0 + plan[plan.length - 1].L;
  setList('walk', plan.flatMap((p) => p.items));

  const canvas = host.querySelector('canvas.w-gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dcd6cc');
  scene.fog = new THREE.Fog('#e9e4dc', 26, 70);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 120);
  camera.rotation.order = 'YXZ';

  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };
  const boxes = []; // collision boxes: [x1, x2, z1, z2]
  const unitBox = keep(new THREE.BoxGeometry(1, 1, 1));
  const unitPlane = keep(new THREE.PlaneGeometry(1, 1));

  function wall(x1, x2, z1, z2, y1, y2, mat, solid = true) {
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(x2 - x1, y2 - y1, z2 - z1);
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    scene.add(m);
    if (solid) boxes.push([x1, x2, z1, z2]);
    return m;
  }
  function panel(tex, w, h, x, y, z, rotY) {
    const m = new THREE.Mesh(unitPlane, keep(new THREE.MeshBasicMaterial({ map: keep(tex), transparent: true })));
    m.scale.set(w, h, 1);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    scene.add(m);
    return m;
  }

  // Floor and ceiling run the whole length.
  const ft = keep(floorTex());
  ft.repeat.set(total / 3, W / 3);
  const floor = new THREE.Mesh(unitPlane, keep(new THREE.MeshBasicMaterial({ map: ft })));
  floor.scale.set(total, W, 1);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(total / 2, 0, 0);
  scene.add(floor);
  const ceil = new THREE.Mesh(unitPlane, keep(new THREE.MeshBasicMaterial({ color: '#e7e3dc' })));
  ceil.scale.set(total, W, 1);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(total / 2, H, 0);
  scene.add(ceil);

  const white = keep(new THREE.MeshBasicMaterial({ map: keep(wallTex('#f4f1eb')) }));
  const lightMat = keep(new THREE.MeshBasicMaterial({ color: '#fffdf6' }));
  const trackMat = keep(new THREE.MeshBasicMaterial({ color: '#2a2724' }));

  plan.forEach((p, i) => {
    const { room, x0, L, pa, pb } = p;
    const xe = x0 + L;
    const roomWall = keep(new THREE.MeshBasicMaterial({ map: keep(wallTex(room.color)) }));
    const doorMat = keep(new THREE.MeshBasicMaterial({ color: room.color }));
    // outer walls
    wall(x0, xe, W / 2 - T / 2, W / 2 + T / 2, 0, H, white);
    wall(x0, xe, -W / 2 - T / 2, -W / 2 + T / 2, 0, H, white);
    // west wall: a doorway into this room, except in the first room
    if (i === 0) wall(x0 - T / 2, x0 + T / 2, -W / 2, W / 2, 0, H, white);
    else {
      wall(x0 - T / 2, x0 + T / 2, DOOR, W / 2, 0, H, white);
      wall(x0 - T / 2, x0 + T / 2, -W / 2, -DOOR, 0, H, white);
      wall(x0 - T / 2, x0 + T / 2, -DOOR, DOOR, DOOR_H, H, white, false);
      // door surround in the colour of the room ahead
      wall(x0 - T / 2 - 0.01, x0 + T / 2 + 0.01, DOOR - 0.06, DOOR, 0, DOOR_H, doorMat, false);
      wall(x0 - T / 2 - 0.01, x0 + T / 2 + 0.01, -DOOR, -DOOR + 0.06, 0, DOOR_H, doorMat, false);
      wall(x0 - T / 2 - 0.01, x0 + T / 2 + 0.01, -DOOR, DOOR, DOOR_H, DOOR_H + 0.06, doorMat, false);
      // sign over the door, seen from the previous room
      panel(signTex([`Room ${String(room.n).padStart(2, '0')} →`, room.title], room.color), 4.2, 0.9, x0 - T / 2 - 0.02, DOOR_H + 0.65, 0, -Math.PI / 2);
      // and from inside, the way back
      const prev = ROOMS[i - 1];
      panel(signTex([`← Room ${String(prev.n).padStart(2, '0')}`, prev.title], prev.color), 4.2, 0.9, x0 + T / 2 + 0.02, DOOR_H + 0.65, 0, Math.PI / 2);
    }
    if (i === plan.length - 1) wall(xe - T / 2, xe + T / 2, -W / 2, W / 2, 0, H, white);
    // the central wall, painted in the room colour, with the wall text on its head
    wall(pa, pb, -T / 2, T / 2, 0, 3.7, roomWall);
    wall(pa - 0.1, pa + 0.1, -2.6, 2.6, 0, 3.7, roomWall);
    panel(textPanel(room, p.items.length), 5.0, 3.1, pa - 0.11, 1.95, 0, -Math.PI / 2);
    // track lights
    [-3.6, 3.6].forEach((z) => {
      wall(x0 + 0.6, xe - 0.6, z - 0.03, z + 0.03, H - 0.05, H - 0.01, trackMat, false);
      for (let x = x0 + 1.5; x < xe - 1; x += 2.8) wall(x - 0.09, x + 0.09, z - 0.09, z + 0.09, H - 0.32, H - 0.05, lightMat, false);
    });
  });

  // Opening and closing panels.
  panel(bigPanel('A micro museum · INHA albums', ['Jane Dieulafoy', 'The Photographs'], [
    `${ITEMS.length} pages from eight albums, hung in six rooms. Walk east through the doorways, from the road to Persia to Spain and France.`,
    'Drag to look around. Walk with the arrow keys or W A S D, or click the floor to go there. Click a photograph to open it at full resolution.',
  ]), 5.6, 3.47, T / 2 + 0.02, 2.1, 0, Math.PI / 2);
  panel(bigPanel('End of the museum', ['Thank you', 'for visiting'], [
    'Scans and captions: Bibliothèque de l’INHA, collections Jacques Doucet, public domain.',
    'Press 1 to 6 to return to a room, or use the room buttons.',
  ], [`Developed by ${credit.name}`, ...credit.lines]), 5.6, 3.47, total - T / 2 - 0.02, 2.1, 0, -Math.PI / 2);

  // ---------- frames ----------

  const all = plan.flatMap((p) => p.slots.map((s, i) => ({ ...s, it: p.items[i], i, room: p.room, count: p.items.length })));
  const rimMesh = new THREE.InstancedMesh(unitBox, keep(new THREE.MeshBasicMaterial({ color: '#1c1a18' })), all.length);
  const matMesh = new THREE.InstancedMesh(unitPlane, keep(new THREE.MeshBasicMaterial({ color: '#fbfaf6' })), all.length);
  const shadowMesh = new THREE.InstancedMesh(unitPlane, keep(new THREE.MeshBasicMaterial({ map: keep(shadowTex()), transparent: true, depthWrite: false })), all.length);
  const photos = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const placeholder = keep(new THREE.MeshBasicMaterial({ color: '#d9d3c8' }));

  all.forEach((f, k) => {
    const r = f.it.w / f.it.h;
    let pw = PHOTO_W, ph = PHOTO_W / r;
    if (ph > PHOTO_H) { ph = PHOTO_H; pw = PHOTO_H * r; }
    const fw = pw + 2 * (MAT + RIM), fh = ph + 2 * (MAT + RIM);
    const rot = f.n > 0 ? 0 : Math.PI;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    const z = (d) => f.z + f.n * d;
    rimMesh.setMatrixAt(k, m4.compose(v.set(f.x, f.y, z(0.025)), q, sc.set(fw, fh, 0.05)));
    matMesh.setMatrixAt(k, m4.compose(v.set(f.x, f.y, z(0.052)), q, sc.set(fw - 2 * RIM, fh - 2 * RIM, 1)));
    shadowMesh.setMatrixAt(k, m4.compose(v.set(f.x, f.y - 0.05, z(0.004)), q, sc.set(fw * 1.55, fh * 1.6, 1)));
    const m = new THREE.Mesh(unitPlane, placeholder);
    m.scale.set(pw, ph, 1);
    m.position.set(f.x, f.y, z(0.056));
    m.rotation.y = rot;
    m.userData.f = f;
    f.mesh = m;
    scene.add(m);
    photos.push(m);
  });
  [rimMesh, matMesh, shadowMesh].forEach((m) => { m.instanceMatrix.needsUpdate = true; scene.add(m); });
  shadowMesh.renderOrder = -1;

  // Load the scans near the visitor, and let go of those far away.
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  let loading = 0;
  function stream() {
    const p = camera.position;
    const near = [];
    all.forEach((f) => {
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      if (f.tex && d > UNLOAD_FAR) {
        f.mesh.material.dispose(); f.tex.dispose(); f.tex = null; f.mesh.material = placeholder;
      } else if (!f.tex && !f.pending && d < LOAD_NEAR) near.push([d, f]);
    });
    near.sort((a, b) => a[0] - b[0]);
    for (const [, f] of near) {
      if (loading >= MAX_LOADING) break;
      loading += 1;
      f.pending = true;
      loader.load(img(f.it, '!640,640'), (t) => {
        loading -= 1; f.pending = false;
        if (disposed) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, maxAniso);
        f.tex = t;
        f.mesh.material = new THREE.MeshBasicMaterial({ map: t });
      }, undefined, () => { loading -= 1; f.pending = false; f.failed = (f.failed || 0) + 1; });
    }
  }

  // ---------- movement ----------

  const state = { yaw: -Math.PI / 2, pitch: 0, keys: new Set(), target: null };
  function place(x, z, yaw = -Math.PI / 2) {
    camera.position.set(x, EYE, z);
    state.yaw = yaw; state.pitch = 0; state.target = null;
  }
  function blocked(x, z) {
    if (x < RADIUS || x > total - RADIUS || Math.abs(z) > W / 2 - T / 2 - RADIUS) return true;
    return boxes.some(([x1, x2, z1, z2]) => x > x1 - RADIUS && x < x2 + RADIUS && z > z1 - RADIUS && z < z2 + RADIUS);
  }
  function tryMove(dx, dz) {
    const p = camera.position;
    let moved = false;
    if (!blocked(p.x + dx, p.z)) { p.x += dx; moved = true; }
    if (!blocked(p.x, p.z + dz)) { p.z += dz; moved = true; }
    return moved;
  }
  function goToRoom(n) {
    const p = plan[n];
    if (p) place(p.x0 + (n === 0 ? 1.4 : 0.9), 0);
  }

  const viewerOpen = () => !document.getElementById('viewer').hidden;
  const onKey = (e) => {
    if (viewerOpen() || e.target.closest('input, textarea')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.type === 'keydown' && /^[1-6]$/.test(k)) { goToRoom(+k - 1); return; }
    if (['w', 'a', 's', 'd', 'q', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(k)) {
      if (e.type === 'keydown') { state.keys.add(k); state.target = null; } else state.keys.delete(k);
      if (k.startsWith('Arrow')) e.preventDefault();
    }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  const onBlur = () => state.keys.clear();
  window.addEventListener('blur', onBlur);

  // Drag to look; a click opens a photograph or walks to a point on the floor.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let drag = null;
  let hover = null;
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.far = 14;
    const hit = ray.intersectObjects([...photos, matMesh, floor], false)[0];
    if (hit && hit.object === matMesh) return { f: all[hit.instanceId] };
    if (hit && hit.object !== floor) return { f: hit.object.userData.f };
    return hit ? { point: hit.point } : null;
  }
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    host.classList.add('started');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag && drag.id === e.pointerId) {
      const k = e.pointerType === 'touch' ? 0.006 : 0.0042;
      state.yaw -= (e.clientX - drag.x) * k;
      state.pitch = Math.max(-1.1, Math.min(1.1, state.pitch - (e.clientY - drag.y) * k));
      drag.x = e.clientX; drag.y = e.clientY;
    } else if (e.pointerType === 'mouse') {
      const hit = pick(e.clientX, e.clientY);
      hover = hit && hit.f ? hit.f : null;
      canvas.style.cursor = hover ? 'pointer' : 'grab';
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const still = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 7 && performance.now() - drag.t < 500;
    drag = null;
    if (!still) return;
    const hit = pick(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.f) show(`${hit.f.it.a}-${hit.f.it.p}`, 'walk');
    else state.target = { x: hit.point.x, z: hit.point.z };
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { hover = null; });

  // ---------- HUD ----------

  const hudRoom = host.querySelector('.w-room');
  const hudLabel = host.querySelector('.w-label');
  const map = host.querySelector('.w-map');
  const mg = map.getContext('2d');
  host.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { goToRoom(+b.dataset.go); host.classList.add('started'); canvas.focus(); }));
  host.querySelector('.w-start')?.addEventListener('click', () => { host.classList.add('started'); canvas.focus(); });
  map.addEventListener('click', (e) => {
    const r = map.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * total;
    const z = ((e.clientY - r.top) / r.height - 0.5) * W;
    if (!blocked(x, z)) { camera.position.x = x; camera.position.z = z; state.target = null; }
  });

  let shown = null;
  let roomShown = -1;
  function hud() {
    const p = camera.position;
    const ri = Math.max(0, plan.findIndex((r) => p.x >= r.x0 && p.x < r.x0 + r.L));
    if (ri !== roomShown) {
      roomShown = ri;
      const r = plan[ri].room;
      hudRoom.innerHTML = `<i style="background:${r.color}"></i>Room ${String(r.n).padStart(2, '0')} · ${r.title}`;
      host.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('on', +b.dataset.go === ri));
      host.style.setProperty('--c', r.color);
    }
    // The label shows the photograph under the mouse, or the one straight ahead.
    camera.updateMatrixWorld();
    let f = hover;
    if (!f) {
      ray.setFromCamera(ndc.set(0, 0), camera);
      ray.far = 7;
      const hit = ray.intersectObjects(photos, false)[0];
      f = hit ? hit.object.userData.f : null;
    }
    if (f !== shown) {
      shown = f;
      hudLabel.hidden = !f;
      if (f) {
        hudLabel.innerHTML = `<span class="w-n" style="color:${f.room.color}">${String(f.i + 1).padStart(2, '0')}<small> / ${f.count}</small></span>
          <span class="w-t"><strong>${escapeHtml(title(f.it))}</strong><em>${escapeHtml(albumName(f.it))}, page ${f.it.p} · click or tap to open</em></span>`;
      }
    }
    drawMap();
  }
  function drawMap() {
    const w = map.width, h = map.height, s = w / total;
    mg.clearRect(0, 0, w, h);
    mg.fillStyle = 'rgba(244,241,236,.92)'; mg.fillRect(0, 0, w, h);
    plan.forEach((p) => {
      mg.fillStyle = p.room.color;
      mg.globalAlpha = 0.18; mg.fillRect(p.x0 * s, 0, p.L * s, h); mg.globalAlpha = 1;
      mg.fillRect(p.pa * s, h / 2 - 1.5, (p.pb - p.pa) * s, 3);
      mg.fillStyle = '#1b1916';
      mg.fillRect(p.x0 * s - 1, 0, 2, h / 2 - (DOOR / W) * h);
      mg.fillRect(p.x0 * s - 1, h / 2 + (DOOR / W) * h, 2, h);
    });
    mg.strokeStyle = '#1b1916'; mg.lineWidth = 2; mg.strokeRect(1, 1, w - 2, h - 2);
    const x = camera.position.x * s, y = (camera.position.z / W + 0.5) * h;
    mg.fillStyle = '#1b1916';
    mg.beginPath(); mg.arc(x, y, 4.5, 0, Math.PI * 2); mg.fill();
    mg.strokeStyle = '#1b1916'; mg.lineWidth = 2;
    mg.beginPath(); mg.moveTo(x, y); mg.lineTo(x - Math.sin(state.yaw) * 13, y - Math.cos(state.yaw) * 13); mg.stroke();
  }

  // ---------- loop ----------

  function resize() {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = r.width < r.height ? 75 : 62;
    camera.updateProjectionMatrix();
    const mw = Math.min(360, r.width - 32);
    map.width = mw * 2; map.height = Math.max(36, (mw * W) / total) * 2;
    map.style.width = `${mw}px`;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let disposed = false;
  let last = performance.now();
  let lastStream = 0;
  function frame(now) {
    if (disposed) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!viewerOpen()) {
      const k = state.keys;
      const speed = (k.has('Shift') ? 5.2 : 2.6) * dt;
      if (k.has('ArrowLeft') || k.has('q')) state.yaw += 1.8 * dt;
      if (k.has('ArrowRight') || k.has('e')) state.yaw -= 1.8 * dt;
      const fwd = (k.has('w') || k.has('ArrowUp') ? 1 : 0) - (k.has('s') || k.has('ArrowDown') ? 1 : 0);
      const side = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
      const sy = Math.sin(state.yaw), cy = Math.cos(state.yaw);
      if (fwd || side) tryMove((-sy * fwd + cy * side) * speed, (-cy * fwd - sy * side) * speed);
      if (state.target) {
        const dx = state.target.x - camera.position.x, dz = state.target.z - camera.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.15 || !tryMove((dx / d) * Math.min(d, 3.2 * dt), (dz / d) * Math.min(d, 3.2 * dt))) state.target = null;
      }
    }
    camera.rotation.set(state.pitch, state.yaw, 0);
    if (now - lastStream > 250) { lastStream = now; stream(); hud(); }
    renderer.render(scene, camera);
  }
  host.walk = { camera, state, plan, place, scene, THREE }; // handy for debugging from the console
  goToRoom(Math.max(0, api.startRoom || 0));
  stream();
  requestAnimationFrame(frame);

  return function stop() {
    disposed = true;
    ro.disconnect();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('blur', onBlur);
    all.forEach((f) => { if (f.tex) { f.tex.dispose(); f.mesh.material.dispose(); } });
    scene.traverse((o) => { if (o.isMesh && o.material && o.material.map && !disposables.includes(o.material.map)) o.material.map.dispose(); });
    disposables.forEach((d) => d.dispose());
    [rimMesh, matMesh, shadowMesh].forEach((m) => m.dispose());
    renderer.dispose();
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
