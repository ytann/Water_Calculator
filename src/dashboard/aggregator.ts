import type { ConversationRecord, IConversationStore, ITopicCategorizer } from '../shared/types';
import type { DashboardPayload, PlatformBreakdown, TopicBreakdown } from '../shared/types';
import type { EquivalentGenerator } from './equivalents';

export class DashboardAggregator {
  constructor(
    private store: IConversationStore,
    private categorizer: ITopicCategorizer,
    private equivalents: EquivalentGenerator,
  ) {}

  async generate(): Promise<DashboardPayload> {
    const records = await this.store.findAll();

    const totals = {
      waterMl: 0,
      tokens: 0,
      conversations: records.length,
      firstDate: records.length > 0
        ? records.reduce((earliest, r) => r.startedAt < earliest ? r.startedAt : earliest, records[0].startedAt)
        : new Date(0).toISOString(),
    };

    for (const r of records) {
      totals.waterMl += r.waterMl;
      totals.tokens += r.tokenCount;
    }

    const platformMap = new Map<string, PlatformBreakdown>();
    for (const r of records) {
      const existing = platformMap.get(r.platform);
      if (existing) {
        existing.waterMl += r.waterMl;
        existing.tokens += r.tokenCount;
        existing.count++;
      } else {
        platformMap.set(r.platform, {
          platform: r.platform,
          waterMl: r.waterMl,
          tokens: r.tokenCount,
          count: 1,
        });
      }
    }
    const byPlatform = [...platformMap.values()].sort((a, b) => b.waterMl - a.waterMl);

    const topicMap = new Map<string, TopicBreakdown>();
    for (const r of records) {
      const topic = this.categorizer.categorize(r.title);
      const existing = topicMap.get(topic);
      if (existing) {
        existing.waterMl += r.waterMl;
        existing.tokens += r.tokenCount;
        existing.count++;
      } else {
        topicMap.set(topic, {
          topic,
          waterMl: r.waterMl,
          tokens: r.tokenCount,
          count: 1,
        });
      }
    }
    const byTopic = [...topicMap.values()].sort((a, b) => b.waterMl - a.waterMl);

    const eqs = this.equivalents.generate(totals.waterMl);

    const topConversations = [...records]
      .sort((a, b) => b.waterMl - a.waterMl)
      .slice(0, 5);

    return {
      totals,
      byPlatform,
      byTopic,
      equivalents: eqs,
      topConversations,
    };
  }
}
