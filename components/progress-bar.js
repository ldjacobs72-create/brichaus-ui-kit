/*!
 * Brichaus UI Kit — <bui-progress-bar>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Covers the three progress patterns in a multi-step funnel: the dark
 * step-header bar atop a step shell, a segmented sub-step counter (N of
 * M drivers/questions within a step), and a continuous linear track
 * (e.g. a "building your report" loading screen).
 *
 * Attributes:
 *   variant   "linear" (default) | "segmented"
 *   tone      "header" (dark slate bar, white text — for step headers) |
 *             "card" (default — light card row, for standalone tracks)
 *   value     current value. For "linear": 0-100 (percent unless `max`
 *             given). For "segmented": current segment count (1-based).
 *   max       for "linear": percent basis (default 100). For "segmented":
 *             total segment count (default 4).
 *   label     text label shown at the start of the row
 *   show-value  boolean (default true) — hide to omit the "N% Complete" /
 *               "N of M" text on the right of the label row
 *
 * Usage:
 *   <bui-progress-bar tone="header" label="3–6. Operational Assessment" value="43"></bui-progress-bar>
 *   <bui-progress-bar variant="segmented" label="Maintenance Driver" value="3" max="4"></bui-progress-bar>
 *   <bui-progress-bar label="Building your report" value="87"></bui-progress-bar>
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-progress-bar] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-progress-bar';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-progress-bar { display: block; }',
    'bui-progress-bar, bui-progress-bar * { box-sizing: border-box; }',
    '.bui-progress { font-family: var(--bui-font-family); }',
    '.bui-progress__row {',
    '  display: flex;',
    '  justify-content: space-between;',
    '  align-items: center;',
    '  gap: var(--bui-space-3);',
    '}',
    '.bui-progress__label { font-size: var(--bui-font-size-sm); font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; }',
    '.bui-progress__value { font-size: var(--bui-font-size-sm); font-weight: 600; }',
    '.bui-progress__track { border-radius: var(--bui-radius-pill); overflow: hidden; }',
    '.bui-progress__fill { height: 100%; border-radius: var(--bui-radius-pill); }',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-progress__fill { transition: width var(--bui-transition-base); }',
    '}',
    /* tone: card (default) — light row above a slim track, used standalone */
    '.bui-progress[data-tone="card"] { display: flex; flex-direction: column; gap: var(--bui-space-2); }',
    '.bui-progress[data-tone="card"] .bui-progress__label { color: var(--bui-color-text); text-transform: none; font-weight: 700; font-size: var(--bui-font-size-md); letter-spacing: normal; }',
    '.bui-progress[data-tone="card"] .bui-progress__value { color: var(--bui-color-slate); }',
    '.bui-progress[data-tone="card"] .bui-progress__track { height: 9px; background: var(--bui-color-border); }',
    '.bui-progress[data-tone="card"] .bui-progress__fill { background: linear-gradient(90deg, var(--bui-color-slate), var(--bui-color-slate-light)); }',
    /* tone: header — dark slate bar for the top of a step shell */
    '.bui-progress[data-tone="header"] { background: var(--bui-color-slate); color: #FFFFFF; }',
    '.bui-progress[data-tone="header"] .bui-progress__row { padding: var(--bui-space-3) var(--bui-space-4); }',
    '.bui-progress[data-tone="header"] .bui-progress__label { color: #FFFFFF; }',
    '.bui-progress[data-tone="header"] .bui-progress__value { color: #C6CFD9; font-weight: 400; }',
    '.bui-progress[data-tone="header"] .bui-progress__track { height: 4px; background: var(--bui-color-slate-hover); }',
    '.bui-progress[data-tone="header"] .bui-progress__fill { background: linear-gradient(90deg, var(--bui-color-accent), var(--bui-color-accent-light)); border-radius: 0; }',
    /* segmented */
    '.bui-progress__segments { display: flex; gap: var(--bui-space-2); }',
    '.bui-progress__segment { flex: 1 1 0; height: 6px; border-radius: var(--bui-radius-sm); background: var(--bui-color-border); }',
    '.bui-progress__segment[data-filled="true"] { background: var(--bui-color-accent); }'
  ].join('\n'));

  var OBSERVED = ['variant', 'tone', 'value', 'max', 'label', 'show-value'];

  class BuiProgressBar extends HTMLElement {
    static get observedAttributes() {
      return OBSERVED;
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';
      var root = document.createElement('div');
      root.className = 'bui-progress';
      root.setAttribute('role', 'progressbar');
      this.appendChild(root);
      this._root = root;

      this._render();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._render();
    }

    _render() {
      var variant = this.getAttribute('variant') || 'linear';
      var tone = this.getAttribute('tone') || 'card';
      var label = this.getAttribute('label') || '';
      var showValue = this.getAttribute('show-value') !== 'false';
      var root = this._root;

      root.innerHTML = '';
      root.dataset.tone = tone;
      root.dataset.variant = variant;

      var row = document.createElement('div');
      row.className = 'bui-progress__row';

      var labelEl = document.createElement('span');
      labelEl.className = 'bui-progress__label';
      labelEl.textContent = label;
      row.appendChild(labelEl);

      var valueEl = document.createElement('span');
      valueEl.className = 'bui-progress__value';
      row.appendChild(valueEl);

      root.appendChild(row);

      if (variant === 'segmented') {
        var max = parseInt(this.getAttribute('max'), 10) || 4;
        var value = Math.max(0, Math.min(max, parseInt(this.getAttribute('value'), 10) || 0));

        if (showValue) valueEl.textContent = value + ' of ' + max;

        var segments = document.createElement('div');
        segments.className = 'bui-progress__segments';
        for (var i = 1; i <= max; i++) {
          var seg = document.createElement('div');
          seg.className = 'bui-progress__segment';
          seg.dataset.filled = String(i <= value);
          segments.appendChild(seg);
        }
        root.appendChild(segments);

        root.setAttribute('aria-valuenow', String(value));
        root.setAttribute('aria-valuemin', '0');
        root.setAttribute('aria-valuemax', String(max));
        root.setAttribute('aria-label', label ? label + ': step ' + value + ' of ' + max : value + ' of ' + max);
      } else {
        var maxPct = parseFloat(this.getAttribute('max')) || 100;
        var pct = Math.max(0, Math.min(100, (parseFloat(this.getAttribute('value')) || 0) * 100 / maxPct));

        if (showValue) valueEl.textContent = Math.round(pct) + '% Complete';

        var track = document.createElement('div');
        track.className = 'bui-progress__track';
        var fill = document.createElement('div');
        fill.className = 'bui-progress__fill';
        fill.style.width = pct + '%';
        track.appendChild(fill);
        root.appendChild(track);

        root.setAttribute('aria-valuenow', String(Math.round(pct)));
        root.setAttribute('aria-valuemin', '0');
        root.setAttribute('aria-valuemax', '100');
        root.setAttribute('aria-label', label ? label + ': ' + Math.round(pct) + '% complete' : Math.round(pct) + '% complete');
      }
    }
  }

  window.BUI.registerComponent('bui-progress-bar', BuiProgressBar);
})();
