import Phaser from "phaser";
import * as THREE from "three";
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
import { reputation } from "../systems/Reputation";
import { Weather, pickWeather, type WeatherKind } from "../systems/Weather";
import { shop } from "../systems/Shop";
import { ThreeWorld } from "../three/ThreeWorld";

interface DecorationInstance {
  item: CatalogItem;
  image: Phaser.GameObjects.Image;
  mesh?: THREE.Object3D;
}

interface GraveVisual {
  tombstone?: Phaser.GameObjects.Image;
  decorations: DecorationInstance[];
  fence?: Phaser.GameObjects.Image;
  inscription?: Phaser.GameObjects.Text;
  orderId?: string;
  completed: boolean;
  tombstoneMesh?: THREE.Object3D;
  fenceMesh?: THREE.Object3D;
  holeMesh?: THREE.Object3D;
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

  // Rendering layers (kept only as invisible data holders — actual rendering
  // happens in Three.js via `three`).
  layerTerrain!: Phaser.GameObjects.Container;
  layerDecor!: Phaser.GameObjects.Container;
  tileSprites: Phaser.GameObjects.Image[][] = [];
  graveVisuals: Map<string, GraveVisual> = new Map();

  // 3D world renderer. Owns the THREE scene / camera / meshes.
  three!: ThreeWorld;
  private propMeshes: THREE.Object3D[] = [];

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

    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Initialise the 3D world renderer. It mounts its own canvas behind
    // the Phaser canvas via the #app element.
    const appEl = document.getElementById("app") ?? document.body;
    this.three = new ThreeWorld(appEl);
    this.three.buildGround(this.grid.cells);
    this.registry.set("three", this.three);

