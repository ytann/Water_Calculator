# Spec: Water Bottle Overlay UI (Pixel Art)

## Goal

Replace the current rectangular overlay with a pixel-art glass bottle rendered on Canvas, filling with water as tokens accumulate. Chunky pixel aesthetic with crisp grid-based animations — no smooth curves or gradients.

## Interface Contract

Unchanged `IOverlayUI` interface (`src/shared/types.ts`):

```typescript
interface IOverlayUI {
  mount(): void;
  unmount(): void;
  update(ml: number): void;
  setState(state: OverlayState): void;
  isMounted(): boolean;
}
```

Tracker calls `update(ml)`. Overlay knows nothing about tokens, estimators, or scrapers.

## Pixel Art Approach

- Bottle shape stored as a 2D boolean grid (e.g., 16×28 pixel cells). Cell value: `0` = empty, `1` = glass wall, `2` = water, `3` = water surface
- Each grid cell rendered as a block of `CELL_SIZE × CELL_SIZE` real canvas pixels (default 3px, giving 48×84px bottle on a 80×120px canvas)
- Rendering: loop through the grid, draw filled squares for glass and water cells
- Glass palette: `#5b8c9e` (outline), `#7bb8cc` (fill with alpha), `#c8e6f0` (highlight/reflection)
- Water palette: `#1a6b8a` (deep), `#2980b9` (mid), `#3498db` (surface), `#5dade2` (foam)

## Dimensions

| Property | Value |
|----------|-------|
| Canvas size | 80×120px default |
| Grid cell size | 3px (bottle = 16×28 usable grid area, ~48×84px) |
| Container (canvas + label + header) | 100×165px |
| Min resize | 60×90px |
| Max resize | 120×180px |
| Minimized state | 32×32px pixel circle with drop icon |

## Bottle Grid Definition

Predefined 16-wide × 28-tall sprite grid:

```
   ╔══╗          row 0-1:  rim (narrow)
   ║  ║          row 2-17: neck
  ╔╝  ╚╗         row 18-19: shoulder
  ║    ║         row 20-26: body (wide)
  ║    ║
  ╚════╝         row 27: base
```

Stored as a constant 2D array in code. Glass cells (value 1) form the outline wall. Interior cells (value 0) are fillable with water. Wall is 1 cell thick.

## Rendering Layers (per-frame paint order)

Each frame clears canvas then draws:

1. **Glass body** — iterate grid, draw `CELL_SIZE×CELL_SIZE` filled squares for all glass-wall cells. Use outline color for edge cells, lighter fill for interior glass faces.
2. **Glass highlight** — 2-3 left-side cells rendered in lighter cyan for reflection.
3. **Water fill** — for each column, water height = `(ml / 1000) * bottleInteriorHeight` clamped to rim row. Draw water-color squares from bottom up to water level. Smooth pixel row-by-row step (each row is either full or empty — blocky fill).
4. **Water surface** — top row of water has animated offset. Alternate between two surface textures (flat / slight wave) every few frames via a counter. Pixel-level: top row oscillates ±1 cell horizontally in a 4-frame cycle.
5. **Overflow dome** — when `ml > 1000`, draw additional pixel rows above the rim. Dome shape: a pyramid/arch of water cells centered on the opening, stacking upward. Extra columns narrow as the dome rises. Max 8 cell rows of dome at 5L.
6. **Spilling drops** — 1-3 pixel clusters (2×2 or 3×3 cyan blocks) that detach from the dome edge at random intervals. They follow a pixel-perfect vertical drop path (1 cell/frame), with slight horizontal drift. On reaching the puddle row, they vanish and trigger a splash.
7. **Splash effect** — on drop impact, 2-3 pixel particles scatter upward (1-3 cells) and fade over 6 frames.
8. **Bottom puddle** — a horizontal line of water-color pixels at the base, growing outward from center as overflow increases. Width = `min(8, overflow_ml / 500)` cells each side.
9. **Bubbles** — single-cell cyan squares that rise from water interior. 3-4 active at a time. Move up 1 cell every 2 frames, slight horizontal wobble. Triggered on `update()` when ml increases. Use lighter water color.

## Pixel Art Palette

| Element | Color | Usage |
|---------|-------|-------|
| Glass outline | `#4a7c8c` | Wall edge cells |
| Glass fill | `#6da5b8` (70% alpha) | Wall interior |
| Glass highlight | `#a8d5e2` | Left reflection stripe |
| Water deep | `#1a5276` | Bottom of water column |
| Water mid | `#2471a3` | Mid water |
| Water surface | `#3498db` | Top 2 rows of water |
| Water foam | `#85c1e9` | Dome surface, splashes |
| Puddle | `#2471a3` (60% alpha) | Base puddle |
| Background | transparent | Canvas background |

## States

| State | Behavior |
|-------|----------|
| `idle` | Bottle rendered empty (glass outline + highlight). Counter shows "0 ml". Animation loop runs (wave/bubble idle animations disabled). |
| `active` | Full rendering: water fill, wave, bubbles, overflow animations. Counter updates live. |
| `minimized` | Container collapses to 32×32px. Shows small pixel bottle icon + current ml text. Click restores to previous state. |

## Container Layout

```
┌─────────────────┐
│  [_] [×]  ← header (hover-reveal, 20px tall)
│                 │
│   ██████████    │
│   █  CANVAS █   │  ← 80×120px canvas (pixel art bottle centered)
│   █ 80×120  █   │
│   ██████████    │
│                 │
│        ↕        │  ← resize handle (bottom-right corner)
│   💧 6.3 ml     │  ← counter label
└─────────────────┘
```

- Container: `position: fixed`, top-right, draggable
- Header buttons: absolute top-right, semi-transparent, show on hover
- Resize: drag handle → update `canvas.width/height` and `CELL_SIZE` (keep grid dimensions constant, scale cell size to fill canvas)
- Counter: centered below, 12px monospace font

## Counter Label

- Centered below canvas
- Format: "💧 X.X ml" or "💧 X.X L" for >= 1000ml
- Font: monospace (matches pixel aesthetic)
- CSS `transform: scale()` pulse on value change (1.0 → 1.2 → 1.0 over 200ms)

## Animation Loop

Single `requestAnimationFrame` loop:

- Frame counter increments each tick
- Water surface wave: toggles between 2 offset textures every 3 frames
- Bubbles: position updated every 2 frames (slow rise)
- Spill drops: position updated every frame (fall speed)
- Splash particles: position + fade updated every frame, removed after 6 frames
- Puddle ripples: simple toggle visibility every 4 frames

No smooth tweening — discrete frame-based pixel animation.

## Implementation Notes

- File: `src/content/overlay.ts` — replace `WaterOverlay` with `WaterBottleOverlay`
- Implements `IOverlayUI`
- No new dependencies
- `MAX_WATER_ML` constant removed
- Grid sprite stored as `Uint8Array` constant (16×28 = 448 bytes)
- `CELL_SIZE` computed as `Math.floor(Math.min(canvas.width / 16, canvas.height / 28))` to fit grid within canvas, centered. At 80×120 default: 4px cells, 64×112px bottle area.
- Mount/unmount lifecycle unchanged (style element, container, event listeners)
- Drag code preserved from existing `WaterOverlay`
- Existing tests in `tests/content/overlay.test.ts` — update DOM selectors for new structure
