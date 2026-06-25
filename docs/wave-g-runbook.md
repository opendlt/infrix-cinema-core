# Wave G — Implementation Runbook · Make "Cinema" cinematic

> From [Round-2 review](./ui-ux-critical-review-round2.md): **G1 Causal Autoplay, G2 Trust
> Posture ambient field, G3 Self-explaining scene + zero-onboarding spotlight.**

## Ground rules (every wave)

1. Classic-script IIFEs attaching to `window.InfrixCinema`, `module.exports` for node. No
   bundler, no deps, `file://`-safe.
2. **Loader manifest fence** (`shape.test.mjs`): any new `.js`/`.css` must be added to
   `loader.js` `SCRIPTS`/`STYLES` or the orphan test fails; `.mjs` tests are exempt. Keep
   dependency order (a module's producers load before it; everything before `app.js`).
3. **Vocabulary parity**: do not edit `visualVocabulary.js` (Go parity test parses it).
4. **Disclosure invariant**: operate only on the already disclosure-filtered scene; never
   reveal a redacted value; sealed nodes keep fixed size/opacity.
5. **Assurance honesty**: never imply a level the bundle doesn't back; reuse `buildLadder` /
   `capAssurance`.
6. **Reduced-motion**: every animation has a static/cut fallback.
7. **Teardown**: every listener/observer/rAF/interval removed in `destroy()`.
8. **Tests**: pure logic → `*.test.mjs` units; wiring → extend the headless DOM-shim smoke.
   `npm test` + all smokes green.

## New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `cinematic.js` | classic script | before `app.js` | G1 director loop + caption track |
| `sceneSummary.js` | classic script | before `app.js` | G3 plain-language summary + spotlight (pure builder + DOM) |
| `cinematic.test.mjs` | node test | — | G1 shot-list builder units |
| `sceneSummary.test.mjs` | node test | — | G3 summary builder units |

CSS → `styles.css`; trust-aura tokens → `cinemaTokens.css`.

## G1 — Causal Autoplay (`cinematic.js`, `app.js`, `controls.js`, `styles.css`)

**Pure core (testable):** `buildShotList(events, graph)` → ordered
`[{ seq, stage, nodeIds, headline, proves, dwellMs }]`. Derives the dwell from headline length
(min 2200ms), orders by `event.sequence`, resolves a `primaryNodeId` per shot (first node of
the stage group with a position).

**Component:** `InfrixCinema.Cinematic({ renderer, narrative, timeline, sync, captionHost })`
with `play()`, `pause()`, `next()`, `prev()`, `exit()`, `isPlaying()`.
- `play()` runs the director loop over the shot list:
  - `timeline.seek(shot.seq)` (advances replay head; dims future cards via existing sync).
  - `sync.highlightNodes(shot.nodeIds)` (spotlight; dim the rest — reuse Wave-A/C highlight).
  - `renderer.flyTo(primaryNode, { zoom: 1.5, duration: 520 })`.
  - Show a **lower-third caption** (`captionHost`): big headline + the C4 "what this proves"
    line; fade in/out around the dwell.
  - At `stage === 'anchor'` with an anchored bundle, call
    `renderer.playAnchorConfirmation(evidenceId, anchorId)` + `pulseLadders('l0')` (reuse C/D3).
  - Schedule the next shot after `dwellMs / speed` via a tracked `setTimeout`.
- `prefers-reduced-motion`: cut (snap camera, no fly) but keep captions + dwell.
- `exit()`: clear caption, `sync.clearHighlight()`, restore free camera, stop timers.

**Caption track:** a DOM lower-third element appended to the stage; `setCaption(headline,
proves)` / `clear()`; `aria-live="polite"` so it's announced.

**Controls:** add a prominent **"▶ Play story"** button (full/nexus/proof). While playing it
becomes "⏸ Pause story"; `Esc` exits; reuse transport speed for pacing; `←/→` step shots when
in cinematic mode. Gate behind `caps.controls`.

**app wiring:** construct `Cinematic` after narrative/sync/timeline exist; pass the caption
host; wire the control handlers; `destroy()` calls `cinematic.exit()` + cleanup.

**Acceptance.** One button flies the camera stage-by-stage with synced captions + dimming,
ending on the anchor bloom; a novice watches the whole governed action explain itself with zero
clicks. Reduced-motion cuts between framed shots with captions.

## G2 — Trust Posture ambient field (`renderer.js` or `app.js`, `trustLadder.js`, CSS, tokens)

- **Frame-edge aura**: a stage overlay element `.cinema-trust-aura` (pointer-events:none, inset
  box-shadow/border-gradient) whose color = `buildLadder(proof).ceilingId`
  (`--cinema-aura-{offline,replay,l0,witness}` tokens: grey/blue/gold/green). Updated in
  `onScene` from the same model the ladder uses. At the anchor moment, add a `.bloom` class for
  800ms (hook into D3 trigger / `pulseLadders`).
- **Posture chip**: a top-center `.cinema-posture-chip` (`⛓ L0-anchored`, rung-colored) →
  click opens/scrolls to the Trust Ladder. Built from the same model.
- Reduced-motion: aura is static (no bloom animation; CSS `@media` already collapses it).

**Acceptance.** The trust ceiling is legible across the room by color; un-anchoring a bundle
drains the gold from the frame; the anchor moment blooms the frame gold once.

## G3 — Self-explaining scene + onboarding spotlight (`sceneSummary.js`, `app.js`, `renderer.js`, CSS)

- **Pure `buildSceneSummary(graph, events, proof)`** → `{ text, parts:[…] }`, e.g.
  *"1 governed transfer · 6 steps · 1 sealed value · anchored on L0 · no anomalies."* From
  counts you already compute (narrative events, redacted nodes, attention focus, ladder
  ceiling). Never names a redacted value.
- **Summary ribbon**: dismissible top-of-stage bar rendering the summary; `localStorage`
  remembers dismissal per mode.
- **First-run spotlight**: a 3-step, `localStorage`-gated overlay ("This is the action ▸ how
  strongly it's proven ▸ press Play to watch"). One-click skip; never shown again. Pure DOM,
  no tour library.
- **In-context first-encounter labels** (renderer): the first time a node-kind appears in a
  session, draw its human name once near the node, fading after ~3s. Track seen kinds on the
  renderer; gate by reduced-motion (no fade → brief static then clear on next interaction).

**Acceptance.** A first-timer can, within 5s and without opening a panel, state what they're
looking at and how to watch it; the legend becomes optional.

## Tests

- `cinematic.test.mjs`: `buildShotList` ordering, dwell floor, primary-node resolution,
  empty-events → empty list.
- `sceneSummary.test.mjs`: summary counts (steps, sealed, anchored, anomalies), redaction-safe
  (never emits a hidden value), empty scene.
- Headless smoke (extend): Play-story advances shots + sets captions + flies camera (assert
  caption text changes + camera moved); trust aura element color matches ceiling; summary
  ribbon present; spotlight shows once then not again.
- `shape.test.mjs` green (new modules wired in loader).

## Definition of done

G1–G3 acceptance met; `npm test` + all smokes green; no new deps; `file://`-safe;
disclosure/assurance invariants intact; reduced-motion paths verified; teardown clean.
