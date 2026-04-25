import Phaser from "phaser";

// Procedural pixel-art sprite generator. Draws to a tiny canvas (per tile grid),
// then Phaser turns it into a texture. Keeps everything visually consistent
// without requiring external art assets.

type Pal = Record<string, string>;

const PAL: Pal = {
  grass1: "#3d5a2d",
  grass2: "#4b6a35",
  grass3: "#547838",
  dirt: "#6d4a2a",
  dirtDark: "#4a3119",
  dirtLight: "#8a6238",
  path1: "#8b7a56",
  path2: "#a3926a",
  stone: "#8c8c8e",
  stoneDark: "#585a5d",
  stoneLight: "#b3b3b6",
  marble: "#d8d8e0",
  marbleDark: "#a5a5b4",
  granite: "#4e505a",
  graniteDark: "#2a2c34",
  wood: "#6e4a24",
  woodDark: "#3f2913",
  woodLight: "#8e6638",
  iron: "#2b2b35",
  ironDark: "#111118",
  brass: "#c9a04a",
  brassDark: "#7b5f23",
  gold: "#e3b94f",
  flame: "#ffc94d",
  flameCore: "#ffe89e",
  petalWhite: "#f1ecd6",
  petalRed: "#c73838",
  petalYellow: "#e6b94a",
  petalPurple: "#8a52b3",
  petalOrange: "#e37a1f",
  petalBlue: "#4a6fd6",
  petalPink: "#e8a0c5",
  leaf: "#3d7a2e",
  leafDark: "#255018",
  skin: "#e0b894",
  coat: "#25252e",
  hat: "#0e0e14",
  eye: "#0b0b12",
  white: "#f0ecdc",
  catGrey: "#474752",
  catGreyDark: "#2e2e37",
  crystal1: "#6de0ff",
  crystal2: "#a8f0ff",
  crystalShadow: "#1a6b8a",
  shadow: "rgba(0,0,0,0.35)",
};

interface Ctx2D {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
}

function makeCanvas(w: number, h: number): Ctx2D {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function register(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/**
 * Take a flat 16×16 top-down tile and reproject it onto a 32×16 isometric
 * diamond. Corners map:
 *   flat (0,0)   → iso top    (16, 0)
 *   flat (15,0)  → iso right  (32, 8)
 *   flat (15,15) → iso bottom (16, 16)
 *   flat (0,15)  → iso left   (0, 8)
 * Pixels outside the diamond stay transparent.
 */
function makeIsoTile(flat: HTMLCanvasElement, lit = true): HTMLCanvasElement {
  // Top-down 32×32 tile. 2× nearest-neighbour upscale of the flat 16×16 canvas,
  // then optional edge shading (top-left highlight, bottom-right shadow) so
  // the tile grid still reads as lit 3D blocks rather than a flat carpet.
  const { canvas, ctx } = makeCanvas(32, 32);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(flat, 0, 0, 16, 16, 0, 0, 32, 32);
  if (lit) {
    // Top highlight
    ctx.fillStyle = "rgba(255,244,210,0.16)";
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillStyle = "rgba(255,244,210,0.09)";
    ctx.fillRect(0, 1, 32, 1);
    // Left highlight
    ctx.fillStyle = "rgba(255,244,210,0.12)";
    ctx.fillRect(0, 0, 1, 32);
    // Bottom shadow (stronger, two rows)
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(0, 31, 32, 1);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 30, 32, 1);
    // Right shadow
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(31, 0, 1, 32);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(30, 0, 1, 32);
  }
  return canvas;
}

// Deterministic PRNG (mulberry32) so each noise tile stays stable across reloads of a generated texture.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Terrain tiles (16x16) ----------

function tileGrass(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 16);
  const r = rng(seed);
  // Base gradient: slightly lighter top, darker bottom
  for (let y = 0; y < 16; y++) {
    const base = y < 5 ? PAL.grass2 : y < 11 ? PAL.grass1 : "#324a25";
    rect(ctx, 0, y, 16, 1, base);
  }
  // Noise (individual blades)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = r();
      if (v > 0.88) px(ctx, x, y, PAL.grass3);
      else if (v > 0.72) px(ctx, x, y, PAL.grass2);
      else if (v > 0.96) px(ctx, x, y, "#69923a");
    }
  }
  // Grass tufts (3-pixel clusters)
  for (let i = 0; i < 3; i++) {
    const gx = 1 + Math.floor(r() * 14);
    const gy = 2 + Math.floor(r() * 12);
    px(ctx, gx, gy, PAL.leaf);
    px(ctx, gx - 1, gy, PAL.leaf);
    px(ctx, gx + 1, gy, PAL.leaf);
    px(ctx, gx, gy - 1, "#69923a");
    px(ctx, gx, gy + 1, PAL.leafDark);
  }
  // Occasional tiny pebble
  if (r() > 0.5) {
    const px0 = 2 + Math.floor(r() * 12);
    const py0 = 2 + Math.floor(r() * 12);
    px(ctx, px0, py0, PAL.stoneDark);
    px(ctx, px0 + 1, py0, PAL.stone);
  }
  // Occasional tiny wildflower
  if (r() > 0.75) {
    const px0 = 2 + Math.floor(r() * 12);
    const py0 = 2 + Math.floor(r() * 12);
    const color = ["#e6b94a", "#f1ecd6", "#c73838"][Math.floor(r() * 3)];
    px(ctx, px0, py0, color);
    px(ctx, px0, py0 - 1, PAL.leaf);
  }
  return canvas;
}

function tileDirt(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 16);
  rect(ctx, 0, 0, 16, 16, PAL.dirt);
  const r = rng(101);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = r();
      if (v > 0.92) px(ctx, x, y, PAL.dirtDark);
      else if (v > 0.75) px(ctx, x, y, PAL.dirtLight);
      else if (v > 0.98) px(ctx, x, y, "#2a1a08");
    }
  }
  // Small pebbles
  for (let i = 0; i < 2; i++) {
    const px0 = 2 + Math.floor(r() * 12);
    const py0 = 2 + Math.floor(r() * 12);
    px(ctx, px0, py0, PAL.stoneDark);
    px(ctx, px0 + 1, py0, "#78603c");
    px(ctx, px0, py0 + 1, PAL.dirtDark);
  }
  return canvas;
}

function tileHole(): HTMLCanvasElement {
  // Dug grave hole with raised dirt mound around it.
  const { canvas, ctx } = makeCanvas(16, 16);
  // Outer grass remnant
  rect(ctx, 0, 0, 16, 16, PAL.grass2);
  // Raised dirt rim around hole
  rect(ctx, 1, 1, 14, 14, PAL.dirt);
  // Rim highlight (top)
  rect(ctx, 1, 1, 14, 1, PAL.dirtLight);
  // Rim shadow (bottom)
  rect(ctx, 1, 14, 14, 1, PAL.dirtDark);
  // Hole proper with depth gradient
  rect(ctx, 3, 3, 10, 10, "#3a2410");
  rect(ctx, 4, 4, 8, 8, "#241508");
  rect(ctx, 5, 5, 6, 6, "#100800");
  // Inner shadow (dark right/bottom edges)
  rect(ctx, 11, 4, 1, 8, "#000000");
  rect(ctx, 4, 11, 8, 1, "#000000");
  // Pile of loose dirt chunks around rim
  const r = rng(99);
  for (let i = 0; i < 6; i++) {
    const side = Math.floor(r() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = 2 + Math.floor(r() * 12); y = 0; }
    else if (side === 1) { x = 2 + Math.floor(r() * 12); y = 15; }
    else if (side === 2) { x = 0; y = 2 + Math.floor(r() * 12); }
    else { x = 15; y = 2 + Math.floor(r() * 12); }
    px(ctx, x, y, PAL.dirtLight);
  }
  return canvas;
}

function tilePlot(): HTMLCanvasElement {
  // Reserved plot: slightly flattened grass with four wooden survey stakes
  // and rope lines between them.
  const { canvas, ctx } = makeCanvas(16, 16);
  const r = rng(33);
  for (let y = 0; y < 16; y++) {
    rect(ctx, 0, y, 16, 1, y < 8 ? PAL.grass1 : "#354f28");
  }
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = r();
      if (v > 0.88) px(ctx, x, y, PAL.grass2);
      else if (v > 0.78) px(ctx, x, y, "#41602b");
    }
  }
  // Rope outline (faint tan line along the border)
  for (let x = 1; x < 15; x++) {
    if (x % 2 === 0) {
      px(ctx, x, 1, "#8c7348");
      px(ctx, x, 14, "#6d5932");
    }
  }
  for (let y = 1; y < 15; y++) {
    if (y % 2 === 0) {
      px(ctx, 1, y, "#8c7348");
      px(ctx, 14, y, "#6d5932");
    }
  }
  // Corner stakes (wooden posts with slight shadow)
  for (const [cx, cy] of [[1, 1], [14, 1], [1, 14], [14, 14]]) {
    rect(ctx, cx, cy - 1, 1, 3, PAL.woodDark);
    px(ctx, cx, cy - 1, PAL.woodLight);
    px(ctx, cx + (cx === 1 ? 1 : -1), cy + 1, "#1a1008"); // shadow cast
  }
  return canvas;
}

