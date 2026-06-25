# Tier C — Verification Report

Status: **COMPLETE.** C1 Trust Ladder, C2 disclosure UI, C3 agent-stop ribbon, D3
anchor-confirmation moment, and C4 narrative polish — all implemented against
[tier-c-runbook.md](./tier-c-runbook.md). `npm test` green (46 tests); Tier C headless smoke
green (8/8); Tier A/B smokes still green (no regression).

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **C1 hero Trust Ladder** | `trustLadder.js` (new), `proofPanel.js`, `narrativePanel.js`, `detailsPanel.js`, `tooltip.js`, `app.js` | One shared `TrustLadder` (Offline→Replay→L0→Witness meter, filled to the honest ceiling, ceiling haloed, unbacked rungs dashed). Replaces BOTH the proof badge and the narrative receipt badge. Rungs are buttons → highlight the nodes they're about (reuses `sync.highlightNodes`). Per-node assurance chips in details + tooltip, derived only from governing narrative events (never invented). |
| **C2 disclosure UI** | `renderer.js`, `detailsPanel.js`, `app.js`, `styles.css` | Deliberate **sealed** node treatment (frosted disc + shimmer + dashed seal ring + lock; disclosable-via-grant accent) with fixed size/opacity preserved. Details shows **"Provably hidden"** + "Disclosable via <grant>" + the honest "did not change the proven outcome" line. Scene **disclosure chip** ("N sealed · M disclosable to you"). |
| **C3 agent-stop ribbon** | `agentRibbon.js` (new), `app.js`, `styles.css` | Detects agent-receipt scenes and renders a horizontal stepper terminating in an emphatic **⛔ barrier** with the rule code + plain-language "the agent tried X; the policy stopped it (CODE)". Export button (JSON receipt) for shareability. Hidden for non-agent scenes. |
| **D3 anchor moment** | `renderer.js`, `app.js`, `trustLadder.js` | `renderer.playAnchorConfirmation` — one-time ~800ms beam from evidence → L0 anchor + crystallize ring; `trustLadder.pulse('l0')`. Fires when the replay head reaches the anchor stage (or once on open in proof mode) and the bundle is genuinely anchored. Reduced-motion → no-op. |
| **C4 narrative polish** | `narrativePanel.js`, `narrativeTemplates.js`, `app.js` | Stage icons + a "what this proves" line per card; optional curated server-supplied headline override (`options.narrativeHeadlines`), template as fallback. |

Cross-cutting: `trustLadder.js` + `agentRibbon.js` registered in `loader.js` (integrity fence
green); agent ribbon cleaned up in `destroy()`; all assurance displays read the same capped
model; disclosure invariants preserved everywhere.

## How it was verified

**Unit (`npm test`, 46 tests, all pass):** adds `trustLadder.test.mjs` (6 — ceiling per
bundle, honest backing, witness-without-anchor cannot claim witness) and `agentRibbon.test.mjs`
(4 — step ordering, refusal detection + tone, ok path, non-agent). Prior Tier A/B units +
loader/orphan fence remain green.

**Headless smoke (DOM shim, scratchpad — not shipped):**
- C1 — proof mode renders a 4-rung Trust Ladder with the ceiling at **L0** for an anchored
  bundle; clicking the L0 rung highlights the anchor node (others dim to 0.18); the details
  panel shows a per-node **assurance** chip.
- C2 — the redacted node's details show "provably hidden", the disclosable grant, and the
  honest note; the scene disclosure chip reads "1 sealed · … disclosable".
- D3 — the anchor-confirmation moment is playing (`evidence→anchor`) on proof open.
- C3 — an agent refusal scene shows the ribbon with a `.barrier` step carrying the rule code
  and a plain-language why; switching to a non-agent scene hides the ribbon.
- Tier A (4-mode lifecycle) and Tier B (interaction) smokes re-run green.

## Acceptance criteria — met

- **C1** flagship ladder unifies both badge surfaces; hover explains; click highlights;
  per-node chips honest. ✅
- **C2** deliberate sealed treatment (fixed size); details explain what's provable + grant;
  scene summary chip. ✅
- **C3** emphatic stop barrier with rule + plain language; shareable; hidden otherwise. ✅
- **D3** one-time anchor confirmation synced to the anchor stage + ladder pulse; reduced-motion
  safe. ✅
- **C4** stage icons + "what this proves" + optional server headline override. ✅

## Disclosure & assurance invariants — preserved

The ladder is capped (`buildLadder` never marks a rung backed without its evidence — unit
verified: witnesses without an anchor cannot reach witness). Per-node assurance is derived
only from governing events; nodes with none get no chip. Sealed nodes keep their fixed
size/opacity; details/tooltip read only the redacted label; the anchor moment only fires when
`proof.anchor` is genuinely confirmed.
