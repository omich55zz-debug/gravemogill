import Phaser from "phaser";

/**
 * Building upgrade system.
 *
 * Two upgrade tracks are exposed: "chapel" and "crypt". Each ticks through
 * three tiers (1, 2, 3). Tier 1 is the default state. Upgrading is a one-shot
 * gold expense that grants permanent bonuses applied to economy, luxury, and
 * reputation gain.
 */

export type BuildingKind = "chapel" | "crypt";
export type BuildingTier = 1 | 2 | 3;

export interface TierSpec {
  tier: BuildingTier;
  name: string;
  /** Cost to UPGRADE TO this tier (0 for tier 1). */
  cost: number;
  /** Daily passive income added per building of this tier. */
  dailyIncome: number;
  /** Multiplicative payout boost on order completion. */
  payoutBonus: number;
  /** Extra reputation per completed order. */
  repPerOrder: number;
  /** Mesh registry key used by ThreeWorld. */
  meshKey: string;
}

export const CHAPEL_TIERS: Record<BuildingTier, TierSpec> = {
  1: { tier: 1, name: "Часовня",          cost: 0,    dailyIncome: 5,  payoutBonus: 0.00, repPerOrder: 0, meshKey: "build_chapel" },
  2: { tier: 2, name: "Большая часовня",  cost: 1200, dailyIncome: 12, payoutBonus: 0.04, repPerOrder: 0, meshKey: "build_chapel_grand" },
  3: { tier: 3, name: "Собор",            cost: 3500, dailyIncome: 28, payoutBonus: 0.08, repPerOrder: 1, meshKey: "build_cathedral" },
};

export const CRYPT_TIERS: Record<BuildingTier, TierSpec> = {
  1: { tier: 1, name: "Склеп",          cost: 0,    dailyIncome: 2,  payoutBonus: 0.00, repPerOrder: 0, meshKey: "build_crypt" },
  2: { tier: 2, name: "Резной склеп",   cost: 700,  dailyIncome: 6,  payoutBonus: 0.02, repPerOrder: 0, meshKey: "build_crypt_ornate" },
  3: { tier: 3, name: "Гранд-мавзолей", cost: 2200, dailyIncome: 14, payoutBonus: 0.05, repPerOrder: 1, meshKey: "build_mausoleum_grand" },
};

export function tiersFor(kind: BuildingKind): Record<BuildingTier, TierSpec> {
  return kind === "chapel" ? CHAPEL_TIERS : CRYPT_TIERS;
}

export interface BuildingSlot {
  kind: BuildingKind;
  col: number;
  row: number;
  tier: BuildingTier;
}

/**
 * Tracks all upgradable buildings on the map plus aggregate bonuses.
 * Pre-placed buildings (chapel + 4 crypts) register themselves at scene boot.
 */
export class Buildings extends Phaser.Events.EventEmitter {
  slots: BuildingSlot[] = [];

  register(kind: BuildingKind, col: number, row: number, tier: BuildingTier = 1) {
    this.slots.push({ kind, col, row, tier });
  }

  findAt(col: number, row: number): BuildingSlot | undefined {
    return this.slots.find(s => s.col === col && s.row === row);
  }

  /** Find a slot whose footprint covers (col, row) within `radius` (manhattan). */
  findNear(col: number, row: number, radius: number = 2): BuildingSlot | undefined {
    return this.slots.find(s =>
      Math.abs(s.col - col) <= radius && Math.abs(s.row - row) <= radius
    );
  }

  upgrade(slot: BuildingSlot): { success: boolean; nextTier?: BuildingTier; cost: number } {
    if (slot.tier >= 3) return { success: false, cost: 0 };
    const next = (slot.tier + 1) as BuildingTier;
    const spec = tiersFor(slot.kind)[next];
    slot.tier = next;
    this.emit("upgraded", slot);
    return { success: true, nextTier: next, cost: spec.cost };
  }

  /** Sum of dailyIncome across all owned buildings. */
  totalDailyIncome(): number {
    return this.slots.reduce((sum, s) => sum + tiersFor(s.kind)[s.tier].dailyIncome, 0);
  }

  /** Aggregate payout bonus (sum across all buildings, capped at +50%). */
  aggregatePayoutBonus(): number {
    const total = this.slots.reduce((sum, s) => sum + tiersFor(s.kind)[s.tier].payoutBonus, 0);
    return Math.min(0.5, total);
  }

  /** Aggregate reputation bonus per completed order. */
  aggregateRepBonus(): number {
    return this.slots.reduce((sum, s) => sum + tiersFor(s.kind)[s.tier].repPerOrder, 0);
  }

  toJSON(): { tiers: { col: number; row: number; tier: BuildingTier }[] } {
    return { tiers: this.slots.map(s => ({ col: s.col, row: s.row, tier: s.tier })) };
  }

  load(state: { tiers?: { col: number; row: number; tier: BuildingTier }[] }) {
    if (!state?.tiers) return;
    for (const t of state.tiers) {
      const slot = this.findAt(t.col, t.row);
      if (slot && t.tier >= 1 && t.tier <= 3) {
        slot.tier = t.tier as BuildingTier;
      }
    }
  }
}

export const buildings = new Buildings();
