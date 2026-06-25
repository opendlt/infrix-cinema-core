# Wave H — Implementation Runbook · Verifiability you *perform*

> From [Round-2 review](./ui-ux-critical-review-round2.md): **H1 "Verify it yourself"
> theatre, H2 Causal provenance tracing.** Ground rules: see
> [wave-g-runbook.md](./wave-g-runbook.md) §"Ground rules".

## New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `verify.js` | classic script | before `app.js` | H1 in-browser verification engine + theatre |
| `provenance.js` | classic script | before `app.js` | H2 causal-chain walker (pure) + trace controller |
| `verify.test.mjs` | node test | — | H1 check-plan + capping units |
| `provenance.test.mjs` | node test | — | H2 chain-walk units |

CSS → `styles.css`.

## H1 — "Verify it yourself" (`verify.js`, `proofPanel.js`/`trustLadder.js`, `app.js`, CSS)

**The principle.** Trust-you're-told is what every explorer offers. Trust-you-*perform* is the
moat: Infrix ships portable proof + replay capsules, so the browser re-verifies WITHOUT
trusting the server. The theatre must run *real* checks and animate each passing.

**Pure core (testable):** `buildVerificationPlan(proof)` → ordered steps the bundle supports:
```
[{ id:'structural', label:'Bundle is internally consistent', rung:'offline', runnable:true },
 { id:'replay',     label:'Re-executed from the capsule',     rung:'replay',  runnable:hasFrames },
 { id:'anchor',     label:'Anchored on Accumulate L0',        rung:'l0',      runnable:hasAnchor },
 { id:'witness',    label:'Independent witnesses co-signed',  rung:'witness', runnable:hasWitness }]
```
Non-runnable steps render as "not in this bundle" and the ladder caps honestly (reuse
`buildLadder`/`capAssurance`). No step may claim a rung the bundle doesn't back.

**Verification engine:** `InfrixCinema.verifyBundle(proof, { onStep })` → async, runs each
runnable step and reports `onStep(id, 'running' | 'passed' | 'failed', detail)`:
- `structural` — recompute the bundle's declared digests over its artifacts and compare (the
  same structural check the existing `buildReceiptFromVerifier` performs). Pure/offline.
- `replay` — deterministically re-execute the portable capsule (`proof.frames`/`proof.replay`)
  and confirm the outcome digest matches. (Reuse the canonical replay routine the README's
  in-browser verifier uses; import `/lib/proofReceipt.js` when reachable, else fall back to a
  structural-only pass and mark replay "unavailable here".)
- `anchor` — compare the evidence digest against `proof.anchor` (txHash/block); where an L0
  endpoint is reachable, confirm the record. Offline bundle → "anchor present, not re-checked
  against L0 here" (honest, capped).
- `witness` — verify the co-signatures present in `proof.witness`.
Engine never throws to the UI; failures resolve to `failed` with a reason.

**Theatre (DOM overlay):** `InfrixCinema.VerifyTheatre(hostEl, { proof, ladder, onClose })`:
- A modal overlay listing the plan; each step row flips `pending → ⟳ running → ✓ passed`
  (or `✗ failed` / `— not in bundle`) with a confirm animation.
- As each runnable step passes, **light the matching Trust Ladder rung** (`ladder.pulse(rung)`).
- Footer verdict: on full success, *"You just re-derived this result yourself — you did not
  have to trust the serving node."* On partial, plain-language explanation of the ceiling.
- `Esc` / outside-click / Close button dismiss; focus-trapped; `aria-live` announces results.
- Reduced-motion: instant state flips, no confetti/sweep.

**Trigger:** a prominent **"Verify this myself"** button on the proof rail and the posture chip
(G2). `app.js` constructs the theatre lazily on click with the active `proof` + the proof/
narrative `ladder` handle.

**Acceptance.** One click runs the bundle's real checks in the user's browser and animates each
passing while the trust rungs light, ending in "verified by you, not by us." A bundle missing a
capsule shows that step as unavailable and the ladder caps correctly. No step ever claims a
level the bundle doesn't back (unit-enforced).

## H2 — Causal provenance tracing (`provenance.js`, `renderer.js`, `app.js`, `detailsPanel.js`, CSS)

**Pure core (testable):** `traceCausalChain(graph, nodeId)` → `{ nodes:[ids], edges:[ids],
hops:[{ fromId, toId, edgeKind, proofRef }] }`. Walk the typed causal edges
(`intent_to_outcome`, `approval`, `policy_check`, `capability_exercise`, `evidence_link`,
`evidence_chain`, `evidence_anchor`, `anchor_link`) **backward** to the originating `intent`
and **forward** to the `anchor`. Cycle-safe (visited set); disclosure-safe (reads only ids/kinds
+ the redacted labels already present).

**Trace controller:** on a node's **"Trace / Why?"** action (context action + a button in the
details panel), compute the chain and:
- Highlight the chain as a **lit golden path** (reuse `sync.highlightNodes` for the node set;
  add a renderer path-emphasis for the chain edges — a brighter stroke for `hops`).
- Annotate each hop in the details panel: *"authorized by approval #3, bound to plan hash …"*
  using `proofRef`s.
- "Clear trace" restores normal opacity.

**Renderer support:** `renderer.setTracePath(edgeKeys)` / `clearTracePath()` storing a Set of
`from→to` keys; in the edge draw loop, render path edges with a brighter, thicker, gold stroke
(gated by reduced-motion for any animation). Mark dirty (E3).

**Acceptance.** From any outcome/evidence node, one action reveals the exact lit, annotated
governance chain back to intent and forward to anchor — "why did this happen and who authorized
it?" answered visually in one click. Clearing restores the scene.

## Tests

- `verify.test.mjs`: `buildVerificationPlan` runnable flags per bundle (offline/replay/anchor/
  witness); engine `onStep` sequence for a full bundle (all pass) and a capsule-less bundle
  (replay → not-runnable, ceiling capped); never reports a rung the bundle lacks.
- `provenance.test.mjs`: `traceCausalChain` reaches intent backward + anchor forward on a sample
  governed scene; cycle-safe; returns empty for an isolated node.
- Headless smoke (extend): clicking Verify opens the theatre, steps reach passed, ladder rungs
  pulse; Trace lights the chain + annotates; Clear restores.
- `shape.test.mjs` green.

## Definition of done

H1–H2 acceptance met; `npm test` + all smokes green; no new deps; `file://`-safe;
**assurance honesty enforced by unit tests** (no fabricated rungs); disclosure invariants
intact; reduced-motion paths verified; teardown clean.
