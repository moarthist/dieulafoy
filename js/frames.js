// Every album page in a walnut frame with a mat, a small wall label and a soft shadow.
// Frames, mats, labels and shadows are instanced; each picture is its own plane so its scan
// can stream in: a small thumbnail everywhere, a sharp image when the visitor comes close.
import * as THREE from 'three';
import { lightPoolTexture, softShadowTexture, woodTexture } from './textures.js';

const PHOTO_W = 0.36, PHOTO_H = 0.28;     // an album page is about 34 x 27 cm
const MAT = 0.06, BORDER = 0.035, DEPTH = 0.04;
const MIN_PITCH = 0.7;
const ROWS = { 2: [1.78, 1.2], 3: [2.12, 1.52, 0.92] };
const THUMB = '!160,160', SHARP = '!900,900';
const NEAR = 4.5, FAR = 8, MAX_LOADING = 6;

// Spread the pages of a room over its faces, column by column, left to right.
function hang(p, items) {
  const faces = p.faces.map((f) => ({ ...f, use: f.len - 2 * f.margin }));
  const capacity = faces.reduce((a, f) => a + Math.floor(f.use / MIN_PITCH), 0);
  const rows = items.length <= 2 * capacity ? 2 : 3;
  const cols = Math.ceil(items.length / rows);
  const total = faces.reduce((a, f) => a + f.use, 0);
  // largest-remainder share of the columns, by usable length
  let given = 0;
  faces.forEach((f) => {
    f.cap = Math.floor(f.use / MIN_PITCH);
    f.cols = Math.min(f.cap, Math.floor((cols * f.use) / total));
    given += f.cols;
  });
  while (given < cols) {
    const f = faces.filter((x) => x.cols < x.cap).sort((a, b) => (b.use / (b.cols + 1)) - (a.use / (a.cols + 1)))[0];
    f.cols += 1;
    given += 1;
  }
  const slots = [];
  faces.forEach((f) => {
    if (!f.cols) return;
    const pitch = f.use / f.cols;
    const r = [f.n[1], -f.n[0]]; // to the visitor's right when facing the wall
    const ys = ROWS[rows].filter((y) => !f.h || y + 0.3 < f.h);
    for (let c = 0; c < f.cols; c += 1) {
      const u = -f.use / 2 + pitch * (c + 0.5);
      ys.forEach((y) => slots.push({ x: f.c[0] + r[0] * u, z: f.c[1] + r[1] * u, y, n: f.n }));
    }
  });
  return slots.slice(0, items.length);
}

