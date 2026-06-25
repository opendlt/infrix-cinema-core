// Wave G / G1 — causal autoplay shot-list builder.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './cinematic.js';
const { buildShotList } = globalThis.InfrixCinema;

const graph = {
  nodes: [
    { id: 'i1', kind: 'intent', position: { x: 0, y: 0 } },
    { id: 'a1', kind: 'approval_gate', position: { x: 100, y: 0 } },
    { id: 'an1', kind: 'anchor', position: { x: 200, y: 0 } },
    { id: 'noPos', kind: 'contract' },
  ],
};
const events = [
  { sequence: 2, stage: 'anchor', headline: 'Anchored on L0.', graphNodeIds: ['an1'] },
  { sequence: 0, stage: 'intent', headline: 'Alice requested a regulated transfer of 5 ACME tokens to the settlement vault right now.', graphNodeIds: ['i1'] },
  { sequence: 1, stage: 'approval', headline: 'Signed.', graphNodeIds: ['noPos', 'a1'] },
];

test('empty events → empty shot list', () => {
  assert.deepEqual(buildShotList([], graph), []);
  assert.deepEqual(buildShotList(null, graph), []);
});

test('shots are ordered by sequence', () => {
  const shots = buildShotList(events, graph);
  assert.deepEqual(shots.map((s) => s.seq), [0, 1, 2]);
  assert.deepEqual(shots.map((s) => s.stage), ['intent', 'approval', 'anchor']);
});

test('primaryNodeId prefers the first node that has a position', () => {
  const shots = buildShotList(events, graph);
  const approval = shots.find((s) => s.stage === 'approval');
  assert.equal(approval.primaryNodeId, 'a1'); // 'noPos' skipped (no position)
});

test('dwell has a floor and grows with headline length', () => {
  const shots = buildShotList(events, graph);
  const anchor = shots.find((s) => s.stage === 'anchor'); // short headline
  const intent = shots.find((s) => s.stage === 'intent'); // long headline
  assert.equal(anchor.dwellMs, 2200, 'short headline gets the floor');
  assert.ok(intent.dwellMs > 2200, 'long headline dwells longer');
});

test('each shot carries a "what this proves" line', () => {
  const shots = buildShotList(events, graph);
  assert.match(shots.find((s) => s.stage === 'anchor').proves, /independently verifiable/);
});
