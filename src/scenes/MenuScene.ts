import Phaser from "phaser";
import { progress, ACHIEVEMENTS } from "../systems/Progress";
import { hasSave, readSave, deleteSave, saveAgeLabel } from "../systems/SaveSystem";

export class MenuScene extends Phaser.Scene {
  private dailyBonus = 0;

  constructor() { super("Menu"); }

  create() {
    const { width, height } = this.scale;

    const login = progress.registerLogin();
    this.dailyBonus = login.bonus;

    // ----- Layered gothic background -----
    // Deep void sky with vertical gradient.
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050410, 0x050410, 0x1a0a20, 0x0a0610, 1);
    bg.fillRect(0, 0, width, height);

    // Star field
    const stars = this.add.graphics();
    for (let i = 0; i < 140; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height * 0.6;
      const a = 0.15 + Math.random() * 0.6;
      stars.fillStyle(0xd8d0ff, a);
      stars.fillCircle(sx, sy, Math.random() * 1.3);
    }

    // Large moon with halo (high-right)
    const moonX = width - 120, moonY = 120;
    for (let r = 80; r > 40; r -= 5) {
      this.add.circle(moonX, moonY, r, 0xb8c0e8, 0.04).setBlendMode(Phaser.BlendModes.ADD);
    }
    const moon = this.add.circle(moonX, moonY, 42, 0xe6e1d2, 0.95);
    moon.setBlendMode(Phaser.BlendModes.ADD);

    // Gnarled dead tree silhouettes in the foreground (left + right edges).
    const drawTree = (baseX: number, baseY: number, scale: number) => {
      const tree = this.add.graphics();
      tree.fillStyle(0x050308, 1);
      tree.lineStyle(4 * scale, 0x050308, 1);
      // Trunk
      tree.fillRect(baseX - 8 * scale, baseY - 180 * scale, 16 * scale, 180 * scale);
      // Branches
      tree.beginPath();
      tree.moveTo(baseX, baseY - 180 * scale);
      tree.lineTo(baseX - 60 * scale, baseY - 240 * scale);
      tree.moveTo(baseX, baseY - 180 * scale);
      tree.lineTo(baseX + 80 * scale, baseY - 260 * scale);
      tree.moveTo(baseX - 30 * scale, baseY - 210 * scale);
      tree.lineTo(baseX - 90 * scale, baseY - 280 * scale);
      tree.moveTo(baseX + 30 * scale, baseY - 210 * scale);
      tree.lineTo(baseX + 110 * scale, baseY - 300 * scale);
      tree.moveTo(baseX - 60 * scale, baseY - 240 * scale);
      tree.lineTo(baseX - 100 * scale, baseY - 290 * scale);
      tree.strokePath();
    };
    drawTree(60, height - 40, 1.0);
    drawTree(width - 50, height - 40, 0.9);

    // Fog ground haze bottom
    const fog = this.add.graphics();
    fog.fillGradientStyle(0x1a1420, 0x1a1420, 0x070510, 0x070510, 0.0);
    fog.fillStyle(0x1a1420, 0.5);
    fog.fillRect(0, height - 220, width, 220);

    // Silhouette tombstones at horizon
    for (let i = 0; i < 10; i++) {
      const x = 40 + i * (width - 80) / 9;
      const tex = i % 3 === 0 ? "tomb_obelisk" : i % 2 === 0 ? "tomb_marble" : "tomb_stone";
      this.add.image(x, height - 120, tex)
        .setOrigin(0.5, 1).setScale(3.2).setTint(0x050308).setAlpha(0.95);
    }

    // ----- Title -----
    const titleY = height / 2 - 110;
    // Decorative runic line above title
    const runeTop = this.add.text(width / 2, titleY - 60, "✦  ✶  ✦  ✶  ✦", {
      fontFamily: "serif", fontSize: "20px", color: "#7a6a3e",
    }).setOrigin(0.5);
    runeTop.setAlpha(0.7);

    // Main title with layered shadow for depth
    this.add.text(width / 2 + 3, titleY + 3, "КЛАДБИЩЕ", {
      fontFamily: "serif", fontSize: "62px", color: "#000000",
    }).setOrigin(0.5).setAlpha(0.7);
    const title = this.add.text(width / 2, titleY, "КЛАДБИЩЕ", {
      fontFamily: "serif", fontSize: "62px", color: "#f0e5c8",
      fontStyle: "bold",
    }).setOrigin(0.5);
    title.setShadow(0, 0, "#a88038", 18, true, true);

    // Subtitle with elvish arch
    this.add.text(width / 2, titleY + 52, "Древнего Эльфа-Мага", {
      fontFamily: "serif", fontSize: "28px", color: "#b8a36e", fontStyle: "italic",
    }).setOrigin(0.5).setShadow(2, 2, "#000", 6);

