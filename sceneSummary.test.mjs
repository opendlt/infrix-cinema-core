// Wave G / G3 — self-explaining scene summary builder.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './visualVocabulary.js';
import './trustLadder.js';
import './sceneSummary.js';
const { buildSceneSummary } = globalThis.InfrixCinema;

const events = [
  { sequence: 0, stage: 'intent', assurance: 'offline' },
  { sequence: 1, stage: 'policy', assurance: 'offline' },
  { sequence: 2, stage: 'anchor', assurance: 'l0' },
];

test('summarizes actions, steps, sealed values, anchoring, anomalies', () => {
  const graph = { nodes: [
    { id: 'i1', kind: 'intent' },
    { id: 's1', kind: 'account', redacted: true },
    { id: 'x1', kind: 'contract', anomalyScore: 0.7 },
  ] };
  const s = buildSceneSummary(graph, events, { anchor: { txHash: '0xabc' } });
  assert.match(s.text, /1 governed action/);
  assert.match(s.text, /1 sealed value/);
  assert.match(s.text, /anchored on L0/);
  assert.match(s.text, /1 anomaly/);
  assert.equal(s.sealed, 1);
  assert.equal(s.anomalies, 1);
});

test('a clean scene reads "no anomalies"', () => {
  const s = buildSceneSummary({ nodes: [{ id: 'i1', kind: 'intent' }] }, events, { anchor: { txHash: '0x1' } });
  assert.match(s.text, /no anomalies/);
});

test('summary is count-only — it never names a redacted value', () => {
  const graph = { nodes: [{ id: 's1', kind: 'account', redacted: true, label: '[private]', secret: 'SHOULD-NOT-APPEAR' }] };
  const s = buildSceneSummary(graph, events, {});
  assert.ok(!/SHOULD-NOT-APPEAR/.test(s.text));
  assert.ok(!/private/i.test(s.text) || /sealed/.test(s.text)); // only counts sealed, never the label
});

test('without an anchor the ceiling is not L0', () => {
  const s = buildSceneSummary({ nodes: [{ id: 'i1', kind: 'intent' }] }, [{ stage: 'intent', assurance: 'replay' }], {});
  assert.ok(!/anchored on L0/.test(s.text));
});

test('empty scene does not throw', () => {
  const s = buildSceneSummary({ nodes: [] }, [], {});
  assert.equal(typeof s.text, 'string');
});
