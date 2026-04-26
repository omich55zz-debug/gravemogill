import * as THREE from "three";
import {
  marbleTexture, graniteTexture, woodTexture, ironTexture,
  roughStoneTexture, roofTexture, earthTexture, leavesTexture, waterTexture,
  stainedGlassTexture, runesEmissiveTexture,
} from "./textures";

// Shared material instances — created on first access so canvases are ready.
function m(key: string, make: () => THREE.Material): THREE.Material {
  const cache = m as unknown as { _c?: Map<string, THREE.Material> };
  if (!cache._c) cache._c = new Map();
  let v = cache._c.get(key);
  if (!v) { v = make(); cache._c.set(key, v); }
  return v;
}

function stoneAMat(): THREE.Material {
  return m("stoneA", () => new THREE.MeshStandardMaterial({
    map: roughStoneTexture(), color: 0xbfb8a8, roughness: 0.9,
  }));
}
function stoneBMat(): THREE.Material {
  return m("stoneB", () => new THREE.MeshStandardMaterial({
    map: roughStoneTexture(), color: 0x8a8476, roughness: 0.95,
  }));
}
function stoneDarkMat(): THREE.Material {
  return m("stoneDark", () => new THREE.MeshStandardMaterial({
    map: graniteTexture(), color: 0x6a6458, roughness: 0.9,
  }));
}
function marbleMat(): THREE.Material {
  return m("marble", () => new THREE.MeshStandardMaterial({
    map: marbleTexture(), color: 0xffffff, roughness: 0.35,
  }));
}
function graniteMat(): THREE.Material {
  return m("granite", () => new THREE.MeshStandardMaterial({
    map: graniteTexture(), color: 0xeeeeee, roughness: 0.6, metalness: 0.1,
  }));
}
function mossGreenMat(): THREE.Material {
  return m("moss", () => new THREE.MeshStandardMaterial({
    color: 0x55703a, roughness: 0.95,
  }));
}
function woodMat(): THREE.Material {
  return m("wood", () => new THREE.MeshStandardMaterial({
    map: woodTexture(), color: 0xffffff, roughness: 0.9,
  }));
}
function rustMetalMat(): THREE.Material {
  return m("iron", () => new THREE.MeshStandardMaterial({
    map: ironTexture(), color: 0xffffff, roughness: 0.6, metalness: 0.6,
  }));
}
function brassMat(): THREE.Material {
  return m("brass", () => new THREE.MeshStandardMaterial({
    color: 0xc08e3a, roughness: 0.35, metalness: 0.85,
  }));
}
function earthMat(): THREE.Material {
  return m("earthM", () => new THREE.MeshStandardMaterial({
    map: earthTexture(), color: 0xffffff, roughness: 1,
  }));
}
function flowerLeafMat(): THREE.Material {
  return m("leaf", () => new THREE.MeshStandardMaterial({
    color: 0x4a7a3a, roughness: 0.85, side: THREE.DoubleSide,
  }));
}
function roofMat(): THREE.Material {
  return m("roofMat", () => new THREE.MeshStandardMaterial({
    map: roofTexture(), color: 0x2a2420, roughness: 0.75,
  }));
}
function waterMat(): THREE.Material {
  return m("waterMat", () => new THREE.MeshPhysicalMaterial({
    map: waterTexture(), color: 0x3a6b94, roughness: 0.1, metalness: 0.0,
    transparent: true, opacity: 0.85, reflectivity: 0.5, clearcoat: 0.8,
  }));
}

// Backwards-compat aliases used throughout this file.
const stoneA = stoneAMat();
const stoneB = stoneBMat();
const stoneDark = stoneDarkMat();
const marble = marbleMat();
const granite = graniteMat();
const mossGreen = mossGreenMat();
const wood = woodMat();
const rustMetal = rustMetalMat();
const brass = brassMat();
const earth = earthMat();
const flowerLeaf = flowerLeafMat();
const roofSlate = roofMat();

export type MeshFactory = () => THREE.Object3D;

function mkMesh(geo: THREE.BufferGeometry, mat: THREE.Material, castShadow = true, receiveShadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

// ---------------- Tombstones ----------------

export function tombStone(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(0.85, 0.2, 0.35), stoneB);
  base.position.y = 0.1;
  g.add(base);
  const body = mkMesh(new THREE.BoxGeometry(0.7, 0.9, 0.18), stoneA);
  body.position.y = 0.65;
  g.add(body);
  // Rounded top
  const top = mkMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 12, 1, false, 0, Math.PI), stoneA);
  top.rotation.x = Math.PI / 2;
  top.rotation.z = Math.PI / 2;
  top.position.set(0, 1.1, 0);
  top.scale.set(1, 1, 0.5);
  g.add(top);
  return g;
}

export function tombObelisk(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(0.7, 0.25, 0.7), stoneB);
  base.position.y = 0.125;
  g.add(base);
  const shaft = mkMesh(new THREE.BoxGeometry(0.45, 1.4, 0.45), stoneA);
  shaft.position.y = 0.95;
  g.add(shaft);
  const cap = mkMesh(new THREE.ConeGeometry(0.32, 0.45, 4), stoneA);
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 1.9;
  g.add(cap);
  return g;
}

export function tombCross(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), stoneB);
  base.position.y = 0.1;
  g.add(base);
  const vert = mkMesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), granite);
  vert.position.y = 0.8;
  g.add(vert);
  const horiz = mkMesh(new THREE.BoxGeometry(0.8, 0.2, 0.16), granite);
  horiz.position.y = 1.05;
  g.add(horiz);
  return g;
}

export function tombMarble(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(1.0, 0.25, 0.5), stoneB);
  base.position.y = 0.125;
  g.add(base);
  const body = mkMesh(new THREE.BoxGeometry(0.85, 1.1, 0.25), marble);
  body.position.y = 0.8;
  g.add(body);
  const top = mkMesh(new THREE.BoxGeometry(0.9, 0.15, 0.3), marble);
  top.position.y = 1.4;
  g.add(top);
  // Glowing arcane runes on the front face
  const runeTex = runesEmissiveTexture();
  const runes = mkMesh(
    new THREE.PlaneGeometry(0.6, 0.5),
    new THREE.MeshStandardMaterial({
      map: runeTex,
      emissive: 0xffffff,
      emissiveMap: runeTex,
      emissiveIntensity: 1.1,
      transparent: true,
      roughness: 0.6,
    })
  );
  runes.position.set(0, 0.8, 0.128);
  g.add(runes);
  return g;
}

export function tombAngel(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(0.8, 0.3, 0.6), stoneB);
  base.position.y = 0.15;
  g.add(base);
  // Body
  const body = mkMesh(new THREE.CylinderGeometry(0.22, 0.28, 0.8, 8), marble);
  body.position.y = 0.7;
  g.add(body);
  // Head
  const head = mkMesh(new THREE.SphereGeometry(0.18, 10, 8), marble);
  head.position.y = 1.25;
  g.add(head);
  // Wings
  const wingGeo = new THREE.BoxGeometry(0.05, 0.5, 0.4);
  const wingL = mkMesh(wingGeo, marble);
  wingL.position.set(-0.2, 0.95, 0);
  wingL.rotation.z = 0.3;
  g.add(wingL);
  const wingR = mkMesh(wingGeo, marble);
  wingR.position.set(0.2, 0.95, 0);
  wingR.rotation.z = -0.3;
  g.add(wingR);
  return g;
}

export function tombCeltic(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), stoneB);
  base.position.y = 0.1;
  g.add(base);
  const vert = mkMesh(new THREE.BoxGeometry(0.2, 1.3, 0.2), stoneA);
  vert.position.y = 0.85;
  g.add(vert);
  const horiz = mkMesh(new THREE.BoxGeometry(0.85, 0.2, 0.18), stoneA);
  horiz.position.y = 1.05;
  g.add(horiz);
  const ring = mkMesh(new THREE.TorusGeometry(0.28, 0.065, 6, 20), stoneA);
  ring.position.y = 1.05;
  ring.rotation.y = Math.PI / 2;
  g.add(ring);
  return g;
}

export function tombWood(): THREE.Group {
  const g = new THREE.Group();
  const vert = mkMesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), wood);
  vert.position.y = 0.45;
  g.add(vert);
  const horiz = mkMesh(new THREE.BoxGeometry(0.55, 0.12, 0.12), wood);
  horiz.position.y = 0.65;
  g.add(horiz);
  return g;
}

export function tombSarco(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(1.6, 0.35, 0.8), stoneB);
  base.position.y = 0.175;
  g.add(base);
  const lid = mkMesh(new THREE.BoxGeometry(1.5, 0.2, 0.7), stoneA);
  lid.position.y = 0.45;
  g.add(lid);
  // Slight slope
  const top = mkMesh(new THREE.BoxGeometry(1.35, 0.15, 0.55), marble);
  top.position.y = 0.625;
  g.add(top);
  return g;
}

export function tombBroken(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), stoneB);
  base.position.y = 0.1;
  g.add(base);
  const body = mkMesh(new THREE.BoxGeometry(0.6, 0.5, 0.18), stoneDark);
  body.position.y = 0.45;
  body.rotation.z = 0.18;
  g.add(body);
  // Broken chunk on ground
  const chunk = mkMesh(new THREE.BoxGeometry(0.3, 0.15, 0.2), stoneDark);
  chunk.position.set(0.35, 0.08, 0.1);
  chunk.rotation.y = 0.5;
  g.add(chunk);
  return g;
}

