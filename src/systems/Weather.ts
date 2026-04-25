import Phaser from "phaser";

export type WeatherKind = "clear" | "rain" | "fog" | "overcast";

export const WEATHER_NAME_RU: Record<WeatherKind, string> = {
  clear:    "Ясно",
  rain:     "Дождь",
  fog:      "Туман",
  overcast: "Пасмурно",
};

export const WEATHER_NAME_EN: Record<WeatherKind, string> = {
  clear:    "Clear",
  rain:     "Rain",
  fog:      "Fog",
  overcast: "Overcast",
};

export const WEATHER_ICON: Record<WeatherKind, string> = {
  clear:    "☀",
  rain:     "☂",
  fog:      "≈",
  overcast: "☁",
};

/**
 * Weather visual effects drawn on top of the main camera but below the HUD.
 * Held as game objects so they scroll with the world (rain) or stay on screen (fog).
 * Changes by day — each in-game morning the kind is re-rolled.
 */
export class Weather extends Phaser.Events.EventEmitter {
  kind: WeatherKind = "clear";
  private scene: Phaser.Scene;
  private rainLines: Phaser.GameObjects.Line[] = [];
  private fogQuad?: Phaser.GameObjects.Rectangle;
  private nightTint?: Phaser.GameObjects.Rectangle;
  private overcastTint?: Phaser.GameObjects.Rectangle;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(8000).setScrollFactor(0);
  }

  setKind(k: WeatherKind) {
    if (this.kind === k) return;
    this.clear();
    this.kind = k;
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    if (k === "rain") {
      for (let i = 0; i < 90; i++) {
        const ln = this.scene.add.line(
          Phaser.Math.Between(0, w),
          Phaser.Math.Between(0, h),
          0, 0, 3, 9,
          0xb0c8e0, 0.55,
        ).setOrigin(0, 0);
        this.container.add(ln);
        this.rainLines.push(ln);
      }
    } else if (k === "fog") {
      this.fogQuad = this.scene.add.rectangle(0, 0, w, h, 0xbcc7d5, 0.32)
        .setOrigin(0, 0);
      this.container.add(this.fogQuad);
    } else if (k === "overcast") {
      this.overcastTint = this.scene.add.rectangle(0, 0, w, h, 0x202838, 0.18)
        .setOrigin(0, 0);
      this.container.add(this.overcastTint);
    }
    this.emit("changed", k);
  }

  /** Tint the scene based on in-game hour (0..24). */
  applyNightTint(hour: number) {
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;
    if (!this.nightTint) {
      this.nightTint = this.scene.add.rectangle(0, 0, w, h, 0x0a0e24, 0)
        .setOrigin(0, 0).setDepth(7900).setScrollFactor(0);
    }
    // Peak darkness 02:00, dawn at 06:00, dusk at 19:00, peak darkness again at 22:00.
    let t = 0;
    if (hour >= 19 || hour < 7) {
      // Night window. Build a 0..1 darkness curve.
      const hoursIntoNight = hour >= 19 ? hour - 19 : hour + 5; // 0..12
      t = Math.sin((hoursIntoNight / 12) * Math.PI) * 0.55;
    }
    this.nightTint.setAlpha(Phaser.Math.Clamp(t, 0, 0.6));
  }

  update(dt: number) {
    if (this.kind === "rain") {
      const cam = this.scene.cameras.main;
      const h = cam.height;
      const speed = 600;
      for (const ln of this.rainLines) {
        ln.x -= 60 * dt;
        ln.y += speed * dt;
        if (ln.y > h) {
          ln.y = -10;
          ln.x = Phaser.Math.Between(0, cam.width + 40);
        }
      }
    }
  }

  resize(w: number, h: number) {
    if (this.fogQuad) this.fogQuad.setSize(w, h);
    if (this.nightTint) this.nightTint.setSize(w, h);
    if (this.overcastTint) this.overcastTint.setSize(w, h);
  }

  clear() {
    for (const ln of this.rainLines) ln.destroy();
    this.rainLines.length = 0;
    if (this.fogQuad) { this.fogQuad.destroy(); this.fogQuad = undefined; }
    if (this.overcastTint) { this.overcastTint.destroy(); this.overcastTint = undefined; }
  }

  destroy() {
    this.clear();
    if (this.nightTint) this.nightTint.destroy();
    this.container.destroy();
  }
}

/** Simple weighted rollout for a new day's weather.
 *  Biased strongly toward clear skies so the cemetery reads well.
 */
export function pickWeather(): WeatherKind {
  const r = Math.random();
  if (r < 0.75) return "clear";     // 75%
  if (r < 0.88) return "overcast";  // 13%
  if (r < 0.96) return "rain";      //  8%
  return "fog";                      //  4%
}
