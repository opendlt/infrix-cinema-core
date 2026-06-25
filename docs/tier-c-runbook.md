# Tier C — Implementation Runbook

> No-cut-corners plan for **Tier C (make the superpower visible)** from the
> [UI/UX Critical Review](./ui-ux-critical-review.md): **C1 hero Trust Ladder, C2 disclosure
> UI, C3 agent-stop ribbon, D3 anchor-confirmation moment** (+ **C4** narrative copy polish).
> Same ground rules as [Tier A](./tier-a-runbook.md)/[Tier B](./tier-b-runbook.md):
> classic-script IIFEs, no deps, `file://`-safe, loader + parity fences green,
> disclosure/assurance invariants preserved.

## New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `trustLadder.js` | classic script | before `proofPanel.js` | C1 shared Trust Ladder component + pure `buildLadder` |
| `agentRibbon.js` | classic script | before `app.js` | C3 agent-stop ribbon + pure `agentRibbonModel` |
| `trustLadder.test.mjs` | node test | — | C1 ladder model units |
| `agentRibbon.test.mjs` | node test | — | C3 ribbon model units |

CSS additions → `styles.css`. No new stylesheet.

## C1 — hero Trust Ladder (`trustLadder.js`, `proofPanel.js`, `narrativePanel.js`, `app.js`)

- **Pure `buildLadder(proof)`** → `{ ceilingId, ceilingRank, rungs:[{id,label,note,backed,isCeiling}] }`
  over the canonical `ASSURANCE_ORDER` (offline→replay→l0→witness). `offline` is always
  backed (structural); `replay` if `proof.replay||frames`; `l0` if `proof.anchor` confirmed;
  `witness` if anchored **and** witnessed. Honest cap: never marks a rung backed without its
  evidence.
- **`TrustLadder` component**: a horizontal 4-stop connected meter (Offline→Witness), filled
  to the ceiling, ceiling rung haloed, unbacked rungs dashed/dim. Each rung is a button:
  `title`/`aria` = the rung note; click → `opts.onRungClick(rungId)`. `setProof(proof)` and
  `pulse(rungId)` (for the anchor moment).
- **Unify the two badges**: `proofPanel.js` mounts a `TrustLadder` at the top (keeping the
  per-stage list); `narrativePanel.js` receipt header mounts the same component (compact).
  Both now read the same model — the divergent badge treatments are gone.
- **Per-node assurance** (no fabrication): app derives `nodeAssurance[id]` from narrative
  events (`event.assurance` over `event.graphNodeIds`), surfaced as a chip in the details
  panel and the hover tooltip. Nodes with no governing event simply have no chip.
- **Rung → graph highlight**: app maps rung→nodes (l0→anchor/l0_bridge, witness→witness/
  evidence, replay→all, offline→none) and reuses `sync.highlightNodes(ids)`.
- **Scrubber ticks** also carry `data-assurance` for a subtle visual tie-in.

## C2 — disclosure as a first-class object (`renderer.js`, `detailsPanel.js`, `tooltip.js`, `app.js`)

- **Sealed node treatment**: replace the bare 🔒 with a deliberate sealed look — a frosted
  desaturated fill, a dashed "seal" ring, a faint shimmer (particlePhase), lock glyph
  centered. Fixed size/opacity preserved (never leak magnitude). Disclosed-via-grant nodes get
  an "unlockable" accent.
- **Details panel**: a redacted node shows **"Provably hidden"** — what's known (kind, that it
  participated), **"Disclosable via grant <id>"** when `grantId` present, and the honest line
  **"This redaction did not change the proven outcome."**
- **Scene disclosure chip**: a stage pill — "N sealed · M disclosable to you" — shown only
  when `N>0`; counts from the disclosed scene (reuse the renderer scene).

## C3 — agent-stop ribbon (`agentRibbon.js`, `app.js`)

- **Pure `agentRibbonModel(scene)`** → `{ steps:[{id,label,tone}], refusal:{code,label}|null,
  ok:bool }` from an agent scene (`scene.meta.source==='agent'`), ordered by node x; tones by
  id (request=info, approval=ok/warn/dim, execution/proof=ok, prevented=fail).
- **`AgentRibbon` component**: a horizontal stepper overlaying the stage when an agent scene
  is detected; the refusal step renders as an emphatic **barrier** with the rule code +
  plain-language "the agent tried X; the policy stopped it (CODE)". An **Export** button wires
  to the existing exporter (JSON receipt) — dependency-free shareability. Hidden for
  non-agent scenes.

## D3 — anchor-confirmation moment (`renderer.js`, `app.js`, `trustLadder.js`)

- **`renderer.playAnchorConfirmation(evidenceId, anchorId)`**: a one-time ~800ms beam from
  the evidence node to the anchor node + a crystallize pulse on the anchor; gated by
  `prefers-reduced-motion` (snap = no-op). Drawn as a transient decoration in `render()`.
- **Trigger**: when the replay head first reaches the `anchor` narrative event **and** the
  proof is L0-anchored, app calls `playAnchorConfirmation` (evidence + anchor nodes by kind)
  and `trustLadder.pulse('l0')`. Fires once per scene/position-cross.

## C4 — narrative copy polish (`narrativeTemplates.js`, `narrativePanel.js`)

- Honor an **optional server-supplied headline** (`event.headline` already exists; allow a
  curated `graph`/`proof` headline override path) — keep templates as fallback; never leak a
  redacted value.
- Add a **stage icon** + a one-line **"what this proves"** to each narrative card. Copy stays
  honest and disclosure-capped.

## Tests

- `trustLadder.test.mjs`: ceiling computation across offline/replay/l0/witness bundles;
  `backed` flags honest (no anchor → l0 not backed); ceiling rung flagged.
- `agentRibbon.test.mjs`: step ordering by x; refusal detection + tone; ok path has no
  refusal; non-agent scene → null/empty.
- `shape.test.mjs` integrity fence stays green (new modules wired in loader).
- Headless smoke extended: proof mode mounts a Trust Ladder; rung click highlights anchor
  nodes; sealed node renders without throwing + details shows "Provably hidden"; agent scene
  shows the ribbon + barrier; scrubbing to the anchor fires the confirmation once.

## Definition of done

All C1–C3 + D3 (+ C4) acceptance met; `npm test` green; headless smoke green; no new deps;
`file://`-safe; disclosure/assurance invariants intact (capped ladder, no per-node assurance
invented, sealed size preserved); new listeners/rAF cleaned up in `destroy()`.
