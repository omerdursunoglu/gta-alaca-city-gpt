/**
 * 100% original procedural Web Audio API sound engine (zero copyrighted audio assets).
 * Synthesizes daytime Tokat street ambiance, indoor room tone, footsteps (stone vs wood),
 * door hinge/latch, water fountain trickle, fist/knife/pistol/SMG SFX, reloads,
 * NPC vocal surprise tones, and cat meows.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private volume = 0.7;
  private muted = false;
  private initialized = false;

  unlock(): void {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : this.volume;
    this.masterGain.connect(this.ctx.destination);

    // Gentle filtered pink-ish daytime breeze ambiance
    const bufLen = this.ctx.sampleRate * 2;
    const noiseBuf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.03 * white) / 1.03;
      data[i] = last * 1.8;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;

    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.value = 460;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.08;

    src.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);
    src.start();

    this.initialized = true;
  }

  setVolume(vol: number, muted: boolean): void {
    this.volume = vol;
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : vol, this.ctx.currentTime, 0.04);
    }
  }

  setIndoors(indoors: boolean): void {
    if (!this.ctx || !this.ambientFilter || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    this.ambientFilter.frequency.setTargetAtTime(indoors ? 180 : 480, t, 0.25);
    this.ambientGain.gain.setTargetAtTime(indoors ? 0.035 : 0.085, t, 0.25);
  }

  private playNoiseBurst(duration: number, freq: number, q: number, gainPeak: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const len = Math.max(256, Math.floor(this.ctx.sampleRate * duration));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(gainPeak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }

  playFootstep(indoors: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const pitch = indoors ? 180 + Math.random() * 45 : 320 + Math.random() * 80;
    this.playNoiseBurst(0.065, pitch, indoors ? 1.8 : 0.9, indoors ? 0.14 : 0.1);
  }

  playDoor(open: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(open ? 140 : 190, now);
    osc.frequency.exponentialRampToValueAtTime(open ? 220 : 110, now + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  playWaterSplash(): void {
    this.playNoiseBurst(0.28, 1250, 1.4, 0.16);
  }

  playPunch(): void {
    this.playNoiseBurst(0.09, 260, 0.8, 0.24);
  }

  playKnife(): void {
    this.playNoiseBurst(0.11, 1800, 2.2, 0.15);
  }

  playPistol(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.playNoiseBurst(0.16, 950, 0.6, 0.42);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playSmg(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.playNoiseBurst(0.09, 1300, 0.7, 0.3);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  playReload(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    this.playNoiseBurst(0.04, 2400, 3.0, 0.16);
    setTimeout(() => this.playNoiseBurst(0.05, 1700, 2.5, 0.2), 260);
  }

  playNpcReact(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(290 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playCatMeow(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const base = 540 + Math.random() * 140;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.28, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(base * 0.72, now + 0.28);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }
}
