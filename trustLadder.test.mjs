// Tier C / C1 — Trust Ladder model (capped, honest).
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './visualVocabulary.js';
import './trustLadder.js';
const { buildLadder } = globalThis.InfrixCinema;

const backed = (m) => m.rungs.filter((r) => r.backed).map((r) => r.id);

test('an empty bundle is offline-only (structural)', () => {
  const m = buildLadder({});
  assert.equal(m.ceilingId, 'offline');
  assert.deepEqual(backed(m), ['offline']);
  assert.ok(m.rungs.find((r) => r.id === 'offline').isCeiling);
});

test('replay frames raise the ceiling to replay, no further', () => {
  const m = buildLadder({ frames: [{ seq: 0 }] });
  assert.equal(m.ceilingId, 'replay');
  assert.deepEqual(backed(m), ['offline', 'replay']);
  assert.equal(m.rungs.find((r) => r.id === 'l0').backed, false);
});

test('a confirmed anchor reaches L0 (and replay below it)', () => {
  const m = buildLadder({ frames: [{}], anchor: { block: 1240, txHash: '0xabc' } });
  assert.equal(m.ceilingId, 'l0');
  assert.deepEqual(backed(m), ['offline', 'replay', 'l0']);
  assert.equal(m.rungs.find((r) => r.id === 'witness').backed, false);
});

test('anchor + witnesses reach the top (meter fills to the ceiling)', () => {
  const m = buildLadder({ anchor: { confirmed: true }, witness: [{ id: 'w1' }] });
  assert.equal(m.ceilingId, 'witness');
  assert.deepEqual(backed(m), ['offline', 'replay', 'l0', 'witness']);
  assert.ok(m.rungs.find((r) => r.id === 'witness').isCeiling);
});

test('witnesses WITHOUT an anchor cannot claim witness (honest cap)', () => {
  const m = buildLadder({ witness: [{ id: 'w1' }] });
  assert.notEqual(m.ceilingId, 'witness');
  assert.equal(m.rungs.find((r) => r.id === 'witness').backed, false);
});

test('an assurance label alone can lift the ceiling to its stated level', () => {
  const m = buildLadder({ assurance: { id: 'l0' } });
  assert.equal(m.ceilingId, 'l0');
  assert.equal(m.rungs.find((r) => r.id === 'l0').backed, true);
});
