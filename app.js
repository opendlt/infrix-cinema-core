/**
 * Infrix Cinema — canonical app core.
 *
 * mountCinema(options) is the ONE entry point every Cinema surface uses. It
 * builds the canonical product UI inside `options.root`, drives the single
 * CinemaRenderer from a CinemaDataSource, and gates controls by mode so the
 * standalone product, the Nexus-mounted view, the embeddable widget, and the
 * portable proof viewer all render the same scene with the same vocabulary and
 * the same disclosure guarantees.
 *
 *   options = {
 *     mode: 'cinema.full' | 'cinema.nexus' | 'cinema.embed' | 'cinema.proof',
 *     root: HTMLElement,
 *     dataSource?: CinemaDataSource,      // if omitted, built from the options below
 *     disclosureContext?: {viewerId,purpose,workflowInstance,grants?},
 *     initialSessionId?, initialIntentId?, initialProof?,
 *     capabilities?: partial override of the mode defaults,
 *     rpc?, wsUrl?, scene?, proof?, commit?, autoConnect?, header?
 *   }
 *
 * Returns a controller: { mode, renderer, dataSource, destroy, setScene,
 * timeline, controls, legend, export }.
 */
(function (root) {
  'use strict';
  const ns = (root.InfrixCinema = root.InfrixCinema || {});

  const MODES = {
    'cinema.full':  { live: true,  replay: true,  controls: true,  disclosureAware: true, connect: true  },
    'cinema.nexus': { live: true,  replay: true,  controls: true,  disclosureAware: true, sharedHeader: true },
    'cinema.embed': { live: false, replay: false, controls: false, disclosureAware: true, readOnly: true },
    'cinema.proof': { live: false, replay: true,  controls: true,  disclosureAware: true, proof: true },
  };

  function mountCinema(options) {
    options = options || {};
    const mode = MODES[options.mode] ? options.mode : 'cinema.full';
    const caps = Object.assign({}, MODES[mode], options.capabilities || {});
    const rootEl = options.root;
    if (!rootEl) throw new Error('mountCinema: options.root is required');
    const disclosureContext = options.disclosureContext || {};

    // ---- DOM skeleton (canonical IDs/classes, shared across surfaces) ----
    rootEl.classList.add('cinema-root', 'cinema-mode-' + mode.split('.')[1]);
    rootEl.replaceChildren();

    const stage = el('div', 'cinema-stage');
    const canvas = document.createElement('canvas');
    canvas.id = 'cinema-canvas';
    canvas.className = 'cinema-canvas';
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-roledescription', 'interactive scene graph');
    canvas.setAttribute('aria-label', 'Infrix Cinema scene graph — hover to peek, click to pin, drag to pan');
    stage.appendChild(canvas);

    // Details panel (right).
    const detailsPanelEl = el('div', 'cinema-panel panel hidden');
    detailsPanelEl.id = 'details-panel';
    const detailsHead = el('div', 'cinema-panel-header panel-header');
    const detailTitle = el('span'); detailTitle.id = 'detail-title'; detailTitle.textContent = 'Details';
    const detailClose = document.createElement('button'); detailClose.id = 'detail-close'; detailClose.textContent = '×'; detailClose.setAttribute('aria-label', 'Close details');
    detailsHead.appendChild(detailTitle); detailsHead.appendChild(detailClose);
    const detailContent = el('div'); detailContent.id = 'detail-content';
    detailsPanelEl.appendChild(detailsHead); detailsPanelEl.appendChild(detailContent);
    stage.appendChild(detailsPanelEl);

    // Body holds the canvas stage and, in split/narrative view, the audit story.
    const body = el('div', 'cinema-body');
    body.appendChild(stage);
    rootEl.appendChild(body);

    // Controls bar (skipped entirely in embed mode).
    const controlsHost = el('div', 'cinema-controls-host');
    if (!caps.readOnly) rootEl.appendChild(controlsHost);

    // Status bar.
    const status = el('footer', 'cinema-status');
    status.id = 'status-bar';
    status.append(
      span('status-block', 'Block: 0'), span('status-gas', 'Gas: 0'),
      span('status-nodes', 'Nodes: 0'), span('status-edges', 'Edges: 0'),
      span('status-fps', 'FPS: 0'),
    );
    if (!caps.readOnly) rootEl.appendChild(status);

    // ---- Renderer ----
    const renderer = new ns.CinemaRenderer(canvas);

    // ---- Details ----
    const details = new ns.DetailsPanel(detailsPanelEl, detailContent, detailClose);
    details.renderer = renderer;

    // Hover tooltip (B1) + accessible node list (B5).
    const tooltip = ns.CinemaTooltip ? new ns.CinemaTooltip(stage) : null;
    const a11y = ns.CinemaA11y ? new ns.CinemaA11y(renderer, rootEl, {
      onActivate: (id) => { const n = renderer._findNode ? renderer._findNode(id) : null; if (n) { renderer.selectedNode = id; details.showNode(n); } },
    }) : null;

    // Interaction model (B1): click pins details, hover peeks via tooltip, empty
    // click clears. Edge hover no longer throws open the heavy panel.
    renderer.on('nodeSelected', (n) => { details.showNode(n); if (tooltip) tooltip.hide(); if (a11y) a11y.focusNode(n.id); });
    renderer.on('edgeSelected', (t) => { details.showTraffic(t); if (tooltip) tooltip.hide(); });
    renderer.on('backgroundClicked', () => { details.hide(); renderer.setKeyboardFocus(null); });
    renderer.on('nodeHovered', (p) => { if (tooltip) tooltip.showNode(p.node, p.x, p.y, renderer.getNodeStats ? renderer.getNodeStats(p.node.id) : null); });
    renderer.on('edgeHovered', (p) => { if (tooltip) tooltip.showEdge(p.edge, p.x, p.y); });
    renderer.on('hoverEnd', () => { if (tooltip) tooltip.hide(); });

    // ---- Legend ----
    const legend = new ns.CinemaLegend(stage);

    // ---- Stage state overlay (A4): loading / empty / empty-filter / error ----
    const overlay = ns.CinemaStateOverlay ? new ns.CinemaStateOverlay(stage) : null;
    let connectionState = caps.connect ? 'idle' : (caps.live ? 'connecting' : 'idle');
    let everConnected = false;
    let connError = '';
    let filterActive = false;

    // ---- Layout engine (A1) ----
    const layoutController = ns.LayoutController ? new ns.LayoutController(renderer) : null;
    let layoutEngine = readLayout() || 'auto';
    let firstScene = true;

    function nodeCountNow() { const g = renderer.sceneGraph; return g ? countNodes(g) : 0; }
    function getEvents() { return (narrative && narrative.events) || []; }

    function refreshOverlay() {
      if (!overlay || !ns.resolveState) return;
      const state = ns.resolveState({
        nodeCount: nodeCountNow(), filterActive, connection: connectionState,
        everConnected, expectsConnection: !!(caps.connect || caps.live),
      });
      if (state === 'error') {
        overlay.set('error', { message: connError || undefined, actionLabel: 'Retry', onAction: retryConnect });
      } else if (state === 'empty-filter') {
        overlay.set('empty-filter', { onAction: clearFilter });
      } else if (state === 'empty') {
        if (caps.connect) overlay.set('empty', { actionLabel: 'Connect', onAction: openConnect });
        else overlay.set('empty');
      } else {
        overlay.set(state); // 'loading' or 'hidden'
      }
    }

    function onConnectionState(state, info) {
      connectionState = state;
      if (state === 'connected') everConnected = true;
      if (state === 'error') connError = (info && info.fatal)
        ? 'The session could not be reached after several attempts.'
        : 'The live connection dropped — Cinema is trying to reconnect.';
      refreshOverlay();
    }
    options.onConnectionState = onConnectionState;

    function retryConnect() {
      const ds = dataSource;
      if (ds && ds.client && ds.client.connect) { connectionState = 'connecting'; refreshOverlay(); ds.client.connect(); }
    }
    function clearFilter() {
      const search = rootEl.querySelector('#cinema-search');
      if (search) search.value = '';
      runSearch('');
    }
    function openConnect() {
      const dlg = rootEl.querySelector('#connect-dialog');
      if (dlg) dlg.classList.remove('hidden');
    }

    // applyLayout decides the engine: 'auto' respects server positions when every
    // node already has one, and computes a layout when any is missing; an explicit
    // Spine/Force choice always (re)lays out, even over server coordinates.
    function applyLayout(graph, o) {
      if (!graph || !layoutController) return;
      let eng = layoutEngine;
      if (eng === 'auto') eng = ns.needsLayout(graph) ? 'auto' : 'none';
      layoutController.apply(graph, eng, o || {});
    }

    function refreshTransport() {
      if (!controls) return;
      const evs = getEvents();
      const lastSeq = evs.length ? (evs[evs.length - 1].sequence != null ? evs[evs.length - 1].sequence : evs.length - 1) : 0;
      timeline.setTotal(lastSeq);
      const g = renderer.sceneGraph;
      const block = g ? (g.blockHeight || g.BlockHeight || 0) : 0;
      controls.setTicks(evs);
      controls.setPosition(timeline.state.currentSeq || 0, timeline.state.totalSeq || 0, block);
    }

    function stepEvent(dir) {
      const evs = getEvents().map((e) => e.sequence || 0).sort((a, b) => a - b);
      const cur = timeline.state.currentSeq || 0;
      let target = cur;
      if (dir > 0) { for (const s of evs) if (s > cur) { target = s; break; } }
      else { for (let i = evs.length - 1; i >= 0; i--) if (evs[i] < cur) { target = evs[i]; break; } }
      timeline.seek(target);
    }
    function jumpFailure() {
      const evs = getEvents();
      const f = evs.find((e) => e.status === 'failed') || evs[evs.length - 1];
      if (f) timeline.seek(f.sequence || 0);
    }

    // ---- Power search (B4) ----
    let matchedIds = [];
    let matchIndex = -1;
    let currentQuery = '';
    function gasOf(n) { try { return renderer.getNodeStats(n.id).totalGas || 0; } catch (_) { return 0; } }
    function runSearch(q) {
      currentQuery = q || '';
      const parsed = ns.parseSearchQuery ? ns.parseSearchQuery(currentQuery) : { isEmpty: !currentQuery.trim() };
      filterActive = !parsed.isEmpty;
      matchedIds = [];
      const g = renderer.sceneGraph;
      if (g) {
        let nodes = g.nodes; if (!Array.isArray(nodes)) nodes = Object.values(nodes || {});
        nodes.forEach((n) => {
          if (n._origOpacity == null) n._origOpacity = (n.opacity != null ? n.opacity : 1);
          const hit = parsed.isEmpty || (ns.matchSearch ? ns.matchSearch(n, parsed, { gasOf }) : true);
          n.opacity = hit ? n._origOpacity : 0.12;
          if (!parsed.isEmpty && hit) matchedIds.push(n.id);
        });
      }
      matchIndex = -1;
      if (controls) controls.setSearchCount(matchedIds.length, !parsed.isEmpty);
      persistSearch(currentQuery);
      refreshOverlay();
    }
    function stepMatch(dir) {
      if (!matchedIds.length) return;
      matchIndex = (matchIndex + dir + matchedIds.length) % matchedIds.length;
      renderer.flyTo(matchedIds[matchIndex]);
    }
    function persistSearch(q) {
      if (mode === 'cinema.full' || mode === 'cinema.nexus') { try { localStorage.setItem('cinema.search', q || ''); } catch (_) {} }
    }
    function readSearch() { try { return localStorage.getItem('cinema.search') || ''; } catch (_) { return ''; } }

    function readLayout() { try { return localStorage.getItem('cinema.layout'); } catch (_) { return null; } }
    function persistLayout(m) {
      if (mode === 'cinema.full' || mode === 'cinema.nexus') { try { localStorage.setItem('cinema.layout', m); } catch (_) {} }
    }

    // ---- Data source resolution ----
    let dataSource = options.dataSource || buildDataSource(mode, options, disclosureContext);

    // ---- Narrative (audit story) + sync (adoption-05) ----
    const proofForNarrative = options.proof || (dataSource && dataSource.proof) || null;
    let sync = null;
    const narrative = ns.NarrativePanel
      ? new ns.NarrativePanel(body, {
          proof: proofForNarrative,
          onCardFocus: (ids) => { if (sync) sync.highlightNodes(ids); },
        })
      : null;
    if (narrative && ns.createNarrativeSync) sync = ns.createNarrativeSync({ renderer, panel: narrative });

    // View mode: graph | narrative | split (orthogonal to the host mode). The
    // toggle is shown wherever there are controls; embed stays canvas-only.
    let viewMode = resolveViewMode(mode, options);
    applyViewMode(rootEl, viewMode);
    if (caps.controls && !caps.readOnly) {
      buildViewToggle(rootEl, viewMode, (m) => { viewMode = m; applyViewMode(rootEl, m); persistViewMode(mode, m); });
    }

    // ---- Timeline + export ----
    const timeline = new ns.TimelineAdapter({
      dataSource, renderer,
      onPosition: (pos) => {
        if (sync) sync.onPosition(pos);
        if (controls) {
          const g = renderer.sceneGraph;
          controls.setPosition(pos, timeline.state.totalSeq || 0, (g && (g.blockHeight || g.BlockHeight)) || 0);
        }
      },
    });
    const exporter = new ns.CinemaExport({ renderer, dataSource, mode, commit: options.commit, disclosureContext, timeline });

    // ---- Proof panel ----
    let proofPanel = null;
    if (caps.proof) {
      const proof = options.proof || (dataSource && dataSource.proof) || {};
      proofPanel = new ns.ProofPanel(rootEl, proof, { disclosureContext });
      // adoption-06 — mount the SAME proof-receipt component Nexus uses, so
      // Cinema proof mode answers the trust question identically. The receipt
      // is offline (the viewer did not confirm L0 live), so it caps at L3.
      mountCinemaProofReceipt(proofPanel, proof);
    }

    // ---- Controls ----
    let controls = null;
    if (!caps.readOnly) {
      controls = new ns.CinemaControls(controlsHost, {
        capabilities: caps,
        initialLayout: layoutEngine,
        handlers: {
          togglePlay: () => { timeline.togglePlay(); controls.setPlaying(timeline.state.playing); },
          stepForward: () => timeline.stepForward(),
          stepBack: () => timeline.stepBackward(),
          seek: (pos) => timeline.seek(pos),
          setSpeed: (s) => timeline.setSpeed(s),
          toggleLoop: (on) => timeline.setLoop(on),
          jumpFailure: jumpFailure,
          jumpEventNext: () => stepEvent(1),
          jumpEventPrev: () => stepEvent(-1),
          fit: () => renderer.fitToView(),
          resetView: () => renderer.resetView(),
          layout: (eng) => { layoutEngine = eng; persistLayout(eng); applyLayout(renderer.sceneGraph, { animate: true, fit: true }); },
          filter: (q) => runSearch(q),
          searchNext: () => stepMatch(1),
          searchPrev: () => stepMatch(-1),
          toggleLegend: () => legend.toggle(),
          export: () => openExportMenu(exporter, rootEl),
        },
      });
      // Restore a persisted query so a returning operator keeps their filter.
      const q0 = readSearch();
      if (q0) { controls.setSearchValue(q0); runSearch(q0); }
    }

    // ---- Scene wiring ----
    let unsubscribe = () => {};
    function onScene(g) {
      if (g && g.__update) {
        renderer.applyUpdate(g.__update);
        // Place any newcomers that arrived without coordinates, without
        // disturbing the rest (no animation/refit on incremental updates).
        if (ns.needsLayout && ns.needsLayout(renderer.sceneGraph)) applyLayout(renderer.sceneGraph, { animate: false });
        if (a11y) a11y.setScene(renderer.sceneGraph);
        if (filterActive) runSearch(currentQuery);
        refreshTransport();
        refreshOverlay();
        return;
      }
      renderer.setSceneGraph(g || {});
      applyLayout(renderer.sceneGraph, { animate: !firstScene, fit: firstScene });
      firstScene = false;
      if (narrative) {
        try { narrative.setScene(g || {}, { proof: options.proof || (dataSource && dataSource.proof) || null }); } catch (e) {}
      }
      if (a11y) a11y.setScene(renderer.sceneGraph);
      if (filterActive) runSearch(currentQuery);
      refreshTransport();
      refreshOverlay();
    }

    function bind(ds) {
      dataSource = ds;
      timeline.dataSource = ds;
      exporter.dataSource = ds;
      // Initial paint.
      if (ds.getScene) ds.getScene().then((g) => { if (g && (countNodes(g) > 0)) onScene(g); }).catch(() => {});
      if (ds.subscribeScene) unsubscribe = ds.subscribeScene(onScene);
      timeline.refresh().catch(() => {});
    }

    // Full mode connect dialog (preserves the standalone product UX + IDs).
    if (caps.connect) {
      const dialog = buildConnectDialog(options);
      rootEl.appendChild(dialog.el);
      dialog.onConnect((wsUrl, sessionId) => {
        const ds = new ns.StandaloneCinemaDataSource({ wsUrl, sessionId, disclosureContext, onConnectionState });
        dialog.el.classList.add('hidden');
        connectionState = 'connecting';
        refreshOverlay();
        bind(ds);
      });
      if (options.autoConnect && options.wsUrl) dialog.connect(options.wsUrl, options.initialSessionId);
    } else {
      bind(dataSource);
    }

    // Seed the renderer + narrative from an inline scene (the nexus host and the
    // embed widget both pass options.scene rather than an async source). Apply
    // the SAME disclosure filter the data sources use so nothing private leaks
    // into the canvas or the story.
    if (options.scene && countNodes(options.scene) > 0) {
      const safe = ns.applyDisclosure ? ns.applyDisclosure(options.scene, disclosureContext) : options.scene;
      onScene(safe);
    }

    // Initial transport + overlay paint (before any scene arrives).
    refreshTransport();
    refreshOverlay();

    // Status loop.
    const statusTimer = setInterval(() => updateStatus(renderer, status), 500);

    return {
      mode, caps, renderer, get dataSource() { return dataSource; }, timeline, controls, legend, exporter, details, proofPanel,
      narrative, sync, get viewMode() { return viewMode; },
      setViewMode(m) { viewMode = m; applyViewMode(rootEl, m); persistViewMode(mode, m); },
      setScene: onScene,
      destroy() {
        try { unsubscribe(); } catch (e) {}
        clearInterval(statusTimer);
        timeline.destroy();
        if (controls && controls.destroy) controls.destroy();
        if (layoutController) layoutController.destroy();
        if (overlay) overlay.destroy();
        if (tooltip) tooltip.destroy();
        if (a11y) a11y.destroy();
        if (sync) sync.destroy();
        if (narrative) narrative.destroy();
        renderer.destroy();
      },
    };
  }

  // mountCinemaProofReceipt dynamic-imports the canonical proof-receipt
  // component (the same files the Nexus prove view uses) and mounts a receipt
  // at the top of the proof panel. Best-effort: if the modules are not
  // reachable (e.g. an offline extension bundle), the proof panel still shows.
  function mountCinemaProofReceipt(proofPanel, proof) {
    if (!proofPanel || !proofPanel.el || typeof Promise === 'undefined') return;
    Promise.all([
      import('/lib/proofReceipt.js'),
      import('/components/proofReceiptView.js'),
    ]).then(([rl, rv]) => {
      const govMatch = String((proof.assurance && proof.assurance.label) || '').match(/G\d/);
      const anchor = proof.anchor || {};
      const receipt = rl.buildReceiptFromVerifier({ passed: true, checks: [] }, {
        subjectType: 'evidence',
        governanceLevel: govMatch ? govMatch[0] : '',
        anchorTx: String(anchor.txHash || ''),
        replayVerified: false,
        verifier: 'Cinema proof viewer',
      });
      const host = document.createElement('div');
      host.className = 'cinema-receipt-host';
      proofPanel.el.insertBefore(host, proofPanel.el.firstChild);
      rv.mountProofReceipt(host, receipt);
    }).catch(() => { /* component not reachable in this host; proof panel still renders */ });
  }

  // ---- View mode (graph | narrative | split) ----
  const VIEW_MODES = ['graph', 'narrative', 'split'];
  const VIEW_KEY = 'cinema.mode';

  function resolveViewMode(mode, options) {
    if (options.narrativeMode && VIEW_MODES.indexOf(options.narrativeMode) >= 0) return options.narrativeMode;
    if (mode === 'cinema.embed') return 'graph'; // embed is canvas-first; story is opt-in
    if (mode === 'cinema.proof') return 'split';
    // full + nexus: remember the operator's last choice, default to split.
    const saved = readViewMode();
    return (saved && VIEW_MODES.indexOf(saved) >= 0) ? saved : 'split';
  }
  function readViewMode() { try { return localStorage.getItem(VIEW_KEY); } catch (_) { return null; } }
  function persistViewMode(mode, m) {
    if (mode === 'cinema.full' || mode === 'cinema.nexus') { try { localStorage.setItem(VIEW_KEY, m); } catch (_) {} }
  }
  function applyViewMode(rootEl, m) {
    if (VIEW_MODES.indexOf(m) < 0) m = 'split';
    rootEl.dataset.view = m;
    for (const x of VIEW_MODES) rootEl.classList.remove('cinema-view-' + x);
    rootEl.classList.add('cinema-view-' + m);
  }
  function buildViewToggle(rootEl, current, onChange) {
    const wrap = el('div', 'cinema-view-toggle');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'View mode');
    const labels = [['graph', 'Graph'], ['narrative', 'Narrative'], ['split', 'Split']];
    const btns = [];
    for (const [m, label] of labels) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cinema-view-btn' + (m === current ? ' active' : '');
      b.dataset.view = m;
      b.textContent = label;
      b.setAttribute('aria-pressed', m === current ? 'true' : 'false');
      b.addEventListener('click', () => {
        for (const x of btns) { const on = x.dataset.view === m; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }
        onChange(m);
      });
      btns.push(b);
      wrap.appendChild(b);
    }
    rootEl.appendChild(wrap);
    return wrap;
  }

  function buildDataSource(mode, options, disclosureContext) {
    const o = Object.assign({}, options, { disclosureContext });
    switch (mode) {
      case 'cinema.proof':
        return new ns.ProofCinemaDataSource(Object.assign(o, { proof: options.proof || {} }));
      case 'cinema.embed':
        return new ns.EmbedCinemaDataSource(Object.assign(o, { scene: options.scene || {} }));
      case 'cinema.nexus':
        return new ns.NexusCinemaDataSource(Object.assign(o, { rpc: options.rpc, method: options.method, params: options.params }));
      case 'cinema.full':
      default:
        // Full mode resolves its source from the connect dialog; provide an
        // empty embed source until then so the renderer has something.
        return new ns.EmbedCinemaDataSource(Object.assign(o, { scene: options.scene || {} }));
    }
  }

  function buildConnectDialog(options) {
    const el0 = el('div', 'cinema-dialog dialog');
    el0.id = 'connect-dialog';
    const box = el('div', 'cinema-dialog-content dialog-content');
    const h = el('h2'); h.textContent = 'Connect to Cinema session'; box.appendChild(h);
    const l1 = document.createElement('label'); l1.textContent = 'WebSocket URL: ';
    const wsInput = document.createElement('input'); wsInput.type = 'text'; wsInput.id = 'input-ws-url';
    wsInput.value = options.wsUrl || 'ws://localhost:8080/cinema/ws';
    wsInput.placeholder = 'ws://host:port/cinema/ws'; l1.appendChild(wsInput); box.appendChild(l1);
    const l2 = document.createElement('label'); l2.textContent = 'Session ID: ';
    const sidInput = document.createElement('input'); sidInput.type = 'text'; sidInput.id = 'input-session-id';
    sidInput.placeholder = 'Session ID (optional — auto-discovers)';
    if (options.initialSessionId) sidInput.value = options.initialSessionId;
    l2.appendChild(sidInput); box.appendChild(l2);
    const btn = document.createElement('button'); btn.id = 'btn-connect'; btn.textContent = 'Connect'; box.appendChild(btn);
    el0.appendChild(box);
    let cb = null;
    btn.addEventListener('click', () => { if (cb) cb(wsInput.value, sidInput.value || null); });
    return {
      el: el0,
      onConnect(fn) { cb = fn; },
      connect(wsUrl, sid) { wsInput.value = wsUrl || wsInput.value; if (sid) sidInput.value = sid; if (cb) cb(wsInput.value, sidInput.value || null); },
    };
  }

  function applyFilter(renderer, q) {
    const g = renderer.sceneGraph;
    if (!g) return;
    const query = String(q || '').trim().toLowerCase();
    const nodes = Array.isArray(g.nodes) ? g.nodes : Object.values(g.nodes || {});
    nodes.forEach(n => {
      const hit = !query || (String(n.label || '').toLowerCase().includes(query) || String(n.kind || '').toLowerCase().includes(query));
      n.opacity = hit ? (n._origOpacity != null ? n._origOpacity : 1) : 0.12;
      if (n._origOpacity == null) n._origOpacity = 1;
    });
  }

  function openExportMenu(exporter, rootEl) {
    // Minimal, dependency-free chooser. Each option is self-describing.
    const existing = rootEl.querySelector('.cinema-export-menu');
    if (existing) { existing.remove(); return; }
    const menu = el('div', 'cinema-export-menu');
    const items = [
      ['PNG', () => exporter.screenshot()],
      ['SVG', () => exporter.exportSVG()],
      ['JSON', () => exporter.exportJSON()],
      ['Replay ref', () => exporter.replayRef()],
      ['Proof report', () => exporter.proofReport()],
    ];
    for (const [label, fn] of items) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cinema-export-item'; b.textContent = label;
      b.addEventListener('click', () => { fn(); menu.remove(); });
      menu.appendChild(b);
    }
    rootEl.appendChild(menu);
  }

  function updateStatus(renderer, status) {
    if (!renderer || !status) return;
    const s = renderer.getStats();
    const g = renderer.sceneGraph;
    setText(status, 'status-nodes', `Nodes: ${s.nodes}`);
    setText(status, 'status-edges', `Edges: ${s.edges}`);
    setText(status, 'status-fps', `FPS: ${s.fps}`);
    if (g) {
      setText(status, 'status-block', `Block: ${g.blockHeight || 0}`);
      setText(status, 'status-gas', `Gas: ${(g.totalGasUsed || 0).toLocaleString()}`);
    }
  }

  function countNodes(g) { const n = g.nodes || g.Nodes; return n ? (Array.isArray(n) ? n.length : Object.keys(n).length) : 0; }
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function span(id, text) { const s = document.createElement('span'); s.id = id; s.textContent = text; return s; }
  function setText(rootEl, id, text) { const e = rootEl.querySelector('#' + id); if (e) e.textContent = text; }

  ns.mountCinema = mountCinema;
  ns.MODES = MODES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { mountCinema, MODES };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
