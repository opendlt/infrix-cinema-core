# Wave J — Implementation Runbook · Situational awareness & scale

> From [Round-2 review](./ui-ux-critical-review-round2.md): **J1 Vitals strip, J2 Minimap +
> overview/clustering, J3 Timeline as instrument, J4 Alternative projections.** Ground rules:
> see [wave-g-runbook.md](./wave-g-runbook.md) §"Ground rules".

## New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `vitals.js` | classic script | before `app.js` | J1 vitals model (pure) + strip component |
| `minimap.js` | classic script | before `app.js` | J2 minimap + overview controller |
| `cluster.js` | classic script | before `layout.js`→ before `app.js` | J2 semantic clustering (pure) |
| `timelineInstrument.js` | classic script | before `controls.js`→ before `app.js` | J3 histogram/track builders (pure) + overlay |
| `projections.js` | classic script | before `app.js` | J4 Sankey + matrix renderers |
| `vitals.test.mjs`, `cluster.test.mjs`, `timelineInstrument.test.mjs`, `projections.test.mjs` | node tests | — | units |

CSS → `styles.css`.

## J1 — Vitals strip (`vitals.js`, `app.js`, `styles.css`) — replaces the raw status bar

**Pure `computeVitals(graph, history)`** → `{ tps, gasRate, breakers:{throttled,paused,frozen},
anomalies, ceiling, sealed, disclosable, block }`. `history` is a small ring buffer of recent
samples (kept in app) for the rates/sparklines. Counts from data already on the scene.

**Strip component** `InfrixCinema.VitalsStrip(hostEl, { onJump })`: renders posture, not
telemetry — a mini Trust Ladder, breaker pips (colored, count), an anomaly badge, sealed/
disclosable, TPS + gas sparklines, block. Each pip/badge is a button → `onJump(kind|nodeIds)`
flies to the relevant nodes (reuse `renderer.fitToNodes`/`flyTo`). `setVitals(v)` updates.

**app wiring:** replace the `#status-bar` content with the strip (keep the footer slot);
sample on the status interval into `history`; `onJump` maps anomaly→attention focus,
breaker→matching nodes, sealed→redacted nodes.

**Acceptance.** A one-second glance tells health, throughput, frozen/anomalous state, and trust
posture; any concern is one click from being framed on screen.

## J2 — Minimap + overview/clustering (`minimap.js`, `cluster.js`, `renderer.js`, `app.js`, CSS)

**Minimap** `InfrixCinema.Minimap(hostEl, { renderer })`: a small canvas drawing the whole
scene downscaled (compute scene bounds like `fitToView`), with a draggable **viewport
rectangle** reflecting the camera; click/drag → set camera (`renderer.flyTo`/pan). Redraws on
`renderer` dirty (subscribe via a light `onRender` hook or poll the camera). Hidden in embed.

**Semantic clustering (pure)** `cluster.js`: `clusterScene(graph, { by:'family'|'lane' })` →
super-nodes (group by `kindFamily(kind)` or spine lane) with `{ id, label, count, position
(centroid), memberIds }` + aggregated inter-cluster edges. `renderer` gains a **LOD mode**:
below a zoom threshold, draw clusters (labeled super-nodes + bundled edges) instead of
individual nodes; above it, the real graph. Expanding = zooming in; no extra clicks.

**Acceptance.** On a 5,000-node scene the user always knows where they are (minimap), jumps
anywhere instantly, and sees ~N labeled clusters at altitude instead of a hairball, resolving
to detail as they zoom in.

## J3 — Timeline as instrument (`timelineInstrument.js`, `controls.js`, `app.js`, CSS)

**Pure builders:**
- `buildEventDensity(events, totalSeq, bins)` → histogram counts per bin.
- `buildTrustTrack(events)` → the assurance ceiling at each sequence (so the climb to L0 is
  visible — "trust earning itself").
- `buildAnomalyTrack(frames|events)` → spikes per bin.
- `buildChapters(events)` → `[{ seq, stage, label }]` at stage boundaries.
- `momentsThatMatter(events)` → `{ firstFailure, anchor, maxAnomaly }` sequences.

**Overlay:** render these onto the scrubber (above/below the existing status ticks): a faint
density histogram, a thin trust-over-time track colored by rung, anomaly spikes, chapter ticks
with hover labels. Add keyboard jumps to the "moments that matter" (e.g. `g f` → first
failure, `g a` → anchor). Reuse the existing tick infra in `controls.js`.

**Acceptance.** From the timeline alone a user sees *when* things happened, *when trust became
real* (the climb to L0), and *where the trouble was*, and jumps to any of those without blind
scrubbing.

## J4 — Alternative projections (`projections.js`, `controls.js`, `app.js`, CSS)

**Build.** A view switch adding **Sankey** (value/gas flow between accounts/contracts, widths =
magnitude) and **adjacency-matrix** (rows/cols = nodes, cells = traffic) renderers, both built
from the same SceneGraph (`_aggregate` output is enough). Node-link for structure, Sankey for
flow, matrix for density. Each is its own canvas/SVG renderer behind the view toggle; disclosure
still applies (sealed magnitudes withheld → flow shown as "[sealed]" band, not a number).

**Acceptance.** A transfer-heavy settlement scene viewed as a Sankey shows magnitude legibly
instead of an edge tangle; a very dense scene viewed as a matrix is readable.

## Tests

- `vitals.test.mjs`: counts (breakers, anomalies, sealed), rate computation from history,
  ceiling from ladder.
- `cluster.test.mjs`: grouping by family/lane, centroids, aggregated edges, member counts.
- `timelineInstrument.test.mjs`: density binning, trust-track monotonic-to-ceiling,
  chapters at boundaries, moments-that-matter selection.
- `projections.test.mjs`: Sankey flow aggregation; matrix cell counts; sealed magnitude
  withheld.
- Headless smoke (extend): vitals strip renders + a pip jump moves the camera; minimap present
  + click jumps; timeline overlay elements present; projection toggle switches renderer.
- `shape.test.mjs` green.

## Definition of done

J1–J4 acceptance met; `npm test` + all smokes green; no new deps; `file://`-safe; disclosure
invariants intact (sealed magnitudes never leaked into vitals/Sankey); performant (clustering/
LOD keep big scenes at 60fps with E1 culling); teardown clean.
