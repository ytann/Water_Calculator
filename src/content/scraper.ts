import type { ITextScraper, PlatformConfig } from '../shared/types';

const TRACKED_ATTR = 'data-wc-tracked';

export class DOMScraper implements ITextScraper {
  private observer: MutationObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private callbacks: Array<(delta: string) => void> = [];
  private lastTotalText = 0;

  constructor(private config: PlatformConfig) {}

  attach(_container: Element): void {
    const selector = this.config.selectors.messages;

    const initialText = this.collectAllText(selector);
    this.lastTotalText = initialText.length;

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(selector)) {
            node.setAttribute(TRACKED_ATTR, '1');
          }
        }
      }
      this.checkDelta(selector);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this.pollTimer = setInterval(() => {
      this.checkDelta(selector);
    }, 500);
  }

  detach(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  onNewText(callback: (delta: string) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const idx = this.callbacks.indexOf(callback);
      if (idx >= 0) this.callbacks.splice(idx, 1);
    };
  }

  private checkDelta(selector: string): void {
    if (!document.body) return;
    const currentText = this.collectAllText(selector);
    const currentLength = currentText.length;

    if (currentLength > this.lastTotalText) {
      const delta = currentText.slice(this.lastTotalText);
      this.lastTotalText = currentLength;
      if (delta.trim().length > 0) {
        for (const cb of this.callbacks) {
          cb(delta);
        }
      }
    }
  }

  private collectAllText(selector: string): string {
    if (!document.body) return '';
    const parts: string[] = [];
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = (el as HTMLElement).innerText || (el as HTMLElement).textContent || '';
      if (text.trim().length > 0) parts.push(text);
    }
    return parts.join('\n');
  }
}
