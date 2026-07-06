/*!
 * Brichaus UI Kit — <bui-spinner>, <bui-skeleton>, <bui-dots>, <bui-checklist>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Four small loading/waiting widgets, grouped in one file because they
 * share a stylesheet and are always reached for together around a
 * "generating your results" moment.
 *
 * <bui-spinner>
 *   Attributes: size ("sm" | "md" default | "lg"), tone ("accent" default | "slate")
 *   Usage: <bui-spinner size="sm"></bui-spinner>
 *
 * <bui-skeleton>
 *   Attributes: width (CSS width, default "100%"), height (CSS height, default "14px")
 *   Usage (stack a few for a multi-line placeholder):
 *     <bui-skeleton width="70%"></bui-skeleton>
 *     <bui-skeleton></bui-skeleton>
 *     <bui-skeleton width="45%"></bui-skeleton>
 *
 * <bui-dots>
 *   Attributes: tone ("accent" default | "slate")
 *   Usage: <bui-dots></bui-dots>
 *
 * <bui-checklist>
 *   Presentational sequential-progress checklist ("finalizing your
 *   report"). Attributes: items (comma-separated labels), current
 *   (1-based index of the in-progress item — items before it show a
 *   checkmark, items after show a dim pending circle).
 *   Usage:
 *     <bui-checklist
 *       items="Property located,Market data retrieved,Finalizing recommendations,Generating your report"
 *       current="3">
 *     </bui-checklist>
 *   Property: .current get/set (number, 1-based) — same as the attribute.
 *   All motion respects prefers-reduced-motion (entrance/spin/shimmer/pulse
 *   are skipped in favor of the end state).
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-spinner/skeleton/dots/checklist] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-loading';
  window.BUI.injectStyle(STYLE_ID, [
    '@keyframes bui-spin { to { transform: rotate(360deg); } }',
    '@keyframes bui-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }',
    '@keyframes bui-pulse-dot { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }',
    '@keyframes bui-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',

    'bui-spinner { display: inline-block; }',
    '.bui-spinner { display: block; }',
    '.bui-spinner[data-size="sm"] { width: 22px; height: 22px; }',
    '.bui-spinner[data-size="md"] { width: 32px; height: 32px; }',
    '.bui-spinner[data-size="lg"] { width: 44px; height: 44px; }',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-spinner__arc { animation: bui-spin 0.8s linear infinite; transform-origin: center; }',
    '}',
    '.bui-spinner__arc[data-tone="accent"] { stroke: var(--bui-color-accent); }',
    '.bui-spinner__arc[data-tone="slate"] { stroke: var(--bui-color-slate); }',

    'bui-skeleton { display: block; }',
    '.bui-skeleton {',
    '  border-radius: var(--bui-radius-sm);',
    '  background: linear-gradient(90deg, var(--bui-color-border) 25%, var(--bui-color-surface) 50%, var(--bui-color-border) 75%);',
    '  background-size: 200% 100%;',
    '}',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-skeleton { animation: bui-shimmer 1.4s infinite; }',
    '}',

    'bui-dots { display: inline-flex; }',
    '.bui-dots { display: flex; gap: var(--bui-space-2); align-items: center; }',
    '.bui-dots__dot { width: 11px; height: 11px; border-radius: 50%; }',
    '.bui-dots__dot[data-tone="accent"] { background: var(--bui-color-accent); }',
    '.bui-dots__dot[data-tone="slate"] { background: var(--bui-color-slate); }',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-dots__dot { animation: bui-pulse-dot 1.2s infinite; }',
    '}',

    'bui-checklist { display: block; }',
    'bui-checklist, bui-checklist * { box-sizing: border-box; }',
    '.bui-checklist { font-family: var(--bui-font-family); display: flex; flex-direction: column; gap: var(--bui-space-3); }',
    '.bui-checklist__item { display: flex; align-items: center; gap: var(--bui-space-3); }',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-checklist__item { animation: bui-fade-up 0.5s ease both; }',
    '}',
    '.bui-checklist__icon { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }',
    '.bui-checklist__icon[data-state="done"] { background: var(--bui-color-accent); color: #FFFFFF; font-size: 12px; }',
    '.bui-checklist__icon[data-state="pending"] { border: 2px solid var(--bui-color-border-strong); }',
    '.bui-checklist__label { font-size: var(--bui-font-size-md); color: var(--bui-color-text); }',
    '.bui-checklist__label[data-state="current"] { font-weight: 600; }',
    '.bui-checklist__label[data-state="pending"] { color: var(--bui-color-text-faint); }'
  ].join('\n'));

  /* ---------------------------------------------------------------------
   * <bui-spinner>
   * ------------------------------------------------------------------- */
  class BuiSpinner extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'tone'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';
      var svgNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'bui-spinner');
      svg.setAttribute('viewBox', '0 0 40 40');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Loading');

      var track = document.createElementNS(svgNS, 'circle');
      track.setAttribute('cx', '20');
      track.setAttribute('cy', '20');
      track.setAttribute('r', '16');
      track.setAttribute('fill', 'none');
      track.setAttribute('stroke', 'var(--bui-color-border)');
      track.setAttribute('stroke-width', '4');

      var arc = document.createElementNS(svgNS, 'path');
      arc.setAttribute('class', 'bui-spinner__arc');
      arc.setAttribute('d', 'M20 4 A16 16 0 0 1 36 20');
      arc.setAttribute('fill', 'none');
      arc.setAttribute('stroke-width', '4');
      arc.setAttribute('stroke-linecap', 'round');

      svg.appendChild(track);
      svg.appendChild(arc);
      this.appendChild(svg);

      this._svg = svg;
      this._arc = arc;
      this._render();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._render();
    }

    _render() {
      this._svg.dataset.size = this.getAttribute('size') || 'md';
      this._arc.dataset.tone = this.getAttribute('tone') || 'accent';
    }
  }

  window.BUI.registerComponent('bui-spinner', BuiSpinner);

  /* ---------------------------------------------------------------------
   * <bui-skeleton>
   * ------------------------------------------------------------------- */
  class BuiSkeleton extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';
      var bar = document.createElement('div');
      bar.className = 'bui-skeleton';
      this.appendChild(bar);
      this._bar = bar;
      this._render();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._render();
    }

    _render() {
      this._bar.style.width = this.getAttribute('width') || '100%';
      this._bar.style.height = this.getAttribute('height') || '14px';
    }
  }

  window.BUI.registerComponent('bui-skeleton', BuiSkeleton);

  /* ---------------------------------------------------------------------
   * <bui-dots>
   * ------------------------------------------------------------------- */
  class BuiDots extends HTMLElement {
    static get observedAttributes() {
      return ['tone'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'bui-dots';
      wrap.setAttribute('role', 'img');
      wrap.setAttribute('aria-label', 'Loading');

      this._dots = [];
      for (var i = 0; i < 3; i++) {
        var dot = document.createElement('span');
        dot.className = 'bui-dots__dot';
        dot.style.animationDelay = (i * 0.2) + 's';
        wrap.appendChild(dot);
        this._dots.push(dot);
      }

      this.appendChild(wrap);
      this._render();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._render();
    }

    _render() {
      var tone = this.getAttribute('tone') || 'accent';
      this._dots.forEach(function (dot) { dot.dataset.tone = tone; });
    }
  }

  window.BUI.registerComponent('bui-dots', BuiDots);

  /* ---------------------------------------------------------------------
   * <bui-checklist>
   * ------------------------------------------------------------------- */
  class BuiChecklist extends HTMLElement {
    static get observedAttributes() {
      return ['items', 'current'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';
      var root = document.createElement('div');
      root.className = 'bui-checklist';
      root.setAttribute('role', 'list');
      this.appendChild(root);
      this._root = root;

      this._render();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._render();
    }

    _items() {
      var raw = this.getAttribute('items') || '';
      return raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    _render() {
      var items = this._items();
      var current = this.current;
      var root = this._root;
      root.innerHTML = '';

      items.forEach((label, i) => {
        var index = i + 1;
        var state = index < current ? 'done' : index === current ? 'current' : 'pending';

        var row = document.createElement('div');
        row.className = 'bui-checklist__item';
        row.setAttribute('role', 'listitem');
        row.style.animationDelay = (i * 0.15) + 's';

        var icon = document.createElement('span');
        icon.className = 'bui-checklist__icon';
        icon.dataset.state = state === 'current' ? 'current' : state;

        if (state === 'done') {
          icon.innerHTML = '&#10003;';
        } else if (state === 'current') {
          var spinner = document.createElement('bui-spinner');
          spinner.setAttribute('size', 'sm');
          icon.appendChild(spinner);
        }

        var labelEl = document.createElement('span');
        labelEl.className = 'bui-checklist__label';
        labelEl.dataset.state = state;
        labelEl.textContent = label;

        row.appendChild(icon);
        row.appendChild(labelEl);
        root.appendChild(row);
      });
    }

    get current() {
      return parseInt(this.getAttribute('current'), 10) || 1;
    }

    set current(val) {
      this.setAttribute('current', String(val));
    }
  }

  window.BUI.registerComponent('bui-checklist', BuiChecklist);
})();
