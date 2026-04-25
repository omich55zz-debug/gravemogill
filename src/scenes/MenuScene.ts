import Phaser from "phaser";
import { progress, ACHIEVEMENTS } from "../systems/Progress";
import { hasSave, readSave, deleteSave, saveAgeLabel } from "../systems/SaveSystem";

export class MenuScene extends Phaser.Scene {
  private dailyBonus = 0;

  constructor() { super("Menu"); }

  create() {
    const { width, height } = this.scale;

    // Register today's login; may unlock streak achievements and grant a bonus
    // that will be paid out when the game scene starts.
    const login = progress.registerLogin();
    this.dailyBonus = login.bonus;
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

    this.add.text(width / 2, height / 2 - 30, "Эльданара Могильщика", {
      fontFamily: "serif", fontSize: "26px", color: "#b9a97a", fontStyle: "italic",
    }).setOrigin(0.5);

    const saveExists = hasSave();
    const save = saveExists ? readSave() : null;

    // Primary button: Continue (if save exists) OR Start.
    const primaryY = height / 2 + 50;
    const primaryLabel = saveExists ? "Продолжить" : "Начать смену";
    const btn = this.add.rectangle(width / 2, primaryY, 280, 60, 0x3a2c1f)
      .setStrokeStyle(2, 0x8c6a36).setInteractive({ useHandCursor: true });
    const label = this.add.text(width / 2, primaryY, primaryLabel, {
      fontFamily: "serif", fontSize: "24px", color: "#f0e7c8",
    }).setOrigin(0.5);
    btn.on("pointerover", () => { btn.setFillStyle(0x4e3c2a); });
    btn.on("pointerout", () => { btn.setFillStyle(0x3a2c1f); });
    btn.on("pointerup", () => saveExists ? this.continueGame() : this.startGame());
    label.setInteractive({ useHandCursor: true });
    label.on("pointerup", () => saveExists ? this.continueGame() : this.startGame());

    if (saveExists && save) {
      this.add.text(width / 2, primaryY + 38, `День ${save.day}, ${String(save.hour).padStart(2, "0")}:00  ·  ₽${save.money}  ·  ${saveAgeLabel(save.savedAtMs)}`, {
        fontFamily: "serif", fontSize: "13px", color: "#9a8f72",
      }).setOrigin(0.5);

      // Secondary: Start a new game (wipes save after confirmation).
      const newY = primaryY + 80;
      const newBtn = this.add.rectangle(width / 2, newY, 280, 42, 0x241820)
        .setStrokeStyle(1, 0x6a4a50).setInteractive({ useHandCursor: true });
      const newLabel = this.add.text(width / 2, newY, "Новая игра", {
        fontFamily: "serif", fontSize: "16px", color: "#c9a9a9",
      }).setOrigin(0.5);
      newBtn.on("pointerover", () => newBtn.setFillStyle(0x3a242c));
      newBtn.on("pointerout", () => newBtn.setFillStyle(0x241820));
      newBtn.on("pointerup", () => this.confirmNewGame());
      newLabel.setInteractive({ useHandCursor: true });
      newLabel.on("pointerup", () => this.confirmNewGame());
    }

    this.add.text(width / 2, height - 52,
      "Вы — старый эльф Эльданар, смотритель родового некрополя.",
      { fontFamily: "serif", fontSize: "14px", color: "#a29680" }
    ).setOrigin(0.5);
    this.add.text(width / 2, height - 30,
      "Возьмите фонарь. Ночь холодна, а мёртвые — беспокойны.",
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
