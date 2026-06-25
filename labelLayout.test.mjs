// Tier A / A5 — screen-space label de-clutter helpers.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Classic-script IIFE — import for the side effect, read the API off the global.
import './renderer.js';
const { placeLabels, rectsIntersect } = globalThis.InfrixCinema;

const R = (x1, y1, x2, y2) => ({ x1, y1, x2, y2 });

test('rectsIntersect detects overlap and separation', () => {
  assert.equal(rectsIntersect(R(0, 0, 10, 10), R(5, 5, 15, 15)), true);
  assert.equal(rectsIntersect(R(0, 0, 10, 10), R(10, 0, 20, 10)), false); // edge-touch = not overlapping
  assert.equal(rectsIntersect(R(0, 0, 10, 10), R(20, 20, 30, 30)), false);
});

test('non-overlapping labels are all placed', () => {
  const placed = placeLabels([
    { id: 'a', priority: 1, rect: R(0, 0, 10, 10) },
    { id: 'b', priority: 1, rect: R(20, 0, 30, 10) },
  ]);
  assert.equal(placed.size, 2);
});

test('on overlap the higher-priority label wins', () => {
  const placed = placeLabels([
    { id: 'low', priority: 1, rect: R(0, 0, 10, 10) },
    { id: 'high', priority: 100, rect: R(5, 0, 15, 10) },
  ]);
  assert.ok(placed.has('high'));
  assert.ok(!placed.has('low'));
});

test('forced labels are always placed and reserve their space', () => {
  const placed = placeLabels([
    { id: 'forced', priority: 1, force: true, rect: R(0, 0, 10, 10) },
    { id: 'bigButOverlaps', priority: 999, rect: R(5, 0, 15, 10) },
  ]);
  assert.ok(placed.has('forced'), 'forced always placed');
  assert.ok(!placed.has('bigButOverlaps'), 'reserved space blocks the overlapper');
});

test('empty input yields an empty placement set', () => {
  assert.equal(placeLabels([]).size, 0);
});
