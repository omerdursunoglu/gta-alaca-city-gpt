import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { CatManager } from './CatManager';
import { InputManager } from './InputManager';
import { NPCManager } from './NPCManager';
import { PhysicsManager } from './PhysicsManager';
import { PlayerController } from './PlayerController';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { WeaponId, WeaponStats } from '../types/game';

export const WEAPONS: Record<WeaponId, WeaponStats> = {
  fist: {
    id: 'fist',
    name: 'Yumruk',
    slot: 1,
    damage: 20,
    range: 2.1,
    cooldown: 0.42,
    automatic: false,
    magSize: 0,
    reserveMax: 0,
    reloadTime: 0,
    spread: 0,
  },
  knife: {
    id: 'knife',
    name: 'Bıçak',
    slot: 2,
    damage: 38,
    range: 2.35,
    cooldown: 0.34,
    automatic: false,
    magSize: 0,
    reserveMax: 0,
    reloadTime: 0,
    spread: 0,
  },
  pistol: {
    id: 'pistol',
    name: 'Tabanca',
    slot: 3,
    damage: 45,
    range: 55,
    cooldown: 0.28,
    automatic: false,
    magSize: 12,
    reserveMax: 72,
    reloadTime: 1.25,
    spread: 0.012,
  },
  smg: {
    id: 'smg',
    name: 'Tarama Silahı',
    slot: 4,
    damage: 26,
    range: 50,
    cooldown: 0.095,
    automatic: true,
    magSize: 30,
    reserveMax: 150,
    reloadTime: 1.55,
    spread: 0.028,
  },
};

interface TracerVFX {
  mesh: THREE.Mesh;
  life: number;
}

export class WeaponManager {
  public readonly vfxGroup = new THREE.Group();
  public activeId: WeaponId = 'fist';
  public magAmmo: Record<'pistol' | 'smg', number> = { pistol: 12, smg: 30 };
  public reserveAmmo: Record<'pistol' | 'smg', number> = { pistol: 72, smg: 150 };
  public reloadTimer = 0;

  private cooldownTimer = 0;
  private wasTriggerDown = false;
  private weaponMeshes: Record<WeaponId, THREE.Group>;
  private muzzleFlash: THREE.Mesh;
  private muzzleTimer = 0;
  private tracers: TracerVFX[] = [];

