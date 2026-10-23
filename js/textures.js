// Procedural textures and canvas text helpers for the study. No image files are needed,
// apart from the photograph of the Persian rug (assets/carpet.jpg).
import * as THREE from 'three';

export const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
export const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const GOLD = '#c9a44c';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function toTexture(canvas, { aniso = 4, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Seeded random so the study looks the same on every load.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Herringbone parquet in honey oak; one tile of the texture is 1.2 m square.
export function parquetTexture(aniso, repeat) {
  const S = 1024, c = makeCanvas(S, S), g = c.getContext('2d'), r = rng(5);
  g.fillStyle = '#7a5636';
  g.fillRect(0, 0, S, S);
  const L = 256, Wd = 64; // a plank is 0.30 x 0.075 m
  g.save();
  g.translate(S / 2, S / 2);
  g.rotate(Math.PI / 4);
  for (let a = -12; a < 12; a++) {
    for (let b = -12; b < 12; b++) {
      // two planks at right angles, stepping along the diagonal
      const x = a * Wd + b * L / 2, y = b * L / 2 - a * Wd;
      [[x, y, L, Wd], [x + L - Wd, y - L + Wd, Wd, L]].forEach(([px, py, w, h]) => {
        const tone = 0.82 + r() * 0.3;
        g.fillStyle = `rgb(${Math.round(150 * tone)},${Math.round(108 * tone)},${Math.round(68 * tone)})`;
        g.fillRect(px, py, w, h);
        g.strokeStyle = 'rgba(40,25,10,0.5)';
        g.lineWidth = 2;
        g.strokeRect(px, py, w, h);
      });
    }
  }
  g.restore();
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(60,35,15,${r() * 0.06})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 40, 1);
  }
  return toTexture(c, { aniso, repeat });
}

// Grey-blue damask wallpaper with a soft silver pattern.
export function damaskTexture(aniso, repeat) {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#9aa6a8';
  g.fillRect(0, 0, S, S);
  const motif = (cx, cy) => {
    g.save();
    g.translate(cx, cy);
    g.fillStyle = 'rgba(232,236,232,0.3)';
    g.beginPath();
    g.moveTo(0, -120);
    g.bezierCurveTo(70, -90, 80, -20, 0, 0);
    g.bezierCurveTo(-80, -20, -70, -90, 0, -120);
    g.moveTo(0, 120);
    g.bezierCurveTo(70, 90, 80, 20, 0, 0);
    g.bezierCurveTo(-80, 20, -70, 90, 0, 120);
    g.fill();
    g.beginPath();
    g.ellipse(0, 0, 100, 28, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(70,82,86,0.18)';
    g.beginPath();
    g.arc(0, 0, 22, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  [[S / 2, S / 2], [0, 0], [S, 0], [0, S], [S, S]].forEach(([x, y]) => motif(x, y));
  return toTexture(c, { aniso, repeat });
}

// Lacquer with a fine brushed grain, for the bookcases and the desk.
export function lacquerTexture(aniso, base = '#c3ccca') {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d'), r = rng(11);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(60,70,70,0.04)';
    g.fillRect(0, r() * S, S, 1);
  }
  return toTexture(c, { aniso });
}

// Wraps text inside a box. Returns the y position after the last line.
export function wrapText(g, text, x, y, maxW, lineH) {
  const words = text.split(/\s+/);
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lineH; line = w; } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lineH; }
  return y;
}

// Letter-spaced text for small capitals.
export function spaced(g, text, x, y, spacing, align = 'left') {
  let w = 0;
  for (const ch of text) w += g.measureText(ch).width + spacing;
  let cx = align === 'center' ? x - (w - spacing) / 2 : x;
  const keep = g.textAlign;
  g.textAlign = 'left';
  for (const ch of text) {
    g.fillText(ch, cx, y);
    cx += g.measureText(ch).width + spacing;
  }
  g.textAlign = keep;
}

function countLines(g, text, maxW) {
  let line = '', n = 0;
  for (const w of text.split(/\s+/)) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { n++; line = w; } else line = test;
  }
  return n + (line ? 1 : 0);
}

// Paragraphs in a column; the serif type shrinks (down to 60%) until the text ends above `bottom`.
function fitParagraphs(g, list, x, y, maxW, size, lineH, gap, bottom) {
  let k = 1;
  for (; k > 0.6; k -= 0.02) {
    g.font = `${size * k}px ${SERIF}`;
    const end = list.reduce((yy, p) => yy + countLines(g, p, maxW) * lineH * k + gap * k, y);
    if (end <= bottom) break;
  }
  list.forEach((p) => { y = wrapText(g, p, x, y, maxW, lineH * k) + gap * k; });
  return y;
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

// Gold tooling: a double fillet border with small corner fleurons.
function tooling(g, W, H, inset) {
  g.strokeStyle = GOLD;
  g.lineWidth = 6;
  g.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset);
  g.lineWidth = 2;
  g.strokeRect(inset + 16, inset + 16, W - 2 * inset - 32, H - 2 * inset - 32);
  g.fillStyle = GOLD;
  [[inset + 16, inset + 16], [W - inset - 16, inset + 16], [inset + 16, H - inset - 16], [W - inset - 16, H - inset - 16]].forEach(([x, y]) => {
    g.beginPath();
    g.moveTo(x, y - 14); g.lineTo(x + 14, y); g.lineTo(x, y + 14); g.lineTo(x - 14, y);
    g.closePath();
    g.fill();
  });
}

