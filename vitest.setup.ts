import { vi } from 'vitest'

const storageMap = new Map<string, any>();

(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | null) => {
        const result: Record<string, any> = {};
        if (keys === null) {
          for (const [k, v] of storageMap) result[k] = v;
        } else if (typeof keys === 'string') {
          result[keys] = storageMap.get(keys);
        } else {
          for (const k of keys) result[k] = storageMap.get(k);
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, any>) => {
        for (const [k, v] of Object.entries(items)) storageMap.set(k, v);
        return Promise.resolve();
      }),
    },
  },
};

HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
  if (contextType === '2d') {
    return {
      fillStyle: '',
      fillRect: vi.fn(),
      strokeStyle: '',
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      font: '',
      textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'top' as CanvasTextBaseline,
      fillText: vi.fn(),
      strokeText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      globalAlpha: 1,
      globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
      imageSmoothingEnabled: true,
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createPattern: vi.fn(() => ({})),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(),
        width: 0,
        height: 0,
        colorSpace: 'srgb' as PredefinedColorSpace,
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(),
        width: 0,
        height: 0,
        colorSpace: 'srgb' as PredefinedColorSpace,
      })),
      clip: vi.fn(),
      isPointInPath: vi.fn(() => false),
      isPointInStroke: vi.fn(() => false),
      reset: vi.fn(),
    } as unknown as CanvasRenderingContext2D
  }
  return null
})

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,fake')
HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb?.(new Blob()))