  constructor(player: PlayerController) {
    this.weaponMeshes = {
      fist: new THREE.Group(),
      knife: this.buildKnifeMesh(),
      pistol: this.buildPistolMesh(),
      smg: this.buildSmgMesh(),
    };

    (Object.keys(this.weaponMeshes) as WeaponId[]).forEach((id) => {
      this.weaponMeshes[id].visible = id === this.activeId;
      player.rightHandSocket.add(this.weaponMeshes[id]);
    });

    this.muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd56b })
    );
    this.muzzleFlash.visible = false;
    player.rightHandSocket.add(this.muzzleFlash);
  }

  private buildKnifeMesh(): THREE.Group {
    const g = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.25, metalness: 0.88 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3b2619, roughness: 0.8 });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.12, 8), gripMat);
    grip.rotation.x = Math.PI / 2;
    g.add(grip);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.015), steelMat);
    guard.position.z = 0.06;
    g.add(guard);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.032, 0.2), steelMat);
    blade.position.set(0, 0.005, 0.16);
    g.add(blade);
    return g;
  }

  private buildPistolMesh(): THREE.Group {
    const g = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.38, metalness: 0.82 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.78 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.052, 0.22), darkMetal);
    slide.position.set(0, 0.055, 0.06);
    g.add(slide);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.11, 0.055), gripMat);
    grip.position.set(0, 0, -0.01);
    grip.rotation.x = -0.22;
    g.add(grip);
    return g;
  }

  private buildSmgMesh(): THREE.Group {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.42, metalness: 0.8 });
    const polymer = new THREE.MeshStandardMaterial({ color: 0x303338, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.34), metal);
    body.position.set(0, 0.055, 0.09);
    g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.16, 8), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.06, 0.32);
    g.add(barrel);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.16, 0.045), polymer);
    mag.position.set(0, -0.05, 0.12);
    mag.rotation.x = 0.14;
    g.add(mag);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.05), polymer);
    grip.position.set(0, -0.02, -0.02);
    grip.rotation.x = -0.2;
    g.add(grip);
    return g;
  }

  selectWeapon(id: WeaponId, player: PlayerController): void {
    if (this.activeId === id) return;
    this.weaponMeshes[this.activeId].visible = false;
    this.activeId = id;
    this.weaponMeshes[id].visible = true;
    this.reloadTimer = 0;
    player.setActiveWeapon(id);
  }

  private spawnImpactAndTracer(start: THREE.Vector3, end: THREE.Vector3, withLine: boolean): void {
    if (withLine) {
      const dist = start.distanceTo(end);
      const tracer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, dist, 4),
        new THREE.MeshBasicMaterial({ color: 0xffe484, transparent: true, opacity: 0.85 })
      );
      tracer.position.copy(start).lerp(end, 0.5);
      tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
      this.vfxGroup.add(tracer);
      this.tracers.push({ mesh: tracer, life: 0.07 });
    }
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe094, transparent: true, opacity: 0.9 })
    );
    spark.position.copy(end);
    this.vfxGroup.add(spark);
    this.tracers.push({ mesh: spark, life: 0.11 });
  }

  startReload(audio: AudioManager): void {
    if (this.activeId !== 'pistol' && this.activeId !== 'smg') return;
    const stats = WEAPONS[this.activeId];
    if (this.reloadTimer > 0) return;
    if (this.magAmmo[this.activeId] >= stats.magSize || this.reserveAmmo[this.activeId] <= 0) return;
    this.reloadTimer = stats.reloadTime;
    audio.playReload();
  }

  update(
    dt: number,
    input: InputManager,
    player: PlayerController,
    cam: ThirdPersonCamera,
    physics: PhysicsManager,
    npcs: NPCManager,
    cats: CatManager,
    audio: AudioManager
  ): void {
    // Update active tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= dt;
      if (this.tracers[i].life <= 0) {
        this.vfxGroup.remove(this.tracers[i].mesh);
        this.tracers[i].mesh.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) this.muzzleFlash.visible = false;
    }

    const reqWeapon = input.consumeWeaponSelect();
    if (reqWeapon) this.selectWeapon(reqWeapon, player);

    if (input.consumeReload()) {
      this.startReload(audio);
    }

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0 && (this.activeId === 'pistol' || this.activeId === 'smg')) {
        const stats = WEAPONS[this.activeId];
        const needed = stats.magSize - this.magAmmo[this.activeId];
        const take = Math.min(needed, this.reserveAmmo[this.activeId]);
        this.magAmmo[this.activeId] += take;
        this.reserveAmmo[this.activeId] -= take;
      }
      this.wasTriggerDown = input.isAttackHeld();
      return;
    }

    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);

    const triggerDown = input.isAttackHeld();
    const stats = WEAPONS[this.activeId];
    const shouldFire = stats.automatic ? triggerDown : triggerDown && !this.wasTriggerDown;
    this.wasTriggerDown = triggerDown;

    if (!shouldFire || this.cooldownTimer > 0) return;

    if (this.activeId === 'fist' || this.activeId === 'knife') {
      this.cooldownTimer = stats.cooldown;
      player.triggerAttackAnim();
      if (this.activeId === 'fist') audio.playPunch();
      else audio.playKnife();

      const origin = new THREE.Vector3(player.position.x, player.position.y + 1.15, player.position.z);
      const forward = new THREE.Vector3(Math.sin(player.group.rotation.y), 0, Math.cos(player.group.rotation.y));
      const hitPt = npcs.checkHit(origin, forward, stats.range, this.activeId === 'fist' ? 6.5 : 4.5, audio);
      if (hitPt) {
        this.spawnImpactAndTracer(origin, hitPt, false);
      }
      cats.scareNearby(player.position, 4.0, audio);
      return;
    }

    // Firearm (pistol or smg)
    const gunId = this.activeId as 'pistol' | 'smg';
    if (this.magAmmo[gunId] <= 0) {
      this.startReload(audio);
      return;
    }

    this.magAmmo[gunId]--;
    this.cooldownTimer = stats.cooldown;
    player.triggerAttackAnim();
    cam.addRecoil(gunId === 'pistol' ? 0.032 : 0.018);

    if (gunId === 'pistol') audio.playPistol();
    else audio.playSmg();

    // Muzzle flash
    this.muzzleFlash.position.set(0, 0.06, gunId === 'pistol' ? 0.2 : 0.42);
    this.muzzleFlash.visible = true;
    this.muzzleTimer = 0.045;

    const ray = cam.getAimRay();
    const spreadDir = ray.direction.clone();
    spreadDir.x += (Math.random() - 0.5) * stats.spread;
    spreadDir.y += (Math.random() - 0.5) * stats.spread;
    spreadDir.z += (Math.random() - 0.5) * stats.spread;
    spreadDir.normalize();

    const wallDist = physics.raycastWorld(ray.origin, spreadDir, stats.range);
    const npcHit = npcs.checkHit(ray.origin, spreadDir, wallDist, 4.2, audio);
    const endPoint = npcHit ?? ray.origin.clone().addScaledVector(spreadDir, wallDist);

    const muzzleWorld = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(muzzleWorld);
    this.spawnImpactAndTracer(muzzleWorld, endPoint, true);

    npcs.alertGunshot(player.position, 24, audio);
    cats.scareNearby(player.position, 18, audio);
  }
}