function tilePath(): HTMLCanvasElement {
  // Cobblestone path — small irregular stones separated by dark mortar.
  const { canvas, ctx } = makeCanvas(16, 16);
  rect(ctx, 0, 0, 16, 16, "#3a2f1e"); // mortar base
  const r = rng(77);
  // Stones in a rough grid with randomized size/shape
  const stones: [number, number, number, number][] = [];
  let y = 1;
  while (y < 15) {
    let x = 1 + Math.floor(r() * 2);
    const h = 3 + Math.floor(r() * 2);
    while (x < 15) {
      const w = 3 + Math.floor(r() * 2);
      if (x + w > 15) break;
      stones.push([x, y, w, h]);
      x += w + 1;
    }
    y += h + 1;
  }
  for (const [sx, sy, sw, sh] of stones) {
    // stone colour variation
    const shade = r() > 0.5 ? PAL.path1 : PAL.path2;
    const hi = "#c3b082";
    const lo = "#6a5b40";
    rect(ctx, sx, sy, sw, sh, shade);
    // Top-left highlight
    rect(ctx, sx, sy, sw, 1, hi);
    rect(ctx, sx, sy, 1, sh, hi);
    // Bottom-right shadow
    rect(ctx, sx + sw - 1, sy, 1, sh, lo);
    rect(ctx, sx, sy + sh - 1, sw, 1, lo);
    // Random speckle
    if (r() > 0.6) px(ctx, sx + 1 + Math.floor(r() * (sw - 2)), sy + 1 + Math.floor(r() * (sh - 2)), PAL.stone);
  }
  return canvas;
}

// ---------- Character sprites ----------

