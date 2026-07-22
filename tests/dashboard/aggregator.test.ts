import { describe, it, expect } from 'vitest';
import { DashboardAggregator } from '../../src/dashboard/aggregator';
import { TopicCategorizer } from '../../src/dashboard/categorizer';
import { EquivalentGenerator } from '../../src/dashboard/equivalents';
import type { ConversationRecord, IConversationStore } from '../../src/shared/types';

function fakeStore(records: ConversationRecord[]): IConversationStore {
  return {
    create: async () => {},
    update: async () => {},
    findByTitle: async () => null,
    findAll: async () => records,
    delete: async () => {},
  };
}

function makeRecord(overrides: Partial<ConversationRecord> = {}): ConversationRecord {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'test-id',
    url: 'https://chatgpt.com/c/test',
    platform: 'chatgpt',
    title: 'Untitled',
    waterMl: 0,
    tokenCount: 0,
    startedAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    ...overrides,
  };
}

describe('DashboardAggregator', () => {
  const categorizer = new TopicCategorizer();
  const equivalents = new EquivalentGenerator();

  it('computes totals from records', async () => {
    const store = fakeStore([
      makeRecord({ waterMl: 100, tokenCount: 30 }),
      makeRecord({ waterMl: 200, tokenCount: 60 }),
      makeRecord({ waterMl: 50, tokenCount: 15 }),
    ]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    expect(payload.totals.waterMl).toBe(350);
    expect(payload.totals.tokens).toBe(105);
    expect(payload.totals.conversations).toBe(3);
  });

  it('returns first date from records', async () => {
    const store = fakeStore([
      makeRecord({ startedAt: '2026-07-10T00:00:00.000Z' }),
      makeRecord({ startedAt: '2026-07-05T00:00:00.000Z' }),
    ]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    expect(payload.totals.firstDate).toBe('2026-07-05T00:00:00.000Z');
  });

  it('groups by platform', async () => {
    const store = fakeStore([
      makeRecord({ platform: 'chatgpt', waterMl: 100, tokenCount: 10 }),
      makeRecord({ platform: 'gemini', waterMl: 200, tokenCount: 20 }),
      makeRecord({ platform: 'chatgpt', waterMl: 50, tokenCount: 5 }),
    ]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    const chatgpt = payload.byPlatform.find(p => p.platform === 'chatgpt');
    expect(chatgpt).toBeTruthy();
    expect(chatgpt!.waterMl).toBe(150);
    expect(chatgpt!.count).toBe(2);
  });

  it('groups by topic using categorizer', async () => {
    const store = fakeStore([
      makeRecord({ title: 'React component debugging', waterMl: 100, tokenCount: 10 }),
      makeRecord({ title: 'Building REST APIs with Express', waterMl: 200, tokenCount: 20 }),
      makeRecord({ title: 'CSS layout fixing', waterMl: 50, tokenCount: 5 }),
    ]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    const frontend = payload.byTopic.find(t => t.topic === 'Frontend');
    expect(frontend).toBeTruthy();
    expect(frontend!.waterMl).toBe(150);
    expect(frontend!.count).toBe(2);
  });

  it('includes top 5 conversations sorted by waterMl', async () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      makeRecord({ title: `Chat ${i}`, waterMl: i * 100 })
    );
    const store = fakeStore(records);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    expect(payload.topConversations.length).toBeLessThanOrEqual(5);
    if (payload.topConversations.length >= 2) {
      expect(payload.topConversations[0].waterMl).toBeGreaterThanOrEqual(payload.topConversations[1].waterMl);
    }
  });

  it('handles empty store', async () => {
    const store = fakeStore([]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    expect(payload.totals.conversations).toBe(0);
    expect(payload.totals.waterMl).toBe(0);
    expect(payload.byPlatform).toHaveLength(0);
    expect(payload.byTopic).toHaveLength(0);
    expect(payload.equivalents).toHaveLength(0);
  });
});
