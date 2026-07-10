# Spec: Water Bottle Overlay UI

## Goal

Replace the current rectangular overlay with a Canvas-rendered glass bottle that fills with water as tokens accumulate, with overflow animations and whimsical character.

## Interface Contract

The `IOverlayUI` interface (`src/shared/types.ts`) is unchanged. The bottle canvas implements:

```typescript
interface IOverlayUI {
  mount(): void;          // create DOM, start animation loop
  unmount(): void;        // remove DOM, stop loop, clean up
  update(ml: number): void;  // render water level from ml value
  setState(state: OverlayState): void;  // 'idle' | 'active' | 'minimized'
  isMounted(): boolean;
}
```

The tracker calls `update(ml)` with accumulated water — overlay knows nothing about tokens, estimators, or scrapers. Visuals can be swapped or iterated without touching any backend code.

## Dimensions

| Property | Value |
|----------|-------|
| Default canvas size | 80×120px |
| Container (canvas + label + header) | 100×160px |
| Min resize | 60×90px |
| Max resize | 120×180px |
| Minimized state | 32×32px circle with water drop icon |

## Rendering Layers (Canvas, paint order)

1. **Glass body** — bezier-curved bottle outline: narrow neck (~20px), wider body (~60px), flat bottom. Rounded base corners. Light gray stroke with 15% opacity white highlight reflection on left side.
2. **Water fill** — from bottom upward. Dark-to-light cyan gradient. Height set from `ml / 1000 * bottleHeight` clamped to rim.
3. **Water surface** — sine-wave wobble animated via `requestAnimationFrame`. Gentle amplitude, period ~2s.
4. **Overflow dome** — when `ml > 1000`, a convex dome bulges from bottle opening. Dome radius and height scale with excess ml (approximately 0→40px at 5000ml). Surface wobble extends across dome.
5. **Spilling drops** — when overflowing, 1-3 particles detach from dome/rim at random intervals (~every 2-3s). Each falls in a slight arc, spawns a small splash on the puddle below.
6. **Bottom puddle** — elliptical shape at bottle base. Size grows proportional to total overflow. Ripple rings animate on new drop impacts and fade over 1s.
7. **Bubbles** — 2-3 bubbles rise from bottle interior when water level increases. Random horizontal position, float up 30-40px, fade out over 1.5s. Triggered on `update()` when ml increases.
8. **Glass rim** — subtle white border at bottle opening for depth.

## States

| State | Behavior |
|-------|----------|
| `idle` | Bottle rendered empty (outline + reflection only). Counter shows "0 ml". Canvas animation loop runs but no water/fill changes. |
| `active` | Full rendering: water fill, waves, bubbles, overflow animations. Counter updates with each `update()`. |
| `minimized` | Container collapses to 32×32px circle. Shows water drop emoji + current ml. Click to restore to previous state. |

## Container Layout

```
┌─────────────────┐
│  [_] [×]  ← header (minimize/close buttons)
│                 │
│   ┌─────────┐   │
│   │         │   │
│   │  CANVAS │   │
│   │ 80×120  │   │
│   │         │   │
│   └───┬─────┘   │
│       │ ↕       │  ← resize handle (bottom-right corner)
│  💧 6.3 ml      │  ← counter label
└─────────────────┘
```

- Container: `position: fixed`, top-right, draggable via mousedown on any non-interactive area
- Header: absolute-positioned, semi-transparent hover reveal
- Resize: `mousedown` on handle, drag to resize canvas, `canvas.width/height` updated, redraw

## Counter Label

- Centered below canvas
- Format: `ml` for < 1000, `L` for >= 1000, 1 decimal place
- Water drop emoji prefix
- Subtle CSS scale pulse animation on value change

## Animation Loop

Single `requestAnimationFrame` loop drives:
- Water surface wave offset
- Bubble position/opacity updates
- Spill drop position updates
- Puddle ripple ring radius/opacity

Frame rate: 60fps. Canvas clear + full redraw each frame.

## Implementation Notes

- File: `src/content/overlay.ts` — replace `WaterOverlay` class
- Exports: `WaterBottleOverlay` implementing `IOverlayUI`
- No new dependencies
- Existing tests in `tests/content/overlay.test.ts` — update to match new DOM structure
- Mount/unmount lifecycle unchanged (create style element, append container to body, event listeners)
- Drag code preserved from existing overlay
- `MAX_WATER_ML` constant removed (no visual max — bottle shows overflow past 1000ml)
