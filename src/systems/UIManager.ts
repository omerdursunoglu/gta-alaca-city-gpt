import { FpsLimit, GamePhase, GameSettings, QualityLevel, WeaponId } from '../types/game';
import { InputManager } from './InputManager';
import { WEAPONS } from './WeaponManager';

const FPS_OPTIONS: FpsLimit[] = [30, 45, 60, 90, 120];
const WEAPON_ORDER: WeaponId[] = ['fist', 'knife', 'pistol', 'smg'];

export class UIManager {
  private root: HTMLElement;
  private startOverlay!: HTMLElement;
  private pauseOverlay!: HTMLElement;
  private hudLayer!: HTMLElement;
  private mobileLayer!: HTMLElement;
  private storyOverlay!: HTMLElement;
  private storySubtitleEl!: HTMLElement;
  private storySpeakerEl!: HTMLElement;
  private storyLineEl!: HTMLElement;
  private storyWatchPill!: HTMLElement;
  private storyWatchText!: HTMLElement;
  private storyWatchFill!: HTMLElement;
  private storyBubbleEl!: HTMLElement;
  private storyModeActive = false;
  private currentPhase: GamePhase = 'menu';

  // HUD elements
  private healthFill!: HTMLElement;
  private healthText!: HTMLElement;
  private fpsBadge!: HTMLElement;
  private districtBadge!: HTMLElement;
  private weaponNameEl!: HTMLElement;
  private weaponAmmoEl!: HTMLElement;
  private crosshairEl!: HTMLElement;
  private interactEl!: HTMLElement;
  private toastEl!: HTMLElement;
  private toastTimer = 0;

  private settings: GameSettings;
  private input: InputManager;
  private onStart: () => void;
  private onResume: () => void;
  private onPause: () => void;
  private onMainMenu: () => void;
  private onSettingsChanged: (s: GameSettings) => void;
  private onStorySkip?: () => void;

  constructor(
    root: HTMLElement,
    initialSettings: GameSettings,
    input: InputManager,
    callbacks: {
      onStart: () => void;
      onResume: () => void;
      onPause: () => void;
      onMainMenu: () => void;
      onSettingsChanged: (s: GameSettings) => void;
      onStorySkip?: () => void;
    }
  ) {
    this.root = root;
    this.settings = { ...initialSettings };
    this.input = input;
    this.onStart = callbacks.onStart;
    this.onResume = callbacks.onResume;
    this.onPause = callbacks.onPause;
    this.onMainMenu = callbacks.onMainMenu;
    this.onSettingsChanged = callbacks.onSettingsChanged;
    this.onStorySkip = callbacks.onStorySkip;

    this.buildDOM();
    this.syncSettingsUI();
  }

