import type { IOverlayUI, OverlayState } from '../shared/types';

const OVERLAY_ID = 'wc-overlay';
const STYLE_ID = 'wc-overlay-styles';

const GRID_COLS = 16;
const GRID_ROWS = 28;

// 0 = empty, 1 = glass wall, 2 = water, 3 = water surface
// PET water bottle silhouette: cap → neck → shoulders → ridged body → base
const BOTTLE_GRID = new Uint8Array([
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // row 0
  0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0, // row 1 — cap (4 wide)
  0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0, // row 2 — cap
  0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0, // row 3 — neck ring
  0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0, // row 4 — neck
  0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0, // row 5 — neck
  0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0, // row 6 — neck
  0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0, // row 7 — neck base
  0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0, // row 8 — shoulder start
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0, // row 9 — shoulder widening
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0, // row 10
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 11
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 12 — body top
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 13
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0, // row 14 — ridge indent
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 15
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 16
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 17
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0, // row 18 — ridge indent
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 19
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 20
  0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0, // row 21 — ridge indent
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 22
  0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0, // row 23 — body base
  0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0, // row 24 — base curve
  0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0, // row 25 — rounded bottom
  0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0, // row 26 — flat base
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // row 27
]);

const PALETTE = {
  bottleOutline: '#3a6b8c',
  bottleFill: '#5b9ec4',
  bottleHighlight: '#8ec8e8',
  bottleRidge: '#4a8ab0',
  bottleCap: '#2d5a7a',
  waterDeep: '#0d3b5e',
  waterMid: '#1565a0',
  waterSurface: '#2196f3',
  waterFoam: '#64b5f6',
  puddle: '#1565a0',
} as const;

const WATER_CAPACITY_ML = 1000;

const CSS = `
#${OVERLAY_ID} {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2147483647;
  background: rgba(15, 25, 35, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px 10px 6px;
  font-family: 'Courier New', monospace;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  user-select: none;
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

#${OVERLAY_ID}:active {
  cursor: grabbing;
}

#${OVERLAY_ID}[data-state="minimized"] {
  width: 32px;
  height: 32px;
  padding: 4px;
  border-radius: 6px;
  overflow: hidden;
}

#${OVERLAY_ID}[data-state="minimized"] canvas,
#${OVERLAY_ID}[data-state="minimized"] .wc-counter,
#${OVERLAY_ID}[data-state="minimized"] .wc-resize {
  display: none;
}

#${OVERLAY_ID}[data-state="minimized"] .wc-header {
  margin: 0;
}

#${OVERLAY_ID} .wc-header {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  width: 100%;
  opacity: 0;
  transition: opacity 200ms;
}

#${OVERLAY_ID}:hover .wc-header {
  opacity: 1;
}

#${OVERLAY_ID} .wc-minimize,
#${OVERLAY_ID} .wc-close {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 3px;
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: 'Courier New', monospace;
}

#${OVERLAY_ID} .wc-minimize:hover,
#${OVERLAY_ID} .wc-close:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

#${OVERLAY_ID} .wc-counter {
  color: #85c1e9;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  white-space: nowrap;
  transition: transform 200ms;
}

#${OVERLAY_ID} .wc-resize {
  position: absolute;
  bottom: 22px;
  right: 2px;
  width: 10px;
  height: 10px;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 200ms;
}

#${OVERLAY_ID}:hover .wc-resize {
  opacity: 0.6;
}

#${OVERLAY_ID} .wc-resize::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 6px;
  height: 6px;
  border-right: 2px solid rgba(255,255,255,0.5);
  border-bottom: 2px solid rgba(255,255,255,0.5);
}
`;

export class WaterBottleOverlay implements IOverlayUI {
  private el: HTMLElement | null = null;
  private styleEl: HTMLStyleElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private counterEl: HTMLElement | null = null;
  private mounted = false;
  private animFrameId = 0;
  private frameCount = 0;
  private waterMl = 0;
  private targetWaterMl = 0;

  private cellSize = 4;
  private canvasW = 80;
  private canvasH = 120;
  private gridOffsetX = 0;
  private gridOffsetY = 0;

  private bubbles: Array<{ x: number; y: number; opacity: number }> = [];
  private spillDrops: Array<{ x: number; y: number; life: number }> = [];
  private splashParticles: Array<{ x: number; y: number; vy: number; life: number; maxLife: number }> = [];

