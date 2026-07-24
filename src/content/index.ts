import { PlatformDetector } from './detector';
import { DOMScraper } from './scraper';
import { BPEstimator } from './estimator';
import { WaterConverter } from './converter';
import { WaterBottleOverlay } from './overlay';
import { ConversationTracker } from './tracker';
import { IndexedDBStore } from '../shared/db';
import { DEFAULT_PLATFORMS } from '../shared/constants';
import type { PlatformConfig, ConversationRecord } from '../shared/types';

console.warn("[wc] executing", document.URL);

class WaterCalculator {
  private store = new IndexedDBStore();
  private overlay = new WaterBottleOverlay();
  private tracker = new ConversationTracker(this.store, this.overlay);

  constructor() {
    this.detector = new PlatformDetector(DEFAULT_PLATFORMS);
    this.overlay.setOnDoubleClick(() => {
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    });
  }
  private estimator = new BPEstimator();
  private converter = new WaterConverter();
  private detector: PlatformDetector;
  private scraper: DOMScraper | null = null;
  private config: PlatformConfig | null = null;
  private initialized = false;
  private lastUrl = window.location.href;

  async init(): Promise<void> {
    if (document.getElementById('wc-overlay')) return;
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
    // Re-check immediately - elements may have rendered between init() and now
    const detected = this.detector.resolve();
    if (detected) {
      this.config = detected;
      this.startTracking();
      return;
    }

    const observer = new MutationObserver(() => {
      if (this.config) {
        observer.disconnect();
        return;
      }
      const reDetected = this.detector.resolve();
      if (reDetected) {
        this.config = reDetected;
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

    const title = this.scrapeTitle();
    let record = title ? await this.tracker.resume(title, this.config!.id) : null;

    if (!record) {
      record = await this.tracker.start(title || 'Untitled', this.config.id);
    }

    if (title && !record.title) {
      await this.tracker.addDelta({ ml: 0, tokens: 0, title });
    }

    this.overlay.setState('active');

    this.estimator.setMultiplier(this.config.tokenMultiplier);
    this.scraper = new DOMScraper(this.config);
    this.attachScraperCallback();

    if (record.tokenCount > 0) {
      this.estimator.setLastCount(record.tokenCount);
    } else {
      this.estimator.reset();
    }

    this.scraper.attach(document.body);
    console.log('[wc] scraper attached, platform:', this.config.id);
  }

  private scrapeTitle(): string {
    // Create a temporary scraper instance just for title extraction
    // since this.config is set before scrapeTitle() is first called
    const scraper = this.scraper ?? (this.config ? new DOMScraper(this.config) : null);
    return scraper?.getTitle() ?? (document.title || '');
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

    this.watchNavigation();
  }

  private watchNavigation(): void {
    const checkUrl = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        this.lastUrl = currentUrl;
        this.onUrlChange(currentUrl);
      }
    };

    const originalPush = history.pushState.bind(history);
    history.pushState = (...args) => {
      originalPush(...args);
      setTimeout(checkUrl, 100);
    };

    const originalReplace = history.replaceState.bind(history);
    history.replaceState = (...args) => {
      originalReplace(...args);
      setTimeout(checkUrl, 100);
    };

    window.addEventListener('popstate', () => setTimeout(checkUrl, 100));

    setInterval(checkUrl, 2000);
  }

  private async onUrlChange(url: string): Promise<void> {
    this.scraper?.detach();
    this.initialized = false;

    if (!this.config) return;

    const title = this.scrapeTitle();
    let record: ConversationRecord | null = null;

    if (title) {
      record = await this.tracker.resume(title, this.config!.id);
      if (record) {
        this.overlay.update(record.waterMl);
        this.overlay.setState('active');
      } else {
        if (!this.config) return;
        record = await this.tracker.start(title, this.config.id);
        this.overlay.update(0);
      }
    } else {
      if (!this.config) return;
      record = await this.tracker.start('Untitled', this.config.id);
      this.overlay.update(0);
    }

    if (this.config) {
      this.scraper = new DOMScraper(this.config);
      if (record && record.tokenCount > 0) {
        this.estimator.setLastCount(record.tokenCount);
      } else {
        this.estimator.reset();
      }
      this.attachScraperCallback();
      this.scraper.attach(document.body);
      this.initialized = true;
    }
  }

  private attachScraperCallback(): void {
    this.scraper!.onNewText((_delta) => {
      const current = this.tracker.getCurrent();
      if (!current || window.location.href !== current.url) return;
      const fullText = this.scraper!.getCurrentText();
      const tokens = this.estimator.estimate(fullText);
      const ml = this.converter.toMl(tokens);
      if (tokens > 0) this.tracker.addDelta({ ml, tokens });
      const newTitle = this.scraper!.getTitle();
      if (newTitle && this.tracker.getCurrent()?.title !== newTitle) {
        this.tracker.updateTitle(newTitle);
      }
    });
  }

  private onResume(): void {
    if (!this.scraper || !this.config) return;
    if (document.visibilityState === 'hidden') return;
    this.scraper.attach(document.body);
  }

  private onPause(): void {
    if (document.visibilityState !== 'hidden') return;
    this.scraper?.detach();
  }
}

const app = new WaterCalculator();
console.log('[wc] content script loaded, starting init');
app.init().catch((err) => { console.log('[wc] init error:', err); });
