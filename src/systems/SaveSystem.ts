// Save/load the whole game state to localStorage.
// One slot ("gravemogill.save.v1"). Versioned so future changes can migrate.
//
// A full save contains: economy, time (day/hour/accum), every grid cell's
// terrain + grave, all orders (pending/active/history), order id counter.
//
// Everything else (progress, achievements, daily streak, tutorial hints) is
// already persisted separately by their respective systems and is intentionally
// NOT part of the save — those are "meta" and should carry across new games.

import type { Cell, TerrainKind } from "../utils/grid";
import type { Economy } from "./Economy";
import type { TimeSystem } from "./TimeSystem";
import { OrderSystem, type Order } from "./OrderSystem";
import type { Grid } from "../utils/grid";
import { reputation } from "./Reputation";
import { buildings } from "./Buildings";
import type { BuildingTier } from "./Buildings";

const KEY = "gravemogill.save.v1";

interface CellSnap {
  c: number;
  r: number;
  t: TerrainKind;
  g?: {
    tombstoneId?: string;
    decorations: string[];
    fence?: string;
    inscription?: string;
    orderId?: string;
    completed?: boolean;
  };
}

interface SaveData {
  v: 1;
  savedAtMs: number;
  money: number;
  day: number;
  hour: number;
  accum: number;
  playerX?: number;
  playerY?: number;
  cells: CellSnap[];
  pending: Order[];
  active: Order[];
  history: Order[];
  reputation?: number;
  buildings?: { tiers: { col: number; row: number; tier: BuildingTier }[] };
  expansionStage?: number;
}

export function hasSave(): boolean {
  try { return localStorage.getItem(KEY) != null; }
  catch { return false; }
}

export function deleteSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    if (!parsed || parsed.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGame(state: {
  economy: Economy;
  time: TimeSystem;
  orders: OrderSystem;
  grid: Grid;
  playerX?: number;
  playerY?: number;
}) {
  try {
    const cells: CellSnap[] = [];
    for (const row of state.grid.cells) {
      for (const cell of row) {
        // Only record cells that differ from the default "grass" state or
        // have a grave. Keeps the save tiny.
        const isDefault = cell.terrain === "grass" && !cell.grave;
        if (isDefault) continue;
        cells.push(cellToSnap(cell));
      }
    }
    const data: SaveData = {
      v: 1,
      savedAtMs: Date.now(),
      money: state.economy.money,
      day: state.time.day,
      hour: state.time.hour,
      // `accum` lives on the TimeSystem — read via `any` because it's private.
      accum: (state.time as unknown as { accum: number }).accum ?? 0,
      playerX: state.playerX,
      playerY: state.playerY,
      cells,
      pending: state.orders.pending,
      active: state.orders.active,
      history: state.orders.history,
      reputation: reputation.points,
      buildings: buildings.toJSON(),
      expansionStage: state.grid.expansionStage,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or disabled storage — silently ignore. Game still works.
  }
}

function cellToSnap(c: Cell): CellSnap {
  const snap: CellSnap = { c: c.col, r: c.row, t: c.terrain };
  if (c.grave) {
    snap.g = {
      tombstoneId: c.grave.tombstoneId,
      decorations: [...c.grave.decorations],
      fence: c.grave.fence,
      inscription: c.grave.inscription,
      orderId: c.grave.orderId,
      completed: c.grave.completed,
    };
  }
  return snap;
}

export interface LoadResult {
  money: number;
  day: number;
  hour: number;
  accum: number;
  cells: CellSnap[];
  pending: Order[];
  active: Order[];
  history: Order[];
  playerX?: number;
  playerY?: number;
  savedAtMs: number;
  reputation?: number;
  buildings?: { tiers: { col: number; row: number; tier: BuildingTier }[] };
  expansionStage?: number;
}

export function loadIntoLoadResult(): LoadResult | null {
  const s = readSave();
  if (!s) return null;
  return s;
}

/** Returns a short "x minutes ago / now" string for UI labels. */
export function saveAgeLabel(savedAtMs: number): string {
  const now = Date.now();
  const ms = Math.max(0, now - savedAtMs);
  if (ms < 60_000) return "только что";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  return `${days} д назад`;
}
