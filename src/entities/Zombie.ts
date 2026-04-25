import Phaser from "phaser";
import { WORLD_W, WORLD_H } from "../data/config";

/**
 * A wandering zombie that rises from a completed grave at night.
 * Auto-despawns after a lifetime, or when the player hits it (dispel).
 */
export class Zombie extends Phaser.Events.EventEmitter {
  sprite: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  private targetX: number;
  private targetY: number;
  private speed = 14;
  private lifetime: number; // ms remaining before auto-despawn
  private emergeT = 0;
  private readonly emergeDuration = 900; // ms to rise out of the ground
  private nextGroan = 0;
  public dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super();
    this.scene = scene;
    this.sprite = scene.add.image(x, y, "zombie")
      .setOrigin(0.5, 0.9)
      .setDepth(y + 5);
    // Start at alpha 0, with a small "emerge" sprite offset so it looks like
    // the zombie is pushing up out of the earth.
    this.sprite.setAlpha(0);
    this.sprite.y += 4;
    this.targetX = x;
    this.targetY = y;
    this.lifetime = Phaser.Math.Between(10000, 20000);
  }

  update(dt: number, playerX: number, playerY: number) {
    if (this.dead) return;

    // Emerge animation
    if (this.emergeT < this.emergeDuration) {
      this.emergeT += dt * 1000;
      const p = Math.min(1, this.emergeT / this.emergeDuration);
      this.sprite.setAlpha(p);
      this.sprite.y = this.targetY + 4 - 4 * p; // rise by 4px
      return;
    }

    // Shamble towards a moving target — occasionally meander.
    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) {
      // 50% of the time stagger towards the player, 50% wander.
      if (Math.random() < 0.5) {
        this.targetX = Phaser.Math.Clamp(playerX + Phaser.Math.Between(-30, 30), 8, WORLD_W - 8);
        this.targetY = Phaser.Math.Clamp(playerY + Phaser.Math.Between(-20, 20), 8, WORLD_H - 8);
      } else {
        this.targetX = Phaser.Math.Clamp(this.sprite.x + Phaser.Math.Between(-32, 32), 8, WORLD_W - 8);
        this.targetY = Phaser.Math.Clamp(this.sprite.y + Phaser.Math.Between(-16, 16), 8, WORLD_H - 8);
      }
    } else {
      // Sway slightly side-to-side while walking for shamble effect.
      const sway = Math.sin(performance.now() / 250) * 0.6;
      this.sprite.x += (dx / d) * this.speed * dt + sway * dt;
      this.sprite.y += (dy / d) * this.speed * dt;
      if (dx < -0.5) this.sprite.setFlipX(false);
      else if (dx > 0.5) this.sprite.setFlipX(true);
    }

    // Depth sort so it occludes correctly.
    this.sprite.setDepth(this.sprite.y + 5);

    // Groan occasionally.
    this.nextGroan -= dt * 1000;
    if (this.nextGroan <= 0) {
      this.nextGroan = Phaser.Math.Between(3000, 6000);
      this.groan();
    }

    // Countdown to auto-despawn.
    this.lifetime -= dt * 1000;
    if (this.lifetime <= 0) {
      this.dispel(false);
    }
  }

  /** Returns distance from this zombie to a point. */
  distanceTo(x: number, y: number): number {
    return Math.hypot(this.sprite.x - x, this.sprite.y - y);
  }

  /**
   * Destroy this zombie with a puff of dust. `byPlayer` signals whether the
   * player struck it (awards coins) or it simply crumbled.
   */
  dispel(byPlayer: boolean) {
    if (this.dead) return;
    this.dead = true;
    const x = this.sprite.x;
    const y = this.sprite.y - 6;
    // Puff particles: gray circles expanding and fading.
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const p = this.scene.add.circle(x, y, 2, 0x888888, 0.9).setDepth(9999);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 14,
        y: y + Math.sin(angle) * 10 - 2,
        alpha: 0,
        scale: 0.4,
        duration: 500,
        ease: "Quad.Out",
        onComplete: () => p.destroy(),
      });
    }
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      y: this.sprite.y + 2,
      duration: 280,
      onComplete: () => this.sprite.destroy(),
    });
    this.emit("dispelled", byPlayer, x, y);
  }

  private groan() {
    const text = Math.random() < 0.5 ? "Ууу…" : "Мозг…";
    const bubble = this.scene.add.text(this.sprite.x, this.sprite.y - 16, text, {
      fontFamily: "serif", fontSize: "6px", color: "#d0ffd0",
      backgroundColor: "#10160e",
      padding: { x: 2, y: 1 },
      stroke: "#000", strokeThickness: 1,
    }).setOrigin(0.5, 1).setDepth(2000).setResolution(4);
    this.scene.tweens.add({
      targets: bubble,
      y: bubble.y - 6,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: () => bubble.destroy(),
    });
  }
}
