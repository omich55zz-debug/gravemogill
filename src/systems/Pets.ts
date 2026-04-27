import Phaser from "phaser";

/**
 * Pet system — gravedigger companions.
 *
 * Each owned pet is a lightweight entity that follows the player and grants
 * a small passive. Purchased from the shop (PetsModal).
 */

export type PetId = "crow" | "goat" | "zombie_puppy";

export interface PetSpec {
  id: PetId;
  name: string;
  desc: string;
  /** Passive bonus description (shown in UI, applied via get*Multiplier). */
  bonus: string;
  cost: number;
  /** Phaser sprite key for the 2D icon + shadow companion. */
  sprite: string;
  /** 3D mesh factory key used by ThreeWorld.addPetMesh(). */
  meshKey: string;
  /** Emoji shown in shop cards / follow-bubble. */
  icon: string;
}

export const PET_SPECS: Record<PetId, PetSpec> = {
  crow: {
    id: "crow",
    name: "Ворон-казначей",
    desc: "Садится на плечи, теребит монеты из карманов горожан.",
    bonus: "+5% к оплате за каждый завершённый заказ.",
    cost: 1200,
    sprite: "pet_crow",
    meshKey: "pet_crow",
    icon: "🦅",
  },
  goat: {
    id: "goat",
    name: "Козёл Бафомет",
    desc: "Старый кладбищенский козёл. Копыта чеканят ритм работы.",
    bonus: "+10% к скорости передвижения Королёва.",
    cost: 1800,
    sprite: "pet_goat",
    meshKey: "pet_goat",
    icon: "🐐",
  },
  zombie_puppy: {
    id: "zombie_puppy",
    name: "Зомби-щенок Рекс",
    desc: "Верный нежить-щенок. Копает лапами быстрее лопаты.",
    bonus: "+15% к скорости копки могил.",
    cost: 2400,
    sprite: "pet_zombie_puppy",
    meshKey: "pet_zombie_puppy",
    icon: "🐕",
  },
};

export const ALL_PET_IDS: PetId[] = ["crow", "goat", "zombie_puppy"];

/**
 * Owned-pets registry. Persisted by SaveSystem.
 * Emits "changed" whenever the roster mutates.
 */
export class PetsSystem extends Phaser.Events.EventEmitter {
  private owned: Set<PetId> = new Set();

  has(id: PetId): boolean { return this.owned.has(id); }
  all(): PetId[] { return [...this.owned]; }
  count(): number { return this.owned.size; }

  buy(id: PetId): boolean {
    if (this.owned.has(id)) return false;
    this.owned.add(id);
    this.emit("changed", this.all());
    this.emit("bought", id);
    return true;
  }

  /** Overall money multiplier from owned pets (currently: crow +5%). */
  moneyMultiplier(): number {
    return this.has("crow") ? 1.05 : 1.0;
  }

  /** Player movement-speed multiplier (currently: goat +10%). */
  speedMultiplier(): number {
    return this.has("goat") ? 1.10 : 1.0;
  }

  /** Dig-speed multiplier (currently: zombie puppy +15%). */
  digMultiplier(): number {
    return this.has("zombie_puppy") ? 1.15 : 1.0;
  }

  toJSON(): PetId[] { return this.all(); }
  load(state: PetId[] | undefined) {
    this.owned.clear();
    if (!Array.isArray(state)) return;
    for (const id of state) {
      if (id === "crow" || id === "goat" || id === "zombie_puppy") {
        this.owned.add(id);
      }
    }
    this.emit("changed", this.all());
  }
}

export const pets = new PetsSystem();
