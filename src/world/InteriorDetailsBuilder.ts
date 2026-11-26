import * as THREE from 'three';
import { ProceduralPBR } from '../textures/ProceduralPBR';

export interface GamingSetupResult {
  group: THREE.Group;
  chairPivot: THREE.Group;
  monitorScreenMat: THREE.MeshStandardMaterial;
  rgbLight: THREE.PointLight;
  update: (t: number, isPcActive: boolean) => void;
}

export interface AnimatedRoomNPC {
  group: THREE.Group;
  update: (dt: number, elapsed: number) => void;
}

export type MovieNpcStoryMode = 'watching' | 'reacting' | 'attack' | 'chase' | 'angry_idle';

export interface House1MovieNPC extends AnimatedRoomNPC {
  setStoryMode: (
    mode: MovieNpcStoryMode,
    opts?: {
      localPos?: THREE.Vector3;
      yaw?: number;
      moveSpeed?: number;
      attackProgress?: number;
      lookYawOffset?: number;
    }
  ) => void;
  getHeadWorldPosition: (out: THREE.Vector3) => THREE.Vector3;
}

function makeRgbBarTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, '#e8f4ff');
  grad.addColorStop(0.35, '#b8f0ff');
  grad.addColorStop(0.65, '#ff4fc3');
  grad.addColorStop(0.85, '#ff6224');
  grad.addColorStop(1.0, '#ff3518');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMonitorScreenTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 256, 144);
  g.addColorStop(0, '#0f1c33');
  g.addColorStop(0.55, '#1e3c5e');
  g.addColorStop(1, '#4a2248');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 144);
  // Subtle game HUD & stylized skyline graphic on monitor
  ctx.fillStyle = '#e69d35';
  ctx.fillRect(16, 18, 86, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(16, 38, 120, 62);
  ctx.fillStyle = '#53d8fb';
  ctx.fillRect(150, 38, 88, 62);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(48, 126, 160, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Models the exact Gaming PC Setup from the user's reference photo:
 * - White desk with front RGB edge strip, geometric Z/K white steel left leg, 3-drawer white pedestal right
 * - Power brick + hanging cables underneath
 * - Monitor arm + widescreen thin-bezel monitor
 * - Grey deskmat + white compact mechanical keyboard + white wireless mouse
 * - Panoramic tempered-glass white PC case (visible white AIO cooler, tubes, 3 side fans, GeForce-style GPU)
 * - Light-grey/black winged Rampage-style gaming chair with neck & lumbar pillows + 5-wheel base
 * - Ornate Turkish carpet underneath
 */
export function buildGamingSetup(pbr: ProceduralPBR): GamingSetupResult {
  const group = new THREE.Group();
  group.name = 'GamingPCSetup';

  const whiteGlossMat = new THREE.MeshStandardMaterial({ color: 0xf1f2f5, roughness: 0.28, metalness: 0.08 });
  const whiteMetalMat = new THREE.MeshStandardMaterial({ color: 0xe4e6eb, roughness: 0.38, metalness: 0.45 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 0.42, metalness: 0.65 });
  const deskmatMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.88 });
  const chairGreyMat = new THREE.MeshStandardMaterial({ color: 0xb7bcc6, roughness: 0.85 });
  const chairBlackMat = new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.78 });
  const glassCaseMat = new THREE.MeshStandardMaterial({
    color: 0xdff2ff,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.24,
  });
  const rgbTex = makeRgbBarTexture();
  const rgbEdgeMat = new THREE.MeshStandardMaterial({
    map: rgbTex,
    emissiveMap: rgbTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const screenTex = makeMonitorScreenTexture();
  const monitorScreenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissiveMap: screenTex,
    emissive: new THREE.Color(0x88bbff),
    emissiveIntensity: 0.9,
    roughness: 0.18,
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
    castShadow = true
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = castShadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // Turkish ornate patterned carpet beside/under desk & chair
  const carpet = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.018, 2.5),
    new THREE.MeshStandardMaterial({ map: pbr.getKilimRug(), roughness: 0.92 })
  );
  carpet.position.set(0.15, 0.012, 0.95);
  carpet.receiveShadow = true;
  group.add(carpet);

  // --- WHITE RGB GAMING DESK (local origin: desk center X=0, back edge Z=-0.38, front edge Z=+0.38) ---
  const deskW = 1.95;
  const deskD = 0.76;
  const deskH = 0.75;

  // Tabletop + front RGB light strip
  addBox(group, deskW, 0.042, deskD, 0, deskH, 0, whiteGlossMat);
  addBox(group, deskW - 0.02, 0.024, 0.018, 0, deskH, deskD / 2 + 0.005, rgbEdgeMat, false);

  // Left geometric white metal Z/K frame leg
  const legX = -deskW / 2 + 0.09;
  addBox(group, 0.05, 0.05, deskD - 0.08, legX, 0.03, 0, whiteMetalMat); // bottom runner
  addBox(group, 0.05, 0.05, deskD - 0.08, legX, deskH - 0.04, 0, whiteMetalMat); // top runner
  addBox(group, 0.045, deskH - 0.06, 0.05, legX, deskH / 2, -deskD / 2 + 0.1, whiteMetalMat); // rear vertical
  const diagLeg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.82, 0.05), whiteMetalMat);
  diagLeg.position.set(legX, deskH * 0.5, 0.04);
  diagLeg.rotation.x = 0.45;
  group.add(diagLeg);
  const diagStrut = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.035), whiteMetalMat);
  diagStrut.position.set(legX, 0.24, 0.14);
  diagStrut.rotation.x = -0.68;
  group.add(diagStrut);

  // Right 3-drawer white pedestal cabinet (keson)
  const pedW = 0.46;
  const pedH = deskH - 0.04;
  const pedX = deskW / 2 - pedW / 2 - 0.06;
  addBox(group, pedW, pedH, deskD - 0.12, pedX, pedH / 2, -0.02, whiteGlossMat);
  for (const dy of [0.16, 0.37, 0.58]) {
    addBox(group, pedW - 0.04, 0.015, 0.02, pedX, dy, (deskD - 0.12) / 2 - 0.01, darkMetalMat, false);
  }

  // Power brick & hanging cable underneath desk
  addBox(group, 0.18, 0.035, 0.075, -0.15, 0.02, -0.1, darkMetalMat);
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.32, 0.72, -0.25),
    new THREE.Vector3(-0.28, 0.32, -0.22),
    new THREE.Vector3(-0.15, 0.03, -0.1),
    new THREE.Vector3(0.25, 0.26, -0.26),
    new THREE.Vector3(0.55, 0.75, -0.28),
  ]);
  const cableMesh = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 16, 0.008, 6, false), darkMetalMat);
  group.add(cableMesh);

  // --- MONITOR + MONITOR ARM (LEFT-CENTER) ---
  const monX = -0.42;
  const monZ = -0.22;
  // Clamp post + articulated arm
  const clampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.38, 10), darkMetalMat);
  clampPost.position.set(monX - 0.05, deskH + 0.19, -0.32);
  group.add(clampPost);
  addBox(group, 0.04, 0.04, 0.16, monX, deskH + 0.32, -0.25, darkMetalMat);
  // Thin-bezel widescreen monitor
  const monBezel = addBox(group, 0.86, 0.48, 0.028, monX, deskH + 0.35, monZ + 0.05, darkMetalMat);
  monBezel.rotation.y = 0.06;
  const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.83, 0.45), monitorScreenMat);
  monScreen.position.set(monX, deskH + 0.35, monZ + 0.066);
  monScreen.rotation.y = 0.06;
  group.add(monScreen);

  // --- LARGE GREY DESKMAT, WHITE MECHANICAL KEYBOARD & WHITE MOUSE ---
  addBox(group, 1.02, 0.006, 0.44, -0.26, deskH + 0.024, 0.1, deskmatMat, false);
  // White 75% mechanical keyboard
  addBox(group, 0.36, 0.022, 0.14, -0.3, deskH + 0.038, 0.12, whiteGlossMat);
  addBox(group, 0.33, 0.012, 0.11, -0.3, deskH + 0.05, 0.12, whiteMetalMat, false);
  // White wireless mouse
  const mouse = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.045, 4, 8), whiteGlossMat);
  mouse.rotation.x = Math.PI / 2;
  mouse.scale.set(1.1, 1.0, 0.72);
  mouse.position.set(0.04, deskH + 0.038, 0.12);
  group.add(mouse);

  // --- WHITE PANORAMIC TEMPERED-GLASS PC TOWER (RIGHT SIDE OF DESK) ---
  const pcX = 0.62;
  const pcZ = -0.06;
  const pcW = 0.32;
  const pcH = 0.46;
  const pcD = 0.46;
  const pcGroup = new THREE.Group();
  pcGroup.position.set(pcX, deskH + 0.022, pcZ);
  pcGroup.rotation.y = -0.18;

  // Frame rails + white back/top/bottom panels
  addBox(pcGroup, pcW, 0.03, pcD, 0, 0.015, 0, whiteGlossMat);
  addBox(pcGroup, pcW, 0.03, pcD, 0, pcH - 0.015, 0, whiteGlossMat);
  addBox(pcGroup, pcW, pcH, 0.03, 0, pcH / 2, -pcD / 2 + 0.015, whiteGlossMat);
  addBox(pcGroup, 0.025, pcH, pcD, pcW / 2 - 0.012, pcH / 2, 0, whiteGlossMat);

  // Interior white motherboard, GPU, AIO pump + tubes, 3 vertical fans!
  addBox(pcGroup, 0.02, 0.34, 0.32, pcW / 2 - 0.06, pcH / 2, -0.02, whiteMetalMat, false);
  // GeForce-style horizontal GPU
  addBox(pcGroup, 0.14, 0.055, 0.28, 0.02, 0.18, 0.0, darkMetalMat);
  addBox(pcGroup, 0.01, 0.016, 0.12, -0.05, 0.185, 0.01, whiteGlossMat, false);
  // Circular white AIO CPU pump + 2 curved tubes
  const aioPump = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.035, 14), whiteGlossMat);
  aioPump.rotation.z = Math.PI / 2;
  aioPump.position.set(0.07, 0.28, -0.02);
  pcGroup.add(aioPump);
  const tubeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, 0.28, 0.02),
    new THREE.Vector3(-0.02, 0.26, 0.08),
    new THREE.Vector3(0.02, 0.38, 0.14),
  ]);
  pcGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tubeCurve, 10, 0.009, 6, false), whiteGlossMat));
  // 3 vertical side fans
  for (const fy of [0.11, 0.22, 0.33]) {
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.02, 12), whiteMetalMat);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(0.05, fy, 0.15);
    pcGroup.add(fan);
  }
  // Panoramic tempered glass front + left side panels
  addBox(pcGroup, pcW - 0.03, pcH - 0.06, 0.01, 0, pcH / 2, pcD / 2 - 0.008, glassCaseMat, false);
  addBox(pcGroup, 0.01, pcH - 0.06, pcD - 0.03, -pcW / 2 + 0.008, pcH / 2, 0, glassCaseMat, false);
  group.add(pcGroup);

  // Subtle RGB desk ambient light
  const rgbLight = new THREE.PointLight(0xff6b5a, 0.85, 3.2, 1.8);
  rgbLight.position.set(0.35, deskH + 0.18, 0.45);
  group.add(rgbLight);

  // --- LIGHT-GREY & BLACK RAMPAGE-STYLE GAMING CHAIR ---
  const chairPivot = new THREE.Group();
  chairPivot.position.set(0.18, 0, 0.92);
  chairPivot.rotation.y = Math.PI - 0.25; // Facing desk (toward -Z)

  // 5-star black base + 5 caster wheels
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.3), darkMetalMat);
    arm.position.set(Math.sin(a) * 0.14, 0.075, Math.cos(a) * 0.14);
    arm.rotation.y = a;
    chairPivot.add(arm);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.035, 10), darkMetalMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.sin(a) * 0.27, 0.028, Math.cos(a) * 0.27);
    chairPivot.add(wheel);
  }
  const gasLift = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.34, 10), darkMetalMat);
  gasLift.position.y = 0.24;
  chairPivot.add(gasLift);

  // Seat cushion (grey center + black bolsters)
  addBox(chairPivot, 0.46, 0.1, 0.48, 0, 0.44, 0, chairGreyMat);
  addBox(chairPivot, 0.07, 0.12, 0.48, -0.24, 0.46, 0, chairBlackMat);
  addBox(chairPivot, 0.07, 0.12, 0.48, 0.24, 0.46, 0, chairBlackMat);

  // Tall winged backrest (tilted slightly back)
  const backGroup = new THREE.Group();
  backGroup.position.set(0, 0.48, -0.21);
  backGroup.rotation.x = -0.12;
  addBox(backGroup, 0.38, 0.76, 0.08, 0, 0.38, 0, chairGreyMat);
  // Black side wings
  addBox(backGroup, 0.08, 0.68, 0.1, -0.21, 0.36, 0.02, chairBlackMat);
  addBox(backGroup, 0.08, 0.68, 0.1, 0.21, 0.36, 0.02, chairBlackMat);
  // Black lumbar pillow + black neck headrest pillow
  addBox(backGroup, 0.3, 0.18, 0.07, 0, 0.16, 0.06, chairBlackMat);
  addBox(backGroup, 0.26, 0.14, 0.065, 0, 0.68, 0.06, chairBlackMat);
  chairPivot.add(backGroup);

  // T-shaped armrests
  for (const ax of [-0.28, 0.28]) {
    addBox(chairPivot, 0.045, 0.22, 0.05, ax, 0.54, 0, darkMetalMat);
    addBox(chairPivot, 0.08, 0.035, 0.24, ax, 0.66, 0.02, chairBlackMat);
  }
  group.add(chairPivot);

  const update = (t: number, isPcActive: boolean) => {
    monitorScreenMat.emissiveIntensity = isPcActive ? 1.05 + Math.sin(t * 4) * 0.12 : 0.35;
    rgbLight.intensity = isPcActive ? 0.95 + Math.sin(t * 2.4) * 0.15 : 0.45;
  };

  return { group, chairPivot, monitorScreenMat, rgbLight, update };
}