// ---------------- Buildings ----------------

export function buildingMausoleum(): THREE.Group {
  const g = new THREE.Group();
  // Plinth
  const plinth = mkMesh(new THREE.BoxGeometry(3.0, 0.3, 2.5), stoneB);
  plinth.position.y = 0.15;
  g.add(plinth);
  // Main block
  const main = mkMesh(new THREE.BoxGeometry(2.6, 2.2, 2.0), stoneA);
  main.position.y = 1.4;
  g.add(main);
  // Pilasters (corner columns)
  const pilastGeo = new THREE.BoxGeometry(0.22, 2.2, 0.22);
  for (const [px, pz] of [[-1.19, -0.89], [1.19, -0.89], [-1.19, 0.89], [1.19, 0.89]]) {
    const p = mkMesh(pilastGeo, marble);
    p.position.set(px, 1.4, pz);
    g.add(p);
  }
  // Roof pyramid
  const roof = mkMesh(new THREE.ConeGeometry(2.0, 0.9, 4), roofSlate);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.95;
  roof.scale.set(1.05, 1, 0.85);
  g.add(roof);
  // Door (recessed dark)
  const door = mkMesh(new THREE.BoxGeometry(0.7, 1.3, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.8 }));
  door.position.set(0, 0.95, 1.02);
  g.add(door);
  // Cross on top
  const crossV = mkMesh(new THREE.BoxGeometry(0.12, 0.6, 0.08), brass);
  crossV.position.y = 3.7;
  g.add(crossV);
  const crossH = mkMesh(new THREE.BoxGeometry(0.4, 0.1, 0.08), brass);
  crossH.position.y = 3.75;
  g.add(crossH);
  return g;
}

export function buildingChapel(): THREE.Group {
  const g = new THREE.Group();
  const plinth = mkMesh(new THREE.BoxGeometry(4.0, 0.35, 3.2), stoneB);
  plinth.position.y = 0.175;
  g.add(plinth);
  const nave = mkMesh(new THREE.BoxGeometry(3.5, 3.0, 2.7), stoneA);
  nave.position.y = 1.85;
  g.add(nave);
  // Proper gable via prism
  const prismShape = new THREE.Shape();
  prismShape.moveTo(-1.9, 0);
  prismShape.lineTo(1.9, 0);
  prismShape.lineTo(0, 1.4);
  prismShape.lineTo(-1.9, 0);
  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(prismShape, { depth: 2.9, bevelEnabled: false }),
    stoneDark
  );
  roof.rotation.y = Math.PI / 2;
  roof.position.set(1.45, 3.35, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  // Bell tower
  const tower = mkMesh(new THREE.BoxGeometry(1.1, 3.4, 1.1), stoneA);
  tower.position.set(-1.85, 2.0, 0);
  g.add(tower);
  const towerRoof = mkMesh(new THREE.ConeGeometry(0.85, 1.2, 4), roofSlate);
  towerRoof.position.set(-1.85, 4.3, 0);
  towerRoof.rotation.y = Math.PI / 4;
  g.add(towerRoof);
  // Bell tower cross
  const bcV = mkMesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), brass);
  bcV.position.set(-1.85, 5.2, 0);
  g.add(bcV);
  const bcH = mkMesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), brass);
  bcH.position.set(-1.85, 5.25, 0);
  g.add(bcH);
  // Door
  const door = mkMesh(new THREE.BoxGeometry(0.9, 1.8, 0.1), new THREE.MeshStandardMaterial({ color: 0x3a1a12, roughness: 0.7 }));
  door.position.set(0, 1.25, 1.37);
  g.add(door);
  // Rose window — brass lead frame + glowing stained glass.
  const rose = mkMesh(new THREE.TorusGeometry(0.5, 0.07, 6, 20), brass);
  rose.position.set(0, 2.5, 1.38);
  rose.rotation.x = Math.PI / 2;
  g.add(rose);
  const stainedMap = stainedGlassTexture();
  const roseInner = mkMesh(
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshStandardMaterial({
      map: stainedMap,
      emissive: 0xffffff,
      emissiveMap: stainedMap,
      emissiveIntensity: 1.6,
      roughness: 0.25,
      side: THREE.DoubleSide,
    })
  );
  roseInner.position.set(0, 2.5, 1.39);
  g.add(roseInner);

  // Two tall narrow stained-glass side windows
  const sideWinMat = new THREE.MeshStandardMaterial({
    map: stainedMap,
    emissive: 0xffffff,
    emissiveMap: stainedMap,
    emissiveIntensity: 1.3,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  for (const xOff of [-1.1, 1.1]) {
    const win = mkMesh(new THREE.PlaneGeometry(0.5, 1.2), sideWinMat);
    win.position.set(xOff, 1.85, 1.38);
    g.add(win);
    // Brass lead-frame
    const frame = mkMesh(new THREE.BoxGeometry(0.55, 1.25, 0.04), brass);
    frame.position.set(xOff, 1.85, 1.37);
    g.add(frame);
  }

  // Warm interior light glow seeping through the rose window (gives the
  // chapel a "someone is inside" feel).
  const chapelGlow = new THREE.PointLight(0xffa84a, 1.4, 7, 1.5);
  chapelGlow.position.set(0, 2.5, 1.5);
  g.add(chapelGlow);
  const chapelGlow2 = new THREE.PointLight(0xffa84a, 0.6, 4, 1.8);
  chapelGlow2.position.set(0, 1.8, 1.5);
  g.add(chapelGlow2);

  return g;
}

/**
 * Tier-2 chapel — taller bell tower, second small spire, more candles inside.
 * Same footprint as the base chapel so it visually replaces it cleanly.
 */
export function buildingChapelGrand(): THREE.Group {
  const g = buildingChapel();
  // Add a second smaller front spire on the right side of the nave
  const spire = mkMesh(new THREE.ConeGeometry(0.55, 1.6, 6), roofSlate);
  spire.position.set(1.55, 4.4, 0);
  g.add(spire);
  const spireBase = mkMesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), stoneA);
  spireBase.position.set(1.55, 3.55, 0);
  g.add(spireBase);
  const spireTip = mkMesh(new THREE.SphereGeometry(0.08, 8, 6), brass);
  spireTip.position.set(1.55, 5.25, 0);
  g.add(spireTip);
  // Additional flying buttresses (decorative)
  for (const xOff of [-2.4, 2.4]) {
    const but = mkMesh(new THREE.BoxGeometry(0.25, 1.6, 0.5), stoneA);
    but.position.set(xOff, 1.0, 0);
    g.add(but);
  }
  // Extra interior glow
  const grandGlow = new THREE.PointLight(0xffc070, 1.2, 6, 1.5);
  grandGlow.position.set(0, 3.0, 0);
  g.add(grandGlow);
  return g;
}

/**
 * Tier-3 cathedral — replaces the chapel with a much taller spire, twin towers,
 * and rich golden trim. Visually distinct from a distance.
 */
