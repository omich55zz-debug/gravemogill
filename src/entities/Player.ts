import Phaser from "phaser";

export class Player {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  speed = 80;

  // Virtual stick input (-1..1)
  stick = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.shadow = scene.add.ellipse(x, y + 1, 14, 5, 0x000000, 0.35).setDepth(-1);
    this.sprite = scene.add.image(x, y, "player").setOrigin(0.5, 0.9).setDepth(0);
  }

  update(dt: number, keys: { up: boolean; down: boolean; left: boolean; right: boolean }) {
    let vx = 0, vy = 0;
    if (keys.left) vx -= 1;
    if (keys.right) vx += 1;
    if (keys.up) vy -= 1;
    if (keys.down) vy += 1;
    vx += this.stick.x;
    vy += this.stick.y;
    const m = Math.hypot(vx, vy) || 1;
    vx /= m; vy /= m;
    this.sprite.x += vx * this.speed * dt;
    this.sprite.y += vy * this.speed * dt;
    this.shadow.x = this.sprite.x;
    this.shadow.y = this.sprite.y + 1;
    this.shadow.setDepth(this.sprite.y - 0.1);
    if (vx < -0.1) this.sprite.setFlipX(true);
    else if (vx > 0.1) this.sprite.setFlipX(false);
    // gentle bobbing when moving
    if (m > 0.01) {
      this.sprite.scaleY = 1 + Math.sin(performance.now() / 120) * 0.03;
    } else {
      this.sprite.scaleY = 1;
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
