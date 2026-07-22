import type { ConversationRecord, IConversationStore } from './types';

const STORAGE_KEY = 'conversations';

export class IndexedDBStore implements IConversationStore {
  private async readAll(): Promise<Record<string, ConversationRecord>> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] ?? {};
  }

  private async writeAll(map: Record<string, ConversationRecord>): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: map });
  }

  async create(record: ConversationRecord): Promise<void> {
    const map = await this.readAll();
    map[record.id] = record;
    await this.writeAll(map);
  }

  async update(
    id: string,
    fields: Partial<Pick<ConversationRecord, 'waterMl' | 'tokenCount' | 'title' | 'updatedAt'>>
  ): Promise<void> {
    const map = await this.readAll();
    const record = map[id];
    if (!record) throw new Error(`Record ${id} not found`);
    Object.assign(record, fields);
    await this.writeAll(map);
  }

  async findByUrl(url: string): Promise<ConversationRecord | null> {
    const map = await this.readAll();
    return Object.values(map).find(r => r.url === url) ?? null;
  }

  async findByTitle(title: string, platform: string): Promise<ConversationRecord | null> {
    const map = await this.readAll();
    return Object.values(map).find(r => r.title === title && r.platform === platform) ?? null;
  }

  async findAll(): Promise<ConversationRecord[]> {
    const map = await this.readAll();
    return Object.values(map);
  }

  async delete(id: string): Promise<void> {
    const map = await this.readAll();
    delete map[id];
    await this.writeAll(map);
  }
}