  private buildDOM(): void {
    // 1. START SCREEN
    this.startOverlay = document.createElement('div');
    this.startOverlay.className = 'overlay-screen';
    this.startOverlay.innerHTML = `
      <div class="menu-card">
        <div class="game-logo">GTA ALACA CITY</div>
        <div class="game-subtitle">Tokat Merkez • Rüstem Çelebi Mah. • Alaca Mescit Camii</div>
        <div class="menu-buttons">
          <button class="btn btn-primary" data-action="start">Oyuna Başla</button>
          <button class="btn" data-panel="settings">Ayarlar</button>
          <button class="btn" data-panel="controls">Kontroller</button>
          <button class="btn" data-panel="sources">Kaynaklar ve Lisanslar</button>
        </div>

        <div class="subpanel hidden" data-sub="settings">
          <h3>Performans ve Ses Ayarları</h3>
          <div class="setting-row">
            <span>FPS Sınırı (Varsayılan: 30)</span>
            <div class="pill-group" data-fps-group></div>
          </div>
          <div class="setting-row">
            <span>Grafik Kalitesi</span>
            <div class="pill-group" data-quality-group></div>
          </div>
          <div class="setting-row">
            <span>Ses Düzeyi</span>
            <input type="range" min="0" max="100" value="${Math.round(this.settings.volume * 100)}" data-volume-slider />
          </div>
          <div class="setting-row">
            <span>Sessiz Mod</span>
            <button class="pill" data-mute-btn>Açık</button>
          </div>
        </div>

        <div class="subpanel hidden" data-sub="controls">
          <h3>Masaüstü ve Mobil Kontroller</h3>
          <div class="info-list">
            <p><strong>W A S D:</strong> Hareket &nbsp;|&nbsp; <strong>Shift:</strong> Koşma &nbsp;|&nbsp; <strong>Space:</strong> Zıplama</p>
            <p><strong>Fare:</strong> Kamera &nbsp;|&nbsp; <strong>Sol Tık:</strong> Saldırı / Ateş</p>
            <p><strong>1-4:</strong> Silah Seçimi (Yumruk, Bıçak, Tabanca, Tarama)</p>
            <p><strong>R:</strong> Şarjör Değiştir &nbsp;|&nbsp; <strong>E:</strong> Kapı / Çeşme Etkileşimi &nbsp;|&nbsp; <strong>Esc:</strong> Duraklat</p>
            <p style="margin-top:6px;"><strong>Mobil:</strong> Sol sanal joystick, sağ alan kamera sürükleme, dokunmatik ateş/zıplama/koşma/etkileşim düğmeleri.</p>
          </div>
        </div>

        <div class="subpanel hidden" data-sub="sources">
          <h3>Kaynaklar ve Lisanslar</h3>
          <div class="info-list">
            <p><strong>Harita & Yol Geometrisi:</strong> © OpenStreetMap contributors (ODbL 1.0) — way/1372898868 (Alaca Mescit Camii, 40.31609°N, 36.54457°E) ve çevresi.</p>
            <p><strong>Mimari Referanslar:</strong> T.C. Kültür ve Turizm Bakanlığı Kültür Portalı & Tokat Turizm Tanıtma Derneği (TUDER) halka açık envanter metinleri.</p>
            <p><strong>3D Modeller & Dokular:</strong> Proje için özel üretilmiş prosedürel Three.js geometrileri ve PBR kanvas dokular (telif veya Google Maps içeriği kullanılmamıştır).</p>
            <p><strong>Gerçek Sesler:</strong> CC0 1.0 (Kamu Malı) lisanslı gerçek ses kayıtları (lavenderdotpet/CC0-Public-Domain-Sounds, Kenney, Warfork CC0, Micro Pack - Cat Meows).</p>
          </div>
        </div>
      </div>
    `;

    // 2. PAUSE MENU
    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.className = 'overlay-screen hidden';
    this.pauseOverlay.innerHTML = `
      <div class="menu-card">
        <div class="game-logo" style="font-size:28px;">OYUN DURAKLATILDI</div>
        <div class="game-subtitle">GTA ALACA CITY • Seçenekler</div>
        <div class="subpanel" style="display:block; border-top:none; margin-top:8px;">
          <div class="setting-row">
            <span>FPS Sınırı</span>
            <div class="pill-group" data-fps-group></div>
          </div>
          <div class="setting-row">
            <span>Grafik Kalitesi</span>
            <div class="pill-group" data-quality-group></div>
          </div>
          <div class="setting-row">
            <span>Ses Düzeyi</span>
            <input type="range" min="0" max="100" value="${Math.round(this.settings.volume * 100)}" data-volume-slider />
          </div>
          <div class="setting-row">
            <span>Sessiz Mod</span>
            <button class="pill" data-mute-btn>Açık</button>
          </div>
        </div>
        <div class="menu-buttons">
          <button class="btn btn-primary" data-action="resume">Oyuna Devam Et</button>
          <button class="btn" data-action="mainmenu">Ana Menü</button>
        </div>
      </div>
    `;

    // 3. IN-GAME HUD
    this.hudLayer = document.createElement('div');
    this.hudLayer.className = 'hud-layer hidden';
    this.hudLayer.innerHTML = `
      <div class="hud-top-left">
        <div class="health-wrap">
          <div class="health-label"><span>SAĞLIK</span><span data-health-text>100</span></div>
          <div class="health-bar-bg"><div class="health-bar-fill" data-health-fill></div></div>
        </div>
        <div class="hud-badge" data-district-badge>Rüstem Çelebi Mah. • Alaca Mescit</div>
        <div class="hud-badge" data-fps-badge>FPS: 30 / Hedef 30</div>
      </div>
      <div class="hud-top-right">
        <button class="hud-pause-btn" data-hud-pause>Menü (Esc)</button>
        <div class="weapon-panel">
          <div class="weapon-name" data-weapon-name>1. Yumruk</div>
          <div class="weapon-ammo" data-weapon-ammo>Yakın Dövüş</div>
        </div>
      </div>
      <div class="crosshair hidden" data-crosshair></div>
      <div class="interact-prompt hidden" data-interact-prompt>[E] Etkileşim</div>
      <div class="toast-msg hidden" data-toast></div>
    `;

    // 4. MOBILE TOUCH CONTROLS (ONLY ON TOUCH DEVICES)
    this.mobileLayer = document.createElement('div');
    this.mobileLayer.className = 'mobile-controls hidden';
    this.mobileLayer.innerHTML = `
      <div class="joystick-zone" data-joystick>
        <div class="joystick-knob" data-joy-knob></div>
      </div>
      <div class="camera-touch-zone" data-cam-pad></div>
      <div class="mobile-action-cluster">
        <button class="m-btn" data-m="weapon">Silah</button>
        <button class="m-btn" data-m="reload">Şarjör</button>
        <button class="m-btn" data-m="fullscreen">Tam Ekran</button>
        <button class="m-btn" data-m="sprint">Koş</button>
        <button class="m-btn" data-m="interact">Etkileşim</button>
        <button class="m-btn" data-m="jump">Zıpla</button>
        <button class="m-btn" data-m="melee">Saldır</button>
        <button class="m-btn m-btn-fire" data-m="fire" style="grid-column: span 2; width: 112px; border-radius: 26px;">ATEŞ / VUR</button>
      </div>
    `;

    this.root.appendChild(this.startOverlay);
    this.root.appendChild(this.pauseOverlay);
    this.root.appendChild(this.hudLayer);
    this.root.appendChild(this.mobileLayer);

    // 5. STORY MODE CINEMATIC OVERLAY
    this.storyOverlay = document.createElement('div');
    this.storyOverlay.className = 'story-overlay hidden';
    this.storyOverlay.innerHTML = `
      <div class="letterbox-bar letterbox-top"></div>
      <div class="letterbox-bar letterbox-bottom"></div>
      <div class="story-header">
        <div class="story-badge"><span class="story-badge-dot"></span><span>HİKAYE MODU • SAHNE</span></div>
        <button class="story-skip-btn" data-story-skip>Sahneyi Geç (Enter)</button>
      </div>
      <div class="story-bubble hidden" data-story-bubble></div>
      <div class="story-subtitle-wrap">
        <div class="story-watch-pill hidden" data-story-watch-pill>
          <span data-story-watch-text>Film izleniyor...</span>
          <div class="story-watch-track"><div class="story-watch-fill" data-story-watch-fill></div></div>
        </div>
        <div class="story-subtitle hidden" data-story-subtitle>
          <span class="story-speaker" data-story-speaker></span>
          <span class="story-line" data-story-line></span>
        </div>
      </div>
    `;
    this.root.appendChild(this.storyOverlay);

    this.storySubtitleEl = this.storyOverlay.querySelector('[data-story-subtitle]')!;
    this.storySpeakerEl = this.storyOverlay.querySelector('[data-story-speaker]')!;
    this.storyLineEl = this.storyOverlay.querySelector('[data-story-line]')!;
    this.storyWatchPill = this.storyOverlay.querySelector('[data-story-watch-pill]')!;
    this.storyWatchText = this.storyOverlay.querySelector('[data-story-watch-text]')!;
    this.storyWatchFill = this.storyOverlay.querySelector('[data-story-watch-fill]')!;
    this.storyBubbleEl = this.storyOverlay.querySelector('[data-story-bubble]')!;
    this.storyOverlay.querySelector('[data-story-skip]')?.addEventListener('click', () => {
      this.onStorySkip?.();
    });

    this.healthFill = this.hudLayer.querySelector('[data-health-fill]')!;
    this.healthText = this.hudLayer.querySelector('[data-health-text]')!;
    this.fpsBadge = this.hudLayer.querySelector('[data-fps-badge]')!;
    this.districtBadge = this.hudLayer.querySelector('[data-district-badge]')!;
    this.weaponNameEl = this.hudLayer.querySelector('[data-weapon-name]')!;
    this.weaponAmmoEl = this.hudLayer.querySelector('[data-weapon-ammo]')!;
    this.crosshairEl = this.hudLayer.querySelector('[data-crosshair]')!;
    this.interactEl = this.hudLayer.querySelector('[data-interact-prompt]')!;
    this.toastEl = this.hudLayer.querySelector('[data-toast]')!;

    this.wireMenuEvents();
    this.wireMobileEvents();
  }

