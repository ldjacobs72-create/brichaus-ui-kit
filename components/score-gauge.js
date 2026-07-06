/*!
 * Brichaus UI Kit — <bui-score-gauge>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Circular score/gauge display for assessment-style scoring results.
 *
 * Attributes:
 *   value    numeric score (default 0)
 *   max      numeric max (default 100)
 *   label    caption shown below the number, e.g. "Readiness Score"
 *   size     "sm" | "md" (default) | "lg"
 *   tone     "auto" (default, bands the arc color by percentage:
 *            <40% danger, <75% warning, else success) | "accent" |
 *            "success" | "warning" | "danger" — forces a fixed color.
 *
 * Usage:
 *   <bui-score-gauge value="72" max="100" label="Readiness Score"></bui-score-gauge>
 *
 * The gauge is presentational only — it does not compute scores. Feed it
 * a value (e.g. from BUI.createStore or your own quiz logic) and set the
 * `value` attribute/property as the score changes.
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-score-gauge] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-score-gauge';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-score-gauge { display: inline-block; }',
    'bui-score-gauge, bui-score-gauge * { box-sizing: border-box; }',
    '.bui-gauge {',
    '  font-family: var(--bui-font-family);',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  gap: var(--bui-space-2);',
    '}',
    '.bui-gauge__ring { position: relative; width: 120px; height: 120px; }',
    '.bui-gauge[data-size="sm"] .bui-gauge__ring { width: 84px; height: 84px; }',
    '.bui-gauge[data-size="lg"] .bui-gauge__ring { width: 160px; height: 160px; }',
    '.bui-gauge__ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }',
    '.bui-gauge__track { fill: none; stroke: var(--bui-color-border); }',
    '.bui-gauge__arc { fill: none; stroke-linecap: round; }',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-gauge__arc { transition: stroke-dashoffset var(--bui-transition-base), stroke var(--bui-transition-base); }',
    '}',
    '.bui-gauge__arc[data-tone="accent"] { stroke: var(--bui-color-accent); }',
    '.bui-gauge__arc[data-tone="success"] { stroke: var(--bui-color-success); }',
    '.bui-gauge__arc[data-tone="warning"] { stroke: var(--bui-color-warning); }',
    '.bui-gauge__arc[data-tone="danger"] { stroke: var(--bui-color-danger); }',
    '.bui-gauge__value {',
    '  position: absolute;',
    '  inset: 0;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-size: 1.5rem;',
    '  font-weight: 700;',
    '  color: var(--bui-color-text);',
    '}',
    '.bui-gauge[data-size="sm"] .bui-gauge__value { font-size: 1.1rem; }',
    '.bui-gauge[data-size="lg"] .bui-gauge__value { font-size: 2rem; }',
    '.bui-gauge__label {',
    '  font-size: var(--bui-font-size-sm);',
    '  color: var(--bui-color-text-muted);',
    '  text-align: center;',
    '}'
  ].join('\n'));

  var RADIUS = 52;
  var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  class BuiScoreGauge extends HTMLElement {
    static get observedAttributes() {
      return ['value', 'max', 'label', 'size', 'tone'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';

      var gauge = document.createElement('div');
      gauge.className = 'bui-gauge';
      gauge.setAttribute('role', 'img');

      var ring = document.createElement('div');
      ring.className = 'bui-gauge__ring';

      var svgNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 120 120');

      var track = document.createElementNS(svgNS, 'circle');
      track.setAttribute('class', 'bui-gauge__track');
      track.setAttribute('cx', '60');
      track.setAttribute('cy', '60');
      track.setAttribute('r', String(RADIUS));
      track.setAttribute('stroke-width', '10');

      var arc = document.createElementNS(svgNS, 'circle');
      arc.setAttribute('class', 'bui-gauge__arc');
      arc.setAttribute('cx', '60');
      arc.setAttribute('cy', '60');
      arc.setAttribute('r', String(RADIUS));
      arc.setAttribute('stroke-width', '10');
      arc.setAttribute('stroke-dasharray', String(CIRCUMFERENCE));

      svg.appendChild(track);
      svg.appendChild(arc);
      ring.appendChild(svg);

      var valueEl = document.createElement('div');
      valueEl.className = 'bui-gauge__value';

      ring.appendChild(valueEl);

      var labelEl = document.createElement('div');
      labelEl.className = 'bui-gauge__label';

      gauge.appendChild(ring);
      gauge.appendChild(labelEl);
      this.appendChild(gauge);

      this._gauge = gauge;
      this._arc = arc;
      this._valueEl = valueEl;
      this._labelEl = labelEl;

      this._render();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._render();
    }

    _render() {
      var value = parseFloat(this.getAttribute('value'));
      var max = parseFloat(this.getAttribute('max'));
      if (isNaN(value)) value = 0;
      if (isNaN(max) || max <= 0) max = 100;

      var pct = Math.max(0, Math.min(1, value / max));
      var offset = CIRCUMFERENCE * (1 - pct);

      var tone = this.getAttribute('tone') || 'auto';
      if (tone === 'auto') {
        tone = pct < 0.4 ? 'danger' : pct < 0.75 ? 'warning' : 'success';
      }

      this._gauge.dataset.size = this.getAttribute('size') || 'md';
      this._arc.dataset.tone = tone;
      this._arc.setAttribute('stroke-dashoffset', String(offset));

      var displayValue = Number.isInteger(value) ? value : value.toFixed(1);
      this._valueEl.textContent = displayValue;

      var labelText = this.getAttribute('label') || '';
      this._labelEl.textContent = labelText;
      this._labelEl.style.display = labelText ? '' : 'none';

      this._gauge.setAttribute(
        'aria-label',
        (labelText ? labelText + ': ' : 'Score: ') + displayValue + ' out of ' + max
      );
    }

    get value() {
      return parseFloat(this.getAttribute('value')) || 0;
    }

    set value(val) {
      this.setAttribute('value', String(val));
    }
  }

  window.BUI.registerComponent('bui-score-gauge', BuiScoreGauge);
})();
