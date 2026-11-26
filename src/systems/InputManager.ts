import { WeaponId } from '../types/game';

export class InputManager {
  private keys = new Set<string>();
  private mouseDown = false;
  private lookDX = 0;
  private lookDY = 0;
  private wheelDelta = 0;

  // Mobile virtual input state
  public mobileMoveX = 0;
  public mobileMoveY = 0;
  public mobileSprinting = false;
  public mobileFiring = false;
  public readonly isTouchDevice: boolean;

  private pendingJump = false;
  private pendingInteract = false;
  private pendingReload = false;
  private pendingPause = false;
  private pendingWeapon: WeaponId | null = null;
  private pointerLocked = false;
  private canvas: HTMLElement | null = null;
  private gameplayActive = false;

  constructor() {
    this.isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  attachCanvas(el: HTMLElement): void {
    this.canvas = el;
    el.addEventListener('click', () => {
      if (this.gameplayActive && !this.isTouchDevice && document.pointerLockElement !== el) {
        el.requestPointerLock?.();
      }
    });
  }

  setGameplayActive(active: boolean): void {
    this.gameplayActive = active;
    if (!active && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    if (!active) {
      this.keys.clear();
      this.mouseDown = false;
      this.mobileFiring = false;
      this.mobileMoveX = 0;
      this.mobileMoveY = 0;
    }
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      this.pendingPause = true;
      return;
    }
    this.keys.add(e.code);
    if (e.code === 'Space' && !e.repeat) this.pendingJump = true;
    if (e.code === 'KeyE' && !e.repeat) this.pendingInteract = true;
    if (e.code === 'KeyR' && !e.repeat) this.pendingReload = true;
    if (e.code === 'Digit1') this.pendingWeapon = 'fist';
    if (e.code === 'Digit2') this.pendingWeapon = 'knife';
    if (e.code === 'Digit3') this.pendingWeapon = 'pistol';
    if (e.code === 'Digit4') this.pendingWeapon = 'smg';
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.gameplayActive) return;
    if (this.pointerLocked || e.buttons === 1) {
      this.lookDX += e.movementX;
      this.lookDY += e.movementY;
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.gameplayActive) return;
    if (e.button === 0 && (this.pointerLocked || e.target === this.canvas)) {
      this.mouseDown = true;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseDown = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.gameplayActive) return;
    this.wheelDelta += e.deltaY;
  };

  addMobileLookDelta(dx: number, dy: number): void {
    this.lookDX += dx;
    this.lookDY += dy;
  }

  triggerJump(): void {
    this.pendingJump = true;
  }

  triggerInteract(): void {
    this.pendingInteract = true;
  }

  triggerReload(): void {
    this.pendingReload = true;
  }

  triggerWeaponSelect(w: WeaponId): void {
    this.pendingWeapon = w;
  }

  getMoveAxes(): { x: number; y: number } {
    let x = this.mobileMoveX;
    let y = this.mobileMoveY;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  isSprinting(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.mobileSprinting;
  }

  isAttackHeld(): boolean {
    return this.mouseDown || this.mobileFiring;
  }

  consumeLookDelta(): { dx: number; dy: number } {
    const res = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return res;
  }

  consumeWheelDelta(): number {
    const w = this.wheelDelta;
    this.wheelDelta = 0;
    return w;
  }

  consumeJump(): boolean {
    const v = this.pendingJump;
    this.pendingJump = false;
    return v;
  }

  consumeInteract(): boolean {
    const v = this.pendingInteract;
    this.pendingInteract = false;
    return v;
  }

  consumeReload(): boolean {
    const v = this.pendingReload;
    this.pendingReload = false;
    return v;
  }

  consumePause(): boolean {
    const v = this.pendingPause;
    this.pendingPause = false;
    return v;
  }

  consumeWeaponSelect(): WeaponId | null {
    const w = this.pendingWeapon;
    this.pendingWeapon = null;
    return w;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
