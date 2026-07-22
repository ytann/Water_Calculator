# Water Calculator Extension - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 Chrome extension that estimates LLM conversation water consumption via DOM scraping, displays a draggable water-fill overlay, and persists per-conversation records locally in IndexedDB.

**Architecture:** Interface-first OOP. 7 self-contained content-script modules (detector, scraper, estimator, converter, overlay, tracker, orchestrator) wired together with constructor injection. All shared types in `src/shared/types.ts`, all DB access through `src/shared/db.ts`. Background service worker bridges IndexedDB. Options page for custom platform configs.

**Tech Stack:** TypeScript 5.x, Vite with `@crxjs/vite-plugin` (Manifest V3), Vitest + jsdom for testing, no UI framework.

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite + crxjs plugin for extension build |
| `manifest.json` | Manifest V3 (source; Vite transforms it) |
| `src/shared/types.ts` | `PlatformConfig`, `ConversationRecord`, `OverlayState`, all interfaces |
| `src/shared/constants.ts` | Default platform configs, water ratio, citation text |
| `src/shared/db.ts` | `IDatabase` interface + `IndexedDBStore` class |
| `src/content/detector.ts` | `IPlatformDetector` + `PlatformDetector` class |
| `src/content/converter.ts` | `IWaterConverter` + `WaterConverter` class |
| `src/content/estimator.ts` | `ITokenEstimator` + `BPEstimator` class |
| `src/content/scraper.ts` | `ITextScraper` + `DOMScraper` class |
| `src/content/overlay.ts` | `IOverlayUI` + `WaterOverlay` class |
| `src/content/tracker.ts` | `IConversationTracker` + `ConversationTracker` class |
| `src/content/index.ts` | Orchestrator: wires all modules, lifecycle management |
| `src/background/index.ts` | Service worker: DB relay, platform config management |
| `src/options/index.html` | Options page HTML |
| `src/options/index.ts` | Options page logic |
| `tests/` | Mirrors `src/` structure, `*.test.ts` files |
| `docs/superpowers/plans/` | This plan |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `manifest.json`
- Create: `src/shared/`, `src/content/`, `src/background/`, `src/options/`, `tests/` directories

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "water-calculator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.28",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0",
    "@types/chrome": "^0.0.268"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["chrome", "vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' assert { type: 'json' };

export default defineConfig({
  plugins: [crx({ manifest })],
});
```

- [ ] **Step 5: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Water Calculator",
  "version": "0.1.0",
  "description": "Track water consumption of your LLM conversations",
  "permissions": ["storage"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://gemini.google.com/*",
    "https://claude.ai/*",
    "https://www.perplexity.ai/*"
  ],
  "background": {
    "service_worker": "src/background/index.ts"
  },
  "content_scripts": [
    {
      "matches": [
        "https://chatgpt.com/*",
        "https://gemini.google.com/*",
        "https://claude.ai/*",
        "https://www.perplexity.ai/*"
      ],
      "js": ["src/content/index.ts"]
    }
  ],
  "options_page": "src/options/index.html"
}
```

- [ ] **Step 6: Create directory structure**

```bash
mkdir -p src/shared src/content src/background src/options tests
```

- [ ] **Step 7: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

- [ ] **Step 8: Verify setup**

```bash
npm run build
```

Expected: Build succeeds (empty modules, no errors).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts manifest.json
git commit -m "scaffold: Vite + crxjs + TypeScript + Vitest setup"
```

---

### Task 2: Shared Types and Interfaces

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Write the test**

Create `tests/shared/types.test.ts`:

```ts
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
} from '../../src/shared/types';

