# Infrix Cinema — UI/UX Critical Review

> Exhaustive, brutally honest review of `@infrix/cinema-core` with implementation-grade
> recommendations. Source of truth for the phased redesign. Tiers are tackled one at a time.

---

## 1. Executive verdict (the brutal version)

What exists today is a **competent 2014-era dark "blockchain dashboard"** with one
genuinely world-class idea trapped inside it. The engineering discipline is real: a single
canonical renderer, mode-gated capabilities, a fail-closed disclosure filter mirrored from
Go, an honest capped-assurance ladder. That backend rigor is rare and valuable.

But as a *product experience* it is **nowhere near "wow," and parts of it are not yet
functional as a product.** Specifically:

- The thing that would make it breathtaking — **provable, time-travelable, disclosure-safe
  trust** — is rendered as **11px monospace in a collapsed bottom panel.** The crown jewel
  is buried.
- The graph is **at the mercy of server-supplied (x,y) coordinates** — there is no layout
  engine, so the "graph" is only as good as whatever the Go backend happened to compute.
  This is the single biggest ceiling on the whole experience.
- The **timeline scrubber — the literal spine of a "replay the story" product — does not
  exist in the UI.** The adapter tracks position; the control bar never renders a scrubber,
  speed control, or time display.
- The canvas is **not HiDPI-aware**, so on every Retina/4K screen it ships blurry.
- The visual language is **Material Design 2014** (literally the Material palette hex
  codes) with monospace-everything and five simultaneous "juicy" effects (shake, pulse,
  glow, dashed spinning rings, particles) that collectively read as noise, not
  sophistication.

The unique, defensible insight already exists — the assurance ladder + disclosure +
agent-safety trifecta. It is just not being shown to anyone.

---

## 2. The reframe: what the superpower actually is

Stop positioning Cinema as "a graph of blockchain activity." Etherscan, Tenderly, Phalcon,
Blockscout, Arkham, and Cosmograph all do prettier graphs. That race is lost.

The unique, defensible insight — available on no other chain tool — is:

> **"X-ray vision into governed actions: replay any action through time and see, at every
> step, exactly how strongly each claim is backed — and verify it yourself without trusting
> the server. Watch privacy stay provably intact. Watch an AI agent get stopped at a safety
> gate in real time."**

Three pillars no competitor has:

1. **The assurance ladder** (`offline → replay → L0 → witness`) — honest, capped, per-claim
   trust. This is the hero.
2. **Disclosure as a visible, first-class object** — show a redacted node *without leaking
   its size/value/magnitude*, and show who could reveal it.
3. **Agent safety as a visible trust feature** (`AgentCinemaDataSource`) — "here is exactly
   where the agent was prevented."

**North Star:** *Trust you can see, replay, and verify.* Every design decision serves that
line. Everything that doesn't (the FPS counter, the monospace soup, the five pulsing
effects) gets cut.

---

## 3. Findings & recommendations

Graded **P0 (blocks "wow," fix first)**, **P1 (high leverage)**, **P2 (polish)**.

### TIER A — Foundational gaps (the experience can't be great until these exist)

#### A1 · No client-side layout engine — `[P0]`
**Problem.** `renderer.js` draws `node.position.{x,y}` verbatim and **skips any node without
a position** (`if (!node.position) return;`). No force sim, no DAG/hierarchical layout, no
collision resolution. Filtering does not re-layout. `fitToView` only reframes pre-placed
nodes.
**Why.** Every "wow" graph product's magic is automatic, beautiful, physics-settled layout.
Without it: overlaps, label collisions, scattered filtered subgraphs, visual quality
outsourced to backend coordinates.
**Build.** New `layout.js` exposing a layout API with two engines: `force` (d3-force-style:
link + charge + collision + center, seeded from existing positions) and `spine` (left→right
governance lanes keyed off `stageForKind()`: intent → policy → approval → execution →
outcome → evidence → anchor → witness, lanes labeled, time flowing rightward). Run on first
scene, topology change, filter change, or explicit "Relayout." Animate node transitions
(~400ms lerp).
**Acceptance.** A scene with nodes but no `position` fields renders clean, non-overlapping,
readable. Switching engines animates smoothly. Default `spine` reads as Intent→…→Witness
lanes with lane headers.

