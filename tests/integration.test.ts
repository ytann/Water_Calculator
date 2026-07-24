import { describe, it, expect, vi } from 'vitest';
import { PlatformDetector } from '../src/content/detector';
import { DOMScraper } from '../src/content/scraper';
import { BPEstimator } from '../src/content/estimator';
import { WaterConverter } from '../src/content/converter';
import { WaterBottleOverlay } from '../src/content/overlay';
import { ConversationTracker } from '../src/content/tracker';
import type { PlatformConfig, IConversationStore } from '../src/shared/types';

describe('integration: detector → scraper → estimator → converter → tracker', () => {
  function fakeStore(): IConversationStore {
    const records = new Map<string, any>();
    return {
      create: vi.fn(async (r) => { records.set(r.id, { ...r }); }),
      update: vi.fn(async (id, f) => { Object.assign(records.get(id), f); }),
      findByTitle: vi.fn(async (title, platform) => [...records.values()].find((r: any) => r.title === title && r.platform === platform) ?? null),
      findAll: vi.fn(async () => [...records.values()]),
      delete: vi.fn(async (id) => { records.delete(id); }),
    };
  }

  it('full pipeline: detect → scrape → estimate → convert → track', async () => {
    const config: PlatformConfig = {
      id: 'test',
      name: 'Test',
      urlMatch: 'test.com',
      selectors: { messages: '.msg', pageTitle: 'title', titleSelector: 'h1', input: 'textarea' },
      builtIn: true,
      tokenMultiplier: 1.5,
    };

    Object.defineProperty(window, 'location', {
      value: { hostname: 'test.com', href: 'https://test.com/chat/1' },
    });

    document.body.innerHTML = '<h1>Test Chat</h1><div class="container"><div class="msg">Hello</div></div>';

    const detector = new PlatformDetector([config]);
    const detected = detector.resolve();
    expect(detected).not.toBeNull();
    expect(detected!.id).toBe('test');

    const overlay = new WaterBottleOverlay();
    overlay.mount();

    const store = fakeStore();
    const tracker = new ConversationTracker(store, overlay);
    const record = await tracker.start('https://test.com/chat/1', 'test');
    expect(record.waterMl).toBe(0);

    const estimator = new BPEstimator();
    const converter = new WaterConverter();

    const scraper = new DOMScraper(config);
    const container = document.querySelector('.container')!;

    await new Promise<void>((resolve) => {
      scraper.onNewText((_delta) => {
        const fullText = scraper.getCurrentText();
        const tokens = estimator.estimate(fullText);
        const ml = converter.toMl(tokens);
        if (tokens > 0) tracker.addDelta({ ml, tokens });
      });
      scraper.attach(container);

      const msg = document.createElement('div');
      msg.className = 'msg';
      msg.textContent = 'This is a response';
      container.appendChild(msg);

      setTimeout(() => {
        const current = tracker.getCurrent();
        expect(current).not.toBeNull();
        expect(current!.waterMl).toBeGreaterThan(0);
        expect(current!.tokenCount).toBeGreaterThan(0);
        overlay.unmount();
        resolve();
      }, 100);
    });
  });

  it('discards deltas when location href no longer matches tracker url', async () => {
    const config: PlatformConfig = {
      id: 'test',
      name: 'Test',
      urlMatch: 'test.com',
      selectors: { messages: '.msg', pageTitle: 'title', titleSelector: 'h1', input: 'textarea' },
      builtIn: true,
      tokenMultiplier: 1.5,
    };

    Object.defineProperty(window, 'location', {
      value: { hostname: 'test.com', href: 'https://test.com/chat/a' },
      writable: true,
      configurable: true,
    });

    document.body.innerHTML = '<h1>Chat A</h1><div class="container"><div class="msg">Hello from A</div></div>';

    const overlay = new WaterBottleOverlay();
    overlay.mount();

    const store = fakeStore();
    const tracker = new ConversationTracker(store, overlay);
    await tracker.start('https://test.com/chat/a', 'test');
    expect(tracker.getCurrent()!.waterMl).toBe(0);

    const estimator = new BPEstimator();
    const converter = new WaterConverter();
    const scraper = new DOMScraper(config);
    const container = document.querySelector('.container')!;

    // Simulate navigating to a new chat BEFORE attach: URL mismatch should discard initial text
    (window.location as any).href = 'https://test.com/chat/b';

    scraper.onNewText((_delta) => {
      const current = tracker.getCurrent();
      if (!current || window.location.href !== current.url) return;
      const fullText = scraper.getCurrentText();
      const tokens = estimator.estimate(fullText);
      const ml = converter.toMl(tokens);
      if (tokens > 0) tracker.addDelta({ ml, tokens });
    });
    scraper.attach(container);

    // DOM mutation arrives while URL still mismatched
    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'This text should NOT be added to Chat A';
    container.appendChild(msg);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const current = tracker.getCurrent();
        expect(current).not.toBeNull();
        // Water should remain at 0 - delta was discarded because URL changed
        expect(current!.waterMl).toBe(0);
        expect(current!.tokenCount).toBe(0);
        overlay.unmount();
        resolve();
      }, 100);
    });
  });
});
