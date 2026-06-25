// Tier D / D2 — motion hierarchy: severity ranking + single attention focus.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './renderer.js';
const { severityOf, computeAttention } = globalThis.InfrixCinema;

test('severityOf ranks frozen > anomaly > paused > quarantined > throttled > calm', () => {
  assert.ok(severityOf({ breakerState: 'frozen' }) > severityOf({ anomalyScore: 1 }));
  assert.ok(severityOf({ anomalyScore: 0.9 }) > severityOf({ breakerState: 'paused' }));
  assert.ok(severityOf({ breakerState: 'paused' }) > severityOf({ quarantined: true }));
  assert.ok(severityOf({ quarantined: true }) > severityOf({ breakerState: 'throttled' }));
  assert.equal(severityOf({}), 0);
  assert.equal(severityOf(null), 0);
});

test('a higher anomaly score outranks a lower one', () => {
  assert.ok(severityOf({ anomalyScore: 0.9 }) > severityOf({ anomalyScore: 0.2 }));
});

test('computeAttention picks the single highest-severity node id', () => {
  const nodes = [
    { id: 'a', breakerState: 'throttled' },
    { id: 'b', anomalyScore: 0.5 },
    { id: 'c', breakerState: 'frozen' },
    { id: 'd' },
  ];
  assert.equal(computeAttention(nodes), 'c');
});

test('computeAttention returns null when nothing demands attention', () => {
  assert.equal(computeAttention([{ id: 'a' }, { id: 'b', kind: 'contract' }]), null);
  assert.equal(computeAttention([]), null);
});

test('ties resolve to the first-seen node (deterministic)', () => {
  const nodes = [{ id: 'x', breakerState: 'frozen' }, { id: 'y', breakerState: 'frozen' }];
  assert.equal(computeAttention(nodes), 'x');
});
