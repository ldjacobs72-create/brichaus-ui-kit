/*!
 * Brichaus UI Kit — <bui-select>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Attributes:
 *   label        visible label text
 *   name         form field name
 *   placeholder  text for a disabled first option (default "Select...")
 *   hint         helper text shown below the field
 *   error        error message; when present, field is marked invalid
 *   required     boolean
 *   disabled     boolean
 *
 * Author-supplied <option>/<optgroup> children are preserved and moved
 * into the internal <select>:
 *   <bui-select label="State">
 *     <option value="ca">California</option>
 *     <option value="ny">New York</option>
 *   </bui-select>
 *
 * Property:
 *   .value  get/set — proxies to the internal <select>.
 *
 * Events:
 *   bui-change — fires on selection change, detail: { value }
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-select] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-select';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-select { display: block; }',
    'bui-select, bui-select * { box-sizing: border-box; }',
    '.bui-field { font-family: var(--bui-font-family); display: flex; flex-direction: column; gap: var(--bui-space-1); }',
    '.bui-field__label { font-size: var(--bui-font-size-sm); font-weight: 600; color: var(--bui-color-text); }',
    '.bui-field__control {',
    '  font-family: var(--bui-font-family);',
    '  font-size: var(--bui-font-size-md);',
    '  color: var(--bui-color-text);',
    '  background: var(--bui-color-surface);',
    '  border: 1px solid var(--bui-color-border-strong);',
    '  border-radius: var(--bui-radius-sm);',
    '  padding: 0.6em 0.75em;',
    '  width: 100%;',
    '  transition: border-color var(--bui-transition-fast), box-shadow var(--bui-transition-fast);',
    '}',
    '.bui-field__control:focus-visible { outline: none; border-color: var(--bui-color-accent); box-shadow: var(--bui-focus-ring); }',
    '.bui-field__control[data-invalid="true"] { border-color: var(--bui-color-danger); }',
    '.bui-field__control:disabled { background: var(--bui-color-bg); cursor: not-allowed; opacity: 0.7; }',
    '.bui-field__hint { font-size: var(--bui-font-size-sm); color: var(--bui-color-text-muted); }',
    '.bui-field__error { font-size: var(--bui-font-size-sm); color: var(--bui-color-danger); }'
  ].join('\n'));

  class BuiSelect extends HTMLElement {
    static get observedAttributes() {
      return ['label', 'name', 'placeholder', 'hint', 'error', 'required', 'disabled', 'value'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var id = this.getAttribute('id') || window.BUI.uid('bui-select');
      var hintId = id + '-hint';
      var errorId = id + '-error';

      // Preserve any author-supplied <option>/<optgroup> before wiping innerHTML.
      var existingOptions = Array.prototype.slice.call(this.children).filter(function (node) {
        return node.tagName === 'OPTION' || node.tagName === 'OPTGROUP';
      });

      this.innerHTML = '';

      var wrap = document.createElement('div');
      wrap.className = 'bui-field';

      var label = document.createElement('label');
      label.className = 'bui-field__label';
      label.setAttribute('for', id);

      var select = document.createElement('select');
      select.className = 'bui-field__control';
      select.id = id;

      var placeholderText = this.getAttribute('placeholder');
      if (placeholderText !== null) {
        var placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = placeholderText || 'Select...';
        placeholderOpt.disabled = true;
        placeholderOpt.selected = !this.getAttribute('value');
        select.appendChild(placeholderOpt);
      }

      existingOptions.forEach(function (node) { select.appendChild(node); });

      var hint = document.createElement('div');
      hint.className = 'bui-field__hint';
      hint.id = hintId;

      var error = document.createElement('div');
      error.className = 'bui-field__error';
      error.id = errorId;
      error.setAttribute('role', 'alert');

      wrap.appendChild(label);
      wrap.appendChild(select);
      wrap.appendChild(hint);
      wrap.appendChild(error);
      this.appendChild(wrap);

      this._select = select;
      this._label = label;
      this._hint = hint;
      this._error = error;

      select.addEventListener('change', () => {
        window.BUI.dispatch(this, 'bui-change', { value: select.value });
      });

      this._syncAttrs();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._buiRendered) return;
      if (name === 'value') {
        this._select.value = newVal || '';
        return;
      }
      this._syncAttrs();
    }

    _syncAttrs() {
      var select = this._select;
      var id = select.id;
      var hintId = id + '-hint';
      var errorId = id + '-error';

      this._label.textContent = this.getAttribute('label') || '';
      this._label.style.display = this.getAttribute('label') ? '' : 'none';

      select.name = this.getAttribute('name') || '';
      select.required = this.hasAttribute('required');
      select.disabled = this.hasAttribute('disabled');
      if (this.hasAttribute('value')) select.value = this.getAttribute('value');

      var hintText = this.getAttribute('hint') || '';
      this._hint.textContent = hintText;
      this._hint.style.display = hintText ? '' : 'none';

      var errorText = this.getAttribute('error') || '';
      this._error.textContent = errorText;
      this._error.style.display = errorText ? '' : 'none';
      select.dataset.invalid = errorText ? 'true' : 'false';
      select.setAttribute('aria-invalid', errorText ? 'true' : 'false');

      var describedBy = [];
      if (hintText) describedBy.push(hintId);
      if (errorText) describedBy.push(errorId);
      if (describedBy.length) select.setAttribute('aria-describedby', describedBy.join(' '));
      else select.removeAttribute('aria-describedby');
    }

    get value() {
      return this._select ? this._select.value : this.getAttribute('value') || '';
    }

    set value(val) {
      if (this._select) this._select.value = val;
      else this.setAttribute('value', val);
    }
  }

  window.BUI.registerComponent('bui-select', BuiSelect);
})();
