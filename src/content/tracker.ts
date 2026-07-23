import type { ConversationRecord, IConversationStore, IOverlayUI, IConversationTracker, AddDeltaParams } from '../shared/types';

const MAX_WATER_ML = 9_999_000;

export class ConversationTracker implements IConversationTracker {
  private current: ConversationRecord | null = null;

  constructor(
    private store: IConversationStore,
    private overlay: IOverlayUI,
  ) {}

  async start(title: string, platform: string): Promise<ConversationRecord> {
    const record: ConversationRecord = {
      id: crypto.randomUUID(),
      url: window.location.href,
      platform,
      title,
      waterMl: 0,
      tokenCount: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.store.create(record);
    this.current = record;
    this.overlay.update(0);
    return record;
  }

  async resume(title: string, platform?: string): Promise<ConversationRecord | null> {
    const searchPlatform = this.current?.platform ?? platform;
    if (!searchPlatform) return null;
    const record = await this.store.findByTitle(title, searchPlatform);
    if (record) {
      this.current = record;
      this.current.url = window.location.href;
      this.overlay.update(record.waterMl);
    }
    return record ?? null;
  }

  async addDelta(params: AddDeltaParams): Promise<void> {
    if (!this.current) return;

    this.current.waterMl = Math.min(this.current.waterMl + params.ml, MAX_WATER_ML);
    this.current.tokenCount += params.tokens;
    this.current.updatedAt = new Date().toISOString();
    if (params.title !== undefined) {
      this.current.title = params.title;
    }

    this.overlay.update(this.current.waterMl);

    await this.store.update(this.current.id, {
      waterMl: this.current.waterMl,
      tokenCount: this.current.tokenCount,
      updatedAt: this.current.updatedAt,
      ...(params.title !== undefined ? { title: params.title } : {}),
    });
  }

  async updateTitle(title: string): Promise<void> {
    if (!this.current) return;
    this.current.title = title;
    await this.store.update(this.current.id, { title });
  }

  getCurrent(): ConversationRecord | null {
    return this.current;
  }
}
