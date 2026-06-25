// Tier A / A2 — timeline adapter seek / total / speed / loop logic.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './timelineAdapter.js';
const { TimelineAdapter } = globalThis.InfrixCinema;

function fakeSource(frames) {
  return {
    capabilities: () => ({ live: false, replay: true }),
    getStateAt: async (pos) => ({ nodes: [{ id: 'n' + pos }], at: pos }),
    getTimeline: async () => ({ currentSeq: 0, totalSeq: frames, speed: 1 }),
  };
}

test('setTotal only raises the scrubber range, never lowers it', () => {
  const tl = new TimelineAdapter({ dataSource: fakeSource(0), renderer: {} });
  tl.setTotal(10); assert.equal(tl.state.totalSeq, 10);
  tl.setTotal(4); assert.equal(tl.state.totalSeq, 10, 'a smaller total does not shrink the range');
  tl.setTotal(12); assert.equal(tl.state.totalSeq, 12);
});

test('seek updates position, notifies onPosition, and re-derives the scene', async () => {
  let notified = -1;
  let rendered = null;
  const tl = new TimelineAdapter({
    dataSource: fakeSource(5),
    renderer: { setSceneGraph: (g) => { rendered = g; } },
    onPosition: (pos) => { notified = pos; },
  });
  await tl.seek(3);
  assert.equal(tl.state.currentSeq, 3);
  assert.equal(notified, 3, 'onPosition fired with the new head');
  assert.ok(rendered && rendered.at === 3, 'getStateAt(3) rendered');
});

test('setSpeed records the speed for local replay stepping', () => {
  const tl = new TimelineAdapter({ dataSource: fakeSource(5), renderer: {} });
  tl.setSpeed(4);
  assert.equal(tl.state.speed, 4);
});

test('loop seeks back to the start at the end of a local replay', async () => {
  const tl = new TimelineAdapter({ dataSource: fakeSource(2), renderer: { setSceneGraph() {} } });
  tl.setTotal(2);
  tl.setLoop(true);
  tl._timer = 1; // simulate an active local replay timer
  await tl.seek(2); // reaching the end with loop on rewinds to 0
  assert.equal(tl.state.currentSeq, 0, 'looped back to start');
});

test('without loop, reaching the end pauses the local replay', async () => {
  let cleared = false;
  const tl = new TimelineAdapter({ dataSource: fakeSource(2), renderer: { setSceneGraph() {} } });
  tl.setTotal(2);
  tl.state.playing = true;
  tl._timer = 1;
  const realClear = globalThis.clearInterval;
  globalThis.clearInterval = () => { cleared = true; };
  try { await tl.seek(2); } finally { globalThis.clearInterval = realClear; }
  assert.equal(tl.state.playing, false, 'paused at the end');
  assert.ok(cleared, 'the replay timer was cleared');
});
