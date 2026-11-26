import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { PhysicsManager } from './PhysicsManager';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { WeaponId } from '../types/game';

/**
 * Stylized realistic articulated third-person player character.
 * Supports walk, sprint, jump, stair traversal, House 1 indoor detection, and weapon poses.
 */
export class PlayerController {
  public readonly group = new THREE.Group();
  public readonly position = new THREE.Vector3(0.5, 0, -25.2); // North of courtyard facing mosque & first two houses!
  public readonly rightHandSocket = new THREE.Group();
  public health = 100;
  public readonly maxHealth = 100;
  public grounded = true;
  public isIndoors = false;
  public indoorHouseName: string | null = null;
  public isSprinting = false;

  private velY = 0;
  private yaw = 0;
  private walkCycle = 0;
  private stepTimer = 0;
  private attackAnimTimer = 0;
  private activeWeapon: WeaponId = 'fist';

  // Articulated limb pivots
  private leftLegPivot = new THREE.Group();
  private rightLegPivot = new THREE.Group();
  private leftArmPivot = new THREE.Group();
  private rightArmPivot = new THREE.Group();
  private torsoGroup = new THREE.Group();

  constructor() {
    this.buildCharacterMesh();
    this.group.position.copy(this.position);
  }

  private buildCharacterMesh(): void {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a886, roughness: 0.72 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x221b18, roughness: 0.85 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x2c3e55, roughness: 0.78 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.85 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x282b33, roughness: 0.84 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1b1918, roughness: 0.65 });

    // Torso (waist up)
    this.torsoGroup.position.y = 0.9;
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.18, 10), pantsMat);
    pelvis.position.y = 0.02;
    this.torsoGroup.add(pelvis);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.5, 10), jacketMat);
    chest.scale.set(1.08, 1, 0.74);
    chest.position.y = 0.32;
    chest.castShadow = true;
    this.torsoGroup.add(chest);

    const shirtCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 10), shirtMat);
    shirtCollar.position.set(0, 0.54, 0.04);
    this.torsoGroup.add(shirtCollar);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skinMat);
    neck.position.y = 0.62;
    this.torsoGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), skinMat);
    head.scale.set(0.92, 1.08, 0.96);
    head.position.y = 0.76;
    head.castShadow = true;
    this.torsoGroup.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.146, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
    hair.position.set(0, 0.78, -0.015);
    hair.rotation.x = -0.18;
    this.torsoGroup.add(hair);

    // Left Arm
    this.leftArmPivot.position.set(-0.26, 0.51, 0);
    const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.48, 8), jacketMat);
    lUpper.position.y = -0.22;
    lUpper.castShadow = true;
    this.leftArmPivot.add(lUpper);
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat);
    lHand.position.y = -0.49;
    this.leftArmPivot.add(lHand);
    this.torsoGroup.add(this.leftArmPivot);

    // Right Arm (holds weapon socket)
    this.rightArmPivot.position.set(0.26, 0.51, 0);
    const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.48, 8), jacketMat);
    rUpper.position.y = -0.22;
    rUpper.castShadow = true;
    this.rightArmPivot.add(rUpper);
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat);
    rHand.position.y = -0.49;
    this.rightArmPivot.add(rHand);
    this.rightHandSocket.position.set(0, -0.49, 0.05);
    this.rightArmPivot.add(this.rightHandSocket);
    this.torsoGroup.add(this.rightArmPivot);

    this.group.add(this.torsoGroup);

    // Legs
    const buildLeg = (pivot: THREE.Group, sideX: number) => {
      pivot.position.set(sideX, 0.84, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.068, 0.42, 8), pantsMat);
      thigh.position.y = -0.2;
      thigh.castShadow = true;
      pivot.add(thigh);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.052, 0.4, 8), pantsMat);
      shin.position.y = -0.6;
      shin.castShadow = true;
      pivot.add(shin);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.22), shoeMat);
      shoe.position.set(0, -0.8, 0.04);
      shoe.castShadow = true;
      pivot.add(shoe);
      this.group.add(pivot);
    };
    buildLeg(this.leftLegPivot, -0.1);
    buildLeg(this.rightLegPivot, 0.1);
  }

  setActiveWeapon(w: WeaponId): void {
    this.activeWeapon = w;
  }

  triggerAttackAnim(): void {
    this.attackAnimTimer = 0.26;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  resetSpawn(): void {
    this.position.set(0.5, 0, -25.2);
    this.velY = 0;
    this.yaw = 0;
    this.health = this.maxHealth;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }

  update(
    dt: number,
    input: InputManager,
    cam: ThirdPersonCamera,
    physics: PhysicsManager,
    audio: AudioManager
  ): void {
    const move = input.getMoveAxes();
    const moving = Math.hypot(move.x, move.y) > 0.08;
    this.isSprinting = moving && input.isSprinting();

    const forward = cam.getForwardXZ();
    const right = cam.getRightXZ();
    const wishDir = new THREE.Vector3()
      .addScaledVector(forward, move.y)
      .addScaledVector(right, move.x);

    if (wishDir.lengthSq() > 0.001) {
      wishDir.normalize();
    }

    const speed = this.isSprinting ? 6.8 : 3.9;
    const dx = wishDir.x * speed * dt;
    const dz = wishDir.z * speed * dt;

    if (input.consumeJump() && this.grounded) {
      this.velY = 7.4;
      this.grounded = false;
    }

    const res = physics.moveCharacter(this.position, this.velY, dx, dz, dt);
    this.grounded = res.grounded;
    this.velY = res.velY;

    // House 1 (x: 9.5..18.5, z: -8.9..0.9) and House 2 (x: 21.1..29.3, z: -9.4..1.0) interior check
    const inH1 =
      this.position.x > 9.5 &&
      this.position.x < 18.5 &&
      this.position.z > -8.9 &&
      this.position.z < 0.9;
    const inH2 =
      this.position.x > 21.1 &&
      this.position.x < 29.3 &&
      this.position.z > -9.4 &&
      this.position.z < 1.0;
    this.isIndoors = inH1 || inH2;
    this.indoorHouseName = inH1 ? 'Ev 1 İç Mekân • Tokat Konutu' : inH2 ? 'Ev 2 İç Mekân • Oyun Odası' : null;
    audio.setIndoors(this.isIndoors);

    // Character orientation: face camera yaw when aiming firearm, else face movement direction
    const usingGun = this.activeWeapon === 'pistol' || this.activeWeapon === 'smg';
    let targetYaw = this.yaw;
    if (usingGun && input.isAttackHeld()) {
      targetYaw = cam.yaw;
    } else if (moving) {
      targetYaw = Math.atan2(wishDir.x, wishDir.z);
    }

    // Shortest-angle lerp
    let diff = targetYaw - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * Math.min(1, dt * 14);

    // Procedural animation
    if (moving && this.grounded) {
      const freq = this.isSprinting ? 11.5 : 7.8;
      this.walkCycle += dt * freq;
      this.stepTimer += dt * freq;
      if (this.stepTimer >= Math.PI) {
        this.stepTimer -= Math.PI;
        audio.playFootstep(this.isIndoors);
      }
      const swing = this.isSprinting ? 0.68 : 0.46;
      this.leftLegPivot.rotation.x = Math.sin(this.walkCycle) * swing;
      this.rightLegPivot.rotation.x = -Math.sin(this.walkCycle) * swing;
      this.leftArmPivot.rotation.x = -Math.sin(this.walkCycle) * swing * 0.75;
    } else {
      this.leftLegPivot.rotation.x *= 0.8;
      this.rightLegPivot.rotation.x *= 0.8;
      this.leftArmPivot.rotation.x *= 0.8;
    }

    // Right arm animation based on weapon & attack
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    }
    if (usingGun) {
      const kick = this.attackAnimTimer > 0 ? Math.sin(this.attackAnimTimer * 24) * 0.25 : 0;
      this.rightArmPivot.rotation.x = -Math.PI * 0.48 - kick;
      this.rightArmPivot.rotation.z = 0.08;
    } else if (this.attackAnimTimer > 0) {
      const t = 1 - this.attackAnimTimer / 0.26;
      this.rightArmPivot.rotation.x = -Math.sin(t * Math.PI) * 1.45;
      this.rightArmPivot.rotation.z = -Math.sin(t * Math.PI) * 0.35;
    } else if (moving && this.grounded) {
      this.rightArmPivot.rotation.x = Math.sin(this.walkCycle) * (this.isSprinting ? 0.52 : 0.36);
      this.rightArmPivot.rotation.z = 0;
    } else {
      this.rightArmPivot.rotation.x *= 0.8;
      this.rightArmPivot.rotation.z *= 0.8;
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }
}
