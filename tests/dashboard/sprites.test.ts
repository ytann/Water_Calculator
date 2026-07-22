import { describe, it, expect } from 'vitest';
import { SPRITES, renderSprite, type SpriteDef } from '../../src/dashboard/sprites';

describe('SPRITES', () => {
  const spriteKeys = [
    'bottle', 'cactus', 'ice-bag', 'tea-cup', 'shower',
    'rain', 'bathtub', 'tears', 'plant', 'ramen',
    'cloud', 'whale', 'pool', 'lake', 'syrup',
  ];

  it('has all 15 sprite keys', () => {
    for (const key of spriteKeys) {
      expect(SPRITES[key]).toBeDefined();
    }
  });

  it('each sprite has a 32x32 grid', () => {
    for (const key of spriteKeys) {
      const sprite: SpriteDef = SPRITES[key];
      expect(sprite.grid.length).toBe(32 * 32);
      expect(sprite.width).toBe(32);
      expect(sprite.height).toBe(32);
    }
  });

  it('each sprite has a palette with at least one color', () => {
    for (const key of spriteKeys) {
      const sprite: SpriteDef = SPRITES[key];
      expect(sprite.palette.length).toBeGreaterThan(0);
    }
  });

  it('grid values reference valid palette indices', () => {
    for (const key of spriteKeys) {
      const sprite: SpriteDef = SPRITES[key];
      for (let i = 0; i < sprite.grid.length; i++) {
        expect(sprite.grid[i]).toBeGreaterThanOrEqual(0);
        expect(sprite.grid[i]).toBeLessThan(sprite.palette.length);
      }
    }
  });
});

describe('renderSprite', () => {
  function mockCtx() {
    const calls: Array<{ x: number; y: number; w: number; h: number; color: string }> = [];
    let style = '';
    const ctx = {
      get fillStyle() { return style; },
      set fillStyle(v: string) { style = v; },
      fillRect(x: number, y: number, w: number, h: number) { calls.push({ x, y, w, h, color: style }); },
    } as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }

  it('calls fillRect for each non-zero grid cell', () => {
    const { ctx, calls } = mockCtx();
    const sprite = SPRITES['bottle'];
    const scale = 1;
    renderSprite(ctx, sprite, 0, 0, scale);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('scales cell sizes correctly', () => {
    const { ctx, calls } = mockCtx();
    const sprite = SPRITES['bottle'];
    const scale = 2;
    renderSprite(ctx, sprite, 10, 20, scale);
    for (const call of calls) {
      expect(call.w).toBeGreaterThanOrEqual(2);
      expect(call.h).toBeGreaterThanOrEqual(2);
    }
  });

  it('offsets sprite by x, y', () => {
    const { ctx, calls } = mockCtx();
    const sprite = SPRITES['bottle'];
    const scale = 1;
    renderSprite(ctx, sprite, 50, 60, scale);
    let minX = Infinity;
    let minY = Infinity;
    for (const call of calls) {
      minX = Math.min(minX, call.x);
      minY = Math.min(minY, call.y);
    }
    expect(minX).toBeGreaterThanOrEqual(50);
    expect(minY).toBeGreaterThanOrEqual(60);
  });
});
