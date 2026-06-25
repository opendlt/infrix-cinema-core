// Wave H / H1 — verification plan + engine (honest, capped).
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './visualVocabulary.js';
import './trustLadder.js';
import './verify.js';
const { buildVerificationPlan, verifyBundle, fingerprint } = globalThis.InfrixCinema;

const goodScene = {
  nodes: [{ id: 'i1', kind: 'intent' }, { id: 'o1', kind: 'outcome' }, { id: 'an1', kind: 'anchor' }],
  edges: [{ id: 'e1', fromNodeId: 'i1', toNodeId: 'o1' }, { id: 'e2', fromNodeId: 'o1', toNodeId: 'an1' }],
};

test('plan marks steps runnable only when the bundle backs them', () => {
  const offline = buildVerificationPlan({ scene: goodScene });
  assert.equal(offline.find((s) => s.id === 'structural').runnable, true);
  assert.equal(offline.find((s) => s.id === 'replay').runnable, false);
  assert.equal(offline.find((s) => s.id === 'anchor').runnable, false);

  const full = buildVerificationPlan({ scene: goodScene, frames: [{ seq: 0 }], anchor: { txHash: '0xabc' }, witness: [{ signature: 'sig' }] });
  assert.equal(full.find((s) => s.id === 'replay').runnable, true);
  assert.equal(full.find((s) => s.id === 'anchor').runnable, true);
  assert.equal(full.find((s) => s.id === 'witness').runnable, true);
});

test('a full, consistent bundle passes every runnable step', async () => {
  const steps = [];
  const res = await verifyBundle(
    { scene: goodScene, frames: [{ seq: 0, scene: goodScene }], anchor: { txHash: '0xabc', block: 1240 }, witness: [{ signature: 'sig1' }] },
    { onStep: (id, status) => steps.push(id + ':' + status) },
  );
  assert.ok(res.every((r) => r.status === 'passed'), 'all passed: ' + JSON.stringify(res));
  assert.ok(steps.includes('structural:passed'));
  assert.ok(steps.includes('anchor:passed'));
});

test('a capsule-less bundle skips replay and still checks anchor', async () => {
  const res = await verifyBundle({ scene: goodScene, anchor: { confirmed: true } });
  const byId = Object.fromEntries(res.map((r) => [r.id, r.status]));
  assert.equal(byId.structural, 'passed');
  assert.equal(byId.replay, 'skipped');
  assert.equal(byId.anchor, 'passed');
});

test('structural FAILS on a dangling edge (bundle inconsistent)', async () => {
  const bad = { scene: { nodes: [{ id: 'a' }], edges: [{ fromNodeId: 'a', toNodeId: 'ghost' }] } };
  const res = await verifyBundle(bad);
  assert.equal(res.find((r) => r.id === 'structural').status, 'failed');
});

test('structural FAILS when declared assurance overclaims (honesty enforced)', async () => {
  const overclaim = { scene: goodScene, assurance: { id: 'witness' } }; // no anchor/witness present
  const res = await verifyBundle(overclaim);
  assert.equal(res.find((r) => r.id === 'structural').status, 'failed');
});

test('replay FAILS when the re-derived fingerprint contradicts the declared outcome', async () => {
  const tampered = { scene: goodScene, frames: [{ seq: 0, scene: goodScene }], outcome: { digest: 'deadbeef' } };
  const res = await verifyBundle(tampered);
  assert.equal(res.find((r) => r.id === 'replay').status, 'failed');
});

test('an injected verifier overrides the built-in check', async () => {
  let called = false;
  const res = await verifyBundle({ scene: goodScene }, { verifier: (id) => { called = true; return { ok: true, detail: 'real crypto for ' + id }; } });
  assert.ok(called);
  assert.equal(res.find((r) => r.id === 'structural').status, 'passed');
});

test('fingerprint is deterministic and order-independent', () => {
  assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }));
  assert.notEqual(fingerprint({ a: 1 }), fingerprint({ a: 2 }));
});
