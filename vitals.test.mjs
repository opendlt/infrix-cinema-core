// Wave J / J1 — vitals model.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './vitals.js';
const { computeVitals } = globalThis.InfrixCinema;

test('counts breakers, anomalies, sealed, disclosable', () => {
  const g = { blockHeight: 7, nodes: [
    { id: 'a', breakerState: 'frozen' }, { id: 'b', breakerState: 'throttled' },
    { id: 'c', anomalyScore: 0.5 }, { id: 'd', redacted: true }, { id: 'e', redacted: true, grantId: 'g1' },
  ], edges: [{ gasCost: 100 }, { gasCost: 50 }] };
  const v = computeVitals(g, []);
  assert.equal(v.breakers.frozen, 1);
  assert.equal(v.breakers.throttled, 1);
  assert.equal(v.anomalies, 2); // anomalyScore node + frozen node
  assert.equal(v.sealed, 2);
  assert.equal(v.disclosable, 1);
  assert.equal(v.totalGas, 150);
  assert.equal(v.block, 7);
});

test('rates come from the sample history', () => {
  const hist = [{ t: 0, gas: 0, edges: 0 }, { t: 2000, gas: 4000, edges: 10 }];
  const v = computeVitals({ nodes: [] }, hist);
  assert.equal(v.gasRate, 2000); // 4000 gas / 2s
  assert.equal(v.opsRate, 5);    // 10 edges / 2s
});

test('no history → zero rates, no throw', () => {
  const v = computeVitals({ nodes: [] }, []);
  assert.equal(v.gasRate, 0);
  assert.equal(v.opsRate, 0);
});
