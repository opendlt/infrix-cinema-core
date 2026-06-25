# Wave J — Verification Report

Status: **COMPLETE.** J1 Vitals strip, J2 Minimap + overview/clustering, J3 Timeline as an
instrument, and J4 Alternative projections, implemented per
[wave-j-runbook.md](./wave-j-runbook.md). `npm test` green (95 tests); a Wave-J headless smoke
green (6/6); all prior smokes still green (no regression).

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **J1 Vitals strip** | `vitals.js` (new), `app.js`, `styles.css` | Replaces the raw `Block/Gas/Nodes/Edges` footer with **posture**: gas/s + ops/s, breaker pips (throttled/paused/frozen), an anomaly badge, sealed/disclosable, and a trust-ceiling chip — each pip **click-jumps** (`fitToNodes`) to the nodes it's about. |
| **J2 Minimap + clustering** | `minimap.js` (new), `cluster.js` (new), `renderer.js`, `app.js`, `styles.css` | A corner **minimap** (downscaled scene + draggable viewport, click-to-recenter) so you never get lost; plus **semantic clustering LOD** — below a zoom threshold the renderer draws labeled super-nodes (by `kindFamily`) with counts + bundled edges instead of a hairball, resolving to detail as you zoom in. |
| **J3 Timeline instrument** | `timelineInstrument.js` (new), `app.js`, `styles.css` | The scrubber gains an **event-density histogram** + a **trust-over-time track** (you can watch trust climb to L0), built from the narrative events. Pure builders also expose chapters + "moments that matter". |
| **J4 Alternative projections** | `projections.js` (new), `controls.js`, `app.js`, `styles.css` | A **Graph / Flow / Matrix** toggle: a **Sankey** (gas/value flow, band width = magnitude) and an **adjacency matrix** (cells = traffic) drawn from the same SceneGraph — the right encoding for flow-heavy or dense scenes. A sealed magnitude is shown as a fixed `[sealed]` band, never a number. |

Cross-cutting: five new modules wired into `loader.js` (integrity fence green); the minimap
interval, projection/minimap canvases, timeline instrument, and vitals strip are all cleaned
up in `destroy()`.

## How it was verified

**Unit (`npm test`, 95 tests, all pass):** adds `vitals.test.mjs` (3), `cluster.test.mjs` (3),
`timelineInstrument.test.mjs` (4), `projections.test.mjs` (3) — vitals counting + rate-from-
history, cluster grouping/centroids/edges, density binning + **monotonic trust climb** +
chapters + moments-that-matter, Sankey flow aggregation with **sealed magnitude withheld** +
matrix traffic counts.

**Wave-J headless smoke (DOM shim, scratchpad — not shipped):**
- J1 — the vitals strip shows frozen/throttled pips, anomaly, sealed, and the L0 trust chip; a
  pip click jumps the camera to those nodes.
- J2 — clusters are set on the renderer; `_clusterLOD()` activates below the zoom threshold and
  draws without throwing, off at normal zoom; the minimap renders + a click recenters.
- J3 — the timeline instrument renders density bars + trust segments above the scrubber.
- J4 — the projection toggle switches Graph → Flow → Matrix → Graph, showing/hiding the overlay.
- All prior smokes (A–F, G, H, I) re-run green.

## Acceptance criteria — met

- **J1** one-glance health/throughput/trust; any concern one click from being framed. ✅
- **J2** never lost (minimap); meaningful structure at altitude (clusters) instead of a hairball. ✅
- **J3** when things happened + when trust became real, visible on the timeline itself. ✅
- **J4** flow-heavy scenes legible as a Sankey; dense scenes as a matrix. ✅

## Disclosure & assurance invariants — preserved

Vitals never leak a sealed magnitude (only counts + edge-gas totals). The Sankey marks a
redacted flow as `[sealed]` (unit-verified) rather than emitting a number. Clustering/minimap/
projections are display transforms over the already-disclosed scene; the trust chip reads the
same capped ceiling as the ladder. Performance: clustering LOD + E1 culling keep big scenes
cheap; the minimap redraws only when the scene/camera actually changed.
