import * as THREE from 'three';
import { OSM_ROADS, PLAYABLE_BOUNDS, SURROUNDING_BUILDINGS } from '../data/osmLayout';
import { ProceduralPBR } from '../textures/ProceduralPBR';
import { BuildingSpec, ColliderBox } from '../types/game';

export interface NeighborhoodBuildResult {
  group: THREE.Group;
  colliders: ColliderBox[];
  lodObjects: { object: THREE.Object3D; maxDist: number }[];
}

function createStreetSignTexture(title: string, subtitle: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 112;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1d3c78';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, c.width / 2, 48);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#d8e6ff';
  ctx.fillText(subtitle, c.width / 2, 82);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildNeighborhood(pbr: ProceduralPBR): NeighborhoodBuildResult {
  const group = new THREE.Group();
  group.name = 'TokatNeighborhood';

  const colliders: ColliderBox[] = [];
  const lodObjects: { object: THREE.Object3D; maxDist: number }[] = [];

  const cobbleMat = pbr.makeMaterial(pbr.getCobblestone(10, 10), { roughness: 0.85 });
  const asphaltMat = pbr.makeMaterial(pbr.getAsphalt(8, 8), { roughness: 0.88 });
  const flagstoneMat = pbr.makeMaterial(pbr.getCourtyardFlagstone(8, 8), { roughness: 0.86 });
  const cutStoneMat = pbr.makeMaterial(pbr.getCutStone(2, 2), { roughness: 0.85 });
  const rubbleMat = pbr.makeMaterial(pbr.getRubbleStone(2, 2), { roughness: 0.92 });
  const kiremitMat = pbr.makeMaterial(pbr.getKiremitRoof(3, 3), { roughness: 0.78 });
  const glassDarkMat = new THREE.MeshStandardMaterial({ color: 0x1b242c, roughness: 0.25, metalness: 0.2 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.5, metalness: 0.75 });
  const barkMat = pbr.makeMaterial(pbr.getTimber('#4c3c2f', 1, 2), { roughness: 0.92 });
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x456b34, roughness: 0.88 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x567e3e, roughness: 0.86 });

  // =========================================================================
  // 1. BASE TERRAIN & STONE PLAZA / SIDEWALKS
  // =========================================================================
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x8d8374, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  group.add(ground);

  // Paved stone pedestrian plaza between Mosque Courtyard, House 1, House 2 & North Street
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(40, 0.08, 22), flagstoneMat);
  plaza.position.set(11.5, 0.02, -14.5);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Raised sidewalk curb around central Mosque/House1/House2 block
  const blockSidewalk = new THREE.Mesh(new THREE.BoxGeometry(41, 0.07, 34), flagstoneMat);
  blockSidewalk.position.set(12.2, 0.015, -8.5);
  blockSidewalk.receiveShadow = true;
  group.add(blockSidewalk);

  // =========================================================================
  // 2. REAL OSM ROAD POLYLINES
  // =========================================================================
  for (const road of OSM_ROADS) {
    const roadMat =
      road.surface === 'asphalt' ? asphaltMat : road.surface === 'cobble' ? cobbleMat : flagstoneMat;
    const curbMat = cutStoneMat;

    for (let i = 0; i < road.points.length - 1; i++) {
      const [x1, z1] = road.points[i];
      const [x2, z2] = road.points[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.2) continue;

      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const angle = Math.atan2(dx, dz);

      const segGroup = new THREE.Group();
      segGroup.position.set(midX, 0, midZ);
      segGroup.rotation.y = angle;

      // Road bed
      const bed = new THREE.Mesh(new THREE.BoxGeometry(road.width, 0.06, len + road.width * 0.4), roadMat);
      bed.position.y = 0.01;
      bed.receiveShadow = true;
      segGroup.add(bed);

      // Stone curbs along edges (except narrow footways)
      if (road.surface !== 'footway') {
        for (const side of [-1, 1]) {
          const curb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, len + 0.3), curbMat);
          curb.position.set(side * (road.width / 2 + 0.13), 0.04, 0);
          curb.receiveShadow = true;
          segGroup.add(curb);
        }
      }
      group.add(segGroup);
    }
  }

  // =========================================================================
  // 3. VARIED SURROUNDING TOKAT BUILDINGS (NEVER IDENTICAL BOXES!)
  // =========================================================================
  const buildSurroundingHouse = (spec: BuildingSpec) => {
    const bg = new THREE.Group();
    bg.name = spec.id;
    bg.position.set(spec.centerX, 0, spec.centerZ);
    bg.rotation.y = spec.rotationY;

    const wallMat = pbr.makeMaterial(pbr.getPlaster(spec.wallColor, 2, 2), { roughness: 0.88 });
    const trimMat = pbr.makeMaterial(pbr.getTimber(spec.trimColor, 1, 1), { roughness: 0.8 });
    const totalH = spec.floors * spec.floorHeight;

    // Ground level (stone base or plaster)
    if (spec.stoneBase) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(spec.width, spec.floorHeight, spec.depth), rubbleMat);
      base.position.y = spec.floorHeight / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      bg.add(base);

      if (spec.floors > 1) {
        const upperH = (spec.floors - 1) * spec.floorHeight;
        const upper = new THREE.Mesh(new THREE.BoxGeometry(spec.width - 0.08, upperH, spec.depth - 0.08), wallMat);
        upper.position.y = spec.floorHeight + upperH / 2;
        upper.castShadow = true;
        upper.receiveShadow = true;
        bg.add(upper);
      }
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(spec.width, totalH, spec.depth), wallMat);
      body.position.y = totalH / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      bg.add(body);
    }

    // Timber belt course & vertical corner pilasters
    const belt = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.14, 0.14, spec.depth + 0.14), trimMat);
    belt.position.y = spec.floorHeight;
    bg.add(belt);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, totalH, 0.16), trimMat);
        post.position.set(sx * (spec.width / 2 - 0.02), totalH / 2, sz * (spec.depth / 2 - 0.02));
        bg.add(post);
      }
    }

    // Optional projecting bay window (cumba)
    if (spec.hasCumba && spec.floors >= 2) {
      const cw = spec.width * 0.44;
      const ch = spec.floorHeight * 0.92;
      const proj = 0.75;
      const cz = spec.cumbaSide === 'south' ? spec.depth / 2 + proj / 2 : -spec.depth / 2 - proj / 2;
      const cx = spec.cumbaSide === 'east' ? spec.width / 2 + proj / 2 : spec.cumbaSide === 'west' ? -spec.width / 2 - proj / 2 : 0;
      const isZ = spec.cumbaSide === 'north' || spec.cumbaSide === 'south' || !spec.cumbaSide;
      const cumba = new THREE.Mesh(
        new THREE.BoxGeometry(isZ ? cw : proj, ch, isZ ? proj : cw),
        wallMat
      );
      cumba.position.set(isZ ? 0 : cx, spec.floorHeight + ch / 2, isZ ? cz : 0);
      cumba.castShadow = true;
      bg.add(cumba);
    }

    // Recessed window bays & timber frames on North & South facades
    const detailGroup = new THREE.Group();
    const cols = Math.max(2, Math.floor(spec.width / 3.1));
    for (let fl = 0; fl < spec.floors; fl++) {
      const wy = fl * spec.floorHeight + spec.floorHeight * 0.54;
      for (let c = 0; c < cols; c++) {
        const wx = -spec.width / 2 + ((c + 0.5) / cols) * spec.width;
        for (const zSide of [-1, 1]) {
          // Ground floor middle bay gets a wooden street door on the street-facing side
          if (fl === 0 && c === 0 && zSide === 1) {
            const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.05, 0.14), trimMat);
            door.position.set(wx, 1.025, (spec.depth / 2) * zSide + 0.03);
            detailGroup.add(door);
          } else {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.24, 0.12), trimMat);
            frame.position.set(wx, wy, (spec.depth / 2) * zSide + 0.02 * zSide);
            detailGroup.add(frame);
            const pane = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.06, 0.14), glassDarkMat);
            pane.position.set(wx, wy, (spec.depth / 2) * zSide + 0.03 * zSide);
            detailGroup.add(pane);
          }
        }
      }
    }
    bg.add(detailGroup);
    lodObjects.push({ object: detailGroup, maxDist: 58 });

    // Roofs (varied hipped vs gabled)
    const eaves = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.7, 0.14, spec.depth + 0.7), trimMat);
    eaves.position.y = totalH + 0.05;
    bg.add(eaves);

    if (spec.roofType === 'hipped') {
      const rRadius = Math.max(spec.width, spec.depth) * 0.76;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(rRadius, 2.1, 4), kiremitMat);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(spec.width / Math.max(spec.width, spec.depth), 1, spec.depth / Math.max(spec.width, spec.depth));
      roof.position.y = totalH + 1.1;
      roof.castShadow = true;
      bg.add(roof);
    } else {
      const slopeLen = Math.hypot(spec.depth / 2 + 0.45, 2.1);
      const ang = Math.atan2(2.1, spec.depth / 2 + 0.45);
      for (const dir of [-1, 1]) {
        const slope = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.75, 0.15, slopeLen), kiremitMat);
        slope.position.set(0, totalH + 1.05, dir * (spec.depth / 4 + 0.15));
        slope.rotation.x = dir * ang;
        slope.castShadow = true;
        bg.add(slope);
      }
    }

    group.add(bg);

    // Axis-aligned conservative bounding box collider for rotated footprint
    const cos = Math.abs(Math.cos(spec.rotationY));
    const sin = Math.abs(Math.sin(spec.rotationY));
    const halfW = (spec.width * cos + spec.depth * sin) / 2;
    const halfD = (spec.width * sin + spec.depth * cos) / 2;
    colliders.push({
      id: `col_${spec.id}`,
      minX: spec.centerX - halfW,
      maxX: spec.centerX + halfW,
      minY: 0,
      maxY: totalH + 2.5,
      minZ: spec.centerZ - halfD,
      maxZ: spec.centerZ + halfD,
      enabled: true,
      blocksCamera: true,
      materialTag: 'stone',
    });
  };

  for (const spec of SURROUNDING_BUILDINGS) {
    buildSurroundingHouse(spec);
  }

  // =========================================================================
  // 4. ANATOLIAN LINDEN/PLANE TREES (BRANCHED TRUNK + LAYERED FOLIAGE)
  // =========================================================================
  const treePositions: [number, number, number][] = [
    [-4.2, -19.2, 1.0],  // Inside mosque courtyard SW corner
    [20.2, -11.5, 0.92], // Yard edge between House 1 & House 2
    [-12.2, -25.0, 1.08], // NW corner across alley
    [33.5, -24.5, 1.0],  // East along north street
    [-12.5, 11.5, 1.1],  // South-west corner
    [13.5, 14.5, 0.95],  // South street sidewalk
  ];

  for (let idx = 0; idx < treePositions.length; idx++) {
    const [tx, tz, sc] = treePositions[idx];
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);
    tree.scale.setScalar(sc);

    // Main trunk + 3 primary limbs
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.27, 2.7, 8), barkMat);
    trunk.position.y = 1.35;
    trunk.castShadow = true;
    tree.add(trunk);

    const branchAngles = [0, 1.55, 3.1, 4.65];
    branchAngles.forEach((ba, bIdx) => {
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.12, 1.75, 7), barkMat);
      limb.position.set(Math.cos(ba) * 0.42, 2.7, Math.sin(ba) * 0.42);
      limb.rotation.z = -Math.cos(ba) * 0.52;
      limb.rotation.x = Math.sin(ba) * 0.52;
      limb.castShadow = true;
      tree.add(limb);

      // Multi-layered foliage sub-clusters (organic Anatolian plane/linden crown)
      for (const [dr, dy, r] of [
        [0.95, 3.45, 0.78],
        [1.35, 3.78, 0.62],
        [0.55, 4.15, 0.74],
      ] as [number, number, number][]) {
        const leafCluster = new THREE.Mesh(
          new THREE.IcosahedronGeometry(r, 1),
          (bIdx + Math.round(dr * 10)) % 2 === 0 ? leafMat1 : leafMat2
        );
        leafCluster.scale.set(1.12, 0.84, 1.05);
        leafCluster.rotation.set(ba * 0.5, bIdx * 0.8, 0.2);
        leafCluster.position.set(Math.cos(ba + dy * 0.3) * dr, dy, Math.sin(ba + dy * 0.3) * dr);
        leafCluster.castShadow = true;
        tree.add(leafCluster);
      }
    });

    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), leafMat2);
    crown.scale.set(1.15, 0.8, 1.15);
    crown.position.set(0, 4.45, 0);
    crown.castShadow = true;
    tree.add(crown);

    // Low stone tree planter ring
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.24, 10), cutStoneMat);
    ring.position.y = 0.12;
    tree.add(ring);

    group.add(tree);
    colliders.push({
      id: `col_tree_${idx}`,
      minX: tx - 0.55 * sc,
      maxX: tx + 0.55 * sc,
      minY: 0,
      maxY: 3.0,
      minZ: tz - 0.55 * sc,
      maxZ: tz + 0.55 * sc,
      enabled: true,
      blocksCamera: false,
    });
  }

  // =========================================================================
  // 5. INSTANCED STREET LAMPS, TRASH BINS, FLOWER POTS & TURKISH SIGNS
  // =========================================================================
  const lampPositions: [number, number][] = [
    [-7.5, -24.5],
    [9.2, -24.2],
    [28.0, -24.0],
    [-11.0, 4.0],
    [12.0, 6.2],
    [32.0, 9.2],
  ];
  const lampPostGeo = new THREE.CylinderGeometry(0.06, 0.1, 4.2, 8);
  const lampPosts = new THREE.InstancedMesh(lampPostGeo, ironMat, lampPositions.length);
  const lampHeadGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffd27d, emissiveIntensity: 0.45 });
  const lampHeads = new THREE.InstancedMesh(lampHeadGeo, lampHeadMat, lampPositions.length);
  const dummy = new THREE.Object3D();

  lampPositions.forEach(([lx, lz], i) => {
    dummy.position.set(lx, 2.1, lz);
    dummy.updateMatrix();
    lampPosts.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lx, 4.28, lz);
    dummy.updateMatrix();
    lampHeads.setMatrixAt(i, dummy.matrix);

    colliders.push({
      id: `col_lamp_${i}`,
      minX: lx - 0.22,
      maxX: lx + 0.22,
      minY: 0,
      maxY: 4.3,
      minZ: lz - 0.22,
      maxZ: lz + 0.22,
      enabled: true,
      blocksCamera: false,
    });
  });
  lampPosts.castShadow = true;
  group.add(lampPosts);
  group.add(lampHeads);

  // Instanced Trash Bins (Çöp Kutuları)
  const binPositions: [number, number][] = [
    [6.9, -23.5],
    [19.5, -10.5],
    [-11.8, -1.5],
    [16.0, 12.2],
  ];
  const binGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.85, 10);
  const binMat = new THREE.MeshStandardMaterial({ color: 0x3b4840, roughness: 0.55, metalness: 0.55 });
  const bins = new THREE.InstancedMesh(binGeo, binMat, binPositions.length);
  binPositions.forEach(([bx, bz], i) => {
    dummy.position.set(bx, 0.425, bz);
    dummy.updateMatrix();
    bins.setMatrixAt(i, dummy.matrix);
    colliders.push({
      id: `col_bin_${i}`,
      minX: bx - 0.28,
      maxX: bx + 0.28,
      minY: 0,
      maxY: 0.9,
      minZ: bz - 0.28,
      maxZ: bz + 0.28,
      enabled: true,
      blocksCamera: false,
    });
  });
  bins.castShadow = true;
  group.add(bins);

  // Instanced Terracotta Flower Pots near House 1 & House 2 stoops
  const potPositions: [number, number][] = [
    [11.3, -9.2],
    [13.9, -9.2],
    [22.4, -9.7],
    [28.0, -9.7],
  ];
  const potGeo = new THREE.CylinderGeometry(0.26, 0.18, 0.42, 10);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x9c4b30, roughness: 0.85 });
  const pots = new THREE.InstancedMesh(potGeo, potMat, potPositions.length);
  const shrubGeo = new THREE.DodecahedronGeometry(0.28, 0);
  const shrubs = new THREE.InstancedMesh(shrubGeo, leafMat2, potPositions.length);
  potPositions.forEach(([px, pz], i) => {
    dummy.position.set(px, 0.21, pz);
    dummy.updateMatrix();
    pots.setMatrixAt(i, dummy.matrix);
    dummy.position.set(px, 0.52, pz);
    dummy.updateMatrix();
    shrubs.setMatrixAt(i, dummy.matrix);
  });
  group.add(pots);
  group.add(shrubs);

  // Authentic Turkish Street Signs
  const addStreetSign = (x: number, z: number, rotY: number, title: string, sub: string) => {
    const sg = new THREE.Group();
    sg.position.set(x, 0, z);
    sg.rotation.y = rotY;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.7, 8), ironMat);
    pole.position.y = 1.35;
    sg.add(pole);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.42, 0.04),
      new THREE.MeshStandardMaterial({ map: createStreetSignTexture(title, sub), roughness: 0.45 })
    );
    board.position.y = 2.55;
    sg.add(board);
    group.add(sg);
  };
  addStreetSign(-7.8, -26.0, 0.12, 'ANKARA SK.', '2. Geçit • Tokat');
  addStreetSign(8.2, 8.8, -0.15, 'ALACA MESCİT', 'Rüstem Çelebi Mah.');
  addStreetSign(-2.5, 42.0, 0.35, 'SULUSOKAK CD.', 'Tarihî Kent Aksı');

  // =========================================================================
  // 6. PLAYABLE PERIMETER LOW STONE BOUNDARY WALLS
  // =========================================================================
  const b = PLAYABLE_BOUNDS;
  const boundH = 1.35;
  const boundWalls: [string, number, number, number, number][] = [
    ['bound_north', (b.minX + b.maxX) / 2, b.minZ, b.maxX - b.minX, 0.6],
    ['bound_south', (b.minX + b.maxX) / 2, b.maxZ, b.maxX - b.minX, 0.6],
    ['bound_west', b.minX, (b.minZ + b.maxZ) / 2, 0.6, b.maxZ - b.minZ],
    ['bound_east', b.maxX, (b.minZ + b.maxZ) / 2, 0.6, b.maxZ - b.minZ],
  ];
  for (const [id, x, z, w, d] of boundWalls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, boundH, d), rubbleMat);
    wall.position.set(x, boundH / 2, z);
    wall.receiveShadow = true;
    group.add(wall);
    colliders.push({
      id,
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: 0,
      maxY: 4.0,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      enabled: true,
      blocksCamera: false,
    });
  }

  return { group, colliders, lodObjects };
}