function playerSprite(): HTMLCanvasElement {
  // 20x28 — Mr. Korolev. Front-facing Victorian-era gravedigger with top hat,
  // frock coat, grey mustache/beard, cravat, boots, shovel in right hand.
  const W = 20, H = 28;
  const { canvas, ctx } = makeCanvas(W, H);

  const skin = PAL.skin;
  const skinShade = "#b89170";
  const coatMain = "#1a1822";
  const coatHi = "#2e2c3a";
  const coatLo = "#0c0a12";
  const shirt = "#e5dcc0";
  const cravat = "#4a1a24";
  const cravatHi = "#7a2a38";
  const hatMain = "#09090e";
  const hatHi = "#1a1a25";
  const hatBand = "#5a1a20";
  const bootMain = "#20160c";
  const bootHi = "#3a2410";
  const gloveMain = "#1e1c26";
  const hairGrey = "#8a8695";
  const hairGreyHi = "#b4b0c0";
  const shovelShaft = "#6a4a22";
  const shovelShaftHi = "#8c6636";
  const shovelHead = "#6c6c74";
  const shovelHeadHi = "#a6a6b0";
  const shovelHeadLo = "#3a3a42";

  // soft oval ground shadow
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(10, 27, 7, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // -- Boots --
  rect(ctx, 7, 25, 3, 2, bootMain);
  rect(ctx, 11, 25, 3, 2, bootMain);
  px(ctx, 7, 25, bootHi);
  px(ctx, 11, 25, bootHi);
  // Boot shadow
  rect(ctx, 7, 26, 3, 1, "#0a0806");
  rect(ctx, 11, 26, 3, 1, "#0a0806");

  // -- Legs / trousers (visible strip between coat tails) --
  rect(ctx, 8, 22, 2, 3, "#23212c");
  rect(ctx, 11, 22, 2, 3, "#23212c");

  // -- Coat body --
  // Long coat with tails: silhouette as two stacked shapes.
  // Shoulders/chest
  rect(ctx, 4, 12, 12, 6, coatMain);
  // Taper to waist
  rect(ctx, 5, 18, 10, 3, coatMain);
  // Tails (split in middle)
  rect(ctx, 5, 21, 4, 4, coatMain);
  rect(ctx, 11, 21, 4, 4, coatMain);
  // Coat highlights (left side)
  rect(ctx, 4, 12, 1, 6, coatHi);
  rect(ctx, 5, 18, 1, 3, coatHi);
  rect(ctx, 5, 21, 1, 4, coatHi);
  // Coat shadow (right side)
  rect(ctx, 15, 12, 1, 6, coatLo);
  rect(ctx, 14, 18, 1, 3, coatLo);
  rect(ctx, 14, 21, 1, 4, coatLo);
  // Lapels (V shape)
  px(ctx, 8, 12, coatHi);
  px(ctx, 11, 12, coatHi);
  px(ctx, 9, 13, coatHi);
  px(ctx, 10, 13, coatHi);
  // Shirt + cravat showing at chest
  rect(ctx, 9, 12, 2, 2, shirt);
  px(ctx, 10, 14, cravat);
  px(ctx, 9, 14, cravat);
  px(ctx, 9, 15, cravat);
  px(ctx, 10, 15, cravatHi);
  // Buttons (single column)
  px(ctx, 10, 17, PAL.brass);
  px(ctx, 10, 19, PAL.brass);
  px(ctx, 10, 21, PAL.brass);

  // -- Arms --
  // Right arm down holding shovel; left arm at side.
  rect(ctx, 3, 13, 1, 5, coatMain); // left arm
  rect(ctx, 16, 13, 1, 5, coatMain); // right arm (shovel side)
  // Gloves (hands)
  px(ctx, 3, 18, gloveMain);
  px(ctx, 16, 18, gloveMain);

  // -- Head --
  rect(ctx, 7, 6, 6, 6, skin);
  // Jawline shade
  rect(ctx, 7, 11, 6, 1, skinShade);
  // Neck (small)
  rect(ctx, 9, 12, 2, 1, skinShade);
  // Hair — greying temples peeking below hat
  px(ctx, 7, 6, hairGrey);
  px(ctx, 7, 7, hairGrey);
  px(ctx, 12, 6, hairGrey);
  px(ctx, 12, 7, hairGrey);
  // Ears
  px(ctx, 6, 8, skinShade);
  px(ctx, 13, 8, skinShade);
  // Eyes — deep-set with highlight
  px(ctx, 8, 8, PAL.eye);
  px(ctx, 11, 8, PAL.eye);
  px(ctx, 8, 8 - 0, PAL.eye); // emphasise
  // Eyebrows
  px(ctx, 8, 7, hairGreyHi);
  px(ctx, 11, 7, hairGreyHi);
  // Nose shadow
  px(ctx, 9, 9, skinShade);
  px(ctx, 10, 9, skinShade);
  // Mustache (curled)
  rect(ctx, 8, 10, 4, 1, hairGrey);
  px(ctx, 7, 10, hairGreyHi);
  px(ctx, 12, 10, hairGreyHi);
  // Beard (short, under mouth)
  rect(ctx, 9, 11, 2, 1, hairGrey);

  // -- Top hat --
  // Wide brim
  rect(ctx, 5, 5, 10, 1, hatMain);
  rect(ctx, 5, 5, 10, 1, hatMain);
  rect(ctx, 6, 4, 8, 1, hatMain);
  // Crown
  rect(ctx, 7, 0, 6, 5, hatMain);
  // Crown highlight (silk sheen)
  rect(ctx, 7, 0, 1, 5, hatHi);
  px(ctx, 8, 0, hatHi);
  // Hat band
  rect(ctx, 7, 4, 6, 1, hatBand);

  // -- Shovel in right hand --
  // Shaft (diagonal-ish, drawn as vertical for simplicity)
  rect(ctx, 17, 12, 1, 10, shovelShaft);
  px(ctx, 17, 12, shovelShaftHi);
  px(ctx, 17, 15, shovelShaftHi);
  px(ctx, 17, 18, shovelShaftHi);
  // Handle (T-grip)
  rect(ctx, 16, 11, 3, 1, shovelShaft);
  px(ctx, 16, 11, shovelShaftHi);
  px(ctx, 18, 11, shovelShaftHi);
  // Blade (trapezoid at bottom)
  rect(ctx, 16, 22, 3, 3, shovelHead);
  px(ctx, 16, 22, shovelHeadHi);
  px(ctx, 18, 22, shovelHeadHi);
  px(ctx, 16, 24, shovelHeadLo);
  px(ctx, 18, 24, shovelHeadLo);
  px(ctx, 17, 25, shovelHeadLo);

  return canvas;
}

function catSprite(): HTMLCanvasElement {
  // 18x14 — black cat with white chest bib, yellow-green eyes, elegant tail.
  const W = 18, H = 14;
  const { canvas, ctx } = makeCanvas(W, H);

  const furMain = "#1e1c24";
  const furHi = "#3a3844";
  const furLo = "#0c0a10";
  const bib = "#ddd3b4";
  const bibShade = "#a89e82";
  const eye = "#9edc55";
  const eyeCore = "#1a2010";
  const pink = "#c87080";
  const pinkLo = "#8a4050";

  // ground shadow
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(9, 13, 6, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail — curls up at tip
  rect(ctx, 0, 7, 2, 2, furMain);
  rect(ctx, 1, 6, 2, 1, furMain);
  rect(ctx, 2, 5, 2, 1, furMain);
  rect(ctx, 1, 8, 1, 1, furHi);
  px(ctx, 3, 4, furHi);

  // Body
  rect(ctx, 3, 7, 9, 5, furMain);
  rect(ctx, 3, 7, 9, 1, furHi);
  rect(ctx, 3, 11, 9, 1, furLo);

  // Belly/chest bib
  rect(ctx, 7, 9, 4, 3, bib);
  px(ctx, 7, 11, bibShade);
  px(ctx, 10, 11, bibShade);

  // Legs
  rect(ctx, 3, 12, 2, 2, furMain);
  rect(ctx, 6, 12, 2, 2, furMain);
  rect(ctx, 9, 12, 2, 2, furMain);
  // White socks on front paws
  px(ctx, 7, 13, bib);
  px(ctx, 10, 13, bib);
  px(ctx, 4, 13, furLo);

  // Head
  rect(ctx, 11, 4, 6, 6, furMain);
  // Head highlight
  rect(ctx, 11, 4, 6, 1, furHi);
  rect(ctx, 11, 5, 1, 5, furHi);
  // Head shadow on far side
  rect(ctx, 16, 5, 1, 5, furLo);

  // Ears (pointy triangles)
  rect(ctx, 11, 3, 2, 1, furMain);
  rect(ctx, 15, 3, 2, 1, furMain);
  px(ctx, 12, 2, furMain);
  px(ctx, 16, 2, furMain);
  // Inner ear pink
  px(ctx, 12, 3, pink);
  px(ctx, 16, 3, pink);

  // Eyes — big and luminous
  rect(ctx, 12, 6, 2, 2, eye);
  rect(ctx, 15, 6, 2, 2, eye);
  px(ctx, 13, 7, eyeCore);
  px(ctx, 16, 7, eyeCore);
  // Eye shine
  px(ctx, 12, 6, "#c0ff80");
  px(ctx, 15, 6, "#c0ff80");

  // Nose & mouth
  px(ctx, 14, 8, pink);
  px(ctx, 14, 9, pinkLo);
  px(ctx, 13, 9, furLo);
  px(ctx, 15, 9, furLo);

  // Whiskers (hints)
  px(ctx, 11, 8, "#a09cb0");
  px(ctx, 17, 8, "#a09cb0");

  return canvas;
}

function crystalSprite(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(10, 12);
  // glow ring (soft)
  ctx.fillStyle = "rgba(109,224,255,0.35)";
  ctx.beginPath();
  ctx.arc(5, 7, 5, 0, Math.PI * 2);
  ctx.fill();
  // crystal body (diamond)
  ctx.fillStyle = PAL.crystal1;
  ctx.beginPath();
  ctx.moveTo(5, 1);
  ctx.lineTo(9, 6);
  ctx.lineTo(5, 11);
  ctx.lineTo(1, 6);
  ctx.closePath();
  ctx.fill();
  // highlight
  ctx.fillStyle = PAL.crystal2;
  ctx.beginPath();
  ctx.moveTo(5, 2);
  ctx.lineTo(7, 5);
  ctx.lineTo(5, 8);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fill();
  // shadow
  ctx.fillStyle = PAL.crystalShadow;
  px(ctx, 5, 10, PAL.crystalShadow);
  return canvas;
}

// ---------- Tombstones (16x20) ----------

function tombWood(): HTMLCanvasElement {
  // Weathered wooden cross, leaning slightly, with grain and rusty nail.
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.ellipse?.(8, 19, 5, 1, 0, 0, Math.PI * 2);
  ctx.fillRect(3, 19, 10, 1);
  // vertical beam (wood with grain)
  rect(ctx, 7, 4, 3, 15, PAL.woodDark);
  rect(ctx, 7, 4, 2, 15, PAL.wood);
  rect(ctx, 7, 4, 1, 15, PAL.woodLight);
  // beam top (rounded)
  px(ctx, 7, 3, PAL.wood); px(ctx, 8, 3, PAL.wood);
  // horizontal crossbeam
  rect(ctx, 3, 7, 10, 3, PAL.woodDark);
  rect(ctx, 3, 7, 10, 2, PAL.wood);
  rect(ctx, 3, 7, 10, 1, PAL.woodLight);
  // Grain lines
  px(ctx, 4, 8, PAL.woodDark);
  px(ctx, 9, 8, PAL.woodDark);
  px(ctx, 8, 12, PAL.woodDark);
  px(ctx, 8, 16, PAL.woodDark);
  // Rusty nail where beams cross
  px(ctx, 8, 9, "#4a2a10");
  px(ctx, 8, 8, "#6a3a20");
  // Moss at base
  px(ctx, 6, 18, PAL.leafDark);
  px(ctx, 10, 18, PAL.leaf);
  return canvas;
}

function tombStone(): HTMLCanvasElement {
  // Carved rounded headstone with chiselled cross in relief and moss patches.
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 19, 12, 1);
  // Base plinth
  rect(ctx, 1, 16, 14, 3, PAL.stoneDark);
  rect(ctx, 1, 16, 14, 1, PAL.stone);
  rect(ctx, 1, 18, 14, 1, "#3a3a3d");
  // Slab body
  rect(ctx, 3, 3, 10, 13, PAL.stone);
  // Dome top
  rect(ctx, 4, 2, 8, 1, PAL.stone);
  rect(ctx, 5, 1, 6, 1, PAL.stone);
  rect(ctx, 6, 0, 4, 1, PAL.stone);
  // Left-side highlight
  rect(ctx, 3, 3, 1, 13, PAL.stoneLight);
  px(ctx, 4, 2, PAL.stoneLight);
  px(ctx, 5, 1, PAL.stoneLight);
  px(ctx, 6, 0, PAL.stoneLight);
  // Right-side shadow
  rect(ctx, 12, 3, 1, 13, PAL.stoneDark);
  // Carved cross (shadowed recess)
  rect(ctx, 7, 5, 2, 8, PAL.stoneDark);
  rect(ctx, 5, 7, 6, 2, PAL.stoneDark);
  // Cross highlight (inner edge)
  px(ctx, 7, 5, "#3e3e41");
  px(ctx, 5, 7, "#3e3e41");
  // Inscription plate
  rect(ctx, 5, 13, 6, 2, "#6e6e72");
  px(ctx, 6, 13, "#8a8a8e");
  // Moss at base
  px(ctx, 3, 15, PAL.leaf);
  px(ctx, 12, 15, PAL.leafDark);
  px(ctx, 4, 15, PAL.leafDark);
  return canvas;
}

function tombMarble(): HTMLCanvasElement {
  // Polished marble stele with gold-inlay cross, ornate top, and subtle veins.
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(1, 19, 14, 1);
  // Base (two steps)
  rect(ctx, 0, 17, 16, 2, PAL.marbleDark);
  rect(ctx, 0, 17, 16, 1, PAL.marble);
  rect(ctx, 1, 16, 14, 1, "#ebebf0");
  // Main slab
  rect(ctx, 2, 3, 12, 13, PAL.marble);
  // Decorative shoulders
  px(ctx, 2, 4, PAL.marble); px(ctx, 13, 4, PAL.marble);
  // Arched top with crenellations
  rect(ctx, 3, 2, 10, 1, PAL.marble);
  rect(ctx, 4, 1, 8, 1, PAL.marble);
  rect(ctx, 5, 0, 6, 1, PAL.marble);
  px(ctx, 7, -1 < 0 ? 0 : -1, PAL.gold);
  // Left highlight
  rect(ctx, 2, 3, 1, 13, "#ebebf0");
  rect(ctx, 3, 2, 1, 1, "#ebebf0");
  rect(ctx, 4, 1, 1, 1, "#ebebf0");
  rect(ctx, 5, 0, 1, 1, "#ebebf0");
  // Right shadow
  rect(ctx, 13, 3, 1, 13, PAL.marbleDark);
  rect(ctx, 12, 2, 1, 1, PAL.marbleDark);
  rect(ctx, 11, 1, 1, 1, PAL.marbleDark);
  rect(ctx, 10, 0, 1, 1, PAL.marbleDark);
  // Veins (diagonal)
  px(ctx, 5, 6, "#b0b0bf");
  px(ctx, 6, 7, "#b0b0bf");
  px(ctx, 10, 10, "#b0b0bf");
  px(ctx, 11, 11, "#b0b0bf");
  px(ctx, 4, 12, "#b0b0bf");
  // Gold inlay cross
  rect(ctx, 7, 5, 2, 8, PAL.gold);
  rect(ctx, 5, 7, 6, 2, PAL.gold);
  // Cross highlight
  px(ctx, 7, 5, PAL.flameCore);
  px(ctx, 5, 7, PAL.flameCore);
  // Gold halo dot at top of cross
  px(ctx, 7, 4, PAL.gold); px(ctx, 8, 4, PAL.gold);
  return canvas;
}

function tombObelisk(): HTMLCanvasElement {
  // Tall granite obelisk with stepped plinth, pyramid cap, and gold tip.
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 19, 12, 1);
  // Plinth (3 levels)
  rect(ctx, 1, 17, 14, 2, PAL.graniteDark);
  rect(ctx, 2, 16, 12, 1, PAL.granite);
  rect(ctx, 2, 16, 12, 1, PAL.granite);
  rect(ctx, 3, 15, 10, 1, "#5e606b");
  rect(ctx, 3, 14, 10, 1, PAL.granite);
  rect(ctx, 3, 13, 10, 1, PAL.graniteDark);
  // Shaft (tapering slightly)
  rect(ctx, 6, 4, 4, 9, PAL.granite);
  rect(ctx, 6, 4, 1, 9, "#686a75");
  rect(ctx, 9, 4, 1, 9, PAL.graniteDark);
  rect(ctx, 6, 4, 4, 1, "#686a75");
  // Pyramid cap
  rect(ctx, 6, 3, 4, 1, PAL.granite);
  rect(ctx, 7, 2, 2, 1, PAL.granite);
  px(ctx, 7, 2, "#686a75");
  // Gold capstone
  px(ctx, 7, 1, PAL.gold);
  px(ctx, 8, 1, PAL.brassDark);
  // Engraved vertical line of hieroglyphs
  px(ctx, 7, 6, PAL.graniteDark);
  px(ctx, 8, 7, PAL.graniteDark);
  px(ctx, 7, 8, PAL.graniteDark);
  px(ctx, 8, 9, PAL.graniteDark);
  px(ctx, 7, 10, PAL.graniteDark);
  px(ctx, 8, 11, PAL.graniteDark);
  return canvas;
}

// ---------- Flowers (12x12) ----------

