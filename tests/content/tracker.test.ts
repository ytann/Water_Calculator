import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationTracker } from '../../src/content/tracker';
import type { IConversationStore, IOverlayUI, ConversationRecord } from '../../src/shared/types';

const mockStore: IConversationStore = {
  create: vi.fn(),
  update: vi.fn(),
  findByTitle: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
};

const mockOverlay: IOverlayUI = {
  mount: vi.fn(),
  unmount: vi.fn(),
  update: vi.fn(),
  setState: vi.fn(),
  isMounted: vi.fn(() => true),
  setOnDoubleClick: vi.fn(),
};

describe('ConversationTracker', () => {
  let tracker: ConversationTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    tracker = new ConversationTracker(mockStore, mockOverlay);
  });

  it('start creates a new record with title', async () => {
    const record = await tracker.start('My Chat', 'chatgpt');
    expect(mockStore.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My Chat',
      platform: 'chatgpt',
      waterMl: 0,
    }));
    expect(record.title).toBe('My Chat');
  });

  it('start updates overlay with 0', async () => {
    await tracker.start('Test', 'gemini');
    expect(mockOverlay.update).toHaveBeenCalledWith(0);
  });

  it('resume loads existing record by title', async () => {
    await tracker.start('Existing Chat', 'chatgpt');
    const saved: ConversationRecord = {
      id: 'abc',
      url: 'https://chatgpt.com/c/123',
      platform: 'chatgpt',
      title: 'Existing Chat',
      waterMl: 42,
      tokenCount: 100,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(mockStore.findByTitle).mockResolvedValue(saved);

    const record = await tracker.resume('Existing Chat');
    expect(mockStore.findByTitle).toHaveBeenCalledWith('Existing Chat', 'chatgpt');
    expect(record!.waterMl).toBe(42);
    expect(mockOverlay.update).toHaveBeenCalledWith(42);
  });

  it('resume returns null when no record found', async () => {
    await tracker.start('New Chat', 'chatgpt');
    vi.mocked(mockStore.findByTitle).mockResolvedValue(null);
    const record = await tracker.resume('Unknown');
    expect(record).toBeNull();
  });

  it('addDelta tracks water and tokens', async () => {
    await tracker.start('Chat', 'chatgpt');
    await tracker.addDelta({ ml: 10, tokens: 5 });
    expect(tracker.getCurrent()!.waterMl).toBe(10);
    expect(tracker.getCurrent()!.tokenCount).toBe(5);
  });

  it('addDelta caps at MAX_WATER_ML', async () => {
    await tracker.start('Chat', 'chatgpt');
    await tracker.addDelta({ ml: 10_000_000, tokens: 0 });
    expect(tracker.getCurrent()!.waterMl).toBe(9_999_000);
  });

  it('addDelta updates title when provided', async () => {
    await tracker.start('Chat', 'chatgpt');
    await tracker.addDelta({ ml: 0, tokens: 0, title: 'Renamed Chat' });
    expect(tracker.getCurrent()!.title).toBe('Renamed Chat');
  });

  it('updateTitle persists title change', async () => {
    await tracker.start('Chat', 'chatgpt');
    await tracker.updateTitle('Updated Chat');
    expect(tracker.getCurrent()!.title).toBe('Updated Chat');
    expect(mockStore.update).toHaveBeenCalledWith(expect.any(String), { title: 'Updated Chat' });
  });

  it('getCurrent returns null before start', () => {
    expect(tracker.getCurrent()).toBeNull();
  });
});
