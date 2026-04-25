import Phaser from "phaser";
import { CONFIG, WORLD_W, WORLD_H, tileToIso } from "../data/config";
import { Grid, type Cell } from "../utils/grid";
import { Player } from "../entities/Player";
import { Cat } from "../entities/Cat";
import { Zombie } from "../entities/Zombie";
import { Economy } from "../systems/Economy";
import { TimeSystem } from "../systems/TimeSystem";
import { OrderSystem, type Order } from "../systems/OrderSystem";
import { itemById, type CatalogItem } from "../data/catalog";
import { progress } from "../systems/Progress";
import { audio } from "../systems/Audio";
import { saveGame, readSave } from "../systems/SaveSystem";
import { Weather, pickWeather } from "../systems/Weather";
import { shop } from "../systems/Shop";

interface DecorationInstance {
  item: CatalogItem;
  image: Phaser.GameObjects.Image;
}

interface GraveVisual {
  tombstone?: Phaser.GameObjects.Image;
  decorations: DecorationInstance[];
  fence?: Phaser.GameObjects.Image;
  inscription?: Phaser.GameObjects.Text;
  orderId?: string;
  completed: boolean;
}

export class GameScene extends Phaser.Scene {
  grid!: Grid;
  economy!: Economy;
  gameTime!: TimeSystem;
  orders!: OrderSystem;

  player!: Player;
  cat!: Cat;
  private zombies: Zombie[] = [];
  private zombieSpawnCooldown = 0; // ms — wait before next spawn attempt

  // Rendering layers
  layerTerrain!: Phaser.GameObjects.Container;
  layerDecor!: Phaser.GameObjects.Container;
  tileSprites: Phaser.GameObjects.Image[][] = [];
  graveVisuals: Map<string, GraveVisual> = new Map();

  // Highlight for the "focused" tile in front of the player
  focusRect!: Phaser.GameObjects.Graphics;
  focusedCell?: Cell;

  // Input state
  keys = { up: false, down: false, left: false, right: false };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private pendingOrdersTimer = 0;
  private minPendingOrders = 2;

  // Currently active pop-ups (drawn by UI scene). Used to freeze time.
  uiModalOpen = false;

  private startingBonus = 0;
  private shouldLoadSave = false;
  private autosaveTimer = 0;
  weather!: Weather;
  private lastWeatherDay = -1;
  private lastAchievementDay = -1;

  constructor() { super("Game"); }

  init(data: { startingBonus?: number; loadSave?: boolean }) {
    this.startingBonus = data?.startingBonus ?? 0;
    this.shouldLoadSave = !!data?.loadSave;
  }

  create() {
    // Game world setup
    this.grid = new Grid();
    this.economy = new Economy();
    this.gameTime = new TimeSystem();
    this.orders = new OrderSystem();

    // Daily login bonus (credited on fresh days).
    if (this.startingBonus > 0) {
      this.economy.earn(this.startingBonus);
    }

    // Share state so UIScene can read/write via registry + direct refs
    this.registry.set("economy", this.economy);
    this.registry.set("time", this.gameTime);
    this.registry.set("orders", this.orders);
    this.registry.set("game", this);

    this.cameras.main.setBackgroundColor(0x0b0b12);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setZoom(CONFIG.UPSCALE);

    // Terrain layer
    this.layerTerrain = this.add.container(0, 0).setDepth(-10);
    this.layerDecor = this.add.container(0, 0).setDepth(1);
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const row: Phaser.GameObjects.Image[] = [];
      for (let c = 0; c < CONFIG.COLS; c++) {
        const { x, y } = tileToIso(c, r);
        // Iso tiles are 32×16 diamonds, origin at top-centre of the diamond
        // (so `y` is the top vertex). We want the centre of the tile to land
        // at the iso coord, so anchor (0.5, 0.5) and shift down by half a tile.
        const img = this.add.image(x, y, this.terrainKey(this.grid.cells[r][c]))
          .setOrigin(0.5, 0.5);
        img.setDepth(-1000 + c + r); // ground layer, with iso sort
        this.layerTerrain.add(img);
        row.push(img);
      }
      this.tileSprites.push(row);
    }

