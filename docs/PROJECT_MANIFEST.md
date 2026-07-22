# PROJECT_MANIFEST.md - Token-WUEr

## Stage: Complete (Merged to main)

Goal: All modules implemented, tested, built, merged to main.

## ADRs

| ID | Decision | Rationale |
|---|---|---|
| ADR-01 | DOM scraping for token detection | Safer than network interception; won't trigger CSP/ToS bans |
| ADR-02 | Manifest V3, Chrome-first | Latest extension standard; Brave/Chrome share the same engine |
| ADR-03 | Fixed water ratio from literature | Single, citable conversion factor (3ml/1000 tokens); inference only |
| ADR-04 | chrome.storage.local for local storage | Privacy-preserving; shared across extension contexts; survives browser data clearing |
| ADR-05 | Dashboard/analytics out of scope | Separate future project; extension focuses on tracking + visual |
| ADR-06 | Interface-first OOP (constructor injection) | Modules are self-contained plugins; removing one won't break the pipeline |
| ADR-07 | gpt-tokenizer + 1.5x multiplier | Lightweight token estimation; multiplier accounts for input tokens (~2:1 output:input ratio) and minor tokenizer differences |
| ADR-08 | addDelta uses options object | Extensible without breaking callers (ml, tokens, topic?) |
| ADR-09 | onNewText returns disposer | Callbacks can be unsubscribed, preventing memory leaks |
| ADR-10 | Per-platform text extraction | innerText for Gemini (rendered math), textContent for ChatGPT (CSS hides innerText) |
| ADR-11 | Full-text re-tokenization | Re-tokenize accumulated text each delta, return diff; eliminates double-counting from DOM rewrites |
| ADR-12 | setInterval over rAF for render loop | rAF + health-check had race condition spawning duplicate loops when frames delayed (tab bg, prompt() block). setInterval at 16ms is race-free. |
| ADR-13 | Capacity right-click blocked thread | prompt() blocks JS event loop. On return, mouseup was consumed and dragging=true left orphaned. Fix: reset dragging=false in contextmenu handler. |
| ADR-16 | chrome.storage.local over IndexedDB | Content scripts and extension pages use different IndexedDB origins; chrome.storage.local is shared across all extension contexts |

## Known Issues

### RESOLVED - Chat-switch contamination: URL guard on scraper callbacks (2026-07-11)

**Fix:** Added `window.location.href` guard to both `onNewText` callback registrations in `src/content/index.ts`. Before processing a delta, the callback verifies that the current page URL still matches the tracker's active conversation URL. If the user navigated to a different chat (SPA pushState changes `window.location.href` before DOM renders new content), the delta is discarded. Also added `this.current.url = window.location.href` in `ConversationTracker.resume()` to prevent the URL guard from blocking deltas on resumed conversations whose records have stale URLs.

### WIP - Gemini injection unreliability (2026-07-11, last analyzed 2026-07-23)

**Symptom:** Content script intermittently fails to execute on Gemini (`gemini.google.com`). When it fails, zero `[wc]` log lines appear in console - the script never ran. When it works, all diagnostics fire and tracking functions normally. ChatGPT, Claude, and Perplexity unaffected.

**Root cause (2026-07-23):** The 2MB static bundle (gpt-tokenizer BPE lookup tables) is the most likely culprit. Chrome appears to defer or skip injection of large content scripts on Gemini's already-heavy Angular SPA pages due to main-thread pressure or memory budget constraints. Vite bundles all modules before any top-level code executes, so `console.warn("[wc] executing")` appears after 2MB of BPE table parsing — meaning injection failure = silent, no log at all.

**Attempted fix (reverted):** Dynamic `import('gpt-tokenizer')` shrunk content.js from 2MB → 23kB. But Chrome MV3 content scripts fail to resolve dynamic import paths (`import("./assets/...")`) in the extension's content-script execution context — broke tracking on ALL platforms.

**Workaround if it happens:** Force-reload the extension in `chrome://extensions`, then hard-refresh Gemini (⇧⌘R). This almost always fixes it.

**Mitigations applied:**
- `run_at: "document_end"` (more reliable than `document_idle` for SPAs)
- Removed `findMessageContainer()` guard — scraper always attaches
- `init().catch()` error handling prevents silent crashes

**Diagnostic checkpoints** (in console):
| Log | Location | Meaning |
|-----|----------|---------|
| `[wc] executing …` | Top of content/index.ts | Script loaded and ran |
| `[wc] overlay mounted, loop started` | overlay.ts mount() | Canvas + setInterval loop alive |
| `[wc] scraper attached, platform: …` | index.ts startTracking() | Observer + polling active |
| `[wc] content script loaded, starting init` | index.ts entry | About to call init() |
| `[wc] init error: …` | index.ts catch | init() rejected |

**Future directions:**
1. Programmatic injection via `chrome.scripting.executeScript` in service worker as fallback when static injection fails
2. Replace gpt-tokenizer with a lighter estimator (e.g., ~4 chars/token heuristic) to shrink the bundle permanently
3. Alternative: use `world: "MAIN"` injection + messaging bridge to bypass content-script injection limits

## Activity Log

