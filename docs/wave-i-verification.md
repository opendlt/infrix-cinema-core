# Wave I — Verification Report

Status: **COMPLETE.** I1 Predicted-vs-Actual (the ghost graph revived) and I2 Disclosure-as-a-
dial, implemented per [wave-i-runbook.md](./wave-i-runbook.md). `npm test` green (82 tests); a
Wave-I headless smoke green (6/6); all prior smokes still green (no regression).

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **I1 Predicted-vs-Actual** | `drift.js` (new), `renderer.js`, `controls.js`, `app.js`, `styles.css` | A **"⧉ Plan vs Actual"** toggle (shown only when a captured plan is present) renders the **plan as the ghost overlay** under the **actual** graph, draws red **drift edges** where they diverge, shows a plain-language **drift summary** ("1 of 2 steps matched the plan. Step s2 diverged: predicted gas 40000, actual 120000."), and offers a **"Drift only"** filter that dims everything that matched. This finally drives the renderer's long-dead `setGhostGraph` — the EVM-impossible counterfactual no chain without captured intent can show. |
| **I2 Disclosure-as-a-dial** | `app.js`, `disclosureView.js` (reuse), `styles.css` | When a host supplies a pre-disclosure `rawScene`, a **grant dial** previews "what an auditor holding grant X would see" by re-running the **same fail-closed `applyDisclosure`** with a hypothetical grant set — never exceeding what the grant authorizes. Hidden when no `rawScene` is available (documented gating). |

Cross-cutting: `drift.js` wired into `loader.js` (integrity fence green); ghost/drift state torn
down on exit; the disclosure preview translates grant ids to the exact grant keys
`applyDisclosure` checks, so a reveal is scoped to precisely the entitled nodes.

## How it was verified

**Unit (`npm test`, 82 tests, all pass):** adds `drift.test.mjs` (7) — `hasPlan` detection,
`splitPlanActual` partitioning (inline plan-kinds **and** a separate plan subgraph),
`computeDrift` flagging a gas divergence while matching the rest, **a sealed step withholds
comparison (the redacted value is never read)**, `driftSummary` plain-language text, and the
empty case.

**Wave-I headless smoke (DOM shim, scratchpad — not shipped):**
- I1 — the Plan-vs-Actual button is available with plan nodes; toggling sets a **ghost overlay**
  + **drift edges** (the diverging one targets the actual step `x2`) + a "1 of 2 steps matched"
  summary; **Drift only** dims the matched node (`x1` → 0.12) while keeping the drifted one;
  exiting clears the overlay + edges + chip.
- I2 — the dial appears for a `rawScene` carrying grants; the sealed node starts **redacted** and
  is **revealed under its grant** after selecting the chip — and only then.
- All prior smokes (A–F, G, H) re-run green.

## Acceptance criteria — met

- **I1** with a captured plan, the user sees predicted-vs-actual with drift drawn + summarized
  and a "drift only" isolation; with no plan the toggle is hidden (not broken); the renderer's
  ghost overlay is now driven by the product. ✅
- **I2** the dial previews a grant's reveal without exceeding it, and resets — only when a
  pre-disclosure scene is available. ✅

## Disclosure & assurance invariants — preserved

`computeDrift` never reads a redacted value — a sealed step reports a withheld comparison
(unit-verified). The I2 preview re-uses the canonical fail-closed `applyDisclosure`, scoped to
the selected grant's keys, so it can never reveal beyond what the grant authorizes. Drift
highlighting dims via opacity only; sealed sizing untouched.

## Notes

- I2 activates only when a host passes `options.rawScene` (a bundle that ships the sealed
  payloads the viewer is entitled to under a grant). No current data source provides this, so
  the dial is correctly hidden by default — this is the runbook's documented gating, not a gap.
