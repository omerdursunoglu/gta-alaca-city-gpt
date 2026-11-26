import * as THREE from 'three';
import { PLAYABLE_BOUNDS } from '../data/osmLayout';
import { ColliderBox, StairRamp } from '../types/game';

/**
 * Lightweight, deterministic AABB + StairRamp collision and camera-occlusion solver.
 * Separates horizontal slide resolution from vertical floor/stair support so characters
 * never snag on stairs, never jitter on flat ground, and cannot clip through mosque or house walls.
 */
export class PhysicsManager {
  private colliders: ColliderBox[] = [];
  private stairRamps: StairRamp[] = [];

  addColliders(boxes: ColliderBox[]): void {
    this.colliders.push(...boxes);
  }

  addStairRamps(ramps: StairRamp[]): void {
    this.stairRamps.push(...ramps);
  }

  getColliders(): readonly ColliderBox[] {
    return this.colliders;
  }

  /** Computes highest walkable floor/stair surface beneath (x, z) at or below feetY + stepUp */
  getSupportY(x: number, z: number, currentY: number, radius = 0.34): number {
    let bestY = 0;

    // 1. Check stair ramps (smoothly interpolated Y)
    for (const ramp of this.stairRamps) {
      if (x + radius < ramp.minX || x - radius > ramp.maxX) continue;
      if (z + radius < ramp.minZ || z - radius > ramp.maxZ) continue;
      const coord = ramp.axis === 'z' ? z : x;
      const t = THREE.MathUtils.clamp(
        (coord - ramp.startCoord) / (ramp.endCoord - ramp.startCoord),
        0,
        1
      );
      const rampY = THREE.MathUtils.lerp(ramp.startY, ramp.endY, t);
      if (rampY <= currentY + 0.65 && rampY > bestY) {
        bestY = rampY;
      }
    }

    // 2. Check horizontal floor slabs (colliders whose top maxY is reachable)
    for (const box of this.colliders) {
      if (!box.enabled) continue;
      if (x + radius <= box.minX || x - radius >= box.maxX) continue;
      if (z + radius <= box.minZ || z - radius >= box.maxZ) continue;
      if (box.maxY <= currentY + 0.42 && box.maxY > bestY) {
        bestY = box.maxY;
      }
    }

    return bestY;
  }

  /**
   * Moves an upright capsule/cylinder actor (feet at pos.y, height `actorH`, radius `radius`)
   * with separate X/Z wall sliding and stair-aware step-up.
   */
  moveCharacter(
    pos: THREE.Vector3,
    velY: number,
    dx: number,
    dz: number,
    dt: number,
    radius = 0.34,
    actorH = 1.72
  ): { grounded: boolean; velY: number } {
    const stepAllowance = 0.38;

    const overlapsSolid = (cx: number, cy: number, cz: number): boolean => {
      const feetCheckY = cy + stepAllowance;
      const headCheckY = cy + actorH - 0.05;
      for (const box of this.colliders) {
        if (!box.enabled) continue;
        if (box.maxY <= feetCheckY || box.minY >= headCheckY) continue;
        if (
          cx + radius > box.minX &&
          cx - radius < box.maxX &&
          cz + radius > box.minZ &&
          cz - radius < box.maxZ
        ) {
          return true;
        }
      }
      return false;
    };

    // Move X independently for clean wall sliding
    const tryX = THREE.MathUtils.clamp(pos.x + dx, PLAYABLE_BOUNDS.minX + 0.6, PLAYABLE_BOUNDS.maxX - 0.6);
    if (!overlapsSolid(tryX, pos.y, pos.z)) {
      pos.x = tryX;
    }

    // Move Z independently for clean wall sliding
    const tryZ = THREE.MathUtils.clamp(pos.z + dz, PLAYABLE_BOUNDS.minZ + 0.6, PLAYABLE_BOUNDS.maxZ - 0.6);
    if (!overlapsSolid(pos.x, pos.y, tryZ)) {
      pos.z = tryZ;
    }

    // Vertical gravity & ground/stair snap (zero jitter!)
    const supportY = this.getSupportY(pos.x, pos.z, pos.y, radius * 0.85);
    let nextVelY = velY;
    let grounded = false;

    if (pos.y <= supportY + 0.06 && nextVelY <= 0) {
      pos.y = supportY;
      nextVelY = 0;
      grounded = true;
    } else {
      nextVelY -= 20.0 * dt;
      pos.y += nextVelY * dt;

      // Ceiling hit check (e.g., jumping indoors under 2nd floor slab)
      const headY = pos.y + actorH;
      for (const box of this.colliders) {
        if (!box.enabled) continue;
        if (
          pos.x + radius * 0.8 > box.minX &&
          pos.x - radius * 0.8 < box.maxX &&
          pos.z + radius * 0.8 > box.minZ &&
          pos.z - radius * 0.8 < box.maxZ
        ) {
          if (nextVelY > 0 && headY > box.minY && pos.y < box.minY) {
            pos.y = box.minY - actorH;
            nextVelY = 0;
          }
        }
      }

      const newSupportY = this.getSupportY(pos.x, pos.z, pos.y, radius * 0.85);
      if (pos.y <= newSupportY) {
        pos.y = newSupportY;
        nextVelY = 0;
        grounded = true;
      }
    }

    return { grounded, velY: nextVelY };
  }

