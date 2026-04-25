export const CONFIG = {
  // Logical pixel grid. Kept for game logic (costs, rewards, etc.).
  TILE: 16,
  UPSCALE: 2,
  // World size in tiles.
  COLS: 28,
  ROWS: 20,
  // Isometric tile footprint (diamond). 2:1 ratio, classic iso.
  // Centres are spaced by ISO_W/2 horizontally and ISO_H/2 vertically.
  ISO_W: 32,
  ISO_H: 16,
  // Day length (ms) — one in-game day.
  DAY_MS: 90_000,
  STARTING_MONEY: 400,
  // Cost to dig a plot (consumable like tool wear + effort).
  DIG_COST: 10,
  // Path piece cost / daily income.
  PATH_COST: 8,
  PATH_INCOME_PER_DAY: 2,
  // Cat crystal rewards.
  CRYSTAL_MIN: 25,
  CRYSTAL_MAX: 75,
  CRYSTAL_SPAWN_EVERY_MS: 20_000,
} as const;

export const TILE_PX = CONFIG.TILE;

// Iso world bounds in logical pixels.
// Top-of-diamond for cell (0,0) is at (OFFSET_X, 0). Down-most tip is at
// (col=COLS-1,row=ROWS-1). Max screen x is at (col=COLS-1,row=0), min at (0,ROWS-1).
export const OFFSET_X = (CONFIG.ROWS - 1) * (CONFIG.ISO_W / 2) + CONFIG.ISO_W / 2;
export const WORLD_W = (CONFIG.COLS + CONFIG.ROWS) * (CONFIG.ISO_W / 2);
export const WORLD_H = (CONFIG.COLS + CONFIG.ROWS) * (CONFIG.ISO_H / 2) + CONFIG.ISO_H;

/** Convert (col,row) tile index to iso logical pixel world position (centre of tile). */
export function tileToIso(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (CONFIG.ISO_W / 2) + OFFSET_X,
    y: (col + row) * (CONFIG.ISO_H / 2) + CONFIG.ISO_H / 2,
  };
}

/** Inverse: iso logical pixel to (col,row). Returns fractional tile coords. */
export function isoToTile(x: number, y: number): { col: number; row: number } {
  const ix = x - OFFSET_X;
  const iy = y - CONFIG.ISO_H / 2;
  const col = (ix / (CONFIG.ISO_W / 2) + iy / (CONFIG.ISO_H / 2)) / 2;
  const row = (iy / (CONFIG.ISO_H / 2) - ix / (CONFIG.ISO_W / 2)) / 2;
  return { col, row };
}
