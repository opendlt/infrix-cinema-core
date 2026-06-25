# Tier D — Implementation Runbook

> No-cut-corners plan for **Tier D (the "breathtaking" layer)** from the
> [UI/UX Critical Review](./ui-ux-critical-review.md): **D1 intentional token system + depth,
> D2 motion hierarchy + reduced-motion.** (D3 — the anchor-confirmation moment — already
> shipped in Tier C.) Same ground rules: classic-script IIFEs, no deps, `file://`-safe,
> loader + parity fences green, disclosure/assurance invariants preserved.

## D1 — token system + depth (`cinemaTokens.css`, `styles.css`, `renderer.js`)

**Tokens** (`cinemaTokens.css`, scoped to `.cinema-root`):
- **Type scale**: `--cinema-fs-{xs,sm,base,md,lg,xl}` (11→20px), `--cinema-lh-{tight,normal}`,
  `--cinema-fw-{normal,semibold,bold,black}`.
- **Spacing**: `--cinema-space-{1..8}` on a 4px base.
- **Elevation**: `--cinema-shadow-{1,2,3}` (panels / menus / overlays).
- **Motion**: keep `--cinema-dur-{fast,base,slow}` + `--cinema-ease-standard`; add
  `--cinema-ease-emphasized`.
- **Radius**: add `--cinema-radius-sm`, keep `--cinema-radius`.
- Palette stays parity-locked to the scene vocabulary; only nudge chrome `--cinema-muted`
  for small-text legibility (recheck contrast).

**Apply** the tokens across the most visible chrome (panels, controls, transport, tooltip,
trust ladder, agent ribbon, state overlay, details, narrative cards, dialogs): font sizes →
`fs` tokens, ad-hoc paddings → `space`, flat panels gain `shadow` elevation, interactive
elements gain a `transition` on `--cinema-dur-fast` for a premium feel.

**Depth on the stage** (`renderer.js`): a `_drawBackdrop()` after the base gradient —
- a **vignette** (radial gradient darkening the edges), and
- a faint **parallax dot-field** (screen-space grid that drifts with camera pan) for spatial
  reference. Cheap, LOD-stable (fixed screen gap), drawn before the camera transform.

## D2 — motion hierarchy + reduced-motion (`renderer.js`, `styles.css`)

**The policy** — one ambient layer, one attention layer, everything else calm:
1. **Reduced-motion** (`prefers-reduced-motion: reduce`): freeze ALL autonomous motion —
   particles, pulses, shimmer, ring spin, the anchor moment (already gated), CSS animations/
   transitions (a global `@media` block). State stays legible via static colored rings/glyphs.
2. **Ambient**: flow particles only on `animated` edges, reduced count/opacity.
3. **Kill the noise**: remove the activity-driven **size pulse** (nodes no longer throb;
   activity is shown by the static activity ring) and the quarantine **shake** (replaced by
   the existing static dashed hazard border).
4. **Attention focus**: compute the single highest-severity node
   (`frozen > anomaly > paused > quarantined > throttled`). ONLY it animates — a pulsing
   anomaly spotlight + a gently pulsing breaker ring. Every other troubled node still shows a
   **static** colored ring (legible) but does not animate. The eye lands on the one thing that
   matters instead of a field of competing pulses.
5. **Breaker rings**: static dashed ring (no rotation) except a slow pulse when it's the
   attention focus.

Implementation: `renderer.reducedMotion` (from `matchMedia`, with a change listener removed in
`destroy()`); `renderer._attentionFocus` (recomputed in `setSceneGraph`/`applyUpdate` via a
pure `severityOf`); gate every animated term by `motion`/`isFocus`.

## Tests

- `motion.test.mjs` (new): pure `severityOf` ranking + `computeAttention(nodes)` picks the
  single highest-severity id; ties resolved deterministically.
- `shape.test.mjs` integrity fence stays green (no new loader entries unless a module is
  added; the depth/motion work lives in existing files — only a test file is added).
- Headless smoke extended: backdrop + nodes render without throwing; with a frozen + an
  anomaly node, `_attentionFocus` is the frozen node; a reduced-motion renderer sets
  `reducedMotion=true` and the anchor moment is a no-op.

## Definition of done

D1 + D2 acceptance met; `npm test` green; headless smoke green; no new deps; `file://`-safe;
disclosure/assurance invariants intact; reduced-motion fully honored (canvas + CSS); new
listener cleaned up in `destroy()`.
