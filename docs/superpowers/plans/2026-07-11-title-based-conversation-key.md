# Title-Based Conversation Key — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace URL-based conversation lookup with visible-chat-title-based lookup (scoped to platform), enabling Gemini to correctly identify conversations across its single-URL SPA.

**Architecture:** Scraper owns DOM reading (`getTitle()`), tracker owns state persistence (`updateTitle()`, title-based `resume()`), orchestrator just wires them. IndexedDB gains a `title` index with `findByTitle(title, platform)`.

**Tech Stack:** TypeScript, Vitest + jsdom + fake-indexeddb, Manifest V3

---

### Task 1: Update shared types — rename `topic` → `title`, add new interfaces

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Rename `topic` to `title` in `ConversationRecord`, add `titleSelector` and rename `title` → `pageTitle` in `PlatformSelectors`**

```typescript
export interface PlatformSelectors {
  messages: string;
  pageTitle: string;
  titleSelector: string;
  input: string;
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
```

- [ ] **Step 2: Add `getTitle()` to `ITextScraper`**

```typescript
export interface ITextScraper {
  attach(container: Element): void;
  detach(): void;
  onNewText(callback: (delta: string) => void): () => void;
  getCurrentText(): string;
  getTitle(): string;
}
```

- [ ] **Step 3: Rename `topic` in `AddDeltaParams` and add `updateTitle()` + title-based `resume()` to `IConversationTracker`**

```typescript
export interface AddDeltaParams {
  ml: number;
  tokens: number;
  title?: string;
}

export interface IConversationTracker {
  start(title: string, platform: string): Promise<ConversationRecord>;
  resume(title: string): Promise<ConversationRecord | null>;
  addDelta(params: AddDeltaParams): Promise<void>;
  updateTitle(title: string): Promise<void>;
  getCurrent(): ConversationRecord | null;
}
```

- [ ] **Step 4: Add `findByTitle` to `IConversationStore` and update `update` fields to use `title`**

```typescript
export interface IConversationStore {
  create(record: ConversationRecord): Promise<void>;
  update(id: string, fields: Partial<Pick<ConversationRecord, 'waterMl' | 'tokenCount' | 'title' | 'updatedAt'>>): Promise<void>;
  findByTitle(title: string, platform: string): Promise<ConversationRecord | null>;
  findAll(): Promise<ConversationRecord[]>;
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 5: Run typecheck to verify**

Run: `npm run lint`
Expected: Type errors in non-types files (they reference `topic`, `selectors.title`, etc.) — expected, fixed in subsequent tasks.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts
git commit -m "types: rename topic→title, add titleSelector, getTitle, updateTitle, findByTitle"
```

---

### Task 2: Update platform constants — add `titleSelector`, rename `title` → `pageTitle`

**Files:**
- Modify: `src/shared/constants.ts`

- [ ] **Step 1: Update `DEFAULT_PLATFORMS` selectors**

```typescript
export const DEFAULT_PLATFORMS: PlatformConfig[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    urlMatch: 'chatgpt.com',
    selectors: {
      messages: '[data-message-author-role="assistant"][data-message-id]',
      pageTitle: 'title',
      titleSelector: 'h1, [data-testid="chat-header-title"]',
      input: '#prompt-textarea, [contenteditable="true"]',
    },
    builtIn: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    urlMatch: 'gemini.google.com',
    selectors: {
      messages: 'message-content',
      pageTitle: 'title',
      titleSelector: 'message-content:first-of-type',
      input: 'rich-textarea, [contenteditable]',
    },
    builtIn: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    urlMatch: 'claude.ai',
    selectors: {
      messages: '[data-start], .font-claude-message',
      pageTitle: 'title',
      titleSelector: '[data-testid="chat-name"]',
      input: '.ProseMirror, [contenteditable]',
    },
    builtIn: true,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    urlMatch: 'perplexity.ai',
    selectors: {
      messages: '.prose, .message',
      pageTitle: 'title',
      titleSelector: 'h1, .chat-title',
      input: 'textarea',
    },
    builtIn: true,
  },
];
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`
Expected: Fewer errors than before. `constants.ts` should be clean. Other files still reference old names.

- [ ] **Step 3: Commit**

```bash
git add src/shared/constants.ts
git commit -m "config: add titleSelector per platform, rename title→pageTitle"
```

---

### Task 3: Update IndexedDB — add `title` index, `findByTitle()`, bump version

**Files:**
- Modify: `src/shared/db.ts`

- [ ] **Step 1: Bump `DB_VERSION` to 2 and add `title` index**

```typescript
const DB_VERSION = 2;
```

In `openDB()`, replace the existing index creation logic:

