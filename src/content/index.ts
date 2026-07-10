import { PlatformDetector } from './detector';
import { DOMScraper } from './scraper';
import { BPEstimator } from './estimator';
import { WaterConverter } from './converter';
import { WaterBottleOverlay } from './overlay';
import { ConversationTracker } from './tracker';
import { IndexedDBStore } from '../shared/db';
import { DEFAULT_PLATFORMS } from '../shared/constants';
import type { PlatformConfig } from '../shared/types';

console.warn("[wc] executing", document.URL);

class WaterCalculator {
  private store = new IndexedDBStore();
  private overlay = new WaterBottleOverlay();
  private tracker = new ConversationTracker(this.store, this.overlay);
  private estimator = new BPEstimator();
  private converter = new WaterConverter();
  private detector: PlatformDetector;
  private scraper: DOMScraper | null = null;
  private config: PlatformConfig | null = null;
  private initialized = false;
  private lastUrl = window.location.href;

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
    const isNewChat = this.isNewChatPage(url);
    let record = isNewChat ? null : await this.tracker.resume(url);

    if (!record) {
      record = await this.tracker.start(url, this.config.id);
    }

    const title = this.scrapeTitle();
    if (title && !record.topic) {
      await this.tracker.addDelta({ ml: 0, tokens: 0, topic: title });
    }

    this.overlay.setState('active');

    this.scraper = new DOMScraper(this.config);
    this.estimator.reset();
    this.scraper.onNewText((_delta) => {
      const fullText = this.scraper!.getCurrentText();
      const tokens = this.estimator.estimate(fullText);
      const ml = this.converter.toMl(tokens);
      if (tokens > 0) this.tracker.addDelta({ ml, tokens });
    });

    this.scraper.attach(document.body);
    console.log('[wc] scraper attached, platform:', this.config.id);
  }

  private isNewChatPage(url: string): boolean {
    const u = new URL(url);
    const path = u.pathname;
    if (u.hostname.includes('chatgpt.com') && !path.includes('/c/')) return true;
    if (u.hostname.includes('gemini.google.com') && !path.includes('/app/')) return true;
    if (u.hostname.includes('claude.ai') && (path === '/' || path === '')) return true;
    if (u.hostname.includes('perplexity.ai') && !path.includes('/search/')) return true;
    return false;
  }

  private scrapeTitle(): string {
    if (!this.config) return '';
    const titleEl = document.querySelector(this.config.selectors.title);
    return titleEl?.textContent?.trim() ?? '';
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

    const record = await this.tracker.resume(url);
    if (record) {
      this.overlay.update(record.waterMl);
      this.overlay.setState('active');
    } else {
      if (!this.config) return;
      await this.tracker.start(url, this.config.id);
      this.overlay.update(0);
    }

    if (this.config) {
      this.scraper = new DOMScraper(this.config);
      this.estimator.reset();
      this.scraper.onNewText((_delta) => {
        const fullText = this.scraper!.getCurrentText();
        const tokens = this.estimator.estimate(fullText);
        const ml = this.converter.toMl(tokens);
        if (tokens > 0) this.tracker.addDelta({ ml, tokens });
      });
      this.scraper.attach(document.body);
      this.initialized = true;
    }
  }

  private onResume(): void {
    if (this.scraper && this.config) {
      this.scraper.attach(document.body);
    }
  }

  private onPause(): void {
    this.scraper?.detach();
  }
}

const app = new WaterCalculator();
console.log('[wc] content script loaded, starting init');
app.init().catch((err) => { console.log('[wc] init error:', err); });