  /** Simple horizontal push-out check for NPCs & cats */
  isBlocked2D(x: number, z: number, radius: number, feetY = 0): boolean {
    if (
      x < PLAYABLE_BOUNDS.minX + 0.8 ||
      x > PLAYABLE_BOUNDS.maxX - 0.8 ||
      z < PLAYABLE_BOUNDS.minZ + 0.8 ||
      z > PLAYABLE_BOUNDS.maxZ - 0.8
    ) {
      return true;
    }
    for (const box of this.colliders) {
      if (!box.enabled) continue;
      if (box.maxY <= feetY + 0.25 || box.minY >= feetY + 1.6) continue;
      if (
        x + radius > box.minX &&
        x - radius < box.maxX &&
        z + radius > box.minZ &&
        z - radius < box.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Raymarch/AABB ray intersection for Third-Person Camera so camera never clips behind walls.
   */
  resolveCameraPosition(pivot: THREE.Vector3, desiredCamPos: THREE.Vector3): THREE.Vector3 {
    const dir = desiredCamPos.clone().sub(pivot);
    const totalDist = dir.length();
    if (totalDist < 0.01) return desiredCamPos.clone();
    dir.normalize();

    let bestT = totalDist;
    const invDirX = Math.abs(dir.x) > 1e-6 ? 1 / dir.x : 1e9;
    const invDirY = Math.abs(dir.y) > 1e-6 ? 1 / dir.y : 1e9;
    const invDirZ = Math.abs(dir.z) > 1e-6 ? 1 / dir.z : 1e9;

    const pad = 0.22;
    for (const box of this.colliders) {
      if (!box.enabled || !box.blocksCamera) continue;

      const t1 = (box.minX - pad - pivot.x) * invDirX;
      const t2 = (box.maxX + pad - pivot.x) * invDirX;
      const t3 = (box.minY - pad - pivot.y) * invDirY;
      const t4 = (box.maxY + pad - pivot.y) * invDirY;
      const t5 = (box.minZ - pad - pivot.z) * invDirZ;
      const t6 = (box.maxZ + pad - pivot.z) * invDirZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));

      if (tmax >= 0 && tmin <= tmax && tmin > 0.15 && tmin < bestT) {
        bestT = tmin;
      }
    }

    const clampedDist = Math.max(0.65, bestT - 0.12);
    const resolved = pivot.clone().addScaledVector(dir, clampedDist);
    resolved.y = Math.max(0.35, resolved.y);
    return resolved;
  }

  /** Raycast against solid building/wall colliders for weapon bullet stop distance */
  raycastWorld(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): number {
    let bestT = maxDist;
    const invX = Math.abs(dir.x) > 1e-6 ? 1 / dir.x : 1e9;
    const invY = Math.abs(dir.y) > 1e-6 ? 1 / dir.y : 1e9;
    const invZ = Math.abs(dir.z) > 1e-6 ? 1 / dir.z : 1e9;

    for (const box of this.colliders) {
      if (!box.enabled) continue;
      const t1 = (box.minX - origin.x) * invX;
      const t2 = (box.maxX - origin.x) * invX;
      const t3 = (box.minY - origin.y) * invY;
      const t4 = (box.maxY - origin.y) * invY;
      const t5 = (box.minZ - origin.z) * invZ;
      const t6 = (box.maxZ - origin.z) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));
      if (tmax >= 0 && tmin <= tmax && tmin >= 0 && tmin < bestT) {
        bestT = tmin;
      }
    }
    return bestT;
  }
}
