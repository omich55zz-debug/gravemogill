import * as THREE from "three";

// Shared tiny sub-mesh materials — cached so we don't allocate per-instance.
const stoneA = new THREE.MeshStandardMaterial({ color: 0x8a8577, roughness: 0.92, metalness: 0.0 });
const stoneB = new THREE.MeshStandardMaterial({ color: 0x6a6458, roughness: 0.92 });
const stoneDark = new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.95 });
const marble = new THREE.MeshStandardMaterial({ color: 0xd9d4c4, roughness: 0.45 });
const mossGreen = new THREE.MeshStandardMaterial({ color: 0x566b3b, roughness: 0.95 });
const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
const rustMetal = new THREE.MeshStandardMaterial({ color: 0x2e2620, roughness: 0.7, metalness: 0.5 });
const brass = new THREE.MeshStandardMaterial({ color: 0x9a7a2a, roughness: 0.4, metalness: 0.7 });
const earth = new THREE.MeshStandardMaterial({ color: 0x3b2b1e, roughness: 1.0 });
const flowerLeaf = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.85, side: THREE.DoubleSide });

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
  const vert = mkMesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), stoneA);
  vert.position.y = 0.8;
  g.add(vert);
  const horiz = mkMesh(new THREE.BoxGeometry(0.8, 0.2, 0.16), stoneA);
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
  const roof = mkMesh(new THREE.ConeGeometry(2.0, 0.9, 4), stoneDark);
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
  const towerRoof = mkMesh(new THREE.ConeGeometry(0.85, 1.2, 4), stoneDark);
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
  // Rose window
  const rose = mkMesh(new THREE.TorusGeometry(0.35, 0.06, 6, 16), brass);
  rose.position.set(0, 2.6, 1.38);
  rose.rotation.x = Math.PI / 2;
  g.add(rose);
  const roseInner = mkMesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshStandardMaterial({ color: 0x4a8acc, roughness: 0.1, emissive: 0x1a3a5c, emissiveIntensity: 0.5 }));
  roseInner.position.set(0, 2.6, 1.38);
  g.add(roseInner);
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
  for (let i = 0; i < 3; i++) {
    const p = mkMesh(new THREE.SphereGeometry(0.08, 6, 5), flowerMat(color));
    p.position.set((i - 1) * 0.08, 0.14, Math.sin(i) * 0.03);
    g.add(p);
  }
  const stems = mkMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 5), new THREE.MeshStandardMaterial({ color: 0x2a3a1a, roughness: 0.9 }));
  stems.position.y = 0.08;
  g.add(stems);
  return g;
}

export function decorCandle(): THREE.Group {
  const g = new THREE.Group();
  const holder = mkMesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), brass);
  holder.position.y = 0.06;
  g.add(holder);
  const wax = mkMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xe8d8a8, roughness: 0.4 }));
  wax.position.y = 0.22;
  g.add(wax);
  const flame = mkMesh(new THREE.SphereGeometry(0.035, 5, 4), new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff8800, emissiveIntensity: 1.5 }));
  flame.position.y = 0.38;
  flame.scale.y = 1.6;
  g.add(flame);
  // Point light glow
  const pl = new THREE.PointLight(0xffa040, 0.4, 1.8, 2);
  pl.position.y = 0.38;
  g.add(pl);
  return g;
}

export function decorWreath(): THREE.Group {
  const g = new THREE.Group();
  const ring = mkMesh(new THREE.TorusGeometry(0.22, 0.06, 6, 20), mossGreen);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.18;
  g.add(ring);
  // Ribbon
  const ribbon = mkMesh(new THREE.BoxGeometry(0.05, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }));
  ribbon.position.set(0, 0.05, 0.22);
  g.add(ribbon);
  return g;
}

