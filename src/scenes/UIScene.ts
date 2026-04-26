import Phaser from "phaser";
import type { GameScene } from "./GameScene";
import type { Economy } from "../systems/Economy";
import type { TimeSystem } from "../systems/TimeSystem";
import type { OrderSystem, Order } from "../systems/OrderSystem";
import { CATALOG, type ItemCategory } from "../data/catalog";
import type { Cell } from "../utils/grid";
import { portraitKey } from "../utils/sprites";
import { tutorial } from "../systems/Tutorial";
import { audio } from "../systems/Audio";
import { shop, SHOVELS, HELPERS } from "../systems/Shop";
import { progress, ACHIEVEMENTS } from "../systems/Progress";
import { WEATHER_NAME_RU, WEATHER_ICON } from "../systems/Weather";
import { reputation } from "../systems/Reputation";
import { THEMES } from "../data/graveThemes";
import { tiersFor } from "../systems/Buildings";
import { i18n } from "../systems/I18n";

/**
 * Parallel HUD scene. Draws everything in screen-space (Phaser at natural resolution).
 */
export class UIScene extends Phaser.Scene {
  private hudMoney!: Phaser.GameObjects.Text;
  private hudDay!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private hudRepRank!: Phaser.GameObjects.Text;
  private hudRepBar!: Phaser.GameObjects.Graphics;
  private hudRepLabel!: Phaser.GameObjects.Text;
  private activeOrderPanel!: Phaser.GameObjects.Container;
  private orderOfferPanel?: Phaser.GameObjects.Container;
  private contextPanel?: Phaser.GameObjects.Container;
  private modal?: Phaser.GameObjects.Container;

  private stickBase!: Phaser.GameObjects.Arc;
  private stickKnob!: Phaser.GameObjects.Arc;
  private stickActive = false;
  private stickPointerId?: number;
  private actionBtn!: Phaser.GameObjects.Container;
  private upgradeBtn?: Phaser.GameObjects.Container;
  private upgradeBtnLabel?: Phaser.GameObjects.Text;
  private upgradeBtnSub?: Phaser.GameObjects.Text;

  constructor() { super({ key: "UI", active: false }); }

  get game_(): GameScene { return this.registry.get("game") as GameScene; }
  get economy(): Economy { return this.registry.get("economy") as Economy; }
  get gameTime(): TimeSystem { return this.registry.get("time") as TimeSystem; }
  get orders(): OrderSystem { return this.registry.get("orders") as OrderSystem; }

  create() {
    const { width } = this.scale;
    this.buildTopHud();

    // Active order panel (top-right, below HUD + buttons row)
    this.activeOrderPanel = this.add.container(width - 16, 144);

    // Bottom controls: virtual stick + action button
    this.createVirtualStick();
    this.createActionButton();
    this.createUpgradeButton();

    // Orders button (opens list of offered orders)
    this.createOrdersButton();

    // Camera zoom buttons (+/-)
    this.createZoomButtons();

    // Listeners
    this.economy.on("changed", () => this.refreshHud());
    this.gameTime.on("hourChanged", () => this.refreshHud());
    this.gameTime.on("dayChanged", () => this.refreshHud());
    // Refresh HUD when weather changes so the weather icon updates.
    this.game_.events.on("weather", () => this.refreshHud());
    reputation.on("changed", (_pts: number, delta: number) => {
      this.refreshHud();
      this.flashReputationDelta(delta);
    });
    this.orders.on("offered", () => this.maybeShowOrderOffer());
    this.orders.on("accepted", () => this.refreshActiveOrders());
    this.orders.on("completed", () => this.refreshActiveOrders());
    this.orders.on("failed", () => this.refreshActiveOrders());

    this.game_.events.on("state", () => { this.refreshActionHint(); this.refreshUpgradeButton(); });

    // Context menu requested by GameScene
    this.events.on("openContext", (cell: Cell) => this.openContextMenu(cell));

    // Resize
    this.scale.on("resize", () => this.layoutResponsive());
    this.layoutResponsive();
    this.refreshHud();
    this.refreshActiveOrders();
    this.maybeShowOrderOffer();

    // Top-right icon buttons: mute / settings / shop / achievements.
    this.createTopRightButtons();

    // Tutorial kickoff — welcome hint fires on first ever session.
    this.time.delayedCall(400, () => this.tryHint("welcome"));

    // Tutorial hooks on gameplay events (each hint fires at most once, ever).
    this.orders.on("offered", () => this.tryHint("accept_order"));
    this.orders.on("accepted", () => {
      this.tryHint("dig_grave");
      this.tryHint("cat");
    });
  }

  /** Public: convenience for GameScene to fire hints from outside. */
  tryHint(id: string) {
    const hint = tutorial.trigger(id as Parameters<typeof tutorial.trigger>[0]);
    if (!hint) return;
    this.showHintToast(hint.title, hint.text);
  }

