# Tier E + F — Verification Report

Status: **COMPLETE.** Tier E (performance & correctness) and the small Tier F chrome items,
implemented per the [UI/UX Critical Review](./ui-ux-critical-review.md). `npm test` green
(51 tests); a dedicated Tier E/F headless smoke green (9/9); Tier A/B/C/D smokes still green
(no regression).

## What shipped — Tier E (performance & correctness)

| Item | Files | Summary |
|------|-------|---------|
| **E1 viewport culling** | `renderer.js` | `render()` computes the visible world rect; `drawGraph` skips nodes/edges whose bounds are off-screen. Big graphs only pay for what's on screen. |
| **E1 spatial-index hit-test** | `renderer.js` | A uniform **hit-grid** is rebuilt each frame from drawn nodes (id, position, *rendered* radius, draw index). `hitTestNode` queries the 3×3 cell block — O(1) amortized vs a linear scan — and returns the top-most node. Linear fallback before the first frame. |
| **E3 dirty-flag rendering** | `renderer.js`, `layout.js` | `requestRender()` sets `_dirty`; `render()` early-returns when not dirty **and** nothing is animating (`_needsContinuousAnimation`: anchor moment, camera tween, the 650ms entry window, animated edges, attention focus, or sealed nodes). Idle scenes cost ~0 CPU — and under reduced-motion, idle is truly idle. Camera/hover/selection/layout mutations re-mark dirty. |
| **E4 precomputed aggregation** | `renderer.js` | Per-pair edge traffic + per-node activity + animated/sealed flags are computed once per scene change (`_refreshAggregate`) instead of every frame; `drawGraph` consumes the cache (ghost overlay computes inline). |
| **E2 lifecycle leaks** | `renderer.js` | Added `renderer.off()` so `narrativeSync` can actually unsubscribe its `nodeSelected` handler on destroy (previously a guarded no-op → leak across remounts). The reduced-motion media listener, resize observer, pointer/wheel/dblclick listeners, and both rAFs are all cleaned up in `destroy()`. |

## What shipped — Tier F (chrome)

| Item | Files | Summary |
|------|-------|---------|
| **F1 no dev FPS** | `renderer.js`, `app.js` | The always-on canvas FPS HUD is now **debug-gated** (`__INFRIX_CINEMA_DEBUG__`); the status bar no longer shows `FPS`. No more "unfinished dev tool" tell. |
| **F2 self-describing export** | `app.js`, `styles.css` | The export menu now groups "Share a view" vs "Share proof", each option carries a one-line description of what it is and who it's for, and the menu dismisses on outside-click / `Esc` with focus management. |
| **F3 dockable details** | `app.js`, `styles.css` | The details panel docks as a flex column beside the stage (no longer an absolute overlay that occludes the selected node); becomes a bottom sheet under 640px. |

## How it was verified

**Unit (`npm test`, 51 tests, all pass):** unchanged suite (Tier E/F logic is exercised via
the headless smoke since it needs a canvas/DOM); the loader/orphan integrity fence stays
green (no new modules).

**Tier E/F headless smoke (DOM shim, scratchpad — not shipped):**
- E4 — `renderer._agg` (cached aggregation) is present.
- E1 — a node at (1e5,1e5) is **culled** from the hit-grid while the on-screen node is
  present.
- E3 — a static scene goes **idle**: `frameCount` stops advancing across 20 frames; a camera
  change re-marks `_dirty` and the next frame consumes it.
- E2 — `renderer.off()` removes a handler (one emit before, none after).
- F3 — the details panel's parent is the body (docked), not the stage.
- F2 — the export menu opens with group headings + per-item descriptions and closes on `Esc`.
- F1 — `renderer.debug === false` by default and there is no `#status-fps` element.
- The shim gained a proper rAF **queue** (the render loop and camera tween can now coexist),
  matching real-browser behavior.

## Acceptance criteria — met

- **E1** off-screen work skipped; hit-test via spatial grid against the rendered radius. ✅
- **E3** idle → no draws; interaction/animation → draws resume. ✅
- **E4** edge aggregation computed once per scene, not per frame. ✅
- **E2** `off()` added; all listeners/observers/rAFs torn down. ✅
- **F1/F2/F3** FPS hidden; export menu self-describing + dismissable; details docked. ✅

## Disclosure & assurance invariants — preserved

Culling/dirty-render/aggregation are purely performance concerns — they change *when* and
*whether* something is drawn, never *what is true*. Disclosure redaction, the capped trust
ladder, and per-node assurance are untouched. The spatial grid stores only positions/radii
already used for rendering.

## Review status

With Tier E + F complete, **all tiers (A–F) of the UI/UX critical review are implemented**:
the layout/scrubber/HiDPI/states foundation (A), the interaction model (B), the trust-surfacing
superpower (C), the visual/motion system (D), and now performance + chrome polish (E/F).
