import * as THREE from 'three';
import { FpsLimit, QualityLevel } from '../types/game';

/**
 * Enforces the user-selected FPS limit (default 30 FPS) in the real render loop,
 * measures honest actual FPS, and applies Low/Medium/High graphical quality presets
 * without coupling render pacing to physics simulation.
 */
export class PerformanceManager {
  public fpsLimit: FpsLimit = 30;
  public quality: QualityLevel = 'medium';
  public actualFps = 30;

  private frameIntervalMs = 1000 / 30;
  private lastRenderTime = 0;
  private fpsCounterFrames = 0;
  private fpsCounterStart = 0;

  constructor() {
    this.setFpsLimit(30);
  }

  setFpsLimit(limit: FpsLimit): void {
    this.fpsLimit = limit;
    this.frameIntervalMs = 1000 / limit;
  }

  /**
   * Returns true if enough time has elapsed for the next rendered frame under `fpsLimit`.
   * Also updates honest measured `actualFps`.
   */
  shouldRenderFrame(nowMs: number): boolean {
    if (this.fpsCounterStart === 0) this.fpsCounterStart = nowMs;

    const elapsed = nowMs - this.lastRenderTime;
    // Slight 1.2ms tolerance prevents missing 60Hz/120Hz vsync intervals (e.g. 16.6ms vs 16.7ms)
    if (this.lastRenderTime !== 0 && elapsed < this.frameIntervalMs - 1.2) {
      return false;
    }
    this.lastRenderTime = nowMs;
    this.fpsCounterFrames++;

    const win = nowMs - this.fpsCounterStart;
    if (win >= 500) {
      this.actualFps = Math.round((this.fpsCounterFrames * 1000) / win);
      this.fpsCounterFrames = 0;
      this.fpsCounterStart = nowMs;
    }
    return true;
  }

  applyQuality(
    quality: QualityLevel,
    renderer: THREE.WebGLRenderer,
    sunLight: THREE.DirectionalLight,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    interiorLights: THREE.PointLight[]
  ): void {
    this.quality = quality;
    const dpr = window.devicePixelRatio || 1;

    if (quality === 'low') {
      renderer.setPixelRatio(Math.min(dpr, 1.0));
      renderer.shadowMap.enabled = false;
      sunLight.castShadow = false;
      camera.far = 95;
      scene.fog = new THREE.FogExp2(0xd8ccb8, 0.011);
      interiorLights.forEach((l) => (l.intensity = 0));
    } else if (quality === 'medium') {
      renderer.setPixelRatio(Math.min(dpr, 1.5));
      renderer.shadowMap.enabled = true;
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.map?.dispose();
      sunLight.shadow.map = null;
      camera.far = 130;
      scene.fog = new THREE.FogExp2(0xdccfb9, 0.0065);
      interiorLights.forEach((l) => (l.intensity = 1.6));
    } else {
      renderer.setPixelRatio(Math.min(dpr, 2.0));
      renderer.shadowMap.enabled = true;
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.map?.dispose();
      sunLight.shadow.map = null;
      camera.far = 175;
      scene.fog = new THREE.FogExp2(0xdfd3be, 0.0045);
      interiorLights.forEach((l) => (l.intensity = 1.9));
    }
    camera.updateProjectionMatrix();
  }
}