function flower(color: string, opts: { glow?: boolean } = {}): HTMLCanvasElement {
  // 14×18 — bigger bloom + longer stem + two leaves. Lit from top-left.
  const W = 14, H = 18;
  const { canvas, ctx } = makeCanvas(W, H);
  const dark = shade(color, -55);
  const mid  = shade(color, -25);
  const hi   = shade(color, 28);
  const glow = shade(color, 55);

  // Optional glow halo for rare varieties.
  if (opts.glow) {
    ctx.fillStyle = `${color}33`;
    ctx.beginPath(); ctx.arc(7, 5, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `${color}22`;
    ctx.beginPath(); ctx.arc(7, 5, 9, 0, Math.PI * 2); ctx.fill();
  }

  // Ground shadow under flower
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath(); ctx.ellipse(7, 17, 4, 1.2, 0, 0, Math.PI * 2); ctx.fill();

  // Stem (two tones)
  rect(ctx, 7, 7, 1, 10, PAL.leaf);
  rect(ctx, 6, 7, 1, 10, PAL.leafDark);
  // Stem light fleck
  px(ctx, 7, 10, "#6fa346");
  px(ctx, 7, 13, "#6fa346");

  // Left leaf (pointed oval)
  rect(ctx, 3, 11, 3, 1, PAL.leaf);
  rect(ctx, 2, 12, 5, 1, PAL.leaf);
  rect(ctx, 3, 13, 4, 1, PAL.leafDark);
  px(ctx, 1, 12, PAL.leafDark);
  px(ctx, 4, 12, "#8cc262"); // leaf highlight
  // Right leaf
  rect(ctx, 8, 13, 4, 1, PAL.leaf);
  rect(ctx, 8, 14, 5, 1, PAL.leaf);
  rect(ctx, 9, 15, 4, 1, PAL.leafDark);
  px(ctx, 12, 14, PAL.leafDark);
  px(ctx, 10, 14, "#8cc262");

  // --- Bloom (6 petals around a centre) ---
  // Centre coord (7, 5), bloom radius ~4
  // Upper petal
  rect(ctx, 6, 0, 2, 2, color);
  px(ctx, 5, 1, color); px(ctx, 8, 1, color);
  // Lower petal
  rect(ctx, 6, 7, 2, 2, color);
  px(ctx, 5, 8, color); px(ctx, 8, 8, color);
  // Left petal
  rect(ctx, 2, 4, 2, 2, color);
  px(ctx, 3, 3, color); px(ctx, 3, 6, color);
  // Right petal
  rect(ctx, 10, 4, 2, 2, color);
  px(ctx, 10, 3, color); px(ctx, 10, 6, color);
  // Diagonal petals
  rect(ctx, 3, 2, 2, 2, color); // UL
  rect(ctx, 9, 2, 2, 2, color); // UR
  rect(ctx, 3, 6, 2, 2, color); // LL
  rect(ctx, 9, 6, 2, 2, color); // LR

  // Centre pollen (goldish)
  rect(ctx, 6, 4, 2, 2, PAL.gold);
  px(ctx, 6, 4, "#ffe8a3");
  px(ctx, 7, 5, PAL.brassDark);
  px(ctx, 6, 5, PAL.brassDark);

  // Petal shading: bottom + right petals darker, top + left lighter.
  // Lower petal
  rect(ctx, 6, 8, 2, 1, dark);
  px(ctx, 5, 8, mid);
  px(ctx, 8, 8, mid);
  // Right petal
  rect(ctx, 11, 4, 1, 2, dark);
  px(ctx, 10, 6, mid);
  // Lower-right
  rect(ctx, 9, 6, 2, 2, mid);
  px(ctx, 10, 7, dark);
  // Lower-left
  px(ctx, 3, 7, mid);
  px(ctx, 4, 7, dark);
  // Upper petal highlight
  px(ctx, 6, 0, hi);
  px(ctx, 7, 0, hi);
  // Upper-left petal highlight
  px(ctx, 3, 2, hi);
  px(ctx, 4, 2, hi);
  // Left petal highlight
  px(ctx, 2, 4, hi);
  px(ctx, 2, 5, hi);

  // Optional specular glow pixels on each petal tip (for rare varieties).
  if (opts.glow) {
    px(ctx, 7, 0, glow);
    px(ctx, 2, 5, glow);
    px(ctx, 11, 5, glow);
  }

  return canvas;
}

// ---------- Fence (16x10) ----------

function fenceWood(): HTMLCanvasElement {
  // Weathered picket fence — thicker pickets, visible end-grain caps,
  // horizontal rails with shadow, moss at the base.
  const W = 18, H = 14;
  const { canvas, ctx } = makeCanvas(W, H);
  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 13, W, 1);
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(1, 12, W - 2, 1);

  // Horizontal rails (upper + lower), rendered as 2-pixel thick planks.
  const drawRail = (yy: number) => {
    rect(ctx, 0, yy,     W, 1, PAL.woodLight);
    rect(ctx, 0, yy + 1, W, 1, PAL.wood);
    rect(ctx, 0, yy + 2, W, 1, PAL.woodDark);
  };
  drawRail(4);
  drawRail(9);

  // Pickets with pointed tops — 4 of them.
  const xs = [1, 6, 11, 16];
  for (const x of xs) {
    // Shadow behind picket (slight offset right+down)
    rect(ctx, x + 1, 1, 2, 12, "#00000030");
    // Picket body
    rect(ctx, x, 1, 2, 12, PAL.wood);
    // Left highlight strip
    rect(ctx, x, 1, 1, 12, PAL.woodLight);
    // Right shadow strip
    rect(ctx, x + 1, 1, 1, 12, PAL.woodDark);
    // Pointed top (two-pixel tip)
    px(ctx, x, 0, PAL.woodDark);
    px(ctx, x + 1, 0, PAL.woodDark);
    px(ctx, x, -1, PAL.wood); // no-op safe
    // Grain lines
    px(ctx, x + 1, 3, "#5c3c1e");
    px(ctx, x,     7, "#3a2410");
    px(ctx, x + 1, 10, "#3a2410");
    // Nails
    px(ctx, x,     5, PAL.ironDark);
    px(ctx, x + 1, 5, "#4a4a55");
    px(ctx, x,     10, PAL.ironDark);
    px(ctx, x + 1, 10, "#4a4a55");
    // Moss at base
    if ((x & 1) === 1) px(ctx, x,     12, PAL.leaf);
    px(ctx, x + 1, 12, PAL.leafDark);
  }
  return canvas;
}

function fenceIron(): HTMLCanvasElement {
  // Wrought iron fence — fleur-de-lis tips, decorative scrolls, brass finials,
  // and stone base plinth.
  const W = 18, H = 16;
  const { canvas, ctx } = makeCanvas(W, H);
  // Shadow on ground
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0, 15, W, 1);
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(1, 14, W - 2, 1);

  // Stone plinth base
  rect(ctx, 0, 12, W, 2, PAL.stone);
  rect(ctx, 0, 12, W, 1, PAL.stoneLight);
  rect(ctx, 0, 13, W, 1, PAL.stoneDark);
  // Mortar lines on plinth
  for (let x = 3; x < W; x += 5) px(ctx, x, 12, PAL.stoneDark);

  // Upper rail + highlights
  rect(ctx, 0, 5, W, 1, PAL.ironDark);
  rect(ctx, 0, 6, W, 1, PAL.iron);
  rect(ctx, 0, 7, W, 1, PAL.ironDark);
  // Lower rail
  rect(ctx, 0, 10, W, 1, PAL.ironDark);
  rect(ctx, 0, 11, W, 1, PAL.iron);

  // Vertical bars
  for (let x = 1; x < W; x += 2) {
    rect(ctx, x, 2, 1, 10, PAL.iron);
    // Highlight on left side of bar
    px(ctx, x, 3, "#6a6a72");
    px(ctx, x, 6, "#6a6a72");
    px(ctx, x, 9, "#6a6a72");
  }

  // Ornate scrollwork between rails (arcs between every 2 bars)
  for (let x = 1; x < W - 2; x += 4) {
    // Scroll shape — small curve
    px(ctx, x + 1, 7, PAL.iron);
    px(ctx, x + 2, 7, PAL.iron);
    px(ctx, x + 3, 7, PAL.iron);
    px(ctx, x + 1, 8, PAL.iron);
    px(ctx, x + 3, 8, PAL.iron);
    px(ctx, x + 2, 8, PAL.ironDark);
  }

  // Fleur-de-lis tips on every bar
  for (let x = 1; x < W; x += 2) {
    // Central spike
    px(ctx, x, 0, PAL.iron);
    px(ctx, x, 1, PAL.iron);
    // Wings
    if (x > 0) px(ctx, x - 1, 1, PAL.iron);
    if (x < W - 1) px(ctx, x + 1, 1, PAL.iron);
  }
  // Brass finial balls every 4 bars
  for (let x = 1; x < W; x += 4) {
    px(ctx, x, 0, PAL.brass);
    px(ctx, x - 1, 1, PAL.brass);
    px(ctx, x + 1, 1, PAL.brass);
    px(ctx, x, 1, "#ffe8a3"); // specular
    // Second brass sphere on mid-rail
    px(ctx, x, 6, PAL.brass);
    px(ctx, x, 11, PAL.brass);
  }
  return canvas;
}

function fenceStone(): HTMLCanvasElement {
  // Low stone wall — irregular block pattern with moss + shadow. 18x12.
  const W = 18, H = 12;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 11, W, 1);
  // Base fill
  rect(ctx, 0, 1, W, 10, PAL.stoneDark);
  // Courses of stones — two rows, offset.
  const r = rng(42);
  const drawBlock = (x: number, y: number, w: number, h: number) => {
    const shadeClr = r() > 0.5 ? PAL.stone : "#7c7c82";
    rect(ctx, x, y, w, h, shadeClr);
    // Top highlight
    rect(ctx, x, y, w, 1, PAL.stoneLight);
    // Bottom shadow
    rect(ctx, x, y + h - 1, w, 1, PAL.stoneDark);
    // Right shadow
    rect(ctx, x + w - 1, y, 1, h, PAL.stoneDark);
    // Speckle
    if (r() > 0.5) px(ctx, x + 1, y + 1, "#9a9aa0");
  };
  // Top row (4 blocks)
  let x = 0;
  while (x < W) {
    const w = 4 + Math.floor(r() * 2);
    drawBlock(x, 1, Math.min(w, W - x), 5);
    x += w;
  }
  // Bottom row (offset by 2)
  x = -2;
  while (x < W) {
    const w = 4 + Math.floor(r() * 2);
    const dx = Math.max(x, 0);
    const dw = Math.min(w - (dx - x), W - dx);
    if (dw > 0) drawBlock(dx, 6, dw, 5);
    x += w;
  }
  // Moss patches on top
  for (let i = 0; i < 4; i++) {
    const mx = Math.floor(r() * W);
    px(ctx, mx, 1, PAL.leaf);
    px(ctx, mx + 1, 1, PAL.leafDark);
  }
  return canvas;
}

