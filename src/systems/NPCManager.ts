import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { PhysicsManager } from './PhysicsManager';

interface NPCData {
  id: string;
  group: THREE.Group;
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  state: 'walk' | 'idle' | 'flee';
  stateTimer: number;
  target: THREE.Vector3;
  knockVel: THREE.Vector3;
  walkPhase: number;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  hitFlash: number;
}

const WAYPOINTS: [number, number][] = [
  [-5.5, -24.5],
  [2.5, -25.0],
  [12.0, -24.5],
  [25.0, -24.2],
  [33.0, -23.0],
  [34.5, 11.5],
  [20.0, 11.2],
  [5.0, 9.8],
  [-8.8, 7.5],
  [-9.0, -8.5],
  [-9.1, -24.5],
  [2.6, -18.5],
  [2.6, -11.5],
];

const NPC_STYLES = [
  { coat: 0x6b3a2e, pants: 0x262930, skin: 0xdab08c, hair: 0x241d1a, hat: true },
  { coat: 0x3b5c4a, pants: 0x2f2d2a, skin: 0xd2a17c, hair: 0x38281e, hat: false },
  { coat: 0x455873, pants: 0x23262e, skin: 0xe2ba98, hair: 0x1e1a18, hat: false },
  { coat: 0x7d6548, pants: 0x33302c, skin: 0xc99672, hair: 0x5c4f44, hat: true },
  { coat: 0x5c3b52, pants: 0x292b33, skin: 0xddb38e, hair: 0x261d19, hat: false },
  { coat: 0x3c4b52, pants: 0x232529, skin: 0xd4a27d, hair: 0x473628, hat: false },
];

export class NPCManager {
  public readonly group = new THREE.Group();
  private npcs: NPCData[] = [];

  constructor() {
    for (let i = 0; i < 6; i++) {
      const wp = WAYPOINTS[(i * 2) % WAYPOINTS.length];
      const npc = this.createNPC(i, wp[0], wp[1]);
      this.npcs.push(npc);
      this.group.add(npc.group);
    }
  }

