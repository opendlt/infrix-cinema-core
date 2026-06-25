# Infrix Cinema — Critical Review, Round 2 (post A–F)

> Second exhaustive review, taken against the **current** codebase after Tiers A–F shipped.
> Companion to [ui-ux-critical-review.md](./ui-ux-critical-review.md) (round 1). This defines
> the "Wow Wave" — Waves G–L — the features that turn a polished explorer into a
> superpower. Runbooks: `wave-g-runbook.md` … `wave-l-runbook.md`.

## 1. Executive verdict (no self-congratulation)

Tiers A–F were real work and fixed real problems: the graph lays itself out, the scrubber
exists, it's crisp on Retina, it has empty/error states, a proper interaction model, touch,
a11y, a Trust Ladder, disclosure UI, an agent ribbon, a token system, a motion hierarchy, and
it's performant.

**And none of that made it "wow."** It made it *competent*. A sophisticated user dropped into
Cinema today would still say "this is a nicely-built blockchain graph explorer." That is a
death sentence for the stated goal — Etherscan, Tenderly, Phalcon, Arkham, Blockscout, and
Cosmograph are all nicely-built graph explorers. Polishing chrome on a node-link diagram does
not produce superpowers or insight unavailable elsewhere.

**A–F removed deficiencies; they did not add capabilities.** They were table stakes — the
things whose *absence* made it look unfinished. The "wow" comes from doing things with
Infrix's data that no other chain can do, because no other chain has the data.

The kicker, confirmed by grep: the most unique asset in the renderer — the
**ghost / predicted-vs-actual graph** (`setGhostGraph`, `ghost_drift`, `GhostPrediction`) — is
fully supported and **driven by nothing in the product.** Dead code. The one feature
impossible on Ethereum is switched off while we polished button transitions.

## 2. Diagnosis: why "polished" ≠ "wow"

Cinema is still structurally "a force-directed blob + a list of cards." The core act —
pan, zoom, click a node, read a panel — is identical to every explorer. The Trust Ladder and
disclosure UI are real differentiators but are presented as *panels you read*, not *powers you
wield*.

A superpower has three properties this product lacks:
1. It shows something you literally could not see anywhere else (not "prettier").
2. It collapses a hard, slow, expert task into an obvious, instant, novice task.
3. It makes you feel something — confidence, alarm, understanding — in the first 3 seconds.

Infrix's substrate — intent → policy → approval → execution → outcome → evidence → anchor →
witness → disclosure, **with a captured plan and a portable proof** — is the richest
governance/provenance dataset on any ledger. We visualize ~20% of what it enables.

## 3. North Star, evolved

Round 1: *"Trust you can see, replay, and verify."* A–F delivered **see**, not **replay** (the
scrubber moves a graph; it doesn't tell a story) and not **verify** (the ladder *asserts*
trust; the user never *performs* a verification).

New North Star: **"The instrument that makes a governed action self-evident and self-proving —
to a novice, in seconds, in ways impossible on any other ledger."** Three verbs, ranked by wow
× uniqueness:

- **PROVE** — you press a button and *watch* it verify (only possible because Infrix ships
  portable proof + replay capsules). Highest wow, deepest moat.
- **EXPLAIN** — the scene narrates and flies itself; causality is a lit path. Delivers the name
  "Cinema," which today is false advertising.
- **COMPARE** — predicted vs actual; what-if disclosure. The counterfactual no EVM tool can
  show.

## 4. The superpowers (summary; detail in the wave runbooks)

### WAVE G — Make "Cinema" actually cinematic
- **G1 Causal Autoplay `[P0]`** — a "Play story" mode that flies the camera stage-by-stage with
  synchronized captions + dimming, ending on the anchor confirmation. The data already knows
  the storyline (`stageForKind`, causal edges). New `cinematic.js` + caption track.
- **G2 Trust Posture ambient field `[P0]`** — a frame-edge aura colored by the scene's ceiling
  assurance (grey→blue→gold→green), blooming gold at the anchor moment; a one-glyph posture
  chip. Drive from `buildLadder` (zero new trust logic).
- **G3 Self-explaining scene + zero-onboarding spotlight `[P1]`** — plain-language scene
  summary, a 3-step first-run spotlight (localStorage-remembered), and in-context
  first-encounter node-kind labels so the vocabulary teaches itself.

### WAVE H — Verifiability you *perform*
- **H1 "Verify it yourself" `[P0, killer feature]`** — a verification theatre that runs the
  bundle's real checks in-browser (structural → replay → anchor → witness) and animates each
  passing, lighting the matching Trust Ladder rung; ends in "verified by you, not by us."
  Wires the live verifier (`buildReceiptFromVerifier`) Cinema currently mounts statically.
- **H2 Causal provenance tracing `[P1]`** — "Trace/Why?" on any node walks the typed causal
  edges to render a lit, annotated chain back to intent and forward to anchor.

### WAVE I — Counterfactual (EVM-impossible)
- **I1 Predicted-vs-Actual (revive the ghost) `[P0, dead code today]`** — a Plan-vs-Actual view
  that renders the plan as the ghost overlay and reality as the solid graph, drift edges where
  they diverge, a drift summary, and a "drift only" filter.
- **I2 Disclosure-as-a-dial `[P2]`** — preview the scene as it would look under a chosen grant,
  surfacing "revealing these fields does not change the proven outcome."

### WAVE J — Situational awareness & scale
- **J1 Vitals strip `[P1]`** — replace raw `Block/Gas/Nodes/Edges` telemetry with posture: TPS,
  gas rate, breaker pips, anomaly count, mini trust ladder, sealed/disclosable — each
  click-jumps.
- **J2 Minimap + overview/clustering `[P1]`** — a draggable minimap + semantic zoom-out that
  collapses subsystems into labeled super-nodes.
- **J3 Timeline as instrument `[P1]`** — event-density histogram, trust-over-time track,
  anomaly spikes, chapter markers, "moments that matter" auto-bookmarks.
- **J4 Alternative projections `[P2]`** — Sankey (flow) and adjacency-matrix (density) views
  from the same SceneGraph.

### WAVE K — Lenses & questions
- **K1 Role lens `[P1]`** — Auditor / Operator / Regulator / Agent-dev reframe the same scene's
  emphasis, filters, and entry view.
- **K2 Question-based smart chips `[P2]`** — one-tap saved queries ("Unanchored outcomes",
  "Anything an agent was stopped from", "Steps that drifted from plan").

### WAVE L — Living artifacts
- **L1 Shareable moment links `[P1]`** — "Copy link to this moment" encodes mode + position +
  camera + lens in a URL that restores the exact framed moment with a live Trust Ladder; plus a
  real embed snippet. Disclosure context still fail-closed gates the recipient.

## 5. Prioritized sequencing

**Wave G + H first — this is the entire "wow":** H1 (the moat), G1 (delivers the name), G2
(feel it in 3s), I1 (the EVM-impossible insight, mostly already built). Those four produce the
gasp. Then G3, H2, J1, J3, J2 → L1 → K1 → J4/K2/I2.

## 6. Honest closing

The first six tiers were necessary and not sufficient — the cost of entry. The product thesis
— *insight unavailable on any blockchain project* — lives almost entirely in features not yet
built, one of which (the ghost graph) is built and switched off. It doesn't feel "wow" because
the budget went to making it *not look broken* instead of making it *unbelievable*. The good
news: the substrate is the richest on any ledger, the renderer already supports the hardest
pieces (ghost overlay, camera animation, highlight, trust model), and the four highest-wow
features are mostly wiring + one overlay each on top of A–F. The launchpad is finished. We
just haven't launched.
