import * as THREE from 'three';

export interface PBRSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/** Deterministic PRNG (Mulberry32) so textures look identical and crisp every run */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function heightCanvasToNormalMap(heightCanvas: HTMLCanvasElement, strength = 2.6): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const hCtx = heightCanvas.getContext('2d')!;
  const src = hCtx.getImageData(0, 0, w, h).data;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const out = outCtx.createImageData(w, h);
  const dst = out.data;

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz);

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  outCtx.putImageData(out, 0, 0);
  return outCanvas;
}

function finishTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  srgb: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function buildPBR(
  albedo: HTMLCanvasElement,
  height: HTMLCanvasElement,
  roughness: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  normalStrength = 2.6
): PBRSet {
  const normal = heightCanvasToNormalMap(height, normalStrength);
  return {
    map: finishTexture(albedo, repeatX, repeatY, true),
    normalMap: finishTexture(normal, repeatX, repeatY, false),
    roughnessMap: finishTexture(roughness, repeatX, repeatY, false),
  };
}

export class ProceduralPBR {
  private cache = new Map<string, PBRSet>();

  /** Rubble stone masonry (moloz taş) for Alaca Mescit main walls */
  getRubbleStone(repeatX = 2, repeatY = 2): PBRSet {
    const key = `rubble_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const rng = makeRng(1300);
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    // Warm lime mortar background
    a.fillStyle = '#9f9482';
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#383838';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#ededed';
    r.fillRect(0, 0, size, size);

    const rows = 10;
    const rowH = size / rows;
    const tones = [
      [142, 130, 114],
      [126, 118, 106],
      [158, 144, 122],
      [112, 106, 98],
      [148, 132, 110],
      [134, 128, 118],
    ];

    for (let row = 0; row < rows; row++) {
      let x = -(rng() * 30);
      while (x < size + 40) {
        const w = 42 + rng() * 58;
        const stoneH = rowH * (0.72 + rng() * 0.2);
        const y = row * rowH + (rowH - stoneH) * 0.5 + (rng() - 0.5) * 4;
        const base = tones[Math.floor(rng() * tones.length)];
        const shift = (rng() - 0.5) * 18;
        const cr = Math.min(255, Math.max(0, Math.round(base[0] + shift)));
        const cg = Math.min(255, Math.max(0, Math.round(base[1] + shift * 0.9)));
        const cb = Math.min(255, Math.max(0, Math.round(base[2] + shift * 0.8)));

        // Irregular polygon stone
        const pts: [number, number][] = [
          [x + 4 + rng() * 5, y + 3 + rng() * 4],
          [x + w * 0.5 + (rng() - 0.5) * 6, y + rng() * 3],
          [x + w - 4 - rng() * 5, y + 3 + rng() * 5],
          [x + w - 2 - rng() * 4, y + stoneH - 3 - rng() * 4],
          [x + w * 0.5 + (rng() - 0.5) * 8, y + stoneH - rng() * 3],
          [x + 3 + rng() * 4, y + stoneH - 2 - rng() * 5],
        ];

        const drawPoly = (ctx: CanvasRenderingContext2D, dx = 0) => {
          ctx.beginPath();
          pts.forEach(([px, py], i) => {
            if (i === 0) ctx.moveTo(px + dx, py);
            else ctx.lineTo(px + dx, py);
          });
          ctx.closePath();
          ctx.fill();
        };

        for (const wrapDx of [0, -size, size]) {
          a.fillStyle = `rgb(${cr},${cg},${cb})`;
          drawPoly(a, wrapDx);

          // Inner stone highlight/weathering speck
          a.fillStyle = `rgba(${cr + 16},${cg + 14},${cb + 10},0.28)`;
          a.fillRect(x + w * 0.2 + wrapDx, y + stoneH * 0.2, w * 0.45, stoneH * 0.35);

          const hVal = Math.round(155 + rng() * 75);
          h.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
          drawPoly(h, wrapDx);

          const rVal = Math.round(185 + rng() * 50);
          r.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
          drawPoly(r, wrapDx);
        }

        x += w + 4 + rng() * 4;
      }
    }

    // Subtle stone grain + moss aging near bottom/crevices
    for (let i = 0; i < 2200; i++) {
      const gx = rng() * size;
      const gy = rng() * size;
      const dark = rng() > 0.5;
      a.fillStyle = dark ? 'rgba(40,35,28,0.12)' : 'rgba(235,225,205,0.1)';
      a.fillRect(gx, gy, 2 + rng() * 3, 2 + rng() * 2);
      h.fillStyle = dark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
      h.fillRect(gx, gy, 2, 2);
    }

    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 3.0);
    this.cache.set(key, set);
    return set;
  }

  /** Ashlar cut stone (düzgün kesme taş) for quoins, window frames, drum, minaret base */
  getCutStone(repeatX = 2, repeatY = 2): PBRSet {
    const key = `cutstone_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const rng = makeRng(1505);
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    a.fillStyle = '#978b78';
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#606060';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#dcdcdc';
    r.fillRect(0, 0, size, size);

    const rows = 8;
    const cols = 4;
    const bh = size / rows;
    const bw = size / cols;

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (bw * 0.5);
      for (let col = -1; col <= cols; col++) {
        const bx = col * bw + offset;
        const by = row * bh;
        const v = (rng() - 0.5) * 18;
        const cr = Math.round(196 + v);
        const cg = Math.round(181 + v * 0.92);
        const cb = Math.round(154 + v * 0.8);

        a.fillStyle = `rgb(${cr},${cg},${cb})`;
        a.fillRect(bx + 2, by + 2, bw - 4, bh - 4);

        // Chiseled bevel highlight
        a.fillStyle = 'rgba(255,248,232,0.14)';
        a.fillRect(bx + 3, by + 3, bw - 6, 4);

        const hv = Math.round(195 + rng() * 35);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.fillRect(bx + 2, by + 2, bw - 4, bh - 4);

        const rv = Math.round(175 + rng() * 45);
        r.fillStyle = `rgb(${rv},${rv},${rv})`;
        r.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
      }
    }

