import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { PlayerController } from './PlayerController';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { UIManager } from './UIManager';
import { WorldManager } from '../world/WorldManager';

const BED_NPC_WORLD_POS = new THREE.Vector3(10.55, 3.33, -1.15);
const WATCH_SPOT = new THREE.Vector3(11.95, 3.30, -2.05);
const NPC_ATTACK_SPOT = new THREE.Vector3(11.75, 3.30, -1.05);

const ESCAPE_PATH: THREE.Vector3[] = [
  WATCH_SPOT.clone(),
  new THREE.Vector3(13.60, 3.30, -0.75),
  new THREE.Vector3(17.40, 3.30, -0.75),
  new THREE.Vector3(17.40, 3.30, -1.20),
  new THREE.Vector3(17.40, 0.18, -6.20),
  new THREE.Vector3(16.80, 0.18, -6.85),
  new THREE.Vector3(14.20, 0.18, -7.35),
  new THREE.Vector3(12.60, 0.18, -7.80),
  new THREE.Vector3(12.60, 0.06, -9.80),
  new THREE.Vector3(12.20, 0.00, -13.60),
  new THREE.Vector3(11.60, 0.00, -18.80),
];

const NPC_CHASE_PATH: THREE.Vector3[] = [
  NPC_ATTACK_SPOT.clone(),
  new THREE.Vector3(13.60, 3.30, -0.75),
  new THREE.Vector3(17.40, 3.30, -0.75),
  new THREE.Vector3(17.40, 3.30, -1.20),
  new THREE.Vector3(17.40, 0.18, -6.20),
  new THREE.Vector3(16.80, 0.18, -6.85),
  new THREE.Vector3(14.20, 0.18, -7.35),
  new THREE.Vector3(12.60, 0.18, -7.80),
  new THREE.Vector3(12.60, 0.14, -9.15),
];

function computePathLengths(points: THREE.Vector3[]): { cum: number[]; total: number } {
  const cum = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += points[i].distanceTo(points[i - 1]);
    cum.push(total);
  }
  return { cum, total };
}

function samplePath(
  points: THREE.Vector3[],
  cum: number[],
  dist: number,
  outPos: THREE.Vector3
): number {
  const total = cum[cum.length - 1];
  const d = THREE.MathUtils.clamp(dist, 0, total);
  for (let i = 1; i < points.length; i++) {
    if (d <= cum[i] || i === points.length - 1) {
      const segLen = Math.max(0.0001, cum[i] - cum[i - 1]);
      const t = THREE.MathUtils.clamp((d - cum[i - 1]) / segLen, 0, 1);
      outPos.lerpVectors(points[i - 1], points[i], t);
      const dx = points[i].x - points[i - 1].x;
      const dz = points[i].z - points[i - 1].z;
      return Math.atan2(dx, dz);
    }
  }
  outPos.copy(points[points.length - 1]);
  return 0;
}

export type CutsceneStage = 'idle' | 'watch' | 'ask' | 'react' | 'attack' | 'chase';

/**
 * Orchestrates the cinematic Story Mode sequence in House 1 (2nd Floor):
 *  1. Player approaches the movie-watching NPC and watches quietly for 5 seconds.
 *  2. Player asks: "Dondurma var mı abi?"
 *  3. NPC snaps in anger, jumps off the bed, and attacks.
 *  4. Player sprints away downstairs and out onto the street while the NPC chases behind.
 */
export class StoryCutsceneManager {
  public isActive = false;
  public stage: CutsceneStage = 'idle';
  public elapsed = 0;

  private cooldown = 0;
  private startPos = new THREE.Vector3();
  private playerPathMeta = computePathLengths(ESCAPE_PATH);
  private npcPathMeta = computePathLengths(NPC_CHASE_PATH);

  private askedFired = false;
  private reactFired = false;
  private attackJumpFired = false;
  private punchHitFired = false;
  private chaseSpeechFired = false;
  private doorOpenedFired = false;
  private npcAngryLineFired = false;

