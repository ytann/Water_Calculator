import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DOMScraper } from '../../src/content/scraper';
import type { ITextScraper, PlatformConfig } from '../../src/shared/types';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const config: PlatformConfig = {
  id: 'test',
  name: 'Test',
  urlMatch: 'test.com',
  selectors: { messages: '.msg', pageTitle: 'title', titleSelector: 'h1', input: 'textarea' },
  builtIn: true,
};

describe('DOMScraper', () => {
  let scraper: ITextScraper;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    scraper?.detach();
    const el = document.getElementById('test-container');
    if (el) el.remove();
    document.querySelectorAll('.msg').forEach((e) => e.remove());
  });

  it('detects new text when message node is added', async () => {
    scraper = new DOMScraper(config);
    const callback = vi.fn();
    scraper.onNewText(callback);
    scraper.attach(container);

    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'Hello world';
    container.appendChild(msg);

    await delay(600);
    expect(callback).toHaveBeenCalledWith('Hello world');
  });

  it('detects content change within existing element via polling', async () => {
    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'He';
    container.appendChild(msg);

    scraper = new DOMScraper(config);
    const callback = vi.fn();
    scraper.onNewText(callback);
    scraper.attach(container);

    msg.textContent = 'Hello world, streaming response here';

    await delay(600);
    expect(callback).toHaveBeenCalled();
  });

  it('does not fire for non-matching nodes', async () => {
    scraper = new DOMScraper(config);
    const callback = vi.fn();
    scraper.onNewText(callback);
    scraper.attach(container);

    const other = document.createElement('div');
    other.className = 'not-msg';
    other.textContent = 'not a message';
    container.appendChild(other);

    await delay(600);
    expect(callback).not.toHaveBeenCalled();
  });

  it('detach stops observing and polling', async () => {
    scraper = new DOMScraper(config);
    const callback = vi.fn();
    scraper.onNewText(callback);
    scraper.attach(container);
    scraper.detach();

    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'Should not fire';
    container.appendChild(msg);

    await delay(600);
    expect(callback).not.toHaveBeenCalled();
  });

  it('onNewText returns a disposer that unsubscribes', async () => {
    scraper = new DOMScraper(config);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const dispose = scraper.onNewText(cb1);
    scraper.onNewText(cb2);
    dispose();
    scraper.attach(container);

    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'Test-unique';
    container.appendChild(msg);

    await delay(600);
    await delay(600);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });

});