export function buildingCathedral(): THREE.Group {
  const g = new THREE.Group();
  // Wide stone plinth
  const plinth = mkMesh(new THREE.BoxGeometry(5.2, 0.5, 4.0), stoneB);
  plinth.position.y = 0.25;
  g.add(plinth);
  // Tall central nave
  const nave = mkMesh(new THREE.BoxGeometry(4.4, 4.2, 3.4), stoneA);
  nave.position.y = 2.6;
  g.add(nave);
  // Steep gable roof
  const prism = new THREE.Shape();
  prism.moveTo(-2.4, 0); prism.lineTo(2.4, 0);
  prism.lineTo(0, 2.0); prism.lineTo(-2.4, 0);
  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(prism, { depth: 3.6, bevelEnabled: false }),
    stoneDark
  );
  roof.rotation.y = Math.PI / 2;
  roof.position.set(1.8, 4.7, 0);
  roof.castShadow = roof.receiveShadow = true;
  g.add(roof);
  // Gold ridge along the apex
  const ridge = mkMesh(new THREE.BoxGeometry(0.08, 0.08, 3.6), brass);
  ridge.position.set(0, 6.7, 0);
  g.add(ridge);

  // Twin bell towers, taller than the chapel
  const twinXs = [-2.4, 2.4];
  const stainedMap = stainedGlassTexture();
  for (const tx of twinXs) {
    const tower = mkMesh(new THREE.BoxGeometry(1.4, 5.4, 1.4), stoneA);
    tower.position.set(tx, 3.0, 0);
    g.add(tower);
    const cap = mkMesh(new THREE.ConeGeometry(1.05, 2.2, 4), roofSlate);
    cap.position.set(tx, 6.7, 0);
    cap.rotation.y = Math.PI / 4;
    g.add(cap);
    const finial = mkMesh(new THREE.SphereGeometry(0.12, 8, 6), brass);
    finial.position.set(tx, 7.85, 0);
    g.add(finial);
    const cV = mkMesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), brass);
    cV.position.set(tx, 8.25, 0); g.add(cV);
    const cH = mkMesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), brass);
    cH.position.set(tx, 8.3, 0); g.add(cH);
    // Stained-glass window on each tower facing forward
    const win = mkMesh(new THREE.PlaneGeometry(0.6, 1.4), new THREE.MeshStandardMaterial({
      map: stainedMap, emissive: 0xffffff, emissiveMap: stainedMap,
      emissiveIntensity: 1.5, roughness: 0.3, side: THREE.DoubleSide,
    }));
    win.position.set(tx, 4.0, 1.71);
    g.add(win);
  }

  // Massive central rose window (bigger than chapel's)
  const rose = mkMesh(new THREE.TorusGeometry(0.85, 0.1, 6, 24), brass);
  rose.position.set(0, 3.4, 1.72);
  rose.rotation.x = Math.PI / 2;
  g.add(rose);
  const roseInner = mkMesh(new THREE.CircleGeometry(0.82, 28), new THREE.MeshStandardMaterial({
    map: stainedMap, emissive: 0xffffff, emissiveMap: stainedMap,
    emissiveIntensity: 1.8, roughness: 0.25, side: THREE.DoubleSide,
  }));
  roseInner.position.set(0, 3.4, 1.73);
  g.add(roseInner);
  // Cross above rose window
  const xV = mkMesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), brass);
  xV.position.set(0, 4.6, 1.73); g.add(xV);
  const xH = mkMesh(new THREE.BoxGeometry(0.4, 0.12, 0.12), brass);
  xH.position.set(0, 4.65, 1.73); g.add(xH);

  // Heavy wooden double doors
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a1208, roughness: 0.85 });
  for (const dx of [-0.42, 0.42]) {
    const door = mkMesh(new THREE.BoxGeometry(0.78, 2.3, 0.12), doorMat);
    door.position.set(dx, 1.6, 1.72);
    g.add(door);
  }
  const arch = mkMesh(new THREE.TorusGeometry(0.85, 0.08, 6, 16, Math.PI), brass);
  arch.position.set(0, 2.7, 1.74);
  arch.rotation.x = -Math.PI / 2;
  g.add(arch);

  // Two strong warm lights inside
  const innerA = new THREE.PointLight(0xffb060, 2.0, 9, 1.4);
  innerA.position.set(0, 3.5, 0); g.add(innerA);
  const innerB = new THREE.PointLight(0xffc080, 1.0, 5, 1.6);
  innerB.position.set(0, 1.8, 1.6); g.add(innerB);

  // Gargoyle silhouettes at the four roof corners (small dark crouching forms)
  for (const [gx, gz] of [[-2.4, -1.7], [2.4, -1.7], [-2.4, 1.7], [2.4, 1.7]]) {
    const gargoyle = new THREE.Group();
    const body = mkMesh(new THREE.SphereGeometry(0.18, 8, 6), stoneDark);
    body.scale.set(1.2, 0.8, 1);
    gargoyle.add(body);
    const head = mkMesh(new THREE.SphereGeometry(0.11, 8, 6), stoneDark);
    head.position.set(0, 0.13, 0.16);
    gargoyle.add(head);
    // Tiny wings
    const wing = mkMesh(new THREE.BoxGeometry(0.04, 0.18, 0.32), stoneDark);
    wing.position.set(0, 0.1, -0.05);
    gargoyle.add(wing);
    gargoyle.position.set(gx, 4.85, gz);
    gargoyle.lookAt(gx * 2, 4.85, gz * 2);
    g.add(gargoyle);
  }

  return g;
}

export function buildingCrypt(): THREE.Group {
  const g = new THREE.Group();
  const plinth = mkMesh(new THREE.BoxGeometry(2.0, 0.25, 1.6), stoneB);
  plinth.position.y = 0.125;
  g.add(plinth);
  const main = mkMesh(new THREE.BoxGeometry(1.7, 1.4, 1.3), stoneA);
  main.position.y = 0.95;
  g.add(main);
  const roof = mkMesh(new THREE.BoxGeometry(1.9, 0.15, 1.5), stoneDark);
  roof.position.y = 1.725;
  g.add(roof);
  const door = mkMesh(new THREE.BoxGeometry(0.55, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x261a12, roughness: 0.9 }));
  door.position.set(0, 0.7, 0.67);
  g.add(door);
  return g;
}

/**
 * Tier-2 crypt — adds shoulder pillars, bigger plinth, glowing rune above door.
 */
export function buildingCryptOrnate(): THREE.Group {
  const g = buildingCrypt();
  // Two flanking pillars on the front
  for (const xOff of [-1.2, 1.2]) {
    const col = mkMesh(new THREE.CylinderGeometry(0.18, 0.2, 1.7, 10), stoneA);
    col.position.set(xOff, 0.9, 0.5);
    g.add(col);
    const cap = mkMesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), stoneB);
    cap.position.set(xOff, 1.8, 0.5);
    g.add(cap);
  }
  // Wider stepped plinth
  const step = mkMesh(new THREE.BoxGeometry(2.4, 0.18, 1.95), stoneB);
  step.position.y = 0.09;
  g.add(step);
  // Rune plaque above the door
  const runeTex = runesEmissiveTexture();
  const runes = mkMesh(new THREE.PlaneGeometry(0.75, 0.3), new THREE.MeshStandardMaterial({
    map: runeTex, emissive: 0xffffff, emissiveMap: runeTex,
    emissiveIntensity: 1.4, transparent: true, roughness: 0.5,
  }));
  runes.position.set(0, 1.4, 0.68);
  g.add(runes);
  return g;
}

/**
 * Tier-3 crypt — full mausoleum: tall colonnade, dome roof, glowing arches.
 */
export function buildingMausoleumGrand(): THREE.Group {
  const g = new THREE.Group();
  // Wide stepped plinth
  const step1 = mkMesh(new THREE.BoxGeometry(3.4, 0.2, 2.6), stoneB);
  step1.position.y = 0.1; g.add(step1);
  const step2 = mkMesh(new THREE.BoxGeometry(3.0, 0.2, 2.2), stoneA);
  step2.position.y = 0.3; g.add(step2);
  // Main body
  const body = mkMesh(new THREE.BoxGeometry(2.6, 1.9, 1.9), stoneA);
  body.position.y = 1.35;
  g.add(body);
  // Cornice
  const cornice = mkMesh(new THREE.BoxGeometry(2.9, 0.18, 2.1), stoneB);
  cornice.position.y = 2.4; g.add(cornice);
  // Dome roof
  const dome = mkMesh(new THREE.SphereGeometry(0.95, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), stoneDark);
  dome.position.y = 2.5;
  g.add(dome);
  const domeRing = mkMesh(new THREE.TorusGeometry(0.95, 0.05, 6, 18), brass);
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.y = 2.5;
  g.add(domeRing);
  // Cross atop the dome
  const cV = mkMesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), brass);
  cV.position.y = 3.65; g.add(cV);
  const cH = mkMesh(new THREE.BoxGeometry(0.32, 0.1, 0.1), brass);
  cH.position.y = 3.7; g.add(cH);
  // Front colonnade — 4 columns
  for (const xOff of [-1.05, -0.35, 0.35, 1.05]) {
    const col = mkMesh(new THREE.CylinderGeometry(0.12, 0.13, 1.85, 10), stoneA);
    col.position.set(xOff, 1.225, 1.05);
    g.add(col);
    const cap = mkMesh(new THREE.BoxGeometry(0.32, 0.08, 0.32), stoneB);
    cap.position.set(xOff, 2.2, 1.05);
    g.add(cap);
  }
  // Heavy double doors
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.85 });
  for (const dx of [-0.3, 0.3]) {
    const door = mkMesh(new THREE.BoxGeometry(0.55, 1.3, 0.08), doorMat);
    door.position.set(dx, 1.05, 0.96);
    g.add(door);
  }
  // Rune plaque above doors
  const runeTex = runesEmissiveTexture();
  const runes = mkMesh(new THREE.PlaneGeometry(1.2, 0.34), new THREE.MeshStandardMaterial({
    map: runeTex, emissive: 0xffffff, emissiveMap: runeTex,
    emissiveIntensity: 1.6, transparent: true, roughness: 0.5,
  }));
  runes.position.set(0, 1.95, 0.97);
  g.add(runes);
  // Interior glow
  const glow = new THREE.PointLight(0xa8c6ff, 1.0, 5, 1.5);
  glow.position.set(0, 1.6, 0); g.add(glow);
  return g;
}

export function buildingBigCross(): THREE.Group {
  const g = new THREE.Group();
  const base = mkMesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), stoneB);
  base.position.y = 0.3;
  g.add(base);
  const pedestal = mkMesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), stoneA);
  pedestal.position.y = 1.1;
  g.add(pedestal);
  const vert = mkMesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), stoneA);
  vert.position.y = 3.2;
  g.add(vert);
  const horiz = mkMesh(new THREE.BoxGeometry(1.6, 0.3, 0.26), stoneA);
  horiz.position.y = 3.9;
  g.add(horiz);
  // Glowing rune plaque on the pedestal face
  const runeTex = runesEmissiveTexture();
  const runes = mkMesh(
    new THREE.PlaneGeometry(0.8, 0.7),
    new THREE.MeshStandardMaterial({
      map: runeTex, emissive: 0xffffff, emissiveMap: runeTex,
      emissiveIntensity: 1.4, transparent: true, roughness: 0.6,
    })
  );
  runes.position.set(0, 1.1, 0.51);
  g.add(runes);
  // Perched raven on the top of the cross
  g.add(raven(0, 4.1, 0));
  return g;
}

