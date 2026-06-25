# Tier A — Implementation Runbook

> Full, no-cut-corners implementation plan for **Tier A** of the
> [UI/UX Critical Review](./ui-ux-critical-review.md). Tier A = the foundational gaps the
> experience cannot be great until they exist: **A1 layout engine, A2 timeline scrubber,
> A3 HiDPI canvas, A4 empty/loading/error states, A5 label de-clutter.**

## 0. Ground rules & integrity fences (must stay green)

1. **Classic-script discipline.** Every core module is an IIFE attaching to
   `window.InfrixCinema` and also `module.exports` for node. No bundler, must work over
   `file://`. No new npm dependencies (zero-dep package).
2. **Loader manifest.** `shape.test.mjs` asserts: every file in `loader.js`'s `SCRIPTS`/
   `STYLES` exists, and **no `.js`/`.css` is an orphan**. → Any new module MUST be added to
   `loader.js` in correct dependency order. (`.mjs` test files are exempt.)
3. **Dependency order.** `visualVocabulary.js` and `renderer.js` must precede `app.js`.
   `layout.js` uses `narrativeStageForKind` → it loads **after** `narrativeTemplates.js`
   and **before** `app.js`.
4. **Vocabulary parity.** Do **not** edit `visualVocabulary.js` (Go parity test parses it).
5. **Disclosure invariant.** Layout/scrubber/states operate only on the already
   disclosure-filtered graph the renderer receives. Layout must not resurrect suppressed
   nodes or change a redacted node's fixed size/opacity. Never read stripped fields.
6. **Assurance honesty.** Scrubber ticks reflect narrative event status/assurance as-built;
   never imply a level the bundle doesn't back.
7. **Tests.** Add `*.test.mjs` unit tests for the pure logic (layout math, tick derivation,
   label placement, state machine). `npm test` must pass.

## 1. New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `layout.js` | classic script | after `narrativeTemplates.js`, before `narrativePanel.js` | A1 layout engines + animator |
| `cinemaStates.js` | classic script | after `legend.js`, before `app.js` | A4 stage overlay state machine |
| `layout.test.mjs` | node test | — | A1 unit tests |
| `cinemaStates.test.mjs` | node test | — | A4 unit tests |
| `labelLayout.test.mjs` | node test | — | A5 placement unit tests |

CSS for the transport bar, layout control, and overlay goes into the existing `styles.css`;
new tokens (motion, spacing-lite) into `cinemaTokens.css`. No new stylesheet file.

## 2. A1 — Layout engine (`layout.js`)

**Public API (on `InfrixCinema`):**
```
computeLayout(graph, engine, viewport) -> { positions: Map<id,{x,y}>, lanes?: [{stage,label,x,y0,y1}] }
   engine: 'spine' | 'force' | 'grid' | 'none'
chooseAutoEngine(graph) -> 'spine' | 'force'      // spine if >=40% nodes map to a stage
needsLayout(graph) -> bool                          // true if any renderable node lacks position
class LayoutController(renderer)
   apply(graph, engine, {animate=true, duration=420})  // sets targets, animates node.position
   stop()
```

**Engines:**
- **`spine`** — group nodes by `narrativeStageForKind(kind)`; ordered lanes by `STAGE_ORDER`
  (replicated locally to avoid coupling) + a trailing `other` lane for unstaged nodes. Lane
  `x = laneIndex * LANE_W`. Within a lane, stack nodes in a centered vertical column,
  wrapping into sub-columns when a lane exceeds `LANE_MAX_ROWS`. Emit `lanes[]` metadata
  (stage, label, x, y-extent) the renderer draws as faint bands + headers.
- **`force`** — velocity-Verlet sim, dependency-free: charge (repulsion, grid-bucketed to
  avoid full O(n²) on big graphs), spring along edges (ideal length `LINK_DIST`), mild
  centering, collision radius. Seed from existing `node.position` (jittered) when present.
  Run `ITERATIONS` ticks synchronously with alpha decay, then return final positions.
- **`grid`** — deterministic fallback (sqrt grid) used when a scene has no edges/stages.
- **`none`** — identity (respect server positions).

