import * as THREE from 'three';
import { InputManager } from './InputManager';
import { PhysicsManager } from './PhysicsManager';

/**
 * GTA-style third-person follow camera with smooth yaw/pitch mouse/touch orbit,
 * indoor proximity adjustment, and raycast wall collision prevention.
 */
export class ThirdPersonCamera {
  public readonly camera: THREE.PerspectiveCamera;
  public yaw = 0; // 0 looks toward +Z (South, directly at Alaca Mescit from North spawn)
  public pitch = 0.24;
  private distance = 4.4;
  private desiredDistance = 4.4;
  private currentPos = new THREE.Vector3(0, 3, -24);
  private currentLookAt = new THREE.Vector3(0, 1.4, 0);
  private recoilPitch = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.15, 160);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  addRecoil(amount: number): void {
    this.recoilPitch = Math.min(0.14, this.recoilPitch + amount);
  }

  getForwardXZ(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
  }

  getRightXZ(): THREE.Vector3 {
    return new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw)).normalize();
  }

  /** Aim ray origin & direction from camera center for firearms */
  getAimRay(): { origin: THREE.Vector3; direction: THREE.Vector3 } {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return { origin: this.camera.position.clone(), direction: dir };
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    isIndoors: boolean,
    isSprinting: boolean,
    input: InputManager,
    physics: PhysicsManager
  ): void {
    const { dx, dy } = input.consumeLookDelta();
    const sens = input.isTouchDevice ? 0.0042 : 0.0024;
    this.yaw -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * sens, -0.45, 1.05);

    const wheel = input.consumeWheelDelta();
    if (wheel !== 0) {
      this.desiredDistance = THREE.MathUtils.clamp(this.desiredDistance + wheel * 0.003, 2.2, 7.2);
    }

    this.recoilPitch = Math.max(0, this.recoilPitch - dt * 0.45);
    const effectivePitch = THREE.MathUtils.clamp(this.pitch - this.recoilPitch, -0.45, 1.05);

    const targetDist = isIndoors ? Math.min(this.desiredDistance, 2.55) : this.desiredDistance;
    this.distance += (targetDist - this.distance) * Math.min(1, dt * 8);

    // Pivot slightly over right shoulder (GTA style)
    const shoulderRight = this.getRightXZ().multiplyScalar(isIndoors ? 0.28 : 0.45);
    const pivot = new THREE.Vector3(
      playerPos.x + shoulderRight.x,
      playerPos.y + 1.48,
      playerPos.z + shoulderRight.z
    );

    const horiz = Math.cos(effectivePitch) * this.distance;
    const vert = Math.sin(effectivePitch) * this.distance;
    const rawCamPos = new THREE.Vector3(
      pivot.x - Math.sin(this.yaw) * horiz,
      pivot.y + vert,
      pivot.z - Math.cos(this.yaw) * horiz
    );

    const safeCamPos = physics.resolveCameraPosition(pivot, rawCamPos);
    const smooth = Math.min(1, dt * 16);
    this.currentPos.lerp(safeCamPos, smooth);

    const lookAhead = new THREE.Vector3(
      pivot.x + Math.sin(this.yaw) * 3.5,
      pivot.y - Math.sin(effectivePitch) * 1.4,
      pivot.z + Math.cos(this.yaw) * 3.5
    );
    this.currentLookAt.lerp(lookAhead, smooth);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);

    // Subtle FOV kick while sprinting
    const targetFov = isSprinting ? 63 : 58;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 7);
      this.camera.updateProjectionMatrix();
    }
  }
}
