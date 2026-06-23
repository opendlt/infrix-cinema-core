# @infrix/cinema-core

The **canonical Infrix Cinema visualization core** — one renderer, one visual
vocabulary, one disclosure view, shared by every Cinema surface so they all draw
the same scene with the same governance/disclosure guarantees:

- the **Nexus SPA** (`cinema.nexus` mode),
- the **browser extension** (`@infrix/extensions`, `cinema.embed`),
- the **`@infrix/cinema-embed`** SDK widget,
- the standalone viewer and the portable-proof viewer.

This package is the **single source of truth**: those consumers vendor from here
(or import the loader); none ships its own renderer.

## Two ways to load it

**ES-module hosts** (Nexus SPA) import the loader, which injects the classic core
scripts + stylesheets in dependency order and resolves `window.InfrixCinema`:

```js
import { loadCinemaCore } from '@infrix/cinema-core';

const cinema = await loadCinemaCore();          // resolves window.InfrixCinema
cinema.mountCinema({ root: el, mode: 'cinema.nexus', /* … */ });
```

**Classic / `file://` hosts** (the standalone viewer, the browser extension) load
the core scripts directly with `<script>` tags in dependency order (see the
`SCRIPTS` + `STYLES` arrays in `loader.js`); `loader.js` itself is not needed in
that mode. `mountCinema(options)` is the one entry point every surface calls.

## Modes

`mountCinema` gates controls by `mode`: `cinema.full` (standalone product),
`cinema.nexus` (SPA-mounted), `cinema.embed` (embeddable widget), `cinema.proof`
(portable proof viewer). Cinema is a **non-committing visualization** — it never
claims to be the source of truth; the evidence/proof does.

## Integrity

`shape.test.mjs` (`npm test`) asserts the file set is internally consistent: every
script/style the loader references exists, and no core file is orphaned. Consumers
keep their own byte-drift fences comparing their vendored copy against this package.
