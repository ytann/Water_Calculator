export interface PlatformSelectors {
  messages: string;
  pageTitle: string;
  titleSelector: string;
  input: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  urlMatch: string;
  selectors: PlatformSelectors;
  builtIn: boolean;
  tokenMultiplier: number;
}

export interface ConversationRecord {
  id: string;
  url: string;
  platform: string;
  title: string;
  waterMl: number;
  tokenCount: number;
  startedAt: string;
  updatedAt: string;
}

export type OverlayState =
  | 'active'
  | 'idle'
  | 'new-chat'
  | 'returning'
  | 'minimized';

export interface IPlatformDetector {
  resolve(): PlatformConfig | null;
  register(config: PlatformConfig): void;
}

export interface ITextScraper {
  attach(container: Element): void;
  detach(): void;
  onNewText(callback: (delta: string) => void): () => void;
  getCurrentText(): string;
  getTitle(): string;
}

export interface ITokenEstimator {
  estimate(text: string): number;
  reset(): void;
  setMultiplier(m: number): void;
  setLastCount(count: number): void;
}

export interface IWaterConverter {
  toMl(tokens: number): number;
}

export interface IOverlayUI {
  mount(): void;
  unmount(): void;
  update(ml: number): void;
  setState(state: OverlayState): void;
  isMounted(): boolean;
  setOnDoubleClick(callback: (() => void) | null): void;
}

export interface AddDeltaParams {
  ml: number;
  tokens: number;
  title?: string;
}

export interface IConversationTracker {
  start(title: string, platform: string): Promise<ConversationRecord>;
  resume(title: string, platform?: string): Promise<ConversationRecord | null>;
  addDelta(params: AddDeltaParams): Promise<void>;
  updateTitle(title: string): Promise<void>;
  getCurrent(): ConversationRecord | null;
}

export interface IConversationStore {
  create(record: ConversationRecord): Promise<void>;
  update(id: string, fields: Partial<Pick<ConversationRecord, 'waterMl' | 'tokenCount' | 'title' | 'updatedAt'>>): Promise<void>;
  findByTitle(title: string, platform: string): Promise<ConversationRecord | null>;
  findAll(): Promise<ConversationRecord[]>;
  delete(id: string): Promise<void>;
}

export interface DashboardPayload {
  totals: {
    waterMl: number;
    tokens: number;
    conversations: number;
    firstDate: string;
  };
  byPlatform: PlatformBreakdown[];
  byTopic: TopicBreakdown[];
  equivalents: Equivalent[];
  topConversations: ConversationRecord[];
}

export interface PlatformBreakdown {
  platform: string;
  waterMl: number;
  tokens: number;
  count: number;
}

export interface TopicBreakdown {
  topic: string;
  waterMl: number;
  tokens: number;
  count: number;
}

export interface Equivalent {
  label: string;
  value: number;
  spriteKey: string;
  unit: string;
}

export interface ITopicCategorizer {
  categorize(title: string): string;
}
