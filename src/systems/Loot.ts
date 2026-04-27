import Phaser from "phaser";
import { CATALOG, type CatalogItem, type Rarity, rarityOf } from "../data/catalog";

/**
 * Three-tier loot box system. Players buy chests (or earn them as quest
 * rewards) and open them for random items pulled from rarity-weighted tables.
 *
 * Gold chests have ~10x higher legendary drop chance than bronze — the
 * pricing curve matches that boost so whales can splurge, but grinders can
 * still progress.
 */
export type ChestTier = "bronze" | "silver" | "gold";

export interface ChestSpec {
  tier: ChestTier;
  name: string;
  cost: number;
  /** Drop weights per rarity — sum doesn't need to be 1; we sample proportionally. */
  weights: Record<Rarity, number>;
  /** Tint colour for UI glow + 3D materials. */
  color: number;
}

export const CHEST_SPECS: Record<ChestTier, ChestSpec> = {
  bronze: {
    tier: "bronze",
    name: "Бронзовый сундук",
    cost: 200,
    weights: { common: 80, rare: 18, epic: 2, legendary: 0.5 },
    color: 0xb07032,
  },
  silver: {
    tier: "silver",
    name: "Серебряный сундук",
    cost: 700,
    weights: { common: 50, rare: 35, epic: 12, legendary: 3 },
    color: 0xc9d4dc,
  },
  gold: {
    tier: "gold",
    name: "Золотой сундук",
    cost: 2000,
    weights: { common: 20, rare: 35, epic: 30, legendary: 15 },
    color: 0xffc45a,
  },
};

export interface Drop {
  item: CatalogItem;
  rarity: Rarity;
}

/** Player-owned inventory of unopened chests. */
export class LootSystem extends Phaser.Events.EventEmitter {
  /** Map of tier -> count. */
  private owned: Record<ChestTier, number> = { bronze: 0, silver: 0, gold: 0 };

  count(tier: ChestTier): number { return this.owned[tier]; }
  total(): number { return this.owned.bronze + this.owned.silver + this.owned.gold; }

  grant(tier: ChestTier, n = 1) {
    this.owned[tier] += n;
    this.emit("changed", { ...this.owned });
  }

  /** Try to open one chest of the given tier. Returns drops (3 items per chest). */
  open(tier: ChestTier): Drop[] | null {
    if (this.owned[tier] <= 0) return null;
    this.owned[tier]--;
    const spec = CHEST_SPECS[tier];
    const drops: Drop[] = [];
    const n = 3;
    for (let i = 0; i < n; i++) {
      drops.push(this.rollDrop(spec));
    }
    this.emit("changed", { ...this.owned });
    this.emit("opened", { tier, drops });
    return drops;
  }

  private rollDrop(spec: ChestSpec): Drop {
    // Weighted-random rarity pick.
    const keys: Rarity[] = ["common", "rare", "epic", "legendary"];
    const total = keys.reduce((a, k) => a + spec.weights[k], 0);
    let r = Math.random() * total;
    let rarity: Rarity = "common";
    for (const k of keys) {
      r -= spec.weights[k];
      if (r <= 0) { rarity = k; break; }
    }
    // Sample an item of that rarity. Fall back to common if pool empty.
    let pool = CATALOG.filter(i => rarityOf(i) === rarity);
    if (pool.length === 0) pool = CATALOG.filter(i => rarityOf(i) === "common");
    const item = pool[(Math.random() * pool.length) | 0];
    return { item, rarity };
  }

  toJSON() { return { ...this.owned }; }
  load(state: Partial<Record<ChestTier, number>>) {
    for (const k of ["bronze", "silver", "gold"] as ChestTier[]) {
      const n = state?.[k];
      if (typeof n === "number") this.owned[k] = Math.max(0, Math.floor(n));
    }
  }
}

/** Module-level singleton. */
export const loot = new LootSystem();
