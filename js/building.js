// The building: a central hall with three rooms on each side, seen like a section model.
// Walls, floor and ceiling are single-sided planes that face INTO the rooms, so from above
// you look into every room. Axes: +x east along the hall, +y up, +z south.
import * as THREE from 'three';
import {
  closingCanvas, concreteTexture, doorSignCanvas, entranceCanvas, roomPanelCanvas, toTexture, woodTexture,
} from './textures.js';

export const B = {
  RW: 13, RD: 11, H: 3.6, HALL: 4, T: 0.2,
  DOOR_W: 2.4, DOOR_H: 2.7,
  CW_L: 6.5, CW_T: 0.24, CW_H: 2.9, // freestanding central wall in each room
  PANEL_W: 1.5, PANEL_H: 2.0,
};
B.X = (3 * B.RW) / 2;            // half length of the building
B.Z = B.HALL / 2 + B.RD;          // half depth

// Plan of the six rooms: 1–3 on the north side of the hall, west to east; 4–6 on the south
// side, east to west, so a visit goes round the hall.
export function planRooms(rooms) {
  const { RW, RD, HALL, T, DOOR_W, CW_L, CW_T, PANEL_W } = B;
  return rooms.map((room, i) => {
    const col = i < 3 ? i : 5 - i;
    const s = i < 3 ? -1 : 1;                 // direction from the hall into the room
    const x0 = -B.X + col * RW, x1 = x0 + RW, xc = x0 + RW / 2;
    const zHall = s * HALL / 2, zBack = s * (HALL / 2 + RD), zc = (zHall + zBack) / 2;
    const xa = x0 + T / 2, xb = x1 - T / 2, zh = zHall + s * T / 2, zk = zBack - s * T / 2;
    const zf = zc - s * CW_T / 2, zr = zc + s * CW_T / 2; // front (hall side) and rear faces of the central wall
    const seg = (CW_L - PANEL_W - 0.2) / 2;
    // Faces to hang pictures on, in visiting order. c: centre on the wall, n: normal into the room.
    const faces = [
      { c: [xc - (PANEL_W / 2 + 0.1 + seg / 2) * -s, zf], n: [0, -s], len: seg, margin: 0.12, h: B.CW_H },
      { c: [xc + (PANEL_W / 2 + 0.1 + seg / 2) * -s, zf], n: [0, -s], len: seg, margin: 0.12, h: B.CW_H },
      { c: [s < 0 ? xb : xa, (zh + zk) / 2], n: [s < 0 ? -1 : 1, 0], len: RD - T, margin: 0.45 },
      { c: [xc, zk], n: [0, -s], len: RW - T, margin: 0.45 },
      { c: [s < 0 ? xa : xb, (zh + zk) / 2], n: [s < 0 ? 1 : -1, 0], len: RD - T, margin: 0.45 },
      { c: [xc, zr], n: [0, s], len: CW_L, margin: 0.3, h: B.CW_H },
      { c: [(xa + xc - DOOR_W / 2) / 2, zh], n: [0, s], len: xc - DOOR_W / 2 - xa, margin: 0.35 },
      { c: [(xc + DOOR_W / 2 + xb) / 2, zh], n: [0, s], len: xb - xc - DOOR_W / 2, margin: 0.35 },
    ];
    return {
      room, i, s, x0, x1, xc, zHall, zBack, zc, xa, xb, zh, zk, zf, zr, faces,
      inside: (x, z) => x > x0 && x < x1 && (s < 0 ? z < zHall && z > zBack : z > zHall && z < zBack),
      view: {
        pos: [xc - 0.5 * s, 1.62, zh + s * 1.1],
        target: [xc, 1.45, zf],
        fov: 64,
      },
      panel: { pos: new THREE.Vector3(xc, 1.45, zf - s * 0.01), normal: new THREE.Vector3(0, 0, -s) },
    };
  });
}

