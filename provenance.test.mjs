// Wave H / H2 — causal provenance tracing.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './provenance.js';
const { traceCausalChain, edgeKeysOf } = globalThis.InfrixCinema;

// intent → policy → approval → execution → outcome → evidence → anchor
const graph = {
  nodes: ['i1', 'p1', 'a1', 'x1', 'o1', 'e1', 'an1'].map((id) => ({ id })),
  edges: [
    { id: 'e-1', fromNodeId: 'i1', toNodeId: 'p1' },
    { id: 'e-2', fromNodeId: 'p1', toNodeId: 'a1', proofRef: 'approvals#3' },
    { id: 'e-3', fromNodeId: 'a1', toNodeId: 'x1' },
    { id: 'e-4', fromNodeId: 'x1', toNodeId: 'o1' },
    { id: 'e-5', fromNodeId: 'o1', toNodeId: 'e1' },
    { id: 'e-6', fromNodeId: 'e1', toNodeId: 'an1' },
  ],
};

test('tracing an outcome reaches the intent backward and the anchor forward', () => {
  const chain = traceCausalChain(graph, 'o1');
  assert.ok(chain.nodes.includes('i1'), 'reaches intent');
  assert.ok(chain.nodes.includes('an1'), 'reaches anchor');
  assert.ok(chain.nodes.includes('o1'));
  assert.equal(chain.hops.length, 6);
});

test('hops carry the proof reference where present', () => {
  const chain = traceCausalChain(graph, 'an1');
  const hop = chain.hops.find((h) => h.fromId === 'p1' && h.toId === 'a1');
  assert.equal(hop.proofRef, 'approvals#3');
});

test('edgeKeysOf maps hops to renderer trace-path keys', () => {
  const chain = traceCausalChain(graph, 'o1');
  assert.ok(edgeKeysOf(chain).includes('i1→p1'));
});

test('cycle-safe', () => {
  const cyclic = { nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ fromNodeId: 'a', toNodeId: 'b' }, { fromNodeId: 'b', toNodeId: 'a' }] };
  const chain = traceCausalChain(cyclic, 'a');
  assert.deepEqual(chain.nodes.sort(), ['a', 'b']);
});

test('an isolated node traces to just itself', () => {
  const chain = traceCausalChain({ nodes: [{ id: 'lonely' }], edges: [] }, 'lonely');
  assert.deepEqual(chain.nodes, ['lonely']);
  assert.equal(chain.hops.length, 0);
});

test('empty inputs do not throw', () => {
  assert.deepEqual(traceCausalChain(null, 'x').nodes, []);
  assert.deepEqual(traceCausalChain(graph, null).nodes, []);
});
