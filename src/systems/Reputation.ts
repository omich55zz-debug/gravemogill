import Phaser from "phaser";

/**
 * Reputation tracks the elf-mage's standing among the townsfolk who commission
 * burials. Points accrue from completed orders and lapse on failed ones.
 *
 * Each rank unlocks a flat payout multiplier and is shown in the HUD.
 */
export type Rank = {
  id: "novice" | "apprentice" | "master" | "magister" | "archmage";
  name: string;       // Russian localized name
  threshold: number;  // points required to reach this rank
  multiplier: number; // payout multiplier applied on order completion
};

export const RANKS: Rank[] = [
  { id: "novice",     name: "Новичок",            threshold:    0, multiplier: 1.00 },
  { id: "apprentice", name: "Подмастерье",        threshold:   30, multiplier: 1.05 },
  { id: "master",     name: "Мастер",             threshold:   90, multiplier: 1.10 },
  { id: "magister",   name: "Магистр некрополя",  threshold:  200, multiplier: 1.18 },
  { id: "archmage",   name: "Архимаг могил",      threshold:  400, multiplier: 1.28 },
];

export class Reputation extends Phaser.Events.EventEmitter {
  points = 0;

  /** Award reputation for a completed order. Higher difficulty = more points. */
  awardCompleted(orderTier: number = 1) {
    const gain = Math.max(2, Math.round(3 * orderTier));
    this.points += gain;
    this.emit("changed", this.points, gain, "completed");
  }

  /** Penalize for a failed order. */
  penalizeFailed(orderTier: number = 1) {
    const loss = Math.max(2, Math.round(2 * orderTier));
    this.points = Math.max(0, this.points - loss);
    this.emit("changed", this.points, -loss, "failed");
  }

  /** Bonus for "special" themed graves (Dream / Horror / Rich / Quiet). */
  awardSpecialGrave(themeId: string) {
    const gain = 5;
    this.points += gain;
    this.emit("changed", this.points, gain, `special:${themeId}`);
  }

  /** Current rank based on accumulated points. */
  rank(): Rank {
    let cur = RANKS[0];
    for (const r of RANKS) if (this.points >= r.threshold) cur = r;
    return cur;
  }

  /** Next rank (or null if already at max). */
  nextRank(): Rank | null {
    const cur = this.rank();
    const idx = RANKS.indexOf(cur);
    return idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  }

  /** Payout multiplier from current rank. */
  multiplier(): number {
    return this.rank().multiplier;
  }

  toJSON(): { points: number } {
    return { points: this.points };
  }

  load(state: { points?: number }) {
    if (typeof state?.points === "number") {
      this.points = Math.max(0, Math.floor(state.points));
    }
  }
}

/** Module-level singleton — used by Economy for payout multipliers and HUD. */
export const reputation = new Reputation();