// ---------- Lanterns (10x16) ----------

function lanternOil(): HTMLCanvasElement {
  // Oil lantern with glass window, post base, and soft glow.
  const { canvas, ctx } = makeCanvas(10, 16);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 15, 6, 1);
  // Glow halo
  ctx.fillStyle = "rgba(255,201,77,0.18)";
  ctx.beginPath(); ctx.arc(5, 4, 6, 0, Math.PI * 2); ctx.fill();
  // Post
  rect(ctx, 4, 7, 2, 8, PAL.woodDark);
  rect(ctx, 4, 7, 1, 8, PAL.wood);
  // Base bracket
  rect(ctx, 3, 13, 4, 2, PAL.iron);
  px(ctx, 3, 13, PAL.stoneDark);
  px(ctx, 6, 13, PAL.stoneDark);
  // Lantern body (cube)
  rect(ctx, 1, 2, 8, 5, PAL.iron);
  // Glass panels (flame visible)
  rect(ctx, 2, 3, 6, 3, "#4a1f08");
  rect(ctx, 3, 3, 4, 3, PAL.flame);
  rect(ctx, 4, 4, 2, 2, PAL.flameCore);
  px(ctx, 4, 3, "#ffffd0");
  // Iron frame on glass
  px(ctx, 5, 3, PAL.iron);
  px(ctx, 5, 5, PAL.iron);
  // Roof (pyramid)
  rect(ctx, 1, 1, 8, 1, PAL.iron);
  rect(ctx, 2, 0, 6, 1, PAL.iron);
  // Finial
  px(ctx, 4, -1 < 0 ? 0 : -1, PAL.brass);
  rect(ctx, 4, 0, 2, 1, PAL.ironDark);
  // Ring hanger
  px(ctx, 5, 0, PAL.brass);
  return canvas;
}

function lanternBrass(): HTMLCanvasElement {
  // Brass standing lamp with glass globe and brighter glow.
  const { canvas, ctx } = makeCanvas(10, 16);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 15, 6, 1);
  // Large glow
  ctx.fillStyle = "rgba(255,232,158,0.25)";
  ctx.beginPath(); ctx.arc(5, 4, 7, 0, Math.PI * 2); ctx.fill();
  // Post (brass with highlight)
  rect(ctx, 4, 8, 2, 7, PAL.brassDark);
  rect(ctx, 4, 8, 1, 7, PAL.brass);
  // Decorative rings
  rect(ctx, 3, 10, 4, 1, PAL.brass);
  rect(ctx, 3, 13, 4, 1, PAL.brass);
  // Base
  rect(ctx, 2, 14, 6, 1, PAL.brassDark);
  rect(ctx, 1, 15, 8, 1, PAL.brassDark);
  // Globe housing
  rect(ctx, 2, 1, 6, 7, PAL.brass);
  // Glass globe (round)
  rect(ctx, 3, 2, 4, 5, PAL.flameCore);
  rect(ctx, 2, 3, 6, 3, PAL.flameCore);
  rect(ctx, 3, 3, 4, 3, "#ffffe9");
  // Flame dark centre
  px(ctx, 4, 4, PAL.flame);
  px(ctx, 5, 4, PAL.flame);
  // Cage bars
  px(ctx, 3, 5, PAL.brassDark);
  px(ctx, 6, 5, PAL.brassDark);
  // Top cap
  rect(ctx, 3, 0, 4, 1, PAL.brassDark);
  px(ctx, 4, -1 < 0 ? 0 : -1, PAL.gold);
  return canvas;
}

function statueAngel(): HTMLCanvasElement {
  // Marble angel statue on two-tier pedestal with feathered wings and halo.
  const { canvas, ctx } = makeCanvas(16, 22);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 21, 12, 1);
  // Pedestal (two tiers)
  rect(ctx, 1, 18, 14, 3, PAL.marbleDark);
  rect(ctx, 1, 18, 14, 1, PAL.marble);
  rect(ctx, 2, 17, 12, 1, "#ebebf0");
  rect(ctx, 2, 16, 12, 1, PAL.marbleDark);
  // Robe (flowing, widening toward base)
  rect(ctx, 6, 11, 4, 5, PAL.marble);
  rect(ctx, 5, 13, 6, 3, PAL.marble);
  rect(ctx, 5, 13, 1, 3, PAL.marbleDark);
  rect(ctx, 10, 13, 1, 3, PAL.marbleDark);
  // Belt / sash detail
  rect(ctx, 6, 13, 4, 1, PAL.gold);
  // Torso
  rect(ctx, 6, 9, 4, 2, PAL.marble);
  // Arms (folded)
  rect(ctx, 5, 10, 1, 2, PAL.marble);
  rect(ctx, 10, 10, 1, 2, PAL.marble);
  // Neck
  px(ctx, 7, 8, PAL.marble);
  px(ctx, 8, 8, PAL.marble);
  // Head
  rect(ctx, 6, 5, 4, 4, PAL.marble);
  rect(ctx, 6, 5, 1, 4, "#ebebf0");
  rect(ctx, 9, 5, 1, 4, PAL.marbleDark);
  // Face shadow (eye line)
  px(ctx, 7, 7, PAL.marbleDark);
  px(ctx, 8, 7, PAL.marbleDark);
  // Hair veil on sides
  px(ctx, 5, 6, PAL.marble);
  px(ctx, 10, 6, PAL.marble);
  // Halo (gold ring above head)
  rect(ctx, 6, 4, 4, 1, PAL.gold);
  px(ctx, 5, 4, PAL.brassDark);
  px(ctx, 10, 4, PAL.brassDark);
  px(ctx, 7, 3, PAL.gold);
  px(ctx, 8, 3, PAL.gold);
  // Wings (feathered, spread slightly)
  // Left wing
  rect(ctx, 1, 8, 4, 6, PAL.marble);
  rect(ctx, 0, 9, 1, 4, PAL.marbleDark);
  rect(ctx, 1, 8, 1, 6, "#ebebf0");
  // Left wing feather lines
  for (let y = 9; y < 14; y += 2) px(ctx, 3, y, PAL.marbleDark);
  // Right wing
  rect(ctx, 11, 8, 4, 6, PAL.marble);
  rect(ctx, 15, 9, 1, 4, PAL.marbleDark);
  rect(ctx, 14, 8, 1, 6, PAL.marbleDark);
  for (let y = 9; y < 14; y += 2) px(ctx, 12, y, PAL.marbleDark);
  // Wing tips pointing up
  px(ctx, 1, 7, PAL.marble);
  px(ctx, 14, 7, PAL.marble);
  return canvas;
}

