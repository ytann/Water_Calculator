# Contributing to Token-WUEr

## Getting Started

```bash
git clone https://github.com/ytann/token-wuer.git
cd token-wuer
npm install
npm run build
```

Load the `dist/` folder as an unpacked extension in `chrome://extensions`.

After any code change to content scripts, **reload the extension** (click the
reload icon on the extension card in `chrome://extensions`). Content scripts
are not auto-reloaded on extension update.

## Development Commands

| Command | What it does |
|---------|-------------|
| `npm run build` | Type-check + bundle all entrypoints (content, dashboard, background) |
| `npm test` | Run all tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npx vitest run tests/path/to/test.ts` | Run a single test file |
| `npm run lint` | Type-check only (`tsc --noEmit`) |
| `npm run dev` | Vite dev server (content script only) |

### Build Order

The build runs three Vite builds sequentially: `content → dashboard →
background`. The content build empties `dist/` (`emptyOutDir: true`); the
other two append. **Do not change this ordering** or the dist folder will
break.

## Architecture

The codebase follows **interface-first OOP** - every module exposes a
TypeScript interface in `src/shared/types.ts`, with exactly one class
implementing it. Dependencies are constructor-injected, making each module
self-contained and independently testable.

```
src/
├── shared/types.ts      # All interfaces
├── shared/constants.ts  # Platform configs, water ratio, selectors
├── shared/db.ts         # chrome.storage.local persistence
├── content/index.ts     # Orchestrator (wires modules, SPA nav, lifecycle)
├── content/detector.ts  # Platform detection by hostname
├── content/scraper.ts   # DOM text extraction
├── content/estimator.ts # Token estimation (gpt-tokenizer)
├── content/converter.ts # Token → water (ml)
├── content/overlay.ts   # Canvas 2D pixel-art water bottle
├── content/tracker.ts   # Conversation lifecycle, persistence
├── dashboard/           # Standalone dashboard page (separate Vite build)
├── options/             # Platform management, data export
└── background/          # Service worker
```

## Code Conventions

- **No debug logs** in production code unless they're intentional
  diagnostics. Five `[wc]` log lines exist to diagnose a known
  injection-reliability issue on Gemini (see Gotchas). Don't add more
  without a specific reason.
- **Test files** under `tests/` mirror the `src/` directory structure.
- **No circular imports.** All shared types go through
  `src/shared/types.ts`. All storage access through `src/shared/db.ts`.

## Testing

Tests use Vitest with `jsdom` environment and `globals: true`. The test
setup (`vitest.setup.ts`) provides:

- A `chrome.storage.local` mock (in-memory key-value store)
- A Canvas 2D context mock (no pixel-level rendering in jsdom)

**Canvas tests** can only verify DOM structure and state transitions.
Pixel-level rendering is untestable in jsdom. Stderr about `getContext` is
expected and harmless.

## Platform Support

| Platform | Selector | Status |
|----------|----------|--------|
| ChatGPT (`chatgpt.com`) | `[data-message-author-role="assistant"]` | Verified |
| Gemini (`gemini.google.com`) | `message-content, .message-content, [data-message-content]` | Verified |
| Claude (`claude.ai`) | `[class*="font-claude-response-body"], [class*="progressive-markdown"]` | Verified |
| Perplexity (`perplexity.ai`) | `.prose, .message` | Verified |

To add a new platform: add a `PlatformConfig` entry to `DEFAULT_PLATFORMS`
in `src/shared/constants.ts`, test the selectors, and open a PR.

## Gotchas

### Content script injection (Gemini)

The content script intermittently fails to execute on `gemini.google.com`.
When it fails, zero `[wc]` log lines appear - the script never ran.
Mitigation: `run_at` is set to `document_end` (more reliable than
`document_idle` for heavy SPAs).

If you see `[wc] executing` but nothing after, the script crashed during
initialization. If you see zero `[wc]` lines, Chrome didn't inject the
script - reload the extension or hard-refresh the page.

### Text scraping

- `DOMScraper.attach()` calls `this.detach()` first to prevent duplicate
  `MutationObserver`s and poll timers during SPA navigation.
- `getElementText(el)` tries `el.innerText` first (Gemini - rendered math),
  falls back to `el.textContent` (ChatGPT - CSS hides `innerText`).
- The scraper always observes `document.body` with `subtree: true`. The
  `container` param to `attach()` is unused.

### Token estimation

`BPEstimator` re-tokenizes the **full accumulated text** on every
`estimate()` call and returns only the net diff. This prevents
double-counting when ChatGPT rewrites its DOM during streaming. Always call
`estimator.reset()` when starting a new conversation.

### Conversation tracker

`ConversationTracker.resume()` sets `this.current.url =
window.location.href` after loading a record. The `onNewText` callbacks
guard against chat-switch contamination by comparing the current page URL
to the tracker's URL. If `resume()` didn't sync the URL, all deltas on
resumed conversations would be silently discarded.

`getCurrent()` returns `null` when no conversation is active. Always
null-check.

### Bottle overlay

- Render loop uses `setInterval(16ms)`, not `requestAnimationFrame`. rAF
  had a race condition spawning duplicate loops when frames were delayed.
- `prompt()` in the contextmenu handler blocks the event loop. The handler
  must reset `this.dragging = false` to prevent orphaned drag state.
- Right-click sets capacity (10–100,000ml). Visual only - the tracker has
  an independent 9,999L cap.

## Pull Request Guidelines

1. Run `npm run lint` and `npm test` before pushing
2. Add tests for new functionality
3. Follow the existing OOP/interface pattern
4. Keep debug logs to a minimum - no `console.log` in production paths
5. If adding a new platform, test it on the live site and include
   verification results in the PR description

## Code of Conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
