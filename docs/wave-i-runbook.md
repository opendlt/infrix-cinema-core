# Wave I — Implementation Runbook · Counterfactual (EVM-impossible)

> From [Round-2 review](./ui-ux-critical-review-round2.md): **I1 Predicted-vs-Actual (revive
> the ghost), I2 Disclosure-as-a-dial.** Ground rules: see
> [wave-g-runbook.md](./wave-g-runbook.md) §"Ground rules".

> The renderer ALREADY supports the hard part: `setGhostGraph`, the translucent ghost overlay,
> and the plan/ghost node-kinds + `Drift`/`GhostMismatch` colors. Wave I is mostly **wiring +
> one view toggle + a diff builder** — it activates code that exists and is unused.

## New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `drift.js` | classic script | before `app.js` | I1 plan/actual split + drift diff (pure) + controller |
| `drift.test.mjs` | node test | — | I1 diff units |

CSS → `styles.css`. (I2 reuses `disclosureView.applyDisclosure`; no new module.)

## I1 — Predicted-vs-Actual (`drift.js`, `app.js`, `controls.js`, `renderer.js`, CSS)

**Data sources.** A plan may arrive as: (a) plan node-kinds inside the scene
(`plan_timeline`, `plan_step`, `ghost_prediction`, `ghost_actual`, `ghost_drift`), or (b) a
separate `proof.plan` / `options.plan` subgraph. Support both.

**Pure core (testable):**
- `splitPlanActual(graph, plan?)` → `{ actual: SceneGraph, ghost: SceneGraph }`. If the scene
  carries plan/ghost kinds, partition them; else use the provided `plan` as the ghost and the
  scene as the actual. Disclosure-safe (operates on already-filtered nodes).
- `computeDrift(actual, ghost)` → `{ matched:[ids], drifted:[{ stepId, field, predicted,
  actual }], driftEdges:[{ fromId, toId }] }`. Pair predicted↔actual by step id / stage; flag
  field divergences (gas, outcome, status). Never reads a redacted value (compares only
  disclosed fields; a sealed step reports "sealed — comparison withheld").
- `driftSummary(drift)` → plain text: *"3 of 4 steps matched the plan. Step 3 diverged:
  predicted gas 40k, actual 120k."*

**Controller:** `InfrixCinema.DriftView({ renderer })` with
`apply(graph, plan)` / `clear()`:
- `apply`: `splitPlanActual` → `renderer.setGhostGraph(ghost)` + `renderer.setSceneGraph(actual)`;
  compute drift; set drift edges via a renderer overlay (reuse `ghost_drift` color
  `GhostMismatch`); stash `driftSummary` for the UI.
- `clear`: `renderer.clearGhostGraph()`; restore.

**View toggle (controls):** add **"Plan vs Actual"** to the Graph/Narrative/Split toggle (only
enabled when a plan is present). Selecting it calls `DriftView.apply`; leaving it calls
`clear()`. A **drift summary chip** shows `driftSummary`. A **"Drift only" filter** (reuse the
Wave-B search/dim machinery) hides matched nodes, leaving only divergences.

**Scrub support:** as replay advances, the actual subgraph updates while the ghost stays —
so the user watches reality "catch up to" or "drift from" the plan in lockstep (the ghost is
fixed; the actual is the `getStateAt(pos)` scene).

**Renderer note:** the ghost overlay already renders at 0.25 alpha; ensure drift edges draw on
top in `GhostMismatch` and are dirty-marked (E3). No change to disclosure handling — both
subgraphs pass through `applyDisclosure` upstream.

**Acceptance.** For a scene/bundle with a captured plan, the user sees the predicted subgraph
ghosted under the actual, drift edges where they diverge, a one-line drift summary, and a
"drift only" mode isolating exactly where reality departed from the plan — an insight
impossible on any chain without captured intent. With no plan present the toggle is disabled
(not broken).

## I2 — Disclosure-as-a-dial (`app.js`, `disclosureView.js` reuse, CSS)

**Build.** A **grant selector** (chips for the grants visible in the scene). Selecting a grant
re-runs `applyDisclosure(rawScene, { ...disclosureContext, grants: hypotheticalSet })` and
re-renders, previewing what *would* be visible — without changing the real disclosure context.
Surface the honest invariant: *"Revealing these fields does not change the proven outcome."*
A "reset" returns to the viewer's real grants.

- Requires the **pre-disclosure** scene to preview reveals. Where Cinema only holds the
  already-filtered scene (most sources), the dial can only *re-seal further* or show the
  disclosed-via labels it already has; document this honestly and gate the "reveal preview"
  to sources that expose `rawScene` (proof bundles that include sealed payloads the viewer is
  entitled to under a grant). Never reveal beyond what the grant authorizes (fail-closed —
  same `decide()` table).

**Acceptance.** A viewer previews "what an auditor holding grant X would see" and visually
confirms the proof/outcome is unchanged by disclosure; the preview never exceeds what the grant
authorizes; reset restores the real view.

## Tests

- `drift.test.mjs`: `splitPlanActual` partitions plan/ghost kinds; `computeDrift` pairs steps
  and flags gas/outcome divergence; sealed step → "comparison withheld" (no redacted value
  read); `driftSummary` text; no-plan → empty drift.
- Headless smoke (extend): Plan-vs-Actual toggle sets a ghost graph on the renderer + a drift
  summary; "drift only" dims matched nodes; toggle disabled when no plan.
- `shape.test.mjs` green.

## Definition of done

I1 (+I2 where source data allows) acceptance met; `npm test` + all smokes green; no new deps;
`file://`-safe; disclosure invariants intact (no redacted value compared/revealed); the ghost
overlay is now driven by the product; reduced-motion fine; teardown clean.