  private createNPC(index: number, x: number, z: number): NPCData {
    const style = NPC_STYLES[index % NPC_STYLES.length];
    const g = new THREE.Group();
    const scale = 0.94 + (index % 3) * 0.04;
    g.scale.setScalar(scale);

    const coatMat = new THREE.MeshStandardMaterial({ color: style.coat, roughness: 0.84 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: style.pants, roughness: 0.86 });
    const skinMat = new THREE.MeshStandardMaterial({ color: style.skin, roughness: 0.74 });
    const hairMat = new THREE.MeshStandardMaterial({ color: style.hair, roughness: 0.85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.7 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.56, 10), coatMat);
    torso.scale.set(1.06, 1, 0.76);
    torso.position.y = 1.15;
    torso.castShadow = true;
    g.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.y = 1.56;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), skinMat);
    head.scale.set(0.92, 1.08, 0.96);
    head.castShadow = true;
    headGroup.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat
    );
    hair.position.set(0, 0.02, -0.01);
    headGroup.add(hair);

    if (style.hat) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.08, 12), pantsMat);
      cap.position.y = 0.11;
      headGroup.add(cap);
    }
    g.add(headGroup);

    const makeLimb = (w: number, h: number, mat: THREE.Material, yOff: number, shoe: boolean) => {
      const p = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(w, w * 0.82, h, 8), mat);
      mesh.position.y = yOff;
      mesh.castShadow = true;
      p.add(mesh);
      if (shoe) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.2), shoeMat);
        s.position.set(0, yOff * 2 + 0.04, 0.04);
        p.add(s);
      }
      return p;
    };

    const leftArm = makeLimb(0.052, 0.48, coatMat, -0.22, false);
    leftArm.position.set(-0.24, 1.38, 0);
    g.add(leftArm);

    const rightArm = makeLimb(0.052, 0.48, coatMat, -0.22, false);
    rightArm.position.set(0.24, 1.38, 0);
    g.add(rightArm);

    const leftLeg = makeLimb(0.074, 0.78, pantsMat, -0.39, true);
    leftLeg.position.set(-0.095, 0.84, 0);
    g.add(leftLeg);

    const rightLeg = makeLimb(0.074, 0.78, pantsMat, -0.39, true);
    rightLeg.position.set(0.095, 0.84, 0);
    g.add(rightLeg);

    const nextWp = WAYPOINTS[(index * 2 + 3) % WAYPOINTS.length];
    return {
      id: `npc_${index}`,
      group: g,
      position: new THREE.Vector3(x, 0, z),
      yaw: Math.random() * Math.PI * 2,
      speed: 1.45 + Math.random() * 0.45,
      state: 'walk',
      stateTimer: 4 + Math.random() * 6,
      target: new THREE.Vector3(nextWp[0], 0, nextWp[1]),
      knockVel: new THREE.Vector3(),
      walkPhase: Math.random() * 6,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      headGroup,
      hitFlash: 0,
    };
  }

  private pickNextTarget(npc: NPCData): void {
    const idx = Math.floor(Math.random() * WAYPOINTS.length);
    const [wx, wz] = WAYPOINTS[idx];
    npc.target.set(wx + (Math.random() - 0.5) * 1.6, 0, wz + (Math.random() - 0.5) * 1.6);
  }

  /** Alert nearby NPCs on gunfire */
  alertGunshot(origin: THREE.Vector3, radius: number, audio: AudioManager): void {
    let reacted = false;
    for (const npc of this.npcs) {
      const dist = npc.position.distanceTo(origin);
      if (dist < radius) {
        npc.state = 'flee';
        npc.stateTimer = 5.5 + Math.random() * 2.5;
        if (!reacted) {
          audio.playNpcReact();
          reacted = true;
        }
      }
    }
  }

  /** Check hit against NPCs (melee or bullet) and apply non-graphic knockback */
  checkHit(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
    knockStrength: number,
    audio: AudioManager
  ): THREE.Vector3 | null {
    let bestT = maxDist;
    let hitNpc: NPCData | null = null;

    for (const npc of this.npcs) {
      const center = new THREE.Vector3(npc.position.x, npc.position.y + 1.0, npc.position.z);
      const toNpc = center.clone().sub(origin);
      const proj = toNpc.dot(dir);
      if (proj < 0 || proj > bestT) continue;
      const perpSq = toNpc.lengthSq() - proj * proj;
      if (perpSq < 0.42 * 0.42) {
        bestT = proj;
        hitNpc = npc;
      }
    }

    if (hitNpc) {
      hitNpc.state = 'flee';
      hitNpc.stateTimer = 7.0;
      hitNpc.knockVel.copy(dir).setY(0).normalize().multiplyScalar(knockStrength);
      hitNpc.hitFlash = 0.25;
      audio.playNpcReact();
      return origin.clone().addScaledVector(dir, bestT);
    }
    return null;
  }

  update(dt: number, playerPos: THREE.Vector3, physics: PhysicsManager): void {
    for (const npc of this.npcs) {
      const distToPlayer = npc.position.distanceTo(playerPos);
      // Distance LOD optimization: skip animation/fine steering when far away
      if (distToPlayer > 52) continue;

      // Apply knockback decay
      if (npc.knockVel.lengthSq() > 0.01) {
        const kx = npc.knockVel.x * dt;
        const kz = npc.knockVel.z * dt;
        if (!physics.isBlocked2D(npc.position.x + kx, npc.position.z, 0.36)) npc.position.x += kx;
        if (!physics.isBlocked2D(npc.position.x, npc.position.z + kz, 0.36)) npc.position.z += kz;
        npc.knockVel.multiplyScalar(Math.max(0, 1 - dt * 6.5));
      }

      npc.stateTimer -= dt;
      if (npc.state === 'flee') {
        if (npc.stateTimer <= 0 || distToPlayer > 26) {
          npc.state = 'walk';
          npc.stateTimer = 5 + Math.random() * 5;
          this.pickNextTarget(npc);
        }
      } else if (npc.state === 'idle') {
        npc.headGroup.rotation.y = Math.sin(npc.stateTimer * 1.4) * 0.45;
        if (npc.stateTimer <= 0) {
          npc.state = 'walk';
          npc.stateTimer = 6 + Math.random() * 8;
          this.pickNextTarget(npc);
        }
      } else if (npc.stateTimer <= 0) {
        npc.state = 'idle';
        npc.stateTimer = 2.0 + Math.random() * 2.5;
      }

      let moveSpeed = 0;
      const desiredDir = new THREE.Vector3();

      if (npc.state === 'flee') {
        desiredDir.copy(npc.position).sub(playerPos).setY(0);
        if (desiredDir.lengthSq() < 0.01) desiredDir.set(1, 0, 0);
        desiredDir.normalize();
        moveSpeed = 3.6;
      } else if (npc.state === 'walk') {
        desiredDir.copy(npc.target).sub(npc.position).setY(0);
        if (desiredDir.length() < 1.2) {
          npc.state = 'idle';
          npc.stateTimer = 1.8 + Math.random() * 2.2;
        } else {
          desiredDir.normalize();
          moveSpeed = npc.speed;
        }
      }

      // Separation from other NPCs & Player (prevent walking through each other)
      const sep = new THREE.Vector3();
      for (const other of this.npcs) {
        if (other === npc) continue;
        const d = npc.position.distanceTo(other.position);
        if (d < 1.25 && d > 0.001) {
          sep.addScaledVector(npc.position.clone().sub(other.position).normalize(), (1.25 - d) * 1.8);
        }
      }
      if (distToPlayer < 1.35 && distToPlayer > 0.001) {
        sep.addScaledVector(npc.position.clone().sub(playerPos).setY(0).normalize(), (1.35 - distToPlayer) * 2.0);
      }

      if (moveSpeed > 0) {
        const steer = desiredDir.add(sep).setY(0);
        if (steer.lengthSq() > 0.001) steer.normalize();

        const stepX = steer.x * moveSpeed * dt;
        const stepZ = steer.z * moveSpeed * dt;
        let moved = false;
        if (!physics.isBlocked2D(npc.position.x + stepX, npc.position.z, 0.36)) {
          npc.position.x += stepX;
          moved = true;
        }
        if (!physics.isBlocked2D(npc.position.x, npc.position.z + stepZ, 0.36)) {
          npc.position.z += stepZ;
          moved = true;
        }
        if (!moved) {
          // Steer around obstacle
          this.pickNextTarget(npc);
          npc.yaw += 1.2;
        } else {
          const targetYaw = Math.atan2(steer.x, steer.z);
          let diff = targetYaw - npc.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          npc.yaw += diff * Math.min(1, dt * 8);
        }

        npc.walkPhase += dt * moveSpeed * 4.5;
        const amp = npc.state === 'flee' ? 0.65 : 0.42;
        npc.leftLeg.rotation.x = Math.sin(npc.walkPhase) * amp;
        npc.rightLeg.rotation.x = -Math.sin(npc.walkPhase) * amp;
        npc.leftArm.rotation.x = -Math.sin(npc.walkPhase) * amp * 0.7;
        npc.rightArm.rotation.x = Math.sin(npc.walkPhase) * amp * 0.7;
        npc.headGroup.rotation.y *= 0.85;
      } else {
        npc.leftLeg.rotation.x *= 0.8;
        npc.rightLeg.rotation.x *= 0.8;
        npc.leftArm.rotation.x *= 0.8;
        npc.rightArm.rotation.x *= 0.8;
      }

      npc.group.position.copy(npc.position);
      npc.group.rotation.y = npc.yaw;
    }
  }
}