// Helper: darken/lighten a hex color.
function shade(hex: string, amount: number): string {
  if (!hex.startsWith("#")) return hex;
  const n = hex.slice(1);
  let r = parseInt(n.slice(0, 2), 16);
  let g = parseInt(n.slice(2, 4), 16);
  let b = parseInt(n.slice(4, 6), 16);
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ---------- Client portrait bubble (not used as texture, drawn by UI) ----------

function clientPortrait(gender: "m" | "f", seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(20, 20);
  const r = rng(seed);
  rect(ctx, 0, 0, 20, 20, "#2a2230");
  rect(ctx, 1, 1, 18, 18, "#3a3248");
  // head
  rect(ctx, 7, 5, 6, 6, PAL.skin);
  // hair
  const hairColor = ["#2a1a10", "#7a5a32", "#c9a04a", "#9c9cb2"][Math.floor(r() * 4)];
  rect(ctx, 6, 3, 8, 3, hairColor);
  if (gender === "f") {
    rect(ctx, 5, 5, 1, 4, hairColor);
    rect(ctx, 14, 5, 1, 4, hairColor);
  }
  // eyes
  px(ctx, 8, 7, PAL.eye);
  px(ctx, 11, 7, PAL.eye);
  // body
  const clothes = ["#5a2230", "#223a5a", "#2d5a30", "#5a5222"][Math.floor(r() * 4)];
  rect(ctx, 5, 11, 10, 8, clothes);
  rect(ctx, 8, 11, 4, 2, PAL.white);
  return canvas;
}

// ---------- New tombstones (celtic, broken, sarcophagus, angel-headstone) ----------

function tombCeltic(): HTMLCanvasElement {
  // Celtic cross: stone cross with a ring around the intersection, knotwork tint.
  const { canvas, ctx } = makeCanvas(16, 22);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(1, 21, 14, 1);
  // Two-step base
  rect(ctx, 2, 19, 12, 2, PAL.stoneDark);
  rect(ctx, 2, 19, 12, 1, PAL.stone);
  rect(ctx, 3, 18, 10, 1, PAL.stone);
  // Vertical shaft
  rect(ctx, 7, 3, 2, 15, PAL.stone);
  rect(ctx, 7, 3, 1, 15, PAL.stoneLight);
  rect(ctx, 8, 3, 1, 15, PAL.stoneDark);
  // Horizontal arm
  rect(ctx, 3, 8, 10, 2, PAL.stone);
  rect(ctx, 3, 8, 10, 1, PAL.stoneLight);
  // Ring around intersection
  rect(ctx, 4, 6, 8, 1, PAL.stoneDark);
  rect(ctx, 4, 11, 8, 1, PAL.stoneDark);
  px(ctx, 3, 7, PAL.stoneDark); px(ctx, 12, 7, PAL.stoneDark);
  px(ctx, 3, 10, PAL.stoneDark); px(ctx, 12, 10, PAL.stoneDark);
  rect(ctx, 4, 7, 1, 4, PAL.stone);
  rect(ctx, 11, 7, 1, 4, PAL.stone);
  // Knot-pattern pixels (gold dots)
  px(ctx, 7, 9, PAL.gold); px(ctx, 8, 9, PAL.gold);
  px(ctx, 5, 2, PAL.stoneLight);
  // Decorative tip
  px(ctx, 7, 2, PAL.stoneLight); px(ctx, 8, 2, PAL.stoneLight);
  // Moss
  px(ctx, 2, 19, PAL.leafDark); px(ctx, 13, 20, PAL.leafDark);
  return canvas;
}

function tombBroken(): HTMLCanvasElement {
  // A broken, leaning tombstone — weathered with a crack running top to bottom.
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(1, 19, 14, 1);
  // Base
  rect(ctx, 1, 17, 14, 2, PAL.stoneDark);
  rect(ctx, 1, 17, 14, 1, PAL.stone);
  // Main slab, leaning right a bit
  const slab: Array<[number, number, number]> = [
    [3, 4, 10], [3, 5, 11], [3, 6, 11], [3, 7, 11],
    [3, 8, 11], [3, 9, 11], [3, 10, 12], [3, 11, 12],
    [3, 12, 12], [3, 13, 12], [3, 14, 13], [3, 15, 13], [3, 16, 13],
  ];
  for (const [x, y, w] of slab) rect(ctx, x, y, w, 1, PAL.stone);
  // Shear break off top-right corner
  px(ctx, 13, 4, PAL.stoneDark);
  px(ctx, 13, 5, PAL.stoneDark);
  px(ctx, 14, 6, PAL.stoneDark);
  // Highlight and shadow
  rect(ctx, 3, 4, 1, 13, PAL.stoneLight);
  rect(ctx, 13, 9, 1, 7, PAL.stoneDark);
  // Vertical crack
  px(ctx, 8, 6, PAL.stoneDark);
  px(ctx, 9, 7, PAL.stoneDark);
  px(ctx, 8, 8, PAL.stoneDark);
  px(ctx, 9, 10, PAL.stoneDark);
  px(ctx, 8, 12, PAL.stoneDark);
  px(ctx, 9, 14, PAL.stoneDark);
  // Engraving — faint cross
  rect(ctx, 7, 8, 2, 5, PAL.stoneDark);
  rect(ctx, 5, 10, 6, 1, PAL.stoneDark);
  // Moss at base
  px(ctx, 2, 16, PAL.leafDark); px(ctx, 14, 17, PAL.leafDark);
  px(ctx, 4, 15, PAL.leaf);
  return canvas;
}

function tombSarcophagus(): HTMLCanvasElement {
  // A raised sarcophagus coffin: rectangular box with lid and decorative band.
  const { canvas, ctx } = makeCanvas(18, 18);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(1, 17, 16, 1);
  // Base (plinth)
  rect(ctx, 1, 14, 16, 3, PAL.marbleDark);
  rect(ctx, 1, 14, 16, 1, PAL.marble);
  // Main box
  rect(ctx, 2, 7, 14, 8, PAL.marble);
  // Lid (slightly wider)
  rect(ctx, 1, 5, 16, 3, PAL.marble);
  rect(ctx, 1, 5, 16, 1, "#ebebf0");
  rect(ctx, 1, 7, 16, 1, PAL.marbleDark);
  // Shadow side
  rect(ctx, 15, 7, 1, 8, PAL.marbleDark);
  // Highlight side
  rect(ctx, 2, 7, 1, 8, "#ebebf0");
  // Decorative band (gold) with three rosettes
  rect(ctx, 2, 10, 14, 2, PAL.gold);
  rect(ctx, 2, 10, 14, 1, "#ffd36a");
  px(ctx, 4, 11, PAL.brassDark);
  px(ctx, 9, 11, PAL.brassDark);
  px(ctx, 14, 11, PAL.brassDark);
  // Cross medallion centered
  rect(ctx, 8, 8, 2, 1, PAL.gold);
  rect(ctx, 8, 9, 2, 1, PAL.gold);
  px(ctx, 7, 8, PAL.gold); px(ctx, 10, 8, PAL.gold);
  // Feet bumps
  rect(ctx, 2, 17, 2, 1, PAL.marbleDark);
  rect(ctx, 14, 17, 2, 1, PAL.marbleDark);
  return canvas;
}

function tombAngelHead(): HTMLCanvasElement {
  // An angel atop a large headstone base — mini statue-on-stone look.
  const { canvas, ctx } = makeCanvas(18, 24);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 23, 14, 1);
  // Pedestal (3 tiers)
  rect(ctx, 1, 20, 16, 3, PAL.marbleDark);
  rect(ctx, 1, 20, 16, 1, PAL.marble);
  rect(ctx, 2, 17, 14, 3, PAL.marble);
  rect(ctx, 2, 17, 14, 1, "#ebebf0");
  rect(ctx, 15, 18, 1, 3, PAL.marbleDark);
  // Central cross plaque
  rect(ctx, 7, 14, 4, 6, "#d8d8df");
  rect(ctx, 7, 14, 1, 6, "#ebebf0");
  rect(ctx, 10, 14, 1, 6, PAL.marbleDark);
  rect(ctx, 8, 15, 2, 4, PAL.gold);
  rect(ctx, 7, 16, 4, 1, PAL.gold);
  // Angel figure atop
  // wings (spread)
  rect(ctx, 3, 9, 4, 1, PAL.marbleDark);
  rect(ctx, 2, 10, 5, 1, "#ebebf0");
  rect(ctx, 3, 11, 4, 1, PAL.marble);
  rect(ctx, 11, 9, 4, 1, PAL.marbleDark);
  rect(ctx, 11, 10, 5, 1, "#ebebf0");
  rect(ctx, 11, 11, 4, 1, PAL.marble);
  // Halo
  rect(ctx, 7, 2, 4, 1, PAL.gold);
  px(ctx, 6, 3, PAL.gold); px(ctx, 11, 3, PAL.gold);
  rect(ctx, 7, 4, 4, 1, PAL.gold);
  // Head
  rect(ctx, 8, 5, 2, 2, "#f3ddc2");
  // Body/robe
  rect(ctx, 7, 7, 4, 4, PAL.marble);
  rect(ctx, 7, 7, 1, 4, "#ebebf0");
  rect(ctx, 10, 7, 1, 4, PAL.marbleDark);
  // Sash (gold)
  rect(ctx, 7, 9, 4, 1, PAL.gold);
  // Feet
  rect(ctx, 7, 11, 4, 2, PAL.marbleDark);
  return canvas;
}

// ---------- Static necropolis buildings ----------

