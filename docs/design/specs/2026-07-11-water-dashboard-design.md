# Water Dashboard - Design Spec

## 1. Goal

A pixel-art, single-scroll narrative dashboard (inspired by Spotify Wrapped) that opens in a dedicated tab when the user double-clicks the bottle overlay. Reflective without shaming - lets the data speak for itself.

## 2. Architecture

### Entry point

- New Vite build target: `ENTRY=dashboard` → `src/dashboard/index.ts`
- Build order after the background build (which sets `emptyOutDir: false` so dashboard output survives)
- No new permissions - same extension origin, reads IndexedDB directly

### New source files

```
src/dashboard/
  index.ts              - Entry point. Wires aggregator → UI, renders report.
  dashboard-ui.ts       - IDashboardUI: DOM construction, Canvas charts, pixel-art styling.
  aggregator.ts         - IAggregator: reads all ConversationRecords, computes totals.
  categorizer.ts        - ITopicCategorizer: maps titles → one of ~25 categories via keyword match.
  equivalents.ts        - IEquivalentGenerator: water ml → filtered list of absurdist comparisons.
  charts.ts             - pixel-art Canvas 2D charts (donut for topics, bar for platforms).
```

### Data flow

1. User double-clicks bottle overlay → overlay sends message to background → background opens `chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") })`
2. Dashboard page loads → calls `getDashboardData()` (aggregator reads IndexedDB directly)
3. Aggregator returns `DashboardPayload` → UI renders single-scroll report

### Dashboard payload (TypeScript interface)

```ts
interface DashboardPayload {
  totals: {
    waterMl: number;
    tokens: number;
    conversations: number;
    firstDate: string;    // ISO 8601 of earliest startedAt
  };
  byPlatform: { platform: string; waterMl: number; tokens: number; count: number }[];
  byTopic: { topic: string; waterMl: number; tokens: number; count: number }[];
  equivalents: { label: string; value: number; spriteKey: string; unit: string }[];
  topConversations: ConversationRecord[];  // top 5 by waterMl
}
```

## 3. Topic Categorization

### How it works

- Each conversation's `title` is lowercased, split on word boundaries + camelCase
- Stopwords stripped ("the", "a", "is", "to", "for", "with", "and", "of", "in", "on", "it", "you", "me", "my", "we", "how", "what", "why", "can", "do", "does", "will", "here")
- Noise filtered: date patterns, lone numbers, platform artifacts
- Words stemmed: trim trailing `ing`, `ed`, `s`, `ly`, `tion`, `ment`
- Category with most keyword matches wins. Tie or zero matches → "Uncategorized"
- Keyword matching is case-insensitive, partial substring (e.g. "react" matches "reactjs" or "preact")

### Categories (27)

