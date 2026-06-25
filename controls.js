/**
 * Infrix Cinema — canonical control bar + transport (Tier A / A2).
 *
 * One control vocabulary for every surface: a TRANSPORT row (scrubber with
 * per-event ticks, time readout, speed, loop, jump-to-failure) plus the action
 * row (play/step, fit/reset, filter/search, legend, export). The set shown is
 * gated by mode capabilities (embed shows none; proof shows replay + export +
 * legend; nexus/full show everything). This guarantees a control means the same
 * thing wherever Cinema is mounted.
 *
 * Before this, TimelineAdapter tracked currentSeq/totalSeq/speed but the bar
 * rendered no scrubber at all — the spine of a "replay the story" product was
 * missing. The transport row is that spine.
 */
(function (root) {
  'use strict';
  const ns = (root.InfrixCinema = root.InfrixCinema || {});

  class CinemaControls {
    constructor(hostEl, opts) {
      this.host = hostEl;
      this.opts = opts || {};
      this.caps = this.opts.capabilities || {};
      this.handlers = this.opts.handlers || {};
      this.el = null;            // action row
      this.transportEl = null;   // transport row
      this.scrubber = null;
      this.ticksEl = null;
      this.timeEl = null;
      this.speed = 1;
      this.loop = false;
      this.position = { cur: 0, total: 0, block: 0 };
      this._onKey = null;
      this.build();
    }

    build() {
      const playback = this.caps.controls && (this.caps.live || this.caps.replay);

      // ---- Transport row (scrubber + ticks + time + speed + loop) ----
      if (playback) {
        const t = document.createElement('div');
        t.className = 'cinema-transport';
        t.setAttribute('role', 'group');
        t.setAttribute('aria-label', 'Timeline transport');

        t.appendChild(this.btn('cinema-btn-playpause', '▶', 'Play / pause (Space)', () => this.fire('togglePlay')));
        t.appendChild(this.btn('cinema-btn-step-back', '⏮', 'Step back (←)', () => this.fire('stepBack')));
        t.appendChild(this.btn('cinema-btn-step-fwd', '⏭', 'Step forward (→)', () => this.fire('stepForward')));

        const scrubWrap = document.createElement('div');
        scrubWrap.className = 'cinema-scrubber-wrap';
        const ticks = document.createElement('div');
        ticks.className = 'cinema-scrubber-ticks';
        ticks.setAttribute('aria-hidden', 'true');
        const scrub = document.createElement('input');
        scrub.type = 'range';
        scrub.id = 'cinema-scrubber';
        scrub.className = 'cinema-scrubber';
        scrub.min = '0'; scrub.max = '0'; scrub.step = '1'; scrub.value = '0';
        scrub.setAttribute('aria-label', 'Timeline position');
        scrub.addEventListener('input', () => this.fire('seek', Number(scrub.value)));
        scrubWrap.appendChild(ticks);
        scrubWrap.appendChild(scrub);
        t.appendChild(scrubWrap);
        this.scrubber = scrub; this.ticksEl = ticks;

        const time = document.createElement('span');
        time.className = 'cinema-time';
        time.id = 'cinema-time';
        time.textContent = '—';
        t.appendChild(time);
        this.timeEl = time;

        // Jump to first failure — an auditor's fastest path to "what broke".
        t.appendChild(this.btn('cinema-btn-jump-fail', '⚑', 'Jump to first failure', () => this.fire('jumpFailure')));

        // Speed segmented control.
        const speeds = [0.5, 1, 2, 4];
        const speedGroup = document.createElement('div');
        speedGroup.className = 'cinema-speed';
        speedGroup.setAttribute('role', 'group');
        speedGroup.setAttribute('aria-label', 'Playback speed');
        this._speedBtns = [];
        for (const s of speeds) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'cinema-speed-btn' + (s === 1 ? ' active' : '');
          b.dataset.speed = String(s);
          b.textContent = s + '×';
          b.setAttribute('aria-pressed', s === 1 ? 'true' : 'false');
          b.addEventListener('click', () => { this.setSpeed(s); this.fire('setSpeed', s); });
          this._speedBtns.push(b);
          speedGroup.appendChild(b);
        }
        t.appendChild(speedGroup);

        const loopBtn = this.btn('cinema-btn-loop', '↻', 'Loop replay', () => { this.setLoop(!this.loop); this.fire('toggleLoop', this.loop); });
        t.appendChild(loopBtn);
        this._loopBtn = loopBtn;

        this.transportEl = t;
        if (this.host) this.host.appendChild(t);
      }

      // ---- Action row ----
      const bar = document.createElement('div');
      bar.className = 'cinema-controls';
      bar.setAttribute('role', 'toolbar');
      bar.setAttribute('aria-label', 'Cinema controls');

      if (this.caps.controls) {
        bar.appendChild(this.btn('cinema-btn-fit', '⤢', 'Fit to view', () => this.fire('fit')));
        bar.appendChild(this.btn('btn-zoom-reset', '⊙', 'Reset zoom', () => this.fire('resetView')));

        // Layout engine selector (A1) — Auto / Spine / Force.
        const layoutGroup = document.createElement('div');
        layoutGroup.className = 'cinema-layout-toggle';
        layoutGroup.setAttribute('role', 'group');
        layoutGroup.setAttribute('aria-label', 'Layout');
        const engines = [['auto', 'Auto'], ['spine', 'Spine'], ['force', 'Force']];
        this._layoutBtns = [];
        const initial = (this.opts.initialLayout || 'auto');
        for (const [eng, label] of engines) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'cinema-layout-btn' + (eng === initial ? ' active' : '');
          b.dataset.engine = eng;
          b.textContent = label;
          b.title = label + ' layout';
          b.setAttribute('aria-pressed', eng === initial ? 'true' : 'false');
          b.addEventListener('click', () => { this.setLayout(eng); this.fire('layout', eng); });
          this._layoutBtns.push(b);
          layoutGroup.appendChild(b);
        }
        bar.appendChild(layoutGroup);

        // Power search (B4): kind:/status:/gas: grammar + result count + stepper.
        const sWrap = document.createElement('div');
        sWrap.className = 'cinema-search-wrap';
        const search = document.createElement('input');
        search.type = 'search';
        search.id = 'cinema-search';
        search.className = 'cinema-search';
        search.placeholder = 'Filter  (try kind:contract, status:frozen, gas:>1000)';
        search.setAttribute('aria-label', 'Filter nodes — supports kind:, status:, gas: and free text');
        search.addEventListener('input', () => this.fire('filter', search.value));
        search.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); this.fire(e.shiftKey ? 'searchPrev' : 'searchNext'); }
          else if (e.key === 'Escape') { e.preventDefault(); search.value = ''; this.fire('filter', ''); }
        });
        this.searchEl = search;
        sWrap.appendChild(search);

        const count = document.createElement('span');
        count.className = 'cinema-search-count hidden';
        count.id = 'cinema-search-count';
        count.setAttribute('aria-live', 'polite');
        sWrap.appendChild(count);
        this.searchCountEl = count;

        const nav = document.createElement('span');
        nav.className = 'cinema-search-nav hidden';
        const prev = this.btn('cinema-search-prev', '‹', 'Previous match (Shift+Enter)', () => this.fire('searchPrev'));
        const next = this.btn('cinema-search-next', '›', 'Next match (Enter)', () => this.fire('searchNext'));
        prev.classList.add('cinema-search-navbtn'); next.classList.add('cinema-search-navbtn');
        nav.appendChild(prev); nav.appendChild(next);
        sWrap.appendChild(nav);
        this.searchNavEl = nav;

        bar.appendChild(sWrap);
      }

      // Cinematic autoplay (G1) — the headline "watch it explain itself" action.
      if (this.caps.controls && (this.caps.live || this.caps.replay)) {
        const story = this.btn('cinema-btn-story', '▶ Play story', 'Play the audit story (cinematic)', () => this.fire('playStory'));
        story.classList.add('cinema-btn-primary');
        this._storyBtn = story;
        bar.appendChild(story);
      }

      // "Verify it yourself" (H1) — the moat: re-check the bundle in-browser.
      if (this.opts.canVerify) {
        const verify = this.btn('cinema-btn-verify', '✓ Verify', 'Verify this bundle yourself (in your browser)', () => this.fire('verify'));
        verify.classList.add('cinema-btn-verify');
        bar.appendChild(verify);
      }

      // Plan vs Actual (I1) — shown only when a captured plan is present.
      if (this.caps.controls) {
        const drift = this.btn('cinema-btn-drift', '⧉ Plan vs Actual', 'Compare what was predicted with what actually happened', () => this.fire('toggleDrift'));
        drift.classList.add('hidden');
        this._driftBtn = drift;
        bar.appendChild(drift);
      }

      bar.appendChild(this.btn('cinema-btn-legend', 'Legend', 'Toggle legend', () => this.fire('toggleLegend')));
      if (this.caps.controls || this.caps.replay) {
        bar.appendChild(this.btn('btn-screenshot', 'Export', 'Export / share', () => this.fire('export')));
      }

      this.el = bar;
      if (this.host) this.host.appendChild(bar);

      // Keyboard transport (Space / arrows / Home / End), ignored while typing.
      if (playback) {
        this._onKey = (e) => this._handleKey(e);
        document.addEventListener('keydown', this._onKey);
      }
    }

    _handleKey(e) {
      const tgt = e.target;
      if (tgt && (/^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName) || tgt.isContentEditable)) return;
      switch (e.key) {
        case ' ': case 'Spacebar': e.preventDefault(); this.fire('togglePlay'); break;
        case 'ArrowLeft': e.preventDefault(); this.fire(e.shiftKey ? 'jumpEventPrev' : 'stepBack'); break;
        case 'ArrowRight': e.preventDefault(); this.fire(e.shiftKey ? 'jumpEventNext' : 'stepForward'); break;
        case 'Home': e.preventDefault(); this.fire('seek', 0); break;
        case 'End': e.preventDefault(); this.fire('seek', this.position.total || 0); break;
        default: break;
      }
    }

    btn(id, label, title, onClick) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = id;
      b.className = 'cinema-btn';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', onClick);
      return b;
    }

    setPlaying(playing) {
      const b = this.transportEl && this.transportEl.querySelector('#cinema-btn-playpause');
      if (b) b.textContent = playing ? '⏸' : '▶';
    }

    setSpeed(n) {
      this.speed = n;
      for (const b of (this._speedBtns || [])) {
        const on = Number(b.dataset.speed) === n;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }

    setLoop(on) {
      this.loop = !!on;
      if (this._loopBtn) { this._loopBtn.classList.toggle('active', this.loop); this._loopBtn.setAttribute('aria-pressed', this.loop ? 'true' : 'false'); }
    }

    setStoryPlaying(on) {
      if (this._storyBtn) this._storyBtn.textContent = on ? '⏸ Pause story' : '▶ Play story';
    }

    setDriftAvailable(on) { if (this._driftBtn) this._driftBtn.classList.toggle('hidden', !on); }
    setDriftActive(on) {
      if (!this._driftBtn) return;
      this._driftBtn.classList.toggle('cinema-btn-primary', on);
      this._driftBtn.textContent = on ? '⧉ Exit compare' : '⧉ Plan vs Actual';
    }

    setLayout(engine) {
      for (const b of (this._layoutBtns || [])) {
        const on = b.dataset.engine === engine;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }

    /** setPosition updates the scrubber + readout. */
    setPosition(cur, total, block) {
      this.position = { cur: cur || 0, total: total || 0, block: block || 0 };
      if (this.scrubber) {
        this.scrubber.max = String(total || 0);
        if (document.activeElement !== this.scrubber) this.scrubber.value = String(cur || 0);
        this.scrubber.disabled = !total;
      }
      if (this.timeEl) {
        this.timeEl.textContent = total
          ? `seq ${cur || 0} / ${total}` + (block ? ` · block ${block.toLocaleString()}` : '')
          : (block ? `block ${block.toLocaleString()}` : '—');
      }
    }

    /** setTicks renders one marker per narrative event, colored by status. */
    setTicks(events) {
      if (!this.ticksEl) return;
      this.ticksEl.replaceChildren();
      const evs = events || [];
      const total = evs.reduce((m, e) => Math.max(m, e.sequence || 0), 0) || 1;
      for (const e of evs) {
        const tick = document.createElement('button');
        tick.type = 'button';
        tick.className = 'cinema-tick';
        tick.dataset.status = e.status || '';
        tick.style.left = ((e.sequence || 0) / total * 100) + '%';
        tick.title = (e.stage || '') + (e.status ? ' — ' + e.status : '');
        tick.setAttribute('aria-label', 'Jump to ' + (e.stage || 'event'));
        tick.addEventListener('click', () => this.fire('seek', e.sequence || 0));
        this.ticksEl.appendChild(tick);
      }
    }

    /** setSearchCount shows the result tally + stepper while a query is active. */
    setSearchCount(matched, hasQuery) {
      if (!this.searchCountEl) return;
      if (!hasQuery) {
        this.searchCountEl.classList.add('hidden');
        if (this.searchNavEl) this.searchNavEl.classList.add('hidden');
        return;
      }
      this.searchCountEl.textContent = matched + (matched === 1 ? ' match' : ' matches');
      this.searchCountEl.classList.remove('hidden');
      if (this.searchNavEl) this.searchNavEl.classList.toggle('hidden', !matched);
    }

    /** setSearchValue restores a persisted query into the box (no event fired). */
    setSearchValue(v) { if (this.searchEl) this.searchEl.value = v || ''; }

    fire(name, arg) { const h = this.handlers[name]; if (h) h(arg); }

    destroy() {
      if (this._onKey) { document.removeEventListener('keydown', this._onKey); this._onKey = null; }
    }
  }

  ns.CinemaControls = CinemaControls;
  if (typeof module !== 'undefined' && module.exports) module.exports = { CinemaControls };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
