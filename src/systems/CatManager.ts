import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { PhysicsManager } from './PhysicsManager';

type CatState = 'walk' | 'idle' | 'sit' | 'groom' | 'flee' | 'approach';

interface CatData {
  id: string;
  personality: 'friendly' | 'shy' | 'calm';
  group: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  tailSegments: THREE.Group[];
  legFL: THREE.Group;
  legFR: THREE.Group;
  legBL: THREE.Group;
  legBR: THREE.Group;
  position: THREE.Vector3;
  yaw: number;
  state: CatState;
  stateTimer: number;
  target: THREE.Vector3;
  walkPhase: number;
  meowCooldown: number;
}

const CAT_CONFIGS: {
  x: number;
  z: number;
  fur: number;
  belly: number;
  accent: number;
  personality: 'friendly' | 'shy' | 'calm';
}[] = [
  // Friendly orange tabby near Alaca Çeşme & Mosque courtyard gate
  { x: 0.4, z: -21.2, fur: 0xd9843b, belly: 0xf4dec1, accent: 0x9b4d18, personality: 'friendly' },
  // Shy tuxedo black-and-white cat near House 1 stoop
  { x: 10.6, z: -10.8, fur: 0x26282e, belly: 0xf2efe9, accent: 0x16171a, personality: 'shy' },
  // Calm Anatolian grey/cream tabby near West alley & House 2 plaza
  { x: -7.5, z: -14.0, fur: 0x8d8882, belly: 0xe9e2d5, accent: 0x57524d, personality: 'calm' },
];

export class CatManager {
  public readonly group = new THREE.Group();
  private cats: CatData[] = [];

  constructor() {
    CAT_CONFIGS.forEach((cfg, idx) => {
      const cat = this.buildCat(idx, cfg);
      this.cats.push(cat);
      this.group.add(cat.group);
    });
  }

