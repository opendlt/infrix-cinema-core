// Wave K / K2 — question-based smart filters.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './smartFilters.js';
const { SMART_FILTERS, runSmartFilter } = globalThis.InfrixCinema;

const graph = { nodes: [
  { id: 'o1', kind: 'outcome' },
  { id: 'prevented', kind: 'outcome', label: 'Prevented: AGENT_UNSAFE' },
  { id: 's1', kind: 'account', redacted: true, grantId: 'g1' },
  { id: 's2', kind: 'account', redacted: true },
  { id: 'x1', kind: 'contract', breakerState: 'frozen' },
  { id: 'x2', kind: 'contract', anomalyScore: 0.6 },
] };

test('every filter has an id, label, and predicate', () => {
  for (const f of SMART_FILTERS) { assert.ok(f.id && f.label && typeof f.predicate === 'function'); }
});

test('unanchored outcomes depend on the anchored context', () => {
  assert.deepEqual(runSmartFilter(graph, 'unanchored', { anchored: false }).sort(), ['o1', 'prevented']);
  assert.deepEqual(runSmartFilter(graph, 'unanchored', { anchored: true }), []);
});

test('stopped agent actions match the prevented node', () => {
  assert.deepEqual(runSmartFilter(graph, 'stopped-agent', {}), ['prevented']);
});

test('disclosable = sealed AND holding a grant (never just sealed)', () => {
  assert.deepEqual(runSmartFilter(graph, 'disclosable', {}), ['s1']);
});

test('drifted reads the drift context set', () => {
  assert.deepEqual(runSmartFilter(graph, 'drifted', { driftedIds: new Set(['x1']) }), ['x1']);
});

test('frozen or anomalous catches both', () => {
  assert.deepEqual(runSmartFilter(graph, 'frozen-anomalous', {}).sort(), ['x1', 'x2']);
});

test('unknown filter id → empty', () => {
  assert.deepEqual(runSmartFilter(graph, 'nope', {}), []);
});