```typescript
req.onupgradeneeded = () => {
  const db = req.result;
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    store.createIndex('url', 'url', { unique: false });
    store.createIndex('platform', 'platform', { unique: false });
    store.createIndex('title', 'title', { unique: false });
  } else {
    const store = req.transaction!.objectStore(STORE_NAME);
    if (!store.indexNames.contains('title')) {
      store.createIndex('title', 'title', { unique: false });
    }
  }
};
```

- [ ] **Step 2: Add `findByTitle()` method and update `update()` fields type**

Replace the `update()` signature `'topic'` → `'title'`:

```typescript
async update(
  id: string,
  fields: Partial<Pick<ConversationRecord, 'waterMl' | 'tokenCount' | 'title' | 'updatedAt'>>
): Promise<void> {
```

Add `findByTitle()` method after `findByUrl` (keep `findByUrl` for now, remove later):

```typescript
async findByTitle(title: string, platform: string): Promise<ConversationRecord | null> {
  await this.ready;
  const db = await this.db();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('title');
    const req = index.get(title);
    req.onsuccess = () => {
      const record = req.result ?? null;
      db.close();
      if (record && record.platform === platform) {
        resolve(record);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run lint`
Expected: `db.ts` should be clean now.

- [ ] **Step 4: Commit**

```bash
git add src/shared/db.ts
git commit -m "db: add title index, findByTitle method, bump DB_VERSION to 2"
```

---

### Task 4: Add `getTitle()` to scraper

**Files:**
- Modify: `src/content/scraper.ts`

- [ ] **Step 1: Add `getTitle()` method**

Add after `getCurrentText()`:

```typescript
getTitle(): string {
  const selector = this.config.selectors.titleSelector;
  if (!selector || !document.body) return '';
  const el = document.querySelector(selector);
  return el?.textContent?.trim() ?? '';
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`
Expected: `scraper.ts` should be clean.

- [ ] **Step 3: Commit**

```bash
git add src/content/scraper.ts
git commit -m "scraper: add getTitle() using titleSelector"
```

---

### Task 5: Update tracker — title-based `resume`, `updateTitle()`, rename `topic` → `title`

**Files:**
- Modify: `src/content/tracker.ts`

- [ ] **Step 1: Rename `topic` → `title` throughout, change `start()` and `resume()` signatures, add `updateTitle()`**

```typescript
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

  async resume(title: string): Promise<ConversationRecord | null> {
    if (!this.current) return null;
    const record = await this.store.findByTitle(title, this.current.platform);
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
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`
Expected: `tracker.ts` clean. `index.ts` has errors (still uses old signatures) — fixed in next task.

- [ ] **Step 3: Commit**

```bash
git add src/content/tracker.ts
git commit -m "tracker: title-based resume, add updateTitle, rename topic→title"
```

---

### Task 6: Update orchestrator — title-based lookup, rename detection wiring

**Files:**
- Modify: `src/content/index.ts`

- [ ] **Step 1: Update `scrapeTitle()` to use `titleSelector`, add rename detection in text-delta callback**

Change `scrapeTitle()`:

```typescript
private scrapeTitle(): string {
  if (!this.config) return '';
  const titleEl = document.querySelector(this.config.selectors.titleSelector);
  return titleEl?.textContent?.trim() ?? '';
}
```

- [ ] **Step 2: Update `startTracking()` — title-based lookup, `record.title` references**

Change lines 73-83:

```typescript
const url = window.location.href;
const title = this.scrapeTitle();
const record = title ? await this.tracker.resume(title) : null;

if (!record) {
  const newTitle = title || 'Untitled';
  await this.tracker.start(newTitle, this.config.id);
} else {
  // record loaded, overlay already updated
}
```

And replace `record.topic` → `record.title` in the title-saving block (line 82):

```typescript
if (title && !record.title) {
  await this.tracker.addDelta({ ml: 0, tokens: 0, title });
}
```

Wait — the record may be null at this point for new conversations. Let me adjust. After the if/else block, we have a record (either resumed or started). Then:

```typescript
if (title && !record.title) {
  await this.tracker.addDelta({ ml: 0, tokens: 0, title });
}

this.overlay.setState('active');
```

- [ ] **Step 3: Add title rename detection in text-delta callback**

Add after the existing token estimation in the `onNewText` callback (after `if (tokens > 0) ...` line):

```typescript
const newTitle = this.scraper!.getTitle();
if (newTitle && this.tracker.getCurrent()?.title !== newTitle) {
  this.tracker.updateTitle(newTitle);
}
```

Full `onNewText` callback:

```typescript
this.scraper.onNewText((_delta) => {
  const fullText = this.scraper!.getCurrentText();
  const tokens = this.estimator.estimate(fullText);
  const ml = this.converter.toMl(tokens);
  if (tokens > 0) this.tracker.addDelta({ ml, tokens });
  const newTitle = this.scraper!.getTitle();
  if (newTitle && this.tracker.getCurrent()?.title !== newTitle) {
    this.tracker.updateTitle(newTitle);
  }
});
```