/** Cozy wooden/upholstered bed with mattress, duvet, and two pillows */
export function buildCozyBed(
  frameMat: THREE.Material,
  duvetColor: number,
  pillowColor: number
): THREE.Group {
  const bed = new THREE.Group();
  const sheetMat = new THREE.MeshStandardMaterial({ color: 0xeee7da, roughness: 0.88 });
  const duvetMat = new THREE.MeshStandardMaterial({ color: duvetColor, roughness: 0.88 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: pillowColor, roughness: 0.85 });

  // Frame + headboard (head at local Z = -1.0)
  const addB = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    bed.add(m);
  };
  addB(1.36, 0.96, 0.09, 0, 0.48, -1.02, frameMat); // headboard
  addB(1.36, 0.24, 2.08, 0, 0.22, 0, frameMat); // bed box
  for (const [lx, lz] of [[-0.62, -0.98], [0.62, -0.98], [-0.62, 0.98], [0.62, 0.98]]) {
    addB(0.08, 0.12, 0.08, lx, 0.06, lz, frameMat);
  }
  // Mattress + folded duvet
  addB(1.26, 0.2, 1.98, 0, 0.42, 0, sheetMat);
  addB(1.3, 0.12, 1.38, 0, 0.49, 0.31, duvetMat);
  // Two pillows at headboard
  addB(0.52, 0.12, 0.34, -0.31, 0.56, -0.76, pillowMat);
  addB(0.52, 0.12, 0.34, 0.31, 0.56, -0.76, pillowMat);
  return bed;
}