/**
 * Small perched raven silhouette — charcoal body, sharp beak, subtle red eye.
 * Mostly reads as a dark lump in top-down view but adds gothic flavor.
 */
export function raven(x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x070408, roughness: 0.9 });
  const body = mkMesh(new THREE.SphereGeometry(0.1, 8, 6), bodyMat);
  body.scale.set(1, 0.75, 1.4);
  body.position.y = 0.08;
  g.add(body);
  const head = mkMesh(new THREE.SphereGeometry(0.065, 8, 6), bodyMat);
  head.position.set(0, 0.18, 0.1);
  g.add(head);
  const beak = mkMesh(new THREE.ConeGeometry(0.022, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 0.5 }));
  beak.position.set(0, 0.18, 0.18);
  beak.rotation.x = Math.PI / 2;
  g.add(beak);
  const eye = mkMesh(
    new THREE.SphereGeometry(0.012, 6, 4),
    new THREE.MeshStandardMaterial({ color: 0xff2818, emissive: 0xff1808, emissiveIntensity: 1.2, roughness: 0.2 })
  );
  eye.position.set(0.04, 0.2, 0.14);
  g.add(eye);
  // Tail tip
  const tail = mkMesh(new THREE.ConeGeometry(0.05, 0.14, 4), bodyMat);
  tail.position.set(0, 0.08, -0.15);
  tail.rotation.x = -Math.PI / 2;
  g.add(tail);
  return g;
}

export function buildingGate(): THREE.Group {
  const g = new THREE.Group();
  const leftPillar = mkMesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), stoneA);
  leftPillar.position.set(-1.5, 1.6, 0);
  g.add(leftPillar);
  const rightPillar = mkMesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), stoneA);
  rightPillar.position.set(1.5, 1.6, 0);
  g.add(rightPillar);
  // Pillar caps
  const capGeo = new THREE.BoxGeometry(0.9, 0.2, 0.9);
  const lCap = mkMesh(capGeo, stoneDark);
  lCap.position.set(-1.5, 3.3, 0);
  g.add(lCap);
  const rCap = mkMesh(capGeo, stoneDark);
  rCap.position.set(1.5, 3.3, 0);
  g.add(rCap);
  // Arch
  const arch = mkMesh(new THREE.TorusGeometry(1.15, 0.12, 6, 18, Math.PI), rustMetal);
  arch.position.set(0, 3.2, 0);
  arch.rotation.x = Math.PI;
  g.add(arch);
  // Crosses on top of pillars
  const cGeoV = new THREE.BoxGeometry(0.12, 0.4, 0.12);
  const cGeoH = new THREE.BoxGeometry(0.3, 0.1, 0.1);
  for (const x of [-1.5, 1.5]) {
    const v = mkMesh(cGeoV, brass);
    v.position.set(x, 3.65, 0);
    g.add(v);
    const h = mkMesh(cGeoH, brass);
    h.position.set(x, 3.7, 0);
    g.add(h);
  }
  return g;
}

// ---------------- Flowers ----------------

function flowerMat(color: number, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive ? 0.6 : 0,
    roughness: 0.6,
  });
}

export function flower(colorHex: number, emissive = 0): THREE.Group {
  const g = new THREE.Group();
  const stem = mkMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5), new THREE.MeshStandardMaterial({ color: 0x3a5524, roughness: 0.9 }));
  stem.position.y = 0.175;
  g.add(stem);
  // 5 petals
  const petalMat = flowerMat(colorHex, emissive);
  for (let i = 0; i < 5; i++) {
    const p = mkMesh(new THREE.SphereGeometry(0.09, 6, 5), petalMat);
    const a = (i / 5) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.08, 0.35, Math.sin(a) * 0.08);
    p.scale.set(0.9, 0.6, 0.9);
    g.add(p);
  }
  const core = mkMesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshStandardMaterial({ color: 0xffd24a, roughness: 0.5, emissive: 0xaa7700, emissiveIntensity: 0.3 }));
  core.position.y = 0.38;
  g.add(core);
  // Tiny leaves
  const leafGeo = new THREE.PlaneGeometry(0.15, 0.08);
  const l1 = new THREE.Mesh(leafGeo, flowerLeaf);
  l1.position.set(0.08, 0.15, 0);
  l1.rotation.y = 0.5;
  l1.rotation.z = -0.3;
  l1.castShadow = false;
  l1.receiveShadow = false;
  g.add(l1);
  return g;
}

// ---------------- Fences ----------------

export function fenceWood(): THREE.Group {
  const g = new THREE.Group();
  for (let i = -2; i <= 2; i++) {
    const post = mkMesh(new THREE.BoxGeometry(0.09, 0.6, 0.09), wood);
    post.position.set(i * 0.24, 0.3, 0);
    g.add(post);
  }
  const rail = mkMesh(new THREE.BoxGeometry(1.15, 0.08, 0.06), wood);
  rail.position.y = 0.45;
  g.add(rail);
  return g;
}

export function fenceIron(): THREE.Group {
  const g = new THREE.Group();
  for (let i = -2; i <= 2; i++) {
    const post = mkMesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), rustMetal);
    post.position.set(i * 0.24, 0.35, 0);
    g.add(post);
  }
  const rail = mkMesh(new THREE.BoxGeometry(1.15, 0.05, 0.05), rustMetal);
  rail.position.y = 0.55;
  g.add(rail);
  const rail2 = mkMesh(new THREE.BoxGeometry(1.15, 0.05, 0.05), rustMetal);
  rail2.position.y = 0.2;
  g.add(rail2);
  // Brass spearheads
  for (let i = -2; i <= 2; i++) {
    const tip = mkMesh(new THREE.ConeGeometry(0.04, 0.12, 4), brass);
    tip.position.set(i * 0.24, 0.76, 0);
    tip.rotation.y = Math.PI / 4;
    g.add(tip);
  }
  return g;
}

export function fenceStone(): THREE.Group {
  const g = new THREE.Group();
  const wall = mkMesh(new THREE.BoxGeometry(1.2, 0.45, 0.18), stoneA);
  wall.position.y = 0.225;
  g.add(wall);
  // Moss patch
  const moss = mkMesh(new THREE.BoxGeometry(0.6, 0.08, 0.19), mossGreen);
  moss.position.set(-0.2, 0.1, 0);
  g.add(moss);
  return g;
}

// ---------------- Decor ----------------

export function decorBouquet(color: number): THREE.Group {
  const g = new THREE.Group();
  // Wrapping paper cone around the stems
  const wrapMat = new THREE.MeshStandardMaterial({ color: 0x6a5c3a, roughness: 0.95 });
  const wrap = mkMesh(new THREE.ConeGeometry(0.13, 0.18, 8, 1, true), wrapMat);
  wrap.position.y = 0.08;
  wrap.rotation.x = Math.PI;
  g.add(wrap);
  // 6 flower heads instead of 3 flat spheres, with petals pointing outward
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 0.06 + Math.random() * 0.02;
    const head = mkMesh(new THREE.IcosahedronGeometry(0.06, 0), flowerMat(color));
    head.position.set(Math.cos(a) * r, 0.2 + Math.random() * 0.03, Math.sin(a) * r);
    g.add(head);
    // Gold center
    const core = mkMesh(
      new THREE.SphereGeometry(0.02, 5, 4),
      new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0x886600, emissiveIntensity: 0.6 })
    );
    core.position.copy(head.position);
    g.add(core);
  }
  // Central tall flower
  const center = mkMesh(new THREE.IcosahedronGeometry(0.08, 0), flowerMat(color));
  center.position.set(0, 0.24, 0);
  g.add(center);
  // A couple of leaves
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a3a1a, roughness: 0.9, side: THREE.DoubleSide });
  for (const ang of [0.6, -0.6]) {
    const leaf = mkMesh(new THREE.PlaneGeometry(0.12, 0.06), leafMat);
    leaf.position.set(Math.cos(ang) * 0.08, 0.14, Math.sin(ang) * 0.08);
    leaf.rotation.y = ang;
    leaf.rotation.x = -0.3;
    g.add(leaf);
  }
  // Stems
  const stems = mkMesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.15, 5),
    new THREE.MeshStandardMaterial({ color: 0x2a3a1a, roughness: 0.9 })
  );
  stems.position.y = 0.08;
  g.add(stems);
  return g;
}