    // Candle glow flanking the title
    const flicker = (x: number, y: number) => {
      const flame = this.add.circle(x, y, 14, 0xffb85c, 0.7).setBlendMode(Phaser.BlendModes.ADD);
      this.add.circle(x, y, 28, 0xffb85c, 0.2).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: flame, alpha: { from: 0.55, to: 0.9 }, scale: { from: 0.85, to: 1.15 },
        duration: 720 + Math.random() * 400, yoyo: true, repeat: -1,
      });
    };
    flicker(width / 2 - 230, titleY + 5);
    flicker(width / 2 + 230, titleY + 5);

    const saveExists = hasSave();
    const save = saveExists ? readSave() : null;

    // ----- Primary button: rune-stone style -----
    const primaryY = height / 2 + 30;
    const primaryLabel = saveExists ? "Продолжить ритуал" : "Начать ритуал";

    const btn = this.add.rectangle(width / 2, primaryY, 320, 68, 0x231a2a)
      .setStrokeStyle(2, 0xa48038).setInteractive({ useHandCursor: true });
    // Inner highlight
    this.add.rectangle(width / 2, primaryY, 310, 58, 0x2f2030, 0).setStrokeStyle(1, 0x6e5320);

    const label = this.add.text(width / 2, primaryY, primaryLabel, {
      fontFamily: "serif", fontSize: "26px", color: "#f0e5c8", fontStyle: "bold",
    }).setOrigin(0.5).setShadow(1, 2, "#000", 4);
    btn.on("pointerover", () => { btn.setFillStyle(0x342638); });
    btn.on("pointerout", () => { btn.setFillStyle(0x231a2a); });
    btn.on("pointerup", () => saveExists ? this.continueGame() : this.startGame());
    label.setInteractive({ useHandCursor: true });
    label.on("pointerup", () => saveExists ? this.continueGame() : this.startGame());

    if (saveExists && save) {
      this.add.text(width / 2, primaryY + 44, `День ${save.day}, ${String(save.hour).padStart(2, "0")}:00  ·  ₽${save.money}  ·  ${saveAgeLabel(save.savedAtMs)}`, {
        fontFamily: "serif", fontSize: "13px", color: "#9a8f72",
      }).setOrigin(0.5);

      const newY = primaryY + 88;
      const newBtn = this.add.rectangle(width / 2, newY, 300, 46, 0x1c121a)
        .setStrokeStyle(1, 0x6a4a50).setInteractive({ useHandCursor: true });
      const newLabel = this.add.text(width / 2, newY, "Новая игра", {
        fontFamily: "serif", fontSize: "17px", color: "#c9a9a9",
      }).setOrigin(0.5);
      newBtn.on("pointerover", () => newBtn.setFillStyle(0x2c1a28));
      newBtn.on("pointerout", () => newBtn.setFillStyle(0x1c121a));
      newBtn.on("pointerup", () => this.confirmNewGame());
      newLabel.setInteractive({ useHandCursor: true });
      newLabel.on("pointerup", () => this.confirmNewGame());
    }

    this.add.text(width / 2, height - 58,
      "Вы — Древний Эльф-Маг, последний страж родового некрополя.",
      { fontFamily: "serif", fontSize: "14px", color: "#a29680" }
    ).setOrigin(0.5).setShadow(1, 1, "#000", 2);
    this.add.text(width / 2, height - 36,
      "Посох светится. Духи шепчут. Работа не ждёт.",
      { fontFamily: "serif", fontSize: "13px", color: "#7e7260", fontStyle: "italic" }
    ).setOrigin(0.5);

    // Daily login card (top-left)
    if (login.newDay) this.drawDailyCard(login.streak, login.bonus);

    // Achievements button (top-right)
    this.drawAchievementsButton(width);
  }

  private drawDailyCard(streak: number, bonus: number) {
    const x = 24, y = 24, w = 260, h = 96;
    const panel = this.add.rectangle(x, y, w, h, 0x1c1624, 0.92).setOrigin(0, 0);
    panel.setStrokeStyle(2, 0x8c6a36);
    this.add.text(x + 14, y + 10, "Ежедневный визит", {
      fontFamily: "serif", fontSize: "18px", color: "#e8e1cf",
    });
    this.add.text(x + 14, y + 36, `Серия: ${streak} ${streak === 1 ? "день" : streak < 5 ? "дня" : "дней"}`, {
      fontFamily: "serif", fontSize: "14px", color: "#b9a97a",
    });
    if (bonus > 0) {
      this.add.text(x + 14, y + 60, `Бонус: +${bonus}₽`, {
        fontFamily: "serif", fontSize: "20px", color: "#ffc94d",
        fontStyle: "bold",
      }).setShadow(1, 1, "#000", 2);
    }
  }

  private drawAchievementsButton(width: number) {
    const unlocked = progress.unlockedCount();
    const total = ACHIEVEMENTS.length;
    const x = width - 24, y = 24, w = 220, h = 44;
    const panel = this.add.rectangle(x - w, y, w, h, 0x2a1f2f, 0.92).setOrigin(0, 0);
    panel.setStrokeStyle(2, 0x8c6a36);
    panel.setInteractive({ useHandCursor: true });
    const label = this.add.text(x - w / 2, y + h / 2, `🏆  Достижения  ${unlocked}/${total}`, {
      fontFamily: "serif", fontSize: "16px", color: "#f0e7c8",
    }).setOrigin(0.5);
    panel.on("pointerover", () => panel.setFillStyle(0x3a2c3f));
    panel.on("pointerout", () => panel.setFillStyle(0x2a1f2f));
    panel.on("pointerup", () => this.showAchievements());
    label.setInteractive({ useHandCursor: true });
    label.on("pointerup", () => this.showAchievements());
  }

  private showAchievements() {
    const { width, height } = this.scale;
    const items = progress.list();

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.78).setOrigin(0, 0);
    overlay.setInteractive();

    const panelW = Math.min(720, width - 40);
    const panelH = Math.min(height - 80, 560);
    const px0 = (width - panelW) / 2;
    const py0 = (height - panelH) / 2;
    const panel = this.add.rectangle(px0, py0, panelW, panelH, 0x1b151f, 0.98).setOrigin(0, 0);
    panel.setStrokeStyle(2, 0x8c6a36);

    const title = this.add.text(px0 + panelW / 2, py0 + 20, "Достижения", {
      fontFamily: "serif", fontSize: "28px", color: "#f0e7c8",
    }).setOrigin(0.5, 0);

    const closeBtn = this.add.text(px0 + panelW - 22, py0 + 10, "✕", {
      fontFamily: "sans-serif", fontSize: "24px", color: "#b9a97a",
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    const container = this.add.container(0, 0);
    container.add([overlay, panel, title, closeBtn]);

    const rowH = 56;
    const listX = px0 + 16;
    const listY = py0 + 70;
    const listW = panelW - 32;

    items.forEach((a, i) => {
      const y = listY + i * (rowH + 6);
      const row = this.add.rectangle(listX, y, listW, rowH, a.unlocked ? 0x2a341c : 0x251a2a, 1).setOrigin(0, 0);
      row.setStrokeStyle(1, a.unlocked ? 0x8ac23e : 0x4a3848);

      this.add.text(listX + 14, y + rowH / 2, a.icon, {
        fontFamily: "sans-serif", fontSize: "26px",
        color: a.unlocked ? "#ffe89e" : "#666",
      }).setOrigin(0, 0.5);

      this.add.text(listX + 48, y + 8, a.title, {
        fontFamily: "serif", fontSize: "18px",
        color: a.unlocked ? "#f0e7c8" : "#888",
      });
      this.add.text(listX + 48, y + 30, a.description, {
        fontFamily: "serif", fontSize: "13px",
        color: a.unlocked ? "#c3b78c" : "#666",
      });
      this.add.text(listX + listW - 14, y + rowH / 2, a.unlocked ? `+${a.rewardCoins}₽ ✓` : `+${a.rewardCoins}₽`, {
        fontFamily: "serif", fontSize: "14px",
        color: a.unlocked ? "#8ac23e" : "#777",
      }).setOrigin(1, 0.5);

      container.add([row]);
    });

    closeBtn.on("pointerup", () => {
      this.children.list
        .filter((c) => c !== overlay && (c as Phaser.GameObjects.GameObject).scene === this && (c as unknown as { _achDestroy?: boolean })._achDestroy)
        .forEach((c) => (c as Phaser.GameObjects.GameObject).destroy());
      // Simpler: restart the scene to clean up overlay.
      this.scene.restart();
    });
    overlay.on("pointerup", () => this.scene.restart());
  }

  private startGame() {
    this.scene.start("Game", { startingBonus: this.dailyBonus });
    this.scene.launch("UI");
  }

  private continueGame() {
    this.scene.start("Game", { startingBonus: this.dailyBonus, loadSave: true });
    this.scene.launch("UI");
  }

  private confirmNewGame() {
    const ok = typeof window !== "undefined"
      ? window.confirm("Начать новую игру? Текущее сохранение будет стёрто.")
      : true;
    if (!ok) return;
    deleteSave();
    this.scene.restart();
  }
}
