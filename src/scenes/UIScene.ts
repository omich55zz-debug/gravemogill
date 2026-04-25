import Phaser from "phaser";
import type { GameScene } from "./GameScene";
import type { Economy } from "../systems/Economy";
import type { TimeSystem } from "../systems/TimeSystem";
import type { OrderSystem, Order } from "../systems/OrderSystem";
import { CATALOG, type ItemCategory } from "../data/catalog";
import type { Cell } from "../utils/grid";
import { portraitKey } from "../utils/sprites";

/**
 * Parallel HUD scene. Draws everything in screen-space (Phaser at natural resolution).
 */
export class UIScene extends Phaser.Scene {
  private hudMoney!: Phaser.GameObjects.Text;
  private hudDay!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private activeOrderPanel!: Phaser.GameObjects.Container;
  private orderOfferPanel?: Phaser.GameObjects.Container;
  private contextPanel?: Phaser.GameObjects.Container;
  private modal?: Phaser.GameObjects.Container;

  private stickBase!: Phaser.GameObjects.Arc;
  private stickKnob!: Phaser.GameObjects.Arc;
  private stickActive = false;
  private stickPointerId?: number;
  private actionBtn!: Phaser.GameObjects.Container;

  constructor() { super({ key: "UI", active: false }); }

  get game_(): GameScene { return this.registry.get("game") as GameScene; }
  get economy(): Economy { return this.registry.get("economy") as Economy; }
  get gameTime(): TimeSystem { return this.registry.get("time") as TimeSystem; }
  get orders(): OrderSystem { return this.registry.get("orders") as OrderSystem; }

  create() {
    const { width } = this.scale;

    // Top HUD bar
    const bar = this.add.graphics();
    bar.fillStyle(0x0c0a14, 0.85).fillRect(0, 0, width, 56);
    bar.lineStyle(1, 0x3a2f40, 0.6).strokeRect(0, 56, width, 0);

    this.hudMoney = this.add.text(16, 14, "₽ 0", { fontFamily: "serif", fontSize: "22px", color: "#f0e7c8" });
    this.add.text(16, 36, "Казна", { fontFamily: "serif", fontSize: "11px", color: "#9a8f72" });

    this.hudDay = this.add.text(width / 2, 14, "День 1", { fontFamily: "serif", fontSize: "20px", color: "#e8e1cf" }).setOrigin(0.5, 0);
    this.hudTime = this.add.text(width / 2, 36, "08:00", { fontFamily: "serif", fontSize: "12px", color: "#9a8f72" }).setOrigin(0.5, 0);

    this.hudHint = this.add.text(width - 16, 14, "", { fontFamily: "serif", fontSize: "14px", color: "#d7c78b" }).setOrigin(1, 0);

    // Active order panel (top-right, below HUD)
    this.activeOrderPanel = this.add.container(width - 16, 64);

    // Bottom controls: virtual stick + action button
    this.createVirtualStick();
    this.createActionButton();

    // Orders button (opens list of offered orders)
    this.createOrdersButton();

    // Listeners
    this.economy.on("changed", () => this.refreshHud());
    this.gameTime.on("hourChanged", () => this.refreshHud());
    this.gameTime.on("dayChanged", () => this.refreshHud());
    this.orders.on("offered", () => this.maybeShowOrderOffer());
    this.orders.on("accepted", () => this.refreshActiveOrders());
    this.orders.on("completed", () => this.refreshActiveOrders());
    this.orders.on("failed", () => this.refreshActiveOrders());

    this.game_.events.on("state", () => this.refreshActionHint());

    // Context menu requested by GameScene
    this.events.on("openContext", (cell: Cell) => this.openContextMenu(cell));

    // Resize
    this.scale.on("resize", () => this.layoutResponsive());
    this.layoutResponsive();
    this.refreshHud();
    this.refreshActiveOrders();
    this.maybeShowOrderOffer();
  }

  // -------------- HUD --------------

  private refreshHud() {
    this.hudMoney.setText(`₽ ${this.economy.money}`);
    this.hudDay.setText(`День ${this.gameTime.day}`);
    this.hudTime.setText(this.gameTime.timeString());
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
    this.activeOrderPanel.setPosition(width - 16, 64);

    this.stickBase.setPosition(90, height - 90);
    this.stickKnob.setPosition(90, height - 90);

    this.actionBtn.setPosition(width - 90, height - 90);
  }

  // -------------- Virtual stick --------------