export function buildBuilding(scene, plan, { aniso = 4, museum, counts }) {
  const { RW, H, HALL, T, DOOR_W, DOOR_H, CW_L, CW_T, CW_H, PANEL_W, PANEL_H, X, Z } = B;
  const group = new THREE.Group();
  group.name = 'building';
  scene.add(group);
  const blockers = [];

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 0.96, metalness: 0, envMapIntensity: 0.25 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf8f7f4, roughness: 1, envMapIntensity: 0.2, emissive: 0xf4f1ea, emissiveIntensity: 0.4 });
  const floorMat = new THREE.MeshStandardMaterial({ map: concreteTexture(aniso, [(2 * X) / 1.6, (2 * Z) / 1.6]), roughness: 0.42, metalness: 0.05, envMapIntensity: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.85, envMapIntensity: 0.2 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.8, envMapIntensity: 0.25 });
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  // A wall plane: centre (x, y, z), size w x h, facing direction (nx, nz).
  const plane = (w, h, mat, x, y, z, nx, nz, block = true) => {
    const m = new THREE.Mesh(planeGeo, mat);
    m.scale.set(w, h, 1);
    m.position.set(x, y, z);
    m.rotation.y = Math.atan2(nx, nz);
    group.add(m);
    if (block) blockers.push(m);
    return m;
  };
  const box = (x1, x2, y1, y2, z1, z2, mat, block = false) => {
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(x2 - x1, y2 - y1, z2 - z1);
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    group.add(m);
    if (block) blockers.push(m);
    return m;
  };
  // A wall along x at z, facing nz, from xa to xb, with optional doorways [[x1, x2], ...].
  const wallX = (xa, xb, z, nz, doors = []) => {
    let x = xa;
    [...doors, [xb, xb]].forEach(([d1, d2]) => {
      if (d1 > x) plane(d1 - x, H, wallMat, (x + d1) / 2, H / 2, z, 0, nz);
      if (d2 > d1) plane(d2 - d1, H - DOOR_H, wallMat, (d1 + d2) / 2, (DOOR_H + H) / 2, z, 0, nz);
      x = d2;
    });
  };
  const wallZ = (za, zb, x, nx) => plane(Math.abs(zb - za), H, wallMat, x, H / 2, (za + zb) / 2, nx, 0);
  const skirtX = (xa, xb, z, nz) => box(xa, xb, 0, 0.08, z + nz * 0.0075 - 0.0075, z + nz * 0.0075 + 0.0075, trimMat);
  const skirtZ = (za, zb, x, nx) => box(x + nx * 0.0075 - 0.0075, x + nx * 0.0075 + 0.0075, 0, 0.08, Math.min(za, zb), Math.max(za, zb), trimMat);

  // Floor, ceiling and the slab under the whole building.
  const floor = plane(2 * X, 2 * Z, floorMat, 0, 0, 0, 0, 1);
  floor.rotation.set(-Math.PI / 2, 0, 0);
  floor.name = 'floor';
  const ceil = plane(2 * X, 2 * Z, ceilMat, 0, H, 0, 0, 1, false);
  ceil.rotation.set(Math.PI / 2, 0, 0);
  box(-X - T / 2, X + T / 2, -0.13, -0.01, -Z - T / 2, Z + T / 2, darkMat);

  // Dark caps on top of every wall, like a section cut.
  const capX = (xa, xb, z) => box(xa, xb, H, H + 0.04, z - T / 2, z + T / 2, darkMat);
  const capZ = (za, zb, x) => box(x - T / 2, x + T / 2, H, H + 0.04, za, zb, darkMat);
  capX(-X - T / 2, X + T / 2, -Z); capX(-X - T / 2, X + T / 2, Z);
  capX(-X - T / 2, X + T / 2, -HALL / 2); capX(-X - T / 2, X + T / 2, HALL / 2);
  capZ(-Z, Z, -X); capZ(-Z, Z, X);
  [-X + RW, -X + 2 * RW].forEach((x) => { capZ(-Z, -HALL / 2, x); capZ(HALL / 2, Z, x); });

  // The hall: its long walls carry the doorways, its ends the entrance and closing texts.
  const doorsOn = (side) => plan.filter((p) => p.s === side).map((p) => [p.xc - DOOR_W / 2, p.xc + DOOR_W / 2]).sort((a, b) => a[0] - b[0]);
  wallX(-X + T / 2, X - T / 2, -HALL / 2 + T / 2, 1, doorsOn(-1));
  wallX(-X + T / 2, X - T / 2, HALL / 2 - T / 2, -1, doorsOn(1));
  wallZ(-HALL / 2 + T / 2, HALL / 2 - T / 2, -X + T / 2, 1);
  wallZ(-HALL / 2 + T / 2, HALL / 2 - T / 2, X - T / 2, -1);
  skirtZ(-HALL / 2, HALL / 2, -X + T / 2, 1);
  skirtZ(-HALL / 2, HALL / 2, X - T / 2, -1);
  const textMat = (canvas) => new THREE.MeshBasicMaterial({ map: toTexture(canvas, { aniso }), transparent: true, toneMapped: false });
  plane(3.0, 2.0, textMat(entranceCanvas(museum, counts.total)), -X + T / 2 + 0.01, 1.75, 0, 1, 0, false);
  plane(3.0, 2.0, textMat(closingCanvas(museum)), X - T / 2 - 0.01, 1.75, 0, -1, 0, false);

  // The rooms.
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(aniso, '#6a4528'), roughness: 0.55, envMapIntensity: 0.45 });
  plan.forEach((p) => {
    const { s, xc, xa, xb, zh, zk, zc, room } = p;
    // walls facing into the room
    wallX(xa, xb, zh, s, [[xc - DOOR_W / 2, xc + DOOR_W / 2]]);
    wallX(xa, xb, zk, -s);
    wallZ(zh, zk, xa, 1);
    wallZ(zh, zk, xb, -1);
    skirtX(xa, xc - DOOR_W / 2, zh, s); skirtX(xc + DOOR_W / 2, xb, zh, s);
    skirtX(xa, xb, zk, -s);
    skirtZ(zh, zk, xa, 1); skirtZ(zh, zk, xb, -1);
    // door reveals, painted in the room colour
    const doorMat = new THREE.MeshStandardMaterial({ color: room.color, roughness: 0.7, envMapIntensity: 0.3 });
    const zw1 = Math.min(p.zHall - T / 2, p.zHall + T / 2), zw2 = Math.max(p.zHall - T / 2, p.zHall + T / 2);
    box(xc - DOOR_W / 2 - 0.02, xc - DOOR_W / 2 + 0.04, 0, DOOR_H, zw1, zw2, doorMat);
    box(xc + DOOR_W / 2 - 0.04, xc + DOOR_W / 2 + 0.02, 0, DOOR_H, zw1, zw2, doorMat);
    box(xc - DOOR_W / 2 - 0.02, xc + DOOR_W / 2 + 0.02, DOOR_H - 0.04, DOOR_H + 0.02, zw1, zw2, doorMat);
    // sign over the door, on the hall side
    plane(2.8, 0.7, textMat(doorSignCanvas(room)), xc, DOOR_H + 0.42, p.zHall - s * (T / 2 + 0.01), 0, -s, false);
    // freestanding central wall with the wall text on its front
    const cw = box(xc - CW_L / 2, xc + CW_L / 2, 0, CW_H, zc - CW_T / 2, zc + CW_T / 2, wallMat, true);
    cw.name = `central-${room.id}`;
    box(xc - CW_L / 2, xc + CW_L / 2, CW_H, CW_H + 0.03, zc - CW_T / 2, zc + CW_T / 2, darkMat);
    const panelMat = new THREE.MeshStandardMaterial({ map: toTexture(roomPanelCanvas(room, counts[room.id]), { aniso }), roughness: 0.9, envMapIntensity: 0.2 });
    const panel = plane(PANEL_W, PANEL_H, panelMat, xc, 1.45, p.zf - s * 0.012, 0, -s);
    panel.userData.panel = p;
    box(xc - PANEL_W / 2 - 0.02, xc + PANEL_W / 2 + 0.02, 1.45 - PANEL_H / 2 - 0.02, 1.45 + PANEL_H / 2 + 0.02, Math.min(p.zf, p.zf - s * 0.01), Math.max(p.zf, p.zf - s * 0.01), new THREE.MeshStandardMaterial({ color: room.color, roughness: 0.8 }));
    // a bench facing the back wall
    const bz = zc + s * 2.9;
    box(xc - 1.0, xc + 1.0, 0.4, 0.45, bz - 0.22, bz + 0.22, woodMat);
    [-0.85, 0.85].forEach((dx) => box(xc + dx - 0.03, xc + dx + 0.03, 0, 0.4, bz - 0.18, bz + 0.18, darkMat));
  });

  // Track lights: rails round each room and along the hall, with fixtures pointing at the walls.
  const railMat = new THREE.MeshStandardMaterial({ color: 0xf1f1ef, roughness: 0.5, envMapIntensity: 0.3 });
  const railY = H - 0.03;
  const fixtures = [];
  const rail = (xa, xb, za, zb) => box(Math.min(xa, xb) - 0.02, Math.max(xa, xb) + 0.02, railY - 0.018, railY + 0.018, Math.min(za, zb) - 0.02, Math.max(za, zb) + 0.02, railMat);
  plan.forEach((p) => {
    const { s, xa, xb, zh, zk } = p;
    const r = 1.3;
    const rx1 = xa + r, rx2 = xb - r, rz1 = zh + s * r, rz2 = zk - s * r;
    rail(rx1, rx2, rz1, rz1); rail(rx1, rx2, rz2, rz2); rail(rx1, rx1, rz1, rz2); rail(rx2, rx2, rz1, rz2);
    for (let x = rx1 + 0.6; x < rx2; x += 1.5) {
      fixtures.push([x, rz2, x, zk]);
      fixtures.push([x, rz1, x, p.zf]);
    }
    for (let k = 0.6; k < Math.abs(rz2 - rz1); k += 1.5) {
      const z = rz1 + s * k;
      fixtures.push([rx1, z, xa, z]);
      fixtures.push([rx2, z, xb, z]);
    }
  });
  rail(-X + 1, X - 1, 0, 0);
  for (let x = -X + 1.5; x < X - 1; x += 2.2) { fixtures.push([x, 0, x, -HALL / 2]); fixtures.push([x, 0, x, HALL / 2]); }
  const fixMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4, metalness: 0.1, envMapIntensity: 0.4 });
  const bodyGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.2, 12);
  const lensGeo = new THREE.CircleGeometry(0.038, 12);
  const bodies = new THREE.InstancedMesh(bodyGeo, fixMat, fixtures.length);
  const lenses = new THREE.InstancedMesh(lensGeo, new THREE.MeshBasicMaterial({ color: 0xfff4dc }), fixtures.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const down = new THREE.Vector3(0, -1, 0), zAxis = new THREE.Vector3(0, 0, 1);
  fixtures.forEach(([x, z, tx, tz], k) => {
    const pos = new THREE.Vector3(x, railY - 0.14, z);
    const dir = new THREE.Vector3(tx, 1.5, tz).sub(pos).normalize();
    q.setFromUnitVectors(down, dir);
    bodies.setMatrixAt(k, m4.compose(pos.clone().addScaledVector(dir, 0.1), q, one));
    q.setFromUnitVectors(zAxis, dir);
    lenses.setMatrixAt(k, m4.compose(pos.clone().addScaledVector(dir, 0.201), q, one));
  });
  group.add(bodies, lenses);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xe6e0d4, 1.25);
  scene.add(hemi);

  // A handful of real spotlights follow the visitor from room to room.
  const spots = Array.from({ length: 6 }, () => {
    const l = new THREE.SpotLight(0xfff0d8, 0, 0, 0.8, 0.65, 2);
    scene.add(l, l.target);
    return l;
  });
  function lightRoom(p) {
    const aims = p
      ? [
        [[p.xc, H - 0.2, p.zc + p.s * 2.4], [p.xc, 1.5, p.zk]],
        [[p.xc, H - 0.2, p.zh + p.s * 1.2], [p.xc, 1.45, p.zf]],
        [[p.xa + 2.2, H - 0.2, p.zc + p.s * 2.2], [p.xa, 1.5, p.zc + p.s * 2.2]],
        [[p.xb - 2.2, H - 0.2, p.zc + p.s * 2.2], [p.xb, 1.5, p.zc + p.s * 2.2]],
        [[p.xa + 2.2, H - 0.2, p.zc - p.s * 2.2], [p.xa, 1.5, p.zc - p.s * 2.2]],
        [[p.xb - 2.2, H - 0.2, p.zc - p.s * 2.2], [p.xb, 1.5, p.zc - p.s * 2.2]],
      ]
      : [
        [[-X + 2.5, H - 0.2, 0], [-X, 1.75, 0]],
        [[X - 2.5, H - 0.2, 0], [X, 1.75, 0]],
        ...plan.slice(0, 4).map((r) => [[r.xc, H - 0.2, 0], [r.xc, DOOR_H + 0.4, r.zHall]]),
      ];
    spots.forEach((l, k) => {
      const [from, to] = aims[k];
      l.position.set(...from);
      l.target.position.set(...to);
      l.intensity = p ? 26 : 18;
      l.angle = p ? 0.95 : 0.7;
    });
  }

  return { group, blockers, floor, lightRoom };
}
