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
  rect(ctx, 0, 0, 16, 16, PAL.grass1);
  const r = rng(seed);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = r();
      if (v > 0.86) px(ctx, x, y, PAL.grass3);
      else if (v > 0.55) px(ctx, x, y, PAL.grass2);
    }
  }
  // Tiny tufts
  for (let i = 0; i < 4; i++) {
    const gx = Math.floor(r() * 15);
    const gy = Math.floor(r() * 15);
    px(ctx, gx, gy, PAL.leaf);
    px(ctx, gx + 1, gy, PAL.leaf);
    px(ctx, gx, gy - 1, PAL.leafDark);
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
      if (v > 0.9) px(ctx, x, y, PAL.dirtDark);
      else if (v > 0.75) px(ctx, x, y, PAL.dirtLight);
    }
  }
  return canvas;
}

function tileHole(): HTMLCanvasElement {
  // Dug grave hole (2 tiles wide usually, but we render one tile that tiles).
  const { canvas, ctx } = makeCanvas(16, 16);
  rect(ctx, 0, 0, 16, 16, PAL.grass2);
  rect(ctx, 2, 2, 12, 12, PAL.dirtDark);
  rect(ctx, 3, 3, 10, 10, "#1c1208");
  // Rim of loose dirt
  for (let x = 2; x < 14; x++) {
    px(ctx, x, 1, PAL.dirtLight);
    px(ctx, x, 14, PAL.dirt);
  }
  for (let y = 2; y < 14; y++) {
    px(ctx, 1, y, PAL.dirt);
    px(ctx, 14, y, PAL.dirt);
  }
  return canvas;
}

function tilePlot(): HTMLCanvasElement {
  // A visually distinct "reserved plot" tile — slightly darker grass with faint corner markers.
  const { canvas, ctx } = makeCanvas(16, 16);
  rect(ctx, 0, 0, 16, 16, PAL.grass1);
  const r = rng(33);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = r();
      if (v > 0.9) px(ctx, x, y, PAL.grass2);
    }
  }
  // Corner stakes
  for (const [cx, cy] of [[1, 1], [14, 1], [1, 14], [14, 14]]) {
    px(ctx, cx, cy, PAL.woodLight);
    px(ctx, cx, cy + 1, PAL.woodDark);
  }
  return canvas;
}

function tilePath(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 16);
  rect(ctx, 0, 0, 16, 16, PAL.path1);
  const r = rng(77);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = r();
      if (v > 0.85) px(ctx, x, y, PAL.path2);
      else if (v > 0.97) px(ctx, x, y, PAL.stone);
    }
  }
  // Subtle border
  for (let x = 0; x < 16; x++) {
    px(ctx, x, 0, "#72634a");
    px(ctx, x, 15, "#72634a");
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
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(3, 19, 10, 1);
  // vertical beam
  rect(ctx, 7, 5, 2, 14, PAL.wood);
  rect(ctx, 7, 5, 1, 14, PAL.woodLight);
  // horizontal
  rect(ctx, 3, 8, 10, 2, PAL.wood);
  rect(ctx, 3, 8, 10, 1, PAL.woodLight);
  return canvas;
}

function tombStone(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 19, 12, 1);
  // base
  rect(ctx, 2, 16, 12, 3, PAL.stoneDark);
  rect(ctx, 2, 16, 12, 1, PAL.stoneLight);
  // slab
  rect(ctx, 4, 4, 8, 12, PAL.stone);
  // round top
  rect(ctx, 5, 3, 6, 1, PAL.stone);
  rect(ctx, 6, 2, 4, 1, PAL.stone);
  // highlight
  rect(ctx, 4, 4, 1, 12, PAL.stoneLight);
  // cross engraving
  rect(ctx, 7, 7, 2, 6, PAL.stoneDark);
  rect(ctx, 5, 9, 6, 2, PAL.stoneDark);
  return canvas;
}