- [ ] **Step 4: Update `onUrlChange()` — title-based lookup**

Replace `tracker.resume(url)` → title-based:

```typescript
const title = this.scrapeTitle();
if (title) {
  const record = await this.tracker.resume(title);
  if (record) {
    this.overlay.update(record.waterMl);
    this.overlay.setState('active');
  } else {
    if (!this.config) return;
    await this.tracker.start(title, this.config.id);
    this.overlay.update(0);
  }
} else {
  if (!this.config) return;
  await this.tracker.start('Untitled', this.config.id);
  this.overlay.update(0);
}
```

Add same rename detection to the `onUrlChange` text-delta callback (duplicate of the `onNewText` from Step 3).

- [ ] **Step 5: Remove unused `tracker.resume(url)` signature check**

The orchestrator no longer calls `resume(url)` — it always passes a title string. The `lastUrl` field is still used for URL change detection but `resume` no longer uses URLs.

- [ ] **Step 6: Run typecheck**

Run: `npm run lint`
Expected: Zero type errors. All files consistent.

- [ ] **Step 7: Commit**

```bash
git add src/content/index.ts
git commit -m "orchestrator: swap to title-based lookup, wire title rename detection"
```

---

### Task 7: Update tests for renamed `topic` → `title` and new interfaces

**Files:**
- Modify: `tests/shared/db.test.ts`
- Modify: `tests/shared/types.test.ts`
- Modify: `tests/shared/constants.test.ts`
- Modify: `tests/content/tracker.test.ts`
- Modify: `tests/integration.test.ts`

- [ ] **Step 1: Update `db.test.ts` — rename `topic` → `title`, `findByUrl` → keep (URL index still exists)**

```typescript
// Line 23: change topic → title
title: 'Test',

// Lines 34, 39, 40, 48, 64: keep findByUrl (URL index still exists), no change needed
```

- [ ] **Step 2: Update `types.test.ts` — rename `topic` → `title`**

```typescript
// Line 37:
title: 'Test topic',
```

- [ ] **Step 3: Update `constants.test.ts` — rename `selectors.title` → `selectors.pageTitle`**

```typescript
// Line 25:
expect(p.selectors.pageTitle.length).toBeGreaterThan(0);
```

- [ ] **Step 4: Update `tracker.test.ts` — migrate to title-based API**

Replace all `url` references with `title`, update `start()` and `resume()` calls to pass titles instead of URLs:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationTracker } from '../../src/content/tracker';
import type { IConversationStore, IOverlayUI, ConversationRecord } from '../../src/shared/types';

const mockStore: IConversationStore = {
  create: vi.fn(async (_record) => {}),
  update: vi.fn(async () => {}),
  findByTitle: vi.fn(async (_title, _platform) => null),
  findAll: vi.fn(async () => []),
  delete: vi.fn(async () => {}),
};

const mockOverlay: IOverlayUI = {
  mount: vi.fn(),
  unmount: vi.fn(),
  update: vi.fn(),
  setState: vi.fn(),
  isMounted: vi.fn(() => true),
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
    mockStore.findByTitle = vi.fn(async () => saved);

    const record = await tracker.resume('Existing Chat');
    expect(mockStore.findByTitle).toHaveBeenCalledWith('Existing Chat', 'chatgpt');
    expect(record!.waterMl).toBe(42);
    expect(mockOverlay.update).toHaveBeenCalledWith(42);
  });

  it('resume returns null when no record found', async () => {
    await tracker.start('New Chat', 'chatgpt');
    mockStore.findByTitle = vi.fn(async () => null);
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
```

- [ ] **Step 5: Update `integration.test.ts` — `findByUrl` → `findByTitle` in mock store**

```typescript
// Line 16 area: replace findByUrl with findByTitle
const records = new Map<string, ConversationRecord>();
const mockStore: IConversationStore = {
  create: vi.fn(async (rec: ConversationRecord) => { records.set(rec.id, rec); }),
  update: vi.fn(async () => {}),
  findByTitle: vi.fn(async (title: string, _platform: string) =>
    [...records.values()].find((r: ConversationRecord) => r.title === title) ?? null
  ),
  findAll: vi.fn(async () => [...records.values()]),
  delete: vi.fn(async (_id: string) => {}),
};
```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add tests/
git commit -m "test: update all tests for topic→title rename and title-based API"
```

---

### Task 8: Final verification — build, full test suite, lint

**Files:**
- (none, verification only)

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Zero errors, `dist/content.js` and `dist/background.js` produced.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: Zero type errors.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "verify: build, test, lint all pass after title-based-key migration"
```
