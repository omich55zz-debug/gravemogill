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
  // 16x20 — front-facing gravedigger. Mr. Korolev.
  const { canvas, ctx } = makeCanvas(16, 20);
  // shadow
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(8, 19, 5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // legs
  rect(ctx, 5, 15, 2, 4, PAL.graniteDark);
  rect(ctx, 9, 15, 2, 4, PAL.graniteDark);
  // coat
  rect(ctx, 3, 8, 10, 8, PAL.coat);
  // coat highlights
  rect(ctx, 4, 9, 1, 6, "#3a3a45");
  // buttons
  px(ctx, 8, 10, PAL.brass);
  px(ctx, 8, 13, PAL.brass);
  // shirt collar
  rect(ctx, 7, 7, 2, 1, PAL.white);
  // head
  rect(ctx, 5, 3, 6, 5, PAL.skin);
  // hat (top hat-ish)
  rect(ctx, 4, 0, 8, 3, PAL.hat);
  rect(ctx, 3, 2, 10, 1, PAL.hat);
  // eyes
  px(ctx, 6, 5, PAL.eye);
  px(ctx, 9, 5, PAL.eye);
  // mustache
  rect(ctx, 6, 7, 4, 1, PAL.eye);
  return canvas;
}

function catSprite(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(14, 12);
  ctx.fillStyle = PAL.shadow;
  ctx.fillRect(2, 11, 10, 1);
  // body
  rect(ctx, 2, 6, 8, 4, PAL.catGrey);
  // head
  rect(ctx, 8, 4, 5, 4, PAL.catGrey);
  // ears
  px(ctx, 8, 3, PAL.catGrey);
  px(ctx, 12, 3, PAL.catGrey);
  // tail
  rect(ctx, 0, 5, 2, 1, PAL.catGrey);
  px(ctx, 0, 4, PAL.catGrey);
  // eyes
  px(ctx, 10, 5, "#e6e64a");
  px(ctx, 12, 5, "#e6e64a");
  // legs
  rect(ctx, 3, 10, 1, 2, PAL.catGreyDark);
  rect(ctx, 5, 10, 1, 2, PAL.catGreyDark);
  rect(ctx, 8, 10, 1, 2, PAL.catGreyDark);
  rect(ctx, 10, 10, 1, 2, PAL.catGreyDark);
  // nose
  px(ctx, 12, 6, "#d06070");
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
