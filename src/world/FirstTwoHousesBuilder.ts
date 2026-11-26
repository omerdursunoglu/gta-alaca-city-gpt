import * as THREE from 'three';
import { ProceduralPBR } from '../textures/ProceduralPBR';
import { ColliderBox, InteractableItem, StairRamp } from '../types/game';
import {
  buildCozyBed,
  buildGamingSetup,
  buildHouse1PhoneWatcherNPC,
  buildHouse2HandsomePCNPC,
  House1MovieNPC,
} from './InteriorDetailsBuilder';

export interface HousesBuildResult {
  group: THREE.Group;
  colliders: ColliderBox[];
  stairRamps: StairRamp[];
  interactables: InteractableItem[];
  interiorLights: THREE.PointLight[];
  house1Origin: THREE.Vector3;
  house1MovieNpc: House1MovieNPC;
  openHouse1Door: () => boolean;
  update: (dt: number) => void;
}

/**
 * Builds the first two custom houses immediately to the LEFT (East, +X)
 * when looking from outside at Alaca Mescit Camii's North main entrance facade:
 *   - House 1 (Ev 1): Enterable 2-story traditional Tokat house with real wall thickness,
 *     hinged front door, walkable staircase, furniture, rugs, lighting, and cumba bay window.
 *   - House 2 (Ev 2): Distinct custom 2.5-story Tokat residence with completely different
 *     silhouette, roof, twin asymmetric cumbas, and façade rhythm.
 */
