# Tier B — Verification Report

Status: **COMPLETE.** All five Tier B items implemented with no cut corners, against
[tier-b-runbook.md](./tier-b-runbook.md). `npm test` green (36 tests); headless interaction
smoke green (B1–B5); the Tier A 4-mode lifecycle smoke still green (no regression).

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **B1 click-vs-drag + tooltip** | `renderer.js`, `tooltip.js` (new), `app.js`, `styles.css` | Pointer-Events gesture model: click (<4px) selects/pins details, drag pans, double-click `flyTo`, empty-click clears. New `CinemaTooltip` peek card on hover; edge-hover no longer opens the heavy panel. Cursor affordances (grab/grabbing/pointer); wheel zooms about the cursor. |
| **B2 touch / pinch** | `renderer.js`, `styles.css` | Unified pointer tracking; two-pointer pinch-zoom about the midpoint + two-finger pan; `canvas { touch-action: none }`; coarse-pointer hit pad. |
| **B3 real hit radius** | `renderer.js` | Hit-test uses the cached **rendered** radius (activity/selection/pulse-aware), not `size+5`; iterates **top-most first**; coarse pad for touch. |
| **B4 power search** | `searchQuery.js` (new), `app.js`, `controls.js`, `renderer.js` | `kind:` / `status:` / `gas:OPn` grammar + free text; result count + ‹ › stepper; `Enter`/`Shift+Enter` step matches (`flyTo`), `Esc` clears; non-matches + their edges dim; query persisted/restored. |
| **B5 a11y graph** | `a11y.js` (new), `renderer.js`, `app.js`, `styles.css` | Visually-hidden focusable `role=listbox` mirror; `↑/↓/Home/End` move a drawn focus ring (+recenter), `Enter` opens details, `f` flies, `Esc` blurs; canvas `role=application` + label; the list surfaces on focus for sighted keyboard users. |

Cross-cutting: all new pointer/wheel/dblclick/leave listeners + the camera-animation rAF are
removed in `destroy()`; new modules registered in `loader.js` (integrity fence green); canvas
fonts stay concrete; reduced-motion honored for `flyTo`/`fitToNodes`.

## How it was verified

**Unit (`npm test`, 36 tests, all pass):** adds `searchQuery.test.mjs` (7) — field parsing,
gas operators incl. `_` separators, unknown-field-as-text, `nodeStatus` derivation, AND
semantics, empty query. All Tier A units + the loader/orphan fence remain green.

**Headless interaction smoke (DOM shim, scratchpad — not shipped):**
- B1 — click selects + opens details; a >4px drag pans **without** selecting; hover shows the
  tooltip and `hoverEnd` hides it; double-click `flyTo` raises zoom.
- B2 — two touch pointers pinch and zoom increases.
- B3 — hit-test honors a forced rendered radius (hits at 30u, misses at 60u) — proving it no
  longer uses `size+5`.
- B4 — `kind:contract` → "1 match", the contract full-opacity, a non-match dimmed to 0.12,
  and the redacted node's `0.4` restored on clear.
- B5 — the listbox mirrors all 8 nodes; `ArrowDown` sets the renderer focus ring; `Enter`
  opens details.
- Clean `destroy()`.

## Acceptance criteria — met

- **B1** hover=peek, click=pin, drag=pan (4px), dbl-click=flyTo; tooltip replaces edge-hover
  panel; cursor affordances. ✅
- **B2** pan + pinch-zoom + tap-select on touch; `touch-action: none`. ✅
- **B3** clicking the visible disc of a big/active node selects it; top-most wins. ✅
- **B4** grammar + count + stepper + dim + persist + `Esc`. ✅
- **B5** Tab into the graph, arrow between nodes with a visible ring, open details, SR labels.
  ✅

## Disclosure & assurance invariants — preserved

The tooltip and a11y option labels read only the already-redacted node label; a sealed node
shows "🔒 Provably sealed", never a value/magnitude. Search `status:` derives `private` for
redacted nodes; clearing a filter restores the disclosure-fixed `0.4` opacity, not `1`.

## Notes / deferred (by design)

- `assurance:` search is intentionally **out of scope** here — assurance is per proof-stage,
  not per-node; it lands with the Tier C per-node assurance chips (so filtering can't imply a
  node-level assurance that doesn't exist).
- Per-frame full redraw / `measureText` remains Tier E (E1).