| Category | Keywords |
|----------|----------|
| Frontend | react, vue, angular, svelte, css, html, component, ui, dom, layout, style, tailwind, scss, less, webpack, vite, nextjs, gatsby, htmx, jquery, bootstrap, responsive |
| Backend | api, server, database, sql, endpoint, rest, graphql, auth, node, express, django, flask, fastapi, rails, laravel, spring, go golang, rust, prisma, orm, middleware, microservice |
| DevOps | ci cd, pipeline, deploy, kubernetes, k8s, docker, aws, gcp, azure, terraform, ansible, nginx, apache, monitoring, logging, alert, scaling |
| Data & Analytics | pandas, sql, query, analyze, data, csv, json, excel, tableau, visualization, etl, pipeline, spark, hadoop, statistics, regex, database schema |
| AI / Machine Learning | neural, ml, llm, gpt, transformer, model, train, inference, tensorflow, pytorch, prompt, embedding, vector, agent, rag, fine-tune |
| Mobile Dev | ios, android, swift, kotlin, flutter, react native, expo, app store, play store, widget |
| Security | security, auth, encrypt, decrypt, hash, jwt, oauth, ssl, tls, xss, csrf, vulnerability, exploit, pen test |
| Testing | test, unit test, e2e, jest, vitest, cypress, playwright, mock, stub, coverage, assert |
| Game Dev | game, unity, unreal, godot, 3d, shader, physics, sprite, fps, rpg, level, animation |
| Writing & Editing | write, draft, essay, blog, article, content, summary, proofread, grammar, edit, rewrite, paraphrase, polish, tone |
| Research | research, study, paper, citation, academic, literature, survey, methodology, hypothesis, experiment |
| Business & Strategy | business, strategy, roadmap, pitch, deck, revenue, kpi, okr, stakeholder, market, competitor, startup, saas |
| Legal | legal, contract, terms, compliance, gdpr, privacy, policy, clause, liability, copyright, patent |
| Finance | finance, budget, invest, stock, crypto, bitcoin, tax, accounting, invoice, payroll, forex, trading |
| Marketing | marketing, seo, ad, campaign, social media, copywrite, brand, funnel, conversion, email, newsletter |
| Education | learn, tutorial, course, homework, exam, study, explain, teach, textbook, lecture, quiz, curriculum |
| Health & Fitness | health, fitness, workout, diet, nutrition, meal, supplement, running, gym, yoga, meditation, sleep, calorie |
| Cooking & Food | cook, recipe, bake, ingredient, meal, dinner, lunch, dessert, cuisine, restaurant, food |
| Travel | travel, trip, flight, hotel, itinerary, destination, visa, passport, booking, tourism, backpack |
| Movies & TV | movie, film, series, episode, netflix, director, actor, cinema, review, trailer, anime, documentary |
| Music | music, song, album, guitar, piano, chord, melody, beat, genre, artist, band, lyric, playlist |
| Sports | sport, football, soccer, basketball, nba, nfl, premier, league, tournament, match, player, coach, cricket, tennis |
| Pets & Animals | pet, dog, cat, bird, fish, breed, vet, animal, wildlife, horse, aquarium |
| Relationships & Advice | relationship, advice, breakup, date, friend, family, colleague, boss, conflict, boundary, therapy, social |
| Philosophy & Reflection | philosophy, meaning, ethics, purpose, deep, reflect, journal, existential, stoic, moral |
| Hobbies & DIY | hobby, diy, craft, woodwork, garden, paint, draw, knit, sew, lego, build, repair, arduino |
| Uncategorized | *fallback when zero keyword matches* |

## 4. Layout (Single-Scroll Report)

### Section 1: Hero Stat
- Large pixel-art water droplet (32×32, animated bob)
- Total water in ml (or L if >= 1000ml), total conversations, date range ("since July 10, 2026")
- One-line "light-year" coincidence: "X liters of water ≈ X light-years of H₂O molecules lined up"

### Section 2: Where Your Water Went
- Pixel-art donut chart on Canvas 2D (8×8 pixel blocks)
- Top 5 categories shown as a legend with colored indicators and water volumes
- Remaining categories aggregated into "Other" slice

### Section 3: Platforms
- Pixel-art horizontal bar chart (8px tall bars, pixel-rounded corners)
- One row per platform (ChatGPT, Gemini, Claude, Perplexity)
- Bar width proportional to waterMl, numeric value shown

### Section 4: Under a Different Light (Equivalencies)
- 6 equivalents displayed in a 3×2 grid
- Each has a 32×32 pixel-art sprite + bold number + label
- "≈ 4,282 water bottles", "≈ 3.7 cactus months", "≈ 51 bags of ice", etc.

### Section 5: Top Conversations
- Numbered list, top 5 by waterMl
- Each row: pixel-art rank badge + title + water volume + platform icon

### Section 6: Footer
- Water ratio citation ("1 token = 0.003 ml water, inference only")
- "Exported with Water Calculator" + [Export as JSON] button

## 5. Whimsical Equivalents

### Selection algorithm
For each equivalent, compute `value = waterMl / divisor`. Filter: only include if 0.01 <= `value` <= 999,999. Sort by value descending, pick top 6. If fewer than 6 pass the filter, show only those.

### Equivalent pool

