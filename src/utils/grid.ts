import { CONFIG, tileToIso, isoToTile } from "../data/config";

export type TerrainKind = "grass" | "plot" | "hole" | "path";

export interface GraveData {
  tombstoneId?: string;
  decorations: string[]; // item ids (flowers/lanterns/statues)
  fence?: string;
  inscription?: string;
  orderId?: string;     // set when linked to an order
  completed?: boolean;
}

export interface Cell {
  col: number;
  row: number;
  terrain: TerrainKind;
  grave?: GraveData;
}

/**
 * Achievement-gated cemetery expansion. Each batch is a list of (col,row)
 * cells that flip from grass → plot when the player earns enough achievements
 * to unlock the next stage. Cells are chosen to avoid existing buildings,
 * paths, and the starter plot rows.
 *
 * Tuning: 31 achievements total, so ~3 unlocks per batch on average.
 */
export const EXPANSION_BATCHES: Array<Array<[number, number]>> = [
  // Front edge of the cemetery — between chapel and gate.
  [[3, 4], [10, 4], [15, 4], [24, 4], [30, 4], [35, 4]],
  // Back edge — past the lower crypt row.
  [[3, 29], [10, 29], [15, 29], [24, 29], [30, 29], [35, 29]],
  // Gap row 9 (between plot rows 8 and 10).
  [[5, 9], [10, 9], [15, 9], [24, 9], [30, 9], [35, 9]],
  // Gap row 13.
  [[5, 13], [10, 13], [15, 13], [24, 13], [30, 13], [35, 13]],
  // Gap row 17 (skip cols 4 and 36 — mausoleums there).
  [[5, 17], [10, 17], [14, 17], [26, 17], [30, 17], [35, 17]],
  // Gap row 21.
  [[5, 21], [10, 21], [15, 21], [24, 21], [30, 21], [35, 21]],
  // Row 24 fillers (skip crypt cols 8, 24, 32).
  [[3, 24], [6, 24], [12, 24], [18, 24], [22, 24], [35, 24]],
  // Row 26 fillers.
  [[3, 26], [6, 26], [12, 26], [18, 26], [22, 26], [35, 26]],
  // Outermost columns in starter plot rows (left side).
  [[2, 8], [2, 12], [2, 16], [2, 20], [2, 25]],
  // Outermost columns (right side).
  [[37, 8], [37, 12], [37, 16], [37, 20], [37, 25]],
];

export class Grid {
  cells: Cell[][];
  /** How many EXPANSION_BATCHES have been applied. Persisted in save. */
  expansionStage = 0;

  constructor() {
    this.cells = [];
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < CONFIG.COLS; c++) {
        row.push({ col: c, row: r, terrain: "grass" });
      }
      this.cells.push(row);
    }
    this.seedPlots();
  }

  /**
   * Apply the next expansion batch. Returns the list of cells that became
   * plots (skipping any already-non-grass tiles, which can happen if a save
   * had different layout). Caller is responsible for refreshing visuals.
   */
  applyNextExpansion(): Array<{ col: number; row: number }> {
    const batch = EXPANSION_BATCHES[this.expansionStage];
    if (!batch) return [];
    this.expansionStage++;
    const added: Array<{ col: number; row: number }> = [];
    for (const [c, r] of batch) {
      const cell = this.cells[r]?.[c];
      if (!cell) continue;
      if (cell.terrain !== "grass") continue;
      cell.terrain = "plot";
      added.push({ col: c, row: r });
    }
    return added;
  }

  /** Re-apply N expansions in one go (used during save restoration). */
  fastForwardExpansions(toStage: number): void {
    while (this.expansionStage < toStage) {
      const before = this.expansionStage;
      this.applyNextExpansion();
      if (this.expansionStage === before) break; // out of batches
    }
  }

  /** Number of remaining locked batches (for HUD progress). */
  remainingExpansions(): number {
    return Math.max(0, EXPANSION_BATCHES.length - this.expansionStage);
  }

  private seedPlots() {
    // Necropolis layout for a 40×30 map.
    //
    // Top of map (rows 0–6): chapel + gate area (kept mostly open grass,
    // decorated by GameScene's placeNecropolisStructures()).
    //
    // Middle of map (rows 8–22): main grave field. Every second row is a
    // plot row. A vertical aisle runs along columns 19–20 (grass → paths).
    //
    // Bottom of map (rows 24–28): outer ring of plots + scattered crypts.
    const plotRows = [8, 10, 12, 14, 16, 18, 20, 22, 25, 27];
    for (const r of plotRows) {
      for (let c = 3; c <= 36; c++) {
        if (c === 19 || c === 20) continue; // central aisle
        this.cells[r][c].terrain = "plot";
      }
    }
    // Pre-paved stone paths along the central aisle and the cross-aisle (row 15).
    for (let r = 6; r <= 28; r++) {
      this.cells[r][19].terrain = "path";
      this.cells[r][20].terrain = "path";
    }
    for (let c = 4; c <= 35; c++) {
      if (c === 19 || c === 20) continue;
      this.cells[15][c].terrain = "path";
    }
  }

  at(col: number, row: number): Cell | undefined {
    if (col < 0 || col >= CONFIG.COLS || row < 0 || row >= CONFIG.ROWS) return undefined;
    return this.cells[row][col];
  }

  worldToTile(wx: number, wy: number): { col: number; row: number } {
    const { col, row } = isoToTile(wx, wy);
    return { col: Math.floor(col + 0.5), row: Math.floor(row + 0.5) };
  }

  tileToWorldCenter(col: number, row: number): { x: number; y: number } {
    return tileToIso(col, row);
  }
}
