import Phaser from "phaser";
import { CONFIG } from "../data/config";

export class Economy extends Phaser.Events.EventEmitter {
  money = CONFIG.STARTING_MONEY;

  canAfford(n: number) { return this.money >= n; }

  spend(n: number): boolean {
    if (this.money < n) return false;
    this.money -= n;
    this.emit("changed", this.money, -n);
    return true;
  }

  earn(n: number) {
    this.money += n;
    this.emit("changed", this.money, +n);
  }
}