export function buildFirstTwoHouses(
  pbr: ProceduralPBR,
  onDoorToggle: (isOpen: boolean) => void,
  onLampToggle: (isOn: boolean) => void
): HousesBuildResult {
  const group = new THREE.Group();
  group.name = 'FirstTwoHouses';

  const colliders: ColliderBox[] = [];
  const stairRamps: StairRamp[] = [];
  const interactables: InteractableItem[] = [];
  const interiorLights: THREE.PointLight[] = [];

  // Shared high-craft PBR materials
  const cutStoneMat = pbr.makeMaterial(pbr.getCutStone(2, 2), { roughness: 0.86 });
  const rubbleStoneMat = pbr.makeMaterial(pbr.getRubbleStone(2, 2), { roughness: 0.92 });
  const timberDarkMat = pbr.makeMaterial(pbr.getTimber('#4a2f1d', 1, 1), { roughness: 0.8 });
  const timberWarmMat = pbr.makeMaterial(pbr.getTimber('#7a4e2d', 1, 1), { roughness: 0.72 });
  const floorWoodMat = pbr.makeMaterial(pbr.getTimber('#8c5d37', 3, 3), { roughness: 0.65 });
  const kiremitMat = pbr.makeMaterial(pbr.getKiremitRoof(3, 3), { roughness: 0.78 });
  const h1PlasterMat = pbr.makeMaterial(pbr.getPlaster('#efe3ce', 2, 2), { roughness: 0.88 });
  const h1InnerPlasterMat = pbr.makeMaterial(pbr.getPlaster('#f3ead9', 2, 2), { roughness: 0.9 });
  const h2PlasterMat = pbr.makeMaterial(pbr.getPlaster('#d99b78', 2, 2), { roughness: 0.88 });
  const h2TrimGreenMat = pbr.makeMaterial(pbr.getTimber('#354c3c', 1, 1), { roughness: 0.75 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.45, metalness: 0.75 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc59b38, roughness: 0.35, metalness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x89a9ba,
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.42,
  });
  const kilimMat = new THREE.MeshStandardMaterial({ map: pbr.getKilimRug(), roughness: 0.92 });
  const fabricRedMat = new THREE.MeshStandardMaterial({ color: 0x8b2e26, roughness: 0.88 });
  const fabricCreamMat = new THREE.MeshStandardMaterial({ color: 0xe6dac3, roughness: 0.86 });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x35647c, roughness: 0.32, metalness: 0.1 });

  const addBox = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    castShadow = true,
    receiveShadow = true
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = castShadow;
    m.receiveShadow = receiveShadow;
    parent.add(m);
    return m;
  };

  /** Add wall box AND matching solid collider in world space */
  const addWallWithCollider = (
    parent: THREE.Object3D,
    id: string,
    w: number,
    h: number,
    d: number,
    lx: number,
    ly: number,
    lz: number,
    worldOffsetX: number,
    worldOffsetZ: number,
    mat: THREE.Material,
    blocksCamera = true
  ) => {
    addBox(parent, w, h, d, lx, ly, lz, mat, true, true);
    colliders.push({
      id,
      minX: worldOffsetX + lx - w / 2,
      maxX: worldOffsetX + lx + w / 2,
      minY: ly - h / 2,
      maxY: ly + h / 2,
      minZ: worldOffsetZ + lz - d / 2,
      maxZ: worldOffsetZ + lz + d / 2,
      enabled: true,
      blocksCamera,
      materialTag: 'wood',
    });
  };

  /** Detailed framed window with sill, mullions, glass pane, and optional shutters */
  const addFramedWindow = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    rotY: number,
    w: number,
    h: number,
    trimMat: THREE.Material,
    withShutters: boolean,
    withBars: boolean
  ) => {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;

    // Outer casing
    const t = 0.07;
    addBox(wg, w + t * 2, t, 0.18, 0, h / 2 + t / 2, 0, trimMat);
    addBox(wg, w + t * 2 + 0.08, 0.09, 0.24, 0, -h / 2 - 0.04, 0.03, cutStoneMat);
    addBox(wg, t, h, 0.16, -w / 2 - t / 2, 0, 0, trimMat);
    addBox(wg, t, h, 0.16, w / 2 + t / 2, 0, 0, trimMat);
    // Mullions
    addBox(wg, 0.035, h, 0.06, 0, 0, 0, trimMat);
    addBox(wg, w, 0.035, 0.06, 0, 0.12, 0, trimMat);
    // Glass pane
    addBox(wg, w - 0.04, h - 0.04, 0.02, 0, 0, -0.01, glassMat, false, false);

    if (withShutters) {
      for (const side of [-1, 1]) {
        const sx = side * (w / 2 + t + w * 0.24);
        addBox(wg, w * 0.44, h - 0.02, 0.045, sx, 0, 0.06, trimMat);
      }
    }
    if (withBars) {
      for (const bx of [-w * 0.28, 0, w * 0.28]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h - 0.04, 6), ironMat);
        bar.position.set(bx, 0, 0.08);
        wg.add(bar);
      }
    }
    parent.add(wg);
  };

  // =========================================================================
  // HOUSE 1 (EV 1): ENTERABLE 2-STORY TOKAT HOUSE
  // Center: (14.0, 0, -4.0), Width = 9.2m (x: 9.4..18.6), Depth = 10.0m (z: -9.0..+1.0)
  // Front door faces North (-Z) at local (x: -1.4, z: -5.0) => world (12.6, 0, -9.0)
  // =========================================================================
  const h1X = 14.0;
  const h1Z = -4.0;
  const h1W = 9.2;
  const h1D = 10.0;
  const h1 = new THREE.Group();
  h1.name = 'House1_Enterable';
  h1.position.set(h1X, 0, h1Z);

  const wallT = 0.26;
  const gfFloorY = 0.18;
  const gfH = 3.12;
  const sfFloorY = gfFloorY + gfH; // 3.30m
  const sfH = 2.95;
  const roofBaseY = sfFloorY + sfH; // 6.25m

  // Ground floor stone slab & interior wood floor
  addBox(h1, h1W + 0.3, gfFloorY, h1D + 0.3, 0, gfFloorY / 2, 0, cutStoneMat, false, true);
  addBox(h1, h1W - 0.3, 0.04, h1D - 0.3, 0, gfFloorY + 0.01, 0, floorWoodMat, false, true);
  colliders.push({
    id: 'h1_ground_floor',
    minX: h1X - h1W / 2 - 0.15,
    maxX: h1X + h1W / 2 + 0.15,
    minY: 0,
    maxY: gfFloorY + 0.03,
    minZ: h1Z - h1D / 2 - 0.15,
    maxZ: h1Z + h1D / 2 + 0.15,
    enabled: true,
    blocksCamera: false,
    materialTag: 'wood',
  });

  // Stone entry stoop outside front door (local x = -1.4, z = -5.45)
  addBox(h1, 2.1, 0.18, 0.85, -1.4, 0.09, -h1D / 2 - 0.42, cutStoneMat, false, true);

  // --- GROUND FLOOR WALLS (REAL OPENINGS!) ---
  const gfMidY = gfFloorY + gfH / 2;
  // South wall (solid, z = +h1D/2 - wallT/2)
  addWallWithCollider(h1, 'h1_gf_south', h1W, gfH, wallT, 0, gfMidY, h1D / 2 - wallT / 2, h1X, h1Z, rubbleStoneMat);
  // West wall (facing mosque, split around 2 windows at z = -1.8 and z = +1.8)
  addWallWithCollider(h1, 'h1_gf_west_1', wallT, gfH, 2.6, -h1W / 2 + wallT / 2, gfMidY, -3.7, h1X, h1Z, rubbleStoneMat);
  addWallWithCollider(h1, 'h1_gf_west_2', wallT, gfH, 2.3, -h1W / 2 + wallT / 2, gfMidY, 0.0, h1X, h1Z, rubbleStoneMat);
  addWallWithCollider(h1, 'h1_gf_west_3', wallT, gfH, 2.5, -h1W / 2 + wallT / 2, gfMidY, 3.75, h1X, h1Z, rubbleStoneMat);
  // Window spandrels + headers on West GF wall
  addBox(h1, wallT, 0.95, 1.3, -h1W / 2 + wallT / 2, gfFloorY + 0.475, -1.8, rubbleStoneMat);
  addBox(h1, wallT, 0.85, 1.3, -h1W / 2 + wallT / 2, gfFloorY + gfH - 0.425, -1.8, rubbleStoneMat);
  addFramedWindow(h1, -h1W / 2 + 0.12, gfFloorY + 1.62, -1.8, -Math.PI / 2, 1.26, 1.32, timberDarkMat, false, true);
  addBox(h1, wallT, 0.95, 1.3, -h1W / 2 + wallT / 2, gfFloorY + 0.475, 1.85, rubbleStoneMat);
  addBox(h1, wallT, 0.85, 1.3, -h1W / 2 + wallT / 2, gfFloorY + gfH - 0.425, 1.85, rubbleStoneMat);
  addFramedWindow(h1, -h1W / 2 + 0.12, gfFloorY + 1.62, 1.85, -Math.PI / 2, 1.26, 1.32, timberDarkMat, false, true);

  // East wall (solid rubble stone, staircase runs inside along it)
  addWallWithCollider(h1, 'h1_gf_east', wallT, gfH, h1D, h1W / 2 - wallT / 2, gfMidY, 0, h1X, h1Z, rubbleStoneMat);

  // North front facade GF (door opening centered at lx = -1.4, width = 1.45m, height = 2.35m)
  const doorLX = -1.4;
  const doorW = 1.45;
  const doorH = 2.32;
  const frontZ = -h1D / 2 + wallT / 2;
  // Left pier (x: -4.6 to -2.125 -> w = 2.475, center = -3.3625)
  addWallWithCollider(h1, 'h1_gf_north_l', 2.475, gfH, wallT, -3.3625, gfMidY, frontZ, h1X, h1Z, rubbleStoneMat);
  // Right wall segment (x: -0.675 to +4.6), with real transparent window opening at lx = +1.7
  addWallWithCollider(h1, 'h1_gf_north_r1', 1.72, gfH, wallT, 0.185, gfMidY, frontZ, h1X, h1Z, rubbleStoneMat);
  addBox(h1, 1.32, 0.95, wallT, 1.7, gfFloorY + 0.475, frontZ, rubbleStoneMat);
  addBox(h1, 1.32, 0.85, wallT, 1.7, gfFloorY + gfH - 0.425, frontZ, rubbleStoneMat);
  colliders.push({
    id: 'h1_gf_north_r1_col',
    minX: h1X + 1.7 - 0.66,
    maxX: h1X + 1.7 + 0.66,
    minY: gfFloorY,
    maxY: gfFloorY + gfH,
    minZ: h1Z + frontZ - wallT / 2,
    maxZ: h1Z + frontZ + wallT / 2,
    enabled: true,
    blocksCamera: true,
    materialTag: 'stone',
  });
  addFramedWindow(h1, 1.7, gfFloorY + 1.62, frontZ - 0.04, Math.PI, 1.28, 1.32, timberDarkMat, true, true);
  addWallWithCollider(h1, 'h1_gf_north_r2', 2.24, gfH, wallT, 3.48, gfMidY, frontZ, h1X, h1Z, rubbleStoneMat);

  // Header lintel above front door
  addBox(h1, doorW + 0.08, gfH - doorH, wallT, doorLX, gfFloorY + doorH + (gfH - doorH) / 2, frontZ, rubbleStoneMat);
  colliders.push({
    id: 'h1_gf_door_lintel',
    minX: h1X + doorLX - doorW / 2,
    maxX: h1X + doorLX + doorW / 2,
    minY: gfFloorY + doorH,
    maxY: gfFloorY + gfH,
    minZ: h1Z + frontZ - wallT / 2,
    maxZ: h1Z + frontZ + wallT / 2,
    enabled: true,
    blocksCamera: true,
  });

  // Door frame & hinged wooden door (opens smoothly with E key!)
  addBox(h1, 0.11, doorH, wallT + 0.06, doorLX - doorW / 2 + 0.05, gfFloorY + doorH / 2, frontZ, timberDarkMat);
  addBox(h1, 0.11, doorH, wallT + 0.06, doorLX + doorW / 2 - 0.05, gfFloorY + doorH / 2, frontZ, timberDarkMat);
  addBox(h1, doorW + 0.06, 0.12, wallT + 0.08, doorLX, gfFloorY + doorH - 0.04, frontZ, timberDarkMat);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(doorLX - doorW / 2 + 0.1, gfFloorY, frontZ);
  const doorLeafW = doorW - 0.2;
  addBox(doorPivot, doorLeafW, doorH - 0.08, 0.07, doorLeafW / 2, (doorH - 0.08) / 2, 0, timberWarmMat);
  addBox(doorPivot, doorLeafW * 0.72, 0.85, 0.09, doorLeafW / 2, 1.58, 0, timberDarkMat);
  addBox(doorPivot, doorLeafW * 0.72, 0.72, 0.09, doorLeafW / 2, 0.58, 0, timberDarkMat);
  const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), brassMat);
  doorKnob.position.set(doorLeafW - 0.14, 1.05, -0.07);
  doorPivot.add(doorKnob);
  h1.add(doorPivot);

  // Door leaf collider (toggles off when door is open!)
  const doorCollider: ColliderBox = {
    id: 'h1_front_door_leaf',
    minX: h1X + doorLX - doorW / 2,
    maxX: h1X + doorLX + doorW / 2,
    minY: gfFloorY,
    maxY: gfFloorY + doorH,
    minZ: h1Z + frontZ - 0.15,
    maxZ: h1Z + frontZ + 0.15,
    enabled: false, // Start slightly open or toggleable? Let's start CLOSED or OPEN? Wait: prompt says "Kapıdan içeri geçiş fiziksel olarak çalışmalı" + "Oyuncu kapıların yanında E tuşuyla etkileşebilsin". Starting closed with a clear [E] prompt AND opening wide on E works great! Let's start closed (`isDoorOpen = false`) so E interaction is immediately rewarding!
    blocksCamera: false,
    materialTag: 'wood',
  };
  doorCollider.enabled = true;
  colliders.push(doorCollider);

  let isDoorOpen = false;
  let doorAngle = 0;

  // --- GROUND FLOOR INTERIOR PARTITION & FURNITURE (NON-BOX CRAFTED PROPS!) ---
  // Timber ceiling beams visible from ground floor
  for (let bz = -4.2; bz <= 4.2; bz += 1.4) {
    addBox(h1, h1W - 0.4, 0.18, 0.16, 0, sfFloorY - 0.12, bz, timberDarkMat);
  }

  // Woven Turkish Kilim Rug in center-west of ground floor
  const gfRug = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.02, 4.2), kilimMat);
  gfRug.position.set(-1.3, gfFloorY + 0.025, 1.2);
  gfRug.receiveShadow = true;
  h1.add(gfRug);

  // Crafted Dining Table (x = -1.4, z = 1.4)
  const tableG = new THREE.Group();
  tableG.position.set(-1.4, gfFloorY + 0.02, 1.4);
  // Beveled tabletop
  addBox(tableG, 1.65, 0.07, 1.05, 0, 0.76, 0, timberWarmMat);
  addBox(tableG, 1.52, 0.09, 0.92, 0, 0.7, 0, timberDarkMat);
  // 4 turned legs
  for (const [lx, lz] of [[-0.68, -0.38], [0.68, -0.38], [-0.68, 0.38], [0.68, 0.38]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.028, 0.72, 8), timberDarkMat);
    leg.position.set(lx, 0.36, lz);
    leg.castShadow = true;
    tableG.add(leg);
  }
  // Ceramic pitcher & bowl on table
  const pitcher = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.05, 0),
    new THREE.Vector2(0.09, 0.08),
    new THREE.Vector2(0.05, 0.18),
    new THREE.Vector2(0.065, 0.24),
  ], 12), ceramicMat);
  pitcher.position.set(0.18, 0.79, -0.1);
  tableG.add(pitcher);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.07, 0.08, 12), brassMat);
  bowl.position.set(-0.22, 0.83, 0.12);
  tableG.add(bowl);
  h1.add(tableG);
  colliders.push({
    id: 'h1_gf_table',
    minX: h1X - 1.4 - 0.85,
    maxX: h1X - 1.4 + 0.85,
    minY: gfFloorY,
    maxY: gfFloorY + 0.9,
    minZ: h1Z + 1.4 - 0.55,
    maxZ: h1Z + 1.4 + 0.55,
    enabled: true,
    blocksCamera: false,
  });

  // 4 detailed dining chairs (legs, cushioned seat, slatted backrest)
  const addChair = (cx: number, cz: number, rotY: number) => {
    const cg = new THREE.Group();
    cg.position.set(cx, gfFloorY + 0.02, cz);
    cg.rotation.y = rotY;
    addBox(cg, 0.44, 0.05, 0.44, 0, 0.44, 0, timberWarmMat);
    addBox(cg, 0.38, 0.04, 0.38, 0, 0.48, 0, fabricRedMat);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      addBox(cg, 0.045, 0.44, 0.045, lx, 0.22, lz, timberDarkMat);
    }
    addBox(cg, 0.045, 0.52, 0.045, -0.18, 0.72, -0.18, timberDarkMat);
    addBox(cg, 0.045, 0.52, 0.045, 0.18, 0.72, -0.18, timberDarkMat);
    addBox(cg, 0.42, 0.08, 0.04, 0, 0.94, -0.18, timberWarmMat);
    addBox(cg, 0.04, 0.36, 0.03, -0.07, 0.7, -0.18, timberWarmMat);
    addBox(cg, 0.04, 0.36, 0.03, 0.07, 0.7, -0.18, timberWarmMat);
    h1.add(cg);
  };
  addChair(-1.4, 0.65, 0);
  addChair(-1.4, 2.15, Math.PI);
  addChair(-2.35, 1.4, Math.PI / 2);
  addChair(-0.45, 1.4, -Math.PI / 2);

  // Sideboard Cabinet (Konsol/Dolap) along South GF wall (lx = -1.4, lz = +4.35)
  const konsol = new THREE.Group();
  konsol.position.set(-1.4, gfFloorY + 0.02, 4.35);
  addBox(konsol, 2.1, 0.92, 0.56, 0, 0.52, 0, timberDarkMat);
  addBox(konsol, 2.2, 0.06, 0.62, 0, 1.0, 0, timberWarmMat);
  for (const dx of [-0.66, 0, 0.66]) {
    addBox(konsol, 0.58, 0.68, 0.04, dx, 0.52, -0.28, timberWarmMat);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), brassMat);
    knob.position.set(dx + 0.18, 0.56, -0.31);
    konsol.add(knob);
  }
  // Table lamp on sideboard
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.18, 10), brassMat);
  lampBase.position.set(0.65, 1.12, 0);
  konsol.add(lampBase);
  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, 0.24, 12),
    new THREE.MeshStandardMaterial({ color: 0xf6e6c2, emissive: 0xffb347, emissiveIntensity: 0.7, roughness: 0.6 })
  );
  lampShade.position.set(0.65, 1.32, 0);
  konsol.add(lampShade);
  h1.add(konsol);
  colliders.push({
    id: 'h1_gf_konsol',
    minX: h1X - 1.4 - 1.1,
    maxX: h1X - 1.4 + 1.1,
    minY: gfFloorY,
    maxY: gfFloorY + 1.1,
    minZ: h1Z + 4.35 - 0.35,
    maxZ: h1Z + 4.35 + 0.35,
    enabled: true,
    blocksCamera: false,
  });

  // --- WALKABLE WOODEN STAIRCASE (ALONG EAST WALL: x in [2.6, 4.2], z from -2.2 to +2.8) ---
  // Rises from gfFloorY (0.18m) at z = -2.2 up to sfFloorY (3.30m) at z = +2.8
  const stairX = 3.4;
  const stairW = 1.55;
  const stairStartZ = -2.2;
  const stairEndZ = 2.8;
  const stepsCount = 14;
  const stepRun = (stairEndZ - stairStartZ) / stepsCount;
  const stepRise = (sfFloorY - gfFloorY) / stepsCount;

  // Stringers (side beams)
  const stairLen = Math.hypot(stairEndZ - stairStartZ, sfFloorY - gfFloorY);
  const stairPitch = Math.atan2(sfFloorY - gfFloorY, stairEndZ - stairStartZ);
  for (const sx of [stairX - stairW / 2 + 0.05, stairX + stairW / 2 - 0.05]) {
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, stairLen), timberDarkMat);
    str.position.set(sx, (gfFloorY + sfFloorY) / 2 - 0.08, (stairStartZ + stairEndZ) / 2);
    str.rotation.x = -stairPitch;
    str.castShadow = true;
    h1.add(str);
  }
  for (let i = 0; i < stepsCount; i++) {
    const sy = gfFloorY + (i + 0.5) * stepRise;
    const sz = stairStartZ + (i + 0.5) * stepRun;
    addBox(h1, stairW - 0.1, 0.07, stepRun + 0.04, stairX, sy, sz, timberWarmMat);
    addBox(h1, stairW - 0.12, stepRise, 0.04, stairX, sy - stepRise / 2, sz - stepRun / 2, timberDarkMat);
  }
  // Staircase inner handrail + balusters
  const railX = stairX - stairW / 2 + 0.06;
  const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, stairLen, 8), timberDarkMat);
  handrail.rotation.x = Math.PI / 2 - stairPitch;
  handrail.position.set(railX, (gfFloorY + sfFloorY) / 2 + 0.88, (stairStartZ + stairEndZ) / 2);
  h1.add(handrail);
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    const by = gfFloorY + t * (sfFloorY - gfFloorY) + 0.44;
    const bz = stairStartZ + t * (stairEndZ - stairStartZ);
    addBox(h1, 0.05, 0.9, 0.05, railX, by, bz, timberDarkMat);
  }
  // Stair ramp collider (smoothly walkable up & down!)
  stairRamps.push({
    id: 'h1_stair_ramp',
    minX: h1X + stairX - stairW / 2 - 0.1,
    maxX: h1X + stairX + stairW / 2 + 0.1,
    minZ: h1Z + stairStartZ - 0.35,
    maxZ: h1Z + stairEndZ + 0.35,
    axis: 'z',
    startCoord: h1Z + stairStartZ,
    endCoord: h1Z + stairEndZ,
    startY: gfFloorY,
    endY: sfFloorY + 0.06,
  });
  // Solid wall under the upper half of stairs so player doesn't walk under and get stuck
  colliders.push({
    id: 'h1_understair_block',
    minX: h1X + stairX - stairW / 2,
    maxX: h1X + stairX + stairW / 2,
    minY: gfFloorY,
    maxY: gfFloorY + 1.8,
    minZ: h1Z + 0.5,
    maxZ: h1Z + 4.7,
    enabled: true,
    blocksCamera: false,
  });

  // --- SECOND FLOOR SLAB (WITH REAL STAIRWELL OPENING!) ---
  // Stairwell opening: x in [2.5, 4.35], z in [-2.3, +2.9]
  // Slab Left (x: -4.55 to +2.5 -> w = 7.05, center = -1.025)
  addBox(h1, 7.05, 0.16, h1D - 0.1, -1.025, sfFloorY - 0.06, 0, floorWoodMat, true, true);
  colliders.push({
    id: 'h1_sf_slab_left',
    minX: h1X - 4.6,
    maxX: h1X + 2.55,
    minY: sfFloorY - 0.25,
    maxY: sfFloorY + 0.04,
    minZ: h1Z - h1D / 2,
    maxZ: h1Z + h1D / 2,
    enabled: true,
    blocksCamera: false,
    materialTag: 'wood',
  });
  // Slab North of stairwell (x: +2.5 to +4.4 -> w = 1.9, z: -4.9 to -2.3 -> d = 2.6, center z = -3.6)
  addBox(h1, 1.9, 0.16, 2.6, 3.45, sfFloorY - 0.06, -3.6, floorWoodMat, true, true);
  colliders.push({
    id: 'h1_sf_slab_north_stair',
    minX: h1X + 2.5,
    maxX: h1X + 4.5,
    minY: sfFloorY - 0.25,
    maxY: sfFloorY + 0.04,
    minZ: h1Z - 5.0,
    maxZ: h1Z - 2.2,
    enabled: true,
    blocksCamera: false,
    materialTag: 'wood',
  });
  // Slab South landing of stairwell (x: +2.5 to +4.4 -> w = 1.9, z: +2.8 to +4.9 -> d = 2.1, center z = +3.85)
  addBox(h1, 1.9, 0.16, 2.1, 3.45, sfFloorY - 0.06, 3.85, floorWoodMat, true, true);
  colliders.push({
    id: 'h1_sf_slab_south_stair',
    minX: h1X + 2.5,
    maxX: h1X + 4.5,
    minY: sfFloorY - 0.25,
    maxY: sfFloorY + 0.04,
    minZ: h1Z + 2.75,
    maxZ: h1Z + 5.0,
    enabled: true,
    blocksCamera: false,
    materialTag: 'wood',
  });

  // Protective wooden balustrade around stairwell on 2nd floor
  addWallWithCollider(h1, 'h1_sf_rail_west', 0.1, 0.95, 5.1, 2.52, sfFloorY + 0.48, 0.25, h1X, h1Z, timberDarkMat, false);
  addWallWithCollider(h1, 'h1_sf_rail_north', 1.85, 0.95, 0.1, 3.45, sfFloorY + 0.48, -2.3, h1X, h1Z, timberDarkMat, false);

  // --- SECOND FLOOR WALLS, TIMBER FRAMING & CANTILEVERED CUMBA (BAY WINDOW) ---
  const sfMidY = sfFloorY + sfH / 2;
  // South, West, East upper plaster walls
  addWallWithCollider(h1, 'h1_sf_south', h1W, sfH, wallT, 0, sfMidY, h1D / 2 - wallT / 2, h1X, h1Z, h1PlasterMat);
  addWallWithCollider(h1, 'h1_sf_west', wallT, sfH, h1D, -h1W / 2 + wallT / 2, sfMidY, 0, h1X, h1Z, h1PlasterMat);
  addWallWithCollider(h1, 'h1_sf_east', wallT, sfH, h1D, h1W / 2 - wallT / 2, sfMidY, 0, h1X, h1Z, h1PlasterMat);

  // North 2nd floor facade with cantilevered CUMBA projecting 0.95m North (x in [-2.6, +2.6])
  const cumbaW = 5.2;
  const cumbaProj = 0.95;
  // Flanking North wall segments left & right of cumba
  addWallWithCollider(h1, 'h1_sf_north_l', 2.0, sfH, wallT, -3.6, sfMidY, frontZ, h1X, h1Z, h1PlasterMat);
  addWallWithCollider(h1, 'h1_sf_north_r', 2.0, sfH, wallT, 3.6, sfMidY, frontZ, h1X, h1Z, h1PlasterMat);
  // Cumba floor, side walls & front wall
  addBox(h1, cumbaW, 0.16, cumbaProj + 0.2, 0, sfFloorY - 0.06, -h1D / 2 - cumbaProj / 2 + 0.1, timberDarkMat);
  colliders.push({
    id: 'h1_cumba_floor',
    minX: h1X - cumbaW / 2,
    maxX: h1X + cumbaW / 2,
    minY: sfFloorY - 0.25,
    maxY: sfFloorY + 0.04,
    minZ: h1Z - h1D / 2 - cumbaProj,
    maxZ: h1Z - h1D / 2,
    enabled: true,
    blocksCamera: false,
  });
  // Cumba front wall with real transparent window openings at x = -1.55, 0, +1.55
  const cumbaFrontZ = -h1D / 2 - cumbaProj + 0.1;
  // Lower spandrel + upper lintel across cumba front
  addBox(h1, cumbaW, 0.78, 0.2, 0, sfFloorY + 0.39, cumbaFrontZ, h1PlasterMat);
  addBox(h1, cumbaW, 0.72, 0.2, 0, sfFloorY + sfH - 0.36, cumbaFrontZ, h1PlasterMat);
  // Vertical piers between cumba windows
  for (const [px, pw] of [[-2.34, 0.52], [-0.775, 0.52], [0.775, 0.52], [2.34, 0.52]] as [number, number][]) {
    addBox(h1, pw, 1.48, 0.2, px, sfFloorY + 1.5, cumbaFrontZ, h1PlasterMat);
  }
  colliders.push({
    id: 'h1_cumba_front',
    minX: h1X - cumbaW / 2,
    maxX: h1X + cumbaW / 2,
    minY: sfFloorY,
    maxY: sfFloorY + sfH,
    minZ: h1Z + cumbaFrontZ - 0.1,
    maxZ: h1Z + cumbaFrontZ + 0.1,
    enabled: true,
    blocksCamera: true,
  });
  addWallWithCollider(h1, 'h1_cumba_left', 0.2, sfH, cumbaProj, -cumbaW / 2 + 0.1, sfMidY, -h1D / 2 - cumbaProj / 2, h1X, h1Z, h1PlasterMat);
  addWallWithCollider(h1, 'h1_cumba_right', 0.2, sfH, cumbaProj, cumbaW / 2 - 0.1, sfMidY, -h1D / 2 - cumbaProj / 2, h1X, h1Z, h1PlasterMat);

  // Curved timber brackets (eli böğründe) supporting the cumba
  for (const bx of [-2.2, -0.75, 0.75, 2.2]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.18), timberDarkMat);
    brace.position.set(bx, sfFloorY - 0.48, -h1D / 2 - cumbaProj * 0.45);
    brace.rotation.x = 0.68;
    brace.castShadow = true;
    h1.add(brace);
  }

  // Timber frame vertical corner posts & horizontal fascia bands (bağdadi trim)
  for (const tx of [-4.52, -2.58, 2.58, 4.52]) {
    addBox(h1, 0.16, sfH, 0.16, tx, sfMidY, -h1D / 2 + 0.02, timberDarkMat);
    addBox(h1, 0.16, sfH, 0.16, tx, sfMidY, h1D / 2 - 0.02, timberDarkMat);
  }
  addBox(h1, h1W + 0.12, 0.16, h1D + 0.12, 0, sfFloorY + 0.02, 0, timberDarkMat);
  addBox(h1, cumbaW + 0.1, 0.16, cumbaProj + 0.1, 0, sfFloorY + 0.02, -h1D / 2 - cumbaProj / 2, timberDarkMat);

  // Upper floor windows (3 tall paired windows across cumba + flanking windows + West windows overlooking mosque)
  for (const wx of [-1.55, 0, 1.55]) {
    addFramedWindow(h1, wx, sfFloorY + 1.5, -h1D / 2 - cumbaProj - 0.02, Math.PI, 1.05, 1.48, timberDarkMat, false, false);
  }
  addFramedWindow(h1, -3.55, sfFloorY + 1.5, -h1D / 2 - 0.02, Math.PI, 0.95, 1.38, timberDarkMat, true, false);
  addFramedWindow(h1, 3.55, sfFloorY + 1.5, -h1D / 2 - 0.02, Math.PI, 0.95, 1.38, timberDarkMat, true, false);
  addFramedWindow(h1, -h1W / 2 - 0.02, sfFloorY + 1.5, -1.8, -Math.PI / 2, 1.08, 1.4, timberDarkMat, true, false);
  addFramedWindow(h1, -h1W / 2 - 0.02, sfFloorY + 1.5, 1.8, -Math.PI / 2, 1.08, 1.4, timberDarkMat, true, false);

  // --- SECOND FLOOR INTERIOR FURNITURE (SEDIR, KILIM, WARDROBE, COFFEE TABLE, LIGHTING) ---
  // Second floor kilim rug
  const sfRug = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.02, 4.4), kilimMat);
  sfRug.position.set(-1.1, sfFloorY + 0.035, 0.4);
  sfRug.receiveShadow = true;
  h1.add(sfRug);

  // Traditional Divan (Sedir) nestled into the cumba bay window overlooking Alaca Mescit!
  const sedir = new THREE.Group();
  sedir.position.set(0, sfFloorY + 0.03, -h1D / 2 - 0.35);
  addBox(sedir, 4.4, 0.36, 0.85, 0, 0.18, 0, timberDarkMat);
  addBox(sedir, 4.3, 0.12, 0.8, 0, 0.42, 0, fabricRedMat);
  for (const cx of [-1.6, -0.55, 0.55, 1.6]) {
    addBox(sedir, 0.82, 0.32, 0.16, cx, 0.62, -0.28, fabricCreamMat);
  }
  h1.add(sedir);
  colliders.push({
    id: 'h1_sf_sedir',
    minX: h1X - 2.2,
    maxX: h1X + 2.2,
    minY: sfFloorY,
    maxY: sfFloorY + 0.9,
    minZ: h1Z - h1D / 2 - 0.8,
    maxZ: h1Z - h1D / 2 + 0.15,
    enabled: true,
    blocksCamera: false,
  });

  // Low Ottoman Coffee Table (Sehpa) with brass tray & tea glasses
  const sehpa = new THREE.Group();
  sehpa.position.set(-0.6, sfFloorY + 0.03, -1.6);
  const sehpaTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.52, 0.05, 12), timberWarmMat);
  sehpaTop.position.y = 0.42;
  sehpa.add(sehpaTop);
  const sehpaPed = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, 0.4, 8), timberDarkMat);
  sehpaPed.position.y = 0.2;
  sehpa.add(sehpaPed);
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.025, 16), brassMat);
  tray.position.y = 0.455;
  sehpa.add(tray);
  h1.add(sehpa);

  // Traditional Wooden Wardrobe (Yüklük / Dolap) along South wall of 2nd floor
  const dolap = new THREE.Group();
  dolap.position.set(0.3, sfFloorY + 0.03, 4.25);
  addBox(dolap, 2.2, 2.2, 0.72, 0, 1.1, 0, timberDarkMat);
  for (const px of [-0.54, 0.54]) {
    addBox(dolap, 0.94, 1.9, 0.06, px, 1.12, -0.36, timberWarmMat);
  }
  addBox(dolap, 2.32, 0.12, 0.8, 0, 2.24, 0, timberDarkMat);
  h1.add(dolap);
  colliders.push({
    id: 'h1_sf_dolap',
    minX: h1X + 0.3 - 1.15,
    maxX: h1X + 0.3 + 1.15,
    minY: sfFloorY,
    maxY: sfFloorY + 2.3,
    minZ: h1Z + 4.25 - 0.45,
    maxZ: h1Z + 4.25 + 0.45,
    enabled: true,
    blocksCamera: false,
  });

  // Bed & Phone-Watching NPC on House 1 2nd Floor (SW corner, lx = -3.45, lz = +2.85)
  const h1Bed = buildCozyBed(timberDarkMat, 0x2f4b66, 0xeae2d2);
  h1Bed.position.set(-3.45, sfFloorY + 0.03, 2.85);
  h1Bed.rotation.y = Math.PI / 2; // Headboard against West wall (-X), facing East (+X)
  h1.add(h1Bed);
  colliders.push({
    id: 'h1_sf_bed',
    minX: h1X - 3.45 - 1.05,
    maxX: h1X - 3.45 + 1.05,
    minY: sfFloorY,
    maxY: sfFloorY + 0.9,
    minZ: h1Z + 2.85 - 0.7,
    maxZ: h1Z + 2.85 + 0.7,
    enabled: true,
    blocksCamera: false,
  });
  const h1PhoneNpc = buildHouse1PhoneWatcherNPC(-3.45, sfFloorY + 0.03, 2.85, Math.PI / 2);
  h1.add(h1PhoneNpc.group);

  // Interior ceiling & wooden ceiling beams on 2nd floor + warm lights
  addBox(h1, h1W, 0.14, h1D, 0, roofBaseY - 0.04, 0, h1InnerPlasterMat);
  for (let bz = -4.2; bz <= 4.2; bz += 1.4) {
    addBox(h1, h1W - 0.4, 0.14, 0.14, 0, roofBaseY - 0.14, bz, timberDarkMat);
  }
  // Framed landscape painting on 2nd floor West wall
  addBox(h1, 0.05, 0.95, 1.35, -h1W / 2 + 0.3, sfFloorY + 1.65, -0.6, timberDarkMat);
  addBox(h1, 0.06, 0.76, 1.15, -h1W / 2 + 0.31, sfFloorY + 1.65, -0.6, ceramicMat);
  const gfLight = new THREE.PointLight(0xffcf87, 1.8, 12, 1.6);
  gfLight.position.set(h1X - 1.0, gfFloorY + 2.75, h1Z + 0.4);
  interiorLights.push(gfLight);

  // Keep 2nd floor ceiling light warm & soft so phone light on NPC face pops clearly
  const sfLight = new THREE.PointLight(0xffd596, 1.05, 11, 1.7);
  sfLight.position.set(h1X + 0.5, sfFloorY + 2.55, h1Z - 1.5);
  interiorLights.push(sfLight);

  // Lamp fixture meshes on ceilings
  for (const ly of [gfFloorY + 2.85, sfFloorY + 2.68]) {
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.16, 10),
      new THREE.MeshStandardMaterial({ color: 0xf4e3bd, emissive: 0xffb347, emissiveIntensity: 0.8 })
    );
    shade.position.set(-0.8, ly, 0);
    h1.add(shade);
  }

  // Hipped Kiremit Roof with overhanging timber eaves & brick chimney
  const h1Roof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 2.55, 4), kiremitMat);
  h1Roof.rotation.y = Math.PI / 4;
  h1Roof.scale.set(1.0, 1.0, 1.12);
  h1Roof.position.set(0, roofBaseY + 1.25, -0.2);
  h1Roof.castShadow = true;
  h1Roof.receiveShadow = true;
  h1.add(h1Roof);
  // Roof overhang eaves soffit
  addBox(h1, h1W + 0.95, 0.14, h1D + 1.35, 0, roofBaseY + 0.04, -0.35, timberDarkMat);
  // Brick chimney
  addBox(h1, 0.65, 1.65, 0.65, 2.2, roofBaseY + 1.6, 1.8, kiremitMat);
  addBox(h1, 0.78, 0.14, 0.78, 2.2, roofBaseY + 2.45, 1.8, cutStoneMat);

  group.add(h1);

  // =========================================================================
  // HOUSE 2 (EV 2): ENTERABLE 2-STORY DISTINCT TOKAT TOWNHOUSE
  // Center: (25.2, 0, -4.2), Width = 8.4m (x: 21.0..29.4), Depth = 10.6m
  // Distinct 2-story silhouette: ashlar cut-stone ground floor, warm terracotta
  // upper story, green timber shutters, left balcony + right cumba, gabled roof!
  // Upper floor houses the photo-matched Gaming PC Setup + Bed + Handsome NPC!
  // =========================================================================
  const h2X = 25.2;
  const h2Z = -4.2;
  const h2W = 8.4;
  const h2D = 10.6;
  const h2 = new THREE.Group();
  h2.name = 'House2_Enterable';
  h2.position.set(h2X, 0, h2Z);

  const h2GfY = 0.18;
  const h2GfH = 3.12;
  const h2SfY = h2GfY + h2GfH; // 3.30m
  const h2SfH = 3.05;
  const h2RoofY = h2SfY + h2SfH; // 6.35m
  const h2FrontZ = -h2D / 2 + wallT / 2;
  const h2GfMidY = h2GfY + h2GfH / 2;
  const h2SfMidY = h2SfY + h2SfH / 2;

  // Ground slab & interior laminate wood floor
  addBox(h2, h2W + 0.3, h2GfY, h2D + 0.3, 0, h2GfY / 2, 0, cutStoneMat, false, true);
  addBox(h2, h2W - 0.3, 0.04, h2D - 0.3, 0, h2GfY + 0.01, 0, floorWoodMat, false, true);
  colliders.push({
    id: 'h2_ground_floor',
    minX: h2X - h2W / 2 - 0.15,
    maxX: h2X + h2W / 2 + 0.15,
    minY: 0,
    maxY: h2GfY + 0.03,
    minZ: h2Z - h2D / 2 - 0.15,
    maxZ: h2Z + h2D / 2 + 0.15,
    enabled: true,
    blocksCamera: false,
    materialTag: 'wood',
  });
  // Entry stone step outside left arched door (lx = -2.0)
  addBox(h2, 2.0, 0.18, 0.85, -2.0, 0.09, -h2D / 2 - 0.42, cutStoneMat, false, true);

  // --- HOUSE 2 GROUND FLOOR WALLS (REAL OPENINGS!) ---
  addWallWithCollider(h2, 'h2_gf_south', h2W, h2GfH, wallT, 0, h2GfMidY, h2D / 2 - wallT / 2, h2X, h2Z, cutStoneMat);
  addWallWithCollider(h2, 'h2_gf_west', wallT, h2GfH, h2D, -h2W / 2 + wallT / 2, h2GfMidY, 0, h2X, h2Z, cutStoneMat);
  addWallWithCollider(h2, 'h2_gf_east', wallT, h2GfH, h2D, h2W / 2 - wallT / 2, h2GfMidY, 0, h2X, h2Z, cutStoneMat);

  // North facade GF: left enterable door at lx = -2.0 (width 1.44m, height 2.32m), center window, right decorative door
  const h2DoorLX = -2.0;
  const h2DoorW = 1.44;
  const h2DoorH = 2.32;
  // Left pier (x: -4.2 to -2.72 -> w = 1.48, center = -3.46)
  addWallWithCollider(h2, 'h2_gf_north_l', 1.48, h2GfH, wallT, -3.46, h2GfMidY, h2FrontZ, h2X, h2Z, cutStoneMat);
  // Segment between door and center window (x: -1.28 to -0.45 -> w = 0.83, center = -0.865)
  addWallWithCollider(h2, 'h2_gf_north_m1', 0.83, h2GfH, wallT, -0.865, h2GfMidY, h2FrontZ, h2X, h2Z, cutStoneMat);
  // Center window (x: -0.45 to +0.45)
  addBox(h2, 0.9, 1.15, wallT, 0, h2GfY + 0.575, h2FrontZ, cutStoneMat);
  addBox(h2, 0.9, 0.78, wallT, 0, h2GfY + h2GfH - 0.39, h2FrontZ, cutStoneMat);
  colliders.push({
    id: 'h2_gf_north_win_col',
    minX: h2X - 0.45,
    maxX: h2X + 0.45,
    minY: h2GfY,
    maxY: h2GfY + h2GfH,
    minZ: h2Z + h2FrontZ - wallT / 2,
    maxZ: h2Z + h2FrontZ + wallT / 2,
    enabled: true,
    blocksCamera: true,
  });
  addFramedWindow(h2, 0, h2GfY + 1.75, h2FrontZ - 0.04, Math.PI, 0.9, 1.2, h2TrimGreenMat, false, true);
  // Right wall segment (x: +0.45 to +4.2 -> w = 3.75, center = +2.325)
  addWallWithCollider(h2, 'h2_gf_north_r', 3.75, h2GfH, wallT, 2.325, h2GfMidY, h2FrontZ, h2X, h2Z, cutStoneMat);
  // Right street-level closed twin carriage/courtyard door (decorative)
  addBox(h2, 1.8, 2.4, 0.16, 2.0, 1.2, -h2D / 2 - 0.02, timberDarkMat);
  addBox(h2, 1.48, 2.15, 0.1, 2.0, 1.1, -h2D / 2 - 0.06, h2TrimGreenMat);
  addBox(h2, 2.15, 0.26, 0.24, 2.0, 2.48, -h2D / 2 - 0.04, cutStoneMat);

  // Header lintel above House 2 enterable front door
  addBox(h2, h2DoorW + 0.12, h2GfH - h2DoorH, wallT, h2DoorLX, h2GfY + h2DoorH + (h2GfH - h2DoorH) / 2, h2FrontZ, cutStoneMat);
  colliders.push({
    id: 'h2_gf_door_lintel',
    minX: h2X + h2DoorLX - h2DoorW / 2,
    maxX: h2X + h2DoorLX + h2DoorW / 2,
    minY: h2GfY + h2DoorH,
    maxY: h2GfY + h2GfH,
    minZ: h2Z + h2FrontZ - wallT / 2,
    maxZ: h2Z + h2FrontZ + wallT / 2,
    enabled: true,
    blocksCamera: true,
  });

  // House 2 Hinged Front Door (green timber leaf)
  addBox(h2, 0.12, h2DoorH, wallT + 0.06, h2DoorLX - h2DoorW / 2 + 0.05, h2GfY + h2DoorH / 2, h2FrontZ, timberDarkMat);
  addBox(h2, 0.12, h2DoorH, wallT + 0.06, h2DoorLX + h2DoorW / 2 - 0.05, h2GfY + h2DoorH / 2, h2FrontZ, timberDarkMat);
  addBox(h2, h2DoorW + 0.12, 0.14, wallT + 0.08, h2DoorLX, h2GfY + h2DoorH - 0.04, h2FrontZ, cutStoneMat);

  const h2DoorPivot = new THREE.Group();
  h2DoorPivot.position.set(h2DoorLX - h2DoorW / 2 + 0.1, h2GfY, h2FrontZ);
  const h2LeafW = h2DoorW - 0.2;
  addBox(h2DoorPivot, h2LeafW, h2DoorH - 0.08, 0.07, h2LeafW / 2, (h2DoorH - 0.08) / 2, 0, h2TrimGreenMat);
  addBox(h2DoorPivot, h2LeafW * 0.72, 0.85, 0.09, h2LeafW / 2, 1.56, 0, timberDarkMat);
  const h2Knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), brassMat);
  h2Knob.position.set(h2LeafW - 0.14, 1.05, -0.07);
  h2DoorPivot.add(h2Knob);
  h2.add(h2DoorPivot);

  const h2DoorCollider: ColliderBox = {
    id: 'h2_front_door_leaf',
    minX: h2X + h2DoorLX - h2DoorW / 2,
    maxX: h2X + h2DoorLX + h2DoorW / 2,
    minY: h2GfY,
    maxY: h2GfY + h2DoorH,
    minZ: h2Z + h2FrontZ - 0.15,
    maxZ: h2Z + h2FrontZ + 0.15,
    enabled: true,
    blocksCamera: false,
    materialTag: 'wood',
  };
  colliders.push(h2DoorCollider);

  let isH2DoorOpen = false;
  let h2DoorAngle = 0;

  // --- HOUSE 2 GROUND FLOOR INTERIOR LOUNGE + WALKABLE STAIRCASE ---
  const h2GfRug = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.02, 3.4), kilimMat);
  h2GfRug.position.set(-1.1, h2GfY + 0.025, 1.2);
  h2.add(h2GfRug);
  // Cozy lounge sofa bench & low table
  addBox(h2, 2.1, 0.42, 0.78, -2.5, h2GfY + 0.22, 1.4, fabricRedMat);
  addBox(h2, 0.24, 0.76, 0.78, -3.45, h2GfY + 0.4, 1.4, timberDarkMat);
  addBox(h2, 0.95, 0.44, 0.65, -1.2, h2GfY + 0.24, 1.4, timberWarmMat);
  colliders.push({
    id: 'h2_gf_sofa',
    minX: h2X - 3.6,
    maxX: h2X - 0.7,
    minY: h2GfY,
    maxY: h2GfY + 0.85,
    minZ: h2Z + 0.95,
    maxZ: h2Z + 1.85,
    enabled: true,
    blocksCamera: false,
  });

  // Walkable Wooden Staircase along East Wall (lx = 3.05, lz from -2.0 to +3.0)
  const h2StairX = 3.05;
  const h2StairW = 1.5;
  const h2StairStartZ = -2.0;
  const h2StairEndZ = 3.0;
  const h2Steps = 14;
  const h2Run = (h2StairEndZ - h2StairStartZ) / h2Steps;
  const h2Rise = (h2SfY - h2GfY) / h2Steps;
  const h2StairLen = Math.hypot(h2StairEndZ - h2StairStartZ, h2SfY - h2GfY);
  const h2Pitch = Math.atan2(h2SfY - h2GfY, h2StairEndZ - h2StairStartZ);
  for (const sx of [h2StairX - h2StairW / 2 + 0.05, h2StairX + h2StairW / 2 - 0.05]) {
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, h2StairLen), timberDarkMat);
    str.position.set(sx, (h2GfY + h2SfY) / 2 - 0.08, (h2StairStartZ + h2StairEndZ) / 2);
    str.rotation.x = -h2Pitch;
    h2.add(str);
  }
  for (let i = 0; i < h2Steps; i++) {
    const sy = h2GfY + (i + 0.5) * h2Rise;
    const sz = h2StairStartZ + (i + 0.5) * h2Run;
    addBox(h2, h2StairW - 0.1, 0.07, h2Run + 0.04, h2StairX, sy, sz, timberWarmMat);
    addBox(h2, h2StairW - 0.12, h2Rise, 0.04, h2StairX, sy - h2Rise / 2, sz - h2Run / 2, timberDarkMat);
  }
  const h2RailX = h2StairX - h2StairW / 2 + 0.06;
  const h2Handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h2StairLen, 8), timberDarkMat);
  h2Handrail.rotation.x = Math.PI / 2 - h2Pitch;
  h2Handrail.position.set(h2RailX, (h2GfY + h2SfY) / 2 + 0.88, (h2StairStartZ + h2StairEndZ) / 2);
  h2.add(h2Handrail);
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    addBox(
      h2,
      0.05,
      0.9,
      0.05,
      h2RailX,
      h2GfY + t * (h2SfY - h2GfY) + 0.44,
      h2StairStartZ + t * (h2StairEndZ - h2StairStartZ),
      timberDarkMat
    );
  }
  stairRamps.push({
    id: 'h2_stair_ramp',
    minX: h2X + h2StairX - h2StairW / 2 - 0.1,
    maxX: h2X + h2StairX + h2StairW / 2 + 0.1,
    minZ: h2Z + h2StairStartZ - 0.35,
    maxZ: h2Z + h2StairEndZ + 0.35,
    axis: 'z',
    startCoord: h2Z + h2StairStartZ,
    endCoord: h2Z + h2StairEndZ,
    startY: h2GfY,
    endY: h2SfY + 0.06,
  });
  colliders.push({
    id: 'h2_understair_block',
    minX: h2X + h2StairX - h2StairW / 2,
    maxX: h2X + h2StairX + h2StairW / 2,
    minY: h2GfY,
    maxY: h2GfY + 1.8,
    minZ: h2Z + 0.7,
    maxZ: h2Z + 4.9,
    enabled: true,
    blocksCamera: false,
  });

  // --- HOUSE 2 SECOND FLOOR SLAB (WITH REAL STAIRWELL OPENING!) ---
  const lightOakMat = pbr.makeMaterial(pbr.getTimber('#c89c68', 3, 3), { roughness: 0.62 });
  // Left main floor (x: -4.15 to +2.2 -> w = 6.35, center = -0.975)
  addBox(h2, 6.35, 0.16, h2D - 0.1, -0.975, h2SfY - 0.06, 0, lightOakMat, true, true);
  colliders.push({
    id: 'h2_sf_slab_left',
    minX: h2X - 4.2,
    maxX: h2X + 2.25,
    minY: h2SfY - 0.25,
    maxY: h2SfY + 0.04,
    minZ: h2Z - h2D / 2,
    maxZ: h2Z + h2D / 2,
    enabled: true,
    blocksCamera: false,
  });
  // North of stairwell (x: +2.2 to +4.0 -> w = 1.8, z: -5.2 to -2.1 -> d = 3.1, center z = -3.65)
  addBox(h2, 1.8, 0.16, 3.1, 3.1, h2SfY - 0.06, -3.65, lightOakMat, true, true);
  colliders.push({
    id: 'h2_sf_slab_north',
    minX: h2X + 2.2,
    maxX: h2X + 4.1,
    minY: h2SfY - 0.25,
    maxY: h2SfY + 0.04,
    minZ: h2Z - 5.3,
    maxZ: h2Z - 2.05,
    enabled: true,
    blocksCamera: false,
  });
  // South landing of stairwell (x: +2.2 to +4.0 -> w = 1.8, z: +3.0 to +5.2 -> d = 2.2, center z = +4.1)
  addBox(h2, 1.8, 0.16, 2.2, 3.1, h2SfY - 0.06, 4.1, lightOakMat, true, true);
  colliders.push({
    id: 'h2_sf_slab_south',
    minX: h2X + 2.2,
    maxX: h2X + 4.1,
    minY: h2SfY - 0.25,
    maxY: h2SfY + 0.04,
    minZ: h2Z + 2.95,
    maxZ: h2Z + 5.3,
    enabled: true,
    blocksCamera: false,
  });
  // Protective balustrade around stairwell
  addWallWithCollider(h2, 'h2_sf_rail_w', 0.1, 0.95, 5.1, 2.22, h2SfY + 0.48, 0.45, h2X, h2Z, timberDarkMat, false);
  addWallWithCollider(h2, 'h2_sf_rail_n', 1.75, 0.95, 0.1, 3.1, h2SfY + 0.48, -2.1, h2X, h2Z, timberDarkMat, false);

  // --- HOUSE 2 SECOND FLOOR WALLS (2 STORIES TOTAL!) & DISTINCT EXTERIOR ---
  // Exterior belt molding strips ONLY along perimeter walls (never blocking interior oak floor, carpet, or stairwell!)
  addBox(h2, h2W + 0.24, 0.16, 0.16, 0, h2SfY + 0.02, -h2D / 2 - 0.04, cutStoneMat);
  addBox(h2, h2W + 0.24, 0.16, 0.16, 0, h2SfY + 0.02, h2D / 2 + 0.04, cutStoneMat);
  addBox(h2, 0.16, 0.16, h2D + 0.24, -h2W / 2 - 0.04, h2SfY + 0.02, 0, cutStoneMat);
  addBox(h2, 0.16, 0.16, h2D + 0.24, h2W / 2 + 0.04, h2SfY + 0.02, 0, cutStoneMat);

  // Exterior & interior cream-plaster walls (two-sided via distinct outer terracotta / inner cream)
  addWallWithCollider(h2, 'h2_sf_south', h2W, h2SfH, wallT, 0, h2SfMidY, h2D / 2 - wallT / 2, h2X, h2Z, h2PlasterMat);
  addBox(h2, h2W - 0.6, h2SfH - 0.1, 0.04, 0, h2SfMidY, h2D / 2 - wallT - 0.01, h1InnerPlasterMat);
  addWallWithCollider(h2, 'h2_sf_west', wallT, h2SfH, h2D, -h2W / 2 + wallT / 2, h2SfMidY, 0, h2X, h2Z, h2PlasterMat);
  addBox(h2, 0.04, h2SfH - 0.1, h2D - 0.6, -h2W / 2 + wallT + 0.01, h2SfMidY, 0, h1InnerPlasterMat);
  addWallWithCollider(h2, 'h2_sf_east', wallT, h2SfH, h2D, h2W / 2 - wallT / 2, h2SfMidY, 0, h2X, h2Z, h2PlasterMat);
  addBox(h2, 0.04, h2SfH - 0.1, h2D - 0.6, h2W / 2 - wallT - 0.01, h2SfMidY, 0, h1InnerPlasterMat);

  // North 2nd floor wall with real transparent balcony window at lx = -2.1
  addWallWithCollider(h2, 'h2_sf_north_l', 1.45, h2SfH, wallT, -3.475, h2SfMidY, h2FrontZ, h2X, h2Z, h2PlasterMat);
  addBox(h2, 1.3, 0.65, wallT, -2.1, h2SfY + 0.325, h2FrontZ, h2PlasterMat);
  addBox(h2, 1.3, 0.55, wallT, -2.1, h2SfY + h2SfH - 0.275, h2FrontZ, h2PlasterMat);
  colliders.push({
    id: 'h2_sf_north_balcony_win_col',
    minX: h2X - 2.75,
    maxX: h2X - 1.45,
    minY: h2SfY,
    maxY: h2SfY + h2SfH,
    minZ: h2Z + h2FrontZ - wallT / 2,
    maxZ: h2Z + h2FrontZ + wallT / 2,
    enabled: true,
    blocksCamera: true,
  });
  addWallWithCollider(h2, 'h2_sf_north_r', 5.65, h2SfH, wallT, 1.375, h2SfMidY, h2FrontZ, h2X, h2Z, h2PlasterMat);
  addBox(h2, h2W - 0.6, h2SfH - 0.1, 0.04, 0, h2SfMidY, h2FrontZ + wallT / 2 + 0.01, h1InnerPlasterMat);

  // Left: open wrought-iron balcony (x = -2.1, y = 3.4) with real balusters
  addBox(h2, 2.6, 0.16, 1.05, -2.1, h2SfY + 0.04, -h2D / 2 - 0.5, cutStoneMat);
  addBox(h2, 2.6, 0.05, 0.06, -2.1, h2SfY + 1.02, -h2D / 2 - 0.98, ironMat);
  addBox(h2, 2.6, 0.04, 0.05, -2.1, h2SfY + 0.16, -h2D / 2 - 0.98, ironMat);
  for (const bx of [-3.35, -3.05, -2.75, -2.45, -2.15, -1.85, -1.55, -1.25, -0.95, -0.82]) {
    addBox(h2, 0.035, 0.88, 0.035, bx, h2SfY + 0.58, -h2D / 2 - 0.98, ironMat);
  }
  for (const bz of [-0.3, -0.55, -0.8]) {
    addBox(h2, 0.035, 0.88, 0.035, -3.38, h2SfY + 0.58, -h2D / 2 + bz, ironMat);
    addBox(h2, 0.035, 0.88, 0.035, -0.82, h2SfY + 0.58, -h2D / 2 + bz, ironMat);
  }
  addBox(h2, 0.04, 0.05, 1.0, -3.38, h2SfY + 1.02, -h2D / 2 - 0.5, ironMat);
  addBox(h2, 0.04, 0.05, 1.0, -0.82, h2SfY + 1.02, -h2D / 2 - 0.5, ironMat);
  addFramedWindow(h2, -2.1, h2SfY + 1.55, -h2D / 2 - 0.02, Math.PI, 1.25, 1.85, h2TrimGreenMat, true, false);

  // Right: Enclosed cantilevered timber cumba on 2nd floor (x = +2.0)
  addBox(h2, 3.1, 2.85, 1.05, 2.0, h2SfY + 1.44, -h2D / 2 - 0.48, h2PlasterMat);
  addBox(h2, 3.22, 0.16, 1.15, 2.0, h2SfY + 0.04, -h2D / 2 - 0.52, timberDarkMat);
  addBox(h2, 3.26, 0.22, 1.2, 2.0, h2RoofY - 0.05, -h2D / 2 - 0.54, kiremitMat);
  for (const bx of [0.8, 2.0, 3.2]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.16), timberDarkMat);
    br.position.set(bx, h2SfY - 0.35, -h2D / 2 - 0.42);
    br.rotation.x = 0.65;
    h2.add(br);
  }
  addFramedWindow(h2, 1.45, h2SfY + 1.5, -h2D / 2 - 1.0, Math.PI, 0.85, 1.42, h2TrimGreenMat, false, false);
  addFramedWindow(h2, 2.55, h2SfY + 1.5, -h2D / 2 - 1.0, Math.PI, 0.85, 1.42, h2TrimGreenMat, false, false);

  // --- HOUSE 2 SECOND FLOOR: PHOTO-ACCURATE GAMING PC SETUP + BED + HANDSOME NPC ---
  // Gaming Setup placed in the NW corner of House 2 2nd floor (desk facing West wall)
  const gamingSetup = buildGamingSetup(pbr);
  gamingSetup.group.position.set(-3.5, h2SfY + 0.03, -2.55);
  gamingSetup.group.rotation.y = Math.PI / 2;
  h2.add(gamingSetup.group);
  colliders.push({
    id: 'h2_sf_pc_desk',
    minX: h2X - 3.92,
    maxX: h2X - 3.08,
    minY: h2SfY,
    maxY: h2SfY + 1.25,
    minZ: h2Z - 3.6,
    maxZ: h2Z - 1.5,
    enabled: true,
    blocksCamera: false,
  });

  // Cozy Bed in SW corner of House 2 2nd floor (headboard against West wall)
  const h2BedPos = new THREE.Vector3(-2.82, h2SfY + 0.03, 3.35);
  const h2Bed = buildCozyBed(timberDarkMat, 0x2a3b34, 0xeae5db);
  h2Bed.position.copy(h2BedPos);
  h2Bed.rotation.y = Math.PI / 2;
  h2.add(h2Bed);
  colliders.push({
    id: 'h2_sf_bed',
    minX: h2X - 3.9,
    maxX: h2X - 1.75,
    minY: h2SfY,
    maxY: h2SfY + 0.9,
    minZ: h2Z + 2.65,
    maxZ: h2Z + 4.05,
    enabled: true,
    blocksCamera: false,
  });

  // Handsome NPC who lies on the bed, walks over to the Gaming PC setup, and sits to game!
  const pcSeatLocal = new THREE.Vector3(-2.58, h2SfY + 0.03, -2.73);
  const h2PcNpc = buildHouse2HandsomePCNPC(h2BedPos, pcSeatLocal, -Math.PI / 2 - 0.15);
  h2.add(h2PcNpc.npc.group);

  // House 2 interior ceiling & lights
  addBox(h2, h2W, 0.14, h2D, 0, h2RoofY - 0.04, 0, h1InnerPlasterMat);
  const h2GfLight = new THREE.PointLight(0xffcf87, 1.7, 12, 1.6);
  h2GfLight.position.set(h2X - 0.8, h2GfY + 2.75, h2Z + 0.4);
  interiorLights.push(h2GfLight);
  const h2SfLight = new THREE.PointLight(0xffe0b2, 1.65, 13, 1.5);
  h2SfLight.position.set(h2X - 0.8, h2SfY + 2.65, h2Z + 0.2);
  interiorLights.push(h2SfLight);

  // Distinct Gabled Roof (beşik çatı) sitting directly on the 2-story roofline (y = h2RoofY = 6.35m)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-h2D / 2 - 0.45, 0);
  gableShape.lineTo(0, 2.35);
  gableShape.lineTo(h2D / 2 + 0.45, 0);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: h2W + 0.7, bevelEnabled: false });
  gableGeo.rotateY(Math.PI / 2);
  const gableMesh = new THREE.Mesh(gableGeo, h2PlasterMat);
  gableMesh.position.set(-h2W / 2 - 0.35, h2RoofY, 0);
  gableMesh.castShadow = true;
  h2.add(gableMesh);

  const slopeLen = Math.hypot(h2D / 2 + 0.65, 2.45);
  const slopeAng = Math.atan2(2.45, h2D / 2 + 0.65);
  for (const dir of [-1, 1]) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(h2W + 0.95, 0.16, slopeLen), kiremitMat);
    slope.position.set(0, h2RoofY + 1.2, dir * (h2D / 4 + 0.25));
    slope.rotation.x = dir * slopeAng;
    slope.castShadow = true;
    slope.receiveShadow = true;
    h2.add(slope);
  }
  // North roof dormer (çatı penceresi)
  addBox(h2, 1.4, 1.05, 1.35, 0, h2RoofY + 0.85, -2.5, h2PlasterMat);
  addBox(h2, 1.6, 0.22, 1.55, 0, h2RoofY + 1.45, -2.55, kiremitMat);
  addFramedWindow(h2, 0, h2RoofY + 0.8, -3.18, Math.PI, 0.78, 0.75, h2TrimGreenMat, false, false);

  // Side yard stone garden wall between House 1 and House 2 (x: 18.6..21.0)
  addWallWithCollider(h2, 'h1_h2_garden_wall', 2.4, 1.85, 0.38, -5.4, 0.925, -3.5, h2X, h2Z, rubbleStoneMat, false);

  group.add(h2);

  // =========================================================================
  // INTERACTABLES: FRONT DOORS (EV 1 & EV 2) & INTERIOR LAMP
  // =========================================================================
  interactables.push({
    id: 'h1_front_door',
    label: 'Ev 1 Kapısı — Aç / Kapat',
    position: new THREE.Vector3(h1X + doorLX, 1.2, h1Z + frontZ - 0.4),
    radius: 2.4,
    onInteract: () => {
      isDoorOpen = !isDoorOpen;
      doorCollider.enabled = !isDoorOpen;
      onDoorToggle(isDoorOpen);
    },
  });

  interactables.push({
    id: 'h2_front_door',
    label: 'Ev 2 Kapısı — Aç / Kapat',
    position: new THREE.Vector3(h2X + h2DoorLX, 1.2, h2Z + h2FrontZ - 0.4),
    radius: 2.4,
    onInteract: () => {
      isH2DoorOpen = !isH2DoorOpen;
      h2DoorCollider.enabled = !isH2DoorOpen;
      onDoorToggle(isH2DoorOpen);
    },
  });

  let lampsOn = true;
  interactables.push({
    id: 'h1_interior_lamp',
    label: 'Ev 1 Aydınlatma — Aç / Kapat',
    position: new THREE.Vector3(h1X - 0.75, gfFloorY + 1.1, h1Z + 3.8),
    radius: 2.1,
    onInteract: () => {
      lampsOn = !lampsOn;
      gfLight.intensity = lampsOn ? 1.8 : 0;
      sfLight.intensity = lampsOn ? 1.05 : 0;
      onLampToggle(lampsOn);
    },
  });

  let elapsed = 0;
  const update = (dt: number) => {
    elapsed += dt;
    const target = isDoorOpen ? -Math.PI * 0.56 : 0;
    doorAngle += (target - doorAngle) * Math.min(1, dt * 8.5);
    doorPivot.rotation.y = doorAngle;

    const h2Target = isH2DoorOpen ? -Math.PI * 0.56 : 0;
    h2DoorAngle += (h2Target - h2DoorAngle) * Math.min(1, dt * 8.5);
    h2DoorPivot.rotation.y = h2DoorAngle;

    h1PhoneNpc.update(dt, elapsed);
    h2PcNpc.npc.update(dt, elapsed);
    gamingSetup.update(elapsed, h2PcNpc.isUsingPc());
  };

  const openHouse1Door = (): boolean => {
    if (isDoorOpen) return false;
    isDoorOpen = true;
    doorCollider.enabled = false;
    onDoorToggle(true);
    return true;
  };

  return {
    group,
    colliders,
    stairRamps,
    interactables,
    interiorLights,
    house1Origin: new THREE.Vector3(h1X, 0, h1Z),
    house1MovieNpc: h1PhoneNpc,
    openHouse1Door,
    update,
  };
}