  private createVirtualStick() {
    const { height } = this.scale;
    this.stickBase = this.add.circle(90, height - 90, 54, 0x000000, 0.35).setStrokeStyle(2, 0x8c6a36, 0.8).setScrollFactor(0);
    this.stickKnob = this.add.circle(90, height - 90, 24, 0x8c6a36, 0.9).setStrokeStyle(2, 0xd7c78b, 0.8).setScrollFactor(0);
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
    const max = 44;
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
    this.actionBtn = this.add.container(width - 90, height - 90);
    const bg = this.add.circle(0, 0, 42, 0x8c6a36, 0.9).setStrokeStyle(2, 0xd7c78b, 0.8);
    const label = this.add.text(0, 0, "Действие", { fontFamily: "serif", fontSize: "13px", color: "#f0e7c8" }).setOrigin(0.5);
    this.actionBtn.add([bg, label]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", () => this.game_.triggerAction());
  }

  // -------------- Orders button --------------

  private createOrdersButton() {
    const btn = this.add.container(this.scale.width - 90, 120);
    const bg = this.add.rectangle(0, 0, 140, 36, 0x2a1f2f, 0.9).setStrokeStyle(1, 0x8c6a36);
    const label = this.add.text(0, 0, "Заказы", { fontFamily: "serif", fontSize: "14px", color: "#f0e7c8" }).setOrigin(0.5);
    btn.add([bg, label]);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerup", () => this.openOrdersList());

    this.scale.on("resize", () => btn.setPosition(this.scale.width - 90, 120));
  }

  // -------------- Order offers --------------

  private maybeShowOrderOffer() {
    if (this.orderOfferPanel) this.orderOfferPanel.destroy();
    const next = this.orders.pending[0];
    if (!next) return;
    this.orderOfferPanel = this.makeOrderOfferPanel(next);
  }

  private makeOrderOfferPanel(order: Order): Phaser.GameObjects.Container {
    const c = this.add.container(16, 76);
    const bg = this.add.rectangle(0, 0, 240, 150, 0x1a1422, 0.95).setStrokeStyle(1, 0x8c6a36).setOrigin(0, 0);
    const title = this.add.text(8, 6, "Новый заказ", { fontFamily: "serif", fontSize: "14px", color: "#d7c78b" });
    const portrait = this.add.image(16, 30, portraitKey(order.gender, order.portraitIdx)).setOrigin(0, 0).setScale(1.8);
    const name = this.add.text(60, 28, shorten(order.deceasedName, 20), { fontFamily: "serif", fontSize: "12px", color: "#e8e1cf" });
    const tierRus = order.tier === "modest" ? "Скромный" : order.tier === "decent" ? "Достойный" : "Пышный";
    const meta = this.add.text(60, 44, `${tierRus}\n₽${order.budget}  /  ${order.daysAllowed} дн.\nРоскошь ${order.minLuxury}–${order.maxLuxury}`, { fontFamily: "serif", fontSize: "10px", color: "#a29680" });
    const flavor = this.add.text(8, 92, shorten(order.flavor, 60), { fontFamily: "serif", fontSize: "10px", color: "#9a8f72", wordWrap: { width: 224 } });
    c.add([bg, title, portrait, name, meta, flavor]);

    const acceptBg = this.add.rectangle(60, 132, 100, 24, 0x4a3a20).setStrokeStyle(1, 0xd7c78b);
    const acceptLabel = this.add.text(60, 132, "Принять", { fontFamily: "serif", fontSize: "12px", color: "#f0e7c8" }).setOrigin(0.5);
    const declineBg = this.add.rectangle(180, 132, 100, 24, 0x3a2020).setStrokeStyle(1, 0x8c4a36);
    const declineLabel = this.add.text(180, 132, "Отказать", { fontFamily: "serif", fontSize: "12px", color: "#ffd7c8" }).setOrigin(0.5);
    c.add([acceptBg, acceptLabel, declineBg, declineLabel]);

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
      const bg = this.add.rectangle(0, y, 200, 40, 0x1a1422, 0.9).setStrokeStyle(1, 0x3a2f40).setOrigin(1, 0);
      const tierRus = o.tier === "modest" ? "Скромный" : o.tier === "decent" ? "Достойный" : "Пышный";
      const daysLeft = Math.max(0, o.deadlineDay - this.gameTime.day);
      const txt = this.add.text(-6, y + 4, `${shorten(o.deceasedName, 18)}\n${tierRus} · ₽${o.budget} · ${daysLeft} дн.`, {
        fontFamily: "serif", fontSize: "10px", color: "#e8e1cf",
      }).setOrigin(1, 0);
      this.activeOrderPanel.add([bg, txt]);
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
    const card = this.add.rectangle(0, 0, 560, 380, 0x0f0d18, 0.98).setStrokeStyle(2, 0x8c6a36);
    c.add(card);
    draw(c);
    const closeBg = this.add.circle(270, -170, 16, 0x4a2020).setStrokeStyle(1, 0x8c4a36);
    const closeLbl = this.add.text(270, -170, "✕", { fontFamily: "serif", fontSize: "18px", color: "#ffd7c8" }).setOrigin(0.5);
    c.add([closeBg, closeLbl]);
    closeBg.setInteractive({ useHandCursor: true }).on("pointerup", () => this.closeModal());
    this.modal = c;
    (this.modal as any).__dim = dim;
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


