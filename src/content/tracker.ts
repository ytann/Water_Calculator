import type { ConversationRecord, IConversationStore, IOverlayUI, IConversationTracker, AddDeltaParams } from '../shared/types';

const MAX_WATER_ML = 9_999_000; // 9999L cap

export class ConversationTracker implements IConversationTracker {
  private current: ConversationRecord | null = null;

  constructor(
    private store: IConversationStore,
    private overlay: IOverlayUI,
  ) {}

  async start(url: string, platform: string): Promise<ConversationRecord> {
    const record: ConversationRecord = {
      id: crypto.randomUUID(),
      url,
      platform,
      topic: '',
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

  async resume(url: string): Promise<ConversationRecord | null> {
    const record = await this.store.findByUrl(url);
    if (record) {
      this.current = record;
      this.overlay.update(record.waterMl);
    }
    return record ?? null;
  }

  async addDelta(params: AddDeltaParams): Promise<void> {
    if (!this.current) return;

    this.current.waterMl = Math.min(this.current.waterMl + params.ml, MAX_WATER_ML);
    this.current.tokenCount += params.tokens;
    this.current.updatedAt = new Date().toISOString();
    if (params.topic !== undefined) {
      this.current.topic = params.topic;
    }

    this.overlay.update(this.current.waterMl);

    await this.store.update(this.current.id, {
      waterMl: this.current.waterMl,
      tokenCount: this.current.tokenCount,
      updatedAt: this.current.updatedAt,
      ...(params.topic !== undefined ? { topic: params.topic } : {}),
    });
  }

  getCurrent(): ConversationRecord | null {
    return this.current;
  }
}