export function decorCandle(): THREE.Group {
  const g = new THREE.Group();
  // Ornate brass holder with a base plate
  const plate = mkMesh(new THREE.CylinderGeometry(0.12, 0.13, 0.03, 12), brass);
  plate.position.y = 0.015;
  g.add(plate);
  const holder = mkMesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 12), brass);
  holder.position.y = 0.08;
  g.add(holder);
  // Decorative ring around holder
  const ring = mkMesh(new THREE.TorusGeometry(0.075, 0.012, 4, 12), brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  g.add(ring);
  // Wax — slightly tapered with a warm cream color
  const waxMat = new THREE.MeshStandardMaterial({ color: 0xe8d8a8, roughness: 0.4 });
  const wax = mkMesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 10), waxMat);
  wax.position.y = 0.25;
  g.add(wax);
  // Wax drips (sphere dribbles)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const drip = mkMesh(new THREE.SphereGeometry(0.02, 5, 4), waxMat);
    drip.position.set(Math.cos(a) * 0.046, 0.18 + Math.random() * 0.04, Math.sin(a) * 0.046);
    drip.scale.y = 1.8;
    g.add(drip);
  }
  // Wick (dark stub)
  const wick = mkMesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.03, 4),
    new THREE.MeshStandardMaterial({ color: 0x1a1408, roughness: 0.9 })
  );
  wick.position.y = 0.37;
  g.add(wick);
  // Flame
  const flame = mkMesh(
    new THREE.SphereGeometry(0.035, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff8800, emissiveIntensity: 1.8 })
  );
  flame.position.y = 0.4;
  flame.scale.y = 1.6;
  g.add(flame);
  // Point light glow
  const pl = new THREE.PointLight(0xffa040, 0.5, 2.2, 2);
  pl.position.y = 0.4;
  g.add(pl);
  return g;
}

export function decorWreath(): THREE.Group {
  const g = new THREE.Group();
  // Dark evergreen base
  const ring = mkMesh(new THREE.TorusGeometry(0.22, 0.06, 8, 24), mossGreen);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.18;
  g.add(ring);
  // A second inner ring for depth
  const inner = mkMesh(
    new THREE.TorusGeometry(0.2, 0.035, 6, 20),
    new THREE.MeshStandardMaterial({ color: 0x1a3020, roughness: 0.95 })
  );
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.22;
  g.add(inner);
  // Scattered red berry accents
  const berryMat = new THREE.MeshStandardMaterial({ color: 0x8c1a1a, roughness: 0.6, emissive: 0x3a0808, emissiveIntensity: 0.3 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const b = mkMesh(new THREE.SphereGeometry(0.025, 6, 5), berryMat);
    b.position.set(Math.cos(a) * 0.22, 0.2, Math.sin(a) * 0.22);
    g.add(b);
  }
  // Couple of flower accents
  const fMat = flowerMat(0xc87cc8);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fl = mkMesh(new THREE.IcosahedronGeometry(0.035, 0), fMat);
    fl.position.set(Math.cos(a) * 0.22, 0.22, Math.sin(a) * 0.22);
    g.add(fl);
  }
  // Dark ribbon at the bottom
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x2a1030, roughness: 0.5 });
  const ribbon = mkMesh(new THREE.BoxGeometry(0.07, 0.22, 0.015), ribbonMat);
  ribbon.position.set(0, 0.06, 0.22);
  g.add(ribbon);
  // Ribbon tips splayed
  for (const sign of [-1, 1]) {
    const tip = mkMesh(new THREE.BoxGeometry(0.05, 0.1, 0.01), ribbonMat);
    tip.position.set(sign * 0.045, 0.02, 0.24);
    tip.rotation.z = sign * 0.5;
    g.add(tip);
  }
  return g;
}

export function decorBible(): THREE.Group {
  const g = new THREE.Group();
  // Leather cover (uses woodTexture for subtle grain)
  const coverMat = new THREE.MeshStandardMaterial({
    map: woodTexture(),
    color: 0x401a14,
    roughness: 0.7,
  });
  const book = mkMesh(new THREE.BoxGeometry(0.35, 0.08, 0.25), coverMat);
  book.position.y = 0.04;
  g.add(book);
  // Gold page edge visible along sides
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xe8d07a, roughness: 0.5 });
  const pages = mkMesh(new THREE.BoxGeometry(0.34, 0.05, 0.245), pageMat);
  pages.position.y = 0.045;
  g.add(pages);
  // Cover on top of pages
  const topCover = mkMesh(new THREE.BoxGeometry(0.36, 0.015, 0.255), coverMat);
  topCover.position.y = 0.075;
  g.add(topCover);
  // Cross embossed on cover
  const crossV = mkMesh(new THREE.BoxGeometry(0.025, 0.015, 0.14), brass);
  crossV.position.set(0, 0.084, 0);
  g.add(crossV);
  const crossH = mkMesh(new THREE.BoxGeometry(0.09, 0.015, 0.025), brass);
  crossH.position.set(0, 0.084, 0);
  g.add(crossH);
  // Brass corner studs
  const studMat = brass;
  for (const sx of [-0.14, 0.14]) {
    for (const sz of [-0.09, 0.09]) {
      const stud = mkMesh(new THREE.SphereGeometry(0.015, 5, 4), studMat);
      stud.position.set(sx, 0.086, sz);
      g.add(stud);
    }
  }
  // Front clasp
  const clasp = mkMesh(new THREE.BoxGeometry(0.04, 0.02, 0.08), studMat);
  clasp.position.set(0.175, 0.05, 0);
  g.add(clasp);
  return g;
}

// ---------------- Scatter decor (placed by ThreeWorld during scene build) ----------------

/** Pile of bones lying on the grass. Creepy ambient detail. */
export function decorBonePile(): THREE.Group {
  const g = new THREE.Group();
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xd6cdaa, roughness: 0.85 });
  const dustMat = new THREE.MeshStandardMaterial({ color: 0x4a3f2c, roughness: 1.0 });
  const dust = mkMesh(new THREE.CircleGeometry(0.32, 16), dustMat, false, true);
  dust.rotation.x = -Math.PI / 2;
  dust.position.y = 0.005;
  g.add(dust);
  // Long bones (femur-like) made of cylinder + 2 endcaps.
  for (let i = 0; i < 4; i++) {
    const bone = new THREE.Group();
    const shaft = mkMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8), boneMat);
    shaft.rotation.z = Math.PI / 2;
    bone.add(shaft);
    const c1 = mkMesh(new THREE.SphereGeometry(0.04, 8, 6), boneMat);
    c1.position.x = -0.18;
    bone.add(c1);
    const c2 = mkMesh(new THREE.SphereGeometry(0.04, 8, 6), boneMat);
    c2.position.x = 0.18;
    bone.add(c2);
    bone.rotation.y = (Math.PI / 4) * i + 0.3;
    bone.position.set((i - 1.5) * 0.06, 0.04, (i % 2 === 0 ? -0.05 : 0.05));
    g.add(bone);
  }
  return g;
}

/** Skull on the grass — small ambient horror prop. */
export function decorSkull(): THREE.Group {
  const g = new THREE.Group();
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xd9d0ad, roughness: 0.8 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x050300, roughness: 1.0 });
  const skull = mkMesh(new THREE.SphereGeometry(0.13, 14, 10), boneMat);
  skull.position.y = 0.13;
  skull.scale.set(1, 0.95, 1.05);
  g.add(skull);
  // Jaw
  const jaw = mkMesh(new THREE.BoxGeometry(0.18, 0.05, 0.16), boneMat);
  jaw.position.y = 0.045;
  g.add(jaw);
  // Eye sockets
  const eL = mkMesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
  eL.position.set(-0.05, 0.14, 0.11);
  g.add(eL);
  const eR = mkMesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
  eR.position.set(0.05, 0.14, 0.11);
  g.add(eR);
  // Nose hole
  const nose = mkMesh(new THREE.ConeGeometry(0.02, 0.04, 6), eyeMat);
  nose.position.set(0, 0.1, 0.13);
  nose.rotation.x = Math.PI;
  g.add(nose);
  // Tiny teeth row
  for (let i = -2; i <= 2; i++) {
    const t = mkMesh(new THREE.BoxGeometry(0.018, 0.025, 0.018), boneMat);
    t.position.set(i * 0.022, 0.075, 0.085);
    g.add(t);
  }
  return g;
}

/** Tall lantern post — wrought-iron pole with a glowing brass lamp. */
export function decorLanternPole(): THREE.Group {
  const g = new THREE.Group();
  const baseStone = mkMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 12), stoneDark);
  baseStone.position.y = 0.06;
  g.add(baseStone);
  const pole = mkMesh(new THREE.CylinderGeometry(0.035, 0.045, 1.6, 8), rustMetal);
  pole.position.y = 0.92;
  g.add(pole);
  // Decorative midring
  const ring = mkMesh(new THREE.TorusGeometry(0.07, 0.014, 6, 16), brass);
  ring.position.y = 1.05;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  // Lamp head — brass cage
  const lampBase = mkMesh(new THREE.CylinderGeometry(0.13, 0.11, 0.05, 12), brass);
  lampBase.position.y = 1.62;
  g.add(lampBase);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffe7a8, emissive: 0xffa648, emissiveIntensity: 1.6,
    transparent: true, opacity: 0.85, roughness: 0.4,
  });
  const glass = mkMesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), glassMat);
  glass.position.y = 1.78;
  g.add(glass);
  // Cage frame (4 thin verticals)
  for (let i = 0; i < 4; i++) {
    const bar = mkMesh(new THREE.BoxGeometry(0.012, 0.24, 0.012), brass);
    const a = (Math.PI / 2) * i + Math.PI / 4;
    bar.position.set(Math.cos(a) * 0.092, 1.78, Math.sin(a) * 0.092);
    g.add(bar);
  }
  // Cap (pyramid)
  const cap = mkMesh(new THREE.ConeGeometry(0.16, 0.12, 4), brass);
  cap.position.y = 1.97;
  cap.rotation.y = Math.PI / 4;
  g.add(cap);
  // Light source
  const lamp = new THREE.PointLight(0xffa346, 0.85, 4.5, 1.6);
  lamp.position.set(0, 1.78, 0);
  g.add(lamp);
  return g;
}