    // Phaser data-only containers; not drawn (Phaser camera shows nothing).
    this.layerTerrain = this.add.container(0, 0).setAlpha(0);
    this.layerDecor = this.add.container(0, 0).setAlpha(0);
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const row: Phaser.GameObjects.Image[] = [];
      for (let c = 0; c < CONFIG.COLS; c++) {
        const { x, y } = tileToIso(c, r);
        const img = this.add.image(x, y, this.terrainKey(this.grid.cells[r][c]))
          .setOrigin(0.5, 0.5)
          .setAlpha(0);
        this.layerTerrain.add(img);
        row.push(img);
      }
      this.tileSprites.push(row);
    }

    // Focus highlight is drawn in Three.js; retain an invisible Phaser
    // Graphics handle so legacy setVisible()/setPosition() calls still work.
    this.focusRect = this.add.graphics().setVisible(false).setAlpha(0);

    // Static necropolis decor (chapel, mausoleums, statues, pre-placed graves).
    this.placeNecropolisStructures();

    // Entities
    const spawn = this.grid.tileToWorldCenter(14, 17);
    this.player = new Player(this, spawn.x, spawn.y);
    this.player.sprite.setAlpha(0);
    this.player.shadow.setAlpha(0);
    this.player.mesh3D = this.three.addPlayerMesh();

    const catSpawn = this.grid.tileToWorldCenter(12, 17);
    this.cat = new Cat(this, catSpawn.x, catSpawn.y);
    this.cat.sprite.setAlpha(0);
    if (this.cat.shadow) this.cat.shadow.setAlpha(0);
    this.cat.mesh3D = this.three.addCatMesh();

    // Camera follow is handled by ThreeWorld (orbit around the player).
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
    this.orders.on("completed", ({ order, payout, verdict, themeBonus }: { order: Order; payout: number; verdict: string; themeBonus?: number }) => {
      this.economy.earn(payout);
      const cell = this.grid.at(order.graveCol!, order.graveRow!);
      const v = cell?.grave ? this.graveVisuals.get(graveKey(order.graveCol!, order.graveRow!)) : undefined;
      if (v) v.completed = true;
      const color = verdict === "perfect" ? "#b8e994" : verdict === "over" ? "#e6a94a" : verdict === "under" ? "#ffd080" : "#ff7070";
      const msg = verdict === "perfect" ? "Идеально!" : verdict === "over" ? "Слишком пышно" : verdict === "under" ? "Скромновато" : "Просрочено";
      this.showFloatText(`${msg} +${payout}₽`, this.player.x, this.player.y - 20, color);
      if (themeBonus && themeBonus > 0) {
        this.time.delayedCall(450, () => {
          this.showFloatText(`Тема исполнена! +${themeBonus}₽`, this.player.x, this.player.y - 36, "#d8b8ff");
        });
      }
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
    const initialWeather = pickWeather();
    this.weather.setKind(initialWeather);
    this.three?.setWeather(initialWeather);
    this.lastWeatherDay = this.gameTime.day;
    // Keep 3D scene in sync with 2D Weather state when it changes.
    this.weather.on("changed", (k: WeatherKind) => {
      this.three?.setWeather(k);
      this.events.emit("weather", k);
    });

    // Resize handling + camera zoom/pan controls
    this.scale.on("resize", () => this.refreshZoom());
    this.refreshZoom();
    this.installCameraControls();

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
      // In first-person mode, movement is relative to the camera yaw so
      // "forward" always means "where the player is looking". In top-down
      // mode we pass 0 so WASD maps directly to world directions.
      const camYaw = this.three.firstPerson ? this.three.lookYaw : 0;
      this.player.update(dt, this.keys, camYaw);
      // Make the staff-orb light follow the player.
      this.three.ensurePlayerLantern();
      // Keep player in bounds
      this.player.sprite.x = Phaser.Math.Clamp(this.player.sprite.x, 8, WORLD_W - 8);
      this.player.sprite.y = Phaser.Math.Clamp(this.player.sprite.y, 10, WORLD_H - 2);
      this.cat.update(dt, this.player.x, this.player.y);
      for (const z of this.zombies) z.update(dt, this.player.x, this.player.y);
    }
    // Remove 3D meshes for zombies that just died.
    for (const z of this.zombies) {
      if (z.dead && z.mesh3D) {
        this.three.removeMesh(z.mesh3D);
        z.mesh3D = undefined;
      }
    }
    this.zombies = this.zombies.filter(z => !z.dead);

    // ----- Sync Three.js meshes to Phaser entity positions -----
    if (this.player.mesh3D) {
      const p = this.three.phaserToThree(this.player.x, this.player.y);
      this.player.mesh3D.position.set(p.x, 0, p.z);
      this.player.mesh3D.visible = true;
      this.player.mesh3D.rotation.y = this.player.facingYaw;
      // Keep staff-orb light tracking the player's facing.
      this.three.setPlayerYaw(this.player.facingYaw);
    }
    if (this.cat.mesh3D) {
      const c = this.three.phaserToThree(this.cat.sprite.x, this.cat.sprite.y);
      this.cat.mesh3D.position.set(c.x, 0, c.z);
      this.cat.mesh3D.rotation.y = this.cat.facingYaw;
    }
    for (const z of this.zombies) {
      if (!z.mesh3D) continue;
      const zp = this.three.phaserToThree(z.sprite.x, z.sprite.y);
      // Rise animation: push down into ground during emerge phase.
      const sink = (1 - z.emergePhase) * 1.2;
      z.mesh3D.position.set(zp.x, -sink, zp.z);
      z.mesh3D.rotation.y = z.facingYaw;
    }
    // Center the orbit camera on the player.
    const op = this.three.phaserToThree(this.player.x, this.player.y);
    this.three.setOrbitTarget(op.x, op.z);
    this.three.render();

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
      this.three.setFocus(col, row, true);
    } else {
      this.three.setFocus(0, 0, false);
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
      z.sprite.setAlpha(0);
      z.shadow.setAlpha(0);
      z.mesh3D = this.three.addZombieMesh(variant);
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
    this.three?.setTileTerrain(cell.col, cell.row, "hole");
    // Add a small dirt-mound mesh at the grave site.
    const key = graveKey(cell.col, cell.row);
    let v = this.graveVisuals.get(key);
    if (!v) { v = { decorations: [], completed: false }; this.graveVisuals.set(key, v); }
    v.holeMesh = this.three.addGraveHoleMesh(cell.col, cell.row);
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
    if (v.tombstoneMesh) this.three.removeMesh(v.tombstoneMesh);
    const { x, y } = this.grid.tileToWorldCenter(cell.col, cell.row);
    v.tombstone = this.add.image(x, y + 4, item.sprite).setOrigin(0.5, 0.9).setAlpha(0);
    this.layerDecor.add(v.tombstone);
    v.tombstoneMesh = this.three.addProp(item.sprite, cell.col, cell.row) ?? undefined;
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
    const img = this.add.image(x + dx, y + dy, item.sprite).setOrigin(0.5, 0.9).setAlpha(0);
    this.layerDecor.add(img);
    // 3D decor mesh at a small offset inside the plot.
    const mesh = this.three.meshForKey(item.sprite);
    if (mesh) {
      const offX = dx / CONFIG.ISO_W; // tiny sub-tile offset
      const offZ = dy / CONFIG.ISO_H;
      const { x: tx, z: tz } = this.three["phaserToThree"]
        ? this.three.phaserToThree(x + dx, y + dy)
        : { x: 0, z: 0 };
      mesh.position.set(tx, 0, tz);
      // tiny random rotation for variety
      mesh.rotation.y = Math.random() * Math.PI * 2;
      this.three.scene.add(mesh);
      // mark unused vars
      void offX; void offZ;
    }
    v.decorations.push({ item, image: img, mesh: mesh ?? undefined });
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
    if (v.fenceMesh) this.three.removeMesh(v.fenceMesh);
    const { x, y } = this.grid.tileToWorldCenter(cell.col, cell.row);
    v.fence = this.add.image(x, y + 8, item.sprite).setOrigin(0.5, 1).setAlpha(0);
    this.layerDecor.add(v.fence);
    v.fenceMesh = this.three.addProp(item.sprite, cell.col, cell.row) ?? undefined;
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
    this.three?.setTileTerrain(cell.col, cell.row, "path");
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
    this.three?.setTileTerrain(cell.col, cell.row, "grass");
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
    this.orders.complete(order, lux, pathBonus, this.gameTime.day, {
      tombstoneId: cell.grave.tombstoneId,
      decorations: [...cell.grave.decorations],
      fence: cell.grave.fence,
    });
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
      this.three?.setTileTerrain(cell.col, cell.row, cell.terrain);
    }
    // Rebuild grave visuals (tombstone, decorations, fence, inscription).
    for (const row of this.grid.cells) {
      for (const cell of row) {
        if (!cell.grave) continue;
        const v = { decorations: [] as DecorationInstance[], completed: !!cell.grave.completed };
        this.graveVisuals.set(graveKey(cell.col, cell.row), v as unknown as GraveVisual);
        const { x, y } = this.grid.tileToWorldCenter(cell.col, cell.row);
        if (cell.terrain === "hole") {
          (v as GraveVisual).holeMesh = this.three.addGraveHoleMesh(cell.col, cell.row);
        }
        if (cell.grave.tombstoneId) {
          const item = itemById(cell.grave.tombstoneId);
          if (item) {
            (v as GraveVisual).tombstone = this.add.image(x, y + 4, item.sprite)
              .setOrigin(0.5, 0.9).setAlpha(0);
            this.layerDecor.add((v as GraveVisual).tombstone!);
            (v as GraveVisual).tombstoneMesh = this.three.addProp(item.sprite, cell.col, cell.row) ?? undefined;
          }
        }
        if (cell.grave.fence) {
          const item = itemById(cell.grave.fence);
          if (item) {
            (v as GraveVisual).fence = this.add.image(x, y + 2, item.sprite)
              .setOrigin(0.5, 0.9).setAlpha(0);
            this.layerDecor.add((v as GraveVisual).fence!);
            (v as GraveVisual).fenceMesh = this.three.addProp(item.sprite, cell.col, cell.row) ?? undefined;
          }
        }
        for (const did of cell.grave.decorations) {
          const item = itemById(did);
          if (!item) continue;
          let dx = 0, dy = 0;
          if (item.category === "flower") { dx = -5 + Math.floor(Math.random() * 11); dy = -1 + Math.floor(Math.random() * 3); }
          else if (item.category === "lantern") { dx = item.id.includes("oil") ? -6 : 6; dy = -4; }
          else { dx = 0; dy = -7; }
          const img = this.add.image(x + dx, y + dy, item.sprite).setOrigin(0.5, 0.9).setAlpha(0);
          this.layerDecor.add(img);
          const mesh = this.three.meshForKey(item.sprite);
          if (mesh) {
            const { x: tx, z: tz } = this.three.phaserToThree(x + dx, y + dy);
            mesh.position.set(tx, 0, tz);
            mesh.rotation.y = Math.random() * Math.PI * 2;
            this.three.scene.add(mesh);
          }
          (v as GraveVisual).decorations.push({ item, image: img, mesh: mesh ?? undefined });
        }
        if (cell.grave.inscription) {
          const text = cell.grave.inscription;
          const inscription = this.add.text(x, y - 4, shorten(text, 14), {
            fontFamily: "serif", fontSize: "4px", color: "#1a1a1a", align: "center", wordWrap: { width: 14 },
          }).setOrigin(0.5, 0.5).setResolution(4).setAlpha(0);
          this.layerDecor.add(inscription);
          (v as GraveVisual).inscription = inscription;
        }
      }
    }
    // Orders
    this.orders.pending = s.pending ?? [];
    this.orders.active = s.active ?? [];
    this.orders.history = s.history ?? [];
    // Reputation
    if (typeof s.reputation === "number") {
      reputation.load({ points: s.reputation });
    }
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

  private placeNecropolisStructures() {
    // Large static props that make the map look like an existing necropolis.
    // Each position creates an invisible Phaser placeholder (kept for legacy
    // depth sorting compatibility) plus a real 3D mesh in the Three.js scene.
    const place = (key: string, col: number, row: number, scale = 1, yaw = 0) => {
      const { x, y } = this.grid.tileToWorldCenter(col, row);
      const img = this.add.image(x, y + CONFIG.ISO_H / 2, key)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setAlpha(0);
      this.layerDecor.add(img);
      const mesh = this.three.addProp(key, col, row, { yaw, scale });
      if (mesh) this.propMeshes.push(mesh);
      return img;
    };

    // Entrance gate at top-centre, flanking the central aisle.
    place("build_gate", 19, 2, 1);
    // Chapel at top-left plaza.
    place("build_chapel", 6, 5, 1);
    // Mausoleums — two on left field, two on right field, symmetric.
    place("build_mausoleum", 12, 6, 1);
    place("build_mausoleum", 28, 6, 1);
    place("build_mausoleum", 4, 17, 1);
    place("build_mausoleum", 36, 17, 1);
    // Big memorial cross at the cross-aisle intersection, slightly off-centre.
    place("build_bigcross", 19, 15, 1);
    // Small crypts scattered in the lower necropolis.
    place("build_crypt", 8, 24, 1);
    place("build_crypt", 15, 25, 1);
    place("build_crypt", 24, 24, 1);
    place("build_crypt", 32, 25, 1);

    // Decorative pre-placed tombstones scattered across open plots so the
    // cemetery looks lived-in from the start. These are NOT interactive
    // graves (no grave data on the cell) — just art.
    const propTombs = [
      { key: "tomb_celtic",      col: 14, row: 8 },
      { key: "tomb_broken",      col: 17, row: 8 },
      { key: "tomb_stone",       col: 22, row: 8 },
      { key: "tomb_wood",        col: 25, row: 10 },
      { key: "tomb_marble",      col: 10, row: 12 },
      { key: "tomb_stone",       col: 32, row: 14 },
      { key: "tomb_broken",      col: 6,  row: 18 },
      { key: "tomb_celtic",      col: 34, row: 20 },
      { key: "tomb_obelisk",     col: 27, row: 18 },
      { key: "tomb_angel",       col: 13, row: 20 },
      { key: "tomb_wood",        col: 28, row: 22 },
      { key: "tomb_stone",       col: 17, row: 27 },
      { key: "tomb_broken",      col: 23, row: 27 },
    ];
    for (const t of propTombs) {
      const cell = this.grid.at(t.col, t.row);
      if (cell) cell.terrain = "hole"; // visual: sits on dirt
      place(t.key, t.col, t.row, 1);
    }

    // Scatter a handful of flower tufts on grass between rows.
    const propFlowers = [
      { key: "flower_white",  col: 8,  row: 16 },
      { key: "flower_yellow", col: 23, row: 16 },
      { key: "flower_red",    col: 14, row: 21 },
      { key: "flower_blue",   col: 26, row: 21 },
      { key: "flower_purple", col: 5,  row: 24 },
      { key: "flower_pink",   col: 35, row: 24 },
      { key: "flower_ghost",  col: 19, row: 5  },
      { key: "flower_rose",   col: 20, row: 27 },
    ];
    for (const f of propFlowers) place(f.key, f.col, f.row, 1.1);
  }

  private refreshZoom() {
    // Legacy no-op; camera zoom is handled in Three.js now.
  }

  setCameraZoom(_z: number) {
    // Legacy method; maps arbitrary zoom numbers to 3D orbit distance.
    // Higher numeric zoom = closer → smaller distance.
    if (!this.three) return;
    const d = Math.max(this.three.minDistance, Math.min(this.three.maxDistance, 30 / Math.max(0.5, _z)));
    this.three.setZoom(d);
  }

  zoomIn() {
    if (!this.three) return;
    this.three.setZoom(this.three.orbitDistance * 0.85);
  }
  zoomOut() {
    if (!this.three) return;
    this.three.setZoom(this.three.orbitDistance * 1.15);
  }

  private installCameraControls() {
    // Top-down perspective 3D camera: orbit-style with a steep pitch so the
    // map reads like a proper top-down, but with enough tilt that 3D tomb
    // heights are visible.
    this.three.setFirstPerson(false);
    // Steeper pitch = closer to true top-down. 1.15 ≈ 66°.
    this.three.orbitAngleV = 1.1;
    this.three.orbitAngleH = 0;
    this.three.orbitDistance = 16;

    // Mouse wheel → zoom.
    this.input.on("wheel", (_p: Phaser.Input.Pointer, _go: unknown, _dx: number, dy: number) => {
      if (this.uiModalOpen) return;
      this.three.setZoom(this.three.orbitDistance * (dy > 0 ? 1.12 : 0.88));
    });

    // Pinch → zoom (two-finger).
    let pinchStartDist = 0;
    let pinchStartDistance3D = 0;
    this.input.on("pointermove", () => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (p1?.isDown && p2?.isDown) {
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (pinchStartDist === 0) {
          pinchStartDist = d;
          pinchStartDistance3D = this.three.orbitDistance;
        } else if (d > 0) {
          this.three.setZoom(pinchStartDistance3D * (pinchStartDist / d));
        }
      } else {
        pinchStartDist = 0;
      }
    });

    // Keyboard Q/R rotate yaw for a bit of free look.
    this.input.keyboard?.on("keydown-Q", () => this.three.rotateBy(-0.12, 0));
    this.input.keyboard?.on("keydown-R", () => this.three.rotateBy(0.12, 0));
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
