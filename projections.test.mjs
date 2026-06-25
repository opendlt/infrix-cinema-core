// Wave J / J4 — alternative projections.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './visualVocabulary.js';
import './narrativeTemplates.js';
import './layout.js';
import './projections.js';
const { sankeyModel, matrixModel } = globalThis.InfrixCinema;

const graph = {
  nodes: [
    { id: 'a', kind: 'account', label: 'A', position: { x: 0, y: 0 } },
    { id: 'b', kind: 'contract', label: 'B', position: { x: 100, y: 0 } },
    { id: 's', kind: 'account', label: 'S' },
  ],
  edges: [
    { fromNodeId: 'a', toNodeId: 'b', gasCost: 100 },
    { fromNodeId: 'a', toNodeId: 'b', gasCost: 50 },
    { fromNodeId: 'b', toNodeId: 's', redacted: true },
  ],
};

test('sankey aggregates flow value between pairs', () => {
  const m = sankeyModel(graph, { width: 600, height: 400 });
  const ab = m.flows.find((f) => f.fromId === 'a' && f.toId === 'b');
  assert.equal(ab.value, 150);
  assert.ok(m.boxes.length >= 2);
});

test('sankey marks a sealed flow instead of leaking a magnitude', () => {
  const m = sankeyModel(graph);
  const sealed = m.flows.find((f) => f.fromId === 'b' && f.toId === 's');
  assert.equal(sealed.sealed, true);
});

test('matrix aggregates per-pair traffic counts', () => {
  const m = matrixModel(graph);
  assert.equal(m.ids.length, 3);
  assert.equal(m.traffic.get('a→b'), 2);
  assert.equal(m.traffic.get('b→s'), 1);
});
