# Chat-Switch Contamination Fix - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent water volume contamination between conversations when navigating between chats in SPA-based AI platforms (Gemini, ChatGPT, Claude, Perplexity).

**Architecture:** Add a URL guard to the `onNewText` callback in the orchestrator (`index.ts`). Before processing a text delta, verify that `window.location.href` still matches the tracker's current conversation URL. If the URL has changed (user navigated away), discard the delta. SPAs universally call `history.pushState` before rendering new content, so `window.location.href` updates before DOM mutations from the new page reach the old scraper's MutationObserver.

**Tech Stack:** TypeScript, Vitest + jsdom + fake-indexeddb, Manifest V3

---

### Task 1: Add integration test for URL guard

**Files:**
- Modify: `tests/integration.test.ts`

- [ ] **Step 1: Add test - deltas are discarded when URL no longer matches tracker's conversation URL**

Insert this test block after the existing `full pipeline` test (before the closing `});` of the `describe` block at line 80):

```typescript
  it('discards deltas when location href no longer matches tracker url', async () => {
    const config: PlatformConfig = {
      id: 'test',
      name: 'Test',
      urlMatch: 'test.com',
      selectors: { messages: '.msg', pageTitle: 'title', titleSelector: 'h1', input: 'textarea' },
      builtIn: true,
    };

    Object.defineProperty(window, 'location', {
      value: { hostname: 'test.com', href: 'https://test.com/chat/a' },
      writable: true,
      configurable: true,
    });

    document.body.innerHTML = '<h1>Chat A</h1><div class="container"><div class="msg">Hello from A</div></div>';

    const overlay = new WaterBottleOverlay();
    overlay.mount();

    const store = fakeStore();
    const tracker = new ConversationTracker(store, overlay);
    await tracker.start('https://test.com/chat/a', 'test');
    expect(tracker.getCurrent()!.waterMl).toBe(0);

    const estimator = new BPEstimator();
    const converter = new WaterConverter();
    const scraper = new DOMScraper(config);
    const container = document.querySelector('.container')!;

    // Register callback with URL guard
    scraper.onNewText((_delta) => {
      const current = tracker.getCurrent();
      if (!current || window.location.href !== current.url) return;
      const fullText = scraper.getCurrentText();
      const tokens = estimator.estimate(fullText);
      const ml = converter.toMl(tokens);
      if (tokens > 0) tracker.addDelta({ ml, tokens });
    });
    scraper.attach(container);

    // Simulate navigating to a different chat: change URL before DOM mutates
    (window.location as any).href = 'https://test.com/chat/b';

    // DOM mutation for Chat B's content arrives (old scraper still observing)
    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = 'This text should NOT be added to Chat A';
    container.appendChild(msg);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const current = tracker.getCurrent();
        expect(current).not.toBeNull();
        // Water should remain at 0 - delta was discarded because URL changed
        expect(current!.waterMl).toBe(0);
        expect(current!.tokenCount).toBe(0);
        overlay.unmount();
        resolve();
      }, 100);
    });
  });
```

- [ ] **Step 2: Run the new test to verify it fails (guard not yet added)**

```bash
npx vitest run tests/integration.test.ts -t "discards deltas"
```

Expected: FAIL - `waterMl` will be > 0 because the delta was NOT discarded (existing behavior, no guard).

---

### Task 2: Add URL guard to `onNewText` callbacks in orchestrator

**Files:**
- Modify: `src/content/index.ts`

- [ ] **Step 1: Add guard to callback in `startTracking()` (lines 90–95)**

Replace:

```typescript
      this.scraper.onNewText((_delta) => {
        const fullText = this.scraper!.getCurrentText();
        const tokens = this.estimator.estimate(fullText);
        const ml = this.converter.toMl(tokens);
        if (tokens > 0) this.tracker.addDelta({ ml, tokens });
      });
```

with:

```typescript
      this.scraper.onNewText((_delta) => {
        const current = this.tracker.getCurrent();
        if (!current || window.location.href !== current.url) return;
        const fullText = this.scraper!.getCurrentText();
        const tokens = this.estimator.estimate(fullText);
        const ml = this.converter.toMl(tokens);
        if (tokens > 0) this.tracker.addDelta({ ml, tokens });
      });
```

- [ ] **Step 2: Add guard to callback in `onUrlChange()` (lines 175–180)**

Replace:

```typescript
        this.scraper.onNewText((_delta) => {
          const fullText = this.scraper!.getCurrentText();
          const tokens = this.estimator.estimate(fullText);
          const ml = this.converter.toMl(tokens);
          if (tokens > 0) this.tracker.addDelta({ ml, tokens });
        });
```

with:

```typescript
        this.scraper.onNewText((_delta) => {
          const current = this.tracker.getCurrent();
          if (!current || window.location.href !== current.url) return;
          const fullText = this.scraper!.getCurrentText();
          const tokens = this.estimator.estimate(fullText);
          const ml = this.converter.toMl(tokens);
          if (tokens > 0) this.tracker.addDelta({ ml, tokens });
        });
```

- [ ] **Step 3: Run the integration test to verify it passes**

```bash
npx vitest run tests/integration.test.ts -t "discards deltas"
```

Expected: PASS - the guard discards the delta and `waterMl` stays at 0.

- [ ] **Step 4: Run full test suite to verify no regressions**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Run lint/typecheck**

```bash
npm run lint
```

Expected: No errors.

---

### Task 3: Update project manifest - mark issue as resolved

**Files:**
- Modify: `PROJECT_MANIFEST.md`

- [ ] **Step 1: Move the chat-switch contamination issue from OPEN to a new RESOLVED section**

Replace the `OPEN - Chat-switch contamination` block (lines 28–46 in `PROJECT_MANIFEST.md`) with a resolved entry using the existing activity-log format.

Remove:

```
### OPEN - Chat-switch contamination: old scraper feeds deltas to wrong conversation (2026-07-11)

**Symptom:** Toggling between Gemini chats causes water volume contamination...

**Root cause (race between DOM mutation and URL-change detection):**

...

**Affected platforms:** Any SPA-based AI chat...
```

Replace with (immediately after the `## Known Issues` heading, before the injection-unreliability issue):

```
### RESOLVED - Chat-switch contamination: URL guard on scraper callbacks (2026-07-11)

**Fix:** Added `window.location.href` guard to both `onNewText` callback registrations in `src/content/index.ts`. Before processing a delta, the callback verifies that the current page URL still matches the tracker's active conversation URL. If the user navigated to a different chat (SPA pushState changes `window.location.href` before DOM renders new content), the delta is discarded.
```

- [ ] **Step 2: Add activity log entry**

Append to the Activity Log table (after line 74):

```
| 2026-07-11 | Chat-switch contamination fix | Added URL guard to onNewText callbacks; prevents old scraper deltas from contaminating other conversation records during SPA navigation |
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration.test.ts src/content/index.ts PROJECT_MANIFEST.md
git commit -m "fix: prevent chat-switch water volume contamination with URL guard in onNewText callbacks"
```