/** Stone urn / vase — ornate funerary urn with handles. */
export function decorStoneUrn(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6e6a64, roughness: 0.95 });
  const base = mkMesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 14), stoneMat);
  base.position.y = 0.03;
  g.add(base);
  const stem = mkMesh(new THREE.CylinderGeometry(0.08, 0.12, 0.1, 12), stoneMat);
  stem.position.y = 0.1;
  g.add(stem);
  const body = mkMesh(new THREE.SphereGeometry(0.18, 14, 10), stoneMat);
  body.position.y = 0.28;
  body.scale.set(1, 1.15, 1);
  g.add(body);
  const neck = mkMesh(new THREE.CylinderGeometry(0.1, 0.13, 0.06, 12), stoneMat);
  neck.position.y = 0.46;
  g.add(neck);
  // Lip
  const lip = mkMesh(new THREE.TorusGeometry(0.12, 0.018, 6, 14), stoneMat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.5;
  g.add(lip);
  // Two handle scrolls
  for (const s of [-1, 1]) {
    const h = mkMesh(new THREE.TorusGeometry(0.06, 0.014, 6, 12), stoneMat);
    h.position.set(s * 0.18, 0.32, 0);
    h.rotation.y = Math.PI / 2;
    g.add(h);
  }
  // Wilted flowers spilling out
  const flowerMat1 = flowerMat(0x6a3a3a, 0.05);
  for (let i = 0; i < 3; i++) {
    const stem2 = mkMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), mossGreen);
    stem2.position.set(Math.cos(i * 2) * 0.04, 0.55, Math.sin(i * 2) * 0.04);
    stem2.rotation.set(0.3 * Math.cos(i), 0, 0.3 * Math.sin(i));
    g.add(stem2);
    const head = mkMesh(new THREE.SphereGeometry(0.025, 8, 6), flowerMat1);
    head.position.set(Math.cos(i * 2) * 0.06, 0.62, Math.sin(i * 2) * 0.06);
    g.add(head);
  }
  return g;
}

/** Pile of fresh-dug earth — moist dark soil with a shovel mark. */
export function decorDirtMound(): THREE.Group {
  const g = new THREE.Group();
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x2d2218, roughness: 1.0 });
  const wetDirtMat = new THREE.MeshStandardMaterial({ color: 0x1d1610, roughness: 0.9 });
  const big = mkMesh(new THREE.SphereGeometry(0.32, 12, 8), dirtMat);
  big.position.y = 0.1;
  big.scale.set(1, 0.5, 1);
  g.add(big);
  const top = mkMesh(new THREE.SphereGeometry(0.18, 10, 7), wetDirtMat);
  top.position.y = 0.18;
  top.scale.set(1, 0.7, 1);
  g.add(top);
  // Couple of stones
  for (let i = 0; i < 4; i++) {
    const s = mkMesh(new THREE.SphereGeometry(0.04, 6, 5), stoneDark);
    s.position.set(Math.cos(i * 1.6) * 0.22, 0.1 + (i % 2) * 0.05, Math.sin(i * 1.6) * 0.22);
    g.add(s);
  }
  return g;
}

/** Wooden cross-stake driven into the ground — peasant marker. */
export function decorCrossStake(): THREE.Group {
  const g = new THREE.Group();
  const vert = mkMesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), wood);
  vert.position.y = 0.27;
  g.add(vert);
  const horiz = mkMesh(new THREE.BoxGeometry(0.32, 0.06, 0.06), wood);
  horiz.position.y = 0.4;
  g.add(horiz);
  // Rope tying joint
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x6b4d2e, roughness: 0.95 });
  const rope = mkMesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), ropeMat);
  rope.position.y = 0.4;
  rope.rotation.x = Math.PI / 2;
  g.add(rope);
  return g;
}

/** Pumpkin — gourd with carved face (low-poly Halloween). */
export function decorPumpkin(): THREE.Group {
  const g = new THREE.Group();
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xc26a26, roughness: 0.7 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a3a18, roughness: 0.95 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffaa44, emissive: 0xff8a30, emissiveIntensity: 1.2, roughness: 0.6,
  });
  // Body — squashed sphere
  const body = mkMesh(new THREE.SphereGeometry(0.18, 14, 10), orangeMat);
  body.position.y = 0.16;
  body.scale.set(1.1, 0.8, 1.1);
  g.add(body);
  // Stem
  const stem = mkMesh(new THREE.CylinderGeometry(0.025, 0.04, 0.07, 6), stemMat);
  stem.position.y = 0.32;
  g.add(stem);
  // Carved triangular eyes + mouth (emissive)
  for (const x of [-0.06, 0.06]) {
    const eye = mkMesh(new THREE.ConeGeometry(0.025, 0.03, 3), eyeMat);
    eye.position.set(x, 0.18, 0.16);
    eye.rotation.x = Math.PI / 2;
    g.add(eye);
  }
  const mouth = mkMesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), eyeMat);
  mouth.position.set(0, 0.12, 0.18);
  g.add(mouth);
  return g;
}

// ---------------- Entities ----------------

/**
 * Ancient Elf Mage — dark robe, hood, silver hair, staff with glowing orb.
 * Designed to read well from a top-down camera angle.
 *
 * Customization: optional `spec` overrides robe primary/trim colors, the head
 * piece (hood / wizard hat / circlet) and the staff orb color.
 */
export interface PlayerLook {
  robePrimary?: number;
  robeTrim?: number;
  orbColor?: number;
  orbEmissive?: number;
  hoodStyle?: "down" | "up" | "wizard" | "circlet";
}

