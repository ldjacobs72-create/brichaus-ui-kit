/*!
 * Brichaus UI Kit — <bui-counter>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * A +/- stepper for a small bounded integer count (vacant units, days,
 * vacancies in the last year) — as opposed to a bare <bui-input type="number">,
 * whose native spinner UX is inconsistent across iOS/Android/desktop and
 * gives no visual sense of "this is a small number." The center field still
 * accepts direct typing for anyone who already knows the value.
 *
 * All rules are scoped under the "bui-counter" host tag (not the shared
 * .bui-field__* names bui-input/bui-select also use) — see bui-select's own
 * note on why an unscoped copy of this stylesheet would leak to their fields.
 *
 * Attributes:
 *   label      visible label text
 *   hint       helper text shown below the field
 *   name       form field name
 *   value      current value (default 0)
 *   min        minimum allowed value (default 0)
 *   max        maximum allowed value (no cap if omitted)
 *   step       increment size (default 1)
 *   disabled   boolean
 *
 * Property:
 *   .value  get/set (number) — clamped to [min, max]
 *
 * Usage:
 *   <bui-counter label="Vacant Units" min="0" hint="Enter 0 if fully occupied."></bui-counter>
 *
 * Events:
 *   bui-input   — fires on every change (button tap or keystroke), detail: { value }
 *   bui-change  — fires on commit (button tap, or blur/Enter after typing), detail: { value }
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-counter] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-counter';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-counter { display: block; }',
    'bui-counter, bui-counter * { box-sizing: border-box; }',
    'bui-counter .bui-field { font-family: var(--bui-font-family); display: flex; flex-direction: column; gap: var(--bui-space-1); }',
    'bui-counter .bui-field__label { font-size: var(--bui-font-size-sm); font-weight: 600; color: var(--bui-color-text); }',
    'bui-counter .bui-counter__row {',
    '  display: flex;',
    '  align-items: stretch;',
    '  gap: var(--bui-space-2);',
    '}',
    'bui-counter .bui-counter__btn {',
    '  flex: 0 0 auto;',
    '  width: 40px;',
    '  font-family: var(--bui-font-family);',
    '  font-size: 1.125rem;',
    '  font-weight: 600;',
    '  line-height: 1;',
    '  color: var(--bui-color-text);',
    '  background: var(--bui-color-surface);',
    '  border: 1px solid var(--bui-color-border-strong);',
    '  border-radius: var(--bui-radius-sm);',
    '  cursor: pointer;',
    '  transition: border-color var(--bui-transition-fast), background-color var(--bui-transition-fast);',
    '}',
    'bui-counter .bui-counter__btn:hover:not(:disabled) { background: var(--bui-color-bg); }',
    'bui-counter .bui-counter__btn:focus-visible { outline: none; border-color: var(--bui-color-accent); box-shadow: var(--bui-focus-ring); }',
    'bui-counter .bui-counter__btn:disabled { opacity: 0.4; cursor: not-allowed; }',
    'bui-counter .bui-counter__input {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  text-align: center;',
    '  font-family: var(--bui-font-family);',
    '  font-size: var(--bui-font-size-control)', /* 16px min — prevents iOS focus-zoom */
    ';',
    '  font-weight: 600;',
    '  color: var(--bui-color-text);',
    '  background: var(--bui-color-surface);',
    '  border: 1px solid var(--bui-color-border-strong);',
    '  border-radius: var(--bui-radius-sm);',
    '  padding: 0.6em 0.5em;',
    '  -webkit-appearance: none;',
    '  appearance: none;',
    '}',
    /* Hide the native number spinner — the +/- buttons replace it. */
    'bui-counter .bui-counter__input::-webkit-outer-spin-button,',
    'bui-counter .bui-counter__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }',
    'bui-counter .bui-counter__input[type="number"] { -moz-appearance: textfield; }',
    'bui-counter .bui-counter__input:focus-visible { outline: none; border-color: var(--bui-color-accent); box-shadow: var(--bui-focus-ring); }',
    'bui-counter .bui-counter__input[data-invalid="true"] { border-color: var(--bui-color-danger); }',
    'bui-counter .bui-counter__input:disabled { background: var(--bui-color-bg); opacity: 0.7; }',
    'bui-counter .bui-field__hint { font-size: var(--bui-font-size-sm); color: var(--bui-color-text-muted); }',
    'bui-counter .bui-field__error { font-size: var(--bui-font-size-sm); color: var(--bui-color-danger); }'
  ].join('\n'));

  var OBSERVED = ['label', 'hint', 'error', 'name', 'value', 'min', 'max', 'step', 'disabled'];

  class BuiCounter extends HTMLElement {
    static get observedAttributes() {
      return OBSERVED;
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var id = this.getAttribute('id') || window.BUI.uid('bui-counter');
      var hintId = id + '-hint';
      var errorId = id + '-error';

      this.innerHTML = '';

      var wrap = document.createElement('div');
      wrap.className = 'bui-field';

      var label = document.createElement('label');
      label.className = 'bui-field__label';
      label.setAttribute('for', id);

      var row = document.createElement('div');
      row.className = 'bui-counter__row';

      var decBtn = document.createElement('button');
      decBtn.type = 'button';
      decBtn.className = 'bui-counter__btn';
      decBtn.setAttribute('aria-label', 'Decrease');
      decBtn.textContent = String.fromCharCode(8722); // minus sign

      var input = document.createElement('input');
      input.className = 'bui-counter__input';
      input.type = 'number';
      input.inputMode = 'numeric';
      input.id = id;

      var incBtn = document.createElement('button');
      incBtn.type = 'button';
      incBtn.className = 'bui-counter__btn';
      incBtn.setAttribute('aria-label', 'Increase');
      incBtn.textContent = '+';

      row.appendChild(decBtn);
      row.appendChild(input);
      row.appendChild(incBtn);

      var hint = document.createElement('div');
      hint.className = 'bui-field__hint';
      hint.id = hintId;

      var error = document.createElement('div');
      error.className = 'bui-field__error';
      error.id = errorId;
      error.setAttribute('role', 'alert');

      wrap.appendChild(label);
      wrap.appendChild(row);
      wrap.appendChild(hint);
      wrap.appendChild(error);
      this.appendChild(wrap);

      this._label = label;
      this._input = input;
      this._decBtn = decBtn;
      this._incBtn = incBtn;
      this._hint = hint;
      this._error = error;

      decBtn.addEventListener('click', () => this._step(-1));
      incBtn.addEventListener('click', () => this._step(1));
      input.addEventListener('input', () => {
        window.BUI.dispatch(this, 'bui-input', { value: this.value });
      });
      input.addEventListener('change', () => {
        this._commit();
      });

      this._syncAttrs();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._buiRendered) return;
      if (name === 'value') {
        this._input.value = newVal === null ? '' : newVal;
        this._updateButtonState();
        return;
      }
      this._syncAttrs();
    }

    _min() {
      var v = this.getAttribute('min');
      return v === null ? 0 : Number(v);
    }

    _max() {
      var v = this.getAttribute('max');
      return v === null ? Infinity : Number(v);
    }

    _step(delta) {
      if (this._input.disabled) return;
      var step = Number(this.getAttribute('step')) || 1;
      var next = this._clamp((this.value || 0) + delta * step);
      this.value = next;
      this._commit();
    }

    _clamp(n) {
      return Math.min(this._max(), Math.max(this._min(), n));
    }

    _commit() {
      this.value = this._clamp(parseInt(this._input.value, 10) || 0);
      window.BUI.dispatch(this, 'bui-change', { value: this.value });
    }

    _updateButtonState() {
      var val = this.value;
      this._decBtn.disabled = this._input.disabled || val <= this._min();
      this._incBtn.disabled = this._input.disabled || val >= this._max();
    }

    _syncAttrs() {
      this._label.textContent = this.getAttribute('label') || '';
      this._label.style.display = this.getAttribute('label') ? '' : 'none';

      this._input.name = this.getAttribute('name') || '';
      this._input.min = this.hasAttribute('min') ? this.getAttribute('min') : '0';
      if (this.hasAttribute('max')) this._input.max = this.getAttribute('max');
      else this._input.removeAttribute('max');
      this._input.step = this.getAttribute('step') || '1';
      var disabled = this.hasAttribute('disabled');
      this._input.disabled = disabled;

      if (this.hasAttribute('value')) this._input.value = this.getAttribute('value');
      else if (this._input.value === '') this._input.value = String(this._min());

      var hintText = this.getAttribute('hint') || '';
      this._hint.textContent = hintText;
      this._hint.style.display = hintText ? '' : 'none';

      var errorText = this.getAttribute('error') || '';
      this._error.textContent = errorText;
      this._error.style.display = errorText ? '' : 'none';
      this._input.dataset.invalid = errorText ? 'true' : 'false';
      this._input.setAttribute('aria-invalid', errorText ? 'true' : 'false');

      var describedBy = [];
      if (hintText) describedBy.push(this._hint.id);
      if (errorText) describedBy.push(this._error.id);
      if (describedBy.length) this._input.setAttribute('aria-describedby', describedBy.join(' '));
      else this._input.removeAttribute('aria-describedby');

      this._updateButtonState();
    }

    get value() {
      return this._input ? (parseInt(this._input.value, 10) || 0) : (parseInt(this.getAttribute('value'), 10) || 0);
    }

    set value(val) {
      var num = this._clamp(parseInt(val, 10) || 0);
      if (this._input) {
        this._input.value = String(num);
        this._updateButtonState();
      } else {
        this.setAttribute('value', String(num));
      }
    }
  }

  window.BUI.registerComponent('bui-counter', BuiCounter);
})();
