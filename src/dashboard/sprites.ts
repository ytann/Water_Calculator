export interface SpriteDef {
  grid: Uint8Array;
  palette: string[];
  width: number;
  height: number;
}

const W = 32;
const H = 32;

function makeSprite(palette: string[], fillGrid: (g: Uint8Array) => void): SpriteDef {
  const grid = new Uint8Array(W * H);
  fillGrid(grid);
  return { grid, palette, width: W, height: H };
}

function rect(g: Uint8Array, x: number, y: number, w: number, h: number, color: number) {
  for (let r = y; r < y + h && r < H; r++) {
    for (let c = x; c < x + w && c < W; c++) {
      g[r * W + c] = color;
    }
  }
}

function circ(g: Uint8Array, cx: number, cy: number, r: number, color: number) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= r) {
        g[y * W + x] = color;
      }
    }
  }
}

const BOTTLE_PALETTE = ['#00000000', '#3a6b8c', '#5b9ec4', '#2d5a7a', '#8ec8e8'];
const CACTUS_PALETTE = ['#00000000', '#2d5a1e', '#4a8c2a', '#8b5e3c', '#c49a6c', '#1e3a14'];
const ICE_PALETTE = ['#00000000', '#87ceeb', '#b0e0e6', '#4682b4', '#e0f0ff'];
const TEA_PALETTE = ['#00000000', '#8b5e3c', '#c49a6c', '#e8d5b7', '#ffffff', '#d4a574'];
const SHOWER_PALETTE = ['#00000000', '#87ceeb', '#4682b4', '#c0c0c0', '#a0a0a0'];
const RAIN_PALETTE = ['#00000000', '#808080', '#a0a0a0', '#c0c0c0', '#87ceeb', '#4a8cff'];
const TUB_PALETTE = ['#00000000', '#ffffff', '#e0e0e0', '#c0c0c0', '#87ceeb'];
const TEARS_PALETTE = ['#00000000', '#ffd700', '#87ceeb', '#4682b4', '#000000'];
const PLANT_PALETTE = ['#00000000', '#2d5a1e', '#4a8c2a', '#6aad3a', '#8b5e3c'];
const RAMEN_PALETTE = ['#00000000', '#ffffff', '#ffd700', '#e8d5b7', '#8b5e3c', '#ff6347', '#3cb371'];
const CLOUD_PALETTE = ['#00000000', '#ffffff', '#e8e8e8', '#d0d0d0', '#c8e0f0'];
const WHALE_PALETTE = ['#00000000', '#4682b4', '#5b9ec4', '#2d5a7a', '#87ceeb', '#ffffff', '#1e3a5f'];
const POOL_PALETTE = ['#00000000', '#1e90ff', '#4169e1', '#ffffff', '#87ceeb'];
const LAKE_PALETTE = ['#00000000', '#1e90ff', '#4169e1', '#2d5a1e', '#4a8c2a'];
const SYRUP_PALETTE = ['#00000000', '#d2691e', '#8b4513', '#cd853f', '#f4a460'];

