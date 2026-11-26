import * as THREE from 'three';
import { InputManager } from './InputManager';
import { InteractableItem } from '../types/game';

export class InteractionManager {
  private items: InteractableItem[] = [];
  public nearestItem: InteractableItem | null = null;

  register(items: InteractableItem[]): void {
    this.items.push(...items);
  }

  update(playerPos: THREE.Vector3, input: InputManager): void {
    let best: InteractableItem | null = null;
    let bestDist = Infinity;

    for (const item of this.items) {
      const dist = Math.hypot(playerPos.x - item.position.x, playerPos.z - item.position.z);
      const dy = Math.abs(playerPos.y - item.position.y);
      if (dist <= item.radius && dy < 2.4 && dist < bestDist) {
        best = item;
        bestDist = dist;
      }
    }

    this.nearestItem = best;
    if (best && input.consumeInteract()) {
      best.onInteract();
    } else {
      input.consumeInteract(); // clear stale press when nothing nearby
    }
  }
}
