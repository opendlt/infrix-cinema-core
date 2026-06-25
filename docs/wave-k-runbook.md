# Wave K — Implementation Runbook · Lenses & questions

> From [Round-2 review](./ui-ux-critical-review-round2.md): **K1 Role lens, K2 Question-based
> smart chips.** Ground rules: see [wave-g-runbook.md](./wave-g-runbook.md) §"Ground rules".

## New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `lens.js` | classic script | before `app.js` | K1 role-lens config (pure) + applicator |
| `smartFilters.js` | classic script | before `app.js` | K2 saved-query definitions (pure) + chips |
| `lens.test.mjs`, `smartFilters.test.mjs` | node tests | — | units |

CSS → `styles.css`.

## K1 — Role lens (`lens.js`, `app.js`, `controls.js`, CSS)

**Pure config:** `LENSES` = a declarative table keyed by role:
```
auditor:   { emphasizeKinds:['evidence','anchor','witness','disclosure_grant'],
             defaultView:'split', autoVerify:false, showDrift:true, primaryAction:'verify' }
operator:  { emphasizeKinds:['circuit_breaker','contract','account'],
             defaultView:'graph', showVitals:true, primaryAction:'jumpAnomaly' }
regulator: { emphasizeKinds:['policy','approval_gate','disclosure_grant','intent','outcome'],
             defaultView:'narrative', autoPlay:true, primaryAction:'playStory' }
agentDev:  { emphasizeKinds:['intent','policy','approval_gate'],
             defaultView:'graph', showAgentRibbon:true, primaryAction:'verify' }
```
`applyLens(role)` returns the resolved settings; `lensEmphasis(graph, role)` → node ids to
emphasize (everything else de-emphasized, NOT hidden — opacity, reuse highlight).

**Applicator (app):** a **role selector** (Auditor / Operator / Regulator / Agent-dev) in the
controls. Selecting a role: sets the view mode, runs the lens emphasis, toggles the relevant
surfaces (vitals/drift/agent-ribbon/auto-play per config), and runs the role's primary action
(e.g. Regulator → narrative + Play story; Operator → vitals + jump to anomaly). Persisted in
`localStorage`. Pure reframing of the SAME disclosed data — never changes what's visible for
disclosure, only emphasis/entry.

**Acceptance.** Selecting "Regulator" reframes Cinema into a disclosure-and-approvals story on
auto-play; "Operator" into a vitals-forward live view jumped to the anomaly — each with zero
manual configuration, all from the same scene.

## K2 — Question-based smart chips (`smartFilters.js`, `app.js`, `controls.js`, CSS)

**Pure definitions:** `SMART_FILTERS` = `[{ id, label, predicate(node, ctx) }]`, each a real
question answered over data already present:
- "Unanchored outcomes" → outcome nodes whose evidence isn't anchored.
- "Stopped agent actions" → agent-refusal nodes / `prevented`.
- "Sealed but disclosable to me" → redacted nodes with a held `grantId`.
- "Steps that drifted from plan" → nodes flagged by Wave-I drift (when present).
- "Frozen or anomalous" → `breakerState==='frozen' || anomalyScore>0`.
`runSmartFilter(graph, id, ctx)` → matched ids (reuses the Wave-B matcher/dim path).

**Chips (app/controls):** a row of one-tap chips near the search box. Tapping a chip runs the
filter (dim non-matches via the existing search machinery), shows a count, and `fitToNodes` the
matches. Users can also save the current `parseSearchQuery` query as a named chip
(`localStorage`).

**Acceptance.** A regulator taps "Unanchored outcomes" and instantly sees exactly the
not-yet-independently-verifiable results, framed and counted — no query syntax learned; custom
queries can be saved as chips.

## Tests

- `lens.test.mjs`: `applyLens` resolves each role's settings; `lensEmphasis` selects the right
  kinds; unknown role → safe default.
- `smartFilters.test.mjs`: each predicate selects the intended nodes on a sample scene;
  disclosure-safe (grant check); empty when none match.
- Headless smoke (extend): role selector reframes (view mode changes, emphasis applied); a
  smart chip dims non-matches + counts + fits.
- `shape.test.mjs` green.

## Definition of done

K1–K2 acceptance met; `npm test` + all smokes green; no new deps; `file://`-safe; lenses/chips
only reframe disclosed data (no disclosure bypass); teardown clean.