describe('shared types', () => {
  it('PlatformConfig has required fields', () => {
    const cfg: PlatformConfig = {
      id: 'chatgpt',
      name: 'ChatGPT',
      urlMatch: 'chatgpt.com',
      selectors: {
        messages: '[data-message-author-role]',
        title: 'title',
        input: '#prompt-textarea',
      },
      builtIn: true,
    };
    expect(cfg.id).toBe('chatgpt');
    expect(cfg.selectors.messages).toBe('[data-message-author-role]');
  });

  it('ConversationRecord has all fields', () => {
    const record: ConversationRecord = {
      id: 'uuid-1',
      url: 'https://chatgpt.com/c/abc',
      platform: 'chatgpt',
      topic: 'Test topic',
      waterMl: 0,
      tokenCount: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(record.waterMl).toBe(0);
  });

  it('interfaces are structural (compile-time check)', () => {
    // If this compiles, all interface members are present
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
```

- [ ] **Step 2: Run test to verify it fails (no types file yet)**

```bash
npx vitest run tests/shared/types.test.ts
```

Expected: FAIL - Cannot find module `../../src/shared/types`.

- [ ] **Step 3: Create `src/shared/types.ts`**

```ts
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
  onNewText(callback: (delta: string) => void): void;
}

export interface ITokenEstimator {
  estimate(text: string): number;
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

export interface IConversationTracker {
  start(url: string, platform: string): Promise<ConversationRecord>;
  resume(url: string): Promise<ConversationRecord | null>;
  addDelta(ml: number, tokens: number, topic?: string): Promise<void>;
  getCurrent(): ConversationRecord | null;
}

export interface IConversationStore {
  create(record: ConversationRecord): Promise<void>;
  update(id: string, fields: Partial<Pick<ConversationRecord, 'waterMl' | 'tokenCount' | 'topic' | 'updatedAt'>>): Promise<void>;
  findByUrl(url: string): Promise<ConversationRecord | null>;
  findAll(): Promise<ConversationRecord[]>;
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/shared/types.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts tests/shared/types.test.ts
git commit -m "feat: shared types and interfaces"
```

---

### Task 3: Constants and Default Platform Configs

**Files:**
- Create: `src/shared/constants.ts`

- [ ] **Step 1: Write the test**

Create `tests/shared/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  WATER_ML_PER_TOKEN,
  WATER_CITATION,
  DEFAULT_PLATFORMS,
} from '../../src/shared/constants';

describe('constants', () => {
  it('WATER_ML_PER_TOKEN is 0.003', () => {
    expect(WATER_ML_PER_TOKEN).toBe(0.003);
  });

  it('WATER_CITATION is a non-empty string', () => {
    expect(WATER_CITATION.length).toBeGreaterThan(0);
  });

  it('DEFAULT_PLATFORMS includes 4 platforms', () => {
    expect(DEFAULT_PLATFORMS).toHaveLength(4);
  });

  it('each platform has required selector fields', () => {
    for (const p of DEFAULT_PLATFORMS) {
      expect(typeof p.id).toBe('string');
      expect(p.selectors.messages.length).toBeGreaterThan(0);
      expect(p.selectors.title.length).toBeGreaterThan(0);
      expect(p.selectors.input.length).toBeGreaterThan(0);
      expect(p.builtIn).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/shared/constants.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/shared/constants.ts`**

```ts
import type { PlatformConfig } from './types';

export const WATER_ML_PER_TOKEN = 0.003;

export const WATER_CITATION =
  'Water usage estimate based on: Li et al. (2023) "Making AI Less Thirsty" and Patterson et al. (2022) data center water efficiency benchmarks. Ratio: 3 ml per 1,000 tokens (inference only).';

export const DEFAULT_PLATFORMS: PlatformConfig[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    urlMatch: 'chatgpt.com',
    selectors: {
      messages: '[data-message-author-role]',
      title: 'title',
      input: '#prompt-textarea',
    },
    builtIn: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    urlMatch: 'gemini.google.com',
    selectors: {
      messages: '.message-content',
      title: 'title',
      input: 'rich-textarea',
    },
    builtIn: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    urlMatch: 'claude.ai',
    selectors: {
      messages: '[data-start], .message-content',
      title: 'title',
      input: '.ProseMirror',
    },
    builtIn: true,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    urlMatch: 'perplexity.ai',
    selectors: {
      messages: '.prose, .message',
      title: 'title',
      input: 'textarea',
    },
    builtIn: true,
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/shared/constants.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/constants.ts tests/shared/constants.test.ts
git commit -m "feat: constants, default platform configs, water ratio"
```

---

### Task 4: IndexedDB Store

**Files:**
- Create: `src/shared/db.ts`

- [ ] **Step 1: Write the test**

Create `tests/shared/db.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBStore } from '../../src/shared/db';
import type { ConversationRecord, IConversationStore } from '../../src/shared/types';
import 'fake-indexeddb/auto';

describe('IndexedDBStore', () => {
  let store: IConversationStore;
  const dbName = 'test-water-calc';

  beforeEach(async () => {
    store = new IndexedDBStore(dbName);
    await store['ready'];
  });

  afterEach(async () => {
    indexedDB.deleteDatabase(dbName);
  });

  const makeRecord = (overrides: Partial<ConversationRecord> = {}): ConversationRecord => ({
    id: crypto.randomUUID(),
    url: 'https://chatgpt.com/c/test',
    platform: 'chatgpt',
    topic: 'Test',
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

  it('updates waterMl and tokenCount', async () => {
    const rec = makeRecord();
    await store.create(rec);
    await store.update(rec.id, { waterMl: 100, tokenCount: 50, updatedAt: new Date().toISOString() });
    const found = await store.findByUrl(rec.url);
    expect(found!.waterMl).toBe(100);
    expect(found!.tokenCount).toBe(50);
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
```

- [ ] **Step 2: Install fake-indexeddb for testing**

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/shared/db.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Create `src/shared/db.ts`**

```ts
import type { ConversationRecord, IConversationStore } from './types';

const STORE_NAME = 'conversations';
const DB_VERSION = 1;

export class IndexedDBStore implements IConversationStore {
  private ready: Promise<void>;

  constructor(private dbName: string = 'WaterCalculator') {
    this.ready = this.openDB();
  }

  private openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('platform', 'platform', { unique: false });
        }
      };

      req.onsuccess = () => { req.result.close(); resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  private db(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async create(record: ConversationRecord): Promise<void> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(record);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async update(
    id: string,
    fields: Partial<Pick<ConversationRecord, 'waterMl' | 'tokenCount' | 'topic' | 'updatedAt'>>
  ): Promise<void> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) { db.close(); return reject(new Error(`Record ${id} not found`)); }
        Object.assign(record, fields);
        store.put(record);
        tx.oncomplete = () => { db.close(); resolve(); };
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async findByUrl(url: string): Promise<ConversationRecord | null> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('url');
      const req = index.get(url);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => reject(req.error);
    });
  }

  async findAll(): Promise<ConversationRecord[]> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<void> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/shared/db.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/db.ts tests/shared/db.test.ts package.json package-lock.json
git commit -m "feat: IndexedDB conversation store"
```

---

### Task 5: Water Converter

**Files:**
- Create: `src/content/converter.ts`

- [ ] **Step 1: Write the test**

Create `tests/content/converter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { WaterConverter } from '../../src/content/converter';
import type { IWaterConverter } from '../../src/shared/types';

describe('WaterConverter', () => {
  let converter: IWaterConverter;

  it('converts 1000 tokens to 3 ml', () => {
    converter = new WaterConverter();
    expect(converter.toMl(1000)).toBe(3);
  });

  it('converts 0 tokens to 0 ml', () => {
    converter = new WaterConverter();
    expect(converter.toMl(0)).toBe(0);
  });

  it('handles fractional results', () => {
    converter = new WaterConverter();
    const result = converter.toMl(1);
    expect(result).toBeCloseTo(0.003, 5);
  });

  it('accepts a custom ratio in constructor', () => {
    converter = new WaterConverter(0.005);
    expect(converter.toMl(1000)).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/content/converter.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/content/converter.ts`**

```ts
import type { IWaterConverter } from '../shared/types';
import { WATER_ML_PER_TOKEN } from '../shared/constants';

export class WaterConverter implements IWaterConverter {
  constructor(private ratio: number = WATER_ML_PER_TOKEN) {}

  toMl(tokens: number): number {
    return tokens * this.ratio;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/content/converter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/converter.ts tests/content/converter.test.ts
git commit -m "feat: water converter module"
```

---

### Task 6: BPE Token Estimator

**Files:**
- Create: `src/content/estimator.ts`

- [ ] **Step 1: Write the test**

Create `tests/content/estimator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BPEstimator } from '../../src/content/estimator';
import type { ITokenEstimator } from '../../src/shared/types';

describe('BPEstimator', () => {
  let estimator: ITokenEstimator;

  beforeEach(() => {
    estimator = new BPEstimator();
  });

  it('returns 0 for empty string', () => {
    expect(estimator.estimate('')).toBe(0);
  });

  it('returns a positive number for non-empty text', () => {
    const tokens = estimator.estimate('Hello, world!');
    expect(tokens).toBeGreaterThan(0);
  });

  it('longer text produces more tokens', () => {
    const short = estimator.estimate('hi');
    const long = estimator.estimate('this is a much longer piece of text');
    expect(long).toBeGreaterThan(short);
  });

  it('token count is roughly proportional to character count', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const tokens = estimator.estimate(text);
    // Tokens should be fewer than characters (typical for BPE)
    expect(tokens).toBeLessThan(text.length);
    // But not ridiculously fewer (should be > 25% of chars)
    expect(tokens).toBeGreaterThan(text.length * 0.25);
  });

  it('handles repeated characters', () => {
    const tokens = estimator.estimate('aaaaaaaaaaaaaaaaaaaa');
    expect(tokens).toBeGreaterThan(0);
  });

  it('handles code-like text', () => {
    const tokens = estimator.estimate('function hello() { return 42; }');
    expect(tokens).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/content/estimator.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/content/estimator.ts`**

```ts
import type { ITokenEstimator } from '../shared/types';

const VOCAB: Map<string, number> = new Map();
const COMMON_PAIRS = [
  'th', 'he', 'in', 'er', 'an', 'on', 'at', 'en', 'nd', 'ti',
  'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar', 'st',
  'to', 'nt', 'ng', 'se', 'ha', 'as', 'ou', 'io', 'le', 've',
  'co', 'me', 'de', 'hi', 'ri', 'ro', 'ic', 'ne', 'ea', 'ra',
  'ce', 'li', 'ch', 'll', 'be', 'ma', 'si', 'om', 'ur', 'ca',
  'el', 'ta', 'la', 'ns', 'di', 'fo', 're', 'wh', 'wi', 'bu',
];
for (let i = 0; i < COMMON_PAIRS.length; i++) {
  VOCAB.set(COMMON_PAIRS[i], i);
}

const BYTE_TO_STR: Record<number, string> = {};
for (let i = 0; i < 256; i++) {
  BYTE_TO_STR[i] = String.fromCodePoint(i);
}

export class BPEstimator implements ITokenEstimator {
  estimate(text: string): number {
    if (text.length === 0) return 0;

    const tokens: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 256) {
        tokens.push(BYTE_TO_STR[code]);
      } else {
        tokens.push(text[i]);
      }
    }

    while (true) {
      let bestPair: [number, number] | null = null;
      let bestRank = Infinity;

      for (let i = 0; i < tokens.length - 1; i++) {
        const pairKey = tokens[i] + tokens[i + 1];
        const rank = VOCAB.get(pairKey);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestPair = [i, i + 1];
        }
      }

      if (bestPair === null) break;

      const merged = tokens[bestPair[0]] + tokens[bestPair[1]];
      tokens.splice(bestPair[0], 2, merged);
    }

    return tokens.length;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/content/estimator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/estimator.ts tests/content/estimator.test.ts
git commit -m "feat: BPE token estimator"
```

---

### Task 7: Platform Detector

**Files:**
- Create: `src/content/detector.ts`

- [ ] **Step 1: Write the test**

Create `tests/content/detector.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformDetector } from '../../src/content/detector';
import type { IPlatformDetector, PlatformConfig } from '../../src/shared/types';

describe('PlatformDetector', () => {
  let detector: IPlatformDetector;
  const chatGptConfig: PlatformConfig = {
    id: 'chatgpt',
    name: 'ChatGPT',
    urlMatch: 'chatgpt.com',
    selectors: { messages: '[data-message]', title: 'title', input: '#input' },
    builtIn: true,
  };

  beforeEach(() => {
    detector = new PlatformDetector([chatGptConfig]);
  });

  it('detects platform by URL match', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'chatgpt.com', href: 'https://chatgpt.com/c/abc' },
      writable: true,
    });
    const result = detector.resolve();
    expect(result).not.toBeNull();
    expect(result!.id).toBe('chatgpt');
  });

  it('returns null for unknown platform', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'unknown.com', href: 'https://unknown.com' },
      writable: true,
    });
    const result = detector.resolve();
    expect(result).toBeNull();
  });

  it('falls back to DOM fingerprint when URL resolves but confirm with DOM', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'chatgpt.com', href: 'https://chatgpt.com/c/abc' },
      writable: true,
    });
    document.body.innerHTML = '<div data-message="">hello</div>';
    const result = detector.resolve();
    expect(result).not.toBeNull();
  });

  it('returns null when URL matches but DOM fingerprint fails', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'chatgpt.com', href: 'https://chatgpt.com/c/abc' },
      writable: true,
    });
    document.body.innerHTML = '<div>no matching selectors</div>';
    const result = detector.resolve();
    expect(result).toBeNull();
  });

  it('register adds a platform', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'newplatform.com', href: 'https://newplatform.com' },
      writable: true,
    });
    detector.register({
      id: 'new',
      name: 'New',
      urlMatch: 'newplatform.com',
      selectors: { messages: '.msg', title: 'h1', input: 'textarea' },
      builtIn: false,
    });
    const result = detector.resolve();
    expect(result).not.toBeNull();
    expect(result!.id).toBe('new');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/content/detector.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/content/detector.ts`**

```ts
import type { IPlatformDetector, PlatformConfig } from '../shared/types';

export class PlatformDetector implements IPlatformDetector {
  constructor(private platforms: PlatformConfig[] = []) {}

  resolve(): PlatformConfig | null {
    const hostname = window.location.hostname;

    for (const platform of this.platforms) {
      if (!hostname.includes(platform.urlMatch)) continue;

      const element = document.querySelector(platform.selectors.messages);
      if (element) return platform;
    }

    return null;
  }

  register(config: PlatformConfig): void {
    const existing = this.platforms.findIndex((p) => p.id === config.id);
    if (existing >= 0) {
      this.platforms[existing] = config;
    } else {
      this.platforms.push(config);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/content/detector.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/detector.ts tests/content/detector.test.ts
git commit -m "feat: platform detector"
```

---

### Task 8: DOM Scraper

**Files:**
- Create: `src/content/scraper.ts`

- [ ] **Step 1: Write the test**

Create `tests/content/scraper.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DOMScraper } from '../../src/content/scraper';
import type { ITextScraper, PlatformConfig } from '../../src/shared/types';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const config: PlatformConfig = {
  id: 'test',
  name: 'Test',
  urlMatch: 'test.com',
  selectors: { messages: '.msg', title: 'h1', input: 'textarea' },
  builtIn: true,
};

describe('DOMScraper', () => {
  let scraper: ITextScraper;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('fires onNewText when a new message node is added', async () => {
    scraper = new DOMScraper(config);
    const callback = vi.fn();
    scraper.onNewText(callback);
    scraper.attach(container);

    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'Hello world';
    container.appendChild(msg);

    await delay(50);
    expect(callback).toHaveBeenCalledWith('Hello world');
  });

  it('does not fire for nodes that are not message selectors', async () => {
    scraper = new DOMScraper(config);
    const callback = vi.fn();
    scraper.onNewText(callback);
    scraper.attach(container);

    const other = document.createElement('div');
    other.className = 'not-msg';
    other.textContent = 'not a message';
    container.appendChild(other);

    await delay(50);
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not fire twice for the same node (data-wc-tracked)', async () => {
    scraper = new DOMScraper(config);
    const callback = vi.fn();
    scraper.onNewText(callback);
    scraper.attach(container);

    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'Hello';
    msg.setAttribute('data-wc-tracked', '1');
    container.appendChild(msg);

    await delay(50);
    expect(callback).not.toHaveBeenCalled();
  });

  it('detach stops observing', async () => {
    scraper = new DOMScraper(config);
    const callback = vi.fn();
    scraper.onNewText(callback);
    scraper.attach(container);
    scraper.detach();

    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'Should not fire';
    container.appendChild(msg);

    await delay(50);
    expect(callback).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/content/scraper.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/content/scraper.ts`**

```ts
import type { ITextScraper, PlatformConfig } from '../shared/types';

const TRACKED_ATTR = 'data-wc-tracked';

export class DOMScraper implements ITextScraper {
  private observer: MutationObserver | null = null;
  private callbacks: Array<(delta: string) => void> = [];

  constructor(private config: PlatformConfig) {}

  attach(container: Element): void {
    const selector = this.config.selectors.messages;

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;

          const messageNodes = node.matches(selector)
            ? [node]
            : Array.from(node.querySelectorAll(selector));

          for (const msgNode of messageNodes) {
            if (msgNode.hasAttribute(TRACKED_ATTR)) continue;
            msgNode.setAttribute(TRACKED_ATTR, '1');

            const text = (msgNode as HTMLElement).textContent ?? '';
            if (text.trim().length > 0) {
              for (const cb of this.callbacks) {
                cb(text);
              }
            }
          }
        }
      }
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
    });
  }

  detach(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  onNewText(callback: (delta: string) => void): void {
    this.callbacks.push(callback);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/content/scraper.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/scraper.ts tests/content/scraper.test.ts
git commit -m "feat: DOM scraper with MutationObserver"
```

---

### Task 9: Water Overlay UI

**Files:**
- Create: `src/content/overlay.ts`

- [ ] **Step 1: Write the test**

Create `tests/content/overlay.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { WaterOverlay } from '../../src/content/overlay';
import type { IOverlayUI } from '../../src/shared/types';

describe('WaterOverlay', () => {
  let overlay: IOverlayUI;

  beforeEach(() => {
    overlay = new WaterOverlay();
  });

  afterEach(() => {
    overlay.unmount();
  });

  it('mounts to document.body', () => {
    overlay.mount();
    const el = document.querySelector('#wc-overlay');
    expect(el).not.toBeNull();
  });

  it('isMounted returns true after mount', () => {
    overlay.mount();
    expect(overlay.isMounted()).toBe(true);
  });

  it('isMounted returns false before mount', () => {
    expect(overlay.isMounted()).toBe(false);
  });

  it('unmount removes from DOM', () => {
    overlay.mount();
    overlay.unmount();
    expect(document.querySelector('#wc-overlay')).toBeNull();
    expect(overlay.isMounted()).toBe(false);
  });

  it('update displays ml value', () => {
    overlay.mount();
    overlay.update(230);
    const counter = document.querySelector('#wc-overlay .wc-counter');
    expect(counter?.textContent).toContain('230');
  });

  it('does not throw if update called before mount', () => {
    expect(() => overlay.update(100)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/content/overlay.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/content/overlay.ts`**

```ts
import type { IOverlayUI, OverlayState } from '../shared/types';

const OVERLAY_ID = 'wc-overlay';

export class WaterOverlay implements IOverlayUI {
  private el: HTMLDivElement | null = null;
  private fillEl: HTMLDivElement | null = null;
  private counterEl: HTMLSpanElement | null = null;
  private dragState: { startX: number; startY: number; startLeft: number; startTop: number } | null = null;
  private currentMl = 0;

  mount(): void {
    if (this.el) return;

    this.el = document.createElement('div');
    this.el.id = OVERLAY_ID;
    this.el.innerHTML = `
      <div class="wc-drag-handle"></div>
      <div class="wc-water-fill"></div>
      <div class="wc-info">
        <span class="wc-counter">0 mL</span>
        <span class="wc-dot">&#128167;</span>
      </div>
      <button class="wc-minimize">_</button>
      <button class="wc-close">&times;</button>
    `;
    this.applyStyles();
    document.body.appendChild(this.el);

    this.fillEl = this.el.querySelector('.wc-water-fill');
    this.counterEl = this.el.querySelector('.wc-counter');

    this.setupDrag();
    this.setupButtons();
  }

  unmount(): void {
    this.el?.remove();
    this.el = null;
    this.fillEl = null;
    this.counterEl = null;
  }

  update(ml: number): void {
    this.currentMl = ml;
    if (!this.fillEl || !this.counterEl) return;

    const display = ml >= 1000
      ? `${(ml / 1000).toFixed(1)} L`
      : `${Math.round(ml)} mL`;

    this.counterEl.textContent = display;

    const maxFillMl = 2000;
    const pct = Math.min((ml / maxFillMl) * 100, 100);
    this.fillEl.style.height = `${pct}%`;
  }

  setState(state: OverlayState): void {
    this.el?.setAttribute('data-state', state);
  }

  isMounted(): boolean {
    return this.el !== null;
  }

  private applyStyles(): void {
    if (!this.el) return;
    const style = document.createElement('style');
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        width: 80px;
        height: 120px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        cursor: default;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        user-select: none;
      }
      #${OVERLAY_ID} .wc-drag-handle {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 16px;
        cursor: grab;
        z-index: 2;
      }
      #${OVERLAY_ID} .wc-water-fill {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 0%;
        background: linear-gradient(to top, #4facfe, #00f2fe);
        transition: height 300ms ease;
        border-radius: 0 0 16px 16px;
        opacity: 0.7;
        z-index: 0;
      }
      #${OVERLAY_ID} .wc-info {
        position: relative;
        z-index: 1;
        padding: 8px;
        text-align: center;
        font-size: 12px;
        color: #333;
      }
      #${OVERLAY_ID} .wc-counter {
        display: block;
        font-weight: 700;
        font-size: 14px;
      }
      #${OVERLAY_ID} .wc-dot {
        font-size: 10px;
      }
      #${OVERLAY_ID} .wc-minimize,
      #${OVERLAY_ID} .wc-close {
        position: absolute;
        top: 2px;
        background: none;
        border: none;
        font-size: 12px;
        cursor: pointer;
        color: #666;
        z-index: 3;
        padding: 0 4px;
        line-height: 1;
      }
      #${OVERLAY_ID} .wc-minimize { right: 22px; }
      #${OVERLAY_ID} .wc-close { right: 4px; }
      #${OVERLAY_ID}[data-state="minimized"] {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }
      #${OVERLAY_ID}[data-state="minimized"] .wc-info {
        font-size: 10px;
      }
      #${OVERLAY_ID}[data-state="minimized"] .wc-minimize {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  private setupDrag(): void {
    if (!this.el) return;
    const handle = this.el.querySelector('.wc-drag-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
      const me = e as MouseEvent;
      const el = this.el!;
      const rect = el.getBoundingClientRect();
      this.dragState = {
        startX: me.clientX,
        startY: me.clientY,
        startLeft: rect.left,
        startTop: rect.top,
      };
      el.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.dragState || !this.el) return;
      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      this.el.style.left = `${this.dragState.startLeft + dx}px`;
      this.el.style.top = `${this.dragState.startTop + dy}px`;
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (!this.el) return;
      this.dragState = null;
      this.el.style.transition = '';
    });
  }

  private setupButtons(): void {
    if (!this.el) return;

    this.el.querySelector('.wc-close')?.addEventListener('click', () => {
      this.unmount();
    });

    this.el.querySelector('.wc-minimize')?.addEventListener('click', () => {
      if (!this.el) return;
      const isMinimized = this.el.getAttribute('data-state') === 'minimized';
      this.el.setAttribute('data-state', isMinimized ? 'idle' : 'minimized');
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/content/overlay.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/overlay.ts tests/content/overlay.test.ts
git commit -m "feat: draggable water-fill overlay UI"
```

---

### Task 10: Conversation Tracker

**Files:**
- Create: `src/content/tracker.ts`
- Note: `IConversationTracker` and `ConversationRecord` are imported from `../shared/types` (defined in Task 2).

- [ ] **Step 1: Write the test**

Create `tests/content/tracker.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationTracker } from '../../src/content/tracker';
import type { IConversationStore, IOverlayUI, ConversationRecord } from '../../src/shared/types';

function makeStore(records: ConversationRecord[] = []): IConversationStore {
  const map = new Map<string, ConversationRecord>();
  for (const r of records) map.set(r.id, { ...r });
  return {
    create: vi.fn(async (r) => { map.set(r.id, { ...r }); }),
    update: vi.fn(async (id, fields) => {
      const r = map.get(id);
      if (r) Object.assign(r, fields);
    }),
    findByUrl: vi.fn(async (url) => {
      for (const r of map.values()) { if (r.url === url) return { ...r }; }
      return null;
    }),
    findAll: vi.fn(async () => [...map.values()]),
    delete: vi.fn(async (id) => { map.delete(id); }),
  };
}

function makeOverlay(): IOverlayUI {
  return {
    mount: vi.fn(),
    unmount: vi.fn(),
    update: vi.fn(),
    setState: vi.fn(),
    isMounted: vi.fn(() => true),
  };
}

describe('ConversationTracker', () => {
  it('start creates a new record and updates overlay', async () => {
    const store = makeStore();
    const overlay = makeOverlay();
    const tracker = new ConversationTracker(store, overlay);

    const record = await tracker.start('https://chatgpt.com/c/1', 'chatgpt');

    expect(record.url).toBe('https://chatgpt.com/c/1');
    expect(record.platform).toBe('chatgpt');
    expect(record.waterMl).toBe(0);
    expect(record.topic).toBe('');
    expect(store.create).toHaveBeenCalled();
    expect(overlay.update).toHaveBeenCalledWith(0);
  });

  it('resume loads existing record', async () => {
    const existing: ConversationRecord = {
      id: 'uuid-1',
      url: 'https://chatgpt.com/c/1',
      platform: 'chatgpt',
      topic: 'Old chat',
      waterMl: 150,
      tokenCount: 500,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const store = makeStore([existing]);
    const overlay = makeOverlay();
    const tracker = new ConversationTracker(store, overlay);

    const record = await tracker.resume('https://chatgpt.com/c/1');

    expect(record).not.toBeNull();
    expect(record!.waterMl).toBe(150);
    expect(overlay.update).toHaveBeenCalledWith(150);
  });

  it('resume returns null for unknown url', async () => {
    const store = makeStore();
    const overlay = makeOverlay();
    const tracker = new ConversationTracker(store, overlay);

    const record = await tracker.resume('https://unknown.com');

    expect(record).toBeNull();
  });

  it('addDelta increments waterMl and tokens, updates store and overlay', async () => {
    const store = makeStore();
    const overlay = makeOverlay();
    const tracker = new ConversationTracker(store, overlay);

    await tracker.start('https://chatgpt.com/c/1', 'chatgpt');
    await tracker.addDelta(3, 1000);

    const current = tracker.getCurrent();
    expect(current!.waterMl).toBe(3);
    expect(current!.tokenCount).toBe(1000);
    expect(overlay.update).toHaveBeenCalledWith(3);
  });

  it('addDelta updates topic when provided', async () => {
    const store = makeStore();
    const overlay = makeOverlay();
    const tracker = new ConversationTracker(store, overlay);

    await tracker.start('https://chatgpt.com/c/1', 'chatgpt');
    await tracker.addDelta(0, 0, 'New Topic');

    expect(tracker.getCurrent()!.topic).toBe('New Topic');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/content/tracker.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/content/tracker.ts`**

```ts
import type { ConversationRecord, IConversationStore, IOverlayUI, IConversationTracker } from '../shared/types';

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

  async addDelta(ml: number, tokens: number, topic?: string): Promise<void> {
    if (!this.current) return;

    this.current.waterMl += ml;
    this.current.tokenCount += tokens;
    this.current.updatedAt = new Date().toISOString();
    if (topic !== undefined) {
      this.current.topic = topic;
    }

    this.overlay.update(this.current.waterMl);

    await this.store.update(this.current.id, {
      waterMl: this.current.waterMl,
      tokenCount: this.current.tokenCount,
      updatedAt: this.current.updatedAt,
      ...(topic !== undefined ? { topic } : {}),
    });
  }

  getCurrent(): ConversationRecord | null {
    return this.current;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/content/tracker.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/tracker.ts tests/content/tracker.test.ts
git commit -m "feat: conversation tracker"
```

---

### Task 11: Content Script Orchestrator

**Files:**
- Create: `src/content/index.ts`

- [ ] **Step 1: Create `src/content/index.ts`**

```ts
import { PlatformDetector } from './detector';
import { DOMScraper } from './scraper';
import { BPEstimator } from './estimator';
import { WaterConverter } from './converter';
import { WaterOverlay } from './overlay';
import { ConversationTracker } from './tracker';
import { IndexedDBStore } from '../shared/db';
import { DEFAULT_PLATFORMS } from '../shared/constants';
import type { PlatformConfig } from '../shared/types';

class WaterCalculator {
  private store = new IndexedDBStore();
  private overlay = new WaterOverlay();
  private tracker = new ConversationTracker(this.store, this.overlay);
  private estimator = new BPEstimator();
  private converter = new WaterConverter();
  private detector: PlatformDetector;
  private scraper: DOMScraper | null = null;
  private config: PlatformConfig | null = null;

  constructor() {
    this.detector = new PlatformDetector(DEFAULT_PLATFORMS);
  }

  async init(): Promise<void> {
    this.config = this.detector.resolve();
    if (!this.config) return;

    this.overlay.mount();

    const url = window.location.href;
    let record = await this.tracker.resume(url);

    if (!record) {
      record = await this.tracker.start(url, this.config.id);
    }

    const title = this.scrapeTitle();
    if (title && !record.topic) {
      await this.tracker.addDelta(0, 0, title);
    }

    this.scraper = new DOMScraper(this.config);
    this.scraper.onNewText((delta) => {
      const tokens = this.estimator.estimate(delta);
      const ml = this.converter.toMl(tokens);
      this.tracker.addDelta(ml, tokens);
    });

    const container = this.findMessageContainer();
    if (container) {
      this.scraper.attach(container);
    }

    this.setupLifecycleListeners();
  }

  private scrapeTitle(): string {
    if (!this.config) return '';
    const titleEl = document.querySelector(this.config.selectors.title);
    return titleEl?.textContent?.trim() ?? '';
  }

  private findMessageContainer(): Element | null {
    if (!this.config) return null;
    const firstMsg = document.querySelector(this.config.selectors.messages);
    return firstMsg?.parentElement ?? null;
  }

  private setupLifecycleListeners(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.onResume();
      } else {
        this.onPause();
      }
    });

    window.addEventListener('pageshow', () => this.onResume());
    window.addEventListener('pagehide', () => this.onPause());
  }

  private onResume(): void {
    if (this.scraper && this.config) {
      const container = this.findMessageContainer();
      if (container) this.scraper.attach(container);
    }
  }

  private onPause(): void {
    this.scraper?.detach();
  }
}

const app = new WaterCalculator();
app.init();
```

- [ ] **Step 2: Build to verify bundling**

```bash
npm run build
```

Expected: Build succeeds without TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: content script orchestrator"
```

---

### Task 12: Background Service Worker

**Files:**
- Create: `src/background/index.ts`

- [ ] **Step 1: Create `src/background/index.ts`**

```ts
import { IndexedDBStore } from '../shared/db';
import { DEFAULT_PLATFORMS } from '../shared/constants';
import type { PlatformConfig } from '../shared/types';

const store = new IndexedDBStore();
let platformConfigs: PlatformConfig[] = [...DEFAULT_PLATFORMS];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ platforms: platformConfigs });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_PLATFORMS':
      sendResponse({ platforms: platformConfigs });
      break;

    case 'ADD_PLATFORM':
      platformConfigs.push(message.config);
      chrome.storage.local.set({ platforms: platformConfigs });
      sendResponse({ success: true });
      break;

    case 'REMOVE_PLATFORM':
      platformConfigs = platformConfigs.filter((p) => p.id !== message.id);
      chrome.storage.local.set({ platforms: platformConfigs });
      sendResponse({ success: true });
      break;

    case 'FIND_CONVERSATION':
      store.findByUrl(message.url).then((record) => sendResponse({ record }));
      return true;

    case 'SAVE_RECORD':
      store.create(message.record).then(() => sendResponse({ success: true }));
      return true;

    case 'UPDATE_RECORD':
      store.update(message.id, message.fields).then(() => sendResponse({ success: true }));
      return true;

    case 'GET_ALL_RECORDS':
      store.findAll().then((records) => sendResponse({ records }));
      return true;

    case 'DELETE_RECORD':
      store.delete(message.id).then(() => sendResponse({ success: true }));
      return true;
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: background service worker"
```

---

### Task 13: Options Page

**Files:**
- Create: `src/options/index.html`, `src/options/index.ts`

- [ ] **Step 1: Create `src/options/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Water Calculator - Options</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
    label { display: block; margin-top: 12px; font-weight: 600; }
    input, textarea { width: 100%; padding: 6px; margin-top: 4px; box-sizing: border-box; }
    button { margin-top: 12px; padding: 8px 16px; }
    .platform-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .platform-card code { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
    th { font-size: 13px; }
    td { font-size: 12px; }
  </style>
</head>
<body>
  <h1>Water Calculator</h1>

  <h2>Add Platform</h2>
  <form id="add-platform-form">
    <label>Name <input name="name" required /></label>
    <label>URL Match (e.g. myai.com) <input name="urlMatch" required /></label>
    <label>Message Selector <input name="messages" required /></label>
    <label>Title Selector <input name="title" required /></label>
    <label>Input Selector <input name="input" required /></label>
    <button type="submit">Add Platform</button>
  </form>

  <h2>Custom Platforms</h2>
  <div id="custom-platforms"></div>

  <h2>Conversation History</h2>
  <table id="conversations-table">
    <thead>
      <tr><th>Topic</th><th>Platform</th><th>Water</th><th>Tokens</th><th>Date</th></tr>
    </thead>
    <tbody></tbody>
  </table>

  <script src="./index.ts" type="module"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/options/index.ts`**

```ts
import type { PlatformConfig, ConversationRecord } from '../shared/types';

async function loadPlatforms(): Promise<void> {
  chrome.runtime.sendMessage({ type: 'GET_PLATFORMS' }, (response: { platforms: PlatformConfig[] }) => {
    const container = document.getElementById('custom-platforms')!;
    container.innerHTML = '';
    for (const p of response.platforms.filter((x) => !x.builtIn)) {
      const card = document.createElement('div');
      card.className = 'platform-card';
      card.innerHTML = `
        <strong>${p.name}</strong>
        <code>URL: ${p.urlMatch} | Msg: ${p.selectors.messages}</code>
        <br><button class="remove-btn" data-id="${p.id}">Remove</button>
      `;
      container.appendChild(card);
    }
    attachRemoveButtons();
  });
}

function attachRemoveButtons(): void {
  document.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      chrome.runtime.sendMessage({ type: 'REMOVE_PLATFORM', id }, () => loadPlatforms());
    });
  });
}

async function loadConversations(): Promise<void> {
  chrome.runtime.sendMessage({ type: 'GET_ALL_RECORDS' }, (response: { records: ConversationRecord[] }) => {
    const tbody = document.querySelector('#conversations-table tbody')!;
    tbody.innerHTML = '';
    for (const r of response.records.sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
      const row = document.createElement('tr');
      const displayMl = r.waterMl >= 1000
        ? `${(r.waterMl / 1000).toFixed(1)} L`
        : `${Math.round(r.waterMl)} mL`;
      row.innerHTML = `
        <td>${r.topic || '(untitled)'}</td>
        <td>${r.platform}</td>
        <td>${displayMl}</td>
        <td>${r.tokenCount.toLocaleString()}</td>
        <td>${new Date(r.startedAt).toLocaleDateString()}</td>
      `;
      tbody.appendChild(row);
    }
  });
}

document.getElementById('add-platform-form')!.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data = new FormData(form);
  const config: PlatformConfig = {
    id: `custom-${Date.now()}`,
    name: data.get('name') as string,
    urlMatch: data.get('urlMatch') as string,
    selectors: {
      messages: data.get('messages') as string,
      title: data.get('title') as string,
      input: data.get('input') as string,
    },
    builtIn: false,
  };
  chrome.runtime.sendMessage({ type: 'ADD_PLATFORM', config }, () => {
    form.reset();
    loadPlatforms();
  });
});

loadPlatforms();
loadConversations();
```

- [ ] **Step 3: Commit**

```bash
git add src/options/index.html src/options/index.ts
git commit -m "feat: options page for platform config and history"
```

---

### Task 14: Integration Verification

**Files:**
- Create: `tests/integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PlatformDetector } from '../src/content/detector';
import { DOMScraper } from '../src/content/scraper';
import { BPEstimator } from '../src/content/estimator';
import { WaterConverter } from '../src/content/converter';
import { WaterOverlay } from '../src/content/overlay';
import { ConversationTracker } from '../src/content/tracker';
import type { PlatformConfig, IConversationStore } from '../src/shared/types';

describe('integration: detector → scraper → estimator → converter → tracker', () => {
  function fakeStore(): IConversationStore {
    const records = new Map<string, any>();
    return {
      create: async (r) => { records.set(r.id, { ...r }); },
      update: async (id, f) => { Object.assign(records.get(id), f); },
      findByUrl: async (url) => [...records.values()].find((r: any) => r.url === url) ?? null,
      findAll: async () => [...records.values()],
      delete: async (id) => { records.delete(id); },
    };
  }

  it('full pipeline: detect → scrape → estimate → convert → track', async () => {
    const config: PlatformConfig = {
      id: 'test',
      name: 'Test',
      urlMatch: 'test.com',
      selectors: { messages: '.msg', title: 'h1', input: 'textarea' },
      builtIn: true,
    };

    Object.defineProperty(window, 'location', {
      value: { hostname: 'test.com', href: 'https://test.com/chat/1' },
    });

    document.body.innerHTML = '<h1>Test Chat</h1><div class="container"><div class="msg">Hello</div></div>';

    const detector = new PlatformDetector([config]);
    const detected = detector.resolve();
    expect(detected).not.toBeNull();
    expect(detected!.id).toBe('test');

    const overlay = new WaterOverlay();
    overlay.mount();

    const store = fakeStore();
    const tracker = new ConversationTracker(store, overlay);
    const record = await tracker.start('https://test.com/chat/1', 'test');
    expect(record.waterMl).toBe(0);

    const estimator = new BPEstimator();
    const converter = new WaterConverter();

    const scraper = new DOMScraper(config);
    const container = document.querySelector('.container')!;

    await new Promise<void>((resolve) => {
      scraper.onNewText((delta) => {
        const tokens = estimator.estimate(delta);
        const ml = converter.toMl(tokens);
        tracker.addDelta(ml, tokens);
      });
      scraper.attach(container);

      const msg = document.createElement('div');
      msg.className = 'msg';
      msg.textContent = 'This is a response';
      container.appendChild(msg);

      setTimeout(() => {
        const current = tracker.getCurrent();
        expect(current).not.toBeNull();
        expect(current!.waterMl).toBeGreaterThan(0);
        expect(current!.tokenCount).toBeGreaterThan(0);
        overlay.unmount();
        resolve();
      }, 100);
    });
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
npx vitest run tests/integration.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add tests/integration.test.ts
git commit -m "test: integration test for full pipeline"
```

---

### Task 15: Final Checks

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run lint (typecheck)**

```bash
npm run lint
```

Expected: No type errors.

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "release: v0.1.0 water calculator extension MVP"
git push
```
