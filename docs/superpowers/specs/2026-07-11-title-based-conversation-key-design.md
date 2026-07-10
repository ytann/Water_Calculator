# Design Spec — Title-Based Conversation Key

**Date:** 2026-07-11
**Source:** Brainstorming session

---

## 1. Problem

`ConversationTracker` currently keys conversations by `window.location.href`. This works for ChatGPT (each chat has a unique URL like `/c/abc123`) but fails for Gemini, which uses a single URL (`gemini.google.com/app`) for all chats via SPA routing. On Gemini, all conversations share the same URL, so `findByUrl()` returns the same record for every chat — water usage bleeds across conversations.

## 2. Solution

Key conversations by the **visible LLM-generated chat title** (shown at the top of each conversation page), scoped to the platform. When the LLM renames a chat, update the title on the existing record.

## 3. Changes

### 3.1 Platform configs — `titleSelector`

Add `titleSelector` to `PlatformConfig.selectors` per platform. **Selectors are best-guess and must be verified in-browser before finalizing:**

| Platform | Proposed selector | Notes |
|----------|-------------------|-------|
| ChatGPT | `[data-testid="chat-header-title"]` | ChatGPT wraps the title in a header bar element |
| Gemini | `.chat-header-title` or `message-content:first-of-type` | Gemini may use the first message as title |
| Claude | `[data-testid="chat-name"]` | Best guess |
| Perplexity | `h1` or `.chat-title` | Best guess |

The existing `selectors.title` (for `<title>`) is renamed `selectors.pageTitle`.

### 3.2 IndexedDB — `findByTitle(title, platform)`

- Add a `title` index to the `conversations` object store
- New method: `findByTitle(title, platform)` — queries by exact title match, filters by platform
- Bump `DB_VERSION` from 1 → 2 (no migration needed; we clear old data on upgrade)

### 3.3 `ConversationRecord` — rename `topic` → `title`

The `topic` field is renamed to `title` throughout the codebase for clarity (it was scraped from DOM `<title>`, now it's the visible chat title). Existing DB records with `topic` are naturally dropped on DB version bump.

### 3.4 Lookup swap — `findByUrl` → `findByTitle`

In `startTracking()` and `onUrlChange()`:

```
// Before
const record = await this.tracker.resume(url);

// After  
const title = this.scrapeTitle();
const record = title ? await this.tracker.resume(title) : null;
```

`tracker.resume(key)` now delegates to `store.findByTitle(key, platform)` instead of `store.findByUrl(url)`.

### 3.5 Title rename detection (OOP — one concern per module)

Each module owns exactly one concern:

- **Scraper** owns DOM reading: add `getTitle()` method using `config.selectors.titleSelector`
- **Tracker** owns state persistence: add `updateTitle(title)` that updates in-memory `record.title` and calls `store.update()`
- **Orchestrator** wires them: on each text delta, checks `scraper.getTitle()` and if changed, calls `tracker.updateTitle()`

```typescript
// In orchestrator's text-delta callback:
const newTitle = this.scraper!.getTitle();
if (newTitle && record.title !== newTitle) {
  this.tracker.updateTitle(newTitle);
}
```

Removing text tracking doesn't break title tracking (independent scraper methods), and removing title tracking doesn't break text tracking. The orchestrator is the only coupling point — thin glue code.

## 4. Non-goals

- Conversation dashboard/history UI (separate feature)
- Multi-platform dedup (titles are already scoped to platform)
- Partial title matching (exact match only)

## 5. Files touched

| File | Change |
|------|--------|
| `src/shared/types.ts` | `topic` → `title` in `ConversationRecord`, add `findByTitle` to `IConversationStore`, add `getTitle` + `updateTitle` to interfaces |
| `src/shared/constants.ts` | Add `titleSelector` to each platform, rename `selectors.title` → `selectors.pageTitle` |
| `src/shared/db.ts` | Add `title` index, `findByTitle()` method, bump DB version to 2 |
| `src/content/scraper.ts` | Add `getTitle()` method using `config.selectors.titleSelector` |
| `src/content/tracker.ts` | Add `updateTitle(title)` method; `resume(key)` delegates to `findByTitle` |
| `src/content/index.ts` | Swap to title-based lookup in `startTracking`/`onUrlChange`, wire rename detection via `scraper.getTitle()` + `tracker.updateTitle()` |

## 6. Interfaces (additions)

### ITextScraper
```
+ getTitle(): string
```

### IConversationTracker  
```
+ updateTitle(title: string): Promise<void>
```
