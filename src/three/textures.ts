import * as THREE from "three";

/**
 * Procedural CanvasTextures generated on-the-fly. We cache them by name so
 * each texture is created once. Textures intentionally include a little
 * random variation + normal-ish data for more visual interest than flat
 * MeshStandardMaterial colors.
 */
const cache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function wrap(tex: THREE.CanvasTexture, repeat: number): THREE.CanvasTexture {
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

/** A juicy grass tile — short blades, mossy clumps, mini flowers. */
export function grassTexture(): THREE.CanvasTexture {
  const key = "grass";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;

  // Base gradient: multiple greens
  const baseGrad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size);
  baseGrad.addColorStop(0, "#4e7a28");
  baseGrad.addColorStop(0.6, "#406a22");
  baseGrad.addColorStop(1, "#2f5218");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  const rnd = rand(101);
  // Many short blades
  for (let i = 0; i < 3500; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 2 + rnd() * 4;
    const ang = (rnd() - 0.5) * 0.6 - Math.PI / 2;
    ctx.strokeStyle = `rgb(${60 + rnd() * 60 | 0}, ${120 + rnd() * 80 | 0}, ${30 + rnd() * 40 | 0})`;
    ctx.lineWidth = 0.7 + rnd() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  // Darker patches (moss, shadow pockets)
  for (let i = 0; i < 60; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 4 + rnd() * 12;
    ctx.fillStyle = `rgba(20, 40, 10, 0.35)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Occasional tiny wildflowers
  const flowerColors = ["#f6d85a", "#f6f0ca", "#e07ab0", "#c7a9ee"];
  for (let i = 0; i < 30; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = flowerColors[(rnd() * flowerColors.length) | 0];
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + rnd() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Grass as a repeating ground texture for the whole field. */
export function grassGroundTexture(): THREE.CanvasTexture {
  const tex = grassTexture();
  const cloned = tex.clone();
  cloned.needsUpdate = true;
  wrap(cloned, 12);
  return cloned;
}

/** Stone flagstone path with grout and moss. */
export function stonePathTexture(): THREE.CanvasTexture {
  const key = "stonepath";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  // Base grout dark
  ctx.fillStyle = "#2c2822";
  ctx.fillRect(0, 0, size, size);

  const rnd = rand(207);
  // Irregular flagstones — a few big stones tessellating the tile
  const stones: Array<{ x: number; y: number; w: number; h: number }> = [];
  const stepX = 64;
  const stepY = 64;
  for (let y = -16; y < size + 16; y += stepY) {
    let offset = (Math.floor(y / stepY) % 2) * (stepX / 2);
    for (let x = -16; x < size + 16; x += stepX) {
      const jx = (rnd() - 0.5) * 8;
      const jy = (rnd() - 0.5) * 8;
      const w = stepX - 6 + (rnd() - 0.5) * 8;
      const h = stepY - 6 + (rnd() - 0.5) * 8;
      stones.push({ x: x + offset + jx, y: y + jy, w, h });
    }
  }
  for (const s of stones) {
    // Stone fill with slight color variance
    const hue = 30 + (rnd() - 0.5) * 20;
    const lum = 42 + (rnd() - 0.5) * 14;
    ctx.fillStyle = `hsl(${hue}, 8%, ${lum}%)`;
    ctx.beginPath();
    const pts = 10;
    for (let p = 0; p < pts; p++) {
      const a = (p / pts) * Math.PI * 2;
      const rx = (s.w / 2) * (0.88 + rnd() * 0.24);
      const ry = (s.h / 2) * (0.88 + rnd() * 0.24);
      const px = s.x + s.w / 2 + Math.cos(a) * rx;
      const py = s.y + s.h / 2 + Math.sin(a) * ry;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Highlights (top-left) and shadows (bottom-right) for pseudo-bevel
    ctx.strokeStyle = `hsla(${hue}, 10%, ${lum + 16}%, 0.6)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(s.x + 3, s.y + s.h - 3);
    ctx.lineTo(s.x + 3, s.y + 3);
    ctx.lineTo(s.x + s.w - 3, s.y + 3);
    ctx.stroke();
    ctx.strokeStyle = `hsla(${hue}, 8%, ${Math.max(15, lum - 18)}%, 0.55)`;
    ctx.beginPath();
    ctx.moveTo(s.x + s.w - 3, s.y + 4);
    ctx.lineTo(s.x + s.w - 3, s.y + s.h - 3);
    ctx.lineTo(s.x + 4, s.y + s.h - 3);
    ctx.stroke();
    // Surface noise (cracks)
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = `hsla(${hue}, 8%, ${Math.max(10, lum - 24)}%, 0.5)`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      const cx = s.x + 6 + rnd() * (s.w - 12);
      const cy = s.y + 6 + rnd() * (s.h - 12);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (rnd() - 0.5) * 16, cy + (rnd() - 0.5) * 16);
      ctx.stroke();
    }
  }
  // Moss at random edges
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(60, 90, 40, ${0.25 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Wet dark earth (for graves and fresh plots). */
export function earthTexture(): THREE.CanvasTexture {
  const key = "earth";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(333);
  // Deep brown base
  ctx.fillStyle = "#3b2715";
  ctx.fillRect(0, 0, size, size);
  // Clumps of lighter earth
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 1 + rnd() * 4;
    ctx.fillStyle = `rgba(${70 + rnd() * 60 | 0}, ${44 + rnd() * 30 | 0}, ${22 + rnd() * 20 | 0}, 0.85)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dark pits
  for (let i = 0; i < 60; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 2 + rnd() * 5;
    ctx.fillStyle = `rgba(0, 0, 0, 0.45)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Small green shoots poking through
  for (let i = 0; i < 25; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.strokeStyle = `rgba(60, 110, 40, 0.55)`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 3);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** A dressed marble/granite texture for tombstones. */
export function marbleTexture(): THREE.CanvasTexture {
  const key = "marble";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(555);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#d6d2c6");
  g.addColorStop(0.5, "#b9b4a4");
  g.addColorStop(1, "#8b8272");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Veins (darker curves)
  ctx.strokeStyle = "rgba(40, 32, 20, 0.35)";
  for (let i = 0; i < 5; i++) {
    ctx.lineWidth = 0.4 + rnd() * 1.2;
    ctx.beginPath();
    let x = rnd() * size;
    let y = rnd() * size;
    ctx.moveTo(x, y);
    for (let k = 0; k < 20; k++) {
      x += (rnd() - 0.5) * 18;
      y += (rnd() - 0.5) * 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Moss patches near bottom
  for (let i = 0; i < 80; i++) {
    const x = rnd() * size;
    const y = size * 0.7 + rnd() * size * 0.3;
    ctx.fillStyle = `rgba(60, 90, 30, ${0.2 + rnd() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Weathering spots
  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(40, 32, 24, ${0.1 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + rnd() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Dark granite for cross tombstones and obelisks. */
export function graniteTexture(): THREE.CanvasTexture {
  const key = "granite";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(777);
  ctx.fillStyle = "#3a3430";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const v = 30 + rnd() * 70;
    ctx.fillStyle = `rgb(${v | 0}, ${(v * 0.9) | 0}, ${(v * 0.8) | 0})`;
    ctx.fillRect(x, y, 1 + rnd(), 1 + rnd());
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(120, 110, 90, ${0.2 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Warm wood texture with grain lines and knots. */
export function woodTexture(): THREE.CanvasTexture {
  const key = "wood";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(999);
  const g = ctx.createLinearGradient(0, 0, size, 0);
  g.addColorStop(0, "#5a3b20");
  g.addColorStop(0.5, "#6e4825");
  g.addColorStop(1, "#4d321b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 3) {
    ctx.strokeStyle = `rgba(30, 18, 6, ${0.1 + rnd() * 0.25})`;
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
  for (let i = 0; i < 4; i++) {
    const kx = rnd() * size;
    const ky = rnd() * size;
    const kr = 3 + rnd() * 6;
    for (let r = kr; r > 0; r -= 1) {
      ctx.strokeStyle = `rgba(20, 10, 0, ${(r / kr) * 0.4})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(kx, ky, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Iron — dark metal with slight rust. */
export function ironTexture(): THREE.CanvasTexture {
  const key = "iron";
  if (cache.has(key)) return cache.get(key)!;
  const size = 128;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(1111);
  ctx.fillStyle = "#1d1a18";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 800; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(${40 + rnd() * 40 | 0}, ${30 + rnd() * 30 | 0}, ${20 + rnd() * 20 | 0}, 0.6)`;
    ctx.fillRect(x, y, 1, 1);
  }
  // Rust spots
  for (let i = 0; i < 24; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillStyle = `rgba(${120 + rnd() * 50 | 0}, ${50 + rnd() * 30 | 0}, 20, ${0.3 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Rough grey stone for mausoleums and crypts. */
export function roughStoneTexture(): THREE.CanvasTexture {
  const key = "roughstone";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(1313);
  ctx.fillStyle = "#6c6860";
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
      const lum = 55 + (rnd() - 0.5) * 20 | 0;
      ctx.fillStyle = `rgb(${lum + 10}, ${lum + 6}, ${lum})`;
      ctx.fillRect(sx, sy, bw2, bh2);
      // Highlight / shadow
      ctx.fillStyle = `rgba(255,255,255,0.08)`;
      ctx.fillRect(sx + 1, sy + 1, bw2 - 2, 1);
      ctx.fillStyle = `rgba(0,0,0,0.22)`;
      ctx.fillRect(sx + 1, sy + bh2 - 2, bw2 - 2, 1);
      // Cracks
      if (rnd() < 0.4) {
        ctx.strokeStyle = `rgba(0,0,0,0.35)`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(sx + rnd() * bw2, sy + rnd() * bh2);
        ctx.lineTo(sx + rnd() * bw2, sy + rnd() * bh2);
        ctx.stroke();
      }
    }
  }
  // Moss at bottom edges
  for (let i = 0; i < 220; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const alpha = 0.08 + rnd() * 0.22;
    ctx.fillStyle = `rgba(60, 80, 40, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Rooftop slate/tiled roofing. */
export function roofTexture(): THREE.CanvasTexture {
  const key = "roof";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const rnd = rand(1515);
  ctx.fillStyle = "#2a2624";
  ctx.fillRect(0, 0, size, size);
  const rowH = 18;
  for (let y = 0; y < size; y += rowH) {
    const off = (y / rowH) % 2 ? 16 : 0;
    for (let x = -32; x < size + 32; x += 32) {
      const hue = 10;
      const lum = 22 + (rnd() - 0.5) * 14 | 0;
      ctx.fillStyle = `hsl(${hue}, 20%, ${lum}%)`;
      ctx.beginPath();
      ctx.moveTo(x + off, y + rowH);
      ctx.quadraticCurveTo(x + off + 16, y - 4, x + off + 32, y + rowH);
      ctx.lineTo(x + off, y + rowH);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}

/** Green leafy tree foliage texture. */
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
    const v = 0.7 + rnd() * 0.5;
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

/** Water surface — light ripples. */
export function waterTexture(): THREE.CanvasTexture {
  const key = "water";
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const cnv = makeCanvas(size, size);
  const ctx = cnv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 1.2);
  g.addColorStop(0, "#467a9e");
  g.addColorStop(1, "#223a55");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const rnd = rand(3030);
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(200, 230, 255, ${0.08 + rnd() * 0.2})`;
    ctx.lineWidth = 0.5 + rnd() * 1.5;
    ctx.beginPath();
    const y = rnd() * size;
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 4) {
      ctx.lineTo(x, y + Math.sin(x * 0.1 + i) * 2);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cnv);
  wrap(tex, 1);
  cache.set(key, tex);
  return tex;
}
