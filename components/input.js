/*!
 * Brichaus UI Kit — <bui-input>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Attributes:
 *   label        visible label text
 *   type         any native input type (default "text")
 *   name         form field name
 *   value        initial value
 *   placeholder
 *   hint         helper text shown below the field
 *   error        error message; when present, field is marked invalid
 *   required     boolean
 *   disabled     boolean
 *   prefix       short text affix rendered in its own boxed segment
 *                before the input, e.g. prefix="$" for currency
 *   suffix       short text affix rendered after the input, e.g. suffix="%"
 *
 * Slot (light DOM, by attribute):
 *   slot="prefix-icon"  an icon/SVG rendered inline before the input with
 *                       no boxed background — for a search/pin-style icon
 *                       field (address autocomplete, etc.) as opposed to
 *                       the boxed text affix used for currency.
 *
 * Usage:
 *   <bui-input label="Rent" prefix="$" type="number" value="1650"></bui-input>
 *   <bui-input label="Property Address">
 *     <svg slot="prefix-icon" ...></svg>
 *   </bui-input>
 *
 * Property:
 *   .value  get/set — proxies to the internal <input>.
 *
 * Events:
 *   bui-input   — fires on every keystroke, detail: { value }
 *   bui-change  — fires on change/blur commit, detail: { value }
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-input] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-input';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-input { display: block; }',
    'bui-input, bui-input * { box-sizing: border-box; }',
    '.bui-field { font-family: var(--bui-font-family); display: flex; flex-direction: column; gap: var(--bui-space-1); }',
    '.bui-field__label { font-size: var(--bui-font-size-sm); font-weight: 600; color: var(--bui-color-text); }',
    '.bui-field__control-wrap {',
    '  display: flex;',
    '  align-items: stretch;',
    '  background: var(--bui-color-surface);',
    '  border: 1px solid var(--bui-color-border-strong);',
    '  border-radius: var(--bui-radius-sm);',
    '  transition: border-color var(--bui-transition-fast), box-shadow var(--bui-transition-fast);',
    '  overflow: hidden;',
    '}',
    '.bui-field__control-wrap:focus-within { border-color: var(--bui-color-accent); box-shadow: var(--bui-focus-ring); }',
    '.bui-field__control-wrap[data-invalid="true"] { border-color: var(--bui-color-danger); }',
    '.bui-field__control-wrap[data-invalid="true"]:focus-within { box-shadow: var(--bui-focus-ring-danger); }',
    '.bui-field__control-wrap[data-disabled="true"] { background: var(--bui-color-bg); opacity: 0.7; }',
    '.bui-field__affix {',
    '  flex: 0 0 auto;',
    '  display: flex;',
    '  align-items: center;',
    '  font-weight: 600;',
    '  color: var(--bui-color-text-muted);',
    '}',
    '.bui-field__affix[data-kind="text"] { padding: 0 var(--bui-space-3); background: var(--bui-color-bg); }',
    '.bui-field__affix[data-kind="text"][data-pos="prefix"] { border-right: 1px solid var(--bui-color-border); }',
    '.bui-field__affix[data-kind="text"][data-pos="suffix"] { border-left: 1px solid var(--bui-color-border); }',
    '.bui-field__affix[data-kind="icon"] { padding-left: var(--bui-space-3); }',
    '.bui-field__control {',
    '  font-family: var(--bui-font-family);',
    '  font-size: var(--bui-font-size-md);',
    '  color: var(--bui-color-text);',
    '  background: transparent;',
    '  border: none;',
    '  outline: none;',
    '  padding: 0.6em 0.75em;',
    '  width: 100%;',
    '  min-width: 0;',
    '}',
    '.bui-field__control:disabled { cursor: not-allowed; }',
    '.bui-field__hint { font-size: var(--bui-font-size-sm); color: var(--bui-color-text-muted); }',
    '.bui-field__error { font-size: var(--bui-font-size-sm); color: var(--bui-color-danger); }'
  ].join('\n'));

  class BuiInput extends HTMLElement {
    static get observedAttributes() {
      return ['label', 'type', 'name', 'placeholder', 'hint', 'error', 'required', 'disabled', 'value', 'prefix', 'suffix'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var id = this.getAttribute('id') || window.BUI.uid('bui-input');
      var hintId = id + '-hint';
      var errorId = id + '-error';

      // Preserve an author-supplied icon before wiping innerHTML.
      var iconNode = this.querySelector('[slot="prefix-icon"]');

      this.innerHTML = '';

      var wrap = document.createElement('div');
      wrap.className = 'bui-field';

      var label = document.createElement('label');
      label.className = 'bui-field__label';
      label.setAttribute('for', id);

      var controlWrap = document.createElement('div');
      controlWrap.className = 'bui-field__control-wrap';

      var input = document.createElement('input');
      input.className = 'bui-field__control';
      input.id = id;

      var hint = document.createElement('div');
      hint.className = 'bui-field__hint';
      hint.id = hintId;

      var error = document.createElement('div');
      error.className = 'bui-field__error';
      error.id = errorId;
      error.setAttribute('role', 'alert');

      controlWrap.appendChild(input);

      wrap.appendChild(label);
      wrap.appendChild(controlWrap);
      wrap.appendChild(hint);
      wrap.appendChild(error);
      this.appendChild(wrap);

      this._controlWrap = controlWrap;
      this._input = input;
      this._label = label;
      this._hint = hint;
      this._error = error;
      this._iconNode = iconNode || null;

      input.addEventListener('input', () => {
        window.BUI.dispatch(this, 'bui-input', { value: input.value });
      });

      input.addEventListener('change', () => {
        window.BUI.dispatch(this, 'bui-change', { value: input.value });
      });

      this._syncAttrs();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._buiRendered) return;
      if (name === 'value' && this._input.value !== newVal) {
        this._input.value = newVal || '';
        return;
      }
      this._syncAttrs();
    }

    _renderAffix(pos) {
      var existing = this._controlWrap.querySelector('.bui-field__affix[data-pos="' + pos + '"]');
      if (existing) existing.remove();

      var text = this.getAttribute(pos); // 'prefix' or 'suffix'
      var affix = null;

      if (pos === 'prefix' && this._iconNode) {
        affix = document.createElement('span');
        affix.className = 'bui-field__affix';
        affix.dataset.kind = 'icon';
        affix.dataset.pos = pos;
        affix.appendChild(this._iconNode);
      } else if (text) {
        affix = document.createElement('span');
        affix.className = 'bui-field__affix';
        affix.dataset.kind = 'text';
        affix.dataset.pos = pos;
        affix.textContent = text;
      }

      if (affix) {
        if (pos === 'prefix') this._controlWrap.insertBefore(affix, this._controlWrap.firstChild);
        else this._controlWrap.appendChild(affix);
      }
    }

    _syncAttrs() {
      var input = this._input;
      var id = input.id;
      var hintId = id + '-hint';
      var errorId = id + '-error';

      this._label.textContent = this.getAttribute('label') || '';
      this._label.style.display = this.getAttribute('label') ? '' : 'none';

      input.type = this.getAttribute('type') || 'text';
      input.name = this.getAttribute('name') || '';
      input.placeholder = this.getAttribute('placeholder') || '';
      if (this.hasAttribute('value') && input.value === '') input.value = this.getAttribute('value');
      input.required = this.hasAttribute('required');
      input.disabled = this.hasAttribute('disabled');
      this._controlWrap.dataset.disabled = this.hasAttribute('disabled') ? 'true' : 'false';

      this._renderAffix('prefix');
      this._renderAffix('suffix');

      var hintText = this.getAttribute('hint') || '';
      this._hint.textContent = hintText;
      this._hint.style.display = hintText ? '' : 'none';

      var errorText = this.getAttribute('error') || '';
      this._error.textContent = errorText;
      this._error.style.display = errorText ? '' : 'none';
      this._controlWrap.dataset.invalid = errorText ? 'true' : 'false';
      input.setAttribute('aria-invalid', errorText ? 'true' : 'false');

      var describedBy = [];
      if (hintText) describedBy.push(hintId);
      if (errorText) describedBy.push(errorId);
      if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
      else input.removeAttribute('aria-describedby');
    }

    get value() {
      return this._input ? this._input.value : this.getAttribute('value') || '';
    }

    set value(val) {
      if (this._input) this._input.value = val;
      else this.setAttribute('value', val);
    }
  }

  window.BUI.registerComponent('bui-input', BuiInput);
})();
