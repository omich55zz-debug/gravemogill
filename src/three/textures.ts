import * as THREE from "three";

/**
 * Procedural CanvasTextures generated on-the-fly for a dark gothic
 * atmosphere (inspired by Lineage 2). All colors are desaturated; heavy
 * moss, cracks, weathering, occasional blood / arcane rune emissive
 * content. Textures are cached by name and created lazily.
 */
const cache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function wrap(tex: THREE.CanvasTexture, repeat = 1): THREE.CanvasTexture {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function rand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xffffff) / 0xffffff;
  };
}

/* =========================================================
 * Grass — dark, mossy, wet, with dead patches and bones.
 * ========================================================= */
export function grassTexture(): THREE.CanvasTexture {
  const key = "grass";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size);
  grad.addColorStop(0, "#2a3e1a");
  grad.addColorStop(0.6, "#1a2e14");
  grad.addColorStop(1, "#0f1e0c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const rnd = rand(103);
  // Thousands of tiny dim blades
  for (let i = 0; i < 4200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 2 + rnd() * 5;
    const ang = (rnd() - 0.5) * 0.6 - Math.PI / 2;
    const hueV = 30 + rnd() * 30;
    ctx.strokeStyle = `rgba(${hueV + rnd() * 30 | 0}, ${60 + rnd() * 40 | 0}, ${20 + rnd() * 20 | 0}, 0.85)`;
    ctx.lineWidth = 0.5 + rnd() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  // Mud/bare-earth patches
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 6 + rnd() * 18;
    ctx.fillStyle = `rgba(35, 24, 14, ${0.3 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Moss lumps (darker greener blobs)
  for (let i = 0; i < 80; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 3 + rnd() * 8;
    ctx.fillStyle = `rgba(40, 70, 30, ${0.3 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wet puddles
  for (let i = 0; i < 12; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const rx = 4 + rnd() * 10;
    const ry = 3 + rnd() * 6;
    ctx.fillStyle = `rgba(20, 30, 40, 0.55)`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // highlight
    ctx.fillStyle = `rgba(140, 170, 190, 0.28)`;
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.3, ry * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pale bones / pebbles poking through
  for (let i = 0; i < 8; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(180, 170, 150, ${0.35 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + rnd() * 2, 1, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Grass as a repeating ground texture (tiled many times over the field). */
export function grassGroundTexture(): THREE.CanvasTexture {
  const tex = grassTexture();
  const cloned = tex.clone();
  cloned.needsUpdate = true;
  wrap(cloned, 10);
  return cloned;
}

/* =========================================================
 * Stone flagstone path — wet, mossy, cracked, dark slate.
 * ========================================================= */
export function stonePathTexture(): THREE.CanvasTexture {
  const key = "stonepath";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  // Dark grout
  ctx.fillStyle = "#151412";
  ctx.fillRect(0, 0, size, size);

  const rnd = rand(207);
  const stones: Array<{ x: number; y: number; w: number; h: number }> = [];
  const stepX = 64;
  const stepY = 64;
  for (let y = -20; y < size + 20; y += stepY) {
    const offset = (Math.floor(y / stepY) % 2) * (stepX / 2);
    for (let x = -20; x < size + 20; x += stepX) {
      const jx = (rnd() - 0.5) * 8;
      const jy = (rnd() - 0.5) * 8;
      const w = stepX - 8 + (rnd() - 0.5) * 10;
      const h = stepY - 8 + (rnd() - 0.5) * 10;
      stones.push({ x: x + offset + jx, y: y + jy, w, h });
    }
  }
  for (const s of stones) {
    const lum = 26 + (rnd() - 0.5) * 18;
    ctx.fillStyle = `hsl(${200 + (rnd() - 0.5) * 30}, 6%, ${Math.max(10, lum)}%)`;
    ctx.beginPath();
    const pts = 12;
    for (let p = 0; p < pts; p++) {
      const a = (p / pts) * Math.PI * 2;
      const rx = (s.w / 2) * (0.82 + rnd() * 0.3);
      const ry = (s.h / 2) * (0.82 + rnd() * 0.3);
      const px = s.x + s.w / 2 + Math.cos(a) * rx;
      const py = s.y + s.h / 2 + Math.sin(a) * ry;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // subtle highlight/shadow for bevel
    ctx.strokeStyle = `rgba(255,255,255,0.07)`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(s.x + 3, s.y + s.h - 3);
    ctx.lineTo(s.x + 3, s.y + 3);
    ctx.lineTo(s.x + s.w - 3, s.y + 3);
    ctx.stroke();
    ctx.strokeStyle = `rgba(0,0,0,0.45)`;
    ctx.beginPath();
    ctx.moveTo(s.x + s.w - 3, s.y + 4);
    ctx.lineTo(s.x + s.w - 3, s.y + s.h - 3);
    ctx.lineTo(s.x + 4, s.y + s.h - 3);
    ctx.stroke();
    // cracks
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(0,0,0,0.45)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const cx = s.x + 6 + rnd() * (s.w - 12);
      const cy = s.y + 6 + rnd() * (s.h - 12);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (rnd() - 0.5) * 16, cy + (rnd() - 0.5) * 16);
      ctx.stroke();
    }
  }
  // Heavy moss between stones
  for (let i = 0; i < 220; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(${30 + rnd() * 30 | 0}, ${60 + rnd() * 40 | 0}, ${20 + rnd() * 20 | 0}, ${0.3 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rnd() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wet shine strips
  for (let i = 0; i < 14; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const rx = 3 + rnd() * 8;
    const ry = 2 + rnd() * 4;
    ctx.fillStyle = `rgba(140, 160, 180, 0.14)`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Wet dark earth (dug graves, plots).
 * ========================================================= */
export function earthTexture(): THREE.CanvasTexture {
  const key = "earth";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(333);
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 300; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 1 + rnd() * 4;
    ctx.fillStyle = `rgba(${40 + rnd() * 40 | 0}, ${24 + rnd() * 20 | 0}, ${12 + rnd() * 12 | 0}, 0.9)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pitch-black pits
  for (let i = 0; i < 90; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 2 + rnd() * 6;
    ctx.fillStyle = `rgba(0, 0, 0, 0.65)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dull bone fragments
  for (let i = 0; i < 6; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = "rgba(170, 160, 140, 0.65)";
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rnd() * 2, 1, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Small red hints
  for (let i = 0; i < 4; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(80, 20, 10, 0.6)`;
    ctx.beginPath();
    ctx.arc(x, y, 2 + rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Aged marble — greys & cracks, for mausoleums.
 * ========================================================= */
export function marbleTexture(): THREE.CanvasTexture {
  const key = "marble";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(555);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#9c958a");
  g.addColorStop(0.5, "#7a746a");
  g.addColorStop(1, "#4f4a44");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Thick veins
  ctx.strokeStyle = "rgba(20, 18, 14, 0.55)";
  for (let i = 0; i < 7; i++) {
    ctx.lineWidth = 0.5 + rnd() * 1.5;
    ctx.beginPath();
    let x = rnd() * size;
    let y = rnd() * size;
    ctx.moveTo(x, y);
    for (let k = 0; k < 25; k++) {
      x += (rnd() - 0.5) * 20;
      y += (rnd() - 0.5) * 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Moss at lower half
  for (let i = 0; i < 200; i++) {
    const x = rnd() * size;
    const y = size * 0.55 + rnd() * size * 0.45;
    ctx.fillStyle = `rgba(${40 + rnd() * 30 | 0}, ${60 + rnd() * 40 | 0}, ${25 + rnd() * 20 | 0}, ${0.35 + rnd() * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + rnd() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Weathering black spots
  for (let i = 0; i < 140; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(18, 14, 10, ${0.15 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + rnd() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Occasional blood splatter
  for (let i = 0; i < 3; i++) {
    const x = rnd() * size;
    const y = rnd() * size * 0.5;
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = `rgba(${70 + rnd() * 30 | 0}, ${10 + rnd() * 8 | 0}, ${10 + rnd() * 5 | 0}, ${0.4 + rnd() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x + (rnd() - 0.5) * 20, y + (rnd() - 0.5) * 20, 0.6 + rnd() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Obsidian / black granite — for crosses, obelisks.
 * ========================================================= */
export function graniteTexture(): THREE.CanvasTexture {
  const key = "granite";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(777);
  ctx.fillStyle = "#1a1715";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const v = 20 + rnd() * 50;
    ctx.fillStyle = `rgb(${v | 0}, ${(v * 0.95) | 0}, ${(v * 0.9) | 0})`;
    ctx.fillRect(x, y, 1 + rnd(), 1 + rnd());
  }
  // Deep cracks
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 0.4 + rnd() * 0.8;
    ctx.beginPath();
    let x = rnd() * size;
    let y = rnd() * size;
    ctx.moveTo(x, y);
    for (let k = 0; k < 12; k++) {
      x += (rnd() - 0.5) * 16;
      y += (rnd() - 0.5) * 16;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Moss at the base (lower quarter)
  for (let i = 0; i < 100; i++) {
    const x = rnd() * size;
    const y = size * 0.7 + rnd() * size * 0.3;
    ctx.fillStyle = `rgba(40, 70, 30, ${0.2 + rnd() * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Occasional reflective flecks
  for (let i = 0; i < 50; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(180, 190, 210, ${0.15 + rnd() * 0.25})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Rotten wood — dark, moldy, rotten planks.
 * ========================================================= */
export function woodTexture(): THREE.CanvasTexture {
  const key = "wood";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(999);
  const g = ctx.createLinearGradient(0, 0, size, 0);
  g.addColorStop(0, "#2e1f12");
  g.addColorStop(0.5, "#3a2a18");
  g.addColorStop(1, "#241608");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 3) {
    ctx.strokeStyle = `rgba(10, 6, 0, ${0.15 + rnd() * 0.3})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    let x = 0;
    ctx.moveTo(x, y + (rnd() - 0.5) * 3);
    while (x < size) {
      x += 8;
      ctx.lineTo(x, y + (rnd() - 0.5) * 2.5);
    }
    ctx.stroke();
  }
  // Knots
  for (let i = 0; i < 5; i++) {
    const kx = rnd() * size;
    const ky = rnd() * size;
    const kr = 3 + rnd() * 6;
    for (let r = kr; r > 0; r -= 1) {
      ctx.strokeStyle = `rgba(0, 0, 0, ${(r / kr) * 0.5})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(kx, ky, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Moldy green splotches
  for (let i = 0; i < 30; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(${40 + rnd() * 20 | 0}, ${60 + rnd() * 20 | 0}, ${25 + rnd() * 15 | 0}, ${0.22 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Rusted iron — dark, bloody, flecks of corrosion.
 * ========================================================= */
export function ironTexture(): THREE.CanvasTexture {
  const key = "iron";
  if (cache.has(key)) return cache.get(key)!;
  const size = 128;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(1111);
  ctx.fillStyle = "#0d0b09";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 700; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(${30 + rnd() * 30 | 0}, ${20 + rnd() * 20 | 0}, ${14 + rnd() * 14 | 0}, 0.7)`;
    ctx.fillRect(x, y, 1, 1);
  }
  // Heavy rust/blood spots
  for (let i = 0; i < 60; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(${100 + rnd() * 60 | 0}, ${30 + rnd() * 25 | 0}, ${14 + rnd() * 10 | 0}, ${0.3 + rnd() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rnd() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Highlights (slightly polished edges)
  for (let i = 0; i < 20; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(150, 160, 170, ${0.12 + rnd() * 0.2})`;
    ctx.fillRect(x, y, 1 + rnd() * 2, 1);
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Rough grey masonry — for mausoleums and crypts.
 * ========================================================= */
export function roughStoneTexture(): THREE.CanvasTexture {
  const key = "roughstone";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(1313);
  ctx.fillStyle = "#2a2824";
  ctx.fillRect(0, 0, size, size);
  // Mortar grid
  const bw = 64;
  const bh = 32;
  for (let y = 0; y < size; y += bh) {
    const offset = ((y / bh) | 0) % 2 ? bw / 2 : 0;
    for (let x = -bw; x < size + bw; x += bw) {
      const sx = x + offset + (rnd() - 0.5) * 4;
      const sy = y + (rnd() - 0.5) * 2;
      const bh2 = bh - 4 + (rnd() - 0.5) * 4;
      const bw2 = bw - 4 + (rnd() - 0.5) * 4;
      const lum = 32 + (rnd() - 0.5) * 20 | 0;
      ctx.fillStyle = `rgb(${lum + 6}, ${lum + 4}, ${lum})`;
      ctx.fillRect(sx, sy, bw2, bh2);
      ctx.fillStyle = `rgba(255,255,255,0.07)`;
      ctx.fillRect(sx + 1, sy + 1, bw2 - 2, 1);
      ctx.fillStyle = `rgba(0,0,0,0.35)`;
      ctx.fillRect(sx + 1, sy + bh2 - 2, bw2 - 2, 1);
      if (rnd() < 0.5) {
        ctx.strokeStyle = `rgba(0,0,0,0.5)`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(sx + rnd() * bw2, sy + rnd() * bh2);
        ctx.lineTo(sx + rnd() * bw2, sy + rnd() * bh2);
        ctx.stroke();
      }
    }
  }
  // Heavy moss blotches
  for (let i = 0; i < 340; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const alpha = 0.1 + rnd() * 0.25;
    ctx.fillStyle = `rgba(${40 + rnd() * 20 | 0}, ${70 + rnd() * 30 | 0}, ${30 + rnd() * 10 | 0}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + rnd() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Water stains / mildew
  for (let i = 0; i < 14; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const ry = 10 + rnd() * 40;
    ctx.fillStyle = `rgba(30, 40, 30, 0.25)`;
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + rnd() * 6, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Dark slate roof tiles.
 * ========================================================= */
export function roofTexture(): THREE.CanvasTexture {
  const key = "roof";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(1515);
  ctx.fillStyle = "#0f0d0c";
  ctx.fillRect(0, 0, size, size);
  const rowH = 18;
  for (let y = 0; y < size; y += rowH) {
    const off = (y / rowH) % 2 ? 16 : 0;
    for (let x = -32; x < size + 32; x += 32) {
      const hue = 210 + (rnd() - 0.5) * 40;
      const lum = 14 + (rnd() - 0.5) * 10 | 0;
      ctx.fillStyle = `hsl(${hue}, 8%, ${Math.max(6, lum)}%)`;
      ctx.beginPath();
      ctx.moveTo(x + off, y + rowH);
      ctx.quadraticCurveTo(x + off + 16, y - 4, x + off + 32, y + rowH);
      ctx.lineTo(x + off, y + rowH);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
  // Moss on some tiles
  for (let i = 0; i < 80; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(40, 60, 30, ${0.2 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Tree leaves — tinted sprite-ball texture.
 * ========================================================= */
export function leavesTexture(tint: number): THREE.CanvasTexture {
  const key = `leaves_${tint.toString(16)}`;
  if (cache.has(key)) return cache.get(key)!;
  const size = 128;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const col = new THREE.Color(tint);
  const r0 = col.r * 255;
  const g0 = col.g * 255;
  const b0 = col.b * 255;
  const rnd = rand(2020 + tint);
  ctx.fillStyle = `rgba(${r0 | 0}, ${g0 | 0}, ${b0 | 0}, 1)`;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 2 + rnd() * 5;
    const v = 0.55 + rnd() * 0.55;
    ctx.fillStyle = `rgba(${Math.min(255, r0 * v) | 0}, ${Math.min(255, g0 * v) | 0}, ${Math.min(255, b0 * v) | 0}, ${0.4 + rnd() * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Water — dark reflective surface.
 * ========================================================= */
export function waterTexture(): THREE.CanvasTexture {
  const key = "water";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 1.2);
  g.addColorStop(0, "#20384e");
  g.addColorStop(1, "#080e18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const rnd = rand(3030);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(120, 160, 210, ${0.06 + rnd() * 0.15})`;
    ctx.lineWidth = 0.5 + rnd() * 1.2;
    ctx.beginPath();
    const y = rnd() * size;
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 4) {
      ctx.lineTo(x, y + Math.sin(x * 0.1 + i) * 2);
    }
    ctx.stroke();
  }
  // Moonlight streak
  ctx.fillStyle = "rgba(200, 220, 255, 0.05)";
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.4, size * 0.1, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Runic glyph emissive texture — glowing cyan-blue runes on dark stone.
 * Used as .emissiveMap for selected tombstones.
 * ========================================================= */
export function runesEmissiveTexture(): THREE.CanvasTexture {
  const key = "runes";
  if (cache.has(key)) return cache.get(key)!;
  const size = 128;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  const rnd = rand(4040);
  ctx.strokeStyle = "#6fd0ff";
  ctx.fillStyle = "#6fd0ff";
  ctx.lineWidth = 1.5;
  // Central ring
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 22, 0, Math.PI * 2);
  ctx.stroke();
  // 8 rune glyphs around the ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = size / 2 + Math.cos(a) * 36;
    const y = size / 2 + Math.sin(a) * 36;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.lineTo(3, -5);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // Outer tick marks
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const x0 = size / 2 + Math.cos(a) * 45;
    const y0 = size / 2 + Math.sin(a) * 45;
    const x1 = size / 2 + Math.cos(a) * 50;
    const y1 = size / 2 + Math.sin(a) * 50;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // Blur via shadow draws for glow
  const blur = makeCanvas(size, size);
  const bctx = blur.getContext("2d")!;
  bctx.filter = "blur(4px)";
  bctx.drawImage(cnv, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(blur, 0, 0);
  // Random spark noise
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(180, 220, 255, ${0.1 + rnd() * 0.3})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1, 1);
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Night sky panorama — used as scene background via equirect mapping.
 * Full moon + clouds + stars + dark horizon.
 * ========================================================= */
export function nightSkyTexture(): THREE.Texture {
  const key = "nightSky";
  if (cache.has(key)) return cache.get(key)!;
  const w = 1024;
  const h = 512;
  const cnv = makeCanvas(w, h);
  const ctx = cnv.getContext("2d")!;
  // Vertical gradient from deep black (top) to dark blue-green horizon.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#05060a");
  g.addColorStop(0.5, "#0b1020");
  g.addColorStop(0.75, "#102030");
  g.addColorStop(1, "#1a242a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const rnd = rand(5050);
  // Stars
  for (let i = 0; i < 800; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.7;
    const a = 0.25 + rnd() * 0.75;
    ctx.fillStyle = `rgba(220, 230, 255, ${a})`;
    ctx.fillRect(x, y, rnd() < 0.9 ? 1 : 2, 1);
  }
  // Clouds — large dark swirls
  for (let i = 0; i < 18; i++) {
    const x = rnd() * w;
    const y = h * 0.1 + rnd() * h * 0.6;
    const r = 40 + rnd() * 140;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, r);
    cg.addColorStop(0, `rgba(18, 22, 34, 0.75)`);
    cg.addColorStop(1, `rgba(18, 22, 34, 0)`);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Moon
  const moonX = w * 0.72;
  const moonY = h * 0.22;
  const moonR = 48;
  // Halo
  const halo = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 3);
  halo.addColorStop(0, `rgba(230, 240, 255, 0.55)`);
  halo.addColorStop(0.35, `rgba(180, 200, 240, 0.18)`);
  halo.addColorStop(1, `rgba(180, 200, 240, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2);
  ctx.fill();
  // Body
  const bodyG = ctx.createRadialGradient(moonX - moonR * 0.3, moonY - moonR * 0.3, 0, moonX, moonY, moonR);
  bodyG.addColorStop(0, "#f5f3ee");
  bodyG.addColorStop(1, "#b9b5a8");
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();
  // Craters
  for (let i = 0; i < 10; i++) {
    const ca = rnd() * Math.PI * 2;
    const cr = rnd() * moonR * 0.7;
    const cx = moonX + Math.cos(ca) * cr;
    const cy = moonY + Math.sin(ca) * cr;
    ctx.fillStyle = `rgba(120, 116, 106, ${0.25 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 1 + rnd() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Horizon mist
  const mist = ctx.createLinearGradient(0, h * 0.75, 0, h);
  mist.addColorStop(0, "rgba(30, 45, 50, 0)");
  mist.addColorStop(1, "rgba(30, 45, 50, 0.85)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);

  const tex = new THREE.CanvasTexture(cnv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/* =========================================================
 * Stained-glass window texture (colored rose pattern for chapel).
 * Used as emissive + base map.
 * ========================================================= */
export function stainedGlassTexture(): THREE.CanvasTexture {
  const key = "stained";
  if (cache.has(key)) return cache.get(key)!;
  const size = 128;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const cx = size / 2, cy = size / 2;
  // Dark lead background
  ctx.fillStyle = "#0b0a08";
  ctx.fillRect(0, 0, size, size);
  const colors = ["#e05040", "#f0a040", "#60c070", "#4080c0", "#9060c0", "#c04060"];
  const rnd = rand(6060);
  // Concentric petals in color
  for (let ring = 3; ring > 0; ring--) {
    const r = (ring / 3) * (size / 2 - 6);
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      const x = cx + Math.cos(a) * r * 0.6;
      const y = cy + Math.sin(a) * r * 0.6;
      ctx.fillStyle = colors[(p + ring) % colors.length];
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.3, r * 0.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Center
  ctx.fillStyle = "#f6e17a";
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  // Lead lines over it
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1.5;
  for (let p = 0; p < 16; p++) {
    const a = (p / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * size / 2, cy + Math.sin(a) * size / 2);
    ctx.stroke();
  }
  for (let r = 16; r < size / 2; r += 16) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Noise
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${rnd() * 0.2})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1, 1);
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}
