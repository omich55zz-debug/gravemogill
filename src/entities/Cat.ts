import Phaser from "phaser";
import { CONFIG, WORLD_W, WORLD_H } from "../data/config";

/** Autonomous cat companion. Wanders, periodically spawns a crystal that player can collect. */
export class Cat extends Phaser.Events.EventEmitter {
  sprite: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  private targetX: number;
  private targetY: number;
  private speed = 40;
  private crystalTimer = 0;
  private crystal?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super();
    this.scene = scene;
    this.sprite = scene.add.image(x, y, "cat").setOrigin(0.5, 0.9).setDepth(0);
    this.targetX = x;
    this.targetY = y;
  }

  update(dt: number, playerX: number, playerY: number) {
    // Move towards target, pick a new one when close.
    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) {
      // Occasionally follow the player, otherwise wander near the crystal or random.
      if (this.crystal) {
        this.targetX = this.crystal.x;
        this.targetY = this.crystal.y + 6;
      } else if (Math.random() < 0.3) {
        this.targetX = Phaser.Math.Clamp(playerX + Phaser.Math.Between(-30, 30), 8, WORLD_W - 8);
        this.targetY = Phaser.Math.Clamp(playerY + Phaser.Math.Between(-20, 20), 8, WORLD_H - 8);
      } else {
        this.targetX = Phaser.Math.Between(16, WORLD_W - 16);
        this.targetY = Phaser.Math.Between(16, WORLD_H - 16);
      }
    } else {
      this.sprite.x += (dx / d) * this.speed * dt;
      this.sprite.y += (dy / d) * this.speed * dt;
      if (dx < -0.5) this.sprite.setFlipX(false);
      else if (dx > 0.5) this.sprite.setFlipX(true);
    }

    this.crystalTimer += dt * 1000;
    if (!this.crystal && this.crystalTimer > CONFIG.CRYSTAL_SPAWN_EVERY_MS) {
      this.crystalTimer = 0;
      this.spawnCrystal();
    }

    if (this.crystal) {
      // subtle bobbing
      this.crystal.y += Math.sin(performance.now() / 300) * 0.05;
      // Check player pickup
      const pd = Math.hypot(this.crystal.x - playerX, this.crystal.y - playerY);
      if (pd < 12) {
        const value = Phaser.Math.Between(CONFIG.CRYSTAL_MIN, CONFIG.CRYSTAL_MAX);
        this.emit("crystalCollected", value, this.crystal.x, this.crystal.y);
        this.crystal.destroy();
        this.crystal = undefined;
      }
    }
  }

  private spawnCrystal() {
    // Place near the cat's current position, within world bounds.
    const cx = Phaser.Math.Clamp(this.sprite.x + Phaser.Math.Between(-8, 8), 8, WORLD_W - 8);
    const cy = Phaser.Math.Clamp(this.sprite.y + Phaser.Math.Between(-4, 12), 8, WORLD_H - 8);
    this.crystal = this.scene.add.image(cx, cy, "crystal").setOrigin(0.5, 0.85).setDepth(0.5);
    this.scene.tweens.add({
      targets: this.crystal,
      scaleX: { from: 0, to: 1 },
      scaleY: { from: 0, to: 1 },
      duration: 300,
      ease: "Back.Out",
    });
    this.emit("crystalSpawned", this.crystal.x, this.crystal.y);
  }
}