**Animator:** `apply` stores `node._fromPos`/`node._toPos`, runs a rAF loop lerping
`node.position` with an ease; on completion clears temp fields. Because the renderer reads
`node.position` every frame, mutation animates for free. Guard against concurrent applies
(`stop()` cancels the prior rAF). Honor `prefers-reduced-motion` → snap instead of animate.

**Renderer hook (A1 + lanes):** `renderer.js` — when `graph._lanes` present, draw faint
vertical lane bands and top headers in world space *before* edges. Add
`renderer.setLayoutLanes(lanes)` storing on the scene; clear on scene change.

**app.js wiring:**
- After resolving a scene in `onScene`, if `InfrixCinema.needsLayout(g)` **or** a user layout
  choice is set, run `layoutController.apply(g, engine)`. Default engine = saved choice or
  `chooseAutoEngine(g)`.
- Add a **layout segmented control** (Auto / Spine / Force) to the controls bar (full/nexus
  only). Selecting re-applies with animation and persists (localStorage `cinema.layout`).
- Re-apply layout (animated) when the search filter changes the visible set (gather matches).

**Acceptance:** positionless scene → clean readable graph; spine shows labeled lanes; engine
switch animates; reduced-motion snaps.

## 3. A2 — Transport bar + scrubber (`controls.js`, `app.js`, `timelineAdapter.js`)

**controls.js additions:**
- New transport row (own flex line) built when `caps.controls && (caps.live || caps.replay)`:
  - `<input type=range id=cinema-scrubber>` → `fire('seek', value)` on input.
  - A ticks overlay (`.cinema-scrubber-ticks`) positioned by percentage; each tick a
    `<span data-status>` colored via status; clicking a tick seeks to it.
  - Time readout `.cinema-time` (`seq c / t · block N`).
  - Speed segmented `.cinema-speed` (0.5/1/2/4) → `fire('setSpeed', n)`.
  - Loop toggle → `fire('toggleLoop')`; "Jump to failure" → `fire('jumpFailure')`.
- Methods: `setPosition(cur,total,block)`, `setTicks(events)`, `setSpeed(n)`,
  `setLoop(on)`. Keep existing `setPlaying`.
- Keyboard: bar-level handler — `Space` togglePlay, `←/→` step, `Shift+←/→` jumpEvent,
  `Home/End` seek 0/total.

**timelineAdapter.js:** add `setTotal(n)`, `setSpeed(n)` (push to live client when present),
`loop` flag (on reaching end, if loop → seek 0 else pause). `onPosition` already fires.

**app.js wiring:**
- Compute `effectiveTotal = max(timeline.totalSeq, narrative.events.length-1)`; call
  `controls.setTotal`/`setPosition`. Derive ticks from `narrative.events`
  (`{seq, status, stage, assurance}`) → `controls.setTicks`.
- Handlers: `seek` → `timeline.seek`; `setSpeed` → `timeline.setSpeed` + `controls.setSpeed`;
  `jumpFailure` → seek to first `status==='failed'` event seq (else last);
  `jumpEvent(dir)` → next/prev event seq; `toggleLoop`.
- In the `onPosition` callback, update `controls.setPosition` and `sync.onPosition`.
- Rebuild ticks/total whenever the narrative rebuilds (`onScene`).

**Acceptance:** scrubber + ticks visible; drag moves canvas & dims cards; speed works;
keyboard works; jump-to-failure lands on the failed stage.

## 4. A3 — HiDPI canvas (`renderer.js`)

- `resizeCanvas()`: read `dpr = devicePixelRatio||1`; set `canvas.width/height = cssW/cssH *
  dpr`; set `canvas.style.width/height = cssW/cssH + 'px'`; store `this.dpr, this.cssWidth,
  this.cssHeight`.
- `render()`: begin with `ctx.setTransform(dpr,0,0,dpr,0,0)`; use `cssWidth/cssHeight` for
  clear, background gradient, camera translate (`cssW/2 + camera.x`), HUD. `save()` after
  setTransform so `restore()` returns to the dpr frame.
- `hitTestNode/hitTestEdge`: replace `canvas.width/height` with `cssWidth/cssHeight`.
- Replace `window.resize` listener with a `ResizeObserver` on `canvas.parentElement`
  (fallback to window resize); store the observer for teardown.