    for (let i = 0; i < 1600; i++) {
      const gx = rng() * size;
      const gy = rng() * size;
      a.fillStyle = rng() > 0.5 ? 'rgba(80,70,56,0.08)' : 'rgba(245,238,220,0.08)';
      a.fillRect(gx, gy, 3, 2);
    }

    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 2.2);
    this.cache.set(key, set);
    return set;
  }

  /** Almaşık masonry (3 rows of Seljuk brick alternating with rubble/cut stone) for West facade */
  getAlmasikBrickStone(repeatX = 2, repeatY = 2): PBRSet {
    const key = `almasik_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const rng = makeRng(1506);
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    a.fillStyle = '#a39784';
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#505050';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#e4e4e4';
    r.fillRect(0, 0, size, size);

    // 4 macro bands: stone course + 3 brick rows
    const bandH = size / 4;
    for (let band = 0; band < 4; band++) {
      const by = band * bandH;
      // Stone course (top 68px of band)
      const stoneH = bandH * 0.52;
      let sx = 0;
      while (sx < size) {
        const sw = 48 + rng() * 44;
        const v = (rng() - 0.5) * 22;
        a.fillStyle = `rgb(${Math.round(156 + v)},${Math.round(142 + v)},${Math.round(123 + v)})`;
        a.fillRect(sx + 2, by + 2, sw - 4, stoneH - 4);
        h.fillStyle = `rgb(${Math.round(175 + rng() * 45)},${Math.round(175 + rng() * 45)},${Math.round(175 + rng() * 45)})`;
        h.fillRect(sx + 2, by + 2, sw - 4, stoneH - 4);
        sx += sw;
      }

      // 3 rows of Seljuk terracotta brick
      const brickAreaH = bandH - stoneH;
      const bRowH = brickAreaH / 3;
      const bW = 42;
      for (let br = 0; br < 3; br++) {
        const ry = by + stoneH + br * bRowH;
        const off = (br % 2) * (bW * 0.5);
        for (let bx = -bW; bx < size + bW; bx += bW) {
          const shift = (rng() - 0.5) * 20;
          a.fillStyle = `rgb(${Math.round(168 + shift)},${Math.round(86 + shift * 0.5)},${Math.round(58 + shift * 0.4)})`;
          a.fillRect(bx + off + 2, ry + 2, bW - 4, bRowH - 4);
          h.fillStyle = 'rgb(205,205,205)';
          h.fillRect(bx + off + 2, ry + 2, bW - 4, bRowH - 4);
          r.fillStyle = 'rgb(200,200,200)';
          r.fillRect(bx + off + 2, ry + 2, bW - 4, bRowH - 4);
        }
      }
    }

    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 2.5);
    this.cache.set(key, set);
    return set;
  }

  /**
   * Seljuk geometric brickwork for the cylindrical minaret shaft:
   * 1) Lower baklava (diamond diaper) zone
   * 2) Interlocking angular S-band
   * 3) Reversed Z-band
   * 4) Herringbone (balık sırtı) band
   */
  getSeljukMinaretBrick(): PBRSet {
    const key = 'seljuk_minaret';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const w = 512;
    const rng = makeRng(1939);
    const [aC, a] = createCanvas(w);
    const [hC, h] = createCanvas(w);
    const [rC, r] = createCanvas(w);

    // Mortar base
    a.fillStyle = '#c9bda8';
    a.fillRect(0, 0, w, w);
    h.fillStyle = '#484848';
    h.fillRect(0, 0, w, w);
    r.fillStyle = '#e6e6e6';
    r.fillRect(0, 0, w, w);

    const drawBrick = (x: number, y: number, bw: number, bh: number, raised: boolean, angle = 0) => {
      const shift = (rng() - 0.5) * 18;
      const col = raised
        ? `rgb(${Math.round(176 + shift)},${Math.round(88 + shift * 0.5)},${Math.round(54 + shift * 0.4)})`
        : `rgb(${Math.round(142 + shift)},${Math.round(74 + shift * 0.5)},${Math.round(48 + shift * 0.4)})`;
      const hv = raised ? 232 : 120;

      for (const ctx of [a, h, r]) {
        ctx.save();
        ctx.translate(x + bw / 2, y + bh / 2);
        if (angle !== 0) ctx.rotate(angle);
        if (ctx === a) ctx.fillStyle = col;
        else if (ctx === h) ctx.fillStyle = `rgb(${hv},${hv},${hv})`;
        else ctx.fillStyle = raised ? 'rgb(185,185,185)' : 'rgb(220,220,220)';
        ctx.fillRect(-bw / 2 + 1, -bh / 2 + 1, bw - 2, bh - 2);
        ctx.restore();
      }
    };

    // Canvas Y=0 is TOP of texture (top of shaft), Y=512 is BOTTOM (above kaide)
    // Zone 4 (Top, y: 0..104): Herringbone (balık sırtı) band
    for (let row = 0; row < 4; row++) {
      const y = row * 26;
      const dir = row % 2 === 0 ? 0.45 : -0.45;
      for (let x = 0; x < w; x += 22) {
        drawBrick(x, y + 3, 20, 18, true, dir);
      }
    }

    // Zone 3 (y: 104..184): Reversed Z band (ters Z kuşağı)
    for (let x = 0; x < w; x += 32) {
      drawBrick(x, 110, 28, 12, true);
      drawBrick(x + 8, 124, 16, 28, true, -0.42);
      drawBrick(x, 156, 28, 12, true);
    }

    // Zone 2 (y: 184..256): Angular reclining S-band
    for (let x = 0; x < w; x += 32) {
      drawBrick(x, 190, 26, 12, true);
      drawBrick(x + 4, 204, 14, 14, true);
      drawBrick(x + 12, 220, 26, 12, true);
      drawBrick(x + 18, 234, 14, 14, true);
    }

    // Zone 1 (Lower shaft, y: 256..512): Shifted diamond (baklava) diaper pattern
    const cellW = 32;
    const cellH = 16;
    for (let row = 0; row < 16; row++) {
      const y = 256 + row * cellH;
      const phase = row % 4;
      const offset = phase * (cellW * 0.25);
      for (let col = -1; col < w / cellW + 1; col++) {
        const x = col * cellW + offset;
        const isRaised = (col + Math.floor(row / 2)) % 2 === 0;
        drawBrick(x, y, cellW * 0.88, cellH * 0.86, isRaised);
      }
    }

    const set = buildPBR(aC, hC, rC, 2, 1, 3.2);
    this.cache.set(key, set);
    return set;
  }

  /** Ottoman terracotta barrel roof tiles (alaturka kiremit) */
  getKiremitRoof(repeatX = 4, repeatY = 4): PBRSet {
    const key = `kiremit_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const rng = makeRng(1952);
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    a.fillStyle = '#7e3622';
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#505050';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#cccccc';
    r.fillRect(0, 0, size, size);

    const cols = 12;
    const rows = 10;
    const tw = size / cols;
    const th = size / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tw;
        const y = row * th;
        const v = (rng() - 0.5) * 26;
        const cr = Math.min(220, Math.max(90, Math.round(168 + v)));
        const cg = Math.min(130, Math.max(45, Math.round(74 + v * 0.5)));
        const cb = Math.min(100, Math.max(30, Math.round(46 + v * 0.35)));

        const grad = a.createLinearGradient(x, y, x + tw, y);
        grad.addColorStop(0, `rgb(${cr - 28},${cg - 15},${cb - 10})`);
        grad.addColorStop(0.45, `rgb(${cr + 14},${cg + 8},${cb + 5})`);
        grad.addColorStop(1, `rgb(${cr - 32},${cg - 18},${cb - 12})`);
        a.fillStyle = grad;
        a.fillRect(x + 1, y + 2, tw - 2, th - 3);

        // Tile shadow lip at bottom
        a.fillStyle = 'rgba(30,12,8,0.35)';
        a.fillRect(x, y + th - 4, tw, 4);

        const hGrad = h.createLinearGradient(x, y, x + tw, y);
        hGrad.addColorStop(0, '#555555');
        hGrad.addColorStop(0.5, '#eaeaea');
        hGrad.addColorStop(1, '#555555');
        h.fillStyle = hGrad;
        h.fillRect(x + 1, y + 2, tw - 2, th - 3);

        const rv = Math.round(170 + rng() * 55);
        r.fillStyle = `rgb(${rv},${rv},${rv})`;
        r.fillRect(x, y, tw, th);
      }
    }

    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 2.8);
    this.cache.set(key, set);
    return set;
  }

  /** Aged Tokat timber (beams, doors, shutters, cumba brackets) */
  getTimber(tintHex = '#5a3b25', repeatX = 1, repeatY = 1): PBRSet {
    const key = `timber_${tintHex}_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const rng = makeRng(700);
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    a.fillStyle = tintHex;
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#909090';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#b8b8b8';
    r.fillRect(0, 0, size, size);

    const planks = 4;
    const pw = size / planks;
    for (let p = 0; p < planks; p++) {
      const px = p * pw;
      // Plank seam
      a.fillStyle = 'rgba(18,10,5,0.45)';
      a.fillRect(px, 0, 2, size);
      h.fillStyle = '#252525';
      h.fillRect(px, 0, 2, size);

      for (let i = 0; i < 36; i++) {
        const gx = px + 3 + rng() * (pw - 6);
        a.fillStyle = rng() > 0.5 ? 'rgba(20,10,4,0.16)' : 'rgba(255,220,180,0.08)';
        a.fillRect(gx, 0, 1 + rng() * 2, size);
        h.fillStyle = rng() > 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
        h.fillRect(gx, 0, 1, size);
      }
    }

    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 1.8);
    this.cache.set(key, set);
    return set;
  }

  /** Traditional lime plaster (kireç/kerpiç sıva) */
  getPlaster(hexColor: string, repeatX = 2, repeatY = 2): PBRSet {
    const key = `plaster_${hexColor}_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const rng = makeRng(hexColor.charCodeAt(1) * 97 + hexColor.charCodeAt(3));
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    a.fillStyle = hexColor;
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#888888';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#dcdcdc';
    r.fillRect(0, 0, size, size);

    for (let i = 0; i < 1400; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const s = 2 + rng() * 6;
      a.fillStyle = rng() > 0.5 ? 'rgba(255,250,240,0.06)' : 'rgba(60,45,30,0.06)';
      a.fillRect(x, y, s, s);
      const hv = Math.round(120 + rng() * 40);
      h.fillStyle = `rgb(${hv},${hv},${hv})`;
      h.fillRect(x, y, s, s);
    }

    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 1.0);
    this.cache.set(key, set);
    return set;
  }

  /** Anatolian street cobblestones (arnavut kaldırımı) */
  getCobblestone(repeatX = 6, repeatY = 6): PBRSet {
    const key = `cobble_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const rng = makeRng(60100);
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    a.fillStyle = '#57524b';
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#303030';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#e0e0e0';
    r.fillRect(0, 0, size, size);

    const rows = 14;
    const cols = 10;
    const ch = size / rows;
    const cw = size / cols;

    for (let row = 0; row < rows; row++) {
      const off = (row % 2) * (cw * 0.5);
      for (let col = -1; col <= cols; col++) {
        const x = col * cw + off;
        const y = row * ch;
        const tone = 92 + (rng() - 0.5) * 32;
        a.fillStyle = `rgb(${Math.round(tone + 6)},${Math.round(tone + 2)},${Math.round(tone - 3)})`;
        a.beginPath();
        a.roundRect(x + 2, y + 2, cw - 4, ch - 4, 6);
        a.fill();

        const hv = Math.round(170 + rng() * 55);
        h.fillStyle = `rgb(${hv},${hv},${hv})`;
        h.beginPath();
        h.roundRect(x + 2, y + 2, cw - 4, ch - 4, 6);
        h.fill();

        const rv = Math.round(150 + rng() * 60);
        r.fillStyle = `rgb(${rv},${rv},${rv})`;
        r.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      }
    }

    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 2.5);
    this.cache.set(key, set);
    return set;
  }

  /** Courtyard stone pavers */
  getCourtyardFlagstone(repeatX = 4, repeatY = 4): PBRSet {
    const key = `flagstone_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const rng = makeRng(3654);
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    a.fillStyle = '#928879';
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#404040';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#d4d4d4';
    r.fillRect(0, 0, size, size);

    const grid = 6;
    const s = size / grid;
    for (let row = 0; row < grid; row++) {
      for (let col = 0; col < grid; col++) {
        const v = (rng() - 0.5) * 20;
        a.fillStyle = `rgb(${Math.round(178 + v)},${Math.round(168 + v)},${Math.round(150 + v)})`;
        a.fillRect(col * s + 2, row * s + 2, s - 4, s - 4);
        h.fillStyle = 'rgb(195,195,195)';
        h.fillRect(col * s + 2, row * s + 2, s - 4, s - 4);
        r.fillStyle = 'rgb(175,175,175)';
        r.fillRect(col * s + 2, row * s + 2, s - 4, s - 4);
      }
    }
    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 1.8);
    this.cache.set(key, set);
    return set;
  }

  /** Sulusokak Caddesi worn asphalt */
  getAsphalt(repeatX = 4, repeatY = 4): PBRSet {
    const key = `asphalt_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const rng = makeRng(2026);
    const [aC, a] = createCanvas(size);
    const [hC, h] = createCanvas(size);
    const [rC, r] = createCanvas(size);

    a.fillStyle = '#45484d';
    a.fillRect(0, 0, size, size);
    h.fillStyle = '#808080';
    h.fillRect(0, 0, size, size);
    r.fillStyle = '#d2d2d2';
    r.fillRect(0, 0, size, size);

    for (let i = 0; i < 3000; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const v = rng() > 0.5 ? 20 : -18;
      a.fillStyle = `rgba(${70 + v},${72 + v},${76 + v},0.35)`;
      a.fillRect(x, y, 2, 2);
      const hv = Math.round(115 + rng() * 30);
      h.fillStyle = `rgb(${hv},${hv},${hv})`;
      h.fillRect(x, y, 2, 2);
    }

    const set = buildPBR(aC, hC, rC, repeatX, repeatY, 1.2);
    this.cache.set(key, set);
    return set;
  }

  /** Traditional Tokat Kilim Rug texture for House 1 interior */
  getKilimRug(): THREE.CanvasTexture {
    const key = 'kilim_rug';
    const size = 256;
    const [c, ctx] = createCanvas(size);
    ctx.fillStyle = '#8e2420';
    ctx.fillRect(0, 0, size, size);

    // Outer cream/indigo borders
    ctx.strokeStyle = '#e8d6b3';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, size - 24, size - 24);
    ctx.strokeStyle = '#243a54';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, size - 48, size - 48);

    // Central medallion diamonds
    const drawDiamond = (cx: number, cy: number, rx: number, ry: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - ry);
      ctx.lineTo(cx + rx, cy);
      ctx.lineTo(cx, cy + ry);
      ctx.lineTo(cx - rx, cy);
      ctx.closePath();
      ctx.fill();
    };
    drawDiamond(128, 128, 68, 78, '#c67d2d');
    drawDiamond(128, 128, 48, 56, '#243a54');
    drawDiamond(128, 128, 28, 34, '#e8d6b3');
    drawDiamond(128, 128, 14, 18, '#8e2420');

    const tex = finishTexture(c, 1, 1, true);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    void key;
    return tex;
  }

  /** Helper to create a MeshStandardMaterial wired to a PBRSet */
  makeMaterial(
    pbr: PBRSet,
    opts: { roughness?: number; metalness?: number; color?: string | number; side?: THREE.Side } = {}
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      map: pbr.map,
      normalMap: pbr.normalMap,
      roughnessMap: pbr.roughnessMap,
      roughness: opts.roughness ?? 0.88,
      metalness: opts.metalness ?? 0.04,
      color: opts.color ?? 0xffffff,
      side: opts.side ?? THREE.FrontSide,
    });
  }
}
