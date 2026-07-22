import { describe, it, expect } from 'vitest';
import { renderPixelDonut } from '../../src/dashboard/charts';

describe('renderPixelDonut', () => {
  function mockCtx(width = 160, height = 160) {
    const calls: Array<{ method: string; args: unknown[]; fillStyle?: string }> = [];
    let fillStyle = '';
    const ctx = {
      get fillStyle() { return fillStyle; },
      set fillStyle(v: string) { fillStyle = v; },
      fillRect(x: number, y: number, w: number, h: number) { calls.push({ method: 'fillRect', args: [x, y, w, h], fillStyle }); },
      arc() { calls.push({ method: 'arc', args: [...arguments] }); },
      beginPath() { calls.push({ method: 'beginPath', args: [] }); },
      fill() { calls.push({ method: 'fill', args: [] }); },
      canvas: { width, height },
    } as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }

  it('draws fillRect calls for pixel blocks', () => {
    const { ctx, calls } = mockCtx();
    const slices = [
      { label: 'A', value: 50, color: '#ff0000' },
      { label: 'B', value: 50, color: '#00ff00' },
    ];
    renderPixelDonut(ctx, slices, 80, 80, 60, 30, 8);
    const rects = calls.filter(c => c.method === 'fillRect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('slices total to full 360 degrees', () => {
    const { ctx, calls } = mockCtx();
    const slices = [
      { label: 'Frontend', value: 30, color: '#ff0000' },
      { label: 'Backend', value: 70, color: '#00ff00' },
    ];
    renderPixelDonut(ctx, slices, 80, 80, 60, 30, 8);
    const rects = calls.filter(c => c.method === 'fillRect');
    const redRects = rects.filter(c => c.fillStyle === '#ff0000');
    const greenRects = rects.filter(c => c.fillStyle === '#00ff00');
    expect(redRects.length).toBeGreaterThan(0);
    expect(greenRects.length).toBeGreaterThan(0);
  });

  it('handles empty slices', () => {
    const { ctx, calls } = mockCtx();
    renderPixelDonut(ctx, [], 80, 80, 60, 30, 8);
    const rects = calls.filter(c => c.method === 'fillRect');
    expect(rects.length).toBe(0);
  });
});