**Acceptance:** crisp on 2×; clicks still land (regression in `layout.test`/manual).

## 5. A4 — Stage state machine (`cinemaStates.js`, `app.js`, `dataSources.js`)

**cinemaStates.js:** `class CinemaStateOverlay(stageEl)` with `set(state, opts)` where state ∈
`hidden | loading | empty | empty-filter | error`. Renders a centered card (icon, title,
message, optional action button → `opts.onAction`). Pure DOM, no canvas. `current()` getter
for tests; logic split into a pure `resolveState({nodeCount, filterActive, connection})`
helper that the unit test drives.

**app.js wiring:**
- Create overlay in the stage; initial `loading` for sources that connect, immediate
  evaluate for inline scenes.
- `onScene`: `nodeCount>0` → `hidden`; `===0` → `filterActive ? 'empty-filter' : 'empty'`.
  Track `filterActive` from the search box.
- Full mode empty → action button "Connect" reopens the connect dialog.
- empty-filter action "Clear filter" resets search + filter.

**dataSources.js (StandaloneCinemaDataSource):** expose connection events so app can wire
them — simplest: in `subscribeScene`, also forward `connected/disconnected/reconnecting/
error/reconnect_failed` via an optional `opts.onConnectionState(state, info)` callback passed
from app. (Additive; no behavior change when absent.)

**app.js error wiring:** pass `onConnectionState` → map `error/reconnect_failed` →
`overlay.set('error', {onAction: retry})` where retry calls `ds.client.connect()`;
`reconnecting` → `loading`; `connected` → re-evaluate from scene.

**Acceptance:** distinct states; WS kill → error + working retry; aggressive filter →
empty-filter not black canvas.

## 6. A5 — Label de-clutter + semantic zoom (`renderer.js`)

- Add a per-frame **label placement** pass. Collect candidates: node labels (priority =
  selected/hovered ▸ activity ▸ base) and edge labels (priority = hovered ▸ traffic). For
  each, measure bbox at anchor; keep an `occupied` rect list; place if no intersection else
  skip. Always place selected/hovered.
- **Semantic zoom (LOD):** node labels drawn only when `zoom >= LABEL_ZOOM_MIN` OR node is
  important (selected/hovered/high activity). Edge labels only for hovered/high-traffic
  edges, never all. Gas sub-labels only when the edge label was placed.
- Extract the AABB-intersection + placement into a tiny pure helper
  (`InfrixCinema._placeLabels` or an internal module fn) exported for `labelLayout.test.mjs`.

**Acceptance:** no overlapping labels at default fit; zoom reveals progressively; gas/call
labels never stack.

## 7. Cross-cutting

- **Teardown (partial E2, needed by A3):** store all listeners/observer/rAF; remove in
  `destroy()` (resize observer, layout controller rAF, controls keyboard handler, state
  overlay). Avoid leaks across remounts that A-tier work would otherwise multiply.
- **Reduced motion:** layout animator + (future) effects honor
  `matchMedia('(prefers-reduced-motion: reduce)')`.

## 8. Test plan

Unit (`npm test`, node):
- `layout.test.mjs`: `needsLayout`, `chooseAutoEngine`, spine lane assignment & ordering,
  force determinism w/ seeded RNG (no `Math.random` reliance → use index-based jitter),
  no-overlap invariant on a sample graph, disclosure-safety (suppressed node absent stays
  absent; redacted size preserved).
- `cinemaStates.test.mjs`: `resolveState` truth table.
- `labelLayout.test.mjs`: AABB intersection; greedy placement skips overlaps; priority order.
- `shape.test.mjs`: still green (new modules wired in loader, no orphans).

Manual smoke (documented in `docs/tier-a-verification.md` after build): positionless scene,
engine switch, scrubber drag + ticks + keyboard, 2× crispness, WS-kill error + retry,
filter→empty-filter, label de-clutter while zooming.

## 9. Definition of done

- All five acceptance blocks pass.
- `npm test` green (including the integrity fence).
- No new dependencies; works over `file://` (classic scripts) and via the ESM loader.
- Disclosure + assurance invariants preserved.
- Listeners/observers/rAF cleaned up in `destroy()`.
