export const CONFIG = {
  // Logical pixel grid: each tile is 16 virtual pixels, upscaled 3x for visible pixel-art feel.
  TILE: 16,
  UPSCALE: 3,
  // World size in tiles.
  COLS: 28,
  ROWS: 20,
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
export const WORLD_W = CONFIG.COLS * CONFIG.TILE;
export const WORLD_H = CONFIG.ROWS * CONFIG.TILE;
