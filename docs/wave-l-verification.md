# Wave L — Verification Report

Status: **COMPLETE.** L1 Shareable moment links + embed, implemented per
[wave-l-runbook.md](./wave-l-runbook.md). `npm test` green (112 tests); a Wave-L headless smoke
green (6/6); all prior smokes still green (no regression). **This is the final wave of the
Round-2 "Wow Wave" (G–L).**

## What shipped

| Item | Files | Summary |
|------|-------|---------|
| **L1 Shareable moment links** | `momentLink.js` (new), `app.js`, `styles.css` | **"Copy link to this moment"** (in the export menu) builds a URL whose fragment (`#cinema=…`) encodes only **view state** — mode, replay position, camera, view, lens, search — so opening it restores the exact framed/scrubbed/lensed moment with a live Trust Ladder. Plus **"Copy embed snippet"** (an `<iframe>` for the same moment in embed mode). A copied-toast confirms. The controller exposes `getMoment` / `getMomentUrl` / `applyMoment`. |

The link **carries no scene data** (unit-verified): the recipient still loads the scene through
their own disclosure-scoped source, so disclosure stays fail-closed — a link can't leak data
they aren't entitled to.

Cross-cutting: `momentLink.js` wired into `loader.js` (integrity fence green); restore reads
`#cinema=` from `location.hash` **or** `options.moment` (host-agnostic / `file://`-safe); the
toast timer is cleaned up in `destroy()`.

## How it was verified

**Unit (`npm test`, 112 tests, all pass):** adds `momentLink.test.mjs` (6) — encode→decode
round-trips all view-state fields, the string is URL-safe (no `+/=#&`), `momentToUrl` +
`momentFromLocation` reconstruct, **the link contains no scene payload** (no nodes/edges/
labels/balances), decode is tolerant of garbage/missing input, and the embed snippet targets
embed mode at the same moment.

**Wave-L headless smoke (DOM shim, scratchpad — not shipped):**
- `getMomentUrl` encodes the current view/query/camera; the export menu offers "Copy link to
  this moment" + "Copy embed snippet"; clicking copy shows the toast.
- Mounting with a **lens-moment** restores view + lens + camera; mounting with a **query-moment**
  restores the search query; a **garbage** fragment decodes to null (ignored, no throw).
- All prior smokes (A–F, G, H, I, J, K) re-run green.

## Acceptance criteria — met

- **L1** a copied link reopens the precise framed/scrubbed/lensed moment with a live Trust
  Ladder; it carries no scene data, so a recipient sees only what their own disclosure context
  allows; the embed snippet drops the same moment into another page. ✅

## Robustness note

`applyMoment` now sets the search query to the moment's value **even when empty**, so a shared
link reliably overrides any stale/persisted local query (which otherwise could have stolen the
shared dim channel from the link's lens). Lens and search remain mutually exclusive, exactly as
in the live app — so a captured moment never contains both.

## Disclosure & assurance invariants — preserved

The link/embed encode view state only — never scene content or secrets (unit-enforced). On
open, the recipient's own disclosure-scoped source decides what's visible; the trust ladder
still reads the capped ceiling. Nothing about *what is true* travels in a link.
