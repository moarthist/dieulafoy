// Procedural textures and canvas text helpers, in the style of the Representing Persia room.
import * as THREE from 'three';

export const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
export const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

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

// Seeded random so the building looks the same on every load.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Polished concrete: soft clouds, fine grain and saw-cut joints on the tile edge.
export function concreteTexture(aniso, repeat) {
  const S = 1024, c = makeCanvas(S, S), g = c.getContext('2d'), r = rng(7);
  g.fillStyle = '#8f8f8c';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const x = r() * S, y = r() * S, rad = 40 + r() * 190, a = 0.035 + r() * 0.05;
    const dark = r() < 0.5;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, dark ? `rgba(60,60,58,${a})` : `rgba(215,215,210,${a})`);
    gr.addColorStop(1, 'rgba(128,128,126,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const d = g.getImageData(0, 0, S, S), px = d.data, n = rng(19);
  for (let i = 0; i < px.length; i += 4) {
    const v = (n() - 0.5) * 12;
    px[i] += v; px[i + 1] += v; px[i + 2] += v;
  }
  g.putImageData(d, 0, 0);
  g.strokeStyle = 'rgba(40,40,38,0.55)';
  g.lineWidth = 3;
  g.strokeRect(0, 0, S, S);
  return toTexture(c, { aniso, repeat });
}

// Warm oiled wood grain for the frames and benches.
export function woodTexture(aniso, base = '#4a2f1c', seed = 3) {
  const W = 256, H = 512, c = makeCanvas(W, H), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, w = 1 + r() * 4, a = 0.05 + r() * 0.12;
    g.fillStyle = r() < 0.5 ? `rgba(20,10,0,${a})` : `rgba(255,220,170,${a * 0.6})`;
    g.fillRect(x, 0, w, H);
  }
  return toTexture(c, { aniso });
}

// Soft blurred rectangle used as a fake contact shadow behind frames and furniture.
let shadowTex = null;
export function softShadowTexture() {
  if (shadowTex) return shadowTex;
  const S = 128, c = makeCanvas(S, S), g = c.getContext('2d');
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = 22;
  g.shadowOffsetX = 1000;
  g.fillStyle = '#000';
  g.fillRect(34 - 1000, 34, S - 68, S - 68);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

// A pool of warm light on the wall, as if from a track spot.
let poolTex = null;
export function lightPoolTexture() {
  if (poolTex) return poolTex;
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S * 0.42, 0, S / 2, S * 0.42, S / 2);
  gr.addColorStop(0, 'rgba(255,236,200,0.3)');
  gr.addColorStop(0.55, 'rgba(255,236,200,0.09)');
  gr.addColorStop(1, 'rgba(255,236,200,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  poolTex = new THREE.CanvasTexture(c);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  return poolTex;
}

// Wraps text inside a box. Returns the y position after the last line.
export function wrapText(g, text, x, y, maxW, lineH, maxLines = 99) {
  const words = text.split(/\s+/);
  let line = '', lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (g.measureText(test).width > maxW && line) {
      if (lines + 1 >= maxLines) {
        g.fillText(line.replace(/[ ,.;:]+$/, '') + '…', x, y);
        return y + lineH;
      }
      g.fillText(line, x, y);
      y += lineH;
      lines++;
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) { g.fillText(line, x, y); y += lineH; }
  return y;
}

// Letter-spaced text for small capitals.
export function spaced(g, text, x, y, spacing) {
  let cx = x;
  for (const ch of text) {
    g.fillText(ch, cx, y);
    cx += g.measureText(ch).width + spacing;
  }
  return cx;
}

function countLines(g, text, maxW) {
  let line = '', n = 0;
  for (const w of text.split(/\s+/)) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { n++; line = w; } else line = test;
  }
  return n + (line ? 1 : 0);
}

// Paragraphs in a column; the serif type shrinks (down to 70%) until the text ends above `bottom`.
function fitParagraphs(g, list, x, y, maxW, size, lineH, gap, bottom) {
  let k = 1;
  for (; k > 0.7; k -= 0.02) {
    g.font = `${size * k}px ${SERIF}`;
    const end = list.reduce((yy, p) => yy + countLines(g, p, maxW) * lineH * k + gap * k, y);
    if (end <= bottom) break;
  }
  list.forEach((p) => { y = wrapText(g, p, x, y, maxW, lineH * k) + gap * k; });
  return y;
}