function makeMoviePhoneTexture(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, tex };
}

/**
 * House 1 (2nd floor) NPC lying comfortably propped against pillows on the bed,
 * gripping a smartphone with both hands and watching a movie while the screen's
 * PointLight illuminates his face, hands, and pillows.
 * Also supports transitioning into an articulated standing/attack/chase rig for the Story Mode cutscene.
 */
export function buildHouse1PhoneWatcherNPC(
  bedX: number,
  bedY: number,
  bedZ: number,
  rotY: number
): House1MovieNPC {
  const rootGroup = new THREE.Group();

  const group = new THREE.Group();
  group.position.set(bedX, bedY, bedZ);
  group.rotation.y = rotY;
  rootGroup.add(group);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfb18c, roughness: 0.62 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x211915, roughness: 0.84 });
  const hoodieMat = new THREE.MeshStandardMaterial({ color: 0x3b4d63, roughness: 0.84 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x252830, roughness: 0.86 });
  const sockMat = new THREE.MeshStandardMaterial({ color: 0xe4dfd4, roughness: 0.9 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 });
  const backrestPillowMat = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.88 });

  // Extra propped bolster pillow behind NPC's upper back so he rests naturally
  const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.32, 0.24), backrestPillowMat);
  bolster.position.set(0, 0.66, -0.62);
  bolster.rotation.x = 0.42;
  bolster.castShadow = true;
  group.add(bolster);

  // Helper to place a limb cylinder cleanly from start point A to end point B
  const connectLimb = (
    parent: THREE.Object3D,
    a: THREE.Vector3,
    b: THREE.Vector3,
    rTop: number,
    rBot: number,
    mat: THREE.Material
  ) => {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 10), mat);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
  };

  // Root articulated pose resting on mattress (mattress top = 0.52, duvet top = 0.55)
  const person = new THREE.Group();

  // Pelvis resting on bed at (0, 0.58, -0.05)
  const hipPos = new THREE.Vector3(0, 0.59, -0.04);
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.16, 12), pantsMat);
  pelvis.scale.set(1.12, 1, 0.78);
  pelvis.rotation.x = -Math.PI / 2;
  pelvis.position.copy(hipPos);
  person.add(pelvis);

  // Relaxed legs slightly bent at knees along the bed toward +Z (foot of bed)
  for (const sx of [-1, 1]) {
    const hip = new THREE.Vector3(sx * 0.095, 0.59, 0.02);
    const knee = new THREE.Vector3(sx * 0.105, 0.65, 0.44);
    const ankle = new THREE.Vector3(sx * 0.1, 0.58, 0.84);
    connectLimb(person, hip, knee, 0.074, 0.062, pantsMat);
    connectLimb(person, knee, ankle, 0.06, 0.046, pantsMat);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.15, 0.065), sockMat);
    foot.position.set(sx * 0.1, 0.62, 0.88);
    foot.rotation.x = -0.25;
    person.add(foot);
  }

  // Torso propped UP and BACK (-Z) against the bolster pillow (~51 deg upright recline)
  const torsoPivot = new THREE.Group();
  torsoPivot.position.copy(hipPos);
  torsoPivot.rotation.x = -0.66;

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.48, 12), hoodieMat);
  chest.scale.set(1.12, 1, 0.72);
  chest.position.set(0, 0.24, 0);
  chest.castShadow = true;
  torsoPivot.add(chest);

  const hoodCollar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 8, 14), hoodieMat);
  hoodCollar.rotation.x = Math.PI / 2;
  hoodCollar.position.set(0, 0.47, -0.02);
  torsoPivot.add(hoodCollar);

  // Neck + Head tilted gently forward looking at the glowing phone
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skinMat);
  neck.position.set(0, 0.53, 0.01);
  torsoPivot.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.66, 0.04);
  headGroup.rotation.x = 0.92; // Net +0.26 rad (~15 deg downward gaze at phone)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.132, 16, 14), skinMat);
  head.scale.set(0.92, 1.06, 0.96);
  head.castShadow = true;
  headGroup.add(head);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.044, 6), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.01, 0.13);
  headGroup.add(nose);
  for (const ex of [-0.042, 0.042]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), eyeMat);
    eye.position.set(ex, 0.022, 0.118);
    headGroup.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.008, 0.012), hairMat);
    brow.position.set(ex, 0.044, 0.12);
    headGroup.add(brow);
  }
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.138, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.46),
    hairMat
  );
  hair.position.set(0, 0.032, -0.018);
  hair.rotation.x = -0.3;
  headGroup.add(hair);
  torsoPivot.add(headGroup);
  person.add(torsoPivot);

  // Smartphone held comfortably in front of eyes/chest, angled toward his face
  const phonePos = new THREE.Vector3(0, 0.94, 0.03);
  const phoneGroup = new THREE.Group();
  phoneGroup.position.copy(phonePos);
  phoneGroup.rotation.x = 0.46;

  const phoneBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.095, 0.014),
    new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.3, metalness: 0.7 })
  );
  phoneGroup.add(phoneBody);

  const movie = makeMoviePhoneTexture();
  const screenMat = new THREE.MeshStandardMaterial({
    map: movie.tex,
    emissiveMap: movie.tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 2.4,
    roughness: 0.1,
  });
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.155, 0.082), screenMat);
  phoneScreen.position.z = -0.008;
  phoneScreen.rotation.y = Math.PI;
  phoneGroup.add(phoneScreen);

  // Real PointLight in front of phone screen illuminating his face cleanly
  const faceLight = new THREE.PointLight(0x7fc4ff, 2.8, 3.0, 1.5);
  faceLight.position.set(0, 0.02, -0.18);
  phoneGroup.add(faceLight);
  person.add(phoneGroup);

  // Exact connected Shoulder -> Elbow -> Hand gripping left & right edges of smartphone
  const sinT = Math.sin(-0.66);
  const cosT = Math.cos(-0.66);
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Vector3(
      sx * 0.2,
      hipPos.y + 0.44 * cosT,
      hipPos.z + 0.44 * sinT
    );
    const elbow = new THREE.Vector3(sx * 0.25, 0.71, -0.09);
    const handPos = new THREE.Vector3(sx * 0.09, phonePos.y - 0.01, phonePos.z);
    connectLimb(person, shoulder, elbow, 0.048, 0.04, hoodieMat);
    connectLimb(person, elbow, handPos, 0.038, 0.032, hoodieMat);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), skinMat);
    hand.position.copy(handPos);
    person.add(hand);
  }

  group.add(person);

  // Dropped smartphone resting on duvet when NPC jumps off the bed
  const droppedPhone = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.016, 0.095),
    new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.3, metalness: 0.7 })
  );
  droppedPhone.position.set(0.12, 0.565, 0.16);
  droppedPhone.rotation.y = 0.38;
  droppedPhone.visible = false;
  group.add(droppedPhone);

  // Articulated standing/chasing rig (same outfit/appearance) used during attack & chase beats
  const actionRig = new THREE.Group();
  actionRig.visible = false;

  const aTorso = new THREE.Group();
  aTorso.position.y = 0.88;
  const aChest = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.52, 12), hoodieMat);
  aChest.scale.set(1.12, 1, 0.74);
  aChest.position.y = 0.27;
  aChest.castShadow = true;
  aTorso.add(aChest);

  const aCollar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 8, 14), hoodieMat);
  aCollar.rotation.x = Math.PI / 2;
  aCollar.position.set(0, 0.51, -0.02);
  aTorso.add(aCollar);

  const aNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10), skinMat);
  aNeck.position.y = 0.57;
  aTorso.add(aNeck);

  const aHeadGroup = new THREE.Group();
  aHeadGroup.position.y = 0.7;
  const aHead = new THREE.Mesh(new THREE.SphereGeometry(0.132, 16, 14), skinMat);
  aHead.scale.set(0.92, 1.06, 0.96);
  aHead.castShadow = true;
  aHeadGroup.add(aHead);

  const aNose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.044, 6), skinMat);
  aNose.rotation.x = Math.PI / 2;
  aNose.position.set(0, -0.01, 0.13);
  aHeadGroup.add(aNose);
  for (const ex of [-0.042, 0.042]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), eyeMat);
    eye.position.set(ex, 0.022, 0.118);
    aHeadGroup.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.01, 0.014), hairMat);
    brow.position.set(ex, 0.042, 0.12);
    brow.rotation.z = ex < 0 ? -0.22 : 0.22; // Angry furrowed brow
    aHeadGroup.add(brow);
  }
  const aHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.138, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.46),
    hairMat
  );
  aHair.position.set(0, 0.032, -0.018);
  aHair.rotation.x = -0.3;
  aHeadGroup.add(aHair);
  aTorso.add(aHeadGroup);

  const makeActionArm = (x: number) => {
    const ap = new THREE.Group();
    ap.position.set(x, 0.48, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.04, 0.48, 10), hoodieMat);
    arm.position.y = -0.22;
    arm.castShadow = true;
    ap.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), skinMat);
    hand.position.y = -0.47;
    ap.add(hand);
    aTorso.add(ap);
    return ap;
  };
  const aLeftArm = makeActionArm(-0.24);
  const aRightArm = makeActionArm(0.24);
  actionRig.add(aTorso);

  const makeActionLeg = (x: number) => {
    const lp = new THREE.Group();
    lp.position.set(x, 0.86, 0);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.052, 0.78, 10), pantsMat);
    leg.position.y = -0.39;
    leg.castShadow = true;
    lp.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.07, 0.19), sockMat);
    shoe.position.set(0, -0.8, 0.035);
    lp.add(shoe);
    actionRig.add(lp);
    return lp;
  };
  const aLeftLeg = makeActionLeg(-0.095);
  const aRightLeg = makeActionLeg(0.095);
  rootGroup.add(actionRig);

  let mode: MovieNpcStoryMode = 'watching';
  let actionMoveSpeed = 0;
  let attackProgress = 0;
  let lookYawOffset = 0;
  let chaseCycle = 0;

  const setStoryMode: House1MovieNPC['setStoryMode'] = (nextMode, opts) => {
    mode = nextMode;
    actionMoveSpeed = opts?.moveSpeed ?? 0;
    attackProgress = opts?.attackProgress ?? 0;
    lookYawOffset = opts?.lookYawOffset ?? 0;

    const onBed = mode === 'watching' || mode === 'reacting';
    person.visible = onBed;
    droppedPhone.visible = !onBed;
    actionRig.visible = !onBed;

    if (!onBed && opts?.localPos) {
      actionRig.position.copy(opts.localPos);
    }
    if (!onBed && opts?.yaw !== undefined) {
      actionRig.rotation.y = opts.yaw;
    }
  };

  const getHeadWorldPosition: House1MovieNPC['getHeadWorldPosition'] = (out) => {
    if (mode === 'watching' || mode === 'reacting') {
      headGroup.getWorldPosition(out);
    } else {
      aHeadGroup.getWorldPosition(out);
    }
    out.y += 0.28;
    return out;
  };

  let frameTick = 0;
  const update = (dt: number, elapsed: number) => {
    frameTick += dt;
    if (frameTick >= 0.1) {
      frameTick = 0;
      const hue = (elapsed * 32) % 360;
      const g = movie.ctx.createLinearGradient(0, 0, 96, 64);
      g.addColorStop(0, `hsl(${hue}, 78%, 55%)`);
      g.addColorStop(0.5, `hsl(${(hue + 45) % 360}, 70%, 62%)`);
      g.addColorStop(1, `hsl(${(hue + 160) % 360}, 65%, 40%)`);
      movie.ctx.fillStyle = g;
      movie.ctx.fillRect(0, 0, 96, 64);
      movie.ctx.fillStyle = '#080a0e';
      movie.ctx.fillRect(0, 0, 96, 8);
      movie.ctx.fillRect(0, 56, 96, 8);
      movie.ctx.fillStyle = 'rgba(255,255,255,0.68)';
      movie.ctx.beginPath();
      movie.ctx.arc(48 + Math.sin(elapsed * 2.5) * 24, 32, 10, 0, Math.PI * 2);
      movie.ctx.fill();
      movie.tex.needsUpdate = true;

      faceLight.color.setHSL(hue / 360, 0.65, 0.72);
      faceLight.intensity = mode === 'watching' ? 2.2 + Math.sin(elapsed * 7.5) * 0.45 : 0.9;
    }

    if (mode === 'watching') {
      headGroup.rotation.x = 0.92;
      headGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.05;
    } else if (mode === 'reacting') {
      headGroup.rotation.x = 0.48;
      headGroup.rotation.y = lookYawOffset;
    } else if (mode === 'attack') {
      const swing = Math.sin(attackProgress * Math.PI);
      aTorso.rotation.x = 0.24 * swing;
      aRightArm.rotation.x = -0.4 - swing * 1.45;
      aRightArm.rotation.z = -0.25 * swing;
      aLeftArm.rotation.x = -0.55;
      aLeftLeg.rotation.x = 0.18;
      aRightLeg.rotation.x = -0.22;
    } else if (mode === 'chase') {
      chaseCycle += dt * Math.max(3, actionMoveSpeed * 2.4);
      const amp = 0.68;
      aTorso.rotation.x = 0.14;
      aLeftLeg.rotation.x = Math.sin(chaseCycle) * amp;
      aRightLeg.rotation.x = -Math.sin(chaseCycle) * amp;
      aLeftArm.rotation.x = -Math.sin(chaseCycle) * amp * 0.85;
      aRightArm.rotation.x = -0.75 + Math.sin(chaseCycle) * amp * 0.5;
      aRightArm.rotation.z = 0;
    } else if (mode === 'angry_idle') {
      aTorso.rotation.x = 0.06;
      aLeftLeg.rotation.x *= 0.85;
      aRightLeg.rotation.x *= 0.85;
      aRightArm.rotation.x = -1.65 + Math.sin(elapsed * 13) * 0.48;
      aLeftArm.rotation.x = -0.85 + Math.cos(elapsed * 9.5) * 0.28;
      aRightArm.rotation.z = 0;
    }
  };

  return { group: rootGroup, update, setStoryMode, getHeadWorldPosition };
}