export const SPRITES: Record<string, SpriteDef> = {
  'bottle': makeSprite(BOTTLE_PALETTE, (g) => {
    rect(g, 13, 2, 6, 3, 1);
    rect(g, 12, 5, 8, 2, 1);
    rect(g, 13, 7, 6, 2, 2);
    rect(g, 9, 9, 2, 18, 1);
    rect(g, 21, 9, 2, 18, 1);
    rect(g, 8, 10, 4, 15, 3);
    rect(g, 20, 10, 4, 15, 2);
    rect(g, 10, 25, 12, 2, 1);
    rect(g, 12, 18, 8, 1, 4);
    rect(g, 12, 21, 8, 1, 4);
    circ(g, 16, 16, 4, 2);
  }),

  'cactus': makeSprite(CACTUS_PALETTE, (g) => {
    rect(g, 12, 22, 8, 10, 3);
    rect(g, 10, 20, 12, 3, 3);
    rect(g, 14, 8, 4, 14, 1);
    rect(g, 9, 10, 5, 3, 2);
    rect(g, 18, 12, 5, 3, 2);
    rect(g, 15, 6, 3, 3, 5);
  }),

  'ice-bag': makeSprite(ICE_PALETTE, (g) => {
    rect(g, 10, 6, 12, 18, 2);
    rect(g, 8, 4, 16, 4, 1);
    rect(g, 12, 10, 4, 6, 1);
    rect(g, 17, 14, 4, 4, 1);
    rect(g, 10, 17, 3, 5, 1);
    rect(g, 12, 11, 1, 4, 3);
    rect(g, 18, 15, 1, 2, 3);
    for (let i = 0; i < 6; i++) rect(g, 10 + i * 2, 3, 1, 2, 4);
  }),

  'tea-cup': makeSprite(TEA_PALETTE, (g) => {
    rect(g, 9, 12, 14, 14, 1);
    rect(g, 7, 10, 18, 4, 1);
    rect(g, 23, 15, 5, 3, 1);
    rect(g, 11, 14, 10, 8, 4);
    rect(g, 13, 4, 1, 8, 5);
    rect(g, 16, 6, 1, 6, 5);
    rect(g, 19, 3, 1, 5, 5);
    rect(g, 10, 11, 12, 1, 2);
  }),

  'shower': makeSprite(SHOWER_PALETTE, (g) => {
    rect(g, 8, 3, 16, 4, 3);
    rect(g, 14, 7, 4, 4, 4);
    rect(g, 15, 11, 2, 12, 4);
    rect(g, 8, 5, 2, 3, 4);
    rect(g, 22, 5, 2, 3, 4);
    for (let i = 0; i < 5; i++) {
      rect(g, 6 + i * 5, 10 + (i % 3) * 4, 2, 3, 1);
    }
  }),

  'rain': makeSprite(RAIN_PALETTE, (g) => {
    for (let y = 3; y < 14; y++) {
      for (let x = 4; x < 28; x++) {
        const dx = (x - 16) / 12;
        const dy = (y - 8) / 6;
        if (dx * dx + dy * dy < 0.9) g[y * W + x] = 1;
      }
    }
    rect(g, 6, 5, 20, 8, 2);
    for (let i = 0; i < 6; i++) {
      const rx = 6 + i * 4;
      rect(g, rx, 16 + (i % 2) * 4, 2, 5, 4);
      rect(g, rx + 4, 18 + (i % 2) * 4, 2, 3, 4);
    }
  }),

  'bathtub': makeSprite(TUB_PALETTE, (g) => {
    rect(g, 4, 14, 24, 10, 1);
    rect(g, 2, 12, 28, 4, 1);
    rect(g, 6, 15, 20, 2, 4);
    rect(g, 3, 13, 26, 1, 2);
    rect(g, 28, 14, 3, 3, 3);
    rect(g, 27, 8, 4, 6, 3);
    rect(g, 10, 22, 4, 2, 3);
    rect(g, 20, 22, 4, 2, 3);
  }),

  'tears': makeSprite(TEARS_PALETTE, (g) => {
    circ(g, 16, 12, 9, 1);
    rect(g, 11, 10, 3, 3, 4);
    rect(g, 18, 10, 3, 3, 4);
    rect(g, 14, 16, 4, 2, 4);
    rect(g, 9, 18, 3, 7, 2);
    rect(g, 20, 18, 3, 7, 2);
    rect(g, 10, 23, 2, 3, 3);
    rect(g, 21, 23, 2, 3, 3);
  }),

  'plant': makeSprite(PLANT_PALETTE, (g) => {
    rect(g, 13, 20, 6, 12, 4);
    rect(g, 11, 18, 10, 3, 4);
    rect(g, 14, 8, 4, 12, 1);
    rect(g, 9, 10, 5, 4, 2);
    rect(g, 18, 12, 5, 4, 3);
    rect(g, 8, 15, 4, 3, 2);
    rect(g, 20, 14, 4, 3, 3);
    rect(g, 15, 6, 3, 3, 2);
  }),

  'ramen': makeSprite(RAMEN_PALETTE, (g) => {
    rect(g, 6, 10, 20, 16, 4);
    rect(g, 4, 8, 24, 4, 1);
    rect(g, 8, 12, 16, 4, 5);
    rect(g, 10, 10, 3, 3, 2);
    rect(g, 17, 11, 6, 2, 3);
    rect(g, 14, 14, 2, 5, 6);
    rect(g, 12, 2, 1, 7, 1);
    rect(g, 16, 3, 1, 6, 1);
    rect(g, 20, 1, 1, 5, 1);
    rect(g, 5, 9, 22, 1, 2);
  }),

  'cloud': makeSprite(CLOUD_PALETTE, (g) => {
    for (let y = 4; y < 22; y++) {
      for (let x = 2; x < 30; x++) {
        const dx = (x - 16) / 14;
        const dy = (y - 14) / 10;
        if (dx * dx + dy * dy < 0.85) g[y * W + x] = 1;
      }
    }
    rect(g, 6, 5, 8, 4, 2);
    rect(g, 18, 6, 10, 3, 2);
    rect(g, 10, 18, 12, 4, 3);
  }),

  'whale': makeSprite(WHALE_PALETTE, (g) => {
    rect(g, 6, 12, 20, 10, 1);
    rect(g, 4, 14, 4, 6, 1);
    rect(g, 22, 10, 8, 8, 1);
    rect(g, 28, 8, 3, 4, 1);
    rect(g, 28, 16, 3, 4, 1);
    rect(g, 8, 11, 10, 3, 4);
    rect(g, 12, 13, 3, 3, 5);
    rect(g, 6, 18, 3, 1, 6);
    rect(g, 5, 6, 1, 6, 5);
    rect(g, 8, 8, 1, 4, 5);
  }),

  'pool': makeSprite(POOL_PALETTE, (g) => {
    rect(g, 4, 8, 24, 16, 1);
    rect(g, 3, 7, 26, 2, 2);
    rect(g, 3, 23, 26, 2, 2);
    for (let i = 0; i < 5; i++) {
      rect(g, 5 + i * 5, 10, 2, 4, 3);
      rect(g, 5 + i * 5, 18, 2, 4, 3);
    }
    rect(g, 8, 14, 16, 1, 4);
    rect(g, 6, 16, 20, 1, 4);
  }),

  'lake': makeSprite(LAKE_PALETTE, (g) => {
    for (let y = 10; y < 26; y++) {
      for (let x = 4; x < 28; x++) {
        const dx = (x - 16) / 12;
        const dy = (y - 18) / 8;
        if (dx * dx * 1.5 + dy * dy < 0.9) g[y * W + x] = 1;
      }
    }
    rect(g, 4, 4, 5, 8, 3);
    rect(g, 24, 6, 6, 6, 3);
    rect(g, 10, 2, 12, 4, 4);
    rect(g, 5, 3, 2, 4, 4);
    rect(g, 26, 5, 2, 4, 4);
    rect(g, 12, 15, 4, 2, 2);
    rect(g, 18, 18, 3, 1, 2);
  }),

  'syrup': makeSprite(SYRUP_PALETTE, (g) => {
    rect(g, 11, 4, 10, 20, 1);
    rect(g, 13, 2, 6, 4, 2);
    rect(g, 12, 22, 8, 2, 3);
    rect(g, 13, 10, 6, 6, 3);
    rect(g, 14, 8, 4, 3, 4);
    rect(g, 16, 24, 3, 4, 3);
    rect(g, 15, 27, 2, 3, 3);
  }),
};

export function renderSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteDef,
  x: number,
  y: number,
  scale: number,
): void {
  const { grid, palette, width } = sprite;
  for (let row = 0; row < sprite.height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const colorIdx = grid[idx];
      if (colorIdx === 0) continue;
      const color = palette[colorIdx];
      if (color === '#00000000') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}