function tombMarble(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(1, 19, 14, 1);
  rect(ctx, 1, 16, 14, 3, PAL.marbleDark);
  rect(ctx, 1, 17, 14, 1, PAL.marble);
  // slab
  rect(ctx, 3, 3, 10, 13, PAL.marble);
  rect(ctx, 3, 3, 1, 13, PAL.marbleDark);
  rect(ctx, 3, 3, 10, 1, PAL.marbleDark);
  // arched top
  rect(ctx, 4, 2, 8, 1, PAL.marble);
  rect(ctx, 5, 1, 6, 1, PAL.marble);
  rect(ctx, 6, 0, 4, 1, PAL.marble);
  // veins
  px(ctx, 6, 6, PAL.marbleDark);
  px(ctx, 7, 7, PAL.marbleDark);
  px(ctx, 8, 8, PAL.marbleDark);
  px(ctx, 9, 9, PAL.marbleDark);
  // cross
  rect(ctx, 7, 6, 2, 7, PAL.marbleDark);
  rect(ctx, 5, 8, 6, 2, PAL.marbleDark);
  return canvas;
}

function tombObelisk(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 19, 12, 1);
  // base
  rect(ctx, 2, 16, 12, 3, PAL.graniteDark);
  rect(ctx, 3, 15, 10, 1, PAL.granite);
  rect(ctx, 3, 14, 10, 1, PAL.graniteDark);
  // shaft
  rect(ctx, 6, 3, 4, 12, PAL.granite);
  rect(ctx, 6, 3, 1, 12, PAL.graniteDark);
  rect(ctx, 9, 3, 1, 12, "#2a2c34");
  // pyramid cap
  rect(ctx, 6, 2, 4, 1, PAL.granite);
  rect(ctx, 7, 1, 2, 1, PAL.granite);
  px(ctx, 7, 0, PAL.gold);
  px(ctx, 8, 0, PAL.gold);
  // engravings
  for (let y = 5; y < 14; y += 2) px(ctx, 7, y, PAL.graniteDark);
  return canvas;
}

// ---------- Flowers (10x10) ----------

function flower(color: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(10, 10);
  // stem
  rect(ctx, 4, 4, 1, 5, PAL.leafDark);
  rect(ctx, 5, 4, 1, 5, PAL.leaf);
  // leaves
  rect(ctx, 2, 6, 2, 1, PAL.leaf);
  rect(ctx, 6, 7, 2, 1, PAL.leaf);
  // petals (5)
  px(ctx, 4, 1, color); px(ctx, 5, 1, color);
  px(ctx, 3, 2, color); px(ctx, 6, 2, color);
  px(ctx, 2, 3, color); px(ctx, 7, 3, color);
  px(ctx, 3, 4, color); px(ctx, 6, 4, color);
  px(ctx, 4, 3, PAL.gold); px(ctx, 5, 3, PAL.gold);
  return canvas;
}

// ---------- Fence (16x8) drawn along bottom edge ----------

function fenceWood(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 8);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(0, 7, 16, 1);
  // horizontal rail
  rect(ctx, 0, 3, 16, 1, PAL.wood);
  rect(ctx, 0, 4, 16, 1, PAL.woodDark);
  // pickets
  for (let x = 1; x < 16; x += 3) {
    rect(ctx, x, 0, 1, 7, PAL.wood);
    px(ctx, x, 0, PAL.woodLight);
  }
  return canvas;
}

function fenceIron(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 8);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(0, 7, 16, 1);
  rect(ctx, 0, 3, 16, 1, PAL.iron);
  rect(ctx, 0, 5, 16, 1, PAL.iron);
  for (let x = 1; x < 16; x += 2) {
    rect(ctx, x, 0, 1, 7, PAL.iron);
    px(ctx, x, 0, PAL.ironDark);
    px(ctx, x, 1, PAL.brass);
  }
  return canvas;
}

// ---------- Lanterns (8x14) ----------

