/*!
 * Brichaus UI Kit — <bui-stepper>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Multi-step progress indicator for wizard / quiz / scored-assessment flows.
 * Purely presentational — it does not own page content or validation.
 * The host page sets `current` as the user advances; the stepper just
 * renders progress and (optionally) lets the user click back to a
 * previous step.
 *
 * Attributes:
 *   steps     comma-separated step labels, e.g. "Details,Income,Review"
 *   current   1-based index of the active step (default 1)
 *   allow-nav boolean — completed/upcoming steps become clickable buttons
 *             that emit bui-step-change instead of navigating themselves
 *
 * Property:
 *   .current  get/set (number, 1-based) — same as the attribute.
 *
 * Methods:
 *   .goNext() / .goPrev() — convenience, clamps to [1, steps.length].
 *
 * Usage:
 *   <bui-stepper steps="Details,Income,Review,Results" current="2"></bui-stepper>
 *
 * Events:
 *   bui-step-change — detail: { index } — fired when a nav-enabled step
 *                      is clicked. The stepper does NOT change `current`
 *                      itself in this case; the host decides (e.g. after
 *                      validating) and sets .current or the attribute.
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-stepper] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-stepper';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-stepper { display: block; }',
    'bui-stepper, bui-stepper * { box-sizing: border-box; }',
    '.bui-stepper {',
    '  font-family: var(--bui-font-family);',
    '  display: flex;',
    '  width: 100%;',
    '}',
    '.bui-stepper__item {',
    '  flex: 1 1 0;',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  gap: var(--bui-space-2);',
    '  position: relative;',
    '  text-align: center;',
    '}',
    '.bui-stepper__track {',
    '  display: flex;',
    '  align-items: center;',
    '  width: 100%;',
    '}',
    '.bui-stepper__line {',
    '  flex: 1 1 auto;',
    '  height: 2px;',
    '  background: var(--bui-color-border);',
    '}',
    '.bui-stepper__item:first-child .bui-stepper__line--before { visibility: hidden; }',
    '.bui-stepper__item:last-child .bui-stepper__line--after { visibility: hidden; }',
    '.bui-stepper__dot {',
    '  flex: 0 0 auto;',
    '  width: 2em;',
    '  height: 2em;',
    '  border-radius: 50%;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-size: var(--bui-font-size-sm);',
    '  font-weight: 600;',
    '  background: var(--bui-color-surface);',
    '  border: 2px solid var(--bui-color-border-strong);',
    '  color: var(--bui-color-text-muted);',
    '  transition: background-color var(--bui-transition-base), border-color var(--bui-transition-base), color var(--bui-transition-base);',
    '}',
    '.bui-stepper__line[data-done="true"] { background: var(--bui-color-accent); }',
    '.bui-stepper__dot[data-state="done"] { background: var(--bui-color-accent); border-color: var(--bui-color-accent); color: var(--bui-color-accent-contrast); }',
    '.bui-stepper__dot[data-state="current"] { border-color: var(--bui-color-accent); color: var(--bui-color-accent); }',
    '.bui-stepper__label {',
    '  font-size: var(--bui-font-size-sm);',
    '  color: var(--bui-color-text-muted);',
    '}',
    '.bui-stepper__label[data-state="current"] { color: var(--bui-color-text); font-weight: 600; }',
    '.bui-stepper__nav-btn {',
    '  background: transparent;',
    '  border: none;',
    '  padding: 0;',
    '  cursor: pointer;',
    '  display: contents;',
    '}',
    '.bui-stepper__nav-btn:focus-visible .bui-stepper__dot { outline: none; box-shadow: var(--bui-focus-ring); }'
  ].join('\n'));

  class BuiStepper extends HTMLElement {
    static get observedAttributes() {
      return ['steps', 'current', 'allow-nav'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';
      var root = document.createElement('div');
      root.className = 'bui-stepper';
      root.setAttribute('role', 'list');
      this.appendChild(root);
      this._root = root;

      this._render();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._render();
    }

    _steps() {
      var raw = this.getAttribute('steps') || '';
      return raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    _render() {
      var steps = this._steps();
      var current = this.current;
      var allowNav = this.hasAttribute('allow-nav');
      var root = this._root;
      root.innerHTML = '';

      steps.forEach((label, i) => {
        var index = i + 1;
        var state = index < current ? 'done' : index === current ? 'current' : 'upcoming';

        var item = document.createElement('div');
        item.className = 'bui-stepper__item';
        item.setAttribute('role', 'listitem');
        if (state === 'current') item.setAttribute('aria-current', 'step');

        var track = document.createElement('div');
        track.className = 'bui-stepper__track';

        var lineBefore = document.createElement('div');
        lineBefore.className = 'bui-stepper__line bui-stepper__line--before';
        lineBefore.dataset.done = String(index <= current);

        var dot = document.createElement('span');
        dot.className = 'bui-stepper__dot';
        dot.dataset.state = state;
        dot.textContent = state === 'done' ? '✓' : String(index);

        var lineAfter = document.createElement('div');
        lineAfter.className = 'bui-stepper__line bui-stepper__line--after';
        lineAfter.dataset.done = String(index < current);

        track.appendChild(lineBefore);
        track.appendChild(dot);
        track.appendChild(lineAfter);

        var labelEl = document.createElement('span');
        labelEl.className = 'bui-stepper__label';
        labelEl.dataset.state = state;
        labelEl.textContent = label;

        if (allowNav && state !== 'current') {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'bui-stepper__nav-btn';
          btn.setAttribute('aria-label', 'Go to step ' + index + ': ' + label);
          btn.appendChild(track);
          btn.appendChild(labelEl);
          btn.addEventListener('click', () => {
            window.BUI.dispatch(this, 'bui-step-change', { index: index });
          });
          item.appendChild(btn);
        } else {
          item.appendChild(track);
          item.appendChild(labelEl);
        }

        root.appendChild(item);
      });
    }

    get current() {
      return parseInt(this.getAttribute('current'), 10) || 1;
    }

    set current(val) {
      this.setAttribute('current', String(val));
    }

    goNext() {
      var max = this._steps().length || 1;
      this.current = Math.min(max, this.current + 1);
    }

    goPrev() {
      this.current = Math.max(1, this.current - 1);
    }
  }

  window.BUI.registerComponent('bui-stepper', BuiStepper);
})();
