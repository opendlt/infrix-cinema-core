# Tier B — Implementation Runbook

> No-cut-corners plan for **Tier B (interaction model)** from the
> [UI/UX Critical Review](./ui-ux-critical-review.md): **B1 click-vs-drag + hover tooltip,
> B2 touch/pinch, B3 real hit radius, B4 power search, B5 a11y graph.** Same ground rules as
> [Tier A](./tier-a-runbook.md): classic-script IIFEs, no deps, `file://`-safe, loader
> manifest + parity fences stay green, disclosure/assurance invariants preserved.

## New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `searchQuery.js` | classic script | before `app.js` | B4 pure query parser + matcher (testable) |
| `tooltip.js` | classic script | before `app.js` | B1 lightweight hover peek card |
| `a11y.js` | classic script | before `app.js` | B5 off-screen node listbox + keyboard nav |
| `searchQuery.test.mjs` | node test | — | B4 grammar/matcher units |

CSS additions go into `styles.css`; no new stylesheet.

## B1 — click vs drag + hover tooltip (`renderer.js`, `app.js`, `tooltip.js`)

- Replace mouse handlers with a unified **Pointer Events** model (shared with B2). A
  pointer gesture is a **click** only if it moved < `DRAG_THRESHOLD` (4px CSS); otherwise
  it's a **pan**. No selection happens on pointerdown.
- **click**: hit node → select + emit `nodeSelected` (pins details); else hit edge → emit
  `edgeSelected` (pins details); else empty → emit `backgroundClicked` (app clears selection
  + hides details).
- **double-click**: `renderer.flyTo(node)` — animated camera ease to center + comfortable
  zoom.
- **hover** (mouse pointerType only): hit-test → emit `nodeHovered`/`edgeHovered` with screen
  `{x,y}`; `hoverEnd` on leave. App drives an HTML **tooltip** (kind, label, one stat,
  sealed/redacted indicator). Edge hover NO LONGER opens the heavy details panel.
- **cursor affordances**: `grab`/`grabbing` while panning, `pointer` over hit targets.
- **wheel** zooms about the cursor (not the canvas center).

## B2 — touch / pinch (`renderer.js`, `styles.css`)

- Pointer Events unify mouse + touch. Track active pointers in a Map.
  - 1 pointer: pan / click (B1).
  - 2 pointers: pinch-zoom about the midpoint + pan by midpoint delta.
- `canvas { touch-action: none }`; `setPointerCapture` per pointer. Coarse pointers get a
  larger hit pad.

## B3 — real hit radius (`renderer.js`)

- Hit-test against the **cached rendered radius** (`_nodeRenderRadius`, populated in Tier A)
  instead of `size+5`, plus a coarse-pointer pad. Iterate **top-most first** (reverse draw
  order) so the visually front node wins.

## B4 — power search (`searchQuery.js`, `app.js`, `controls.js`, `renderer.js`)

- `parseSearchQuery(str)` → `{predicates, terms, isEmpty}`. Fields: `kind:`, `status:`,
  `gas:OPn` (`>,<,>=,<=,=`). Unknown `field:val` is treated as free text (never a silent
  match-all). Free terms match `label + kind + url`.
- `matchSearch(node, parsed, {gasOf})` → bool. `nodeStatus(node)` derives
  private/quarantined/throttled/paused/frozen/anomaly/normal.
- App `applySearch(q)`: dims non-matches (opacity 0.12, preserving `_origOpacity`), dims
  edges with a non-matched endpoint, returns matched ids. Empty query restores.
- Controls: a **result count** badge + **‹ › stepper**; `Enter` = fit camera to matches
  (`renderer.fitToNodes`), `Shift+Enter`/stepper = `flyTo` each match; `Esc` clears.
- Query persisted (`localStorage cinema.search`) and restored on mount.
- `assurance:` is intentionally **out of scope** here (assurance is per proof-stage, not
  per-node; it lands with the Tier C per-node assurance chips). Noted, not silently dropped.

## B5 — a11y graph (`a11y.js`, `renderer.js`, `app.js`, `styles.css`)

- `CinemaA11y(renderer, host, {onActivate})`: builds a visually-hidden but focusable
  `role=listbox` mirror; one `role=option` per node with a meaningful `aria-label`
  (kind + label + status). `setScene(graph)` rebuilds options.
- Keyboard: `↑/↓` move the active option (and `renderer.setKeyboardFocus(id)` draws a focus
  ring + recenters), `Enter` opens details (`onActivate`), `f` flies to the node, `Esc`
  blurs.
- Canvas gets `role="application"` + `aria-roledescription` + an instructions
  `aria-describedby`. The focus ring is a distinct renderer decoration.

## Tests

- `searchQuery.test.mjs`: field parsing, gas operators, unknown-field-as-text, `nodeStatus`
  derivation, matcher AND-semantics, empty query.
- Existing `shape.test.mjs` integrity fence stays green (new modules wired in loader).
- Headless mount-smoke (scratch DOM shim) extended: pointer click vs drag, double-click
  flyTo, hover tooltip show/hide, two-pointer pinch zoom, hit-radius on a big active node,
  search dim+count+fit, a11y arrow nav + activate.

## Definition of done

All B1–B5 acceptance criteria met; `npm test` green; headless smoke green; no new deps;
`file://`-safe; disclosure/assurance invariants intact; all new listeners/observers cleaned
up in `destroy()`.
