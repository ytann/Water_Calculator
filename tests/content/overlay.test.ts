import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WaterBottleOverlay } from '../../src/content/overlay';
import type { IOverlayUI } from '../../src/shared/types';

describe('WaterBottleOverlay', () => {
  let overlay: IOverlayUI;

  beforeEach(() => {
    overlay = new WaterBottleOverlay();
  });

  afterEach(() => {
    overlay.unmount();
  });

  it('mounts to document.body', () => {
    overlay.mount();
    const el = document.querySelector('#wc-overlay');
    expect(el).not.toBeNull();
  });

  it('isMounted returns true after mount', () => {
    overlay.mount();
    expect(overlay.isMounted()).toBe(true);
  });

  it('isMounted returns false before mount', () => {
    expect(overlay.isMounted()).toBe(false);
  });

  it('unmount removes from DOM', () => {
    overlay.mount();
    overlay.unmount();
    expect(document.querySelector('#wc-overlay')).toBeNull();
    expect(overlay.isMounted()).toBe(false);
  });

  it('mount creates a canvas element inside the overlay', () => {
    overlay.mount();
    const canvas = document.querySelector('#wc-overlay canvas');
    expect(canvas).not.toBeNull();
  });

  it('update displays ml value on counter label', () => {
    overlay.mount();
    overlay.update(230);
    const counter = document.querySelector('#wc-overlay .wc-counter');
    expect(counter?.textContent).toContain('230.0');
    expect(counter?.textContent).toContain('ml');
  });

  it('update shows liters when >= 1000ml', () => {
    overlay.mount();
    overlay.update(2100);
    const counter = document.querySelector('#wc-overlay .wc-counter');
    expect(counter?.textContent).toContain('2.1');
    expect(counter?.textContent).toContain('L');
  });

  it('update rounds to 1 decimal in ml', () => {
    overlay.mount();
    overlay.update(0.192);
    const counter = document.querySelector('#wc-overlay .wc-counter');
    expect(counter?.textContent).toContain('0.2');
  });

  it('does not throw if update called before mount', () => {
    expect(() => overlay.update(100)).not.toThrow();
  });

  it('setState adds data-state attribute', () => {
    overlay.mount();
    overlay.setState('minimized');
    const el = document.querySelector('#wc-overlay');
    expect(el?.getAttribute('data-state')).toBe('minimized');
  });

  it('calls onDoubleClick callback on dblclick', () => {
    overlay.mount();
    let called = false;
    overlay.setOnDoubleClick(() => { called = true; });
    const el = document.getElementById('wc-overlay');
    el?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(called).toBe(true);
  });

  it('does not throw when dblclick fires with no callback set', () => {
    overlay.mount();
    overlay.setOnDoubleClick(null);
    const el = document.getElementById('wc-overlay');
    expect(() => {
      el?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }).not.toThrow();
  });
});
