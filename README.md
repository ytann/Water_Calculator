# Water Calculator

Chrome extension that estimates water consumption of LLM conversations by converting tokens to water usage, with a floating overlay UI.

**Ratio:** 0.003 ml/token (3 ml per 1,000 tokens), inference only, cited from Li et al. (2023) and Patterson et al. (2022).

## Supported Platforms

| Platform | Status |
|----------|--------|
| ChatGPT (`chatgpt.com`) | Working — ~10% estimation error |
| Gemini (`gemini.google.com`) | Working — ~10% estimation error |
| Claude (`claude.ai`) | Untested |
| Perplexity (`perplexity.ai`) | Untested |

## How It Works

- **Client-side only** — DOM scraping, no network interception, Manifest V3
- **Privacy-first** — all data stored locally in IndexedDB, no servers
- Streams text from assistant responses via `MutationObserver` + 500ms polling
- Estimates tokens using `gpt-tokenizer` with a 2.5x platform-agnostic multiplier
- Floating overlay shows real-time water usage (ml, auto-switches to L at >= 1000ml)

## Setup

```bash
npm install
npm run build
```

Load the `dist/` folder as an unpacked extension in `chrome://extensions`.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Type-check + bundle content & background scripts |
| `npm run dev` | Vite dev server (content script only) |
| `npm test` | Run all tests (Vitest) |
| `npm run lint` | Type-check only |

## Architecture

```
src/
├── shared/
│   ├── types.ts          # All interfaces (IPlatformDetector, ITextScraper, ...)
│   ├── constants.ts      # Platform configs, water ratio, selectors
│   └── db.ts             # IndexedDB conversation store
├── content/
│   ├── index.ts          # Orchestrator: wires modules, SPA nav, lifecycle
│   ├── detector.ts       # Platform detection (hostname matching)
│   ├── scraper.ts        # DOM text extraction (MutationObserver + polling)
│   ├── estimator.ts      # Token estimation (gpt-tokenizer + 2.5x multiplier)
│   ├── converter.ts      # Token → water conversion
│   ├── overlay.ts        # Floating draggable UI
│   └── tracker.ts        # Conversation lifecycle (start/resume/addDelta)
└── background/
    └── index.ts          # Service worker (placeholder)
```

**OOP, interface-first** — every module exposes a TS interface, one class implements it. Dependencies are constructor-injected. Features are self-contained plugins.

## Design Decisions

See `PROJECT_MANIFEST.md` for the full ADR log.

## License

MIT
