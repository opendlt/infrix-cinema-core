// Tier C / C3 — agent ribbon model.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './agentRibbon.js';
const { agentRibbonModel } = globalThis.InfrixCinema;

function refusedScene() {
  return {
    meta: { source: 'agent', action: 'transfer.send', ok: false },
    nodes: [
      { id: 'agent-request', label: 'Agent requested: transfer.send', position: { x: 130 } },
      { id: 'approval', label: 'Not authorized', position: { x: 320 } },
      { id: 'prevented', label: 'Prevented: AGENT_UNSAFE_TRANSFER', position: { x: 510 } },
    ],
  };
}
function okScene() {
  return {
    meta: { source: 'agent', action: 'query.balance', ok: true },
    nodes: [
      { id: 'agent-request', label: 'Agent requested: query.balance', position: { x: 130 } },
      { id: 'approval', label: 'Authorized', position: { x: 320 } },
      { id: 'execution', label: 'System executed', position: { x: 510 } },
      { id: 'proof', label: 'Proof L3/G2 (independent)', position: { x: 700 } },
    ],
  };
}

test('a non-agent scene is not a ribbon', () => {
  const m = agentRibbonModel({ nodes: [{ id: 'a' }] });
  assert.equal(m.isAgent, false);
  assert.equal(m.steps.length, 0);
});

test('a refused agent scene surfaces the rule code + fail tone', () => {
  const m = agentRibbonModel(refusedScene());
  assert.equal(m.isAgent, true);
  assert.equal(m.ok, false);
  assert.equal(m.refusal.code, 'AGENT_UNSAFE_TRANSFER');
  const prevented = m.steps.find((s) => s.id === 'prevented');
  assert.equal(prevented.tone, 'fail');
});

test('steps are ordered left→right by x position', () => {
  const m = agentRibbonModel(refusedScene());
  assert.deepEqual(m.steps.map((s) => s.id), ['agent-request', 'approval', 'prevented']);
});

test('an authorized agent scene has no refusal', () => {
  const m = agentRibbonModel(okScene());
  assert.equal(m.ok, true);
  assert.equal(m.refusal, null);
  assert.equal(m.steps.find((s) => s.id === 'proof').tone, 'ok');
});
