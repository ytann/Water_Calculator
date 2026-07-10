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
  AddDeltaParams,
  PlatformSelectors,
} from '../../src/shared/types';

describe('shared types', () => {
  it('PlatformConfig has required fields', () => {
    const cfg: PlatformConfig = {
      id: 'chatgpt',
      name: 'ChatGPT',
      urlMatch: 'chatgpt.com',
      selectors: {
        messages: '[data-message-author-role]',
        pageTitle: 'title',
        titleSelector: 'h1.conversation-title',
        input: '#prompt-textarea',
      },
      builtIn: true,
    };
    expect(cfg.id).toBe('chatgpt');
    expect(cfg.selectors.messages).toBe('[data-message-author-role]');
    expect(cfg.selectors.pageTitle).toBe('title');
    expect(cfg.selectors.titleSelector).toBe('h1.conversation-title');
  });

  it('ConversationRecord uses title not topic', () => {
    const record: ConversationRecord = {
      id: 'uuid-1',
      url: 'https://chatgpt.com/c/abc',
      platform: 'chatgpt',
      title: 'Test title',
      waterMl: 0,
      tokenCount: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(record.title).toBe('Test title');
    expect(record.waterMl).toBe(0);
  });

  it('AddDeltaParams uses title not topic', () => {
    const params: AddDeltaParams = {
      ml: 10,
      tokens: 100,
      title: 'My chat',
    };
    expect(params.title).toBe('My chat');
  });

  it('ITextScraper has getTitle', () => {
    const scraper: ITextScraper = {
      attach: (_container: Element) => {},
      detach: () => {},
      onNewText: (_cb: (delta: string) => void) => () => {},
      getCurrentText: () => '',
      getTitle: () => '',
    };
    expect(scraper.getTitle()).toBe('');
  });

  it('IConversationTracker uses title-based start/resume and has updateTitle', () => {
    const tracker: IConversationTracker = {
      start: (_title: string, _platform: string) => Promise.resolve(null as any),
      resume: (_title: string) => Promise.resolve(null),
      addDelta: (_params: AddDeltaParams) => Promise.resolve(),
      updateTitle: (_title: string) => Promise.resolve(),
      getCurrent: () => null,
    };
    expect(tracker).toBeDefined();
  });

  it('IConversationStore uses findByTitle and update fields use title', () => {
    const store: IConversationStore = {
      create: (_record: ConversationRecord) => Promise.resolve(),
      update: (_id: string, _fields: any) => Promise.resolve(),
      findByTitle: (_title: string, _platform: string) => Promise.resolve(null),
      findAll: () => Promise.resolve([]),
      delete: (_id: string) => Promise.resolve(),
    };
    expect(store).toBeDefined();
  });

  it('PlatformSelectors has pageTitle and titleSelector', () => {
    const selectors: PlatformSelectors = {
      messages: '.msg',
      pageTitle: 'title',
      titleSelector: 'h1',
      input: 'textarea',
    };
    expect(selectors.pageTitle).toBe('title');
    expect(selectors.titleSelector).toBe('h1');
  });

  it('interfaces are structural (compile-time check)', () => {
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