  /**
   * Builds a sculpted, four-legged articulated cat (not a box or capsule):
   * tapered ribcage + haunches, neck, sculpted head, triangular ears with pink inner pinnae,
   * muzzle, nose, eyes, 4 multi-jointed paws/legs, and a 3-segment curved tail.
   */
  private buildCat(
    idx: number,
    cfg: (typeof CAT_CONFIGS)[number]
  ): CatData {
    const g = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({ color: cfg.fur, roughness: 0.85 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: cfg.belly, roughness: 0.88 });
    const accentMat = new THREE.MeshStandardMaterial({ color: cfg.accent, roughness: 0.86 });
    const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xd99b9b, roughness: 0.75 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x87b842, roughness: 0.25, metalness: 0.1 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xc97378, roughness: 0.6 });

    const bodyPivot = new THREE.Group();
    bodyPivot.position.y = 0.22;

    // Sculpted ribcage & torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.26, 6, 12), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(0.88, 1.0, 1.05);
    torso.castShadow = true;
    bodyPivot.add(torso);

    // Soft belly & chest bib
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), bellyMat);
    chest.position.set(0, -0.02, 0.12);
    chest.scale.set(0.84, 0.9, 1.0);
    bodyPivot.add(chest);

    // Muscular haunches
    const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), furMat);
    haunch.position.set(0, 0.01, -0.13);
    haunch.scale.set(0.9, 0.96, 1.1);
    haunch.castShadow = true;
    bodyPivot.add(haunch);

    // Back stripe accent
    const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 4, 8), accentMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, 0.068, -0.02);
    bodyPivot.add(stripe);

    // Neck & Head Pivot
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.09, 0.18);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.1, 8), furMat);
    neck.rotation.x = 0.35;
    neck.position.set(0, 0.01, 0.02);
    headPivot.add(neck);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.086, 12, 10), furMat);
    skull.position.set(0, 0.06, 0.06);
    skull.scale.set(1.04, 0.95, 1.02);
    skull.castShadow = true;
    headPivot.add(skull);

    // Muzzle + nose + eyes
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), bellyMat);
    muzzle.position.set(0, 0.036, 0.132);
    muzzle.scale.set(1.1, 0.85, 0.9);
    headPivot.add(muzzle);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), noseMat);
    nose.position.set(0, 0.048, 0.166);
    headPivot.add(nose);

    for (const ex of [-0.036, 0.036]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), eyeMat);
      eye.position.set(ex, 0.072, 0.132);
      headPivot.add(eye);
    }

    // Triangular ears with inner pink pinnae
    for (const ex of [-0.054, 0.054]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.072, 4), furMat);
      ear.position.set(ex, 0.14, 0.055);
      ear.rotation.y = Math.PI / 4;
      ear.rotation.z = ex < 0 ? 0.22 : -0.22;
      headPivot.add(ear);

      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.045, 4), earInnerMat);
      inner.position.set(ex, 0.135, 0.068);
      inner.rotation.y = Math.PI / 4;
      inner.rotation.z = ex < 0 ? 0.22 : -0.22;
      headPivot.add(inner);
    }
    bodyPivot.add(headPivot);

    // Articulated 3-segment curving tail
    const tailSegments: THREE.Group[] = [];
    let parentTail: THREE.Object3D = bodyPivot;
    for (let s = 0; s < 3; s++) {
      const segPivot = new THREE.Group();
      if (s === 0) segPivot.position.set(0, 0.05, -0.21);
      else segPivot.position.set(0, 0.11, 0);
      const segMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018 - s * 0.003, 0.022 - s * 0.003, 0.12, 8),
        s === 2 ? bellyMat : furMat
      );
      segMesh.position.y = 0.055;
      segPivot.add(segMesh);
      parentTail.add(segPivot);
      tailSegments.push(segPivot);
      parentTail = segPivot;
    }

    // 4 sculpted legs with white-tipped paws
    const makeLeg = (x: number, z: number) => {
      const lp = new THREE.Group();
      lp.position.set(x, 0.2, z);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.12, 8), furMat);
      upper.position.y = -0.05;
      upper.castShadow = true;
      lp.add(upper);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.019, 0.1, 8), furMat);
      lower.position.y = -0.14;
      lp.add(lower);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), bellyMat);
      paw.scale.set(1.0, 0.7, 1.3);
      paw.position.set(0, -0.19, 0.012);
      lp.add(paw);
      g.add(lp);
      return lp;
    };

    const legFL = makeLeg(-0.055, 0.13);
    const legFR = makeLeg(0.055, 0.13);
    const legBL = makeLeg(-0.058, -0.13);
    const legBR = makeLeg(0.058, -0.13);

    g.add(bodyPivot);
    g.position.set(cfg.x, 0, cfg.z);

    return {
      id: `cat_${idx}`,
      personality: cfg.personality,
      group: g,
      bodyPivot,
      headPivot,
      tailSegments,
      legFL,
      legFR,
      legBL,
      legBR,
      position: new THREE.Vector3(cfg.x, 0, cfg.z),
      yaw: Math.random() * Math.PI * 2,
      state: idx === 0 ? 'sit' : 'walk',
      stateTimer: 3 + idx * 1.5,
      target: new THREE.Vector3(cfg.x + 3, 0, cfg.z - 2),
      walkPhase: idx * 2,
      meowCooldown: 2,
    };
  }

  private pickWanderTarget(cat: CatData): void {
    const home = CAT_CONFIGS[Number(cat.id.split('_')[1])];
    cat.target.set(
      home.x + (Math.random() - 0.5) * 9,
      0,
      home.z + (Math.random() - 0.5) * 9
    );
  }

  scareNearby(origin: THREE.Vector3, radius: number, audio: AudioManager): void {
    for (const cat of this.cats) {
      if (cat.position.distanceTo(origin) < radius) {
        cat.state = 'flee';
        cat.stateTimer = 4.5;
        if (cat.meowCooldown <= 0) {
          audio.playCatMeow();
          cat.meowCooldown = 3.0;
        }
      }
    }
  }

  update(dt: number, playerPos: THREE.Vector3, playerSprinting: boolean, physics: PhysicsManager, audio: AudioManager): void {
    for (const cat of this.cats) {
      const dist = cat.position.distanceTo(playerPos);
      if (dist > 45) continue;

      cat.meowCooldown = Math.max(0, cat.meowCooldown - dt);
      cat.stateTimer -= dt;

      // Player proximity reactions
      if (dist < 4.5 && cat.state !== 'flee') {
        if (cat.personality === 'shy' || playerSprinting) {
          cat.state = 'flee';
          cat.stateTimer = 3.8;
          if (cat.meowCooldown <= 0) {
            audio.playCatMeow();
            cat.meowCooldown = 4.0;
          }
        } else if (cat.personality === 'friendly' && dist > 1.4 && dist < 4.5) {
          cat.state = 'approach';
          cat.stateTimer = 3.0;
          if (cat.meowCooldown <= 0) {
            audio.playCatMeow();
            cat.meowCooldown = 6.0;
          }
        }
      }

      if (cat.stateTimer <= 0) {
        const r = Math.random();
        if (r < 0.42) {
          cat.state = 'walk';
          cat.stateTimer = 3.5 + Math.random() * 4;
          this.pickWanderTarget(cat);
        } else if (r < 0.7) {
          cat.state = 'sit';
          cat.stateTimer = 3.0 + Math.random() * 3.5;
        } else if (r < 0.9) {
          cat.state = 'groom';
          cat.stateTimer = 2.8 + Math.random() * 2.0;
        } else {
          cat.state = 'idle';
          cat.stateTimer = 2.0 + Math.random() * 2.0;
        }
      }

      // Locomotion
      let speed = 0;
      const moveDir = new THREE.Vector3();
      if (cat.state === 'flee') {
        moveDir.copy(cat.position).sub(playerPos).setY(0).normalize();
        speed = 4.1;
      } else if (cat.state === 'approach') {
        if (dist > 1.35) {
          moveDir.copy(playerPos).sub(cat.position).setY(0).normalize();
          speed = 1.6;
        } else {
          cat.state = 'sit';
          cat.stateTimer = 3.5;
        }
      } else if (cat.state === 'walk') {
        moveDir.copy(cat.target).sub(cat.position).setY(0);
        if (moveDir.length() < 0.5) {
          cat.state = 'sit';
          cat.stateTimer = 3.0;
        } else {
          moveDir.normalize();
          speed = 1.25;
        }
      }

      if (speed > 0) {
        const sx = moveDir.x * speed * dt;
        const sz = moveDir.z * speed * dt;
        let moved = false;
        if (!physics.isBlocked2D(cat.position.x + sx, cat.position.z, 0.24)) {
          cat.position.x += sx;
          moved = true;
        }
        if (!physics.isBlocked2D(cat.position.x, cat.position.z + sz, 0.24)) {
          cat.position.z += sz;
          moved = true;
        }
        if (!moved) {
          this.pickWanderTarget(cat);
        }

        const targetYaw = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetYaw - cat.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cat.yaw += diff * Math.min(1, dt * 10);

        cat.walkPhase += dt * speed * 6.5;
        const amp = cat.state === 'flee' ? 0.6 : 0.4;
        cat.legFL.rotation.x = Math.sin(cat.walkPhase) * amp;
        cat.legBR.rotation.x = Math.sin(cat.walkPhase) * amp;
        cat.legFR.rotation.x = -Math.sin(cat.walkPhase) * amp;
        cat.legBL.rotation.x = -Math.sin(cat.walkPhase) * amp;
        cat.bodyPivot.position.y = 0.22 + Math.abs(Math.sin(cat.walkPhase)) * 0.015;
        cat.bodyPivot.rotation.x = 0;
        cat.headPivot.rotation.set(0, 0, 0);
      } else if (cat.state === 'sit' || cat.state === 'groom') {
        // Sit posture: pitch body slightly upward, fold back legs
        cat.bodyPivot.position.y = 0.17;
        cat.bodyPivot.rotation.x = -0.32;
        cat.legFL.rotation.x = 0.28;
        cat.legFR.rotation.x = 0.28;
        cat.legBL.rotation.x = -0.75;
        cat.legBR.rotation.x = -0.75;

        if (cat.state === 'groom') {
          // Raise right front paw & nod head to simulate grooming!
          const gCycle = Math.sin(cat.stateTimer * 7.5);
          cat.legFR.rotation.x = -0.95 + gCycle * 0.2;
          cat.headPivot.rotation.x = 0.45 + gCycle * 0.18;
          cat.headPivot.rotation.y = -0.25;
        } else {
          cat.headPivot.rotation.x = 0.24;
          cat.headPivot.rotation.y = Math.sin(cat.stateTimer * 1.1) * 0.25;
        }
      } else {
        cat.bodyPivot.position.y = 0.22;
        cat.bodyPivot.rotation.x = 0;
        cat.legFL.rotation.x = 0;
        cat.legFR.rotation.x = 0;
        cat.legBL.rotation.x = 0;
        cat.legBR.rotation.x = 0;
        cat.headPivot.rotation.set(0, Math.sin(cat.stateTimer * 1.5) * 0.2, 0);
      }

      // Gentle expressive tail sway
      const tNow = performance.now() * 0.003;
      cat.tailSegments.forEach((seg, idx) => {
        seg.rotation.z = Math.sin(tNow + idx * 0.7) * 0.18;
        seg.rotation.x = idx === 0 ? -0.65 : -0.35;
      });

      cat.group.position.copy(cat.position);
      cat.group.rotation.y = cat.yaw;
    }
  }
}
