# Water Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pixel-art, single-scroll narrative dashboard that opens in a new tab via double-click on the bottle overlay. Reads conversation data from IndexedDB, categorizes by topic, and displays with whimsical environmental equivalents.

**Architecture:** New `src/dashboard/` directory with HTML entry + bundled JS. Modules: categorizer, equivalents, sprites, charts, aggregator, UI. Dashboard page imports IndexedDBStore directly (extension context). Overlay gains `setOnDoubleClick()` callback, wired through orchestrator to background, which opens the tab.

**Tech Stack:** TypeScript, Vite (new `ENTRY=dashboard`), Vitest + jsdom, Canvas 2D, IndexedDB

---

## File Structure

```
src/dashboard/
  index.html          - HTML shell for the dashboard page
  index.ts            - Entry point: wires aggregator → UI
  categorizer.ts      - TopicCategorizer: title → category via keyword matching
  equivalents.ts      - EquivalentGenerator: waterMl → whimsical Equivalent[]
  sprites.ts          - 15 pixel-art sprite grids (32×32 Uint8Array) + renderSprite()
  charts.ts           - Pixel donut & bar chart Canvas 2D renderers
  aggregator.ts       - DashboardAggregator: reads store → computes DashboardPayload
  dashboard-ui.ts     - DashboardUI: builds single-scroll DOM report from payload

src/shared/
  types.ts            - + DashboardPayload, Equivalent, ITopicCategorizer, IOverlayUI.setOndblclick

src/content/
  overlay.ts          - + dblclick handler, setOnDoubleClick() method
  index.ts            - Wire overlay double-click → background OPEN_DASHBOARD

src/background/
  index.ts            - + OPEN_DASHBOARD → chrome.tabs.create dashboard tab

tests/dashboard/
  categorizer.test.ts
  equivalents.test.ts
  sprites.test.ts
  charts.test.ts
  aggregator.test.ts
  dashboard-ui.test.ts

Modified:
  vite.config.ts      - Handle ENTRY=dashboard with HTML input
  package.json        - Add dashboard to build script
  tests/content/overlay.test.ts  - + dblclick tests
```

---

### Task 1: Build System + Types (Infrastructure)

**Files:**
- Create: `src/dashboard/index.html`
- Create: `src/dashboard/index.ts` (stub)
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `src/shared/types.ts`
- Modify: `src/content/overlay.ts` (IOverlayUI interface only - add method to types)

- [ ] **Step 1: Create `src/dashboard/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Water Calculator - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a1628;
      color: #85c1e9;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.6;
      min-height: 100vh;
    }
    img { image-rendering: pixelated; }
    canvas { image-rendering: pixelated; }
  </style>
</head>
<body>
  <div id="dashboard-root"></div>
  <script type="module" src="./index.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/dashboard/index.ts` (stub)**

```ts
async function main(): Promise<void> {
  const root = document.getElementById('dashboard-root');
  if (!root) return;
  root.textContent = 'Dashboard loading...';
}

main().catch(console.error);
```

- [ ] **Step 3: Modify `vite.config.ts`**

Change the entire file to:

```ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

const entry = process.env.ENTRY || 'content';
const isDashboard = entry === 'dashboard';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: entry === 'content',
    rollupOptions: isDashboard
      ? {
          input: {
            dashboard: resolve(__dirname, 'src/dashboard/index.html'),
          },
        }
      : {
          input: resolve(__dirname, `src/${entry}/index.ts`),
          output: {
            entryFileNames: `${entry}.js`,
          },
        },
  },
});
```

- [ ] **Step 4: Modify `package.json` build script**

Change the `build` script from:
```
"build": "tsc && ENTRY=content vite build && ENTRY=background vite build && cp manifest.json dist/"
```
to:
```
"build": "tsc && ENTRY=content vite build && ENTRY=dashboard vite build && ENTRY=background vite build && cp manifest.json dist/"
```

Build order: content (clears dist) → dashboard (adds HTML + JS) → background (adds background.js)

- [ ] **Step 5: Add dashboard types to `src/shared/types.ts`**

Append after line 84 (after `IConversationStore`):

```ts
export interface DashboardPayload {
  totals: {
    waterMl: number;
    tokens: number;
    conversations: number;
    firstDate: string;
  };
  byPlatform: PlatformBreakdown[];
  byTopic: TopicBreakdown[];
  equivalents: Equivalent[];
  topConversations: ConversationRecord[];
}

export interface PlatformBreakdown {
  platform: string;
  waterMl: number;
  tokens: number;
  count: number;
}

export interface TopicBreakdown {
  topic: string;
  waterMl: number;
  tokens: number;
  count: number;
}

export interface Equivalent {
  label: string;
  value: number;
  spriteKey: string;
  unit: string;
}

export interface ITopicCategorizer {
  categorize(title: string): string;
}
```

- [ ] **Step 6: Add `setOnDoubleClick` to `IOverlayUI` in `src/shared/types.ts`**

Change the `IOverlayUI` interface (lines 56-62) from:
```ts
export interface IOverlayUI {
  mount(): void;
  unmount(): void;
  update(ml: number): void;
  setState(state: OverlayState): void;
  isMounted(): boolean;
}
```
to:
```ts
export interface IOverlayUI {
  mount(): void;
  unmount(): void;
  update(ml: number): void;
  setState(state: OverlayState): void;
  isMounted(): boolean;
  setOnDoubleClick(callback: (() => void) | null): void;
}
```

- [ ] **Step 7: Add `setOnDoubleClick` implementation to `WaterBottleOverlay`**

Insert this method into the `WaterBottleOverlay` class in `src/content/overlay.ts` (after `isMounted()`, around line 577):

```ts
private onDoubleClickCallback: (() => void) | null = null;

setOnDoubleClick(callback: (() => void) | null): void {
  this.onDoubleClickCallback = callback;
}
```

And in `mount()`, after the resize handle mousedown listener (around line 252), add:

```ts
this.el.addEventListener('dblclick', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('.wc-header') || target.closest('.wc-resize')) return;
  e.preventDefault();
  e.stopPropagation();
  if (this.onDoubleClickCallback) {
    this.onDoubleClickCallback();
  }
});
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: dist/ contains `content.js`, `dashboard.html`, `background.js`, `manifest.json`, and `assets/` directory with dashboard bundle.

- [ ] **Step 9: Commit**

```bash
git add src/dashboard/index.html src/dashboard/index.ts vite.config.ts package.json src/shared/types.ts src/content/overlay.ts
git commit -m "feat: add dashboard build target and types infrastructure"
```

---

### Task 2: Topic Categorizer (TDD)

**Files:**
- Create: `tests/dashboard/categorizer.test.ts`
- Create: `src/dashboard/categorizer.ts`

- [ ] **Step 1: Create test file `tests/dashboard/categorizer.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { TopicCategorizer } from '../../src/dashboard/categorizer';

