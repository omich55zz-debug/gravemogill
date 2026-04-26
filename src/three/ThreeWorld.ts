import * as THREE from "three";
import { CONFIG } from "../data/config";
import type { Cell } from "../utils/grid";
import {
  tombStone, tombObelisk, tombCross, tombMarble, tombAngel,
  tombCeltic, tombWood, tombSarco, tombBroken,
  buildingMausoleum, buildingChapel, buildingCrypt, buildingBigCross, buildingGate,
  flower, fenceWood, fenceIron, fenceStone,
  decorBouquet, decorCandle, decorWreath, decorBible,
  decorBonePile, decorSkull, decorLanternPole, decorStoneUrn,
  decorDirtMound, decorCrossStake, decorPumpkin,
  entityPlayer, entityCat, entityZombie, graveHole,
  tree, grassClump, pond, raven,
} from "./meshes";
import {
  grassGroundTexture, stonePathTexture, earthTexture, nightSkyTexture,
} from "./textures";
import { loadCharacter, robeColors, orbColors } from "../systems/Customization";

// 1 tile = 1 world unit in Three.js space.
// Grid (col, row) maps to world (x=col-COLS/2, 0, z=row-ROWS/2).
// Player/cat/zombie entities position in the same space.

export function tileToWorld(col: number, row: number): { x: number; z: number } {
  return {
    x: col - CONFIG.COLS / 2 + 0.5,
    z: row - CONFIG.ROWS / 2 + 0.5,
  };
}

export function worldToTile(x: number, z: number): { col: number; row: number } {
  return {
    col: x + CONFIG.COLS / 2 - 0.5,
    row: z + CONFIG.ROWS / 2 - 0.5,
  };
}

export class ThreeWorld {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  canvas: HTMLCanvasElement;

  private ground!: THREE.Mesh;
  private tileMeshesByType: Map<string, THREE.InstancedMesh> = new Map();
  focusRing!: THREE.LineSegments;

  // Tile type map for the current cemetery (col,row -> terrain)
  private tileTypes: string[][] = [];

  // Camera orbit params (orbit mode, used as fallback / for UI).
  private orbitTarget = new THREE.Vector3(0, 0, 0);
  orbitDistance = 18;
  orbitAngleH = Math.PI / 4; // yaw
  orbitAngleV = Math.PI / 3.5; // pitch
  minDistance = 5;
  maxDistance = 55;

  // First-person camera state.
  /** If true, camera is at player head height and orbits via yaw/pitch look. */
  firstPerson = false;
  /** Yaw (around Y) of player's look/body — exposed so GameScene can use it for movement vector. */
  lookYaw = 0;
  /** Pitch (around X) of head — clamped. */
  lookPitch = 0;
  /** Eye position (set each frame from player world x/z). */
  private eye = new THREE.Vector3(0, 1.65, 0);

  // Extra decorative lights (kept warm for lanterns).
  private torchLights: Array<{ light: THREE.PointLight; phase: number; intensity: number }> = [];

  constructor(parent: HTMLElement) {
    this.scene = new THREE.Scene();
    // Dark gothic night — night sky panorama, very dense low-visibility fog.
    this.scene.background = nightSkyTexture();
    // Top-down camera sits ~16 units away; push fog far enough that the
    // whole cemetery block is visible but still atmospheric.
    this.scene.fog = new THREE.Fog(0x0a0f18, 22, 70);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.canvas = this.renderer.domElement;
    this.canvas.style.position = "absolute";
    this.canvas.style.inset = "0";
    this.canvas.style.zIndex = "0";
    this.canvas.style.imageRendering = "auto";
    parent.appendChild(this.canvas);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);