#### A2 · The timeline scrubber does not exist in the UI — `[P0]`
**Problem.** `controls.js` renders play/pause/step buttons and nothing else for time. No
scrubber, no time readout, no speed control, despite `TimelineAdapter` maintaining
`currentSeq / totalSeq / speed`.
**Why.** The entire pitch is "replay a governed action as a story." The timeline is the
spine.
**Build.** A real transport bar (gated by `caps.replay || caps.live`): a range scrubber
bound to `currentSeq/totalSeq`; **event ticks** on the track at each narrative event's
sequence, colored by status (failed = red); a time/position readout (`seq 12 / 48 · block
1,240`); a `0.5× / 1× / 2× / 4×` speed control; loop + "jump to failure" buttons; keyboard
(`Space`, `←/→`, `Shift+←/→`, `Home/End`).
**Acceptance.** A scrubber with stage ticks is visible in proof/full modes; dragging moves
the canvas *and* dims narrative cards in lockstep; keyboard works; speed changes take
effect.

#### A3 · Canvas is not HiDPI-aware — ships blurry — `[P0]`
**Problem.** `resizeCanvas()` sets `canvas.width = clientWidth` (CSS px). No
`devicePixelRatio`.
**Build.** Multiply backing store by `dpr`, set CSS size separately, scale the base
transform by `dpr`, fix `hitTestNode/hitTestEdge` to use CSS-pixel dimensions, use a
`ResizeObserver` on the stage.
**Acceptance.** Crisp text/edges on 2× displays; hit-testing still lands correctly.

#### A4 · No empty / loading / error / first-run states — `[P0]`
**Problem.** Before data arrives: a black rectangle with "0 FPS" and "Block: 0 …". Only
`cinema.full` has a connect dialog; nexus/embed/proof show nothing. No error surface when a
WS reconnect fails (`reconnect_failed`/`error` are emitted but nobody renders them).
**Build.** A state-machine overlay on the stage: `empty` (waiting for first event + CTA in
full mode), `loading` (skeleton), `error` (WS error/reconnect + Retry wired to
`client.connect`), `empty-after-filter` (clear-filter hint).
**Acceptance.** Each state renders distinct, on-brand content; killing the WS shows the
error state with a working retry; an over-aggressive filter shows the empty-filter state.

#### A5 · Label collision & edge-label pile-up — `[P1]`
**Problem.** Edge labels draw at every aggregated edge midpoint with gas labels stacked
under, no collision avoidance; node labels draw under every node unconditionally.
**Build.** A greedy label-placement pass (reserve bounding boxes, skip overlaps, prioritize
by activity/traffic, reveal suppressed labels on hover/zoom) plus **semantic zoom** LOD
(hide minor labels / collapse low-traffic edges below a zoom threshold).
**Acceptance.** At default fit no two labels overlap; zooming reveals more; gas/call labels
never stack illegibly.

### TIER B — Interaction model

- **B1 [P0]** Click vs. drag conflated; no hover tooltip; edge-hover throws open the heavy
  panel; empty-click leaves panel open. Implement hover=peek / click=pin / drag=pan (4px
  threshold) / double-click=flyTo; lightweight HTML hover tooltip; cursor affordances.
- **B2 [P1]** No touch/pinch — dead on mobile/tablet. Pointer Events + two-pointer pinch;
  `touch-action: none`.
- **B3 [P1]** Hit-test radius (`size+5`) ≠ rendered radius (adds activityBonus + pulse +
  1.3× select). Cache rendered radius, hit-test against it.
