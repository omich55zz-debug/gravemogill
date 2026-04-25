import Phaser from "phaser";
import { CONFIG, WORLD_W, WORLD_H } from "../data/config";

const SPEECH = [
  "Мяу.", "Мрр…", "Мяу!", "Кхм…", "Нашёл!", "Блестит…", "Хвост!", "Ммм?",
  "Фырр…", "Птичка…", "Кормите!", "Рыба?", "Скучно.", "Погладь!",
];

/** Autonomous cat companion. Wanders, periodically spawns a crystal (occasionally rare). */
export class Cat extends Phaser.Events.EventEmitter {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  private scene: Phaser.Scene;
  private targetX: number;
  private targetY: number;
  private speed = 80;
  private crystalTimer = 0;
  private crystal?: Phaser.GameObjects.Image;
  private crystalIsRare = false;
  private speechTimer = 0;
  private speechCooldown = 9000 + Math.random() * 6000;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super();
    this.scene = scene;
    this.shadow = scene.add.ellipse(x, y + 2, 16, 6, 0x000000, 0.35).setDepth(-1);
    this.sprite = scene.add.image(x, y, "cat").setOrigin(0.5, 0.9).setDepth(0).setScale(1.6);
    this.targetX = x;
    this.targetY = y;
  }

  update(dt: number, playerX: number, playerY: number) {
    // Move towards target, pick a new one when close.
    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) {
      // When a crystal is out, rush to it. Otherwise split between:
      // - following the player (20%)
      // - hunting near the player (30%)
      // - random far wander (50%)
      if (this.crystal) {
        this.targetX = this.crystal.x;
        this.targetY = this.crystal.y + 6;
      } else {
        const r = Math.random();
        if (r < 0.2) {
          this.targetX = Phaser.Math.Clamp(playerX + Phaser.Math.Between(-20, 20), 8, WORLD_W - 8);
          this.targetY = Phaser.Math.Clamp(playerY + Phaser.Math.Between(-14, 14), 8, WORLD_H - 8);
        } else if (r < 0.5) {
          this.targetX = Phaser.Math.Clamp(playerX + Phaser.Math.Between(-60, 60), 8, WORLD_W - 8);
          this.targetY = Phaser.Math.Clamp(playerY + Phaser.Math.Between(-40, 40), 8, WORLD_H - 8);
        } else {
          this.targetX = Phaser.Math.Between(16, WORLD_W - 16);
          this.targetY = Phaser.Math.Between(16, WORLD_H - 16);
        }
      }
    } else {
      this.sprite.x += (dx / d) * this.speed * dt;
      this.sprite.y += (dy / d) * this.speed * dt;
      if (dx < -0.5) this.sprite.setFlipX(false);
      else if (dx > 0.5) this.sprite.setFlipX(true);
    }
    this.shadow.x = this.sprite.x;
    this.shadow.y = this.sprite.y + 1;
    this.shadow.setDepth(this.sprite.y - 0.1);

    this.crystalTimer += dt * 1000;
    // Speed up crystal hunt a little (was CONFIG.CRYSTAL_SPAWN_EVERY_MS).
    const interval = Math.max(8000, CONFIG.CRYSTAL_SPAWN_EVERY_MS * 0.8);
    if (!this.crystal && this.crystalTimer > interval) {
      this.crystalTimer = 0;
      this.spawnCrystal();
    }

    if (this.crystal) {
      // subtle bobbing
      this.crystal.y += Math.sin(performance.now() / 300) * 0.05;
      // Check player pickup
      const pd = Math.hypot(this.crystal.x - playerX, this.crystal.y - playerY);
      if (pd < 12) {
        const rare = this.crystalIsRare;
        const value = rare
          ? Phaser.Math.Between(100, 200)
          : Phaser.Math.Between(CONFIG.CRYSTAL_MIN, CONFIG.CRYSTAL_MAX);
        this.emit("crystalCollected", value, this.crystal.x, this.crystal.y, rare);
        this.crystal.destroy();
        this.crystal = undefined;
        this.crystalIsRare = false;
      }
    }

    // Random speech bubbles.
    this.speechTimer += dt * 1000;
    if (this.speechTimer > this.speechCooldown) {
      this.speechTimer = 0;
      this.speechCooldown = 9000 + Math.random() * 9000;
      this.sayRandom();
    }
  }

  private spawnCrystal() {
    // Place near the cat's current position, within world bounds.
    const cx = Phaser.Math.Clamp(this.sprite.x + Phaser.Math.Between(-8, 8), 8, WORLD_W - 8);
    const cy = Phaser.Math.Clamp(this.sprite.y + Phaser.Math.Between(-4, 12), 8, WORLD_H - 8);
    // 12% chance of a rare purple crystal; bigger payout, tinted sprite.
    this.crystalIsRare = Math.random() < 0.12;
    this.crystal = this.scene.add.image(cx, cy, "crystal").setOrigin(0.5, 0.85).setDepth(0.5);
    if (this.crystalIsRare) {
      this.crystal.setTint(0xc77cff);
      this.crystal.setScale(1.35);
    }
    this.scene.tweens.add({
      targets: this.crystal,
      scaleX: { from: 0, to: this.crystalIsRare ? 1.35 : 1 },
      scaleY: { from: 0, to: this.crystalIsRare ? 1.35 : 1 },
      duration: 300,
      ease: "Back.Out",
    });
    if (this.crystalIsRare) {
      // Halo ring for rare crystals.
      const halo = this.scene.add.circle(cx, cy - 2, 6, 0xc77cff, 0.35)
        .setDepth(0.49);
      this.scene.tweens.add({
        targets: halo, alpha: 0.1, scale: 1.5, duration: 900,
        yoyo: true, repeat: -1, ease: "Sine.InOut",
      });
      // Clean up halo when crystal goes away
      this.crystal.once("destroy", () => halo.destroy());
    }
    this.emit("crystalSpawned", this.crystal.x, this.crystal.y, this.crystalIsRare);
    // Cat 'says' something when it finds a crystal.
    this.say("Нашёл!");
  }

  private sayRandom() {
    const text = SPEECH[Math.floor(Math.random() * SPEECH.length)];
    this.say(text);
  }

  private say(text: string) {
    const bubble = this.scene.add.text(this.sprite.x, this.sprite.y - 14, text, {
      fontFamily: "serif", fontSize: "6px", color: "#ffffff",
      backgroundColor: "#111018",
      padding: { x: 2, y: 1 },
      stroke: "#000", strokeThickness: 1,
    }).setOrigin(0.5, 1).setDepth(2000).setResolution(4);
    this.scene.tweens.add({
      targets: bubble,
      y: bubble.y - 8,
      alpha: 0,
      delay: 900,
      duration: 600,
      ease: "Sine.Out",
      onComplete: () => bubble.destroy(),
    });
  }
}
