/*!
 * Brichaus UI Kit — <bui-dial-gauge>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Semicircular needle gauge with four color-coded bands (slate → gold →
 * amber → brick, low to high), used for a categorical assessment result
 * ("Operational Demand: HIGH") rather than a plain numeric score. For a
 * numeric percentage/points score, use <bui-score-gauge> instead — this
 * is a different visual language for a different kind of result.
 *
 * Attributes:
 *   value       0-100 position of the needle along the dial
 *   readout     the large categorical label under the eyebrow, e.g. "HIGH"
 *   caption     smaller supporting line under the readout
 *   eyebrow     small label above the readout, e.g. "Operational Demand"
 *   readout-tone  "slate" | "accent" | "warning" | "danger" (default: auto
 *                 — banded the same way value's position bands the needle)
 *
 * Usage:
 *   <bui-dial-gauge value="82" eyebrow="Operational Demand" readout="HIGH"
 *     caption="High Operational Complexity"></bui-dial-gauge>
 *
 * Presentational only — the host page computes the category/value.
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-dial-gauge] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-dial-gauge';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-dial-gauge { display: block; }',
    'bui-dial-gauge, bui-dial-gauge * { box-sizing: border-box; }',
    '.bui-dial { font-family: var(--bui-font-family); text-align: center; }',
    '.bui-dial__eyebrow { font-size: var(--bui-font-size-sm); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bui-color-text-faint); font-weight: 700; }',
    '.bui-dial__readout { font-size: 2rem; font-weight: 700; margin: var(--bui-space-1) 0 0; line-height: 1; }',
    '.bui-dial__readout[data-tone="slate"] { color: var(--bui-color-slate); }',
    '.bui-dial__readout[data-tone="accent"] { color: var(--bui-color-accent); }',
    '.bui-dial__readout[data-tone="warning"] { color: var(--bui-color-warning); }',
    '.bui-dial__readout[data-tone="danger"] { color: var(--bui-color-danger); }',
    '.bui-dial__caption { font-size: var(--bui-font-size-sm); color: var(--bui-color-text-muted); margin: 2px 0 var(--bui-space-1); }',
    '.bui-dial__svg { display: block; margin: 0 auto; max-width: 240px; width: 100%; height: auto; }',
    '.bui-dial__needle {',
    '  transform-origin: 120px 120px;',
    '}',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-dial__needle { transition: transform var(--bui-transition-base); }',
    '}'
  ].join('\n'));

  var OBSERVED = ['value', 'readout', 'caption', 'eyebrow', 'readout-tone'];

  class BuiDialGauge extends HTMLElement {
    static get observedAttributes() {
      return OBSERVED;
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';

      var dial = document.createElement('div');
      dial.className = 'bui-dial';
      dial.setAttribute('role', 'img');

      var eyebrow = document.createElement('div');
      eyebrow.className = 'bui-dial__eyebrow';

      var readout = document.createElement('div');
      readout.className = 'bui-dial__readout';

      var caption = document.createElement('div');
      caption.className = 'bui-dial__caption';

      var svgNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'bui-dial__svg');
      svg.setAttribute('viewBox', '0 0 240 150');
      svg.setAttribute('aria-hidden', 'true');

      // Four ~45-degree band arcs sweeping from 180° (left) to 0° (right).
      var bands = [
        { d: 'M28 120 A92 92 0 0 1 54.95 54.95', varColor: 'var(--bui-color-slate)' },
        { d: 'M56.5 53.6 A92 92 0 0 1 120 28', varColor: 'var(--bui-color-accent)' },
        { d: 'M120 28 A92 92 0 0 1 183.5 53.6', varColor: 'var(--bui-color-warning)' },
        { d: 'M185.05 54.95 A92 92 0 0 1 212 120', varColor: 'var(--bui-color-danger)' }
      ];
      bands.forEach(function (band) {
        var path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', band.d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', band.varColor);
        path.setAttribute('stroke-width', '18');
        svg.appendChild(path);
      });

      var needleGroup = document.createElementNS(svgNS, 'g');
      needleGroup.setAttribute('class', 'bui-dial__needle');

      var needle = document.createElementNS(svgNS, 'line');
      needle.setAttribute('x1', '120');
      needle.setAttribute('y1', '120');
      needle.setAttribute('x2', '120');
      needle.setAttribute('y2', '48');
      needle.setAttribute('stroke', 'var(--bui-color-text)');
      needle.setAttribute('stroke-width', '5');
      needle.setAttribute('stroke-linecap', 'round');
      needleGroup.appendChild(needle);
      svg.appendChild(needleGroup);

      var hubOuter = document.createElementNS(svgNS, 'circle');
      hubOuter.setAttribute('cx', '120');
      hubOuter.setAttribute('cy', '120');
      hubOuter.setAttribute('r', '9');
      hubOuter.setAttribute('fill', 'var(--bui-color-text)');
      svg.appendChild(hubOuter);

      var hubInner = document.createElementNS(svgNS, 'circle');
      hubInner.setAttribute('cx', '120');
      hubInner.setAttribute('cy', '120');
      hubInner.setAttribute('r', '4');
      hubInner.setAttribute('fill', 'var(--bui-color-surface)');
      svg.appendChild(hubInner);

      var lowLabel = document.createElementNS(svgNS, 'text');
      lowLabel.setAttribute('x', '26');
      lowLabel.setAttribute('y', '140');
      lowLabel.setAttribute('font-family', 'var(--bui-font-family)');
      lowLabel.setAttribute('font-size', '11');
      lowLabel.setAttribute('font-weight', '700');
      lowLabel.setAttribute('fill', 'var(--bui-color-text-faint)');
      lowLabel.textContent = 'LOW';
      svg.appendChild(lowLabel);

      var highLabel = document.createElementNS(svgNS, 'text');
      highLabel.setAttribute('x', '196');
      highLabel.setAttribute('y', '140');
      highLabel.setAttribute('font-family', 'var(--bui-font-family)');
      highLabel.setAttribute('font-size', '11');
      highLabel.setAttribute('font-weight', '700');
      highLabel.setAttribute('fill', 'var(--bui-color-danger)');
      highLabel.textContent = 'HIGH';
      svg.appendChild(highLabel);

      dial.appendChild(eyebrow);
      dial.appendChild(readout);
      dial.appendChild(caption);
      dial.appendChild(svg);
      this.appendChild(dial);

      this._dial = dial;
      this._eyebrow = eyebrow;
      this._readout = readout;
      this._caption = caption;
      this._needleGroup = needleGroup;

      this._render();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._render();
    }

    _render() {
      var value = Math.max(0, Math.min(100, parseFloat(this.getAttribute('value')) || 0));
      var pct = value / 100;

      // Needle sweeps 180° (pointing left, value=0) to 0° (pointing right, value=100).
      var angle = -180 + pct * 180;
      this._needleGroup.setAttribute('transform', 'rotate(' + angle + ' 120 120)');

      this._eyebrow.textContent = this.getAttribute('eyebrow') || '';
      this._eyebrow.style.display = this.getAttribute('eyebrow') ? '' : 'none';

      this._readout.textContent = this.getAttribute('readout') || '';

      var tone = this.getAttribute('readout-tone');
      if (!tone) tone = pct < 0.25 ? 'slate' : pct < 0.5 ? 'accent' : pct < 0.75 ? 'warning' : 'danger';
      this._readout.dataset.tone = tone;

      this._caption.textContent = this.getAttribute('caption') || '';
      this._caption.style.display = this.getAttribute('caption') ? '' : 'none';

      var label = [this.getAttribute('eyebrow'), this.getAttribute('readout'), this.getAttribute('caption')]
        .filter(Boolean)
        .join(': ');
      this._dial.setAttribute('aria-label', label || 'Gauge value: ' + value);
    }
  }

  window.BUI.registerComponent('bui-dial-gauge', BuiDialGauge);
})();