export function buildFrames(scene, plan, itemsByRoom, { aniso = 4, img }) {
  const frames = [];
  plan.forEach((p) => {
    const items = itemsByRoom[p.room.id];
    hang(p, items).forEach((s, i) => frames.push({ ...s, it: items[i], room: p.room, plan: p, i, count: items.length }));
  });
  frames.forEach((f, k) => { f.k = k; });

  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const geoPlane = new THREE.PlaneGeometry(1, 1);
  const n = frames.length;
  const wood = new THREE.InstancedMesh(geoBox, new THREE.MeshStandardMaterial({ map: woodTexture(aniso), roughness: 0.55, envMapIntensity: 0.45 }), n);
  const mats = new THREE.InstancedMesh(geoPlane, new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 1, envMapIntensity: 0.2 }), n);
  const labels = new THREE.InstancedMesh(geoPlane, new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.9, envMapIntensity: 0.2 }), n);
  const shadows = new THREE.InstancedMesh(geoPlane, new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, opacity: 0.42, depthWrite: false }), n);
  const pools = new THREE.InstancedMesh(geoPlane, new THREE.MeshBasicMaterial({ map: lightPoolTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), n);
  const placeholder = new THREE.MeshStandardMaterial({ color: 0xdcd8ce, roughness: 1, envMapIntensity: 0.1 });
  const glow = new THREE.Mesh(geoPlane, new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.5, depthWrite: false }));
  glow.visible = false;
  scene.add(glow);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const photos = [];
  frames.forEach((f, k) => {
    const ar = f.it.w / f.it.h;
    let pw = PHOTO_W, ph = PHOTO_W / ar;
    if (ph > PHOTO_H) { ph = PHOTO_H; pw = PHOTO_H * ar; }
    const w = pw + 2 * (MAT + BORDER), h = ph + 2 * (MAT + BORDER);
    const rotY = Math.atan2(f.n[0], f.n[1]);
    q.setFromAxisAngle(yAxis, rotY);
    const at = (d, dx = 0, dy = 0) => {
      const r = [f.n[1], -f.n[0]];
      return v.set(f.x + f.n[0] * d + r[0] * dx, f.y + dy, f.z + f.n[1] * d + r[1] * dx);
    };
    wood.setMatrixAt(k, m4.compose(at(DEPTH / 2), q, sc.set(w, h, DEPTH)));
    mats.setMatrixAt(k, m4.compose(at(DEPTH + 0.001), q, sc.set(w - 2 * BORDER, h - 2 * BORDER, 1)));
    labels.setMatrixAt(k, m4.compose(at(0.003, w / 2 - 0.05, -h / 2 - 0.06), q, sc.set(0.1, 0.035, 1)));
    shadows.setMatrixAt(k, m4.compose(at(0.002, 0.012, -0.03), q, sc.set(w + 0.2, h + 0.2, 1)));
    pools.setMatrixAt(k, m4.compose(at(0.001, 0, 0.12), q, sc.set(w * 2.0, h * 2.6, 1)));
    const photo = new THREE.Mesh(geoPlane, placeholder);
    photo.scale.set(pw, ph, 1);
    photo.position.copy(at(DEPTH + 0.003));
    photo.rotation.y = rotY;
    photo.userData.frame = f;
    scene.add(photo);
    photos.push(photo);
    Object.assign(f, { w, h, pw, ph, rotY, photo, center: new THREE.Vector3(f.x, f.y, f.z), normal: new THREE.Vector3(f.n[0], 0, f.n[1]) });
  });
  [wood, mats, labels, shadows, pools].forEach((m) => { m.instanceMatrix.needsUpdate = true; scene.add(m); });
  shadows.renderOrder = -2;
  pools.renderOrder = -1;
  [wood, mats].forEach((m) => { m.userData.frames = frames; });

  // ---- streaming -----------------------------------------------------------
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  let loading = 0;
  function load(f, tier) {
    loading += 1;
    f.pending = tier;
    loader.load(img(f.it, tier === 'sharp' ? SHARP : THUMB), (t) => {
      loading -= 1;
      f.pending = null;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      if (tier === 'thumb') f.thumb = t; else f.sharp = t;
      show(f);
    }, undefined, () => { loading -= 1; f.pending = null; f.failed = (f.failed || 0) + 1; });
  }
  function show(f) {
    const t = f.sharp || f.thumb;
    if (!t) return;
    if (f.photo.material === placeholder) {
      f.photo.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3 });
    } else if (f.photo.material.map !== t) {
      f.photo.material.map = t;
      f.photo.material.emissiveMap = t;
    }
  }
  const tmp = new THREE.Vector3();
  function stream(camera) {
    const cam = camera.position;
    let best = null, bestScore = Infinity;
    const sharpWanted = [];
    for (const f of frames) {
      const d = cam.distanceTo(f.center);
      if (f.sharp && d > FAR) {
        f.sharp.dispose();
        f.sharp = null;
        show(f);
      }
      if (f.pending || (f.failed || 0) > 2) continue;
      const facing = tmp.copy(cam).sub(f.center).dot(f.normal) > 0;
      if (!f.sharp && d < NEAR && facing) sharpWanted.push([d, f]);
      else if (!f.thumb && d + (facing ? 0 : 6) < bestScore) { best = f; bestScore = d + (facing ? 0 : 6); }
    }
    sharpWanted.sort((a, b) => a[0] - b[0]);
    for (const [, f] of sharpWanted) { if (loading >= MAX_LOADING) return; load(f, 'sharp'); }
    // thumbnails: the nearest few at a time
    while (loading < MAX_LOADING && best) {
      load(best, 'thumb');
      best = null; bestScore = Infinity;
      for (const f of frames) {
        if (f.thumb || f.pending || (f.failed || 0) > 2) continue;
        const d = cam.distanceTo(f.center);
        if (d < bestScore) { best = f; bestScore = d; }
      }
    }
  }

  // Frames on a wall that faces away from the camera are seen from behind through the
  // see-through section walls, so they are folded away until the wall turns to face you.
  const instanced = [wood, mats, labels, shadows, pools];
  const saved = instanced.map((m) => Float32Array.from(m.instanceMatrix.array));
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  frames.forEach((f) => { f.face = `${f.n[0]},${f.n[1]},${f.n[0] ? f.x.toFixed(2) : f.z.toFixed(2)}`; f.shown = true; });
  const faces = Object.values(frames.reduce((acc, f) => { (acc[f.face] = acc[f.face] || []).push(f); return acc; }, {}));
  function cull(camera) {
    const cam = camera.position;
    let changed = false;
    faces.forEach((list) => {
      const f0 = list[0];
      const show = (cam.x - f0.x) * f0.n[0] + (cam.z - f0.z) * f0.n[1] > 0;
      if (show === f0.shown) return;
      changed = true;
      list.forEach((f) => {
        f.shown = show;
        f.photo.visible = show;
        instanced.forEach((m, j) => {
          if (show) m.instanceMatrix.array.set(saved[j].subarray(f.k * 16, f.k * 16 + 16), f.k * 16);
          else m.setMatrixAt(f.k, zero);
        });
      });
    });
    if (changed) instanced.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }

  function setHover(f) {
    glow.visible = !!f;
    if (!f) return;
    glow.scale.set(f.w + 0.08, f.h + 0.08, 1);
    glow.position.set(f.x + f.n[0] * 0.004, f.y, f.z + f.n[1] * 0.004);
    glow.rotation.y = f.rotY;
  }

  return { frames, photos, pickables: [...photos, wood, mats], stream, setHover, cull };
}