    // Lighting — dark gothic:
    //  • ambient kept low so scene is legible but moody
    //  • 'sun' repurposed as cold moonlight from above
    //  • warm fill from opposite side simulates distant torches / lantern glow
    this.ambient = new THREE.HemisphereLight(0x5a6a88, 0x18120e, 0.35);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xb8caff, 0.85);
    this.sun.position.set(-12, 28, -10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = 30;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 90;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Warm opposite-side fill (distant torches).
    const fill = new THREE.DirectionalLight(0xff9a48, 0.18);
    fill.position.set(14, 6, 12);
    this.scene.add(fill);

    window.addEventListener("resize", () => this.onResize());
    this.onResize();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Build the cemetery ground from a 2D array of terrain type strings.
   * Each tile is a 1×1 quad with slight per-tile color variance.
   */
  buildGround(cells: Cell[][]) {
    this.tileTypes = cells.map((row) => row.map((c) => c.terrain));
    const cols = cells[0].length;
    const rows = cells.length;

    // Base grass ground (single large plane underneath everything).
    const groundGeo = new THREE.PlaneGeometry(cols, rows, cols, rows);
    // Displace slightly for subtle bumpiness.
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (Math.sin(i * 1.3) + Math.cos(i * 2.1)) * 0.015);
    }
    groundGeo.computeVertexNormals();
    const grassTex = grassGroundTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, -0.01, 0);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.rebuildTileLayers();
    this.placeEnvironment(cols, rows);

    // Focus ring marker
    const ringGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.98, 0.98));
    const ringMat = new THREE.LineBasicMaterial({ color: 0xfff4d6, transparent: true, opacity: 0.9 });
    this.focusRing = new THREE.LineSegments(ringGeo, ringMat);
    this.focusRing.rotation.x = -Math.PI / 2;
    this.focusRing.position.y = 0.03;
    this.focusRing.visible = false;
    this.scene.add(this.focusRing);
  }

  /**
   * Scatter trees, shrubs, and a pond around the cemetery edges and along the
   * outer ring. Non-interactive decorations. Placed on non-path/non-plot tiles
   * so they don't overlap gameplay content.
   */
  private placeEnvironment(cols: number, rows: number) {
    const isGrass = (c: number, r: number) => {
      return this.tileTypes[r]?.[c] === "grass";
    };
    const worldC = (c: number, r: number) => ({
      x: c - cols / 2 + 0.5,
      z: r - rows / 2 + 0.5,
    });
    // Shuffle a fixed-seed RNG so layout is deterministic per-session.
    let s = 1234567;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    // Trees — bias to the border of the map. Gothic mix: mostly gnarled
    // dead oaks, peppered with dark pines.
    const treeVariants: Array<"dead" | "pine"> = ["dead", "dead", "dead", "pine", "dead", "pine"];
    for (let i = 0; i < 32; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const onEdge = rnd() < 0.7;
        const c = onEdge
          ? (rnd() < 0.5 ? (rnd() * 3) | 0 : cols - 1 - ((rnd() * 3) | 0))
          : (rnd() * cols) | 0;
        const r = onEdge
          ? (rnd() < 0.5 ? (rnd() * 3) | 0 : rows - 1 - ((rnd() * 3) | 0))
          : (rnd() * rows) | 0;
        if (!isGrass(c, r)) continue;
        const variant = treeVariants[(rnd() * treeVariants.length) | 0];
        const t = tree(variant);
        const { x, z } = worldC(c, r);
        t.position.set(x + (rnd() - 0.5) * 0.4, 0, z + (rnd() - 0.5) * 0.4);
        t.scale.setScalar(0.85 + rnd() * 0.35);
        t.rotation.y = rnd() * Math.PI * 2;
        this.scene.add(t);
        break;
      }
    }
    // Grass clumps scattered everywhere on grass.
    for (let i = 0; i < 80; i++) {
      for (let tries = 0; tries < 10; tries++) {
        const c = (rnd() * cols) | 0;
        const r = (rnd() * rows) | 0;
        if (!isGrass(c, r)) continue;
        const gc = grassClump();
        const { x, z } = worldC(c, r);
        gc.position.set(x + (rnd() - 0.5) * 0.6, 0, z + (rnd() - 0.5) * 0.6);
        gc.scale.setScalar(0.7 + rnd() * 0.5);
        this.scene.add(gc);
        break;
      }
    }
    // Pond near one edge of map.
    const pondObj = pond(2.2);
    pondObj.position.set(-cols / 2 + 4.5, 0, rows / 2 - 4.5);
    this.scene.add(pondObj);

    // Scatter warm flickering torches along the main path and at corners so
    // the cemetery isn't pitch-black beyond the player's lantern reach.
    const torchPositions: Array<[number, number]> = [
      [0, 0], [5, 0], [-5, 0], [0, 5], [0, -5],
      [10, 6], [-10, 6], [10, -6], [-10, -6],
      [-14, 10], [14, 10], [-14, -10], [14, -10],
    ];
    for (const [dx, dz] of torchPositions) {
      this.addTorch(dx, 1.8, dz, 0xffa346, 1.4, 6.0);
    }
    // Cool moonbeam pillar as atmospheric fill on the pond.
    const moonPillar = new THREE.PointLight(0xa8c6ff, 0.8, 10, 1.5);
    moonPillar.position.set(-cols / 2 + 4.5, 4, rows / 2 - 4.5);
    this.scene.add(moonPillar);

    // Scatter perched ravens on random grass tiles — silent gothic extras.
    for (let i = 0; i < 9; i++) {
      const c = (rnd() * cols) | 0;
      const r = (rnd() * rows) | 0;
      if (!isGrass(c, r)) continue;
      const { x, z } = worldC(c, r);
      const rv = raven(x + (rnd() - 0.5) * 0.5, 0.05, z + (rnd() - 0.5) * 0.5);
      rv.rotation.y = rnd() * Math.PI * 2;
      this.scene.add(rv);
    }

    // Scatter decor across grass tiles. Each item type has its own count;
    // we sample random tiles, skip non-grass, and place with a small jitter.
    type DecorSpec = { make: () => THREE.Group; count: number; rotate: boolean };
    const decorSpecs: DecorSpec[] = [
      { make: decorBonePile,      count: 6, rotate: true  },
      { make: decorSkull,         count: 4, rotate: true  },
      { make: decorStoneUrn,      count: 3, rotate: false },
      { make: decorDirtMound,     count: 5, rotate: true  },
      { make: decorCrossStake,    count: 5, rotate: true  },
      { make: decorPumpkin,       count: 4, rotate: true  },
      { make: decorLanternPole,   count: 6, rotate: false },
    ];
    for (const spec of decorSpecs) {
      let placed = 0, attempts = 0;
      while (placed < spec.count && attempts < spec.count * 8) {
        attempts++;
        const c = (rnd() * cols) | 0;
        const r = (rnd() * rows) | 0;
        if (!isGrass(c, r)) continue;
        const { x, z } = worldC(c, r);
        const item = spec.make();
        item.position.set(x + (rnd() - 0.5) * 0.5, 0, z + (rnd() - 0.5) * 0.5);
        if (spec.rotate) item.rotation.y = rnd() * Math.PI * 2;
        this.scene.add(item);
        placed++;
      }
    }

    // Drifting volumetric mist — a handful of soft alpha planes that slowly
    // drift across the cemetery. The update loop fades and repositions them.
    this.buildMist(cols, rows);
  }

  // ---------------- Mist / fog planes ----------------
  private mistPlanes: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vz: number;
    phase: number;
  }> = [];

  private buildMist(cols: number, rows: number) {
    // Soft radial alpha canvas used as a mist texture.
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, "rgba(180, 190, 210, 0.55)");
    grad.addColorStop(0.7, "rgba(120, 130, 160, 0.15)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    // Add a few secondary blobs for organic shape
    for (let i = 0; i < 6; i++) {
      const gx = 20 + Math.random() * 88;
      const gy = 20 + Math.random() * 88;
      const gr = 20 + Math.random() * 30;
      const g2 = ctx.createRadialGradient(gx, gy, 4, gx, gy, gr);
      g2.addColorStop(0, "rgba(180, 190, 210, 0.25)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      opacity: 0.45, color: 0xb8c0d8,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < 14; i++) {
      const size = 5 + Math.random() * 4;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(
        (Math.random() - 0.5) * cols * 1.1,
        0.25 + Math.random() * 0.6,
        (Math.random() - 0.5) * rows * 1.1
      );
      this.scene.add(plane);
      this.mistPlanes.push({
        mesh: plane,
        vx: (Math.random() - 0.5) * 0.0006,
        vz: (Math.random() - 0.5) * 0.0006,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateMist(t: number) {
    const cols = CONFIG.COLS;
    const rows = CONFIG.ROWS;
    for (const m of this.mistPlanes) {
      m.mesh.position.x += m.vx * 60;
      m.mesh.position.z += m.vz * 60;
      // Wrap around the map edges so mist drifts endlessly.
      if (m.mesh.position.x > cols * 0.6) m.mesh.position.x = -cols * 0.6;
      if (m.mesh.position.x < -cols * 0.6) m.mesh.position.x = cols * 0.6;
      if (m.mesh.position.z > rows * 0.6) m.mesh.position.z = -rows * 0.6;
      if (m.mesh.position.z < -rows * 0.6) m.mesh.position.z = rows * 0.6;
      // Pulse opacity slowly for a breathing feel. Stronger for "fog" weather.
      const mat = m.mesh.material as THREE.MeshBasicMaterial;
      const base = this.weather === "fog" ? 0.55 : 0.24;
      const amp = this.weather === "fog" ? 0.3 : 0.14;
      mat.opacity = base + amp * (0.5 + 0.5 * Math.sin(t * 0.0004 + m.phase));
    }
  }

  // ---------------- Weather ----------------
  weather: "sunny" | "clear" | "rain" | "fog" | "overcast" = "clear";
  private rainPoints?: THREE.Points;
  private rainVel: Float32Array = new Float32Array(0);
  private rainCount = 800;

  setWeather(kind: "sunny" | "clear" | "rain" | "fog" | "overcast") {
    if (this.weather === kind) return;
    this.weather = kind;
    // Fog density + color change per weather.
    if (!this.scene.fog || !(this.scene.fog instanceof THREE.Fog)) {
      this.scene.fog = new THREE.Fog(0x0a0f18, 22, 70);
    }
    const fog = this.scene.fog as THREE.Fog;
    switch (kind) {
      case "sunny":
        // Bright golden daytime — warm sun, soft pale-blue sky, fog far away.
        fog.color.setHex(0x9bb6d8);
        fog.near = 60; fog.far = 140;
        this.setCloudColor(0x9bb6d8);
        this.setSunColor(0xfff2c8);
        this.setSunMoonIntensity(2.3, 1.05);
        this.renderer.toneMappingExposure = 1.25;
        break;
      case "clear":
        fog.color.setHex(0x0a1028);
        fog.near = 45; fog.far = 110;
        this.setCloudColor(0x0a1028);
        this.setSunColor(0xb8caff);
        this.setSunMoonIntensity(1.1, 0.45);
        this.renderer.toneMappingExposure = 0.9;
        break;
      case "overcast":
        fog.color.setHex(0x1a1e26);
        fog.near = 28; fog.far = 70;
        this.setCloudColor(0x1a1e26);
        this.setSunColor(0x9aa5b8);
        this.setSunMoonIntensity(0.55, 0.3);
        this.renderer.toneMappingExposure = 0.9;
        break;
      case "rain":
        fog.color.setHex(0x141820);
        fog.near = 18; fog.far = 55;
        this.setCloudColor(0x141820);
        this.setSunColor(0x8090a0);
        this.setSunMoonIntensity(0.5, 0.25);
        this.renderer.toneMappingExposure = 0.85;
        break;
      case "fog":
        fog.color.setHex(0x2a3040);
        fog.near = 8; fog.far = 32;
        this.setCloudColor(0x2a3040);
        this.setSunColor(0xa0a8b8);
        this.setSunMoonIntensity(0.6, 0.3);
        this.renderer.toneMappingExposure = 0.85;
        break;
    }
    this.toggleRain(kind === "rain");
  }

  private setSunColor(color: number) {
    (this.sun.color as THREE.Color).setHex(color);
  }

  private setCloudColor(color: number) {
    // Tint the scene background uniformly so sky feels consistent with fog.
    if (this.scene.background instanceof THREE.Color) {
      (this.scene.background as THREE.Color).setHex(color);
    }
    // If background is a texture (nightSkyTexture), layer fog by adjusting
    // ambient hemisphere tint so distant elements blend.
    (this.ambient.color as THREE.Color).setHex(color);
  }

  private setSunMoonIntensity(sunI: number, ambI: number) {
    this.sun.intensity = sunI;
    this.ambient.intensity = ambI;
  }

  private toggleRain(on: boolean) {
    if (on) {
      if (this.rainPoints) { this.rainPoints.visible = true; return; }
      this.buildRain();
    } else if (this.rainPoints) {
      this.rainPoints.visible = false;
    }
  }

  private buildRain() {
    const cols = CONFIG.COLS;
    const rows = CONFIG.ROWS;
    const n = this.rainCount;
    const positions = new Float32Array(n * 3);
    this.rainVel = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * cols * 1.6;
      positions[i * 3 + 1] = Math.random() * 18 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * rows * 1.6;
      this.rainVel[i] = 12 + Math.random() * 8;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xbccfe0,
      size: 0.09,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.rainPoints = new THREE.Points(geom, mat);
    this.scene.add(this.rainPoints);
  }

  private updateRain(dt: number) {
    if (!this.rainPoints || !this.rainPoints.visible) return;
    const cols = CONFIG.COLS;
    const rows = CONFIG.ROWS;
    const pos = (this.rainPoints.geometry.getAttribute("position") as THREE.BufferAttribute);
    const arr = pos.array as Float32Array;
    const n = this.rainVel.length;
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 1] -= this.rainVel[i] * dt;
      // Slight wind drift
      arr[i * 3 + 0] += 2.5 * dt;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 14 + Math.random() * 6;
        arr[i * 3 + 0] = (Math.random() - 0.5) * cols * 1.6;
        arr[i * 3 + 2] = (Math.random() - 0.5) * rows * 1.6;
      }
      if (arr[i * 3 + 0] > cols * 0.8) arr[i * 3 + 0] = -cols * 0.8;
    }
    pos.needsUpdate = true;
  }

  setFocus(col: number, row: number, visible: boolean) {
    this.focusRing.visible = visible;
    if (visible) {
      const { x, z } = tileToWorld(col, row);
      this.focusRing.position.set(x, 0.03, z);
    }
  }

  private rebuildTileLayers() {
    // Remove any previous instanced layers.
    for (const m of this.tileMeshesByType.values()) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.tileMeshesByType.clear();

    const rows = this.tileTypes.length;
    const cols = rows > 0 ? this.tileTypes[0].length : 0;

    // Group tiles by terrain so we can instance them.
    const groups: Record<string, Array<{ c: number; r: number }>> = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = this.tileTypes[r][c];
        if (t === "grass") continue; // base ground covers grass
        (groups[t] ||= []).push({ c, r });
      }
    }

    const tileGeo = new THREE.PlaneGeometry(0.98, 0.98);

    const matFor = (t: string): THREE.Material => {
      switch (t) {
        case "earth": {
          const m = earthTexture();
          return new THREE.MeshStandardMaterial({ map: m, roughness: 1 });
        }
        case "path": {
          const m = stonePathTexture();
          return new THREE.MeshStandardMaterial({ map: m, roughness: 0.85 });
        }
        case "plot": {
          return new THREE.MeshStandardMaterial({ color: 0x5d7a32, roughness: 0.95 });
        }
        case "hole": {
          const m = earthTexture();
          return new THREE.MeshStandardMaterial({ map: m, color: 0x7a5e3d, roughness: 1 });
        }
        default:
          return new THREE.MeshStandardMaterial({ color: 0x4a7a28, roughness: 1 });
      }
    };

    for (const [t, coords] of Object.entries(groups)) {
      const im = new THREE.InstancedMesh(tileGeo, matFor(t), coords.length);
      im.receiveShadow = true;
      const dummy = new THREE.Object3D();
      coords.forEach((pos, i) => {
        const { x, z } = tileToWorld(pos.c, pos.r);
        dummy.position.set(x, 0.01 + (t === "hole" ? -0.04 : 0), z);
        dummy.rotation.x = -Math.PI / 2;
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      this.scene.add(im);
      this.tileMeshesByType.set(t, im);
    }
  }

  /** Refresh a single tile's terrain (destroys+rebuilds the layers; cheap for our size). */
  setTileTerrain(col: number, row: number, terrain: string) {
    if (!this.tileTypes[row]) return;
    if (this.tileTypes[row][col] === terrain) return;
    this.tileTypes[row][col] = terrain;
    this.rebuildTileLayers();
  }

  /**
   * Place a pre-built Object3D at grid position (col,row).
   * yaw: optional rotation around Y axis in radians.
   */
  placeAt(obj: THREE.Object3D, col: number, row: number, yaw = 0, scale = 1) {
    const { x, z } = tileToWorld(col, row);
    obj.position.set(x, 0, z);
    obj.rotation.y = yaw;
    obj.scale.setScalar(scale);
    this.scene.add(obj);
  }

  setOrbitTarget(x: number, z: number) {
    this.orbitTarget.set(x, 0, z);
    this.eye.x = x;
    this.eye.z = z;
  }

  setZoom(distance: number) {
    this.orbitDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
  }

  /**
   * Rotate look direction. In first-person mode this controls the player's
   * head (yaw + pitch). In orbit mode it controls orbit angles.
   */
  rotateBy(dYaw: number, dPitch: number) {
    if (this.firstPerson) {
      this.lookYaw += dYaw;
      // Clamp pitch to avoid flipping — -1.3 (up) .. +1.3 (down).
      this.lookPitch = Math.max(-1.2, Math.min(1.2, this.lookPitch + dPitch));
    } else {
      this.orbitAngleH += dYaw;
      this.orbitAngleV = Math.max(0.35, Math.min(1.3, this.orbitAngleV + dPitch));
    }
  }

  setFirstPerson(fp: boolean) {
    this.firstPerson = fp;
  }

  updateCamera() {
    if (this.firstPerson) {
      const cx = this.eye.x;
      const cz = this.eye.z;
      const eyeY = 1.65;
      this.camera.position.set(cx, eyeY, cz);
      // Look direction: yaw around +Y, pitch around X. Our yaw 0 = +Z
      // (south), matching the orbit-camera and movement convention.
      const cosP = Math.cos(this.lookPitch);
      const sinP = Math.sin(this.lookPitch);
      const dirX = Math.sin(this.lookYaw) * cosP;
      const dirZ = Math.cos(this.lookYaw) * cosP;
      const dirY = -sinP; // +pitch = look down
      this.camera.lookAt(cx + dirX, eyeY + dirY, cz + dirZ);
      // Shadow frustum follows the player.
      this.sun.target.position.set(cx, 0, cz);
      this.sun.position.set(cx - 12, 28, cz - 10);
      return;
    }
    const d = this.orbitDistance;
    const pitch = this.orbitAngleV;
    const yaw = this.orbitAngleH;
    const cx = this.orbitTarget.x;
    const cz = this.orbitTarget.z;
    const cy = 0;
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    this.camera.position.set(
      cx + d * cosP * Math.sin(yaw),
      cy + d * sinP,
      cz + d * cosP * Math.cos(yaw)
    );
    this.camera.lookAt(cx, cy + 0.6, cz);
    this.sun.target.position.set(cx, 0, cz);
    this.sun.position.set(cx - 12, 28, cz - 10);
  }

  /** Main lantern held by the player — warm flickering point light. */
  private playerLantern?: THREE.PointLight;

  /**
   * Create a magical blue point light at the tip of the elf mage's staff orb.
   * The light follows the player and flickers subtly to simulate arcane energy.
   */
  ensurePlayerLantern(): THREE.PointLight {
    if (this.playerLantern) return this.playerLantern;
    const l = new THREE.PointLight(0x6fc8ff, 3.0, 9.0, 1.6);
    l.castShadow = true;
    l.shadow.mapSize.set(512, 512);
    l.shadow.camera.near = 0.05;
    l.shadow.camera.far = 10;
    l.shadow.bias = -0.002;
    this.scene.add(l);
    this.playerLantern = l;
    return l;
  }

  /** Update lantern/staff-orb position + flicker. Call once per frame. */
  updatePlayerLantern(t: number) {
    const l = this.playerLantern;
    if (!l) return;
    // In top-down mode, we use the stored 'eye' x/z as the player position
    // (updated via setOrbitTarget). The orb hovers ~1.8 above, offset to the
    // right of facing direction.
    const yaw = this.firstPerson ? this.lookYaw : this.playerYaw;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    l.position.set(
      this.eye.x + cosY * 0.34,
      1.82,
      this.eye.z - sinY * 0.34
    );
    // Arcane flicker (slower / gentler than a lantern).
    const flick = 0.9 + Math.sin(t * 0.004) * 0.06 + Math.sin(t * 0.013) * 0.04 + (Math.random() - 0.5) * 0.03;
    l.intensity = 3.0 * flick;
  }

  /** Player body yaw so staff orb tracks correctly in top-down mode. */
  playerYaw = 0;
  setPlayerYaw(yaw: number) { this.playerYaw = yaw; }

  /** Update every registered torch's flicker. */
  updateTorches(t: number) {
    for (const tl of this.torchLights) {
      const f = 0.85 + Math.sin(t * 0.01 + tl.phase) * 0.1 + (Math.random() - 0.5) * 0.08;
      tl.light.intensity = tl.intensity * f;
    }
  }

  /** Add a static torch / candle point light at world coords (x, y, z). */
  addTorch(x: number, y: number, z: number, color = 0xffa346, intensity = 1.6, distance = 5): THREE.PointLight {
    const l = new THREE.PointLight(color, intensity, distance, 1.6);
    l.position.set(x, y, z);
    this.scene.add(l);
    this.torchLights.push({ light: l, phase: Math.random() * Math.PI * 2, intensity });
    return l;
  }

  private _lastRenderTs = 0;
  render() {
    this.updateCamera();
    const t = performance.now();
    const dt = this._lastRenderTs > 0 ? (t - this._lastRenderTs) / 1000 : 0.016;
    this._lastRenderTs = t;
    this.updatePlayerLantern(t);
    this.updateTorches(t);
    this.updateMist(t);
    this.updateRain(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Build a mesh from a sprite key used by the Phaser rendering pipeline.
   * Returns null if the key doesn't map to a 3D model (in that case the
   * caller should fall back to nothing or a placeholder).
   */
  meshForKey(key: string): THREE.Object3D | null {
    switch (key) {
      // Tombstones
      case "tomb_stone":   return tombStone();
      case "tomb_obelisk": return tombObelisk();
      case "tomb_cross":   return tombCross();
      case "tomb_marble":  return tombMarble();
      case "tomb_angel":   return tombAngel();
      case "tomb_celtic":  return tombCeltic();
      case "tomb_wood":    return tombWood();
      case "tomb_sarco":   return tombSarco();
      case "tomb_broken":  return tombBroken();
      // Buildings
      case "build_mausoleum": return buildingMausoleum();
      case "build_chapel":    return buildingChapel();
      case "build_crypt":     return buildingCrypt();
      case "build_bigcross":  return buildingBigCross();
      case "build_gate":      return buildingGate();
      // Flowers (hex colors chosen to match pixel-art Phaser equivalents)
      case "flower_white":   return flower(0xd8d4c8);
      case "flower_yellow":  return flower(0xf4c240);
      case "flower_red":     return flower(0xd63a2f);
      case "flower_purple":  return flower(0x7a4aa8);
      case "flower_blue":    return flower(0x4a6fd6);
      case "flower_pink":    return flower(0xeb76a8);
      case "flower_orange":  return flower(0xe47a20);
      case "flower_ghost":   return flower(0xeaf2ff, 0x88aaff);
      case "flower_rose":    return flower(0xff4a5e, 0xaa1133);
      // Decor
      case "decor_bouquet":  return decorBouquet(0xf4c240);
      case "decor_candle":   return decorCandle();
      case "decor_wreath":   return decorWreath();
      case "decor_bible":    return decorBible();
      case "decor_lantern":
      case "lantern_oil":
      case "lantern_candle": return decorCandle();
      // Fences
      case "fence_wood":  return fenceWood();
      case "fence_iron":  return fenceIron();
      case "fence_stone": return fenceStone();
      default: return null;
    }
  }

  /**
   * Add a static prop (tombstone, flower, fence, building) at grid coords.
   * Returns the created Object3D so callers can later reposition/remove it.
   */
  addProp(key: string, col: number, row: number, opts?: { yaw?: number; scale?: number }): THREE.Object3D | null {
    const mesh = this.meshForKey(key);
    if (!mesh) return null;
    const { x, z } = tileToWorld(col, row);
    mesh.position.set(x, 0, z);
    if (opts?.yaw !== undefined) mesh.rotation.y = opts.yaw;
    if (opts?.scale !== undefined) mesh.scale.setScalar(opts.scale);
    this.scene.add(mesh);
    return mesh;
  }

  addGraveHoleMesh(col: number, row: number): THREE.Object3D {
    const m = graveHole();
    const { x, z } = tileToWorld(col, row);
    m.position.set(x, 0, z);
    this.scene.add(m);
    return m;
  }

  addPlayerMesh(): THREE.Object3D {
    const spec = loadCharacter();
    const robe = robeColors(spec.robe);
    const orb = orbColors(spec.orb);
    const m = entityPlayer({
      robePrimary: robe.primary,
      robeTrim: robe.trim,
      orbColor: orb.color,
      orbEmissive: orb.emissive,
      hoodStyle: spec.hood,
    });
    this.scene.add(m);
    return m;
  }

  addCatMesh(): THREE.Object3D {
    const m = entityCat();
    this.scene.add(m);
    return m;
  }

  addZombieMesh(variant: "normal" | "skinny" | "fat" | "headless" = "normal"): THREE.Object3D {
    const m = entityZombie(variant);
    this.scene.add(m);
    return m;
  }

  removeMesh(obj: THREE.Object3D | null | undefined) {
    if (!obj) return;
    this.scene.remove(obj);
    obj.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose?.();
    });
  }

  /** Convert a Phaser world-space (x,y) (top-down plane) into 3D (x, z). */
  phaserToThree(px: number, py: number): { x: number; z: number } {
    // Current top-down grid: Phaser x = col*ISO_W + ISO_W/2; Phaser y = row*ISO_H + ISO_H/2.
    // For iso grid we'd need isoToTile. Here we assume orthogonal top-down
    // (as per CONFIG with ISO_W=ISO_H=32). Caller that uses iso should pass
    // fractional (col,row) through grid.worldToTile first.
    const col = (px - CONFIG.ISO_W / 2) / CONFIG.ISO_W;
    const row = (py - CONFIG.ISO_H / 2) / CONFIG.ISO_H;
    return tileToWorld(col, row);
  }

  dispose() {
    this.renderer.dispose();
    if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
  }
}
