/**
 * Real-world CC0 audio engine powered by Web Audio API AudioBuffer decoding.
 * All 17 MP3 samples in public/audio/ are CC0 1.0 Universal (Public Domain) recordings
 * with smooth indoor/outdoor ambient crossfading and subtle pitch variation.
 */

const AUDIO_FILES = {
  ambient_street: './audio/ambient_street.mp3',
  ambient_indoor: './audio/ambient_indoor.mp3',
  footstep_stone_0: './audio/footstep_stone_0.mp3',
  footstep_stone_1: './audio/footstep_stone_1.mp3',
  footstep_wood_0: './audio/footstep_wood_0.mp3',
  footstep_wood_1: './audio/footstep_wood_1.mp3',
  door_open: './audio/door_open.mp3',
  door_close: './audio/door_close.mp3',
  water_splash: './audio/water_splash.mp3',
  punch: './audio/punch.mp3',
  knife: './audio/knife.mp3',
  pistol: './audio/pistol.mp3',
  smg: './audio/smg.mp3',
  reload: './audio/reload.mp3',
  npc_react: './audio/npc_react.mp3',
  cat_meow_0: './audio/cat_meow_0.mp3',
  cat_meow_1: './audio/cat_meow_1.mp3',
} as const;

type SoundKey = keyof typeof AUDIO_FILES;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private streetGain: GainNode | null = null;
  private indoorGain: GainNode | null = null;
  private buffers = new Map<SoundKey, AudioBuffer>();

  private volume = 0.7;
  private muted = false;
  private indoors = false;
  private initialized = false;
  private loadingStarted = false;

  unlock(): void {
    if (!this.initialized) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.streetGain = this.ctx.createGain();
      this.streetGain.gain.value = this.indoors ? 0.04 : 0.24;
      this.streetGain.connect(this.masterGain);

      this.indoorGain = this.ctx.createGain();
      this.indoorGain.gain.value = this.indoors ? 0.22 : 0.0;
      this.indoorGain.connect(this.masterGain);

      this.initialized = true;
    }

    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.loadingStarted) {
      this.loadingStarted = true;
      void this.preloadAll();
    }
  }

  private async preloadAll(): Promise<void> {
    if (!this.ctx) return;
    const entries = Object.entries(AUDIO_FILES) as [SoundKey, string][];
    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const arr = await res.arrayBuffer();
          if (!this.ctx) return;
          const decoded = await this.ctx.decodeAudioData(arr);
          this.buffers.set(key, decoded);

          if (key === 'ambient_street' && this.streetGain) {
            this.startLoop(decoded, this.streetGain);
          } else if (key === 'ambient_indoor' && this.indoorGain) {
            this.startLoop(decoded, this.indoorGain);
          }
        } catch {
          // Ignore individual decode failure cleanly
        }
      })
    );
  }

  private startLoop(buf: AudioBuffer, dest: GainNode): void {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(dest);
    src.start();
  }

  setVolume(vol: number, muted: boolean): void {
    this.volume = vol;
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : vol, this.ctx.currentTime, 0.04);
    }
  }

  setIndoors(indoors: boolean): void {
    if (this.indoors === indoors) return;
    this.indoors = indoors;
    if (!this.ctx || !this.streetGain || !this.indoorGain) return;
    const t = this.ctx.currentTime;
    this.streetGain.gain.setTargetAtTime(indoors ? 0.04 : 0.24, t, 0.35);
    this.indoorGain.gain.setTargetAtTime(indoors ? 0.22 : 0.0, t, 0.35);
  }

  private playBuffer(key: SoundKey, gainVal = 0.65, pitchJitter = 0.05, basePitch = 1.0): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const buf = this.buffers.get(key);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = basePitch + (Math.random() * 2 - 1) * pitchJitter;

    const g = this.ctx.createGain();
    g.gain.value = gainVal;
    src.connect(g);
    g.connect(this.masterGain);
    src.start();
  }

  playFootstep(indoors: boolean): void {
    const idx = Math.random() > 0.5 ? 0 : 1;
    const key: SoundKey = indoors
      ? idx === 0
        ? 'footstep_wood_0'
        : 'footstep_wood_1'
      : idx === 0
        ? 'footstep_stone_0'
        : 'footstep_stone_1';
    this.playBuffer(key, indoors ? 0.42 : 0.36, 0.08);
  }

  playDoor(open: boolean): void {
    this.playBuffer(open ? 'door_open' : 'door_close', 0.65, 0.04);
  }

  playWaterSplash(): void {
    this.playBuffer('water_splash', 0.55, 0.06);
  }

  playPunch(): void {
    this.playBuffer('punch', 0.72, 0.08);
  }

  playKnife(): void {
    this.playBuffer('knife', 0.6, 0.08);
  }

  playPistol(): void {
    this.playBuffer('pistol', 0.78, 0.04);
  }

  playSmg(): void {
    this.playBuffer('smg', 0.62, 0.05);
  }

  playReload(): void {
    this.playBuffer('reload', 0.58, 0.03);
  }

  playNpcReact(): void {
    this.playBuffer('npc_react', 0.48, 0.07);
  }

  playCatMeow(): void {
    const key: SoundKey = Math.random() > 0.45 ? 'cat_meow_0' : 'cat_meow_1';
    this.playBuffer(key, 0.56, 0.08);
  }
}
