// Tier A / A4 — stage state overlay decision table.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
// Classic-script IIFE — import for the side effect, read the API off the global.
import './cinemaStates.js';
const { resolveState } = globalThis.InfrixCinema;

test('a populated scene hides the overlay', () => {
  assert.equal(resolveState({ nodeCount: 5 }), 'hidden');
  assert.equal(resolveState({ nodeCount: 5, connection: 'connecting' }), 'hidden');
});

test('a lost live connection surfaces the error state, even over a stale graph', () => {
  assert.equal(resolveState({ nodeCount: 0, connection: 'error' }), 'error');
  assert.equal(resolveState({ nodeCount: 5, connection: 'error' }), 'error');
  // error wins over a filter too — the user must act on the connection first.
  assert.equal(resolveState({ nodeCount: 0, connection: 'error', filterActive: true }), 'error');
});

test('connecting with no data shows loading', () => {
  assert.equal(resolveState({ nodeCount: 0, connection: 'connecting' }), 'loading');
});

test('an over-aggressive filter shows empty-filter, not a black void', () => {
  assert.equal(resolveState({ nodeCount: 0, filterActive: true, connection: 'connected' }), 'empty-filter');
});

test('idle before a first connection shows loading; otherwise empty', () => {
  assert.equal(resolveState({ nodeCount: 0, connection: 'idle', everConnected: false, expectsConnection: true }), 'loading');
  assert.equal(resolveState({ nodeCount: 0, connection: 'idle' }), 'empty');
  assert.equal(resolveState({ nodeCount: 0, connection: 'connected' }), 'empty');
});

test('empty inputs default to empty (never throws)', () => {
  assert.equal(resolveState(), 'empty');
  assert.equal(resolveState({}), 'empty');
});
