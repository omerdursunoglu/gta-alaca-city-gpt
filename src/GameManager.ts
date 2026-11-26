import * as THREE from 'three';
import { AudioManager } from './systems/AudioManager';
import { CatManager } from './systems/CatManager';
import { InputManager } from './systems/InputManager';
import { InteractionManager } from './systems/InteractionManager';
import { NPCManager } from './systems/NPCManager';
import { PerformanceManager } from './systems/PerformanceManager';
import { PhysicsManager } from './systems/PhysicsManager';
import { PlayerController } from './systems/PlayerController';
import { StoryCutsceneManager } from './systems/StoryCutsceneManager';
import { ThirdPersonCamera } from './systems/ThirdPersonCamera';
import { UIManager } from './systems/UIManager';
import { WeaponManager } from './systems/WeaponManager';
import { GamePhase, GameSettings } from './types/game';
import { WorldManager } from './world/WorldManager';

export class GameManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private input: InputManager;
  private audio: AudioManager;
  private physics: PhysicsManager;
  private interactions: InteractionManager;
  private performance: PerformanceManager;
  private world: WorldManager;
  private player: PlayerController;
  private cameraCtrl: ThirdPersonCamera;
  private weapons: WeaponManager;
  private npcs: NPCManager;
  private cats: CatManager;
  private storyCutscene: StoryCutsceneManager;
  private ui: UIManager;
  private wasOnH1SecondFloor = false;

  private phase: GamePhase = 'menu';
  private settings: GameSettings = {
    fpsLimit: 30, // Default 30 FPS limit per specification
    quality: 'medium',
    volume: 0.7,
    muted: false,
  };

  private rafId = 0;
  private lastSimMs = 0;
  private externalCameraOverride: { pos: [number, number, number]; target: [number, number, number] } | null = null;

  constructor(root: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    root.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.input = new InputManager();
    this.input.attachCanvas(this.renderer.domElement);

    this.audio = new AudioManager();
    this.physics = new PhysicsManager();
    this.interactions = new InteractionManager();
    this.performance = new PerformanceManager();

    this.player = new PlayerController();
    this.scene.add(this.player.group);

    this.cameraCtrl = new ThirdPersonCamera(window.innerWidth / window.innerHeight);

    this.world = new WorldManager(this.scene, this.physics, this.interactions, {
      onFountainInteract: () => {
        this.audio.playWaterSplash();
        this.player.heal(15);
        this.ui.showToast('Alaca Mescit Çeşmesi (1271): Serin su içildi (+15 Sağlık)');
      },
      onSadirvanInteract: () => {
        this.audio.playWaterSplash();
        this.ui.showToast('Avlu Şadırvanı: Selçuklu-Osmanlı avlu dokusu');
      },
      onDoorToggle: (isOpen) => {
        this.audio.playDoor(isOpen);
        this.ui.showToast(isOpen ? 'Ev 1 kapısı açıldı' : 'Ev 1 kapısı kapatıldı', 1.8);
      },
      onLampToggle: (isOn) => {
        this.ui.showToast(isOn ? 'Ev 1 iç aydınlatması açıldı' : 'Ev 1 iç aydınlatması kapatıldı', 1.8);
      },
    });

    this.weapons = new WeaponManager(this.player);
    this.scene.add(this.weapons.vfxGroup);

    this.npcs = new NPCManager();
    this.scene.add(this.npcs.group);

    this.cats = new CatManager();
    this.scene.add(this.cats.group);

    this.storyCutscene = new StoryCutsceneManager();

    this.ui = new UIManager(root, this.settings, this.input, {
      onStart: () => this.startGame(),
      onResume: () => this.resumeGame(),
      onPause: () => this.pauseGame(),
      onMainMenu: () => this.goMainMenu(),
      onSettingsChanged: (s) => this.applySettings(s),
      onStorySkip: () => this.storyCutscene.skip(),
    });

    this.applySettings(this.settings);
    this.ui.setPhase('menu');

    window.addEventListener('resize', this.onResize);
    this.installDebugAPI();
    this.startLoop();
  }

  private applySettings(s: GameSettings): void {
    this.settings = s;
    this.performance.setFpsLimit(s.fpsLimit);
    this.performance.applyQuality(
      s.quality,
      this.renderer,
      this.world.sunLight,
      this.cameraCtrl.camera,
      this.scene,
      this.world.interiorLights
    );
    this.audio.setVolume(s.volume, s.muted);
  }

  private startGame(): void {
    this.audio.unlock();
    this.storyCutscene.reset();
    this.wasOnH1SecondFloor = false;
    this.player.resetSpawn();
    this.cameraCtrl.yaw = 0; // Look South toward Alaca Mescit Camii & House 1/2 on the left
    this.cameraCtrl.pitch = 0.22;
    this.phase = 'playing';
    this.input.setGameplayActive(true);
    this.ui.setPhase('playing');
    this.ui.showToast('Alaca Mescit Camii önündesiniz. Sol tarafta Ev 1 ve Ev 2 yer alıyor.', 3.4);
  }

  private pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.input.setGameplayActive(false);
    this.ui.setPhase('paused');
  }

  private resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.audio.unlock();
    this.phase = 'playing';
    this.input.setGameplayActive(!this.storyCutscene.isActive);
    this.ui.setPhase('playing');
  }

  private goMainMenu(): void {
    this.storyCutscene.reset();
    this.phase = 'menu';
    this.input.setGameplayActive(false);
    this.ui.setPhase('menu');
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraCtrl.setAspect(w / h);
    if (this.phase === 'playing') {
      this.ui.setPhase('playing');
    }
  };

  /**
   * Exposes controlled testing & visual inspection hooks for automated QA verification
   * (teleporting player, toggling doors, inspecting camera views, verifying FPS/colliders).
   */
  private installDebugAPI(): void {
    (window as unknown as Record<string, unknown>).__ALACA_GAME__ = {
      start: () => this.startGame(),
      setCameraView: (pos: [number, number, number], target: [number, number, number]) => {
        this.externalCameraOverride = { pos, target };
      },
      clearCameraOverride: () => {
        this.externalCameraOverride = null;
      },
      teleportPlayer: (x: number, y: number, z: number) => {
        this.player.position.set(x, y, z);
        this.player.group.position.set(x, y, z);
      },
      triggerInteract: () => {
        this.interactions.nearestItem?.onInteract();
      },
      triggerMovieCutscene: () => {
        this.storyCutscene.start(
          this.world,
          this.player,
          this.cameraCtrl,
          this.audio,
          this.ui,
          () => this.input.setGameplayActive(false),
          () => this.input.setGameplayActive(true)
        );
      },
      getState: () => ({
        phase: this.phase,
        playerPos: this.player.position.toArray(),
        playerHealth: this.player.health,
        isIndoors: this.player.isIndoors,
        cutsceneActive: this.storyCutscene.isActive,
        cutsceneStage: this.storyCutscene.stage,
        cutsceneElapsed: Number(this.storyCutscene.elapsed.toFixed(2)),
        fpsLimit: this.performance.fpsLimit,
        actualFps: this.performance.actualFps,
        weapon: this.weapons.activeId,
        nearestInteract: this.interactions.nearestItem?.id ?? null,
        catPositions: this.cats.group.children.map((c) => c.position.toArray()),
      }),
    };
  }

  private startLoop(): void {
    this.lastSimMs = performance.now();
    const tick = (nowMs: number) => {
      this.rafId = requestAnimationFrame(tick);

      // Fixed/clamped simulation timestep independent of FPS limiter
      const rawDt = (nowMs - this.lastSimMs) / 1000;
      this.lastSimMs = nowMs;
      const dt = Math.min(rawDt, 0.05);

      if (this.input.consumePause()) {
        if (this.phase === 'playing') this.pauseGame();
        else if (this.phase === 'paused') this.resumeGame();
      }

      if (this.phase === 'playing') {
        if (this.storyCutscene.isActive) {
          this.storyCutscene.update(dt, Boolean(this.externalCameraOverride));
        } else {
          // Sub-step physics if dt > 1/60s so 30 FPS cap stays rock-solid
          const subSteps = dt > 0.022 ? 2 : 1;
          const subDt = dt / subSteps;
          for (let s = 0; s < subSteps; s++) {
            this.player.update(subDt, this.input, this.cameraCtrl, this.physics, this.audio);
          }

          this.interactions.update(this.player.position, this.input);
          this.weapons.update(
            dt,
            this.input,
            this.player,
            this.cameraCtrl,
            this.physics,
            this.npcs,
            this.cats,
            this.audio
          );

          const onH1SecondFloor =
            this.player.position.y > 2.65 &&
            this.player.position.x > 9.4 &&
            this.player.position.x < 18.6 &&
            this.player.position.z > -9.0 &&
            this.player.position.z < 1.0;
          if (onH1SecondFloor && !this.wasOnH1SecondFloor) {
            this.wasOnH1SecondFloor = true;
            this.ui.showToast('Üst katta yatakta film izleyen bir adam var. Yanına yaklaşabilirsin.', 3.2);
          } else if (!onH1SecondFloor) {
            this.wasOnH1SecondFloor = false;
          }

          this.storyCutscene.checkTrigger(
            dt,
            this.player.position,
            this.world,
            this.player,
            this.cameraCtrl,
            this.audio,
            this.ui,
            () => this.input.setGameplayActive(false),
            () => this.input.setGameplayActive(true)
          );
        }

        this.world.update(dt, this.player.position);
        this.npcs.update(dt, this.player.position, this.physics);
        this.cats.update(dt, this.player.position, this.player.isSprinting, this.physics, this.audio);

        if (this.externalCameraOverride) {
          this.cameraCtrl.camera.position.set(...this.externalCameraOverride.pos);
          this.cameraCtrl.camera.lookAt(...this.externalCameraOverride.target);
        } else if (!this.storyCutscene.isActive) {
          this.cameraCtrl.update(
            dt,
            this.player.position,
            this.player.isIndoors,
            this.player.isSprinting,
            this.input,
            this.physics
          );
        }

        const gunId = this.weapons.activeId === 'pistol' || this.weapons.activeId === 'smg' ? this.weapons.activeId : null;
        this.ui.updateHUD(
          dt,
          this.player.health,
          this.player.maxHealth,
          this.performance.actualFps,
          this.performance.fpsLimit,
          this.player.indoorHouseName,
          this.weapons.activeId,
          gunId ? this.weapons.magAmmo[gunId] : 0,
          gunId ? this.weapons.reserveAmmo[gunId] : 0,
          this.weapons.reloadTimer > 0,
          this.interactions.nearestItem?.label ?? null
        );
      } else {
        // Gentle scenic orbit around Alaca Mescit Camii while on menu
        const angle = nowMs * 0.00018;
        this.cameraCtrl.camera.position.set(
          Math.sin(angle) * 26,
          12.5,
          -6 + Math.cos(angle) * 26
        );
        this.cameraCtrl.camera.lookAt(4, 3.5, -2);
      }

      // Real FPS limiter gates actual WebGL render call!
      if (this.performance.shouldRenderFrame(nowMs)) {
        this.renderer.render(this.scene, this.cameraCtrl.camera);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.storyCutscene.dispose();
    this.input.dispose();
    this.renderer.dispose();
  }
}
