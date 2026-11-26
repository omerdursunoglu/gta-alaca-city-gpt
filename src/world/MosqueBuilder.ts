import * as THREE from 'three';
import { ProceduralPBR } from '../textures/ProceduralPBR';
import { ColliderBox, InteractableItem } from '../types/game';

export interface MosqueBuildResult {
  group: THREE.Group;
  colliders: ColliderBox[];
  interactables: InteractableItem[];
}

/**
 * High-detail architectural model of Alaca Mescit Camii (Tokat Merkez, ~1300 / 1505-1506 / 1939 / 1952).
 * Origin (0,0,0) = mosque center per OSM way/1372898868.
 * Orientation: -Z = North (main entrance, son cemaat yeri, avlu, şadırvan, Alaca Çeşme),
 *              +Z = South (qibla/mihrab), -X = West (almaşık masonry + NW Seljuk minaret), +X = East.
 * Strict rule: Mosque interior is sealed and non-enterable.
 */
export function buildAlacaMescitCamii(
  pbr: ProceduralPBR,
  onFountainInteract: () => void,
  onSadirvanInteract: () => void
): MosqueBuildResult {
  const group = new THREE.Group();
  group.name = 'AlacaMescitCamii';

  const colliders: ColliderBox[] = [];
  const interactables: InteractableItem[] = [];

  // Materials
  const rubbleMat = pbr.makeMaterial(pbr.getRubbleStone(3, 2), { roughness: 0.92 });
  const cutStoneMat = pbr.makeMaterial(pbr.getCutStone(2, 2), { roughness: 0.84 });
  const almasikMat = pbr.makeMaterial(pbr.getAlmasikBrickStone(2, 2), { roughness: 0.88 });
  const minaretBrickMat = pbr.makeMaterial(pbr.getSeljukMinaretBrick(), { roughness: 0.82 });
  const kiremitMat = pbr.makeMaterial(pbr.getKiremitRoof(4, 3), { roughness: 0.78 });
  const timberMat = pbr.makeMaterial(pbr.getTimber('#4d321f', 1, 1), { roughness: 0.82 });
  const courtyardFloorMat = pbr.makeMaterial(pbr.getCourtyardFlagstone(4, 5), { roughness: 0.86 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xb9b8b4, roughness: 0.55, metalness: 0.08 });
  const darkMarbleMat = new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.52, metalness: 0.1 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.45, metalness: 0.75 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc29838, roughness: 0.32, metalness: 0.85 });
  const leadCapMat = new THREE.MeshStandardMaterial({ color: 0x4b5158, roughness: 0.48, metalness: 0.65 });
  const glassDarkMat = new THREE.MeshStandardMaterial({ color: 0x161c22, roughness: 0.2, metalness: 0.3 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d8a,
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.86,
  });

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
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    parent.add(mesh);
    return mesh;
  };

  /** Builds a real recessed window with cut-stone jambs, sill, lintel/arch, wooden frame, glass, and iron grilles */
  const addWindow = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    rotY: number,
    w: number,
    h: number,
    arched: boolean,
    withBars: boolean
  ) => {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;

    // Dark recessed interior backing
    addBox(wg, w - 0.08, h - 0.08, 0.08, 0, 0, -0.05, glassDarkMat, false, false);

    // Wooden inner frame
    const frameThick = 0.05;
    addBox(wg, w - 0.1, frameThick, 0.08, 0, h / 2 - frameThick / 2, -0.01, timberMat);
    addBox(wg, w - 0.1, frameThick, 0.08, 0, -h / 2 + frameThick / 2, -0.01, timberMat);
    addBox(wg, frameThick, h - 0.1, 0.08, -w / 2 + 0.07, 0, -0.01, timberMat);
    addBox(wg, frameThick, h - 0.1, 0.08, w / 2 - 0.07, 0, -0.01, timberMat);
    // Center mullion
    addBox(wg, 0.035, h - 0.12, 0.06, 0, 0, -0.01, timberMat);
    addBox(wg, w - 0.12, 0.035, 0.06, 0, 0.05, -0.01, timberMat);

    // Cut-stone jambs (söve) and projecting sill
    const jambW = 0.14;
    addBox(wg, jambW, h + 0.04, 0.14, -w / 2 - jambW / 2 + 0.02, 0, 0.04, cutStoneMat);
    addBox(wg, jambW, h + 0.04, 0.14, w / 2 + jambW / 2 - 0.02, 0, 0.04, cutStoneMat);
    addBox(wg, w + jambW * 2 + 0.06, 0.11, 0.2, 0, -h / 2 - 0.04, 0.06, cutStoneMat);

    if (arched) {
      // Curved stone voussoir arch header
      const rOuter = w / 2 + jambW;
      const rInner = w / 2 - 0.04;
      const shape = new THREE.Shape();
      shape.absarc(0, 0, rOuter, 0, Math.PI, false);
      shape.absarc(0, 0, rInner, Math.PI, 0, true);
      shape.closePath();
      const archGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01 });
      const archMesh = new THREE.Mesh(archGeo, cutStoneMat);
      archMesh.position.set(0, h / 2 - 0.02, -0.03);
      archMesh.castShadow = true;
      wg.add(archMesh);

      // Arched dark recess behind arch
      const fillShape = new THREE.Shape();
      fillShape.absarc(0, 0, rInner, 0, Math.PI, false);
      fillShape.closePath();
      const fillGeo = new THREE.ExtrudeGeometry(fillShape, { depth: 0.06, bevelEnabled: false });
      const fillMesh = new THREE.Mesh(fillGeo, glassDarkMat);
      fillMesh.position.set(0, h / 2 - 0.02, -0.05);
      wg.add(fillMesh);
    } else {
      // Flat lintel stone block
      addBox(wg, w + jambW * 2 + 0.02, 0.18, 0.16, 0, h / 2 + 0.09, 0.04, cutStoneMat);
    }

    if (withBars) {
      const cols = Math.max(3, Math.round(w / 0.22));
      for (let i = 1; i < cols; i++) {
        const bx = -w / 2 + (i / cols) * w;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, h - 0.08, 6), ironMat);
        bar.position.set(bx, 0, 0.03);
        wg.add(bar);
      }
      for (const frac of [-0.25, 0, 0.25]) {
        addBox(wg, w - 0.08, 0.022, 0.022, 0, frac * h, 0.03, ironMat);
      }
    }

    parent.add(wg);
  };

  /** Pointed relieving arch (sivri boşaltma kemeri) for the 3-bay North entrance facade */
  const addPointedArch = (parent: THREE.Object3D, x: number, y: number, z: number, span: number, height: number, depth: number) => {
    const outer = new THREE.Shape();
    const hw = span / 2 + 0.22;
    const ihw = span / 2;
    outer.moveTo(-hw, 0);
    outer.quadraticCurveTo(-hw * 0.88, height * 0.65, 0, height + 0.22);
    outer.quadraticCurveTo(hw * 0.88, height * 0.65, hw, 0);
    outer.lineTo(ihw, 0);
    outer.quadraticCurveTo(ihw * 0.88, height * 0.6, 0, height);
    outer.quadraticCurveTo(-ihw * 0.88, height * 0.6, -ihw, 0);
    outer.closePath();

    const geo = new THREE.ExtrudeGeometry(outer, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    });
    const mesh = new THREE.Mesh(geo, cutStoneMat);
    mesh.position.set(x, y, z - depth / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  };

  // =========================================================================
  // 1. MAIN HARIM (SOUTHERN SQUARE MASS) + SON CEMAAT YERI (NORTHERN 3-BAY)
  // Footprint matches OSM way/1372898868 (~13.3m x 13.3m)
  // =========================================================================
  const W = 13.3;
  const harimD = 8.7; // z from -2.0 to +6.7
  const harimZ = 2.35;
  const harimH = 6.2;

  const sonD = 4.6; // z from -6.6 to -2.0
  const sonZ = -4.3;
  const sonH = 5.4;

  // Stone plinth (subasman) around entire mosque
  addBox(group, W + 0.28, 0.65, harimD + sonD + 0.24, 0, 0.325, 0.05, cutStoneMat);

  // Harim core masonry (Rubble stone)
  addBox(group, W, harimH - 0.65, harimD, 0, 0.65 + (harimH - 0.65) / 2, harimZ, rubbleMat);

  // West facade alternating brick-and-stone veneer (almaşık duvar örgüsü)
  addBox(group, 0.14, harimH - 0.7, harimD - 0.5, -W / 2 - 0.02, 0.65 + (harimH - 0.7) / 2, harimZ, almasikMat);
  // Small projecting bay on West facade near minaret base (per TUDER survey)
  addBox(group, 0.55, 4.4, 2.5, -W / 2 - 0.25, 2.2, 0.2, rubbleMat);
  addBox(group, 0.65, 0.18, 2.6, -W / 2 - 0.25, 4.45, 0.2, cutStoneMat);

  // Son Cemaat Yeri (Northern 3-bay entrance block)
  addBox(group, W, sonH - 0.65, sonD, 0, 0.65 + (sonH - 0.65) / 2, sonZ, rubbleMat);
  addBox(group, 0.14, sonH - 0.7, sonD - 0.4, -W / 2 - 0.02, 0.65 + (sonH - 0.7) / 2, sonZ, almasikMat);

  // Slightly raised blank northern bay on East facade (per TUDER: "Cephenin sağ tarafı daha yüksek kottadır ve tamamen sağır tutulmuştur")
  addBox(group, 0.35, 5.75, 4.4, W / 2 - 0.1, 2.875, -4.4, rubbleMat);

  // Cut-stone corner quoins (köşe taşları) for genuine 3D relief at every corner
  const quoinCorners: [number, number][] = [
    [-W / 2, -6.6],
    [W / 2, -6.6],
    [-W / 2, 6.7],
    [W / 2, 6.7],
    [W / 2, -2.0],
  ];
  for (const [cx, cz] of quoinCorners) {
    for (let qy = 0.78; qy < 5.3; qy += 0.48) {
      const longX = Math.round(qy * 2) % 2 === 0;
      addBox(
        group,
        longX ? 0.55 : 0.34,
        0.38,
        longX ? 0.34 : 0.55,
        cx + (cx < 0 ? 0.1 : -0.1),
        qy,
        cz + (cz < 0 ? 0.1 : -0.1),
        cutStoneMat
      );
    }
  }

  // Cut-stone eaves cornice (saçak silmesi)
  addBox(group, W + 0.36, 0.26, harimD + 0.24, 0, harimH + 0.13, harimZ, cutStoneMat);
  addBox(group, W + 0.32, 0.24, sonD + 0.24, 0, sonH + 0.12, sonZ, cutStoneMat);

  // =========================================================================
  // 2. NORTH ENTRANCE FACADE (3 POINTED RELIEVING ARCHES + MARBLE PORTAL)
  // =========================================================================
  const northFaceZ = -6.62;
  // 4 stone piers dividing the 3 north bays
  for (const px of [-5.9, -2.05, 2.05, 5.9]) {
    addBox(group, 0.65, 4.6, 0.28, px, 2.6, northFaceZ - 0.08, cutStoneMat);
  }
  // Three pointed relieving arches across the North facade
  for (const bx of [-3.98, 0, 3.98]) {
    addPointedArch(group, bx, 2.65, northFaceZ - 0.1, 3.3, 1.85, 0.28);
  }

  // Central grey-lead interlocking marble portal (kurşuni-gri mermer basık kemerli kapı)
  const portalGroup = new THREE.Group();
  portalGroup.position.set(0, 0.65, northFaceZ - 0.12);
  // Two stepped stone entrance threshold stairs
  addBox(portalGroup, 2.6, 0.18, 0.65, 0, -0.56, -0.25, cutStoneMat);
  addBox(portalGroup, 2.2, 0.18, 0.42, 0, -0.38, -0.12, cutStoneMat);
  // Marble jambs
  addBox(portalGroup, 0.28, 2.45, 0.26, -0.92, 1.15, 0, marbleMat);
  addBox(portalGroup, 0.28, 2.45, 0.26, 0.92, 1.15, 0, darkMarbleMat);
  // Alternating grey/lead interlocking flat arch voussoirs (geçmeli basık kemer)
  const voussoirCount = 7;
  for (let i = 0; i < voussoirCount; i++) {
    const vx = -0.78 + i * 0.26;
    addBox(
      portalGroup,
      0.24,
      0.34,
      0.26,
      vx,
      2.35,
      0,
      i % 2 === 0 ? marbleMat : darkMarbleMat
    );
  }
  // Symmetric molding shoulders
  addBox(portalGroup, 0.36, 0.14, 0.3, -0.94, 2.15, 0.02, marbleMat);
  addBox(portalGroup, 0.36, 0.14, 0.3, 0.94, 2.15, 0.02, marbleMat);
  // Recessed carved wooden double doors (sealed, non-enterable)
  addBox(portalGroup, 1.56, 2.15, 0.1, 0, 1.05, 0.12, timberMat);
  addBox(portalGroup, 0.06, 2.15, 0.14, 0, 1.05, 0.1, timberMat);
  // Door raised panels & brass ring knockers
  for (const side of [-0.38, 0.38]) {
    addBox(portalGroup, 0.56, 0.78, 0.04, side, 1.48, 0.06, timberMat);
    addBox(portalGroup, 0.56, 0.68, 0.04, side, 0.55, 0.06, timberMat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), brassMat);
    ring.position.set(side * 0.35, 1.05, 0.04);
    portalGroup.add(ring);
  }
  // Clean weathered marble inscription plaque frame above portal (NO invented text)
  addBox(portalGroup, 1.48, 0.46, 0.12, 0, 2.86, -0.02, cutStoneMat);
  addBox(portalGroup, 1.24, 0.3, 0.06, 0, 2.86, -0.07, marbleMat);
  group.add(portalGroup);

  // North flanking windows inside the left and right pointed arch bays
  addWindow(group, -3.98, 1.95, northFaceZ - 0.02, Math.PI, 1.15, 1.65, false, true);
  addWindow(group, 3.98, 1.95, northFaceZ - 0.02, Math.PI, 1.15, 1.65, false, true);

  // =========================================================================
  // 3. EAST, SOUTH & WEST FACADE WINDOWS (PER TUDER SURVEY)
  // =========================================================================
  // East facade (+X): 2 lower iron-grilled windows + 2 upper arched windows aligned over outer corners
  addWindow(group, W / 2 + 0.02, 1.95, 0.6, Math.PI / 2, 1.1, 1.65, false, true);
  addWindow(group, W / 2 + 0.02, 1.95, 4.2, Math.PI / 2, 1.1, 1.65, false, true);
  addWindow(group, W / 2 + 0.02, 4.35, 0.1, Math.PI / 2, 0.78, 0.9, true, true);
  addWindow(group, W / 2 + 0.02, 4.35, 4.7, Math.PI / 2, 0.78, 0.9, true, true);

  // South qibla facade (+Z): 2 lower rectangular windows + 2 offset upper flat-arched windows + mihrab projection
  addBox(group, 2.5, 4.6, 0.35, 0, 2.6, 6.82, rubbleMat); // subtle exterior mihrab wall mass
  addBox(group, 2.7, 0.2, 0.42, 0, 4.95, 6.84, cutStoneMat);
  addWindow(group, -3.4, 1.95, 6.72, 0, 1.1, 1.65, false, true);
  addWindow(group, 3.4, 1.95, 6.72, 0, 1.1, 1.65, false, true);
  addWindow(group, -2.6, 4.4, 6.72, 0, 0.85, 0.85, true, true);
  addWindow(group, 2.6, 4.4, 6.72, 0, 0.85, 0.85, true, true);

  // West facade (-X): 1 lower rectangular window + 1 upper arched window on southern part
  addWindow(group, -W / 2 - 0.08, 1.95, 4.1, -Math.PI / 2, 1.1, 1.65, false, true);
  addWindow(group, -W / 2 - 0.08, 4.4, 4.1, -Math.PI / 2, 0.85, 0.85, true, true);

  // =========================================================================
  // 4. HARIM OCTAGONAL DRUM, TILED CONICAL ROOF & SON CEMAAT ROOFS
  // =========================================================================
  // Harim lower hipped roof skirt around the octagonal drum
  const skirtGeo = new THREE.CylinderGeometry(5.6, 9.2, 1.2, 4, 1);
  skirtGeo.rotateY(Math.PI / 4);
  const skirtMesh = new THREE.Mesh(skirtGeo, kiremitMat);
  skirtMesh.scale.set(1.0, 1.0, harimD / W);
  skirtMesh.position.set(0, harimH + 0.6, harimZ);
  skirtMesh.castShadow = true;
  skirtMesh.receiveShadow = true;
  group.add(skirtMesh);

  // Octagonal cut-stone drum (sekizgen kasnak)
  const drumRadius = 4.35;
  const drumH = 2.15;
  const drumY = harimH + 0.8 + drumH / 2;
  const drumGeo = new THREE.CylinderGeometry(drumRadius, drumRadius * 1.03, drumH, 8, 1);
  drumGeo.rotateY(Math.PI / 8);
  const drumMesh = new THREE.Mesh(drumGeo, cutStoneMat);
  drumMesh.position.set(0, drumY, harimZ);
  drumMesh.castShadow = true;
  drumMesh.receiveShadow = true;
  group.add(drumMesh);

  // Drum stone cornice molding (silme)
  const drumCornice = new THREE.Mesh(
    new THREE.CylinderGeometry(drumRadius + 0.2, drumRadius + 0.12, 0.24, 8, 1),
    cutStoneMat
  );
  drumCornice.rotation.y = Math.PI / 8;
  drumCornice.position.set(0, drumY + drumH / 2 + 0.1, harimZ);
  group.add(drumCornice);

  // Arched drum windows on the 4 cardinal faces of the octagonal drum
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    const wx = Math.sin(ang) * (drumRadius - 0.18);
    const wz = harimZ + Math.cos(ang) * (drumRadius - 0.18);
    addWindow(group, wx, drumY, wz, ang, 0.72, 0.92, true, true);
  }

  // Kiremit-tiled conical cap (kiremit kaplı konik külah) over the main dome
  const coneH = 3.45;
  const coneGeo = new THREE.ConeGeometry(drumRadius + 0.35, coneH, 16, 1);
  const coneMesh = new THREE.Mesh(coneGeo, kiremitMat);
  coneMesh.position.set(0, drumY + drumH / 2 + 0.2 + coneH / 2, harimZ);
  coneMesh.castShadow = true;
  coneMesh.receiveShadow = true;
  group.add(coneMesh);

  // Brass Alem finial on main dome cone
  const mainAlemY = drumY + drumH / 2 + 0.2 + coneH;
  const alemPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.05, 8), brassMat);
  alemPole.position.set(0, mainAlemY + 0.5, harimZ);
  group.add(alemPole);
  const alemSphere = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), brassMat);
  alemSphere.position.set(0, mainAlemY + 0.45, harimZ);
  group.add(alemSphere);
  const alemCrescent = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.028, 8, 16, Math.PI * 1.45), brassMat);
  alemCrescent.rotation.z = Math.PI * 0.78;
  alemCrescent.position.set(0, mainAlemY + 0.96, harimZ);
  group.add(alemCrescent);

  // Son Cemaat Yeri 3-bay roof (central tiled dome + two side vaulted tiled roofs)
  for (const sx of [-4.1, 4.1]) {
    const vaultRoof = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.35, 4.1, 6, 1), kiremitMat);
    vaultRoof.rotation.z = Math.PI / 2;
    vaultRoof.scale.set(0.55, 1, 1.08);
    vaultRoof.position.set(sx, sonH + 0.35, sonZ);
    vaultRoof.castShadow = true;
    group.add(vaultRoof);
  }
  const sonCenterDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.95, 0.65, 12), cutStoneMat);
  sonCenterDrum.position.set(0, sonH + 0.45, sonZ);
  group.add(sonCenterDrum);
  const sonCenterCap = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.35, 12), kiremitMat);
  sonCenterCap.position.set(0, sonH + 1.42, sonZ);
  sonCenterCap.castShadow = true;
  group.add(sonCenterCap);

  // =========================================================================
  // 5. SELJUK MINARET AT NW CORNER (x = -6.35, z = -3.85)
  // Polygonal cut-stone kaide, pabuç, cylindrical Seljuk geometric brick shaft,
  // stone corbeled şerefe, petek, conical külah & alem.
  // =========================================================================
  const minX = -6.35;
  const minZ = -3.85;
  const minaret = new THREE.Group();
  minaret.position.set(minX, 0, minZ);

  // Polygonal cut-stone base (çokgen kaide)
  const kaide = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.48, 5.2, 8), cutStoneMat);
  kaide.position.y = 2.6;
  kaide.castShadow = true;
  kaide.receiveShadow = true;
  minaret.add(kaide);

  // Minaret base inscription plaque frame on North/West visible face
  const plaqueGroup = new THREE.Group();
  plaqueGroup.position.set(0, 3.0, -1.36);
  plaqueGroup.rotation.y = Math.PI;
  addBox(plaqueGroup, 0.95, 0.56, 0.1, 0, 0, 0, cutStoneMat);
  addBox(plaqueGroup, 0.78, 0.4, 0.06, 0, 0, 0.04, marbleMat);
  minaret.add(plaqueGroup);

  // Cut-stone cornice collar above kaide + chamfered transition (pabuç)
  const collar1 = new THREE.Mesh(new THREE.CylinderGeometry(1.44, 1.44, 0.24, 8), cutStoneMat);
  collar1.position.y = 5.32;
  minaret.add(collar1);

  const pabuc = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.36, 1.15, 8), cutStoneMat);
  pabuc.position.y = 6.0;
  pabuc.castShadow = true;
  minaret.add(pabuc);

  // Cylindrical Seljuk brick shaft (gövde) with 4 decorative brick zones
  const shaftH = 7.4;
  const shaftBaseY = 6.57;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.96, shaftH, 20), minaretBrickMat);
  shaft.position.y = shaftBaseY + shaftH / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  minaret.add(shaft);

  // Physical relief stone/brick band rings dividing the Seljuk geometric zones
  for (const ringY of [6.65, 10.25, 11.35, 12.45, 13.82]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 8, 24), cutStoneMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ringY;
    minaret.add(ring);
  }

  // Şerefe (single balcony with stepped corbel brackets & carved stone parapet)
  const serefeY = shaftBaseY + shaftH;
  for (let i = 0; i < 3; i++) {
    const corbel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.06 + i * 0.18, 0.96 + i * 0.14, 0.28, 16),
      cutStoneMat
    );
    corbel.position.y = serefeY + i * 0.26;
    corbel.castShadow = true;
    minaret.add(corbel);
  }
  const balconyDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.46, 0.22, 16), cutStoneMat);
  balconyDeck.position.y = serefeY + 0.78;
  balconyDeck.castShadow = true;
  minaret.add(balconyDeck);

  // Balcony parapet wall with subtle carved panels
  const parapet = new THREE.Mesh(
    new THREE.CylinderGeometry(1.48, 1.48, 0.92, 16, 1, true),
    cutStoneMat
  );
  parapet.material = cutStoneMat.clone();
  parapet.material.side = THREE.DoubleSide;
  parapet.position.y = serefeY + 1.32;
  parapet.castShadow = true;
  minaret.add(parapet);

  const parapetCap = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.06, 8, 20), cutStoneMat);
  parapetCap.rotation.x = Math.PI / 2;
  parapetCap.position.y = serefeY + 1.78;
  minaret.add(parapetCap);

  // Petek (upper cylindrical brick shaft above şerefe)
  const petekY = serefeY + 0.88;
  const petekH = 2.9;
  const petek = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.82, petekH, 16), cutStoneMat);
  petek.position.y = petekY + petekH / 2;
  petek.castShadow = true;
  minaret.add(petek);

  // Small arched şerefe doorway facing East/South
  addBox(minaret, 0.48, 1.35, 0.2, 0.72, petekY + 0.7, 0, timberMat);

  // Conical minaret cap (külah) & brass alem
  const kulahY = petekY + petekH;
  const kulahH = 2.55;
  const kulah = new THREE.Mesh(new THREE.ConeGeometry(0.84, kulahH, 16), leadCapMat);
  kulah.position.y = kulahY + kulahH / 2;
  kulah.castShadow = true;
  minaret.add(kulah);

  const minAlemY = kulahY + kulahH;
  const minPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 0.9, 8), brassMat);
  minPole.position.y = minAlemY + 0.42;
  minaret.add(minPole);
  const minBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), brassMat);
  minBall.position.y = minAlemY + 0.36;
  minaret.add(minBall);
  const minCrescent = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 14, Math.PI * 1.45), brassMat);
  minCrescent.rotation.z = Math.PI * 0.78;
  minCrescent.position.y = minAlemY + 0.82;
  minaret.add(minCrescent);

  group.add(minaret);

  // =========================================================================
  // 6. NORTH COURTYARD (AVLU), ŞADIRVAN & ALACA MESCİT ÇEŞMESİ
  // Courtyard: x in [-6.7, +6.7], z in [-22.4, -6.6]
  // =========================================================================
  const avluMinZ = -22.4;
  const avluMaxZ = -6.6;
  const avluCenterZ = (avluMinZ + avluMaxZ) / 2;
  const avluDepth = avluMaxZ - avluMinZ;

  // Courtyard stone flagstone paving
  addBox(group, W + 0.4, 0.14, avluDepth, 0, 0.07, avluCenterZ, courtyardFloorMat, false, true);

  // Courtyard perimeter stone walls (East, West, and North with gateway opening)
  const wallH = 2.05;
  const wallT = 0.46;
  // West courtyard wall
  addBox(group, wallT, wallH, avluDepth, -W / 2 + wallT / 2, wallH / 2, avluCenterZ, rubbleMat);
  addBox(group, wallT + 0.1, 0.14, avluDepth + 0.1, -W / 2 + wallT / 2, wallH + 0.07, avluCenterZ, cutStoneMat);
  // East courtyard wall
  addBox(group, wallT, wallH, avluDepth, W / 2 - wallT / 2, wallH / 2, avluCenterZ, rubbleMat);
  addBox(group, wallT + 0.1, 0.14, avluDepth + 0.1, W / 2 - wallT / 2, wallH + 0.07, avluCenterZ, cutStoneMat);

  // North courtyard wall split around arched courtyard gate (gate centered at x = +2.6, width 2.2m)
  // Left segment (from x = -6.65 to x = +1.5 -> width 8.15, center -2.575)
  addBox(group, 8.15, wallH, wallT, -2.575, wallH / 2, avluMinZ, rubbleMat);
  addBox(group, 8.25, 0.14, wallT + 0.1, -2.575, wallH + 0.07, avluMinZ, cutStoneMat);
  // Right segment (from x = +3.7 to x = +6.65 -> width 2.95, center +5.175)
  addBox(group, 2.95, wallH, wallT, 5.175, wallH / 2, avluMinZ, rubbleMat);
  addBox(group, 3.05, 0.14, wallT + 0.1, 5.175, wallH + 0.07, avluMinZ, cutStoneMat);

  // Courtyard Arched Gate (x = +2.6, z = avluMinZ)
  const gateX = 2.6;
  addBox(group, 0.42, 2.6, 0.6, gateX - 1.15, 1.3, avluMinZ, cutStoneMat);
  addBox(group, 0.42, 2.6, 0.6, gateX + 1.15, 1.3, avluMinZ, cutStoneMat);
  addPointedArch(group, gateX, 2.2, avluMinZ, 2.1, 1.05, 0.56);
  // Open wooden gate leaves swung inward cleanly clear of stone piers
  addBox(group, 0.08, 2.0, 0.9, gateX - 0.86, 1.0, avluMinZ + 0.68, timberMat);
  addBox(group, 0.08, 2.0, 0.9, gateX + 0.86, 1.0, avluMinZ + 0.68, timberMat);

  // =========================================================================
  // 6A. ŞADIRVAN INSIDE COURTYARD (x = -1.2, z = -14.8)
  // =========================================================================
  const sadX = -1.2;
  const sadZ = -14.8;
  const sadirvan = new THREE.Group();
  sadirvan.position.set(sadX, 0.14, sadZ);

  // Octagonal stone step & water basin
  const sadStep = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.25, 0.16, 8), cutStoneMat);
  sadStep.position.y = 0.08;
  sadStep.receiveShadow = true;
  sadirvan.add(sadStep);

  const basinWall = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.78, 8), marbleMat);
  basinWall.position.y = 0.48;
  basinWall.castShadow = true;
  sadirvan.add(basinWall);

  const basinWater = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.06, 8), waterMat);
  basinWater.position.y = 0.84;
  sadirvan.add(basinWater);

  // Central stone fountain spout column
  const centerSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.7, 8), marbleMat);
  centerSpout.position.y = 1.08;
  sadirvan.add(centerSpout);

  // 8 timber columns + brass taps + wooden octagonal roof
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * 1.82;
    const pz = Math.sin(a) * 1.82;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 2.55, 8), timberMat);
    post.position.set(px, 1.4, pz);
    post.castShadow = true;
    sadirvan.add(post);

    // Brass tap around basin
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), brassMat);
    tap.rotation.z = Math.PI / 2;
    tap.rotation.y = -a;
    tap.position.set(Math.cos(a) * 1.26, 0.65, Math.sin(a) * 1.26);
    sadirvan.add(tap);
  }
  const sadEaves = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.35, 0.18, 8), timberMat);
  sadEaves.position.y = 2.72;
  sadirvan.add(sadEaves);

  const sadRoof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.45, 8), kiremitMat);
  sadRoof.position.y = 3.52;
  sadRoof.castShadow = true;
  sadirvan.add(sadRoof);

  const sadFinial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), brassMat);
  sadFinial.position.y = 4.32;
  sadirvan.add(sadFinial);

  group.add(sadirvan);

  // =========================================================================
  // 6B. ALACA MESCİT ÇEŞMESİ (North street-facing side of courtyard wall)
  // Built in 1271 (H.670) on the street face of the north courtyard wall
  // =========================================================================
  const cesmeX = -2.4;
  const cesmeZ = avluMinZ - 0.34;
  const cesme = new THREE.Group();
  cesme.position.set(cesmeX, 0, cesmeZ);

  // Cut-stone monument body projecting slightly onto the sidewalk
  addBox(cesme, 2.55, 2.55, 0.56, 0, 1.275, 0, cutStoneMat);
  addBox(cesme, 2.75, 0.2, 0.68, 0, 2.62, -0.04, cutStoneMat);
  // Side pilasters
  addBox(cesme, 0.36, 2.35, 0.22, -1.02, 1.18, -0.26, cutStoneMat);
  addBox(cesme, 0.36, 2.35, 0.22, 1.02, 1.18, -0.26, cutStoneMat);
  // Pointed arch over niche
  addPointedArch(cesme, 0, 1.55, -0.24, 1.65, 0.82, 0.24);
  // Recessed mirror stone (ayna taşı) + rosette boss + bronze water spout (lüle)
  addBox(cesme, 1.55, 1.45, 0.12, 0, 1.12, -0.22, marbleMat);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 12), cutStoneMat);
  boss.rotation.x = Math.PI / 2;
  boss.position.set(0, 0.85, -0.28);
  cesme.add(boss);
  const lule = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.22, 8), brassMat);
  lule.rotation.x = Math.PI / 2;
  lule.position.set(0, 0.85, -0.39);
  cesme.add(lule);
  // Stone water trough (yalak)
  addBox(cesme, 1.56, 0.44, 0.52, 0, 0.22, -0.46, cutStoneMat);
  addBox(cesme, 1.26, 0.08, 0.34, 0, 0.42, -0.46, waterMat, false, false);
  // Clean weathered kitabe tablet frame above arch
  addBox(cesme, 1.38, 0.38, 0.1, 0, 2.18, -0.31, marbleMat);

  group.add(cesme);

  // =========================================================================
  // 7. COLLIDERS & INTERACTABLES (MOSQUE INTERIOR STRICTLY SEALED!)
  // =========================================================================
  // Mosque main body solid collider (strictly prevents entering mosque)
  colliders.push({
    id: 'mosque_body',
    minX: -W / 2 - 0.18,
    maxX: W / 2 + 0.18,
    minY: 0,
    maxY: 12,
    minZ: -6.75,
    maxZ: 6.95,
    enabled: true,
    blocksCamera: true,
    materialTag: 'stone',
  });
  // Minaret base solid collider
  colliders.push({
    id: 'mosque_minaret',
    minX: minX - 1.5,
    maxX: minX + 1.5,
    minY: 0,
    maxY: 20,
    minZ: minZ - 1.5,
    maxZ: minZ + 1.5,
    enabled: true,
    blocksCamera: true,
    materialTag: 'stone',
  });
  // Courtyard West wall
  colliders.push({
    id: 'avlu_wall_west',
    minX: -W / 2,
    maxX: -W / 2 + wallT + 0.1,
    minY: 0,
    maxY: wallH + 0.2,
    minZ: avluMinZ - 0.2,
    maxZ: avluMaxZ,
    enabled: true,
    blocksCamera: true,
    materialTag: 'stone',
  });
  // Courtyard East wall
  colliders.push({
    id: 'avlu_wall_east',
    minX: W / 2 - wallT - 0.1,
    maxX: W / 2,
    minY: 0,
    maxY: wallH + 0.2,
    minZ: avluMinZ - 0.2,
    maxZ: avluMaxZ,
    enabled: true,
    blocksCamera: true,
    materialTag: 'stone',
  });
  // Courtyard North wall (left & right of open gate at x = 1.5..3.7)
  colliders.push({
    id: 'avlu_wall_north_left',
    minX: -W / 2,
    maxX: gateX - 1.15,
    minY: 0,
    maxY: wallH + 0.2,
    minZ: avluMinZ - 0.65,
    maxZ: avluMinZ + 0.35,
    enabled: true,
    blocksCamera: true,
    materialTag: 'stone',
  });
  colliders.push({
    id: 'avlu_wall_north_right',
    minX: gateX + 1.15,
    maxX: W / 2,
    minY: 0,
    maxY: wallH + 0.2,
    minZ: avluMinZ - 0.35,
    maxZ: avluMinZ + 0.35,
    enabled: true,
    blocksCamera: true,
    materialTag: 'stone',
  });
  // Şadırvan collider
  colliders.push({
    id: 'mosque_sadirvan',
    minX: sadX - 1.85,
    maxX: sadX + 1.85,
    minY: 0,
    maxY: 4.2,
    minZ: sadZ - 1.85,
    maxZ: sadZ + 1.85,
    enabled: true,
    blocksCamera: false,
    materialTag: 'stone',
  });

  interactables.push({
    id: 'interact_alaca_cesme',
    label: 'Alaca Mescit Çeşmesi (1271) — Su İç / Can Yenile',
    position: new THREE.Vector3(cesmeX, 1.0, cesmeZ - 1.0),
    radius: 2.3,
    onInteract: onFountainInteract,
  });

  interactables.push({
    id: 'interact_sadirvan',
    label: 'Avlu Şadırvanı — İncele',
    position: new THREE.Vector3(sadX, 1.0, sadZ - 2.3),
    radius: 2.4,
    onInteract: onSadirvanInteract,
  });

  return { group, colliders, interactables };
}
