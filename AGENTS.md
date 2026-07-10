# AGENTS.md — Water Calculator

## Commands

- **setup:** `npm install`
- **build:** `npm run build` (tsc, then two Vite builds: `ENTRY=content` + `ENTRY=background`, then `cp manifest.json dist/`)
- **lint:** `npm run lint` (tsc --noEmit)
- **typecheck:** `npm run lint`
- **test:** `npm test` (vitest run)
- **run single test:** `npx vitest run tests/path/to/test.ts`
- **dev:** `npm run dev` (vite watch — content script only)

**Build gotcha:** the build script runs `ENTRY=content vite build` then `ENTRY=background vite build`. `emptyOutDir` is `true` only for the content build, so `content.js` survives when `background.js` is written. If you change this ordering, the dist folder will break.

**After every build:** reload the extension in `chrome://extensions` (click the reload icon on the extension card). Content scripts are not auto-reloaded on update.

## Architecture

```
src/
  shared/types.ts      — All TS interfaces (IPlatformDetector, ITextScraper, ...)
  shared/constants.ts  — Platform configs, selectors, WATER_ML_PER_TOKEN = 0.003
  shared/db.ts         — IndexedDB (fake-indexeddb in tests)
  content/index.ts     — Orchestrator: wires all modules, handles SPA nav + lifecycle
  content/detector.ts  — Platform detection by hostname
  content/scraper.ts   — DOM text extraction (MutationObserver + 500ms polling on document.body)
  content/estimator.ts — Token estimation (gpt-tokenizer × 2.5x, re-tokenize full text each delta)
  content/converter.ts — Token → water (ml)
  content/overlay.ts   — WaterBottleOverlay: Canvas 2D pixel-art bottle (16×28 grid, 96×120px canvas)
  content/tracker.ts   — Conversation lifecycle, IndexedDB persistence, caps at 9999L
  background/index.ts  — Service worker (platform configs, message relay)
```

- **OOP, interface-first:** every module exposes a TS interface in `shared/types.ts`, one class implements it. Dependencies are constructor-injected.
- **Self-contained plugins:** removing any one module must not break the pipeline.
- **No circular imports.** All shared types in `src/shared/types.ts`. All DB access through `src/shared/db.ts`.

## Conventions

- Debug logs are removed from source **unless intentional diagnostics.** Five `[wc]` log lines currently exist to diagnose a known injection-reliability issue (see Gotchas). Do not add more without a specific, documented reason.
- Test files under `tests/` mirror `src/` structure.
- Overlay tests only check DOM/mounting behavior — Canvas 2D is not supported in jsdom. Stderr about `getContext` is expected and harmless.

## Gotchas

### Content script injection (Gemini)

The content script intermittently fails to execute on `gemini.google.com`. When it fails, zero `[wc]` log lines appear — the script never ran. Diagnostics in order of execution:

| Log line | What it means |
|----------|--------------|
| `[wc] executing` | Script loaded (first line) |
| `[wc] overlay mounted, loop started` | Canvas + setInterval loop alive |
| `[wc] scraper attached, platform: X` | Observer + polling started |
| `[wc] content script loaded, starting init` | About to call init() |
| `[wc] init error:` | init() rejected |

If `executing` doesn't appear: Chrome didn't inject. Try reloading the extension or hard-refreshing the page.
If `executing` appears but nothing after: crash in intermediary code.
Mitigation: `run_at` is set to `document_end` (more reliable than `document_idle` for heavy SPAs).

### Token estimation

- `BPEstimator` re-tokenizes the **full accumulated text** every `estimate()` call and returns only the **net diff** (`total - lastTokenCount`). This prevents double-counting when ChatGPT rewrites its DOM during streaming.
- Call `estimator.reset()` when starting a new conversation, or the diff won't reset.

### Text scraping

- `DOMScraper.attach()` calls `this.detach()` first. This prevents duplicate MutationObservers and poll timers when SPA navigation triggers `pageshow`/`visibilitychange` re-attach.
- `getElementText(el)` tries `el.innerText` first (needed for Gemini — captures rendered math). Falls back to `el.textContent` (needed for ChatGPT — CSS hides `innerText`).
- The scraper always observes `document.body` via `subtree: true`. The `container` param passed to `attach()` is unused — do not gate attach on a container check.
- Untested on Claude and Perplexity — selectors in `constants.ts` are best-guess placeholders.

### Bottle overlay (Canvas)

- Render loop uses `setInterval` at 16ms, not `requestAnimationFrame`. rAF + health-check had a race condition spawning duplicate loops when frames were delayed (tab background, `prompt()` block). `setInterval` is race-free.
- The bottle is a 16×28 `Uint8Array` grid (0=empty, 1=glass). Canvas is 96×120px. `cellSize = Math.floor(Math.min(w/16, h/28))`.
- `findInteriorRows()` scans rows 3–26 for rows with both left and right wall cells and an empty cell between.
- `rowBounds(row)` returns the first and last **interior** (0-value) cell between wall (1-value) cells.
- Water fill animates toward the tracker's value using a 0.15 lerp factor. Always renders at least 1 row when `waterMl > 0` (prevents empty bottle for small responses ~6ml).
- Water + puddle have per-cell sinusoidal color variation (`frameCount * 0.03` drift + fast `glint` wave) for a living liquid look.
- Cork pops (lifts off) at 95%+ of capacity.
- Right-click to set capacity (10–100,000ml). Visual only — tracker has independent 9,999L cap.
- `prompt()` in the contextmenu handler blocks the event loop and can orphan `this.dragging = true` (mouseup consumed during prompt block). The handler must reset `this.dragging = false`.
- Overlay auto-switches display from ml to L at >= 1000ml.

### Tests

- `vitest.config.ts` sets `globals: true` and `environment: 'jsdom'`.
- Canvas `getContext('2d')` is stubbed by jsdom — returns a `CanvasRenderingContext2D` mock. Pixel-level rendering can't be tested; test DOM structure and state transitions instead.

### Chrome Web Store publishing

See `PROJECT_MANIFEST.md` → "Chrome Web Store — Publishing Checklist" for blockers and pre-submission polish items.
