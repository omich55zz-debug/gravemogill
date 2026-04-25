import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create() {
    const { width, height } = this.scale;
    // Dark spooky background gradient
    const g = this.add.graphics();
    g.fillGradientStyle(0x0e0e1a, 0x0e0e1a, 0x2a1f2f, 0x1a141d, 1);
    g.fillRect(0, 0, width, height);

    // Little moon
    const moon = this.add.circle(width - 80, 80, 34, 0xf4ead6).setAlpha(0.9);
    moon.setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(width - 80, 80, 38, 0xf4ead6, 0.15).setBlendMode(Phaser.BlendModes.ADD);

    // A few silhouette tombstones
    for (let i = 0; i < 8; i++) {
      const x = 40 + i * (width - 80) / 7;
      this.add.image(x, height - 80, i % 3 === 0 ? "tomb_obelisk" : i % 2 === 0 ? "tomb_marble" : "tomb_stone")
        .setOrigin(0.5, 1).setScale(3).setTint(0x0a0a12).setAlpha(0.9);
    }

    this.add.text(width / 2, height / 2 - 80, "КЛАДБИЩЕ", {
      fontFamily: "serif", fontSize: "56px", color: "#e8e1cf",
    }).setOrigin(0.5).setShadow(2, 2, "#000", 4);

    this.add.text(width / 2, height / 2 - 30, "мистера Королёва", {
      fontFamily: "serif", fontSize: "28px", color: "#b9a97a", fontStyle: "italic",
    }).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, height / 2 + 70, 260, 60, 0x3a2c1f)
      .setStrokeStyle(2, 0x8c6a36).setInteractive({ useHandCursor: true });
    const label = this.add.text(width / 2, height / 2 + 70, "Начать смену", {
      fontFamily: "serif", fontSize: "24px", color: "#f0e7c8",
    }).setOrigin(0.5);
    btn.on("pointerover", () => { btn.setFillStyle(0x4e3c2a); });
    btn.on("pointerout", () => { btn.setFillStyle(0x3a2c1f); });
    btn.on("pointerup", () => this.startGame());
    label.setInteractive({ useHandCursor: true });
    label.on("pointerup", () => this.startGame());

    this.add.text(width / 2, height - 30,
      "Помогите мистеру Королёву превратить родовые земли в место последнего прибежища.",
      { fontFamily: "serif", fontSize: "14px", color: "#a29680" }
    ).setOrigin(0.5);
  }

  private startGame() {
    this.scene.start("Game");
    this.scene.launch("UI");
  }
}
