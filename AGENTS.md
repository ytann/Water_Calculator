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

## Architecture

```
src/
  shared/types.ts      — All TS interfaces (IPlatformDetector, ITextScraper, ...)
  shared/constants.ts  — Platform configs, selectors, WATER_ML_PER_TOKEN = 0.003
  shared/db.ts         — IndexedDB (fake-indexeddb in tests)
  content/index.ts     — Orchestrator: wires all modules, handles SPA nav + lifecycle
  content/detector.ts  — Platform detection by hostname
  content/scraper.ts   — DOM text extraction (MutationObserver + 500ms polling)
  content/estimator.ts — Token estimation (gpt-tokenizer × 2.5x, re-tokenize full text each delta)
  content/converter.ts — Token → water (ml)
  content/overlay.ts   — WaterBottleOverlay: Canvas 2D pixel-art bottle (16×28 grid)
  content/tracker.ts   — Conversation lifecycle, IndexedDB persistence, caps at 9999L
  background/index.ts  — Service worker (placeholder)
```

- **OOP, interface-first:** every module exposes a TS interface in `shared/types.ts`, one class implements it. Dependencies are constructor-injected.
- **Self-contained plugins:** removing any one module must not break the pipeline.
- **No circular imports.** All shared types in `src/shared/types.ts`. All DB access through `src/shared/db.ts`.

## Conventions

- All debug logs removed from source — don't add `console.log` without a reason to keep it.
- Test files under `tests/` mirror `src/` structure.
- Overlay tests only check DOM/mounting behavior — Canvas 2D is not supported in jsdom. Stderr about `getContext` is expected and harmless.

## Gotchas

### Token estimation

- `BPEstimator` re-tokenizes the **full accumulated text** every `estimate()` call and returns only the **net diff** (`total - lastTokenCount`). This prevents double-counting when ChatGPT rewrites its DOM during streaming.
- Call `estimator.reset()` when starting a new conversation, or the diff won't reset.

### Text scraping

- `DOMScraper.attach()` calls `this.detach()` first. This prevents duplicate MutationObservers and poll timers when SPA navigation triggers `pageshow`/`visibilitychange` re-attach.
- `getElementText(el)` tries `el.innerText` first (needed for Gemini — captures rendered math). Falls back to `el.textContent` (needed for ChatGPT — CSS hides `innerText`).
- Untested on Claude and Perplexity — selectors in `constants.ts` are best-guess placeholders.

### Bottle overlay (Canvas)

- The bottle is a 16×28 `Uint8Array` grid (0=empty, 1=glass). `cellSize = Math.floor(Math.min(w/16, h/28))`.
- `findInteriorRows()` scans for rows that have both left and right wall cells with at least one empty cell between.
- `rowBounds(row)` returns the first and last **interior** (0-value) cell between wall (1-value) cells. Used by water fill, shimmer, and ripple rendering.
- Water fill animates toward the tracker's value using a 0.15 lerp factor in `updateAnimations()`.
- Right-click on the bottle to set capacity (10–100,000ml). Visual only — the tracker has an independent 9,999L cap.
- Overlay auto-switches display from ml to L at >= 1000ml.

### Tests

- `vitest.config.ts` sets `globals: true` and `environment: 'jsdom'`.
- Canvas `getContext('2d')` is stubbed by jsdom — returns a `CanvasRenderingContext2D` mock. Pixel-level rendering can't be tested; test DOM structure and state transitions instead.