describe('TopicCategorizer', () => {
  const categorizer = new TopicCategorizer();

  it('categorizes a frontend title', () => {
    expect(categorizer.categorize('Fixing React component re-renders')).toBe('Frontend');
  });

  it('categorizes a backend title', () => {
    expect(categorizer.categorize('Building a REST API with Express and PostgreSQL')).toBe('Backend');
  });

  it('categorizes a devops title', () => {
    expect(categorizer.categorize('Setting up Docker and Kubernetes CI/CD pipeline')).toBe('DevOps');
  });

  it('categorizes a data title', () => {
    expect(categorizer.categorize('Analyzing CSV data with pandas and SQL')).toBe('Data & Analytics');
  });

  it('categorizes a writing title', () => {
    expect(categorizer.categorize('Proofreading and editing my blog draft')).toBe('Writing & Editing');
  });

  it('categorizes a cooking title', () => {
    expect(categorizer.categorize('Best pasta recipe with homemade sauce')).toBe('Cooking & Food');
  });

  it('categorizes a sports title', () => {
    expect(categorizer.categorize('NBA playoff predictions and player stats')).toBe('Sports');
  });

  it('categorizes a movies title', () => {
    expect(categorizer.categorize('Reviewing the latest Netflix documentary series')).toBe('Movies & TV');
  });

  it('returns Uncategorized for empty title', () => {
    expect(categorizer.categorize('')).toBe('Uncategorized');
  });

  it('returns Uncategorized for title with no keyword matches', () => {
    expect(categorizer.categorize('just thinking about random stuff today')).toBe('Uncategorized');
  });

  it('handles title with mixed case and punctuation', () => {
    expect(categorizer.categorize('React vs Vue: Which is better???')).toBe('Frontend');
  });

  it('handles title with camelCase keywords', () => {
    expect(categorizer.categorize('nextjs: ServerSideRendering with prisma')).toBe('Frontend');
  });

  it('handles stemmed words (learning → learn)', () => {
    expect(categorizer.categorize('Learning advanced Python programming')).toBe('Backend');
  });

  it('picks first category on tie', () => {
    // "react" matches Frontend, "python" matches Backend - both 1 match
    expect(categorizer.categorize('Using React with Python backend')).toBe('Frontend');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dashboard/categorizer.test.ts`
Expected: all FAIL with "TopicCategorizer is not a constructor"

- [ ] **Step 3: Create `src/dashboard/categorizer.ts`**

```ts
import type { ITopicCategorizer } from '../shared/types';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'to', 'for', 'with', 'and', 'of', 'in', 'on',
  'it', 'you', 'me', 'my', 'we', 'how', 'what', 'why', 'can', 'do', 'does',
  'will', 'here', 'this', 'that', 'are', 'be', 'was', 'not', 'or', 'but',
  'from', 'at', 'by', 'as', 'your', 'i', 'its', 'has',
]);

interface CategoryDef {
  name: string;
  keywords: string[];
}

const CATEGORIES: CategoryDef[] = [
  { name: 'Frontend', keywords: ['react', 'vue', 'angular', 'svelte', 'css', 'html', 'component', 'ui', 'dom', 'layout', 'style', 'tailwind', 'scss', 'less', 'webpack', 'vite', 'nextjs', 'gatsby', 'htmx', 'jquery', 'bootstrap', 'responsive', 'frontend', 'javascript', 'typescript', 'jsx', 'tsx', 'preact', 'nuxt', 'sass'] },
  { name: 'Backend', keywords: ['api', 'server', 'database', 'sql', 'endpoint', 'rest', 'graphql', 'auth', 'node', 'express', 'django', 'flask', 'fastapi', 'rails', 'laravel', 'spring', 'golang', 'rust', 'prisma', 'orm', 'middleware', 'microservice', 'postgresql', 'mongo', 'redis', 'backend', 'python', 'java', 'csharp', 'dotnet', 'php'] },
  { name: 'DevOps', keywords: ['ci', 'cd', 'pipeline', 'deploy', 'kubernetes', 'k8s', 'docker', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'nginx', 'apache', 'monitoring', 'logging', 'alert', 'scaling', 'devops', 'jenkins', 'github', 'action'] },
  { name: 'Data & Analytics', keywords: ['pandas', 'sql', 'query', 'analyze', 'data', 'csv', 'json', 'excel', 'tableau', 'visualization', 'etl', 'spark', 'hadoop', 'statistics', 'regex', 'schema', 'analysis', 'analytics'] },
  { name: 'AI / Machine Learning', keywords: ['neural', 'ml', 'llm', 'gpt', 'transformer', 'model', 'train', 'inference', 'tensorflow', 'pytorch', 'prompt', 'embedding', 'vector', 'agent', 'rag', 'fine-tune', 'ai', 'machine', 'learning', 'deep', 'chatgpt', 'claude', 'gemini', 'openai'] },
  { name: 'Mobile Dev', keywords: ['ios', 'android', 'swift', 'kotlin', 'flutter', 'react', 'native', 'expo', 'app', 'play', 'store', 'widget', 'mobile'] },
  { name: 'Security', keywords: ['security', 'auth', 'encrypt', 'decrypt', 'hash', 'jwt', 'oauth', 'ssl', 'tls', 'xss', 'csrf', 'vulnerability', 'exploit', 'pen', 'test', 'hack'] },
  { name: 'Testing', keywords: ['test', 'unit', 'e2e', 'jest', 'vitest', 'cypress', 'playwright', 'mock', 'stub', 'coverage', 'assert', 'testing'] },
  { name: 'Game Dev', keywords: ['game', 'unity', 'unreal', 'godot', '3d', 'shader', 'physics', 'sprite', 'fps', 'rpg', 'level', 'animation', 'gamedev'] },
  { name: 'Writing & Editing', keywords: ['write', 'draft', 'essay', 'blog', 'article', 'content', 'summary', 'proofread', 'grammar', 'edit', 'rewrite', 'paraphrase', 'polish', 'tone', 'email', 'letter'] },
  { name: 'Research', keywords: ['research', 'study', 'paper', 'citation', 'academic', 'literature', 'survey', 'methodology', 'hypothesis', 'experiment', 'scientific'] },
  { name: 'Business & Strategy', keywords: ['business', 'strategy', 'roadmap', 'pitch', 'deck', 'revenue', 'kpi', 'okr', 'stakeholder', 'market', 'competitor', 'startup', 'saas', 'product', 'management'] },
  { name: 'Legal', keywords: ['legal', 'contract', 'terms', 'compliance', 'gdpr', 'privacy', 'policy', 'clause', 'liability', 'copyright', 'patent', 'law'] },
  { name: 'Finance', keywords: ['finance', 'budget', 'invest', 'stock', 'crypto', 'bitcoin', 'tax', 'account', 'invoice', 'payroll', 'forex', 'trading', 'money'] },
  { name: 'Marketing', keywords: ['marketing', 'seo', 'ad', 'campaign', 'social', 'media', 'copywrite', 'brand', 'funnel', 'conversion', 'newsletter', 'sales'] },
  { name: 'Education', keywords: ['learn', 'tutorial', 'course', 'homework', 'exam', 'study', 'explain', 'teach', 'textbook', 'lecture', 'quiz', 'curriculum', 'education', 'student', 'teacher'] },
  { name: 'Health & Fitness', keywords: ['health', 'fitness', 'workout', 'diet', 'nutrition', 'meal', 'supplement', 'running', 'gym', 'yoga', 'meditation', 'sleep', 'calorie', 'exercise'] },
  { name: 'Cooking & Food', keywords: ['cook', 'recipe', 'bake', 'ingredient', 'meal', 'dinner', 'lunch', 'dessert', 'cuisine', 'restaurant', 'food', 'pasta', 'soup', 'salad', 'bread', 'chicken', 'vegetarian', 'vegan'] },
  { name: 'Travel', keywords: ['travel', 'trip', 'flight', 'hotel', 'itinerary', 'destination', 'visa', 'passport', 'booking', 'tourism', 'backpack', 'vacation', 'airbnb'] },
  { name: 'Movies & TV', keywords: ['movie', 'film', 'series', 'episode', 'netflix', 'director', 'actor', 'cinema', 'review', 'trailer', 'anime', 'documentary', 'hbo', 'disney'] },
  { name: 'Music', keywords: ['music', 'song', 'album', 'guitar', 'piano', 'chord', 'melody', 'beat', 'genre', 'artist', 'band', 'lyric', 'playlist', 'spotify'] },
  { name: 'Sports', keywords: ['sport', 'football', 'soccer', 'basketball', 'nba', 'nfl', 'premier', 'league', 'tournament', 'match', 'player', 'coach', 'cricket', 'tennis', 'baseball', 'hockey'] },
  { name: 'Pets & Animals', keywords: ['pet', 'dog', 'cat', 'bird', 'fish', 'breed', 'vet', 'animal', 'wildlife', 'horse', 'aquarium', 'puppy', 'kitten'] },
  { name: 'Relationships & Advice', keywords: ['relationship', 'advice', 'breakup', 'date', 'friend', 'family', 'colleague', 'boss', 'conflict', 'boundary', 'therapy', 'social', 'girlfriend', 'boyfriend'] },
  { name: 'Philosophy & Reflection', keywords: ['philosophy', 'meaning', 'ethics', 'purpose', 'deep', 'reflect', 'journal', 'existential', 'stoic', 'moral', 'consciousness', 'socrates', 'nietzsche'] },
  { name: 'Hobbies & DIY', keywords: ['hobby', 'diy', 'craft', 'woodwork', 'garden', 'paint', 'draw', 'knit', 'sew', 'lego', 'build', 'repair', 'arduino', 'carpentry', 'pottery'] },
];

function stem(word: string): string {
  for (const suffix of ['ing', 'ed', 's', 'ly', 'tion', 'ment', 'er', 'est', 'ness']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

export class TopicCategorizer implements ITopicCategorizer {
  categorize(title: string): string {
    if (!title || !title.trim()) return 'Uncategorized';

    const words = title
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !STOPWORDS.has(w))
      .map(stem);

    let bestCategory = 'Uncategorized';
    let bestScore = 0;

    for (const category of CATEGORIES) {
      const score = category.keywords.reduce((sum, kw) => {
        return sum + (words.some(w => w.includes(kw) || kw.includes(w)) ? 1 : 0);
      }, 0);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category.name;
      }
    }

    return bestCategory;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/dashboard/categorizer.test.ts`
Expected: all 14 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/dashboard/categorizer.test.ts src/dashboard/categorizer.ts
git commit -m "feat: add topic categorizer with 27 categories"
```

---

### Task 3: Equivalent Generator (TDD)

**Files:**
- Create: `tests/dashboard/equivalents.test.ts`
- Create: `src/dashboard/equivalents.ts`

- [ ] **Step 1: Create test file `tests/dashboard/equivalents.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { EquivalentGenerator } from '../../src/dashboard/equivalents';

describe('EquivalentGenerator', () => {
  const gen = new EquivalentGenerator();

  it('generates equivalents for moderate water volume', () => {
    const result = gen.generate(10000);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(6);
    for (const eq of result) {
      expect(eq.value).toBeGreaterThanOrEqual(0.01);
      expect(eq.value).toBeLessThanOrEqual(999999);
      expect(eq.spriteKey).toBeTruthy();
      expect(eq.unit).toBeTruthy();
    }
  });

  it('returns empty for zero water', () => {
    const result = gen.generate(0);
    expect(result).toHaveLength(0);
  });

  it('returns empty for tiny water volume', () => {
    const result = gen.generate(0.001);
    expect(result).toHaveLength(0);
  });

  it('returns all equivalents sorted by value descending', () => {
    const result = gen.generate(10000 * 1000); // 10L = 10000ml... wait, 10000*1000 = 10,000,000ml
    expect(result.length).toBeGreaterThan(0);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].value).toBeLessThanOrEqual(result[i - 1].value);
    }
  });

  it('includes water bottles numerator at 1000ml', () => {
    const result = gen.generate(1000);
    const bottles = result.find(e => e.spriteKey === 'bottle');
    expect(bottles).toBeTruthy();
    expect(bottles!.value).toBeCloseTo(2, 1); // 1000/500 = 2
  });

  it('includes tea cups numerator at 500ml', () => {
    const result = gen.generate(500);
    const cups = result.find(e => e.spriteKey === 'tea-cup');
    expect(cups).toBeTruthy();
    expect(cups!.value).toBeCloseTo(2, 1); // 500/250 = 2
  });

  it('includes showers numerator at 120000ml', () => {
    const result = gen.generate(120000);
    const showers = result.find(e => e.spriteKey === 'shower');
    expect(showers).toBeTruthy();
    expect(showers!.value).toBeCloseTo(2, 1); // 120000/60000 = 2
  });

  it('caps at 6 equivalents even when many qualify', () => {
    // 10 billion ml should trigger many equivalents
    const result = gen.generate(10_000_000_000);
    expect(result.length).toBeLessThanOrEqual(6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dashboard/equivalents.test.ts`
Expected: all FAIL

- [ ] **Step 3: Create `src/dashboard/equivalents.ts`**

```ts
import type { Equivalent } from '../shared/types';

interface EquivalentDef {
  spriteKey: string;
  label: string;
  divisor: number;
  unit: string;
}

const DEFINITIONS: EquivalentDef[] = [
  { spriteKey: 'bottle', label: 'Water bottles', divisor: 500, unit: 'bottles' },
  { spriteKey: 'cactus', label: 'Cactus rations', divisor: 3300, unit: 'months' },
  { spriteKey: 'ice-bag', label: 'Bags of ice', divisor: 4500, unit: 'bags' },
  { spriteKey: 'tea-cup', label: 'Cups of tea', divisor: 250, unit: 'cups' },
  { spriteKey: 'shower', label: 'Showers', divisor: 60000, unit: 'showers' },
  { spriteKey: 'rain', label: 'Minutes of rainfall', divisor: 500, unit: 'minutes' },
  { spriteKey: 'bathtub', label: 'Bathtubs', divisor: 150000, unit: 'bathtubs' },
  { spriteKey: 'tears', label: 'Titanic rewatches (in tears)', divisor: 50, unit: 'rewatches' },
  { spriteKey: 'plant', label: 'Houseplant waterings', divisor: 200, unit: 'waterings' },
  { spriteKey: 'ramen', label: 'Ramen bowls cooked', divisor: 500, unit: 'bowls' },
  { spriteKey: 'cloud', label: 'Mass of cloud', divisor: 1, unit: 'grams' },
  { spriteKey: 'whale', label: 'Blue whales (by volume)', divisor: 190_000_000, unit: 'whales' },
  { spriteKey: 'pool', label: 'Olympic swimming pools', divisor: 2_500_000_000, unit: 'pools' },
  { spriteKey: 'lake', label: 'Micro-lakes', divisor: 10_000_000, unit: 'lakes' },
  { spriteKey: 'syrup', label: 'Pancakes worth of syrup', divisor: 30, unit: 'pancakes' },
];

export class EquivalentGenerator {
  generate(waterMl: number): Equivalent[] {
    if (waterMl <= 0) return [];

    const qualified: Equivalent[] = [];

    for (const def of DEFINITIONS) {
      const value = waterMl / def.divisor;
      if (value >= 0.01 && value <= 999_999) {
        qualified.push({
          label: def.label,
          value: Math.round(value * 100) / 100,
          spriteKey: def.spriteKey,
          unit: def.unit,
        });
      }
    }

    qualified.sort((a, b) => b.value - a.value);
    return qualified.slice(0, 6);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/dashboard/equivalents.test.ts`
Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/dashboard/equivalents.test.ts src/dashboard/equivalents.ts
git commit -m "feat: add whimsical equivalent generator"
```

---

### Task 4: Sprite Library (TDD)

**Files:**
- Create: `tests/dashboard/sprites.test.ts`
- Create: `src/dashboard/sprites.ts`

- [ ] **Step 1: Create test file `tests/dashboard/sprites.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { SPRITES, renderSprite, type SpriteDef } from '../../src/dashboard/sprites';

describe('SPRITES', () => {
  const spriteKeys = [
    'bottle', 'cactus', 'ice-bag', 'tea-cup', 'shower',
    'rain', 'bathtub', 'tears', 'plant', 'ramen',
    'cloud', 'whale', 'pool', 'lake', 'syrup',
  ];

  it('has all 15 sprite keys', () => {
    for (const key of spriteKeys) {
      expect(SPRITES[key]).toBeDefined();
    }
  });

  it('each sprite has a 32x32 grid', () => {
    for (const key of spriteKeys) {
      const sprite: SpriteDef = SPRITES[key];
      expect(sprite.grid.length).toBe(32 * 32);
      expect(sprite.width).toBe(32);
      expect(sprite.height).toBe(32);
    }
  });

  it('each sprite has a palette with at least one color', () => {
    for (const key of spriteKeys) {
      const sprite: SpriteDef = SPRITES[key];
      expect(sprite.palette.length).toBeGreaterThan(0);
    }
  });

  it('grid values reference valid palette indices', () => {
    for (const key of spriteKeys) {
      const sprite: SpriteDef = SPRITES[key];
      for (let i = 0; i < sprite.grid.length; i++) {
        expect(sprite.grid[i]).toBeGreaterThanOrEqual(0);
        expect(sprite.grid[i]).toBeLessThan(sprite.palette.length);
      }
    }
  });
});

describe('renderSprite', () => {
  function mockCtx() {
    const calls: Array<{ x: number; y: number; w: number; h: number; color: string }> = [];
    return {
      ctx: {
        fillStyle: '',
        fillRect(x: number, y: number, w: number, h: number) { calls.push({ x, y, w, h, color: this.fillStyle }); },
      } as unknown as CanvasRenderingContext2D,
      calls,
    };
  }

  it('calls fillRect for each non-zero grid cell', () => {
    const { ctx, calls } = mockCtx();
    const sprite = SPRITES['bottle'];
    const scale = 1;
    renderSprite(ctx, sprite, 0, 0, scale);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('scales cell sizes correctly', () => {
    const { ctx, calls } = mockCtx();
    const sprite = SPRITES['bottle'];
    const scale = 2;
    renderSprite(ctx, sprite, 10, 20, scale);
    for (const call of calls) {
      expect(call.w).toBeGreaterThanOrEqual(2);
      expect(call.h).toBeGreaterThanOrEqual(2);
    }
  });

  it('offsets sprite by x, y', () => {
    const { ctx, calls } = mockCtx();
    const sprite = SPRITES['bottle'];
    const scale = 1;
    renderSprite(ctx, sprite, 50, 60, scale);
    let minX = Infinity;
    let minY = Infinity;
    for (const call of calls) {
      minX = Math.min(minX, call.x);
      minY = Math.min(minY, call.y);
    }
    expect(minX).toBeGreaterThanOrEqual(50);
    expect(minY).toBeGreaterThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dashboard/sprites.test.ts`
Expected: all FAIL

- [ ] **Step 3: Create `src/dashboard/sprites.ts`**

```ts
export interface SpriteDef {
  grid: Uint8Array;
  palette: string[];
  width: number;
  height: number;
}

const W = 32;
const H = 32;

function makeSprite(palette: string[], fillGrid: (g: Uint8Array) => void): SpriteDef {
  const grid = new Uint8Array(W * H);
  fillGrid(grid);
  return { grid, palette, width: W, height: H };
}

function rect(g: Uint8Array, x: number, y: number, w: number, h: number, color: number) {
  for (let r = y; r < y + h && r < H; r++) {
    for (let c = x; c < x + w && c < W; c++) {
      g[r * W + c] = color;
    }
  }
}

function circ(g: Uint8Array, cx: number, cy: number, r: number, color: number) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= r) {
        g[y * W + x] = color;
      }
    }
  }
}

// Water bottle - small version of the overlay bottle, blue/cyan
const BOTTLE_PALETTE = ['#00000000', '#3a6b8c', '#5b9ec4', '#2d5a7a', '#8ec8e8'];

// 🌵 Cactus - green potted cactus
const CACTUS_PALETTE = ['#00000000', '#2d5a1e', '#4a8c2a', '#8b5e3c', '#c49a6c', '#1e3a14'];

// 🧊 Ice bag - blue translucent bag
const ICE_PALETTE = ['#00000000', '#87ceeb', '#b0e0e6', '#4682b4', '#e0f0ff'];

// 🍵 Tea cup - warm brown mug with steam
const TEA_PALETTE = ['#00000000', '#8b5e3c', '#c49a6c', '#e8d5b7', '#ffffff', '#d4a574'];

// 🚿 Shower head - silver with water drops
const SHOWER_PALETTE = ['#00000000', '#87ceeb', '#4682b4', '#c0c0c0', '#a0a0a0'];

// 🌧️ Rain cloud - gray cloud with rain
const RAIN_PALETTE = ['#00000000', '#808080', '#a0a0a0', '#c0c0c0', '#87ceeb', '#4a8cff'];

// 🛁 Bathtub - white porcelain tub
const TUB_PALETTE = ['#00000000', '#ffffff', '#e0e0e0', '#c0c0c0', '#87ceeb'];

// 😢 Tears - sad face with teardrop
const TEARS_PALETTE = ['#00000000', '#ffd700', '#87ceeb', '#4682b4', '#000000'];

// 🪴 Houseplant - small leafy plant in pot
const PLANT_PALETTE = ['#00000000', '#2d5a1e', '#4a8c2a', '#6aad3a', '#8b5e3c'];

// 🍜 Ramen - steaming bowl
const RAMEN_PALETTE = ['#00000000', '#ffffff', '#ffd700', '#e8d5b7', '#8b5e3c', '#ff6347'];

// ☁️ Cloud mass - fluffy cloud
const CLOUD_PALETTE = ['#00000000', '#ffffff', '#e8e8e8', '#d0d0d0', '#c8e0f0'];

// 🐋 Blue whale
const WHALE_PALETTE = ['#00000000', '#4682b4', '#5b9ec4', '#2d5a7a', '#87ceeb', '#ffffff'];

// 🏊 Pool - blue rectangle with lane lines
const POOL_PALETTE = ['#00000000', '#1e90ff', '#4169e1', '#ffffff', '#87ceeb'];

// 🏞️ Micro-lake - blue irregular shape with trees
const LAKE_PALETTE = ['#00000000', '#1e90ff', '#4169e1', '#2d5a1e', '#4a8c2a'];

// 🥞 Syrup - amber bottle with drip
const SYRUP_PALETTE = ['#00000000', '#d2691e', '#8b4513', '#cd853f', '#f4a460'];

export const SPRITES: Record<string, SpriteDef> = {
  'bottle': makeSprite(BOTTLE_PALETTE, (g) => {
    rect(g, 13, 2, 6, 3, 1);  // cap
    rect(g, 12, 5, 8, 2, 1);  // neck ring
    rect(g, 13, 7, 6, 2, 2);  // neck
    rect(g, 9, 9, 2, 18, 1);  // left wall
    rect(g, 21, 9, 2, 18, 1); // right wall
    rect(g, 8, 10, 4, 15, 3); // left highlight
    rect(g, 20, 10, 4, 15, 2); // right shade
    rect(g, 10, 25, 12, 2, 1); // base
    rect(g, 12, 18, 8, 1, 4); // ridge 1
    rect(g, 12, 21, 8, 1, 4); // ridge 2
    circ(g, 16, 16, 4, 2);    // water fill indicator (small)
  }),

  'cactus': makeSprite(CACTUS_PALETTE, (g) => {
    rect(g, 12, 22, 8, 10, 3); // pot
    rect(g, 10, 20, 12, 3, 3); // pot rim
    rect(g, 14, 8, 4, 14, 1);  // main stem
    rect(g, 9, 10, 5, 3, 2);   // left arm
    rect(g, 18, 12, 5, 3, 2);  // right arm
    rect(g, 15, 6, 3, 3, 5);   // flower
  }),

  'ice-bag': makeSprite(ICE_PALETTE, (g) => {
    rect(g, 10, 6, 12, 18, 2);  // bag body
    rect(g, 8, 4, 16, 4, 1);    // top cinch
    rect(g, 12, 10, 4, 6, 1);   // ice cube 1
    rect(g, 17, 14, 4, 4, 1);   // ice cube 2
    rect(g, 10, 17, 3, 5, 1);   // ice cube 3
    rect(g, 12, 11, 1, 4, 3);   // cube highlight
    rect(g, 18, 15, 1, 2, 3);   // cube highlight
    for (let i = 0; i < 6; i++) rect(g, 10 + i * 2, 3, 1, 2, 4); // tie detail
  }),

  'tea-cup': makeSprite(TEA_PALETTE, (g) => {
    rect(g, 9, 12, 14, 14, 1);  // cup body
    rect(g, 7, 10, 18, 4, 1);   // cup rim
    rect(g, 23, 15, 5, 3, 1);   // handle right
    rect(g, 11, 14, 10, 8, 4);  // tea liquid
    rect(g, 13, 4, 1, 8, 5);    // steam 1
    rect(g, 16, 6, 1, 6, 5);    // steam 2
    rect(g, 19, 3, 1, 5, 5);    // steam 3
    rect(g, 10, 11, 12, 1, 2);  // rim highlight
  }),

  'shower': makeSprite(SHOWER_PALETTE, (g) => {
    rect(g, 8, 3, 16, 4, 3);    // shower head
    rect(g, 14, 7, 4, 4, 4);    // connector
    rect(g, 15, 11, 2, 12, 4);  // pipe
    rect(g, 8, 5, 2, 3, 4);     // detail
    rect(g, 22, 5, 2, 3, 4);    // detail
    // Water drops
    for (let i = 0; i < 5; i++) {
      rect(g, 6 + i * 5, 10 + (i % 3) * 4, 2, 3, 1);
    }
  }),

  'rain': makeSprite(RAIN_PALETTE, (g) => {
    // Cloud body
    for (let y = 3; y < 14; y++) {
      for (let x = 4; x < 28; x++) {
        const dx = (x - 16) / 12;
        const dy = (y - 8) / 6;
        if (dx * dx + dy * dy < 0.9) g[y * W + x] = 1;
      }
    }
    rect(g, 6, 5, 20, 8, 2); // highlight
    // Rain drops
    for (let i = 0; i < 6; i++) {
      const rx = 6 + i * 4;
      rect(g, rx, 16 + (i % 2) * 4, 2, 5, 4);
      rect(g, rx + 4, 18 + (i % 2) * 4, 2, 3, 4);
    }
  }),

  'bathtub': makeSprite(TUB_PALETTE, (g) => {
    rect(g, 4, 14, 24, 10, 1);  // tub body
    rect(g, 2, 12, 28, 4, 1);   // tub rim
    rect(g, 6, 15, 20, 2, 4);   // water surface
    rect(g, 3, 13, 26, 1, 2);   // rim highlight
    rect(g, 28, 14, 3, 3, 3);   // faucet right
    rect(g, 27, 8, 4, 6, 3);    // faucet neck
    rect(g, 10, 22, 4, 2, 3);   // foot left
    rect(g, 20, 22, 4, 2, 3);   // foot right
  }),

  'tears': makeSprite(TEARS_PALETTE, (g) => {
    circ(g, 16, 12, 9, 1);       // face
    rect(g, 11, 10, 3, 3, 4);    // left eye
    rect(g, 18, 10, 3, 3, 4);    // right eye
    rect(g, 14, 16, 4, 2, 4);    // mouth (frown)
    rect(g, 9, 18, 3, 7, 2);     // teardrop left
    rect(g, 20, 18, 3, 7, 2);    // teardrop right
    rect(g, 10, 23, 2, 3, 3);    // tear highlight left
    rect(g, 21, 23, 2, 3, 3);    // tear highlight right
  }),

  'plant': makeSprite(PLANT_PALETTE, (g) => {
    rect(g, 13, 20, 6, 12, 4);   // pot
    rect(g, 11, 18, 10, 3, 4);   // pot rim
    rect(g, 14, 8, 4, 12, 1);    // stem
    // Leaves
    rect(g, 9, 10, 5, 4, 2);     // leaf left top
    rect(g, 18, 12, 5, 4, 3);    // leaf right top
    rect(g, 8, 15, 4, 3, 2);     // leaf left bottom
    rect(g, 20, 14, 4, 3, 3);    // leaf right bottom
    rect(g, 15, 6, 3, 3, 2);     // top leaf
  }),

  'ramen': makeSprite(RAMEN_PALETTE, (g) => {
    rect(g, 6, 10, 20, 16, 4);   // bowl body
    rect(g, 4, 8, 24, 4, 1);     // bowl rim
    rect(g, 8, 12, 16, 4, 5);    // broth
    rect(g, 10, 10, 3, 3, 2);    // egg
    rect(g, 17, 11, 6, 2, 3);    // noodle
    rect(g, 14, 14, 2, 5, 6);    // naruto
    rect(g, 12, 2, 1, 7, 1);     // steam 1
    rect(g, 16, 3, 1, 6, 1);     // steam 2
    rect(g, 20, 1, 1, 5, 1);     // steam 3
    rect(g, 5, 9, 22, 1, 2);     // rim highlight
  }),

  'cloud': makeSprite(CLOUD_PALETTE, (g) => {
    for (let y = 4; y < 22; y++) {
      for (let x = 2; x < 30; x++) {
        const dx = (x - 16) / 14;
        const dy = (y - 14) / 10;
        if (dx * dx + dy * dy < 0.85) g[y * W + x] = 1;
      }
    }
    // Subtle edge bumps
    rect(g, 6, 5, 8, 4, 2);
    rect(g, 18, 6, 10, 3, 2);
    rect(g, 10, 18, 12, 4, 3);
  }),

  'whale': makeSprite(WHALE_PALETTE, (g) => {
    rect(g, 6, 12, 20, 10, 1);   // body
    rect(g, 4, 14, 4, 6, 1);     // head left
    rect(g, 22, 10, 8, 8, 1);    // tail right
    rect(g, 28, 8, 3, 4, 1);     // tail fluke top
    rect(g, 28, 16, 3, 4, 1);    // tail fluke bottom
    rect(g, 8, 11, 10, 3, 4);    // belly highlight
    rect(g, 12, 13, 3, 3, 5);    // eye
    rect(g, 6, 18, 3, 1, 6);     // mouth line
    // Water spout
    rect(g, 5, 6, 1, 6, 5);
    rect(g, 8, 8, 1, 4, 5);
  }),

  'pool': makeSprite(POOL_PALETTE, (g) => {
    rect(g, 4, 8, 24, 16, 1);    // pool body
    rect(g, 3, 7, 26, 2, 2);     // top edge
    rect(g, 3, 23, 26, 2, 2);    // bottom edge
    // Lane lines
    for (let i = 0; i < 5; i++) {
      rect(g, 5 + i * 5, 10, 2, 4, 3);
      rect(g, 5 + i * 5, 18, 2, 4, 3);
    }
    // Water shimmer
    rect(g, 8, 14, 16, 1, 4);
    rect(g, 6, 16, 20, 1, 4);
  }),

  'lake': makeSprite(LAKE_PALETTE, (g) => {
    // Lake shape (irregular blue blob)
    for (let y = 10; y < 26; y++) {
      for (let x = 4; x < 28; x++) {
        const dx = (x - 16) / 12;
        const dy = (y - 18) / 8;
        if (dx * dx * 1.5 + dy * dy < 0.9) g[y * W + x] = 1;
      }
    }
    // Trees around edge
    rect(g, 4, 4, 5, 8, 3);
    rect(g, 24, 6, 6, 6, 3);
    rect(g, 10, 2, 12, 4, 4);
    rect(g, 5, 3, 2, 4, 4);
    rect(g, 26, 5, 2, 4, 4);
    // Water highlight
    rect(g, 12, 15, 4, 2, 2);
    rect(g, 18, 18, 3, 1, 2);
  }),

  'syrup': makeSprite(SYRUP_PALETTE, (g) => {
    rect(g, 11, 4, 10, 20, 1);   // bottle body
    rect(g, 13, 2, 6, 4, 2);     // cap
    rect(g, 12, 22, 8, 2, 3);    // base
    rect(g, 13, 10, 6, 6, 3);    // liquid fill
    rect(g, 14, 8, 4, 3, 4);     // label highlight
    // Syrup drip
    rect(g, 16, 24, 3, 4, 3);
    rect(g, 15, 27, 2, 3, 3);
  }),
};

export function renderSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteDef,
  x: number,
  y: number,
  scale: number,
): void {
  const { grid, palette, width } = sprite;
  for (let row = 0; row < sprite.height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col;
      const colorIdx = grid[idx];
      if (colorIdx === 0) continue; // transparent
      const color = palette[colorIdx];
      if (color === '#00000000') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/dashboard/sprites.test.ts`
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/dashboard/sprites.test.ts src/dashboard/sprites.ts
git commit -m "feat: add 15 pixel-art sprites and renderSprite utility"
```

---

### Task 5: Charts (TDD)

**Files:**
- Create: `tests/dashboard/charts.test.ts`
- Create: `src/dashboard/charts.ts`

- [ ] **Step 1: Create test file `tests/dashboard/charts.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderPixelDonut, renderPixelBars } from '../../src/dashboard/charts';

describe('renderPixelDonut', () => {
  function mockCtx(width = 160, height = 160) {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const ctx = {
      fillStyle: '',
      fillRect(x: number, y: number, w: number, h: number) { calls.push({ method: 'fillRect', args: [x, y, w, h] }); },
      arc() { calls.push({ method: 'arc', args: [...arguments] }); },
      beginPath() { calls.push({ method: 'beginPath', args: [] }); },
      fill() { calls.push({ method: 'fill', args: [] }); },
      canvas: { width, height },
    } as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }

  it('draws fillRect calls for pixel blocks', () => {
    const { ctx, calls } = mockCtx();
    const slices = [
      { label: 'A', value: 50, color: '#ff0000' },
      { label: 'B', value: 50, color: '#00ff00' },
    ];
    renderPixelDonut(ctx, slices, 80, 80, 60, 30, 8);
    const rects = calls.filter(c => c.method === 'fillRect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('slices total to full 360 degrees', () => {
    const { ctx, calls } = mockCtx();
    const slices = [
      { label: 'Frontend', value: 30, color: '#ff0000' },
      { label: 'Backend', value: 70, color: '#00ff00' },
    ];
    renderPixelDonut(ctx, slices, 80, 80, 60, 30, 8);
    const rects = calls.filter(c => c.method === 'fillRect');
    // At least one rect should use each color
    const redRects = rects.filter(c => String(c.args).includes('#ff0000'));
    const greenRects = rects.filter(c => String(c.args).includes('#00ff00'));
    expect(redRects.length).toBeGreaterThan(0);
    expect(greenRects.length).toBeGreaterThan(0);
  });

  it('handles empty slices', () => {
    const { ctx, calls } = mockCtx();
    renderPixelDonut(ctx, [], 80, 80, 60, 30, 8);
    const rects = calls.filter(c => c.method === 'fillRect');
    expect(rects.length).toBe(0);
  });
});

describe('renderPixelBars', () => {
  function mockCtx() {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const ctx = {
      fillStyle: '',
      fillRect(x: number, y: number, w: number, h: number) { calls.push({ method: 'fillRect', args: [x, y, w, h] }); },
      fillText(text: string, x: number, y: number) { calls.push({ method: 'fillText', args: [text, x, y] }); },
      font: '',
      textAlign: '',
      textBaseline: '',
    } as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }

  it('draws bars proportional to values', () => {
    const { ctx, calls } = mockCtx();
    const bars = [
      { label: 'ChatGPT', value: 8000, color: '#ff0000' },
      { label: 'Gemini', value: 4000, color: '#00ff00' },
    ];
    renderPixelBars(ctx, bars, 10, 10, 200, 40, 8);
    const rects = calls.filter(c => c.method === 'fillRect');
    // Expect at least 2 bars (one per item) plus pixel blocks
    expect(rects.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty bars', () => {
    const { ctx, calls } = mockCtx();
    renderPixelBars(ctx, [], 10, 10, 200, 40, 8);
    const rects = calls.filter(c => c.method === 'fillRect');
    expect(rects.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dashboard/charts.test.ts`
Expected: all FAIL

- [ ] **Step 3: Create `src/dashboard/charts.ts`**

```ts
export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

export interface BarData {
  label: string;
  value: number;
  color: string;
}

export function renderPixelDonut(
  ctx: CanvasRenderingContext2D,
  slices: ChartSlice[],
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  blockSize: number = 8,
): void {
  if (slices.length === 0) return;

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return;

  const gridSize = Math.ceil((outerRadius * 2) / blockSize);
  const startX = centerX - outerRadius;
  const startY = centerY - outerRadius;

  let cumulativeAngle = -Math.PI / 2;

  const sliceAngles = slices.map((s) => {
    const angleSpan = (s.value / total) * Math.PI * 2;
    const start = cumulativeAngle;
    cumulativeAngle += angleSpan;
    return { ...s, startAngle: start, endAngle: cumulativeAngle };
  });

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cx = startX + col * blockSize + blockSize / 2;
      const cy = startY + row * blockSize + blockSize / 2;
      const dist = Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2);

      if (dist > outerRadius || dist < innerRadius) continue;

      const angle = Math.atan2(cy - centerY, cx - centerX);
      const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const fromPositiveX = (normalized + Math.PI / 2) % (Math.PI * 2);

      for (const slice of sliceAngles) {
        const sa = ((slice.startAngle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const ea = ((slice.endAngle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

        let inSlice = false;
        if (sa <= ea) {
          inSlice = fromPositiveX >= sa && fromPositiveX < ea;
        } else {
          inSlice = fromPositiveX >= sa || fromPositiveX < ea;
        }

        if (inSlice) {
          ctx.fillStyle = slice.color;
          ctx.fillRect(startX + col * blockSize, startY + row * blockSize, blockSize, blockSize);
          break;
        }
      }
    }
  }
}

export function renderPixelBars(
  ctx: CanvasRenderingContext2D,
  bars: BarData[],
  x: number,
  y: number,
  maxWidth: number,
  barHeight: number,
  blockSize: number = 8,
): void {
  if (bars.length === 0) return;

  const maxVal = Math.max(...bars.map(b => b.value));
  if (maxVal === 0) return;

  const gap = barHeight + blockSize;

  bars.forEach((bar, i) => {
    const barY = y + i * gap;
    const barW = (bar.value / maxVal) * maxWidth;
    const pixelCols = Math.ceil(barW / blockSize);
    const pixelRows = Math.ceil(barHeight / blockSize);

    for (let row = 0; row < pixelRows; row++) {
      for (let col = 0; col < pixelCols; col++) {
        const bx = x + col * blockSize;
        const by = barY + row * blockSize;
        const fillW = Math.min(blockSize, barW - col * blockSize);
        if (fillW <= 0) continue;
        ctx.fillStyle = bar.color;
        ctx.fillRect(bx, by, fillW, blockSize);
      }
    }
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/dashboard/charts.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/dashboard/charts.test.ts src/dashboard/charts.ts
git commit -m "feat: add pixel-art donut and bar chart renderers"
```

---

### Task 6: Aggregator (TDD)

**Files:**
- Create: `tests/dashboard/aggregator.test.ts`
- Create: `src/dashboard/aggregator.ts`

- [ ] **Step 1: Create test file `tests/dashboard/aggregator.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { DashboardAggregator } from '../../src/dashboard/aggregator';
import { TopicCategorizer } from '../../src/dashboard/categorizer';
import { EquivalentGenerator } from '../../src/dashboard/equivalents';
import type { ConversationRecord, IConversationStore } from '../../src/shared/types';

function fakeStore(records: ConversationRecord[]): IConversationStore {
  return {
    create: async () => {},
    update: async () => {},
    findByTitle: async () => null,
    findAll: async () => records,
    delete: async () => {},
  };
}

function makeRecord(overrides: Partial<ConversationRecord> = {}): ConversationRecord {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'test-id',
    url: 'https://chatgpt.com/c/test',
    platform: 'chatgpt',
    title: 'Untitled',
    waterMl: 0,
    tokenCount: 0,
    startedAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    ...overrides,
  };
}

describe('DashboardAggregator', () => {
  const categorizer = new TopicCategorizer();
  const equivalents = new EquivalentGenerator();

  it('computes totals from records', async () => {
    const store = fakeStore([
      makeRecord({ waterMl: 100, tokenCount: 30 }),
      makeRecord({ waterMl: 200, tokenCount: 60 }),
      makeRecord({ waterMl: 50, tokenCount: 15 }),
    ]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    expect(payload.totals.waterMl).toBe(350);
    expect(payload.totals.tokens).toBe(105);
    expect(payload.totals.conversations).toBe(3);
  });

  it('returns first date from records', async () => {
    const store = fakeStore([
      makeRecord({ startedAt: '2026-07-10T00:00:00.000Z' }),
      makeRecord({ startedAt: '2026-07-05T00:00:00.000Z' }),
    ]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    expect(payload.totals.firstDate).toBe('2026-07-05T00:00:00.000Z');
  });

  it('groups by platform', async () => {
    const store = fakeStore([
      makeRecord({ platform: 'chatgpt', waterMl: 100, tokenCount: 10 }),
      makeRecord({ platform: 'gemini', waterMl: 200, tokenCount: 20 }),
      makeRecord({ platform: 'chatgpt', waterMl: 50, tokenCount: 5 }),
    ]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    const chatgpt = payload.byPlatform.find(p => p.platform === 'chatgpt');
    expect(chatgpt).toBeTruthy();
    expect(chatgpt!.waterMl).toBe(150);
    expect(chatgpt!.count).toBe(2);
  });

  it('groups by topic using categorizer', async () => {
    const store = fakeStore([
      makeRecord({ title: 'React component debugging', waterMl: 100, tokenCount: 10 }),
      makeRecord({ title: 'Building REST APIs with Express', waterMl: 200, tokenCount: 20 }),
      makeRecord({ title: 'CSS layout fixing', waterMl: 50, tokenCount: 5 }),
    ]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    const frontend = payload.byTopic.find(t => t.topic === 'Frontend');
    expect(frontend).toBeTruthy();
    expect(frontend!.waterMl).toBe(150);
    expect(frontend!.count).toBe(2);
  });

  it('includes top 5 conversations sorted by waterMl', async () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      makeRecord({ title: `Chat ${i}`, waterMl: i * 100 })
    );
    const store = fakeStore(records);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    expect(payload.topConversations.length).toBeLessThanOrEqual(5);
    if (payload.topConversations.length >= 2) {
      expect(payload.topConversations[0].waterMl).toBeGreaterThanOrEqual(payload.topConversations[1].waterMl);
    }
  });

  it('handles empty store', async () => {
    const store = fakeStore([]);
    const agg = new DashboardAggregator(store, categorizer, equivalents);
    const payload = await agg.generate();
    expect(payload.totals.conversations).toBe(0);
    expect(payload.totals.waterMl).toBe(0);
    expect(payload.byPlatform).toHaveLength(0);
    expect(payload.byTopic).toHaveLength(0);
    expect(payload.equivalents).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dashboard/aggregator.test.ts`
Expected: all FAIL

- [ ] **Step 3: Create `src/dashboard/aggregator.ts`**

```ts
import type { ConversationRecord, IConversationStore, ITopicCategorizer } from '../shared/types';
import type { DashboardPayload, PlatformBreakdown, TopicBreakdown } from '../shared/types';
import type { EquivalentGenerator } from './equivalents';

export class DashboardAggregator {
  constructor(
    private store: IConversationStore,
    private categorizer: ITopicCategorizer,
    private equivalents: EquivalentGenerator,
  ) {}

  async generate(): Promise<DashboardPayload> {
    const records = await this.store.findAll();

    const totals = {
      waterMl: 0,
      tokens: 0,
      conversations: records.length,
      firstDate: records.length > 0
        ? records.reduce((earliest, r) => r.startedAt < earliest ? r.startedAt : earliest, records[0].startedAt)
        : new Date(0).toISOString(),
    };

    for (const r of records) {
      totals.waterMl += r.waterMl;
      totals.tokens += r.tokenCount;
    }

    const platformMap = new Map<string, PlatformBreakdown>();
    for (const r of records) {
      const existing = platformMap.get(r.platform);
      if (existing) {
        existing.waterMl += r.waterMl;
        existing.tokens += r.tokenCount;
        existing.count++;
      } else {
        platformMap.set(r.platform, {
          platform: r.platform,
          waterMl: r.waterMl,
          tokens: r.tokenCount,
          count: 1,
        });
      }
    }
    const byPlatform = [...platformMap.values()].sort((a, b) => b.waterMl - a.waterMl);

    const topicMap = new Map<string, TopicBreakdown>();
    for (const r of records) {
      const topic = this.categorizer.categorize(r.title);
      const existing = topicMap.get(topic);
      if (existing) {
        existing.waterMl += r.waterMl;
        existing.tokens += r.tokenCount;
        existing.count++;
      } else {
        topicMap.set(topic, {
          topic,
          waterMl: r.waterMl,
          tokens: r.tokenCount,
          count: 1,
        });
      }
    }
    const byTopic = [...topicMap.values()].sort((a, b) => b.waterMl - a.waterMl);

    const eqs = this.equivalents.generate(totals.waterMl);

    const topConversations = [...records]
      .sort((a, b) => b.waterMl - a.waterMl)
      .slice(0, 5);

    return {
      totals,
      byPlatform,
      byTopic,
      equivalents: eqs,
      topConversations,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/dashboard/aggregator.test.ts`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/dashboard/aggregator.test.ts src/dashboard/aggregator.ts
git commit -m "feat: add dashboard aggregator"
```

---

### Task 7: Dashboard UI (TDD)

**Files:**
- Create: `tests/dashboard/dashboard-ui.test.ts`
- Create: `src/dashboard/dashboard-ui.ts`

- [ ] **Step 1: Create test file `tests/dashboard/dashboard-ui.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { DashboardUI } from '../../src/dashboard/dashboard-ui';
import type { DashboardPayload } from '../../src/shared/types';

function fakePayload(overrides: Partial<DashboardPayload> = {}): DashboardPayload {
  return {
    totals: { waterMl: 12847, tokens: 4000, conversations: 14, firstDate: '2026-07-10T00:00:00.000Z' },
    byPlatform: [
      { platform: 'chatgpt', waterMl: 8200, tokens: 2500, count: 8 },
      { platform: 'gemini', waterMl: 3400, tokens: 1100, count: 5 },
      { platform: 'claude', waterMl: 1247, tokens: 400, count: 1 },
    ],
    byTopic: [
      { topic: 'Frontend', waterMl: 4200, tokens: 1300, count: 5 },
      { topic: 'Writing & Editing', waterMl: 3100, tokens: 950, count: 3 },
      { topic: 'Data & Analytics', waterMl: 2800, tokens: 850, count: 2 },
      { topic: 'AI / Machine Learning', waterMl: 1500, tokens: 450, count: 2 },
      { topic: 'Cooking & Food', waterMl: 800, tokens: 250, count: 1 },
      { topic: 'Uncategorized', waterMl: 447, tokens: 200, count: 1 },
    ],
    equivalents: [
      { label: 'Water bottles', value: 25.69, spriteKey: 'bottle', unit: 'bottles' },
      { label: 'Cactus rations', value: 3.89, spriteKey: 'cactus', unit: 'months' },
      { label: 'Bags of ice', value: 2.85, spriteKey: 'ice-bag', unit: 'bags' },
    ],
    topConversations: [
      { id: '1', url: 'https://chatgpt.com/c/1', platform: 'chatgpt', title: 'Debugging React SSR', waterMl: 4200, tokenCount: 1300, startedAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z' },
      { id: '2', url: 'https://chatgpt.com/c/2', platform: 'gemini', title: 'Writing newsletter content', waterMl: 3100, tokenCount: 950, startedAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z' },
    ],
    ...overrides,
  };
}

describe('DashboardUI', () => {
  it('creates root element on mount', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    const root = container.querySelector('.wc-dashboard');
    expect(root).toBeTruthy();
  });

  it('displays total water in hero section', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('12.8');
  });

  it('shows conversations count in hero', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('14');
  });

  it('renders topic section with headings', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('WHERE YOUR WATER WENT');
  });

  it('renders equivalents section', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('UNDER A DIFFERENT LIGHT');
    expect(container.textContent).toContain('Water bottles');
  });

  it('renders top conversations section', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('Debugging React SSR');
  });

  it('renders footer with export button', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload());
    expect(container.textContent).toContain('Export');
  });

  it('handles empty data', () => {
    const container = document.createElement('div');
    const ui = new DashboardUI(container);
    ui.render(fakePayload({
      totals: { waterMl: 0, tokens: 0, conversations: 0, firstDate: new Date(0).toISOString() },
      byPlatform: [],
      byTopic: [],
      equivalents: [],
      topConversations: [],
    }));
    expect(container.textContent).toContain('0');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dashboard/dashboard-ui.test.ts`
Expected: all FAIL

- [ ] **Step 3: Create `src/dashboard/dashboard-ui.ts`**

```ts
import type { DashboardPayload } from '../shared/types';
import { renderPixelDonut, renderPixelBars } from './charts';
import { SPRITES, renderSprite } from './sprites';

const DASHBOARD_ID = 'wc-dashboard';

const COLORS = [
  '#2d6a9f', '#4fa8d8', '#1a5c3a', '#3a8c5c', '#f4a261', '#e76f51',
  '#b5838d', '#7f4f24', '#6d597a', '#4a5759', '#a98467', '#283618',
  '#606c38', '#bc6c25', '#dda15e', '#264653', '#2a9d8f', '#e9c46a',
  '#6b705c', '#9b5de5', '#f15bb5', '#00bbf9', '#00f5d4', '#fee440',
];

function formatVolume(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${ml.toFixed(0)} ml`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export class DashboardUI {
  private root: HTMLElement;

  constructor(private container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = DASHBOARD_ID;
    this.root.style.cssText = 'max-width:640px;margin:0 auto;padding:40px 20px;';
    this.container.appendChild(this.root);
  }

  render(data: DashboardPayload): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.renderHero(data));
    this.root.appendChild(this.renderTopics(data));
    this.root.appendChild(this.renderPlatforms(data));
    this.root.appendChild(this.renderEquivalents(data));
    this.root.appendChild(this.renderTopConversations(data));
    this.root.appendChild(this.renderFooter(data));
  }

  private renderHero(data: DashboardPayload): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'text-align:center;margin-bottom:48px;';

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.style.cssText = 'margin-bottom:16px;image-rendering:pixelated;';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const drop = SPRITES['bottle'];
      renderSprite(ctx, drop, 16, 16, 1);
    }
    el.appendChild(canvas);

    const total = document.createElement('div');
    total.style.cssText = 'font-size:28px;font-weight:bold;color:#4fa8d8;margin-bottom:4px;';
    total.textContent = `\u{1F4A7} ${formatVolume(data.totals.waterMl)}`;
    el.appendChild(total);

    const since = document.createElement('div');
    since.style.cssText = 'color:#5a7a9a;margin-bottom:2px;';
    since.textContent = `since ${formatDate(data.totals.firstDate)}`;
    el.appendChild(since);

    const count = document.createElement('div');
    count.style.cssText = 'color:#5a7a9a;margin-bottom:8px;';
    count.textContent = `${data.totals.conversations} conversations`;
    el.appendChild(count);

    if (data.totals.waterMl >= 1) {
      const lightyear = document.createElement('div');
      lightyear.style.cssText = 'color:#f4a261;font-size:10px;margin-top:4px;';
      const liters = (data.totals.waterMl / 1000).toFixed(1);
      lightyear.textContent = `${liters} liters = ${liters} light-years of H2O molecules`;
      el.appendChild(lightyear);
    }

    return el;
  }

  private renderTopics(data: DashboardPayload): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'margin-bottom:48px;';

    const heading = document.createElement('div');
    heading.style.cssText = 'color:#5a7a9a;text-transform:uppercase;font-size:10px;margin-bottom:16px;text-align:center;';
    heading.textContent = 'Where Your Water Went';
    el.appendChild(heading);

    const chartRow = document.createElement('div');
    chartRow.style.cssText = 'display:flex;gap:24px;align-items:center;flex-wrap:wrap;';

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    canvas.style.cssText = 'image-rendering:pixelated;flex-shrink:0;';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const top5 = data.byTopic.slice(0, 5);
      const other = data.byTopic.slice(5);
      const otherWater = other.reduce((s, t) => s + t.waterMl, 0);
      const slices = top5.map((t, i) => ({
        label: t.topic,
        value: t.waterMl,
        color: COLORS[i % COLORS.length],
      }));
      if (otherWater > 0) {
        slices.push({ label: 'Other', value: otherWater, color: '#4a5759' });
      }
      renderPixelDonut(ctx, slices, 80, 80, 64, 38, 8);
    }
    chartRow.appendChild(canvas);

    const legend = document.createElement('div');
    legend.style.cssText = 'flex:1;min-width:180px;';
    const topForLegend = data.byTopic.slice(0, 8);
    for (let i = 0; i < topForLegend.length; i++) {
      const t = topForLegend[i];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px;';

      const swatch = document.createElement('span');
      swatch.style.cssText = `display:inline-block;width:10px;height:10px;background:${COLORS[i % COLORS.length]};image-rendering:pixelated;`;
      row.appendChild(swatch);

      const label = document.createElement('span');
      label.style.cssText = 'color:#85c1e9;flex:1;';
      label.textContent = t.topic;
      row.appendChild(label);

      const val = document.createElement('span');
      val.style.cssText = 'color:#5a7a9a;white-space:nowrap;';
      val.textContent = formatVolume(t.waterMl);
      row.appendChild(val);

      legend.appendChild(row);
    }
    chartRow.appendChild(legend);
    el.appendChild(chartRow);

    return el;
  }

  private renderPlatforms(data: DashboardPayload): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'margin-bottom:48px;';

    const heading = document.createElement('div');
    heading.style.cssText = 'color:#5a7a9a;text-transform:uppercase;font-size:10px;margin-bottom:16px;text-align:center;';
    heading.textContent = 'Platforms';
    el.appendChild(heading);

    if (data.byPlatform.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#5a7a9a;text-align:center;';
      empty.textContent = 'No data yet';
      el.appendChild(empty);
      return el;
    }

    const maxVal = Math.max(...data.byPlatform.map(p => p.waterMl));
    const barHeight = 16;

    for (const p of data.byPlatform) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

      const label = document.createElement('div');
      label.style.cssText = 'color:#85c1e9;width:80px;text-align:right;font-size:11px;';
      label.textContent = p.platform;
      row.appendChild(label);

      const barBg = document.createElement('div');
      barBg.style.cssText = 'flex:1;height:16px;background:#0d1a2a;position:relative;image-rendering:pixelated;';

      const widthPct = (p.waterMl / maxVal) * 100;
      const barFill = document.createElement('div');
      barFill.style.cssText = `width:${widthPct}%;height:100%;background:#2d6a9f;image-rendering:pixelated;`;
      barFill.style.cssText += 'transition:width 0.5s ease;';
      barBg.appendChild(barFill);
      row.appendChild(barBg);

      const val = document.createElement('div');
      val.style.cssText = 'color:#5a7a9a;width:80px;font-size:11px;';
      val.textContent = formatVolume(p.waterMl);
      row.appendChild(val);

      el.appendChild(row);
    }

    return el;
  }

  private renderEquivalents(data: DashboardPayload): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'margin-bottom:48px;';

    const heading = document.createElement('div');
    heading.style.cssText = 'color:#5a7a9a;text-transform:uppercase;font-size:10px;margin-bottom:16px;text-align:center;';
    heading.textContent = 'Under a Different Light';
    el.appendChild(heading);

    if (data.equivalents.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#5a7a9a;text-align:center;';
      empty.textContent = 'Have a chat to see your water in a new light';
      el.appendChild(empty);
      return el;
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px;';

    for (const eq of data.equivalents) {
      const card = document.createElement('div');
      card.style.cssText = 'text-align:center;';

      const spriteCanvas = document.createElement('canvas');
      spriteCanvas.width = 32;
      spriteCanvas.height = 32;
      spriteCanvas.style.cssText = 'image-rendering:pixelated;margin-bottom:4px;';
      const ctx = spriteCanvas.getContext('2d');
      const sprite = SPRITES[eq.spriteKey];
      if (ctx && sprite) {
        renderSprite(ctx, sprite, 0, 0, 1);
      }
      card.appendChild(spriteCanvas);

      const number = document.createElement('div');
      number.style.cssText = 'font-size:16px;font-weight:bold;color:#f4a261;';
      const formatted = eq.value >= 1000
        ? eq.value.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : eq.value.toFixed(1).replace(/\.0$/, '');
      number.textContent = `\u2248 ${formatted}`;
      card.appendChild(number);

      const name = document.createElement('div');
      name.style.cssText = 'color:#85c1e9;font-size:10px;';
      name.textContent = eq.label;
      card.appendChild(name);

      grid.appendChild(card);
    }

    el.appendChild(grid);
    return el;
  }

  private renderTopConversations(data: DashboardPayload): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'margin-bottom:48px;';

    const heading = document.createElement('div');
    heading.style.cssText = 'color:#5a7a9a;text-transform:uppercase;font-size:10px;margin-bottom:16px;text-align:center;';
    heading.textContent = 'Top Conversations';
    el.appendChild(heading);

    if (data.topConversations.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#5a7a9a;text-align:center;';
      empty.textContent = 'No conversations yet';
      el.appendChild(empty);
      return el;
    }

    for (let i = 0; i < data.topConversations.length; i++) {
      const conv = data.topConversations[i];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:11px;';

      const rank = document.createElement('div');
      rank.style.cssText = 'color:#f4a261;width:20px;text-align:center;font-weight:bold;';
      rank.textContent = `#${i + 1}`;
      row.appendChild(rank);

      const title = document.createElement('div');
      title.style.cssText = 'color:#85c1e9;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      title.textContent = conv.title;
      row.appendChild(title);

      const watermark = document.createElement('div');
      watermark.style.cssText = 'color:#5a7a9a;white-space:nowrap;';
      watermark.textContent = formatVolume(conv.waterMl);
      row.appendChild(watermark);

      el.appendChild(row);
    }

    return el;
  }

  private renderFooter(_data: DashboardPayload): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'text-align:center;color:#5a7a9a;font-size:10px;padding-top:24px;border-top:1px solid #1a3a5c;';

    const cite = document.createElement('div');
    cite.style.cssText = 'margin-bottom:12px;';
    cite.textContent = '1 token = 0.003 ml water (inference only)';
    el.appendChild(cite);

    const exportBtn = document.createElement('button');
    exportBtn.style.cssText = 'background:#2d6a9f;color:#fff;border:none;padding:6px 16px;cursor:pointer;font-family:inherit;font-size:11px;image-rendering:pixelated;';
    exportBtn.textContent = 'Export as JSON';
    exportBtn.addEventListener('click', () => this.handleExport());
    el.appendChild(exportBtn);

    return el;
  }

  private async handleExport(): Promise<void> {
    try {
      const store = (await import('../shared/db')).IndexedDBStore;
      const db = new store();
      const records = await db.findAll();
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `water-calculator-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/dashboard/dashboard-ui.test.ts`
Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/dashboard/dashboard-ui.test.ts src/dashboard/dashboard-ui.ts
git commit -m "feat: add dashboard UI with hero, topics, platforms, equivalents, and top conversations"
```

---

### Task 8: Overlay Double-Click + Orchestrator Wiring + Background Handler

**Files:**
- Modify: `src/content/overlay.ts` (dblclick listener - already added in Task 1, Step 7)
- Modify: `src/content/index.ts` (wire double-click)
- Modify: `src/background/index.ts` (OPEN_DASHBOARD handler)
- Modify: `tests/content/overlay.test.ts` (+ dblclick tests)

- [ ] **Step 1: Update overlay test `tests/content/overlay.test.ts`**

Append these tests after the existing test cases (check the file first to find the right insertion point):

```ts
it('calls onDoubleClick callback on dblclick', () => {
  overlay.mount();
  let called = false;
  overlay.setOnDoubleClick(() => { called = true; });
  const el = document.getElementById('wc-overlay');
  el?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  expect(called).toBe(true);
});

it('does not throw when dblclick fires with no callback set', () => {
  overlay.mount();
  overlay.setOnDoubleClick(null);
  const el = document.getElementById('wc-overlay');
  expect(() => {
    el?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  }).not.toThrow();
});
```

- [ ] **Step 2: Run overlay tests**

Run: `npx vitest run tests/content/overlay.test.ts`
Expected: all existing tests + 2 new tests PASS

- [ ] **Step 3: Wire double-click in orchestrator `src/content/index.ts`**

After line 15 (after `this.tracker = ...`), add:

```ts
this.overlay.setOnDoubleClick(() => {
  chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
});
```

- [ ] **Step 4: Add background handler in `src/background/index.ts`**

Add a new case to the `switch` statement, before the closing `}` of the listener (after line 48):

```ts
case 'OPEN_DASHBOARD':
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  break;
```

- [ ] **Step 5: Update the dashboard entry point `src/dashboard/index.ts`**

Replace the stub with the real entry point:

```ts
import { IndexedDBStore } from '../shared/db';
import { TopicCategorizer } from './categorizer';
import { EquivalentGenerator } from './equivalents';
import { DashboardAggregator } from './aggregator';
import { DashboardUI } from './dashboard-ui';

async function main(): Promise<void> {
  const root = document.getElementById('dashboard-root');
  if (!root) return;

  const store = new IndexedDBStore();
  const categorizer = new TopicCategorizer();
  const equivalents = new EquivalentGenerator();
  const aggregator = new DashboardAggregator(store, categorizer, equivalents);

  const data = await aggregator.generate();
  const ui = new DashboardUI(root);
  ui.render(data);
}

main().catch((err) => {
  const root = document.getElementById('dashboard-root');
  if (root) {
    root.textContent = `Dashboard failed to load: ${err instanceof Error ? err.message : String(err)}`;
  }
  console.error('[wc] dashboard error:', err);
});
```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: all tests pass (existing + new dashboard tests)

- [ ] **Step 7: Commit**

```bash
git add src/content/overlay.ts src/content/index.ts src/background/index.ts src/dashboard/index.ts tests/content/overlay.test.ts
git commit -m "feat: wire overlay double-click to open dashboard tab"
```

---

### Task 9: Build + Integration Verification

**Files:**
- Verify: `dist/` contents after build

- [ ] **Step 1: Run the full build**

Run: `npm run build`
Expected: exits 0 with no errors

- [ ] **Step 2: Verify dist contents**

Run: `ls dist/`
Expected: contains `manifest.json`, `content.js`, `background.js`, `dashboard.html`, `assets/` directory with dashboard bundle

- [ ] **Step 3: Verify dashboard.html is valid**

Run: `head -5 dist/dashboard.html`
Expected: contains `<script` tag referencing the bundled JS (not `./index.ts` directly)

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests pass (approximately 58 + 48 = ~106 tests total)

- [ ] **Step 5: Run typecheck**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: finalize dashboard integration"
```
