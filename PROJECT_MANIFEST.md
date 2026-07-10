# PROJECT_MANIFEST.md — Water Calculator

## Stage: Complete (Merged to main)

Goal: All modules implemented, tested, built, merged to main.

## ADRs

| ID | Decision | Rationale |
|---|---|---|
| ADR-01 | DOM scraping for token detection | Safer than network interception; won't trigger CSP/ToS bans |
| ADR-02 | Manifest V3, Chrome-first | Latest extension standard; Brave/Chrome share the same engine |
| ADR-03 | Fixed water ratio from literature | Single, citable conversion factor (3ml/1000 tokens); inference only |
| ADR-04 | IndexedDB for local storage | Privacy-preserving; no data leaves the browser |
| ADR-05 | Dashboard/analytics out of scope | Separate future project; extension focuses on tracking + visual |
| ADR-06 | Interface-first OOP (constructor injection) | Modules are self-contained plugins; removing one won't break the pipeline |
| ADR-07 | gpt-tokenizer + 2.5x multiplier | Lightweight token estimation; multiplier corrects for GPT's aggressive BPE vs other tokenizers |
| ADR-08 | addDelta uses options object | Extensible without breaking callers (ml, tokens, topic?) |
| ADR-09 | onNewText returns disposer | Callbacks can be unsubscribed, preventing memory leaks |
| ADR-10 | Per-platform text extraction | innerText for Gemini (rendered math), textContent for ChatGPT (CSS hides innerText) |
| ADR-11 | Full-text re-tokenization | Re-tokenize accumulated text each delta, return diff; eliminates double-counting from DOM rewrites |
| ADR-12 | setInterval over rAF for render loop | rAF + health-check had race condition spawning duplicate loops when frames delayed (tab bg, prompt() block). setInterval at 16ms is race-free. |
| ADR-13 | Capacity right-click blocked thread | prompt() blocks JS event loop. On return, mouseup was consumed and dragging=true left orphaned. Fix: reset dragging=false in contextmenu handler. |
| ADR-14 | Canvas width 80→96px | Puddle needs room to wrap around bottle base; 16px extra horizontal padding. |

## Known Issues

### OPEN — Content script injection unreliability (2026-07-11)

**Symptom:** Content script intermittently fails to execute on Gemini (`gemini.google.com`). When it fails, zero `[wc]` log lines appear in console — the script never ran. When it works, all diagnostics fire and tracking functions normally.

**Mitigations applied:**
- Switched `run_at` from `document_idle` → `document_end` (unreliable on Gemini's heavy SPA)
- Added `console.warn("[wc] executing", document.URL)` as first statement after imports to confirm script execution
- Replaced rAF+health-check loop with race-free `setInterval` at 16ms (eliminates duplicate-loop thread contention)
- Added `init().catch()` error handling so unhandled rejections don't silently kill script
- Removed `findMessageContainer()` guard that could skip scraper attach on lazy-loaded pages

**Diagnostic log checkpoints** (all in console):
| Log | Location | Meaning |
|-----|----------|---------|
| `[wc] executing …` | Top of content/index.ts | Script actually loaded and ran |
| `[wc] overlay mounted, loop started` | overlay.ts mount() | Canvas created, setInterval loop running |
| `[wc] scraper attached, platform: …` | index.ts startTracking() | MutationObserver + polling active |
| `[wc] content script loaded, starting init` | index.ts entry point | About to call init() |
| `[wc] init error: …` | index.ts catch | init() rejected |

**Next steps if issue recurs:**
1. Check if `[wc] executing` appears — if not, Chrome didn't inject. Try: force-reload extension in `chrome://extensions`, hard-refresh page, or check for conflicting extensions.
2. If `executing` appears but `overlay mounted` doesn't — overlay.init() threw. Check for missing DOM elements.
3. If all logs appear but tracking fails — scraper/Observer issue. Check `scraper attached` platform ID matches.
4. Consider programmatic injection via `chrome.scripting.executeScript` in service worker as fallback.
5. Consider splitting the 1.7MB content bundle — Chrome may have injection size/timing limits on heavyweight content scripts.

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
| 2026-07-11 | Scraper attach fix | Removed findMessageContainer() guard — scraper always attaches now, eliminates skip on lazy-loaded pages |
| 2026-07-11 | Loop reliability: rAF→setInterval | Replaced rAF+health-check with race-free setInterval at 16ms; eliminated duplicate-loop thread contention |
| 2026-07-11 | Drag-after-prompt fix | Reset dragging=false in contextmenu handler — prompt() consumed mouseup, leaving orphaned drag state |
| 2026-07-11 | Content script injection investigation | Added diagnostic logs; switched run_at to document_end; documented known injection unreliability on Gemini |