  private showHintToast(title: string, text: string) {
    const { width, height } = this.scale;
    const w = Math.min(420, width - 32);
    const h = 104;
    const x = (width - w) / 2;
    const y = height - h - 100;
    const container = this.add.container(0, 0).setDepth(9500);
    const panel = this.add.rectangle(x, y, w, h, 0x10141c, 0.96).setOrigin(0, 0);
    panel.setStrokeStyle(2, 0x6a8fc4);
    const titleText = this.add.text(x + 14, y + 10, "☞  " + title, {
      fontFamily: "serif", fontSize: "18px", color: "#cfe2ff", fontStyle: "bold",
    });
    const body = this.add.text(x + 14, y + 34, text, {
      fontFamily: "serif", fontSize: "14px", color: "#e8e1cf",
      wordWrap: { width: w - 28 },
    });
    container.add([panel, titleText, body]);
    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 250, ease: "Quad.Out" });
    this.tweens.add({
      targets: container, alpha: 0, delay: 6500, duration: 500,
      onComplete: () => container.destroy(),
    });
    // Allow tap-to-dismiss early.
    panel.setInteractive({ useHandCursor: true });
    panel.on("pointerup", () => {
      this.tweens.killTweensOf(container);
      container.destroy();
    });
  }

  private createTopRightButtons() {
    const size = 36;
    const isNarrow = this.scale.width < 520;
    // Place below the top HUD bar so they don't overlap the rep card.
    const y = (isNarrow ? 64 : 80) + 6;
    let slot = 0;
    const make = (label: string, onClick: () => void, refresh?: (icon: Phaser.GameObjects.Text) => void) => {
      const x = this.scale.width - (size + 8) * (slot + 1) - 4;
      const container = this.add.container(0, 0).setDepth(9000);
      const circle = this.add.circle(x + size / 2, y + size / 2, size / 2, 0x1b151f, 0.9)
        .setStrokeStyle(2, 0x8c6a36).setInteractive({ useHandCursor: true });
      const icon = this.add.text(x + size / 2, y + size / 2, label, {
        fontFamily: "sans-serif", fontSize: "18px", color: "#f0e7c8",
      }).setOrigin(0.5);
      container.add([circle, icon]);
      circle.on("pointerup", () => { onClick(); refresh?.(icon); });
      slot++;
      return { container, circle, icon };
    };
    // order: [mute][settings][shop][achievements]
    const mute = make(audio.muted ? "🔇" : "🔊", () => {}, () => {});
    mute.circle.off("pointerup");
    mute.circle.on("pointerup", () => {
      const muted = audio.toggleMuted();
      mute.icon.setText(muted ? "🔇" : "🔊");
    });
    make("⚙", () => this.openSettingsModal());
    make("🛒", () => this.openShopModal());
    make("🏆", () => this.openAchievementsModal());
  }

  // -------------- HUD --------------

  /**
   * Ornate gothic top HUD. Three rounded "cards" sit on a translucent
   * black bar with a thick gold rule and rune flourishes:
   *   - Left: coin pouch + treasury amount
   *   - Center: day + time + weather (with phase glyph)
   *   - Right: reputation card with rank, points, gold progress bar
   */
  private buildTopHud() {
    const { width } = this.scale;
    const isNarrow = width < 520;
    const barH = isNarrow ? 64 : 80;

    // Backdrop layer with subtle gradient + heavy gold separator
    const back = this.add.graphics().setDepth(1);
    back.fillStyle(0x05030a, 0.95).fillRect(0, 0, width, barH);
    back.fillStyle(0x110a18, 0.55).fillRect(0, 0, width, barH * 0.4);
    back.lineStyle(1, 0x4a3a22, 0.55).lineBetween(0, 1, width, 1);
    // Double rule below
    back.lineStyle(2, 0xc9a14a, 0.85).lineBetween(0, barH - 4, width, barH - 4);
    back.lineStyle(1, 0x6a4a20, 0.6).lineBetween(0, barH - 1, width, barH - 1);

    // Rune corners
    const flourishStyle = { fontFamily: "serif", fontSize: isNarrow ? "14px" : "18px", color: "#c9a14a" } as Phaser.Types.GameObjects.Text.TextStyle;
    this.add.text(8, (barH - 24) / 2, "✦", flourishStyle).setDepth(2);
    this.add.text(width - 24, (barH - 24) / 2, "✦", flourishStyle).setDepth(2);

    const cardStroke = 0xc9a14a;
    const cardFill = 0x1a1018;

    // ===== Card 1: Treasury (left) =====
    const card1W = isNarrow ? 138 : 198;
    const cardH = barH - 18;
    const card1X = isNarrow ? 18 : 22;
    const card1Y = 9;
    const card1 = this.add.graphics().setDepth(2);
    card1.fillStyle(cardFill, 0.92).fillRoundedRect(card1X, card1Y, card1W, cardH, 6);
    card1.lineStyle(1.5, cardStroke, 0.95).strokeRoundedRect(card1X, card1Y, card1W, cardH, 6);
    // Inner highlight
    card1.lineStyle(1, 0x6a4820, 0.55).strokeRoundedRect(card1X + 2, card1Y + 2, card1W - 4, cardH - 4, 4);
    // Coin pouch glyph
    this.add.text(card1X + 12, card1Y + 5, "⚜", {
      fontFamily: "serif", fontSize: isNarrow ? "20px" : "26px", color: "#e6c266",
    }).setDepth(3);
    this.hudMoney = this.add.text(card1X + (isNarrow ? 36 : 46), card1Y + 4, "₽ 0", {
      fontFamily: "serif", fontSize: isNarrow ? "18px" : "24px", color: "#f5e7bc", fontStyle: "bold",
    }).setDepth(3);
    if (!isNarrow) {
      this.add.text(card1X + 46, card1Y + 32, "Казна некрополя", {
        fontFamily: "serif", fontSize: "11px", color: "#8a7a56", fontStyle: "italic",
      }).setDepth(3);
    }

    // ===== Card 2: Day · Time · Weather (center) =====
    const card2W = isNarrow ? 168 : 240;
    const card2X = (width - card2W) / 2;
    const card2Y = 9;
    const card2 = this.add.graphics().setDepth(2);
    card2.fillStyle(cardFill, 0.92).fillRoundedRect(card2X, card2Y, card2W, cardH, 6);
    card2.lineStyle(1.5, cardStroke, 0.95).strokeRoundedRect(card2X, card2Y, card2W, cardH, 6);
    card2.lineStyle(1, 0x6a4820, 0.55).strokeRoundedRect(card2X + 2, card2Y + 2, card2W - 4, cardH - 4, 4);
    this.hudDay = this.add.text(card2X + card2W / 2, card2Y + 4, "День 1", {
      fontFamily: "serif", fontSize: isNarrow ? "16px" : "20px", color: "#e8e1cf", fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(3);
    this.hudTime = this.add.text(card2X + card2W / 2, card2Y + (isNarrow ? 28 : 34), "☾ 08:00 · ☀ Ясно", {
      fontFamily: "serif", fontSize: isNarrow ? "11px" : "13px", color: "#a89c7a", fontStyle: "italic",
    }).setOrigin(0.5, 0).setDepth(3);

    // ===== Card 3: Reputation (right) =====
    const card3W = isNarrow ? 138 : 220;
    const card3X = width - card3W - (isNarrow ? 18 : 22);
    const card3Y = 9;
    const card3 = this.add.graphics().setDepth(2);
    card3.fillStyle(cardFill, 0.92).fillRoundedRect(card3X, card3Y, card3W, cardH, 6);
    card3.lineStyle(1.5, cardStroke, 0.95).strokeRoundedRect(card3X, card3Y, card3W, cardH, 6);
    card3.lineStyle(1, 0x6a4820, 0.55).strokeRoundedRect(card3X + 2, card3Y + 2, card3W - 4, cardH - 4, 4);
    this.add.text(card3X + 10, card3Y + 4, "✧", {
      fontFamily: "serif", fontSize: isNarrow ? "16px" : "20px", color: "#c9a14a",
    }).setDepth(3);
    this.hudRepRank = this.add.text(card3X + (isNarrow ? 30 : 36), card3Y + 4, "Новичок", {
      fontFamily: "serif", fontSize: isNarrow ? "13px" : "16px", color: "#e8d9a8", fontStyle: "bold",
    }).setDepth(3);
    this.hudRepLabel = this.add.text(card3X + card3W - 8, card3Y + 6, "0 / 30", {
      fontFamily: "serif", fontSize: isNarrow ? "10px" : "11px", color: "#9a8f72",
    }).setOrigin(1, 0).setDepth(3);
    this.hudRepBar = this.add.graphics().setDepth(3);

    // Hint text — placed under the bar (not inside cards anymore)
    this.hudHint = this.add.text(width / 2, barH + 4, "", {
      fontFamily: "serif", fontSize: isNarrow ? "12px" : "14px", color: "#d7c78b",
      backgroundColor: "rgba(7,5,12,0.7)", padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 0).setDepth(3);

    // Stash card3 metrics for reputation bar refresh
    (this as unknown as { _repRect: { x: number; y: number; w: number; h: number } })._repRect = {
      x: card3X, y: card3Y, w: card3W, h: cardH,
    };
  }

  private refreshHud() {
    this.hudMoney.setText(`₽ ${this.economy.money}`);
    this.hudDay.setText(`День ${this.gameTime.day}`);
    const weather = this.game_?.weather;
    const h = this.gameTime.hour;
    // Moon/sun glyph based on hour — uses Unicode symbols that render well in serif fonts.
    const phase = h >= 19 || h < 6 ? "☾" : h < 9 || h > 17 ? "◐" : "☀";
    const wname = weather ? (WEATHER_NAME_RU[weather.kind] ?? "") : "";
    const wicon = weather ? (WEATHER_ICON[weather.kind] ?? "") : "";
    this.hudTime.setText(`${phase} ${this.gameTime.timeString()}  ·  ${wicon} ${wname}`);
    this.refreshReputation();
  }

  private refreshReputation() {
    const rank = reputation.rank();
    const next = reputation.nextRank();
    this.hudRepRank.setText(rank.name);
    const rect = (this as unknown as { _repRect?: { x: number; y: number; w: number; h: number } })._repRect;
    if (!rect) return;
    const barX = rect.x + 12;
    const barY = rect.y + rect.h - 12;
    const barW = rect.w - 24;
    this.hudRepBar.clear();
    this.hudRepBar.fillStyle(0x1a120a, 1).fillRoundedRect(barX, barY, barW, 5, 2);
    if (next) {
      const span = next.threshold - rank.threshold;
      const pos = reputation.points - rank.threshold;
      const pct = Math.max(0, Math.min(1, span > 0 ? pos / span : 0));
      this.hudRepBar.fillGradientStyle(0xc9a14a, 0xffe7a8, 0xc9a14a, 0xffe7a8, 1)
        .fillRoundedRect(barX, barY, Math.max(2, barW * pct), 5, 2);
      this.hudRepLabel.setText(`${reputation.points} / ${next.threshold}`);
    } else {
      this.hudRepBar.fillStyle(0xe6c266, 1).fillRoundedRect(barX, barY, barW, 5, 2);
      this.hudRepLabel.setText(`${reputation.points} ★`);
    }
  }

  private flashReputationDelta(delta: number) {
    if (!delta) return;
    const txt = this.add.text(220, 70, `${delta > 0 ? "+" : ""}${delta}`, {
      fontFamily: "serif", fontSize: "14px",
      color: delta > 0 ? "#c9e98e" : "#e9928e", fontStyle: "bold",
    }).setDepth(3);
    this.tweens.add({
      targets: txt,
      y: 50,
      alpha: 0,
      duration: 1200,
      ease: "Sine.easeOut",
      onComplete: () => txt.destroy(),
    });
  }

  private refreshActionHint() {
    const cell = this.game_.focusedCell;
    if (!cell) { this.hudHint.setText(""); return; }
    let hint = "";
    if (cell.terrain === "plot") hint = "[Пробел] Копать могилу";
    else if (cell.terrain === "hole" && !cell.grave?.tombstoneId) hint = "[Пробел] Установить надгробие";
    else if (cell.grave?.tombstoneId && !cell.grave.completed) hint = "[Пробел] Действия с могилой";
    else if (cell.terrain === "grass") hint = "[Пробел] Положить дорожку";
    else if (cell.terrain === "path") hint = "[Пробел] Убрать дорожку";
    this.hudHint.setText(hint);
  }

  private layoutResponsive() {
    const { width, height } = this.scale;
    this.activeOrderPanel.setPosition(width - 16, 144);

    const baseR = this.stickBase?.radius ?? 54;
    const sx = baseR + 22;
    const sy = height - baseR - 22;
    this.stickBase?.setPosition(sx, sy);
    this.stickKnob?.setPosition(sx, sy);

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const ar = isMobile ? 56 : 46;
    this.actionBtn?.setPosition(width - ar - 18, height - ar - 18);
    this.upgradeBtn?.setPosition(width - ar * 2 - 60, height - ar - 18);
  }

  // -------------- Virtual stick --------------

  private createVirtualStick() {
    const { height } = this.scale;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const baseR = isMobile ? 64 : 54;
    const knobR = isMobile ? 30 : 24;
    const cx = baseR + 22;
    const cy = height - baseR - 22;
    this.stickBase = this.add.circle(cx, cy, baseR, 0x05030a, 0.6).setStrokeStyle(2.5, 0xc9a14a, 0.85).setScrollFactor(0);
    this.stickKnob = this.add.circle(cx, cy, knobR, 0x6a4820, 0.95).setStrokeStyle(2, 0xffe7a8, 0.9).setScrollFactor(0);
    this.stickBase.setInteractive();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.stickActive) return;
      if (p.x < this.scale.width / 2 && p.y > this.scale.height / 2) {
        this.stickActive = true;
        this.stickPointerId = p.id;
        this.updateStick(p.x, p.y);
      }
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.stickActive && p.id === this.stickPointerId) this.updateStick(p.x, p.y);
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.stickActive && p.id === this.stickPointerId) this.resetStick();
    });
    this.input.on("pointerupoutside", (p: Phaser.Input.Pointer) => {
      if (this.stickActive && p.id === this.stickPointerId) this.resetStick();
    });
  }

  private updateStick(px: number, py: number) {
    const bx = this.stickBase.x, by = this.stickBase.y;
    const dx = px - bx, dy = py - by;
    const d = Math.hypot(dx, dy);
    const max = (this.stickBase.radius ?? 54) - 14;
    const clamped = Math.min(d, max);
    const nx = d === 0 ? 0 : dx / d * clamped;
    const ny = d === 0 ? 0 : dy / d * clamped;
    this.stickKnob.setPosition(bx + nx, by + ny);
    this.game_.player.stick = { x: nx / max, y: ny / max };
  }

  private resetStick() {
    this.stickActive = false;
    this.stickPointerId = undefined;
    this.stickKnob.setPosition(this.stickBase.x, this.stickBase.y);
    this.game_.player.stick = { x: 0, y: 0 };
  }

  // -------------- Action button --------------

  private createActionButton() {
    const { width, height } = this.scale;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const radius = isMobile ? 56 : 46;
    this.actionBtn = this.add.container(width - radius - 18, height - radius - 18);
    // Outer halo
    const halo = this.add.circle(0, 0, radius + 6, 0xc9a14a, 0.18);
    // Main button: gradient ring + dark stone center
    const ring = this.add.circle(0, 0, radius, 0x1a1018, 0.95).setStrokeStyle(3, 0xc9a14a, 0.95);
    const inner = this.add.circle(0, 0, radius - 6, 0x6a4820, 0.45).setStrokeStyle(1, 0x6a4820, 0.55);
    const label = this.add.text(0, -2, "✦", {
      fontFamily: "serif", fontSize: `${Math.floor(radius * 0.8)}px`, color: "#f5e7bc",
    }).setOrigin(0.5);
    const sub = this.add.text(0, radius - 14, "Действие", {
      fontFamily: "serif", fontSize: "11px", color: "#d8c890",
    }).setOrigin(0.5);
    this.actionBtn.add([halo, ring, inner, label, sub]);
    ring.setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
    ring.on("pointerdown", () => { ring.setFillStyle(0x2c1c30, 0.95); });
    ring.on("pointerup", () => { ring.setFillStyle(0x1a1018, 0.95); this.game_.triggerAction(); });
    ring.on("pointerout", () => { ring.setFillStyle(0x1a1018, 0.95); });
  }

  // -------------- Upgrade building button --------------

  private createUpgradeButton() {
    const { width, height } = this.scale;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const ar = isMobile ? 56 : 46;
    this.upgradeBtn = this.add.container(width - ar * 2 - 60, height - ar - 18);
    const bg = this.add.rectangle(0, 0, 132, ar * 1.3, 0x1a1018, 0.95)
      .setStrokeStyle(2, 0xc9a14a, 0.95);
    const inner = this.add.rectangle(0, 0, 128, ar * 1.3 - 4, 0x6a4820, 0.18)
      .setStrokeStyle(1, 0x6a4820, 0.55);
    this.upgradeBtnLabel = this.add.text(0, -ar * 0.3, "✦ Улучшить", {
      fontFamily: "serif", fontSize: "13px", color: "#f5e7bc", fontStyle: "bold",
    }).setOrigin(0.5);
    this.upgradeBtnSub = this.add.text(0, ar * 0.18, "1200₽", {
      fontFamily: "serif", fontSize: "13px", color: "#d8c890",
    }).setOrigin(0.5);
    this.upgradeBtn.add([bg, inner, this.upgradeBtnLabel, this.upgradeBtnSub]);
    this.upgradeBtn.setVisible(false);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", () => {
      const slot = this.game_.nearbyBuilding;
      if (slot) this.game_.upgradeBuilding(slot);
    });
  }

  /** Refresh upgrade button visibility/cost based on player proximity. */
  private refreshUpgradeButton() {
    const slot = this.game_?.nearbyBuilding;
    if (!this.upgradeBtn) return;
    if (!slot || slot.tier >= 3) {
      this.upgradeBtn.setVisible(false);
      return;
    }
    const next = (slot.tier + 1) as 2 | 3;
    const spec = tiersFor(slot.kind)[next];
    this.upgradeBtnLabel?.setText(`✦ ${spec.name}`);
    const can = this.economy.money >= spec.cost;
    this.upgradeBtnSub?.setText(`${spec.cost}₽`).setColor(can ? "#d8c890" : "#e09080");
    this.upgradeBtn.setVisible(true);
  }

  // -------------- Orders button --------------

  private createOrdersButton() {
    const isNarrow = this.scale.width < 520;
    const yBase = (isNarrow ? 64 : 80) + 6;
    // Place left of the top-right icon row (4 icons * (36+8)=176px wide).
    const btnX = this.scale.width - 176 - 80;
    const btnY = yBase + 18;
    const btn = this.add.container(btnX, btnY);
    const bg = this.add.rectangle(0, 0, 130, 36, 0x1a1018, 0.95).setStrokeStyle(2, 0xc9a14a, 0.95);
    const label = this.add.text(0, 0, "✉ Заказы", { fontFamily: "serif", fontSize: "13px", color: "#f5e7bc", fontStyle: "bold" }).setOrigin(0.5);
    btn.add([bg, label]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", () => this.openOrdersList());

    this.scale.on("resize", () => {
      const nx = this.scale.width - 176 - 80;
      btn.setPosition(nx, btnY);
    });
  }

  // -------------- Camera zoom buttons --------------

  private createZoomButtons() {
    // Place zoom buttons on the LEFT side, vertically centered, so they
    // don't fight the right-side HUD/order list. Larger touch radius for
    // mobile.
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const r = isMobile ? 24 : 20;
    const baseR = isMobile ? 64 : 54;
    const stickX = baseR + 22;
    const make = (offsetX: number, y: number, label: string, fn: () => void) => {
      const c = this.add.container(stickX + offsetX, y);
      const bg = this.add.circle(0, 0, r, 0x1a1018, 0.95).setStrokeStyle(2, 0xc9a14a, 0.95);
      const lbl = this.add.text(0, -1, label, { fontFamily: "serif", fontSize: `${r + 4}px`, color: "#f5e7bc", fontStyle: "bold" }).setOrigin(0.5);
      c.add([bg, lbl]);
      bg.setInteractive({ useHandCursor: true }).on("pointerup", fn);
      return { c, bg, lbl };
    };
    // Position above the virtual stick (left bottom)
    const baseY = this.scale.height - baseR - 22 - baseR - 24;
    const plus = make(-r - 6, baseY, "+", () => this.game_.zoomIn());
    const minus = make(r + 6, baseY, "−", () => this.game_.zoomOut());
    this.scale.on("resize", () => {
      const newY = this.scale.height - baseR - 22 - baseR - 24;
      plus.c.setPosition(stickX - r - 6, newY);
      minus.c.setPosition(stickX + r + 6, newY);
    });
  }

  // -------------- Order offers --------------

  private maybeShowOrderOffer() {
    if (this.orderOfferPanel) this.orderOfferPanel.destroy();
    const next = this.orders.pending[0];
    if (!next) return;
    this.orderOfferPanel = this.makeOrderOfferPanel(next);
    // Re-layout on viewport resize so the card keeps its ~45% width cap.
    const handler = () => this.maybeShowOrderOffer();
    this.scale.once("resize", handler);
  }

  private makeOrderOfferPanel(order: Order): Phaser.GameObjects.Container {
    // Responsive sizing: never wider than 45% of screen, but not smaller than 200px.
    const W = Math.max(200, Math.min(240, Math.round(this.scale.width * 0.45)));
    const H = 120;
    const PAD = 6;
    const c = this.add.container(12, 72);
    const bg = this.add.rectangle(0, 0, W, H, 0x1a1422, 0.96)
      .setStrokeStyle(1, 0x8c6a36).setOrigin(0, 0);
    const theme = THEMES[order.theme ?? "regular"];
    const title = this.add.text(PAD, 4, "Новый заказ", {
      fontFamily: "serif", fontSize: "12px", color: "#d7c78b",
    });
    // Theme banner with badge — only shown for non-regular themes.
    let themeBanner: Phaser.GameObjects.GameObject[] = [];
    if (order.theme && order.theme !== "regular") {
      const tw = 110;
      const tBg = this.add.rectangle(W / 2 + 16, 12, tw, 18, theme.badgeColor, 0.85)
        .setStrokeStyle(1, 0xc9a14a).setOrigin(0.5);
      const tTxt = this.add.text(W / 2 + 16, 12, `${theme.badge} ${theme.name}`, {
        fontFamily: "serif", fontSize: "11px", color: "#f5e7bc", fontStyle: "bold",
      }).setOrigin(0.5);
      themeBanner = [tBg, tTxt];
    }
    // Portrait: smaller (scale 1.2 instead of 1.8) to leave room for text.
    const portrait = this.add.image(PAD, 22, portraitKey(order.gender, order.portraitIdx))
      .setOrigin(0, 0).setScale(1.2);
    const tierRus = order.tier === "modest" ? "Скромный" : order.tier === "decent" ? "Достойный" : "Пышный";
    const textX = PAD + 42;
    const textW = W - textX - PAD;
    const name = this.add.text(textX, 22, shorten(order.deceasedName, 18), {
      fontFamily: "serif", fontSize: "11px", color: "#e8e1cf",
      wordWrap: { width: textW },
    });
    const meta = this.add.text(textX, 38, `${tierRus} · ₽${order.budget} · ${order.daysAllowed}дн.`, {
      fontFamily: "serif", fontSize: "9px", color: "#a29680",
    });
    const lux = this.add.text(textX, 50, `Роскошь ${order.minLuxury}–${order.maxLuxury}`, {
      fontFamily: "serif", fontSize: "9px", color: "#a29680",
    });
    const flavor = this.add.text(PAD, 68, shorten(order.flavor, 80), {
      fontFamily: "serif", fontSize: "9px", color: "#9a8f72",
      wordWrap: { width: W - PAD * 2 },
    });
    c.add([bg, title, portrait, name, meta, lux, flavor, ...themeBanner]);

    // Buttons along the bottom, sharing the full width.
    const btnW = Math.floor((W - PAD * 3) / 2);
    const btnY = H - 16;
    const acceptBg = this.add.rectangle(PAD + btnW / 2, btnY, btnW, 22, 0x4a3a20)
      .setStrokeStyle(1, 0xd7c78b);
    const acceptLabel = this.add.text(PAD + btnW / 2, btnY, "Принять", {
      fontFamily: "serif", fontSize: "11px", color: "#f0e7c8",
    }).setOrigin(0.5);
    const declineX = PAD * 2 + btnW + btnW / 2;
    const declineBg = this.add.rectangle(declineX, btnY, btnW, 22, 0x3a2020)
      .setStrokeStyle(1, 0x8c4a36);
    const declineLabel = this.add.text(declineX, btnY, "Отказать", {
      fontFamily: "serif", fontSize: "11px", color: "#ffd7c8",
    }).setOrigin(0.5);
    c.add([acceptBg, acceptLabel, declineBg, declineLabel]);

    // Small collapse toggle in the top-right corner.
    const foldBg = this.add.circle(W - 10, 10, 7, 0x2a1f2f).setStrokeStyle(1, 0x8c6a36);
    const foldLbl = this.add.text(W - 10, 10, "—", {
      fontFamily: "sans-serif", fontSize: "10px", color: "#d7c78b",
    }).setOrigin(0.5);
    c.add([foldBg, foldLbl]);
    let collapsed = false;
    foldBg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
      collapsed = !collapsed;
      for (const obj of [portrait, name, meta, lux, flavor, acceptBg, acceptLabel, declineBg, declineLabel]) {
        (obj as Phaser.GameObjects.GameObject & { visible: boolean }).visible = !collapsed;
      }
      (bg as Phaser.GameObjects.Rectangle).height = collapsed ? 22 : H;
      foldLbl.setText(collapsed ? "+" : "—");
    });

    acceptBg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
      this.orders.accept(order);
      c.destroy();
      this.orderOfferPanel = undefined;
      this.maybeShowOrderOffer();
    });
    declineBg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
      this.orders.decline(order);
      c.destroy();
      this.orderOfferPanel = undefined;
      this.maybeShowOrderOffer();
    });
    return c;
  }

  // -------------- Active orders panel --------------

  private refreshActiveOrders() {
    this.activeOrderPanel.removeAll(true);
    let y = 0;
    const title = this.add.text(0, y, "Активные заказы", { fontFamily: "serif", fontSize: "12px", color: "#d7c78b" }).setOrigin(1, 0);
    this.activeOrderPanel.add(title);
    y += 18;
    for (const o of this.orders.active.slice(0, 4)) {
      const theme = THEMES[o.theme ?? "regular"];
      const bg = this.add.rectangle(0, y, 200, 40, 0x1a1422, 0.9).setStrokeStyle(1, 0x3a2f40).setOrigin(1, 0);
      const tierRus = o.tier === "modest" ? "Скромный" : o.tier === "decent" ? "Достойный" : "Пышный";
      const daysLeft = Math.max(0, o.deadlineDay - this.gameTime.day);
      const txt = this.add.text(-30, y + 4, `${shorten(o.deceasedName, 16)}\n${tierRus} · ₽${o.budget} · ${daysLeft} дн.`, {
        fontFamily: "serif", fontSize: "10px", color: "#e8e1cf",
      }).setOrigin(1, 0);
      this.activeOrderPanel.add([bg, txt]);
      // Theme badge (right side of card)
      if (o.theme && o.theme !== "regular") {
        const badge = this.add.circle(-12, y + 20, 11, theme.badgeColor, 1).setStrokeStyle(1, 0xc9a14a).setOrigin(0.5);
        const bt = this.add.text(-12, y + 20, theme.badge, { fontFamily: "serif", fontSize: "13px", color: "#f0e7c8" }).setOrigin(0.5);
        this.activeOrderPanel.add([badge, bt]);
      }
      y += 46;
    }
    if (this.orders.active.length === 0) {
      const t = this.add.text(0, y, "Нет активных", { fontFamily: "serif", fontSize: "11px", color: "#9a8f72" }).setOrigin(1, 0);
      this.activeOrderPanel.add(t);
    }
  }

  private openOrdersList() {
    this.openModal(c => {
      const title = this.add.text(0, -180, "Журнал заказов", { fontFamily: "serif", fontSize: "20px", color: "#f0e7c8" }).setOrigin(0.5);
      c.add(title);
      let y = -140;
      const addSection = (label: string, items: Order[]) => {
        const t = this.add.text(-280, y, label, { fontFamily: "serif", fontSize: "14px", color: "#d7c78b" });
        c.add(t); y += 20;
        if (items.length === 0) {
          const e = this.add.text(-260, y, "—", { fontFamily: "serif", fontSize: "12px", color: "#6b6456" });
          c.add(e); y += 18;
        }
        for (const o of items) {
          const tier = o.tier === "modest" ? "Скромный" : o.tier === "decent" ? "Достойный" : "Пышный";
          const status = o.completed ? "✓ выполнен" : o.failed ? "✗ провален" : `до дня ${o.deadlineDay}`;
          const txt = this.add.text(-260, y, `${shorten(o.deceasedName, 28)}  —  ${tier} · ₽${o.budget} · ${status}`,
            { fontFamily: "serif", fontSize: "12px", color: "#e8e1cf" });
          c.add(txt); y += 18;
        }
        y += 10;
      };
      addSection("Активные", this.orders.active);
      addSection("Предложены", this.orders.pending);
      addSection("История", this.orders.history.slice(-8));
    });
  }

  // -------------- Context menu on the focused tile --------------

  private openContextMenu(cell: Cell) {
    if (this.contextPanel) { this.contextPanel.destroy(); this.contextPanel = undefined; }
    this.openModal(c => {
      const title = this.add.text(0, -170, this.cellTitle(cell), { fontFamily: "serif", fontSize: "18px", color: "#f0e7c8" }).setOrigin(0.5);
      c.add(title);

      const buttons: { label: string; action: () => void; disabled?: boolean; subtitle?: string }[] = [];

      if (cell.terrain === "plot") {
        buttons.push({
          label: `Копать могилу  (−${10}₽)`,
          action: () => { this.game_.dig(cell); this.closeModal(); this.openContextMenu(cell); },
        });
      }
      if (cell.terrain === "hole" && !cell.grave?.tombstoneId) {
        buttons.push({ label: "Поставить надгробие", action: () => this.openCatalogFor(cell, "tombstone") });
      }
      if (cell.grave?.tombstoneId && !cell.grave.completed) {
        buttons.push({ label: "Сменить надгробие", action: () => this.openCatalogFor(cell, "tombstone") });
        buttons.push({ label: "Украсить цветами", action: () => this.openCatalogFor(cell, "flower") });
        buttons.push({ label: "Фонари", action: () => this.openCatalogFor(cell, "lantern") });
        buttons.push({ label: "Статуя", action: () => this.openCatalogFor(cell, "statue") });
        buttons.push({ label: "Оградка", action: () => this.openCatalogFor(cell, "fence") });
        buttons.push({ label: cell.grave.inscription ? `Надпись: «${shorten(cell.grave.inscription, 16)}»` : "Написать имя", action: () => this.askInscription(cell) });
        buttons.push({ label: `Сдать заказ (роскошь ${this.game_.graveLuxury(cell)})`, action: () => this.openCompleteDialog(cell), disabled: !cell.grave.inscription || this.orders.active.length === 0, subtitle: !cell.grave.inscription ? "Сначала напишите имя" : this.orders.active.length === 0 ? "Нет активных заказов" : undefined });
      }
      if (cell.terrain === "grass") {
        buttons.push({ label: `Положить дорожку (−${8}₽)`, action: () => { this.game_.buildPath(cell); this.closeModal(); } });
      }
      if (cell.terrain === "path") {
        buttons.push({ label: "Убрать дорожку", action: () => { this.game_.removePath(cell); this.closeModal(); } });
      }

      let y = -120;
      for (const b of buttons) {
        const bg = this.add.rectangle(0, y, 360, 36, b.disabled ? 0x2a2230 : 0x3a2c1f, 0.95).setStrokeStyle(1, b.disabled ? 0x555555 : 0x8c6a36);
        const lbl = this.add.text(0, y, b.label, { fontFamily: "serif", fontSize: "14px", color: b.disabled ? "#8c8884" : "#f0e7c8" }).setOrigin(0.5);
        c.add([bg, lbl]);
        if (!b.disabled) {
          bg.setInteractive({ useHandCursor: true }).on("pointerup", b.action);
        }
        if (b.subtitle) {
          const sub = this.add.text(0, y + 14, b.subtitle, { fontFamily: "serif", fontSize: "10px", color: "#9a8f72" }).setOrigin(0.5);
          c.add(sub);
        }
        y += b.subtitle ? 48 : 42;
      }
    });
  }

  private cellTitle(cell: Cell): string {
    if (cell.terrain === "plot") return "Свободный участок";
    if (cell.terrain === "hole" && !cell.grave?.tombstoneId) return "Вырытая могила";
    if (cell.grave?.tombstoneId) {
      const name = cell.grave.inscription ?? "без имени";
      return cell.grave.completed ? `Могила: ${shorten(name, 20)} (готово)` : `Могила: ${shorten(name, 20)}`;
    }
    if (cell.terrain === "grass") return "Газон";
    if (cell.terrain === "path") return "Дорожка";
    return "Участок";
  }

  private openCatalogFor(cell: Cell, category: ItemCategory) {
    this.closeModal();
    this.openModal(c => {
      const title = this.add.text(0, -180, this.categoryTitle(category), { fontFamily: "serif", fontSize: "18px", color: "#f0e7c8" }).setOrigin(0.5);
      c.add(title);
      const items = CATALOG.filter(i => i.category === category);
      let y = -140;
      for (const item of items) {
        const bg = this.add.rectangle(0, y, 400, 40, 0x2a1f2f, 0.95).setStrokeStyle(1, 0x8c6a36);
        const icon = this.add.image(-180, y, item.sprite).setOrigin(0.5, 0.5).setScale(1.2);
        const txt = this.add.text(-150, y - 8, item.name, { fontFamily: "serif", fontSize: "13px", color: "#f0e7c8" });
        const meta = this.add.text(-150, y + 6, `₽${item.cost}  ·  роскошь +${item.luxury}`, { fontFamily: "serif", fontSize: "10px", color: "#a29680" });
        const buyBg = this.add.rectangle(160, y, 60, 26, 0x4a3a20).setStrokeStyle(1, 0xd7c78b);
        const buyLabel = this.add.text(160, y, "Взять", { fontFamily: "serif", fontSize: "12px", color: "#f0e7c8" }).setOrigin(0.5);
        c.add([bg, icon, txt, meta, buyBg, buyLabel]);
        buyBg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
          const ok = category === "tombstone"
            ? this.game_.installTombstone(cell, item)
            : category === "fence"
              ? this.game_.installFence(cell, item)
              : this.game_.addDecoration(cell, item);
          if (ok) { this.closeModal(); this.openContextMenu(cell); }
        });
        y += 44;
      }

      const back = this.add.rectangle(0, y + 16, 160, 28, 0x1a1422).setStrokeStyle(1, 0x8c6a36);
      const backLbl = this.add.text(0, y + 16, "Назад", { fontFamily: "serif", fontSize: "12px", color: "#d7c78b" }).setOrigin(0.5);
      c.add([back, backLbl]);
      back.setInteractive({ useHandCursor: true }).on("pointerup", () => { this.closeModal(); this.openContextMenu(cell); });
    });
  }

  private categoryTitle(category: ItemCategory) {
    switch (category) {
      case "tombstone": return "Надгробия";
      case "flower": return "Цветы";
      case "fence": return "Оградки";
      case "lantern": return "Фонари";
      case "statue": return "Статуи";
    }
  }

  private askInscription(cell: Cell) {
    this.closeModal();
    // Offer quick options: use active orders' names, or free text via prompt.
    this.openModal(c => {
      const title = this.add.text(0, -170, "Выбить имя на надгробии", { fontFamily: "serif", fontSize: "18px", color: "#f0e7c8" }).setOrigin(0.5);
      c.add(title);
      let y = -120;
      for (const o of this.orders.active) {
        const bg = this.add.rectangle(0, y, 420, 32, 0x2a1f2f).setStrokeStyle(1, 0x8c6a36);
        const lbl = this.add.text(-200, y, shorten(o.deceasedName, 44), { fontFamily: "serif", fontSize: "13px", color: "#f0e7c8" }).setOrigin(0, 0.5);
        c.add([bg, lbl]);
        bg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
          this.game_.setInscription(cell, o.deceasedName);
          this.closeModal();
          this.openContextMenu(cell);
        });
        y += 36;
      }
      const customBg = this.add.rectangle(0, y + 10, 260, 32, 0x3a2c1f).setStrokeStyle(1, 0xd7c78b);
      const customLbl = this.add.text(0, y + 10, "Ввести вручную", { fontFamily: "serif", fontSize: "13px", color: "#f0e7c8" }).setOrigin(0.5);
      c.add([customBg, customLbl]);
      customBg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
        const input = window.prompt("Имя на надгробии:");
        if (input && input.trim().length > 0) {
          this.game_.setInscription(cell, input.trim());
        }
        this.closeModal();
        this.openContextMenu(cell);
      });

      const back = this.add.rectangle(0, y + 50, 160, 28, 0x1a1422).setStrokeStyle(1, 0x8c6a36);
      const backLbl = this.add.text(0, y + 50, "Назад", { fontFamily: "serif", fontSize: "12px", color: "#d7c78b" }).setOrigin(0.5);
      c.add([back, backLbl]);
      back.setInteractive({ useHandCursor: true }).on("pointerup", () => { this.closeModal(); this.openContextMenu(cell); });
    });
  }

  private openCompleteDialog(cell: Cell) {
    this.closeModal();
    const lux = this.game_.graveLuxury(cell);
    const pathBonus = this.game_.adjacentPathTiles(cell);
    this.openModal(c => {
      const title = this.add.text(0, -170, "Сдать заказ", { fontFamily: "serif", fontSize: "18px", color: "#f0e7c8" }).setOrigin(0.5);
      c.add(title);
      const info = this.add.text(0, -140,
        `Текущая роскошь: ${lux}\nДорожек рядом: ${pathBonus} (+${pathBonus * 3}₽)\nИмя: ${cell.grave?.inscription ?? "—"}`,
        { fontFamily: "serif", fontSize: "12px", color: "#a29680", align: "center" }).setOrigin(0.5, 0);
      c.add(info);

      let y = -80;
      for (const o of this.orders.active) {
        const match = o.deceasedName === cell.grave?.inscription;
        const verdict = lux < o.minLuxury ? "скромно (≈55%)" :
          lux > o.maxLuxury ? "слишком пышно (−штраф)" :
            this.gameTime.day > o.deadlineDay ? "просрочено (≈40%)" : "идеально (100%)";
        const tier = o.tier === "modest" ? "Скромный" : o.tier === "decent" ? "Достойный" : "Пышный";
        const bg = this.add.rectangle(0, y, 500, 40, match ? 0x2a3f22 : 0x2a1f2f).setStrokeStyle(1, match ? 0x80b050 : 0x8c6a36);
        const lbl = this.add.text(-240, y - 8, shorten(o.deceasedName, 36), { fontFamily: "serif", fontSize: "13px", color: "#f0e7c8" });
        const meta = this.add.text(-240, y + 6, `${tier} · ₽${o.budget} · роскошь ${o.minLuxury}–${o.maxLuxury} · ${verdict}`, {
          fontFamily: "serif", fontSize: "10px", color: "#a29680",
        });
        c.add([bg, lbl, meta]);
        bg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
          this.game_.completeOrder(cell, o);
          this.closeModal();
        });
        y += 44;
      }
      if (this.orders.active.length === 0) {
        const e = this.add.text(0, 0, "Активных заказов нет", { fontFamily: "serif", fontSize: "13px", color: "#9a8f72" }).setOrigin(0.5);
        c.add(e);
      }

      const back = this.add.rectangle(0, y + 20, 160, 28, 0x1a1422).setStrokeStyle(1, 0x8c6a36);
      const backLbl = this.add.text(0, y + 20, "Назад", { fontFamily: "serif", fontSize: "12px", color: "#d7c78b" }).setOrigin(0.5);
      c.add([back, backLbl]);
      back.setInteractive({ useHandCursor: true }).on("pointerup", () => { this.closeModal(); this.openContextMenu(cell); });
    });
  }

  // -------------- Modal helper --------------

  private openModal(draw: (c: Phaser.GameObjects.Container) => void) {
    this.closeModal();
    this.game_.uiModalOpen = true;
    const { width, height } = this.scale;
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0, 0).setInteractive();
    const c = this.add.container(width / 2, height / 2);
    // Cap modal to 92% of viewport so it never runs off-screen on phones.
    const cardW = Math.min(560, Math.max(260, Math.floor(width * 0.92)));
    const cardH = Math.min(380, Math.max(260, Math.floor(height * 0.88)));
    const card = this.add.rectangle(0, 0, cardW, cardH, 0x0f0d18, 0.98)
      .setStrokeStyle(2, 0x8c6a36);
    c.add(card);
    draw(c);
    // Place close button relative to the card dimensions so it stays visible.
    const closeBg = this.add.circle(cardW / 2 - 10, -cardH / 2 + 10, 16, 0x4a2020)
      .setStrokeStyle(1, 0x8c4a36);
    const closeLbl = this.add.text(cardW / 2 - 10, -cardH / 2 + 10, "✕", {
      fontFamily: "serif", fontSize: "18px", color: "#ffd7c8",
    }).setOrigin(0.5);
    c.add([closeBg, closeLbl]);
    closeBg.setInteractive({ useHandCursor: true }).on("pointerup", () => this.closeModal());
    this.modal = c;
    (this.modal as any).__dim = dim;
  }

  // -------------- Settings modal --------------

  private openSettingsModal() {
    audio.play("click");
    this.openModal((c) => {
      const title = this.add.text(0, -160, "⚙  Настройки / Settings", {
        fontFamily: "serif", fontSize: "18px", color: "#e8e1cf", fontStyle: "bold",
      }).setOrigin(0.5);
      c.add(title);

      const rows = [
        { key: "master", label: "Громкость", get: () => audio.prefs.master, set: (v: number) => audio.setMasterVolume(v) },
        { key: "music",  label: "Музыка",   get: () => audio.prefs.music,  set: (v: number) => audio.setMusicVolume(v) },
        { key: "sfx",    label: "Эффекты",  get: () => audio.prefs.sfx,    set: (v: number) => audio.setSfxVolume(v) },
      ];
      rows.forEach((row, idx) => {
        const y = -100 + idx * 38;
        const lbl = this.add.text(-240, y, row.label, {
          fontFamily: "serif", fontSize: "14px", color: "#d7c78b",
        }).setOrigin(0, 0.5);
        const track = this.add.rectangle(80, y, 200, 6, 0x2a2230).setStrokeStyle(1, 0x8c6a36);
        const fill  = this.add.rectangle(-20, y, 200 * row.get(), 6, 0xd7c78b).setOrigin(0, 0.5);
        const val   = this.add.text(200, y, `${Math.round(row.get() * 100)}%`, {
          fontFamily: "serif", fontSize: "12px", color: "#d7c78b",
        }).setOrigin(0, 0.5);
        c.add([lbl, track, fill, val]);
        track.setInteractive({ useHandCursor: true });
        const onPick = (p: Phaser.Input.Pointer) => {
          const localX = p.x - (this.scale.width / 2 + 80);
          const t = Phaser.Math.Clamp((localX + 100) / 200, 0, 1);
          row.set(t);
          fill.width = 200 * t;
          val.setText(`${Math.round(t * 100)}%`);
        };
        track.on("pointerdown", onPick);
        track.on("pointermove", (p: Phaser.Input.Pointer) => { if (p.isDown) onPick(p); });
      });

      // Language toggle
      const langLabel = this.add.text(-240, 30, "Язык / Language", {
        fontFamily: "serif", fontSize: "14px", color: "#d7c78b",
      }).setOrigin(0, 0.5);
      const makeLangBtn = (x: number, text: string, lang: "ru" | "en") => {
        const active = i18n.lang === lang;
        const bg = this.add.rectangle(x, 30, 58, 26, active ? 0x3b2c14 : 0x1a1422)
          .setStrokeStyle(1, 0x8c6a36);
        const lb = this.add.text(x, 30, text, {
          fontFamily: "serif", fontSize: "14px", color: active ? "#ffe8a3" : "#d7c78b",
        }).setOrigin(0.5);
        bg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
          i18n.setLang(lang);
          audio.play("click");
          this.closeModal();
          this.openSettingsModal();
        });
        c.add([bg, lb]);
      };
      makeLangBtn(40, "RU", "ru");
      makeLangBtn(110, "EN", "en");
      c.add(langLabel);

      // Export / import save
      const exportBtn = this.add.rectangle(-100, 90, 180, 30, 0x1a1422).setStrokeStyle(1, 0x8c6a36);
      const exportLbl = this.add.text(-100, 90, "Экспорт сейва", {
        fontFamily: "serif", fontSize: "13px", color: "#d7c78b",
      }).setOrigin(0.5);
      exportBtn.setInteractive({ useHandCursor: true }).on("pointerup", () => {
        const raw = localStorage.getItem("gravemogill.save.v1") ?? "{}";
        try { navigator.clipboard?.writeText(raw); } catch { /* ignore */ }
        window.prompt("Сейв (Ctrl+C для копирования):", raw);
      });
      const importBtn = this.add.rectangle(100, 90, 180, 30, 0x1a1422).setStrokeStyle(1, 0x8c6a36);
      const importLbl = this.add.text(100, 90, "Импорт сейва", {
        fontFamily: "serif", fontSize: "13px", color: "#d7c78b",
      }).setOrigin(0.5);
      importBtn.setInteractive({ useHandCursor: true }).on("pointerup", () => {
        const v = window.prompt("Вставьте JSON сейва:");
        if (!v) return;
        try {
          JSON.parse(v);
          localStorage.setItem("gravemogill.save.v1", v);
          window.alert("Сейв импортирован. Перезагрузите страницу.");
        } catch {
          window.alert("Некорректный JSON");
        }
      });
      c.add([exportBtn, exportLbl, importBtn, importLbl]);

      // Weather line (read-only)
      const w = this.game_.weather?.kind ?? "clear";
      const wx = this.add.text(0, 150, `${WEATHER_ICON[w]}  Сейчас: ${WEATHER_NAME_RU[w]}`, {
        fontFamily: "serif", fontSize: "13px", color: "#9a8f72",
      }).setOrigin(0.5);
      c.add(wx);
    });
  }

  // -------------- Shop modal --------------

  private openShopModal() {
    audio.play("click");
    this.openModal((c) => {
      const title = this.add.text(0, -160, "🛒  Магазин", {
        fontFamily: "serif", fontSize: "18px", color: "#e8e1cf", fontStyle: "bold",
      }).setOrigin(0.5);
      c.add(title);

      const header1 = this.add.text(-240, -120, "Апгрейды лопаты", {
        fontFamily: "serif", fontSize: "14px", color: "#d7c78b", fontStyle: "bold",
      }).setOrigin(0, 0.5);
      c.add(header1);
      SHOVELS.forEach((s, idx) => {
        const y = -96 + idx * 34;
        const owned = SHOVELS.indexOf(SHOVELS.find(x => x.tier === shop.tier)!) >= idx;
        const current = shop.tier === s.tier;
        const bg = this.add.rectangle(0, y, 500, 30, current ? 0x2a2112 : 0x1a1422)
          .setStrokeStyle(1, current ? 0xd7c78b : 0x8c6a36);
        const lbl = this.add.text(-240, y, `${s.icon}  ${s.name}  ·  ${s.description}`, {
          fontFamily: "serif", fontSize: "12px", color: "#d7c78b",
        }).setOrigin(0, 0.5);
        const right = current
          ? "Текущая"
          : owned
          ? "Куплено"
          : `${s.cost}₽`;
        const rlbl = this.add.text(240, y, right, {
          fontFamily: "serif", fontSize: "12px",
          color: current ? "#ffe8a3" : owned ? "#9a8f72" : "#d7c78b",
        }).setOrigin(1, 0.5);
        c.add([bg, lbl, rlbl]);
        if (!current && !owned) {
          bg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
            if (!this.economy.spend(s.cost)) {
              audio.play("fail");
              return;
            }
            shop.setTier(s.tier);
            audio.play("coin");
            this.game_.tryUnlock?.("first_upgrade");
            if (s.tier === "mythril") this.game_.tryUnlock?.("mythril_shovel");
            this.closeModal();
            this.openShopModal();
          });
        }
      });

      const header2 = this.add.text(-240, 60, "Помощники", {
        fontFamily: "serif", fontSize: "14px", color: "#d7c78b", fontStyle: "bold",
      }).setOrigin(0, 0.5);
      c.add(header2);
      HELPERS.forEach((h, idx) => {
        const y = 86 + idx * 34;
        const hired = shop.hasHelper(h.id);
        const bg = this.add.rectangle(0, y, 500, 30, hired ? 0x2a2112 : 0x1a1422)
          .setStrokeStyle(1, hired ? 0xd7c78b : 0x8c6a36);
        const lbl = this.add.text(-240, y, `${h.icon}  ${h.name}  ·  ${h.description}`, {
          fontFamily: "serif", fontSize: "12px", color: "#d7c78b",
        }).setOrigin(0, 0.5);
        const rlbl = this.add.text(240, y, hired ? "Нанят" : `${h.cost}₽`, {
          fontFamily: "serif", fontSize: "12px", color: hired ? "#ffe8a3" : "#d7c78b",
        }).setOrigin(1, 0.5);
        c.add([bg, lbl, rlbl]);
        if (!hired) {
          bg.setInteractive({ useHandCursor: true }).on("pointerup", () => {
            if (!this.economy.spend(h.cost)) { audio.play("fail"); return; }
            shop.hireHelper(h.id);
            audio.play("coin");
            this.closeModal();
            this.openShopModal();
          });
        }
      });
    });
  }

  // -------------- Achievements modal --------------

  private openAchievementsModal() {
    audio.play("click");
    this.openModal((c) => {
      const unlockedCount = ACHIEVEMENTS.filter(a => progress.isUnlocked(a.id)).length;
      const title = this.add.text(0, -165, `🏆  Достижения — ${unlockedCount}/${ACHIEVEMENTS.length}`, {
        fontFamily: "serif", fontSize: "16px", color: "#e8e1cf", fontStyle: "bold",
      }).setOrigin(0.5);
      c.add(title);
      // Two columns, compact list.
      const col = (i: number) => (i % 2 === 0 ? -270 : 10);
      const rowY = (i: number) => -135 + Math.floor(i / 2) * 22;
      ACHIEVEMENTS.forEach((a, i) => {
        const unl = progress.isUnlocked(a.id);
        const line = this.add.text(col(i), rowY(i), `${unl ? a.icon : "·"}  ${a.title}`, {
          fontFamily: "serif", fontSize: "11px",
          color: unl ? "#ffe8a3" : "#6a6a72",
        }).setOrigin(0, 0.5);
        c.add(line);
      });
    });
  }

  private closeModal() {
    if (this.modal) {
      const dim = (this.modal as any).__dim as Phaser.GameObjects.Rectangle | undefined;
      dim?.destroy();
      this.modal.destroy();
      this.modal = undefined;
    }
    this.game_.uiModalOpen = false;
  }

  /**
   * Public API called from GameScene when an achievement is unlocked. Shows a
   * gold-trimmed toast at the top-centre of the screen for ~3s.
   */
  showAchievementToast(title: string, icon: string, reward: number) {
    const { width } = this.scale;
    const w = 320, h = 72;
    const x = (width - w) / 2;
    const y = 16;
    const container = this.add.container(0, y).setDepth(10000);

    const panel = this.add.rectangle(x, 0, w, h, 0x1b151f, 0.96).setOrigin(0, 0);
    panel.setStrokeStyle(2, 0xe3b94f);

    const iconText = this.add.text(x + 16, h / 2, icon, {
      fontFamily: "sans-serif", fontSize: "36px", color: "#ffe89e",
    }).setOrigin(0, 0.5).setShadow(1, 1, "#000", 3);

    const headline = this.add.text(x + 60, 10, "Достижение разблокировано", {
      fontFamily: "serif", fontSize: "13px", color: "#b9a97a",
    });
    const titleText = this.add.text(x + 60, 26, title, {
      fontFamily: "serif", fontSize: "20px", color: "#f0e7c8",
      fontStyle: "bold",
    }).setShadow(1, 1, "#000", 2);
    const rewardText = this.add.text(x + 60, 50, `+${reward}₽`, {
      fontFamily: "serif", fontSize: "14px", color: "#8ac23e",
    });

    container.add([panel, iconText, headline, titleText, rewardText]);
    container.setAlpha(0);
    container.y = y - 20;

    this.tweens.add({
      targets: container,
      alpha: 1,
      y: y,
      duration: 260,
      ease: "Quad.Out",
    });
    this.tweens.add({
      targets: container,
      alpha: 0,
      y: y - 20,
      delay: 2600,
      duration: 400,
      ease: "Quad.In",
      onComplete: () => container.destroy(),
    });
  }
}

function shorten(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}


