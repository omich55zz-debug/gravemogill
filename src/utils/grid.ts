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

export class Grid {
  cells: Cell[][];

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
