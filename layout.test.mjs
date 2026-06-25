// Tier A / A1 — layout engine unit tests.
//   node --test "*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The core modules are classic-script IIFEs (no ESM exports); importing them for
// their side effect attaches the API to globalThis.InfrixCinema. layout.js reads
// narrativeStageForKind, so load the narrative templates first.
import './narrativeTemplates.js';
import './layout.js';
const { computeLayout, needsLayout, chooseAutoEngine } = globalThis.InfrixCinema;

function governanceScene() {
  return {
    blockHeight: 100,
    nodes: [
      { id: 'i1', kind: 'intent', label: 'transfer' },
      { id: 'p1', kind: 'policy', label: 'rule' },
      { id: 'a1', kind: 'approval_gate', label: 'approve' },
      { id: 'x1', kind: 'contract', label: 'exec' },
      { id: 'o1', kind: 'outcome', label: 'done' },
      { id: 'e1', kind: 'evidence', label: 'bundle' },
      { id: 'an1', kind: 'anchor', label: 'L0' },
    ],
    edges: [
      { id: 'e-1', fromNodeId: 'i1', toNodeId: 'p1' },
      { id: 'e-2', fromNodeId: 'p1', toNodeId: 'a1' },
      { id: 'e-3', fromNodeId: 'a1', toNodeId: 'x1' },
      { id: 'e-4', fromNodeId: 'x1', toNodeId: 'o1' },
      { id: 'e-5', fromNodeId: 'o1', toNodeId: 'e1' },
      { id: 'e-6', fromNodeId: 'e1', toNodeId: 'an1' },
    ],
  };
}

test('needsLayout is true when any node lacks a finite position', () => {
  assert.equal(needsLayout(governanceScene()), true);
  const placed = { nodes: [{ id: 'a', position: { x: 1, y: 2 } }] };
  assert.equal(needsLayout(placed), false);
  const broken = { nodes: [{ id: 'a', position: { x: NaN, y: 2 } }] };
  assert.equal(needsLayout(broken), true);
});

test('chooseAutoEngine picks spine for a governance flow, force/grid otherwise', () => {
  assert.equal(chooseAutoEngine(governanceScene()), 'spine');
  const generic = { nodes: [{ id: 'a', kind: 'thing' }, { id: 'b', kind: 'thing' }], edges: [{ fromNodeId: 'a', toNodeId: 'b' }] };
  assert.equal(chooseAutoEngine(generic), 'force');
  const islands = { nodes: [{ id: 'a', kind: 'thing' }, { id: 'b', kind: 'thing' }], edges: [] };
  assert.equal(chooseAutoEngine(islands), 'grid');
});

test('spine layout assigns lanes in governance order and positions every node', () => {
  const { positions, lanes } = computeLayout(governanceScene(), 'spine');
  assert.equal(positions.size, 7);
  for (const n of governanceScene().nodes) {
    const p = positions.get(n.id);
    assert.ok(p && isFinite(p.x) && isFinite(p.y), `position for ${n.id}`);
  }
  // lanes are ordered left→right by stage; x strictly increases.
  assert.ok(lanes.length >= 5);
  for (let i = 1; i < lanes.length; i++) assert.ok(lanes[i].x > lanes[i - 1].x, 'lane x increases');
  // intent is the first lane, anchor after evidence.
  assert.equal(lanes[0].stage, 'intent');
  const stages = lanes.map((l) => l.stage);
  assert.ok(stages.indexOf('anchor') > stages.indexOf('evidence'));
});

test('computeLayout produces no overlapping nodes (force engine)', () => {
  const scene = governanceScene();
  const { positions } = computeLayout(scene, 'force');
  const pts = [...positions.values()];
  let minDist = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
    if (d < minDist) minDist = d;
  }
  // collision radius ~ (size 10 + 8) * 2 = 36; allow a generous floor.
  assert.ok(minDist > 14, `nodes should be separated, got ${minDist}`);
});

test('force layout is deterministic (no Math.random)', () => {
  const a = computeLayout(governanceScene(), 'force').positions;
  const b = computeLayout(governanceScene(), 'force').positions;
  for (const [id, p] of a) {
    const q = b.get(id);
    assert.ok(Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9, `deterministic ${id}`);
  }
});

test("engine 'none' respects server positions and adds none", () => {
  const scene = { nodes: [{ id: 'a', position: { x: 5, y: 9 } }, { id: 'b' }] };
  const { positions } = computeLayout(scene, 'none');
  assert.deepEqual(positions.get('a'), { x: 5, y: 9 });
  assert.equal(positions.has('b'), false);
});

test('layout does not mutate the input graph', () => {
  const scene = governanceScene();
  const snapshot = JSON.stringify(scene);
  computeLayout(scene, 'spine');
  computeLayout(scene, 'force');
  assert.equal(JSON.stringify(scene), snapshot, 'computeLayout must be pure');
});

test('LayoutController (snap path) writes positions onto live nodes and feeds lanes to the renderer', () => {
  const { LayoutController } = globalThis.InfrixCinema;
  let lanes = 'unset';
  const fakeRenderer = { setLayoutLanes: (l) => { lanes = l; }, requestRender() {}, fitToView() { this.fitted = true; } };
  const ctl = new LayoutController(fakeRenderer);
  const scene = governanceScene();
  ctl.apply(scene, 'spine', { animate: false, fit: true });
  for (const n of scene.nodes) assert.ok(n.position && isFinite(n.position.x), `node ${n.id} positioned`);
  assert.ok(Array.isArray(lanes) && lanes.length, 'lanes handed to renderer for spine');
  assert.ok(fakeRenderer.fitted, 'fit honored');
  // 'none' over a fully-placed graph clears the lanes.
  ctl.apply(scene, 'none', { animate: false });
  assert.equal(lanes, null, 'lanes cleared when not in spine mode');
});

test('redacted nodes keep their fixed size through layout (disclosure-safe)', () => {
  const scene = {
    nodes: [
      { id: 'a', kind: 'contract', label: 'pub' },
      { id: 'b', kind: 'account', label: '[private]', redacted: true, size: 20, opacity: 0.4 },
    ],
    edges: [{ fromNodeId: 'a', toNodeId: 'b' }],
  };
  computeLayout(scene, 'force');
  // computeLayout is pure (positions returned separately); the redacted node's
  // size/opacity are never touched by the layout math.
  assert.equal(scene.nodes[1].size, 20);
  assert.equal(scene.nodes[1].opacity, 0.4);
});