export function decorBible(): THREE.Group {
  const g = new THREE.Group();
  const book = mkMesh(new THREE.BoxGeometry(0.35, 0.08, 0.25), new THREE.MeshStandardMaterial({ color: 0x401a14, roughness: 0.6 }));
  book.position.y = 0.04;
  g.add(book);
  const crossV = mkMesh(new THREE.BoxGeometry(0.03, 0.14, 0.01), brass);
  crossV.position.set(0, 0.09, 0);
  g.add(crossV);
  const crossH = mkMesh(new THREE.BoxGeometry(0.09, 0.03, 0.01), brass);
  crossH.position.set(0, 0.1, 0);
  g.add(crossH);
  return g;
}

// ---------------- Entities ----------------

export function entityPlayer(): THREE.Group {
  const g = new THREE.Group();
  // Boots
  const bootsGeo = new THREE.BoxGeometry(0.18, 0.12, 0.2);
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.8 });
  const bL = mkMesh(bootsGeo, bootMat);
  bL.position.set(-0.1, 0.06, 0);
  g.add(bL);
  const bR = mkMesh(bootsGeo, bootMat);
  bR.position.set(0.1, 0.06, 0);
  g.add(bR);
  // Coat (dark, tall)
  const coatGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x1a1624, roughness: 0.7 });
  const coat = mkMesh(coatGeo, coatMat);
  coat.position.y = 0.55;
  g.add(coat);
  // Shirt collar
  const collar = mkMesh(new THREE.BoxGeometry(0.3, 0.1, 0.25), new THREE.MeshStandardMaterial({ color: 0xe8e1cf }));
  collar.position.y = 0.92;
  g.add(collar);
  // Head
  const head = mkMesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe8c9a8, roughness: 0.8 }));
  head.position.y = 1.12;
  g.add(head);
  // Top hat
  const hatBrim = mkMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.6 }));
  hatBrim.position.y = 1.27;
  g.add(hatBrim);
  const hatCrown = mkMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.6 }));
  hatCrown.position.y = 1.43;
  g.add(hatCrown);
  return g;
}

export function entityCat(): THREE.Group {
  const g = new THREE.Group();
  const catMat = new THREE.MeshStandardMaterial({ color: 0x141014, roughness: 0.9 });
  // Body
  const body = mkMesh(new THREE.BoxGeometry(0.5, 0.18, 0.22), catMat);
  body.position.y = 0.2;
  g.add(body);
  // Head
  const head = mkMesh(new THREE.SphereGeometry(0.13, 8, 7), catMat);
  head.position.set(0.22, 0.3, 0);
  g.add(head);
  // Ears
  const earGeo = new THREE.ConeGeometry(0.05, 0.09, 4);
  const earL = mkMesh(earGeo, catMat);
  earL.position.set(0.22, 0.43, -0.07);
  g.add(earL);
  const earR = mkMesh(earGeo, catMat);
  earR.position.set(0.22, 0.43, 0.07);
  g.add(earR);
  // Eyes (tiny green)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x88ff44, emissive: 0x44aa22, emissiveIntensity: 0.8 });
  const eyeGeo = new THREE.SphereGeometry(0.025, 6, 5);
  const eyeL = mkMesh(eyeGeo, eyeMat);
  eyeL.position.set(0.32, 0.33, -0.05);
  g.add(eyeL);
  const eyeR = mkMesh(eyeGeo, eyeMat);
  eyeR.position.set(0.32, 0.33, 0.05);
  g.add(eyeR);
  // Tail
  const tail = mkMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), catMat);
  tail.position.set(-0.25, 0.25, 0);
  tail.rotation.z = 0.6;
  g.add(tail);
  // Legs
  const legGeo = new THREE.BoxGeometry(0.07, 0.15, 0.07);
  for (const [x, z] of [[-0.15, -0.08], [0.15, -0.08], [-0.15, 0.08], [0.15, 0.08]]) {
    const leg = mkMesh(legGeo, catMat);
    leg.position.set(x, 0.075, z);
    g.add(leg);
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