| spriteKey | Label template | Divisor (ml) | Unit |
|-----------|---------------|-------------|------|
| bottle | Water bottles | 500 | bottles |
| cactus | Cactus rations | 3,300 | months |
| ice-bag | Bags of ice | 4,500 | bags |
| tea-cup | Cups of tea | 250 | cups |
| shower | Showers | 60,000 | showers |
| rain | Minutes of rainfall | 500 | minutes of rain |
| bathtub | Bathtubs | 150,000 | bathtubs |
| tears | Titanic rewatches (in tears cried) | 50 | rewatches |
| plant | Houseplant waterings | 200 | waterings |
| ramen | Ramen bowls cooked | 500 | bowls |
| cloud | Mass of cloud | 1 | grams of cloud |
| whale | Blue whales (by volume) | 190,000,000 | whales |
| pool | Olympic swimming pools | 2,500,000,000 | pools |
| lake | Micro-lakes | 10,000,000 | micro-lakes |
| syrup | Pancakes worth of syrup | 30 | pancakes |

## 6. Pixel-Art Visual System

### Font
- Primary: monospace pixel font stack = `'Courier New', 'Courier', monospace` with `font-size: 11px` and `image-rendering: pixelated`
- Optionally load "Press Start 2P" from Google Fonts in the HTML head

### Charts (Canvas 2D)
- Donut chart: outer radius ~60px, ring width ~20px, drawn with 8×8 pixel blocks
- Bar chart: 8px tall bars, pixel-rounded corners, platform icon as sprite left of bar
- Both use the same cell-grid approach as the bottle overlay (`ctx.fillRect` per cell)

### Sprites (32×32 Canvas tiles)
- Each equivalent has a hand-designed 32×32 Uint8Array grid (same technique as the bottle's 16×28 grid)
- Reusable sprite renderer function: `renderSprite(ctx, grid, palette, x, y, scale)`
- Sprite files: `src/dashboard/sprites.ts` - a map of `spriteKey → { grid, palette }`

### Color palette
```
Base (extends bottle palette):
  --water-deep:    #1a3a5c    dark blue (hero bg)
  --water-mid:     #2d6a9f    medium blue
  --water-surface: #4fa8d8    light blue
  --white:         #ffffff
  --text:          #0a1628    near-black blue
  --text-muted:    #5a7a9a    muted text
  --accent:        #f4a261    warm amber (highlights)
  --accent2:       #e76f51    coral (secondary accent)

Chart colors (topic slices):
  #2d6a9f, #4fa8d8, #1a5c3a, #3a8c5c, #f4a261, #e76f51, #b5838d, #7f4f24,
  #6d597a, #4a5759, #a98467, #283618, #606c38, #bc6c25, #dda15e, #264653,
  #2a9d8f, #e9c46a, #6b705c, #9b5de5, #f15bb5, #00bbf9, #00f5d4, #fee440,
  (repeat for more than 24 categories)
```

### Layout
- Max-width: 640px, centered
- Vertical rhythm with 24px gaps between sections
- Section headers in `text-muted` uppercase, 10px
- Stats in bold `--water-surface` or `--accent`, 14px

## 7. Build Integration

Update `package.json` build script:
```
"build": "tsc && ENTRY=content vite build && ENTRY=dashboard vite build && ENTRY=background vite build && cp manifest.json dist/"
```

The dashboard build must run **after** content and **before** background. Why: content build clears `dist/` (`emptyOutDir: true`), dashboard adds `dashboard.html` + `dashboard.js`, background adds `background.js` (with `emptyOutDir: false`).

New files:
- `src/dashboard/index.html` (or inline in build config)
- `vite.config.ts`: add `dashboard` to the rollup input

Note: background's `emptyOutDir` is `false` - the background Vite config must also be set to `false` (it currently may rely on content setting it true once). Verify this ordering.

## 8. Out of Scope

- Time-period filtering (this week, this month) - no time-series data stored yet; would require a `water_deltas` store
- Per-message breakdown - only conversation-level granularity exists
- Settings UI for custom categories - category list is hardcoded for now
- Sharing/social - single-user, local-only
- Dark/light mode toggle - use dark palette always (matches extension vibe)
