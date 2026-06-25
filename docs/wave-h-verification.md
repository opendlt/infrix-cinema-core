# Wave H — Verification Report

Status: **COMPLETE.** H1 "Verify it yourself" theatre and H2 causal provenance tracing,
implemented per [wave-h-runbook.md](./wave-h-runbook.md). `npm test` green (75 tests); a Wave-H
headless smoke green (5/5); all A–F + Wave-G smokes still green (no regression).

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **H1 Verify-it-yourself** | `verify.js` (new), `controls.js`, `app.js`, `styles.css` | A **"✓ Verify"** button opens a **theatre** that re-checks the bundle *in the browser* and animates each step `pending → ⟳ running → ✓ passed / ✗ failed / — not in bundle`, lighting the matching Trust Ladder rung as each passes, ending in *"You just re-derived this result yourself, verified to L0 — you did not have to trust the serving node."* Checks: **structural** (cross-refs resolve + declared assurance doesn't overclaim the artifacts + content fingerprint), **replay** (fold the capsule frames to a final state in-browser, compare the re-derived fingerprint to the declared outcome), **anchor** (L0 reference present + consistent; stated plainly as not re-checked live), **witness** (co-signatures present + well-formed). A host can inject `options.verifier` for real crypto. |
| **H2 Causal provenance trace** | `provenance.js` (new), `renderer.js`, `detailsPanel.js`, `app.js`, `styles.css` | A **"🔍 Trace / Why?"** action on any node walks the typed causal edges **backward to intent** and **forward to anchor**, lights the chain as a **golden path** (`renderer.setTracePath`), dims the rest, and lists the annotated hops (with proof refs) in the details panel. Background click clears it. |

Cross-cutting: two new modules wired into `loader.js` (integrity fence green); the theatre's
keydown + the trace path are cleaned up (`close()`/`clearTracePath()`/`destroy()`).

## How it was verified

**Unit (`npm test`, 75 tests, all pass):** adds `verify.test.mjs` (8) and `provenance.test.mjs`
(6). **Honesty is enforced by unit tests:** the plan marks steps runnable only when the bundle
backs them; a **dangling edge fails structural**; a bundle that **overclaims its assurance
fails structural** (the check computes the ceiling from the *artifacts*, not the declared
label); a **tampered outcome fails replay**; an injected verifier overrides the built-in check;
the fingerprint is deterministic + order-independent. Provenance reaches intent backward +
anchor forward, carries proof refs, is cycle-safe, and is disclosure-safe.

**Wave-H headless smoke (DOM shim, scratchpad — not shipped):**
- H1 — clicking Verify opens the theatre; structural + anchor reach `passed`; trust rungs
  pulse; the verdict is "ok" with the "re-derived … yourself" message; `Esc` closes it.
- H1 — an **overclaiming bundle** (`assurance: witness` with no witnesses/anchor) **fails
  structural** and the verdict is not-ok — the moat refuses to bless an unbacked claim.
- H2 — Trace sets the renderer trace path (incl. `i1→p1`), renders provenance hops, and shows
  the `approvals#3` proof ref; background click clears the trace.
- All A–F + Wave-G smokes re-run green.

## Acceptance criteria — met

- **H1** one click runs the bundle's real checks in-browser and animates each passing while the
  rungs light, ending in "verified by you, not by us"; a capsule-less bundle marks that step
  unavailable and caps honestly; **no step ever claims a level the bundle doesn't back**
  (unit-enforced). ✅
- **H2** from any node, one action reveals the lit, annotated causal chain to intent and
  anchor; clearing restores the scene. ✅

## Disclosure & assurance invariants — preserved

The verifier never fabricates a rung — overclaiming bundles fail, and the verdict caps at the
highest *passed* rung. Provenance reads only ids/kinds + already-redacted labels (no value
leak). The trace highlight dims via opacity only; sealed sizing untouched.