/** A small stone mausoleum with pillars, arched door, and cross. 48×64. */
function buildingMausoleum(): HTMLCanvasElement {
  const W = 48, H = 64;
  const { canvas, ctx } = makeCanvas(W, H);
  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(W / 2, H - 2, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Base plinth (wide slab)
  rect(ctx, 2, H - 8, W - 4, 6, PAL.stoneDark);
  rect(ctx, 2, H - 8, W - 4, 1, PAL.stone);
  // Main body (block)
  rect(ctx, 6, 18, W - 12, H - 26, PAL.stone);
  // Shaded right wall
  rect(ctx, W - 8, 18, 2, H - 26, PAL.stoneDark);
  // Left highlight
  rect(ctx, 6, 18, 2, H - 26, PAL.stoneLight);
  // Stone block seams
  for (let y = 24; y < H - 10; y += 8) rect(ctx, 8, y, W - 16, 1, PAL.stoneDark);
  for (let x = 12; x < W - 10; x += 10) rect(ctx, x, 20, 1, H - 30, PAL.stoneDark);
  // Pillars (left and right)
  rect(ctx, 4, 12, 3, H - 20, PAL.stoneLight);
  rect(ctx, 5, 12, 2, H - 20, PAL.stone);
  rect(ctx, W - 7, 12, 3, H - 20, PAL.stoneLight);
  rect(ctx, W - 6, 12, 2, H - 20, PAL.stone);
  // Pillar bases and caps
  rect(ctx, 3, 10, 5, 3, PAL.stoneDark);
  rect(ctx, W - 8, 10, 5, 3, PAL.stoneDark);
  rect(ctx, 3, H - 10, 5, 3, PAL.stoneDark);
  rect(ctx, W - 8, H - 10, 5, 3, PAL.stoneDark);
  // Triangular pediment (roof)
  for (let i = 0; i < 12; i++) {
    rect(ctx, 4 + i, 12 - i, W - 8 - i * 2, 1, PAL.stoneDark);
    if (i < 6) rect(ctx, 4 + i, 12 - i, 1, 1, PAL.stoneLight);
  }
  // Cross atop the pediment
  rect(ctx, W / 2 - 1, 0, 2, 6, PAL.gold);
  rect(ctx, W / 2 - 3, 2, 6, 2, PAL.gold);
  // Arched doorway
  rect(ctx, W / 2 - 5, 28, 10, 20, "#1a1018");
  // Door arch curve top (approximate)
  rect(ctx, W / 2 - 6, 26, 12, 2, "#1a1018");
  rect(ctx, W / 2 - 7, 24, 14, 2, "#1a1018");
  // Door panel highlights (wood-ish interior)
  rect(ctx, W / 2 - 4, 32, 8, 14, "#2a1a18");
  rect(ctx, W / 2 - 4, 32, 1, 14, "#3a2a24");
  // Door small cross panel
  rect(ctx, W / 2, 36, 1, 8, "#5c4a30");
  rect(ctx, W / 2 - 2, 39, 5, 1, "#5c4a30");
  // Moss at base corners
  px(ctx, 4, H - 10, PAL.leaf);
  px(ctx, W - 5, H - 10, PAL.leaf);
  px(ctx, 5, H - 9, PAL.leafDark);
  return canvas;
}

/** A chapel with steeple, stained-glass window, arched door. 96×128. */
function buildingChapel(): HTMLCanvasElement {
  const W = 96, H = 128;
  const { canvas, ctx } = makeCanvas(W, H);
  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.ellipse(W / 2, H - 3, 44, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Foundation slab
  rect(ctx, 4, H - 10, W - 8, 8, PAL.stoneDark);
  rect(ctx, 4, H - 10, W - 8, 1, PAL.stone);
  // Main nave (large block)
  const naveY = 50, naveH = H - 60;
  rect(ctx, 10, naveY, W - 20, naveH, PAL.stone);
  // Stone seams
  for (let y = naveY + 8; y < H - 12; y += 10) rect(ctx, 12, y, W - 24, 1, PAL.stoneDark);
  rect(ctx, 10, naveY, 2, naveH, PAL.stoneLight);
  rect(ctx, W - 12, naveY, 2, naveH, PAL.stoneDark);
  // Roof — steep pitched (light + shade)
  for (let i = 0; i < 24; i++) {
    const y = naveY - 24 + i;
    rect(ctx, 8 + i, y, W - 16 - i * 2, 1, shade("#4a2820", -i));
    if (i < 12) rect(ctx, 8 + i, y, 2, 1, shade("#4a2820", 10));
  }
  // Steeple column (central tower)
  rect(ctx, W / 2 - 8, 20, 16, naveY - 24 - 20 + 4, PAL.stoneLight);
  rect(ctx, W / 2 - 8, 20, 2, naveY - 24 - 20 + 4, "#ebebf0");
  rect(ctx, W / 2 + 6, 20, 2, naveY - 24 - 20 + 4, PAL.stoneDark);
  // Steeple pyramid roof
  for (let i = 0; i < 14; i++) {
    rect(ctx, W / 2 - 8 + i, 20 - i, 16 - i * 2, 1, "#3a1a14");
    if (i < 7) rect(ctx, W / 2 - 8 + i, 20 - i, 2, 1, "#5a2820");
  }
  // Cross on top of steeple
  rect(ctx, W / 2 - 1, 0, 2, 10, PAL.gold);
  rect(ctx, W / 2 - 4, 3, 8, 2, PAL.gold);
  // Steeple window (pointed)
  rect(ctx, W / 2 - 2, 24, 4, 6, "#f0dc7a");
  rect(ctx, W / 2 - 1, 22, 2, 2, "#f0dc7a");
  // Large stained-glass round window
  const cx = W / 2, cy = naveY + 14;
  ctx.fillStyle = "#2a1820"; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
  const colours = ["#c73838", "#3b7ccf", "#d7c78b", "#6b9f54"];
  for (let a = 0; a < 4; a++) {
    ctx.fillStyle = colours[a];
    ctx.beginPath();
    ctx.arc(cx, cy, 7, a * Math.PI / 2, a * Math.PI / 2 + Math.PI / 2);
    ctx.lineTo(cx, cy);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = "#1a1018";
  ctx.fillRect(cx - 8, cy, 16, 1);
  ctx.fillRect(cx, cy - 8, 1, 16);
  // Two side windows (tall arched)
  const drawArchWindow = (x: number) => {
    rect(ctx, x, naveY + 20, 6, 16, "#2a1820");
    rect(ctx, x + 1, naveY + 20, 4, 16, "#e0c878");
    rect(ctx, x - 1, naveY + 18, 8, 2, "#2a1820");
    rect(ctx, x, naveY + 18, 6, 2, "#c0a858");
    // Cross mullion
    rect(ctx, x + 2, naveY + 20, 2, 16, "#5a4a30");
    rect(ctx, x, naveY + 27, 6, 1, "#5a4a30");
  };
  drawArchWindow(18);
  drawArchWindow(W - 24);
  // Grand doorway (arched double doors)
  const doorW = 16, doorH = 30, doorX = W / 2 - doorW / 2, doorY = H - 10 - doorH;
  rect(ctx, doorX - 2, doorY - 2, doorW + 4, 3, PAL.stoneDark); // arch
  rect(ctx, doorX, doorY, doorW, doorH, "#3a1e14"); // doors
  rect(ctx, doorX, doorY, 1, doorH, "#5a3820");
  rect(ctx, doorX + doorW / 2, doorY, 1, doorH, "#1a0a08");
  // Door rivets
  for (let y = doorY + 4; y < doorY + doorH - 2; y += 8) {
    px(ctx, doorX + 2, y, PAL.gold);
    px(ctx, doorX + doorW - 3, y, PAL.gold);
  }
  // Steps
  rect(ctx, doorX - 4, H - 10, doorW + 8, 2, PAL.stone);
  rect(ctx, doorX - 2, H - 8, doorW + 4, 2, PAL.stoneDark);
  return canvas;
}

/** A small crypt (square stone box). 32×40. */
function buildingCrypt(): HTMLCanvasElement {
  const W = 32, H = 40;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(W / 2, H - 2, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Body
  rect(ctx, 2, 10, W - 4, H - 14, PAL.stone);
  rect(ctx, 2, 10, 2, H - 14, PAL.stoneLight);
  rect(ctx, W - 4, 10, 2, H - 14, PAL.stoneDark);
  // Seams
  rect(ctx, 4, 18, W - 8, 1, PAL.stoneDark);
  rect(ctx, 4, 26, W - 8, 1, PAL.stoneDark);
  // Flat roof slab
  rect(ctx, 0, 6, W, 4, PAL.stoneDark);
  rect(ctx, 0, 6, W, 1, PAL.stone);
  // Cross on top
  rect(ctx, W / 2 - 1, 0, 2, 6, PAL.stoneDark);
  rect(ctx, W / 2 - 2, 2, 4, 1, PAL.stoneDark);
  // Door
  rect(ctx, W / 2 - 4, 20, 8, 14, "#1a1018");
  rect(ctx, W / 2 - 3, 21, 6, 12, "#2a1a18");
  rect(ctx, W / 2 - 3, 21, 1, 12, "#3a2a24");
  px(ctx, W / 2 + 1, 28, PAL.brassDark);
  // Moss
  px(ctx, 3, H - 8, PAL.leaf);
  px(ctx, W - 4, H - 8, PAL.leafDark);
  return canvas;
}

/** Huge memorial stone cross. 28×64. */
function buildingBigCross(): HTMLCanvasElement {
  const W = 28, H = 64;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(W / 2, H - 2, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Stepped base
  rect(ctx, 2, H - 12, W - 4, 10, PAL.stoneDark);
  rect(ctx, 2, H - 12, W - 4, 1, PAL.stone);
  rect(ctx, 4, H - 16, W - 8, 4, PAL.stone);
  rect(ctx, 4, H - 16, W - 8, 1, PAL.stoneLight);
  // Cross vertical
  rect(ctx, W / 2 - 3, 4, 6, H - 20, PAL.stone);
  rect(ctx, W / 2 - 3, 4, 2, H - 20, PAL.stoneLight);
  rect(ctx, W / 2 + 1, 4, 2, H - 20, PAL.stoneDark);
  // Cross horizontal
  rect(ctx, W / 2 - 10, 20, 20, 6, PAL.stone);
  rect(ctx, W / 2 - 10, 20, 20, 1, PAL.stoneLight);
  rect(ctx, W / 2 - 10, 25, 20, 1, PAL.stoneDark);
  // Moss
  px(ctx, W / 2 - 2, H - 14, PAL.leaf);
  px(ctx, W / 2 + 2, 22, PAL.leafDark);
  // INRI plaque
  rect(ctx, W / 2 - 3, 8, 6, 3, PAL.gold);
  rect(ctx, W / 2 - 3, 8, 6, 1, "#ffe8a3");
  return canvas;
}

/** A stone gate / archway entrance. 48×64. */
function buildingGate(): HTMLCanvasElement {
  const W = 48, H = 64;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(W / 2, H - 2, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Left pillar
  rect(ctx, 2, 10, 10, H - 14, PAL.stone);
  rect(ctx, 2, 10, 2, H - 14, PAL.stoneLight);
  rect(ctx, 10, 10, 2, H - 14, PAL.stoneDark);
  // Right pillar
  rect(ctx, W - 12, 10, 10, H - 14, PAL.stone);
  rect(ctx, W - 12, 10, 2, H - 14, PAL.stoneLight);
  rect(ctx, W - 4, 10, 2, H - 14, PAL.stoneDark);
  // Pillar caps
  rect(ctx, 0, 8, 14, 4, PAL.stoneDark);
  rect(ctx, W - 14, 8, 14, 4, PAL.stoneDark);
  // Top archway beam
  rect(ctx, 8, 4, W - 16, 6, PAL.stoneDark);
  rect(ctx, 8, 4, W - 16, 1, PAL.stone);
  // Iron gate between pillars
  for (let x = 14; x < W - 14; x += 4) {
    rect(ctx, x, 14, 1, H - 18, PAL.iron);
    px(ctx, x, 12, PAL.iron);
    px(ctx, x, 13, PAL.iron);
  }
  rect(ctx, 12, 28, W - 24, 1, PAL.iron);
  // Brass finials on pillars
  px(ctx, 6, 6, PAL.brass); px(ctx, 7, 6, PAL.brass);
  px(ctx, W - 7, 6, PAL.brass); px(ctx, W - 8, 6, PAL.brass);
  // Cross on archway top
  rect(ctx, W / 2 - 1, 0, 2, 5, PAL.gold);
  rect(ctx, W / 2 - 2, 1, 4, 1, PAL.gold);
  return canvas;
}

// ---------- New flowers (orange, blue, pink) ----------
// The existing flower() helper is generic; we just pass new palette colours.

// ---------- Decorations: wreath, candle, bible ----------

function decorWreath(): HTMLCanvasElement {
  // A circular funeral wreath — green with coloured flowers scattered.
  const { canvas, ctx } = makeCanvas(16, 16);
  // Shadow
  px(ctx, 8, 14, PAL.shadow); px(ctx, 9, 14, PAL.shadow);
  // Ring
  const ring = [
    [6, 3], [7, 3], [8, 3], [9, 3],
    [4, 4], [5, 4], [10, 4], [11, 4],
    [3, 5], [12, 5],
    [3, 6], [12, 6],
    [3, 7], [12, 7],
    [3, 8], [12, 8],
    [3, 9], [12, 9],
    [4, 10], [5, 10], [10, 10], [11, 10],
    [6, 11], [7, 11], [8, 11], [9, 11],
  ];
  for (const [x, y] of ring) px(ctx, x, y, PAL.leaf);
  // Darker underside
  for (const [x, y] of ring) if (y > 7) px(ctx, x, y, PAL.leafDark);
  // Leaf highlights (lighter)
  px(ctx, 5, 4, "#69923a");
  px(ctx, 10, 4, "#69923a");
  px(ctx, 4, 5, "#69923a");
  // Scattered flowers: red, white, yellow, purple
  px(ctx, 6, 5, PAL.petalRed);
  px(ctx, 11, 7, PAL.petalYellow);
  px(ctx, 4, 8, PAL.petalWhite);
  px(ctx, 9, 10, PAL.petalPurple);
  px(ctx, 8, 4, PAL.petalPink);
  // Black ribbon at the bottom
  rect(ctx, 6, 12, 4, 2, "#1a1a22");
  px(ctx, 5, 13, "#1a1a22"); px(ctx, 10, 13, "#1a1a22");
  px(ctx, 6, 12, "#444");
  return canvas;
}

function decorCandle(): HTMLCanvasElement {
  // A large candle with a glass holder at the base and a flickering flame.
  const { canvas, ctx } = makeCanvas(10, 16);
  // Base holder (glass)
  rect(ctx, 2, 13, 6, 2, "#556066");
  rect(ctx, 2, 13, 6, 1, "#7e8a92");
  px(ctx, 2, 15, PAL.shadow); px(ctx, 7, 15, PAL.shadow);
  // Candle column
  rect(ctx, 3, 4, 4, 9, PAL.petalWhite);
  rect(ctx, 3, 4, 1, 9, "#fffbea");
  rect(ctx, 6, 4, 1, 9, "#c9c5a8");
  // Wax drips
  px(ctx, 3, 7, "#fffbea"); px(ctx, 6, 9, "#c9c5a8");
  // Wick
  px(ctx, 5, 3, "#2a1a10");
  // Flame
  px(ctx, 5, 2, PAL.flame);
  px(ctx, 4, 1, PAL.flame); px(ctx, 5, 1, PAL.flameCore); px(ctx, 6, 1, PAL.flame);
  px(ctx, 5, 0, PAL.flame);
  // Glow hint
  px(ctx, 4, 2, PAL.flame); px(ctx, 6, 2, PAL.flame);
  return canvas;
}

function decorBible(): HTMLCanvasElement {
  // A closed book with a cross on the cover and a red ribbon bookmark.
  const { canvas, ctx } = makeCanvas(12, 10);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(1, 9, 10, 1);
  // Back cover (burgundy)
  rect(ctx, 1, 2, 10, 7, "#4a1820");
  rect(ctx, 1, 2, 10, 1, "#6b2a32");
  // Pages (side)
  rect(ctx, 2, 3, 1, 6, "#e8dbb2");
  rect(ctx, 9, 3, 1, 6, "#e8dbb2");
  // Front face shading
  rect(ctx, 3, 2, 8, 1, "#5a202a");
  // Spine shadow
  rect(ctx, 1, 3, 1, 6, "#2a0e14");
  // Gold cross embossed
  rect(ctx, 6, 4, 1, 4, PAL.gold);
  rect(ctx, 5, 5, 3, 1, PAL.gold);
  // Red ribbon
  rect(ctx, 8, 8, 1, 2, "#c73838");
  return canvas;
}

// ---------- Zombie sprite ----------

function zombieSprite(): HTMLCanvasElement {
  // Classic shambling zombie: greenish skin, torn coat, glowing eyes.
  const { canvas, ctx } = makeCanvas(12, 16);
  // Shadow under feet
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 15, 8, 1);
  // Feet (old boots)
  rect(ctx, 3, 14, 2, 2, "#1a1a22");
  rect(ctx, 7, 14, 2, 2, "#1a1a22");
  // Trousers (torn)
  rect(ctx, 3, 11, 6, 3, "#3b2c2c");
  px(ctx, 4, 13, "#2a1f1f"); px(ctx, 7, 13, "#2a1f1f");
  // Torn coat body
  rect(ctx, 3, 7, 6, 5, "#4a3c22");
  rect(ctx, 3, 7, 1, 5, "#2f2614");
  rect(ctx, 8, 7, 1, 5, "#2f2614");
  // Rips
  px(ctx, 5, 10, "#2a2014");
  px(ctx, 6, 9, "#2a2014");
  // Neck
  rect(ctx, 5, 6, 2, 1, "#6b8a4a");
  // Head (green-grey)
  rect(ctx, 4, 2, 4, 4, "#8aac5e");
  rect(ctx, 4, 2, 4, 1, "#75964d");
  rect(ctx, 4, 5, 4, 1, "#6e8a48");
  // Hair/stubble
  px(ctx, 4, 1, "#2a1a10"); px(ctx, 5, 1, "#2a1a10");
  px(ctx, 6, 1, "#2a1a10"); px(ctx, 7, 1, "#2a1a10");
  px(ctx, 4, 0, "#2a1a10");
  // Glowing eyes (cyan)
  px(ctx, 5, 4, "#8ffff0");
  px(ctx, 6, 4, "#8ffff0");
  // Gaping mouth
  rect(ctx, 5, 5, 2, 1, "#2a0814");
  // Arms stretched out
  rect(ctx, 2, 8, 1, 4, "#6e8a48");
  rect(ctx, 9, 8, 1, 4, "#6e8a48");
  // Hands
  rect(ctx, 2, 11, 1, 1, "#8aac5e");
  rect(ctx, 9, 11, 1, 1, "#8aac5e");
  return canvas;
}

// ---------- Registration ----------

export function generateAllTextures(scene: Phaser.Scene) {
  // Terrain
  register(scene, "tile_grass_0", makeIsoTile(tileGrass(1)));
  register(scene, "tile_grass_1", makeIsoTile(tileGrass(7)));
  register(scene, "tile_grass_2", makeIsoTile(tileGrass(23)));
  register(scene, "tile_dirt", makeIsoTile(tileDirt()));
  register(scene, "tile_hole", makeIsoTile(tileHole()));
  register(scene, "tile_plot", makeIsoTile(tilePlot()));
  register(scene, "tile_path", makeIsoTile(tilePath()));

  // Characters
  register(scene, "player", playerSprite());
  register(scene, "cat", catSprite());
  register(scene, "crystal", crystalSprite());
  register(scene, "zombie", zombieSprite());

  // Items by sprite key declared in catalog.
  register(scene, "tomb_wood", tombWood());
  register(scene, "tomb_stone", tombStone());
  register(scene, "tomb_celtic", tombCeltic());
  register(scene, "tomb_broken", tombBroken());
  register(scene, "tomb_marble", tombMarble());
  register(scene, "tomb_sarcophagus", tombSarcophagus());
  register(scene, "tomb_obelisk", tombObelisk());
  register(scene, "tomb_angel", tombAngelHead());

  register(scene, "flower_white", flower(PAL.petalWhite));
  register(scene, "flower_red", flower(PAL.petalRed));
  register(scene, "flower_yellow", flower(PAL.petalYellow));
  register(scene, "flower_purple", flower(PAL.petalPurple));
  register(scene, "flower_orange", flower(PAL.petalOrange));
  register(scene, "flower_blue", flower(PAL.petalBlue));
  register(scene, "flower_pink", flower(PAL.petalPink));
  // Rare glowing varieties
  register(scene, "flower_ghost", flower("#e6f4ff", { glow: true }));
  register(scene, "flower_rose", flower("#c73838", { glow: true }));

  register(scene, "decor_wreath", decorWreath());
  register(scene, "decor_candle", decorCandle());
  register(scene, "decor_bible", decorBible());

  register(scene, "fence_wood", fenceWood());
  register(scene, "fence_iron", fenceIron());
  register(scene, "fence_stone", fenceStone());

  register(scene, "lantern_oil", lanternOil());
  register(scene, "lantern_brass", lanternBrass());

  register(scene, "statue_angel", statueAngel());

  // Static necropolis structures
  register(scene, "build_mausoleum", buildingMausoleum());
  register(scene, "build_chapel", buildingChapel());
  register(scene, "build_crypt", buildingCrypt());
  register(scene, "build_bigcross", buildingBigCross());
  register(scene, "build_gate", buildingGate());

  // Preallocate a pool of client portraits (deterministic seeds).
  for (let i = 0; i < 8; i++) {
    register(scene, `portrait_m_${i}`, clientPortrait("m", i * 13 + 1));
    register(scene, `portrait_f_${i}`, clientPortrait("f", i * 17 + 3));
  }
}

export function portraitKey(gender: "m" | "f", seedIdx: number): string {
  return `portrait_${gender}_${Math.abs(seedIdx) % 8}`;
}