| Date | Activity | Details |
|---|---|---|
| 2026-07-10 | Seeding complete | Interview conducted, seed.yaml generated |
| 2026-07-10 | Design complete | Architecture spec with OOP principles |
| 2026-07-10 | Planning complete | 15-task TDD implementation plan |
| 2026-07-10 | Initial implementation | 10 modules, 46 tests, 0 lint errors, build passes |
| 2026-07-10 | ChatGPT fix | Switched to assistant-only selector `[data-message-author-role="assistant"]` |
| 2026-07-10 | Streaming fix | Full-text re-tokenization eliminates ChatGPT DOM rewrite double-counting |
| 2026-07-10 | Gemini fix | Prefer innerText (rendered math) over textContent (raw LaTeX annotations) |
| 2026-07-10 | Platform-specific selectors | Tightened selectors per platform; attach() self-cleans on re-entry |
| 2026-07-10 | Verification | ChatGPT: exact match at 6.3ml; Gemini: within ~10% of ground truth |
| 2026-07-11 | Bottle overlay redesign | Pixel-art Canvas 2D bottle (16×28 grid), water fill with per-cell shimmer, cork pop at 95% capacity, overflow puddle with ripple |
| 2026-07-11 | Water fill threshold fix | Always renders >=1 row when waterMl > 0; fixed 0-row bug for small responses (~6ml) |
| 2026-07-11 | Shimmer removal + puddle redesign | Removed awkward shimmer band; animated puddle with per-cell color ripple; widened canvas to 96px |
| 2026-07-11 | Scraper attach fix | Removed findMessageContainer() guard - scraper always attaches now, eliminates skip on lazy-loaded pages |
| 2026-07-11 | Loop reliability: rAF→setInterval | Replaced rAF+health-check with race-free setInterval at 16ms; eliminated duplicate-loop thread contention |
| 2026-07-11 | Drag-after-prompt fix | Reset dragging=false in contextmenu handler - prompt() consumed mouseup, leaving orphaned drag state |
| 2026-07-11 | Content script injection investigation | Added diagnostic logs; switched run_at to document_end; documented known injection unreliability on Gemini |
| 2026-07-11 | Chat-switch contamination fix | Added URL guard to onNewText callbacks; prevents old scraper deltas from contaminating other conversation records during SPA navigation |
| 2026-07-23 | Storage migration | Replaced IndexedDB with chrome.storage.local; dashboard can now read data written by content scripts |
| 2026-07-23 | Open-source prep | Added LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md; rewrote README; generated extension icons; updated manifest with icons |
| 2026-07-23 | ChatGPT fix | Removed `[data-message-id]` requirement; added `watchForPlatform` immediate re-check for race condition |
| 2026-07-23 | Claude support | Identified correct selectors (`font-claude-response-body` + `progressive-markdown`); verified working |
| 2026-07-23 | Perplexity support | Verified working with existing `.prose, .message` selectors |
| 2026-07-23 | Title scraping fix | Switched to `document.title` with platform-specific suffix stripping; fixed full message text appearing as titles |
| 2026-07-23 | Per-platform token multipliers | Replaced universal 2.5× with platform-specific multipliers (ChatGPT 1.3×, Gemini 1.5×, Claude 1.4×, Perplexity 1.5×) |
| 2026-07-23 | Categorizer keyword expansion | Added ~50 missing keywords; renamed "Uncategorized" → "Miscellaneous" |
| 2026-07-23 | Tab-switch resume fix | Added visibility-state guards to prevent double-attach loop from `pageshow` + `visibilitychange` |

## Planned Features

### Data Export & Durable Storage
- [x] **Migrate from IndexedDB → `chrome.storage.local`** (2026-07-23) - replaced `IndexedDBStore` with `chrome.storage.local`-backed implementation. All data now persists across extension contexts (content script, dashboard, background) and survives browser data clearing.
- [ ] **JSON export button**: add option on bottle right-click or a small toolbar button to download all conversation data as `.json` file for offline backup
- [ ] **Auto-save on delta**: optionally persist a local `.json` file on each water update (via `chrome.downloads` API or clipboard copy)

### Other
- [ ] **Chat-switch contamination fix**: old scraper feeds deltas to wrong conversation record during SPA navigation (see Known Issues). Fix: detach scraper BEFORE URL-change handler creates new tracker.

## Chrome Web Store - Publishing Checklist

### Blockers
- [x] **Icons**: add 128×128, 48×48, 16×16 PNGs to manifest (`"icons": {...}`)
- [ ] **Privacy policy**: required even for local-only data. Must state: IndexedDB only, no data leaves browser, no tracking
- [ ] **Remove `web_accessible_resources`** or fix `chunks/*` (Vite produces no chunks)
- [x] **Test Claude + Perplexity**: selectors verified working (2026-07-23)

### Pre-submission polish
- [ ] **Permission justification** for `storage` (used by service worker for platform configs only)
- [ ] **Bundle size review**: 1.7MB (gpt-tokenizer ~1MB gzipped). Chrome may flag. Consider lazy-loading tokenizer or switching to a lighter estimator
- [ ] **Fix Gemini injection reliability** (see Known Issues above) - intermittent content-script failure could cause bad reviews. Root cause identified (bundle size). Potential fixes: lighter estimator, programmatic injection fallback.
- [ ] Add `"action"` (toolbar icon) so extension is visible in toolbar
- [ ] Screenshots (1280×800) for store listing
- [ ] Description + short description for store listing
- [ ] Verify extension works after unpacked→packaged (.crx) transition
