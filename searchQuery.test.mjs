// Tier B / B4 — search grammar + matcher units.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './searchQuery.js';
const { parseSearchQuery, matchSearch, nodeStatus } = globalThis.InfrixCinema;

test('empty / whitespace query is marked empty and matches everything', () => {
  assert.equal(parseSearchQuery('').isEmpty, true);
  assert.equal(parseSearchQuery('   ').isEmpty, true);
  assert.equal(matchSearch({ kind: 'contract' }, parseSearchQuery('')), true);
});

test('field clauses parse; unknown field falls back to free text', () => {
  const p = parseSearchQuery('kind:contract foo:bar hello');
  assert.deepEqual(p.predicates, [{ field: 'kind', val: 'contract' }]);
  assert.deepEqual(p.terms, ['foo:bar', 'hello']);
});

test('gas operators parse and compare', () => {
  const p = parseSearchQuery('gas:>=10000');
  assert.deepEqual(p.predicates, [{ field: 'gas', op: '>=', num: 10000 }]);
  const ctx = { gasOf: () => 12000 };
  assert.equal(matchSearch({ kind: 'x' }, p, ctx), true);
  assert.equal(matchSearch({ kind: 'x' }, parseSearchQuery('gas:>20000'), ctx), false);
  // underscores allowed in numbers
  assert.deepEqual(parseSearchQuery('gas:<1_000').predicates, [{ field: 'gas', op: '<', num: 1000 }]);
});

test('malformed gas clause degrades to free text (never match-all)', () => {
  const p = parseSearchQuery('gas:abc');
  assert.equal(p.predicates.length, 0);
  assert.deepEqual(p.terms, ['gas:abc']);
});

test('nodeStatus derives the coarse status word, private wins for redacted', () => {
  assert.equal(nodeStatus({ redacted: true, breakerState: 'frozen' }), 'private');
  assert.equal(nodeStatus({ breakerState: 'throttled' }), 'throttled');
  assert.equal(nodeStatus({ quarantined: true }), 'quarantined');
  assert.equal(nodeStatus({ anomalyScore: 0.8 }), 'anomaly');
  assert.equal(nodeStatus({}), 'normal');
});

test('status: clause matches the derived status', () => {
  assert.equal(matchSearch({ kind: 'contract', breakerState: 'frozen' }, parseSearchQuery('status:frozen')), true);
  assert.equal(matchSearch({ kind: 'contract' }, parseSearchQuery('status:frozen')), false);
});

test('clauses AND together; free terms match label/kind/url', () => {
  const node = { kind: 'contract', label: 'TokenVault', url: 'acc://vault' };
  assert.equal(matchSearch(node, parseSearchQuery('kind:contract vault')), true);
  assert.equal(matchSearch(node, parseSearchQuery('kind:account vault')), false, 'kind clause fails → no match');
  assert.equal(matchSearch(node, parseSearchQuery('token')), true, 'free text hits label');
});
