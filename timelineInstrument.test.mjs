// Wave J / J3 — timeline instrument builders.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './visualVocabulary.js';
import './timelineInstrument.js';
const { buildEventDensity, buildTrustTrack, buildChapters, momentsThatMatter } = globalThis.InfrixCinema;

const events = [
  { sequence: 0, stage: 'intent', assurance: 'offline' },
  { sequence: 1, stage: 'policy', assurance: 'offline' },
  { sequence: 2, stage: 'execution', assurance: 'replay', status: 'failed' },
  { sequence: 3, stage: 'anchor', assurance: 'l0' },
];

test('event density bins sum to the event count', () => {
  const dens = buildEventDensity(events, 3, 8);
  assert.equal(dens.reduce((a, b) => a + b, 0), events.length);
});

test('trust track climbs monotonically toward the ceiling', () => {
  const track = buildTrustTrack(events);
  const ranks = ['offline', 'replay', 'l0', 'witness'];
  let last = -1;
  for (const t of track) { const r = ranks.indexOf(t.ceiling); assert.ok(r >= last, 'never drops'); last = r; }
  assert.equal(track[track.length - 1].ceiling, 'l0');
});

test('chapters mark each stage boundary', () => {
  const ch = buildChapters(events);
  assert.deepEqual(ch.map((c) => c.stage), ['intent', 'policy', 'execution', 'anchor']);
});

test('moments that matter find the first failure and the anchor', () => {
  const m = momentsThatMatter(events);
  assert.equal(m.firstFailure, 2);
  assert.equal(m.anchor, 3);
});
