// Integrity fence for @infrix/cinema-core: the file set must be internally
// consistent — loader.js (the ESM entry) references only files that exist, and
// every core .js/.css is either the loader or referenced by it (no orphans).
//   node --test "*.test.mjs"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const loaderSrc = readFileSync(join(root, 'loader.js'), 'utf8');

function loaderArray(name) {
  const m = loaderSrc.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  assert.ok(m, `loader.js is missing the ${name} array`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

const scripts = loaderArray('SCRIPTS');
const styles = loaderArray('STYLES');

test('loader.js is the ESM entry exposing loadCinemaCore', () => {
  assert.match(loaderSrc, /export[\s\S]*loadCinemaCore/, 'loader.js must export loadCinemaCore');
});

test('every script/style the loader references exists', () => {
  for (const f of [...scripts, ...styles]) {
    assert.ok(existsSync(join(root, f)), `loader references a missing file: ${f}`);
  }
});

test('no orphan core files (every .js/.css is the loader or referenced by it)', () => {
  const referenced = new Set([...scripts, ...styles, 'loader.js']);
  for (const f of readdirSync(root)) {
    if ((f.endsWith('.js') || f.endsWith('.css'))) {
      assert.ok(referenced.has(f), `orphan core file not referenced by loader: ${f}`);
    }
  }
});

test('the dependency order keeps the renderer before its consumers', () => {
  // renderer/vocabulary must load before app.js (which drives them).
  const iVocab = scripts.indexOf('visualVocabulary.js');
  const iRenderer = scripts.indexOf('renderer.js');
  const iApp = scripts.indexOf('app.js');
  assert.ok(iVocab >= 0 && iRenderer >= 0 && iApp >= 0, 'core scripts present in SCRIPTS');
  assert.ok(iVocab < iApp && iRenderer < iApp, 'visualVocabulary + renderer must precede app.js');
});
