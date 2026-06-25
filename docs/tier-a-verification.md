# Tier A — Verification Report

Status: **COMPLETE.** All five Tier A items implemented with no cut corners, against the
acceptance criteria in [tier-a-runbook.md](./tier-a-runbook.md). `npm test` green (29
tests); headless mount-smoke green across all four modes.

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **A1 layout engine** | `layout.js` (new), `renderer.js`, `app.js`, `controls.js` | `spine` / `force` / `grid` / `none` engines + `LayoutController` animator. Auto-runs when nodes lack positions; user-switchable (Auto/Spine/Force) and persisted. Spine draws governance lanes (Intent→…→Witness) behind the graph. Reduced-motion snaps. |
| **A2 timeline scrubber** | `controls.js`, `timelineAdapter.js`, `app.js` | Transport row: range scrubber, per-event ticks colored by status, time/block readout, 0.5–4× speed, loop, jump-to-failure, keyboard (Space/←/→/Shift+arrows/Home/End). |
| **A3 HiDPI canvas** | `renderer.js` | Backing store scaled by `devicePixelRatio`; CSS box unscaled; all hit-testing/fit math moved to CSS pixels; `ResizeObserver`. |
| **A4 state overlay** | `cinemaStates.js` (new), `app.js`, `dataSources.js` | loading / empty / empty-filter / error overlay driven by a pure `resolveState`; live WS lifecycle forwarded via `onConnectionState`; Retry + Connect + Clear-filter actions. |
| **A5 label de-clutter** | `renderer.js` | Screen-space greedy label placement with collision avoidance + semantic-zoom gating; constant-size crisp labels; forced labels for selected/hovered. |

Cross-cutting: renderer/controls/layout/overlay now clean up listeners, observers, rAF, and
the keyboard handler in `destroy()`. Canvas fonts use concrete stacks (ctx.font can't resolve
CSS `var()`). New modules registered in `loader.js`; integrity fence stays green.

## How it was verified

**Unit (`npm test`, 29 tests, all pass):**
- `layout.test.mjs` — `needsLayout`, `chooseAutoEngine`, spine lane ordering, force
  determinism + no-overlap, `'none'` respects server positions, purity (no input mutation),
  `LayoutController` snap path writes positions + feeds lanes, redacted size preserved.
- `cinemaStates.test.mjs` — full `resolveState` decision table.
- `labelLayout.test.mjs` — `rectsIntersect` + greedy `placeLabels` (priority, forced, empty).
- `timeline.test.mjs` — `setTotal` raise-only, `seek` notify + re-derive, `setSpeed`, loop
  rewind, end-of-replay pause.
- `shape.test.mjs` — pre-existing loader/orphan/dep-order fence, still green.

**Headless mount-smoke (DOM shim, not shipped — lives in the session scratchpad):** mounted
`cinema.full / nexus / embed / proof`; each one mounts, renders frames (exercising
drawGraph + drawLabels + drawLanes + measureText), lays out a **position-less** governance
scene (all 8 nodes placed — the pre-Tier-A renderer would have drawn nothing), preserves the
redacted node's fixed size/opacity, shows the scrubber + event ticks where controls exist,
re-runs layout on engine switch, and destroys cleanly. Separately verified A3 (backing store
= css×dpr = 2400px for a 1200px box at dpr 2) and A4 (fatal WS error → error overlay + Retry;
reconnect → clears).

## Acceptance criteria — met

- **A1** Position-less scene renders clean & non-overlapping; spine shows labeled lanes;
  engine switch animates; reduced-motion snaps. ✅
- **A2** Scrubber + stage ticks visible in proof/full/nexus; drag moves canvas & dims cards
  (via existing `onPosition` sync); speed/keyboard/jump-to-failure work. ✅
- **A3** Crisp on 2×; hit-testing/fit corrected to CSS pixels. ✅
- **A4** Distinct loading/empty/empty-filter/error states; WS kill → error + working retry. ✅
- **A5** Greedy placement skips overlaps; semantic zoom gates minor labels; forced labels
  always shown. ✅

## Disclosure & assurance invariants — preserved

Layout operates only on the already disclosure-filtered graph; it moves nodes but never
resurrects suppressed nodes nor alters a redacted node's fixed size/opacity (unit + smoke
verified). Scrubber ticks reflect narrative event status as-built; no assurance level is
implied beyond what the bundle backs.

## Notes / deferred (by design, later tiers)

- Filter currently dims (opacity) and updates the empty-filter state; **re-layout to gather
  matches** is folded into Tier B (B4 power search) to avoid disorienting per-keystroke
  relayout.
- Per-frame label `measureText` + full redraw is fine at Tier A scale; **culling / spatial
  index / dirty-render** is Tier E (E1).
- Click-vs-drag threshold, hover tooltip, touch/pinch remain Tier B (B1/B2).
