import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformDetector } from '../../src/content/detector';
import type { IPlatformDetector, PlatformConfig } from '../../src/shared/types';

describe('PlatformDetector', () => {
  let detector: IPlatformDetector;
  const chatGptConfig: PlatformConfig = {
    id: 'chatgpt',
    name: 'ChatGPT',
    urlMatch: 'chatgpt.com',
    selectors: { messages: '[data-message]', pageTitle: 'title', titleSelector: 'title', input: '#input' },
    builtIn: true,
    tokenMultiplier: 1.5,
  };

  beforeEach(() => {
    detector = new PlatformDetector([chatGptConfig]);
  });

  it('detects platform by URL match and DOM fingerprint', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'chatgpt.com', href: 'https://chatgpt.com/c/abc' },
      writable: true,
    });
    document.body.innerHTML = '<div data-message="">hello</div>';
    const result = detector.resolve();
    expect(result).not.toBeNull();
    expect(result!.id).toBe('chatgpt');
  });

  it('returns null for unknown platform', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'unknown.com', href: 'https://unknown.com' },
      writable: true,
    });
    const result = detector.resolve();
    expect(result).toBeNull();
  });

  it('returns null when URL matches but DOM fingerprint fails', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'chatgpt.com', href: 'https://chatgpt.com/c/abc' },
      writable: true,
    });
    document.body.innerHTML = '<div>no matching selectors</div>';
    const result = detector.resolve();
    expect(result).toBeNull();
  });

  it('register adds a platform', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'newplatform.com', href: 'https://newplatform.com' },
      writable: true,
    });
    document.body.innerHTML = '<div class="msg">hi</div>';
    detector.register({
      id: 'new',
      name: 'New',
      urlMatch: 'newplatform.com',
      selectors: { messages: '.msg', pageTitle: 'title', titleSelector: 'h1', input: 'textarea' },
      builtIn: false,
      tokenMultiplier: 1.5,
    });
    const result = detector.resolve();
    expect(result).not.toBeNull();
    expect(result!.id).toBe('new');
  });
});
