// The study: a library-office in pale lacquer and gold, after the classic Italian manner.
// Walls, floor and ceiling are single-sided planes that face INTO the room, so seen from
// outside they disappear and you can look in from above, like a section model.
// Axes: +x to the right, +y up, +z toward the viewer. The back wall is at z = -D/2.
import * as THREE from 'three';
import {
  damaskTexture, lacquerTexture, makeCanvas, parquetTexture, rng, toTexture,
} from './textures.js';

export const ROOM = { W: 8, D: 7, H: 3.6, T: 0.16 };
// The library table at the middle of the room, and where the albums lie on it.
export const TABLE = { x: 0, z: 0.25, w: 2.6, d: 1.3, top: 0.78 };

export function buildStudy(scene, { aniso = 4 } = {}) {
  const { W, D, H, T } = ROOM;
  const group = new THREE.Group();
  group.name = 'study';
  scene.add(group);
  const blockers = [];
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const geoPlane = new THREE.PlaneGeometry(1, 1);

  const M = {
    lacquer: new THREE.MeshStandardMaterial({ map: lacquerTexture(aniso), roughness: 0.38, metalness: 0, envMapIntensity: 0.5 }),
    lacquerDark: new THREE.MeshStandardMaterial({ color: 0x7d8d8f, roughness: 0.6, envMapIntensity: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a44c, roughness: 0.32, metalness: 0.85, envMapIntensity: 1.1 }),
    damask: new THREE.MeshStandardMaterial({ map: damaskTexture(aniso, [W / 0.7, 2.4 / 0.7]), roughness: 0.85, envMapIntensity: 0.3 }),
    damaskSide: new THREE.MeshStandardMaterial({ map: damaskTexture(aniso, [D / 0.7, 2.4 / 0.7]), roughness: 0.85, envMapIntensity: 0.3 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: 0.8, envMapIntensity: 0.3 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 1, envMapIntensity: 0.2, emissive: 0xf4efe4, emissiveIntensity: 0.25 }),
    floor: new THREE.MeshStandardMaterial({ map: parquetTexture(aniso, [W / 1.2, D / 1.2]), roughness: 0.35, metalness: 0.05, envMapIntensity: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.85, envMapIntensity: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 1.4, depthWrite: false }),
    leatherTop: new THREE.MeshStandardMaterial({ color: 0x2f4a3c, roughness: 0.6, envMapIntensity: 0.35 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0xe9e0cf, roughness: 0.95, envMapIntensity: 0.2 }),
  };

  const box = (w, h, d, mat, x, y, z, parent = group, block = false) => {
    const m = new THREE.Mesh(geoBox, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    parent.add(m);
    if (block) blockers.push(m);
    return m;
  };
  const plane = (w, h, mat, x, y, z, rotY, parent = group) => {
    const m = new THREE.Mesh(geoPlane, mat);
    m.scale.set(w, h, 1);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    parent.add(m);
    blockers.push(m);
    return m;
  };

  // Things fixed to each wall. Seen from outside the room a wall is see-through, so what hangs
  // on it would show its back; cull() hides a wall's things while the wall faces away.
  const walls = {
    back: { n: [0, 1], p: [0, -D / 2], objects: [] },
    front: { n: [0, -1], p: [0, D / 2], objects: [] },
    left: { n: [1, 0], p: [-W / 2, 0], objects: [] },
    right: { n: [-1, 0], p: [W / 2, 0], objects: [] },
  };

  // ---- shell -------------------------------------------------------------------------
  const floor = plane(W, D, M.floor, 0, 0, 0, 0);
  floor.rotation.set(-Math.PI / 2, 0, 0);
  floor.name = 'floor';
  const ceil = plane(W, D, M.ceiling, 0, H, 0, 0);
  ceil.rotation.set(Math.PI / 2, 0, 0);
  // Each wall: lacquered dado, damask above, gilded rails, cream cornice.
  const DADO = 0.9, RAIL = 3.25;
  const wall = (key, len, x, z, rotY, damask) => {
    const g = new THREE.Group();
    walls[key].objects.push(g);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
    plane(len, DADO, M.lacquer, 0, DADO / 2, 0, 0, g);
    plane(len, RAIL - DADO, damask, 0, (DADO + RAIL) / 2, 0, 0, g);
    plane(len, H - RAIL, M.cream, 0, (RAIL + H) / 2, 0, 0, g);
    box(len, 0.05, 0.03, M.gold, 0, DADO, 0.015, g);
    box(len, 0.06, 0.05, M.gold, 0, RAIL, 0.025, g);
    box(len, 0.12, 0.1, M.cream, 0, H - 0.06, 0.05, g);
    box(len, 0.02, 0.11, M.gold, 0, H - 0.13, 0.055, g);
    box(len, 0.12, 0.02, M.lacquerDark, 0, 0.06, 0.01, g); // skirting
    return g;
  };
  wall('back', W, 0, -D / 2, 0, M.damask);
  wall('front', W, 0, D / 2, Math.PI, M.damask);
  wall('left', D, -W / 2, 0, Math.PI / 2, M.damaskSide);
  wall('right', D, W / 2, 0, -Math.PI / 2, M.damaskSide);
  // slab and wall caps, dark like a section cut
  box(W + 2 * T, 0.12, D + 2 * T, M.dark, 0, -0.07, 0);
  box(W + 2 * T, 0.04, T, M.dark, 0, H + 0.02, -D / 2 - T / 2);
  box(W + 2 * T, 0.04, T, M.dark, 0, H + 0.02, D / 2 + T / 2);
  box(T, 0.04, D, M.dark, -W / 2 - T / 2, H + 0.02, 0);
  box(T, 0.04, D, M.dark, W / 2 + T / 2, H + 0.02, 0);
  // ceiling rose
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 40), M.gold);
  rose.position.set(TABLE.x, H - 0.015, TABLE.z);
  group.add(rose);

  // ---- bookcases ---------------------------------------------------------------------
  const BOOK_COLORS = [0x5b1f1a, 0x22334f, 0x2f4a3c, 0x7a5a32, 0x1d1b1a, 0x6a2a3a, 0x8a6a3c, 0x3b2a22, 0x4a5a6a, 0xa38a5a];
  const books = [];
  const units = [];
  const CASE_H = 2.75, CASE_D = 0.44, BASE_H = 0.86;
  function bookcase(key, x, z, rotY, w = 1.0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    group.add(g);
    units.push(g);
    walls[key].objects.push(g);
    // lower cabinet with two gilt-framed doors
    box(w, BASE_H, CASE_D, M.lacquer, 0, BASE_H / 2, CASE_D / 2, g, true);
    [-w / 4, w / 4].forEach((dx) => {
      const pw = w / 2 - 0.1, ph = BASE_H - 0.22;
      box(pw, 0.012, 0.012, M.gold, dx, BASE_H / 2 + ph / 2, CASE_D + 0.006, g);
      box(pw, 0.012, 0.012, M.gold, dx, BASE_H / 2 - ph / 2, CASE_D + 0.006, g);
      box(0.012, ph, 0.012, M.gold, dx - pw / 2, BASE_H / 2, CASE_D + 0.006, g);
      box(0.012, ph, 0.012, M.gold, dx + pw / 2, BASE_H / 2, CASE_D + 0.006, g);
    });
    box(w + 0.04, 0.04, CASE_D + 0.04, M.lacquer, 0, BASE_H + 0.02, CASE_D / 2 + 0.01, g);
    // upper glazed case
    const top = CASE_H - 0.14, inner = top - BASE_H - 0.04, d2 = CASE_D - 0.08;
    box(w, inner, 0.02, M.lacquerDark, 0, BASE_H + 0.04 + inner / 2, 0.01, g);
    box(0.04, inner, d2, M.lacquer, -w / 2 + 0.02, BASE_H + 0.04 + inner / 2, d2 / 2, g);
    box(0.04, inner, d2, M.lacquer, w / 2 - 0.02, BASE_H + 0.04 + inner / 2, d2 / 2, g);
    const shelves = 4, step = inner / shelves;
    for (let s = 0; s < shelves; s++) {
      const y = BASE_H + 0.04 + s * step;
      if (s) box(w - 0.08, 0.025, d2 - 0.02, M.lacquer, 0, y, d2 / 2, g);
      books.push({ g, key, y: y + 0.0125, w: w - 0.1, d: d2, maxH: step - 0.05 });
    }
    // cornice with a gilt band
    box(w + 0.08, 0.14, CASE_D + 0.02, M.lacquer, 0, top + 0.07, CASE_D / 2, g, true);
    box(w + 0.08, 0.025, 0.02, M.gold, 0, top + 0.03, CASE_D + 0.02, g);
    box(w + 0.1, 0.02, CASE_D + 0.05, M.gold, 0, top + 0.15, CASE_D / 2 + 0.01, g);
    // glazed doors: gilt glazing bars and glass
    const gy = BASE_H + 0.04 + inner / 2;
    box(0.035, inner, 0.03, M.lacquer, 0, gy, d2 + 0.01, g);
    [-w / 4, w / 4].forEach((dx) => {
      box(0.012, inner - 0.04, 0.012, M.gold, dx, gy, d2 + 0.03, g);
      [1, 2].forEach((k) => box(w / 2 - 0.06, 0.01, 0.01, M.gold, dx, BASE_H + 0.04 + (inner * k) / 3, d2 + 0.03, g));
    });
    const glass = new THREE.Mesh(geoPlane, M.glass);
    glass.scale.set(w - 0.06, inner, 1);
    glass.position.set(0, gy, d2 + 0.02);
    g.add(glass);
    const back = box(w, CASE_H, 0.02, M.lacquer, 0, CASE_H / 2, 0.01, g, true);
    back.visible = false; // a solid back for clicks only
  }
  for (let i = 0; i < 7; i++) bookcase('back', -3 + i, -D / 2, 0);
  for (let i = 0; i < 5; i++) bookcase('left', -W / 2, -2 + i, Math.PI / 2);
  [-2.9, -1.9, 1.9, 2.9].forEach((z) => bookcase('right', W / 2, z, -Math.PI / 2));

  // Books: one instanced mesh for all of them, each with its own colour.
  const r = rng(42);
  const placed = [];
  books.forEach((s) => {
    let x = -s.w / 2;
    while (x < s.w / 2 - 0.03) {
      const bw = 0.022 + r() * 0.035, bh = Math.min(s.maxH, 0.19 + r() * 0.12), bd = s.d * (0.7 + r() * 0.25);
      if (r() < 0.06) { x += 0.05 + r() * 0.08; continue; } // a gap now and then
      if (x + bw > s.w / 2) break;
      placed.push({ s, x: x + bw / 2, bw, bh, bd, color: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)], lean: r() < 0.04 ? 0.12 : 0 });
      x += bw + 0.002;
    }
  });
  const bookMat = new THREE.MeshStandardMaterial({ roughness: 0.65, envMapIntensity: 0.35 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  group.updateMatrixWorld(true);
  Object.entries(walls).forEach(([key, wl]) => {
    const list = placed.filter((b) => b.s.key === key);
    if (!list.length) return;
    // one instanced mesh of books per wall, each book with its own colour, and gilt bands on the spines
    const bookMesh = new THREE.InstancedMesh(geoBox, bookMat, list.length);
    const bandMesh = new THREE.InstancedMesh(geoBox, M.gold, list.length * 2);
    list.forEach((b, k) => {
      e.set(0, 0, b.lean);
      q.setFromEuler(e);
      m4.compose(v.set(b.x, b.s.y + b.bh / 2, 0.02 + b.bd / 2), q, sc.set(b.bw, b.bh, b.bd));
      m4.premultiply(b.s.g.matrixWorld);
      bookMesh.setMatrixAt(k, m4);
      bookMesh.setColorAt(k, col.setHex(b.color).multiplyScalar(0.75 + r() * 0.4));
      [0.2, 0.8].forEach((f, j) => {
        m4.compose(v.set(b.x, b.s.y + b.bh * f, 0.02 + b.bd + 0.001), q, sc.set(b.bw * 0.9, 0.006, 0.002));
        m4.premultiply(b.s.g.matrixWorld);
        bandMesh.setMatrixAt(k * 2 + j, m4);
      });
    });
    group.add(bookMesh, bandMesh);
    wl.objects.push(bookMesh, bandMesh);
  });

  // ---- window with drapes on the right wall -------------------------------------------
  const win = new THREE.Group();
  win.position.set(W / 2, 0, 0);
  win.rotation.y = -Math.PI / 2;
  group.add(win);
  walls.right.objects.push(win);
  const skyC = makeCanvas(64, 256), sg = skyC.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#dfe9f2'); grad.addColorStop(0.7, '#f6f1e4'); grad.addColorStop(1, '#e8dcc0');
  sg.fillStyle = grad; sg.fillRect(0, 0, 64, 256);
  const sky = new THREE.Mesh(geoPlane, new THREE.MeshBasicMaterial({ map: toTexture(skyC), toneMapped: false }));
  sky.scale.set(1.5, 2.3, 1);
  sky.position.set(0, 0.75 + 1.15, 0.01);
  win.add(sky);
  box(1.6, 0.06, 0.08, M.lacquer, 0, 0.72, 0.04, win);
  box(1.6, 0.06, 0.06, M.lacquer, 0, 3.08, 0.03, win);
  [-0.78, 0, 0.78].forEach((x) => box(0.05, 2.34, 0.06, M.lacquer, x, 1.9, 0.03, win));
  [1.3, 1.9, 2.5].forEach((y) => box(1.56, 0.03, 0.04, M.lacquer, 0, y, 0.03, win));
  // drapes: soft folds drawn on a canvas
  const foldC = makeCanvas(256, 16), fg = foldC.getContext('2d');
  for (let x = 0; x < 256; x++) {
    const s = 0.82 + 0.18 * Math.cos((x / 256) * Math.PI * 10);
    fg.fillStyle = `rgb(${Math.round(232 * s)},${Math.round(222 * s)},${Math.round(200 * s)})`;
    fg.fillRect(x, 0, 1, 16);
  }
  const drapeMat = new THREE.MeshStandardMaterial({ map: toTexture(foldC), roughness: 0.95, envMapIntensity: 0.2, side: THREE.DoubleSide });
  [-1.05, 1.05].forEach((x) => {
    const d = new THREE.Mesh(geoPlane, drapeMat);
    d.scale.set(0.55, 3.0, 1);
    d.position.set(x, 1.6, 0.12);
    win.add(d);
    box(0.08, 0.04, 0.1, M.gold, x * 0.95, 1.1, 0.16, win); // tie-back
  });
  box(2.8, 0.28, 0.14, M.lacquer, 0, 3.2, 0.1, win); // pelmet
  box(2.8, 0.03, 0.02, M.gold, 0, 3.08, 0.18, win);

  // ---- the library table ---------------------------------------------------------------
  const { x: tx, z: tz, w: tw, d: td, top } = TABLE;
  const table = new THREE.Group();
  table.position.set(tx, 0, tz);
  group.add(table);
  box(tw, 0.05, td, M.lacquer, 0, top - 0.025, 0, table, true);
  box(tw - 0.22, 0.004, td - 0.22, M.leatherTop, 0, top + 0.002, 0, table);
  box(tw + 0.02, 0.015, td + 0.02, M.gold, 0, top - 0.055, 0, table);
  box(tw - 0.1, 0.12, td - 0.1, M.lacquer, 0, top - 0.12, 0, table);
  // carved legs with gilt feet and collars
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const lx = sx * (tw / 2 - 0.09), lz = sz * (td / 2 - 0.09);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, top - 0.18, 12), M.lacquer);
    leg.position.set(lx, (top - 0.18) / 2, lz);
    table.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), M.gold);
    foot.position.set(lx, 0.03, lz);
    table.add(foot);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.01, 6, 16), M.gold);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(lx, top - 0.19, lz);
    table.add(collar);
  });
  // gilt drawer outlines on the apron
  [-0.8, 0, 0.8].forEach((dx) => {
    box(0.6, 0.008, 0.008, M.gold, dx, top - 0.08, td / 2 - 0.045, table);
    box(0.6, 0.008, 0.008, M.gold, dx, top - 0.16, td / 2 - 0.045, table);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.gold);
    knob.position.set(dx, top - 0.12, td / 2 - 0.04);
    table.add(knob);
  });

  // chair behind the table
  const chair = new THREE.Group();
  chair.position.set(tx, 0, tz - td / 2 - 0.45);
  group.add(chair);
  box(0.56, 0.1, 0.52, M.fabric, 0, 0.47, 0, chair);
  box(0.6, 0.04, 0.56, M.lacquer, 0, 0.41, 0, chair);
  box(0.56, 0.62, 0.08, M.fabric, 0, 0.84, -0.24, chair);
  box(0.6, 0.66, 0.04, M.lacquer, 0, 0.84, -0.29, chair);
  box(0.62, 0.03, 0.06, M.gold, 0, 1.18, -0.28, chair);
  [[-0.26, -0.24], [0.26, -0.24], [-0.26, 0.24], [0.26, 0.24]].forEach(([x, z]) => box(0.04, 0.4, 0.04, M.gold, x, 0.2, z, chair));

  // a reading lamp on the table, brass with a green glass shade
  const lamp = new THREE.Group();
  lamp.position.set(tx + tw / 2 - 0.25, top, tz - td / 2 + 0.2);
  group.add(lamp);
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.03, 20), M.gold);
  lb.position.y = 0.015;
  lamp.add(lb);
  box(0.016, 0.36, 0.016, M.gold, 0, 0.2, 0, lamp);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.12, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f5a3c, roughness: 0.25, emissive: 0x0c2a1a, side: THREE.DoubleSide, envMapIntensity: 0.8 }));
  shade.position.y = 0.4;
  lamp.add(shade);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ color: 0xfff1cf, toneMapped: false }));
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.345;
  lamp.add(glow);

  // a globe on a gilt stand in the corner
  const globe = new THREE.Group();
  globe.position.set(-2.9, 0, 2.5);
  group.add(globe);
  const gc = makeCanvas(512, 256), gg = gc.getContext('2d'), gr = rng(9);
  gg.fillStyle = '#b9a57a'; gg.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i++) {
    gg.fillStyle = `rgba(${120 + gr() * 40},${95 + gr() * 30},${60 + gr() * 20},0.75)`;
    gg.beginPath();
    gg.ellipse(gr() * 512, 40 + gr() * 176, 20 + gr() * 60, 10 + gr() * 40, gr() * 3, 0, Math.PI * 2);
    gg.fill();
  }
  gg.strokeStyle = 'rgba(80,60,30,0.35)';
  for (let x = 0; x < 512; x += 32) { gg.beginPath(); gg.moveTo(x, 0); gg.lineTo(x, 256); gg.stroke(); }
  for (let y = 0; y < 256; y += 32) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(512, y); gg.stroke(); }
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 20), new THREE.MeshStandardMaterial({ map: toTexture(gc, { aniso }), roughness: 0.4, envMapIntensity: 0.6 }));
  sphere.position.y = 1.0;
  sphere.rotation.z = 0.41;
  globe.add(sphere);
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.012, 8, 40), M.gold);
  meridian.position.y = 1.0;
  meridian.rotation.z = 0.41;
  globe.add(meridian);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.72, 12), M.lacquer);
  ped.position.y = 0.4;
  globe.add(ped);
  const gbase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.05, 24), M.gold);
  gbase.position.y = 0.025;
  globe.add(gbase);

  // an armchair by the window
  const arm = new THREE.Group();
  arm.position.set(3.0, 0, 2.2);
  arm.rotation.y = -Math.PI * 0.75;
  group.add(arm);
  box(0.7, 0.14, 0.66, M.fabric, 0, 0.46, 0, arm);
  box(0.74, 0.06, 0.7, M.lacquer, 0, 0.37, 0, arm);
  box(0.7, 0.66, 0.12, M.fabric, 0, 0.84, -0.3, arm);
  [-0.37, 0.37].forEach((x) => { box(0.08, 0.24, 0.62, M.fabric, x, 0.6, 0, arm); box(0.09, 0.02, 0.64, M.gold, x, 0.73, 0, arm); });
  [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]].forEach(([x, z]) => box(0.05, 0.34, 0.05, M.gold, x, 0.17, z, arm));

  // ---- the chandelier ------------------------------------------------------------------
  const ch = new THREE.Group();
  ch.position.set(TABLE.x, H, TABLE.z);
  group.add(ch);
  box(0.02, 0.5, 0.02, M.gold, 0, -0.25, 0, ch);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), M.gold);
  body.position.y = -0.62;
  ch.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.015, 8, 48), M.gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.7;
  ch.add(ring);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6, toneMapped: false });
  const candleMat = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.5, emissive: 0x6a5a40, emissiveIntensity: 0.3 });
  const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.022), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.75, envMapIntensity: 2 }), 64);
  let ci = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, x = Math.cos(a) * 0.46, z = Math.sin(a) * 0.46;
    const armM = new THREE.Mesh(geoBox, M.gold);
    armM.scale.set(0.46, 0.015, 0.015);
    armM.position.set(x / 2, -0.66, z / 2);
    armM.rotation.y = -a;
    ch.add(armM);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.03, 12), M.gold);
    cup.position.set(x, -0.68, z);
    ch.add(cup);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), candleMat);
    candle.position.set(x, -0.6, z);
    ch.add(candle);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), bulbMat);
    bulb.position.set(x, -0.52, z);
    bulb.scale.y = 1.5;
    ch.add(bulb);
    for (let j = 0; j < 8; j++) {
      const aa = a + (j / 8) * (Math.PI / 4), rr = 0.3 + (j % 2) * 0.12;
      m4.compose(v.set(Math.cos(aa) * rr, -0.78 - (j % 3) * 0.05, Math.sin(aa) * rr), q.identity(), sc.set(1, 1.6, 1));
      crystals.setMatrixAt(ci++, m4);
    }
  }
  ch.add(crystals);

  // ---- the Persian rug, from the photograph in assets/carpet.jpg -------------------------
  const RW = 3.6, RL = RW * (621 / 467);
  const rugC = makeCanvas(700, Math.round(700 * (621 / 467))), rg = rugC.getContext('2d');
  rg.fillStyle = '#7b1d1a';
  rg.fillRect(0, 0, rugC.width, rugC.height);
  const rugTex = toTexture(rugC, { aniso });
  const rugImg = new Image();
  rugImg.onload = () => { rg.drawImage(rugImg, 3, 14, 467, 621, 0, 0, rugC.width, rugC.height); rugTex.needsUpdate = true; onChange(); };
  rugImg.src = 'assets/carpet.jpg';
  const rug = new THREE.Mesh(geoPlane, new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, envMapIntensity: 0.25 }));
  rug.scale.set(RW, RL, 1);
  rug.rotation.set(-Math.PI / 2, 0, Math.PI / 2); // long side along x
  rug.position.set(TABLE.x, 0.0125, TABLE.z); // just above its edge slab
  group.add(rug);
  blockers.push(rug);
  rug.name = 'floor';
  const rugEdge = box(RL, 0.012, RW, new THREE.MeshStandardMaterial({ color: 0x4a1210, roughness: 1 }), TABLE.x, 0.004, TABLE.z);
  rugEdge.raycast = () => {};

  // ---- light ---------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xfff8ee, 0xb8a888, 1.15);
  scene.add(hemi);
  const chLight = new THREE.PointLight(0xffe2b0, 14, 0, 2);
  chLight.position.set(TABLE.x, H - 0.75, TABLE.z);
  scene.add(chLight);
  const day = new THREE.DirectionalLight(0xfff6e8, 0.9);
  day.position.set(W, 3, 0.5);
  day.target.position.set(0, 0, 0);
  scene.add(day, day.target);
  const lampLight = new THREE.SpotLight(0xffe6b8, 4, 0, 0.9, 0.7, 2);
  lampLight.position.copy(lamp.position).add(new THREE.Vector3(0, 0.38, 0));
  lampLight.target.position.set(TABLE.x, TABLE.top, TABLE.z + 0.2);
  scene.add(lampLight, lampLight.target);

  function cull(camera) {
    const c = camera.position;
    Object.values(walls).forEach((wl) => {
      const show = (c.x - wl.p[0]) * wl.n[0] + (c.z - wl.p[1]) * wl.n[1] > 0;
      if (wl.shown === show) return;
      wl.shown = show;
      wl.objects.forEach((o) => { o.visible = show; });
    });
  }

  let onChange = () => {};
  return {
    group, blockers, floors: [floor, rug], cull,
    setOnChange: (fn) => { onChange = fn; },
  };
}
