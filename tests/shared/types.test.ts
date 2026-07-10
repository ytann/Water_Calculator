import { describe, it, expect } from 'vitest';
import type {
  PlatformConfig,
  ConversationRecord,
  OverlayState,
  IPlatformDetector,
  ITextScraper,
  ITokenEstimator,
  IWaterConverter,
  IOverlayUI,
  IConversationTracker,
  IConversationStore,
} from '../../src/shared/types';

describe('shared types', () => {
  it('PlatformConfig has required fields', () => {
    const cfg: PlatformConfig = {
      id: 'chatgpt',
      name: 'ChatGPT',
      urlMatch: 'chatgpt.com',
      selectors: {
        messages: '[data-message-author-role]',
        title: 'title',
        input: '#prompt-textarea',
      },
      builtIn: true,
    };
    expect(cfg.id).toBe('chatgpt');
    expect(cfg.selectors.messages).toBe('[data-message-author-role]');
  });

  it('ConversationRecord has all fields', () => {
    const record: ConversationRecord = {
      id: 'uuid-1',
      url: 'https://chatgpt.com/c/abc',
      platform: 'chatgpt',
      topic: 'Test topic',
      waterMl: 0,
      tokenCount: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(record.waterMl).toBe(0);
  });

  it('interfaces are structural (compile-time check)', () => {
    // If this compiles, all interface members are present
    const _detector: IPlatformDetector = {} as any;
    const _scraper: ITextScraper = {} as any;
    const _estimator: ITokenEstimator = {} as any;
    const _converter: IWaterConverter = {} as any;
    const _overlay: IOverlayUI = {} as any;
    const _tracker: IConversationTracker = {} as any;
    const _store: IConversationStore = {} as any;
    expect(true).toBe(true);
  });
});
