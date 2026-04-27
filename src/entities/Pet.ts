import Phaser from "phaser";
import type * as THREE from "three";
import type { PetId } from "../systems/Pets";
import { PET_SPECS } from "../systems/Pets";

/**
 * Lightweight follower entity — one per owned pet.
 *
 * Pets trail the player at a fixed offset that differs per pet so the
 * companions fan out instead of stacking. Updated from GameScene.update().
 */
export class Pet {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  mesh3D?: THREE.Object3D;
  id: PetId;
  facingYaw = 0;

  /** Desired offset (in world-px) from the player. */
  private offsetX: number;
  private offsetY: number;
  /** Base Y-bob offset so flying pets float at a different height. */
  private bobBase: number;

  constructor(scene: Phaser.Scene, id: PetId, playerX: number, playerY: number) {
    this.id = id;
    // Pet fan-out offsets — crow floats above-left, goat walks at right,
    // puppy trots behind. Randomized slightly so reloads feel organic.
    const slotByPet: Record<PetId, { x: number; y: number; bob: number }> = {
      crow:         { x: -18, y: -26, bob: 0.8 },
      goat:         { x:  22, y:   4, bob: 0.0 },
      zombie_puppy: { x:  -4, y:  16, bob: 0.0 },
    };
    const slot = slotByPet[id];
    this.offsetX = slot.x;
    this.offsetY = slot.y;
    this.bobBase = slot.bob;

    const spec = PET_SPECS[id];
    this.shadow = scene.add.ellipse(playerX, playerY + 2, 10, 4, 0x000000, 0.3).setDepth(-1);
    // Fall back to the cat texture if the per-pet sprite wasn't registered —
    // keeps the 2D layer alive on early launches before textures.ts wires up.
    const hasTex = scene.textures.exists(spec.sprite);
    this.sprite = scene.add.image(playerX, playerY, hasTex ? spec.sprite : "cat")
      .setOrigin(0.5, 0.9).setDepth(0).setScale(1.2);
  }

  update(dt: number, playerX: number, playerY: number, playerYaw: number) {
    // Move towards a point offset from the player in the player's facing direction.
    const yaw = playerYaw || 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const tx = playerX + cos * this.offsetX - sin * this.offsetY;
    const ty = playerY + sin * this.offsetX + cos * this.offsetY;
    const dx = tx - this.sprite.x, dy = ty - this.sprite.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      // Ease-in following feels more natural than a rigid rubber band.
      const follow = Math.min(1, dt * 6);
      this.sprite.x += dx * follow;
      this.sprite.y += dy * follow;
      if (dx < -0.5) this.sprite.setFlipX(false);
      else if (dx > 0.5) this.sprite.setFlipX(true);
      this.facingYaw = Math.atan2(dx, dy);
    }
    this.shadow.x = this.sprite.x;
    this.shadow.y = this.sprite.y + 1;
    this.shadow.setDepth(this.sprite.y - 0.1);
    // Floaty pets (crow) bob vertically — subtly animated sin wave.
    if (this.bobBase > 0) {
      const wobble = Math.sin(performance.now() * 0.004) * this.bobBase;
      this.sprite.y += wobble * 0.2; // visual-only, not mirrored on shadow
    }
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    if (this.mesh3D && (this.mesh3D as { parent?: unknown }).parent) {
      (this.mesh3D as THREE.Object3D).parent?.remove(this.mesh3D);
    }
  }
}