  private tmpPos = new THREE.Vector3();
  private tmpNpcWorld = new THREE.Vector3();
  private tmpNpcLocal = new THREE.Vector3();
  private tmpHead = new THREE.Vector3();
  private tmpLookAt = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private lastChaseCut = -1;

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.isActive && e.code === 'Enter' && !e.repeat) {
      this.skip();
    }
  };

  private activeWorld: WorldManager | null = null;
  private activePlayer: PlayerController | null = null;
  private activeCam: ThirdPersonCamera | null = null;
  private activeAudio: AudioManager | null = null;
  private activeUi: UIManager | null = null;
  private onCompleteCallback: (() => void) | null = null;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
  }

  reset(): void {
    this.isActive = false;
    this.stage = 'idle';
    this.elapsed = 0;
    this.cooldown = 0;
    this.activeAudio?.stopSpeech();
    this.activeWorld?.buildings.firstTwoHouses.house1MovieNpc.setStoryMode('watching');
    this.activeUi?.setStoryMode(false);
  }

  checkTrigger(
    dt: number,
    playerPos: THREE.Vector3,
    world: WorldManager,
    player: PlayerController,
    cameraCtrl: ThirdPersonCamera,
    audio: AudioManager,
    ui: UIManager,
    onStart: () => void,
    onComplete: () => void
  ): boolean {
    if (this.isActive) return false;
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dt);
      return false;
    }

    // Trigger when player climbs to House 1 2nd floor and walks beside the movie-watching NPC
    const inH1SecondFloor =
      playerPos.y > 2.65 &&
      playerPos.x > 9.4 &&
      playerPos.x < 18.6 &&
      playerPos.z > -9.0 &&
      playerPos.z < 1.0;
    if (!inH1SecondFloor) return false;

    const horizDist = Math.hypot(playerPos.x - BED_NPC_WORLD_POS.x, playerPos.z - BED_NPC_WORLD_POS.z);
    if (horizDist > 2.85) return false;

    this.start(world, player, cameraCtrl, audio, ui, onStart, onComplete);
    return true;
  }

  start(
    world: WorldManager,
    player: PlayerController,
    cameraCtrl: ThirdPersonCamera,
    audio: AudioManager,
    ui: UIManager,
    onStart: () => void,
    onComplete: () => void
  ): void {
    this.activeWorld = world;
    this.activePlayer = player;
    this.activeCam = cameraCtrl;
    this.activeAudio = audio;
    this.activeUi = ui;
    this.onCompleteCallback = onComplete;

    this.isActive = true;
    this.stage = 'watch';
    this.elapsed = 0;
    this.startPos.copy(player.position);

    this.askedFired = false;
    this.reactFired = false;
    this.attackJumpFired = false;
    this.punchHitFired = false;
    this.chaseSpeechFired = false;
    this.doorOpenedFired = false;
    this.npcAngryLineFired = false;
    this.lastChaseCut = -1;

    this.camPos.set(13.65, 4.78, -2.75);
    this.camLook.set(11.0, 4.12, -1.25);

    onStart();
    ui.setStoryMode(true);
    world.buildings.firstTwoHouses.house1MovieNpc.setStoryMode('watching');
  }

  skip(): void {
    if (!this.isActive || !this.activeWorld || !this.activePlayer || !this.activeCam || !this.activeAudio || !this.activeUi) {
      return;
    }
    this.activeWorld.buildings.firstTwoHouses.openHouse1Door();
    const endPos = ESCAPE_PATH[ESCAPE_PATH.length - 1];
    const endYaw = Math.atan2(endPos.x - ESCAPE_PATH[ESCAPE_PATH.length - 2].x, endPos.z - ESCAPE_PATH[ESCAPE_PATH.length - 2].z);
    this.activePlayer.updateScripted({
      dt: 0.016,
      pos: endPos,
      yaw: endYaw,
      moveSpeed: 0,
      animPose: 'idle',
      audio: this.activeAudio,
    });
    this.finish('Hikaye sahnesi geçildi.');
  }

  private finish(toastText: string): void {
    if (!this.activeWorld || !this.activePlayer || !this.activeCam || !this.activeAudio || !this.activeUi) return;
    this.isActive = false;
    this.stage = 'idle';
    this.cooldown = 14.0;
    this.activeAudio.stopSpeech();
    this.activeWorld.buildings.firstTwoHouses.house1MovieNpc.setStoryMode('watching');
    this.activeUi.setStoryMode(false);
    this.activeUi.showToast(toastText, 3.2);

    const endPos = this.activePlayer.position;
    const prev = ESCAPE_PATH[ESCAPE_PATH.length - 2];
    const escapeYaw = Math.atan2(endPos.x - prev.x, endPos.z - prev.z);
    this.activeCam.snapBehindPlayer(endPos, escapeYaw, 0.2);
    this.onCompleteCallback?.();
  }

  update(dt: number, externalCameraActive = false): void {
    if (!this.isActive || !this.activeWorld || !this.activePlayer || !this.activeCam || !this.activeAudio || !this.activeUi) {
      return;
    }

    this.elapsed += dt;
    const t = this.elapsed;
    const houses = this.activeWorld.buildings.firstTwoHouses;
    const npc = houses.house1MovieNpc;
    const h1Origin = houses.house1Origin;
    const player = this.activePlayer;
    const audio = this.activeAudio;

    const watchYaw = Math.atan2(
      BED_NPC_WORLD_POS.x - WATCH_SPOT.x,
      BED_NPC_WORLD_POS.z - WATCH_SPOT.z
    );

    let subtitleSpeaker: string | null = null;
    let subtitleText: string | null = null;
    let angrySpeaker = false;
    let watchProgress: number | null = null;
    let watchSecondsLeft = 0;
    let bubbleTarget: 'player' | 'npc' | null = null;
    let bubbleText = '';
    let bubbleAngry = false;

    // -----------------------------------------------------------------------
    // BEAT 1 (0.0s - 5.0s): Approach bedside & watch the movie for 5 seconds
    // -----------------------------------------------------------------------
    if (t < 5.0) {
      this.stage = 'watch';
      const approachAlpha = THREE.MathUtils.clamp(t / 0.65, 0, 1);
      this.tmpPos.lerpVectors(this.startPos, WATCH_SPOT, approachAlpha);
      const isStepping = approachAlpha < 0.98 && this.startPos.distanceTo(WATCH_SPOT) > 0.25;

      player.updateScripted({
        dt,
        pos: this.tmpPos,
        yaw: watchYaw,
        moveSpeed: isStepping ? 2.6 : 0,
        animPose: isStepping ? 'idle' : 'watch',
        elapsed: t,
        audio,
      });
      npc.setStoryMode('watching');

      watchProgress = t / 5.0;
      watchSecondsLeft = 5.0 - t;
      subtitleSpeaker = 'Hikaye';
      subtitleText = 'Sessizce yatağın yanında durup telefondaki filmi izliyorsun...';

      if (t < 2.6) {
        const k = t / 2.6;
        this.camPos.set(
          THREE.MathUtils.lerp(13.35, 12.85, k),
          THREE.MathUtils.lerp(4.78, 4.62, k),
          THREE.MathUtils.lerp(-0.25, -0.55, k)
        );
        this.camLook.set(11.05, 4.15, -1.55);
      } else {
        const k = (t - 2.6) / 2.4;
        this.camPos.set(
          THREE.MathUtils.lerp(12.85, 12.35, k),
          THREE.MathUtils.lerp(4.62, 4.46, k),
          THREE.MathUtils.lerp(-2.85, -2.55, k)
        );
        this.camLook.set(10.55, 4.18, -1.18);
      }
    }
    // -----------------------------------------------------------------------
    // BEAT 2 (5.0s - 7.3s): Ask "Dondurma var mı abi?" -> NPC snaps!
    // -----------------------------------------------------------------------
    else if (t < 7.3) {
      if (!this.askedFired) {
        this.askedFired = true;
        audio.speakTurkish('Dondurma var mı abi?', 1.04, 1.0);
      }

      player.updateScripted({
        dt,
        pos: WATCH_SPOT,
        yaw: watchYaw,
        moveSpeed: 0,
        animPose: t < 6.4 ? 'talk' : 'idle',
        elapsed: t,
        audio,
      });

      if (t < 6.35) {
        this.stage = 'ask';
        npc.setStoryMode('watching');
        subtitleSpeaker = 'Sen';
        subtitleText = '"Dondurma var mı abi?"';
        bubbleTarget = 'player';
        bubbleText = 'Dondurma var mı abi?';
        this.camPos.set(10.80, 4.78, -0.55);
        this.camLook.set(11.95, 4.55, -2.02);
      } else {
        this.stage = 'react';
        if (!this.reactFired) {
          this.reactFired = true;
          audio.playNpcReact();
          audio.speakTurkish('Ne dondurması lan!', 0.86, 1.15);
        }
        npc.setStoryMode('reacting', { lookYawOffset: -0.95 });
        subtitleSpeaker = 'Film İzleyen Adam';
        subtitleText = '"Ne dondurması lan?!"';
        angrySpeaker = true;
        bubbleTarget = 'npc';
        bubbleText = 'NE DONDURMASI?!';
        bubbleAngry = true;
        this.camPos.set(12.15, 4.55, -0.52);
        this.camLook.set(10.35, 4.18, -1.15);
      }
    }
    // -----------------------------------------------------------------------
    // BEAT 3 (7.3s - 9.3s): NPC leaps off the bed and attacks!
    // -----------------------------------------------------------------------
    else if (t < 9.3) {
      this.stage = 'attack';
      if (!this.attackJumpFired) {
        this.attackJumpFired = true;
        audio.playNpcReact();
        audio.speakTurkish('Filmin ortasında dondurma mı sorulur, defol buradan!', 0.84, 1.15);
      }

      const attackPhase = t - 7.3;
      const chargeT = THREE.MathUtils.clamp(attackPhase / 0.65, 0, 1);
      this.tmpNpcWorld.lerpVectors(NPC_ATTACK_SPOT, new THREE.Vector3(11.82, 3.30, -1.48), chargeT);
      this.tmpNpcLocal.copy(this.tmpNpcWorld).sub(h1Origin);
      const npcYaw = Math.atan2(WATCH_SPOT.x - this.tmpNpcWorld.x, WATCH_SPOT.z - this.tmpNpcWorld.z);

      const swingProgress = THREE.MathUtils.clamp((attackPhase - 0.55) / 0.75, 0, 1);
      if (attackPhase >= 0.85 && !this.punchHitFired) {
        this.punchHitFired = true;
        audio.playPunch();
        player.takeDamage(12, 15);
      }

      npc.setStoryMode(attackPhase < 0.55 ? 'chase' : 'attack', {
        localPos: this.tmpNpcLocal,
        yaw: npcYaw,
        moveSpeed: attackPhase < 0.55 ? 4.2 : 0,
        attackProgress: swingProgress,
      });

      const flinchBack = attackPhase >= 0.85 ? THREE.MathUtils.clamp((attackPhase - 0.85) / 0.35, 0, 1) * 0.42 : 0;
      this.tmpPos.copy(WATCH_SPOT).add(new THREE.Vector3(flinchBack * 0.45, 0, -flinchBack * 0.85));
      player.updateScripted({
        dt,
        pos: this.tmpPos,
        yaw: watchYaw,
        moveSpeed: 0,
        animPose: attackPhase >= 0.82 ? 'flinch' : 'idle',
        elapsed: t,
        audio,
      });

      subtitleSpeaker = 'Film İzleyen Adam';
      subtitleText = '"Defol git buradan! Gel buraya!"';
      angrySpeaker = true;
      bubbleTarget = 'npc';
      bubbleText = 'GEL BURAYA!';
      bubbleAngry = true;

      // Side-diagonal action shot framing both attacker and flinching player cleanly
      const shake = attackPhase >= 0.85 && attackPhase < 1.25 ? Math.sin(attackPhase * 65) * 0.06 : 0;
      this.camPos.set(14.15 + shake, 4.65 + shake * 0.5, -1.65);
      this.camLook.set(11.65, 4.22, -1.55);
    }
    // -----------------------------------------------------------------------
    // BEAT 4 (9.3s - ~16.5s): Character sprints away & NPC chases down stairs!
    // -----------------------------------------------------------------------
    else {
      this.stage = 'chase';
      const chaseT = t - 9.3;
      const playerSpeed = 5.2;
      const npcSpeed = 4.65;

      if (!this.chaseSpeechFired) {
        this.chaseSpeechFired = true;
        audio.speakTurkish('Eyvah! Abi sadece dondurma sormuştum, kaç!', 1.08, 1.12);
      }

      const pDist = chaseT * playerSpeed;
      const pDone = pDist >= this.playerPathMeta.total;
      const pYaw = samplePath(ESCAPE_PATH, this.playerPathMeta.cum, pDist, this.tmpPos);

      // Automatically swing open Ev 1 front door as player nears doorway
      if (!this.doorOpenedFired && this.tmpPos.y < 1.0 && this.tmpPos.z < -6.8) {
        this.doorOpenedFired = true;
        houses.openHouse1Door();
      }

      player.updateScripted({
        dt,
        pos: this.tmpPos,
        yaw: pDone ? Math.atan2(this.tmpPos.x - 12.6, this.tmpPos.z + 9.0) : pYaw,
        moveSpeed: pDone ? 0 : playerSpeed,
        isSprinting: !pDone,
        animPose: 'idle',
        elapsed: t,
        audio,
      });

      // NPC chases ~0.45s behind player down the stairs to the front doorway/stoop
      const npcDist = Math.max(0, (chaseT - 0.42) * npcSpeed);
      const npcAtDoor = npcDist >= this.npcPathMeta.total;
      const npcYaw = samplePath(NPC_CHASE_PATH, this.npcPathMeta.cum, npcDist, this.tmpNpcWorld);
      this.tmpNpcLocal.copy(this.tmpNpcWorld).sub(h1Origin);

      if (npcAtDoor && !this.npcAngryLineFired) {
        this.npcAngryLineFired = true;
        audio.playNpcReact();
        audio.speakTurkish('Bir daha gelme buraya!', 0.85, 1.05);
      }

      npc.setStoryMode(npcAtDoor ? 'angry_idle' : 'chase', {
        localPos: this.tmpNpcLocal,
        yaw: npcAtDoor ? Math.atan2(this.tmpPos.x - this.tmpNpcWorld.x, this.tmpPos.z - this.tmpNpcWorld.z) : npcYaw,
        moveSpeed: npcAtDoor ? 0 : npcSpeed,
      });

      if (chaseT < 2.2) {
        subtitleSpeaker = 'Sen';
        subtitleText = '"Eyvah! Abi sadece dondurma sormuştum!"';
        bubbleTarget = 'player';
        bubbleText = 'EYVAH! KAÇ KAÇ!';
      } else if (npcAtDoor) {
        subtitleSpeaker = 'Film İzleyen Adam';
        subtitleText = '"Bir daha gelme buraya!"';
        angrySpeaker = true;
        bubbleTarget = 'npc';
        bubbleText = 'BİR DAHA GELME!';
        bubbleAngry = true;
      } else {
        subtitleSpeaker = 'Film İzleyen Adam';
        subtitleText = '"Kaçma lan! Yakalayacağım seni!"';
        angrySpeaker = true;
      }

      // Dynamic story-mode chase cameras
      const progress = pDist / this.playerPathMeta.total;
      if (progress < 0.25) {
        if (this.lastChaseCut !== 0) {
          this.lastChaseCut = 0;
          this.camPos.set(15.2, 4.95, -3.4);
        }
        this.camLook.set(this.tmpPos.x, this.tmpPos.y + 1.25, this.tmpPos.z);
      } else if (progress < 0.56) {
        if (this.lastChaseCut !== 1) {
          this.lastChaseCut = 1;
          this.camPos.set(11.3, 2.15, -4.4);
        }
        this.camLook.set(this.tmpPos.x, this.tmpPos.y + 1.15, this.tmpPos.z);
      } else {
        if (this.lastChaseCut !== 2) {
          this.lastChaseCut = 2;
          this.camPos.set(15.2, 2.45, -20.5);
          this.camLook.set(12.2, 1.2, -12.0);
        }
        const doorPos = new THREE.Vector3(12.6, 1.2, -9.2);
        this.tmpLookAt.copy(this.tmpPos).add(new THREE.Vector3(0, 1.1, 0)).lerp(doorPos, 0.35);
        this.camLook.lerp(this.tmpLookAt, Math.min(1, dt * 8));
      }

      if (chaseT >= this.playerPathMeta.total / playerSpeed + 1.6) {
        this.finish('Film izleyen adamdan kıl payı kaçtın!');
        return;
      }
    }

    if (!externalCameraActive) {
      this.activeCam.camera.position.copy(this.camPos);
      this.activeCam.camera.lookAt(this.camLook);
      this.activeCam.camera.fov = 56;
      this.activeCam.camera.updateProjectionMatrix();
    }

    // Project 3D speech bubble to screen coordinates
    let projectedBubble: { text: string; x: number; y: number; angry?: boolean } | null = null;
    if (bubbleTarget) {
      if (bubbleTarget === 'player') {
        player.getHeadWorldPosition(this.tmpHead);
      } else {
        npc.getHeadWorldPosition(this.tmpHead);
      }
      this.tmpHead.project(this.activeCam.camera);
      if (this.tmpHead.z > -1 && this.tmpHead.z < 1) {
        const sx = (this.tmpHead.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-this.tmpHead.y * 0.5 + 0.5) * window.innerHeight - 10;
        projectedBubble = {
          text: bubbleText,
          x: THREE.MathUtils.clamp(sx, 90, window.innerWidth - 90),
          y: THREE.MathUtils.clamp(sy, 110, window.innerHeight - 130),
          angry: bubbleAngry,
        };
      }
    }

    this.activeUi.updateStoryUI({
      speaker: subtitleSpeaker,
      text: subtitleText,
      angrySpeaker,
      watchProgress,
      watchSecondsLeft,
      bubble: projectedBubble,
    });
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