    // Focus highlight (moves with player) — a diamond outline matching the iso tile.
    const diamond = this.add.graphics();
    diamond.lineStyle(1, 0xf0e7c8, 0.9);
    diamond.beginPath();
    diamond.moveTo(0, -CONFIG.ISO_H / 2);
    diamond.lineTo(CONFIG.ISO_W / 2, 0);
    diamond.lineTo(0, CONFIG.ISO_H / 2);
    diamond.lineTo(-CONFIG.ISO_W / 2, 0);
    diamond.closePath();
    diamond.strokePath();
    this.focusRect = diamond;
    this.focusRect.setDepth(5).setVisible(false);

    // Entities
    const spawn = this.grid.tileToWorldCenter(14, 17);
    this.player = new Player(this, spawn.x, spawn.y);
    const catSpawn = this.grid.tileToWorldCenter(12, 17);
    this.cat = new Cat(this, catSpawn.x, catSpawn.y);

    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      E: Phaser.Input.Keyboard.KeyCodes.E,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // Action key
    (this.wasd.SPACE as Phaser.Input.Keyboard.Key).on("down", () => this.triggerAction());
    (this.wasd.E as Phaser.Input.Keyboard.Key).on("down", () => this.triggerAction());

    // Cat crystal hookup
    this.cat.on("crystalCollected", (value: number, x: number, y: number, rare?: boolean) => {
      this.economy.earn(value);
      const color = rare ? "#e7b5ff" : "#a8f0ff";
      const label = rare ? `+${value}₽ РЕДКИЙ кристалл!` : `+${value}₽ кристалл`;
      this.showFloatText(label, x, y, color);
      audio.play(rare ? "rareCrystal" : "crystal");
      this.tryUnlock("crystal_finder");
      if (rare) this.tryUnlock("rare_crystal");
      progress.bump("crystalsCollected");
      if (rare) progress.bump("rareCrystalsCollected");
    });

    // Money milestone achievements
    this.economy.on("changed", () => {
      if (this.economy.money >= 100) this.tryUnlock("tycoon_100");
      if (this.economy.money >= 1000) this.tryUnlock("tycoon_1000");
    });

    // Order acceptance
    this.orders.on("accepted", () => {
      audio.play("click");
      this.tryUnlock("first_order");
    });

    // Order events
    this.orders.on("completed", ({ order, payout, verdict }: { order: Order; payout: number; verdict: string }) => {
      this.economy.earn(payout);
      const cell = this.grid.at(order.graveCol!, order.graveRow!);
      const v = cell?.grave ? this.graveVisuals.get(graveKey(order.graveCol!, order.graveRow!)) : undefined;
      if (v) v.completed = true;
      const color = verdict === "perfect" ? "#b8e994" : verdict === "over" ? "#e6a94a" : verdict === "under" ? "#ffd080" : "#ff7070";
      const msg = verdict === "perfect" ? "Идеально!" : verdict === "over" ? "Слишком пышно" : verdict === "under" ? "Скромновато" : "Просрочено";
      this.showFloatText(`${msg} +${payout}₽`, this.player.x, this.player.y - 20, color);
      audio.play(verdict === "failed" ? "fail" : "success");
      audio.play("coin");
      this.tryUnlock("first_complete");
      const n = progress.bump("ordersCompleted");
      if (n >= 5) this.tryUnlock("five_graves");
      if (n >= 20) this.tryUnlock("twenty_graves");
      if (verdict === "perfect") {
        const p = progress.bump("perfectOrders");
        if (p >= 3) this.tryUnlock("three_perfect");
      }
    });

    this.orders.on("failed", (order: Order) => {
      this.economy.earn(-Math.floor(order.budget * 0.2)); // reputation penalty
      audio.play("fail");
      this.showFloatText(`Заказ провален! −${Math.floor(order.budget * 0.2)}₽`, this.player.x, this.player.y - 20, "#ff6868");
    });

    // End of day: path daily income, deadline check, spawn more orders.
    this.gameTime.on("dayChanged", (day: number) => {
      this.payDailyPathIncome();
      this.orders.checkDeadlines(day);
      // Ensure we keep at least N pending orders offered.
      while (this.orders.pending.length < this.minPendingOrders) this.orders.generate(day);
    });

    if (this.shouldLoadSave) {
      this.applySave();
    } else {
      // Seed starting orders for a brand new game.
      this.orders.generate(this.gameTime.day);
      this.orders.generate(this.gameTime.day);
    }

    // Start ambient soundtrack (resume if already running).
    audio.music.start();