- **B4 [P1]** Search only dims (`opacity 0.12`); no count, no re-layout, no edge filter, no
  field scoping. Add result count + n/total stepper, a `kind:/status:/gas:/assurance:`
  grammar, re-layout matched subgraph, persisted query, `Esc` clear.
- **B5 [P1, a11y]** Canvas graph invisible to keyboard/SR. Off-screen mirror list
  (`role=listbox`/`option`), arrow-key traversal with a drawn focus ring, `Enter` details,
  `f` flyTo, `role=application` on canvas.

### TIER C — Make the superpower visible

- **C1 [P0]** Promote the assurance ladder from a 40%-height footnote to a flagship vertical
  4-rung **Trust Ladder** component, shared by proof panel + narrative receipt + export
  (kills the two divergent badge treatments). Hover explains each rung; clicking highlights
  its nodes; map onto scrubber ticks; per-node assurance chips.
- **C2 [P1]** Disclosure deserves more than a 🔒 emoji. A deliberate "sealed" treatment
  (fixed size preserved), a details panel that explains what's provable without leaking the
  secret + any disclosable grant, and a scene-level disclosure summary chip.
- **C3 [P1]** Stage the agent-safety moment: a horizontal stepper terminating in an emphatic
  "stopped here, by this rule" barrier; one-click shareable.
- **C4 [P2]** The templated narrative copy is robotic; invest in richer human variants +
  optional server-supplied headline override; stage icons; "what this proves" per card.

### TIER D — Visual & motion design

- **D1 [P0 for "wow"]** Replace the Material-2014 aesthetic with an intentional token
  system: type scale (legible sans for canvas labels, mono only for hashes), spacing scale,
  elevation, motion tokens, a restrained considered palette (recheck WCAG), and depth on the
  stage (vignette + drifting dot-field).
- **D2 [P1]** Tame the five simultaneous effects into a hierarchy of attention: one ambient
  layer, one attention layer reserved for the single most important state (dim the rest);
  kill the literal shake; calm breaker rings; respect `prefers-reduced-motion`.
- **D3 [P1]** A signature moment: the **Anchor confirmation** (~800ms crystallize + beam to
  L0 + ladder rung lights) synchronized with replay reaching the anchor stage.

### TIER E — Performance & correctness

- **E1 [P1]** Full redraw every frame, no culling, no spatial index, linear hit-test. Add
  viewport culling, a quadtree/grid spatial index, dirty-flag rendering (stop drawing when
  idle), precompute edge aggregation per scene change.
- **E2 [P2]** Lifecycle leaks: the renderer's `window.resize` listener is never removed in
  `destroy()`. Track and remove all listeners; verify with mount→destroy→mount.

### TIER F — Chrome, copy, "looks finished"

- **F1 [P0, trivial]** Remove the always-on "FPS" HUD; don't show all-zeros status before
  data.
- **F2 [P2]** Export menu and view toggle need labels/affordances; reconsider Split default
  on narrow widths.
- **F3 [P2]** Details panel: dock instead of occlude; pin/compare two nodes.

---

## 4. Recommended sequencing

- **Sprint 1 — "Stop looking unfinished":** A3, A4, A2, F1, B1.
- **Sprint 2 — "Make the graph good":** A1, A5, E1, B3.
- **Sprint 3 — "Show the superpower":** C1, C2, C3, D3.
- **Sprint 4 — "Breathtaking + inclusive":** D1, D2, B2, B4, B5, F2/F3, E2.

---

## 5. One honest meta-note

The codebase is *disciplined* — the disclosure filter, the capped assurance, the
single-renderer contract, the parity tests. **Do not sacrifice that integrity for flash.**
Every recommendation is additive to the trust model, never a shortcut through it: the layout
engine must respect the disclosed graph; the anchor animation must only fire when L0 is
genuinely present; sealed nodes must keep fixed size. The differentiation *is* the rigor —
the job is to make the rigor visible and delightful.
