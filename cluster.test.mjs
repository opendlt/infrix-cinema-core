// Wave J / J2 — semantic clustering.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './visualVocabulary.js';
import './narrativeTemplates.js';
import './layout.js';
import './cluster.js';
const { clusterScene } = globalThis.InfrixCinema;

const graph = {
  nodes: [
    { id: 'c1', kind: 'contract', position: { x: 0, y: 0 } },
    { id: 'c2', kind: 'account', position: { x: 10, y: 0 } },
    { id: 'e1', kind: 'evidence', position: { x: 100, y: 0 } },
    { id: 'an1', kind: 'anchor', position: { x: 200, y: 0 } },
  ],
  edges: [{ fromNodeId: 'c1', toNodeId: 'e1' }, { fromNodeId: 'e1', toNodeId: 'an1' }],
};

test('clusters group by kind family with centroids + member counts', () => {
  const { clusters, clusterEdges } = clusterScene(graph, { by: 'family' });
  assert.ok(clusters.length >= 2, 'multiple families');
  const core = clusters.find((c) => c.label === 'core');
  assert.ok(core, 'core cluster present (contract/account)');
  assert.equal(core.count, 2);
  assert.ok(core.position.x >= 0 && core.position.x <= 10, 'centroid of c1/c2');
  // inter-cluster edges aggregated
  assert.ok(clusterEdges.length >= 1);
});

test('aggregated cluster edges carry a count', () => {
  const { clusterEdges } = clusterScene(graph, { by: 'family' });
  assert.ok(clusterEdges.every((e) => e.count >= 1));
});

test('empty graph → no clusters', () => {
  assert.deepEqual(clusterScene({ nodes: [] }).clusters, []);
});