  private wireMenuEvents(): void {
    this.startOverlay.querySelector('[data-action="start"]')?.addEventListener('click', () => this.onStart());
    this.pauseOverlay.querySelector('[data-action="resume"]')?.addEventListener('click', () => this.onResume());
    this.pauseOverlay.querySelector('[data-action="mainmenu"]')?.addEventListener('click', () => this.onMainMenu());
    this.hudLayer.querySelector('[data-hud-pause]')?.addEventListener('click', () => this.onPause());

    this.startOverlay.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.panel;
        this.startOverlay.querySelectorAll<HTMLElement>('[data-sub]').forEach((panel) => {
          if (panel.dataset.sub === target) panel.classList.toggle('hidden');
          else panel.classList.add('hidden');
        });
      });
    });

    // Populate FPS & Quality pills in both Start and Pause menus
    for (const container of [this.startOverlay, this.pauseOverlay]) {
      const fpsGroup = container.querySelector('[data-fps-group]')!;
      FPS_OPTIONS.forEach((fps) => {
        const b = document.createElement('button');
        b.className = 'pill';
        b.textContent = `${fps}`;
        b.dataset.fps = String(fps);
        b.addEventListener('click', () => {
          this.settings.fpsLimit = fps;
          this.syncSettingsUI();
          this.onSettingsChanged({ ...this.settings });
        });
        fpsGroup.appendChild(b);
      });

      const qGroup = container.querySelector('[data-quality-group]')!;
      const qLabels: [QualityLevel, string][] = [
        ['low', 'Düşük'],
        ['medium', 'Orta'],
        ['high', 'Yüksek'],
      ];
      qLabels.forEach(([q, label]) => {
        const b = document.createElement('button');
        b.className = 'pill';
        b.textContent = label;
        b.dataset.quality = q;
        b.addEventListener('click', () => {
          this.settings.quality = q;
          this.syncSettingsUI();
          this.onSettingsChanged({ ...this.settings });
        });
        qGroup.appendChild(b);
      });

      const volSlider = container.querySelector<HTMLInputElement>('[data-volume-slider]')!;
      volSlider.addEventListener('input', () => {
        this.settings.volume = Number(volSlider.value) / 100;
        this.syncSettingsUI();
        this.onSettingsChanged({ ...this.settings });
      });

      const muteBtn = container.querySelector<HTMLButtonElement>('[data-mute-btn]')!;
      muteBtn.addEventListener('click', () => {
        this.settings.muted = !this.settings.muted;
        this.syncSettingsUI();
        this.onSettingsChanged({ ...this.settings });
      });
    }
  }

  private wireMobileEvents(): void {
    const joy = this.mobileLayer.querySelector<HTMLElement>('[data-joystick]')!;
    const knob = this.mobileLayer.querySelector<HTMLElement>('[data-joy-knob]')!;
    let joyTouchId: number | null = null;
    const maxR = 42;

    const updateJoy = (clientX: number, clientY: number) => {
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.mobileMoveX = dx / maxR;
      this.input.mobileMoveY = -dy / maxR;
    };

    joy.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      updateJoy(t.clientX, t.clientY);
    });
    joy.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyTouchId) updateJoy(t.clientX, t.clientY);
      }
    });
    const resetJoy = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyTouchId) {
          joyTouchId = null;
          knob.style.transform = 'translate(0px, 0px)';
          this.input.mobileMoveX = 0;
          this.input.mobileMoveY = 0;
        }
      }
    };
    joy.addEventListener('touchend', resetJoy);
    joy.addEventListener('touchcancel', resetJoy);

    // Camera touch pad
    const camPad = this.mobileLayer.querySelector<HTMLElement>('[data-cam-pad]')!;
    let camTouchId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    camPad.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      camTouchId = t.identifier;
      lastX = t.clientX;
      lastY = t.clientY;
    });
    camPad.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === camTouchId) {
          this.input.addMobileLookDelta(t.clientX - lastX, t.clientY - lastY);
          lastX = t.clientX;
          lastY = t.clientY;
        }
      }
    });
    const endCam = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === camTouchId) camTouchId = null;
      }
    };
    camPad.addEventListener('touchend', endCam);
    camPad.addEventListener('touchcancel', endCam);

    // Action buttons
    let weaponIdx = 0;
    const btn = (name: string) => this.mobileLayer.querySelector<HTMLElement>(`[data-m="${name}"]`)!;

    const fireBtn = btn('fire');
    fireBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.mobileFiring = true;
    });
    fireBtn.addEventListener('touchend', () => (this.input.mobileFiring = false));
    fireBtn.addEventListener('touchcancel', () => (this.input.mobileFiring = false));

    btn('melee').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.triggerWeaponSelect('fist');
      this.input.mobileFiring = true;
      setTimeout(() => (this.input.mobileFiring = false), 120);
    });
    btn('jump').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.triggerJump();
    });
    btn('interact').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.triggerInteract();
    });
    btn('reload').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.triggerReload();
    });
    const sprintBtn = btn('sprint');
    sprintBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.input.mobileSprinting = !this.input.mobileSprinting;
      sprintBtn.classList.toggle('active', this.input.mobileSprinting);
    });
    btn('weapon').addEventListener('touchstart', (e) => {
      e.preventDefault();
      weaponIdx = (weaponIdx + 1) % WEAPON_ORDER.length;
      this.input.triggerWeaponSelect(WEAPON_ORDER[weaponIdx]);
    });
    btn('fullscreen').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        try {
          (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {});
        } catch {
          // ignore orientation lock rejection on unsupported browsers
        }
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });
  }

  private syncSettingsUI(): void {
    document.querySelectorAll<HTMLElement>('[data-fps]').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.fps) === this.settings.fpsLimit);
    });
    document.querySelectorAll<HTMLElement>('[data-quality]').forEach((el) => {
      el.classList.toggle('active', el.dataset.quality === this.settings.quality);
    });
    document.querySelectorAll<HTMLInputElement>('[data-volume-slider]').forEach((el) => {
      el.value = String(Math.round(this.settings.volume * 100));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-mute-btn]').forEach((el) => {
      el.textContent = this.settings.muted ? 'Sessiz' : 'Açık';
      el.classList.toggle('active', this.settings.muted);
    });
  }

  setPhase(phase: GamePhase): void {
    this.currentPhase = phase;
    this.startOverlay.classList.toggle('hidden', phase !== 'menu');
    this.pauseOverlay.classList.toggle('hidden', phase !== 'paused');
    this.syncPlayVisibility();
  }

  setStoryMode(active: boolean): void {
    this.storyModeActive = active;
    this.syncPlayVisibility();
    if (!active) {
      this.storySubtitleEl.classList.add('hidden');
      this.storyWatchPill.classList.add('hidden');
      this.storyBubbleEl.classList.add('hidden');
    }
  }

  private syncPlayVisibility(): void {
    const inPlay = this.currentPhase === 'playing';
    this.hudLayer.classList.toggle('hidden', !inPlay || this.storyModeActive);
    const showMobile = inPlay && !this.storyModeActive && (this.input.isTouchDevice || window.innerWidth <= 768);
    this.mobileLayer.classList.toggle('hidden', !showMobile);
    this.storyOverlay.classList.toggle('hidden', !inPlay || !this.storyModeActive);
  }

  updateStoryUI(opts: {
    speaker?: string | null;
    text?: string | null;
    angrySpeaker?: boolean;
    watchProgress?: number | null;
    watchSecondsLeft?: number;
    bubble?: { text: string; x: number; y: number; angry?: boolean } | null;
  }): void {
    if (opts.text) {
      this.storySpeakerEl.textContent = opts.speaker ? `${opts.speaker}:` : '';
      this.storySpeakerEl.classList.toggle('angry', Boolean(opts.angrySpeaker));
      this.storyLineEl.textContent = opts.text;
      this.storySubtitleEl.classList.remove('hidden');
    } else {
      this.storySubtitleEl.classList.add('hidden');
    }

    if (opts.watchProgress !== null && opts.watchProgress !== undefined) {
      const pct = Math.max(0, Math.min(100, opts.watchProgress * 100));
      this.storyWatchFill.style.width = `${pct.toFixed(1)}%`;
      const secs = Math.max(1, Math.ceil(opts.watchSecondsLeft ?? 0));
      this.storyWatchText.textContent = `Film izleniyor... (${secs} sn)`;
      this.storyWatchPill.classList.remove('hidden');
    } else {
      this.storyWatchPill.classList.add('hidden');
    }

    if (opts.bubble) {
      this.storyBubbleEl.textContent = opts.bubble.text;
      this.storyBubbleEl.style.left = `${opts.bubble.x}px`;
      this.storyBubbleEl.style.top = `${opts.bubble.y}px`;
      this.storyBubbleEl.classList.toggle('angry', Boolean(opts.bubble.angry));
      this.storyBubbleEl.classList.remove('hidden');
    } else {
      this.storyBubbleEl.classList.add('hidden');
    }
  }

  showToast(msg: string, seconds = 2.6): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    this.toastTimer = seconds;
  }

  updateHUD(
    dt: number,
    health: number,
    maxHealth: number,
    actualFps: number,
    fpsLimit: FpsLimit,
    indoorLabel: string | null,
    weaponId: WeaponId,
    magAmmo: number,
    reserveAmmo: number,
    reloading: boolean,
    interactLabel: string | null
  ): void {
    this.healthFill.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
    this.healthText.textContent = `${Math.round(health)}`;
    this.fpsBadge.textContent = `FPS: ${actualFps} / Hedef ${fpsLimit}`;
    this.districtBadge.textContent = indoorLabel ?? 'Rüstem Çelebi Mah. • Alaca Mescit';

    const w = WEAPONS[weaponId];
    this.weaponNameEl.textContent = `${w.slot}. ${w.name}`;
    if (w.magSize > 0) {
      this.weaponAmmoEl.textContent = reloading ? 'Şarjör Değiştiriliyor...' : `${magAmmo} / ${reserveAmmo}`;
      this.crosshairEl.classList.remove('hidden');
    } else {
      this.weaponAmmoEl.textContent = 'Yakın Dövüş';
      this.crosshairEl.classList.add('hidden');
    }

    if (interactLabel) {
      this.interactEl.textContent = `[E] ${interactLabel}`;
      this.interactEl.classList.remove('hidden');
    } else {
      this.interactEl.classList.add('hidden');
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.add('hidden');
    }
  }
}
