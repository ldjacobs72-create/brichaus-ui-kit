/*!
 * Brichaus UI Kit — <bui-toggle>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * A single yes/no switch for one boolean question ("Is this property
 * currently vacant?"), as opposed to <bui-input type="checkbox"> or a
 * 0/1 number field — a real switch reads as a state, not a number to type.
 * Built as a native <button role="switch"> (WAI-ARIA switch pattern) so
 * Space/Enter/click all just work with no extra key handling.
 *
 * Attributes:
 *   label      question/statement text next to the switch
 *   hint       helper text under the label
 *   name       form field name
 *   checked    boolean — initial/current state
 *   disabled   boolean
 *
 * Property:
 *   .checked  get/set (boolean)
 *
 * Usage:
 *   <bui-toggle label="Is this property currently vacant?" name="is-vacant"></bui-toggle>
 *
 * Events:
 *   bui-change — fires when the switch is toggled, detail: { checked }
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-toggle] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-toggle';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-toggle { display: block; }',
    'bui-toggle, bui-toggle * { box-sizing: border-box; }',
    '.bui-toggle { font-family: var(--bui-font-family); display: flex; align-items: center; justify-content: space-between; gap: var(--bui-space-4); }',
    '.bui-toggle__text { display: flex; flex-direction: column; gap: 2px; }',
    '.bui-toggle__label { font-size: var(--bui-font-size-sm); font-weight: 600; color: var(--bui-color-text); }',
    '.bui-toggle__hint { font-size: var(--bui-font-size-sm); color: var(--bui-color-text-muted); }',
    '.bui-toggle__switch {',
    '  flex-shrink: 0;',
    '  appearance: none;',
    '  border: none;',
    '  cursor: pointer;',
    '  width: 44px;',
    '  height: 26px;',
    '  border-radius: var(--bui-radius-pill);',
    '  background: var(--bui-color-border-strong);',
    '  position: relative;',
    '  transition: background-color var(--bui-transition-fast);',
    '}',
    '.bui-toggle__switch[aria-checked="true"] { background: var(--bui-color-accent); }',
    '.bui-toggle__switch:disabled { opacity: 0.5; cursor: not-allowed; }',
    '.bui-toggle__switch:focus-visible { outline: none; box-shadow: var(--bui-focus-ring); }',
    '.bui-toggle__thumb {',
    '  position: absolute;',
    '  top: 3px;',
    '  left: 3px;',
    '  width: 20px;',
    '  height: 20px;',
    '  border-radius: 50%;',
    '  background: #FFFFFF;',
    '  box-shadow: var(--bui-shadow-sm);',
    '  transition: transform var(--bui-transition-fast);',
    '}',
    '.bui-toggle__switch[aria-checked="true"] .bui-toggle__thumb { transform: translateX(18px); }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .bui-toggle__switch, .bui-toggle__thumb { transition: none; }',
    '}'
  ].join('\n'));

  var OBSERVED = ['label', 'hint', 'name', 'checked', 'disabled'];

  class BuiToggle extends HTMLElement {
    static get observedAttributes() {
      return OBSERVED;
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      this.innerHTML = '';

      var root = document.createElement('div');
      root.className = 'bui-toggle';

      var text = document.createElement('div');
      text.className = 'bui-toggle__text';

      var label = document.createElement('span');
      label.className = 'bui-toggle__label';

      var hint = document.createElement('span');
      hint.className = 'bui-toggle__hint';

      text.appendChild(label);
      text.appendChild(hint);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bui-toggle__switch';
      btn.setAttribute('role', 'switch');

      var thumb = document.createElement('span');
      thumb.className = 'bui-toggle__thumb';
      btn.appendChild(thumb);

      root.appendChild(text);
      root.appendChild(btn);
      this.appendChild(root);

      this._label = label;
      this._hint = hint;
      this._btn = btn;

      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.checked = !this.checked;
        window.BUI.dispatch(this, 'bui-change', { checked: this.checked });
      });

      this._syncAttrs();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._syncAttrs();
    }

    _syncAttrs() {
      this._label.textContent = this.getAttribute('label') || '';

      var hintText = this.getAttribute('hint') || '';
      this._hint.textContent = hintText;
      this._hint.style.display = hintText ? '' : 'none';

      this._btn.disabled = this.hasAttribute('disabled');
      this._btn.setAttribute('aria-checked', String(this.hasAttribute('checked')));
      var labelText = this.getAttribute('label');
      if (labelText) this._btn.setAttribute('aria-label', labelText);
    }

    get checked() {
      return this.hasAttribute('checked');
    }

    set checked(val) {
      if (val) this.setAttribute('checked', '');
      else this.removeAttribute('checked');
    }
  }

  window.BUI.registerComponent('bui-toggle', BuiToggle);
})();