/**
 * House 2 (2nd floor) Handsome NPC who lies on the bed, gets up, walks over to
 * the white RGB gaming PC setup, sits down to game, and cycles naturally.
 */
export function buildHouse2HandsomePCNPC(
  bedLocalPos: THREE.Vector3,
  pcSeatLocalPos: THREE.Vector3,
  pcFacingYaw: number
): { npc: AnimatedRoomNPC; isUsingPc: () => boolean } {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0b592, roughness: 0.68 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1d1815, roughness: 0.78 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x2d4238, roughness: 0.76 });
  const teeMat = new THREE.MeshStandardMaterial({ color: 0xf0ece3, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e222a, roughness: 0.84 });
  const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xe6e4de, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x23303d, roughness: 0.25 });

  // Articulated rig
  const rootPivot = new THREE.Group();
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.88;

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.165, 0.54, 12), jacketMat);
  chest.scale.set(1.12, 1, 0.74);
  chest.position.y = 0.28;
  chest.castShadow = true;
  torsoPivot.add(chest);

  // Crisp white crewneck inner tee
  const tee = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.14, 10), teeMat);
  tee.position.set(0, 0.52, 0.03);
  torsoPivot.add(tee);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.72;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.132, 16, 14), skinMat);
  head.scale.set(0.9, 1.08, 0.96);
  head.castShadow = true;
  headGroup.add(head);

  // Facial features & styled swept hair (quiff)
  for (const ex of [-0.042, 0.042]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), eyeMat);
    eye.position.set(ex, 0.02, 0.116);
    headGroup.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.009, 0.012), hairMat);
    brow.position.set(ex, 0.044, 0.12);
    headGroup.add(brow);
  }
  // Sleek styled swept-back hair (natural volume blended cleanly into crown)
  const hairBase = new THREE.Mesh(
    new THREE.SphereGeometry(0.136, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hairBase.scale.set(0.95, 1.08, 1.03);
  hairBase.position.set(0, 0.022, -0.012);
  hairBase.rotation.x = -0.24;
  headGroup.add(hairBase);
  const frontWave = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.042, 0.12), hairMat);
  frontWave.position.set(0, 0.11, 0.042);
  frontWave.rotation.x = -0.18;
  headGroup.add(frontWave);
  torsoPivot.add(headGroup);

  const makeArm = (x: number) => {
    const ap = new THREE.Group();
    ap.position.set(x, 0.5, 0);
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.48, 8), jacketMat);
    armMesh.position.y = -0.22;
    armMesh.castShadow = true;
    ap.add(armMesh);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 8), skinMat);
    hand.position.y = -0.47;
    ap.add(hand);
    torsoPivot.add(ap);
    return ap;
  };
  const leftArm = makeArm(-0.26);
  const rightArm = makeArm(0.26);
  rootPivot.add(torsoPivot);

  const makeLeg = (x: number) => {
    const lp = new THREE.Group();
    lp.position.set(x, 0.86, 0);
    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.054, 0.78, 10), pantsMat);
    legMesh.position.y = -0.39;
    legMesh.castShadow = true;
    lp.add(legMesh);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.075, 0.21), sneakerMat);
    shoe.position.set(0, -0.8, 0.04);
    lp.add(shoe);
    rootPivot.add(lp);
    return lp;
  };
  const leftLeg = makeLeg(-0.1);
  const rightLeg = makeLeg(0.1);
  group.add(rootPivot);

  // State machine: lie_on_bed -> walk_to_pc -> use_pc -> walk_to_bed
  type State = 'lie_on_bed' | 'walk_to_pc' | 'use_pc' | 'walk_to_bed';
  let state: State = 'lie_on_bed';
  let timer = 2.2;
  const standBedSide = new THREE.Vector3(bedLocalPos.x + 1.05, bedLocalPos.y, bedLocalPos.z);
  const pos = bedLocalPos.clone();
  let yaw = 0;
  let walkCycle = 0;

  const update = (dt: number, elapsed: number) => {
    timer -= dt;

    if (state === 'lie_on_bed') {
      // Lying head-on-pillows (-Z), feet toward foot of bed (+Z), resting cleanly on top of duvet
      pos.set(bedLocalPos.x, bedLocalPos.y + 0.56, bedLocalPos.z + 0.88);
      group.position.copy(pos);
      group.rotation.set(0, 0, 0);
      rootPivot.rotation.set(-Math.PI / 2, 0, 0);
      rootPivot.position.set(0, 0.15, 0);
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.x = -0.1;
      rightArm.rotation.x = -0.1;
      headGroup.rotation.x = 0.22 + Math.sin(elapsed * 1.4) * 0.03;

      if (timer <= 0) {
        state = 'walk_to_pc';
        pos.copy(standBedSide);
        rootPivot.rotation.set(0, 0, 0);
        rootPivot.position.set(0, 0, 0);
        headGroup.rotation.x = 0;
      }
    } else if (state === 'walk_to_pc') {
      const target = new THREE.Vector3(pcSeatLocalPos.x + 0.65, pcSeatLocalPos.y, pcSeatLocalPos.z + 0.35);
      const dir = target.clone().sub(pos).setY(0);
      const dist = dir.length();
      if (dist < 0.16) {
        state = 'use_pc';
        timer = 7.5;
      } else {
        dir.normalize();
        pos.addScaledVector(dir, 1.35 * dt);
        yaw = Math.atan2(dir.x, dir.z);
        walkCycle += dt * 7.5;
        leftLeg.rotation.x = Math.sin(walkCycle) * 0.48;
        rightLeg.rotation.x = -Math.sin(walkCycle) * 0.48;
        leftArm.rotation.x = -Math.sin(walkCycle) * 0.38;
        rightArm.rotation.x = Math.sin(walkCycle) * 0.38;
      }
      group.position.copy(pos);
      group.rotation.y = yaw;
    } else if (state === 'use_pc') {
      // Sitting cleanly on the gaming chair facing the monitor!
      pos.set(pcSeatLocalPos.x, pcSeatLocalPos.y, pcSeatLocalPos.z);
      group.position.copy(pos);
      group.rotation.y = pcFacingYaw;
      rootPivot.rotation.set(0, 0, 0);
      rootPivot.position.set(0, -0.36, 0);
      leftLeg.rotation.x = -Math.PI * 0.48;
      rightLeg.rotation.x = -Math.PI * 0.48;
      // Arms raised forward onto keyboard & mouse with micro typing/mouse motion!
      leftArm.rotation.x = -Math.PI * 0.38 + Math.sin(elapsed * 11) * 0.04;
      rightArm.rotation.x = -Math.PI * 0.38 + Math.cos(elapsed * 5.5) * 0.05;
      headGroup.rotation.x = 0.06;
      headGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.05;

      if (timer <= 0) {
        state = 'walk_to_bed';
        pos.set(pcSeatLocalPos.x + 0.65, pcSeatLocalPos.y, pcSeatLocalPos.z + 0.35);
        rootPivot.position.set(0, 0, 0);
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
      }
    } else if (state === 'walk_to_bed') {
      const dir = standBedSide.clone().sub(pos).setY(0);
      const dist = dir.length();
      if (dist < 0.16) {
        state = 'lie_on_bed';
        timer = 5.5;
      } else {
        dir.normalize();
        pos.addScaledVector(dir, 1.35 * dt);
        yaw = Math.atan2(dir.x, dir.z);
        walkCycle += dt * 7.5;
        leftLeg.rotation.x = Math.sin(walkCycle) * 0.48;
        rightLeg.rotation.x = -Math.sin(walkCycle) * 0.48;
        leftArm.rotation.x = -Math.sin(walkCycle) * 0.38;
        rightArm.rotation.x = Math.sin(walkCycle) * 0.38;
      }
      group.position.copy(pos);
      group.rotation.y = yaw;
    }
  };

  return {
    npc: { group, update },
    isUsingPc: () => state === 'use_pc',
  };
}