export function entityPlayer(spec?: PlayerLook): THREE.Group {
  const robePrimary = spec?.robePrimary ?? 0x1a1230;
  const robeTrim    = spec?.robeTrim    ?? 0x8c6a2a;
  const orbColor    = spec?.orbColor    ?? 0x6fc8ff;
  const orbEmissive = spec?.orbEmissive ?? 0x3a9cff;
  const hoodStyle   = spec?.hoodStyle   ?? "down";

  const g = new THREE.Group();
  // Boots (leather)
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.85 });
  const bootsGeo = new THREE.BoxGeometry(0.16, 0.1, 0.2);
  const bL = mkMesh(bootsGeo, bootMat);
  bL.position.set(-0.11, 0.05, 0);
  g.add(bL);
  const bR = mkMesh(bootsGeo, bootMat);
  bR.position.set(0.11, 0.05, 0);
  g.add(bR);

  // Long flowing robe — deep purple-black with subtle sheen.
  const robeMat = new THREE.MeshStandardMaterial({
    color: robePrimary,
    roughness: 0.55,
    metalness: 0.15,
  });
  const robeLower = mkMesh(new THREE.CylinderGeometry(0.32, 0.42, 0.75, 10), robeMat);
  robeLower.position.y = 0.48;
  g.add(robeLower);
  const robeUpper = mkMesh(new THREE.CylinderGeometry(0.26, 0.32, 0.3, 10), robeMat);
  robeUpper.position.y = 0.98;
  g.add(robeUpper);

  // Belt with glowing gem buckle
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 0.9 });
  const belt = mkMesh(new THREE.CylinderGeometry(0.345, 0.345, 0.07, 12), beltMat);
  belt.position.y = 0.75;
  g.add(belt);
  const buckle = mkMesh(
    new THREE.IcosahedronGeometry(0.06, 0),
    new THREE.MeshStandardMaterial({
      color: 0xc04020, emissive: 0x602010, emissiveIntensity: 1.2, roughness: 0.3,
    })
  );
  buckle.position.set(0, 0.75, 0.34);
  g.add(buckle);

  // Shoulder mantle / pauldrons — darker fabric flared at shoulders.
  const mantleMat = new THREE.MeshStandardMaterial({ color: 0x0c0818, roughness: 0.8 });
  const mantle = mkMesh(new THREE.CylinderGeometry(0.38, 0.26, 0.2, 12, 1, true), mantleMat);
  mantle.position.y = 1.06;
  g.add(mantle);

  // Gold trim at hem (customizable)
  const goldMat = new THREE.MeshStandardMaterial({ color: robeTrim, roughness: 0.4, metalness: 0.6 });
  const hem = mkMesh(new THREE.TorusGeometry(0.42, 0.018, 5, 20), goldMat);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.13;
  g.add(hem);

  // Head (pale elf skin)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc6, roughness: 0.7 });
  const head = mkMesh(new THREE.SphereGeometry(0.17, 12, 10), skinMat);
  head.position.y = 1.28;
  g.add(head);

  // Pointy elf ears
  const earGeo = new THREE.ConeGeometry(0.05, 0.16, 5);
  const earL = mkMesh(earGeo, skinMat);
  earL.position.set(-0.17, 1.32, -0.02);
  earL.rotation.z = Math.PI / 2 - 0.25;
  g.add(earL);
  const earR = mkMesh(earGeo, skinMat);
  earR.position.set(0.17, 1.32, -0.02);
  earR.rotation.z = -Math.PI / 2 + 0.25;
  g.add(earR);

  // Long silver hair falling behind the shoulders
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xd8d8e4, roughness: 0.5 });
  const hairBack = mkMesh(new THREE.BoxGeometry(0.36, 0.42, 0.08), hairMat);
  hairBack.position.set(0, 1.18, -0.18);
  g.add(hairBack);
  const hairTop = mkMesh(new THREE.SphereGeometry(0.19, 10, 8), hairMat);
  hairTop.position.y = 1.36;
  hairTop.scale.set(1, 0.6, 1);
  g.add(hairTop);

  // Hood / cap variant — controlled by hoodStyle.
  const hoodMat = new THREE.MeshStandardMaterial({ color: 0x0c0818, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: robeTrim, roughness: 0.4, metalness: 0.6 });
  if (hoodStyle === "down") {
    const hood = mkMesh(new THREE.ConeGeometry(0.22, 0.55, 8), hoodMat);
    hood.position.set(0, 1.18, -0.22);
    hood.rotation.x = -0.25;
    g.add(hood);
  } else if (hoodStyle === "up") {
    // Hood pulled up: drape covering top of head
    const hoodTop = mkMesh(new THREE.SphereGeometry(0.21, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), hoodMat);
    hoodTop.position.set(0, 1.34, 0);
    g.add(hoodTop);
    const hoodBack = mkMesh(new THREE.ConeGeometry(0.18, 0.4, 8), hoodMat);
    hoodBack.position.set(0, 1.22, -0.18);
    hoodBack.rotation.x = -0.4;
    g.add(hoodBack);
  } else if (hoodStyle === "wizard") {
    // Tall pointy wizard hat
    const brim = mkMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 14), hoodMat);
    brim.position.y = 1.42;
    g.add(brim);
    const cone = mkMesh(new THREE.ConeGeometry(0.15, 0.6, 12), hoodMat);
    cone.position.y = 1.74;
    cone.rotation.z = 0.12;
    g.add(cone);
    const tip = mkMesh(new THREE.SphereGeometry(0.025, 8, 6), trimMat);
    tip.position.set(0.04, 2.05, 0);
    g.add(tip);
    // Star ornament on the front of the hat
    const star = mkMesh(new THREE.IcosahedronGeometry(0.04, 0),
      new THREE.MeshStandardMaterial({ color: orbColor, emissive: orbEmissive, emissiveIntensity: 1.2 }));
    star.position.set(0, 1.6, 0.13);
    g.add(star);
  } else if (hoodStyle === "circlet") {
    // Thin metal circlet with a center gem
    const ring = mkMesh(new THREE.TorusGeometry(0.18, 0.012, 8, 24), trimMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.36;
    g.add(ring);
    const gem = mkMesh(new THREE.OctahedronGeometry(0.035, 0),
      new THREE.MeshStandardMaterial({ color: orbColor, emissive: orbEmissive, emissiveIntensity: 1.5 }));
    gem.position.set(0, 1.36, 0.18);
    g.add(gem);
  }

  // ------- Staff held to the right -------
  const staffMat = new THREE.MeshStandardMaterial({ map: woodTexture(), color: 0x3a2712, roughness: 0.9 });
  const staff = mkMesh(new THREE.CylinderGeometry(0.025, 0.03, 1.7, 6), staffMat);
  staff.position.set(0.34, 0.85, 0.12);
  staff.rotation.z = -0.08;
  g.add(staff);
  // Staff clawed top (three prongs holding the orb)
  const prongMat = new THREE.MeshStandardMaterial({ color: 0x2a1f10, roughness: 0.75 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const prong = mkMesh(new THREE.CylinderGeometry(0.015, 0.008, 0.18, 4), prongMat);
    prong.position.set(0.34 + Math.cos(a) * 0.04, 1.78, 0.12 + Math.sin(a) * 0.04);
    prong.rotation.z = Math.cos(a) * 0.4;
    prong.rotation.x = Math.sin(a) * 0.4;
    g.add(prong);
  }
  // Glowing orb (customizable color)
  const orbMat = new THREE.MeshStandardMaterial({
    color: orbColor,
    emissive: orbEmissive,
    emissiveIntensity: 2.2,
    roughness: 0.15,
    transparent: true,
    opacity: 0.9,
  });
  const orb = mkMesh(new THREE.SphereGeometry(0.1, 14, 10), orbMat);
  orb.position.set(0.34, 1.82, 0.12);
  g.add(orb);
  // Orb halo sprite
  const haloMat = new THREE.MeshBasicMaterial({
    color: orbColor, transparent: true, opacity: 0.35, depthWrite: false,
  });
  const halo = mkMesh(new THREE.SphereGeometry(0.18, 10, 8), haloMat);
  halo.position.copy(orb.position);
  g.add(halo);

  return g;
}

/**
 * Gray tabby cat companion — fluffy body, pointy ears, stripe tail, green eyes.
 */
export function entityCat(): THREE.Group {
  const g = new THREE.Group();
  // Soft gray fur with a warm undertone.
  const furMat = new THREE.MeshStandardMaterial({ color: 0x7a7d82, roughness: 0.9 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xbbb9b4, roughness: 0.95 });
  const darkStripeMat = new THREE.MeshStandardMaterial({ color: 0x4a4c52, roughness: 0.95 });

  // Body — ellipsoid-ish
  const body = mkMesh(new THREE.SphereGeometry(0.22, 14, 10), furMat);
  body.scale.set(1.9, 0.7, 0.85);
  body.position.set(0, 0.22, 0);
  g.add(body);
  // Belly (lighter under)
  const belly = mkMesh(new THREE.SphereGeometry(0.19, 12, 8), bellyMat);
  belly.scale.set(1.7, 0.4, 0.7);
  belly.position.set(0, 0.17, 0);
  g.add(belly);

  // A couple of tabby stripes across the back
  for (let i = 0; i < 3; i++) {
    const s = mkMesh(new THREE.TorusGeometry(0.22, 0.015, 4, 10, Math.PI), darkStripeMat);
    s.rotation.x = -Math.PI / 2;
    s.rotation.z = Math.PI / 2;
    s.position.set(-0.15 + i * 0.15, 0.32, 0);
    s.scale.set(0.85, 0.85, 0.55);
    g.add(s);
  }

  // Chest tuft
  const chest = mkMesh(new THREE.SphereGeometry(0.1, 10, 8), bellyMat);
  chest.position.set(0.32, 0.2, 0);
  g.add(chest);

  // Head
  const head = mkMesh(new THREE.SphereGeometry(0.15, 14, 10), furMat);
  head.position.set(0.38, 0.32, 0);
  g.add(head);

  // Muzzle (lighter)
  const muzzle = mkMesh(new THREE.SphereGeometry(0.075, 8, 6), bellyMat);
  muzzle.position.set(0.48, 0.28, 0);
  muzzle.scale.set(1.2, 0.8, 1);
  g.add(muzzle);
  // Tiny pink nose
  const nose = mkMesh(
    new THREE.SphereGeometry(0.016, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0xe28484, roughness: 0.6 })
  );
  nose.position.set(0.535, 0.3, 0);
  g.add(nose);

  // Ears — triangle cones with inner pink
  const earGeo = new THREE.ConeGeometry(0.07, 0.13, 4);
  const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xde8a94, roughness: 0.8 });
  for (const sign of [-1, 1]) {
    const ear = mkMesh(earGeo, furMat);
    ear.position.set(0.33, 0.47, sign * 0.1);
    ear.rotation.x = sign * 0.15;
    ear.rotation.z = 0.15;
    g.add(ear);
    const inner = mkMesh(new THREE.ConeGeometry(0.042, 0.09, 4), earInnerMat);
    inner.position.set(0.34, 0.46, sign * 0.1);
    inner.rotation.x = sign * 0.15;
    inner.rotation.z = 0.15;
    g.add(inner);
  }

  // Green almond eyes
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x8ef560, emissive: 0x3c8a22, emissiveIntensity: 0.9, roughness: 0.25,
  });
  const eyeGeo = new THREE.SphereGeometry(0.026, 8, 6);
  for (const sign of [-1, 1]) {
    const eye = mkMesh(eyeGeo, eyeMat);
    eye.position.set(0.48, 0.36, sign * 0.06);
    eye.scale.set(1.2, 1.4, 0.7);
    g.add(eye);
    // Vertical slit pupil
    const pupil = mkMesh(
      new THREE.SphereGeometry(0.012, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    pupil.position.set(0.498, 0.36, sign * 0.06);
    pupil.scale.set(0.4, 1.8, 1);
    g.add(pupil);
  }

  // Whiskers (thin planes)
  const whiskerMat = new THREE.MeshStandardMaterial({ color: 0xecece8, roughness: 0.8 });
  for (let i = -1; i <= 1; i++) {
    for (const sign of [-1, 1]) {
      const wh = mkMesh(new THREE.BoxGeometry(0.18, 0.006, 0.006), whiskerMat);
      wh.position.set(0.52, 0.29 + i * 0.015, sign * 0.04);
      wh.rotation.y = sign * 0.2 + i * 0.05;
      g.add(wh);
    }
  }

  // Tail (longer, curled up)
  const tailSegMat = furMat;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const seg = mkMesh(new THREE.SphereGeometry(0.06 - t * 0.015, 8, 6), tailSegMat);
    seg.position.set(-0.3 - t * 0.08, 0.28 + Math.sin(t * 2.5) * 0.15 + 0.05 * t, 0);
    g.add(seg);
    // Occasional dark stripe on tail
    if (i === 1 || i === 3 || i === 5) {
      const stripe = mkMesh(
        new THREE.TorusGeometry(0.06 - t * 0.015, 0.01, 4, 8),
        darkStripeMat
      );
      stripe.rotation.y = Math.PI / 2;
      stripe.position.copy(seg.position);
      g.add(stripe);
    }
  }

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.18, 6);
  for (const [x, z] of [[-0.18, -0.1], [0.18, -0.1], [-0.18, 0.1], [0.18, 0.1]]) {
    const leg = mkMesh(legGeo, furMat);
    leg.position.set(x, 0.09, z);
    g.add(leg);
    // Paw bottom
    const paw = mkMesh(new THREE.SphereGeometry(0.04, 6, 5), bellyMat);
    paw.position.set(x, 0.015, z);
    paw.scale.set(1.2, 0.5, 1);
    g.add(paw);
  }

  return g;
}