export function leatherCanvas(color, seed, W = 512, H = 395) {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  leather(g, W, H, color, seed);
  return c;
}

function leather(g, W, H, color, seed) {
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  const r = rng(seed);
  for (let i = 0; i < (W * H) / 300; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * 0.12})` : `rgba(255,255,255,${r() * 0.05})`;
    g.beginPath();
    g.arc(r() * W, r() * H, 1 + r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
  vg.addColorStop(0, 'rgba(255,255,255,0.06)');
  vg.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
}

export function leatherColor(room) {
  return `#${new THREE.Color(room.color).multiplyScalar(0.55).getHexString()}`;
}

// The front board of an album, in morocco leather with gold tooling: 1024 x 790 for 0.42 x 0.32 m.
export function coverCanvas(room) {
  const W = 1024, H = 790, c = makeCanvas(W, H), g = c.getContext('2d');
  leather(g, W, H, leatherColor(room), room.n * 7);
  tooling(g, W, H, 34);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = GOLD;
  g.font = `600 30px ${SERIF}`;
  spaced(g, 'ALBUM DIEULAFOY', W / 2, 190, 8, 'center');
  g.font = `700 130px ${SERIF}`;
  g.fillText(ROMAN[room.n - 1], W / 2, 350);
  g.font = `italic 64px ${SERIF}`;
  g.fillText(room.title, W / 2, 470, W - 200);
  g.fillRect(W / 2 - 60, 510, 120, 3);
  g.font = `30px ${SERIF}`;
  g.fillText(room.subtitle, W / 2, 580, W - 220);
  return c;
}

// The inside of the front board: the album's introduction, printed on cream paper.
export function introPageCanvas(room, count) {
  const W = 1024, H = 790, c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#f1e9d8';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,90,40,0.35)';
  g.lineWidth = 2;
  g.strokeRect(40, 40, W - 80, H - 80);
  g.textBaseline = 'alphabetic';
  g.fillStyle = room.color;
  g.font = `700 22px ${SANS}`;
  spaced(g, `ALBUM ${ROMAN[room.n - 1]}  ·  ${count} PAGES`, 80, 110, 4);
  g.fillStyle = '#1f1a16';
  g.font = `700 60px ${SERIF}`;
  g.fillText(room.title, 80, 180, W - 160);
  g.fillStyle = '#5a4f44';
  g.font = `italic 32px ${SERIF}`;
  g.fillText(room.subtitle, 80, 228, W - 160);
  g.fillStyle = room.color;
  g.fillRect(80, 254, 100, 4);
  g.fillStyle = '#2b2520';
  fitParagraphs(g, room.text, 80, 310, W - 160, 26, 37, 14, H - 70);
  return c;
}

// A plain cream leaf, with an optional line of text in the middle.
export function blankPageCanvas(note) {
  const W = 512, H = 395, c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#f1e9d8';
  g.fillRect(0, 0, W, H);
  if (note) {
    g.fillStyle = '#8a7c6a';
    g.font = `italic 22px ${SERIF}`;
    g.textAlign = 'center';
    g.fillText(note, W / 2, H / 2);
  }
  return c;
}

// The welcome card standing on the desk.
export function deskCardCanvas(museum, count) {
  const W = 800, H = 560, c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#f4ecdb';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = GOLD;
  g.lineWidth = 6;
  g.strokeRect(20, 20, W - 40, H - 40);
  g.textAlign = 'center';
  g.fillStyle = '#1f1a16';
  g.font = `700 64px ${SERIF}`;
  g.fillText('Jane Dieulafoy', W / 2, 140);
  g.fillStyle = '#7c2d1d';
  g.font = `italic 52px ${SERIF}`;
  g.fillText('The Photographs', W / 2, 210);
  g.fillStyle = '#5a4f44';
  g.font = `600 22px ${SANS}`;
  spaced(g, `SIX ALBUMS · ${count} PAGES`, W / 2, 270, 5, 'center');
  g.fillStyle = '#2b2520';
  g.font = `26px ${SERIF}`;
  g.textAlign = 'left';
  wrapText(g, 'Open an album to turn its pages. Every page is a page of the Dieulafoy albums at the INHA library, Paris.', 70, 340, W - 140, 38);
  return c;
}
