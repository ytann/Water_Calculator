import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBStore } from '../../src/shared/db';
import type { ConversationRecord } from '../../src/shared/types';

describe('IndexedDBStore', () => {
  let store: IndexedDBStore;

  beforeEach(async () => {
    await chrome.storage.local.set({ conversations: {} });
    store = new IndexedDBStore();
  });

  const makeRecord = (overrides: Partial<ConversationRecord> = {}): ConversationRecord => ({
    id: crypto.randomUUID(),
    url: 'https://chatgpt.com/c/test',
    platform: 'chatgpt',
    title: 'Test',
    waterMl: 0,
    tokenCount: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  it('creates and retrieves a record by url', async () => {
    const rec = makeRecord();
    await store.create(rec);
    const found = await store.findByUrl(rec.url);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(rec.id);
  });

  it('findByUrl returns null for unknown url', async () => {
    const found = await store.findByUrl('https://unknown.com');
    expect(found).toBeNull();
  });

  it('finds by title and platform', async () => {
    const rec = makeRecord({ title: 'My Chat', platform: 'gemini' });
    await store.create(rec);
    const found = await store.findByTitle('My Chat', 'gemini');
    expect(found).not.toBeNull();
    expect(found!.id).toBe(rec.id);
  });

  it('findByTitle returns null for wrong platform', async () => {
    const rec = makeRecord({ title: 'My Chat', platform: 'chatgpt' });
    await store.create(rec);
    const found = await store.findByTitle('My Chat', 'gemini');
    expect(found).toBeNull();
  });

  it('updates waterMl and tokenCount', async () => {
    const rec = makeRecord();
    await store.create(rec);
    await store.update(rec.id, { waterMl: 100, tokenCount: 50, updatedAt: new Date().toISOString() });
    const found = await store.findByUrl(rec.url);
    expect(found!.waterMl).toBe(100);
    expect(found!.tokenCount).toBe(50);
  });

  it('update throws for unknown id', async () => {
    await expect(store.update('no-such-id', { waterMl: 1 })).rejects.toThrow('not found');
  });

  it('findAll returns all records', async () => {
    await store.create(makeRecord({ url: 'https://a.com' }));
    await store.create(makeRecord({ url: 'https://b.com' }));
    const all = await store.findAll();
    expect(all).toHaveLength(2);
  });

  it('deletes a record', async () => {
    const rec = makeRecord();
    await store.create(rec);
    await store.delete(rec.id);
    const found = await store.findByUrl(rec.url);
    expect(found).toBeNull();
  });
});
