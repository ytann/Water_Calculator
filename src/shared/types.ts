export interface PlatformSelectors {
  messages: string;
  title: string;
  input: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  urlMatch: string;
  selectors: PlatformSelectors;
  builtIn: boolean;
}

export interface ConversationRecord {
  id: string;
  url: string;
  platform: string;
  topic: string;
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
}

export interface ITokenEstimator {
  estimate(text: string): number;
  reset(): void;
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
}

export interface AddDeltaParams {
  ml: number;
  tokens: number;
  topic?: string;
}

export interface IConversationTracker {
  start(url: string, platform: string): Promise<ConversationRecord>;
  resume(url: string): Promise<ConversationRecord | null>;
  addDelta(params: AddDeltaParams): Promise<void>;
  getCurrent(): ConversationRecord | null;
}

export interface IConversationStore {
  create(record: ConversationRecord): Promise<void>;
  update(id: string, fields: Partial<Pick<ConversationRecord, 'waterMl' | 'tokenCount' | 'topic' | 'updatedAt'>>): Promise<void>;
  findByUrl(url: string): Promise<ConversationRecord | null>;
  findAll(): Promise<ConversationRecord[]>;
  delete(id: string): Promise<void>;
}
