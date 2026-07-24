# AGENTS.md - Token-WUEr

## Commands

- **setup:** `npm install`
- **build:** `npm run build` (tsc, then three Vite builds: `ENTRY=content` → `ENTRY=dashboard` → `ENTRY=background`, then `cp manifest.json dist/ && cp icon-*.png dist/`)
- **lint:** `npm run lint` (tsc --noEmit)
- **typecheck:** `npm run lint`
- **test:** `npm test` (vitest run)
- **test (watch):** `npm run test:watch` (vitest in watch mode)
- **run single test:** `npx vitest run tests/path/to/test.ts`
- **dev:** `npm run dev` (vite watch - content script only)

**Build gotcha:** `ENTRY=content` empties dist (`emptyOutDir: true`). `ENTRY=dashboard` and `ENTRY=background` append. The order is `content → dashboard → background`. If you change this ordering, the dist folder will break.

**After every build:** reload the extension in `chrome://extensions` (click the reload icon on the extension card). Content scripts are not auto-reloaded on update.

## Architecture

```
src/
  shared/types.ts      - All TS interfaces (IPlatformDetector, ITextScraper, ...)
  shared/constants.ts  - Platform configs, selectors, WATER_ML_PER_TOKEN = 0.003
  shared/db.ts         - chrome.storage.local persistence (class is named IndexedDBStore for historical reasons)
  content/index.ts     - Orchestrator: wires all modules, handles SPA nav + lifecycle
  content/detector.ts  - Platform detection by hostname
  content/scraper.ts   - DOM text extraction (MutationObserver + 500ms polling on document.body)
  content/estimator.ts - Token estimation (char-based heuristic, ~4 chars/token, with platform-specific multipliers: 1.3x ChatGPT, 1.5x Gemini, 1.4x Claude, 1.5x Perplexity)
  content/converter.ts - Token → water (ml)
  content/overlay.ts   - WaterBottleOverlay: Canvas 2D pixel-art bottle (16×28 grid, 96×120px canvas)
  content/tracker.ts   - Conversation lifecycle, chrome.storage.local persistence, caps at 9999L
  dashboard/index.ts   - Dashboard page entrypoint (standalone HTML, separate Vite build)
  background/index.ts  - Service worker (platform configs, message relay)
```

- **OOP, interface-first:** every module exposes a TS interface in `shared/types.ts`, one class implements it. Dependencies are constructor-injected.
- **Self-contained plugins:** removing any one module must not break the pipeline.
- **No circular imports.** All shared types in `src/shared/types.ts`. All DB access through `src/shared/db.ts`.

## Conventions

- Debug logs are removed from source **unless intentional diagnostics.** Five `[wc]` log lines exist to diagnose content script lifecycle. Do not add more without a specific, documented reason.
- Test files under `tests/` mirror `src/` structure.
- Overlay tests only check DOM/mounting behavior - Canvas 2D is not supported in jsdom. Stderr about `getContext` is expected and harmless.
- `vitest.setup.ts` provides `chrome.storage.local` mock (in-memory) and a Canvas 2D context mock.
- The storage class is named `IndexedDBStore` but wraps `chrome.storage.local` — do not reintroduce IndexedDB or `fake-indexeddb`.

## Gotchas

### Conversation tracker

- `ConversationTracker.resume()` sets `this.current.url = window.location.href` after loading a record from chrome.storage.local. This is critical: the `onNewText` callbacks in `index.ts` guard against chat-switch contamination by comparing `window.location.href !== current.url`. If `resume()` didn't sync the URL, all subsequent deltas on resumed conversations would be silently discarded because the stored URL from the record's creation time wouldn't match the current page.
- `getCurrent()` returns `null` when no conversation is active. Always null-check before accessing fields.

### Token estimation

- `BPEstimator` uses a char-based heuristic (`text.length / 4`) instead of BPE tokenization. This keeps content.js at ~22KB, eliminating the 2MB injection-reliability issues that plagued the previous `gpt-tokenizer`-based estimator.
- Re-estimates the **full accumulated text** every `estimate()` call and returns only the **net diff** (`total - lastTokenCount`). This prevents double-counting when ChatGPT rewrites its DOM during streaming.
- Call `estimator.reset()` when starting a new conversation, or the diff won't reset.

### Text scraping

- `DOMScraper.attach()` calls `this.detach()` first. This prevents duplicate MutationObservers and poll timers when SPA navigation triggers `pageshow`/`visibilitychange` re-attach.
- `getElementText(el)` tries `el.innerText` first (needed for Gemini - captures rendered math). Falls back to `el.textContent` (needed for ChatGPT - CSS hides `innerText`).
- The scraper always observes `document.body` via `subtree: true`. The `container` param passed to `attach()` is unused - do not gate attach on a container check.

### Bottle overlay (Canvas)

- Render loop uses `setInterval` at 16ms, not `requestAnimationFrame`. rAF + health-check had a race condition spawning duplicate loops when frames were delayed (tab background, `prompt()` block). `setInterval` is race-free.
- The bottle is a 16×28 `Uint8Array` grid (0=empty, 1=glass). Canvas is 96×120px. `cellSize = Math.floor(Math.min(w/16, h/28))`.
- `findInteriorRows()` scans rows 3–26 for rows with both left and right wall cells and an empty cell between.
- `rowBounds(row)` returns the first and last **interior** (0-value) cell between wall (1-value) cells.
- Water fill animates toward the tracker's value using a 0.15 lerp factor. Always renders at least 1 row when `waterMl > 0` (prevents empty bottle for small responses ~6ml).
- Water + puddle have per-cell sinusoidal color variation (`frameCount * 0.03` drift + fast `glint` wave) for a living liquid look.
- Cork pops (lifts off) at 95%+ of capacity.
- Right-click to set capacity (10–100,000ml). Visual only - tracker has independent 9,999L cap.
- `prompt()` in the contextmenu handler blocks the event loop and can orphan `this.dragging = true` (mouseup consumed during prompt block). The handler must reset `this.dragging = false`.
- Overlay auto-switches display from ml to L at >= 1000ml.

### Tests

- `vitest.config.ts` sets `globals: true` and `environment: 'jsdom'`.
- Canvas `getContext('2d')` is stubbed by jsdom - returns a `CanvasRenderingContext2D` mock. Pixel-level rendering can't be tested; test DOM structure and state transitions instead.

### Chrome Web Store publishing

See `docs/PROJECT_MANIFEST.md` → "Chrome Web Store - Publishing Checklist" for blockers and pre-submission polish items.