function lanternOil(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(8, 14);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 13, 4, 1);
  // post
  rect(ctx, 3, 5, 2, 8, PAL.woodDark);
  // lamp box
  rect(ctx, 1, 1, 6, 4, PAL.iron);
  rect(ctx, 2, 2, 4, 2, PAL.flame);
  px(ctx, 3, 2, PAL.flameCore);
  px(ctx, 4, 2, PAL.flameCore);
  // top
  rect(ctx, 2, 0, 4, 1, PAL.iron);
  return canvas;
}

function lanternBrass(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(8, 14);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 13, 4, 1);
  rect(ctx, 3, 5, 2, 8, PAL.brassDark);
  rect(ctx, 1, 1, 6, 4, PAL.brass);
  rect(ctx, 2, 2, 4, 2, PAL.flameCore);
  rect(ctx, 2, 0, 4, 1, PAL.brassDark);
  // glow
  ctx.fillStyle = "rgba(255,201,77,0.25)";
  ctx.beginPath(); ctx.arc(4, 3, 5, 0, Math.PI * 2); ctx.fill();
  return canvas;
}

function statueAngel(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(14, 20);
  ctx.fillStyle = PAL.shadow; ctx.fillRect(2, 19, 10, 1);
  // pedestal
  rect(ctx, 2, 16, 10, 3, PAL.marbleDark);
  rect(ctx, 3, 15, 8, 1, PAL.marble);
  // body
  rect(ctx, 5, 9, 4, 7, PAL.marble);
  // head
  rect(ctx, 5, 5, 4, 4, PAL.marble);
  // halo
  rect(ctx, 5, 4, 4, 1, PAL.gold);
  // wings
  rect(ctx, 2, 9, 3, 4, PAL.marble);
  rect(ctx, 9, 9, 3, 4, PAL.marble);
  rect(ctx, 2, 9, 1, 4, PAL.marbleDark);
  rect(ctx, 11, 9, 1, 4, PAL.marbleDark);
  return canvas;
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

// ---------- Registration ----------

export function generateAllTextures(scene: Phaser.Scene) {
  // Terrain
  register(scene, "tile_grass_0", tileGrass(1));
  register(scene, "tile_grass_1", tileGrass(7));
  register(scene, "tile_grass_2", tileGrass(23));
  register(scene, "tile_dirt", tileDirt());
  register(scene, "tile_hole", tileHole());
  register(scene, "tile_plot", tilePlot());
  register(scene, "tile_path", tilePath());

  // Characters
  register(scene, "player", playerSprite());
  register(scene, "cat", catSprite());
  register(scene, "crystal", crystalSprite());

  // Items by sprite key declared in catalog.
  register(scene, "tomb_wood", tombWood());
  register(scene, "tomb_stone", tombStone());
  register(scene, "tomb_marble", tombMarble());
  register(scene, "tomb_obelisk", tombObelisk());

  register(scene, "flower_white", flower(PAL.petalWhite));
  register(scene, "flower_red", flower(PAL.petalRed));
  register(scene, "flower_yellow", flower(PAL.petalYellow));
  register(scene, "flower_purple", flower(PAL.petalPurple));

  register(scene, "fence_wood", fenceWood());
  register(scene, "fence_iron", fenceIron());

  register(scene, "lantern_oil", lanternOil());
  register(scene, "lantern_brass", lanternBrass());

  register(scene, "statue_angel", statueAngel());

  // Preallocate a pool of client portraits (deterministic seeds).
  for (let i = 0; i < 8; i++) {
    register(scene, `portrait_m_${i}`, clientPortrait("m", i * 13 + 1));
    register(scene, `portrait_f_${i}`, clientPortrait("f", i * 17 + 3));
  }
}

export function portraitKey(gender: "m" | "f", seedIdx: number): string {
  return `portrait_${gender}_${Math.abs(seedIdx) % 8}`;
}
