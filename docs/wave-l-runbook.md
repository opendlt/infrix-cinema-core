# Wave L — Implementation Runbook · Living, shareable artifacts

> From [Round-2 review](./ui-ux-critical-review-round2.md): **L1 Shareable moment links +
> real embed snippet.** Ground rules: see [wave-g-runbook.md](./wave-g-runbook.md)
> §"Ground rules".

## New files

| File | Type | Loader slot | Purpose |
|------|------|-------------|---------|
| `momentLink.js` | classic script | before `app.js` | L1 encode/decode a "moment" (pure) + share UI |
| `momentLink.test.mjs` | node test | — | encode/decode round-trip units |

CSS → `styles.css`.

## L1 — Shareable moment links (`momentLink.js`, `app.js`, `exportPanel.js`, CSS)

**Pure core (testable):**
- `encodeMoment({ mode, position, camera:{x,y,zoom}, view, lens, query })` → a compact,
  URL-safe string (JSON → base64url; keep it small, round to ints). Returns the fragment value.
- `decodeMoment(str)` → the object (tolerant: ignore unknown/missing fields; clamp numbers).
- `momentToUrl(baseUrl, moment)` → `${baseUrl}#cinema=${encodeMoment(moment)}`.
- `momentFromLocation(hash)` → moment | null.

These encode only **view state**, never scene data or secrets — the recipient still loads the
scene through their own disclosure-scoped source, so disclosure stays fail-closed (a link
cannot leak data the recipient isn't entitled to).

**Restore on mount (app):** on `mountCinema`, if `momentFromLocation(location.hash)` is present
(and matches this mode), after the first scene loads apply it: set view mode + lens (Wave K) +
search query (Wave B) + `timeline.seek(position)` + restore camera
(`renderer.flyTo`/set camera). Guard for `file://`/no-`location` (smoke + embed) — read from
`options.moment` as a fallback so it's testable and host-agnostic.

**Share UI (app/export):** add **"Copy link to this moment"** to the export menu (Wave-F
self-describing menu): builds the current moment (mode, `timeline.state.currentSeq`, camera,
view, lens, query) → `momentToUrl(location.href.split('#')[0], moment)` → clipboard, with a
"Copied" confirmation. Also add **"Copy embed snippet"**: a small `<script>`/iframe snippet for
`cinema.embed` mode pointing at the same moment, so a framed moment (with the live Trust Ladder)
can be dropped into a report. Disclosure context still gates the embed.

**Acceptance.** A user copies a link to "the exact moment the anomaly was frozen"; opening it
restores that precise framed, scrubbed, lensed moment with a live Trust Ladder — and the link
carries no scene data, so the recipient sees only what their own disclosure context allows. The
embed snippet drops the same moment into another page.

## Tests

- `momentLink.test.mjs`: `encodeMoment`→`decodeMoment` round-trips all fields; tolerant of
  missing/garbage input (returns null / clamps); URL-safe (no `#`/`&` issues); contains no
  scene data.
- Headless smoke (extend): mounting with `options.moment` restores view/lens/query/position/
  camera; "Copy link" builds a URL that `decodeMoment` parses back to the current state.
- `shape.test.mjs` green.

## Definition of done

L1 acceptance met; `npm test` + all smokes green; no new deps; `file://`-safe (host-agnostic
via `options.moment`); **links carry view state only — never scene data or secrets**; disclosure
stays fail-closed for recipients/embeds; teardown clean.

---

## Wave-by-wave delivery checklist (all waves)

For each wave, "100% done" means:
- [ ] All acceptance blocks pass (unit + headless smoke).
- [ ] `npm test` green incl. the loader/orphan integrity fence (new modules wired).
- [ ] All prior smokes (A–F + earlier waves) re-run green — no regression.
- [ ] No new dependencies; works over `file://` and via the ESM loader.
- [ ] Disclosure + assurance invariants preserved (capped trust, no fabricated rungs, sealed
      size/values never leaked).
- [ ] Reduced-motion honored; new listeners/observers/rAFs/intervals cleaned up in `destroy()`.
- [ ] A `docs/wave-<x>-verification.md` report written, mirroring the tier verification docs.
