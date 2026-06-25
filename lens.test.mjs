// Wave K / K1 — role lens.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './lens.js';
const { applyLens, lensEmphasis } = globalThis.InfrixCinema;

const graph = { nodes: [
  { id: 'i1', kind: 'intent' }, { id: 'p1', kind: 'policy' }, { id: 'a1', kind: 'approval_gate' },
  { id: 'e1', kind: 'evidence' }, { id: 'an1', kind: 'anchor' },
  { id: 'x1', kind: 'contract', breakerState: 'frozen' }, { id: 'x2', kind: 'contract' },
] };

test('applyLens resolves each role; unknown role → neutral default', () => {
  assert.equal(applyLens('auditor').view, 'split');
  assert.equal(applyLens('regulator').view, 'narrative');
  assert.equal(applyLens('operator').primaryAction, 'jumpAnomaly');
  assert.deepEqual(applyLens('nonsense').emphasizeKinds, []);
});

test('auditor emphasizes evidence + anchor', () => {
  const ids = lensEmphasis(graph, 'auditor');
  assert.ok(ids.includes('e1') && ids.includes('an1'));
  assert.ok(!ids.includes('x2'));
});

test('regulator emphasizes policy/approval/intent/outcome', () => {
  const ids = lensEmphasis(graph, 'regulator');
  assert.ok(ids.includes('p1') && ids.includes('a1') && ids.includes('i1'));
});

test('operator emphasizes nodes with a breaker (predicate), not just kinds', () => {
  const ids = lensEmphasis(graph, 'operator');
  assert.ok(ids.includes('x1'), 'frozen contract emphasized via predicate');
});