export function entityZombie(variant: "normal" | "skinny" | "fat" | "headless" = "normal"): THREE.Group {
  const g = new THREE.Group();
  const skinColor = variant === "skinny" ? 0x9fbf7a : variant === "fat" ? 0x7fa560 : 0x8ca878;
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.9 });
  const ragMat = new THREE.MeshStandardMaterial({ color: 0x342422, roughness: 0.9 });
  const bodyW = variant === "fat" ? 0.55 : variant === "skinny" ? 0.3 : 0.4;
  const bodyH = variant === "skinny" ? 0.75 : 0.6;
  // Legs
  const legGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
  const lL = mkMesh(legGeo, ragMat);
  lL.position.set(-0.1, 0.2, 0);
  g.add(lL);
  const lR = mkMesh(legGeo, ragMat);
  lR.position.set(0.1, 0.2, 0);
  g.add(lR);
  // Body
  const body = mkMesh(new THREE.BoxGeometry(bodyW, bodyH, 0.25), ragMat);
  body.position.y = 0.4 + bodyH / 2;
  g.add(body);
  // Arms
  const armGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
  const aL = mkMesh(armGeo, ragMat);
  aL.position.set(-bodyW / 2 - 0.05, 0.65, 0.15);
  aL.rotation.x = -0.6;
  g.add(aL);
  const aR = mkMesh(armGeo, ragMat);
  aR.position.set(bodyW / 2 + 0.05, 0.65, 0.15);
  aR.rotation.x = -0.6;
  g.add(aR);
  // Head
  if (variant !== "headless") {
    const head = mkMesh(new THREE.SphereGeometry(0.16, 10, 8), skinMat);
    head.position.y = 0.4 + bodyH + 0.16;
    g.add(head);
    // Glowing eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x44ccff, emissive: 0x2288ff, emissiveIntensity: 1.2 });
    const eyeGeo = new THREE.SphereGeometry(0.03, 6, 5);
    const eL = mkMesh(eyeGeo, eyeMat);
    eL.position.set(-0.06, 0.4 + bodyH + 0.2, 0.14);
    g.add(eL);
    const eR = mkMesh(eyeGeo, eyeMat);
    eR.position.set(0.06, 0.4 + bodyH + 0.2, 0.14);
    g.add(eR);
  }
  return g;
}

// Grave hole (for dug plots).
export function graveHole(): THREE.Group {
  const g = new THREE.Group();
  const dirt = mkMesh(new THREE.BoxGeometry(0.9, 0.1, 0.65), earth);
  dirt.position.y = -0.04;
  g.add(dirt);
  const darker = mkMesh(new THREE.BoxGeometry(0.75, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 1 }));
  darker.position.y = -0.02;
  g.add(darker);
  return g;
}

// ---------------- Trees ----------------

/**
 * Procedural tree. Dark gothic variants only:
 *   "dead"  — gnarled dead oak, bare twisted branches, no canopy
 *   "pine"  — dark spruce, narrow deep-green canopy
 *   "oak"   — deprecated alias → "dead"
 *   "sakura"— deprecated alias → "dead"
 */
export function tree(variant: "oak" | "sakura" | "pine" | "dead" = "dead"): THREE.Group {
  const g = new THREE.Group();
  // Map old color-variants to the gothic set.
  const kind: "dead" | "pine" = variant === "pine" ? "pine" : "dead";

  const trunkMat = new THREE.MeshStandardMaterial({
    map: woodTexture(),
    color: kind === "dead" ? 0x1e1510 : 0x2a1e14,
    roughness: 0.95,
  });
  const trunkH = kind === "pine" ? 3.2 + Math.random() * 0.8 : 2.6 + Math.random() * 0.8;
  const trunk = mkMesh(new THREE.CylinderGeometry(0.12, 0.22, trunkH, 8), trunkMat);
  trunk.position.y = trunkH / 2;
  g.add(trunk);

  if (kind === "dead") {
    // Gnarled bare branches — many twisted sticks at different heights.
    const branchMat = trunkMat;
    const branchCount = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < branchCount; i++) {
      const yBase = trunkH * (0.45 + (i / branchCount) * 0.55);
      const a = (i / branchCount) * Math.PI * 2 + Math.random() * 1.2;
      const len = 0.8 + Math.random() * 0.9;
      const br = mkMesh(new THREE.CylinderGeometry(0.025, 0.06, len, 5), branchMat);
      // Position pivot at the base of the branch
      const baseR = 0.16;
      br.position.set(Math.cos(a) * baseR, yBase + len * 0.25, Math.sin(a) * baseR);
      br.rotation.z = -Math.cos(a) * (0.9 + Math.random() * 0.4);
      br.rotation.x = Math.sin(a) * (0.9 + Math.random() * 0.4);
      g.add(br);

      // A secondary twig off the end
      if (Math.random() < 0.7) {
        const twig = mkMesh(new THREE.CylinderGeometry(0.015, 0.028, 0.4 + Math.random() * 0.3, 4), branchMat);
        const tipX = Math.cos(a) * (baseR + len * 0.5);
        const tipZ = Math.sin(a) * (baseR + len * 0.5);
        const tipY = yBase + len * 0.5;
        twig.position.set(tipX, tipY + 0.15, tipZ);
        twig.rotation.z = -Math.cos(a + 0.4) * 1.1;
        twig.rotation.x = Math.sin(a + 0.4) * 1.1;
        g.add(twig);
      }
    }

    // A few dark clinging tufts (dead moss/lichen) so canopy isn't empty
    const tuftMat = new THREE.MeshStandardMaterial({ color: 0x1a2012, roughness: 0.95 });
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.4 + Math.random() * 0.5;
      const tuft = mkMesh(new THREE.IcosahedronGeometry(0.18 + Math.random() * 0.1, 0), tuftMat);
      tuft.position.set(Math.cos(a) * r, trunkH + Math.random() * 0.6, Math.sin(a) * r);
      g.add(tuft);
    }
    return g;
  }

  // kind === "pine"
  const pineColor = 0x14281a; // very dark forest green
  const leafMat = new THREE.MeshStandardMaterial({
    map: leavesTexture(pineColor),
    color: 0xbcd8b8,
    roughness: 0.85,
  });
  const canopyH = trunkH + 0.2;
  const clumps = 24;
  for (let i = 0; i < clumps; i++) {
    const t = i / clumps;
    const r = 0.75 * (1 - t * 0.9) + 0.15;
    const y = canopyH + t * 2.4;
    const leaf = mkMesh(new THREE.ConeGeometry(r, 0.5 + Math.random() * 0.2, 6), leafMat);
    const a = Math.random() * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.05, y, Math.sin(a) * 0.05);
    leaf.rotation.y = Math.random() * Math.PI;
    g.add(leaf);
  }
  // Very tip
  const tip = mkMesh(new THREE.ConeGeometry(0.2, 0.6, 6), leafMat);
  tip.position.y = canopyH + 2.6;
  g.add(tip);
  return g;
}

// ---------------- Grass clumps ----------------
export function grassClump(): THREE.Group {
  const g = new THREE.Group();
  // Darker, desaturated green to fit the gothic palette.
  const mat = new THREE.MeshStandardMaterial({ color: 0x2e5220, roughness: 0.95, side: THREE.DoubleSide });
  const blades = 12;
  for (let i = 0; i < blades; i++) {
    const h = 0.15 + Math.random() * 0.25;
    const blade = mkMesh(new THREE.PlaneGeometry(0.04, h), mat);
    const a = (i / blades) * Math.PI * 2 + Math.random() * 0.5;
    blade.position.set(Math.cos(a) * 0.08, h / 2, Math.sin(a) * 0.08);
    blade.rotation.y = Math.random() * Math.PI;
    g.add(blade);
  }
  return g;
}

// ---------------- Pond / water feature ----------------
export function pond(radius = 2.5): THREE.Group {
  const g = new THREE.Group();
  // Recessed pool
  const rimMat = new THREE.MeshStandardMaterial({ map: roughStoneTexture(), color: 0x7a7268, roughness: 0.95 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.25, 6, 40), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.08;
  rim.receiveShadow = true;
  rim.castShadow = true;
  g.add(rim);
  // Water disc
  const water = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.05, 40), waterMat());
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.06;
  water.receiveShadow = true;
  g.add(water);
  return g;
}