  private dragStartX = 0;
  private dragStartY = 0;
  private origLeft = 0;
  private origTop = 0;
  private dragging = false;

  mount(): void {
    if (this.mounted) return;

    this.styleEl = document.createElement('style');
    this.styleEl.id = STYLE_ID;
    this.styleEl.textContent = CSS;
    document.head.appendChild(this.styleEl);

    this.el = document.createElement('div');
    this.el.id = OVERLAY_ID;
    this.el.setAttribute('data-state', 'idle');
    this.el.innerHTML = `
      <div class="wc-header">
        <button class="wc-minimize" title="Minimize">_</button>
        <button class="wc-close" title="Close">\u00d7</button>
      </div>
      <canvas width="${this.canvasW}" height="${this.canvasH}"></canvas>
      <div class="wc-counter">\ud83d\udca7 0.0 ml</div>
      <div class="wc-resize"></div>
    `;

    document.body.appendChild(this.el);

    this.canvas = this.el.querySelector('canvas');
    this.ctx = this.canvas?.getContext('2d') ?? null;
    this.counterEl = this.el.querySelector('.wc-counter');

    this.computeGridMetrics();

    this.el.addEventListener('mousedown', this.onDragStart);
    document.addEventListener('mousemove', this.onDragMove);
    document.addEventListener('mouseup', this.onDragEnd);

    const minimizeBtn = this.el.querySelector('.wc-minimize') as HTMLElement;
    const closeBtn = this.el.querySelector('.wc-close') as HTMLElement;
    const resizeHandle = this.el.querySelector('.wc-resize') as HTMLElement;

    minimizeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    resizeHandle.addEventListener('mousedown', (e) => { e.stopPropagation(); this.onResizeStart(e); });

    minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    closeBtn.addEventListener('click', () => this.unmount());

    this.mounted = true;
    this.startLoop();
  }

  unmount(): void {
    if (!this.mounted) return;

    this.stopLoop();

    if (this.el) {
      this.el.removeEventListener('mousedown', this.onDragStart);
      this.el.remove();
      this.el = null;
    }

    document.removeEventListener('mousemove', this.onDragMove);
    document.removeEventListener('mouseup', this.onDragEnd);

    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }

