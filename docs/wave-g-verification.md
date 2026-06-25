# Wave G — Verification Report

Status: **COMPLETE.** G1 Causal Autoplay, G2 Trust-posture ambient field, and G3
self-explaining scene + zero-onboarding spotlight, implemented per
[wave-g-runbook.md](./wave-g-runbook.md). `npm test` green (61 tests); a Wave-G headless smoke
green (6/6); all A–F smokes still green (no regression).

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **G1 Causal Autoplay** | `cinematic.js` (new), `controls.js`, `app.js`, `styles.css` | A **"▶ Play story"** button runs a director loop over the narrative events: per shot it `flyTo`s the stage's node, spotlights it (dim the rest), advances the replay head, and shows a **lower-third caption** (headline + "what this proves"), ending on the anchor-confirmation bloom. `←/→` step shots, `Esc` exits, transport speed paces it. Reduced-motion cuts instead of flying (camera snap), captions kept. |
| **G2 Trust Posture aura** | `app.js`, `cinemaTokens.css`, `styles.css` | A frame-edge **aura** colored by the scene's ceiling assurance (grey→blue→gold→green via `buildLadder`), blooming gold for ~800ms at the anchor moment; a top-center **posture chip** (`⛓ L0-anchored`) that pulses the ladder + scrolls the proof rail into view. Both driven by the same trust model — no new trust logic. |
| **G3 Self-explaining scene** | `sceneSummary.js` (new), `renderer.js`, `app.js`, `styles.css` | A plain-language **summary ribbon** ("1 governed action · 6 steps · 1 sealed value · anchored on L0 · no anomalies", dismissible, count-only), a once-ever **3-step spotlight** (localStorage-gated), and **first-encounter kind hints** — the first time a node-kind appears in a session, its human name fades in near the node so the vocabulary self-teaches (reduced-motion safe). |

Cross-cutting: two new modules wired into `loader.js` (integrity fence green); aura color tokens
added to `cinemaTokens.css`; cinematic timer + spotlight + ribbon + bloom timer + the
capture-phase cinematic keydown all cleaned up in `destroy()`.

## How it was verified

**Unit (`npm test`, 61 tests, all pass):** adds `cinematic.test.mjs` (5 — shot ordering, dwell
floor, primary-node resolution preferring positioned nodes, proves-line, empty events) and
`sceneSummary.test.mjs` (5 — counts, "no anomalies", **redaction-safe (never names a hidden
value)**, ceiling honesty, empty scene). Prior A–F units + the loader/orphan fence remain green.

**Wave-G headless smoke (DOM shim, scratchpad — not shipped):**
- G2 — the aura `data-assurance` is `l0` for an anchored bundle; the posture chip is visible and
  reads L0.
- G3 — the summary ribbon describes "sealed value" + "anchored on L0"; the first-run spotlight
  shows once, dismisses through its 3 steps, and marks `localStorage` seen; the renderer tracked
  ≥4 first-encounter kinds.
- G1 — "Play story" builds a shot list and runs shot 0 (caption shown, button flips to "Pause
  story"); `Esc` exits and hides the caption + resets the button.
- A–F smokes re-run green.

## Acceptance criteria — met

- **G1** one button flies the camera stage-by-stage with synced captions + dimming, ending on
  the anchor bloom; reduced-motion cuts with captions. ✅
- **G2** trust ceiling legible by color across the room; bloom at the anchor; chip opens the
  ladder. ✅
- **G3** a first-timer sees what they're looking at and how to watch it without opening a panel;
  vocabulary teaches itself in context. ✅

## Disclosure & assurance invariants — preserved

The summary is count-only (unit-verified it never emits a redacted label/value). The aura and
posture chip read the same capped `buildLadder` ceiling — they never imply a level the bundle
doesn't back. Autoplay highlights/dims via opacity only; sealed sizing/values untouched.