// The wall text of a room, on the head of its central wall: canvas 1200 x 1600 for 1.5 m x 2.0 m.
export function roomPanelCanvas(room, count) {
  const W = 1200, H = 1600, c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#e4dfd3';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(40,30,20,0.25)';
  g.lineWidth = 4;
  g.strokeRect(28, 28, W - 56, H - 56);
  g.textBaseline = 'alphabetic';
  g.fillStyle = room.color;
  g.font = `700 30px ${SANS}`;
  spaced(g, `ROOM ${String(room.n).padStart(2, '0')}  ·  ${count} ALBUM PAGES`, 80, 120, 4);
  g.globalAlpha = 0.16;
  g.font = `700 300px ${SERIF}`;
  g.fillText(String(room.n).padStart(2, '0'), 820, 310);
  g.globalAlpha = 1;
  g.fillStyle = '#1f1a16';
  g.font = `700 96px ${SERIF}`;
  const end = wrapText(g, room.title, 80, 270, W - 160, 100);
  g.fillStyle = '#5a4f44';
  g.font = `italic 44px ${SERIF}`;
  g.fillText(room.subtitle, 80, end - 20);
  g.fillStyle = room.color;
  g.fillRect(80, end + 20, 140, 6);
  g.fillStyle = '#2b2520';
  fitParagraphs(g, room.text, 80, end + 100, W - 160, 34, 48, 22, H - 70);
  return c;
}

// The big wall text at the entrance of the hall.
export function entranceCanvas(m, count) {
  const W = 1500, H = 1000, c = makeCanvas(W, H), g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#1f1a16';
  g.font = `700 150px ${SERIF}`;
  g.fillText('Jane Dieulafoy', 20, 150, W - 40);
  g.fillStyle = '#7c2d1d';
  g.font = `italic 120px ${SERIF}`;
  g.fillText('The Photographs', 20, 290);
  g.fillStyle = '#5a4f44';
  g.font = `700 32px ${SANS}`;
  spaced(g, `A MICRO MUSEUM  ·  ${count} ALBUM PAGES  ·  SIX ROOMS`, 24, 370, 4);
  g.fillStyle = '#7c2d1d';
  g.fillRect(24, 410, 140, 6);
  g.fillStyle = '#2b2520';
  g.font = `40px ${SERIF}`;
  let y = 490;
  m.intro.slice(0, 2).forEach((p) => { y = wrapText(g, p, 24, y, 1420, 58, 5) + 18; });
  return c;
}

// The closing wall at the far end of the hall.
export function closingCanvas(m) {
  const W = 1500, H = 1000, c = makeCanvas(W, H), g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#1f1a16';
  g.font = `700 120px ${SERIF}`;
  g.fillText('About the albums', 20, 140);
  g.fillStyle = '#7c2d1d';
  g.fillRect(24, 190, 140, 6);
  g.fillStyle = '#2b2520';
  g.font = `40px ${SERIF}`;
  let y = 280;
  y = wrapText(g, m.intro[2], 24, y, 1420, 58) + 18;
  y = wrapText(g, m.caveat, 24, y, 1420, 58) + 30;
  g.fillStyle = '#5a4f44';
  g.font = `30px ${SANS}`;
  y = wrapText(g, m.rights, 24, y, 1420, 44) + 30;
  g.fillStyle = '#1f1a16';
  g.font = `700 30px ${SANS}`;
  g.fillText(`Developed by ${m.credit.name}`, 24, y);
  g.font = `30px ${SANS}`;
  g.fillStyle = '#5a4f44';
  m.credit.lines.forEach((l, i) => g.fillText(l, 24, y + 44 * (i + 1)));
  return c;
}

// The room name over each doorway, seen from the hall.
export function doorSignCanvas(room) {
  const W = 1200, H = 300, c = makeCanvas(W, H), g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';
  g.fillStyle = room.color;
  g.font = `700 150px ${SERIF}`;
  g.fillText(String(room.n).padStart(2, '0'), 20, 190);
  g.fillStyle = '#1f1a16';
  g.font = `700 76px ${SERIF}`;
  g.fillText(room.title, 250, 150, W - 270);
  g.fillStyle = '#5a4f44';
  g.font = `italic 40px ${SERIF}`;
  g.fillText(room.subtitle, 252, 215, W - 270);
  return c;
}
