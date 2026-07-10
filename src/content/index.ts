import { PlatformDetector } from './detector';
import { DOMScraper } from './scraper';
import { BPEstimator } from './estimator';
import { WaterConverter } from './converter';
import { WaterOverlay } from './overlay';
import { ConversationTracker } from './tracker';
import { IndexedDBStore } from '../shared/db';
import { DEFAULT_PLATFORMS } from '../shared/constants';
import type { PlatformConfig } from '../shared/types';

class WaterCalculator {
  private store = new IndexedDBStore();
  private overlay = new WaterOverlay();
  private tracker = new ConversationTracker(this.store, this.overlay);
  private estimator = new BPEstimator();
  private converter = new WaterConverter();
  private detector: PlatformDetector;
  private scraper: DOMScraper | null = null;
  private config: PlatformConfig | null = null;
  private initialized = false;
  private initDelay = 1000;

  constructor() {
    this.detector = new PlatformDetector(DEFAULT_PLATFORMS);
  }

  async init(): Promise<void> {
    this.overlay.mount();
    this.setupLifecycleListeners();

    this.config = this.detector.resolve();

    if (!this.config) {
      this.overlay.setState('idle');
      this.overlay.update(0);
      this.watchForPlatform();
      return;
    }

    await this.startTracking();
  }

  private watchForPlatform(): void {
    const observer = new MutationObserver(() => {
      if (this.config) {
        observer.disconnect();
        return;
      }
      const detected = this.detector.resolve();
      if (detected) {
        this.config = detected;
        observer.disconnect();
        this.startTracking();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
    }, 30000);
  }

  private async startTracking(): Promise<void> {
    if (!this.config || this.initialized) return;
    this.initialized = true;

    const url = window.location.href;
    let record = await this.tracker.resume(url);

    if (!record) {
      record = await this.tracker.start(url, this.config.id);
    }

    const title = this.scrapeTitle();
    if (title && !record.topic) {
      await this.tracker.addDelta({ ml: 0, tokens: 0, topic: title });
    }

    this.overlay.setState('active');

    this.scraper = new DOMScraper(this.config);
    this.scraper.onNewText((delta) => {
      const tokens = this.estimator.estimate(delta);
      const ml = this.converter.toMl(tokens);
      this.tracker.addDelta({ ml, tokens });
    });

    const container = this.findMessageContainer();
    if (container) {
      this.scraper.attach(container);
    }
  }

  private scrapeTitle(): string {
    if (!this.config) return '';
    const titleEl = document.querySelector(this.config.selectors.title);
    return titleEl?.textContent?.trim() ?? '';
  }

  private findMessageContainer(): Element | null {
    if (!this.config) return null;
    const firstMsg = document.querySelector(this.config.selectors.messages);
    return firstMsg?.parentElement ?? null;
  }

  private setupLifecycleListeners(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.onResume();
      } else {
        this.onPause();
      }
    });

    window.addEventListener('pageshow', () => this.onResume());
    window.addEventListener('pagehide', () => this.onPause());
  }

  private onResume(): void {
    if (this.scraper && this.config) {
      const container = this.findMessageContainer();
      if (container) this.scraper.attach(container);
    }
  }

  private onPause(): void {
    this.scraper?.detach();
  }
}

const app = new WaterCalculator();
app.init();
