// The six albums on the library table. Closed, each is a leather-bound book with a tooled
// cover. Opened, it lies flat in front of the visitor: the inside of the front board carries
// the album's introduction, and every leaf after it is a page of the Dieulafoy albums, turned
// with a page flip. The scans come from the INHA image server as the pages are reached.
import * as THREE from 'three';
import { TABLE } from './study.js';
import { blankPageCanvas, coverCanvas, GOLD, introPageCanvas, leatherCanvas, leatherColor, toTexture } from './textures.js';

export const AW = 0.42, AD = 0.32, AT = 0.065; // an oblong album, about 42 x 32 cm
const PAGE = '!1100,1100';
const FLIP_MS = 650;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function buildAlbums(scene, rooms, itemsByRoom, { aniso = 4, img, onChange }) {
  const { top } = TABLE;
  const y0 = top + AT / 2;
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const geoPlane = new THREE.PlaneGeometry(1, 1);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.9, envMapIntensity: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.3, metalness: 0.85, envMapIntensity: 1.1 });

  // Where the albums lie: two rows of three; when one is open the others wait in two stacks.
  const home = (i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const r = Math.sin(i * 12.9898) * 0.06;
    return { x: TABLE.x + (col - 1) * 0.74, y: y0, z: TABLE.z - 0.24 + row * 0.46, ry: r };
  };
  const aside = (slot) => {
    const left = slot < 3, k = left ? slot : slot - 3;
    return { x: TABLE.x + (left ? -1 : 1) * 1.02, y: y0 + k * (AT + 0.002), z: TABLE.z + 0.05, ry: (left ? 1 : -1) * (0.08 + k * 0.05) };
  };
  const READ = { x: TABLE.x, y: y0, z: TABLE.z + 0.16, ry: 0 };

  const albums = rooms.map((room, i) => {
    const leather = new THREE.MeshStandardMaterial({ map: toTexture(leatherCanvas(leatherColor(room), room.n * 3), { aniso }), roughness: 0.55, envMapIntensity: 0.4 });
    const cover = new THREE.MeshStandardMaterial({ map: toTexture(coverCanvas(room), { aniso }), roughness: 0.5, metalness: 0.05, envMapIntensity: 0.5 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(geoBox, [edgeMat, leather, cover, leather, edgeMat, edgeMat]);
    body.scale.set(AW, AT, AD);
    g.add(body);
    // a leather spine wrapping the left edge, with gilt bands
    const spine = new THREE.Mesh(geoBox, leather);
    spine.scale.set(0.02, AT + 0.006, AD + 0.006);
    spine.position.x = -AW / 2 + 0.008;
    g.add(spine);
    [-0.1, 0, 0.1].forEach((z) => {
      const band = new THREE.Mesh(geoBox, goldMat);
      band.scale.set(0.022, AT + 0.008, 0.008);
      band.position.set(-AW / 2 + 0.008, 0, z);
      g.add(band);
    });
    // boards slightly larger than the leaves
    [AT / 2, -AT / 2].forEach((y) => {
      const b = new THREE.Mesh(geoBox, leather);
      b.scale.set(AW + 0.008, 0.006, AD + 0.008);
      b.position.y = y;
      g.add(b);
    });
    const topCover = new THREE.Mesh(geoPlane, cover);
    topCover.scale.set(AW + 0.008, AD + 0.008, 1);
    topCover.rotation.x = -Math.PI / 2;
    topCover.position.y = AT / 2 + 0.0031;
    g.add(topCover);
    const p = home(i);
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.ry;
    scene.add(g);
    const items = itemsByRoom[room.id];
    const pages = [{ kind: 'intro' }, ...items.map((it, k) => ({ kind: 'item', it, k }))];
    if (pages.length % 2) pages.push({ kind: 'end' });
    const a = { room, i, g, items, pages, spreads: pages.length / 2, leather, cover, introTex: null };
    g.traverse((o) => { if (o.isMesh) o.userData.album = a; });
    return a;
  });

  // ---- the open album -------------------------------------------------------------------
  const open = new THREE.Group();
  open.visible = false;
  scene.add(open);
  const boards = [-1, 1].map((s) => { const b = new THREE.Mesh(geoBox, edgeMat); b.scale.set(AW + 0.008, 0.008, AD + 0.008); b.position.set(s * (AW / 2 + 0.004), 0.004, 0); open.add(b); return b; });
  const stacks = [-1, 1].map((s) => { const b = new THREE.Mesh(geoBox, edgeMat); b.scale.set(AW - 0.006, 0.014, AD - 0.006); b.position.set(s * (AW / 2 + 0.002), 0.015, 0); open.add(b); return b; });
  const gutter = new THREE.Mesh(geoBox, new THREE.MeshStandardMaterial({ color: 0xd8ccb4, roughness: 1 }));
  gutter.scale.set(0.012, 0.006, AD - 0.01);
  gutter.position.y = 0.022;
  open.add(gutter);
  // Page faces always carry a map, so changing pages never recompiles a shader.
  const blank = toTexture(blankPageCanvas(), { aniso });
  const pageMat = () => new THREE.MeshStandardMaterial({ map: blank, emissiveMap: blank, color: 0xffffff, roughness: 0.85, envMapIntensity: 0.25, emissive: 0xffffff, emissiveIntensity: 0.12 });
  const face = (side, y) => {
    const m = new THREE.Mesh(geoPlane, pageMat());
    m.rotation.x = -Math.PI / 2;
    m.position.set(side * (AW / 2 + 0.002), y, 0);
    m.userData.side = side;
    open.add(m);
    return m;
  };
  const leftPage = face(-1, 0.0225), rightPage = face(1, 0.0225);
  // the turning leaf: pivots on the spine, front face up on the right, back face up on the left
  const leaf = new THREE.Group();
  leaf.position.y = 0.024;
  leaf.visible = false;
  open.add(leaf);
  const leafFront = new THREE.Mesh(geoPlane, pageMat());
  leafFront.rotation.set(-Math.PI / 2, 0, 0);
  leafFront.position.set(AW / 2, 0.0008, 0);
  const leafBack = new THREE.Mesh(geoPlane, pageMat());
  leafBack.rotation.set(Math.PI / 2, 0, Math.PI);
  leafBack.position.set(AW / 2, -0.0008, 0);
  const leafCard = new THREE.Mesh(geoBox, edgeMat); // thickness, so the leaf never looks paper-thin edge on
  leafCard.scale.set(AW - 0.004, 0.001, AD - 0.006);
  leafCard.position.x = AW / 2;
  leaf.add(leafFront, leafBack, leafCard);

  // ---- textures --------------------------------------------------------------------------
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const cache = new Map(); // key -> { tex, used }
  const endTex = toTexture(blankPageCanvas('End of the album'), { aniso });
  let clock = 0;
  function texFor(a, page) {
    if (page.kind === 'end') return { tex: endTex, ar: AW / AD };
    if (page.kind === 'intro') {
      a.introTex = a.introTex || toTexture(introPageCanvas(a.room, a.items.length), { aniso });
      return { tex: a.introTex, ar: AW / AD };
    }
    const key = `${page.it.a}-${page.it.p}`;
    const ar = page.it.w / page.it.h;
    let c = cache.get(key);
    if (!c) {
      c = { tex: null, used: 0, waiters: [] };
      cache.set(key, c);
      loader.load(img(page.it, PAGE), (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = aniso;
        c.tex = t;
        c.waiters.forEach((fn) => fn(t));
        c.waiters = [];
        onChange();
      });
      trim();
    }
    c.used = ++clock;
    return { tex: c.tex, ar, wait: (fn) => (c.tex ? fn(c.tex) : c.waiters.push(fn)) };
  }
  function trim() {
    if (cache.size <= 24) return;
    const old = [...cache.entries()].filter(([, c]) => c.tex).sort((x, y) => x[1].used - y[1].used).slice(0, cache.size - 24);
    old.forEach(([k, c]) => {
      if ([leftPage, rightPage, leafFront, leafBack].some((m) => m.material.map === c.tex)) return;
      c.tex.dispose();
      cache.delete(k);
    });
  }
  // Put a page on a face, keeping the scan's proportions inside the leaf.
  function dress(mesh, a, page) {
    const { tex, ar, wait } = texFor(a, page);
    const set = (t) => {
      mesh.material.map = t;
      mesh.material.emissiveMap = t;
      let w = AW - 0.012, h = w / ar;
      if (h > AD - 0.012) { h = AD - 0.012; w = h * ar; }
      mesh.scale.set(w, h, 1);
      onChange();
    };
    mesh.userData.page = page;
    set(tex || blank);
    if (!tex && wait) wait((t) => { if (mesh.userData.page === page) set(t); });
  }
  function preload(a, s) {
    [s - 1, s + 1, s + 2].forEach((k) => {
      if (k < 0 || k >= a.spreads) return;
      texFor(a, a.pages[2 * k]);
      texFor(a, a.pages[2 * k + 1]);
    });
  }

  // ---- state and animation ----------------------------------------------------------------
  const state = { current: null, spread: 0, busy: false, tweens: [] };
  const poseOf = (g) => ({ x: g.position.x, y: g.position.y, z: g.position.z, ry: g.rotation.y });
  function move(g, to, dur, lift = 0) {
    return new Promise((resolve) => state.tweens.push({ g, from: poseOf(g), to, t0: performance.now(), dur, lift, resolve }));
  }
  function animateLeaf(from, to, dur) {
    return new Promise((resolve) => state.tweens.push({ leaf: true, from, to, t0: performance.now(), dur, resolve }));
  }
  function update(now) {
    if (!state.tweens.length) return false;
    state.tweens = state.tweens.filter((tw) => {
      const k = Math.min(1, (now - tw.t0) / tw.dur), e = ease(k);
      if (tw.leaf) {
        leaf.rotation.z = tw.from + (tw.to - tw.from) * e;
      } else {
        tw.g.position.set(
          tw.from.x + (tw.to.x - tw.from.x) * e,
          tw.from.y + (tw.to.y - tw.from.y) * e + Math.sin(Math.PI * k) * tw.lift,
          tw.from.z + (tw.to.z - tw.from.z) * e,
        );
        tw.g.rotation.y = tw.from.ry + (tw.to.ry - tw.from.ry) * e;
      }
      if (k >= 1) { tw.resolve(); return false; }
      return true;
    });
    return true;
  }

  function showSpread(s) {
    const a = state.current;
    state.spread = s;
    dress(leftPage, a, a.pages[2 * s]);
    dress(rightPage, a, a.pages[2 * s + 1]);
    preload(a, s);
  }

  async function openAlbum(a, spread = 0) {
    if (state.busy) return;
    if (state.current === a) { if (spread !== state.spread) goToSpread(spread); return; }
    state.busy = true;
    if (state.current) await closeAlbum(true);
    state.current = a;
    const others = albums.filter((b) => b !== a);
    others.forEach((b, k) => move(b.g, aside(k), 700, 0.05));
    await move(a.g, READ, 800, 0.18);
    // swap the closed book for the open one, and lift the front board over
    a.g.visible = false;
    open.position.set(READ.x, top, READ.z);
    boards.forEach((b) => { b.material = a.leather; });
    open.visible = true;
    dress(leftPage, a, a.pages[0]);
    leftPage.visible = false;
    dress(rightPage, a, a.pages[2 * spread + 1]);
    leafFront.material.map = a.cover.map;
    leafFront.material.emissiveMap = a.cover.map;
    leafFront.scale.set(AW + 0.008, AD + 0.008, 1);
    leafFront.userData.page = null;
    dress(leafBack, a, a.pages[2 * spread]);
    leaf.rotation.z = 0;
    leaf.visible = true;
    await animateLeaf(0, Math.PI, 900);
    leaf.visible = false;
    leftPage.visible = true;
    showSpread(spread);
    state.busy = false;
    onChange();
    return a;
  }

  async function closeAlbum(keepBusy = false) {
    const a = state.current;
    if (!a) return;
    if (!keepBusy && state.busy) return;
    state.busy = true;
    // the front board comes back over the pages
    dress(leafBack, a, a.pages[2 * state.spread]);
    leafFront.material.map = a.cover.map;
    leafFront.material.emissiveMap = a.cover.map;
    leafFront.scale.set(AW + 0.008, AD + 0.008, 1);
    leftPage.visible = false;
    leaf.rotation.z = Math.PI;
    leaf.visible = true;
    await animateLeaf(Math.PI, 0, 800);
    leaf.visible = false;
    open.visible = false;
    leftPage.visible = true;
    a.g.visible = true;
    state.current = null;
    const back = albums.map((b) => move(b.g, home(b.i), 800, b === a ? 0.15 : 0.04));
    await Promise.all(back);
    if (!keepBusy) state.busy = false;
    onChange();
  }

  async function turn(dir) {
    const a = state.current;
    if (!a || state.busy) return;
    const s = state.spread, n = s + dir;
    if (n < 0 || n >= a.spreads) return;
    state.busy = true;
    leafFront.scale.set(1, 1, 1);
    if (dir > 0) {
      dress(leafFront, a, a.pages[2 * s + 1]);
      dress(leafBack, a, a.pages[2 * n]);
      dress(rightPage, a, a.pages[2 * n + 1]);
      leaf.rotation.z = 0;
      leaf.visible = true;
      await animateLeaf(0, Math.PI, FLIP_MS);
    } else {
      dress(leafBack, a, a.pages[2 * s]);
      dress(leafFront, a, a.pages[2 * n + 1]);
      dress(leftPage, a, a.pages[2 * n]);
      leaf.rotation.z = Math.PI;
      leaf.visible = true;
      await animateLeaf(Math.PI, 0, FLIP_MS);
    }
    leaf.visible = false;
    showSpread(n);
    state.busy = false;
    onChange();
  }

  function goToSpread(s) {
    const a = state.current;
    if (!a || state.busy) return;
    showSpread(Math.max(0, Math.min(a.spreads - 1, s)));
    onChange();
  }

  const spreadOf = (a, item) => Math.floor((a.items.indexOf(item) + 1) / 2);

  return {
    albums, state, update, openAlbum, closeAlbum, turn, goToSpread, spreadOf,
    pickables: [...albums.flatMap((a) => a.g.children), leftPage, rightPage],
    visiblePages: () => {
      const a = state.current;
      if (!a) return [];
      return [a.pages[2 * state.spread], a.pages[2 * state.spread + 1]].filter((p) => p.kind === 'item');
    },
    READ, home,
    // show the hidden open album for a moment, so its shaders compile at load time
    warmup: (fn) => { open.visible = leaf.visible = true; fn(); open.visible = leaf.visible = false; },
  };
}