    this.canvas = null;
    this.ctx = null;
    this.counterEl = null;
    this.mounted = false;
    this.dragging = false;
  }

  private computeGridMetrics(): void {
    if (!this.canvas) return;
    this.canvasW = this.canvas.width;
    this.canvasH = this.canvas.height;
    this.cellSize = Math.floor(Math.min(this.canvasW / GRID_COLS, this.canvasH / GRID_ROWS));
    this.gridOffsetX = Math.floor((this.canvasW - this.cellSize * GRID_COLS) / 2);
    this.gridOffsetY = Math.floor((this.canvasH - this.cellSize * GRID_ROWS) / 2);
  }

  private startLoop(): void {
    const loop = () => {
      this.frameCount++;
      this.updateAnimations();
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private updateAnimations(): void {
    if (Math.abs(this.waterMl - this.targetWaterMl) > 0.5) {
      this.waterMl += (this.targetWaterMl - this.waterMl) * 0.15;
    } else {
      this.waterMl = this.targetWaterMl;
    }

    if (this.frameCount % 2 === 0) {
      this.bubbles = this.bubbles.filter(b => b.opacity > 0);
      for (const b of this.bubbles) {
        b.y -= 1;
        b.opacity -= 0.05;
        b.x += Math.sin(this.frameCount * 0.3 + b.y) * 0.3;
      }
    }

    if (this.waterMl > WATER_CAPACITY_ML && this.frameCount % 40 === 0) {
      const capMid = 7.5;
      this.spillDrops.push({
        x: capMid + (Math.random() - 0.5) * 1.5,
        y: 1,
        life: 35,
      });
    }

    for (const d of this.spillDrops) {
      d.y += 0.4;
      d.life--;
      if (d.life === 27) {
        const baseRow = GRID_ROWS - 2;
        for (let i = 0; i < 3; i++) {
          this.splashParticles.push({
            x: d.x + (Math.random() - 0.5) * 2,
            y: baseRow,
            vy: -1 - Math.random() * 2,
            life: 6,
            maxLife: 6,
          });
        }
      }
    }
    this.spillDrops = this.spillDrops.filter(d => d.life > 0);

    for (const p of this.splashParticles) {
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
    }
    this.splashParticles = this.splashParticles.filter(p => p.life > 0);
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const ox = this.gridOffsetX;
    const oy = this.gridOffsetY;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const isRidgeRow = (row: number) => row === 14 || row === 18 || row === 21;
    const isCapRow = (row: number) => row <= 2;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const cell = BOTTLE_GRID[idx];
        if (cell !== 1) continue;
        const x = ox + col * cs;
        const y = oy + row * cs;

        if (isCapRow(row)) {
          ctx.fillStyle = PALETTE.bottleCap;
        } else if (isRidgeRow(row)) {
          ctx.fillStyle = PALETTE.bottleRidge;
        } else if (col <= 3) {
          ctx.fillStyle = PALETTE.bottleHighlight;
        } else {
          ctx.fillStyle = PALETTE.bottleFill;
        }
        ctx.fillRect(x, y, cs, cs);

        ctx.fillStyle = PALETTE.bottleOutline;
        ctx.fillRect(x, y, cs, 1);
        if (col <= 3 || col >= 12) {
          ctx.fillRect(col <= 3 ? x : x + cs - 1, y, 1, cs);
        }
      }
    }

    const interiorRows = this.findInteriorRows();
    if (interiorRows.length > 0) {
      const waterFrac = Math.min(this.waterMl / WATER_CAPACITY_ML, 1.0);
      const filledRows = Math.floor(interiorRows.length * waterFrac);

      for (let i = interiorRows.length - 1; i >= interiorRows.length - filledRows; i--) {
        const row = interiorRows[i];
        for (let col = 1; col < GRID_COLS - 1; col++) {
          const idx = row * GRID_COLS + col;
          if (BOTTLE_GRID[idx] === 0) {
            const x = ox + col * cs;
            const y = oy + row * cs;
            const rowsFromSurface = interiorRows.length - 1 - i;
            ctx.fillStyle = rowsFromSurface <= 2 ? PALETTE.waterSurface : PALETTE.waterMid;
            ctx.fillRect(x, y, cs, cs);
          }
        }
      }

      if (filledRows > 0 && filledRows <= interiorRows.length) {
        const surfaceRow = interiorRows[interiorRows.length - 1 - filledRows];
        const wavePhase = Math.floor(this.frameCount / 3) % 2;
        for (let col = 1; col < GRID_COLS - 1; col++) {
          const idx = surfaceRow * GRID_COLS + col;
          if (BOTTLE_GRID[idx] !== 1) {
            const x = ox + col * cs;
            const y = oy + surfaceRow * cs;
            if ((col + wavePhase) % 4 < 2) {
              ctx.fillStyle = PALETTE.waterFoam;
              ctx.fillRect(x, y, cs, cs);
            }
          }
        }
      }
    }

    for (const b of this.bubbles) {
      ctx.globalAlpha = Math.max(0, b.opacity);
      ctx.fillStyle = PALETTE.waterFoam;
      ctx.fillRect(ox + b.x * cs, oy + b.y * cs, cs, cs);
      ctx.globalAlpha = 1;
    }

    if (this.waterMl > WATER_CAPACITY_ML) {
      const overflowMl = this.waterMl - WATER_CAPACITY_ML;
      const domeRows = Math.min(6, Math.floor(overflowMl / 800));
      const capCols = [6, 7, 8, 9];
      for (let d = 0; d < domeRows; d++) {
        const row = 1 - d;
        const cols = capCols.filter((_, i) => i >= domeRows - d - 1 && i < capCols.length - (domeRows - d - 1));
        for (const col of cols) {
          const x = ox + col * cs;
          const y = oy + (row - 1) * cs;
          ctx.fillStyle = d === 0 ? PALETTE.waterFoam : PALETTE.waterSurface;
          ctx.fillRect(x, y, cs, cs);
        }
      }

      for (const d of this.spillDrops) {
        ctx.fillStyle = PALETTE.waterFoam;
        ctx.fillRect(ox + d.x * cs, oy + d.y * cs, cs * 0.6, cs * 0.6);
      }

      for (const p of this.splashParticles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = PALETTE.waterFoam;
        ctx.fillRect(ox + p.x * cs, oy + p.y * cs, 2, 2);
      }
      ctx.globalAlpha = 1;

      const puddleWidth = Math.min(4, Math.floor(overflowMl / 500));
      for (let col = GRID_COLS / 2 - puddleWidth; col <= GRID_COLS / 2 + puddleWidth; col++) {
        const x = ox + col * cs;
        const y = oy + (GRID_ROWS - 1) * cs;
        ctx.fillStyle = PALETTE.puddle;
        ctx.fillRect(x, y, cs, cs * 0.5);
      }
    }
  }

  private findInteriorRows(): number[] {
    const rows: number[] = [];
    for (let row = 3; row < GRID_ROWS - 1; row++) {
      const baseIdx = row * GRID_COLS;
      const leftWall = BOTTLE_GRID.slice(baseIdx, baseIdx + 8).lastIndexOf(1);
      const rightWall = BOTTLE_GRID.slice(baseIdx + 8, baseIdx + GRID_COLS).indexOf(1);
      if (leftWall >= 0 && rightWall >= 0) {
        const midCol = 8 + rightWall - 1;
        if (BOTTLE_GRID[baseIdx + midCol] === 0) {
          rows.push(row);
        }
      }
    }
    return rows;
  }

  update(ml: number): void {
    this.targetWaterMl = ml;

    if (ml > this.waterMl && ml < WATER_CAPACITY_ML) {
      const bot = this.findInteriorRows();
      const lowestRow = bot[bot.length - 1];
      for (let i = 0; i < 3; i++) {
        this.bubbles.push({
          x: 3 + Math.random() * 8,
          y: lowestRow - 2 - Math.random() * 4,
          opacity: 0.8 + Math.random() * 0.2,
        });
      }
    }

    if (!this.counterEl) return;
    if (ml >= 1000) {
      this.counterEl.textContent = `\ud83d\udca7 ${(ml / 1000).toFixed(1)} L`;
    } else {
      this.counterEl.textContent = `\ud83d\udca7 ${ml.toFixed(1)} ml`;
    }
    this.counterEl.style.transform = 'scale(1.2)';
    setTimeout(() => { if (this.counterEl) this.counterEl.style.transform = 'scale(1)'; }, 200);
  }

  setState(state: OverlayState): void {
    if (!this.el) return;
    this.el.setAttribute('data-state', state);
  }

  isMounted(): boolean {
    return this.mounted;
  }

  private toggleMinimize(): void {
    if (!this.el) return;
    const current = this.el.getAttribute('data-state');
    if (current === 'minimized') {
      this.setState('active');
    } else {
      this.setState('minimized');
    }
  }

  private onDragStart = (e: MouseEvent): void => {
    if (!this.el) return;
    const target = e.target as HTMLElement;
    if (target.closest('.wc-header') || target.closest('.wc-resize')) return;
    this.dragging = true;
    const rect = this.el.getBoundingClientRect();
    this.origLeft = rect.left;
    this.origTop = rect.top;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
  };

  private onDragMove = (e: MouseEvent): void => {
    if (!this.dragging || !this.el) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.el.style.top = `${this.origTop + dy}px`;
    this.el.style.right = 'auto';
    this.el.style.left = `${this.origLeft + dx}px`;
  };

  private onDragEnd = (): void => {
    this.dragging = false;
  };

  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartW = 0;
  private resizeStartH = 0;
  private resizing = false;

  private onResizeStart = (e: MouseEvent): void => {
    if (!this.canvas) return;
    this.resizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;
    this.resizeStartW = this.canvas.width;
    this.resizeStartH = this.canvas.height;

    const onMove = (ev: MouseEvent) => {
      if (!this.resizing || !this.canvas) return;
      const dw = Math.max(60, Math.min(120, this.resizeStartW + (ev.clientX - this.resizeStartX)));
      const dh = Math.max(90, Math.min(180, this.resizeStartH + (ev.clientY - this.resizeStartY)));
      this.canvas.width = dw;
      this.canvas.height = dh;
      this.computeGridMetrics();
      this.render();
    };

    const onUp = () => {
      this.resizing = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
}
