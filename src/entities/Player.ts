import Phaser from "phaser";
import type * as THREE from "three";

export class Player {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  /** Optional 3D mesh mirrored to sprite position by GameScene. */
  mesh3D?: THREE.Object3D;
  /** Facing angle used for 3D mesh rotation. */
  facingYaw = 0;
  speed = 130;

  // Virtual stick input (-1..1)
  stick = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.shadow = scene.add.ellipse(x, y + 2, 22, 8, 0x000000, 0.35).setDepth(-1);
    this.sprite = scene.add.image(x, y, "player").setOrigin(0.5, 0.9).setDepth(0).setScale(1.6);
  }

  update(
    dt: number,
    keys: { up: boolean; down: boolean; left: boolean; right: boolean },
    cameraYaw = 0,
  ) {
    let vx = 0, vy = 0;
    if (keys.left) vx -= 1;
    if (keys.right) vx += 1;
    if (keys.up) vy -= 1;
    if (keys.down) vy += 1;
    vx += this.stick.x;
    vy += this.stick.y;
    const m = Math.hypot(vx, vy) || 1;
    vx /= m; vy /= m;
    // Rotate input by camera yaw so movement is relative to the look
    // direction. yaw=0 ⇒ forward = +y (south), which matches the raw mapping
    // above, so cameraYaw=0 is a no-op.
    if (cameraYaw !== 0) {
      const cos = Math.cos(cameraYaw);
      const sin = Math.sin(cameraYaw);
      // Forward unit (in x, y_phaser space) = (sin(yaw), cos(yaw)).
      // Strafe-right unit = (cos(yaw), -sin(yaw)).
      // yaw=0 ⇒ forward is +y (south), matching the raw key mapping.
      const forwardAmt = -vy; // "up" key ⇒ forward
      const strafeAmt = vx;   // "right" key ⇒ strafe right
      vx = forwardAmt * sin + strafeAmt * cos;
      vy = forwardAmt * cos - strafeAmt * sin;
    }
    this.sprite.x += vx * this.speed * dt;
    this.sprite.y += vy * this.speed * dt;
    this.shadow.x = this.sprite.x;
    this.shadow.y = this.sprite.y + 1;
    this.shadow.setDepth(this.sprite.y - 0.1);
    if (vx < -0.1) this.sprite.setFlipX(true);
    else if (vx > 0.1) this.sprite.setFlipX(false);
    if (m > 0.01) {
      // Yaw in 3D world space: +z = forward (south) → 0 rad. In Phaser (top-
      // down), +y also = south. Convert 2D velocity to yaw around Y (up).
      this.facingYaw = Math.atan2(vx, vy);
    }
    // gentle bobbing when moving (base scale is 1.6)
    const base = 1.6;
    if (m > 0.01) {
      this.sprite.scaleY = base + Math.sin(performance.now() / 120) * 0.05;
    } else {
      this.sprite.scaleY = base;
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
