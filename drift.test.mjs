// Wave I / I1 — predicted-vs-actual drift.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './drift.js';
const { hasPlan, splitPlanActual, computeDrift, driftSummary, driftedNodeIds } = globalThis.InfrixCinema;

test('hasPlan detects plan kinds or a separate plan subgraph', () => {
  assert.equal(hasPlan({ nodes: [{ id: 'a', kind: 'contract' }] }), false);
  assert.equal(hasPlan({ nodes: [{ id: 'p', kind: 'plan_step' }] }), true);
  assert.equal(hasPlan({ nodes: [{ id: 'a', kind: 'contract' }] }, { nodes: [{ id: 'p' }] }), true);
});

test('splitPlanActual partitions plan/ghost kinds out of the scene', () => {
  const graph = { nodes: [
    { id: 'x1', kind: 'contract' }, { id: 'g1', kind: 'ghost_prediction' }, { id: 'p1', kind: 'plan_step' },
  ], edges: [{ fromNodeId: 'g1', toNodeId: 'x1', kind: 'ghost_drift' }, { fromNodeId: 'x1', toNodeId: 'x1' }] };
  const { actual, ghost } = splitPlanActual(graph);
  assert.deepEqual(actual.nodes.map((n) => n.id), ['x1']);
  assert.deepEqual(ghost.nodes.map((n) => n.id).sort(), ['g1', 'p1']);
  assert.equal(ghost.edges.length, 1);
  assert.equal(actual.edges.length, 1);
});

test('a separate plan subgraph becomes the ghost', () => {
  const { actual, ghost } = splitPlanActual({ nodes: [{ id: 'x1', kind: 'contract' }] }, { nodes: [{ id: 'pp', stepId: 's1' }] });
  assert.deepEqual(actual.nodes.map((n) => n.id), ['x1']);
  assert.deepEqual(ghost.nodes.map((n) => n.id), ['pp']);
});

test('computeDrift flags a gas divergence and matches the rest', () => {
  const actual = { nodes: [
    { id: 'x1', stepId: 's1', gasCost: 40000 },
    { id: 'x2', stepId: 's2', gasCost: 120000 },
  ] };
  const ghost = { nodes: [
    { id: 'g1', stepId: 's1', predicted: { gas: 40000 } },
    { id: 'g2', stepId: 's2', predicted: { gas: 40000 } },
  ] };
  const d = computeDrift(actual, ghost);
  assert.deepEqual(d.matched, ['x1']);
  assert.equal(d.drifted.length, 1);
  assert.equal(d.drifted[0].stepId, 's2');
  assert.deepEqual(driftedNodeIds(d), ['x2']);
  assert.ok(d.driftEdges.find((e) => e.fromId === 'g2' && e.toId === 'x2' && e.drift));
});

test('a sealed step withholds comparison (never reads a redacted value)', () => {
  const actual = { nodes: [{ id: 'x1', stepId: 's1', redacted: true, gasCost: 999 /* must NOT be compared */ }] };
  const ghost = { nodes: [{ id: 'g1', stepId: 's1', predicted: { gas: 1 } }] };
  const d = computeDrift(actual, ghost);
  assert.equal(d.drifted.length, 0, 'no divergence reported for a sealed step');
  assert.ok(d.driftEdges.find((e) => e.sealed));
});

test('driftSummary reads in plain language', () => {
  const d = computeDrift(
    { nodes: [{ id: 'x1', stepId: 's1', gasCost: 40000 }, { id: 'x2', stepId: 's2', gasCost: 120000 }] },
    { nodes: [{ id: 'g1', stepId: 's1', predicted: { gas: 40000 } }, { id: 'g2', stepId: 's2', predicted: { gas: 40000 } }] },
  );
  const s = driftSummary(d);
  assert.match(s, /1 of 2 steps matched the plan/);
  assert.match(s, /Step s2 diverged: predicted gas 40000, actual 120000/);
});

test('no plan → empty drift summary', () => {
  assert.match(driftSummary(computeDrift({ nodes: [] }, { nodes: [] })), /No plan steps/);
});
