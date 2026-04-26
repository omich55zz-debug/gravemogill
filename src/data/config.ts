export const CONFIG = {
  // Logical tile size (world pixels per cell).
  TILE: 32,
  // Default camera zoom (will be clamped against the viewport-fit logic).
  UPSCALE: 2.0,
  // World size in tiles. Grown vs. the old 28×20 so there's room for a proper
  // necropolis layout with chapel, mausoleums and blocks of pre-placed graves.
  COLS: 40,
  ROWS: 30,
  // Top-down square tile footprint (world pixels).
  ISO_W: 32,
  ISO_H: 32,
  // Day length (ms) — one in-game day.
  // The 16 waking game-hours (08:00 → 24:00) are mapped across this window;
  // night begins at 22:00 (= 14 hrs after dawn). Calibrated so dawn → night
  // is ~25 minutes of real time: DAY_MS * 14/16 ≈ 25 min ⇒ DAY_MS ≈ 28.6 min.
  DAY_MS: 1_714_000,
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

// World size in world pixels.
export const OFFSET_X = CONFIG.ISO_W / 2;
export const WORLD_W = CONFIG.COLS * CONFIG.ISO_W;
export const WORLD_H = CONFIG.ROWS * CONFIG.ISO_H;

/** Convert (col,row) tile index to world pixel position (centre of tile). */
export function tileToIso(col: number, row: number): { x: number; y: number } {
  return {
    x: col * CONFIG.ISO_W + CONFIG.ISO_W / 2,
    y: row * CONFIG.ISO_H + CONFIG.ISO_H / 2,
  };
}

/** Inverse: world pixel to (col,row). Returns fractional tile coords. */
export function isoToTile(x: number, y: number): { col: number; row: number } {
  return {
    col: (x - CONFIG.ISO_W / 2) / CONFIG.ISO_W,
    row: (y - CONFIG.ISO_H / 2) / CONFIG.ISO_H,
  };
}
