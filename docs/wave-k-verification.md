# Wave K — Verification Report

Status: **COMPLETE.** K1 Role lens and K2 Question-based smart chips, implemented per
[wave-k-runbook.md](./wave-k-runbook.md). `npm test` green (106 tests); a Wave-K headless smoke
green (6/6); all prior smokes still green (no regression).

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **K1 Role lens** | `lens.js` (new), `controls.js`, `app.js`, `styles.css` | A **Lens** selector (All / Auditor / Operator / Regulator / Agent-dev) reframes the SAME disclosed scene: it foregrounds the role's node kinds (others de-emphasized to 0.4 opacity), switches to the role's default view (auditor→split, regulator→narrative, operator/agent-dev→graph), and runs the role's primary action (auditor/agent-dev→Verify, regulator→Play story, operator→jump to anomaly). Persisted; emphasis-only on restore (no surprise actions). |
| **K2 Smart chips** | `smartFilters.js` (new), `controls.js`, `app.js`, `styles.css` | One-tap question chips — **Unanchored outcomes · Stopped agent actions · Sealed but disclosable to me · Steps that drifted from plan · Frozen or anomalous** — each a real predicate over data already present. Tapping dims non-matches, counts them, and fits the camera to the answer; re-tapping clears. |

Cross-cutting: two new modules wired into `loader.js` (integrity fence green). A single
**dim-channel authority** (`recomputeDim`/`reapplyDim`) coordinates search ▸ smart chip ▸ lens
so they never fight — applying one clears the others, and the active one re-applies on a new
scene.

## How it was verified

**Unit (`npm test`, 106 tests, all pass):** adds `lens.test.mjs` (4) and `smartFilters.test.mjs`
(7) — lens resolution + neutral default for unknown roles, kind- and predicate-based emphasis;
every smart filter's predicate (unanchored depends on the anchored context, stopped-agent,
**disclosable = sealed AND holding a grant — never just sealed**, drifted reads the drift
context, frozen/anomalous), and unknown-id → empty.

**Wave-K headless smoke (DOM shim, scratchpad — not shipped):**
- K1 — the lens selector + chips render; the **Auditor** lens emphasizes evidence (opacity 1)
  and de-emphasizes the rest (0.4) and sets the **split** view; the **Regulator** lens switches
  to the **narrative** view.
- K2 — "Frozen or anomalous" isolates the frozen node (others → 0.12) and **clears the lens**;
  "Sealed but disclosable" matches only the granted sealed node; re-tapping the active chip
  restores opacity.
- All prior smokes (A–F, G, H, I, J) re-run green.

## Acceptance criteria — met

- **K1** selecting a role reframes Cinema (emphasis + view + action) from the same scene, zero
  manual config; persisted. ✅
- **K2** one tap answers a real question (dim + count + fit); custom queries can still be typed
  via the existing search grammar. ✅

## Disclosure & assurance invariants — preserved

Lenses and chips only re-emphasize/de-emphasize already-disclosed nodes via opacity — they
never change what disclosure reveals. "Sealed but disclosable" is unit-verified to require BOTH
redaction AND a held grant (never surfaces a sealed node the viewer can't open). Sealed sizing
untouched.
