# Tier D — Verification Report

Status: **COMPLETE.** D1 (intentional token system + depth) and D2 (motion hierarchy +
reduced-motion) implemented against [tier-d-runbook.md](./tier-d-runbook.md). (D3, the
anchor-confirmation moment, shipped in Tier C.) `npm test` green (51 tests); Tier D headless
smoke green (7/7); Tier A/B/C smokes still green (no regression).

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **D1 token system** | `cinemaTokens.css`, `styles.css` | A full design-token set scoped to `.cinema-root`: type scale (`--cinema-fs-*`, line-heights, weights), spacing scale (`--cinema-space-1..8`), elevation (`--cinema-shadow-1..3`), motion (`--cinema-dur-*`, `--cinema-ease-standard/emphasized`), radii. Applied as **depth** (flat panels/menus/overlays/legend gain elevation) and **premium motion** (interactive chrome eases on `--cinema-dur-fast` instead of snapping). |
| **D1 stage depth** | `renderer.js` | `_drawBackdrop()` — a faint **parallax dot-field** that drifts with camera pan + an **edge vignette**, giving the canvas a sense of space. Screen-space, LOD-stable, cheap. |
| **D2 motion hierarchy** | `renderer.js`, `styles.css` | One ambient layer, one attention layer. **Killed the noise**: removed the activity size-pulse (nodes no longer throb) and the quarantine shake (replaced by the existing static dashed hazard border). **Attention focus**: `computeAttention` picks the single highest-severity node (`frozen > anomaly > paused > quarantined > throttled`) and ONLY it animates (pulsing anomaly spotlight, gently pulsing/spinning breaker ring); every other troubled node shows a calm **static** ring — still legible, never competing. |
| **D2 reduced-motion** | `renderer.js`, `styles.css` | `renderer.reducedMotion` from `matchMedia` (with a change listener removed in `destroy()`) freezes all canvas motion — particles, pulses, shimmer, ring spin, the anchor moment. A global `@media (prefers-reduced-motion: reduce)` block collapses CSS animations/transitions and the trust-rung pulse. State stays legible via static rings/glyphs. |

No new modules (work lives in existing files); only `motion.test.mjs` added (test files are
exempt from the loader/orphan fence, which stays green).

## How it was verified

**Unit (`npm test`, 51 tests, all pass):** adds `motion.test.mjs` (5) — `severityOf` ranking,
higher-anomaly outranks lower, `computeAttention` picks the single top node, null when calm,
deterministic tie-break. Prior Tier A/B/C units + loader fence remain green.

**Headless smoke (DOM shim, scratchpad — not shipped):**
- D2 — with throttled + anomaly + frozen nodes, `_attentionFocus` is the **frozen** node;
  clearing the incident resets it to `null`.
- D1 — the depth backdrop + motion-gated effects render across many frames without throwing.
- D2 — a default renderer has `reducedMotion === false` (animates); flipping `matchMedia`
  yields `reducedMotion === true`, and `playAnchorConfirmation` becomes a **no-op** while
  still rendering cleanly.
- Tier A/B/C smokes re-run green.

## Acceptance criteria — met

- **D1** complete token system (type/space/elevation/motion/radii); applied as elevation +
  eased interactions; canvas depth via dot-field + vignette. ✅
- **D2** one ambient + one attention layer; shake and activity-throb removed; only the single
  most-severe node animates; calm static rings elsewhere; `prefers-reduced-motion` fully
  honored on canvas **and** chrome. ✅

## Disclosure & assurance invariants — preserved

Motion changes are purely visual; node sizes/opacities for disclosure (fixed sealed size) and
search are untouched. Reduced-motion keeps every state legible (static colored rings, lock
glyph, capped trust ladder) — nothing about *what is true* changes, only how much it moves.

## Notes

- The palette stays parity-locked to the scene vocabulary (`visualVocabulary.js` ↔ Go); only
  chrome tokens were added, none of the parity-checked `Color*` values changed.
- Broad migration of every existing hardcoded `px` font-size/padding to the new scale is
  incremental polish; the system is defined and applied to elevation/motion/depth and the
  most visible surfaces here.
