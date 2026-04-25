import { CONFIG } from "../data/config";

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
    // Reserve structured plot rows with a path spine in the middle.
    // Rows 3,5,7,9,11,13 are plot rows; columns 2..25 in pairs with gaps at 13,14 (central aisle).
    const plotRows = [3, 5, 7, 9, 11, 13, 15];
    for (const r of plotRows) {
      for (let c = 2; c <= 25; c++) {
        if (c === 13 || c === 14) continue;
        this.cells[r][c].terrain = "plot";
      }
    }
    // Central vertical aisle pre-painted grass (kept, paths optional by player).
  }

  at(col: number, row: number): Cell | undefined {
    if (col < 0 || col >= CONFIG.COLS || row < 0 || row >= CONFIG.ROWS) return undefined;
    return this.cells[row][col];
  }

  worldToTile(wx: number, wy: number): { col: number; row: number } {
    return { col: Math.floor(wx / CONFIG.TILE), row: Math.floor(wy / CONFIG.TILE) };
  }

  tileToWorldCenter(col: number, row: number): { x: number; y: number } {
    return { x: col * CONFIG.TILE + CONFIG.TILE / 2, y: row * CONFIG.TILE + CONFIG.TILE / 2 };
  }
}