    // Weather system: picks a new kind every in-game morning.
    this.weather = new Weather(this);
    this.weather.setKind(pickWeather());
    this.lastWeatherDay = this.gameTime.day;

    // Resize handling
    this.scale.on("resize", () => this.refreshZoom());
    this.refreshZoom();

    // Save on tab close / hide (mobile + desktop). Removed on shutdown.
    const saveOnHide = () => this.saveNow();
    window.addEventListener("beforeunload", saveOnHide);
    window.addEventListener("pagehide", saveOnHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.saveNow();
    });
    this.events.once("shutdown", () => {
      window.removeEventListener("beforeunload", saveOnHide);
      window.removeEventListener("pagehide", saveOnHide);
    });
  }

  update(_t: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    if (!this.uiModalOpen) this.gameTime.tick(deltaMs);

    // Keyboard input
    this.keys.up = this.cursors.up!.isDown || this.wasd.W.isDown;
    this.keys.down = this.cursors.down!.isDown || this.wasd.S.isDown;
    this.keys.left = this.cursors.left!.isDown || this.wasd.A.isDown;
    this.keys.right = this.cursors.right!.isDown || this.wasd.D.isDown;

    if (!this.uiModalOpen) {
      this.player.update(dt, this.keys);
      // Keep player in bounds
      this.player.sprite.x = Phaser.Math.Clamp(this.player.sprite.x, 8, WORLD_W - 8);
      this.player.sprite.y = Phaser.Math.Clamp(this.player.sprite.y, 10, WORLD_H - 2);
      this.cat.update(dt, this.player.x, this.player.y);
      for (const z of this.zombies) z.update(dt, this.player.x, this.player.y);
    }
    this.zombies = this.zombies.filter(z => !z.dead);

    // Zombie spawning: at night (22:00-05:00), chance every few seconds if
    // there's at least one completed grave and fewer than 2 zombies on screen.
    this.zombieSpawnCooldown -= deltaMs;
    if (this.zombieSpawnCooldown <= 0 && !this.uiModalOpen) {
      this.zombieSpawnCooldown = 4000 + Math.random() * 4000;
      this.maybeSpawnZombie();
    }

    // Autosave every 10 seconds while not in a modal.
    this.autosaveTimer += deltaMs;
    if (this.autosaveTimer > 10_000 && !this.uiModalOpen) {
      this.autosaveTimer = 0;
      this.saveNow();
    }

    // Weather: re-roll once per in-game day. Night tint is continuous.
    if (this.weather) {
      if (this.gameTime.day !== this.lastWeatherDay) {
        this.lastWeatherDay = this.gameTime.day;
        this.weather.setKind(pickWeather());
      }
      this.weather.update(dt);
      this.weather.applyNightTint(this.gameTime.hour);
    }

    // Opportunistic achievements tied to weather / night / time.
    if (this.weather) {
      if (this.weather.kind === "rain" && this.gameTime.day !== this.lastAchievementDay) {
        this.tryUnlock("rain_survivor");
      }
      if (this.weather.kind === "fog" && this.gameTime.day !== this.lastAchievementDay) {
        this.tryUnlock("fog_walker");
      }
      this.lastAchievementDay = this.gameTime.day;
    }
    const hour = this.gameTime.hour;
    if (hour >= 0 && hour < 2) this.tryUnlock("night_owl");

    // Focused cell = tile the player is currently standing on
    const { col, row } = this.grid.worldToTile(this.player.x, this.player.y - 2);
    const cell = this.grid.at(col, row);
    this.focusedCell = cell;
    if (cell) {
      const iso = tileToIso(col, row);
      this.focusRect.setPosition(iso.x, iso.y).setVisible(true);
    } else {
      this.focusRect.setVisible(false);
    }

    // Depth sorting by y for nice overlap
    this.player.sprite.setDepth(this.player.y);
    this.cat.sprite.setDepth(this.cat.sprite.y);

    // Broadcast a state tick so UI can update HUD
    this.events.emit("state");
    this.pendingOrdersTimer += deltaMs;
    if (this.pendingOrdersTimer > 30000) {
      this.pendingOrdersTimer = 0;
      if (this.orders.pending.length < this.minPendingOrders + 1) this.orders.generate(this.gameTime.day);
    }
  }

  // ===== Terrain / visuals =====

  private terrainKey(cell: Cell): string {
    switch (cell.terrain) {
      case "grass": return pickGrass(cell.col, cell.row);
      case "plot": return "tile_plot";
      case "hole": return "tile_hole";
      case "path": return "tile_path";
    }
  }

  private redrawTile(col: number, row: number) {
    const cell = this.grid.at(col, row);
    if (!cell) return;
    this.tileSprites[row][col].setTexture(this.terrainKey(cell));
  }

  // ===== Actions =====

  /** Called by SPACE/E or the on-screen button. Opens a context menu on the UI scene for the focused cell. */
  triggerAction() {
    if (this.uiModalOpen) return;
    // If there's a zombie within whacking range, dispel it instead of
    // opening the context menu.
    const hit = this.zombies
      .filter(z => !z.dead && z.distanceTo(this.player.x, this.player.y) < 14)
      .sort((a, b) => a.distanceTo(this.player.x, this.player.y) - b.distanceTo(this.player.x, this.player.y))[0];
    if (hit) {
      hit.dispel(true);
      return;
    }
    if (!this.focusedCell) return;
    this.scene.get("UI").events.emit("openContext", this.focusedCell);
  }

  /** Spawn a zombie at a random completed grave if conditions are right. */
  private maybeSpawnZombie() {
    if (this.zombies.length >= 5) return;
    const hour = this.gameTime.hour;
    const isNight = hour >= 20;
    if (!isNight) return;
    const candidates: Array<{ col: number; row: number }> = [];
    for (const [key, v] of this.graveVisuals.entries()) {
      if (!v.completed) continue;
      const [cs, rs] = key.split(",");
      const col = parseInt(cs, 10);
      const row = parseInt(rs, 10);
      if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
      candidates.push({ col, row });
    }
    if (candidates.length === 0) return;
    if (Math.random() > 0.45) return;
    // Sometimes a pack of 2-3 rises together.
    const packSize = Math.random() < 0.25 ? Phaser.Math.Between(2, 3) : 1;
    for (let i = 0; i < packSize && this.zombies.length < 5; i++) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const { x, y } = this.grid.tileToWorldCenter(pick.col, pick.row);
      const variantRoll = Math.random();
      const variant =
        variantRoll < 0.5  ? "normal" :
        variantRoll < 0.75 ? "skinny" :
        variantRoll < 0.92 ? "fat"    : "headless";
      const z = new Zombie(this, x + Phaser.Math.Between(-4, 4), y + 4, variant);
      this.zombies.push(z);
      audio.play("zombieRise");
      z.on("dispelled", (byPlayer: boolean, zx: number, zy: number, vr: string) => {
        if (byPlayer) {
          // Variant-specific bounty.
          const base = vr === "fat" ? 60 : vr === "headless" ? 90 : vr === "skinny" ? 35 : 40;
          const reward = Phaser.Math.Between(base, base + 40);
          this.economy.earn(reward);
          audio.play("zombieHit");
          audio.play("coin");
          this.showFloatText(`Упокоен +${reward}₽`, zx, zy, "#a0ffc5");
          this.tryUnlock("first_zombie");
          const n = progress.bump("zombiesDispelled");
          if (n >= 5)  this.tryUnlock("zombie_hunter");
          if (n >= 25) this.tryUnlock("zombie_slayer");
          if (vr === "headless") this.tryUnlock("headless_hunter");
        } else {
          audio.play("zombieGone");
          this.showFloatText("Рассыпался в прах", zx, zy, "#a0b6a0");
        }
      });
    }
  }

  /** Dig a grave on a plot cell (cost applied). */
  dig(cell: Cell): boolean {
    if (cell.terrain !== "plot") return false;
    const cost = Math.max(1, Math.round(CONFIG.DIG_COST * shop.digCostMultiplier()));
    if (!this.economy.spend(cost)) {
      this.showFloatText("Нет денег на инструмент", this.player.x, this.player.y - 20, "#ff8080");
      return false;
    }
    cell.terrain = "hole";
    cell.grave = { decorations: [] };
    this.redrawTile(cell.col, cell.row);
    audio.play("dig");
    this.tryUnlock("first_grave");
    this.maybeHint("place_tomb");
    this.showFloatText(`Выкопано −${cost}₽`, this.player.x, this.player.y - 20, "#e6a94a");
    return true;
  }

  /** Place (or replace) a tombstone. Cost deducted. */
  installTombstone(cell: Cell, item: CatalogItem): boolean {
    if (cell.terrain !== "hole" || item.category !== "tombstone") return false;
    if (!this.economy.spend(item.cost)) {
      this.showFloatText("Не хватает денег", this.player.x, this.player.y - 20, "#ff8080");
      return false;
    }
    const key = graveKey(cell.col, cell.row);
    let v = this.graveVisuals.get(key);
    if (!v) { v = { decorations: [], completed: false }; this.graveVisuals.set(key, v); }
    if (v.tombstone) v.tombstone.destroy();
    const { x, y } = this.grid.tileToWorldCenter(cell.col, cell.row);
    v.tombstone = this.add.image(x, y + 4, item.sprite).setOrigin(0.5, 0.9).setDepth(y + 10);
    this.layerDecor.add(v.tombstone);
    cell.grave!.tombstoneId = item.id;
    audio.play("place");
    this.maybeHint("add_decor");
    this.maybeHint("inscribe");
    this.showFloatText(`${item.name} −${item.cost}₽`, this.player.x, this.player.y - 20, "#b8e994");
    return true;
  }

  addDecoration(cell: Cell, item: CatalogItem): boolean {
    if (!cell.grave?.tombstoneId) return false;
    if (!this.economy.spend(item.cost)) {
      this.showFloatText("Не хватает денег", this.player.x, this.player.y - 20, "#ff8080");
      return false;
    }
    const v = this.graveVisuals.get(graveKey(cell.col, cell.row))!;
    const { x, y } = this.grid.tileToWorldCenter(cell.col, cell.row);
    // Scatter decor around the grave
    const slot = v.decorations.length;
    let dx = 0, dy = 0;
    if (item.category === "flower") {
      const pattern = [[-5, 4], [5, 4], [-6, -2], [6, -2], [0, 5]];
      [dx, dy] = pattern[slot % pattern.length];
    } else if (item.category === "lantern") {
      const pattern = [[-7, -1], [7, -1]];
      [dx, dy] = pattern[slot % pattern.length];
    } else if (item.category === "statue") {
      dx = 0; dy = -7;
    }
    const img = this.add.image(x + dx, y + dy, item.sprite).setOrigin(0.5, 0.9).setDepth(y + 12);
    this.layerDecor.add(img);
    v.decorations.push({ item, image: img });
    cell.grave!.decorations.push(item.id);
    audio.play("place");
    this.tryUnlock("first_decor");
    this.showFloatText(`${item.name} −${item.cost}₽`, this.player.x, this.player.y - 20, "#b8e994");
    return true;
  }

  installFence(cell: Cell, item: CatalogItem): boolean {
    if (!cell.grave?.tombstoneId || item.category !== "fence") return false;
    if (!this.economy.spend(item.cost)) {
      this.showFloatText("Не хватает денег", this.player.x, this.player.y - 20, "#ff8080");
      return false;
    }
    const v = this.graveVisuals.get(graveKey(cell.col, cell.row))!;
    if (v.fence) v.fence.destroy();
    const { x, y } = this.grid.tileToWorldCenter(cell.col, cell.row);
    v.fence = this.add.image(x, y + 8, item.sprite).setOrigin(0.5, 1).setDepth(y + 2);
    this.layerDecor.add(v.fence);
    cell.grave!.fence = item.id;
    this.showFloatText(`${item.name} −${item.cost}₽`, this.player.x, this.player.y - 20, "#b8e994");
    return true;
  }

  setInscription(cell: Cell, text: string) {
    if (!cell.grave?.tombstoneId) return;
    const v = this.graveVisuals.get(graveKey(cell.col, cell.row))!;
    if (v.inscription) v.inscription.destroy();
    const { x, y } = this.grid.tileToWorldCenter(cell.col, cell.row);
    v.inscription = this.add.text(x, y - 4, shorten(text, 14), {
      fontFamily: "serif", fontSize: "4px", color: "#1a1a1a", align: "center", wordWrap: { width: 14 },
    }).setOrigin(0.5, 0.5).setResolution(4).setDepth(y + 11);
    this.layerDecor.add(v.inscription);
    cell.grave!.inscription = text;
    this.maybeHint("complete");
  }

  buildPath(cell: Cell): boolean {
    if (cell.terrain !== "grass") return false;
    if (!this.economy.spend(CONFIG.PATH_COST)) {
      this.showFloatText("Не хватает на дорожку", this.player.x, this.player.y - 20, "#ff8080");
      return false;
    }
    cell.terrain = "path";
    this.redrawTile(cell.col, cell.row);
    audio.play("path");
    this.tryUnlock("path_builder");
    this.maybeHint("paths");
    this.showFloatText(`Дорожка −${CONFIG.PATH_COST}₽`, this.player.x, this.player.y - 20, "#e6a94a");
    return true;
  }

  removePath(cell: Cell): boolean {
    if (cell.terrain !== "path") return false;
    cell.terrain = "grass";
    this.redrawTile(cell.col, cell.row);
    return true;
  }

  /** Compute luxury for a grave based on installed items. */
  graveLuxury(cell: Cell): number {
    if (!cell.grave?.tombstoneId) return 0;
    let total = 0;
    const tomb = itemById(cell.grave.tombstoneId);
    if (tomb) total += tomb.luxury;
    for (const id of cell.grave.decorations) {
      const it = itemById(id);
      if (it) total += it.luxury;
    }
    if (cell.grave.fence) {
      const it = itemById(cell.grave.fence);
      if (it) total += it.luxury;
    }
    if (cell.grave.inscription) total += 4;
    return total;
  }

  /** Count adjacent path tiles (4-neighbourhood). */
  adjacentPathTiles(cell: Cell): number {
    let n = 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = this.grid.at(cell.col + dc, cell.row + dr);
      if (c?.terrain === "path") n++;
    }
    return n;
  }

  /** Complete an order on the given cell. */
  completeOrder(cell: Cell, order: Order) {
    if (!cell.grave?.tombstoneId) return;
    if (!cell.grave.inscription) return;
    const lux = this.graveLuxury(cell);
    const pathBonus = this.adjacentPathTiles(cell);
    order.graveCol = cell.col;
    order.graveRow = cell.row;
    cell.grave.orderId = order.id;
    cell.grave.completed = true;
    const v = this.graveVisuals.get(graveKey(cell.col, cell.row));
    if (v) { v.orderId = order.id; v.completed = true; }
    this.orders.complete(order, lux, pathBonus, this.gameTime.day);
  }

  /** Per-day income from paths. */
  private payDailyPathIncome() {
    let paths = 0;
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        if (this.grid.cells[r][c].terrain === "path") paths++;
      }
    }
    if (paths > 0) {
      const gain = paths * CONFIG.PATH_INCOME_PER_DAY;
      this.economy.earn(gain);
      this.showFloatText(`Доход от дорожек +${gain}₽`, this.player.x, this.player.y - 20, "#a8e3a8");
    }
  }

  tryUnlock(id: string) {
    const def = progress.unlock(id);
    if (!def) return;
    // Award coin bonus and show a toast via the UI scene.
    this.economy.earn(def.rewardCoins);
    audio.play("unlock");
    const ui = this.scene.get("UI") as Phaser.Scene & {
      showAchievementToast?: (title: string, icon: string, reward: number) => void;
    };
    if (ui && typeof ui.showAchievementToast === "function") {
      ui.showAchievementToast(def.title, def.icon, def.rewardCoins);
    }
  }

  /** Public: writes the full game state to localStorage. */
  saveNow() {
    saveGame({
      economy: this.economy,
      time: this.gameTime,
      orders: this.orders,
      grid: this.grid,
      playerX: this.player?.x,
      playerY: this.player?.y,
    });
  }

  /** Rebuild world state from a previously-saved snapshot. Called during create(). */
  private applySave() {
    const s = readSave();
    if (!s) return;
    this.economy.money = s.money;
    this.economy.emit("changed", this.economy.money, 0);
    this.gameTime.day = s.day;
    this.gameTime.hour = s.hour;
    (this.gameTime as unknown as { accum: number; lastHour: number }).accum = s.accum ?? 0;
    (this.gameTime as unknown as { accum: number; lastHour: number }).lastHour = s.hour;
    // Restore grid: default everything back to grass-with-initial-plots, then
    // apply overrides from the save.
    for (const row of this.grid.cells) {
      for (const cell of row) {
        cell.grave = undefined;
      }
    }
    for (const snap of s.cells) {
      const cell = this.grid.at(snap.c, snap.r);
      if (!cell) continue;
      cell.terrain = snap.t;
      if (snap.g) {
        cell.grave = {
          tombstoneId: snap.g.tombstoneId,
          decorations: [...snap.g.decorations],
          fence: snap.g.fence,
          inscription: snap.g.inscription,
          orderId: snap.g.orderId,
          completed: snap.g.completed,
        };
      }
      this.redrawTile(cell.col, cell.row);
    }
    // Rebuild grave visuals (tombstone, decorations, fence, inscription).
    for (const row of this.grid.cells) {
      for (const cell of row) {
        if (!cell.grave) continue;
        const v = { decorations: [] as DecorationInstance[], completed: !!cell.grave.completed };
        this.graveVisuals.set(graveKey(cell.col, cell.row), v as unknown as GraveVisual);
        const { x, y } = this.grid.tileToWorldCenter(cell.col, cell.row);
        if (cell.grave.tombstoneId) {
          const item = itemById(cell.grave.tombstoneId);
          if (item) {
            (v as GraveVisual).tombstone = this.add.image(x, y + 4, item.sprite)
              .setOrigin(0.5, 0.9).setDepth(y + 10);
            this.layerDecor.add((v as GraveVisual).tombstone!);
          }
        }
        if (cell.grave.fence) {
          const item = itemById(cell.grave.fence);
          if (item) {
            (v as GraveVisual).fence = this.add.image(x, y + 2, item.sprite)
              .setOrigin(0.5, 0.9).setDepth(y + 9);
            this.layerDecor.add((v as GraveVisual).fence!);
          }
        }
        for (const did of cell.grave.decorations) {
          const item = itemById(did);
          if (!item) continue;
          let dx = 0, dy = 0;
          if (item.category === "flower") { dx = -5 + Math.floor(Math.random() * 11); dy = -1 + Math.floor(Math.random() * 3); }
          else if (item.category === "lantern") { dx = item.id.includes("oil") ? -6 : 6; dy = -4; }
          else { dx = 0; dy = -7; }
          const img = this.add.image(x + dx, y + dy, item.sprite).setOrigin(0.5, 0.9).setDepth(y + 12);
          this.layerDecor.add(img);
          (v as GraveVisual).decorations.push({ item, image: img });
        }
        if (cell.grave.inscription) {
          const text = cell.grave.inscription;
          const inscription = this.add.text(x, y - 4, shorten(text, 14), {
            fontFamily: "serif", fontSize: "4px", color: "#1a1a1a", align: "center", wordWrap: { width: 14 },
          }).setOrigin(0.5, 0.5).setResolution(4).setDepth(y + 11);
          this.layerDecor.add(inscription);
          (v as GraveVisual).inscription = inscription;
        }
      }
    }
    // Orders
    this.orders.pending = s.pending ?? [];
    this.orders.active = s.active ?? [];
    this.orders.history = s.history ?? [];
    // Restore player position if available.
    if (typeof s.playerX === "number" && typeof s.playerY === "number") {
      this.player.sprite.x = s.playerX;
      this.player.sprite.y = s.playerY;
    }
  }

  private maybeHint(id: string) {
    const ui = this.scene.get("UI") as Phaser.Scene & { tryHint?: (id: string) => void };
    if (ui && typeof ui.tryHint === "function") {
      // Delay so it doesn't collide with other toasts fired in the same frame.
      this.time.delayedCall(400, () => ui.tryHint!(id));
    }
  }

  private showFloatText(text: string, x: number, y: number, color: string) {
    const t = this.add.text(x, y, text, {
      fontFamily: "serif", fontSize: "6px", color, stroke: "#000", strokeThickness: 1,
    }).setOrigin(0.5, 1).setDepth(1000).setResolution(4);
    this.tweens.add({
      targets: t, y: y - 16, alpha: 0, duration: 1200, ease: "Sine.Out",
      onComplete: () => t.destroy(),
    });
  }

  private refreshZoom() {
    // Fit the cemetery into the viewport if it would overflow; otherwise use UPSCALE.
    const vw = this.scale.width;
    const vh = this.scale.height;
    const maxZoomX = vw / WORLD_W;
    const maxZoomY = vh / WORLD_H;
    const fitZoom = Math.min(maxZoomX, maxZoomY);
    const zoom = Math.max(1, Math.min(CONFIG.UPSCALE, fitZoom * 1.8));
    this.cameras.main.setZoom(zoom);
  }
}

function pickGrass(col: number, row: number): string {
  const h = (col * 73856093) ^ (row * 19349663);
  const m = Math.abs(h) % 3;
  return `tile_grass_${m}`;
}

export function graveKey(col: number, row: number): string {
  return `${col},${row}`;
}

function shorten(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
