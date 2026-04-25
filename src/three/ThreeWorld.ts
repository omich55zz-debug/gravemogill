import * as THREE from "three";
import { CONFIG } from "../data/config";
import type { Cell } from "../utils/grid";
import {
  tombStone, tombObelisk, tombCross, tombMarble, tombAngel,
  tombCeltic, tombWood, tombSarco, tombBroken,
  buildingMausoleum, buildingChapel, buildingCrypt, buildingBigCross, buildingGate,
  flower, fenceWood, fenceIron, fenceStone,
  decorBouquet, decorCandle, decorWreath, decorBible,
  entityPlayer, entityCat, entityZombie, graveHole,
} from "./meshes";

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

  // Camera orbit params.
  private orbitTarget = new THREE.Vector3(0, 0, 0);
  orbitDistance = 18;
  orbitAngleH = Math.PI / 4; // yaw
  orbitAngleV = Math.PI / 3.5; // pitch (higher = more top-down)
  minDistance = 8;
  maxDistance = 42;

  constructor(parent: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.Fog(0x05060a, 26, 55);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.canvas = this.renderer.domElement;
    this.canvas.style.position = "absolute";
    this.canvas.style.inset = "0";
    this.canvas.style.zIndex = "0";
    this.canvas.style.imageRendering = "auto";
    parent.appendChild(this.canvas);

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);

    // Lighting — warm low sun, cool sky ambience. Slight blue rim via hemi.
    this.ambient = new THREE.HemisphereLight(0x6a78a8, 0x221822, 0.55);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xffe5a8, 1.05);
    this.sun.position.set(-12, 18, -8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = 30;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Subtle warm fill from opposite side
    const fill = new THREE.DirectionalLight(0x4a6a9a, 0.25);
    fill.position.set(15, 10, 12);
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
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2c3a1a,
      roughness: 1.0,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, -0.01, 0);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.rebuildTileLayers();

    // Focus ring marker
    const ringGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.98, 0.98));
    const ringMat = new THREE.LineBasicMaterial({ color: 0xfff4d6, transparent: true, opacity: 0.9 });
    this.focusRing = new THREE.LineSegments(ringGeo, ringMat);
    this.focusRing.rotation.x = -Math.PI / 2;
    this.focusRing.position.y = 0.03;
    this.focusRing.visible = false;
    this.scene.add(this.focusRing);
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
        case "earth":  return new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 1 });
        case "path":   return new THREE.MeshStandardMaterial({ color: 0x7a6e58, roughness: 0.85 });
        case "plot":   return new THREE.MeshStandardMaterial({ color: 0x3a4420, roughness: 0.95 });
        case "hole":   return new THREE.MeshStandardMaterial({ color: 0x1e150a, roughness: 1 });
        default:       return new THREE.MeshStandardMaterial({ color: 0x2c3a1a, roughness: 1 });
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
  }

  setZoom(distance: number) {
    this.orbitDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
  }

  rotateBy(dYaw: number, dPitch: number) {
    this.orbitAngleH += dYaw;
    this.orbitAngleV = Math.max(0.35, Math.min(1.3, this.orbitAngleV + dPitch));
  }

  updateCamera() {
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
    // Keep shadow frustum following the player
    this.sun.target.position.set(cx, 0, cz);
    this.sun.position.set(cx - 14, 20, cz - 10);
  }

  render() {
    this.updateCamera();
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
    const m = entityPlayer();
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
