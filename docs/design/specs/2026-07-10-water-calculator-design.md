# Design Spec - Water Calculator Chrome Extension

**Date:** 2026-07-10
**Source:** `docs/superpowers/seed.yaml`

---

## 1. Stack

- **TypeScript** + **Vite** bundler
- No UI framework - plain DOM manipulation + CSS for the overlay
- Manifest V3 extension target
- Chrome-first; Brave/Edge compatible (Chromium engine)

## 2. Project Structure

```
src/
  content/           # Content script - injected into LLM tabs
    index.ts         # Entry: wires up PlatformDetector → Observer → Overlay
    detector.ts      # URL match + DOM fingerprint → resolves platform config
    scraper.ts       # MutationObserver: watches new message nodes, tags with data attr
    estimator.ts     # BPE token approximation from text delta
    converter.ts     # tokens → water_ml (0.003 ml/token ratio, cited)
    overlay.ts       # Water-fill overlay UI (create, animate, drag, state)
    tracker.ts       # Conversation lifecycle: start, resume, persist
  background/        # Service worker
    index.ts         # IndexedDB read/write bridge, platform config registry
  options/           # Options page
    index.html
    index.ts         # Add/manage custom platforms, view conversation history
  shared/
    types.ts         # Shared types (ConversationRecord, PlatformConfig, etc.)
    db.ts            # IndexedDB schema, migrations, CRUD helpers
    constants.ts     # Default platforms, conversion ratio, citation
  manifest.json      # Manifest V3 (generated/transformed by Vite)
```

## 3. Architecture Principles

Every module exposes a **TypeScript interface** and a **single class implementation**. No module reaches into another module's internals - all cross-module communication passes through the interface contract.

**Rules:**
- Each file = one class implementing one interface
- Dependencies are constructor-injected, never imported directly as globals
- Feature modules (detector, scraper, estimator, overlay, tracker) are self-contained - removing one does not break the pipeline; the orchestrator wires them together
- Shared types live in `src/shared/types.ts`; no circular imports
- IndexedDB access goes through `src/shared/db.ts` only - content scripts never open DB directly
- Async operations return Promises; no blocking calls in the content script main thread

**Orchestration pattern:**

```
Content Script entry (index.ts)
  → creates concrete implementations of each interface
  → injects dependencies via constructor
  → calls start() on the orchestrator

interface PlatformDetector { resolve(): PlatformConfig }
interface TextScraper     { attach(container: Element): void; onNewText(cb: (delta: string) => void): void }
interface TokenEstimator  { estimate(text: string): number }
interface WaterConverter  { toMl(tokens: number): number }
interface OverlayUI       { update(ml: number): void; setState(state: OverlayState): void }
interface ConversationStore { start(c: ConversationRecord): Promise<void>; update(id: string, ml: number, tokens: number): Promise<void>; findByUrl(url: string): Promise<ConversationRecord | null> }
```

## 4. Architecture

### Content Script (`src/content/`)

Injected into every matched LLM tab. Responsible for all real-time behavior.

**Lifecycle:**

```
page load
  → PlatformDetector.resolve()
    → URL match against platform registry
    → DOM fingerprint fallback (check for known selector signatures)
  → Tracker.start() or Tracker.resume()
    → Look up url in IndexedDB → new record or existing
  → Observer.attach()
    → MutationObserver on message container
    → On new nodes: skip if already tagged (data-wc-tracked attr)
    → Extract text delta → BPE estimate → convert to water_ml delta
    → Update overlay + persist to IndexedDB
  → Tab restore (pageshow/visibilitychange)
    → Re-attach observer
    → Re-scan DOM, diff against tagged nodes
    → Resume from last persisted state
  → Tab hidden (pagehide)
    → Persist current state to IndexedDB
```

**State Manager (`tracker.ts`):**

- `start(url, platform)`: create new conversation record in IndexedDB, set water_ml=0
- `resume(url)`: load existing record, restore water_ml, re-scan tagged nodes
- `addDelta(water_ml_delta, token_delta)`: update record + overlay
- `onNewChat(url)`: detect URL change, call start() if new, resume() if known

### Overlay UI (`overlay.ts`)

Single fixed `<div>` injected into page DOM. States:

| State | Behavior |
|---|---|
| Active (streaming) | Fill animates upward, counter ticks in real-time |
| Idle | Static water level, counter shows current total |
| New chat | Empty container, water resets to 0 |
| Returning | Loads saved water_ml from IndexedDB, fills to that level |
| Minimized | Collapses to compact circle with water level ring |
| Threshold 1L+ | Label changes to L; tint intensifies at 1L, 5L, 10L |
| Dragged | User repositions anywhere in viewport, position persists in localStorage |

**Visual design:**

- Glass-morphism card (`backdrop-filter: blur(12px)`, `rgba(255,255,255,0.15)`)
- Blue gradient water fill from bottom-up, `height` percentage with `transition: height 300ms`
- Large counter number (ml/L) with water-drop icon
- Draggable via handle; close/minimize buttons
- Always-on-top via `position: fixed`, high `z-index`

### Service Worker (`src/background/`)

- Bridges IndexedDB access for content scripts (Content scripts access DB via `chrome.runtime.sendMessage`)
- Serves platform config registry (built-in + user-added)
- Installs default platforms on `chrome.runtime.onInstalled`

### Options Page (`src/options/`)

- Form to add custom platform: name, URL match pattern, CSS selectors for messages + title + input
- List of configured platforms with edit/delete
- Conversation history table (read-only for now; dashboard is out of scope)

## 5. IndexedDB Schema

```
Database: WaterCalculator
Version: 1

Store: conversations
  id          : string  - UUID
  url         : string  - chat page URL (indexed)
  platform    : string  - platform identifier
  topic       : string  - scraped native title
  water_ml    : number  - total water for this conversation
  token_count : number  - estimated tokens
  started_at  : ISODate
  updated_at  : ISODate
  Index: url
  Index: platform + started_at

Store: platforms
  id          : string
  name        : string
  url_match   : string  - regex pattern
  selectors   : object  - { messages, title, input } CSS selectors
  built_in    : boolean - true = shipped with extension
```

## 6. Water-to-Token Conversion

```
tokens = bpe_encode(text_delta).length
water_ml = tokens * 0.003  // 3 ml per 1000 tokens
```

**Ratio source:** 0.003 ml/token derived from Li et al. (2023) "Making AI Less Thirsty" and Patterson et al. (2022) data center water efficiency benchmarks. Cited in extension popup/docs.

**BPE estimator:** Lightweight byte-pair encoding approximation in JS. Merges common character pairs iteratively against a small pretrained vocab (4KB embedded). No model download needed.

## 7. Built-in Platform Configs

| Platform | URL Pattern | Message Selector | Title Selector |
|---|---|---|---|
| ChatGPT | `chatgpt.com` | `[data-message-author-role]` | `title` or `.chat-title` |
| Gemini | `gemini.google.com` | `.message-content` | `title` or `.chat-header` |
| Claude | `claude.ai` | `[data-start]` / `.message-content` | `title` or `.chat-title` |
| Perplexity | `perplexity.ai` | `.prose` / `.message` | `title` or `.thread-title` |

Platform selector lists need field verification against current live DOM before finalizing.

## 8. Non-Goals (Out of Scope)

- Dashboard / analytics UI
- Backend or cloud sync
- Training-cost water estimation
- Multi-browser packaging (Firefox, Safari) - Chrome-first
- Conversation topic auto-classification beyond title scraping
